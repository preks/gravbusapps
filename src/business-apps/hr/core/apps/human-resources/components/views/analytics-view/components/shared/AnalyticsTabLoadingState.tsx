import React from 'react'
import { Spinner } from '@newwork/nw-design-system'

interface AnalyticsTabLoadingStateProps {
  dataTestId: string
  message?: string
  className?: string
}

const AnalyticsTabLoadingState: React.FC<AnalyticsTabLoadingStateProps> = ({
  dataTestId,
  message,
  className = 'gba:min-h-[260px]'
}) => {
  return (
    <div data-testid={dataTestId} className={`gba:flex gba:flex-col gba:items-center gba:justify-center ${className}`}>
      <Spinner className="gba:w-8 gba:h-8" />
      {message ? <p className="gba:mt-4 gba:text-muted-foreground">{message}</p> : null}
    </div>
  )
}

export default AnalyticsTabLoadingState
