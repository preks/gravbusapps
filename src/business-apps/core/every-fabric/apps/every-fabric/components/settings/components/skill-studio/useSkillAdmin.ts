import { useCallback, useEffect, useState } from 'react'
import type { AdminSkill, CreateSkillPayload, UpdateSkillPayload } from '../../../../../types/enterpriseAgent'
import { useAdminSkillClient } from '../../../../hooks/useAdminSkillClient'

export type SkillView = 'list' | 'create' | 'edit' | 'detail'

export interface SkillAdminState {
  skills: AdminSkill[]
  isLoading: boolean
  error: string | null
  view: SkillView
  selectedSkillId: string | null
  selectedSkill: AdminSkill | null
  searchQuery: string
  total: number
}

export type AdminSkillClient = ReturnType<typeof useAdminSkillClient>

// Backend returns snake_case and slightly different shape; normalise here.
function mapBackendSkill(raw: Record<string, unknown>): AdminSkill {
  const toolRefs = Array.isArray(raw.tool_refs) ? (raw.tool_refs as string[]) : []
  const toolsFromRefs = toolRefs.map(ref => ({
    id: ref,
    name: ref,
    description: `Provider tool ${ref}`,
    function_name: ref,
    is_active: true
  }))
  return {
    skill_id: String(raw.skill_id ?? raw._id ?? ''),
    name: String(raw.name ?? ''),
    description: String(raw.description ?? ''),
    status: (raw.status as AdminSkill['status']) ?? 'draft',
    version: Number(raw.version ?? 0),
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    category: raw.category ? String(raw.category) : null,
    is_active: Boolean(raw.is_active),
    created_by: String(raw.created_by ?? ''),
    updated_by: String(raw.updated_by ?? ''),
    approved_by: raw.approved_by ? String(raw.approved_by) : null,
    approved_at: raw.approved_at ? String(raw.approved_at) : null,
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? ''),
    content: String(raw.content ?? ''),
    files: Array.isArray(raw.files) ? (raw.files as AdminSkill['files']) : [],
    tools: Array.isArray(raw.tools) ? (raw.tools as AdminSkill['tools']) : toolsFromRefs,
    available_tools: Array.isArray(raw.available_tools) ? (raw.available_tools as AdminSkill['available_tools']) : [],
    tool_refs: toolRefs,
    tool_policies:
      raw.tool_policies && typeof raw.tool_policies === 'object'
        ? (raw.tool_policies as AdminSkill['tool_policies'])
        : {},
    approval_policy:
      raw.approval_policy && typeof raw.approval_policy === 'object'
        ? (raw.approval_policy as AdminSkill['approval_policy'])
        : undefined,
    safety_level: raw.safety_level ? String(raw.safety_level) : 'standard',
    output_contract:
      raw.output_contract && typeof raw.output_contract === 'object'
        ? (raw.output_contract as Record<string, unknown>)
        : {}
  }
}

