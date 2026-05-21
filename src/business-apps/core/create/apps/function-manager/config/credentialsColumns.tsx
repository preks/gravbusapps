import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { StoredSecretOption } from '../components/editor/SettingsEditor'

type TranslationFn = (key: string) => string

export const CREDENTIALS_TABLE_COLUMN_IDS = ['displayName', 'fieldCount'] as const

export function createCredentialsColumns(t: TranslationFn): ColumnDef<StoredSecretOption>[] {
  return [
    {
      id: 'displayName',
      accessorKey: 'displayName',
      header: t('credentials-column-name'),
      size: 280,
      cell: ({ row }) => <div className="gba:font-medium">{row.original.displayName}</div>
    },
    {
      id: 'fieldCount',
      accessorFn: row => (row.fieldKeys?.length ?? 0),
      header: t('credentials-column-fields'),
      size: 140,
      meta: { align: 'center' },
      cell: ({ row }) => (
        <div className="gba:text-center gba:tabular-nums">{row.original.fieldKeys?.length ?? 0}</div>
      )
    }
  ]
}
