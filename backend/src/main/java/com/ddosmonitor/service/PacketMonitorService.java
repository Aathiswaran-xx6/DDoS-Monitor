package com.ddosmonitor.service;

import com.ddosmonitor.model.Packet;
import com.ddosmonitor.model.Statistics;
import com.ddosmonitor.model.BlockedIP;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.*;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class PacketMonitorService {
    private final Map<String, List<Packet>> ipPackets = new ConcurrentHashMap<>();
    private final Map<String, AtomicInteger> requestCounts = new ConcurrentHashMap<>();
    private final Map<String, Instant> blockedIPs = new ConcurrentHashMap<>();
    private final List<Packet> recentPackets = Collections.synchronizedList(new ArrayList<>());
    private final Statistics statistics = new Statistics();
    private final MLAnomalyDetectionService mlService;

    @Autowired
    public PacketMonitorService(MLAnomalyDetectionService mlService) {
        this.mlService = mlService;
    }

    public void recordPacket(Packet packet) {
        // Check if IP is blocked by ML service
        if (mlService.isIPBlocked(packet.getSourceIP())) {
            packet.setBlocked(true);
            packet.setBlockReason("ML Anomaly Detection");
            recentPackets.add(0, packet);
            return;
        }

        // Record request for ML analysis
        mlService.recordRequest(
            packet.getSourceIP(),
            packet.getEndpoint(),
            packet.getResponseTime(),
            packet.getStatusCode()
        );

        // Update packet tracking
        ipPackets.computeIfAbsent(packet.getSourceIP(), k -> new ArrayList<>()).add(packet);
        requestCounts.computeIfAbsent(packet.getSourceIP(), k -> new AtomicInteger(0)).incrementAndGet();
        recentPackets.add(0, packet);

        // Update statistics
        statistics.setTotalPackets(statistics.getTotalPackets() + 1);
        statistics.setUniqueIPs(ipPackets.size());
        statistics.setBlockedIPs(blockedIPs.size());

        // Clean up old data
        cleanupOldData();
    }

    private void cleanupOldData() {
        Instant cutoff = Instant.now().minusSeconds(60);
        recentPackets.removeIf(packet -> packet.getTimestamp().isBefore(cutoff));
        
        // Clean up blocked IPs
        blockedIPs.entrySet().removeIf(entry -> 
            entry.getValue().isBefore(Instant.now()));
    }

    public List<Packet> getRecentPackets() {
        return new ArrayList<>(recentPackets);
    }

    public Map<String, Object> getIPStats(String ip) {
        Map<String, Object> stats = new HashMap<>();
        
        // Get ML-based stats
        Map<String, Object> mlStats = mlService.getIPStats(ip);
        if (mlStats != null) {
            stats.putAll(mlStats);
        }

        // Get basic stats
        List<Packet> packets = ipPackets.get(ip);
        if (packets != null) {
            stats.put("packetCount", packets.size());
            stats.put("requestCount", requestCounts.getOrDefault(ip, new AtomicInteger(0)).get());
        }

        return stats;
    }

    public Statistics getStatistics() {
        return statistics;
    }

    public List<BlockedIP> getBlockedIPs() {
        List<BlockedIP> blockedIPList = new ArrayList<>();
        blockedIPs.forEach((ip, blockedUntil) -> {
            BlockedIP blocked = new BlockedIP();
            blocked.setIp(ip);
            blocked.setBlockedUntil(blockedUntil);
            blocked.setReason("ML Anomaly Detection");
            blockedIPList.add(blocked);
        });
        return blockedIPList;
    }
}