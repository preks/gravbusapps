import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import translations from './_i18n'

export interface DeleteLayoutProps {
  /** The translated type of item being deleted (e.g., "Job Request", "Job Candidate") */
  itemType: string

  /** The title/name of the item being deleted */
  itemTitle: string

  /** Data test ID prefix for testing */
  'data-testid'?: string
}

/**
 * DeleteLayout
 * Classic, non-aggressive delete confirmation layout component.
 * Displays a confirmation message with item type and title, plus a warning.
 * Should be wrapped in AppActionForm with processType="delete".
 */
export const DeleteLayout: React.FC<DeleteLayoutProps> = ({
  itemType,
  itemTitle,
  'data-testid': dataTestId = 'delete-layout'
}) => {
  const { t } = useTranslation(translations)

  const confirmationMessage = t('confirmation', {
    itemType,
    itemTitle
  })

  const warningMessage = t('warning')

  return (
    <div className="gba:space-y-4" data-testid={dataTestId}>
      <div className="gba:mb-4">
        <p className="gba:text-base gba:text-foreground" data-testid={formatDataTestId(dataTestId, 'message')}>
          {confirmationMessage}
        </p>
      </div>

      <div className="gba:rounded-md gba:border gba:border-border gba:bg-muted/50 gba:p-3">
        <p className="gba:text-sm gba:text-muted-foreground" data-testid={formatDataTestId(dataTestId, 'warning')}>
          {warningMessage}
        </p>
      </div>
    </div>
  )
}

export default DeleteLayout
