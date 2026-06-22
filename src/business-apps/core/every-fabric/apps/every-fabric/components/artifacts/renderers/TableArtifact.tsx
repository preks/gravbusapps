import { useTranslation } from '@newwork/nw-design-system'
import type { RendererProps } from './index'
import translations from '../../../_i18n'

function parseRows(content: string | null): Record<string, unknown>[] {
  if (!content) return []
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) return parsed.filter(row => row && typeof row === 'object') as Record<string, unknown>[]
    if (parsed && typeof parsed === 'object') {
      const candidate = (parsed as Record<string, unknown>).rows ?? (parsed as Record<string, unknown>).data
      if (Array.isArray(candidate))
        return candidate.filter(row => row && typeof row === 'object') as Record<string, unknown>[]
    }
  } catch {
    return []
  }
  return []
}

const TableArtifact: React.FC<RendererProps> = ({ content, viewMode }) => {
  const { t } = useTranslation(translations)

  if (viewMode === 'code') {
    return (
      <pre className="gba:h-full gba:overflow-auto gba:bg-muted/30 gba:p-4 gba:text-xs gba:font-mono">
        {content ?? t('artifact-table-empty')}
      </pre>
    )
  }

  const rows = parseRows(content)
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row)))).slice(0, 24)

  if (rows.length === 0 || columns.length === 0) {
    return <div className="gba:p-6 gba:text-sm gba:text-muted-foreground">{t('artifact-table-no-rows')}</div>
  }

  return (
    <div className="gba:h-full gba:overflow-auto gba:p-6">
      <table className="gba:w-full gba:border-collapse gba:text-sm">
        <thead>
          <tr>
            {columns.map(column => (
              <th
                key={column}
                className="gba:border-b gba:border-border gba:bg-muted/35 gba:px-3 gba:py-2 gba:text-left gba:font-semibold gba:text-foreground"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="gba:border-b gba:border-border/60">
              {columns.map(column => (
                <td key={column} className="gba:px-3 gba:py-2 gba:text-muted-foreground gba:align-top">
                  {String(row[column] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TableArtifact
