import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
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
  requestCount: number;
}

interface EcommerceMonitorProps {
  username: string;
  onLogout: () => void;
}

const API_BASE_URL = 'http://localhost:5000';

// DDoS Protection Configuration
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const REQUEST_WINDOW = 5 * 60 * 1000;  // 5 minutes in milliseconds
const MAX_REQUESTS = 5; // Maximum requests allowed in the window

// List of API endpoints to monitor - only specific user actions
const MONITORED_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/cart/',
  '/api/products/'
];

const EcommerceMonitor: React.FC<EcommerceMonitorProps> = ({ username, onLogout }) => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [ipRequestCounts, setIpRequestCounts] = useState<Map<string, Request[]>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');

  // Check if an IP is currently blocked
  const isIPBlocked = useCallback((ip: string) => {
    const blockedIP = blockedIPs.find(blocked => blocked.ip === ip);
    if (!blockedIP) return false;
    
    const now = new Date().getTime();
    const unblockTime = new Date(blockedIP.unblockAt).getTime();
    
    if (now >= unblockTime) {
      // Remove expired block
      setBlockedIPs(prev => prev.filter(b => b.ip !== ip));
      return false;
    }
    return true;
  }, [blockedIPs]);

  // Update request counts and check for blocking
  const updateRequestCounts = useCallback((ip: string, request: Request) => {
    const now = new Date().getTime();
    
    setIpRequestCounts(prev => {
      const newMap = new Map(prev);
      const ipRequests = newMap.get(ip) || [];
      
      // Filter requests within the time window
      const recentRequests = [
        ...ipRequests.filter(req => 
          now - new Date(req.timestamp).getTime() < REQUEST_WINDOW
        ),
        request
      ];
      
      newMap.set(ip, recentRequests);
      
      // Check if IP should be blocked
      if (recentRequests.length > MAX_REQUESTS && !isIPBlocked(ip)) {
        const blockUntil = new Date(now + BLOCK_DURATION);
        setBlockedIPs(prev => [...prev, {
          ip,
          blockedAt: new Date().toISOString(),
          unblockAt: blockUntil.toISOString(),
          requestCount: recentRequests.length
        }]);
        
        // Send block request to backend
        axios.post(`${API_BASE_URL}/api/block`, { 
          ip, 
          duration: BLOCK_DURATION 
        }).catch(console.error);
      }
      
      return newMap;
    });
  }, [isIPBlocked]);

  // Handle incoming request data from socket
  const handleRequestData = useCallback((requestData: Request) => {
    // Skip internal requests and development server requests
    if (!requestData.ip || 
        requestData.ip === '127.0.0.1' || 
        requestData.ip === 'localhost' || 
        requestData.ip.includes('192.168.') || 
        requestData.ip === '::1' ||
        requestData.path === '/api/traffic' || 
        requestData.path.includes('webpack') || 
        requestData.path.includes('hot-update') || 
        requestData.path.includes('sockjs-node')) {
      return;
    }

    // Only process monitored endpoints
    if (!MONITORED_ENDPOINTS.some(endpoint => requestData.path.includes(endpoint))) {
      return;
    }

    // Process the request if IP is not blocked
    if (!isIPBlocked(requestData.ip)) {
      updateRequestCounts(requestData.ip, requestData);
      setRequests(prev => [requestData, ...prev].slice(0, 100)); // Keep last 100 requests
    }
  }, [isIPBlocked, updateRequestCounts]);

  // Set up socket connection
  useEffect(() => {
    let socket: any = null;

    if (isMonitoring) {
      // Connect to the e-commerce server
      socket = io(API_BASE_URL, {
        transports: ['websocket'],
        reconnection: true
      });

      // Connection event handlers
      socket.on('connect', () => {
        console.log('Connected to server');
        setConnectionStatus('connected');
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from server');
        setConnectionStatus('disconnected');
      });

      // Handle request-log events
      socket.on('request-log', handleRequestData);
    }

    // Cleanup on unmount or when monitoring stops
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isMonitoring, handleRequestData]);

  // Start monitoring
  const startMonitoring = () => {
    setIsMonitoring(true);
    setRequests([]);
    setBlockedIPs([]);
    setIpRequestCounts(new Map());
  };

  // Stop monitoring
  const stopMonitoring = () => {
    setIsMonitoring(false);
  };

  // Get a friendly name for the API endpoint
  const getEndpointDescription = (path: string) => {
    if (path.startsWith('/api/auth/login')) return 'User Login';
    if (path.startsWith('/api/auth/register')) return 'User Registration';
    if (path.startsWith('/api/cart') && path.includes('DELETE')) return 'Remove from Cart';
    if (path.startsWith('/api/cart')) return 'Cart Operation';
    if (path.startsWith('/api/products')) return 'Product Request';
    return 'API Request';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">E-commerce API Monitor</h1>
            </div>
            <div className="flex items-center">
              <div className="mr-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  connectionStatus === 'connected' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {connectionStatus === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}
                </span>
              </div>
              <button
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
                className={`${
                  isMonitoring 
                    ? 'bg-red-500 hover:bg-red-700' 
                    : 'bg-green-500 hover:bg-green-700'
                } text-white font-bold py-2 px-4 rounded mr-4`}
              >
                {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Blocked IPs Section */}
        {blockedIPs.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-red-800 mb-2">Blocked IPs</h3>
            <div className="space-y-2">
              {blockedIPs.map((blocked, index) => (
                <div key={index} className="text-sm text-red-700">
                  IP {blocked.ip} blocked at {new Date(blocked.blockedAt).toLocaleString()} 
                  until {new Date(blocked.unblockAt).toLocaleString()} 
                  ({blocked.requestCount} requests in 5 minutes)
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Request Log Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Live API Request Log
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Monitoring real-time API requests from the e-commerce website
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
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    API Endpoint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.length > 0 ? (
                  requests.map((request, index) => (
                    <tr key={index} className={`hover:bg-gray-50 ${
                      isIPBlocked(request.ip) ? 'bg-red-50' : ''
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {request.ip}
                        {isIPBlocked(request.ip) && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Blocked
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getEndpointDescription(request.path)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        {request.method} {request.path}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.duration}ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.statusCode && request.statusCode < 400 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {request.statusCode}
                        </span>
                      </td>
                    </tr>
                  ))
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
      </main>
    </div>
  );
};

export default EcommerceMonitor; 