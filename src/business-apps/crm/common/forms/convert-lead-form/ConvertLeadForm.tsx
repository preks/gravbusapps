import React, { useEffect, useState, useCallback } from "react";
import {
  Button,
  Form,
  Input,
  Radio,
  Checkbox,
  Select,
  DatePicker,
  Typography,
  InputNumber,
  Spin,
  Divider,
  Card,
  Row,
  Col,
  Switch,
  message
} from "antd";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { dispatchProcessContinueEvent } from "@/common/utils/processEventUtils";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";
import { catalogManagerClient } from "@/common/network/catalogs/CatalogManagerClient";
import { CatalogEntry } from "@/common/types/CatalogTypes";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Custom debounce utility
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

export interface ConvertLeadFormProps
  extends BusinessAppContextProps {}

const LEAD_QUERY = `
  query GetLead($leadId: uuid!) {
    Lead(where: {id: {_eq: $leadId}}) {
        id
        name
        email
        leadSource {
            value
        }
        status {
            value
        }
        academicTitle {
            value
        }
        academicTitleRef
        firstName
        lastName
        position
        companyName
        companyEmail
        companyPhone
        addresses {
        addressLine
        city
        country {
            value
        }
        countryRef
        postalCode
        regionRef
        }
    }
  }
`;

const ACCOUNTS_AND_CONTACTS_QUERY = `
  query GetAccountsAndContacts {
    Account(limit: 20, orderBy: [{name: ASC}]) { 
      id 
      name 
      email
      phone
    }
    Contact(limit: 20, orderBy: [{firstName: ASC}]) { 
      id 
      firstName 
      lastName 
      email
      phone
    }
    Employee(limit: 20, orderBy: [{firstName: ASC}]) {
      id
      firstName
      lastName
      businessKey
    }
  }
`;

const OPPORTUNITIES_QUERY = `
  query GetOpportunities {
    Opportunity(limit: 20, orderBy: [{name: ASC}]) {
      id
      name
      estimatedAmount
      closeDate
      winningChance
    }
  }
`;

// Search queries
const SEARCH_ACCOUNTS_QUERY = `
  query SearchAccounts($searchTerm: String!) {
    Account(limit: 20, where: {name: {_ilike: $searchTerm}}, orderBy: [{name: ASC}]) {
      id
      name
      email
      phone
    }
  }
`;

const SEARCH_CONTACTS_QUERY = `
  query SearchContacts($searchTerm: String!) {
    Contact(limit: 20, where: {_or: [{firstName: {_ilike: $searchTerm}}, {lastName: {_ilike: $searchTerm}}]}, orderBy: [{firstName: ASC}]) {
      id
      firstName
      lastName
      email
      phone
    }
  }
`;

const SEARCH_EMPLOYEES_QUERY = `
  query SearchEmployees($searchTerm: String!) {
    Employee(limit: 20, where: {_or: [{firstName: {_ilike: $searchTerm}}, {lastName: {_ilike: $searchTerm}}]}, orderBy: [{firstName: ASC}]) {
      id
      firstName
      lastName
      businessKey
    }
  }
`;

const SEARCH_OPPORTUNITIES_QUERY = `
  query SearchOpportunities($searchTerm: String!) {
    Opportunity(limit: 20, where: {name: {_ilike: $searchTerm}}, orderBy: [{name: ASC}]) {
      id
      name
      estimatedAmount
      closeDate
      winningChance
    }
  }
`;

interface AddressFormData {
  addressLine: string;
  city: string;
  postalCode: string;
  countryRef: string;
  regionRef: string;
}

export const ConvertLeadForm: React.FC<
  ConvertLeadFormProps
