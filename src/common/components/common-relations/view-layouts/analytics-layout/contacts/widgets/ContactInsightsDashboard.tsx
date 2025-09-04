import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system';
import { ContactsOutlined, TeamOutlined, BankOutlined } from '@ant-design/icons';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export interface ContactsByTypeItem { type: string; count: number; percentage: number }
export interface ContactsByAccountItem { accountName: string; contactCount: number }
export interface RecentContactItem { id: string; name: string; accountName?: string; createdDate: string; daysSinceCreated: number }

export interface ContactInsightsDashboardData {
  totalContacts: number;
  contactsByType: ContactsByTypeItem[];
  contactsByAccount: ContactsByAccountItem[];
  recentContacts: RecentContactItem[];
}

interface ContactInsightsDashboardProps {
  data: ContactInsightsDashboardData;
}

const TYPE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6'];

export const ContactInsightsDashboard: React.FC<ContactInsightsDashboardProps> = ({ data }) => {
  return (
    <Card data-testid="contact-insights-analysis">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <ContactsOutlined />
          Contact Insights Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-3 gba:gap-4 gba:mb-6">
          <div className="gba:p-4 gba:bg-blue-50 gba:rounded-lg gba:border gba:border-blue-200">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <ContactsOutlined className="gba:text-blue-600" />
              <span className="gba:text-sm gba:font-medium gba:text-blue-600">Total Contacts</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-blue-900">{data.totalContacts}</div>
          </div>
          <div className="gba:p-4 gba:bg-purple-50 gba:rounded-lg gba:border gba:border-purple-200">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <TeamOutlined className="gba:text-purple-600" />
              <span className="gba:text-sm gba:font-medium gba:text-purple-600">Contact Types</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-purple-900">{data.contactsByType.length}</div>
          </div>
          <div className="gba:p-4 gba:bg-orange-50 gba:rounded-lg gba:border gba:border-orange-200">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <BankOutlined className="gba:text-orange-600" />
              <span className="gba:text-sm gba:font-medium gba:text-orange-600">Linked Accounts</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-orange-900">{data.contactsByAccount.filter(a => a.accountName !== 'No Account').length}</div>
          </div>
        </div>

        <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
          <div>
            <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Contacts by Type</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.contactsByType}>
                <XAxis dataKey="type" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#C8E6C9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Top Accounts by Contact Count</h4>
            <div className="gba:space-y-3 gba:max-h-80 gba:overflow-y-auto">
              {data.contactsByAccount.slice(0, 8).map((account, index) => (
                <div key={account.accountName} className="gba:p-3 gba:bg-gray-50 gba:border gba:border-gray-200 gba:rounded-lg" data-testid={`top-account-${index}`}>
                  <div className="gba:flex gba:justify-between gba:items-center">
                    <div className="gba:flex-1"><h5 className="gba:font-medium gba:text-gray-900 gba:text-sm">{account.accountName}</h5></div>
                    <div className="gba:text-right"><Badge variant="outline">{account.contactCount} contacts</Badge></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="gba:mt-6">
          <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Recent Contacts</h4>
          <div className="gba:space-y-3">
            {data.recentContacts.map((contact) => (
              <div key={contact.id} className="gba:p-3 gba:bg-gray-50 gba:border gba:border-gray-200 gba:rounded-lg" data-testid={`recent-contact-${contact.id}`}>
                <div className="gba:flex gba:justify-between gba:items-start">
                  <div className="gba:flex-1">
                    <h5 className="gba:font-medium gba:text-gray-900 gba:text-sm">{contact.name}</h5>
                    {contact.accountName && (<p className="gba:text-xs gba:text-gray-600 gba:mt-1">{contact.accountName}</p>)}
                  </div>
                  <div className="gba:text-right"><Badge variant="outline">{contact.daysSinceCreated === 0 ? 'Today' : `${contact.daysSinceCreated}d ago`}</Badge></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactInsightsDashboard;


