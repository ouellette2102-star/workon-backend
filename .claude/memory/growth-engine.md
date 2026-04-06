# Multi-Channel Growth Engine — Architecture

## Context
WorkOn is global work infrastructure — a universal work layer connecting demand signals with human capability. Current phase: Quebec MVP proving unit economics before scaling Canada → Global.

## Purpose
Systematic acquisition of workers (supply) and clients (demand) across multiple channels, powered by signals from the Data Engine and content from the Content Engine. Phase 1 focus: build supply density in Montreal, then activate demand.

## Growth Flywheel
```
Discovery → Engagement → Conversion → Retention → Advocacy
    ↑                                                 ↓
    ←←←←←←←←←←← Referral Loop ←←←←←←←←←←←←←←←←←←←←
```

## Data Engine Integration
The Growth Engine receives 3 feeds from the Data Engine:

### Feed 1: Scored Leads (weekly)
```
Data Engine → HOT leads (score 30+) → Immediate personalized outreach
Data Engine → WARM leads (score 15-29) → Next batch outreach
Data Engine → Signal context → Personalization layer
```

### Feed 2: Content Opportunities (weekly)
```
Data Engine → Trending topics → Content Engine → Growth distribution
Data Engine → Pain points → Content Engine → Solution articles
Data Engine → SEO gaps → Content Engine → Keyword-targeted content
```

### Feed 3: Strategic Intelligence (monthly)
```
Data Engine → Competitive moves → Adjust positioning
Data Engine → Market trends → Adjust channel strategy
Data Engine → Funding signals → Time-sensitive outreach
```

---

## Channel Architecture

### Channel 1: Apollo Outbound (Signal-Powered)
```
Data Engine signals → ICP match + signal context
    ↓
Apollo Search → Enrichment → Scoring
    ↓
Signal-personalized outreach:
  Hiring signal → "I noticed you're building out your X team..."
  Funding signal → "Congrats on the round — here's how we help scaling teams..."
  Pain signal → "Your team mentioned struggling with X — we built a fix..."
    ↓
Gmail Outreach (Day 0) → Follow-up #1 (Day 3) → Follow-up #2 (Day 7) → Break-up (Day 14)
    ↓
Response → Meeting → Demo → Stripe Conversion
No Response → Re-engagement (Day 30) → Archive (Day 60)
```
**Tools**: Apollo, Gmail, Data Engine signals
**KPIs**: Leads/week, response rate, meetings booked, conversion rate

### Channel 2: Cold Email
```
Lead List (from Data Engine or Apollo)
    ↓
Personalization Layer (signal context + company research)
    ↓
Sequence: 5-touch over 14 days
    ↓
Positive Reply → Meeting → Conversion
Negative Reply → Remove from sequence
No Reply → Nurture list
```
**Tools**: Gmail
**KPIs**: Open rate, reply rate, positive reply rate, meetings/week

### Channel 3: SEO Content (Data-Driven)
```
Data Engine → Keyword opportunities + content gaps
    ↓
Content Engine → Draft article with SEO optimization
    ↓
Publish → Internal linking → Social amplification
    ↓
Track rankings → Optimize underperformers
```
**Tools**: Web Search, Chrome, Content Engine, Data Engine
**KPIs**: Organic traffic, keyword rankings, leads from organic

### Channel 4: LinkedIn
```
Content Strategy: 3 posts/week (thought leadership + product)
    ↓
Connection Strategy: ICP-targeted outreach
    ↓
Engagement Loop: Comment on ICP content → DM warm leads
    ↓
Convert to email/meeting
```
**Tools**: Chrome, Content Engine
**KPIs**: Impressions, connections, DM response rate, leads

### Channel 5: Reddit
```
Data Engine → Pain signal subreddits
    ↓
Monitor discussions → Provide genuine value
    ↓
Build credibility → Soft product mentions when relevant
    ↓
Track referral traffic
```
**Tools**: Chrome, Web Search, Data Engine
**KPIs**: Upvotes, referral traffic, brand mentions

### Channel 6: Email Newsletter
```
Subscriber acquisition (blog CTAs, social, outreach)
    ↓
Weekly digest: Industry insights + product updates
    ↓
Segment: Active / Passive / Dormant
    ↓
Active → Product offers | Passive → Re-engage | Dormant → Win-back
```
**Tools**: Gmail, Content Engine
**KPIs**: Subscribers, open rate, click rate, conversions

### Channel 7: Job Board Mining (Data-Powered)
```
Data Engine → Hiring signals from Indeed/LinkedIn
    ↓
Extract company → Apollo enrichment
    ↓
Route to Channel 1 with hiring-signal personalization
```
**Tools**: Chrome, Apollo, Data Engine
**KPIs**: Companies identified, leads enriched, conversion rate

### Channel 8: Social Media (Instagram/Facebook)
```
Content Calendar: 3-5 posts/week
    ↓
Canva → Visual assets | Content Engine → Captions
    ↓
Engage with comments → DM interested followers
```
**Tools**: Canva, Content Engine
**KPIs**: Followers, engagement rate, DM conversations

### Channel 9: YouTube
```
Content Engine → Scripts | Canva → Thumbnails
    ↓
SEO: Title, description, tags optimization
    ↓
Cross-promote on social + email
```
**Tools**: Content Engine, Canva
**KPIs**: Views, subscribers, watch time, referral traffic

---

## Retargeting Strategy
```
Visited site but didn't convert
  ↓
Segment by behavior (pricing page, blog, features)
  ↓
Custom content per segment
  ↓
Email nurture (if captured) OR Social retargeting
  ↓
Re-offer with incentive or case study
```

## Analytics Feedback Loop
```
Weekly: Channel performance → /growth reviews
  ↓
Top performer → Double down
Underperformer → Diagnose → Fix or cut
  ↓
Monthly: Full funnel analysis → /ceo reviews
  ↓
CAC by channel, LTV, payback period
  ↓
Quarterly: Strategy review → Reallocate resources
```

## Revenue Tracking
- **Stripe**: `list_customers`, `list_subscriptions`, `list_invoices`
- Track MRR, churn, expansion revenue, net revenue retention
- Correlate acquisition channel → customer LTV
- Feed revenue data to `/ceo` monthly review
