// CrowdShield AI - Data Store with localStorage persistence
import { createContext, useContext } from 'react';
import { User, Event, Zone, Gate, Road, Intersection, CrowdObservation, Alert, Incident, AuditEntry, SimulationState, GraphNode, GraphEdge, EmergencyVehicle, SignalRecommendation, SimulationScenario, RouteRecommendation } from './types';

// Demo users (passwords are hashed with simple hash for demo only)
export const DEMO_USERS: User[] = [
  { id: 'u1', username: 'admin', displayName: 'Rajesh Kumar (Admin)', role: 'admin', passwordHash: 'admin123' },
  { id: 'u2', username: 'operator', displayName: 'Priya Sharma (Operator)', role: 'operator', passwordHash: 'operator123' },
  { id: 'u3', username: 'traffic', displayName: 'Amit Singh (Traffic)', role: 'traffic_officer', passwordHash: 'traffic123' },
  { id: 'u4', username: 'emergency', displayName: 'Dr. Meera Patel (Emergency)', role: 'emergency_officer', passwordHash: 'emergency123' },
  { id: 'u5', username: 'auditor', displayName: 'Vikram Rao (Auditor)', role: 'auditor', passwordHash: 'auditor123' },
];

// Demo event - "Kumbh Mela 2026 Simulation"
export const DEMO_EVENT: Event = {
  id: 'evt-001',
  name: 'Kumbh Mela 2026 - Simulation',
  description: 'Large-scale religious gathering simulation for crowd safety demonstration. This is a fictional event with simulated data.',
  location: { lat: 25.3548, lng: 82.9897 }, // Varanasi area
  startDate: '2026-01-14',
  endDate: '2026-01-20',
  status: 'active',
  thresholds: {
    lowDensity: 30,
    moderateDensity: 50,
    highDensity: 70,
    criticalDensity: 85,
    congestionThreshold: 70,
    rapidGrowthRate: 200
  }
};

// Demo zones
export const DEMO_ZONES: Zone[] = [
  { id: 'z1', eventId: 'evt-001', name: 'Main Temple Area', type: 'pedestrian', area: 5000, capacity: 8000, center: { lat: 25.3560, lng: 82.9900 }, bounds: [[25.357, 82.988], [25.357, 82.992], [25.355, 82.992], [25.355, 82.988]], color: '#ef4444' },
  { id: 'z2', eventId: 'evt-001', name: 'River Ghats', type: 'pedestrian', area: 8000, capacity: 12000, center: { lat: 25.3530, lng: 82.9920 }, bounds: [[25.354, 82.990], [25.354, 82.994], [25.352, 82.994], [25.352, 82.990]], color: '#f97316' },
  { id: 'z3', eventId: 'evt-001', name: 'Food Court Zone', type: 'pedestrian', area: 3000, capacity: 4000, center: { lat: 25.3580, lng: 82.9870 }, bounds: [[25.359, 82.985], [25.359, 82.989], [25.357, 82.989], [25.357, 82.985]], color: '#eab308' },
  { id: 'z4', eventId: 'evt-001', name: 'Parking Area North', type: 'parking', area: 10000, capacity: 2000, center: { lat: 25.3620, lng: 82.9850 }, bounds: [[25.363, 82.983], [25.363, 82.987], [25.361, 82.987], [25.361, 82.983]], color: '#22c55e' },
  { id: 'z5', eventId: 'evt-001', name: 'Parking Area South', type: 'parking', area: 8000, capacity: 1500, center: { lat: 25.3480, lng: 82.9940 }, bounds: [[25.349, 82.992], [25.349, 82.996], [25.347, 82.996], [25.347, 82.992]], color: '#22c55e' },
  { id: 'z6', eventId: 'evt-001', name: 'Stage & Performance Area', type: 'pedestrian', area: 4000, capacity: 6000, center: { lat: 25.3590, lng: 82.9930 }, bounds: [[25.360, 82.991], [25.360, 82.995], [25.358, 82.995], [25.358, 82.991]], color: '#a855f7' },
  { id: 'z7', eventId: 'evt-001', name: 'Medical & Emergency Hub', type: 'emergency_access', area: 2000, capacity: 500, center: { lat: 25.3550, lng: 82.9850 }, bounds: [[25.356, 82.984], [25.356, 82.986], [25.354, 82.986], [25.354, 82.984]], color: '#06b6d4' },
  { id: 'z8', eventId: 'evt-001', name: 'Exhibition Grounds', type: 'mixed', area: 6000, capacity: 9000, center: { lat: 25.3600, lng: 82.9880 }, bounds: [[25.361, 82.986], [25.361, 82.990], [25.359, 82.990], [25.359, 82.986]], color: '#3b82f6' },
  { id: 'z9', eventId: 'evt-001', name: 'North Entry Corridor', type: 'pedestrian', area: 2500, capacity: 5000, center: { lat: 25.3640, lng: 82.9890 }, bounds: [[25.365, 82.987], [25.365, 82.991], [25.363, 82.991], [25.363, 82.987]], color: '#10b981' },
  { id: 'z10', eventId: 'evt-001', name: 'South Entry Plaza', type: 'pedestrian', area: 3500, capacity: 6000, center: { lat: 25.3490, lng: 82.9910 }, bounds: [[25.350, 82.989], [25.350, 82.993], [25.348, 82.993], [25.348, 82.989]], color: '#10b981' },
];

