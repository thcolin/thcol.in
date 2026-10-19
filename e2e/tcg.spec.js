import { expect, test } from '@playwright/test'

// The cinetropes tcg band: a booster that gives way after a few taps, then its five cards,
// each turned by a tap and put away in its case by the next.

const band = (page) => page.locator('article.tcg')

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#projects')
  await band(page).scrollIntoViewIfNeeded()
})

test('the booster opens, and its five cards fill the five cases from Common to Legendary', async ({ page }) => {
  const pack = band(page).getByRole('button', { name: /Open the booster/ })
  await expect(band(page).locator('.tcg__film')).toHaveText(['', '', '', '', ''])

  for (let taps = 0; taps < 7 && await pack.isVisible(); taps++) {
    await pack.click()
  }

  for (let i = 1; i <= 5; i++) {
    await band(page).getByRole('button', { name: `Card ${i} of 5, flip` }).press('Enter')
    await band(page).getByRole('button', { name: new RegExp(`card ${i} of 5, put away$`) }).press('Enter')
  }

  await expect(band(page).locator('.tcg__film')).toHaveText(['Venom', 'Thor', 'Top Gun', 'Midsommar', 'Spirited Away'])
  await expect(pack).toBeFocused()
})
