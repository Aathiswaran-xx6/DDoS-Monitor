package com.ddosmonitor.service;

import com.ddosmonitor.model.PacketData;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
public class PacketMonitorService {
    private final Map<String, Integer> packetCountMap = new ConcurrentHashMap<>();
    private final List<PacketData> packetDataList = new ArrayList<>();
    private static final int THRESHOLD = 100; // Lower threshold for demo purposes
    private Process tcpdumpProcess;
    
    // E-commerce site details
    private static final String ECOMMERCE_HOST = "localhost";
    private static final int ECOMMERCE_PORT = 5000; // The port your e-commerce site is running on
    
    // Track traffic statistics
    private int totalPackets = 0;
    private int suspiciousPackets = 0;
    private final Map<String, Integer> ipFrequency = new ConcurrentHashMap<>();
    private final Map<String, Integer> protocolDistribution = new ConcurrentHashMap<>();

    public void startMonitoring() {
        try {
            // Filter for traffic to/from the e-commerce site
            String[] command = {
                "tcpdump",
                "-n", // Don't convert addresses to names
                "-i", "any", // Monitor all interfaces
                "-l", // Line-buffered output
                "host " + ECOMMERCE_HOST + " and (port " + ECOMMERCE_PORT + " or port 3000)"
            };
            
            ProcessBuilder processBuilder = new ProcessBuilder(command);
            tcpdumpProcess = processBuilder.start();

            BufferedReader reader = new BufferedReader(
                new InputStreamReader(tcpdumpProcess.getInputStream())
            );

            new Thread(() -> {
                String line;
                try {
                    while ((line = reader.readLine()) != null) {
                        processPacket(line);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }).start();

        } catch (Exception e) {
            e.printStackTrace();
            // Fallback to simulated data if tcpdump fails
            startSimulation();
        }
    }

    private void startSimulation() {
        new Thread(() -> {
            try {
                while (true) {
                    simulatePacket();
                    Thread.sleep(500); // Generate a packet every 500ms
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }).start();
    }

    private void simulatePacket() {
        String[] sourceIps = {"192.168.1.100", "10.0.0.5", "172.16.0.10", "192.168.1.200"};
        String[] protocols = {"TCP", "UDP", "HTTP", "HTTPS"};
        
        String sourceIp = sourceIps[(int) (Math.random() * sourceIps.length)];
        String protocol = protocols[(int) (Math.random() * protocols.length)];
        int size = 100 + (int) (Math.random() * 1000);
        
        // Occasionally generate suspicious traffic
        boolean generateSuspicious = Math.random() < 0.2;
        
        if (generateSuspicious) {
            // Use a specific IP for suspicious traffic
            sourceIp = "10.0.0.99";
            // Generate multiple packets in quick succession
            for (int i = 0; i < 10; i++) {
                packetCountMap.merge(sourceIp, 1, Integer::sum);
                
                PacketData packet = new PacketData(
                    sourceIp,
                    ECOMMERCE_HOST,
                    protocol,
                    LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                    size,
                    isIpSuspicious(sourceIp)
                );
                
                addPacket(packet);
            }
        } else {
            // Update packet count for source IP
            packetCountMap.merge(sourceIp, 1, Integer::sum);
            
            PacketData packet = new PacketData(
                sourceIp,
                ECOMMERCE_HOST,
                protocol,
                LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                size,
                isIpSuspicious(sourceIp)
            );
            
            addPacket(packet);
        }
    }

    private void processPacket(String packetInfo) {
        try {
            // Parse tcpdump output
            String[] parts = packetInfo.split(" ");
            String sourceIp = extractIp(parts[2]);
            String destinationIp = extractIp(parts[4]);
            String protocol = parts[5];
            int size = Integer.parseInt(parts[parts.length - 1]);

            // Update packet count for source IP
            packetCountMap.merge(sourceIp, 1, Integer::sum);
            
            // Create packet data
            PacketData packet = new PacketData(
                sourceIp,
                destinationIp,
                protocol,
                LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                size,
                isIpSuspicious(sourceIp)
            );

            addPacket(packet);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    private void addPacket(PacketData packet) {
        synchronized (packetDataList) {
            packetDataList.add(packet);
            if (packetDataList.size() > 1000) { // Keep only last 1000 packets
                packetDataList.remove(0);
            }
            
            // Update statistics
            totalPackets++;
            if (packet.isSuspicious()) {
                suspiciousPackets++;
            }
            
            // Update IP frequency
            ipFrequency.merge(packet.getSourceIp(), 1, Integer::sum);
            
            // Update protocol distribution
            protocolDistribution.merge(packet.getProtocol(), 1, Integer::sum);
        }
    }

    private String extractIp(String ipPort) {
        if (ipPort.contains(".")) {
            return ipPort.split("\\.")[0]; // Extract IP address from IP:PORT format
        }
        return ipPort;
    }

    private boolean isIpSuspicious(String ip) {
        return packetCountMap.getOrDefault(ip, 0) > THRESHOLD;
    }

    @Scheduled(fixedRate = 60000) // Clear counters every minute
    public void clearCounters() {
        packetCountMap.clear();
    }

    public List<PacketData> getRecentPackets() {
        synchronized (packetDataList) {
            return new ArrayList<>(packetDataList);
        }
    }
    
    public Map<String, Object> getStatistics() {
        Map<String, Object> stats = new ConcurrentHashMap<>();
        stats.put("totalPackets", totalPackets);
        stats.put("suspiciousPackets", suspiciousPackets);
        stats.put("ipFrequency", ipFrequency);
        stats.put("protocolDistribution", protocolDistribution);
        
        return stats;
    }

    public void stopMonitoring() {
        if (tcpdumpProcess != null) {
            tcpdumpProcess.destroy();
            try {
                tcpdumpProcess.waitFor(5, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }
}