import React, { useEffect, useMemo, useState } from 'react'
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import type { DueUnit } from './dueDateUtils'
import { MINUTES_PER, deriveTimeUnit, dueAmountDisplayValue, parseDueAmountToMinutes } from './dueDateUtils'

interface DueDateFieldProps {
  valueMinutes?: number
  onChange: (minutes: number | undefined) => void
  label: string
  description?: string
  placeholder: string
  unitLabels: {
    minutes: string
    hours: string
    days: string
  }
  'data-testid': string
}

export const DueDateField: React.FC<DueDateFieldProps> = ({
  valueMinutes,
  onChange,
  label,
  description,
  placeholder,
  unitLabels,
  'data-testid': testId
}) => {
  const derivedUnit = useMemo(() => deriveTimeUnit(valueMinutes), [valueMinutes])
  const [selectedUnit, setSelectedUnit] = useState<DueUnit>(derivedUnit)
  const amountValue = useMemo(() => dueAmountDisplayValue(valueMinutes, selectedUnit), [valueMinutes, selectedUnit])

  useEffect(() => {
    if (valueMinutes === undefined) {
      return
    }

    setSelectedUnit(derivedUnit)
  }, [derivedUnit, valueMinutes])

  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      <Label className="gba:text-xs gba:font-semibold gba:text-foreground">{label}</Label>
      {description ? <p className="gba:text-xs gba:text-muted-foreground">{description}</p> : null}
      <div className="gba:flex gba:items-center gba:gap-2">
        <Input
          type="number"
          min={1}
          value={amountValue}
          placeholder={placeholder}
          onChange={e => onChange(parseDueAmountToMinutes(e.target.value, selectedUnit))}
          className="gba:flex-1"
          data-testid={`${testId}-amount`}
        />
        <Select
          value={selectedUnit}
          onValueChange={(next: string) => {
            const nextUnit = next as DueUnit
            setSelectedUnit(nextUnit)

            if (!amountValue) {
              return
            }

            const currentAmount = Number.parseInt(amountValue, 10)
            if (!Number.isFinite(currentAmount) || currentAmount <= 0) {
              return
            }

            onChange(currentAmount * MINUTES_PER[nextUnit])
          }}
        >
          <SelectTrigger className="gba:w-32" data-testid={`${testId}-unit`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutes">{unitLabels.minutes}</SelectItem>
            <SelectItem value="hours">{unitLabels.hours}</SelectItem>
            <SelectItem value="days">{unitLabels.days}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
