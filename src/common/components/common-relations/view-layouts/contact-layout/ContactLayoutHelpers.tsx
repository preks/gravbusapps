import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

/**
 * Default row actions component for contact rows
 */
export const DefaultContactRowActions = <TContact extends { id: string }>({
  row,
  accessToken,
  entityContext
}: {
  row: { original: TContact }
  accessToken: string
  entityContext: FlowContextName
}) => (
  <AppActionMenu
    contextsArray={[entityContext]}
    externalContextData={{ contactId: row.original.id }}
    prefixDataTestId="contact-actions"
    accessToken={accessToken}
    emptyStateBehavior="enable"
    deferMainContextRequestsUntilClick
  >
    <Button variant="ghost" size="icon" data-testid={`contact-actions-${row.original.id}`}>
      <svg className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
        />
      </svg>
    </Button>
  </AppActionMenu>
)
