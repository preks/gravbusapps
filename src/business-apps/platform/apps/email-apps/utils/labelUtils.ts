import type { AddLabelInput, EmailLabel } from '../types'

/**
 * Fixed color palette for label creation/editing.
 * Uses token-based classes for UI and predefined hex values for backend payload.
 */
export interface LabelColorOption {
  id: string
  hex: string
  swatchClassName: string
  chipClassName: string
}

export const LABEL_COLOR_PALETTE: LabelColorOption[] = [
  {
    id: 'neutral',
    hex: '#D1D5DB',
    swatchClassName: 'gba:bg-card gba:border-border/50',
    chipClassName: 'gba:bg-muted gba:text-muted-foreground'
  },
  {
    id: 'red',
    hex: '#F2A7AE',
    swatchClassName: 'gba:bg-destructive-secondary gba:border-destructive/30',
    chipClassName: 'gba:bg-destructive-secondary gba:text-destructive-secondary-foreground'
  },
  {
    id: 'orange',
    hex: '#F4B25B',
    swatchClassName: 'gba:bg-warning-secondary gba:border-warning/30',
    chipClassName: 'gba:bg-warning-secondary gba:text-warning-secondary-foreground'
  },
  {
    id: 'yellow',
    hex: '#F7D48B',
    swatchClassName: 'gba:bg-warning-secondary/60 gba:border-warning/20',
    chipClassName: 'gba:bg-warning-secondary/60 gba:text-warning-secondary-foreground'
  },
  {
    id: 'green',
    hex: '#7FD6B2',
    swatchClassName: 'gba:bg-success-secondary gba:border-success/30',
    chipClassName: 'gba:bg-success-secondary gba:text-success-secondary-foreground'
  },
  {
    id: 'blue',
    hex: '#8AB4F8',
    swatchClassName: 'gba:bg-info-secondary gba:border-info/30',
    chipClassName: 'gba:bg-info-secondary gba:text-info-secondary-foreground'
  },
  {
    id: 'purple',
    hex: '#C8B5F6',
    swatchClassName: 'gba:bg-primary/10 gba:border-primary/30',
    chipClassName: 'gba:bg-primary/10 gba:text-primary'
  },
  {
    id: 'pink',
    hex: '#E8ADC8',
    swatchClassName: 'gba:bg-destructive-secondary/60 gba:border-destructive/20',
    chipClassName: 'gba:bg-destructive-secondary/60 gba:text-destructive-secondary-foreground'
  }
]

export function normalizeLabelName(name: string): string {
  return normalizeLabels([name])[0] || ''
}

/**
 * Normalizes label names for consistent filtering and removal payloads.
 * - trim whitespace
 * - lowercase
 * - deduplicate
 * - remove empty values
 */
export function normalizeLabels(labels: string[] = []): string[] {
  return Array.from(new Set(labels.map(label => label.trim().toLowerCase()).filter(Boolean)))
}

export function normalizeLabelObjects(input: unknown): EmailLabel[] {
  if (!Array.isArray(input)) return []

  const byName = new Map<string, EmailLabel>()
  input.forEach(raw => {
    if (typeof raw === 'string') {
      const name = normalizeLabelName(raw)
      if (!name) return
      byName.set(name, { id: '', name, color: null })
      return
    }

    if (typeof raw !== 'object' || raw === null) return

    const source = raw as Record<string, unknown>
    const name = normalizeLabelName(typeof source.name === 'string' ? source.name : '')
    if (!name) return

    const id = typeof source.id === 'string' ? source.id : ''
    const color = typeof source.color === 'string' && source.color.trim() ? source.color.trim() : null
    byName.set(name, { id, name, color })
  })

  return Array.from(byName.values())
}

export function normalizeAddLabelInputs(labels: AddLabelInput[]): AddLabelInput[] {
  return labels
    .map(label => {
      const name = normalizeLabelName(label.name)
      if (!name) return null
      const color = typeof label.color === 'string' && label.color.trim() ? label.color.trim() : undefined
      return color ? { name, color } : { name }
    })
    .filter((label): label is AddLabelInput => Boolean(label))
}

export function getLabelColorOptionByHex(hex?: string | null): LabelColorOption | undefined {
  if (!hex) return undefined
  const normalizedHex = hex.trim().toUpperCase()
  return LABEL_COLOR_PALETTE.find(option => option.hex.toUpperCase() === normalizedHex)
}

export function getLabelChipClassName(hex?: string | null): string {
  return getLabelColorOptionByHex(hex)?.chipClassName || 'gba:bg-muted gba:text-muted-foreground'
}
