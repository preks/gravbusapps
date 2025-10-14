import React from 'react'
import { BusinessAppContextProps } from '@/business-apps/types'
import { ICONS } from '../../../utils/icons'

/**
 * LoadScreen component props
 */
interface LoadScreenProps extends BusinessAppContextProps {
  additionalData?: {
    mdi_modulePayload?: {
      tripData?: any
    }
    [key: string]: any
  }
}

/**
 * LoadScreen component for expense request wizard
 * Shows a centered spinner while waiting for the initial screen to load
 * @param props - Component props
 * @returns LoadScreen component
 */
const LoadScreen: React.FC<LoadScreenProps> = () => {
  return (
    <div
      className="gba:flex gba:items-center gba:justify-center gba:h-[100%] gba:w-[100%]"
      data-testid="expense-request-wizard-load-screen"
    >
      <img
        src={ICONS.SPINNER_ICON}
        alt="Loading"
        className="gba:w-10 gba:h-10"
        data-testid="expense-request-wizard-spinner-icon"
      />
    </div>
  )
}

export default LoadScreen
