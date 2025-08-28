import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@newwork/nw-design-system";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { ContactsOutlined, TeamOutlined, BankOutlined } from "@ant-design/icons";
import { ContactInsightsCharts } from "./ContactInsightsCharts";

interface ContactInsightsData {
  totalContacts: number;
  contactsByType: {
    type: string;
    count: number;
    percentage: number;
  }[];
  contactsByAccount: {
    accountName: string;
    contactCount: number;
  }[];
  recentContacts: {
    id: string;
    name: string;
    accountName?: string;
    createdDate: string;
    daysSinceCreated: number;
  }[];
}

interface ContactVelocityAnalysisProps extends BusinessAppContextProps {
  data?: any;
}

// Component for displaying contact insights and analytics

export const ContactVelocityAnalysis: React.FC<
  ContactVelocityAnalysisProps
> = ({ accessToken }) => {
  const [insightsData, setInsightsData] = useState<ContactInsightsData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const graphqlClient = useGraphQLClient(accessToken);

  useEffect(() => {
    const fetchInsightsData = async () => {
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
              account {
                id
                name
              }
            }
          }
        `;

        const result = await graphqlClient.request(query);
        const contacts = result.contacts || [];
        const currentDate = new Date();

        // Process contact insights
        const totalContacts = contacts.length;

        // Group contacts by type
        const typeGroups = contacts.reduce((acc: any, contact: any) => {
          const type = contact.contactType || "Unknown";
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});

        const contactsByType = Object.entries(typeGroups)
          .map(([type, count]: [string, any]) => ({
            type,
            count,
            percentage: Math.round((count / totalContacts) * 100),
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        // Group contacts by account
        const accountGroups = contacts.reduce((acc: any, contact: any) => {
          const accountName = contact.account?.name || "No Account";
          acc[accountName] = (acc[accountName] || 0) + 1;
          return acc;
        }, {});

        const contactsByAccount = Object.entries(accountGroups)
          .map(([accountName, count]: [string, any]) => ({
            accountName,
            contactCount: count,
          }))
          .sort((a, b) => b.contactCount - a.contactCount)
          .slice(0, 10);

        // Process recent contacts
        const recentContacts = contacts.slice(0, 5).map((contact: any) => {
          const createdDate = new Date(contact.createdAt);
          const daysSinceCreated = Math.floor(
            (currentDate.getTime() - createdDate.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          return {
            id: contact.id,
            name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
            accountName: contact.account?.name,
            createdDate: contact.createdAt,
            daysSinceCreated,
          };
        });

        setInsightsData({
          totalContacts,
          contactsByType,
          contactsByAccount,
          recentContacts,
        });
      } catch (error) {
        // console.error("Error fetching contact insights data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (accessToken) {
      fetchInsightsData();
    }
  }, [accessToken, graphqlClient]);

  if (isLoading) {
    return (
      <Card data-testid="contact-insights-loading">
        <CardContent className="gba:p-6">
          <div className="gba:text-center">
            Loading contact insights data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insightsData) {
    return (
      <Card data-testid="contact-insights-error">
        <CardContent className="gba:p-6">
          <div className="gba:text-center gba:text-red-500">
            Error loading contact insights data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="contact-insights-analysis">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <ContactsOutlined />
          Contact Insights Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Key Metrics */}
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-4 gba:gap-4 gba:mb-6">
          <div className="gba:p-4 gba:bg-blue-50 gba:rounded-lg gba:border gba:border-blue-200">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <ContactsOutlined className="gba:text-blue-600" />
              <span className="gba:text-sm gba:font-medium gba:text-blue-600">
                Total Contacts
              </span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-blue-900">
              {insightsData.totalContacts}
            </div>
          </div>

          <div className="gba:p-4 gba:bg-purple-50 gba:rounded-lg gba:border gba:border-purple-200">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <TeamOutlined className="gba:text-purple-600" />
              <span className="gba:text-sm gba:font-medium gba:text-purple-600">
                Contact Types
              </span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-purple-900">
              {insightsData.contactsByType.length}
            </div>
          </div>

          <div className="gba:p-4 gba:bg-orange-50 gba:rounded-lg gba:border gba:border-orange-200">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <BankOutlined className="gba:text-orange-600" />
              <span className="gba:text-sm gba:font-medium gba:text-orange-600">
                Linked Accounts
              </span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-orange-900">
              {
                insightsData.contactsByAccount.filter(
                  (acc) => acc.accountName !== "No Account"
                ).length
              }
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <ContactInsightsCharts contactsByType={insightsData.contactsByType} />

        {/* Top Accounts and Recent Contacts */}
        <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
          {/* Top Accounts */}
          <div>
            <h4 className="gba:text-lg gba:font-semibold gba:mb-4">
              Top Accounts by Contact Count
            </h4>
            <div className="gba:space-y-3 gba:max-h-80 gba:overflow-y-auto">
              {insightsData.contactsByAccount
                .slice(0, 8)
                .map((account, index) => (
                  <div
                    key={account.accountName}
                    className="gba:p-3 gba:bg-gray-50 gba:border gba:border-gray-200 gba:rounded-lg"
                    data-testid={`top-account-${index}`}
                  >
                    <div className="gba:flex gba:justify-between gba:items-center">
                      <div className="gba:flex-1">
                        <h5 className="gba:font-medium gba:text-gray-900 gba:text-sm">
                          {account.accountName}
                        </h5>
                      </div>
                      <div className="gba:text-right">
                        <Badge variant="outline">
                          {account.contactCount} contact
                          {account.contactCount !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Recent Contacts */}
          <div>
            <h4 className="gba:text-lg gba:font-semibold gba:mb-4">
              Recent Contacts
            </h4>
            <div className="gba:space-y-3">
              {insightsData.recentContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="gba:p-3 gba:bg-gray-50 gba:border gba:border-gray-200 gba:rounded-lg"
                  data-testid={`recent-contact-${contact.id}`}
                >
                  <div className="gba:flex gba:justify-between gba:items-start">
                    <div className="gba:flex-1">
                      <h5 className="gba:font-medium gba:text-gray-900 gba:text-sm">
                        {contact.name}
                      </h5>
                      {contact.accountName && (
                        <p className="gba:text-xs gba:text-gray-600 gba:mt-1">
                          {contact.accountName}
                        </p>
                      )}
                    </div>
                    <div className="gba:text-right">
                      <Badge variant="outline">
                        {contact.daysSinceCreated === 0
                          ? "Today"
                          : `${contact.daysSinceCreated}d ago`}
                      </Badge>
                    </div>
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
