import type { CSSProperties } from 'react'

interface CellSelectionProps {
  top: number
  left: number
  width: number
  height: number
  className?: string
  style?: CSSProperties
}

const CellSelection = ({
  top,
  left,
  width,
  height,
  className,
  style,
}: CellSelectionProps) => {
  const computedStyle: CSSProperties = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    height: `${height}px`,
    ...style,
  }

  return (
    <div
      aria-hidden="true"
      className={
        className
          ? `grid-table__selection-outline ${className}`
          : 'grid-table__selection-outline'
      }
      style={computedStyle}
    />
  )
}

export default CellSelection
