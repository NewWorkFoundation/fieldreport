# Field Report session credit (roadmap ID 3)

Production source confirmed on 2026-10-20 UTC: `fieldreport.dearcc.org` aliases
Vercel project `agent_product` (`prj_ChLFx2a8PCMiSfqQFdQ6spNbzA1T`) in
`new-work-foundation`. Deployment `dpl_8V4dVctcMsZQP42ap6yiQnS5HtrM` records
CLI source, repository `NewWorkFoundation/fieldreport`, main commit
`eea41f8a0714cc44d1a15d082211ad18e32af546`. The project has no Git link.
This identifies the checkout recorded at deployment; CLI metadata does not prove
there were no uncommitted local changes. Current main also includes the later
analytics identity changes, which must be included in release review.

## Behavior

The hub's POST `/api/profile/field-report-unlocked` uses the signed account cookie,
requires an allowed Origin and JSON, accepts only selected roles, and preserves
the first completion timestamp. Neither body nor query parameters select the
credited account. The old secret-authenticated progress endpoint rejects
`field_report` even for authorized relays. Game Plan/crew progress remains supported.

Field Report ignores and removes identity parameters from old links, does not
use them to unlock or prefill signup, and removes the anonymous progress relay.
It sends one request per mounted unlocked report. The browser event identifies
the account returned by the server. Existing local signup access still opens the
report; without a signed-in hub session, it receives no member credit.
Selected roles and the checklist return route remain available.

## Validation

Hub: `npm run test:accounts`, lint, typecheck. Tests use local Postgres and real
session lookup: Alice opening Bob's link credits only Alice; repeats preserve
the first timestamp; anonymous requests, untrusted origins, plain-text requests,
body identity injection and the old relay path cannot write a completion.

Field Report: `npm test`, `npm run test:browser`, lint and production build.
Browser tests cover forwarded links, anonymous gating, local signup access,
identity removal, outgoing Game Plan URLs and one request despite rerenders.

Cross-app test (both checkouts required; free ports 3100 and 5183):

```sh
LOCAL_DATABASE_URL=postgresql://...@127.0.0.1:5432/test_db \
FIELDREPORT_DIR=/path/to/fieldreport node tests/cross-site/field-report-unlock.mjs
```

Run from the hub checkout. The script starts local servers, seeds synthetic
accounts, exercises real browser CORS and cookies, verifies the database, then
removes its own fixtures and stops the servers. Never use production credentials.

## Release (approval required)

1. Review both PRs and deploy the hub endpoint/removal first.
2. Immediately deploy the reviewed Field Report commit to `agent_product` via CLI.
   A GitHub merge or GitHub Pages build does not update this Vercel production site.
3. Verify allowed-origin preflight, signed-out rejection, and old relay rejection;
   confirm the reviewed deployment and domain aliases. Use an approved test
   account for any production unlock test.
4. Refresh affected PostHog reporting tables and rerun the weekly reconciliation.

Between the two releases, the old client cannot record unlocks (it can still
show reports). Coordinate releases to keep this window short. Do not restore
the insecure relay as a rollback. Historical credits remain unchanged because
the completion timestamp alone cannot identify the actual past viewer.
