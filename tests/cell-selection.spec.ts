import { expect, test } from '@playwright/test'

const getFirstDataCell = (page: import('@playwright/test').Page) =>
  page
    .locator('.grid-table__table.--master tbody tr')
    .first()
    .locator('td[role="gridcell"]')
    .first()

test.describe('セル選択（単一セル）', () => {
  test('クリックでセルが選択され、アウトラインが表示される', async ({ page }) => {
    await page.goto('/')

    const firstCell = getFirstDataCell(page)

    await expect(page.locator('.grid-table__selection-outline')).toHaveCount(0)
    await firstCell.click()

    await expect(firstCell).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.grid-table__selection-outline')).toBeVisible()
  })

  test('スクロール後も選択枠が維持される', async ({ page }) => {
    await page.goto('/')

    const firstCell = getFirstDataCell(page)
    await firstCell.click()

    const scrollContainer = page.locator('.grid-table__scroll')
    await scrollContainer.evaluate((element) => {
      element.scrollTop = 200
      element.scrollLeft = 200
    })

    await expect(page.locator('.grid-table__selection-outline')).toBeVisible()
  })
})
