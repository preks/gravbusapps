import { useEffect, useState } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

export interface ContactInsightAccount { accountName: string; contactCount: number }
export interface ContactInsightRecent { id: string; name: string; accountName?: string; createdDate: string; daysSinceCreated: number }

export interface ContactInsightsData {
  totalContacts: number;
  contactsByType: { type: string; count: number; percentage: number }[];
  topAccountsByContacts: ContactInsightAccount[];
  recentContacts: ContactInsightRecent[];
}

export const useContactInsights = (accessToken: string) => {
  const [data, setData] = useState<ContactInsightsData>({ totalContacts: 0, contactsByType: [], topAccountsByContacts: [], recentContacts: [] });
  const [isLoading, setIsLoading] = useState(true);
  const graphqlClient = useGraphQLClient(accessToken);

  useEffect(() => {
    const fetch = async () => {
      try {
        setIsLoading(true);
        const query = `
          query GetContactInsightsData {
            contacts: Contact(
              where: { isDeleted: { _eq: false } }
              orderBy: [{ createdAt: DESC }]
            ) {
              id
              firstName
              lastName
              email
              contactType
              createdAt
              account { id name }
            }
          }
        `;
        const result = await graphqlClient.request<any>(query);
        const contacts = result.contacts || [];
        const currentDate = new Date();
        const totalContacts = contacts.length;
        const typeGroups = contacts.reduce((acc: any, c: any) => { const t = c.contactType || 'Unknown'; acc[t] = (acc[t] || 0) + 1; return acc; }, {});
        const contactsByType = Object.entries(typeGroups).map(([type, count]: [string, any]) => ({ type, count: count as number, percentage: totalContacts > 0 ? Math.round((count as number / totalContacts) * 100) : 0 })).sort((a,b)=>b.count-a.count).slice(0,6);
        const accountGroups = contacts.reduce((acc: any, c: any) => { const name = c.account?.name || 'No Account'; acc[name] = (acc[name] || 0) + 1; return acc; }, {});
        const topAccountsByContacts = Object.entries(accountGroups).map(([accountName, count]: [string, any]) => ({ accountName, contactCount: count as number })).sort((a, b) => b.contactCount - a.contactCount).slice(0, 10);
        const recentContacts = contacts.slice(0, 5).map((c: any) => { const createdDate = new Date(c.createdAt); const daysSinceCreated = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)); return { id: c.id, name: `${c.firstName || ''} ${c.lastName || ''}`.trim(), accountName: c.account?.name, createdDate: c.createdAt, daysSinceCreated } as ContactInsightRecent; });
        setData({ totalContacts, contactsByType, topAccountsByContacts, recentContacts });
      } finally { setIsLoading(false); }
    };
    if (accessToken) fetch();
  }, [accessToken, graphqlClient]);

  return { data, isLoading };
};


