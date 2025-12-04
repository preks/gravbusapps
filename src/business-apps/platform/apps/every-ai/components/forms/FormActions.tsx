import React from 'react'
import { Button } from '@newwork/nw-design-system'

interface FormActionsProps {
  isDeleteOperation: boolean
  isLoading: boolean
  onCancel?: () => void
}

export const FormActions: React.FC<FormActionsProps> = ({ isDeleteOperation, isLoading, onCancel }) => {
  return (
    <div className="gba:flex gba:justify-end gba:gap-3 gba:mt-6 gba:pt-4 gba:border-t-2 gba:border-border">
      <Button
        type="submit"
        className={
          isDeleteOperation
            ? 'gba:bg-gradient-to-r gba:from-destructive gba:to-destructive/80 hover:gba:shadow-lg gba:transition-all'
            : 'gba:bg-gradient-to-r gba:from-success gba:to-success/80 hover:gba:shadow-lg gba:transition-all'
        }
        variant={isDeleteOperation ? 'destructive' : 'default'}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="gba:flex gba:items-center gba:gap-2">
            <div
              className={`gba:h-4 gba:w-4 gba:border-2 gba:border-t-transparent gba:rounded-full gba:animate-spin ${
                isDeleteOperation ? 'gba:border-destructive-foreground' : 'gba:border-success-foreground'
              }`}
            />
            {isDeleteOperation ? 'Deleting...' : 'Submitting...'}
          </span>
        ) : isDeleteOperation ? (
          'Delete'
        ) : (
          'Submit'
        )}
      </Button>
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          className="hover:gba:shadow-lg gba:transition-all"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      )}
    </div>
  )
}
