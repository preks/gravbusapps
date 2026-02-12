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
import { SkillLevelRow } from './components/SkillLevelRow'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '@/business-apps/hr/core/apps/employee-record/_i18n'

interface AddSkillFormValues {
  targetEmployeeId?: string
}

const AddSkillContent: React.FC<BusinessAppContextProps> = () => {
  const { t } = useTranslation(translations)
  const {
    data,
    searchSkills,
    createSkillAndFetchByNames,
    employeeId: ctxEmployeeId,
    changeLevelParams,
    error: contextError,
    isLoading: contextLoading
  } = useAddSkill()
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<Array<any>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<
    Array<{ id: string; name: string; isNew?: boolean; level?: number }>
  >([])
  const [pendingSkills, setPendingSkills] = useState<Array<{ id: string; name: string; level: number }>>([])
  const [inputKey, setInputKey] = useState(0)
  const [addedNames, setAddedNames] = useState<string[]>([])
  const [addError, setAddError] = useState<string | null>(null)

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
    defaultValues: { targetEmployeeId: undefined },
    mode: 'onChange',
    shouldUnregister: true
  })

  const title = useMemo(
    () => (changeLevelParams ? t('add-skill-form-update-level-title') : t('add-skill-form-title')),
    [changeLevelParams, t]
  )

  const employee = data?.employee

  const normalizedDefaults: AddSkillFormValues = useMemo(() => ({ targetEmployeeId: employee?.id }), [employee?.id])

  useEffect(() => {
    const skills = (employee?.skills || []) as Array<{
      skill?: { id: string; name: string }
      level?: string | number | null
    }>
    if (changeLevelParams?.skillId) {
      const match = skills.find(s => s.skill?.id === changeLevelParams.skillId)
      if (match) {
        let level = 1
        if (changeLevelParams.currentLevel != null) {
          level = Math.max(1, Math.min(10, changeLevelParams.currentLevel))
        } else if (match.level !== null && match.level !== undefined) {
          const parsed = typeof match.level === 'string' ? Number.parseInt(match.level, 10) : match.level
          level = Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(10, parsed))
        }
        setSelectedSkills([
          { id: match.skill?.id ?? changeLevelParams.skillId, name: match.skill?.name ?? '', isNew: false, level }
        ])
      }
      return
    }
    const existing = skills.map(s => {
      let level = 1
      if (s.level !== null && s.level !== undefined) {
        const parsed = typeof s.level === 'string' ? Number.parseInt(s.level, 10) : s.level
        level = Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(10, parsed))
      }
      return { id: s.skill?.id || '', name: s.skill?.name || '', isNew: false, level }
    })
    const deduped: Record<string, { id: string; name: string; isNew: boolean; level: number }> = {}
    existing.forEach(s => {
      if (s.id) deduped[s.id] = s
    })
    setSelectedSkills(Object.values(deduped))
  }, [employee?.skills, changeLevelParams?.skillId, changeLevelParams?.currentLevel])

  const suppressOpenRef = useRef(false)
  const searchSeqRef = useRef(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isSubmitDisabled = useMemo(() => {
    const initialSkills = employee?.skills ?? []
    const initialSkillMap = new Map<string, number>()
    initialSkills.forEach((s: { skill?: { id: string }; level?: string | number | null }) => {
      const skillId = s.skill?.id
      if (skillId) {
        let level = 1
        if (s.level !== null && s.level !== undefined) {
          const parsed = typeof s.level === 'string' ? Number.parseInt(s.level, 10) : s.level
          level = Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(10, parsed))
        }
        initialSkillMap.set(skillId, level)
      }
    })
    const currentSkillMap = new Map<string, number>()
    selectedSkills.forEach(s => currentSkillMap.set(s.id, s.level || 1))
    if (changeLevelParams?.skillId) {
      const initialLevel = initialSkillMap.get(changeLevelParams.skillId) ?? 1
      const currentLevel = currentSkillMap.get(changeLevelParams.skillId) ?? 1
      return initialLevel === currentLevel
    }
    const skillsChanged =
      initialSkillMap.size !== currentSkillMap.size ||
      Array.from(initialSkillMap.keys()).some(id => !currentSkillMap.has(id)) ||
      Array.from(currentSkillMap.keys()).some(id => !initialSkillMap.has(id))
    const levelsChanged = Array.from(initialSkillMap.entries()).some(([id, level]) => {
      const currentLevel = currentSkillMap.get(id)
      return currentLevel !== undefined && currentLevel !== level
    })
    return !(skillsChanged || levelsChanged)
  }, [employee?.skills, selectedSkills, changeLevelParams?.skillId])

  useEffect(() => {
    let isActive = true
    const run = async () => {
      if (suppressOpenRef.current) {
        suppressOpenRef.current = false
        if (isActive) setIsDropdownOpen(false)
        setResults([])
        return
      }
      const term = searchTerm.trim()
      if (!term) {
        if (isActive) setResults([])
        if (isActive) setIsDropdownOpen(false)
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
    setPendingSkills(prev => (prev.some(x => x.id === sk.id) ? prev : [...prev, { ...sk, level: 1 }]))
    suppressOpenRef.current = true
    searchSeqRef.current += 1
    setIsDropdownOpen(false)
    setSearchTerm('')
    setResults([])
    setIsSearching(false)
    setInputKey(prev => prev + 1)
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
  }

  const nextNewIdRef = useRef(1)

  const applyFetchedToPending = useCallback(
    (
      prev: Array<{ id: string; name: string; level: number }>,
      fetched: Array<{ id: string; name: string }>
    ): Array<{ id: string; name: string; level: number }> =>
      prev.map(s => {
        const resolved = fetched.find(r => r.name.toLowerCase() === s.name.toLowerCase())
        return resolved === undefined ? s : { id: resolved.id, name: resolved.name, level: s.level }
      }),
    []
  )

  const handleAddNewSkill = async () => {
    const name = searchTerm.trim()
    if (!name) return
    const validationError = getSkillValidationError(name)
    if (validationError) {
      setAddError(validationError)
      return
    }
    setAddError(null)
    const newId = `new-${nextNewIdRef.current++}`
    setPendingSkills(prev => {
      if (prev.some(s => s.name.toLowerCase() === name.toLowerCase())) return prev
      return [...prev, { id: newId, name, level: 1 }]
    })
    setAddedNames(prev => Array.from(new Set([...prev, name])))
    try {
      const fetched = await createSkillAndFetchByNames(name, addedNames)
      setPendingSkills(prev => applyFetchedToPending(prev, fetched))
    } catch (e) {
      setAddError(e instanceof Error ? e.message : t('add-skill-form-skill-add-error'))
    }
    suppressOpenRef.current = true
    searchSeqRef.current += 1
    setIsDropdownOpen(false)
    setSearchTerm('')
    setResults([])
    setIsSearching(false)
    setInputKey(prev => prev + 1)
  }

  const handleRemoveSkill = (id: string) => setSelectedSkills(prev => prev.filter(s => s.id !== id))
  const handleRemovePendingSkill = (id: string) => setPendingSkills(prev => prev.filter(s => s.id !== id))

  const runBlurCloseCheck = useCallback((relatedTarget: HTMLElement | null) => {
    if (
      dropdownRef.current &&
      (dropdownRef.current.contains(relatedTarget) ||
        relatedTarget?.closest('[data-testid="add-skill-search-dropdown"]'))
    )
      return
    setIsDropdownOpen(false)
  }, [])

  const handleSearchBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      blurTimeoutRef.current = setTimeout(() => runBlurCloseCheck(e.relatedTarget as HTMLElement), 150)
    },
    [runBlurCloseCheck]
  )

  const handleSearchFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    const term = searchTerm.trim()
    if (term && (results.length > 0 || !isSearching)) setIsDropdownOpen(true)
  }, [searchTerm, results, isSearching])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      )
        setIsDropdownOpen(false)
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  useEffect(
    () => () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    },
    []
  )

  const handleUpdatePendingSkillLevel = (id: string, level: number) =>
    setPendingSkills(prev => prev.map(s => (s.id === id ? { ...s, level } : s)))

  const handleUpdateExistingSkillLevel = (id: string, level: number) =>
    setSelectedSkills(prev => prev.map(s => (s.id === id ? { ...s, level } : s)))

  const handleAddPendingSkillToEmployee = (pendingSkill: { id: string; name: string; level: number }) => {
    setSelectedSkills(prev =>
      prev.some(x => x.id === pendingSkill.id)
        ? prev
        : [...prev, { id: pendingSkill.id, name: pendingSkill.name, isNew: false, level: pendingSkill.level }]
    )
    setPendingSkills(prev => prev.filter(s => s.id !== pendingSkill.id))
  }

  if (!contextLoading && contextError) {
    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:p-4"
        data-testid="flw_addSkills_addSkillsContainer"
      >
        <div className="gba:text-destructive gba:text-sm" data-testid="add-skill-context-error">
          {contextError}
        </div>
      </div>
    )
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
            const existingSkillsList = (employee?.skills || []) as Array<{
              skill?: { id: string }
              level?: string | number | null
            }>
            let selectedIds: string[]
            const selectedLevels = new Map<string, number>()
            if (changeLevelParams?.skillId) {
              selectedIds = existingSkillsList.map(s => s.skill?.id).filter(Boolean) as string[]
              existingSkillsList.forEach(s => {
                const skillId = s.skill?.id
                if (!skillId) return
                let level = 1
                if (s.level !== null && s.level !== undefined) {
                  const parsed = typeof s.level === 'string' ? Number.parseInt(s.level, 10) : s.level
                  level = Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(10, parsed))
                }
                selectedLevels.set(skillId, level)
              })
              const editedLevel = selectedSkills.find(s => s.id === changeLevelParams.skillId)?.level ?? 1
              selectedLevels.set(changeLevelParams.skillId, editedLevel)
            } else {
              selectedIds = selectedSkills.map(s => s.id)
              selectedSkills.forEach(s => selectedLevels.set(s.id, s.level || 1))
            }
            return buildEmployeeSkillsPayload({
              employeeId,
              selectedSkillIds: selectedIds,
              selectedSkillLevels: selectedLevels,
              existingSkills: existingSkillsList as any,
              event: 'pse_submit'
            })
          }}
          data-testid="add-skill-form"
        >
          <div className="gba:flex-1 gba:space-y-3">
            {!changeLevelParams ? (
              <>
                <span
                  className="gba:block gba:text-muted-foreground gba:font-bold gba:mb-2"
                  data-testid="add-skill-search-title"
                >
                  {t('add-skill-form-search-skills-title')}
                </span>
                <div className="gba:flex gba:flex-col gba:gap-2" data-testid="add-skill-search-filters">
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
                      placeholder={t('add-skill-form-search-skill-placeholder')}
                      data-testid="flw_addSkills_searchInput"
                      className="gba:w-full"
                    />
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

                {pendingSkills.length > 0 && (
                  <div className="gba:space-y-2 gba:mt-5">
                    <span
                      className="gba:block gba:text-muted-foreground gba:font-bold gba:mb-4"
                      data-testid="add-skill-selected-skills-label"
                    >
                      {t('add-skill-form-selected-skills-label')}
                    </span>
                    <div
                      className="gba:flex gba:flex-col gba:gap-2 gba:max-h-[350px] gba:overflow-y-auto"
                      data-testid="add-skill-pending-container"
                    >
                      {pendingSkills.map(skill => (
                        <SkillLevelRow
                          key={skill.id}
                          skillName={skill.name}
                          onRemove={() => handleRemovePendingSkill(skill.id)}
                          dataTestIdPrefix="add-skill-pending"
                          removeButtonTestId={`skill-level-row-remove-${skill.id}`}
                          rowId={skill.id}
                          levelContent={
                            <Select
                              value={skill.level.toString()}
                              onValueChange={value =>
                                handleUpdatePendingSkillLevel(skill.id, Number.parseInt(value, 10))
                              }
                              data-testid={`skill-level-select-${skill.id}`}
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
                          }
                          actionButton={
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleAddPendingSkillToEmployee(skill)}
                              data-testid={`add-skill-pending-add-${skill.id}`}
                            >
                              {t('add-skill-form-add-button')}
                            </Button>
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                <span
                  className="gba:block gba:text-muted-foreground gba:font-bold gba:mb-4 gba:mt-5"
                  data-testid="add-skill-employee-skills-label"
                >
                  {t('add-skill-form-current-employee-skills-label')}
                </span>
              </>
            ) : (
              <span
                className="gba:block gba:text-muted-foreground gba:font-bold gba:mb-4"
                data-testid="add-skill-change-level-label"
              >
                {t('add-skill-form-update-level-title')}
              </span>
            )}

            {selectedSkills.length > 0 ? (
              <div
                className="gba:flex gba:flex-col gba:gap-2 gba:max-h-[350px] gba:overflow-y-auto"
                data-testid="add-skill-existing-container"
              >
                {selectedSkills
                  .filter(skill => skill.level !== undefined)
                  .map(skill => (
                    <SkillLevelRow
                      key={skill.id}
                      skillName={skill.name}
                      onRemove={() => handleRemoveSkill(skill.id)}
                      dataTestIdPrefix="add-skill-existing"
                      removeButtonTestId={`skill-level-row-remove-${skill.id}`}
                      rowId={skill.id}
                      showRemove={!changeLevelParams}
                      levelContent={
                        <Select
                          value={(skill.level || 1).toString()}
                          onValueChange={value => handleUpdateExistingSkillLevel(skill.id, Number.parseInt(value, 10))}
                          data-testid={`skill-level-select-${skill.id}`}
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
                      }
                    />
                  ))}
              </div>
            ) : (
              !changeLevelParams && (
                <div className="gba:text-sm gba:text-muted-foreground gba:py-2">
                  {t('add-skill-form-no-current-skills')}
                </div>
              )
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
