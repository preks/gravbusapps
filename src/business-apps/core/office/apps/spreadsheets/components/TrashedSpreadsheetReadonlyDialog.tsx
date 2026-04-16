import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../_i18n'
import { PermanentDeleteConfirmDialog } from '@/business-apps/platform/apps/shared/components/PermanentDeleteConfirmDialog'

interface TrashedSpreadsheetReadonlyDialogProps {
  spreadsheetTitle?: string
  canManage: boolean
  isRestoring: boolean
  isDeleting: boolean
  onBackToTrash: () => void
  onRestore: () => void
  onDeletePermanently: () => void
  'data-testid'?: string
}

export function TrashedSpreadsheetReadonlyDialog({
  spreadsheetTitle,
  canManage,
  isRestoring,
  isDeleting,
  onBackToTrash,
  onRestore,
  onDeletePermanently,
  'data-testid': testId = 'trashed-spreadsheet-readonly-dialog'
}: TrashedSpreadsheetReadonlyDialogProps) {
  const { t } = useTranslation(translations)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  return (
    <>
      <AlertDialog open onOpenChange={() => {}}>
        <AlertDialogContent data-testid={testId}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('trashed-readonly-title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('trashed-readonly-description', {
                title: spreadsheetTitle || t('title-untitled')
              })}
            </AlertDialogDescription>
            <AlertDialogDescription>
              {canManage ? t('trashed-readonly-owner-note') : t('trashed-readonly-shared-note')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="secondary" onClick={onBackToTrash} data-testid={`${testId}-back-button`}>
              {t('trashed-readonly-back')}
            </Button>
            {canManage ? (
              <>
                <Button
                  onClick={onRestore}
                  disabled={isRestoring || isDeleting}
                  data-testid={`${testId}-restore-button`}
                >
                  {isRestoring ? t('trashed-readonly-restoring') : t('trashed-readonly-restore')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={isRestoring || isDeleting}
                  data-testid={`${testId}-delete-button`}
                >
                  {isDeleting ? t('trashed-readonly-deleting') : t('trashed-readonly-delete')}
                </Button>
              </>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PermanentDeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={open => {
          if (!isDeleting) {
            setDeleteConfirmOpen(open)
          }
        }}
        itemName={spreadsheetTitle || t('title-untitled')}
        onConfirm={onDeletePermanently}
        isDeleting={isDeleting}
        data-testid={`${testId}-delete-confirm`}
      />
    </>
  )
}
