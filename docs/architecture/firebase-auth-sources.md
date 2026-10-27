# Firebase Auth for the web with Next.js server sessions

Research note — 2026-10-26

## Recommended flow

1. Authenticate through Firebase's web SDK. Enable Email/Password in Firebase
   Console, then use `createUserWithEmailAndPassword` and
   `signInWithEmailAndPassword`. Firebase also recommends considering password
   policy and email-enumeration protection.
   Source: [Firebase password authentication](https://firebase.google.com/docs/auth/web/password-auth).
2. When the app uses server sessions, avoid retaining a second persistent
   client-side Firebase session. Firebase's session-cookie guide demonstrates
   setting client auth persistence to `NONE`, exchanging the resulting ID token
   with the server, then signing out from client Auth. For the modular SDK, use
   the equivalent in-memory persistence.
   Source: [Firebase manage session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies).
3. Exchange the Firebase ID token in a same-origin HTTPS Route Handler or
   Server Action. Verify the ID token and use the Admin SDK's
   `createSessionCookie(idToken, {expiresIn})`. Firebase's example checks that
   `auth_time` is recent (within five minutes) before issuing a cookie.
   Source: [Firebase manage session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies).
4. Set the session cookie as `HttpOnly`, `Secure` in HTTPS deployments,
   `SameSite=Lax`, and path `/`. Firebase allows session-cookie lifetimes from
   five minutes to two weeks. Next.js likewise recommends these protective
   cookie attributes.
   Sources: [Firebase manage session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies),
   [Next.js authentication](https://nextjs.org/docs/app/guides/authentication).

## Verify and authorize server requests

- Read the cookie with `await cookies()` from `next/headers`. Next.js permits
  cookie writes in Route Handlers and Server Actions, not while rendering a
  Server Component. Reading cookies makes the route request-time.
  Source: [Next.js `cookies`](https://nextjs.org/docs/app/api-reference/functions/cookies).
- Verify the cookie through Firebase Admin `verifySessionCookie`. Use its UID
  claim for data ownership checks. Firebase says protected sections must verify
  the session before serving restricted content.
  Source: [Firebase manage session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies).
- Centralize access checks in server-only data-access helpers and enforce
  authorization at each data and mutation boundary; a protected layout or
  hidden UI alone is not sufficient.
  Source: [Next.js authentication](https://nextjs.org/docs/app/guides/authentication).

## CSRF, logout, and revocation

- Protect the session-exchange endpoint against CSRF. Firebase's guide shows a
  double-submit CSRF token example. `SameSite=Lax` is an additional cookie
  defense, not a replacement for validating the request. A custom Route Handler
  must apply its own origin/CSRF check; do not assume Server Action protections
  cover it.
  Sources: [Firebase manage session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies),
  [Next.js Server Actions security](https://nextjs.org/docs/app/guides/server-actions).
- Ordinary logout clears the session cookie. For logout-everywhere or suspected
  compromise, Firebase Admin can revoke refresh tokens for a UID; this affects
  that user's other sessions too. Revocation-aware verification requires
  `verifySessionCookie(cookie, true)`.
  Sources: [Firebase manage session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies),
  [Firebase manage user sessions](https://firebase.google.com/docs/auth/admin/manage-sessions).
- Revocation checking makes an extra Auth-backend request. Choose it according
  to the security and latency requirements.
  Source: [Firebase manage user sessions](https://firebase.google.com/docs/auth/admin/manage-sessions).

## Admin credentials

- Keep Firebase Admin SDK initialization and credentials server-only.
  Firebase documents ID-token verification and session-cookie management as
  privileged Admin SDK operations.
  Sources: [Firebase Admin SDK setup](https://firebase.google.com/docs/admin/setup),
  [Firebase verify ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens).
- Prefer Application Default Credentials on Google-managed runtimes. For local
  development, use a service-account credential file outside the repository or
  configure ADC; never expose its private key through a client-facing variable.
  Source: [Firebase Admin SDK setup](https://firebase.google.com/docs/admin/setup).
- The current Admin Node SDK guide lists Node.js 22+ as a prerequisite.
  Source: [Firebase Admin SDK setup](https://firebase.google.com/docs/admin/setup).

## BugPilot data ownership

- Account profiles and project records are accessed through Firebase Admin on
  the server. Projects are stored beneath `users/{uid}/projects/{projectId}`;
  client Firestore access remains denied by `firestore.rules`.
- Project reads and writes use the authenticated session UID. Run creation
  verifies that the project belongs to that UID before writing the UID and
  project ID to the Neon run record.
- Firebase data is not cleared as part of removing UI fixtures. Existing
  profiles and persisted run records remain untouched.
