import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Button,
  Alert,
  AlertDescription,
  Badge,
  Spinner,
  ScrollArea
} from '@newwork/nw-design-system'
import { Rocket, Trash2, Download, Check, AlertTriangle, Database, FileSpreadsheet } from 'lucide-react'
import { BulkAction } from './DefinitionsTable'

interface BulkActionDialogProps {
  open: boolean
  onClose: () => void
  action: BulkAction | null
  onConfirmPromote: () => Promise<{ success: any[]; failed: string[] } | undefined>
  onConfirmDelete: () => Promise<{ success: string[]; failed: string[] } | undefined>
  onConfirmExport: () => void
  'data-testid'?: string
}

/**
 * Bulk Action Dialog for confirming bulk operations
 */
export const BulkActionDialog: React.FC<BulkActionDialogProps> = ({
  open,
  onClose,
  action,
  onConfirmPromote,
  onConfirmDelete,
  onConfirmExport,
  'data-testid': testId = 'bulk-action-dialog'
}) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ success: number; failed: string[] } | null>(null)

  const handleConfirm = useCallback(async () => {
    if (!action) return

    setIsProcessing(true)
    setError(null)

    try {
      if (action.type === 'promote') {
        const res = await onConfirmPromote()
        if (res) {
          setResult({ success: res.success.length, failed: res.failed })
        }
      } else if (action.type === 'delete') {
        const res = await onConfirmDelete()
        if (res) {
          setResult({ success: res.success.length, failed: res.failed })
        }
      } else if (action.type === 'export') {
        onConfirmExport()
        handleClose()
        return
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setIsProcessing(false)
    }
  }, [action, onConfirmPromote, onConfirmDelete, onConfirmExport])

  const handleClose = useCallback(() => {
    setError(null)
    setResult(null)
    onClose()
  }, [onClose])

  if (!action) return null

  const getTitle = () => {
    switch (action.type) {
      case 'promote':
        return 'Bulk Promote Entities'
      case 'delete':
        return 'Delete Definitions'
      case 'export':
        return 'Export Definitions'
      default:
        return 'Bulk Action'
    }
  }

  const getDescription = () => {
    switch (action.type) {
      case 'promote':
        return `Promote ${action.definitions.length} entities to native PostgreSQL tables`
      case 'delete':
        return `Permanently delete ${action.definitions.length} definitions`
      case 'export':
        return `Export ${action.definitions.length} definitions as JSON`
      default:
        return ''
    }
  }

  const getIcon = () => {
    switch (action.type) {
      case 'promote':
        return <Rocket className="gba:h-5 gba:w-5 gba:text-primary" />
      case 'delete':
        return <Trash2 className="gba:h-5 gba:w-5 gba:text-destructive" />
      case 'export':
        return <Download className="gba:h-5 gba:w-5 gba:text-info" />
      default:
        return null
    }
  }

  const getButtonVariant = () => {
    if (action.type === 'delete') {
      return 'destructive' as const
    }
    return 'default' as const
  }

  const getButtonText = () => {
    if (isProcessing) {
      switch (action.type) {
        case 'promote':
          return 'Promoting...'
        case 'delete':
          return 'Deleting...'
        case 'export':
          return 'Exporting...'
        default:
          return 'Processing...'
      }
    }
    switch (action.type) {
      case 'promote':
        return `Promote ${action.definitions.length} Entities`
      case 'delete':
        return `Delete ${action.definitions.length} Definitions`
      case 'export':
        return `Export ${action.definitions.length} Definitions`
      default:
        return 'Confirm'
    }
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {/* Selected Items List */}
          <div className="gba:bg-muted/50 gba:rounded-lg gba:p-4">
            <p className="gba:text-sm gba:font-medium gba:mb-3">Selected definitions ({action.definitions.length})</p>
            <ScrollArea className="gba:max-h-[200px]">
              <div className="gba:space-y-2">
                {action.definitions.map(def => (
                  <div
                    key={def.id}
                    className="gba:flex gba:items-center gba:justify-between gba:bg-background gba:rounded gba:px-3 gba:py-2"
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      {def.kind === 'SPREADSHEET' ? (
                        <FileSpreadsheet className="gba:h-4 gba:w-4 gba:text-info" />
                      ) : (
                        <Database className="gba:h-4 gba:w-4 gba:text-secondary" />
                      )}
                      <span className="gba:text-sm">{def.display_name || def.key}</span>
                    </div>
                    <Badge variant={def.kind === 'SPREADSHEET' ? 'info' : 'secondary'} className="gba:text-xs">
                      {def.kind}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Warning for delete */}
          {action.type === 'delete' && !result && (
            <Alert variant="destructive">
              <AlertTriangle className="gba:h-4 gba:w-4" />
              <AlertDescription>
                <p className="gba:font-medium">This action cannot be undone!</p>
                <p className="gba:text-xs gba:mt-1">
                  All selected definitions and their data will be permanently deleted.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Warning for promote */}
          {action.type === 'promote' && !result && (
            <Alert>
              <AlertTriangle className="gba:h-4 gba:w-4 gba:text-warning" />
              <AlertDescription className="gba:text-xs">
                <p>Each entity will be promoted to a native PostgreSQL table.</p>
                <p className="gba:mt-1">This action cannot be undone.</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Success result */}
          {result && (
            <Alert className="gba:bg-success-secondary gba:border-success">
              <Check className="gba:h-4 gba:w-4 gba:text-success" />
              <AlertDescription className="gba:text-success-secondary-foreground">
                <p className="gba:font-medium">
                  {result.success} {result.success === 1 ? 'item' : 'items'} processed successfully
                </p>
                {result.failed.length > 0 && (
                  <div className="gba:mt-2">
                    <p className="gba:text-xs gba:text-destructive">Failed: {result.failed.join(', ')}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="gba:h-4 gba:w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              variant={getButtonVariant()}
              onClick={handleConfirm}
              disabled={isProcessing}
              data-testid={`${testId}-confirm`}
            >
              {isProcessing && <Spinner size="sm" className="gba:mr-2" />}
              {getButtonText()}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
