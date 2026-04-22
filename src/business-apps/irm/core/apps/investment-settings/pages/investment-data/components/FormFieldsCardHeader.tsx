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
  const subtypeOptions = getFormLayoutChoices()

  const layoutChoice = useMemo(
    () => coerceFormLayoutChoice(requiredSubtypeKeyToFormLayoutChoice(requiredSubtypeKey)),
    [requiredSubtypeKey]
  )

  return (
    <Card variant="default" data-testid={`${prefixDataTestId}-controls-card`}>
      <CardHeader>
        <CardTitle>{groupLabel}</CardTitle>
        <CardDescription>
          {isInherited
            ? 'This group may inherit fields from a parent type. Use the actions below to add or reorder fields in this group.'
            : 'Add fields from the catalog or as custom attributes; they appear in the grid below. Drag cards to reorder.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="gba:flex gba:flex-col gba:gap-4">
        <div className="gba:flex gba:flex-col gba:gap-2 gba:max-w-md">
          <Label className="gba:text-sm" htmlFor={`${prefixDataTestId}-field-layout-subtype`}>
            Field layout
          </Label>
          <p className="gba:text-xs gba:text-muted-foreground gba:m-0">
            Applies to all groups in this layout. Controls valid property prefixes and where custom attributes are
            stored.
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
              <SelectValue placeholder="Select layout" />
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
            Add blank field
          </Button>
          <Button variant="outline" onClick={onAddNewRow} data-testid={`${prefixDataTestId}-add-row-button`}>
            <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
            New Row
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
