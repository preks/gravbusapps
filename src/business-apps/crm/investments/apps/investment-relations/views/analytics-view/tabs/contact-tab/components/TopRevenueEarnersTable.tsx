import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { TrophyOutlined } from '@ant-design/icons';

interface TopRevenueContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountName: string;
  totalRevenue: number;
  wonOpportunities: number;
}

interface TopRevenueEarnersTableProps extends BusinessAppContextProps {}

export const TopRevenueEarnersTable: React.FC<TopRevenueEarnersTableProps> = ({ accessToken }) => {
  const [topRevenueContacts, setTopRevenueContacts] = useState<TopRevenueContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const graphqlClient = useGraphQLClient(accessToken);

  useEffect(() => {
    const fetchTopRevenueContacts = async () => {
      if (!accessToken) return;

      try {
        setIsLoading(true);

        const query = `
          query GetTopRevenueContacts {
            contacts: InvestmentContact(
              where: { 
                isDeleted: { _eq: false }
                investmentAccountContact: {accountId: { _isNull: false }}
              }
              orderBy: [{ createdAt: DESC }]
            ) {
              id
              firstName
              lastName
              email
              investmentAccountContact { account { id name } accountId }
            }
            opportunities: InvestmentOpportunity(
              where: { 
                isDeleted: { _eq: false }
                accountId: { _neq: null }
                opportunityStatus: {code: {_eq: "WON"}}
              }
            ) {
              id
              name
              estimatedAmount
              accountId
            }
          }
        `;

        const result = await graphqlClient.request<{ contacts: any[]; opportunities: any[] }>(query);
        const contacts = result.contacts || [];
        const opportunities = result.opportunities || [];

        // Calculate revenue per contact
        const contactsWithRevenue = contacts.map(contact => {
          // Find opportunities for this contact's account
          const accountId = contact.investmentAccountContact?.[0]?.accountId;
          const accountOpportunities = accountId ? opportunities.filter(
            (opp: any) => opp.accountId === accountId
          ) : [];
          
          const totalRevenue = accountOpportunities.reduce(
            (sum: number, opp: any) => sum + (opp.estimatedAmount || 0), 
            0
          );

          return {
            id: contact.id,
            firstName: contact.firstName || 'Unknown',
            lastName: contact.lastName || 'Contact',
            email: contact.email || 'No email',
            accountName: contact.investmentAccountContact?.[0]?.account?.name || 'No Account',
            totalRevenue,
            wonOpportunities: accountOpportunities.length
          } as TopRevenueContact;
        }).filter(contact => contact.totalRevenue > 0)
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, 10); // Top 10

        setTopRevenueContacts(contactsWithRevenue);
      } catch (error) {
        // console.error('Error fetching top revenue contacts:', error);
        setTopRevenueContacts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopRevenueContacts();
  }, [accessToken, graphqlClient]);

  return (
    <Card data-testid="top-revenue-earners-section">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <TrophyOutlined />
          Top Revenue Earners
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="gba:text-center gba:text-gray-500 gba:py-8">
            Loading revenue data...
          </div>
        ) : topRevenueContacts.length > 0 ? (
          <div className="gba:space-y-3">
            {topRevenueContacts.map((contact, index) => (
              <div
                key={contact.id}
                className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg"
                data-testid={`top-revenue-contact-${index}`}
              >
                <div className="gba:flex gba:items-center gba:gap-3">
                  <Badge variant="outline">#{index + 1}</Badge>
                  <div>
                    <div className="gba:font-medium">
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div className="gba:text-sm gba:text-gray-600">
                      {contact.accountName} • {contact.wonOpportunities} won opportunities
                    </div>
                    <div className="gba:text-xs gba:text-gray-500">
                      {contact.email}
                    </div>
                  </div>
                </div>
                <div className="gba:text-right">
                  <div className="gba:font-bold">
                    ${contact.totalRevenue.toLocaleString()}
                  </div>
                  <div className="gba:text-sm gba:text-gray-600">Revenue</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="gba:text-center gba:text-gray-500 gba:py-8">
            No contacts with revenue available
          </div>
        )}
      </CardContent>
    </Card>
  );
};
export default TopRevenueEarnersTable;