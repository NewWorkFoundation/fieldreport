import test from 'node:test'
import assert from 'node:assert/strict'
import { recordFieldReportUnlock } from '../src/lib/recordFieldReportUnlock.ts'
import { withoutIdentity, IDENTITY_PARAMS } from '../src/lib/identityParams.ts'

test('unlock sends credentials and roles, identifies only the server-confirmed viewer', async () => {
  const events = [], calls = []
  await recordFieldReportUnlock('https://dearcc.org', [{ soc: '15-1252', title: 'Developer' }], async (url, init) => {
    calls.push({url, init})
    return Response.json({ success: true, leadId: 'alice', recorded: true })
  }, id => events.push(id))
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://dearcc.org/api/profile/field-report-unlocked')
  assert.equal(calls[0].init.credentials, 'include')
  assert.deepEqual(JSON.parse(calls[0].init.body), { targetRoles: [{ soc: '15-1252', title: 'Developer' }] })
  assert.deepEqual(events, ['alice'])
})
test('anonymous and failed requests emit no member unlock', async () => {
  let events = 0
  await recordFieldReportUnlock('', [], async () => new Response(null, {status:401}), () => events++)
  await assert.rejects(recordFieldReportUnlock('', [], async () => new Response(null, {status:503}), () => events++))
  assert.equal(events, 0)
})
test('old link identity is removed while role selection survives', () => {
  const params = new URLSearchParams('roleSoc=15-1252&role=Developer&checklist=1')
  for (const key of IDENTITY_PARAMS) params.set(key, 'sender')
  const clean = withoutIdentity(params)
  for (const key of IDENTITY_PARAMS) assert.equal(clean.has(key), false)
  assert.equal(clean.get('roleSoc'), '15-1252')
  assert.equal(clean.get('checklist'), '1')
})

test('a previously recorded unlock does not emit another event', async () => {
  let events = 0
  await recordFieldReportUnlock('', [], async () => Response.json({leadId:'alice',recorded:false}), () => events++)
  assert.equal(events, 0)
})

import { profileBaseUrl } from '../src/lib/profileBaseUrl.ts'
test('production API requests use the canonical host without a preflight redirect', () => {
  assert.equal(profileBaseUrl('https://dearcc.org/'), 'https://www.dearcc.org')
  assert.equal(profileBaseUrl('https://www.dearcc.org'), 'https://www.dearcc.org')
  assert.equal(profileBaseUrl('http://127.0.0.1:3100/'), 'http://127.0.0.1:3100')
})
