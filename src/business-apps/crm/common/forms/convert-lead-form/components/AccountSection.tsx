import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Form } from "antd";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  RadioGroup,
  RadioGroupItem,
  Label,
  Input as DesignInput,
  Textarea as DesignTextarea,
  Select as DesignSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@newwork/nw-design-system";
import SearchableSelect from "./SearchableSelect";
import OwnerSelector from "./OwnerSelector";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useDebounce } from "@/common/hooks/useDebounce";
import { useEmployeePositions } from "../../lead-form/hooks/useEmployeePositions";
import { useCurrenciesGraphQL } from "../../opportunity-form/hooks/useCurrenciesGraphQL";
import { useSearchableCatalog } from "../../lead-form/hooks/useSearchableCatalog";
import {
  COUNTRY_CATALOG,
  LEGAL_FORM_CATALOG,
  INDUSTRY_CATALOG,
  EMPLOYEE_SIZE_CATALOG,
  REVENUE_SIZE_CATALOG,
  TIMEZONE_CATALOG,
} from "../../lead-form/hooks/useLeadCatalogs";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";
import { catalogManagerClient } from "@/common/network/catalogs/CatalogManagerClient";

// Define SelectOption interface for SearchableSelect
interface SelectOption {
  id: string | number;
  value: string;
  label: string;
  name: string;
  extraInfo?: {
    pictureThumbnail?: string;
    jobPosition?: string;
    organizationalUnit?: string;
  };
}

interface AccountSectionProps extends BusinessAppContextProps {
  form: any;
  accountOption: string;
  setAccountOption: (option: string) => void;
  selectedAccount: string | undefined;
  setSelectedAccount: (account: string | undefined) => void;
}

// Single account query for both initial load and search
const GET_ACCOUNTS_PAGINATED = (variables: {
  limit?: number;
  offset?: number;
  search?: string | null;
}): string => {
  const searchFilter = variables.search
    ? `, { name: { _ilike: "%${variables.search}%" } }`
    : "";

  return `
    query GetAccountsPaginated {
      Account(
        limit: ${variables.limit || 20}
        offset: ${variables.offset || 0}
        distinctOn: [name]
        where: {
          _and: [
            { isDeleted: { _eq: false } }${searchFilter}
          ]
        }
      ) {
      id
      name
      email
      phone
    }

      AccountAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }${searchFilter}
          ]
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `;
};

