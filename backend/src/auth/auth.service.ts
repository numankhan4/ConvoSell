import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly loginAttempts = new Map<string, { count: number; lockedUntil?: number }>();
  private readonly verificationResendCooldown = new Map<string, number>();
  private readonly genericAuthMessage = 'Invalid email or password';
  private readonly resendApiUrl = 'https://api.resend.com/emails';
  private readonly verificationResendCooldownMs = 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private normalizeEmail(email: string): string {
    return (email || '').trim().toLowerCase();
  }

  private enforceLoginAttemptPolicy(email: string) {
    const key = this.normalizeEmail(email);
    const current = this.loginAttempts.get(key);
    if (!current) return;

    if (current.lockedUntil && current.lockedUntil > Date.now()) {
      throw new HttpException(
        'Too many failed login attempts. Please try again in a few minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (current.lockedUntil && current.lockedUntil <= Date.now()) {
      this.loginAttempts.delete(key);
    }
  }

  private recordFailedLoginAttempt(email: string) {
    const key = this.normalizeEmail(email);
    const current = this.loginAttempts.get(key) || { count: 0 };
    current.count += 1;

    if (current.count >= 5) {
      current.lockedUntil = Date.now() + 15 * 60 * 1000;
    }

    this.loginAttempts.set(key, current);
  }

  private clearFailedLoginAttempts(email: string) {
    this.loginAttempts.delete(this.normalizeEmail(email));
  }

  private enforceVerificationResendCooldown(email: string) {
    const key = this.normalizeEmail(email);
    const nextAllowedAt = this.verificationResendCooldown.get(key);
    if (!nextAllowedAt) return;

    const remainingMs = nextAllowedAt - Date.now();
    if (remainingMs > 0) {
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      throw new HttpException(
        `Please wait ${remainingSeconds} seconds before requesting another verification email.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.verificationResendCooldown.delete(key);
  }

  private markVerificationResend(email: string) {
    this.verificationResendCooldown.set(
      this.normalizeEmail(email),
      Date.now() + this.verificationResendCooldownMs,
    );
  }

  private generateEmailVerificationToken(userId: string, email: string): string {
    return this.jwtService.sign(
      {
        type: 'verify_email',
        sub: userId,
        email,
      },
      { expiresIn: '24h' },
    );
  }

  private generatePasswordResetToken(userId: string, email: string, passwordUpdatedAt: Date): string {
    return this.jwtService.sign(
      {
        type: 'reset_password',
        sub: userId,
        email,
        pvu: passwordUpdatedAt.getTime(),
      },
      { expiresIn: '30m' },
    );
  }

  private getFrontendUrl(path: string, token: string): string {
    const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3004').replace(/\/$/, '');
    return `${baseUrl}${path}?token=${encodeURIComponent(token)}`;
  }

  private async sendResendEmail(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL || 'ConvoSell <onboarding@resend.dev>';

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY missing. Auth email not sent.');
      return false;
    }

    try {
      await axios.post(
        this.resendApiUrl,
        {
          from,
          to: [to],
          subject,
          html,
          text,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send auth email to ${to}: ${error?.response?.data?.message || error.message}`);
      return false;
    }
  }

  private async sendVerificationEmail(email: string, firstName: string | null | undefined, token: string): Promise<boolean> {
    const verifyUrl = this.getFrontendUrl('/verify-email', token);
    const displayName = firstName || 'there';

    return this.sendResendEmail(
      email,
      'Verify your email address',
      `<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
        <h2 style="margin-bottom: 8px;">Verify your account</h2>
        <p>Hi ${displayName},</p>
        <p>Thanks for signing up. Please verify your email to activate your account.</p>
        <p>
          <a href="${verifyUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: 600;">Verify Email</a>
        </p>
        <p>If the button does not work, copy this link:</p>
        <p style="word-break: break-all; color: #334155;">${verifyUrl}</p>
      </div>`,
      `Hi ${displayName},\n\nPlease verify your account by opening this link:\n${verifyUrl}`,
    );
  }

  private async sendPasswordResetEmail(email: string, firstName: string | null | undefined, token: string): Promise<boolean> {
    const resetUrl = this.getFrontendUrl('/reset-password', token);
    const displayName = firstName || 'there';

    return this.sendResendEmail(
      email,
      'Reset your password',
      `<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
        <h2 style="margin-bottom: 8px;">Password reset request</h2>
        <p>Hi ${displayName},</p>
        <p>We received a request to reset your password. This link expires in 30 minutes.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a>
        </p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <p>If the button does not work, copy this link:</p>
        <p style="word-break: break-all; color: #334155;">${resetUrl}</p>
      </div>`,
      `Hi ${displayName},\n\nReset your password using this link (valid for 30 minutes):\n${resetUrl}`,
    );
  }

  private async writeAudit(
    workspaceId: string,
    action: string,
    userId?: string,
    entityType?: string,
    entityId?: string,
    metadata?: Record<string, any>,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          workspaceId,
          userId,
          action,
          entityType,
          entityId,
          metadata,
        },
      });
    } catch (error) {
      this.logger.warn(`Audit log write failed for action ${action}`);
    }
  }

  getEmailHealth() {
    const from = process.env.RESEND_FROM_EMAIL || 'ConvoSell <onboarding@resend.dev>';
    const hasApiKey = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0);
    const usingResendTestSender = from.toLowerCase().includes('onboarding@resend.dev');

    return {
      provider: 'resend',
      isConfigured: hasApiKey,
      fromEmail: from,
      usingTestSender: usingResendTestSender,
      recommendedAction: hasApiKey
        ? usingResendTestSender
          ? 'Set RESEND_FROM_EMAIL to a verified custom domain sender for better deliverability.'
          : 'Email configuration looks ready.'
        : 'Set RESEND_API_KEY in backend/.env and restart backend.',
    };
  }

  /**
   * Register a new user and create their first workspace
   */
  async register(dto: RegisterDto) {
    const normalizedEmail = this.normalizeEmail(dto.email);

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (existingUser.emailVerified) {
        throw new ConflictException('Email already registered. Please sign in or reset your password.');
      }

      this.enforceVerificationResendCooldown(existingUser.email);

      const verificationToken = this.generateEmailVerificationToken(existingUser.id, existingUser.email);
      const verificationEmailSent = await this.sendVerificationEmail(
        existingUser.email,
        existingUser.firstName,
        verificationToken,
      );
      this.markVerificationResend(existingUser.email);

      this.logger.log(`Registration retried for unverified account ${existingUser.email} (resent: ${verificationEmailSent})`);

      return {
        message: verificationEmailSent
          ? 'Account already exists but is not verified. A fresh verification email has been sent.'
          : 'Account already exists but is not verified. Email service is not configured; please ask support for a verification link.',
        verificationRequired: true,
        user: this.sanitizeUser(existingUser),
        ...(process.env.NODE_ENV !== 'production' ? { verificationToken } : {}),
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user + workspace + membership in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          emailVerified: false,
        },
      });

      // Create default workspace
      const workspace = await tx.workspace.create({
        data: {
          name: dto.workspaceName || `${dto.firstName}'s Workspace`,
          slug: this.generateSlug(dto.workspaceName || dto.email),
        },
      });

      // Create membership
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: 'owner',
        },
      });

      return { user, workspace };
    });

    const verificationToken = this.generateEmailVerificationToken(result.user.id, result.user.email);
    const verificationEmailSent = await this.sendVerificationEmail(
      result.user.email,
      result.user.firstName,
      verificationToken,
    );

    // Until SMTP is wired, we return the token only in non-production for manual verification/testing.
    const includeTokenForDev = process.env.NODE_ENV !== 'production';

    this.logger.log(`Email verification requested for ${result.user.email} (sent: ${verificationEmailSent})`);

    return {
      message: verificationEmailSent
        ? 'Registration successful. Please check your inbox to verify your email before logging in.'
        : 'Registration successful. Email service is not configured; please ask support for a verification link.',
      verificationRequired: true,
      user: this.sanitizeUser(result.user),
      workspace: {
        id: result.workspace.id,
        name: result.workspace.name,
      },
      ...(includeTokenForDev ? { verificationToken } : {}),
    };
  }

  /**
   * Login user
   */
  async login(dto: LoginDto) {
    const normalizedEmail = this.normalizeEmail(dto.email);
    this.enforceLoginAttemptPolicy(normalizedEmail);

    const user = await this.validateUser(normalizedEmail, dto.password);

    if (!user) {
      this.recordFailedLoginAttempt(normalizedEmail);
      throw new UnauthorizedException(this.genericAuthMessage);
    }

    if (!user.emailVerified) {
      throw new ForbiddenException('Please verify your email before signing in.');
    }

    this.clearFailedLoginAttempts(normalizedEmail);

    // Get user's workspaces
    const memberships = await this.prisma.workspaceMember.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            isActive: true,
          },
        },
      },
    });

    // Use first workspace as default
    const defaultWorkspaceId = memberships[0]?.workspace?.id || '';
    const token = this.generateToken(user.id, user.email, defaultWorkspaceId);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: this.sanitizeUser(user),
      workspaces: memberships.map((m) => m.workspace),
      accessToken: token,
    };
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async verifyEmail(dto: VerifyEmailDto) {
    let payload: any;

    try {
      payload = this.jwtService.verify(dto.token);
    } catch (error) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (payload?.type !== 'verify_email' || !payload?.sub || !payload?.email) {
      throw new BadRequestException('Invalid verification token payload');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.email !== payload.email) {
      throw new BadRequestException('Verification token is no longer valid');
    }

    if (!user.emailVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
    }

    return { message: 'Email verified successfully. You can now sign in.' };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const normalizedEmail = this.normalizeEmail(dto.email);
    this.enforceVerificationResendCooldown(normalizedEmail);

    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return { message: 'If an account exists, a verification email has been sent.' };
    }

    if (user.emailVerified) {
      return { message: 'Email is already verified.' };
    }

    const verificationToken = this.generateEmailVerificationToken(user.id, user.email);
    const verificationEmailSent = await this.sendVerificationEmail(user.email, user.firstName, verificationToken);
    this.markVerificationResend(user.email);
    this.logger.log(`Email verification re-requested for ${user.email} (sent: ${verificationEmailSent})`);

    return {
      message: verificationEmailSent
        ? 'Verification email sent.'
        : 'Email service is not configured; please ask support for a verification link.',
      ...(process.env.NODE_ENV !== 'production' ? { verificationToken } : {}),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const normalizedEmail = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user || !user.isActive) {
      return { message: 'If an account exists, a password reset link has been sent.' };
    }

    const resetToken = this.generatePasswordResetToken(user.id, user.email, user.updatedAt);
    const resetEmailSent = await this.sendPasswordResetEmail(user.email, user.firstName, resetToken);
    this.logger.log(`Password reset requested for ${user.email} (sent: ${resetEmailSent})`);

    return {
      message: 'If an account exists, a password reset link has been sent.',
      ...(process.env.NODE_ENV !== 'production' ? { resetToken } : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    let payload: any;

    try {
      payload = this.jwtService.verify(dto.token);
    } catch (error) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (payload?.type !== 'reset_password' || !payload?.sub || !payload?.email) {
      throw new BadRequestException('Invalid reset token payload');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.email !== payload.email || !user.isActive) {
      throw new BadRequestException('Reset token is no longer valid');
    }

    if (payload.pvu && payload.pvu !== user.updatedAt.getTime()) {
      throw new BadRequestException('Reset token has already been invalidated');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    this.clearFailedLoginAttempts(user.email);

    return { message: 'Password reset successful. You can now sign in.' };
  }

  /**
   * Get user profile with workspaces
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      user: this.sanitizeUser(user),
      workspaces: user.memberships.map((m) => ({
        ...m.workspace,
        role: m.role,
      })),
    };
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: string, email: string, workspaceId: string, originalUserId?: string): string {
    const payload: any = { sub: userId, email, workspaceId };
    
    // Add original user ID if impersonating
    if (originalUserId) {
      payload.originalUserId = originalUserId;
      payload.isImpersonating = true;
    }
    
    return this.jwtService.sign(payload);
  }

  /**
   * Impersonate another user
   */
  async impersonate(currentUserId: string, workspaceId: string, targetUserId: string) {
    await this.assertSuperAdmin(currentUserId);

    // Verify both users are in the same workspace
    const targetMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUserId,
        },
      },
      include: {
        user: true,
      },
    });

    if (!targetMember || !targetMember.isActive) {
      throw new UnauthorizedException('Target user not found in workspace');
    }

    // Generate token with impersonation info
    const token = this.generateToken(
      targetUserId,
      targetMember.user.email,
      workspaceId,
      currentUserId, // Store original user ID
    );

    await this.writeAudit(
      workspaceId,
      'auth.user.impersonation.started',
      currentUserId,
      'user',
      targetUserId,
      {
        targetRole: targetMember.role,
      },
    );

    return {
      user: this.sanitizeUser(targetMember.user),
      role: targetMember.role,
      accessToken: token,
      isImpersonating: true,
      originalUserId: currentUserId,
    };
  }

  /**
   * Stop impersonating and return to original user
   */
  async stopImpersonation(tokenPayload: any) {
    if (!tokenPayload.isImpersonating || !tokenPayload.originalUserId) {
      throw new BadRequestException('Not currently impersonating');
    }

    const originalUserId = tokenPayload.originalUserId;
    const workspaceId = tokenPayload.workspaceId;

    // Get original user
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: originalUserId,
        },
      },
      include: {
        user: true,
      },
    });

    if (!member) {
      throw new UnauthorizedException('Original user not found');
    }

    // Generate regular token for original user
    const token = this.generateToken(
      originalUserId,
      member.user.email,
      workspaceId,
    );

    await this.writeAudit(
      workspaceId,
      'auth.user.impersonation.stopped',
      originalUserId,
      'user',
      originalUserId,
      {
        stoppedFromUserId: tokenPayload.sub,
      },
    );

    return {
      user: this.sanitizeUser(member.user),
      role: member.role,
      accessToken: token,
      isImpersonating: false,
    };
  }

  /**
   * Get all users in workspace
   */
  async getWorkspaceUsers(workspaceId: string, requesterUserId: string) {
    await this.assertSuperAdmin(requesterUserId);

    const members = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    await this.writeAudit(workspaceId, 'users.workspace.list.view', requesterUserId, 'user', undefined, {
      resultCount: members.length,
    });

    return members.map((member) => ({
      ...member.user,
      role: member.role,
      workspaceMemberId: member.id,
    }));
  }

  /**
   * Remove sensitive fields from user object
   */
  private async assertSuperAdmin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true, isActive: true },
    });

    if (!user || !user.isActive || !user.isSuperAdmin) {
      throw new ForbiddenException('Switch user is only available for super admins');
    }
  }

  private sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Generate URL-friendly slug
   */
  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Add random suffix to ensure uniqueness
    const suffix = Math.random().toString(36).substring(2, 8);
    return `${base}-${suffix}`;
  }
}
