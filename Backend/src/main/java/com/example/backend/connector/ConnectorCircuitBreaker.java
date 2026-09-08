package com.example.backend.connector;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Lightweight, zero-overhead circuit breaker for external job API connectors.
 * Protects the search engine from cascading latencies and hanging thread pools
 * by fast-failing dead or rate-limited external providers.
 */
@Component
public class ConnectorCircuitBreaker {

    private static final Logger logger = LoggerFactory.getLogger(ConnectorCircuitBreaker.class);

    private static final int FAILURE_THRESHOLD = 5;
    private static final long RESET_TIMEOUT_MILLIS = 30_000L; // 30 seconds

    public enum State {
        CLOSED,     // Normal healthy operation
        OPEN,       // Tripped: fast-fail requests immediately
        HALF_OPEN   // Testing single probe request
    }

    private static class CircuitState {
        State state = State.CLOSED;
        AtomicInteger consecutiveFailures = new AtomicInteger(0);
        long lastFailureTime = 0L;
    }

    private final Map<String, CircuitState> circuits = new ConcurrentHashMap<>();

    private CircuitState getCircuit(String connectorId) {
        return circuits.computeIfAbsent(connectorId.toUpperCase(), k -> new CircuitState());
    }

    /**
     * Determines whether an outbound connector request is allowed or should fast-fail.
     */
    public boolean allowRequest(String connectorId) {
        CircuitState circuit = getCircuit(connectorId);
        long now = System.currentTimeMillis();

        synchronized (circuit) {
            if (circuit.state == State.OPEN) {
                if (now - circuit.lastFailureTime > RESET_TIMEOUT_MILLIS) {
                    logger.info("CircuitBreaker [{}]: Transitioning from OPEN to HALF_OPEN (probing health)", connectorId);
                    circuit.state = State.HALF_OPEN;
                    return true;
                }
                return false; // Fast-fail
            }
            return true;
        }
    }

    /**
     * Records a successful execution and resets the breaker to CLOSED.
     */
    public void recordSuccess(String connectorId) {
        CircuitState circuit = getCircuit(connectorId);
        synchronized (circuit) {
            if (circuit.state != State.CLOSED) {
                logger.info("CircuitBreaker [{}]: Health restored! Resetting to CLOSED", connectorId);
            }
            circuit.state = State.CLOSED;
            circuit.consecutiveFailures.set(0);
        }
    }

    /**
     * Records a failure or timeout. If threshold exceeded, trips circuit to OPEN.
     */
    public void recordFailure(String connectorId) {
        CircuitState circuit = getCircuit(connectorId);
        long now = System.currentTimeMillis();

        synchronized (circuit) {
            circuit.lastFailureTime = now;
            int failures = circuit.consecutiveFailures.incrementAndGet();

            if (failures >= FAILURE_THRESHOLD) {
                if (circuit.state != State.OPEN) {
                    logger.warn("CircuitBreaker [{}]: TRIPPED to OPEN after {} consecutive failures. Fast-failing for {}s",
                            connectorId, failures, RESET_TIMEOUT_MILLIS / 1000);
                }
                circuit.state = State.OPEN;
            }
        }
    }

    public State getState(String connectorId) {
        return getCircuit(connectorId).state;
    }

    public Map<String, Map<String, Object>> getAllCircuits() {
        Map<String, Map<String, Object>> result = new java.util.LinkedHashMap<>();
        circuits.forEach((id, circuit) -> {
            Map<String, Object> data = new java.util.LinkedHashMap<>();
            data.put("connectorId", id);
            data.put("state", circuit.state.name());
            data.put("failures", circuit.consecutiveFailures.get());
            data.put("lastFailureTime", circuit.lastFailureTime);
            result.put(id, data);
        });
        return result;
    }

    public void resetAll() {
        circuits.values().forEach(c -> {
            synchronized (c) {
                c.state = State.CLOSED;
                c.consecutiveFailures.set(0);
            }
        });
        logger.info("CircuitBreaker: All circuits successfully reset to CLOSED.");
    }

    public void reset(String connectorId) {
        CircuitState circuit = getCircuit(connectorId);
        synchronized (circuit) {
            circuit.state = State.CLOSED;
            circuit.consecutiveFailures.set(0);
        }
        logger.info("CircuitBreaker [{}]: Circuit manually reset to CLOSED.", connectorId);
    }
}
