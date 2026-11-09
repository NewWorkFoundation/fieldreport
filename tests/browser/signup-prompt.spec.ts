import { test, expect, type Page } from '@playwright/test'

const report = '/v3/results/11.0701'
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Let’s get you hired.' })

async function readAndScroll(page: Page) {
  await expect(page.getByRole('heading', { name: /The job market for/ })).toBeVisible()
  await page.waitForTimeout(2700)
  await page.mouse.wheel(0, 350)
  await expect(dialog(page)).toBeVisible()
  await page.screenshot({ path: 'test-results/signup-prompt-desktop.png' })
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/profile/handoff', route => route.fulfill({ status: 401, json: { authenticated: false } }))
})

test('first search stays readable until scrolling, then prompts once with a real signup link', async ({ page }) => {
  await page.goto('/v3')
  await page.getByRole('combobox').fill('Computer Science')
  await page.getByRole('combobox').press('Enter')
  await expect(page).toHaveURL(/\/v3\/results\//)
  await expect(page.getByRole('heading', { name: /The job market for/ })).toBeVisible()
  await page.waitForTimeout(2700)
  await expect(dialog(page)).not.toBeVisible()
  await page.mouse.wheel(0, 350)
  await expect(dialog(page)).toBeVisible()
  const signup = new URL((await page.getByRole('link', { name: 'Join dearCC for free' }).getAttribute('href'))!)
  expect(signup.origin).toBe('http://127.0.0.1:3100')
  expect(signup.pathname).toBe('/api/profile/gameplan-signup')
  expect(signup.searchParams.get('from')).toBe('fieldreport')
  expect(signup.searchParams.get('cip')).toBe('11.0701')
  expect(signup.searchParams.get('major')).toMatch(/Computer Science/i)
  await expect(page.getByRole('button', { name: 'Close signup prompt' })).toBeFocused()
  await page.getByRole('button', { name: 'Close signup prompt' }).click()
  await expect(dialog(page)).not.toBeVisible()
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  await page.getByRole('link', { name: '← Back', exact: true }).click()
  await page.getByRole('combobox').fill('Accounting')
  await page.getByRole('combobox').press('Enter')
  await expect(page.getByRole('heading', { name: /The job market for/ })).toBeVisible()
  await page.waitForTimeout(2700)
  await page.mouse.wheel(0, 500)
  await expect(dialog(page)).not.toBeVisible()
  await page.reload()
  await page.waitForTimeout(2700)
  await page.mouse.wheel(0, 500)
  await expect(dialog(page)).not.toBeVisible()
})

test('public reports support keyboard dismissal and restore focus', async ({ page }) => {
  await page.goto('/results/11.0701')
  await expect(page.getByRole('heading', { name: /The job market for/ })).toBeVisible()
  const back = page.getByRole('link', { name: '← Back', exact: true })
  await back.focus()
  await readAndScroll(page)
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Keep exploring Field Report' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Close signup prompt' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog(page)).not.toBeVisible()
  await expect(back).toBeFocused()
})

test('mobile prompt fits the viewport and Keep exploring dismisses it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 })
  await page.goto(report)
  await readAndScroll(page)
  const box = await dialog(page).boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.width + box!.x).toBeLessThanOrEqual(390)
  expect(box!.height + box!.y).toBeLessThanOrEqual(667)
  await page.screenshot({ path: 'test-results/signup-prompt-mobile.png' })
  await page.getByRole('button', { name: 'Keep exploring Field Report' }).click()
  await expect(dialog(page)).not.toBeVisible()
})

test('signed-in members never see a signup prompt', async ({ page }) => {
  await page.route('**/api/profile/handoff', route => route.fulfill({ json: { authenticated: true, profile: { leadId: '11111111-1111-4111-8111-111111111111', fieldReportCompleted: true } } }))
  await page.goto(report)
  await expect(page.getByRole('heading', { name: /The job market for/ })).toBeVisible()
  await page.waitForTimeout(2700)
  await page.mouse.wheel(0, 500)
  await expect(dialog(page)).not.toBeVisible()
})

test('loading and empty reports never prompt', async ({ page }) => {
  let release!: () => void
  const loading = new Promise<void>(resolve => { release = resolve })
  await page.route('**/data/occupations.json', async route => {
    await loading
    await route.fulfill({ json: [] })
  })
  await page.goto(report)
  await expect(page.getByText('Loading data...', { exact: true })).toBeVisible()
  await page.waitForTimeout(2700)
  await page.mouse.wheel(0, 500)
  await expect(dialog(page)).not.toBeVisible()
  release()
  await expect(page.getByText('Loading data...', { exact: true })).not.toBeVisible()
  await page.waitForTimeout(2700)
  await page.mouse.wheel(0, 500)
  await expect(dialog(page)).not.toBeVisible()
})

test('role reports remain free and show the same optional prompt', async ({ page }) => {
  await page.goto('/v3/roles/report?roleSoc=15-1252&role=Software%20developer')
  await expect(page.getByRole('heading', { name: 'How your target roles compare' })).toBeVisible()
  await page.waitForTimeout(2700)
  await page.mouse.wheel(0, 350)
  await expect(dialog(page)).toBeVisible()
  const signup = new URL((await page.getByRole('link', { name: 'Join dearCC for free' }).getAttribute('href'))!)
  expect(signup.searchParams.getAll('roleSoc')).toEqual(['15-1252'])
  expect(signup.searchParams.getAll('role')).toEqual(['Software developers'])
  await page.mouse.click(5, 5)
  await expect(dialog(page)).not.toBeVisible()
})

test('scrolling immediately still gives the visitor time to see the results', async ({ page }) => {
  await page.goto(report)
  await expect(page.getByRole('heading', { name: /The job market for/ })).toBeVisible()
  await page.mouse.wheel(0, 350)
  await page.waitForTimeout(400)
  await expect(dialog(page)).not.toBeVisible()
  await expect(dialog(page)).toBeVisible({ timeout: 4000 })
})

test('unavailable storage does not block browsing or repeat the prompt during navigation', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage unavailable') }
    Storage.prototype.setItem = () => { throw new Error('Storage unavailable') }
  })
  await page.goto(report)
  await readAndScroll(page)
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: '← Back', exact: true }).click()
  await page.getByRole('combobox').fill('Accounting')
  await page.getByRole('combobox').press('Enter')
  await expect(page.getByRole('heading', { name: /The job market for/ })).toBeVisible()
  await page.waitForTimeout(2700)
  await page.mouse.wheel(0, 350)
  await expect(dialog(page)).not.toBeVisible()
})
