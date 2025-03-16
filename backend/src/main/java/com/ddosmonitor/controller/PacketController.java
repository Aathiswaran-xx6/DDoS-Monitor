package com.ddosmonitor.controller;

import com.ddosmonitor.model.PacketData;
import com.ddosmonitor.service.PacketMonitorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000")
public class PacketController {

    private final PacketMonitorService packetMonitorService;

    @Autowired
    public PacketController(PacketMonitorService packetMonitorService) {
        this.packetMonitorService = packetMonitorService;
    }

    @GetMapping("/packets")
    public ResponseEntity<List<PacketData>> getPackets() {
        return ResponseEntity.ok(packetMonitorService.getRecentPackets());
    }

    @PostMapping("/monitor/start")
    public ResponseEntity<String> startMonitoring() {
        packetMonitorService.startMonitoring();
        return ResponseEntity.ok("Monitoring started");
    }

    @PostMapping("/monitor/stop")
    public ResponseEntity<String> stopMonitoring() {
        packetMonitorService.stopMonitoring();
        return ResponseEntity.ok("Monitoring stopped");
    }
} 