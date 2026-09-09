# dear[CC] Field report

Search a U.S. college major → linked occupations with BLS wages, openings, competition, and AI exposure.

## Develop

```bash
npm install
cp .env.example .env.local
npm run dev
```

The Results email CTA and signup forms POST to `/api/subscribe` on this app (Resend, `RESEND_API_KEY`). That emails a link to the current report. Preview and send the same template at `/dev/emails`.

## Deploy

- **Vercel** — import [skyspeak/fieldreport](https://github.com/skyspeak/fieldreport); set `RESEND_API_KEY`.
- **GitHub Pages** — Actions build with `GITHUB_PAGES=true` (base `/fieldreport/`).

## Stack

Vite · React · TypeScript · Tailwind v4 · React Router · Framer Motion · d3-geo
