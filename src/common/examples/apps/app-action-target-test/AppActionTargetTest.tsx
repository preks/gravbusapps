import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'

/**
 * AppAction Target Test
 * Tests app action form detection with multiple flow contexts (target1-target5)
 */
const AppActionTargetTest: React.FC<BusinessAppContextProps> = context => {
  const { accessToken } = context

  return (
    <div className="gba:p-8 gba:space-y-8">
      <div>
        <h1 className="gba:text-3xl gba:font-bold gba:mb-2">AppAction Target Test</h1>
        <p className="gba:text-muted-foreground">Testing app action form detection with multiple flow contexts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Target 1</CardTitle>
        </CardHeader>
        <CardContent>
          <AppAction
            accessToken={accessToken}
            variant="header"
            contexts={[{ context: 'target1', contextData: {} }]}
            data-testid="app-action-target1"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Target 2</CardTitle>
        </CardHeader>
        <CardContent>
          <AppAction
            accessToken={accessToken}
            variant="header"
            contexts={[{ context: 'target2', contextData: {} }]}
            data-testid="app-action-target2"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Target 3</CardTitle>
        </CardHeader>
        <CardContent>
          <AppAction
            accessToken={accessToken}
            variant="header"
            contexts={[{ context: 'target3', contextData: {} }]}
            data-testid="app-action-target3"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Target 4</CardTitle>
        </CardHeader>
        <CardContent>
          <AppAction
            accessToken={accessToken}
            variant="header"
            contexts={[{ context: 'target4', contextData: {} }]}
            data-testid="app-action-target4"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Target 5</CardTitle>
        </CardHeader>
        <CardContent>
          <AppAction
            accessToken={accessToken}
            variant="header"
            contexts={[{ context: 'target5', contextData: {} }]}
            data-testid="app-action-target5"
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default AppActionTargetTest
