import React from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import type { LedgerAccount } from '../../common/network/ledgerAdminClient'
import { accountOptionLabel } from '../../common/utils/ledgerNames'
import { EXTERNAL_REF } from './transactionDialogUtils'

type TranslateFn = (key: string) => string
const FIELD_LABEL_CLASS = 'gba:text-sm gba:font-medium'

export interface SplitEntry {
  id: string
  identifier: string
  distribution: string
}

interface TransactionSplitFieldsProps {
  accounts: LedgerAccount[]
  destinations: SplitEntry[]
  onAddDestination: () => void
  onAddSource: () => void
  onDestinationChange: (id: string, patch: Partial<SplitEntry>) => void
  onRemoveDestination: (id: string) => void
  onRemoveSource: (id: string) => void
  onSourceChange: (id: string, patch: Partial<SplitEntry>) => void
  sources: SplitEntry[]
  t: TranslateFn
}

interface SplitRowsProps {
  accounts: LedgerAccount[]
  addLabel: string
  entries: SplitEntry[]
  onAdd: () => void
  onChange: (id: string, patch: Partial<SplitEntry>) => void
  onRemove: (id: string) => void
  placeholder: string
  testId: string
  t: TranslateFn
}

export function TransactionSplitFields({
  accounts,
  destinations,
  onAddDestination,
  onAddSource,
  onDestinationChange,
  onRemoveDestination,
  onRemoveSource,
  onSourceChange,
  sources,
  t
}: Readonly<TransactionSplitFieldsProps>) {
  return (
    <div className="gba:flex gba:flex-col gba:gap-4">
      <p className="gba:text-xs gba:text-muted-foreground">{t('ledger-admin-split-mode-help')}</p>
      <SplitRows
        accounts={accounts}
        addLabel={t('ledger-admin-split-add-source')}
        entries={sources}
        onAdd={onAddSource}
        onChange={onSourceChange}
        onRemove={onRemoveSource}
        placeholder={t('ledger-admin-field-source-placeholder')}
        testId="ledger-split-source"
        t={t}
      />
      <SplitRows
        accounts={accounts}
        addLabel={t('ledger-admin-split-add-destination')}
        entries={destinations}
        onAdd={onAddDestination}
        onChange={onDestinationChange}
        onRemove={onRemoveDestination}
        placeholder={t('ledger-admin-field-destination-placeholder')}
        testId="ledger-split-destination"
        t={t}
      />
    </div>
  )
}

function SplitRows({
  accounts,
  addLabel,
  entries,
  onAdd,
  onChange,
  onRemove,
  placeholder,
  testId,
  t
}: Readonly<SplitRowsProps>) {
  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      {entries.map((entry, index) => (
        <div key={entry.id} className="gba:flex gba:flex-col gba:gap-2">
          <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-2">
            <div className="gba:flex gba:flex-col gba:gap-2">
              <Label className={FIELD_LABEL_CLASS}>{placeholder}</Label>
              <Select value={entry.identifier} onValueChange={value => onChange(entry.id, { identifier: value })}>
                <SelectTrigger data-testid={`${testId}-account-${index}`}>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EXTERNAL_REF}>{t('ledger-admin-external')}</SelectItem>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.balanceId}>
                      {accountOptionLabel(account, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="gba:flex gba:flex-col gba:gap-2">
              <Label className={FIELD_LABEL_CLASS}>{t('ledger-admin-split-percentage')}</Label>
              <Input
                value={entry.distribution}
                onChange={event => onChange(entry.id, { distribution: event.target.value })}
                placeholder={t('ledger-admin-split-distribution-placeholder')}
                aria-label={t('ledger-admin-split-percentage')}
                data-testid={`${testId}-distribution-${index}`}
              />
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(entry.id)}
            disabled={entries.length === 1}
            aria-label={t('ledger-admin-split-remove')}
            data-testid={`${testId}-remove-${index}`}
          >
            <TrashIcon className="gba:size-4" />
            {t('ledger-admin-split-remove')}
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={onAdd} data-testid={`${testId}-add`}>
        <PlusIcon className="gba:size-4" />
        {addLabel}
      </Button>
    </div>
  )
}
