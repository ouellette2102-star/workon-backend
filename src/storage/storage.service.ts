/**
 * Storage Service — S3 (production) or local disk (development)
 *
 * Uses AWS S3 / R2 / DigitalOcean Spaces when S3_BUCKET is configured.
 * Falls back to local disk in development.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { createSignedUrl, SignedUrlOptions, verifySignedToken, SignedTokenPayload } from './signed-url.util';

export interface StorageFile {
  buffer: Buffer;
  mimeType: string;
  size: number;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3?: S3Client;
  private readonly bucket?: string;
  private readonly cdnUrl?: string;
  private readonly uploadsDir: string;
  private readonly useS3: boolean;
  private readonly signedUrlSecret: string;
  private readonly signedUrlTtl: number;

  constructor(private readonly configService: ConfigService) {
    this.uploadsDir = path.join(process.cwd(), 'uploads', 'missions');
    this.signedUrlSecret = this.configService.get<string>('SIGNED_URL_SECRET') || 'dev-signed-url-secret-change-in-production';
    this.signedUrlTtl = parseInt(this.configService.get<string>('SIGNED_URL_TTL_SECONDS') || '300', 10);

    this.bucket = this.configService.get<string>('S3_BUCKET');
    this.cdnUrl = this.configService.get<string>('S3_CDN_URL');
    this.useS3 = !!this.bucket;

    if (this.useS3) {
      this.s3 = new S3Client({
        region: this.configService.get<string>('S3_REGION') || 'us-east-1',
        endpoint: this.configService.get<string>('S3_ENDPOINT') || undefined,
        forcePathStyle: !!this.configService.get<string>('S3_ENDPOINT'),
        credentials: {
          accessKeyId: this.configService.get<string>('S3_ACCESS_KEY_ID') || '',
          secretAccessKey: this.configService.get<string>('S3_SECRET_ACCESS_KEY') || '',
        },
      });
      this.logger.log(`Storage: S3 (bucket: ${this.bucket})`);
    } else {
      this.logger.warn('Storage: local disk (set S3_BUCKET to use S3)');
    }
  }

  /**
   * Upload a file. Returns the storage key and public URL.
   */
  async upload(
    buffer: Buffer,
    options: { folder: string; filename?: string; mimeType: string },
  ): Promise<UploadResult> {
    const ext = this.mimeToExt(options.mimeType);
    const filename = options.filename || `${crypto.randomUUID()}${ext}`;
    const key = `${options.folder}/${filename}`;

    if (this.useS3 && this.s3) {
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: options.mimeType,
        CacheControl: 'public, max-age=31536000',
      }));

      const url = this.cdnUrl
        ? `${this.cdnUrl}/${key}`
        : `https://${this.bucket}.s3.amazonaws.com/${key}`;

      this.logger.log(`Uploaded to S3: ${key} (${buffer.length} bytes)`);
      return { key, url, size: buffer.length };
    }

    // Local fallback
    const fullPath = path.join(this.uploadsDir, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);

    this.logger.log(`Uploaded to disk: ${key} (${buffer.length} bytes)`);
    return { key, url: `/uploads/missions/${key}`, size: buffer.length };
  }

  /**
   * Delete a file by key.
   */
  async delete(key: string): Promise<void> {
    if (this.useS3 && this.s3) {
      await this.s3.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      return;
    }

    const fullPath = path.join(this.uploadsDir, key);
    await fs.unlink(fullPath).catch(() => {});
  }

  /**
   * Get a presigned URL for direct download (S3) or signed URL (local).
   */
  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (this.useS3 && this.s3) {
      return getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn },
      );
    }

    const { url } = this.getSignedReadUrl(`/uploads/missions/${key}`, {
      subject: { userId: '', missionId: '', photoId: '', path: key },
      expiresInSeconds: expiresIn,
    });
    return url;
  }

  /**
   * Génère une URL signée temporaire pour lire une photo (legacy)
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

  verifyToken(token: string): SignedTokenPayload {
    return verifySignedToken(this.signedUrlSecret, token);
  }

  /**
   * Read a file (legacy local-only method, kept for backward compatibility).
   */
  async getFile(storagePath: string): Promise<StorageFile | null> {
    if (this.useS3 && this.s3) {
      try {
        const response = await this.s3.send(new GetObjectCommand({
          Bucket: this.bucket,
          Key: storagePath.replace(/^\/uploads\/missions\//, ''),
        }));
        const buffer = Buffer.from(await response.Body!.transformToByteArray());
        return {
          buffer,
          mimeType: response.ContentType || 'application/octet-stream',
          size: buffer.length,
        };
      } catch {
        return null;
      }
    }

    try {
      let relativePath = storagePath;
      if (relativePath.startsWith('/uploads/missions/')) {
        relativePath = relativePath.replace('/uploads/missions/', '');
      }
      const fullPath = path.join(this.uploadsDir, relativePath);
      const normalizedPath = path.normalize(fullPath);
      if (!normalizedPath.startsWith(path.normalize(this.uploadsDir))) {
        return null;
      }
      const buffer = await fs.readFile(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      return {
        buffer,
        mimeType: this.extToMime(ext),
        size: buffer.length,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  private mimeToExt(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
      'image/gif': '.gif', 'application/pdf': '.pdf',
    };
    return map[mime] || '.bin';
  }

  private extToMime(ext: string): string {
    const map: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.webp': 'image/webp', '.gif': 'image/gif',
    };
    return map[ext] || 'application/octet-stream';
  }
}

