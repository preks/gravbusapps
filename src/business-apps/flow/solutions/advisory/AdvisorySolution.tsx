import React, { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { Briefcase, AlertTriangle, CheckCircle, FileText, Users, TrendingUp } from 'lucide-react'

export const AdvisorySolution: React.FC<BusinessAppContextProps> = () => {
  const [search, setSearch] = useState('')

  const widgets: WidgetItem[] = [
    {
      key: 'active-engagements',
      title: 'Active Engagements',
      value: 8,
      description: 'Currently in progress',
      prefix: <Briefcase className="gba:h-5 gba:w-5" />,
      color: '#10b981'
    },
    {
      key: 'pipeline-value',
      title: 'Pipeline Value',
      value: 1.2,
      suffix: 'M',
      precision: 1,
      description: 'Next 90 days',
      prefix: <TrendingUp className="gba:h-5 gba:w-5" />,
      color: '#3b82f6'
    },
    {
      key: 'overdue-tasks',
      title: 'Overdue Tasks',
      value: 4,
      description: 'Action required',
      prefix: <AlertTriangle className="gba:h-5 gba:w-5" />,
      color: '#ef4444'
    },
    {
      key: 'utilization',
      title: 'Utilization',
      value: 75,
      suffix: '%',
      description: 'Team average',
      prefix: <Users className="gba:h-5 gba:w-5" />,
      color: '#f59e0b'
    }
  ]

  return (
    <div className="gba:min-h-screen gba:bg-gray-50 gba:p-6" data-testid="advisory-solution-container">
      {/* Header */}
      <div className="gba:mb-8">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:p-3 gba:bg-gradient-to-r gba:from-emerald-600 gba:to-teal-600 gba:rounded-xl gba:shadow-lg">
              <Briefcase className="gba:h-8 gba:w-8 gba:text-white" />
            </div>
            <div>
              <h1 className="gba:text-3xl gba:font-bold gba:text-gray-900">Advisory & Professional Services</h1>
              <p className="gba:text-lg gba:text-gray-600">
                Manage client engagements, proposals, and service delivery.
              </p>
            </div>
          </div>
          <div className="gba:flex gba:items-center gba:gap-3">
            <DebouncedInput
              data-testid="advisory-home-search-input"
              placeholder="Search engagements..."
              value={search}
              onChange={setSearch}
              className="gba:w-48"
            />
            <Button data-testid="advisory-start-kyc-button" variant="default">
              <CheckCircle className="gba:h-4 gba:w-4 gba:mr-2" /> Start KYC Review
            </Button>
            <Button data-testid="advisory-generate-proposal-button" variant="outline">
              <FileText className="gba:h-4 gba:w-4 gba:mr-2" /> Generate Proposal
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="gba:mb-8" data-testid="advisory-kpi-section">
        <WidgetGroup widgets={widgets} isLoading={false} emptyText="No statistics available." />
      </div>

      {/* Main Content Grid */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-8" data-testid="advisory-solution-content">
        {/* Recommended Actions */}
        <Card
          className="gba:bg-white/80 gba:backdrop-blur-sm"
          style={{ boxShadow: 'var(--shadow-lg)' }}
          data-testid="advisory-recommended-actions-card"
        >
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:bg-gradient-to-br gba:from-orange-500 gba:to-orange-600 gba:rounded-lg gba:shadow-sm">
                <TrendingUp className="gba:h-5 gba:w-5 gba:text-white" />
              </div>
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:p-6">
            <div className="gba:space-y-3" data-testid="advisory-recommended-actions-list">
              <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-gray-50 gba:rounded-lg">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:w-2 gba:h-2 gba:bg-orange-500 gba:rounded-full"></div>
                  <span className="gba:text-sm gba:font-medium gba:text-gray-700">Prepare proposal for ACME Corp</span>
                </div>
                <Button data-testid="advisory-action-proposal" size="sm" variant="default">
                  Open
                </Button>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-gray-50 gba:rounded-lg">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:w-2 gba:h-2 gba:bg-blue-500 gba:rounded-full"></div>
                  <span className="gba:text-sm gba:font-medium gba:text-gray-700">Staff Q3 Risk Assessment</span>
                </div>
                <Button data-testid="advisory-action-staffing" size="sm" variant="default">
                  Start
                </Button>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-gray-50 gba:rounded-lg">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:w-2 gba:h-2 gba:bg-red-500 gba:rounded-full"></div>
                  <span className="gba:text-sm gba:font-medium gba:text-gray-700">Complete independence checks</span>
                </div>
                <Button data-testid="advisory-action-independence" size="sm" variant="default">
                  View
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Engagements */}
        <Card
          className="gba:bg-white/80 gba:backdrop-blur-sm"
          style={{ boxShadow: 'var(--shadow-lg)' }}
          data-testid="advisory-programs-card"
        >
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:bg-gradient-to-br gba:from-green-500 gba:to-green-600 gba:rounded-lg gba:shadow-sm">
                <Users className="gba:h-5 gba:w-5 gba:text-white" />
              </div>
              Active Engagements
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:p-6">
            <div className="gba:space-y-3" data-testid="advisory-programs-list">
              <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-gray-50 gba:rounded-lg">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:w-3 gba:h-3 gba:bg-green-500 gba:rounded-full"></div>
                  <div>
                    <span className="gba:text-sm gba:font-medium gba:text-gray-700 gba:block">
                      ACME – Transformation Advisory
                    </span>
                    <span className="gba:text-xs gba:text-gray-500">Phase 2 - Discovery</span>
                  </div>
                </div>
                <Button data-testid="advisory-program-acme" size="sm" variant="outline">
                  Details
                </Button>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-gray-50 gba:rounded-lg">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:w-3 gba:h-3 gba:bg-blue-500 gba:rounded-full"></div>
                  <div>
                    <span className="gba:text-sm gba:font-medium gba:text-gray-700 gba:block">
                      FinBank – KYC Operating Model
                    </span>
                    <span className="gba:text-xs gba:text-gray-500">Phase 1 - Assessment</span>
                  </div>
                </div>
                <Button data-testid="advisory-program-finbank" size="sm" variant="outline">
                  Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Inbox */}
        <Card
          className="gba:bg-white/80 gba:backdrop-blur-sm"
          style={{ boxShadow: 'var(--shadow-lg)' }}
          data-testid="advisory-inbox-card"
        >
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:bg-gradient-to-br gba:from-purple-500 gba:to-purple-600 gba:rounded-lg gba:shadow-sm">
                <CheckCircle className="gba:h-5 gba:w-5 gba:text-white" />
              </div>
              My Work
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:p-6">
            <div className="gba:space-y-3" data-testid="advisory-inbox-list">
              <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-gray-50 gba:rounded-lg">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:w-6 gba:h-6 gba:bg-purple-500 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-white gba:text-xs gba:font-bold">
                    2
                  </div>
                  <span className="gba:text-sm gba:font-medium gba:text-gray-700">Approvals awaiting review</span>
                </div>
                <Button data-testid="advisory-inbox-approvals" size="sm" variant="outline">
                  Open
                </Button>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-gray-50 gba:rounded-lg">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:w-6 gba:h-6 gba:bg-indigo-500 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-white gba:text-xs gba:font-bold">
                    1
                  </div>
                  <span className="gba:text-sm gba:font-medium gba:text-gray-700">Change order pending</span>
                </div>
                <Button data-testid="advisory-inbox-change-order" size="sm" variant="outline">
                  Open
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates Library */}
        <Card
          className="gba:bg-white/80 gba:backdrop-blur-sm gba:lg:col-span-2"
          style={{ boxShadow: 'var(--shadow-lg)' }}
          data-testid="advisory-templates-card"
        >
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:bg-gradient-to-br gba:from-emerald-500 gba:to-emerald-600 gba:rounded-lg gba:shadow-sm">
                <FileText className="gba:h-5 gba:w-5 gba:text-white" />
              </div>
              Start an Advisory Flow
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:p-6">
            <div
              className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4"
              data-testid="advisory-templates-buttons"
            >
              <Button
                data-testid="advisory-start-engagement-intake-button"
                variant="secondary"
                className="gba:h-auto gba:p-4 gba:flex-col gba:items-start"
              >
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                  <Users className="gba:h-4 gba:w-4 gba:text-gray-600" />
                  <span className="gba:font-medium gba:text-gray-800">Engagement Intake</span>
                </div>
                <span className="gba:text-xs gba:text-gray-500">New client onboarding</span>
              </Button>
              <Button
                data-testid="advisory-start-sow-button"
                variant="secondary"
                className="gba:h-auto gba:p-4 gba:flex-col gba:items-start"
              >
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                  <FileText className="gba:h-4 gba:w-4 gba:text-gray-600" />
                  <span className="gba:font-medium gba:text-gray-800">Proposal / SOW</span>
                </div>
                <span className="gba:text-xs gba:text-gray-500">Statement of work creation</span>
              </Button>
              <Button
                data-testid="advisory-start-change-request-button"
                variant="secondary"
                className="gba:h-auto gba:p-4 gba:flex-col gba:items-start"
              >
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                  <TrendingUp className="gba:h-4 gba:w-4 gba:text-gray-600" />
                  <span className="gba:font-medium gba:text-gray-800">Change Request</span>
                </div>
                <span className="gba:text-xs gba:text-gray-500">Scope modifications</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdvisorySolution
