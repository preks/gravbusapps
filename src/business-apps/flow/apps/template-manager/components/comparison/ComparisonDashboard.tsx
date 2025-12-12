/**
 * ComparisonDashboard Component
 * Main dashboard for comparing templates between instances
 */

import React, { useState, useEffect } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFlowInstances } from '../../hooks/useFlowInstances'
import { useTemplateComparison } from '../../hooks/useTemplateComparison'
import { useTemplateSync } from '../../hooks/useTemplateSync'
import { InstanceSelector } from '../instance/InstanceSelector'
import { InstanceHealthIndicator } from '../instance/InstanceHealthIndicator'
import { TemplateSummaryCard } from './TemplateSummaryCard'
import { TemplateComparisonTable } from './TemplateComparisonTable'
import { BulkSelectionControls } from './BulkSelectionControls'
import { SyncConfigDialog } from '../sync/SyncConfigDialog'
import { SyncProgressModal } from '../sync/SyncProgressModal'
import { BulkSyncDialog } from '../sync/BulkSyncDialog'
import { BulkSyncProgress } from '../sync/BulkSyncProgress'
import { DiffViewerModal } from './DiffViewerModal'
import { TemplateExportImport, exportTemplateToJson } from './TemplateExportImport'
import { EnhancedErrorAlert } from '../error/EnhancedErrorAlert'
import { TemplateComparison } from '../../types/comparison'
import { SyncMode, SyncOptions, TemplateSyncItem } from '../../types/sync'
import { EnhancedError } from '../../types/error'
import { templateApi, FlowTemplate } from '../../services/templateApi'
import { createEnhancedError } from '../../utils/errorHandler'
import { Loader2, AlertCircle, ArrowRight, HelpCircle, Check, ArrowLeftRight, Trash2 } from 'lucide-react'
import { TemplateDeleteDialog } from './TemplateDeleteDialog'
import { DeletedTemplatesModal } from '../deleted/DeletedTemplatesModal'

