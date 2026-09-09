import { composeSubscribeEmail } from './emailTemplates.mjs'
import { fetchSentEmail, sendSubscribeEmail } from './sendSubscribeEmail.mjs'

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export async function handleEmailPreview(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }
  const input = await readJson(req)
  json(res, 200, { created: composeSubscribeEmail(input) })
}

export async function handleEmailSent(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }
  if (req.method !== 'GET') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }
  const url = new URL(req.url || '', 'http://localhost')
  const { status, body } = await fetchSentEmail(url.searchParams.get('id') || '')
  json(res, status, body)
}

export async function handleSubscribe(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }
  const input = await readJson(req)
  const { status, body } = await sendSubscribeEmail(input)
  json(res, status, body)
}

/** Vite plugin — subscribe, preview, and sent lookup in local dev. */
export function subscribeApiPlugin() {
  return {
    name: 'field-report-subscribe-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0]
        try {
          if (url === '/api/subscribe') {
            await handleSubscribe(req, res)
            return
          }
          if (url === '/api/email/preview') {
            await handleEmailPreview(req, res)
            return
          }
          if (url === '/api/email/sent') {
            await handleEmailSent(req, res)
            return
          }
        } catch (e) {
          json(res, 500, {
            error: e instanceof Error ? e.message : 'email api failed',
          })
          return
        }
        next()
      })
    },
  }
}
