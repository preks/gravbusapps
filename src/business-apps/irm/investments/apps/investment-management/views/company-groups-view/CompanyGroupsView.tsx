import React, { useCallback, useMemo, useState } from 'react'
import { Button, Card, CardContent, DataTable, Spinner, useTranslation } from '@newwork/nw-design-system'
import { ArrowLeftIcon, TreeStructureIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentCompanyGroups } from '@/common/data/investment/hooks/useInvestmentCompanyGroups'
import type { InvestmentCompanyGroup } from '@/common/data/investment/types/investmentCompanyGroupTypes'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { InvestmentCompanyGroupGraphCanvas } from './components/InvestmentCompanyGroupGraphCanvas'
import { InvestmentCompanyGraphDetails } from './components/InvestmentCompanyGraphDetails'
import { useInvestmentCompanyGroupGraph } from './hooks/useInvestmentCompanyGroupGraph'
import translations from './_i18n'

export type CompanyGroupsViewProps = BusinessAppContextProps

const getInitialGroupId = (): string | undefined => {
  if (globalThis.window === undefined) return undefined
  return new URLSearchParams(globalThis.location.search).get('groupId') || undefined
}

const updateGroupUrl = (groupId?: string) => {
  if (globalThis.window === undefined) return

  const params = new URLSearchParams(globalThis.location.search)
  params.set('view', 'groups')
  if (groupId) {
    params.set('groupId', groupId)
  } else {
    params.delete('groupId')
  }

  globalThis.history.replaceState(null, '', `${globalThis.location.pathname}?${params.toString()}`)
}

const GroupCard: React.FC<{
  group: InvestmentCompanyGroup
  isSelected: boolean
  onSelect: (groupId: string) => void
  t: (key: string) => string
  accessToken?: string
}> = ({ group, isSelected, onSelect, t, accessToken }) => (
  <div
    className={`gba:rounded-xl gba:border gba:bg-card gba:p-4 gba:text-left gba:shadow-sm gba:transition hover:gba:border-primary hover:gba:shadow-md ${
      isSelected ? 'gba:border-primary gba:ring-2 gba:ring-primary/20' : 'gba:border-border'
    }`}
    data-testid={`investment-company-group-card-${group.id}`}
  >
    <div className="gba:flex gba:items-start gba:gap-3">
      <button
        type="button"
        onClick={() => onSelect(group.id)}
        className="gba:flex gba:min-w-0 gba:flex-1 gba:items-start gba:gap-3 gba:bg-transparent gba:border-0 gba:p-0 gba:text-left"
        data-testid={`investment-company-group-card-open-${group.id}`}
      >
        <div className="gba:flex gba:h-10 gba:w-10 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:bg-primary/10 gba:text-primary">
          <TreeStructureIcon className="gba:h-5 gba:w-5" />
        </div>
        <div className="gba:min-w-0 gba:flex-1">
          <div className="gba:truncate gba:text-sm gba:font-semibold gba:text-foreground">
            {group.name || t('unnamed-group')}
          </div>
          <div className="gba:mt-1 gba:text-xs gba:text-muted-foreground">{t('open-ownership-chart')}</div>
        </div>
      </button>
      <AppAction
        variant="table-row"
        contexts={[
          {
            context: FlowContextName.investmentCompanyGroupEntity,
            contextData: {
              investmentCompanyGroupId: group.id,
              groupId: group.id
            }
          }
        ]}
        prefixDataTestId="investment-company-group-row-action"
        accessToken={accessToken}
        emptyState="enable"
        lazyLoad
        data-testid={`investment-company-group-row-action-button-${group.id}`}
      />
    </div>
  </div>
)

