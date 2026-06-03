import React, { useState, useEffect, useCallback } from 'react'
import {
  Badge,
  Button,
  IconAvatar,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast
} from '@newwork/nw-design-system'
import { PencilSimpleIcon, ArchiveIcon, EyeIcon, PlusIcon, XIcon } from '@phosphor-icons/react'
import {
  BenefitTypeEntry,
  LegalEntityOption,
  BenefitProviderFormData,
  BenefitsTranslationFn
} from '../types/benefitsMaintenanceTypes'
import { CatalogEntry, useCatalogEntries } from '@/common/data/catalog'
import { BENEFIT_PROVIDER_CATALOG, BENEFIT_PROVIDER_VERSION } from '../constants/benefitsMaintenanceConstants'
import { getIconComponent, DEFAULT_BENEFIT_ICON } from './BenefitIconPicker'
import BenefitProviderDialog from './BenefitProviderDialog'

const formatCurrency = (amount: string, currencyCode?: string): string => {
  if (!currencyCode) return amount
  return `${amount} ${currencyCode.toUpperCase()}`
}

interface BenefitDetailPanelProps {
  t: BenefitsTranslationFn
  entry: BenefitTypeEntry
  legalEntities: LegalEntityOption[]
  accessToken: string
  onEdit: (entry: BenefitTypeEntry) => void
  onArchive: (entry: BenefitTypeEntry) => void
  onViewProviders: (entry: BenefitTypeEntry) => void
  onLinkProvider: (provider: CatalogEntry, benefitTypeId: string) => Promise<void>
  onUnlinkProvider: (provider: CatalogEntry) => Promise<void>
  onCreateProvider: (data: BenefitProviderFormData) => Promise<void>
  onProvidersChanged: () => Promise<void> | void
}

function resolveLegalEntity(
  entry: BenefitTypeEntry,
  legalEntities: LegalEntityOption[]
): LegalEntityOption | undefined {
  const ov = entry.parsedObjectValue
  if (ov?.legalEntityId) {
    const match = legalEntities.find(le => le.id === ov.legalEntityId)
    if (match) return match
  }
  if (entry.parentEntryId) {
    return legalEntities.find(
      le => le.countryRef === entry.parentEntryId || entry.parentEntryId!.endsWith(`:${le.countryCode}`)
    )
  }
  return undefined
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:py-1.5 gba:text-sm">
    <span className="gba:text-muted-foreground">{label}</span>
    <span className="gba:max-w-64 gba:text-right gba:font-medium gba:text-foreground">
      {children || <span className="gba:text-muted-foreground">-</span>}
    </span>
  </div>
)

const Section: React.FC<{ title: string; children: React.ReactNode; action?: React.ReactNode }> = ({
  title,
  children,
  action
}) => (
  <div className="gba:mb-6">
    <div className="gba:mb-3 gba:flex gba:items-center gba:justify-between gba:gap-3 gba:border-b gba:border-border gba:pb-2">
      <h4 className="gba:min-w-0 gba:text-sm gba:font-semibold gba:text-foreground">{title}</h4>
      {action ? <div className="gba:shrink-0">{action}</div> : null}
    </div>
    <div className="gba:space-y-1">{children}</div>
  </div>
)

