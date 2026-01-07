import React, { useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { useForm } from 'react-hook-form'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { AdditionalPropertiesProvider, useAdditionalProperties } from './AdditionalPropertiesContext'
import { Badge, Button, Input } from '@newwork/nw-design-system'
import { XCircleIcon } from 'lucide-react'

interface AdditionalPropertiesFormValues {
  targetEmployeeId?: string
}

const AddSkillContent: React.FC<BusinessAppContextProps> = props => {
  const {
    employeeId: ctxEmployeeId,
    existingProps,
    existingPropsMap,
    employeeVersion,
    employeeHeaderInfo
  } = useAdditionalProperties()

  // New property inputs and list
  const [propName, setPropName] = useState('')
  const [propValue, setPropValue] = useState('')
  const [newProps, setNewProps] = useState<string[]>([])
  const [existingList, setExistingList] = useState<string[]>(existingProps || [])
  const [modifiedProps, setModifiedProps] = useState<string[]>([])
  const [removedProps, setRemovedProps] = useState<string[]>([])
  const [inputKey, setInputKey] = useState(0)
  const [addError, setAddError] = useState<string | null>(null)

  // Keep local existing list in sync when fetched data arrives/changes
  useEffect(() => {
    setExistingList(existingProps || [])
    setRemovedProps([])
  }, [existingProps])

  // no filtering logic required for additional properties

  const form = useForm<AdditionalPropertiesFormValues>({
    defaultValues: {
      targetEmployeeId: undefined
    },
    mode: 'onChange',
    shouldUnregister: true
  })

  const title = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:additional_props_form.title', 'Update Additional Properties'),
    []
  )

  const normalizedDefaults: AdditionalPropertiesFormValues = useMemo(
    () => ({
      targetEmployeeId: ctxEmployeeId || props.userInfo?.employeeDetails?.employeeId
    }),
    [ctxEmployeeId, props.userInfo?.employeeDetails?.employeeId]
  )

  // removed old disabled logic; computed inline based on changes

  // placeholder ref kept for consistency (no behavior needed)

  const isSubmitDisabled = useMemo(() => {
    return newProps.length === 0 && removedProps.length === 0 && modifiedProps.length === 0
  }, [newProps.length, removedProps.length, modifiedProps.length])

  const handleAddProperty = () => {
    const name = propName.trim()
    const value = propValue.trim()
    if (!name || !value) {
      setAddError(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:additional_props_form.validation_both_fields',
          'Please enter both name and value.'
        )
      )
      return
    }
    const kv = `${name}:${value}`

    // Check if property name already exists in existing properties (by name, regardless of value)
    const nameExistsInExisting = (existingList || []).some(
      p => (p.split(':')[0] || '').trim().toLowerCase() === name.toLowerCase()
    )

    // Helper to remove any entry with the same name
    const filterOutSameName = (arr: string[]) =>
      arr.filter(p => (p.split(':')[0] || '').trim().toLowerCase() !== name.toLowerCase())

    setAddError(null)

    if (nameExistsInExisting) {
      // Treat as modified if an existing property with the same name is present
      setModifiedProps(prev => [...filterOutSameName(prev), kv])
      // Ensure it's not also tracked as new
      setNewProps(prev => filterOutSameName(prev))
    } else {
      // Treat as new property (ensure no duplicate names in new/modified buckets)
      setNewProps(prev => [...filterOutSameName(prev), kv])
      setModifiedProps(prev => filterOutSameName(prev))
    }
    setPropName('')
    setPropValue('')
    setInputKey(prev => prev + 1)
  }

  const handleRemoveNewProperty = (value: string) => {
    setNewProps(prev => prev.filter(p => p !== value))
  }

  const handleRemoveModifiedProperty = (value: string) => {
    setModifiedProps(prev => prev.filter(p => p !== value))
  }

  const handleRemoveExistingProperty = (value: string) => {
    setExistingList(prev => prev.filter(p => p !== value))
    setRemovedProps(prev => (prev.includes(value) ? prev : [...prev, value]))
  }

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full"
      data-testid="flw_addSkills_addSkillsContainer"
    >
      <FormHeader
        title={title}
        flowIconUrl={flowIconUrl}
        className="gba:px-6"
        employee={
          employeeHeaderInfo
            ? {
                firstName: employeeHeaderInfo.firstName,
                lastName: employeeHeaderInfo.lastName,
                pictureThumbnail: employeeHeaderInfo.pictureThumbnail,
                jobTitle: employeeHeaderInfo.jobTitle
              }
            : undefined
        }
      />

      <div
        className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='add-skill-form']]:!py-0"
        data-testid="add-skill-form-content"
      >
        <AppActionForm
          processType="update"
          form={form as any}
          formData={normalizedDefaults}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          submitButtonTestId="flw_addSkills_submitButton"
          cancelButtonTestId="flw_addSkills_cancelButton"
          isSubmitDisabled={isSubmitDisabled}
          submitButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.submit', 'Submit')}
          cancelButtonText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request.initiate_cancel_button',
            'Cancel'
          )}
          onSubmit={async (values: AdditionalPropertiesFormValues) => {
            const employeeId = ctxEmployeeId || values.targetEmployeeId
            // Build final additionalProperties map by applying removals and additions
            const finalMap: Record<string, string> = { ...existingPropsMap }
            removedProps.forEach(kv => {
              const key = (kv.split(':')[0] || '').trim()
              if (key) delete finalMap[key]
            })
            newProps.forEach(kv => {
              const idx = kv.indexOf(':')
              if (idx > 0) {
                const k = kv.slice(0, idx).trim()
                const v = kv.slice(idx + 1).trim()
                if (k) finalMap[k] = v
              }
            })
            // Apply modified properties (overwrite existing values)
            modifiedProps.forEach(kv => {
              const idx = kv.indexOf(':')
              if (idx > 0) {
                const k = kv.slice(0, idx).trim()
                const v = kv.slice(idx + 1).trim()
                if (k) finalMap[k] = v
              }
            })

            // Construct required payload
            return {
              changeMode: 'UPDATE',
              employee: {
                id: employeeId,
                version: typeof employeeVersion === 'number' ? employeeVersion : 0,
                additionalProperties: finalMap
              }
            } as any
          }}
          data-testid="add-skill-form"
        >
          <div className="gba:flex-1 gba:space-y-3">
            <div className="gba:w-full gba:flex gba:flex-col gba:gap-2" data-testid="add-prop-inputs">
              <div className="gba:flex gba:flex-col gba:md:flex-row gba:gap-2">
                <Input
                  key={`name-${inputKey}`}
                  value={propName}
                  onChange={e => setPropName((e?.target?.value ?? '').toString())}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:additional_props_form.prop_name_placeholder',
                    'Property name'
                  )}
                  data-testid="additional-props-name-input"
                />
                <Input
                  key={`value-${inputKey}`}
                  value={propValue}
                  onChange={e => setPropValue((e?.target?.value ?? '').toString())}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:additional_props_form.prop_value_placeholder',
                    'Property value'
                  )}
                  data-testid="additional-props-value-input"
                />
                <Button
                  type="button"
                  variant="default"
                  onClick={handleAddProperty}
                  data-testid="additional-props-add-button"
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:additional_props_form.add_button', 'Add')}
                </Button>
              </div>
            </div>

            {addError && (
              <div className="gba:text-destructive" data-testid="add-skill-error">
                {addError}
              </div>
            )}

            {/* Employee Skills section intentionally removed – show only properties */}

            {/* Existing Additional Properties (read-only chips) */}
            {existingList?.length > 0 && (
              <div className="gba:mt-6">
                <span className="gba:block gba:text-muted-foreground gba:font-bold gba:mb-3">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:additional_props_form.existing_properties_label',
                    'Existing Properties'
                  )}
                </span>
                <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid="existing-additional-properties">
                  {existingList.map((p, idx) => (
                    <Badge
                      key={`${p}-${idx}`}
                      variant="secondary"
                      className="gba:flex gba:items-center gba:gap-2 gba:h-10 gba:py-0 gba:px-4 gba:text-sm gba:max-w-full"
                      data-testid={`existing-prop-${idx}`}
                    >
                      <span className="gba:flex-1 gba:min-w-0 gba:px-1 gba:truncate" title={p}>
                        {p}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onMouseDown={evt => {
                          evt.preventDefault()
                          evt.stopPropagation()
                        }}
                        onClick={evt => {
                          evt.preventDefault()
                          evt.stopPropagation()
                          handleRemoveExistingProperty(p)
                        }}
                        onKeyDown={evt => {
                          if (evt.key === 'Enter' || evt.key === ' ') {
                            evt.preventDefault()
                            evt.stopPropagation()
                            handleRemoveExistingProperty(p)
                          }
                        }}
                        aria-label={getTranslationFromI18nKeyAndLabel(
                          'lowcoder:employee_profile.details_layout.add_skill_form.remove_aria_label',
                          'Remove'
                        )}
                        className="gba:cursor-pointer gba:rounded-full gba:p-0.5 gba:flex gba:items-center gba:flex-shrink-0 gba:ml-2"
                        data-testid={`existing-prop-remove-${idx}`}
                      >
                        <XCircleIcon className="gba:w-3 gba:h-3" />
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Newly added properties */}
            {newProps.length > 0 && (
              <div className="gba:mt-4">
                <span className="gba:block gba:text-muted-foreground gba:font-bold gba:mb-3">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:additional_props_form.new_properties_label',
                    'New Properties'
                  )}
                </span>
                <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid="new-additional-properties">
                  {newProps.map((p, idx) => (
                    <Badge
                      key={`new-${p}-${idx}`}
                      variant="secondary"
                      className="gba:flex gba:items-center gba:gap-2 gba:h-10 gba:py-0 gba:px-4 gba:text-sm gba:max-w-full"
                      data-testid={`new-prop-${idx}`}
                    >
                      <span className="gba:flex-1 gba:min-w-0 gba:px-1 gba:truncate" title={p}>
                        {p}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onMouseDown={evt => {
                          evt.preventDefault()
                          evt.stopPropagation()
                        }}
                        onClick={evt => {
                          evt.preventDefault()
                          evt.stopPropagation()
                          handleRemoveNewProperty(p)
                        }}
                        onKeyDown={evt => {
                          if (evt.key === 'Enter' || evt.key === ' ') {
                            evt.preventDefault()
                            evt.stopPropagation()
                            handleRemoveNewProperty(p)
                          }
                        }}
                        aria-label={getTranslationFromI18nKeyAndLabel(
                          'lowcoder:employee_profile.details_layout.add_skill_form.remove_aria_label',
                          'Remove'
                        )}
                        className="gba:cursor-pointer gba:rounded-full gba:p-0.5 gba:flex gba:items-center gba:flex-shrink-0 gba:ml-2"
                        data-testid={`new-prop-remove-${idx}`}
                      >
                        <XCircleIcon className="gba:w-3 gba:h-3" />
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Modified properties (same name as existing, new value) */}
            {modifiedProps.length > 0 && (
              <div className="gba:mt-4">
                <span className="gba:block gba:text-muted-foreground gba:font-bold gba:mb-3">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:additional_props_form.modified_properties_label',
                    'Modified Properties'
                  )}
                </span>
                <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid="modified-additional-properties">
                  {modifiedProps.map((p, idx) => (
                    <Badge
                      key={`modified-${p}-${idx}`}
                      variant="secondary"
                      className="gba:flex gba:items-center gba:gap-2 gba:h-10 gba:py-0 gba:px-4 gba:text-sm gba:max-w-full"
                      data-testid={`modified-prop-${idx}`}
                    >
                      <span className="gba:flex-1 gba:min-w-0 gba:px-1 gba:truncate" title={p}>
                        {p}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onMouseDown={evt => {
                          evt.preventDefault()
                          evt.stopPropagation()
                        }}
                        onClick={evt => {
                          evt.preventDefault()
                          evt.stopPropagation()
                          handleRemoveModifiedProperty(p)
                        }}
                        onKeyDown={evt => {
                          if (evt.key === 'Enter' || evt.key === ' ') {
                            evt.preventDefault()
                            evt.stopPropagation()
                            handleRemoveModifiedProperty(p)
                          }
                        }}
                        aria-label={getTranslationFromI18nKeyAndLabel(
                          'lowcoder:employee_profile.details_layout.add_skill_form.remove_aria_label',
                          'Remove'
                        )}
                        className="gba:cursor-pointer gba:rounded-full gba:p-0.5 gba:flex gba:items-center gba:flex-shrink-0 gba:ml-2"
                        data-testid={`modified-prop-remove-${idx}`}
                      >
                        <XCircleIcon className="gba:w-3 gba:h-3" />
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AppActionForm>
      </div>
    </div>
  )
}

export const UpdateAdditionalPropertiesScreen: React.FC<BusinessAppContextProps> = context => {
  return (
    <AdditionalPropertiesProvider {...context}>
      <AddSkillContent {...context} />
    </AdditionalPropertiesProvider>
  )
}

export default UpdateAdditionalPropertiesScreen
