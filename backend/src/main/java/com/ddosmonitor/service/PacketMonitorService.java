package com.ddosmonitor.service;

import com.ddosmonitor.model.PacketData;
import lombok.extern.slf4j.Slf4j;
import org.pcap4j.core.*;
import org.pcap4j.packet.IpV4Packet;
import org.pcap4j.packet.Packet;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;

import javax.annotation.PreDestroy;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class PacketMonitorService {
    private static final String COUNT_KEY = "count";
    private static final int SNAPSHOT_LENGTH = 65536;
    private static final int READ_TIMEOUT = 50;
    private static final int THRESHOLD = 1000; // Packets per minute threshold

    private final Map<String, Integer> packetCountMap = new ConcurrentHashMap<>();
    private final List<PacketData> packetDataList = new ArrayList<>();
    private PcapHandle handle;
    private ExecutorService executorService;
    private volatile boolean isRunning = false;

    public void startMonitoring() {
        if (isRunning) {
            log.info("Packet monitoring is already running");
            return;
        }

        try {
            // Get network interfaces
            PcapNetworkInterface nif = getNetworkInterface();
            if (nif == null) {
                log.error("No network interface found");
                return;
            }

            // Open the network interface
            handle = nif.openLive(SNAPSHOT_LENGTH, PcapNetworkInterface.PromiscuousMode.PROMISCUOUS, READ_TIMEOUT);
            
            // Start packet capture in a separate thread
            executorService = Executors.newSingleThreadExecutor();
            isRunning = true;

            executorService.execute(() -> {
                try {
                    handle.loop(-1, this::processPacket);
                } catch (PcapNativeException | InterruptedException | NotOpenException e) {
                    log.error("Error in packet capture loop", e);
                }
            });

            log.info("Started monitoring on interface: {}", nif.getName());
        } catch (PcapNativeException e) {
            log.error("Failed to start packet monitoring", e);
        }
    }

    private PcapNetworkInterface getNetworkInterface() throws PcapNativeException {
        // Get all network interfaces
        List<PcapNetworkInterface> devices = Pcaps.findAllDevs();
        
        // Find the first active interface
        return devices.stream()
                .filter(dev -> dev.getLinkLayerAddresses() != null && !dev.getLinkLayerAddresses().isEmpty())
                .findFirst()
                .orElse(null);
    }

    private void processPacket(Packet packet) {
        try {
            if (packet.contains(IpV4Packet.class)) {
                IpV4Packet ipv4Packet = packet.get(IpV4Packet.class);
                String sourceIp = ipv4Packet.getHeader().getSrcAddr().getHostAddress();
                String destIp = ipv4Packet.getHeader().getDstAddr().getHostAddress();
                
                // Update packet count for source IP
                packetCountMap.merge(sourceIp, 1, Integer::sum);

                // Create packet data
                PacketData packetData = new PacketData(
                    sourceIp,
                    destIp,
                    ipv4Packet.getHeader().getProtocol().name(),
                    LocalDateTime.now().toString(),
                    packet.length(),
                    isIpSuspicious(sourceIp)
                );

                synchronized (packetDataList) {
                    packetDataList.add(packetData);
                    if (packetDataList.size() > 1000) { // Keep only last 1000 packets
                        packetDataList.remove(0);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error processing packet", e);
        }
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

    @PreDestroy
    public void stopMonitoring() {
        isRunning = false;
        if (handle != null) {
            handle.breakLoop();
            handle.close();
        }
        if (executorService != null) {
            executorService.shutdown();
            try {
                if (!executorService.awaitTermination(5, TimeUnit.SECONDS)) {
                    executorService.shutdownNow();
                }
            } catch (InterruptedException e) {
                executorService.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
        log.info("Packet monitoring stopped");
    }
} 