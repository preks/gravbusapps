import React, { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  Button,
  Space,
  Typography,
  message,
  Modal,
  Select,
  Tag,
  Input,
  Spin,
  Alert,
  Tooltip,
  Descriptions,
  Divider,
  Progress,
  Card,
  Statistic,
  Pagination,
} from "antd";
import { DataDetailsDrawer } from "@/components/data-details/DataDetailsDrawer";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ProjectOutlined,
  CalendarOutlined,
  FilterOutlined,
  ReloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  TeamOutlined,
  BuildOutlined,
  LinkOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useDebounce } from "@/common/hooks/useDebounce";
import { useProjects } from "../../hooks";
import { Project } from "../../types";
import { startProcess } from "@/common/utils/start-process";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export interface ProjectsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const ProjectsTab: React.FC<ProjectsTabProps> = ({
  prefixDataTestId,
  ...context
}) => {
  const { t } = useTranslation();
  const { userInfo } = context;

  // Data integration
  const {
    projects,
    isLoading,
    error,
    refetch,
    totalProjects,
    internalProjects,
    externalProjects,
    activeProjects,
    expiredProjects,
    expiringProjects,
    filterProjects,
    totalCount,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
  } = useProjects(context);

  // Local state
  const [searchInput, setSearchInput] = useState("");
  const [selectedProjectType, setSelectedProjectType] = useState<
    "ALL" | "INTERNAL" | "EXTERNAL"
  >("ALL");
  const [selectedStatus, setSelectedStatus] = useState<
    "ALL" | "Active" | "Expired" | "Expiring Soon"
  >("ALL");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Debounce search input
  const debouncedSearchTerm = useDebounce(searchInput, 300);

  // Filter projects based on search and filters
  const filteredProjects = useMemo(() => {
    // With server-side pagination, we only filter the current page results
    // The full filtered count will be handled by the API
    return filterProjects(
      debouncedSearchTerm,
      selectedProjectType,
      selectedStatus
    );
  }, [
    filterProjects,
    debouncedSearchTerm,
    selectedProjectType,
    selectedStatus,
  ]);

  // Handle pagination changes
  const handlePageChange = useCallback(
    (page: number, pageSize?: number) => {
      setCurrentPage(page);
      if (pageSize) {
        setPageSize(pageSize);
      }
    },
    [setCurrentPage, setPageSize]
  );

  const handlePageSizeChange = useCallback(
    (current: number, size: number) => {
      setPageSize(size);
      setCurrentPage(1); // Reset to first page when changing page size
    },
    [setPageSize, setCurrentPage]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchInput(e.target.value);
    },
    []
  );

  const handleAdd = () => {
    setEditingProject(null);
    startProcess({
      domain: "dummy-domain",
      processName: "changeProject",
      payload: {
        employeeId: userInfo?.employeeDetails.employeeId,
      },
      builderType: "NATIVE_SCREEN",
    });
  };

  const handleEdit = (record: Project) => {
    setEditingProject(record);
    // No process started for regular edit from table
  };
  
  const handleDrawerEdit = (record: Project) => {
    // When editing from drawer button, start the process
    setEditingProject(record);
    startProcess({
      domain: "dummy-domain",
      processName: "changeProject",
      payload: {
        employeeId: userInfo?.employeeDetails.employeeId,
        project: record,
      },
      builderType: "NATIVE_SCREEN",
    });
  };

  const handleDelete = async (record: Project) => {
    Modal.confirm({
      title: "Delete Project",
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          // TODO: Implement delete API call when process API is available
          message.success(
            "Project deletion requested - this will be implemented with process API"
          );
        } catch (error) {
          console.error("Error deleting project:", error);
          message.error("Failed to delete project");
        }
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "green";
      case "Expired":
        return "red";
      case "Expiring Soon":
        return "orange";
      default:
        return "default";
    }
  };

  const getProjectTypeColor = (type: string) => {
    return type === "INTERNAL" ? "blue" : "purple";
  };

  const columns = [
    {
      title: "Project Name",
      dataIndex: "name",
      key: "name",
      sorter: (a: Project, b: Project) => a.name.localeCompare(b.name),
      render: (name: string, record: Project) => (
        <div style={{ display: "flex", alignItems: "center" }}>
          <ProjectOutlined style={{ marginRight: "8px", color: "#1890ff" }} />
          <div>
            <div style={{ fontWeight: "bold" }}>{name}</div>
            {record.description && (
              <div
                style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}
              >
                {record.description.length > 50
                  ? `${record.description.substring(0, 50)}...`
                  : record.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "projectType",
      key: "projectType",
      width: 100,
      filters: [
        { text: "Internal", value: "INTERNAL" },
        { text: "External", value: "EXTERNAL" },
      ],
      onFilter: (value: any, record: Project) => record.projectType === value,
      render: (type: string) => (
        <Tag color={getProjectTypeColor(type)}>{type}</Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      filters: [
        { text: "Active", value: "Active" },
        { text: "Expiring Soon", value: "Expiring Soon" },
        { text: "Expired", value: "Expired" },
      ],
      onFilter: (value: any, record: Project) => record.status === value,
      render: (status: string, record: Project) => (
        <div>
          <Tag color={getStatusColor(status)}>{status}</Tag>
          {record.daysUntilExpiry !== undefined && (
            <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
              {record.daysUntilExpiry > 0
                ? `${record.daysUntilExpiry} days left`
                : `${Math.abs(record.daysUntilExpiry)} days ago`}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Valid Until",
      dataIndex: "formattedValidTo",
      key: "validTo",
      width: 120,
      sorter: (a: Project, b: Project) => {
        if (!a.validTo && !b.validTo) return 0;
        if (!a.validTo) return 1;
        if (!b.validTo) return -1;
        return new Date(a.validTo).getTime() - new Date(b.validTo).getTime();
      },
      render: (formattedDate: string, record: Project) => (
        <div style={{ display: "flex", alignItems: "center" }}>
          {formattedDate ? (
            <>
              <CalendarOutlined style={{ marginRight: "4px", color: "#666" }} />
              <span>{formattedDate}</span>
            </>
          ) : (
            <span style={{ color: "#999", fontStyle: "italic" }}>
              No expiry
            </span>
          )}
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: any, record: Project) => (
        <Space size="small">
          <Tooltip title="Edit Project">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Delete Project">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              size="small"
              danger
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div
        data-testid={`${prefixDataTestId || ""}-ProjectsTab`}
        style={{
          background: "linear-gradient(to bottom, #f9fafb, #f3f4f6)",
          minHeight: "100%",
          padding: "24px",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid={`${prefixDataTestId || ""}-ProjectsTab`}
        style={{
          background: "linear-gradient(to bottom, #f9fafb, #f3f4f6)",
          minHeight: "100%",
          padding: "24px",
          borderRadius: "8px",
        }}
      >
        <Alert
          message="Error Loading Projects"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => refetch()}>
              <ReloadOutlined /> Retry
            </Button>
          }
        />
      </div>
    );
  }
  console.log("selectedProject", selectedProject);
  return (
    <div
      data-testid={`${prefixDataTestId || ""}-ProjectsTab`}
      style={{
        background: "linear-gradient(to bottom, #f9fafb, #f3f4f6)",
        minHeight: "100%",
        padding: "24px",
        borderRadius: "8px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Title level={4} style={{ margin: 0, color: "#1f2937" }}>
              {t("hr.project_management", "Project Management")}
            </Title>
            <Tag color="blue">{totalProjects} total</Tag>
            <Tag color="green">{activeProjects} active</Tag>
            <Tag color="orange">{expiringProjects} expiring</Tag>
            <Tag color="red">{expiredProjects} expired</Tag>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${prefixDataTestId || ""}-ProjectsTab-AddButton`}
          >
            Add Project
          </Button>
        </div>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Input
            placeholder="Search projects..."
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={handleSearchChange}
            style={{ width: "300px" }}
            allowClear
            data-testid={`${prefixDataTestId || ""}-ProjectsTab-SearchInput`}
          />

          <Select
            value={selectedProjectType}
            onChange={setSelectedProjectType}
            style={{ width: "140px" }}
            placeholder="Project Type"
            suffixIcon={<FilterOutlined />}
          >
            <Option value="ALL">All Types</Option>
            <Option value="INTERNAL">Internal ({internalProjects})</Option>
            <Option value="EXTERNAL">External ({externalProjects})</Option>
          </Select>

          <Select
            value={selectedStatus}
            onChange={setSelectedStatus}
            style={{ width: "160px" }}
            placeholder="Status"
            suffixIcon={<FilterOutlined />}
          >
            <Option value="ALL">All Status</Option>
            <Option value="Active">Active ({activeProjects})</Option>
            <Option value="Expiring Soon">
              Expiring Soon ({expiringProjects})
            </Option>
            <Option value="Expired">Expired ({expiredProjects})</Option>
          </Select>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            title="Refresh data"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredProjects}
        rowKey="id"
        bordered
        size="middle"
        scroll={{ x: "max-content" }}
        loading={isLoading}
        pagination={false} // Disable default pagination as we're using custom component
        onRow={(record) => ({
          onClick: () => {
            setSelectedProject(record);
            setDrawerVisible(true);
          },
        })}
      />

      {/* Pagination control */}
      <div className="gba:flex gba:justify-between gba:mt-4 gba:items-center">
        <div className="gba:text-sm gba:text-gray-500">
          Showing {projects.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}{" "}
          to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
          entries
        </div>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={totalCount}
          onChange={handlePageChange}
          onShowSizeChange={handlePageSizeChange}
          showSizeChanger
          showTotal={(total) => `Total ${total} items`}
          pageSizeOptions={["10", "20", "50", "100"]}
          data-testid={`${prefixDataTestId || ""}-ProjectsTab-Pagination`}
        />
      </div>

      {/* Project Details Drawer */}
      <DataDetailsDrawer
        title={selectedProject?.name || "Project Details"}
        icon={<ProjectOutlined className="gba:text-blue-500" />}
        width={450}
        placement="right"
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedProject(null);
        }}
        dataTestId={`${prefixDataTestId || ""}-projects-details-drawer`}
        navigationLinks={
          selectedProject
            ? [
                {
                  label: "View Tasks & Milestones",
                  url: `/project-management/tasks?projectId=${selectedProject.id}`,
                  icon: <CheckCircleOutlined />,
                  color: "blue",
                  description: "Track project tasks and upcoming milestones",
                  dataTestId: `${prefixDataTestId || ""}-project-tasks-link`,
                },
                {
                  label: "View Team Members",
                  url: `/project-management/teams?projectId=${selectedProject.id}`,
                  icon: <TeamOutlined />,
                  color: "green",
                  description:
                    "See all team members and roles assigned to this project",
                  dataTestId: `${prefixDataTestId || ""}-project-teams-link`,
                },
                {
                  label: "View Customer Details",
                  url: selectedProject.customerId
                    ? `/customer-management/customers/${selectedProject.customerId}`
                    : "#",
                  icon: <IdcardOutlined />,
                  color: "purple",
                  description:
                    "View details about the customer for this project",
                  dataTestId: `${prefixDataTestId || ""}-project-customer-link`,
                },
                {
                  label: "View Project Reports",
                  url: `/project-management/reports?projectId=${selectedProject.id}`,
                  icon: <FileTextOutlined />,
                  color: "cyan",
                  description: "Access project reports and analytics",
                  dataTestId: `${prefixDataTestId || ""}-project-reports-link`,
                },
              ]
            : undefined
        }
      >
        {selectedProject && (
          <div className="gba:space-y-6">
            {/* Summary Section */}
            <div className="gba:bg-gray-50 gba:p-4 gba:rounded-lg">
              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                <Card bordered={false} className="gba:shadow-sm">
                  <Statistic
                    title="Project Type"
                    value={selectedProject.projectType}
                    valueStyle={{
                      color:
                        selectedProject.projectType === "INTERNAL"
                          ? "#1890ff"
                          : "#722ed1",
                    }}
                    prefix={<BuildOutlined />}
                  />
                </Card>

                <Card bordered={false} className="gba:shadow-sm">
                  <Statistic
                    title="Status"
                    value={selectedProject.status}
                    valueStyle={{
                      color:
                        selectedProject.status === "Active"
                          ? "#52c41a"
                          : selectedProject.status === "Expired"
                          ? "#f5222d"
                          : "#fa8c16",
                    }}
                    prefix={
                      selectedProject.status === "Active" ? (
                        <CheckCircleOutlined />
                      ) : selectedProject.status === "Expired" ? (
                        <WarningOutlined />
                      ) : (
                        <ClockCircleOutlined />
                      )
                    }
                  />
                </Card>
              </div>

              {selectedProject.daysUntilExpiry !== undefined && (
                <div className="gba:mt-4">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <Text className="gba:font-medium">Time Remaining</Text>
                    <Text
                      type={selectedProject.isActive ? undefined : "danger"}
                      strong
                    >
                      {selectedProject.daysUntilExpiry > 0
                        ? `${selectedProject.daysUntilExpiry} days remaining`
                        : `Expired ${Math.abs(
                            selectedProject.daysUntilExpiry
                          )} days ago`}
                    </Text>
                  </div>
                  <Progress
                    percent={
                      selectedProject.daysUntilExpiry <= 0
                        ? 100
                        : selectedProject.daysUntilExpiry > 90
                        ? 25
                        : selectedProject.daysUntilExpiry > 30
                        ? 50
                        : selectedProject.daysUntilExpiry > 7
                        ? 75
                        : 90
                    }
                    status={selectedProject.isActive ? "active" : "exception"}
                    showInfo={false}
                    className="gba:mt-2"
                  />
                </div>
              )}
            </div>

            {/* Primary Details */}
            <div>
              <Divider orientation="left" className="gba:text-gray-500">
                <InfoCircleOutlined /> Project Information
              </Divider>

              <Descriptions
                bordered
                column={1}
                size="small"
                className="gba:bg-white gba:rounded-md gba:shadow-sm"
              >
                <Descriptions.Item
                  label={
                    <Text strong className="gba:text-gray-600">
                      Project ID
                    </Text>
                  }
                  className="gba:py-3 gba:px-4"
                >
                  <Text copyable className="gba:text-sm gba:font-mono">
                    {selectedProject.id}
                  </Text>
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <Text strong className="gba:text-gray-600">
                      Structure ID
                    </Text>
                  }
                  className="gba:py-3 gba:px-4"
                >
                  <Text copyable className="gba:text-sm gba:font-mono">
                    {selectedProject.structureId || "-"}
                  </Text>
                </Descriptions.Item>

                {selectedProject.customerId && (
                  <Descriptions.Item
                    label={
                      <Text strong className="gba:text-gray-600">
                        Customer ID
                      </Text>
                    }
                    className="gba:py-3 gba:px-4"
                  >
                    <Text copyable className="gba:text-sm gba:font-mono">
                      {selectedProject.customerId}
                    </Text>
                  </Descriptions.Item>
                )}

                {selectedProject.validTo && (
                  <Descriptions.Item
                    label={
                      <Text strong className="gba:text-gray-600">
                        Valid Until
                      </Text>
                    }
                    className="gba:py-3 gba:px-4"
                  >
                    <Space>
                      <CalendarOutlined className="gba:text-blue-500" />
                      <Text>
                        {selectedProject.formattedValidTo ||
                          new Date(
                            selectedProject.validTo
                          ).toLocaleDateString()}
                      </Text>
                    </Space>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>

            {/* Description Section */}
            {selectedProject.description && (
              <div className="gba:bg-white gba:p-4 gba:rounded-lg gba:border gba:border-gray-200">
                <div className="gba:mb-2 gba:flex gba:items-center">
                  <FileTextOutlined className="gba:mr-2 gba:text-blue-500" />
                  <Text strong>Description</Text>
                </div>
                <Paragraph className="gba:text-gray-600 gba:whitespace-pre-line">
                  {selectedProject.description}
                </Paragraph>
              </div>
            )}

            {/* Actions */}
            <div className="gba:flex gba:justify-between gba:mt-6">
              <Button
                type="default"
                icon={<EditOutlined />}
                onClick={() => {
                  setDrawerVisible(false);
                  handleDrawerEdit(selectedProject);
                }}
              >
                Edit Project
              </Button>

              <Button
                type="primary"
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  setDrawerVisible(false);
                  handleDelete(selectedProject);
                }}
              >
                Delete Project
              </Button>
            </div>

            {/* Related Information would go here */}
            <Alert
              message="Integration Information"
              description="Additional related resources like teams, employees, and resources will be available when API integration is complete."
              type="info"
              showIcon
              icon={<LinkOutlined />}
            />
          </div>
        )}
      </DataDetailsDrawer>
    </div>
  );
};

export default ProjectsTab;