export function useSkillAdmin(client: AdminSkillClient) {
  const [skills, setSkills] = useState<AdminSkill[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<SkillView>('list')
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [selectedSkill, setSelectedSkill] = useState<AdminSkill | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [total, setTotal] = useState(0)

  const loadSkills = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await client.listAdminSkills()
      // Backend may return either an array or a { skills, total } envelope
      const rawSkills = Array.isArray(data) ? data : (data?.skills ?? [])
      setSkills((rawSkills as Record<string, unknown>[]).map(mapBackendSkill))
      setTotal(Array.isArray(data) ? rawSkills.length : (data?.total ?? 0))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills')
      setSkills([])
    } finally {
      setIsLoading(false)
    }
  }, [client])

  const searchSkills = useCallback(
    async (query: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await client.searchAdminSkills(query)
        const rawSkills = Array.isArray(data) ? data : (data?.skills ?? [])
        setSkills((rawSkills as Record<string, unknown>[]).map(mapBackendSkill))
        setTotal(Array.isArray(data) ? rawSkills.length : (data?.total ?? 0))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setSkills([])
      } finally {
        setIsLoading(false)
      }
    },
    [client]
  )

  const loadSkillDetail = useCallback(
    async (skillId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const [raw, files, providerTools] = await Promise.all([
          client.getAdminSkill(skillId),
          client.listSkillFiles(skillId),
          client.listProviderTools()
        ])
        const skill = mapBackendSkill(raw as unknown as Record<string, unknown>)
        const assigned = new Set((skill.tool_refs ?? skill.tools.map(t => t.id)) || [])
        skill.available_tools = providerTools.filter(tool => !assigned.has(tool.id))
        // Merge separately-fetched file metadata if SkillODM.files is empty
        if ((!skill.files || skill.files.length === 0) && Array.isArray(files) && files.length > 0) {
          skill.files = files.map((f: Record<string, unknown>) => ({
            path: String(f.path ?? ''),
            mime_type: f.mime_type ? String(f.mime_type) : null,
            size: Number(f.size ?? 0),
            updated_at: f.updated_at ? String(f.updated_at) : null,
            url: f.url ? String(f.url) : null,
            content: f.content ? String(f.content) : undefined
          }))
        }
        setSelectedSkill(skill)
        setSelectedSkillId(skillId)
        setView('detail')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load skill')
      } finally {
        setIsLoading(false)
      }
    },
    [client]
  )

  const createSkill = useCallback(
    async (payload: CreateSkillPayload) => {
      setIsLoading(true)
      setError(null)
      try {
        await client.createSkill(payload)
        await loadSkills()
        setView('list')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create skill')
      } finally {
        setIsLoading(false)
      }
    },
    [client, loadSkills]
  )

  const updateSkill = useCallback(
    async (skillId: string, payload: UpdateSkillPayload) => {
      setIsLoading(true)
      setError(null)
      try {
        await client.updateSkill(skillId, payload)
        await loadSkills()
        if (selectedSkillId === skillId) {
          await loadSkillDetail(skillId)
        }
        setView('list')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update skill')
      } finally {
        setIsLoading(false)
      }
    },
    [client, loadSkills, selectedSkillId, loadSkillDetail]
  )

  const deleteSkill = useCallback(
    async (skillId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        await client.deleteSkill(skillId)
        await loadSkills()
        if (selectedSkillId === skillId) {
          setSelectedSkillId(null)
          setSelectedSkill(null)
          setView('list')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete skill')
      } finally {
        setIsLoading(false)
      }
    },
    [client, loadSkills, selectedSkillId]
  )

  const uploadFile = useCallback(
    async (skillId: string, file: File) => {
      setIsLoading(true)
      setError(null)
      try {
        await client.uploadSkillFile(skillId, file)
        if (selectedSkillId === skillId) {
          await loadSkillDetail(skillId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload file')
      } finally {
        setIsLoading(false)
      }
    },
    [client, selectedSkillId, loadSkillDetail]
  )

  const removeFile = useCallback(
    async (skillId: string, filePath: string) => {
      setIsLoading(true)
      setError(null)
      try {
        await client.deleteSkillFile(skillId, filePath)
        if (selectedSkillId === skillId) {
          await loadSkillDetail(skillId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove file')
      } finally {
        setIsLoading(false)
      }
    },
    [client, selectedSkillId, loadSkillDetail]
  )

  const assignTools = useCallback(
    async (skillId: string, toolIds: string[]) => {
      setIsLoading(true)
      setError(null)
      try {
        await client.assignSkillTools(skillId, toolIds)
        if (selectedSkillId === skillId) {
          await loadSkillDetail(skillId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to assign tools')
      } finally {
        setIsLoading(false)
      }
    },
    [client, selectedSkillId, loadSkillDetail]
  )

  const removeTool = useCallback(
    async (skillId: string, toolId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        await client.removeSkillTool(skillId, toolId)
        if (selectedSkillId === skillId) {
          await loadSkillDetail(skillId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove tool')
      } finally {
        setIsLoading(false)
      }
    },
    [client, selectedSkillId, loadSkillDetail]
  )

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query)
      if (query.trim()) {
        searchSkills(query)
      } else {
        loadSkills()
      }
    },
    [searchSkills, loadSkills]
  )

  const navigateToCreate = useCallback(() => {
    setError(null)
    setView('create')
  }, [])

  const navigateToEdit = useCallback((skill: AdminSkill) => {
    setSelectedSkill(skill)
    setSelectedSkillId(skill.skill_id)
    setError(null)
    setView('edit')
  }, [])

  const navigateToList = useCallback(() => {
    setView('list')
    setSelectedSkillId(null)
    setSelectedSkill(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  return {
    skills,
    isLoading,
    error,
    view,
    selectedSkillId,
    selectedSkill,
    searchQuery,
    total,
    loadSkills,
    handleSearch,
    loadSkillDetail,
    createSkill,
    updateSkill,
    deleteSkill,
    uploadFile,
    removeFile,
    assignTools,
    removeTool,
    navigateToCreate,
    navigateToEdit,
    navigateToList,
    setView,
    clearError
  }
}
