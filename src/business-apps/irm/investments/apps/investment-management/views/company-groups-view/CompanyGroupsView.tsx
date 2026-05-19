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

export type CompanyGroupsViewProps = BusinessAppContextProps & {
  selectedGroupId?: string
  onSelectGroup?: (groupId: string) => void
  onBackFromGroup?: () => void
}

export const updateCompanyGroupUrl = (groupId?: string) => {
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

export const CompanyGroupsView: React.FC<CompanyGroupsViewProps> = ({
  selectedGroupId: selectedGroupIdProp,
  onSelectGroup,
  onBackFromGroup,
  ...context
}) => {
  const { t } = useTranslation(translations)
  const [selectedInvestmentCompanyId, setSelectedInvestmentCompanyId] = useState<string | undefined>()
  const selectedGroupId = selectedGroupIdProp
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

  const handleSelectGroup = useCallback(
    (groupId: string) => {
      setSelectedInvestmentCompanyId(undefined)
      onSelectGroup?.(groupId)
    },
    [onSelectGroup]
  )

  const handleBackToGroups = useCallback(() => {
    setSelectedInvestmentCompanyId(undefined)
    onBackFromGroup?.()
  }, [onBackFromGroup])

  const handleSelectInvestmentCompany = useCallback((investmentCompanyId: string) => {
    setSelectedInvestmentCompanyId(investmentCompanyId)
  }, [])

  const {
    graph,
    loading: graphLoading,
    error: graphError
  } = useInvestmentCompanyGroupGraph(context.accessToken, selectedGroupId, handleSelectInvestmentCompany)

  if (selectedGroupId) {
    const groupTitle = graph?.name || selectedGroup?.name || t('default-group-title')
    const companiesCount = graph?.nodes.length ?? 0
    const ownershipLinksCount = graph?.edges.length ?? 0

    return (
      <div className="gba:flex gba:h-full gba:flex-col gba:overflow-hidden" data-testid="company-group-graph-view">
        <Card className="gba:flex gba:h-full gba:flex-col gba:overflow-hidden gba:rounded-none gba:border-0 gba:shadow-none">
          <div
            className="gba:flex gba:shrink-0 gba:items-center gba:justify-between gba:gap-4 gba:border-b gba:border-border gba:bg-muted/30 gba:px-4 gba:py-2"
            data-testid="company-group-graph-header"
          >
            <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToGroups}
                data-testid="company-group-graph-back-button"
                aria-label={t('groups-back-button')}
              >
                <ArrowLeftIcon className="gba:h-4 gba:w-4" />
                <span className="gba:sr-only">{t('groups-back-button')}</span>
              </Button>
              <h2 className="gba:truncate gba:text-base gba:font-semibold gba:text-foreground">{groupTitle}</h2>
            </div>
            <div
              className="gba:flex gba:shrink-0 gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground"
              data-testid="company-group-graph-stats"
            >
              <span>
                {companiesCount} {t('companies-count-label')}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {ownershipLinksCount} {t('ownership-links-count-label')}
              </span>
            </div>
          </div>

          {graphError && (
            <div
              className="gba:shrink-0 gba:border-b gba:border-destructive gba:bg-destructive/10 gba:px-4 gba:py-2 gba:text-sm gba:text-destructive"
              data-testid="company-group-graph-error"
            >
              {graphError}
            </div>
          )}

          <CardContent className="gba:relative gba:flex gba:min-h-0 gba:flex-1 gba:p-0">
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
        <div className="gba:grid gba:grid-cols-12 gba:gap-4">
          {groups.map(group => (
            <div key={group.id} className="gba:col-span-4">
              <GroupCard
                group={group}
                isSelected={group.id === selectedGroupId}
                onSelect={handleSelectGroup}
                t={t}
                accessToken={context.accessToken}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CompanyGroupsView
