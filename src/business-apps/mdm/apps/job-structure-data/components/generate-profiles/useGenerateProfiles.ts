import { useCallback, useMemo, useState } from 'react'
import { toast } from '@newwork/nw-design-system'
import { useJobProfileQueries } from '../../queries/useJobProfileQueries'
import { JobProfile, JobProfileMutationPayload } from '../../utils/JobProfile.types'
import { PartialJobFunction } from '../../utils/JobFunction.types'
import { JobLevel } from '../../utils/JobLevel.types'

export interface ProfileCombination {
  functionId: string
  levelId: string
  functionName: string
  functionCode: string
  levelName: string
  levelCode: string
  suggestedTitle: string
  code: string
}

const MAX_CODE_LENGTH = 20

function makePairKey(functionId: string, levelId: string): string {
  return `${functionId}__${levelId}`
}

function generateTitle(functionName: string, levelName: string): string {
  return `${levelName} ${functionName}`
}

function generateCode(functionCode: string, levelCode: string): string {
  return `${functionCode}_${levelCode}`
}

export function useGenerateProfiles(
  accessToken: string,
  jobFunctions: PartialJobFunction[],
  jobLevels: JobLevel[],
  existingProfiles: JobProfile[],
  refetch: () => Promise<void> | void
) {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [titleOverrides, setTitleOverrides] = useState<Map<string, string>>(new Map())
  const [isSaving, setIsSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState<{ current: number; total: number } | null>(null)

  const { createJobProfile } = useJobProfileQueries(accessToken)

  const existingPairs = useMemo(() => {
    const pairs = new Set<string>()
    for (const profile of existingProfiles) {
      if (profile.jobFunction?.id && profile.jobLevel?.id) {
        pairs.add(makePairKey(profile.jobFunction.id, profile.jobLevel.id))
      }
    }
    return pairs
  }, [existingProfiles])

  const existingCodes = useMemo(() => {
    return new Set(existingProfiles.map(p => p.code))
  }, [existingProfiles])

  const toggleCell = useCallback((functionId: string, levelId: string) => {
    const key = makePairKey(functionId, levelId)
    setSelectedCells(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const toggleRow = useCallback(
    (functionId: string) => {
      const selectableKeys = jobLevels
        .filter(level => !existingPairs.has(makePairKey(functionId, level.id)))
        .map(level => makePairKey(functionId, level.id))

      setSelectedCells(prev => {
        const allSelected = selectableKeys.every(key => prev.has(key))
        const next = new Set(prev)
        for (const key of selectableKeys) {
          if (allSelected) {
            next.delete(key)
          } else {
            next.add(key)
          }
        }
        return next
      })
    },
    [jobLevels, existingPairs]
  )

  const toggleColumn = useCallback(
    (levelId: string) => {
      const selectableKeys = jobFunctions
        .filter(fn => !existingPairs.has(makePairKey(fn.id, levelId)))
        .map(fn => makePairKey(fn.id, levelId))

      setSelectedCells(prev => {
        const allSelected = selectableKeys.every(key => prev.has(key))
        const next = new Set(prev)
        for (const key of selectableKeys) {
          if (allSelected) {
            next.delete(key)
          } else {
            next.add(key)
          }
        }
        return next
      })
    },
    [jobFunctions, existingPairs]
  )

  const selectAll = useCallback(() => {
    const allSelectable: string[] = []
    for (const fn of jobFunctions) {
      for (const level of jobLevels) {
        const key = makePairKey(fn.id, level.id)
        if (!existingPairs.has(key)) {
          allSelectable.push(key)
        }
      }
    }

    setSelectedCells(prev => {
      const allSelected = allSelectable.every(key => prev.has(key))
      if (allSelected) {
        return new Set()
      }
      return new Set(allSelectable)
    })
  }, [jobFunctions, jobLevels, existingPairs])

  const updateTitle = useCallback((pairKey: string, title: string) => {
    setTitleOverrides(prev => {
      const next = new Map(prev)
      next.set(pairKey, title)
      return next
    })
  }, [])

  const selectedCombinations = useMemo((): ProfileCombination[] => {
    const combinations: ProfileCombination[] = []

    for (const key of selectedCells) {
      const [functionId, levelId] = key.split('__')
      const fn = jobFunctions.find(f => f.id === functionId)
      const level = jobLevels.find(l => l.id === levelId)

      if (!fn || !level) continue

      const functionName = fn.name || ''
      const functionCode = fn.code || ''
      const levelName = level.name
      const levelCode = level.code

      const defaultTitle = generateTitle(functionName, levelName)
      const suggestedTitle = titleOverrides.get(key) ?? defaultTitle

      combinations.push({
        functionId,
        levelId,
        functionName,
        functionCode,
        levelName,
        levelCode,
        suggestedTitle,
        code: generateCode(functionCode, levelCode)
      })
    }

    return combinations.sort((a, b) => {
      const fnCompare = a.functionName.localeCompare(b.functionName)
      if (fnCompare !== 0) return fnCompare
      const levelA = jobLevels.find(l => l.id === a.levelId)?.hierarchyOrder ?? 0
      const levelB = jobLevels.find(l => l.id === b.levelId)?.hierarchyOrder ?? 0
      return levelA - levelB
    })
  }, [selectedCells, jobFunctions, jobLevels, titleOverrides])

  const validationErrors = useMemo(() => {
    const errors = new Map<string, string>()
    for (const combo of selectedCombinations) {
      if (existingCodes.has(combo.code)) {
        errors.set(combo.code, 'Code already exists')
      } else if (combo.code.length > MAX_CODE_LENGTH) {
        errors.set(combo.code, `Code exceeds ${MAX_CODE_LENGTH} characters`)
      }
      if (!combo.suggestedTitle.trim()) {
        const key = makePairKey(combo.functionId, combo.levelId)
        errors.set(key, 'Name is required')
      }
    }
    return errors
  }, [selectedCombinations, existingCodes])

  const getCreatableCombinations = useCallback(() => {
    return selectedCombinations.filter(c => {
      const titleKey = makePairKey(c.functionId, c.levelId)
      return !validationErrors.has(c.code) && !validationErrors.has(titleKey) && c.suggestedTitle.trim().length > 0
    })
  }, [selectedCombinations, validationErrors])

  const saveProfiles = useCallback(async (): Promise<{ succeeded: number; failed: number }> => {
    if (isSaving) return { succeeded: 0, failed: 0 }

    const toCreate = getCreatableCombinations()
    if (toCreate.length === 0) return { succeeded: 0, failed: 0 }

    setIsSaving(true)
    setSaveProgress({ current: 0, total: toCreate.length })

    let succeeded = 0
    let failed = 0

    for (let i = 0; i < toCreate.length; i++) {
      const combo = toCreate[i]
      const payload: JobProfileMutationPayload = {
        changeMode: 'INSERT',
        jobProfile: {
          code: combo.code,
          name: combo.suggestedTitle.trim(),
          description: '',
          jobFunction: combo.functionId,
          jobLevel: combo.levelId
        }
      }

      try {
        await createJobProfile(payload)
        succeeded++
      } catch (err) {
        failed++
        console.error(`Failed to create profile ${combo.code}:`, err)
      }

      setSaveProgress({ current: i + 1, total: toCreate.length })
    }

    setIsSaving(false)
    setSaveProgress(null)

    if (succeeded > 0) {
      toast.success(`Successfully created ${succeeded} job profile${succeeded > 1 ? 's' : ''}`)
      await refetch()
    }

    if (failed > 0) {
      toast.error(`Failed to create ${failed} job profile${failed > 1 ? 's' : ''}`)
    }

    return { succeeded, failed }
  }, [isSaving, getCreatableCombinations, createJobProfile, refetch])

  const resetSelection = useCallback(() => {
    setSelectedCells(new Set())
    setTitleOverrides(new Map())
    setSaveProgress(null)
  }, [])

  const isCellSelected = useCallback(
    (functionId: string, levelId: string) => selectedCells.has(makePairKey(functionId, levelId)),
    [selectedCells]
  )

  const isCellExisting = useCallback(
    (functionId: string, levelId: string) => existingPairs.has(makePairKey(functionId, levelId)),
    [existingPairs]
  )

  const isRowFullySelected = useCallback(
    (functionId: string) => {
      const selectableLevels = jobLevels.filter(level => !existingPairs.has(makePairKey(functionId, level.id)))
      if (selectableLevels.length === 0) return false
      return selectableLevels.every(level => selectedCells.has(makePairKey(functionId, level.id)))
    },
    [jobLevels, existingPairs, selectedCells]
  )

  const isColumnFullySelected = useCallback(
    (levelId: string) => {
      const selectableFunctions = jobFunctions.filter(fn => !existingPairs.has(makePairKey(fn.id, levelId)))
      if (selectableFunctions.length === 0) return false
      return selectableFunctions.every(fn => selectedCells.has(makePairKey(fn.id, levelId)))
    },
    [jobFunctions, existingPairs, selectedCells]
  )

  return {
    selectedCells,
    existingPairs,
    titleOverrides,
    isSaving,
    saveProgress,
    selectedCombinations,
    validationErrors,
    getCreatableCombinations,

    toggleCell,
    toggleRow,
    toggleColumn,
    selectAll,
    updateTitle,
    saveProfiles,
    resetSelection,

    isCellSelected,
    isCellExisting,
    isRowFullySelected,
    isColumnFullySelected,

    makePairKey
  }
}
