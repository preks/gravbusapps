import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  useTranslation
} from '@newwork/nw-design-system'
import { BuildingsIcon, GitBranchIcon, UsersIcon } from '@phosphor-icons/react'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import type { InvestmentCompanyGraphNode, InvestmentCompanyOwnershipEdge } from '../types/companyGroupGraphTypes'
import translations from '../_i18n'

interface InvestmentCompanyGraphDetailsProps {
  investmentCompanyId: string
  nodes: InvestmentCompanyGraphNode[]
  edges: InvestmentCompanyOwnershipEdge[]
  onOpenChange: (open: boolean) => void
}

const formatPercentage = (percentage: number | undefined, ownershipLabel: string): string => {
  if (percentage === undefined || percentage === null) return ownershipLabel
  return `${percentage}%`
}

export const InvestmentCompanyGraphDetails: React.FC<InvestmentCompanyGraphDetailsProps> = ({
  investmentCompanyId,
  nodes,
  edges,
  onOpenChange
}) => {
  const { t } = useTranslation(translations)
  const selectedNode = useMemo(() => {
    return nodes.find(node => node.id === investmentCompanyId)
  }, [investmentCompanyId, nodes])

  const ownershipDetails = useMemo(() => {
    const nodesById = new Map(nodes.map(node => [node.id, node]))
    return {
      owners: edges
        .filter(edge => edge.target === investmentCompanyId)
        .map(edge => ({ edge, node: nodesById.get(edge.source) }))
        .filter(item => item.node),
      ownedCompanies: edges
        .filter(edge => edge.source === investmentCompanyId)
        .map(edge => ({ edge, node: nodesById.get(edge.target) }))
        .filter(item => item.node)
    }
  }, [edges, investmentCompanyId, nodes])

  if (!selectedNode) {
    return (
      <Sheet open onOpenChange={onOpenChange}>
        <SheetContent side="right" className="gba:w-full sm:gba:max-w-xl gba:p-0">
          <SheetHeader className="gba:border-b gba:border-border gba:p-6">
            <SheetTitle>{t('not-found-title')}</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
  }

  const company = selectedNode.data

  const openCompanyRecord = () => {
    navigateTo(buildPlatformUrl('/platform/irm/company-record', { investmentCompanyId: company.investmentCompanyId }))
  }

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="gba:w-full sm:gba:max-w-2xl gba:p-0 gba:flex gba:flex-col"
        data-testid="investment-company-graph-details"
      >
        <SheetHeader className="gba:border-b gba:border-border gba:bg-background gba:p-6">
          <SheetTitle>{company.name}</SheetTitle>
          <SheetDescription>{t('details-description')}</SheetDescription>
        </SheetHeader>

        <div className="gba:flex-1 gba:overflow-y-auto gba:p-6">
          <div className="gba:grid gba:grid-cols-1 gba:gap-4">
            <Card className="gba:bg-background xl:gba:col-span-2" data-testid="investment-company-graph-details-card">
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-2">
                  <BuildingsIcon className="gba:h-5 gba:w-5" />
                  {t('company-details-title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:grid gba:grid-cols-1 gba:gap-4 md:gba:grid-cols-2 xl:gba:grid-cols-4">
                <div className="gba:flex gba:flex-col gba:gap-1">
                  <span className="gba:text-sm gba:text-muted-foreground">{t('name-label')}</span>
                  <button
                    type="button"
                    onClick={openCompanyRecord}
                    className="gba:text-left gba:text-sm gba:font-semibold gba:text-primary hover:gba:underline"
                    data-testid="investment-company-graph-details-name-link"
                  >
                    {company.name}
                  </button>
                </div>
                <div className="gba:flex gba:flex-col gba:gap-1">
                  <span className="gba:text-sm gba:text-muted-foreground">{t('code-label')}</span>
                  <span className="gba:text-sm gba:font-medium">{company.code || '-'}</span>
                </div>
                <div className="gba:flex gba:flex-col gba:gap-1">
                  <span className="gba:text-sm gba:text-muted-foreground">{t('owners-label')}</span>
                  <span className="gba:w-fit gba:rounded-full gba:bg-primary/10 gba:px-2 gba:py-1 gba:text-xs gba:font-semibold gba:text-primary">
                    {company.ownersCount}
                  </span>
                </div>
                <div className="gba:flex gba:flex-col gba:gap-1">
                  <span className="gba:text-sm gba:text-muted-foreground">{t('owned-companies-label')}</span>
                  <span className="gba:w-fit gba:rounded-full gba:bg-secondary gba:px-2 gba:py-1 gba:text-xs gba:font-semibold gba:text-secondary-foreground">
                    {company.ownedCompaniesCount}
                  </span>
                </div>
                <div className="md:gba:col-span-2 xl:gba:col-span-4 gba:flex gba:flex-col gba:gap-1">
                  <span className="gba:text-sm gba:text-muted-foreground">{t('description-label')}</span>
                  <span className="gba:text-sm gba:font-medium">{company.description || '-'}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="gba:bg-background" data-testid="investment-company-graph-details-executives">
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-2">
                  <UsersIcon className="gba:h-5 gba:w-5" />
                  {t('executives-title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:space-y-3">
                {company.executives?.length ? (
                  company.executives.map(executive => (
                    <div key={executive.id} className="gba:rounded-lg gba:border gba:bg-card gba:p-3">
                      <div className="gba:text-sm gba:font-medium">{executive.name}</div>
                      <div className="gba:mt-1 gba:flex gba:flex-wrap gba:gap-2 gba:text-xs gba:text-muted-foreground">
                        <span className="gba:rounded-full gba:bg-accent gba:px-2 gba:py-1 gba:font-medium gba:text-accent-foreground">
                          {executive.source === 'Employee' ? t('source-employee') : t('source-investment-contact')}
                        </span>
                        {executive.executiveType && (
                          <span className="gba:rounded-full gba:bg-muted gba:px-2 gba:py-1 gba:font-medium gba:text-muted-foreground">
                            {executive.executiveType}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="gba:text-sm gba:text-muted-foreground">{t('no-executives')}</p>
                )}
              </CardContent>
            </Card>

            <Card className="gba:bg-background" data-testid="investment-company-graph-details-owners">
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-2">
                  <GitBranchIcon className="gba:h-5 gba:w-5" />
                  {t('owners-label')}
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:space-y-3">
                {ownershipDetails.owners.length > 0 ? (
                  ownershipDetails.owners.map(item => (
                    <div
                      key={item.edge.id}
                      className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-lg gba:border gba:bg-card gba:p-3"
                    >
                      <span className="gba:text-sm gba:font-medium">{item.node?.data.name}</span>
                      <span className="gba:rounded-full gba:bg-primary/10 gba:px-2 gba:py-1 gba:text-xs gba:font-semibold gba:text-primary">
                        {formatPercentage(item.edge.data?.percentage, t('ownership-label'))}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="gba:text-sm gba:text-muted-foreground">{t('no-owners')}</p>
                )}
              </CardContent>
            </Card>

            <Card className="gba:bg-background" data-testid="investment-company-graph-details-owned-companies">
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-2">
                  <GitBranchIcon className="gba:h-5 gba:w-5" />
                  {t('owned-companies-label')}
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:space-y-3">
                {ownershipDetails.ownedCompanies.length > 0 ? (
                  ownershipDetails.ownedCompanies.map(item => (
                    <div
                      key={item.edge.id}
                      className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-lg gba:border gba:bg-card gba:p-3"
                    >
                      <span className="gba:text-sm gba:font-medium">{item.node?.data.name}</span>
                      <span className="gba:rounded-full gba:bg-secondary gba:px-2 gba:py-1 gba:text-xs gba:font-semibold gba:text-secondary-foreground">
                        {formatPercentage(item.edge.data?.percentage, t('ownership-label'))}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="gba:text-sm gba:text-muted-foreground">{t('no-owned-companies')}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
