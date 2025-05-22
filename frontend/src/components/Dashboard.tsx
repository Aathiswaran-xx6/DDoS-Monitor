import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

interface Request {
  ip: string;
  method: string;
  path: string;
  timestamp: string;
  duration: number;
  statusCode: number;
  userAgent: string;
}

interface BlockedIP {
  ip: string;
  blockedAt: string;
  unblockAt: string;
  reason: string;
}

const Dashboard: React.FC = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [ipRequestCounts, setIpRequestCounts] = useState<Map<string, Request[]>>(new Map());

  useEffect(() => {
    let socket: any = null;

    if (isMonitoring) {
      socket = io('http://localhost:5000', {
        transports: ['websocket'],
        reconnection: true
      });

      socket.on('connect', () => {
        console.log('Dashboard connected to server');
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('Dashboard disconnected from server');
        setIsConnected(false);
      });

      socket.on('request-log', (data: Request) => {
        console.log('Dashboard received request:', data);
        
        // Check if IP is already blocked
        if (blockedIPs.some(blocked => blocked.ip === data.ip)) {
          return;
        }

        // Update request counts for the IP
        const now = new Date().getTime();
        setIpRequestCounts(prev => {
          const newMap = new Map(prev);
          const ipRequests = newMap.get(data.ip) || [];
          
          // Only keep requests from last 5 minutes
          const recentRequests = [
            ...ipRequests.filter(req => 
              now - new Date(req.timestamp).getTime() < 5 * 60 * 1000
            ),
            data
          ];
          
          newMap.set(data.ip, recentRequests);
          
          // Check if IP should be blocked
          if (recentRequests.length > 5) {
            const blockUntil = new Date(now + 15 * 60 * 1000); // 15 minutes
            setBlockedIPs(prev => [...prev, {
              ip: data.ip,
              blockedAt: new Date().toISOString(),
              unblockAt: blockUntil.toISOString(),
              reason: `Made ${recentRequests.length} requests in 5 minutes`
            }]);
            
            // Notify server to block the IP
            socket?.emit('block-ip', {
              ip: data.ip,
              duration: 15 * 60 * 1000
            });
          }
          
          return newMap;
        });

        setRequests(prev => [data, ...prev].slice(0, 100));
      });
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isMonitoring, blockedIPs]);

  const startMonitoring = () => {
    setIsMonitoring(true);
    setRequests([]);
    setIpRequestCounts(new Map());
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
  };

  // Clean up expired blocks
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      setBlockedIPs(prev => 
        prev.filter(blocked => 
          new Date(blocked.unblockAt).getTime() > now
        )
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">DDoS Monitor Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
            <button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              className={`${
                isMonitoring 
                  ? 'bg-red-500 hover:bg-red-700' 
                  : 'bg-green-500 hover:bg-green-700'
              } text-white font-bold py-2 px-4 rounded`}
            >
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </button>
          </div>
        </div>

        {/* Blocked IPs Section */}
        {blockedIPs.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Blocked IPs</h2>
            <div className="space-y-2">
              {blockedIPs.map((blocked, index) => (
                <div key={index} className="flex justify-between items-center text-sm text-red-700">
                  <div>
                    <span className="font-medium">{blocked.ip}</span>
                    <span className="ml-2">- {blocked.reason}</span>
                  </div>
                  <div>
                    <span>Blocked at: {new Date(blocked.blockedAt).toLocaleString()}</span>
                    <span className="ml-4">Until: {new Date(blocked.unblockAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Request Log Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-4 py-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Live Request Log</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Path
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.length > 0 ? (
                  requests.map((request, index) => {
                    const isBlocked = blockedIPs.some(blocked => blocked.ip === request.ip);
                    return (
                      <tr key={index} className={`hover:bg-gray-50 ${isBlocked ? 'bg-red-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(request.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            request.method === 'GET' 
                              ? 'bg-blue-100 text-blue-800'
                              : request.method === 'POST'
                              ? 'bg-green-100 text-green-800'
                              : request.method === 'DELETE'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {request.method}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.path}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center">
                            <span className="text-gray-500">{request.ip}</span>
                            {isBlocked && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Blocked
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            request.statusCode < 300
                              ? 'bg-green-100 text-green-800'
                              : request.statusCode < 400
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {request.statusCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.duration}ms
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      {isMonitoring 
                        ? 'Waiting for requests... Try interacting with the e-commerce site.'
                        : 'Click "Start Monitoring" to begin capturing requests.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Methods</h3>
            <div className="space-y-2">
              {['GET', 'POST', 'PUT', 'DELETE'].map(method => {
                const count = requests.filter(r => r.method === method).length;
                return (
                  <div key={method} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{method}</span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Status Codes</h3>
            <div className="space-y-2">
              {['2xx', '3xx', '4xx', '5xx'].map(range => {
                const start = parseInt(range[0]) * 100;
                const count = requests.filter(r => r.statusCode >= start && r.statusCode < start + 100).length;
                return (
                  <div key={range} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{range}</span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Performance</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Response Time</span>
                <span className="text-sm font-medium text-gray-900">
                  {requests.length > 0
                    ? `${Math.round(requests.reduce((acc, r) => acc + r.duration, 0) / requests.length)}ms`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Requests</span>
                <span className="text-sm font-medium text-gray-900">{requests.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Blocked IPs</span>
                <span className="text-sm font-medium text-gray-900">{blockedIPs.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 