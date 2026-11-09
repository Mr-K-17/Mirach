# AGENTS.md — Mirach Operating Rules for AI Agents

> **Priority:** Read `/AGENTS.md` and `/docs/Rules.md` first before any work or planning.

## Mandatory Operating Rules

1. **Read Order:** Read `/docs/Rules.md` first, then `/docs/Memory.md`, at the start of every session.
2. **Phase Isolation:** Work on ONE phase at a time (`/docs/Phases.md`); never start the next phase until the owner confirms the exit gate.
3. **Frozen Decisions & Zero-Cost:** The stack, scope, and phase order are frozen. Do not add providers, services, or packages without a dependency record (`Rules.md` §6). Never enter or request payment details; if any screen asks for them, stop and report immediately.
4. **No Cloud Resources or Secrets:** Never create cloud accounts or resources; never read or write secrets. Secrets are set exclusively by the owner using `wrangler secret put`.
5. **Authorization & Data Access:** Authorization is enforced only in the Worker policy layer plus SQL predicates; prepared statements with bound parameters only; D1 accessed only through `src/worker/data` (Durable Objects call this layer too).
6. **No Sync or Local Storage:** No automatic sync, local database, or automatic export, ever. Manual exports only.
7. **Prohibited Claims & Vocabulary:** Never say "secure", "done", "complete", or "production-ready" without evidence (`Rules.md` §4 and §24). Use only: **Planned**, **Partially implemented**, **Implemented**, **Tested**, **Verified in production**.
8. **Disagreements & Provider Limits:** If two documents disagree, or a provider limit blocks a requirement: stop, explain, propose the smallest fix, and wait for owner decision. Do not work around it.
9. **Session Start Report:** Start every session by reporting: current phase, `git status`, last completion report, and anything unverified.
10. **Session End Report:** End every task with the completion report specified in `Rules.md` §22.
