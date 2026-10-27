# Run the Playwright worker locally

The local worker is intended for development on the same PC as the BugPilot
Next.js app. The app and worker connect to your hosted Neon Postgres and
BullMQ-compatible Redis services; the browser itself runs on your PC. Do not
deploy this local-only route or use it as a production worker.

## Requirements

- Node.js and npm
- A Neon Postgres database
- A Redis service that supports BullMQ connections
- Redis configured with `maxmemory-policy=noeviction` for reliable BullMQ jobs
- Explicit origins you are authorized to test

## Setup

1. Copy `.env.example` to `.env` and set Firebase Authentication:
   - Enable **Email/Password** and **Google** under Firebase Console → Authentication → Sign-in method.
   - Add the app's host under Firebase Authentication → Settings → Authorized domains.
   - Set the `NEXT_PUBLIC_FIREBASE_*` values from Firebase Console → Project settings.
   - Set `FIREBASE_PROJECT_ID` to that same project ID.
   - Provide Firebase Admin Application Default Credentials. For local development,
     set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON file stored
     outside this repository, or use `gcloud auth application-default login`.
     Never commit the service-account file or put its contents in a client variable.
   - Firestore Standard database `(default)` is provisioned in `asia-south1`
     (Mumbai). Deploy the deny-by-default rules and indexes with
     `npx firebase-tools deploy --only firestore`.
2. Configure the local Playwright worker:
   - `LOCAL_WORKER_ENABLED=true`
   - `NEON_DATABASE_URL` to the Neon pooled connection string (use TLS).
     `DATABASE_URL` remains supported as a legacy fallback.
   - `NEON_DATABASE_URL_UNPOOLED` to the direct, non-pooler connection string
     for schema migrations. `DATABASE_URL_UNPOOLED` is also supported as a
     legacy fallback. If neither is set, the migration command derives a direct
     Neon endpoint from the configured Neon pooled URL in memory. Keep the
     pooled URL for app and worker traffic.
   - `REDIS_URL` to the Redis connection string
   - Optional `LOCAL_WORKER_ALLOWED_ORIGINS` for local development targets or
     pre-approved exact origins, including scheme and port where relevant
     (for example `http://localhost:3001`). Public HTTPS domains can instead
     be authorized from project setup with a DNS TXT ownership challenge.
   - Optional Groq diagnosis settings: set `GROQ_API_KEY`. The default model is
     `openai/gpt-oss-120b`; set `GROQ_MODEL` only to override it.
     `LLM_TIMEOUT_MS` is bounded to 1,000-30,000 ms and `LLM_MAX_TOKENS` to
     128-2,048. A structured-output validation error is retried once with a
     larger bounded token budget. Diagnosis runs only after a signed-in user
     requests it; only bounded, redacted finding evidence is sent to Groq. The
     API key is used by the local worker and is never sent to the browser.
3. Install the local Chromium browser:

   ```powershell
   npx playwright install chromium
   ```

4. Apply the run pipeline schema:

   ```powershell
   npm run db:migrate:local
   ```

   This command requires the direct migration URL above and rejects pooled
   endpoints. It applies the tracked findings and verification migrations too.

5. Start the app and worker in separate PowerShell terminals:

   ```powershell
   npm run dev
   ```

   ```powershell
   npm run worker:local
   ```

6. Open `http://localhost:3000` and create or sign in with email/password or
   Google. To add a public website, enter its HTTPS URL in project setup, choose
   **Verify website domain**, publish the displayed TXT record at the domain's
   DNS provider, and check verification. The challenge expires after one hour.
   Local development sites may be added directly when their exact origin is in
   `LOCAL_WORKER_ALLOWED_ORIGINS`. Open the project and choose **Start a run**.
   The event stream and first-page screenshot are persisted in Neon and shown
   in the run room.

Set `LOCAL_WORKER_HEADED=true` in `.env` if you want to see the Chromium
window. The default is headless.

## Safety and current scope

