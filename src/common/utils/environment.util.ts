/**
 * Utilitaires pour détecter l'environnement d'exécution
 * 
 * Utilisé pour assouplir certaines règles métier en développement
 * tout en gardant une sécurité stricte en production.
 */

/**
 * Détermine si l'application tourne en mode développement
 * 
 * @returns true si NODE_ENV !== 'production'
 */
export function isDevEnvironment(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * Détermine si l'application tourne en mode production
 * 
 * @returns true si NODE_ENV === 'production'
 */
export function isProdEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Log un message uniquement en développement
 * Utile pour le debug sans polluer les logs de production
 */
export function devLog(message: string, ...args: any[]): void {
  if (isDevEnvironment()) {
    console.log(`[DEV] ${message}`, ...args);
  }
}

/**
 * Log un warning uniquement en développement
 */
export function devWarn(message: string, ...args: any[]): void {
  if (isDevEnvironment()) {
    console.warn(`[DEV WARNING] ${message}`, ...args);
  }
}

