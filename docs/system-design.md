# System Design Decisions

## Why WebSockets?
- Low latency
- Server push support
- Ideal for chat use cases

## Why Message Queue?
- Prevents message loss
- Enables asynchronous processing
- Isolates failures
RabbitMQ chosen for reliable async messaging and simpler operational overhead.

## Stateless Services
- Enables horizontal scaling
- Simplifies failover
- Improves resilience

## Cache Strategy
- Cache-aside pattern
- TTL-based presence tracking
- Database remains source of truth

## Failure Handling
- Socket server crash → clients reconnect
- Worker crash → messages retried
- Cache failure → fallback to DB
