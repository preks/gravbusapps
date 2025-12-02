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
import { useSimpleDayTypesData } from '../../hooks/useSimpleDayTypesData'
import { useDayTypeVersionsData } from '../../hooks/useDayTypeVersionsData'
import { useIncrementTypesData } from '../../hooks/useIncrementTypesData'
import { useRoundingRulesData } from '../../hooks/useRoundingRulesData'
import DayTypeForm from '@/business-apps/mdm/forms/time-attendance/DayTypeForm'
import DayTypesItems from './DayTypesItems'
import DayTypesVersion from './DayTypesVersion'
import ConfigureDayType from '../ConfigureDayType'
import { useBreakTypesData } from '../../hooks/useBreakTypesData'
import { TransformedDayTypeVersion } from '../../types/day-type-versions'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface DayTypesProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'DayTypes'

export const DayTypesTab: React.FC<DayTypesProps> = ({ accessToken, prefixDataTestId }) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  // Use separate hooks for each tab
  const {
    dayTypes: simpleDayTypes,
    loading: loadingSimple,
    error: errorSimple,
    refetch: refetchSimple
  } = useSimpleDayTypesData({ accessToken })
  const {
    dayTypeVersions,
    loading: loadingVersions,
    error: errorVersions,
    refetch: refetchVersions,
    fieldTypeOptions
  } = useDayTypeVersionsData({ accessToken })
  const { incrementTypes } = useIncrementTypesData({ accessToken })
  const { roundingRules } = useRoundingRulesData({ accessToken })
  const { breakTypes } = useBreakTypesData({ accessToken })

  // State management
  const [selectedDayTypeVersion, setSelectedDayTypeVersion] = useState<TransformedDayTypeVersion | null>(null)
  const [activeTab, setActiveTab] = useState<string>('items')
  const [showConfigureView, setShowConfigureView] = useState(false)

  // Used codes for validation
  const usedCodes = useMemo(() => {
    return simpleDayTypes.map(dayType => dayType.code)
  }, [simpleDayTypes])

  const loading = loadingSimple || loadingVersions
  const error = errorSimple || errorVersions

  // Handle back from ConfigureDayType
  const handleBackFromConfigure = () => {
    setShowConfigureView(false)
    setSelectedDayTypeVersion(null)
  }

  // If we're in configure view, show ConfigureDayType
  if (showConfigureView) {
    return (
      <ConfigureDayType
        dayTypeVersion={selectedDayTypeVersion}
        onBack={handleBackFromConfigure}
        prefixDataTestId={prefixDataTestId}
        dayTypes={simpleDayTypes}
        dayTypeVersions={dayTypeVersions}
        incrementTypes={incrementTypes}
        roundingRules={roundingRules}
        breakTypes={breakTypes}
        accessToken={accessToken}
        refetch={refetchVersions}
        fieldTypeOptions={fieldTypeOptions}
      />
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid={formatDataTestId(dataTestId, 'error-alert')}>
        <AlertTitle>
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.day_types.error.loading',
            'Error Loading Day Types'
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
                {activeTab === 'items'
                  ? `${getTranslationFromI18nKeyAndLabel('master-data:hr.time_attendance.day_types.title', 'Day Types')} (${simpleDayTypes.length})`
                  : `${getTranslationFromI18nKeyAndLabel('master-data:hr.time_attendance.day_type_versions.title', 'Day Type Versions')} (${dayTypeVersions.length})`}
              </CardTitle>
              <CardDescription className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.day_types.description',
                  'Configure day types for attendance.'
                )}
              </CardDescription>
            </div>
            <div className="gba:flex gba:gap-2">
              {activeTab === 'items' ? (
                <DayTypeForm
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
                        'master-data:hr.time_attendance.day_types.actions.add',
                        'Add Day Type'
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
                    setSelectedDayTypeVersion(null)
                    setShowConfigureView(true)
                  }}
                  data-testid={formatDataTestId(dataTestId, 'add-version-button')}
                  className="gba:flex gba:items-center gba:gap-2"
                >
                  <PlusIcon size={16} />
                  {getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.time_attendance.day_type_versions.actions.add',
                    'Add Day Type Version'
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
              {getTranslationFromI18nKeyAndLabel('master-data:hr.time_attendance.day_types.title', 'Day Types')}
            </TabsTrigger>
            <TabsTrigger value="versions" data-testid={formatDataTestId(dataTestId, 'tab-versions')}>
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.time_attendance.day_type_versions.title',
                'Day Type Versions'
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <DayTypesItems
              dayTypes={simpleDayTypes}
              dayTypeVersions={dayTypeVersions}
              refetch={refetchSimple}
              accessToken={accessToken}
              prefixDataTestId={dataTestId}
              onConfigure={(version: TransformedDayTypeVersion) => {
                setSelectedDayTypeVersion(version)
                setShowConfigureView(true)
              }}
            />
          </TabsContent>

          <TabsContent value="versions">
            <DayTypesVersion
              dayTypeVersions={dayTypeVersions}
              refetch={refetchVersions}
              accessToken={accessToken}
              prefixDataTestId={dataTestId}
              onEdit={(version: TransformedDayTypeVersion) => {
                setSelectedDayTypeVersion(version)
                setShowConfigureView(true)
              }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default DayTypesTab