// Demo gates
export const DEMO_GATES: Gate[] = [
  { id: 'g1', eventId: 'evt-001', name: 'North Gate A', type: 'both', location: { lat: 25.3650, lng: 82.9880 }, capacity: 3000, status: 'open', currentInflow: 2400, currentOutflow: 1800 },
  { id: 'g2', eventId: 'evt-001', name: 'North Gate B', type: 'entry', location: { lat: 25.3650, lng: 82.9910 }, capacity: 2500, status: 'open', currentInflow: 2100, currentOutflow: 0 },
  { id: 'g3', eventId: 'evt-001', name: 'East Gate', type: 'both', location: { lat: 25.3555, lng: 82.9960 }, capacity: 2000, status: 'open', currentInflow: 1200, currentOutflow: 1500 },
  { id: 'g4', eventId: 'evt-001', name: 'South Gate', type: 'both', location: { lat: 25.3475, lng: 82.9910 }, capacity: 3500, status: 'open', currentInflow: 2800, currentOutflow: 2200 },
  { id: 'g5', eventId: 'evt-001', name: 'West Gate', type: 'exit', location: { lat: 25.3555, lng: 82.9830 }, capacity: 2000, status: 'open', currentInflow: 0, currentOutflow: 1600 },
  { id: 'g6', eventId: 'evt-001', name: 'VIP Gate', type: 'entry', location: { lat: 25.3600, lng: 82.9840 }, capacity: 500, status: 'restricted', currentInflow: 200, currentOutflow: 0 },
];

