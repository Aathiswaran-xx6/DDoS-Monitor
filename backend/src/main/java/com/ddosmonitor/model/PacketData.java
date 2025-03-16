package com.ddosmonitor.model;

public class PacketData {
    private String sourceIp;
    private String destinationIp;
    private String protocol;
    private String timestamp;
    private int packetSize;
    private boolean isSuspicious;

    public PacketData(String sourceIp, String destinationIp, String protocol, 
                     String timestamp, int packetSize, boolean isSuspicious) {
        this.sourceIp = sourceIp;
        this.destinationIp = destinationIp;
        this.protocol = protocol;
        this.timestamp = timestamp;
        this.packetSize = packetSize;
        this.isSuspicious = isSuspicious;
    }

    // Getters and setters
    public String getSourceIp() {
        return sourceIp;
    }

    public void setSourceIp(String sourceIp) {
        this.sourceIp = sourceIp;
    }

    public String getDestinationIp() {
        return destinationIp;
    }

    public void setDestinationIp(String destinationIp) {
        this.destinationIp = destinationIp;
    }

    public String getProtocol() {
        return protocol;
    }

    public void setProtocol(String protocol) {
        this.protocol = protocol;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public int getPacketSize() {
        return packetSize;
    }

    public void setPacketSize(int packetSize) {
        this.packetSize = packetSize;
    }

    public boolean isSuspicious() {
        return isSuspicious;
    }

    public void setSuspicious(boolean suspicious) {
        isSuspicious = suspicious;
    }
} 