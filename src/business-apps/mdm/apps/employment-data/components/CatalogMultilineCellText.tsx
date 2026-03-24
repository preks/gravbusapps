import React from 'react'

export interface CatalogMultilineCellTextProps {
  text: string
  /** Use for primary label column (e.g. name). */
  bold?: boolean
}

/**
 * Wraps long catalog labels so they break inside the cell instead of overlapping adjacent columns.
 */
export const CatalogMultilineCellText: React.FC<CatalogMultilineCellTextProps> = ({ text, bold }) => (
  <div className="gba:min-w-0 gba:max-w-full gba:overflow-hidden">
    <div
      className={bold ? 'gba:whitespace-normal gba:break-all gba:font-semibold' : 'gba:whitespace-normal gba:break-all'}
      title={text}
    >
      {text}
    </div>
  </div>
)
