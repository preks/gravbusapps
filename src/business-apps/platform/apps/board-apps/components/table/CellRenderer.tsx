import React from 'react'
import { Avatar, AvatarImage, AvatarFallback, Badge, Checkbox } from '@newwork/nw-design-system'
import { ExternalLink, Mail, Phone, Star, Link2, FileText, Copy, Calculator } from 'lucide-react'

export interface CellRendererProps {
  value: unknown
  type: string
  options?: Array<{ value: string; label: string; colorToken?: string }>
  isPrimary?: boolean
  rowData?: Record<string, unknown>
}

const TOKEN_CLASSES: Record<string, string> = {
  primary: 'gba:bg-primary/15 gba:text-primary',
  success: 'gba:bg-success-secondary gba:text-success-secondary-foreground',
  info: 'gba:bg-info-secondary gba:text-info-secondary-foreground',
  warning: 'gba:bg-warning-secondary gba:text-warning-secondary-foreground',
  destructive: 'gba:bg-destructive-secondary gba:text-destructive-secondary-foreground',
  muted: 'gba:bg-muted gba:text-muted-foreground'
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

export const CellRenderer: React.FC<CellRendererProps> = ({ value, type, options, isPrimary, rowData }) => {
  if (value === null || value === undefined || value === '') {
    return <span className="gba:text-muted-foreground/30">--</span>
  }

  if (isPrimary && rowData?.pictureThumbnail) {
    const thumbData = String(rowData.pictureThumbnail)
    const displayText = String(value)
    return (
      <span className="gba:flex gba:items-center gba:gap-1.5">
        <Avatar size="sm" className="gba:flex-shrink-0 gba:h-5 gba:w-5">
          <AvatarImage src={`data:image/png;base64,${thumbData}`} alt={displayText} />
          <AvatarFallback className="gba:text-[8px]">{getInitials(displayText)}</AvatarFallback>
        </Avatar>
        <span className="gba:text-xs gba:truncate">{displayText}</span>
      </span>
    )
  }

  switch (type) {
    case 'status':
    case 'select': {
      if (!options) break
      const opt = options.find(o => o.value === String(value))
      if (opt) {
        const cls = opt.colorToken ? TOKEN_CLASSES[opt.colorToken] || TOKEN_CLASSES.muted : TOKEN_CLASSES.muted
        return (
          <span className={`gba:inline-block gba:px-1.5 gba:py-0.5 gba:rounded gba:text-xs gba:font-medium ${cls}`}>
            {opt.label}
          </span>
        )
      }
      return <span className="gba:text-xs">{String(value)}</span>
    }

    case 'multiselect': {
      const vals = Array.isArray(value) ? value : [value]
      return (
        <span className="gba:flex gba:flex-wrap gba:gap-0.5">
          {vals.map((v, i) => {
            const opt = options?.find(o => o.value === String(v))
            const cls = opt?.colorToken ? TOKEN_CLASSES[opt.colorToken] || TOKEN_CLASSES.muted : TOKEN_CLASSES.muted
            return (
              <span key={i} className={`gba:inline-block gba:px-1 gba:py-0 gba:rounded gba:text-xs ${cls}`}>
                {opt?.label || String(v)}
              </span>
            )
          })}
        </span>
      )
    }

    case 'boolean':
      return (
        <Checkbox
          checked={String(value) === 'true'}
          className="gba:pointer-events-none gba:h-3.5 gba:w-3.5"
          aria-label="Value"
        />
      )

    case 'date':
      try {
        const d = new Date(String(value))
        if (!isNaN(d.getTime())) {
          return (
            <span className="gba:text-xs gba:tabular-nums">
              {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )
        }
      } catch {
        /* fall through */
      }
      break

    case 'datetime':
      try {
        const d = new Date(String(value))
        if (!isNaN(d.getTime())) {
          return (
            <span className="gba:text-xs gba:tabular-nums">
              {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
              <span className="gba:text-muted-foreground">
                {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </span>
          )
        }
      } catch {
        /* fall through */
      }
      break

    case 'email':
      return (
        <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs">
          <Mail className="gba:w-3 gba:h-3 gba:text-muted-foreground gba:flex-shrink-0" />
          <a
            href={`mailto:${String(value)}`}
            className="gba:text-primary gba:hover:underline gba:truncate"
            onClick={e => e.stopPropagation()}
          >
            {String(value)}
          </a>
        </span>
      )

    case 'phone':
      return (
        <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs">
          <Phone className="gba:w-3 gba:h-3 gba:text-muted-foreground gba:flex-shrink-0" />
          <a
            href={`tel:${String(value)}`}
            className="gba:text-primary gba:hover:underline gba:truncate"
            onClick={e => e.stopPropagation()}
          >
            {String(value)}
          </a>
        </span>
      )

    case 'url':
    case 'link':
      return (
        <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs">
          <ExternalLink className="gba:w-3 gba:h-3 gba:text-muted-foreground gba:flex-shrink-0" />
          <a
            href={String(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="gba:text-primary gba:hover:underline gba:truncate"
            onClick={e => e.stopPropagation()}
          >
            {String(value)
              .replace(/^https?:\/\/(www\.)?/, '')
              .slice(0, 40)}
          </a>
        </span>
      )

    case 'number':
    case 'currency':
    case 'percentage': {
      const num = Number(value)
      if (isNaN(num)) break
      if (type === 'currency')
        return (
          <span className="gba:text-xs gba:tabular-nums">
            ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )
      if (type === 'percentage') return <span className="gba:text-xs gba:tabular-nums">{num.toFixed(1)}%</span>
      return <span className="gba:text-xs gba:tabular-nums">{num.toLocaleString()}</span>
    }

    case 'progress': {
      const pct = Math.max(0, Math.min(100, Number(value) || 0))
      return (
        <span className="gba:flex gba:items-center gba:gap-1.5">
          <span className="gba:flex-1 gba:h-1.5 gba:bg-muted gba:rounded-full gba:overflow-hidden">
            <span
              className="gba:block gba:h-full gba:bg-primary gba:rounded-full gba:transition-all"
              data-width={pct}
            />
          </span>
          <span className="gba:text-xs gba:tabular-nums gba:text-muted-foreground gba:w-8 gba:text-right">{pct}%</span>
        </span>
      )
    }

    case 'rating': {
      const rating = Math.max(0, Math.min(5, Math.round(Number(value) || 0)))
      return (
        <span className="gba:flex gba:items-center gba:gap-0.5">
          {[1, 2, 3, 4, 5].map(i => (
            <Star
              key={i}
              className={`gba:w-3 gba:h-3 ${i <= rating ? 'gba:text-warning gba:fill-warning' : 'gba:text-muted-foreground/30'}`}
            />
          ))}
        </span>
      )
    }

    case 'people': {
      const names = Array.isArray(value) ? value : [value]
      return (
        <span className="gba:flex gba:items-center gba:gap-1">
          {names.slice(0, 3).map((name, i) => (
            <Badge key={i} variant="secondary" className="gba:text-xs gba:px-1 gba:py-0">
              {String(name).slice(0, 12)}
            </Badge>
          ))}
          {names.length > 3 && <span className="gba:text-xs gba:text-muted-foreground">+{names.length - 3}</span>}
        </span>
      )
    }

    case 'relation':
      if (Array.isArray(value)) {
        return (
          <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
            <Link2 className="gba:w-3 gba:h-3" />
            {value.length} linked
          </span>
        )
      }
      return (
        <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
          <Link2 className="gba:w-3 gba:h-3" />1 linked
        </span>
      )

    case 'mirror':
      return (
        <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground/70">
          <Copy className="gba:w-3 gba:h-3" />
          {String(value)}
        </span>
      )

    case 'rollup':
      return (
        <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground/70">
          <Calculator className="gba:w-3 gba:h-3" />
          {typeof value === 'number' ? value.toLocaleString() : String(value)}
        </span>
      )

    case 'tags': {
      const tags = Array.isArray(value)
        ? value
        : String(value)
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
      return (
        <span className="gba:flex gba:flex-wrap gba:gap-0.5">
          {tags.slice(0, 4).map((t, i) => (
            <span
              key={i}
              className="gba:inline-block gba:px-1 gba:py-0 gba:rounded gba:text-xs gba:bg-muted gba:text-muted-foreground"
            >
              {String(t)}
            </span>
          ))}
          {tags.length > 4 && <span className="gba:text-xs gba:text-muted-foreground">+{tags.length - 4}</span>}
        </span>
      )
    }

    case 'formula':
    case 'calculated':
      return (
        <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:italic gba:text-muted-foreground">
          <FileText className="gba:w-3 gba:h-3" />
          {String(value)}
        </span>
      )
  }

  return <span className="gba:text-xs">{String(value)}</span>
}
