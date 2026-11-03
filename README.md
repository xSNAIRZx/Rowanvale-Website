# Rowanvale 19.3 — runnable private website starter

This package contains the actual Beta 19.3 app plus a working hosted entry point, not only a prompt. The visual redesign is still pending your direction choice. For an AI with limited file access, start with [AI_HANDOFF.txt](AI_HANDOFF.txt), then this README and [NEXT_PROJECT_BRIEF.md](NEXT_PROJECT_BRIEF.md). The AI can request individual source files as needed; no ZIP is required.

## What is implemented

- `hosting/server.cjs` starts the original application server privately on loopback and exposes an authenticated website gateway. Host and origin checks remain enforced. Verified browser origins are translated for the existing local intent contract; callers cannot bypass that contract by supplying an arbitrary Origin.
- The complete existing app and original catalog, barcode, artwork, ZIP and workspace handlers are retained. No framework rewrite or server-feature mock was substituted.
- Dockerfile, Compose persistent volume, an environment template and a Caddy HTTPS example are provided. No new runtime package is required.
- A browser-visible notice distinguishes browser-local collections from privately hosted artwork and explains backup migration.

**Audience:** one owner, one private server. HTTP Basic owner sign-in protects every app/API/artwork path; `/healthz` exposes only a minimal liveness result. No public visitor shares the owner's artwork cache. Do not distribute the owner credential to unrelated users or remove the gate to make a public multi-user service. Add proper independent user identities, authorization and storage namespaces before that expansion. The current account/profile UI still refers to browser-local app identities and optional configured cloud accounts; it does not replace the gateway's access boundary.

## Run locally

Use a currently supported Node LTS (the container uses Node 24). Development tools follow package-lock.json.

PowerShell, from this directory:

```powershell
$env:PUBLIC_URL = 'http://localhost:8080'
$env:PORT = '8080'
$env:ROWANVALE_WEB_USER = 'owner'
$env:ROWANVALE_WEB_PASSWORD = Read-Host 'Choose a unique owner password of at least 20 characters' -MaskInput
$env:ROWANVALE_DATA_DIR = Join-Path $env:LOCALAPPDATA 'RowanvaleWebsite'
npm run start:hosted
```

Open `http://localhost:8080` and enter the owner credentials in the browser's standard sign-in prompt. The Node entry point reads environment variables; it does not load `.env.hosted` automatically. Compose loads that file for container deployment. Older PowerShell versions without `-MaskInput` should use the host's secret manager or another secure environment-entry method.

The original desktop launcher remains available. Do not run the desktop and website servers on the same public port simultaneously. Browser data is separate for localhost, 127.0.0.1, different ports and the final HTTPS domain.

## Deploy on a Node/container host

1. Copy `.env.hosted.example` to `.env.hosted` and fill in PUBLIC_URL, owner username and a unique password of at least 20 characters. Never commit that filled file. Provider credentials are optional host secrets; unavailable providers must remain visibly unavailable rather than pretending to work.
2. Set PUBLIC_URL to the exact final HTTPS origin, including a nonstandard port if used. Remote HTTP origins are rejected. Terminate TLS at a trusted reverse proxy and preserve the original Host header. Forwarded headers are not trusted to establish origin or identity.
3. Run `docker compose up -d --build` on the server. Compose binds the container only to host loopback. The named volume `rowanvale-private` retains artwork across ordinary container replacement. Do not use `docker compose down -v` unless intentionally deleting that volume after a verified backup.
4. Adapt `Caddyfile.example` to the real DNS name and run Caddy on the host, or use the hosting provider's equivalent HTTPS ingress. Only the gateway port is exposed; the original backend uses a random loopback port inside the process/container.
5. If using a managed container host, configure its persistent volume at `/data/rowanvale`, its PORT convention, PUBLIC_URL, owner credentials and HTTPS ingress. A restartable container filesystem without a persistent volume is insufficient. Verify volume ownership permits the container's non-root `node` user to write.
6. Check `/healthz` at the final origin, then verify app sign-in, metadata lookup, selected-artwork caching, ZIP export/import and offline restart. Live provider requests depend on their availability, terms and any required owner-supplied API keys.

No hosting provider account, domain, TLS certificate or credentials is included. This package was not deployed. Docker image construction and production HTTPS must be verified on the chosen host. It cannot be deployed unchanged as a static GitHub Pages site or as a Worker-only site; it needs Node and persistent private storage. Do not upload `.env.hosted`, runtime storage or private backups to GitHub.

## Move existing data

On the old desktop app, export a JSON backup and, if needed, the private artwork ZIP. Keep those files and the old build. On the final website, use the existing Data & Beta import controls. Verify title counts, paused/dropped status, journal dates, workouts and selected covers. A hosted URL does not automatically receive localhost storage. Provider keys should be configured independently on the host, never put into a browser backup.

Collections, journals and most profile settings stay in browser localStorage by default; the private host retains artwork. Workspace ZIPs are generated on request, not a newly introduced cloud autosave system. Optional Supabase sync keeps its existing explicit setup; website hosting alone does not create cross-device sync or a social account service.

## Verification

```text
npm ci
npm run test:hosting
npm run test:hosting:browser
npm run check
```

Hosting tests use a temporary synthetic workspace and the real Node backend. They cover unauthenticated/wrong-owner rejection, host allowlist, origin and intent checks, static/server-source boundaries, real artwork ZIP export/import and feature assets. Browser checks use installed Chrome by default; set ROWANVALE_BROWSER to another compatible installed browser if needed. They exercise actual Basic sign-in, main views, same-origin resolver POST, mobile width and offline PWA restart with retained data. See hosting/BROWSER_RESULTS.json for observed checks and limits. Prior baseline evidence in docs describes the earlier desktop app and is not a fresh certification of this hosted package.

## Rollback and remaining work

Keep the unchanged Beta 19.3 desktop build and the previous server image. Export browser data and the artwork ZIP before upgrades. To roll back, run the prior image with the same persistent volume only if its data format remains compatible; otherwise restore the verified exported backup into an isolated prior volume. Keep the final website origin stable to retain browser storage.

The other AI should now: configure the actual host and secrets; verify real HTTPS, provider calls and persistent-volume restart; then follow NEXT_PROJECT_BRIEF.md through the design-direction checkpoint. Public multi-user accounts require a separate isolation design. The gateway password must stay private; Basic authentication uses browser-managed sessions and does not provide an in-app logout/account-management system. On shared computers, use a separate browser profile/private session and explicitly close it after use. Reassess this authentication design before any wider release.

## Build and repository readiness

Run npm ci, then npm run build. The complete source package is generated in build/Rowanvale_19.3.0 with a BUILD_MANIFEST.json containing file hashes. It includes the original app, private hosting gateway, Docker/Compose examples, tests, and AI project brief. This is a source package, not a static-only web export. See [REPOSITORY_READINESS.txt](REPOSITORY_READINESS.txt) for the source audit, verification results and remaining deployment/design decisions.
