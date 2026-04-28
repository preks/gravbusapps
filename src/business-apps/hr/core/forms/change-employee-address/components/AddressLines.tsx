import React from 'react'
import {
  Button,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Alert
} from '@newwork/nw-design-system'
import { PlusIcon, MinusIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface AddressLinesProps {
  control: any
  addressLineCount: number
  setAddressLineCount: (updater: (c: number) => number) => void
  addressLinesError: string | null
  setAddressLinesError: (msg: string | null) => void
  getValues: () => any
  /**
   * When true, the first address line (street + house number) is rendered readonly.
   * Used by the address form when the autocomplete map is available so the street
   * address can only be set via the autocomplete tools. Additional lines (apartment,
   * floor, door code, etc.) remain editable since providers don't return that data.
   */
  firstLineReadonly?: boolean
}

const AddressLines: React.FC<AddressLinesProps> = ({
  control,
  addressLineCount,
  setAddressLineCount,
  addressLinesError,
  setAddressLinesError,
  getValues,
  firstLineReadonly
}) => {
  const labelBase = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.address_container.address_line',
    'Address Line'
  )
  const placeholderEnter = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder',
    'Please Enter'
  )

  return (
    <>
      {Array.from({ length: addressLineCount }).map((_, index) => {
        const showAdd = index === addressLineCount - 1 && addressLineCount < 4
        const showRemove = index === addressLineCount - 1 && addressLineCount > 1
        const placeholder = `${placeholderEnter} ${labelBase}`
        return (
          <FormField
            key={`line-${index}`}
            control={control}
            name={`addressLines.${index}` as any}
            rules={
              index === 0
                ? {
                    required: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_profile.details_layout.address_container.address_line_validation_message',
                      'The Address Line field is required. Please enter your street address.'
                    )
                  }
                : undefined
            }
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {labelBase}
                  {` ${index + 1}`}
                  {index === 0 ? <span className="gba:text-destructive"> *</span> : null}
                </FormLabel>
                <div className="gba:flex gba:gap-2">
                  <div className="gba:flex-1">
                    <FormControl>
                      <Input
                        {...field}
                        className="gba:w-full"
                        placeholder={placeholder}
                        readOnly={Boolean(firstLineReadonly && index === 0)}
                        onChange={e => {
                          field.onChange(e)
                          if (addressLinesError && String(e.target.value || '').trim() !== '') {
                            setAddressLinesError(null)
                          }
                        }}
                        data-testid={`flw_changeEmployeeAddressList_addressLine${index + 1}`}
                      />
                    </FormControl>
                  </div>
                  {showRemove && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setAddressLinesError(null)
                        setAddressLineCount(c => Math.max(1, c - 1))
                      }}
                      data-testid={`flw_changeEmployeeAddressList_removeLine${index + 1}`}
                    >
                      <MinusIcon className="gba:w-4 gba:h-4" />
                    </Button>
                  )}
                  {showAdd && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const current = (getValues()?.addressLines || []) as string[]
                        const lastIndex = addressLineCount - 1
                        if (!current[lastIndex] || current[lastIndex].trim() === '') {
                          const warn = `${getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.city_warning_message', 'Enter an address in line')} ${lastIndex + 1}`
                          setAddressLinesError(warn)
                          return
                        }
                        setAddressLinesError(null)
                        setAddressLineCount(c => Math.min(4, c + 1))
                      }}
                      data-testid={`flw_changeEmployeeAddressList_addLine${index + 2}`}
                    >
                      <PlusIcon className="gba:w-4 gba:h-4" />
                    </Button>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )
      })}
      {addressLinesError ? (
        <Alert
          variant="default"
          className="gba:mt-2 gba:w-full gba:whitespace-nowrap gba:border-warning gba:text-warning gba:border gba:border-warning-ring gba:rounded-md"
        >
          {addressLinesError}
        </Alert>
      ) : null}
    </>
  )
}

export default AddressLines
