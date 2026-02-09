import React, { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import { FileText, Play, Upload, Variable } from 'lucide-react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import translations from '../_i18n'

type ParamRow = { key: string; value: string }

export interface InlineTestPanelProps {
  promptId: string
  accessToken: string
}

/** Inline test panel with proper parameter discovery and individual input fields. */
export const InlineTestPanel: React.FC<InlineTestPanelProps> = ({ promptId, accessToken }) => {
  const { t } = useTranslation(translations)
  const client = usePromptManagerClient(accessToken)

  const [userParamKeys, setUserParamKeys] = useState<string[]>([])
  const [systemParamKeys, setSystemParamKeys] = useState<string[]>([])
  const [userParamsRows, setUserParamsRows] = useState<ParamRow[]>([])
  const [systemParamsRows, setSystemParamsRows] = useState<ParamRow[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string>('latest')
  const [availableVersions, setAvailableVersions] = useState<number[]>([])
  const [files, setFiles] = useState<FileList | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState('')

  // Discover prompt parameters from the API
  useEffect(() => {
    let cancelled = false
    client
      .getPromptParameters(promptId)
      .then(res => {
        if (cancelled) return
        const up = (res.user_parameters || []).sort()
        const sp = (res.system_parameters || []).sort()
        setUserParamKeys(up)
        setSystemParamKeys(sp)
        setUserParamsRows(prev => up.map(k => prev.find(r => r.key === k) || { key: k, value: '' }))
        setSystemParamsRows(prev => sp.map(k => prev.find(r => r.key === k) || { key: k, value: '' }))
      })
      .catch(() => {
        /* silent */
      })
    return () => {
      cancelled = true
    }
  }, [client, promptId])

  // Load available versions
  useEffect(() => {
    let cancelled = false
    client
      .getPromptVersions(promptId, { limit: 50, offset: 0, returnTotalRecords: false })
      .then(res => {
        if (cancelled) return
        const vers = (res.data || [])
          .map(v => Number(v.version))
          .filter(v => !Number.isNaN(v))
          .sort((a, b) => b - a)
        setAvailableVersions(vers)
      })
      .catch(() => {
        /* silent */
      })
    return () => {
      cancelled = true
    }
  }, [client, promptId])

  const serializeParams = (rows: ParamRow[]): Record<string, string> =>
    rows.reduce<Record<string, string>>((acc, r) => {
      if (r.key) acc[r.key] = r.value
      return acc
    }, {})

  const onRun = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult('')
    try {
      const fd = new FormData()
      const sObj = serializeParams(systemParamsRows)
      const uObj = serializeParams(userParamsRows)
      if (Object.keys(sObj).length > 0) fd.append('system_params', JSON.stringify(sObj))
      if (Object.keys(uObj).length > 0) fd.append('user_params', JSON.stringify(uObj))
      if (files && files.length > 0) Array.from(files).forEach(f => fd.append('files', f))
      if (selectedVersion !== 'latest') {
        const v = Number(selectedVersion)
        if (!Number.isNaN(v)) fd.append('version', String(v))
      }
      fd.append('context', JSON.stringify({ executionMode: 'test' }))
      const res = await client.executePromptById(promptId, fd)
      setResult(typeof res.content === 'string' ? res.content : JSON.stringify(res.content, null, 2))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Execution failed')
    } finally {
      setLoading(false)
    }
  }, [client, promptId, userParamsRows, systemParamsRows, files, selectedVersion])

  const totalParams = userParamKeys.length + systemParamKeys.length

  return (
    <div className="gba:space-y-6" data-testid="expert-view-test-panel">
      {/* Controls */}
      <Card className="gba:!bg-background">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                <Play className="gba:w-4 gba:h-4" />
                {t('view-test-run')}
              </CardTitle>
              <CardDescription>{t('view-test-description')}</CardDescription>
            </div>
            <Button variant="default" onClick={onRun} disabled={loading} data-testid="expert-view-test-run">
              <Play className="gba:w-4 gba:h-4 gba:mr-1" />
              {loading ? t('view-test-running') : t('view-test-run')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          {error && (
            <div
              className="gba:p-3 gba:rounded-lg gba:bg-destructive-secondary gba:text-destructive gba:text-sm"
              data-testid="expert-view-test-error"
            >
              {error}
            </div>
          )}
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-2">
              <Label className="gba:flex gba:items-center gba:gap-1">
                <Upload className="gba:w-3 gba:h-3" />
                Version
              </Label>
              <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                <SelectTrigger data-testid="expert-view-test-version">
                  <SelectValue placeholder="latest" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest</SelectItem>
                  {availableVersions.map(v => (
                    <SelectItem key={`v-${v}`} value={String(v)}>
                      v{v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="gba:space-y-2">
              <Label>{t('view-test-file-upload')}</Label>
              <Input type="file" multiple onChange={e => setFiles(e.target.files)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parameters */}
      <Card className="gba:!bg-background">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                <Variable className="gba:w-4 gba:h-4" />
                {t('view-test-parameters')}
              </CardTitle>
              <CardDescription>{t('view-test-parameters-description')}</CardDescription>
            </div>
            {totalParams > 0 && <Badge variant="secondary">{totalParams} total</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
            {/* User / Goal parameters */}
            <div className="gba:space-y-3">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Label className="gba:font-semibold">{t('view-test-goal-params')}</Label>
                {userParamKeys.length > 0 && <Badge variant="outline">{userParamKeys.length}</Badge>}
              </div>
              {userParamsRows.length === 0 ? (
                <div className="gba:text-center gba:py-4 gba:text-muted-foreground gba:border gba:rounded-lg gba:border-dashed">
                  <p className="gba:text-sm">{t('view-test-no-goal-params')}</p>
                </div>
              ) : (
                <div className="gba:space-y-2">
                  {userParamsRows.map((r, idx) => (
                    <div key={`u-${r.key}`} className="gba:flex gba:items-center gba:gap-2">
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
                        data-testid={`expert-view-test-user-param-${r.key}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* System parameters */}
            <div className="gba:space-y-3">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Label className="gba:font-semibold">{t('view-test-system-params')}</Label>
                {systemParamKeys.length > 0 && <Badge variant="outline">{systemParamKeys.length}</Badge>}
              </div>
              {systemParamsRows.length === 0 ? (
                <div className="gba:text-center gba:py-4 gba:text-muted-foreground gba:border gba:rounded-lg gba:border-dashed">
                  <p className="gba:text-sm">{t('view-test-no-system-params')}</p>
                </div>
              ) : (
                <div className="gba:space-y-2">
                  {systemParamsRows.map((r, idx) => (
                    <div key={`s-${r.key}`} className="gba:flex gba:items-center gba:gap-2">
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
                        data-testid={`expert-view-test-system-param-${r.key}`}
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
      {result && (
        <Card className="gba:!bg-background">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
              <FileText className="gba:w-4 gba:h-4" />
              {t('view-test-result')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              rows={10}
              value={result}
              className="gba:font-mono gba:text-sm"
              data-testid="expert-view-test-result"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default InlineTestPanel
