import { Card } from 'antd';
import { RiTimer2Line, RiCheckboxCircleLine, RiGroupLine, RiCalendarLine } from "@remixicon/react"


const statusCards = [
  {
    title: "Pending Requests",
    count: 3,
    icon: <RiTimer2Line className="h-5 w-5 text-amber-400" />,
    change: {
      type: "increase",
      value: 2,
      text: "2 more",
    },
  },
  {
    title: "Approved Absences",
    count: 5,
    icon: <RiCheckboxCircleLine className="h-5 w-5 text-emerald-400" />,
    change: {
      type: "decrease",
      value: 1,
      text: "1 fewer",
    },
  },
  {
    title: "Team Members Away",
    count: 2,
    icon: <RiGroupLine className="h-5 w-5 text-violet-400" />,
    change: {
      type: "increase",
      value: 1,
      text: "1 more",
    },
  },
  {
    title: "Upcoming Absences",
    count: 4,
    icon: <RiCalendarLine className="h-5 w-5 text-sky-400" />,
    change: {
      type: "nochange",
      value: 0,
      text: "No change",
    },
  },
]

export const AbsenceOverview = () => {
  return (
    <div className="grid grid-cols-4 gap-4">
      {statusCards.map((card, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <div className="p-4 flex flex-col">
              <span className="text-xs text-muted-foreground mb-1">{card.title}</span>

              <div className="flex justify-between items-center mb-3">
                <span className="text-2xl font-bold">{card.count}</span>
                {card.icon}
              </div>

              <div
                className={`text-xs flex items-center gap-1 ${
                  card.change.type === "increase"
                    ? "text-emerald-500"
                    : card.change.type === "decrease"
                      ? "text-rose-500"
                      : "text-gray-400"
                }`}
              >
                {card.change.type === "increase" && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 8.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {card.change.type === "decrease" && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
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

  