import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input
} from '@newwork/nw-design-system'
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react'

interface SlideFontSizeControlProps {
  value?: number
  options: number[]
  placeholder?: string
  ariaLabel: string
  onCommit: (value: number) => void
  disabled?: boolean
  testId?: string
  className?: string
}

function toDisplayValue(value?: number): string {
  return value === undefined ? '' : String(value)
}

export function SlideFontSizeControl({
  value,
  options,
  placeholder,
  ariaLabel,
  onCommit,
  disabled = false,
  testId,
  className = 'gba:w-20'
}: SlideFontSizeControlProps) {
  const [draftValue, setDraftValue] = useState(toDisplayValue(value))

  useEffect(() => {
    setDraftValue(toDisplayValue(value))
  }, [value])

  const normalizedValue = useMemo(() => {
    if (value === undefined) return undefined
    return Number(value.toFixed(2))
  }, [value])

  const commitValue = (nextValue: string) => {
    const trimmedValue = nextValue.trim()
    if (!trimmedValue) {
      setDraftValue(toDisplayValue(value))
      return
    }

    const parsedValue = Number(trimmedValue)
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      setDraftValue(toDisplayValue(value))
      return
    }

    const normalizedDraftValue = Number(parsedValue.toFixed(2))
    setDraftValue(String(normalizedDraftValue))
    onCommit(normalizedDraftValue)
  }

  return (
    <div className={`gba:flex gba:items-stretch ${className}`}>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={draftValue}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        data-testid={testId}
        className="gba:h-8 gba:min-w-0 gba:flex-1 gba:rounded-r-none gba:border-r-0 gba:text-center"
        onChange={event => setDraftValue(event.target.value)}
        onBlur={event => commitValue(event.currentTarget.value)}
        onKeyDown={event => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          commitValue(event.currentTarget.value)
          event.currentTarget.blur()
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="gba:h-8 gba:w-8 gba:rounded-l-none gba:px-0"
            data-testid={testId ? `${testId}-trigger` : undefined}
            aria-label={`${ariaLabel} options`}
          >
            <CaretDownIcon className="gba:h-4 gba:w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="gba:min-w-20">
          {options.map(option => {
            const isActive = normalizedValue !== undefined && option === normalizedValue

            return (
              <DropdownMenuItem
                key={option}
                onSelect={() => commitValue(String(option))}
                className="gba:flex gba:items-center gba:justify-between"
              >
                <span>{option}</span>
                {isActive ? <CheckIcon className="gba:h-4 gba:w-4" /> : <span className="gba:h-4 gba:w-4" />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default SlideFontSizeControl
