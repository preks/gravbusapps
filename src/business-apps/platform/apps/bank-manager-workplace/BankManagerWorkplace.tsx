/**
 * Bank Manager Digital Workplace ("Digitaler Arbeitsplatz")
 * 
 * A comprehensive dashboard for Sparkasse bank branch managers featuring:
 * - AI-powered search and command palette
 * - Real-time team management
 * - Banking-specific approvals workflow
 * - Customer relationship management
 * - Performance metrics and insights
 */

'use client'

import React, { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PageLayout } from '@newwork/nw-design-system'
import { AISearchBar } from './components/AISearchBar'
import { TeamWidget } from './components/TeamWidget'
import { TeamComplianceWidget } from './components/TeamComplianceWidget'
import { AIAssistantPanel } from './components/AIAssistantPanel'
import { ActivityFeed } from './components/ActivityFeed'
import { ApprovalModal } from './components/ApprovalModal'
import { FullPageCalendar } from './components/FullPageCalendar'
import { BankingApproval } from './types/banking.types'
import { usePendingApprovals } from './hooks/usePendingApprovals'
import { useVIPCustomers } from './hooks/useVIPCustomers'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Badge,
  Button,
  Skeleton
} from '@newwork/nw-design-system'
import {
  House,
  Users,
  CheckCircle,
  XCircle,
  TrendUp,
  Briefcase,
  ChartLineUp,
  ChartBar,
  FileText,
  Clock,
  Sparkle,
  Calendar,
  CurrencyCircleDollar
} from '@phosphor-icons/react'
import { formatCurrency, formatPercent, getTimeAgo, getPriorityVariant } from './utils/formatters'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

export interface BankManagerWorkplaceProps extends BusinessAppContextProps {}

const moduleColor = '#667eea' // Purple for AI/Platform theme