const BenefitDetailPanel: React.FC<BenefitDetailPanelProps> = ({
  t,
  entry,
  legalEntities,
  accessToken,
  onEdit,
  onArchive,
  onViewProviders,
  onLinkProvider,
  onUnlinkProvider,
  onCreateProvider,
  onProvidersChanged
}) => {
  const isDeleted = entry.isDeleted === true
  const obj = entry.parsedObjectValue

  const entity = resolveLegalEntity(entry, legalEntities)
  const currency = obj?.currency || entity?.currency
  const isPublic = obj?.groups?.includes('all-employees') ?? false

  const linkedProviders = (entry.childEntries ?? []).filter(c => !c.isDeleted)
  const linkedIds = new Set(linkedProviders.map(p => p.id))

  const [allProviders, setAllProviders] = useState<CatalogEntry[]>([])
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)

  const { fetchCatalogEntries } = useCatalogEntries({ accessToken })

  const loadAllProviders = useCallback(async () => {
    try {
      const { entries } = await fetchCatalogEntries({
        catalogIdentifier: BENEFIT_PROVIDER_CATALOG,
        version: BENEFIT_PROVIDER_VERSION,
        limit: 500
      })
      setAllProviders(entries.filter(e => !e.isDeleted))
    } catch {
      setAllProviders([])
    }
  }, [fetchCatalogEntries])

  useEffect(() => {
    if (showAddProvider && allProviders.length === 0) {
      loadAllProviders()
    }
  }, [showAddProvider, allProviders.length, loadAllProviders])

  const availableProviders = allProviders.filter(p => !linkedIds.has(p.id))
  let addProviderAction: React.ReactNode = null
  if (isDeleted === false) {
    addProviderAction = (
      <Button
        variant="ghost"
        size="sm"
        className="gba:h-7 gba:text-xs"
        onClick={() => setShowAddProvider(!showAddProvider)}
      >
        <PlusIcon className="gba:size-3.5 gba:mr-1" />
        {t('action-add-provider')}
      </Button>
    )
  }

  const handleLinkProvider = useCallback(
    async (providerId: string) => {
      const provider = allProviders.find(p => p.id === providerId)
      if (!provider) return
      setLinkingId(providerId)
      try {
        await onLinkProvider(provider, entry.id)
        toast.success(t('toast-provider-linked', { name: provider.value }))
        setShowAddProvider(false)
        await onProvidersChanged()
      } catch (err) {
        toast.error(t('toast-error', { message: err instanceof Error ? err.message : String(err) }))
      } finally {
        setLinkingId(null)
      }
    },
    [allProviders, entry.id, onLinkProvider, onProvidersChanged, t]
  )

  const handleUnlinkProvider = useCallback(
    async (provider: CatalogEntry) => {
      try {
        await onUnlinkProvider(provider)
        toast.success(t('toast-provider-unlinked', { name: provider.value }))
        await onProvidersChanged()
      } catch (err) {
        toast.error(t('toast-error', { message: err instanceof Error ? err.message : String(err) }))
      }
    },
    [onUnlinkProvider, onProvidersChanged, t]
  )

  const handleCreateProvider = useCallback(
    async (data: BenefitProviderFormData) => {
      try {
        await onCreateProvider(data)
        toast.success(t('toast-provider-created', { name: data.value }))
        setCreateDialogOpen(false)
        setShowAddProvider(false)
        await loadAllProviders()
        await onProvidersChanged()
      } catch (err) {
        toast.error(t('toast-error', { message: err instanceof Error ? err.message : String(err) }))
      }
    },
    [onCreateProvider, onProvidersChanged, loadAllProviders, t]
  )

  const entityLabel = entity?.name || obj?.legalEntityName
  const showProvidersEmptyState = linkedProviders.length === 0 && !showAddProvider

  return (
    <div data-testid="BenefitDetailPanel">
      {/* Hero */}
      <div className="gba:mb-6 gba:flex gba:items-start gba:gap-3">
        <IconAvatar icon={getIconComponent(obj?.icon) ?? DEFAULT_BENEFIT_ICON} variant="default" size="lg" decorative />
        <div className="gba:min-w-0 gba:flex-1">
          <div className="gba:text-base gba:font-semibold gba:leading-tight">{entry.value}</div>
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1.5 gba:mt-2">
            <Badge variant={isDeleted ? 'outline' : 'default'} size="sm">
              {isDeleted ? t('status-archived') : t('status-active')}
            </Badge>
            <Badge variant={isPublic ? 'default' : 'secondary'} size="sm">
              {isPublic ? t('visibility-public') : t('visibility-private')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <Section title={t('detail-section-basic')}>
        <Field label={t('detail-field-description')}>{entry.description}</Field>
        <Field label={t('detail-field-legal-entity')}>{entityLabel || null}</Field>
        <Field label={t('detail-field-visibility')}>
          <Badge variant={isPublic ? 'default' : 'secondary'} size="sm">
            {isPublic ? t('visibility-public') : t('visibility-private')}
          </Badge>
        </Field>
      </Section>

      {/* Financial */}
      <Section title={t('detail-section-value')}>
        <Field label={t('col-company-contribution')}>{obj?.value ? formatCurrency(obj.value, currency) : null}</Field>
        <Field label={t('detail-field-employee-contribution')}>
          {obj?.employeeMonthlyContribution ? formatCurrency(obj.employeeMonthlyContribution, currency) : null}
        </Field>
        <Field label={t('detail-field-period')}>{obj?.period ? t(`period-${obj.period}`) : null}</Field>
        <Field label={t('col-currency')}>{currency?.toUpperCase()}</Field>
      </Section>

      {/* Providers */}
      <Section title={`${t('detail-tab-providers')} (${linkedProviders.length})`} action={addProviderAction}>
        {linkedProviders.length > 0 ? (
          <div className="gba:space-y-1.5">
            {linkedProviders.map(child => (
              <div
                key={child.id}
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:py-1 gba:px-2 gba:rounded gba:hover:bg-muted/50 gba:group"
              >
                <span>{child.value || child.code || '-'}</span>
                {!isDeleted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gba:h-6 gba:w-6 gba:p-0 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity"
                    onClick={() => handleUnlinkProvider(child)}
                  >
                    <XIcon className="gba:size-3.5 gba:text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : null}
        {showProvidersEmptyState ? (
          <p className="gba:text-xs gba:text-muted-foreground">{t('providers-empty')}</p>
        ) : null}

        {showAddProvider && (
          <div className="gba:mt-3 gba:space-y-2">
            <Select value="" onValueChange={handleLinkProvider} disabled={linkingId !== null}>
              <SelectTrigger className="gba:w-full">
                <SelectValue placeholder={t('action-select-provider')} />
              </SelectTrigger>
              <SelectContent>
                {availableProviders.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.value} ({p.code})
                  </SelectItem>
                ))}
                {availableProviders.length === 0 && (
                  <div className="gba:px-3 gba:py-2 gba:text-xs gba:text-muted-foreground">
                    {t('providers-no-available')}
                  </div>
                )}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gba:w-full" onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon className="gba:size-3.5 gba:mr-1.5" />
              {t('action-create-provider')}
            </Button>
          </div>
        )}
      </Section>

      {/* Actions */}
      <div className="gba:border-t gba:pt-4 gba:flex gba:flex-wrap gba:gap-2">
        <Button variant="outline" size="sm" onClick={() => onViewProviders(entry)}>
          <EyeIcon className="gba:size-3.5 gba:mr-1.5" />
          {t('action-view-providers')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => onEdit(entry)} data-testid="BenefitDetailPanel-Edit">
          <PencilSimpleIcon className="gba:size-3.5 gba:mr-1.5" />
          {t('action-edit-benefit')}
        </Button>
        {!isDeleted && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onArchive(entry)}
            data-testid="BenefitDetailPanel-Archive"
          >
            <ArchiveIcon className="gba:size-3.5 gba:mr-1.5" />
            {t('action-archive-benefit')}
          </Button>
        )}
      </div>

      <BenefitProviderDialog
        t={t}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateProvider}
        mode="create"
        parentBenefitType={{ id: entry.id, value: entry.value || '' }}
      />
    </div>
  )
}

export default BenefitDetailPanel
