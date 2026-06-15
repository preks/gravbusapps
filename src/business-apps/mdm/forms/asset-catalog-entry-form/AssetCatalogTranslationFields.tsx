import React, { useState } from 'react'
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input
} from '@newwork/nw-design-system'
import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react'

export const TRANSLATION_FIELD_NAMES = ['translationEnUs', 'translationDeDe', 'translationRoRo'] as const

export type TranslationFieldName = (typeof TRANSLATION_FIELD_NAMES)[number]

interface AssetCatalogTranslationFieldsProps {
  dataTestId: string
  t: (key: string) => string
}

const TRANSLATION_FIELDS: Array<{
  name: TranslationFieldName
  labelKey: string
  placeholderKey: string
}> = [
  {
    name: 'translationEnUs',
    labelKey: 'field-translation-en-us-label',
    placeholderKey: 'field-translation-en-us-placeholder'
  },
  {
    name: 'translationDeDe',
    labelKey: 'field-translation-de-de-label',
    placeholderKey: 'field-translation-de-de-placeholder'
  },
  {
    name: 'translationRoRo',
    labelKey: 'field-translation-ro-ro-label',
    placeholderKey: 'field-translation-ro-ro-placeholder'
  }
]

const AssetCatalogTranslationFields: React.FC<AssetCatalogTranslationFieldsProps> = ({ dataTestId, t }) => {
  const [open, setOpen] = useState(false)
  const CaretIcon = open ? CaretDownIcon : CaretRightIcon

  return (
    <Collapsible open={open} onOpenChange={setOpen} data-testid={`${dataTestId}-translations-section`}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="gba:w-full gba:justify-start gba:px-0"
          data-testid={`${dataTestId}-translations-toggle`}
        >
          <CaretIcon className="gba:h-4 gba:w-4" />
          {t('translations-section-label')}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="gba:flex gba:flex-col gba:gap-4 gba:rounded-lg gba:border gba:p-4">
          <p className="gba:text-sm gba:text-muted-foreground">{t('translations-section-description')}</p>
          {TRANSLATION_FIELDS.map(fieldConfig => (
            <FormField
              key={fieldConfig.name}
              name={fieldConfig.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(fieldConfig.labelKey)}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(fieldConfig.placeholderKey)}
                      {...field}
                      data-testid={`${dataTestId}-${fieldConfig.name}-input`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export { AssetCatalogTranslationFields }
