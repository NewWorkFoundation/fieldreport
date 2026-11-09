import test from 'node:test'
import assert from 'node:assert/strict'
import { gamePlanSignupUrl } from '../src/lib/gamePlanSignup.ts'

test('signup carries the report, not identity or arbitrary query parameters', () => {
  const url = new URL(gamePlanSignupUrl('https://www.dearcc.org', {
    version: 'v3', cip: '11.0701', major: 'Computer Science', zip: '94402',
    roles: [{ title: 'Software developer', soc: '15-1252' }],
    leadId: 'someone-else', email: 'someone@example.test', returnTo: 'https://evil.example',
  }))
  assert.equal(url.pathname, '/api/profile/gameplan-signup')
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    from: 'fieldreport', version: 'v3', cip: '11.0701', major: 'Computer Science', zip: '94402', role: 'Software developer', roleSoc: '15-1252',
  })
})

test('missing SOC codes preserve role pairing and malformed paths are not forwarded', () => {
  const url = new URL(gamePlanSignupUrl('https://www.dearcc.org', {
    version: 'public', cip: '../../evil', roles: [{ title: 'Designer' }, { title: 'Developer', soc: '15-1252' }],
  }))
  assert.equal(url.searchParams.has('cip'), false)
  assert.deepEqual(url.searchParams.getAll('roleSoc'), ['', '15-1252'])
})
