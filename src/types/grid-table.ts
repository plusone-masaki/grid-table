export interface GridTableHandle {
  selectRow: (rowIndex: number) => void
  selectColumn: (columnIndex: number) => void
  selectAll: () => void
}

export default GridTableHandle
