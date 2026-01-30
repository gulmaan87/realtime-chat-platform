# Real-Time Chat Platform – Architecture

## Overview
This system is a scalable, fault-tolerant real-time chat platform designed using
WebSockets, message queues, caching, and cloud-native principles.

## Core Components

### 1. Socket Gateway
- Manages WebSocket connections
- Handles real-time message exchange
- Stateless by design
- Publishes messages to message queue

### 2. Message Queue
- Decouples real-time traffic from persistence
- Buffers messages during traffic spikes
- Guarantees delivery and retry

### 3. Message Worker
- Consumes messages from queue
- Persists messages to database
- Updates delivery status

### 4. Cache (Redis)
- Stores user presence (online/offline)
- Caches recent messages
- Reduces database load

### 5. API Service
- Handles REST APIs
- Chat history retrieval
- User and room management

## High-Level Flow

Client → Load Balancer → Socket Gateway  
Socket Gateway → Message Queue  
Message Queue → Worker → Database  
Cache used for hot data and presence
