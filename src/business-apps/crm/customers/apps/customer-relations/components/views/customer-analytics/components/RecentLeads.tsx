import React from "react";
import { Card, Typography, Table, Tag, Button, Avatar, Tooltip } from "antd";
import {
  UserOutlined,
  EyeOutlined,
  MailOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { LeadData } from "../types/dashboardTypes";
import { formatDate } from "../utils/dashboardUtils";
import { EmptyState } from "./EmptyState";

const { Title, Text } = Typography;

export interface RecentLeadsProps {
  leads: LeadData[];
  pipelineId: string;
}

export const RecentLeads: React.FC<RecentLeadsProps> = ({
  leads,
  pipelineId,
}) => {
  const handleViewLead = (leadId: string) => {
    // TODO: Navigate to lead detail view
    console.log("Navigate to lead:", leadId);
  };

  const handleContactLead = (lead: LeadData, method: "email" | "phone") => {
    // TODO: Open contact method (email client, phone dialer, etc.)
    console.log(`Contact lead ${lead.id} via ${method}`);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "new":
        return "blue";
      case "contacted":
        return "orange";
      case "qualified":
        return "green";
      case "unqualified":
        return "red";
      case "converted":
        return "purple";
      default:
        return "default";
    }
  };

  const columns = [
    {
      title: "Lead",
      key: "lead",
      render: (lead: LeadData) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Avatar size="small" icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: "bold", fontSize: "13px" }}>
              {lead.name}
            </div>
            {lead.companyName && (
              <Text type="secondary" style={{ fontSize: "11px" }}>
                {lead.companyName}
              </Text>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: "Owner",
      key: "owner",
      render: (lead: LeadData) => (
        <Text style={{ fontSize: "12px" }}>
          {lead.ownerEmployee.displayName || "Unassigned"}
        </Text>
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: Date) => (
        <Text style={{ fontSize: "11px" }}>{formatDate(date, "MMM DD")}</Text>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (lead: LeadData) => (
        <div style={{ display: "flex", gap: "4px" }}>
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewLead(lead.id)}
              data-testid={`view-lead-${lead.id}`}
            />
          </Tooltip>
          {lead.email && (
            <Tooltip title="Send Email">
              <Button
                type="text"
                size="small"
                icon={<MailOutlined />}
                onClick={() => handleContactLead(lead, "email")}
                data-testid={`email-lead-${lead.id}`}
              />
            </Tooltip>
          )}
          <Tooltip title="Call">
            <Button
              type="text"
              size="small"
              icon={<PhoneOutlined />}
              onClick={() => handleContactLead(lead, "phone")}
              data-testid={`call-lead-${lead.id}`}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  if (!leads || leads.length === 0) {
    return (
      <Card
        data-testid={`recent-leads-${pipelineId}`}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <UserOutlined />
            <span>Recent Leads (Last 7 Days)</span>
          </div>
        }
      >
        <EmptyState
          title="No Recent Leads"
          description="No new leads in the last 7 days"
        />
      </Card>
    );
  }

  return (
    <Card
      data-testid={`recent-leads-${pipelineId}`}
      title={
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <UserOutlined />
            <span>Recent Leads (Last 7 Days)</span>
          </div>
          <Tag color="blue">{leads.length} leads</Tag>
        </div>
      }
    >
      <Table
        dataSource={leads}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ x: "max-content" }}
        style={{ fontSize: "12px" }}
      />

      {/* Quick Stats */}
      <div
        style={{
          marginTop: "12px",
          padding: "8px",
          backgroundColor: "var(--nw-muted)",
          borderRadius: "4px",
          display: "flex",
          justifyContent: "space-around",
          fontSize: "11px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: "bold", color: "var(--nw-info)" }}>
            {
              leads.filter((lead) => lead.status?.toLowerCase() === "new")
                .length
            }
          </div>
          <Text type="secondary">New</Text>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: "bold", color: "var(--nw-warning)" }}>
            {
              leads.filter((lead) => lead.status?.toLowerCase() === "contacted")
                .length
            }
          </div>
          <Text type="secondary">Contacted</Text>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: "bold", color: "var(--nw-success)" }}>
            {
              leads.filter((lead) => lead.status?.toLowerCase() === "qualified")
                .length
            }
          </div>
          <Text type="secondary">Qualified</Text>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: "bold", color: "var(--nw-ext-7)" }}>
            {leads.filter((lead) => lead.source).length}
          </div>
          <Text type="secondary">With Source</Text>
        </div>
      </div>
    </Card>
  );
};
