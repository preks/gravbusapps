import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { useForm } from 'react-hook-form'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { AddSkillProvider, useAddSkill } from './AddSkillContext'
import { DebouncedInput } from '@/components/debounced-input'
import { getSkillValidationError, buildEmployeeSkillsPayload } from './utils/addSkillUtils'
import { AddSkillSearchDropdown } from './components/AddSkillSearchDropdown'
import { SelectedSkillsChips } from './components/SelectedSkillsChips'
import { XCircleIcon } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button } from '@newwork/nw-design-system'

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
  const [pendingSkills, setPendingSkills] = useState<Array<{ id: string; name: string; level: number }>>([])
  const [inputKey, setInputKey] = useState(0)
  const [addedNames, setAddedNames] = useState<string[]>([])
  const [addError, setAddError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Hardcoded skill categories
  const skillCategories = [
    { value: 'all', label: 'All Categories' },
    { value: 'technical', label: 'Technical Skills' },
    { value: 'soft', label: 'Soft Skills' },
    { value: 'languages', label: 'Languages' },
    { value: 'certifications', label: 'Certifications' },
    { value: 'tools', label: 'Tools & Software' },
    { value: 'domain', label: 'Domain Knowledgeeeeeeeeee' }
  ]

  // Filter search results to exclude already selected skills (by id or name) - both in employee skills and pending
  const filteredResults = useMemo(() => {
    const selectedIdSet = new Set(selectedSkills.map(s => s.id))
    const selectedNameSet = new Set(selectedSkills.map(s => (s.name || '').trim().toLowerCase()))
    const pendingIdSet = new Set(pendingSkills.map(s => s.id))
    const pendingNameSet = new Set(pendingSkills.map(s => (s.name || '').trim().toLowerCase()))
    return (results || []).filter((sk: any) => {
      const id = sk?.id
      const nameKey = (sk?.name || '').trim().toLowerCase()
      if (id && (selectedIdSet.has(id) || pendingIdSet.has(id))) return false
      if (nameKey && (selectedNameSet.has(nameKey) || pendingNameSet.has(nameKey))) return false
      return true
    })
  }, [results, selectedSkills, pendingSkills])

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
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isSubmitDisabled = useMemo(() => {
    const initial = ((employee?.skills || []) as Array<{ skill?: { id: string } }>)
      .map(s => s.skill?.id)
      .filter(Boolean)
    const current = selectedSkills.map(s => s.id)
    const changed = initial.length !== current.length || initial.some(id => !current.includes(id as string))
    return !changed
  }, [employee?.skills, selectedSkills])
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
        // Clear any pending blur timeout when search is cleared
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current)
          blurTimeoutRef.current = null
        }
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
    // Add to pending skills with default level 1
    setPendingSkills(prev => {
      if (prev.find(x => x.id === sk.id)) return prev
      return [...prev, { ...sk, level: 1 }]
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
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
  }

  const nextNewIdRef = useRef(1)

  const handleAddNewSkill = async () => {
    const name = searchTerm.trim()
    if (!name) return
    // validations
    const validationError = getSkillValidationError(name)
    if (validationError) {
      setAddError(validationError)
      return
    }
    setAddError(null)
    // Add to pending skills with default level 1
    const newId = `new-${nextNewIdRef.current++}`
    setPendingSkills(prev => {
      const existsByName = prev.some(s => s.name.toLowerCase() === name.toLowerCase())
      if (existsByName) return prev
      return [...prev, { id: newId, name, level: 1 }]
    })
    setAddedNames(prev => Array.from(new Set([...prev, name])))
    try {
      const fetched = await createSkillAndFetchByNames(name, addedNames)
      setPendingSkills(prev => {
        const byName: Record<string, any> = {}
        fetched.forEach(sk => {
          byName[sk.name.toLowerCase()] = sk
        })
        return prev.map(s => {
          const resolved = byName[s.name.toLowerCase()]
          return resolved ? { id: resolved.id, name: resolved.name, level: s.level } : s
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

  const handleRemovePendingSkill = (id: string) => {
    setPendingSkills(prev => prev.filter(s => s.id !== id))
  }

  const handleSearchBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Use setTimeout to allow clicks on dropdown items to register first
    blurTimeoutRef.current = setTimeout(() => {
      // Check if focus moved to dropdown
      const relatedTarget = e.relatedTarget as HTMLElement
      if (
        dropdownRef.current &&
        (dropdownRef.current.contains(relatedTarget) ||
          relatedTarget?.closest('[data-testid="add-skill-search-dropdown"]'))
      ) {
        return // Keep dropdown open if focus moved to dropdown
      }
      // Only hide dropdown, keep results so they can be shown again on refocus
      setIsDropdownOpen(false)
    }, 150)
  }, [])

  const handleSearchFocus = useCallback(() => {
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    // If there's a search term, reopen the dropdown
    const term = searchTerm.trim()
    if (term) {
      // If we have results, just reopen the dropdown
      if (results.length > 0) {
        setIsDropdownOpen(true)
      } else if (!isSearching) {
        // If no results but we have a search term, the useEffect will handle the search
        // Just ensure dropdown will open when results arrive
        setIsDropdownOpen(true)
      }
    }
  }, [searchTerm, results, isSearching])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        // Only hide dropdown, keep results so they can be shown again on refocus
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isDropdownOpen])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  const handleUpdatePendingSkillLevel = (id: string, level: number) => {
    setPendingSkills(prev => prev.map(s => (s.id === id ? { ...s, level } : s)))
  }

  const handleAddPendingSkillToEmployee = (pendingSkill: { id: string; name: string; level: number }) => {
    // Add to employee skills
    setSelectedSkills(prev => {
      if (prev.find(x => x.id === pendingSkill.id)) return prev
      return [...prev, { id: pendingSkill.id, name: pendingSkill.name, isNew: false }]
    })
    // Remove from pending
    setPendingSkills(prev => prev.filter(s => s.id !== pendingSkill.id))
  }

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full"
      data-testid="flw_addSkills_addSkillsContainer"
    >
      <FormHeader
        title={title}
        flowIconUrl={flowIconUrl}
        employee={
          employee
            ? {
                firstName: employee.firstName,
                lastName: employee.lastName,
                pictureThumbnail: employee.pictureThumbnail,
                jobTitle: Array.isArray(employee.employeePosition)
                  ? employee.employeePosition?.[0]?.jobPosition?.name
                  : (employee.employeePosition as any)?.jobPosition?.name
              }
            : undefined
        }
      />

      <div
        className="gba:flex gba:flex-col gba:[&>div[data-testid='add-skill-form']]:!pt-0"
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
          onSubmit={async (values: AddSkillFormValues) => {
            const employeeId = ctxEmployeeId || values.targetEmployeeId
            const existingSkills = employee?.skills || []
            const selectedIds = selectedSkills.map(s => s.id)

            const payload = buildEmployeeSkillsPayload({
              employeeId,
              selectedSkillIds: selectedIds,
              existingSkills: existingSkills as any,
              event: 'pse_submit'
            })
            return payload
          }}
          data-testid="add-skill-form"
        >
          <div className="gba:flex-1 gba:space-y-3">
            <span
              className="gba:block gba:text-muted-foreground gba:font-bold gba:mb-2"
              data-testid="add-skill-search-title"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.add_skill_form.search_skills_title',
                'Search Skills'
              )}
            </span>
            <div className="gba:flex gba:flex-col gba:gap-2" data-testid="add-skill-search-filters">
              <div className="gba:w-full gba:max-w-[200px]">
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                  data-testid="add-skill-category-select"
                >
                  <SelectTrigger
                    size="sm"
                    className="gba:w-full [&>span:first-child]:gba:flex-1 [&>span:first-child]:gba:min-w-0 [&>span:last-child]:gba:flex-shrink-0"
                  >
                    <SelectValue placeholder="Category">
                      {(() => {
                        const selected = skillCategories.find(cat => cat.value === selectedCategory)
                        return selected ? (
                          <span className="gba:block gba:truncate gba:text-left gba:overflow-hidden gba:whitespace-nowrap gba:max-w-full gba:min-w-0">
                            {selected.label}
                          </span>
                        ) : null
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="gba:min-w-[200px]">
                    {skillCategories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div
                className="gba:relative gba:w-full"
                data-testid="add-skill-search-container"
                ref={searchContainerRef}
              >
                <DebouncedInput
                  key={inputKey}
                  value={searchTerm}
                  onChange={setSearchTerm}
                  onBlur={handleSearchBlur}
                  onFocus={handleSearchFocus}
                  debounceDelay={300}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.details_layout.add_skill_form.search_skill_placeholder',
                    'Search skill...'
                  )}
                  data-testid="flw_addSkills_searchInput"
                  className="gba:w-full"
                />

                {/* Results dropdown - floating above content */}
                <AddSkillSearchDropdown
                  ref={dropdownRef}
                  isOpen={
                    isDropdownOpen &&
                    (isSearching ||
                      filteredResults.length > 0 ||
                      (searchTerm.trim().length > 0 && filteredResults.length === 0))
                  }
                  isSearching={isSearching}
                  filteredResults={filteredResults as any}
                  searchTerm={searchTerm}
                  onSelect={handleSelectSkill}
                  onAddNew={handleAddNewSkill}
                />
              </div>
            </div>

            {addError && (
              <div className="gba:text-destructive" data-testid="add-skill-error">
                {addError}
              </div>
            )}

            {/* Selected Skills section - pending skills with level input */}
            {pendingSkills.length > 0 && (
              <div className="gba:space-y-2 gba:mt-5">
                <span
                  className="gba:block gba:text-muted-foreground gba:font-bold gba:mb-4"
                  data-testid="add-skill-selected-skills-label"
                >
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.details_layout.add_skill_form.selected_skills_label',
                    'Select Skill Level'
                  )}
                </span>
                <div
                  className="gba:flex gba:flex-col gba:gap-2 gba:max-h-[350px] gba:overflow-y-auto"
                  data-testid="add-skill-pending-container"
                >
                  {pendingSkills.map(skill => (
                    <div
                      key={skill.id}
                      className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:border gba:border-border gba:rounded-lg gba:bg-card"
                      data-testid={`add-skill-pending-item-${skill.id}`}
                    >
                      <span className="gba:flex-1 gba:min-w-0 gba:truncate" title={skill.name}>
                        {skill.name}
                      </span>
                      <Select
                        value={skill.level.toString()}
                        onValueChange={value => handleUpdatePendingSkillLevel(skill.id, parseInt(value, 10))}
                        data-testid={`add-skill-pending-level-${skill.id}`}
                      >
                        <SelectTrigger className="gba:w-20" size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => i + 1).map(level => (
                            <SelectItem key={level} value={level.toString()}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddPendingSkillToEmployee(skill)}
                        data-testid={`add-skill-pending-add-${skill.id}`}
                      >
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:employee_profile.details_layout.add_skill_form.add_button',
                          'Add'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePendingSkill(skill.id)}
                        aria-label={getTranslationFromI18nKeyAndLabel(
                          'lowcoder:employee_profile.details_layout.add_skill_form.remove_aria_label',
                          'Remove'
                        )}
                        data-testid={`add-skill-pending-remove-${skill.id}`}
                        className="gba:p-1"
                      >
                        <XCircleIcon className="gba:w-4 gba:h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <span
              className="gba:block gba:text-muted-foreground gba:font-bold gba:mb-4 gba:mt-5"
              data-testid="add-skill-employee-skills-label"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.add_skill_form.current_employee_skills_label',
                'Current Employee Skills'
              )}
            </span>

            {/* Selected Skills chips (includes existing and newly selected) */}
            <SelectedSkillsChips skills={selectedSkills as any} onRemove={handleRemoveSkill} />
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
