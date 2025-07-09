import React, { useMemo, useState, useEffect } from 'react';
import { InputField, Switch, DateInputField, TimeInputField, SelectField ,Alert } from '@newwork/gravity-ui-catalog';
import { getCatalogValue, getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { DateTimeLimits } from '../../utils/types';
import dayjs from 'dayjs';
import { checkIfSameDay } from '../../utils/locationTimeUtils';

/**
 * LocationForm component props
 */
interface LocationFormProps {
  locationData: {
    id: string;
    name: string;
    isAbroad: boolean;
    location: string;
    departureDate: Date | undefined;
    departureTime: Date | undefined;
    isCollapsed: boolean;
    travelRegionRef?: string;
  };
  onUpdate: (field: string, value: any) => void;
  showDateTimeFields?: boolean;
  index?: number;
  dateTimeLimits: DateTimeLimits;
  travelRegions?: any[];
  overlapWarning?: { message: string, isError: boolean } | null;
  showFutureWarning?: boolean;
  errorMessage?: string | null;
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
  errorMessage = null
}) => {
  const { minDate, minTime, maxDate, maxTime } = dateTimeLimits;
  const { id,
    name,
    isAbroad,
    location,
    departureDate,
    departureTime,
    travelRegionRef} = locationData
  const idPrefix = index !== undefined ? `${id}-${index}` : id;
  
  /**
   * Check if date and time are in the future
   */
  const isFutureDateTime = useMemo(() => {
    if (!departureDate) return false;
    
    // Parse the date with dayjs
    let inputDateTime = dayjs(departureDate);

    // Add time component if available
    if (departureTime && dayjs(departureTime).isValid()) {
      const timeObj = dayjs(departureTime);
      inputDateTime = inputDateTime
        .set('hour', timeObj.hour())
        .set('minute', timeObj.minute())
        .set('second', timeObj.second());
    } else {
      // If no time specified, set to end of day to ensure proper comparison
      inputDateTime = inputDateTime.endOf('day');
    }
    
    // Don't show warning for today's date
    if (inputDateTime.isSame(dayjs(), 'day')) {
      return false;
    }
    
    // Return true if the date is in the future
    return dayjs().isBefore(inputDateTime);
  }, [departureDate, departureTime]);
  
  // Use state to prevent flashing warnings
  const [showWarnings, setShowWarnings] = useState<boolean>(false);
  
  // Keep track of the previous overlap warning to prevent flickering
  const [prevOverlapWarning, setPrevOverlapWarning] = useState<any>(null);
  
  // Reset warnings when date changes
  useEffect(() => {
    // If date is cleared, immediately hide warnings
    if (!departureDate) {
      setShowWarnings(false);
      return;
    }
    
    // When date is selected or changed, reset warnings and start timer
    setShowWarnings(false);
    const timer = setTimeout(() => {
      setShowWarnings(true);
      setPrevOverlapWarning(overlapWarning);
    }, 300); // 300ms delay
    
    return () => clearTimeout(timer);
  }, [departureDate]); // Only depend on date changes
  
  // Handle overlap warning changes separately
  useEffect(() => {
    // Only update if we have a date and warnings are showing
    if (departureDate && showWarnings && overlapWarning !== prevOverlapWarning) {
      setPrevOverlapWarning(overlapWarning);
    }
  }, [overlapWarning, showWarnings, departureDate, prevOverlapWarning]);

  return (
    <div className="gba:locationFormContent" data-testid={`${idPrefix}-form-content`}>
      <div className="gba:switchContainer" data-testid={`${idPrefix}-abroad-switch-container`}>
        <Switch
          label="Abroad"
          name={`${idPrefix}Abroad`}
          data-testid={`${idPrefix}-abroad-switch`}
          value={isAbroad}
          onChange={(checked) => onUpdate('isAbroad', checked.value)}
        />
      </div>
      
      <div className="gba:inputContainer" data-testid={`${idPrefix}-input-container`}>
        <InputField
          label={`${name}`}
          name={`${idPrefix}Location`}
          placeholder="Type in City"
          data-testid={`${idPrefix}-input`}
          value={location}
          onChange={(field) => onUpdate('location', field.value)}
          required
        />
      </div>
      
     
      {isAbroad && travelRegions && travelRegions.length > 0 && (
        <div className="gba:inputContainer" data-testid={`${idPrefix}-travel-region-container`}>
          <SelectField
            allowClear
            label={getTranslationFromI18nKeyAndLabel(
              "lowcoder:expense_request_wizard.trip_screen.travel_region_label",
              "Travel Region"
            )}
            name={`${idPrefix}TravelRegion`}
            data-testid={`${idPrefix}-travel-region-select`}
            data={travelRegions.map((region) => ({
              id: region.travelRegionRef,
              name: getCatalogValue(region.travelRegion)
            }))}
            onChange={(value: any) => {
              onUpdate('travelRegionRef', value?.value);
            }}
            placeholder={getTranslationFromI18nKeyAndLabel(
              "lowcoder:expense_request_wizard.trip_screen.travel_region_placeholder",
              "Select Travel Region"
            )}
            value={travelRegionRef || undefined}
            required={isAbroad}
          />
        </div>
      )}
      {showDateTimeFields && (
        <>
          <div className="gba:dateTimeContainer" data-testid={`${idPrefix}-date-time-container`}>
            <div className="gba:dateInputContainer" data-testid={`${idPrefix}-date-container`}>
              <DateInputField
                label="Departure Date"
                name={`${idPrefix}DepartureDate`}
                placeholder="Select Date"
                data-testid={`${idPrefix}-date-input`}
                value={departureDate ? new Date(departureDate) : null}
                language={getCurrentActiveUserLocale().split("-")[0] as "en" | "de" | "ro" | undefined}
                onChange={(field) => onUpdate('departureDate', field.value)}
                required
                {...(minDate ? { minDate } : {})}
                {...(maxDate ? { maxDate } : {})}
              />
            </div>
            
            <div className="gba:timeInputContainer" data-testid={`${idPrefix}-time-container`}>
              <TimeInputField
                label="Departure Time"
                name={`${idPrefix}DepartureTime`}
                placeholder="HH:MM"
                data-testid={`${idPrefix}-time-input`}
                value={departureTime ? dayjs(departureTime) : null}
                language={getCurrentActiveUserLocale().split("-")[0] as "en" | "de" | "ro" | undefined}
                format="HH:mm"
                minuteStep={15}
                onChange={(field) => onUpdate('departureTime', field.value)}
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
            <div className="gba:warningMessageRow" data-testid={`${idPrefix}-error-row`}>
              <Alert
                message={errorMessage}
                type="error"
                showIcon
                data-testid={`${idPrefix}-rule-error`}
              />
            </div>
          )}
          
          {/* Only show warnings if we have a date selected and after delay to prevent flashing */}
          {departureDate && showWarnings && !errorMessage && (
            <>
              {/* Show overlap warning if it exists - this has priority */}
              {overlapWarning && overlapWarning.message && (
                <div className="gba:warningMessageRow" data-testid={`${idPrefix}-warnings-row`}>
                  <Alert
                    message={overlapWarning.message}
                    type={overlapWarning.isError ? "error" : "warning"}
                    showIcon
                    data-testid={`${idPrefix}-overlap-warning`}
                  />
                </div>
              )}
              
              {/* Show future date warning if enabled and no overlap warning exists */}
              {showFutureWarning && isFutureDateTime && !overlapWarning && (
                <div className="gba:warningMessageRow" data-testid={`${idPrefix}-warnings-row`}>
                  <Alert
                    message={getTranslationFromI18nKeyAndLabel(
                      "lowcoder:expense_request_wizard.trip_screen.future_date_warning",
                      "The selected date is in the future"
                    )}
                    type="warning"
                    showIcon
                    data-testid={`${idPrefix}-future-warning`}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}

    </div>
  );
};

export default LocationForm;
