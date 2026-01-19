import React from 'react'
import { Button } from '@newwork/nw-design-system'

interface FormActionsProps {
  isDeleteOperation: boolean
  isLoading: boolean
  isAgentGenerating?: boolean
  onCancel?: () => void
}

export const FormActions: React.FC<FormActionsProps> = ({
  isDeleteOperation,
  isLoading,
  isAgentGenerating = false,
  onCancel
}) => {
  const buttonClassName = isDeleteOperation
    ? 'gba:bg-gradient-to-r gba:from-destructive gba:to-destructive/80'
    : 'gba:bg-gradient-to-r gba:from-success gba:to-success/80'
  const spinnerClassName = isDeleteOperation ? 'gba:border-destructive-foreground' : 'gba:border-success-foreground'
  const buttonText = isLoading
    ? isDeleteOperation
      ? 'Deleting...'
      : 'Submitting...'
    : isAgentGenerating
      ? 'Waiting...'
      : isDeleteOperation
        ? 'Delete'
        : 'Submit'

  return (
    <div className="gba:flex gba:justify-end gba:gap-3 gba:mt-6 gba:pt-4 gba:border-t-2 gba:border-border">
      <Button
        type="submit"
        className={`${buttonClassName} hover:gba:shadow-lg gba:transition-all`}
        variant={isDeleteOperation ? 'destructive' : 'default'}
        disabled={isAgentGenerating || isLoading}
        data-testid="dynamic-form-submit-button"
      >
        {isLoading || isAgentGenerating ? (
          <span className="gba:flex gba:items-center gba:gap-2">
            <div
              className={`gba:h-4 gba:w-4 gba:border-2 gba:border-t-transparent gba:rounded-full gba:animate-spin ${spinnerClassName}`}
            />
            {buttonText}
          </span>
        ) : (
          buttonText
        )}
      </Button>
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          className="hover:gba:shadow-lg gba:transition-all"
          onClick={onCancel}
          disabled={isLoading}
          data-testid="dynamic-form-cancel-button"
        >
          Cancel
        </Button>
      )}
    </div>
  )
}
