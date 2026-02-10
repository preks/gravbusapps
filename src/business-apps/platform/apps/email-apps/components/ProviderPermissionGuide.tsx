/**
 * ProviderPermissionGuide - Displays permission requirements and setup
 * instructions for a specific email provider.
 */

import React from 'react'
import { Badge, Alert, AlertDescription } from '@newwork/nw-design-system'
import { Shield, Calendar, Mail, AlertCircle, ExternalLink } from 'lucide-react'
import type { ProviderGuide } from './permissionGuideConfig'

interface ProviderPermissionGuideProps {
  guide: ProviderGuide
  'data-testid'?: string
}

export const ProviderPermissionGuide: React.FC<ProviderPermissionGuideProps> = ({
  guide,
  'data-testid': testId = 'permission-guide'
}) => {
  return (
    <>
      {/* Required Permissions Guide */}
      <div className="gba:rounded-lg gba:border gba:p-4" data-testid={`${testId}-permissions`}>
        <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:mb-3 gba:flex gba:items-center gba:gap-2">
          <Shield className="gba:w-4 gba:h-4" />
          Required Permissions & Scopes
        </h3>
        <div className="gba:space-y-2">
          {guide.features.map(feature => (
            <div key={feature.name} className="gba:flex gba:items-start gba:gap-3 gba:p-2 gba:rounded gba:bg-muted/30">
              <div className="gba:mt-0.5">
                {feature.name.includes('Calendar') ? (
                  <Calendar className="gba:w-4 gba:h-4 gba:text-info" />
                ) : (
                  <Mail className="gba:w-4 gba:h-4 gba:text-primary" />
                )}
              </div>
              <div className="gba:flex-1">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">{feature.name}</span>
                  {feature.required ? (
                    <Badge variant="destructive" className="gba:text-[10px]">
                      Required
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gba:text-[10px]">
                      Optional
                    </Badge>
                  )}
                </div>
                <p className="gba:text-xs gba:text-muted-foreground">{feature.description}</p>
                {feature.scopes.length > 0 && (
                  <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-1">
                    {feature.scopes.map(scope => (
                      <Badge key={scope} variant="outline" className="gba:text-[10px] gba:font-mono">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Setup Instructions */}
      <Alert data-testid={`${testId}-instructions`}>
        <AlertCircle className="gba:w-4 gba:h-4" />
        <AlertDescription>
          <p className="gba:font-medium gba:mb-2">Setup Instructions:</p>
          <ol className="gba:text-xs gba:space-y-1 gba:list-decimal gba:pl-4">
            {guide.instructions.map((step, i) => (
              <li key={i}>{step.replace('{origin}', window.location.origin)}</li>
            ))}
          </ol>
          {guide.setupUrl && (
            <a
              href={guide.setupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gba:text-xs gba:text-primary gba:mt-2 gba:inline-flex gba:items-center gba:gap-1 hover:gba:underline"
              data-testid={`${testId}-setup-link`}
            >
              Open {guide.setupGuide} <ExternalLink className="gba:w-3 gba:h-3" />
            </a>
          )}
        </AlertDescription>
      </Alert>
    </>
  )
}
