import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const waitForGrid = async (page: Page) => {
  await page.goto('/')
  await page.waitForSelector('.grid-table__table.--master tbody tr', {
    state: 'attached',
  })
  await page.waitForFunction(() =>
    document.querySelectorAll('.grid-table__table.--master tbody tr').length > 0,
  )
}

const getColumnHeaderHandle = (page: Page, columnIndex: number) =>
  page
    .locator('.grid-table__table.--header thead th')
    .filter({ has: page.locator(`[data-column-index="${columnIndex}"]`) })
    .locator('.grid-table__column-resize-handle')

const getRowIndexHandle = (page: Page, rowIndex: number) =>
  page
    .locator('.grid-table__table.--number tbody th')
    .filter({ has: page.locator(`[data-row-index="${rowIndex}"]`) })
    .locator('.grid-table__row-resize-handle')

test.describe('列リサイズ', () => {
  test('ドラッグで列幅を拡大できる', async ({ page }) => {
    await waitForGrid(page)

    const headerCell = page.locator(
      '.grid-table__table.--header thead th[data-column-index="0"]',
    )
    await expect(headerCell).toBeVisible()
    const resizeHandle = getColumnHeaderHandle(page, 0)
    const initialWidth = await headerCell.evaluate(
      (node) => node.getBoundingClientRect().width,
    )
    const handleBox = await resizeHandle.boundingBox()
    if (!handleBox) {
      throw new Error('列リサイズハンドルの位置を取得できませんでした')
    }

    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
      handleBox.x + handleBox.width / 2 + 80,
      handleBox.y + handleBox.height / 2,
      { steps: 6 },
    )
    await page.mouse.up()
    await page.waitForTimeout(100)

    const resizedWidth = await headerCell.evaluate(
      (node) => node.getBoundingClientRect().width,
    )
    expect(resizedWidth).toBeGreaterThan(initialWidth + 20)
  })

  test('最小値未満に縮めようとしても下限でクランプされる', async ({ page }) => {
    await waitForGrid(page)

    const headerCell = page.locator(
      '.grid-table__table.--header thead th[data-column-index="1"]',
    )
    await expect(headerCell).toBeVisible()
    const resizeHandle = getColumnHeaderHandle(page, 1)
    const handleBox = await resizeHandle.boundingBox()
    if (!handleBox) {
      throw new Error('列リサイズハンドルの位置を取得できませんでした')
    }

    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
      handleBox.x + handleBox.width / 2 - 240,
      handleBox.y + handleBox.height / 2,
      { steps: 6 },
    )
    await page.mouse.up()
    await page.waitForTimeout(100)

    const resizedWidth = await headerCell.evaluate(
      (node) => node.getBoundingClientRect().width,
    )
    expect(resizedWidth).toBeGreaterThanOrEqual(79)
  })
})

test.describe('行リサイズ', () => {
  test('ドラッグで行の高さを拡大できる', async ({ page }) => {
    await waitForGrid(page)

    const rowCell = page.locator(
      '.grid-table__table.--number tbody th[data-row-index="0"]',
    )
    await expect(rowCell).toBeVisible()
    const resizeHandle = getRowIndexHandle(page, 0)
    const initialHeight = await rowCell.evaluate(
      (node) => node.getBoundingClientRect().height,
    )
    const handleBox = await resizeHandle.boundingBox()
    if (!handleBox) {
      throw new Error('行リサイズハンドルの位置を取得できませんでした')
    }

    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2 + 60,
      { steps: 6 },
    )
    await page.mouse.up()
    await page.waitForTimeout(100)

    const resizedHeight = await rowCell.evaluate(
      (node) => node.getBoundingClientRect().height,
    )
    expect(resizedHeight).toBeGreaterThan(initialHeight + 20)
  })

  test('最小値未満に縮めようとしても下限でクランプされる', async ({ page }) => {
    await waitForGrid(page)

    const rowCell = page.locator(
      '.grid-table__table.--number tbody th[data-row-index="1"]',
    )
    await expect(rowCell).toBeVisible()
    const resizeHandle = getRowIndexHandle(page, 1)
    const handleBox = await resizeHandle.boundingBox()
    if (!handleBox) {
      throw new Error('行リサイズハンドルの位置を取得できませんでした')
    }

    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2 - 120,
      { steps: 6 },
    )
    await page.mouse.up()
    await page.waitForTimeout(100)

    const resizedHeight = await rowCell.evaluate(
      (node) => node.getBoundingClientRect().height,
    )
    expect(resizedHeight).toBeGreaterThanOrEqual(21)
  })
})
