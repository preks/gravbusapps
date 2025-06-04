import type React from "react"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "./common/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./common/ui/dialog"
import { Input } from "./common/ui/input"
import { Label } from "./common/ui/label"
import { Textarea } from "./common/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./common/ui/select"
import { PlusCircle } from "lucide-react"

interface CreateInvestmentModalProps {
  opportunityId: string
  opportunityName: string
  opportunityValue?: string
  opportunityCurrency?: string
  companyId?: string
}

export default function CreateInvestmentModal({
  opportunityId,
  opportunityName,
  opportunityValue,
  opportunityCurrency,
  companyId,
}: CreateInvestmentModalProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  let navigate: any;
  try {
    navigate = useNavigate();
  } catch (error) {
    navigate = {
      navigate: (n: number) => console.log("Navigation not available"),
      refresh: () => window.location.reload(),
    };
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      formData.append("opportunityId", opportunityId)

      const response = await fetch("/api/investments", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to create investment")
      }

      // Use safe navigation
      try {
        if (typeof navigate === 'function') {
          navigate(0)
        } else if (navigate && navigate.refresh) {
          navigate.refresh()
        } else {
          window.location.reload()
        }
      } catch (error) {
        // If navigation fails, just reload the page
        window.location.reload()
      }
      
      setOpen(false)
    } catch (error) {
      console.error("Error creating investment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gba:border-gray-300 gba:hover:bg-gray-50">
          <PlusCircle className="gba:mr-2 gba:h-4 gba:w-4" />
          Create Investment from Opportunity
        </Button>
      </DialogTrigger>
      <DialogContent className="gba:sm:max-w-[600px] gba:p-0 gba:fixed gba:top-1/2 gba:left-1/2 gba:transform -translate-x-1/2 -translate-y-1/2 gba:bg-white gba:rounded-md gba:shadow-lg">
        <div className="gba:p-4 gba:pb-2">
          <DialogHeader>
            <DialogTitle className="gba:text-lg gba:font-medium">Create Investment from Opportunity</DialogTitle>
            <DialogDescription className="gba:text-sm gba:text-gray-500">
              Create a new investment based on this opportunity. The investment will be automatically linked to this
              opportunity.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="gba:grid gba:gap-4 gba:py-4 gba:px-5">
            <div className="gba:grid gba:grid-cols-4 gba:items-center gba:gap-4">
              <Label htmlFor="name" className="gba:text-right">
                Name
              </Label>
              <Input id="name" name="name" defaultValue={opportunityName} className="gba:col-span-3 gba:border-gray-300" required />
            </div>
            <div className="gba:grid gba:grid-cols-4 gba:items-center gba:gap-4">
              <Label htmlFor="type" className="gba:text-right">
                Type
              </Label>
              <Select name="type" defaultValue="Venture Capital" required>
                <SelectTrigger className="gba:col-span-3 gba:border-gray-300">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="gba:z-50 gba:bg-white gba:border gba:border-gray-300 gba:rounded gba:shadow-md">
                  <SelectItem value="Strategic Investment">Strategic Investment</SelectItem>
                  <SelectItem value="Majority Stake">Majority Stake</SelectItem>
                  <SelectItem value="Minority Stake">Minority Stake</SelectItem>
                  <SelectItem value="Venture Capital">Venture Capital</SelectItem>
                  <SelectItem value="Co-Investment">Co-Investment</SelectItem>
                  <SelectItem value="Private Equity">Private Equity</SelectItem>
                  <SelectItem value="Real Estate Property">Real Estate Property</SelectItem>
                  <SelectItem value="Real Estate Project Development">Real Estate Project Development</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="gba:grid gba:grid-cols-4 gba:items-center gba:gap-4">
              <Label htmlFor="stage" className="gba:text-right">
                Stage
              </Label>
              <Select name="stage" defaultValue="Pipeline" required>
                <SelectTrigger className="gba:col-span-3 gba:border-gray-300">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent className="gba:z-50 gba:bg-white gba:border gba:border-gray-300 gba:rounded gba:shadow-md">
                  <SelectItem value="Pipeline">Pipeline</SelectItem>
                  <SelectItem value="Hold">Hold</SelectItem>
                  <SelectItem value="Exit">Exit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="gba:grid gba:grid-cols-4 gba:items-center gba:gap-4">
              <Label htmlFor="amount" className="gba:text-right">
                Amount
              </Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                defaultValue={opportunityValue || "0"}
                className="gba:col-span-3 gba:border-gray-300"
                required
              />
            </div>
            <div className="gba:grid gba:grid-cols-4 gba:items-center gba:gap-4">
              <Label htmlFor="currency" className="gba:text-right">
                Currency
              </Label>
              <Select name="currency" defaultValue={opportunityCurrency || "USD"} required>
                <SelectTrigger className="gba:col-span-3 gba:border-gray-300">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="gba:z-50 gba:bg-white gba:border gba:border-gray-300 gba:rounded gba:shadow-md">
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="gba:grid gba:grid-cols-4 gba:items-center gba:gap-4">
              <Label htmlFor="sector" className="gba:text-right">
                Sector
              </Label>
              <Input id="sector" name="sector" className="gba:col-span-3 gba:border-gray-300" />
            </div>
            <div className="gba:grid gba:grid-cols-4 gba:items-center gba:gap-4">
              <Label htmlFor="description" className="gba:text-right">
                Description
              </Label>
              <Textarea id="description" name="description" className="gba:col-span-3 gba:border-gray-300" />
            </div>
            <input type="hidden" name="companyId" value={companyId || ""} />
          </div>
          <DialogFooter className="gba:flex gba:justify-end gba:gap-2 gba:p-4 gba:border-t gba:border-gray-200">
            <Button type="button" variant="outline" className="gba:border-gray-300 gba:px-4" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="gba:bg-black gba:hover:bg-gray-800 gba:text-white gba:px-4" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Investment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
