import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import {
  Card,
  CardContent,
  Button,
  Spinner,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import { useUpdateActionAssignment } from '@/common/data/resources/hooks/useUpdateActionAssignment'
import { useDeleteContext } from '@/common/data/resources/hooks/useDeleteContext'
import { Trash } from '@phosphor-icons/react'
import type { ContextDTO } from '@/common/data/resources/types/context.types'
import type { ActionAssignmentDTO } from '@/common/data/resources/types/assignment.types'

interface DebugTabProps extends BusinessAppContextProps {
  'data-testid'?: string
  onCountChange?: (count: number) => void
  isActive?: boolean
}

export const DebugTab: React.FC<DebugTabProps> = ({
  'data-testid': dataTestId = 'debug-tab',
  onCountChange,
  isActive = true,
  ...context
}) => {
  const resourceClient = useResourceClient(context.accessToken)
  const { createActionAssignment } = useUpdateActionAssignment(context)
  const { deleteContext } = useDeleteContext(context)
  const [allContexts, setAllContexts] = useState<ContextDTO[]>([])
  const [allAssignments, setAllAssignments] = useState<ActionAssignmentDTO[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedRef = useRef(false)
  const [repairDialogOpen, setRepairDialogOpen] = useState<string | null>(null)
  const [isRepairing, setIsRepairing] = useState(false)
  const [deletingContextId, setDeletingContextId] = useState<string | null>(null)

  // Fetch all data in 500-item chunks
  const fetchAllData = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token not available')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch all contexts in 100-item chunks
      const contexts: ContextDTO[] = []
      let contextsOffset = 0
      const contextsLimit = 100
      let contextsHasMore = true

      while (contextsHasMore) {
        const contextsPage = await resourceClient.action.getContexts({
          limit: contextsLimit,
          offset: contextsOffset,
          returnTotalRecords: true
        })

        const pageData = contextsPage?.data || []
        contexts.push(...pageData)

        const totalRecords = contextsPage?.paging?.totalRecords || 0
        contextsHasMore = contextsOffset + pageData.length < totalRecords
        contextsOffset += pageData.length
      }

      // Fetch all assignments in 100-item chunks
      const assignments: ActionAssignmentDTO[] = []
      let assignmentsOffset = 0
      const assignmentsLimit = 100
      let assignmentsHasMore = true

      while (assignmentsHasMore) {
        const assignmentsPage = await resourceClient.action.getActionAssignments({
          limit: assignmentsLimit,
          offset: assignmentsOffset,
          returnTotalRecords: true
        })

        const pageData = assignmentsPage?.data || []
        assignments.push(...pageData)

        const totalRecords = assignmentsPage?.paging?.totalRecords || 0
        assignmentsHasMore = assignmentsOffset + pageData.length < totalRecords
        assignmentsOffset += pageData.length
      }

      setAllContexts(contexts)
      setAllAssignments(assignments)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch debug data'
      setError(errorMessage)
      console.error('Error fetching debug data:', err)
      setAllContexts([])
      setAllAssignments([])
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, resourceClient])

  // Initial load or when tab becomes active
  useEffect(() => {
    if (isActive && !loadedRef.current && context.accessToken) {
      loadedRef.current = true
      fetchAllData()
    } else if (!isActive) {
      // Reset loadedRef when tab becomes inactive so data reloads when tab becomes active again
      loadedRef.current = false
    }
  }, [isActive, context.accessToken, fetchAllData])

  // Find contexts that are NOT in assignments
  const orphanedContexts = useMemo(() => {
    const contextIdsInAssignments = new Set<string>()

    allAssignments.forEach(assignment => {
      if (assignment.context?.id) {
        contextIdsInAssignments.add(assignment.context.id)
      }
    })

    return allContexts.filter(context => !contextIdsInAssignments.has(context.id))
  }, [allContexts, allAssignments])

  // Update parent count
  useEffect(() => {
    if (onCountChange) {
      onCountChange(orphanedContexts.length)
    }
  }, [orphanedContexts.length, onCountChange])

  // Handle repair context
  const handleRepairContext = useCallback(
    async (contextId: string) => {
      const contextToRepair = orphanedContexts.find(ctx => ctx.id === contextId)
      if (!contextToRepair) return

      setIsRepairing(true)
      try {
        // Build full context object with all required fields
        const fullContext: ContextDTO = {
          id: contextToRepair.id,
          contextName: contextToRepair.contextName,
          contextData: contextToRepair.contextData || [],
          permissionSchema: contextToRepair.permissionSchema,
          rank: contextToRepair.rank ?? 0,
          version: contextToRepair.version ?? 0
        }

        // Create assignment with empty assignments array (placeholder)
        await createActionAssignment({
          context: fullContext,
          assignments: []
        })

        // Remove context from state (no refetch)
        setAllContexts(prev => prev.filter(ctx => ctx.id !== contextId))
        setRepairDialogOpen(null)
      } catch (err) {
        console.error('Error repairing context:', err)
      } finally {
        setIsRepairing(false)
      }
    },
    [orphanedContexts, createActionAssignment]
  )

  // Handle delete context
  const handleDeleteContext = useCallback(
    async (contextId: string) => {
      setDeletingContextId(contextId)
      try {
        const success = await deleteContext(contextId)
        if (success) {
          // Remove context from state (no refetch)
          setAllContexts(prev => prev.filter(ctx => ctx.id !== contextId))
        }
      } catch (err) {
        console.error('Error deleting context:', err)
      } finally {
        setDeletingContextId(null)
      }
    },
    [deleteContext]
  )

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
        <Spinner size="md" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <p className="gba:text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <>
      <div className="gba:p-6">
        {orphanedContexts.length === 0 ? (
          <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
            No orphaned contexts found (all contexts are assigned)
          </div>
        ) : (
          <div
            className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:gap-4"
            data-testid={`${dataTestId}-grid`}
          >
            {orphanedContexts.map(ctx => (
              <Card
                key={ctx.id}
                className="gba:transition-shadow hover:gba:shadow-md"
                data-testid={`${dataTestId}-context-${ctx.id}`}
              >
                <CardContent className="gba:p-4">
                  <div className="gba:space-y-3">
                    <div className="gba:space-y-2">
                      <h3 className="gba:font-semibold gba:text-base">{ctx.contextName || '-'}</h3>
                      <p className="gba:text-sm gba:text-muted-foreground">
                        {ctx.contextData?.length || 0} data fields
                      </p>
                    </div>
                    <div className="gba:flex gba:gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => setRepairDialogOpen(ctx.id)}
                        className="gba:flex-1"
                        data-testid={`${dataTestId}-repair-${ctx.id}`}
                      >
                        Repair
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteContext(ctx.id)}
                        disabled={deletingContextId === ctx.id}
                        data-testid={`${dataTestId}-delete-${ctx.id}`}
                      >
                        <Trash className="gba:h-4 gba:w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {repairDialogOpen && (
        <Dialog open={true} onOpenChange={open => !open && setRepairDialogOpen(null)}>
          <DialogContent data-testid={`${dataTestId}-repair-dialog`}>
            <DialogHeader>
              <DialogTitle>Repair Context</DialogTitle>
            </DialogHeader>
            <div className="gba:py-4">
              <p>Do you want to repair this context?</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRepairDialogOpen(null)} disabled={isRepairing}>
                Cancel
              </Button>
              <Button
                onClick={() => handleRepairContext(repairDialogOpen)}
                disabled={isRepairing}
                data-testid={`${dataTestId}-repair-confirm`}
              >
                {isRepairing ? 'Repairing...' : 'Yes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
