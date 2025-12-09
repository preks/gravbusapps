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
import { TemplateComparison } from '../../types/comparison'
import { SyncMode, SyncOptions, TemplateSyncItem } from '../../types/sync'
import { FlowTemplate } from '@/business-apps/flow/apps/creator/types/template'
import { templateApi } from '../../services/templateApi'
import { Loader2, AlertCircle, ArrowRight, HelpCircle, Check } from 'lucide-react'

export const ComparisonDashboard: React.FC<{ context: BusinessAppContextProps }> = ({ context }) => {
  const [sourceInstanceId, setSourceInstanceId] = useState<string>('')
  const [targetInstanceId, setTargetInstanceId] = useState<string>('')
  const [selectedComparison, setSelectedComparison] = useState<TemplateComparison | null>(null)
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null)

  // Bulk sync state
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set())
  const [showBulkSyncDialog, setShowBulkSyncDialog] = useState(false)

  // Diff viewer state
  const [showDiffModal, setShowDiffModal] = useState(false)
  const [diffComparison, setDiffComparison] = useState<TemplateComparison | null>(null)
  const [diffSourceTemplate, setDiffSourceTemplate] = useState<FlowTemplate | null>(null)
  const [diffTargetTemplate, setDiffTargetTemplate] = useState<FlowTemplate | null>(null)

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

  const handleSyncClick = (comparison: TemplateComparison) => {
    setSelectedComparison(comparison)
    setShowSyncDialog(true)
  }

  const handleDiffClick = async (comparison: TemplateComparison) => {
    if (!sourceInstance || !targetInstance) {
      setSyncError('Source and target instances must be selected to view diff.')
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
      setSyncError(err instanceof Error ? err.message : 'Failed to fetch templates for diff')
      setShowDiffModal(false)
    }
  }

  const handleSync = async (mode: SyncMode, options: SyncOptions) => {
    if (!selectedComparison || !sourceInstance || !targetInstance) {
      setSyncError('Missing required selection. Please ensure source, target, and template are selected.')
      return
    }

    setShowSyncDialog(false)
    setShowProgressModal(true)
    setSyncError(null)
    setSyncSuccess(null)

    try {
      console.log('Starting sync:', {
        template: selectedComparison.name,
        source: sourceInstance.name,
        target: targetInstance.name,
        mode,
        options
      })

      const result = await syncTemplate(selectedComparison.templateId, sourceInstance, targetInstance, mode, options)

      console.log('Sync result:', result)

      if (result.success) {
        console.log('✅ Sync successful!')
        setSyncSuccess(`Template "${selectedComparison.name}" synced successfully to ${targetInstance.name}!`)

        // Close single sync modal automatically after showing success
        setTimeout(() => {
          setShowProgressModal(false)
        }, 2000)
      } else {
        console.log('❌ Sync failed:', result.error || result.message)
        setSyncError(result.error || result.message || 'Sync failed for unknown reason')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync operation failed'
      console.error('Sync failed with error:', err)
      setSyncError(errorMessage)

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
      setSyncError('Missing required selection for bulk sync.')
      return
    }

    setShowBulkSyncDialog(false)
    setShowProgressModal(true)
    setSyncError(null)
    setSyncSuccess(null)

    try {
      const selectedComparisons = comparisons.filter(c => selectedTemplateIds.has(c.templateId))

      console.log('Starting bulk sync:', {
        count: selectedComparisons.length,
        source: sourceInstance.name,
        target: targetInstance.name,
        mode,
        options
      })

      const syncItems: TemplateSyncItem[] = selectedComparisons.map(c => ({
        templateId: c.templateId,
        name: c.name,
        sourceVersion: c.source?.version || 1,
        targetVersion: c.target?.version,
        mode,
        status: 'pending' as const
      }))

      const result = await syncMultiple(syncItems, sourceInstance, targetInstance, options)

      console.log('Bulk sync completed:', result)

      const successCount = result.results?.filter(r => r.success).length || 0
      const failedCount = result.results?.filter(r => !r.success).length || 0

      if (successCount > 0) {
        setSyncSuccess(`Bulk sync completed: ${successCount} successful, ${failedCount} failed`)

        // Clear selection - modal stays open for user to review and manually close
        setSelectedTemplateIds(new Set())
      } else {
        setSyncError('All templates failed to sync. Check individual errors for details.')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bulk sync operation failed'
      console.error('Bulk sync failed with error:', err)
      setSyncError(errorMessage)

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
                    ✅ Current platform detected: <strong>{currentInstance.name}</strong>
                  </p>
                  <p className="gba:text-xs gba:mt-1">{currentInstance.baseUrl}</p>
                </div>
              )}

              {hasCatalogError && (
                <div className="gba:bg-destructive-secondary gba:p-3 gba:rounded">
                  <p className="gba:text-destructive-secondary-foreground">
                    ❌ External instances not loaded from catalog
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
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
              {/* Source Instance */}
              <div className="gba:space-y-3">
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

              {/* Target Instance */}
              <div className="gba:space-y-3">
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

            {/* Compare Button */}
            <div className="gba:flex gba:justify-end gba:pt-2">
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
        {/* Error Messages */}
        {comparisonError && (
          <Alert variant="destructive">
            <AlertCircle className="gba:h-4 gba:w-4" />
            <AlertDescription>
              <strong>Comparison Error:</strong> {comparisonError}
            </AlertDescription>
          </Alert>
        )}

        {syncError && (
          <Alert variant="destructive">
            <AlertCircle className="gba:h-4 gba:w-4" />
            <AlertDescription>
              <strong>Sync Error:</strong> {syncError}
            </AlertDescription>
          </Alert>
        )}

        {syncSuccess && (
          <Alert variant="default" className="gba:border-success gba:bg-success-secondary">
            <Check className="gba:h-4 gba:w-4 gba:text-success" />
            <AlertDescription className="gba:text-success-secondary-foreground">
              <strong>Success:</strong> {syncSuccess}
            </AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {comparisons.length > 0 && (
          <>
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
              selectedTemplateIds={selectedTemplateIds}
              onSelectionChange={handleSelectionChange}
              bulkMode={true}
            />
          </>
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
                  console.log('🔄 Refreshing comparison after modal close...')
                  handleCompare()
                }, 500)
              }
            }}
            syncOperation={currentSync}
            onRefreshComparison={() => {
              console.log('🔄 Manual refresh comparison...')
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
      </div>
    </TooltipProvider>
  )
}
