import React, { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'
import { Users, Building2, Receipt, Headphones, TrendingUp, Package, Settings } from 'lucide-react'
import {
  HeroSection,
  DomainCard,
  BusinessSearch,
  OrbitBackground,
  BusinessAppsVisualization,
  DomainCardProps
} from './components'

export interface NewworkBusinessAppsProps extends BusinessAppContextProps {
  'data-testid'?: string
}

/**
 * NEWWORK Business Apps - Professional business solutions landing page
 *
 * Provides unified access to all NEWWORK business applications:
 * - HR (Human Resources)
 * - CRM (Customer Relationship Management)
 * - Expenses (Finance & Expense Management)
 * - Services (Service Desk & Support)
 * - IRM (Investment Relationship Management)
 * - MDM (Master Data Management)
 */
export const NewworkBusinessApps: React.FC<NewworkBusinessAppsProps> = ({
  'data-testid': testId = 'newwork-business-apps'
}) => {
  // Business domain definitions
  const domains: Array<Omit<DomainCardProps, 'data-testid'> & { id: string }> = [
    {
      id: 'hr',
      title: 'Human Resources',
      description: 'Employee management, time tracking, absences, and organizational structure.',
      icon: Users,
      href: '/platform/apps/hr/core/apps/my-portal',
      badge: 'Popular',
      badgeVariant: 'success',
      accentColor: 'info'
    },
    {
      id: 'crm',
      title: 'CRM',
      description: 'Manage leads, contacts, accounts, and opportunities. Track your sales pipeline.',
      icon: Building2,
      href: '/platform/crm/customer-relations',
      badge: 'Essential',
      badgeVariant: 'info',
      accentColor: 'primary'
    },
    {
      id: 'expenses',
      title: 'Expenses',
      description: 'Submit and manage expense requests. Track budgets and financial approvals.',
      icon: Receipt,
      href: '/platform/fin/expenses/personal-expenses',
      badge: 'Finance',
      badgeVariant: 'success',
      accentColor: 'success'
    },
    {
      id: 'services',
      title: 'Services',
      description: 'Service desk and support ticketing. Manage customer and internal requests.',
      icon: Headphones,
      href: '/platform/sales-demo/service-desk',
      badge: 'Support',
      badgeVariant: 'warning',
      accentColor: 'warning'
    },
    {
      id: 'irm',
      title: 'IRM',
      description: 'Investment relationship management. Track portfolios and investor relations.',
      icon: TrendingUp,
      href: '/platform/irm/investment-relations',
      badge: 'Investments',
      badgeVariant: 'info',
      accentColor: 'ai'
    },
    {
      id: 'mdm',
      title: 'Master Data',
      description: 'Manage catalogs, reference data, and enterprise master data.',
      icon: Package,
      href: '/platform/mdm/pipeline-data',
      badge: 'Data',
      badgeVariant: 'default',
      accentColor: 'primary'
    },
    {
      id: 'admin',
      title: 'Administration',
      description: 'System settings, user management, and platform configuration.',
      icon: Settings,
      href: '/platform/apps/launcher-manager',
      badge: 'Admin',
      badgeVariant: 'offline',
      accentColor: 'offline',
      isComingSoon: true
    }
  ]

  // Handle search submission
  const handleSearch = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase()

    // Keywords for different domains
    const hrKeywords = [
      'employee',
      'hr',
      'human resources',
      'time off',
      'absence',
      'vacation',
      'leave',
      'payroll',
      'benefits',
      'onboarding'
    ]
    const crmKeywords = ['lead', 'contact', 'account', 'opportunity', 'sales', 'customer', 'crm', 'pipeline', 'deal']
    const expenseKeywords = ['expense', 'budget', 'finance', 'receipt', 'reimburse', 'cost', 'invoice', 'payment']
    const serviceKeywords = ['service', 'ticket', 'support', 'help desk', 'request', 'incident', 'issue']
    const irmKeywords = ['investment', 'portfolio', 'investor', 'irm', 'fund', 'asset', 'wealth']
    const mdmKeywords = ['catalog', 'master data', 'reference', 'mdm', 'data management']

    // Score each domain
    const scores = {
      hr: hrKeywords.filter(k => lowerQuery.includes(k)).length,
      crm: crmKeywords.filter(k => lowerQuery.includes(k)).length,
      expenses: expenseKeywords.filter(k => lowerQuery.includes(k)).length,
      services: serviceKeywords.filter(k => lowerQuery.includes(k)).length,
      irm: irmKeywords.filter(k => lowerQuery.includes(k)).length,
      mdm: mdmKeywords.filter(k => lowerQuery.includes(k)).length
    }

    const maxScore = Math.max(...Object.values(scores))

    // Default to CRM
    let targetUrl = '/platform/crm/customer-launcher'

    if (maxScore > 0) {
      if (scores.hr === maxScore) {
        targetUrl = '/platform/apps/hr/core/apps/my-portal'
      } else if (scores.crm === maxScore) {
        targetUrl = '/platform/crm/customer-relations'
      } else if (scores.expenses === maxScore) {
        targetUrl = '/platform/fin/expenses/personal-expenses'
      } else if (scores.services === maxScore) {
        targetUrl = '/platform/sales-demo/service-desk'
      } else if (scores.irm === maxScore) {
        targetUrl = '/platform/irm/investment-relations'
      } else if (scores.mdm === maxScore) {
        targetUrl = '/platform/mdm/pipeline-data'
      }
    }

    // Store query for target app
    try {
      sessionStorage.setItem('businessAppsQuery', query)
    } catch {
      // Ignore storage errors
    }

    navigateTo(targetUrl)
  }, [])

  // Handle domain card click
  const handleDomainClick = useCallback((href: string) => {
    navigateTo(href)
  }, [])

  return (
    <div className="gba:min-h-screen gba:bg-background gba:relative" data-testid={testId}>
      {/* Orbit Background - Professional blue atmosphere */}
      <div className="gba:fixed gba:inset-0 gba:pointer-events-none gba:z-0 gba:overflow-hidden">
        <OrbitBackground />
      </div>

      {/* Content layer */}
      <div className="gba:relative gba:z-10">
        {/* Hero Section */}
        <HeroSection data-testid={`${testId}-hero`} />

        {/* AI-Powered Search Section */}
        <BusinessSearch onSearch={handleSearch} data-testid={`${testId}-search`} />

        {/* Domains Grid Section */}
        <section className="gba:py-6 gba:px-6 gba:relative" data-testid={`${testId}-domains-section`}>
          {/* Background */}
          <div className="gba:absolute gba:inset-0 gba:bg-background" />

          <div className="gba:relative gba:max-w-7xl gba:mx-auto">
            {/* Section header */}
            <div className="gba:text-center gba:mb-6">
              <h2 className="gba:text-2xl gba:sm:text-3xl gba:font-bold gba:text-foreground gba:mb-2">
                Business domains
              </h2>
              <p className="gba:text-muted-foreground gba:max-w-xl gba:mx-auto">
                Professional applications for every department, all integrated and AI-enhanced
              </p>
            </div>

            {/* All 7 domains in one row */}
            <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-7 gba:gap-3">
              {domains.map((domain, index) => (
                <DomainCard
                  key={domain.id}
                  {...domain}
                  onClick={() => handleDomainClick(domain.href)}
                  data-testid={`${testId}-domain-${domain.id}`}
                  animationDelay={0.1 * (index + 1)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Business Apps Visualization Section */}
        <BusinessAppsVisualization data-testid={`${testId}-visualization`} />

        {/* Footer tagline */}
        <section className="gba:py-6 gba:px-6 gba:border-t gba:border-border gba:relative">
          <div className="gba:absolute gba:inset-0 gba:bg-background" />
          <div className="gba:relative gba:max-w-4xl gba:mx-auto gba:text-center">
            <p className="gba:text-muted-foreground">
              Part of the <span className="gba:font-semibold gba:text-foreground">NEWWORK</span> platform. Professional
              tools for modern business.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default NewworkBusinessApps
