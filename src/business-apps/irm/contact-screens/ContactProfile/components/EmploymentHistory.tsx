import { FC } from "react"
import { Building, Lightbulb, TrendingUp, Users2, BarChart3 } from "lucide-react"
import { Button } from "../common/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../common/components/ui/card"

interface EmploymentHistoryProps {
  employmentExpanded: boolean
  setEmploymentExpanded: (expanded: boolean) => void
}

export const EmploymentHistory: FC<EmploymentHistoryProps> = ({
  employmentExpanded,
  setEmploymentExpanded
}) => {
  // Employment history data
  const employmentHistory = [
    {
      id: 1,
      company: "Acme Corporation",
      position: "Senior Product Manager",
      department: "Technology",
      startDate: "2020-03",
      endDate: "Present",
      duration: "3 years 9 months",
      description:
        "Leading product strategy for enterprise software solutions. Managing cross-functional teams and driving product roadmap development.",
      achievements: [
        "Launched 3 major product releases that increased revenue by 45%",
        "Led the development of a new analytics platform",
        "Improved customer satisfaction scores by 32%",
      ],
    },
    {
      id: 2,
      company: "TechGiant Inc.",
      position: "Product Manager",
      department: "Consumer Products",
      startDate: "2017-06",
      endDate: "2020-02",
      duration: "2 years 8 months",
      description:
        "Managed the product lifecycle for consumer-facing applications. Collaborated with design and engineering teams to deliver innovative solutions.",
      achievements: [
        "Developed product strategy that resulted in 2M+ new users",
        "Optimized user onboarding, increasing conversion by 28%",
        "Recipient of the annual innovation award",
      ],
    },
    {
      id: 3,
      company: "InnovateSoft",
      position: "Associate Product Manager",
      department: "Mobile Applications",
      startDate: "2015-01",
      endDate: "2017-05",
      duration: "2 years 4 months",
      description:
        "Assisted in the development and launch of mobile applications. Conducted market research and competitive analysis.",
      achievements: [
        "Contributed to the successful launch of 5 mobile applications",
        "Implemented user feedback system that improved product iterations",
        "Coordinated beta testing programs with 500+ participants",
      ],
    },
    {
      id: 4,
      company: "StartupHub",
      position: "Product Analyst",
      department: "Product Development",
      startDate: "2013-09",
      endDate: "2014-12",
      duration: "1 year 3 months",
      description:
        "Analyzed product metrics and user behavior to inform product decisions. Supported the product team with data-driven insights.",
      achievements: [
        "Created dashboards that improved decision-making processes",
        "Identified key user segments that led to targeted feature development",
        "Contributed to 35% growth in user engagement",
      ],
    },
  ]

  // Career KPIs
  const careerKPIs = [
    {
      title: "Revenue Impact",
      value: "$12.5M",
      change: "+45%",
      icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
      description: "Cumulative revenue impact from product launches",
    },
    {
      title: "Team Leadership",
      value: "32",
      change: "+8",
      icon: <Users2 className="h-5 w-5 text-indigo-500" />,
      description: "Team members managed across projects",
    },
    {
      title: "Product Launches",
      value: "14",
      change: "+3",
      icon: <BarChart3 className="h-5 w-5 text-purple-500" />,
      description: "Successful product launches led",
    },
  ]

  const displayedEmploymentHistory = employmentExpanded ? employmentHistory : employmentHistory.slice(0, 3)

  return (
    <Card className="rounded-xl shadow-sm md:col-span-2 border-gray-300">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-300 pb-3">
        <CardTitle>Employment History</CardTitle>
        <a href="#" className="text-sm text-blue-700 hover:underline">
          View on LinkedIn
        </a>
      </CardHeader>
      <CardContent className="space-y-8 pt-4">
        {/* AI-Generated Career Summary */}
        <div className="relative p-[2px] rounded-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
          <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-1.5 rounded-full">
                <Lightbulb className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-medium text-blue-800">AI-Generated Career Summary</h3>
            </div>
            <p className="text-sm text-blue-900 mb-4">
              Emily Parker has over 10 years of progressive experience in product management, with a strong focus on
              enterprise software solutions. Her career shows consistent growth from analytical roles to strategic
              leadership positions, demonstrating expertise in product development, team leadership, and revenue
              growth.
            </p>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              {careerKPIs.map((kpi, index) => (
                <div key={index} className="bg-white rounded-lg p-3 shadow-sm border border-gray-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-muted-foreground">{kpi.title}</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-xl font-bold">{kpi.value}</p>
                        <span className="text-xs font-medium text-green-600">{kpi.change}</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-full bg-blue-50">{kpi.icon}</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative pl-20">
          {/* Timeline line */}
          <div className="absolute left-[31px] top-0 bottom-0 w-[1px] border-l-2 border-dotted border-blue-300"></div>

          {displayedEmploymentHistory.map((job) => (
            <div key={job.id} className="mb-12 last:mb-0 relative">
              {/* Company icon - positioned absolutely */}
              <div className="absolute left-[-65px] top-0">
                <div className="rounded-full p-2 h-8 w-8 flex items-center justify-center bg-blue-100 text-blue-600">
                  <Building className="h-4 w-4" />
                </div>
              </div>

              {/* Job content */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">{job.position}</h3>
                  <div className="text-sm text-muted-foreground">
                    {job.startDate} — {job.endDate}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="font-medium">{job.company}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">{job.duration}</span>
                </div>

                <p className="text-sm mb-4">{job.description}</p>

                {job.achievements.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3 mt-2 border border-blue-100">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Key Achievements</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {job.achievements.map((achievement, i) => (
                        <li key={i} className="text-sm text-blue-900">
                          {achievement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* More/Less button */}
          {employmentHistory.length > 3 && (
            <div className="text-center mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEmploymentExpanded(!employmentExpanded)}
                className="rounded-md text-blue-700 hover:text-blue-800 hover:bg-blue-50"
              >
                {employmentExpanded ? "Show Less" : "Show More"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
