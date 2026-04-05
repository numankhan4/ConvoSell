import { Controller, Post, Get, Body, UseGuards, Req, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { Permission } from '../common/constants/permissions.constants';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /api/auth/register
   * Register new user + create workspace
   */
  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /api/auth/login
   * Login user
   */
  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * GET /api/auth/me
   * Get current user profile with workspaces
   */
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.sub);
  }

  /**
   * POST /api/auth/impersonate/:userId
   * Impersonate another user (requires USERS_IMPERSONATE permission)
   */
  @Post('impersonate/:userId')
  @RequirePermission(Permission.USERS_IMPERSONATE)
  async impersonate(
    @CurrentUser() user: any,
    @Param('userId') targetUserId: string,
  ) {
    return this.authService.impersonate(user.sub, user.workspaceId, targetUserId);
  }

  /**
   * POST /api/auth/stop-impersonation
   * Stop impersonating and return to original user
   */
  @Post('stop-impersonation')
  async stopImpersonation(@CurrentUser() user: any) {
    return this.authService.stopImpersonation(user);
  }

  /**
   * GET /api/auth/workspace-users
   * Get all users in current workspace (requires USERS_VIEW_ALL permission)
   */
  @Get('workspace-users')
  @RequirePermission(Permission.USERS_VIEW_ALL)
  async getWorkspaceUsers(@CurrentUser() user: any) {
    return this.authService.getWorkspaceUsers(user.workspaceId);
  }
}
