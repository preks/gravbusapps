import React, { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import { splitCatalogRef } from './icpLeadCriterionDefinitions'

export interface IcpCatalogValueSelectProps {
  accessToken: string | undefined
  catalogRef: string
  value: string
  onChange: (next: string) => void
  dataTestId: string
  disabled?: boolean
}

/**
 * Loads catalog entries for a lead-related catalog and renders a design-system Select (target value for ICP).
 */
export const IcpCatalogValueSelect: React.FC<IcpCatalogValueSelectProps> = ({
  accessToken,
  catalogRef,
  value,
  onChange,
  dataTestId,
  disabled
}) => {
  const { fetchCatalogEntries } = useCatalogEntries({ accessToken: accessToken ?? '' })
  const [options, setOptions] = useState<Array<{ id: string; label: string }>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!accessToken || !catalogRef) {
      setOptions([])
      return
    }
    let cancelled = false
    setLoading(true)
    const { catalogIdentifier, version } = splitCatalogRef(catalogRef)
    void fetchCatalogEntries({ catalogIdentifier, version, limit: 500 })
      .then(({ entries }) => {
        if (cancelled) return
        setOptions(
          entries.map(e => ({
            id: e.id,
            label: (e.value && String(e.value).trim()) || e.displayValue || e.code || e.id
          }))
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, catalogRef, fetchCatalogEntries])

  const selectValue = value.length > 0 ? value : undefined

  return (
    <Select
      value={selectValue}
      onValueChange={onChange}
      disabled={disabled || !accessToken || loading}
      data-testid={dataTestId}
    >
      <SelectTrigger className="gba:w-full" data-testid={`${dataTestId}-trigger`}>
        <SelectValue placeholder={loading ? '…' : '—'} />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.id} value={opt.id}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
