import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { pages, pageHtml, sitemap } from '../scripts/search-pages.mjs'

const template = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))

test('public entry routes get their own canonical and social metadata without JavaScript', () => {
  for (const page of pages) {
    const html = pageHtml(template, page)
    const canonical = `https://fieldreport.dearcc.org${page.path}`
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}"`), page.path)
    assert.ok(html.includes(`<meta property="og:url" content="${canonical}"`), page.path)
    assert.ok(html.includes(`content="${page.description}"`), page.path)
    assert.ok(html.includes('content="summary_large_image"'))
    assert.ok(html.includes('https://fieldreport.dearcc.org/brand/field-report-social.png'))
    assert.ok(!html.includes('content="noindex'), page.path)
    assert.equal(config.rewrites.find(rule => rule.source === page.path)?.destination, `/search-pages/${page.file}.html`)
  }
  // Dynamic result pages must not inherit an unrelated homepage canonical.
  assert.ok(!template.includes('rel="canonical"'))
  assert.ok(!template.includes('property="og:url"'))
})

test('crawler resources bypass the SPA; sitemap omits account gates and prototypes', () => {
  const fallback = new RegExp(`^${config.rewrites.at(-1).source}$`)
  for (const path of ['/robots.txt', '/sitemap.xml', '/brand/field-report-social.png', '/search-pages/home.html', '/api/v3/report', '/data/majors.json']) {
    assert.equal(fallback.test(path), false, path)
  }
  assert.equal(fallback.test('/results/11.0701'), true)
  assert.equal(readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8'), sitemap())
  for (const path of ['/dev/:path*', '/v4/:path*', '/v2/results/:path*', '/v3/results/:path*', '/v3/roles/report']) {
    assert.ok(config.headers.some(rule => rule.source === path && rule.headers.some(header => /noindex/.test(header.value))), path)
    assert.ok(!pages.some(page => page.path === path))
  }
})

test('staging exclusion survives generation of every public metadata document', () => {
  const preview = template.replace('<head>', '<head><meta name="robots" content="noindex, follow" />')
  for (const page of pages) assert.ok(pageHtml(preview, page).includes('content="noindex, follow"'))
})
