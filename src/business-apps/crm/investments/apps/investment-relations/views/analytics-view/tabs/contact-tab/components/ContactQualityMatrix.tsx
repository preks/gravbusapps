import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

interface ContactQualityData {
  overallScore: number;
  qualityDistribution: {
    category: string;
    count: number;
    percentage: number;
  }[];
  completenessMetrics: {
    metric: string;
    completed: number;
    total: number;
    percentage: number;
  }[];
  issuesSummary: {
    missingEmails: number;
    missingPhones: number;
    missingAccounts: number;
    duplicatePotential: number;
  };
}

interface ContactQualityMatrixProps extends BusinessAppContextProps {
  data?: any;
}

const QUALITY_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6B7280'];

export const ContactQualityMatrix: React.FC<ContactQualityMatrixProps> = ({
  accessToken
}) => {
  const [qualityData, setQualityData] = useState<ContactQualityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const graphqlClient = useGraphQLClient(accessToken);

  useEffect(() => {
    const fetchQualityData = async () => {
      try {
        setIsLoading(true);

        const query = `
          query GetContactQualityData {
            contacts: InvestmentContact(
              where: { isDeleted: { _eq: false } }
            ) {
              id
              firstName
              lastName
              email
              phone
              contactRole
              contactType
              createdAt
              updatedAt
              investmentAccountContact { accountId account { id name } }
              investmentCommunicationChannel {
                id
                communicationChannelRef
              }
              investmentAddress {
                id
                country {
                  value
                }
              }
            }
          }
        `;

        const result = await graphqlClient.request(query);
        const contacts = result.contacts || [];

        // Calculate quality score for each contact
        const contactsWithScores = contacts.map((contact: any) => {
          let score = 0;
          let maxScore = 10;

          // Basic info completeness (4 points)
          if (contact.firstName) score += 1;
          if (contact.lastName) score += 1;
          if (contact.email) score += 1;
          if (contact.phone) score += 1;

          // Account association (2 points)
          if (contact.investmentAccountContact?.[0]?.accountId && contact.investmentAccountContact?.[0]?.account) score += 2;

          // Role and type info (2 points)
          if (contact.contactRole) score += 1;
          if (contact.contactType) score += 1;

          // Activity indicators (2 points)
          if (contact.investmentCommunicationChannel && contact.investmentCommunicationChannel.length > 0) score += 1;
          if (contact.investmentAddress && contact.investmentAddress.length > 0) score += 1;

          const qualityScore = Math.round((score / maxScore) * 100);

          let category = 'Poor';
          if (qualityScore >= 80) category = 'Excellent';
          else if (qualityScore >= 60) category = 'Good';
          else if (qualityScore >= 40) category = 'Fair';

          return { ...contact, qualityScore, category };
        });

        // Calculate overall score
        const overallScore = contacts.length > 0
          ? Math.round(
              contactsWithScores.reduce(
                (sum: number, contact: any) => sum + contact.qualityScore,
                0
              ) / contacts.length
            )
          : 0;

        // Quality distribution
        const distribution = contactsWithScores.reduce((acc: any, contact: any) => {
          acc[contact.category] = (acc[contact.category] || 0) + 1;
          return acc;
        }, {});

        const qualityDistribution = Object.entries(distribution).map(([category, count]: [string, any]) => ({
          category,
          count,
          percentage: Math.round((count / contacts.length) * 100)
        }));

        // Completeness metrics
        const completenessMetrics = [
          {
            metric: 'Email Address',
            completed: contacts.filter((c: any) => c.email).length,
            total: contacts.length,
            percentage: Math.round((contacts.filter((c: any) => c.email).length / contacts.length) * 100)
          },
          {
            metric: 'Phone Number',
            completed: contacts.filter((c: any) => c.phone).length,
            total: contacts.length,
            percentage: Math.round((contacts.filter((c: any) => c.phone).length / contacts.length) * 100)
          },
          {
            metric: 'Account Link',
            completed: contacts.filter((c: any) => c.accountId).length,
            total: contacts.length,
            percentage: Math.round((contacts.filter((c: any) => c.accountId).length / contacts.length) * 100)
          },
          {
            metric: 'Contact Role',
            completed: contacts.filter((c: any) => c.contactRole).length,
            total: contacts.length,
            percentage: Math.round((contacts.filter((c: any) => c.contactRole).length / contacts.length) * 100)
          },
          {
            metric: 'Communication Channels',
            completed: contacts.filter((c: any) => c.communicationChannels && c.communicationChannels.length > 0).length,
            total: contacts.length,
            percentage: Math.round((contacts.filter((c: any) => c.communicationChannels && c.communicationChannels.length > 0).length / contacts.length) * 100)
          }
        ];

        // Issues summary
        const issuesSummary = {
          missingEmails: contacts.filter((c: any) => !c.email).length,
          missingPhones: contacts.filter((c: any) => !c.phone).length,
          missingAccounts: contacts.filter((c: any) => !(c.investmentAccountContact?.[0]?.accountId)).length,
          duplicatePotential: 0 // Simple heuristic - would need more complex logic
        };

        // Simple duplicate detection based on email similarity
        const emailGroups = contacts.reduce((acc: any, contact: any) => {
          if (contact.email) {
            const email = contact.email.toLowerCase();
            acc[email] = (acc[email] || 0) + 1;
          }
          return acc;
        }, {});

        issuesSummary.duplicatePotential = Object.values(emailGroups).filter((count: any) => count > 1).length;

        setQualityData({
          overallScore,
          qualityDistribution,
          completenessMetrics,
          issuesSummary
        });

      } catch (error) {
        console.error('Error fetching contact quality data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (accessToken) {
      fetchQualityData();
    }
  }, [accessToken, graphqlClient]);

  if (isLoading) {
    return (
      <Card data-testid="contact-quality-loading">
        <CardContent className="gba:p-6">
          <div className="gba:text-center">Loading contact quality data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!qualityData) {
    return (
      <Card data-testid="contact-quality-error">
        <CardContent className="gba:p-6">
          <div className="gba:text-center gba:text-red-500">
            Error loading contact quality data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="contact-quality-matrix">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <CheckCircleOutlined />
          Contact Quality Matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Score */}
        <div className="gba:text-center gba:mb-6">
          <div className="gba:text-4xl gba:font-bold gba:text-blue-600 gba:mb-2">
            {qualityData.overallScore}%
          </div>
          <div className="gba:text-lg gba:text-gray-600">Overall Data Quality Score</div>
        </div>

        {/* Quality Distribution Chart */}
        <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6 gba:mb-6">
          <div>
            <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Quality Distribution</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={qualityData.qualityDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ category, percentage }) => `${category}: ${percentage}%`}
                >
                  {qualityData.qualityDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={QUALITY_COLORS[index % QUALITY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Completeness Metrics */}
          <div>
            <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Data Completeness</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={qualityData.completenessMetrics} layout="horizontal">
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="metric" type="category" width={120} />
                <Tooltip formatter={(value) => [`${value}%`, 'Completeness']} />
                <Bar dataKey="percentage" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Issues Summary */}
        <div>
          <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Data Quality Issues</h4>
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-4 gba:gap-4">
            <div className="gba:p-4 gba:border gba:rounded-lg gba:bg-red-50 gba:border-red-200">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <ExclamationCircleOutlined className="gba:text-red-600" />
                <span className="gba:text-sm gba:font-medium gba:text-red-600">Missing Emails</span>
              </div>
              <div className="gba:text-2xl gba:font-bold gba:text-red-900">
                {qualityData.issuesSummary.missingEmails}
              </div>
            </div>

            <div className="gba:p-4 gba:border gba:rounded-lg gba:bg-orange-50 gba:border-orange-200">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <WarningOutlined className="gba:text-orange-600" />
                <span className="gba:text-sm gba:font-medium gba:text-orange-600">Missing Phones</span>
              </div>
              <div className="gba:text-2xl gba:font-bold gba:text-orange-900">
                {qualityData.issuesSummary.missingPhones}
              </div>
            </div>

            <div className="gba:p-4 gba:border gba:rounded-lg gba:bg-yellow-50 gba:border-yellow-200">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <InfoCircleOutlined className="gba:text-yellow-600" />
                <span className="gba:text-sm gba:font-medium gba:text-yellow-600">Missing Accounts</span>
              </div>
              <div className="gba:text-2xl gba:font-bold gba:text-yellow-900">
                {qualityData.issuesSummary.missingAccounts}
              </div>
            </div>

            <div className="gba:p-4 gba:border gba:rounded-lg gba:bg-purple-50 gba:border-purple-200">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <ExclamationCircleOutlined className="gba:text-purple-600" />
                <span className="gba:text-sm gba:font-medium gba:text-purple-600">Potential Duplicates</span>
              </div>
              <div className="gba:text-2xl gba:font-bold gba:text-purple-900">
                {qualityData.issuesSummary.duplicatePotential}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
export default ContactQualityMatrix;