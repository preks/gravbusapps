'use client'

import { useEffect, useState } from 'react'
import { PageLayout, useTranslation } from '@newwork/nw-design-system'
import { CalendarBlank, CurrencyCircleDollar, MagnifyingGlassIcon, Scroll, SquaresFour } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from './_i18n'
import { AbsenceSetupDeleteDialog } from './components/AbsenceSetupDeleteDialog'
import AbsenceSetupTable from './components/AbsenceSetupTable'
import AbsenceTypesTab from './components/AbsenceTypesTab'
import { AbsenceTypeVersionRecord } from './components/AbsenceTypeVersionRecord'
import { AbsenceEntitlementRecord } from './components/AbsenceEntitlementRecord'
import { AbsencePolicyRecord } from './components/AbsencePolicyRecord'
import { AbsenceEligibilityChecker } from './components/AbsenceEligibilityChecker'
import { useAbsenceSetupController } from './hooks/useAbsenceSetupController'
import { GenericCatalogEntryModal, type GenericCatalogEntryModalValues } from './modals/GenericCatalogEntryModal'
import { AbsenceTypeModal, type AbsenceTypeModalValues } from './modals/AbsenceTypeModal'

type AbsenceSetupProps = BusinessAppContextProps
type UseAbsenceSetupController = ReturnType<typeof useAbsenceSetupController>

const TYPE_SECTION_CARD_ID = 'absence-setup-types-card'
const VERSION_SECTION_CARD_ID = 'absence-setup-versions-card'

const VIEW_TYPES = 'absence-types'
const VIEW_ENTITLEMENTS = 'entitlements'
const VIEW_POLICIES = 'policies'
const VIEW_ELIGIBILITY_CHECK = 'eligibility-check'

type RecordType = 'version' | 'entitlement' | 'policy'

interface RecordParams {
  recordType: RecordType | null
  recordId: string | null
}

const emptyItems: { id: string; title: string; description: string }[] = []

const eligibilityExtraColumns = (t: (key: string, values?: Record<string, string>) => string) => [
  { header: t('field-company-label'), fieldLabel: t('field-company-label'), sortKey: 'company' },
  { header: t('details-label-country'), fieldLabel: t('details-label-country'), sortKey: 'country' },
  {
    header: t('eligibility-contract-types-label'),
    fieldLabel: t('eligibility-contract-types-label'),
    sortKey: 'contract-types'
  },
  {
    header: t('eligibility-employment-types-label'),
    fieldLabel: t('eligibility-employment-types-label'),
    sortKey: 'employment-types'
  }
]

interface AbsenceActiveViewProps {
  activeView: string
  typeSection: UseAbsenceSetupController['sectionCards'][number] | undefined
  versionSectionWithNav:
    | (UseAbsenceSetupController['sectionCards'][number] & { onEdit: (id: string) => void })
    | undefined
  groupSection: UseAbsenceSetupController['sectionCards'][number] | undefined
  entitlementSectionWithNav:
    | (UseAbsenceSetupController['sectionCards'][number] & { onEdit: (id: string) => void })
    | undefined
  policySectionWithNav:
    | (UseAbsenceSetupController['sectionCards'][number] & { onEdit: (id: string) => void })
    | undefined
  controller: UseAbsenceSetupController
  accessToken: string
  t: (key: string, values?: Record<string, string>) => string
}

