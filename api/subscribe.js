import { sendSubscribeEmail } from '../server/sendSubscribeEmail.mjs'

/**
 * Vercel serverless: POST /api/subscribe
 * Sends the Field Report welcome mail via the agent_product Resend key.
 */
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const { status, body: payload } = await sendSubscribeEmail(body)
  res.status(status).json(payload)
}
