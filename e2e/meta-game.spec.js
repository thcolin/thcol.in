import { expect, test } from '@playwright/test'

// The cinetropes meta-game band: a console that shows the cinema's rooms, then
// embeds the game. The game itself is tested in cinetropes; here, the band around it.

const band = (page) => page.locator('article.cg')
const screenLabel = (page) => band(page).locator('.cg__canvas').getAttribute('aria-label')

test.beforeEach(async ({ page }) => {
  await page.goto('/#projects')
  await band(page).scrollIntoViewIfNeeded()
  await expect(band(page).locator('.cg__canvas')).toBeVisible()
})

test('the cross and the rooms browse the cinema, from outside to the booth', async ({ page }) => {
  await band(page).getByRole('radio', { name: 'Booth' }).click()
  await expect.poll(() => screenLabel(page)).toContain('Booth')

  await band(page).getByRole('button', { name: 'Right' }).click()
  await expect.poll(() => screenLabel(page)).toContain('Booth, repaired')
  await band(page).getByRole('button', { name: 'Left' }).click()
  await expect.poll(() => screenLabel(page)).toContain('Booth, abandoned')
})

test('Start embeds the demo of the chosen cinema', async ({ page }) => {
  await band(page).getByRole('radio', { name: 'Shinjuku Cinema' }).click()
  await expect(band(page).getByRole('heading', { name: 'Shinjuku Cinema' })).toBeVisible()
  await band(page).getByRole('button', { name: 'Start the game' }).first().click()

  const game = band(page).locator('iframe.cg__game')
  await expect(game).toHaveAttribute('src', /\/play\?embed&facade=scene_cyberpunk_asian_urban_neo_tokyo$/)
  await expect(band(page).getByRole('button', { name: 'Restart' })).toBeVisible()
})

test('another cinema while a game is under way asks before starting over', async ({ page }) => {
  await band(page).getByRole('radio', { name: 'Le Champo' }).click()
  await band(page).getByRole('button', { name: 'Start the game' }).first().click()
  await band(page).getByRole('radio', { name: 'The Lunar' }).click()

  await expect(band(page).getByText('Your game is at Le Champo. Start over here?')).toBeVisible()
  await band(page).getByRole('button', { name: 'Back to Le Champo' }).click()
  await expect(band(page).getByRole('heading', { name: 'Le Champo' })).toBeVisible()
  await expect(band(page).locator('.cg__panel').getByRole('button', { name: 'Continue' })).toBeVisible()
})

test('the keyboard alone starts a game', async ({ page }) => {
  const start = band(page).locator('.cg__panel').getByRole('button', { name: 'Start the game' })
  await start.focus()
  await page.keyboard.press('Enter')
  await expect(band(page).locator('iframe.cg__game')).toBeVisible()
})

test.describe('with reduced motion', () => {
  test('the rooms stay still until asked', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload()
    await band(page).scrollIntoViewIfNeeded()
    await expect(band(page).locator('.cg__canvas')).toBeVisible()
    const before = await screenLabel(page)
    await page.waitForTimeout(3500)
    expect(await screenLabel(page)).toBe(before)
  })
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('the band fits the width', async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBe(0)
  })
})
