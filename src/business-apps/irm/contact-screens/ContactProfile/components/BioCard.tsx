import { FC } from "react"
import { Button } from "../common/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../common/components/ui/card"

interface BioCardProps {
  expandedBio: boolean
  setExpandedBio: (expanded: boolean) => void
}

export const BioCard: FC<BioCardProps> = ({ expandedBio, setExpandedBio }) => {
  const bioText =
    "Emily Parker is a Senior Product Manager with over 10 years of experience in the technology sector. She specializes in enterprise software solutions and has led multiple successful product launches. Emily has a strong background in user experience design and agile methodologies.\n\nPrior to joining Acme Corporation, Emily worked at several leading tech companies where she developed expertise in market analysis, competitive positioning, and product strategy. She holds a Master's degree in Computer Science and is passionate about leveraging technology to solve complex business problems.\n\nEmily is known for her collaborative approach and ability to bridge the gap between technical and business stakeholders. She has successfully led cross-functional teams and delivered products that have significantly increased revenue and customer satisfaction. Her expertise in data-driven decision making and user-centered design has been instrumental in shaping the product roadmap at Acme Corporation.\n\nOutside of work, Emily is an active member of Women in Tech and regularly speaks at industry conferences on product management and innovation. She enjoys mentoring junior product managers and contributing to open-source projects in her spare time."

  return (
    <Card className="rounded-xl shadow-sm border-gray-300">
      <CardHeader className="border-b border-gray-300 pb-3">
        <CardTitle>Bio</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-2">
          <p className="text-sm leading-relaxed">{expandedBio ? bioText : bioText.substring(0, 250) + "..."}</p>
          {bioText.length > 250 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedBio(!expandedBio)}
              className="rounded-md text-blue-700 hover:text-blue-800 hover:bg-blue-50"
            >
              {expandedBio ? "Show less" : "Read more"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
