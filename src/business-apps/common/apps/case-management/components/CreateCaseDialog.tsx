/**
 * Create Case Dialog Component
 *
 * Modal dialog for creating a new case
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DateInput
} from '@newwork/nw-design-system'
import { Loader2 } from 'lucide-react'
import { CreateCaseRequest, CasePriority } from '../types'
import { EmployeeSelect, EmployeeOption } from '@/components/employee-select'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'

interface CreateCaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateCaseRequest) => Promise<void>
  appTag: string
  userId?: string
  accessToken?: string
}

export const CreateCaseDialog: React.FC<CreateCaseDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  appTag,
  userId,
  accessToken
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<CasePriority>('medium')
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Employee search for assignee selection
  const { employees, loading: searchLoading, search, hasMore, loadMore } = useEmployeeSearch(accessToken)

  // Initial search when dialog opens
  useEffect(() => {
    if (open && accessToken) {
      search('')
    }
  }, [open, accessToken, search])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setPriority('medium')
    setAssignedTo(null)
    setDueDate('')
    setError(null)
  }

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm()
      onOpenChange(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // Get userId from selected employee
      const selectedEmployee = employees.find(emp => emp.id === assignedTo)
      const assignedToUserId = selectedEmployee?.userId || assignedTo || undefined

      await onSubmit({
        initiator: userId || 'system',
        tags: { app: appTag },
        metadata: {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          status: 'open',
          assignedTo: assignedToUserId,
          dueDate: dueDate || undefined
        }
      })

      resetForm()
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to create case:', err)
      setError(err instanceof Error ? err.message : 'Failed to create case')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="gba:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Case</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new case. You can add flows and attachments after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="gba:space-y-4">
          {/* Title */}
          <div className="gba:space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter case title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="gba:space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the case (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          {/* Priority */}
          <div className="gba:space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={value => setPriority(value as CasePriority)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="gba:space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <DateInput
              type="date"
              value={dueDate}
              onChange={setDueDate}
              placeholder="Select due date (optional)"
              disabled={isSubmitting}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Assign To */}
          {accessToken && (
            <div className="gba:space-y-2">
              <Label>Assign To</Label>
              <EmployeeSelect
                value={assignedTo}
                employees={employees as EmployeeOption[]}
                onValueChange={setAssignedTo}
                onSearch={search}
                loading={searchLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
                placeholder="Select assignee (optional)..."
                searchPlaceholder="Search employees..."
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="gba:text-sm gba:text-destructive gba:bg-destructive/10 gba:p-3 gba:rounded-md">{error}</div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting && <Loader2 className="gba:h-4 gba:w-4 gba:mr-2 gba:animate-spin" />}
              {isSubmitting ? 'Creating...' : 'Create Case'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
