import { FC } from "react"
import { 
  Mail, 
  Phone, 
  Coffee, 
  Video, 
  MessageSquare, 
  Calendar,
  Users,
  Clock,
  FileText
} from "lucide-react"
import { Button } from "../common/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../common/components/ui/card"

interface ActivityStreamProps {
  activitiesExpanded: boolean
  setActivitiesExpanded: (expanded: boolean) => void
}

export const ActivityStream: FC<ActivityStreamProps> = ({ 
  activitiesExpanded, 
  setActivitiesExpanded 
}) => {
  // Activity data
  const activities = [
    {
      id: 1,
      type: "email",
      date: "2023-12-01T09:15:00",
      title: "Email Response",
      description: "Responded to product demo inquiry",
      participants: ["Sarah Johnson", "Emily Parker"],
      duration: null,
      documents: ["Product_Overview.pdf"],
    },
    {
      id: 2,
      type: "call",
      date: "2023-11-28T14:30:00",
      title: "Sales Call",
      description: "Discussed enterprise pricing options",
      participants: ["Michael Chen", "Emily Parker", "John Smith"],
      duration: "45 minutes",
      documents: ["Enterprise_Pricing.pdf"],
    },
    {
      id: 3,
      type: "meeting",
      date: "2023-11-15T10:00:00",
      title: "In-Person Meeting",
      description: "Product demo at Acme Corporation HQ",
      participants: ["Sarah Johnson", "Emily Parker", "David Rodriguez", "Lisa Wong"],
      duration: "1 hour 30 minutes",
      documents: ["Meeting_Notes.pdf", "Action_Items.pdf"],
    },
    {
      id: 4,
      type: "video",
      date: "2023-11-10T11:00:00",
      title: "Video Conference",
      description: "Technical requirements discussion",
      participants: ["Emily Parker", "Technical Team"],
      duration: "1 hour",
      documents: ["Technical_Requirements.pdf"],
    },
    {
      id: 5,
      type: "message",
      date: "2023-11-05T15:45:00",
      title: "Chat Message",
      description: "Quick follow-up on timeline",
      participants: ["Emily Parker"],
      duration: null,
      documents: [],
    },
  ]

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return "Today"
    if (diffInDays === 1) return "Yesterday"
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    return `${Math.floor(diffInDays / 30)} months ago`
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="gba:h-4 gba:w-4" />
      case "call":
        return <Phone className="gba:h-4 gba:w-4" />
      case "meeting":
        return <Coffee className="gba:h-4 gba:w-4" />
      case "video":
        return <Video className="gba:h-4 gba:w-4" />
      case "message":
        return <MessageSquare className="gba:h-4 gba:w-4" />
      default:
        return <Calendar className="gba:h-4 gba:w-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "email":
        return "bg-blue-100 text-blue-600"
      case "call":
        return "bg-green-100 text-green-600"
      case "meeting":
        return "bg-purple-100 text-purple-600"
      case "video":
        return "bg-indigo-100 text-indigo-600"
      case "message":
        return "bg-amber-100 text-amber-600"
      default:
        return "bg-gray-100 text-gray-600"
    }
  }

  const displayedActivities = activitiesExpanded ? activities : activities.slice(0, 3)

  return (
    <Card className="gba:rounded-xl gba:shadow-sm gba:h-full gba:border-gray-300">
      <CardHeader className="gba:border-b gba:border-gray-300 gba:pb-3">
        <CardTitle>Recent Activities</CardTitle>
      </CardHeader>
      <CardContent className="gba:pt-4">
        <div className="gba:relative gba:pl-20">
          {/* Timeline line */}
          <div className="gba:absolute gba:left-[31px] gba:top-0 gba:bottom-0 gba:w-[1px] gba:border-l-2 gba:border-dotted gba:border-blue-300"></div>

          {displayedActivities.map((activity) => (
            <div key={activity.id} className="gba:mb-8 gba:last:mb-0 gba:relative">
              {/* Activity icon - positioned absolutely */}
              <div className="gba:absolute gba:left-[-65px] gba:top-0">
                <div
                  className={`gba:rounded-full gba:p-2 gba:h-8 gba:w-8 gba:flex gba:items-center gba:justify-center ${getActivityColor(activity.type)}`}
                >
                  {getActivityIcon(activity.type)}
                </div>
              </div>

              {/* Activity content */}
              <div className="gba:flex-1">
                <div className="gba:flex gba:flex-col gba:sm:flex-row gba:sm:items-center gba:justify-between gba:mb-2">
                  <div className="gba:font-medium gba:text-base">{activity.title}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">{formatRelativeTime(activity.date)}</div>
                </div>
                <p className="gba:text-sm gba:mb-3">{activity.description}</p>
                <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-2">
                  {activity.participants.length > 0 && (
                    <div className="gba:flex gba:items-center gba:gap-1 gba:bg-gray-100 gba:px-2 gba:py-1 gba:rounded-full gba:text-xs">
                      <Users className="gba:h-3 gba:w-3 gba:text-gray-500" />
                      <span>
                        {activity.participants.length > 2
                          ? `${activity.participants[0]} +${activity.participants.length - 1}`
                          : activity.participants.join(", ")}
                      </span>
                    </div>
                  )}
                  {activity.duration && (
                    <div className="gba:flex gba:items-center gba:gap-1 gba:bg-gray-100 gba:px-2 gba:py-1 gba:rounded-full gba:text-xs">
                      <Clock className="gba:h-3 gba:w-3 gba:text-gray-500" />
                      <span>{activity.duration}</span>
                    </div>
                  )}
                  {activity.documents.map((doc, i) => (
                    <div
                      key={i}
                      className="gba:flex gba:items-center gba:gap-1 gba:bg-blue-50 gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:text-blue-700"
                    >
                      <FileText className="gba:h-3 gba:w-3" />
                      <span>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* More/Less button */}
          {activities.length > 3 && (
            <div className="gba:text-center gba:mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivitiesExpanded(!activitiesExpanded)}
                className="gba:rounded-md gba:text-blue-700 gba:hover:text-blue-800 gba:hover:bg-blue-50"
              >
                {activitiesExpanded ? "Show Less" : "Show More"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
