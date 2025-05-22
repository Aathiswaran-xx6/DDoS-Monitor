import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import time
import threading
import json
import os
from collections import defaultdict, deque
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("ddos_ml_detector.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("ML-DDoS-Detector")

class MLDDoSDetector:
    """
    Machine Learning based DDoS detector that uses anomaly detection
    to identify suspicious IP addresses based on their traffic patterns.
    """
    
    def __init__(self, block_threshold=0.8, window_size=300, features_window=100):
        """
        Initialize the ML DDoS detector.
        
        Parameters:
        -----------
        block_threshold : float
            Anomaly score threshold for blocking an IP (higher = more strict)
        window_size : int
            Time window in seconds to keep traffic data
        features_window : int
            Number of requests to consider when extracting features
        """
        self.block_threshold = block_threshold
        self.window_size = window_size
        self.features_window = features_window
        
        # Initialize the anomaly detection model
        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.05,  # Assume 5% of traffic might be malicious
            random_state=42,
            max_samples='auto'
        )
        
        # Initialize data structures
        self.traffic_data = defaultdict(lambda: deque(maxlen=features_window))
        self.ip_timestamps = defaultdict(list)
        self.ip_features = {}
        self.blocked_ips = set()
        self.suspicious_ips = set()
        self.false_positives = set()  # IPs manually identified as false positives
        
        # Track feature importance
        self.feature_names = [
            'req_rate', 'avg_interval', 'std_interval', 
            'bytes_rate', 'get_ratio', 'post_ratio', 
            'unique_urls', 'error_ratio', '4xx_ratio', 
            'max_burst'
        ]
        
        # Start background thread for periodic analysis
        self.running = True
        self.analysis_thread = threading.Thread(target=self._periodic_analysis)
        self.analysis_thread.daemon = True
        self.analysis_thread.start()
        
        # Load previously blocked IPs if available
        self._load_state()
        
        logger.info(f"ML DDoS Detector initialized with block_threshold={block_threshold}")
    
    def _load_state(self):
        """Load previous state if available"""
        try:
            if os.path.exists('ml_ddos_state.json'):
                with open('ml_ddos_state.json', 'r') as f:
                    state = json.load(f)
                    self.blocked_ips = set(state.get('blocked_ips', []))
                    self.false_positives = set(state.get('false_positives', []))
                    logger.info(f"Loaded {len(self.blocked_ips)} previously blocked IPs")
        except Exception as e:
            logger.error(f"Error loading state: {e}")
    
    def _save_state(self):
        """Save current state to file"""
        try:
            state = {
                'blocked_ips': list(self.blocked_ips),
                'false_positives': list(self.false_positives),
                'timestamp': time.time()
            }
            with open('ml_ddos_state.json', 'w') as f:
                json.dump(state, f)
        except Exception as e:
            logger.error(f"Error saving state: {e}")
    
    def record_request(self, ip, timestamp, bytes_sent, method='GET', url='/', status_code=200):
        """
        Record a new request from an IP address
        
        Parameters:
        -----------
        ip : str
            The source IP address
        timestamp : float
            Request timestamp
        bytes_sent : int
            Size of the response in bytes
        method : str
            HTTP method (GET, POST, etc.)
        url : str
            Requested URL path
        status_code : int
            HTTP status code
        """
        if ip in self.blocked_ips:
            return False  # IP is already blocked
        
        # Store the request data
        self.traffic_data[ip].append({
            'timestamp': timestamp,
            'bytes': bytes_sent,
            'method': method,
            'url': url,
            'status_code': status_code
        })
        
        # Keep track of timestamps for cleaning old data
        self.ip_timestamps[ip].append(timestamp)
        
        # Clean old data
        self._clean_old_data()
        
        # If we have enough data, extract features and check for anomaly
        if len(self.traffic_data[ip]) >= min(5, self.features_window):
            self._extract_features_for_ip(ip)
            
            # If all features are available, perform real-time detection
            if ip in self.ip_features and len(self.ip_features) > 10:  # Need some data to train
                return self._check_anomaly_realtime(ip)
            
        return True  # Allow the request
    
    def _extract_features_for_ip(self, ip):
        """Extract traffic features for a specific IP"""
        if len(self.traffic_data[ip]) < 2:
            return  # Need at least 2 requests to calculate intervals
        
        data = list(self.traffic_data[ip])
        
        # Calculate time intervals between requests
        timestamps = [r['timestamp'] for r in data]
        intervals = np.diff(timestamps)
        
        # Calculate request rate (requests per second)
        time_span = max(timestamps) - min(timestamps)
        if time_span < 0.001:  # Avoid division by zero
            time_span = 0.001
        req_rate = len(data) / time_span
        
        # Calculate bytes rate
        total_bytes = sum(r['bytes'] for r in data)
        bytes_rate = total_bytes / time_span
        
        # Calculate method ratios
        methods = [r['method'] for r in data]
        get_count = methods.count('GET')
        post_count = methods.count('POST')
        get_ratio = get_count / len(methods) if methods else 0
        post_ratio = post_count / len(methods) if methods else 0
        
        # Calculate unique URLs ratio
        unique_urls = len(set(r['url'] for r in data)) / len(data)
        
        # Calculate error ratios
        status_codes = [r['status_code'] for r in data]
        error_count = sum(1 for s in status_codes if s >= 400)
        error_ratio = error_count / len(status_codes) if status_codes else 0
        
        # 4xx specific ratio
        count_4xx = sum(1 for s in status_codes if 400 <= s < 500)
        ratio_4xx = count_4xx / len(status_codes) if status_codes else 0
        
        # Calculate max burst (max requests in a 1-second window)
        if len(timestamps) > 1:
            # Group timestamps into 1-second buckets
            bucket_counts = defaultdict(int)
            for ts in timestamps:
                bucket_counts[int(ts)] += 1
            max_burst = max(bucket_counts.values())
        else:
            max_burst = 1
        
        # Store the features
        self.ip_features[ip] = [
            req_rate,
            np.mean(intervals) if len(intervals) > 0 else 0,
            np.std(intervals) if len(intervals) > 0 else 0,
            bytes_rate,
            get_ratio,
            post_ratio,
            unique_urls,
            error_ratio,
            ratio_4xx,
            max_burst
        ]
    
    def _clean_old_data(self):
        """Remove data older than window_size seconds"""
        current_time = time.time()
        cutoff_time = current_time - self.window_size
        
        # Clean old timestamps and traffic data
        for ip in list(self.ip_timestamps.keys()):
            timestamps = self.ip_timestamps[ip]
            if not timestamps:
                continue
                
            # Find index of first timestamp that is within the window
            idx = 0
            while idx < len(timestamps) and timestamps[idx] < cutoff_time:
                idx += 1
            
            if idx > 0:
                # Remove old timestamps
                self.ip_timestamps[ip] = timestamps[idx:]
                
                # If all timestamps are old, remove IP from tracking
                if not self.ip_timestamps[ip]:
                    del self.ip_timestamps[ip]
                    if ip in self.traffic_data:
                        del self.traffic_data[ip]
                    if ip in self.ip_features:
                        del self.ip_features[ip]
    
    def _check_anomaly_realtime(self, ip):
        """Check if an IP's recent traffic patterns are anomalous"""
        if ip in self.false_positives:
            return True  # Skip detection for known false positives
            
        # Prepare data for prediction
        all_features = np.array(list(self.ip_features.values()))
        
        # Skip if we don't have enough data points
        if len(all_features) < 10:
            return True
            
        # Train model if needed (using all IPs' features)
        try:
            # Normalize the features
            scaler = StandardScaler()
            all_features_scaled = scaler.fit_transform(all_features)
            
            # Train the model
            self.model.fit(all_features_scaled)
            
            # Get the anomaly score for this IP
            ip_features = np.array(self.ip_features[ip]).reshape(1, -1)
            ip_features_scaled = scaler.transform(ip_features)
            anomaly_score = -self.model.score_samples(ip_features_scaled)[0]
            
            # Higher score = more anomalous
            if anomaly_score > self.block_threshold:
                logger.warning(f"Suspicious traffic detected from IP {ip} (score: {anomaly_score:.4f})")
                self.suspicious_ips.add(ip)
                
                # If score is significantly above threshold, block immediately
                if anomaly_score > self.block_threshold * 1.5:
                    self._block_ip(ip, f"Highly anomalous traffic pattern (score: {anomaly_score:.4f})")
                    return False
                    
            return True
        except Exception as e:
            logger.error(f"Error during anomaly detection: {e}")
            return True  # Allow in case of error
    
    def _block_ip(self, ip, reason="Suspicious traffic pattern"):
        """Block an IP address"""
        if ip not in self.blocked_ips:
            self.blocked_ips.add(ip)
            logger.warning(f"BLOCKED IP {ip}: {reason}")
            
            # Save state after blocking
            self._save_state()
            
            # Here you would typically integrate with your firewall/WAF
            # For example, calling an API to update block rules
            
            return True
        return False
    
    def unblock_ip(self, ip, mark_as_false_positive=False):
        """
        Unblock an IP address
        
        Parameters:
        -----------
        ip : str
            The IP address to unblock
        mark_as_false_positive : bool
            If True, add to false positives list to prevent future blocks
        """
        if ip in self.blocked_ips:
            self.blocked_ips.remove(ip)
            logger.info(f"Unblocked IP {ip}")
            
            if mark_as_false_positive:
                self.false_positives.add(ip)
                logger.info(f"Marked IP {ip} as false positive")
            
            # Save state after unblocking
            self._save_state()
            
            return True
        return False
    
    def _periodic_analysis(self):
        """Perform periodic analysis of all traffic data"""
        while self.running:
            try:
                # Sleep for a while
                time.sleep(10)
                
                # Skip if we don't have enough data
                if len(self.ip_features) < 5:
                    continue
                
                # Prepare feature matrix
                ip_list = list(self.ip_features.keys())
                X = np.array([self.ip_features[ip] for ip in ip_list])
                
                # Normalize features
                scaler = StandardScaler()
                X_scaled = scaler.fit_transform(X)
                
                # Fit the model
                self.model.fit(X_scaled)
                
                # Get anomaly scores
                anomaly_scores = -self.model.score_samples(X_scaled)
                
                # Identify anomalous IPs
                for idx, ip in enumerate(ip_list):
                    if ip in self.blocked_ips or ip in self.false_positives:
                        continue
                        
                    score = anomaly_scores[idx]
                    if score > self.block_threshold:
                        logger.warning(f"Periodic analysis: Suspicious IP {ip} detected (score: {score:.4f})")
                        
                        # Add to suspicious list
                        self.suspicious_ips.add(ip)
                        
                        # Block if score is very high
                        if score > self.block_threshold * 1.3:
                            self._block_ip(ip, f"Highly anomalous traffic detected in periodic analysis (score: {score:.4f})")
                
                # Clean up old data
                self._clean_old_data()
                
            except Exception as e:
                logger.error(f"Error in periodic analysis: {e}")
    
    def get_status(self):
        """Get the current status of the detector"""
        return {
            'blocked_ips': list(self.blocked_ips),
            'suspicious_ips': list(self.suspicious_ips),
            'monitoring_ips': len(self.ip_features),
            'false_positives': list(self.false_positives)
        }
    
    def shutdown(self):
        """Shutdown the detector and save state"""
        self.running = False
        if self.analysis_thread.is_alive():
            self.analysis_thread.join(timeout=1.0)
        self._save_state()
        logger.info("ML DDoS Detector shutdown complete")


