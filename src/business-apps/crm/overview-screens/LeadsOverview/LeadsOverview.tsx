import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  Dropdown,
  Empty,
  Form,
  Grid,
  Input,
  List,
  message,
  Modal,
  Row,
  Select,
  Spin,
  Table,
  Typography,
  Divider,
  DatePicker
} from 'antd';
const { useBreakpoint } = Grid;
import {
  CloseCircleOutlined,
  EditOutlined,
  MailOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  PhoneOutlined,
  GlobalOutlined,
  PieChartOutlined, 
  TeamOutlined, 
  FieldTimeOutlined, 
  StarOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';
import { useAccountsData } from './hooks/useAccountsData';
import { useLeadsData } from './hooks/useLeadsData';
import { useContactsData } from './hooks/useContactsData';
import { useEmployeesData } from './hooks/useEmployeesData';
import LeadDetails from './LeadDetails';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { env } from '@/common/env/EnvUtils';
import { useDebounce } from '@/common/hooks/useDebounce';

dayjs.extend(relativeTime);
dayjs.extend(weekday);
dayjs.extend(localeData);

interface BusinessAppContextProps {
  accessToken: string;
  employeeId?: string;
  structureId?: string;
  userInfo: any;
}

const { Title, Paragraph } = Typography;

interface LeadTableItem {
  id: string;
  key?: string;
  selected?: boolean;
  name: string;
  companyName: string;
  contactName: string;
  contactId?: string;
  contactEmail?: string;
  contactPhone?: string;
  ownerName: string;
  ownerId: string;
  ownerAvatar?: string;
  accountId?: string;
  createdAt: string;
  lastActivity?: string;
  tags: string[];
  status: 'active' | 'lost' | 'converted';
  version: number;
  leadSource?: {
    id: string;
    value: string;
  };
  leadStatus?: {
    id: string;
    value: string;
  };
  leadRating?: {
    id: string;
    value: string;
  };
}

function LeadsOverviewComponent({ accessToken, userInfo }: BusinessAppContextProps) {
  // Initialize catalog client for all catalog operations
  const catalogClient = useCatalogManagerClient(accessToken);

  // State for UI operations
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>();
  const [isLeadDetailVisible, setIsLeadDetailVisible] = useState(false);
  const [isNewLead, setIsNewLead] = useState<boolean>(false); // Used for new lead creation
  const [editingLead, setEditingLead] = useState<LeadTableItem | undefined>(undefined); // Store the lead being edited
  const [leads, setLeads] = useState<LeadTableItem[]>([]);
  const screens = useBreakpoint();
  const [isMobile, setIsMobile] = useState(false);
  
  // Modal state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form instance
  const [form] = Form.useForm();
  
  // Catalog data for dropdowns
  const [leadStatusOptions, setLeadStatusOptions] = useState<any[]>([]);
  const [leadSourceOptions, setLeadSourceOptions] = useState<any[]>([]);
  const [leadRatingOptions, setLeadRatingOptions] = useState<any[]>([]);
  const [loadingCatalogData, setLoadingCatalogData] = useState(false);
  
  // Fetch data for dropdowns
  const { 
    accounts, 
    loading: accountsLoading, 
    refetch: refetchAccounts, 
    loadMore: loadMoreAccounts, 
    hasMore: hasMoreAccounts,
    search: searchAccounts 
  } = useAccountsData(accessToken);
  
  const { 
    contacts, 
    loading: contactsLoading, 
    refetch: refetchContacts, 
    loadMore: loadMoreContacts, 
    hasMore: hasMoreContacts,
    search: searchContacts 
  } = useContactsData(accessToken);

  const { employees, loading: employeesLoading } = useEmployeesData(accessToken);

  useEffect(() => {
    setIsMobile(!screens.md);
  }, [screens]);

  // Search state for debouncing
  const [accountSearchText, setAccountSearchText] = useState<string>('');
  const [contactSearchText, setContactSearchText] = useState<string>('');

  // Reference to store timeout IDs for search input debouncing
  const accountInputTimeout = useRef<NodeJS.Timeout | null>(null);
  const contactInputTimeout = useRef<NodeJS.Timeout | null>(null);

  // Debounced input handlers
  const handleAccountSearch = useCallback((value: string) => {
    if (accountInputTimeout.current) {
      clearTimeout(accountInputTimeout.current);
    }

    accountInputTimeout.current = setTimeout(() => {
      setAccountSearchText(value);
    }, 500);
  }, []);

  const handleContactSearch = useCallback((value: string) => {
    if (contactInputTimeout.current) {
      clearTimeout(contactInputTimeout.current);
    }

    contactInputTimeout.current = setTimeout(() => {
      setContactSearchText(value);
    }, 500);
  }, []);

  // Apply debouncing to the search texts for API calls
  useEffect(() => {
    if (accountSearchText !== undefined) {
      searchAccounts(accountSearchText);
    }
  }, [accountSearchText, searchAccounts]);
  
  useEffect(() => {
    if (contactSearchText !== undefined) {
      searchContacts(contactSearchText);
    }
  }, [contactSearchText, searchContacts]);
  
  // Reference to store timeout IDs for cleanup (keeping for backward compatibility)
  const accountSearchTimeout = useRef<NodeJS.Timeout | null>(null);
  const contactSearchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (accountSearchTimeout.current) {
        clearTimeout(accountSearchTimeout.current);
      }
      if (contactSearchTimeout.current) {
        clearTimeout(contactSearchTimeout.current);
      }
    };
  }, []);

  // Fetch leads data
  const { 
    leads: leadsData, 
    loading, 
    error, 
    refetch: refetchLeads,
    totalCount,
    currentPage,
    pageSize,
    handlePageChange,
    searchTerm,
    handleSearch,
    orderBy,
    handleOrderByChange 
  } = useLeadsData(accessToken);
  
  // Map leads data
  useEffect(() => {
    if (leadsData && leadsData.length > 0) {
      const mappedLeads = leadsData.map(lead => {
        return {
          ...lead,
          key: lead.id,
          selected: false
        };
      });
      setLeads(mappedLeads);
    }
  }, [leadsData]);

  // Reset form when modal opens
  useEffect(() => {
    if (isAddEditModalOpen) {
      form.resetFields();
      
      if (editingLead) {
        // Format the data for the form
        const formattedData = {
          companyName: editingLead.companyName,
          contactName: editingLead.contactName,
          contactEmail: editingLead.contactEmail,
          contactPhone: editingLead.contactPhone,
          accountId: editingLead.accountId,
          contactId: editingLead.contactId,
          ownerId: editingLead.ownerId,
          statusRef: editingLead.status?.id,
          sourceRef: editingLead.source?.id,
          ratingRef: editingLead.leadRating?.id,
          notes: editingLead.notes,
          leadName: editingLead.name
        };
        
        form.setFieldsValue(formattedData);
      } else if (isNewLead && userInfo?.employeeDetails?.employeeId) {
        // For new leads, set the current user as the default owner
        form.setFieldsValue({
          ownerId: userInfo.employeeDetails.employeeId
        });
      }
    }
  }, [isAddEditModalOpen, editingLead, form, isNewLead, userInfo]);

  // Handle contact selection to auto-populate email and phone
  const handleContactChange = (contactId: string) => {
    const selectedContact = contacts.find(contact => contact.id === contactId);
    if (selectedContact) {
      form.setFieldsValue({
        contactEmail: selectedContact.email,
        contactPhone: selectedContact.phone,
        contactName: selectedContact.fullName
      });
    }
  };

  // Fetch lead status and source options
  const fetchLeadCatalogOptions = useCallback(async () => {
    if (!isAddEditModalOpen) return;
    
    try {
      setLoadingCatalogData(true);
      
      const fetchAllCatalogEntries = async (catalogIdentifier: string, version: string = 'v1') => {
        let allEntries: any[] = [];
        let offset = 0;
        const limit = 100; 
        let hasMore = true;

        while (hasMore) {
          try {
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
          } catch (error) {
            console.warn(`Error fetching catalog ${catalogIdentifier}:`, error);
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
      
      // Fetch lead status options - always fetch fresh data
      const leadStatusData = await fetchAllCatalogEntries('SalesLeadStatus');
      setLeadStatusOptions(leadStatusData);
      
      // Fetch lead source options - always fetch fresh data
      const leadSourceData = await fetchAllCatalogEntries('SalesLeadSource');
      setLeadSourceOptions(leadSourceData);
      
      // Fetch lead rating options - always fetch fresh data
      const leadRatingData = await fetchAllCatalogEntries('SalesLeadRating');
      setLeadRatingOptions(leadRatingData);
    } catch (error) {
      console.error('Error fetching lead catalog data:', error);
      message.error('Failed to load reference data for leads');
    } finally {
      setLoadingCatalogData(false);
    }
  }, [catalogClient, isAddEditModalOpen]);

  // Fetch lead catalog options when modal opens
  useEffect(() => {
    if (isAddEditModalOpen) {
      // Reset options to force refetch
      setLeadStatusOptions([]);
      setLeadSourceOptions([]);
      setLeadRatingOptions([]);
      fetchLeadCatalogOptions();
    }
  }, [isAddEditModalOpen, fetchLeadCatalogOptions]);
  
  // Effect to update the form when lead status options change
  useEffect(() => {
    if ((leadStatusOptions.length > 0 || leadSourceOptions.length > 0 || leadRatingOptions.length > 0) && isAddEditModalOpen) {
      // If editing a lead, preserve the selected values
      if (!isNewLead && editingLead) {
        const formValues: any = {};
        
        if (editingLead.status?.id) {
          formValues.statusRef = editingLead.status.id;
        }
        
        if (editingLead.source?.id) {
          formValues.sourceRef = editingLead.source.id;
        }
        
        if (editingLead.leadRating?.id) {
          formValues.ratingRef = editingLead.leadRating.id;
        }
        
        if (Object.keys(formValues).length > 0) {
          form.setFieldsValue(formValues);
        }
      } 
      // For a new lead, we can set defaults if needed
      else if (isNewLead) {
        const formValues: any = {};
        
        // Find a default status like "New" or "Open" if available
        if (leadStatusOptions.length > 0) {
          const defaultStatus = leadStatusOptions.find(status => 
            status.code === "NEW" || status.code === "OPEN" || status.code === "CREATED"
          );
          
          if (defaultStatus) {
            formValues.statusRef = defaultStatus.id;
          }
        }
        
        // Set default source if needed
        if (leadSourceOptions.length > 0) {
          const defaultSource = leadSourceOptions.find(source => 
            source.code === "WEB" || source.code === "DIRECT"
          );
          
          if (defaultSource) {
            formValues.sourceRef = defaultSource.id;
          }
        }
        
        // Set default rating if needed
        if (leadRatingOptions.length > 0) {
          const defaultRating = leadRatingOptions.find(rating => 
            rating.code === "MEDIUM" || rating.code === "NORMAL" || rating.code === "AVERAGE"
          );
          
          if (defaultRating) {
            formValues.ratingRef = defaultRating.id;
          }
        }
        
        if (Object.keys(formValues).length > 0) {
          form.setFieldsValue(formValues);
        }
      }
    }
  }, [leadStatusOptions, leadSourceOptions, leadRatingOptions, isAddEditModalOpen, isNewLead, editingLead, form]);
  
  // Form submission for lead creation/editing
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);
      
      // Get selected account and contact names
      const selectedAccount = accounts.find(account => account.id === values.accountId);
      const selectedContact = contacts.find(contact => contact.id === values.contactId);
      const selectedEmployee = employees.find(employee => employee.id === values.ownerId);
      
      // Prepare data for saving
      const savePayload = !isNewLead ? {
        changeMode: "UPDATE",
        lead: {
          id: editingLead?.id,
          version: editingLead?.version || 0,
          name: values.leadName,
          account: values.accountId,
          contact: values.contactId,
          ownerEmployee: values.ownerId,
          companyName: selectedAccount?.name || values.companyName,
          contactName: selectedContact?.fullName || values.contactName,
          contactEmail: values.contactEmail,
          contactPhone: values.contactPhone,
          notes: values.notes,
          leadStatusRef: values.statusRef,
          leadSourceRef: values.sourceRef,
          leadRatingRef: values.ratingRef
        }
      } : {
        changeMode: "INSERT",
        lead: {
          name: values.leadName,
          account: values.accountId,
          contact: values.contactId,
          ownerEmployee: values.ownerId || null,
          companyName: selectedAccount?.name || values.companyName,
          contactName: selectedContact?.fullName || values.contactName,
          contactEmail: values.contactEmail,
          contactPhone: values.contactPhone,
          notes: values.notes,
          leadStatusRef: values.statusRef,
          leadSourceRef: values.sourceRef,
          leadRatingRef: values.ratingRef
        }
      };
      try {
        const response = await fetch(
          `${env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT')}/customer-relations/saveLead`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(savePayload)
          }
        );
        
        const responseText = await response.text();
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          responseData = { message: responseText };
        }
        
        if (response.ok || responseData?.lead?.id) {
          message.success(`Lead ${!isNewLead ? 'updated' : 'created'} successfully!`);
          
          // Close modal and reset state
          setIsAddEditModalOpen(false);
          setIsNewLead(false);
          setEditingLead(undefined);
          
          // Refresh leads data
          refetchLeads();
        } else {
          const errorMessage = responseData.message || response.statusText || 'Unknown error';
          throw new Error(`Failed to ${!isNewLead ? 'update' : 'create'} lead: ${errorMessage}`);
        }
      } catch (err: any) {
        console.error('Error saving lead:', err);
        message.error(`Failed to ${!isNewLead ? 'update' : 'create'} lead: ${err.message || 'Unknown error'}`);
      } finally {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Form validation failed:', error);
      setIsSubmitting(false);
    }
  };
  
  // Handle table sort change
  const handleTableSortChange = (sorter: any) => {
    if (!sorter.order || !sorter.field) return;
    
    const sortOrder = sorter.order === 'ascend' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST';
    const sortField = sorter.field;
    
    const orderByObject = {};
    orderByObject[sortField] = sortOrder;
    
    handleOrderByChange(JSON.stringify(orderByObject));
  };
  
  // Format relative time for last activity
  const formatTimeDifference = (dateString: string | undefined) => {
    if (!dateString) return 'No activity';
    
    try {
      const now = new Date();
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
      if (diffInSeconds < 60) {
        if (diffInSeconds <= 0) {
          return 'Just now';
        }
        return `${diffInSeconds} ${diffInSeconds === 1 ? 'second' : 'seconds'} ago`;
      }  
      
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) {
        return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
      }
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) {
        return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
      }
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
      }
      
      const diffInWeeks = Math.floor(diffInDays / 7);
      if (diffInWeeks < 4) {
        return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
      }
      
      const diffInMonths = Math.floor(diffInDays / 30);
      if (diffInMonths < 12) {
        return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
      }
      
      const diffInYears = Math.floor(diffInDays / 365);
      return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date error';
    }
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return dayjs(dateString).format('MMM D, YYYY');
  };
  
  const handleRowClick = (record: LeadTableItem) => {
    setSelectedLeadId(record.id);
    setIsLeadDetailVisible(true);
  };
  
  const handleLeadDetailBack = () => {
    setIsLeadDetailVisible(false);
    setSelectedLeadId(undefined);
    refetchLeads();
  };
  
  const handleAddLead = () => {
    setIsNewLead(true);
    setEditingLead(undefined); // Clear any previous editing state
    setIsAddEditModalOpen(true); // Open modal instead
    refetchLeads();
  };

  // Handle edit selected lead
