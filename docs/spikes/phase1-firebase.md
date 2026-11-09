# Spike: Firebase Authentication on `*.workers.dev`

> **Status:** Pending Owner Staging Deployment  
> **Reference:** `Phases.md` Phase 1, `Architecture.md` §2 & §15.2, `Rules.md` §9.  
> **Condition:** Per prompt instructions, this spike must be run **only** after the owner confirms the staging URL exists on `*.workers.dev`.

---

## 1. Objectives

1. **Authorized Domain Registration:**
   - Confirm whether Firebase Authentication accepts Cloudflare's assigned `*.workers.dev` subdomain (e.g., `mirach-staging.<subdomain>.workers.dev`) in Firebase Console -> Authentication -> Settings -> Authorized Domains.
   - Record behavior or limitations when using subdomains under `workers.dev`.

2. **Popup vs. Redirect Sign-in Flow:**
   - Compare `signInWithPopup(auth, googleProvider)` vs `signInWithRedirect(auth, googleProvider)` on `*.workers.dev`.
   - Verify whether third-party cookie blocking in modern browsers (Chrome Privacy Sandbox, Safari ITP, Firefox ETP) impacts popup sign-in or requires reverse proxying.

3. **`/__/auth` Reverse Proxy Requirement:**
   - Test whether Firebase Auth requires a reverse-proxy route (`/__/auth/*` proxied to `<firebase-project>.firebaseapp.com/__/auth/*`) in the Worker script to support sign-in without cross-origin iframe issues.

4. **Content Security Policy (CSP) Directives:**
   - Verify exact required CSP entries for Google / Firebase authentication:
     - `connect-src`: `https://identitytoolkit.googleapis.com`, `https://securetoken.googleapis.com`, `https://*.googleapis.com`
     - `frame-src`: `https://<firebase-project>.firebaseapp.com`
     - `script-src`: `https://apis.google.com`
   - Test whether any CSP violations occur in the browser console during the sign-in lifecycle.

---

## 2. Test Execution Log

*(To be recorded once the owner provides the staging URL and authorizes testing)*

| Test Item | Staging URL Tested | Observed Result | Decision / Effect on Architecture |
|---|---|---|---|
| Authorized domain accept | TBD | Pending | TBD |
| Popup sign-in | TBD | Pending | TBD |
| Redirect sign-in | TBD | Pending | TBD |
| `/__/auth` proxy needed | TBD | Pending | TBD |
| CSP violation scan | TBD | Pending | TBD |

---

## 3. Findings & Recommendation

*(To be completed after running tests against the live staging URL)*
