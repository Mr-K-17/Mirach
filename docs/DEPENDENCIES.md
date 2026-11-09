# Dependency Register — Mirach

> **Authority:** `Rules.md` §6 (Dependencies).  
> **Policy:** Every package added to `package.json` must have a complete dependency record in this register before inclusion. No runtime package is added without justification. The Worker bundle must remain < 3 MB gzip. High/critical vulnerabilities must be 0. Commit `package-lock.json` and use `npm ci`. GitHub Actions must be pinned by commit hash.

---

## 1. Summary of Dependencies

| Package | Version | Type | Licence | Worker Bundle Impact | Vulnerabilities | Status |
|---|---|---|---|---|---|---|
| `react` | `^18.3.1` | dependency | MIT | 0 KB (client SPA only) | 0 | **Implemented** |
| `react-dom` | `^18.3.1` | dependency | MIT | 0 KB (client SPA only) | 0 | **Implemented** |
| `react-router-dom` | `^6.28.2` | dependency | MIT | 0 KB (client SPA only) | 0 | **Implemented** |
| `firebase` | `^11.3.1` | dependency | Apache-2.0 | 0 KB (client SPA only) | 0 | **Implemented** |
| `lucide-react` | `^0.475.0` | dependency | ISC | 0 KB (client SPA only) | 0 | **Implemented** |
| `typescript` | `^5.7.3` | devDependency | Apache-2.0 | 0 KB (build-time only) | 0 | **Tested** |
| `eslint` | `^9.21.0` | devDependency | MIT | 0 KB (tooling only) | 0 | **Tested** |
| `@typescript-eslint/parser` | `^8.26.0` | devDependency | BSD-2-Clause | 0 KB (tooling only) | 0 | **Tested** |
| `@typescript-eslint/eslint-plugin` | `^8.26.0` | devDependency | MIT | 0 KB (tooling only) | 0 | **Tested** |
| `@cloudflare/workers-types` | `^5.20261104.1` | devDependency | MIT / Apache-2.0 | 0 KB (types only) | 0 | **Tested** |
| `vite` | `^6.1.1` | devDependency | MIT | 0 KB (build-time only) | 0 | **Implemented** |
| `@vitejs/plugin-react` | `^4.3.4` | devDependency | MIT | 0 KB (build-time only) | 0 | **Implemented** |
| `tailwindcss` | `^3.4.17` | devDependency | MIT | 0 KB (build-time CSS) | 0 | **Implemented** |
| `postcss` | `^8.5.3` | devDependency | MIT | 0 KB (build-time CSS) | 0 | **Implemented** |
| `autoprefixer` | `^10.4.20` | devDependency | MIT | 0 KB (build-time CSS) | 0 | **Implemented** |
| `wrangler` | `^4.158.0` | devDependency | MIT / Apache-2.0 | 0 KB (tooling only) | 0 | **Implemented** |
| `@types/react` | `^18.3.18` | devDependency | MIT | 0 KB (types only) | 0 | **Implemented** |
| `@types/react-dom` | `^18.3.5` | devDependency | MIT | 0 KB (types only) | 0 | **Implemented** |
| `axe-core` | `^4.10.2` | devDependency | MPL-2.0 | 0 KB (testing only) | 0 | **Implemented** |
| `jsdom` | `^26.0.0` | devDependency | MIT | 0 KB (testing only) | 0 | **Implemented** |

*Note: Client SPA packages are bundled into the static assets (`dist/`), served by Workers Static Assets with 0 ms Worker CPU execution. The Cloudflare Worker script (`src/worker/`) imports 0 runtime npm packages.*

---

## 2. Package Records

### 2.1 `typescript`
- **Purpose:** Compile-time static type checker (`tsc --noEmit`).
- **Maintenance:** Microsoft; industry standard.
- **Licence:** Apache-2.0.
- **Size / Bundle Impact:** Build/dev-time tool only. 0 KB runtime impact.
- **Vulnerabilities:** 0.

### 2.2 `eslint` & `@typescript-eslint/*`
- **Purpose:** Static code analysis enforcing security rules (D1 data-layer boundary, parameterized SQL statements).
- **Maintenance:** OpenJS Foundation & TypeScript ESLint team.
- **Licence:** MIT / BSD-2-Clause.
- **Size / Bundle Impact:** 0 KB runtime impact.
- **Vulnerabilities:** 0 high or critical.

