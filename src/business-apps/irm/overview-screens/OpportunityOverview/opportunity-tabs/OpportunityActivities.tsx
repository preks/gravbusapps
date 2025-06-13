"use client"

import { useState } from "react"
import { Button } from "../common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../common/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "../common/ui/avatar"
import { Input } from "../common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../common/ui/select"
import { Calendar, Clock, Mail, MessageSquare, Phone, Plus, Search } from "lucide-react"
import type { Activity } from "../lib/db-actions"

interface OpportunityActivitiesProps {
  activities: Activity[]
  opportunityId: string
}

export function OpportunityActivities({ activities, opportunityId }: OpportunityActivitiesProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")

  console.log("OpportunityActivities - Activities:", activities)
  console.log("OpportunityActivities - OpportunityId:", opportunityId)

  const filteredActivities = activities.filter(
    (activity) =>
      (filterType === "all" || activity.type === filterType) &&
      (activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (activity.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())),
  )

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="gba-h-4 gba-w-4" />
      case "email":
        return <Mail className="gba-h-4 gba-w-4" />
      case "meeting":
        return <Calendar className="gba-h-4 gba-w-4" />
      case "note":
        return <MessageSquare className="gba-h-4 gba-w-4" />
      default:
        return null
    }
  }

  return (
    <Card className="gba-border-gray-300">
      <CardHeader className="gba-flex gba-flex-row gba-items-center gba-justify-between">
        <CardTitle>Activities</CardTitle>
        <Button size="sm" className="gba-border-gray-300 gba-bg-white gba-text-gray-800 gba-hover:bg-gray-50">
          <Plus className="gba-mr-2 gba-h-4 gba-w-4" />
          Add Activity
        </Button>
      </CardHeader>
      <CardContent>
        <div className="gba-mb-4 gba-flex gba-flex-col gba-gap-2 gba-sm:flex-row">
          <div className="gba-relative gba-flex-1">
            <Search className="gba-absolute gba-left-2.5 gba-top-2.5 gba-h-4 gba-w-4 gba-text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search activities..."
              className="gba-pl-8 gba-border-gray-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="gba-w-full gba-border-gray-300 gba-sm:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="gba-z-50 gba-bg-white gba-border gba-border-gray-300 gba-rounded gba-shadow-md">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="call">Calls</SelectItem>
              <SelectItem value="email">Emails</SelectItem>
              <SelectItem value="meeting">Meetings</SelectItem>
              <SelectItem value="note">Notes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="gba-space-y-6">
          {filteredActivities.length === 0 ? (
            <div className="gba-py-12 gba-text-center gba-text-muted-foreground">
              No activities found. Try adjusting your search or filter.
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div key={activity.id} className="gba-relative gba-flex gba-gap-4 gba-pb-8 gba-pl-6 last:pb-0">
                <div className="gba-absolute gba-left-0 gba-top-0 gba-h-full gba-w-px gba-bg-border"></div>
                <div className="gba-absolute gba-left-[-4px] gba-top-1 gba-h-2 gba-w-2 gba-rounded-full gba-bg-primary"></div>
                <div className="gba-flex-1">
                  <div className="gba-flex gba-items-start gba-justify-between">
                    <div>
                      <div className="gba-flex gba-items-center gba-gap-2">
                        <span className="gba-inline-flex gba-items-center gba-rounded-full gba-bg-muted gba-px-2 gba-py-1 gba-text-xs">
                          {getActivityIcon(activity.type)}
                          <span className="gba-ml-1 gba-capitalize">{activity.type}</span>
                        </span>
                        <h4 className="gba-font-medium">{activity.title}</h4>
                      </div>
                      <div className="gba-mt-1 gba-flex gba-items-center gba-gap-2 gba-text-xs gba-text-muted-foreground">
                        <Calendar className="gba-h-3 gba-w-3" />
                        {new Date(activity.date).toLocaleDateString()}
                        <Clock className="gba-ml-2 gba-h-3 gba-w-3" />
                        {new Date(activity.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <Avatar className="gba-h-8 gba-w-8">
                      <AvatarImage src={activity.user?.avatar || "/placeholder.svg"} alt={activity.user?.name || "User"} />
                      <AvatarFallback>{activity.user?.initials || "U"}</AvatarFallback>
                    </Avatar>
                  </div>
                  <p className="gba-mt-2 gba-text-sm">{activity.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
