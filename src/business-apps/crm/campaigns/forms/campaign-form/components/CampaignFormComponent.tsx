import React, { useEffect } from 'react'
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { useCampaignFormContext } from '../context/CampaignFormContext'
import type { CampaignFormValues } from '../types'
import dayjs from 'dayjs'
import { CAMPAIGN_TYPE } from '@/common/data/customer/constants/customerCatalogs'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { CatalogSelect } from '@/components/catalog-select'

const CampaignFormComponent: React.FC = () => {
  const { formValues, onSubmit, onCancel, isLoading, isUpdateMode } = useCampaignFormContext()

  const form = useForm<CampaignFormValues>({
    defaultValues: formValues,
    mode: 'onChange'
  })

  // Keep form in sync when context-provided values change (e.g., after fetch)
  useEffect(() => {
    form.reset(formValues)
  }, [formValues, form])

  const handleSubmit = async (values: CampaignFormValues) => {
    const normalized: CampaignFormValues = {
      ...values,
      startDate: values.startDate ? dayjs(values.startDate).format('YYYY-MM-DD') : '',
      endDate: values.endDate ? dayjs(values.endDate).format('YYYY-MM-DD') : ''
    }
    await onSubmit(normalized)
    const payload = {
      changeMode: isUpdateMode ? 'UPDATE' : 'INSERT',
      salesCampaign: {
        ...(isUpdateMode && formValues.id ? { id: formValues.id } : {}),
        ...(isUpdateMode && formValues.version !== undefined ? { version: formValues.version } : {}),
        name: normalized.name,
        typeRef: normalized.typeRef,
        startDate: normalized.startDate,
        endDate: normalized.endDate,
        description: normalized.description || ''
      }
    }
    dispatchProcessContinueEvent('pse_submit', payload)
  }

  const handleCancel = async () => {
    await onCancel()
    dispatchProcessContinueEvent('pse_pause', {})
  }

  return (
    <div className="gba:max-w-2xl gba:w-full gba:mx-auto gba:p-6">
      <div className="gba:mb-6">
        <h1 className="gba:text-2xl gba:font-semibold" data-testid="campaign-form-title">
          {isUpdateMode
            ? getTranslationFromI18nKeyAndLabel('crm:campaign.update', 'Update Campaign')
            : getTranslationFromI18nKeyAndLabel('crm:campaign.create', 'Create Campaign')}
        </h1>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="gba:space-y-6">
          <FormField
            control={form.control}
            name="name"
            rules={{ required: 'Name is required' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Name <span style={{ color: 'var(--color-danger-500)' }}>*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter campaign name" data-testid="campaign-form-name-input" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="typeRef"
            rules={{ required: 'Type is required' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Type <span style={{ color: 'var(--color-danger-500)' }}>*</span>
                </FormLabel>
                <FormControl>
                  <CatalogSelect
                    catalogIdentifier={CAMPAIGN_TYPE}
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    data-testid="campaign-form-type-select"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            <FormField
              control={form.control}
              name="startDate"
              rules={{ required: 'Start date is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Start Date <span style={{ color: 'var(--color-danger-500)' }}>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="date" data-testid="campaign-form-start-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              rules={{ required: 'End date is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    End Date <span style={{ color: 'var(--color-danger-500)' }}>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="date" data-testid="campaign-form-end-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={4}
                    placeholder="Enter campaign description"
                    data-testid="campaign-form-description-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="gba:flex gba:justify-end gba:gap-3 gba:pt-2">
            <Button type="button" variant="outline" onClick={handleCancel} data-testid="campaign-form-cancel-button">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} data-testid="campaign-form-submit-button">
              Save
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default CampaignFormComponent
