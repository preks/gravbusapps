import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Alert } from '@newwork/nw-design-system'
import { usePlatformFunctions } from '../hooks/usePlatformFunctions'
import { JsonViewer } from './JsonViewer'

export const PlatformFunctionsTester: React.FC = () => {
  const {
    results,
    testTranslation,
    testFormatDate,
    testFormatNumber,
    testUseFeature,
    testGetPlatformContext,
    testGetActiveStructureId,
    testEnv,
    testGetActiveUserLocale,
    testWindowLocation,
    testDocumentTitle
  } = usePlatformFunctions()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Functions Tester</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-3 lg:gba:grid-cols-4 gba:gap-2">
            <Button variant="outline" size="sm" onClick={testTranslation}>
              Test Translation
            </Button>
            <Button variant="outline" size="sm" onClick={testFormatDate}>
              Test formatDate()
            </Button>
            <Button variant="outline" size="sm" onClick={testFormatNumber}>
              Test formatNumber()
            </Button>
            <Button variant="outline" size="sm" onClick={testUseFeature}>
              Test useFeature()
            </Button>
            <Button variant="outline" size="sm" onClick={testGetPlatformContext}>
              Test getPlatformContext()
            </Button>
            <Button variant="outline" size="sm" onClick={testGetActiveStructureId}>
              Test getActiveStructureId()
            </Button>
            <Button variant="outline" size="sm" onClick={testEnv}>
              Test env()
            </Button>
            <Button variant="outline" size="sm" onClick={testGetActiveUserLocale}>
              Test getActiveUserLocale()
            </Button>
            <Button variant="outline" size="sm" onClick={testWindowLocation}>
              Test window.location
            </Button>
            <Button variant="outline" size="sm" onClick={testDocumentTitle}>
              Test document.title
            </Button>
          </div>

          {Object.keys(results).length > 0 && (
            <div className="gba:space-y-2">
              <div className="gba:font-semibold">Results:</div>
              {Object.values(results).map(result => (
                <div key={result.name} className="gba:space-y-1">
                  <div className="gba:font-medium gba:text-sm">{result.name}:</div>
                  {result.error ? (
                    <Alert variant="destructive">
                      <div className="gba:text-sm">{result.error}</div>
                    </Alert>
                  ) : (
                    <JsonViewer data={result.value} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
