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

The Results email CTA posts to `${VITE_LETTER_URL}/api/subscribe` (CORS enabled on that site). That enrolls the address in the weekly newsletter and emails a link to the current report.

## Deploy

- **Vercel** — import [skyspeak/fieldreport](https://github.com/skyspeak/fieldreport); set `VITE_LETTER_URL`.
- **GitHub Pages** — Actions build with `GITHUB_PAGES=true` (base `/fieldreport/`).

## Stack

Vite · React · TypeScript · Tailwind v4 · React Router · Framer Motion · d3-geo
