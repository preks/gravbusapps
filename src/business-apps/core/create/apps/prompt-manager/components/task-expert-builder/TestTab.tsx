import React, { useState, useCallback, useMemo, useEffect } from 'react'
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
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription
} from '@newwork/nw-design-system'
import { Play, AlertCircle, Variable, FileText, Upload } from 'lucide-react'
import type { TabProps } from './types'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'

type ParamRow = { key: string; value: string }

export const TestTab: React.FC<TabProps> = ({ context, state, mode, promptId }) => {
  const client = usePromptManagerClient(context.accessToken)

  // Test state
  const [isTesting, setIsTesting] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<string>('')
  const [selectedVersion, setSelectedVersion] = useState<string>('latest')
  const [availableVersions, setAvailableVersions] = useState<number[]>([])
  const [files, setFiles] = useState<FileList | null>(null)
  const [userParamsRows, setUserParamsRows] = useState<ParamRow[]>([])
  const [systemParamsRows, setSystemParamsRows] = useState<ParamRow[]>([])

  // Extract parameters from templates
  const extractParameters = useCallback((content: string): string[] => {
    if (!content) return []
    const params = new Set<string>()
    const pattern = /\{(\w+)\}/g
    let match
    while ((match = pattern.exec(content)) !== null) {
      params.add(match[1])
    }
    return Array.from(params).sort()
  }, [])

  const userParams = useMemo(() => extractParameters(state.userContent), [state.userContent, extractParameters])
  const systemParams = useMemo(() => extractParameters(state.systemContent), [state.systemContent, extractParameters])

  // Initialize parameter rows from detected parameters
  useEffect(() => {
    setUserParamsRows(prev => {
      const validKeys = new Set(userParams)
      return userParams
        .map(param => {
          const existing = prev.find(r => r.key === param)
          return existing || { key: param, value: '' }
        })
        .filter(r => !r.key || validKeys.has(r.key))
    })
  }, [userParams])

  useEffect(() => {
    setSystemParamsRows(prev => {
      const validKeys = new Set(systemParams)
      return systemParams
        .map(param => {
          const existing = prev.find(r => r.key === param)
          return existing || { key: param, value: '' }
        })
        .filter(r => !r.key || validKeys.has(r.key))
    })
  }, [systemParams])

  // Load versions for the prompt
  useEffect(() => {
    if (mode !== 'edit' || !promptId) return
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
        // Silent - versions are optional
      }
    })()
    return () => {
      mounted = false
    }
  }, [mode, promptId, client])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files)
  }, [])

  const serializeParams = (rows: ParamRow[]): Record<string, string> => {
    return rows.reduce<Record<string, string>>((acc, r) => {
      if (r.key) acc[r.key] = r.value
      return acc
    }, {})
  }

  const onTest = useCallback(async () => {
    if (mode !== 'edit' || !promptId) {
      setTestError('Please save the agent before testing')
      return
    }
    setIsTesting(true)
    setTestError(null)
    setTestResult('')
    try {
      const fd = new FormData()
      const systemParamsObj = serializeParams(systemParamsRows)
      const userParamsObj = serializeParams(userParamsRows)
      if (Object.keys(systemParamsObj).length > 0) fd.append('system_params', JSON.stringify(systemParamsObj))
      if (Object.keys(userParamsObj).length > 0) fd.append('user_params', JSON.stringify(userParamsObj))
      if (files && files.length > 0) {
        Array.from(files).forEach(f => fd.append('files', f))
      }
      if (selectedVersion !== 'latest') {
        const v = Number(selectedVersion)
        if (!Number.isNaN(v)) fd.append('version', String(v))
      }
      fd.append('context', JSON.stringify({ executionMode: 'test' }))
      const res = await client.executePromptById(promptId, fd)
      const content = typeof res.content === 'string' ? res.content : JSON.stringify(res.content, null, 2)
      setTestResult(content || '')
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Test failed')
    } finally {
      setIsTesting(false)
    }
  }, [client, promptId, mode, userParamsRows, systemParamsRows, files, selectedVersion])

  const isDisabled = mode !== 'edit' || !promptId

  return (
    <div className="gba:space-y-6" data-testid="agent-builder-test-tab">
      {/* Test Controls */}
      <Card className="gba:!bg-background">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <Play className="gba:w-5 gba:h-5" />
                Test Agent
              </CardTitle>
              <CardDescription>Run the agent with test parameters</CardDescription>
            </div>
            <Button
              variant="default"
              onClick={onTest}
              disabled={isDisabled || isTesting}
              data-testid="agent-builder-run-test"
            >
              <Play className="gba:w-4 gba:h-4 gba:mr-1" />
              {isTesting ? 'Running...' : 'Run Test'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          {isDisabled && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-warning-secondary gba:text-warning-secondary-foreground">
              <AlertCircle className="gba:w-4 gba:h-4" />
              <span className="gba:text-sm">Save the agent first to enable testing</span>
            </div>
          )}

          {testError && (
            <div
              className="gba:p-3 gba:rounded-lg gba:bg-destructive-secondary gba:text-destructive gba:text-sm"
              data-testid="agent-builder-test-error"
            >
              {testError}
            </div>
          )}

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-2">
              <Label className="gba:flex gba:items-center gba:gap-1">
                <Upload className="gba:w-3 gba:h-3" />
                Version
              </Label>
              <Select value={selectedVersion} onValueChange={setSelectedVersion} disabled={isDisabled}>
                <SelectTrigger data-testid="agent-builder-test-version">
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
              <Label>File Upload</Label>
              <Input type="file" multiple onChange={handleFileChange} disabled={isDisabled} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parameters */}
      <Card className="gba:!bg-background">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <Variable className="gba:w-5 gba:h-5" />
                Parameters
              </CardTitle>
              <CardDescription>Provide values for prompt variables</CardDescription>
            </div>
            {(userParams.length > 0 || systemParams.length > 0) && (
              <Badge variant="secondary">{userParams.length + systemParams.length} total</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-2 gba:gap-6">
            {/* User Parameters */}
            <div className="gba:space-y-3">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Label className="gba:font-semibold">Goal Parameters</Label>
                {userParams.length > 0 && <Badge variant="outline">{userParams.length}</Badge>}
              </div>
              {userParamsRows.length === 0 ? (
                <div className="gba:text-center gba:py-4 gba:text-muted-foreground gba:border gba:rounded-lg gba:border-dashed">
                  <p className="gba:text-sm">No parameters in Goal</p>
                  <p className="gba:text-xs gba:mt-1">Add {'{variableName}'} to the Goal</p>
                </div>
              ) : (
                <div className="gba:space-y-2">
                  {userParamsRows.map((r, idx) => (
                    <div key={`u-${r.key || idx}`} className="gba:flex gba:items-center gba:gap-2">
                      <code className="gba:w-32 gba:flex-shrink-0 gba:text-sm gba:font-medium gba:text-muted-foreground gba:bg-muted gba:px-2 gba:py-1.5 gba:rounded">
                        {r.key}
                      </code>
                      <Input
                        placeholder="Enter value..."
                        value={r.value}
                        onChange={e => {
                          const v = e.target.value
                          setUserParamsRows(prev => prev.map((x, i) => (i === idx ? { ...x, value: v } : x)))
                        }}
                        disabled={isDisabled}
                        data-testid={`agent-builder-test-user-param-${r.key}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* System Parameters */}
            <div className="gba:space-y-3">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Label className="gba:font-semibold">System Parameters</Label>
                {systemParams.length > 0 && <Badge variant="outline">{systemParams.length}</Badge>}
              </div>
              {systemParamsRows.length === 0 ? (
                <div className="gba:text-center gba:py-4 gba:text-muted-foreground gba:border gba:rounded-lg gba:border-dashed">
                  <p className="gba:text-sm">No parameters in System Instructions</p>
                  <p className="gba:text-xs gba:mt-1">Add {'{variableName}'} to System Instructions</p>
                </div>
              ) : (
                <div className="gba:space-y-2">
                  {systemParamsRows.map((r, idx) => (
                    <div key={`s-${r.key || idx}`} className="gba:flex gba:items-center gba:gap-2">
                      <code className="gba:w-32 gba:flex-shrink-0 gba:text-sm gba:font-medium gba:text-muted-foreground gba:bg-muted gba:px-2 gba:py-1.5 gba:rounded">
                        {r.key}
                      </code>
                      <Input
                        placeholder="Enter value..."
                        value={r.value}
                        onChange={e => {
                          const v = e.target.value
                          setSystemParamsRows(prev => prev.map((x, i) => (i === idx ? { ...x, value: v } : x)))
                        }}
                        disabled={isDisabled}
                        data-testid={`agent-builder-test-system-param-${r.key}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      <Card className="gba:!bg-background">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <FileText className="gba:w-5 gba:h-5" />
            Result
          </CardTitle>
          <CardDescription>Agent response output</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={10}
            readOnly
            value={testResult}
            placeholder="Test results will appear here..."
            className="gba:font-mono gba:text-sm"
            data-testid="agent-builder-test-result"
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default TestTab
