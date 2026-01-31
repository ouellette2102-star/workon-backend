# E2E FLOW MATRIX — WorkOn v1.0

> **Date**: 2026-01-31  
> **Status**: Store-Ready Validation  
> **Scope**: All user flows (Worker + Employer)

---

## 📊 EXECUTIVE SUMMARY

| Role | Total Flows | Passing | Blocked | Coverage |
|------|-------------|---------|---------|----------|
| Worker | 9 | 9 | 0 | ✅ 100% |
| Employer | 10 | 10 | 0 | ✅ 100% |
| **TOTAL** | **19** | **19** | **0** | **✅ 100%** |

---

## 👷 WORKER FLOW (9 Steps)

### W1: Registration
| Step | Action | Frontend | Backend | Status |
|------|--------|----------|---------|--------|
| 1.1 | Open app | `AuthGate` | - | ✅ |
| 1.2 | Navigate to signup | `SignUpWidget` | - | ✅ |
| 1.3 | Enter email/password | Form validation | - | ✅ |
| 1.4 | Submit registration | `AuthService.register()` | `POST /api/v1/auth/register` | ✅ |
| 1.5 | Receive tokens | `TokenStorage.save()` | JWT + Refresh | ✅ |
| 1.6 | Navigate to home | `context.go('/')` | - | ✅ |

**Endpoints**: `POST /api/v1/auth/register`  
**Guards**: None (public)  
**Status**: ✅ PASS

---

### W2: Login
| Step | Action | Frontend | Backend | Status |
|------|--------|----------|---------|--------|
| 2.1 | Open login | `SignInWidget` | - | ✅ |
| 2.2 | Enter credentials | Form validation | - | ✅ |
| 2.3 | Submit login | `AuthService.login()` | `POST /api/v1/auth/login` | ✅ |
| 2.4 | Receive tokens | `TokenStorage.save()` | JWT + Refresh | ✅ |
| 2.5 | Navigate to home | `context.go('/')` | - | ✅ |

**Endpoints**: `POST /api/v1/auth/login`  
**Guards**: None (public)  
**Status**: ✅ PASS

---

### W3: Accept Terms (Legal Consent)
| Step | Action | Frontend | Backend | Status |
|------|--------|----------|---------|--------|
| 3.1 | Display consent gate | `LegalConsentGate` | - | ✅ |
| 3.2 | Show Terms | `TermsScreen` | - | ✅ |
| 3.3 | Accept Terms | `ComplianceApi.accept()` | `POST /api/v1/compliance/accept` | ✅ |
| 3.4 | Show Privacy | `PrivacyScreen` | - | ✅ |
| 3.5 | Accept Privacy | `ComplianceApi.accept()` | `POST /api/v1/compliance/accept` | ✅ |
| 3.6 | Unlock app | `LegalConsentGate` passes | - | ✅ |

**Endpoints**: `POST /api/v1/compliance/accept`, `GET /api/v1/compliance/status`  
**Guards**: `JwtAuthGuard`  
**Status**: ✅ PASS

---

### W4: Browse Missions (Discovery)
| Step | Action | Frontend | Backend | Status |
|------|--------|----------|---------|--------|
| 4.1 | Open discovery | `SwipeDiscoveryPage` | - | ✅ |
| 4.2 | Get location | `LocationService` | - | ✅ |
| 4.3 | Fetch nearby | `MissionsApi.fetchNearby()` | `GET /api/v1/missions-local/nearby` | ✅ |
| 4.4 | Display cards | `MissionCard` | - | ✅ |
| 4.5 | Swipe/browse | Gesture handlers | - | ✅ |

**Endpoints**: `GET /api/v1/missions-local/nearby`  
**Guards**: `JwtAuthGuard`  
**Status**: ✅ PASS

---

### W5: Filter & Search
| Step | Action | Frontend | Backend | Status |
|------|--------|----------|---------|--------|
| 5.1 | Open filters | `FilterChips` | - | ✅ |
| 5.2 | Select category | Category chip | - | ✅ |
| 5.3 | Apply filter | `DiscoveryService.loadNearby(category)` | `GET /api/v1/missions-local/nearby?category=X` | ✅ |
| 5.4 | Sort results | Sort selector | `?sort=proximity|date|price` | ✅ |
| 5.5 | Search text | Search field | `?query=X` | ✅ |

**Endpoints**: `GET /api/v1/missions-local/nearby` with query params  
**Guards**: `JwtAuthGuard`  
**Status**: ✅ PASS

---

### W6: Apply to Mission
| Step | Action | Frontend | Backend | Status |
|------|--------|----------|---------|--------|
| 6.1 | View mission detail | `MissionDetailWidget` | `GET /api/v1/missions-local/:id` | ✅ |
| 6.2 | Tap "Apply" | Apply button | - | ✅ |
| 6.3 | Enter offer | Offer form | - | ✅ |
| 6.4 | Submit offer | `OffersApi.create()` | `POST /api/v1/offers` | ✅ |
| 6.5 | Confirmation | Success toast | - | ✅ |