class DDoSMLIntegrator:
    """
    Class to integrate the ML DDoS detector with your existing system.
    This acts as a bridge between your web application and the ML detector.
    """
    
    def __init__(self, block_threshold=0.8):
        """Initialize the integrator"""
        self.detector = MLDDoSDetector(block_threshold=block_threshold)
        self.request_count = 0
        logger.info("DDoS ML Integrator initialized")
    
    def process_request(self, request_data):
        """
        Process an incoming request
        
        Parameters:
        -----------
        request_data : dict
            Dictionary containing request information:
            - ip: str - Source IP address
            - timestamp: float - Request timestamp (time.time())
            - bytes_sent: int - Size of response in bytes
            - method: str - HTTP method (GET, POST, etc.)
            - url: str - Requested URL path
            - status_code: int - HTTP status code
            
        Returns:
        --------
        bool
            True if request is allowed, False if it should be blocked
        """
        self.request_count += 1
        
        # Ensure all required fields are present
        required_fields = ['ip', 'timestamp', 'bytes_sent']
        if not all(field in request_data for field in required_fields):
            logger.warning(f"Missing required fields in request data: {request_data}")
            return True  # Allow if data is incomplete
        
        # Process with the ML detector
        result = self.detector.record_request(
            ip=request_data['ip'],
            timestamp=request_data['timestamp'],
            bytes_sent=request_data['bytes_sent'],
            method=request_data.get('method', 'GET'),
            url=request_data.get('url', '/'),
            status_code=request_data.get('status_code', 200)
        )
        
        # Log periodic statistics
        if self.request_count % 1000 == 0:
            status = self.detector.get_status()
            logger.info(f"Processed {self.request_count} requests, "
                      f"{len(status['blocked_ips'])} IPs blocked, "
                      f"{len(status['suspicious_ips'])} suspicious")
        
        return result
    
    def is_ip_blocked(self, ip):
        """Check if an IP is currently blocked"""
        return ip in self.detector.blocked_ips
    
    def unblock_ip(self, ip, mark_as_false_positive=False):
        """Unblock an IP address"""
        return self.detector.unblock_ip(ip, mark_as_false_positive)
    
    def get_status(self):
        """Get the current status of the detector"""
        return self.detector.get_status()
    
    def shutdown(self):
        """Shutdown the integrator and detector"""
        self.detector.shutdown()
        logger.info("DDoS ML Integrator shutdown complete")


