import { useState, useEffect } from "react";
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";

// Define types
interface ExpenseGroupCatalogEntry {
  id: string;
  name: string;
  description?: string;
}

interface UseExpenseGroupCatalogResult {
  isLoading: boolean;
  error: string | null;
  expenseGroups: Record<string, ExpenseGroupCatalogEntry>;
}

// GraphQL query to fetch expense group catalog entries
const GET_EXPENSE_GROUPS = `
  query GetExpenseGroups($activeUserLocale: String) {
    expenseGroups: CatalogEntry(
      where: {
        catalog: {
          version: { _eq: "v1" },
          identifier: { _eq: "ExpenseGroup" }
        }
      }
    ) {
      id
      name: additionalValue1
      description: additionalValue2
      translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        name: additionalValue1
        description: additionalValue2
      }
    }
  }
`;

/**
 * Hook to fetch expense group catalog entries
 */
export const useExpenseGroupCatalog = (accessToken: string): UseExpenseGroupCatalogResult => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expenseGroups, setExpenseGroups] = useState<Record<string, ExpenseGroupCatalogEntry>>({});

  const graphqlClient = useGraphqlClient(accessToken);

  useEffect(() => {
    const fetchExpenseGroups = async () => {
      if (!accessToken) {
        setError("Missing authentication token");
        setIsLoading(false);
        return;
      }

      try {
        // Get current user locale
        const activeUserLocale = window.localStorage.getItem("activeUserLocale") || "en";

        const response = await graphqlClient.request(GET_EXPENSE_GROUPS, { activeUserLocale });

        if (response?.expenseGroups) {
          // Create a map of id -> catalog entry
          const groupsMap: Record<string, ExpenseGroupCatalogEntry> = {};

          response.expenseGroups.forEach((group: any) => {
            // Use translated name if available, otherwise use default name
            const translatedName = group.translations?.[0]?.name;
            const translatedDescription = group.translations?.[0]?.description;

            // Store by ID for direct lookups
            groupsMap[group.id] = {
              id: group.id,
              name: translatedName || group.name || group.id,
              description: translatedDescription || group.description,
            };

            // Also store by reference format (ExpenseGroup:v1:CATEGORY_NAME)
            const refKey = `ExpenseGroup:v1:${group.id.toUpperCase()}`;
            groupsMap[refKey] = {
              id: group.id,
              name: translatedName || group.name || group.id,
              description: translatedDescription || group.description,
            };
          });

          // Add special case for uncategorized
          groupsMap["Uncategorized"] = {
            id: "Uncategorized",
            name: "Uncategorized",
            description: "Uncategorized expenses",
          };

          setExpenseGroups(groupsMap);
        }
      } catch (err) {
        console.error("Error fetching expense group catalog:", err);
        setError("Failed to fetch expense categories");
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenseGroups();
  }, [accessToken, graphqlClient]);

  return { isLoading, error, expenseGroups };
};
