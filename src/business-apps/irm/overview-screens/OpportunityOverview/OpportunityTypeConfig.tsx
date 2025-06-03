"use client"

import { useState } from "react"
import { Button } from "./common/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./common/ui/card"
import { Input } from "./common/ui/input"
import { Label } from "./common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./common/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./common/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./common/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./common/ui/tabs"
import { ChevronDown, ChevronUp, Edit, Plus, Trash } from "lucide-react"
import { opportunityTypes } from "../../../../common/lib/opportunity-stages"
import type { OpportunityType, OpportunityStage } from "../../../../common/lib/opportunity-stages"

const getStageBgColorClass = (color: string) => {
  switch (color) {
    case "blue":
      return "bg-blue-500"
    case "indigo":
      return "bg-indigo-500"
    case "violet":
      return "bg-violet-500"
    case "purple":
      return "bg-purple-500"
    case "green":
      return "bg-green-500"
    case "red":
      return "bg-red-500"
    case "yellow":
      return "bg-yellow-500"
    case "orange":
      return "bg-orange-500"
    default:
      return "bg-gray-300"
  }
}

export default function OpportunityTypeConfig() {
  const [types, setTypes] = useState<OpportunityType[]>(opportunityTypes)
  const [selectedType, setSelectedType] = useState<OpportunityType | null>(null)
  const [selectedStage, setSelectedStage] = useState<OpportunityStage | null>(null)
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false)
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("types")

  const handleEditType = (type: OpportunityType) => {
    setSelectedType({ ...type })
    setIsTypeDialogOpen(true)
  }

  const handleEditStage = (type: OpportunityType, stage: OpportunityStage) => {
    setSelectedType({ ...type })
    setSelectedStage({ ...stage })
    setIsStageDialogOpen(true)
  }

  const handleSaveType = () => {
    if (!selectedType) return

    const updatedTypes = types.map((type) => (type.id === selectedType.id ? selectedType : type))
    setTypes(updatedTypes)
    setIsTypeDialogOpen(false)
  }

  const handleSaveStage = () => {
    if (!selectedType || !selectedStage) return

    const updatedStages = selectedType.stages.map((stage) => (stage.id === selectedStage.id ? selectedStage : stage))
    const updatedType = { ...selectedType, stages: updatedStages }
    const updatedTypes = types.map((type) => (type.id === updatedType.id ? updatedType : type))

    setTypes(updatedTypes)
    setIsStageDialogOpen(false)
  }

  const handleMoveStage = (typeId: string, stageId: string, direction: "up" | "down") => {
    const typeIndex = types.findIndex((type) => type.id === typeId)
    if (typeIndex === -1) return

    const type = types[typeIndex]
    const stageIndex = type.stages.findIndex((stage) => stage.id === stageId)
    if (stageIndex === -1) return

    const newStages = [...type.stages]
    const stage = newStages[stageIndex]

    if (direction === "up" && stageIndex > 0) {
      // Swap order values with the previous stage
      const prevStage = newStages[stageIndex - 1]
      const tempOrder = prevStage.order
      prevStage.order = stage.order
      stage.order = tempOrder

      // Sort stages by order
      newStages.sort((a, b) => a.order - b.order)
    } else if (direction === "down" && stageIndex < newStages.length - 1) {
      // Swap order values with the next stage
      const nextStage = newStages[stageIndex + 1]
      const tempOrder = nextStage.order
      nextStage.order = stage.order
      stage.order = tempOrder

      // Sort stages by order
      newStages.sort((a, b) => a.order - b.order)
    }

    const updatedType = { ...type, stages: newStages }
    const updatedTypes = [...types]
    updatedTypes[typeIndex] = updatedType
    setTypes(updatedTypes)
  }

  return (
    <div className="gba:space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="gba:grid gba:w-full gba:grid-cols-2">
          <TabsTrigger value="types">Opportunity Types</TabsTrigger>
          <TabsTrigger value="stages">Stages & Requirements</TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="gba:space-y-4">
          <div className="gba:flex gba:justify-between">
            <h2 className="gba:text-xl gba:font-bold">Opportunity Types</h2>
            <Button size="sm">
              <Plus className="gba:mr-2 gba:h-4 gba:w-4" />
              Add Type
            </Button>
          </div>

          <Card>
            <CardContent className="gba:p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Stages</TableHead>
                    <TableHead className="gba:w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {types.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="gba:font-medium">{type.name}</TableCell>
                      <TableCell>{type.description}</TableCell>
                      <TableCell>{type.stages.length}</TableCell>
                      <TableCell>
                        <div className="gba:flex gba:space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditType(type)}>
                            <Edit className="gba:h-4 gba:w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash className="gba:h-4 gba:w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages" className="gba:space-y-4">
          <div className="gba:flex gba:justify-between">
            <h2 className="gba:text-xl gba:font-bold">Stages & Requirements</h2>
            <Select>
              <SelectTrigger className="gba:w-[250px]">
                <SelectValue placeholder="Select opportunity type" />
              </SelectTrigger>
              <SelectContent>
                {types.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {types.map((type) => (
            <Card key={type.id} className="gba:mb-6">
              <CardHeader>
                <CardTitle>{type.name}</CardTitle>
                <CardDescription>{type.description}</CardDescription>
              </CardHeader>
              <CardContent className="gba:p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Requirements</TableHead>
                      <TableHead className="gba:w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {type.stages
                      .sort((a, b) => a.order - b.order)
                      .map((stage) => (
                        <TableRow key={stage.id}>
                          <TableCell>{stage.order}</TableCell>
                          <TableCell>
                            <div className="gba:flex gba:items-center gba:space-x-2">
                              <div className={`gba:h-3 gba:w-3 gba:rounded-full ${getStageBgColorClass(stage.color)}`}></div>
                              <span className="gba:font-medium">{stage.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{stage.description}</TableCell>
                          <TableCell>{stage.requirements?.length || 0}</TableCell>
                          <TableCell>
                            <div className="gba:flex gba:space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMoveStage(type.id, stage.id, "up")}
                                disabled={stage.order === 1}
                              >
                                <ChevronUp className="gba:h-4 gba:w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMoveStage(type.id, stage.id, "down")}
                                disabled={stage.order === type.stages.length}
                              >
                                <ChevronDown className="gba:h-4 gba:w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEditStage(type, stage)}>
                                <Edit className="gba:h-4 gba:w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="gba:flex gba:justify-end gba:p-4">
                <Button size="sm">
                  <Plus className="gba:mr-2 gba:h-4 gba:w-4" />
                  Add Stage
                </Button>
              </CardFooter>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Type Edit Dialog */}
      <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
        <DialogContent className="gba:sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Opportunity Type</DialogTitle>
            <DialogDescription>Update the details for this opportunity type.</DialogDescription>
          </DialogHeader>
          {selectedType && (
            <div className="gba:grid gba:gap-4 gba:py-4">
              <div className="gba:grid gba:grid-cols-4 gba:items-center gba:gap-4">
                <Label htmlFor="name" className="gba:text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={selectedType.name}
                  onChange={(e) => setSelectedType({ ...selectedType, name: e.target.value })}
                  className="gba:col-span-3"
                />
              </div>
              <div className="gba:grid gba:grid-cols-4 gba:items-center gba:gap-4">
                <Label htmlFor="description" className="gba:text-right">
                  Description
                </Label>
                <Input
                  id="description"
                  value={selectedType.description}
                  onChange={(e) => setSelectedType({ ...selectedType, description: e.target.value })}
                  className="gba:col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveType}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage Edit Dialog */}
      <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
        <DialogContent className="gba:sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Stage</DialogTitle>
            <DialogDescription>Update the details and requirements for this stage.</DialogDescription>
          </DialogHeader>
          {selectedStage && (
            <div className="gba:grid gba:gap-4 gba:py-4">
              <div className="gba:grid gba:grid-cols-4 gba:items-center gba:gap-4">
                <Label htmlFor="stageName" className="gba:text-right">
                  Name
                </Label>
                <Input
                  id="stageName"
                  value={selectedStage.name}
                  onChange={(e) => setSelectedStage({ ...selectedStage, name: e.target.value })}
                  className="gba:col-span-3"
                />
              </div>
              <div className="gba:grid gba:grid-cols-4 gba:items-center gba:gap-4">
                <Label htmlFor="stageDescription" className="gba:text-right">
                  Description
                </Label>
                <Input
                  id="stageDescription"
                  value={selectedStage.description}
                  onChange={(e) => setSelectedStage({ ...selectedStage, description: e.target.value })}
                  className="gba:col-span-3"
                />
              </div>
              <div className="gba:grid gba:grid-cols-4 gba:items-center gba:gap-4">
                <Label htmlFor="stageColor" className="gba:text-right">
                  Color
                </Label>
                <Select
                  value={selectedStage.color}
                  onValueChange={(value) => setSelectedStage({ ...selectedStage, color: value })}
                >
                  <SelectTrigger id="stageColor" className="gba:col-span-3">
                    <SelectValue placeholder="Select a color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="indigo">Indigo</SelectItem>
                    <SelectItem value="violet">Violet</SelectItem>
                    <SelectItem value="purple">Purple</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                    <SelectItem value="yellow">Yellow</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="gba:mt-4">
                <h4 className="gba:mb-2 gba:font-medium">Requirements</h4>
                {selectedStage.requirements && selectedStage.requirements.length > 0 ? (
                  <div className="gba:space-y-2">
                    {selectedStage.requirements.map((req, index) => (
                      <div key={req.id} className="gba:rounded-md gba:border gba:p-3">
                        <div className="gba:flex gba:items-center gba:justify-between">
                          <span className="gba:text-sm gba:font-medium">{req.description}</span>
                          <Button variant="ghost" size="icon">
                            <Trash className="gba:h-4 gba:w-4" />
                          </Button>
                        </div>
                        <div className="gba:mt-1 gba:text-xs gba:text-muted-foreground">
                          Type: {req.type}
                          {req.documentTypes && `, Document types: ${req.documentTypes.join(", ")}`}
                          {req.activityTypes && `, Activity types: ${req.activityTypes.join(", ")}`}
                          {req.decisionStatus && `, Decision status: ${req.decisionStatus}`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="gba:text-sm gba:text-muted-foreground">No requirements for this stage.</p>
                )}
                <Button size="sm" className="gba:mt-2">
                  <Plus className="gba:mr-2 gba:h-4 gba:w-4" />
                  Add Requirement
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStage}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
