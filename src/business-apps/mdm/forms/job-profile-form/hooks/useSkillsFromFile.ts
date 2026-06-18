import { useState, useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import translations from '../_i18n'

const JOB_DESCRIPTION_SKILLS_PROMPT_NAME = 'job_description_skills_extractor'

export interface AgentSkillItem {
  extracted_name: string
  company_skill_name: string | null
  company_skill_id: string | null
  matched: boolean
  category: string
  company_skill_category_id?: string | null
  company_skill_category_name?: string | null
  confidence: number
  recommended_level: number
  context?: string
}

export interface UseSkillsFromFileOptions {
  accessToken: string
  onSkillsSuggested: (skills: AgentSkillItem[]) => void
}

/** The value stored in the `jobDescriptionFile` form field.
 * Both newly selected and server-hosted files should expose a browser `File`
 * so prompt execution can always send binary file content.
 */
export type JobDescriptionFileValue =
  | { file?: File; originFileObj?: File; fileId?: string; name?: string; [key: string]: unknown }
  | { fileId?: string; url?: string; path?: string; name?: string; mimeType?: string; [key: string]: unknown }
  | null

interface ParsedAgentResponse {
  skills: AgentSkillItem[]
  summary: string | null
  error: string | null
}

function parseAgentResponse(content: unknown): ParsedAgentResponse {
  const raw = typeof content === 'string' ? content : JSON.stringify(content)
  const trimmed = raw.trim()

  const tryParse = (json: string): ParsedAgentResponse | null => {
    try {
      const parsed = JSON.parse(json)
      if (Array.isArray(parsed)) return { skills: parsed, summary: null, error: null }
      if (typeof parsed?.error === 'string') {
        return { skills: [], summary: null, error: parsed.error }
      }
      if (parsed?.skills && Array.isArray(parsed.skills)) {
        return { skills: parsed.skills, summary: parsed.summary ?? null, error: null }
      }
      return null
    } catch {
      return null
    }
  }

  const direct = tryParse(trimmed)
  if (direct) return direct

  const openIdx = trimmed.indexOf('```')
  if (openIdx !== -1) {
    const newlineIdx = trimmed.indexOf('\n', openIdx)
    const contentStart = newlineIdx !== -1 ? newlineIdx + 1 : openIdx + 3
    const closeIdx = trimmed.indexOf('```', contentStart)
    if (closeIdx !== -1) {
      const fromBlock = tryParse(trimmed.slice(contentStart, closeIdx).trim())
      if (fromBlock) return fromBlock
    }
  }

  return { skills: [], summary: null, error: null }
}

export const useSkillsFromFile = ({ accessToken, onSkillsSuggested }: UseSkillsFromFileOptions) => {
  const { t } = useTranslation(translations)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const client = usePromptManagerClient(accessToken)

  const analyze = useCallback(
    async (jobDescriptionFile: JobDescriptionFileValue, jobTitle: string) => {
      if (!jobDescriptionFile) {
        setError(t('suggest-skills-error-no-file'))
        return
      }

      setIsAnalyzing(true)
      setError(null)

      try {
        const locale = getCurrentActiveUserLocale()
        const language = new Intl.DisplayNames([locale], { type: 'language' }).of(locale.split('-')[0]) ?? locale

        const formData = new FormData()
        formData.append('system_params', JSON.stringify({ language }))
        formData.append('user_params', JSON.stringify({ job_title: jobTitle }))

        const fileFromOrigin =
          (jobDescriptionFile as any).originFileObj instanceof File ? (jobDescriptionFile as any).originFileObj : null
        const rawFile =
          (jobDescriptionFile as any).file instanceof File ? (jobDescriptionFile as any).file : fileFromOrigin

        if (!rawFile) {
          setError(t('suggest-skills-error-no-file'))
          return
        }

        formData.append('files', rawFile, rawFile.name)

        const promptsPage = await client.getPrompts({ promptName: JOB_DESCRIPTION_SKILLS_PROMPT_NAME, limit: 1 })
        const taskExpertId = promptsPage?.data?.[0]?._id
        if (!taskExpertId) {
          setError(`Prompt not found: ${JOB_DESCRIPTION_SKILLS_PROMPT_NAME}`)
          return
        }

        const response = await client.executePromptById(taskExpertId, formData)
        const { skills: agentSkills, summary, error: agentError } = parseAgentResponse(response.content)

        if (agentError) {
          setError(agentError)
          return
        }

        if (agentSkills.length === 0) {
          setError(summary ?? t('suggest-skills-error-no-results'))
          return
        }

        onSkillsSuggested(agentSkills)
      } catch (err) {
        console.error('[useSkillsFromFile] Analysis failed:', err)
        setError(err instanceof Error ? err.message : t('suggest-skills-error-generic'))
      } finally {
        setIsAnalyzing(false)
      }
    },
    [client, onSkillsSuggested, t]
  )

  const clearError = useCallback(() => setError(null), [])

  return { analyze, isAnalyzing, error, clearError }
}
