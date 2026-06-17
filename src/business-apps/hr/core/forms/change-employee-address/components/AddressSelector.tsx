import React from 'react'
import {
  FormItem,
  FormControl,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  FormMessage,
  Button,
  useTranslation
} from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { env } from '@/common/env/EnvUtils'
import translations from '../../../apps/employee-record/_i18n'

interface AddressSelectorProps {
  value: string
  onChange: (value: string) => void
  addresses: any[]
  addSentinel: string
  onRequestDelete?: () => void
  canShowDelete?: boolean
}

const AddressSelector: React.FC<AddressSelectorProps> = ({
  value,
  onChange,
  addresses,
  addSentinel,
  onRequestDelete,
  canShowDelete
}) => {
  const { t } = useTranslation(translations)
  const placeholder = `${getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder', 'Please Select')} ${getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.address_text', 'Address')}`
  const hasPrimary = Array.isArray(addresses) && addresses.some((a: any) => a?.type === 'PRIMARY')
  const hasSecondary = Array.isArray(addresses) && addresses.some((a: any) => a?.type === 'SECONDARY')
  const shouldShowAdd = !(hasPrimary && hasSecondary)
  const options = shouldShowAdd ? [...addresses, { type: 'Add Address', id: addSentinel }] : [...addresses]
  const resolvedValue =
    value === addSentinel && addresses.length > 0 && !shouldShowAdd
      ? addresses[0]?.id !== undefined
        ? String(addresses[0].id)
        : addSentinel
      : value
  const selectValue = resolvedValue || ''

  const getAddressOptionLabel = (option: any): string => {
    if (String(option?.id) === addSentinel || option?.type === 'Add Address') {
      return t('change-address-type-add-address')
    }

    if (option?.type === 'PRIMARY') {
      return t('change-address-type-primary')
    }

    if (option?.type === 'SECONDARY') {
      return t('change-address-type-secondary')
    }

    return option?.type || ''
  }

  return (
    <FormItem>
      <div className="gba:flex gba:gap-2">
        <div className="gba:flex-1">
          <Select value={selectValue} onValueChange={v => onChange(v || addSentinel)}>
            <FormControl>
              <SelectTrigger
                className="gba:!w-full gba:min-w-0 gba:!max-w-none"
                data-testid="flw_changeEmployeeAddressList_selectAddress"
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o: any, idx: number) => (
                <SelectItem
                  key={o.id || `add-${idx}`}
                  value={String(o.id)}
                  data-testid={`change-employee-address-address-option-${o.id ?? `add-${idx}`}`}
                >
                  {getAddressOptionLabel(o)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canShowDelete ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onRequestDelete}
            title={getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_profile.details_layout.address_container.delete_confirmation_text',
              'Are you sure you want to DELETE this address?'
            )}
            data-testid="flw_changeEmployeeAddressList_deleteIcon"
          >
            <img
              src={`${env('NEXT_PUBLIC_BASE_URL')}/_next/static/media/lowcoder-icons/remixicons/delete-bin.svg`}
              alt="delete"
              className="gba:w-4 gba:h-4"
            />
          </Button>
        ) : null}
      </div>
      <FormMessage />
    </FormItem>
  )
}

export default AddressSelector
