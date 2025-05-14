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
  RiEditLine,
  RiArrowRightLine,
  RiCheckLine,
  RiFilterLine,
  RiSearchLine,
  RiAddLine,
  RiSendPlaneLine,
} from "@remixicon/react";
import { LeadRating } from "./types";
import type {
  LeadDetailLabels,
  LeadStatus,
  LeadTask,
  TimelineActivity,
} from "./types";
import { mockDataProps } from "./mockData";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

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

export const LeadDetail: React.FC<LeadDetailProps> = ({
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
      <Text className="lead-rating" style={{ color }}>
        {rating}
      </Text>
    );
  };

  // Render status history
  const renderStatusHistory = () => (
    <div className="p-0 w-full overflow-x-auto mb-4">
      <Row
        wrap={false}
        className="flex items-center w-full overflow-x-auto overflow-y-hidden"
      >
        {statusHistory.map((status, index) => (
          <React.Fragment key={status.id}>
            <Col className="p-0 m-0">
              <div
                className={`py-2 px-6 bg-black relative text-white text-center font-medium min-w-[100px] flex items-center justify-center h-10 ${
                  status.id === 1 ? "rounded-l-lg" : ""
                } ${status.id === statusHistory.length ? "rounded-r-lg" : ""}`}
              >
                {status.name}
                {status.id === statusHistory.length && (
                  <RiCheckLine className="ml-2 text-white" />
                )}
              </div>
            </Col>
            {index < statusHistory.length - 1 && (
              <Col className="p-0 flex items-center justify-center m-0 z-[1]">
                <RiArrowRightLine className="text-black text-base" />
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
      <div className="p-4 bg-white rounded-lg border border-[#f0f0f0]">
        <div className="flex justify-between items-center mb-4 border-b border-[#f0f0f0] pb-2">
          <Title level={5}>{mergedLabels.activityTimelineTitle}</Title>
          <Space className="flex gap-2">
            <Button type="text" size="small" icon={<RiFilterLine />} />
            <Button type="text" size="small" icon={<RiSearchLine />} />
          </Space>
        </div>

        <div className="relative mb-6 border border-[#d9d9d9] rounded-md flex items-center">
          <Input
            placeholder={mergedLabels.activityInputPlaceholder}
            className="border-none shadow-none flex-grow"
          />
          <div className="flex gap-1 pr-2">
            <Button type="text" icon={<RiAddLine />} />
            <Button type="text" icon={<RiSendPlaneLine />} />
          </div>
        </div>

        <div className="p-0 px-4 max-h-[500px] overflow-y-auto relative">
          {Object.entries(groupedActivities).map(
            ([date, dateActivities], dateIndex) => (
              <React.Fragment key={date}>
                {dateIndex === 0 && (
                  <div className="flex items-center mb-4 relative">
                    <div className="w-4 h-4 rounded-full bg-[#f0f0f0] mr-2 z-[1]" />
                    <Text className="font-medium mr-2">
                      {mergedLabels.activityDateText}
                    </Text>
                    <div className="flex-grow h-px bg-[#f0f0f0]" />
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
                      className="flex relative mb-6 timeline-item"
                      key={activity.id}
                    >
                      <div className="mr-4 relative z-[1]">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: iconColor }}
                        />
                      </div>
                      <div className="flex-grow">
                        <div className="mb-2">
                          <Text strong className="font-medium text-base">
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
                        <div className="mb-2">
                          <Text>{activity.content}</Text>
                        </div>
                        <div className="text-xs text-[#8c8c8c] mb-2">
                          <Text type="secondary">
                            {activity.date}, {activity.time},{" "}
                            {mergedLabels.activityUserInfo ||
                              "Bob Smith (Sales+ Web)"}
                          </Text>
                        </div>
                        {activity.note && activity.type === "call" && (
                          <div className="mt-2 p-2 bg-[#f5f5f5] rounded">
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
  const renderTasksAndReminders = () => (
    <div className="p-4 bg-white rounded-lg border border-[#f0f0f0]">
      <div className="flex justify-between items-center mb-4 border-b border-[#e8e8e8] pb-2">
        <Title level={5}>{mergedLabels.tasksAndRemindersTitle}</Title>
        <Button
          type="text"
          size="small"
          icon={<RiAddLine />}
          className="text-[#1677ff]"
        />
      </div>
      <Tabs
        activeKey={activeTaskTab}
        onChange={setActiveTaskTab}
        className="mt-4"
      >
        <TabPane tab={mergedLabels.activeTabLabel} key="active">
          {activeTasks.map((task) => renderTaskCard(task))}
        </TabPane>
        <TabPane tab={mergedLabels.completedTabLabel} key="completed">
          {completedTasks.map((task) => renderTaskCard(task))}
        </TabPane>
      </Tabs>
    </div>
  );

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
            className="w-5 h-5 rounded-sm bg-[#1677ff] bg-[length:14px] bg-center bg-no-repeat flex-shrink-0 mt-0.5"
            style={{ backgroundImage: `url("${taskIconUrl}")` }}
          />
        );
      } else {
        return (
          <div
            className="w-5 h-5 rounded-sm bg-[#faad14] bg-[length:14px] bg-center bg-no-repeat flex-shrink-0 mt-0.5"
            style={{ backgroundImage: `url("${reminderIconUrl}")` }}
          />
        );
      }
    };

    return (
      <div
        key={task.id}
        className="w-full mb-4 !bg-[#f0f7ff] rounded-2xl p-4 shadow-sm"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-start gap-3">
            <TaskIcon />
            <Text strong className="text-[#262626] text-base">
              {task.type === "task"
                ? mergedLabels.taskPrefix
                : mergedLabels.reminderPrefix}{" "}
              {task.title}
            </Text>
          </div>
          <Button
            type="text"
            size="small"
            icon={<RiEditLine />}
            className="text-[#8c8c8c] mt-[-6px] mr-[-6px] hover:text-[#1677ff] hover:bg-[rgba(22,119,255,0.1)]"
          />
        </div>
        <div className="mt-3">
          <div className="flex mb-1.5 items-baseline">
            <Text
              type="secondary"
              className="w-20 text-[#8c8c8c] flex-shrink-0"
            >
              {mergedLabels.reporterLabel}
            </Text>
            <Text className="text-[#262626]">{task.reporter}</Text>
          </div>
          <div className="flex mb-1.5 items-baseline">
            <Text
              type="secondary"
              className="w-20 text-[#8c8c8c] flex-shrink-0"
            >
              {mergedLabels.priorityLabel}
            </Text>
            <Text className="text-[#262626]">{task.priority}</Text>
          </div>
          <div className="flex mb-1.5 items-baseline">
            <Text
              type="secondary"
              className="w-20 text-[#8c8c8c] flex-shrink-0"
            >
              {mergedLabels.dueDateLabel}
            </Text>
            <Text className="text-[#262626]">{task.dueDate}</Text>
          </div>
          {task.note && (
            <div className="mt-3 p-3 bg-[rgba(0,0,0,0.06)] rounded-md text-sm text-[#262626]">
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
          className="rounded-xl overflow-hidden h-full !bg-[#f0f7ff] shadow-none"
          bordered={false}
        >
          <div className="relative flex flex-col pt-5 px-5 pb-3">
            <div className="relative w-full flex justify-between mb-4">
              <Avatar
                size={100}
                src={lead.avatarUrl}
                style={{ backgroundColor: "#1890ff" }}
                className="border-4 border-white shadow-md"
              >
                {!lead.avatarUrl && lead.name.charAt(0)}
              </Avatar>
              <Button
                type="text"
                icon={<RiEditLine size={16} />}
                className="bg-white rounded-full w-7 h-7 flex items-center justify-center text-[#666] transition-all duration-300 shadow-sm hover:bg-[rgba(0,0,0,0.05)] hover:text-[#333]"
              />
            </div>

            <Text className="text-xl font-semibold text-[#262626] mb-5">
              {lead.name}
            </Text>

            <div className="w-full">
              <div className="flex flex-col mb-4">
                <Text className="text-sm text-[#8c8c8c] mb-1" type="secondary">
                  {mergedLabels.emailLabel}
                </Text>
                <Text className="text-[15px] text-[#262626] font-medium">
                  {lead.email}
                </Text>
              </div>

              <div className="flex flex-col mb-4">
                <Text className="text-sm text-[#8c8c8c] mb-1" type="secondary">
                  {mergedLabels.phoneLabel}
                </Text>
                <Text className="text-[15px] text-[#262626] font-medium">
                  {lead.phone}
                </Text>
              </div>

              <div className="flex flex-col mb-4">
                <Text className="text-sm text-[#8c8c8c] mb-1" type="secondary">
                  {mergedLabels.companyLabel}
                </Text>
                <Text className="text-[15px] text-[#262626] font-medium">
                  {lead.company}
                </Text>
              </div>

              <div className="flex flex-col mb-4">
                <Text className="text-sm text-[#8c8c8c] mb-1" type="secondary">
                  {mergedLabels.positionLabel}
                </Text>
                <Text className="text-[15px] text-[#262626] font-medium">
                  {lead.position}
                </Text>
              </div>

              <div className="flex flex-col mb-4">
                <Text className="text-sm text-[#8c8c8c] mb-1" type="secondary">
                  {mergedLabels.sourceLabel}
                </Text>
                <Text className="text-[15px] text-[#262626] font-medium">
                  {lead.source}
                </Text>
              </div>

              <div className="flex flex-col mb-4">
                <Text className="text-sm text-[#8c8c8c] mb-1" type="secondary">
                  {mergedLabels.ratingLabel}
                </Text>
                <Text className="text-[15px] text-[#f5222d] font-medium">
                  {renderRating(lead.rating)}
                </Text>
              </div>

              <div className="w-full h-px bg-[#e8e8e8] my-3"></div>

              <div className="flex flex-col mb-4">
                <Text className="text-sm text-[#8c8c8c] mb-1" type="secondary">
                  {mergedLabels.ownerLabel}
                </Text>
                <Text className="text-[15px] text-[#262626] font-medium">
                  {lead.owner}
                </Text>
              </div>

              <div className="flex flex-col mb-4">
                <Text className="text-sm text-[#8c8c8c] mb-1" type="secondary">
                  {mergedLabels.creationDateLabel}
                </Text>
                <Text className="text-[15px] text-[#262626] font-medium">
                  {lead.creationDate}
                </Text>
              </div>
            </div>
          </div>
        </Card>
      </Col>

      {/* Main content */}
      <Col span={18}>
        <Card className="rounded-xl">
          <Tabs
            activeKey={activeMainTab}
            onChange={setActiveMainTab}
            className="mb-4"
          >
            <TabPane tab="Overview" key="overview">
              <div className="w-full">
                {/* Status history */}
                {renderStatusHistory()}
                <Divider />
                {/* Activity & Tasks section */}
                <Row gutter={24} className="content-row">
                  <Col span={18}>{renderActivityTimeline()}</Col>
                  <Col span={6}>{renderTasksAndReminders()}</Col>
                </Row>
              </div>
            </TabPane>
            <TabPane tab={mergedLabels.companyTabLabel} key="company">
              {companyContent || (
                <div className="empty-content">
                  {mergedLabels.noCompanyInfoMessage ||
                    "No company information available"}
                </div>
              )}
            </TabPane>
            <TabPane tab={mergedLabels.documentsTabLabel} key="documents">
              {documentsContent || (
                <div className="empty-content">
                  {mergedLabels.noDocumentsMessage || "No documents available"}
                </div>
              )}
            </TabPane>
          </Tabs>
        </Card>
      </Col>
    </Row>
  );
};

export default LeadDetail;
