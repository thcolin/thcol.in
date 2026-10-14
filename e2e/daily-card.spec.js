import { expect, test } from '@playwright/test'

// The daily band's poster card, once the film is revealed: off thcol.in the band plays the sample daily

test('the revealed card zooms onto its back, and Escape puts it back', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('daily-onboarding-seen', 'true'))
  await page.goto('/#cinetropes-daily')

  const band = page.locator('article.cd')
  for (let i = 0; i < 6; i++) {
    await band.getByRole('button', { name: 'Skip' }).click()
  }

  await band.locator('.cd__card[role=button]').click()
  const zoom = page.locator('.cd__zoom')
  await expect(zoom.locator('.cd__zoom-sheet h3')).toBeVisible()
  await expect(zoom.locator('.cd__zoom-sheet h4')).toContainText(['Reception', 'Atmosphere'])

  await page.keyboard.press('Escape')
  await expect(zoom).toHaveCount(0)
})