// Demo roads
export const DEMO_ROADS: Road[] = [
  { id: 'r1', eventId: 'evt-001', name: 'Temple Road', type: 'shared', fromNode: 'g1', toNode: 'z1', distance: 400, capacity: 500, status: 'open', currentFlow: 320, congestionLevel: 64 },
  { id: 'r2', eventId: 'evt-001', name: 'Ghat Access Road', type: 'pedestrian', fromNode: 'z1', toNode: 'z2', distance: 300, capacity: 800, status: 'open', currentFlow: 600, congestionLevel: 75 },
  { id: 'r3', eventId: 'evt-001', name: 'Food Court Link', type: 'pedestrian', fromNode: 'g1', toNode: 'z3', distance: 350, capacity: 400, status: 'open', currentFlow: 200, congestionLevel: 50 },
  { id: 'r4', eventId: 'evt-001', name: 'North Parking Road', type: 'vehicle', fromNode: 'g1', toNode: 'z4', distance: 500, capacity: 300, status: 'congested', currentFlow: 270, congestionLevel: 90 },
  { id: 'r5', eventId: 'evt-001', name: 'South Approach', type: 'vehicle', fromNode: 'g4', toNode: 'z5', distance: 450, capacity: 400, status: 'open', currentFlow: 250, congestionLevel: 62 },
  { id: 'r6', eventId: 'evt-001', name: 'Stage Access', type: 'pedestrian', fromNode: 'z3', toNode: 'z6', distance: 250, capacity: 600, status: 'open', currentFlow: 350, congestionLevel: 58 },
  { id: 'r7', eventId: 'evt-001', name: 'Emergency Corridor', type: 'vehicle', fromNode: 'z7', toNode: 'z1', distance: 200, capacity: 200, status: 'open', currentFlow: 30, congestionLevel: 15 },
  { id: 'r8', eventId: 'evt-001', name: 'Exhibition Link', type: 'shared', fromNode: 'z8', toNode: 'z6', distance: 200, capacity: 500, status: 'open', currentFlow: 280, congestionLevel: 56 },
  { id: 'r9', eventId: 'evt-001', name: 'West Exit Road', type: 'pedestrian', fromNode: 'z1', toNode: 'g5', distance: 350, capacity: 700, status: 'open', currentFlow: 400, congestionLevel: 57 },
  { id: 'r10', eventId: 'evt-001', name: 'Blocked Road Alpha', type: 'vehicle', fromNode: 'z4', toNode: 'z8', distance: 300, capacity: 300, status: 'blocked', currentFlow: 0, congestionLevel: 100 },
  { id: 'r11', eventId: 'evt-001', name: 'North Corridor', type: 'pedestrian', fromNode: 'g2', toNode: 'z9', distance: 200, capacity: 500, status: 'open', currentFlow: 300, congestionLevel: 60 },
  { id: 'r12', eventId: 'evt-001', name: 'South Plaza Link', type: 'pedestrian', fromNode: 'g4', toNode: 'z10', distance: 250, capacity: 600, status: 'open', currentFlow: 350, congestionLevel: 58 },
  { id: 'r13', eventId: 'evt-001', name: 'Central Connector', type: 'shared', fromNode: 'z9', toNode: 'z8', distance: 300, capacity: 400, status: 'open', currentFlow: 220, congestionLevel: 55 },
  { id: 'r14', eventId: 'evt-001', name: 'Ghat South Path', type: 'pedestrian', fromNode: 'z10', toNode: 'z2', distance: 400, capacity: 700, status: 'open', currentFlow: 450, congestionLevel: 64 },
];

// Demo intersections
export const DEMO_INTERSECTIONS: Intersection[] = [
  { id: 'int1', eventId: 'evt-001', name: 'North Junction', location: { lat: 25.3630, lng: 82.9890 }, connectedRoads: ['r1', 'r3', 'r4', 'r11'], greenTime: 40, cycleTime: 90, queueLength: 45, congestionLevel: 72 },
  { id: 'int2', eventId: 'evt-001', name: 'Temple Cross', location: { lat: 25.3560, lng: 82.9880 }, connectedRoads: ['r1', 'r2', 'r7', 'r9'], greenTime: 35, cycleTime: 80, queueLength: 30, congestionLevel: 55 },
  { id: 'int3', eventId: 'evt-001', name: 'South Junction', location: { lat: 25.3500, lng: 82.9920 }, connectedRoads: ['r5', 'r12', 'r14'], greenTime: 30, cycleTime: 75, queueLength: 25, congestionLevel: 48 },
  { id: 'int4', eventId: 'evt-001', name: 'Exhibition Corner', location: { lat: 25.3600, lng: 82.9880 }, connectedRoads: ['r8', 'r10', 'r13'], greenTime: 25, cycleTime: 70, queueLength: 15, congestionLevel: 35 },
];

// Graph nodes and edges for routing
export const DEMO_GRAPH_NODES: GraphNode[] = [
  { id: 'g1', lat: 25.3650, lng: 82.9880, type: 'gate' },
  { id: 'g2', lat: 25.3650, lng: 82.9910, type: 'gate' },
  { id: 'g3', lat: 25.3555, lng: 82.9960, type: 'gate' },
  { id: 'g4', lat: 25.3475, lng: 82.9910, type: 'gate' },
  { id: 'g5', lat: 25.3555, lng: 82.9830, type: 'gate' },
  { id: 'g6', lat: 25.3600, lng: 82.9840, type: 'gate' },
  { id: 'z1', lat: 25.3560, lng: 82.9900, type: 'zone_center' },
  { id: 'z2', lat: 25.3530, lng: 82.9920, type: 'zone_center' },
  { id: 'z3', lat: 25.3580, lng: 82.9870, type: 'zone_center' },
  { id: 'z4', lat: 25.3620, lng: 82.9850, type: 'parking' },
  { id: 'z5', lat: 25.3480, lng: 82.9940, type: 'parking' },
  { id: 'z6', lat: 25.3590, lng: 82.9930, type: 'zone_center' },
  { id: 'z7', lat: 25.3550, lng: 82.9850, type: 'emergency' },
  { id: 'z8', lat: 25.3600, lng: 82.9880, type: 'zone_center' },
  { id: 'z9', lat: 25.3640, lng: 82.9890, type: 'zone_center' },
  { id: 'z10', lat: 25.3490, lng: 82.9910, type: 'zone_center' },
];

