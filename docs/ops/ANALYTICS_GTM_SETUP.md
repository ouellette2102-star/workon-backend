# Analytics & Tracking Setup Guide — WorkOn

## Overview
This guide documents the analytics stack for workon.ca (Next.js frontend).

## Stack
- **Vercel Analytics** — Core web vitals, page views (built-in)
- **Vercel Speed Insights** — Performance monitoring
- **GTM** — Tag management (GA4, Meta Pixel, TikTok Pixel)
- **GA4** — Google Analytics 4 (via GTM)
- **Meta Pixel** — Facebook/Instagram conversion tracking (via GTM)

---

## Step 1: Vercel Analytics + Speed Insights (Code Change)

Already done via Next.js config. To verify:
1. Go to Vercel dashboard → Project → Analytics tab
2. Enable if not already enabled
3. The `@vercel/analytics` and `@vercel/speed-insights` packages should be installed

```bash
cd /c/Users/ouell/workonapp
npm install @vercel/analytics @vercel/speed-insights
```

Then add to `src/app/layout.tsx`:
```tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Inside the layout return:
<Analytics />
<SpeedInsights />
```

## Step 2: Google Tag Manager (Manual — Dashboard)

### Create GTM Container
1. Go to https://tagmanager.google.com
2. Create account "WorkOn" → Container "workon.ca" → Web
3. Copy the container ID (GTM-XXXXXXX)

### Add GTM to Next.js
Add to `src/app/layout.tsx` inside `<head>`:
```html
<script dangerouslySetInnerHTML={{
  __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-XXXXXXX');`
}} />
```

Add after `<body>`:
```html
<noscript>
  <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
    height="0" width="0" style="display:none;visibility:hidden" />
</noscript>
```

## Step 3: GA4 via GTM (Manual — Dashboard)

1. Create GA4 property at https://analytics.google.com
2. Get Measurement ID (G-XXXXXXXXXX)
3. In GTM: Tags → New → Google Analytics: GA4 Configuration
4. Set Measurement ID
5. Trigger: All Pages
6. Publish container

## Step 4: Meta Pixel via GTM (Manual — Dashboard)

1. Get Pixel ID from https://business.facebook.com/events_manager
2. In GTM: Tags → New → Custom HTML
3. Paste Meta Pixel base code
4. Trigger: All Pages
5. Add conversion events:
   - PageView (all pages)
   - Lead (signup form)
   - CompleteRegistration (post-signup)
6. Publish container

## Step 5: UTM Attribution (Already in DB)

The backend database already has UTM fields on `local_users`:
- `utmSource`, `utmMedium`, `utmCampaign`
- `gclid`, `fbclid`, `ttclid`

Frontend needs to:
1. Read UTM params from URL on first visit
2. Store in localStorage
3. Pass to signup API call

## Step 6: N8N Stripe → Meta CAPI (Planned)

Workflow: Stripe payment_intent.succeeded → N8N → Meta Conversions API
- Send Purchase event with value and currency
- Enables offline conversion tracking
- Spec to be created when Meta Pixel is active

---

## Current State (2026-03-27)
- [ ] Vercel Analytics: Not yet installed
- [ ] Vercel Speed Insights: Not yet installed
- [ ] GTM container: Not created
- [ ] GA4: Not configured
- [ ] Meta Pixel: Not configured
- [x] robots.txt: Created
- [x] Sitemap: Dynamic generation active
- [x] UTM DB fields: Exist on local_users
- [ ] UTM frontend capture: Not implemented
