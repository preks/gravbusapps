import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  Button,
  Input,
  Typography,
  Spin,
  Alert,
  Tag,
  Divider,
  Descriptions,
  Card,
} from "antd";
import {
  SearchOutlined,
  IdcardOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  TeamOutlined,
  BranchesOutlined,
  EyeOutlined,
  LinkOutlined,
  RightOutlined,
  ApartmentOutlined,
  UserOutlined,
  ContactsOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import { DataDetailsDrawer } from "@/components/data-details/DataDetailsDrawer";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useJobProfiles } from "../../hooks/useJobProfiles";
import { JobProfile } from "../../types";

const { Title } = Typography;

export interface JobProfilesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const JobProfilesTab: React.FC<JobProfilesTabProps> = (context) => {
  const { t } = useTranslation();
  const { prefixDataTestId } = context;

  const {
    jobProfiles,
    totalCount,
    isLoading,
    error,
    refetch,
    searchJobProfiles,
  } = useJobProfiles(context);

  const [searchTerm, setSearchTerm] = useState("");
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<JobProfile | null>(
    null
  );

  const filteredProfiles = searchTerm
    ? searchJobProfiles(searchTerm)
    : jobProfiles;

  const handleView = (record: JobProfile) => {
    setSelectedProfile(record);
    setIsDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerVisible(false);
    setSelectedProfile(null);
  };

  // Function to render i18n data as tags
  const renderI18nData = (i18nData?: Record<string, string>) => {
    if (!i18nData || Object.keys(i18nData).length === 0) return <span>-</span>;

    return (
      <div className="gba:space-y-2">
        {Object.entries(i18nData).map(([locale, value]) => (
          <Tag key={locale} className="gba:mr-2 gba:mb-2">
            <span className="gba:font-medium">{locale}:</span> {value}
          </Tag>
        ))}
      </div>
    );
  };

  const getStatusColor = (recordState?: string) => {
    switch (recordState) {
      case "active":
        return "green";
      case "inactive":
        return "red";
      case "draft":
        return "orange";
      default:
        return "gray";
    }
  };

