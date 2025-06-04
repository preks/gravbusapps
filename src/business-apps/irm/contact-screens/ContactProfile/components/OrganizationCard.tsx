import { Badge } from "../common/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "../common/components/ui/card"

export function OrganizationCard() {
  return (
    <Card className="gba:rounded-xl gba:shadow-sm gba:border-gray-300">
      <CardHeader className="gba:border-b gba:border-gray-300 gba:pb-3">
        <CardTitle>Organization</CardTitle>
      </CardHeader>
      <CardContent className="gba:pt-4">
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
          <div className="gba:space-y-4">
            <div>
              <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">Account</p>
              <a href="#" className="gba:text-lg gba:font-medium gba:text-primary hover:underline">
                Acme Corporation
              </a>
            </div>

            <div>
              <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">Owner</p>
              <p className="gba:font-medium">Sarah Johnson</p>
            </div>

            <div>
              <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">Academic Title</p>
              <p>MSc. Computer Science</p>
            </div>
          </div>

          <div className="gba:space-y-4">
            <div>
              <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">Source Systems</p>
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                <Badge variant="secondary" className="gba:bg-orange-100 gba:text-orange-800 gba:hover:bg-orange-200 gba:border-0">
                  CRM
                </Badge>
                <Badge variant="secondary" className="gba:bg-blue-100 gba:text-blue-800 gba:hover:bg-blue-200 gba:border-0">
                  IMS
                </Badge>
                <Badge variant="secondary" className="gba:bg-green-100 gba:text-green-800 gba:hover:bg-green-200 gba:border-0">
                  Marketing
                </Badge>
              </div>
            </div>

            <div>
              <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">Last Contacted</p>
              <p className="gba:font-medium gba:text-blue-700">3 days ago</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
