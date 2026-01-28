import React from 'react'
import { PageHeader, TabSwitch, TabSwitchList, TabSwitchTrigger, TabSwitchContent } from '@newwork/nw-design-system'
import { cn } from '@/common/utils/cn'

export interface ConfigurationView {
  value: string
  label: string
  icon?: React.ReactNode
  content: React.ReactNode
}

export interface ConfigurationLayoutProps {
  headerAvatar?: React.ReactNode
  headerTitle: string
  headerDescription?: string
  headerActions?: React.ReactNode
  onBack?: () => void
  views?: ConfigurationView[]
  currentView?: string
  defaultView?: string
  onViewChange?: (value: string) => void
  className?: string
  'data-testid'?: string
}

/**
 * ConfigurationLayout
 *
 * Layout component for configuration/management pages.
 * Combines PageHeader with TabSwitch views in the footer (similar to RecordLayout).
 * Provides flexible content rendering for each view.
 */
export const ConfigurationLayout: React.FC<ConfigurationLayoutProps> = ({
  headerAvatar,
  headerTitle,
  headerDescription,
  headerActions,
  onBack,
  views = [],
  currentView,
  defaultView,
  onViewChange,
  className,
  'data-testid': dataTestId
}) => {
  // Multiple views - use TabSwitch with footer
  return (
    <div
      className={cn('gba:flex gba:flex-col gba:min-h-full gba:w-full gba:overflow-x-hidden', className)}
      data-testid={dataTestId}
    >
      <TabSwitch
        {...(currentView === undefined ? {} : { value: currentView })}
        defaultValue={defaultView ?? views[0]?.value}
        onValueChange={onViewChange}
        className="gba:flex gba:flex-col gba:flex-1"
      >
        <PageHeader
          avatar={headerAvatar}
          title={headerTitle}
          subtitle={headerDescription}
          extra={headerActions}
          onBack={onBack}
          footer={
            views.length > 1 ? (
              <div>
                <TabSwitchList>
                  {views.map(view => (
                    <TabSwitchTrigger
                      key={view.value}
                      value={view.value}
                      startIcon={view.icon}
                      data-testid={`${dataTestId}-view-${view.value}`}
                    >
                      {view.label}
                    </TabSwitchTrigger>
                  ))}
                </TabSwitchList>
              </div>
            ) : undefined
          }
        />

        <div className="gba:flex-1 gba:min-h-0 gba:min-w-0" data-testid={`${dataTestId}-content`}>
          {views.map(view => (
            <TabSwitchContent
              key={view.value}
              value={view.value}
              className="gba:h-full gba:w-full gba:max-w-full gba:px-4 gba:md:px-8"
            >
              {view.content}
            </TabSwitchContent>
          ))}
        </div>
      </TabSwitch>
    </div>
  )
}

ConfigurationLayout.displayName = 'ConfigurationLayout'

export default ConfigurationLayout
