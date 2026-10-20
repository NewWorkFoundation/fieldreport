import { test, expect } from '@playwright/test'
const bob = '22222222-2222-4222-8222-222222222222'
const alice = '11111111-1111-4111-8111-111111111111'
const link = `/v3/roles/report?roleSoc=15-1252&role=Software%20developer&leadId=${bob}&email=bob@example.test&first=Bob`

test('forwarded report uses Alice session, strips Bob identity and records once', async ({ page }) => {
  const credits: object[] = []
  await page.route('**/api/profile/handoff', route => route.fulfill({ json: { authenticated: true, profile: { leadId: alice, email: 'alice@example.test', targetRoles: [] } } }))
  await page.route('**/api/profile/field-report-unlocked', async route => {
    credits.push(route.request().postDataJSON())
    await route.fulfill({ json: { success: true, leadId: alice } })
  })
  await page.goto(link)
  await expect.poll(() => credits.length).toBe(1)
  await expect(page.getByRole('heading', {name:'How your target roles compare'})).toBeVisible()
  expect(credits).toEqual([{ targetRoles: [{ soc: '15-1252', title: 'Software developer' }] }])
  await expect(page).not.toHaveURL(/leadId=|email=|first=/)
  const outgoing = await page.getByRole('link', {name:'Build your game plan'}).getAttribute('href')
  expect(outgoing).not.toMatch(/leadId=|email=|first=/)
  expect(credits).toHaveLength(1)
})
test('signed-out forwarded link stays gated and never credits Bob', async ({ page }) => {
  let credits = 0
  await page.route('**/api/profile/handoff', route => route.fulfill({ status: 401, json: { authenticated: false } }))
  await page.route('**/api/profile/field-report-unlocked', route => { credits++; return route.fulfill({status:401}) })
  await page.goto(link)
  await expect(page.getByRole('dialog', {name:'Join dearCC'})).toBeVisible()
  await expect(page.getByLabel('Email', {exact:true})).toHaveValue('')
  expect(credits).toBe(0)
  await expect(page).not.toHaveURL(/leadId=|email=|first=/)
})
test('old local signup access cannot credit a forwarded identity', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fr-v3-signup', '1'))
  await page.route('**/api/profile/handoff', route => route.fulfill({ status:401, json:{} }))
  const credits: object[] = []
  await page.route('**/api/profile/field-report-unlocked', route => { credits.push(route.request().postDataJSON()); return route.fulfill({status:401}) })
  await page.goto(link)
  await expect(page.getByRole('heading', {name:'How your target roles compare'})).toBeVisible()
  await expect.poll(() => credits.length).toBe(1)
  expect(JSON.stringify(credits)).not.toContain(bob)
})
