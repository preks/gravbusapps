import React, { useCallback } from 'react'
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

export interface NewworkMainProps extends BusinessAppContextProps {
  'data-testid'?: string
}

/**
 * NewworkMain - THE ENTERPRISE AI umbrella landing page
 *
 * The apex of the NEWWORK platform, showcasing the three pillars:
 * - CREATE: Build anything - screens, flows, task experts, functions
 * - EVERY: Your productivity - AI assistant, documents, time, inbox
 * - BUSINESS APPS: Run your business - HR, CRM, expenses, services
 *
 * All unified by AI at the core of the enterprise platform.
 */
export const NewworkMain: React.FC<NewworkMainProps> = ({ 'data-testid': testId = 'newwork-main' }) => {
  // Three pillar definitions
  const pillars: Array<Omit<PillarCardProps, 'data-testid' | 'onClick'> & { id: string; href: string }> = [
    {
      id: 'create',
      title: 'CREATE',
      subtitle: 'Build anything',
      description:
        'Design screens, automate workflows, build AI task experts, and create serverless functions. The complete creation suite for enterprise applications.',
      icon: PenTool,
      href: '/platform/apps/create',
      features: ['AI Builder', 'Flow Designer', 'Task Experts', 'Functions'],
      accentColor: 'ai'
    },
    {
      id: 'every',
      title: 'EVERY',
      subtitle: 'Your productivity',
      description:
        'Your personal AI assistant, documents, time tracking, and unified inbox. Everything you need for a productive workday, powered by AI.',
      icon: Orbit,
      href: '/platform/every',
      features: ['EveryAI Assistant', 'MyDocuments', 'Time Tracking', 'EveryBox Inbox'],
      accentColor: 'success'
    },
    {
      id: 'business',
      title: 'BUSINESS APPS',
      subtitle: 'Run your business',
      description:
        'Professional business applications for every department. HR, CRM, finance, services, and more — all integrated and AI-enhanced.',
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
      {/* Hero Section with Neural Network Background - scrolls together */}
      <div className="gba:relative">
        {/* Neural Network Background - positioned absolute within hero, scrolls with content */}
        <EnterpriseNeuralBackground height="100%" />

        {/* Hero Content */}
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
            <p className="gba:text-muted-foreground gba:max-w-xl gba:mx-auto">
              Creation, productivity, and business operations — unified by AI
            </p>
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
            <span className="gba:font-bold gba:text-foreground">NEWWORK</span> — The Enterprise AI platform.
            <span className="gba:block gba:mt-1 gba:text-sm">Secure. Scalable. Intelligent.</span>
          </p>
        </div>
      </section>
    </div>
  )
}

export default NewworkMain
