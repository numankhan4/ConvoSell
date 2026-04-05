import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { WorkspaceId } from '../common/decorators/user.decorator';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, UpdateTemplateDto, SendTemplateDto } from './dto/template.dto';

@Controller('templates')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  /**
   * Get all templates for workspace
   */
  @Get()
  async getAll(@WorkspaceId() workspaceId: string) {
    return this.templatesService.findAll(workspaceId);
  }

  /**
   * Get template by ID
   */
  @Get(':id')
  async getOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.templatesService.findOne(workspaceId, id);
  }

  /**
   * Create new template (submits to Meta for approval)
   */
  @Post()
  async create(@WorkspaceId() workspaceId: string, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(workspaceId, dto);
  }

  /**
   * Update template (re-submits to Meta)
   */
  @Put(':id')
  async update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(workspaceId, id, dto);
  }

  /**
   * Delete template
   */
  @Delete(':id')
  async delete(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.templatesService.delete(workspaceId, id);
  }

  /**
   * Send template message
   */
  @Post(':id/send')
  async send(
    @WorkspaceId() workspaceId: string,
    @Param('id') templateId: string,
    @Body() dto: SendTemplateDto,
  ) {
    return this.templatesService.sendTemplate(workspaceId, templateId, dto);
  }

  /**
   * Get template statistics
   */
  @Get(':id/stats')
  async getStats(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Query('days') days?: string,
  ) {
    return this.templatesService.getTemplateStats(workspaceId, id, days ? parseInt(days) : 30);
  }

  /**
   * Get workspace quota status
   */
  @Get('quota/status')
  async getQuotaStatus(@WorkspaceId() workspaceId: string) {
    return this.templatesService.getQuotaStatus(workspaceId);
  }

  /**
   * Get template message history
   */
  @Get('messages/history')
  async getMessageHistory(
    @WorkspaceId() workspaceId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.templatesService.getMessageHistory(
      workspaceId,
      parseInt(page),
      parseInt(limit),
    );
  }
}
