import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent, useTranslation } from '@newwork/nw-design-system'
import { CalendarBlank, Clock, TreeStructure } from '@phosphor-icons/react'
import translations from '../_i18n'
import AbsenceSetupTable from './AbsenceSetupTable'
import type { AbsenceSetupSectionCardConfig } from '../utils/absenceSetupSectionCards'
const SUBTAB_VALUES = ['groups', 'types', 'versions'] as const
type AbsenceTypesSubTab = (typeof SUBTAB_VALUES)[number]

const getInitialSubTab = (): AbsenceTypesSubTab => {
  if (globalThis.window === undefined) return 'groups'
  const subView = new URLSearchParams(globalThis.location.search).get('subView')
  if (subView && SUBTAB_VALUES.includes(subView as AbsenceTypesSubTab)) {
    return subView as AbsenceTypesSubTab
  }
  return 'groups'
}

interface AbsenceTypesTabProps {
  typeSection: AbsenceSetupSectionCardConfig
  versionSection: AbsenceSetupSectionCardConfig
  groupSection: AbsenceSetupSectionCardConfig
}

const emptyItems: { id: string; title: string; description: string }[] = []

const AbsenceTypesTab: React.FC<AbsenceTypesTabProps> = ({ typeSection, versionSection, groupSection }) => {
  const { t } = useTranslation(translations)
  const [activeSubTab, setActiveSubTab] = useState<AbsenceTypesSubTab>(getInitialSubTab)

  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search)
    params.set('subView', activeSubTab)
    globalThis.history.replaceState({}, '', `${globalThis.location.pathname}?${params.toString()}`)
  }, [activeSubTab])

  useEffect(() => {
    const handlePopState = () => setActiveSubTab(getInitialSubTab())
    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [])

  const renderTable = (
    section: AbsenceSetupSectionCardConfig,
    tableTestId: string,
    extraColumns?: { header: string; fieldLabel: string }[],
    showPriorityColumn = false,
    groupByKey?: string
  ) => (
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
      showPriorityColumn={showPriorityColumn}
      extraColumns={extraColumns}
      groupByKey={groupByKey}
    />
  )

  const versionExtraColumns = [
    { header: t('details-label-group'), fieldLabel: t('details-label-group'), sortKey: 'group' },
    { header: t('details-label-measurement'), fieldLabel: t('details-label-measurement'), sortKey: 'measurement' },
    { header: t('details-label-country'), fieldLabel: t('details-label-country'), sortKey: 'country' },
    {
      header: t('eligibility-regions-label'),
      fieldLabel: t('eligibility-regions-label'),
      tableValueKey: 'regions-compact'
    },
    {
      header: t('eligibility-employment-types-label'),
      fieldLabel: t('eligibility-employment-types-label'),
      sortKey: 'employment-types'
    },
    {
      header: t('eligibility-contract-types-label'),
      fieldLabel: t('eligibility-contract-types-label'),
      sortKey: 'contract-types'
    }
  ]

  return (
    <div data-testid="absence-types-tab-container" className="gba:w-full">
      <Tabs value={activeSubTab} onValueChange={v => setActiveSubTab(v as AbsenceTypesSubTab)} className="gba:w-full">
        <TabsList className="gba:mb-6 gba:w-full gba:justify-start" data-testid="absence-types-subtabs-list">
          <TabsTrigger value="groups" data-testid="absence-types-subtab-groups" className="gba:flex-1">
            <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
              <TreeStructure />
              <span>{t('subtab-groups')}</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="types" data-testid="absence-types-subtab-types" className="gba:flex-1">
            <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
              <CalendarBlank />
              <span>{t('subtab-types')}</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="versions" data-testid="absence-types-subtab-versions" className="gba:flex-1">
            <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
              <Clock />
              <span>{t('subtab-versions')}</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" data-testid="absence-types-subtab-groups-content" className="gba:mt-0">
          {renderTable(groupSection, 'absence-groups-table')}
        </TabsContent>

        <TabsContent value="types" data-testid="absence-types-subtab-types-content" className="gba:mt-0">
          {renderTable(
            typeSection,
            'absence-types-table',
            [{ header: t('details-label-group'), fieldLabel: t('details-label-group'), sortKey: 'group' }],
            false,
            'group'
          )}
        </TabsContent>

        <TabsContent value="versions" data-testid="absence-types-subtab-versions-content" className="gba:mt-0">
          {renderTable(versionSection, 'absence-versions-table', versionExtraColumns, true)}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AbsenceTypesTab
