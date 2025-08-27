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
import { useSearchableCatalog } from "../../lead-form/hooks/useSearchableCatalog";
import { COUNTRY_CATALOG } from "../../lead-form/hooks/useLeadCatalogs";
import {
  ACADEMIC_TITLE_CATALOG,
  LANGUAGES_CATALOG,
} from "../../contact-form/context/ContactFormContext";
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

interface ContactSectionProps extends BusinessAppContextProps {
  form: any;
  contactOption: string;
  setContactOption: (option: string) => void;
  selectedContact: string | undefined;
  setSelectedContact: (contact: string | undefined) => void;
  simpleAccounts: any[];
  simpleAccountsLoading: boolean;
  simpleAccountsHasMore: boolean;
  searchSimpleAccounts: (search: string) => void;
  loadMoreSimpleAccounts: () => void;
  simpleAccountsError: string | null;
}

// Single contact query for both initial load and search
const GET_CONTACTS_PAGINATED = (variables: {
  limit?: number;
  offset?: number;
  search?: string | null;
}): string => {
  const searchFilter = variables.search
    ? `, { _or: [
        { firstName: { _ilike: "%${variables.search}%" } },
        { lastName: { _ilike: "%${variables.search}%" } },
        { email: { _ilike: "%${variables.search}%" } }
      ] }`
    : "";

  return `
    query GetContactsPaginated {
      Contact(
        limit: ${variables.limit || 20}
        offset: ${variables.offset || 0}
        distinctOn: [firstName, lastName]
        where: {
          _and: [
            { isDeleted: { _eq: false } }${searchFilter}
          ]
        }
      ) {
      id
      firstName
      lastName
      email
      phone
    }

      ContactAggregate(
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

const ContactSection: React.FC<ContactSectionProps> = ({
  accessToken,
  form,
  contactOption,
  setContactOption,
  selectedContact,
  setSelectedContact,
  simpleAccounts,
  simpleAccountsLoading,
  simpleAccountsHasMore,
  searchSimpleAccounts,
  loadMoreSimpleAccounts,
  simpleAccountsError,
}) => {
  // Contact search and pagination state
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsHasMore, setContactsHasMore] = useState(true);
  const [contactsTotal, setContactsTotal] = useState(0);
  const [contactsOffset, setContactsOffset] = useState(0);
  const [currentContactSearch, setCurrentContactSearch] = useState("");
  const [contactSearchTerm, setContactSearchTerm] = useState("");
  const [isInitialContactLoadComplete, setIsInitialContactLoadComplete] =
    useState(false);

  // GraphQL client
  const graphQLClient = useGraphqlClient(accessToken);

  // Contact Owner Employee State
  const {
    employeePositions: contactEmployeePositionsData,
    loading: contactEmployeePositionsLoading,
    error: contactEmployeePositionsError,
    hasMore: contactEmployeePositionsHasMore,
    loadMore: loadMoreContactEmployeePositions,
    searchEmployees: searchContactEmployeePositions,
  } = useEmployeePositions({ accessToken });

  // Country hook for searchable dropdown in contact sections
  const countriesHook = useSearchableCatalog({
    accessToken,
    catalogIdentifier: COUNTRY_CATALOG,
  });

  // Academic Titles hook for contact section
  const academicTitlesHook = useSearchableCatalog({
    accessToken,
    catalogIdentifier: ACADEMIC_TITLE_CATALOG,
  });

  // Languages hook for contact section
  const languagesHook = useSearchableCatalog({
    accessToken,
    catalogIdentifier: LANGUAGES_CATALOG,
  });

  // Transform employee positions to SelectOption format for contact section
  const contactEmployeePositions: SelectOption[] =
    contactEmployeePositionsData.map((emp) => ({
      id: emp.employeeId,
      value: emp.employeeId,
      label: `${emp.firstName} ${emp.lastName}`,
      name: `${emp.firstName} ${emp.lastName}`,
      extraInfo: {
        pictureThumbnail: emp.employee.pictureThumbnail || undefined,
        jobPosition: emp.jobPosition?.name,
        organizationalUnit: emp.organizationalUnit?.name,
      },
    }));

  // Only allow countries with string labels
  const stringCountries = countriesHook.allOptions.filter(
    (c) => typeof c.label === "string"
  );

  // Only allow academic titles with string labels
  const stringAcademicTitles = academicTitlesHook.allOptions.filter(
    (at) => typeof at.label === "string"
  );

  // Only allow languages with string labels
  const stringLanguages = languagesHook.allOptions.filter(
    (lang) => typeof lang.label === "string"
  );

  // Static contact options (defined early to ensure availability)
  // Using enum values expected by the API: FOUNDER_CONTACT, PRIMARY_CONTACT, SECONDARY_CONTACT, UNKNOWN_CONTACT
  const contactTypes = [
    {
      id: "PRIMARY_CONTACT",
      value: "PRIMARY_CONTACT",
      label: "Primary Contact",
    },
    {
      id: "SECONDARY_CONTACT",
      value: "SECONDARY_CONTACT",
      label: "Secondary Contact",
    },
    {
      id: "FOUNDER_CONTACT",
      value: "FOUNDER_CONTACT",
      label: "Founder Contact",
    },
    {
      id: "UNKNOWN_CONTACT",
      value: "UNKNOWN_CONTACT",
      label: "Unknown Contact",
    },
  ];

  const contactRoles = [
    { id: "primary", value: "primary", label: "Primary Contact" },
    { id: "secondary", value: "secondary", label: "Secondary Contact" },
    { id: "decision-maker", value: "decision-maker", label: "Decision Maker" },
    { id: "influencer", value: "influencer", label: "Influencer" },
    { id: "champion", value: "champion", label: "Champion" },
  ];

  const departments = [
    { id: "sales", value: "sales", label: "Sales" },
    { id: "marketing", value: "marketing", label: "Marketing" },
    { id: "engineering", value: "engineering", label: "Engineering" },
    { id: "finance", value: "finance", label: "Finance" },
    { id: "hr", value: "hr", label: "Human Resources" },
    { id: "it", value: "it", label: "IT" },
    { id: "operations", value: "operations", label: "Operations" },
  ];

  // Debounce the search term to prevent excessive API calls
  const debouncedContactSearch = useDebounce(contactSearchTerm, 300);

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
      if (academicTitlesHook) {
        academicTitlesHook.initialize();
      }
      if (languagesHook) {
        languagesHook.initialize();
      }
    }
  }, [accessToken]);

  // Initialize form with CRM default source app
  useEffect(() => {
    if (!form.getFieldValue("contactSourceApp")) {
      form.setFieldsValue({ contactSourceApp: "CRM" });
    }
  }, [form]);

  // Contact pagination functions (same pattern as accounts)
  const fetchContactsPaginated = useCallback(
    async (searchTerm: string = "", resetList: boolean = false) => {
      if (!accessToken || !graphQLClient) return;

      setContactsLoading(true);
      try {
        const offset = resetList ? 0 : contactsOffset;
        const variables = {
          limit: 20,
          offset,
          search: searchTerm.trim() || null,
        };
        const query = GET_CONTACTS_PAGINATED(variables);
        const response = await graphQLClient.request(query);

        if (response?.Contact && response?.ContactAggregate) {
          const newContacts = response.Contact;
          const totalCount = response.ContactAggregate.aggregate.count;

          if (resetList) {
            setContacts(newContacts);
          } else {
            setContacts((prev) => [...prev, ...newContacts]);
          }

          setContactsTotal(totalCount);
          setContactsHasMore(newContacts.length === 20);
          setContactsOffset(
            resetList ? newContacts.length : contactsOffset + newContacts.length
          );
        }
      } catch (error) {
        console.error("Error fetching contacts:", error);
      } finally {
        setContactsLoading(false);
      }
    },
    [accessToken, graphQLClient, contactsOffset]
  );

  const searchContactsFunction = useCallback(
    (searchTerm: string = "") => {
      console.log(
        "🔍 [Contact SearchFunction] Called with term:",
        `"${searchTerm}"`,
        {
          contactsLength: contacts.length,
          isInitialContactLoadComplete,
          currentContactSearch,
        }
      );

      // If search term is empty and we don't have contacts loaded, reload initial contacts
      if (
        !searchTerm.trim() &&
        contacts.length === 0 &&
        isInitialContactLoadComplete
      ) {
        console.log("Empty contact search - reloading initial contacts");
        if (accessToken && graphQLClient) {
          fetchContactsPaginated("", true).catch((error) => {
            console.error("Error reloading initial contacts:", error);
          });
        }
      }

      // Set the search term - the debounced effect will handle the actual API call
      setContactSearchTerm(searchTerm);
    },
    [
      contacts.length,
      isInitialContactLoadComplete,
      currentContactSearch,
      accessToken,
      graphQLClient,
      fetchContactsPaginated,
    ]
  );

  const loadMoreContacts = useCallback(async () => {
    if (!contactsLoading && contactsHasMore) {
      await fetchContactsPaginated(currentContactSearch, false);
    }
  }, [
    contactsLoading,
    contactsHasMore,
    fetchContactsPaginated,
    currentContactSearch,
  ]);

  // Effect to trigger contact search when debounced contact search term changes
  useEffect(() => {
    console.log("Contact debounced effect check:", {
      isInitialContactLoadComplete,
      debouncedContactSearch: `"${debouncedContactSearch}"`,
      currentContactSearch: `"${currentContactSearch}"`,
      different: debouncedContactSearch !== currentContactSearch,
    });

    // Only run if initial load is complete and search term actually changed
    if (
      isInitialContactLoadComplete &&
      debouncedContactSearch !== currentContactSearch
    ) {
      console.log(
        "🔍 Contact debounced search triggered:",
        `"${debouncedContactSearch}"`
      );

      setCurrentContactSearch(debouncedContactSearch);
      setContactsOffset(0);
      setContactsHasMore(true);

      if (accessToken && graphQLClient) {
        // If search is empty, load initial 20 contacts without clearing the array first
        // If search has a term, clear and search
        if (debouncedContactSearch.trim() === "") {
          console.log("🔄 Empty contact search - loading initial 20 contacts");
          fetchContactsPaginated("", true).catch((error) => {
            console.error("Error loading initial contacts:", error);
          });
        } else {
          console.log(
            "🔄 [Location Contact] Clearing contacts for search:",
            debouncedContactSearch
          );
          setContacts([]);
          fetchContactsPaginated(debouncedContactSearch, true).catch(
            (error) => {
              console.error("Error in contact search:", error);
            }
          );
        }
      }
    }
  }, [
    debouncedContactSearch,
    currentContactSearch,
    isInitialContactLoadComplete,
    accessToken,
    graphQLClient,
    fetchContactsPaginated,
  ]);

  // Load initial contacts on mount
  useEffect(() => {
    const loadInitialContacts = async () => {
      if (!accessToken || !graphQLClient) return;

      console.log("Loading initial contacts...", {
        accessToken: !!accessToken,
        graphQLClient: !!graphQLClient,
      });

      // Reset state and load initial contacts
      console.log(
        "🔄 [Location Contact] Clearing contacts in loadInitialContacts"
      );
      setContactsOffset(0);
      setContactsHasMore(true);
      setContacts([]);
      setCurrentContactSearch("");
      setContactsLoading(true);

      try {
        // Use single query for initial load with null search
        const variables = { limit: 20, offset: 0, search: null };
        const query = GET_CONTACTS_PAGINATED(variables);
        const response = await graphQLClient.request(query);

        if (response?.Contact && response?.ContactAggregate) {
          const contacts = response.Contact;
          const totalCount = response.ContactAggregate.aggregate.count;

          console.log(
            `Initial contact load: Got ${contacts.length} contacts from query response`
          );

          setContacts(contacts);
          setContactsTotal(totalCount);
          setContactsHasMore(contacts.length === 20);
          setContactsOffset(contacts.length);

          console.log(
            "Contacts loaded, user can now select from:",
            contacts.length,
            "options"
          );
        }
      } catch (error) {
        console.error("Error loading initial contacts:", error);
      } finally {
        setContactsLoading(false);
        setIsInitialContactLoadComplete(true);
      }
    };

    loadInitialContacts();
  }, [accessToken, graphQLClient]);

  // Debug effect to track when contacts state changes
  useEffect(() => {
    console.log("📊 Contacts state changed:", {
      length: contacts.length,
      names: contacts
        .map((contact: any) => `${contact.firstName} ${contact.lastName}`)
        .slice(0, 3),
      timestamp: new Date().toLocaleTimeString(),
    });
  }, [contacts]);

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
    <Card className="gba:mb-4" data-testid="contact-section">
      <CardHeader>
        <CardTitle className="gba:text-lg gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel(
            "crm:convertLead.contact",
            "Contact"
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-2">
          <div>
            <label className="gba:text-sm gba:font-medium gba:mb-2 gba:block">
              {getTranslationFromI18nKeyAndLabel(
                "crm:convertLead.contactOption",
                "Contact Option"
              )}
            </label>
            <RadioGroup
              value={contactOption}
              onValueChange={setContactOption}
              className="gba:flex gba:gap-6"
              data-testid="contact-option-radio"
            >
              <div className="gba:flex gba:items-center gba:space-x-4">
                <RadioGroupItem
                  value="match"
                  id="contact-match"
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    border: "2px solid var(--nw-color-border)",
                    backgroundColor: "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                />
                <Label
                  htmlFor="contact-match"
                  className="gba:cursor-pointer"
                  style={{ marginLeft: "5px" }}
                >
                  {getTranslationFromI18nKeyAndLabel(
                    "crm:convertLead.matchExistingContact",
                    "Match existing contact"
                  )}
                </Label>
              </div>
              <div className="gba:flex gba:items-center gba:space-x-4">
                <RadioGroupItem
                  value="new"
                  id="contact-new"
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    border: "2px solid var(--nw-color-border)",
                    backgroundColor: "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                />
                <Label
                  htmlFor="contact-new"
                  className="gba:cursor-pointer"
                  style={{ marginLeft: "5px" }}
                >
                  {getTranslationFromI18nKeyAndLabel(
                    "crm:convertLead.createNewContact",
                    "Create new contact"
                  )}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {contactOption === "match" && (
            <div className="gba:space-y-2 gba:w-full">
              <Label htmlFor="contact-select">
                {getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.selectContact",
                  "Select Contact"
                )}
              </Label>
              <div className="gba:w-full">
                <SearchableSelect
                  label=""
                  name="contact"
                  value={selectedContact}
                  placeholder="Search and select a contact..."
                  options={(() => {
                    console.log("🔍 [Contact Options] Building options:", {
                      contactsLength: contacts.length,
                      contactsLoading,
                      currentContactSearch: `"${currentContactSearch}"`,
                      contacts: contacts
                        .map(
                          (contact: any) =>
                            `${contact.firstName} ${contact.lastName}`
                        )
                        .slice(0, 5),
                    });
                    return contacts.map((contact: any) => ({
                      id: contact.id,
                      value: contact.id,
                      label: `${contact.firstName} ${contact.lastName} ${
                        contact.email ? `(${contact.email})` : ""
                      }`,
                      name: `${contact.firstName} ${contact.lastName}`,
                    }));
                  })()}
                  loading={contactsLoading}
                  hasMore={contactsHasMore}
                  onSearch={searchContactsFunction}
                  onLoadMore={loadMoreContacts}
                  onChange={(value: string) => {
                    console.log("Contact selected:", value);
                    setSelectedContact(value);
                  }}
                  data-testid="contact-select"
                />
              </div>
            </div>
          )}

          {contactOption === "new" && (
            <div className="gba:space-y-1">
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
                    "crm:contact.basicInformation",
                    "Basic Information"
                  )}
                </h4>
                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-1">
                  {/* First Name */}
                  <div>
                    <Form.Item
                      name="newContactFirstName"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:contact.firstName",
                        "First Name"
                      )}
                      rules={[
                        {
                          required: true,
                          message: getTranslationFromI18nKeyAndLabel(
                            "crm:contact.firstNameRequired",
                            "Please enter first name"
                          ),
                        },
                      ]}
                    >
                      <DesignInput
                        data-testid="new-contact-first-name"
                        className="gba:h-11 gba:px-3 gba:text-sm"
                      />
                    </Form.Item>
                  </div>
                  {/* Last Name */}
                  <div>
                    <Form.Item
                      name="newContactLastName"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:contact.lastName",
                        "Last Name"
                      )}
                      rules={[
                        {
                          required: true,
                          message: getTranslationFromI18nKeyAndLabel(
                            "crm:contact.lastNameRequired",
                            "Please enter last name"
                          ),
                        },
                      ]}
                    >
                      <DesignInput
                        data-testid="new-contact-last-name"
                        className="gba:h-11 gba:px-3 gba:text-sm"
                      />
                    </Form.Item>
                  </div>
                  {/* Contact Code */}
                  <div>
                    <Form.Item
                      name="contactCode"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:contact.code",
                        "Contact Code"
                      )}
                    >
                      <DesignInput
                        data-testid="contact-code"
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          "crm:contact.codePlaceholder",
                          "Enter contact code..."
                        )}
                        className="gba:h-11 gba:px-3 gba:text-sm"
                      />
                    </Form.Item>
                  </div>
                  {/* Academic Title */}
                  <div>
                    <Form.Item
                      name="contactAcademicTitle"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:contact.academicTitle",
                        "Academic Title"
                      )}
                    >
                      <SearchableSelect
                        name="contactAcademicTitle"
                        value={form.getFieldValue("contactAcademicTitle")}
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          "crm:contact.selectAcademicTitle",
                          "Select Academic Title"
                        )}
                        options={stringAcademicTitles as any}
                        loading={academicTitlesHook.loading}
                        hasMore={academicTitlesHook.hasMore}
                        onSearch={academicTitlesHook.search}
                        onLoadMore={academicTitlesHook.loadMore}
                        onChange={(value) => {
                          form.setFieldsValue({ contactAcademicTitle: value });
                        }}
                        error={academicTitlesHook.error}
                        data-testid="contact-academic-title-select"
                      />
                    </Form.Item>
                  </div>
                  {/* Language */}
                  <div>
                    <Form.Item
                      name="contactLanguage"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:contact.language",
                        "Language"
                      )}
                    >
                      <SearchableSelect
                        name="contactLanguage"
                        value={form.getFieldValue("contactLanguage")}
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          "crm:contact.selectLanguage",
                          "Select Language"
                        )}
                        options={stringLanguages as any}
                        loading={languagesHook.loading}
                        hasMore={languagesHook.hasMore}
                        onSearch={languagesHook.search}
                        onLoadMore={languagesHook.loadMore}
                        onChange={(value) => {
                          form.setFieldsValue({ contactLanguage: value });
                        }}
                        error={languagesHook.error}
                        data-testid="contact-language-select"
                      />
                    </Form.Item>
                  </div>
                  {/* Source App */}
                  <div>
                    <Form.Item
                      name="contactSourceApp"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:contact.sourceApp",
                        "Source App"
                      )}
                      rules={[
                        {
                          required: true,
                          message: getTranslationFromI18nKeyAndLabel(
                            "crm:contact.sourceAppRequired",
                            "Please select source app"
                          ),
                        },
                      ]}
                      initialValue="CRM"
                    >
                      <DesignSelect
                        value={form.getFieldValue("contactSourceApp") || "CRM"}
                        defaultValue="CRM"
                        onValueChange={(value: string) => {
                          form.setFieldsValue({ contactSourceApp: value });
                        }}
                        data-testid="contact-source-app-select"
                      >
                        <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                          <SelectValue
                            placeholder={getTranslationFromI18nKeyAndLabel(
                              "crm:contact.selectSourceApp",
                              "Select Source App"
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          className="gba:bg-white gba:border gba:border-gray-300 gba:rounded-md gba:shadow-lg gba:z-50"
                        >
                          {/* CRM should be first/default option */}
                          <SelectItem value="CRM">CRM</SelectItem>
                          <SelectItem value="IRM">IRM</SelectItem>
                        </SelectContent>
                      </DesignSelect>
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
                    "crm:contact.companyInformation",
                    "Company Information"
                  )}
                </h4>
                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-1">
                  {/* Company */}
                  <div className="gba:md:col-span-2">
                    <Form.Item
                      name="contactCompanyId"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:contact.company",
                        "Company"
                      )}
                    >
                      <SearchableSelect
                        name="contactCompanyId"
                        value={form.getFieldValue("contactCompanyId")}
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          "crm:contact.selectCompany",
                          "Search and select company..."
                        )}
                        options={(() => {
                          console.log(
                            "🔍 [Contact Company Options] Building options:",
                            {
                              accountsLength: simpleAccounts.length,
                              accountsLoading: simpleAccountsLoading,
                              accounts: simpleAccounts
                                .map((account: any) => account?.name)
                                .slice(0, 5), // First 5 names only
                            }
                          );
                          return simpleAccounts.map((account: any) => ({
                            id: account.id,
                            value: account.id,
                            label: account?.name,
                            name: account?.name,
                          }));
                        })()}
                        onSearch={searchSimpleAccounts}
                        loading={simpleAccountsLoading}
                        hasMore={simpleAccountsHasMore}
                        onLoadMore={loadMoreSimpleAccounts}
                        onChange={(value: string) => {
                          console.log("Contact company selected:", value);
                          form.setFieldsValue({ contactCompanyId: value });
                        }}
                        error={simpleAccountsError}
                        data-testid="contact-company-select"
                      />
                    </Form.Item>
                  </div>
                  {/* Job Title */}
                  <div>
                    <Form.Item
                      name="contactJobTitle"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:contact.jobTitle",
                        "Job Title"
                      )}
                    >
                      <DesignInput
                        data-testid="contact-job-title"
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          "crm:contact.jobTitlePlaceholder",
                          "Enter job title..."
                        )}
                        className="gba:h-11 gba:px-3 gba:text-sm"
                      />
                    </Form.Item>
                  </div>
                  {/* Department */}
                  <div>
                    <Form.Item
                      name="contactDepartment"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:contact.department",
                        "Department"
                      )}
                    >
                      <SearchableSelect
                        name="contactDepartment"
                        value={form.getFieldValue("contactDepartment")}
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          "crm:contact.selectDepartment",
                          "Select Department"
                        )}
                        options={departments as any}
                        onChange={(value) => {
                          form.setFieldsValue({ contactDepartment: value });
                        }}
                        data-testid="contact-department-select"
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
                    "crm:contact.contactInformation",
                    "Contact Information"
                  )}
                </h4>
                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-1">
                  {/* Email */}
                  <div>
                    <Form.Item
                      name="newContactEmail"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:contact.email",
                        "Email"
                      )}
                    >
                      <DesignInput
                        data-testid="new-contact-email"
                        type="email"
                        className="gba:h-11 gba:px-3 gba:text-sm"
                      />
                    </Form.Item>
                  </div>
                  {/* Phone */}
                  <div>
                    <Form.Item
                      name="newContactPhone"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:contact.phone",
                        "Phone"
                      )}
                    >
                      <DesignInput
                        data-testid="new-contact-phone"
                        type="tel"
                        className="gba:h-11 gba:px-3 gba:text-sm"
                      />
                    </Form.Item>
                  </div>
                  {/* Fax */}
                  <div>
                    <Form.Item
                      name="contactFax"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:contact.fax",
                        "Fax"
                      )}
                    >
                      <DesignInput
                        data-testid="contact-fax"
                        type="tel"
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          "crm:contact.faxPlaceholder",
                          "Enter fax number..."
                        )}
                        className="gba:h-11 gba:px-3 gba:text-sm"
                      />
                    </Form.Item>
                  </div>
                  {/* LinkedIn URL */}
                  <div>
                    <Form.Item
                      name="contactLinkedinUrl"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:contact.linkedinUrl",
                        "LinkedIn URL"
                      )}
                    >
                      <DesignInput
                        data-testid="contact-linkedin-url"
                        type="url"
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          "crm:contact.linkedinUrlPlaceholder",
                          "Enter LinkedIn profile URL..."
                        )}
                        className="gba:h-11 gba:px-3 gba:text-sm"
                      />
                    </Form.Item>
                  </div>
                  {/* XING URL */}
                  <div>
                    <Form.Item
                      name="contactXingUrl"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:contact.xingUrl",
                        "XING URL"
                      )}
                    >
                      <DesignInput
                        data-testid="contact-xing-url"
                        type="url"
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          "crm:contact.xingUrlPlaceholder",
                          "Enter XING profile URL..."
                        )}
                        className="gba:h-11 gba:px-3 gba:text-sm"
                      />
                    </Form.Item>
                  </div>
                </div>
              </div>

              {/* Contact Relationship Section */}
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
                    "crm:contact.contactRelationship",
                    "Contact Relationship"
                  )}
                </h4>
                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-1">
                  {/* Contact Type */}
                  <div>
                    <Form.Item
                      name="contactType"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:contact.contactType",
                        "Contact Type"
                      )}
                    >
                      <SearchableSelect
                        name="contactType"
                        value={form.getFieldValue("contactType")}
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          "crm:contact.selectContactType",
                          "Select Contact Type"
                        )}
                        options={contactTypes as any}
                        onChange={(value) => {
                          form.setFieldsValue({ contactType: value });
                        }}
                        data-testid="contact-type-select"
                      />
                    </Form.Item>
                  </div>
                  {/* Contact Role */}
                  <div>
                    <Form.Item
                      name="contactRole"
                      label={getTranslationFromI18nKeyAndLabel(
                        "crm:contact.contactRole",
                        "Contact Role"
                      )}
                    >
                      <SearchableSelect
                        name="contactRole"
                        value={form.getFieldValue("contactRole")}
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          "crm:contact.selectContactRole",
                          "Select Contact Role"
                        )}
                        options={contactRoles as any}
                        onChange={(value) => {
                          form.setFieldsValue({ contactRole: value });
                        }}
                        data-testid="contact-role-select"
                      />
                    </Form.Item>
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
                    "crm:contact.addressInformation",
                    "Address Information"
                  )}
                </h4>
                {renderAddressForm(
                  "contactAddresses",
                  getTranslationFromI18nKeyAndLabel(
                    "crm:contact.address",
                    "Contact Address"
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
                    "crm:contact.ownerInformation",
                    "Owner Information"
                  )}
                </h4>
                <div className="gba:space-y-2">
                  <Label htmlFor="contact-owner-select">
                    {getTranslationFromI18nKeyAndLabel(
                      "crm:contact.ownerEmployee",
                      "Owner Employee"
                    )}
                    <span className="gba:text-red-500 gba:ml-1">*</span>
                  </Label>
                  <OwnerSelector
                    value={form.getFieldValue("contactOwnerEmployee") || ""}
                    onChange={(value: string) => {
                      console.log("🔍 Contact Owner Selected:", value);
                      form.setFieldsValue({ contactOwnerEmployee: value });
                    }}
                    employees={contactEmployeePositions as any}
                    loading={contactEmployeePositionsLoading}
                    hasMore={contactEmployeePositionsHasMore}
                    onLoadMore={loadMoreContactEmployeePositions}
                    onSearch={(searchTerm: string) => {
                      searchContactEmployeePositions(searchTerm);
                    }}
                    error={contactEmployeePositionsError}
                    dataTestId="contact-owner-select"
                  />
                  {/* Hidden input to ensure form captures the value */}
                  <Form.Item
                    name="contactOwnerEmployee"
                    style={{ display: "none" }}
                    rules={[
                      {
                        required: true,
                        message: getTranslationFromI18nKeyAndLabel(
                          "crm:contact.ownerEmployeeRequired",
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
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactSection;
