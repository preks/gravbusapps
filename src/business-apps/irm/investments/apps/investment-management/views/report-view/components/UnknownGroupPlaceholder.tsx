import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { InfoIcon } from '@phosphor-icons/react'

interface UnknownGroupPlaceholderProps {
  groupName: string
}

/**
 * Placeholder component shown for investment groups that don't have
 * a configured report implementation yet.
 *
 * This allows new investment groups to be added to the catalog and
 * appear as tabs immediately, with a clear message that report
 * functionality needs to be configured.
 */
export const UnknownGroupPlaceholder: React.FC<UnknownGroupPlaceholderProps> = ({ groupName }) => {
  return (
    <div className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]">
      <Card className="gba:max-w-md">
        <CardContent className="gba:p-8">
          <div className="gba:text-center">
            <InfoIcon className="gba:w-16 gba:h-16 gba:mx-auto gba:mb-4 gba:text-muted-foreground" />
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">{groupName} Reports Coming Soon</h3>
            <p className="gba:text-muted-foreground gba:mb-4">
              Report functionality for {groupName} investments is not yet configured.
            </p>
            <p className="gba:text-sm gba:text-muted-foreground">
              To enable reports for this investment group, please contact your system administrator or development team
              to configure the report components.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
