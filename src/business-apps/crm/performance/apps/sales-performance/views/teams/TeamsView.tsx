import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { ChartBarIcon, ListBulletsIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTeamsViewState } from '../../hooks/useTeamsViewState'
import { useTeamMembers } from '../../hooks/useTeamMembers'
import { type CurrencyOption } from '../../hooks'
import { TeamComparisonView } from './TeamComparisonView'
import { TeamsListView } from './TeamsListView'
import { TeamPerformanceView } from './team-overview/TeamPerformanceView'

interface TeamsViewProps extends BusinessAppContextProps {
  currencies: CurrencyOption[]
  currenciesLoading: boolean
  selectedTeamIds: string[]
  onTeamSelectionChange: (teamIds: string[]) => void
  activeTeamIds: Set<string>
  onActiveTeamIdsChange: (activeIds: Set<string>) => void
  userTeamId?: string
}

const DATA_TEST_ID_PREFIX = 'sales-performance-teams'

export const TeamsView: React.FC<TeamsViewProps> = ({
  accessToken,
  userInfo,
  currencies,
  currenciesLoading,
  selectedTeamIds,
  onTeamSelectionChange,
  activeTeamIds,
  onActiveTeamIdsChange,
  userTeamId
}) => {
  const { activeTab, handleTabChange, selectedTeamId, handleTeamSelect, handleBackFromTeam } = useTeamsViewState()
  // Member IDs are loaded for the selected team only when its detail is opened.
  const {
    teamName: selectedTeamName,
    memberIds: selectedTeamMemberIds,
    isLoading: selectedTeamMembersLoading
  } = useTeamMembers({
    accessToken,
    teamId: selectedTeamId,
    enabled: !!selectedTeamId
  })

  if (selectedTeamId) {
    return (
      <div className="gba:h-full gba:p-6" data-testid={`${DATA_TEST_ID_PREFIX}-team-detail`}>
        <TeamPerformanceView
          accessToken={accessToken}
          userInfo={userInfo}
          teamId={selectedTeamId}
          teamName={selectedTeamName ?? 'Team'}
          teamMemberIds={selectedTeamMemberIds}
          membersLoading={selectedTeamMembersLoading}
          onBack={handleBackFromTeam}
        />
      </div>
    )
  }

  return (
    <div className="gba:h-full gba:p-6" data-testid={DATA_TEST_ID_PREFIX}>
      <Tabs
        value={activeTab}
        onValueChange={value => {
          if (value === 'comparison' || value === 'list') {
            handleTabChange(value)
          }
        }}
        className="gba:h-full"
        data-testid={`${DATA_TEST_ID_PREFIX}-tabs`}
      >
        <TabsList className="gba:mb-6">
          <TabsTrigger
            value="comparison"
            startIcon={<ChartBarIcon size={16} />}
            data-testid={`${DATA_TEST_ID_PREFIX}-tab-comparison`}
          >
            Comparison
          </TabsTrigger>
          <TabsTrigger
            value="list"
            startIcon={<ListBulletsIcon size={16} />}
            data-testid={`${DATA_TEST_ID_PREFIX}-tab-list`}
          >
            Team Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="gba:h-full gba:overflow-auto">
          <TeamComparisonView
            accessToken={accessToken}
            userInfo={userInfo}
            currencies={currencies}
            currenciesLoading={currenciesLoading}
            selectedTeamIds={selectedTeamIds}
            onTeamSelectionChange={onTeamSelectionChange}
            activeTeamIds={activeTeamIds}
            onActiveTeamIdsChange={onActiveTeamIdsChange}
            userTeamId={userTeamId}
          />
        </TabsContent>

        <TabsContent value="list" className="gba:h-full gba:overflow-auto">
          <TeamsListView
            accessToken={accessToken}
            userInfo={userInfo}
            currencies={currencies}
            currenciesLoading={currenciesLoading}
            onTeamSelect={handleTeamSelect}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default TeamsView
