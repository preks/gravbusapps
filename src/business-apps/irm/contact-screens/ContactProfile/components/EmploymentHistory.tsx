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
      icon: <TrendingUp className="gba:h-5 gba:w-5 gba:text-blue-500" />,
      description: "Cumulative revenue impact from product launches",
    },
    {
      title: "Team Leadership",
      value: "32",
      change: "+8",
      icon: <Users2 className="gba:h-5 gba:w-5 gba:text-indigo-500" />,
      description: "Team members managed across projects",
    },
    {
      title: "Product Launches",
      value: "14",
      change: "+3",
      icon: <BarChart3 className="gba:h-5 gba:w-5 gba:text-purple-500" />,
      description: "Successful product launches led",
    },
  ]

  const displayedEmploymentHistory = employmentExpanded ? employmentHistory : employmentHistory.slice(0, 3)

  return (
    <Card className="gba:rounded-xl gba:shadow-sm gba:md:col-span-2 gba:border-gray-300">
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:border-b gba:border-gray-300 gba:pb-3">
        <CardTitle>Employment History</CardTitle>
        <a href="#" className="gba:text-sm gba:text-blue-700 gba:hover:underline">
          View on LinkedIn
        </a>
      </CardHeader>
      <CardContent className="gba:space-y-8 gba:pt-4">
        {/* AI-Generated Career Summary */}
        <div className="gba:relative gba:p-[2px] gba:rounded-lg gba:bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
          <div className="gba:bg-gradient-to-r from-blue-50 to-sky-50 gba:rounded-lg gba:p-4">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
              <div className="gba:bg-gradient-to-r from-blue-500 to-purple-500 gba:p-1.5 gba:rounded-full">
                <Lightbulb className="gba:h-4 gba:w-4 gba:text-white" />
              </div>
              <h3 className="gba:font-medium gba:text-blue-800">AI-Generated Career Summary</h3>
            </div>
            <p className="gba:text-sm gba:text-blue-900 gba:mb-4">
              Emily Parker has over 10 years of progressive experience in product management, with a strong focus on
              enterprise software solutions. Her career shows consistent growth from analytical roles to strategic
              leadership positions, demonstrating expertise in product development, team leadership, and revenue
              growth.
            </p>

            {/* KPI Cards */}
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-3 gba:mt-2">
              {careerKPIs.map((kpi, index) => (
                <div key={index} className="gba:bg-white gba:rounded-lg gba:p-3 gba:shadow-sm gba:border gba:border-gray-300">
                  <div className="gba:flex gba:justify-between gba:items-start">
                    <div>
                      <p className="gba:text-xs gba:text-muted-foreground">{kpi.title}</p>
                      <div className="gba:flex gba:items-baseline gba:gap-1">
                        <p className="gba:text-xl gba:font-bold">{kpi.value}</p>
                        <span className="gba:text-xs gba:font-medium gba:text-green-600">{kpi.change}</span>
                      </div>
                    </div>
                    <div className="gba:p-2 gba:rounded-full gba:bg-blue-50">{kpi.icon}</div>
                  </div>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{kpi.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="gba:relative gba:pl-20">
          {/* Timeline line */}
          <div className="gba:absolute gba:left-[31px] gba:top-0 gba:bottom-0 gba:w-[1px] gba:border-l-2 gba:border-dotted gba:border-blue-300"></div>

          {displayedEmploymentHistory.map((job) => (
            <div key={job.id} className="gba:mb-12 last:mb-0 gba:relative">
              {/* Company icon - positioned absolutely */}
              <div className="gba:absolute gba:left-[-65px] gba:top-0">
                <div className="gba:rounded-full gba:p-2 gba:h-8 gba:w-8 gba:flex gba:items-center gba:justify-center gba:bg-blue-100 gba:text-blue-600">
                  <Building className="gba:h-4 gba:w-4" />
                </div>
              </div>

              {/* Job content */}
              <div className="gba:flex-1">
                <div className="gba:flex gba:flex-col gba:sm:flex-row gba:sm:items-center gba:justify-between gba:mb-2">
                  <h3 className="gba:font-semibold gba:text-lg">{job.position}</h3>
                  <div className="gba:text-sm gba:text-muted-foreground">
                    {job.startDate} — {job.endDate}
                  </div>
                </div>

                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
                  <span className="gba:font-medium">{job.company}</span>
                  <span className="gba:text-muted-foreground">•</span>
                  <span className="gba:text-sm gba:text-muted-foreground">{job.duration}</span>
                </div>

                <p className="gba:text-sm gba:mb-4">{job.description}</p>

                {job.achievements.length > 0 && (
                  <div className="gba:bg-blue-50 gba:rounded-lg gba:p-3 gba:mt-2 gba:border gba:border-blue-100">
                    <h4 className="gba:text-sm gba:font-medium gba:text-blue-800 gba:mb-2">Key Achievements</h4>
                    <ul className="gba:list-disc gba:pl-5 gba:space-y-1">
                      {job.achievements.map((achievement, i) => (
                        <li key={i} className="gba:text-sm gba:text-blue-900">
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
            <div className="gba:text-center gba:mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEmploymentExpanded(!employmentExpanded)}
                className="gba:rounded-md gba:text-blue-700 gba:hover:text-blue-800 gba:hover:bg-blue-50"
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
