import React from 'react';
import { SCREEN_NAMES_ENUM } from '../constants/constants';

interface ProgressIndicatorProps {
  currentScreen: string;
}

/**
 * Progress indicator component for the expense request wizard
 * Shows 4 horizontal lines with different states based on current screen
 * @param props - Component props
 * @returns ProgressIndicator component
 */
const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentScreen }) => {
  // Determine which lines should be filled based on current screen
  const getLineStates = () => {
    switch (currentScreen) {
      case SCREEN_NAMES_ENUM.TRIPS_TAB:
        return [true, false, false, false]; // Trip Details: 1st line filled
      case SCREEN_NAMES_ENUM.ITEMS_TAB:
        return [true, true, false, false]; // Expense Items: 1st and 2nd lines filled
      case SCREEN_NAMES_ENUM.ALLOWANCE_TAB:
        return [true, true, true, false]; // Allowances: 1st, 2nd, and 3rd lines filled
      case SCREEN_NAMES_ENUM.SUMMARY_TAB:
        return [true, true, true, true]; // Summary: All lines filled
      default:
        return [false, false, false, false];
    }
  };

  const lineStates = getLineStates();

  return (
    <div 
      className="gba:progressIndicator" 
      data-testid="expense-request-wizard-progress-indicator"
    >
      {lineStates.map((isFilled, index) => (
        <div
          key={`progress-line-${index}`}
          className={`gba:progressLine ${isFilled ? 'gba:progressLineFilled' : 'gba:progressLineEmpty'}`}
          data-testid={`expense-request-wizard-progress-line-${index}`}
        />
      ))}
    </div>
  );
};

export default ProgressIndicator;
