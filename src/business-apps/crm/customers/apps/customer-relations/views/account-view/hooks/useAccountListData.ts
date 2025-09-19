import { useState, useCallback } from "react";
import { Account, UseAccountListDataReturn } from "../types";
import { useGetAccountsData, AccountData } from "../queries/AccountQueries";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { enforceQueryLimit } from "../../../../../../common/utils/queryLimits";

interface CompanyFilter {
  id: string;
  name: string;
}

interface UseAccountListDataParams {
  search?: string;
  sortField: string;
  sortOrder: "ASC" | "DESC";
  context: BusinessAppContextProps;
  sourceApp?: string;
  // accountTypes?: string[]; // REMOVED: field does not exist in GraphQL schema
  companies?: CompanyFilter[];
  contactInfo?: string[];
  industries?: string[];
  ownerEmployeeIds?: string[];
  legalFormIds?: string[];
  annualRevenueIds?: string[];
  numberOfEmployeesIds?: string[];
  countryIds?: string[];
  regionIds?: string[];
  cities?: string[];
  websiteFilters?: string[];
  phoneFilters?: string[];
  emailFilters?: string[];
  faxFilters?: string[];
  createdAfter?: string;
  createdBefore?: string;
}

const transformAccountData = (apiAccount: AccountData): Account => {
  const city = apiAccount.addresses?.[0]?.city;
  const country = apiAccount.addresses?.[0]?.country?.value;
  const region = apiAccount.addresses?.[0]?.region?.value;
  const location = apiAccount.geographicPresence || "";

  // Extract primary contact information from accountContacts
  const primaryContact = apiAccount.accountContacts?.[0]?.contact;

  return {
    id: apiAccount.id,
    name: apiAccount.name || "",
    website: apiAccount.website || "",
    // Use account-level phone/email first, fallback to primary contact
    phone: apiAccount.phone || primaryContact?.phone || "",
    email: apiAccount.email || primaryContact?.email || "",
    fax: "", // Placeholder for fax field (not available in current schema)
    contactFirstName: primaryContact?.firstName || "",
    contactLastName: primaryContact?.lastName || "",
    contactId: primaryContact?.id || "",
    industry: {
      id: apiAccount.industry?.id || "",
      value: apiAccount.industry?.value || "",
      objectValue: apiAccount.industry?.objectValue,
    },
    type: {
      id: apiAccount.legalForm?.id || "",
      value: apiAccount.legalForm?.value || "",
      objectValue: apiAccount.legalForm?.objectValue,
    },
    ownerEmployee: {
      id: apiAccount.ownerEmployee?.id || "",
      firstName: apiAccount.ownerEmployee?.firstName || "",
      lastName: apiAccount.ownerEmployee?.lastName || "",
      displayName: apiAccount.ownerEmployee
        ? `${apiAccount.ownerEmployee.firstName} ${apiAccount.ownerEmployee.lastName}`
        : "",
      pictureThumbnail: apiAccount.ownerEmployee?.pictureThumbnail,
    },
    annualRevenue: apiAccount.annualRevenue?.value || "",
    numberOfEmployees: apiAccount.numberOfEmployees?.value || "",
    foundationDate: apiAccount.foundationDate || "",
    // Address fields from addresses array
    city: city || "",
    region: region || "",
    country: country || "",
    location,
    // Legacy billing fields for backward compatibility
    billingCity: city || "",
    billingState: region || "",
    billingCountry: country || "",
    sourceApp: "",
    createdAt: apiAccount.createdAt,
    updatedAt: apiAccount.updatedAt,
  };
};

