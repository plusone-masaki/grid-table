import { type MutableRefObject, useEffect } from 'react'
import $ from 'jquery'
import type {
  WalkontableConstructor,
  WalkontableDataset,
  WalkontableInstance,
  WalkontableScrollbarConstructor,
} from 'types/walkontable'
import walkontableScriptUrl from 'walkontable/dist/walkontable.js?url'

const DEFAULT_FROZEN_COLUMN_WIDTH = 60

type JQueryWithBrowser = typeof $ & {
  browser?: {
    msie: boolean
    version: string
  }
}

const ensureLegacyBridge = (() => {
  let initialized = false

  return () => {
    if (initialized || typeof window === 'undefined') {
      return
    }

    const global = window as unknown as Record<string, unknown>
    const jquery = $ as JQueryWithBrowser

    if (!global.jQuery) {
      global.jQuery = jquery
    }

    if (!global.$) {
      global.$ = jquery
    }

    if (!jquery.browser) {
      // walkontable 0.2 relies on $.browser to detect legacy IE
      jquery.browser = {
        msie: false,
        version: '0',
      }
    }

    initialized = true
  }
})()

const ensureWalkontable = (() => {
  let loaded: Promise<void> | null = null

  return () => {
    if (!loaded) {
      loaded = new Promise<void>((resolve, reject) => {
        if (window.Walkontable) {
          resolve()
          return
        }

        const script = document.createElement('script')
        script.src = walkontableScriptUrl
        script.async = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Walkontable の読み込みに失敗しました'))
        document.body.appendChild(script)
      })
    }

    return loaded
  }
})()

const disablePseudoScrollbars = (() => {
  let patched = false

  return () => {
    if (patched || typeof window === 'undefined') {
      return
    }

    const global = window as unknown as Record<string, unknown>
    const Scrollbar = global.WalkontableScrollbar as WalkontableScrollbarConstructor | undefined

    if (!Scrollbar) {
      return
    }

    class DisabledScrollbar {
      instance: unknown
      type: 'vertical' | 'horizontal'
      visible: boolean
      skipRefresh: boolean
      dragdealer: null

      constructor(instance: unknown, type: 'vertical' | 'horizontal') {
        this.instance = instance
        this.type = type
        this.visible = false
        this.skipRefresh = true
        this.dragdealer = null
      }

      prepare() {
        this.visible = false
      }

      refresh() {}

      onScroll() {}

      getHandleSizeRatio() {
        return 1
      }

      destroy() {}
    }

    global.WalkontableScrollbar = DisabledScrollbar as unknown as WalkontableScrollbarConstructor
    patched = true
  }
})()

type UseWalkOnTableParams = {
  containerRef: MutableRefObject<HTMLDivElement | null>
  walkontableRef: MutableRefObject<WalkontableInstance | null>
  datasetRef: MutableRefObject<WalkontableDataset | null>
}

const emptyDataset: WalkontableDataset = {
  bodyRows: [],
  columnHeaders: [],
}

const useWalkOnTable = ({
  containerRef,
  walkontableRef,
  datasetRef,
}: UseWalkOnTableParams) => {
  useEffect(() => {
    ensureLegacyBridge()

    const container = containerRef.current
    if (!container) {
      return
    }

    const tableElement = document.createElement('table')
    tableElement.className = 'grid-table__walkontable'
    container.innerHTML = ''
    container.appendChild(tableElement)

    let cancelled = false

    const safeDataset = () => datasetRef.current ?? emptyDataset

    const initialise = async () => {
      await ensureWalkontable()
      if (cancelled) {
        return
      }

      const Walkontable = window.Walkontable as WalkontableConstructor | undefined
      if (!Walkontable) {
        throw new Error('Walkontable が global に見つかりません')
      }

      disablePseudoScrollbars()

      const width = container.clientWidth || undefined
      const height = container.clientHeight || undefined

      const instance = new Walkontable({
        table: tableElement,
        data(row: number, col: number) {
          const { bodyRows } = safeDataset()
          const rowData = bodyRows[row]
          if (!rowData) {
            return ''
          }
          const value = rowData[col]
          return value === null || value === undefined ? '' : value
        },
        totalRows() {
          return safeDataset().bodyRows.length
        },
        totalColumns() {
          return safeDataset().columnHeaders.length
        },
        columnHeaders(columnIndex: number, TH: HTMLTableCellElement) {
          const headers = safeDataset().columnHeaders
          const header = headers[columnIndex] ?? ''
          TH.className = 'wt-header wt-header-column'
          TH.textContent = header
        },
        frozenColumns: [
          (rowIndex: number | null, TH?: HTMLElement) => {
            if (rowIndex === null) {
              if (TH) {
                TH.className = 'wt-header wt-header-row'
                TH.textContent = ''
              }
              return
            }

            if (TH) {
              TH.className = 'wt-header wt-header-row'
              TH.textContent = String(rowIndex + 1)
            }

            return rowIndex + 1
          },
        ],
        columnWidth(column: number) {
          if (column === 0) {
            return DEFAULT_FROZEN_COLUMN_WIDTH
          }
          return undefined
        },
        width,
        height,
        async: false,
        stretchH: 'all',
        scrollH: 'none',
        scrollV: 'none',
      })

      walkontableRef.current = instance
      const wheelHandler = (event: WheelEvent) => {
        if (!walkontableRef.current) {
          return
        }

        const { deltaY, deltaX } = event
        let handled = false

        if (deltaY) {
          const magnitude = Math.max(1, Math.round(Math.abs(deltaY) / 40))
          const stepY = deltaY > 0 ? magnitude : -magnitude
          if (stepY !== 0) {
            walkontableRef.current.scrollVertical(stepY).draw()
            handled = true
          }
        }

        if (deltaX) {
          const magnitude = Math.max(1, Math.round(Math.abs(deltaX) / 40))
          const stepX = deltaX > 0 ? magnitude : -magnitude
          if (stepX !== 0) {
            walkontableRef.current.scrollHorizontal(stepX).draw()
            handled = true
          }
        }

        if (handled) {
          event.preventDefault()
        }
      }

      tableElement.addEventListener('wheel', wheelHandler, { passive: false })

      ;(instance as WalkontableInstance & {
        __wheelHandler?: (event: WheelEvent) => void
      }).__wheelHandler = wheelHandler

      instance.draw()
    }

    initialise().catch((error) => {
      console.error(error)
    })

    return () => {
      cancelled = true
      const currentInstance = walkontableRef.current as WalkontableInstance & {
        __wheelHandler?: (event: WheelEvent) => void
      }

      if (currentInstance?.__wheelHandler) {
        tableElement.removeEventListener('wheel', currentInstance.__wheelHandler)
      }

      if (currentInstance?.destroy) {
        currentInstance.destroy()
      }

      walkontableRef.current = null
      container.innerHTML = ''
    }
  }, [containerRef, datasetRef, walkontableRef])
}

export default useWalkOnTable
