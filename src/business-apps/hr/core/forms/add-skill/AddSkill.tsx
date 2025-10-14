import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { useForm } from 'react-hook-form'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { AddSkillProvider, useAddSkill } from './AddSkillContext'
import { DebouncedInput } from '@/components/debounced-input'
import { Button, Badge, Card, CardContent } from '@newwork/nw-design-system'
import { XCircleIcon } from 'lucide-react'

interface AddSkillFormValues {
  targetEmployeeId?: string
}

const AddSkillContent: React.FC<BusinessAppContextProps> = () => {
  const { data, searchSkills, createSkillAndFetchByNames, employeeId: ctxEmployeeId } = useAddSkill()
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<Array<any>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<Array<{ id: string; name: string; isNew?: boolean }>>([])
  const [inputKey, setInputKey] = useState(0)
  const [addedNames, setAddedNames] = useState<string[]>([])
  const [addError, setAddError] = useState<string | null>(null)

  // Filter search results to exclude already selected skills (by id or name)
  const filteredResults = useMemo(() => {
    const selectedIdSet = new Set(selectedSkills.map(s => s.id))
    const selectedNameSet = new Set(selectedSkills.map(s => (s.name || '').trim().toLowerCase()))
    return (results || []).filter((sk: any) => {
      const id = sk?.id
      const nameKey = (sk?.name || '').trim().toLowerCase()
      if (id && selectedIdSet.has(id)) return false
      if (nameKey && selectedNameSet.has(nameKey)) return false
      return true
    })
  }, [results, selectedSkills])

  const form = useForm<AddSkillFormValues>({
    defaultValues: {
      targetEmployeeId: undefined
    },
    mode: 'onChange',
    shouldUnregister: true
  })

  const title = useMemo(
    () =>
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.add_skill_form.form_title',
        'Add Skill'
      ),
    []
  )

  const employee = data?.employee
  const employeeFullName = `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim()

  const normalizedDefaults: AddSkillFormValues = useMemo(
    () => ({
      targetEmployeeId: employee?.id
    }),
    [employee?.id]
  )

  // removed old disabled logic; computed inline based on changes

  // Initialize selected skills from employee existing skills
  useEffect(() => {
    const existing = ((employee?.skills || []) as Array<{ skill?: { id: string; name: string } }>).map(s => ({
      id: (s.skill?.id || '') as string,
      name: (s.skill?.name || '') as string,
      isNew: false
    }))
    const deduped: Record<string, { id: string; name: string }> = {}
    existing.forEach(s => {
      if (s.id) deduped[s.id] = s
    })
    setSelectedSkills(Object.values(deduped))
  }, [employee?.skills])

  const suppressOpenRef = useRef(false)
  const searchSeqRef = useRef(0)

  useEffect(() => {
    let isActive = true
    const run = async () => {
      // If we just selected an item, suppress one open cycle
      if (suppressOpenRef.current) {
        suppressOpenRef.current = false
        if (isActive) {
          setIsDropdownOpen(false)
          setResults([])
        }
        return
      }
      const term = searchTerm.trim()
      if (!term) {
        if (isActive) setResults([])
        if (isActive) setIsDropdownOpen(false)
        return
      }
      setIsSearching(true)
      const mySeq = ++searchSeqRef.current
      try {
        const r = await searchSkills(term)
        if (!isActive || mySeq !== searchSeqRef.current) return
        setResults(r)
        setIsDropdownOpen(true)
      } finally {
        if (isActive && mySeq === searchSeqRef.current) setIsSearching(false)
      }
    }
    run()
    return () => {
      isActive = false
    }
  }, [searchTerm, searchSkills])

  const handleSelectSkill = (sk: { id: string; name: string }) => {
    setSelectedSkills(prev => {
      if (prev.find(x => x.id === sk.id)) return prev
      return [...prev, { ...sk, isNew: false }]
    })
    // Close dropdown and clear search
    suppressOpenRef.current = true
    // Invalidate any in-flight searches to prevent re-open
    searchSeqRef.current += 1
    setIsDropdownOpen(false)
    setSearchTerm('')
    setResults([])
    setIsSearching(false)
    setInputKey(prev => prev + 1)
  }

  const nextNewIdRef = useRef(1)

  const handleAddNewSkill = async () => {
    const name = searchTerm.trim()
    if (!name) return
    // validations
    if (!/[A-Za-z]/.test(name)) {
      setAddError(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.details_layout.add_skill_form.error_at_least_one_letter',
          'The skill must have at least one letter'
        )
      )
      return
    }
    if (name.length > 64) {
      setAddError(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.details_layout.add_skill_form.error_max_64',
          'The skill must have less than 65 characters'
        )
      )
      return
    }
    setAddError(null)
    setSelectedSkills(prev => {
      const existsByName = prev.some(s => s.name.toLowerCase() === name.toLowerCase())
      if (existsByName) return prev
      const newId = `new-${nextNewIdRef.current++}`
      return [...prev, { id: newId, name, isNew: true }]
    })
    setAddedNames(prev => Array.from(new Set([...prev, name])))
    try {
      const fetched = await createSkillAndFetchByNames(name, addedNames)
      setSelectedSkills(prev => {
        const byName: Record<string, any> = {}
        fetched.forEach(sk => {
          byName[sk.name.toLowerCase()] = sk
        })
        return prev.map(s => {
          const resolved = byName[s.name.toLowerCase()]
          return resolved ? { id: resolved.id, name: resolved.name, isNew: s.isNew ?? true } : s
        })
      })
    } catch (e) {
      setAddError(
        e instanceof Error
          ? e.message
          : getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_profile.details_layout.add_skill_form.skill_add_error',
              'Failed to add skill'
            )
      )
    }
    suppressOpenRef.current = true
    searchSeqRef.current += 1
    setIsDropdownOpen(false)
    setSearchTerm('')
    setResults([])
    setIsSearching(false)
    setInputKey(prev => prev + 1)
  }

  const handleRemoveSkill = (id: string) => {
    setSelectedSkills(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full"
      data-testid="add-skill-form-container"
    >
      <FormHeader title={title} flowIconUrl={flowIconUrl} />

      <div
        className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='add-skill-form']]:!p-0 gba:[&>div[data-testid='add-skill-form']>form]:!max-w-[100%]"
        data-testid="add-skill-form-content"
      >
        {/* Header showing current employee name */}
        <div className="gba:text-muted-foreground gba:font-bold gba:mb-2" data-testid="add-skill-employee-name">
          {employeeFullName}
        </div>

        <AppActionForm
          processType="update"
          form={form as any}
          formData={normalizedDefaults}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          submitButtonTestId="flw_addSkill_submitButton"
          cancelButtonTestId="flw_addSkill_cancelButton"
          isSubmitDisabled={useMemo(() => {
            const initial = ((employee?.skills || []) as Array<{ skill?: { id: string } }>)
              .map(s => s.skill?.id)
              .filter(Boolean)
            const current = selectedSkills.map(s => s.id)
            const changed = initial.length !== current.length || initial.some(id => !current.includes(id as string))
            return !changed
          }, [employee?.skills, selectedSkills])}
          submitButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.submit', 'Submit')}
          cancelButtonText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request.initiate_cancel_button',
            'Cancel'
          )}
          onSubmit={async (values: AddSkillFormValues) => {
            const employeeId = ctxEmployeeId || values.targetEmployeeId
            const existingSkills = employee?.skills || []
            const selectedIds = selectedSkills.map(s => s.id)

            // Build a map of existing employeeSkill records by underlying skill id
            const existingBySkillId: Record<string, { id?: string; version?: number }> = {}
            ;(existingSkills as Array<{ id?: string; version?: number; skill?: { id?: string } }>).forEach(es => {
              const sid = es?.skill?.id
              if (sid) {
                existingBySkillId[sid] = { id: es?.id, version: es?.version }
              }
            })

            const skillsPayload = selectedIds.map(skillId => {
              const existing = existingBySkillId[skillId]
              if (existing?.id && existing?.version !== undefined) {
                return { id: existing.id, version: existing.version, employeeId, skill: skillId }
              }
              return { employeeId, skill: skillId }
            })

            const payload = { employeeSkills: { employeeId, skills: skillsPayload }, event: 'pse_submit' } as any

            if (import.meta && import.meta.env && import.meta.env.DEV) {
              // Debug-only log for payload classification
              console.log('[AddSkill] submit payload', payload)
            }

            return payload
          }}
          data-testid="add-skill-form"
        >
          <div className="gba:flex-1 gba:space-y-3">
            <div className="gba:space-y-2 gba:w-full" data-testid="add-skill-search-container">
              <DebouncedInput
                key={inputKey}
                value={searchTerm}
                onChange={setSearchTerm}
                debounceDelay={300}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.add_skill_form.search_skill_placeholder',
                  'Search skill...'
                )}
                data-testid="add-skill-search-input"
                className="gba:w-full"
              />

              {/* Results dropdown */}
              {isDropdownOpen &&
                (isSearching || filteredResults.length > 0 || (searchTerm.trim() && filteredResults.length === 0)) && (
                  <Card className="gba:w-full" data-testid="add-skill-search-dropdown">
                    <CardContent
                      className={`gba:p-2 gba:space-y-1 gba:w-full gba:max-h-[250px] gba:overflow-y-auto ${!isSearching && filteredResults.length === 0 && searchTerm.trim() ? 'gba:px-3' : ''}`}
                    >
                      {isSearching && (
                        <div className="gba:text-muted-foreground" data-testid="add-skill-search-loading">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:employee_profile.details_layout.add_skill_form.loading_text',
                            'Loading...'
                          )}
                        </div>
                      )}
                      {!isSearching &&
                        filteredResults.slice(0, 5).map((sk: any) => (
                          <Button
                            key={sk.id}
                            variant="ghost"
                            className="gba:w-full gba:justify-start gba:text-left gba:items-start gba:py-2 gba:whitespace-normal gba:break-words gba:h-auto gba:min-h-10 gba:leading-normal"
                            onClick={() => handleSelectSkill({ id: sk.id, name: sk.name })}
                            data-testid={`add-skill-result-item-${sk.id}`}
                          >
                            <span className="gba:block gba:break-all">{sk.name}</span>
                          </Button>
                        ))}
                      {!isSearching && filteredResults.length === 0 && searchTerm.trim() && (
                        <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                          <div className="gba:text-muted-foreground" data-testid="add-skill-no-results-text">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:employee_profile.details_layout.add_skill_form.no_skill_match_text',
                              `No matching skill found for ${searchTerm.trim()}.`,
                              {
                                skillName: searchTerm.trim(),
                                interpolation: { escapeValue: false }
                              }
                            )}
                          </div>
                          <Button size="sm" onClick={handleAddNewSkill} data-testid="add-skill-add-button">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:employee_profile.details_layout.add_skill_form.add_skill_button_text',
                              'Add Skill'
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
            </div>

            {addError && (
              <div className="gba:text-destructive" data-testid="add-skill-error">
                {addError}
              </div>
            )}

            <span
              className="gba:block gba:text-muted-foreground gba:font-bold gba:mb-4 gba:mt-5"
              data-testid="add-skill-employee-skills-label"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.add_skill_form.employee_skills_label',
                'Employee Skills'
              )}
            </span>

            {/* Selected Skills chips (includes existing and newly selected) */}
            {selectedSkills.length > 0 && (
              <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid="add-skill-selected-container">
                {selectedSkills.map(s => (
                  <Badge
                    key={s.id}
                    variant="secondary"
                    className="gba:flex gba:items-center gba:gap-2 gba:h-10 gba:py-0 gba:px-4 gba:text-sm gba:max-w-full"
                    data-testid={`add-skill-selected-badge-${s.id}`}
                  >
                    <span className="gba:flex-1 gba:min-w-0 gba:px-1 gba:truncate" title={s.name}>
                      {s.name}
                    </span>
                    {s.isNew && (
                      <span
                        className="gba:text-xs gba:text-muted-foreground gba:ml-2 gba:flex-shrink-0"
                        data-testid={`add-skill-selected-badge-new-${s.id}`}
                      >
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:employee_profile.details_layout.add_skill_form.new_badge_text',
                          'New!'
                        )}
                      </span>
                    )}
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
                        handleRemoveSkill(s.id)
                      }}
                      onKeyDown={evt => {
                        if (evt.key === 'Enter' || evt.key === ' ') {
                          evt.preventDefault()
                          evt.stopPropagation()
                          handleRemoveSkill(s.id)
                        }
                      }}
                      aria-label={getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_profile.details_layout.add_skill_form.remove_aria_label',
                        'Remove'
                      )}
                      className="gba:cursor-pointer gba:rounded-full gba:p-0.5 gba:flex gba:items-center gba:flex-shrink-0 gba:ml-2"
                      data-testid={`add-skill-selected-remove-${s.id}`}
                    >
                      <XCircleIcon className="gba:w-3 gba:h-3" />
                    </span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </AppActionForm>
      </div>
    </div>
  )
}

export const AddSkill: React.FC<BusinessAppContextProps> = context => {
  return (
    <AddSkillProvider {...context}>
      <AddSkillContent {...context} />
    </AddSkillProvider>
  )
}

export default AddSkill