  const columns = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      width: 100,
      sorter: (a: JobProfile, b: JobProfile) =>
        (a.code || "").localeCompare(b.code || ""),
      render: (code: string) => code || "N/A",
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a: JobProfile, b: JobProfile) => a.name.localeCompare(b.name),
    },
    {
      title: "Job Function",
      dataIndex: ["jobFunction", "name"],
      key: "jobFunction",
      width: 150,
      render: (name: string) => name || "Not assigned",
    },
    {
      title: "Job Level",
      dataIndex: ["jobLevel", "name"],
      key: "jobLevel",
      width: 150,
      render: (name: string) => name || "Not assigned",
    },
    {
      title: "Contract Type",
      dataIndex: ["contractType", "value"],
      key: "contractType",
      width: 180,
      render: (value: string) => value || "Not assigned",
    },
    {
      title: "Employment Type",
      dataIndex: ["employmentType", "value"],
      key: "employmentType",
      width: 150,
      render: (value: string) => value || "Not assigned",
    },
    {
      title: "Status",
      dataIndex: "recordState",
      key: "recordState",
      width: 100,
      render: (recordState: string) => (
        <Tag color={getStatusColor(recordState)}>
          {recordState
            ? recordState.charAt(0).toUpperCase() + recordState.slice(1)
            : "Unknown"}
        </Tag>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (description: string) => description || "No description",
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      render: (_: any, record: JobProfile) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handleView(record)}
          size="small"
          title="View Details"
        />
      ),
    },
  ];

  if (error) {
    return (
      <div style={{ padding: "24px" }}>
        <Alert
          message="Error Loading Job Profiles"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      data-testid={`${prefixDataTestId || ""}-JobProfilesTab`}
      style={{
        background: "linear-gradient(to bottom, #f9fafb, #f3f4f6)",
        minHeight: "100%",
        padding: "24px",
        borderRadius: "8px",
      }}
    >
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <Title level={4} style={{ margin: 0, color: "#1f2937" }}>
            {t("hr.job_profiles", "Job Profiles")} ({totalCount})
          </Title>
        </div>

        <Input
          placeholder="Search job profiles..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: "300px" }}
          allowClear
          data-testid={`${prefixDataTestId || ""}-JobProfilesTab-SearchInput`}
        />
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={filteredProfiles}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} job profiles`,
          }}
          data-testid={`${prefixDataTestId || ""}-JobProfilesTab-Table`}
          style={{ background: "white", borderRadius: "8px" }}
          scroll={{ x: 1200 }} // Enable horizontal scroll for wider table
          onRow={(record) => ({
            onClick: () => handleView(record),
            className: "gba:cursor-pointer",
            "data-testid": `${prefixDataTestId || ""}-JobProfilesTab-TableRow-${
              record.id
            }`,
          })}
        />
      )}

      <DataDetailsDrawer
        title="Job Profile Details"
        icon={<IdcardOutlined />}
        open={isDrawerVisible}
        onClose={handleDrawerClose}
        width={600}
        placement="right"
        dataTestId={`${prefixDataTestId || ""}-JobProfilesTab-Drawer`}
        footer={
          <div className="gba:flex gba:justify-end">
            <Button onClick={handleDrawerClose}>Close</Button>
          </div>
        }
      >
        {selectedProfile && (
          <div className="gba:space-y-6">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex-1">
                <h3 className="gba:text-lg gba:font-semibold gba:mb-1">
                  {selectedProfile.name}
                </h3>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Tag color="blue" className="gba:px-2">
                    <FileTextOutlined /> {selectedProfile.code || "-"}
                  </Tag>
                  {selectedProfile.version !== undefined && (
                    <Tag color="purple" className="gba:px-2">
                      v{selectedProfile.version}
                    </Tag>
                  )}
                  <Tag
                    color={getStatusColor(selectedProfile.recordState)}
                    className="gba:px-2"
                  >
                    <ClockCircleOutlined />{" "}
                    {selectedProfile.recordState
                      ? selectedProfile.recordState.charAt(0).toUpperCase() +
                        selectedProfile.recordState.slice(1)
                      : "Unknown"}
                  </Tag>
                </div>
              </div>
            </div>

            <Divider className="gba:my-3" />

            <Descriptions
              title="Basic Information"
              bordered
              size="small"
              column={1}
            >
              <Descriptions.Item label="Job Profile ID">
                <span className="gba:text-gray-600 gba:font-mono gba:text-xs">
                  {selectedProfile.id}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                {selectedProfile.description || "-"}
              </Descriptions.Item>
            </Descriptions>

            {selectedProfile.nameI18n &&
              Object.keys(selectedProfile.nameI18n).length > 0 && (
                <Descriptions
                  title="Name Translations"
                  bordered
                  size="small"
                  column={1}
                >
                  <Descriptions.Item label="Translations">
                    {renderI18nData(selectedProfile.nameI18n)}
                  </Descriptions.Item>
                </Descriptions>
              )}

            {selectedProfile.descriptionI18n &&
              Object.keys(selectedProfile.descriptionI18n).length > 0 && (
                <Descriptions
                  title="Description Translations"
                  bordered
                  size="small"
                  column={1}
                >
                  <Descriptions.Item label="Translations">
                    {renderI18nData(selectedProfile.descriptionI18n)}
                  </Descriptions.Item>
                </Descriptions>
              )}

            <Descriptions
              title="Classifications"
              bordered
              size="small"
              column={1}
            >
              <Descriptions.Item label="Job Function">
                {selectedProfile.jobFunction ? (
                  <Tag
                    color="green"
                    icon={<TeamOutlined />}
                    className="gba:px-2"
                  >
                    {selectedProfile.jobFunction.name}
                    <span className="gba:text-xs gba:ml-1 gba:opacity-70">
                      ({selectedProfile.jobFunctionId})
                    </span>
                  </Tag>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Job Level">
                {selectedProfile.jobLevel ? (
                  <Tag
                    color="blue"
                    icon={<BranchesOutlined />}
                    className="gba:px-2"
                  >
                    {selectedProfile.jobLevel.name}
                    <span className="gba:text-xs gba:ml-1 gba:opacity-70">
                      ({selectedProfile.jobLevelId})
                    </span>
                  </Tag>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Contract Type">
                {selectedProfile.contractType ? (
                  <Tag color="orange" className="gba:px-2">
                    {selectedProfile.contractType.value}
                    <span className="gba:text-xs gba:ml-1 gba:opacity-70">
                      ({selectedProfile.contractTypeRef})
                    </span>
                  </Tag>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Employment Type">
                {selectedProfile.employmentType ? (
                  <Tag color="cyan" className="gba:px-2">
                    {selectedProfile.employmentType.value}
                    <span className="gba:text-xs gba:ml-1 gba:opacity-70">
                      ({selectedProfile.employmentTypeRef})
                    </span>
                  </Tag>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
            </Descriptions>

            {/* Related Navigation Links */}
            <div className="gba:mt-6">
              <Divider orientation="left">
                <span className="gba:flex gba:items-center gba:gap-2">
                  <LinkOutlined />
                  <span className="gba:text-base">Related Resources</span>
                </span>
              </Divider>

              <div className="gba:grid gba:grid-cols-1 gba:gap-4">
                {/* Job Function Navigation */}
                {selectedProfile.jobFunctionId && (
                  <Card
                    className="gba:shadow-sm gba:hover:shadow-md gba:transition-shadow"
                    size="small"
                    bodyStyle={{ padding: "12px" }}
                    data-testid={`${
                      prefixDataTestId || ""
                    }-JobProfilesTab-JobFunctionLink`}
                  >
                    <a
                      href={`/mdm/job-structure-data/job-functions/${selectedProfile.jobFunctionId}`}
                      className="gba:flex gba:items-center gba:gap-3 gba:text-green-600 gba:hover:text-green-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="gba:flex gba:justify-center gba:items-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-green-100">
                        <ApartmentOutlined className="gba:text-lg gba:text-green-600" />
                      </div>
                      <div className="gba:flex-grow">
                        <div className="gba:font-medium">
                          {selectedProfile.jobFunction?.name ||
                            "Job Function Details"}
                        </div>
                        <div className="gba:text-xs gba:text-gray-500">
                          View complete job function information, structure, and
                          related positions
                        </div>
                      </div>
                      <RightOutlined className="gba:text-gray-400" />
                    </a>
                  </Card>
                )}

                {/* Job Level Navigation */}
                {selectedProfile.jobLevelId && (
                  <Card
                    className="gba:shadow-sm gba:hover:shadow-md gba:transition-shadow"
                    size="small"
                    bodyStyle={{ padding: "12px" }}
                    data-testid={`${
                      prefixDataTestId || ""
                    }-JobProfilesTab-JobLevelLink`}
                  >
                    <a
                      href={`/mdm/job-structure-data/job-levels/${selectedProfile.jobLevelId}`}
                      className="gba:flex gba:items-center gba:gap-3 gba:text-blue-600 gba:hover:text-blue-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="gba:flex gba:justify-center gba:items-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-blue-100">
                        <BranchesOutlined className="gba:text-lg gba:text-blue-600" />
                      </div>
                      <div className="gba:flex-grow">
                        <div className="gba:font-medium">
                          {selectedProfile.jobLevel?.name ||
                            "Job Level Details"}
                        </div>
                        <div className="gba:text-xs gba:text-gray-500">
                          View job level information, requirements and
                          progression paths
                        </div>
                      </div>
                      <RightOutlined className="gba:text-gray-400" />
                    </a>
                  </Card>
                )}

                {/* Contract Type Navigation */}
                {selectedProfile.contractTypeRef && (
                  <Card
                    className="gba:shadow-sm gba:hover:shadow-md gba:transition-shadow"
                    size="small"
                    bodyStyle={{ padding: "12px" }}
                    data-testid={`${
                      prefixDataTestId || ""
                    }-JobProfilesTab-ContractTypeLink`}
                  >
                    <a
                      href={`/mdm/contract-data/contract-types/${selectedProfile.contractTypeRef}`}
                      className="gba:flex gba:items-center gba:gap-3 gba:text-orange-600 gba:hover:text-orange-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="gba:flex gba:justify-center gba:items-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-orange-100">
                        <ContactsOutlined className="gba:text-lg gba:text-orange-600" />
                      </div>
                      <div className="gba:flex-grow">
                        <div className="gba:font-medium">
                          {selectedProfile.contractType?.value ||
                            "Contract Type Details"}
                        </div>
                        <div className="gba:text-xs gba:text-gray-500">
                          View contract type specifications, terms, and
                          associated job profiles
                        </div>
                      </div>
                      <RightOutlined className="gba:text-gray-400" />
                    </a>
                  </Card>
                )}

                {/* Employment Type Navigation */}
                {selectedProfile.employmentTypeRef && (
                  <Card
                    className="gba:shadow-sm gba:hover:shadow-md gba:transition-shadow"
                    size="small"
                    bodyStyle={{ padding: "12px" }}
                    data-testid={`${
                      prefixDataTestId || ""
                    }-JobProfilesTab-EmploymentTypeLink`}
                  >
                    <a
                      href={`/mdm/employment-data/employment-types/${selectedProfile.employmentTypeRef}`}
                      className="gba:flex gba:items-center gba:gap-3 gba:text-cyan-600 gba:hover:text-cyan-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="gba:flex gba:justify-center gba:items-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-cyan-100">
                        <UserOutlined className="gba:text-lg gba:text-cyan-600" />
                      </div>
                      <div className="gba:flex-grow">
                        <div className="gba:font-medium">
                          {selectedProfile.employmentType?.value ||
                            "Employment Type Details"}
                        </div>
                        <div className="gba:text-xs gba:text-gray-500">
                          View employment type requirements, benefits, and
                          regulations
                        </div>
                      </div>
                      <RightOutlined className="gba:text-gray-400" />
                    </a>
                  </Card>
                )}

                {/* Associated Employees */}
                <Card
                  className="gba:shadow-sm gba:hover:shadow-md gba:transition-shadow"
                  size="small"
                  bodyStyle={{ padding: "12px" }}
                  data-testid={`${
                    prefixDataTestId || ""
                  }-JobProfilesTab-EmployeesLink`}
                >
                  <a
                    href={`/mdm/employee-data/employees?jobProfile=${selectedProfile.id}`}
                    className="gba:flex gba:items-center gba:gap-3 gba:text-purple-600 gba:hover:text-purple-800"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="gba:flex gba:justify-center gba:items-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-purple-100">
                      <TeamOutlined className="gba:text-lg gba:text-purple-600" />
                    </div>
                    <div className="gba:flex-grow">
                      <div className="gba:font-medium">
                        Associated Employees
                      </div>
                      <div className="gba:text-xs gba:text-gray-500">
                        View employees currently assigned to this job profile
                      </div>
                    </div>
                    <RightOutlined className="gba:text-gray-400" />
                  </a>
                </Card>

                {/* Position History */}
                <Card
                  className="gba:shadow-sm gba:hover:shadow-md gba:transition-shadow"
                  size="small"
                  bodyStyle={{ padding: "12px" }}
                  data-testid={`${
                    prefixDataTestId || ""
                  }-JobProfilesTab-HistoryLink`}
                >
                  <a
                    href={`/mdm/job-structure-data/position-history?jobProfile=${selectedProfile.id}`}
                    className="gba:flex gba:items-center gba:gap-3 gba:text-gray-600 gba:hover:text-gray-800"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="gba:flex gba:justify-center gba:items-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-gray-100">
                      <AuditOutlined className="gba:text-lg gba:text-gray-600" />
                    </div>
                    <div className="gba:flex-grow">
                      <div className="gba:font-medium">Position History</div>
                      <div className="gba:text-xs gba:text-gray-500">
                        View historical data and changes for this job profile
                      </div>
                    </div>
                    <RightOutlined className="gba:text-gray-400" />
                  </a>
                </Card>
              </div>
            </div>
          </div>
        )}
      </DataDetailsDrawer>
    </div>
  );
};

export { JobProfilesTab };
