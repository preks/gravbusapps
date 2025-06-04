"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "../common/ui/button"
import { Card, CardContent } from "../common/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../common/ui/dialog"
import { Input } from "../common/ui/input"
import { Label } from "../common/ui/label"
import { Textarea } from "../common/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../common/ui/select"
import { CheckCircle2, Clock, AlertCircle, Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { StageRequirement } from "../../../../../common/lib/db-actions"

interface Task {
  id: string
  opportunityId: string
  title: string
  description?: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  dueDate?: string
  assignedTo?: string
  createdAt: string
  updatedAt: string
}

interface OpportunityTasksProps {
  tasks: Task[]
  opportunityId: string
  stageRequirements: StageRequirement[]
}

export function OpportunityTasks({ tasks, opportunityId, stageRequirements }: OpportunityTasksProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Safe navigation handling
  let navigate: any;
  try {
    navigate = useNavigate();
  } catch (error) {
    navigate = { refresh: () => console.log("Navigation not available") };
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      console.log("Task would be created here");
      
      setIsDialogOpen(false)
      setIsSubmitting(false)
      
    } catch (error) {
      console.error("Error creating task:", error)
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return (
          <div className="gba:flex gba:items-center gba:text-green-600">
            <CheckCircle2 className="gba:h-4 gba:w-4 gba:mr-1" />
            <span>Completed</span>
          </div>
        );
      case 'in_progress':
        return (
          <div className="gba:flex gba:items-center gba:text-blue-600">
            <Clock className="gba:h-4 gba:w-4 gba:mr-1" />
            <span>In Progress</span>
          </div>
        );
      case 'cancelled':
        return (
          <div className="gba:flex gba:items-center gba:text-gray-500">
            <AlertCircle className="gba:h-4 gba:w-4 gba:mr-1" />
            <span>Cancelled</span>
          </div>
        );
      default:
        return (
          <div className="gba:flex gba:items-center gba:text-orange-500">
            <Clock className="gba:h-4 gba:w-4 gba:mr-1" />
            <span>Pending</span>
          </div>
        );
    }
  };

  return (
    <div className="gba:space-y-6">
      <div className="gba:flex gba:justify-between gba:items-center">
        <h2 className="gba:text-xl gba:font-semibold">Tasks</h2>
        <Button 
          size="sm" 
          onClick={() => setIsDialogOpen(true)}
          className="gba:border-gray-300"
        >
          <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
          Add Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card className="gba:border-gray-300">
          <CardContent className="gba:p-6 gba:text-center">
            <p className="gba:text-gray-500">No tasks have been created for this opportunity yet.</p>
            <Button 
              variant="outline" 
              className="gba:mt-4 gba:border-gray-300"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
              Create Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="gba:grid gba:gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="gba:border-gray-300">
              <CardContent className="gba:p-4">
                <div className="gba:flex gba:justify-between">
                  <h3 className="gba:font-medium gba:text-lg">{task.title}</h3>
                  {getStatusBadge(task.status)}
                </div>
                {task.description && (
                  <p className="gba:text-gray-600 gba:mt-2">{task.description}</p>
                )}
                <div className="gba:flex gba:flex-wrap gba:gap-4 gba:mt-4 gba:text-sm gba:text-gray-500">
                  <div>
                    <span className="gba:font-medium">Due:</span> {formatDate(task.dueDate)}
                  </div>
                  <div>
                    <span className="gba:font-medium">Assigned to:</span> {task.assignedTo || 'Unassigned'}
                  </div>
                  <div>
                    <span className="gba:font-medium">Created:</span> {formatDate(task.createdAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="gba:sm:max-w-[425px] gba:p-0 gba:fixed gba:top-1/2 gba:left-1/2 gba:transform -translate-x-1/2 -translate-y-1/2 gba:bg-white gba:rounded-md gba:shadow-lg gba:z-50">
          <DialogHeader className="gba:p-4 gba:pb-2">
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task for this opportunity. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="gba:grid gba:gap-4 gba:p-4">
              <div className="gba:grid gba:gap-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" className="gba:border-gray-300" required />
              </div>
              <div className="gba:grid gba:gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" className="gba:border-gray-300" />
              </div>
              <div className="gba:grid gba:gap-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue="pending">
                  <SelectTrigger className="gba:border-gray-300">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="gba:z-50 gba:bg-white gba:border gba:border-gray-300 gba:rounded gba:shadow-md">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="gba:grid gba:gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  className="gba:border-gray-300"
                />
              </div>
              <div className="gba:grid gba:gap-2">
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Input id="assignedTo" name="assignedTo" className="gba:border-gray-300" />
              </div>
            </div>
            <DialogFooter className="gba:flex gba:justify-end gba:gap-2 gba:p-4 gba:border-t gba:border-gray-200">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="gba:border-gray-300 gba:px-4"
              >
                Cancel
              </Button>
              <Button type="submit" className="gba:bg-black gba:hover:bg-gray-800 gba:text-white gba:px-4" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
