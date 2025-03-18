# DDoS Monitoring System for E-Commerce Website

This project consists of a DDoS monitoring system that tracks traffic to and from an e-commerce website. The system includes:

1. A victim e-commerce website (Express.js + React)
2. A DDoS monitoring application (Spring Boot + React)

## Project Structure

```
/
├── victim-ecommerce/     # The e-commerce website (victim site)
│   ├── server.js         # Express.js backend
│   └── client/           # React frontend
│
├── backend/              # DDoS monitoring backend (Spring Boot)
│   └── src/              # Java source code
│
└── frontend/             # DDoS monitoring frontend (React)
    └── src/              # React source code
```

## Setup Instructions

### 1. Start the E-Commerce Website (Victim Site)

```bash
# Start the backend server
cd victim-ecommerce
node server.js

# In a new terminal, start the frontend
cd victim-ecommerce/client
npm start
```

The e-commerce site will be available at:
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

### 2. Start the DDoS Monitoring System

```bash
# Start the Spring Boot backend
cd backend
./mvnw spring-boot:run

# In a new terminal, start the React frontend
cd frontend
npm start
```

The monitoring system will be available at:
- Backend: http://localhost:8080
- Frontend: http://localhost:3001 (or another available port)

## Authentication

The monitoring system requires authentication to access. Use one of the following credentials:

- Admin: username: `admin`, password: `admin123`
- Monitor User: username: `monitor1`, password: `monitor123`

## Features

### E-Commerce Website (Victim)
- Product browsing
- Shopping cart functionality
- User registration and login
- Checkout process

### DDoS Monitoring System
- Real-time traffic monitoring
- Packet analysis
- Suspicious activity detection
- Traffic statistics and visualization
- IP frequency analysis
- Protocol distribution charts

## Technical Details

### Packet Monitoring

The system uses `tcpdump` to capture network packets to/from the e-commerce site. If `tcpdump` is not available, it falls back to simulated data for demonstration purposes.

### Authentication

The monitoring system uses Spring Security with JWT tokens for authentication. Only authorized users can access the monitoring dashboard.

### Real-time Updates

The dashboard updates in real-time using polling to fetch the latest packet data and statistics every 2 seconds.

## Customization

You can adjust the monitoring thresholds in `PacketMonitorService.java`:

```java
private static final int THRESHOLD = 100; // Packets per minute threshold
```

Lower this value to make the system more sensitive to potential DDoS attacks.

## License

MIT License 