export const CompanyGroupsView: React.FC<CompanyGroupsViewProps> = context => {
  const { t } = useTranslation(translations)
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(getInitialGroupId)
  const [selectedInvestmentCompanyId, setSelectedInvestmentCompanyId] = useState<string | undefined>()
  const { groups, loading, error } = useInvestmentCompanyGroups(context.accessToken || '', {
    limit: 100,
    orderBy: [{ field: 'name', direction: 'ASC_NULLS_LAST' }]
  })

  const selectedGroup = useMemo(() => {
    return groups.find(group => group.id === selectedGroupId)
  }, [groups, selectedGroupId])

  const emptyColumns = useMemo<ColumnDef<InvestmentCompanyGroup>[]>(
    () => [
      {
        id: 'name',
        header: t('group-name-column'),
        accessorKey: 'name'
      }
    ],
    [t]
  )

  const handleSelectGroup = useCallback((groupId: string) => {
    setSelectedGroupId(groupId)
    setSelectedInvestmentCompanyId(undefined)
    updateGroupUrl(groupId)
  }, [])

  const handleBackToGroups = useCallback(() => {
    setSelectedGroupId(undefined)
    setSelectedInvestmentCompanyId(undefined)
    updateGroupUrl()
  }, [])

  const handleSelectInvestmentCompany = useCallback((investmentCompanyId: string) => {
    setSelectedInvestmentCompanyId(investmentCompanyId)
  }, [])

  const {
    graph,
    loading: graphLoading,
    error: graphError
  } = useInvestmentCompanyGroupGraph(context.accessToken, selectedGroupId, handleSelectInvestmentCompany)

  if (selectedGroupId) {
    return (
      <div className="gba:flex gba:h-full gba:flex-col gba:gap-4 gba:p-6" data-testid="company-group-graph-view">
        <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
          <div>
            <Button variant="ghost" onClick={handleBackToGroups} data-testid="company-group-graph-back-button">
              <ArrowLeftIcon className="gba:mr-2 gba:h-4 gba:w-4" />
              {t('groups-back-button')}
            </Button>
            <h2 className="gba:mt-3 gba:text-2xl gba:font-semibold gba:text-foreground">
              {graph?.name || selectedGroup?.name || t('default-group-title')}
            </h2>
            <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{t('graph-description')}</p>
          </div>
          <div className="gba:flex gba:gap-2 gba:text-sm gba:text-muted-foreground">
            <span>
              {graph?.nodes.length ?? 0} {t('companies-count-label')}
            </span>
            <span>
              {graph?.edges.length ?? 0} {t('ownership-links-count-label')}
            </span>
          </div>
        </div>

        {graphError && (
          <Card className="gba:border-destructive" data-testid="company-group-graph-error">
            <CardContent className="gba:p-4 gba:text-sm gba:text-destructive">{graphError}</CardContent>
          </Card>
        )}

        <Card className="gba:min-h-96 gba:flex-1 gba:overflow-hidden">
          <CardContent className="gba:h-full gba:p-0">
            <InvestmentCompanyGroupGraphCanvas
              nodes={graph?.nodes || []}
              edges={graph?.edges || []}
              loading={graphLoading}
            />
            {selectedInvestmentCompanyId && graph && (
              <InvestmentCompanyGraphDetails
                investmentCompanyId={selectedInvestmentCompanyId}
                nodes={graph.nodes}
                edges={graph.edges}
                onOpenChange={open => {
                  if (!open) setSelectedInvestmentCompanyId(undefined)
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="gba:h-full gba:overflow-auto gba:p-6" data-testid="company-groups-view">
      {loading && (
        <div className="gba:flex gba:min-h-64 gba:items-center gba:justify-center" data-testid="company-groups-loading">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <Card className="gba:border-destructive" data-testid="company-groups-error">
          <CardContent className="gba:p-4 gba:text-sm gba:text-destructive">{error}</CardContent>
        </Card>
      )}

      {!loading && !error && groups.length === 0 && (
        <DataTable<InvestmentCompanyGroup>
          data={[]}
          columns={emptyColumns}
          totalCount={0}
          enablePagination={false}
          enableSorting={false}
          enableSelection={false}
          emptyMessage={t('empty-groups')}
          data-testid="company-groups-empty-table"
        />
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="gba:grid gba:grid-cols-1 gba:gap-4 md:gba:grid-cols-2 xl:gba:grid-cols-3">
          {groups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              isSelected={group.id === selectedGroupId}
              onSelect={handleSelectGroup}
              t={t}
              accessToken={context.accessToken}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default CompanyGroupsView
