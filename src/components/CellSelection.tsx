import type { CSSProperties } from 'react'

type SelectionVariant = 'outline' | 'fill' | 'anchor'

interface CellSelectionProps {
  top: number
  left: number
  width: number
  height: number
  variant?: SelectionVariant
  className?: string
  style?: CSSProperties
}

const CellSelection = ({
  top,
  left,
  width,
  height,
  variant = 'outline',
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

  const baseClass =
    variant === 'fill'
      ? 'grid-table__selection-fill'
      : variant === 'anchor'
        ? 'grid-table__selection-anchor-outline'
        : 'grid-table__selection-outline'

  const mergedClassName = className ? `${baseClass} ${className}` : baseClass

  return (
    <div
      aria-hidden="true"
      className={mergedClassName}
      style={computedStyle}
    />
  )
}

export default CellSelection
