import React from "react";
import { List, Tag } from "antd";
import dayjs from "dayjs";
import { BusinessAppContextProps } from "../../../../../common/BusinessAppContext";
import "../AbsenceCalendar.css"

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
    <div className="gba:absence-list-root">
      {title && <div className="gba:text-lg gba:font-semibold gba:mb-2">{title}</div>}
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
            <List.Item key={item.id} className="gba:absence-event-item">
              <div className="gba:absence-event-row">
                <div className="gba:absence-event-date">
                  {isSameDay
                    ? `Date: ${dayjs(item.startDate).format('DD.MM.YYYY')}`
                    : `From: ${dayjs(item.startDate).format('DD.MM.YYYY')} - To: ${dayjs(item.endDate).format('DD.MM.YYYY')}`}
                </div>
                <span>Type: </span>
                <Tag
                  color={item.tagColor || (item.status === "Approved" ? "green" : "orange")}
                  className={`gba:absence-event-tag${item.status === 'PENDING' ? ' gba:absence-pending' : ''}`}
                >
                  {item.type}
                </Tag>
                <div className="gba:absence-event-status">Status: {item.status}</div>
                {item.description && (
                  <div className="gba:absence-event-description">Note: {item.description}</div>
                )}
              </div>
            </List.Item>
          );
        }}
      />
    </div>
  );
};
