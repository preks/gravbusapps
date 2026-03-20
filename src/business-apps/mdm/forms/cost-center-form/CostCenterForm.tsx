import React, { Dispatch, SetStateAction, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
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
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useTranslation } from 'react-i18next'
import { CostCenter, CostCenterNode } from '../../apps/organizational-data/types'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'

const DATA_TEST_ID_PREFIX = 'CostCenterForm'

export interface CostCenterFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  costCenter?: CostCenter
  refetch: () => void
  structureId: string
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  isDrawerActive?: boolean
  childAddButton?: React.ReactNode
  parentNodeId?: string
  rank?: number
  isEditCostCenter?: boolean
  isFirstNode?: boolean
  costCenters?: CostCenter[]
  onCancel: () => void
  costCenterNodes: CostCenterNode[]
}

export const CostCenterForm: React.FC<CostCenterFormProps> = ({
  prefixDataTestId,
  costCenter,
  refetch,
  structureId,
  open,
  setOpen,
  isDrawerActive = false,
  childAddButton,
  accessToken,
  isFirstNode,
  onCancel,
  costCenterNodes
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const orgchartClient = useOrgchartClient(accessToken)
  const { t } = useTranslation('master-data')

  const [loading, setLoading] = useState(false)
  const [parentCostCenterSearchTerm, setParentCostCenterSearchTerm] = useState<string>('')

  const parentCostCenterOptions = useMemo(() => {
    return costCenterNodes
      .filter(node => node.costCenterData.name?.toLowerCase().includes(parentCostCenterSearchTerm.toLowerCase()))
      .map(node => ({
        value: node.id,
        label: node.costCenterData.name
      }))
  }, [costCenterNodes, parentCostCenterSearchTerm])

  const defaultValues = {
    name: '',
    code: '',
    description: '',
    parentCostCenterId: ''
  }

  const onCancelForm = () => {
    onCancel()
    setOpen?.(false)
  }

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      setLoading(true)
      const parentNodeChildren =
        costCenterNodes?.filter(node => {
          return node.parentNodeId === values.parentCostCenterId
        }) ?? []

      const editCostCenterData = {
        name: values.name,
        code: values.code,
        description: values.description ?? '',
        structureId: structureId,
        siteLocationId: costCenter?.siteLocationId ?? null,
        id: costCenter?.id ?? ''
      }

      const costCenterData = {
        type: 'cost_center',
        ...(values.parentCostCenterId && !isFirstNode ? { parentNode: values.parentCostCenterId } : {}),
        data: {
          costCenterData: {
            name: values.name,
            code: values.code,
            description: values.description ?? '',
            structureId: structureId
          },
          ...(!isFirstNode ? { rank: parentNodeChildren.length } : {})
        }
      }

      if (costCenter) {
        // Update existing cost center
        await orgchartClient.updateCostCenter(costCenter.id, editCostCenterData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      } else {
        // Create new cost center
        await orgchartClient.createCostCenterNode(structureId, costCenterData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      }

      refetch()
      setOpen?.(false)
    } catch (error) {
      console.error('Error saving cost center:', error)
    } finally {
      onCancel()
      setLoading(false)
      setOpen?.(false)
    }
  }

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={costCenter ? 'Edit Cost Center' : 'Create Cost Center'}
      description="Configure cost center details and information"
      onSubmit={handleSubmit}
      onCancel={onCancelForm}
      defaultValues={
        costCenter
          ? {
              ...costCenter,
              parentCostCenterId:
                costCenterNodes.find(node => node.costCenterData.id === costCenter?.id)?.parentNodeId ?? ''
            }
          : {
              ...defaultValues
            }
      }
      isEditing={!!costCenter}
      loading={loading}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
      open={open}
    >
      <FormField
        name="name"
        rules={{
          required: t('forms.costCenter.fields.name.validation', {
            defaultValue: 'Please enter cost center name'
          })
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('forms.costCenter.fields.name.label', { defaultValue: 'Name' })}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('forms.costCenter.fields.name.placeholder', {
                  defaultValue: 'Enter cost center name'
                })}
                data-testid={`${dataTestId}-name-input`}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="code"
        rules={{
          required: t('forms.costCenter.fields.code.validation', {
            defaultValue: 'Please enter cost center code'
          })
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('forms.costCenter.fields.code.label', { defaultValue: 'Code' })}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('forms.costCenter.fields.code.placeholder', {
                  defaultValue: 'Enter cost center code'
                })}
                data-testid={`${dataTestId}-code-input`}
                {...field}
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
            <FormLabel>{t('forms.costCenter.fields.description.label', { defaultValue: 'Description' })}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t('forms.costCenter.fields.description.placeholder', {
                  defaultValue: 'Enter cost center description (optional)'
                })}
                data-testid={`${dataTestId}-description-textarea`}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {!isFirstNode && (
        <FormField
          name="parentCostCenterId"
          rules={{
            required: t('forms.costCenter.fields.parentCostCenter.validation', {
              defaultValue: 'Please select a parent cost center'
            })
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('forms.costCenter.fields.parentCostCenter.label', {
                  defaultValue: 'Parent Cost Center'
                })}
              </FormLabel>
              <FormControl>
                <Combobox
                  options={parentCostCenterOptions}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  placeholder={t('forms.costCenter.fields.parentCostCenter.placeholder', {
                    defaultValue: 'Select a parent cost center'
                  })}
                  searchPlaceholder={t('forms.costCenter.fields.parentCostCenter.searchPlaceholder', {
                    defaultValue: 'Search cost centers...'
                  })}
                  emptyText={t('forms.costCenter.fields.parentCostCenter.emptyText', {
                    defaultValue: 'No cost centers found.'
                  })}
                  data-testid={`${dataTestId}-parent-cost-center-combobox`}
                  onSearch={value => setParentCostCenterSearchTerm(value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </FormWrapperModal>
  )
}

export default CostCenterForm
