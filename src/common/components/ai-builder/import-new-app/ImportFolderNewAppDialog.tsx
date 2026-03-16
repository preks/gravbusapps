import React from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label
} from '@newwork/nw-design-system'

interface ImportFolderNewAppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  targetPath: string
  onTargetPathChange: (value: string) => void
  resourceUrl: string
  onResourceUrlChange: (value: string) => void
  confirmLabel?: string
  cancelLabel?: string
  isSubmitting?: boolean
  errorMessage?: string | null
  onConfirm: () => void | Promise<void>
}

export const ImportFolderNewAppDialog: React.FC<ImportFolderNewAppDialogProps> = ({
  open,
  onOpenChange,
  title = 'Import Folder as New App',
  description = 'Configure where the imported app should live before creating a new app session.',
  targetPath,
  onTargetPathChange,
  resourceUrl,
  onResourceUrlChange,
  confirmLabel = 'Create App',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  errorMessage,
  onConfirm
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-xl" data-testid="import-folder-new-app-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="gba:rounded-md gba:border gba:border-border gba:bg-muted/30 gba:px-3 gba:py-2 gba:text-xs gba:text-muted-foreground gba:space-y-1">
          <p>
            <span className="gba:font-medium gba:text-foreground">Target path:</span> project folder path inside the
            repository.
          </p>
          <p className="gba:font-mono">Example: custom/common/apps/warranty-request-list</p>
          <p className="gba:pt-1">
            <span className="gba:font-medium gba:text-foreground">Resource URL:</span> platform URL used when opening
            the app.
          </p>
          <p className="gba:font-mono">Example: /platform/generated/warranty-request-list</p>
        </div>

        <div className="gba:space-y-3">
          <div className="gba:space-y-1.5">
            <Label htmlFor="import-new-app-target-path">Target path</Label>
            <Input
              id="import-new-app-target-path"
              value={targetPath}
              onChange={event => onTargetPathChange(event.target.value)}
              placeholder="custom/common/apps/my-app"
              autoFocus
              disabled={isSubmitting}
              data-testid="import-new-app-target-path"
            />
          </div>
          <div className="gba:space-y-1.5">
            <Label htmlFor="import-new-app-resource-url">Resource URL</Label>
            <Input
              id="import-new-app-resource-url"
              value={resourceUrl}
              onChange={event => onResourceUrlChange(event.target.value)}
              placeholder="/platform/generated/my-app"
              disabled={isSubmitting}
              data-testid="import-new-app-resource-url"
            />
          </div>
          {errorMessage ? <p className="gba:text-sm gba:text-destructive">{errorMessage}</p> : null}
        </div>

        <DialogFooter className="gba:gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            data-testid="import-new-app-cancel"
          >
            {cancelLabel}
          </Button>
          <Button type="button" onClick={() => void onConfirm()} disabled={isSubmitting} data-testid="import-new-app-confirm">
            {isSubmitting ? 'Importing...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImportFolderNewAppDialog
