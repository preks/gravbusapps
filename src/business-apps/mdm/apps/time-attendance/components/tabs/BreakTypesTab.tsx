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
import BreakTypeForm from '../../../../forms/time-attendance/BreakTypeForm'
import { useSimpleBreakTypesData } from '../../hooks/useSimpleBreakTypesData'
import { useBreakTypeVersionsData } from '../../hooks/useBreakTypeVersionsData'
import BreakTypesItems from './BreakTypesItems'
import BreakTypesVersion from './BreakTypesVersion'
import ConfigureBreakType from '../ConfigureBreakType'
import { TransformedBreakTypeVersion } from '../../types/break-type-versions'

export interface BreakTypesProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'BreakTypes'

export const BreakTypesTab: React.FC<BreakTypesProps> = ({ accessToken, prefixDataTestId }) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  // Use separate hooks for each tab
  const {
    breakTypes: simpleBreakTypes,
    loading: loadingSimple,
    error: errorSimple,
    refetch: refetchSimple
  } = useSimpleBreakTypesData({ accessToken })
  const {
    breakTypeVersions,
    loading: loadingVersions,
    error: errorVersions,
    refetch: refetchVersions
  } = useBreakTypeVersionsData({ accessToken })

  // State management
  const [selectedBreakTypeVersion, setSelectedBreakTypeVersion] = useState<TransformedBreakTypeVersion | null>(null)
  const [activeTab, setActiveTab] = useState<string>('items')
  const [showConfigureView, setShowConfigureView] = useState(false)

  // Used codes for validation
  const usedCodes = useMemo(() => {
    return simpleBreakTypes.map(breakType => breakType.code)
  }, [simpleBreakTypes])

  const loading = loadingSimple || loadingVersions
  const error = errorSimple || errorVersions

  // Handle back from ConfigureBreakType
  const handleBackFromConfigure = () => {
    setShowConfigureView(false)
    setSelectedBreakTypeVersion(null)
  }

  // If we're in configure view, show ConfigureBreakType
  if (showConfigureView) {
    return (
      <ConfigureBreakType
        breakTypeVersion={selectedBreakTypeVersion}
        onBack={handleBackFromConfigure}
        prefixDataTestId={prefixDataTestId}
        breakTypes={simpleBreakTypes}
        breakTypeVersions={breakTypeVersions}
        accessToken={accessToken}
        refetch={refetchVersions}
      />
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid={formatDataTestId(dataTestId, 'error-alert')}>
        <AlertTitle>Error Loading Break Types</AlertTitle>
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
                  ? `Break Types (${simpleBreakTypes.length})`
                  : `Break Type Versions (${breakTypeVersions.length})`}
              </CardTitle>
              <CardDescription className="gba:text-sm gba:text-muted-foreground">
                Manage break rules and configurations for time tracking.
              </CardDescription>
            </div>
            <div className="gba:flex gba:gap-2">
              {activeTab === 'items' ? (
                <BreakTypeForm
                  childAddButton={
                    <Button
                      onClick={e => {
                        e.stopPropagation()
                      }}
                      data-testid={formatDataTestId(dataTestId, 'add-button')}
                      className="gba:flex gba:items-center gba:gap-2"
                    >
                      <PlusIcon size={16} />
                      Add Break Type
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
                    setSelectedBreakTypeVersion(null)
                    setShowConfigureView(true)
                  }}
                  data-testid={formatDataTestId(dataTestId, 'add-version-button')}
                  className="gba:flex gba:items-center gba:gap-2"
                >
                  <PlusIcon size={16} />
                  Add Break Type Version
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
              Break Types
            </TabsTrigger>
            <TabsTrigger value="versions" data-testid={formatDataTestId(dataTestId, 'tab-versions')}>
              Break Type Versions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <BreakTypesItems
              breakTypes={simpleBreakTypes}
              breakTypeVersions={breakTypeVersions}
              refetch={refetchSimple}
              accessToken={accessToken}
              prefixDataTestId={dataTestId}
              onConfigure={(version: TransformedBreakTypeVersion) => {
                setSelectedBreakTypeVersion(version)
                setShowConfigureView(true)
              }}
            />
          </TabsContent>

          <TabsContent value="versions">
            <BreakTypesVersion
              breakTypeVersions={breakTypeVersions}
              refetch={refetchVersions}
              accessToken={accessToken}
              prefixDataTestId={dataTestId}
              onEdit={(version: TransformedBreakTypeVersion) => {
                setSelectedBreakTypeVersion(version)
                setShowConfigureView(true)
              }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default BreakTypesTab
