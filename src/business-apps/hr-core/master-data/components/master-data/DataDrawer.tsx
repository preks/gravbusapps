import React, { useState } from "react";
import {
  X,
  ChevronLeft,
  Clock,
  User,
  Users,
  ArrowUpRight,
  Network,
  ArrowRight,
  Folder,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { cn } from "../../utils/cn";
import { Avatar } from "../ui/Avatar";
import { employees } from "../../data/mockData";

interface DataDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any;
  onEdit?: () => void;
  breadcrumbs?: { label: string; onClick: () => void }[];
  renderContent: (data: any) => React.ReactNode;
  lastUpdated?: {
    by: string;
    at: string;
  };
  createdInfo?: {
    by: string;
    at: string;
  };
}

export const DataDrawer: React.FC<DataDrawerProps> = ({
  isOpen,
  onClose,
  title,
  data,
  onEdit,
  breadcrumbs,
  renderContent,
  lastUpdated,
  createdInfo,
}) => {
  const [showEmployees, setShowEmployees] = useState(false);

  if (!isOpen) return null;

  // Determine if this is a master data type that can have linked entities
  const isMasterData =
    data &&
    (data.id?.startsWith("JP") || // Job Profile
      data.id?.startsWith("JF") || // Job Family
      data.id?.startsWith("JFN") || // Job Function
      data.id?.startsWith("JL") || // Job Level
      data.id?.startsWith("DEPT") || // Department
      data.id?.startsWith("TEAM") || // Team
      data.id?.startsWith("LOC") || // Location
      data.id?.startsWith("CC") || // Cost Center
      data.id?.startsWith("CAP") || // Capability
      data.id?.startsWith("PRJ")); // Project

  // Determine the master data type based on the ID prefix
  const getMasterDataType = () => {
    if (!data?.id) return null;

    if (data.id.startsWith("JP")) return "job-profile";
    if (data.id.startsWith("JF")) return "job-family";
    if (data.id.startsWith("JFN")) return "job-function";
    if (data.id.startsWith("JL")) return "job-level";
    if (data.id.startsWith("DEPT")) return "department";
    if (data.id.startsWith("TEAM")) return "team";
    if (data.id.startsWith("LOC")) return "location";
    if (data.id.startsWith("CC")) return "cost-center";
    if (data.id.startsWith("CAP")) return "capability";
    if (data.id.startsWith("PRJ")) return "project";

    return null;
  };

  // Get the count of linked entities (mock data)
  const getLinkedEntityCount = (type: string) => {
    switch (type) {
      case "job-profile":
        return data.employeesAssigned || 0;
      case "job-level":
        return 12; // Mock count
      case "job-family":
        return 8; // Mock count
      case "department":
        return data.headCount || 0;
      case "team":
        return data.memberCount || 0;
      case "location":
        return data.employeeCount || 0;
      case "cost-center":
        return data.employeeCount || 0;
      case "capability":
        return data.employeeCount || 0;
      case "project":
        return 5; // Mock count
      default:
        return 0;
    }
  };

  // Get the path for linked entities
  const getLinkedEntityPath = (type: string) => {
    if (!data?.id) return "";

    switch (type) {
      case "job-profile":
        return `/reference/job-profile/${data.id}/employees`;
      case "job-level":
        return `/reference/job-level/${data.id}/profiles`;
      case "job-family":
        return `/reference/job-family/${data.id}/profiles`;
      case "department":
        return `/reference/department/${data.id}/employees`;
      case "team":
        return `/reference/team/${data.id}/employees`;
      case "location":
        return `/reference/location/${data.id}/employees`;
      case "cost-center":
        return `/reference/cost-center/${data.id}/employees`;
      case "capability":
        return `/reference/capability/${data.id}/employees`;
      case "project":
        return `/reference/project/${data.id}/time-entries`;
      default:
        return "";
    }
  };

  // Get the label for linked entities
  const getLinkedEntityLabel = (type: string) => {
    switch (type) {
      case "job-profile":
        return "View Assigned Employees";
      case "job-level":
        return "View Job Profiles";
      case "job-family":
        return "View Job Profiles";
      case "department":
        return "View Employees";
      case "team":
        return "View Team Members";
      case "location":
        return "View Employees";
      case "cost-center":
        return "View Employees";
      case "capability":
        return "View Employees with Capability";
      case "project":
        return "View Time Entries";
      default:
        return "View Related Entities";
    }
  };

  // Get the secondary linked entity path (if applicable)
  const getSecondaryLinkedEntityPath = (type: string) => {
    if (!data?.id) return "";

    switch (type) {
      case "department":
        return `/reference/department/${data.id}/projects`;
      case "cost-center":
        return `/reference/cost-center/${data.id}/projects`;
      default:
        return "";
    }
  };

  // Get the secondary linked entity label (if applicable)
  const getSecondaryLinkedEntityLabel = (type: string) => {
    switch (type) {
      case "department":
        return "View Department Projects";
      case "cost-center":
        return "View Cost Center Projects";
      default:
        return "";
    }
  };

  // Get the secondary linked entity count (mock data)
  const getSecondaryLinkedEntityCount = (type: string) => {
    switch (type) {
      case "department":
        return 3; // Mock count
      case "cost-center":
        return 5; // Mock count
      default:
        return 0;
    }
  };

  // Get employees with the same job profile (for job profile drawer)
  const getEmployeesWithSameProfile = () => {
    if (getMasterDataType() !== "job-profile") return [];

    // In a real app, this would be a database query
    // For now, we'll mock it by assuming employees with the same position
    // are assigned to this job profile
    return employees.filter((emp) => emp.position === data.title).slice(0, 5); // Limit to 5 for display
  };

  const employeesWithSameProfile = getEmployeesWithSameProfile();

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 w-full max-w-[480px] bg-white shadow-xl z-50 flex flex-col",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full",
          "sm:border-l sm:border-neutral-200"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-white sticky top-0 z-10">
          <div className="flex items-center">
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <button
                className="mr-2 p-1 rounded-md hover:bg-neutral-100"
                onClick={breadcrumbs[breadcrumbs.length - 1].onClick}
              >
                <ChevronLeft size={18} />
              </button>
            ) : null}

            <div>
              <h3 className="text-lg font-semibold text-neutral-900 truncate max-w-[300px]">
                {title}
              </h3>

              {breadcrumbs && breadcrumbs.length > 0 && (
                <div className="flex items-center text-xs text-neutral-500 mt-1">
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && <span className="mx-1">›</span>}
                      <button
                        className="hover:text-primary-600"
                        onClick={crumb.onClick}
                      >
                        {crumb.label}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                Edit
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onClose}
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showEmployees && getMasterDataType() === "job-profile" ? (
            <>
              <div className="mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<ChevronLeft size={16} />}
                  onClick={() => setShowEmployees(false)}
                >
                  Back to Job Profile
                </Button>
              </div>
              <h3 className="text-lg font-medium mb-4">
                Employees with {data.title} Profile
              </h3>
              <div className="flex flex-col gap-3">
                {employeesWithSameProfile.length > 0 ? (
                  employeesWithSameProfile.map((employee) => (
                    <div
                      key={employee.id}
                      className="p-4 border border-neutral-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 cursor-pointer transition-colors"
                      onClick={() => window.location.href = `/employees/${employee.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar
                          src={employee.profileImage}
                          alt={`${employee.firstName} ${employee.lastName}`}
                          size="md"
                        />
                        <div>
                          <h4 className="font-medium text-neutral-900">
                            {employee.firstName} {employee.lastName}
                          </h4>
                          <p className="text-sm text-neutral-500">
                            {employee.position} • {employee.department}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-neutral-500">
                      No employees found with this job profile.
                    </p>
                  </div>
                )}

                {employeesWithSameProfile.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() =>
                      window.location.href = getLinkedEntityPath(getMasterDataType() || "")
                    }
                  >
                    View All Employees
                  </Button>
                )}
              </div>
            </>
          ) : (
            renderContent(data)
          )}

          {/* Linked Entities Section */}
          {!showEmployees && isMasterData && (
            <>
              <SectionHeader title="Linked Entities" />
              <div className="flex flex-col gap-3">
                {getMasterDataType() === "job-profile" &&
                  employeesWithSameProfile.length > 0 && (
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      leftIcon={<Users size={16} />}
                      onClick={() => setShowEmployees(true)}
                    >
                      View Employees with Same Profile
                      <Badge variant="default" className="ml-2">
                        {employeesWithSameProfile.length}
                      </Badge>
                    </Button>
                  )}

                {getLinkedEntityCount(getMasterDataType() || "") > 0 && (
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    leftIcon={<Users size={16} />}
                    rightIcon={<ArrowRight size={16} />}
                    onClick={() =>
                      window.location.href = getLinkedEntityPath(getMasterDataType() || "")
                    }
                  >
                    {getLinkedEntityLabel(getMasterDataType() || "")}
                    <Badge variant="default" className="ml-2">
                      {getLinkedEntityCount(getMasterDataType() || "")}
                    </Badge>
                  </Button>
                )}

                {getSecondaryLinkedEntityCount(getMasterDataType() || "") >
                  0 && (
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    leftIcon={<Folder size={16} />}
                    rightIcon={<ArrowRight size={16} />}
                    onClick={() =>
                      window.location.href = 
                        getSecondaryLinkedEntityPath(getMasterDataType() || "")
                    }
                  >
                    {getSecondaryLinkedEntityLabel(getMasterDataType() || "")}
                    <Badge variant="default" className="ml-2">
                      {getSecondaryLinkedEntityCount(getMasterDataType() || "")}
                    </Badge>
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full justify-between"
                  leftIcon={<ArrowUpRight size={16} />}
                >
                  Open in Master Data Table
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between"
                  leftIcon={<Network size={16} />}
                >
                  Compare with Similar Entities
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {(lastUpdated || createdInfo) && (
          <div className="p-4 border-t border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
            <div className="flex flex-col flex flex-col gap-2">
              {lastUpdated && (
                <div className="flex items-center">
                  <Clock size={12} className="mr-1" />
                  <span>
                    Last updated by {lastUpdated.by} on{" "}
                    {new Date(lastUpdated.at).toLocaleString()}
                  </span>
                </div>
              )}
              {createdInfo && (
                <div className="flex items-center">
                  <User size={12} className="mr-1" />
                  <span>
                    Created by {createdInfo.by} on{" "}
                    {new Date(createdInfo.at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Reusable label-value component for drawer content
export const LabelValue: React.FC<{
  label: string;
  value: React.ReactNode;
  className?: string;
}> = ({ label, value, className }) => {
  return (
    <div className={cn("mb-4", className)}>
      <div className="text-sm font-medium text-neutral-500 mb-1">{label}</div>
      <div className="text-sm text-neutral-900">{value}</div>
    </div>
  );
};

// Section header component
export const SectionHeader: React.FC<{
  title: string;
  className?: string;
}> = ({ title, className }) => {
  return (
    <h4
      className={cn(
        "text-sm font-semibold text-neutral-900 mb-3 mt-6",
        className
      )}
    >
      {title}
    </h4>
  );
};
