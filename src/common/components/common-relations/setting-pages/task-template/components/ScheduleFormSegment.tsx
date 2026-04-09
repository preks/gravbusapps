import React from 'react'
import {
  Label,
  Combobox,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  FormControl,
  Input
} from '@newwork/nw-design-system'
import { XIcon } from '@phosphor-icons/react'
import { RecurringScheduleFieldsProps, EnumOption, type TaskTemplateSchedulingType } from '../types'

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
]

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => ({
  value: (i + 1).toString(),
  label: (i + 1).toString()
}))

const MONTHS_OF_YEAR = [
  { value: 'january', label: 'January' },
  { value: 'february', label: 'February' },
  { value: 'march', label: 'March' },
  { value: 'april', label: 'April' },
  { value: 'may', label: 'May' },
  { value: 'june', label: 'June' },
  { value: 'july', label: 'July' },
  { value: 'august', label: 'August' },
  { value: 'september', label: 'September' },
  { value: 'october', label: 'October' },
  { value: 'november', label: 'November' },
  { value: 'december', label: 'December' }
]

export const ScheduleFormSegment: React.FC<
  RecurringScheduleFieldsProps & {
    schedulingType?: TaskTemplateSchedulingType
    onSchedulingTypeChange?: (t: TaskTemplateSchedulingType) => void
    nextStartDate?: string
    onNextStartDateChange?: (v: string) => void
    holidayPolicies: EnumOption[]
  }
