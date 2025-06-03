import { ExternalLink, Globe, Mail, MapPin, Phone } from "lucide-react"
import { Badge } from "../common/components/ui/badge"
import { Card } from "../common/components/ui/card"
import { Separator } from "../common/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../common/components/ui/tooltip"

export function ProfileHeader() {
  return (
    <Card className="rounded-xl shadow-sm overflow-hidden md:col-span-2 border-gray-300">
      <div className="bg-gradient-to-r from-blue-50 to-sky-50 p-6">
        {/* Profile Header + Contact Details */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left section - Profile Photo */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-sm">
              <img
                src="https://randomuser.me/api/portraits/women/65.jpg"
                alt="Emily Parker"
                className="object-cover w-full h-full"
              />
            </div>
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-0">Main Contact</Badge>
          </div>

          {/* Right section - Basic Info */}
          <div className="flex-1">
            <div>
              <h1 className="text-2xl font-bold">Emily Parker</h1>
              <p className="text-lg text-muted-foreground">Senior Product Manager</p>
              <p className="text-sm text-muted-foreground">Technology Department</p>
            </div>
          </div>
        </div>

        <Separator className="my-6 bg-blue-200" />

        {/* Contact Information Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Primary Contact Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg">
              <Mail className="h-4 w-4 text-blue-600" />
              <a href="mailto:emily.parker@example.com" className="text-blue-700 hover:underline font-medium">
                emily.parker@example.com
              </a>
            </div>

            <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg">
              <Phone className="h-4 w-4 text-blue-600" />
              <a href="tel:+1234567890" className="text-blue-700 hover:underline font-medium">
                +1 (234) 567-890
              </a>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>San Francisco, CA</span>
            </div>
          </div>

          {/* Secondary Contact Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-muted-foreground"
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
                className="text-primary hover:underline flex items-center gap-1"
                target="_blank" 
                rel="noopener noreferrer"
              >
                linkedin.com/in/emilyparker
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span>English, Spanish</span>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
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
                      className="h-4 w-4"
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
