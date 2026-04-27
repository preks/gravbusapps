import React, { useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@newwork/nw-design-system'
import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react'
import type { FormFieldsValidationResult } from '../utils/investmentFormFieldValidation'
import type { FieldGroup, RequiredSubtypeKey } from '../types'
import {
  formLayoutChoiceOptionLabel,
  inferRequiredSubtypeKeyFromFormFields,
  requiredSubtypeKeyToFormLayoutChoice
} from '../utils/formLayoutChoice'

export interface FormFieldsCatalogControlsProps {
  layoutValidation: FormFieldsValidationResult
  prefixDataTestId: string
  fieldGroups?: FieldGroup[]
  requiredSubtypeKey?: RequiredSubtypeKey
  onRequiredSubtypeKeyChange?: (key: RequiredSubtypeKey) => void
}

/** Validation-only strip above the field layout (catalog picker lives in the field card header). */
export const FormFieldsCatalogControls: React.FC<FormFieldsCatalogControlsProps> = ({
  layoutValidation,
  prefixDataTestId,
  fieldGroups,
  requiredSubtypeKey,
  onRequiredSubtypeKeyChange
}) => {
  const [open, setOpen] = useState(false)

  const issueCount = layoutValidation.issues.length
  const issueListId = `${prefixDataTestId}-layout-validation-list`

  const suggestedSubtypeKey = useMemo<RequiredSubtypeKey | null>(() => {
    if (layoutValidation.valid) return null
    const inferred = inferRequiredSubtypeKeyFromFormFields(fieldGroups)
    if (!inferred || inferred === requiredSubtypeKey) return null
    return inferred
  }, [layoutValidation.valid, fieldGroups, requiredSubtypeKey])

  if (layoutValidation.valid) return null

  return (
    <Alert variant="destructive" data-testid={`${prefixDataTestId}-layout-validation`}>
      <AlertDescription>
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
          <span className="gba:flex-1 gba:min-w-0">
            <strong>{issueCount}</strong> {issueCount === 1 ? 'field is' : 'fields are'} incompatible with the current
            layout. Switch layouts or remove the conflicting fields before saving.
          </span>
          {suggestedSubtypeKey && onRequiredSubtypeKeyChange && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onRequiredSubtypeKeyChange(suggestedSubtypeKey)}
              data-testid={`${prefixDataTestId}-layout-validation-switch`}
            >
              Use {formLayoutChoiceOptionLabel(requiredSubtypeKeyToFormLayoutChoice(suggestedSubtypeKey))} layout
            </Button>
          )}
        </div>

        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gba:px-0 gba:h-auto gba:mt-2"
              aria-expanded={open}
              aria-controls={issueListId}
              data-testid={`${prefixDataTestId}-layout-validation-toggle`}
            >
              {open ? (
                <CaretDownIcon className="gba:w-4 gba:h-4 gba:mr-1" />
              ) : (
                <CaretRightIcon className="gba:w-4 gba:h-4 gba:mr-1" />
              )}
              {open ? 'Hide details' : 'Show details'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul
              id={issueListId}
              className="gba:mt-2 gba:max-h-40 gba:overflow-y-auto gba:space-y-1 gba:list-none gba:p-0 gba:m-0"
              data-testid={issueListId}
            >
              {layoutValidation.issues.map(i => (
                <li key={`${i.property}-${i.message}`} className="gba:text-xs">
                  <span className="gba:font-mono">{i.property || '(empty)'}</span>: {i.message}
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </AlertDescription>
    </Alert>
  )
}
