import { Button, Input, Label } from '@newwork/nw-design-system'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import type { LedgerBalance } from '../network/ledgerAdminClient'
import { LedgerPartySelect } from './TransactionAccountFields'

type TranslateFn = (key: string) => string
const FIELD_LABEL_CLASS = 'gba:text-sm gba:font-medium'

export type SplitSide = 'sources' | 'destinations'

export interface SplitEntry {
  id: string
  identifier: string
  distribution: string
}

interface TransactionSplitFieldsProps {
  balances: LedgerBalance[]
  destinations: SplitEntry[]
  onAddDestination: () => void
  onAddSource: () => void
  onDestinationChange: (id: string, patch: Partial<SplitEntry>) => void
  onRemoveDestination: (id: string) => void
  onRemoveSource: (id: string) => void
  onSplitSideChange: (side: SplitSide) => void
  onSourceChange: (id: string, patch: Partial<SplitEntry>) => void
  sources: SplitEntry[]
  splitSide: SplitSide
  t: TranslateFn
}

interface SplitRowsProps {
  balances: LedgerBalance[]
  addLabel: string
  canAdd: boolean
  entries: SplitEntry[]
  onAdd: () => void
  onChange: (id: string, patch: Partial<SplitEntry>) => void
  onRemove: (id: string) => void
  testId: string
  placeholder: string
  t: TranslateFn
}

export function TransactionSplitFields({
  balances,
  destinations,
  onAddDestination,
  onAddSource,
  onDestinationChange,
  onRemoveDestination,
  onRemoveSource,
  onSplitSideChange,
  onSourceChange,
  sources,
  splitSide,
  t
}: Readonly<TransactionSplitFieldsProps>) {
  return (
    <div className="gba:flex gba:flex-col gba:gap-4">
      <p className="gba:text-xs gba:text-muted-foreground">{t('ledger-admin-split-mode-help')}</p>
      <div className="gba:flex gba:flex-col gba:gap-2">
        <Label className={FIELD_LABEL_CLASS}>{t('ledger-admin-split-side')}</Label>
        <div className="gba:flex gba:gap-2">
          <Button
            type="button"
            variant={splitSide === 'destinations' ? 'default' : 'outline'}
            onClick={() => onSplitSideChange('destinations')}
            data-testid="ledger-split-side-destinations"
          >
            {t('ledger-admin-split-side-destinations')}
          </Button>
          <Button
            type="button"
            variant={splitSide === 'sources' ? 'default' : 'outline'}
            onClick={() => onSplitSideChange('sources')}
            data-testid="ledger-split-side-sources"
          >
            {t('ledger-admin-split-side-sources')}
          </Button>
        </div>
      </div>
      <SplitRows
        balances={balances}
        addLabel={t('ledger-admin-split-add-source')}
        canAdd={splitSide === 'sources'}
        entries={sources}
        onAdd={onAddSource}
        onChange={onSourceChange}
        onRemove={onRemoveSource}
        placeholder={t('ledger-admin-field-source-placeholder')}
        testId="ledger-split-source"
        t={t}
      />
      <SplitRows
        balances={balances}
        addLabel={t('ledger-admin-split-add-destination')}
        canAdd={splitSide === 'destinations'}
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
  balances,
  addLabel,
  canAdd,
  entries,
  onAdd,
  onChange,
  onRemove,
  testId,
  placeholder,
  t
}: Readonly<SplitRowsProps>) {
  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      {entries.map((entry, index) => (
        <div key={entry.id} className="gba:flex gba:flex-col gba:gap-2">
          <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-2">
            <LedgerPartySelect
              label={placeholder}
              value={entry.identifier}
              placeholder={placeholder}
              testId={`${testId}-account-${index}`}
              balances={balances}
              onChange={value => onChange(entry.id, { identifier: value })}
              t={t}
            />
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
          {entries.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(entry.id)}
              aria-label={t('ledger-admin-split-remove')}
              data-testid={`${testId}-remove-${index}`}
            >
              <TrashIcon className="gba:size-4" />
              {t('ledger-admin-split-remove')}
            </Button>
          )}
        </div>
      ))}
      {canAdd && (
        <Button type="button" variant="outline" size="sm" onClick={onAdd} data-testid={`${testId}-add`}>
          <PlusIcon className="gba:size-4" />
          {addLabel}
        </Button>
      )}
    </div>
  )
}
