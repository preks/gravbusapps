/**
 * DeletedTemplatesModal Component
 * Main modal for viewing and restoring deleted templates from selected instances
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Alert,
  AlertDescription,
  Spinner,
  TooltipProvider
} from '@newwork/nw-design-system'
import { FlowEngineInstance } from '../../types/instance'
import { DeletedTemplateWithName } from '../../hooks/useDeletedTemplates'
import { useDeletedTemplates } from '../../hooks/useDeletedTemplates'
import { DeletedTemplatesTable } from './DeletedTemplatesTable'
import { RestoreTemplateDialog } from './RestoreTemplateDialog'
import { Trash2, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'
import { createEnhancedError } from '../../utils/errorHandler'
import { EnhancedError } from '../../types/error'
import { EnhancedErrorAlert } from '../error/EnhancedErrorAlert'

interface DeletedTemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  instances: FlowEngineInstance[]
  sourceInstanceId: string
  targetInstanceId: string
  accessToken: string
  userId: string
  onTemplateRestored?: () => void
}

export const DeletedTemplatesModal: React.FC<DeletedTemplatesModalProps> = ({
  isOpen,
  onClose,
  instances,
  sourceInstanceId,
  accessToken,
  userId,
  onTemplateRestored
}) => {
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>(sourceInstanceId)
  const [selectedTemplate, setSelectedTemplate] = useState<DeletedTemplateWithName | null>(null)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null)
  const [restoreError, setRestoreError] = useState<EnhancedError | null>(null)
  const [viewingDetails, setViewingDetails] = useState<DeletedTemplateWithName | null>(null)

  // Get selected instance details
  const selectedInstance = instances.find(i => i.id === selectedInstanceId)
  const apiKey = selectedInstance?.apiKey || accessToken

  // Use the deleted templates hook
  const { deletedTemplates, isLoading, error, loadDeletedTemplates, restoreTemplate } = useDeletedTemplates({
    baseUrl: selectedInstance?.baseUrl || '',
    apiKey,
    accessToken
  })

  // Load deleted templates when instance changes
  useEffect(() => {
    if (isOpen && selectedInstance) {
      loadDeletedTemplates()
    }
  }, [isOpen, selectedInstanceId, selectedInstance, loadDeletedTemplates])

  // Reset selected instance when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedInstanceId(sourceInstanceId)
      setRestoreSuccess(null)
      setRestoreError(null)
    }
  }, [isOpen, sourceInstanceId])

  const handleInstanceChange = (instanceId: string) => {
    setSelectedInstanceId(instanceId)
    setRestoreSuccess(null)
    setRestoreError(null)
  }

  const handleRefresh = () => {
    setRestoreSuccess(null)
    setRestoreError(null)
    loadDeletedTemplates()
  }

  const handleRestoreClick = (template: DeletedTemplateWithName) => {
    setSelectedTemplate(template)
    setShowRestoreDialog(true)
    setRestoreSuccess(null)
    setRestoreError(null)
  }

  const handleRestoreConfirm = async () => {
    if (!selectedTemplate) return

    setIsRestoring(true)
    setRestoreSuccess(null)
    setRestoreError(null)

    try {
      await restoreTemplate(selectedTemplate.templateId, userId)
      setRestoreSuccess(`Template "${selectedTemplate.name}" has been restored successfully.`)
      setShowRestoreDialog(false)
      setSelectedTemplate(null)

      // Trigger refresh in parent component after delay
      if (onTemplateRestored) {
        setTimeout(() => {
          onTemplateRestored()
          setRestoreSuccess(null)
        }, 1500)
      }
    } catch (err) {
      console.error('Restore failed:', err)
      setRestoreError(
        createEnhancedError(err as Error, {
          operation: 'Restore Template',
          templateName: selectedTemplate.name,
          templateId: selectedTemplate.templateId,
          instanceName: selectedInstance?.name
        })
      )
      setShowRestoreDialog(false)
    } finally {
      setIsRestoring(false)
    }
  }

  const handleViewDetails = (template: DeletedTemplateWithName) => {
    setViewingDetails(template)
  }

  const handleCloseDetails = () => {
    setViewingDetails(null)
  }

  // Format date as dd.mm.yyyy HH:mm
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${day}.${month}.${year} ${hours}:${minutes}`
  }

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="gba:max-w-5xl gba:max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <Trash2 className="gba:h-5 gba:w-5" />
              Deleted Templates
            </DialogTitle>
            <DialogDescription>View and restore soft-deleted templates from your instances</DialogDescription>
          </DialogHeader>

          <div className="gba:space-y-4 gba:py-4 gba:overflow-y-auto">
            {/* Instance Selector and Refresh Button */}
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:flex-1">
                <label className="gba:text-sm gba:font-medium gba:mb-2 gba:block">Instance</label>
                <Select value={selectedInstanceId} onValueChange={handleInstanceChange}>
                  <SelectTrigger className="gba:w-full" data-testid="instance-selector">
                    <SelectValue placeholder="Select instance" />
                  </SelectTrigger>
                  <SelectContent>
                    {instances.map(instance => (
                      <SelectItem key={instance.id} value={instance.id}>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <span>{instance.icon}</span>
                          <span>{instance.name}</span>
                          <span className="gba:text-xs gba:text-muted-foreground">({instance.environment})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="gba:mt-6">
                <Button variant="outline" onClick={handleRefresh} disabled={isLoading} data-testid="refresh-button">
                  <RefreshCw className={`gba:h-4 gba:w-4 gba:mr-2 ${isLoading ? 'gba:animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Success Message */}
            {restoreSuccess && (
              <Alert variant="default" className="gba:bg-success gba:text-white gba:border-success">
                <CheckCircle2 className="gba:h-4 gba:w-4 gba:text-white" />
                <AlertDescription className="gba:text-white">{restoreSuccess}</AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {restoreError && <EnhancedErrorAlert error={restoreError} onDismiss={() => setRestoreError(null)} />}

            {/* Loading State */}
            {isLoading && (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
                <Spinner size="lg" />
                <span className="gba:ml-3 gba:text-muted-foreground">Loading deleted templates...</span>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <Alert variant="destructive">
                <AlertTriangle className="gba:h-4 gba:w-4" />
                <AlertDescription>
                  Failed to load deleted templates: {error.message}
                  <Button variant="link" onClick={handleRefresh} className="gba:ml-2">
                    Try Again
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Table */}
            {!isLoading && !error && (
              <DeletedTemplatesTable
                templates={deletedTemplates}
                onRestore={handleRestoreClick}
                onViewDetails={handleViewDetails}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <RestoreTemplateDialog
        isOpen={showRestoreDialog}
        onClose={() => setShowRestoreDialog(false)}
        template={selectedTemplate}
        onConfirm={handleRestoreConfirm}
        isRestoring={isRestoring}
      />

      {/* Details Modal */}
      {viewingDetails && (
        <Dialog open={!!viewingDetails} onOpenChange={handleCloseDetails}>
          <DialogContent className="gba:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Template Details</DialogTitle>
              <DialogDescription>{viewingDetails.name}</DialogDescription>
            </DialogHeader>
            <div className="gba:space-y-3 gba:py-4">
              <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:text-sm">
                <div>
                  <strong>Template ID:</strong> <code className="gba:text-xs">{viewingDetails.templateId}</code>
                </div>
                <div>
                  <strong>Version:</strong> {viewingDetails.version}
                </div>
                <div>
                  <strong>Deleted:</strong> {formatDate(viewingDetails.deletedAt)}
                </div>
                <div>
                  <strong>Deleted by:</strong> {viewingDetails.deletedByName}
                </div>
                <div className="gba:col-span-2">
                  <strong>Reason:</strong>
                  <p className="gba:mt-1 gba:p-3 gba:bg-muted gba:rounded-md">{viewingDetails.deletionReason}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </TooltipProvider>
  )
}
