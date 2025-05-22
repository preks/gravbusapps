import { useState } from 'react';
import { Button } from 'antd';

export function LeadOverview() {
  const [message, setMessage] = useState("Lead Overview Component Loaded");

  return (
    <div>
      <h1>Lead Overview</h1>
      <p>{message}</p>
      <Button type="primary" onClick={() => setMessage("Message Changed via AntD Button!")}>
        Change Message (AntD)
      </Button>
    </div>
  );
}

export default LeadOverview;
