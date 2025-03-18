import React, { useEffect, useState, useCallback } from 'react';

interface PacketData {
  sourceIp: string;
  destinationIp: string;
  protocol: string;
  timestamp: string;
  packetSize: number;
  isSuspicious: boolean;
  activityType?: string;
}

interface Statistics {
  totalPackets: number;
  suspiciousPackets: number;
  ipFrequency: Record<string, number>;
  protocolDistribution: Record<string, number>;
}

interface BlockedIP {
  ip: string;
  timestamp: Date;
  reason: string;
}

interface EcommerceMonitorProps {
  username: string;
  onLogout: () => void;
}

// Generate a random IP address
const generateRandomIP = () => {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
};

// Create a packet based on activity
const generatePacket = (activityType: string): PacketData => {
  let packetSize = 0;
  let sourceIp = generateRandomIP();
  
  // Set packet size based on activity type
  switch (activityType) {
    case 'login':
      packetSize = 350 + Math.floor(Math.random() * 50);
      break;
    case 'addToCart':
      packetSize = 500 + Math.floor(Math.random() * 100);
      break;
    case 'checkout':
      packetSize = 800 + Math.floor(Math.random() * 200);
      break;
    case 'browse':
      packetSize = 200 + Math.floor(Math.random() * 50);
      break;
    default:
      packetSize = 300 + Math.floor(Math.random() * 100);
  }
  
  return {
    sourceIp,
    destinationIp: 'localhost',
    protocol: 'HTTP',
    timestamp: new Date().toISOString(),
    packetSize,
    isSuspicious: false,
    activityType
  };
};

// Generate statistics based on packet data
const generateStats = (packets: PacketData[]): Statistics => {
  const ipFrequency: Record<string, number> = {};
  const protocolDistribution: Record<string, number> = {};
  let suspiciousCount = 0;
  
  packets.forEach(packet => {
    // Count IP frequencies
    if (ipFrequency[packet.sourceIp]) {
      ipFrequency[packet.sourceIp]++;
    } else {
      ipFrequency[packet.sourceIp] = 1;
    }
    
    // Count protocol distribution
    if (protocolDistribution[packet.protocol]) {
      protocolDistribution[packet.protocol]++;
    } else {
      protocolDistribution[packet.protocol] = 1;
    }
    
    if (packet.isSuspicious) {
      suspiciousCount++;
    }
  });
  
  return {
    totalPackets: packets.length,
    suspiciousPackets: suspiciousCount,
    ipFrequency,
    protocolDistribution
  };
};

