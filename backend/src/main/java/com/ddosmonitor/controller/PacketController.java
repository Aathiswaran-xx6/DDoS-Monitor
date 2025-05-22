package com.ddosmonitor.controller;

import com.ddosmonitor.model.Packet;
import com.ddosmonitor.model.Statistics;
import com.ddosmonitor.model.BlockedIP;
import com.ddosmonitor.service.PacketMonitorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/packets")
@CrossOrigin(origins = "*")
public class PacketController {

    private final PacketMonitorService packetMonitorService;

    @Autowired
    public PacketController(PacketMonitorService packetMonitorService) {
        this.packetMonitorService = packetMonitorService;
    }

    @PostMapping
    public ResponseEntity<Void> recordPacket(@RequestBody Packet packet) {
        packetMonitorService.recordPacket(packet);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/recent")
    public ResponseEntity<List<Packet>> getRecentPackets() {
        return ResponseEntity.ok(packetMonitorService.getRecentPackets());
    }

    @GetMapping("/stats")
    public ResponseEntity<Statistics> getStatistics() {
        return ResponseEntity.ok(packetMonitorService.getStatistics());
    }

    @GetMapping("/ip/{ip}/stats")
    public ResponseEntity<Map<String, Object>> getIPStats(@PathVariable String ip) {
        Map<String, Object> stats = packetMonitorService.getIPStats(ip);
        return stats != null ? ResponseEntity.ok(stats) : ResponseEntity.notFound().build();
    }

    @GetMapping("/blocked")
    public ResponseEntity<List<BlockedIP>> getBlockedIPs() {
        return ResponseEntity.ok(packetMonitorService.getBlockedIPs());
    }
}