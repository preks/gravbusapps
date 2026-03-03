import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { PiArrowLeft } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const DEFAULT_CLASS_NAME = ''
const DEFAULT_DATA_TEST_ID = 'back-button'

export interface BackButtonProps {
  /**
   * Custom back button text. If not provided, will use default translation.
   */
  customBackText?: string

  /**
   * Additional CSS classes for styling
   */
  className?: string

  /**
   * Data test ID for testing
   */
  dataTestId?: string

  /**
   * Custom callback function to handle back navigation
   */
  onBack?: () => void

  /**
   * Specific URL to navigate back to (instead of using browser history)
   */
  backUrl?: string
}

/**
 * Simple Back Button component that uses browser history.
 */
export const BackButton: React.FC<BackButtonProps> = ({
  customBackText,
  className = DEFAULT_CLASS_NAME,
  dataTestId = DEFAULT_DATA_TEST_ID,
  onBack,
  backUrl
}) => {
  const handleBackClick = () => {
    if (onBack) {
      onBack()
    } else if (backUrl) {
      window.location.href = backUrl
    } else {
      window.history.back()
    }
  }

  const variant = 'ghost'
  const backText =
    customBackText || getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.back_text', 'Back')

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleBackClick}
      className={`gba:flex gba:items-center gba:gap-2 ${className}`}
      data-testid={dataTestId}
    >
      <PiArrowLeft className="gba:h-4 gba:w-4" />
      <span>{backText}</span>
    </Button>
  )
}

export default BackButton
