import React from 'react';
import { InputField, Switch, DateInputField } from '@newwork/gravity-ui-catalog';

/**
 * LocationForm component props
 */
interface LocationFormProps {
  location: {
    id: string;
    name: string;
    isAbroad: boolean;
    location: string;
    departureDate: Date | null;
    departureTime: string;
    isCollapsed: boolean;
  };
  onUpdate: (field: string, value: any) => void;
  showDateTimeFields?: boolean;
  index?: number;
}

/**
 * LocationForm component for location input fields
 * @param props - Component props
 * @returns LocationForm component
 */
const LocationForm: React.FC<LocationFormProps> = ({
  location,
  onUpdate,
  showDateTimeFields = true,
  index
}) => {
  const idPrefix = index !== undefined ? `${location.id}-${index}` : location.id;
  
  return (
    <div className="gba:locationFormContent" data-testid={`${idPrefix}-form-content`}>
      <div className="gba:switchContainer" data-testid={`${idPrefix}-abroad-switch-container`}>
        <Switch
          label="Abroad"
          name={`${idPrefix}Abroad`}
          data-testid={`${idPrefix}-abroad-switch`}
          value={location.isAbroad}
          onChange={(checked) => onUpdate('isAbroad', checked.value)}
        />
      </div>
      
      <div className="gba:inputContainer" data-testid={`${idPrefix}-input-container`}>
        <InputField
          label={`${location.name}`}
          name={`${idPrefix}Location`}
          placeholder="Type in City"
          data-testid={`${idPrefix}-input`}
          value={location.location}
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
              onChange={(field) => onUpdate('departureDate', field.value)}
              required
            />
          </div>
          
          <div className="gba:timeInputContainer" data-testid={`${idPrefix}-time-container`}>
            <InputField
              label="Departure Time"
              name={`${idPrefix}DepartureTime`}
              placeholder="HH:MM"
              data-testid={`${idPrefix}-time-input`}
              value={location.departureTime}
              onChange={(field) => onUpdate('departureTime', field.value)}
              required
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationForm;
