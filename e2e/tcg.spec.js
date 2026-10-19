import { expect, test } from '@playwright/test'

// The cinetropes tcg band: a booster that gives way after a few taps, then its five cards,
// each turned by a tap and put away in its case by the next.

const band = (page) => page.locator('article.tcg')

const open = async (page) => {
  const pack = band(page).getByRole('button', { name: /Open the booster/ })
  const first = band(page).getByRole('button', { name: 'Card 1 of 5, flip' })

  await expect(band(page).locator('.tcg__film')).toHaveText(['', '', '', '', ''])
  for (let taps = 0; taps < 7 && !(await first.isVisible()); taps++) {
    // The sachet unmounts once it gives way: a tap that finds it gone has nothing left to do
    await pack.click({ timeout: 1000 }).catch(() => {})
  }
  await expect(first).toBeVisible()
}

test('the booster opens, and its five cards fill the five cases from Common to Legendary', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#projects')
  await band(page).scrollIntoViewIfNeeded()
  await open(page)

  for (let i = 1; i <= 5; i++) {
    await band(page).getByRole('button', { name: `Card ${i} of 5, flip` }).press('Enter')
    await band(page).getByRole('button', { name: new RegExp(`card ${i} of 5, put away$`) }).press('Enter')
  }

  await expect(band(page).locator('.tcg__film')).toHaveText(['Venom', 'Thor', 'Top Gun', 'Midsommar', 'Spirited Away'])
  await expect(band(page).getByRole('button', { name: /Open the booster/ })).toBeFocused()
})

test('a link to the band lands on it', async ({ page }) => {
  await page.goto('/#cinetropes-tcg')
  await expect(band(page)).toBeInViewport()
})

test('the card flies into its case over the glass, not under it', async ({ page }) => {
  await page.goto('/#projects')
  await band(page).scrollIntoViewIfNeeded()
  await open(page)

  const card = band(page).locator('.tcg__card')
  await card.press('Enter')
  await page.waitForTimeout(700)
  await card.press('Enter')

  // At the end of its flight, held there, the card is what the case's slot shows
  const shown = await page.evaluate(async () => {
    const flying = document.querySelector('.tcg__card.is-stowing')
    const flight = flying.getAnimations().find((animation) => animation.animationName === 'tcg-card-stow')
    flight.pause()
    flight.currentTime = 440
    flying.style.pointerEvents = 'auto'
    const slot = document.querySelector('.tcg__slot').getBoundingClientRect()
    return document.elementFromPoint(slot.x + slot.width / 2, slot.y + slot.height / 2)?.closest('.tcg__card') === flying
  })
  expect(shown).toBe(true)
})
