# Data Acquisition Engine & Signal Detection System

## Context
WorkOn is global work infrastructure. The Data Engine serves the Quebec MVP now, but is designed to scale signal detection to any market as the platform expands.

## Purpose
Extract, structure, and route intelligence from public web sources. Feed scored signals directly into the Growth Engine, Content Engine, and CEO strategic reviews.

## Engine Architecture
```
Sources → Acquisition → Signal Detection → Scoring → Routing → Action
                                                        │
                                    ┌───────────────────┼───────────────────┐
                                    ↓                   ↓                   ↓
                              Growth Engine       Content Engine         CEO Review
                              (leads, opps)      (briefs, trends)    (strategic intel)
```

---

## Data Sources

### Tier 1 — High Value (Direct lead/revenue impact)
| Source | Signal Type | Method | Frequency |
|--------|-------------|--------|-----------|
| LinkedIn | Hiring, growth, ICP match | Chrome | On-demand |
| Apollo | Contact data, enrichment | API | Per campaign |
| Job Boards (Indeed) | Hiring signals, tech stack | Chrome | Weekly |
| Crunchbase | Funding rounds, growth | Chrome | Weekly |

### Tier 2 — Medium Value (Content and competitive intel)
| Source | Signal Type | Method | Frequency |
|--------|-------------|--------|-----------|
| Reddit | Pain points, trends, content ideas | Chrome | 2x/week |
| Product Hunt | Launches, competitor moves | Chrome | Weekly |
| G2/Capterra | Reviews, competitor ratings | Chrome | Monthly |
| Google Search | SEO signals, content gaps | Web Search | 2x/week |

### Tier 3 — Background (Trend detection)
| Source | Signal Type | Method | Frequency |
|--------|-------------|--------|-----------|
| GitHub Trending | Tech trends, OSS activity | API | Weekly |
| Hacker News | Industry trends | Chrome | Weekly |
| Industry Blogs | Thought leadership, trends | Chrome/WebFetch | Weekly |

---

## Signal Detection System

### Signal Categories

#### 1. Hiring Signals
**What**: Job postings that indicate a company is building capabilities we serve.
**Sources**: Indeed, LinkedIn Jobs, company career pages
**Detection**:
- Job titles matching our ICP roles (e.g., operations manager, field service)
- Tech stack mentions matching our platform capabilities
- Job descriptions mentioning pain points we solve
**Score Boost**: +2 if role matches ICP, +1 if tech stack match, +3 if pain point match
**Route**: `/growth` → Outbound outreach with role-specific messaging

#### 2. Funding Signals
**What**: Companies that received funding and are likely to invest in tools.
**Sources**: Crunchbase, TechCrunch, Web Search
**Detection**:
- Series A-C rounds in target industries
- Funding amount suggests growth stage
- Investor profile suggests scaling phase
**Score Boost**: +3 for Series A-B, +2 for seed, +1 for late stage
**Route**: `/growth` → Time-sensitive outreach (within 2 weeks of announcement)

#### 3. Product Launch Signals
**What**: Competitors or adjacent companies launching products.
**Sources**: Product Hunt, competitor blogs, press releases
**Detection**:
- New product in our category
- Feature overlap with our roadmap
- Pricing changes by competitors
**Score Boost**: +2 for direct competitor, +1 for adjacent
**Route**: `/ceo` → Strategic assessment, `/content` → Counter-positioning content

#### 4. Pain Signals
**What**: Public complaints or discussions about problems we solve.
**Sources**: Reddit, G2/Capterra reviews, Twitter/X, support forums
**Detection**:
- Keywords matching our value proposition
- Negative reviews of competitors
- Community questions about our problem space
**Score Boost**: +3 if specific pain we solve, +1 if general industry pain
**Route**: `/growth` → Direct response outreach, `/content` → Solution content

#### 5. Community Activity Signals
**What**: Rising discussions, trends, or movements in target communities.
**Sources**: Reddit, Hacker News, LinkedIn groups, industry forums
**Detection**:
- Trending posts in target subreddits
- Viral discussions about our problem space
- Industry thought leader posts gaining traction
**Score Boost**: +1 base, +2 if trending, +3 if viral
**Route**: `/content` → Timely content response, `/growth` → Community engagement

