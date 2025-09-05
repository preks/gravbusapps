import { useEffect, useState } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

export interface ContactQualityData {
  overallScore: number;
  qualityDistribution: { category: string; count: number; percentage: number }[];
  completenessMetrics: { metric: string; completed: number; total: number; percentage: number }[];
  issuesSummary: { missingEmails: number; missingPhones: number; missingAccounts: number; duplicatePotential: number };
}

export const useContactQualityData = (accessToken: string) => {
  const [data, setData] = useState<ContactQualityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const graphqlClient = useGraphQLClient(accessToken);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const query = `
          query GetContactQualityData {
            contacts: Contact(where: { isDeleted: { _eq: false } }) {
              id firstName lastName email phone accountId contactType createdAt updatedAt
              account { id name }
              communicationChannels { id communicationChannelRef }
              addresses { id country { value } }
            }
          }
        `;
        const result = await graphqlClient.request<any>(query);
        const contacts = result.contacts || [];

        const contactsWithScores = contacts.map((c: any) => {
          let score = 0; let max = 10;
          if (c.firstName) score += 1; if (c.lastName) score += 1; if (c.email) score += 1; if (c.phone) score += 1;
          if (c.accountId && c.account) score += 2;
          if (c.contactType) score += 1;
          if (c.communicationChannels && c.communicationChannels.length > 0) score += 1;
          if (c.addresses && c.addresses.length > 0) score += 1;
          const qualityScore = Math.round((score / max) * 100);
          let category = 'Poor'; if (qualityScore >= 80) category = 'Excellent'; else if (qualityScore >= 60) category = 'Good'; else if (qualityScore >= 40) category = 'Fair';
          return { ...c, qualityScore, category };
        });

        const overallScore = contacts.length > 0 ? Math.round(contactsWithScores.reduce((s: number, c: any) => s + c.qualityScore, 0) / contacts.length) : 0;
        const distMap = contactsWithScores.reduce((acc: any, c: any) => { acc[c.category] = (acc[c.category] || 0) + 1; return acc; }, {});
        const qualityDistribution = Object.entries(distMap).map(([category, count]: [string, any]) => ({ category, count, percentage: contacts.length > 0 ? Math.round((count as number / contacts.length) * 100) : 0 }));
        const completenessMetrics = [
          { metric: 'Email Address', completed: contacts.filter((x: any) => x.email).length, total: contacts.length, percentage: contacts.length ? Math.round(contacts.filter((x: any) => x.email).length / contacts.length * 100) : 0 },
          { metric: 'Phone Number', completed: contacts.filter((x: any) => x.phone).length, total: contacts.length, percentage: contacts.length ? Math.round(contacts.filter((x: any) => x.phone).length / contacts.length * 100) : 0 },
          { metric: 'Account Link', completed: contacts.filter((x: any) => x.accountId).length, total: contacts.length, percentage: contacts.length ? Math.round(contacts.filter((x: any) => x.accountId).length / contacts.length * 100) : 0 },
          { metric: 'Communication Channels', completed: contacts.filter((x: any) => x.communicationChannels && x.communicationChannels.length > 0).length, total: contacts.length, percentage: contacts.length ? Math.round(contacts.filter((x: any) => x.communicationChannels && x.communicationChannels.length > 0).length / contacts.length * 100) : 0 },
        ];
        const emailGroups = contacts.reduce((acc: any, c: any) => { if (c.email) { const e = c.email.toLowerCase(); acc[e] = (acc[e] || 0) + 1; } return acc; }, {});
        const issuesSummary = { missingEmails: contacts.filter((x: any) => !x.email).length, missingPhones: contacts.filter((x: any) => !x.phone).length, missingAccounts: contacts.filter((x: any) => !x.accountId).length, duplicatePotential: Object.values(emailGroups).filter((n: any) => (n as number) > 1).length as number };

        setData({ overallScore, qualityDistribution, completenessMetrics, issuesSummary });
      } finally { setIsLoading(false); }
    };
    if (accessToken) fetchData();
  }, [accessToken, graphqlClient]);

  return { data, isLoading };
};