export const BankManagerWorkplace: React.FC<BankManagerWorkplaceProps> = (context: BusinessAppContextProps) => {
  // Real data hooks
  const { approvals, isLoading: approvalsLoading } = usePendingApprovals(context)
  const { vipCustomers, isLoading: customersLoading } = useVIPCustomers(context)
  
  // Modal state
  const [selectedApproval, setSelectedApproval] = useState<BankingApproval | null>(null)
  
  // Track processed approvals (approved/rejected)
  const [processedApprovals, setProcessedApprovals] = useState<Record<string, { status: 'approved' | 'rejected'; comments?: string }>>({})


  // Placeholder for opening chat with pre-filled message
  const handleOpenChat = (message: string) => {
    console.log('Open chat with message:', message)
    window.dispatchEvent(
      new CustomEvent('open-ai-chat', {
        detail: { message }
      })
    )
  }

  // Navigate to account - simple navigation like CRM Account List
  const handleNavigateToAccount = (customer: any) => {
    const url = buildPlatformUrl('/platform/crm/account-record', { 
      accountId: customer.id,
      source: 'customer-relations'
    })
    navigateTo(url)
  }

  // Approval handlers
  const handleApprove = (approvalId: string, comments?: string) => {
    const approval = approvals.find(a => a.id === approvalId)
    if (!approval) return
    
    // Mark as approved in local state
    setProcessedApprovals(prev => ({
      ...prev,
      [approvalId]: { status: 'approved', comments }
    }))
    
    // TODO: Call actual approval API
    // await customFlowEngineClient.completeTask(approvalId, { decision: 'approve', comments })
  }

  const handleReject = (approvalId: string, reason: string) => {
    const approval = approvals.find(a => a.id === approvalId)
    if (!approval) return
    
    // Mark as rejected in local state
    setProcessedApprovals(prev => ({
      ...prev,
      [approvalId]: { status: 'rejected', comments: reason }
    }))
    
    // TODO: Call actual rejection API
    // await customFlowEngineClient.completeTask(approvalId, { decision: 'reject', reason })
  }

  // Navigation state - stays within this app
  const [activeView, setActiveView] = useState<'dashboard' | 'team' | 'approvals' | 'customers' | 'calendar' | 'analytics'>('dashboard')

  // External navigation handlers (for quick actions)
  const handleNavigateToManagerExpenses = () => {
    navigateTo('/platform/fin/expenses/manager-expenses')
  }

  const handleNavigateToAbsences = () => {
    // Navigate to manager absences (for approvals) or team absences overview
    navigateTo('/platform/hr/absences/manager-absences')
  }

  const handleNavigateToCustomers = () => {
    navigateTo('/platform/crm/customer-relations?view=accounts')
  }

  const handleNavigateToOpportunities = () => {
    navigateTo('/platform/crm/customer-relations?view=opportunities')
  }

  // Mock data for demo (clearly labeled with Badge)
  const mockBankingKPIs = {
    dailyDeposits: 1245000,
    dailyWithdrawals: 876000,
    customerSatisfaction: 94.5,
    branchPerformance: 87,
    complianceScore: 98
  }

  // View options for navigation menu - stays within this dashboard
  const viewOptions = [
    {
      key: 'dashboard',
      icon: <House />,
      label: 'Dashboard'
    },
    {
      key: 'team',
      icon: <Users />,
      label: 'Mein Team'
    },
    {
      key: 'approvals',
      icon: <CheckCircle />,
      label: 'Genehmigungen'
    },
    {
      key: 'customers',
      icon: <Briefcase />,
      label: 'VIP-Kunden'
    },
    {
      key: 'calendar',
      icon: <Calendar />,
      label: 'Kalender'
    },
    {
      key: 'analytics',
      icon: <ChartBar />,
      label: 'Analytics'
    }
  ]

  return (
    <PageLayout
          headerPhosphorIcon={{
            icon: House,
            variant: '#8B5CF6',
            size: 'lg',
            label: 'Digitaler Arbeitsplatz'
          }}
          headerTitle="Digitaler Arbeitsplatz"
          headerDescription={`Guten Tag, ${context.userInfo?.employeeDetails?.firstName || 'Manager'}! Willkommen in Ihrer Filiale Hauptstraße`}
          headerSubViews={{
            value: activeView,
            onValueChange: (value: string) => setActiveView(value as typeof activeView),
            items: viewOptions.map(option => ({
              value: option.key,
              label: option.label,
              icon: option.icon
            }))
          }}
        variant={moduleColor}
        className="gba:min-h-screen"
      >
      {/* AI Search Bar - THE MAIN FEATURE! */}
      <div className="gba:mb-6">
        <AISearchBar onOpenChat={handleOpenChat} />
      </div>

      {/* Conditional Content Based on Active View */}
      {activeView === 'dashboard' && (
        <>
          {/* Key Metrics Row */}
          <div className="gba:grid gba:grid-cols-4 gba:gap-4 gba:mb-6">
        <Card>
          <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-2">
            <CardTitle className="gba:text-sm gba:font-medium">Offene Genehmigungen</CardTitle>
            <CheckCircle className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {approvalsLoading ? (
              <Skeleton className="gba:h-8 gba:w-16" />
            ) : (
              <>
                <div className="gba:text-2xl gba:font-bold">{approvals.length}</div>
                <p className="gba:text-xs gba:text-muted-foreground">
                  {approvals.filter(a => a.priority === 'high').length} dringend
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-2">
            <CardTitle className="gba:text-sm gba:font-medium">VIP-Kunden</CardTitle>
            <Briefcase className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {customersLoading ? (
              <Skeleton className="gba:h-8 gba:w-16" />
            ) : (
              <>
                <div className="gba:text-2xl gba:font-bold">{vipCustomers.length}</div>
                <p className="gba:text-xs gba:text-muted-foreground">
                  {vipCustomers.filter(c => c.status === 'opportunity').length} mit Chancen
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-2">
            <CardTitle className="gba:text-sm gba:font-medium">Tageseinlagen</CardTitle>
            <TrendUp className="gba:h-4 gba:w-4 gba:text-success" />
          </CardHeader>
          <CardContent>
            <div className="gba:text-2xl gba:font-bold">{formatCurrency(mockBankingKPIs.dailyDeposits)}</div>
            <p className="gba:text-xs gba:text-success">
              +8% vs. gestern
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-2">
            <CardTitle className="gba:text-sm gba:font-medium">Kundenzufriedenheit</CardTitle>
            <ChartLineUp className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="gba:text-2xl gba:font-bold">
              {formatPercent(mockBankingKPIs.customerSatisfaction)}
            </div>
            <p className="gba:text-xs gba:text-success">
              +2.1% diesen Monat
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="gba:grid gba:grid-cols-3 gba:gap-6">
        {/* Left Column - Approvals & Tasks */}
        <div className="gba:col-span-2 gba:space-y-6">
          {/* Approvals Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                ⚡ Aktionen & Aufgaben
                {!approvalsLoading && approvals.length > 0 && (
                  <Badge variant="destructive">{approvals.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>Priorisiert nach Dringlichkeit und KI-Empfehlungen</CardDescription>
            </CardHeader>
            <CardContent>
              {approvalsLoading ? (
                <div className="gba:space-y-4">
                  <Skeleton className="gba:h-24 gba:w-full" />
                  <Skeleton className="gba:h-24 gba:w-full" />
                  <Skeleton className="gba:h-24 gba:w-full" />
                </div>
              ) : approvals.length === 0 ? (
                <div className="gba:text-center gba:py-8">
                  <CheckCircle className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-2 gba:text-success" />
                  <p className="gba:text-muted-foreground">Alle Genehmigungen erledigt!</p>
                </div>
              ) : (
                <div className="gba:space-y-4">
                  {approvals.slice(0, 5).map(approval => {
                    const processed = processedApprovals[approval.id]
                    const isProcessed = !!processed
                    
                    return (
                    <div
                      key={approval.id}
                      className={`gba:flex gba:items-center gba:justify-between gba:p-4 gba:border gba:rounded-lg gba:transition-colors ${
                        isProcessed 
                          ? processed.status === 'approved'
                            ? 'gba:bg-success-secondary gba:border-success'
                            : 'gba:bg-destructive-secondary gba:border-destructive'
                          : 'hover:gba:bg-accent gba:cursor-pointer'
                      }`}
                      data-testid={`approval-${approval.id}`}
                      onClick={() => !isProcessed && setSelectedApproval(approval)}
                    >
                      <div className="gba:flex-1">
                        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                          {isProcessed && (
                            processed.status === 'approved' ? (
                              <CheckCircle className="gba:h-4 gba:w-4 gba:text-success" />
                            ) : (
                              <XCircle className="gba:h-4 gba:w-4 gba:text-destructive" />
                            )
                          )}
                          <h4 className="gba:font-medium gba:text-sm">{approval.title}</h4>
                          {isProcessed ? (
                            <Badge variant={processed.status === 'approved' ? 'success' : 'destructive'}>
                              {processed.status === 'approved' ? 'Genehmigt' : 'Abgelehnt'}
                            </Badge>
                          ) : (
                            <Badge variant={getPriorityVariant(approval.priority)}>
                              {approval.priority === 'high' ? 'Dringend' : 'Normal'}
                            </Badge>
                          )}
                        </div>
                        <p className="gba:text-sm gba:text-muted-foreground">
                          {approval.amount && formatCurrency(approval.amount, approval.currency)} •{' '}
                          {approval.type}
                        </p>
                        {approval.aiSuggestion && (
                          <div className="gba:flex gba:items-center gba:gap-1 gba:mt-2">
                            <Sparkle className="gba:h-3 gba:w-3 gba:text-info" />
                            <p className="gba:text-xs gba:text-info">
                              AI: {approval.aiSuggestion.recommendation === 'approve' ? 'Genehmigen' : 'Prüfen'} (
                              {Math.round(approval.aiSuggestion.confidence * 100)}% Confidence)
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="gba:flex gba:flex-col gba:items-end gba:gap-2">
                        <span className="gba:text-xs gba:text-muted-foreground">
                          <Clock className="gba:inline gba:h-3 gba:w-3" /> {getTimeAgo(approval.dueDate)}
                        </span>
                        {isProcessed ? (
                          <Badge variant={processed.status === 'approved' ? 'success' : 'destructive'} className="gba:text-xs">
                            {processed.status === 'approved' ? 'Abgeschlossen' : 'Abgeschlossen'}
                          </Badge>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedApproval(approval)
                            }}
                          >
                            <FileText className="gba:h-3 gba:w-3 gba:mr-1" />
                            Prüfen
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions - With Real Links */}
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <Sparkle className="gba:h-5 gba:w-5" />
                Schnellaktionen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                {/* Spesen genehmigen */}
                <Card 
                  className="gba:cursor-pointer hover:gba:bg-accent gba:transition-colors"
                  onClick={handleNavigateToManagerExpenses}
                  data-testid="quick-action-expenses"
                >
                  <CardContent className="gba:p-4">
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                      <CurrencyCircleDollar className="gba:h-5 gba:w-5" />
                      <Badge variant="destructive" className="gba:text-xs">{approvals.filter(a => a.type === 'expense').length || 5}</Badge>
                    </div>
                    <span className="gba:text-sm gba:font-medium">Spesen genehmigen</span>
                  </CardContent>
                </Card>

                {/* Urlaub genehmigen */}
                <Card 
                  className="gba:cursor-pointer hover:gba:bg-accent gba:transition-colors"
                  onClick={handleNavigateToAbsences}
                  data-testid="quick-action-absences"
                >
                  <CardContent className="gba:p-4">
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                      <Calendar className="gba:h-5 gba:w-5" />
                      <Badge variant="warning" className="gba:text-xs">2</Badge>
                    </div>
                    <span className="gba:text-sm gba:font-medium">Urlaub genehmigen</span>
                  </CardContent>
                </Card>

                {/* Team-Übersicht */}
                <Card 
                  className="gba:cursor-pointer hover:gba:bg-accent gba:transition-colors"
                  onClick={() => setActiveView('team')}
                  data-testid="quick-action-team"
                >
                  <CardContent className="gba:p-4">
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                      <Users className="gba:h-5 gba:w-5" />
                    </div>
                    <span className="gba:text-sm gba:font-medium">Team-Übersicht</span>
                  </CardContent>
                </Card>

                {/* Analytics */}
                <Card 
                  className="gba:cursor-pointer hover:gba:bg-accent gba:transition-colors"
                  onClick={() => setActiveView('analytics')}
                  data-testid="quick-action-analytics"
                >
                  <CardContent className="gba:p-4">
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                      <ChartBar className="gba:h-5 gba:w-5" />
                    </div>
                    <span className="gba:text-sm gba:font-medium">Analytics</span>
                  </CardContent>
                </Card>

                {/* VIP Kunden */}
                <Card 
                  className="gba:cursor-pointer hover:gba:bg-accent gba:transition-colors"
                  onClick={handleNavigateToCustomers}
                  data-testid="quick-action-customers"
                >
                  <CardContent className="gba:p-4">
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                      <Briefcase className="gba:h-5 gba:w-5" />
                    </div>
                    <span className="gba:text-sm gba:font-medium">VIP Kunden (CRM)</span>
                  </CardContent>
                </Card>

                {/* Opportunities */}
                <Card 
                  className="gba:cursor-pointer hover:gba:bg-accent gba:transition-colors"
                  onClick={handleNavigateToOpportunities}
                  data-testid="quick-action-opportunities"
                >
                  <CardContent className="gba:p-4">
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                      <TrendUp className="gba:h-5 gba:w-5" />
                    </div>
                    <span className="gba:text-sm gba:font-medium">Opportunities</span>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <ActivityFeed {...context} maxItems={8} />
        </div>

        {/* Right Column - AI Assistant & Widgets */}
        <div className="gba:space-y-6">
          {/* AI Assistant Panel */}
          <AIAssistantPanel
            {...context}
            pendingApprovalsCount={approvals.length}
            vipCustomersCount={vipCustomers.length}
            teamAbsencesCount={2}
            onOpenChat={handleOpenChat}
          />

          {/* Team Widget */}
          <TeamWidget {...context} showDetailed={false} />

          {/* VIP Customers */}
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <Briefcase className="gba:h-5 gba:w-5" />
                VIP-Kunden
              </CardTitle>
              <CardDescription>Benötigen Ihre Aufmerksamkeit</CardDescription>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="gba:space-y-3">
                  <Skeleton className="gba:h-20 gba:w-full" />
                  <Skeleton className="gba:h-20 gba:w-full" />
                </div>
              ) : vipCustomers.length === 0 ? (
                <div className="gba:text-center gba:py-6">
                  <p className="gba:text-sm gba:text-muted-foreground">
                    Keine VIP-Kunden erfordern derzeit Aufmerksamkeit
                  </p>
                </div>
              ) : (
                <div className="gba:space-y-3">
                  {vipCustomers.slice(0, 3).map(customer => (
                    <div
                      key={customer.id}
                      className="gba:p-3 gba:border gba:rounded-lg hover:gba:bg-accent gba:cursor-pointer gba:transition-colors"
                      data-testid={`vip-customer-${customer.id}`}
                      onClick={() => handleNavigateToAccount(customer)}
                    >
                      <div className="gba:flex gba:items-start gba:justify-between">
                        <div>
                          <h4 className="gba:font-medium gba:text-sm">{customer.name}</h4>
                          <p className="gba:text-xs gba:text-muted-foreground">
                            Portfolio: {formatCurrency(customer.totalAssets)}
                          </p>
                          {customer.nextScheduledMeeting && (
                            <p className="gba:text-xs gba:text-info gba:mt-1">
                              Termin: {getTimeAgo(customer.nextScheduledMeeting)}
                            </p>
                          )}
                          {customer.opportunities && customer.opportunities.length > 0 && (
                            <p className="gba:text-xs gba:text-success gba:mt-1">
                              {customer.opportunities.length} Investment-Chance(n)
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={
                            customer.priority === 'vip'
                              ? 'destructive'
                              : customer.priority === 'premium'
                                ? 'warning'
                                : 'default'
                          }
                        >
                          {customer.priority.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
        </>
      )}

      {/* Team View */}
      {activeView === 'team' && (
        <div className="gba:space-y-6">
          <div className="gba:grid gba:grid-cols-2 gba:gap-6">
            <TeamWidget {...context} showDetailed={true} />
            <Card>
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
                <CardDescription>Leistungsmetriken und Insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="gba:space-y-4">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <span className="gba:text-sm">Team-Produktivität</span>
                    <Badge variant="success">+12%</Badge>
                  </div>
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <span className="gba:text-sm">Kundenzufriedenheit</span>
                    <Badge variant="success">94.5%</Badge>
                  </div>
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <span className="gba:text-sm">Zielerreichung</span>
                    <Badge variant="warning">87%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Urlaubsplanung Button - Standalone */}
          <Button className="gba:w-full" onClick={handleNavigateToAbsences}>
            <Calendar className="gba:h-4 gba:w-4 gba:mr-2" />
            Team-Urlaubsplanung anzeigen →
          </Button>

          {/* Team Compliance Section */}
          <TeamComplianceWidget {...context} showDetailed={true} />
        </div>
      )}

      {/* Approvals View */}
      {activeView === 'approvals' && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              Alle Genehmigungen
              {!approvalsLoading && <Badge variant="default">{approvals.length} Gesamt</Badge>}
            </CardTitle>
            <CardDescription>Verwaltet über Custom Flow Engine • Sortiert nach Priorität</CardDescription>
          </CardHeader>
          <CardContent>
            {approvalsLoading ? (
              <div className="gba:space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="gba:h-24 gba:w-full" />
                ))}
              </div>
            ) : (
              <div className="gba:space-y-3">
                {approvals.map(approval => {
                  const processed = processedApprovals[approval.id]
                  const isProcessed = !!processed
                  
                  return (
                  <div
                    key={approval.id}
                    className={`gba:p-4 gba:border gba:rounded-lg gba:transition-colors ${
                      isProcessed
                        ? processed.status === 'approved'
                          ? 'gba:bg-success-secondary gba:border-success'
                          : 'gba:bg-destructive-secondary gba:border-destructive'
                        : 'hover:gba:bg-accent gba:cursor-pointer'
                    }`}
                    data-testid={`approval-detail-${approval.id}`}
                    onClick={() => !isProcessed && setSelectedApproval(approval)}
                  >
                    <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
                      <div className="gba:flex-1">
                        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                          {isProcessed && (
                            processed.status === 'approved' ? (
                              <CheckCircle className="gba:h-5 gba:w-5 gba:text-success" />
                            ) : (
                              <XCircle className="gba:h-5 gba:w-5 gba:text-destructive" />
                            )
                          )}
                          <h3 className="gba:font-semibold">{approval.title}</h3>
                          {isProcessed ? (
                            <Badge variant={processed.status === 'approved' ? 'success' : 'destructive'}>
                              {processed.status === 'approved' ? 'Genehmigt' : 'Abgelehnt'}
                            </Badge>
                          ) : (
                            <Badge variant={getPriorityVariant(approval.priority)}>
                              {approval.priority === 'high' ? 'Dringend' : 'Normal'}
                            </Badge>
                          )}
                        </div>
                        <p className="gba:text-sm gba:text-muted-foreground gba:mb-2">{approval.description}</p>
                        <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm">
                          <span>
                            <strong>Betrag:</strong> {approval.amount && formatCurrency(approval.amount, approval.currency)}
                          </span>
                          <span>
                            <strong>Von:</strong> {approval.requestedBy.name}
                          </span>
                          <span>
                            <strong>Fällig:</strong> {getTimeAgo(approval.dueDate)}
                          </span>
                        </div>
                        {approval.aiSuggestion && (
                          <div className="gba:mt-3 gba:p-3 gba:bg-info-secondary gba:rounded-lg">
                            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                              <Sparkle className="gba:h-4 gba:w-4 gba:text-info" />
                              <span className="gba:text-sm gba:font-medium gba:text-info">
                                KI-Empfehlung: {approval.aiSuggestion.recommendation === 'approve' ? 'Genehmigen' : 'Genauer Prüfen'}
                              </span>
                              <Badge variant="info">{Math.round(approval.aiSuggestion.confidence * 100)}%</Badge>
                            </div>
                            <p className="gba:text-xs gba:text-info-foreground">{approval.aiSuggestion.rationale}</p>
                          </div>
                        )}
                      </div>
                      {isProcessed ? (
                        <div className="gba:text-sm gba:text-muted-foreground">
                          <p className="gba:font-medium">
                            {processed.status === 'approved' ? 'Genehmigt' : 'Abgelehnt'}
                          </p>
                          {processed.comments && (
                            <p className="gba:text-xs gba:mt-1">"{processed.comments}"</p>
                          )}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedApproval(approval)
                          }}
                        >
                          <FileText className="gba:h-3 gba:w-3 gba:mr-1" />
                          Bearbeiten
                        </Button>
                      )}
                    </div>
                  </div>
                )
                })}
                <div className="gba:mt-6 gba:pt-4 gba:border-t">
                  <Button variant="outline" className="gba:w-full" onClick={handleNavigateToManagerExpenses}>
                    Zu Manager Expenses (vollständige Verwaltung) →
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* VIP Customers View - Rich Relationship Management */}
      {activeView === 'customers' && (
        <div className="gba:space-y-6">
          {/* VIP Customer KPIs */}
          <div className="gba:grid gba:grid-cols-4 gba:gap-4">
            <Card>
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">Gesamt-Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:text-2xl gba:font-bold">
                  {formatCurrency(vipCustomers.reduce((sum, c) => sum + c.totalAssets, 0))}
                </div>
                <p className="gba:text-xs gba:text-muted-foreground">{vipCustomers.length} VIP-Kunden</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">Investment-Chancen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:text-2xl gba:font-bold gba:text-success">
                  {vipCustomers.reduce((sum, c) => sum + (c.opportunities?.length || 0), 0)}
                </div>
                <p className="gba:text-xs gba:text-success">Aktive Opportunities</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">Aufmerksamkeit benötigt</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:text-2xl gba:font-bold gba:text-warning">
                  {vipCustomers.filter(c => c.status === 'at-risk' || c.status === 'opportunity').length}
                </div>
                <p className="gba:text-xs gba:text-warning">Kunden</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">Nächster Termin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:text-2xl gba:font-bold gba:text-info">
                  {vipCustomers.filter(c => c.nextScheduledMeeting).length}
                </div>
                <p className="gba:text-xs gba:text-info">Diese Woche</p>
              </CardContent>
            </Card>
          </div>

          {/* VIP Customer Cards with Rich Details */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            {customersLoading ? (
              <>
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="gba:h-48 gba:w-full" />
                ))}
              </>
            ) : (
              vipCustomers.map(customer => (
                <Card
                  key={customer.id}
                  className="hover:gba:shadow-lg gba:transition-shadow gba:cursor-pointer"
                  onClick={() => handleNavigateToAccount(customer)}
                >
                  <CardHeader>
                    <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
                      <div>
                        <CardTitle className="gba:text-lg gba:mb-1">{customer.name}</CardTitle>
                        <Badge
                          variant={
                            customer.priority === 'vip' ? 'destructive' : customer.priority === 'premium' ? 'warning' : 'default'
                          }
                        >
                          {customer.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <Badge
                        variant={
                          customer.status === 'opportunity' ? 'success' : customer.status === 'at-risk' ? 'destructive' : 'default'
                        }
                      >
                        {customer.status === 'opportunity' ? 'Chance' : customer.status === 'at-risk' ? 'Risiko' : 'Aktiv'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="gba:space-y-3">
                      {/* Portfolio Value */}
                      <div className="gba:flex gba:items-center gba:justify-between gba:pb-2 gba:border-b">
                        <span className="gba:text-sm gba:text-muted-foreground">Portfolio</span>
                        <span className="gba:font-semibold">{formatCurrency(customer.totalAssets)}</span>
                      </div>

                      {/* Account Type */}
                      <div className="gba:flex gba:items-center gba:justify-between">
                        <span className="gba:text-sm gba:text-muted-foreground">Typ</span>
                        <span className="gba:text-sm">{customer.accountType}</span>
                      </div>

                      {/* Last Contact */}
                      {customer.lastContact && (
                        <div className="gba:flex gba:items-center gba:justify-between">
                          <span className="gba:text-sm gba:text-muted-foreground">Letzter Kontakt</span>
                          <span className="gba:text-sm">{getTimeAgo(customer.lastContact)}</span>
                        </div>
                      )}

                      {/* Next Meeting */}
                      {customer.nextScheduledMeeting && (
                        <div className="gba:p-2 gba:bg-info-secondary gba:rounded gba:mt-2">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Calendar className="gba:h-4 gba:w-4 gba:text-info" />
                            <span className="gba:text-sm gba:text-info">
                              Termin: {getTimeAgo(customer.nextScheduledMeeting)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Opportunities */}
                      {customer.opportunities && customer.opportunities.length > 0 && (
                        <div className="gba:mt-3">
                          <div className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">
                            Investment-Chancen:
                          </div>
                          {customer.opportunities.slice(0, 2).map((opp, idx) => (
                            <div key={idx} className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:mb-1">
                              <span className="gba:text-muted-foreground">{opp.type}</span>
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <span className="gba:font-medium">{formatCurrency(opp.value)}</span>
                                <Badge variant="success" className="gba:text-xs">
                                  {opp.probability}%
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action Needed */}
                      {customer.status === 'at-risk' && (
                        <div className="gba:p-2 gba:bg-destructive-secondary gba:rounded gba:mt-2">
                          <p className="gba:text-xs gba:text-destructive gba:font-medium">
                            ⚠️ Keine Aktivität seit 30+ Tagen
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Quick Actions for VIP Management */}
          <div className="gba:grid gba:grid-cols-3 gba:gap-4">
            <Button variant="outline" onClick={handleNavigateToCustomers}>
              <Briefcase className="gba:h-4 gba:w-4 gba:mr-2" />
              Zum vollständigen CRM
            </Button>
            <Button variant="outline" onClick={() => console.log('Schedule customer meeting')}>
              <Calendar className="gba:h-4 gba:w-4 gba:mr-2" />
              Kunden-Termin planen
            </Button>
            <Button variant="default" onClick={() => console.log('Generate customer report')}>
              <FileText className="gba:h-4 gba:w-4 gba:mr-2" />
              Beziehungs-Report
            </Button>
          </div>
        </div>
      )}

      {/* Calendar View - Full Page Week View */}
      {activeView === 'calendar' && (
        <FullPageCalendar {...context} />
      )}

      {/* Analytics View */}
      {activeView === 'analytics' && (
        <div className="gba:space-y-6">
          {/* Quick Analytics Cards */}
          <div className="gba:grid gba:grid-cols-3 gba:gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="gba:text-sm">Filialleistung</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:text-3xl gba:font-bold gba:text-success">87%</div>
                <p className="gba:text-xs gba:text-success gba:mt-1">+5% vs. Vormonat</p>
                <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">Rang 3 von 24 Filialen</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="gba:text-sm">Neukundengewinnung</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:text-3xl gba:font-bold">12</div>
                <p className="gba:text-xs gba:text-info gba:mt-1">Diesen Monat</p>
                <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">Ziel: 15 Neukunden</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="gba:text-sm">Kreditvolumen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:text-3xl gba:font-bold">{formatCurrency(4500000)}</div>
                <p className="gba:text-xs gba:text-success gba:mt-1">+15% YoY</p>
                <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">Q1 2025</p>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Links */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <Card className="hover:gba:shadow-lg gba:transition-shadow gba:cursor-pointer" onClick={() => navigateTo('/platform/hr/human-resources?view=analytics')}>
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-2">
                  <Users className="gba:h-5 gba:w-5" />
                  HR Analytics
                </CardTitle>
                <CardDescription>Team-Auswertungen, Gehälter, Fluktuation</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="gba:text-sm gba:text-muted-foreground">
                  Umfassende HR-Kennzahlen: Mitarbeiterzufriedenheit, Produktivität, Abwesenheitsstatistiken
                </p>
                <Button variant="outline" size="sm" className="gba:mt-4">
                  Öffnen →
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:gba:shadow-lg gba:transition-shadow gba:cursor-pointer" onClick={() => navigateTo('/platform/crm/customer-relations?view=analytics')}>
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-2">
                  <ChartBar className="gba:h-5 gba:w-5" />
                  Sales Analytics
                </CardTitle>
                <CardDescription>Vertriebskennzahlen, Pipeline, Conversion</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="gba:text-sm gba:text-muted-foreground">
                  Detaillierte Sales-Analysen: Opportunities, Pipeline-Health, Revenue-Trends
                </p>
                <Button variant="outline" size="sm" className="gba:mt-4">
                  Öffnen →
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      <ApprovalModal
        approval={selectedApproval}
        isOpen={!!selectedApproval}
        onClose={() => setSelectedApproval(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
      </PageLayout>
  )
}

export default BankManagerWorkplace
