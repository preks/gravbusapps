import React, { useMemo, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { CreateHeroHeader } from '@/business-apps/core/create/components/CreateHeroHeader'
import { Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger, Toaster, toast } from '@newwork/nw-design-system'
import { Play } from 'lucide-react'
import { FlowLibraryTab } from './components/FlowLibraryTab'
import { MyLaunchesTab } from './components/MyLaunchesTab'
import { FlowLaunchSheet } from './components/FlowLaunchSheet'

interface FlowLauncherProps extends BusinessAppContextProps {
  'data-testid'?: string
}

export const FlowLauncher: React.FC<FlowLauncherProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'flow-launcher'
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'my-launches'>('library')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [launchTemplateId, setLaunchTemplateId] = useState<string | null>(null)
  const [launchOpen, setLaunchOpen] = useState(false)

  const heroTitle = getTranslationFromI18nKeyAndLabel('flow.launcher.title', 'Flow launcher')
  const heroDescription = getTranslationFromI18nKeyAndLabel(
    'flow.launcher.description',
    'Browse grouped flow templates and launch manual flows in a dialog.'
  )

  const heroBadges = useMemo(() => {
    if (activeTab === 'my-launches') {
      return [{ label: 'My launches', variant: 'secondary' as const, 'data-testid': `${testId}-badge-my-launches` }]
    }
    if (selectedCategoryId) {
      return [{ label: 'Library', variant: 'secondary' as const, 'data-testid': `${testId}-badge-library` }]
    }
    return [{ label: 'Library', variant: 'secondary' as const, 'data-testid': `${testId}-badge-library` }]
  }, [activeTab, selectedCategoryId, testId])

  const handleStartTemplate = (templateId: string) => {
    if (!accessToken) {
      toast.error('Access token missing', { description: 'You must be authenticated to launch flows.' })
      return
    }
    setLaunchTemplateId(templateId)
    setLaunchOpen(true)
  }

  const handleViewTemplateDetails = (templateId: string) => {
    toast.info('Not launchable here', {
      description: `Template ${templateId} does not have a manual start trigger.`
    })
  }

  return (
    <div className="gba:min-h-screen gba:bg-muted" data-testid={testId}>
      <Toaster />

      <CreateHeroHeader
        icon={Play}
        appLabel={getTranslationFromI18nKeyAndLabel('flow.launcher.eyebrow', 'Flow')}
        title={heroTitle}
        description={heroDescription}
        onBack={activeTab === 'library' && selectedCategoryId ? () => setSelectedCategoryId(null) : undefined}
        badges={heroBadges}
        data-testid={`${testId}-hero`}
      />

      <div className="gba:px-6 gba:py-6 gba:flex gba:flex-col gba:gap-4" data-testid={`${testId}-content`}>
        <Card className="gba:bg-background gba:border gba:border-border">
          <CardContent className="gba:p-4 gba:flex gba:flex-col gba:gap-4">
            <Tabs value={activeTab} onValueChange={val => setActiveTab(val as any)} data-testid={`${testId}-tabs`}>
              <TabsList>
                <TabsTrigger value="library" data-testid={`${testId}-tab-library`}>
                  Library
                </TabsTrigger>
                <TabsTrigger value="my-launches" data-testid={`${testId}-tab-my-launches`}>
                  My launches
                </TabsTrigger>
              </TabsList>

              <TabsContent value="library" data-testid={`${testId}-tab-content-library`}>
                <FlowLibraryTab
                  accessToken={accessToken}
                  userInfo={userInfo}
                  selectedCategoryId={selectedCategoryId}
                  onCategorySelect={categoryId => setSelectedCategoryId(categoryId || null)}
                  onStartTemplate={handleStartTemplate}
                  onViewTemplateDetails={handleViewTemplateDetails}
                  data-testid={`${testId}-library`}
                />
              </TabsContent>

              <TabsContent value="my-launches" data-testid={`${testId}-tab-content-my-launches`}>
                <MyLaunchesTab accessToken={accessToken} userInfo={userInfo} data-testid={`${testId}-my-launches`} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <FlowLaunchSheet
        open={launchOpen}
        onOpenChange={open => setLaunchOpen(open)}
        accessToken={accessToken}
        userInfo={userInfo}
        templateId={launchTemplateId}
        data-testid={`${testId}-launch-sheet`}
      />
    </div>
  )
}

export default FlowLauncher
