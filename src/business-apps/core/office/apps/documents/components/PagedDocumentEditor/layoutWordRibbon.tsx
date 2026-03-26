/**
 * Word-style layout ribbon: large icon + label + dropdown trigger.
 */

import React from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, Input, Label } from '@newwork/nw-design-system'
import { ChevronDown } from 'lucide-react'

export function LayoutWordRibbonDropdown({
  Icon,
  label,
  testId,
  menuClassName,
  children
}: Readonly<{
  Icon: LucideIcon
  label: string
  testId?: string
  menuClassName?: string
  children: React.ReactNode
}>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="gba:flex gba:h-auto gba:min-h-16 gba:flex-col gba:items-center gba:justify-center gba:gap-0.5 gba:rounded-md gba:px-2 gba:py-1.5 gba:text-foreground hover:gba:bg-muted/80 gba:w-16 gba:shrink-0"
          data-testid={testId}
        >
          <Icon className="gba:h-5 gba:w-5 gba:text-muted-foreground" aria-hidden />
          <span className="gba:text-center gba:text-xs gba:leading-tight gba:line-clamp-2">{label}</span>
          <ChevronDown className="gba:h-3 gba:w-3 gba:text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={menuClassName ?? 'gba:min-w-44'}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function LayoutRibbonNumericField({
  label,
  value,
  unit,
  min,
  max,
  onCommit,
  testId
}: Readonly<{
  label: string
  value: number
  unit: string
  step: number
  min: number
  max: number
  onCommit: (v: number) => void
  testId?: string
}>) {
  const [local, setLocal] = React.useState(String(value))
  React.useEffect(() => {
    setLocal(String(value))
  }, [value])

  const commit = () => {
    const n = Number.parseFloat(local.replace(',', '.'))
    if (!Number.isFinite(n)) {
      setLocal(String(value))
      return
    }
    const clamped = Math.min(max, Math.max(min, n))
    onCommit(clamped)
    setLocal(String(clamped))
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-0.5 gba:shrink-0">
      <Label className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap">{label}</Label>
      <div className="gba:flex gba:items-center gba:gap-1">
        <Input
          type="text"
          inputMode="decimal"
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          className="gba:h-8 gba:w-14 gba:px-1.5 gba:text-xs"
          data-testid={testId}
        />
        <span className="gba:text-xs gba:text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
}
