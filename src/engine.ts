// CrowdShield AI - Core Engine
// Risk scoring, graph routing, and simulation logic

import { Zone, Gate, Road, CrowdObservation, RiskAssessment, RiskFactor, GraphNode, GraphEdge, Intersection, SignalRecommendation } from './types';

// ============ CROWDPULSE RISK ENGINE ============

export function calculateRiskScore(
  zone: Zone,
  observations: CrowdObservation[],
  gates: Gate[],
  roads: Road[],
  blockedRoads: string[]
): RiskAssessment {
  const recentObs = observations
    .filter(o => o.zoneId === zone.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  if (recentObs.length === 0) {
    return {
      id: `risk-${zone.id}-${Date.now()}`,
      zoneId: zone.id,
      timestamp: new Date().toISOString(),
      score: 0,
      severity: 'low',
      factors: [],
      trend: 'stable',
      projection: null,
      confidence: 0,
      dataFreshness: 'No data available'
    };
  }

  const latest = recentObs[0];
  const factors: RiskFactor[] = [];

  // Factor 1: Current density relative to capacity (weight: 30%)
  const densityRatio = latest.density / (zone.capacity / zone.area);
  const densityScore = Math.min(100, densityRatio * 100);
  factors.push({
    name: 'Crowd Density',
    value: densityRatio,
    weight: 0.30,
    contribution: densityScore * 0.30,
    description: `Current density is ${(densityRatio * 100).toFixed(0)}% of configured capacity (${latest.estimatedCount} people in ${zone.area}m²)`
  });

  // Factor 2: Rate of change (weight: 25%)
  let growthRate = 0;
  if (recentObs.length >= 3) {
    const older = recentObs[2];
    const timeDiff = (new Date(latest.timestamp).getTime() - new Date(older.timestamp).getTime()) / 60000;
    if (timeDiff > 0) {
      growthRate = (latest.estimatedCount - older.estimatedCount) / timeDiff;
    }
  }
  const growthScore = Math.min(100, Math.max(0, (growthRate / 50) * 100));
  factors.push({
    name: 'Growth Rate',
    value: growthRate,
    weight: 0.25,
    contribution: growthScore * 0.25,
    description: `Crowd changing at ${growthRate.toFixed(1)} people/minute over recent observations`
  });

  // Factor 3: Inflow vs Outflow balance (weight: 15%)
  const zoneGates = gates.filter(g => g.status === 'open');
  const totalInflow = zoneGates.reduce((sum, g) => sum + g.currentInflow, 0);
  const totalOutflow = zoneGates.reduce((sum, g) => sum + g.currentOutflow, 0);
  const imbalance = totalInflow > 0 ? (totalInflow - totalOutflow) / totalInflow : 0;
  const imbalanceScore = Math.min(100, Math.max(0, imbalance * 150));
  factors.push({
    name: 'Flow Imbalance',
    value: imbalance,
    weight: 0.15,
    contribution: imbalanceScore * 0.15,
    description: `Inflow: ${totalInflow}/hr, Outflow: ${totalOutflow}/hr. ${imbalance > 0.3 ? 'Significant net accumulation detected.' : 'Flow is reasonably balanced.'}`
  });

  // Factor 4: Duration of high density (weight: 10%)
  const highDensityCount = recentObs.filter(o => o.density > (zone.capacity / zone.area) * 0.7).length;
  const durationScore = (highDensityCount / recentObs.length) * 100;
  factors.push({
    name: 'Sustained High Density',
    value: highDensityCount / recentObs.length,
    weight: 0.10,
    contribution: durationScore * 0.10,
    description: `${highDensityCount} of last ${recentObs.length} observations showed high density`
  });

  // Factor 5: Blocked exits/roads proximity (weight: 12%)
  const nearbyBlocked = blockedRoads.filter(rId => {
    const road = roads.find(r => r.id === rId);
    return road && (road.fromNode === zone.id || road.toNode === zone.id);
  });
  const blockedScore = Math.min(100, nearbyBlocked.length * 40);
  factors.push({
    name: 'Blocked Access',
    value: nearbyBlocked.length,
    weight: 0.12,
    contribution: blockedScore * 0.12,
    description: nearbyBlocked.length > 0
      ? `${nearbyBlocked.length} road(s) near this zone are blocked, reducing evacuation options`
      : 'All access routes are currently open'
  });

  // Factor 6: Data reliability (weight: 8%)
  const avgConfidence = recentObs.reduce((sum, o) => sum + o.confidence, 0) / recentObs.length;
  const reliabilityScore = (1 - avgConfidence) * 100; // Lower confidence = higher risk
  factors.push({
    name: 'Data Reliability',
    value: avgConfidence,
    weight: 0.08,
    contribution: reliabilityScore * 0.08,
    description: `Average confidence of recent observations: ${(avgConfidence * 100).toFixed(0)}%. ${avgConfidence < 0.6 ? 'Low confidence increases uncertainty.' : 'Data quality is acceptable.'}`
  });

  // Calculate total score
  const totalScore = Math.round(factors.reduce((sum, f) => sum + f.contribution, 0));

  // Determine severity
  let severity: RiskAssessment['severity'];
  if (totalScore >= 80) severity = 'critical';
  else if (totalScore >= 60) severity = 'high';
  else if (totalScore >= 35) severity = 'moderate';
  else severity = 'low';

  // Determine trend
  let trend: RiskAssessment['trend'] = 'stable';
  if (recentObs.length >= 3) {
    const recent = recentObs.slice(0, 3).map(o => o.estimatedCount);
    const older = recentObs.slice(3, 6).map(o => o.estimatedCount);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
    
    if (olderAvg > 0) {
      const changeRate = (recentAvg - olderAvg) / olderAvg;
      if (changeRate > 0.3) trend = 'rapidly_increasing';
      else if (changeRate > 0.1) trend = 'increasing';
      else if (changeRate < -0.1) trend = 'decreasing';
    }
  }

  // Simple projection (linear extrapolation)
  let projection: number | null = null;
  if (recentObs.length >= 5 && trend !== 'stable') {
    const counts = recentObs.slice(0, 5).map(o => o.estimatedCount).reverse();
    const n = counts.length;
    const sumX = counts.reduce((s, _, i) => s + i, 0);
    const sumY = counts.reduce((s, c) => s + c, 0);
    const sumXY = counts.reduce((s, c, i) => s + i * c, 0);
    const sumX2 = counts.reduce((s, _, i) => s + i * i, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    projection = Math.round(counts[counts.length - 1] + slope * 5);
  }

  const dataAge = (Date.now() - new Date(latest.timestamp).getTime()) / 1000;
  const freshness = dataAge < 30 ? 'Real-time (< 30s)' : dataAge < 120 ? 'Recent (< 2min)' : dataAge < 300 ? 'Within 5 minutes' : 'Stale (> 5min)';

  return {
    id: `risk-${zone.id}-${Date.now()}`,
    zoneId: zone.id,
    timestamp: new Date().toISOString(),
    score: Math.min(100, Math.max(0, totalScore)),
    severity,
    factors,
    trend,
    projection,
    confidence: avgConfidence,
    dataFreshness: freshness
  };
}

// ============ GRAPH-BASED ROUTING (Dijkstra's Algorithm) ============

export function findShortestPath(
  nodes: GraphNode[],
  edges: GraphEdge[],
  originId: string,
  destinationId: string,
  travelMode: 'pedestrian' | 'vehicle' | 'both',
  avoidBlocked: boolean = true
): { path: string[]; distance: number; time: number; blockedEdges: string[] } | null {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const adjacency = new Map<string, { edge: GraphEdge; neighbor: string }[]>();

  // Build adjacency list
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    if (avoidBlocked && edge.status === 'blocked') continue;
    
    const canTraverse = travelMode === 'both' || edge.travelMode === 'both' || edge.travelMode === travelMode;
    if (!canTraverse) continue;

    adjacency.get(edge.from)?.push({ edge, neighbor: edge.to });
    // Bidirectional for pedestrian, check direction for vehicle
    if (edge.travelMode === 'pedestrian' || edge.travelMode === 'both') {
      adjacency.get(edge.to)?.push({ edge: { ...edge, from: edge.to, to: edge.from }, neighbor: edge.from });
    }
  }

  // Dijkstra's algorithm
  const dist = new Map<string, number>();
  const prev = new Map<string, { node: string; edge: GraphEdge } | null>();
  const visited = new Set<string>();
  const blockedEdges: string[] = [];

  for (const node of nodes) {
    dist.set(node.id, Infinity);
    prev.set(node.id, null);
  }
  dist.set(originId, 0);

  const unvisited = new Set(nodes.map(n => n.id));

  while (unvisited.size > 0) {
    // Find minimum distance unvisited node
    let current: string | null = null;
    let minDist = Infinity;
    for (const nodeId of unvisited) {
      const d = dist.get(nodeId)!;
      if (d < minDist) {
        minDist = d;
        current = nodeId;
      }
    }

    if (current === null || current === destinationId) break;
    unvisited.delete(current);
    visited.add(current);

    const neighbors = adjacency.get(current) || [];
    for (const { edge, neighbor } of neighbors) {
      if (visited.has(neighbor)) continue;
      
      const cost = edge.distance + edge.congestionCost;
      const newDist = dist.get(current)! + cost;
      
      if (newDist < dist.get(neighbor)!) {
        dist.set(neighbor, newDist);
        prev.set(neighbor, { node: current, edge });
      }
    }
  }

  // Reconstruct path
  if (dist.get(destinationId) === Infinity) {
    // Check if blocked edges are the reason
    for (const edge of edges) {
      if (edge.status === 'blocked') {
        blockedEdges.push(edge.id);
      }
    }
    return null;
  }

  const path: string[] = [];
  let current: string | null = destinationId;
  while (current !== null) {
    path.unshift(current);
    const p = prev.get(current);
    current = p ? p.node : null;
  }

  const totalDistance = path.reduce((sum, nodeId, i) => {
    if (i === 0) return 0;
    const edge = edges.find(e => 
      (e.from === path[i-1] && e.to === nodeId) || (e.to === path[i-1] && e.from === nodeId)
    );
    return sum + (edge?.distance || 0);
  }, 0);

  const totalTime = path.reduce((sum, nodeId, i) => {
    if (i === 0) return 0;
    const edge = edges.find(e => 
      (e.from === path[i-1] && e.to === nodeId) || (e.to === path[i-1] && e.from === nodeId)
    );
    return sum + (edge?.travelTime || 0) + (edge?.congestionCost || 0) * 0.1;
  }, 0);

  return { path, distance: totalDistance, time: totalTime, blockedEdges };
}

// ============ SIGNAL RECOMMENDATION ENGINE ============

export function calculateSignalRecommendation(
  intersection: Intersection,
  roads: Road[]
): SignalRecommendation {
  const connectedRoads = roads.filter(r => intersection.connectedRoads.includes(r.id));
  const totalQueue = connectedRoads.reduce((sum, r) => sum + r.currentFlow, 0);
  const maxCongestion = Math.max(...connectedRoads.map(r => r.congestionLevel));
  
  let recommendedGreenTime = intersection.greenTime;
  let reason = '';
  let queueImpact = '';

  if (maxCongestion > 70) {
    // Increase green time for most congested approach
    const mostCongested = connectedRoads.reduce((max, r) => r.congestionLevel > max.congestionLevel ? r : max);
    recommendedGreenTime = Math.min(intersection.cycleTime * 0.6, intersection.greenTime + 15);
    reason = `High congestion (${maxCongestion}%) detected on ${mostCongested.name}. Increasing green time to reduce queue.`;
    queueImpact = `Expected queue reduction of ${Math.round(maxCongestion * 0.3)}% on ${mostCongested.name}`;
  } else if (maxCongestion < 20 && intersection.greenTime > 20) {
    // Reduce green time if all approaches are clear
    recommendedGreenTime = Math.max(15, intersection.greenTime - 10);
    reason = `Low congestion across all approaches. Reducing green time to improve overall intersection efficiency.`;
    queueImpact = 'Minimal impact expected - all approaches have low queue lengths';
  } else {
    recommendedGreenTime = intersection.greenTime;
    reason = 'Current signal timing is appropriate for observed traffic conditions.';
    queueImpact = 'No significant change expected';
  }

  // Ensure minimum pedestrian crossing time (10 seconds)
  const minPedestrianTime = 10;
  const maxGreenTime = intersection.cycleTime - minPedestrianTime - 5; // 5s for clearance
  recommendedGreenTime = Math.max(minPedestrianTime, Math.min(maxGreenTime, recommendedGreenTime));

  return {
    id: `sig-${intersection.id}-${Date.now()}`,
    intersectionId: intersection.id,
    timestamp: new Date().toISOString(),
    currentGreenTime: intersection.greenTime,
    recommendedGreenTime,
    reason,
    queueImpact,
    status: 'proposed'
  };
}

// ============ SIMULATION ENGINE ============

export function simulateCrowdMovement(
  zones: Zone[],
  gates: Gate[],
  roads: Road[],
  observations: CrowdObservation[],
  crowdMultiplier: number,
  outflowReduction: number,
  blockedRoads: string[],
  closedGates: string[]
): CrowdObservation[] {
  const newObservations: CrowdObservation[] = [];
  const now = new Date().toISOString();

  for (const zone of zones) {
    const lastObs = observations
      .filter(o => o.zoneId === zone.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    const currentCount = lastObs?.estimatedCount || Math.round(zone.capacity * 0.3);
    
    // Calculate inflow from open gates
    const openGates = gates.filter(g => g.status === 'open' && !closedGates.includes(g.id));
    const baseInflow = openGates.reduce((sum, g) => sum + g.currentInflow, 0) / openGates.length;
    const inflow = baseInflow * crowdMultiplier * (0.8 + Math.random() * 0.4);

    // Calculate outflow (reduced if roads are blocked)
    const blockedCount = blockedRoads.filter(rId => {
      const road = roads.find(r => r.id === rId);
      return road && (road.fromNode === zone.id || road.toNode === zone.id);
    }).length;
    const outflowFactor = Math.max(0.2, 1 - blockedCount * 0.3) * (1 - outflowReduction);
    const baseOutflow = openGates.reduce((sum, g) => sum + g.currentOutflow, 0) / Math.max(1, openGates.length);
    const outflow = baseOutflow * outflowFactor * (0.8 + Math.random() * 0.4);

    // Net change per simulation step (5-minute intervals)
    const netChange = Math.round((inflow - outflow) / 12); // Per 5 min
    const newCount = Math.max(0, Math.min(zone.capacity * 1.5, currentCount + netChange));
    const density = newCount / zone.area;

    newObservations.push({
      id: `obs-${zone.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      zoneId: zone.id,
      timestamp: now,
      estimatedCount: newCount,
      density,
      source: 'simulation',
      confidence: 0.75 + Math.random() * 0.2
    });
  }

  return newObservations;
}

export function simulateTrafficFlow(
  roads: Road[],
  blockedRoads: string[],
  crowdMultiplier: number
): { roadId: string; flow: number; congestion: number }[] {
  return roads.map(road => {
    if (blockedRoads.includes(road.id)) {
      return { roadId: road.id, flow: 0, congestion: 100 };
    }
    
    const baseFlow = road.currentFlow * crowdMultiplier;
    const noise = (Math.random() - 0.5) * road.capacity * 0.1;
    const flow = Math.max(0, Math.min(road.capacity, baseFlow + noise));
    const congestion = Math.min(100, (flow / road.capacity) * 100);
    
    return { roadId: road.id, flow: Math.round(flow), congestion: Math.round(congestion) };
  });
}

// ============ ALERT GENERATION ============

export function generateAlerts(
  zones: Zone[],
  observations: CrowdObservation[],
  roads: Road[],
  gates: Gate[],
  thresholds: { highDensity: number; criticalDensity: number; rapidGrowthRate: number; congestionThreshold: number }
): { category: string; severity: string; title: string; description: string; evidence: string; recommendation: string; zoneId?: string; roadId?: string }[] {
  const alerts: any[] = [];

  // Check zone densities
  for (const zone of zones) {
    const latestObs = observations
      .filter(o => o.zoneId === zone.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (!latestObs) continue;

    const densityRatio = latestObs.density / (zone.capacity / zone.area);

    if (densityRatio >= thresholds.criticalDensity / 100) {
      alerts.push({
        category: 'high_density',
        severity: 'critical',
        title: `Critical crowd density in ${zone.name}`,
        description: `Estimated ${latestObs.estimatedCount} people in ${zone.name} (${(latestObs.density * 100).toFixed(1)} people/m²)`,
        evidence: `Density is ${Math.round(densityRatio * 100)}% of configured capacity. Last observation at ${new Date(latestObs.timestamp).toLocaleTimeString()}.`,
        recommendation: 'Immediately review crowd control measures. Consider opening additional exits, redirecting incoming visitors to alternative gates, and deploying additional staff to manage flow.',
        zoneId: zone.id
      });
    } else if (densityRatio >= thresholds.highDensity / 100) {
      alerts.push({
        category: 'high_density',
        severity: 'warning',
        title: `High crowd density in ${zone.name}`,
        description: `Estimated ${latestObs.estimatedCount} people in ${zone.name}`,
        evidence: `Density is ${Math.round(densityRatio * 100)}% of configured capacity.`,
        recommendation: 'Monitor closely. Prepare to activate crowd management measures if density continues to increase.',
        zoneId: zone.id
      });
    }

    // Check rapid growth
    const recentObs = observations
      .filter(o => o.zoneId === zone.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);

    if (recentObs.length >= 3) {
      const growthRate = (recentObs[0].estimatedCount - recentObs[2].estimatedCount);
      if (growthRate > thresholds.rapidGrowthRate) {
        alerts.push({
          category: 'rapid_growth',
          severity: 'warning',
          title: `Rapid crowd growth detected in ${zone.name}`,
          description: `Crowd increased by ${growthRate} people in recent observations`,
          evidence: `Growth rate: ${growthRate} people over last 3 observation periods.`,
          recommendation: 'Investigate cause of rapid influx. Consider redirecting arrivals to less congested gates.',
          zoneId: zone.id
        });
      }
    }
  }

  // Check road congestion
  for (const road of roads) {
    if (road.status === 'blocked') {
      alerts.push({
        category: 'blocked_route',
        severity: 'critical',
        title: `Road blocked: ${road.name}`,
        description: `${road.name} is currently blocked`,
        evidence: 'Road status reported as blocked. This affects route planning and emergency access.',
        recommendation: 'Verify blockage status. If confirmed, activate diversion routes and notify emergency services of reduced access.',
        roadId: road.id
      });
    } else if (road.congestionLevel > thresholds.congestionThreshold) {
      alerts.push({
        category: 'congested_road',
        severity: road.congestionLevel > 80 ? 'critical' : 'warning',
        title: `Congestion on ${road.name}`,
        description: `Traffic flow at ${road.congestionLevel}% capacity on ${road.name}`,
        evidence: `Current flow: ${road.currentFlow} vehicles. Capacity: ${road.capacity}. Congestion level: ${road.congestionLevel}%.`,
        recommendation: 'Consider traffic signal adjustments and diversion recommendations for this corridor.',
        roadId: road.id
      });
    }
  }

  // Check gate capacity
  for (const gate of gates) {
    if (gate.status === 'open') {
      const utilization = (gate.currentInflow / gate.capacity) * 100;
      if (utilization > 85) {
        alerts.push({
          category: 'gate_capacity',
          severity: utilization > 95 ? 'critical' : 'warning',
          title: `Gate ${gate.name} nearing capacity`,
          description: `${gate.name} operating at ${Math.round(utilization)}% of configured capacity`,
          evidence: `Inflow: ${gate.currentInflow}/hr vs capacity: ${gate.capacity}/hr`,
          recommendation: 'Consider redirecting incoming visitors to alternative gates with available capacity.',
          zoneId: gate.id
        });
      }
    }
  }

  return alerts;
}
