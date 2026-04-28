import React, { useEffect, useMemo, useState } from 'react'
import { Combobox, Label } from '@newwork/nw-design-system'
import type { DataSource, InputBlock } from '@/common/data/flow/types/flowTemplate'

export const CustomDataSourceSection: React.FC<{
  field: InputBlock
  namespaces?: string[]
  namespacesLoading?: boolean
  keysByNamespace?: Record<string, string[]>
  keysLoadingByNamespace?: Record<string, boolean>
  fetchKeys?: (namespace: string) => Promise<void>
  showFieldMapping?: boolean
  index: number
  onChange: (updated: InputBlock) => void
  testId: string
}> = ({
  field,
  namespaces,
  namespacesLoading,
  keysByNamespace,
  keysLoadingByNamespace,
  fetchKeys,
  index,
  onChange,
  testId
}) => {
  const [namespaceSearch, setNamespaceSearch] = useState('')
  const [keySearch, setKeySearch] = useState('')
  const list = Array.isArray(namespaces) ? namespaces : []
  const namespace = field.dataSource?.type === 'CUSTOM_DATA' ? field.dataSource.namespace || 'default' : 'default'
  const key = field.dataSource?.type === 'CUSTOM_DATA' ? field.dataSource.key || '' : ''
  const keys = (keysByNamespace && keysByNamespace[namespace]) || []
  const keysLoading = Boolean(keysLoadingByNamespace && keysLoadingByNamespace[namespace])

  const namespaceList = useMemo(() => {
    const base = list.length ? list.slice() : ['default']
    if (!base.includes('default')) base.push('default')
    return base
      .map(s => String(s || '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
  }, [list])

  const filteredNamespaces = useMemo(() => {
    const q = String(namespaceSearch || '')
      .trim()
      .toLowerCase()
    if (!q) return namespaceList
    return namespaceList.filter(ns => ns.toLowerCase().includes(q))
  }, [namespaceList, namespaceSearch])

  const namespaceOptions = useMemo(
    () =>
      filteredNamespaces.map(ns => ({
        value: ns,
        label: ns
      })),
    [filteredNamespaces]
  )

  const keyList = useMemo(
    () =>
      (Array.isArray(keys) ? keys : [])
        .map(s => String(s || '').trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [keys]
  )

  const filteredKeys = useMemo(() => {
    const q = String(keySearch || '')
      .trim()
      .toLowerCase()
    if (!q) return keyList
    return keyList.filter(k => k.toLowerCase().includes(q))
  }, [keyList, keySearch])

  const keyOptions = useMemo(
    () =>
      filteredKeys.map(k => ({
        value: k,
        label: k
      })),
    [filteredKeys]
  )

  useEffect(() => {
    if (!fetchKeys) return
    if (!namespace) return
    fetchKeys(namespace)
  }, [fetchKeys, namespace])

  const setNamespace = (nextNs: string) => {
    onChange({
      ...field,
      dataSource: {
        ...(field.dataSource?.type === 'CUSTOM_DATA' ? field.dataSource : { type: 'CUSTOM_DATA' }),
        type: 'CUSTOM_DATA',
        namespace: nextNs,
        key: '',
        valueField: 'code',
        labelField: 'value'
      } as DataSource
    })
  }

  const setKey = (nextKey: string) => {
    onChange({
      ...field,
      dataSource: {
        ...(field.dataSource?.type === 'CUSTOM_DATA' ? field.dataSource : { type: 'CUSTOM_DATA' }),
        type: 'CUSTOM_DATA',
        namespace,
        key: nextKey,
        valueField: 'code',
        labelField: 'value'
      } as DataSource
    })
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      <div className="gba:flex gba:flex-col gba:gap-1">
        <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Namespace</Label>
        <Combobox
          className="gba:w-full gba:h-auto"
          options={namespaceOptions as any}
          value={namespace}
          onValueChange={setNamespace}
          placeholder={namespacesLoading ? 'Loading namespaces…' : 'Select namespace…'}
          searchPlaceholder="Search namespaces…"
          emptyText={namespacesLoading ? 'Loading namespaces…' : 'No matching namespaces'}
          loading={Boolean(namespacesLoading)}
          onSearch={q => setNamespaceSearch(q)}
          searchDebounce={150}
          data-testid={`${testId}-${index}-custom-data-namespace`}
          align="start"
        />
      </div>

      <div className="gba:flex gba:flex-col gba:gap-1">
        <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Data source key</Label>
        <Combobox
          className="gba:w-full gba:h-auto"
          options={keyOptions as any}
          value={key}
          onValueChange={setKey}
          placeholder={keysLoading ? 'Loading keys…' : keyList.length ? 'Select key…' : 'No keys available'}
          searchPlaceholder="Search keys…"
          emptyText={keysLoading ? 'Loading keys…' : 'No matching keys'}
          loading={Boolean(keysLoading)}
          onSearch={q => setKeySearch(q)}
          searchDebounce={150}
          data-testid={`${testId}-${index}-custom-data-key`}
          align="start"
        />
      </div>
    </div>
  )
}
