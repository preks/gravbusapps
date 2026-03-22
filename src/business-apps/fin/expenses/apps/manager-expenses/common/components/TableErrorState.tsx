import React from 'react'
import { Button } from '@newwork/nw-design-system'

interface TableErrorStateProps {
  message: string | null
  testIdPrefix: string
}

export const TableErrorState: React.FC<TableErrorStateProps> = ({ message, testIdPrefix }) => (
  <div
    className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
    data-testid={`${testIdPrefix}-error-state`}
  >
    <div className="gba:text-muted-foreground gba:mb-4">{message}</div>
    <Button variant="default" onClick={() => globalThis.location.reload()} data-testid={`${testIdPrefix}-retry-button`}>
      Retry
    </Button>
  </div>
)
