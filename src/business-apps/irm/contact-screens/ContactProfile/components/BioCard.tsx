import { FC, useState } from "react"
import { Button } from "../common/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../common/components/ui/card"
import { Contact } from "../hooks/useContactData"

interface BioCardProps {
  contact: Contact | null;
}

export const BioCard: FC<BioCardProps> = ({ contact }) => {
  const [expanded, setExpanded] = useState(false)

  // If there's no bio, don't render the component
  if (!contact?.bio) {
    return null;
  }
  
  return (
    <Card className="gba:rounded-xl gba:shadow-sm gba:border-gray-300">
      <CardHeader className="gba:border-b gba:border-gray-300 gba:pb-3">
        <CardTitle>Bio</CardTitle>
      </CardHeader>
      <CardContent className="gba:pt-4">
        <p className="gba:text-sm gba:leading-relaxed">
          {expanded ? contact.bio : `${contact.bio.substring(0, 200)}${contact.bio.length > 200 ? '...' : ''}`}
        </p>
        {contact.bio.length > 200 && (
          <Button
            variant="link"
            className="gba:p-0 gba:h-auto gba:mt-2 gba:text-blue-600"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Read less" : "Read more"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
