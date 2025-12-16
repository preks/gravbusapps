import React, { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ErrorAlert } from '@/components/error-alert'
import translations from './_i18n'

const glossaryRequestSchema = z.object({
  term: z.string().min(1, 'Term is required'),
  context: z.string().optional()
})

type GlossaryRequestFormValues = z.infer<typeof glossaryRequestSchema>

const GlossaryEntryRequestForm: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const { t } = useTranslation(translations)

  const form = useForm<GlossaryRequestFormValues>({
    resolver: zodResolver(glossaryRequestSchema),
    defaultValues: {
      term: '',
      context: ''
    },
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const handleSubmit = useCallback(async (data: GlossaryRequestFormValues) => {
    return {
      term: data.term,
      context: data.context || ''
    }
  }, [])

  const handleCancel = async () => {
    // AppActionForm handles cancellation via process events
  }

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="glossary-entry-request-form" />
  }

  return (
    <AppActionForm
      processType="create"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      formData={form.getValues()}
      form={form}
      schema={glossaryRequestSchema}
      data-testid={formatDataTestId('glossary-entry-request-form', 'Form')}
      submitButtonText={t('glossary-request-submit') || 'Request Term'}
    >
      <div className="gba:space-y-6">
        <FormField
          control={form.control}
          name="term"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('glossary-term') || 'Term'}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('glossary-term-placeholder') || 'Enter the term you want to request...'}
                  data-testid="glossary-request-term-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="context"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('glossary-context') || 'Context (optional)'}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={
                    t('glossary-context-placeholder') ||
                    'Provide context about where you encountered this term or why you need it defined...'
                  }
                  rows={4}
                  data-testid="glossary-request-context-textarea"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </AppActionForm>
  )
}

export default GlossaryEntryRequestForm
