'use client'

import React, { useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import {
  FunctionsServiceClient,
  type MigrateSecretsResponse,
  type MigrateSecretsTarget
} from '@/common/network/functions/FunctionsServiceClient'

export interface SecretsMigrationPanelProps {
  accessToken: string
}

function summarizeOutcomes(res: MigrateSecretsResponse | null): string {
  if (!res?.outcomes?.length) return ''
  let migrated = 0
  let would = 0
  let skipped = 0
  let errors = 0
  for (const o of res.outcomes) {
    if (o.action === 'migrated') migrated += 1
    else if (o.action === 'would_migrate') would += 1
    else if (o.action === 'skipped') skipped += 1
    else if (o.action === 'error') errors += 1
  }
  const prefix =
    res.migrationRunId && res.migrationRunId.length >= 8
      ? `Run ${res.migrationRunId.slice(0, 8)}…`
      : 'Run complete'
  return `${prefix} — migrated: ${migrated}, would migrate: ${would}, skipped: ${skipped}, errors: ${errors}`
}

export const SecretsMigrationPanel: React.FC<SecretsMigrationPanelProps> = ({ accessToken }) => {
  const client = useMemo(() => new FunctionsServiceClient(accessToken), [accessToken])
  const [target, setTarget] = useState<MigrateSecretsTarget>('all')
  const [dryRun, setDryRun] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MigrateSecretsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await client.migrateSecrets({ target, dryRun })
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Migration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="gba:mb-4 gba:border-dashed" data-testid="secrets-migration-panel">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base">Encrypt credentials (admin)</CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground gba:font-normal">
          Moves allowlisted plaintext from function config, Prompt Manager external connections, and MCP tool library
          settings into the encrypted store, replacing fields with{' '}
          <span className="gba:font-mono">fnsecret:…</span> references. Requires{' '}
          <span className="gba:font-mono">functions-secrets-manager</span>.
        </p>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        <div className="gba:grid gba:gap-4 gba:sm:grid-cols-2">
          <div className="gba:space-y-2">
            <Label>Target</Label>
            <Select value={target} onValueChange={v => setTarget(v as MigrateSecretsTarget)}>
              <SelectTrigger data-testid="secrets-migration-target">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="functions_config">Function config only</SelectItem>
                <SelectItem value="external_connections">External connections only</SelectItem>
                <SelectItem value="tools">Tool library (MCP) only</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2 gba:pt-8">
            <Checkbox
              id="secrets-migration-dry"
              checked={dryRun}
              onCheckedChange={c => setDryRun(c === true)}
              data-testid="secrets-migration-dry-run"
            />
            <Label htmlFor="secrets-migration-dry" className="gba:cursor-pointer">
              Dry run (no writes)
            </Label>
          </div>
        </div>
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          <Button type="button" onClick={run} disabled={loading} data-testid="secrets-migration-run">
            {loading ? 'Running…' : dryRun ? 'Preview migration' : 'Run migration'}
          </Button>
        </div>
        {error ? (
          <div className="gba:text-sm gba:text-destructive" data-testid="secrets-migration-error">
            {error}
          </div>
        ) : null}
        {result ? (
          <div className="gba:space-y-1">
            <div className="gba:text-sm gba:font-medium" data-testid="secrets-migration-summary">
              {summarizeOutcomes(result)}
            </div>
            <p className="gba:text-xs gba:text-muted-foreground">
              Full outcome list is in structured application logs on the server.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default SecretsMigrationPanel
