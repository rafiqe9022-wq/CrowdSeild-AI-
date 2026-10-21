import { describe, it, expect, beforeEach } from 'vitest';
import { initializeStore, DEMO_USERS, DEMO_ZONES, DEMO_GATES, DEMO_ROADS, generateInitialObservations, generateInitialAlerts } from './store';

describe('Store Initialization', () => {
  it('should create a valid initial store', () => {
    const store = initializeStore();
    expect(store).toBeDefined();
    expect(store.currentUser).toBeNull();
    expect(store.event).toBeDefined();
    expect(store.zones.length).toBeGreaterThan(0);
    expect(store.gates.length).toBeGreaterThan(0);
    expect(store.roads.length).toBeGreaterThan(0);
    expect(store.observations.length).toBeGreaterThan(0);
    expect(store.alerts.length).toBeGreaterThan(0);
  });

  it('should have valid demo users with correct roles', () => {
    expect(DEMO_USERS.length).toBe(5);
    expect(DEMO_USERS.find(u => u.role === 'admin')).toBeDefined();
    expect(DEMO_USERS.find(u => u.role === 'operator')).toBeDefined();
    expect(DEMO_USERS.find(u => u.role === 'traffic_officer')).toBeDefined();
    expect(DEMO_USERS.find(u => u.role === 'emergency_officer')).toBeDefined();
    expect(DEMO_USERS.find(u => u.role === 'auditor')).toBeDefined();
  });

  it('should use demoPassword field (not passwordHash)', () => {
    DEMO_USERS.forEach(user => {
      expect(user.demoPassword).toBeDefined();
      expect(typeof user.demoPassword).toBe('string');
      expect(user.demoPassword.length).toBeGreaterThan(0);
      // Ensure old field name is not present
      expect((user as any).passwordHash).toBeUndefined();
    });
  });

  it('should generate initial observations for all zones', () => {
    const observations = generateInitialObservations();
    expect(observations.length).toBeGreaterThan(0);
    
    // Each zone should have observations
    DEMO_ZONES.forEach(zone => {
      const zoneObs = observations.filter(o => o.zoneId === zone.id);
      expect(zoneObs.length).toBeGreaterThan(0);
    });
  });

  it('should generate initial alerts', () => {
    const alerts = generateInitialAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    alerts.forEach(alert => {
      expect(alert.id).toBeDefined();
      expect(alert.title).toBeDefined();
      expect(alert.severity).toBeDefined();
      expect(['info', 'warning', 'critical']).toContain(alert.severity);
    });
  });

  it('should have valid zone data', () => {
    DEMO_ZONES.forEach(zone => {
      expect(zone.id).toBeDefined();
      expect(zone.name).toBeDefined();
      expect(zone.area).toBeGreaterThan(0);
      expect(zone.capacity).toBeGreaterThan(0);
      expect(zone.center.lat).toBeDefined();
      expect(zone.center.lng).toBeDefined();
    });
  });

  it('should have valid gate data', () => {
    DEMO_GATES.forEach(gate => {
      expect(gate.id).toBeDefined();
      expect(gate.name).toBeDefined();
      expect(gate.capacity).toBeGreaterThan(0);
      expect(['open', 'closed', 'restricted']).toContain(gate.status);
    });
  });

  it('should have valid road data', () => {
    DEMO_ROADS.forEach(road => {
      expect(road.id).toBeDefined();
      expect(road.name).toBeDefined();
      expect(road.fromNode).toBeDefined();
      expect(road.toNode).toBeDefined();
      expect(road.distance).toBeGreaterThan(0);
      expect(['open', 'congested', 'blocked']).toContain(road.status);
      expect(road.congestionLevel).toBeGreaterThanOrEqual(0);
      expect(road.congestionLevel).toBeLessThanOrEqual(100);
    });
  });

  it('should have at least one blocked road for demo scenario', () => {
    const blockedRoads = DEMO_ROADS.filter(r => r.status === 'blocked');
    expect(blockedRoads.length).toBeGreaterThan(0);
  });

  it('should have simulation state with valid defaults', () => {
    const store = initializeStore();
    expect(store.simulation.running).toBe(false);
    expect(store.simulation.speed).toBeGreaterThan(0);
    expect(store.simulation.crowdMultiplier).toBe(1.0);
    expect(store.simulation.outflowReduction).toBeGreaterThanOrEqual(0);
    expect(store.simulation.outflowReduction).toBeLessThanOrEqual(1);
    expect(Array.isArray(store.simulation.blockedRoads)).toBe(true);
    expect(Array.isArray(store.simulation.closedGates)).toBe(true);
  });
});
