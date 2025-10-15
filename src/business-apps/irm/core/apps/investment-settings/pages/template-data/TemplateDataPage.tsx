import React, { useState, useEffect } from 'react'
import { Button, Alert } from '@newwork/nw-design-system'
import { ArrowLeftIcon, PlusIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { DocumentTemplate, DocumentTemplateFormData } from './types'
import { TemplateList, TemplateForm, TemplatePreviewModal } from './components'

interface TemplateDataPageProps extends BusinessAppContextProps {
  onBack?: () => void
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'template-data-page'
const CATALOG_IDENTIFIER = 'InvestmentDocumentTemplate'
const CATALOG_VERSION = 'v1'

const TemplateDataPage: React.FC<TemplateDataPageProps> = ({ accessToken, onBack, prefixDataTestId }) => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'list' | 'create' | 'edit'>('list')
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null)

  const catalogClient = useCatalogManagerClient(accessToken)

  // Load templates from catalog
  const loadTemplates = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: CATALOG_IDENTIFIER, version: CATALOG_VERSION },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: false
        }
      )

      const loadedTemplates = (response.data || []).map((entry: any) => ({
        id: entry.id,
        code: entry.code,
        value: entry.value,
        description: entry.additionalValue1 || '',
        htmlContent: entry.objectValue?.htmlContent || '',
        isActive: entry.objectValue?.isActive ?? true,
        displayOrder: entry.displayOrder || 0,
        alternativeCode: entry.alternativeCode || ''
      }))

      setTemplates(loadedTemplates)

      // If no templates exist, create mock templates
      if (loadedTemplates.length === 0) {
        console.log('No templates found. Mock templates would be created in a real scenario.')
        // In development, we could auto-create mock templates here
        // await createMockTemplates();
      }
    } catch (err) {
      // If catalog doesn't exist yet, show a helpful message
      if (err instanceof Error && err.message.includes('404')) {
        setError('Catalog "InvestmentDocumentTemplate" not found. It will be created when you add the first template.')
        setTemplates([])
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load templates')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (accessToken) {
      loadTemplates()
    }
  }, [accessToken])

  const handleSave = async (formData: DocumentTemplateFormData) => {
    setError(null)

    try {
      const catalogEntry = {
        code: formData.code,
        value: formData.value,
        alternativeCode: formData.alternativeCode || undefined,
        displayOrder: formData.displayOrder,
        additionalValue1: formData.description || '',
        objectValue: {
          htmlContent: formData.htmlContent,
          isActive: formData.isActive
        },
        translations: []
      }

      if (selectedTemplate) {
        // Update existing template
        await catalogClient.updateCatalogEntry(
          CATALOG_IDENTIFIER,
          CATALOG_VERSION,
          selectedTemplate.id,
          catalogEntry as any
        )
      } else {
        // Create new template
        await catalogClient.createCatalogEntry(CATALOG_IDENTIFIER, CATALOG_VERSION, catalogEntry)
      }

      await loadTemplates()
      setActiveView('list')
      setSelectedTemplate(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
      throw err
    }
  }

  const handleEdit = (template: DocumentTemplate) => {
    setSelectedTemplate(template)
    setActiveView('edit')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      await catalogClient.deleteCatalogEntry(CATALOG_IDENTIFIER, CATALOG_VERSION, id)
      await loadTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    }
  }

  const handleCancel = () => {
    setActiveView('list')
    setSelectedTemplate(null)
  }

  const handlePreview = (template: DocumentTemplate) => {
    setPreviewTemplate(template)
  }

  return (
    <div className="gba:p-6 gba:space-y-6" data-testid={`${prefixDataTestId}-${DATA_TEST_ID}`}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-4">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-back-button`}
            >
              <ArrowLeftIcon size={20} />
            </Button>
          )}
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:m-0">Document Templates</h1>
            <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
              Create and manage HTML templates for investment documents
            </p>
          </div>
        </div>

        {activeView === 'list' && (
          <Button
            onClick={() => setActiveView('create')}
            data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-create-button`}
          >
            <PlusIcon />
            Create Template
          </Button>
        )}
      </div>

      {error && activeView === 'list' && (
        <Alert variant="destructive" data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-error`}>
          {error}
        </Alert>
      )}

      {/* Content */}
      {activeView === 'list' && (
        <TemplateList
          templates={templates}
          isLoading={isLoading}
          error={error}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPreview={handlePreview}
          onRetry={loadTemplates}
          prefixDataTestId={`${prefixDataTestId}-${DATA_TEST_ID}-list`}
        />
      )}

      {(activeView === 'create' || activeView === 'edit') && (
        <TemplateForm
          accessToken={accessToken}
          template={selectedTemplate || undefined}
          onSave={handleSave}
          onCancel={handleCancel}
          prefixDataTestId={`${prefixDataTestId}-${DATA_TEST_ID}-form`}
        />
      )}

      {/* Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        prefixDataTestId={`${prefixDataTestId}-${DATA_TEST_ID}-preview`}
      />
    </div>
  )
}

export default TemplateDataPage
