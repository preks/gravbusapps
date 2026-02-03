import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Progress,
  Button,
  useTranslation
} from '@newwork/nw-design-system'
import { CaretRightIcon, SortAscendingIcon, SortDescendingIcon } from '@phosphor-icons/react'
import { ProjectAnalyticsData } from '../types'
import { RiskIndicator } from './RiskIndicator'
import translations from '../_i18n'

interface PortfolioTableProps {
  projects: ProjectAnalyticsData[]
  onProjectClick: (project: ProjectAnalyticsData) => void
  sortField?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (field: string) => void
  prefixDataTestId?: string
}

type SortableField = 'name' | 'budgetConsumptionPercent' | 'elapsedTimePercent' | 'remainingHours' | 'riskStatus'

export const PortfolioTable: React.FC<PortfolioTableProps> = ({
  projects,
  onProjectClick,
  sortField,
  sortOrder,
  onSort,
  prefixDataTestId = 'portfolio-table'
}) => {
  const { t } = useTranslation(translations)
  const renderSortIcon = (field: SortableField) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? (
      <SortAscendingIcon className="gba:w-4 gba:h-4 gba:inline gba:ml-1" />
    ) : (
      <SortDescendingIcon className="gba:w-4 gba:h-4 gba:inline gba:ml-1" />
    )
  }

  const handleHeaderClick = (field: SortableField) => {
    onSort?.(field)
  }

  const getRiskOrder = (status: string): number => {
    switch (status) {
      case 'over-budget':
        return 0
      case 'at-risk':
        return 1
      case 'on-track':
        return 2
      case 'not-started':
        return 3
      default:
        return 4
    }
  }

  // Sort projects
  const sortedProjects = [...projects].sort((a, b) => {
    if (!sortField) {
      // Default: sort by risk level
      return getRiskOrder(a.riskStatus) - getRiskOrder(b.riskStatus)
    }

    let comparison: number
    switch (sortField as SortableField) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'budgetConsumptionPercent':
        comparison = a.budgetConsumptionPercent - b.budgetConsumptionPercent
        break
      case 'elapsedTimePercent':
        comparison = a.elapsedTimePercent - b.elapsedTimePercent
        break
      case 'remainingHours':
        comparison = a.remainingHours - b.remainingHours
        break
      case 'riskStatus':
        comparison = getRiskOrder(a.riskStatus) - getRiskOrder(b.riskStatus)
        break
      default:
        comparison = 0
    }

    return sortOrder === 'desc' ? -comparison : comparison
  })

  return (
    <div className="gba:rounded-lg gba:border gba:border-border" data-testid={prefixDataTestId}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="gba:cursor-pointer gba:hover:bg-muted/50" onClick={() => handleHeaderClick('name')}>
              {t('table-project')} {renderSortIcon('name')}
            </TableHead>
            <TableHead className="gba:text-center">{t('table-manager')}</TableHead>
            <TableHead
              className="gba:cursor-pointer gba:hover:bg-muted/50 gba:text-center"
              onClick={() => handleHeaderClick('budgetConsumptionPercent')}
            >
              {t('table-budget-used')} {renderSortIcon('budgetConsumptionPercent')}
            </TableHead>
            <TableHead
              className="gba:cursor-pointer gba:hover:bg-muted/50 gba:text-center"
              onClick={() => handleHeaderClick('elapsedTimePercent')}
            >
              {t('table-time-elapsed')} {renderSortIcon('elapsedTimePercent')}
            </TableHead>
            <TableHead
              className="gba:cursor-pointer gba:hover:bg-muted/50 gba:text-center"
              onClick={() => handleHeaderClick('remainingHours')}
            >
              {t('table-remaining')} {renderSortIcon('remainingHours')}
            </TableHead>
            <TableHead
              className="gba:cursor-pointer gba:hover:bg-muted/50 gba:text-center"
              onClick={() => handleHeaderClick('riskStatus')}
            >
              {t('table-risk')} {renderSortIcon('riskStatus')}
            </TableHead>
            <TableHead className="gba:w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedProjects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="gba:text-center gba:py-8 gba:text-muted-foreground">
                {t('no-projects-found')}
              </TableCell>
            </TableRow>
          ) : (
            sortedProjects.map(project => (
              <TableRow
                key={project.id}
                className="gba:cursor-pointer gba:hover:bg-muted/50"
                onClick={() => onProjectClick(project)}
                data-testid={`${prefixDataTestId}-row-${project.id}`}
              >
                <TableCell>
                  <div>
                    <div className="gba:font-medium gba:text-foreground">{project.name}</div>
                    {project.description && (
                      <div className="gba:text-sm gba:text-muted-foreground gba:truncate gba:max-w-[200px]">
                        {project.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="gba:text-center">
                  {project.projectManager ? (
                    <span className="gba:text-sm">
                      {project.projectManager.firstName} {project.projectManager.lastName}
                    </span>
                  ) : (
                    <span className="gba:text-muted-foreground gba:text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="gba:flex gba:flex-col gba:items-center gba:gap-1">
                    <span className="gba:text-sm gba:font-medium">{project.budgetConsumptionPercent}%</span>
                    <Progress value={Math.min(project.budgetConsumptionPercent, 100)} className="gba:w-20 gba:h-1.5" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="gba:flex gba:flex-col gba:items-center gba:gap-1">
                    <span className="gba:text-sm gba:font-medium">{project.elapsedTimePercent}%</span>
                    <Progress value={project.elapsedTimePercent} className="gba:w-20 gba:h-1.5" />
                  </div>
                </TableCell>
                <TableCell className="gba:text-center">
                  <span className="gba:text-sm">{project.remainingHours > 0 ? `${project.remainingHours}h` : '-'}</span>
                </TableCell>
                <TableCell className="gba:text-center">
                  <RiskIndicator status={project.riskStatus} size="sm" />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon">
                    <CaretRightIcon className="gba:w-4 gba:h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