const AbsenceActiveView: React.FC<AbsenceActiveViewProps> = ({
  activeView,
  typeSection,
  versionSectionWithNav,
  groupSection,
  entitlementSectionWithNav,
  policySectionWithNav,
  controller,
  accessToken,
  t
}) => {
  const extraCols = eligibilityExtraColumns(t)

  const renderTable = (
    section: typeof entitlementSectionWithNav,
    tableTestId: string,
    extraColumns?: { header: string; fieldLabel: string; sortKey?: string }[]
  ) => {
    if (!section) return null
    return (
      <AbsenceSetupTable
        icon={section.icon}
        title={section.title}
        description={section.description}
        addLabel={t('add-catalog-entry-button', { entity: section.entityLabel })}
        editLabel={t('edit-button')}
        deleteLabel={t('delete-button')}
        loadingLabel={t('loading-catalog-entries', { entity: section.title })}
        emptyLabel={t('empty-catalog-entries', { entity: section.title })}
        errorTitle={t('load-error-title')}
        errorMessage={section.errorMessage}
        items={section.items || emptyItems}
        isLoading={section.isLoading}
        onAdd={section.onAdd}
        sortOptions={section.sortOptions}
        onEdit={section.onEdit}
        onDelete={section.onDelete}
        addButtonTestId={section.addButtonTestId}
        tableTestId={tableTestId}
        showAddAction={section.showAddAction}
        showDeleteAction={section.showDeleteAction}
        extraColumns={extraColumns}
      />
    )
  }

  if (activeView === VIEW_TYPES && typeSection && versionSectionWithNav && groupSection) {
    return (
      <AbsenceTypesTab typeSection={typeSection} versionSection={versionSectionWithNav} groupSection={groupSection} />
    )
  }

  if (activeView === VIEW_ENTITLEMENTS) {
    return renderTable(entitlementSectionWithNav, 'absence-entitlements-table', extraCols)
  }

  if (activeView === VIEW_POLICIES) {
    return renderTable(policySectionWithNav, 'absence-policies-table', extraCols)
  }

  if (activeView === VIEW_ELIGIBILITY_CHECK) {
    return (
      <AbsenceEligibilityChecker
        entitlementEntries={controller.absenceEntitlements}
        policyEntries={controller.absencePolicies}
        countries={controller.countries}
        contractTypes={controller.contractTypes}
        employmentTypes={controller.employmentTypes}
        accessToken={accessToken}
        absenceTypes={controller.absenceTypes}
      />
    )
  }

  return null
}

interface AbsenceRecordViewProps {
  recordType: RecordType
  recordId: string
  controller: UseAbsenceSetupController
  accessToken: string
  onNavigateBack: () => void
}

const AbsenceRecordView: React.FC<AbsenceRecordViewProps> = ({
  recordType,
  recordId,
  controller,
  accessToken,
  onNavigateBack
}) => {
  const isNew = recordId === 'new'

  if (recordType === 'version') {
    const entry = isNew ? null : (controller.absenceTypeVersions.find(e => e.id === recordId) ?? null)
    return (
      <div data-testid="absence-setup-container" className="gba:h-full">
        <AbsenceTypeVersionRecord
          entry={entry}
          absenceTypes={controller.absenceTypes}
          absenceTypeVersions={controller.absenceTypeVersions}
          employmentTypes={controller.employmentTypes}
          contractTypes={controller.contractTypes}
          countries={controller.countries}
          regionsByCountry={controller.regionsByCountry}
          regionsLoading={controller.regionsLoading}
          onCountryExpanded={controller.fetchRegionsForCountry}
          onSave={formValues => {
            const currentEntry = isNew ? null : (controller.absenceTypeVersions.find(e => e.id === recordId) ?? null)
            return controller.handleSaveAbsenceTypeVersion(formValues, currentEntry, onNavigateBack)
          }}
          onNavigateBack={onNavigateBack}
        />
      </div>
    )
  }

  if (recordType === 'entitlement') {
    const entry = isNew ? null : (controller.absenceEntitlements.find(e => e.id === recordId) ?? null)
    return (
      <div data-testid="absence-setup-container" className="gba:h-full">
        <AbsenceEntitlementRecord
          entitlement={entry}
          absenceTypes={controller.absenceTypes}
          absenceTypeVersions={controller.absenceTypeVersions}
          accessToken={accessToken}
          companies={controller.companies}
          isLoadingCompanies={controller.isLoadingCompanies}
          onSearchCompanies={controller.searchCompanies}
          onLoadMoreCompanies={controller.loadMoreCompanies}
          countries={controller.countries}
          contractTypes={controller.contractTypes}
          employmentTypes={controller.employmentTypes}
          onSave={formValues =>
            controller.handleSaveAbsenceEntitlement(formValues, isNew ? null : recordId, onNavigateBack)
          }
          onNavigateBack={onNavigateBack}
        />
      </div>
    )
  }

  if (recordType === 'policy') {
    const entry = isNew ? null : (controller.absencePolicies.find(e => e.id === recordId) ?? null)
    return (
      <div data-testid="absence-setup-container" className="gba:h-full">
        <AbsencePolicyRecord
          policy={entry}
          absenceTypes={controller.absenceTypes}
          accessToken={accessToken}
          companies={controller.companies}
          isLoadingCompanies={controller.isLoadingCompanies}
          onSearchCompanies={controller.searchCompanies}
          onLoadMoreCompanies={controller.loadMoreCompanies}
          countries={controller.countries}
          contractTypes={controller.contractTypes}
          employmentTypes={controller.employmentTypes}
          onSave={formValues => controller.handleSaveAbsencePolicy(formValues, isNew ? null : recordId, onNavigateBack)}
          onNavigateBack={onNavigateBack}
        />
      </div>
    )
  }

  return null
}

