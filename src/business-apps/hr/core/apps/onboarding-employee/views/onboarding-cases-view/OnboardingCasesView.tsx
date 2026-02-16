import React, { useState, useMemo } from 'react'
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
  Button,
  useTranslation,
  Spinner
} from '@newwork/nw-design-system'
import { getStatusLabel } from './utils/statusLabels'
import { CreateCaseForm } from '../../components/create-case-form/CreateCaseForm'
import { useCases } from '../../hooks/useCases'
import onboardingI18n from '../../_i18n'

export type OnboardingCasesViewProps = BusinessAppContextProps & {
  onNavigateToCase?: (caseId: string) => void
}

const formatDate = (value: string | undefined) => (value ? new Date(value).toLocaleDateString() : '–')

export const OnboardingCasesView: React.FC<OnboardingCasesViewProps> = ({
  accessToken,
  userInfo,
  onNavigateToCase
}) => {
  const { t } = useTranslation(onboardingI18n)
  const { cases, total, loading, error, refetch } = useCases(accessToken)

  const [search, setSearch] = useState('')

  const primaryAction = useMemo(
    () => (
      <CreateCaseForm
        childAddButton={
          <Button data-testid="create-onboarding-case-btn">{t('onboarding-employee-create-case')}</Button>
        }
        onSuccess={refetch}
        accessToken={accessToken}
        currentEmployeeId={userInfo?.employeeDetails?.employeeId}
      />
    ),
    [t, accessToken, userInfo, refetch]
  )

  if (loading && cases.length === 0) {
    return (
      <div data-testid="onboarding-cases-view" className="gba:h-full">
        <DataDisplay
          titleSections={[
            { id: 'all', label: t('onboarding-employee-section-all-cases'), metadata: { count: 0, isLoading: true } }
          ]}
          currentSection="all"
          searchValue={search}
          searchPlaceholder={t('onboarding-employee-search-placeholder')}
          onSearchChange={setSearch}
          primaryAction={primaryAction}
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
    <div data-testid="onboarding-cases-view" className="gba:h-full">
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: t('onboarding-employee-section-all-cases'),
            metadata: {
              count: total,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={search}
        searchPlaceholder={t('onboarding-employee-search-placeholder')}
        onSearchChange={setSearch}
        primaryAction={primaryAction}
        toolbarDensity="default"
      >
        {error ? (
          <div className="gba:rounded-lg gba:border gba:border-destructive/50 gba:bg-destructive/10 gba:px-4 gba:py-6 gba:text-center gba:text-destructive">
            {error}
          </div>
        ) : (
          <div className="gba:overflow-x-auto gba:rounded-lg gba:border">
            <Table data-testid="onboarding-cases-table">
              <TableHeader>
                <TableRow className="gba:border-b gba:bg-muted/50">
                  <TableHead className="gba:font-semibold gba:py-3 gba:px-4">
                    {t('onboarding-employee-column-title')}
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:py-3 gba:px-4">
                    {t('onboarding-employee-column-status')}
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:py-3 gba:px-4">
                    {t('onboarding-employee-column-flows')}
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:py-3 gba:px-4">
                    {t('onboarding-employee-column-created')}
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:py-3 gba:px-4">
                    {t('onboarding-employee-column-updated')}
                  </TableHead>
                  <TableHead className="gba:w-[100px] gba:font-semibold gba:py-3 gba:px-4 gba:text-right">
                    {/* Actions column */}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="gba:py-12 gba:text-center gba:text-muted-foreground">
                      {t('onboarding-employee-empty-message')}
                    </TableCell>
                  </TableRow>
                ) : (
                  cases.map(row => {
                    const status = row.state.metadata?.status
                    const { label: statusLabel, variant: statusVariant } = status
                      ? getStatusLabel(status, t)
                      : { label: '–', variant: 'outline' as const }
                    const flows = row.state.linkedFlows ?? []
                    const flowsCompleted = flows.filter(f => f.status === 'COMPLETED').length
                    const flowsTotal = flows.length
                    const title = row.state.metadata?.title ?? row.caseId

                    return (
                      <TableRow key={row.caseId} className="gba:border-b">
                        <TableCell className="gba:py-3 gba:px-4">
                          <div className="gba:flex gba:flex-col">
                            <span className="gba:text-sm gba:font-medium">{title}</span>
                            <span className="gba:text-xs gba:text-muted-foreground">{row.caseId}</span>
                          </div>
                        </TableCell>
                        <TableCell className="gba:py-3 gba:px-4">
                          {status ? (
                            <Badge variant={statusVariant} className="gba:text-xs">
                              {statusLabel}
                            </Badge>
                          ) : (
                            <span className="gba:text-sm gba:text-muted-foreground">–</span>
                          )}
                        </TableCell>
                        <TableCell className="gba:py-3 gba:px-4">
                          {flowsTotal === 0 ? (
                            <span className="gba:text-sm gba:text-muted-foreground">–</span>
                          ) : (
                            <span className="gba:text-sm">
                              {flowsCompleted} / {flowsTotal}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="gba:py-3 gba:px-4 gba:text-sm">{formatDate(row.createdAt)}</TableCell>
                        <TableCell className="gba:py-3 gba:px-4 gba:text-sm">{formatDate(row.updatedAt)}</TableCell>
                        <TableCell className="gba:py-3 gba:px-4 gba:text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`view-case-${row.caseId}`}
                            onClick={() => onNavigateToCase?.(row.caseId)}
                          >
                            {t('onboarding-employee-action-view')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DataDisplay>
    </div>
  )
}
