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
        return <Mail className="h-4 w-4" />
      case "call":
        return <Phone className="h-4 w-4" />
      case "meeting":
        return <Coffee className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      case "message":
        return <MessageSquare className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
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
    <Card className="rounded-xl shadow-sm h-full border-gray-300">
      <CardHeader className="border-b border-gray-300 pb-3">
        <CardTitle>Recent Activities</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="relative pl-20">
          {/* Timeline line */}
          <div className="absolute left-[31px] top-0 bottom-0 w-[1px] border-l-2 border-dotted border-blue-300"></div>

          {displayedActivities.map((activity) => (
            <div key={activity.id} className="mb-8 last:mb-0 relative">
              {/* Activity icon - positioned absolutely */}
              <div className="absolute left-[-65px] top-0">
                <div
                  className={`rounded-full p-2 h-8 w-8 flex items-center justify-center ${getActivityColor(activity.type)}`}
                >
                  {getActivityIcon(activity.type)}
                </div>
              </div>

              {/* Activity content */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                  <div className="font-medium text-base">{activity.title}</div>
                  <div className="text-xs text-muted-foreground">{formatRelativeTime(activity.date)}</div>
                </div>
                <p className="text-sm mb-3">{activity.description}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {activity.participants.length > 0 && (
                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-xs">
                      <Users className="h-3 w-3 text-gray-500" />
                      <span>
                        {activity.participants.length > 2
                          ? `${activity.participants[0]} +${activity.participants.length - 1}`
                          : activity.participants.join(", ")}
                      </span>
                    </div>
                  )}
                  {activity.duration && (
                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-xs">
                      <Clock className="h-3 w-3 text-gray-500" />
                      <span>{activity.duration}</span>
                    </div>
                  )}
                  {activity.documents.map((doc, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full text-xs text-blue-700"
                    >
                      <FileText className="h-3 w-3" />
                      <span>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* More/Less button */}
          {activities.length > 3 && (
            <div className="text-center mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivitiesExpanded(!activitiesExpanded)}
                className="rounded-md text-blue-700 hover:text-blue-800 hover:bg-blue-50"
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
