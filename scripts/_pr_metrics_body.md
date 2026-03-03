## Summary
Adds a new public endpoint `GET /api/v1/metrics/home-stats` for the landing page.

## Changes
- `src/metrics/metrics.service.ts` — `getHomeStats()` method (completedContracts, activeWorkers, openServiceCalls)
- `src/metrics/metrics.controller.ts` — `GET /api/v1/metrics/home-stats` endpoint (public, no auth)
- `src/metrics/dto/home-stats-response.dto.ts` — `HomeStatsResponseDto` with Swagger decorators
- `src/metrics/metrics.service.spec.ts` — unit tests for getHomeStats
- `src/metrics/metrics.controller.spec.ts` — unit tests for controller

## Endpoint
```
GET /api/v1/metrics/home-stats
Response 200:
{
  "completedContracts": 182,
  "activeWorkers": 2453,
  "openServiceCalls": 24
}
```
Public — no JWT required.

## Checklist
- `npm run build` passes (0 errors)
- 13/13 metrics tests pass
- 1100/1100 total unit tests pass
- Swagger documented with ApiResponse and DTO
- No breaking changes to existing endpoints
