import React from 'react';
import { InputField, Switch, DateInputField, TimeInputField } from '@newwork/gravity-ui-catalog';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
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
  };
  onUpdate: (field: string, value: any) => void;
  showDateTimeFields?: boolean;
  index?: number;
  dateTimeLimits: DateTimeLimits;
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
  dateTimeLimits
}) => {
  const { minDate, minTime, maxDate, maxTime } = dateTimeLimits;
  const { id,
    name,
    isAbroad,
    location,
    departureDate,
    departureTime} = locationData
    const idPrefix = index !== undefined ? `${id}-${index}` : id;

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
      
      {showDateTimeFields && (
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
      )}
    </div>
  );
};

export default LocationForm;
