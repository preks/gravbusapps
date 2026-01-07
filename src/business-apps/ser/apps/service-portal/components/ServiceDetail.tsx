import React, { useState, useEffect, useMemo } from 'react'
import { PageLayout, Card, Button, Alert, type KpiCardData } from '@newwork/nw-design-system'
import { ServiceCategory, ServiceRequestTemplate, FlowTemplate } from '../../../types'
import { getCategoryById } from '../../../data'
import { getCategoryIcon } from '../../../utils/iconMapping'
import { useSharedFlowTemplates } from '../../../hooks/useSharedFlowTemplates'
import { useServicePortalCategories } from '../../../hooks'
import { FlowTemplateCard } from './FlowTemplateCard'
import { FlowTemplatesDetail } from './FlowTemplatesDetail'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SERVICE_PORTAL_CONFIG } from '../../../config/servicePortalConfig'
import { ArrowLeft, Warning } from '@phosphor-icons/react'
import { ArrowLeftOutlined } from '@ant-design/icons'

export interface ServiceDetailProps extends BusinessAppContextProps {
  categoryId: string
  onRequestService?: (template: ServiceRequestTemplate) => void
  onRequestFlowTemplate?: (template: FlowTemplate) => void
  onBack: () => void
}

export const ServiceDetail: React.FC<ServiceDetailProps> = ({
  categoryId,
  onRequestFlowTemplate,
  onBack,
  ...contextProps
}) => {
  // Special handling for Flow Templates category
  if (categoryId === 'flow-templates') {
    console.log('🎭 [ServiceDetail] Rendering FlowTemplatesDetail for category:', categoryId)
    return <FlowTemplatesDetail {...contextProps} onRequestFlowTemplate={onRequestFlowTemplate} onBack={onBack} />
  }

  const [category, setCategory] = useState<ServiceCategory | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Fetch dynamic categories from catalog (same as ServiceCatalog)
  const {
    categories: catalogCategories,
    isLoading: categoriesLoading,
    error: categoriesError
  } = useServicePortalCategories(contextProps)

  // Fetch flow templates from custom-flow-engine using shared service
  const {
    templates: allFlowTemplates,
    isLoading: flowTemplatesLoading,
    error: flowTemplatesError,
    refetch: refetchFlowTemplates
  } = useSharedFlowTemplates(contextProps, {
    enabled: true,
    limit: SERVICE_PORTAL_CONFIG.DEFAULT_TEMPLATE_LIMIT,
    filterByApp: SERVICE_PORTAL_CONFIG.FILTER_BY_SERVICES_APP
  })

  // Filter templates by category using tags
  const categoryTemplates = useMemo(() => {
    if (!category) {
      console.log('🎭 [ServiceDetail] No category provided for filtering')
      return []
    }

    // Special handling for uncategorized templates
    if (category.id === 'uncategorized') {
      console.log('🎭 [ServiceDetail] Filtering uncategorized templates')

      const uncategorizedTemplates = allFlowTemplates.filter(template => {
        // Include templates without tags or serviceCategory
        if (!template.tags || !template.tags.serviceCategory) {
          console.log('🎭 [ServiceDetail] Found uncategorized template (no tags):', template.name)
          return true
        }

        // Also include templates with serviceCategory that doesn't match any existing category
        const templateCategories = Array.isArray(template.tags.serviceCategory)
          ? template.tags.serviceCategory
          : [template.tags.serviceCategory]

        // Check if any template category matches existing categories
        const hasValidCategory = templateCategories.some(templateCategory => {
          return catalogCategories.some(category => {
            const expectedCategoryRef = `ServicePortalCategory:1:${category.id.toUpperCase()}`
            return templateCategory === expectedCategoryRef
          })
        })

        if (!hasValidCategory) {
          console.log(
            '🎭 [ServiceDetail] Found uncategorized template (invalid category):',
            template.name,
            templateCategories
          )
          return true
        }

        return false
      })

      console.log('🎭 [ServiceDetail] Uncategorized templates result:', {
        filteredCount: uncategorizedTemplates.length,
        filteredTemplates: uncategorizedTemplates.map(t => t.name)
      })

      return uncategorizedTemplates
    }

    // Regular category filtering
    // Use the original catalog entry ID if available, otherwise construct it
    const expectedCategoryRef = category.catalogEntryId || `ServicePortalCategory:1:${category.id.toUpperCase()}`

    console.log('🎭 [ServiceDetail] Filtering templates:', {
      categoryId: category.id,
      catalogEntryId: category.catalogEntryId,
      expectedCategoryRef,
      totalTemplates: allFlowTemplates.length,
      templatesWithTags: allFlowTemplates.filter(t => t.tags).length
    })

    const filtered = allFlowTemplates.filter(template => {
      // Check if template has tags and serviceCategory
      if (!template.tags || !template.tags.serviceCategory) {
        console.log('🎭 [ServiceDetail] Template missing tags or serviceCategory:', template.name)
        return false
      }

      // Check if any of the template's service categories match our category
      const templateCategories = Array.isArray(template.tags.serviceCategory)
        ? template.tags.serviceCategory
        : [template.tags.serviceCategory]

      const matches = templateCategories.includes(expectedCategoryRef)

      console.log('🎭 [ServiceDetail] Template category check:', {
        templateName: template.name,
        templateCategories,
        expectedCategoryRef,
        matches
      })

      return matches
    })

    console.log('🎭 [ServiceDetail] Filtered templates result:', {
      filteredCount: filtered.length,
      filteredTemplates: filtered.map(t => t.name)
    })

    return filtered
  }, [allFlowTemplates, category])

  useEffect(() => {
    console.log('🎭 [ServiceDetail] Component mounting with categoryId:', categoryId)

    const loadCategory = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Wait for categories to load if they're still loading
        if (categoriesLoading) {
          console.log('🎭 [ServiceDetail] Waiting for categories to load...')
          return // Don't proceed until categories are loaded
        }

        if (categoriesError) {
          throw new Error(`Failed to load categories: ${categoriesError}`)
        }

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300))

        // Handle special uncategorized category
        if (categoryId === 'uncategorized') {
          const uncategorizedCategory = {
            id: 'uncategorized',
            name: 'Uncategorized',
            description: 'Services that are not assigned to any category or have invalid category references',
            icon: 'uncategorized',
            order: 999 // Put uncategorized at the end
          }
          console.log('🎭 [ServiceDetail] Uncategorized category created')
          setCategory(uncategorizedCategory)
          return
        }

        // First try to find in dynamic catalog categories
        let categoryData = catalogCategories.find(cat => cat.id === categoryId)

        // If not found in catalog, try static categories as fallback
        if (!categoryData) {
          categoryData = getCategoryById(categoryId)
        }

        if (!categoryData) {
          throw new Error(`Category ${categoryId} not found in catalog or static categories`)
        }

        console.log('🎭 [ServiceDetail] Category loaded:', {
          id: categoryData.id,
          name: categoryData.name,
          source: catalogCategories.find(cat => cat.id === categoryId) ? 'catalog' : 'static'
        })
        setCategory(categoryData)
      } catch (err) {
        console.error('🎭 [ServiceDetail] Error loading category:', err)
        setError(err instanceof Error ? err.message : 'Failed to load category')
      } finally {
        setIsLoading(false)
      }
    }

    loadCategory()
  }, [categoryId, categoriesLoading, categoriesError, catalogCategories])

  // Debug effect for flow templates
  useEffect(() => {
    console.log('🎭 [ServiceDetail] Flow templates state changed:', {
      loading: flowTemplatesLoading,
      error: flowTemplatesError,
      totalCount: allFlowTemplates.length,
      filteredCount: categoryTemplates.length,
      category: category?.id,
      templates: categoryTemplates.map(t => ({ id: t.id, name: t.name, tags: t.tags }))
    })
  }, [allFlowTemplates, categoryTemplates, flowTemplatesLoading, flowTemplatesError, category])

  // Enhanced KPI cards
  const kpiCards: KpiCardData[] = useMemo(() => {
    if (!category) return []

    // Calculate average due time from template steps
    const calculateAverageDueTime = () => {
      if (categoryTemplates.length === 0) return { value: 'N/A', description: 'No services available' }

      let totalDueMinutes = 0
      let stepCount = 0

      categoryTemplates.forEach(template => {
        if (template.steps && Array.isArray(template.steps)) {
          template.steps.forEach(step => {
            if (step.dueInMinutes && typeof step.dueInMinutes === 'number') {
              totalDueMinutes += step.dueInMinutes
              stepCount++
            }
          })
        }
      })

      if (stepCount === 0) return { value: 'N/A', description: 'No due times specified' }

      const avgMinutes = Math.round(totalDueMinutes / stepCount)

      // Convert to human-readable format
      if (avgMinutes < 60) {
        return { value: `${avgMinutes}min`, description: `Average step completion time` }
      } else if (avgMinutes < 1440) {
        // Less than 24 hours
        const hours = Math.round(avgMinutes / 60)
        return { value: `${hours}h`, description: `Average step completion time` }
      } else {
        // Days
        const days = Math.round(avgMinutes / 1440)
        return { value: `${days}d`, description: `Average step completion time` }
      }
    }

    const avgDueTime = calculateAverageDueTime()

    return [
      {
        id: 'available-services',
        title: 'Available Services',
        value: categoryTemplates.length,
        description: 'Live templates from workflow engine'
      },
      {
        id: 'avg-processing-time',
        title: 'Avg. Processing Time',
        value: '2-4 days',
        description: 'Typical completion time'
      },
      {
        id: 'success-rate',
        title: 'Success Rate',
        value: '98%',
        description: 'Successfully completed'
      },
      {
        id: 'avg-due-time',
        title: 'Avg. Due Time',
        value: avgDueTime.value,
        description: avgDueTime.description
      }
    ]
  }, [category, categoryTemplates])

  // Show loading state if categories are still loading OR if we're in the loading phase
  if (isLoading || categoriesLoading || (!category && !error)) {
    const loadingMessage = categoriesLoading
      ? 'Loading service categories...'
      : flowTemplatesLoading
        ? 'Loading service templates...'
        : 'Loading service information...'

    return (
      <PageLayout headerTitle="Loading Services" headerDescription={loadingMessage}>
        <div className="gba:flex gba:flex-col gba:justify-center gba:items-center gba:h-64 gba:space-y-4">
          <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-primary"></div>
          <p className="gba:text-gray-600 gba:text-sm">{loadingMessage}</p>
        </div>
      </PageLayout>
    )
  }

  // Only show error if there's actually an error AND we're not loading
  if (error || (!category && !isLoading && !categoriesLoading)) {
    return (
      <div data-testid="service-detail-error-container" className="gba:bg-background gba:p-4">
        {/* Back navigation */}
        <div className="gba:back-navigation" style={{ marginBottom: '16px' }}>
          <button
            onClick={onBack}
            className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
            data-testid="back-button"
          >
            <ArrowLeftOutlined className="gba:mr-2" />
            <span>Back to Portal</span>
          </button>
        </div>

        <PageLayout
          headerTitle="Error Loading Services"
          headerDescription="Unable to load the requested service category"
        >
          <Alert variant="destructive">
            <h4 className="gba:font-semibold">Service Category Not Found</h4>
            <p>{error || 'The requested service category could not be found.'}</p>
          </Alert>
        </PageLayout>
      </div>
    )
  }

  // Type guard: At this point, category should be defined
  if (!category) {
    return null // This should never happen due to the checks above
  }

  const IconComponent = getCategoryIcon(category.id)

  return (
    <div data-testid="service-detail-container" className="gba:bg-background gba:p-4">
      {/* Back navigation */}
      <div className="gba:back-navigation" style={{ marginBottom: '16px' }}>
        <button
          onClick={onBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="back-button"
        >
          <ArrowLeftOutlined className="gba:mr-2" />
          <span>Back to Portal</span>
        </button>
      </div>

      <PageLayout
        headerPhosphorIcon={{
          icon: IconComponent,
          variant: 'strategy',
          size: 'lg',
          label: category.name
        }}
        headerTitle={category.name}
        headerDescription={category.description}
        sectionTitle="Available Services"
        sectionDescription={`Choose from ${categoryTemplates.length} service${categoryTemplates.length !== 1 ? 's' : ''} available in the ${category.name} category`}
        kpiCardsData={kpiCards}
      >
        {/* Service Templates Section */}
        {flowTemplatesLoading && (
          <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2 gba:xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="gba:h-64 gba:animate-pulse">
                <div className="gba:p-6 gba:space-y-4">
                  <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-3/4"></div>
                  <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-1/2"></div>
                  <div className="gba:space-y-2">
                    <div className="gba:h-3 gba:bg-gray-200 gba:rounded"></div>
                    <div className="gba:h-3 gba:bg-gray-200 gba:rounded gba:w-5/6"></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {flowTemplatesError && !flowTemplatesLoading && (
          <Alert variant="destructive">
            <Warning className="gba:h-4 gba:w-4" />
            <div>
              <p className="gba:font-semibold">Failed to Load Service Templates</p>
              <p className="gba:text-sm">{flowTemplatesError}</p>
              <Button variant="outline" size="sm" onClick={refetchFlowTemplates} className="gba:mt-2">
                Retry
              </Button>
            </div>
          </Alert>
        )}

        {!flowTemplatesLoading && !flowTemplatesError && categoryTemplates.length > 0 && (
          <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2 gba:xl:grid-cols-3">
            {categoryTemplates.map(template => (
              <FlowTemplateCard
                key={template.id || template.name}
                template={template}
                onRequest={() => onRequestFlowTemplate?.(template)}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!flowTemplatesLoading && !flowTemplatesError && categoryTemplates.length === 0 && (
          <div className="gba:text-center gba:py-16">
            <div className="gba:mx-auto gba:w-24 gba:h-24 gba:bg-muted gba:rounded-full gba:flex gba:items-center gba:justify-center gba:mb-6">
              <IconComponent className="gba:h-12 gba:w-12 gba:text-muted-foreground" />
            </div>
            <h3 className="gba:text-xl gba:font-semibold gba:mb-2">No Services Available</h3>
            <p className="gba:text-muted-foreground gba:mb-6 gba:max-w-md gba:mx-auto">
              There are currently no service templates available in the {category.name} category. Templates may be
              loading or the custom-flow-engine may not be running.
            </p>
            <div className="gba:flex gba:gap-3 gba:justify-center">
              <Button variant="outline" onClick={refetchFlowTemplates}>
                Refresh Templates
              </Button>
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="gba:mr-2 gba:h-4 gba:w-4" />
                Browse Other Categories
              </Button>
            </div>
          </div>
        )}
      </PageLayout>
    </div>
  )
}
