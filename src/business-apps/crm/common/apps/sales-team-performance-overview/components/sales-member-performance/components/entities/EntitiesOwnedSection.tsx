import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
} from "@newwork/nw-design-system";
import { PiUsers } from "react-icons/pi";
import { EntitiesOwned, EntityType } from "../../types";
import { LeadsTable } from "./index";
import { EmployeeAccountsTab } from "./EmployeeAccountsTab";
import { EmployeeContactsTab } from "./EmployeeContactsTab";
import { EmployeeLeadsTab } from "./EmployeeLeadsTab";
import { EmployeeOpportunitiesTab } from "./EmployeeOpportunitiesTab";
import { useEmployeeEntityCounts } from "../../hooks/useEmployeeEntityCounts";

const DATA_TEST_ID_PREFIX = "EntitiesOwnedSection";

interface EntitiesOwnedSectionProps {
  employeeId: string;
  entitiesOwned: EntitiesOwned;
  accessToken: string;
  isLoading?: boolean;
}

export const EntitiesOwnedSection: React.FC<EntitiesOwnedSectionProps> = ({
  employeeId,
  entitiesOwned,
  accessToken,
  isLoading = false,
}) => {
  const [activeEntityTab, setActiveEntityTab] = useState<EntityType>("leads");
  const [leadsTotal, setLeadsTotal] = useState<number>(0);
  const [contactsTotal, setContactsTotal] = useState<number>(0);
  const [opportunitiesTotal, setOpportunitiesTotal] = useState<number>(0);
  const [accountsTotal, setAccountsTotal] = useState<number>(0);

  // Refs for scroll position management
  const scrollPositionRef = useRef<number>(0);
  const tabContentRef = useRef<HTMLDivElement>(null);

  // Handle entity tab change with scroll position preservation
  const handleEntityTabChange = (value: string) => {
    // Save current scroll position before any changes
    scrollPositionRef.current = window.scrollY;

    // Prevent scroll position from jumping during tab change
    document.body.style.scrollBehavior = "auto";

    setActiveEntityTab(value as EntityType);

    // Restore scroll position immediately after state update
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositionRef.current);

      // Re-enable smooth scrolling after position is restored
      setTimeout(() => {
        document.body.style.scrollBehavior = "";
      }, 100);
    });
  };

  // Load initial counts for all entities when employee changes
  const { counts: initialCounts, loading: countsLoading } =
    useEmployeeEntityCounts(employeeId, accessToken);

  // Update individual count states when initial counts are loaded
  useEffect(() => {
    if (!countsLoading) {
      setLeadsTotal(initialCounts.leads);
      setContactsTotal(initialCounts.contacts);
      setOpportunitiesTotal(initialCounts.opportunities);
      setAccountsTotal(initialCounts.accounts);
    }
  }, [initialCounts, countsLoading]);

  // Get count for each entity type
  const entityCounts = {
    leads: leadsTotal,
    contacts: contactsTotal,
    opportunities: opportunitiesTotal,
    accounts: accountsTotal,
  };

  // Handle leads total change
  const handleLeadsTotalChange = (total: number) => {
    setLeadsTotal(total);
  };

  // Handle contacts total change
  const handleContactsTotalChange = (total: number) => {
    setContactsTotal(total);
  };

  // Handle opportunities total change
  const handleOpportunitiesTotalChange = (total: number) => {
    setOpportunitiesTotal(total);
  };

  // Handle accounts total change
  const handleAccountsTotalChange = (total: number) => {
    setAccountsTotal(total);
  };

  // Entity tab configuration
  const entityTabs = [
    {
      key: "leads" as EntityType,
      label: "Leads",
      count: entityCounts.leads,
      loading: countsLoading,
    },
    {
      key: "contacts" as EntityType,
      label: "Contacts",
      count: entityCounts.contacts,
      loading: countsLoading,
    },
    {
      key: "opportunities" as EntityType,
      label: "Opportunities",
      count: entityCounts.opportunities,
      loading: countsLoading,
    },
    {
      key: "accounts" as EntityType,
      label: "Accounts",
      count: entityCounts.accounts,
      loading: countsLoading,
    },
  ];

  return (
    <Card
      className="gba:w-full"
      data-testid={`${DATA_TEST_ID_PREFIX}-container`}
    >
      <CardHeader>
        <CardTitle
          data-testid={`${DATA_TEST_ID_PREFIX}-title`}
          className="gba:flex gba:items-center gba:gap-2"
        >
          <PiUsers className="gba:text-black" size={20} />
          Entities Owned
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:px-2 gba:py-6">
        <Tabs
          value={activeEntityTab}
          onValueChange={handleEntityTabChange}
          className="gba:w-full"
          data-testid={`${DATA_TEST_ID_PREFIX}-tabs`}
        >
          <TabsList className="gba:grid gba:w-full gba:grid-cols-4 gba:mb-4">
            {entityTabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="gba:flex gba:items-center gba:gap-2"
                data-testid={`${DATA_TEST_ID_PREFIX}-tab-${tab.key}`}
              >
                <span>{tab.label}</span>
                <Badge
                  variant="secondary"
                  className="gba:ml-1"
                  data-testid={`${DATA_TEST_ID_PREFIX}-tab-count-${tab.key}`}
                >
                  {tab.loading ? "..." : tab.count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Contents - Stabilized container */}
          <div
            ref={tabContentRef}
            className="gba:h-[800px] gba:overflow-auto"
            data-testid={`${DATA_TEST_ID_PREFIX}-tab-content-container`}
          >
            <TabsContent
              value="leads"
              className="gba:m-0"
              data-testid={`${DATA_TEST_ID_PREFIX}-content-leads`}
            >
              <EmployeeLeadsTab
                employeeId={employeeId}
                accessToken={accessToken}
                onTotalChange={handleLeadsTotalChange}
              />
            </TabsContent>

            <TabsContent
              value="contacts"
              className="gba:m-0"
              data-testid={`${DATA_TEST_ID_PREFIX}-content-contacts`}
            >
              <EmployeeContactsTab
                employeeId={employeeId}
                accessToken={accessToken}
                onTotalChange={handleContactsTotalChange}
              />
            </TabsContent>

            <TabsContent
              value="opportunities"
              className="gba:m-0"
              data-testid={`${DATA_TEST_ID_PREFIX}-content-opportunities`}
            >
              <EmployeeOpportunitiesTab
                employeeId={employeeId}
                accessToken={accessToken}
                onTotalChange={handleOpportunitiesTotalChange}
              />
            </TabsContent>

            <TabsContent
              value="accounts"
              className="gba:m-0"
              data-testid={`${DATA_TEST_ID_PREFIX}-content-accounts`}
            >
              <EmployeeAccountsTab
                employeeId={employeeId}
                accessToken={accessToken}
                onTotalChange={handleAccountsTotalChange}
              />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EntitiesOwnedSection;
