import React, { useState } from 'react'
import { Button, PageLayout, Alert, AlertDescription } from '@newwork/nw-design-system'
import { CalendarIcon, PlusIcon } from '@phosphor-icons/react'
import { TaskTemplateTable, TaskTemplateForm } from './components'
import { TaskTemplateSettingsProps, BaseTaskTemplate, TaskTemplateFormData } from './types'

export const TaskTemplateSettings: React.FC<TaskTemplateSettingsProps> = ({
  templates,
  isLoading,
  error,
  onCreate,
  onUpdate,
  onDelete,
  onRetry,
  renderAdditionalFields,
  prefixDataTestId = 'task-template-settings',
  headerTitle = 'Task Templates',
  headerDescription = 'Manage recurring task templates with scheduling and assignment rules',
  onBack,
  accessToken,
  catalogConfigs = [],
  businessAppContext,
  taskTypeCatalogId,
  taskPriorityCatalogId,
  templateEntityConfig,
  assigneeTypes = [],
  holidayPolicies = []
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<BaseTaskTemplate | null>(null)

  const handleAdd = () => {
    setEditingTemplate(null)
    setIsFormOpen(true)
  }

  const handleEdit = (template: BaseTaskTemplate) => {
    setEditingTemplate(template)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (globalThis.confirm('Are you sure you want to delete this task template?')) {
      await onDelete(id)
    }
  }

  const handleSave = async (data: TaskTemplateFormData) => {
    if (editingTemplate) {
      await onUpdate(editingTemplate.id, data)
    } else {
      await onCreate(data)
    }
    setEditingTemplate(null)
    setIsFormOpen(false)
  }

  const handleClose = () => {
    setEditingTemplate(null)
    setIsFormOpen(false)
  }

  const handleSearchChange = () => {
    // Search functionality is handled by the table component
    // This can be extended for global search if needed
  }

  return (
    <PageLayout
      headerIcon={CalendarIcon}
      headerTitle={headerTitle}
      headerDescription={headerDescription}
      onBack={onBack}
      data-testid={`${prefixDataTestId}-container`}
    >
      {/* Error State */}
      {error && (
        <Alert
          className="gba:mb-4 gba:border-destructive-secondary gba:bg-destructive-secondary"
          data-testid={`${prefixDataTestId}-error`}
        >
          <AlertDescription>
            {error}
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry} className="gba:ml-2">
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Add Button */}
      <div className="gba:flex gba:justify-end gba:mb-6">
        <Button onClick={handleAdd} data-testid={`${prefixDataTestId}-add-button`}>
          <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
          Add Template
        </Button>
      </div>

      {/* Task Template Table */}
      <TaskTemplateTable
        templates={templates}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSearchChange={handleSearchChange}
        dataTestId={`${prefixDataTestId}-table`}
      />

      {/* Task Template Form Modal */}
      <TaskTemplateForm
        isOpen={isFormOpen}
        onClose={handleClose}
        onSave={handleSave}
        editingTemplate={editingTemplate}
        renderAdditionalFields={renderAdditionalFields}
        dataTestId={`${prefixDataTestId}-form`}
        accessToken={accessToken}
        catalogConfigs={catalogConfigs}
        businessAppContext={businessAppContext}
        taskTypeCatalogId={taskTypeCatalogId}
        taskPriorityCatalogId={taskPriorityCatalogId}
        templateEntityConfig={templateEntityConfig}
        assigneeTypes={assigneeTypes}
        holidayPolicies={holidayPolicies}
      />
    </PageLayout>
  )
}
