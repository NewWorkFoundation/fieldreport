# Field Report tracking and deployment

Canonical dictionary: [dear-cc/docs/tracking.md](https://github.com/NewWorkFoundation/dear-cc/blob/main/docs/tracking.md).

Both V2 and V3 gates emit shown, submitted, failed, gate-unlocked and report-viewed events. `field_report_gate_unlocked` counts a visible locked-to-unlocked transition; the existing `field_report_unlocked` event counts first account credit confirmed by the signed-in hub endpoint. These are different milestones and must not be summed. V3 does not count the sign-in check as a gate impression. A network/non-2xx subscription response is a failure even though the current best-effort UX still unlocks the report. Never interpret gate unlock as account creation or verified ownership. Returning to an already unlocked report emits a view without another submission. Only version and fixed failure categories/status leave the form; names, emails and LinkedIn values do not.

Production: existing Vercel project `new-work-foundation/agent_product`, domain `fieldreport.dearcc.org`, repository `NewWorkFoundation/fieldreport`, branch `main`. Build with `npm ci` then `npm run build`, output `dist`, Vite framework, no root-directory override. `.github/workflows/check.yml` checks PRs and main. Existing GitHub Pages workflow is separate and unchanged.

Use Vercel Git integration to create previews on PRs and production deployments after main merges; no laptop deployment is needed. The Git connection and production branch were verified during this implementation. Preserve existing environment variables/custom domains. Preview analytics should be disabled (`VITE_POSTHOG_ENABLED=false`) or use a test project. Vite maps Vercel’s supplied `VERCEL_ENV` to the analytics environment automatically (`preview` or `production`). Verify Git connection, production branch, PR preview, `/v3`, and gate events after merge.

Run `npm run lint`, `npm run build`, and the hub's `npm run test:cross-site` with sibling checkouts for browser payload regression tests. The existing forwarded-link ownership/ZIP-redaction roadmap items are separate; these events intentionally do not certify identity or send location properties.