> = (props) => {
  const { accessToken, additionalData } = props;
  const [form] = Form.useForm();
  const [leadData, setLeadData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accountOption, setAccountOption] = useState("match");
  const [contactOption, setContactOption] = useState("match");
  const [opportunityOption, setOpportunityOption] = useState("new");
  const [createOpportunity, setCreateOpportunity] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | undefined>(undefined);
  const [selectedContact, setSelectedContact] = useState<string | undefined>(undefined);
  const [selectedOpportunity, setSelectedOpportunity] = useState<string | undefined>(undefined);
  
  // Search states
  const [searchAccounts, setSearchAccounts] = useState<any[]>([]);
  const [searchContacts, setSearchContacts] = useState<any[]>([]);
  const [searchEmployees, setSearchEmployees] = useState<any[]>([]);
  const [searchOpportunities, setSearchOpportunities] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<{[key: string]: boolean}>({});
  
  // Catalog states
  const [pipelines, setPipelines] = useState<CatalogEntry[]>([]);
  const [currencies, setCurrencies] = useState<CatalogEntry[]>([]);
  const [countries, setCountries] = useState<CatalogEntry[]>([]);
  const [regions, setRegions] = useState<CatalogEntry[]>([]);
  const [academicTitles, setAcademicTitles] = useState<CatalogEntry[]>([]);
  
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  
  const graphQLClient = useGraphqlClient(accessToken);

  // Initialize catalog manager with access token
  useEffect(() => {
    if (accessToken) {
      catalogManagerClient.setAccessToken(accessToken);
    }
  }, [accessToken]);

  // Add process completion listener
  useEffect(() => {
    const handler = async (event: any) => {
      try {
        const response = event.detail?.response;
        if (response) {
          message.success('Lead converted successfully');
          setSubmitting(false);
        }
      } catch (err: any) {
        console.error('Error in process completion:', err);
        message.error(err?.message || 'Failed to convert lead');
        setSubmitting(false);
      }
    };
    
    window.addEventListener('com.newwork.process.taskCompletion', handler as EventListener);
    
    return () => {
      window.removeEventListener('com.newwork.process.taskCompletion', handler as EventListener);
    };
  }, []);

  // Load catalogs
  useEffect(() => {
    async function loadCatalogs() {
      setCatalogsLoading(true);
      try {
        const [
          pipelinesResponse,
          currenciesResponse,
          countriesResponse,
          regionsResponse,
          academicTitlesResponse
        ] = await Promise.all([
          catalogManagerClient.getCatalogEntriesList({ catalogIdentifier: "SalesPipeline", version: "v1" }),
          catalogManagerClient.getCatalogEntriesList({ catalogIdentifier: "Currency", version: "v1" }),
          catalogManagerClient.getCatalogEntriesList({ catalogIdentifier: "Country", version: "v1" }),
          catalogManagerClient.getCatalogEntriesList(
            { catalogIdentifier: "CountryRegion", version: "v1" },
            { 
              limit: 20, 
              offset: 0, 
              returnTotalRecords: true, 
              includeChildCatalogEntries: true 
            }
          ),
          catalogManagerClient.getCatalogEntriesList({ catalogIdentifier: "AcademicTitle", version: "v1" })
        ]);
        
        setPipelines(pipelinesResponse.data || []);
        setCurrencies(currenciesResponse.data || []);
        setCountries(countriesResponse.data || []);
        setRegions(regionsResponse.data || []);
        setAcademicTitles(academicTitlesResponse.data || []);
      } catch (error) {
        console.error("Error loading catalogs:", error);
      } finally {
        setCatalogsLoading(false);
      }
    }
    
    if (accessToken) {
      loadCatalogs();
    }
  }, [accessToken]);

  useEffect(() => {
    async function fetchLead() {
      setLoading(true);
      try {
        const data = await graphQLClient.request(LEAD_QUERY, {
          leadId: additionalData?.leadId
        });
        setLeadData(data?.Lead?.[0] || null);
      } catch (e) {
        console.error("Error fetching lead:", e);
        setLeadData(null);
      } finally {
        setLoading(false);
      }
    }
    if (additionalData?.leadId) fetchLead();
  }, [additionalData?.leadId, graphQLClient]);

  useEffect(() => {
    async function fetchEntities() {
      try {
        const data = await graphQLClient.request(ACCOUNTS_AND_CONTACTS_QUERY, {});
        setAccounts(data?.Account || []);
        setContacts(data?.Contact || []);
        setEmployees(data?.Employee || []);
        if (data?.Account?.length) setSelectedAccount(data.Account[0].id);
        if (data?.Contact?.length) setSelectedContact(data.Contact[0].id);
        
        // Also fetch opportunities
        const oppsData = await graphQLClient.request(OPPORTUNITIES_QUERY, {});
        setOpportunities(oppsData?.Opportunity || []);
        if (oppsData?.Opportunity?.length) setSelectedOpportunity(oppsData.Opportunity[0].id);
      } catch (e) {
        console.error("Error fetching entities:", e);
        setAccounts([]);
        setContacts([]);
        setEmployees([]);
        setOpportunities([]);
      }
    }
    if (graphQLClient) fetchEntities();
  }, [graphQLClient]);

  // Search functions
  const searchAccountsFunction = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchAccounts([]);
      return;
    }
    
    setIsSearching(prev => ({ ...prev, accounts: true }));
    try {
      const searchPattern = `%${searchTerm}%`;
      const data = await graphQLClient.request(SEARCH_ACCOUNTS_QUERY, {
        searchTerm: searchPattern
      });
      setSearchAccounts(data?.Account || []);
    } catch (error) {
      console.error("Error searching accounts:", error);
      setSearchAccounts([]);
    } finally {
      setIsSearching(prev => ({ ...prev, accounts: false }));
    }
  };

  const searchContactsFunction = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchContacts([]);
      return;
    }
    
    setIsSearching(prev => ({ ...prev, contacts: true }));
    try {
      const searchPattern = `%${searchTerm}%`;
      const data = await graphQLClient.request(SEARCH_CONTACTS_QUERY, {
        searchTerm: searchPattern
      });
      setSearchContacts(data?.Contact || []);
    } catch (error) {
      console.error("Error searching contacts:", error);
      setSearchContacts([]);
    } finally {
      setIsSearching(prev => ({ ...prev, contacts: false }));
    }
  };

  const searchEmployeesFunction = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchEmployees([]);
      return;
    }
    
    setIsSearching(prev => ({ ...prev, employees: true }));
    try {
      const searchPattern = `%${searchTerm}%`;
      const data = await graphQLClient.request(SEARCH_EMPLOYEES_QUERY, {
        searchTerm: searchPattern
      });
      setSearchEmployees(data?.Employee || []);
    } catch (error) {
      console.error("Error searching employees:", error);
      setSearchEmployees([]);
    } finally {
      setIsSearching(prev => ({ ...prev, employees: false }));
    }
  };

  const searchOpportunitiesFunction = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchOpportunities([]);
      return;
    }
    
    setIsSearching(prev => ({ ...prev, opportunities: true }));
    try {
      const searchPattern = `%${searchTerm}%`;
      const data = await graphQLClient.request(SEARCH_OPPORTUNITIES_QUERY, {
        searchTerm: searchPattern
      });
      setSearchOpportunities(data?.Opportunity || []);
    } catch (error) {
      console.error("Error searching opportunities:", error);
      setSearchOpportunities([]);
    } finally {
      setIsSearching(prev => ({ ...prev, opportunities: false }));
    }
  };

  // Debounced search functions
  const debouncedSearchAccounts = useCallback(debounce(searchAccountsFunction, 300), [graphQLClient]);
  const debouncedSearchContacts = useCallback(debounce(searchContactsFunction, 300), [graphQLClient]);
  const debouncedSearchEmployees = useCallback(debounce(searchEmployeesFunction, 300), [graphQLClient]);
  const debouncedSearchOpportunities = useCallback(debounce(searchOpportunitiesFunction, 300), [graphQLClient]);

  // Helper function to check if address has meaningful data
  const hasAddressData = (address: any) => {
    return address && (
      address.addressLine ||
      address.city ||
      address.postalCode ||
      address.countryRef ||
      address.regionRef
    );
  };

  // Helper function to format address with all required fields
  const formatAddress = (address: any) => {
    if (!address) return null;
    return {
      addressLine: address.addressLine || null,
      city: address.city || null,
      postalCode: address.postalCode || null,
      countryRef: address.countryRef || null,
      regionRef: address.regionRef || null
    };
  };

  const handleSubmit = (values: any) => {
    setSubmitting(true);
    
    try {
      const payload: any = {
        leadId: additionalData?.leadId
      };

    // Handle Account
    if (accountOption === "match" && selectedAccount) {
      payload.account = {
        id: selectedAccount,
        ownerEmployee: values.accountOwnerEmployee || null
      };
    } else if (accountOption === "new") {
      payload.account = {
        name: values.newAccountName,
        sourceApp: values.accountSourceApp || "IRM",
        foundationDate: values.accountFoundationDate?.toISOString() || null,
        website: values.accountWebsite || null,
        email: values.accountEmail || null,
        phone: values.accountPhone || null,
        ownerEmployee: values.accountOwnerEmployee || null,
        addresses: hasAddressData(values.accountAddresses) ? [formatAddress(values.accountAddresses)] : []
      };
    }

    // Handle Contact
    if (contactOption === "match" && selectedContact) {
      payload.contact = {
        id: selectedContact
      };
    } else if (contactOption === "new") {
      payload.contact = {
        code: values.contactCode || null,
        firstName: values.newContactFirstName,
        lastName: values.newContactLastName,
        email: values.newContactEmail || null,
        phone: values.newContactPhone || null,
        fax: values.contactFax || null,
        jobTitle: values.contactJobTitle || null,
        department: values.contactDepartment || null,
        sourceApp: values.contactSourceApp || "IRM",
        workExperienceYears: values.contactWorkExperienceYears || 0,
        birthDate: values.contactBirthDate?.toISOString() || null,
        pictureUrl: values.contactPictureUrl || null,
        ownerEmployee: values.contactOwnerEmployee || null,
        address: hasAddressData(values.contactAddresses) ? [formatAddress(values.contactAddresses)] : []
      };
    }

    // Handle Opportunity
    if (createOpportunity) {
      if (opportunityOption === "match" && selectedOpportunity) {
        payload.opportunity = {
          id: selectedOpportunity
        };
      } else if (opportunityOption === "new") {
        payload.opportunity = {
          additionalProperties: null,
          name: values.opportunityName,
          lastInteraction: values.opportunityLastInteraction?.toISOString() || null,
          closeDate: values.opportunityCloseDate?.toISOString() || null,
          estimatedAmount: values.opportunityEstimatedAmount || 0,
          winningChance: values.opportunityWinningChance || 0,
          personal: values.opportunityPersonal || false,
          currencyRef: values.opportunityCurrencyRef || null,
          sourceApp: values.opportunitySourceApp || "IRM",
          pipelineRef: values.opportunityPipelineRef || null,
          status: values.opportunityStatus || null,
          account: accountOption === "match" ? selectedAccount : undefined,
          ownerEmployee: values.opportunityOwnerEmployee || null,
          addresses: null
        };
      }
    }

      console.log("Submitting payload:", payload);
      dispatchProcessContinueEvent("pse_submit", payload);
    } catch (error) {
      console.error('Error submitting convert lead form:', error);
      message.error('Failed to submit form');
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    dispatchProcessContinueEvent("pse_pause", {});
  };

  const renderAddressForm = (prefix: string, label: string) => (
    <Card className="gba:mb-4" size="small">
      <Title level={5} className="gba:!mb-3">{label}</Title>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Form.Item
            name={[prefix, "addressLine"]}
            label={getTranslationFromI18nKeyAndLabel("crm:address.addressLine", "Address Line")}
          >
            <Input data-testid={`${prefix}-address-line`} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={[prefix, "city"]}
            label={getTranslationFromI18nKeyAndLabel("crm:address.city", "City")}
          >
            <Input data-testid={`${prefix}-city`} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={[prefix, "postalCode"]}
            label={getTranslationFromI18nKeyAndLabel("crm:address.postalCode", "Postal Code")}
          >
            <Input data-testid={`${prefix}-postal-code`} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={[prefix, "countryRef"]}
            label={getTranslationFromI18nKeyAndLabel("crm:address.country", "Country")}
          >
            <Select
              showSearch
              placeholder={getTranslationFromI18nKeyAndLabel("crm:address.selectCountry", "Select Country")}
              optionFilterProp="children"
              data-testid={`${prefix}-country-select`}
            >
              {countries.map((country) => (
                <Option key={country.id} value={country.id}>
                  {country.value}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={[prefix, "regionRef"]}
            label={getTranslationFromI18nKeyAndLabel("crm:address.region", "Region")}
          >
            <Select
              showSearch
              placeholder={getTranslationFromI18nKeyAndLabel("crm:address.selectRegion", "Select Region")}
              optionFilterProp="children"
              data-testid={`${prefix}-region-select`}
            >
              {regions.map((region) => (
                <Option key={region.id} value={region.id}>
                  {region.value}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  if (loading || catalogsLoading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="loading-container">
        <Spin size="large" />
        <div className="gba:mt-4">
          <Text>{getTranslationFromI18nKeyAndLabel("common:loading", "Loading...")}</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="gba:p-6 gba:bg-white gba:rounded-lg gba:shadow-md" data-testid="convert-lead-form-container">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        data-testid="convert-lead-form"
        initialValues={{
          accountSourceApp: "IRM",
          contactSourceApp: "IRM",
          opportunityPersonal: false,
          opportunityWinningChance: 50,
          opportunitySourceApp: "IRM"
        }}
      >
        <Title
          level={3}
          className="gba:!font-bold gba:mb-6 gba:text-center gba:!text-[24px]"
        >
          {getTranslationFromI18nKeyAndLabel(
            "crm:convertLead.title",
            "Convert Lead"
          )}
        </Title>

        {/* Lead Information Display */}
        <Card className="gba:mb-6 gba:border-none gba:bg-gray-50" data-testid="lead-info-card">
          <Title level={4} className="gba:!mb-4">
            {getTranslationFromI18nKeyAndLabel(
              "crm:convertLead.leadInfo",
              "Lead Information"
            )}
          </Title>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <div>
                <Text type="secondary">{getTranslationFromI18nKeyAndLabel("crm:lead.name", "Name")}</Text>
                <div className="gba:font-medium gba:text-base" data-testid="lead-name">{leadData?.name || `${leadData?.firstName} ${leadData?.lastName}`}</div>
              </div>
            </Col>
            <Col span={12}>
              <div>
                <Text type="secondary">{getTranslationFromI18nKeyAndLabel("crm:lead.company", "Company")}</Text>
                <div className="gba:font-medium gba:text-base" data-testid="lead-company">{leadData?.companyName}</div>
              </div>
            </Col>
            <Col span={12}>
              <div>
                <Text type="secondary">{getTranslationFromI18nKeyAndLabel("crm:lead.email", "Email")}</Text>
                <div className="gba:font-medium gba:text-base" data-testid="lead-email">{leadData?.email}</div>
              </div>
            </Col>
            <Col span={12}>
              <div>
                <Text type="secondary">{getTranslationFromI18nKeyAndLabel("crm:lead.phone", "Phone")}</Text>
                <div className="gba:font-medium gba:text-base" data-testid="lead-phone">{leadData?.phone}</div>
              </div>
            </Col>
          </Row>
        </Card>

        <Divider className="gba:my-6" />

        {/* Account Section */}
        <Card className="gba:mb-6 gba:border-none gba:bg-gray-50" data-testid="account-section">
          <Title level={4} className="gba:!mb-4">
            {getTranslationFromI18nKeyAndLabel("crm:convertLead.account", "Account")}
          </Title>
          <Form.Item
            label={getTranslationFromI18nKeyAndLabel(
              "crm:convertLead.accountOption",
              "Account Option"
            )}
            className="gba:mb-4"
          >
            <Radio.Group
              value={accountOption}
              onChange={(e) => setAccountOption(e.target.value)}
              className="gba:flex gba:gap-6"
              data-testid="account-option-radio"
            >
              <Radio value="match">
                {getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.matchExistingAccount",
                  "Match existing account"
                )}
              </Radio>
              <Radio value="new">
                {getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.createNewAccount",
                  "Create new account"
                )}
              </Radio>
            </Radio.Group>
          </Form.Item>

          {accountOption === "match" && (
            <Form.Item
              label={getTranslationFromI18nKeyAndLabel("crm:convertLead.selectAccount", "Select Account")}
            >
              <Select
                value={selectedAccount}
                onChange={setSelectedAccount}
                style={{ width: "100%" }}
                showSearch
                optionFilterProp="children"
                onSearch={debouncedSearchAccounts}
                loading={isSearching.accounts}
                data-testid="account-select"
                filterOption={false}
              >
                {(searchAccounts.length > 0 ? searchAccounts : accounts).map((acc) => (
                  <Option key={acc.id} value={acc.id}>
                    {acc.name} {acc.email ? `(${acc.email})` : ""}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {accountOption === "new" && (
            <>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item
                    name="newAccountName"
                    label={getTranslationFromI18nKeyAndLabel("crm:account.name", "Account Name")}
                    rules={[
                      {
                        required: true,
                        message: getTranslationFromI18nKeyAndLabel(
                          "crm:account.nameRequired",
                          "Please enter account name"
                        )
                      }
                    ]}
                  >
                    <Input data-testid="new-account-name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="accountEmail"
                    label={getTranslationFromI18nKeyAndLabel("crm:account.email", "Email")}
                  >
                    <Input data-testid="account-email" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="accountPhone"
                    label={getTranslationFromI18nKeyAndLabel("crm:account.phone", "Phone")}
                  >
                    <Input data-testid="account-phone" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="accountWebsite"
                    label={getTranslationFromI18nKeyAndLabel("crm:account.website", "Website")}
                  >
                    <Input data-testid="account-website" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="accountFoundationDate"
                    label={getTranslationFromI18nKeyAndLabel("crm:account.foundationDate", "Foundation Date")}
                  >
                    <DatePicker style={{ width: "100%" }} data-testid="account-foundation-date" />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    name="accountSourceApp"
                    label={getTranslationFromI18nKeyAndLabel("crm:account.sourceApp", "Source App")}
                  >
                    <Select
                      showSearch
                      placeholder={getTranslationFromI18nKeyAndLabel("crm:account.selectSourceApp", "Select Source App")}
                      optionFilterProp="children"
                      data-testid="account-source-app-select"
                    >
                      <Option key="IRM" value="IRM">
                        IRM
                      </Option>
                      <Option key="CRM" value="CRM">
                        CRM
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              {renderAddressForm("accountAddresses", getTranslationFromI18nKeyAndLabel("crm:account.address", "Account Address"))}
            </>
          )}

          <Form.Item
            name="accountOwnerEmployee"
            label={getTranslationFromI18nKeyAndLabel("crm:account.ownerEmployee", "Owner Employee")}
            rules={[
              {
                required: true,
                message: getTranslationFromI18nKeyAndLabel(
                  "crm:account.ownerEmployeeRequired",
                  "Please select owner employee"
                )
              }
            ]}
          >
            <Select
              showSearch
              placeholder={getTranslationFromI18nKeyAndLabel("crm:account.selectOwner", "Select Owner")}
              optionFilterProp="children"
              onSearch={debouncedSearchEmployees}
              loading={isSearching.employees}
              data-testid="account-owner-select"
              filterOption={false}
            >
              {(searchEmployees.length > 0 ? searchEmployees : employees).map((emp) => (
                <Option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} {emp.businessKey ? `(${emp.businessKey})` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Card>

        <Divider className="gba:my-6" />

        {/* Contact Section */}
        <Card className="gba:mb-6 gba:border-none gba:bg-gray-50" data-testid="contact-section">
          <Title level={4} className="gba:!mb-4">
            {getTranslationFromI18nKeyAndLabel("crm:convertLead.contact", "Contact")}
          </Title>
          <Form.Item
            label={getTranslationFromI18nKeyAndLabel(
              "crm:convertLead.contactOption",
              "Contact Option"
            )}
            className="gba:mb-4"
          >
            <Radio.Group
              value={contactOption}
              onChange={(e) => setContactOption(e.target.value)}
              className="gba:flex gba:gap-6"
              data-testid="contact-option-radio"
            >
              <Radio value="match">
                {getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.matchExistingContact",
                  "Match existing contact"
                )}
              </Radio>
              <Radio value="new">
                {getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.createNewContact",
                  "Create new contact"
                )}
              </Radio>
            </Radio.Group>
          </Form.Item>

          {contactOption === "match" && (
            <Form.Item
              label={getTranslationFromI18nKeyAndLabel("crm:convertLead.selectContact", "Select Contact")}
            >
              <Select
                value={selectedContact}
                onChange={setSelectedContact}
                style={{ width: "100%" }}
                showSearch
                optionFilterProp="children"
                onSearch={debouncedSearchContacts}
                loading={isSearching.contacts}
                data-testid="contact-select"
                filterOption={false}
              >
                {(searchContacts.length > 0 ? searchContacts : contacts).map((contact) => (
                  <Option key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName} {contact.email ? `(${contact.email})` : ""}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {contactOption === "new" && (
            <>
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Form.Item
                    name="contactCode"
                    label={getTranslationFromI18nKeyAndLabel("crm:contact.code", "Code")}
                  >
                    <Input data-testid="contact-code" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="contactSourceApp"
                    label={getTranslationFromI18nKeyAndLabel("crm:contact.sourceApp", "Source App")}
                  >
                    <Select
                      showSearch
                      placeholder={getTranslationFromI18nKeyAndLabel("crm:contact.selectSourceApp", "Select Source App")}
                      optionFilterProp="children"
                      data-testid="contact-source-app-select"
                    >
                      <Option key="IRM" value="IRM">
                        IRM
                      </Option>
                      <Option key="CRM" value="CRM">
                        CRM
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="newContactFirstName"
                    label={getTranslationFromI18nKeyAndLabel("crm:contact.firstName", "First Name")}
                    rules={[
                      {
                        required: true,
                        message: getTranslationFromI18nKeyAndLabel(
                          "crm:contact.firstNameRequired",
                          "Please enter first name"
                        )
                      }
                    ]}
                  >
                    <Input data-testid="new-contact-first-name" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="newContactLastName"
                    label={getTranslationFromI18nKeyAndLabel("crm:contact.lastName", "Last Name")}
                    rules={[
                      {
                        required: true,
                        message: getTranslationFromI18nKeyAndLabel(
                          "crm:contact.lastNameRequired",
                          "Please enter last name"
                        )
                      }
                    ]}
                  >
                    <Input data-testid="new-contact-last-name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="newContactEmail"
                    label={getTranslationFromI18nKeyAndLabel("crm:contact.email", "Email")}
                    rules={[
                      {
                        required: true,
                        message: getTranslationFromI18nKeyAndLabel(
                          "crm:contact.emailRequired",
                          "Please enter email"
                        )
                      }
                    ]}
                  >
                    <Input data-testid="new-contact-email" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="newContactPhone"
                    label={getTranslationFromI18nKeyAndLabel("crm:contact.phone", "Phone")}
                  >
                    <Input data-testid="new-contact-phone" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="contactFax"
                    label={getTranslationFromI18nKeyAndLabel("crm:contact.fax", "Fax")}
                  >
                    <Input data-testid="contact-fax" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="contactJobTitle"
                    label={getTranslationFromI18nKeyAndLabel("crm:contact.jobTitle", "Job Title")}
                  >
                    <Input data-testid="contact-job-title" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="contactDepartment"
                    label={getTranslationFromI18nKeyAndLabel("crm:contact.department", "Department")}
                  >
                    <Input data-testid="contact-department" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="contactWorkExperienceYears"
                    label={getTranslationFromI18nKeyAndLabel("crm:contact.workExperienceYears", "Work Experience Years")}
                  >
                    <InputNumber min={0} style={{ width: "100%" }} data-testid="contact-work-experience" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="contactBirthDate"
                    label={getTranslationFromI18nKeyAndLabel("crm:contact.birthDate", "Birth Date")}
                  >
                    <DatePicker style={{ width: "100%" }} data-testid="contact-birth-date" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="contactPictureUrl"
                    label={getTranslationFromI18nKeyAndLabel("crm:contact.pictureUrl", "Picture URL")}
                  >
                    <Input data-testid="contact-picture-url" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="contactOwnerEmployee"
                    label={getTranslationFromI18nKeyAndLabel("crm:contact.ownerEmployee", "Owner Employee")}
                    rules={[
                      {
                        required: true,
                        message: getTranslationFromI18nKeyAndLabel(
                          "crm:contact.ownerEmployeeRequired",
                          "Please select owner employee"
                        )
                      }
                    ]}
                  >
                    <Select
                      showSearch
                      placeholder={getTranslationFromI18nKeyAndLabel("crm:contact.selectOwner", "Select Owner")}
                      optionFilterProp="children"
                      onSearch={debouncedSearchEmployees}
                      loading={isSearching.employees}
                      data-testid="contact-owner-select"
                      filterOption={false}
                    >
                      {(searchEmployees.length > 0 ? searchEmployees : employees).map((emp) => (
                        <Option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} {emp.businessKey ? `(${emp.businessKey})` : ''}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              {renderAddressForm("contactAddresses", getTranslationFromI18nKeyAndLabel("crm:contact.address", "Contact Address"))}
            </>
          )}
        </Card>

        <Divider className="gba:my-6" />

        {/* Opportunity Section */}
        <Card className="gba:mb-6 gba:border-none gba:bg-gray-50" data-testid="opportunity-section">
          <Form.Item className="gba:mb-4">
            <Checkbox
              checked={createOpportunity}
              onChange={(e) => setCreateOpportunity(e.target.checked)}
              data-testid="create-opportunity-checkbox"
            >
              {getTranslationFromI18nKeyAndLabel(
                "crm:convertLead.createOpportunity",
                "Create Opportunity?"
              )}
            </Checkbox>
          </Form.Item>

          {createOpportunity && (
            <>
              <Form.Item
                label={getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.opportunityOption",
                  "Opportunity Option"
                )}
                className="gba:mb-4"
              >
                <Radio.Group
                  value={opportunityOption}
                  onChange={(e) => setOpportunityOption(e.target.value)}
                  className="gba:flex gba:gap-6"
                  data-testid="opportunity-option-radio"
                >
                  <Radio value="match">
                    {getTranslationFromI18nKeyAndLabel(
                      "crm:convertLead.matchExistingOpportunity",
                      "Match existing opportunity"
                    )}
                  </Radio>
                  <Radio value="new">
                    {getTranslationFromI18nKeyAndLabel(
                      "crm:convertLead.createNewOpportunity",
                      "Create new opportunity"
                    )}
                  </Radio>
                </Radio.Group>
              </Form.Item>

              {opportunityOption === "match" && (
                <Form.Item
                  label={getTranslationFromI18nKeyAndLabel("crm:convertLead.selectOpportunity", "Select Opportunity")}
                >
                  <Select
                    value={selectedOpportunity}
                    onChange={setSelectedOpportunity}
                    style={{ width: "100%" }}
                    showSearch
                    optionFilterProp="children"
                    onSearch={debouncedSearchOpportunities}
                    loading={isSearching.opportunities}
                    data-testid="opportunity-select"
                    filterOption={false}
                  >
                    {(searchOpportunities.length > 0 ? searchOpportunities : opportunities).map((opp) => (
                      <Option key={opp.id} value={opp.id}>
                        {opp.name} - ${opp.estimatedAmount || 0}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              {opportunityOption === "new" && (
                <>
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Form.Item
                        name="opportunityName"
                        label={getTranslationFromI18nKeyAndLabel("crm:opportunity.name", "Opportunity Name")}
                        rules={[
                          {
                            required: true,
                            message: getTranslationFromI18nKeyAndLabel(
                              "crm:opportunity.nameRequired",
                              "Please enter opportunity name"
                            )
                          }
                        ]}
                      >
                        <Input data-testid="opportunity-name" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="opportunityEstimatedAmount"
                        label={getTranslationFromI18nKeyAndLabel("crm:opportunity.estimatedAmount", "Estimated Amount")}
                        rules={[
                          {
                            required: true,
                            message: getTranslationFromI18nKeyAndLabel(
                              "crm:opportunity.estimatedAmountRequired",
                              "Please enter estimated amount"
                            )
                          }
                        ]}
                      >
                        <InputNumber
                          min={0}
                          style={{ width: "100%" }}
                          data-testid="opportunity-estimated-amount"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="opportunityCloseDate"
                        label={getTranslationFromI18nKeyAndLabel("crm:opportunity.closeDate", "Close Date")}
                        rules={[
                          {
                            required: true,
                            message: getTranslationFromI18nKeyAndLabel(
                              "crm:opportunity.closeDateRequired",
                              "Please select close date"
                            )
                          }
                        ]}
                      >
                        <DatePicker style={{ width: "100%" }} data-testid="opportunity-close-date" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="opportunityWinningChance"
                        label={getTranslationFromI18nKeyAndLabel("crm:opportunity.winningChance", "Winning Chance (%)")}
                      >
                        <InputNumber
                          min={0}
                          max={100}
                          style={{ width: "100%" }}
                          data-testid="opportunity-winning-chance"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="opportunityLastInteraction"
                        label={getTranslationFromI18nKeyAndLabel("crm:opportunity.lastInteraction", "Last Interaction")}
                      >
                        <DatePicker showTime style={{ width: "100%" }} data-testid="opportunity-last-interaction" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="opportunityPersonal"
                        label={getTranslationFromI18nKeyAndLabel("crm:opportunity.personal", "Personal")}
                        valuePropName="checked"
                      >
                        <Switch data-testid="opportunity-personal-switch" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="opportunityCurrencyRef"
                        label={getTranslationFromI18nKeyAndLabel("crm:opportunity.currency", "Currency")}
                      >
                        <Select
                          showSearch
                          placeholder={getTranslationFromI18nKeyAndLabel("crm:opportunity.selectCurrency", "Select Currency")}
                          optionFilterProp="children"
                          data-testid="opportunity-currency-select"
                        >
                          {currencies.map((currency) => (
                            <Option key={currency.id} value={currency.id}>
                              {currency.value}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="opportunitySourceApp"
                        label={getTranslationFromI18nKeyAndLabel("crm:opportunity.sourceApp", "Source App")}
                      >
                        <Select
                          showSearch
                          placeholder={getTranslationFromI18nKeyAndLabel("crm:opportunity.selectSourceApp", "Select Source App")}
                          optionFilterProp="children"
                          data-testid="opportunity-source-app-select"
                        >
                          <Option key="IRM" value="IRM">
                            IRM
                          </Option>
                          <Option key="CRM" value="CRM">
                            CRM
                          </Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="opportunityPipelineRef"
                        label={getTranslationFromI18nKeyAndLabel("crm:opportunity.pipeline", "Pipeline")}
                      >
                        <Select
                          showSearch
                          placeholder={getTranslationFromI18nKeyAndLabel("crm:opportunity.selectPipeline", "Select Pipeline")}
                          optionFilterProp="children"
                          data-testid="opportunity-pipeline-select"
                        >
                          {pipelines.map((pipeline) => (
                            <Option key={pipeline.id} value={pipeline.id}>
                              {pipeline.value}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="opportunityStatus"
                        label={getTranslationFromI18nKeyAndLabel("crm:opportunity.status", "Status")}
                      >
                        <Select
                          showSearch
                          placeholder={getTranslationFromI18nKeyAndLabel("crm:opportunity.selectStatus", "Select Status")}
                          optionFilterProp="children"
                          data-testid="opportunity-status-select"
                        >
                          <Option value="UNKNOWN_OPPORTUNITY_STATUS">
                            Unknown Opportunity Status
                          </Option>
                          <Option value="OPPORTUNITY_OPEN">
                            Opportunity Open
                          </Option>
                          <Option value="OPPORTUNITY_WON">
                            Opportunity Won
                          </Option>
                          <Option value="OPPORTUNITY_LOST">
                            Opportunity Lost
                          </Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="opportunityOwnerEmployee"
                        label={getTranslationFromI18nKeyAndLabel("crm:opportunity.ownerEmployee", "Owner Employee")}
                      >
                        <Select
                          showSearch
                          placeholder={getTranslationFromI18nKeyAndLabel("crm:opportunity.selectOwner", "Select Owner")}
                          optionFilterProp="children"
                          onSearch={debouncedSearchEmployees}
                          loading={isSearching.employees}
                          data-testid="opportunity-owner-select"
                          filterOption={false}
                        >
                          {(searchEmployees.length > 0 ? searchEmployees : employees).map((emp) => (
                            <Option key={emp.id} value={emp.id}>
                              {emp.firstName} {emp.lastName} {emp.businessKey ? `(${emp.businessKey})` : ''}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>

                  </Row>
                  {renderAddressForm("opportunityAddresses", getTranslationFromI18nKeyAndLabel("crm:opportunity.address", "Opportunity Address"))}
                </>
              )}
            </>
          )}
        </Card>

        <Divider className="gba:my-6" />

        {/* Form Actions */}
        <div className="gba:flex gba:justify-end gba:gap-4 gba:mt-6">
          <Button
            onClick={handleCancel}
            size="large"
            className="gba:min-w-[120px]"
            data-testid="cancel-button"
            disabled={submitting}
          >
            {getTranslationFromI18nKeyAndLabel("common:cancel", "Cancel")}
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            className="gba:min-w-[120px]"
            data-testid="submit-button"
            loading={submitting}
          >
            {getTranslationFromI18nKeyAndLabel(
              "crm:convertLead.submit",
              "Convert Lead"
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default ConvertLeadForm;
