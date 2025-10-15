import * as React from 'react'
import { useState, useCallback } from 'react'
import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { CalendarIcon, ClockIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

// Load dayjs plugins
dayjs.extend(weekday)
dayjs.extend(localeData)

export interface DateTimeFieldProps {
  /** Field name for form identification */
  name: string
  /** Field label */
  label: string
  /** Whether to show the label (default: true) */
  showLabel?: boolean
  /** Current value (Date object or ISO string) */
  value?: Date | string | null
  /** Change handler */
  onChange: (value: Date | null) => void
  /** Blur handler for validation */
  onBlur?: () => void
  /** Whether field is required */
  required?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Field description */
  description?: string
  /** Whether field has validation error */
  hasError?: boolean
  /** Error message to display */
  errorMessage?: string
  /** Whether field is disabled */
  disabled?: boolean
  /** Field type - 'date' for date only, 'datetime' for date and time */
  type?: 'date' | 'datetime'
  /** Test ID for testing */
  testId?: string
  /** Minimum date allowed */
  minDate?: Date
  /** Maximum date allowed */
  maxDate?: Date
  /** Custom date format for display */
  dateFormat?: string
  /** Custom time format for display */
  timeFormat?: string
}

/**
 * DateTimeField Component
 *
 * A comprehensive date/datetime picker component for dynamic forms using nw-design-system.
 * Supports both date-only and datetime modes with proper validation and accessibility.
 */
export const DateTimeField: React.FC<DateTimeFieldProps> = ({
  name,
  label,
  showLabel = true,
  value,
  onChange,
  onBlur,
  required = false,
  placeholder,
  description,
  hasError = false,
  errorMessage,
  disabled = false,
  type = 'date',
  testId = `datetime-field-${name}`,
  minDate,
  maxDate,
  dateFormat = 'DD.MM.YYYY',
  timeFormat = 'HH:mm'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [timeValue, setTimeValue] = useState('')

  // Convert value to Date object
  const currentDate = React.useMemo(() => {
    if (!value) return null
    if (value instanceof Date) return value
    if (typeof value === 'string') {
      const parsed = dayjs(value)
      return parsed.isValid() ? parsed.toDate() : null
    }
    return null
  }, [value])

  // Initialize time value when date changes
  React.useEffect(() => {
    if (currentDate && type === 'datetime') {
      const time = dayjs(currentDate).format(timeFormat)
      setTimeValue(time)
    } else if (!currentDate) {
      setTimeValue('')
    }
  }, [currentDate, type, timeFormat])

  // Handle date selection from calendar
  const handleDateSelect = useCallback(
    (selectedDate: Date | undefined) => {
      if (!selectedDate) {
        onChange(null)
        setTimeValue('')
        if (type === 'date') {
          setIsOpen(false)
        }
        return
      }

      // Create a date in local timezone to avoid timezone offset issues
      // Extract year, month, day from the selected date
      const year = selectedDate.getFullYear()
      const month = selectedDate.getMonth()
      const day = selectedDate.getDate()

      let finalDate: Date

      // For datetime mode, preserve or set time
      if (type === 'datetime') {
        if (timeValue) {
          // Parse existing time and apply to selected date
          const [hours, minutes] = timeValue.split(':').map(Number)
          if (!isNaN(hours) && !isNaN(minutes)) {
            finalDate = new Date(year, month, day, hours, minutes, 0, 0)
          } else {
            // Fallback to current time if time is invalid
            const now = new Date()
            finalDate = new Date(year, month, day, now.getHours(), now.getMinutes(), 0, 0)
            setTimeValue(dayjs(finalDate).format(timeFormat))
          }
        } else {
          // Set default time to current time
          const now = new Date()
          finalDate = new Date(year, month, day, now.getHours(), now.getMinutes(), 0, 0)
          setTimeValue(dayjs(finalDate).format(timeFormat))
        }
      } else {
        // For date-only mode, set time to noon to avoid timezone issues
        // Using noon (12:00) instead of midnight prevents date shifting across timezones
        finalDate = new Date(year, month, day, 12, 0, 0, 0)
        setIsOpen(false)
      }

      onChange(finalDate)
    },
    [onChange, type, timeValue, timeFormat]
  )

  // Handle time change
  const handleTimeChange = useCallback(
    (newTime: string) => {
      setTimeValue(newTime)

      if (currentDate && newTime) {
        const [hours, minutes] = newTime.split(':').map(Number)
        if (!isNaN(hours) && !isNaN(minutes)) {
          const updatedDate = dayjs(currentDate).hour(hours).minute(minutes).second(0).millisecond(0).toDate()
          onChange(updatedDate)
        }
      }
    },
    [currentDate, onChange]
  )

  // Handle manual time input
  const handleTimeInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = e.target.value
      handleTimeChange(newTime)
    },
    [handleTimeChange]
  )

  // Generate time options for select (every 15 minutes)
  const timeOptions = React.useMemo(() => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const label = dayjs().hour(hour).minute(minute).format('HH:mm')
        options.push({ value: time, label })
      }
    }
    return options
  }, [])

  // Format display value
  const displayValue = React.useMemo(() => {
    if (!currentDate) return ''

    if (type === 'datetime') {
      return dayjs(currentDate).format(`${dateFormat} ${timeFormat}`)
    } else {
      return dayjs(currentDate).format(dateFormat)
    }
  }, [currentDate, type, dateFormat, timeFormat])

  // Handle clear
  const handleClear = useCallback(() => {
    onChange(null)
    setTimeValue('')
    setIsOpen(false)
  }, [onChange])

  return (
    <div className="gba:space-y-2" data-testid={`${testId}-container`}>
      {/* Label - only show if showLabel is true */}
      {showLabel && (
        <Label
          htmlFor={name}
          className="gba:block gba:text-sm gba:font-medium gba:text-foreground"
          data-testid={`${testId}-label`}
        >
          {type === 'datetime' ? (
            <ClockIcon className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
          ) : (
            <CalendarIcon className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
          )}
          {label}
          {required && <span className="gba:text-destructive gba:ml-1">*</span>}
        </Label>
      )}

      {/* Description */}
      {description && (
        <p className="gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-description`}>
          {description}
        </p>
      )}

      {/* Date Picker */}
      <div className="gba:flex gba:gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`gba:w-full gba:justify-start gba:text-left gba:font-normal ${
                hasError ? 'gba:border-destructive' : ''
              } ${!displayValue ? 'gba:text-muted-foreground' : ''}`}
              disabled={disabled}
              data-testid={`${testId}-trigger`}
            >
              {displayValue || placeholder || (type === 'datetime' ? 'Select date and time' : 'Select date')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="gba:w-auto gba:p-0" align="start">
            <div className="gba:p-3">
              <Calendar
                mode="single"
                selected={currentDate || undefined}
                onSelect={handleDateSelect}
                disabled={date => {
                  if (disabled) return true
                  if (minDate && date < minDate) return true
                  if (maxDate && date > maxDate) return true
                  return false
                }}
                initialFocus
                data-testid={`${testId}-calendar`}
              />

              {/* Time Selection for datetime mode */}
              {type === 'datetime' && (
                <div className="gba:mt-3 gba:pt-3 gba:border-t gba:space-y-3">
                  <Label className="gba:text-sm gba:font-medium">Time</Label>

                  <div className="gba:flex gba:gap-2">
                    {/* Time Input */}
                    <Input
                      type="time"
                      value={timeValue}
                      onChange={handleTimeInputChange}
                      className="gba:flex-1"
                      data-testid={`${testId}-time-input`}
                    />

                    {/* Quick Time Select */}
                    <Select value={timeValue} onValueChange={handleTimeChange}>
                      <SelectTrigger className="gba:w-20" data-testid={`${testId}-time-select`}>
                        <SelectValue placeholder="Time" />
                      </SelectTrigger>
                      <SelectContent className="gba:max-h-60">
                        {timeOptions.map(option => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            data-testid={`${testId}-time-option-${option.value}`}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="gba:mt-3 gba:pt-3 gba:border-t gba:flex gba:justify-between">
                <Button variant="outline" size="sm" onClick={handleClear} data-testid={`${testId}-clear`}>
                  Clear
                </Button>
                {type === 'datetime' && (
                  <Button size="sm" onClick={() => setIsOpen(false)} data-testid={`${testId}-done`}>
                    Done
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Error Message */}
      {hasError && errorMessage && (
        <div
          className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs"
          data-testid={`${testId}-error`}
        >
          <CalendarIcon className="gba:w-3 gba:h-3" />
          {errorMessage}
        </div>
      )}

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={currentDate ? currentDate.toISOString() : ''} onBlur={onBlur} />
    </div>
  )
}

export default DateTimeField