const handleEditLead = () => {
  if (selectedRowKeys.length === 0) {
      message.warning('Please select a lead to edit');
      return;
    }
    
    const leadToEdit = leads.find(lead => lead.id === selectedRowKeys[0]);
    if (!leadToEdit) {
      message.error('Selected lead not found');
      return;
    }
    
    setEditingLead(leadToEdit);
    setIsNewLead(false);
    setIsAddEditModalOpen(true); // Open modal instead
  };

  // Handle cancel of lead edit/create
  const handleCancelLeadEdit = () => {
    setIsAddEditModalOpen(false);
    setIsNewLead(false);
    setEditingLead(undefined);
    form.resetFields();
  };

  // Handle mark as lost
  const handleMarkAsLost = async (lead: LeadTableItem) => {
    if (!lead || !lead.id) {
      message.error('Cannot mark as lost: Lead information is missing');
      return;
    }
    try {
      const markAsLostPayload = {
        changeMode: "DELETE",
        lead: {
          id: lead.id,
          version: lead.version,
        }
      };
      
      const response = await fetch(`${env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT')}/customer-relations/saveLead`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(markAsLostPayload)
      });
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error('Error response:', responseText);
        throw new Error(`Failed to mark lead as lost: ${response.statusText}`);
      }
      
      message.success(`${lead.companyName} marked as lost`);
      
      refetchLeads();
    } catch (error) {
      console.error('Error marking lead as lost:', error);
      message.error(`Failed to mark lead as lost: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Table columns configuration
  const columns = [
    {
      title: 'Name',
      key: 'name',
      dataIndex: 'name',
      sorter: (a: LeadTableItem, b: LeadTableItem) => a.name.localeCompare(b.name),
      render: (text: string, record: LeadTableItem) => (
        <a onClick={(e) => { e.stopPropagation(); handleRowClick(record); }}>
          {text || '-'}
        </a>
      ),
    },
    {
      title: 'Company',
      key: 'companyName',
      dataIndex: 'companyName',
      sorter: (a: LeadTableItem, b: LeadTableItem) => a.companyName.localeCompare(b.companyName),
      render: (text: string, record: LeadTableItem) => (
        <a onClick={(e) => { e.stopPropagation(); handleRowClick(record); }}>
          {text || '-'}
        </a>
      ),
    },
    {
      title: 'Contact',
      key: 'contactName',
      dataIndex: 'contactName',
      sorter: (a: LeadTableItem, b: LeadTableItem) => a.contactName.localeCompare(b.contactName),
      render: (text: string, record: LeadTableItem) => (
        <a onClick={(e) => { e.stopPropagation(); handleRowClick(record); }}>
          {text || '-'}
        </a>
      ),
    },
    {
      title: 'Status',
      key: 'leadStatus',
      dataIndex: 'leadStatus',
      render: (status: any, record: LeadTableItem) => (
        <span>{record.leadStatus?.value || '-'}</span>
      ),
      responsive: ['md'] as ('md')[],
    },
    {
      title: 'Source',
      key: 'leadSource',
      dataIndex: 'leadSource',
      render: (source: any, record: LeadTableItem) => (
        <span>{record.leadSource?.value || '-'}</span>
      ),
      responsive: ['md'] as ('md')[],
    },
    {
      title: 'Rating',
      key: 'leadRating',
      dataIndex: 'leadRating',
      render: (rating: any, record: LeadTableItem) => (
        <span>{record.leadRating?.value || '-'}</span>
      ),
      responsive: ['md'] as ('md')[],
    },
    {
      title: 'Owner',
      key: 'ownerName',
      dataIndex: 'ownerName',
      sorter: (a: LeadTableItem, b: LeadTableItem) => a.ownerName.localeCompare(b.ownerName),
      render: (text: string, record: LeadTableItem) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {record.ownerAvatar ? (
            <Avatar src={record.ownerAvatar} size="small" style={{ marginRight: 8 }} />
          ) : (
            <Avatar icon={<UserOutlined />} size="small" style={{ marginRight: 8 }} />
          )}
          {text || 'Unassigned'}
        </div>
      ),
    },
    {
      title: 'Created Date',
      key: 'createdAt',
      dataIndex: 'createdAt',
      sorter: (a: LeadTableItem, b: LeadTableItem) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateA - dateB;
      },
      render: (date: string) => formatDate(date),
      responsive: ['md'] as ('md')[],
      defaultSortOrder: 'descend' as const
    },
    {
      title: 'Last Activity',
      key: 'lastActivity',
      dataIndex: 'lastActivity',
      sorter: (a: LeadTableItem, b: LeadTableItem) => {
        const dateA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const dateB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return dateA - dateB;
      },
      render: (date: string) => formatTimeDifference(date),
      responsive: ['md'] as ('md')[],
    },
    {
      title: 'Tags',
      key: 'tags',
      render: (_: any, lead: LeadTableItem) => (
        <div>-</div>
      ),
      responsive: ['lg'] as ('lg')[]
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, record: LeadTableItem) => (
        <Dropdown
          menu={{
            items: [
              {
                key: '1',
                icon: <CloseCircleOutlined />,
                label: 'Mark as Lost',
                onClick: (info: any) => {
                  info.domEvent.stopPropagation();
                  handleMarkAsLost(record);
                }
              }
            ]
          }}
          trigger={['click']}
          placement='bottomRight'
        >
          <Button type='text' icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
        </Dropdown>
      ),
    },
  ];

  const renderLeadCard = (lead: LeadTableItem) => (
    <List.Item 
      key={lead.id}
      onClick={() => handleRowClick(lead)}
      style={{ cursor: 'pointer' }}
    >
      <Card style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
              {lead.companyName || '-'}
            </div>
            <div style={{ marginBottom: 4 }}>Contact: {lead.contactName || '-'}</div>
            <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center' }}>
              Owner: 
              {lead.ownerAvatar ? (
                <Avatar src={lead.ownerAvatar} size="small" style={{ margin: '0 8px' }} />
              ) : (
                <Avatar icon={<UserOutlined />} size="small" style={{ margin: '0 8px' }} />
              )}
              {lead.ownerName || 'Unassigned'}
            </div>
            <div style={{ marginBottom: 4 }}>Created: {formatDate(lead.createdAt)}</div>
            <div style={{ marginBottom: 4 }}>Last Activity: {formatTimeDifference(lead.lastActivity)}</div>
            
          </div>
          <Dropdown
            menu={{
              items: [
                {
                  key: '1',
                  icon: <CloseCircleOutlined />,
                  label: 'Mark as Lost',
                  onClick: (e) => {
                    e.domEvent.stopPropagation();
                    handleMarkAsLost(lead);
                  }
                }
              ]
            }}
            trigger={['click']}
            placement='bottomRight'
          >
            <Button type='text' icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
          </Dropdown>
        </div>
      </Card>
    </List.Item>
  );
  
  // New state variables for company modal
  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  const [companyFormLoading, setCompanyFormLoading] = useState(false);
  const [industryOptions, setIndustryOptions] = useState<any[]>([]);
  const [legalFormOptions, setLegalFormOptions] = useState<any[]>([]);
  const [numberOfEmployeesOptions, setNumberOfEmployeesOptions] = useState<any[]>([]);
  const [countriesOptions, setCountriesOptions] = useState<any[]>([]);
  const [companyForm] = Form.useForm();
  
  // Fetch catalog data for company creation
  const fetchCompanyCatalogData = useCallback(async () => {
    if (!isCreateCompanyModalOpen) return;
    
    try {
      setCompanyFormLoading(true);
      
      // Fetch industry classes
      const industryClassResponse = await catalogClient.getCatalogEntriesList({ 
        catalogIdentifier: 'IndustryClass', 
        version: 'v1' 
      });
      
      if (industryClassResponse.data) {
        setIndustryOptions(industryClassResponse.data.map((entry: any) => ({
          id: entry.id,
          code: entry.code,
          value: entry.value
        })));
      }
      
      // Fetch legal forms
      const legalFormResponse = await catalogClient.getCatalogEntriesList({ 
        catalogIdentifier: 'LegalForm', 
        version: 'v1' 
      });
      
      if (legalFormResponse.data) {
        setLegalFormOptions(legalFormResponse.data.map((entry: any) => ({
          id: entry.id,
          code: entry.code,
          value: entry.value
        })));
      }
      
      // Fetch employee size options
      const employeeSizeResponse = await catalogClient.getCatalogEntriesList({ 
        catalogIdentifier: 'EmployeeSize', 
        version: 'v1' 
      });
      
      if (employeeSizeResponse.data) {
        setNumberOfEmployeesOptions(employeeSizeResponse.data.map((entry: any) => ({
          id: entry.id,
          code: entry.code,
          value: entry.value
        })));
      }
      
      // Fetch countries
      try {
        const countriesResponse = await catalogClient.getCatalogEntriesList({ 
          catalogIdentifier: 'Country', 
          version: 'v1' 
        });
        
        if (countriesResponse.data) {
          setCountriesOptions(countriesResponse.data.map((entry: any) => ({
            id: entry.id,
            code: entry.code,
            value: entry.value
          })));
        }
      } catch (countryError) {
        console.warn('Could not fetch countries:', countryError);
      }
      
    } catch (error) {
      console.error('Error fetching catalog data for company creation:', error);
      message.error('Failed to load company form data');
    } finally {
      setCompanyFormLoading(false);
    }
  }, [catalogClient, isCreateCompanyModalOpen]);
  
  // Effect to fetch catalog data when company modal opens
  useEffect(() => {
    if (isCreateCompanyModalOpen) {
      fetchCompanyCatalogData();
      
      // Set default company owner to current user
      if (userInfo?.employeeDetails?.employeeId) {
        companyForm.setFieldsValue({
          ownerEmployee: userInfo.employeeDetails.employeeId
        });
      }
    }
  }, [isCreateCompanyModalOpen, fetchCompanyCatalogData, companyForm, userInfo]);
  
  // Handle company form submission
  const handleCreateCompany = async (values: any) => {
    try {
      setCompanyFormLoading(true);
      
      const savePayload = {
        id: "string",
        changeMode: "INSERT",
        account: {
          name: values.name,
          website: values.website,
          foundationDate: values.foundationDate ? new Date(values.foundationDate).toISOString() : undefined,
          email: values.email,
          phone: values.phone,
          numberOfEmployeesRef: values.numberOfEmployees,
          ownerEmployee: userInfo?.employeeDetails?.employeeId,
          industryRef: values.industry,
          legalFormRef: values.legalForm,
          addresses: [{
            addressType: "PRIMARY_ADDRESS",
            addressLine: values.addressLine,
            postalCode: values.postalCode,
            city: values.city,
            countryRef: values.country,
            region: values.region
          }]
        }
      };
      
      const response = await fetch(
        `${env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT')}/customer-relations/saveAccount`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(savePayload)
        }
      );
      
      const responseText = await response.text();
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { message: responseText };
      }
      
      if (response.ok || responseData?.account?.id) {
        message.success('Company created successfully');
        
        // Refetch accounts list properly
        refetchAccounts();
        
        // Set the newly created company as the selected company
        form.setFieldsValue({
          accountId: responseData.account.id
        });
        
        setIsCreateCompanyModalOpen(false);
        companyForm.resetFields();
      } else {
        const errorMessage = responseData.message || response.statusText || 'Unknown error';
        throw new Error(`Failed to create company: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error creating company:', error);
      message.error(`Failed to create company: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCompanyFormLoading(false);
    }
  };

  // New state for contact creation modal
  const [isCreateContactModalOpen, setIsCreateContactModalOpen] = useState(false);
  const [contactFormLoading, setContactFormLoading] = useState(false);
  const [contactForm] = Form.useForm();

  // Handle opening the create contact modal
  const handleOpenCreateContactModal = () => {
    setIsCreateContactModalOpen(true);
    contactForm.resetFields();
    
    // Set default owner (current user) if available
    if (userInfo?.employeeDetails?.employeeId) {
      contactForm.setFieldsValue({
        employeeId: userInfo.employeeDetails.employeeId
      });
    }
  };

  // Handle creating a new contact
  const handleCreateContact = async () => {
    try {
      setContactFormLoading(true);
      const values = await contactForm.validateFields();
      
      const savePayload = {
        changeMode: "INSERT",
        contact: {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          jobTitle: values.jobTitle,
          department: values.department,
          bio: values.bio,
          account: values.accountId,
          birthDate: values.birthDate ? values.birthDate.format('YYYY-MM-DD') : undefined,
          linkedinUrl: values.linkedinUrl,
          xingUrl: values.xingUrl,
          ownerEmployee: values.employeeId || userInfo?.employeeDetails?.employeeId
        }
      };
      
      const response = await fetch(
        `${env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT')}/customer-relations/saveContact`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(savePayload)
        }
      );
      
      const responseText = await response.text();
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { message: responseText };
      }
      
      if (response.ok || responseData?.contact?.id) {
        message.success('Contact created successfully');
        
        // Refetch contacts list
        refetchContacts();
        
        // Set the newly created contact as the selected contact
        form.setFieldsValue({
          contactId: responseData.contact.id
        });
        
        setIsCreateContactModalOpen(false);
        contactForm.resetFields();
      } else {
        const errorMessage = responseData.message || response.statusText || 'Unknown error';
        throw new Error(`Failed to create contact: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      message.error(`Failed to create contact: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setContactFormLoading(false);
    }
  };

  // Helper function to count unique lead sources
  const getUniqueLeadSourcesCount = (leads: LeadTableItem[]): number => {
    const sourceMap = new Map();
    leads.forEach(lead => {
      if (lead.leadSource?.value) {
        sourceMap.set(lead.leadSource.value, true);
      }
    });
    return sourceMap.size;
  };

  const handleOpenAddEditModal = (lead?: LeadTableItem) => {
    if (lead) {
      // Editing an existing lead
      setIsNewLead(false);
      setEditingLead(lead);
      
      const formattedData = {
        accountId: lead.accountId,
        contactId: lead.contactId,
        ownerId: lead.ownerId,
        statusRef: lead.status?.id,
        sourceRef: lead.source?.id,
        ratingRef: lead.leadRating?.id,
        notes: lead.notes,
        leadName: lead.name
      };
      
      form.setFieldsValue(formattedData);
    } else {
      // Creating a new lead
      setIsNewLead(true);
      setEditingLead(undefined);
      
      // Complete form reset with no values
      form.resetFields();
      
      // Clear selections
      setSelectedRowKeys([]);
      
      // Set default owner to current user if available
      if (userInfo?.employeeDetails?.employeeId) {
        form.setFieldsValue({
          ownerId: userInfo.employeeDetails.employeeId
        });
      }
    }
    
    setIsAddEditModalOpen(true);
  };

  return (
    <div style={{ padding: 24 }} data-testid="leads-overview-container">
      {isLeadDetailVisible && selectedLeadId ? (
        <LeadDetails
          accessToken={accessToken}
          leadId={selectedLeadId}
          onBack={handleLeadDetailBack}
        />
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }} data-testid="leads-header">
            <div>
              <Title level={2} style={{ margin: 0 }}>Leads</Title>
              <Paragraph type="secondary">Manage leads that don't have linked opportunities or investments.</Paragraph>
            </div>
            <div>
              {selectedRowKeys.length > 0 && leads.length > 0 && (
                <Button 
                  icon={<EditOutlined />}
                  onClick={handleEditLead}
                  style={{ marginRight: 16 }}
                  data-testid="edit-lead-button"
                >
                  Edit
                </Button>
              )}
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => handleOpenAddEditModal()}
                data-testid="add-lead-button"
              >
                Add Lead
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <Row gutter={16} className="gba:mb-6" data-testid="leads-kpi-cards">
            <Col xs={24} sm={12} md={6} className="gba:pb-4">
              <div className="gba:p-6 gba:border gba:rounded-lg gba:bg-white gba:shadow-sm" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '110px' }}>
                <div className="gba:flex gba:items-center">
                  <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-blue-50 gba:flex gba:items-center gba:justify-center gba:mr-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PieChartOutlined className="gba:h-5 gba:w-5 gba:text-blue-500" style={{ fontSize: '18px' }} />
                  </div>
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">Total Leads</div>
                    <div className="gba:text-2xl gba:font-bold gba:text-blue-500">
                      {totalCount}
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6} className="gba:pb-4">
              <div className="gba:p-6 gba:border gba:rounded-lg gba:bg-white gba:shadow-sm" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '110px' }}>
                <div className="gba:flex gba:items-center">
                  <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-green-50 gba:flex gba:items-center gba:justify-center gba:mr-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TeamOutlined className="gba:h-5 gba:w-5 gba:text-green-500" style={{ fontSize: '18px' }} />
                  </div>
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">Lead Sources</div>
                    <div className="gba:text-2xl gba:font-bold gba:text-green-500">
                      {getUniqueLeadSourcesCount(leads)}
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6} className="gba:pb-4">
              <div className="gba:p-6 gba:border gba:rounded-lg gba:bg-white gba:shadow-sm" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '110px' }}>
                <div className="gba:flex gba:items-center">
                  <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-yellow-50 gba:flex gba:items-center gba:justify-center gba:mr-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FieldTimeOutlined className="gba:h-5 gba:w-5 gba:text-yellow-500" style={{ fontSize: '18px' }} />
                  </div>
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">Recent Leads</div>
                    <div className="gba:text-2xl gba:font-bold gba:text-yellow-500">
                      {(() => {
                        const now = dayjs();
                        return leads.filter(lead => 
                          dayjs(lead.createdAt).isAfter(now.subtract(30, 'day'))
                        ).length;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6} className="gba:pb-4">
              <div className="gba:p-6 gba:border gba:rounded-lg gba:bg-white gba:shadow-sm" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '110px' }}>
                <div className="gba:flex gba:items-center">
                  <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-red-50 gba:flex gba:items-center gba:justify-center gba:mr-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <StarOutlined className="gba:h-5 gba:w-5 gba:text-red-500" style={{ fontSize: '18px' }} />
                  </div>
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">Top Rating</div>
                    <div className="gba:text-2xl gba:font-bold gba:text-red-500">
                      {(() => {
                        const ratingMap = new Map();
                        leads.forEach(lead => {
                          if (lead.leadRating?.value) {
                            ratingMap.set(lead.leadRating.value, (ratingMap.get(lead.leadRating.value) || 0) + 1);
                          }
                        });
                        
                        let topRating = 'None';
                        let maxCount = 0;
                        
                        ratingMap.forEach((count, rating) => {
                          if (count > maxCount) {
                            maxCount = count;
                            topRating = rating;
                          }
                        });
                        
                        return topRating;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
          
          <div style={{ marginBottom: 16 }} data-testid="leads-search">
            <Input
              placeholder="Search leads..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          </div>
          
          {/* Table Section */}
          {isMobile ? (
            <List
              loading={loading}
              dataSource={leads}
              renderItem={renderLeadCard}
              data-testid="leads-mobile-list"
              locale={{ emptyText: <Empty description="No leads found" /> }}
            />
          ) : (
            <Table
              columns={columns}
              dataSource={leads}
              rowKey="id"
              rowSelection={{
                type: 'checkbox',
                selectedRowKeys,
                onChange: keys => setSelectedRowKeys(keys as string[])
              }}
              onRow={(record) => ({
                onClick: () => handleRowClick(record)
              })}
              loading={loading}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: totalCount,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                onChange: handlePageChange,
                showTotal: (total) => `Total ${total} leads`
              }}
              onChange={(pagination, filters, sorter) => handleTableSortChange(sorter)}
              data-testid="leads-table"
              className="gba:w-full"
            />
          )}
          
          {/* Add/Edit Lead Modal */}
          <Modal
            title={isNewLead ? "Create New Lead" : "Edit Lead"}
            open={isAddEditModalOpen}
            onCancel={handleCancelLeadEdit}
            footer={[
              <Button 
                key="cancel" 
                onClick={handleCancelLeadEdit}
                data-testid="modal-cancel-button"
              >
                Cancel
              </Button>,
              <Button 
                key="submit" 
                type="primary" 
                loading={isSubmitting}
                onClick={handleSubmit}
                data-testid="modal-save-button"
              >
                {isNewLead ? 'Create Lead' : 'Update Lead'}
              </Button>
            ]}
            maskClosable={false}
            width={540}
            style={{ top: 10 }}
            zIndex={1000}
            centered
            wrapClassName="custom-modal-position"
            getContainer={document.body}
            data-testid="add-edit-lead-modal"
          >
            <Spin spinning={accountsLoading || contactsLoading || employeesLoading || loadingCatalogData}>
              <Form
                form={form}
                layout="vertical"
                requiredMark={false}
                data-testid="lead-form"
              >
                <Divider orientation="left" style={{ marginTop: '8px' }}>Lead Information</Divider>
                
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="leadName"
                      label="Lead Name"
                      rules={[{ required: true, message: 'Please enter lead name' }]}
                      data-testid="lead-name-field"
                    >
                      <Input 
                        placeholder="Enter lead name"
                        data-testid="lead-name-input"
                      />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="statusRef"
                      label="Lead Status"
                      data-testid="lead-status-field"
                    >
                      <Select 
                        placeholder="Select lead status"
                        loading={loadingCatalogData}
                        showSearch
                        optionFilterProp="children"
                        data-testid="lead-status-select"
                      >
                        {leadStatusOptions.map(option => (
                          <Select.Option key={option.id} value={option.id} data-testid={`status-option-${option.code}`}>
                            {option.value}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="sourceRef"
                      label="Lead Source"
                      data-testid="lead-source-field"
                    >
                      <Select 
                        placeholder="Select lead source"
                        loading={loadingCatalogData}
                        showSearch
                        optionFilterProp="children"
                        data-testid="lead-source-select"
                      >
                        {leadSourceOptions.map(option => (
                          <Select.Option key={option.id} value={option.id} data-testid={`source-option-${option.code}`}>
                            {option.value}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="ratingRef"
                      label="Lead Rating"
                      data-testid="lead-rating-field"
                    >
                      <Select 
                        placeholder="Select lead rating"
                        loading={loadingCatalogData}
                        showSearch
                        optionFilterProp="children"
                        data-testid="lead-rating-select"
                      >
                        {leadRatingOptions.map(option => (
                          <Select.Option key={option.id} value={option.id} data-testid={`rating-option-${option.code}`}>
                            {option.value}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Divider orientation="left" style={{ marginTop: '8px' }}>Company Information</Divider>
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="accountId"
                      label="Company Name"
                      rules={[{ required: true, message: 'Please select a company' }]}
                      data-testid="company-name-field"
                    >
                      <Select 
                        placeholder="Select a company"
                        data-testid="company-name-select"
                        loading={accountsLoading}
                        showSearch
                        onSearch={(value) => {
                          if (typeof value === 'string') {
                            handleAccountSearch(value);
                          }
                        }}
                        filterOption={false}
                        dropdownRender={menu => (
                          <>
                            <Button
                              type="text"
                              icon={<PlusOutlined />}
                              block
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Force close dropdown first
                                document.body.click();
                                // Small delay to ensure dropdown closes before modal opens
                                setTimeout(() => {
                                  setIsCreateCompanyModalOpen(true);
                                }, 50);
                              }}
                              style={{ textAlign: 'left', padding: '8px 12px' }}
                              data-testid="create-new-company-button"
                            >
                              Create New Company
                            </Button>
                            <Divider style={{ margin: '4px 0' }} />
                            {menu}
                            {hasMoreAccounts && (
                              <div 
                                style={{ 
                                  textAlign: 'center', 
                                  padding: '8px 0',
                                  color: '#8c8c8c',
                                  fontSize: '12px'
                                }}
                                data-testid="accounts-loading-more"
                              >
                                {accountsLoading ? 'Loading more...' : 'Scroll for more'}
                              </div>
                            )}
                          </>
                        )}
                        onPopupScroll={(e) => {
                          const target = e.target as HTMLDivElement;
                          // Check if we've scrolled to the bottom
                          if (target.scrollTop + target.clientHeight >= target.scrollHeight - 20) {
                            // Load more accounts when we're near the bottom
                            if (hasMoreAccounts && !accountsLoading) {
                              loadMoreAccounts();
                            }
                          }
                        }}
                      >
                        {accounts.map(account => (
                          <Select.Option key={account.id} value={account.id}>
                            {account.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Divider orientation="left" style={{ marginTop: '8px' }}>Contact Information</Divider>
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="contactId"
                      label="Contact Person"
                      rules={[{ required: true, message: 'Please select a contact person' }]}
                      data-testid="contact-name-field"
                    >
                      <Select 
                        placeholder="Select a contact"
                        data-testid="contact-name-select"
                        loading={contactsLoading}
                        showSearch
                        optionFilterProp="children"
                        onChange={handleContactChange}
                        onSearch={(value) => {
                          if (typeof value === 'string') {
                            handleContactSearch(value);
                          }
                        }}
                        filterOption={false}
                        dropdownRender={menu => (
                          <>
                            <Button
                              type="text"
                              icon={<PlusOutlined />}
                              block
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Force close dropdown first
                                document.body.click();
                                // Small delay to ensure dropdown closes before modal opens
                                setTimeout(() => {
                                  handleOpenCreateContactModal();
                                }, 50);
                              }}
                              style={{ textAlign: 'left', padding: '8px 12px' }}
                              data-testid="create-new-contact-button"
                            >
                              Create New Contact
                            </Button>
                            <Divider style={{ margin: '4px 0' }} />
                            {menu}
                            {hasMoreContacts && (
                              <div 
                                style={{ 
                                  textAlign: 'center', 
                                  padding: '8px 0',
                                  color: '#8c8c8c',
                                  fontSize: '12px'
                                }}
                                data-testid="contacts-loading-more"
                              >
                                {contactsLoading ? 'Loading more...' : 'Scroll for more'}
                              </div>
                            )}
                          </>
                        )}
                        onPopupScroll={(e) => {
                          const target = e.target as HTMLDivElement;
                          // Check if we've scrolled to the bottom
                          if (target.scrollTop + target.clientHeight >= target.scrollHeight - 20) {
                            // Load more contacts when we're near the bottom
                            if (hasMoreContacts && !contactsLoading) {
                              loadMoreContacts();
                            }
                          }
                        }}
                      >
                        {contacts.map(contact => (
                          <Select.Option key={contact.id} value={contact.id}>
                            {contact.firstName} {contact.lastName}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="contactEmail"
                      label="Email"
                      data-testid="contact-email-field"
                    >
                      <Input 
                        prefix={<MailOutlined />} 
                        placeholder="Email will auto-populate from contact" 
                        data-testid="contact-email-input"
                        disabled
                      />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="contactPhone"
                      label="Phone"
                      data-testid="contact-phone-field"
                    >
                      <Input 
                        prefix={<PhoneOutlined />} 
                        placeholder="Phone will auto-populate from contact" 
                        data-testid="contact-phone-input"
                        disabled
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider orientation="left" style={{ marginTop: '8px' }}>Lead Details</Divider>
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="ownerId"
                      label="Lead Owner"
                      rules={[{ required: true, message: 'Please select a lead owner' }]}
                      data-testid="owner-field"
                    >
                      <Select 
                        placeholder="Select lead owner"
                        data-testid="owner-select"
                        loading={employeesLoading}
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) => {
                          // Safely handle the option children and convert to string
                          const childText = option?.children?.toString() || '';
                          return childText.toLowerCase().indexOf(input.toLowerCase()) >= 0;
                        }}
                      >
                        {employees.map(employee => (
                          <Select.Option key={employee.id} value={employee.id}>
                            {employee.fullName}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Spin>
            
            {/* Create New Company Modal */}
            <Modal
              title="Create New Company"
              open={isCreateCompanyModalOpen}
              onCancel={() => setIsCreateCompanyModalOpen(false)}
              footer={[
                <Button 
                  key="cancel" 
                  onClick={() => setIsCreateCompanyModalOpen(false)}
                  data-testid="company-modal-cancel-button"
                >
                  Cancel
                </Button>,
                <Button 
                  key="submit" 
                  type="primary" 
                  loading={companyFormLoading}
                  onClick={() => companyForm.submit()}
                  data-testid="company-modal-create-button"
                >
                  Create Company
                </Button>
              ]}
              maskClosable={false}
              width={540}
              style={{ top: 10, margin: 0 }}
              zIndex={2000}
              centered
              wrapClassName="custom-modal-position"
              getContainer={document.body}
              data-testid="create-company-modal"
            >
              <Spin spinning={companyFormLoading}>
                <Form
                  form={companyForm}
                  layout="vertical"
                  requiredMark={false}
                  onFinish={handleCreateCompany}
                  data-testid="company-form"
                >
                  <Divider orientation="left" style={{ marginTop: '10px' }}>Company Information</Divider>
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="name"
                        label="Company Name"
                        rules={[{ required: true, message: 'Please enter company name' }]}
                        data-testid="company-name-input-field"
                      >
                        <Input 
                          placeholder="Enter company name"
                          data-testid="company-name-input"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="industry"
                        label="Industry"
                        data-testid="company-industry-field"
                      >
                        <Select
                          placeholder="Select industry"
                          data-testid="company-industry-select"
                          showSearch
                          optionFilterProp="children"
                          filterOption={(input, option) => {
                            // Safely handle the option children and convert to string
                            const childText = option?.children?.toString() || '';
                            return childText.toLowerCase().indexOf(input.toLowerCase()) >= 0;
                          }}
                        >
                          {industryOptions.map(option => (
                            <Select.Option key={option.id} value={option.id}>
                              {option.value}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="legalForm"
                        label="Legal Form"
                        data-testid="company-legal-form-field"
                      >
                        <Select
                          placeholder="Select legal form"
                          data-testid="company-legal-form-select"
                          showSearch
                          optionFilterProp="children"
                          filterOption={(input, option) => {
                            // Safely handle the option children and convert to string
                            const childText = option?.children?.toString() || '';
                            return childText.toLowerCase().indexOf(input.toLowerCase()) >= 0;
                          }}
                        >
                          {legalFormOptions.map(option => (
                            <Select.Option key={option.id} value={option.id}>
                              {option.value}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="numberOfEmployees"
                        label="Number of Employees"
                        data-testid="company-employees-field"
                      >
                        <Select
                          placeholder="Select number of employees"
                          data-testid="company-employees-select"
                        >
                          {numberOfEmployeesOptions.map(option => (
                            <Select.Option key={option.id} value={option.id}>
                              {option.value}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="foundationDate"
                        label="Founded"
                        data-testid="company-foundation-date-field"
                      >
                        <DatePicker
                          className="gba:w-full"
                          data-testid="company-foundation-date-picker"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Divider orientation="left" style={{ marginTop: '8px' }}>Contact Information</Divider>
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="website"
                        label="Website"
                        data-testid="company-website-field"
                      >
                        <Input
                          prefix={<GlobalOutlined />}
                          placeholder="https://example.com"
                          data-testid="company-website-input"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="email"
                        label="Email"
                        data-testid="company-email-field"
                      >
                        <Input
                          prefix={<MailOutlined />}
                          placeholder="company@example.com"
                          data-testid="company-email-input"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="phone"
                        label="Phone"
                        data-testid="company-phone-field"
                      >
                        <Input
                          prefix={<PhoneOutlined />}
                          placeholder="+1 234 567 890"
                          data-testid="company-phone-input"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Divider orientation="left" style={{ marginTop: '8px' }}>Address</Divider>
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="addressLine"
                        label="Street Address"
                        data-testid="company-address-field"
                      >
                        <Input
                          placeholder="123 Main Street"
                          data-testid="company-address-input"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="postalCode"
                        label="Postal Code"
                        data-testid="company-postal-code-field"
                      >
                        <Input
                          placeholder="12345"
                          data-testid="company-postal-code-input"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="city"
                        label="City"
                        data-testid="company-city-field"
                      >
                        <Input
                          placeholder="City"
                          data-testid="company-city-input"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="country"
                        label="Country"
                        data-testid="company-country-field"
                      >
                        <Select
                          placeholder="Select country"
                          data-testid="company-country-select"
                          showSearch
                          optionFilterProp="children"
                          filterOption={(input, option) => {
                            // Safely handle the option children and convert to string
                            const childText = option?.children?.toString() || '';
                            return childText.toLowerCase().indexOf(input.toLowerCase()) >= 0;
                          }}
                        >
                          {countriesOptions.map(option => (
                            <Select.Option key={option.id} value={option.id}>
                              {option.value}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="region"
                        label="State/Province"
                        data-testid="company-region-field"
                      >
                        <Input
                          placeholder="Enter state/province"
                          data-testid="company-region-input"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Spin>
            </Modal>
            
            {/* Create New Contact Modal */}
            <Modal
              title="Create New Contact"
              open={isCreateContactModalOpen}
              onCancel={() => setIsCreateContactModalOpen(false)}
              footer={[
                <Button key="back" onClick={() => setIsCreateContactModalOpen(false)} data-testid="contact-modal-cancel-button">
                  Cancel
                </Button>,
                <Button
                  key="submit"
                  type="primary"
                  loading={contactFormLoading}
                  onClick={handleCreateContact}
                  data-testid="contact-modal-submit-button"
                >
                  Create Contact
                </Button>
              ]}
              maskClosable={false}
              width={540}
              style={{ top: 10, margin: 0 }}
              zIndex={2000}
              centered
              wrapClassName="custom-modal-position"
              getContainer={document.body}
              data-testid="create-contact-modal"
            >
              <Spin spinning={contactFormLoading}>
                <Form
                  form={contactForm}
                  layout="vertical"
                  initialValues={{
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    jobTitle: '',
                    department: '',
                    bio: ''
                  }}
                >
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="firstName"
                        label="First Name"
                        rules={[{ required: true, message: 'Please enter first name' }]}
                        data-testid="contact-first-name-field"
                      >
                        <Input prefix={<UserOutlined />} placeholder="First Name" data-testid="contact-first-name-input" />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="lastName"
                        label="Last Name"
                        rules={[{ required: true, message: 'Please enter last name' }]}
                        data-testid="contact-last-name-field"
                      >
                        <Input prefix={<UserOutlined />} placeholder="Last Name" data-testid="contact-last-name-input" />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="email"
                        label="Email"
                        rules={[{ type: 'email', message: 'Please enter a valid email' }]}
                        data-testid="contact-email-field"
                      >
                        <Input prefix={<MailOutlined />} placeholder="Email" data-testid="contact-email-input" />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="phone"
                        label="Phone"
                        data-testid="contact-phone-field"
                      >
                        <Input prefix={<PhoneOutlined />} placeholder="Phone Number" data-testid="contact-phone-input" />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="jobTitle"
                        label="Job Title"
                        data-testid="contact-job-title-field"
                      >
                        <Input placeholder="Job Title" data-testid="contact-job-title-input" />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="department"
                        label="Department"
                        data-testid="contact-department-field"
                      >
                        <Input placeholder="Department" data-testid="contact-department-input" />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="employeeId"
                        label="Contact Owner"
                        data-testid="contact-owner-field"
                      >
                        <Select
                          placeholder="Select an owner"
                          loading={employeesLoading}
                          allowClear
                          showSearch
                          optionFilterProp="children"
                          data-testid="contact-owner-select"
                        >
                          {employees.map((employee) => (
                            <Select.Option key={employee.id} value={employee.id} data-testid={`employee-option-${employee.id}`}>
                              {employee.fullName}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="accountId"
                        label="Company/Account"
                        rules={[{ required: true, message: 'Please select an account' }]}
                        data-testid="contact-account-field"
                      >
                        <Select
                          placeholder="Select an account"
                          loading={accountsLoading}
                          showSearch
                          optionFilterProp="children"
                          filterOption={(input, option) => {
                            // Safely handle the option children and convert to string
                            const childText = option?.children?.toString() || '';
                            return childText.toLowerCase().indexOf(input.toLowerCase()) >= 0;
                          }}
                          onPopupScroll={(e) => {
                            const target = e.target as HTMLDivElement;
                            // Check if we've scrolled to the bottom
                            if (target.scrollTop + target.clientHeight >= target.scrollHeight - 20) {
                              // Load more accounts when we're near the bottom
                              if (hasMoreAccounts && !accountsLoading) {
                                loadMoreAccounts();
                              }
                            }
                          }}
                          dropdownRender={menu => (
                            <>
                              {menu}
                              {hasMoreAccounts && (
                                <div 
                                  style={{ 
                                    textAlign: 'center', 
                                    padding: '8px 0',
                                    color: '#8c8c8c',
                                    fontSize: '12px'
                                  }}
                                  data-testid="accounts-loading-more-contact"
                                >
                                  {accountsLoading ? 'Loading more...' : 'Scroll for more'}
                                </div>
                              )}
                            </>
                          )}
                        >
                          {accounts.map((account) => (
                            <Select.Option key={account.id} value={account.id} data-testid={`account-option-${account.id}`}>
                              {account.name}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="bio"
                        label="Bio"
                        data-testid="contact-bio-field"
                      >
                        <Input.TextArea rows={4} placeholder="Bio information" data-testid="contact-bio-input" />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="linkedinUrl"
                        label="LinkedIn URL"
                        data-testid="contact-linkedin-field"
                      >
                        <Input placeholder="LinkedIn URL" data-testid="contact-linkedin-input" />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="xingUrl"
                        label="Xing URL"
                        data-testid="contact-xing-field"
                      >
                        <Input placeholder="Xing URL" data-testid="contact-xing-input" />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="birthDate"
                        label="Birth Date"
                        data-testid="contact-birth-date-field"
                      >
                        <DatePicker
                          style={{ width: '100%' }}
                          format="YYYY-MM-DD"
                          data-testid="contact-birth-date-picker"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Spin>
            </Modal>
          </Modal>
        </>
      )}
    </div>
  );
}

export { LeadsOverviewComponent as LeadsOverview };
export default LeadsOverviewComponent;