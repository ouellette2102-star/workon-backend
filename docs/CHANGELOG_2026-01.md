# WorkOn Backend - Changelog January 2026

## 🚀 Production Fixes & Improvements

### PR-1: Reviews API Route Fix (2026-01-30)
**Issue:** Reviews endpoints were unreachable due to incorrect route prefix.

**Before:**
```typescript
@Controller('reviews')  // → /reviews (404 from frontend)
```

**After:**
```typescript
@Controller('api/v1/reviews')  // → /api/v1/reviews ✅
```

**Impact:** Unblocks worker/employer review flow after mission completion.

---

### PR-3: Missions Sort/Filter Support (2026-01-30)
**Issue:** Flutter app couldn't pass sort/filter params to backend (400 Bad Request).

**Added parameters to `NearbyMissionsQueryDto`:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `sort` | `proximity` \| `date` \| `price` | Sort order (default: proximity) |
| `category` | `string` | Filter by category name |
| `query` | `string` | Search in title/description |

**Example:**
```
GET /api/v1/missions-local/nearby?latitude=45.5&longitude=-73.6&sort=date&category=Entretien
```

---

### PR-4: Profile Endpoint Alias (2026-01-30)
**Issue:** Flutter called `/api/v1/profile` but endpoint was `/api/v1/profile/me`.

**Added alias:**
```typescript
GET /api/v1/profile      // NEW - alias for /me
GET /api/v1/profile/me   // existing
```

**Impact:** Improves frontend compatibility.

---

## 📊 Test Coverage

| Metric | Value |
|--------|-------|
| Unit Tests | 530 ✅ |
| Test Suites | 34 ✅ |
| Build | Passing ✅ |
| Lint | 0 errors (249 warnings) |

---

## 🔧 Production Endpoints Status

| Endpoint | Status | Auth |
|----------|--------|------|
| `/healthz` | ✅ 200 | Public |
| `/api/v1/auth/login` | ✅ 200 | Public |
| `/api/v1/auth/register` | ✅ 201 | Public |
| `/api/v1/catalog/categories` | ✅ 200 | Public |
| `/api/v1/catalog/skills` | ✅ 200 | Public |
| `/api/v1/profile` | ✅ 401 | JWT |
| `/api/v1/missions-local/nearby` | ✅ 401 | JWT |
| `/api/v1/reviews` | ✅ 401 | JWT |
| `/api/v1/contracts` | ✅ 401 | JWT + Consent |

---

## 🎯 Next Steps (Recommended)

1. **Stripe Production Keys** - Configure live keys when ready for payments
2. **Flutter Categories** - Update app to use `/api/v1/catalog/categories` API
3. **E2E Testing** - Run full worker + employer flow test
