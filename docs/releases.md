# Releases

Work from main. Open a PR and inspect its Vercel preview; previews share staging services and test data. Merging to main runs CI, then Deploy staging builds that exact commit with the custom staging environment. The legacy staging branch is no longer a deployment source. The Vercel Git integration still handles PR previews, but main deployments belong to GitHub Actions.

After checking the shared staging site, open Actions → Release production → Run workflow, using main and leaving verify_only unchecked. There is no release PR or branch synchronization. You can batch several merges. The workflow pins main at click time and refuses to release until that exact commit has passed CI and is deployed to staging for every app in this repository. If a newer merge is not yet staged, wait for Deploy staging; it never silently substitutes another commit. Use verify_only for a read-only rehearsal.

GitHub's built-in required-reviewer deployment gate is unavailable on the current private-repository plan. Manually starting Release production is the release approval. Only trusted repository writers should have workflow access. Agents must not dispatch production releases without user authorization.

Each repository releases independently. DearCC includes its hub and admin console in one release. All production-configured candidates must build and pass a basic smoke check before the workflow promotes any of them. Never promote a staging-configured deployment directly. Project autoAssignCustomDomains must remain false. The production ignore-build guard blocks ordinary Git builds; only an explicitly approved production candidate carries RELEASE_APPROVED=true.

## Migrations and compatibility

Production retains the existing build-time migrations, after the manual release action and before promotion. Migrations must be additive/backward-compatible with the live apps. A failed build can leave completed schema changes in place. Do not add destructive migrations or depend on an unreleased API from another repository. Split cross-repository work into compatible steps and record the release order in the PR.

Shared staging and previews use restricted database credentials and do not run owner migrations. Schema-changing PRs still require the existing staging schema maintenance procedure before staging deployment can pass. This release setup does not grant previews database-owner access or introduce a new migration service. This is the remaining manual exception to the normal release flow.

## Failure and recovery

Before activation, live domains remain on the previous deployments. Once activation begins, a failure triggers an attempt to restore only this run's promoted apps, in reverse order, provided nobody else has changed the live deployment. This is best-effort recovery, not a transaction across projects. Cancellation, runner loss, promotion timeouts, or rollback failure require inspection. No database rollback or reversal of email/payment/Slack side effects is attempted.

Download the release artifact for selected commit, candidate IDs, previous deployment IDs and rollback outcomes. Inspect the live aliases before retrying. A release can be rebuilt from the same commit, so build migrations must remain idempotent. Avoid concurrent manual Vercel production changes. Use Vercel's rollback UI for emergency recovery to the recorded previous compatible deployment.

## Credentials

VERCEL_TOKEN is a project-scoped GitHub Actions secret. DearCC also uses VERCEL_ADMIN_TOKEN for its admin console. Tokens expire November 2, 2027; replace each scoped token before expiry. Application secrets remain in Vercel; workflows do not pull production database credentials. Do not expose deployment tokens to PR jobs or print API project responses. Existing Preview deployments retain their old settings until rebuilt.
