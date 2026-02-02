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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@newwork/nw-design-system'
import { Table as TableIcon, GridFour } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useProjectAnalytics } from './hooks/useProjectAnalytics'
import { ProjectAnalyticsData } from './types'
import { KpiCards, FilterBar, PortfolioTable, PortfolioHeatmap, ProjectDetailPanel } from './components'

interface ProjectAnalyticsProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const ProjectAnalytics: React.FC<ProjectAnalyticsProps> = ({ accessToken, prefixDataTestId = 'project-analytics' }) => {
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
        <span className="gba:ml-3 gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:loading', 'Loading...')}
        </span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="gba:p-6" data-testid={`${prefixDataTestId}-error`}>
        <Alert variant="destructive">
          <AlertTitle>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:project_analytics.error_loading',
              'Failed to load project analytics'
            )}
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={refetch} className="gba:mt-4" data-testid={`${prefixDataTestId}-retry-button`}>
          {getTranslationFromI18nKeyAndLabel('lowcoder:try_again', 'Try again')}
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
        <span className="gba:ml-3 gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:loading', 'Loading project analytics...')}
        </span>
      </div>
    )
  }

  return (
    <div className="gba:container gba:mx-auto gba:p-6" data-testid={prefixDataTestId}>
      {/* Page Header */}
      <div className="gba:mb-6">
        <h1 className="gba:text-3xl gba:font-bold gba:text-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:project_analytics.title', 'Project Analytics')}
        </h1>
        <p className="gba:text-muted-foreground gba:mt-2">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:project_analytics.subtitle',
            'Monitor project performance, budget consumption, and identify risks'
          )}
        </p>
      </div>

      {/* KPI Cards */}
      <KpiCards kpis={kpiData} prefixDataTestId={`${prefixDataTestId}-kpis`} />

      {/* Filters */}
      <FilterBar filters={filters} onFiltersChange={setFilters} prefixDataTestId={`${prefixDataTestId}-filters`} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={value => setActiveTab(value as typeof activeTab)}>
        <TabsList className="gba:mb-6">
          <TabsTrigger value="overview" startIcon={<TableIcon />} data-testid={`${prefixDataTestId}-overview-tab`}>
            {getTranslationFromI18nKeyAndLabel('lowcoder:project_analytics.portfolio_overview', 'Portfolio Overview')}
          </TabsTrigger>
          <TabsTrigger value="portfolio" startIcon={<GridFour />} data-testid={`${prefixDataTestId}-portfolio-tab`}>
            {getTranslationFromI18nKeyAndLabel('lowcoder:project_analytics.health_matrix', 'Health Matrix')}
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

      {/* Project Detail Sheet */}
      <Sheet open={!!selectedProject} onOpenChange={open => !open && handleCloseDetail()}>
        <SheetContent className="gba:w-full sm:gba:max-w-2xl gba:overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {getTranslationFromI18nKeyAndLabel('lowcoder:project_analytics.project_details', 'Project Details')}
            </SheetTitle>
          </SheetHeader>
          {selectedProject && (
            <div className="gba:mt-6">
              <ProjectDetailPanel project={selectedProject} prefixDataTestId={`${prefixDataTestId}-detail`} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default ProjectAnalytics
