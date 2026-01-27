import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Spinner
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { useAvailableTools } from '../hooks/useAvailableTools'
import {
  FunctionsServiceClient,
  type FunctionVersionsResponse
} from '@/common/network/functions/FunctionsServiceClient'
import type {
  AIModelODM,
  AIServiceODM,
  PromptODM,
  WorkspaceODM,
  AgentType,
  ResponseStyle,
  CitationMode,
  KnowledgeSource
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { EveryExpertFields } from './EveryExpertFields'
import { KnowledgeSourcesPanel } from './KnowledgeSourcesPanel'
import { TaskExpertAiAssist } from './TaskExpertAiAssist'
import type { GeneratedTaskExpert } from '../hooks/useTaskExpertAiGenerate'

export interface TaskExpertEditorProps extends BusinessAppContextProps {
  mode: 'create' | 'edit'
  promptId?: string | null // ID to load, for edit mode
  onClose: () => void
  onSaved: () => void
}

type ParamRow = { key: string; value: string }

export const TaskExpertEditor: React.FC<TaskExpertEditorProps> = props => {
  const { mode, promptId, onClose, onSaved } = props
  const client = usePromptManagerClient(props.accessToken)

  // Loading state
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false)
  const [prompt, setPrompt] = useState<PromptODM | null>(null)

  // Core fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [serviceId, setServiceId] = useState<string>('')
  const [modelId, setModelId] = useState<string>('')
  const [userContent, setUserContent] = useState<string>('')
  const [systemContent, setSystemContent] = useState<string>('')
  const [responseType, setResponseType] = useState<'json' | 'text'>('text') // Default: text
  const [temperature, setTemperature] = useState<number>(0)
  const [responseSchema, setResponseSchema] = useState<string>('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([])

  // Every Expert fields
  const [agentType, setAgentType] = useState<AgentType>('flow')
  const [specialty, setSpecialty] = useState<string>('')
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>('conversational')
  const [expertColor, setExpertColor] = useState<string>('#1890ff')
  const [citationMode, setCitationMode] = useState<CitationMode>('when_needed')
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([])
  const [isPublic, setIsPublic] = useState<boolean>(false)
  const [tags, setTags] = useState<string[]>([])

  // Catalogs
  const [workspaces, setWorkspaces] = useState<WorkspaceODM[]>([])
  const [services, setServices] = useState<AIServiceODM[]>([])
  const [models, setModels] = useState<AIModelODM[]>([])
  const { tools: availableTools, isLoading: toolsLoading, error: toolsError } = useAvailableTools(props)

  // Testing
  const [userParamsRows, setUserParamsRows] = useState<ParamRow[]>([])
  const [systemParamsRows, setSystemParamsRows] = useState<ParamRow[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string>('latest')
  const [availableVersions, setAvailableVersions] = useState<number[]>([])
  const [toolVersions, setToolVersions] = useState<Record<string, number[]>>({})
  const [selectedToolVersion, setSelectedToolVersion] = useState<Record<string, string>>({})
  const [result, setResult] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extract template parameters from content (matches backend pattern: {variable})
  const extractParameters = useCallback((content: string | null | undefined): string[] => {
    if (!content || typeof content !== 'string') {
      return []
    }
    const params = new Set<string>()
    // Match {variable} pattern (alphanumeric + underscore)
    const pattern = /\{(\w+)\}/g
    let match
    while ((match = pattern.exec(content)) !== null) {
      const paramName = match[1].trim()
      if (paramName) {
        params.add(paramName)
      }
    }
    return Array.from(params).sort()
  }, [])

  // Extract user and system parameters separately
  const userParams = useMemo(() => extractParameters(userContent), [userContent, extractParameters])
  const systemParams = useMemo(() => extractParameters(systemContent), [systemContent, extractParameters])

  // Load prompt data when promptId changes (for edit mode)
  useEffect(() => {
    if (mode === 'edit' && promptId) {
      let mounted = true
      setIsLoadingPrompt(true)
      setError(null)
      ;(async () => {
        try {
          const loadedPrompt = await client.getPrompt(promptId)
          if (!mounted) return
          setPrompt(loadedPrompt)
        } catch (err) {
          if (!mounted) return
          setError(err instanceof Error ? err.message : 'Failed to load task expert')
        } finally {
          if (mounted) setIsLoadingPrompt(false)
        }
      })()

      return () => {
        mounted = false
      }
    } else if (mode === 'create') {
      setPrompt(null)
    }
  }, [mode, promptId, client])

  // Update parameter rows when parameters change
  useEffect(() => {
    setUserParamsRows(prev => {
      const validKeys = new Set(userParams)

      // Keep existing values, add new params, remove invalid ones
      const updatedRows = userParams.map(param => {
        const existing = prev.find(r => r.key === param)
        return existing || { key: param, value: '' }
      })

      // Remove params that are no longer in template (but keep manually added ones with empty key)
      return updatedRows.filter(r => !r.key || validKeys.has(r.key))
    })
  }, [userParams])

  useEffect(() => {
    setSystemParamsRows(prev => {
      const validKeys = new Set(systemParams)

      // Keep existing values, add new params, remove invalid ones
      const updatedRows = systemParams.map(param => {
        const existing = prev.find(r => r.key === param)
        return existing || { key: param, value: '' }
      })

      // Remove params that are no longer in template (but keep manually added ones with empty key)
      return updatedRows.filter(r => !r.key || validKeys.has(r.key))
    })
  }, [systemParams])

  // Load static data
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [ws, sv] = await Promise.all([
          client.getWorkspaces({ limit: 100, offset: 0, returnTotalRecords: false }),
          client.getAiServices({ limit: 100, offset: 0, returnTotalRecords: false })
        ])
        if (!mounted) return
        setWorkspaces(ws.data)
        setServices(sv.data)
        if (!workspaceId && ws.data.length > 0) setWorkspaceId(ws.data[0]._id || '')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load base data')
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  // Load models after service change (fallback: all models)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const md = await client.getAiModels({
          serviceId: serviceId || null,
          limit: 100,
          offset: 0,
          returnTotalRecords: false
        })
        if (!mounted) return
        setModels(md.data)
        if (!modelId && md.data.length > 0) setModelId(md.data[0]._id || '')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load models')
      }
    })()
    return () => {
      mounted = false
    }
  }, [serviceId])

  // Initialize state from prompt when editing
  useEffect(() => {
    if (mode === 'edit' && prompt) {
      let mounted = true

      setName(prompt.name || '')
      setDescription(prompt.description || '')
      setWorkspaceId(prompt.workspace?.id || '')
      setModelId(prompt.model?.id || '')

      // Resolve service ID from the model by fetching all models and finding the matching one
      if (prompt.model?.id) {
        ;(async () => {
          try {
            // Fetch all models to find the one matching the prompt's model ID
            const allModels = await client.getAiModels({ limit: 100, offset: 0, returnTotalRecords: false })
            if (!mounted) return
            const modelDetails = allModels.data.find(m => m._id === prompt.model?.id)
            if (modelDetails?.service?.id) {
              setServiceId(modelDetails.service.id)
            }
          } catch (e) {
            // Silently fail - service will be resolved when model is selected
            console.error('Failed to load model details:', e)
          }
        })()
      }

      const userTemplate = prompt.user_content?.template
      const systemTemplate = prompt.system_content?.template
      setUserContent(typeof userTemplate === 'string' ? userTemplate : '')
      setSystemContent(typeof systemTemplate === 'string' ? systemTemplate : '')

      // Initialize response schema and type from prompt
      if (prompt.response_schema) {
        setResponseType('json')
        setResponseSchema(JSON.stringify(prompt.response_schema, null, 2))
      } else {
        setResponseType('text')
        setResponseSchema('')
      }

      // Initialize parameter rows from prompt parameters
      const userParamsFromPrompt = Array.isArray(prompt.user_content?.parameters) ? prompt.user_content.parameters : []
      const systemParamsFromPrompt = Array.isArray(prompt.system_content?.parameters)
        ? prompt.system_content.parameters
        : []

      setUserParamsRows(userParamsFromPrompt.map(param => ({ key: String(param), value: '' })))
      setSystemParamsRows(systemParamsFromPrompt.map(param => ({ key: String(param), value: '' })))

      // Parse tools: can be string (comma-separated codes) or array
      let toolCodes: string[] = []
      if (prompt.tools) {
        if (typeof prompt.tools === 'string') {
          toolCodes = prompt.tools
            .split(',')
            .map(t => t.trim())
            .filter(Boolean)
        } else if (Array.isArray(prompt.tools)) {
          toolCodes = prompt.tools
        }
      }

      // Map tool codes to unified tool IDs
      const toolIds = availableTools.filter(tool => toolCodes.includes(tool.code)).map(tool => tool.id)

      setSelectedToolIds(toolIds)
      // Initialize version map from codes like function.name@2
      const versionMap: Record<string, string> = {}
      toolCodes.forEach(code => {
        const m = code.match(/^function\.[^@]+@(\d+)$/)
        if (m) {
          const ver = m[1]
          const matched = availableTools.find(t => code.startsWith(t.code))
          if (matched?.id) versionMap[matched.id] = ver
        }
      })
      setSelectedToolVersion(versionMap)

      // Initialize Every Expert fields from prompt
      setAgentType(prompt.agent_type || 'flow')
      setSpecialty(prompt.specialty || '')
      setResponseStyle(prompt.response_style || 'conversational')
      setExpertColor(prompt.color || '#1890ff')
      setCitationMode(prompt.citation_mode || 'when_needed')
      setKnowledgeSources(prompt.knowledge_sources || [])
      setIsPublic(prompt.is_public || false)
      setTags(prompt.tags || [])

      return () => {
        mounted = false
      }
    } else if (mode === 'create') {
      // Reset parameter rows for create mode
      setUserParamsRows([])
      setSystemParamsRows([])
    }
  }, [mode, prompt, availableTools, client])

  // Load versions for edit mode
  useEffect(() => {
    if (mode !== 'edit' || !prompt?._id) return
    const promptId = prompt._id
    if (!promptId) return
    let mounted = true
    ;(async () => {
      try {
        const res = await client.getPromptVersions(promptId, { limit: 50, offset: 0, returnTotalRecords: true })
        if (!mounted) return
        const versions = (res.data || [])
          .map(v => Number(v.version))
          .filter(v => !Number.isNaN(v))
          .sort((a, b) => b - a)
        setAvailableVersions(versions)
      } catch {
        // keep silent, testing still works with latest
      }
    })()
    return () => {
      mounted = false
    }
  }, [mode, prompt])

  // Derived
  const isValid = useMemo(() => {
    if (!name || !workspaceId || !modelId || !userContent) return false
    if (agentType === 'everyai' && !specialty) return false
    return true
  }, [name, workspaceId, modelId, userContent, agentType, specialty])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files)
  }, [])

  const serializeParams = (rows: ParamRow[]): Record<string, string> => {
    return rows.reduce<Record<string, string>>((acc, r) => {
      if (r.key) acc[r.key] = r.value
      return acc
    }, {})
  }

  const onSave = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    try {
      // Convert selected tool IDs to tool codes
      const toolCodes = availableTools
        .filter(tool => selectedToolIds.includes(tool.id))
        .map(tool => {
          const ver = selectedToolVersion[tool.id]
          if (ver && ver !== 'latest') {
            return `${tool.code}@${ver}`
          }
          return tool.code
        })

      // Build model settings - enforce JSON response when a schema is provided
      const modelSettings: Record<string, unknown> = {}
      if (responseType === 'json' && responseSchema && responseSchema.trim()) {
        modelSettings.response_format = { type: 'json_object' }
      }

      // For create mode, filter out document sources (will be uploaded after)
      // Keep content_entry and url sources (they don't need file upload)
      const sourcesForCreate =
        mode === 'create' ? knowledgeSources.filter(s => s.type !== 'document') : knowledgeSources

      if (mode === 'create') {
        await client.createPrompt({
          name,
          description,
          type: 'completion',
          workspaceId,
          modelId,
          userContent,
          systemContent,
          modelSettings,
          responseSchema: responseSchema ? JSON.parse(responseSchema) : null,
          tools: toolCodes,
          // Every Expert fields
          agentType,
          specialty: agentType === 'everyai' ? specialty : undefined,
          responseStyle: agentType === 'everyai' ? responseStyle : undefined,
          color: agentType === 'everyai' ? expertColor : undefined,
          citationMode: agentType === 'everyai' ? citationMode : undefined,
          knowledgeSources: sourcesForCreate.length > 0 ? sourcesForCreate : undefined,
          isPublic: agentType === 'everyai' ? isPublic : undefined,
          tags: agentType === 'everyai' && tags.length > 0 ? tags : undefined
        })

        // After creation, add any document sources that were stored locally
        // (These couldn't be uploaded before because we didn't have a promptId)
        // Note: For now, document upload in create mode just stores metadata
        // The actual file upload will happen when user edits the expert
        // TODO: Implement post-create document upload if needed
      } else if (prompt?._id) {
        await client.putPrompt(prompt._id, {
          description,
          type: 'completion',
          userContent,
          systemContent,
          modelId,
          modelSettings,
          responseSchema: responseSchema ? JSON.parse(responseSchema) : null,
          tools: toolCodes,
          revisionMessage: '',
          // Every Expert fields
          agentType,
          specialty: agentType === 'everyai' ? specialty : undefined,
          responseStyle: agentType === 'everyai' ? responseStyle : undefined,
          color: agentType === 'everyai' ? expertColor : undefined,
          citationMode: agentType === 'everyai' ? citationMode : undefined,
          knowledgeSources: knowledgeSources.length > 0 ? knowledgeSources : undefined,
          isPublic: agentType === 'everyai' ? isPublic : undefined,
          tags: agentType === 'everyai' && tags.length > 0 ? tags : undefined
        })
      }
      setIsSaving(false)
      onSaved()
      // Don't close automatically - user stays in editor after save
    } catch (err) {
      setIsSaving(false)
      setError(err instanceof Error ? err.message : 'Failed to save task expert')
    }
  }, [
    client,
    mode,
    prompt,
    name,
    description,
    agentType,
    specialty,
    responseStyle,
    expertColor,
    citationMode,
    knowledgeSources,
    isPublic,
    tags,
    workspaceId,
    modelId,
    userContent,
    systemContent,
    responseSchema,
    selectedToolIds,
    availableTools,
    onSaved,
    onClose
  ])

  // Handler for AI-generated content
  const handleAiApply = useCallback(
    (generated: GeneratedTaskExpert) => {
      // Apply generated content to form fields
      if (generated.name && !name) {
        setName(generated.name)
      }
      if (generated.description) {
        setDescription(generated.description)
      }
      if (generated.systemContent) {
        setSystemContent(generated.systemContent)
      }
      if (generated.userContent) {
        setUserContent(generated.userContent)
      }
      if (generated.responseSchema) {
        setResponseType('json')
        setResponseSchema(generated.responseSchema)
      } else {
        setResponseType('text')
        setResponseSchema('')
      }

      // EveryAI-specific fields
      if (agentType === 'everyai') {
        if (generated.specialty) {
          setSpecialty(generated.specialty)
        }
        if (generated.responseStyle) {
          setResponseStyle(generated.responseStyle)
        }
        if (generated.citationMode) {
          setCitationMode(generated.citationMode)
        }
        if (generated.tags && generated.tags.length > 0) {
          setTags(generated.tags)
        }
      }
    },
    [name, agentType]
  )

  const onTest = useCallback(async () => {
    if (mode === 'create' || !prompt?._id) {
      setError('Please save the task expert before testing')
      return
    }
    setIsTesting(true)
    setError(null)
    setResult('')
    try {
      const fd = new FormData()
      const systemParams = serializeParams(systemParamsRows)
      const userParams = serializeParams(userParamsRows)
      if (Object.keys(systemParams).length > 0) fd.append('system_params', JSON.stringify(systemParams))
      if (Object.keys(userParams).length > 0) fd.append('user_params', JSON.stringify(userParams))
      if (files && files.length > 0) {
        Array.from(files).forEach(f => fd.append('files', f))
      }
      // Optionally pass a version
      if (selectedVersion !== 'latest') {
        const v = Number(selectedVersion)
        if (!Number.isNaN(v)) {
          fd.append('version', String(v))
        }
      }
      const res = await client.executePromptById(prompt._id, fd)
      const content = typeof res.content === 'string' ? res.content : JSON.stringify(res.content, null, 2)
      setResult(content || '')
      setIsTesting(false)
    } catch (e) {
      setIsTesting(false)
      setError(e instanceof Error ? e.message : 'Test failed')
    }
  }, [client, prompt, userParamsRows, systemParamsRows, files, mode])

  return (
    <div data-testid="task-expert-editor" className="gba:w-full gba:space-y-4">
      {isLoadingPrompt ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-2">
              <Button variant="outline" onClick={onClose} data-testid="task-expert-editor-back">
                Back
              </Button>
              <div className="gba:text-lg gba:font-semibold">
                {mode === 'edit' ? name || prompt?.name : 'New Task Expert'}
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <TaskExpertAiAssist
                {...props}
                agentType={agentType}
                onApply={handleAiApply}
                data-testid="task-expert-editor-ai-assist"
              />
              <Button
                variant="default"
                size="sm"
                onClick={onSave}
                disabled={!isValid || isSaving}
                data-testid="task-expert-editor-save"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="gba:text-destructive" data-testid="task-expert-editor-error">
              {error}
            </div>
          )}

          {/* Top section: Name, Description, Workspace, Agent Type */}
          <Card>
            <CardContent className="gba:space-y-4 gba:pt-6">
              <div className="gba:grid gba:grid-cols-3 gba:gap-4">
                <div className="gba:space-y-2">
                  <Label>
                    Name <span className="gba:text-destructive">*</span>
                  </Label>
                  <Input value={name} onChange={e => setName(e.target.value)} data-testid="task-expert-editor-name" />
                </div>
                <div className="gba:space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    data-testid="task-expert-editor-description"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label>
                    Workspace <span className="gba:text-destructive">*</span>
                  </Label>
                  <Select value={workspaceId} onValueChange={setWorkspaceId} data-testid="task-expert-editor-workspace">
                    <SelectTrigger>
                      <SelectValue placeholder="Select workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces.map(ws => (
                        <SelectItem key={ws._id || ws.name} value={ws._id || ''}>
                          {ws.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Agent Type Selector */}
              <div className="gba:space-y-2">
                <Label>Agent Type</Label>
                <Select
                  value={agentType}
                  onValueChange={v => setAgentType(v as AgentType)}
                  data-testid="task-expert-editor-agent-type"
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flow">FLOW Agent</SelectItem>
                    <SelectItem value="everyai">EveryAI Expert</SelectItem>
                    <SelectItem value="general">General Agent</SelectItem>
                  </SelectContent>
                </Select>
                <p className="gba:text-xs gba:text-muted-foreground">
                  {agentType === 'flow' && 'For process automation and workflows'}
                  {agentType === 'everyai' && 'Specialized AI assistant for chat conversations'}
                  {agentType === 'general' && 'General purpose agent for standalone use'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Every Expert Configuration (only for EveryAI type) */}
          {agentType === 'everyai' && (
            <EveryExpertFields
              specialty={specialty}
              onSpecialtyChange={setSpecialty}
              responseStyle={responseStyle}
              onResponseStyleChange={setResponseStyle}
              color={expertColor}
              onColorChange={setExpertColor}
              citationMode={citationMode}
              onCitationModeChange={setCitationMode}
              tags={tags}
              onTagsChange={setTags}
              isPublic={isPublic}
              onIsPublicChange={setIsPublic}
            />
          )}

          <div className="gba:flex gba:gap-4">
            {/* Main content: prompts + testing */}
            <div className="gba:flex-1 gba:space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Prompts</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="system">
                    <TabsList>
                      <TabsTrigger value="system">System</TabsTrigger>
                      <TabsTrigger value="user">
                        User <span className="gba:text-destructive">*</span>
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="system" className="gba:mt-3">
                      <Textarea rows={8} value={systemContent} onChange={e => setSystemContent(e.target.value)} />
                    </TabsContent>
                    <TabsContent value="user" className="gba:mt-3">
                      <Textarea rows={8} value={userContent} onChange={e => setUserContent(e.target.value)} />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <CardTitle>Testing</CardTitle>
                    <Button
                      variant="default"
                      onClick={onTest}
                      disabled={isTesting || mode !== 'edit' || !prompt?._id}
                      data-testid="task-expert-editor-test"
                    >
                      {isTesting ? 'Testing…' : 'Test'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="gba:space-y-3">
                  <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                    <div className="gba:space-y-2">
                      <Label>Version</Label>
                      <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                        <SelectTrigger>
                          <SelectValue placeholder="latest" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="latest">Latest</SelectItem>
                          {availableVersions.map(v => (
                            <SelectItem key={`ver-${v}`} value={String(v)}>
                              v{v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="gba:space-y-2">
                      <Label>File upload</Label>
                      <Input type="file" multiple onChange={handleFileChange} />
                    </div>
                  </div>

                  <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                    <div className="gba:space-y-2">
                      <Label>User Parameters {userParams.length > 0 && `(${userParams.length})`}</Label>
                      {userParamsRows.length === 0 ? (
                        <div className="gba:text-muted-foreground gba:text-sm gba:italic">
                          No parameters found in user prompt template. Add variables like {'{variableName}'} to the
                          template.
                        </div>
                      ) : (
                        <>
                          {userParamsRows.map((r, idx) => (
                            <div key={`u-${r.key || idx}`} className="gba:flex gba:items-center gba:gap-2">
                              <div className="gba:w-32 gba:flex-shrink-0 gba:text-sm gba:font-medium gba:text-muted-foreground">
                                {r.key}
                              </div>
                              <Input
                                placeholder="Enter value..."
                                value={r.value}
                                onChange={e => {
                                  const v = e.target.value
                                  setUserParamsRows(prev => prev.map((x, i) => (i === idx ? { ...x, value: v } : x)))
                                }}
                                data-testid={`test-user-param-${r.key}`}
                                className="gba:flex-1"
                              />
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                    <div className="gba:space-y-2">
                      <Label>System Parameters {systemParams.length > 0 && `(${systemParams.length})`}</Label>
                      {systemParamsRows.length === 0 ? (
                        <div className="gba:text-muted-foreground gba:text-sm gba:italic">
                          No parameters found in system prompt template. Add variables like {'{variableName}'} to the
                          template.
                        </div>
                      ) : (
                        <>
                          {systemParamsRows.map((r, idx) => (
                            <div key={`s-${r.key || idx}`} className="gba:flex gba:items-center gba:gap-2">
                              <div className="gba:w-32 gba:flex-shrink-0 gba:text-sm gba:font-medium gba:text-muted-foreground">
                                {r.key}
                              </div>
                              <Input
                                placeholder="Enter value..."
                                value={r.value}
                                onChange={e => {
                                  const v = e.target.value
                                  setSystemParamsRows(prev => prev.map((x, i) => (i === idx ? { ...x, value: v } : x)))
                                }}
                                data-testid={`test-system-param-${r.key}`}
                                className="gba:flex-1"
                              />
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="gba:space-y-2">
                    <Label>Result</Label>
                    <Textarea rows={6} readOnly value={result} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right sidebar: settings and variables */}
            <div className="gba:w-80 gba:flex-shrink-0 gba:space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                </CardHeader>
                <CardContent className="gba:space-y-3">
                  <div className="gba:space-y-2">
                    <Label>Assigned Tools</Label>
                    <div className="gba:max-h-64 gba:overflow-y-auto gba:border gba:rounded-md gba:p-3 gba:space-y-2">
                      {toolsLoading ? (
                        <div className="gba:text-muted-foreground gba:text-sm">Loading tools...</div>
                      ) : toolsError ? (
                        <div className="gba:text-destructive gba:text-sm">{toolsError}</div>
                      ) : availableTools.length === 0 ? (
                        <div className="gba:text-muted-foreground gba:text-sm">No tools available</div>
                      ) : (
                        availableTools.map(tool => (
                          <div key={tool.id} className="gba:flex gba:items-center gba:gap-3">
                            <input
                              type="checkbox"
                              id={`tool-${tool.id}`}
                              checked={selectedToolIds.includes(tool.id)}
                              onChange={async e => {
                                const toolId = tool.id
                                if (e.target.checked) {
                                  setSelectedToolIds(prev => [...prev, toolId])
                                  if (!toolVersions[toolId]) {
                                    try {
                                      const client = new FunctionsServiceClient()
                                      const res: FunctionVersionsResponse = await client.getVersions(tool.id)
                                      const versions = (res.versions || [])
                                        .map(v => Number(v.version))
                                        .filter(v => !Number.isNaN(v))
                                        .sort((a, b) => b - a)
                                      setToolVersions(prev => ({ ...prev, [toolId]: versions }))
                                    } catch {
                                      setToolVersions(prev => ({ ...prev, [toolId]: [] }))
                                    }
                                  }
                                } else {
                                  setSelectedToolIds(prev => prev.filter(id => id !== toolId))
                                  setSelectedToolVersion(prev => {
                                    const copy = { ...prev }
                                    delete copy[toolId]
                                    return copy
                                  })
                                }
                              }}
                              data-testid={`task-expert-editor-tool-checkbox-${tool.id}`}
                            />
                            <label htmlFor={`tool-${tool.id}`} className="gba:flex-1 gba:cursor-pointer">
                              <span className="gba:font-medium">{tool.name}</span>
                              {tool.description && (
                                <span className="gba:text-muted-foreground gba:text-xs gba:ml-2">
                                  — {tool.description}
                                </span>
                              )}
                            </label>
                            {selectedToolIds.includes(tool.id) && (
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <span className="gba:text-xs gba:text-muted-foreground">Version</span>
                                <Select
                                  value={selectedToolVersion[tool.id] || 'latest'}
                                  onValueChange={v => setSelectedToolVersion(prev => ({ ...prev, [tool.id]: v }))}
                                  data-testid={`task-expert-editor-tool-version-select-${tool.id}`}
                                >
                                  <SelectTrigger className="gba:w-[140px]">
                                    <SelectValue placeholder="latest" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="latest">Latest</SelectItem>
                                    {(toolVersions[tool.id] || []).map(v => (
                                      <SelectItem key={`${tool.id}-v-${v}`} value={String(v)}>
                                        v{v}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="gba:text-muted-foreground gba:text-xs">
                      {selectedToolIds.length} tool(s) selected
                    </div>
                  </div>
                  <div className="gba:space-y-2">
                    <Label>Service</Label>
                    <Select value={serviceId} onValueChange={setServiceId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map(s => (
                          <SelectItem key={s._id || s.name} value={s._id || ''}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="gba:space-y-2">
                    <Label>
                      Model <span className="gba:text-destructive">*</span>
                    </Label>
                    <Select value={modelId} onValueChange={setModelId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map(m => (
                          <SelectItem key={m._id || m.name} value={m._id || ''}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="gba:space-y-2">
                    <Label>Temperature</Label>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.1}
                      value={temperature}
                      onChange={e => setTemperature(Number(e.target.value))}
                      className="gba:w-full"
                    />
                  </div>
                  <div className="gba:space-y-2">
                    <Label>Response type</Label>
                    <div className="gba:flex gba:gap-3">
                      <Button
                        size="sm"
                        variant={responseType === 'text' ? 'default' : 'outline'}
                        onClick={() => setResponseType('text')}
                      >
                        Normal/Text
                      </Button>
                      <Button
                        size="sm"
                        variant={responseType === 'json' ? 'default' : 'outline'}
                        onClick={() => setResponseType('json')}
                      >
                        JSON
                      </Button>
                    </div>
                  </div>
                  {responseType === 'json' && (
                    <div className="gba:space-y-2">
                      <Label>Response schema (JSON)</Label>
                      <Textarea rows={6} value={responseSchema} onChange={e => setResponseSchema(e.target.value)} />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Variables</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const allParams = [...new Set([...userParams, ...systemParams])].sort()
                    return allParams.length === 0 ? (
                      <div className="gba:text-muted-foreground gba:text-sm">No variables detected in prompts.</div>
                    ) : (
                      <div className="gba:space-y-2">
                        <div className="gba:text-muted-foreground gba:text-xs gba:mb-2">
                          Detected {allParams.length} parameter(s) from prompt templates:
                        </div>
                        <div className="gba:space-y-1">
                          {allParams.map(param => (
                            <div key={param} className="gba:flex gba:items-center gba:gap-2 gba:py-1">
                              <code className="gba:text-xs gba:bg-muted gba:px-2 gba:py-1 gba:rounded">{param}</code>
                              {userParams.includes(param) && systemParams.includes(param) && (
                                <span className="gba:text-xs gba:text-muted-foreground">(both)</span>
                              )}
                              {userParams.includes(param) && !systemParams.includes(param) && (
                                <span className="gba:text-xs gba:text-muted-foreground">(user)</span>
                              )}
                              {!userParams.includes(param) && systemParams.includes(param) && (
                                <span className="gba:text-xs gba:text-muted-foreground">(system)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>

              {/* Knowledge Sources Panel */}
              <KnowledgeSourcesPanel
                promptId={prompt?._id}
                sources={knowledgeSources}
                onSourcesChange={setKnowledgeSources}
                {...props}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default TaskExpertEditor
