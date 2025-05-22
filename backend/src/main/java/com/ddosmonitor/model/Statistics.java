package com.ddosmonitor.model;

public class Statistics {
    private int totalPackets;
    private int uniqueIPs;
    private int blockedIPs;

    public Statistics() {
        this.totalPackets = 0;
        this.uniqueIPs = 0;
        this.blockedIPs = 0;
    }

    public int getTotalPackets() {
        return totalPackets;
    }

    public void setTotalPackets(int totalPackets) {
        this.totalPackets = totalPackets;
    }

    public int getUniqueIPs() {
        return uniqueIPs;
    }

    public void setUniqueIPs(int uniqueIPs) {
        this.uniqueIPs = uniqueIPs;
    }

    public int getBlockedIPs() {
        return blockedIPs;
    }

    public void setBlockedIPs(int blockedIPs) {
        this.blockedIPs = blockedIPs;
    }
} 