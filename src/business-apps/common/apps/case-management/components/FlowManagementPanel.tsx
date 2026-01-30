/**
 * Flow Management Panel Component
 *
 * Panel for adding, viewing, and removing flows from cases
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Input,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { Plus, X, CheckCircle, Clock, XCircle, Eye, ExternalLink, Play, FileText, Search, Link2 } from 'lucide-react'
import { BusinessAppContextProps } from '@/business-apps/types'
import { LinkedFlow, AddFlowRequest, SearchFlowResult } from '../types'
import { FlowTemplateClient, FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import { CaseApiClient } from '../services/CaseApiClient'
import { TERMINAL_FLOW_STATES, formatRelativeTime, isFlowTerminal, formatDate } from '../utils'
import { useEmployeeNamesBatch } from '@/business-apps/ser/hooks/useEmployeeNamesBatch'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'

// Format flow ID similar to service-desk (REQ-XXXXXXXX)
const formatFlowId = (id: string): string => {
  if (!id) return 'REQ-UNKNOWN'
  return `REQ-${id.slice(-8).toUpperCase()}`
}

/**
 * Build URL to open a task in service-desk
 * Handles both development and production environments
 */
const buildServiceDeskTaskUrl = (taskId: string): string => {
  const isProduction = process.env.NODE_ENV === 'production'
  const platformPath = '/platform/sales-demo/service-desk'

  if (isProduction) {
    // In production, use the platform URL directly
    return buildPlatformUrl(platformPath, { taskId })
  } else {
    // In development, construct a URL that works with the dev server
    // The dev server uses query params like ?app=ser/apps/service-desk&taskId=xxx
    const devAppPath = 'ser/apps/service-desk'
    return `${window.location.origin}?app=${devAppPath}&taskId=${taskId}`
  }
}

interface FlowManagementPanelProps {
  caseId: string
  linkedFlows: LinkedFlow[]
  onAddFlow: (request: AddFlowRequest) => Promise<void>
  onRemoveFlow: (workflowId: string) => Promise<void>
  context: BusinessAppContextProps
  appTag: string
  readOnly?: boolean
}

