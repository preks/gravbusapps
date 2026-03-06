import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  IconAvatar,
  Badge,
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@newwork/nw-design-system'
import { AddressBookIcon, UsersIcon, BankIcon } from '@phosphor-icons/react'
import { BarChart, Bar, XAxis, YAxis } from 'recharts'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

export interface ContactsByTypeItem {
  type: string
  count: number
  percentage: number
}
export interface ContactsByAccountItem {
  accountId: string
  accountName: string
  contactCount: number
}
export interface RecentContactItem {
  id: string
  name: string
  accountName?: string
  createdDate: string
  daysSinceCreated: number
}

export interface ContactInsightsDashboardData {
  totalContacts: number
  contactsByType: ContactsByTypeItem[]
  contactsByAccount: ContactsByAccountItem[]
  recentContacts: RecentContactItem[]
}

interface ContactInsightsDashboardProps {
  data: ContactInsightsDashboardData
  moduleColor?: string
  module: 'crm' | 'irm'
}

export const ContactInsightsDashboard: React.FC<ContactInsightsDashboardProps> = ({
  data,
  moduleColor = 'default',
  module
}) => {
  const chartConfig = useMemo(
    () =>
      ({
        count: {
          label: 'Contacts'
        }
      }) satisfies ChartConfig,
    []
  )

  const handleAccountClick = (accountId: string) => {
    if (!accountId) return // Skip "No Account" entries
    const basePath = module === 'crm' ? '/platform/crm/account-record' : '/platform/irm/account-record'
    const url = buildPlatformUrl(basePath, { accountId })
    navigateTo(url)
  }

  const handleContactClick = (contactId: string) => {
    const basePath = module === 'crm' ? '/platform/crm/contact-record' : '/platform/irm/contact-record'
    const url = buildPlatformUrl(basePath, { contactId })
    navigateTo(url)
  }
  return (
    <Card data-testid="contact-insights-analysis">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar
          icon={UsersIcon}
          variant={moduleColor as 'default' | 'success' | 'warning' | 'destructive' | 'info'}
          size="md"
          iconWeight="regular"
          decorative={true}
        />
        <div>
          <CardTitle>Contact Insights Dashboard</CardTitle>
          <CardDescription>Contact analytics and engagement overview</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-3 gba:gap-4 gba:mb-6">
          <div className="gba:p-4 gba:bg-blue-50 gba:rounded-lg gba:border gba:border-blue-200">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <AddressBookIcon size={16} className="gba:text-blue-600" />
              <span className="gba:text-sm gba:font-medium gba:text-blue-600">Total Contacts</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-blue-900">{data.totalContacts}</div>
          </div>
          <div className="gba:p-4 gba:bg-purple-50 gba:rounded-lg gba:border gba:border-purple-200">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <UsersIcon className="gba:text-purple-600" />
              <span className="gba:text-sm gba:font-medium gba:text-purple-600">Contact Types</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-purple-900">{data.contactsByType.length}</div>
          </div>
          <div className="gba:p-4 gba:bg-orange-50 gba:rounded-lg gba:border gba:border-orange-200">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <BankIcon size={16} className="gba:text-orange-600" />
              <span className="gba:text-sm gba:font-medium gba:text-orange-600">Linked Accounts</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-orange-900">
              {data.contactsByAccount.filter(a => a.accountName !== 'No Account').length}
            </div>
          </div>
        </div>

        <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
          <div>
            <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Contacts by Type</h4>
            <ChartContainer config={chartConfig} className="gba:w-full gba:h-[300px]">
              <BarChart data={data.contactsByType} margin={{ bottom: 80, left: 40 }}>
                <XAxis dataKey="type" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
          <div>
            <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Top Accounts by Contact Count</h4>
            <div className="gba:space-y-3 gba:max-h-80 gba:overflow-y-auto">
              {data.contactsByAccount.slice(0, 8).map((account, index) => (
                <button
                  key={`${account.accountName}-${index}`}
                  type="button"
                  disabled={!account.accountId}
                  className={`gba:w-full gba:p-3 gba:rounded-lg gba:transition-colors gba:text-left ${
                    account.accountId
                      ? 'gba:bg-blue-50 gba:border gba:border-blue-200 gba:cursor-pointer gba:hover:bg-blue-100'
                      : 'gba:bg-gray-50 gba:border gba:border-gray-200 gba:cursor-not-allowed'
                  }`}
                  data-testid={`top-account-${index}`}
                  onClick={() => handleAccountClick(account.accountId)}
                >
                  <div className="gba:flex gba:justify-between gba:items-center">
                    <div className="gba:flex-1">
                      <h5 className="gba:font-medium gba:text-gray-900 gba:text-sm">{account.accountName}</h5>
                    </div>
                    <div className="gba:text-right">
                      <Badge variant="outline">{account.contactCount} contacts</Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="gba:mt-6">
          <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Recent Contacts</h4>
          <div className="gba:space-y-3">
            {data.recentContacts.map(contact => (
              <button
                key={contact.id}
                type="button"
                className="gba:w-full gba:p-3 gba:bg-green-50 gba:border gba:border-green-200 gba:rounded-lg gba:cursor-pointer gba:hover:bg-green-100 gba:transition-colors gba:text-left"
                data-testid={`recent-contact-${contact.id}`}
                onClick={() => handleContactClick(contact.id)}
              >
                <div className="gba:flex gba:justify-between gba:items-start">
                  <div className="gba:flex-1">
                    <h5 className="gba:font-medium gba:text-gray-900 gba:text-sm">{contact.name}</h5>
                    {contact.accountName && (
                      <p className="gba:text-xs gba:text-gray-600 gba:mt-1">{contact.accountName}</p>
                    )}
                  </div>
                  <div className="gba:text-right">
                    <Badge variant="outline">
                      {contact.daysSinceCreated === 0 ? 'Today' : `${contact.daysSinceCreated}d ago`}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ContactInsightsDashboard
