# dear[CC] Field report

Search a U.S. college major → linked occupations with BLS wages, openings, competition, and AI exposure.

## Develop

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Deploy

- **Vercel** — import [skyspeak/fieldreport](https://github.com/skyspeak/fieldreport).
- **GitHub Pages** — Actions build with `GITHUB_PAGES=true` (base `/fieldreport/`).

## Stack

Vite · React · TypeScript · Tailwind v4 · React Router · Framer Motion · d3-geo
