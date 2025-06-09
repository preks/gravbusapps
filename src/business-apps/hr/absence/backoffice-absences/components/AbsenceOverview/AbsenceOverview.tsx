import { Card } from 'antd';
import { RiTimer2Line, RiCheckboxCircleLine, RiGroupLine, RiCalendarLine } from "@remixicon/react"
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface Absence {
  startDate: string;
  endDate: string;
  status: string;
  type: {
    value: string;
    code: string;
    id: string;
    objectValue: string;
    translations: {
      localeCode: string;
      value: string;
    }[];
  };
}

interface StatusCard {
  title: string;
  icon: React.ReactNode;
  count: number;
  change: {
    type: string;
    text: string;
  };
}

interface AbsenceOverviewResponse {
  allAbsencesFromToday: Absence[];
  membersAway: Absence[];
  pendingRequests: {
    aggregate: {
      sum: {
        effectiveDays: number;
      };
    };
  };
  approvedAbsences: {
    aggregate: {
      sum: {
        effectiveDays: number;
      };
    };
  };
}


export const AbsenceOverview: React.FC<BusinessAppContextProps> = ({ accessToken}) => {
  const graphQLClient = useGraphqlClient(accessToken)

  const [statusCards, setStatusCards] = useState<StatusCard[]>([
    {
      title: "Pending Requests",
      count: 0,
      icon: <RiTimer2Line className="gba:h-5 gba:w-5 gba:text-amber-400" />,
      change: {
        type: "increase",
        text: "No change",
      },
    },
    {
      title: "Approved Absences",
      count: 0,
      icon: <RiCheckboxCircleLine className="gba:h-5 gba:w-5 gba:text-emerald-400" />,
      change: {
        type: "decrease",
        text: "No change",
      },
    },
    {
      title: "Team Members Away",
      count: 0,
      icon: <RiGroupLine className="gba:h-5 gba:w-5 gba:text-violet-400" />,
      change: {
        type: "increase",
        text: "No change",
      },
    },
    {
      title: "Upcoming Absences",
      count: 0,
      icon: <RiCalendarLine className="gba:h-5 gba:w-5 gba:text-sky-400" />,
      change: {
        type: "nochange",
        text: "No change",
      },
    }
  ])

  useEffect(() => {
    const fetchAndSetAbsenceData = async () => {
      try {
        const todayDate = new Date().toISOString().split('T')[0];
        const currentYear = new Date().getFullYear();
        const lastDayOfYear = new Date(currentYear, 11, 31).toISOString().split('T')[0];
        
        const query = `
          query GetAbsenceOverview {
            allAbsencesFromToday: EmployeeAbsence(orderBy: {startDate: ASC}, limit: 5, where: {status: {_in: ["PENDING", "APPROVED"]}, startDate: {_gte: "${todayDate}"}, endDate: {_lte: "${lastDayOfYear}"}, isDeleted: {_eq: false}}) {
              startDate
              endDate
              status
              type {
                value
                code
                id
                objectValue
                translations {
                  localeCode
                  value
                }
              }
            }
            membersAway: EmployeeAbsence(orderBy: {startDate: ASC}, where: {status: {_in: ["PENDING", "APPROVED"]}, startDate: {_eq: "${todayDate}"}, isDeleted: {_eq: false}}) {
              startDate
              endDate
              status
              type {
                value
                code
                id
                objectValue
                translations {
                  localeCode
                  value
                }
              }
            }
            approvedAbsences: EmployeeAbsenceAggregate(where: {isDeleted: {_eq: false}, status: {_in: ["APPROVED"]}, startDate: {_eq: "${todayDate}"}}) {
              aggregate {
                sum {
                  effectiveDays
                }
              }
            }
            pendingRequests: EmployeeAbsenceAggregate(where: {isDeleted: {_eq: false}, status: {_in: ["PENDING"]}, startDate: {_eq: "${todayDate}"}}) {
              aggregate {
                sum {
                  effectiveDays
                }
              }
            }
          }
        `
        
        const result = await graphQLClient.request<AbsenceOverviewResponse>(query)

        const pendingRequests = result.pendingRequests.aggregate.sum.effectiveDays || 0
        const membersAwayCount = result.membersAway.length
        const upcomingAbsences = result.allAbsencesFromToday.length
        const approvedAbsences = result.approvedAbsences.aggregate.sum.effectiveDays || 0

        setStatusCards(prevCards => prevCards.map((card, index) => {
          const newCount = [pendingRequests, approvedAbsences, membersAwayCount, upcomingAbsences][index]
          return {
            ...card,
            count: newCount,
          }
        }))
      } catch (error) {
        console.error('Error fetching absence data:', error)
      }
    }

    fetchAndSetAbsenceData()
  }, [graphQLClient])


  return (
    <div className="gba:grid gba:grid-cols-4 gba:gap-4">
      {statusCards.map((card, index) => (
        <Card key={index} className="gba:hover:shadow-md gba:transition-shadow">
          <div className="gba:p-4 gba:flex gba:flex-col">
            <span className="gba:text-xs gba:text-muted-foreground gba:mb-1">{card.title}</span>

            <div className="gba:flex gba:justify-between gba:items-center gba:mb-3">
              <span className="gba:text-2xl gba:font-bold">{card.count}</span>
              {card.icon}
            </div>

            <div
              className={`gba:text-xs gba:flex gba:items-center gba:gap-1 ${
                card.change.type === "increase"
                  ? "gba:text-emerald-500"
                  : card.change.type === "decrease"
                    ? "gba:text-rose-500"
                    : "gba:text-gray-400"
              }`}
            >
              {card.change.type === "increase" && (
                <svg xmlns="http://www.w3.org/2000/svg" className="gba:h-3 gba:w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 8.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {card.change.type === "decrease" && (
                <svg xmlns="http://www.w3.org/2000/svg" className="gba:h-3 gba:w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {card.change.text}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}