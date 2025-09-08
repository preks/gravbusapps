import { useEffect, useState } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

export interface TopRevenueContact { id: string; firstName: string; lastName: string; email: string; accountName: string; totalRevenue: number; wonOpportunities: number }

export const useTopRevenueEarners = (accessToken: string) => {
  const [contacts, setContacts] = useState<TopRevenueContact[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const graphqlClient = useGraphQLClient(accessToken);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const query = `
          query GetTopRevenueContacts {
            contacts: InvestmentContact(where: { isDeleted: { _eq: false } }, orderBy: [{ createdAt: DESC }]) { id firstName lastName email investmentAccountContact { accountId account { id name } } }
            opportunities: InvestmentOpportunity(where: { isDeleted: { _eq: false } }) { id name estimatedAmount opportunityPipelineStage { value } opportunityStatus { code } accountId }
          }
        `;
        const result = await graphqlClient.request<any>(query);
        const c = (result.contacts || []).map((x: any) => ({ id: x.id, firstName: x.firstName, lastName: x.lastName, email: x.email, accountId: x.investmentAccountContact?.[0]?.accountId, accountName: x.investmentAccountContact?.[0]?.account?.name }));
        const o = result.opportunities || [];
        const list = c.map((contact: any) => {
          const accOpps = o.filter((opp: any) => opp.accountId === contact.accountId);
          const won = accOpps.filter((opp: any) => opp.opportunityStatus?.code === 'WON' || opp.opportunityPipelineStage?.value === 'won');
          const totalRevenue = won.reduce((s: number, opp: any) => s + (opp.estimatedAmount || 0), 0);
          return { id: contact.id, firstName: contact.firstName || 'Unknown', lastName: contact.lastName || 'Contact', email: contact.email || 'No email', accountName: contact.accountName || 'No Account', totalRevenue, wonOpportunities: won.length } as TopRevenueContact;
        }).filter((x: TopRevenueContact) => x.totalRevenue > 0).sort((a: TopRevenueContact, b: TopRevenueContact) => b.totalRevenue - a.totalRevenue).slice(0, 10);
        setContacts(list);
      } finally { setIsLoading(false); }
    };
    if (accessToken) fetchData();
  }, [accessToken, graphqlClient]);

  return { contacts, isLoading };
};


