/**
 * Compliance Constants - WorkOn
 *
 * Versions actives des documents légaux.
 * Ces constantes DOIVENT être synchronisées avec le frontend.
 *
 * IMPORTANT: Modifier ces versions invalide les consentements précédents
 * et force une nouvelle acceptation.
 */

export const ACTIVE_LEGAL_VERSIONS = {
  TERMS: '1.0',
  PRIVACY: '1.0',
} as const;

export type LegalDocumentType = keyof typeof ACTIVE_LEGAL_VERSIONS;

/**
 * Vérifie si une version est active
 */
export function isVersionActive(
  documentType: LegalDocumentType,
  version: string,
): boolean {
  return ACTIVE_LEGAL_VERSIONS[documentType] === version;
}

/**
 * Retourne la version active d'un document
 */
export function getActiveVersion(documentType: LegalDocumentType): string {
  return ACTIVE_LEGAL_VERSIONS[documentType];
}

