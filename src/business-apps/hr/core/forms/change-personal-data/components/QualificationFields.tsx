import React, { useMemo, useState } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
  Textarea
} from '@newwork/nw-design-system'
import type { Control } from 'react-hook-form'
import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '@/common/utils/windowUtils'
import { XCircleIcon } from 'lucide-react'
import type { PersonalDataFormValues, CatalogEntry } from '../types'

export interface QualificationFieldsProps {
  control: Control<PersonalDataFormValues>
  catalogs: {
    schoolQualification?: CatalogEntry[]
    academicTitle?: CatalogEntry[]
  }
}

const QualificationFields: React.FC<QualificationFieldsProps> = ({ control, catalogs }) => {
  const placeholderSelect = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder',
    'Please Select'
  )
  const placeholderEnter = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder',
    'Please Enter'
  )

  return (
    <div className="gba:space-y-4" data-testid="change-personal-data-qualification-fields">
      {/* Highest School Qualification */}
      <FormField
        control={control}
        name={'schoolQualificationRef' as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-school-qualification-label">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.personal_information_container.qualification',
                'Highest School Qualification'
              )}
            </FormLabel>
            <Select
              value={
                field.value === null || field.value === undefined || field.value === ''
                  ? undefined
                  : String(field.value)
              }
              onValueChange={v => field.onChange(v || null)}
            >
              <FormControl>
                <SelectTrigger
                  className="gba:block gba:!w-full gba:min-w-0 gba:!max-w-none"
                  data-testid="flw_changePersonalData_schoolInput"
                >
                  <SelectValue placeholder={placeholderSelect} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(catalogs.schoolQualification || []).map(entry => (
                  <SelectItem
                    key={entry.id}
                    value={String(entry.id)}
                    data-testid={`change-personal-data-school-qualification-option-${entry.id}`}
                  >
                    {getCatalogValue(entry)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Academic Titles multi */}
      <FormField
        control={control}
        name={'academicTitleRefs' as any}
        render={({ field }) => {
          const [open, setOpen] = useState(false)
          const selected: string[] = useMemo(
            () => (Array.isArray(field.value) ? field.value.map((id: any) => String(id)) : []),
            [field.value]
          )
          const addValue = (val: string) => {
            if (!val) return
            if (selected.includes(val)) return
            field.onChange([...(selected || []), val])
          }
          const removeValue = (val: string) => {
            field.onChange((selected || []).filter((id: string) => id !== val))
          }
          const selectedEntries = useMemo(
            () => (catalogs.academicTitle || []).filter(e => selected.includes(String(e.id))),
            [catalogs.academicTitle, selected]
          )
          return (
            <FormItem className="gba:[&_button[role='combobox']]:gba:!h-auto gba:[&_button[role='combobox']]:gba:!min-h-[64px] gba:[&_button[role='combobox']]:gba:!items-start gba:[&_button[role='combobox']>span]:gba:flex gba:[&_button[role='combobox']>span]:gba:flex-wrap gba:[&_button[role='combobox']>span]:gba:w-full gba:[&_button[role='combobox']>span]:gba:gap-2 gba:[&_button[role='combobox']>span]:gba:whitespace-normal gba:[&_button[role='combobox']>span]:gba:overflow-visible">
              <FormLabel data-testid="flw_changePersonalData_currentAcademicTitles">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.personal_information_container.academic_titles',
                  'Academic Titles'
                )}
              </FormLabel>
              <Select value={''} onValueChange={v => addValue(v)} open={open} onOpenChange={setOpen}>
                <FormControl>
                  <SelectTrigger
                    className="gba:block gba:!w-full gba:min-w-0 gba:!max-w-none gba:!h-auto"
                    data-testid="change-personal-data-academic-titles-select"
                    onMouseDownCapture={evt => {
                      const target = evt.target as HTMLElement
                      if (target.closest('[data-chip-action="remove"]')) {
                        evt.preventDefault()
                        evt.stopPropagation()
                      }
                    }}
                  >
                    {selectedEntries.length > 0 ? (
                      <div
                        className="gba:w-full gba:flex gba:flex-wrap gba:gap-2 gba:min-h-5"
                        data-testid="change-personal-data-academic-titles-chips"
                      >
                        {selectedEntries.map(e => (
                          <Badge
                            key={e.id}
                            variant="secondary"
                            className="gba:flex gba:items-center gba:gap-1 gba:h-6 gba:py-0 gba:px-2 gba:text-xs gba:pointer-events-auto gba:max-w-full"
                            data-testid={`change-personal-data-academic-title-chip-${e.id}`}
                          >
                            <span
                              className="gba:px-1 gba:max-w-[calc(100%-16px)] gba:truncate"
                              title={getCatalogValue(e)}
                            >
                              {getCatalogValue(e)}
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
                                setOpen(false)
                                removeValue(String(e.id))
                              }}
                              onKeyDown={evt => {
                                if (evt.key === 'Enter' || evt.key === ' ') {
                                  evt.preventDefault()
                                  evt.stopPropagation()
                                  setOpen(false)
                                  removeValue(String(e.id))
                                }
                              }}
                              aria-label="Remove"
                              className="gba:cursor-pointer gba:rounded-full gba:p-0.5 gba:flex gba:items-center gba:flex-shrink-0"
                              data-testid={`change-personal-data-academic-title-remove-${e.id}`}
                              data-chip-action="remove"
                            >
                              <XCircleIcon className="gba:w-3 gba:h-3" />
                            </span>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <SelectValue placeholder={placeholderSelect} />
                    )}
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(catalogs.academicTitle || []).map(entry => (
                    <SelectItem
                      key={entry.id}
                      value={String(entry.id)}
                      data-testid={`change-personal-data-academic-title-option-${entry.id}`}
                    >
                      {getCatalogValue(entry)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )
        }}
      />

      {/* Comment */}
      <FormField
        control={control}
        name={'comment' as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-comment-label">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:initiate_expense_plan.create_expense_plan.comment_text_area',
                'Comment'
              )}
            </FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={placeholderEnter}
                rows={4}
                data-testid="flw_changePersonalData_addNote"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

export default QualificationFields
