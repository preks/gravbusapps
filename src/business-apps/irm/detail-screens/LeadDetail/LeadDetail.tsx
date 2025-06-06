import type { ReactNode } from "react";
import React, { useState } from "react";
import {
  Avatar,
  Tabs,
  Typography,
  Input,
  Card,
  Row,
  Col,
  Button,
  Divider,
  Space,
} from "antd";
import {
  EditOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  FilterOutlined,
  SearchOutlined,
  PlusOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { LeadRating } from "./types";
import type {
  LeadDetailLabels,
  LeadStatus,
  LeadTask,
  TimelineActivity,
} from "./types";
import { mockDataProps } from "./mockData";
import { BusinessAppContextProps } from "../../../../common/BusinessAppContext";

const { Title, Text } = Typography;

export interface LeadDetailProps {
  /**
   * Lead information
   */
  lead: {
    id: string;
    name: string;
    email: string;
    phone: string;
    company: string;
    position: string;
    source: string;
    rating: LeadRating;
    owner: string;
    creationDate: string;
    avatarUrl?: string;
  };
  /**
   * Status history for the lead
   */
  statusHistory: LeadStatus[];
  /**
   * Timeline activities for the lead
   */
  activities: TimelineActivity[];
  /**
   * Tasks and reminders for the lead
   */
  tasks: LeadTask[];
  /**
   * Optional custom content for the Company tab
   */
  companyContent?: ReactNode;
  /**
   * Optional custom content for the Documents tab
   */
  documentsContent?: ReactNode;
  /**
   * Custom labels for the component
   */
  labels?: LeadDetailLabels;
}

export const LeadDetail: React.FC<LeadDetailProps & BusinessAppContextProps> = ({
  lead = mockDataProps.lead,
  statusHistory = mockDataProps.statusHistory,
  activities = mockDataProps.activities,
  tasks = mockDataProps.tasks,
  companyContent = mockDataProps.companyContent,
  documentsContent = mockDataProps.documentsContent,
  labels = mockDataProps.labels,
}) => {
  const [activeTaskTab, setActiveTaskTab] = useState("active");
  const [activeMainTab, setActiveMainTab] = useState("overview");

  // Default labels
  const defaultLabels: LeadDetailLabels = {
    // Lead information fields
    nameLabel: "Name",
    emailLabel: "E-Mail",
    phoneLabel: "Phone",
    companyLabel: "Company",
    positionLabel: "Position",
    sourceLabel: "Source",
    ratingLabel: "Rating",
    ownerLabel: "Owner",
    creationDateLabel: "Creation Date",

    // Tab labels
    overviewTabLabel: "Overview",
    companyTabLabel: "Company",
    documentsTabLabel: "Documents",

    // Activity timeline labels
    activityTimelineTitle: "Activity Timeline",
    activityInputPlaceholder: "Type here...",
    activityDateText: "January 2025",
    activityUserInfo: "Bob Smith (Sales+ Web)",

    // Status labels
    statusCheckLabel: "Completed",

    // Activity type labels
    emailTypeLabel: "E-Mail",
    noteTypeLabel: "Note",
    callTypeLabel: "Call",
    ratingTypeLabel: "Rating",
    positionTypeLabel: "Position",
    notePrefix: "Note:",

    // Tasks and reminders labels
    tasksAndRemindersTitle: "Tasks & Reminders",
    activeTabLabel: "Active",
    completedTabLabel: "Completed",
    taskPrefix: "Task:",
    reminderPrefix: "Reminder:",
    reporterLabel: "Reporter:",
    priorityLabel: "Priority:",
    dueDateLabel: "Due Date:",
    taskNotePrefix: "Note:",

    // Empty state messages
    noCompanyInfoMessage: "No company information available",
    noDocumentsMessage: "No documents available",
  };

  // Merge default labels with provided labels
  const mergedLabels = { ...defaultLabels, ...labels };

  // Filter active tasks and completed tasks
  const activeTasks = tasks.filter(
    (task) => task.dueDate >= new Date().toISOString().split("T")[0]!
  );
  const completedTasks = tasks.filter(
    (task) => task.dueDate < new Date().toISOString().split("T")[0]!
  );

  // Render lead rating with appropriate color
  const renderRating = (rating: LeadRating) => {
    let color = "";
    switch (rating) {
      case LeadRating.COLD:
        color = "#1890ff";
        break;
      case LeadRating.WARM:
        color = "#fa541c";
        break;
      case LeadRating.HOT:
        color = "#f5222d";
        break;
      default:
        color = "#d9d9d9";
    }
    return (
      <Text className="gba:lead-rating" style={{ color }}>
        {rating}
      </Text>
    );
  };

  // Render status history
  const renderStatusHistory = () => (
    <div className="gba:p-0 gba:w-full gba:overflow-x-auto gba:mb-4">
      <Row
        wrap={false}
        className="gba:flex gba:items-center gba:w-full gba:overflow-x-auto gba:overflow-y-hidden"
      >
        {statusHistory.map((status, index) => (
          <React.Fragment key={status.id}>
            <Col className="gba:p-0 gba:m-0" key={`status-col-${status.id}`}>
              <div
                className={`gba:py-2 gba:px-6 gba:bg-black gba:relative gba:text-white gba:text-center gba:font-medium gba:min-w-[100px] gba:flex gba:items-center gba:justify-center gba:h-10 ${
                  status.id === 1 ? "rounded-l-lg" : ""
                } ${status.id === statusHistory.length ? "rounded-r-lg" : ""}`}
              >
                {status.name}
                {status.id === statusHistory.length && (
                  <CheckOutlined className="gba:ml-2 gba:text-white" />
                )}
              </div>
            </Col>
            {index < statusHistory.length - 1 && (
              <Col className="gba:p-0 gba:flex gba:items-center gba:justify-center gba:m-0 gba:z-[1]" key={`arrow-col-${status.id}`}>
                <ArrowRightOutlined className="gba:text-black gba:text-base" />
              </Col>
            )}
          </React.Fragment>
        ))}
      </Row>
    </div>
  );

  // Render activity timeline
  const renderActivityTimeline = () => {
    // Group activities by month/year
    const groupedActivities: { [key: string]: TimelineActivity[] } =
      activities.reduce((acc, activity) => {
        const date = activity.date.split(",")[0]!; // Get only the date part
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(activity);
        return acc;
      }, {} as { [key: string]: TimelineActivity[] });

    return (
      <div className="gba:p-4 gba:bg-white gba:rounded-lg gba:border gba:border-[#f0f0f0]">
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-4 gba:border-b gba:border-[#f0f0f0] gba:pb-2">
          <Title level={5}>{mergedLabels.activityTimelineTitle}</Title>
          <Space className="gba:flex gba:gap-2">
            <Button type="text" size="small" icon={<FilterOutlined />} />
            <Button type="text" size="small" icon={<SearchOutlined />} />
          </Space>
        </div>

        <div className="gba:relative gba:mb-6 gba:border gba:border-[#d9d9d9] gba:rounded-md gba:flex gba:items-center">
          <Input
            placeholder={mergedLabels.activityInputPlaceholder}
            className="gba:border-none gba:shadow-none gba:grow"
          />
          <div className="gba:flex gba:gap-1 gba:pr-2">
            <Button type="text" icon={<PlusOutlined />} />
            <Button type="text" icon={<SendOutlined />} />
          </div>
        </div>

        <div className="gba:p-0 gba:px-4 gba:max-h-[500px] gba:overflow-y-auto gba:relative">
          {Object.entries(groupedActivities).map(
            ([date, dateActivities], dateIndex) => (
              <React.Fragment key={date}>
                {dateIndex === 0 && (
                  <div className="gba:flex gba:items-center gba:mb-4 gba:relative">
                    <div className="gba:w-4 gba:h-4 gba:rounded-full gba:bg-[#f0f0f0] gba:mr-2 gba:z-[1]" />
                    <Text className="gba:font-medium gba:mr-2">
                      {mergedLabels.activityDateText}
                    </Text>
                    <div className="gba:grow gba:h-px gba:bg-[#f0f0f0]" />
                  </div>
                )}

                {dateActivities.map((activity) => {
                  let iconColor = "";
                  switch (activity.type) {
                    case "note":
                      iconColor = "#faad14";
                      break;
                    case "call":
                      iconColor = "#52c41a";
                      break;
                    case "email":
                      iconColor = "#1890ff";
                      break;
                    case "rating":
                    case "position":
                      iconColor = "#d9d9d9";
                      break;
                    default:
                      iconColor = "#d9d9d9";
                  }

                  return (
                    <div
                      className="gba:flex gba:relative gba:mb-6 timeline-item"
                      key={activity.id}
                    >
                      <div className="gba:mr-4 gba:relative gba:z-[1]">
                        <div
                          className="gba:w-4 gba:h-4 gba:rounded-full gba:flex gba:items-center gba:justify-center"
                          style={{ backgroundColor: iconColor }}
                        />
                      </div>
                      <div className="gba:grow">
                        <div className="gba:mb-2">
                          <Text strong className="gba:font-medium gba:text-base">
                            {activity.type === "email"
                              ? mergedLabels.emailTypeLabel
                              : activity.type === "note"
                              ? mergedLabels.noteTypeLabel
                              : activity.type === "call"
                              ? mergedLabels.callTypeLabel
                              : activity.type === "rating"
                              ? mergedLabels.ratingTypeLabel
                              : activity.type === "position"
                              ? mergedLabels.positionTypeLabel
                              : (activity.type as any).charAt(0).toUpperCase() +
                                (activity.type as any).slice(1)}
                          </Text>
                        </div>
                        <div className="gba:mb-2">
                          <Text>
                            <span>{activity.content}</span>
                          </Text>
                        </div>
                        <div className="gba:text-xs gba:text-[#8c8c8c] gba:mb-2">
                          <Text type="secondary">
                            {activity.date}, {activity.time},{" "}
                            {mergedLabels.activityUserInfo ||
                              "Bob Smith (Sales+ Web)"}
                          </Text>
                        </div>
                        {activity.note && activity.type === "call" && (
                          <div className="gba:mt-2 gba:p-2 gba:bg-[#f5f5f5] gba:rounded">
                            <Text type="secondary">
                              {mergedLabels.notePrefix} {activity.note}
                            </Text>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            )
          )}
        </div>
      </div>
    );
  };

  // Render tasks and reminders
  const renderTasksAndReminders = () => {
    const taskItems = [
      {
        label: mergedLabels.activeTabLabel,
        key: "active",
        children: activeTasks.length > 0 ? (
          <div>
            {activeTasks.map((task) => renderTaskCard(task))}
          </div>
        ) : (
          <Text>No active tasks.</Text>
        ),
      },
      {
        label: mergedLabels.completedTabLabel,
        key: "completed",
        children: completedTasks.length > 0 ? (
          <div>
            {completedTasks.map((task) => renderTaskCard(task))}
          </div>
        ) : (
          <Text>No completed tasks.</Text>
        ),
      },
    ];

    return (
      <div className="gba:p-4 gba:bg-white gba:rounded-lg gba:border gba:border-[#f0f0f0]">
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-4 gba:border-b gba:border-[#e8e8e8] gba:pb-2">
          <Title level={5}>{mergedLabels.tasksAndRemindersTitle}</Title>
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            className="gba:text-[#1677ff]"
          />
        </div>
        <Tabs
          activeKey={activeTaskTab}
          onChange={setActiveTaskTab}
          className="gba:mt-4"
          items={taskItems}
        />
      </div>
    );
  };

  // Render individual task card
  const renderTaskCard = (task: LeadTask) => {
    // Task icon based on type
    const TaskIcon = () => {
      // Using SVG data URLs directly in the background image for the icons
      const taskIconUrl =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24'%3E%3Cpath fill='none' d='M0 0h24v24H0z'/%3E%3Cpath d='M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1 2v14h14V5H5z' fill='%23ffffff'/%3E%3C/svg%3E";
      const reminderIconUrl =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24'%3E%3Cpath fill='none' d='M0 0h24v24H0z'/%3E%3Cpath d='M12 22a9 9 0 1 1 0-18 9 9 0 0 1 0 18zm0-2a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm1-7h3v2h-5V8h2v5z' fill='%23ffffff'/%3E%3C/svg%3E";

      if (task.type === "task") {
        return (
          <div
            className="gba:w-5 gba:h-5 gba:rounded-sm gba:bg-[#1677ff] gba:bg-[length:14px] gba:bg-center gba:bg-no-repeat gba:shrink-0 gba:mt-0.5"
            style={{ backgroundImage: `url("${taskIconUrl}")` }}
          />
        );
      } else {
        return (
          <div
            className="gba:w-5 gba:h-5 gba:rounded-sm gba:bg-[#faad14] gba:bg-[length:14px] gba:bg-center gba:bg-no-repeat gba:shrink-0 gba:mt-0.5"
            style={{ backgroundImage: `url("${reminderIconUrl}")` }}
          />
        );
      }
    };

    return (
      <div
        key={task.id}
        className="gba:w-full gba:mb-4 gba:bg-[#f0f7ff]! gba:rounded-2xl gba:p-4 gba:shadow-sm"
      >
        <div className="gba:flex gba:justify-between gba:items-start gba:mb-3">
          <div className="gba:flex gba:items-start gba:gap-3">
            <TaskIcon />
            <Text strong className="gba:text-[#262626] gba:text-base">
              {task.type === "task"
                ? mergedLabels.taskPrefix
                : mergedLabels.reminderPrefix}{" "}
              {task.title}
            </Text>
          </div>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            className="gba:text-[#8c8c8c] gba:mt-[-6px] gba:mr-[-6px] gba:hover:text-[#1677ff] gba:hover:bg-[rgba(0,0,0,0.05)]"
          />
        </div>
        <div className="gba:mt-3">
          <div className="gba:flex gba:mb-1.5 gba:items-baseline">
            <Text
              type="secondary"
              className="gba:w-20 gba:text-[#8c8c8c] gba:shrink-0"
            >
              {mergedLabels.reporterLabel}
            </Text>
            <Text className="gba:text-[#262626]">{task.reporter}</Text>
          </div>
          <div className="gba:flex gba:mb-1.5 gba:items-baseline">
            <Text
              type="secondary"
              className="gba:w-20 gba:text-[#8c8c8c] gba:shrink-0"
            >
              {mergedLabels.priorityLabel}
            </Text>
            <Text className="gba:text-[#262626]">{task.priority}</Text>
          </div>
          <div className="gba:flex gba:mb-1.5 gba:items-baseline">
            <Text
              type="secondary"
              className="gba:w-20 gba:text-[#8c8c8c] gba:shrink-0"
            >
              {mergedLabels.dueDateLabel}
            </Text>
            <Text className="gba:text-[#262626]">{task.dueDate}</Text>
          </div>
          {task.note && (
            <div className="gba:mt-3 gba:p-3 gba:bg-[rgba(0,0,0,0.06)] gba:rounded-md gba:text-sm gba:text-[#262626]">
              <Text type="secondary">
                <strong>{mergedLabels.taskNotePrefix}</strong> {task.note}
              </Text>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Row gutter={24}>
      {/* Left sidebar */}
      <Col span={6}>
        <Card
          className="gba:rounded-xl gba:overflow-hidden gba:h-full gba:bg-[#f0f7ff]! gba:shadow-none"
          variant="borderless"
        >
          <div className="gba:relative gba:flex gba:flex-col gba:pt-5 gba:px-5 gba:pb-3">
            <div className="gba:relative gba:w-full gba:flex gba:justify-between gba:mb-4">
              <Avatar
                size={100}
                src={lead.avatarUrl}
                style={{ backgroundColor: "#1890ff" }}
                className="gba:border-4 gba:border-white gba:shadow-md"
              >
                {!lead.avatarUrl && lead.name.charAt(0)}
              </Avatar>
              <Button
                type="text"
                icon={<EditOutlined style={{ fontSize: '16px' }} />}
                className="gba:bg-white gba:rounded-full gba:w-7 gba:h-7 gba:flex gba:items-center gba:justify-center gba:text-[#666] gba:transition-all gba:duration-300 gba:shadow-sm gba:hover:bg-[rgba(0,0,0,0.05)] gba:hover:text-[#333]"
              />
            </div>

            <Text className="gba:text-xl gba:font-semibold gba:text-[#262626] gba:mb-5">
              {lead.name}
            </Text>

            <div className="gba:w-full">
              <div className="gba:flex gba:flex-col gba:mb-4">
                <Text className="gba:text-sm gba:text-[#8c8c8c] gba:mb-1" type="secondary">
                  {mergedLabels.emailLabel}
                </Text>
                <Text className="gba:text-[15px] gba:text-[#262626] gba:font-medium">
                  {lead.email}
                </Text>
              </div>

              <div className="gba:flex gba:flex-col gba:mb-4">
                <Text className="gba:text-sm gba:text-[#8c8c8c] gba:mb-1" type="secondary">
                  {mergedLabels.phoneLabel}
                </Text>
                <Text className="gba:text-[15px] gba:text-[#262626] gba:font-medium">
                  {lead.phone}
                </Text>
              </div>

              <div className="gba:flex gba:flex-col gba:mb-4">
                <Text className="gba:text-sm gba:text-[#8c8c8c] gba:mb-1" type="secondary">
                  {mergedLabels.companyLabel}
                </Text>
                <Text className="gba:text-[15px] gba:text-[#262626] gba:font-medium">
                  {lead.company}
                </Text>
              </div>

              <div className="gba:flex gba:flex-col gba:mb-4">
                <Text className="gba:text-sm gba:text-[#8c8c8c] gba:mb-1" type="secondary">
                  {mergedLabels.positionLabel}
                </Text>
                <Text className="gba:text-[15px] gba:text-[#262626] gba:font-medium">
                  {lead.position}
                </Text>
              </div>

              <div className="gba:flex gba:flex-col gba:mb-4">
                <Text className="gba:text-sm gba:text-[#8c8c8c] gba:mb-1" type="secondary">
                  {mergedLabels.sourceLabel}
                </Text>
                <Text className="gba:text-[15px] gba:text-[#262626] gba:font-medium">
                  {lead.source}
                </Text>
              </div>

              <div className="gba:flex gba:flex-col gba:mb-4">
                <Text className="gba:text-sm gba:text-[#8c8c8c] gba:mb-1" type="secondary">
                  {mergedLabels.ratingLabel}
                </Text>
                <Text className="gba:text-[15px] gba:text-[#f5222d] gba:font-medium">
                  {renderRating(lead.rating)}
                </Text>
              </div>

              <div className="gba:w-full gba:h-px gba:bg-[#e8e8e8] gba:my-3"></div>

              <div className="gba:flex gba:flex-col gba:mb-4">
                <Text className="gba:text-sm gba:text-[#8c8c8c] gba:mb-1" type="secondary">
                  {mergedLabels.ownerLabel}
                </Text>
                <Text className="gba:text-[15px] gba:text-[#262626] gba:font-medium">
                  {lead.owner}
                </Text>
              </div>

              <div className="gba:flex gba:flex-col gba:mb-4">
                <Text className="gba:text-sm gba:text-[#8c8c8c] gba:mb-1" type="secondary">
                  {mergedLabels.creationDateLabel}
                </Text>
                <Text className="gba:text-[15px] gba:text-[#262626] gba:font-medium">
                  {lead.creationDate}
                </Text>
              </div>
            </div>
          </div>
        </Card>
      </Col>

      {/* Main content */}
      <Col span={18}>
        <Card className="gba:rounded-xl">
          <Tabs
            activeKey={activeMainTab}
            onChange={setActiveMainTab}
            className="gba:mb-4"
            items={[
              {
                label: mergedLabels.overviewTabLabel,
                key: "overview",
                children: (
                  <div className="gba:w-full">
                    {/* Status history */}
                    {renderStatusHistory()}
                    <Divider />
                    {/* Activity & Tasks section */}
                    <Row gutter={24} className="gba:content-row">
                      <Col span={18}>{renderActivityTimeline()}</Col>
                      <Col span={6}>{renderTasksAndReminders()}</Col>
                    </Row>
                  </div>
                ),
              },
              {
                label: mergedLabels.companyTabLabel,
                key: "company",
                children: companyContent || (
                  <div className="gba:empty-content">
                    {mergedLabels.noCompanyInfoMessage ||
                      "No company information available"}
                  </div>
                ),
              },
              {
                label: mergedLabels.documentsTabLabel,
                key: "documents",
                children: documentsContent || (
                  <div className="gba:empty-content">
                    {mergedLabels.noDocumentsMessage || "No documents available"}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default LeadDetail;
