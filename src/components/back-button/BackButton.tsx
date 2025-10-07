import React from 'react';
import { Button } from '@newwork/nw-design-system';
import { PiArrowLeft } from 'react-icons/pi';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

export interface BackButtonProps {
  /**
   * Custom back button text. If not provided, will use default translation.
   */
  customBackText?: string;
  
  /**
   * Additional CSS classes for styling
   */
  className?: string;
  
  /**
   * Data test ID for testing
   */
  dataTestId?: string;
}

/**
 * Simple Back Button component that uses browser history.back() for all cases.
 * This is the simplest solution that works universally.
 */
export const BackButton: React.FC<BackButtonProps> = ({
  customBackText,
  className = '',
  dataTestId = 'back-button'
}) => {
  const handleBackClick = () => {
    // Use window.history.back() - the simplest solution
    window.history.back();
    
  };

  const backText = customBackText || getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.back_text', 'Back');

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBackClick}
      className={`gba:flex gba:items-center gba:gap-2 ${className}`}
      data-testid={dataTestId}
    >
      <PiArrowLeft className="gba:h-4 gba:w-4" />
      <span>{backText}</span>
    </Button>
  );
};

export default BackButton;
