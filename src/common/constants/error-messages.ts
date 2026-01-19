/**
 * Messages d'erreur standardisés pour WorkOn API
 *
 * OBJECTIF: Uniformiser les messages d'erreur pour le frontend (marché québécois).
 *
 * CONVENTION:
 * - Messages en français pour les erreurs présentées à l'utilisateur
 * - Messages techniques en anglais (logs, debug)
 * - Structure: DOMAIN.ACTION.REASON
 *
 * USAGE:
 * ```typescript
 * import { ERROR_MESSAGES } from '@/common/constants/error-messages';
 * throw new NotFoundException(ERROR_MESSAGES.MISSION.NOT_FOUND);
 * ```
 *
 * @module common/constants
 */

export const ERROR_MESSAGES = {
  // ============================================
  // AUTH - Authentification
  // ============================================
  AUTH: {
    INVALID_CREDENTIALS: 'Identifiants invalides',
    UNAUTHORIZED: 'Non authentifié',
    TOKEN_EXPIRED: 'Session expirée, veuillez vous reconnecter',
    FORBIDDEN: 'Accès non autorisé',
    EMAIL_ALREADY_EXISTS: 'Cette adresse email est déjà utilisée',
    USER_NOT_FOUND: 'Utilisateur non trouvé',
    INVALID_REFRESH_TOKEN: 'Token de rafraîchissement invalide',
    CONSENT_REQUIRED: 'Veuillez accepter les conditions d\'utilisation',
  },

  // ============================================
  // MISSION - Missions
  // ============================================
  MISSION: {
    NOT_FOUND: 'Mission introuvable',
    ALREADY_ASSIGNED: 'Cette mission est déjà assignée',
    NOT_OPEN: 'Cette mission n\'est plus disponible',
    CANNOT_ACCEPT_OWN: 'Vous ne pouvez pas accepter votre propre mission',
    ONLY_WORKERS: 'Seuls les travailleurs peuvent rechercher des missions',
    ONLY_CREATOR_CAN_CANCEL: 'Seul le créateur peut annuler cette mission',
    ONLY_ASSIGNED_CAN_START: 'Seul le travailleur assigné peut démarrer cette mission',
    ONLY_ASSIGNED_CAN_COMPLETE: 'Seul le travailleur assigné peut terminer cette mission',
    CANNOT_START_NOT_ASSIGNED: 'Cette mission n\'est pas en statut assigné',
    CANNOT_COMPLETE_NOT_STARTED: 'Cette mission n\'est pas en cours',
    NO_WORKER_ASSIGNED: 'Aucun travailleur assigné à cette mission',
  },

  // ============================================
  // OFFER - Offres/candidatures
  // ============================================
  OFFER: {
    NOT_FOUND: 'Offre introuvable',
    ALREADY_EXISTS: 'Vous avez déjà soumis une offre pour cette mission',
    CANNOT_OFFER_OWN_MISSION: 'Vous ne pouvez pas postuler à votre propre mission',
    MISSION_NOT_OPEN: 'Cette mission n\'accepte plus d\'offres',
    ALREADY_ACCEPTED: 'Cette offre a déjà été acceptée',
    ONLY_OWNER_CAN_ACCEPT: 'Seul le propriétaire de la mission peut accepter les offres',
    ONLY_OWNER_CAN_REJECT: 'Seul le propriétaire de la mission peut refuser les offres',
    ONLY_PENDING_CAN_REJECT: 'Seules les offres en attente peuvent être refusées',
  },

  // ============================================
  // MESSAGE - Messagerie
  // ============================================
  MESSAGE: {
    NOT_FOUND: 'Message introuvable',
    MISSION_NOT_FOUND: 'Conversation introuvable',
    EMPTY_CONTENT: 'Le message ne peut pas être vide',
    ACCESS_DENIED: 'Vous n\'avez pas accès à cette conversation',
    NO_WORKER_ASSIGNED: 'Impossible d\'envoyer un message : aucun travailleur assigné',
  },

  // ============================================
  // PAYMENT - Paiements
  // ============================================
  PAYMENT: {
    NOT_FOUND: 'Paiement introuvable',
    ALREADY_PAID: 'Cette mission a déjà été payée',
    ONLY_CREATOR_CAN_PAY: 'Seul le créateur de la mission peut effectuer le paiement',
    INVALID_AMOUNT: 'Le montant doit être supérieur à 0',
    STRIPE_NOT_CONFIGURED: 'Le service de paiement n\'est pas configuré',
    INVALID_WEBHOOK: 'Signature de webhook invalide',
    CAPTURE_FAILED: 'Échec de la capture du paiement',
  },

  // ============================================
  // DEVICE - Appareils (push)
  // ============================================
  DEVICE: {
    NOT_FOUND: 'Appareil non trouvé',
    ALREADY_REGISTERED: 'Cet appareil est déjà enregistré',
  },

  // ============================================
  // REVIEW - Avis
  // ============================================
  REVIEW: {
    NOT_FOUND: 'Avis non trouvé',
    TARGET_NOT_FOUND: 'Utilisateur cible non trouvé',
    MISSION_NOT_FOUND: 'Mission non trouvée',
    ALREADY_EXISTS: 'Vous avez déjà laissé un avis pour cette mission',
    NOT_COMPLETED: 'Vous ne pouvez évaluer que les missions terminées',
  },

  // ============================================
  // CONTRACT - Contrats
  // ============================================
  CONTRACT: {
    NOT_FOUND: 'Contrat introuvable',
    ALREADY_EXISTS: 'Un contrat existe déjà pour cette mission',
    ONLY_EMPLOYER_CAN_CREATE: 'Seul l\'employeur peut créer un contrat',
    ACCESS_DENIED: 'Vous n\'avez pas accès à ce contrat',
  },

  // ============================================
  // NOTIFICATION - Notifications
  // ============================================
  NOTIFICATION: {
    NOT_FOUND: 'Notification non trouvée',
  },

  // ============================================
  // USER - Utilisateurs
  // ============================================
  USER: {
    NOT_FOUND: 'Utilisateur non trouvé',
    PROFILE_NOT_FOUND: 'Profil utilisateur introuvable',
    ONLY_WORKERS: 'Accès réservé aux travailleurs',
    ONLY_EMPLOYERS: 'Accès réservé aux employeurs et clients',
  },

  // ============================================
  // COMPLIANCE - Conformité
  // ============================================
  COMPLIANCE: {
    VERSION_MISMATCH: 'Version du document invalide',
    CONSENT_REQUIRED: 'Veuillez accepter les conditions d\'utilisation et la politique de confidentialité',
  },

  // ============================================
  // GENERAL - Erreurs génériques
  // ============================================
  GENERAL: {
    INTERNAL_ERROR: 'Une erreur est survenue. Veuillez réessayer.',
    VALIDATION_ERROR: 'Données invalides',
    TOO_MANY_REQUESTS: 'Trop de requêtes. Veuillez patienter.',
    SERVICE_UNAVAILABLE: 'Service temporairement indisponible',
  },
} as const;

/**
 * Type utilitaire pour les clés de messages d'erreur
 */
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;