**Endpoints**: `POST /api/v1/offers`  
**Guards**: `JwtAuthGuard`, `ConsentGuard`  
**Status**: ✅ PASS

---

### W7: Accept Mission (When Selected)
| Step | Action | Frontend | Backend | Status |
|------|--------|----------|---------|--------|
| 7.1 | Receive notification | Push notification | - | ✅ |
| 7.2 | View offer status | `MyOffersWidget` | `GET /api/v1/offers/worker/me` | ✅ |
| 7.3 | See "Accepted" | Status badge | - | ✅ |
| 7.4 | Mission assigned | Mission appears in "My Missions" | - | ✅ |

**Endpoints**: `GET /api/v1/offers/worker/me`  
**Guards**: `JwtAuthGuard`  
**Status**: ✅ PASS

---

### W8: Complete Mission
| Step | Action | Frontend | Backend | Status |
|------|--------|----------|---------|--------|
| 8.1 | Open assigned mission | `MissionDetailWidget` | - | ✅ |
| 8.2 | Start work | "Start" button | `POST /api/v1/missions-local/:id/start` | ✅ |
| 8.3 | Complete work | "Complete" button | `POST /api/v1/missions-local/:id/complete` | ✅ |
| 8.4 | Await employer confirmation | Status: "Pending Completion" | - | ✅ |

**Endpoints**: `POST /api/v1/missions-local/:id/start`, `POST /api/v1/missions-local/:id/complete`  
**Guards**: `JwtAuthGuard`  
**Status**: ✅ PASS

---

### W9: Leave Review
| Step | Action | Frontend | Backend | Status |
|------|--------|----------|---------|--------|
| 9.1 | Mission completed | Status: "Completed" | - | ✅ |
| 9.2 | Prompt for review | Review dialog | - | ✅ |
| 9.3 | Enter rating | Star selector | - | ✅ |
| 9.4 | Enter comment | Text field | - | ✅ |
| 9.5 | Submit review | `RatingsApi.create()` | `POST /api/v1/reviews` | ✅ |

**Endpoints**: `POST /api/v1/reviews`  
**Guards**: `JwtAuthGuard`  
**Status**: ✅ PASS

---

## 👔 EMPLOYER FLOW (10 Steps)

### E1: Registration
Same as W1.  
**Status**: ✅ PASS

---

### E2: Login
Same as W2.  
**Status**: ✅ PASS

---

### E3: Accept Terms
Same as W3.  
**Status**: ✅ PASS

---

### E4: Create Mission
| Step | Action | Frontend | Backend | Status |
|------|--------|----------|---------|--------|
| 4.1 | Open create form | `CreateMissionWidget` | - | ✅ |
| 4.2 | Fetch categories | `CatalogService.fetchCategories()` | `GET /api/v1/catalog/categories` | ✅ |
| 4.3 | Fill form | Form fields | - | ✅ |
| 4.4 | Select category | Dropdown (dynamic) | - | ✅ |
| 4.5 | Set location | Map picker | - | ✅ |
| 4.6 | Submit mission | `MissionsApi.create()` | `POST /api/v1/missions-local` | ✅ |

**Endpoints**: `GET /api/v1/catalog/categories`, `POST /api/v1/missions-local`  
**Guards**: `JwtAuthGuard`  
**Status**: ✅ PASS

---

### E5: View Offers
| Step | Action | Frontend | Backend | Status |
|------|--------|----------|---------|--------|
| 5.1 | Open my missions | `MyMissionsWidget` | `GET /api/v1/missions-local/employer/me` | ✅ |
| 5.2 | Select mission | Mission card | - | ✅ |
| 5.3 | View offers | `OffersListWidget` | `GET /api/v1/offers/mission/:id` | ✅ |
| 5.4 | See worker profiles | Worker cards | - | ✅ |

**Endpoints**: `GET /api/v1/missions-local/employer/me`, `GET /api/v1/offers/mission/:id`  
**Guards**: `JwtAuthGuard`  
**Status**: ✅ PASS

---

### E6: Accept Worker
| Step | Action | Frontend | Backend | Status |
|------|--------|----------|---------|--------|
| 6.1 | Review offer | Offer detail | - | ✅ |
| 6.2 | Accept offer | "Accept" button | `PATCH /api/v1/offers/:id/accept` | ✅ |
| 6.3 | Mission assigned | Status: "Assigned" | - | ✅ |
| 6.4 | Worker notified | Push notification | - | ✅ |

**Endpoints**: `PATCH /api/v1/offers/:id/accept`  
**Guards**: `JwtAuthGuard`, `ConsentGuard`  
**Status**: ✅ PASS

---

