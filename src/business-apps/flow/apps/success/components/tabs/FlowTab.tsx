import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Combobox,
  useTranslation
} from '@newwork/nw-design-system'
import { Activity, CheckCircle2, Clock3, Layers3, Target, Workflow } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ReadonlyTemplateFlowCanvas } from '@/common/components/flow'
import translations from '../../_i18n'
import { useFlowTemplateOptions } from '../../hooks/useFlowTemplateOptions'
import { useFlowManagementAnalytics, useTemplatePerformanceAnalytics } from '../../hooks/useFlowAnalytics'
import {
  SuccessActivityChart,
  SuccessEmptyState,
  SuccessErrorState,
  SuccessKpiGrid,
  SuccessStatusBadge,
  SuccessTabPage,
  SuccessTimeframeSelect
} from '../shared'
import { formatHoursDuration, formatPercent } from '../../utils/formatters'
import { DEFAULT_SUCCESS_TIMEFRAME, getSuccessTimeframeOptions, type SuccessTimeframe } from '../../utils/timeframe'

interface FlowTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const FlowTab: React.FC<FlowTabProps> = ({ prefixDataTestId = 'flow-analytics-tab', accessToken }) => {
  const { t } = useTranslation(translations)
  const [timeframe, setTimeframe] = useState<SuccessTimeframe>(DEFAULT_SUCCESS_TIMEFRAME)
  const [tablePage, setTablePage] = useState(0)
  const [selectedTemplateId, setSelectedTemplateId] = useState('ALL')
  const tablePageSize = 8

  const { data: templateOptions, isLoading: templateOptionsLoading } = useFlowTemplateOptions(accessToken)

  const {
    data: portfolioAnalytics,
    isLoading: portfolioLoading,
    error: portfolioError,
    refetch: refetchPortfolio
  } = useFlowManagementAnalytics({
    timeframe,
    accessToken
  })

  const {
    data: templateData,
    isLoading: templateLoading,
    error: templateError,
    refetch: refetchTemplates
  } = useTemplatePerformanceAnalytics({
    timeframe,
    accessToken,
    limit: tablePageSize,
    offset: tablePage * tablePageSize,
    sortBy: 'totalWorkflows', // Show by total workflows for comprehensive view
    sortOrder: 'desc'
  })

  const {
    data: selectedAnalytics,
    isLoading: selectedAnalyticsLoading,
    error: selectedAnalyticsError
  } = useFlowManagementAnalytics({
    timeframe,
    accessToken,
    templateId: selectedTemplateId === 'ALL' ? undefined : selectedTemplateId
  })

  useEffect(() => {
    setTablePage(0)
  }, [timeframe])

  const statusMetrics = portfolioAnalytics?.statusMetrics
  const templates = templateData?.templates || []
  const selectedTemplateName =
    templateOptions.find(option => option.id === selectedTemplateId)?.name ||
    templates.find(template => template.templateId === selectedTemplateId)?.templateName ||
    ''
  const timeframeOptions = useMemo(() => getSuccessTimeframeOptions(t), [t])
  const templateComboboxOptions = useMemo(
    () => [
      { value: 'ALL', label: t('filter-all-flows') },
      ...templateOptions.map(option => ({ value: option.id, label: option.name }))
    ],
    [t, templateOptions]
  )
  const scopedMetrics = selectedAnalytics?.statusMetrics
  const scopedTimeSeries = selectedAnalytics?.timeSeries || []
  const renderTemplateSelector = (testId: string) => (
    <div className="gba:flex gba:flex-col gba:gap-2">
      <span className="gba:text-sm gba:font-medium gba:text-foreground">{t('flows-template-name')}</span>
      <span className="gba:text-sm gba:text-muted-foreground">{t('flows-selector-description')}</span>
      <Combobox
        className="gba:h-auto gba:w-full"
        options={templateComboboxOptions as any}
        value={selectedTemplateId}
        onValueChange={(nextValue: string) => setSelectedTemplateId(String(nextValue || 'ALL'))}
        placeholder={t('placeholder-select-template')}
        searchPlaceholder={t('placeholder-search-templates')}
        emptyText={templateOptionsLoading ? t('state-loading') : t('state-empty')}
        loading={templateOptionsLoading}
        align="start"
        data-testid={testId}
      />
    </div>
  )
  const selectedTemplateKpis = [
    {
      id: 'selected-total',
      label: t('flows-total-workflows'),
      value: String(scopedMetrics?.total_workflows ?? 0),
      icon: <Workflow className="gba:h-5 gba:w-5" />
    },
    {
      id: 'selected-completed',
      label: t('flows-completed-workflows'),
      value: String(scopedMetrics?.completed_workflows ?? 0),
      icon: <CheckCircle2 className="gba:h-5 gba:w-5" />
    },
    {
      id: 'selected-rate',
      label: t('flows-completion-rate'),
      value: formatPercent(scopedMetrics?.workflow_completion_rate),
      icon: <Target className="gba:h-5 gba:w-5" />
    },
    {
      id: 'selected-pending',
      label: t('overview-in-progress'),
      value: String(scopedMetrics?.pending_workflows ?? 0),
      icon: <Activity className="gba:h-5 gba:w-5" />
    }
  ]