export const DEMO_GRAPH_EDGES: GraphEdge[] = DEMO_ROADS.map(r => ({
  id: r.id,
  from: r.fromNode,
  to: r.toNode,
  distance: r.distance,
  travelMode: r.type === 'vehicle' ? 'vehicle' as const : r.type === 'pedestrian' ? 'pedestrian' as const : 'both' as const,
  travelTime: Math.round(r.distance / 80 * 60), // ~80m/min walking, convert to seconds
  congestionCost: r.congestionLevel * 2,
  status: r.status as 'open' | 'congested' | 'blocked',
  capacity: r.capacity
}));

// Generate initial observations
export function generateInitialObservations(): CrowdObservation[] {
  const observations: CrowdObservation[] = [];
  const now = Date.now();
  
  const baseCounts: Record<string, number> = {
    'z1': 6500, 'z2': 8000, 'z3': 2800, 'z4': 1200,
    'z5': 800, 'z6': 4200, 'z7': 150, 'z8': 5500,
    'z9': 3200, 'z10': 3800
  };

  // Generate 10 historical observations per zone
  for (const zone of DEMO_ZONES) {
    const base = baseCounts[zone.id] || 1000;
    for (let i = 9; i >= 0; i--) {
      const timestamp = new Date(now - i * 5 * 60000).toISOString();
      // Zone z1 has rapidly increasing crowd
      const growthFactor = zone.id === 'z1' ? 1 + (9 - i) * 0.05 : 1 + (Math.sin(i * 0.5) * 0.05);
      const count = Math.round(base * growthFactor * (0.9 + Math.random() * 0.2));
      
      observations.push({
        id: `obs-${zone.id}-${i}`,
        zoneId: zone.id,
        timestamp,
        estimatedCount: count,
        density: count / zone.area,
        source: 'simulation',
        confidence: 0.75 + Math.random() * 0.2
      });
    }
  }
  
  return observations;
}

