import React from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { SparkleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background'

interface HeroBackgroundPreviewProps extends BusinessAppContextProps {
  'data-testid'?: string
}

export const HeroBackgroundPreview: React.FC<HeroBackgroundPreviewProps> = ({
  'data-testid': testId = 'hero-bg-preview'
}) => {
  return (
    <div className="gba:h-full gba:w-full gba:bg-background" data-testid={testId}>
      <PageLayout
        headerPhosphorIcon={{ icon: SparkleIcon, variant: 'ext3' as any, size: 'lg', label: 'Hero Background' }}
        headerTitle="Hero Background"
      >
        <div className="gba:container gba:mx-auto gba:py-6">
          <div className="gba:relative gba:overflow-hidden gba:w-full gba:aspect-video gba:rounded-xl">
            <PremiumHeroBackground data-testid={`${testId}-background`} />
          </div>
        </div>
      </PageLayout>
    </div>
  )
}

export default HeroBackgroundPreview