const EcommerceMonitor: React.FC<EcommerceMonitorProps> = ({ username, onLogout }) => {
  const [packets, setPackets] = useState<PacketData[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alertActive, setAlertActive] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [ipThreshold] = useState(5); // Lower threshold to 5 requests
  const [ipRequestCounts, setIpRequestCounts] = useState<Record<string, number>>({});
  const [backgroundInterval, setBackgroundInterval] = useState<NodeJS.Timeout | null>(null);

  // Track IP request counts and check if any IP should be blocked
  const trackIP = useCallback((ip: string) => {
    setIpRequestCounts(prev => {
      const newCounts = { ...prev };
      newCounts[ip] = (newCounts[ip] || 0) + 1;
      
      // If threshold reached and IP not already blocked, block it
      if (newCounts[ip] >= ipThreshold && !blockedIPs.some(b => b.ip === ip)) {
        setBlockedIPs(prev => [
          ...prev,
          {
            ip: ip,
            timestamp: new Date(),
            reason: `Exceeded request threshold (${newCounts[ip]} requests)`
          }
        ]);
        
        setAlertActive(true);
        setAlertMessage(`IP ${ip} has been blocked for excessive requests (${newCounts[ip]})`);
      }
      
      return newCounts;
    });
  }, [ipThreshold, blockedIPs]);

  // Generate background traffic
  const generateBackgroundTraffic = useCallback(() => {
    if (!isMonitoring) return;
    
    // Generate 1-3 random packets
    const numPackets = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numPackets; i++) {
      const activities = ['browse', 'login', 'addToCart', 'checkout'];
      const activityType = activities[Math.floor(Math.random() * activities.length)];
      const newPacket = generatePacket(activityType);
      
      setPackets(prev => [newPacket, ...prev].slice(0, 100));
      trackIP(newPacket.sourceIp);
    }
  }, [isMonitoring, trackIP]);

  // Handle user clicks to generate traffic
  const handleUserClick = useCallback(() => {
    if (!isMonitoring) return;
    
    const activities = ['browse', 'login', 'addToCart', 'checkout'];
    const activityType = activities[Math.floor(Math.random() * activities.length)];
    const newPacket = generatePacket(activityType);
    
    setPackets(prev => [newPacket, ...prev].slice(0, 100));
    trackIP(newPacket.sourceIp);
  }, [isMonitoring, trackIP]);

  // Set up click handler
  useEffect(() => {
    if (!isMonitoring) return;
    
    document.addEventListener('click', handleUserClick);
    
    return () => {
      document.removeEventListener('click', handleUserClick);
    };
  }, [isMonitoring, handleUserClick]);

  // Set up background traffic generation
  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        generateBackgroundTraffic();
      }, 2000 + Math.random() * 3000);
      
      setBackgroundInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else if (backgroundInterval) {
      clearInterval(backgroundInterval);
      setBackgroundInterval(null);
    }
  }, [isMonitoring, generateBackgroundTraffic, backgroundInterval]);

  // Update statistics when packets change
  useEffect(() => {
    if (packets.length > 0) {
      setStatistics(generateStats(packets));
    }
  }, [packets]);

  const startMonitoring = () => {
    setIsMonitoring(true);
    setAlertActive(false);
    setAlertMessage('');
    setIpRequestCounts({});
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
  };

  const unblockIP = (ip: string) => {
    setBlockedIPs(prev => prev.filter(blockedIP => blockedIP.ip !== ip));
    setIpRequestCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[ip]; // Reset count for this IP
      return newCounts;
    });
  };

  useEffect(() => {
    // Initialize with empty statistics
    setStatistics({
      totalPackets: 0,
      suspiciousPackets: 0,
      ipFrequency: {},
      protocolDistribution: {}
    });
    setLoading(false);
  }, []);

  // Auto-clear alerts after 5 seconds
  useEffect(() => {
    let alertTimerId: NodeJS.Timeout;
    
    if (alertActive) {
      alertTimerId = setTimeout(() => {
        setAlertActive(false);
      }, 5000);
    }
    
    return () => {
      if (alertTimerId) clearTimeout(alertTimerId);
    };
  }, [alertActive]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Count unique IPs
  const uniqueIPs = Object.keys(ipRequestCounts).length;
  
  // Get high frequency IPs (approaching threshold)
  const highFrequencyIPs = Object.entries(ipRequestCounts)
    .filter(([ip, count]) => count >= ipThreshold - 2 && count < ipThreshold && !blockedIPs.some(b => b.ip === ip))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Use statistics to render additional information
  const renderProtocolDistribution = () => {
    if (!statistics || Object.keys(statistics.protocolDistribution).length === 0) {
      return (
        <p className="text-sm text-gray-500">No protocol data available</p>
      );
    }

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Protocol Distribution</h4>
        <div className="space-y-1">
          {Object.entries(statistics.protocolDistribution).map(([protocol, count], idx) => (
            <div key={idx} className="flex items-center">
              <span className="text-xs text-gray-600 w-20">{protocol}:</span>
              <div className="h-2 bg-blue-100 flex-grow rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full" 
                  style={{ width: `${(count / statistics.totalPackets) * 100}%` }}
                ></div>
              </div>
              <span className="ml-2 text-xs text-gray-600">{count} packets</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">E-Commerce DDoS Monitor</h1>
            </div>
            <div className="flex items-center">
              <span className="mr-4">Welcome, {username}</span>
              <button
                onClick={onLogout}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-900">DDoS Protection System</h2>
          <div className="flex items-center">
            <div className="mr-4">
              {isMonitoring ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <svg className="-ml-1 mr-1.5 h-2 w-2 text-green-400" fill="currentColor" viewBox="0 0 8 8">
                    <circle cx="4" cy="4" r="3" />
                  </svg>
                  Monitoring Active
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <svg className="-ml-1 mr-1.5 h-2 w-2 text-red-400" fill="currentColor" viewBox="0 0 8 8">
                    <circle cx="4" cy="4" r="3" />
                  </svg>
                  Monitoring Inactive
                </span>
              )}
            </div>
            {isMonitoring ? (
              <button
                onClick={stopMonitoring}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Stop Monitoring
              </button>
            ) : (
              <button
                onClick={startMonitoring}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Start Monitoring
              </button>
            )}
          </div>
        </div>

        {/* Status message */}
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>DDoS Protection:</strong> Monitoring all IP addresses equally. Any IP address making {ipThreshold} or more requests will be automatically blocked.
                {isMonitoring 
                  ? ' Monitoring is active. Background traffic is being generated automatically.' 
                  : ' Click "Start Monitoring" to begin tracking.'}
              </p>
            </div>
          </div>
        </div>

        {/* Alert Banner */}
        {alertActive && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <strong>ALERT:</strong> {alertMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Unique IPs</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {uniqueIPs}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Block Threshold</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {ipThreshold} requests
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Packets</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {statistics?.totalPackets || 0}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Blocked IPs</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {blockedIPs.length}
              </dd>
            </div>
          </div>
        </div>

        {/* Traffic Analysis - Utilize statistics */}
        {isMonitoring && statistics && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Traffic Analysis
              </h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              {renderProtocolDistribution()}
              
              {/* Top IP addresses by frequency */}
              {statistics && Object.keys(statistics.ipFrequency).length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Top IP Addresses</h4>
                  <ul className="divide-y divide-gray-200">
                    {Object.entries(statistics.ipFrequency)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([ip, count], idx) => (
                        <li key={idx} className="py-2 flex justify-between">
                          <span className="text-sm text-gray-800">{ip}</span>
                          <div>
                            <span className="text-sm text-gray-600">{count} requests</span>
                            {blockedIPs.some(b => b.ip === ip) && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Blocked
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* High Frequency IPs */}
        {highFrequencyIPs.length > 0 && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Warning: High Traffic IPs
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {highFrequencyIPs.map(([ip, count], index) => (
                    <tr key={index} className="bg-yellow-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {ip}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {count}/{ipThreshold}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Warning
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => {
                            setBlockedIPs(prev => [
                              ...prev, 
                              {
                                ip: ip,
                                timestamp: new Date(),
                                reason: "Manually blocked - suspicious activity"
                              }
                            ]);
                            setAlertActive(true);
                            setAlertMessage(`IP ${ip} has been manually blocked`);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Block Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Blocked IPs Table */}
        {blockedIPs.length > 0 && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Blocked IP Addresses
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Blocked Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {blockedIPs.map((blockedIP, index) => (
                    <tr key={index} className="bg-red-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {blockedIP.ip}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {blockedIP.timestamp.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {blockedIP.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => unblockIP(blockedIP.ip)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Unblock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Traffic Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Network Traffic Log
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Showing traffic from all IPs to the e-commerce site
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source IP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {packets.length > 0 ? (
                  packets.map((packet, index) => {
                    const requestCount = ipRequestCounts[packet.sourceIp] || 0;
                    const isHighFrequency = requestCount >= ipThreshold - 2 && requestCount < ipThreshold;
                    const isBlocked = blockedIPs.some(b => b.ip === packet.sourceIp);
                    
                    return (
                      <tr 
                        key={index} 
                        className={
                          isBlocked ? "bg-red-50" : 
                          isHighFrequency ? "bg-yellow-50" : 
                          ""
                        }
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(packet.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {packet.sourceIp}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {requestCount}/{ipThreshold}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {packet.activityType || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {packet.packetSize} bytes
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isBlocked ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Blocked
                            </span>
                          ) : isHighFrequency ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Warning
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Allowed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No traffic detected. {isMonitoring ? 'Traffic will appear shortly after monitoring starts.' : 'Start monitoring to detect activity.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              How This DDoS Protection Works
            </h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <ol className="list-decimal list-inside text-gray-700 space-y-2">
              <li><strong>Request tracking:</strong> Counts requests from each unique IP address</li>
              <li><strong>Automatic blocking:</strong> Any IP making {ipThreshold} or more requests is automatically blocked</li>
              <li><strong>Warning system:</strong> IPs approaching the threshold are highlighted in yellow</li>
              <li><strong>Manual controls:</strong> Suspicious IPs can be blocked manually, and blocked IPs can be unblocked</li>
              <li><strong>No targeting:</strong> All IPs are treated equally - no single IP is specifically targeted</li>
            </ol>
            <div className="mt-4 p-4 bg-yellow-50 rounded-md">
              <p className="text-sm text-yellow-700">
                <strong>Important:</strong> This system tracks ALL IP addresses equally and will block any IP that 
                exceeds the request threshold of {ipThreshold}. This prevents DDoS attacks where multiple 
                requests come from the same source in a short period.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EcommerceMonitor; 