### E7: Pay Worker (Stripe)
| Step | Action | Frontend | Backend | Status |
|------|--------|----------|---------|--------|
| 7.1 | Mission completed by worker | Status: "Pending Completion" | - | ✅ |
| 7.2 | Open payment | Payment button | - | ✅ |
| 7.3 | Stripe checkout | `PaymentsApi.createCheckout()` | `POST /api/v1/payments-local/checkout` | ✅ |
| 7.4 | Complete payment | Stripe UI | Webhook: `payment_intent.succeeded` | ✅ |
| 7.5 | Payment confirmed | Status updated | - | ✅ |

**Endpoints**: `POST /api/v1/payments-local/checkout`, Stripe webhooks  
**Guards**: `JwtAuthGuard`  
**Status**: ✅ PASS

---

### E8: Chat with Worker
| Step | Action | Frontend | Backend | Status |
|------|--------|----------|---------|--------|
| 8.1 | Open chat | `MessagesWidget` | - | ✅ |
| 8.2 | Load messages | `MessagesApi.getMessages()` | `GET /api/v1/messages-local/thread/:id` | ✅ |
| 8.3 | Send message | Send button | `POST /api/v1/messages-local` | ✅ |
| 8.4 | Receive messages | Polling/refresh | - | ✅ |

**Endpoints**: `GET /api/v1/messages-local/thread/:id`, `POST /api/v1/messages-local`  
**Guards**: `JwtAuthGuard`  
**Status**: ✅ PASS (PR-B2 merged)

---

### E9: Confirm Completion
| Step | Action | Frontend | Backend | Status |
|------|--------|----------|---------|--------|
| 9.1 | Worker marks complete | Status: "Pending Completion" | - | ✅ |
| 9.2 | Review work | Mission detail | - | ✅ |
| 9.3 | Confirm completion | "Confirm" button | `POST /api/v1/missions-local/:id/confirm` | ✅ |
| 9.4 | Mission closed | Status: "Completed" | - | ✅ |

**Endpoints**: `POST /api/v1/missions-local/:id/confirm`  
**Guards**: `JwtAuthGuard`  
**Status**: ✅ PASS

---

### E10: Leave Review
Same as W9.  
**Status**: ✅ PASS

---

## 🔐 GUARDS MATRIX

| Guard | Purpose | Modules Using |
|-------|---------|---------------|
| `JwtAuthGuard` | JWT token validation | All protected endpoints |
| `ConsentGuard` | Legal consent check | Offers, Contracts |
| `RolesGuard` | Role-based access | Admin endpoints |
| `AdminSecretGuard` | CI/CD automation | Admin seed endpoint |

---

## 📡 API ENDPOINTS COVERAGE

### Auth (Public)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/v1/auth/register` | POST | ✅ |
| `/api/v1/auth/login` | POST | ✅ |
| `/api/v1/auth/refresh` | POST | ✅ |
| `/api/v1/auth/logout` | POST | ✅ |

### Missions
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/v1/missions-local` | POST | ✅ |
| `/api/v1/missions-local/nearby` | GET | ✅ |
| `/api/v1/missions-local/:id` | GET | ✅ |
| `/api/v1/missions-local/:id/start` | POST | ✅ |
| `/api/v1/missions-local/:id/complete` | POST | ✅ |
| `/api/v1/missions-local/:id/confirm` | POST | ✅ |
| `/api/v1/missions-local/employer/me` | GET | ✅ |
| `/api/v1/missions-local/worker/me` | GET | ✅ |

### Offers
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/v1/offers` | POST | ✅ |
| `/api/v1/offers/mission/:id` | GET | ✅ |
| `/api/v1/offers/worker/me` | GET | ✅ |
| `/api/v1/offers/:id/accept` | PATCH | ✅ |
| `/api/v1/offers/:id/decline` | PATCH | ✅ |

### Messages
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/v1/messages-local/conversations` | GET | ✅ |
| `/api/v1/messages-local/thread/:id` | GET | ✅ |
| `/api/v1/messages-local` | POST | ✅ |
| `/api/v1/messages-local/read/:id` | PATCH | ✅ |
| `/api/v1/messages-local/unread-count` | GET | ✅ |

### Payments
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/v1/payments-local/checkout` | POST | ✅ |
| `/api/v1/payments-local/webhook` | POST | ✅ |

### Reviews
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/v1/reviews` | POST | ✅ |
| `/api/v1/reviews/mission/:id` | GET | ✅ |
| `/api/v1/reviews/user/:id` | GET | ✅ |

### Catalog
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/v1/catalog/categories` | GET | ✅ |
| `/api/v1/catalog/skills` | GET | ✅ |

### Compliance
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/v1/compliance/accept` | POST | ✅ |
| `/api/v1/compliance/status` | GET | ✅ |

---

## ✅ FINAL VERDICT

```
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║   E2E FLOW MATRIX: ✅ ALL FLOWS PASSING                               ║
║                                                                       ║
║   Worker Flows:   9/9  (100%)                                         ║
║   Employer Flows: 10/10 (100%)                                        ║
║   API Coverage:   100%                                                ║
║                                                                       ║
║   READY FOR STORE SUBMISSION                                          ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

*Document generated: 2026-01-31*  
*Version: 1.0*
