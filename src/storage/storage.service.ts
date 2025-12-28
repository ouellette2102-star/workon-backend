/**
 * Service de stockage abstrait pour les photos
 * Implémentation locale (disk) par défaut, prêt pour S3/R2 plus tard
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createSignedUrl, SignedUrlOptions, verifySignedToken, SignedTokenPayload } from './signed-url.util';

export interface StorageFile {
  buffer: Buffer;
  mimeType: string;
  size: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadsDir: string;
  private readonly signedUrlSecret: string;
  private readonly signedUrlTtl: number;

  constructor(private readonly configService: ConfigService) {
    this.uploadsDir = path.join(process.cwd(), 'uploads', 'missions');
    
    // Secret pour signer les URLs
    this.signedUrlSecret = this.configService.get<string>('SIGNED_URL_SECRET') || 'dev-signed-url-secret-change-in-production';
    
    // TTL par défaut: 5 minutes
    this.signedUrlTtl = parseInt(
      this.configService.get<string>('SIGNED_URL_TTL_SECONDS') || '300',
      10,
    );
  }

  /**
   * Génère une URL signée temporaire pour lire une photo
   */
  getSignedReadUrl(
    baseUrl: string,
    options: Omit<SignedUrlOptions, 'expiresInSeconds'> & { expiresInSeconds?: number },
  ): { url: string; expiresAt: string } {
    const expiresInSeconds = options.expiresInSeconds || this.signedUrlTtl;

    return createSignedUrl(baseUrl, this.signedUrlSecret, {
      expiresInSeconds,
      subject: options.subject,
    });
  }

  /**
   * Vérifie un token signé et retourne le payload
   * @throws Error si invalide ou expiré
   */
  verifyToken(token: string): SignedTokenPayload {
    return verifySignedToken(this.signedUrlSecret, token);
  }

  /**
   * Lit un fichier depuis le stockage local
   * @param storagePath - chemin relatif (ex: /uploads/missions/{missionId}/{filename})
   */
  async getFile(storagePath: string): Promise<StorageFile | null> {
    try {
      // Nettoyer le path (enlever le préfixe /uploads/missions si présent)
      let relativePath = storagePath;
      if (relativePath.startsWith('/uploads/missions/')) {
        relativePath = relativePath.replace('/uploads/missions/', '');
      }

      const fullPath = path.join(this.uploadsDir, relativePath);

      // Sécurité: vérifier que le chemin est bien dans uploadsDir
      const normalizedPath = path.normalize(fullPath);
      if (!normalizedPath.startsWith(path.normalize(this.uploadsDir))) {
        this.logger.warn(`Tentative d'accès hors répertoire: ${storagePath}`);
        return null;
      }

      const buffer = await fs.readFile(fullPath);
      const stats = await fs.stat(fullPath);

      // Déterminer le mime type basé sur l'extension
      const ext = path.extname(fullPath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
      };

      return {
        buffer,
        mimeType: mimeTypes[ext] || 'application/octet-stream',
        size: stats.size,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
}

