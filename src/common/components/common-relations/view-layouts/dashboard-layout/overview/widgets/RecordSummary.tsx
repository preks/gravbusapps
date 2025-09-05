import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, IconAvatar } from "@newwork/nw-design-system";
import { Trophy as TrophyIcon } from "lucide-react";

export interface RecentRecordItem {
  id: string;
  type: string; // 'opportunity' | 'lead' | 'contact' | ...
  name: string;
  createdAt: string | number | Date;
}

export interface RecordSummaryProps {
  records: RecentRecordItem[];
  moduleColor?: string;
}

export const RecordSummary: React.FC<RecordSummaryProps> = ({ records, moduleColor = 'default' }) => {
  return (
    <Card className="gba:h-full">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar
          icon={TrophyIcon}
          variant={moduleColor as any}
          size="md"
          iconWeight="regular"
          decorative={true}
        />
        <div>
          <CardTitle>Recent Records</CardTitle>
          <CardDescription>Latest activity</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          {records.slice(0, 3).map((record) => (
            <Card
              key={record.id}
              className="gba:transition-colors hover:gba:shadow-md"
            >
              <CardHeader className="gba:pb-2">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:w-8 gba:h-8 gba:bg-blue-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                    <span className="gba:text-blue-600 gba:text-sm gba:font-medium">
                      {record.type === "opportunity"
                        ? "O"
                        : record.type === "lead"
                          ? "L"
                          : "C"}
                    </span>
                  </div>
                  <CardTitle className="gba:text-sm">{record.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {record.type} • {new Date(record.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
          <div className="gba:text-center gba:pt-2">
            <Button variant="link" size="sm" className="gba:text-blue-600">
              View All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecordSummary;
