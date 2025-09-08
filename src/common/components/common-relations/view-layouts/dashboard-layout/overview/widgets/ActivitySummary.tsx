import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "@newwork/nw-design-system";
import { Calendar } from "lucide-react";

export interface ActivityItem {
  id: string;
  title: string;
  type: string;
  owner?: string;
  relatedTo?: string;
  createdAt: string | number | Date;
  completedAt?: string | number | Date;
}

export interface ActivitySummaryProps {
  activities: ActivityItem[];
  moduleColor?: string;
}

export const ActivitySummary: React.FC<ActivitySummaryProps> = ({ activities, moduleColor = "default" }) => {
  // Remove unused variable warning
  const _ = moduleColor;
  return (
    <Card className="gba:h-full">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:p-2 gba:bg-blue-100 gba:rounded-lg">
            <Calendar className="gba:h-6 gba:w-6 gba:text-blue-600" />
          </div>
          <CardTitle>Today's Activities</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="gba:space-y-4 gba:max-h-64 gba:overflow-y-auto">
            {activities.slice(0, 5).map((activity) => (
              <Card
                key={activity.id}
                className="gba:transition-colors hover:gba:shadow-md"
              >
                <CardHeader className="gba:pb-2">
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div className="gba:w-8 gba:h-8 gba:bg-orange-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                      <span className="gba:text-orange-600 gba:text-xs gba:font-medium">
                        {activity.type.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <CardTitle className="gba:text-sm gba:truncate">
                      {activity.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="gba:mb-2">
                    {activity.type} • {activity.owner}
                  </CardDescription>
                  {activity.relatedTo !== "No relation" && (
                    <div className="gba:text-xs gba:text-blue-600 gba:mb-1">
                      Related to: {activity.relatedTo}
                    </div>
                  )}
                  <div className="gba:text-xs gba:text-gray-400">
                    {new Date(activity.createdAt).toLocaleTimeString()}
                    {activity.completedAt && (
                      <span className="gba:text-green-600 gba:ml-2">✓ Completed</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="gba:text-center gba:pt-2">
              <Button variant="link" size="sm" className="gba:text-orange-600">
                View All Activities
              </Button>
            </div>
          </div>
        ) : (
          <div className="gba:h-64 gba:flex gba:items-center gba:justify-center">
            <div className="gba:text-center">
              <div className="gba:w-16 gba:h-16 gba:mx-auto gba:bg-orange-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:mb-4">
                <Calendar className="gba:h-8 gba:w-8 gba:text-orange-500" />
              </div>
              <div className="gba:text-gray-600 gba:text-lg">
                No activities scheduled for today.
              </div>
              <div className="gba:mt-4">
                <Button variant="link" size="sm" className="gba:text-orange-600">
                  Schedule Activity
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivitySummary;
