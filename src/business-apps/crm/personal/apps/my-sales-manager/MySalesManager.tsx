import React, { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  PageLayout,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@newwork/nw-design-system'
import { BriefcaseIcon, PlusIcon, CaretDownIcon, NotePencilIcon, CheckSquareIcon } from '@phosphor-icons/react'
import { MODULE_COLORS } from '@/common/constants/ui'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { OverviewView } from './components/overview/OverviewView'
import { MyActivitiesView } from './components/my-activities/MyActivitiesView'
import { MyTasksView } from './components/my-tasks/MyTasksView'

export type MySalesManagerProps = BusinessAppContextProps

export const MySalesManager: React.FC<MySalesManagerProps> = ({ accessToken, userInfo, additionalData }) => {
  const [activeView, setActiveView] = useState<'overview' | 'activities' | 'tasks'>('overview')
  const moduleColor = MODULE_COLORS.CRM
  const employeeId = userInfo?.employeeDetails?.employeeId || userInfo?.id || ''

  return (
    <div data-testid="my-sales-manager-container">
      <PageLayout
        headerIcon={BriefcaseIcon}
        headerTitle="My Sales Manager"
        headerDescription="Your personal sales workspace"
        variant={moduleColor}
        className="gba:min-h-screen"
      >
        <Tabs
          value={activeView}
          onValueChange={value => setActiveView(value as 'overview' | 'activities' | 'tasks')}
          data-testid="my-sales-manager-tabs"
        >
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
            <TabsList>
              <TabsTrigger value="overview" data-testid="my-sales-manager-overview-tab">
                Overview
              </TabsTrigger>
              <TabsTrigger value="activities" data-testid="my-sales-manager-activities-tab">
                My Activities
              </TabsTrigger>
              <TabsTrigger value="tasks" data-testid="my-sales-manager-tasks-tab">
                My Tasks
              </TabsTrigger>
            </TabsList>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="default" data-testid="my-sales-manager-create-button">
                  <PlusIcon size={16} />
                  Create
                  <CaretDownIcon size={16} className="gba:ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" data-testid="my-sales-manager-create-menu">
                <AppAction
                  contextsArray={[FlowContextName.customerActivityCreate]}
                  externalContextData={{
                    ownerEmployeeId: employeeId,
                    allowUnlinkedActivity: true, // Allow activities without parent entity
                    ...(userInfo?.id && {
                      employeeId: userInfo.id,
                      userId: userInfo.id,
                      employeeDetails: { userId: userInfo.id }
                    })
                  }}
                  prefixDataTestId="my-sales-manager-log-activity"
                  accessToken={accessToken}
                  emptyStateBehavior="hide"
                >
                  <DropdownMenuItem
                    onSelect={e => e.preventDefault()}
                    data-testid="my-sales-manager-log-activity-option"
                  >
                    <NotePencilIcon size={16} className="gba:mr-2" />
                    Log Activity
                  </DropdownMenuItem>
                </AppAction>
                <AppAction
                  contextsArray={[FlowContextName.customerTaskCreate]}
                  externalContextData={{
                    allowUnlinkedTask: true, // Allow tasks without parent entity
                    ...(userInfo?.id && {
                      employeeId: userInfo.id,
                      userId: userInfo.id,
                      employeeDetails: { userId: userInfo.id }
                    })
                  }}
                  prefixDataTestId="my-sales-manager-create-task"
                  accessToken={accessToken}
                  emptyStateBehavior="hide"
                >
                  <DropdownMenuItem
                    onSelect={e => e.preventDefault()}
                    data-testid="my-sales-manager-create-task-option"
                  >
                    <CheckSquareIcon size={16} className="gba:mr-2" />
                    Create Task
                  </DropdownMenuItem>
                </AppAction>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <TabsContent value="overview">
            <OverviewView accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
          </TabsContent>

          <TabsContent value="activities">
            <MyActivitiesView accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
          </TabsContent>

          <TabsContent value="tasks">
            <MyTasksView accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
          </TabsContent>
        </Tabs>
      </PageLayout>
    </div>
  )
}

export default MySalesManager
