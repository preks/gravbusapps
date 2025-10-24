import React from 'react'
import { Card, CardHeader, CardContent } from '@newwork/nw-design-system'
import { User } from '@phosphor-icons/react'
import { Mail, Phone } from 'lucide-react'

interface ContactInfoCardProps {
  firstName?: string
  lastName?: string
  email?: string
  phoneNumber?: string
  position?: string
  department?: string
}

export const ContactInfoCard: React.FC<ContactInfoCardProps> = ({
  firstName,
  lastName,
  email,
  phoneNumber,
  position,
  department
}) => {
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const hasData = fullName || email || phoneNumber || position || department

  return (
    <Card className="gba:h-full" data-testid="lead-contact-info-card">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:gap-2">
          <User size={20} className="gba:text-muted-foreground" />
          <h3 className="gba:text-lg gba:font-semibold">Contact Information</h3>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="gba:text-muted-foreground gba:text-sm">No contact information available</div>
        ) : (
          <div className="gba:space-y-3">
            {fullName && (
              <div className="gba:flex gba:flex-col gba:gap-1">
                <span className="gba:text-xs gba:text-muted-foreground">Name</span>
                <span className="gba:font-medium">{fullName}</span>
              </div>
            )}
            {position && (
              <div className="gba:flex gba:flex-col gba:gap-1">
                <span className="gba:text-xs gba:text-muted-foreground">Position</span>
                <span>{position}</span>
              </div>
            )}
            {department && (
              <div className="gba:flex gba:flex-col gba:gap-1">
                <span className="gba:text-xs gba:text-muted-foreground">Department</span>
                <span>{department}</span>
              </div>
            )}
            {email && (
              <div className="gba:flex gba:flex-col gba:gap-1">
                <span className="gba:text-xs gba:text-muted-foreground">Email</span>
                <a
                  href={`mailto:${email}`}
                  className="gba:text-primary gba:hover:underline gba:flex gba:items-center gba:gap-2 gba:break-all"
                >
                  <Mail size={14} />
                  {email}
                </a>
              </div>
            )}
            {phoneNumber && (
              <div className="gba:flex gba:flex-col gba:gap-1">
                <span className="gba:text-xs gba:text-muted-foreground">Phone</span>
                <a
                  href={`tel:${phoneNumber}`}
                  className="gba:text-primary gba:hover:underline gba:flex gba:items-center gba:gap-2"
                >
                  <Phone size={14} />
                  {phoneNumber}
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
