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

interface TrashedDocumentReadonlyDialogProps {
  documentTitle?: string
  canRestore: boolean
  isRestoring: boolean
  onGoToDocsHome: () => void
  onRestore: () => void
  'data-testid'?: string
}

export function TrashedDocumentReadonlyDialog({
  documentTitle,
  canRestore,
  isRestoring,
  onGoToDocsHome,
  onRestore,
  'data-testid': testId = 'trashed-document-readonly-dialog'
}: TrashedDocumentReadonlyDialogProps) {
  const { t } = useTranslation(translations)

  return (
    <AlertDialog open onOpenChange={() => {}}>
      <AlertDialogContent data-testid={testId}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('trashed-readonly-title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('trashed-readonly-description', {
              title: documentTitle || t('title-untitled-document')
            })}
          </AlertDialogDescription>
          <AlertDialogDescription>
            {canRestore ? t('trashed-readonly-owner-note') : t('trashed-readonly-shared-note')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="secondary" onClick={onGoToDocsHome} data-testid={`${testId}-go-home-button`}>
            {t('trashed-readonly-go-home')}
          </Button>
          {canRestore ? (
            <Button onClick={onRestore} disabled={isRestoring} data-testid={`${testId}-restore-button`}>
              {isRestoring ? t('trashed-readonly-restoring') : t('trashed-readonly-restore')}
            </Button>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
