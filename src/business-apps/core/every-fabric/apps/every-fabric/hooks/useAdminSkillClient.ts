import { useCallback, useMemo } from 'react'
import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type {
  AdminSkill,
  CreateSkillPayload,
  ListAdminSkillsResponse,
  SkillTool,
  SearchAdminSkillsResponse,
  SkillFile,
  UpdateSkillPayload
} from '../../types/enterpriseAgent'

function getBaseUrl(): string {
  return PROMPT_MANAGER_API_URL.replace(/\/$/, '')
}

export function useAdminSkillClient(token: string) {
  const client = usePromptManagerClient(token)

  const listAdminSkills = useCallback(
    (params?: { skip?: number; limit?: number }) =>
      client.get<ListAdminSkillsResponse>('/admin/skills', {
        params: params as Record<string, string> | undefined
      }),
    [client]
  )

  const searchAdminSkills = useCallback(
    (query: string, params?: { skip?: number; limit?: number }) =>
      client.get<SearchAdminSkillsResponse>('/admin/skills/search', {
        params: { q: query, ...params } as Record<string, string>
      }),
    [client]
  )

  const createSkill = useCallback(
    (payload: CreateSkillPayload) => client.post<AdminSkill>('/admin/skills', payload),
    [client]
  )

  // Use POST /admin/skills with skill_id for form-based upsert (backend only supports
  // name/description/category/tags/compatibility via the form endpoint).
  const updateSkill = useCallback(
    (skillId: string, payload: UpdateSkillPayload) =>
      client.post<AdminSkill>('/admin/skills', { skill_id: skillId, ...payload }),
    [client]
  )

  const deleteSkill = useCallback((skillId: string) => client.delete(`/admin/skills/${skillId}`), [client])

  const getAdminSkill = useCallback((skillId: string) => client.get<AdminSkill>(`/admin/skills/${skillId}`), [client])

  const listProviderTools = useCallback(async (): Promise<SkillTool[]> => {
    // Use the v2 unified endpoint, which returns the allowlisted canonical
    // provider tools. Falls back to static stubs when the live FlowBot catalog
    // is unreachable (e.g. 401 / network error), so the picker always shows
    // the known tool names instead of an empty list.
    const tools = await client.getCanonicalProviderTools().catch(() => [])
    return tools.map(tool => ({
      id: tool.tool_ref,
      name: tool.tool_ref,
      description: tool.description ?? '',
      function_name: tool.tool_ref,
      is_active: true
    }))
  }, [client])

  const uploadSkillFile = useCallback(
    (skillId: string, file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      // Backend requires paths to start with scripts/, references/, or assets/
      const path = `scripts/${file.name}`
      return client.post<SkillFile>(`/admin/skills/${skillId}/files/upload`, formData, {
        params: { path }
      })
    },
    [client]
  )

  const deleteSkillFile = useCallback(
    (skillId: string, filePath: string) => client.delete(`/admin/skills/${skillId}/files/${filePath}`),
    [client]
  )

  const listSkillFiles = useCallback(
    (skillId: string) => client.get<SkillFile[]>(`/admin/skills/${skillId}/files`),
    [client]
  )

  const fetchSkillFileContent = useCallback(
    async (skillId: string, filePath: string): Promise<string> => {
      const response = await fetch(
        `${getBaseUrl()}/admin/skills/${skillId}/files/${encodeURIComponent(filePath)}/download`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      if (!response.ok) throw new Error('Failed to fetch file content')
      return response.text()
    },
    [token]
  )

  const fetchSkillFileBinary = useCallback(
    async (skillId: string, filePath: string): Promise<Blob> => {
      const response = await fetch(
        `${getBaseUrl()}/admin/skills/${skillId}/files/${encodeURIComponent(filePath)}/download`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      if (!response.ok) throw new Error('Failed to fetch file binary')
      return response.blob()
    },
    [token]
  )

  const assignSkillTools = useCallback(
    (skillId: string, toolIds: string[]) =>
      client.post<AdminSkill>(`/admin/skills/${skillId}/tools`, { tool_refs: toolIds }),
    [client]
  )

  const removeSkillTool = useCallback(
    (skillId: string, toolId: string) => client.delete(`/admin/skills/${skillId}/tools/${toolId}`),
    [client]
  )

  return useMemo(
    () => ({
      listAdminSkills,
      searchAdminSkills,
      createSkill,
      updateSkill,
      deleteSkill,
      getAdminSkill,
      listProviderTools,
      uploadSkillFile,
      deleteSkillFile,
      listSkillFiles,
      fetchSkillFileContent,
      fetchSkillFileBinary,
      assignSkillTools,
      removeSkillTool
    }),
    [
      listAdminSkills,
      searchAdminSkills,
      createSkill,
      updateSkill,
      deleteSkill,
      getAdminSkill,
      listProviderTools,
      uploadSkillFile,
      deleteSkillFile,
      listSkillFiles,
      fetchSkillFileContent,
      fetchSkillFileBinary,
      assignSkillTools,
      removeSkillTool
    ]
  )
}
