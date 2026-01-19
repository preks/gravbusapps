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
import RoundingRuleForm from '../../../../forms/time-attendance/RoundingRuleForm'
import { useSimpleRoundingRulesData } from '../../hooks/useSimpleRoundingRulesData'
import { useRoundingRuleVersionsData } from '../../hooks/useRoundingRuleVersionsData'
import RoundingRulesItems from './RoundingRulesItems'
import RoundingRulesVersion from './RoundingRulesVersion'
import ConfigureRoundingRule from '../ConfigureRoundingRule'
import { TransformedRoundingRuleVersion } from '../../types/rounding-rule-versions'

export interface RoundingRulesProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'RoundingRules'

export const RoundingRulesTab: React.FC<RoundingRulesProps> = ({ accessToken, prefixDataTestId }) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  // Use separate hooks for each tab
  const {
    roundingRules: simpleRoundingRules,
    loading: loadingSimple,
    error: errorSimple,
    refetch: refetchSimple
  } = useSimpleRoundingRulesData({ accessToken })
  const {
    roundingRuleVersions,
    loading: loadingVersions,
    error: errorVersions,
    refetch: refetchVersions
  } = useRoundingRuleVersionsData({ accessToken })

  // State management
  const [selectedRoundingRuleVersion, setSelectedRoundingRuleVersion] = useState<TransformedRoundingRuleVersion | null>(
    null
  )
  const [activeTab, setActiveTab] = useState<string>('items')
  const [showConfigureView, setShowConfigureView] = useState(false)

  // Used codes for validation
  const usedCodes = useMemo(() => {
    return simpleRoundingRules.map(roundingRule => roundingRule.code)
  }, [simpleRoundingRules])

  const loading = loadingSimple || loadingVersions
  const error = errorSimple || errorVersions

  // Handle back from ConfigureRoundingRule
  const handleBackFromConfigure = () => {
    setShowConfigureView(false)
    setSelectedRoundingRuleVersion(null)
  }

  // If we're in configure view, show ConfigureRoundingRule
  if (showConfigureView) {
    return (
      <ConfigureRoundingRule
        roundingRuleVersion={selectedRoundingRuleVersion}
        onBack={handleBackFromConfigure}
        prefixDataTestId={prefixDataTestId}
        roundingRules={simpleRoundingRules.map(rr => ({
          id: rr.id,
          code: rr.code,
          name: rr.name,
          version: rr.version
        }))}
        roundingRuleVersions={roundingRuleVersions}
        accessToken={accessToken}
        refetch={refetchVersions}
      />
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid={formatDataTestId(dataTestId, 'error-alert')}>
        <AlertTitle>Error Loading Rounding Rules</AlertTitle>
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
                  ? `Rounding Rules (${simpleRoundingRules.length})`
                  : `Rounding Rule Versions (${roundingRuleVersions.length})`}
              </CardTitle>
              <CardDescription className="gba:text-sm gba:text-muted-foreground">
                Manage clocking rounding rules and configurations for time tracking.
              </CardDescription>
            </div>
            <div className="gba:flex gba:gap-2">
              {activeTab === 'items' ? (
                <RoundingRuleForm
                  childAddButton={
                    <Button
                      onClick={e => {
                        e.stopPropagation()
                      }}
                      data-testid={formatDataTestId(dataTestId, 'add-button')}
                      className="gba:flex gba:items-center gba:gap-2"
                    >
                      <PlusIcon size={16} />
                      Add Rounding Rule
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
                    setSelectedRoundingRuleVersion(null)
                    setShowConfigureView(true)
                  }}
                  data-testid={formatDataTestId(dataTestId, 'add-version-button')}
                  className="gba:flex gba:items-center gba:gap-2"
                >
                  <PlusIcon size={16} />
                  Add Rounding Rule Version
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
              Rounding Rules
            </TabsTrigger>
            <TabsTrigger value="versions" data-testid={formatDataTestId(dataTestId, 'tab-versions')}>
              Rounding Rule Versions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <RoundingRulesItems
              roundingRules={simpleRoundingRules}
              roundingRuleVersions={roundingRuleVersions}
              refetch={refetchSimple}
              accessToken={accessToken}
              prefixDataTestId={dataTestId}
              onConfigure={(version: TransformedRoundingRuleVersion) => {
                setSelectedRoundingRuleVersion(version)
                setShowConfigureView(true)
              }}
            />
          </TabsContent>

          <TabsContent value="versions">
            <RoundingRulesVersion
              roundingRuleVersions={roundingRuleVersions}
              refetch={refetchVersions}
              accessToken={accessToken}
              prefixDataTestId={dataTestId}
              onEdit={(version: TransformedRoundingRuleVersion) => {
                setSelectedRoundingRuleVersion(version)
                setShowConfigureView(true)
              }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default RoundingRulesTab
