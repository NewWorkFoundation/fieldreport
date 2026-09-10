# Shared database plan

## Intended boundary

Field Report is part of the shared dear-cc product database design, but it
does not connect to Postgres directly and has no tables to migrate. It records
its completion state by calling dear-cc's authenticated
`/api/profile/progress` endpoint. dear-cc stores that state in its canonical
`leads` profile record.

dear-cc and Gameplan will use the existing Gameplan Neon database as their
shared production host, while continuing to own separate tables. This does not
merge user accounts or authentication across products.

Crew and mentor matching remain one flow inside Gameplan. After the matching
questionnaire is submitted, Gameplan reports the `crew_match` milestone to the
canonical dear-cc profile.

## What remains before cutover

1. No `DATABASE_URL` is needed in Field Report.
2. In each deployed environment, set `DEARCC_PROFILE_URL` to the matching
   dear-cc deployment and set the same `PROFILE_SYNC_SECRET` there and in
   dear-cc. Keep the secret out of Git.
3. After dear-cc has migrated its schema and data into the Gameplan Neon
   database, test a complete
   Field Report flow and confirm the profile-progress request succeeds.
4. Verify the selected target roles and `field_report_completed_at` are saved
   on the matching dear-cc `leads` record.

The Field Report milestone means the user has unlocked and viewed a results
route. Selecting roles or merely following the outbound link does not complete
it. The relay includes the handoff email when available so dear-cc can verify
that the `leadId` belongs to the same profile.

## Safety boundary

Field Report must keep using the relay rather than exposing a database URL or
database credentials to the Vite client.

## Complete local flow

Run `npm run dev:local` from the sibling `dear-cc` repository. Its local
harness starts Field Report on port 5173, points the Gameplan handoff to port
5174, and points the completion relay at dear-cc on port 3002. See
`dear-cc/docs/local-profile-flow.md` for the click-through.
