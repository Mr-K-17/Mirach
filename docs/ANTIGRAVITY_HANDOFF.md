# Antigravity Hand-off — Implementing Mirach

> **Audience:** the AI coding agent (Antigravity) and the owner supervising it.
> **Status:** valid only after the owner approves and freezes the documentation (`REVIEW_REPORT.md` §11).
> **Last reviewed:** 4 November 2026; consistency pass v3.1 on 9 November 2026 (Asia/Kolkata).
> **Note:** this document is tool-agnostic. A 9 Nov 2026 check of public Antigravity material found workspace rules/instructions, a `/plan` command that produces an implementation plan for review, an Agent Manager, artifacts (task list, plan, walkthrough, screenshots) and per-project review/permission policies; **exact rule-file names and folders differ between versions and were not verified** — confirm them in the app. Map each instruction to the tool's equivalent. Fallback that works in any tool: keep a short `AGENTS.md` at the repository root (also readable as a rules file) that says "Read `/docs/Rules.md` first, then `/docs/Memory.md`" and repeats the §8 guardrails.

## 1. Mission

Implement Mirach exactly as specified: a private, invitation-only community messenger/social platform that runs on Cloudflare (Worker + Static Assets, D1, Durable Objects), Firebase Authentication (Spark), Backblaze B2 and LiveKit, at zero cost with **no payment method anywhere**, with the cloud as the sole authoritative data store and **manual-only** exports. Work **one phase at a time** from `Phases.md`. Do not design, re-architect or "improve" the stack.

## 2. Setup for the agent

1. Place all eleven documents in `/docs` of the repository (`Memory.md`, `Architecture.md`, `Design.md`, `Phases.md`, `PRD.md`, `Rules.md`, `DECISIONS.md`, `REVIEW_REPORT.md`, `SOURCE_REGISTER.md`, `EXPORT_SPECIFICATION.md`, this file).
2. Configure the agent's persistent workspace rules to include: "Read `/docs/Rules.md` first, then `/docs/Memory.md`; follow the task procedure and completion report in Rules §3 and §22; never violate Rules §2, §5, §7, §23, §24." (Use the tool's rules/instructions mechanism — **UNVERIFIED** name.)
3. Give the agent read access to the repo and a terminal; **do not give it provider dashboards, payment pages or production secrets**. Secrets are set by the owner via Wrangler (`wrangler secret put`).
4. Require the agent to start every session by reporting: current phase, `git status`, last completion report, and anything it could not verify.

## 3. Read order

`Rules.md` → `Memory.md` → `PRD.md` → `Architecture.md` → `Design.md` → `Phases.md` → `DECISIONS.md` → `EXPORT_SPECIFICATION.md` (Phase 11) → `SOURCE_REGISTER.md` (before touching any provider).

## 4. What is frozen (summary of `Rules.md` §2)

Cloudflare Worker + Static Assets (single Worker); D1 (`mirach-core`, `mirach-chat`, `mirach-activity`); Durable Objects (Hibernation) for realtime only; Firebase Auth Spark with Mirach server-side sessions; Backblaze B2 private bucket (Gate P); LiveKit (Gate L); React + TypeScript + Vite + Tailwind; GitHub; full feature scope; phase order; zero cost/no card; cloud-only data; manual exports only.

## 5. Owner-performed prerequisites (agent must not attempt)

| Task | Owner action | Evidence to record |
|---|---|---|
| Accounts | Create GitHub (private repo), Cloudflare, Firebase (Spark; **three separate projects: development, staging, production** — `Architecture.md` §17.2, `Rules.md` §7), Backblaze B2 accounts **without entering card details**; enable two-factor on each | Screenshots/notes without secrets in `SOURCE_REGISTER.md` |
| Gate P | Run the B2 checklist: private bucket, scoped key, CORS, presigned PUT/GET, versioned delete — stop if payment details are requested | Result recorded; OD-13 answered |
| Tokens | Create a scoped Cloudflare API token for CI deploys; store it as a GitHub secret | none in repo |
| Firebase | Enable Google and Email/Password providers, add authorized domains, email templates; **do not** upgrade to Identity Platform or Blaze | Console checklist |
| Gate L (Phase 8) | Create a LiveKit Build project without card details | OD-19 |

If any screen asks for a payment method: **stop**; report; do not proceed (`Rules.md` §5).

## 6. Phase work orders

For each phase: open `Phases.md` for the phase, list the `FR-*` IDs, complete the 7-step procedure, then stop at the exit gate. Do not start the next phase before the owner confirms the gate.

