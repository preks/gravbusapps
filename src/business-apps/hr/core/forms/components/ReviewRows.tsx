import React from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'

export interface ReviewRow {
  key: string
  label?: string
  oldLabel?: string
  newLabel?: string
  oldValue: string
  newValue: string
}

interface ReviewRowsProps {
  rows: ReviewRow[]
  dataTestIdPrefix: string
  oldDataText: string
  currentDataText: string
  mode?: 'diff' | 'delete'
  hideNewLabels?: boolean
}

export const ReviewRows: React.FC<ReviewRowsProps> = ({
  rows,
  dataTestIdPrefix,
  oldDataText,
  currentDataText,
  mode = 'diff',
  hideNewLabels = false
}) => {
  return (
    <>
      <div className="gba:hidden gba:md:grid gba:md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gba:gap-4 gba:mb-4">
        <div className="gba:text-xl gba:font-semibold">{oldDataText} </div>
        <div />
        <div className="gba:text-xl gba:font-semibold">{currentDataText}</div>
      </div>

      <div className="gba:flex gba:flex-col gba:gap-4" data-testid={`${dataTestIdPrefix}-rows`}>
        {rows.map(row => {
          const hasDiff = String((row.oldValue || '').trim()) !== String((row.newValue || '').trim())

          let newClasses: string
          if (mode === 'delete') {
            newClasses = 'gba:bg-destructive gba:text-destructive-foreground'
          } else if (hasDiff) {
            newClasses = 'gba:bg-success-secondary/30 gba:text-success-secondary-foreground'
          } else {
            newClasses = 'gba:bg-muted gba:text-muted-foreground'
          }

          return (
            <div
              key={row.key}
              className="gba:grid gba:grid-cols-1 gba:md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gba:gap-4"
              data-testid={`${dataTestIdPrefix}-${row.key}`}
            >
              <div className="gba:grid gba:grid-rows-[auto_1fr] gba:gap-1 gba:self-stretch gba:min-w-0">
                <div className="gba:text-sm">{row.oldLabel ?? row.label ?? ''}</div>
                <div className="gba:h-full gba:min-h-12 gba:py-2 gba:bg-muted gba:text-muted-foreground gba:rounded-md gba:px-3 gba:flex gba:items-center gba:min-w-0 gba:w-full gba:whitespace-normal gba:break-all">
                  {(row.oldValue || '').trim() !== '' ? row.oldValue : '-'}
                </div>
              </div>
              <div className="gba:hidden gba:md:flex gba:items-center gba:justify-center gba:mt-6" aria-hidden="true">
                <CaretRightIcon size={20} weight="bold" className="gba:text-muted-foreground" />
              </div>
              <div className="gba:grid gba:grid-rows-[auto_1fr] gba:gap-1 gba:self-stretch gba:min-w-0">
                <div
                  className={`gba:text-sm ${hideNewLabels ? 'gba:opacity-0' : row.newLabel ? '' : 'gba:md:opacity-0'}`}
                >
                  {hideNewLabels ? '.' : row.newLabel || '.'}
                </div>
                <div
                  className={`gba:h-full gba:min-h-12 gba:py-2 gba:rounded-md gba:px-3 gba:flex gba:items-center gba:min-w-0 gba:w-full gba:whitespace-normal gba:break-all ${newClasses}`}
                >
                  {(row.newValue || '').trim() !== '' ? row.newValue : '-'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

export default ReviewRows
