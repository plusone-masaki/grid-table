import { expect, test } from '@playwright/test'

const getFirstDataCell = (page: import('@playwright/test').Page) =>
  page
    .locator('.grid-table__table.--master tbody tr')
    .first()
    .locator('td[role="gridcell"]')
    .first()

const getNthCell = (
  page: import('@playwright/test').Page,
  rowIndex: number,
  columnIndex: number,
) =>
  page.locator('.grid-table__table.--master tbody tr').nth(rowIndex).locator('td[role="gridcell"]').nth(columnIndex)

test.describe('セル選択（単一セル）', () => {
  test('クリックでセルが選択され、アンカー枠が表示される', async ({ page }) => {
    await page.goto('/')

    const firstCell = getFirstDataCell(page)

    const anchorOutline = page.locator('.grid-table__selection-anchor-outline')
    const rangeOutline = page.locator('.grid-table__selection-outline')

    await expect(anchorOutline).toHaveCount(0)
    await expect(rangeOutline).toHaveCount(0)
    await firstCell.click()

    await expect(firstCell).toHaveAttribute('aria-selected', 'true')
    await expect(anchorOutline).toHaveCount(1)
    await expect(anchorOutline).toBeVisible()
    await expect(rangeOutline).toHaveCount(0)
  })

  test('スクロール後もアンカー枠が維持される', async ({ page }) => {
    await page.goto('/')

    const firstCell = getFirstDataCell(page)
    await firstCell.click()

    const scrollContainer = page.locator('.grid-table__scroll')
    await scrollContainer.evaluate((element) => {
      element.scrollTop = 200
      element.scrollLeft = 200
    })

    await expect(page.locator('.grid-table__selection-anchor-outline')).toBeVisible()
    await expect(page.locator('.grid-table__selection-outline')).toHaveCount(0)
  })
})

test.describe('セル選択（範囲選択）', () => {
  test('ドラッグで矩形範囲を選択すると塗りつぶしと外枠が表示される', async ({ page }) => {
    await page.goto('/')

    const startCell = getNthCell(page, 0, 0)
    const endCell = getNthCell(page, 2, 2)

    const startHandle = await startCell.elementHandle()
    const endHandle = await endCell.elementHandle()

    if (!startHandle || !endHandle) {
      throw new Error('セル要素を取得できませんでした')
    }

    const startRect = await startHandle.evaluate((node) => {
      const rect = node.getBoundingClientRect()
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    })

    const endRect = await endHandle.evaluate((node) => {
      const rect = node.getBoundingClientRect()
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    })

    await page.mouse.move(startRect.x, startRect.y)
    await page.mouse.down({ button: 'left' })
    await page.mouse.move(endRect.x, endRect.y, { steps: 5 })
    await page.mouse.up({ button: 'left' })

    const fillOverlay = page.locator('.grid-table__selection-fill')
    const outlineOverlay = page.locator('.grid-table__selection-outline')

    await expect(fillOverlay).toHaveCount(1)
    await expect(outlineOverlay).toHaveCount(1)
    await expect(fillOverlay).toBeVisible()
    await expect(outlineOverlay).toBeVisible()

    const selectedCells = page.locator('.grid-table__cell--selected')
    await expect(selectedCells).toHaveCount(9)
  })

  test('Shift + クリックで矩形範囲を拡張できる', async ({ page }) => {
    await page.goto('/')

    const startCell = getNthCell(page, 1, 1)
    const targetCell = getNthCell(page, 3, 2)

    await startCell.click()

    await page.keyboard.down('Shift')
    await targetCell.click()
    await page.keyboard.up('Shift')

    const fillOverlay = page.locator('.grid-table__selection-fill')
    const outlineOverlay = page.locator('.grid-table__selection-outline')
    const anchorOutline = page.locator('.grid-table__selection-anchor-outline')

    await expect(fillOverlay).toHaveCount(1)
    await expect(outlineOverlay).toHaveCount(1)
    await expect(anchorOutline).toHaveCount(1)

    const selectedCells = page.locator('.grid-table__cell--selected')
    await expect(selectedCells).toHaveCount((3 - 1 + 1) * (2 - 1 + 1))
  })
})
