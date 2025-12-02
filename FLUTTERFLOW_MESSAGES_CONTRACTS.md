# 📱 FlutterFlow Integration Kit - Messages & Contracts

## Base URL
```
https://workon-backend-production-8908.up.railway.app/api/v1
```

## Authentication
Toutes les requêtes nécessitent un header `Authorization`:
```
Authorization: Bearer <JWT_TOKEN>
```

---

# 📨 MODULE MESSAGES

## Endpoints

### 1. Envoyer un message
**POST** `/messages`

#### Body (JSON)
```json
{
  "missionId": "mission_123456789",
  "content": "Bonjour, je suis disponible pour cette mission."
}
```

#### Response (201 Created)
```json
{
  "id": "msg_1733170722123_abc123",
  "missionId": "mission_123456789",
  "senderId": "user_clerk_id_xxx",
  "senderRole": "WORKER",
  "content": "Bonjour, je suis disponible pour cette mission.",
  "createdAt": "2025-12-02T20:18:42.123Z"
}
```

#### FlutterFlow Config
| Paramètre | Valeur |
|-----------|--------|
| API Call Name | `sendMessage` |
| Method | POST |
| URL | `{{baseUrl}}/messages` |
| Headers | `Authorization: Bearer {{authToken}}`, `Content-Type: application/json` |
| Body | JSON with `missionId` (String), `content` (String) |

---

### 2. Récupérer les messages d'une mission
**GET** `/messages/thread/{missionId}`

#### Response (200 OK)
```json
[
  {
    "id": "msg_1733170722123_abc123",
    "missionId": "mission_123456789",
    "senderId": "user_clerk_id_employer",
    "senderRole": "EMPLOYER",
    "content": "Bonjour, êtes-vous disponible demain ?",
    "createdAt": "2025-12-02T10:00:00.000Z"
  },
  {
    "id": "msg_1733170722124_def456",
    "missionId": "mission_123456789",
    "senderId": "user_clerk_id_worker",
    "senderRole": "WORKER",
    "content": "Oui, je suis disponible à partir de 9h.",
    "createdAt": "2025-12-02T10:05:00.000Z"
  }
]
```

#### FlutterFlow Config
| Paramètre | Valeur |
|-----------|--------|
| API Call Name | `getMessagesForMission` |
| Method | GET |
| URL | `{{baseUrl}}/messages/thread/{{missionId}}` |
| Headers | `Authorization: Bearer {{authToken}}` |
| Path Params | `missionId` (String) |

---

### 3. Marquer les messages comme lus
**PATCH** `/messages/read/{missionId}`

#### Response (200 OK)
```json
{
  "count": 5
}
```

#### FlutterFlow Config
| Paramètre | Valeur |
|-----------|--------|
| API Call Name | `markMessagesAsRead` |
| Method | PATCH |
| URL | `{{baseUrl}}/messages/read/{{missionId}}` |
| Headers | `Authorization: Bearer {{authToken}}` |
| Path Params | `missionId` (String) |

---

### 4. Compter les messages non lus
**GET** `/messages/unread-count`

#### Response (200 OK)
```json
{
  "count": 3
}
```

#### FlutterFlow Config
| Paramètre | Valeur |
|-----------|--------|
| API Call Name | `getUnreadMessagesCount` |
| Method | GET |
| URL | `{{baseUrl}}/messages/unread-count` |
| Headers | `Authorization: Bearer {{authToken}}` |

---

# 📄 MODULE CONTRACTS

## Endpoints

### 1. Créer un contrat
**POST** `/contracts`

#### Body (JSON)
```json
{
  "missionId": "mission_123456789",
  "amount": 500.00,
  "hourlyRate": 25.00,
  "startAt": "2025-01-15T09:00:00.000Z",
  "endAt": "2025-01-15T17:00:00.000Z"
}
```

#### Response (201 Created)
```json
{
  "id": "contract_1733170722123_xyz789",
  "missionId": "mission_123456789",
  "employerId": "user_employer_id",
  "workerId": "user_worker_id",
  "status": "DRAFT",
  "amount": 500.00,
  "hourlyRate": 25.00,
  "startAt": "2025-01-15T09:00:00.000Z",
  "endAt": "2025-01-15T17:00:00.000Z",
  "signedByWorker": false,
  "signedByEmployer": false,
  "createdAt": "2025-12-02T20:18:42.123Z",
  "updatedAt": "2025-12-02T20:18:42.123Z",
  "mission": {
    "id": "mission_123456789",
    "title": "Nettoyage bureau"
  },
  "employer": {
    "id": "user_employer_id",
    "clerkId": "clerk_xxx"
  },
  "worker": {
    "id": "user_worker_id",
    "clerkId": "clerk_yyy"
  }
}
```

#### FlutterFlow Config
| Paramètre | Valeur |
|-----------|--------|
| API Call Name | `createContract` |
| Method | POST |
| URL | `{{baseUrl}}/contracts` |
| Headers | `Authorization: Bearer {{authToken}}`, `Content-Type: application/json` |
| Body | JSON with `missionId`, `amount`, `hourlyRate?`, `startAt?`, `endAt?` |

