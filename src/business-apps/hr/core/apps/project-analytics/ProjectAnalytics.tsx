import React, { useState } from 'react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Button,
  useTranslation
} from '@newwork/nw-design-system'
import { TableIcon, GridFourIcon, BriefcaseIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DataContainer } from '@/components/layout/dataContainer'
import type { DataControllerProps } from '@/components/dataController/DataController'
import { useProjectAnalytics } from './hooks/useProjectAnalytics'
import { ProjectAnalyticsData } from './types'
import { KpiCards, FilterBar, PortfolioTable, PortfolioHeatmap, ProjectDetailPanel } from './components'
import translations from './_i18n'

interface ProjectAnalyticsProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const ProjectAnalytics: React.FC<ProjectAnalyticsProps> = ({ accessToken, prefixDataTestId = 'project-analytics' }) => {
  const { t } = useTranslation(translations)
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio'>('overview')
  const [selectedProject, setSelectedProject] = useState<ProjectAnalyticsData | null>(null)
  const [sortField, setSortField] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const { projects, kpiData, filters, setFilters, isLoading, error, refetch } = useProjectAnalytics(accessToken)

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleProjectClick = (project: ProjectAnalyticsData) => {
    setSelectedProject(project)
  }

  const handleCloseDetail = () => {
    setSelectedProject(null)
  }

  // Loading state
  if (!accessToken) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:min-h-screen"
        data-testid={`${prefixDataTestId}-no-auth`}
      >
        <Spinner size="lg" />
        <span className="gba:ml-3 gba:text-muted-foreground">{t('loading')}</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="gba:p-6" data-testid={`${prefixDataTestId}-error`}>
        <Alert variant="destructive">
          <AlertTitle>{t('error-loading')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={refetch} className="gba:mt-4" data-testid={`${prefixDataTestId}-retry-button`}>
          {t('try-again')}
        </Button>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:min-h-screen"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner size="lg" />
        <span className="gba:ml-3 gba:text-muted-foreground">{t('loading-project-analytics')}</span>
      </div>
    )
  }

  return (
    <div className="gba:container gba:mx-auto gba:p-6" data-testid={prefixDataTestId}>
      {/* Page Header */}
      <div className="gba:mb-6">
        <h1 className="gba:text-3xl gba:font-bold gba:text-foreground">{t('project-analytics-title')}</h1>
        <p className="gba:text-muted-foreground gba:mt-2">{t('project-analytics-subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <KpiCards kpis={kpiData} prefixDataTestId={`${prefixDataTestId}-kpis`} />

      {/* Filters */}
      <FilterBar filters={filters} onFiltersChange={setFilters} prefixDataTestId={`${prefixDataTestId}-filters`} />

      {/* Main Content with DataContainer for details panel */}
      <DataContainer
        contentBackground="white"
        floatingDetails={true}
        onDetailsPanelClose={handleCloseDetail}
        dataControllerProps={
          {
            listTitle: t('project-analytics-title'),
            listIcon: <BriefcaseIcon size={20} />,
            search: '',
            setSearch: () => {},
            filter: [],
            setFilter: () => {}
          } as Omit<DataControllerProps, 'showDataFilter' | 'onToggleDataFilter'>
        }
        dataFilterProps={{
          filterGroups: [],
          onFilterChange: () => {}
        }}
        hideFilter={true}
        dataBody={
          <div>
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={value => setActiveTab(value as typeof activeTab)}>
              <TabsList className="gba:mb-6">
                <TabsTrigger
                  value="overview"
                  startIcon={<TableIcon />}
                  data-testid={`${prefixDataTestId}-overview-tab`}
                >
                  {t('portfolio-overview-tab')}
                </TabsTrigger>
                <TabsTrigger
                  value="portfolio"
                  startIcon={<GridFourIcon />}
                  data-testid={`${prefixDataTestId}-portfolio-tab`}
                >
                  {t('health-matrix-tab')}
                </TabsTrigger>
              </TabsList>

              {/* Portfolio Overview Tab */}
              <TabsContent value="overview">
                <PortfolioTable
                  projects={projects}
                  onProjectClick={handleProjectClick}
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  prefixDataTestId={`${prefixDataTestId}-table`}
                />
              </TabsContent>

              {/* Health Matrix Tab */}
              <TabsContent value="portfolio">
                <PortfolioHeatmap
                  projects={projects}
                  onProjectClick={handleProjectClick}
                  prefixDataTestId={`${prefixDataTestId}-heatmap`}
                />
              </TabsContent>
            </Tabs>
          </div>
        }
        dataDetails={
          selectedProject
            ? {
                title: selectedProject.name,
                icon: <BriefcaseIcon size={20} />,
                content: (
                  <div className="gba:p-6">
                    <ProjectDetailPanel project={selectedProject} prefixDataTestId={`${prefixDataTestId}-detail`} />
                  </div>
                ),
                onClose: handleCloseDetail
              }
            : undefined
        }
      />
    </div>
  )
}

export default ProjectAnalytics
