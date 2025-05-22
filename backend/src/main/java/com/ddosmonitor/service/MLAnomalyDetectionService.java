package com.ddosmonitor.service;

import org.springframework.stereotype.Service;
import java.util.*;
import java.time.Instant;
import java.time.Duration;

@Service
public class MLAnomalyDetectionService {
    private static final int WINDOW_SIZE = 60; // 1 minute window
    private static final double ANOMALY_THRESHOLD = 2.0; // Standard deviations for anomaly detection
    private static final int MIN_REQUESTS_FOR_ANALYSIS = 5;
    private static final int BLOCK_DURATION_MINUTES = 15;

    private Map<String, List<RequestData>> ipRequestHistory = new HashMap<>();
    private Map<String, Instant> blockedIPs = new HashMap<>();

    public static class RequestData {
        public final Instant timestamp;
        public final String endpoint;
        public final int responseTime;
        public final int statusCode;

        public RequestData(Instant timestamp, String endpoint, int responseTime, int statusCode) {
            this.timestamp = timestamp;
            this.endpoint = endpoint;
            this.responseTime = responseTime;
            this.statusCode = statusCode;
        }
    }

    public boolean isIPBlocked(String ip) {
        Instant blockedUntil = blockedIPs.get(ip);
        if (blockedUntil != null && Instant.now().isBefore(blockedUntil)) {
            return true;
        } else if (blockedUntil != null) {
            blockedIPs.remove(ip);
            return false;
        }
        return false;
    }

    public void recordRequest(String ip, String endpoint, int responseTime, int statusCode) {
        if (isIPBlocked(ip)) {
            return;
        }

        RequestData data = new RequestData(Instant.now(), endpoint, responseTime, statusCode);
        ipRequestHistory.computeIfAbsent(ip, k -> new ArrayList<>()).add(data);

        // Clean up old data
        cleanOldData(ip);

        // Analyze behavior
        if (shouldAnalyzeIP(ip)) {
            analyzeIPBehavior(ip);
        }
    }

    private void cleanOldData(String ip) {
        List<RequestData> history = ipRequestHistory.get(ip);
        if (history != null) {
            Instant cutoff = Instant.now().minus(Duration.ofMinutes(WINDOW_SIZE));
            history.removeIf(data -> data.timestamp.isBefore(cutoff));
        }
    }

    private boolean shouldAnalyzeIP(String ip) {
        List<RequestData> history = ipRequestHistory.get(ip);
        return history != null && history.size() >= MIN_REQUESTS_FOR_ANALYSIS;
    }

    private void analyzeIPBehavior(String ip) {
        List<RequestData> history = ipRequestHistory.get(ip);
        if (history == null || history.size() < MIN_REQUESTS_FOR_ANALYSIS) {
            return;
        }

        // Calculate features
        double requestRate = calculateRequestRate(history);
        double avgResponseTime = calculateAverageResponseTime(history);
        double errorRate = calculateErrorRate(history);
        double endpointVariety = calculateEndpointVariety(history);

        // Calculate anomaly score
        double anomalyScore = calculateAnomalyScore(requestRate, avgResponseTime, errorRate, endpointVariety);

        // Block IP if anomaly score exceeds threshold
        if (anomalyScore > ANOMALY_THRESHOLD) {
            blockIP(ip);
        }
    }

    private double calculateRequestRate(List<RequestData> history) {
        Duration window = Duration.ofMinutes(WINDOW_SIZE);
        return (double) history.size() / window.toMinutes();
    }

    private double calculateAverageResponseTime(List<RequestData> history) {
        return history.stream()
                .mapToInt(data -> data.responseTime)
                .average()
                .orElse(0.0);
    }

    private double calculateErrorRate(List<RequestData> history) {
        long errorCount = history.stream()
                .filter(data -> data.statusCode >= 400)
                .count();
        return (double) errorCount / history.size();
    }

    private double calculateEndpointVariety(List<RequestData> history) {
        Set<String> uniqueEndpoints = new HashSet<>();
        history.forEach(data -> uniqueEndpoints.add(data.endpoint));
        return (double) uniqueEndpoints.size() / history.size();
    }

    private double calculateAnomalyScore(double requestRate, double avgResponseTime, 
                                       double errorRate, double endpointVariety) {
        // Normalize features
        double normalizedRequestRate = requestRate / 100.0; // Assuming 100 requests per minute is normal
        double normalizedResponseTime = avgResponseTime / 1000.0; // Assuming 1 second is normal
        double normalizedErrorRate = errorRate; // Already between 0 and 1
        double normalizedEndpointVariety = endpointVariety; // Already between 0 and 1

        // Calculate z-scores for each feature
        double requestRateScore = Math.abs(normalizedRequestRate - 1.0);
        double responseTimeScore = Math.abs(normalizedResponseTime - 1.0);
        double errorRateScore = Math.abs(normalizedErrorRate - 0.1); // Assuming 10% error rate is normal
        double endpointVarietyScore = Math.abs(normalizedEndpointVariety - 0.3); // Assuming 30% unique endpoints is normal

        // Weighted sum of z-scores
        return (requestRateScore * 0.4) +
               (responseTimeScore * 0.3) +
               (errorRateScore * 0.2) +
               (endpointVarietyScore * 0.1);
    }

    private void blockIP(String ip) {
        Instant blockUntil = Instant.now().plus(Duration.ofMinutes(BLOCK_DURATION_MINUTES));
        blockedIPs.put(ip, blockUntil);
    }

    public Map<String, Object> getIPStats(String ip) {
        List<RequestData> history = ipRequestHistory.get(ip);
        if (history == null || history.isEmpty()) {
            return null;
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRequests", history.size());
        stats.put("requestRate", calculateRequestRate(history));
        stats.put("avgResponseTime", calculateAverageResponseTime(history));
        stats.put("errorRate", calculateErrorRate(history));
        stats.put("endpointVariety", calculateEndpointVariety(history));
        stats.put("isBlocked", isIPBlocked(ip));
        
        if (isIPBlocked(ip)) {
            Instant blockedUntil = blockedIPs.get(ip);
            stats.put("blockedUntil", blockedUntil);
        }

        return stats;
    }
} 