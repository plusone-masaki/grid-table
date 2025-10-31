import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const waitForGrid = async (page: Page) => {
  await page.waitForSelector('.grid-table__table.--master tbody tr', {
    state: 'attached',
  })
  await page.waitForFunction(() =>
    document.querySelectorAll('.grid-table__table.--master tbody tr').length > 0,
  )
}

const getFirstDataCell = (page: Page) =>
  page
    .locator('.grid-table__table.--master tbody tr')
    .first()
    .locator('td[role="gridcell"]')
    .first()

const getNthCell = (page: Page, rowIndex: number, columnIndex: number) =>
  page.locator('.grid-table__table.--master tbody tr').nth(rowIndex).locator('td[role="gridcell"]').nth(columnIndex)

test.describe('セル選択（単一セル）', () => {
  test('クリックでセルが選択され、アンカー枠が表示される', async ({ page }) => {
    await page.goto('/')
    await waitForGrid(page)

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
    await waitForGrid(page)

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
    await waitForGrid(page)

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

    await startHandle.dispose()
    await endHandle.dispose()

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
    await waitForGrid(page)

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

test.describe('セル編集', () => {
  test('ダブルクリックで編集し、別セルクリックで確定する', async ({ page }) => {
    await page.goto('/')
    await waitForGrid(page)

    const firstCell = getNthCell(page, 0, 0)
    const secondCell = getNthCell(page, 0, 1)

    await firstCell.dblclick()

    const editor = page.locator('.grid-table__cell-editor')
    await expect(editor).toBeVisible()
    await expect(editor).toHaveValue('0')

    await editor.fill('編集テキスト')
    await secondCell.click()

    await expect(editor).toHaveCount(0)
    await expect(firstCell).toHaveText('編集テキスト')
    await expect(secondCell).toHaveAttribute('aria-selected', 'true')
  })

  test('編集中にスクロールすると編集内容が確定する', async ({ page }) => {
    await page.goto('/')
    await waitForGrid(page)

    const targetCell = getNthCell(page, 0, 2)

    await targetCell.dblclick()

    const editor = page.locator('.grid-table__cell-editor')
    await expect(editor).toBeVisible()
    await editor.fill('スクロール確定')

    const scrollContainer = page.locator('.grid-table__scroll')
    await scrollContainer.evaluate((element) => {
      element.scrollTop = 200
    })

    await expect(editor).toHaveCount(0)
    await scrollContainer.evaluate((element) => {
      element.scrollTop = 0
    })
    await waitForGrid(page)
    await expect(targetCell).toHaveText('スクロール確定')
  })

  test('文字幅が現在の幅を超えた場合のみエディタ幅が広がる', async ({ page }) => {
    await page.goto('/')
    await waitForGrid(page)

    const targetCell = getNthCell(page, 1, 0)
    await targetCell.dblclick()

    const editor = page.locator('.grid-table__cell-editor')
    await expect(editor).toBeVisible()

    await editor.fill('')
    await expect(editor).toHaveValue('')

    const baselineWidth = await editor.evaluate((node) => node.getBoundingClientRect().width)

    await editor.type('1')
    const widthAfterSingleChar = await editor.evaluate((node) => node.getBoundingClientRect().width)

    expect(widthAfterSingleChar).toBeLessThanOrEqual(baselineWidth + 1)

    await editor.type('2345678901234567890123456789012345678901234567890')
    const widthAfterLongInput = await editor.evaluate((node) =>
      node.getBoundingClientRect().width,
    )

    expect(widthAfterLongInput).toBeGreaterThan(widthAfterSingleChar)

    await page.keyboard.press('Enter')
  })
})
