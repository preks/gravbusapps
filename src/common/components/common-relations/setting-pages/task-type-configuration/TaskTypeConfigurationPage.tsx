import React, { useState, useCallback, useEffect } from 'react'
import { PageLayout, Button, EmptyState, Alert, Card, Label, Input, Spinner } from '@newwork/nw-design-system'
import { ListChecksIcon, CheckCircleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useUpdateCatalogEntry } from '@/common/data/catalog'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import type { CatalogTranslationEntry } from '../utils/catalogTranslations'

interface TaskType {
  id: string
  code: string
  value: string
  localeCode?: string
  translations?: CatalogTranslationEntry[]
  type?: string
}

interface TaskTypeWithConfig extends TaskType {
  objectValue?: {
    approvalThreshold?: number
    [key: string]: any
  }
}

interface TaskTypeConfigurationPageProps extends BusinessAppContextProps {
  onBack?: () => void
  prefixDataTestId?: string
  headerTitle?: string
  headerDescription?: string
  catalogIdentifier: string
  hidePageLayout?: boolean
}

const DATA_TEST_ID = 'task-type-configuration'

export const TaskTypeConfigurationPage: React.FC<TaskTypeConfigurationPageProps> = ({
  accessToken,
  userInfo,
  additionalData,
  onBack,
  prefixDataTestId,
  headerTitle = 'Task Type Configuration',
  headerDescription = 'Configure approval settings for task types',
  catalogIdentifier,
  hidePageLayout = false
}) => {
  const catalogClient = useCatalogManagerClient(accessToken)
  const { updateCatalogEntry } = useUpdateCatalogEntry({ accessToken, userInfo, additionalData })

  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])
  const [selectedType, setSelectedType] = useState<TaskTypeWithConfig | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Form state for approval configuration
  const [approvalPercentage, setApprovalPercentage] = useState<number>(100)

  // Load task types list
  const loadTaskTypes = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier, version: 'v1' },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeTranslations: true,
          includeChildCatalogEntries: false
        }
      )
      const types = (response.data || []).map((entry: any) => ({
        id: entry.id,
        code: entry.code,
        value: entry.value,
        localeCode: entry.localeCode,
        translations: entry.translations,
        type: entry.type
      }))
      setTaskTypes(types)

      // Auto-select first type
      if (types.length > 0 && !selectedType) {
        handleSelectType(types[0])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load task types')
    } finally {
      setIsLoading(false)
    }
  }, [catalogClient, catalogIdentifier])

  // Load full details for selected task type
  const loadTaskTypeDetails = useCallback(
    async (typeId: string) => {
      try {
        setIsLoadingDetails(true)
        setSaveError(null)
        const entry = await catalogClient.readCatalogEntryById(typeId, { includeTranslations: true })

        const fullType: TaskTypeWithConfig = {
          id: entry.id,
          code: entry.code,
          value: entry.value,
          localeCode: entry.localeCode,
          translations: entry.translations,
          type: entry.type,
          objectValue: entry.objectValue || {}
        }

        setSelectedType(fullType)
        // Extract approval threshold from objectValue (stored as decimal, convert to percentage for UI)
        const percentage = fullType.objectValue?.approvalThreshold
        // Convert decimal (0.9) to percentage (90) for display
        setApprovalPercentage(percentage !== undefined ? percentage * 100 : 100)
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Failed to load task type details')
      } finally {
        setIsLoadingDetails(false)
      }
    },
    [catalogClient]
  )

  // Handle type selection
  const handleSelectType = useCallback(
    (type: TaskType) => {
      loadTaskTypeDetails(type.id)
    },
    [loadTaskTypeDetails]
  )

  // Save configuration
  const handleSave = async () => {
    if (!selectedType) return

    try {
      setIsSaving(true)
      setSaveError(null)

      // Convert percentage (90) to decimal (0.9) for backend storage
      const updatedObjectValue = {
        ...selectedType.objectValue,
        approvalThreshold: approvalPercentage / 100
      }

      await updateCatalogEntry(catalogIdentifier, 'v1', selectedType.id, {
        id: selectedType.id,
        code: selectedType.code,
        value: selectedType.value,
        localeCode: selectedType.localeCode,
        type: selectedType.type,
        objectValue: updatedObjectValue,
        translations: selectedType.translations || []
      })

      // Reload the selected type to show updated values
      await loadTaskTypeDetails(selectedType.id)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save configuration')
    } finally {
      setIsSaving(false)
    }
  }

  // Initial load
  useEffect(() => {
    if (accessToken) {
      loadTaskTypes()
    }
  }, [accessToken, loadTaskTypes])

  // Filter task types by search
  const filteredTypes = taskTypes.filter(type => {
    if (!searchTerm) return true
    const lowerSearch = searchTerm.toLowerCase()
    return type.code.toLowerCase().includes(lowerSearch) || type.value.toLowerCase().includes(lowerSearch)
  })

  const content = (
    <div className="gba:flex gba:gap-6 gba:h-full" data-testid={`${prefixDataTestId}-${DATA_TEST_ID}`}>
      {/* Left Sidebar - Task Types */}
      <div className="gba:w-80 gba:flex-shrink-0">
        <Card className="gba:h-full">
          <div className="gba:p-4 gba:border-b">
            <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:mb-4">Task Types</h3>
            <DebouncedInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search task types..."
              debounce={300}
              data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-search`}
            />
          </div>

          <div className="gba:overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            {filteredTypes.length === 0 ? (
              <div className="gba:p-4">
                <EmptyState
                  title="No task types found"
                  description={searchTerm ? 'Try adjusting your search' : 'No task types available'}
                />
              </div>
            ) : (
              <div className="gba:p-2">
                {filteredTypes.map(type => {
                  const isSelected = selectedType?.id === type.id

                  return (
                    <div
                      key={type.id}
                      className={`gba:flex gba:items-center gba:justify-between gba:p-3 gba:rounded-md gba:cursor-pointer gba:mb-1 ${
                        isSelected ? 'gba:bg-accent gba:text-accent-foreground' : 'hover:gba:bg-muted'
                      }`}
                      onClick={() => handleSelectType(type)}
                      data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-type-${type.code}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                        <ListChecksIcon className="gba:w-4 gba:h-4 gba:flex-shrink-0" />
                        <div className="gba:flex-1 gba:min-w-0">
                          <div className="gba:text-sm gba:font-medium gba:truncate">{type.value}</div>
                          <div className="gba:text-xs gba:text-muted-foreground">{type.code}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Right Panel - Configuration */}
      <div className="gba:flex-1 gba:min-w-0">
        {!selectedType ? (
          <div className="gba:py-12">
            <EmptyState
              title="Select a task type"
              description="Choose a task type from the sidebar to configure its settings"
            />
          </div>
        ) : isLoadingDetails ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:min-h-96">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="gba:space-y-6">
            {saveError && (
              <Alert variant="destructive" data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-save-error`}>
                {saveError}
              </Alert>
            )}

            <div className="gba:flex gba:justify-between gba:items-start">
              <div>
                <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">{selectedType.value}</h2>
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                  Configure approval settings for this task type
                </p>
              </div>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-save-button`}
              >
                {isSaving ? (
                  <>
                    <Spinner size="sm" className="gba:mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </Button>
            </div>

            <Card>
              <div className="gba:p-6 gba:space-y-6">
                <div>
                  <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4">Approval Configuration</h3>
                  <p className="gba:text-sm gba:text-muted-foreground">
                    Set the approval percentage required for this task type
                  </p>
                </div>

                {/* Display current objectValue for debugging */}
                {selectedType?.objectValue && Object.keys(selectedType.objectValue).length > 0 && (
                  <div className="gba:p-3 gba:rounded-md gba:bg-muted gba:border">
                    <div className="gba:text-xs gba:font-mono gba:text-muted-foreground">
                      <strong>Current objectValue:</strong>
                      <pre className="gba:mt-1 gba:overflow-auto">
                        {JSON.stringify(selectedType.objectValue, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                <div className="gba:space-y-4">
                  <div className="gba:p-4 gba:rounded-md gba:border gba:bg-muted gba:space-y-4">
                    <div className="gba:space-y-2">
                      <Label htmlFor="approval-percentage" className="gba:text-sm gba:font-medium">
                        Approval Percentage Required
                      </Label>
                      <Input
                        id="approval-percentage"
                        type="number"
                        min="0"
                        max="100"
                        value={approvalPercentage}
                        onChange={e => {
                          const value = parseInt(e.target.value) || 0
                          // Clamp value between 0 and 100
                          setApprovalPercentage(Math.min(100, Math.max(0, value)))
                        }}
                        data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-approval-percentage`}
                        className="gba:max-w-xs"
                      />
                      <p className="gba:text-xs gba:text-muted-foreground">
                        {approvalPercentage}% of assignees must approve for the task to be completed
                      </p>
                    </div>

                    <div className="gba:flex gba:items-start gba:gap-2 gba:p-3 gba:rounded-md gba:bg-info-secondary">
                      <CheckCircleIcon className="gba:w-4 gba:h-4 gba:text-info gba:mt-0.5 gba:flex-shrink-0" />
                      <div className="gba:text-xs gba:text-info-secondary-foreground">
                        <strong>Example:</strong> If set to {approvalPercentage}% and 4 people are assigned, at least{' '}
                        {Math.ceil((approvalPercentage / 100) * 4)} must approve.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )

  if (isLoading) {
    const loadingContent = (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-96">
        <Spinner size="lg" />
      </div>
    )
    return hidePageLayout ? (
      loadingContent
    ) : (
      <PageLayout
        headerIcon={ListChecksIcon}
        headerTitle={headerTitle}
        headerDescription={headerDescription}
        onBack={onBack}
        data-testid={`${prefixDataTestId}-${DATA_TEST_ID}`}
      >
        {loadingContent}
      </PageLayout>
    )
  }

  if (error) {
    const errorContent = <Alert variant="destructive">{error}</Alert>
    return hidePageLayout ? (
      errorContent
    ) : (
      <PageLayout
        headerIcon={ListChecksIcon}
        headerTitle={headerTitle}
        headerDescription={headerDescription}
        onBack={onBack}
        data-testid={`${prefixDataTestId}-${DATA_TEST_ID}`}
      >
        {errorContent}
      </PageLayout>
    )
  }

  return hidePageLayout ? (
    content
  ) : (
    <PageLayout
      headerIcon={ListChecksIcon}
      headerTitle={headerTitle}
      headerDescription={headerDescription}
      onBack={onBack}
      data-testid={`${prefixDataTestId}-${DATA_TEST_ID}`}
    >
      {content}
    </PageLayout>
  )
}

export default TaskTypeConfigurationPage