| Phase | First-session instruction to the agent |
|---|---|
| 0 | Prepare the repo, CI skeleton, `.env.example`, lint rules (no raw DB access outside `src/worker/data`, no string-built SQL), docs folder, runbook stubs. **Do not** create cloud resources |
| 1 | Scaffold SPA + Worker with Static Assets, `_headers`, SPA fallback, responsive shell, Firebase SDK wiring (config only), staging deploy workflow; run the Firebase-on-`workers.dev` spike and report |
| 2 | Create migration tooling and the data layer; request pipeline; policy module; run the D1 batch/atomicity, CPU, subrequest and rate-limit spikes and **write a spike report** before building features |
| 3 | Session creation with strict token validation; invitations; membership; admin console; owner bootstrap; Firebase Admin spike (optional); stop at Gate A |
| 4 | Profiles, directory, connections, blocks, reports, notifications |
| 5 | Messaging core with Durable Objects, interactions and gestures with alternatives; measure write/read budgets |
| 6 | B2 pipeline only after Gate P; media, voice, video, documents, avatars; deletion verification |
| 7 | Search, forward, pin, mute, presence, Web Push + PWA; stop at Gate B |
| 8 | After Gate L: calls |
| 9 | Games with `GameRoom` |
| 10 | Social features |
| 11 | Exports per `EXPORT_SPECIFICATION.md`; encryption library spike and dependency record |
| 12 | Full verification, all failure tests, accessibility, release readiness |

## 7. Commands (reference; adapt after inspecting the repo)

```
npm ci
npm run typecheck && npm run lint && npm test
npx wrangler dev                              # local Worker, local D1/DO
npx wrangler d1 migrations apply <db> --local # then --remote only for staging/production by the owner
npx wrangler deploy --env staging             # CI deploys staging; production is owner-approved
npx wrangler secret put <NAME>                # owner only; never paste values into chat or files
```

The agent must verify each command against the real repository and Wrangler version and say when something was not run.

## 8. Mandatory guardrails (non-negotiable)

1. No payment methods, billing, paid plans, new providers, or card-requiring services. No Cloudflare R2, no Firebase Blaze/Cloud Functions/Storage, no Supabase.
2. No PC sync, local databases, archive jobs, tunnels or automatic exports. No code path writes application data to anywhere except D1, Durable Object state (ephemeral/coordination only) and B2.
3. Authorization only in the Worker policy layer + SQL predicates; prepared statements only; no client-supplied identity or roles; no email storage; no secrets in the repo or logs; no custom cryptography.
4. Never display "sent/delivered/read/deleted/exported" before the server confirms; never swallow write errors; return `503 QUOTA_EXHAUSTED` when providers refuse due to limits.
5. Every gesture has a visible, keyboard-operable alternative.
6. Do not implement features outside the current phase; do not drop features; do not rename documents.
7. Do not claim anything is secure, encrypted end-to-end, complete or compliant (`Rules.md` §24).
8. Measure rows read/written, requests, CPU and subrequests for new endpoints and compare with `Architecture.md` §19.2.

## 9. Change control after freeze

If the agent believes the documentation is wrong or a provider limit blocks a requirement, it must **stop and file a change request** instead of coding around it:
1. Explanation of the issue; 2. technical evidence (docs link, spike output, measurements); 3. cost impact (must stay $0/no-card or be flagged); 4. security impact; 5. migration impact; 6. owner decision recorded in `DECISIONS.md` as a new ADR **before** any change. New ideas go to the backlog (`DECISIONS.md` §5). Spike failures listed in `Phases.md` (D1 batch semantics, Firebase on `workers.dev`, B2 CORS/versioning, rate-limit binding, FTS5, push CPU) follow the same path with a documented fallback if one is already specified.

## 10. Stop conditions (the agent must stop and ask the owner)

A provider asks for payment details; a quota or CPU limit would be exceeded by the planned design; a document conflict; a security-impacting ambiguity; a request to delete or modify production data; any need for a secret; a needed dependency not yet approved; tests that cannot be run; discovery that a previous phase's tests were weaker than claimed.

## 11. Completion report template

Use `Rules.md` §22 verbatim: Changed · Why (FR IDs, phase) · Tests run (commands/results/not run) · Security and quota impact · Status words · Not done/risks/unverified · Docs updated · Next approved step.

## 12. First prompts (examples)

**Phase 0:** "Read /docs/Rules.md, /docs/Memory.md, /docs/Phases.md Phase 0 and /docs/Architecture.md §17. Inspect the repository. Create the repo skeleton, CI workflow stub, `.env.example` and lint rules described in Rules §10/§16/§20. Do not create any cloud resources or accounts. Provide a completion report."
**Phase 2 spike:** "Implement only the Phase 2 spikes listed in /docs/Phases.md §8 against local D1 in the Workers test pool. For each spike state expected vs observed behavior, and propose ADR amendments if observed behavior differs. Do not build features."
**Phase 5:** "Implement FR-MSG-01…10 and FR-INT-01…07 following Architecture §8.3, §10, §11 and Design §7/§15. Include all negative tests from Phases §5 for conversations and WebSockets, failure tests F-04/F-05/F-09/F-10/F-11/F-15/F-16, and measure rows read/written per send."
