import React, { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  CardDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import IncrementTypeForm from '../../../../forms/time-attendance/IncrementTypeForm'
import { useSimpleIncrementTypesData } from '../../hooks/useSimpleIncrementTypesData'
import { useIncrementTypeVersionsData } from '../../hooks/useIncrementTypeVersionsData'
import IncrementTypesItems from './IncrementTypesItems'
import IncrementTypesVersion from './IncrementTypesVersion'
import ConfigureIncrementType from '../ConfigureIncrementType'
import { TransformedIncrementTypeVersion } from '../../types/increment-type-versions'

export interface IncrementTypesProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'IncrementTypes'

export const IncrementTypesTab: React.FC<IncrementTypesProps> = ({ accessToken, prefixDataTestId }) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  // Use separate hooks for each tab
  const {
    incrementTypes: simpleIncrementTypes,
    loading: loadingSimple,
    error: errorSimple,
    refetch: refetchSimple
  } = useSimpleIncrementTypesData({ accessToken })
  const {
    incrementTypeVersions,
    loading: loadingVersions,
    error: errorVersions,
    refetch: refetchVersions
  } = useIncrementTypeVersionsData({ accessToken })

  // State management
  const [selectedIncrementTypeVersion, setSelectedIncrementTypeVersion] =
    useState<TransformedIncrementTypeVersion | null>(null)
  const [activeTab, setActiveTab] = useState<string>('items')
  const [showConfigureView, setShowConfigureView] = useState(false)

  // Used codes for validation
  const usedCodes = useMemo(() => {
    return simpleIncrementTypes.map(incrementType => incrementType.code)
  }, [simpleIncrementTypes])

  const loading = loadingSimple || loadingVersions
  const error = errorSimple || errorVersions

  // Handle back from ConfigureIncrementType
  const handleBackFromConfigure = () => {
    setShowConfigureView(false)
    setSelectedIncrementTypeVersion(null)
  }

  // If we're in configure view, show ConfigureIncrementType
  if (showConfigureView) {
    return (
      <ConfigureIncrementType
        incrementTypeVersion={selectedIncrementTypeVersion}
        onBack={handleBackFromConfigure}
        prefixDataTestId={prefixDataTestId}
        incrementTypes={simpleIncrementTypes}
        incrementTypeVersions={incrementTypeVersions}
        accessToken={accessToken}
        refetch={refetchVersions}
      />
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid={formatDataTestId(dataTestId, 'error-alert')}>
        <AlertTitle>
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.increment_types.error_loading',
            'Error Loading Increment Types'
          )}
        </AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card data-testid={formatDataTestId(dataTestId, 'table-card')}>
      {!loading && (
        <CardHeader className="gba:space-y-1.5 gba:p-3 gba:border-b">
          <div className="gba:flex gba:justify-between gba:items-center gba:w-full">
            <div className="gba:flex gba:flex-col gba:gap-2 gba:h-full">
              <CardTitle className="gba:text-2xl gba:font-semibold gba:leading-none gba:tracking-tight">
                {`${
                  activeTab === 'items'
                    ? getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.time_attendance.increment_types.title',
                        'Increment Types'
                      )
                    : getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.time_attendance.increment_type_versions.title',
                        'Increment Type Versions'
                      )
                } (${simpleIncrementTypes.length})`}
              </CardTitle>
              <CardDescription className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.increment_types.description',
                  'Configure increment types for time calculations.'
                )}
              </CardDescription>
            </div>
            <div className="gba:flex gba:gap-2">
              {activeTab === 'items' ? (
                <IncrementTypeForm
                  childAddButton={
                    <Button
                      onClick={e => {
                        e.stopPropagation()
                      }}
                      data-testid={formatDataTestId(dataTestId, 'add-button')}
                      className="gba:flex gba:items-center gba:gap-2"
                    >
                      <PlusIcon size={16} />
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.time_attendance.increment_types.actions.add',
                        'Add Increment Type'
                      )}
                    </Button>
                  }
                  refetch={refetchSimple}
                  accessToken={accessToken}
                  prefixDataTestId={prefixDataTestId}
                  usedCodes={usedCodes}
                />
              ) : (
                <Button
                  onClick={() => {
                    setSelectedIncrementTypeVersion(null)
                    setShowConfigureView(true)
                  }}
                  data-testid={formatDataTestId(dataTestId, 'add-version-button')}
                  className="gba:flex gba:items-center gba:gap-2"
                >
                  <PlusIcon size={16} />
                  {getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.time_attendance.increment_type_versions.actions.add',
                    'Add Increment Type Version'
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="gba:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} data-testid={formatDataTestId(dataTestId, 'tabs')}>
          <TabsList className="gba:w-full gba:justify-start">
            <TabsTrigger value="items" data-testid={formatDataTestId(dataTestId, 'tab-items')}>
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.time_attendance.increment_types.title',
                'Increment Types'
              )}
            </TabsTrigger>
            <TabsTrigger value="versions" data-testid={formatDataTestId(dataTestId, 'tab-versions')}>
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.time_attendance.increment_type_versions.title',
                'Increment Type Versions'
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <IncrementTypesItems
              incrementTypes={simpleIncrementTypes}
              incrementTypeVersions={incrementTypeVersions}
              refetch={refetchSimple}
              accessToken={accessToken}
              prefixDataTestId={dataTestId}
              onConfigure={(version: TransformedIncrementTypeVersion) => {
                setSelectedIncrementTypeVersion(version)
                setShowConfigureView(true)
              }}
            />
          </TabsContent>

          <TabsContent value="versions">
            <IncrementTypesVersion
              incrementTypeVersions={incrementTypeVersions}
              refetch={refetchVersions}
              accessToken={accessToken}
              prefixDataTestId={dataTestId}
              onEdit={(version: TransformedIncrementTypeVersion) => {
                setSelectedIncrementTypeVersion(version)
                setShowConfigureView(true)
              }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default IncrementTypesTab
