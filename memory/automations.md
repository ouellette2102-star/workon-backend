# Automation Pipeline Registry — AI Company OS v3.0

## Scheduled Tasks (Active)

| Task ID | Schedule | Description | Agent | Status |
|---------|----------|-------------|-------|--------|
| daily-standup | 8:57 AM weekdays | Git activity + task synthesis | /chief | Active (last run: 2026-03-25) |
| weekly-review | Monday 9:03 AM | Strategic review + priority reset | /ceo + /chief | Active |
| inbox-triage | Every 3h (:17) | Email scan and categorization | /chief | Active (last run: 2026-03-25) |
| weekly-revenue-scan | Friday 9:23 AM | Stripe revenue scan + metrics update | /data | Active (created: 2026-03-27) |
| monthly-ceo-review | 1st Monday 9:13 AM | Full business health assessment + OKR review | /ceo | Active (created: 2026-03-27, next: Apr 6) |

---

## Execution Loops

### Daily Loop (Automated + Manual)
```
09:05 — daily-standup (automated /chief)
  → Git commits, PR status, task progress
Continuous — Task execution on P0/P1
  → Active agent works on highest priority
Every 3h — inbox-triage (automated /chief)
  → Categorize: Urgent / Action / Info / Spam
EOD — Progress checkpoint (/chief manual)
  → Update TASKS.md, flag blockers
```

### Weekly Loop (Monday)
```
09:13 — weekly-review (automated /ceo + /chief)
  → Strategic review, priority reset, growth analysis
Monday — Signal detection batch (/data manual)
  → Run lead-intelligence pipeline
Monday — Content calendar update (/content manual)
  → Review content briefs from Data Engine
Monday — Sprint planning (/chief manual)
  → Set week's P0/P1 items in TASKS.md
Friday — Pipeline health check (/architect manual)
  → Review all pipeline statuses below
```

### Monthly Loop (First Monday)
```
CEO Strategic Review (/ceo)
  → Full business health assessment
  → Revenue trend analysis (Stripe)
  → OKR progress review
Competitive Landscape Update (/data)
  → Run competitive-intel pipeline
System Optimization (/architect)
  → Review automation efficiency
  → Identify new automation opportunities
Pipeline Expansion (/architect + /ceo)
  → Evaluate new pipeline candidates
  → Approve and build approved pipelines
Agent Performance Audit (/ceo)
  → Review each agent's output quality
  → Adjust delegation patterns
```

---

## Standardized Pipelines

### Pipeline 1: Product Development
```
Pipeline: product-development
Trigger: New feature request or sprint start
Orchestrator: /ceo (prioritization) → /cto (execution)

Steps:
  1. /ceo → Evaluate strategic fit, approve initiative
  2. /chief → Prioritize feature in TASKS.md
  3. /cto → Design technical approach (ADR)
  4. /cto → Implement minimal change
  5. Validate → npm run test + npm run lint
  6. GitHub → Create PR targeting main
  7. /cto → Code review
  8. Merge → Railway auto-deploy
  9. /chief → Update TASKS.md, notify stakeholders

Output: Deployed feature
Failure Recovery: Revert PR, rollback Railway deploy, create incident doc
Notify: Update memory/projects.md
```

### Pipeline 2: Marketing Campaign Launch
```
Pipeline: campaign-launch
Trigger: CEO strategic decision or growth opportunity
Orchestrator: /ceo (approval) → /growth (execution)

Steps:
  1. /ceo → Approve campaign objective and budget
  2. /growth → Define ICP and channel strategy
  3. /data → Research target companies, detect signals
  4. /data → Score and segment leads (HOT/WARM/COLD)
  5. /content → Create campaign messaging and content
  6. Apollo → Enrich HOT leads with contact data
  7. /content → Create signal-personalized email sequences
  8. Gmail → Load outreach sequences
  9. Canva → Generate visual assets for social
  10. /chief → Track campaign KPIs
  11. /ceo → Weekly review of campaign performance

Output: Active multi-channel campaign powered by signals
Failure Recovery: Pause sequences, review messaging, adjust targeting
Notify: Update memory/growth-engine.md with results
```

### Pipeline 3: Content Production
```
Pipeline: content-production
Trigger: Weekly content calendar
Orchestrator: /content (execution), /data (input)

Steps:
  1. /data → Content intelligence (trending topics, gaps, pain signals)
  2. /content → Create content brief from data briefs
  3. /content → Draft article/post
  4. /content → Optimize for SEO and channel
  5. Canva → Generate supporting visual
  6. Publish → Blog / Social / Email
  7. /growth → Distribute across channels
  8. /data → Track performance, feed next cycle

Output: Published content piece
Failure Recovery: Use backup topic from content queue
Notify: Update content calendar in Notion
```

