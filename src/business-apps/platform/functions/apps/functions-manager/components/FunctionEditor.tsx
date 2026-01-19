import React, { useEffect, useState, useMemo } from 'react'
import {
  Button,
  Input,
  Label,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox
} from '@newwork/nw-design-system'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { json as jsonLang } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'

const CodeEditor: React.FC<{
  value: string
  onChange: (v: string) => void
  language: 'javascript' | 'json'
  height?: string
  readOnly?: boolean
}> = ({ value, onChange, language, height = '400px', readOnly }) => {
  const extensions = useMemo(() => {
    if (language === 'javascript') return [javascript({ jsx: true })]
    return [jsonLang()]
  }, [language])
  return (
    <CodeMirror
      value={value}
      height={height}
      extensions={extensions}
      theme={oneDark}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        autocompletion: true,
        foldGutter: true
      }}
      readOnly={!!readOnly}
      onChange={onChange}
    />
  )
}
import { Bot, GitBranch } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FunctionsServiceClient, LatestFunctionItem } from '@/common/network/functions/FunctionsServiceClient'

export interface FunctionEditorProps extends BusinessAppContextProps {
  mode: 'create' | 'edit'
  function?: LatestFunctionItem | null
  onClose: () => void
  onSaved: () => void
}

export const FunctionEditor: React.FC<FunctionEditorProps> = props => {
  const { mode, function: func, onClose, onSaved } = props
  const client = React.useMemo(() => new FunctionsServiceClient(), [])

  // Core fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [agentEnabled, setAgentEnabled] = useState(false)
  const [workflowEnabled, setWorkflowEnabled] = useState(false)

  // Version fields
  const [source, setSource] = useState('')
  const [inputSchema, setInputSchema] = useState('')
  const [outputSchema, setOutputSchema] = useState('')

  // Settings/Config key-value pairs
  const [configKeys, setConfigKeys] = useState<Array<{ key: string; value: string }>>([{ key: '', value: '' }])

  // Testing state
  const [testPayloadObj, setTestPayloadObj] = useState<Record<string, unknown>>({})
  const [testResult, setTestResult] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

  // Parse input schema to generate form fields
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

  // Update payload object when form fields change
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
      if (Object.keys(defaults).length > 0) {
        setTestPayloadObj(defaults)
      }
    } else {
      setTestPayloadObj({})
    }
  }, [schemaProperties])

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load function data if editing
  useEffect(() => {
    if (mode === 'edit' && func) {
      setName(func.name)
      setDescription(func.description || '')
      setAgentEnabled(func.agentEnabled)
      setWorkflowEnabled(func.workflowEnabled ?? false)
      // Load config/settings
      if (func.config && Object.keys(func.config).length > 0) {
        setConfigKeys(Object.entries(func.config).map(([key, value]) => ({ key, value })))
      } else {
        setConfigKeys([{ key: '', value: '' }])
      }
      // Load latest version details
      if (func.latestVersion) {
        setInputSchema(JSON.stringify(func.latestVersion.inputSchema || {}, null, 2))
        setOutputSchema(JSON.stringify(func.latestVersion.outputSchema || {}, null, 2))
      }
      // Load source code - we'll need to fetch the full version
      loadVersionSource()
    } else {
      // Default source template for new functions
      setSource(`module.exports.handler = async (event) => {
  // Your function code here
  return { result: 'success' };
};`)
      setInputSchema(JSON.stringify({ type: 'object', properties: {} }, null, 2))
      setOutputSchema(JSON.stringify({ type: 'object', properties: {} }, null, 2))
      setConfigKeys([{ key: '', value: '' }])
    }
  }, [mode, func])

  const loadVersionSource = async () => {
    if (!func?.id) return
    try {
      const baseUrl = client.baseUrl
      const response = await fetch(`${baseUrl}/functions/${func.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.version?.source) {
          setSource(data.version.source)
        }
      }
    } catch (e) {
      console.error('Failed to load version source:', e)
    }
  }

  const isValid = name.trim().length > 0 && source.trim().length > 0

  const onSave = async () => {
    if (!isValid) return
    setIsSaving(true)
    setError(null)

    try {
      let inputSchemaObj: Record<string, unknown> = {}
      let outputSchemaObj: Record<string, unknown> = {}

      try {
        inputSchemaObj = inputSchema.trim() ? JSON.parse(inputSchema) : {}
      } catch (e) {
        throw new Error(`Invalid input schema JSON: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }

      try {
        outputSchemaObj = outputSchema.trim() ? JSON.parse(outputSchema) : {}
      } catch (e) {
        throw new Error(`Invalid output schema JSON: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }

      const baseUrl = client.baseUrl

      // Build config object from key-value pairs (filter out empty keys)
      const config: Record<string, string> = {}
      configKeys.forEach(kv => {
        if (kv.key.trim()) {
          config[kv.key.trim()] = kv.value
        }
      })

      if (mode === 'create') {
        // Create function with first version
        const response = await fetch(`${baseUrl}/functions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            agentEnabled,
            workflowEnabled,
            config,
            firstVersion: {
              source: source.trim(),
              inputSchema: inputSchemaObj,
              outputSchema: outputSchemaObj
            }
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to create function' }))
          throw new Error(errorData.message || `HTTP ${response.status}`)
        }
      } else if (func?.id) {
        // Update function metadata first
        const updateResponse = await fetch(`${baseUrl}/functions/${func.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: description.trim() || null,
            agentEnabled,
            workflowEnabled,
            config
          })
        })

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({ message: 'Failed to update function' }))
          throw new Error(errorData.message || `HTTP ${updateResponse.status}`)
        }

        // Create new version for existing function
        const latestVersion = func.latestVersion?.version || 0
        const response = await fetch(`${baseUrl}/functions/${func.id}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: latestVersion + 1,
            source: source.trim(),
            inputSchema: inputSchemaObj,
            outputSchema: outputSchemaObj
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to create version' }))
          throw new Error(errorData.message || `HTTP ${response.status}`)
        }
      }

      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save function')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    if (!source.trim()) {
      setTestError('Source code is required for testing')
      return
    }

    setIsTesting(true)
    setTestError(null)
    setTestResult('')

    try {
      // Use the payload object directly
      const parsedPayload = testPayloadObj

      // Parse schemas
      let inputSchemaObj: Record<string, unknown> | undefined
      let outputSchemaObj: Record<string, unknown> | undefined

      try {
        inputSchemaObj = inputSchema.trim() ? JSON.parse(inputSchema) : undefined
      } catch (e) {
        throw new Error(`Invalid input schema JSON: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }

      try {
        outputSchemaObj = outputSchema.trim() ? JSON.parse(outputSchema) : undefined
      } catch (e) {
        throw new Error(`Invalid output schema JSON: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }

      // Build config from key-value pairs
      const config: Record<string, string> = {}
      configKeys.forEach(kv => {
        if (kv.key.trim()) {
          config[kv.key.trim()] = kv.value
        }
      })

      // Call test endpoint
      const baseUrl = client.baseUrl
      const response = await fetch(`${baseUrl}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: source.trim(),
          payload: parsedPayload,
          inputSchema: inputSchemaObj,
          outputSchema: outputSchemaObj,
          config
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Test failed' }))
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setTestResult(JSON.stringify(data.result || data, null, 2))
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Test failed')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div data-testid="function-editor" className="gba:w-full gba:space-y-4">
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button variant="outline" onClick={onClose} data-testid="function-editor-back">
            Back
          </Button>
          <div className="gba:text-lg gba:font-semibold">{mode === 'edit' ? name || func?.name : 'New Function'}</div>
        </div>
        <div className="gba:flex gba:gap-2">
          <Button variant="default" onClick={onSave} disabled={!isValid || isSaving} data-testid="function-editor-save">
            {isSaving ? 'Saving…' : mode === 'create' ? 'Create' : 'Create New Version'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="gba:text-destructive" data-testid="function-editor-error">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="function-name"
              disabled={mode === 'edit'}
              data-testid="function-editor-name"
            />
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Function description"
              rows={3}
              data-testid="function-editor-description"
            />
          </div>

          <div className="gba:space-y-2">
            <Label>Integration Options</Label>
            <div className="gba:flex gba:gap-3">
              <Button
                type="button"
                variant={agentEnabled ? 'default' : 'outline'}
                size="lg"
                onClick={() => setAgentEnabled(!agentEnabled)}
                className="gba:flex gba:items-center gba:gap-2"
                style={
                  agentEnabled
                    ? {
                        backgroundColor: '#8b5cf6',
                        borderColor: '#8b5cf6',
                        color: '#ffffff'
                      }
                    : {}
                }
                data-testid="function-editor-agent-enabled"
              >
                <Bot className="gba:w-5 gba:h-5" />
                <span className="gba:font-medium">Agent Enabled</span>
              </Button>

              <Button
                type="button"
                variant={workflowEnabled ? 'default' : 'outline'}
                size="lg"
                onClick={() => setWorkflowEnabled(!workflowEnabled)}
                className="gba:flex gba:items-center gba:gap-2"
                style={
                  workflowEnabled
                    ? {
                        backgroundColor: '#3b82f6',
                        borderColor: '#3b82f6',
                        color: '#ffffff'
                      }
                    : {}
                }
                data-testid="function-editor-workflow-enabled"
              >
                <GitBranch className="gba:w-5 gba:h-5" />
                <span className="gba:font-medium">Workflow Enabled</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Function Definition */}
      <Card>
        <CardHeader>
          <CardTitle>Function Definition</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="source" className="gba:w-full">
            <TabsList>
              <TabsTrigger value="source">Source Code</TabsTrigger>
              <TabsTrigger value="inputSchema">Input Schema</TabsTrigger>
              <TabsTrigger value="outputSchema">Output Schema</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="source" className="gba:space-y-2 gba:pt-4">
              <Label htmlFor="source">JavaScript Source Code *</Label>
              <div className="gba:border gba:rounded-md gba:overflow-hidden" style={{ minHeight: '400px' }}>
                <CodeEditor language="javascript" value={source} onChange={v => setSource(v)} height="400px" />
              </div>
            </TabsContent>

            <TabsContent value="inputSchema" className="gba:space-y-2 gba:pt-4">
              <Label htmlFor="inputSchema">Input Schema (JSON)</Label>
              <div className="gba:border gba:rounded-md gba:overflow-hidden" style={{ minHeight: '400px' }}>
                <CodeEditor language="json" value={inputSchema} onChange={v => setInputSchema(v)} height="400px" />
              </div>
            </TabsContent>

            <TabsContent value="outputSchema" className="gba:space-y-2 gba:pt-4">
              <Label htmlFor="outputSchema">Output Schema (JSON)</Label>
              <div className="gba:border gba:rounded-md gba:overflow-hidden" style={{ minHeight: '400px' }}>
                <CodeEditor language="json" value={outputSchema} onChange={v => setOutputSchema(v)} height="400px" />
              </div>
            </TabsContent>

            <TabsContent value="settings" className="gba:space-y-2 gba:pt-4">
              <Label>Settings</Label>
              <p className="gba:text-sm gba:text-muted-foreground">
                Key-value pairs for API keys, credentials, environment variables, etc. These will be provided to the
                function at runtime via the context.config object.
              </p>
              <div className="gba:space-y-2 gba:mt-3">
                {configKeys.map((kv, idx) => (
                  <div key={idx} className="gba:flex gba:gap-2">
                    <Input
                      placeholder="Key (e.g. API_KEY)"
                      value={kv.key}
                      onChange={e => {
                        const newKeys = [...configKeys]
                        newKeys[idx].key = e.target.value
                        setConfigKeys(newKeys)
                      }}
                      data-testid={`function-editor-config-key-${idx}`}
                    />
                    <Input
                      type="password"
                      placeholder="Value"
                      value={kv.value}
                      onChange={e => {
                        const newKeys = [...configKeys]
                        newKeys[idx].value = e.target.value
                        setConfigKeys(newKeys)
                      }}
                      data-testid={`function-editor-config-value-${idx}`}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfigKeys(configKeys.filter((_, i) => i !== idx))}
                      disabled={configKeys.length === 1}
                      data-testid={`function-editor-config-remove-${idx}`}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfigKeys([...configKeys, { key: '', value: '' }])}
                  data-testid="function-editor-config-add"
                >
                  + Add Config
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Test Section */}
      <Card>
        <CardHeader>
          <CardTitle>Test Function</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          {Object.keys(schemaProperties).length > 0 ? (
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              {/* Form Fields */}
              <div className="gba:space-y-4">
                <Label>Input Fields</Label>
                <div className="gba:space-y-3">
                  {Object.entries(schemaProperties).map(([key, prop]) => {
                    const propObj = prop as Record<string, unknown>
                    const propType = propObj.type as string
                    const isRequired = requiredFields.includes(key)
                    const description = propObj.description as string | undefined
                    const defaultValue = propObj.default as unknown
                    const enumValues = propObj.enum as unknown[] | undefined

                    return (
                      <div key={key} className="gba:space-y-1">
                        <Label htmlFor={`test-field-${key}`}>
                          {key}
                          {isRequired && <span className="gba:text-destructive"> *</span>}
                        </Label>
                        {description && <p className="gba:text-xs gba:text-muted-foreground">{description}</p>}
                        {propType === 'string' && enumValues ? (
                          <Select
                            value={String(testPayloadObj[key] || defaultValue || '')}
                            onValueChange={value => updatePayloadField(key, value)}
                          >
                            <SelectTrigger id={`test-field-${key}`} data-testid={`function-editor-test-field-${key}`}>
                              <SelectValue placeholder={`Select ${key}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {enumValues.map((val, idx) => (
                                <SelectItem key={idx} value={String(val)}>
                                  {String(val)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : propType === 'boolean' ? (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Checkbox
                              id={`test-field-${key}`}
                              checked={Boolean(testPayloadObj[key] ?? defaultValue ?? false)}
                              onCheckedChange={checked => updatePayloadField(key, checked)}
                              data-testid={`function-editor-test-field-${key}`}
                            />
                            <Label htmlFor={`test-field-${key}`} className="gba:cursor-pointer">
                              {String(testPayloadObj[key] ?? defaultValue ?? false)}
                            </Label>
                          </div>
                        ) : propType === 'number' || propType === 'integer' ? (
                          <Input
                            id={`test-field-${key}`}
                            type="number"
                            value={String(testPayloadObj[key] ?? defaultValue ?? '')}
                            onChange={e =>
                              updatePayloadField(
                                key,
                                propType === 'integer' ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder={description || `Enter ${key}`}
                            data-testid={`function-editor-test-field-${key}`}
                          />
                        ) : (
                          <Input
                            id={`test-field-${key}`}
                            type="text"
                            value={String(testPayloadObj[key] ?? defaultValue ?? '')}
                            onChange={e => updatePayloadField(key, e.target.value)}
                            placeholder={description || `Enter ${key}`}
                            data-testid={`function-editor-test-field-${key}`}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Preview */}
              <div className="gba:space-y-2">
                <Label>Payload Preview</Label>
                <div className="gba:border gba:rounded-md gba:overflow-hidden" style={{ minHeight: '300px' }}>
                  <CodeEditor
                    language="json"
                    value={JSON.stringify(testPayloadObj, null, 2)}
                    onChange={() => {}}
                    height="300px"
                    readOnly
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="gba:space-y-2">
              <Label>Test Payload (JSON)</Label>
              <Textarea
                value={JSON.stringify(testPayloadObj, null, 2)}
                onChange={e => {
                  try {
                    setTestPayloadObj(JSON.parse(e.target.value || '{}'))
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                placeholder='{"name": "Alice", "greeting": "Hi"}'
                rows={5}
                className="gba:font-mono gba:text-sm"
                data-testid="function-editor-test-payload"
              />
            </div>
          )}

          <Button
            variant="default"
            onClick={handleTest}
            disabled={!source.trim() || isTesting}
            data-testid="function-editor-test-button"
          >
            {isTesting ? 'Testing…' : 'Test Function'}
          </Button>

          {testError && (
            <div className="gba:text-destructive gba:text-sm" data-testid="function-editor-test-error">
              {testError}
            </div>
          )}

          {testResult && (
            <div className="gba:space-y-2">
              <Label>Result</Label>
              <Textarea
                value={testResult}
                readOnly
                rows={10}
                className="gba:font-mono gba:text-sm gba:bg-muted"
                data-testid="function-editor-test-result"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
