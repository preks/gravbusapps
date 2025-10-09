import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PageLayout,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Spinner,
  Alert,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@newwork/nw-design-system'
import { Plus, Pencil, X, ArrowsOutCardinal } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CatalogEntry } from '@/common/data/catalog'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
// Helper function for converting strings to screaming snake case
const convertToScreamingSnakeCase = (input: string): string => {
  return input
    .trim()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9_]/g, '') // Remove special characters except underscores
    .toUpperCase() // Convert to uppercase
}

// Helper function to convert translations array to Record format
const translationsToRecord = (translations: any[], field: string): Record<string, string> => {
  const record: Record<string, string> = {}
  translations?.forEach(t => {
    if (t.localeCode && t[field]) {
      record[t.localeCode] = t[field]
    }
  })
  return record
}

// Helper function to create translations array from Record format
const recordToTranslations = (
  records: Record<string, Record<string, string>>,
  existingTranslations: any[] = [],
  catalogEntryId: string
): any[] => {
  const supportedLocales = ['en-US', 'de-DE', 'ro-RO']
  const translations: any[] = []

  supportedLocales.forEach(locale => {
    const existing = existingTranslations.find(t => t.localeCode === locale)

    const translation: any = {
      localeCode: locale,
      value: records.nameTranslations?.[locale] || '',
      additionalValue1: records.descriptionTranslations?.[locale] || '',
      additionalValue2: records.urlTranslations?.[locale] || '',
      additionalValue3: records.iconTranslations?.[locale] || '',
      objectValue: null,
      catalogEntryId
    }

    // Only include ID if this is an existing translation (for updates)
    if (existing?.id) {
      translation.id = existing.id
    }

    // For updates: always include existing translations (even if cleared to empty strings)
    // For new entries: only include translations with non-empty values
    const hasExistingTranslation = existing?.id
    const hasNonEmptyValues =
      translation.value || translation.additionalValue1 || translation.additionalValue2 || translation.additionalValue3

    if (hasExistingTranslation || hasNonEmptyValues) {
      translations.push(translation)
    }
  })

  return translations
}
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { LauncherList } from './components/LauncherList'
import { ConfigGrid } from './components/ConfigGrid'
import { ConfigForm } from './components/ConfigForm'
import { useLaunchers } from './hooks/useLaunchers'
import { useLauncherConfigs } from './hooks/useLauncherConfigs'

interface LauncherManagerProps extends BusinessAppContextProps {}

export const LAUNCHER_CATALOG = 'Launcher'
export const LAUNCHER_VERSION = 'v1'
export const LAUNCHER_CONFIG_CATALOG = 'LauncherConfig'
export const LAUNCHER_CONFIG_VERSION = 'v1'

const PREFIX = 'LauncherManager'

