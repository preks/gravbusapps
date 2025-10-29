import React, { useMemo, useState, useEffect } from 'react'
import { InputField, Switch, DateInputField, TimeInputField, SelectField, Alert } from '@newwork/gravity-ui-catalog'
import {
  getCatalogValue,
  getCurrentActiveUserLocale,
  getDateFormat,
  getTranslationFromI18nKeyAndLabel
} from '@/common/utils/windowUtils'
import { DateTimeLimits, LocationFormLabels } from '../../utils/types'
import dayjs from 'dayjs'
import { checkIfSameDay } from '../../utils/locationTimeUtils'

/**
 * LocationForm component props
 */
interface LocationFormProps {
  locationData: {
    id: string
    name: string
    isAbroad: boolean
    location: string
    departureDate: Date | undefined
    departureTime: Date | undefined
    isCollapsed: boolean
    travelRegionRef?: string
  }
  onUpdate: (field: string, value: any) => void
  showDateTimeFields?: boolean
  index?: number
  dateTimeLimits: DateTimeLimits
  travelRegions?: any[]
  overlapWarning?: { message: string; isError: boolean } | null
  showFutureWarning?: boolean
  showPastWarning?: boolean
  errorMessage?: string | null
  locationFormLabels?: LocationFormLabels
}

/**
 * LocationForm component for location input fields
 * @param props - Component props
 * @returns LocationForm component
 */
