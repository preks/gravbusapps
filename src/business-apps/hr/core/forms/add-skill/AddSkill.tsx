import React, { useEffect, useMemo, useRef, useState } from 'react'
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
    const validationError = getSkillValidationError(name)
    if (validationError) {
      setAddError(validationError)
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
                data-testid="flw_addSkills_searchInput"
                className="gba:w-full"
              />

              {/* Results dropdown */}
              <AddSkillSearchDropdown
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