const getInitialView = () => {
  const params = new URLSearchParams(globalThis.location.search)
  const view = params.get('view')
  if (view && [VIEW_TYPES, VIEW_ENTITLEMENTS, VIEW_POLICIES, VIEW_ELIGIBILITY_CHECK].includes(view)) {
    return view
  }
  return VIEW_TYPES
}

const getRecordParams = (): RecordParams => {
  const params = new URLSearchParams(globalThis.location.search)
  const recordType = params.get('recordType') as RecordType | null
  const recordId = params.get('recordId')
  const validTypes: RecordType[] = ['version', 'entitlement', 'policy']
  if (recordType && validTypes.includes(recordType) && recordId) {
    return { recordType, recordId }
  }
  return { recordType: null, recordId: null }
}

const AbsenceSetup: React.FC<AbsenceSetupProps> = ({ accessToken }) => {
  const { t } = useTranslation(translations)
  const controller = useAbsenceSetupController(accessToken || '', t)
  const [activeView, setActiveView] = useState<string>(getInitialView)
  const [recordParams, setRecordParams] = useState<RecordParams>(getRecordParams)

  const typeSection = controller.sectionCards.find(s => s.cardTestId === TYPE_SECTION_CARD_ID)
  const versionSection = controller.sectionCards.find(s => s.cardTestId === VERSION_SECTION_CARD_ID)
  const entitlementSection = controller.sectionCards.find(s => s.cardTestId === 'absence-setup-entitlements-card')
  const policySection = controller.sectionCards.find(s => s.cardTestId === 'absence-setup-policies-card')
  const groupSection = controller.sectionCards.find(s => s.cardTestId === 'absence-setup-groups-card')

  const handleOpenRecord = (type: RecordType, id: string) => {
    const params = new URLSearchParams(globalThis.location.search)
    params.set('recordType', type)
    params.set('recordId', id)
    globalThis.history.pushState({}, '', `${globalThis.location.pathname}?${params.toString()}`)
    setRecordParams({ recordType: type, recordId: id })
  }

  const handleNavigateBack = () => {
    const params = new URLSearchParams(globalThis.location.search)
    params.delete('recordType')
    params.delete('recordId')
    globalThis.history.pushState({}, '', `${globalThis.location.pathname}?${params.toString()}`)
    setRecordParams({ recordType: null, recordId: null })
  }

  const handleViewChange = (view: string) => {
    setActiveView(view)
    const params = new URLSearchParams(globalThis.location.search)
    params.set('view', view)
    params.delete('subView')
    params.delete('recordType')
    params.delete('recordId')
    globalThis.history.replaceState({}, '', `${globalThis.location.pathname}?${params.toString()}`)
    setRecordParams({ recordType: null, recordId: null })
  }

  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search)
    if (!params.has('view')) {
      params.set('view', activeView)
      globalThis.history.replaceState({}, '', `${globalThis.location.pathname}?${params.toString()}`)
    }
  }, [activeView])

  useEffect(() => {
    const handlePopState = () => {
      setActiveView(getInitialView())
      setRecordParams(getRecordParams())
    }
    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [])

  const versionSectionWithNav = versionSection
    ? {
        ...versionSection,
        onAdd: () => handleOpenRecord('version', 'new'),
        onEdit: (id: string) => handleOpenRecord('version', id)
      }
    : undefined

  const entitlementSectionWithNav = entitlementSection
    ? {
        ...entitlementSection,
        onAdd: () => handleOpenRecord('entitlement', 'new'),
        onEdit: (id: string) => handleOpenRecord('entitlement', id)
      }
    : undefined

  const policySectionWithNav = policySection
    ? {
        ...policySection,
        onAdd: () => handleOpenRecord('policy', 'new'),
        onEdit: (id: string) => handleOpenRecord('policy', id)
      }
    : undefined

  if (recordParams.recordType && recordParams.recordId) {
    return (
      <AbsenceRecordView
        recordType={recordParams.recordType}
        recordId={recordParams.recordId}
        controller={controller}
        accessToken={accessToken || ''}
        onNavigateBack={handleNavigateBack}
      />
    )
  }

  return (
    <div data-testid="absence-setup-container">
      <PageLayout
        headerTitle={t('page-title')}
        headerDescription={t('page-description')}
        headerIcon={SquaresFour}
        headerSubViews={{
          value: activeView,
          onValueChange: handleViewChange,
          items: [
            {
              value: VIEW_TYPES,
              label: t('nav-absence-types'),
              icon: <CalendarBlank />
            },
            {
              value: VIEW_ENTITLEMENTS,
              label: t('nav-entitlements'),
              icon: <CurrencyCircleDollar />
            },
            {
              value: VIEW_POLICIES,
              label: t('nav-policies'),
              icon: <Scroll />
            },
            {
              value: VIEW_ELIGIBILITY_CHECK,
              label: t('eligibility-checker-tab'),
              icon: <MagnifyingGlassIcon />
            }
          ]
        }}
      >
        <div className="gba:p-6" data-testid="absence-setup-active-view">
          <AbsenceActiveView
            activeView={activeView}
            typeSection={typeSection}
            versionSectionWithNav={versionSectionWithNav}
            groupSection={groupSection}
            entitlementSectionWithNav={entitlementSectionWithNav}
            policySectionWithNav={policySectionWithNav}
            controller={controller}
            accessToken={accessToken || ''}
            t={t}
          />
        </div>
      </PageLayout>

      <AbsenceTypeModal
        open={controller.isAbsenceTypeModalOpen}
        onClose={controller.closeAbsenceTypeModal}
        onSave={controller.handleSaveAbsenceType as (values: AbsenceTypeModalValues) => Promise<void>}
        absenceType={controller.selectedAbsenceType}
        groups={controller.absenceGroups}
      />

      <GenericCatalogEntryModal
        open={controller.isGenericCatalogModalOpen}
        onClose={controller.closeGenericCatalogModal}
        onSave={controller.handleSaveGenericCatalogEntry as (values: GenericCatalogEntryModalValues) => Promise<void>}
        entry={controller.selectedGenericEntry}
        entityLabel={controller.genericEntityLabel}
      />

      <AbsenceSetupDeleteDialog
        open={Boolean(controller.pendingDelete)}
        entityLabel={controller.pendingDelete?.entityLabel || ''}
        name={controller.pendingDelete?.name || ''}
        isDeleting={controller.isDeleting}
        blockedReason={controller.pendingDelete?.blockedReason}
        errorMessage={controller.deleteErrorMessage}
        onCancel={controller.clearPendingDelete}
        onConfirm={controller.handleConfirmDelete}
      />
    </div>
  )
}

export default AbsenceSetup
