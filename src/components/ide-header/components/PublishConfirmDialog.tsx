import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button
} from '@newwork/nw-design-system'
import { CloudArrowUpIcon } from '@phosphor-icons/react'
import type { BusinessAppInfo } from '@/components/ide-main-menu'

export interface PublishConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedApp: BusinessAppInfo | null
  onConfirm: () => void
}

export const PublishConfirmDialog: React.FC<PublishConfirmDialogProps> = ({
  open,
  onOpenChange,
  selectedApp,
  onConfirm
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="gba:max-w-[450px]">
      <DialogHeader>
        <DialogTitle>Publish Screen</DialogTitle>
        <DialogDescription>Publish this screen to dev?</DialogDescription>
      </DialogHeader>
      {selectedApp && (
        <div className="gba:bg-muted gba:p-3 gba:rounded-lg gba:space-y-1">
          <div className="gba:text-sm">
            <span className="gba:text-muted-foreground">Screen: </span>
            <span className="gba:font-medium">{selectedApp.name}</span>
          </div>
          <div className="gba:text-sm">
            <span className="gba:text-muted-foreground">Path: </span>
            <code className="gba:text-xs gba:bg-background gba:px-1 gba:py-0.5 gba:rounded">
              {selectedApp.screenKey}
            </code>
          </div>
        </div>
      )}
      <DialogFooter className="gba:gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={onConfirm}>
          <CloudArrowUpIcon size={14} className="gba:mr-1.5" />
          Publish
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
