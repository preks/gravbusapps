/**
 * InstanceManagementPage Component
 * Main page for managing flow engine instances
 */

import React, { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Button, Alert, AlertDescription } from '@newwork/nw-design-system'
import { Plus, Settings, RefreshCw } from 'lucide-react'
import { useInstanceManagement, InstanceFormData } from '../../hooks/useInstanceManagement'
import { FlowEngineInstance } from '../../types/instance'
import { InstanceTable } from './InstanceTable'
import { InstanceFormDialog } from './InstanceFormDialog'
import { InstanceDeleteDialog } from './InstanceDeleteDialog'
import { EnhancedErrorAlert } from '../error/EnhancedErrorAlert'
import { EnhancedError } from '../../types/error'

interface InstanceManagementPageProps {
  context: BusinessAppContextProps
}

export const InstanceManagementPage: React.FC<InstanceManagementPageProps> = ({ context }) => {
  const {
    catalogInstances,
    isLoading,
    error,
    isCreating,
    isUpdating,
    isDeleting,
    createInstance,
    updateInstance,
    deleteInstance,
    refetch
  } = useInstanceManagement(context.accessToken)

  const [showFormDialog, setShowFormDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<FlowEngineInstance | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [operationError, setOperationError] = useState<EnhancedError | null>(null)

  const handleAddInstance = () => {
    setSelectedInstance(null)
    setShowFormDialog(true)
    setSuccessMessage(null)
    setOperationError(null)
  }

  const handleEditInstance = (instance: FlowEngineInstance) => {
    setSelectedInstance(instance)
    setShowFormDialog(true)
    setSuccessMessage(null)
    setOperationError(null)
  }

  const handleDeleteInstance = (instance: FlowEngineInstance) => {
    setSelectedInstance(instance)
    setShowDeleteDialog(true)
    setSuccessMessage(null)
    setOperationError(null)
  }

  const handleFormSubmit = async (data: InstanceFormData) => {
    setOperationError(null)
    setSuccessMessage(null)

    try {
      if (selectedInstance) {
        // Update existing instance
        await updateInstance(selectedInstance.id, data)
        setSuccessMessage(`Instance "${data.name}" updated successfully!`)
      } else {
        // Create new instance
        await createInstance(data)
        setSuccessMessage(`Instance "${data.name}" created successfully!`)
      }
      setShowFormDialog(false)
      setSelectedInstance(null)
    } catch (err) {
      console.error('Form submission error:', err)
      if (err && typeof err === 'object' && 'category' in err) {
        setOperationError(err as EnhancedError)
      } else {
        setOperationError({
          message: err instanceof Error ? err.message : 'An unknown error occurred',
          category: 'api',
          severity: 'error',
          technical: err instanceof Error ? err.stack : undefined,
          suggestions: ['Please try again', 'Check the console for more details']
        })
      }
      throw err
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedInstance) return

    setOperationError(null)
    setSuccessMessage(null)

    try {
      await deleteInstance(selectedInstance.id, selectedInstance.name)
      setSuccessMessage(`Instance "${selectedInstance.name}" deleted successfully!`)
      setShowDeleteDialog(false)
      setSelectedInstance(null)
    } catch (err) {
      console.error('Delete error:', err)
      if (err && typeof err === 'object' && 'category' in err) {
        setOperationError(err as EnhancedError)
      } else {
        setOperationError({
          message: err instanceof Error ? err.message : 'Failed to delete instance',
          category: 'api',
          severity: 'error',
          technical: err instanceof Error ? err.stack : undefined,
          suggestions: ['Please try again', 'Check if the instance is being used in active syncs']
        })
      }
      throw err
    }
  }

  const handleRefresh = async () => {
    setSuccessMessage(null)
    setOperationError(null)
    try {
      await refetch()
      setSuccessMessage('Instances refreshed successfully!')
    } catch (err) {
      console.error('Refresh error:', err)
    }
  }

  return (
    <div className="gba:space-y-6" data-testid="instance-management-page">
      {/* Header */}
      <div className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Settings className="gba:h-6 gba:w-6 gba:text-muted-foreground" />
          <h2 className="gba:text-2xl gba:font-bold">Instance Management</h2>
        </div>
        <p className="gba:text-muted-foreground">
          Manage flow engine instances for template synchronization. Add, edit, or remove instances to control where
          templates are synced.
        </p>
        <div className="gba:flex gba:justify-end gba:gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading} data-testid="instance-refresh-button">
            <RefreshCw className={`gba:h-4 gba:w-4 gba:mr-2 ${isLoading ? 'gba:animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleAddInstance} data-testid="instance-add-button">
            <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
            Add New Instance
          </Button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert variant="default" className="gba:border-success gba:bg-success-secondary">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {operationError && (
        <EnhancedErrorAlert
          error={operationError}
          onDismiss={() => setOperationError(null)}
          data-testid="instance-error-alert"
        />
      )}

      {/* Loading Error (from fetch) */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            <div className="gba:flex gba:items-center gba:justify-between">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={handleRefresh}>
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Instance Table */}
      <InstanceTable
        instances={catalogInstances}
        onEdit={handleEditInstance}
        onDelete={handleDeleteInstance}
        isLoading={isLoading}
        accessToken={context.accessToken}
      />

      {/* Form Dialog */}
      <InstanceFormDialog
        isOpen={showFormDialog}
        onClose={() => {
          setShowFormDialog(false)
          setSelectedInstance(null)
        }}
        onSubmit={handleFormSubmit}
        instance={selectedInstance}
        isSubmitting={isCreating || isUpdating}
      />

      {/* Delete Dialog */}
      <InstanceDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setSelectedInstance(null)
        }}
        onConfirm={handleDeleteConfirm}
        instance={selectedInstance}
        isDeleting={isDeleting}
      />
    </div>
  )
}
