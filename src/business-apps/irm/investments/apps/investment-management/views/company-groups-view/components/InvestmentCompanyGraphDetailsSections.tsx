import React from 'react'
import {
  Avatar,
  AvatarFallback,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  useTranslation
} from '@newwork/nw-design-system'
import { ArrowSquareOutIcon, BuildingsIcon, GitBranchIcon, UsersIcon } from '@phosphor-icons/react'
import type {
  InvestmentCompanyGraphExecutive,
  InvestmentCompanyGraphNode,
  InvestmentCompanyOwnershipEdge
} from '../types/companyGroupGraphTypes'
import translations from '../_i18n'

interface InvestmentCompanyRelationshipItem {
  edge: InvestmentCompanyOwnershipEdge
  node: InvestmentCompanyGraphNode
}

interface CompanyDetailsCardProps {
  selectedNode: InvestmentCompanyGraphNode
  onOpenInvestmentCompanyRecord: (investmentCompanyId: string) => void
}

interface ExecutivesCardProps {
  executives: InvestmentCompanyGraphExecutive[]
  onOpenExecutiveRecord: (executive: InvestmentCompanyGraphExecutive) => void
}

interface RelationshipsCardProps {
  badgeClassName: string
  dataTestId: string
  emptyLabel: string
  items: InvestmentCompanyRelationshipItem[]
  linkTestIdPrefix: string
  title: string
  onOpenInvestmentCompanyRecord: (investmentCompanyId: string) => void
}

