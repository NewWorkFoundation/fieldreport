# dear[CC] Field report

Search a U.S. college major → linked occupations with BLS wages, openings, competition, and AI exposure.

## Develop

```bash
npm install
cp .env.example .env.local
npm run dev
```

The dearCC profile checklist opens `/v3/roles` when the profile has no saved
roles and `/v3/roles/report` when it does. Ranked roles use repeated `roleSoc`
and `role` query parameters. `leadId`, `first`, `last`, `email`, and the optional
LinkedIn slug travel with them. An umbrella handoff skips the redundant signup
gate and reports both completion and the final ranking after the report opens. Set
`DEARCC_PROFILE_URL` and `PROFILE_SYNC_SECRET` as described in `.env.example`.
Local development defaults to `http://localhost:3000` and a local-only shared
secret, so running both development servers requires no additional setup.

The Results email CTA and signup forms POST to `/api/subscribe` on this app (Resend, `RESEND_API_KEY`). That emails a link to the current report. Preview and send the same template at `/dev/emails`.

## Deploy

- **Vercel** — import [NewWorkFoundation/fieldreport](https://github.com/NewWorkFoundation/fieldreport); set `RESEND_API_KEY`, `DEARCC_PROFILE_URL`, `PROFILE_SYNC_SECRET`, `BASE_URL`, and `VITE_GAMEPLAN_URL`. Do not set `DATABASE_URL`; Field Report writes profile progress through dearCC's server-only relay.
- **GitHub Pages** — Actions build with `GITHUB_PAGES=true` (base `/fieldreport/`).

## Stack

Vite · React · TypeScript · Tailwind v4 · React Router · Framer Motion · d3-geo
