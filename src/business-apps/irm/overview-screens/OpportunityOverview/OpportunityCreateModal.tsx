"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "./common/ui/button"
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogOverlay,
} from "./common/ui/dialog"
import { Input } from "./common/ui/input"
import { Label } from "./common/ui/label"
import { Textarea } from "./common/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./common/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./common/ui/tabs"

interface OpportunityCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pipelines: { id: string; name: string }[]
  companies: { id: string; name: string }[]
  investments?: { id: string; name: string }[]
  onSuccess?: () => void
}

export default function OpportunityCreateModal({
  open,
  onOpenChange,
  pipelines,
  companies,
  investments = [],
  onSuccess
}: OpportunityCreateModalProps) {
  const [type, setType] = useState<"incoming" | "outgoing">("incoming")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)

      console.log("Form data submitted:", Object.fromEntries(formData))
      
      setTimeout(() => {
        onOpenChange(false)
        
        if (onSuccess) {
          onSuccess()
        }
        
        setIsSubmitting(false)
      }, 500)
    } catch (error) {
      console.error("Error creating opportunity:", error)
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="gba:bg-black/50" />
        <DialogContent className="gba:sm:max-w-[600px] gba:p-0 gba:fixed gba:top-1/2 gba:left-1/2 gba:transform -translate-x-1/2 -translate-y-1/2 gba:bg-white gba:rounded-md gba:shadow-lg">
          <div className="gba:p-4 gba:pb-2">
            <div>
              <h3 className="gba:text-lg gba:font-medium">Create New Opportunity</h3>
              <p className="gba:text-sm gba:text-gray-500">Add a new sales opportunity to your pipeline.</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="basic" className="gba:w-full">
              <TabsList className="gba:grid gba:w-full gba:grid-cols-2 gba:border-b gba:border-gray-200 gba:bg-gray-50">
                <TabsTrigger 
                  value="basic" 
                  className="gba:data-[state=active]:bg-white gba:data-[state=active]:border-b-0 gba:rounded-none gba:py-2 gba:px-1 gba:text-sm gba:font-medium gba:data-[state=active]:font-semibold"
                >
                  Basic Info
                </TabsTrigger>
                <TabsTrigger 
                  value="details" 
                  className="gba:data-[state=active]:bg-white gba:data-[state=active]:border-b-0 gba:rounded-none gba:py-2 gba:px-1 gba:text-sm gba:font-medium gba:data-[state=active]:font-semibold"
                >
                  Details
                </TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="gba:space-y-4 gba:py-4 gba:px-5 gba:bg-white">
                <div className="gba:grid gba:grid-cols-5 gba:items-center gba:gap-3">
                  <Label htmlFor="name" className="gba:text-right gba:col-span-1">
                    Name
                  </Label>
                  <Input id="name" name="name" placeholder="Opportunity name" className="gba:col-span-4 gba:border-gray-300" required />
                </div>
                
                <div className="gba:grid gba:grid-cols-5 gba:items-center gba:gap-3">
                  <Label htmlFor="type" className="gba:text-right gba:col-span-1">
                    Type
                  </Label>
                  <Select
                    name="type"
                    defaultValue={type}
                    onValueChange={(value) => setType(value as "incoming" | "outgoing")}
                    required
                  >
                    <SelectTrigger className="gba:col-span-4 gba:border-gray-300">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="gba:z-50 gba:bg-white gba:border gba:border-gray-300 gba:rounded gba:shadow-md gba:w-full">
                      <SelectItem value="incoming">Incoming</SelectItem>
                      <SelectItem value="outgoing">Outgoing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="gba:grid gba:grid-cols-5 gba:items-center gba:gap-3">
                  <Label htmlFor="companyId" className="gba:text-right gba:col-span-1">
                    Company
                  </Label>
                  <Select name="companyId">
                    <SelectTrigger className="gba:col-span-4 gba:border-gray-300">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent className="gba:z-50 gba:bg-white gba:border gba:border-gray-300 gba:rounded gba:shadow-md gba:w-full">
                      {companies?.map((company) => (
                        <SelectItem key={company?.id} value={company?.id}>
                          {company?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="gba:grid gba:grid-cols-5 gba:items-center gba:gap-3">
                  <Label htmlFor="pipelineId" className="gba:text-right gba:col-span-1">
                    Pipeline
                  </Label>
                  <Select name="pipelineId" required>
                    <SelectTrigger className="gba:col-span-4 gba:border-gray-300">
                      <SelectValue placeholder="Select pipeline" />
                    </SelectTrigger>
                    <SelectContent className="gba:z-50 gba:bg-white gba:border gba:border-gray-300 gba:rounded gba:shadow-md gba:w-full">
                      {pipelines?.map((pipeline) => (
                        <SelectItem key={pipeline?.id} value={pipeline?.id}>
                          {pipeline?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="gba:grid gba:grid-cols-5 gba:items-center gba:gap-3">
                  <Label htmlFor="investmentId" className="gba:text-right gba:col-span-1">
                    Investment
                  </Label>
                  <Select name="investmentId">
                    <SelectTrigger className="gba:col-span-4 gba:border-gray-300">
                      <SelectValue placeholder="Select investment (optional)" />
                    </SelectTrigger>
                    <SelectContent className="gba:z-50 gba:bg-white gba:border gba:border-gray-300 gba:rounded gba:shadow-md gba:w-full">
                      <SelectItem value="none">None</SelectItem>
                      {investments?.map((investment) => (
                        <SelectItem key={investment?.id} value={investment?.id}>
                          {investment?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              
              <TabsContent value="details" className="gba:space-y-4 gba:py-4 gba:px-5 gba:bg-white">
                <div className="gba:grid gba:grid-cols-5 gba:items-center gba:gap-3">
                  <Label htmlFor="value" className="gba:text-right gba:col-span-1">
                    Value
                  </Label>
                  <Input id="value" name="value" placeholder="Opportunity value" className="gba:col-span-4 gba:border-gray-300" />
                </div>
                
                <div className="gba:grid gba:grid-cols-5 gba:items-center gba:gap-3">
                  <Label htmlFor="currency" className="gba:text-right gba:col-span-1">
                    Currency
                  </Label>
                  <Select name="currency" defaultValue="USD">
                    <SelectTrigger className="gba:col-span-4 gba:border-gray-300">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className="gba:z-50 gba:bg-white gba:border gba:border-gray-300 gba:rounded gba:shadow-md gba:w-full">
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="JPY">JPY</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="gba:grid gba:grid-cols-5 gba:items-center gba:gap-3">
                  <Label htmlFor="description" className="gba:text-right gba:col-span-1">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Opportunity description"
                    className="gba:col-span-4 gba:border-gray-300"
                  />
                </div>
                
                {type === "incoming" && (
                  <>
                    <div className="gba:grid gba:grid-cols-5 gba:items-center gba:gap-3">
                      <Label htmlFor="investmentType" className="gba:text-right gba:col-span-1">
                        Investment Type
                      </Label>
                      <Select name="investmentType" defaultValue="equity">
                        <SelectTrigger className="gba:col-span-4 gba:border-gray-300">
                          <SelectValue placeholder="Select investment type" />
                        </SelectTrigger>
                        <SelectContent className="gba:z-50 gba:bg-white gba:border gba:border-gray-300 gba:rounded gba:shadow-md gba:w-full">
                          <SelectItem value="equity">Equity</SelectItem>
                          <SelectItem value="debt">Debt</SelectItem>
                          <SelectItem value="convertible">Convertible</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="gba:grid gba:grid-cols-5 gba:items-center gba:gap-3">
                      <Label htmlFor="targetROI" className="gba:text-right gba:col-span-1">
                        Target ROI
                      </Label>
                      <Input id="targetROI" name="targetROI" placeholder="Target ROI" className="gba:col-span-4 gba:border-gray-300" />
                    </div>
                  </>
                )}
                {type === "outgoing" && (
                  <>
                    <div className="gba:grid gba:grid-cols-5 gba:items-center gba:gap-3">
                      <Label htmlFor="assetType" className="gba:text-right gba:col-span-1">
                        Asset Type
                      </Label>
                      <Select name="assetType" defaultValue="property">
                        <SelectTrigger className="gba:col-span-4 gba:border-gray-300">
                          <SelectValue placeholder="Select asset type" />
                        </SelectTrigger>
                        <SelectContent className="gba:z-50 gba:bg-white gba:border gba:border-gray-300 gba:rounded gba:shadow-md gba:w-full">
                          <SelectItem value="property">Property</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="equipment">Equipment</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="gba:grid gba:grid-cols-5 gba:items-center gba:gap-3">
                      <Label htmlFor="askingPrice" className="gba:text-right gba:col-span-1">
                        Asking Price
                      </Label>
                      <Input id="askingPrice" name="askingPrice" placeholder="Asking price" className="gba:col-span-4 gba:border-gray-300" />
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
            
            <div className="gba:flex gba:justify-end gba:gap-2 gba:p-4 gba:border-t gba:border-gray-200">
              <Button type="button" variant="outline" className="gba:border-gray-300 gba:px-4" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gba:bg-black gba:hover:bg-gray-800 gba:text-white gba:px-4" disabled={isSubmitting}>
                Create Opportunity
              </Button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
