import React, { useState } from 'react';
import { DateTimeField } from './DateTimeField';

/**
 * Simple test component to verify DateTimeField works in isolation
 * Add this temporarily to TaskRecord to test the component directly
 */
export const DateTimeFieldTest: React.FC = () => {
  const [dateValue, setDateValue] = useState<Date | null>(null);
  const [datetimeValue, setDatetimeValue] = useState<Date | null>(null);

  console.log('🧪 [DateTimeFieldTest] Rendering test component');

  return (
    <div className="gba:p-4 gba:bg-yellow-50 gba:border gba:border-yellow-200 gba:rounded-lg gba:space-y-4">
      <h3 className="gba:text-lg gba:font-semibold gba:text-yellow-800">
        🧪 DateTimeField Test Component
      </h3>
      
      <div className="gba:space-y-4">
        <div>
          <h4 className="gba:text-sm gba:font-medium gba:mb-2">Date Field Test:</h4>
          <DateTimeField
            name="test-date"
            label="Test Date Field"
            showLabel={true}
            type="date"
            value={dateValue}
            onChange={(date) => {
              console.log('🧪 Date changed:', date);
              setDateValue(date);
            }}
            required
            description="This is a test date field"
          />
          <p className="gba:text-xs gba:text-gray-600 gba:mt-1">
            Current value: {dateValue ? dateValue.toISOString() : 'null'}
          </p>
        </div>

        <div>
          <h4 className="gba:text-sm gba:font-medium gba:mb-2">DateTime Field Test:</h4>
          <DateTimeField
            name="test-datetime"
            label="Test DateTime Field"
            showLabel={true}
            type="datetime"
            value={datetimeValue}
            onChange={(date) => {
              console.log('🧪 DateTime changed:', date);
              setDatetimeValue(date);
            }}
            required
            description="This is a test datetime field"
          />
          <p className="gba:text-xs gba:text-gray-600 gba:mt-1">
            Current value: {datetimeValue ? datetimeValue.toISOString() : 'null'}
          </p>
        </div>
      </div>
    </div>
  );
};
