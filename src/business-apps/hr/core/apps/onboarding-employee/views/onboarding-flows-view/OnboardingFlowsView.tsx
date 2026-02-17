import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  DataDisplay,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  useTranslation,
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { useOnboardingFlows } from '../../hooks/useOnboardingFlows'
import onboardingI18n from '../../_i18n'
import type { FlowStatusFilter } from '../../hooks/useOnboardingFlows'

export type OnboardingFlowsViewProps = BusinessAppContextProps

const formatDate = (value: string | undefined) => (value ? new Date(value).toLocaleDateString(undefined) : '–')

export const OnboardingFlowsView: React.FC<OnboardingFlowsViewProps> = ({ accessToken, userInfo }) => {
  const { t } = useTranslation(onboardingI18n)
  const userId = userInfo?.id
  const { flows, loading, error, statusFilter, setStatusFilter } = useOnboardingFlows(accessToken, userId)

  const filterSelect = useMemo(
    () => (
      <Select value={statusFilter} onValueChange={(v: FlowStatusFilter) => setStatusFilter(v)}>
        <SelectTrigger className="gba:w-[180px]" data-testid="onboarding-flows-status-filter">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">{t('onboarding-employee-flows-filter-active')}</SelectItem>
          <SelectItem value="completed">{t('onboarding-employee-flows-filter-completed')}</SelectItem>
        </SelectContent>
      </Select>
    ),
    [statusFilter, setStatusFilter, t]
  )

  if (loading && flows.length === 0) {
    return (
      <div data-testid="onboarding-flows-view" className="gba:h-full">
        <DataDisplay
          titleSections={[
            {
              id: 'flows',
              label: t('onboarding-employee-section-flows-title'),
              metadata: { count: 0, isLoading: true }
            }
          ]}
          currentSection="flows"
          toolbarDensity="default"
        >
          <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
            <Spinner size="lg" />
          </div>
        </DataDisplay>
      </div>
    )
  }

  return (
    <div data-testid="onboarding-flows-view" className="gba:h-full">
      <DataDisplay
        titleSections={[
          {
            id: 'flows',
            label: t('onboarding-employee-section-flows-title'),
            metadata: { count: flows.length, isLoading: loading }
          }
        ]}
        currentSection="flows"
        toolbarDensity="default"
        primaryAction={filterSelect}
      >
        {error ? (
          <div className="gba:rounded-lg gba:border gba:border-destructive/50 gba:bg-destructive/10 gba:px-4 gba:py-6 gba:text-center gba:text-destructive">
            {error}
          </div>
        ) : (
          <div className="gba:overflow-x-auto gba:rounded-lg gba:border">
            <Table data-testid="onboarding-flows-table">
              <TableHeader>
                <TableRow className="gba:border-b gba:bg-muted/50">
                  <TableHead className="gba:font-semibold gba:py-3 gba:px-4">
                    {t('onboarding-employee-flows-column-name')}
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:py-3 gba:px-4">
                    {t('onboarding-employee-flows-column-status')}
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:py-3 gba:px-4">
                    {t('onboarding-employee-flows-column-progress')}
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:py-3 gba:px-4">
                    {t('onboarding-employee-flows-column-started')}
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:py-3 gba:px-4">
                    {t('onboarding-employee-flows-column-updated')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="gba:py-12 gba:text-center gba:text-muted-foreground">
                      {t('onboarding-employee-flows-empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  flows.map(row => (
                    <TableRow key={row.flowId} className="gba:border-b">
                      <TableCell className="gba:py-3 gba:px-4">
                        <div className="gba:flex gba:flex-col">
                          <span className="gba:text-sm gba:font-medium">{row.flowName}</span>
                          <span className="gba:text-xs gba:text-muted-foreground">{row.flowId}</span>
                        </div>
                      </TableCell>
                      <TableCell className="gba:py-3 gba:px-4">
                        <Badge variant="outline" className="gba:text-xs">
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="gba:py-3 gba:px-4 gba:text-sm">
                        {row.progressPercentage != null ? `${row.progressPercentage}%` : '–'}
                      </TableCell>
                      <TableCell className="gba:py-3 gba:px-4 gba:text-sm">{formatDate(row.startTime)}</TableCell>
                      <TableCell className="gba:py-3 gba:px-4 gba:text-sm">{formatDate(row.updateTime)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DataDisplay>
    </div>
  )
}
