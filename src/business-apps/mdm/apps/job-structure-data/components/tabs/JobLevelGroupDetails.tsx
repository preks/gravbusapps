import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  Collapse,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Tooltip,
  Modal,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
  RightOutlined,
  UserOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useJobLevels } from "../../hooks";
import { JobLevel, JobLevelGroup } from "../../types";
import { startProcess } from "@/common/utils/start-process";
import { calculateJobLevelInGroup } from "../../utils/levelCalculations";

const { Title, Text } = Typography;
const { Panel } = Collapse;

export interface JobLevelGroupDetailsProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

// Re-export types for external usage
export type { JobLevel, JobLevelGroup } from "../../types";

const JobLevelGroupDetails: React.FC<JobLevelGroupDetailsProps> = (context) => {
  const { t } = useTranslation();
  const { prefixDataTestId, userInfo } = context;

  const { jobLevelGroups, isLoading, error, refetch } = useJobLevels(context);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [modalType, setModalType] = useState<"group" | "level">("group");
  const [editingGroup, setEditingGroup] = useState<JobLevelGroup | null>(null);
  const [editingLevel, setEditingLevel] = useState<JobLevel | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  const handleCollapseChange = (keys: string | string[]) => {
    setActiveKeys(Array.isArray(keys) ? keys : [keys]);
  };

  const handleAddGroup = () => {
    setModalType("group");
    setEditingGroup(null);
    setEditingLevel(null);
    startProcess({
      domain: "dummy-domain",
      processName: "changeJobLevelGroup",
      payload: {
        employeeId: userInfo?.employeeDetails.employeeId,
      },
      builderType: "NATIVE_SCREEN",
    });
  };

  const handleEditGroup = (group: JobLevelGroup) => {
    setModalType("group");
    setEditingGroup(group);
    setEditingLevel(null);
    startProcess({
      domain: "dummy-domain",
      processName: "changeJobLevelGroup",
      payload: {
        employeeId: userInfo?.employeeDetails.employeeId,
        jobLevelGroup: group,
      },
      builderType: "NATIVE_SCREEN",
    });
  };
  

  const handleAddLevel = (groupId: string) => {
    setModalType("level");
    setEditingGroup(null);
    setEditingLevel(null);
    setSelectedGroupId(groupId);
    startProcess({
      domain: "dummy-domain",
      processName: "changeJobLevel",
      payload: {
        employeeId: userInfo?.employeeDetails.employeeId,
        groupId: groupId,
      },
      builderType: "NATIVE_SCREEN",
    });
  };

  const handleEditLevel = (level: JobLevel, groupId: string) => {
    setModalType("level");
    setEditingGroup(null);
    setEditingLevel(level);
    setSelectedGroupId(groupId);
    startProcess({
      domain: "dummy-domain",
      processName: "changeJobLevel",
      payload: {
        employeeId: userInfo?.employeeDetails.employeeId,
        jobLevel: level,
      },
      builderType: "NATIVE_SCREEN",
    });
  };

  const handleDelete = (
    type: "group" | "level",
    item: JobLevelGroup | JobLevel
  ) => {
    const title =
      type === "group" ? "Delete Job Level Group" : "Delete Job Level";
    const content =
      type === "group"
        ? `Are you sure you want to delete "${item.name}"? This will also delete all associated job levels.`
        : `Are you sure you want to delete job level "${item.name}"?`;

    Modal.confirm({
      title,
      content,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        message.warning(
          `Delete functionality will be implemented with process API integration`
        );
        await refetch();
      },
    });
  };

  const renderJobLevelTable = (group: JobLevelGroup) => {
    const columns = [
      {
        title: "Level",
        key: "level",
        width: 80,
        sorter: (a: JobLevel, b: JobLevel) => {
          const aLevel = calculateJobLevelInGroup(a, group) ?? 999;
          const bLevel = calculateJobLevelInGroup(b, group) ?? 999;
          return aLevel - bLevel;
        },
        render: (_: any, record: JobLevel) => {
          const calculatedLevel = calculateJobLevelInGroup(record, group);
          return calculatedLevel !== undefined ? (
            <Tag color="blue" className="gba:font-mono">
              {calculatedLevel}
            </Tag>
          ) : (
            <Tag color="gray">Not assigned</Tag>
          );
        },
      },
      {
        title: "Code",
        dataIndex: "code",
        key: "code",
        width: 120,
        sorter: (a: JobLevel, b: JobLevel) =>
          (a.code || "").localeCompare(b.code || ""),
      },
      {
        title: "Name",
        dataIndex: "displayName",
        key: "displayName",
        sorter: (a: JobLevel, b: JobLevel) =>
          a.displayName.localeCompare(b.displayName),
        render: (text: string, record: JobLevel) => (
          <div>
            <div className="gba:font-semibold">{text}</div>
            {record.description && (
              <div className="gba:text-sm gba:text-gray-500 gba:mt-1">
                {record.description}
              </div>
            )}
          </div>
        ),
      },
      {
        title: "Compensation Band",
        key: "compensationBand",
        width: 180,
        render: (_: any, record: JobLevel) =>
          record.compensationBand ? (
            <Tag color="green" className="gba:px-3 gba:py-1">
              {record.compensationBand.name}
            </Tag>
          ) : (
            <Tag color="gray">Not assigned</Tag>
          ),
      },
      {
        title: "Experience Required",
        dataIndex: "experienceYears",
        key: "experienceYears",
        width: 150,
        render: (years?: number) =>
          years !== undefined ? (
            <Tooltip title={`${years} years of experience required`}>
              <Tag color="orange">{years}+ years</Tag>
            </Tooltip>
          ) : (
            <Tag color="gray">Not specified</Tag>
          ),
      },
      {
        title: "Actions",
        key: "actions",
        width: 120,
        render: (_: any, record: JobLevel) => (
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditLevel(record, group.id)}
              data-testid={`${prefixDataTestId}-edit-level-${record.id}`}
            />
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete("level", record)}
              data-testid={`${prefixDataTestId}-delete-level-${record.id}`}
            />
          </Space>
        ),
      },
    ];

    return (
      <Table
        columns={columns}
        dataSource={group.jobLevels}
        rowKey="id"
        pagination={false}
        size="small"
        className="gba:mb-4"
        locale={{
          emptyText: (
            <div className="gba:text-center gba:py-8 gba:text-gray-500">
              <UserOutlined className="gba:text-2xl gba:mb-2" />
              <div>No job levels defined for this group</div>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleAddLevel(group.id)}
                className="gba:mt-2"
              >
                Add First Level
              </Button>
            </div>
          ),
        }}
      />
    );
  };

  const renderGroupHeader = (group: JobLevelGroup) => (
    <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:pr-4">
      <div className="gba:flex gba:items-center gba:space-x-3">
        <div>
          <Title level={5} className="gba:mb-0">
            {group.name}
          </Title>
          <div className="gba:flex gba:items-center gba:space-x-4 gba:mt-1">
            <Text type="secondary" className="gba:text-sm">
              Code: {group.code}
            </Text>
            <Tag color="blue" icon={<TeamOutlined />}>
              {group.jobLevelCount} levels
            </Tag>
          </div>
        </div>
      </div>
      <Space>
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleAddLevel(group.id);
          }}
          data-testid={`${prefixDataTestId}-add-level-${group.id}`}
        >
          Add Level
        </Button>
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleEditGroup(group);
          }}
          data-testid={`${prefixDataTestId}-edit-group-${group.id}`}
        />
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleDelete("group", group);
          }}
          data-testid={`${prefixDataTestId}-delete-group-${group.id}`}
        />
      </Space>
    </div>
  );

  const renderGroupSummary = (group: JobLevelGroup) => (
    <div className="gba:bg-gray-50 gba:p-4 gba:rounded-lg gba:mb-4">
      <div>
        <Text strong>Description:</Text>
        <div className="gba:mt-1 gba:text-sm gba:text-gray-600">
          {group.description || "No description provided"}
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center">
        <Typography.Text type="danger">
          Error loading job level groups: {error}
        </Typography.Text>
        <div className="gba:mt-4">
          <Button onClick={refetch}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="gba:p-6">
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div>
          <Title level={3} className="gba:mb-2">
            Job Level Groups & Career Paths
          </Title>
          <Text type="secondary">
            Manage job levels organized by career groups and progression paths
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddGroup}
          data-testid={`${prefixDataTestId}-add-group`}
        >
          Add Job Level Group
        </Button>
      </div>

      {jobLevelGroups.length === 0 && !isLoading ? (
        <Card className="gba:text-center gba:py-12">
          <TeamOutlined className="gba:text-4xl gba:text-gray-400 gba:mb-4" />
          <Title level={4} type="secondary">
            No Job Level Groups Found
          </Title>
          <Text type="secondary">
            Create your first job level group to start organizing career paths
          </Text>
          <div className="gba:mt-4">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddGroup}
            >
              Create First Group
            </Button>
          </div>
        </Card>
      ) : (
        <Collapse
          activeKey={activeKeys}
          onChange={handleCollapseChange}
          className="gba:bg-white"
          expandIcon={({ isActive }) =>
            isActive ? <DownOutlined /> : <RightOutlined />
          }
        >
          {jobLevelGroups.map((group) => (
            <Panel
              key={group.id}
              header={renderGroupHeader(group)}
              className="gba:mb-4"
            >
              {renderGroupSummary(group)}
              {renderJobLevelTable(group)}
            </Panel>
          ))}
        </Collapse>
      )}
    </div>
  );
};

export default JobLevelGroupDetails;
