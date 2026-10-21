import React, { useState } from 'react';
import { useStore } from '../store';
import { Users, Settings, ToggleLeft, ToggleRight } from 'lucide-react';

export default function GateManagement() {
  const { store, setStore } = useStore();

  const toggleGateStatus = (gateId: string) => {
    setStore(prev => ({
      ...prev,
      gates: prev.gates.map(g => g.id === gateId ? {
        ...g,
        status: g.status === 'open' ? 'closed' : 'open'
      } : g),
      auditLog: [...prev.auditLog, {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: prev.currentUser?.id || 'system',
        action: 'gate_status_change',
        entityType: 'gate',
        entityId: gateId,
        details: `Gate status toggled`
      }]
    }));
  };

  const updateCrowdMultiplier = (multiplier: number) => {
    setStore(prev => ({
      ...prev,
      simulation: { ...prev.simulation, crowdMultiplier: prev.simulation.crowdMultiplier + multiplier }
    }));
  };

  const toggleRoadBlock = (roadId: string) => {
    setStore(prev => {
      const blocked = prev.simulation.blockedRoads.includes(roadId);
      return {
        ...prev,
        simulation: {
          ...prev.simulation,
          blockedRoads: blocked
            ? prev.simulation.blockedRoads.filter(r => r !== roadId)
            : [...prev.simulation.blockedRoads, roadId]
        },
        roads: prev.roads.map(r => r.id === roadId ? {
          ...r,
          status: blocked ? 'open' as const : 'blocked' as const,
          currentFlow: blocked ? r.capacity * 0.5 : 0,
          congestionLevel: blocked ? 100 : 50
        } : r),
        auditLog: [...prev.auditLog, {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: prev.currentUser?.id || 'system',
          action: blocked ? 'road_reopened' : 'road_blocked',
          entityType: 'road',
          entityId: roadId,
          details: `Road ${blocked ? 'reopened' : 'blocked'}: ${prev.roads.find(r => r.id === roadId)?.name}`
        }]
      };
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-cyan-400" />
          Gate & Zone Management
        </h1>
        <p className="text-xs text-slate-400">Manage gate status, road access, and simulation controls</p>
      </div>

      {/* Demo control panel */}
      <div className="bg-slate-800 rounded-xl border border-cyan-500/30 p-4">
        <h3 className="text-sm font-semibold mb-3 text-cyan-400">🎮 Demo Control Panel</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={() => updateCrowdMultiplier(0.2)} className="px-3 py-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-xs hover:bg-orange-500/30">
            ↑ Increase Inflow (+20%)
          </button>
          <button onClick={() => updateCrowdMultiplier(-0.2)} className="px-3 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs hover:bg-green-500/30">
            ↓ Decrease Inflow (-20%)
          </button>
          <button onClick={() => setStore(prev => ({ ...prev, simulation: { ...prev.simulation, outflowReduction: Math.min(0.8, prev.simulation.outflowReduction + 0.2) } }))} className="px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs hover:bg-red-500/30">
            ↓ Reduce Outflow
          </button>
          <button onClick={() => setStore(prev => ({ ...prev, simulation: { ...prev.simulation, outflowReduction: Math.max(0, prev.simulation.outflowReduction - 0.2) } }))} className="px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs hover:bg-blue-500/30">
            ↑ Restore Outflow
          </button>
          <button onClick={() => setStore(prev => ({ ...prev, simulation: { ...prev.simulation, crowdMultiplier: 1.0, outflowReduction: 0, blockedRoads: ['r10'], closedGates: [] }, roads: prev.roads.map(r => r.id === 'r10' ? { ...r, status: 'blocked' as const, currentFlow: 0, congestionLevel: 100 } : { ...r, status: r.congestionLevel > 70 ? 'congested' as const : 'open' as const }) }))} className="px-3 py-2 bg-slate-600 text-slate-300 rounded-lg text-xs hover:bg-slate-500 col-span-2">
            🔄 Reset Demo State
          </button>
          <div className="col-span-2 p-2 bg-slate-700/50 rounded text-xs text-center">
            <span className="text-slate-400">Current Multiplier:</span>{' '}
            <span className="font-bold text-cyan-400">{store.simulation.crowdMultiplier.toFixed(1)}x</span>
            {' | '}
            <span className="text-slate-400">Outflow Reduction:</span>{' '}
            <span className="font-bold text-amber-400">{(store.simulation.outflowReduction * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Gates */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold mb-3">Gate Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {store.gates.map(gate => (
            <div key={gate.id} className={`p-3 rounded-lg border ${gate.status === 'open' ? 'bg-green-500/5 border-green-500/30' : gate.status === 'restricted' ? 'bg-amber-500/5 border-amber-500/30' : 'bg-red-500/5 border-red-500/30'}`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">{gate.name}</h4>
                <button onClick={() => toggleGateStatus(gate.id)} className="text-xs">
                  {gate.status === 'open' ? (
                    <ToggleRight className="w-6 h-6 text-green-400" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-red-400" />
                  )}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-400">Type:</span> <span className="capitalize">{gate.type}</span></div>
                <div><span className="text-slate-400">Status:</span> <span className="capitalize">{gate.status}</span></div>
                <div><span className="text-slate-400">Inflow:</span> {gate.currentInflow}/hr</div>
                <div><span className="text-slate-400">Outflow:</span> {gate.currentOutflow}/hr</div>
                <div className="col-span-2"><span className="text-slate-400">Capacity:</span> {gate.capacity}/hr</div>
              </div>
              <div className="mt-2 w-full h-1.5 bg-slate-700 rounded">
                <div className="h-full bg-cyan-500 rounded" style={{ width: `${Math.min(100, (gate.currentInflow / gate.capacity) * 100)}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Roads */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold mb-3">Road Access Control</h3>
        <div className="space-y-2">
          {store.roads.map(road => (
            <div key={road.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
              <span className={`w-2 h-2 rounded-full ${road.status === 'blocked' ? 'bg-red-500' : road.status === 'congested' ? 'bg-orange-500' : 'bg-green-500'}`}></span>
              <span className="flex-1 text-sm">{road.name}</span>
              <span className="text-xs text-slate-400 capitalize">{road.type}</span>
              <span className={`text-xs px-2 py-0.5 rounded capitalize ${road.status === 'blocked' ? 'bg-red-500/20 text-red-400' : road.status === 'congested' ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>
                {road.status}
              </span>
              <button
                onClick={() => toggleRoadBlock(road.id)}
                className={`px-2 py-1 rounded text-xs ${road.status === 'blocked' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
              >
                {road.status === 'blocked' ? 'Reopen' : 'Block'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