export const useAccountListData = (
  params: UseAccountListDataParams
): UseAccountListDataReturn => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { fetchAccountsData } = useGetAccountsData(params.context);

  const loadPage = useCallback(
    async (
      page: number,
      pageSize = 20,
      _additionalFilters?: any,
      overrideSortField?: string,
      overrideSortOrder?: "ASC" | "DESC" | "",
      showLoading: boolean = true
    ) => {
      if (!params.context.accessToken) {
        console.warn("No access token provided for account data loading");
        return;
      }

      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      try {
        // Enforce query limit to ensure optimal performance
        const safePageSize = enforceQueryLimit(pageSize);
        const offset = (page - 1) * safePageSize;

        // Build where conditions
        const whereCondition: any = {
          isDeleted: { _eq: false },
        };

        const andConditions: any[] = [];

        // Add search functionality - MUST include ALL displayed fields
        if (params.search?.trim()) {
          const searchPattern = { _ilike: `%${params.search.trim()}%` };
          andConditions.push({
            _or: [
              // Company information
              { name: searchPattern },
              { website: searchPattern },

              // Industry and legal form
              { legalForm: { value: searchPattern } },
              { industry: { value: searchPattern } },

              // Owner employee information
              { ownerEmployee: { firstName: searchPattern } },
              { ownerEmployee: { lastName: searchPattern } },
              { ownerEmployee: { displayName: searchPattern } },

              // Address information
              { addresses: { city: searchPattern } },
              { addresses: { region: { value: searchPattern } } },
              { addresses: { country: { value: searchPattern } } },

              // Financial information (note: these are catalog entries, search by value)
              { annualRevenue: { value: searchPattern } },
              { numberOfEmployees: { value: searchPattern } },

              // Contact information - both account level and primary contact
              { phone: searchPattern },
              { email: searchPattern },
              { accountContacts: { contact: { firstName: searchPattern } } },
              { accountContacts: { contact: { lastName: searchPattern } } },
              { accountContacts: { contact: { email: searchPattern } } },
              { accountContacts: { contact: { phone: searchPattern } } },

              // Note: foundationDate is timestamp, could add date search if needed
              // Note: fax field not available in current schema
            ],
          });
        }

        // Add company filtering (by name)
        if (params.companies && params.companies.length > 0) {
          const companyNameConditions: any[] = [];

          params.companies.forEach((companyFilter) => {
            if (companyFilter.name) {
              companyNameConditions.push({
                name: { _eq: companyFilter.name },
              });
            }
          });

          if (companyNameConditions.length > 0) {
            andConditions.push({ _or: companyNameConditions });
          }
        }

        // Add contact info filtering
        if (params.contactInfo && params.contactInfo.length > 0) {
          const contactInfoConditions: any[] = [];

          params.contactInfo.forEach((filter) => {
            switch (filter) {
              case "HAS_WEBSITE":
                contactInfoConditions.push({
                  website: { _isNull: false, _neq: "" },
                });
                break;
              case "HAS_EMAIL":
                contactInfoConditions.push({
                  accountContacts: {
                    contact: { email: { _isNull: false, _neq: "" } },
                  },
                });
                break;
              case "HAS_PHONE":
                contactInfoConditions.push({
                  accountContacts: {
                    contact: { phone: { _isNull: false, _neq: "" } },
                  },
                });
                break;
              case "HAS_CONTACT":
                contactInfoConditions.push({
                  accountContacts: {
                    contact: { id: { _isNull: false } },
                  },
                });
                break;
              case "HAS_ADDRESS":
                contactInfoConditions.push({
                  addresses: { id: { _isNull: false } },
                });
                break;
              case "MISSING_WEBSITE":
                contactInfoConditions.push({
                  _or: [
                    { website: { _isNull: true } },
                    { website: { _eq: "" } },
                  ],
                });
                break;
              case "MISSING_EMAIL":
                contactInfoConditions.push({
                  _not: {
                    accountContacts: {
                      contact: { email: { _isNull: false, _neq: "" } },
                    },
                  },
                });
                break;
              case "MISSING_PHONE":
                contactInfoConditions.push({
                  _not: {
                    accountContacts: {
                      contact: { phone: { _isNull: false, _neq: "" } },
                    },
                  },
                });
                break;
            }
          });

          if (contactInfoConditions.length > 0) {
            andConditions.push({ _or: contactInfoConditions });
          }
        }

        // Add industry filtering
        if (params.industries && params.industries.length > 0) {
          andConditions.push({
            industry: { value: { _in: params.industries } },
          });
        }

        // Add owner filtering
        if (params.ownerEmployeeIds && params.ownerEmployeeIds.length > 0) {
          andConditions.push({
            ownerEmployeeId: { _in: params.ownerEmployeeIds },
          });
        }

        // Add legal form (type) filtering
        if (params.legalFormIds && params.legalFormIds.length > 0) {
          andConditions.push({ legalFormRef: { _in: params.legalFormIds } });
        }

        // Add annual revenue filtering
        if (params.annualRevenueIds && params.annualRevenueIds.length > 0) {
          andConditions.push({
            annualRevenueRef: { _in: params.annualRevenueIds },
          });
        }

        // Add number of employees filtering
        if (
          params.numberOfEmployeesIds &&
          params.numberOfEmployeesIds.length > 0
        ) {
          andConditions.push({
            numberOfEmployeesRef: { _in: params.numberOfEmployeesIds },
          });
        }

        // Add country filtering
        if (params.countryIds && params.countryIds.length > 0) {
          andConditions.push({
            addresses: { countryRef: { _in: params.countryIds } },
          });
        }

        // Add region filtering
        if (params.regionIds && params.regionIds.length > 0) {
          andConditions.push({
            addresses: { regionRef: { _in: params.regionIds } },
          });
        }

        // Add city filtering
        if (params.cities && params.cities.length > 0) {
          andConditions.push({
            addresses: { city: { _in: params.cities } },
          });
        }

        // Add website filtering
        if (params.websiteFilters && params.websiteFilters.length > 0) {
          const websiteConditions: any[] = [];
          params.websiteFilters.forEach((filter) => {
            switch (filter) {
              case "HAS_WEBSITE":
                websiteConditions.push({
                  website: { _isNull: false, _neq: "" },
                });
                break;
              case "MISSING_WEBSITE":
                websiteConditions.push({
                  _or: [
                    { website: { _isNull: true } },
                    { website: { _eq: "" } },
                  ],
                });
                break;
            }
          });
          if (websiteConditions.length > 0) {
            andConditions.push({ _or: websiteConditions });
          }
        }

        // Add phone filtering
        if (params.phoneFilters && params.phoneFilters.length > 0) {
          const phoneConditions: any[] = [];
          params.phoneFilters.forEach((filter) => {
            switch (filter) {
              case "HAS_PHONE":
                phoneConditions.push({
                  _or: [
                    { phone: { _isNull: false, _neq: "" } },
                    {
                      accountContacts: {
                        contact: { phone: { _isNull: false, _neq: "" } },
                      },
                    },
                  ],
                });
                break;
              case "MISSING_PHONE":
                phoneConditions.push({
                  _and: [
                    {
                      _or: [
                        { phone: { _isNull: true } },
                        { phone: { _eq: "" } },
                      ],
                    },
                    {
                      _not: {
                        accountContacts: {
                          contact: { phone: { _isNull: false, _neq: "" } },
                        },
                      },
                    },
                  ],
                });
                break;
            }
          });
          if (phoneConditions.length > 0) {
            andConditions.push({ _or: phoneConditions });
          }
        }

        // Add email filtering
        if (params.emailFilters && params.emailFilters.length > 0) {
          const emailConditions: any[] = [];
          params.emailFilters.forEach((filter) => {
            switch (filter) {
              case "HAS_EMAIL":
                emailConditions.push({
                  _or: [
                    { email: { _isNull: false, _neq: "" } },
                    {
                      accountContacts: {
                        contact: { email: { _isNull: false, _neq: "" } },
                      },
                    },
                  ],
                });
                break;
              case "MISSING_EMAIL":
                emailConditions.push({
                  _and: [
                    {
                      _or: [
                        { email: { _isNull: true } },
                        { email: { _eq: "" } },
                      ],
                    },
                    {
                      _not: {
                        accountContacts: {
                          contact: { email: { _isNull: false, _neq: "" } },
                        },
                      },
                    },
                  ],
                });
                break;
            }
          });
          if (emailConditions.length > 0) {
            andConditions.push({ _or: emailConditions });
          }
        }

        // Add fax filtering (placeholder - field not available in schema)
        if (params.faxFilters && params.faxFilters.length > 0) {
          // Fax field is not available in current schema
          // This is a placeholder for when/if fax field becomes available
          console.warn(
            "Fax filtering not yet supported - field not available in schema"
          );
        }

        // Note: accountType field does not exist in GraphQL schema - removed filter

        // Add date filtering
        const dateCondition: any = {};
        if (params.createdAfter) {
          dateCondition._gte = params.createdAfter;
        }
        if (params.createdBefore) {
          dateCondition._lte = params.createdBefore;
        }
        if (Object.keys(dateCondition).length > 0) {
          andConditions.push({ createdAt: dateCondition });
        }

        // Apply all conditions
        if (andConditions.length > 0) {
          whereCondition._and = andConditions;
        }

        // Build order by condition - handle both override and regular sorting
        const orderBy: any = {};
        const buildSortCondition = (
          sortField: string,
          sortOrder: "ASC" | "DESC" | ""
        ) => {
          const sortDirection =
            sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST";

          switch (sortField) {
            case "name":
              orderBy.name = sortDirection;
              break;
            case "geographicPresence":
              orderBy.geographicPresence = sortDirection;
              break;
            case "website":
              orderBy.website = sortDirection;
              break;
            case "phone":
              orderBy.phone = sortDirection;
              break;
            case "email":
              orderBy.email = sortDirection;
              break;
            case "createdAt":
              orderBy.createdAt = sortDirection;
              break;
            case "foundationDate":
              orderBy.foundationDate = sortDirection;
              break;
            case "ownerEmployeeId":
              orderBy.ownerEmployee = { displayName: sortDirection };
              break;
            case "typeRef":
              orderBy.legalForm = { value: sortDirection };
              break;
            case "industryRef":
              orderBy.industry = { value: sortDirection };
              break;
            case "annualRevenue":
              orderBy.annualRevenue = { value: sortDirection };
              break;
            case "numberOfEmployees":
              orderBy.numberOfEmployees = { value: sortDirection };
              break;
            case "city":
              // Not supported by AccountOrderBy; consider client-side sort if needed
              break;
            case "region":
              // Not supported by AccountOrderBy; consider client-side sort if needed
              break;
            case "country":
            case "billingCountry":
              // Not supported by AccountOrderBy; consider client-side sort if needed
              break;
            case "contactEmail":
              orderBy.email = sortDirection;
              break;
          }
        };

        if (overrideSortField && overrideSortField !== "") {
          buildSortCondition(overrideSortField, overrideSortOrder!);
        } else if (params.sortField && params.sortOrder) {
          buildSortCondition(params.sortField, params.sortOrder);
        }

        const result = await fetchAccountsData({
          offset,
          limit: safePageSize,
          where: whereCondition,
          orderBy:
            Object.keys(orderBy).length > 0
              ? [orderBy]
              : [{ createdAt: "DESC_NULLS_LAST" }],
        });

        if (result?.Account) {
          const transformedAccounts = result.Account.map(transformAccountData);
          setAccounts(transformedAccounts);

          const totalCount = result.AccountAggregate?.aggregate?.count || 0;
          setTotal(totalCount);
          setCurrentPage(page);
          setPageSize(safePageSize);
          setHasMore(offset + safePageSize < totalCount);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to load accounts")
        );
        console.error("Error loading accounts:", err);
      } finally {
        setLoading(false);
      }
    },
    [
      fetchAccountsData,
      params.search,
      params.sortField,
      params.sortOrder,
      JSON.stringify(params.companies),
      JSON.stringify(params.contactInfo),
      JSON.stringify(params.industries),
      JSON.stringify(params.ownerEmployeeIds),
      JSON.stringify(params.legalFormIds),
      JSON.stringify(params.annualRevenueIds),
      JSON.stringify(params.numberOfEmployeesIds),
      JSON.stringify(params.countryIds),
      JSON.stringify(params.regionIds),
      JSON.stringify(params.cities),
      JSON.stringify(params.websiteFilters),
      JSON.stringify(params.phoneFilters),
      JSON.stringify(params.emailFilters),
      JSON.stringify(params.faxFilters),
      params.createdAfter,
      params.createdBefore,
      params.context.accessToken,
    ]
  );

  const loadMore = useCallback(() => {
    console.log("Load more accounts requested");
    // Implementation for infinite scroll if needed
  }, []);

  const retry = useCallback(() => {
    console.log("Retrying account data load");
    loadPage(currentPage, pageSize);
  }, [currentPage, pageSize, loadPage]);

  return {
    accounts,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    loadPage,
    retry,
  };
};