const AccountSection: React.FC<AccountSectionProps> = ({
  accessToken,
  form,
  accountOption,
  setAccountOption,
  selectedAccount,
  setSelectedAccount,
}) => {
  // Account search and pagination state
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsHasMore, setAccountsHasMore] = useState(true);
  const [accountsTotal, setAccountsTotal] = useState(0);
  const [accountsOffset, setAccountsOffset] = useState(0);
  const [currentAccountSearch, setCurrentAccountSearch] = useState<string>("");
  const [accountSearchTerm, setAccountSearchTerm] = useState<string>("");
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  // GraphQL client
  const graphQLClient = useGraphqlClient(accessToken);

  // Account Owner Employee State
  const {
    employeePositions: accountEmployeePositionsData,
    loading: accountEmployeePositionsLoading,
    error: accountEmployeePositionsError,
    hasMore: accountEmployeePositionsHasMore,
    loadMore: loadMoreAccountEmployeePositions,
    searchEmployees: searchAccountEmployeePositions,
  } = useEmployeePositions({ accessToken });

  // Country hook for searchable dropdown in account sections
  const countriesHook = useSearchableCatalog({
    accessToken,
    catalogIdentifier: COUNTRY_CATALOG,
  });

  // Legal Forms hook for account section
  const legalFormsHook = useSearchableCatalog({
    accessToken,
    catalogIdentifier: LEGAL_FORM_CATALOG,
  });

  // Industries hook for account section
  const industriesHook = useSearchableCatalog({
    accessToken,
    catalogIdentifier: INDUSTRY_CATALOG,
  });

  // Employee Size hook for account section
  const employeeSizeHook = useSearchableCatalog({
    accessToken,
    catalogIdentifier: EMPLOYEE_SIZE_CATALOG,
  });

  // Revenue Size hook for account section
  const revenueSizeHook = useSearchableCatalog({
    accessToken,
    catalogIdentifier: REVENUE_SIZE_CATALOG,
  });

  // Timezone hook for account section
  const timezoneHook = useSearchableCatalog({
    catalogIdentifier: TIMEZONE_CATALOG,
    version: "v1",
    accessToken,
  });

  // Currencies GraphQL hook for account section
  const {
    options: stringCurrencies,
    loading: currenciesLoading,
    error: currenciesError,
    hasMore: currenciesHasMore,
    search: searchCurrencies,
    loadMore: loadMoreCurrencies,
  } = useCurrenciesGraphQL({
    accessToken,
  });

  // Transform employee positions to SelectOption format for account section
  const accountEmployeePositions: SelectOption[] =
    accountEmployeePositionsData.map((emp) => ({
      id: emp.employeeId,
      value: emp.employeeId,
      label: `${emp.firstName} ${emp.lastName}`,
      name: `${emp.firstName} ${emp.lastName}`,
      extraInfo: {
        pictureThumbnail: emp.employee.pictureThumbnail || undefined,
        jobPosition: emp.jobPosition.name,
        organizationalUnit: emp.organizationalUnit.name,
      },
    }));

  // Only allow countries with string labels
  const stringCountries = countriesHook.allOptions.filter(
    (c) => typeof c.label === "string"
  );

  // Only allow legal forms with string labels
  const stringLegalForms = legalFormsHook.allOptions.filter(
    (lf) => typeof lf.label === "string"
  );

  // Only allow industries with string labels
  const stringIndustries = industriesHook.allOptions.filter(
    (ind) => typeof ind.label === "string"
  );

  // Only allow employee sizes with string labels
  const stringEmployeeSizes = employeeSizeHook.allOptions.filter(
    (size) => typeof size.label === "string"
  );

  // Only allow revenue sizes with string labels
  const stringRevenueSizes = revenueSizeHook.allOptions.filter(
    (revenue) => typeof revenue.label === "string"
  );

  // Only allow timezones with string labels and transform them
  const stringTimezones = timezoneHook.allOptions
    .filter((tz) => typeof tz.label === "string")
    .map((tz) => {
      // Extract timezone code from catalog ID: "TimeZone:v1:UTC-07:00" → "UTC-07:00"
      const catalogId = tz.id as string;
      const code = catalogId.includes(":") ? catalogId.split(":")[2] : tz.label;

      return {
        ...tz,
        code: code,
        value: catalogId, // Store full ID for database
        label: `${code} (${tz.label})`, // Display code with description
        name: code,
      };
    });

  // Debounce the search term to prevent excessive API calls
  const debouncedAccountSearch = useDebounce(accountSearchTerm, 300);

  // Initialize catalog manager with access token
  useEffect(() => {
    if (accessToken) {
      catalogManagerClient.setAccessToken(accessToken);
    }
  }, [accessToken]);

  // Initialize catalog hooks on mount
  useEffect(() => {
    if (accessToken) {
      if (countriesHook) {
        countriesHook.initialize();
      }
      if (legalFormsHook) {
        legalFormsHook.initialize();
      }
      if (industriesHook) {
        industriesHook.initialize();
      }
      if (employeeSizeHook) {
        employeeSizeHook.initialize();
      }
      if (revenueSizeHook) {
        revenueSizeHook.initialize();
      }
      if (timezoneHook) {
        timezoneHook.initialize();
      }
    }
  }, [accessToken]);

  // Enhanced account search function
  const fetchAccountsPaginated = useCallback(
    async (searchTerm: string = "", resetOffset: boolean = false) => {
      if (!accessToken) {
        return;
      }

      try {
        setAccountsLoading(true);

        const currentOffset = resetOffset ? 0 : accountsOffset;
        const variables = {
          limit: 20,
          offset: currentOffset,
          search: searchTerm.trim() || null,
        };

        const query = GET_ACCOUNTS_PAGINATED(variables);
        const response = await graphQLClient.request(query);

        if (response?.Account && response?.AccountAggregate) {
          const newAccounts = response.Account;
          const totalCount = response.AccountAggregate.aggregate.count;

          console.log(
            `Search: Got ${newAccounts.length} distinct account names`
          );

          setAccounts((prevAccounts) =>
            resetOffset ? newAccounts : [...prevAccounts, ...newAccounts]
          );
          setAccountsTotal(totalCount);
          setAccountsHasMore(newAccounts.length === 20);
          setAccountsOffset(currentOffset + newAccounts.length);

          // Let user manually select account - no auto-selection
          if (resetOffset && newAccounts.length > 0) {
            console.log(
              "Search results loaded:",
              newAccounts.length,
              "accounts available for selection"
            );
          }
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      } finally {
        setAccountsLoading(false);
      }
    },
    [accessToken, accountsOffset, graphQLClient]
  );

  // Debug effect to track when accounts state changes
  useEffect(() => {
    console.log("📊 Accounts state changed:", {
      length: accounts.length,
      names: accounts.map((acc: any) => acc.name).slice(0, 3),
      timestamp: new Date().toLocaleTimeString(),
    });
  }, [accounts]);

  const searchAccountsFunction = useCallback(
    (searchTerm: string = "") => {
      console.log("🔍 [SearchFunction] Called with term:", `"${searchTerm}"`, {
        accountsLength: accounts.length,
        isInitialLoadComplete,
        currentAccountSearch,
      });

      // Set the search term - the debounced effect will handle the actual API call
      setAccountSearchTerm(searchTerm);
    },
    [accounts.length, isInitialLoadComplete, currentAccountSearch]
  );

  const loadMoreAccounts = useCallback(async () => {
    if (!accountsLoading && accountsHasMore) {
      await fetchAccountsPaginated(currentAccountSearch, false);
    }
  }, [
    accountsLoading,
    accountsHasMore,
    fetchAccountsPaginated,
    currentAccountSearch,
  ]);

  // Effect to trigger search when debounced search term changes
  useEffect(() => {
    if (debouncedAccountSearch !== currentAccountSearch) {
      console.log(
        "🔍 [Effect] Debounced search term changed:",
        `"${debouncedAccountSearch}"`,
        "Previous:",
        `"${currentAccountSearch}"`
      );

      setCurrentAccountSearch(debouncedAccountSearch);
      setAccountsOffset(0);
      fetchAccountsPaginated(debouncedAccountSearch, true);
    }
  }, [debouncedAccountSearch, currentAccountSearch, fetchAccountsPaginated]);

  // Load initial accounts on mount
  useEffect(() => {
    const loadInitialAccounts = async () => {
      if (!accessToken || !graphQLClient || isInitialLoadComplete) return;

      console.log("🔧 Loading initial accounts...");
      await fetchAccountsPaginated("", true);
      setIsInitialLoadComplete(true);
    };

    loadInitialAccounts();
  }, [accessToken, graphQLClient]);

  // Address form renderer
  const renderAddressForm = (prefix: string, label: string) => (
    <div className="gba:mb-4">
      <h5 className="gba:text-lg gba:font-semibold gba:mb-3 gba:text-gray-900">
        {label}
      </h5>
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-2 gba:space-y-2">
        {/* Country and Region - First row */}
        <div>
          <Form.Item
            name={[prefix, "countryRef"]}
            label={getTranslationFromI18nKeyAndLabel(
              "crm:address.country",
              "Country"
            )}
          >
            <SearchableSelect
              name={`${prefix}-countryRef`}
              value={form.getFieldValue([prefix, "countryRef"])}
              placeholder={getTranslationFromI18nKeyAndLabel(
                "crm:address.selectCountry",
                "Select Country"
              )}
              options={stringCountries as any}
              loading={countriesHook.loading}
              hasMore={countriesHook.hasMore}
              onSearch={countriesHook.search}
              onLoadMore={countriesHook.loadMore}
              onChange={(value) => {
                form.setFieldsValue({
                  [prefix]: {
                    ...form.getFieldValue(prefix),
                    countryRef: value,
                  },
                });
              }}
              error={countriesHook.error}
              data-testid={`${prefix}-country-select`}
            />
          </Form.Item>
        </div>
        <div>
          <Form.Item
            name={[prefix, "region"]}
            label={getTranslationFromI18nKeyAndLabel(
              "crm:address.regionState",
              "Region/State"
            )}
          >
            <DesignInput
              data-testid={`${prefix}-region-input`}
              placeholder={getTranslationFromI18nKeyAndLabel(
                "crm:address.regionPlaceholder",
                "Enter region or state..."
              )}
              className="gba:h-11 gba:px-3 gba:text-sm"
            />
          </Form.Item>
        </div>

        {/* Address Lines - Full width */}
        <div className="gba:md:col-span-2">
          <Form.Item
            name={[prefix, "addressLine"]}
            label={getTranslationFromI18nKeyAndLabel(
              "crm:address.addressLine1",
              "Address Line 1"
            )}
          >
            <DesignInput
              data-testid={`${prefix}-address-line-1`}
              placeholder={getTranslationFromI18nKeyAndLabel(
                "crm:address.addressLine1Placeholder",
                "Enter street address..."
              )}
              className="gba:h-11 gba:px-3 gba:text-sm"
            />
          </Form.Item>
        </div>
        <div className="gba:md:col-span-2">
          <Form.Item
            name={[prefix, "addressLine2"]}
            label={getTranslationFromI18nKeyAndLabel(
              "crm:address.addressLine2",
              "Address Line 2"
            )}
          >
            <DesignInput
              data-testid={`${prefix}-address-line-2`}
              placeholder={getTranslationFromI18nKeyAndLabel(
                "crm:address.addressLine2Placeholder",
                "Apartment, suite, unit, etc. (optional)"
              )}
              className="gba:h-11 gba:px-3 gba:text-sm"
            />
          </Form.Item>
        </div>

        {/* Postal Code and City - Second row */}
        <div>
          <Form.Item
            name={[prefix, "postalCode"]}
            label={getTranslationFromI18nKeyAndLabel(
              "crm:address.postalCode",
              "Postal Code"
            )}
          >
            <DesignInput
              data-testid={`${prefix}-postal-code`}
              placeholder={getTranslationFromI18nKeyAndLabel(
                "crm:address.postalCodePlaceholder",
                "Enter postal code..."
              )}
              className="gba:h-11 gba:px-3 gba:text-sm"
            />
          </Form.Item>
        </div>
        <div>
          <Form.Item
            name={[prefix, "city"]}
            label={getTranslationFromI18nKeyAndLabel(
              "crm:address.city",
              "City"
            )}
          >
            <DesignInput
              data-testid={`${prefix}-city`}
              placeholder={getTranslationFromI18nKeyAndLabel(
                "crm:address.cityPlaceholder",
                "Enter city..."
              )}
              className="gba:h-11 gba:px-3 gba:text-sm"
            />
          </Form.Item>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="gba:mb-4" data-testid="account-section">
      <CardHeader>
        <CardTitle className="gba:text-lg gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel(
            "crm:convertLead.account",
            "Account"
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-2">
        <div className="gba:space-y-2">
          <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
            {getTranslationFromI18nKeyAndLabel(
              "crm:convertLead.accountOption",
              "Account Option"
            )}
          </Label>
          <RadioGroup
            value={accountOption}
            onValueChange={setAccountOption}
            className="gba:flex gba:gap-6"
            data-testid="account-option-radio"
          >
            <div className="gba:flex gba:items-center gba:space-x-4">
              <RadioGroupItem
                value="match"
                id="account-match"
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: "2px solid var(--color-border)",
                  backgroundColor: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              />
              <Label
                htmlFor="account-match"
                className="gba:cursor-pointer"
                style={{ marginLeft: "5px" }}
              >
                {getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.matchExistingAccount",
                  "Match existing account"
                )}
              </Label>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-4">
              <RadioGroupItem
                value="new"
                id="account-new"
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: "2px solid var(--color-border)",
                  backgroundColor: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              />
              <Label
                htmlFor="account-new"
                className="gba:cursor-pointer"
                style={{ marginLeft: "5px" }}
              >
                {getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.createNewAccount",
                  "Create new account"
                )}
              </Label>
            </div>
          </RadioGroup>
        </div>

        {accountOption === "match" && (
          <div className="gba:space-y-2 gba:w-full">
            <Label htmlFor="account-select">
              {getTranslationFromI18nKeyAndLabel(
                "crm:convertLead.selectAccount",
                "Select Account"
              )}
            </Label>
            <div className="gba:w-full">
              <SearchableSelect
                label=""
                name="account"
                value={selectedAccount}
                placeholder="Search and select an account..."
                options={(() => {
                  console.log("🔍 SearchableSelect render check:", {
                    accountsLength: accounts.length,
                    accountsLoading,
                    isInitialLoadComplete,
                    currentAccountSearch: `"${currentAccountSearch}"`,
                    accounts: accounts.map((acc: any) => acc.name).slice(0, 5), // First 5 names only
                  });
                  return accounts.map((acc: any) => ({
                    id: acc.id,
                    value: acc.id,
                    label: `${acc.name} ${acc.email ? `(${acc.email})` : ""}`,
                    name: acc.name,
                  }));
                })()}
                loading={accountsLoading}
                hasMore={accountsHasMore}
                onSearch={searchAccountsFunction}
                onLoadMore={loadMoreAccounts}
                onChange={setSelectedAccount}
                data-testid="account-select"
                className="gba:w-full"
              />
            </div>
          </div>
        )}

        {accountOption === "new" && (
          <div className="gba:space-y-2">
            {/* Basic Information Section */}
            <div className="gba:bg-white gba:p-4 gba:rounded-lg gba:border gba:border-gray-200">
              <h4
                className="gba:text-lg gba:font-bold gba:mb-3 gba:text-gray-900 gba:border-b gba:border-gray-400 gba:pb-2"
                style={{
                  fontWeight: "700 !important",
                  fontSize: "18px",
                  color: "#111827",
                }}
              >
                {getTranslationFromI18nKeyAndLabel(
                  "crm:account.basicInformation",
                  "Basic Information"
                )}
              </h4>
              <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-2">
                <div className="gba:md:col-span-2">
                  <Form.Item
                    name="newAccountName"
                    label={getTranslationFromI18nKeyAndLabel(
                      "crm:account.name",
                      "Account Name"
                    )}
                    rules={[
                      {
                        required: true,
                        message: getTranslationFromI18nKeyAndLabel(
                          "crm:account.nameRequired",
                          "Please enter account name"
                        ),
                      },
                    ]}
                  >
                    <DesignInput
                      data-testid="new-account-name"
                      className="gba:h-11 gba:px-3 gba:text-sm"
                    />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    name="accountSourceApp"
                    label={getTranslationFromI18nKeyAndLabel(
                      "crm:account.sourceApp",
                      "Source App"
                    )}
                    rules={[
                      {
                        required: true,
                        message: getTranslationFromI18nKeyAndLabel(
                          "crm:account.sourceAppRequired",
                          "Please select source app"
                        ),
                      },
                    ]}
                    initialValue="IRM"
                  >
                    <DesignSelect
                      value={form.getFieldValue("accountSourceApp") || "IRM"}
                      onValueChange={(value: string) => {
                        form.setFieldsValue({ accountSourceApp: value });
                      }}
                      data-testid="account-source-app-select"
                    >
                      <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                        <SelectValue
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            "crm:account.selectSourceApp",
                            "Select Source App"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        className="gba:bg-white gba:border gba:border-gray-300 gba:rounded-md gba:shadow-lg gba:z-50"
                      >
                        <SelectItem value="IRM">IRM</SelectItem>
                        <SelectItem value="CRM">CRM</SelectItem>
                      </SelectContent>
                    </DesignSelect>
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    name="accountFoundationDate"
                    label={getTranslationFromI18nKeyAndLabel(
                      "crm:account.foundationDate",
                      "Foundation Date"
                    )}
                  >
                    <DesignInput
                      data-testid="account-foundation-date"
                      type="date"
                      className="gba:h-11 gba:px-3 gba:text-sm"
                    />
                  </Form.Item>
                </div>
              </div>
            </div>

            {/* Company Information Section */}
            <div className="gba:bg-white gba:p-4 gba:rounded-lg gba:border gba:border-gray-200">
              <h4
                className="gba:text-lg gba:font-bold gba:mb-3 gba:text-gray-900 gba:border-b gba:border-gray-400 gba:pb-2"
                style={{
                  fontWeight: "700 !important",
                  fontSize: "18px",
                  color: "#111827",
                }}
              >
                {getTranslationFromI18nKeyAndLabel(
                  "crm:account.companyInformation",
                  "Company Information"
                )}
              </h4>
              <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-2">
                <div>
                  <Form.Item
                    name="accountLegalForm"
                    label={getTranslationFromI18nKeyAndLabel(
                      "crm:account.legalForm",
                      "Legal Form"
                    )}
                  >
                    <SearchableSelect
                      name="accountLegalForm"
                      value={form.getFieldValue("accountLegalForm")}
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        "crm:account.selectLegalForm",
                        "Select Legal Form"
                      )}
                      options={stringLegalForms as any}
                      loading={legalFormsHook.loading}
                      hasMore={legalFormsHook.hasMore}
                      onSearch={legalFormsHook.search}
                      onLoadMore={legalFormsHook.loadMore}
                      onChange={(value) => {
                        form.setFieldsValue({ accountLegalForm: value });
                      }}
                      error={legalFormsHook.error}
                      data-testid="account-legal-form-select"
                    />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    name="accountIndustry"
                    label={getTranslationFromI18nKeyAndLabel(
                      "crm:account.industry",
                      "Industry"
                    )}
                  >
                    <SearchableSelect
                      name="accountIndustry"
                      value={form.getFieldValue("accountIndustry")}
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        "crm:account.selectIndustry",
                        "Select Industry"
                      )}
                      options={stringIndustries as any}
                      loading={industriesHook.loading}
                      hasMore={industriesHook.hasMore}
                      onSearch={industriesHook.search}
                      onLoadMore={industriesHook.loadMore}
                      onChange={(value) => {
                        form.setFieldsValue({ accountIndustry: value });
                      }}
                      error={industriesHook.error}
                      data-testid="account-industry-select"
                    />
                  </Form.Item>
                </div>
                <div className="gba:md:col-span-2">
                  <Form.Item
                    name="accountDescription"
                    label={getTranslationFromI18nKeyAndLabel(
                      "crm:account.description",
                      "Description"
                    )}
                  >
                    <DesignTextarea
                      data-testid="account-description"
                      rows={3}
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        "crm:account.descriptionPlaceholder",
                        "Enter account description..."
                      )}
                      className="gba:px-3 gba:py-2 gba:text-sm"
                    />
                  </Form.Item>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="gba:bg-white gba:p-4 gba:rounded-lg gba:border gba:border-gray-200">
              <h4
                className="gba:text-lg gba:font-bold gba:mb-3 gba:text-gray-900 gba:border-b gba:border-gray-400 gba:pb-2"
                style={{
                  fontWeight: "700 !important",
                  fontSize: "18px",
                  color: "#111827",
                }}
              >
                {getTranslationFromI18nKeyAndLabel(
                  "crm:account.contactInformation",
                  "Contact Information"
                )}
              </h4>
              <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-2">
                <div>
                  <Form.Item
                    name="accountEmail"
                    label={getTranslationFromI18nKeyAndLabel(
                      "crm:account.email",
                      "Email"
                    )}
                  >
                    <DesignInput
                      data-testid="account-email"
                      type="email"
                      className="gba:h-11 gba:px-3 gba:text-sm"
                    />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    name="accountPhone"
                    label={getTranslationFromI18nKeyAndLabel(
                      "crm:account.phone",
                      "Phone"
                    )}
                  >
                    <DesignInput
                      data-testid="account-phone"
                      type="tel"
                      className="gba:h-11 gba:px-3 gba:text-sm"
                    />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    name="accountFax"
                    label={getTranslationFromI18nKeyAndLabel(
                      "crm:account.fax",
                      "Fax"
                    )}
                  >
                    <DesignInput
                      data-testid="account-fax"
                      type="tel"
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        "crm:account.faxPlaceholder",
                        "Enter fax number..."
                      )}
                      className="gba:h-11 gba:px-3 gba:text-sm"
                    />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    name="accountWebsite"
                    label={getTranslationFromI18nKeyAndLabel(
                      "crm:account.website",
                      "Website"
                    )}
                  >
                    <DesignInput
                      data-testid="account-website"
                      type="url"
                      className="gba:h-11 gba:px-3 gba:text-sm"
                    />
                  </Form.Item>
                </div>
              </div>
            </div>

            {/* Financial Information Section */}
            <div className="gba:bg-white gba:p-4 gba:rounded-lg gba:border gba:border-gray-200">
              <h4
                className="gba:text-lg gba:font-bold gba:mb-3 gba:text-gray-900 gba:border-b gba:border-gray-400 gba:pb-2"
                style={{
                  fontWeight: "700 !important",
                  fontSize: "18px",
                  color: "#111827",
                }}
              >
                {getTranslationFromI18nKeyAndLabel(
                  "crm:account.financialInformation",
                  "Financial Information"
                )}
              </h4>
              <div className="gba:space-y-2">
                {/* Annual Revenue - Full Width Row */}
                <div className="gba:w-full">
                  <Form.Item
                    name="accountAnnualRevenue"
                    label={getTranslationFromI18nKeyAndLabel(
                      "crm:account.annualRevenue",
                      "Annual Revenue"
                    )}
                  >
                    <SearchableSelect
                      name="accountAnnualRevenue"
                      value={form.getFieldValue("accountAnnualRevenue")}
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        "crm:account.selectAnnualRevenue",
                        "Select Annual Revenue"
                      )}
                      options={stringRevenueSizes as any}
                      loading={revenueSizeHook.loading}
                      hasMore={revenueSizeHook.hasMore}
                      onSearch={revenueSizeHook.search}
                      onLoadMore={revenueSizeHook.loadMore}
                      onChange={(value) => {
                        form.setFieldsValue({
                          accountAnnualRevenue: value,
                        });
                      }}
                      error={revenueSizeHook.error}
                      data-testid="account-annual-revenue-select"
                    />
                  </Form.Item>
                </div>

                {/* Employee Size - Full Width Row */}
                <div className="gba:w-full">
                  <Form.Item
                    name="accountNumberOfEmployees"
                    label={getTranslationFromI18nKeyAndLabel(
                      "crm:account.employeeSize",
                      "Employee Size"
                    )}
                  >
                    <SearchableSelect
                      name="accountNumberOfEmployees"
                      value={form.getFieldValue("accountNumberOfEmployees")}
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        "crm:account.selectEmployeeSize",
                        "Select Employee Size"
                      )}
                      options={stringEmployeeSizes as any}
                      loading={employeeSizeHook.loading}
                      hasMore={employeeSizeHook.hasMore}
                      onSearch={employeeSizeHook.search}
                      onLoadMore={employeeSizeHook.loadMore}
                      onChange={(value) => {
                        form.setFieldsValue({
                          accountNumberOfEmployees: value,
                        });
                      }}
                      error={employeeSizeHook.error}
                      data-testid="account-number-of-employees-select"
                    />
                  </Form.Item>
                </div>

                {/* Other Financial Fields - 2 Column Grid */}
                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-2">
                  <div>
                    <Form.Item
                      name="accountCurrency"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:account.currency",
                        "Currency"
                      )}
                    >
                      <SearchableSelect
                        name="accountCurrency"
                        value={form.getFieldValue("accountCurrency")}
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          "crm:account.selectCurrency",
                          "Select Currency"
                        )}
                        options={stringCurrencies}
                        loading={currenciesLoading}
                        hasMore={currenciesHasMore}
                        onSearch={searchCurrencies}
                        onLoadMore={loadMoreCurrencies}
                        onChange={(value) => {
                          form.setFieldsValue({ accountCurrency: value });
                        }}
                        error={currenciesError}
                        data-testid="account-currency-select"
                      />
                    </Form.Item>
                  </div>
                  <div>
                    <Form.Item
                      name="accountTimeZone"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:account.timeZone",
                        "Time Zone"
                      )}
                    >
                      <SearchableSelect
                        name="accountTimeZone"
                        value={form.getFieldValue("accountTimeZone")}
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          "crm:account.selectTimeZone",
                          "Select Time Zone"
                        )}
                        options={stringTimezones as any}
                        loading={timezoneHook.loading}
                        hasMore={timezoneHook.hasMore}
                        onSearch={timezoneHook.search}
                        onLoadMore={timezoneHook.loadMore}
                        onChange={(value) => {
                          form.setFieldsValue({ accountTimeZone: value });
                        }}
                        error={timezoneHook.error}
                        data-testid="account-timezone-select"
                      />
                    </Form.Item>
                  </div>
                  <div>
                    <Form.Item
                      name="accountTickerSymbol"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:account.tickerSymbol",
                        "Ticker Symbol"
                      )}
                    >
                      <DesignInput
                        data-testid="account-ticker-symbol"
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          "crm:account.tickerSymbolPlaceholder",
                          "e.g., AAPL, MSFT..."
                        )}
                        className="gba:h-11 gba:px-3 gba:text-sm"
                      />
                    </Form.Item>
                  </div>
                  <div>
                    <Form.Item
                      name="accountSicCode"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:account.sicCode",
                        "SIC Code"
                      )}
                    >
                      <DesignInput
                        data-testid="account-sic-code"
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          "crm:account.sicCodePlaceholder",
                          "Enter SIC code..."
                        )}
                        className="gba:h-11 gba:px-3 gba:text-sm"
                      />
                    </Form.Item>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information Section */}
            <div className="gba:bg-white gba:p-4 gba:rounded-lg gba:border gba:border-gray-200">
              <h4
                className="gba:text-lg gba:font-bold gba:mb-3 gba:text-gray-900 gba:border-b gba:border-gray-400 gba:pb-2"
                style={{
                  fontWeight: "700 !important",
                  fontSize: "18px",
                  color: "#111827",
                }}
              >
                {getTranslationFromI18nKeyAndLabel(
                  "crm:account.addressInformation",
                  "Address Information"
                )}
              </h4>
              {renderAddressForm(
                "accountAddresses",
                getTranslationFromI18nKeyAndLabel(
                  "crm:account.address",
                  "Account Address"
                )
              )}
            </div>

            {/* Owner Information Section */}
            <div className="gba:bg-white gba:p-4 gba:rounded-lg gba:border gba:border-gray-200">
              <h4
                className="gba:text-lg gba:font-bold gba:mb-3 gba:text-gray-900 gba:border-b gba:border-gray-400 gba:pb-2"
                style={{
                  fontWeight: "700 !important",
                  fontSize: "18px",
                  color: "#111827",
                }}
              >
                {getTranslationFromI18nKeyAndLabel(
                  "crm:account.ownerInformation",
                  "Owner Information"
                )}
              </h4>
              <div className="gba:space-y-2">
                <Label htmlFor="account-owner-select">
                  {getTranslationFromI18nKeyAndLabel(
                    "crm:account.ownerEmployee",
                    "Owner Employee"
                  )}
                  <span className="gba:text-red-500 gba:ml-1">*</span>
                </Label>
                <OwnerSelector
                  value={form.getFieldValue("accountOwnerEmployee") || ""}
                  onChange={(value: string) => {
                    console.log("🔍 Account Owner Selected:", value);
                    form.setFieldsValue({ accountOwnerEmployee: value });
                    console.log(
                      "🔍 Form values after setting:",
                      form.getFieldsValue()
                    );
                  }}
                  employees={accountEmployeePositions as any}
                  loading={accountEmployeePositionsLoading}
                  hasMore={accountEmployeePositionsHasMore}
                  onLoadMore={loadMoreAccountEmployeePositions}
                  onSearch={(searchTerm: string) => {
                    searchAccountEmployeePositions(searchTerm);
                  }}
                  error={accountEmployeePositionsError}
                  dataTestId="account-owner-select"
                />
                {/* Hidden input to ensure form captures the value */}
                <Form.Item
                  name="accountOwnerEmployee"
                  style={{ display: "none" }}
                  rules={[
                    {
                      required: true,
                      message: getTranslationFromI18nKeyAndLabel(
                        "crm:account.ownerEmployeeRequired",
                        "Please select owner employee"
                      ),
                    },
                  ]}
                >
                  <input type="hidden" />
                </Form.Item>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountSection;
