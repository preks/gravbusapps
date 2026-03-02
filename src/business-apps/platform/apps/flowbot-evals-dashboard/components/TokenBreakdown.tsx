import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import type { TokenBreakdownBlock, TokenTotals } from '../types'

const formatNumber = (value: number | null) => {
  if (value == null) return '—'
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)
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

  const nonEmptyCount = rows.filter(r => r.totals && Object.values(r.totals).some(v => v != null)).length

  return (
    <Card data-testid={testId}>
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-2">
        <CardTitle className="gba:text-sm">Token totals (overall vs workflows)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:max-h-64 gba:overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scope</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Input</TableHead>
                <TableHead>Output</TableHead>
                <TableHead>Cached input</TableHead>
                <TableHead>Uncached total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.label}>
                  <TableCell className="gba:font-medium">{r.label}</TableCell>
                  <TableCell>{formatNumber(readTokenField(r.totals, 'total_tokens'))}</TableCell>
                  <TableCell>{formatNumber(readTokenField(r.totals, 'input_tokens'))}</TableCell>
                  <TableCell>{formatNumber(readTokenField(r.totals, 'output_tokens'))}</TableCell>
                  <TableCell>{formatNumber(readTokenField(r.totals, 'cached_input_tokens'))}</TableCell>
                  <TableCell>{formatNumber(readTokenField(r.totals, 'uncached_total_tokens'))}</TableCell>
                </TableRow>
              ))}
              {nonEmptyCount === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="gba:text-center gba:text-muted-foreground">
                    No token breakdown in this response.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default TokenBreakdown
