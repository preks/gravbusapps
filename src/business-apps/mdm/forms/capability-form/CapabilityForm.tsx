import React, { Dispatch, SetStateAction, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Textarea,
  Combobox
} from '@newwork/nw-design-system'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useTranslation } from 'react-i18next'
import { Capability, CapabilityLayer } from '../../apps/organizational-data/components/tabs/CapabilitiesTab'
import { FormWrapperModal } from '@/components/form-wrapper'

const DATA_TEST_ID_PREFIX = 'CapabilityForm'
const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

export interface CapabilityFormProps extends BusinessAppContextProps {
  capability?: Capability
  onCancel?: () => void
  prefixDataTestId?: string
  childAddButton?: React.ReactNode
  refetch: () => void
  defaultValues?: Record<string, unknown>
  isDrawerActive?: boolean
  structureId: string
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  layers?: CapabilityLayer[]
}

const CapabilityForm: React.FC<CapabilityFormProps> = ({
  capability,
  onCancel,
  prefixDataTestId,
  childAddButton,
  accessToken,
  refetch,
  defaultValues = {},
  isDrawerActive = false,
  structureId,
  open,
  setOpen,
  layers = []
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(ORGCHART_BASE_URL)
  const { t } = useTranslation('master-data')

  const [loading, setLoading] = useState(false)
  const [layerSearchTerm, setLayerSearchTerm] = useState<string>('')

  const layerOptions = useMemo(() => {
    return layers
      .filter(layer => layer.name?.toLowerCase().includes(layerSearchTerm.toLowerCase()))
      .map(layer => ({
        value: layer.id,
        label: layer.name
      }))
  }, [layers, layerSearchTerm])

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      setLoading(true)

      // Find the selected layer to calculate rankInLayer
      const selectedLayer = layers.find(layer => layer.id === values.layerId)
      const rankInLayer = selectedLayer ? selectedLayer.capabilities.length : 0

      const capabilityData = {
        name: values.name,
        description: values.description,
        structureId: structureId,
        layer: values.layerId,
        rankInLayer: rankInLayer,
        ...(capability ? { id: capability.id } : {})
      }

      if (capability) {
        await restClient.put(`/capabilities/${capability.id}`, capabilityData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      } else {
        await restClient.post(`/capabilities`, capabilityData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      }

      refetch()
    } catch (error) {
      console.error('Form validation error:', error)
    } finally {
      setLoading(false)
      setOpen?.(false)
    }
  }

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={capability ? 'Edit Capability' : 'Create Capability'}
      description="Configure capability details and information"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={
        capability
          ? {
              ...capability,
              layerId:
                capability.layerId && layers.some(layer => layer.id === capability.layerId) ? capability.layerId : ''
            }
          : {
              ...defaultValues
            }
      }
      isEditing={!!capability}
      loading={loading}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
      open={open}
      setOpen={setOpen}
    >
      <FormField
        name="name"
        rules={{
          required: t('forms.capability.fields.name.validation', {
            defaultValue: 'Please enter capability name'
          })
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('forms.capability.fields.name.label', { defaultValue: 'Name' })}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('forms.capability.fields.name.placeholder', {
                  defaultValue: 'Enter capability name'
                })}
                {...field}
                data-testid={`${dataTestId}-name-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <style jsx>{`
        [data-slot='popover-content'] {
          z-index: 1002 !important;
        }
      `}</style>
      <FormField
        name="layerId"
        rules={{
          required: t('forms.capability.fields.layer.validation', {
            defaultValue: 'Please select a layer'
          })
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('forms.capability.fields.layer.label', { defaultValue: 'Layer' })}</FormLabel>
            <FormControl>
              <Combobox
                options={layerOptions}
                value={field.value || ''}
                onValueChange={field.onChange}
                placeholder={t('forms.capability.fields.layer.placeholder', {
                  defaultValue: 'Select a layer'
                })}
                searchPlaceholder={t('forms.capability.fields.layer.searchPlaceholder', {
                  defaultValue: 'Search layers...'
                })}
                emptyText={t('forms.capability.fields.layer.emptyText', {
                  defaultValue: 'No layers found.'
                })}
                data-testid={`${dataTestId}-layer-combobox`}
                onSearch={value => setLayerSearchTerm(value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('forms.capability.fields.description.label', {
                defaultValue: 'Description'
              })}
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder={t('forms.capability.fields.description.placeholder', {
                  defaultValue: 'Enter description (optional)'
                })}
                rows={3}
                {...field}
                data-testid={`${dataTestId}-description-textarea`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormWrapperModal>
  )
}

export default CapabilityForm
