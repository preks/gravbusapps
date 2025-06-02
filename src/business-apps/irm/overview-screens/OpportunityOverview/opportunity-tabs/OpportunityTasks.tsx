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
          <div className="flex items-center text-green-600">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            <span>Completed</span>
          </div>
        );
      case 'in_progress':
        return (
          <div className="flex items-center text-blue-600">
            <Clock className="h-4 w-4 mr-1" />
            <span>In Progress</span>
          </div>
        );
      case 'cancelled':
        return (
          <div className="flex items-center text-gray-500">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span>Cancelled</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-orange-500">
            <Clock className="h-4 w-4 mr-1" />
            <span>Pending</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Tasks</h2>
        <Button 
          size="sm" 
          onClick={() => setIsDialogOpen(true)}
          className="border-gray-300"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card className="border-gray-300">
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">No tasks have been created for this opportunity yet.</p>
            <Button 
              variant="outline" 
              className="mt-4 border-gray-300"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="border-gray-300">
              <CardContent className="p-4">
                <div className="flex justify-between">
                  <h3 className="font-medium text-lg">{task.title}</h3>
                  {getStatusBadge(task.status)}
                </div>
                {task.description && (
                  <p className="text-gray-600 mt-2">{task.description}</p>
                )}
                <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
                  <div>
                    <span className="font-medium">Due:</span> {formatDate(task.dueDate)}
                  </div>
                  <div>
                    <span className="font-medium">Assigned to:</span> {task.assignedTo || 'Unassigned'}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span> {formatDate(task.createdAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-md shadow-lg z-50">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task for this opportunity. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 p-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" className="border-gray-300" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" className="border-gray-300" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue="pending">
                  <SelectTrigger className="border-gray-300">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-white border border-gray-300 rounded shadow-md">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  className="border-gray-300"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Input id="assignedTo" name="assignedTo" className="border-gray-300" />
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="border-gray-300 px-4"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-black hover:bg-gray-800 text-white px-4" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
