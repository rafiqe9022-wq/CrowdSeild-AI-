import React, { useState } from 'react';
import { useStore } from '../store';
import { findShortestPath } from '../engine';
import { Siren, Plus, MapPin, CheckCircle, Clock } from 'lucide-react';

export default function EmergencyCorridor() {
  const { store, setStore } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [vehicleType, setVehicleType] = useState<'ambulance' | 'fire' | 'police'>('ambulance');
  const [evOrigin, setEvOrigin] = useState('z7');
  const [evDest, setEvDest] = useState('z1');
  const [routeResult, setRouteResult] = useState<any>(null);

  const handleDispatch = () => {
    const route = findShortestPath(store.graphNodes, store.graphEdges, evOrigin, evDest, 'vehicle', true);
    setRouteResult(route);

    if (route) {
      const newVehicle = {
        id: `ev-${Date.now()}`,
        eventId: store.event.id,
        type: vehicleType,
        status: 'assigned' as const,
        originId: evOrigin,
        destinationId: evDest,
        routePath: route.path,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        priorityRoute: true
      };

      setStore(prev => ({
        ...prev,
        emergencyVehicles: [...prev.emergencyVehicles, newVehicle],
        auditLog: [...prev.auditLog, {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: prev.currentUser?.id || 'system',
          action: 'emergency_dispatch',
          entityType: 'emergency_vehicle',
          entityId: newVehicle.id,
          details: `Simulated ${vehicleType} dispatched from ${evOrigin} to ${evDest}. Route: ${route.path.join(' → ')}`
        }]
      }));
    }
    setShowForm(false);
  };

  const updateVehicleStatus = (vehicleId: string, status: string) => {
    setStore(prev => ({
      ...prev,
      emergencyVehicles: prev.emergencyVehicles.map(v =>
        v.id === vehicleId ? { ...v, status: status as any, updatedAt: new Date().toISOString() } : v
      ),
      auditLog: [...prev.auditLog, {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: prev.currentUser?.id || 'system',
        action: 'status_update',
        entityType: 'emergency_vehicle',
        entityId: vehicleId,
        details: `Status changed to ${status}`
      }]
    }));
  };

  const getNodeName = (id: string) => {
    const zone = store.zones.find(z => z.id === id);
    const gate = store.gates.find(g => g.id === id);
    return zone?.name || gate?.name || id;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Siren className="w-6 h-6 text-red-400" />
            Emergency Corridor
          </h1>
          <p className="text-xs text-slate-400">Simulated emergency vehicle routing and priority corridor management</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Register Vehicle
        </button>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
        <p className="text-xs text-amber-400">
          ⚠️ This is a simulation only. No actual emergency vehicles have been dispatched or contacted. 
          This module demonstrates route prioritization logic for decision support.
        </p>
      </div>

      {/* Dispatch form */}
      {showForm && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-3">Register Simulated Emergency Vehicle</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Vehicle Type</label>
              <select value={vehicleType} onChange={e => setVehicleType(e.target.value as any)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm">
                <option value="ambulance">🚑 Ambulance</option>
                <option value="fire">🚒 Fire Engine</option>
                <option value="police">🚓 Police Vehicle</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Origin</label>
              <select value={evOrigin} onChange={e => setEvOrigin(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm">
                {store.graphNodes.filter(n => n.type === 'emergency' || n.type === 'gate' || n.type === 'zone_center').map(n => (
                  <option key={n.id} value={n.id}>{getNodeName(n.id)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Destination</label>
              <select value={evDest} onChange={e => setEvDest(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm">
                {store.graphNodes.filter(n => n.type === 'zone_center' || n.type === 'emergency').map(n => (
                  <option key={n.id} value={n.id}>{getNodeName(n.id)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDispatch} className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium">
              Calculate Priority Route & Dispatch
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
              Cancel
            </button>
          </div>
          {routeResult && (
            <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-xs text-green-400">
                ✓ Route found: {routeResult.path.map((n: string) => getNodeName(n)).join(' → ')}
                <br/>Distance: {routeResult.distance}m | Est. Time: {Math.round(routeResult.time)}s
              </p>
            </div>
          )}
        </div>
      )}

      {/* Active vehicles */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold mb-3">Active Emergency Vehicles (Simulated)</h3>
        {store.emergencyVehicles.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No active emergency vehicles</p>
        ) : (
          <div className="space-y-3">
            {store.emergencyVehicles.map(vehicle => (
              <div key={vehicle.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {vehicle.type === 'ambulance' ? '🚑' : vehicle.type === 'fire' ? '🚒' : '🚓'}
                    </span>
                    <div>
                      <p className="text-sm font-medium capitalize">{vehicle.type} — {vehicle.id.slice(0, 8)}</p>
                      <p className="text-xs text-slate-400">
                        {getNodeName(vehicle.originId)} → {getNodeName(vehicle.destinationId)}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    vehicle.status === 'en_route' ? 'bg-blue-500/20 text-blue-400' :
                    vehicle.status === 'arrived' ? 'bg-green-500/20 text-green-400' :
                    vehicle.status === 'assigned' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-slate-600 text-slate-300'
                  }`}>
                    {vehicle.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-400">Route:</span>
                  <div className="flex flex-wrap gap-1">
                    {vehicle.routePath.map((nodeId, i) => (
                      <React.Fragment key={nodeId}>
                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px]">{getNodeName(nodeId)}</span>
                        {i < vehicle.routePath.length - 1 && <span className="text-slate-600">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {vehicle.status === 'assigned' && (
                    <button onClick={() => updateVehicleStatus(vehicle.id, 'en_route')} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30">
                      Mark En Route
                    </button>
                  )}
                  {vehicle.status === 'en_route' && (
                    <button onClick={() => updateVehicleStatus(vehicle.id, 'arrived')} className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30">
                      Mark Arrived
                    </button>
                  )}
                  {vehicle.status === 'arrived' && (
                    <button onClick={() => updateVehicleStatus(vehicle.id, 'completed')} className="px-3 py-1 bg-slate-600 text-slate-300 rounded text-xs hover:bg-slate-500">
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Emergency corridor status */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold mb-3">Emergency Access Corridors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-xs text-green-400 font-medium">Emergency Corridor (r7)</p>
            <p className="text-sm font-bold text-green-400 mt-1">OPEN</p>
            <p className="text-xs text-slate-400">Medical Hub → Temple Area | 15% utilization</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-xs text-red-400 font-medium">Blocked Road Alpha (r10)</p>
            <p className="text-sm font-bold text-red-400 mt-1">BLOCKED</p>
            <p className="text-xs text-slate-400">Parking North → Exhibition | Affects alternative routes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