> = ({
  value,
  onChange,
  dataTestId,
  schedulingType = 'CUSTOM',
  onSchedulingTypeChange,
  nextStartDate,
  onNextStartDateChange,
  holidayPolicies
}) => {
  const { daysOfWeek = {}, daysOfMonth = {}, monthsOfYear = {}, intervalDays = 0, holidayPolicy = 'SKIP' } = value

  const selectedDays = Object.entries(daysOfWeek)
    .filter(([, checked]) => checked)
    .map(([key]) => key)
  const selectedDaysOfMonth = Object.entries(daysOfMonth)
    .filter(([, checked]) => checked)
    .map(([day]) => day)
  const selectedMonths = Object.entries(monthsOfYear)
    .filter(([, checked]) => checked)
    .map(([key]) => key)

  const availableWeekOptions = DAYS_OF_WEEK.filter(d => !selectedDays.includes(d.value)).map(d => ({
    value: d.value,
    label: d.label
  }))
  const availableMonthDayOptions = DAYS_OF_MONTH.filter(d => !selectedDaysOfMonth.includes(d.value)).map(d => ({
    value: d.value,
    label: d.label
  }))
  const availableYearMonthOptions = MONTHS_OF_YEAR.filter(m => !selectedMonths.includes(m.value)).map(m => ({
    value: m.value,
    label: m.label
  }))

  const addWeekDay = (day: string | null) => {
    if (!day) return
    onChange({ ...value, daysOfWeek: { ...daysOfWeek, [day]: true } })
  }
  const removeWeekDay = (day: string) => {
    const newMap = { ...daysOfWeek }
    delete newMap[day]
    onChange({ ...value, daysOfWeek: newMap })
  }

  const addMonthDay = (day: string | null) => {
    if (!day) return
    onChange({ ...value, daysOfMonth: { ...daysOfMonth, [day]: true } })
  }
  const removeMonthDay = (day: string) => {
    const newMap = { ...daysOfMonth }
    delete newMap[day]
    onChange({ ...value, daysOfMonth: newMap })
  }

  const addYearMonth = (month: string | null) => {
    if (!month) return
    onChange({ ...value, monthsOfYear: { ...monthsOfYear, [month]: true } })
  }
  const removeYearMonth = (month: string) => {
    const newMap = { ...monthsOfYear }
    delete newMap[month]
    onChange({ ...value, monthsOfYear: newMap })
  }

  const hasAnySchedule = selectedDays.length > 0 || selectedDaysOfMonth.length > 0 || selectedMonths.length > 0

  return (
    <div className="gba:space-y-6" data-testid={dataTestId}>
      <div className="gba:space-y-2">
        <Label className="gba:text-sm gba:font-medium gba:text-foreground">Scheduling Type</Label>
        <Select value={schedulingType} onValueChange={v => onSchedulingTypeChange?.(v as TaskTemplateSchedulingType)}>
          <FormControl>
            <SelectTrigger data-testid={`${dataTestId}-scheduling-type`}>
              <SelectValue placeholder="Select scheduling type" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="ONCE">Once</SelectItem>
            <SelectItem value="BUSINESS_DAYS">Business days</SelectItem>
            <SelectItem value="WEEKLY">Weekly</SelectItem>
            <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
            <SelectItem value="MONTHLY">Monthly</SelectItem>
            <SelectItem value="CUSTOM">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="gba:space-y-2">
        <Label className="gba:text-sm gba:font-medium gba:text-foreground">Next Start Date</Label>
        <Input
          type="date"
          value={nextStartDate || ''}
          onChange={e => onNextStartDateChange?.(e.target.value)}
          data-testid={`${dataTestId}-next-start-date-input`}
        />
      </div>

      {(schedulingType === 'WEEKLY' || schedulingType === 'BIWEEKLY' || schedulingType === 'CUSTOM') && (
        <div className="gba:space-y-2">
          <Label className="gba:text-sm gba:font-medium gba:text-foreground">Days of Week</Label>
          <Combobox
            value=""
            onValueChange={addWeekDay}
            options={availableWeekOptions}
            placeholder="Add day..."
            searchPlaceholder="Search days..."
            data-testid={`${dataTestId}-days-of-week-combobox`}
          />
          {selectedDays.length > 0 && (
            <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-2">
              {selectedDays.map(d => (
                <Badge key={d} variant="secondary" className="gba:flex gba:items-center gba:gap-2">
                  {DAYS_OF_WEEK.find(x => x.value === d)?.label || d}
                  <button
                    type="button"
                    onClick={() => removeWeekDay(d)}
                    aria-label={`Remove ${d}`}
                    className="gba:text-destructive hover:gba:text-destructive/80"
                  >
                    <XIcon className="gba:h-3 gba:w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {(schedulingType === 'MONTHLY' || schedulingType === 'CUSTOM') && (
        <div className="gba:space-y-2">
          <Label className="gba:text-sm gba:font-medium gba:text-foreground">Days of Month</Label>
          <Combobox
            value=""
            onValueChange={addMonthDay}
            options={availableMonthDayOptions}
            placeholder="Add day of month..."
            searchPlaceholder="Search days..."
            data-testid={`${dataTestId}-days-of-month-combobox`}
          />
          {selectedDaysOfMonth.length > 0 && (
            <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-2">
              {selectedDaysOfMonth.map(d => (
                <Badge key={d} variant="secondary" className="gba:flex gba:items-center gba:gap-2">
                  {d}
                  <button
                    type="button"
                    onClick={() => removeMonthDay(d)}
                    aria-label={`Remove ${d}`}
                    className="gba:text-destructive hover:gba:text-destructive/80"
                  >
                    <XIcon className="gba:h-3 gba:w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {(schedulingType === 'MONTHLY' || schedulingType === 'CUSTOM') && (
        <div className="gba:space-y-2">
          <Label className="gba:text-sm gba:font-medium gba:text-foreground">Months of Year</Label>
          <Combobox
            value=""
            onValueChange={addYearMonth}
            options={availableYearMonthOptions}
            placeholder="Add month..."
            searchPlaceholder="Search months..."
            data-testid={`${dataTestId}-months-of-year-combobox`}
          />
          {selectedMonths.length > 0 && (
            <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-2">
              {selectedMonths.map(m => (
                <Badge key={m} variant="secondary" className="gba:flex gba:items-center gba:gap-2">
                  {MONTHS_OF_YEAR.find(x => x.value === m)?.label || m}
                  <button
                    type="button"
                    onClick={() => removeYearMonth(m)}
                    aria-label={`Remove ${m}`}
                    className="gba:text-destructive hover:gba:text-destructive/80"
                  >
                    <XIcon className="gba:h-3 gba:w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {schedulingType !== 'ONCE' && (
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-foreground">Interval</Label>
            <Input
              type="number"
              min={1}
              value={intervalDays || 1}
              onChange={e => onChange({ ...value, intervalDays: Number(e.target.value || 1) })}
              data-testid={`${dataTestId}-interval-input`}
            />
          </div>
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-foreground">Holiday Policy</Label>
            <Select value={holidayPolicy} onValueChange={v => onChange({ ...value, holidayPolicy: v })}>
              <FormControl>
                <SelectTrigger data-testid={`${dataTestId}-holiday-policy-select`}>
                  <SelectValue placeholder="Select holiday policy" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {holidayPolicies.map(policy => (
                  <SelectItem key={policy.value} value={policy.value}>
                    {policy.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {hasAnySchedule && (
        <div className="gba:flex gba:justify-end">
          <button
            type="button"
            onClick={() => onChange({ ...value, daysOfWeek: {}, daysOfMonth: {}, monthsOfYear: {} })}
            className="gba:text-sm gba:text-destructive hover:gba:text-destructive/80"
            data-testid={`${dataTestId}-clear-all`}
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  )
}

export default ScheduleFormSegment