- Local run API routes are enabled only when `NODE_ENV=development` and
  `LOCAL_WORKER_ENABLED=true`; requests must use a loopback host.
- Workspace pages and local-run API routes require a Firebase session cookie.
  The cookie is HTTP-only, same-site, and valid for five days; sign-in ID tokens
  must have an authentication time within the previous five minutes. Email and
  Google sign-in both exchange the Firebase ID token for this same server session.
  Signing in with Google creates a Firebase account automatically when that email
  has not registered before. Existing sessions are sent directly to the requested
  internal workspace path instead of showing the sign-in form.
- Successful session creation writes the account profile to Firestore at
  `users/{uid}` and the workspace reads that server-managed profile. Firestore
  client access is denied by default; the Next.js server accesses it through
  Firebase Admin after verifying the session. Projects are stored at
  `users/{uid}/projects/{projectId}` and are readable or editable only through
  authenticated server handlers. Neon remains the store for local Playwright
  runs, events, and screenshot artifacts.
- The authenticated workspace profile view shows the user's name, email,
  verification status, sign-in provider, and Firebase user ID. Passwords are
  never stored or displayed by BugPilot.
- Project creation and editing require an exact origin in the account's
  verified-origin records or `LOCAL_WORKER_ALLOWED_ORIGINS`. External domains
  are verified with a short-lived DNS TXT challenge before they can be used.
  Each run also verifies project ownership and that its target origin belongs
  to that project.
- Run records are associated with the Firebase user ID and are only returned to
  that user. The dashboard and run history show records from Neon; no fixture
  runs, findings, journeys, source changes, or integration statuses are
  displayed. Route coverage includes only paths visited by actual local runs.
- Browser requests are restricted to the project's exact origin. The worker
  resolves and pins that host to a checked public address for the run; other
  origins and DNS names are blocked. External resources hosted on another
  origin are not loaded by the current worker.
- Literal private-network IPs and domains resolving to private addresses are
  blocked. Public domain verification accepts HTTPS on the standard port only.
  Explicit `localhost` origins remain available for local development; only
  add ports you intend to test.
- The target URL cannot include credentials, query parameters, or a fragment.
- BullMQ warns when Redis uses an eviction policy such as `volatile-lru`.
  Configure `maxmemory-policy=noeviction` in the Redis provider dashboard.
  Some managed Redis services restrict `CONFIG GET`, so verify this setting
  through the provider dashboard if the command is unavailable.
- The local run flow currently supports public pages and Chromium only. It
  records console errors, failed/4xx/5xx network signals, and the first viewport
  screenshot (up to 5 MB). Unique console and network signals are stored as
  findings marked **Needs review**; server errors receive high severity, while
  client errors remain low severity. These are deterministic signals, not
  confirmed root causes. Runs that reach their configured time limit end with
  `timed_out` rather than a success-shaped `completed` status.
- A finding can be checked using **Run fresh verification**. This creates a new
  queued run with the original target, objective, viewport, and limits. A
  verification passes only if at least one page loads, the run does not time
  out, and the exact signal fingerprint is not observed; reproducing that
  fingerprint fails the check. A timeout, browser failure, or run that cannot
  load a page is **blocked**, not passed. A pass means only that this signal
  was not seen in this fresh run; it does not prove a fix or root cause.
- Cancellation is persisted as `cancel_requested`; the worker reports
  `cancelled` only after it has stopped the browser.
- It does not yet execute goal-driven interactions, authenticate into target
  apps, generate source-code patches, or apply fixes. Optional Groq diagnosis
  provides evidence-linked hypotheses and suggested checks only; it is not a
  confirmed root cause or a pass/fail authority.
- Screenshot bytes are stored in Neon for this development slice. Keep the
  5 MB per-artifact cap, and avoid adding sensitive or personal data to target
  pages.

The local worker requires the developer machine and its Redis connection to
remain available while a run is queued or executing. A deployed web app cannot
reach a worker running on your PC.
