import React, { useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'
import { PenTool, Orbit, Briefcase } from 'lucide-react'
import {
  HeroSection,
  EnterpriseNeuralBackground,
  PillarCard,
  AISearchCore,
  PlatformVisualization,
  PillarCardProps
} from './components'
import translations from './_i18n'

export interface NewworkMainProps extends BusinessAppContextProps {
  'data-testid'?: string
}

/**
 * NewworkMain - THE ENTERPRISE AI umbrella landing page
 *
 * The apex of the NEWWORK platform, showcasing the three pillars:
 * - CREATE: Build anything - screens, flows, task experts, functions
 * - EVERY: Your productivity - AI assistant, documents, time, inbox
 * - BUSINESS DOMAINS: Run your business - HR, CRM, expenses, services
 *
 * All unified by AI at the core of the enterprise platform.
 */
export const NewworkMain: React.FC<NewworkMainProps> = ({ 'data-testid': testId = 'newwork-main' }) => {
  const { t } = useTranslation(translations)
  // Three pillar definitions
  const pillars: Array<Omit<PillarCardProps, 'data-testid' | 'onClick'> & { id: string; href: string }> = [
    {
      id: 'create',
      title: t('pillar-create-title'),
      subtitle: t('pillar-create-subtitle'),
      description: t('pillar-create-description'),
      icon: PenTool,
      href: '/platform/apps/create',
      features: [
        t('pillar-create-feature-ai-development-platform'),
        'Flow Designer',
        t('pillar-create-feature-enterprise-agents'),
        'Functions'
      ],
      accentColor: 'ai'
    },
    {
      id: 'every',
      title: t('pillar-workplace-title'),
      subtitle: t('pillar-workplace-subtitle'),
      description: t('pillar-workplace-description'),
      icon: Orbit,
      href: '/platform/every',
      features: ['EveryAI Assistant', 'MyDocuments', 'Time Tracking', 'EveryBox Inbox'],
      accentColor: 'success'
    },
    {
      id: 'business',
      title: t('pillar-business-title'),
      subtitle: t('pillar-business-subtitle'),
      description: t('pillar-business-description'),
      icon: Briefcase,
      href: '/platform/business-apps',
      features: ['Human Resources', 'CRM & Sales', 'Finance & Expenses', 'Service Desk'],
      accentColor: 'info'
    }
  ]

  // Handle AI search
  const handleSearch = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase()

    // Keywords for routing to different pillars
    const createKeywords = [
      'create',
      'build',
      'screen',
      'flow',
      'workflow',
      'task expert',
      'enterprise agent',
      'agent',
      'function',
      'design',
      'automate'
    ]
    const everyKeywords = ['ai', 'assistant', 'document', 'time', 'inbox', 'chat', 'help', 'productivity', 'everyai']
    const businessKeywords = ['hr', 'employee', 'expense', 'crm', 'lead', 'sales', 'service', 'ticket', 'business']

    // Score each pillar
    const scores = {
      create: createKeywords.filter(k => lowerQuery.includes(k)).length,
      every: everyKeywords.filter(k => lowerQuery.includes(k)).length,
      business: businessKeywords.filter(k => lowerQuery.includes(k)).length
    }

    const maxScore = Math.max(...Object.values(scores))

    // Default to EveryAI for general queries
    let targetUrl = '/platform/every-ai'

    if (maxScore > 0) {
      if (scores.create === maxScore) {
        targetUrl = '/platform/apps/create'
      } else if (scores.every === maxScore) {
        targetUrl = '/platform/every'
      } else if (scores.business === maxScore) {
        targetUrl = '/platform/business-apps'
      }
    }

    // Store query for target app
    try {
      sessionStorage.setItem('newworkMainQuery', query)
    } catch {
      // Ignore storage errors
    }

    navigateTo(targetUrl)
  }, [])

  // Handle pillar card click
  const handlePillarClick = useCallback((href: string) => {
    navigateTo(href)
  }, [])

  return (
    <div className="gba:min-h-screen gba:bg-background" data-testid={testId}>
      {/* Hero Section with Neural Network Background */}
      <div className="gba:relative">
        <EnterpriseNeuralBackground height="100%" />
        <div className="gba:relative gba:z-10">
          <HeroSection data-testid={`${testId}-hero`} />
        </div>
      </div>

      {/* AI Search Core - solid background, no neural network */}
      <div className="gba:relative gba:bg-gradient-to-b gba:from-background gba:to-muted/30">
        <AISearchCore onSearch={handleSearch} data-testid={`${testId}-search`} />
      </div>

      {/* Three Pillars Section - clean background */}
      <section className="gba:py-8 gba:px-6 gba:bg-background" data-testid={`${testId}-pillars-section`}>
        <div className="gba:max-w-6xl gba:mx-auto">
          {/* Section header */}
          <div className="gba:text-center gba:mb-8">
            <h2 className="gba:text-2xl gba:sm:text-3xl gba:font-bold gba:text-foreground gba:mb-2">
              Three pillars. One platform.
            </h2>
            <p className="gba:text-muted-foreground gba:max-w-xl gba:mx-auto">{t('pillars-section-tagline')}</p>
          </div>

          {/* Pillar cards grid */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-6">
            {pillars.map((pillar, index) => (
              <PillarCard
                key={pillar.id}
                {...pillar}
                onClick={() => handlePillarClick(pillar.href)}
                data-testid={`${testId}-pillar-${pillar.id}`}
                animationDelay={0.1 * (index + 1)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Platform Visualization - has its own background */}
      <PlatformVisualization data-testid={`${testId}-visualization`} />

      {/* Footer tagline */}
      <section className="gba:py-8 gba:px-6 gba:border-t gba:border-border gba:bg-background">
        <div className="gba:max-w-4xl gba:mx-auto gba:text-center">
          <p className="gba:text-muted-foreground">
            {t('footer-platform-line')}
            <span className="gba:block gba:mt-1 gba:text-sm">{t('footer-platform-tagline')}</span>
          </p>
        </div>
      </section>
    </div>
  )
}

export default NewworkMain
