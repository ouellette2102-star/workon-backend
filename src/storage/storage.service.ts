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

export type StorageBackend = 'local' | 's3';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadsDir: string;
  private readonly signedUrlSecret: string;
  private readonly signedUrlTtl: number;
  private readonly backend: StorageBackend;
  private s3Client: any = null;
  private readonly s3Bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadsDir = path.join(process.cwd(), 'uploads', 'missions');

    this.signedUrlSecret = this.configService.get<string>('SIGNED_URL_SECRET') || 'dev-signed-url-secret-change-in-production';

    this.signedUrlTtl = parseInt(
      this.configService.get<string>('SIGNED_URL_TTL_SECONDS') || '300',
      10,
    );

    // S3 configuration (optional — falls back to local storage)
    this.s3Bucket = this.configService.get<string>('S3_BUCKET') || '';
    const s3Region = this.configService.get<string>('S3_REGION');
    const s3Endpoint = this.configService.get<string>('S3_ENDPOINT'); // For R2, MinIO, etc.

    if (this.s3Bucket && s3Region) {
      try {
        const { S3Client } = require('@aws-sdk/client-s3');
        this.s3Client = new S3Client({
          region: s3Region,
          ...(s3Endpoint ? { endpoint: s3Endpoint, forcePathStyle: true } : {}),
        });
        this.backend = 's3';
        this.logger.log(`Storage backend: S3 (bucket: ${this.s3Bucket})`);
      } catch {
        this.logger.warn('S3 configured but @aws-sdk/client-s3 not installed — using local storage');
        this.backend = 'local';
      }
    } else {
      this.backend = 'local';
      this.logger.log('Storage backend: local disk');
    }
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

  /**
   * Upload a file (auto-routes to local or S3 based on config)
   */
  async uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    if (this.backend === 's3' && this.s3Client) {
      return this.uploadToS3(key, buffer, mimeType);
    }
    return this.uploadToLocal(key, buffer);
  }

  /**
   * Upload to local filesystem
   */
  private async uploadToLocal(key: string, buffer: Buffer): Promise<string> {
    const fullPath = path.join(this.uploadsDir, key);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return `/uploads/missions/${key}`;
  }

  /**
   * Upload to S3/R2
   */
  private async uploadToS3(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');

    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.s3Bucket,
      Key: `missions/${key}`,
      Body: buffer,
      ContentType: mimeType,
    }));

    const cdnUrl = this.configService.get<string>('CDN_URL');
    if (cdnUrl) {
      return `${cdnUrl}/missions/${key}`;
    }

    return `s3://${this.s3Bucket}/missions/${key}`;
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(key: string): Promise<void> {
    if (this.backend === 's3' && this.s3Client) {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.s3Bucket,
        Key: `missions/${key}`,
      }));
    } else {
      const fullPath = path.join(this.uploadsDir, key);
      await fs.unlink(fullPath).catch(() => {});
    }
  }

  getBackend(): StorageBackend {
    return this.backend;
  }
}

