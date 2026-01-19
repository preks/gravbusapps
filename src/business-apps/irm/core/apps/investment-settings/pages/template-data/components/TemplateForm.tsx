import React, { useState, useEffect } from 'react'
import { Button, Input, Label, Alert, Spinner, Switch, Textarea } from '@newwork/nw-design-system'
import { FloppyDiskIcon, XIcon } from '@phosphor-icons/react'
import { HtmlEditor, TemplateVariable } from '@/components/html-editor'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentTemplate, DocumentTemplateFormData } from '../types'

interface TemplateFormProps extends BusinessAppContextProps {
  template?: DocumentTemplate
  onSave: (data: DocumentTemplateFormData) => Promise<void>
  onCancel: () => void
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'template-form'

// Define available template variables for investments
const investmentVariables: TemplateVariable[] = [
  {
    key: 'investmentName',
    label: 'Investment Name',
    description: 'Name of the investment',
    example: 'Tech Startup Fund'
  },
  { key: 'investmentType', label: 'Investment Type', description: 'Type/category of investment', example: 'Equity' },
  { key: 'investmentGroup', label: 'Investment Group', description: 'Group classification', example: 'Private Equity' },
  { key: 'amount', label: 'Amount', description: 'Investment amount', example: '$1,000,000' },
  { key: 'currency', label: 'Currency', description: 'Currency code', example: 'USD' },
  { key: 'date', label: 'Investment Date', description: 'Date of investment', example: '2024-01-15' },
  { key: 'investor', label: 'Investor', description: 'Investor name', example: 'John Doe' },
  { key: 'status', label: 'Status', description: 'Investment status', example: 'Active' },
  { key: 'roi', label: 'ROI', description: 'Return on investment percentage', example: '15.5%' },
  { key: 'maturityDate', label: 'Maturity Date', description: 'Investment maturity date', example: '2029-01-15' }
]

export const TemplateForm: React.FC<TemplateFormProps> = ({
  template,
  onSave,
  onCancel,
  prefixDataTestId = DATA_TEST_ID
}) => {
  const [formData, setFormData] = useState<DocumentTemplateFormData>({
    code: template?.code || '',
    value: template?.value || '',
    description: template?.description || '',
    htmlContent: template?.htmlContent || '',
    isActive: template?.isActive ?? true,
    displayOrder: template?.displayOrder || 0,
    alternativeCode: template?.alternativeCode || ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (template) {
      setFormData({
        code: template.code,
        value: template.value,
        description: template.description || '',
        htmlContent: template.htmlContent,
        isActive: template.isActive,
        displayOrder: template.displayOrder || 0,
        alternativeCode: template.alternativeCode || ''
      })
    }
  }, [template])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.code.trim()) {
      setError('Code is required')
      return
    }

    if (!formData.value.trim()) {
      setError('Name is required')
      return
    }

    if (!formData.htmlContent.trim()) {
      setError('HTML Template is required')
      return
    }

    const trimmedData: DocumentTemplateFormData = {
      ...formData,
      code: formData.code.trim(),
      value: formData.value.trim(),
      htmlContent: formData.htmlContent.trim(),
      description: formData.description?.trim() || '',
      alternativeCode: formData.alternativeCode?.trim() || ''
    }

    setIsSaving(true)
    try {
      await onSave(trimmedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="gba:space-y-6" data-testid={prefixDataTestId}>
      {error && (
        <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
          {error}
        </Alert>
      )}

      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <div className="gba:space-y-2">
          <Label htmlFor="code">
            Code <span className="gba:text-destructive">*</span>
          </Label>
          <Input
            id="code"
            data-testid={`${prefixDataTestId}-code-input`}
            value={formData.code}
            onChange={e => setFormData({ ...formData, code: e.target.value })}
            placeholder="TEMPLATE_001"
            disabled={isSaving || !!template}
          />
        </div>

        <div className="gba:space-y-2">
          <Label htmlFor="value">
            Name <span className="gba:text-destructive">*</span>
          </Label>
          <Input
            id="value"
            data-testid={`${prefixDataTestId}-value-input`}
            value={formData.value}
            onChange={e => setFormData({ ...formData, value: e.target.value })}
            placeholder="Investment Summary Template"
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <div className="gba:space-y-2">
          <Label htmlFor="alternativeCode">Alternative Code</Label>
          <Input
            id="alternativeCode"
            data-testid={`${prefixDataTestId}-alternative-code-input`}
            value={formData.alternativeCode}
            onChange={e => setFormData({ ...formData, alternativeCode: e.target.value })}
            placeholder="ALT_CODE"
            disabled={isSaving}
          />
        </div>

        <div className="gba:space-y-2">
          <Label htmlFor="displayOrder">Display Order</Label>
          <Input
            id="displayOrder"
            type="number"
            data-testid={`${prefixDataTestId}-display-order-input`}
            value={formData.displayOrder}
            onChange={e => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
            placeholder="0"
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="gba:space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          data-testid={`${prefixDataTestId}-description-input`}
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter template description..."
          disabled={isSaving}
          rows={3}
        />
      </div>

      <div className="gba:flex gba:items-center gba:gap-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={checked => setFormData({ ...formData, isActive: checked })}
          disabled={isSaving}
          data-testid={`${prefixDataTestId}-active-switch`}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <div className="gba:space-y-2">
        <Label htmlFor="htmlContent">
          HTML Template <span className="gba:text-destructive">*</span>
        </Label>
        <HtmlEditor
          value={formData.htmlContent}
          onChange={htmlContent => setFormData({ ...formData, htmlContent })}
          disabled={isSaving}
          showVariableHelper
          availableVariables={investmentVariables}
          minHeight="500px"
          maxHeight="1000px"
          placeholder="Create your document template using drag-and-drop elements..."
          prefixDataTestId={`${prefixDataTestId}-html-editor`}
        />
      </div>

      <div className="gba:flex gba:gap-2 gba:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
          data-testid={`${prefixDataTestId}-cancel-button`}
        >
          <XIcon />
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving} data-testid={`${prefixDataTestId}-save-button`}>
          {isSaving ? <Spinner size="sm" /> : <FloppyDiskIcon />}
          {isSaving ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </form>
  )
}

export default TemplateForm
