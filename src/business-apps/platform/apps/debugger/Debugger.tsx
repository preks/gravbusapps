import React, { useEffect } from 'react'
import {
  PageLayout,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  Badge
} from '@newwork/nw-design-system'
import { BugIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import {
  AccessTokenSection,
  UserInfoSection,
  AdditionalDataSection,
  LocalStorageViewer,
  EmployeeInfoSection,
  PlatformContextViewer,
  GraphQLQueryExecutor,
  PlatformFunctionsTester
} from './components'
import { useUserRoles } from './hooks/useUserRoles'
import { useEmployeeData } from './hooks/useEmployeeData'

const PREFIX = 'Debugger'

const Debugger: React.FC<BusinessAppContextProps> = context => {
  const userRoles = useUserRoles(context.accessToken)
  const dataTestId = (suffix: string) => formatDataTestId(PREFIX, suffix)
  const userId = context.userInfo?.id
  const { employee } = useEmployeeData(context.accessToken, userId)

  // Set page title
  useEffect(() => {
    const originalTitle = document.title
    document.title = 'Platform Debugger'
    return () => {
      document.title = originalTitle
    }
  }, [])

  const handleFirePlatformEvent = () => {
    try {
      window.dispatchEvent(
        new CustomEvent('com.newwork.process.start', {
          detail: {
            domain: 'employee',
            processName: 'changeAddress',
            startProcessBody: {
              employeeId: context.userInfo?.id || ''
            },
            processInstanceId: 'a0fcfa90-d2c6-4eb1-bb1d-71770416f35b',
            callbacks: {
              onComplete: [
                {
                  methodName: 'refreshData'
                }
              ]
            }
          }
        })
      )
      alert('Platform event fired successfully!')
    } catch (error) {
      console.error('Failed to fire platform event:', error)
      alert('Failed to fire platform event: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleContinueFlow = () => {
    try {
      const employeeId = employee?.id || context.userInfo?.id || ''
      window.dispatchEvent(
        new CustomEvent('com.newwork.process.start', {
          detail: {
            domain: 'employee',
            processName: 'changeAddress',
            startProcessBody: {
              employeeId: employeeId
            },
            processInstanceId: 'a0fcfa90-d2c6-4eb1-bb1d-71770416f35b',
            callbacks: {
              onComplete: [
                {
                  methodName: 'refreshData'
                }
              ]
            }
          }
        })
      )
      alert('Continue Flow event fired successfully!')
    } catch (error) {
      console.error('Failed to fire continue flow event:', error)
      alert('Failed to fire continue flow event: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  return (
    <PageLayout
      headerIcon={BugIcon}
      headerTitle="Platform Debugger"
      headerDescription="Debug and inspect platform data, tokens, queries, and functions"
      className="gba:min-h-screen"
      data-testid={dataTestId('Page')}
    >
      <div className="gba:h-full gba:overflow-auto">
        <div className="gba:space-y-4" data-testid={dataTestId('MainContainer')}>
          {/* Greeting Section */}
          {context.userInfo?.givenName && (
            <Card>
              <CardContent>
                <div className="gba:text-lg">Hello, {context.userInfo.givenName}</div>
              </CardContent>
            </Card>
          )}

          {/* First row: Access Token (1 col) + User Info/Roles/Employee (2 cols) */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
            {/* Column 1: Access Token */}
            <AccessTokenSection accessToken={context.accessToken} />

            {/* Columns 2-3: User Info + User Roles + Employee Info (col-span-2) */}
            <div className="gba:md:col-span-2 gba:space-y-4">
              <UserInfoSection userInfo={context.userInfo} />

              {userRoles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>User Roles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="gba:flex gba:flex-wrap gba:gap-2">
                      {[...userRoles].sort().map((role, index) => (
                        <Badge key={`role-${index}`} variant="secondary">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <EmployeeInfoSection accessToken={context.accessToken} userId={userId} />
            </div>
          </div>

          {/* Second row: Additional Data + Local Storage */}
          <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-4">
            <AdditionalDataSection additionalData={context.additionalData} />
            <LocalStorageViewer />
          </div>

          {/* GraphQL Query Executor */}
          <GraphQLQueryExecutor accessToken={context.accessToken} />

          {/* Platform Functions Tester */}
          <PlatformFunctionsTester />

          {/* Platform Event Testing and Platform Details */}
          <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Platform Event Testing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:space-y-4">
                  <Alert>
                    <AlertTitle>Fire Platform Event</AlertTitle>
                    <AlertDescription>
                      This will fire a `com.newwork.process.start` event with sample data.
                    </AlertDescription>
                  </Alert>
                  <div className="gba:space-y-2">
                    <Button onClick={handleFirePlatformEvent}>Fire Platform Event</Button>
                    <Button onClick={handleContinueFlow}>Continue Flow</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:space-y-2 gba:text-sm">
                  <div>
                    <span className="gba:font-semibold">Hostname:</span>{' '}
                    {typeof window !== 'undefined' ? window.location.hostname : 'N/A'}
                  </div>
                  <div>
                    <span className="gba:font-semibold">Location Href:</span>{' '}
                    {typeof window !== 'undefined' ? window.location.href : 'N/A'}
                  </div>
                  <div>
                    <span className="gba:font-semibold">Page Title:</span>{' '}
                    {typeof document !== 'undefined' ? document.title : 'N/A'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Platform Context - moved to bottom */}
          <PlatformContextViewer />
        </div>
      </div>
    </PageLayout>
  )
}

export default Debugger
