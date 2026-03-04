import { useEffect, useMemo, useState } from 'react'
import {
  FunctionsServiceClient,
  type LatestFunctionItem,
  type ConnectorKind
} from '@/common/network/functions/FunctionsServiceClient'
import type {
  FunctionAssistantDraftResponse,
  FunctionAssistantExistingSnapshot,
  FunctionAssistantMode,
  FunctionExecutionLogEntry
} from '@/common/network/functions/FunctionsServiceClient'
import type { ConfigRow } from '../components/editor/SettingsEditor'

function safeJsonParseObject(value: string): Record<string, unknown> | undefined {
  const v = String(value || '').trim()
  if (!v) return undefined
  const parsed = JSON.parse(v)
  if (!parsed || typeof parsed !== 'object') return undefined
  return parsed as Record<string, unknown>
}

function buildConfigObject(rows: ConfigRow[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const kv of rows || []) {
    const key = String(kv.key || '').trim()
    if (!key) continue
    out[key] = String(kv.value ?? '')
  }
  return out
}

export interface UseFunctionEditorStateArgs {
  accessToken: string
  mode: 'create' | 'edit'
  func?: LatestFunctionItem | null
}

export function useFunctionEditorState({ accessToken, mode, func }: UseFunctionEditorStateArgs) {
  const client = useMemo(() => new FunctionsServiceClient(accessToken), [accessToken])

  // Core fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [agentEnabled, setAgentEnabled] = useState(false)
  const [workflowEnabled, setWorkflowEnabled] = useState(false)
  const [connectorEnabled, setConnectorEnabled] = useState(false)
  const [connectorKind, setConnectorKind] = useState<ConnectorKind | null>(null)

  // Version fields
  const [source, setSource] = useState('')
  const [inputSchema, setInputSchema] = useState('')
  const [outputSchema, setOutputSchema] = useState('')

  // Settings/Config key-value pairs
  const [configKeys, setConfigKeys] = useState<ConfigRow[]>([{ key: '', value: '' }])

  // Assistant
  const [assistantOpen, setAssistantOpen] = useState(true)
  const [assistantUndoSnapshot, setAssistantUndoSnapshot] = useState<{
    name: string
    description: string
    agentEnabled: boolean
    workflowEnabled: boolean
    connectorEnabled: boolean
    connectorKind: ConnectorKind | null
    source: string
    inputSchema: string
    outputSchema: string
    configKeys: ConfigRow[]
  } | null>(null)

  // Save
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Testing state
  const [testPayloadObj, setTestPayloadObj] = useState<Record<string, unknown>>({})
  const [testResult, setTestResult] = useState('')
  const [testLogs, setTestLogs] = useState<FunctionExecutionLogEntry[]>([])
  const [isTesting, setIsTesting] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

  const inputSchemaParsed = useMemo(() => {
    try {
      return inputSchema.trim() ? JSON.parse(inputSchema) : null
    } catch {
      return null
    }
  }, [inputSchema])

  const schemaProperties = useMemo(() => {
    if (!inputSchemaParsed || typeof inputSchemaParsed !== 'object' || !('properties' in inputSchemaParsed)) {
      return {}
    }
    return (inputSchemaParsed.properties as Record<string, unknown>) || {}
  }, [inputSchemaParsed])

  const requiredFields = useMemo(() => {
    if (!inputSchemaParsed || typeof inputSchemaParsed !== 'object' || !('required' in inputSchemaParsed)) {
      return []
    }
    return (inputSchemaParsed.required as string[]) || []
  }, [inputSchemaParsed])

  const updatePayloadField = (key: string, value: unknown) => {
    setTestPayloadObj(prev => ({ ...prev, [key]: value }))
  }

  // Initialize test payload with default values from schema
  useEffect(() => {
    if (Object.keys(schemaProperties).length > 0) {
      const defaults: Record<string, unknown> = {}
      Object.entries(schemaProperties).forEach(([key, prop]) => {
        const propObj = prop as Record<string, unknown>
        if ('default' in propObj && propObj.default !== undefined) {
          defaults[key] = propObj.default
        }
      })
      setTestPayloadObj(Object.keys(defaults).length > 0 ? defaults : {})
    } else {
      setTestPayloadObj({})
    }
  }, [schemaProperties])

  const loadVersionSource = async () => {
    if (!func?.id) return
    try {
      const data = await client.getFunction(func.id)
      if (data.version?.source) {
        setSource(data.version.source)
      }
    } catch (e) {
      console.error('Failed to load version source:', e)
    }
  }

  // Load function data if editing
  useEffect(() => {
    if (mode === 'edit' && func) {
      setName(func.name)
      setDescription(func.description || '')
      setAgentEnabled(func.agentEnabled)
      setWorkflowEnabled(func.workflowEnabled ?? false)
      setConnectorEnabled(func.connectorEnabled ?? false)
      setConnectorKind(func.connectorKind ?? null)

      if (func.config && Object.keys(func.config).length > 0) {
        setConfigKeys(Object.entries(func.config).map(([key, value]) => ({ key, value })))
      } else {
        setConfigKeys([{ key: '', value: '' }])
      }

      if (func.latestVersion) {
        setInputSchema(JSON.stringify(func.latestVersion.inputSchema || {}, null, 2))
        setOutputSchema(JSON.stringify(func.latestVersion.outputSchema || {}, null, 2))
      }

      loadVersionSource()
    } else {
      setName('')
      setDescription('')
      setAgentEnabled(false)
      setWorkflowEnabled(false)
      setConnectorEnabled(false)
      setConnectorKind(null)
      setSource(
        `module.exports.handler = async (event) => {\n  // Your function code here\n  return { result: 'success' };\n};`
      )
      setInputSchema(JSON.stringify({ type: 'object', properties: {} }, null, 2))
      setOutputSchema(JSON.stringify({ type: 'object', properties: {} }, null, 2))
      setConfigKeys([{ key: '', value: '' }])
    }
  }, [mode, func?.id])

  const assistantMode: FunctionAssistantMode = mode === 'edit' ? 'refine' : 'create'

  const existingSnapshot: FunctionAssistantExistingSnapshot | undefined = useMemo(() => {
    // In create-mode, we still want to send the current editor snapshot AFTER the first draft was applied,
    // so follow-up prompts are treated as refinements rather than restarting the wizard.
    const defaultNewSource = `module.exports.handler = async (event) => {\n  // Your function code here\n  return { result: 'success' };\n};`
    const isBareCreate =
      assistantMode === 'create' && !name.trim() && !description.trim() && source.trim() === defaultNewSource.trim()
    if (isBareCreate) return undefined

    let inputSchemaObj: Record<string, unknown> | undefined
    let outputSchemaObj: Record<string, unknown> | undefined
    try {
      inputSchemaObj = safeJsonParseObject(inputSchema)
    } catch {
      inputSchemaObj = undefined
    }
    try {
      outputSchemaObj = safeJsonParseObject(outputSchema)
    } catch {
      outputSchemaObj = undefined
    }
    const keys = (configKeys || []).map(kv => String(kv.key || '').trim()).filter(Boolean)
    return {
      name: name.trim() || undefined,
      description: description.trim() || undefined,
      source: source.trim() || undefined,
      inputSchema: inputSchemaObj,
      outputSchema: outputSchemaObj,
      configKeys: Array.from(new Set(keys.map(k => k.toUpperCase())))
    }
  }, [assistantMode, name, description, source, inputSchema, outputSchema, configKeys])

  const mergeConfigKeys = useMemo(() => {
    return (existingRows: ConfigRow[], keys: string[]) => {
      const normalizedExisting = (existingRows || []).filter(r => r.key.trim() || r.value.trim())
      const map = new Map<string, string>()
      for (const r of normalizedExisting) {
        const k = String(r.key || '')
          .trim()
          .toUpperCase()
        if (!k) continue
        map.set(k, r.value || '')
      }
      for (const k of keys || []) {
        const kk = String(k || '')
          .trim()
          .toUpperCase()
        if (!kk) continue
        if (!map.has(kk)) map.set(kk, '')
      }
      const merged = Array.from(map.entries()).map(([k, v]) => ({ key: k, value: v }))
      return merged.length ? merged : [{ key: '', value: '' }]
    }
  }, [])

  const applyDraft = (draft: FunctionAssistantDraftResponse) => {
    // Capture a rollback snapshot so the user can undo AI changes.
    setAssistantUndoSnapshot({
      name,
      description,
      agentEnabled,
      workflowEnabled,
      connectorEnabled,
      connectorKind,
      source,
      inputSchema,
      outputSchema,
      configKeys: (configKeys || []).map(r => ({ key: r.key, value: r.value }))
    })
    if (mode === 'create' && draft.name && !name.trim()) setName(draft.name)
    if (draft.description && !description.trim()) setDescription(draft.description)
    if (draft.connectorEnabled) {
      setConnectorEnabled(true)
      setConnectorKind(draft.connectorKind || 'structured')
    }
    if (draft.source) setSource(draft.source)
    if (draft.inputSchema) setInputSchema(JSON.stringify(draft.inputSchema, null, 2))
    if (draft.outputSchema) setOutputSchema(JSON.stringify(draft.outputSchema, null, 2))
    if (Array.isArray(draft.configKeys) && draft.configKeys.length) {
      setConfigKeys(prev => mergeConfigKeys(prev, draft.configKeys))
    }
  }

  const canUndoAssistantApply = Boolean(assistantUndoSnapshot)
  const undoAssistantApply = () => {
    const snap = assistantUndoSnapshot
    if (!snap) return
    setName(snap.name)
    setDescription(snap.description)
    setAgentEnabled(snap.agentEnabled)
    setWorkflowEnabled(snap.workflowEnabled)
    setConnectorEnabled(snap.connectorEnabled)
    setConnectorKind(snap.connectorKind)
    setSource(snap.source)
    setInputSchema(snap.inputSchema)
    setOutputSchema(snap.outputSchema)
    setConfigKeys(snap.configKeys && snap.configKeys.length ? snap.configKeys : [{ key: '', value: '' }])
    setAssistantUndoSnapshot(null)
  }

  const dismissAssistantUndo = () => setAssistantUndoSnapshot(null)

  const isValid = name.trim().length > 0 && source.trim().length > 0

  const onSave = async (onSaved: () => void) => {
    if (!isValid) return
    setIsSaving(true)
    setError(null)

    try {
      let inputSchemaObj: Record<string, unknown> = {}
      let outputSchemaObj: Record<string, unknown> = {}

      try {
        inputSchemaObj = inputSchema.trim() ? (JSON.parse(inputSchema) as Record<string, unknown>) : {}
      } catch (e) {
        throw new Error(`Invalid input schema JSON: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }

      try {
        outputSchemaObj = outputSchema.trim() ? (JSON.parse(outputSchema) as Record<string, unknown>) : {}
      } catch (e) {
        throw new Error(`Invalid output schema JSON: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }

      const config = buildConfigObject(configKeys)

      if (mode === 'create') {
        await client.createFunctionWithVersion({
          name: name.trim(),
          description: description.trim() || undefined,
          agentEnabled,
          workflowEnabled,
          connectorEnabled,
          connectorKind: connectorEnabled ? connectorKind || 'structured' : null,
          config,
          firstVersion: { source: source.trim(), inputSchema: inputSchemaObj, outputSchema: outputSchemaObj }
        })
      } else if (func?.id) {
        await client.updateFunction(func.id, {
          description: description.trim() || undefined,
          agentEnabled,
          workflowEnabled,
          connectorEnabled,
          connectorKind: connectorEnabled ? connectorKind || 'structured' : null,
          config
        })

        const latestVersion = func.latestVersion?.version || 0
        await client.createVersion(func.id, latestVersion + 1, {
          source: source.trim(),
          inputSchema: inputSchemaObj,
          outputSchema: outputSchemaObj
        })
      }

      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save function')
    } finally {
      setIsSaving(false)
    }
  }

  const onTest = async () => {
    try {
      setIsTesting(true)
      setTestError(null)
      setTestResult('')
      setTestLogs([])
      const data = await runTestCase(testPayloadObj)
      setTestResult(JSON.stringify((data as any)?.result ?? data, null, 2))
      setTestLogs(Array.isArray((data as any)?.logs) ? ((data as any).logs as FunctionExecutionLogEntry[]) : [])
    } catch (e) {
      const logs = Array.isArray((e as any)?.logs) ? ((e as any).logs as FunctionExecutionLogEntry[]) : []
      setTestLogs(logs)
      setTestError(e instanceof Error ? e.message : 'Test failed')
    } finally {
      setIsTesting(false)
    }
  }

  const buildTestIterationSnapshot = () => {
    if (!source.trim()) return null
    let inputSchemaObj: Record<string, unknown> | undefined
    let outputSchemaObj: Record<string, unknown> | undefined
    try {
      inputSchemaObj = safeJsonParseObject(inputSchema)
    } catch {
      inputSchemaObj = undefined
    }
    try {
      outputSchemaObj = safeJsonParseObject(outputSchema)
    } catch {
      outputSchemaObj = undefined
    }
    const config = buildConfigObject(configKeys)
    const keys = (configKeys || [])
      .map(kv =>
        String(kv.key || '')
          .trim()
          .toUpperCase()
      )
      .filter(Boolean)
    return {
      source: source.trim(),
      inputSchema: inputSchemaObj,
      outputSchema: outputSchemaObj,
      configKeys: keys,
      config,
      payload: testPayloadObj,
      lastError: testError,
      lastResult: testResult
    }
  }

  const runTestCase = async (payload: Record<string, unknown>) => {
    if (!source.trim()) throw new Error('Source code is required for testing')

    let inputSchemaObj: Record<string, unknown> | undefined
    let outputSchemaObj: Record<string, unknown> | undefined

    try {
      inputSchemaObj = safeJsonParseObject(inputSchema)
    } catch (e) {
      throw new Error(`Invalid input schema JSON: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }

    try {
      outputSchemaObj = safeJsonParseObject(outputSchema)
    } catch (e) {
      throw new Error(`Invalid output schema JSON: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }

    const config = buildConfigObject(configKeys)
    return await client.testFunction({
      source: source.trim(),
      payload,
      inputSchema: inputSchemaObj,
      outputSchema: outputSchemaObj,
      config
    })
  }

  return {
    assistantMode,
    assistantOpen,
    setAssistantOpen,
    existingSnapshot,
    applyDraft,
    canUndoAssistantApply,
    undoAssistantApply,
    dismissAssistantUndo,

    name,
    setName,
    description,
    setDescription,
    agentEnabled,
    setAgentEnabled,
    workflowEnabled,
    setWorkflowEnabled,
    connectorEnabled,
    setConnectorEnabled,
    connectorKind,
    setConnectorKind,
    source,
    setSource,
    inputSchema,
    setInputSchema,
    outputSchema,
    setOutputSchema,
    configKeys,
    setConfigKeys,

    isValid,
    isSaving,
    error,
    onSave,

    schemaProperties,
    requiredFields,
    testPayloadObj,
    setTestPayloadObj,
    updatePayloadField,
    testResult,
    testLogs,
    isTesting,
    testError,
    onTest,
    buildTestIterationSnapshot,
    runTestCase
  }
}
