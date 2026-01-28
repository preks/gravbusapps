/**
 * ActionItemsModal Component
 * Modal for assigning extracted action items as blinks to team members
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Textarea,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Checkbox,
  Spinner
} from '@newwork/nw-design-system'
import { ListTodo, Send, X, Search, User, Pencil, Trash2, Plus, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useEmployeeSearch, EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import { env } from '@/common/env/EnvUtils'
import type { NoteActionItemFlow } from '../../types'

function toAvatarDataUrl(pictureThumbnail?: string): string | undefined {
  if (!pictureThumbnail) return undefined
  return pictureThumbnail.startsWith('data:') ? pictureThumbnail : `data:image/png;base64,${pictureThumbnail}`
}

export interface ActionItem {
  id: string
  text: string
  selected: boolean
  assignee?: EmployeeLiteOption
}

export interface ActionItemsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  actionItems: string[]
  noteTitle: string
  noteId: string
  accessToken: string
  currentUserId: string
  onFlowsCreated?: (flows: NoteActionItemFlow[]) => void
  'data-testid'?: string
}

/**
 * Helper function to create standard assignment targets structure
 */
const createAssignmentTargets = (userIds: string[]) => ({
  users: userIds,
  capabilities: [],
  organizationalUnits: [],
  companies: [],
  siteLocations: [],
  costCenters: [],
  matrixTeams: []
})

/**
 * Send a blink task to a user
 */
