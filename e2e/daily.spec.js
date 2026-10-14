import { devices, expect, test } from '@playwright/test'

// The cinetropes daily band, on a phone: off thcol.in the beta's API refuses the
// page, and the band plays the sample daily

test.use({ ...devices['iPhone 13'] })

test('a tapped suggestion is staged, then sent', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('daily-onboarding-seen', 'true'))
  await page.goto('/#cinetropes-daily')

  const input = page.getByRole('combobox', { name: 'Search for a film' })
  await expect(input).toBeEnabled()
  await input.tap()
  await input.pressSequentially('alien')

  const option = page.getByRole('listbox', { name: 'Film suggestions' }).getByRole('option').nth(1)
  const title = await option.locator('.cd__option-title').textContent()
  await option.tap()
  await expect(input).toHaveValue(title)

  await page.getByRole('button', { name: 'Send' }).tap()
  await expect(page.locator('.cd__round.is-guess, .cd__round.is-suspense')).toHaveCount(1)
})
