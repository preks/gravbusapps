import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'

/**
 * TODO: Implement settings for commit templates
 * This will be redesigned in the Crowdin-inspired UI
 */
const SettingsPanel: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Einstellungen</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="gba:text-sm gba:text-muted-foreground">
          Commit- und PR-Konfiguration wird im Redesign hinzugefügt.
        </p>
      </CardContent>
    </Card>
  )
}

export default SettingsPanel
