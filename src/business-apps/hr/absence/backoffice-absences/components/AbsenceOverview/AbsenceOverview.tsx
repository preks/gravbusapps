import { Card } from 'antd';
import { RiCalendar2Line, RiTimeLine, RiPercentLine, RiAlertLine } from "@remixicon/react"
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext';


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
  totalAbsences: {
    aggregate: {
      count: number;
    };
  };
  allAbsences: {
    aggregate: {
      count: number;
      sum: {
        effectiveDays: number | null;
      };
    };
  };
  pendingAbsences: {
    aggregate: {
      count: number;
    };
  };
  approvedCount: {
    aggregate: {
      count: number;
    };
  };
}

export const AbsenceOverview: React.FC<BusinessAppContextProps> = ({ accessToken}) => {
  const graphQLClient = useGraphqlClient(accessToken)

  const [statusCards, setStatusCards] = useState<StatusCard[]>([
    {
      title: "Total Absences",
      count: 0,
      icon: <RiCalendar2Line className="gba:h-5 gba:w-5 gba:text-amber-400" />,
      change: {
        type: "increase",
        text: "No change",
      },
    },
    {
      title: "Average Duration",
      count: 0,
      icon: <RiTimeLine className="gba:h-5 gba:w-5 gba:text-emerald-400" />,
      change: {
        type: "decrease",
        text: "No change",
      },
    },
    {
      title: "Approval Rate",
      count: 0,
      icon: <RiPercentLine className="gba:h-5 gba:w-5 gba:text-violet-400" />,
      change: {
        type: "increase",
        text: "No change",
      },
    },
    {
      title: "To be Acknowledged",
      count: 0,
      icon: <RiAlertLine className="gba:h-5 gba:w-5 gba:text-sky-400" />,
      change: {
        type: "nochange",
        text: "No change",
      },
    }
  ])

  useEffect(() => {
    const fetchAndSetAbsenceData = async () => {
      try {
        const today = new Date();
        const todayDate = today.toISOString().split('T')[0];
        const currentYear = today.getFullYear();
        const firstDayOfYear = new Date(Date.UTC(currentYear, 0, 1)).toISOString().split('T')[0];

        
        const formatForGraphQL = (dateStr: string) => `${dateStr}T00:00:00.000Z`;
        
        const query = `
        query GetAbsenceOverview($startDate: timestamp!, $endDate: timestamp!, $today: timestamp!) {
          totalAbsences: EmployeeAbsenceAggregate(
           where: {
              status: {_in: ["PENDING", "APPROVED", "REJECTED"]}, 
              startDate: {_gte: $startDate}, 
              endDate: {_lte: $endDate}, 
              isDeleted: {_eq: false}
            }
          ) {
            aggregate {
              count
          }
        }
          allAbsences: EmployeeAbsenceAggregate(
            where: {
              isDeleted: {_eq: false},
              status: {_in: ["PENDING", "APPROVED", "REJECTED"]},
              startDate: {_gte: $startDate, _lte: $endDate}
            }
          ) {
            aggregate {
              count
              sum {
                effectiveDays
              }
            }
        }
          pendingAbsences: EmployeeAbsenceAggregate(
            where: {
              startDate: {_lte: $today},
              endDate: {_gte: $today},
              isDeleted: {_eq: false},
              status: {_eq: "PENDING"}
            }
          ) {
            aggregate {
              count
            }
          }
          approvedCount: EmployeeAbsenceAggregate(
            where: {
              status: {_eq: "APPROVED"},
              isDeleted: {_eq: false},
              _or: [
                { startDate: {_gte: $startDate, _lte: $endDate} },
                { 
                  startDate: {_lte: $endDate},
                  endDate: {_gte: $startDate}
                }
              ]
            }
          ) {
            aggregate {
              count
            }
          }
        }`;
        
        const variables = {
          startDate: formatForGraphQL(firstDayOfYear),
          endDate: formatForGraphQL(todayDate),
          today: formatForGraphQL(todayDate)
        };
        
        console.log('Query variables:', {
          firstDayOfYear,
          todayDate,
          formattedVariables: {
            startDate: variables.startDate,
            endDate: variables.endDate,
            today: variables.today
          }
        });
        
        console.log('Executing GraphQL query...');
        const result = await graphQLClient.request<AbsenceOverviewResponse>(query, variables);
        console.log('Query result:', JSON.stringify(result, null, 2));

        console.log('Raw result values:', {
          totalAbsences: result.totalAbsences?.aggregate?.count,
          allAbsencesCount: result.allAbsences?.aggregate?.count,
          effectiveDaysSum: result.allAbsences?.aggregate?.sum?.effectiveDays,
          approvedCount: result.approvedCount?.aggregate?.count,
          pendingCount: result.pendingAbsences?.aggregate?.count
        });

        const totalAbsences = result.totalAbsences?.aggregate?.count || 0;
        const totalAbsencesCount = result.allAbsences?.aggregate?.count || 0;
        const totalEffectiveDays = result.allAbsences?.aggregate?.sum?.effectiveDays || 0;
        const approvedCount = result.approvedCount?.aggregate?.count ?? 0;
        const pendingAbsences = result.pendingAbsences?.aggregate?.count ?? 0;
        
        const avgDuration = totalAbsencesCount > 0 
          ? Math.round((totalEffectiveDays / totalAbsencesCount) * 10) / 10 
          : 0;
          
        const approvalRate = totalAbsencesCount > 0 
          ? Math.round((approvedCount / totalAbsencesCount) * 100) 
          : 0;

        setStatusCards(prevCards => {
          const cards = [...prevCards]
          cards[0].count = totalAbsences
          cards[1].count = avgDuration
          cards[2].count = approvalRate
          cards[3].count = pendingAbsences
          return cards
        })
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
              <div>
                <span className="gba:text-2xl gba:font-bold">{card.count}</span>
                {card.title === 'Average Duration' && <span className="gba:ml-1 gba:text-sm">days</span>}
              </div>
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