import React, { useState } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFlowTemplateStore } from '../../hooks/useFlowTemplateStore'
import { Button, Alert, Spin } from 'antd'
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons'

/**
 * Component for previewing and generating Conductor workflow definitions
 */
export const ConductorPreviewSection: React.FC = () => {
  const { flowTemplate } = useFlowTemplateStore()
  const [conductorFlow, setConductorFlow] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const generateConductorFlow = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:3000/api/templates/generate-conductor-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(flowTemplate)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Backend API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      setConductorFlow(result.data)
      setIsExpanded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate Conductor flow from backend')
    } finally {
      setIsLoading(false)
    }
  }

  const downloadConductorFlow = () => {
    if (!conductorFlow) return

    const dataStr = JSON.stringify(conductorFlow, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

    const exportFileDefaultName = `${flowTemplate.title || 'flow'}_conductor_workflow.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const copyConductorFlow = () => {
    if (!conductorFlow) return

    navigator.clipboard.writeText(JSON.stringify(conductorFlow, null, 2))
    // TODO: Add toast notification for copy success
  }

  return (
    <div className="gba:space-y-6" data-testid="conductor-preview-section">
      <div>
        <h3 className="gba:text-lg gba:font-medium gba:mb-4" data-testid="conductor-preview-title">
          {getTranslationFromI18nKeyAndLabel('flow.creator.conductorPreview', 'Netflix Conductor Preview')}
        </h3>

        <div className="gba:space-y-4">
          <p className="gba:text-sm gba:text-gray-600" data-testid="conductor-preview-description">
            {getTranslationFromI18nKeyAndLabel(
              'flow.creator.conductorPreviewDescription',
              'Generate a Netflix Conductor flow definition from your flow template for debugging and verification. Requires backend server running on localhost:3000.'
            )}
          </p>

          <div className="gba:flex gba:gap-3" data-testid="conductor-preview-actions">
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={generateConductorFlow}
              loading={isLoading}
              data-testid="generate-conductor-flow-button"
            >
              {getTranslationFromI18nKeyAndLabel('flow.creator.generateConductorFlow', 'Generate Conductor Flow')}
            </Button>

            {conductorFlow && (
              <Button
                icon={<DownloadOutlined />}
                onClick={downloadConductorFlow}
                data-testid="download-conductor-flow-button"
              >
                {getTranslationFromI18nKeyAndLabel('flow.creator.downloadConductorFlow', 'Download JSON')}
              </Button>
            )}
          </div>

          {error && (
            <Alert
              message={getTranslationFromI18nKeyAndLabel(
                'flow.creator.conductorGenerationError',
                'Error generating Conductor flow'
              )}
              description={error}
              type="error"
              showIcon
              data-testid="conductor-preview-error"
            />
          )}
        </div>
      </div>

      {conductorFlow && (
        <div className="gba:border gba:border-gray-200 gba:rounded" data-testid="conductor-flow-preview">
          <div
            className="gba:flex gba:justify-between gba:items-center gba:p-4 gba:bg-gray-50 gba:border-b gba:border-gray-200 gba:cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid="conductor-flow-preview-header"
          >
            <h4 className="gba:font-medium" data-testid="conductor-flow-preview-title">
              {getTranslationFromI18nKeyAndLabel('flow.creator.conductorFlowDefinition', 'Conductor Flow Definition')}
            </h4>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Button
                size="small"
                onClick={e => {
                  e.stopPropagation()
                  copyConductorFlow()
                }}
                data-testid="copy-conductor-flow-button"
              >
                {getTranslationFromI18nKeyAndLabel('flow.creator.copyToClipboard', 'Copy')}
              </Button>
              <span className="gba:text-sm gba:text-gray-500">{isExpanded ? '▼' : '▶'}</span>
            </div>
          </div>

          {isExpanded && (
            <div className="gba:p-4" data-testid="conductor-flow-preview-content">
              <div className="gba:bg-gray-900 gba:text-gray-100 gba:p-4 gba:rounded gba:overflow-auto gba:max-h-96">
                <pre className="gba:text-sm gba:whitespace-pre-wrap gba:font-mono">
                  {JSON.stringify(conductorFlow, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
