"use client"

import { useState } from "react"

import { ProfileHeader } from "./components/ProfileHeader"
import { ActivityStream } from "./components/ActivityStream"
import { OrganizationCard } from "./components/OrganizationCard"
import { BioCard } from "./components/BioCard"
import { EmploymentHistory } from "./components/EmploymentHistory"
import { NotesSection } from "./components/NotesSection"

export function ContactProfile() {
  // State variables for UI interactions
  const [activitiesExpanded, setActivitiesExpanded] = useState(false)
  const [employmentExpanded, setEmploymentExpanded] = useState(false)
  const [expandedBio, setExpandedBio] = useState(false)
  
  return (
    <div className="gba:max-w-7xl gba:mx-auto gba:space-y-6">
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
        <ProfileHeader />
        
        <ActivityStream 
          activitiesExpanded={activitiesExpanded}
          setActivitiesExpanded={setActivitiesExpanded}
        />
        
        <div className="gba:flex gba:flex-col gba:gap-6">
          <OrganizationCard />
          <BioCard 
            expandedBio={expandedBio}
            setExpandedBio={setExpandedBio}
          />
        </div>
        
        <EmploymentHistory 
          employmentExpanded={employmentExpanded}
          setEmploymentExpanded={setEmploymentExpanded}
        />
        
        <NotesSection />
      </div>
    </div>
  )
}

export default ContactProfile
