// CrowdShield AI - Type Definitions

export type UserRole = 'admin' | 'operator' | 'traffic_officer' | 'emergency_officer' | 'auditor';

// Role-based page access permissions
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'dashboard', 'ai-detection', 'map', 'crowd', 'traffic', 'risk', 'routes', 
    'emergency', 'signals', 'scenario', 'alerts', 'gates', 
    'audit', 'reports', 'help'
  ],
  operator: [
    'dashboard', 'ai-detection', 'map', 'crowd', 'risk', 'alerts', 'gates', 'help'
  ],
  traffic_officer: [
    'dashboard', 'ai-detection', 'map', 'traffic', 'routes', 'signals', 'gates', 'help'
  ],
  emergency_officer: [
    'dashboard', 'ai-detection', 'map', 'emergency', 'routes', 'alerts', 'help'
  ],
  auditor: [
    'dashboard', 'ai-detection', 'audit', 'reports', 'alerts', 'help'
  ]
};

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  demoPassword: string; // Demo credentials only - not for production
}

export interface Event {
  id: string;
  name: string;
  description: string;
  location: { lat: number; lng: number };
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
  thresholds: EventThresholds;
}

export interface EventThresholds {
  lowDensity: number;
  moderateDensity: number;
  highDensity: number;
  criticalDensity: number;
  congestionThreshold: number;
  rapidGrowthRate: number;
}

export interface Zone {
  id: string;
  eventId: string;
  name: string;
  type: 'pedestrian' | 'parking' | 'mixed' | 'emergency_access';
  area: number; // square meters
  capacity: number;
  center: { lat: number; lng: number };
  bounds: [number, number][];
  color: string;
}

export interface Gate {
  id: string;
  eventId: string;
  name: string;
  type: 'entry' | 'exit' | 'both';
  location: { lat: number; lng: number };
  capacity: number; // people per hour
  status: 'open' | 'closed' | 'restricted';
  currentInflow: number;
  currentOutflow: number;
}

export interface Road {
  id: string;
  eventId: string;
  name: string;
  type: 'vehicle' | 'pedestrian' | 'shared';
  fromNode: string;
  toNode: string;
  distance: number;
  capacity: number;
  status: 'open' | 'congested' | 'blocked';
  currentFlow: number;
  congestionLevel: number; // 0-100
}

export interface Intersection {
  id: string;
  eventId: string;
  name: string;
  location: { lat: number; lng: number };
  connectedRoads: string[];
  greenTime: number;
  cycleTime: number;
  queueLength: number;
  congestionLevel: number;
}

export interface CrowdObservation {
  id: string;
  zoneId: string;
  timestamp: string;
  estimatedCount: number;
  density: number; // people per sq meter
  source: 'simulation' | 'video' | 'camera' | 'manual';
  confidence: number;
}

export interface VehicleObservation {
  id: string;
  roadId: string;
  timestamp: string;
  count: number;
  avgSpeed: number;
  source: 'simulation' | 'camera' | 'manual';
}

export interface RiskAssessment {
  id: string;
  zoneId: string;
  timestamp: string;
  score: number; // 0-100
  severity: 'low' | 'moderate' | 'high' | 'critical';
  factors: RiskFactor[];
  trend: 'stable' | 'increasing' | 'decreasing' | 'rapidly_increasing';
  projection: number | null;
  confidence: number;
  dataFreshness: string;
}

export interface RiskFactor {
  name: string;
  value: number;
  weight: number;
  contribution: number;
  description: string;
}

export interface Alert {
  id: string;
  eventId: string;
  zoneId?: string;
  roadId?: string;
  category: AlertCategory;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'closed';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  dataSource: 'simulation' | 'video' | 'camera' | 'manual';
}

export type AlertCategory = 
  | 'high_density'
  | 'rapid_growth'
  | 'congested_road'
  | 'blocked_route'
  | 'emergency_corridor'
  | 'gate_capacity'
  | 'stale_data';

export interface Incident {
  id: string;
  eventId: string;
  alertId?: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'responding' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  actions: IncidentAction[];
}

export interface IncidentAction {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  notes: string;
}

export interface RouteRecommendation {
  id: string;
  eventId: string;
  type: 'pedestrian' | 'vehicle' | 'emergency';
  originId: string;
  destinationId: string;
  path: string[]; // node IDs
  distance: number;
  estimatedTime: number;
  congestionPenalty: number;
  blockedEdges: string[];
  reason: string;
  timestamp: string;
  source: 'simulation';
}

export interface SimulationScenario {
  id: string;
  eventId: string;
  name: string;
  description: string;
  baseline: ScenarioSnapshot;
  proposed: ScenarioSnapshot;
  changes: ScenarioChange[];
  createdAt: string;
  createdBy: string;
}

export interface ScenarioSnapshot {
  zoneDensities: Record<string, number>;
  roadCongestion: Record<string, number>;
  highRiskZones: number;
  congestedRoads: number;
  timestamp: string;
}

export interface ScenarioChange {
  type: 'crowd_increase' | 'gate_close' | 'road_block' | 'gate_open' | 'emergency';
  target: string;
  value: number;
  description: string;
}

export interface EmergencyVehicle {
  id: string;
  eventId: string;
  type: 'ambulance' | 'fire' | 'police';
  status: 'requested' | 'assigned' | 'en_route' | 'arrived' | 'completed';
  originId: string;
  destinationId: string;
  routePath: string[];
  createdAt: string;
  updatedAt: string;
  priorityRoute: boolean;
}

export interface SignalRecommendation {
  id: string;
  intersectionId: string;
  timestamp: string;
  currentGreenTime: number;
  recommendedGreenTime: number;
  reason: string;
  queueImpact: string;
  status: 'proposed' | 'accepted' | 'rejected';
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

export interface GraphNode {
  id: string;
  lat: number;
  lng: number;
  type: 'gate' | 'intersection' | 'zone_center' | 'parking' | 'emergency';
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  distance: number;
  travelMode: 'pedestrian' | 'vehicle' | 'both';
  travelTime: number;
  congestionCost: number;
  status: 'open' | 'congested' | 'blocked';
  capacity: number;
}

export interface SimulationState {
  running: boolean;
  speed: number;
  currentTime: string;
  startTime: string;
  crowdMultiplier: number;
  outflowReduction: number;
  blockedRoads: string[];
  closedGates: string[];
  activeEmergency: boolean;
}

export interface Notification {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  read: boolean;
}
