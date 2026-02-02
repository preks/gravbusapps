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
  Button,
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { Loader2, Save } from 'lucide-react'
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
  }) => Promise<void>
}

const PRIORITY_OPTIONS: { value: CasePriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
]

export const EditCaseModal: React.FC<EditCaseModalProps> = ({ isOpen, onClose, caseData, accessToken, onSave }) => {
  const metadata = caseData.state?.metadata
  // Title can be in multiple locations depending on data source
  const currentTitle = metadata?.title || (caseData as any).title || ''
  const currentDescription = metadata?.description || ''
  const currentPriority = metadata?.priority || 'medium'
  const currentAssignedTo = metadata?.assignedTo || ''

  // Form state
  const [title, setTitle] = useState(currentTitle)
  const [description, setDescription] = useState(currentDescription)
  const [priority, setPriority] = useState<CasePriority>(currentPriority)
  const [assignedTo, setAssignedTo] = useState<string | null>(currentAssignedTo || null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      setError(null)
    }
  }, [isOpen, currentTitle, currentDescription, currentPriority, currentAssignedTo])

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
    newAssignedToUserId !== currentAssignedTo

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

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditCaseModal
