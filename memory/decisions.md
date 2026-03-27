# Strategic Decisions Log

## Decision Record Template
```
## [Date] — [Title]
- **Context**: [What situation prompted this decision?]
- **Options**: [What alternatives were considered?]
- **Decision**: [What was decided and why?]
- **Trade-offs**: [What was gained/lost?]
- **Agent Assignments**: [Which agents execute?]
- **Reversibility**: [Easy/Medium/Hard to reverse]
- **Review Date**: [When to reassess]
```

---

## 2026-03-24 — AI OS Initialization (Phase 1)
- **Context**: Manual operations across engineering, growth, and ops. No central orchestration.
- **Options**: (1) External automation tools (Zapier/Make), (2) Custom scripts, (3) Claude AI OS
- **Decision**: Build Claude AI OS with 5 layers, custom skills, memory system, scheduled tasks
- **Trade-offs**: Higher initial setup time, but full control and context persistence
- **Agent Assignments**: N/A (system bootstrap)
- **Reversibility**: Easy — files and skills can be modified or removed
- **Review Date**: 2026-04-07

## 2026-03-24 — AI OS Upgrade (Phase 2)
- **Context**: Phase 1 foundation was solid but thin. Skills lacked execution playbooks. No Data Engine. Automations were 90% planned. Connectors had no operational workflows.
- **Options**: (1) Incremental upgrades, (2) Full system overhaul
- **Decision**: Full system upgrade — 6 agents with playbooks, Data Engine, Growth Engine with 9 channels, 6 standardized pipelines, connector operational workflows, decision framework with templates
- **Trade-offs**: Larger scope, but eliminates all gaps in one pass
- **Agent Assignments**: All agents upgraded
- **Reversibility**: Easy — all changes are additive
- **Review Date**: 2026-04-07

## 2026-03-24 — AI Company OS (Phase 3)
- **Context**: System had 6 operational agents but no strategic command layer. Agents operated independently without hierarchy, coordination, or feedback loops. Data Engine and Growth Engine were architecturally separate with no integration. No execution cadence beyond daily standup and weekly review.
- **Options**: (1) Add coordination manually per task, (2) Build CEO agent with hierarchy
- **Decision**: Create CEO agent as strategic command layer. Establish agent hierarchy (CEO → CTO → Growth → Data → Architect → Chief → Content). Connect Data Engine signals directly to Growth Engine channels. Add 5-type signal detection system with scoring engine. Define Daily/Weekly/Monthly execution loops. Add CEO monthly review pipeline.
- **Trade-offs**: More complex system, but enables autonomous multi-agent coordination and signal-to-revenue pipeline
- **Agent Assignments**: /ceo (new), all existing agents upgraded with collaboration rules
- **Reversibility**: Easy — CEO is additive, collaboration rules are documentation
- **Review Date**: 2026-04-07

---

## Decision Protocol
Every decision must answer:
1. **Context** — What is the current system state?
2. **Leverage** — Where is the highest-impact intervention?
3. **Options** — What are 2-3 viable approaches with trade-offs?
4. **Action** — Execute the simplest viable solution
5. **Scalability** — Will this hold as the system grows?
6. **Record** — Log here with review date

## 2026-03-24 — Vision Correction & ICP Redefinition
- **Context**: Initial ICP treated WorkOn as a Quebec gig platform. Founder corrected: WorkOn is global work infrastructure — a universal work layer (Uber + LinkedIn + Shopify + TaskRabbit). Quebec is the proving ground, not the ceiling.
- **Options**: (1) Stay narrow Quebec gig ICP, (2) Redefine around infrastructure vision with phased expansion
- **Decision**: Complete ICP rewrite. Phase 1: Quebec MVP proving unit economics. Phase 2: Canadian expansion. Phase 3: Global work network with API/protocol layer. Two-sided ICP maintained but framed as infrastructure segments, not gig categories.
- **Trade-offs**: Bigger vision requires more disciplined focus on Phase 1 proof points before scaling
- **Agent Assignments**: All agents recalibrated to infrastructure vision. /growth builds MVP traction. /cto builds for eventual API layer. /data tracks global work infrastructure signals.
- **Reversibility**: Easy — execution stays Phase 1 focused, vision informs architecture decisions
- **Review Date**: 2026-04-14

---

## Conflict Resolution
When agents have competing needs:
1. `/chief` surfaces the conflict with context
2. `/ceo` evaluates against strategic priorities
3. `/ceo` arbitrates and assigns resources
4. Decision logged here