const LauncherManager: React.FC<LauncherManagerProps> = context => {
  const [selectedLauncher, setSelectedLauncher] = useState<CatalogEntry | null>(null)
  const [launcherSearch, setLauncherSearch] = useState('')
  const [editingConfig, setEditingConfig] = useState<CatalogEntry | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)

  const dataTestId = (suffix: string) => formatDataTestId(PREFIX, suffix)

  const {
    data: launchers,
    isLoading: isLoadingLaunchers,
    error: launchersError,
    refetch: refetchLaunchers
  } = useLaunchers(context, { search: launcherSearch })

  const {
    data: configs,
    isLoading: isLoadingConfigs,
    error: configsError,
    refetch: refetchConfigs,
    createConfig,
    updateConfigOrder,
    updateConfig,
    deleteConfig
  } = useLauncherConfigs(context, {
    launcherId: selectedLauncher?.id || ''
  })

  useEffect(() => {
    if (!selectedLauncher && launchers.length > 0) {
      setSelectedLauncher(launchers[0])
    }
  }, [launchers, selectedLauncher])

  const handleAddConfig = useCallback(
    async (values: {
      name: string
      description: string
      url: string
      iconName: string
      nameTranslations: Record<string, string>
      descriptionTranslations: Record<string, string>
      urlTranslations: Record<string, string>
      iconTranslations: Record<string, string>
    }) => {
      if (!selectedLauncher) return

      const order = (configs?.length || 0) + 1
      const newEntryId = `temp-${Date.now()}` // Temporary ID for translation generation

      await createConfig({
        parentEntryId: selectedLauncher.id,
        code: convertToScreamingSnakeCase(values.name),
        value: values.name,
        displayOrder: order,
        additionalValue1: values.description || '',
        additionalValue2: values.url || '',
        additionalValue3: values.iconName || '',
        // Get catalogId from existing config or use a reasonable fallback
        catalogId: configs && configs.length > 0 ? configs[0].catalogId : undefined,
        translations: recordToTranslations(
          {
            nameTranslations: values.nameTranslations,
            descriptionTranslations: values.descriptionTranslations,
            urlTranslations: values.urlTranslations,
            iconTranslations: values.iconTranslations
          },
          [],
          newEntryId
        )
      })
      setIsAddOpen(false)
      await refetchConfigs()
    },
    [selectedLauncher, createConfig, configs?.length, refetchConfigs]
  )

  const handleSaveOrder = useCallback(
    async (orderedIds: string[]) => {
      if (!selectedLauncher) return
      await updateConfigOrder(orderedIds)
      setIsEditMode(false)
      await refetchConfigs()
    },
    [selectedLauncher, updateConfigOrder, refetchConfigs]
  )

  const launcherList = useMemo(
    () => (
      <div className="gba:flex gba:flex-col gba:gap-3" data-testid={dataTestId('LauncherListContainer')}>
        <div className="gba:w-full" data-testid={dataTestId('LauncherSearchContainer')}>
          <DebouncedInput
            value={launcherSearch}
            onChange={setLauncherSearch}
            placeholder="Search launchers..."
            data-testid={dataTestId('LauncherSearchInput')}
          />
        </div>

        {isLoadingLaunchers && (
          <div className="gba:flex gba:items-center gba:gap-2" data-testid={dataTestId('LauncherLoading')}>
            <Spinner className="gba:w-4 gba:h-4" />
            <span>Loading...</span>
          </div>
        )}

        {launchersError && (
          <Alert variant="destructive" data-testid={dataTestId('LauncherError')}>
            Failed to load launchers
            <div className="gba:mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={refetchLaunchers}
                data-testid={dataTestId('LauncherRetryButton')}
              >
                Retry
              </Button>
            </div>
          </Alert>
        )}

        <LauncherList
          launchers={launchers}
          selectedLauncherId={selectedLauncher?.id || ''}
          onSelect={id => {
            const found = launchers.find(l => l.id === id) || null
            setSelectedLauncher(found)
          }}
          dataTestIdPrefix={PREFIX}
        />
      </div>
    ),
    [launcherSearch, isLoadingLaunchers, launchersError, launchers, selectedLauncher, refetchLaunchers]
  )

  return (
    <PageLayout
      headerPhosphorIcon={{
        icon: ArrowsOutCardinal,
        variant: 'default',
        size: 'lg',
        label: 'Launcher Manager'
      }}
      headerTitle="Launcher Manager"
      headerDescription="Manage and configure launcher applications and their cards"
      data-testid={dataTestId('Page')}
    >
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-4 gba:gap-4" data-testid={dataTestId('LayoutGrid')}>
        <div className="gba:col-span-1">
          <Card data-testid={dataTestId('LauncherPanel')}>
            <CardHeader>
              <CardTitle>Launchers</CardTitle>
            </CardHeader>
            <CardContent>{launcherList}</CardContent>
          </Card>
        </div>

        <div className="gba:col-span-1 lg:gba:col-span-3">
          <Card data-testid={dataTestId('ConfigPanel')}>
            <CardHeader>
              <div className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <CardTitle>{selectedLauncher ? selectedLauncher.value : 'Select a launcher'}</CardTitle>
                  {selectedLauncher && (
                    <Badge variant="secondary" data-testid={dataTestId('SelectedLauncherBadge')}>
                      {selectedLauncher.code}
                    </Badge>
                  )}
                </div>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Button
                    onClick={() => setIsAddOpen(true)}
                    disabled={!selectedLauncher}
                    data-testid={dataTestId('AddConfigButton')}
                  >
                    <Plus className="gba:w-4 gba:h-4" />
                    Add Card
                  </Button>
                  <Button
                    onClick={() => setIsEditMode(v => !v)}
                    variant={isEditMode ? 'secondary' : 'outline'}
                    disabled={!selectedLauncher}
                    data-testid={dataTestId('ToggleEditModeButton')}
                  >
                    {isEditMode ? <X className="gba:w-4 gba:h-4" /> : <Pencil className="gba:w-4 gba:h-4" />}
                    {isEditMode ? 'Cancel Edit' : 'Edit Order'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Cards search removed per requirements */}

              {isLoadingConfigs && (
                <div className="gba:flex gba:items-center gba:gap-2" data-testid={dataTestId('ConfigsLoading')}>
                  <Spinner className="gba:w-4 gba:h-4" />
                  <span>Loading...</span>
                </div>
              )}
              {configsError && (
                <Alert variant="destructive" data-testid={dataTestId('ConfigsError')}>
                  Failed to load launcher cards
                  <div className="gba:mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={refetchConfigs}
                      data-testid={dataTestId('ConfigsRetryButton')}
                    >
                      Retry
                    </Button>
                  </div>
                </Alert>
              )}

              <ConfigGrid
                items={configs}
                isEditMode={isEditMode}
                onSaveOrder={handleSaveOrder}
                onEdit={item => {
                  setEditingConfig(item)
                  setIsAddOpen(true)
                }}
                onDelete={async id => {
                  await deleteConfig(id)
                  await refetchConfigs()
                }}
                dataTestIdPrefix={PREFIX}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={isAddOpen}
        onOpenChange={open => {
          if (!open) {
            setIsAddOpen(false)
            setEditingConfig(null)
          } else {
            setIsAddOpen(true)
          }
        }}
      >
        <DialogContent data-testid={dataTestId('AddConfigDialog')}>
          <DialogHeader>
            <DialogTitle>{editingConfig ? 'Edit Launcher Card' : 'Add Launcher Card'}</DialogTitle>
            <DialogDescription>
              {editingConfig ? 'Update the selected card' : 'Create a new card for the selected launcher'}
            </DialogDescription>
          </DialogHeader>
          <ConfigForm
            onSubmit={async values => {
              if (editingConfig) {
                await updateConfig(editingConfig.id, {
                  name: values.name,
                  description: values.description,
                  url: values.url,
                  iconName: values.iconName,
                  translations: recordToTranslations(
                    {
                      nameTranslations: values.nameTranslations,
                      descriptionTranslations: values.descriptionTranslations,
                      urlTranslations: values.urlTranslations,
                      iconTranslations: values.iconTranslations
                    },
                    editingConfig.translations || [],
                    editingConfig.id
                  )
                })
                setIsAddOpen(false)
                setEditingConfig(null)
                await refetchConfigs()
              } else {
                await handleAddConfig(values)
              }
            }}
            onCancel={() => {
              setIsAddOpen(false)
              setEditingConfig(null)
            }}
            dataTestIdPrefix={PREFIX}
            initialValues={
              editingConfig
                ? {
                    name: editingConfig.value,
                    description: editingConfig.additionalValue1 || '',
                    url: editingConfig.additionalValue2 || '',
                    iconName: editingConfig.additionalValue3 || '',
                    nameTranslations: translationsToRecord(editingConfig.translations || [], 'value'),
                    descriptionTranslations: translationsToRecord(editingConfig.translations || [], 'additionalValue1'),
                    urlTranslations: translationsToRecord(editingConfig.translations || [], 'additionalValue2'),
                    iconTranslations: translationsToRecord(editingConfig.translations || [], 'additionalValue3')
                  }
                : undefined
            }
          />
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}

export default LauncherManager
