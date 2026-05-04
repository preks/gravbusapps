import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { FormWrapperModal } from '@/components/form-wrapper'
import { Dispatch, ReactNode, SetStateAction } from 'react'
import { FieldValues } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import useGeoZones from '../../apps/organizational-data/hooks/useGeoZones'
import { GeoZone, GeoZoneFormValues } from '../../apps/organizational-data/types/GeoZone.types'
import { GeoZoneFormFields } from './components/GeoZoneFormFields'

const DATA_TEST_ID_PREFIX = 'GeoZoneForm'

interface GeoZoneFormProps extends BusinessAppContextProps {
  geoZone?: GeoZone
  onCancel?: () => void
  prefixDataTestId?: string
  childAddButton?: ReactNode
  defaultValues?: Partial<GeoZoneFormValues>
  isDrawerActive?: boolean
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  onSuccess?: () => void
}

export default function GeoZoneForm({
  geoZone,
  onCancel,
  prefixDataTestId,
  childAddButton,
  accessToken,
  defaultValues = {},
  isDrawerActive = false,
  open,
  setOpen,
  onSuccess
}: Readonly<GeoZoneFormProps>) {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const { t } = useTranslation('master-data')

  const { createGeoZone, updateGeoZone, mutationLoading } = useGeoZones({ accessToken })

  const handleSubmit = async (values: FieldValues) => {
    try {
      const geoZoneValues = values as GeoZoneFormValues
      if (geoZone) {
        await updateGeoZone(geoZoneValues, geoZone.id)
      } else {
        await createGeoZone(geoZoneValues)
      }
      onSuccess?.()
      setOpen?.(false)
    } finally {
      /* empty */
    }
  }

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={geoZone ? t('geo_zone.edit_title', 'Edit Geo Zone') : t('geo_zone.add_title', 'Add Geo Zone')}
      description={
        geoZone
          ? t('geo_zone.edit_description', 'Update the geo zone information')
          : t('geo_zone.add_description', 'Create a new geographical zone')
      }
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={{
        code: geoZone?.code || defaultValues.code || '',
        name: geoZone?.name || defaultValues.name || '',
        description: geoZone?.description || defaultValues.description || ''
      }}
      isEditing={!!geoZone}
      loading={mutationLoading}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
      open={open}
      setOpen={setOpen}
    >
      <GeoZoneFormFields prefixDataTestId={dataTestId} />
    </FormWrapperModal>
  )
}
