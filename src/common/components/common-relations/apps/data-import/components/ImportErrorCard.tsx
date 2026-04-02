import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { XCircleIcon } from '@phosphor-icons/react'

interface ImportErrorCardProps {
  error: string
  title?: string
  'data-testid'?: string
}

export const ImportErrorCard: React.FC<ImportErrorCardProps> = ({
  error,
  title = 'Analysis Failed',
  'data-testid': testId = 'import-error-card'
}) => {
  return (
    <Card className="gba:mb-6 gba:border-destructive-ring" data-testid={testId}>
      <CardContent className="gba:py-10">
        <div className="gba:flex gba:flex-col gba:items-center gba:text-center gba:gap-4">
          <div className="gba:flex gba:items-center gba:justify-center gba:w-16 gba:h-16 gba:rounded-full gba:bg-destructive-secondary">
            <XCircleIcon className="gba:w-8 gba:h-8 gba:text-destructive" weight="fill" />
          </div>
          <div className="gba:space-y-2">
            <p className="gba:font-semibold gba:text-base gba:text-destructive">{title}</p>
            <p className="gba:text-sm gba:text-muted-foreground">{error}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