  const portfolioKpis = [
    {
      id: 'pending-workflows',
      label: t('overview-in-progress'),
      value: String(statusMetrics?.pending_workflows ?? 0),
      description: t('flows-portfolio-description'),
      icon: <Clock3 className="gba:h-5 gba:w-5" />
    },
    {
      id: 'completed-workflows',
      label: t('flows-completed-workflows'),
      value: String(statusMetrics?.completed_workflows ?? 0),
      description: t('overview-completion-rate-description'),
      icon: <CheckCircle2 className="gba:h-5 gba:w-5" />
    },
    {
      id: 'completion-rate',
      label: t('flows-completion-rate'),
      value: formatPercent(statusMetrics?.workflow_completion_rate),
      description: t('overview-completion-rate-description'),
      icon: <Target className="gba:h-5 gba:w-5" />
    },
    {
      id: 'total-workflows',
      label: t('flows-total-workflows'),
      value: String(statusMetrics?.total_workflows ?? 0),
      description: t('overview-total-workflows-description'),
      icon: <Workflow className="gba:h-5 gba:w-5" />
    }
  ]

  return (
    <SuccessTabPage
      title={t('flows-title')}
      description={t('flows-description')}
      actions={
        <>
          <SuccessTimeframeSelect
            value={timeframe}
            onChange={setTimeframe}
            options={timeframeOptions}
            data-testid={`${prefixDataTestId}-timeframe-select`}
          />
        </>
      }
      data-testid={prefixDataTestId}
    >
      {portfolioError ? (
        <SuccessErrorState
          title={t('state-error-title')}
          message={portfolioError.message}
          onRetry={refetchPortfolio}
          retryLabel={t('action-retry')}
          data-testid={`${prefixDataTestId}-portfolio-error`}
        />
      ) : (
        <SuccessKpiGrid
          items={portfolioKpis}
          isLoading={portfolioLoading}
          emptyTitle={t('state-empty')}
          emptyDescription={t('flows-portfolio-description')}
          data-testid={`${prefixDataTestId}-portfolio-kpis`}
        />
      )}

      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="gba:flex gba:h-full gba:flex-col gba:border-border gba:bg-card">
          <CardHeader className="gba:border-b gba:border-border gba:pb-3">
            <CardTitle>{t('flows-selected-title')}</CardTitle>
            <CardDescription>
              {selectedTemplateId === 'ALL'
                ? t('flows-selector-description')
                : `${t('flows-selected-description')} ${selectedTemplateName}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="gba:flex gba:flex-1 gba:flex-col gba:gap-5 gba:px-5 gba:pb-5 gba:pt-4">
            {renderTemplateSelector(`${prefixDataTestId}-template-select`)}

            {selectedTemplateId === 'ALL' ? (
              <div className="gba:flex gba:flex-1 gba:flex-col">
                <SuccessEmptyState
                  title={t('state-no-selection')}
                  description={t('flows-selected-empty')}
                  icon={<Layers3 className="gba:h-8 gba:w-8" />}
                />
              </div>
            ) : selectedAnalyticsError ? (
              <SuccessErrorState title={t('state-error-title')} message={selectedAnalyticsError.message} />
            ) : (
              <>
                <SuccessKpiGrid
                  items={selectedTemplateKpis}
                  isLoading={selectedAnalyticsLoading}
                  emptyTitle={t('state-empty')}
                  emptyDescription={t('flows-selected-description')}
                  variant="compact"
                />

                <SuccessActivityChart
                  title={t('flows-period-activity')}
                  description={selectedTemplateName}
                  startedLabel={t('flows-started')}
                  completedLabel={t('flows-completed')}
                  emptyTitle={t('state-empty')}
                  emptyDescription={t('flows-selected-description')}
                  data={scopedTimeSeries}
                  data-testid={`${prefixDataTestId}-selected-activity`}
                />
              </>
            )}
          </CardContent>
        </Card>

        <ReadonlyTemplateFlowCanvas
          accessToken={accessToken}
          templateId={selectedTemplateId === 'ALL' ? null : selectedTemplateId}
          title={t('flows-graph-preview')}
          description={t('flows-graph-preview-description')}
          emptyTitle={t('state-no-selection')}
          emptyDescription={t('flows-selected-empty')}
          data-testid={`${prefixDataTestId}-graph-preview`}
        />
      </div>

      <Card className="gba:border-border gba:bg-card">
        <CardHeader className="gba:border-b gba:border-border">
          <CardTitle>{t('flows-templates-title')}</CardTitle>
          <CardDescription>{t('flows-templates-description')}</CardDescription>
        </CardHeader>
        <CardContent className="gba:p-5">
          {templateError ? (
            <SuccessErrorState
              title={t('state-error-title')}
              message={templateError.message}
              onRetry={refetchTemplates}
              retryLabel={t('action-retry')}
              data-testid={`${prefixDataTestId}-templates-error`}
            />
          ) : templateLoading ? (
            <div className="gba:flex gba:min-h-56 gba:items-center gba:justify-center gba:text-sm gba:text-muted-foreground">
              {t('state-loading')}
            </div>
          ) : !templates.length ? (
            <SuccessEmptyState
              title={t('state-empty')}
              description={t('flows-no-templates')}
              icon={<Workflow className="gba:h-8 gba:w-8" />}
            />
          ) : (
            <div className="gba:flex gba:flex-col gba:gap-4">
              <div className="gba:overflow-x-auto">
                <table className="gba:w-full gba:border-collapse">
                  <thead>
                    <tr className="gba:border-b gba:border-border">
                      <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">{t('flows-template-name')}</th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                        {t('flows-total-workflows')}
                      </th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                        {t('flows-completed-workflows')}
                      </th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                        {t('flows-completion-rate')}
                      </th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                        {t('flows-avg-cycle-time')}
                      </th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                        {t('flows-median-cycle-time')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((template, index) => {
                      const isSelected = selectedTemplateId === template.templateId
                      return (
                        <tr
                          key={template.templateId}
                          className={`gba:cursor-pointer gba:border-b gba:border-border/60 ${isSelected ? 'gba:bg-muted/60' : ''}`}
                          onClick={() => setSelectedTemplateId(template.templateId)}
                          data-testid={`${prefixDataTestId}-template-row-${index}`}
                        >
                          <td className="gba:p-3">
                            <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                              <span className="gba:font-medium gba:text-foreground">{template.templateName}</span>
                              {isSelected ? <SuccessStatusBadge status="RUNNING" /> : null}
                            </div>
                          </td>
                          <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                            {template.totalWorkflows}
                          </td>
                          <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                            {template.completedWorkflows}
                          </td>
                          <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                            {formatPercent(template.completionRate)}
                          </td>
                          <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                            {formatHoursDuration(template.avgCycleTime)}
                          </td>
                          <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                            {formatHoursDuration(template.medianCycleTime)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {templateData && templateData.totalCount > tablePageSize ? (
                <div className="gba:flex gba:flex-col gba:gap-3 gba:border-t gba:border-border gba:pt-4 gba:md:flex-row gba:md:items-center gba:md:justify-between">
                  <span className="gba:text-sm gba:text-muted-foreground">
                    {tablePage + 1} / {Math.ceil(templateData.totalCount / tablePageSize)}
                  </span>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTablePage(Math.max(0, tablePage - 1))}
                      disabled={tablePage === 0}
                    >
                      {t('action-previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTablePage(tablePage + 1)}
                      disabled={!templateData.hasMore}
                    >
                      {t('action-next')}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </SuccessTabPage>
  )
}
