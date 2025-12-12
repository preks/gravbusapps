import React, { useState, useEffect, useMemo } from 'react'
import { SchemaField } from './SchemaField'

interface SecondaryCollapsibleProps {
  fields: [string, any][]
  requiredFields: string[]
  isCompleted: boolean
  formData: Record<string, any>
  onFieldValueChange: (path: string, value: any) => void
  onFieldChange: (fieldName: string, value: any) => void
  accessToken: string
}

export const SecondaryCollapsible: React.FC<SecondaryCollapsibleProps> = ({
  fields,
  requiredFields,
  isCompleted,
  formData,
  onFieldValueChange,
  onFieldChange,
  accessToken
}) => {
  const [open, setOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const hiddenMissingCount = useMemo(() => {
    return fields.reduce((acc, [fname]) => {
      if (requiredFields?.includes(fname)) {
        const v = (formData as any)[fname]
        if (v === '' || v === null || v === undefined) return acc + 1
      }
      return acc
    }, 0)
  }, [fields, requiredFields, formData])

  useEffect(() => {
    if (hiddenMissingCount > 0) setOpen(true)
  }, [hiddenMissingCount])

  if (fields.length === 0) return null

  const buttonText = open ? 'Hide advanced fields' : 'Show advanced fields'

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => !isCompleted && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isCompleted}
        className="gba:inline-flex gba:items-center gba:gap-1 gba:text-sm gba:text-muted-foreground gba:transition-all gba:duration-200 gba:cursor-pointer disabled:gba:opacity-60 disabled:gba:cursor-not-allowed"
      >
        <span
          className={`gba:text-xs gba:leading-none gba:transition-all gba:duration-200 ${
            isHovered && !isCompleted ? 'gba:translate-x-px gba:text-foreground' : ''
          }`}
        >
          {open ? '▾' : '▸'}
        </span>
        <span
          className={`gba:transition-all gba:duration-200 ${
            isHovered && !isCompleted ? 'gba:text-foreground gba:underline' : ''
          }`}
          style={
            isHovered && !isCompleted
              ? {
                  textDecorationThickness: '1px',
                  textUnderlineOffset: '2px',
                  textDecorationColor: 'rgba(0, 0, 0, 0.6)'
                }
              : undefined
          }
        >
          {buttonText}
        </span>
        {hiddenMissingCount > 0 && !open && (
          <span className="gba:ml-1 gba:text-xs">(Missing: {hiddenMissingCount})</span>
        )}
      </button>
      {open && (
        <div className="gba:mt-3 gba:space-y-4">
          {fields.map(([fieldName, fieldSchema]) => (
            <SchemaField
              key={`s-${fieldName}`}
              name={fieldName}
              path=""
              schema={fieldSchema}
              required={requiredFields.includes(fieldName)}
              disabled={isCompleted}
              value={formData[fieldName]}
              onChange={value => onFieldChange(fieldName, value)}
              formData={formData}
              onFieldValueChange={onFieldValueChange}
              accessToken={accessToken}
            />
          ))}
        </div>
      )}
    </div>
  )
}
