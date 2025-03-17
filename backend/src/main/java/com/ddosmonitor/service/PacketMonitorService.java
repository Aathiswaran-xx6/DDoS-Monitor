package com.ddosmonitor.service;

import com.ddosmonitor.model.PacketData;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
public class PacketMonitorService {
    private final Map<String, Integer> packetCountMap = new ConcurrentHashMap<>();
    private final List<PacketData> packetDataList = new ArrayList<>();
    private static final int THRESHOLD = 1000; // Packets per minute threshold
    private Process tcpdumpProcess;

    public void startMonitoring() {
        try {
            String[] command = {
                "tcpdump",
                "-n", // Don't convert addresses to names
                "-i", "any", // Monitor all interfaces
                "-l" // Line-buffered output
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
                LocalDateTime.now().toString(),
                size,
                isIpSuspicious(sourceIp)
            );

            synchronized (packetDataList) {
                packetDataList.add(packet);
                if (packetDataList.size() > 1000) { // Keep only last 1000 packets
                    packetDataList.remove(0);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private String extractIp(String ipPort) {
        return ipPort.split("\\.")[0]; // Extract IP address from IP:PORT format
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