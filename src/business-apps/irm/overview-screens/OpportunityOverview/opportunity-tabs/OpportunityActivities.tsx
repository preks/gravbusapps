"use client"

import { useState } from "react"
import { Button } from "../common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../common/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "../common/ui/avatar"
import { Input } from "../common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../common/ui/select"
import { Calendar, Clock, Mail, MessageSquare, Phone, Plus, Search } from "lucide-react"
import type { Activity } from "../../../../../common/lib/db-actions"

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
        return <Phone className="h-4 w-4" />
      case "email":
        return <Mail className="h-4 w-4" />
      case "meeting":
        return <Calendar className="h-4 w-4" />
      case "note":
        return <MessageSquare className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <Card className="border-gray-300">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Activities</CardTitle>
        <Button size="sm" className="border-gray-300 bg-white text-gray-800 hover:bg-gray-50">
          <Plus className="mr-2 h-4 w-4" />
          Add Activity
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search activities..."
              className="pl-8 border-gray-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full border-gray-300 sm:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-white border border-gray-300 rounded shadow-md">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="call">Calls</SelectItem>
              <SelectItem value="email">Emails</SelectItem>
              <SelectItem value="meeting">Meetings</SelectItem>
              <SelectItem value="note">Notes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-6">
          {filteredActivities.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No activities found. Try adjusting your search or filter.
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div key={activity.id} className="relative flex gap-4 pb-8 pl-6 last:pb-0">
                <div className="absolute left-0 top-0 h-full w-px bg-border"></div>
                <div className="absolute left-[-4px] top-1 h-2 w-2 rounded-full bg-primary"></div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs">
                          {getActivityIcon(activity.type)}
                          <span className="ml-1 capitalize">{activity.type}</span>
                        </span>
                        <h4 className="font-medium">{activity.title}</h4>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(activity.date).toLocaleDateString()}
                        <Clock className="ml-2 h-3 w-3" />
                        {new Date(activity.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={activity.user?.avatar || "/placeholder.svg"} alt={activity.user?.name || "User"} />
                      <AvatarFallback>{activity.user?.initials || "U"}</AvatarFallback>
                    </Avatar>
                  </div>
                  <p className="mt-2 text-sm">{activity.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
