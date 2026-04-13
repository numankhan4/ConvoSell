import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { FraudCheckDto } from './dto/fraud-check.dto';
import { FraudBatchCheckDto } from './dto/fraud-batch-check.dto';
import { DetectorSignal, FraudComputationResult } from './fraud.types';

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  async checkOrder(workspaceId: string, dto: FraudCheckDto) {
    if (!dto.orderId) {
      throw new BadRequestException('orderId is required');
    }

    if (!dto.forceRecompute) {
      const latest = await this.prisma.fraudAssessment.findFirst({
        where: { workspaceId, orderId: dto.orderId },
        include: { signals: true },
        orderBy: { checkedAt: 'desc' },
      });

      if (latest) {
        return this.mapAssessmentResponse(latest);
      }
    }

    const start = Date.now();
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, workspaceId },
      include: { contact: true },
    });

    if (!order) {
      throw new BadRequestException('Order not found for workspace');
    }

    const config = await this.getOrCreateRuleConfig(workspaceId);
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const phone = this.normalizePhone(order.contact?.whatsappPhone || '');
    const addressHash = this.buildAddressHash(order.shippingAddress);
    const deviceKey = this.buildDeviceKey(dto.deviceFingerprint, dto.ipAddress, dto.userAgent);

    const duplicate = await this.computeDuplicateSignals(
      workspaceId,
      order.id,
      phone,
      addressHash,
      deviceKey,
      twentyFourHoursAgo,
      sevenDaysAgo,
    );

    const phoneRisk = await this.computePhoneRiskSignals(workspaceId, phone, sevenDaysAgo);
    const codRisk = await this.computeCodRiskSignals(workspaceId, order.id, order.contactId, order.totalAmount, order.paymentMethod);
    const history = await this.computeHistorySignals(workspaceId, order.contactId);
    const geo = await this.computeGeoSignals(dto.includeGeo !== false, dto.ipAddress, order.shippingAddress);

    const weighted = {
      duplicate: Math.min(config.maxSingleContribution, duplicate.score * config.duplicateWeight),
      phone: Math.min(config.maxSingleContribution, phoneRisk.score * config.phoneWeight),
      cod: Math.min(config.maxSingleContribution, codRisk.score * config.codWeight),
      geo: Math.min(config.maxSingleContribution, geo.score * config.geoWeight),
      trust: Math.min(config.maxSingleContribution, (100 - history.trustScore) * config.trustWeight),
    };

    const finalFraudScore = this.clamp(Math.round(weighted.duplicate + weighted.phone + weighted.cod + weighted.geo + weighted.trust));

    const detectorScores = [duplicate.score, phoneRisk.score, codRisk.score, geo.score, 100 - history.trustScore];
    const highSignalCount = detectorScores.filter((s) => s >= config.highSignalThreshold).length;

    let fraudDecision: 'APPROVE' | 'VERIFY' | 'BLOCK' = 'APPROVE';
    if (finalFraudScore >= config.blockMinThreshold) {
      fraudDecision = config.requireTwoHighSignals && highSignalCount < 2 ? 'VERIFY' : 'BLOCK';
    } else if (finalFraudScore >= config.approveMaxThreshold + 1) {
      fraudDecision = 'VERIFY';
    }

    if (config.rolloutMode === 'shadow') {
      fraudDecision = 'APPROVE';
    }
    if (config.rolloutMode === 'verify_only' && fraudDecision === 'BLOCK') {
      fraudDecision = 'VERIFY';
    }

    const riskLevel = finalFraudScore >= 70 ? 'HIGH' : finalFraudScore >= 30 ? 'MEDIUM' : 'LOW';
    const explanation = this.buildExplanation([
      ...duplicate.reasons,
      ...phoneRisk.reasons,
      ...codRisk.reasons,
      ...history.reasons,
      ...geo.reasons,
    ]);

    const signals: DetectorSignal[] = [
      ...duplicate.signals,
      ...phoneRisk.signals,
      ...codRisk.signals,
      ...history.signals,
      ...geo.signals,
    ];

    const processingTimeMs = Date.now() - start;
    const recommendedAction = fraudDecision === 'BLOCK'
      ? 'hold_and_manual_review'
      : fraudDecision === 'VERIFY'
      ? 'send_whatsapp_confirmation'
      : 'normal_fulfillment';

    const result: FraudComputationResult = {
      duplicateScore: duplicate.score,
      phoneRiskScore: phoneRisk.score,
      codRiskScore: codRisk.score,
      trustScore: history.trustScore,
      geoRiskScore: geo.score,
      finalFraudScore,
      riskLevel,
      fraudDecision,
      recommendedAction,
      explanation,
      detectorBreakdown: {
        duplicate: duplicate.metadata,
        phone: phoneRisk.metadata,
        cod: codRisk.metadata,
        history: history.metadata,
        geo: geo.metadata,
        weighted,
      },
      signals,
      processingTimeMs,
    };

    const assessment = await this.prisma.fraudAssessment.create({
      data: {
        workspaceId,
        orderId: order.id,
        duplicateScore: result.duplicateScore,
        phoneRiskScore: result.phoneRiskScore,
        codRiskScore: result.codRiskScore,
        trustScore: result.trustScore,
        geoRiskScore: result.geoRiskScore,
        finalFraudScore: result.finalFraudScore,
        riskLevel: result.riskLevel,
        fraudDecision: result.fraudDecision,
        explanation: result.explanation as Prisma.InputJsonValue,
        detectorBreakdown: result.detectorBreakdown as Prisma.InputJsonValue,
        recommendedAction: result.recommendedAction,
        processingTimeMs: result.processingTimeMs,
      },
    });

    if (result.signals.length > 0) {
      await this.prisma.fraudSignal.createMany({
        data: result.signals.map((signal) => ({
          workspaceId,
          orderId: order.id,
          assessmentId: assessment.id,
          detectorName: signal.detectorName,
          signalType: signal.signalType,
          severity: signal.severity,
          scoreContribution: signal.scoreContribution,
          reason: signal.reason,
          metadata: (signal.metadata || {}) as Prisma.InputJsonValue,
        })),
      });
    }

    await this.prisma.fraudDecisionAudit.create({
      data: {
        workspaceId,
        orderId: order.id,
        assessmentId: assessment.id,
        newDecision: result.fraudDecision,
        reason: `score=${result.finalFraudScore}`,
      },
    });

    await this.updateFingerprints(workspaceId, phone, addressHash, deviceKey, twentyFourHoursAgo, sevenDaysAgo);

    return {
      orderId: order.id,
      final_fraud_score: result.finalFraudScore,
      risk_level: result.riskLevel,
      fraud_decision: result.fraudDecision,
      recommended_action: result.recommendedAction,
      explanation: result.explanation,
      detector_breakdown: result.detectorBreakdown,
      checked_at: assessment.checkedAt,
      latency_ms: result.processingTimeMs,
    };
  }

  async getOrderReport(workspaceId: string, orderId: string) {
    const assessments = await this.prisma.fraudAssessment.findMany({
      where: { workspaceId, orderId },
      include: {
        signals: true,
        decisionAudits: true,
      },
      orderBy: { checkedAt: 'desc' },
    });

    if (assessments.length === 0) {
      throw new BadRequestException('No fraud report found for order');
    }

    const latest = assessments[0];
    return {
      orderId,
      latest: this.mapAssessmentResponse(latest),
      history_count: assessments.length,
      timeline: assessments.map((assessment) => ({
        assessment_id: assessment.id,
        checked_at: assessment.checkedAt,
        final_fraud_score: assessment.finalFraudScore,
        fraud_decision: assessment.fraudDecision,
      })),
      decision_audit: latest.decisionAudits,
      signals: latest.signals,
    };
  }

  async getFraudSummaries(workspaceId: string, orderIds: string[]) {
    if (!orderIds.length) {
      return { summaries: {} };
    }

    const assessments = await this.prisma.fraudAssessment.findMany({
      where: {
        workspaceId,
        orderId: { in: orderIds },
      },
      orderBy: [
        { orderId: 'asc' },
        { checkedAt: 'desc' },
      ],
    });

    const summaries: Record<string, any> = {};
    for (const assessment of assessments) {
      if (summaries[assessment.orderId]) {
        continue;
      }

      summaries[assessment.orderId] = {
        final_fraud_score: assessment.finalFraudScore,
        risk_level: assessment.riskLevel,
        fraud_decision: assessment.fraudDecision,
        checked_at: assessment.checkedAt,
      };
    }

    return { summaries };
  }

  async checkOrdersBatch(workspaceId: string, dto: FraudBatchCheckDto) {
    const orderIds = Array.from(new Set((dto.orderIds || []).map((id) => id?.trim()).filter(Boolean)));
    if (!orderIds.length) {
      throw new BadRequestException('orderIds is required');
    }

    const includeGeo = dto.includeGeo ?? false;
    const forceRecompute = dto.forceRecompute ?? true;
    const concurrency = 3;

    const results: Array<{
      orderId: string;
      ok: boolean;
      result?: any;
      error?: string;
    }> = [];

    for (let i = 0; i < orderIds.length; i += concurrency) {
      const chunk = orderIds.slice(i, i + concurrency);
      const chunkResults = await Promise.all(
        chunk.map(async (orderId) => {
          try {
            const result = await this.checkOrder(workspaceId, {
              orderId,
              includeGeo,
              forceRecompute,
            });

            return {
              orderId,
              ok: true,
              result,
            };
          } catch (error) {
            return {
              orderId,
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        }),
      );

      results.push(...chunkResults);
    }

    const success = results.filter((item) => item.ok).length;
    const failed = results.length - success;

    return {
      total: results.length,
      success,
      failed,
      results,
    };
  }

  private async getOrCreateRuleConfig(workspaceId: string) {
    const existing = await this.prisma.fraudRuleConfig.findUnique({
      where: { workspaceId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.fraudRuleConfig.create({
      data: { workspaceId },
    });
  }

  private async computeDuplicateSignals(
    workspaceId: string,
    orderId: string,
    phone: string,
    addressHash: string | null,
    deviceKey: string | null,
    twentyFourHoursAgo: Date,
    sevenDaysAgo: Date,
  ) {
    let score = 0;
    const reasons: string[] = [];
    const signals: DetectorSignal[] = [];

    let duplicateType = 'none';
    let duplicateCount24h = 0;
    let duplicateCount7d = 0;

    if (phone) {
      duplicateCount24h = await this.prisma.order.count({
        where: {
          workspaceId,
          id: { not: orderId },
          createdAt: { gte: twentyFourHoursAgo },
          contact: { whatsappPhone: phone },
        },
      });

      duplicateCount7d = await this.prisma.order.count({
        where: {
          workspaceId,
          id: { not: orderId },
          createdAt: { gte: sevenDaysAgo },
          contact: { whatsappPhone: phone },
        },
      });

      if (duplicateCount24h >= 2) {
        duplicateType = 'phone';
        score += 35;
        reasons.push(`Phone used ${duplicateCount24h} times in last 24h`);
        signals.push({
          detectorName: 'duplicate',
          signalType: 'phone_velocity_24h',
          severity: 'high',
          scoreContribution: 35,
          reason: `Same phone placed ${duplicateCount24h} orders in 24h`,
          metadata: { duplicateCount24h, duplicateCount7d },
        });
      }
    }

    if (addressHash) {
      const addressFp = await this.prisma.addressFingerprint.findUnique({
        where: {
          workspaceId_addressHash: {
            workspaceId,
            addressHash,
          },
        },
      });

      if ((addressFp?.uniqueNamesLast7d || 0) >= 3) {
        duplicateType = duplicateType === 'none' ? 'address' : duplicateType;
        score += 25;
        reasons.push('Address used with multiple names in last 7 days');
        signals.push({
          detectorName: 'duplicate',
          signalType: 'address_name_mismatch',
          severity: 'medium',
          scoreContribution: 25,
          reason: 'Same address appears across multiple customer names',
          metadata: {
            uniqueNamesLast7d: addressFp?.uniqueNamesLast7d || 0,
          },
        });
      }
    }

    if (deviceKey) {
      const deviceFp = await this.prisma.deviceFingerprint.findUnique({
        where: {
          workspaceId_deviceKey: {
            workspaceId,
            deviceKey,
          },
        },
      });

      if ((deviceFp?.ordersLast24h || 0) >= 3) {
        duplicateType = duplicateType === 'none' ? 'IP' : duplicateType;
        score += 20;
        reasons.push('Same device/IP key created multiple recent orders');
        signals.push({
          detectorName: 'duplicate',
          signalType: 'device_velocity_24h',
          severity: 'medium',
          scoreContribution: 20,
          reason: 'Device fingerprint shows high order velocity',
          metadata: {
            ordersLast24h: deviceFp?.ordersLast24h || 0,
          },
        });
      }
    }

    return {
      score: this.clamp(score),
      reasons,
      signals,
      metadata: {
        duplicate_flag: score > 0,
        duplicate_type: duplicateType,
        duplicate_count_24h: duplicateCount24h,
        duplicate_count_7d: duplicateCount7d,
      },
    };
  }

  private async computePhoneRiskSignals(workspaceId: string, phone: string, sevenDaysAgo: Date) {
    let score = 0;
    const reasons: string[] = [];
    const signals: DetectorSignal[] = [];

    if (!phone || phone.length < 11) {
      score += 60;
      reasons.push('Invalid or incomplete phone number');
      signals.push({
        detectorName: 'phone',
        signalType: 'invalid_phone',
        severity: 'high',
        scoreContribution: 60,
        reason: 'Phone number failed basic format checks',
      });
    }

    if (phone && /(\d)\1{6,}/.test(phone)) {
      score += 25;
      reasons.push('Phone contains repeated digit pattern');
      signals.push({
        detectorName: 'phone',
        signalType: 'repeated_digits_pattern',
        severity: 'medium',
        scoreContribution: 25,
        reason: 'Suspicious repeated digit sequence in phone',
      });
    }

    if (phone && this.isSequentialDigits(phone)) {
      score += 25;
      reasons.push('Phone contains sequential digit pattern');
      signals.push({
        detectorName: 'phone',
        signalType: 'sequential_pattern',
        severity: 'medium',
        scoreContribution: 25,
        reason: 'Phone appears to be sequential/fake pattern',
      });
    }

    if (phone) {
      const usageAcrossCustomers = await this.prisma.contact.count({
        where: {
          workspaceId,
          whatsappPhone: phone,
        },
      });

      const ordersUsingPhone7d = await this.prisma.order.count({
        where: {
          workspaceId,
          createdAt: { gte: sevenDaysAgo },
          contact: { whatsappPhone: phone },
        },
      });

      if (usageAcrossCustomers > 1 || ordersUsingPhone7d >= 4) {
        score += 20;
        reasons.push('Phone reused heavily across recent orders');
        signals.push({
          detectorName: 'phone',
          signalType: 'phone_reuse',
          severity: 'medium',
          scoreContribution: 20,
          reason: 'Phone appears in unusually high number of records',
          metadata: { usageAcrossCustomers, ordersUsingPhone7d },
        });
      }
    }

    return {
      score: this.clamp(score),
      reasons,
      signals,
      metadata: {
        phone_risk_score: this.clamp(score),
        phone_flag_reason: reasons[0] || null,
      },
    };
  }

  private async computeCodRiskSignals(
    workspaceId: string,
    orderId: string,
    contactId: string,
    totalAmount: number,
    paymentMethod: string,
  ) {
    let score = 0;
    const reasons: string[] = [];
    const signals: DetectorSignal[] = [];

    const customerOrders = await this.prisma.order.count({
      where: {
        workspaceId,
        contactId,
        id: { not: orderId },
      },
    });

    const cancelledOrders = await this.prisma.order.count({
      where: {
        workspaceId,
        contactId,
        status: 'cancelled',
      },
    });

    if (paymentMethod === 'cod') {
      score += 20;
      reasons.push('COD order has base fraud risk');
      signals.push({
        detectorName: 'cod',
        signalType: 'cod_base_risk',
        severity: 'low',
        scoreContribution: 20,
        reason: 'Cash on delivery orders have elevated cancellation risk',
      });
    }

    if (totalAmount >= 20000) {
      score += 25;
      reasons.push('High order value for COD');
      signals.push({
        detectorName: 'cod',
        signalType: 'high_order_value',
        severity: 'high',
        scoreContribution: 25,
        reason: 'COD basket value exceeds high-risk threshold',
        metadata: { totalAmount },
      });
    } else if (totalAmount >= 10000) {
      score += 15;
      reasons.push('Medium-high order value for COD');
      signals.push({
        detectorName: 'cod',
        signalType: 'medium_order_value',
        severity: 'medium',
        scoreContribution: 15,
        reason: 'COD basket value is above normal',
        metadata: { totalAmount },
      });
    }

    if (customerOrders === 0) {
      score += 20;
      reasons.push('New customer with no order history');
      signals.push({
        detectorName: 'cod',
        signalType: 'new_customer',
        severity: 'medium',
        scoreContribution: 20,
        reason: 'No previous orders for this customer',
      });
    }

    if (customerOrders > 0) {
      const cancellationRate = cancelledOrders / customerOrders;
      if (cancellationRate >= 0.5 && cancelledOrders >= 2) {
        score += 30;
        reasons.push('High past cancellation ratio');
        signals.push({
          detectorName: 'cod',
          signalType: 'high_cancellation_rate',
          severity: 'high',
          scoreContribution: 30,
          reason: 'Customer cancellation ratio is elevated',
          metadata: { cancellationRate, cancelledOrders, customerOrders },
        });
      }
    }

    const riskLevel = score >= 70 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';
    return {
      score: this.clamp(score),
      reasons,
      signals,
      metadata: {
        cod_risk_score: this.clamp(score),
        risk_level: riskLevel,
      },
    };
  }

  private async computeHistorySignals(workspaceId: string, contactId: string) {
    const allOrders = await this.prisma.order.findMany({
      where: {
        workspaceId,
        contactId,
      },
      select: {
        status: true,
        responseTimeMinutes: true,
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    const total = allOrders.length;
    if (total === 0) {
      return {
        trustScore: 40,
        reasons: ['Limited customer history available'],
        signals: [
          {
            detectorName: 'history' as const,
            signalType: 'limited_history',
            severity: 'medium' as const,
            scoreContribution: 10,
            reason: 'No meaningful historical behavior found',
          },
        ],
        metadata: {
          trust_score: 40,
          total_orders: 0,
          delivery_success_rate: 0,
        },
      };
    }

    const completed = allOrders.filter((o) => o.status === 'completed').length;
    const confirmed = allOrders.filter((o) => o.status === 'confirmed').length;
    const cancelled = allOrders.filter((o) => o.status === 'cancelled').length;
    const successRate = (completed + confirmed) / total;
    const cancellationRate = cancelled / total;

    const responseTimes = allOrders
      .map((o) => o.responseTimeMinutes)
      .filter((v): v is number => typeof v === 'number' && v > 0);

    const avgResponseTime = responseTimes.length
      ? responseTimes.reduce((sum, x) => sum + x, 0) / responseTimes.length
      : null;

    let trustScore = 50;
    if (successRate >= 0.8 && total >= 3) trustScore += 30;
    if (successRate >= 0.6 && total >= 2) trustScore += 10;
    if (cancellationRate >= 0.5 && total >= 3) trustScore -= 30;
    if (avgResponseTime !== null && avgResponseTime <= 60) trustScore += 10;
    if (avgResponseTime !== null && avgResponseTime > 720) trustScore -= 10;

    trustScore = this.clamp(trustScore);

    const reasons: string[] = [];
    const signals: DetectorSignal[] = [];

    if (trustScore >= 70) {
      reasons.push('Customer has strong order completion history');
    }
    if (cancellationRate >= 0.5 && total >= 3) {
      reasons.push('Customer has elevated cancellation behavior');
      signals.push({
        detectorName: 'history',
        signalType: 'historical_cancellations',
        severity: 'high',
        scoreContribution: 25,
        reason: 'Past cancellation ratio is high',
        metadata: { cancellationRate, total },
      });
    }

    return {
      trustScore,
      reasons,
      signals,
      metadata: {
        trust_score: trustScore,
        total_orders: total,
        confirmed_orders: confirmed,
        completed_orders: completed,
        cancelled_orders: cancelled,
        delivery_success_rate: Math.round(successRate * 100),
      },
    };
  }

  private async computeGeoSignals(includeGeo: boolean, ipAddress?: string, shippingAddress?: any) {
    if (!includeGeo || !ipAddress) {
      return {
        score: 0,
        reasons: [],
        signals: [],
        metadata: {
          geo_flag: false,
          geo_reason: null,
          checked: false,
        },
      };
    }

    try {
      const geo = await this.lookupGeo(ipAddress);
      const shippingCity = this.normalizeText(shippingAddress?.city || shippingAddress?.province || '');
      const ipCity = this.normalizeText(geo.city || geo.region || '');

      if (!shippingCity || !ipCity) {
        return {
          score: 0,
          reasons: [],
          signals: [],
          metadata: {
            geo_flag: false,
            geo_reason: null,
            checked: true,
            shipping_city: shippingAddress?.city || null,
            ip_city: geo.city || null,
          },
        };
      }

      const mismatch = !shippingCity.includes(ipCity) && !ipCity.includes(shippingCity);
      if (!mismatch) {
        return {
          score: 0,
          reasons: [],
          signals: [],
          metadata: {
            geo_flag: false,
            geo_reason: null,
            checked: true,
            shipping_city: shippingAddress?.city || null,
            ip_city: geo.city || null,
          },
        };
      }

      return {
        score: 40,
        reasons: ['Shipping city mismatches IP geolocation'],
        signals: [
          {
            detectorName: 'geo' as const,
            signalType: 'shipping_ip_city_mismatch',
            severity: 'medium' as const,
            scoreContribution: 40,
            reason: 'Shipping location differs from IP geolocation',
            metadata: {
              shippingCity: shippingAddress?.city || null,
              ipCity: geo.city || null,
              ipCountry: geo.country || null,
            },
          },
        ],
        metadata: {
          geo_flag: true,
          geo_reason: 'shipping_ip_city_mismatch',
          checked: true,
          shipping_city: shippingAddress?.city || null,
          ip_city: geo.city || null,
          ip_country: geo.country || null,
        },
      };
    } catch (error) {
      this.logger.warn(`Geo lookup failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        score: 0,
        reasons: [],
        signals: [],
        metadata: {
          geo_flag: false,
          geo_reason: 'geo_lookup_failed',
          checked: false,
        },
      };
    }
  }

  private async lookupGeo(ipAddress: string): Promise<{ city?: string; region?: string; country?: string }> {
    const baseUrl = process.env.GEO_API_BASE_URL || 'https://ipapi.co';
    const token = process.env.GEO_API_KEY;
    const url = token
      ? `${baseUrl}/${ipAddress}/json/?key=${token}`
      : `${baseUrl}/${ipAddress}/json/`;

    const response = await firstValueFrom(
      this.httpService.get(url, {
        timeout: 800,
      }),
    );

    return {
      city: response.data?.city,
      region: response.data?.region,
      country: response.data?.country_name,
    };
  }

  private async updateFingerprints(
    workspaceId: string,
    phone: string,
    addressHash: string | null,
    deviceKey: string | null,
    twentyFourHoursAgo: Date,
    sevenDaysAgo: Date,
  ) {
    if (phone) {
      const ordersLast24h = await this.prisma.order.count({
        where: {
          workspaceId,
          createdAt: { gte: twentyFourHoursAgo },
          contact: { whatsappPhone: phone },
        },
      });

      const recentOrders = await this.prisma.order.findMany({
        where: {
          workspaceId,
          createdAt: { gte: sevenDaysAgo },
          contact: { whatsappPhone: phone },
        },
        include: { contact: true },
      });

      const uniqueNames = new Set(
        recentOrders
          .map((order) => this.normalizeText(order.contact?.name || ''))
          .filter(Boolean),
      ).size;

      const uniqueAddresses = new Set(
        recentOrders
          .map((order) => this.buildAddressHash(order.shippingAddress))
          .filter(Boolean),
      ).size;

      const cancelled = recentOrders.filter((order) => order.status === 'cancelled').length;
      const cancellationRatio7d = recentOrders.length ? cancelled / recentOrders.length : 0;

      await this.prisma.phoneFingerprint.upsert({
        where: {
          workspaceId_normalizedPhone: {
            workspaceId,
            normalizedPhone: phone,
          },
        },
        create: {
          workspaceId,
          normalizedPhone: phone,
          ordersLast24h,
          ordersLast7d: recentOrders.length,
          uniqueNamesLast7d: uniqueNames,
          uniqueAddressesLast7d: uniqueAddresses,
          cancellationRatio7d,
          lastSeenAt: new Date(),
        },
        update: {
          ordersLast24h,
          ordersLast7d: recentOrders.length,
          uniqueNamesLast7d: uniqueNames,
          uniqueAddressesLast7d: uniqueAddresses,
          cancellationRatio7d,
          lastSeenAt: new Date(),
        },
      });
    }

    if (addressHash) {
      await this.prisma.addressFingerprint.upsert({
        where: {
          workspaceId_addressHash: {
            workspaceId,
            addressHash,
          },
        },
        create: {
          workspaceId,
          addressHash,
          lastSeenAt: new Date(),
        },
        update: {
          lastSeenAt: new Date(),
        },
      });
    }

    if (deviceKey) {
      await this.prisma.deviceFingerprint.upsert({
        where: {
          workspaceId_deviceKey: {
            workspaceId,
            deviceKey,
          },
        },
        create: {
          workspaceId,
          deviceKey,
          lastSeenAt: new Date(),
        },
        update: {
          lastSeenAt: new Date(),
        },
      });
    }
  }

  private mapAssessmentResponse(assessment: any) {
    return {
      orderId: assessment.orderId,
      final_fraud_score: assessment.finalFraudScore,
      risk_level: assessment.riskLevel,
      fraud_decision: assessment.fraudDecision,
      recommended_action: assessment.recommendedAction,
      explanation: assessment.explanation,
      detector_breakdown: assessment.detectorBreakdown,
      checked_at: assessment.checkedAt,
      latency_ms: assessment.processingTimeMs,
      signals: assessment.signals || [],
    };
  }

  private buildExplanation(reasons: string[]) {
    const unique = Array.from(new Set(reasons.filter(Boolean)));
    if (unique.length > 0) {
      return unique.slice(0, 5);
    }

    return ['Low risk profile based on current rule checks'];
  }

  private normalizePhone(phone: string) {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (!digits) return '';

    if (digits.startsWith('0')) {
      return `+92${digits.substring(1)}`;
    }
    if (digits.startsWith('92')) {
      return `+${digits}`;
    }
    if (digits.startsWith('1') && digits.length === 10) {
      return `+1${digits}`;
    }
    return `+${digits}`;
  }

  private normalizeText(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildAddressHash(shippingAddress: any): string | null {
    if (!shippingAddress) return null;

    const text = this.normalizeText([
      shippingAddress.address1,
      shippingAddress.address2,
      shippingAddress.city,
      shippingAddress.province,
      shippingAddress.zip,
      shippingAddress.country,
    ]
      .filter(Boolean)
      .join(' '));

    if (!text) return null;
    return createHash('sha256').update(text).digest('hex');
  }

  private buildDeviceKey(deviceFingerprint?: string, ipAddress?: string, userAgent?: string): string | null {
    const source = deviceFingerprint || `${ipAddress || ''}|${userAgent || ''}`;
    if (!source || source === '|') return null;
    return createHash('sha256').update(source).digest('hex');
  }

  private isSequentialDigits(phone: string) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) return false;

    let forward = 0;
    let backward = 0;

    for (let i = 1; i < digits.length; i += 1) {
      const diff = Number(digits[i]) - Number(digits[i - 1]);
      if (diff === 1) forward += 1;
      if (diff === -1) backward += 1;
    }

    return forward >= 5 || backward >= 5;
  }

  private clamp(score: number) {
    if (score < 0) return 0;
    if (score > 100) return 100;
    return score;
  }

  async checkOrderFromWorker(dto: FraudCheckDto, providedInternalKey?: string) {
    const expected = process.env.INTERNAL_WORKER_KEY;
    if (!expected || providedInternalKey !== expected) {
      throw new ForbiddenException('Invalid internal worker key');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      select: { workspaceId: true },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    return this.checkOrder(order.workspaceId, dto);
  }
}
