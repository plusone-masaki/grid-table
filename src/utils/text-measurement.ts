const FALLBACK_FONT = '14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
const FALLBACK_LETTER_SPACING = 0
const FALLBACK_PADDING_X = 8
const FALLBACK_BORDER_X = 2
const FALLBACK_LINE_HEIGHT = 24
const FALLBACK_CHAR_WIDTH = 8

interface MeasurementSnapshot {
  context: CanvasRenderingContext2D | null
  font: string
  letterSpacing: number
  paddingX: number
  borderX: number
  baseLineHeight: number
  lineIncrement: number
  signature: string
}

let measurementCell: HTMLTableCellElement | null = null
let snapshot: MeasurementSnapshot | null = null

const ensureMeasurementCell = (): HTMLTableCellElement | null => {
  if (typeof document === 'undefined') {
    return null
  }

  if (!measurementCell) {
    const table = document.createElement('table')
    table.className = 'grid-table__table'
    table.style.position = 'absolute'
    table.style.visibility = 'hidden'
    table.style.pointerEvents = 'none'
    table.style.top = '-10000px'
    table.style.left = '-10000px'

    const tbody = document.createElement('tbody')
    const row = document.createElement('tr')
    const cell = document.createElement('td')
    cell.textContent = 'sample'

    row.appendChild(cell)
    tbody.appendChild(row)
    table.appendChild(tbody)

    document.body.appendChild(table)
    measurementCell = cell
  }

  return measurementCell
}

const ensureSnapshot = (): MeasurementSnapshot => {
  if (snapshot) {
    return snapshot
  }

  if (typeof document === 'undefined') {
    snapshot = {
      context: null,
      font: FALLBACK_FONT,
      letterSpacing: FALLBACK_LETTER_SPACING,
      paddingX: FALLBACK_PADDING_X,
      borderX: FALLBACK_BORDER_X,
      baseLineHeight: FALLBACK_LINE_HEIGHT,
      lineIncrement: FALLBACK_LINE_HEIGHT,
      signature: 'fallback',
    }
    return snapshot
  }

  const cell = ensureMeasurementCell()
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!cell || !context) {
    snapshot = {
      context: null,
      font: FALLBACK_FONT,
      letterSpacing: FALLBACK_LETTER_SPACING,
      paddingX: FALLBACK_PADDING_X,
      borderX: FALLBACK_BORDER_X,
      baseLineHeight: FALLBACK_LINE_HEIGHT,
      lineIncrement: FALLBACK_LINE_HEIGHT,
      signature: 'fallback',
    }
    return snapshot
  }

  const computed = window.getComputedStyle(cell)
  const resolvedFont =
    computed.font && computed.font !== 'normal'
      ? computed.font
      : [
          computed.fontStyle,
          computed.fontVariant,
          computed.fontWeight,
          computed.fontSize,
          computed.fontFamily,
        ]
          .filter(Boolean)
          .join(' ') || FALLBACK_FONT

  const letterSpacing =
    computed.letterSpacing === 'normal'
      ? 0
      : Number.parseFloat(computed.letterSpacing || '0') ||
        FALLBACK_LETTER_SPACING

  const paddingLeft =
    Number.parseFloat(computed.paddingLeft || '0') || 0
  const paddingRight =
    Number.parseFloat(computed.paddingRight || '0') || 0
  const borderLeft =
    Number.parseFloat(computed.borderLeftWidth || '0') || 0
  const borderRight =
    Number.parseFloat(computed.borderRightWidth || '0') || 0
  const resolvedLineHeight =
    computed.lineHeight === 'normal'
      ? FALLBACK_LINE_HEIGHT
      : Number.parseFloat(computed.lineHeight || '0') ||
        FALLBACK_LINE_HEIGHT

  const paddingX = Math.max(paddingLeft + paddingRight, 0)
  const borderX = Math.max(borderLeft + borderRight, 0)

  const originalWhiteSpace = cell.style.whiteSpace
  const originalWidth = cell.style.width

  cell.style.whiteSpace = 'pre'
  cell.style.width = 'auto'
  cell.textContent = 'sample'
  const baseLineHeight = cell.getBoundingClientRect().height || resolvedLineHeight

  cell.style.whiteSpace = 'pre-wrap'
  cell.textContent = 'sample\nsample'
  const twoLineHeight =
    cell.getBoundingClientRect().height || baseLineHeight + resolvedLineHeight

  cell.textContent = ''
  cell.style.whiteSpace = originalWhiteSpace
  cell.style.width = originalWidth

  context.font = resolvedFont

  const lineIncrement = Math.max(twoLineHeight - baseLineHeight, baseLineHeight)

  snapshot = {
    context,
    font: resolvedFont,
    letterSpacing,
    paddingX,
    borderX,
    baseLineHeight,
    lineIncrement,
    signature: [
      resolvedFont,
      letterSpacing,
      paddingX,
      borderX,
      baseLineHeight,
      lineIncrement,
    ].join('|'),
  }

  return snapshot
}

const normalizeText = (value: string): string => (value.length === 0 ? ' ' : value)

export const measureTextContentWidth = (value: string): number => {
  const { context, letterSpacing } = ensureSnapshot()

  const normalized = normalizeText(value)

  if (!context) {
    return normalized.length * FALLBACK_CHAR_WIDTH
  }

  const metrics = context.measureText(normalized)
  const baseWidth = metrics.width
  if (!Number.isFinite(baseWidth)) {
    return normalized.length * FALLBACK_CHAR_WIDTH
  }

  const spacingCompensation =
    letterSpacing !== 0 && normalized.length > 1
      ? letterSpacing * (normalized.length - 1)
      : 0

  return baseWidth + spacingCompensation
}

export const getCellContentInsets = (): {
  padding: number
  border: number
  total: number
  baseLineHeight: number
  lineIncrement: number
} => {
  const {
    paddingX,
    borderX,
    baseLineHeight,
    lineIncrement,
  } = ensureSnapshot()
  return {
    padding: paddingX,
    border: borderX,
    total: paddingX + borderX,
    baseLineHeight,
    lineIncrement,
  }
}

export const computeWrappedLineCount = (
  value: string,
  contentWidth: number,
): number => {
  if (contentWidth <= 0) {
    return Math.max(1, value.split(/\r?\n/).length)
  }

  const segments = value.split(/\r?\n/)
  let totalLines = 0

  for (const segment of segments) {
    const normalized = normalizeText(segment)
    const width = measureTextContentWidth(normalized)
    const lines = Math.max(1, Math.ceil(width / contentWidth))
    totalLines += lines
  }

  return Math.max(totalLines, 1)
}
