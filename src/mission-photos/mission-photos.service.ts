import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface MissionPhotoResponse {
  id: string;
  missionId: string;
  userId: string;
  url: string;
  createdAt: string;
}

@Injectable()
export class MissionPhotosService {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads', 'missions');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vérifier que l'utilisateur a le droit d'accéder aux photos d'une mission
   */
  private async checkMissionAccess(
    missionId: string,
    clerkUserId: string,
  ): Promise<{ canAccess: boolean; canUpload: boolean }> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: {
        id: true,
        authorClientId: true,
        assigneeWorkerId: true,
        authorClient: {
          select: {
            clerkId: true,
          },
        },
        assigneeWorker: {
          select: {
            clerkId: true,
          },
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    const isAuthor = mission.authorClient.clerkId === clerkUserId;
    const isWorker = mission.assigneeWorker?.clerkId === clerkUserId;

    return {
      canAccess: isAuthor || isWorker,
      canUpload: isAuthor || isWorker,
    };
  }

  /**
   * Récupérer toutes les photos d'une mission
   */
  async getPhotos(
    missionId: string,
    clerkUserId: string,
  ): Promise<MissionPhotoResponse[]> {
    const { canAccess } = await this.checkMissionAccess(missionId, clerkUserId);

    if (!canAccess) {
      throw new ForbiddenException(
        "Vous n'avez pas accès aux photos de cette mission",
      );
    }

    const photos = await this.prisma.missionPhoto.findMany({
      where: { missionId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        missionId: true,
        userId: true,
        url: true,
        createdAt: true,
      },
    });

    return photos.map((photo) => ({
      id: photo.id,
      missionId: photo.missionId,
      userId: photo.userId,
      url: photo.url,
      createdAt: photo.createdAt.toISOString(),
    }));
  }

  /**
   * Upload plusieurs photos pour une mission
   */
  async uploadPhotos(
    missionId: string,
    clerkUserId: string,
    files: Express.Multer.File[],
    baseUrl: string,
  ): Promise<MissionPhotoResponse[]> {
    // Vérifier les droits
    const { canUpload } = await this.checkMissionAccess(missionId, clerkUserId);

    if (!canUpload) {
      throw new ForbiddenException(
        "Vous n'avez pas le droit d'uploader des photos pour cette mission",
      );
    }

    // Créer le dossier de la mission si nécessaire
    const missionDir = path.join(this.uploadsDir, missionId);
    await fs.mkdir(missionDir, { recursive: true });

    const results: MissionPhotoResponse[] = [];

    for (const file of files) {
      // Générer un nom de fichier unique et sécurisé
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${uuidv4()}${ext}`;

      // Chemin complet du fichier
      const filepath = path.join(missionDir, filename);

      // Sauvegarder le fichier
      await fs.writeFile(filepath, file.buffer);

      // URL pour accéder à la photo
      const url = `${baseUrl}/uploads/missions/${missionId}/${filename}`;

      // Créer l'enregistrement en base
      const photo = await this.prisma.missionPhoto.create({
        data: {
          missionId,
          userId: clerkUserId,
          url,
          path: `/uploads/missions/${missionId}/${filename}`,
          mimeType: file.mimetype,
          size: file.size,
          originalName: file.originalname,
        },
        select: {
          id: true,
          missionId: true,
          userId: true,
          url: true,
          createdAt: true,
        },
      });

      results.push({
        id: photo.id,
        missionId: photo.missionId,
        userId: photo.userId,
        url: photo.url,
        createdAt: photo.createdAt.toISOString(),
      });
    }

    return results;
  }

  /**
   * Upload une photo pour une mission (legacy - single file)
   */
  async uploadPhoto(
    missionId: string,
    clerkUserId: string,
    file: Express.Multer.File,
    baseUrl: string,
  ): Promise<MissionPhotoResponse> {
    const results = await this.uploadPhotos(missionId, clerkUserId, [file], baseUrl);
    return results[0];
  }

  /**
   * Supprimer une photo (optionnel pour l'instant)
   */
  async deletePhoto(
    missionId: string,
    photoId: string,
    clerkUserId: string,
  ): Promise<void> {
    const photo = await this.prisma.missionPhoto.findUnique({
      where: { id: photoId },
      select: {
        id: true,
        missionId: true,
        userId: true,
        url: true,
        mission: {
          select: {
            authorClient: {
              select: {
                clerkId: true,
              },
            },
          },
        },
      },
    });

    if (!photo || photo.missionId !== missionId) {
      throw new NotFoundException('Photo introuvable');
    }

    // Seul l'uploader ou l'auteur de la mission peut supprimer
    const isUploader = photo.userId === clerkUserId;
    const isAuthor = photo.mission.authorClient.clerkId === clerkUserId;

    if (!isUploader && !isAuthor) {
      throw new ForbiddenException(
        "Vous n'avez pas le droit de supprimer cette photo",
      );
    }

    // Supprimer le fichier du disque
    const urlPath = new URL(photo.url).pathname;
    const filename = path.basename(urlPath);
    const filepath = path.join(this.uploadsDir, missionId, filename);

    try {
      await fs.unlink(filepath);
    } catch (error) {
      // Si le fichier n'existe pas, on continue quand même
      console.warn(`File not found: ${filepath}`);
    }

    // Supprimer l'enregistrement en base
    await this.prisma.missionPhoto.delete({
      where: { id: photoId },
    });
  }
}

