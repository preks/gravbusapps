import React from "react";
import { List, Tag } from "antd";
import dayjs from "dayjs";
import { BusinessAppContextProps } from "../../../../common/BusinessAppContext";
import "./AbsenceCalendar.css"

export interface AbsenceListDisplayItem {
  id: string;
  type: string;
  status: string;
  tagColor?: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export interface AbsenceListDisplayProps extends BusinessAppContextProps {
  absences: AbsenceListDisplayItem[];
  title?: string;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
}

export const AbsenceListDisplay: React.FC<AbsenceListDisplayProps> = ({
  absences,
  title,
  page,
  pageSize,
  total,
  onPageChange,
}) => {
  return (
    <div className="absence-list-root">
      {title && <div className="text-lg font-semibold mb-2">{title}</div>}
      <List
        itemLayout="vertical"
        dataSource={absences}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: onPageChange,
          showSizeChanger: false,
        }}
        locale={{ emptyText: "No absences." }}
        renderItem={item => {
          const isSameDay = item.startDate === item.endDate;
          return (
            <List.Item key={item.id} className="absence-event-item">
              <div className="absence-event-row">
                <div className="absence-event-date">
                  {isSameDay
                    ? `Date: ${dayjs(item.startDate).format('DD.MM.YYYY')}`
                    : `From: ${dayjs(item.startDate).format('DD.MM.YYYY')} - To: ${dayjs(item.endDate).format('DD.MM.YYYY')}`}
                </div>
                <span>Type: </span>
                <Tag
                  color={item.tagColor || (item.status === "Approved" ? "green" : "orange")}
                  className={`absence-event-tag${item.status === 'PENDING' ? ' absence-pending' : ''}`}
                >
                  {item.type}
                </Tag>
                <div className="absence-event-status">Status: {item.status}</div>
                {item.description && (
                  <div className="absence-event-description">Note: {item.description}</div>
                )}
              </div>
            </List.Item>
          );
        }}
      />
    </div>
  );
};
