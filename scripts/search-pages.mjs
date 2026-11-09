// Titles and descriptions copied verbatim from the existing page metadata.
export const origin = 'https://fieldreport.dearcc.org'
export const pages = [
  { path: '/', file: 'home', title: 'Field Report', description: 'BLS salary data, projected annual openings, and AI-exposure scores for every U.S. degree.' },
  { path: '/receipts', file: 'receipts', title: 'How to read Field Report · Field Report', description: 'What Platinum entry ratings, core roles, hiring intensity, and the rest of the employer layer mean.' },
  { path: '/graphic', file: 'graphic', title: "Don't study to be a typist · Field Report", description: 'Illustration. A dead clerical field reallocates into Data Admin, word processing, and office roles.' },
  { path: '/v3/roles', file: 'roles', title: 'Choose your roles · Field Report', description: 'Rank the roles you want Field Report to evaluate.' },
]

const escape = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function pageHtml(html, page) {
  const url = `${origin}${page.path}`
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${escape(page.title)}</title>`)
    .replace(/(<meta\s+(?:name|property)="(?:og:title|twitter:title)"\s+content=")[^"]*/g, `$1${escape(page.title)}`)
    .replace(/(<meta\s+(?:name|property)="(?:description|og:description|twitter:description)"\s+content=")[^"]*/g, `$1${escape(page.description)}`)
    .replace('</head>', `<link rel="canonical" href="${url}" /><meta property="og:url" content="${url}" /></head>`)
}

export function sitemap() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(page => `  <url><loc>${origin}${page.path}</loc></url>`).join('\n')}\n</urlset>\n`
}
