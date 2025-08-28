import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import {
  TrophyOutlined,
  RiseOutlined,
  TeamOutlined,
  DollarCircleOutlined
} from '@ant-design/icons';

interface ContactPerformanceData {
  conversionMetrics: {
    contactsToOpportunities: number;
    contactsToAccounts: number;
    avgContactsPerAccount: number;
    responseRate: number;
  };
  trendsOverTime: {
    month: string;
    contactsCreated: number;
    accountsLinked: number;
    opportunitiesGenerated: number;
    conversionRate: number;
  }[];
  topSources: {
    source: string;
    count: number;
    conversionRate: number;
  }[];
  performanceByRole: {
    role: string;
    count: number;
    avgEngagement: number;
  }[];
}

interface ContactPerformanceInsightsProps extends BusinessAppContextProps {
  data?: any;
}

export const ContactPerformanceInsights: React.FC<ContactPerformanceInsightsProps> = ({ 
  accessToken
}) => {
  const [performanceData, setPerformanceData] = useState<ContactPerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const graphqlClient = useGraphQLClient(accessToken);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setIsLoading(true);
        
        const query = `
          query GetContactPerformanceData {
            contacts: InvestmentContact(
              where: { isDeleted: { _eq: false } }
            ) {
              id
              firstName
              lastName
              email
              contactType
              createdAt
              updatedAt
              investmentAccountContact { accountId account { id name } }
              investmentCommunicationChannel {
                id
                communicationChannelRef
                createdAt
              }
            }
            
            opportunities: InvestmentOpportunity(
              where: { isDeleted: { _eq: false } }
            ) {
              id
              name
              createdAt
              accountId
            }
          }
        `;

        const result = await graphqlClient.request(query);
        const contacts = result.contacts || [];
        const opportunities = result.opportunities || [];

        // Calculate conversion metrics
        const contactsWithAccounts = contacts.filter((c: any) => c.investmentAccountContact?.[0]?.accountId).length;
        
        // Create a map of accountId to opportunities for easier lookup
        const opportunitiesByAccount = opportunities.reduce((acc: any, opp: any) => {
          if (opp.accountId) {
            if (!acc[opp.accountId]) acc[opp.accountId] = [];
            acc[opp.accountId].push(opp);
          }
          return acc;
        }, {});
        
        const contactsWithOpportunities = contacts.filter((c: any) => {
          const accId = c.investmentAccountContact?.[0]?.accountId;
          return accId && opportunitiesByAccount[accId] && opportunitiesByAccount[accId].length > 0;
        }).length;
        
        const accountsWithContacts = new Set(contacts.map((c: any) => c.investmentAccountContact?.[0]?.accountId).filter(Boolean)).size;
        const avgContactsPerAccount = accountsWithContacts > 0 ? Math.round((contactsWithAccounts / accountsWithContacts) * 10) / 10 : 0;
        
        const contactsWithCommunication = contacts.filter((c: any) => 
          c.investmentCommunicationChannel && c.investmentCommunicationChannel.length > 0
        ).length;
        const responseRate = contacts.length > 0 ? Math.round((contactsWithCommunication / contacts.length) * 100) : 0;

        const conversionMetrics = {
          contactsToOpportunities: contacts.length > 0 ? Math.round((contactsWithOpportunities / contacts.length) * 100) : 0,
          contactsToAccounts: contacts.length > 0 ? Math.round((contactsWithAccounts / contacts.length) * 100) : 0,
          avgContactsPerAccount,
          responseRate
        };

        // Trends over time (last 6 months)
        const monthlyData = new Map();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);

        contacts.forEach((contact: any) => {
          const date = new Date(contact.createdAt);
          if (date >= startDate) {
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData.has(monthKey)) {
              monthlyData.set(monthKey, {
                contactsCreated: 0,
                accountsLinked: 0,
                opportunitiesGenerated: 0
              });
            }
            
            const monthData = monthlyData.get(monthKey);
            monthData.contactsCreated += 1;
            
            const accId = contact.investmentAccountContact?.[0]?.accountId;
            if (accId) {
              monthData.accountsLinked += 1;
            }
            
            if (accId && opportunitiesByAccount[accId] && opportunitiesByAccount[accId].length > 0) {
              monthData.opportunitiesGenerated += 1;
            }
          }
        });

        const trendsOverTime = Array.from(monthlyData.entries())
          .map(([month, data]: [string, any]) => ({
            month,
            contactsCreated: data.contactsCreated,
            accountsLinked: data.accountsLinked,
            opportunitiesGenerated: data.opportunitiesGenerated,
            conversionRate: data.contactsCreated > 0 
              ? Math.round((data.accountsLinked / data.contactsCreated) * 100)
              : 0
          }))
          .sort((a, b) => a.month.localeCompare(b.month));

        // Performance by contact type instead (role removed)
        const byType = contacts.reduce((acc: any, contact: any) => {
          const type = contact.contactType || 'Unknown';
          if (!acc[type]) acc[type] = { count: 0, totalEngagement: 0 };
          acc[type].count += 1;
          let engagementScore = 0;
          if (contact.investmentCommunicationChannel && contact.investmentCommunicationChannel.length > 0) {
            engagementScore += contact.investmentCommunicationChannel.length * 2;
          }
          const accId = contact.investmentAccountContact?.[0]?.accountId;
          if (accId) engagementScore += 3;
          if (accId && opportunitiesByAccount[accId] && opportunitiesByAccount[accId].length > 0) {
            engagementScore += 5;
          }
          acc[type].totalEngagement += engagementScore;
          return acc;
        }, {});

        const performanceByRole = Object.entries(byType)
          .map(([role, data]: [string, any]) => ({
            role,
            count: (data as any).count,
            avgEngagement: Math.round((((data as any).totalEngagement / (data as any).count) * 10)) / 10
          }))
          .sort((a, b) => b.avgEngagement - a.avgEngagement)
          .slice(0, 8);

        // Top sources (simplified - using contact types as proxy)
        const sourcePerformance = contacts.reduce((acc: any, contact: any) => {
          const source = contact.contactType || 'Unknown';
          if (!acc[source]) {
            acc[source] = {
              count: 0,
              conversions: 0
            };
          }
          acc[source].count += 1;
          
          if (contact.accountId) {
            acc[source].conversions += 1;
          }
          return acc;
        }, {});

        const topSources = Object.entries(sourcePerformance)
          .map(([source, data]: [string, any]) => ({
            source,
            count: data.count,
            conversionRate: data.count > 0 ? Math.round((data.conversions / data.count) * 100) : 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setPerformanceData({
          conversionMetrics,
          trendsOverTime,
          topSources,
          performanceByRole
        });

      } catch (error) {
        // console.error('Error fetching contact performance data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (accessToken) {
      fetchPerformanceData();
    }
  }, [accessToken, graphqlClient]);

  if (isLoading) {
    return (
      <Card data-testid="contact-performance-loading">
        <CardContent className="gba:p-6">
          <div className="gba:text-center">Loading contact performance data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!performanceData) {
    return (
      <Card data-testid="contact-performance-error">
        <CardContent className="gba:p-6">
          <div className="gba:text-center gba:text-red-500">
            Error loading contact performance data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="contact-performance-insights">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <TrophyOutlined />
          Contact Performance Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Key Performance Metrics */}
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-4 gba:gap-4 gba:mb-6">
          <div className="gba:p-4 gba:bg-blue-50 gba:rounded-lg gba:border gba:border-blue-200">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <DollarCircleOutlined className="gba:text-blue-600" />
              <span className="gba:text-sm gba:font-medium gba:text-blue-600">Contact to Opportunity</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-blue-900">
              {performanceData.conversionMetrics.contactsToOpportunities}%
            </div>
          </div>

          <div className="gba:p-4 gba:bg-green-50 gba:rounded-lg gba:border gba:border-green-200">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <TeamOutlined className="gba:text-green-600" />
              <span className="gba:text-sm gba:font-medium gba:text-green-600">Contact to Account</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-green-900">
              {performanceData.conversionMetrics.contactsToAccounts}%
            </div>
          </div>

          <div className="gba:p-4 gba:bg-purple-50 gba:rounded-lg gba:border gba:border-purple-200">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <RiseOutlined className="gba:text-purple-600" />
              <span className="gba:text-sm gba:font-medium gba:text-purple-600">Avg Contacts/Account</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-purple-900">
              {performanceData.conversionMetrics.avgContactsPerAccount}
            </div>
          </div>

          <div className="gba:p-4 gba:bg-orange-50 gba:rounded-lg gba:border gba:border-orange-200">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <TrophyOutlined className="gba:text-orange-600" />
              <span className="gba:text-sm gba:font-medium gba:text-orange-600">Response Rate</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-orange-900">
              {performanceData.conversionMetrics.responseRate}%
            </div>
          </div>
        </div>

        {/* Performance Trends Chart */}
        <div className="gba:mb-6">
          <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Contact Performance Trends</h4>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceData.trendsOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="contactsCreated" 
                stackId="1"
                stroke="#3B82F6" 
                fill="#3B82F6"
                fillOpacity={0.6}
                name="Contacts Created"
              />
              <Area 
                type="monotone" 
                dataKey="accountsLinked" 
                stackId="1"
                stroke="#10B981" 
                fill="#10B981"
                fillOpacity={0.6}
                name="Accounts Linked"
              />
              <Area 
                type="monotone" 
                dataKey="opportunitiesGenerated" 
                stackId="1"
                stroke="#F59E0B" 
                fill="#F59E0B"
                fillOpacity={0.6}
                name="Opportunities Generated"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Performance by Role and Top Sources */}
        <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
          {/* Performance by Role */}
          <div>
            <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Performance by Contact Role</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={performanceData.performanceByRole}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="role" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avgEngagement" fill="#8B5CF6" name="Avg Engagement Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Sources */}
          <div>
            <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Top Contact Sources</h4>
            <div className="gba:space-y-3">
              {performanceData.topSources.map((source, index) => (
                <div
                  key={source.source}
                  className="gba:p-3 gba:border gba:rounded-lg gba:bg-gray-50"
                  data-testid={`top-source-${index}`}
                >
                  <div className="gba:flex gba:justify-between gba:items-center">
                    <div>
                      <div className="gba:font-medium">{source.source}</div>
                      <div className="gba:text-sm gba:text-gray-600">
                        {source.count} contacts
                      </div>
                    </div>
                    <Badge variant={source.conversionRate > 50 ? "default" : "outline"}>
                      {source.conversionRate}% conversion
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
export default ContactPerformanceInsights;