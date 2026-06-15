import React from 'react'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'

export interface AssetCategoryOption {
  id: string
  label: string
}

interface AssetCategoryParentFieldProps {
  dataTestId: string
  loading: boolean
  options: AssetCategoryOption[]
  t: (key: string) => string
}

const NO_PARENT_CATEGORY_VALUE = 'none'

const AssetCategoryParentField: React.FC<AssetCategoryParentFieldProps> = ({ dataTestId, loading, options, t }) => (
  <FormField
    name="parentEntryId"
    render={({ field }) => (
      <FormItem className="gba:w-full">
        <FormLabel>{t('field-asset-category-label')}</FormLabel>
        <Select
          onValueChange={value => field.onChange(value === NO_PARENT_CATEGORY_VALUE ? '' : value)}
          value={field.value || NO_PARENT_CATEGORY_VALUE}
          disabled={loading}
        >
          <FormControl className="gba:w-full">
            <SelectTrigger className="gba:w-full" data-testid={`${dataTestId}-asset-category-select`}>
              <SelectValue placeholder={loading ? t('loading') : t('field-asset-category-placeholder')} />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value={NO_PARENT_CATEGORY_VALUE}>{t('field-asset-category-none')}</SelectItem>
            {options.map(option => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
)

export { AssetCategoryParentField }
