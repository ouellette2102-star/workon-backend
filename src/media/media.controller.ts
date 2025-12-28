import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  Response,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response as ExpressResponse, Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaService } from './media.service';

@ApiTags('Media')
@Controller('api/v1')
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private readonly mediaService: MediaService) {}

  /**
   * GET /api/v1/missions/:missionId/photos/:photoId/signed-url
   * Obtenir une URL signée temporaire pour lire une photo
   */
  @Get('missions/:missionId/photos/:photoId/signed-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtenir une URL signée pour une photo',
    description:
      'Génère une URL temporaire (expiration configurable) pour accéder à une photo de mission. ' +
      'Accessible uniquement par l\'employer ou le worker assigné.',
  })
  @ApiParam({ name: 'missionId', description: 'ID de la mission', type: String })
  @ApiParam({ name: 'photoId', description: 'ID de la photo', type: String })
  @ApiResponse({
    status: 200,
    description: 'URL signée générée',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL signée temporaire',
          example: 'https://api.example.com/api/v1/media/photos/abc123/stream?token=...',
        },
        expiresAt: {
          type: 'string',
          format: 'date-time',
          description: 'Date d\'expiration ISO',
          example: '2025-01-01T12:05:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Accès refusé à cette mission' })
  @ApiResponse({ status: 404, description: 'Photo ou mission introuvable' })
  async getSignedUrl(
    @Param('missionId') missionId: string,
    @Param('photoId') photoId: string,
    @Request() req: ExpressRequest & { user: { sub: string } },
  ): Promise<{ url: string; expiresAt: string }> {
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    return this.mediaService.getSignedPhotoUrl(
      missionId,
      photoId,
      req.user.sub,
      baseUrl,
    );
  }

  /**
   * GET /api/v1/media/photos/:photoId/stream
   * Stream une photo via token signé (public mais protégé par token)
   */
  @Get('media/photos/:photoId/stream')
  @ApiOperation({
    summary: 'Stream une photo (token signé requis)',
    description:
      'Retourne le fichier image. Nécessite un token signé valide (non expiré). ' +
      'Cette route est publique mais protégée par la vérification du token.',
  })
  @ApiParam({ name: 'photoId', description: 'ID de la photo', type: String })
  @ApiQuery({
    name: 'token',
    description: 'Token signé (obtenu via /signed-url)',
    type: String,
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Fichier image (binary)',
    content: {
      'image/jpeg': {},
      'image/png': {},
      'image/webp': {},
    },
  })
  @ApiResponse({ status: 401, description: 'Token manquant ou invalide' })
  @ApiResponse({ status: 403, description: 'Token expiré ou photoId non correspondant' })
  @ApiResponse({ status: 404, description: 'Photo introuvable sur le stockage' })
  async streamPhoto(
    @Param('photoId') photoId: string,
    @Query('token') token: string,
    @Response() res: ExpressResponse,
  ): Promise<void> {
    // Vérifier le token
    if (!token) {
      throw new UnauthorizedException('Token manquant');
    }

    const file = await this.mediaService.getPhotoByToken(photoId, token);

    // Envoyer le fichier
    res.set({
      'Content-Type': file.mimeType,
      'Content-Length': file.size.toString(),
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    });

    res.send(file.buffer);
  }
}