const LocationForm: React.FC<LocationFormProps> = ({
  locationData,
  onUpdate,
  showDateTimeFields = true,
  index,
  dateTimeLimits,
  travelRegions = [],
  overlapWarning = null,
  showFutureWarning = true,
  showPastWarning = false,
  errorMessage = null,
  locationFormLabels = {}
}) => {
  const { minDate, minTime, maxDate, maxTime } = dateTimeLimits
  const { id, isAbroad, location, departureDate, departureTime, travelRegionRef } = locationData
  const idPrefix = index !== undefined ? `${id}-${index}` : id

  const travelRegionOptions = useMemo(
    () =>
      (travelRegions || []).map(region => ({
        id: region.travelRegionRef,
        name: getCatalogValue(region.travelRegion)
      })),
    [travelRegions]
  )
  const selectedTravelRegionValue = useMemo(() => {
    if (!travelRegionRef) return undefined
    return travelRegionOptions.some(opt => opt.id === travelRegionRef) ? travelRegionRef : undefined
  }, [travelRegionRef, travelRegionOptions])

  useEffect(() => {
    if (isAbroad) {
      if (travelRegionRef && !travelRegionOptions.some(opt => opt.id === travelRegionRef)) {
        onUpdate('travelRegionRef', undefined)
      }
    }
  }, [isAbroad, travelRegionRef, travelRegionOptions, onUpdate])

  /**
   * Check if date and time are in the future
   */
  const isFutureDateTime = useMemo(() => {
    if (!departureDate) return false

    // Parse the date with dayjs
    let inputDateTime = dayjs(departureDate)

    // Add time component if available
    if (departureTime && dayjs(departureTime).isValid()) {
      const timeObj = dayjs(departureTime)
      inputDateTime = inputDateTime
        .set('hour', timeObj.hour())
        .set('minute', timeObj.minute())
        .set('second', timeObj.second())
    } else {
      // If no time specified, set to end of day to ensure proper comparison
      inputDateTime = inputDateTime.endOf('day')
    }

    // Don't show warning for today's date
    if (inputDateTime.isSame(dayjs(), 'day')) {
      return false
    }

    // Return true if the date is in the future
    return dayjs().isBefore(inputDateTime)
  }, [departureDate, departureTime])

  /**
   * Check if date and time are in the past
   */
  const isPastDateTime = useMemo(() => {
    if (!departureDate) return false

    // Parse the date with dayjs
    let inputDateTime = dayjs(departureDate)

    // Add time component if available
    if (departureTime && dayjs(departureTime).isValid()) {
      const timeObj = dayjs(departureTime)
      inputDateTime = inputDateTime
        .set('hour', timeObj.hour())
        .set('minute', timeObj.minute())
        .set('second', timeObj.second())
    } else {
      // If no time specified, set to end of day to ensure proper comparison
      inputDateTime = inputDateTime.endOf('day')
    }

    // Don't show warning for today's date
    if (inputDateTime.isSame(dayjs(), 'day')) {
      return false
    }

    // Return true if the date is in the past
    return dayjs().isAfter(inputDateTime)
  }, [departureDate, departureTime])

  // Use state to prevent flashing warnings
  const [showWarnings, setShowWarnings] = useState<boolean>(false)

  // Keep track of the previous overlap warning to prevent flickering
  const [prevOverlapWarning, setPrevOverlapWarning] = useState<any>(null)

  // Reset warnings when date changes
  useEffect(() => {
    // If date is cleared, immediately hide warnings
    if (!departureDate) {
      setShowWarnings(false)
      return
    }

    // When date is selected or changed, reset warnings and start timer
    setShowWarnings(false)
    const timer = setTimeout(() => {
      setShowWarnings(true)
      setPrevOverlapWarning(overlapWarning)
    }, 300) // 300ms delay

    return () => clearTimeout(timer)
  }, [departureDate]) // Only depend on date changes

  // Handle overlap warning changes separately
  useEffect(() => {
    // Only update if we have a date and warnings are showing
    if (departureDate && showWarnings && overlapWarning !== prevOverlapWarning) {
      setPrevOverlapWarning(overlapWarning)
    }
  }, [overlapWarning, showWarnings, departureDate, prevOverlapWarning])

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid={`${idPrefix}-form-content`}>
      <div className="gba:mb-0" data-testid={`${idPrefix}-abroad-switch-container`}>
        <Switch
          label={getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.add_trip_info_to_plan.switch', 'Abroad')}
          name={`${idPrefix}Abroad`}
          data-testid={`${idPrefix}-abroad-switch`}
          value={isAbroad}
          onChange={checked => onUpdate('isAbroad', checked.value)}
        />
      </div>

      <div className="gba:relative" data-testid={`${idPrefix}-input-container`}>
        <InputField
          label={
            locationFormLabels.inputFieldLabel ||
            getTranslationFromI18nKeyAndLabel(
              'lowcoder:add_items_to_plan.add_trip_info_to_plan.start_input_label',
              'Start Location'
            )
          }
          name={`${idPrefix}Location`}
          placeholder={getTranslationFromI18nKeyAndLabel(
            'lowcoder:add_items_to_plan.add_trip_info_to_plan.start_input_placeholder',
            'Type in City'
          )}
          data-testid={`${idPrefix}-input`}
          value={location}
          onChange={field => onUpdate('location', field.value)}
          required
        />
      </div>

      {isAbroad && travelRegions && travelRegions.length > 0 && (
        <div className="gba:relative" data-testid={`${idPrefix}-travel-region-container`}>
          <SelectField
            allowClear
            label={getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.add_request_trip_details.select_start_region_rule_label',
              'Region'
            )}
            name={`${idPrefix}TravelRegion`}
            data-testid={`${idPrefix}-travel-region-select`}
            data={travelRegionOptions}
            onChange={(value: any) => {
              onUpdate('travelRegionRef', value?.value)
            }}
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.add_request_trip_details.select_start_region_rule_placeholder',
              'Select Region'
            )}
            value={selectedTravelRegionValue}
            required={isAbroad}
          />
        </div>
      )}
      {showDateTimeFields && (
        <>
          <div className="gba:grid gba:grid-cols-2 gba:gap-4" data-testid={`${idPrefix}-date-time-container`}>
            <div className="gba:flex-1 gba:relative" data-testid={`${idPrefix}-date-container`}>
              <DateInputField
                label={
                  locationFormLabels.dateFieldLabel ||
                  getTranslationFromI18nKeyAndLabel(
                    'lowcoder:add_items_to_plan.add_trip_info_to_plan.start_date_label',
                    'Departure Date'
                  )
                }
                name={`${idPrefix}DepartureDate`}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:add_items_to_plan.add_trip_info_to_plan.start_date_placeholder',
                  'Select Date'
                )}
                data-testid={`${idPrefix}-date-input`}
                format={getDateFormat('date-long')}
                value={departureDate ? new Date(departureDate) : null}
                language={getCurrentActiveUserLocale().split('-')[0] as 'en' | 'de' | 'ro' | undefined}
                onChange={field => onUpdate('departureDate', field.value)}
                required
                {...(minDate ? { minDate } : {})}
                {...(maxDate ? { maxDate } : {})}
              />
            </div>

            <div className="gba:flex-1 gba:relative" data-testid={`${idPrefix}-time-container`}>
              <TimeInputField
                label={
                  locationFormLabels.timeFieldLabel ||
                  getTranslationFromI18nKeyAndLabel(
                    'lowcoder:add_items_to_plan.add_trip_info_to_plan.start_time_label',
                    'Departure Time'
                  )
                }
                name={`${idPrefix}DepartureTime`}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:add_items_to_plan.add_trip_info_to_plan.start_time_placeholder',
                  'Select Time'
                )}
                data-testid={`${idPrefix}-time-input`}
                value={departureTime ? dayjs(departureTime) : null}
                language={getCurrentActiveUserLocale().split('-')[0] as 'en' | 'de' | 'ro' | undefined}
                format="HH:mm"
                minuteStep={15}
                onChange={field => onUpdate('departureTime', field.value)}
                disabled={!departureDate}
                required
                {...(minTime && checkIfSameDay(minDate, departureDate) ? { minDate: dayjs(minTime) } : {})}
                {...(maxTime && checkIfSameDay(maxDate, departureDate) ? { maxDate: dayjs(maxTime) } : {})}
              />
            </div>
          </div>

          {/* Warning messages display below date/time fields - only show if there's an actual message to display */}

          {/* Show employee rule error if it exists - this has highest priority */}
          {errorMessage && (
            <div
              className="gba:flex gba:flex-col gba:w-[100%]"
              style={{ marginTop: '8px', marginBottom: '4px', gridColumn: '1 / -1' }}
              data-testid={`${idPrefix}-error-row`}
            >
              <Alert message={errorMessage} type="error" showIcon data-testid={`${idPrefix}-rule-error`} />
            </div>
          )}

          {/* Only show warnings if we have a date selected and after delay to prevent flashing */}
          {departureDate && showWarnings && !errorMessage && (
            <>
              {/* Show overlap warning if it exists - this has priority */}
              {overlapWarning && overlapWarning.message && (
                <div
                  className="gba:flex gba:flex-col gba:w-[100%]"
                  style={{ marginTop: '8px', marginBottom: '4px', gridColumn: '1 / -1' }}
                  data-testid={`${idPrefix}-warnings-row`}
                >
                  <Alert
                    message={overlapWarning.message}
                    type={overlapWarning.isError ? 'error' : 'warning'}
                    showIcon
                    data-testid={`${idPrefix}-overlap-warning`}
                  />
                </div>
              )}

              {/* Show future date warning if enabled and no overlap warning exists */}
              {showFutureWarning && isFutureDateTime && !overlapWarning && (
                <div
                  className="gba:flex gba:flex-col gba:w-[100%]"
                  style={{ marginTop: '8px', marginBottom: '4px', gridColumn: '1 / -1' }}
                  data-testid={`${idPrefix}-warnings-row`}
                >
                  <Alert
                    message={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:create_expense_request.add_request_trip_details.future_date_warning',
                      'The selected date is in the future!'
                    )}
                    type="warning"
                    showIcon
                    data-testid={`${idPrefix}-future-warning`}
                  />
                </div>
              )}

              {/* Show past date warning if enabled and no overlap warning exists */}
              {showPastWarning && isPastDateTime && !overlapWarning && (
                <div
                  className="gba:flex gba:flex-col gba:w-[100%]"
                  style={{ marginTop: '8px', marginBottom: '4px', gridColumn: '1 / -1' }}
                  data-testid={`${idPrefix}-warnings-row`}
                >
                  <Alert
                    message={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:add_items_to_plan.add_trip_info_to_plan.past_date_warning',
                      'The selected date is in the past!'
                    )}
                    type="warning"
                    showIcon
                    data-testid={`${idPrefix}-past-warning`}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default LocationForm
