import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getSkillValidationError } from '../utils/addSkillUtils'
import type { AddSkillFormValues, SelectedSkill, SkillOption } from '../addSkill.types'

interface UseAddSkillFormControllerParams {
  employee: any
  flowFormParams: any
  changeLevelParams: any
  searchSkills: (term: string) => Promise<any[]>
}

const clampLevel = (level: string | number | null | undefined) => {
  if (level === null || level === undefined) return 1
  const parsed = typeof level === 'string' ? Number.parseInt(level, 10) : level
  return Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(10, parsed))
}

export const useAddSkillFormController = ({
  employee,
  flowFormParams,
  changeLevelParams,
  searchSkills
}: UseAddSkillFormControllerParams) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>([])
  const [skillsToAssign, setSkillsToAssign] = useState<SelectedSkill[]>([])
  const [inputKey, setInputKey] = useState(0)
  const [addError, setAddError] = useState<string | null>(null)
  const [verificationFileList, setVerificationFileList] = useState<any[]>([])

  const suppressOpenRef = useRef(false)
  const searchSeqRef = useRef(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const nextNewIdRef = useRef(1)

  const normalizedDefaults: AddSkillFormValues = useMemo(() => ({ targetEmployeeId: employee?.id }), [employee?.id])

  const filteredResults = useMemo(() => {
    const selectedIdSet = new Set(selectedSkills.map(s => s.id))
    const assignIdSet = new Set(skillsToAssign.map(s => s.id))
    const assignNameSet = new Set(skillsToAssign.map(s => (s.name || '').trim().toLowerCase()))

    return (results || []).filter((sk: any) => {
      const id = sk?.id
      const nameKey = (sk?.name || '').trim().toLowerCase()
      if (id && (selectedIdSet.has(id) || assignIdSet.has(id))) return false
      if (nameKey && assignNameSet.has(nameKey)) return false
      return true
    })
  }, [results, selectedSkills, skillsToAssign])

  const existingSkillsList = useMemo(
    () =>
      (employee?.skills || []) as Array<{
        skill?: { id: string; name: string }
        level?: string | number | null
        validTo?: string | null
      }>,
    [employee?.skills]
  )

  useEffect(() => {
    if (changeLevelParams?.skillId) {
      const match = existingSkillsList.find(s => s.skill?.id === changeLevelParams.skillId)
      const level =
        typeof changeLevelParams.currentLevel === 'number'
          ? clampLevel(changeLevelParams.currentLevel)
          : clampLevel(match?.level)
      const name = match?.skill?.name ?? changeLevelParams.skillName ?? ''
      setSelectedSkills([{ id: changeLevelParams.skillId, name, isNew: false, level }])
      return
    }

    const deduped: Record<string, SelectedSkill> = {}
    existingSkillsList.forEach(s => {
      const skillId = s.skill?.id
      if (skillId != null) {
        deduped[skillId] = {
          id: skillId,
          name: s.skill?.name ?? '',
          isNew: false,
          level: clampLevel(s.level)
        }
      }
    })
    setSelectedSkills(Object.values(deduped))
  }, [existingSkillsList, changeLevelParams?.skillId, changeLevelParams?.skillName, changeLevelParams?.currentLevel])

  const isSubmitDisabled = useMemo(() => {
    if (flowFormParams?.mode === 'attachVerification') {
      return verificationFileList.length === 0
    }
    if (flowFormParams?.mode === 'deactivate' || flowFormParams?.mode === 'activate') return false

    const initialSkillMap = new Map<string, number>()
    existingSkillsList.forEach(s => {
      if (s.skill?.id) initialSkillMap.set(s.skill.id, clampLevel(s.level))
    })

    const currentSkillMap = new Map<string, number>()
    selectedSkills.forEach(s => currentSkillMap.set(s.id, s.level || 1))

    if (changeLevelParams?.skillId) {
      const initialLevel = initialSkillMap.get(changeLevelParams.skillId) ?? 1
      const currentLevel = currentSkillMap.get(changeLevelParams.skillId) ?? 1
      return initialLevel === currentLevel
    }

    if (skillsToAssign.length > 0) return false

    const skillsChanged =
      initialSkillMap.size !== currentSkillMap.size ||
      Array.from(initialSkillMap.keys()).some(id => !currentSkillMap.has(id)) ||
      Array.from(currentSkillMap.keys()).some(id => !initialSkillMap.has(id))

    const levelsChanged = Array.from(initialSkillMap.entries()).some(([id, level]) => {
      const currentLevel = currentSkillMap.get(id)
      return currentLevel !== undefined && currentLevel !== level
    })

    return !(skillsChanged || levelsChanged)
  }, [
    existingSkillsList,
    selectedSkills,
    skillsToAssign,
    changeLevelParams?.skillId,
    flowFormParams?.mode,
    verificationFileList
  ])

  const activeSelectedSkills = useMemo(
    () =>
      selectedSkills.filter(skill => {
        if (skill.level === undefined) return false
        const empSkill = existingSkillsList.find(s => s.skill?.id === skill.id)
        const isDeactivated = empSkill?.validTo ? new Date(empSkill.validTo) <= new Date() : false
        if (isDeactivated) return false
        return true
      }),
    [existingSkillsList, selectedSkills]
  )

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

  const resetSearchInputState = useCallback(() => {
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
  }, [])

  const handleSelectSkill = useCallback(
    (skill: SkillOption) => {
      setSkillsToAssign(prev =>
        prev.some(x => x.id === skill.id) ? prev : [...prev, { ...skill, isNew: false, level: 1 }]
      )
      resetSearchInputState()
    },
    [resetSearchInputState]
  )

  const handleAddNewSkill = useCallback(() => {
    const name = searchTerm.trim()
    if (!name) return

    const validationError = getSkillValidationError(name)
    if (validationError) {
      setAddError(validationError)
      return
    }

    setAddError(null)
    const newId = `new-${nextNewIdRef.current++}`
    setSkillsToAssign(prev => {
      if (prev.some(s => s.name.toLowerCase() === name.toLowerCase())) return prev
      return [...prev, { id: newId, name, isNew: true, level: 1 }]
    })

    resetSearchInputState()
  }, [searchTerm, resetSearchInputState])

  const runBlurCloseCheck = useCallback((relatedTarget: HTMLElement | null) => {
    if (
      dropdownRef.current &&
      (dropdownRef.current.contains(relatedTarget) ||
        relatedTarget?.closest('[data-testid="add-skill-search-dropdown"]'))
    ) {
      return
    }
    setIsDropdownOpen(false)
  }, [])

  const handleSearchBlur = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      blurTimeoutRef.current = setTimeout(() => runBlurCloseCheck(event.relatedTarget as HTMLElement), 150)
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
      ) {
        setIsDropdownOpen(false)
      }
    }

    if (!isDropdownOpen) return
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isDropdownOpen])

  useEffect(
    () => () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    },
    []
  )

  const handleDesignSystemFilesChange = useCallback((files: any[]) => {
    const mapped = files
      .map((f: any) => {
        let rawFile: File | null = null
        if (f?.file instanceof File) {
          rawFile = f.file
        } else if (f?.originFileObj instanceof File) {
          rawFile = f.originFileObj
        }
        if (!(rawFile instanceof File)) {
          return null
        }
        return {
          uid: String(f?.id ?? rawFile.name),
          name: rawFile.name,
          status: 'done',
          originFileObj: rawFile
        }
      })
      .filter(Boolean)
      .map(item => item as any)
    setTimeout(() => setVerificationFileList(mapped), 0)
  }, [])

  const handleRemoveSkill = useCallback((id: string) => {
    setSelectedSkills(prev => prev.filter(s => s.id !== id))
  }, [])

  const handleRemoveSkillToAssign = useCallback((id: string) => {
    setSkillsToAssign(prev => prev.filter(s => s.id !== id))
  }, [])

  const handleUpdateSkillToAssignLevel = useCallback((id: string, level: number) => {
    setSkillsToAssign(prev => prev.map(s => (s.id === id ? { ...s, level } : s)))
  }, [])

  const handleUpdateExistingSkillLevel = useCallback((id: string, level: number) => {
    setSelectedSkills(prev => prev.map(s => (s.id === id ? { ...s, level } : s)))
  }, [])

  return {
    normalizedDefaults,
    existingSkillsList,
    filteredResults,
    activeSelectedSkills,
    isSubmitDisabled,
    searchTerm,
    setSearchTerm,
    isSearching,
    isDropdownOpen,
    setIsDropdownOpen,
    selectedSkills,
    skillsToAssign,
    inputKey,
    addError,
    verificationFileList,
    dropdownRef,
    searchContainerRef,
    handleDesignSystemFilesChange,
    handleSelectSkill,
    handleAddNewSkill,
    handleSearchBlur,
    handleSearchFocus,
    handleRemoveSkill,
    handleRemoveSkillToAssign,
    handleUpdateSkillToAssignLevel,
    handleUpdateExistingSkillLevel
  }
}
