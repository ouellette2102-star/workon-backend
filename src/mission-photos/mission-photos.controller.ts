import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MissionPhotosService, MissionPhotoResponse } from './mission-photos.service';

// ============================================
// CONFIGURATION UPLOAD
// ============================================
const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

@ApiTags('Missions')
@ApiBearerAuth()
@Controller('api/v1/missions/:missionId/photos')
@UseGuards(JwtAuthGuard)
export class MissionPhotosController {
  constructor(private readonly missionPhotosService: MissionPhotosService) {}

  /**
   * GET /api/v1/missions/:missionId/photos
   * Récupérer toutes les photos d'une mission
   */
  @Get()
  @ApiOperation({
    summary: 'Liste des photos d\'une mission',
    description: 'Retourne toutes les photos uploadées pour une mission. Accessible par l\'employer ou le worker assigné.',
  })
  @ApiParam({ name: 'missionId', description: 'ID de la mission', type: String })
  @ApiResponse({
    status: 200,
    description: 'Liste des photos',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          missionId: { type: 'string' },
          userId: { type: 'string' },
          url: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Mission introuvable' })
  getPhotos(@Param('missionId') missionId: string, @Request() req: any) {
    return this.missionPhotosService.getPhotos(missionId, req.user.sub);
  }

  /**
   * POST /api/v1/missions/:missionId/photos
   * Upload une ou plusieurs photos pour une mission
   */
  @Post()
  @ApiOperation({
    summary: 'Upload photos pour une mission',
    description: `Upload jusqu'à ${MAX_FILES} photos (max ${MAX_FILE_SIZE / 1024 / 1024}MB chacune). Formats: JPEG, PNG, WebP. Accessible par l'employer ou le worker assigné.`,
  })
  @ApiParam({ name: 'missionId', description: 'ID de la mission', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Fichiers images à uploader',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: `Jusqu'à ${MAX_FILES} fichiers images (JPEG, PNG, WebP)`,
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Photos uploadées avec succès',
    schema: {
      type: 'object',
      properties: {
        uploaded: { type: 'number', description: 'Nombre de photos uploadées' },
        photos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              missionId: { type: 'string' },
              userId: { type: 'string' },
              url: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Fichier invalide (type/taille)' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Mission introuvable' })
  @UseInterceptors(FilesInterceptor('files', MAX_FILES))
  async uploadPhotos(
    @Param('missionId') missionId: string,
    @Request() req: any,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ uploaded: number; photos: MissionPhotoResponse[] }> {
    // Validation: au moins 1 fichier
    if (!files || files.length === 0) {
      throw new BadRequestException('Aucun fichier fourni. Utilisez le champ "files".');
    }

    // Validation: chaque fichier
    for (const file of files) {
      // Vérifier le type MIME
      if (!ALLOWED_MIMES.includes(file.mimetype)) {
        throw new BadRequestException(
          `Type de fichier non autorisé: ${file.mimetype}. Formats acceptés: JPEG, PNG, WebP.`,
        );
      }

      // Vérifier la taille
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException(
          `Fichier trop volumineux: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB). Max: ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
        );
      }
    }

    // Construire l'URL de base depuis la requête
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    const photos = await this.missionPhotosService.uploadPhotos(
      missionId,
      req.user.sub,
      files,
      baseUrl,
    );

    return {
      uploaded: photos.length,
      photos,
    };
  }

  /**
   * DELETE /api/v1/missions/:missionId/photos/:photoId
   * Supprimer une photo (optionnel)
   */
  @Delete(':photoId')
  async deletePhoto(
    @Param('missionId') missionId: string,
    @Param('photoId') photoId: string,
    @Request() req: any,
  ) {
    await this.missionPhotosService.deletePhoto(
      missionId,
      photoId,
      req.user.sub,
    );
    return { message: 'Photo supprimée avec succès' };
  }
}