---

### 2. Récupérer un contrat par ID
**GET** `/contracts/{id}`

#### Response (200 OK)
```json
{
  "id": "contract_1733170722123_xyz789",
  "missionId": "mission_123456789",
  "employerId": "user_employer_id",
  "workerId": "user_worker_id",
  "status": "PENDING",
  "amount": 500.00,
  "hourlyRate": 25.00,
  "startAt": "2025-01-15T09:00:00.000Z",
  "endAt": "2025-01-15T17:00:00.000Z",
  "signedByWorker": false,
  "signedByEmployer": true,
  "createdAt": "2025-12-02T20:18:42.123Z",
  "updatedAt": "2025-12-02T20:20:00.000Z",
  "mission": {
    "id": "mission_123456789",
    "title": "Nettoyage bureau"
  }
}
```

#### FlutterFlow Config
| Paramètre | Valeur |
|-----------|--------|
| API Call Name | `getContractById` |
| Method | GET |
| URL | `{{baseUrl}}/contracts/{{contractId}}` |
| Headers | `Authorization: Bearer {{authToken}}` |
| Path Params | `contractId` (String) |

---

### 3. Récupérer mes contrats
**GET** `/contracts/user/me`

#### Response (200 OK)
```json
[
  {
    "id": "contract_1733170722123_xyz789",
    "missionId": "mission_123456789",
    "status": "ACCEPTED",
    "amount": 500.00,
    "signedByWorker": true,
    "signedByEmployer": true,
    "createdAt": "2025-12-02T20:18:42.123Z",
    "mission": {
      "id": "mission_123456789",
      "title": "Nettoyage bureau"
    }
  },
  {
    "id": "contract_1733170722124_abc456",
    "missionId": "mission_987654321",
    "status": "PENDING",
    "amount": 300.00,
    "signedByWorker": false,
    "signedByEmployer": true,
    "createdAt": "2025-12-01T15:00:00.000Z",
    "mission": {
      "id": "mission_987654321",
      "title": "Jardinage"
    }
  }
]
```

#### FlutterFlow Config
| Paramètre | Valeur |
|-----------|--------|
| API Call Name | `getMyContracts` |
| Method | GET |
| URL | `{{baseUrl}}/contracts/user/me` |
| Headers | `Authorization: Bearer {{authToken}}` |

---

### 4. Mettre à jour le statut d'un contrat
**PATCH** `/contracts/{id}/status`

#### Body (JSON)
```json
{
  "status": "ACCEPTED"
}
```

#### Statuts possibles
| Statut | Description | Qui peut le faire |
|--------|-------------|-------------------|
| `DRAFT` | Brouillon initial | - |
| `PENDING` | Envoyé au worker | Employer |
| `ACCEPTED` | Accepté par le worker | Worker |
| `REJECTED` | Refusé par le worker | Worker |
| `COMPLETED` | Mission terminée | Employer |
| `CANCELLED` | Annulé | Employer/Worker |

#### Transitions autorisées
```
DRAFT → PENDING (employer envoie)
DRAFT → CANCELLED

PENDING → ACCEPTED (worker accepte)
PENDING → REJECTED (worker refuse)
PENDING → CANCELLED

ACCEPTED → COMPLETED (employer termine)
ACCEPTED → CANCELLED
```

#### Response (200 OK)
```json
{
  "id": "contract_1733170722123_xyz789",
  "status": "ACCEPTED",
  "signedByWorker": true,
  "signedByEmployer": true,
  "updatedAt": "2025-12-02T20:25:00.000Z"
}
```

#### FlutterFlow Config
| Paramètre | Valeur |
|-----------|--------|
| API Call Name | `updateContractStatus` |
| Method | PATCH |
| URL | `{{baseUrl}}/contracts/{{contractId}}/status` |
| Headers | `Authorization: Bearer {{authToken}}`, `Content-Type: application/json` |
| Path Params | `contractId` (String) |
| Body | JSON with `status` (String enum) |

---

# 🎨 FlutterFlow Variables

## App State Variables (Persistent)

### Messages
| Variable | Type | Description |
|----------|------|-------------|
| `unreadMessagesCount` | Integer | Nombre de messages non lus |
| `currentChatMissionId` | String | ID de la mission du chat actif |

### Contracts
| Variable | Type | Description |
|----------|------|-------------|
| `currentContractId` | String | ID du contrat affiché |
| `myContractsList` | JSON List | Liste des contrats de l'utilisateur |

## Page State Variables

### Chat Page
| Variable | Type | Description |
|----------|------|-------------|
| `messagesList` | JSON List | Messages du chat |
| `newMessageContent` | String | Contenu du nouveau message |
| `isLoadingMessages` | Boolean | État de chargement |

### Contract Detail Page
| Variable | Type | Description |
|----------|------|-------------|
| `currentContract` | JSON | Détails du contrat |
| `isUpdatingStatus` | Boolean | État de mise à jour |

---

# 🔧 Dart Helper Functions

Copiez ces fonctions dans FlutterFlow (Custom Functions):

