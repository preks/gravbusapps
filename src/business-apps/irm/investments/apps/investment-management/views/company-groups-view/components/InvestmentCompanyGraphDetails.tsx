import React, { useMemo } from 'react'
import {
  ScrollArea,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  useTranslation
} from '@newwork/nw-design-system'
import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import {
  InvestmentCompanyDetailsCard,
  InvestmentCompanyExecutivesCard,
  InvestmentCompanyRelationshipsCard
} from './InvestmentCompanyGraphDetailsSections'
import type {
  InvestmentCompanyGraphExecutive,
  InvestmentCompanyGraphNode,
  InvestmentCompanyOwnershipEdge
} from '../types/companyGroupGraphTypes'
import translations from '../_i18n'

interface InvestmentCompanyGraphDetailsProps {
  investmentCompanyId: string
  nodes: InvestmentCompanyGraphNode[]
  edges: InvestmentCompanyOwnershipEdge[]
  onOpenChange: (open: boolean) => void
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
        .filter((item): item is { edge: InvestmentCompanyOwnershipEdge; node: InvestmentCompanyGraphNode } =>
          Boolean(item.node)
        ),
      ownedCompanies: edges
        .filter(edge => edge.source === investmentCompanyId)
        .map(edge => ({ edge, node: nodesById.get(edge.target) }))
        .filter((item): item is { edge: InvestmentCompanyOwnershipEdge; node: InvestmentCompanyGraphNode } =>
          Boolean(item.node)
        )
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

  const openInvestmentCompanyRecord = (nextInvestmentCompanyId: string) => {
    navigateTo(buildPlatformUrl('/platform/irm/company-record', { investmentCompanyId: nextInvestmentCompanyId }))
  }

  const openExecutiveRecord = (executive: InvestmentCompanyGraphExecutive) => {
    if (executive.source === 'Employee' && executive.employeeId) {
      navigateTo(buildPlatformUrl('/platform/employee-record', { employeeId: executive.employeeId }))
      return
    }

    if (executive.source === 'Investment Contact' && executive.investmentContactId) {
      navigateTo(buildPlatformUrl('/platform/irm/contact-record', { contactId: executive.investmentContactId }))
    }
  }

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="gba:!w-[500px] gba:sm:!w-[500px] gba:!max-w-[90vw] gba:p-0 gba:flex gba:flex-col"
        data-testid="investment-company-graph-details"
      >
        <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
          <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left gba:mb-3">
            <button
              type="button"
              onClick={() => openInvestmentCompanyRecord(company.investmentCompanyId)}
              className="gba:group gba:flex gba:min-w-0 gba:max-w-full gba:cursor-pointer gba:items-center gba:gap-2 gba:rounded gba:border-0 gba:bg-transparent gba:px-2 gba:py-1 gba:-mx-2 gba:text-left gba:transition-colors gba:hover:bg-accent"
              data-testid="investment-company-graph-details-title-link"
            >
              <span className="gba:truncate gba:group-hover:text-primary">{company.name}</span>
              <ArrowSquareOutIcon
                size={14}
                className="gba:shrink-0 gba:text-muted-foreground gba:group-hover:text-primary"
              />
            </button>
          </SheetTitle>
          <SheetDescription>{t('details-description')}</SheetDescription>
        </SheetHeader>

        <div className="gba:flex-1 gba:overflow-hidden gba:px-6">
          <ScrollArea className="gba:h-full gba:w-full">
            <div className="gba:py-6 gba:space-y-6">
              <InvestmentCompanyDetailsCard
                selectedNode={selectedNode}
                onOpenInvestmentCompanyRecord={openInvestmentCompanyRecord}
              />
              <InvestmentCompanyExecutivesCard
                executives={company.executives || []}
                onOpenExecutiveRecord={openExecutiveRecord}
              />
              <InvestmentCompanyRelationshipsCard
                badgeClassName="gba:shrink-0 gba:rounded-full gba:bg-primary/10 gba:px-2 gba:py-1 gba:text-xs gba:font-semibold gba:text-primary"
                dataTestId="investment-company-graph-details-owners"
                emptyLabel={t('no-owners')}
                items={ownershipDetails.owners}
                linkTestIdPrefix="investment-company-graph-owner-link"
                title={t('owners-label')}
                onOpenInvestmentCompanyRecord={openInvestmentCompanyRecord}
              />
              <InvestmentCompanyRelationshipsCard
                badgeClassName="gba:shrink-0 gba:rounded-full gba:bg-secondary gba:px-2 gba:py-1 gba:text-xs gba:font-semibold gba:text-secondary-foreground"
                dataTestId="investment-company-graph-details-owned-companies"
                emptyLabel={t('no-owned-companies')}
                items={ownershipDetails.ownedCompanies}
                linkTestIdPrefix="investment-company-graph-owned-company-link"
                title={t('owned-companies-label')}
                onOpenInvestmentCompanyRecord={openInvestmentCompanyRecord}
              />
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
