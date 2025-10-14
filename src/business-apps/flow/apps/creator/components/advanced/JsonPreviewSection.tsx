import React, { useState } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFlowTemplateStore } from '../../hooks/useFlowTemplateStore'
import { ConductorPreviewSection } from './ConductorPreviewSection'
import { Button } from '@newwork/nw-design-system'
import { Copy, Download, Eye, EyeOff } from 'lucide-react'

/**
 * Advanced section for viewing the flow template JSON definition
 */
export const JsonPreviewSection: React.FC = () => {
  const { flowTemplate } = useFlowTemplateStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  // Format JSON with proper indentation
  const formattedJson = JSON.stringify(flowTemplate, null, 2)

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedJson)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  // Download as JSON file
  const handleDownload = () => {
    const blob = new Blob([formattedJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${flowTemplate.name || 'flow-template'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="gba:space-y-8" data-testid="json-preview-section">
      {/* Conductor Preview Section */}
      <ConductorPreviewSection />

      {/* JSON Preview Section */}
      <div className="gba:space-y-6">
        <div className="gba:flex gba:items-center gba:justify-between" data-testid="json-preview-header">
          <h2 className="gba:text-xl gba:font-semibold" data-testid="json-preview-title">
            {getTranslationFromI18nKeyAndLabel('flow.creator.jsonPreview', 'Flow Template JSON')}
          </h2>

          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gba:flex gba:items-center gba:gap-2"
              data-testid="json-preview-toggle"
            >
              {isExpanded ? <EyeOff className="gba:h-4 gba:w-4" /> : <Eye className="gba:h-4 gba:w-4" />}
              {isExpanded
                ? getTranslationFromI18nKeyAndLabel('flow.creator.collapse', 'Collapse')
                : getTranslationFromI18nKeyAndLabel('flow.creator.expand', 'Expand')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gba:flex gba:items-center gba:gap-2"
              data-testid="json-preview-copy"
            >
              <Copy className="gba:h-4 gba:w-4" />
              {copySuccess
                ? getTranslationFromI18nKeyAndLabel('flow.creator.copied', 'Copied!')
                : getTranslationFromI18nKeyAndLabel('flow.creator.copy', 'Copy')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gba:flex gba:items-center gba:gap-2"
              data-testid="json-preview-download"
            >
              <Download className="gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('flow.creator.download', 'Download')}
            </Button>
          </div>
        </div>

        <div className="gba:space-y-4">
          <p className="gba:text-sm gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel(
              'flow.creator.jsonPreviewDescription',
              'This is the raw JSON definition of your flow template. You can copy or download it for backup, sharing, or importing into other systems.'
            )}
          </p>

          {/* JSON Preview */}
          <div
            className="gba:border gba:border-gray-200 gba:rounded gba:overflow-hidden"
            data-testid="json-preview-container"
          >
            <div className="gba:bg-gray-50 gba:px-4 gba:py-2 gba:border-b gba:border-gray-200">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('flow.creator.flowDefinition', 'Flow Template Definition')}
              </span>
            </div>

            <div className={`gba:relative ${isExpanded ? '' : 'gba:max-h-[300px] gba:overflow-hidden'}`}>
              <pre
                className={`gba:p-4 gba:text-sm gba:bg-gray-900 gba:text-green-400 gba:font-mono gba:leading-relaxed gba:whitespace-pre-wrap gba:break-words ${
                  isExpanded ? 'gba:max-h-[500px] gba:overflow-auto' : 'gba:overflow-hidden'
                }`}
                data-testid="json-preview-content"
              >
                {formattedJson}
              </pre>
              {!isExpanded && (
                <div className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:h-8 gba:bg-gradient-to-t gba:from-gray-900 gba:to-transparent gba:pointer-events-none" />
              )}
            </div>
          </div>

          {/* Template Statistics */}
          <div
            className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4 gba:pt-4 gba:border-t gba:border-gray-200"
            data-testid="json-preview-stats"
          >
            <div className="gba:text-center gba:p-3 gba:bg-blue-50 gba:rounded">
              <div className="gba:text-2xl gba:font-bold gba:text-blue-600">{flowTemplate.steps.length}</div>
              <div className="gba:text-sm gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('flow.creator.steps', 'Steps')}
              </div>
            </div>

            <div className="gba:text-center gba:p-3 gba:bg-green-50 gba:rounded">
              <div className="gba:text-2xl gba:font-bold gba:text-green-600">
                {flowTemplate.steps.reduce((sum, step) => sum + (step.inputs?.length || 0), 0)}
              </div>
              <div className="gba:text-sm gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('flow.creator.inputFields', 'Input Fields')}
              </div>
            </div>

            <div className="gba:text-center gba:p-3 gba:bg-purple-50 gba:rounded">
              <div className="gba:text-2xl gba:font-bold gba:text-purple-600">
                {flowTemplate.steps.reduce((sum, step) => sum + (step.links?.length || 0), 0)}
              </div>
              <div className="gba:text-sm gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('flow.creator.links', 'Links')}
              </div>
            </div>

            <div className="gba:text-center gba:p-3 gba:bg-amber-50 gba:rounded">
              <div className="gba:text-2xl gba:font-bold gba:text-amber-600 gba:capitalize">
                {flowTemplate.steps.reduce((sum, step) => sum + (step.assignment ? 1 : 0), 0)}
              </div>
              <div className="gba:text-sm gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('flow.creator.assignments', 'Assignments')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
