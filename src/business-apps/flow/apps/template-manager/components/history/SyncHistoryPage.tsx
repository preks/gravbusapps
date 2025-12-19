/**
 * SyncHistoryPage Component
 * Page for viewing and managing sync history
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTemplateSync } from '../../hooks/useTemplateSync'
import { useFlowInstances } from '../../hooks/useFlowInstances'
import { SyncHistoryTable } from './SyncHistoryTable'
import { SyncHistoryDetailsModal } from './SyncHistoryDetailsModal'
import { EnhancedErrorAlert } from '../error/EnhancedErrorAlert'
import { SyncOperation, TemplateSyncItem } from '../../types/sync'
import { EnhancedError } from '../../types/error'
import { createEnhancedError } from '../../utils/errorHandler'
import { FileText, CheckCircle2 } from 'lucide-react'

export const SyncHistoryPage: React.FC<{ context: BusinessAppContextProps }> = ({ context }) => {
  const { syncHistory, syncMultiple } = useTemplateSync(context.accessToken)
  const { instances } = useFlowInstances(context.accessToken)

  const [selectedSync, setSelectedSync] = useState<SyncOperation | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [retryError, setRetryError] = useState<EnhancedError | null>(null)
  const [retrySuccess, setRetrySuccess] = useState<string | null>(null)

  const handleViewDetails = (sync: SyncOperation) => {
    setSelectedSync(sync)
    setShowDetailsModal(true)
  }

  const handleRetrySync = async (sync: SyncOperation) => {
    setRetryError(null)
    setRetrySuccess(null)

    // Find instances (they might not exist anymore)
    const sourceInstance = instances.find(i => i.id === sync.sourceInstance.id)
    const targetInstance = instances.find(i => i.id === sync.targetInstance.id)

    if (!sourceInstance || !targetInstance) {
      setRetryError(
        createEnhancedError(new Error('Source or target instance is no longer available'), {
          operation: 'Retry Failed Sync',
          instanceName: !sourceInstance ? sync.sourceInstance.name : sync.targetInstance.name
        })
      )
      return
    }

    // Get only failed templates
    const failedTemplates: TemplateSyncItem[] = sync.templates
      .filter(t => t.status === 'failed')
      .map(t => ({
        templateId: t.templateId,
        name: t.name,
        sourceVersion: t.sourceVersion,
        targetVersion: t.targetVersion,
        mode: t.mode,
        status: 'pending'
      }))

    if (failedTemplates.length === 0) {
      setRetryError(
        createEnhancedError(new Error('No failed templates to retry'), {
          operation: 'Retry Failed Sync'
        })
      )
      return
    }

    try {
      await syncMultiple(failedTemplates, sourceInstance, targetInstance, sync.options)
      setRetrySuccess(`Successfully retried ${failedTemplates.length} templates!`)
    } catch (err) {
      console.error('Retry failed:', err)
      // If it's already an EnhancedError, use it; otherwise create one
      const enhancedError =
        err && typeof err === 'object' && 'category' in err
          ? (err as EnhancedError)
          : createEnhancedError(err, {
              operation: 'Retry Failed Sync'
            })
      setRetryError(enhancedError)
    }
  }

  const handleExportJSON = (sync: SyncOperation) => {
    const dataStr = JSON.stringify(sync, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sync-${sync.id}-${new Date(sync.timestamp).getTime()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = (sync: SyncOperation) => {
    const headers = [
      'Template ID',
      'Template Name',
      'Source Version',
      'Target Version',
      'Mode',
      'Status',
      'Action',
      'New Version',
      'Duration (ms)',
      'Message',
      'Error'
    ]

    const rows = sync.templates.map(template => {
      const result = sync.results?.find(r => r.templateId === template.templateId)
      return [
        template.templateId,
        template.name,
        template.sourceVersion,
        template.targetVersion || 'N/A',
        template.mode,
        template.status,
        result?.action || 'N/A',
        result?.newVersion || 'N/A',
        result?.duration || 'N/A',
        result?.message || '',
        template.error || ''
      ]
    })

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const dataBlob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sync-${sync.id}-${new Date(sync.timestamp).getTime()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="gba:space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <FileText className="gba:h-5 gba:w-5" />
            Sync History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="gba:text-sm gba:text-muted-foreground">
            View and manage past template synchronization operations. You can review detailed results, retry failed
            syncs, and export reports for audit purposes.
          </p>
        </CardContent>
      </Card>

      {/* Alerts */}
      {retryError && <EnhancedErrorAlert error={retryError} onDismiss={() => setRetryError(null)} />}

      {retrySuccess && (
        <Card className="gba:border-success gba:bg-success-secondary">
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-success-secondary-foreground">
              <CheckCircle2 className="gba:h-6 gba:w-6" />
              <div>
                <div className="gba:font-semibold">Success!</div>
                <div className="gba:text-sm">{retrySuccess}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Table */}
      <Card>
        <CardContent className="gba:p-6">
          <SyncHistoryTable
            syncHistory={syncHistory}
            onViewDetails={handleViewDetails}
            onRetrySync={handleRetrySync}
            onExportJSON={handleExportJSON}
            onExportCSV={handleExportCSV}
          />
        </CardContent>
      </Card>

      {/* Details Modal */}
      <SyncHistoryDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedSync(null)
        }}
        syncOperation={selectedSync}
      />
    </div>
  )
}
