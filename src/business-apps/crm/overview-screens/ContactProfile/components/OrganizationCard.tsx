import { FC } from "react"
import { Badge } from "../common/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "../common/components/ui/card"
import { Contact } from "../hooks/useContactData"

// Helper function to format time difference
const formatTimeDifference = (date: Date): string => {
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
};

interface OrganizationCardProps {
  contact: Contact | null;
}

export const OrganizationCard: FC<OrganizationCardProps> = ({ contact }) => {
  return (
    <Card className="gba:rounded-xl gba:shadow-sm gba:border-gray-300">
      <CardHeader className="gba:border-b gba:border-gray-300 gba:pb-3">
        <CardTitle>Organization</CardTitle>
      </CardHeader>
      <CardContent className="gba:pt-4">
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
          <div className="gba:space-y-4">
            <div>
              <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">Account (Company)</p>
              <p className="gba:font-medium">{contact?.company || '-'}</p>
            </div>

            <div>
              <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">Owner</p>
              <p className="gba:font-medium">{contact?.accountOwner || '-'}</p>
            </div>

            <div>
              <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">Academic Title</p>
              <p className="gba:font-medium">{contact?.academicTitle || '-'}</p>
            </div>
          </div>

          <div className="gba:space-y-4">
            <div>
              <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">Source Systems</p>
              <div className="gba:flex gba:flex-wrap gba:gap-2">
       
              </div>
            </div>

            <div>
              <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">Last Contacted</p>
              <p className="gba:font-medium gba:text-blue-700">
                {contact?.lastContacted ? formatTimeDifference(new Date(contact.lastContacted)) : '-'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
