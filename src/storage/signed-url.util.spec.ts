import {
  generateSignedToken,
  verifySignedToken,
  createSignedUrl,
  SignedTokenPayload,
} from './signed-url.util';

describe('SignedUrlUtil', () => {
  const testSecret = 'test-secret-key-for-unit-tests';

  const validPayload: SignedTokenPayload = {
    photoId: 'photo-123',
    missionId: 'mission-456',
    userId: 'user-789',
    path: '/uploads/missions/mission-456/photo.jpg',
    exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes dans le futur
  };

  describe('generateSignedToken', () => {
    it('devrait générer un token valide', () => {
      const token = generateSignedToken(testSecret, validPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(2); // base64Data.signature
    });
  });

  describe('verifySignedToken', () => {
    it('devrait valider un token valide', () => {
      const token = generateSignedToken(testSecret, validPayload);
      const decoded = verifySignedToken(testSecret, token);

      expect(decoded.photoId).toBe(validPayload.photoId);
      expect(decoded.missionId).toBe(validPayload.missionId);
      expect(decoded.userId).toBe(validPayload.userId);
      expect(decoded.path).toBe(validPayload.path);
    });

    it('devrait rejeter un token expiré', () => {
      const expiredPayload: SignedTokenPayload = {
        ...validPayload,
        exp: Math.floor(Date.now() / 1000) - 100, // 100 secondes dans le passé
      };
      const token = generateSignedToken(testSecret, expiredPayload);

      expect(() => verifySignedToken(testSecret, token)).toThrow('Token expiré');
    });

    it('devrait rejeter un token avec signature invalide', () => {
      const token = generateSignedToken(testSecret, validPayload);
      const tamperedToken = token.slice(0, -5) + 'XXXXX'; // Modifier la fin

      expect(() => verifySignedToken(testSecret, tamperedToken)).toThrow();
    });

    it('devrait rejeter un token avec mauvais secret', () => {
      const token = generateSignedToken(testSecret, validPayload);

      expect(() => verifySignedToken('wrong-secret', token)).toThrow('Signature invalide');
    });

    it('devrait rejeter un token vide', () => {
      expect(() => verifySignedToken(testSecret, '')).toThrow('Token manquant');
    });

    it('devrait rejeter un token mal formaté', () => {
      expect(() => verifySignedToken(testSecret, 'invalid-token-no-dot')).toThrow('Format de token invalide');
    });
  });

  describe('createSignedUrl', () => {
    it('devrait créer une URL signée complète', () => {
      const result = createSignedUrl('https://api.example.com', testSecret, {
        expiresInSeconds: 300,
        subject: {
          userId: 'user-789',
          missionId: 'mission-456',
          photoId: 'photo-123',
          path: '/uploads/missions/mission-456/photo.jpg',
        },
      });

      expect(result.url).toContain('https://api.example.com/api/v1/media/photos/photo-123/stream?token=');
      expect(result.expiresAt).toBeDefined();
      expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });
  });
});

