import React, { useState, useEffect } from "react";
import { Typography, Row, Col, Spin, message, Form, Input, Select, DatePicker, Avatar } from 'antd';
import { 
  MailOutlined, 
  PhoneOutlined, 
  FileTextOutlined,
  VideoCameraOutlined, 
  PlusCircleOutlined,
  ArrowLeftOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  BulbOutlined,
  TeamOutlined,
  CalendarOutlined,
  CaretDownOutlined,
  CommentOutlined,
  BankOutlined,
  UserOutlined,
  StarOutlined,
  TagsOutlined,
  FunnelPlotOutlined,
  EditOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from "../../../../common/BusinessAppContext";
import { Button } from "./common/ui/button";
import { useGraphqlClient } from "../../../../common/network/graphql/useGraphQLClient";
import { GET_LEAD_BY_ID, GetLeadByIdResponse } from "./queries/getLeadById";
import EditLead from "./EditLead";
import { useCatalogManagerClient } from "../../../../common/network/catalogs/useCatalogManagerClient";
import dayjs from 'dayjs';
import {getActivityByLeadId} from "./queries/getActivityByLeadId";
import { startProcess } from "@/common/utils/start-process";

const { Text } = Typography;
const { Option } = Select;

interface Activity { 
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note';
  title: string;
  date: string;
  user: {
    name: string;
    avatar?: string;
  };
  description?: string;
}

// Define opportunity type
interface Opportunity {
  id: string;
  name: string;
  value: number;
  stage: "Discovery" | "Proposal" | "Negotiation" | "Closed Won" | "Closed Lost";
  probability: number;
  expectedCloseDate: string;
  owner: string;
  stageColor: string;
}

interface Contact {
  id: string;
  version: string;
  email: string;
  name: string;
  phone: string;
  pictureUrl: string;
  jobTitle:string;
}

interface Lead {
  id: string;
  name: string;
  logo?: string;
  status: string;
  leadName:string;
  version: string;
  statusRef?: string;
  source: {
    id: string;
    type: string;
    value: string;
    code: string;
  };
  sourceRef: string;
  rating: string;
  industryRef?: string;
  industry: {
    value?: string;
    type?: string;
    id?: string;
    code?: string;
  };
  country?: {
    value?: string;
    type?: string;
    id?: string;
    code?: string;
  };
  numberOfEmployeesRef?: string;
  numberOfEmployees?: {
    value?: string;
    type?: string;
    id?: string;
    code?: string;
  };
  companyWebsite: string;
  address: string;
  revenue: string;
  ownerEmployeeId: string;
  ownerEmployee: {
    firstName: string;
    lastName: string;
  }
  ownerOrganization: {
    name: string;
  }
  annualRevenueRef?: string;
  annualRevenue?: {
    value?: string;
    type?: string;
    id?: string;
    code?: string;
  };
  regionRef?: string;
  legalForm?: string | {
    value?: string;
    type?: string;
    id?: string;
    code?: string;
  };
  legalFormRef?: string;
  accountId:string;
  account?: {
    id: string;
    version: string;
    name: string;
    industryRef: string;
    industry: {
      code: string;
      id: string;
      type: string;
      value: string;
    };
    numberOfEmployees: {
      type: string;
      value: string;
      id: string;
      code: string;
    };
    numberOfEmployeesRef: string;
    addressLine: string;
    foundationDate: string;
    annualRevenueRef: string;
    annualRevenue: {
      type: string;
      value: string;
      id: string;
      code: string;
    };
    website: string;
    ownerEmployeeId?: string;
    ownerEmployee?: {
      firstName: string;
      lastName: string;
    };
  } | null;
  leadRating: {
    id: string;
    type: string;
    value: string;
    code: string;
  };
  leadRatingRef: string;
  contact: Contact;
  activities: LeadActivity[];
  opportunities: Opportunity[];
  aiSummary: {
    text: string;
    insights: string[];
    recommendations: string[];
  };
}

interface LeadActivity {
  id: string;
  version: string;
  title: string;
  leadId: string;
  opportunityId: string;
  ownerEmployeeId: string;
  ownerEmployee: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  description: string;
  activityType: {
    code: string;
    id: string;
    type: string;
    value: string;
  };
}

interface LeadDetailsProps extends BusinessAppContextProps {
  leadId: string;
  onBack?: () => void;
}

interface ReferenceData {
  id: string;
  code: string;
  value: string;
}

const LeadDetails: React.FC<LeadDetailsProps> = (props) => {
  const { leadId } = props;
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isEditingCompanyInfo, setIsEditingCompanyInfo] = useState<boolean>(false);
  const [isEditingContactInfo, setIsEditingContactInfo] = useState<boolean>(false);
  const [isEditingLeadInfo, setIsEditingLeadInfo] = useState<boolean>(false);
  const [form] = Form.useForm();
  const [contactForm] = Form.useForm();
  const [leadForm] = Form.useForm();
  const [revenueSizeOptions, setRevenueSizeOptions] = useState<ReferenceData[]>([]);
  const [leadSourceOptions, setLeadSourceOptions] = useState<ReferenceData[]>([]);
  const [leadStatusOptions, setLeadStatusOptions] = useState<ReferenceData[]>([]);
  const [industryOptions, setIndustryOptions] = useState<ReferenceData[]>([]);
  const [numberOfEmployeesOptions, setNumberOfEmployeesOptions] = useState<ReferenceData[]>([]);
  const [countryOptions, setCountryOptions] = useState<ReferenceData[]>([]);
  const [leadRatingOptions, setLeadRatingOptions] = useState<ReferenceData[]>([]);
  const [loadingCatalogData, setLoadingCatalogData] = useState<boolean>(false);
  const [savingCompanyInfo, setSavingCompanyInfo] = useState<boolean>(false);
  const [savingContactInfo, setSavingContactInfo] = useState<boolean>(false);
  const [savingLeadInfo, setSavingLeadInfo] = useState<boolean>(false);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [leadData, setLeadData] = useState<Lead | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Get the catalog client at component level
  const catalogClient = useCatalogManagerClient(props.accessToken);
  
  const graphQLClient = useGraphqlClient(props.accessToken);
  
  const hardcodedOpportunities: Opportunity[] = [
    {
      id: "1",
      name: "IT Infrastructure Upgrade - Finance Department",
      value: 75000,
      stage: "Proposal",
      stageColor: "#1890ff",
      probability: 60,
      expectedCloseDate: "2023-07-15",
      owner: "John Doe"
    },
    {
      id: "2",
      name: "CRM Implementation - Sales Team",
      value: 45000,
      stage: "Discovery",
      stageColor: "#52c41a",
      probability: 30,
      expectedCloseDate: "2023-08-30",
      owner: "Sarah Lee"
    },
    {
      id: "3",
      name: "Cloud Migration Project",
      value: 120000,
      stage: "Negotiation",
      stageColor: "#722ed1",
      probability: 75,
      expectedCloseDate: "2023-06-30",
      owner: "John Doe"
    },
  ];
  
  const hardcodedAiSummary = {
    text: "Acme Corporation is showing strong interest in our enterprise solution. They're currently evaluating our API capabilities against competitors. The technical team was impressed during the demo, but pricing remains a concern for procurement. The CTO (Jane Smith) is our champion, while the Procurement Manager (John Doe) needs more convincing on ROI.",
    insights: [
      "Technical team is impressed with our API capabilities",
      "Pricing is a potential obstacle for procurement",
      "CTO is supportive but needs help convincing Finance team",
      "Competitor X is also being evaluated"
    ],
    recommendations: [
      "Schedule ROI discussion with Procurement Manager",
      "Send case studies from similar technology companies",
      "Prepare custom implementation timeline"
    ]
  };

  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await graphQLClient.request<GetLeadByIdResponse>(
          GET_LEAD_BY_ID,
          {
            id: leadId
          }
        );
        const activityResult = await graphQLClient.request(
          getActivityByLeadId,
            {
              id: leadId,
              limit: 20,
              offset: 0
            }
      );

      const activities: LeadActivity[] = 
      (activityResult?.SalesActivity && activityResult.SalesActivity.length > 0) 
        ? activityResult.SalesActivity.map((activity: any) => ({
            id: activity.id || "",
            version: activity.version || "1",
            title: activity.title || "",
            leadId: activity.leadId || leadId,
            opportunityId: activity.opportunityId || "",
            ownerEmployeeId: activity.ownerEmployeeId || "",
            ownerEmployee: activity.ownerEmployee ? {
              firstName: activity.ownerEmployee.firstName || "",
              lastName: activity.ownerEmployee.lastName || ""
            } : {
              firstName: "",
              lastName: ""
            },
            createdAt: activity.createdAt || "",
            description: activity.description || "",
            activityType: activity.activityType || {
              code: activity.type?.toUpperCase() || "NOTE",
              id: `InvestmentActivityType:v1:${activity.type?.toUpperCase() || "NOTE"}`,
              type: "activity",
              value: activity.type ? activity.type.charAt(0).toUpperCase() + activity.type.slice(1) : "Note"
            }
          }))
        : [];
        if (result && result.Lead && result.Lead[0]) {
          const apiData = result.Lead[0];
          const transformedData: Lead = {
            id: apiData.id,
            name: apiData.companyName || `${apiData.firstName} ${apiData.lastName}`,
            leadName: apiData.name,
            version: apiData.version,
            source: {
              id: apiData.source?.id || "",
              type: apiData.source?.type || "",
              value: apiData.source?.value || "",
              code: apiData.source?.code || ""
            },
            sourceRef: apiData.sourceRef,
            rating: apiData.rating,
            status: apiData.status?.value || "New",
            statusRef: apiData.statusRef,
            industry: {
              value: apiData.industry?.value || "",
              type: apiData.industry?.type || "",
              id: apiData.industry?.id || "",
              code: apiData.industry?.code || ""
            },
            country: {
              value: apiData.country?.value || "",
              type: apiData.country?.type || "",
              id: apiData.country?.id || "",
              code: apiData.country?.code || ""
            },
            countryRef: apiData.countryRef,
            industryRef: apiData.industryRef,
            numberOfEmployees: {
              value: apiData.numberOfEmployees?.value || "",
              type: apiData.numberOfEmployees?.type || "",
              id: apiData.numberOfEmployees?.id || "",
              code: apiData.numberOfEmployees?.code || ""
            },
            leadRating: {
              id: apiData.leadRating?.id || "",
              type: apiData.leadRating?.type || "",
              value: apiData.leadRating?.value || "",
              code: apiData.leadRating?.code || ""
            },
            leadRatingRef: apiData.leadRatingRef,
            numberOfEmployeesRef: apiData.numberOfEmployeesRef,
            companyWebsite: apiData.companyWebsite,
            address: [
              apiData.city, 
              apiData.postalCode, 
              apiData.country?.value
            ].filter(Boolean).join(", "),
            revenue: apiData.annualRevenue?.value || "",
            annualRevenueRef: apiData.annualRevenueRef,
            annualRevenue: {
              value: apiData.annualRevenue?.value || "",
              type: apiData.annualRevenue?.type || "",
              id: apiData.annualRevenue?.id || "",
              code: apiData.annualRevenue?.code || ""
            },
            regionRef: apiData.regionRef,
            legalForm: apiData.legalForm?.value || "",
            legalFormRef: apiData.legalFormRef,
            ownerOrganization: apiData?.ownerOrganization ? 
              {
                name: apiData?.ownerOrganization?.name || ""
              } : undefined,
            accountId: apiData.accountId || "",
            account: apiData.account ? {
              id: apiData.account.id || "",
              version: apiData?.account?.version,
              name: apiData.account.name || "",
              industryRef: apiData.account.industryRef || "",
              industry: {
                code: apiData.account.industry?.code || "",
                id: apiData.account.industry?.id || "",
                type: apiData.account.industry?.type || "",
                value: apiData.account.industry?.value || ""
              },
              numberOfEmployees: {
                type: apiData.account.numberOfEmployees?.type || "",
                value: apiData.account.numberOfEmployees?.value || "",
                id: apiData.account.numberOfEmployees?.id || "",
                code: apiData.account.numberOfEmployees?.code || ""
              },
              numberOfEmployeesRef: apiData.account.numberOfEmployeesRef || "",
              addressLine: apiData.account.addressLine || "",
              foundationDate: apiData.account.foundationDate || "",
              annualRevenueRef: apiData.account.annualRevenueRef || "",
              annualRevenue: {
                type: apiData.account.annualRevenue?.type || "",
                value: apiData.account.annualRevenue?.value || "",
                id: apiData.account.annualRevenue?.id || "",
                code: apiData.account.annualRevenue?.code || ""
              },
              website: apiData.account.website || "",
              ownerEmployeeId: apiData.account.ownerEmployeeId || "",
              ownerEmployee: {
                firstName: apiData.account.ownerEmployee?.firstName || '',
                lastName: apiData.account.ownerEmployee?.lastName || ''
              }
            } : null,
            ownerEmployeeId: apiData.ownerEmployeeId || "",
            ownerEmployee: {
              firstName: apiData.ownerEmployee?.firstName || '',
              lastName: apiData.ownerEmployee?.lastName || ''
            },
            contact: apiData.contact ? 
              {
                id: apiData.contact.id || "",
                version: apiData?.contact?.version,
                name: `${apiData.contact.firstName || ''} ${apiData.contact.lastName || ''}`.trim(),
                email: apiData.contact.email || "",
                phone: apiData.contact.phone || "",
                jobTitle: apiData.contact.jobTitle || "",
                pictureUrl: apiData.contact.pictureUrl || ""
              } : 
              {
                name: "",
                email: "",
                phone: "",
                jobTitle: "",
                pictureUrl: ""
              },
            activities: activities,
            opportunities: hardcodedOpportunities,
            aiSummary: hardcodedAiSummary
          };
          setLeadData(transformedData);
        } else {
          throw new Error("Lead not found");
        }
      } catch (err) {
        console.error("Error fetching lead data:", err);
        setError("Failed to load lead data. Please try again later.");
        message.error("Failed to load lead data");

        setLeadData({
          id: leadData?.id || "",
          version: leadData?.version || "",
          name: leadData?.name || "",
          leadName: leadData?.leadName || "",
          status: leadData?.status || "",
          statusRef: leadData?.statusRef || "",
          source: {
            id: leadData?.source?.id || "",
            type: leadData?.source?.type || "",
            value: leadData?.source?.value || "",
            code: leadData?.source?.code || ""
          },
          sourceRef: leadData?.sourceRef || "",
          rating: leadData?.rating || "",
          industry: {
            value: leadData?.industry?.value || "",
            type: leadData?.industry?.type || "",
            id: leadData?.industry?.id || "",
            code: leadData?.industry?.code || ""
          },
          industryRef: leadData?.industryRef || "",
          numberOfEmployees: {
            value: leadData?.numberOfEmployees?.value || "",
            type: leadData?.numberOfEmployees?.type || "",
            id: leadData?.numberOfEmployees?.id || "",
            code: leadData?.numberOfEmployees?.code || ""
          },
          numberOfEmployeesRef: leadData?.numberOfEmployeesRef || "",
          companyWebsite: leadData?.companyWebsite || "",
          address: leadData?.address || "",
          revenue: leadData?.revenue || "",
          annualRevenueRef: leadData?.annualRevenueRef || "",
          annualRevenue: {
            value: leadData?.annualRevenue?.value || "",
            type: leadData?.annualRevenue?.type || "",
            id: leadData?.annualRevenue?.id || "",
            code: leadData?.annualRevenue?.code || ""
          },
          regionRef: leadData?.regionRef || "",
          legalForm: leadData?.legalForm || "",
          legalFormRef: leadData?.legalFormRef || "",
          contact: leadData?.contact || {
            id: leadData?.contact?.id || "",
            version: leadData?.contact?.version || "",
            name: leadData?.contact?.name || "",
            email: leadData?.contact?.email || "",
            phone: leadData?.contact?.phone || "",
            pictureUrl: leadData?.contact?.pictureUrl || "",
            jobTitle: leadData?.contact?.jobTitle || ""
          },
          country: leadData?.country || {
            value: leadData?.country?.value || "",
            type: leadData?.country?.type || "",
            id: leadData?.country?.id || "",
            code: leadData?.country?.code || ""
          },
          accountId:leadData?.accountId || "",
          ownerOrganization: leadData?.ownerOrganization ? 
            {
              name: leadData?.ownerOrganization?.name || ""
            } : undefined,
          account: leadData?.account ? {
            id: leadData.account.id || "",
            version: leadData.account.version || "",
            name: leadData.account.name || "",
            industryRef: leadData.account.industryRef || "",
            industry: {
              code: leadData.account.industry?.code || "",
              id: leadData.account.industry?.id || "",
              type: leadData.account.industry?.type || "",
              value: leadData.account.industry?.value || ""
            },
            numberOfEmployees: {
              type: leadData.account.numberOfEmployees?.type || "",
              value: leadData.account.numberOfEmployees?.value || "",
              id: leadData.account.numberOfEmployees?.id || "",
              code: leadData.account.numberOfEmployees?.code || ""
            },
            numberOfEmployeesRef: leadData.account.numberOfEmployeesRef || "",
            addressLine: leadData.account.addressLine || "",
            foundationDate: leadData.account.foundationDate || "",
            annualRevenueRef: leadData.account.annualRevenueRef || "",
            annualRevenue: {
              type: leadData.account.annualRevenue?.type || "",
              value: leadData.account.annualRevenue?.value || "",
              id: leadData.account.annualRevenue?.id || "",
              code: leadData.account.annualRevenue?.code || ""
            },
            website: leadData.account.website || "",
            ownerEmployeeId: leadData.account.ownerEmployeeId || "",
            ownerEmployee: {
              firstName: leadData.account.ownerEmployee?.firstName || '',
              lastName: leadData.account.ownerEmployee?.lastName || ''
            }
          } : null,
          leadRating: {
            id: leadData?.leadRating?.id || "",
            type: leadData?.leadRating?.type || "",
            value: leadData?.leadRating?.value || "",
            code: leadData?.leadRating?.code || ""
          },
          leadRatingRef: leadData?.leadRatingRef || "",
          ownerEmployeeId: leadData?.ownerEmployeeId || "",
          ownerEmployee: leadData?.ownerEmployee || {
            firstName: leadData?.ownerEmployee?.firstName || '',
            lastName: leadData?.ownerEmployee?.lastName || ''
          },
          activities: leadData.activities || [],
          opportunities: hardcodedOpportunities,
          aiSummary: hardcodedAiSummary
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeadData();
  }, [graphQLClient, refreshTrigger]);

  const [activeTab, setActiveTab] = useState("overview");
  const [activeActivityTab, setActiveActivityTab] = useState("activities");
  
    
  if (loading) {
    return (
      <div className="gba:loading-container" data-testid="lead-loading-container" style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'white'
      }}>
        <Spin size="large" tip="Loading lead data..." />
      </div>
    );
  }
  
  // If there's an error and no lead data, show error state
  if (error && !leadData) {
    return (
      <div className="gba:error-container" data-testid="lead-error-container" style={{ 
        padding: '20px',
        textAlign: 'center',
        backgroundColor: 'white'
      }}>
        <h2>Error</h2>
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }
  
  // Now we can safely use leadData since it's either from API or fallback
  const lead = leadData!;

  const handleSaveLead = (updatedData: Partial<Lead>) => {
    setIsEditing(false);
    setLeadData(prev => prev ? { ...prev, ...updatedData } : null);
    // Trigger a refetch from API to ensure we have the latest version
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAddAccount = async () => {
    setIsEditingCompanyInfo(true);
    await fetchRevenueSizeOptions();
    
    // Set initial form values
    if (leadData) {
      form.resetFields();
    }
  };

  const handleUpdateAccount = async () => {
    if (!leadData?.account) return;
    
    setIsEditingCompanyInfo(true);
    await fetchRevenueSizeOptions();
    
    // Set initial form values
    if (leadData) {
      const foundationDate = leadData.account?.foundationDate 
        ? dayjs(leadData.account.foundationDate) 
        : undefined;
        
      // Set form values including the date
      form.setFieldsValue({
        companyName: leadData.account?.name || '',
        addressLine: leadData.account?.addressLine || '',
        annualRevenue: leadData.account?.annualRevenueRef || '',
        foundationDate: foundationDate,
        website: leadData.account?.website || ''
      });
    }
  };

  const handleSaveCompanyInfo = async () => {
    try {
      const values = await form.validateFields();
      setSavingCompanyInfo(true);
      
      if (leadData) {
        const selectedRevenueSize = values.annualRevenue
          ? revenueSizeOptions.find(option => option.id === values.annualRevenue)
          : null;

        let changeMode = leadData.account ? "UPDATE" : "INSERT";
        let accountId = leadData.accountId;
        let accountVersion = leadData.account?.version;

        const accountData = {
          ...(changeMode === "UPDATE" && { 
            id: accountId,
            version: accountVersion 
          }),
          ...(values.companyName && values.companyName !== "") && { name: values.companyName },
          ...(values.addressLine && values.addressLine !== "") && { addressLine: values.addressLine },
          ...(values.website && values.website !== "") && { website: values.website },
          ...(values.foundationDate 
            ? { foundationDate: values.foundationDate.format('YYYY-MM-DD') }
            : (leadData.account?.foundationDate && leadData.account.foundationDate !== "")
              ? { foundationDate: leadData.account.foundationDate }
              : {}),
          ...(leadData?.ownerEmployeeId && leadData.ownerEmployeeId !== "") && 
            { ownerEmployeeId: leadData.ownerEmployeeId },
          ...(leadData?.ownerEmployeeId && leadData.ownerEmployeeId !== "") && 
            { ownerEmployee: leadData.ownerEmployeeId }
        };
        if (selectedRevenueSize) {
          accountData.annualRevenueRef = selectedRevenueSize.id;
          accountData.annualRevenue = {
            id: selectedRevenueSize.id,
            code: selectedRevenueSize.code,
            value: selectedRevenueSize.value,
            type: "RevenueSize"
          };
        } else if (leadData.account?.annualRevenueRef && leadData.account.annualRevenueRef !== "") {
          accountData.annualRevenueRef = leadData.account.annualRevenueRef;
          if (leadData.account?.annualRevenue) {
            accountData.annualRevenue = leadData.account.annualRevenue;
          }
        }

        const payload = {
          account: accountData,
          changeMode: changeMode
        };

        const response = await fetch('https://newwork-dev.newwork.com/processes/customer-relations/saveAccount', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${props.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData?.message || 'Failed to save account data');
        }

        const newAccount = await response.json();
        if (changeMode === "INSERT" && newAccount.id && leadData.id && (leadData.version !== undefined && leadData.version !== null)) {
          try {
            const updateLeadPayload = {
              changeMode: "UPDATE",
              lead: {
                id: leadData.id,
                version: leadData.version,
                account: newAccount.account.id
              }
            };

            const updateLeadResponse = await fetch('https://newwork-dev.newwork.com/processes/customer-relations/saveLead', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${props.accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(updateLeadPayload)
            });
            
            if (!updateLeadResponse.ok) {
              const errorText = await updateLeadResponse.text();
              console.error('Error updating lead with accountId:', errorText);
              message.warning('Company added but failed to link it to the lead');
            } else {
              const updatedLead = await updateLeadResponse.json();
              
              // Update the local leadData with the returned version from the API
              if (updatedLead) {
                // Update both version and accountId in the local leadData object
                leadData.version = updatedLead.version || leadData.version;
                leadData.accountId = newAccount.id;
                
              }
            }
          } catch (error) {
            console.error('Error updating lead with accountId:', error);
            message.warning('Company added but failed to link it to the lead');
          }
        }

        setLeadData(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            accountId: newAccount.id,
            account: {
              ...(prev.account || {}),
              id: newAccount.id ?? accountData.id,
              version: newAccount.version ?? accountData.version,
              name: values.companyName,
              addressLine: values.addressLine,
              foundationDate: values.foundationDate
                ? values.foundationDate.format('YYYY-MM-DD')
                : prev.account?.foundationDate || '',
              website: values.website,
              industryRef: prev.account?.industryRef || '',
              industry: prev.account?.industry || {
                code: '',
                id: '',
                type: '',
                value: ''
              },
              numberOfEmployeesRef: prev.account?.numberOfEmployeesRef || '',
              numberOfEmployees: prev.account?.numberOfEmployees || {
                type: '',
                value: '',
                id: '',
                code: ''
              },
              annualRevenueRef: selectedRevenueSize
                ? selectedRevenueSize.id
                : prev.account?.annualRevenueRef || '',
              annualRevenue: selectedRevenueSize
                ? {
                  id: selectedRevenueSize.id,
                  code: selectedRevenueSize.code,
                  value: selectedRevenueSize.value,
                  type: "RevenueSize"
                }
                : prev.account?.annualRevenue || {
                  id: '',
                  code: '',
                  value: '',
                  type: ''
                },
              ownerEmployeeId: prev.account?.ownerEmployeeId,
              ownerEmployee: prev.account?.ownerEmployee
            }
          };
        });

        // Trigger a refetch of lead data by updating refreshTrigger
        setRefreshTrigger(prev => prev + 1);

        message.success(`Company information ${changeMode === "INSERT" ? "added" : "updated"} successfully`);
        setIsEditingCompanyInfo(false);
      }
    } catch (error) {
      console.error("Error saving company information:", error);
      message.error(`Failed to ${leadData?.account ? "update" : "add"} company information`);
    } finally {
      setSavingCompanyInfo(false);
    }
  };

  const handleCancelCompanyEdit = () => {
    form.resetFields();
    setIsEditingCompanyInfo(false);
  };

  const handleAddContact = () => {
    setIsEditingContactInfo(true);
    
    // Reset contact form
    contactForm.resetFields();
  };

  const handleUpdateContact = () => {
    if (!leadData?.contact) return;
    
    setIsEditingContactInfo(true);
    
    // Set initial form values
    if (leadData) {
      // Set form values
      contactForm.setFieldsValue({
        contactName: leadData.contact?.name || '',
        contactEmail: leadData.contact?.email || '',
        contactPhone: leadData.contact?.phone || '',
        contactJobTitle: leadData.contact?.jobTitle || ''
      });
    }
  };

  const handleSaveContactInfo = async () => {
    try {
      const values = await contactForm.validateFields();
      setSavingContactInfo(true);
      
      if (leadData) {
        let changeMode = leadData.contact && leadData.contact.id ? "UPDATE" : "INSERT";
        let contactId = leadData.contact?.id;
        let contactVersion = leadData.contact?.version;

        // Split the name into firstName and lastName
        let firstName = "";
        let lastName = "";
        
        if (values.contactName) {
          const nameParts = values.contactName.trim().split(' ');
          if (nameParts.length > 0) {
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ');
          }
        }

        const contactData = {
          ...(changeMode === "UPDATE" && { 
            id: contactId,
            version: contactVersion 
          }),
          firstName,
          lastName,
          email: values.contactEmail || "",
          phone: values.contactPhone || "",
          jobTitle: values.contactJobTitle || ""
        };

        const payload = {
          contact: contactData,
          changeMode: changeMode
        };

        const response = await fetch('https://newwork-dev.newwork.com/processes/customer-relations/saveContact', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${props.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData?.message || 'Failed to save contact data');
        }

        const newContact = await response.json();
        
        if (changeMode === "INSERT" && newContact.id && leadData.id && (leadData.version !== undefined && leadData.version !== null)) {
          try {
            const updateLeadPayload = {
              changeMode: "UPDATE",
              lead: {
                id: leadData.id,
                version: leadData.version,
                contact: newContact.contact.id
              }
            };

            const updateLeadResponse = await fetch('https://newwork-dev.newwork.com/processes/customer-relations/saveLead', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${props.accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(updateLeadPayload)
            });
            
            if (!updateLeadResponse.ok) {
              const errorText = await updateLeadResponse.text();
              console.error('Error updating lead with contactId:', errorText);
              message.warning('Contact added but failed to link it to the lead');
            } else {
              const updatedLead = await updateLeadResponse.json();
              
              // Update the local leadData with the returned version from the API
              if (updatedLead) {
                // Update both version and contactId in the local leadData object
                leadData.version = updatedLead.version || leadData.version;
              }
            }
          } catch (error) {
            console.error('Error updating lead with contactId:', error);
            message.warning('Contact added but failed to link it to the lead');
          }
        }

        setLeadData(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            contact: {
              id: newContact.id || contactId || "",
              version: newContact.version || contactVersion || "",
              name: values.contactName || "",
              email: values.contactEmail || "",
              phone: values.contactPhone || "",
              jobTitle: values.contactJobTitle || "",
              pictureUrl: prev.contact?.pictureUrl || ""
            }
          };
        });

        // Trigger a refetch of lead data by updating refreshTrigger
        setRefreshTrigger(prev => prev + 1);

        message.success(`Contact information ${changeMode === "INSERT" ? "added" : "updated"} successfully`);
        setIsEditingContactInfo(false);
      }
    } catch (error) {
      console.error("Error saving contact information:", error);
      message.error(`Failed to ${leadData?.contact?.id ? "update" : "add"} contact information`);
    } finally {
      setSavingContactInfo(false);
    }
  };

  const handleCancelContactEdit = () => {
    contactForm.resetFields();
    setIsEditingContactInfo(false);
  };

  const fetchRevenueSizeOptions = async () => {
    if (revenueSizeOptions.length === 0) {
      try {
        setLoadingCatalogData(true);
        
        const fetchAllCatalogEntries = async (catalogIdentifier: string, version: string = 'v1') => {
          let allEntries: any[] = [];
          let offset = 0;
          const limit = 100; 
          let hasMore = true;

          while (hasMore) {
            const response = await catalogClient.getCatalogEntriesList({
              catalogIdentifier,
              version
            }, {
              limit,
              offset
            });

            if (response.data && response.data.length > 0) {
              allEntries = [...allEntries, ...response.data];
              offset += limit;
              
              if (response.data.length < limit) {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
          }

          return allEntries
            .map((entry: any) => ({
              id: entry.id,
              code: entry.code,
              value: entry.value
            }))
            .sort((a, b) => a.value.localeCompare(b.value));
        };
        
        const revenueSizeData = await fetchAllCatalogEntries('RevenueSize');
        setRevenueSizeOptions(revenueSizeData);
      } catch (err) {
        console.error('Error fetching catalog data:', err);
        message.error('Failed to load reference data');
      } finally {
        setLoadingCatalogData(false);
      }
    }
  };

  const handleUpdateLeadInfo = async () => {
    setIsEditingLeadInfo(true);

    try {
      // First ensure all catalog options are fully loaded
      setLoadingCatalogData(true);
      await fetchCatalogOptions(catalogClient);
      
      // Now set initial form values from current lead data
      if (leadData) {
        leadForm.setFieldsValue({
          leadName: leadData.name || '',
          leadRating: leadData.leadRatingRef || '',
          leadStatus: leadData.statusRef || '',
          leadSource: leadData.sourceRef || '',
          industry: leadData.industryRef || '',
          numberOfEmployees: leadData.numberOfEmployeesRef || '',
          revenue: leadData.annualRevenueRef || '',
          companyWebsite: leadData.companyWebsite || '',
          country: leadData.countryRef || '',
          address: leadData.address || ''
        });
        
        // Force form to update its values after options are loaded
        setTimeout(() => {
          leadForm.setFieldsValue({
            leadSource: leadData.sourceRef || ''
          });
        }, 100);
      }
    } finally {
      setLoadingCatalogData(false);
    }
  };

  const handleCancelLeadInfoEdit = () => {
    leadForm.resetFields();
    setIsEditingLeadInfo(false);
  };

  const handleSaveLeadInfo = async () => {
    try {
      const values = await leadForm.validateFields();
      setSavingLeadInfo(true);
      
      if (leadData) {
        // Find the selected options from the dropdown lists
        const selectedStatus = leadStatusOptions.find(option => option.id === values.leadStatus);
        const selectedSource = leadSourceOptions.find(option => option.id === values.leadSource);
        const selectedIndustry = industryOptions.find(option => option.id === values.industry);
        const selectedEmployeeSize = numberOfEmployeesOptions.find(option => option.id === values.numberOfEmployees);
        const selectedRevenueSize = revenueSizeOptions.find(option => option.id === values.revenue);
        const selectedCountry = countryOptions.find(option => option.id === values.country);
        const selectedLeadRating = leadRatingOptions.find(option => option.id === values.leadRating);
        
        // Prepare the payload for the API
        const savePayload = {
          changeMode: "UPDATE",
          lead: {
            id: leadData.id,
            version: leadData.version,
            ...(values.leadName && { companyName: values.leadName }),
            
            ...(values.leadStatus && { statusRef: values.leadStatus }),
            ...(selectedStatus && { 
              status: {
                id: selectedStatus.id,
                code: selectedStatus.code,
                value: selectedStatus.value
              }
            }),
            ...(values.leadSource && { sourceRef: values.leadSource }),
            ...(selectedSource && { 
              source: {
                id: selectedSource.id,
                code: selectedSource.code,
                value: selectedSource.value,
                type: "LeadSource"
              }
            }),
            
            // Add industry fields
            ...(values.industry && { industryRef: values.industry }),
            ...(selectedIndustry && { 
              industry: {
                id: selectedIndustry.id, 
                code: selectedIndustry.code,
                value: selectedIndustry.value
              }
            }),
            
            // Add employees fields
            ...(values.numberOfEmployees && { numberOfEmployeesRef: values.numberOfEmployees }),
            ...(selectedEmployeeSize && {
              numberOfEmployees: {
                id: selectedEmployeeSize.id,
                code: selectedEmployeeSize.code,
                value: selectedEmployeeSize.value
              }
            }),
            
            // Add revenue fields
            ...(values.revenue && { annualRevenueRef: values.revenue }),
            ...(selectedRevenueSize && {
              annualRevenue: {
                id: selectedRevenueSize.id,
                code: selectedRevenueSize.code,
                value: selectedRevenueSize.value
              }
            }),
            
            // Add website and address
            ...(values.companyWebsite && { companyWebsite: values.companyWebsite }),
            ...(values.address && { address: values.address }),
            
            // Add country
            ...(values.country && { countryRef: values.country }),
            ...(selectedCountry && {
              country: {
                id: selectedCountry.id,
                code: selectedCountry.code,
                value: selectedCountry.value
              }
            }),

            // Add lead rating
            ...(values.leadRating && { leadRatingRef: values.leadRating }),
            ...(selectedLeadRating && { 
              leadRating: {
                id: selectedLeadRating.id,
                code: selectedLeadRating.code,
                value: selectedLeadRating.value,
                type: "SalesLeadRating"
              }
            }),

          }
        };
        
        const response = await fetch('https://newwork-dev.newwork.com/processes/customer-relations/saveLead', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${props.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(savePayload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData?.message || 'Failed to save lead data');
        }

        const updatedLead = await response.json();
        
        // Update the leadData state with new values
        setLeadData(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            name: values.leadName || prev.name,
            
            // Update status and source
            status: selectedStatus?.value || prev.status,
            statusRef: values.leadStatus || prev.statusRef,
            source: selectedSource ? {
              id: selectedSource.id,
              code: selectedSource.code,
              value: selectedSource.value,
              type: prev.source?.type || ""
            } : prev.source,
            sourceRef: values.leadSource || prev.sourceRef,
            
            // Update industry
            industry: selectedIndustry ? {
              id: selectedIndustry.id, 
              code: selectedIndustry.code,
              value: selectedIndustry.value,
              type: prev.industry?.type || ""
            } : prev.industry,
            industryRef: values.industry || prev.industryRef,
            
            // Update employee size
            numberOfEmployees: selectedEmployeeSize ? {
              id: selectedEmployeeSize.id,
              code: selectedEmployeeSize.code,
              value: selectedEmployeeSize.value,
              type: prev.numberOfEmployees?.type || ""
            } : prev.numberOfEmployees,
            numberOfEmployeesRef: values.numberOfEmployees || prev.numberOfEmployeesRef,
            
            // Update revenue
            annualRevenue: selectedRevenueSize ? {
              id: selectedRevenueSize.id,
              code: selectedRevenueSize.code,
              value: selectedRevenueSize.value,
              type: prev.annualRevenue?.type || ""
            } : prev.annualRevenue,
            annualRevenueRef: values.revenue || prev.annualRevenueRef,
            
            // Update website and address
            companyWebsite: values.companyWebsite || prev.companyWebsite,
            address: values.address || prev.address,
            
            // Update country
            country: selectedCountry ? {
              id: selectedCountry.id,
              code: selectedCountry.code,
              value: selectedCountry.value,
              type: prev.country?.type || ""
            } : prev.country,
            countryRef: values.country,
            
            // Update lead rating
            leadRatingRef: values.leadRating || prev.leadRatingRef,
            leadRating: selectedLeadRating ? {
              id: selectedLeadRating.id,
              code: selectedLeadRating.code,
              value: selectedLeadRating.value,
              type: "SalesLeadRating"
            } : prev.leadRating,

            // Update version from API response
            version: updatedLead.version || prev.version
          };
        });
        setRefreshTrigger(prev => prev + 1);

        message.success("Lead information updated successfully");
        setIsEditingLeadInfo(false);
      }
    } catch (error) {
      console.error("Error saving lead information:", error);
      message.error("Failed to update lead information");
    } finally {
      setSavingLeadInfo(false);
    }
  };

  const fetchCatalogOptions = async (catalogClient: any) => {
    if (revenueSizeOptions.length === 0 || leadSourceOptions.length === 0 || leadStatusOptions.length === 0 || industryOptions.length === 0 || numberOfEmployeesOptions.length === 0 || countryOptions.length === 0 || leadRatingOptions.length === 0) {
      try {
        setLoadingCatalogData(true);
        
        const fetchAllCatalogEntries = async (catalogIdentifier: string, version: string = 'v1') => {
          let allEntries: any[] = [];
          let offset = 0;
          const limit = 100; 
          let hasMore = true;

          while (hasMore) {
            const response = await catalogClient.getCatalogEntriesList({
              catalogIdentifier,
              version
            }, {
              limit,
              offset
            });

            if (response.data && response.data.length > 0) {
              allEntries = [...allEntries, ...response.data];
              offset += limit;
              
              if (response.data.length < limit) {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
          }

          return allEntries
            .map((entry: any) => ({
              id: entry.id,
              code: entry.code,
              value: entry.value
            }))
            .sort((a, b) => a.value.localeCompare(b.value));
        };
        
        // Fetch revenue size options if not already loaded
        if (revenueSizeOptions.length === 0) {
          const revenueSizeData = await fetchAllCatalogEntries('RevenueSize');
          setRevenueSizeOptions(revenueSizeData);
        }
        
        // Fetch lead source options if not already loaded
        if (leadSourceOptions.length === 0) {
          const leadSourceData = await fetchAllCatalogEntries('LeadSource');
          setLeadSourceOptions(leadSourceData);
        }
        
        // Fetch lead status options if not already loaded
        if (leadStatusOptions.length === 0) {
          const leadStatusData = await fetchAllCatalogEntries('LeadStatus');
          setLeadStatusOptions(leadStatusData);
        }
        
        // Fetch industry options
        if (industryOptions.length === 0) {
          const industryData = await fetchAllCatalogEntries('IndustryClass');
          setIndustryOptions(industryData);
        }
        
        // Fetch employee size options
        if (numberOfEmployeesOptions.length === 0) {
          const employeeSizeData = await fetchAllCatalogEntries('EmployeeSize');
          setNumberOfEmployeesOptions(employeeSizeData);
        }
        
        // Fetch country options
        if (countryOptions.length === 0) {
          const countryData = await fetchAllCatalogEntries('Country');
          setCountryOptions(countryData);
        }
        
        // Fetch lead rating options
        if (leadRatingOptions.length === 0) {
          const leadRatingData = await fetchAllCatalogEntries('SalesLeadRating');
          setLeadRatingOptions(leadRatingData);
        }
      } catch (err) {
        console.error('Error fetching catalog data:', err);
        message.error('Failed to load reference data');
      } finally {
        setLoadingCatalogData(false);
      }
    }
  };

  const CollapsibleCard: React.FC<{
    title: string;
    defaultOpen?: boolean;
    id: string;
    extra?: React.ReactNode;
    style?: React.CSSProperties;
    showArrow?: boolean;
    children: React.ReactNode;
  }> = ({ title, defaultOpen = true, id, extra, style, showArrow = true, children }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    const panelStyle: React.CSSProperties = {
      marginBottom: 0,
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #f0f0f0',
      overflow: 'hidden',
      ...style
    };

    const headerStyle: React.CSSProperties = {
      padding: '12px 16px',
      fontSize: '16px',
      fontWeight: 500,
      color: '#333333',
      borderBottom: id === "ai-summary-card" && isOpen ? '1px solid #f0f0f0' : 'none'
    };

    const contentStyle: React.CSSProperties = {
      padding: '16px',
      display: isOpen ? 'block' : 'none'
    };

    return (
      <div className={`gba:collapsible-card-${id}`} data-testid={`collapsible-card-${id}`} style={panelStyle}>
        <div 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...headerStyle }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>{title}</span>
            {showArrow && (
              <div 
                className="gba:collapse-arrow"
                data-testid={`collapse-arrow-${id}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                <CaretDownOutlined
                  style={{ 
                    fontSize: '12px', 
                    marginLeft: '8px',
                    transition: 'transform 0.3s',
                    transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)'
                  }}
                />
              </div>
            )}
          </div>
          {extra}
        </div>
        <div style={contentStyle}>
          {children}
        </div>
      </div>
    );
  };

  // If in editing mode, render the EditLead component
  if (isEditing && leadData) {
    return (
      <EditLead 
        {...props} 
        leadData={leadData} 
        onCancel={() => setIsEditing(false)} 
        onSave={handleSaveLead} 
      />
    );
  }

  return (
    <div className="gba:lead-details-container" data-testid="lead-opportunity-investment-detail" style={{ backgroundColor: 'white', padding: '16px' }}>
      {/* Back navigation */}
      <div className="gba:back-navigation" style={{ marginBottom: '16px' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          data-testid="back-button"
          onClick={props.onBack}
        >
          <span style={{ marginLeft: '4px' }}>Back to Leads</span>
        </Button>
      </div>

      {/* Lead header */}
      <div className="gba:lead-header" style={{ 
        marginBottom: '24px', 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '20px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '50%', 
              backgroundColor: '#f5f5f5', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '20px', 
              color: '#1890ff', 
              fontWeight: 'bold' 
            }}>
              {lead.name ? lead.name[0] : 'A'}
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                {lead.name}
              </div>
              <div style={{ color: '#8c8c8c', fontSize: '14px' }}>
                <BulbOutlined style={{ marginRight: '4px' }} />
                <span>{typeof lead?.account?.industry === 'object' ? lead?.account?.industry?.value || 'Unknown' : lead?.account?.industry || 'Unknown'}</span>
                <span style={{ margin: '0 8px' }}>•</span>
                <TeamOutlined style={{ marginRight: '4px' }} />
                <span>{typeof lead?.account?.numberOfEmployees === 'object' ? lead?.account?.numberOfEmployees?.value || 'Unknown' : lead?.account?.numberOfEmployees || 'Unknown'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              backgroundColor: '#f0f7ff',
              color: '#1677ff',
              padding: '4px 16px',
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: 'normal'
            }} data-testid="lead-status-badge">
              {lead.status || 'Qualified'}
            </div>
            
            <Button 
              type="default"
              style={{
                borderColor: '#d9d9d9',
                color: '#000000',
                backgroundColor: 'white',
                height: '36px',
                padding: '0 16px',
                fontWeight: 'normal',
                fontSize: '14px',
                borderRadius: '4px'
              }}
              data-testid="edit-lead-button"
              onClick={handleUpdateAccount}
            >
              Edit
            </Button>
            
            <Button 
              type="primary"
              style={{
                backgroundColor: '#000000',
                borderColor: '#000000',
                height: '36px',
                padding: '0 16px',
                fontWeight: 'normal',
                fontSize: '14px',
                borderRadius: '4px'
              }}
              data-testid="schedule-meeting-button"
            >
              Schedule Meeting
            </Button>
          </div>
        </div>
      </div>

      {/* Main content - Two column layout */}
      <Row gutter={24}>
        {/* Left Column: Company Info, Contacts, Opportunities, Quick Actions, Calendar */}
        <Col span={12}>
          {/* Company Information section */}
          <CollapsibleCard
            title="Company Information"
            defaultOpen={true}
            id="company-info-card"
            style={{ marginBottom: '24px' }}
            showArrow={true}
            extra={isEditingCompanyInfo ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  type="primary"
                  size="small"
                  onClick={handleSaveCompanyInfo}
                  data-testid="save-company-info-button"
                  loading={savingCompanyInfo}
                >
                  Save
                </Button>
                <Button
                  size="small"
                  onClick={handleCancelCompanyEdit}
                  data-testid="cancel-company-info-button"
                  disabled={savingCompanyInfo}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              lead?.account === null ? (
                <Button
                  type="text" 
                  icon={<PlusCircleOutlined />} 
                  style={{
                    color: '#000000',
                    padding: '0',
                    height: 'auto',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  data-testid="add-account-button"
                  onClick={handleAddAccount}
                >
                  Add
                </Button>
              ) : (
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  style={{
                    color: '#000000',
                    padding: '0',
                    height: 'auto',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  data-testid="edit-company-info-button"
                  onClick={handleUpdateAccount}
                >
                  Edit
                </Button>
              )
            )}
          > 
            {isEditingCompanyInfo ? (
              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  companyName: lead?.account?.name || '',
                  addressLine: lead?.account?.addressLine || '',
                  annualRevenue: lead?.account?.annualRevenueRef || '',
                  foundationDate: lead?.account?.foundationDate ? dayjs(lead.account.foundationDate) : undefined,
                  website: lead?.account?.website || ''
                }}
                data-testid="company-info-form"
              >
                <Form.Item
                  name="companyName"
                  label="Company Name"
                  data-testid="company-name-input"
                  style={{ marginBottom: '16px' }}
                >
                  <Input prefix={<BankOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>
                
                <Form.Item
                  name="addressLine"
                  label="Address"
                  data-testid="address-input"
                  style={{ marginBottom: '16px' }}
                >
                  <Input prefix={<EnvironmentOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>

                <Form.Item
                  name="annualRevenue"
                  label="Annual Revenue"
                  data-testid="revenue-input"
                  style={{ marginBottom: '16px' }}
                >
                  <Select
                    placeholder="Select annual revenue"
                    loading={loadingCatalogData}
                    allowClear
                    style={{ width: '100%' }}
                    data-testid="annual-revenue-select"
                  >
                    {revenueSizeOptions.map(option => (
                      <Select.Option key={option.id} value={option.id}>
                        {option.value}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="foundationDate"
                  label="Foundation Date"
                  data-testid="foundation-date-input"
                  style={{ marginBottom: '16px' }}
                >
                  <DatePicker 
                    style={{ 
                      width: '100%',
                      border: '1px solid #d9d9d9',
                      borderRadius: '2px'
                    }} 
                    format="YYYY-MM-DD"
                    placeholder="Select foundation date"
                    data-testid="foundation-date-picker"
                    suffixIcon={<CalendarOutlined style={{ color: '#8c8c8c' }} />}
                  />
                </Form.Item>

                <Form.Item
                  name="website"
                  label="Website"
                  data-testid="website-input"
                >
                  <Input prefix={<GlobalOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>
              </Form>
            ) : (
              lead?.account === null ? (
                <div data-testid="no-company-info" style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '16px', color: '#8c8c8c', marginBottom: '12px' }}>
                    Company information does not exist
                  </div>
                  <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                    Click the Add button to create company information
                  </div>
                </div>
              ) : (
                <div data-testid="company-info" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }} data-testid="company-name">
                    <BankOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Company Name</div>
                      <div style={{ fontSize: '16px', color: '#000000' }}>{lead?.account?.name || '---'}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <EnvironmentOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Address</div>
                      <div style={{ fontSize: '16px', color: '#000000' }}>{lead?.account?.addressLine || '---'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <CalendarOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Annual Revenue</div>
                      <div style={{ fontSize: '16px', color: '#000000' }}>{lead?.account?.annualRevenue?.value || '---'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start' }} data-testid="foundation-date">
                    <CalendarOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Foundation Date</div>
                      <div style={{ fontSize: '16px', color: '#000000' }}>{lead?.account?.foundationDate || '---'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <GlobalOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Website</div>
                      {lead?.account?.website ? (
                        <a href={`https://${lead?.account?.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '16px', color: '#1677ff' }}>
                          {lead?.account?.website}
                        </a>
                      ) : (
                        <div style={{ fontSize: '16px', color: '#000000' }}>---</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </CollapsibleCard>
          
          {/* Contacts section */}
          <CollapsibleCard
            title="Contacts"
            defaultOpen={true}
            id="contacts-card"
            extra={isEditingContactInfo ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  type="primary"
                  size="small"
                  onClick={handleSaveContactInfo}
                  data-testid="save-contact-info-button"
                  loading={savingContactInfo}
                >
                  Save
                </Button>
                <Button
                  size="small"
                  onClick={handleCancelContactEdit}
                  data-testid="cancel-contact-info-button"
                  disabled={savingContactInfo}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                style={{
                  color: '#000000',
                  padding: '0',
                  height: 'auto',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                data-testid="add-contact-button"
                className="gba:add-contact-button"
                onClick={!lead.contact || !lead.contact.id ? handleAddContact : handleUpdateContact}
              >
                {!lead.contact || !lead.contact.id ? "Add" : "Edit"}
              </Button>
            )}
            style={{ marginBottom: '24px' }}
            showArrow={true}
          >
            {isEditingContactInfo ? (
              <Form
                form={contactForm}
                layout="vertical"
                initialValues={{
                  contactName: lead?.contact?.name || '',
                  contactEmail: lead?.contact?.email || '',
                  contactPhone: lead?.contact?.phone || '',
                  contactJobTitle: lead?.contact?.jobTitle || ''
                }}
                data-testid="contact-info-form"
              >
                <Form.Item
                  name="contactName"
                  label="Full Name"
                  data-testid="contact-name-input"
                  rules={[{ required: true, message: 'Please enter a name' }]}
                  style={{ marginBottom: '16px' }}
                >
                  <Input prefix={<UserOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>
                
                <Form.Item
                  name="contactJobTitle"
                  label="Job Title"
                  data-testid="job-title-input"
                  style={{ marginBottom: '16px' }}
                >
                  <Input prefix={<TeamOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>
                
                <Form.Item
                  name="contactEmail"
                  label="Email"
                  data-testid="contact-email-input"
                  style={{ marginBottom: '16px' }}
                  rules={[
                    { 
                      type: 'email',
                      message: 'Please enter a valid email'
                    }
                  ]}
                >
                  <Input prefix={<MailOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>

                <Form.Item
                  name="contactPhone"
                  label="Phone"
                  data-testid="contact-phone-input"
                >
                  <Input prefix={<PhoneOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>
              </Form>
            ) : (
              lead.contact && lead.contact.name ? (
                <div data-testid="contacts-list" className="gba:contacts-list" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div 
                    className="gba:contact-item"
                    data-testid="contact-item"
                    style={{ paddingBottom: '24px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start' }} data-testid="contact-name">
                      <div
                        className="gba:contact-avatar"
                        data-testid="contact-avatar"
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: '#f5f5f5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '16px',
                          fontSize: '16px',
                          color: '#666',
                          fontWeight: 'bold',
                        }}
                      >
                        {lead.contact.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="gba:contact-details" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                          <div 
                            className="gba:contact-name" 
                            data-testid="contact-name" 
                            style={{ fontSize: '16px', fontWeight: '500', marginRight: '8px' }}
                          >
                            {lead.contact.name}
                          </div>
                          <span
                            className="gba:contact-primary-badge"
                            data-testid="contact-primary-badge"
                            style={{
                              fontSize: '12px',
                              padding: '2px 8px',
                              backgroundColor: '#1677ff',
                              color: 'white',
                              borderRadius: '10px',
                              fontWeight: 'normal',
                            }}
                          >
                            Primary
                          </span>
                        </div>
                        <div 
                          className="gba:contact-position" 
                          data-testid="contact-position"
                          style={{ color: '#8c8c8c', fontSize: '14px', marginBottom: '12px' }}
                        >
                          {lead.contact.jobTitle}
                        </div>
                        
                        <div 
                          className="gba:contact-email"
                          data-testid="contact-email"
                          style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', color: '#595959' }}
                        >
                          <MailOutlined style={{ marginRight: '8px', fontSize: '14px', color: '#8c8c8c' }} />
                          <div>{lead.contact.email}</div>
                        </div>
                        <div 
                          className="gba:contact-phone"
                          data-testid="contact-phone"
                          style={{ display: 'flex', alignItems: 'center', color: '#595959' }}
                        >
                          <PhoneOutlined style={{ marginRight: '8px', fontSize: '14px', color: '#8c8c8c' }} />
                          <div>{lead.contact.phone}</div>
                        </div>
                      </div>
                    </div>
                    <div className="gba:contact-actions" style={{ display: 'flex', gap: '16px' }}>
                      <Button 
                        className="gba:contact-call-button"
                        data-testid="contact-call-button"
                        style={{ 
                          flex: 1, 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          height: '40px' 
                        }}
                        icon={<PhoneOutlined />}
                      >
                        Call
                      </Button>
                      <Button 
                        className="gba:contact-email-button"
                        data-testid="contact-email-button"
                        style={{ 
                          flex: 1, 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          height: '40px' 
                        }}
                        icon={<MailOutlined />}
                      >
                        Email
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div data-testid="no-contact-info" style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '16px', color: '#8c8c8c', marginBottom: '12px' }}>
                    Contact information does not exist
                  </div>
                  <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                    Click the Add button to create contact information
                  </div>
                </div>
              )
            )}
          </CollapsibleCard>
          

<CollapsibleCard
  title="Lead Information"
  defaultOpen={true}
  id="lead-info-card"
  style={{ 
    marginBottom: '24px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #f0f0f0',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
  }}
  showArrow={true}
  extra={isEditingLeadInfo ? (
    <div style={{ display: 'flex', gap: '8px' }}>
      <Button
        type="primary"
        size="small"
        onClick={handleSaveLeadInfo}
        data-testid="save-lead-info-button"
        loading={savingLeadInfo}
      >
        Save
      </Button>
      <Button
        size="small"
        onClick={handleCancelLeadInfoEdit}
        data-testid="cancel-lead-info-button"
        disabled={savingLeadInfo}
      >
        Cancel
      </Button>
    </div>
  ) : (
    <Button 
      type="text" 
      icon={<EditOutlined />} 
      style={{
        color: '#000000',
        padding: '0',
        height: 'auto',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center'
      }}
      data-testid="edit-lead-info-button"
      onClick={handleUpdateLeadInfo}
    >
      Edit
    </Button>
  )}
>
  {isEditingLeadInfo ? (
    <Form
      form={leadForm}
      layout="vertical"
      initialValues={{
        leadName: lead?.name || '',
        leadRating: lead?.leadRatingRef || '',
        leadStatus: lead?.statusRef || '',
        leadSource: lead?.sourceRef || '',
        industry: lead?.industryRef || '',
        numberOfEmployees: lead?.numberOfEmployeesRef || '',
        revenue: lead?.annualRevenueRef || '',
        companyWebsite: lead?.companyWebsite || '',
        country: lead?.countryRef || '',
        address: lead?.address || ''
      }}
      data-testid="lead-info-form"
    >
      <Form.Item
        name="leadName"
        label="Company Name"
        data-testid="lead-name-input"
        style={{ marginBottom: '16px' }}
      >
        <Input prefix={<BankOutlined style={{ color: '#8c8c8c' }} />} />
      </Form.Item>
      
      <Form.Item
        name="leadRating"
        label="Rating"
        data-testid="lead-rating-input"
        style={{ marginBottom: '16px' }}
      >
        <Select 
          placeholder="Select rating"
          data-testid="lead-rating-select"
          suffixIcon={<StarOutlined style={{ color: '#8c8c8c' }} />}
          allowClear
          style={{ width: '100%' }}
        >
          {leadRatingOptions.map(option => (
            <Select.Option key={option.id} value={option.id}>
              {option.value}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="leadStatus"
        label="Status"
        data-testid="lead-status-input"
        style={{ marginBottom: '16px' }}
      >
        <Select
          placeholder="Select status"
          allowClear
          style={{ width: '100%' }}
          data-testid="lead-status-select"
        >
          {leadStatusOptions.map(option => (
            <Select.Option key={option.id} value={option.id}>
              {option.value}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="leadSource"
        label="Source"
        data-testid="lead-source-input"
        style={{ marginBottom: '16px' }}
      >
        <Select
          placeholder="Select source"
          allowClear
          style={{ width: '100%' }}
          data-testid="lead-source-select"
        >
          {leadSourceOptions.map(option => (
            <Select.Option key={option.id} value={option.id}>
              {option.value}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="industry"
        label="Industry"
        data-testid="industry-input"
        style={{ marginBottom: '16px' }}
      >
        <Select
          placeholder="Select industry"
          allowClear
          style={{ width: '100%' }}
          data-testid="industry-select"
        >
          {industryOptions.map(option => (
            <Select.Option key={option.id} value={option.id}>
              {option.value}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="numberOfEmployees"
        label="Number of Employees"
        data-testid="number-of-employees-input"
        style={{ marginBottom: '16px' }}
      >
        <Select
          placeholder="Select number of employees"
          allowClear
          style={{ width: '100%' }}
          data-testid="number-of-employees-select"
        >
          {numberOfEmployeesOptions.map(option => (
            <Select.Option key={option.id} value={option.id}>
              {option.value}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="revenue"
        label="Revenue"
        data-testid="revenue-input"
        style={{ marginBottom: '16px' }}
      >
        <Select
          placeholder="Select revenue"
          allowClear
          style={{ width: '100%' }}
          data-testid="revenue-select"
        >
          {revenueSizeOptions.map(option => (
            <Select.Option key={option.id} value={option.id}>
              {option.value}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="companyWebsite"
        label="Company Website"
        data-testid="company-website-input"
        style={{ marginBottom: '16px' }}
      >
        <Input prefix={<GlobalOutlined style={{ color: '#8c8c8c' }} />} />
      </Form.Item>

      <Form.Item
        name="country"
        label="Country"
        data-testid="country-input"
        style={{ marginBottom: '16px' }}
      >
        <Select
          placeholder="Select country"
          allowClear
          style={{ width: '100%' }}
          data-testid="country-select"
        >
          {countryOptions.map(option => (
            <Select.Option key={option.id} value={option.id}>
              {option.value}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="address"
        label="Address"
        data-testid="address-input"
      >
        <Input prefix={<EnvironmentOutlined style={{ color: '#8c8c8c' }} />} />
      </Form.Item>
    </Form>
  ) : (
    <div data-testid="lead-info" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <UserOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}> Name</div>
          <div style={{ fontSize: '16px', color: '#000000' }}>{lead?.leadName || '---'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <StarOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Rating</div>
          <div style={{ fontSize: '16px', color: '#000000' }}>{lead?.leadRating.value || '---'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <TagsOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Status</div>
          <div style={{ fontSize: '16px', color: '#000000' }}>{lead?.status || '---'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <FunnelPlotOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Source</div>
          <div style={{ fontSize: '16px', color: '#000000' }}>{lead?.source?.value || '---'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <BankOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Industry</div>
          <div style={{ fontSize: '16px', color: '#000000' }}>{lead?.industry?.value || '---'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <TeamOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Number of Employees</div>
          <div style={{ fontSize: '16px', color: '#000000' }}>{lead?.numberOfEmployees?.value || '---'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <CalendarOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Revenue</div>
          <div style={{ fontSize: '16px', color: '#000000' }}>{lead?.annualRevenue?.value || '---'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <GlobalOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Company Website</div>
          {lead?.companyWebsite ? (
            <a href={`https://${lead?.companyWebsite}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '16px', color: '#1677ff' }}>
              {lead?.companyWebsite}
            </a>
          ) : (
            <div style={{ fontSize: '16px', color: '#000000' }}>---</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <EnvironmentOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Country</div>
          <div style={{ fontSize: '16px', color: '#000000' }}>{lead?.country?.value || '---'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <EnvironmentOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Address</div>
          <div style={{ fontSize: '16px', color: '#000000' }}>{lead?.address || '---'}</div>
        </div>
      </div>
    </div>
  )}
</CollapsibleCard>

          {/* Quick Actions section */}
          <CollapsibleCard
            title="Quick Actions"
            defaultOpen={true}
            id="quick-actions-card"
            style={{ marginBottom: '24px' }}
          >
            <div data-testid="quick-actions-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button
                icon={<FileTextOutlined />}
                block
                style={{ textAlign: 'left', height: 'auto', padding: '8px 12px' }}
                data-testid="add-note-action"
              >
                Add Note
              </Button>
              <Button
                icon={<PhoneOutlined />}
                block
                style={{ textAlign: 'left', height: 'auto', padding: '8px 12px' }}
                data-testid="log-call-action"
              >
                Log Call
              </Button>
              <Button
                icon={<VideoCameraOutlined />}
                block
                style={{ textAlign: 'left', height: 'auto', padding: '8px 12px' }}
                data-testid="schedule-meeting-action"
              >
                Schedule Meeting
              </Button>
              <Button
                icon={<MailOutlined />}
                block
                style={{ textAlign: 'left', height: 'auto', padding: '8px 12px' }}
                data-testid="send-email-action"
              >
                Send Email
              </Button>
            </div>
          </CollapsibleCard>
          
          {/* Outlook Calendar section */}
          <CollapsibleCard
            title="Outlook Calendar"
            defaultOpen={true}
            id="outlook-calendar-card"
            style={{ marginBottom: '0' }}
          >
            <div data-testid="outlook-calendar" style={{ padding: '8px 0' }}>
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '16px' }}>
                No upcoming meetings
              </Text>
            </div>
          </CollapsibleCard>
        </Col>

        {/* Right Column: AI Summary, Activity Timeline */}
        <Col span={12}>
          {/* Owner Employee Information */}
          <CollapsibleCard
            title="Owner Employee"
            defaultOpen={true}
            id="owner-employee-card"
            style={{ marginBottom: '24px' }}
            showArrow={true}
          >
            {lead?.ownerEmployeeId ? (
              <div data-testid="owner-employee-info" className="gba:owner-employee-section">
                <div className="gba:owner-employee-container" style={{ display: 'flex', padding: '0 0 16px' }}>
                  <div 
                    className="gba:owner-employee-avatar"
                    data-testid="owner-employee-avatar"
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: '#1677ff',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '500',
                      fontSize: '16px',
                      marginRight: '16px'
                    }}
                  >
                    {lead.ownerEmployee && lead.ownerEmployee.firstName && lead.ownerEmployee.lastName ? 
                      `${lead.ownerEmployee.firstName.charAt(0)}${lead.ownerEmployee.lastName.charAt(0)}` : 'OE'}
                  </div>
                  <div className="gba:owner-employee-details" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <div 
                        className="gba:owner-employee-name" 
                        data-testid="owner-employee-name" 
                        style={{ fontSize: '16px', fontWeight: '500', marginRight: '8px' }}
                      >
                        {lead.ownerEmployee ? 
                          `${lead.ownerEmployee.firstName} ${lead.ownerEmployee.lastName}` : 
                          'Unknown Owner'}
                      </div>
                      <span
                        className="gba:owner-employee-badge"
                        data-testid="owner-employee-badge"
                        style={{
                          fontSize: '12px',
                          padding: '2px 8px',
                          backgroundColor: '#52c41a',
                          color: 'white',
                          borderRadius: '10px',
                          fontWeight: 'normal',
                        }}
                      >
                        Owner
                      </span>
                    </div>
                    
                    {lead.ownerOrganization && lead.ownerOrganization.name && (
                      <div 
                        className="gba:owner-organization" 
                        data-testid="owner-organization"
                        style={{ color: '#8c8c8c', fontSize: '14px', marginBottom: '8px' }}
                      >
                        <TeamOutlined style={{ marginRight: '8px', fontSize: '14px', color: '#8c8c8c' }} />
                        {lead.ownerOrganization.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div data-testid="no-owner-employee-info" style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '16px', color: '#8c8c8c', marginBottom: '12px' }}>
                  Owner employee information does not exist
                </div>
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                  No owner has been assigned to this lead
                </div>
              </div>
            )}
          </CollapsibleCard>
          
          {/* AI Summary */}
          <CollapsibleCard
            title="AI Summary"
            defaultOpen={true}
            id="ai-summary-card"
            extra={
              <Button 
                type="text" 
                style={{ color: '#1677ff', padding: '0', height: 'auto', fontSize: '14px' }}
                data-testid="refresh-ai-summary"
              >
                Refresh
              </Button>
            }
            style={{ 
              marginBottom: '24px',
              backgroundColor: '#f0f7ff'
            }}
          >
            <div data-testid="ai-summary" style={{ padding: '0' }}>
              <div style={{ marginBottom: '20px', color: '#595959', lineHeight: '1.5' }}>
                {hardcodedAiSummary.text}
              </div>
              
              <div style={{ display: 'flex', gap: '48px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: '500', 
                    marginBottom: '16px', 
                    color: '#1677ff' 
                  }}>
                    Key Insights
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {hardcodedAiSummary.insights.map((insight, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <div style={{ 
                          color: '#1677ff', 
                          marginRight: '8px', 
                          fontSize: '18px', 
                          lineHeight: '1.2' 
                        }}>•</div>
                        <div style={{ fontSize: '14px', color: '#595959', lineHeight: '1.5' }}>{insight}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: '500', 
                    marginBottom: '16px', 
                    color: '#1677ff' 
                  }}>
                    Recommended Next Steps
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {hardcodedAiSummary.recommendations.map((recommendation, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <div style={{ 
                          color: '#1677ff', 
                          marginRight: '8px', 
                          fontSize: '18px', 
                          lineHeight: '1.2' 
                        }}>•</div>
                        <div style={{ fontSize: '14px', color: '#595959', lineHeight: '1.5' }}>{recommendation}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div style={{ 
                fontSize: '12px', 
                color: '#8c8c8c', 
                textAlign: 'left',
                borderTop: '1px solid #e8e8e8',
                paddingTop: '12px'
              }}>
                Last updated: May 21, 2023, 8:30 AM
              </div>
            </div>
          </CollapsibleCard>

          {/* Activity Timeline section */}
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #f0f0f0',
              overflow: 'hidden',
              marginBottom: '24px'
            }}
          >
            
            {/* Tabs */}
            <div 
              className="gba:activity-tabs" 
              data-testid="activity-tabs"
              style={{
                display: 'flex',
                backgroundColor: '#f0f7ff',
                borderRadius: '8px 8px 0 0'
              }}
            >
              <div 
                className={`gba:activity-tab${activeActivityTab === 'activities' ? '-active' : ''}`}
                data-testid="activities-tab"
                style={{
                  padding: '12px 24px',
                  fontWeight: '500',
                  color: activeActivityTab === 'activities' ? '#1890ff' : '#8c8c8c',
                  backgroundColor: activeActivityTab === 'activities' ? 'white' : 'transparent',
                  flex: 1,
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveActivityTab('activities')}
              >
                Activities
              </div>
              <div 
                className={`gba:activity-tab${activeActivityTab === 'notes' ? '-active' : ''}`}
                data-testid="notes-tab"
                style={{
                  padding: '12px 24px',
                  fontWeight: '500',
                  color: activeActivityTab === 'notes' ? '#1890ff' : '#8c8c8c',
                  backgroundColor: activeActivityTab === 'notes' ? 'white' : 'transparent',
                  flex: 1,
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveActivityTab('notes')}
              >
                Notes
              </div>
              <div 
                className={`gba:activity-tab${activeActivityTab === 'documents' ? '-active' : ''}`}
                data-testid="documents-tab"
                style={{
                  padding: '12px 24px',
                  fontWeight: '500',
                  color: activeActivityTab === 'documents' ? '#1890ff' : '#8c8c8c',
                  backgroundColor: activeActivityTab === 'documents' ? 'white' : 'transparent',
                  flex: 1,
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveActivityTab('documents')}
              >
                Documents
              </div>
            </div>

            {/* Activities content */}
            {activeActivityTab === 'activities' && (
            <div className="gba:activity-content" data-testid="activity-content">
              {/* Activity Timeline Header */}
              <div 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 24px'
                }}
              >
                <div 
                  className="gba:activity-timeline-title" 
                  data-testid="activity-timeline-title"
                  style={{
                    fontWeight: '600',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  Activity Timeline
                  <CaretDownOutlined 
                    style={{ 
                      marginLeft: '8px',
                      fontSize: '12px'
                    }} 
                  />
                </div>
                <Button
                  type="primary"
                  data-testid="add-activity-button"
                  className="gba:add-activity-button"
                  style={{
                    backgroundColor: '#000000',
                    borderColor: '#000000',
                    fontWeight: '500',
                    height: '36px',
                    borderRadius: '4px'
                  }}
                  onClick={() => {
                    startProcess({
                      domain: 'customer-relations',
                      processName: 'saveSalesTask',
                      payload: {
                        leadId
                      },
                      builderType: 'NATIVE_SCREEN',
                    })
                  }}
                >
                  Add Activity
                </Button>
              </div>

              {/* Activity Timeline Items */}
              <div style={{ padding: '0 24px', position: 'relative' }}>
                {/* Vertical timeline line */}
                <div 
                  style={{
                    position: 'absolute',
                    left: '24px',
                    top: '48px',
                    bottom: '24px',
                    width: '1px',
                    backgroundColor: '#f0f0f0',
                    zIndex: 1
                  }}
                />
                
                {lead.activities && lead.activities.length > 0 ? (
                  lead.activities.map((activity, index) => {
                    // Determine the icon based on activity type
                    let ActivityIcon = CommentOutlined; // Default icon
                    if (activity.activityType.code === 'CALL') {
                      ActivityIcon = PhoneOutlined;
                    } else if (activity.activityType.code === 'EMAIL') {
                      ActivityIcon = MailOutlined;
                    } else if (activity.activityType.code === 'MEETING') {
                      ActivityIcon = VideoCameraOutlined;
                    }
                    
                    // Format date
                    const formattedDate = activity.createdAt ? dayjs(activity.createdAt).format('MMM D, YYYY, h:mm A') : '';
                    
                    // Generate initials from owner name
                    const ownerName = `${activity.ownerEmployee.firstName} ${activity.ownerEmployee.lastName}`.trim();
                    const initials = ownerName.split(' ')
                      .map(part => part[0])
                      .join('')
                      .toUpperCase()
                      .substring(0, 2) || 'NA';
                      
                    return (
                      <div 
                        key={activity.id || index}
                        className="gba:activity-item" 
                        data-testid={`activity-item-${index + 1}`}
                        style={{ 
                          padding: '24px 0', 
                          position: 'relative'
                        }}
                      >
                        <div 
                          className="gba:activity-icon" 
                          style={{
                            position: 'absolute',
                            left: '0',
                            top: '24px',
                            zIndex: 2 /* Ensure icon is above the vertical line */
                          }}
                        >
                          <ActivityIcon style={{ 
                            fontSize: '16px', 
                            padding: '8px', 
                            borderRadius: '50%', 
                            border: '1px solid #f0f0f0',
                            backgroundColor: '#fff' /* Ensure background is white to cover the line */
                          }} />
                        </div>

                        <div style={{ marginLeft: '40px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div 
                              className="gba:activity-title"
                              data-testid={`activity-title-${index + 1}`}
                              style={{ 
                                fontWeight: '600', 
                                fontSize: '16px' 
                              }}
                            >
                              {activity.title}
                            </div>
                            <div 
                              className="gba:activity-time"
                              data-testid={`activity-time-${index + 1}`}
                              style={{ 
                                color: '#8c8c8c', 
                                fontSize: '14px' 
                              }}
                            >
                              {formattedDate}
                            </div>
                          </div>

                          {activity.description && (
                            <div 
                              className="gba:activity-description"
                              data-testid={`activity-description-${index + 1}`}
                              style={{ 
                                marginBottom: '12px',
                                fontSize: '14px',
                                color: '#595959'
                              }}
                            >
                              {activity.description}
                            </div>
                          )}

                          <div 
                            className="gba:activity-owner"
                            style={{
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Avatar 
                              style={{ 
                                backgroundColor: index % 3 === 0 ? '#1890ff' : index % 3 === 1 ? '#722ed1' : '#f5f5f5',
                                marginRight: '8px',
                                fontSize: '12px',
                                color: index % 3 === 2 ? '#595959' : '#fff',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}
                              size={24}
                            >
                              {initials}
                            </Avatar>
                            <span style={{ fontSize: '14px', color: '#595959' }}>{ownerName}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div 
                    style={{ 
                      textAlign: 'center', 
                      color: '#8c8c8c',
                      padding: '36px 0'
                    }}
                  >
                    No activities found for this lead
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Notes content */}
            {activeActivityTab === 'notes' && (
            <div className="gba:notes-content" data-testid="notes-content">
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div 
                    className="gba:notes-title" 
                    data-testid="notes-title"
                    style={{
                      fontWeight: '600',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    Notes
                    <CaretDownOutlined 
                      style={{ 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }} 
                    />
                  </div>
                  <Button
                    type="primary"
                    data-testid="add-note-button"
                    className="gba:add-note-button"
                    style={{
                      backgroundColor: '#000000',
                      borderColor: '#000000',
                      fontWeight: '500',
                      height: '36px',
                      borderRadius: '4px'
                    }}
                  >
                    Add Note
                  </Button>
                </div>
                <div style={{ color: '#8c8c8c', textAlign: 'left' }}>
                  No notes have been added yet.
                </div>
              </div>
            </div>
            )}

            {/* Documents content */}
            {activeActivityTab === 'documents' && (
            <div className="gba:documents-content" data-testid="documents-content">
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div 
                    className="gba:documents-title" 
                    data-testid="documents-title"
                    style={{
                      fontWeight: '600',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    Documents
                    <CaretDownOutlined 
                      style={{ 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }} 
                    />
                  </div>
                  <Button
                    type="primary"
                    data-testid="upload-document-button"
                    className="gba:upload-document-button"
                    style={{
                      backgroundColor: '#000000',
                      borderColor: '#000000',
                      fontWeight: '500',
                      height: '36px',
                      borderRadius: '4px'
                    }}
                  >
                    Upload
                  </Button>
                </div>
                <div style={{ color: '#8c8c8c', textAlign: 'left' }}>
                  No documents have been uploaded yet.
                </div>
              </div>
            </div>
            )}
          </div>
        </Col>
      </Row>

    </div>
  );
};

export default LeadDetails;