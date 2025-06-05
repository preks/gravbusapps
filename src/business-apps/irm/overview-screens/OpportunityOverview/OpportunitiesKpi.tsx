import { Card, Row, Col } from 'antd';
import { 
  TeamOutlined,
  ApartmentOutlined,
  DollarOutlined,
  TrophyOutlined
} from "@ant-design/icons";

interface OpportunitiesKPIProps {
  opportunities: any[]
}

export default function OpportunitiesKPI({ opportunities }: OpportunitiesKPIProps) {
  const totalOpportunities = opportunities?.length

  const activeOpportunities = opportunities?.filter(
    (opp) => opp.stageName !== "Closed Won" && opp.stageName !== "Closed Lost",
  )?.length

  const totalValue = opportunities?.reduce((sum, opp) => {
    const value = Number.parseFloat(opp.value || "0")
    return isNaN(value) ? sum : sum + value
  }, 0)

  const winRate =
    opportunities?.length > 0
      ? Math.round(
          (opportunities.filter((opp) => opp.stageName === "Closed Won")?.length /
            opportunities.filter((opp) => opp.stageName === "Closed Won" || opp.stageName === "Closed Lost")?.length) *
            100,
        ) || 0
      : 0

  return (
    <Row gutter={[16, 16]} className="gba:stats-cards">
      <Col xs={24} sm={12} md={6}>
        <Card className="gba:border-gray-300">
          <div className="gba:p-4">
            <div className="gba:flex gba:justify-between">
              <div>
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Total Opportunities</div>
                <div className="gba:text-2xl gba:font-bold gba:text-blue-500">{totalOpportunities}</div>
                <div className="gba:text-xs gba:text-gray-500">All registered opportunities</div>
              </div>
              <div className="gba:flex gba:items-center gba:justify-center gba:w-12 gba:h-12 gba:rounded-full gba:bg-blue-100">
                <TeamOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
              </div>
            </div>
          </div>
        </Card>
      </Col>
      
      <Col xs={24} sm={12} md={6}>
        <Card className="gba:border-gray-300">
          <div className="gba:p-4">
            <div className="gba:flex gba:justify-between">
              <div>
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Active Opportunities</div>
                <div className="gba:text-2xl gba:font-bold gba:text-green-500">{activeOpportunities}</div>
                <div className="gba:text-xs gba:text-gray-500">Not yet closed</div>
              </div>
              <div className="gba:flex gba:items-center gba:justify-center gba:w-12 gba:h-12 gba:rounded-full gba:bg-green-100">
                <ApartmentOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
              </div>
            </div>
          </div>
        </Card>
      </Col>
      
      <Col xs={24} sm={12} md={6}>
        <Card className="gba:border-gray-300">
          <div className="gba:p-4">
            <div className="gba:flex gba:justify-between">
              <div>
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Total Value</div>
                <div className="gba:text-2xl gba:font-bold gba:text-purple-500">$ {totalValue != undefined ? totalValue.toLocaleString() : 0}</div>
                <div className="gba:text-xs gba:text-gray-500">Total value of all opportunities</div>
              </div>
              <div className="gba:flex gba:items-center gba:justify-center gba:w-12 gba:h-12 gba:rounded-full gba:bg-purple-100">
                <DollarOutlined style={{ color: '#722ed1', fontSize: '20px' }} />
              </div>
            </div>
          </div>
        </Card>
      </Col>
      
      <Col xs={24} sm={12} md={6}>
        <Card className="gba:border-gray-300">
          <div className="gba:p-4">
            <div className="gba:flex gba:justify-between">
              <div>
                <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Win Rate</div>
                <div className="gba:text-2xl gba:font-bold gba:text-orange-500">{winRate}%</div>
                <div className="gba:text-xs gba:text-gray-500">Percentage of won opportunities</div>
              </div>
              <div className="gba:flex gba:items-center gba:justify-center gba:w-12 gba:h-12 gba:rounded-full gba:bg-orange-100">
                <TrophyOutlined style={{ color: '#fa8c16', fontSize: '20px' }} />
              </div>
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  )
}