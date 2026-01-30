import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Checkbox,
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useActions } from '@/common/data/resources/hooks/useActions'
import type { ActionDTO } from '@/common/data/resources/types/action.types'

// Helper function to determine empty state message
const getEmptyStateMessage = (existingActionIds: readonly string[], searchValue: string): string => {
  if (existingActionIds.length > 0) {
    return 'All available actions are already assigned to this context.'
  }
  if (searchValue) {
    return 'No actions found matching your search.'
  }
  return 'No actions available.'
}

interface AddActionDialogProps extends BusinessAppContextProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddActions: (actionPermissions: Map<string, string>) => Promise<void>
  existingActionIds: string[]
  'data-testid'?: string
}

const PERMISSIONS = [
  { value: 'execute', label: 'Execute' },
  { value: 'read', label: 'Read' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'approve', label: 'Approve' }
] as const

export const AddActionDialog: React.FC<AddActionDialogProps> = ({
  open,
  onOpenChange,
  onAddActions,
  existingActionIds,
  'data-testid': dataTestId = 'add-action-dialog',
  ...context
}) => {
  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(new Set())
  const [actionPermissions, setActionPermissions] = useState<Map<string, string>>(new Map())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('')

  // Debounce search value
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchValue(searchValue)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchValue])

  const { actions, totalCount, isLoading, refetch, loadMore, hasMore } = useActions(
    context,
    open
      ? {
          flowName: debouncedSearchValue.trim() || undefined,
          limit: 20,
          offset: 0,
          returnTotalRecords: true
        }
      : undefined
  )

  // Filter out already assigned actions
  const availableActions = actions.filter(item => !existingActionIds.includes(item.action.id))

  // Infinite scroll setup
  const loadMoreRef = useRef<HTMLTableRowElement>(null)
  const isLoadingRef = useRef(isLoading)
  const hasMoreRef = useRef(hasMore)
  const isLoadMorePendingRef = useRef(false)

  // Sync refs with current state
  useEffect(() => {
    isLoadingRef.current = isLoading
    hasMoreRef.current = hasMore
  }, [isLoading, hasMore])

  useEffect(() => {
    if (!loadMoreRef.current || !open) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !isLoadingRef.current && hasMoreRef.current && !isLoadMorePendingRef.current) {
          isLoadMorePendingRef.current = true
          loadMore().finally(() => {
            isLoadMorePendingRef.current = false
          })
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [open, loadMore, actions.length])

  // Track if we've fetched initial data
  const hasFetchedRef = useRef(false)
  const lastSearchRef = useRef<string>('')
  const [isInitialLoading, setIsInitialLoading] = useState(false)

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedActionIds(new Set())
      setActionPermissions(new Map())
      setSearchValue('')
      hasFetchedRef.current = false
      lastSearchRef.current = ''
      setIsInitialLoading(false)
    } else if (open && !hasFetchedRef.current && actions.length === 0) {
      // Fetch initial data only once when dialog opens
      hasFetchedRef.current = true
      lastSearchRef.current = debouncedSearchValue
      setIsInitialLoading(true)
      refetch().finally(() => {
        setIsInitialLoading(false)
      })
    }
  }, [open, refetch, actions.length, debouncedSearchValue])

  // Refetch when search value changes (without loading state)
  useEffect(() => {
    if (open && hasFetchedRef.current && debouncedSearchValue !== lastSearchRef.current) {
      lastSearchRef.current = debouncedSearchValue
      refetch()
    }
  }, [open, debouncedSearchValue, refetch])

  const handleToggleAction = useCallback((actionId: string) => {
    setSelectedActionIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(actionId)) {
        newSet.delete(actionId)
        setActionPermissions(prevPerms => {
          const newPerms = new Map(prevPerms)
          newPerms.delete(actionId)
          return newPerms
        })
      } else {
        newSet.add(actionId)
        setActionPermissions(prevPerms => {
          const newPerms = new Map(prevPerms)
          newPerms.set(actionId, 'execute')
          return newPerms
        })
      }
      return newSet
    })
  }, [])

  const handlePermissionChange = useCallback((actionId: string, permission: string) => {
    setActionPermissions(prev => {
      const newPerms = new Map(prev)
      newPerms.set(actionId, permission)
      return newPerms
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedActionIds.size === availableActions.length) {
      setSelectedActionIds(new Set())
      setActionPermissions(new Map())
    } else {
      const newSet = new Set(availableActions.map(a => a.action.id))
      setSelectedActionIds(newSet)
      const newPerms = new Map<string, string>()
      availableActions.forEach(a => {
        newPerms.set(a.action.id, 'execute')
      })
      setActionPermissions(newPerms)
    }
  }, [selectedActionIds.size, availableActions])

  const handleSubmit = useCallback(async () => {
    if (selectedActionIds.size === 0) {
      return
    }

    setIsSubmitting(true)
    try {
      const permissionsMap = new Map<string, string>()
      selectedActionIds.forEach(actionId => {
        permissionsMap.set(actionId, actionPermissions.get(actionId) || 'execute')
      })
      await onAddActions(permissionsMap)
      onOpenChange(false)
    } catch (error) {
      console.error('Error adding actions:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedActionIds, actionPermissions, onAddActions, onOpenChange])

  const getActionSubtitle = (action: ActionDTO): string => {
    if (action.flowType === 'ACTION') {
      return action.processName || ''
    }
    const parts: string[] = []
    if (action.targetDesktop) parts.push(action.targetDesktop)
    if (action.targetMobile) parts.push(action.targetMobile)
    return parts.join(' | ')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-w-4xl gba:h-[1000px] gba:max-h-[1000px] gba:flex gba:flex-col"
        data-testid={dataTestId}
      >
        <DialogHeader>
          <DialogTitle>Add Actions to Context</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4 gba:flex gba:flex-col gba:flex-1 gba:min-h-0">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Input
              type="text"
              placeholder="Search actions..."
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              className="gba:flex-1"
              data-testid={`${dataTestId}-search`}
            />
          </div>

          {isInitialLoading ? (
            <div className="gba:flex-1 gba:flex gba:items-center gba:justify-center">
              <Spinner size="md" />
            </div>
          ) : availableActions.length === 0 ? (
            <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
              {getEmptyStateMessage(existingActionIds, searchValue)}
            </div>
          ) : (
            <div className="gba:flex-1 gba:min-h-0 gba:flex gba:flex-col">
              <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:border gba:rounded-lg">
                <Table className="gba:table-fixed">
                  <TableHeader className="gba:sticky gba:top-0 gba:bg-background gba:z-10">
                    <TableRow>
                      <TableHead className="gba:w-[50px]">
                        <Checkbox
                          checked={selectedActionIds.size === availableActions.length && availableActions.length > 0}
                          onCheckedChange={() => handleSelectAll()}
                          data-testid={`${dataTestId}-select-all-checkbox`}
                        />
                      </TableHead>
                      <TableHead className="gba:w-[350px]">Action</TableHead>
                      <TableHead className="gba:w-[100px]">Type</TableHead>
                      <TableHead className="gba:w-[150px]">Permission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableActions.map(item => {
                      const action = item.action
                      const isSelected = selectedActionIds.has(action.id)
                      const permission = actionPermissions.get(action.id) || 'execute'
                      const subtitle = getActionSubtitle(action)
                      const actionText = action.flowName
                      return (
                        <TableRow key={action.id}>
                          <TableCell className="gba:w-[50px]">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleAction(action.id)}
                              data-testid={`${dataTestId}-action-${action.id}`}
                            />
                          </TableCell>
                          <TableCell className="gba:w-[350px]">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="gba:flex gba:flex-col gba:min-w-0 gba:overflow-hidden">
                                    <span className="gba:font-semibold gba:truncate">{actionText}</span>
                                    <span className="gba:text-sm gba:text-muted-foreground gba:truncate">
                                      {subtitle}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="gba:space-y-1">
                                    <p className="gba:font-medium">{actionText}</p>
                                    {subtitle && <p className="gba:text-sm">{subtitle}</p>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="gba:w-[100px]">{action.flowType}</TableCell>
                          <TableCell className="gba:w-[150px]">
                            {isSelected ? (
                              <Select
                                value={permission}
                                onValueChange={value => handlePermissionChange(action.id, value)}
                                data-testid={`${dataTestId}-permission-${action.id}`}
                              >
                                <SelectTrigger className="gba:w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PERMISSIONS.map(perm => (
                                    <SelectItem key={perm.value} value={perm.value}>
                                      {perm.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="gba:text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {/* Infinite Scroll Loader */}
                    {hasMore && (
                      <TableRow ref={loadMoreRef}>
                        <TableCell colSpan={4} className="gba:text-center gba:py-4">
                          {isLoading ? (
                            <Spinner size="sm" />
                          ) : (
                            <span className="gba:text-sm gba:text-muted-foreground">Loading more...</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-sm gba:text-muted-foreground">
            {selectedActionIds.size} of {totalCount} actions selected
          </span>
          <div className="gba:flex gba:gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedActionIds.size === 0 || isSubmitting}
              data-testid={`${dataTestId}-add-button`}
            >
              Add {selectedActionIds.size > 0 ? `(${selectedActionIds.size})` : ''}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
