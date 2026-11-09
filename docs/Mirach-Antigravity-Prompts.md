# Mirach — Antigravity Prompt Pack

How to use this file, in plain words:

- **One prompt = one new Antigravity conversation.** Do not stack prompts in one long chat; the agent forgets and drifts.
- Use **Planning mode** (or type `/plan`) for anything that writes code. Read the plan before you approve it.
- Keep terminal commands on **"ask me first"**. Do not use "Always proceed" on terminal or file access for this project.
- **Never paste a password, API key, token or invitation code into any prompt.** You set secrets yourself in the terminal with `wrangler secret put`.
- The documents are in `/docs` of your repo (the 11 files in `Mirach-docs-v3.1.zip`). The prompts below point to them instead of repeating them.
- Order: **Part A (you) → Part B (setup) → Part C (review, 6 prompts) → Part D (build)**.

---

## Part A — Do this yourself before opening Antigravity (about 1–2 hours)

1. Create a **private GitHub repository** named `mirach`. Turn on two-factor sign-in for GitHub.
2. In the repo, create a folder `docs/` and put the **11 .md files** from the v3.1 zip inside it. Do not rename them. (Leave the `backups/` folders out.)
3. Create accounts **without entering any card**: Cloudflare, Firebase (stay on the free **Spark** plan; make three projects: `mirach-dev`, `mirach-staging`, `mirach-prod`), Backblaze B2. Turn on two-factor for each.
4. **Stop immediately** if any screen asks for a card or says "upgrade". Write down which screen it was; that answer is "OD-13" in `docs/DECISIONS.md`.
5. Do **not** upgrade Firebase to "Identity Platform" or "Blaze".
6. Do not give Antigravity your dashboards, passwords or tokens. It only needs the repo folder and a terminal.
7. The documents say four decisions should be answered before the freeze: **OD-07** (age: default 18+), **OD-09** (backup habit), **OD-13** (does Backblaze work without a card?), **OD-14** (how the owner may export everyone's data). You can start Phase 0 and Phase 1 on the **safe defaults** in `DECISIONS.md` §3, but answer them before Phase 3.

---

## Part B — Set up the rules once

### Prompt B1 — create the rules file (Planning mode)

```
You are helping me start a project called Mirach. The planning documents are in /docs.

Task (no application code yet):
1. Read /docs/Rules.md, then /docs/Memory.md, then /docs/ANTIGRAVITY_HANDOFF.md.
2. Create a file AGENTS.md at the repository root with these rules, worded briefly:
   - Read /docs/Rules.md first, then /docs/Memory.md, at the start of every session.
   - Work on ONE phase at a time (/docs/Phases.md); never start the next phase until I confirm the exit gate.
   - The stack, scope and phase order are frozen. Do not add providers, services or packages without a dependency record (Rules §6). Never enter or request payment details; if any screen asks for them, stop and tell me.
   - Never create cloud accounts or resources, never read or write secrets; I set secrets myself with `wrangler secret put`.
   - Authorization only in the Worker policy layer plus SQL predicates; prepared statements only; D1 only through src/worker/data (Durable Objects call that layer too).
   - No automatic sync, local database, or automatic export, ever. Manual exports only.
   - Never say "secure", "done", "complete" or "production-ready" without evidence (Rules §4 and §24); use the status words Planned / Partially implemented / Implemented / Tested / Verified in production.
   - If two documents disagree, or a provider limit blocks a requirement: stop, explain, propose the smallest fix, wait for me. Do not work around it.
   - Start every session by reporting: current phase, `git status`, last completion report, anything unverified.
   - End every task with the completion report in Rules §22.
3. If Antigravity has a Rules / workspace-instructions feature, also add one rule that says "Read /AGENTS.md and /docs/Rules.md first". Tell me exactly which file or setting you used.
4. Do not create any other file. Show me the diff and wait.
```

---

## Part C — Review the documents with Antigravity

These are **read-only**. They write only to a `/review/` folder (outside `/docs`) and must not change any document. Run C1 to C5 in separate conversations (you can run them at the same time in the Agent Manager), then C6.

### Prompt C1 — "Prove you understood it"

```
READ-ONLY. Do not change any file except /review/C1-understanding.md.

Read every file in /docs in this order: Rules, Memory, PRD, Architecture, Design, Phases, DECISIONS, EXPORT_SPECIFICATION, SOURCE_REGISTER, REVIEW_REPORT, ANTIGRAVITY_HANDOFF.

Write /review/C1-understanding.md with:
1. Mirach in 10 lines (what it is, who uses it, the stack, what is frozen).
2. The 12 rules you must never break, quoted with section numbers.
3. For Phases 0, 1 and 2: objective, what I (the owner) must do, what you must do, exit gate.
4. A list of every place where you are unsure what to do, or where the documents seem unclear. Say "none" only if you truly found none.
Do not guess; if something is not in the documents, say so.
```

### Prompt C2 — consistency audit

```
READ-ONLY. Do not change any file except /review/C2-consistency.md.

Audit /docs for contradictions and gaps. Check, with exact file and section for each finding:
- Numbers that must match everywhere: session idle/absolute lifetime, re-authentication window (should be 5 minutes), signed-URL TTL, call-token TTL, edit window, group cap, media limits and quotas, rate limits, retention periods, database names, number of Firebase projects (should be 3).
- Every cross-reference ("Rules §10", "Architecture §19.3", "Phases §8" ...): does the target exist and say what the reference claims?
- Every FR-* ID in PRD.md: does it appear in Phases.md with the same phase number, in the traceability table of REVIEW_REPORT.md, and in a test or acceptance line?
- Every table named in Phases.md "Database changes": is it defined in Architecture.md §7.4 in the same database (core / chat / activity)?
- Every API route in Architecture.md §9: is it covered by a phase?
- Any place where documents disagree about who may do what (roles, exports, moderation).
- Any wording that claims more than evidence supports ("secure", "compliant", "unlimited").
Output a table: ID | severity (High/Med/Low) | files and sections | what disagrees | smallest fix you propose. Do not apply fixes.
```

### Prompt C3 — security and authorization review

```
READ-ONLY. Do not change any file except /review/C3-security.md.

Act as a security reviewer of the DESIGN in /docs (no code exists yet). Read Architecture.md §5, §6, §8, §10, §12, §15, Rules.md §7-§13, EXPORT_SPECIFICATION.md.

Try to break the design. For each area give: attack idea, why the design stops it or does not, document section, severity, and a concrete fix if it does not.
Areas: Firebase ID-token validation and session creation; cookie/CSRF/Origin/WebSocket upgrade; invitation redemption races; role escalation and last-owner rules; D1 has no row-level security so check every place a query could leak another user's data; Durable Object admission and eviction; signed URLs and media deletion (B2 versions); account deletion across Firebase + D1 + B2; operator export and what the owner/providers can read; rate limiting and abuse; quota exhaustion used as a denial-of-service.
Also list the 10 negative tests you consider most valuable and which phase should own each.
Be specific. Do not praise the design; look for what is missing.
```

### Prompt C4 — are the provider facts still true? (browsing only, no sign-ups)

```
READ-ONLY. Do not change any file except /review/C4-providers.md. Do not create accounts, enter payment details or run anything against a provider. Use only official documentation pages.

Open the official pages for: Cloudflare Workers limits and pricing, D1 limits and pricing, Durable Objects pricing/limits, Workers Static Assets (run_worker_first, _headers, SPA fallback), Firebase Authentication limits, Backblaze B2 pricing and S3-compatible API/presigned URLs/lifecycle rules, LiveKit pricing and quotas.
Compare each number in /docs/SOURCE_REGISTER.md and /docs/Architecture.md §2 and §19 with what the official page says today. For every difference or item you cannot confirm, give: claim, document section, what the official page says (quote + URL + date), and the effect on the design.
Specifically answer: (1) do Durable Object calls count toward the Worker 50-subrequest limit? (2) is a card needed for Cloudflare Workers/D1/Durable Objects free use, for Firebase Spark, for Backblaze B2? say "page does not say" if it does not. (3) which Free-plan DO and D1 "rows written" meters are shared?
Mark every item as Confirmed / Changed / Cannot confirm.
```

### Prompt C5 — can this be built and tested?

```
READ-ONLY. Do not change any file except /review/C5-buildability.md.

Read Phases.md, PRD.md, Design.md and Architecture.md. For Phases 0 to 7 (the trusted-group release) check:
- Is every requirement testable? List any acceptance criterion that is vague or cannot be tested automatically.
- Is every dependency available at the time it is needed (for example something used in Phase 4 that is only built in Phase 5)?
- Is any phase too big for one person with an AI agent? Suggest how to split it into tasks of one feature or migration set each (Rules.md §3).
- Which spikes could change the design if they fail, and what is the fallback for each?
- List the exact folders and files you would create in Phase 0 and Phase 1, based on Architecture.md §17.3.
- List the npm packages you expect to need through Phase 7 (each needs a dependency record under Rules §6) and flag any that look unnecessary.
Output a short table per phase: tasks, risks, tests, owner actions.
```

### Prompt C6 — merge everything into one decision list

```
READ-ONLY except /review/C6-final-list.md.

Read /review/C1 to C5. Produce ONE list of findings, de-duplicated and sorted High → Low. For each: ID, source reviews, files and sections to change, the smallest fix, and whether it needs MY decision (architecture, cost, security, scope) or is a plain wording fix.
Then group them: (a) apply now, wording only; (b) needs my decision; (c) answer later by a spike.
Do not edit any document. I will approve each change first.
```

After C6: send me the list (paste it into Claude) and we will decide the changes together. Apply approved changes with this prompt:

```
Apply ONLY these approved changes to the files in /docs: <paste the approved list>.
Keep the 11 file names. Update "Last reviewed" lines and add a row to the decision log in DECISIONS.md §4. Show me the diff before committing. Commit message: "docs: review fixes (C6 approved items)".
```

---

## Part D — Build

**Rhythm for every phase:** (1) start-of-session prompt → (2) plan (you read it) → (3) implement one feature or one migration set at a time → (4) completion report → (5) fresh-chat independent review → (6) you confirm the exit gate → (7) commit/tag.

### Prompt D0 — start of every session (copy as is)

```
Start of session. Read /AGENTS.md, /docs/Rules.md and /docs/Memory.md. Then report, in this order: the current phase; `git status` and the current branch; the last completion report (or "none"); anything you could not verify. Do not change anything yet.
```

### Prompt D1 — Phase 0 (repository skeleton, no cloud)

```
Phase 0 task. Read /docs/Rules.md, /docs/Memory.md, /docs/Phases.md (Phase 0 and the Definition of Done in §19) and /docs/Architecture.md §17.
Use Planning mode: write the plan first and wait for my approval.

Do:
- Inspect the repo and tell me what exists.
- Create the repository skeleton from Architecture.md §17.3, a CI workflow stub (type-check, lint, test, build, secret scan, npm audit; pin GitHub Actions by commit hash), `.env.example` with names only (Architecture §17.5), .gitignore (no .env*, no dumps, no exports), and ESLint rules that forbid (a) raw `env.DB_*` access outside src/worker/data and src/worker/do calls into it, (b) string-built SQL.
- Create stubs for docs/runbooks/: owner-recovery.md, backup-restore.md, secret-rotation.md, incident-and-breach.md.
- Do NOT create any cloud account or resource, do NOT install anything not needed for the skeleton, and do NOT write feature code.
- For every dependency you add, write the dependency record required by Rules §6.
Finish with the completion report (Rules §22). List what you could not run.
```

### Prompt D2 — Phase 1 (shell, hosting, spikes)

```
Phase 1 task. Read /docs/Rules.md, /docs/Memory.md, /docs/Phases.md Phase 1, /docs/Architecture.md §2, §15.2, §17, /docs/Design.md §2–§4, §14–§16.
Planning mode first; wait for my approval.

Build only Phase 1: Vite + React + TypeScript (strict) + Tailwind app shell, responsive at 320 / 768 / 1024 / 1280 px, routes with guards (UX only), error boundaries, offline / quota / maintenance screens; one Cloudflare Worker with Static Assets (SPA fallback, run_worker_first for /api/* and /ws/*), `public/_headers` with the CSP and headers from Architecture §15.2, `/api/health`; GitHub Actions CI and a staging deploy workflow (deploy only when I have added the Cloudflare token as a GitHub secret — do not ask me for the token value); Firebase web SDK wired with config only (inMemoryPersistence, Rules §9).
Run the Firebase-on-workers.dev spike (authorized domain, popup vs redirect, whether /__/auth proxy is needed, CSP entries) ONLY after I tell you the staging URL exists, and write the result to docs/spikes/phase1-firebase.md.
Do not create a database or any feature. Verify headers in a browser, inspect the built bundle for secrets, run Axe on the shell.
Finish with the completion report. Say clearly which commands you did not run.
```

### Prompt D3 — Phase 2 (database + security spine; spikes first)

```
Phase 2 task. Read /docs/Rules.md §9–§10, §17–§19, /docs/Phases.md Phase 2 and §5, /docs/Architecture.md §5.3, §7, §8, §9, §15.3, §19, /docs/DECISIONS.md ADR-019…023.
Planning mode first; wait for my approval.

Step 1 — SPIKES ONLY, no features, against local D1 in the Workers test pool. Write docs/spikes/phase2-report.md with expected vs observed for each:
 a) D1 batch() atomicity and rollback on a UNIQUE violation, and statement order (Architecture §8.3 send-message and invitation SQL);
 b) RETURNING, partial unique indexes, STRICT tables;
 c) CPU time per handler and subrequest counts, including whether Durable Object calls count against the 50 limit;
 d) the Workers rate-limiting binding on the Free plan;
 e) Durable Object hibernation behaviour and alarm-based flushing;
 f) migrations applied from scratch into ONE database from the three folders (file names must be unique);
 g) rows read/written reported by D1 `meta`.
Stop after the report and tell me what, if anything, contradicts the documents. Do not continue to step 2 until I say so.

Step 2 (only after my OK) — migration tooling, src/worker/data layer, request pipeline (rate limit, Origin/CSRF, session lookup stub, Zod validation, error format, request IDs), authorize() policy module with unit tests, logging with redaction, 503 QUOTA_EXHAUSTED handling, Durable Object skeleton classes, cron skeleton, tests F-02, F-03, F-20 and injection attempts.
Finish with the completion report.
```

### Prompt D4 — Phases 3 to 12 (template; fill the two blanks)

Use the phase and FR IDs from `docs/Phases.md` (the table in `ANTIGRAVITY_HANDOFF.md` §6 lists them). Before Phase 3 you must have answered OD-07, OD-13 (if you want media later), OD-14 and finished Part A.

```
Phase <N> task: <title from Phases.md>. Read /docs/Rules.md, /docs/Memory.md, /docs/Phases.md Phase <N> and §5 (negative-test matrix and failure tests), /docs/PRD.md for <FR IDs>, and the Architecture/Design sections named in the ANTIGRAVITY_HANDOFF.md §6 row for this phase.
Planning mode first. Split the phase into tasks of ONE feature or ONE migration set each, list them, and wait for my approval.

For each task: inspect the real repo → implement → add tests, including NEGATIVE tests through the HTTP API for every actor in Phases §5 → measure rows read/written, requests, CPU and subrequests against Architecture §19.2 → update docs/Memory.md status → completion report (Rules §22).
Do not implement anything from another phase. If a limit or a document blocks you, stop and file a change request (Handoff §9) instead of working around it.
```

Phase-specific reminders to add at the end of the template:

- **Phase 3:** token negative tests (wrong audience/issuer/algorithm/expired/anonymous/unverified email); concurrent invitation redemption must give exactly `max_uses`; stop at **Gate A** (nobody real joins before it).
- **Phase 5:** also run F-04, F-05, F-09, F-10, F-11, F-15, F-16; two real browsers; measure writes per message (target ≈ 6).
- **Phase 6:** start only after **Gate P** (Backblaze) passed; otherwise stay text-only.
- **Phase 7:** ends at **Gate B** (first trusted-group release): restore drill, second admin, published limitations.
- **Phase 8** needs Gate L (LiveKit, no card). **Phase 11** needs the encryption-library spike before anything is built.

### Prompt D5 — independent review after each phase (fresh conversation, read-only)

```
READ-ONLY review. Do not change code. I just finished Phase <N>. You did not write it; assume it contains mistakes.
Read /docs/Rules.md, /docs/Phases.md Phase <N> and §5, then review the diff since the tag <previous-tag>.
Report to /review/phase<N>-review.md:
1. Requirements in the phase's acceptance criteria that are NOT actually met or tested (quote the test name, or say "no test").
2. Authorization problems: any query not scoped by an access predicate, any handler that skips authorize(), any identity taken from the request body, any raw DB access outside src/worker/data.
3. Secrets, personal data or message text in code, logs or tests.
4. Missing negative tests from the Phases §5 matrix.
5. Quota impact: rows written per action vs Architecture §19.2.
6. Claims in docs or UI that the evidence does not support (Rules §24).
Rank findings High/Medium/Low with file and line.
```

### Prompt D6 — when something does not fit (change request)

```
Stop coding. Write a change request in /review/CR-<short-name>.md using ANTIGRAVITY_HANDOFF.md §9: (1) the problem, (2) technical evidence (doc link, spike output, measurements), (3) cost impact (must stay $0 and card-free), (4) security impact, (5) migration impact, (6) the options, with your recommendation. Do not implement any option and do not edit /docs until I decide.
```

### Prompt D7 — context got long or the agent is confused

```
Pause. Re-read /AGENTS.md, /docs/Rules.md and /docs/Memory.md. In 10 lines tell me: the phase we are in, what is finished and tested, what is half done, what you were about to do next, and any assumption you made that is not written in the documents. Do not change anything until I reply.
```

---

## Your quick checklist per phase

- [ ] Plan read and approved before code was written
- [ ] Completion report has "Tests run" with real commands (not "should work")
- [ ] D5 review done in a fresh chat; High findings fixed
- [ ] Exit gate in `docs/Phases.md` met; you said so in writing
- [ ] `git tag phase-<N>` created; `docs/Memory.md` status updated
- [ ] No card entered, no secret pasted anywhere
