import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import { LocalizationExample } from '@/common/examples/apps/localization-example'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface LocalizationDebugProps extends BusinessAppContextProps {
  componentName?: string
  [key: string]: any // Allows any other props
}

export const LocalizationDebug: React.FC<LocalizationDebugProps> = props => {
  const { componentName, ...restProps } = props

  // Get build info if available
  const buildInfo =
    typeof globalThis !== 'undefined' && globalThis.__APP_BUILD_INFO__ ? globalThis.__APP_BUILD_INFO__ : null

  return (
    <div className="gba:p-6 gba:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Localization Debug {componentName ? `- ${componentName}` : ''}</CardTitle>
          <p className="gba:text-sm gba:text-muted-foreground">
            Debug screen demonstrating the LocalizationExample component
          </p>
        </CardHeader>
        <CardContent className="gba:space-y-6">
          {/* LocalizationExample Component */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-4">LocalizationExample Component</h3>
            <LocalizationExample {...restProps} />
          </div>

          {/* Props Debug Info */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-4">Debug Information</h3>
            <div className="gba:bg-muted gba:p-4 gba:rounded-lg">
              <h4 className="gba:font-medium gba:mb-2">Component Props:</h4>
              <pre className="gba:text-sm gba:overflow-auto">{JSON.stringify(props, null, 2)}</pre>
            </div>
          </div>

          {/* Build Info */}
          {buildInfo && (
            <div className="gba:border-t gba:pt-4">
              <div className="gba:text-right gba:text-sm gba:text-muted-foreground">
                Built: {new Date(buildInfo.publishTime).toLocaleString()} by {buildInfo.gitUser || 'N/A'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default LocalizationDebug