### Signal Scoring Engine
```
Signal Score = Relevance (1-5) × Recency (1-3) × Strength (1-3) + Category Boost

Score Ranges:
  50-30: HOT    → Immediate action (outreach within 24h)
  29-15: WARM   → Queue for next batch (outreach within 1 week)
  14-1:  COLD   → Archive, feed into monthly trend analysis

Recency Multiplier:
  3 = Today/Yesterday
  2 = This week
  1 = This month

Strength Multiplier:
  3 = Direct ICP match + pain signal
  2 = Partial match or strong single signal
  1 = Weak or indirect signal
```

### Signal Processing Pipeline
```
1. DETECT — Source monitoring produces raw signals
     ↓
2. CLASSIFY — Categorize by signal type (hiring/funding/launch/pain/community)
     ↓
3. SCORE — Apply scoring engine with category boosts
     ↓
4. DEDUPLICATE — Remove duplicate signals about same entity
     ↓
5. ENRICH — Apollo enrichment for high-score signals (contact data)
     ↓
6. ROUTE — Dispatch to target agent based on score and type
     ↓
7. LOG — Record in signal log for trend analysis
```

---

## Data → Growth Integration Points

### Feed 1: Scored Leads
```
Data Engine → [HOT/WARM leads with contact data]
  ↓
Growth Engine Channel 1 (Apollo Outbound)
  → Personalized outreach based on signal type
  → Hiring signal → "I noticed you're hiring for X..."
  → Funding signal → "Congrats on the round, here's how we help scaling teams..."
  → Pain signal → "I saw your team discussing X, we built a solution for that..."
```

### Feed 2: Market Intelligence
```
Data Engine → [Competitive intel, market trends]
  ↓
CEO → Strategic decisions (pivot, feature, pricing)
Growth Engine → Competitive positioning in outreach
Content Engine → Thought leadership angles
```

### Feed 3: Content Opportunities
```
Data Engine → [Trending topics, pain points, content gaps]
  ↓
Content Engine → Content briefs with data backing
  → SEO articles targeting discovered keywords
  → Social posts responding to trending discussions
  → Email sequences addressing detected pain points
```

### Feed 4: Strategic Signals
```
Data Engine → [Funding rounds, competitor launches, market shifts]
  ↓
CEO → Monthly strategic review input
  → Opportunity evaluation
  → Threat assessment
  → Resource reallocation decisions
```

---

## Acquisition Pipelines

### Pipeline: Lead Intelligence
```
Pipeline: lead-intelligence
Trigger: weekly or manual
Steps:
  1. Define/refresh ICP criteria
  2. Chrome → Scan LinkedIn/Job boards for hiring signals
  3. Web Search → Check for funding announcements
  4. Apollo → Enrich matching companies with contacts
  5. Signal scoring → Classify HOT/WARM/COLD
  6. ROUTE HOT → Growth Engine (immediate outreach)
  7. ROUTE WARM → Growth Engine (next batch)
  8. ROUTE COLD → Archive with trend tag
Output: Scored lead list routed to Growth Engine
Failure: Log failed enrichments, retry next batch
```

### Pipeline: Competitive Intelligence
```
Pipeline: competitive-intel
Trigger: monthly or on competitor event
Steps:
  1. Identify target competitors
  2. Chrome → Monitor pricing pages, changelogs, blog
  3. Web Search → Track press, reviews, social mentions
  4. G2/Capterra → Review sentiment analysis
  5. Synthesize into competitive brief
Output: Competitive brief routed to CEO + Growth
Failure: Flag inaccessible sources, use cached data
```

### Pipeline: Content Intelligence
```
Pipeline: content-intel
Trigger: weekly
Steps:
  1. Web Search → Trending topics in our space
  2. Reddit/HN → Pain points and discussions
  3. Competitor blogs → Content gap analysis
  4. SEO → Keyword opportunities
  5. Synthesize into prioritized content brief queue
Output: Content briefs routed to Content Engine
Failure: Use previous week's briefs as fallback
```

### Pipeline: Market Research
```
Pipeline: market-research
Trigger: manual (on strategic question from CEO)
Steps:
  1. Define research question and scope
  2. Web Search → Gather 10-20 relevant sources
  3. Chrome → Deep-read key sources, extract data points
  4. Structure findings into research brief
  5. Identify actionable insights
Output: Research document routed to CEO
Failure: Expand search scope, try alternative sources
```

---

## Data Quality Standards
- Every data point has a source URL and timestamp
- Deduplication before routing
- Confidence score on enriched data
- Contact data refreshed every 90 days
- Signal log maintained for trend analysis
