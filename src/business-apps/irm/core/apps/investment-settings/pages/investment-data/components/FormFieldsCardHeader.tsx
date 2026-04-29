import React, { useMemo } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import type { FieldGroup, FormLayoutChoice, RequiredSubtypeKey } from '../types'
import { FormFieldRegistryPicker } from './FormFieldRegistryPicker'
import type { InvestmentFormFieldRegistryEntry } from '../utils/investmentFormFieldRegistry'
import {
  coerceFormLayoutChoice,
  formLayoutChoiceOptionLabel,
  formLayoutChoiceToRequiredSubtypeKey,
  getFormLayoutChoices,
  isFormLayoutChoice,
  requiredSubtypeKeyToFormLayoutChoice
} from '../utils/formLayoutChoice'
import { useTranslation } from 'react-i18next'
import { ConfigurationInfoPopover } from './ConfigurationInfoPopover'

export interface FormFieldsCardHeaderProps {
  groupLabel: string
  isInherited: boolean
  requiredSubtypeKey: RequiredSubtypeKey
  onRequiredSubtypeKeyChange: (key: RequiredSubtypeKey) => void
  normalizedFieldGroups: FieldGroup[]
  onRegistryPick: (entry: InvestmentFormFieldRegistryEntry) => void
  onAddBlankField: () => void
  onAddNewRow: () => void
  prefixDataTestId: string
}

export const FormFieldsCardHeader: React.FC<FormFieldsCardHeaderProps> = ({
  groupLabel,
  isInherited,
  requiredSubtypeKey,
  onRequiredSubtypeKeyChange,
  normalizedFieldGroups,
  onRegistryPick,
  onAddBlankField,
  onAddNewRow,
  prefixDataTestId
}) => {
  const { t } = useTranslation()
  const subtypeOptions = getFormLayoutChoices()

  const layoutChoice = useMemo(
    () => coerceFormLayoutChoice(requiredSubtypeKeyToFormLayoutChoice(requiredSubtypeKey)),
    [requiredSubtypeKey]
  )

  return (
    <Card variant="default" data-testid={`${prefixDataTestId}-controls-card`}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          {groupLabel}
          <ConfigurationInfoPopover
            title={t('crm.investment_data.info.form_section.title', 'Form field section')}
            description={t(
              'crm.investment_data.info.form_section.description',
              'This section controls a group of fields shown in the investment form layout and related investment views.'
            )}
            items={[
              t(
                'crm.investment_data.info.form_section.item_catalog',
                'Use catalog fields for known investment data paths and types.'
              ),
              t(
                'crm.investment_data.info.form_section.item_custom',
                'Use blank fields for custom attributes or manually configured paths.'
              ),
              t('crm.investment_data.info.form_section.item_order', 'Display order controls row and column placement.')
            ]}
            ariaLabel={t('crm.investment_data.info.form_section.aria', 'Learn about this form field section')}
            prefixDataTestId={`${prefixDataTestId}-section-info`}
          />
        </CardTitle>
        <CardDescription>
          {isInherited
            ? t(
                'crm.investment_data.form_fields.inherited_card_description',
                'This section may inherit fields from a parent type. Use the actions below to add or reorder fields in this section.'
              )
            : t(
                'crm.investment_data.form_fields.card_description',
                'Add fields from the catalog or as custom attributes; they appear in the grid below. Drag cards to reorder.'
              )}
        </CardDescription>
      </CardHeader>

      <CardContent className="gba:flex gba:flex-col gba:gap-4">
        <div className="gba:flex gba:flex-col gba:gap-2 gba:max-w-md">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Label className="gba:text-sm" htmlFor={`${prefixDataTestId}-field-layout-subtype`}>
              {t('crm.investment_data.form_fields.field_layout_label', 'Field layout')}
            </Label>
            <ConfigurationInfoPopover
              title={t('crm.investment_data.info.field_layout.title', 'Field layout')}
              description={t(
                'crm.investment_data.info.field_layout.description',
                'Field layout determines which investment data model the fields belong to and where custom attributes are stored.'
              )}
              items={[
                t(
                  'crm.investment_data.info.field_layout.item_prefixes',
                  'It controls valid prefixes such as investment.*, equityInvestment.*, realEstateInvestment.*, and liquidFundInvestment.*.'
                ),
                t(
                  'crm.investment_data.info.field_layout.item_custom_storage',
                  'Custom attributes are stored under the additional properties path for the selected layout.'
                )
              ]}
              ariaLabel={t('crm.investment_data.info.field_layout.aria', 'Learn about field layout')}
              prefixDataTestId={`${prefixDataTestId}-field-layout-info`}
            />
          </div>
          <p className="gba:text-xs gba:text-muted-foreground gba:m-0">
            {t(
              'crm.investment_data.form_fields.field_layout_description',
              'Applies to all sections in this layout. Controls valid property prefixes and where custom attributes are stored.'
            )}
          </p>
          <Select
            value={layoutChoice}
            onValueChange={next => {
              if (isFormLayoutChoice(next)) {
                const coerced = coerceFormLayoutChoice(next)
                onRequiredSubtypeKeyChange(formLayoutChoiceToRequiredSubtypeKey(coerced))
              }
            }}
            disabled={isInherited}
          >
            <SelectTrigger
              id={`${prefixDataTestId}-field-layout-subtype`}
              className="gba:w-full"
              data-testid={`${prefixDataTestId}-field-layout-subtype`}
            >
              <SelectValue placeholder={t('crm.investment_data.form_fields.select_layout', 'Select layout')} />
            </SelectTrigger>
            <SelectContent>
              {subtypeOptions.map((opt: FormLayoutChoice) => (
                <SelectItem key={opt} value={opt}>
                  {formLayoutChoiceOptionLabel(opt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!isInherited && (
          <div className="gba:min-w-0 gba:max-w-full lg:gba:max-w-md">
            <FormFieldRegistryPicker
              requiredSubtypeKey={requiredSubtypeKey}
              fieldGroups={normalizedFieldGroups}
              onPick={onRegistryPick}
              disabled={isInherited}
              prefixDataTestId={`${prefixDataTestId}-registry-picker`}
            />
          </div>
        )}
      </CardContent>

      {!isInherited && (
        <CardFooter className="gba:flex gba:flex-wrap gba:justify-end gba:gap-2">
          <Button variant="outline" onClick={onAddBlankField} data-testid={`${prefixDataTestId}-add-field-button`}>
            <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('crm.investment_data.form_fields.add_blank_field', 'Add blank field')}
          </Button>
          <Button variant="outline" onClick={onAddNewRow} data-testid={`${prefixDataTestId}-add-row-button`}>
            <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('crm.investment_data.form_fields.new_row', 'New Row')}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
