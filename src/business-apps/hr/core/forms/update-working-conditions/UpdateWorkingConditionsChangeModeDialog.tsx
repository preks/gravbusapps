import React from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../_i18n'

export type ChangeMode = 'UPDATE' | 'INSERT'

interface UpdateWorkingConditionsChangeModeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (changeMode: ChangeMode) => void
}

export const UpdateWorkingConditionsChangeModeDialog: React.FC<UpdateWorkingConditionsChangeModeDialogProps> = ({
  open,
  onOpenChange,
  onConfirm
}) => {
  const { t } = useTranslation(translations)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:z-[300]" data-testid="flw_updateWorkingConditions_changeModeDialog">
        <DialogHeader>
          <DialogTitle>{t('working-conditions-change-mode-title')}</DialogTitle>
        </DialogHeader>
        <p className="gba:text-sm gba:text-muted-foreground">{t('working-conditions-change-mode-description')}</p>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onConfirm('UPDATE')}
            data-testid="flw_updateWorkingConditions_changeModeUpdateBtn"
          >
            {t('working-conditions-change-mode-update')}
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm('INSERT')}
            data-testid="flw_updateWorkingConditions_changeModeAddBtn"
          >
            {t('working-conditions-change-mode-add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default UpdateWorkingConditionsChangeModeDialog
