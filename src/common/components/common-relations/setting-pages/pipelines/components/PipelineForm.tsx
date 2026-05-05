import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { TranslatableField } from '@/components/translatable-field'
import {
  buildCatalogValueTranslations,
  DEFAULT_CATALOG_LOCALE,
  DEFAULT_CATALOG_TRANSLATIONS,
  getCatalogValueTranslations,
  getDefaultCatalogValue,
  type CatalogTranslationMap
} from '../../utils/catalogTranslations'

interface PipelineFormData {
  value: string
  valueTranslations: CatalogTranslationMap
  description: string
}

interface PipelineFormProps extends BusinessAppContextProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingPipeline?: any
  catalogConfig: {
    pipelineCatalog: string
    version?: string
  }
  prefixDataTestId?: string
}

const PipelineForm: React.FC<PipelineFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingPipeline,
  catalogConfig,
  prefixDataTestId = 'pipeline-form',
  accessToken
}) => {
  const [operationLoading, setOperationLoading] = useState(false)
  const catalogClient = useCatalogManagerClient(accessToken)

  const form = useForm<PipelineFormData>({
    defaultValues: {
      value: '',
      valueTranslations: { ...DEFAULT_CATALOG_TRANSLATIONS },
      description: ''
    }
  })

  const handleCreatePipeline = async (data: PipelineFormData) => {
    try {
      setOperationLoading(true)

      const payload = {
        code: data.value.toUpperCase().replaceAll(/[^A-Z0-9]/g, '_'),
        value: getDefaultCatalogValue(data.valueTranslations, data.value),
        localeCode: DEFAULT_CATALOG_LOCALE,
        alternativeCode: null,
        displayOrder: null,
        additionalValue1: null,
        additionalValue2: null,
        additionalValue3: null,
        objectValue: null,
        parentEntryId: null,
        translations: buildCatalogValueTranslations(data.valueTranslations, data.value)
      }

      if (data.description) {
        payload.additionalValue1 = data.description
      }

      await catalogClient.createCatalogEntry(catalogConfig.pipelineCatalog, catalogConfig.version || 'v1', payload)

      onClose()
      form.reset()
      onSuccess()
    } catch (error) {
      console.error('Error creating pipeline:', error)
    } finally {
      setOperationLoading(false)
    }
  }

  const handleUpdatePipeline = async (data: PipelineFormData) => {
    if (!editingPipeline) return

    try {
      setOperationLoading(true)

      await catalogClient.updateCatalogEntry(
        catalogConfig.pipelineCatalog,
        catalogConfig.version || 'v1',
        editingPipeline.id,
        {
          id: editingPipeline.id,
          code: editingPipeline.code,
          value: getDefaultCatalogValue(data.valueTranslations, data.value),
          localeCode: editingPipeline.localeCode || DEFAULT_CATALOG_LOCALE,
          alternativeCode: editingPipeline.alternativeCode,
          displayOrder: editingPipeline.displayOrder,
          additionalValue1: data.description || null,
          additionalValue2: editingPipeline.additionalValue2,
          additionalValue3: editingPipeline.additionalValue3,
          objectValue: editingPipeline.objectValue,
          parentEntryId: editingPipeline.parentEntryId,
          translations: buildCatalogValueTranslations(data.valueTranslations, data.value)
        }
      )

      onClose()
      form.reset()
      onSuccess()
    } catch (error) {
      console.error('Error updating pipeline:', error)
    } finally {
      setOperationLoading(false)
    }
  }

  const handleSubmit = editingPipeline ? handleUpdatePipeline : handleCreatePipeline

  // Reset form when modal opens/closes or editing pipeline changes
  React.useEffect(() => {
    if (isOpen) {
      if (editingPipeline) {
        form.reset({
          value: editingPipeline.value,
          valueTranslations: getCatalogValueTranslations(editingPipeline),
          description: editingPipeline.additionalValue1 || ''
        })
      } else {
        form.reset({
          value: '',
          valueTranslations: { ...DEFAULT_CATALOG_TRANSLATIONS },
          description: ''
        })
      }
    }
  }, [isOpen, editingPipeline, form])

  const getSubmitButtonText = () => {
    if (operationLoading) return 'Saving...'
    if (editingPipeline) return 'Update Pipeline'
    return 'Create Pipeline'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingPipeline ? 'Edit Pipeline' : 'Create New Pipeline'}</DialogTitle>
          <DialogDescription>
            {editingPipeline ? 'Update the pipeline information below.' : 'Enter the pipeline details below.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="gba:space-y-4"
            data-testid={`${prefixDataTestId}-form`}
          >
            <FormField
              control={form.control}
              name="value"
              rules={{ required: 'Pipeline name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pipeline Name</FormLabel>
                  <FormControl>
                    <TranslatableField
                      label=""
                      value={field.value}
                      onChange={field.onChange}
                      translations={form.watch('valueTranslations') || DEFAULT_CATALOG_TRANSLATIONS}
                      onTranslationsChange={valueTranslations =>
                        form.setValue('valueTranslations', valueTranslations, { shouldDirty: true })
                      }
                      defaultLanguage={DEFAULT_CATALOG_LOCALE}
                      placeholder="Enter pipeline name..."
                      data-testid={`${prefixDataTestId}-name-input`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter description..."
                      data-testid={`${prefixDataTestId}-description-input`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={operationLoading}
                data-testid={`${prefixDataTestId}-cancel-button`}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={operationLoading} data-testid={`${prefixDataTestId}-submit-button`}>
                {getSubmitButtonText()}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default PipelineForm
