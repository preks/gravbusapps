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
        <DialogOverlay className="bg-black/50" />
        <DialogContent className="sm:max-w-[600px] p-0 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-md shadow-lg">
          <div className="p-4 pb-2">
            <div>
              <h3 className="text-lg font-medium">Create New Opportunity</h3>
              <p className="text-sm text-gray-500">Add a new sales opportunity to your pipeline.</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2 border-b border-gray-200 bg-gray-50">
                <TabsTrigger 
                  value="basic" 
                  className="data-[state=active]:bg-white data-[state=active]:border-b-0 rounded-none py-2 px-1 text-sm font-medium data-[state=active]:font-semibold"
                >
                  Basic Info
                </TabsTrigger>
                <TabsTrigger 
                  value="details" 
                  className="data-[state=active]:bg-white data-[state=active]:border-b-0 rounded-none py-2 px-1 text-sm font-medium data-[state=active]:font-semibold"
                >
                  Details
                </TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-4 py-4 px-5 bg-white">
                <div className="grid grid-cols-5 items-center gap-3">
                  <Label htmlFor="name" className="text-right col-span-1">
                    Name
                  </Label>
                  <Input id="name" name="name" placeholder="Opportunity name" className="col-span-4 border-gray-300" required />
                </div>
                
                <div className="grid grid-cols-5 items-center gap-3">
                  <Label htmlFor="type" className="text-right col-span-1">
                    Type
                  </Label>
                  <Select
                    name="type"
                    defaultValue={type}
                    onValueChange={(value) => setType(value as "incoming" | "outgoing")}
                    required
                  >
                    <SelectTrigger className="col-span-4 border-gray-300">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white border border-gray-300 rounded shadow-md w-full">
                      <SelectItem value="incoming">Incoming</SelectItem>
                      <SelectItem value="outgoing">Outgoing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-5 items-center gap-3">
                  <Label htmlFor="companyId" className="text-right col-span-1">
                    Company
                  </Label>
                  <Select name="companyId">
                    <SelectTrigger className="col-span-4 border-gray-300">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white border border-gray-300 rounded shadow-md w-full">
                      {companies?.map((company) => (
                        <SelectItem key={company?.id} value={company?.id}>
                          {company?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-5 items-center gap-3">
                  <Label htmlFor="pipelineId" className="text-right col-span-1">
                    Pipeline
                  </Label>
                  <Select name="pipelineId" required>
                    <SelectTrigger className="col-span-4 border-gray-300">
                      <SelectValue placeholder="Select pipeline" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white border border-gray-300 rounded shadow-md w-full">
                      {pipelines?.map((pipeline) => (
                        <SelectItem key={pipeline?.id} value={pipeline?.id}>
                          {pipeline?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-5 items-center gap-3">
                  <Label htmlFor="investmentId" className="text-right col-span-1">
                    Investment
                  </Label>
                  <Select name="investmentId">
                    <SelectTrigger className="col-span-4 border-gray-300">
                      <SelectValue placeholder="Select investment (optional)" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white border border-gray-300 rounded shadow-md w-full">
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
              
              <TabsContent value="details" className="space-y-4 py-4 px-5 bg-white">
                <div className="grid grid-cols-5 items-center gap-3">
                  <Label htmlFor="value" className="text-right col-span-1">
                    Value
                  </Label>
                  <Input id="value" name="value" placeholder="Opportunity value" className="col-span-4 border-gray-300" />
                </div>
                
                <div className="grid grid-cols-5 items-center gap-3">
                  <Label htmlFor="currency" className="text-right col-span-1">
                    Currency
                  </Label>
                  <Select name="currency" defaultValue="USD">
                    <SelectTrigger className="col-span-4 border-gray-300">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white border border-gray-300 rounded shadow-md w-full">
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="JPY">JPY</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-5 items-center gap-3">
                  <Label htmlFor="description" className="text-right col-span-1">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Opportunity description"
                    className="col-span-4 border-gray-300"
                  />
                </div>
                
                {type === "incoming" && (
                  <>
                    <div className="grid grid-cols-5 items-center gap-3">
                      <Label htmlFor="investmentType" className="text-right col-span-1">
                        Investment Type
                      </Label>
                      <Select name="investmentType" defaultValue="equity">
                        <SelectTrigger className="col-span-4 border-gray-300">
                          <SelectValue placeholder="Select investment type" />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-white border border-gray-300 rounded shadow-md w-full">
                          <SelectItem value="equity">Equity</SelectItem>
                          <SelectItem value="debt">Debt</SelectItem>
                          <SelectItem value="convertible">Convertible</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-5 items-center gap-3">
                      <Label htmlFor="targetROI" className="text-right col-span-1">
                        Target ROI
                      </Label>
                      <Input id="targetROI" name="targetROI" placeholder="Target ROI" className="col-span-4 border-gray-300" />
                    </div>
                  </>
                )}
                {type === "outgoing" && (
                  <>
                    <div className="grid grid-cols-5 items-center gap-3">
                      <Label htmlFor="assetType" className="text-right col-span-1">
                        Asset Type
                      </Label>
                      <Select name="assetType" defaultValue="property">
                        <SelectTrigger className="col-span-4 border-gray-300">
                          <SelectValue placeholder="Select asset type" />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-white border border-gray-300 rounded shadow-md w-full">
                          <SelectItem value="property">Property</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="equipment">Equipment</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-5 items-center gap-3">
                      <Label htmlFor="askingPrice" className="text-right col-span-1">
                        Asking Price
                      </Label>
                      <Input id="askingPrice" name="askingPrice" placeholder="Asking price" className="col-span-4 border-gray-300" />
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <Button type="button" variant="outline" className="border-gray-300 px-4" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-black hover:bg-gray-800 text-white px-4" disabled={isSubmitting}>
                Create Opportunity
              </Button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
