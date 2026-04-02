import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Register a new user and create their first workspace
   */
  async register(dto: RegisterDto) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user + workspace + membership in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
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

    // Generate token
    const token = this.generateToken(result.user.id, result.user.email, result.workspace.id);

    return {
      user: this.sanitizeUser(result.user),
      workspace: result.workspace,
      accessToken: token,
    };
  }

  /**
   * Login user
   */
  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

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
    const user = await this.prisma.user.findUnique({
      where: { email },
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
  private generateToken(userId: string, email: string, workspaceId: string): string {
    const payload = { sub: userId, email, workspaceId };
    return this.jwtService.sign(payload);
  }

  /**
   * Remove sensitive fields from user object
   */
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