### 2.3 `@cloudflare/workers-types`
- **Purpose:** Cloudflare Workers runtime API type declarations.
- **Maintenance:** Cloudflare.
- **Licence:** MIT / Apache-2.0.
- **Size / Bundle Impact:** 0 KB runtime impact.

### 2.4 `react` & `react-dom`
- **Purpose:** Core UI component library for building the client SPA (`AppShell`, screens, layout).
- **Maintenance:** Meta / React open source community.
- **Licence:** MIT.
- **Size / Bundle Impact:** Client-side static bundle (~45 KB gzip); 0 KB Worker script bundle impact.
- **Vulnerabilities:** 0.
- **Why existing tools do not suffice:** Architectural stack requirement (`Architecture.md` §2, `Design.md` §1).

### 2.5 `react-router-dom`
- **Purpose:** Client-side declarative routing and URL synchronization matching `Design.md` §4 route map.
- **Maintenance:** Remix / Shopify.
- **Licence:** MIT.
- **Size / Bundle Impact:** Client-side static bundle; 0 KB Worker script bundle impact.
- **Vulnerabilities:** 0.
- **Why existing tools do not suffice:** Necessary for SPA deep-linking and layout nesting without full-page reloads.

### 2.6 `firebase`
- **Purpose:** Web identity client SDK for Google and email/password sign-in.
- **Maintenance:** Google Firebase team.
- **Licence:** Apache-2.0.
- **Size / Bundle Impact:** Client-side only; configured with `inMemoryPersistence` per `Rules.md` §9.
- **Vulnerabilities:** 0.
- **Why existing tools do not suffice:** Selected identity provider (`Architecture.md` §2).

### 2.7 `lucide-react`
- **Purpose:** Accessible, tree-shakable SVG UI icons for navigation rail, bottom tabs, actions, and status indicators.
- **Maintenance:** Lucide community.
- **Licence:** ISC.
- **Size / Bundle Impact:** Only imported icons are bundled via tree-shaking; ~1-2 KB per icon.
- **Vulnerabilities:** 0.
- **Why existing tools do not suffice:** Accessible icons needed for multi-device navigation per `Design.md` §2.2.

### 2.8 `vite` & `@vitejs/plugin-react`
- **Purpose:** Ultra-fast ES module bundler and development server for building the SPA into `./dist`.
- **Maintenance:** Evan You / Vite core team.
- **Licence:** MIT.
- **Size / Bundle Impact:** Build tool only (0 KB runtime impact).
- **Vulnerabilities:** 0.

### 2.9 `tailwindcss`, `postcss`, `autoprefixer`
- **Purpose:** Utility-first CSS compiler mapping tokens from `Design.md` §2.1 directly into CSS classes without runtime styling libraries.
- **Maintenance:** Tailwind Labs.
- **Licence:** MIT.
- **Size / Bundle Impact:** Generates static CSS at build time (~10-15 KB gzip); 0 KB Worker script bundle impact.
- **Vulnerabilities:** 0.

### 2.10 `wrangler`
- **Purpose:** Cloudflare Developer Platform CLI for running the local Worker runtime and deploying Static Assets.
- **Maintenance:** Cloudflare.
- **Licence:** MIT / Apache-2.0.
- **Size / Bundle Impact:** Tooling only (0 KB in Worker runtime bundle).
- **Vulnerabilities:** 0.

### 2.11 `axe-core`
- **Purpose:** Automated accessibility auditing engine to verify WCAG 2.2 AA compliance on AppShell and core screens (`Design.md` §15).
- **Maintenance:** Deque Systems.
- **Licence:** MPL-2.0.
- **Size / Bundle Impact:** Development and testing only (0 KB in production bundle).
- **Vulnerabilities:** 0.

### 2.12 `jsdom`
- **Purpose:** Pure-JavaScript headless DOM implementation for running Axe accessibility audits directly in Node.js test runs.
- **Maintenance:** jsdom organization.
- **Licence:** MIT.
- **Size / Bundle Impact:** Development and testing only (0 KB in production bundle).
- **Vulnerabilities:** 0.

