import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MissionPhotosService } from './mission-photos.service';

@ApiTags('Missions')
@Controller('missions/:missionId/photos')
@UseGuards(JwtAuthGuard)
export class MissionPhotosController {
  constructor(private readonly missionPhotosService: MissionPhotosService) {}

  /**
   * GET /api/v1/missions/:missionId/photos
   * Récupérer toutes les photos d'une mission
   */
  @Get()
  getPhotos(@Param('missionId') missionId: string, @Request() req: any) {
    return this.missionPhotosService.getPhotos(missionId, req.user.sub);
  }

  /**
   * POST /api/v1/missions/:missionId/photos
   * Upload une photo pour une mission
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(
    @Param('missionId') missionId: string,
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Construire l'URL de base depuis la requête
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    return this.missionPhotosService.uploadPhoto(
      missionId,
      req.user.sub,
      file,
      baseUrl,
    );
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

