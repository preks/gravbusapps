import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system'
import type { TokenBreakdownBlock, TokenTotals } from '../types'

const formatNumber = (value: number | null) => {
  if (value == null) return '—'
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)
}

const isNonEmptyTotals = (totals: TokenTotals | undefined): boolean => {
  if (!totals) return false
  return Object.values(totals).some(v => v != null)
}

const readTokenField = (totals: TokenTotals | undefined, key: keyof TokenTotals): number | null => {
  if (!totals) return null
  const value = totals[key]
  if (typeof value === 'number' || value === null) return value

  if (typeof key === 'string' && key.endsWith('_tokens')) {
    const fallbackKey = key.replace('_tokens', '') as keyof TokenTotals
    const fallbackValue = totals[fallbackKey]
    return typeof fallbackValue === 'number' || fallbackValue === null ? fallbackValue : null
  }

  return null
}

type Row = {
  label: string
  totals: TokenTotals | undefined
}

type Metric = {
  label: string
  value: number | null
}

function TokenScopeCard({ label, totals }: Readonly<Row>) {
  const totalTokens = readTokenField(totals, 'total_tokens')
  const inputTokens = readTokenField(totals, 'input_tokens')
  const outputTokens = readTokenField(totals, 'output_tokens')
  const cachedInputTokens = readTokenField(totals, 'cached_input_tokens')
  const uncachedTotalTokens = readTokenField(totals, 'uncached_total_tokens')

  const secondary: Metric[] = [
    { label: 'Input', value: inputTokens },
    { label: 'Output', value: outputTokens },
    { label: 'Cached input', value: cachedInputTokens },
    { label: 'Uncached total', value: uncachedTotalTokens }
  ]

  return (
    <Card>
      <CardHeader className="gba:pb-3">
        <CardTitle className="gba:text-sm">{label}</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        <div>
          <div className="gba:text-xs gba:text-muted-foreground">Total tokens</div>
          <div className="gba:text-3xl gba:font-semibold gba:tracking-tight">{formatNumber(totalTokens)}</div>
        </div>

        <div className="gba:grid gba:grid-cols-2 gba:gap-3">
          {secondary.map(m => (
            <div key={m.label} className="gba:space-y-1">
              <div className="gba:text-xs gba:text-muted-foreground">{m.label}</div>
              <div className="gba:text-sm gba:font-medium">{formatNumber(m.value)}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export interface TokenBreakdownProps {
  tokenBreakdown: TokenBreakdownBlock
  'data-testid'?: string
}

export function TokenBreakdown({
  tokenBreakdown,
  'data-testid': testId = 'flowbot-evals-token-breakdown'
}: Readonly<TokenBreakdownProps>) {
  const rows = useMemo<Row[]>(
    () => [
      { label: 'Overall', totals: tokenBreakdown.overall },
      { label: 'Monolith', totals: tokenBreakdown.monolith },
      { label: 'Controller', totals: tokenBreakdown.controller }
    ],
    [tokenBreakdown.controller, tokenBreakdown.monolith, tokenBreakdown.overall]
  )

  const nonEmptyCount = rows.filter(r => isNonEmptyTotals(r.totals)).length

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
        <div>
          <div className="gba:text-sm gba:font-semibold">Token totals</div>
          <div className="gba:text-xs gba:text-muted-foreground">Overall vs key workflows</div>
        </div>
        <Badge variant="secondary" data-testid="flowbot-evals-token-breakdown-non-empty-scopes">
          {nonEmptyCount} / {rows.length} scopes
        </Badge>
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:lg:grid-cols-3">
        {rows.map(r => (
          <TokenScopeCard key={r.label} label={r.label} totals={r.totals} />
        ))}
      </div>

      {nonEmptyCount === 0 && (
        <div className="gba:text-sm gba:text-muted-foreground" data-testid="flowbot-evals-token-breakdown-empty">
          No token breakdown in this response.
        </div>
      )}
    </div>
  )
}

export default TokenBreakdown
