import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  MissionEventsService,
  PaginatedEventsResponse,
} from './mission-events.service';
import { ListEventsQueryDto, ListMissionEventsQueryDto } from './dto/list-events.query.dto';

@ApiTags('Events')
@ApiBearerAuth()
@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class MissionEventsController {
  constructor(private readonly missionEventsService: MissionEventsService) {}

  /**
   * GET /api/v1/missions/:missionId/events
   * Récupère les événements d'une mission (employer/worker seulement)
   */
  @Get('missions/:missionId/events')
  @ApiOperation({
    summary: 'Événements d\'une mission',
    description:
      'Retourne le journal des événements (lifecycle) d\'une mission. ' +
      'Accessible uniquement par l\'employer ou le worker assigné.',
  })
  @ApiParam({ name: 'missionId', description: 'ID de la mission', type: String })
  @ApiResponse({
    status: 200,
    description: 'Liste des événements',
    schema: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'clx1234567890' },
              missionId: { type: 'string', example: 'mission-uuid' },
              type: {
                type: 'string',
                enum: [
                  'MISSION_CREATED',
                  'MISSION_PUBLISHED',
                  'MISSION_ACCEPTED',
                  'MISSION_STARTED',
                  'MISSION_COMPLETED',
                  'MISSION_CANCELED',
                  'MISSION_EXPIRED',
                  'PAYMENT_AUTHORIZED',
                  'PAYMENT_CAPTURED',
                  'PAYMENT_CANCELED',
                  'PHOTO_UPLOADED',
                  'OFFER_SUBMITTED',
                  'OFFER_ACCEPTED',
                  'OFFER_DECLINED',
                ],
                example: 'MISSION_STARTED',
              },
              actorUserId: { type: 'string', nullable: true },
              targetUserId: { type: 'string', nullable: true },
              payload: {
                type: 'object',
                nullable: true,
                example: { fromStatus: 'OPEN', toStatus: 'IN_PROGRESS' },
              },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        nextCursor: { type: 'string', nullable: true },
        hasMore: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Mission introuvable' })
  async getMissionEvents(
    @Param('missionId') missionId: string,
    @Query() query: ListMissionEventsQueryDto,
    @Request() req: { user: { sub: string } },
  ): Promise<PaginatedEventsResponse> {
    return this.missionEventsService.listMissionEvents(missionId, req.user.sub, {
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  /**
   * GET /api/v1/me/events
   * Récupère les événements ciblant l'utilisateur connecté (feed)
   */
  @Get('me/events')
  @ApiOperation({
    summary: 'Mon feed d\'événements',
    description:
      'Retourne les événements ciblant l\'utilisateur connecté (notifications futures). ' +
      'Pagination cursor-based.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des événements personnels',
    schema: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              missionId: { type: 'string' },
              type: { type: 'string' },
              actorUserId: { type: 'string', nullable: true },
              targetUserId: { type: 'string', nullable: true },
              payload: { type: 'object', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        nextCursor: { type: 'string', nullable: true },
        hasMore: { type: 'boolean' },
      },
    },
  })
  async getMyEvents(
    @Query() query: ListEventsQueryDto,
    @Request() req: { user: { sub: string } },
  ): Promise<PaginatedEventsResponse> {
    return this.missionEventsService.listMyEvents(req.user.sub, {
      limit: query.limit,
      cursor: query.cursor,
    });
  }
}

