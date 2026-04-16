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

interface TrashedNoteReadonlyDialogProps {
  noteTitle?: string
  canManage: boolean
  isRestoring: boolean
  onGoToNotesHome: () => void
  onRestore: () => void
  'data-testid'?: string
}

export function TrashedNoteReadonlyDialog({
  noteTitle,
  canManage,
  isRestoring,
  onGoToNotesHome,
  onRestore,
  'data-testid': testId = 'trashed-note-readonly-dialog'
}: TrashedNoteReadonlyDialogProps) {
  const { t } = useTranslation(translations)

  return (
    <AlertDialog open onOpenChange={() => {}}>
      <AlertDialogContent data-testid={testId}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('trashed-readonly-title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('trashed-readonly-description', {
              title: noteTitle || t('title-untitled-note')
            })}
          </AlertDialogDescription>
          <AlertDialogDescription>
            {canManage ? t('trashed-readonly-owner-note') : t('trashed-readonly-shared-note')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="secondary" onClick={onGoToNotesHome} data-testid={`${testId}-go-home-button`}>
            {t('trashed-readonly-go-home')}
          </Button>
          {canManage ? (
            <Button onClick={onRestore} disabled={isRestoring} data-testid={`${testId}-restore-button`}>
              {isRestoring ? t('trashed-readonly-restoring') : t('trashed-readonly-restore')}
            </Button>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