### Pipeline 4: Signal-Powered Lead Generation
```
Pipeline: signal-lead-generation
Trigger: Weekly (/data batch run)
Orchestrator: /data (detection) → /growth (activation)

Steps:
  1. /data → Detect signals (hiring, funding, pain, community)
  2. /data → Score signals using scoring engine
  3. /data → Deduplicate and classify HOT/WARM/COLD
  4. Apollo → Enrich HOT/WARM with contact data
  5. /data → ROUTE HOT → /growth for immediate outreach
  6. /data → ROUTE WARM → /growth for next batch
  7. /growth → Launch signal-personalized sequences
  8. /chief → Track pipeline metrics
  9. /ceo → Monthly review of lead pipeline health

Output: Signal-scored leads with active outreach
Failure Recovery: Expand ICP criteria, try alternative sources
Notify: Update lead pipeline metrics
```

### Pipeline 5: Weekly Strategic Review
```
Pipeline: weekly-strategic-review
Trigger: Monday 9:13 AM (scheduled)
Orchestrator: /ceo + /chief

Steps:
  1. GitHub → Review week's commits, merged PRs, open issues
  2. TASKS.md → Assess completion rate
  3. Stripe → Pull revenue metrics (MRR, churn, new customers)
  4. Gmail → Review important threads
  5. Calendar → Check upcoming week
  6. /data → Signal detection summary
  7. /growth → Channel performance summary
  8. /chief → Synthesize into weekly review
  9. /ceo → Strategic assessment and priority reset
  10. Update TASKS.md with new priorities

Output: Weekly review report with CEO strategic direction
Failure Recovery: Partial review with available data
Notify: Present to user
```

### Pipeline 6: Automation Deployment
```
Pipeline: automation-deploy
Trigger: Manual (/ceo or /architect identifies opportunity)
Orchestrator: /architect

Steps:
  1. /architect → Identify process to automate
  2. /architect → Map workflow (inputs, steps, outputs, failures)
  3. /ceo → Approve automation scope and ROI
  4. /architect → Select connectors and design flow
  5. Implement → Scheduled task or direct execution
  6. Test → Run pipeline end-to-end
  7. Validate → Check outputs and error handling
  8. Register → Add to this file (automations.md)
  9. Monitor → Add to weekly review checklist

Output: Registered and active automation
Failure Recovery: Disable automation, debug, fix, re-enable
Notify: Update memory/automations.md
```

### Pipeline 7: CEO Monthly Review
```
Pipeline: ceo-monthly-review
Trigger: First Monday of month
Orchestrator: /ceo

Steps:
  1. Stripe → Revenue analysis (MRR, churn, growth rate, LTV)
  2. /growth → Channel performance summary (all 9 channels)
  3. /data → Competitive landscape update
  4. /data → Market trend summary
  5. /chief → Execution velocity metrics
  6. /cto → Engineering health (tech debt, test coverage, deploy freq)
  7. /ceo → Synthesize into monthly strategic assessment
  8. /ceo → Update OKRs and initiative priorities
  9. /ceo → Identify pipeline expansion opportunities
  10. Log decisions in memory/decisions.md

Output: Monthly strategic review with updated OKRs
Failure Recovery: Partial review, flag missing data
Notify: Present to user, update memory/roadmap.md
```

---

## Agent Collaboration Matrix

| From Agent | To Agent | Data Flow | Trigger |
|------------|----------|-----------|---------|
| /data | /growth | Scored leads + signal context | Weekly batch |
| /data | /content | Content briefs + trending topics | Weekly batch |
| /data | /ceo | Competitive intel + market trends | Monthly review |
| /content | /growth | Campaign assets + email copy | Per campaign |
| /growth | /chief | Campaign KPIs + pipeline metrics | Weekly review |
| /growth | /architect | Automation requests for scaling | On scaling need |
| /cto | /architect | CI/CD requirements | Per feature cycle |
| /chief | /ceo | Execution reports + blockers | Daily/Weekly |
| /ceo | ALL | Strategic priorities + resource allocation | Weekly/Monthly |

---

## Pipeline Health Monitor
| Pipeline | Last Run | Status | Owner | Issues |
|----------|----------|--------|-------|--------|
| product-development | 2026-03-27 | Active | /cto | GHL endpoints shipped, tests fixed |
| campaign-launch | 2026-03-27 | Activated | /growth | Campaign plans created |
| content-production | 2026-03-27 | Activated | /content | 3 SEO articles + brand voice + calendar |
| signal-lead-generation | 2026-03-27 | Activated | /data → /growth | Lead scoring model created |
| weekly-strategic-review | Active | Healthy | /ceo + /chief | Running on schedule |
| automation-deploy | 2026-03-27 | Active | /architect | 2 new scheduled tasks deployed |
| ceo-monthly-review | — | Scheduled | /ceo | First review April 6 |
| weekly-revenue-scan | — | Scheduled | /data | First scan April 4 |
