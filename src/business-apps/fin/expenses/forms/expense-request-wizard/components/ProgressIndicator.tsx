import React from 'react'
import { SCREEN_NAMES_ENUM } from '../constants/constants'

interface ProgressIndicatorProps {
  currentScreen: string
  isTrip?: boolean
  isPlan?: boolean
}

/**
 * Progress indicator component for the expense request wizard
 * Shows 4 horizontal lines with different states based on current screen
 * @param props - Component props
 * @returns ProgressIndicator component
 */
const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentScreen, isTrip = true, isPlan = false }) => {
  // Determine which lines should be filled based on current screen and request type
  const getLineStates = () => {
    // For non-trip expense requests, we only show Items and Summary tabs
    if (!isTrip) {
      if (isPlan) {
        switch (currentScreen) {
          case SCREEN_NAMES_ENUM.ITEMS_TAB:
            return [true, false, false] // Expense Items: 1st line filled
          case SCREEN_NAMES_ENUM.PAYMENT_TAB:
            return [false, true, false] // Expense Items: 1st line filled
          case SCREEN_NAMES_ENUM.SUMMARY_TAB:
            return [true, true, true] // Summary: Both lines filled
          default:
            return [false, false, false]
        }
      } else {
        switch (currentScreen) {
          case SCREEN_NAMES_ENUM.ITEMS_TAB:
            return [true, false] // Expense Items: 1st line filled
          case SCREEN_NAMES_ENUM.SUMMARY_TAB:
            return [true, true] // Summary: Both lines filled
          default:
            return [false, false]
        }
      }
    } else {
      // For trip expense requests, we show all tabs
      switch (currentScreen) {
        case SCREEN_NAMES_ENUM.TRIPS_TAB:
          return [true, false, false, false] // Trip Details: 1st line filled
        case SCREEN_NAMES_ENUM.ITEMS_TAB:
          return [true, true, false, false] // Expense Items: 1st and 2nd lines filled
        case SCREEN_NAMES_ENUM.ALLOWANCE_TAB:
        case SCREEN_NAMES_ENUM.PAYMENT_TAB:
          return [true, true, true, false] // Allowances: 1st, 2nd, and 3rd lines filled
        case SCREEN_NAMES_ENUM.SUMMARY_TAB:
          return [true, true, true, true] // Summary: All lines filled
        default:
          return [false, false, false, false]
      }
    }
  }

  const lineStates = getLineStates()

  // Create a custom style for the progress indicator container based on isTrip
  const containerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    margin: '0 0 30px 0',
    width: '100%'
  }

  // Create a custom style for each progress line based on isTrip
  const getLineStyle = () => {
    if (!isTrip) {
      // For non-trip requests, make each bar take up 50% of the space
      return {
        width: '49%',
        height: '3px',
        borderRadius: '1.5px'
      }
    } else {
      // For trip requests, keep the default 25% width
      return {}
    }
  }

  return (
    <div
      className="gba:flex gba:justify-between gba:gap-2 gba:mb-[30px]"
      style={containerStyle}
      data-testid="expense-request-wizard-progress-indicator"
    >
      {lineStates.map((isFilled, index) => (
        <div
          key={`progress-line-${index}`}
          className={`gba:h-[3px] gba:w-1/4 gba:rounded-[1.5px] ${isFilled ? 'gba:bg-foreground' : 'gba:bg-muted'}`}
          style={getLineStyle()}
          data-testid={`expense-request-wizard-progress-line-${index}`}
        />
      ))}
    </div>
  )
}

export default ProgressIndicator
