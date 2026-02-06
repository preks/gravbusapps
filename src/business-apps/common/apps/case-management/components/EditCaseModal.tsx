/**
 * Edit Case Modal Component
 *
 * Modal for editing case metadata (title, description, priority, assignee)
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DateInput,
  Checkbox
} from '@newwork/nw-design-system'
import { Loader2, Save, Trash2, AlertTriangle } from 'lucide-react'
import { Case, CasePriority } from '../types'
import { EmployeeSelect, EmployeeOption } from '@/components/employee-select'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'

export interface EditCaseModalProps {
  isOpen: boolean
  onClose: () => void
  caseData: Case
  accessToken?: string
  onSave: (updates: {
    title?: string
    description?: string
    priority?: CasePriority
    assignedTo?: string
    dueDate?: string
  }) => Promise<void>
  /** Handler for deleting the case. If provided, shows delete button */
  onDelete?: (terminateFlows: boolean) => Promise<void>
  /** Number of active flows linked to this case (for delete warning) */
  activeFlowsCount?: number
}

const PRIORITY_OPTIONS: { value: CasePriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
]

export const EditCaseModal: React.FC<EditCaseModalProps> = ({
  isOpen,
  onClose,
  caseData,
  accessToken,
  onSave,
  onDelete,
  activeFlowsCount = 0
}) => {
  const metadata = caseData.state?.metadata
  // Title can be in multiple locations depending on data source
  const currentTitle = metadata?.title || (caseData as any).title || ''
  const currentDescription = metadata?.description || ''
  const currentPriority = metadata?.priority || 'medium'
  const currentAssignedTo = metadata?.assignedTo || ''
  const currentDueDate = metadata?.dueDate || ''

  // Form state
  const [title, setTitle] = useState(currentTitle)
  const [description, setDescription] = useState(currentDescription)
  const [priority, setPriority] = useState<CasePriority>(currentPriority)
  const [assignedTo, setAssignedTo] = useState<string | null>(currentAssignedTo || null)
  const [dueDate, setDueDate] = useState(currentDueDate)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [terminateFlowsOnDelete, setTerminateFlowsOnDelete] = useState(false)

  // Employee search for assignee selection
  const { employees, loading: searchLoading, search, hasMore, loadMore, hydrateById } = useEmployeeSearch(accessToken)

  // Hydrate current assignee when modal opens
  useEffect(() => {
    if (isOpen && currentAssignedTo) {
      hydrateById(currentAssignedTo)
    }
  }, [isOpen, currentAssignedTo, hydrateById])

  // Initial search when modal opens
  useEffect(() => {
    if (isOpen && accessToken) {
      search('')
    }
  }, [isOpen, accessToken, search])

  // Reset form when modal opens with new case data
  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle)
      setDescription(currentDescription)
      setPriority(currentPriority)
      setAssignedTo(currentAssignedTo || null)
      setDueDate(currentDueDate)
      setError(null)
    }
  }, [isOpen, currentTitle, currentDescription, currentPriority, currentAssignedTo, currentDueDate])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      // Only include changed fields
      const updates: {
        title?: string
        description?: string
        priority?: CasePriority
        assignedTo?: string
        dueDate?: string
      } = {}

      if (title !== currentTitle) {
        updates.title = title
      }
      if (description !== currentDescription) {
        updates.description = description
      }
      if (priority !== currentPriority) {
        updates.priority = priority
      }
      // Handle assignee change - get userId from selected employee
      const selectedEmployee = employees.find(emp => emp.id === assignedTo)
      const newAssignedToUserId = selectedEmployee?.userId || assignedTo || ''
      if (newAssignedToUserId !== currentAssignedTo) {
        updates.assignedTo = newAssignedToUserId
      }
      if (dueDate !== currentDueDate) {
        updates.dueDate = dueDate
      }

      // Only save if there are changes
      if (Object.keys(updates).length > 0) {
        await onSave(updates)
      }

      onClose()
    } catch (err) {
      console.error('Failed to save case:', err)
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  // Check for changes - compare userId for assignee
  const selectedEmployee = employees.find(emp => emp.id === assignedTo)
  const newAssignedToUserId = selectedEmployee?.userId || assignedTo || ''
  const hasChanges =
    title !== currentTitle ||
    description !== currentDescription ||
    priority !== currentPriority ||
    newAssignedToUserId !== currentAssignedTo ||
    dueDate !== currentDueDate

  const handleDelete = async () => {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(terminateFlowsOnDelete)
      setShowDeleteConfirm(false)
      onClose()
    } catch (err) {
      console.error('Failed to delete case:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete case')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="gba:sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Case</DialogTitle>
          <DialogDescription>Update the case title, description, and priority.</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {/* Title Field */}
          <div className="gba:space-y-2">
            <Label htmlFor="case-title">Title</Label>
            <Input
              id="case-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter case title"
              disabled={isSaving}
            />
          </div>

          {/* Description Field */}
          <div className="gba:space-y-2">
            <Label htmlFor="case-description">Description</Label>
            <Textarea
              id="case-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Enter case description"
              rows={4}
              disabled={isSaving}
              className="gba:resize-none"
            />
          </div>

          {/* Priority Field */}
          <div className="gba:space-y-2">
            <Label htmlFor="case-priority">Priority</Label>
            <Select value={priority} onValueChange={value => setPriority(value as CasePriority)} disabled={isSaving}>
              <SelectTrigger id="case-priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date Field */}
          <div className="gba:space-y-2">
            <Label htmlFor="case-dueDate">Due Date</Label>
            <DateInput
              type="date"
              value={dueDate}
              onChange={setDueDate}
              placeholder="Select due date"
              disabled={isSaving}
            />
          </div>

          {/* Assigned To Field */}
          {accessToken && (
            <div className="gba:space-y-2">
              <Label>Assigned To</Label>
              <EmployeeSelect
                value={assignedTo}
                employees={employees as EmployeeOption[]}
                onValueChange={setAssignedTo}
                onSearch={search}
                loading={searchLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
                placeholder="Select assignee..."
                searchPlaceholder="Search employees..."
                disabled={isSaving}
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="gba:p-3 gba:bg-destructive/10 gba:text-destructive gba:rounded-md gba:text-sm">{error}</div>
          )}
        </div>

        <DialogFooter className="gba:flex gba:justify-between gba:sm:justify-between">
          {/* Delete button on the left */}
          {onDelete && (
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSaving}
              className="gba:text-destructive gba:border-destructive hover:gba:bg-destructive/10"
            >
              <Trash2 className="gba:h-4 gba:w-4 gba:mr-2" />
              Delete Case
            </Button>
          )}

          {/* Spacer when no delete button */}
          {!onDelete && <div />}

          {/* Save/Cancel buttons on the right */}
          <div className="gba:flex gba:gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? (
                <>
                  <Loader2 className="gba:h-4 gba:w-4 gba:mr-2 gba:animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="gba:h-4 gba:w-4 gba:mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this case? This is a soft delete - the case can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Show warning if there are active flows */}
          {activeFlowsCount > 0 && (
            <div className="gba:p-4 gba:bg-yellow-50 gba:border gba:border-yellow-200 gba:rounded-md">
              <div className="gba:flex gba:items-start gba:gap-2">
                <AlertTriangle className="gba:h-5 gba:w-5 gba:text-yellow-600 gba:mt-0.5 gba:flex-shrink-0" />
                <div>
                  <p className="gba:font-medium gba:text-yellow-800">
                    This case has {activeFlowsCount} active flow{activeFlowsCount > 1 ? 's' : ''}
                  </p>
                  <p className="gba:text-sm gba:text-yellow-700 gba:mt-1">
                    By default, linked flows will continue running after the case is deleted. Check the option below to
                    terminate them.
                  </p>
                </div>
              </div>

              <div className="gba:flex gba:items-center gba:space-x-2 gba:mt-3">
                <Checkbox
                  id="terminateFlowsModal"
                  checked={terminateFlowsOnDelete}
                  onCheckedChange={checked => setTerminateFlowsOnDelete(checked === true)}
                />
                <Label htmlFor="terminateFlowsModal" className="gba:text-sm gba:text-yellow-800 gba:cursor-pointer">
                  Also terminate all linked running flows
                </Label>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="gba:h-4 gba:w-4 gba:mr-2 gba:animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="gba:h-4 gba:w-4 gba:mr-2" />
                  Delete Case
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

export default EditCaseModal