// Generate initial alerts
export function generateInitialAlerts(): Alert[] {
  const now = new Date();
  return [
    {
      id: 'alert-001', eventId: 'evt-001', zoneId: 'z1', category: 'high_density',
      severity: 'critical', timestamp: new Date(now.getTime() - 300000).toISOString(),
      title: 'Critical crowd density in Main Temple Area',
      description: 'Estimated 6800+ people in Main Temple Area approaching capacity limits',
      evidence: 'Density at 85% of configured capacity. Growth rate: +150 people in last 15 minutes.',
      recommendation: 'Open additional exits. Redirect incoming visitors to North Gate B and South Gate.',
      status: 'active', dataSource: 'simulation'
    },
    {
      id: 'alert-002', eventId: 'evt-001', roadId: 'r4', category: 'congested_road',
      severity: 'critical', timestamp: new Date(now.getTime() - 600000).toISOString(),
      title: 'Severe congestion on North Parking Road',
      description: 'Traffic flow at 90% capacity on North Parking Road',
      evidence: 'Current flow: 270 vehicles. Capacity: 300. Congestion level: 90%.',
      recommendation: 'Activate diversion to South Parking. Adjust North Junction signal timing.',
      status: 'acknowledged', acknowledgedBy: 'u3', acknowledgedAt: new Date(now.getTime() - 300000).toISOString(),
      dataSource: 'simulation'
    },
    {
      id: 'alert-003', eventId: 'evt-001', roadId: 'r10', category: 'blocked_route',
      severity: 'critical', timestamp: new Date(now.getTime() - 900000).toISOString(),
      title: 'Road blocked: Blocked Road Alpha',
      description: 'Blocked Road Alpha between Parking North and Exhibition is blocked',
      evidence: 'Road status reported as blocked. Affects route planning between zones.',
      recommendation: 'Verify blockage. Activate diversion via Central Connector.',
      status: 'acknowledged', acknowledgedBy: 'u3', acknowledgedAt: new Date(now.getTime() - 600000).toISOString(),
      dataSource: 'manual'
    },
    {
      id: 'alert-004', eventId: 'evt-001', zoneId: 'z6', category: 'high_density',
      severity: 'warning', timestamp: new Date(now.getTime() - 120000).toISOString(),
      title: 'High crowd density in Stage Area',
      description: 'Estimated 4200 people in Stage & Performance Area',
      evidence: 'Density at 70% of configured capacity.',
      recommendation: 'Monitor closely. Prepare crowd management measures.',
      status: 'active', dataSource: 'simulation'
    },
    {
      id: 'alert-005', eventId: 'evt-001', zoneId: 'z2', category: 'rapid_growth',
      severity: 'warning', timestamp: new Date(now.getTime() - 180000).toISOString(),
      title: 'Rapid crowd growth at River Ghats',
      description: 'Crowd increased by 250 people in recent observations',
      evidence: 'Growth rate: 250 people over last 3 observation periods.',
      recommendation: 'Monitor inflow from East Gate. Consider additional exit signage.',
      status: 'active', dataSource: 'simulation'
    }
  ];
}

// Simulation state
export const INITIAL_SIM_STATE: SimulationState = {
  running: false,
  speed: 1,
  currentTime: new Date().toISOString(),
  startTime: new Date().toISOString(),
  crowdMultiplier: 1.0,
  outflowReduction: 0,
  blockedRoads: ['r10'],
  closedGates: [],
  activeEmergency: false
};

// Store interface
export interface AppStore {
  currentUser: User | null;
  event: Event;
  zones: Zone[];
  gates: Gate[];
  roads: Road[];
  intersections: Intersection[];
  observations: CrowdObservation[];
  alerts: Alert[];
  incidents: Incident[];
  auditLog: AuditEntry[];
  simulation: SimulationState;
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  emergencyVehicles: EmergencyVehicle[];
  signalRecommendations: SignalRecommendation[];
  scenarios: SimulationScenario[];
  notifications: { id: string; message: string; severity: string; timestamp: string; read: boolean }[];
}

// LocalStorage helpers
const STORAGE_KEY = 'crowdshield_data';

export function loadStore(): AppStore | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load store:', e);
  }
  return null;
}

export function saveStore(store: Partial<AppStore>): void {
  try {
    const existing = loadStore() || {};
    const merged = { ...existing, ...store };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.error('Failed to save store:', e);
  }
}

export function initializeStore(): AppStore {
  return {
    currentUser: null,
    event: DEMO_EVENT,
    zones: DEMO_ZONES,
    gates: DEMO_GATES,
    roads: DEMO_ROADS,
    intersections: DEMO_INTERSECTIONS,
    observations: generateInitialObservations(),
    alerts: generateInitialAlerts(),
    incidents: [],
    auditLog: [{
      id: 'audit-init',
      timestamp: new Date().toISOString(),
      userId: 'system',
      action: 'system_init',
      entityType: 'system',
      entityId: 'system',
      details: 'CrowdShield AI initialized with demo data for Kumbh Mela 2026 simulation'
    }],
    simulation: INITIAL_SIM_STATE,
    graphNodes: DEMO_GRAPH_NODES,
    graphEdges: DEMO_GRAPH_EDGES,
    emergencyVehicles: [],
    signalRecommendations: [],
    scenarios: [],
    notifications: []
  };
}

export function resetStore(): AppStore {
  localStorage.removeItem(STORAGE_KEY);
  return initializeStore();
}

// Store context
export const StoreContext = createContext<{
  store: AppStore;
  setStore: (updater: (prev: AppStore) => AppStore) => void;
}>({ store: initializeStore(), setStore: () => {} });

export function useStore() {
  return useContext(StoreContext);
}
