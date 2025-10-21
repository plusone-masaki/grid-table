import { useEffect, useMemo, useRef } from 'react'
import type { ColumnPreset, GridDataset, GridRow, GridTableProps } from 'types/grid'
import type { WalkontableDataset, WalkontableInstance } from 'types/walkontable'
import 'walkontable/css/walkontable.css'
import './GridTable.css'
import useWalkOnTable from '../hooks/useWalkOnTable'

const toColumnHeader = (index: number): string => {
  let result = ''
  let num = index

  while (num >= 0) {
    result = String.fromCharCode(65 + (num % 26)) + result
    num = Math.floor(num / 26) - 1
  }

  return result
}

const resolveHeaderLabel = (
  preset: ColumnPreset,
  index: number,
  headerRow?: GridRow,
): string => {
  if (preset === 'numeric') {
    return String(index + 1)
  }

  if (preset === 'headers') {
    const rawValue = headerRow?.[index]
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return ''
    }
    return String(rawValue)
  }

  return toColumnHeader(index)
}

const useResolvedDataset = (data: GridDataset, headerType: ColumnPreset) =>
  useMemo(() => {
    if (headerType === 'headers' && data.length > 0) {
      const [firstRow, ...restRows] = data
      return {
        headerRow: firstRow,
        bodyRows: restRows,
      }
    }

    return {
      headerRow: undefined,
      bodyRows: data,
    }
  }, [headerType, data])

export const GridTable = ({
  data,
  headerType = 'alpha',
  className,
  style,
}: GridTableProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const walkontableRef = useRef<WalkontableInstance | null>(null)
  const datasetRef = useRef<WalkontableDataset | null>(null)

  const { headerRow, bodyRows } = useResolvedDataset(data, headerType)

  useWalkOnTable({
    containerRef,
    walkontableRef,
    datasetRef,
  })

  const columnCount = useMemo(() => {
    const rowsForMeasurement = headerRow ? [headerRow, ...bodyRows] : bodyRows
    return rowsForMeasurement.reduce(
      (max, row) => Math.max(max, row.length),
      headerRow ? headerRow.length : 0,
    )
  }, [headerRow, bodyRows])

  const columnHeaders = useMemo(
    () =>
      Array.from({ length: columnCount }, (_, index) =>
        resolveHeaderLabel(headerType, index, headerRow),
      ),
    [columnCount, headerType, headerRow],
  )

  useEffect(() => {
    datasetRef.current = {
      bodyRows,
      columnHeaders,
    }

    if (walkontableRef.current) {
      walkontableRef.current.draw()
    }
  }, [bodyRows, columnHeaders])

  const tableClassName = className ? `grid-table ${className}` : 'grid-table'

  return (
    <section className={tableClassName} role="grid" style={style}>
      <div className="grid-table__container" ref={containerRef} />
    </section>
  )
}

export default GridTable
