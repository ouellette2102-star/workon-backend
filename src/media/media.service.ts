import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, StorageFile } from '../storage/storage.service';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Vérifie que l'utilisateur a accès à la mission
   */
  private async checkMissionAccess(
    missionId: string,
    clerkUserId: string,
  ): Promise<boolean> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: {
        id: true,
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

    return isAuthor || isWorker;
  }

  /**
   * Génère une URL signée pour accéder à une photo
   */
  async getSignedPhotoUrl(
    missionId: string,
    photoId: string,
    clerkUserId: string,
    baseUrl: string,
  ): Promise<{ url: string; expiresAt: string }> {
    // Vérifier l'accès à la mission
    const hasAccess = await this.checkMissionAccess(missionId, clerkUserId);
    if (!hasAccess) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette mission');
    }

    // Récupérer la photo
    const photo = await this.prisma.missionPhoto.findUnique({
      where: { id: photoId },
      select: {
        id: true,
        missionId: true,
        path: true,
        url: true,
      },
    });

    if (!photo) {
      throw new NotFoundException('Photo introuvable');
    }

    // Vérifier que la photo appartient bien à la mission
    if (photo.missionId !== missionId) {
      throw new NotFoundException('Photo introuvable dans cette mission');
    }

    // Utiliser path si disponible, sinon extraire du url
    let storagePath = photo.path;
    if (!storagePath && photo.url) {
      // Extraire le path depuis l'URL (ex: http://host/uploads/missions/xxx/file.jpg)
      const urlMatch = photo.url.match(/\/uploads\/missions\/(.+)$/);
      if (urlMatch) {
        storagePath = `/uploads/missions/${urlMatch[1]}`;
      }
    }

    if (!storagePath) {
      throw new NotFoundException('Chemin de stockage introuvable pour cette photo');
    }

    // Générer l'URL signée
    return this.storageService.getSignedReadUrl(baseUrl, {
      subject: {
        userId: clerkUserId,
        missionId,
        photoId,
        path: storagePath,
      },
    });
  }

  /**
   * Récupère une photo via un token signé
   */
  async getPhotoByToken(photoId: string, token: string): Promise<StorageFile> {
    // Vérifier le token
    let payload;
    try {
      payload = this.storageService.verifyToken(token);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token invalide';
      if (message.includes('expiré')) {
        throw new ForbiddenException('Token expiré');
      }
      throw new UnauthorizedException(message);
    }

    // Vérifier que le photoId correspond
    if (payload.photoId !== photoId) {
      throw new ForbiddenException('Token non valide pour cette photo');
    }

    // Récupérer le fichier depuis le stockage
    const file = await this.storageService.getFile(payload.path);

    if (!file) {
      this.logger.warn(`Photo introuvable sur le stockage: ${payload.path}`);
      throw new NotFoundException('Photo introuvable sur le stockage');
    }

    return file;
  }
}

