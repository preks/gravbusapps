import React, { Dispatch, SetStateAction, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import { Input, FormField, FormItem, FormLabel, FormControl, FormMessage, Textarea } from '@newwork/nw-design-system'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useTranslation } from 'react-i18next'
import type { Team } from '../../apps/organizational-data/types'

const DATA_TEST_ID_PREFIX = 'TeamForm'
const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

export interface TeamFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  team?: Team
  refetch: () => void
  structureId: string
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  isDrawerActive?: boolean
  childAddButton?: React.ReactNode
  teamsCount: number
  onSubmit?: () => void
}

export const TeamForm: React.FC<TeamFormProps> = ({
  prefixDataTestId,
  team,
  refetch,
  structureId,
  open,
  setOpen,
  isDrawerActive = false,
  childAddButton,
  accessToken,
  teamsCount,
  onSubmit
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(ORGCHART_BASE_URL)
  const { t } = useTranslation('master-data')

  const [loading, setLoading] = useState(false)

  const defaultValues = {
    name: '',
    description: '',
    rank: 0
  }

  const onCancel = () => {
    setOpen?.(false)
  }

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      setLoading(true)

      const teamData = {
        name: values.name,
        description: values.description,
        rank: teamsCount,
        structureId: structureId,
        ...(team ? { id: team.id } : {})
      }

      if (team) {
        // Update existing team
        await restClient.put(`/matrix-units/${team.id}`, teamData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      } else {
        // Create new team
        await restClient.post('/matrix-units', teamData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      }

      refetch?.()

      // Call onSubmit callback if provided (only on success)
      if (onSubmit) {
        onSubmit()
      }

      setOpen?.(false)
    } catch (error) {
      console.error('Error saving team:', error)
    } finally {
      setLoading(false)
      setOpen?.(false)
    }
  }
  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={team ? 'Edit Team' : 'Create Team'}
      description="Configure team details and information"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={
        team
          ? {
              ...team
            }
          : {
              ...defaultValues
            }
      }
      isEditing={!!team}
      loading={loading}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
      open={open}
    >
      <FormField
        name="name"
        rules={{
          required: t('forms.team.fields.name.validation', {
            defaultValue: 'Please enter team name'
          })
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('forms.team.fields.name.label', { defaultValue: 'Name' })}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('forms.team.fields.name.placeholder', {
                  defaultValue: 'Enter team name'
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
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('forms.team.fields.description.label', { defaultValue: 'Description' })}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t('forms.team.fields.description.placeholder', {
                  defaultValue: 'Enter team description (optional)'
                })}
                data-testid={`${dataTestId}-description-textarea`}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormWrapperModal>
  )
}

export default TeamForm
