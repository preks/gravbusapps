'use client'

import React from 'react'
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { parseFncredRef } from '@/common/utils/fncredRef'
import type { CredentialBindOption } from '@/common/utils/credentialBindOptions'

export interface CredentialBindFieldProps {
  value: string
  onChange: (next: string) => void
  bindOptions: CredentialBindOption[]
  plainInputType?: 'text' | 'password'
  plainPlaceholder?: string
  'data-testid'?: string
}

/** Select stored credential field (`fncred:…`) or plain text. */
export const CredentialBindField: React.FC<CredentialBindFieldProps> = ({
  value,
  onChange,
  bindOptions,
  plainInputType = 'text',
  plainPlaceholder,
  'data-testid': testId = 'credential-bind-field'
}) => {
  const parsed = parseFncredRef(value)
  const selectedIndex = React.useMemo(() => {
    if (!parsed) return -1
    const cid = parsed.credentialId.toLowerCase()
    const fk = parsed.fieldKey
    return bindOptions.findIndex(
      o => o.credentialId.toLowerCase() === cid && o.fieldKey === fk
    )
  }, [bindOptions, parsed])

  const selectValue = selectedIndex >= 0 ? `opt:${selectedIndex}` : '__plain__'

  return (
    <div className="gba:space-y-2">
      {bindOptions.length ? (
        <Select
          value={selectValue}
          onValueChange={v => {
            if (v === '__plain__') {
              if (parsed) onChange('')
              return
            }
            if (v.startsWith('opt:')) {
              const i = parseInt(v.slice(4), 10)
              const opt = bindOptions[i]
              if (opt) onChange(opt.ref)
            }
          }}
        >
          <SelectTrigger
            className="gba:h-9 gba:max-w-full [&>span]:truncate [&>span]:block [&>span]:text-left"
            data-testid={`${testId}-select`}
          >
            <SelectValue placeholder="Binding" />
          </SelectTrigger>
          <SelectContent className="gba:max-w-[min(100vw-2rem,28rem)]">
            <SelectItem value="__plain__">Plain value</SelectItem>
            {bindOptions.map((o, idx) => (
              <SelectItem
                key={`${o.ref}-${idx}`}
                value={`opt:${idx}`}
                className="[&>span]:line-clamp-2 [&>span]:break-all"
                title={o.label}
              >
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {selectedIndex >= 0 ? (
        <div
          className="gba:text-xs gba:font-mono gba:text-muted-foreground gba:break-all"
          data-testid={`${testId}-ref-preview`}
        >
          {value}
        </div>
      ) : (
        <Input
          type={plainInputType}
          placeholder={plainPlaceholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          data-testid={`${testId}-plain`}
        />
      )}
    </div>
  )
}
