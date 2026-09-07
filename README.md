# dear[CC] Field report

Search a U.S. college major → linked occupations with BLS wages, openings, competition, and AI exposure.

## Develop

```bash
npm install
cp .env.example .env.local
# Set VITE_LETTER_URL to your NEXT / weekly updates site (for the email CTA)
npm run dev
```

## Deploy

- **Vercel** — import [skyspeak/fieldreport](https://github.com/skyspeak/fieldreport); set `VITE_LETTER_URL`.
- **GitHub Pages** — Actions build with `GITHUB_PAGES=true` (base `/fieldreport/`).

The Results/Map email CTA posts to `${VITE_LETTER_URL}/api/subscribe` (CORS enabled on that site).

## Stack

Vite · React · TypeScript · Tailwind v4 · React Router · Framer Motion · d3-geo