export const FlowManagementPanel: React.FC<FlowManagementPanelProps> = ({
  caseId,
  linkedFlows,
  onAddFlow,
  onRemoveFlow,
  context,
  appTag,
  readOnly = false
}) => {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [removeFlowId, setRemoveFlowId] = useState<string | null>(null)
  const [selectedFlow, setSelectedFlow] = useState<LinkedFlow | null>(null)
  const [templates, setTemplates] = useState<FlowTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  // Link existing flow state
  const [addFlowMode, setAddFlowMode] = useState<'new' | 'existing'>('new')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchFlowResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedExistingFlow, setSelectedExistingFlow] = useState<SearchFlowResult | null>(null)
  const [isLinking, setIsLinking] = useState(false)

  // Extract all user IDs that need name resolution (from search results + linked flows)
  const allUserIds = useMemo(() => {
    const searchInitiators = searchResults
      .map(flow => flow.initiatedBy)
      .filter((id): id is string => !!id && id.length > 0)

    // Include addedBy, initiator, AND removedBy for audit history
    const linkedFlowUsers = linkedFlows
      .flatMap(flow => [flow.addedBy, flow.initiator, flow.removedBy])
      .filter((id): id is string => !!id && id.length > 0)

    return [...new Set([...searchInitiators, ...linkedFlowUsers])]
  }, [searchResults, linkedFlows])

  // Batch resolve all user names
  const { displayNames: initiatorNames, employees: initiatorEmployees } = useEmployeeNamesBatch({
    userIds: allUserIds,
    accessToken: context.accessToken,
    enabled: allUserIds.length > 0
  })

  // Helper to get initials from name
  const getInitials = (name: string): string => {
    if (!name || name === 'Unknown User') return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Load templates when dialog opens
  useEffect(() => {
    if (showAddDialog) {
      loadTemplates()
    }
  }, [showAddDialog])

  const loadTemplates = async () => {
    try {
      setIsLoadingTemplates(true)
      const templateClient = new FlowTemplateClient(context.accessToken)
      const response = await templateClient.getTemplatesList({
        tagFilters: { app: appTag }
      })
      setTemplates(response.templates || [])
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  const handleAddFlow = async () => {
    if (!selectedTemplateId || isAdding) return

    try {
      setIsAdding(true)
      await onAddFlow({
        templateId: selectedTemplateId,
        inputValues: {},
        initiator: context.userInfo?.id || 'system'
      })
      setShowAddDialog(false)
      setSelectedTemplateId('')
    } catch (error) {
      console.error('Failed to add flow:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveFlow = async () => {
    if (!removeFlowId) return

    try {
      await onRemoveFlow(removeFlowId)
      setRemoveFlowId(null)
    } catch (error) {
      console.error('Failed to remove flow:', error)
    }
  }

  // Search for existing flows
  const handleSearchFlows = async (query: string) => {
    setSearchQuery(query)

    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      setIsSearching(true)
      const apiClient = new CaseApiClient(undefined, context.accessToken)
      const result = await apiClient.searchFlows({ search: query, limit: 10 })
      setSearchResults(result.flows)
    } catch (error) {
      console.error('Failed to search flows:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Link existing flow to case
  const handleLinkExistingFlow = async () => {
    if (!selectedExistingFlow || isLinking) return

    try {
      setIsLinking(true)
      const apiClient = new CaseApiClient(undefined, context.accessToken)
      await apiClient.linkExistingFlow(caseId, selectedExistingFlow.workflowId, context.userInfo?.id)

      setShowAddDialog(false)
      setSearchQuery('')
      setSearchResults([])
      setSelectedExistingFlow(null)

      // Trigger refresh - call onAddFlow with empty to refresh the list
      // Actually we need a refresh callback, for now we'll rely on parent refresh
      window.location.reload() // Temporary - ideally parent would refresh
    } catch (error) {
      console.error('Failed to link flow:', error)
    } finally {
      setIsLinking(false)
    }
  }

  // Reset dialog state when closing
  const handleCloseAddDialog = (open: boolean) => {
    if (!open) {
      setSelectedTemplateId('')
      setSearchQuery('')
      setSearchResults([])
      setSelectedExistingFlow(null)
      setAddFlowMode('new')
    }
    setShowAddDialog(open)
  }

  const getFlowStatusIcon = (status: string) => {
    if (TERMINAL_FLOW_STATES.includes(status)) {
      if (status === 'COMPLETED') {
        return <CheckCircle className="gba:h-4 gba:w-4 gba:text-green-600" />
      }
      return <XCircle className="gba:h-4 gba:w-4 gba:text-red-600" />
    }
    return <Clock className="gba:h-4 gba:w-4 gba:text-blue-600" />
  }

  const getFlowStatusVariant = (status: string): any => {
    if (status === 'COMPLETED') return 'success'
    if (status === 'IN_PROGRESS' || status === 'SCHEDULED') return 'default'
    if (TERMINAL_FLOW_STATES.includes(status)) return 'destructive'
    return 'secondary'
  }

  const activeFlows = linkedFlows.filter(f => !f.removedAt)
  const removedFlows = linkedFlows.filter(f => f.removedAt)

  return (
    <div className="gba:space-y-4">
      {/* Active Flows */}
      <Card>
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-4">
          <CardTitle className="gba:text-lg">Active Flows ({activeFlows.length})</CardTitle>
          {!readOnly && (
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
              Add Flow
            </Button>
          )}
        </CardHeader>
        <CardContent className="gba:pt-0">
          {activeFlows.length === 0 ? (
            <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
              <Clock className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-2 gba:opacity-50" />
              <p>No flows linked to this case</p>
              {!readOnly && <p className="gba:text-sm gba:mt-1">Add a flow to get started</p>}
            </div>
          ) : (
            <div className="gba:space-y-3">
              {activeFlows.map(flow => (
                <div
                  key={flow.workflowId}
                  className="gba:p-4 gba:border gba:rounded-lg hover:gba:bg-muted/50 gba:transition-colors gba:cursor-pointer"
                  onClick={() => setSelectedFlow(flow)}
                >
                  {/* Header: Name and Status */}
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      {getFlowStatusIcon(flow.status || 'UNKNOWN')}
                      <span className="gba:font-medium">{flow.workflowName || flow.templateId || 'Unnamed Flow'}</span>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Badge variant={getFlowStatusVariant(flow.status || 'UNKNOWN')}>{flow.status || 'UNKNOWN'}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gba:h-8 gba:w-8 gba:p-0"
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedFlow(flow)
                        }}
                      >
                        <Eye className="gba:h-4 gba:w-4" />
                      </Button>
                      {!readOnly && !isFlowTerminal(flow) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gba:h-8 gba:w-8 gba:p-0 gba:text-muted-foreground hover:gba:text-destructive"
                          onClick={e => {
                            e.stopPropagation()
                            setRemoveFlowId(flow.workflowId)
                          }}
                        >
                          <X className="gba:h-4 gba:w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Info Row: ID and Initiator */}
                  <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground gba:mb-3">
                    <span className="gba:font-mono gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded">
                      {formatFlowId(flow.workflowId)}
                    </span>
                    {(flow.initiator || flow.addedBy) && (
                      <div
                        className="gba:flex gba:items-center gba:gap-1.5 gba:cursor-pointer gba:px-1 gba:py-0.5 gba:rounded gba:transition-colors hover:gba:bg-muted gba:group"
                        onClick={e => {
                          e.stopPropagation()
                          const employee = initiatorEmployees.get(flow.initiator || flow.addedBy)
                          if (employee?.id) {
                            window.open(`/platform/employee-record?employeeId=${employee.id}`, '_blank')
                          }
                        }}
                      >
                        <Avatar className="gba:h-5 gba:w-5 gba:outline gba:outline-1 gba:outline-offset-1 gba:outline-transparent group-hover:gba:outline-primary/50 gba:transition-all">
                          {initiatorEmployees.get(flow.initiator || flow.addedBy)?.pictureThumbnail ? (
                            <AvatarImage
                              src={`data:image/png;base64,${initiatorEmployees.get(flow.initiator || flow.addedBy)?.pictureThumbnail}`}
                              alt={initiatorNames.get(flow.initiator || flow.addedBy) || 'User'}
                            />
                          ) : null}
                          <AvatarFallback className="gba:text-[10px]">
                            {getInitials(initiatorNames.get(flow.initiator || flow.addedBy) || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="gba:font-medium gba:text-foreground group-hover:gba:text-primary gba:transition-colors">
                          {initiatorNames.get(flow.initiator || flow.addedBy) || 'Loading...'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="gba:space-y-1.5 gba:mb-3">
                    <div className="gba:flex gba:items-center gba:justify-between gba:text-xs">
                      <span className="gba:text-muted-foreground">
                        {flow.completedSteps || 0}/{flow.totalSteps || 0} steps
                      </span>
                      <span className="gba:font-medium">{Math.round(flow.progressPercentage || 0)}%</span>
                    </div>
                    <div className="gba:h-1.5 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                      <div
                        className={`gba:h-full gba:rounded-full gba:transition-all ${
                          flow.status === 'COMPLETED'
                            ? 'gba:bg-green-500'
                            : TERMINAL_FLOW_STATES.includes(flow.status || '')
                              ? 'gba:bg-red-500'
                              : 'gba:bg-primary'
                        }`}
                        style={{ width: `${Math.min(flow.progressPercentage || 0, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Current Step */}
                  {flow.currentStepName && !isFlowTerminal(flow) && (
                    <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:mb-3">
                      <Play className="gba:h-3 gba:w-3 gba:text-primary" />
                      <span className="gba:text-muted-foreground">Current step:</span>
                      <span className="gba:font-medium">{flow.currentStepName}</span>
                    </div>
                  )}

                  {/* Footer: Added info */}
                  <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-muted-foreground">
                    <span>Added {formatRelativeTime(flow.addedAt)}</span>
                    {flow.templateId && (
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <FileText className="gba:h-3 gba:w-3" />
                        {flow.templateId}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Removed Flows History (Audit Trail) */}
      {removedFlows.length > 0 && (
        <Card className="gba:border-dashed">
          <CardHeader className="gba:pb-2">
            <CardTitle className="gba:text-lg gba:text-muted-foreground">
              Flow History ({removedFlows.length} removed)
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:pt-0">
            <div className="gba:space-y-2">
              {removedFlows.map((flow, index) => {
                const removedByName = flow.removedBy ? initiatorNames[flow.removedBy] || flow.removedBy : 'Unknown'
                const removedByEmployee = flow.removedBy ? initiatorEmployees[flow.removedBy] : undefined
                const addedByName = flow.addedBy ? initiatorNames[flow.addedBy] || flow.addedBy : 'Unknown'

                return (
                  <div
                    key={`${flow.workflowId}-${index}`}
                    className="gba:p-3 gba:border gba:rounded-lg gba:bg-muted/30 gba:opacity-70"
                  >
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span className="gba:text-sm gba:font-medium">
                          {flow.workflowName || flow.templateId || 'Unknown Flow'}
                        </span>
                        <span className="gba:text-xs gba:font-mono gba:text-muted-foreground">
                          {formatFlowId(flow.workflowId)}
                        </span>
                      </div>
                      <Badge variant="secondary" className="gba:text-xs">
                        Removed
                      </Badge>
                    </div>

                    <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:text-xs gba:text-muted-foreground">
                      <div>
                        <span className="gba:font-medium">Added:</span> {formatDate(flow.addedAt)} by {addedByName}
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <span className="gba:font-medium">Removed:</span> {formatDate(flow.removedAt!)} by{' '}
                        {removedByEmployee ? (
                          <button
                            onClick={() => {
                              const url = `/platform/employee/profile/${flow.removedBy}`
                              window.open(url, '_blank')
                            }}
                            className="gba:inline-flex gba:items-center gba:gap-1 gba:text-primary hover:gba:underline"
                          >
                            <Avatar className="gba:h-4 gba:w-4">
                              <AvatarImage src={removedByEmployee.photoUrl} alt={removedByName} />
                              <AvatarFallback className="gba:text-[8px]">
                                {removedByName
                                  .split(' ')
                                  .map(n => n[0])
                                  .join('')
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            {removedByName}
                          </button>
                        ) : (
                          <span>{removedByName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Flow Dialog */}
      <Dialog open={showAddDialog} onOpenChange={handleCloseAddDialog}>
        <DialogContent className="gba:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Flow to Case</DialogTitle>
          </DialogHeader>

          <Tabs value={addFlowMode} onValueChange={v => setAddFlowMode(v as 'new' | 'existing')} className="gba:w-full">
            <TabsList className="gba:w-full gba:h-10 gba:p-1 gba:bg-muted gba:rounded-lg">
              <TabsTrigger value="new" startIcon={<Plus className="gba:h-4 gba:w-4" />} className="gba:flex-1">
                Start New
              </TabsTrigger>
              <TabsTrigger value="existing" startIcon={<Link2 className="gba:h-4 gba:w-4" />} className="gba:flex-1">
                Link Existing
              </TabsTrigger>
            </TabsList>

            {/* Start New Flow Tab */}
            <TabsContent value="new" className="gba:space-y-4 gba:mt-4">
              <div className="gba:space-y-2">
                <label className="gba:text-sm gba:font-medium">Select Template</label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId} disabled={isLoadingTemplates}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingTemplates ? 'Loading templates...' : 'Select a template'} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id || template.name} value={template.id || ''}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="gba:text-sm gba:text-muted-foreground">
                <p>
                  Correlation ID:{' '}
                  <code className="gba:bg-muted gba:px-1 gba:py-0.5 gba:rounded gba:font-mono gba:text-xs">
                    case:{caseId}
                  </code>
                </p>
                <p className="gba:mt-1">A new flow will be started and automatically linked to this case.</p>
              </div>
            </TabsContent>

            {/* Link Existing Flow Tab */}
            <TabsContent value="existing" className="gba:space-y-4 gba:mt-4">
              <div className="gba:space-y-2">
                <label className="gba:text-sm gba:font-medium">Search Running Flows</label>
                <div className="gba:relative">
                  <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
                  <Input
                    placeholder="Search by ID, name, or template..."
                    value={searchQuery}
                    onChange={e => handleSearchFlows(e.target.value)}
                    className="gba:pl-10"
                  />
                </div>
              </div>

              {/* Search Results */}
              <div className="gba:max-h-80 gba:overflow-y-auto gba:space-y-2">
                {isSearching ? (
                  <div className="gba:text-center gba:py-4 gba:text-muted-foreground">
                    <Clock className="gba:h-5 gba:w-5 gba:mx-auto gba:mb-2 gba:animate-spin" />
                    <p className="gba:text-sm">Searching...</p>
                  </div>
                ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                  <div className="gba:text-center gba:py-4 gba:text-muted-foreground">
                    <p className="gba:text-sm">No running flows found</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(flow => (
                    <div
                      key={flow.workflowId}
                      onClick={() => setSelectedExistingFlow(flow)}
                      className={`gba:p-3 gba:border gba:rounded-lg gba:cursor-pointer gba:transition-colors ${
                        selectedExistingFlow?.workflowId === flow.workflowId
                          ? 'gba:border-primary gba:bg-primary/5'
                          : 'hover:gba:bg-muted/50'
                      }`}
                    >
                      {/* Header: Name and Status */}
                      <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                        <span className="gba:font-medium gba:text-sm">{flow.workflowName}</span>
                        <Badge variant={flow.status === 'RUNNING' ? 'default' : 'secondary'} className="gba:text-xs">
                          {flow.status}
                        </Badge>
                      </div>

                      {/* Info Row: ID and Initiator */}
                      <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground gba:mb-2">
                        <span className="gba:font-mono gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded">
                          {formatFlowId(flow.workflowId)}
                        </span>
                        {flow.initiatedBy && (
                          <div className="gba:flex gba:items-center gba:gap-1.5">
                            <Avatar className="gba:h-5 gba:w-5">
                              {initiatorEmployees.get(flow.initiatedBy)?.pictureThumbnail ? (
                                <AvatarImage
                                  src={`data:image/png;base64,${initiatorEmployees.get(flow.initiatedBy)?.pictureThumbnail}`}
                                  alt={initiatorNames.get(flow.initiatedBy) || 'User'}
                                />
                              ) : null}
                              <AvatarFallback className="gba:text-[10px]">
                                {getInitials(initiatorNames.get(flow.initiatedBy) || 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="gba:font-medium gba:text-foreground">
                              {initiatorNames.get(flow.initiatedBy) || 'Loading...'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="gba:space-y-1">
                        <div className="gba:flex gba:items-center gba:justify-between gba:text-xs">
                          <span className="gba:text-muted-foreground">
                            {flow.completedSteps || 0}/{flow.totalSteps || 0} steps
                          </span>
                          <span className="gba:font-medium">{Math.round(flow.progressPercentage || 0)}%</span>
                        </div>
                        <div className="gba:h-1.5 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                          <div
                            className="gba:h-full gba:bg-primary gba:rounded-full gba:transition-all"
                            style={{ width: `${Math.min(flow.progressPercentage || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : searchQuery.length < 2 ? (
                  <div className="gba:text-center gba:py-4 gba:text-muted-foreground">
                    <Search className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:opacity-50" />
                    <p className="gba:text-sm">Type at least 2 characters to search</p>
                  </div>
                ) : null}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleCloseAddDialog(false)} disabled={isAdding || isLinking}>
              Cancel
            </Button>
            {addFlowMode === 'new' ? (
              <Button onClick={handleAddFlow} disabled={!selectedTemplateId || isAdding}>
                {isAdding ? 'Starting...' : 'Start Flow'}
              </Button>
            ) : (
              <Button onClick={handleLinkExistingFlow} disabled={!selectedExistingFlow || isLinking}>
                <Link2 className="gba:h-4 gba:w-4 gba:mr-2" />
                {isLinking ? 'Linking...' : 'Link Flow'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Flow Confirmation Dialog */}
      <AlertDialog open={!!removeFlowId} onOpenChange={open => !open && setRemoveFlowId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Flow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink this flow from the case? The flow will continue running but will no longer
              be associated with this case.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveFlow}>Remove Flow</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Flow Details Dialog */}
      <Dialog open={!!selectedFlow} onOpenChange={open => !open && setSelectedFlow(null)}>
        <DialogContent className="gba:max-w-lg">
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <FileText className="gba:h-5 gba:w-5" />
              Flow Details
            </DialogTitle>
          </DialogHeader>
          {selectedFlow && (
            <div className="gba:space-y-4 gba:py-2">
              {/* Flow Status */}
              <div className="gba:flex gba:items-center gba:justify-between">
                <span className="gba:text-sm gba:text-muted-foreground">Status</span>
                <div className="gba:flex gba:items-center gba:gap-2">
                  {getFlowStatusIcon(selectedFlow.status || 'UNKNOWN')}
                  <Badge variant={getFlowStatusVariant(selectedFlow.status || 'UNKNOWN')}>
                    {selectedFlow.status || 'UNKNOWN'}
                  </Badge>
                </div>
              </div>

              <hr className="gba:border-t gba:border-border" />

              {/* Flow Information */}
              <div className="gba:space-y-3">
                <div className="gba:flex gba:justify-between gba:text-sm">
                  <span className="gba:text-muted-foreground">Flow ID</span>
                  <span className="gba:font-mono gba:text-xs gba:bg-muted gba:px-2 gba:py-1 gba:rounded">
                    {selectedFlow.workflowId}
                  </span>
                </div>
                {selectedFlow.templateId && (
                  <div className="gba:flex gba:justify-between gba:text-sm">
                    <span className="gba:text-muted-foreground">Template</span>
                    <span>{selectedFlow.templateId}</span>
                  </div>
                )}
                <div className="gba:flex gba:justify-between gba:text-sm">
                  <span className="gba:text-muted-foreground">Added</span>
                  <span>{formatDate(selectedFlow.addedAt)}</span>
                </div>
                <div className="gba:flex gba:justify-between gba:items-center gba:text-sm">
                  <span className="gba:text-muted-foreground">Added By</span>
                  <div
                    className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:px-2 gba:py-1 gba:rounded gba:transition-colors hover:gba:bg-muted gba:group"
                    onClick={() => {
                      const employee = initiatorEmployees.get(selectedFlow.addedBy)
                      if (employee?.id) {
                        window.open(`/platform/employee-record?employeeId=${employee.id}`, '_blank')
                      }
                    }}
                  >
                    <Avatar className="gba:h-6 gba:w-6 gba:outline gba:outline-2 gba:outline-offset-1 gba:outline-transparent group-hover:gba:outline-primary/50 gba:transition-all">
                      {initiatorEmployees.get(selectedFlow.addedBy)?.pictureThumbnail ? (
                        <AvatarImage
                          src={`data:image/png;base64,${initiatorEmployees.get(selectedFlow.addedBy)?.pictureThumbnail}`}
                          alt={initiatorNames.get(selectedFlow.addedBy) || 'User'}
                        />
                      ) : null}
                      <AvatarFallback className="gba:text-xs">
                        {getInitials(initiatorNames.get(selectedFlow.addedBy) || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="gba:font-medium group-hover:gba:text-primary gba:transition-colors">
                      {initiatorNames.get(selectedFlow.addedBy) || selectedFlow.addedBy}
                    </span>
                  </div>
                </div>
                {selectedFlow.createdAt && (
                  <div className="gba:flex gba:justify-between gba:text-sm">
                    <span className="gba:text-muted-foreground">Flow Created</span>
                    <span>{formatDate(selectedFlow.createdAt)}</span>
                  </div>
                )}
                {selectedFlow.updatedAt && (
                  <div className="gba:flex gba:justify-between gba:text-sm">
                    <span className="gba:text-muted-foreground">Last Updated</span>
                    <span>{formatDate(selectedFlow.updatedAt)}</span>
                  </div>
                )}
              </div>

              {/* Current Step Info - always show */}
              <>
                <hr className="gba:border-t gba:border-border" />
                <div className="gba:space-y-3">
                  <div className="gba:flex gba:justify-between gba:text-sm">
                    <span className="gba:text-muted-foreground">Current Step</span>
                    <span className="gba:font-medium">
                      {selectedFlow.currentStepName ||
                        (isFlowTerminal(selectedFlow) ? 'Completed' : 'Awaiting task...')}
                    </span>
                  </div>
                  <div className="gba:flex gba:justify-between gba:text-sm">
                    <span className="gba:text-muted-foreground">Step Status</span>
                    <Badge variant="secondary" className="gba:text-xs">
                      {selectedFlow.currentStepStatus || selectedFlow.status || 'PENDING'}
                    </Badge>
                  </div>
                </div>
              </>

              {/* Progress Info */}
              {(selectedFlow.totalSteps || 0) > 0 && (
                <>
                  <hr className="gba:border-t gba:border-border" />
                  <div className="gba:space-y-2">
                    <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                      <span className="gba:text-muted-foreground">Progress</span>
                      <span className="gba:font-medium">
                        {selectedFlow.completedSteps || 0}/{selectedFlow.totalSteps || 0} steps (
                        {Math.round(selectedFlow.progressPercentage || 0)}%)
                      </span>
                    </div>
                    <div className="gba:h-2 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                      <div
                        className={`gba:h-full gba:rounded-full gba:transition-all ${
                          selectedFlow.status === 'COMPLETED'
                            ? 'gba:bg-green-500'
                            : TERMINAL_FLOW_STATES.includes(selectedFlow.status || '')
                              ? 'gba:bg-red-500'
                              : 'gba:bg-primary'
                        }`}
                        style={{ width: `${Math.min(selectedFlow.progressPercentage || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </>
              )}

              <hr className="gba:border-t gba:border-border" />

              {/* Flow Status Info */}
              {!isFlowTerminal(selectedFlow) && (
                <div className="gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded-lg gba:p-3">
                  <div className="gba:flex gba:items-start gba:gap-2">
                    <Play className="gba:h-4 gba:w-4 gba:text-blue-600 gba:mt-0.5" />
                    <div>
                      <p className="gba:text-sm gba:font-medium gba:text-blue-900">Flow In Progress</p>
                      <p className="gba:text-xs gba:text-blue-700 gba:mt-1">
                        This flow is currently running. Tasks may be awaiting action.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedFlow.status === 'COMPLETED' && (
                <div className="gba:bg-green-50 gba:border gba:border-green-200 gba:rounded-lg gba:p-3">
                  <div className="gba:flex gba:items-start gba:gap-2">
                    <CheckCircle className="gba:h-4 gba:w-4 gba:text-green-600 gba:mt-0.5" />
                    <div>
                      <p className="gba:text-sm gba:font-medium gba:text-green-900">Flow Completed</p>
                      <p className="gba:text-xs gba:text-green-700 gba:mt-1">This flow has finished successfully.</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedFlow.status &&
                TERMINAL_FLOW_STATES.includes(selectedFlow.status) &&
                selectedFlow.status !== 'COMPLETED' && (
                  <div className="gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-lg gba:p-3">
                    <div className="gba:flex gba:items-start gba:gap-2">
                      <XCircle className="gba:h-4 gba:w-4 gba:text-red-600 gba:mt-0.5" />
                      <div>
                        <p className="gba:text-sm gba:font-medium gba:text-red-900">Flow Terminated</p>
                        <p className="gba:text-xs gba:text-red-700 gba:mt-1">
                          This flow has ended with status: {selectedFlow.status}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )}
          <DialogFooter className="gba:gap-2">
            <Button variant="outline" onClick={() => setSelectedFlow(null)}>
              Close
            </Button>
            {selectedFlow?.currentTaskId ? (
              <Button
                variant="outline"
                onClick={() => {
                  // Open current step in service-desk using proper URL for env
                  const stepUrl = buildServiceDeskTaskUrl(selectedFlow.currentTaskId!)
                  window.open(stepUrl, '_blank')
                }}
              >
                <ExternalLink className="gba:h-4 gba:w-4 gba:mr-2" />
                Open Step
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  // Fallback: View flow in service-desk (no specific task to open)
                  const isProduction = process.env.NODE_ENV === 'production'
                  if (isProduction) {
                    const flowUrl = buildPlatformUrl('/platform/sales-demo/service-desk', {
                      flowId: selectedFlow?.workflowId || ''
                    })
                    window.open(flowUrl, '_blank')
                  } else {
                    const flowUrl = `${window.location.origin}?app=ser/apps/service-desk&flowId=${selectedFlow?.workflowId || ''}`
                    window.open(flowUrl, '_blank')
                  }
                }}
              >
                <ExternalLink className="gba:h-4 gba:w-4 gba:mr-2" />
                Open Flow
              </Button>
            )}
            {!readOnly && !isFlowTerminal(selectedFlow) && (
              <Button
                variant="destructive"
                onClick={() => {
                  setSelectedFlow(null)
                  setRemoveFlowId(selectedFlow?.workflowId || null)
                }}
              >
                <X className="gba:h-4 gba:w-4 gba:mr-2" />
                Remove
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
