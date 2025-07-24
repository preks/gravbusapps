import React, { useState, useEffect, useMemo } from "react";
import {
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
} from "@newwork/nw-design-system";
import {
  ArrowLeftOutlined,
  UserOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { navigateTo } from "@/common/utils/navigationUtils";
import { ContactData, useGetContactById } from "./queries/ContactQueries";
import { ContactHeader } from "./components/ContactHeader";
import { CompanyInformation } from "./components/CompanyInformation";
import { ContactPersonalInfo } from "./components/ContactPersonalInfo";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { TasksSection } from "./components/TasksSection";
import { ContactDocuments } from "./components/ContactDocuments";

interface ContactRecordContentProps extends BusinessAppContextProps {
  contactId: string;
  onBack: () => void;
  fromEntity?: string | null;
}

const ContactRecordContent: React.FC<ContactRecordContentProps> = ({
  contactId,
  onBack,
  fromEntity,
  ...props
}) => {
  const [contact, setContact] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const { fetchContactById } = useGetContactById({
    accessToken: props.accessToken,
  });

  const getBackButtonText = () => {
    switch (fromEntity) {
      case "leads":
        return "Back to Leads";
      case "accounts":
        return "Back to Accounts";
      case "salesPerformance":
        return "Back to Sales Performance";
      default:
        return "Back to Contacts";
    }
  };

  useEffect(() => {
    const fetchContactData = async () => {
      if (!contactId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const contactData = await fetchContactById(contactId);

        if (contactData) {
          setContact(contactData);
        } else {
          setError("Contact not found");
        }
      } catch (err) {
        console.error("Error fetching contact:", err);
        setError(err instanceof Error ? err.message : "Failed to load contact");
      } finally {
        setLoading(false);
      }
    };

    fetchContactData();
  }, [contactId, fetchContactById]);

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-red-500 gba:text-lg">
            {error || "Contact not found"}
          </p>
          <Button onClick={onBack} className="gba:mt-4" variant="default">
            {getBackButtonText()}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="gba:contact-details-container"
      data-testid="contact-opportunity-investment-detail"
      style={{ backgroundColor: "white", padding: "16px" }}
    >
      {/* Back navigation */}
      <div className="gba:back-navigation" style={{ marginBottom: "16px" }}>
        <button
          onClick={onBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="back-button"
        >
          <ArrowLeftOutlined className="gba:mr-2" />
          <span>{getBackButtonText()}</span>
        </button>
      </div>

      {/* Contact header */}
      <ContactHeader
        contact={contact}
        contactId={contactId}
        additionalData={props}
        accessToken={props.accessToken}
      />

      {/* Main content with tabs */}
      <div
        className="gba:contact-details-content"
        data-testid="contact-details-content"
      >
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="gba:w-full"
        >
          <TabsList className="gba:bg-white gba:border gba:mb-6">
            <TabsTrigger value="overview" data-testid="overview-tab">
              <UserOutlined className="gba:mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="documents-tab">
              <FolderOpenOutlined className="gba:mr-2" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" data-testid="overview-content">
            {/* First Row: Company Information + Personal Info */}
            <div className="gba:grid gba:grid-cols-4 gba:gap-6 gba:mb-6">
              {/* Company Information - 3/4 width */}
              <div className="gba:col-span-3 gba:flex">
                <CompanyInformation contact={contact} />
              </div>

              {/* Personal Information - 1/4 width */}
              <div className="gba:col-span-1 gba:flex">
                <ContactPersonalInfo contact={contact} />
              </div>
            </div>

            {/* Second Row: Activity Timeline + Tasks */}
            <div className="gba:grid gba:grid-cols-2 gba:gap-6">
              {/* Activity Timeline - 1/2 width */}
              <div>
                <ActivityTimeline contactId={contactId} context={props} />
              </div>

              {/* Tasks - 1/2 width */}
              <div>
                <TasksSection contactId={contactId} context={props} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" data-testid="documents-content">
            <ContactDocuments contactId={contactId} context={props} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

interface ContactRecordProps extends BusinessAppContextProps {
  contactId?: string;
  source?: string;
  onBack?: () => void;
}

const ContactRecord: React.FC<ContactRecordProps> = (props) => {
  const contactId = useMemo(() => {
    return (
      props.contactId ||
      new URLSearchParams(window.location.search).get("contactId")
    );
  }, [props.contactId]);

  const source = useMemo(() => {
    return (
      props.source || new URLSearchParams(window.location.search).get("source")
    );
  }, [props.source]);

  const fromEntity = useMemo(() => {
    return new URLSearchParams(window.location.search).get("fromEntity");
  }, []);

  const handleBack = () => {
    if (props.onBack) {
      props.onBack();
    } else {
      // Navigate back based on fromEntity first, then source
      switch (fromEntity) {
        case "salesPerformance":
          // Check if there's an employee ID to navigate back to specific employee performance
          const employeeId = new URLSearchParams(window.location.search).get(
            "employeeId"
          );
          const salesPerformanceUrl = employeeId
            ? `/platform/crm/sales-performance?employeeId=${employeeId}`
            : "/platform/crm/sales-performance";
          navigateTo(salesPerformanceUrl);
          break;
        default:
          // Default back navigation based on source
          switch (source) {
            case "investments":
              navigateTo("/platform/irm/investment-relations?view=contacts");
              break;
            case "customer-relations":
            default:
              navigateTo("/platform/crm/customer-relations?view=contacts");
              break;
          }
          break;
      }
    }
  };

  if (!contactId) {
    return (
      <div data-testid="contact-record-no-id">
        <p>No contact ID provided</p>
      </div>
    );
  }

  return (
    <ContactRecordContent
      {...props}
      contactId={contactId}
      onBack={handleBack}
      fromEntity={fromEntity}
    />
  );
};

export { ContactRecord, ContactRecordContent };

export default ContactRecord;