```dart
/// Formate une date pour l'affichage dans le chat
/// Ex: "10:30" (aujourd'hui), "Hier 10:30", "15 déc. 10:30"
String formatMessageTime(DateTime date) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final messageDate = DateTime(date.year, date.month, date.day);
  
  final timeStr = '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  
  if (messageDate == today) {
    return timeStr;
  } else if (messageDate == today.subtract(const Duration(days: 1))) {
    return 'Hier $timeStr';
  } else {
    final months = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 
                    'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    return '${date.day} ${months[date.month - 1]} $timeStr';
  }
}

/// Convertit le statut du contrat en texte lisible
String humanReadableContractStatus(String status) {
  switch (status) {
    case 'DRAFT':
      return 'Brouillon';
    case 'PENDING':
      return 'En attente';
    case 'ACCEPTED':
      return 'Accepté';
    case 'REJECTED':
      return 'Refusé';
    case 'COMPLETED':
      return 'Terminé';
    case 'CANCELLED':
      return 'Annulé';
    default:
      return status;
  }
}

/// Retourne la couleur associée au statut du contrat
Color getContractStatusColor(String status) {
  switch (status) {
    case 'DRAFT':
      return const Color(0xFF9E9E9E); // Gris
    case 'PENDING':
      return const Color(0xFFFFA726); // Orange
    case 'ACCEPTED':
      return const Color(0xFF66BB6A); // Vert
    case 'REJECTED':
      return const Color(0xFFEF5350); // Rouge
    case 'COMPLETED':
      return const Color(0xFF42A5F5); // Bleu
    case 'CANCELLED':
      return const Color(0xFF78909C); // Gris foncé
    default:
      return const Color(0xFF9E9E9E);
  }
}

/// Vérifie si l'utilisateur peut accepter/refuser un contrat
bool canWorkerRespondToContract(String status, bool isWorker) {
  return status == 'PENDING' && isWorker;
}

/// Vérifie si l'utilisateur peut envoyer/compléter un contrat
bool canEmployerActOnContract(String status, bool isEmployer) {
  if (!isEmployer) return false;
  return status == 'DRAFT' || status == 'ACCEPTED';
}

/// Formate le montant en devise
String formatCurrency(double amount, {String currency = 'CAD'}) {
  return '\$${amount.toStringAsFixed(2)} $currency';
}

/// Calcule le temps écoulé depuis une date
String timeAgo(DateTime date) {
  final now = DateTime.now();
  final diff = now.difference(date);
  
  if (diff.inMinutes < 1) {
    return 'À l\'instant';
  } else if (diff.inMinutes < 60) {
    return 'Il y a ${diff.inMinutes} min';
  } else if (diff.inHours < 24) {
    return 'Il y a ${diff.inHours}h';
  } else if (diff.inDays < 7) {
    return 'Il y a ${diff.inDays}j';
  } else {
    return formatMessageTime(date);
  }
}

/// Détermine si un message est de l'utilisateur actuel
bool isMyMessage(String senderId, String currentUserId) {
  return senderId == currentUserId;
}

/// Groupe les messages par date pour l'affichage
String getMessageDateSeparator(DateTime date) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final messageDate = DateTime(date.year, date.month, date.day);
  
  if (messageDate == today) {
    return 'Aujourd\'hui';
  } else if (messageDate == today.subtract(const Duration(days: 1))) {
    return 'Hier';
  } else {
    final months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }
}
```

---

# 📋 Étapes d'intégration FlutterFlow

## Messages

1. **Créer les API Calls**
   - `sendMessage` (POST)
   - `getMessagesForMission` (GET)
   - `markMessagesAsRead` (PATCH)
   - `getUnreadMessagesCount` (GET)

2. **Créer la page Chat**
   - ListView pour afficher les messages
   - TextField pour le nouveau message
   - Bouton d'envoi
   - Pull-to-refresh pour recharger

3. **Configurer les actions**
   - On page load: `getMessagesForMission` + `markMessagesAsRead`
   - On send button: `sendMessage` + refresh list
   - Timer optionnel pour polling (toutes les 10s)

## Contracts

1. **Créer les API Calls**
   - `createContract` (POST)
   - `getContractById` (GET)
   - `getMyContracts` (GET)
   - `updateContractStatus` (PATCH)

2. **Créer les pages**
   - Liste des contrats (avec filtres par statut)
   - Détail d'un contrat
   - Formulaire de création (pour employer)

3. **Configurer les actions**
   - Bouton "Envoyer" (DRAFT → PENDING)
   - Bouton "Accepter" (PENDING → ACCEPTED)
   - Bouton "Refuser" (PENDING → REJECTED)
   - Bouton "Terminer" (ACCEPTED → COMPLETED)

---

# ⚠️ Notes importantes

1. **Authentification**: Toujours inclure le token JWT dans les headers
2. **Permissions**: 
   - Messages: Seuls employer et worker de la mission peuvent accéder
   - Contracts: Seuls employer et worker du contrat peuvent accéder
3. **Erreurs courantes**:
   - 401: Token invalide ou expiré
   - 403: Accès non autorisé
   - 404: Ressource non trouvée
   - 400: Données invalides ou transition de statut non autorisée

