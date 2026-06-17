import React from 'react'
import { Button } from '@newwork/nw-design-system'

export function Field({ label, value, mono }: Readonly<{ label: string; value: React.ReactNode; mono?: boolean }>) {
  return (
    <div className="gba:flex gba:flex-col gba:gap-0.5">
      <span className="gba:text-xs gba:text-muted-foreground">{label}</span>
      <span className={mono ? 'gba:text-sm gba:break-all gba:font-mono' : 'gba:text-sm gba:font-medium'}>
        {value || '—'}
      </span>
    </div>
  )
}

export function SectionTitle({ children }: Readonly<{ children: React.ReactNode }>) {
  return <h3 className="gba:text-sm gba:font-semibold gba:mb-2 gba:mt-1">{children}</h3>
}

export function RelatedRow({
  primary,
  secondary,
  trailing,
  onClick,
  testId
}: Readonly<{
  primary: React.ReactNode
  secondary?: React.ReactNode
  trailing?: React.ReactNode
  onClick: () => void
  testId: string
}>) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      data-testid={testId}
      className="gba:flex gba:h-auto gba:w-full gba:items-center gba:justify-between gba:gap-3 gba:px-3 gba:py-2 gba:text-left"
    >
      <span className="gba:flex gba:flex-col gba:min-w-0">
        <span className="gba:text-sm gba:font-medium gba:truncate">{primary}</span>
        {secondary && <span className="gba:text-xs gba:text-muted-foreground gba:truncate">{secondary}</span>}
      </span>
      {trailing && <span className="gba:text-sm gba:shrink-0">{trailing}</span>}
    </Button>
  )
}
