import { ExternalLink, Globe, Mail, MapPin, Phone } from "lucide-react"
import { Badge } from "../../ContactProfile/common/components/ui/badge"
import { Card } from "../../ContactProfile/common/components/ui/card"
import { Separator } from "../../ContactProfile/common/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../ContactProfile/common/components/ui/tooltip"

export function ProfileHeader() {
  return (
    <Card className="gba:rounded-xl gba:shadow-sm gba:overflow-hidden gba:md:col-span-2 gba:border-gray-300">
      <div className="gba:bg-gradient-to-r gba:from-blue-50 gba:to-sky-50 gba:p-6">
        {/* Profile Header + Contact Details */}
        <div className="gba:flex gba:flex-col gba:md:flex-row gba:gap-6">
          {/* Left section - Profile Photo */}
          <div className="gba:flex gba:flex-col gba:items-center gba:md:items-start gba:gap-2">
            <div className="gba:relative gba:w-32 gba:h-32 gba:rounded-full gba:overflow-hidden gba:border-4 gba:border-white gba:shadow-sm">
              <img
                src="https://randomuser.me/api/portraits/women/65.jpg"
                alt="Emily Parker"
                className="gba:object-cover gba:w-full gba:h-full"
              />
            </div>
            <Badge className="gba:bg-blue-100 gba:text-blue-800 gba:hover:bg-blue-200 gba:border-0">Main Contact</Badge>
          </div>

          {/* Right section - Basic Info */}
          <div className="gba:flex-1">
            <div>
              <h1 className="gba:text-2xl gba:font-bold">Emily Parker</h1>
              <p className="gba:text-lg gba:text-muted-foreground">Senior Product Manager</p>
              <p className="gba:text-sm gba:text-muted-foreground">Technology Department</p>
            </div>
          </div>
        </div>

        <Separator className="gba:my-6 gba:bg-blue-200" />

        {/* Contact Information Section */}
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
          {/* Primary Contact Info */}
          <div className="gba:space-y-3">
            <div className="gba:flex gba:items-center gba:gap-2 gba:bg-blue-50 gba:p-2 gba:rounded-lg">
              <Mail className="gba:h-4 gba:w-4 gba:text-blue-600" />
              <a href="mailto:emily.parker@example.com" className="gba:text-blue-700 gba:hover:underline gba:font-medium">
                emily.parker@example.com
              </a>
            </div>

            <div className="gba:flex gba:items-center gba:gap-2 gba:bg-blue-50 gba:p-2 gba:rounded-lg">
              <Phone className="gba:h-4 gba:w-4 gba:text-blue-600" />
              <a href="tel:+1234567890" className="gba:text-blue-700 gba:hover:underline gba:font-medium">
                +1 (234) 567-890
              </a>
            </div>

            <div className="gba:flex gba:items-center gba:gap-2">
              <MapPin className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
              <span>San Francisco, CA</span>
            </div>
          </div>

          {/* Secondary Contact Info */}
          <div className="gba:space-y-3">
            <div className="gba:flex gba:items-center gba:gap-2">
              <svg
                className="gba:h-4 gba:w-4 gba:text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect
                  x="2"
                  y="9"
                  width="4"
                  height="12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="4"
                  cy="4"
                  r="2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <a
                href="https://linkedin.com/in/emilyparker"
                className="gba:text-primary gba:hover:underline gba:flex gba:items-center gba:gap-1"
                target="_blank" 
                rel="noopener noreferrer"
              >
                linkedin.com/in/emilyparker
                <ExternalLink className="gba:h-3 gba:w-3" />
              </a>
            </div>

            <div className="gba:flex gba:items-center gba:gap-2">
              <Globe className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
              <span>English, Spanish</span>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground gba:text-sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16" 
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="gba:h-4 gba:w-4"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>May 15, 1985</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Birth Date (PII)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </Card>
  )
}
