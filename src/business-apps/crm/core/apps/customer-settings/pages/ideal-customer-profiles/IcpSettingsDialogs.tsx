import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import customerSettingsI18n from '../../_i18n'
import type { IcpProfileListItem } from './IcpProfileListSidebar'

export interface IcpSettingsDialogsProps {
  dataTestIdPrefix: string
  newDialogOpen: boolean
  onNewDialogOpenChange: (open: boolean) => void
  newCode: string
  newName: string
  onNewCodeChange: (v: string) => void
  onNewNameChange: (v: string) => void
  creating: boolean
  onCreateSubmit: () => void
  deleteTarget: IcpProfileListItem | null
  onDeleteTargetChange: (target: IcpProfileListItem | null) => void
  deleting: boolean
  onDeleteConfirm: () => void
}

export const IcpSettingsDialogs: React.FC<IcpSettingsDialogsProps> = ({
  dataTestIdPrefix,
  newDialogOpen,
  onNewDialogOpenChange,
  newCode,
  newName,
  onNewCodeChange,
  onNewNameChange,
  creating,
  onCreateSubmit,
  deleteTarget,
  onDeleteTargetChange,
  deleting,
  onDeleteConfirm
}) => {
  const { t } = useTranslation(customerSettingsI18n)

  return (
    <>
      <Dialog open={newDialogOpen} onOpenChange={onNewDialogOpenChange}>
        <DialogContent data-testid={`${dataTestIdPrefix}-new-dialog`}>
          <DialogHeader>
            <DialogTitle>{t('icp-dialog-new-profile-title')}</DialogTitle>
            <DialogDescription>{t('icp-dialog-new-profile-description')}</DialogDescription>
          </DialogHeader>
          <div className="gba:space-y-4">
            <div className="gba:space-y-2">
              <Label htmlFor={`${dataTestIdPrefix}-new-code`}>{t('icp-code')}</Label>
              <Input
                id={`${dataTestIdPrefix}-new-code`}
                value={newCode}
                onChange={e => onNewCodeChange(e.target.value)}
                data-testid={`${dataTestIdPrefix}-new-code`}
              />
            </div>
            <div className="gba:space-y-2">
              <Label htmlFor={`${dataTestIdPrefix}-new-name`}>{t('icp-display-name')}</Label>
              <Input
                id={`${dataTestIdPrefix}-new-name`}
                value={newName}
                onChange={e => onNewNameChange(e.target.value)}
                data-testid={`${dataTestIdPrefix}-new-name`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onNewDialogOpenChange(false)}>
              {t('icp-cancel')}
            </Button>
            <Button
              type="button"
              onClick={onCreateSubmit}
              disabled={creating || !newCode.trim() || !newName.trim()}
              data-testid={`${dataTestIdPrefix}-new-submit`}
            >
              {creating ? <Spinner size="sm" /> : t('icp-create-profile')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={open => !open && onDeleteTargetChange(null)}>
        <AlertDialogContent data-testid={`${dataTestIdPrefix}-delete-dialog`}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('icp-delete-confirm-title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('icp-delete-confirm-message', {
                name: deleteTarget?.value ?? deleteTarget?.code ?? ''
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('icp-cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteConfirm}
              disabled={deleting}
              className="gba:bg-destructive gba:text-destructive-foreground gba:hover:bg-destructive"
              data-testid={`${dataTestIdPrefix}-delete-confirm`}
            >
              {deleting ? <Spinner size="sm" /> : t('icp-delete-action')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
