import React from 'react'

/**
 * Pass as Widget `prefix` so WidgetGroup maps it to the KPI card header `icon` slot
 * (plain currency strings as `prefix` would render beside the value instead).
 */
export function kpiHeaderCurrencyLabel(isoCode: string): React.ReactElement {
  const code = isoCode.trim() || 'EUR'
  return (
    <span className="nw:text-xs nw:font-semibold nw:uppercase nw:tracking-wide nw:text-muted-foreground">{code}</span>
  )
}
