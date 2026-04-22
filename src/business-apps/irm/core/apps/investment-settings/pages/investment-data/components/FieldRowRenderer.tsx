import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FieldGroup } from '../types'
import { FieldRow } from '../utils/displayOrderUtils'
import { SortableFieldItem } from './SortableFieldItem'

interface FieldRowRendererProps extends BusinessAppContextProps {
  rows: FieldRow[]
  currentGroup: FieldGroup
  selectedGroupIndex: number
  onEditField: (groupIndex: number, fieldIndex: number) => void
  onDeleteField: (groupIndex: number, fieldIndex: number) => void
  prefixDataTestId?: string
}

export const FieldRowRenderer: React.FC<FieldRowRendererProps> = ({
  accessToken,
  userInfo,
  additionalData,
  rows,
  currentGroup,
  selectedGroupIndex,
  onEditField,
  onDeleteField,
  prefixDataTestId = 'field-row'
}) => {
  return (
    <div className="gba:space-y-4">
      {rows.map(row => (
        <div key={`row-${row.row}`} data-testid={`${prefixDataTestId}-${row.row}`}>
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <Badge variant="outline" className="gba:text-xs gba:font-mono">
              Row {row.row}
            </Badge>
            <div className="gba:flex-1 gba:h-px gba:bg-border" aria-hidden />
          </div>
          <div
            className={`gba:grid gba:gap-3 ${
              Math.min(row.fields.length, 3) === 1
                ? 'gba:grid-cols-1'
                : Math.min(row.fields.length, 3) === 2
                  ? 'gba:grid-cols-2'
                  : 'gba:grid-cols-3'
            }`}
          >
            {row.fields.map(field => {
              const fieldIndex = currentGroup.fields.findIndex(f => f.id === field.id)

              // Guard: field not found in current group
              if (fieldIndex === -1) {
                console.warn(
                  `Field "${field.id}" not found in group "${currentGroup.groupLabel}". ` +
                    `This indicates a data inconsistency between display order and group fields.`
                )
                return null
              }

              return (
                <SortableFieldItem
                  key={field.id}
                  accessToken={accessToken}
                  userInfo={userInfo}
                  additionalData={additionalData}
                  field={field}
                  onEdit={() => onEditField(selectedGroupIndex, fieldIndex)}
                  onDelete={() => onDeleteField(selectedGroupIndex, fieldIndex)}
                  prefixDataTestId={`${prefixDataTestId}-field-${fieldIndex}`}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
