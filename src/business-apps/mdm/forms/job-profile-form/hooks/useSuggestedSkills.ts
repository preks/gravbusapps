import { useState, useCallback } from 'react'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_SKILLS_BY_NAMES } from '@/business-apps/hr/core/forms/add-skill/AddSkillQueries'
import { env } from '@/common/env/EnvUtils'
import { useSkillsFromFile } from './useSkillsFromFile'
import type { AgentSkillItem, JobDescriptionFileValue } from './useSkillsFromFile'

interface SkillFormValue {
  skillId: string
  skillName: string
  level: number | null
}

interface SkillCategoryOption {
  id: string
  name: string
}

interface UseSuggestedSkillsOptions {
  accessToken: string
  replace: (value: SkillFormValue[]) => void
  append: (value: SkillFormValue) => void
  selectedSkillIds: Set<string>
  jobDescriptionFile: JobDescriptionFileValue
  jobTitle: string
  skillCategories: SkillCategoryOption[]
}

export const useSuggestedSkills = ({
  accessToken,
  replace,
  append,
  selectedSkillIds,
  jobDescriptionFile,
  jobTitle,
  skillCategories
}: UseSuggestedSkillsOptions) => {
  const restClient = useRestClient(env('NEXT_PUBLIC_BASE_URL'))
  const graphqlClient = useGraphQLClient(accessToken)

  const [suggestedSkills, setSuggestedSkills] = useState<AgentSkillItem[]>([])
  const [selectedSuggestionKeys, setSelectedSuggestionKeys] = useState<Set<string>>(new Set())
  const [creatingSkillKeys, setCreatingSkillKeys] = useState<Set<string>>(new Set())

  const resolveCategory = useCallback(
    (skill: AgentSkillItem): SkillCategoryOption | null => {
      const categoryValue = skill.category?.trim()
      const candidateId = skill.company_skill_category_id ?? categoryValue
      const byId = candidateId ? skillCategories.find(category => category.id === candidateId) : null
      if (byId) return byId

      const categoryName = (skill.company_skill_category_name ?? categoryValue)?.trim().toLowerCase()
      if (!categoryName) return null

      return skillCategories.find(category => category.name.toLowerCase() === categoryName) ?? null
    },
    [skillCategories]
  )

  const handleSkillsSuggested = useCallback(
    (skills: AgentSkillItem[]) => {
      replace([])
      setSuggestedSkills(
        skills.map(skill => {
          const category = resolveCategory(skill)
          if (!category) return skill

          return {
            ...skill,
            company_skill_category_id: category.id,
            company_skill_category_name: category.name
          }
        })
      )
      setSelectedSuggestionKeys(new Set())
    },
    [replace, resolveCategory]
  )

  const handleToggleSelect = useCallback(
    (key: string) => {
      const skill = suggestedSkills.find(s => s.extracted_name === key)
      if (!skill?.matched || !skill.company_skill_id) return

      setSelectedSuggestionKeys(prev => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
    },
    [suggestedSkills]
  )

  const handleToggleSelectAll = useCallback(() => {
    const selectableKeys = suggestedSkills
      .filter(skill => skill.matched && skill.company_skill_id)
      .map(skill => skill.extracted_name)

    setSelectedSuggestionKeys(prev => {
      const allSelectableSelected = selectableKeys.length > 0 && selectableKeys.every(key => prev.has(key))
      if (allSelectableSelected) return new Set()
      return new Set(selectableKeys)
    })
  }, [suggestedSkills])

  const handleRemoveSuggestion = useCallback((key: string) => {
    setSuggestedSkills(prev => prev.filter(s => s.extracted_name !== key))
    setSelectedSuggestionKeys(prev => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }, [])

  const handleCategoryChange = useCallback(
    (key: string, categoryId: string) => {
      const category = skillCategories.find(item => item.id === categoryId)
      setSuggestedSkills(prev =>
        prev.map(skill =>
          skill.extracted_name === key
            ? {
                ...skill,
                company_skill_category_id: category?.id ?? null,
                company_skill_category_name: category?.name ?? null
              }
            : skill
        )
      )
    },
    [skillCategories]
  )

  const handleCreateSkill = useCallback(
    async (key: string) => {
      const skill = suggestedSkills.find(s => s.extracted_name === key)
      if (!skill) return

      setCreatingSkillKeys(prev => new Set([...prev, key]))
      try {
        await restClient.post(
          '/processes/employee/saveSkill',
          {
            skill: {
              name: skill.extracted_name,
              category: skill.company_skill_category_id ? { id: skill.company_skill_category_id } : null
            },
            changeMode: 'INSERT'
          },
          { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
        )
        const fetchResult = await graphqlClient.request<{ skill: Array<{ id: string; name: string }> }>(
          GET_SKILLS_BY_NAMES,
          { names: [skill.extracted_name] }
        )
        const newSkill = fetchResult?.skill?.[0]
        if (newSkill) {
          setSuggestedSkills(prev =>
            prev.map(s =>
              s.extracted_name === key
                ? { ...s, company_skill_id: newSkill.id, company_skill_name: newSkill.name, matched: true }
                : s
            )
          )
        }
      } catch (err) {
        console.error('[useSuggestedSkills] Failed to create skill:', err)
      } finally {
        setCreatingSkillKeys(prev => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    },
    [suggestedSkills, restClient, accessToken, graphqlClient]
  )

  const handleAddToProfile = useCallback(() => {
    const toAdd = suggestedSkills.filter(
      s => selectedSuggestionKeys.has(s.extracted_name) && s.matched && s.company_skill_id
    )
    toAdd.forEach(skill => {
      if (selectedSkillIds.has(skill.company_skill_id!)) return
      append({ skillId: skill.company_skill_id!, skillName: skill.company_skill_name!, level: skill.recommended_level })
    })
    const addedKeys = new Set(toAdd.map(s => s.extracted_name))
    setSuggestedSkills(prev => prev.filter(s => !addedKeys.has(s.extracted_name)))
    setSelectedSuggestionKeys(prev => {
      const next = new Set(prev)
      addedKeys.forEach(k => next.delete(k))
      return next
    })
  }, [suggestedSkills, selectedSuggestionKeys, selectedSkillIds, append])

  const {
    analyze,
    isAnalyzing,
    error: analyzeError,
    clearError: clearAnalyzeError
  } = useSkillsFromFile({
    accessToken,
    onSkillsSuggested: handleSkillsSuggested
  })

  const hasFile = Boolean(
    (jobDescriptionFile as any)?.file instanceof File || (jobDescriptionFile as any)?.originFileObj instanceof File
  )

  const handleAnalyze = useCallback(() => {
    clearAnalyzeError()
    analyze(jobDescriptionFile, jobTitle)
  }, [clearAnalyzeError, analyze, jobDescriptionFile, jobTitle])

  return {
    suggestedSkills,
    selectedSuggestionKeys,
    creatingSkillKeys,
    handleToggleSelect,
    handleToggleSelectAll,
    handleRemoveSuggestion,
    handleCategoryChange,
    handleCreateSkill,
    handleAddToProfile,
    handleAnalyze,
    isAnalyzing,
    analyzeError,
    hasFile
  }
}
