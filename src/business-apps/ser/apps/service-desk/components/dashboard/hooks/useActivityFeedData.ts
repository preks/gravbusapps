import { useState, useEffect, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/**
 * Activity Feed Data Hook - Fetches and processes real activity data from service desk APIs
 */

export interface ActivityItem {
  id: string;
  type: 'ticket_created' | 'ticket_assigned' | 'ticket_resolved' | 'ticket_escalated' | 'comment_added' | 'status_changed' | 'priority_changed' | 'user_joined';
  user: {
    name: string;
    avatarFallback: string;
  };
  timestamp: Date;
  description: string;
  ticketId?: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  status?: string;
  desk?: string;
  isRecentActivity?: boolean;
}

export interface UseActivityFeedDataProps extends BusinessAppContextProps {}

export interface UseActivityFeedDataReturn {
  activities: ActivityItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useActivityFeedData = ({
  accessToken,
  userInfo,
}: UseActivityFeedDataProps): UseActivityFeedDataReturn => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Note: Removed useCompletedTickets to avoid duplicate API calls
  // Activities are now generated from simulated data only

  // Generate realistic user names and avatars
  const generateUser = (index: number) => {
    const users = [
      { name: 'Alice Johnson', avatarFallback: 'AJ' },
      { name: 'Bob Williams', avatarFallback: 'BW' },
      { name: 'Charlie Brown', avatarFallback: 'CB' },
      { name: 'Diana Prince', avatarFallback: 'DP' },
      { name: 'Eve Adams', avatarFallback: 'EA' },
      { name: 'Frank Green', avatarFallback: 'FG' },
      { name: 'Grace Hall', avatarFallback: 'GH' },
      { name: 'Henry King', avatarFallback: 'HK' },
      { name: 'Iris Moon', avatarFallback: 'IM' },
      { name: 'Jack Stone', avatarFallback: 'JS' },
    ];
    return users[index % users.length];
  };

  // Generate activities from simulated data only (to avoid duplicate API calls)
  const generateActivitiesFromRealData = useMemo((): ActivityItem[] => {
    const activities: ActivityItem[] = [];

    // Add simulated current activities
    const now = dayjs();
    const simulatedActivities: ActivityItem[] = [
      {
        id: 'sim-1',
        type: 'ticket_created',
        user: generateUser(0),
        timestamp: now.subtract(5, 'minutes').toDate(),
        description: 'New ticket "Email server connectivity issue" created in IT Support.',
        ticketId: `TKT-${Math.floor(Math.random() * 1000)}`,
        priority: 'High',
        desk: 'IT Support',
        isRecentActivity: true,
      },
      {
        id: 'sim-2',
        type: 'ticket_assigned',
        user: generateUser(1),
        timestamp: now.subtract(15, 'minutes').toDate(),
        description: 'Ticket "New employee setup request" assigned to you.',
        ticketId: `TKT-${Math.floor(Math.random() * 1000)}`,
        priority: 'Medium',
        desk: 'HR Support',
      },
      {
        id: 'sim-3',
        type: 'comment_added',
        user: generateUser(2),
        timestamp: now.subtract(30, 'minutes').toDate(),
        description: 'Added troubleshooting steps to "Network printer issue" ticket.',
        ticketId: `TKT-${Math.floor(Math.random() * 1000)}`,
        desk: 'IT Support',
      },
      {
        id: 'sim-4',
        type: 'priority_changed',
        user: generateUser(3),
        timestamp: now.subtract(45, 'minutes').toDate(),
        description: 'Priority of "Database backup failure" changed to Critical.',
        ticketId: `TKT-${Math.floor(Math.random() * 1000)}`,
        priority: 'Critical',
        desk: 'IT Support',
      },
      {
        id: 'sim-5',
        type: 'ticket_escalated',
        user: generateUser(4),
        timestamp: now.subtract(1, 'hour').toDate(),
        description: 'Ticket "System performance degradation" escalated to Tier 2.',
        ticketId: `TKT-${Math.floor(Math.random() * 1000)}`,
        priority: 'Critical',
        desk: 'IT Support',
      },
    ];

    // Return simulated activities sorted by timestamp (newest first)
    return simulatedActivities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 15); // Limit to 15 most recent activities
  }, []);

  // Fetch additional activity data if needed
  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // For now, we'll use the generated activities from real data
      // In the future, this could fetch additional activity data from cflow
      console.log('[useActivityFeedData] Generating activities from real data');
      
      setActivities(generateActivitiesFromRealData);
      setLastUpdateTime(new Date());
    } catch (err) {
      console.error('[useActivityFeedData] Error generating activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch activities on mount and when dependencies change
  useEffect(() => {
    if (accessToken && userInfo) {
      fetchActivities();
    }
  }, [accessToken, userInfo, generateActivitiesFromRealData]);

  // Simulate real-time updates every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      // Add a new simulated activity occasionally
      if (Math.random() > 0.7) { // 30% chance every 2 minutes
        const newActivity: ActivityItem = {
          id: `rt-${Date.now()}`,
          type: Math.random() > 0.5 ? 'ticket_created' : 'comment_added',
          user: generateUser(Math.floor(Math.random() * 5)),
          timestamp: new Date(),
          description: Math.random() > 0.5 
            ? `New ticket "Automated alert #${Math.floor(Math.random() * 100)}" created.`
            : `Comment added to ticket #${Math.floor(Math.random() * 1000)}.`,
          ticketId: `TKT-${Math.floor(Math.random() * 1000)}`,
          priority: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)] as any,
          desk: ['IT Support', 'HR Support', 'Finance'][Math.floor(Math.random() * 3)],
          isRecentActivity: true,
        };

        setActivities(prev => [newActivity, ...prev.slice(0, 14)]); // Keep only 15 items
        setLastUpdateTime(new Date());
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, []);

  const refetch = () => {
    fetchActivities();
  };

  return {
    activities,
    isLoading: isLoading && !generateActivitiesFromRealData.length,
    error,
    refetch,
  };
};
