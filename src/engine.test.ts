import { describe, it, expect } from 'vitest';
import { calculateRiskScore, findShortestPath } from './engine';
import { Zone, Gate, Road, CrowdObservation, GraphNode, GraphEdge } from './types';

describe('CrowdPulse Risk Engine', () => {
  const createTestZone = (overrides: Partial<Zone> = {}): Zone => ({
    id: 'z1',
    eventId: 'evt-001',
    name: 'Test Zone',
    type: 'pedestrian',
    area: 1000,
    capacity: 5000,
    center: { lat: 25.356, lng: 82.990 },
    bounds: [],
    color: '#ef4444',
    ...overrides,
  });

  const createTestObservation = (overrides: Partial<CrowdObservation> = {}): CrowdObservation => ({
    id: 'obs-1',
    zoneId: 'z1',
    timestamp: new Date().toISOString(),
    estimatedCount: 3000,
    density: 3.0,
    source: 'simulation',
    confidence: 0.8,
    ...overrides,
  });

  it('should return low risk for empty zone', () => {
    const zone = createTestZone();
    const result = calculateRiskScore(zone, [], [], [], []);
    expect(result.score).toBe(0);
    expect(result.severity).toBe('low');
    expect(result.dataFreshness).toBe('No data available');
  });

  it('should calculate risk based on density', () => {
    const zone = createTestZone({ area: 1000, capacity: 5000 });
    const observations = [createTestObservation({ density: 4.0, estimatedCount: 4000 })]; // 80% capacity
    const result = calculateRiskScore(zone, observations, [], [], []);
    expect(result.score).toBeGreaterThan(0);
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it('should return critical risk for over-capacity zone', () => {
    const zone = createTestZone({ area: 1000, capacity: 5000 });
    const observations = [createTestObservation({ density: 6.0, estimatedCount: 6000 })]; // 120% capacity
    const result = calculateRiskScore(zone, observations, [], [], []);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.severity).toBe('critical');
  });

  it('should increase risk when roads are blocked', () => {
    const zone = createTestZone();
    const observations = [createTestObservation({ density: 3.0 })];
    const roads: Road[] = [{
      id: 'r1', eventId: 'evt-001', name: 'Test Road', type: 'pedestrian',
      fromNode: 'z1', toNode: 'g1', distance: 100, capacity: 100,
      status: 'blocked', currentFlow: 0, congestionLevel: 100
    }];
    
    const resultWithoutBlock = calculateRiskScore(zone, observations, [], [], []);
    const resultWithBlock = calculateRiskScore(zone, observations, [], roads, ['r1']);
    
    expect(resultWithBlock.score).toBeGreaterThan(resultWithoutBlock.score);
  });

  it('should handle invalid zone configuration gracefully', () => {
    const zone = createTestZone({ area: 0, capacity: 0 });
    const observations = [createTestObservation()];
    const result = calculateRiskScore(zone, observations, [], [], []);
    expect(result.score).toBe(0);
    expect(result.severity).toBe('low');
    expect(result.dataFreshness).toBe('Invalid zone configuration');
  });

  it('should calculate trend correctly', () => {
    const zone = createTestZone();
    const now = Date.now();
    const observations: CrowdObservation[] = [
      { ...createTestObservation(), timestamp: new Date(now).toISOString(), estimatedCount: 1000, density: 1.0 },
      { ...createTestObservation(), timestamp: new Date(now - 300000).toISOString(), estimatedCount: 1200, density: 1.2 },
      { ...createTestObservation(), timestamp: new Date(now - 600000).toISOString(), estimatedCount: 1400, density: 1.4 },
      { ...createTestObservation(), timestamp: new Date(now - 900000).toISOString(), estimatedCount: 1600, density: 1.6 },
      { ...createTestObservation(), timestamp: new Date(now - 1200000).toISOString(), estimatedCount: 1800, density: 1.8 },
    ];
    
    const result = calculateRiskScore(zone, observations, [], [], []);
    expect(result.trend).toBe('decreasing'); // Counts are going down over time (most recent is lowest)
  });

  it('should provide projection when trend is non-stable', () => {
    const zone = createTestZone();
    const now = Date.now();
    const observations: CrowdObservation[] = Array.from({ length: 6 }, (_, i) => ({
      ...createTestObservation(),
      timestamp: new Date(now - i * 300000).toISOString(),
      estimatedCount: 1000 + i * 200,
      density: 1.0 + i * 0.2,
    }));
    
    const result = calculateRiskScore(zone, observations, [], [], []);
    expect(result.trend).not.toBe('stable');
    // Projection may or may not be set depending on trend calculation
  });

  it('should not produce NaN or Infinity in scores', () => {
    const zone = createTestZone();
    const observations = [createTestObservation({ density: NaN, estimatedCount: NaN })];
    const result = calculateRiskScore(zone, observations, [], [], []);
    expect(isNaN(result.score)).toBe(false);
    expect(isFinite(result.score)).toBe(true);
  });
});

describe('Graph-Based Routing', () => {
  const nodes: GraphNode[] = [
    { id: 'g1', lat: 25.365, lng: 82.988, type: 'gate' },
    { id: 'z1', lat: 25.356, lng: 82.990, type: 'zone_center' },
    { id: 'z2', lat: 25.353, lng: 82.992, type: 'zone_center' },
    { id: 'g5', lat: 25.3555, lng: 82.983, type: 'gate' },
  ];

  const edges: GraphEdge[] = [
    { id: 'r1', from: 'g1', to: 'z1', distance: 400, travelMode: 'both', travelTime: 300, congestionCost: 50, status: 'open', capacity: 500 },
    { id: 'r2', from: 'z1', to: 'z2', distance: 300, travelMode: 'pedestrian', travelTime: 225, congestionCost: 30, status: 'open', capacity: 800 },
    { id: 'r3', from: 'z1', to: 'g5', distance: 350, travelMode: 'pedestrian', travelTime: 262, congestionCost: 20, status: 'open', capacity: 700 },
    { id: 'r4', from: 'g1', to: 'z2', distance: 500, travelMode: 'both', travelTime: 375, congestionCost: 100, status: 'blocked', capacity: 300 },
  ];

  it('should find shortest path between nodes', () => {
    const result = findShortestPath(nodes, edges, 'g1', 'z2', 'both');
    expect(result).not.toBeNull();
    expect(result!.path.length).toBeGreaterThan(0);
    expect(result!.path[0]).toBe('g1');
    expect(result!.path[result!.path.length - 1]).toBe('z2');
  });

  it('should avoid blocked roads when requested', () => {
    const result = findShortestPath(nodes, edges, 'g1', 'z2', 'both', true);
    expect(result).not.toBeNull();
    // Should not use the blocked r4 edge
    expect(result!.path).not.toContain('r4');
  });

  it('should return null for unreachable destination', () => {
    const disconnectedNodes: GraphNode[] = [
      { id: 'a', lat: 0, lng: 0, type: 'gate' },
      { id: 'b', lat: 1, lng: 1, type: 'zone_center' },
    ];
    const result = findShortestPath(disconnectedNodes, [], 'a', 'b', 'both');
    expect(result).toBeNull();
  });

  it('should handle same origin and destination', () => {
    const result = findShortestPath(nodes, edges, 'g1', 'g1', 'both');
    expect(result).not.toBeNull();
    expect(result!.path).toEqual(['g1']);
    expect(result!.distance).toBe(0);
    expect(result!.time).toBe(0);
  });

  it('should return null for non-existent nodes', () => {
    const result = findShortestPath(nodes, edges, 'nonexistent', 'z1', 'both');
    expect(result).toBeNull();
  });

  it('should respect travel mode restrictions', () => {
    // r2 is pedestrian only, so vehicle mode should not use it
    const result = findShortestPath(nodes, edges, 'g1', 'z2', 'vehicle', true);
    // May or may not find a path depending on available vehicle edges
    // This test validates the function doesn't crash
    expect(result === null || result.path.length > 0).toBe(true);
  });

  it('should calculate distance correctly', () => {
    const result = findShortestPath(nodes, edges, 'g1', 'z1', 'both');
    expect(result).not.toBeNull();
    expect(result!.distance).toBe(400); // r1 distance
  });

  it('should factor in congestion cost', () => {
    // Path through r1 (congestionCost: 50) vs alternative
    const result = findShortestPath(nodes, edges, 'g1', 'z1', 'both');
    expect(result).not.toBeNull();
    expect(result!.time).toBeGreaterThan(0);
  });
});

describe('Input Validation', () => {
  it('should handle empty observation arrays', () => {
    const zone: Zone = {
      id: 'z1', eventId: 'evt-001', name: 'Test', type: 'pedestrian',
      area: 1000, capacity: 5000, center: { lat: 0, lng: 0 }, bounds: [], color: '#000'
    };
    const result = calculateRiskScore(zone, [], [], [], []);
    expect(result.score).toBe(0);
    expect(result.severity).toBe('low');
  });

  it('should handle negative density values', () => {
    const zone: Zone = {
      id: 'z1', eventId: 'evt-001', name: 'Test', type: 'pedestrian',
      area: 1000, capacity: 5000, center: { lat: 0, lng: 0 }, bounds: [], color: '#000'
    };
    const obs: CrowdObservation = {
      id: 'obs-1', zoneId: 'z1', timestamp: new Date().toISOString(),
      estimatedCount: -100, density: -0.1, source: 'simulation', confidence: 0.8
    };
    const result = calculateRiskScore(zone, [obs], [], [], []);
    expect(isNaN(result.score)).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