const formatPercentage = (percentage: number | undefined, ownershipLabel: string): string => {
  if (percentage === undefined || percentage === null) return ownershipLabel
  return `${percentage}%`
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const canOpenExecutiveRecord = (executive: InvestmentCompanyGraphExecutive): boolean => {
  return Boolean(
    (executive.source === 'Employee' && executive.employeeId) ||
      (executive.source === 'Investment Contact' && executive.investmentContactId)
  )
}

const CompanyLink: React.FC<{
  compact?: boolean
  dataTestId: string
  node: InvestmentCompanyGraphNode
  onOpenInvestmentCompanyRecord: (investmentCompanyId: string) => void
}> = ({ compact = false, dataTestId, node, onOpenInvestmentCompanyRecord }) => {
  const linkedCompany = node.data
  return (
    <button
      type="button"
      onClick={() => onOpenInvestmentCompanyRecord(linkedCompany.investmentCompanyId)}
      className="gba:group gba:flex gba:min-h-6 gba:min-w-0 gba:max-w-full gba:cursor-pointer gba:items-center gba:gap-2 gba:rounded gba:border-0 gba:bg-transparent gba:px-2 gba:py-1 gba:text-left gba:transition-colors gba:hover:bg-accent"
      data-testid={dataTestId}
    >
      {!compact && (
        <Avatar size="sm" className="gba:size-6 gba:shrink-0">
          <AvatarFallback className="gba:text-xs">{getInitials(linkedCompany.name)}</AvatarFallback>
        </Avatar>
      )}
      <span className="gba:min-w-0 gba:truncate gba:text-sm gba:font-medium gba:text-foreground gba:group-hover:text-primary">
        {linkedCompany.name}
      </span>
      <ArrowSquareOutIcon size={12} className="gba:shrink-0 gba:text-muted-foreground gba:group-hover:text-primary" />
    </button>
  )
}

export const InvestmentCompanyDetailsCard: React.FC<CompanyDetailsCardProps> = ({
  selectedNode,
  onOpenInvestmentCompanyRecord
}) => {
  const { t } = useTranslation(translations)
  const company = selectedNode.data

  return (
    <Card data-testid="investment-company-graph-details-card">
      <CardHeader className="gba:pb-3">
        <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base gba:font-medium gba:text-muted-foreground">
          <BuildingsIcon className="gba:h-5 gba:w-5" />
          {t('company-details-title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:grid gba:grid-cols-1 gba:gap-4 md:gba:grid-cols-2">
        <div className="gba:flex gba:flex-col gba:gap-1">
          <span className="gba:text-sm gba:text-muted-foreground">{t('name-label')}</span>
          <CompanyLink
            compact
            dataTestId="investment-company-graph-details-name-link"
            node={selectedNode}
            onOpenInvestmentCompanyRecord={onOpenInvestmentCompanyRecord}
          />
        </div>
        <div className="gba:flex gba:flex-col gba:gap-1">
          <span className="gba:text-sm gba:text-muted-foreground">{t('code-label')}</span>
          <span className="gba:text-sm gba:font-medium">{company.code || '-'}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export const InvestmentCompanyExecutivesCard: React.FC<ExecutivesCardProps> = ({
  executives,
  onOpenExecutiveRecord
}) => {
  const { t } = useTranslation(translations)

  const renderExecutiveRow = (executive: InvestmentCompanyGraphExecutive): React.ReactElement => {
    const isClickable = canOpenExecutiveRecord(executive)
    const rowContent = (
      <span className="gba:flex gba:min-w-0 gba:items-center gba:gap-3">
        <Avatar size="sm" className="gba:size-8 gba:shrink-0 gba:bg-background">
          <AvatarFallback className="gba:text-xs">{getInitials(executive.name)}</AvatarFallback>
        </Avatar>
        <span className="gba:flex gba:min-w-0 gba:flex-col gba:gap-1">
          <span className="gba:flex gba:min-w-0 gba:items-center gba:gap-2">
            <span className="gba:truncate gba:text-sm gba:font-medium gba:text-foreground gba:group-hover:text-primary">
              {executive.name}
            </span>
            {isClickable && (
              <ArrowSquareOutIcon
                size={12}
                className="gba:shrink-0 gba:text-muted-foreground gba:group-hover:text-primary"
              />
            )}
          </span>
          <span className="gba:flex gba:flex-wrap gba:gap-2 gba:text-xs gba:text-muted-foreground">
            <span className="gba:rounded-full gba:bg-accent gba:px-2 gba:py-1 gba:font-medium gba:text-accent-foreground">
              {executive.source === 'Employee' ? t('source-employee') : t('source-investment-contact')}
            </span>
            {executive.executiveType && (
              <span className="gba:rounded-full gba:bg-background gba:px-2 gba:py-1 gba:font-medium gba:text-muted-foreground">
                {executive.executiveType}
              </span>
            )}
          </span>
        </span>
      </span>
    )

    if (isClickable) {
      return (
        <button
          key={executive.id}
          type="button"
          onClick={() => onOpenExecutiveRecord(executive)}
          className="gba:group gba:flex gba:w-full gba:cursor-pointer gba:items-center gba:gap-3 gba:rounded gba:border-0 gba:bg-muted gba:p-3 gba:text-left gba:transition-colors gba:hover:bg-accent"
          data-testid={`investment-company-graph-executive-link-${executive.id}`}
        >
          {rowContent}
        </button>
      )
    }

    return (
      <div
        key={executive.id}
        className="gba:flex gba:w-full gba:items-center gba:gap-3 gba:rounded gba:bg-muted gba:p-3"
      >
        {rowContent}
      </div>
    )
  }

  return (
    <Card data-testid="investment-company-graph-details-executives">
      <CardHeader className="gba:pb-3">
        <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base gba:font-medium gba:text-muted-foreground">
          <UsersIcon className="gba:h-5 gba:w-5" />
          {t('executives-title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {executives.length ? (
          executives.map(renderExecutiveRow)
        ) : (
          <p className="gba:text-sm gba:text-muted-foreground">{t('no-executives')}</p>
        )}
      </CardContent>
    </Card>
  )
}

export const InvestmentCompanyRelationshipsCard: React.FC<RelationshipsCardProps> = ({
  badgeClassName,
  dataTestId,
  emptyLabel,
  items,
  linkTestIdPrefix,
  title,
  onOpenInvestmentCompanyRecord
}) => {
  const { t } = useTranslation(translations)

  return (
    <Card data-testid={dataTestId}>
      <CardHeader className="gba:pb-3">
        <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base gba:font-medium gba:text-muted-foreground">
          <GitBranchIcon className="gba:h-5 gba:w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {items.length > 0 ? (
          items.map(item => {
            const linkedCompany = item.node.data
            return (
              <button
                key={item.node.id}
                type="button"
                onClick={() => onOpenInvestmentCompanyRecord(linkedCompany.investmentCompanyId)}
                className="gba:group gba:flex gba:w-full gba:cursor-pointer gba:items-center gba:justify-between gba:gap-3 gba:rounded gba:border-0 gba:bg-muted gba:p-3 gba:text-left gba:transition-colors gba:hover:bg-accent"
                data-testid={`${linkTestIdPrefix}-${linkedCompany.investmentCompanyId}`}
              >
                <span className="gba:flex gba:min-w-0 gba:items-center gba:gap-3">
                  <Avatar size="sm" className="gba:size-8 gba:shrink-0 gba:bg-background">
                    <AvatarFallback className="gba:text-xs">{getInitials(linkedCompany.name)}</AvatarFallback>
                  </Avatar>
                  <span className="gba:flex gba:min-w-0 gba:items-center gba:gap-2">
                    <span className="gba:truncate gba:text-sm gba:font-medium gba:text-foreground gba:group-hover:text-primary">
                      {linkedCompany.name}
                    </span>
                    <ArrowSquareOutIcon
                      size={12}
                      className="gba:shrink-0 gba:text-muted-foreground gba:group-hover:text-primary"
                    />
                  </span>
                </span>
                <span className={badgeClassName}>
                  {formatPercentage(item.edge.data?.percentage, t('ownership-label'))}
                </span>
              </button>
            )
          })
        ) : (
          <p className="gba:text-sm gba:text-muted-foreground">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  )
}
