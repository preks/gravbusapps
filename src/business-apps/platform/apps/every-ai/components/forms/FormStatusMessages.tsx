import React from 'react'

interface FormStatusMessagesProps {
  isFlowCompleted: boolean
  hasError: boolean
  isCancelled: boolean
}

export const FormStatusMessages: React.FC<FormStatusMessagesProps> = ({ isFlowCompleted, hasError, isCancelled }) => {
  if (isFlowCompleted) {
    return (
      <div className="gba:mt-4 gba:p-4 gba:bg-gradient-to-r gba:from-success-secondary gba:to-success-secondary/50 gba:border-2 gba:border-success/30 gba:rounded-xl gba:shadow-lg">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:h-10 gba:w-10 gba:rounded-full gba:bg-success/20 gba:flex gba:items-center gba:justify-center">
            <svg className="gba:h-5 gba:w-5 gba:text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="gba:text-success gba:font-semibold">Form submitted successfully!</p>
        </div>
      </div>
    )
  }

  if (hasError) {
    return (
      <div
        className="gba:mt-4 gba:p-4 gba:bg-gradient-to-r gba:from-destructive-secondary gba:to-destructive-secondary/50 gba:border-2 gba:border-destructive/30 gba:rounded-xl gba:shadow-lg"
        data-testid="dynamic-form-error"
      >
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:h-10 gba:w-10 gba:rounded-full gba:bg-destructive/20 gba:flex gba:items-center gba:justify-center">
            <svg className="gba:h-5 gba:w-5 gba:text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="gba:text-destructive gba:font-semibold">Form submission failed</p>
        </div>
      </div>
    )
  }

  if (isCancelled) {
    return (
      <div className="gba:mt-4 gba:p-4 gba:bg-gradient-to-r gba:from-destructive-secondary gba:to-destructive-secondary/50 gba:border-2 gba:border-destructive/30 gba:rounded-xl gba:shadow-lg">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:h-10 gba:w-10 gba:rounded-full gba:bg-destructive/20 gba:flex gba:items-center gba:justify-center">
            <svg className="gba:h-5 gba:w-5 gba:text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="gba:text-destructive gba:font-semibold">Form cancelled</p>
        </div>
      </div>
    )
  }

  return null
}
