/**
 * Utilitaire pour la génération et vérification de tokens signés (HMAC)
 * Utilisé pour les URLs de lecture temporaires des photos
 */
import * as crypto from 'crypto';

export interface SignedTokenPayload {
  photoId: string;
  missionId: string;
  userId: string;
  path: string;
  exp: number; // Unix timestamp expiration
}

export interface SignedUrlOptions {
  expiresInSeconds: number;
  subject: {
    userId: string;
    missionId: string;
    photoId: string;
    path: string;
  };
}

/**
 * Génère un token signé HMAC-SHA256 pour accéder à une ressource
 */
export function generateSignedToken(
  secret: string,
  payload: SignedTokenPayload,
): string {
  const data = JSON.stringify(payload);
  const base64Data = Buffer.from(data).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(base64Data)
    .digest('base64url');

  return `${base64Data}.${signature}`;
}

/**
 * Vérifie et décode un token signé
 * @throws Error si le token est invalide ou expiré
 */
export function verifySignedToken(
  secret: string,
  token: string,
): SignedTokenPayload {
  if (!token || typeof token !== 'string') {
    throw new Error('Token manquant');
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new Error('Format de token invalide');
  }

  const [base64Data, providedSignature] = parts;

  // Vérifier la signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(base64Data)
    .digest('base64url');

  if (!crypto.timingSafeEqual(
    Buffer.from(providedSignature),
    Buffer.from(expectedSignature),
  )) {
    throw new Error('Signature invalide');
  }

  // Décoder le payload
  let payload: SignedTokenPayload;
  try {
    const jsonData = Buffer.from(base64Data, 'base64url').toString('utf-8');
    payload = JSON.parse(jsonData);
  } catch {
    throw new Error('Payload invalide');
  }

  // Vérifier l'expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('Token expiré');
  }

  return payload;
}

/**
 * Crée une URL signée complète
 */
export function createSignedUrl(
  baseUrl: string,
  secret: string,
  options: SignedUrlOptions,
): { url: string; expiresAt: string } {
  const exp = Math.floor(Date.now() / 1000) + options.expiresInSeconds;

  const payload: SignedTokenPayload = {
    photoId: options.subject.photoId,
    missionId: options.subject.missionId,
    userId: options.subject.userId,
    path: options.subject.path,
    exp,
  };

  const token = generateSignedToken(secret, payload);
  const url = `${baseUrl}/api/v1/media/photos/${options.subject.photoId}/stream?token=${encodeURIComponent(token)}`;
  const expiresAt = new Date(exp * 1000).toISOString();

  return { url, expiresAt };
}

