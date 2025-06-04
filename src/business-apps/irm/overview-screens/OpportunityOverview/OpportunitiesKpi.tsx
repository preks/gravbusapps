import { Card, CardContent } from "./common/ui/card";
import { Dialog, DialogContent, DialogPortal, DialogOverlay } from "./common/ui/dialog"

interface OpportunitiesKPIProps {
  opportunities: any[]
}

export default function OpportunitiesKPI({ opportunities }: OpportunitiesKPIProps) {
  <Dialog>
  <DialogPortal>   
    <DialogOverlay /> 
    <DialogContent>  
      ...
    </DialogContent>
  </DialogPortal>
</Dialog>
  const totalOpportunities = opportunities?.length

  const activeOpportunities = opportunities?.filter(
    (opp) => opp.stageName !== "Closed Won" && opp.stageName !== "Closed Lost",
  )?.length

  const totalValue = opportunities?.reduce((sum, opp) => {
    const value = Number.parseFloat(opp.value || "0")
    return isNaN(value) ? sum : sum + value
  }, 0)

  const winRate =
    opportunities?.length > 0
      ? Math.round(
          (opportunities.filter((opp) => opp.stageName === "Closed Won")?.length /
            opportunities.filter((opp) => opp.stageName === "Closed Won" || opp.stageName === "Closed Lost")?.length) *
            100,
        ) || 0
      : 0

  return (
    <div className="gba:grid gba:gap-4 gba:md:grid-cols-4">
      <Card>
        <CardContent className="gba:p-6">
          <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Total Opportunities</div>
          <div className="gba:text-2xl gba:font-bold">{totalOpportunities}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="gba:p-6">
          <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Active Opportunities</div>
          <div className="gba:text-2xl gba:font-bold">{activeOpportunities}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="gba:p-6">
          <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Total Value</div>
          <div className="gba:text-2xl gba:font-bold">$ {totalValue != undefined ? totalValue.toLocaleString() : 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="gba:p-6">
          <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Win Rate</div>
          <div className="gba:text-2xl gba:font-bold">{winRate}%</div>
        </CardContent>
      </Card>
    </div>
  )
}