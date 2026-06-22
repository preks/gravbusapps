import React, { useCallback, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'
import {
  Users,
  TrendingUp,
  Headphones,
  DollarSign,
  Package,
  Presentation,
  Database,
  Gift,
  Settings
} from 'lucide-react'
import {
  HeroSection,
  DomainCard,
  BusinessSearch,
  OrbitBackground,
  BusinessAppsVisualization,
  DomainCardProps
} from './components'
import translations from './_i18n'

export interface NewworkBusinessAppsProps extends BusinessAppContextProps {
  'data-testid'?: string
}

/**
 * NEWWORK Business Domains - Professional business solutions landing page
 *
 * Provides unified access to all NEWWORK business domains:
 * - HR+ (Human Resources)
 * - Sales+ (Customer Relationship Management)
 * - Service+ (Service Desk & Support)
 * - Finance+ (Finance & Expense Management)
 * - ERP (Enterprise Resource Planning)
 * - Board Room (Executive Hub, Board Room View, etc.)
 * - Masterdata (Master Data Management)
 * - Value Packs (Expenses, Investment Relationship, etc.)
 * - System Management (Settings, Live Monitors, etc.)
 */
export const NewworkBusinessApps: React.FC<NewworkBusinessAppsProps> = ({
  'data-testid': testId = 'newwork-business-domains'
}) => {
  const { t } = useTranslation(translations)

  const domains: Array<Omit<DomainCardProps, 'data-testid'> & { id: string }> = useMemo(
    () => [
      {
        id: 'hr-plus',
        title: 'HR+',
        description: 'Employee management, time tracking, absences, and organizational structure.',
        icon: Users,
        href: '/platform/hr/hr-launcher',
        badge: 'Popular',
        badgeVariant: 'success',
        accentColor: 'info'
      },
      {
        id: 'sales-plus',
        title: 'Sales+',
        description: 'Manage leads, contacts, accounts, and opportunities. Track your sales pipeline.',
        icon: TrendingUp,
        href: '/platform/crm/customer-relations',
        badge: 'Essential',
        badgeVariant: 'info',
        accentColor: 'primary'
      },
      {
        id: 'service-plus',
        title: 'Service+',
        description: 'Service desk and support ticketing. Manage customer and internal requests.',
        icon: Headphones,
        href: '/platform/sales-demo/service-desk',
        badge: 'Support',
        badgeVariant: 'warning',
        accentColor: 'warning'
      },
      {
        id: 'finance-plus',
        title: 'Finance+',
        description: 'Financial management, budgets, invoices, and financial approvals.',
        icon: DollarSign,
        href: '/platform/fin/expenses/personal-expenses',
        badge: 'Finance',
        badgeVariant: 'success',
        accentColor: 'success'
      },
      {
        id: 'erp',
        title: 'ERP',
        description: 'Enterprise resource planning. Integrated business processes and operations.',
        icon: Package,
        href: '/platform/apps/launcher-manager',
        badge: 'Enterprise',
        badgeVariant: 'info',
        accentColor: 'ai',
        isComingSoon: true
      },
      {
        id: 'board-room',
        title: 'Board Room',
        description: 'Executive Hub, Board Room View, and strategic business intelligence.',
        icon: Presentation,
        href: '/platform/apps/launcher-manager',
        badge: 'Executive',
        badgeVariant: 'info',
        accentColor: 'primary',
        isComingSoon: true
      },
      {
        id: 'masterdata',
        title: 'Masterdata',
        description: 'Manage catalogs, reference data, and enterprise master data.',
        icon: Database,
        href: '/platform/mdm/pipeline-data',
        badge: 'Data',
        badgeVariant: 'default',
        accentColor: 'info'
      },
      {
        id: 'value-packs',
        title: t('domain-value-packs-title'),
        description: 'Expenses, Investment Relationship, and additional business solutions.',
        icon: Gift,
        href: '/platform/fin/expenses/personal-expenses',
        badge: 'Packages',
        badgeVariant: 'success',
        accentColor: 'success'
      },
      {
        id: 'system-management',
        title: 'System Management',
        description: 'Settings, Live Monitors, and platform configuration.',
        icon: Settings,
        href: '/platform/apps/launcher-manager',
        badge: 'System',
        badgeVariant: 'offline',
        accentColor: 'offline'
      }
    ],
    [t]
  )

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
    const salesKeywords = ['lead', 'contact', 'account', 'opportunity', 'sales', 'customer', 'crm', 'pipeline', 'deal']
    const financeKeywords = ['expense', 'budget', 'finance', 'receipt', 'reimburse', 'cost', 'invoice', 'payment']
    const serviceKeywords = ['service', 'ticket', 'support', 'help desk', 'request', 'incident', 'issue']
    const erpKeywords = ['erp', 'enterprise', 'resource planning', 'operations', 'business process']
    const boardRoomKeywords = ['board', 'executive', 'strategy', 'intelligence', 'dashboard', 'report']
    const masterdataKeywords = ['catalog', 'master data', 'reference', 'mdm', 'data management']
    const valuePacksKeywords = ['value pack', 'investment', 'portfolio', 'investor', 'irm', 'fund', 'asset']
    const systemKeywords = ['system', 'settings', 'monitor', 'configuration', 'admin', 'management']

    // Score each domain
    const scores = {
      hr: hrKeywords.filter(k => lowerQuery.includes(k)).length,
      sales: salesKeywords.filter(k => lowerQuery.includes(k)).length,
      finance: financeKeywords.filter(k => lowerQuery.includes(k)).length,
      service: serviceKeywords.filter(k => lowerQuery.includes(k)).length,
      erp: erpKeywords.filter(k => lowerQuery.includes(k)).length,
      boardRoom: boardRoomKeywords.filter(k => lowerQuery.includes(k)).length,
      masterdata: masterdataKeywords.filter(k => lowerQuery.includes(k)).length,
      valuePacks: valuePacksKeywords.filter(k => lowerQuery.includes(k)).length,
      system: systemKeywords.filter(k => lowerQuery.includes(k)).length
    }

    const maxScore = Math.max(...Object.values(scores))

    // Default to Sales+
    let targetUrl = '/platform/crm/customer-launcher'

    if (maxScore > 0) {
      if (scores.hr === maxScore) {
        targetUrl = '/platform/hr/hr-launcher'
      } else if (scores.sales === maxScore) {
        targetUrl = '/platform/crm/customer-relations'
      } else if (scores.finance === maxScore) {
        targetUrl = '/platform/fin/expenses/personal-expenses'
      } else if (scores.service === maxScore) {
        targetUrl = '/platform/sales-demo/service-desk'
      } else if (scores.masterdata === maxScore) {
        targetUrl = '/platform/mdm/pipeline-data'
      } else if (scores.valuePacks === maxScore) {
        targetUrl = '/platform/fin/expenses/personal-expenses'
      } else if (scores.system === maxScore) {
        targetUrl = '/platform/apps/launcher-manager'
      }
      // ERP and Board Room are coming soon, so no navigation
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
                {t('domains-section-title')}
              </h2>
              <p className="gba:text-muted-foreground gba:max-w-xl gba:mx-auto">{t('domains-section-subtitle')}</p>
            </div>

            {/* All 9 domains in grid */}
            <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:xl:grid-cols-5 gba:gap-3">
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

        {/* Business Domains Visualization Section */}
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
