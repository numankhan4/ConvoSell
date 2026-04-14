export type DetectorName = 'duplicate' | 'phone' | 'cod' | 'history' | 'geo' | 'verification';

export interface DetectorSignal {
  detectorName: DetectorName;
  signalType: string;
  severity: 'low' | 'medium' | 'high';
  scoreContribution: number;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface FraudComputationInput {
  workspaceId: string;
  orderId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  includeGeo?: boolean;
}

export interface FraudComputationResult {
  duplicateScore: number;
  phoneRiskScore: number;
  codRiskScore: number;
  trustScore: number;
  geoRiskScore: number;
  verificationRiskScore: number;
  finalFraudScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  fraudDecision: 'APPROVE' | 'VERIFY' | 'BLOCK';
  recommendedAction: string;
  explanation: string[];
  detectorBreakdown: Record<string, unknown>;
  signals: DetectorSignal[];
  processingTimeMs: number;
}
