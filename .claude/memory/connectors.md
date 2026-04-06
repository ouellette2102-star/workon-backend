# Connector Strategy Map v2.0

## Connector Architecture

### GitHub — Engineering Infrastructure (Layer 2)
- **Status**: Connected
- **Repo**: ouellette2102-star/workon-backend
- **Operations**:
  - PR creation, review, and merge management
  - Issue tracking for bugs and features
  - Branch strategy: feature branches → main
  - Release management and tagging
  - Code review automation
- **Workflows**:
  - Feature dev: branch → implement → test → PR → review → merge → deploy
  - Hotfix: branch from main → fix → test → PR → expedited review → merge
  - Release: tag main → Railway auto-deploy

### Notion — Knowledge Base (Layer 5)
- **Status**: Connected
- **Operations**:
  - Project documentation and wikis
  - Sprint boards and task databases
  - Strategic planning docs
  - Meeting notes and decisions
  - Content calendar management
- **Workflows**:
  - Search workspace → Find relevant docs
  - Create pages for new initiatives
  - Update databases for project tracking
  - Store research outputs and competitive intel

### Google Drive — File Storage (Layer 5)
- **Status**: Connected
- **Operations**:
  - Document storage and retrieval
  - Research report archives
  - Asset management (images, presentations)
  - Shared document collaboration
- **Workflows**:
  - Search by content or metadata
  - Fetch document contents for analysis
  - Store generated reports and datasets

### Gmail — Communication Hub (Layer 4)
- **Status**: Connected
- **Operations**:
  - Cold outreach sequences
  - Follow-up cadences
  - Newsletter distribution
  - Stakeholder communication
  - Inbox triage and categorization
- **Workflows**:
  - Search → Read → Draft → (user approval) → Send
  - Outreach: Create personalized drafts per lead segment
  - Triage: Scan inbox → Categorize → Flag urgent → Draft responses
  - Newsletter: Draft digest → Review → Send to subscriber list

### Google Calendar — Scheduling (Layer 5)
- **Status**: Connected
- **Operations**:
  - Sprint ceremonies (planning, review, retro)
  - Strategic review meetings
  - Deadline tracking
  - Availability management
- **Workflows**:
  - List events for planning context
  - Create events for sprints and milestones
  - Find free time for scheduling
  - Check upcoming deadlines

### Figma — Design System (Layer 2)
- **Status**: Connected
- **Operations**:
  - UI/UX design review
  - Component library management
  - Design-to-code handoff
  - Design system documentation
- **Workflows**:
  - Get design context for implementation
  - Screenshot designs for reference
  - Review component specs and variables
  - Generate code from design nodes

### Canva — Marketing Content (Layer 4)
- **Status**: Connected
- **Operations**:
  - Social media graphics
  - Marketing presentations and pitch decks
  - Infographics and data visualizations
  - Email headers and banners
  - YouTube thumbnails
- **Workflows**:
  - Generate design from brief → Review candidates → Create final
  - Edit existing designs → Commit changes
  - Export designs for distribution (PDF, PNG, PPTX)
  - Search existing designs for reuse

### Stripe — Payments & Revenue (Layer 4)
- **Status**: Connected
- **Account**: WorkOn Stripe Connect
- **Operations**:
  - Customer management
  - Subscription tracking
  - Invoice management
  - Revenue analytics
  - Worker payouts (Connect)
- **Workflows**:
  - List customers/subscriptions for health check
  - Search for specific transactions
  - Retrieve balance for financial overview
  - Track MRR, churn, and growth metrics

### Apollo — Lead Generation (Layer 4)
- **Status**: Connected
- **Operations**:
  - ICP prospecting and lead discovery
  - Contact enrichment (email, phone, title)
  - Lead scoring and segmentation
  - Sequence enrollment
- **Workflows**:
  - Prospect: Describe ICP → Get ranked leads
  - Enrich: Provide name/company → Get full contact card
  - Sequence: Load leads → Enroll in outreach sequence

### Chrome — Web Automation (Layer 4 + Data)
- **Status**: Connected
- **Operations**:
  - Web research and data extraction
  - Competitive intelligence gathering
  - Form automation and testing
  - Screenshot capture for documentation
  - JavaScript execution for advanced extraction
- **Workflows**:
  - Navigate → Read page → Extract data → Structure output
  - Research: Search → Visit sources → Synthesize findings
  - Test: Navigate app → Verify functionality → Screenshot evidence

## Pending Integrations
| Connector | Priority | Purpose | Blocker |
|-----------|----------|---------|---------|
| Slack | Medium | Team communication | Needs connector setup |
| Calendly | Low | External scheduling | Needs connector setup |
| LinkedIn | Medium | Content + outreach | Via Chrome automation |

## Connector Health Dashboard
| Connector | Last Used | Health | Notes |
|-----------|-----------|--------|-------|
| GitHub | Active | Green | Core engineering tool |
| Notion | Needs setup | Yellow | Workspace needs structure |
| Google Drive | Available | Green | Ready for use |
| Gmail | Available | Green | Ready for outreach |
| Calendar | Available | Green | Ready for scheduling |
| Figma | Available | Green | Ready for design review |
| Canva | Available | Green | Ready for content |
| Stripe | Active | Green | Payments operational |
| Apollo | Available | Green | Ready for prospecting |
| Chrome | Available | Green | Ready for automation |
