import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cleanUrl, stripUrlDetails } from '../src/lib/url-redaction.ts'

test('tokens and ZIPs are removed from current, initial, referring and pathname properties', () => {
  for (const key of ['$current_url', '$initial_current_url', '$referrer', '$initial_referrer', '$session_entry_url', '$session_entry_referrer', '$pathname', '$session_entry_pathname']) {
    for (const path of ['/guest/invite/SECRET', '/results/11.0701/94110', '/v2/results/11.0701/94110', '/v3/results/11.0701/94110', '/v4/results/11.0701/94110', '/v4/compare/11.0701/94110/10001']) {
      const props = { [key]: 'https://example.test' + path + '?email=person@example.test#secret' }
      stripUrlDetails(props)
      assert.doesNotMatch(JSON.stringify(props), /SECRET|94110|10001|person@|#secret/)
    }
  }
  assert.equal(cleanUrl('$direct'), '$direct')
  assert.equal(cleanUrl('/v4/results/11.0701/place'), '/v4/results/11.0701/place')
  assert.equal(cleanUrl('/episodes/software?source=home'), '/episodes/software')
})

test('nested identify properties redact first-touch data', () => {
 const properties = {$set: {$initial_current_url:'https://example.test/guest/invite/SECRET'}, $set_once: {$initial_referrer:'https://example.test/v3/results/11/94110'}}
 stripUrlDetails(properties)
 assert.doesNotMatch(JSON.stringify(properties), /SECRET|94110/)
})