# Example usage
if __name__ == "__main__":
    # Create an integrator
    integrator = DDoSMLIntegrator(block_threshold=0.75)
    
    try:
        # Simulate some normal traffic
        logger.info("Simulating normal traffic...")
        for i in range(500):
            # Normal traffic patterns
            ip = f"192.168.1.{i % 50 + 1}"  # 50 different IPs
            request_data = {
                'ip': ip,
                'timestamp': time.time(),
                'bytes_sent': np.random.randint(2000, 10000),
                'method': np.random.choice(['GET', 'POST'], p=[0.8, 0.2]),
                'url': f"/page{i % 20 + 1}.html",
                'status_code': 200
            }
            
            # Add some delay between requests
            time.sleep(0.01)
            
            # Process the request
            allowed = integrator.process_request(request_data)
            
        # Simulate a DDoS attack from one IP
        logger.info("Simulating DDoS attack...")
        attack_ip = "10.0.0.99"
        for i in range(200):
            request_data = {
                'ip': attack_ip,
                'timestamp': time.time(),
                'bytes_sent': 1500,
                'method': 'GET',
                'url': "/login.php",
                'status_code': 200
            }
            
            # Very small delay between requests (high frequency)
            time.sleep(0.001)
            
            # Process the request
            allowed = integrator.process_request(request_data)
            if not allowed:
                logger.info(f"Attack IP {attack_ip} was blocked!")
                break
        
        # Show final status
        status = integrator.get_status()
        logger.info(f"Final status: {status}")
        
    finally:
        # Shutdown the integrator
        integrator.shutdown() 