const sendBlink = async (
  accessToken: string,
  payload: {
    title: string
    message: string
    assigneeUserId: string
    initiatorId: string
    noteId: string
    noteTitle: string
  }
): Promise<{ success: boolean; workflowId?: string; error?: string }> => {
  try {
    const baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'

    const tags: Record<string, string> = {
      app: 'quick-task',
      assignedUserId: payload.assigneeUserId,
      entityType: 'handwriting-note-action',
      entityId: payload.noteId,
      entityName: payload.noteTitle,
      // Used for recovery: show action text even if workflow doesn't return step titles in list endpoint
      actionText: payload.title
    }

    const requestPayload = {
      templateDefinition: {
        type: 'TEMPLATE',
        name: payload.title,
        description: `Action item from: ${payload.noteTitle}`,
        version: 1,
        steps: [
          {
            type: 'TASK',
            title: payload.title,
            message: payload.message,
            form: [],
            links: [],
            assignment: {
              assignmentMode: 'ASSIGN',
              targets: null,
              allowReassignment: false
            },
            dueInMinutes: 4320 // 3 days
          }
        ],
        tags
      },
      initiatorId: payload.initiatorId,
      stepAssignments: {
        step_0: {
          assignment: {
            assignmentMode: 'ASSIGN',
            targets: createAssignmentTargets([payload.assigneeUserId]),
            allowReassignment: false
          }
        }
      }
    }

    const response = await fetch(`${baseUrl}/api/templates/execute-dynamic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(requestPayload)
    })

    if (!response.ok) {
      throw new Error(`Failed to create blink: ${response.statusText}`)
    }

    const data = await response.json()
    const workflowId = (data?.data?.workflowId as string | undefined) || (data?.workflowId as string | undefined)

    return { success: true, workflowId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send blink' }
  }
}

export const ActionItemsModal: React.FC<ActionItemsModalProps> = ({
  open,
  onOpenChange,
  actionItems: rawActionItems,
  noteTitle,
  noteId,
  accessToken,
  currentUserId,
  onFlowsCreated,
  'data-testid': testId = 'action-items-modal'
}) => {
  // Convert raw action items to structured format
  const [items, setItems] = useState<ActionItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { employees, loading: employeesLoading, search, hasMore, loadMore } = useEmployeeSearch(accessToken)

  // Initialize items when modal opens
  useEffect(() => {
    if (open && rawActionItems.length > 0) {
      setItems(
        rawActionItems.map((text, index) => ({
          id: `action-${index}`,
          text,
          selected: true,
          assignee: undefined
        }))
      )
      setActiveItemId(null)
      setSearchTerm('')
      setEditingItemId(null)
      setEditingText('')
    }
  }, [open, rawActionItems])

  // Trigger search when search term changes
  useEffect(() => {
    const timer = setTimeout(() => {
      search(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, search])

  // Initial search to show some employees
  useEffect(() => {
    if (open) {
      search('')
    }
  }, [open, search])

  const toggleItemSelection = useCallback((itemId: string) => {
    setItems(prev => prev.map(item => (item.id === itemId ? { ...item, selected: !item.selected } : item)))
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId))
    setActiveItemId(prev => (prev === itemId ? null : prev))
    setEditingItemId(prev => (prev === itemId ? null : prev))
  }, [])

  const startEditing = useCallback((itemId: string) => {
    setItems(prev => {
      const found = prev.find(i => i.id === itemId)
      setEditingItemId(itemId)
      setEditingText(found?.text || '')
      return prev
    })
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingItemId(null)
    setEditingText('')
  }, [])

  const saveEditing = useCallback(() => {
    if (!editingItemId) return
    const nextText = (editingText || '').trim()
    setItems(prev => prev.map(i => (i.id === editingItemId ? { ...i, text: nextText } : i)))
    setEditingItemId(null)
    setEditingText('')
  }, [editingItemId, editingText])

  const addNewItem = useCallback(() => {
    const id = `action-${Date.now()}`
    setItems(prev => [{ id, text: '', selected: true, assignee: undefined }, ...prev])
    setEditingItemId(id)
    setEditingText('')
  }, [])

  const assignEmployee = useCallback((itemId: string, employee: EmployeeLiteOption) => {
    setItems(prev => prev.map(item => (item.id === itemId ? { ...item, assignee: employee } : item)))
    setActiveItemId(null)
    setSearchTerm('')
  }, [])

  const removeAssignee = useCallback((itemId: string) => {
    setItems(prev => prev.map(item => (item.id === itemId ? { ...item, assignee: undefined } : item)))
  }, [])

  const handleSubmit = async () => {
    const selectedItems = items.filter(item => item.selected && item.assignee && (item.text || '').trim().length > 0)

    if (selectedItems.length === 0) {
      toast.error('Select at least one action item with text + assignee')
      return
    }

    setIsSubmitting(true)

    try {
      let successCount = 0
      let failCount = 0
      const createdFlows: NoteActionItemFlow[] = []
      const createdAt = new Date().toISOString()

      for (const item of selectedItems) {
        if (!item.assignee?.userId) continue
        const text = (item.text || '').trim()
        if (!text) continue

        const result = await sendBlink(accessToken, {
          title: text.length > 80 ? text.substring(0, 77) + '...' : text,
          message: `Action item from handwriting note "${noteTitle}":\n\n${text}`,
          assigneeUserId: item.assignee.userId,
          initiatorId: currentUserId,
          noteId,
          noteTitle
        })

        if (result.success) {
          successCount++
          if (result.workflowId) {
            createdFlows.push({
              id: `action_${createdAt}_${item.id}`,
              text,
              assigneeUserId: item.assignee.userId,
              assigneeDisplayName: item.assignee.displayName,
              assigneeAvatarUrl: toAvatarDataUrl(item.assignee.pictureThumbnail),
              workflowId: result.workflowId,
              status: 'RUNNING',
              createdAt
            })
          }
        } else {
          failCount++
          console.error(`Failed to send blink for action: ${text}`, result.error)
        }
      }

      if (successCount > 0) {
        toast.success(`Sent ${successCount} action item${successCount > 1 ? 's' : ''} as blinks`)
      }
      if (failCount > 0) {
        toast.error(`Failed to send ${failCount} action item${failCount > 1 ? 's' : ''}`)
      }

      if (createdFlows.length > 0) {
        onFlowsCreated?.(createdFlows)
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Failed to submit action items:', error)
      toast.error('Failed to send action items')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedWithAssigneeCount = items.filter(item => item.selected && item.assignee).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:sm:max-w-[600px] gba:max-h-[80vh] gba:overflow-hidden gba:flex gba:flex-col">
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:p-1.5 gba:rounded-md gba:bg-primary/10">
              <ListTodo className="gba:w-5 gba:h-5 gba:text-primary" />
            </div>
            Action Items
          </DialogTitle>
          <DialogDescription>
            Assign action items to team members. Selected items will be sent as blinks.
          </DialogDescription>
        </DialogHeader>

        <div className="gba:flex-1 gba:overflow-y-auto gba:py-4 gba:space-y-3">
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
            <div className="gba:text-xs gba:text-muted-foreground">
              Tip: edit wording, remove items you don’t want, then assign.
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addNewItem}
              className="gba:gap-2"
              data-testid={`${testId}-add-item`}
            >
              <Plus className="gba:w-4 gba:h-4" />
              Add
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="gba:text-center gba:py-8 gba:text-muted-foreground">No action items found</div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                className={`gba:rounded-lg gba:border gba:p-3 gba:transition-colors ${
                  item.selected ? 'gba:border-primary/30 gba:bg-primary/5' : 'gba:border-border gba:bg-muted/30'
                }`}
                data-testid={`${testId}-item-${item.id}`}
              >
                {/* Action item row */}
                <div className="gba:flex gba:items-start gba:gap-3">
                  <Checkbox
                    checked={item.selected}
                    onCheckedChange={() => toggleItemSelection(item.id)}
                    className="gba:mt-0.5"
                  />
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                      <div className="gba:flex-1 gba:min-w-0">
                        {editingItemId === item.id ? (
                          <div className="gba:space-y-2">
                            <Textarea
                              value={editingText}
                              onChange={e => setEditingText(e.target.value)}
                              placeholder="Write an action item..."
                              className="gba:min-h-[70px]"
                              data-testid={`${testId}-edit-textarea-${item.id}`}
                            />
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={saveEditing}
                                disabled={(editingText || '').trim().length === 0}
                                data-testid={`${testId}-edit-save-${item.id}`}
                              >
                                <Check className="gba:w-4 gba:h-4 gba:mr-2" />
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={cancelEditing}
                                data-testid={`${testId}-edit-cancel-${item.id}`}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="gba:text-sm gba:text-foreground gba:leading-relaxed gba:break-words">
                            {item.text || <span className="gba:text-muted-foreground">Empty action item</span>}
                          </p>
                        )}
                      </div>

                      {/* Row actions */}
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gba:h-7 gba:w-7 gba:p-0"
                          onClick={() => startEditing(item.id)}
                          disabled={editingItemId !== null && editingItemId !== item.id}
                          data-testid={`${testId}-edit-${item.id}`}
                        >
                          <Pencil className="gba:w-4 gba:h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gba:h-7 gba:w-7 gba:p-0"
                          onClick={() => removeItem(item.id)}
                          data-testid={`${testId}-remove-${item.id}`}
                        >
                          <Trash2 className="gba:w-4 gba:h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Assignee row */}
                    <div className="gba:mt-2">
                      {item.assignee ? (
                        <div className="gba:flex gba:items-center gba:gap-2 gba:bg-background gba:rounded-md gba:px-2 gba:py-1.5 gba:border gba:border-border">
                          <Avatar className="gba:w-6 gba:h-6">
                            {item.assignee.pictureThumbnail && <AvatarImage src={item.assignee.pictureThumbnail} />}
                            <AvatarFallback className="gba:text-[10px] gba:bg-muted">
                              {item.assignee.displayName?.substring(0, 2).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="gba:text-sm gba:font-medium gba:flex-1 gba:truncate">
                            {item.assignee.displayName}
                          </span>
                          <button
                            onClick={() => removeAssignee(item.id)}
                            className="gba:p-0.5 gba:rounded gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted"
                          >
                            <X className="gba:w-3.5 gba:h-3.5" />
                          </button>
                        </div>
                      ) : activeItemId === item.id ? (
                        <div className="gba:space-y-2">
                          <div className="gba:relative">
                            <Search className="gba:absolute gba:left-2 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Search employees..."
                              value={searchTerm}
                              onChange={e => setSearchTerm(e.target.value)}
                              className="gba:w-full gba:pl-8 gba:pr-3 gba:py-1.5 gba:text-sm gba:rounded-md gba:border gba:border-border gba:bg-background gba:outline-none gba:focus:ring-1 gba:focus:ring-primary"
                              autoFocus
                            />
                          </div>
                          <div className="gba:max-h-32 gba:overflow-y-auto gba:bg-background gba:rounded-md gba:border gba:border-border">
                            {employeesLoading && employees.length === 0 ? (
                              <div className="gba:flex gba:items-center gba:justify-center gba:py-3">
                                <Spinner className="gba:w-4 gba:h-4" />
                              </div>
                            ) : employees.length === 0 ? (
                              <div className="gba:text-center gba:py-3 gba:text-sm gba:text-muted-foreground">
                                No employees found
                              </div>
                            ) : (
                              <>
                                {employees.map(emp => (
                                  <button
                                    key={emp.id}
                                    onClick={() => assignEmployee(item.id, emp)}
                                    className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1.5 gba:text-left gba:hover:bg-muted gba:transition-colors"
                                  >
                                    <Avatar className="gba:w-6 gba:h-6">
                                      {emp.pictureThumbnail && <AvatarImage src={emp.pictureThumbnail} />}
                                      <AvatarFallback className="gba:text-[10px] gba:bg-muted">
                                        {emp.displayName?.substring(0, 2).toUpperCase() || '?'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="gba:flex-1 gba:min-w-0">
                                      <div className="gba:text-sm gba:font-medium gba:truncate">{emp.displayName}</div>
                                      {emp.jobPositionName && (
                                        <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                                          {emp.jobPositionName}
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                ))}
                                {hasMore && (
                                  <button
                                    onClick={loadMore}
                                    className="gba:w-full gba:py-2 gba:text-xs gba:text-primary gba:hover:underline"
                                    disabled={employeesLoading}
                                  >
                                    {employeesLoading ? 'Loading...' : 'Load more'}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                          <button
                            onClick={() => setActiveItemId(null)}
                            className="gba:text-xs gba:text-muted-foreground gba:hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveItemId(item.id)}
                          disabled={!item.selected}
                          className={`gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:px-2 gba:py-1 gba:rounded-md gba:border gba:border-dashed gba:transition-colors ${
                            item.selected
                              ? 'gba:border-primary/40 gba:text-primary gba:hover:bg-primary/10'
                              : 'gba:border-border gba:text-muted-foreground gba:cursor-not-allowed'
                          }`}
                        >
                          <User className="gba:w-3 gba:h-3" />
                          Assign to...
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="gba:border-t gba:pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedWithAssigneeCount === 0}
            data-testid={`${testId}-submit`}
          >
            {isSubmitting ? (
              <>
                <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="gba:w-4 gba:h-4 gba:mr-2" />
                Send {selectedWithAssigneeCount > 0 ? `${selectedWithAssigneeCount} ` : ''}Blink
                {selectedWithAssigneeCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ActionItemsModal
