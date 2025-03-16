# DDoS Monitor Application

A web application for monitoring network traffic and detecting potential DDoS attacks using React, Spring Boot, and tcpdump.

## Prerequisites

- Node.js (v14 or higher)
- Java 11 or higher
- Maven
- tcpdump (must be installed on the system)
- Administrative privileges (for running tcpdump)

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Build the Spring Boot application:
   ```bash
   mvn clean install
   ```

3. Run the application:
   ```bash
   mvn spring-boot:run
   ```

The backend will start on http://localhost:8080

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The frontend will start on http://localhost:3000

## Usage

1. Open http://localhost:3000 in your browser
2. Log in with the following credentials:
   - Username: admin
   - Password: admin123
3. The dashboard will show real-time network traffic information
4. Suspicious IP addresses will be highlighted in red
5. The system automatically detects potential DDoS attacks based on packet frequency

## Features

- Real-time network traffic monitoring
- DDoS attack detection
- User authentication
- Packet analysis
- Traffic visualization
- IP address tracking

## Security Notes

- Change the default admin credentials in production
- Ensure proper network security measures are in place
- Run tcpdump with appropriate permissions
- Monitor system resources during heavy traffic

## License

MIT License 