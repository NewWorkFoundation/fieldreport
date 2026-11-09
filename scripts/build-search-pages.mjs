import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { pages, pageHtml, sitemap } from './search-pages.mjs'

// Separate documents give unfurl bots metadata without running the SPA. Do not
// put a homepage canonical into the shared fallback for dynamic result routes.
const html = await readFile('dist/index.html', 'utf8')
await mkdir('dist/search-pages', { recursive: true })
for (const page of pages) {
  await writeFile(`dist/search-pages/${page.file}.html`, pageHtml(html, page))
}
await writeFile('dist/sitemap.xml', sitemap())