export const ComparisonDashboard: React.FC<{ context: BusinessAppContextProps }> = ({ context }) => {
  const [sourceInstanceId, setSourceInstanceId] = useState<string>('')
  const [targetInstanceId, setTargetInstanceId] = useState<string>('')
  const [selectedComparison, setSelectedComparison] = useState<TemplateComparison | null>(null)
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [syncError, setSyncError] = useState<EnhancedError | null>(null)
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null)

  // Bulk sync state
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set())
  const [showBulkSyncDialog, setShowBulkSyncDialog] = useState(false)

  // Diff viewer state
  const [showDiffModal, setShowDiffModal] = useState(false)
  const [diffComparison, setDiffComparison] = useState<TemplateComparison | null>(null)
  const [diffSourceTemplate, setDiffSourceTemplate] = useState<FlowTemplate | null>(null)
  const [diffTargetTemplate, setDiffTargetTemplate] = useState<FlowTemplate | null>(null)

  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteComparison, setDeleteComparison] = useState<TemplateComparison | null>(null)

  // Deleted templates modal state
  const [showDeletedTemplatesModal, setShowDeletedTemplatesModal] = useState(false)

  // Hooks
  const { instances, isLoading: instancesLoading, error: instancesError } = useFlowInstances(context.accessToken)
  const {
    comparisons,
    isLoading: comparing,
    error: comparisonError,
    compareInstances,
    getSummary
  } = useTemplateComparison(context.accessToken)
  const { syncTemplate, syncMultiple, currentSync } = useTemplateSync(context.accessToken)

  // Auto-select first two instances
  useEffect(() => {
    if (instances.length >= 2 && !sourceInstanceId && !targetInstanceId) {
      setSourceInstanceId(instances[0].id)
      setTargetInstanceId(instances[1].id)
    }
  }, [instances, sourceInstanceId, targetInstanceId])

  const sourceInstance = instances.find(i => i.id === sourceInstanceId)
  const targetInstance = instances.find(i => i.id === targetInstanceId)

  const handleCompare = async () => {
    if (!sourceInstance || !targetInstance) return

    try {
      await compareInstances(sourceInstance, targetInstance)
    } catch (err) {
      console.error('Comparison failed', err)
    }
  }

  const handleSwapInstances = () => {
    // Swap source and target
    const tempSource = sourceInstanceId
    setSourceInstanceId(targetInstanceId)
    setTargetInstanceId(tempSource)

    // Clear any existing comparison and selections since direction changed
    setSelectedTemplateIds(new Set())
    // Note: User will need to click "Compare Templates" again after swapping
  }

  const handleExport = async (comparison: TemplateComparison, instanceType: 'source' | 'target') => {
    try {
      const instance = instanceType === 'source' ? sourceInstance : targetInstance
      if (!instance) {
        console.error(`No ${instanceType} instance available for export`)
        return
      }

      await exportTemplateToJson(comparison.templateId, comparison.name, instance, context.accessToken)
    } catch (err) {
      console.error('Export failed:', err)
      setSyncError(
        createEnhancedError(err as Error, {
          operation: 'Export Template',
          templateName: comparison.name,
          instanceType
        })
      )
    }
  }

  const handleDeleteClick = (comparison: TemplateComparison) => {
    setDeleteComparison(comparison)
    setShowDeleteDialog(true)
  }

  const handleDelete = async (templateId: string, deleteFrom: 'source' | 'target' | 'both', reason: string) => {
    if (!sourceInstance || !targetInstance) {
      setSyncError(
        createEnhancedError(new Error('Source and target instances must be selected'), {
          operation: 'Delete Template'
        })
      )
      return
    }

    try {
      const sourceApiKey = sourceInstance.apiKey || context.accessToken
      const targetApiKey = targetInstance.apiKey || context.accessToken
      const userId = context.userInfo?.employeeDetails?.employeeId || 'system'

      if (deleteFrom === 'source' || deleteFrom === 'both') {
        await templateApi.deleteTemplate(sourceInstance.baseUrl, templateId, sourceApiKey, userId, reason)
      }

      if (deleteFrom === 'target' || deleteFrom === 'both') {
        await templateApi.deleteTemplate(targetInstance.baseUrl, templateId, targetApiKey, userId, reason)
      }

      setSyncSuccess(`Template deleted successfully from ${deleteFrom === 'both' ? 'both instances' : deleteFrom}`)

      // Refresh comparison after deletion
      setTimeout(() => {
        handleCompare()
        setSyncSuccess(null)
      }, 1500)
    } catch (err) {
      console.error('Delete failed:', err)
      setSyncError(
        createEnhancedError(err as Error, {
          operation: 'Delete Template',
          templateId,
          deleteFrom
        })
      )
    }
  }

  const handleSyncClick = (comparison: TemplateComparison) => {
    setSelectedComparison(comparison)
    setShowSyncDialog(true)
  }

  const handleDiffClick = async (comparison: TemplateComparison) => {
    if (!sourceInstance || !targetInstance) {
      setSyncError(
        createEnhancedError(new Error('Source and target instances must be selected'), {
          operation: 'View Template Diff'
        })
      )
      return
    }

    setDiffComparison(comparison)
    setShowDiffModal(true)
    setDiffSourceTemplate(null)
    setDiffTargetTemplate(null)

    try {
      const sourceApiKey = sourceInstance.apiKey || context.accessToken
      const targetApiKey = targetInstance.apiKey || context.accessToken

      // Fetch source and target templates in parallel
      const promises: [Promise<FlowTemplate | null>, Promise<FlowTemplate | null>] = [
        comparison.source
          ? templateApi.getTemplateById(sourceInstance.baseUrl, comparison.templateId, sourceApiKey)
          : Promise.resolve(null),
        comparison.target
          ? templateApi.getTemplateById(targetInstance.baseUrl, comparison.templateId, targetApiKey)
          : Promise.resolve(null)
      ]

      const [sourceTemplate, targetTemplate] = await Promise.all(promises)

      setDiffSourceTemplate(sourceTemplate)
      setDiffTargetTemplate(targetTemplate)
    } catch (err) {
      console.error('Failed to fetch templates for diff:', err)
      // If it's already an EnhancedError from templateApi, use it; otherwise create one
      const enhancedError =
        err && typeof err === 'object' && 'category' in err
          ? (err as EnhancedError)
          : createEnhancedError(err, {
              operation: 'Fetch Templates for Diff',
              templateId: comparison.templateId,
              templateName: comparison.name
            })
      setSyncError(enhancedError)
      setShowDiffModal(false)
    }
  }

  const handleSync = async (mode: SyncMode, options: SyncOptions) => {
    if (!selectedComparison || !sourceInstance || !targetInstance) {
      setSyncError(
        createEnhancedError(new Error('Missing required selection'), {
          operation: 'Sync Template'
        })
      )
      return
    }

    setShowSyncDialog(false)
    setShowProgressModal(true)
    setSyncError(null)
    setSyncSuccess(null)

    try {
      const result = await syncTemplate(
        selectedComparison.templateId,
        sourceInstance,
        targetInstance,
        mode,
        options,
        selectedComparison.name
      )

      if (result.success) {
        setSyncSuccess(`Template "${selectedComparison.name}" synced successfully to ${targetInstance.name}!`)

        // Close single sync modal and refresh comparison
        setTimeout(() => {
          setShowProgressModal(false)

          // Refresh comparison to show updated state
          setTimeout(() => {
            handleCompare()
          }, 500)
        }, 2000)
      } else {
        setSyncError(
          createEnhancedError(new Error(result.error || result.message || 'Sync failed'), {
            operation: 'Sync Template',
            templateName: selectedComparison.name,
            templateId: selectedComparison.templateId
          })
        )
      }
    } catch (err) {
      console.error('Sync failed with error:', err)
      // If it's already an EnhancedError, use it; otherwise create one
      const enhancedError =
        err && typeof err === 'object' && 'category' in err
          ? (err as EnhancedError)
          : createEnhancedError(err, {
              operation: 'Sync Template',
              templateName: selectedComparison.name,
              templateId: selectedComparison.templateId
            })
      setSyncError(enhancedError)

      // Keep modal open to show error
      setTimeout(() => {
        setShowProgressModal(false)
      }, 3000)
    }
  }

  // Bulk sync handlers
  const handleSelectionChange = (templateId: string, selected: boolean) => {
    setSelectedTemplateIds(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(templateId)
      } else {
        newSet.delete(templateId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    const syncableTemplates = comparisons.filter(
      c => c.status !== 'IDENTICAL' && c.status !== 'NEW_IN_TARGET' && c.status !== 'TARGET_AHEAD'
    )
    setSelectedTemplateIds(new Set(syncableTemplates.map(c => c.templateId)))
  }

  const handleClearSelection = () => {
    setSelectedTemplateIds(new Set())
  }

  const handleBulkSyncClick = () => {
    setShowBulkSyncDialog(true)
  }

  const handleBulkSync = async (mode: SyncMode, options: SyncOptions) => {
    if (!sourceInstance || !targetInstance || selectedTemplateIds.size === 0) {
      setSyncError(
        createEnhancedError(new Error('Missing required selection for bulk sync'), {
          operation: 'Bulk Sync Templates'
        })
      )
      return
    }

    setShowBulkSyncDialog(false)
    setShowProgressModal(true)
    setSyncError(null)
    setSyncSuccess(null)

    try {
      const selectedComparisons = comparisons.filter(c => selectedTemplateIds.has(c.templateId))

      const syncItems: TemplateSyncItem[] = selectedComparisons.map(c => ({
        templateId: c.templateId,
        name: c.name,
        sourceVersion: c.source?.version || 1,
        targetVersion: c.target?.version,
        mode,
        status: 'pending' as const
      }))

      const result = await syncMultiple(syncItems, sourceInstance, targetInstance, options)

      const successCount = result.results?.filter(r => r.success).length || 0
      const failedCount = result.results?.filter(r => !r.success).length || 0

      if (successCount > 0) {
        setSyncSuccess(`Bulk sync completed: ${successCount} successful, ${failedCount} failed`)

        // Clear selection - modal stays open for user to review and manually close
        setSelectedTemplateIds(new Set())
      } else {
        setSyncError(
          createEnhancedError(new Error('All templates failed to sync'), {
            operation: 'Bulk Sync Templates'
          })
        )
      }
    } catch (err) {
      console.error('Bulk sync failed with error:', err)
      // If it's already an EnhancedError, use it; otherwise create one
      const enhancedError =
        err && typeof err === 'object' && 'category' in err
          ? (err as EnhancedError)
          : createEnhancedError(err, {
              operation: 'Bulk Sync Templates'
            })
      setSyncError(enhancedError)

      setTimeout(() => {
        setShowProgressModal(false)
      }, 3000)
    }
  }

  if (instancesLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-96">
        <Loader2 className="gba:h-8 gba:w-8 gba:animate-spin gba:text-muted-foreground" />
      </div>
    )
  }

  if (instancesError) {
    return (
      <Card className="gba:border-destructive">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-destructive">
            <AlertCircle className="gba:h-5 gba:w-5" />
            <span>Failed to load instances: {instancesError}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (instances.length < 2) {
    const currentInstance = instances.find(i => i.id === 'instance:flow:current-platform')
    const hasCatalogError = instancesError || instances.length === 1

    return (
      <Card className="gba:border-warning">
        <CardContent className="gba:p-6">
          <div className="gba:space-y-4">
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-warning">
              <AlertCircle className="gba:h-5 gba:w-5" />
              <span className="gba:font-semibold">At least 2 instances are required for comparison</span>
            </div>

            <div className="gba:text-sm gba:text-muted-foreground gba:space-y-3">
              <p>
                Currently available: <span className="gba:font-semibold">{instances.length} instance(s)</span>
              </p>

              {currentInstance && (
                <div className="gba:bg-success-secondary gba:p-3 gba:rounded">
                  <p className="gba:text-success-secondary-foreground">
                    Current platform detected: <strong>{currentInstance.name}</strong>
                  </p>
                  <p className="gba:text-xs gba:mt-1">{currentInstance.baseUrl}</p>
                </div>
              )}

              {hasCatalogError && (
                <div className="gba:bg-destructive-secondary gba:p-3 gba:rounded">
                  <p className="gba:text-destructive-secondary-foreground">
                    External instances not loaded from catalog
                  </p>
                  <p className="gba:text-xs gba:mt-1">Check browser console for GraphQL errors</p>
                </div>
              )}

              <div className="gba:border-t gba:pt-3">
                <p className="gba:font-semibold gba:mb-2">To add more instances:</p>
                <ul className="gba:list-disc gba:list-inside gba:space-y-1">
                  <li>
                    Open <strong>Catalog Manager</strong>
                  </li>
                  <li>
                    Find catalog: <strong>FlowEngineInstances (v1)</strong>
                  </li>
                  <li>Add entries for STAGING, PROD, or other environments</li>
                  <li>Each entry needs: code, displayOrder, objectValue (baseUrl, apiKey, environment, color, icon)</li>
                  <li>
                    See <strong>CATALOG_SETUP.md</strong> for detailed instructions
                  </li>
                </ul>
              </div>

              <div className="gba:border-t gba:pt-3">
                <p className="gba:text-xs gba:text-muted-foreground">
                  💡 <strong>Note</strong>: The current platform instance is automatically detected from
                  NEXT_PUBLIC_BASE_URL + "/flow-engine". No environment variables needed!
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div className="gba:space-y-6">
        {/* Instance Selection */}
        <Card>
          <CardHeader>
            <div className="gba:flex gba:items-center gba:justify-between">
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <span>Instance Selection</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="gba:max-w-sm">
                    <p className="gba:font-semibold gba:mb-1">How to use:</p>
                    <p className="gba:text-sm">
                      Select a <strong>source instance</strong> (where templates will be copied from) and a{' '}
                      <strong>target instance</strong> (where templates will be synced to). Health status is checked
                      automatically every 60 seconds.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              {sourceInstance && targetInstance && (
                <p className="gba:text-sm gba:text-muted-foreground">
                  <strong>{sourceInstance.name}</strong> → <strong>{targetInstance.name}</strong>
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent className="gba:space-y-6">
            <div className="gba:flex gba:flex-col gba:md:flex-row gba:gap-6 gba:items-start gba:md:items-center">
              {/* Source Instance */}
              <div className="gba:flex-1 gba:space-y-3 gba:w-full">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <div className="gba:h-2 gba:w-2 gba:rounded-full gba:bg-primary"></div>
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">Source</span>
                </div>
                <InstanceSelector
                  value={sourceInstanceId}
                  onChange={setSourceInstanceId}
                  instances={instances}
                  label="Source Instance"
                  placeholder="Select source..."
                />
                {sourceInstance && (
                  <InstanceHealthIndicator instance={sourceInstance} accessToken={context.accessToken} />
                )}
              </div>

              {/* Swap Button */}
              <div className="gba:flex gba:items-center gba:justify-center gba:pt-0 gba:md:pt-6">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleSwapInstances}
                      disabled={!sourceInstanceId || !targetInstanceId || comparing}
                      data-testid="swap-instances-button"
                      className="gba:h-10 gba:w-10 gba:rotate-90 gba:md:rotate-0"
                    >
                      <ArrowLeftRight className="gba:h-4 gba:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Swap source and target instances</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Target Instance */}
              <div className="gba:flex-1 gba:space-y-3 gba:w-full">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <div className="gba:h-2 gba:w-2 gba:rounded-full gba:bg-success"></div>
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">Target</span>
                </div>
                <InstanceSelector
                  value={targetInstanceId}
                  onChange={setTargetInstanceId}
                  instances={instances}
                  label="Target Instance"
                  placeholder="Select target..."
                />
                {targetInstance && (
                  <InstanceHealthIndicator instance={targetInstance} accessToken={context.accessToken} />
                )}
              </div>
            </div>

            {/* Compare and Import Buttons */}
            <div className="gba:flex gba:justify-between gba:gap-2 gba:pt-2">
              <div className="gba:flex gba:gap-2">
                <TemplateExportImport
                  instances={instances}
                  accessToken={context.accessToken}
                  onImportSuccess={() => {
                    // Refresh comparison after import
                    if (sourceInstanceId && targetInstanceId) {
                      setTimeout(() => handleCompare(), 1000)
                    }
                  }}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeletedTemplatesModal(true)}
                      disabled={!sourceInstanceId && !targetInstanceId}
                      data-testid="view-deleted-templates-button"
                    >
                      <Trash2 className="gba:h-4 gba:w-4 gba:mr-2" />
                      Deleted Templates
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View and restore deleted templates</TooltipContent>
                </Tooltip>
              </div>
              <Button onClick={handleCompare} disabled={!sourceInstanceId || !targetInstanceId || comparing} size="lg">
                {comparing ? (
                  <>
                    <Loader2 className="gba:mr-2 gba:h-4 gba:w-4 gba:animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Compare Templates
                    <ArrowRight className="gba:ml-2 gba:h-4 gba:w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Error */}
        {comparisonError && (
          <EnhancedErrorAlert
            error={
              typeof comparisonError === 'string'
                ? createEnhancedError(new Error(comparisonError), { operation: 'Template Comparison' })
                : comparisonError
            }
            onDismiss={() => {
              // Comparison error is managed by the hook, cannot dismiss
            }}
          />
        )}

        {/* Sync Error */}
        {syncError && <EnhancedErrorAlert error={syncError} onDismiss={() => setSyncError(null)} />}

        {syncSuccess && (
          <Alert variant="default" className="gba:bg-success gba:text-white gba:border-success">
            <Check className="gba:h-4 gba:w-4 gba:text-white" />
            <AlertDescription className="gba:text-white">
              <strong>Success:</strong> {syncSuccess}
            </AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {comparisons.length > 0 && (
          <div className="gba:relative">
            {/* Loading Overlay */}
            {comparing && (
              <div className="gba:absolute gba:inset-0 gba:z-50 gba:flex gba:items-center gba:justify-center gba:bg-background/50 gba:backdrop-blur-sm gba:rounded-lg">
                <div className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:bg-card gba:p-6 gba:rounded-lg gba:shadow-lg gba:border">
                  <Loader2 className="gba:h-8 gba:w-8 gba:animate-spin gba:text-primary" />
                  <p className="gba:text-sm gba:font-medium">Refreshing comparison...</p>
                </div>
              </div>
            )}

            {/* Content */}
            <div className={comparing ? 'gba:pointer-events-none' : ''}>
              <TemplateSummaryCard summary={getSummary()} />

              {/* Bulk Selection Controls */}
              <BulkSelectionControls
                selectedCount={selectedTemplateIds.size}
                totalCount={
                  comparisons.filter(
                    c => c.status !== 'IDENTICAL' && c.status !== 'NEW_IN_TARGET' && c.status !== 'TARGET_AHEAD'
                  ).length
                }
                onSelectAll={handleSelectAll}
                onClearSelection={handleClearSelection}
                onBulkSync={handleBulkSyncClick}
                disabled={comparing}
              />

              <TemplateComparisonTable
                comparisons={comparisons}
                onSyncClick={handleSyncClick}
                onDiffClick={handleDiffClick}
                onExportClick={handleExport}
                onDeleteClick={handleDeleteClick}
                selectedTemplateIds={selectedTemplateIds}
                onSelectionChange={handleSelectionChange}
                bulkMode={true}
                accessToken={context.accessToken}
              />
            </div>
          </div>
        )}

        {/* Single Template Sync Dialog */}
        {selectedComparison && (
          <SyncConfigDialog
            isOpen={showSyncDialog}
            onClose={() => setShowSyncDialog(false)}
            comparison={selectedComparison}
            onSync={handleSync}
          />
        )}

        {/* Bulk Sync Dialog */}
        <BulkSyncDialog
          isOpen={showBulkSyncDialog}
          onClose={() => setShowBulkSyncDialog(false)}
          selectedComparisons={comparisons.filter(c => selectedTemplateIds.has(c.templateId))}
          onSync={handleBulkSync}
        />

        {/* Progress Modal (used for both single and bulk sync) */}
        {currentSync && currentSync.templates.length === 1 ? (
          <SyncProgressModal
            isOpen={showProgressModal}
            onClose={() => setShowProgressModal(false)}
            syncOperation={currentSync}
          />
        ) : (
          <BulkSyncProgress
            isOpen={showProgressModal}
            onClose={() => {
              setShowProgressModal(false)
              // Refresh comparison when user closes the modal
              if (currentSync?.status === 'completed') {
                setTimeout(() => {
                  handleCompare()
                }, 500)
              }
            }}
            syncOperation={currentSync}
            onRefreshComparison={() => {
              handleCompare()
            }}
          />
        )}

        {/* Diff Viewer Modal */}
        {diffComparison && (
          <DiffViewerModal
            isOpen={showDiffModal}
            onClose={() => {
              setShowDiffModal(false)
              setDiffComparison(null)
              setDiffSourceTemplate(null)
              setDiffTargetTemplate(null)
            }}
            comparison={diffComparison}
            sourceTemplate={diffSourceTemplate}
            targetTemplate={diffTargetTemplate}
          />
        )}

        {/* Delete Confirmation Dialog */}
        {deleteComparison && sourceInstance && targetInstance && (
          <TemplateDeleteDialog
            isOpen={showDeleteDialog}
            onClose={() => {
              setShowDeleteDialog(false)
              setDeleteComparison(null)
            }}
            comparison={deleteComparison}
            sourceInstance={sourceInstance}
            targetInstance={targetInstance}
            onDelete={handleDelete}
          />
        )}

        {/* Deleted Templates Modal */}
        <DeletedTemplatesModal
          isOpen={showDeletedTemplatesModal}
          onClose={() => setShowDeletedTemplatesModal(false)}
          instances={instances}
          sourceInstanceId={sourceInstanceId}
          targetInstanceId={targetInstanceId}
          accessToken={context.accessToken}
          userId={context.userInfo?.employeeDetails?.employeeId || 'system'}
          onTemplateRestored={handleCompare}
        />
      </div>
    </TooltipProvider>
  )
}
