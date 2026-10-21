import React, { useState } from 'react';
import { useStore } from '../store';
import { calculateRiskScore } from '../engine';
import { FlaskConical, Play, RotateCcw, Save, BarChart3, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ScenarioLab() {
  const { store, setStore } = useStore();
  const [scenarioName, setScenarioName] = useState('');
  const [changes, setChanges] = useState<{ type: 'crowd_increase' | 'gate_close' | 'road_block' | 'gate_open' | 'road_reopen' | 'emergency'; target: string; value: number; description: string }[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Baseline calculation
  const baselineRisks = store.zones.map(z => ({
    zone: z,
    risk: calculateRiskScore(z, store.observations, store.gates, store.roads, store.simulation.blockedRoads)
  }));

  const addChange = (type: 'crowd_increase' | 'gate_close' | 'road_block' | 'gate_open' | 'road_reopen' | 'emergency', target: string, value: number, description: string) => {
    setChanges(prev => [...prev, { type, target, value, description }]);
  };

  const runSimulation = () => {
    // Apply changes to get projected state
    const modifiedBlockedRoads = [...store.simulation.blockedRoads];
    const modifiedClosedGates = [...store.simulation.closedGates];
    let crowdMultiplier = store.simulation.crowdMultiplier;

    changes.forEach(change => {
      switch (change.type) {
        case 'road_block':
          if (!modifiedBlockedRoads.includes(change.target)) modifiedBlockedRoads.push(change.target);
          break;
        case 'road_reopen':
          const idx = modifiedBlockedRoads.indexOf(change.target);
          if (idx >= 0) modifiedBlockedRoads.splice(idx, 1);
          break;
        case 'gate_close':
          if (!modifiedClosedGates.includes(change.target)) modifiedClosedGates.push(change.target);
          break;
        case 'gate_open':
          const gIdx = modifiedClosedGates.indexOf(change.target);
          if (gIdx >= 0) modifiedClosedGates.splice(gIdx, 1);
          break;
        case 'crowd_increase':
          crowdMultiplier *= (1 + change.value / 100);
          break;
      }
    });

    // Calculate projected risks
    const projectedRisks = store.zones.map(z => {
      const latest = store.observations.filter(o => o.zoneId === z.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      if (!latest) return { zone: z, risk: null };

      // Apply crowd multiplier to estimate new counts
      const modifiedObs = {
        ...latest,
        estimatedCount: Math.round(latest.estimatedCount * crowdMultiplier),
        density: (latest.estimatedCount * crowdMultiplier) / z.area
      };

      const risk = calculateRiskScore(z, [modifiedObs, ...store.observations.filter(o => o.zoneId === z.id).slice(0, 5)], store.gates, store.roads, modifiedBlockedRoads);
      return { zone: z, risk };
    });

    const baselineHighRisk = baselineRisks.filter(r => r.risk.score >= 60).length;
    const projectedHighRisk = projectedRisks.filter(r => r.risk && r.risk.score >= 60).length;

    const baselineCongested = store.roads.filter(r => r.congestionLevel > 70).length;
    const projectedCongested = store.roads.filter(r => {
      if (modifiedBlockedRoads.includes(r.id)) return true;
      return r.congestionLevel * crowdMultiplier > 70;
    }).length;

    const result = {
      baseline: {
        zoneRisks: baselineRisks.map(r => ({ name: r.zone.name, score: r.risk.score, severity: r.risk.severity })),
        highRiskCount: baselineHighRisk,
        congestedRoads: baselineCongested,
        totalCrowd: store.zones.reduce((sum, z) => {
          const latest = store.observations.filter(o => o.zoneId === z.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
          return sum + (latest?.estimatedCount || 0);
        }, 0)
      },
      projected: {
        zoneRisks: projectedRisks.map(r => ({ name: r.zone.name, score: r.risk?.score || 0, severity: r.risk?.severity || 'low' })),
        highRiskCount: projectedHighRisk,
        congestedRoads: projectedCongested,
        totalCrowd: Math.round(store.zones.reduce((sum, z) => {
          const latest = store.observations.filter(o => o.zoneId === z.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
          return sum + (latest?.estimatedCount || 0);
        }, 0) * crowdMultiplier),
        crowdMultiplier
      },
      changes
    };

    setResults(result);
    setShowResults(true);
  };

  const saveScenario = () => {
    if (!scenarioName || !results) return;
    setStore(prev => ({
      ...prev,
      scenarios: [...prev.scenarios, {
        id: `scenario-${Date.now()}`,
        eventId: prev.event.id,
        name: scenarioName,
        description: `Scenario with ${changes.length} changes`,
        baseline: {
          zoneDensities: {},
          roadCongestion: {},
          highRiskZones: results.baseline.highRiskCount,
          congestedRoads: results.baseline.congestedRoads,
          timestamp: new Date().toISOString()
        },
        proposed: {
          zoneDensities: {},
          roadCongestion: {},
          highRiskZones: results.projected.highRiskCount,
          congestedRoads: results.projected.congestedRoads,
          timestamp: new Date().toISOString()
        },
        changes: changes as any,
        createdAt: new Date().toISOString(),
        createdBy: prev.currentUser?.id || 'system'
      } as any],
      auditLog: [...prev.auditLog, {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: prev.currentUser?.id || 'system',
        action: 'scenario_saved',
        entityType: 'scenario',
        entityId: `scenario-${Date.now()}`,
        details: `Scenario "${scenarioName}" saved with ${changes.length} changes`
      }]
    }));
    setScenarioName('');
  };

  // Chart data
  const chartData = results ? results.baseline.zoneRisks.map((b: any, i: number) => ({
    name: b.name.length > 12 ? b.name.slice(0, 12) + '...' : b.name,
    baseline: b.score,
    projected: results.projected.zoneRisks[i]?.score || 0
  })) : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-purple-400" />
          CrowdShield Scenario Lab
        </h1>
        <p className="text-xs text-slate-400">What-if simulation: compare baseline conditions against proposed changes</p>
      </div>

      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
        <p className="text-xs text-purple-400">
          All results are simulated estimates based on configured parameters. They do not predict real human behavior.
          Use this tool to evaluate the potential impact of operational decisions before implementing them.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Scenario builder */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-3">Build Scenario</h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Scenario Name</label>
              <input
                type="text"
                value={scenarioName}
                onChange={e => setScenarioName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm"
                placeholder="e.g., Gate A closure with 30% crowd increase"
              />
            </div>

            {/* Quick add buttons */}
            <div>
              <p className="text-xs text-slate-400 mb-2">Add Changes:</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => addChange('crowd_increase', 'all', 30, '30% increase in visitor arrivals')} className="px-3 py-2 bg-orange-500/10 border border-orange-500/30 rounded text-xs text-orange-400 hover:bg-orange-500/20">
                  +30% Crowd Inflow
                </button>
                <button onClick={() => addChange('crowd_increase', 'all', 50, '50% increase in visitor arrivals')} className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 hover:bg-red-500/20">
                  +50% Crowd Inflow
                </button>
                <button onClick={() => addChange('gate_close', 'g1', 0, 'Close North Gate A')} className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400 hover:bg-amber-500/20">
                  Close Gate A
                </button>
                <button onClick={() => addChange('gate_close', 'g4', 0, 'Close South Gate')} className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400 hover:bg-amber-500/20">
                  Close South Gate
                </button>
                <button onClick={() => addChange('road_block', 'r2', 0, 'Block Ghat Access Road')} className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 hover:bg-red-500/20">
                  Block Ghat Road
                </button>
                <button onClick={() => addChange('road_reopen', 'r10', 0, 'Reopen Blocked Road Alpha')} className="px-3 py-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400 hover:bg-green-500/20">
                  Reopen Road Alpha
                </button>
                <button onClick={() => addChange('gate_open', 'g1', 0, 'Open additional capacity at Gate A')} className="px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-400 hover:bg-blue-500/20">
                  Open Gate A Extra
                </button>
                <button onClick={() => addChange('crowd_increase', 'all', -20, '20% reduction in arrivals')} className="px-3 py-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400 hover:bg-green-500/20">
                  -20% Crowd Inflow
                </button>
              </div>
            </div>

            {/* Changes list */}
            {changes.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Active Changes ({changes.length}):</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {changes.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-slate-700/50 rounded text-xs">
                      <span className="flex-1">{c.description}</span>
                      <button onClick={() => setChanges(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={runSimulation}
                disabled={changes.length === 0}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Play className="w-4 h-4" /> Run Simulation
              </button>
              <button
                onClick={() => { setChanges([]); setShowResults(false); }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Baseline summary */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-3">Current Baseline</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-slate-700/50 rounded-lg text-center">
              <p className="text-xs text-slate-400">High Risk Zones</p>
              <p className="text-2xl font-bold text-orange-400">{baselineRisks.filter(r => r.risk.score >= 60).length}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg text-center">
              <p className="text-xs text-slate-400">Congested Roads</p>
              <p className="text-2xl font-bold text-amber-400">{store.roads.filter(r => r.congestionLevel > 70).length}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg text-center">
              <p className="text-xs text-slate-400">Total Crowd</p>
              <p className="text-2xl font-bold text-cyan-400">
                {store.zones.reduce((sum, z) => {
                  const latest = store.observations.filter(o => o.zoneId === z.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                  return sum + (latest?.estimatedCount || 0);
                }, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg text-center">
              <p className="text-xs text-slate-400">Active Alerts</p>
              <p className="text-2xl font-bold text-red-400">{store.alerts.filter(a => a.status === 'active').length}</p>
            </div>
          </div>

          <div className="space-y-1">
            {baselineRisks.sort((a, b) => b.risk.score - a.risk.score).slice(0, 5).map(({ zone, risk }) => (
              <div key={zone.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-slate-700/30">
                <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] ${
                  risk.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                  risk.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                  risk.severity === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-green-500/20 text-green-400'
                }`}>{risk.score}</span>
                <span className="flex-1 truncate">{zone.name}</span>
                <span className="text-slate-400 capitalize">{risk.severity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {showResults && results && (
        <div className="space-y-4">
          {/* Comparison chart */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              Baseline vs Projected — Zone Risk Scores
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-20} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="baseline" fill="#06b6d4" name="Baseline" radius={[4, 4, 0, 0]} />
                <Bar dataKey="projected" fill="#a855f7" name="Projected" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary comparison */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <p className="text-xs text-slate-400">High Risk Zones</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-bold text-orange-400">{results.baseline.highRiskCount}</span>
                <span className="text-slate-500">→</span>
                <span className={`text-lg font-bold ${results.projected.highRiskCount > results.baseline.highRiskCount ? 'text-red-400' : 'text-green-400'}`}>
                  {results.projected.highRiskCount}
                </span>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <p className="text-xs text-slate-400">Congested Roads</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-bold text-amber-400">{results.baseline.congestedRoads}</span>
                <span className="text-slate-500">→</span>
                <span className={`text-lg font-bold ${results.projected.congestedRoads > results.baseline.congestedRoads ? 'text-red-400' : 'text-green-400'}`}>
                  {results.projected.congestedRoads}
                </span>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <p className="text-xs text-slate-400">Total Crowd</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-bold text-cyan-400">{results.baseline.totalCrowd.toLocaleString()}</span>
                <span className="text-slate-500">→</span>
                <span className="text-lg font-bold text-purple-400">{results.projected.totalCrowd.toLocaleString()}</span>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <p className="text-xs text-slate-400">Crowd Multiplier</p>
              <p className="text-lg font-bold text-purple-400">{results.projected.crowdMultiplier.toFixed(2)}x</p>
            </div>
          </div>

          {/* Save scenario */}
          {scenarioName && (
            <button
              onClick={saveScenario}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg text-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Scenario "{scenarioName}"
            </button>
          )}
        </div>
      )}

      {/* Saved scenarios */}
      {store.scenarios.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-3">Saved Scenarios</h3>
          <div className="space-y-2">
            {store.scenarios.map(s => (
              <div key={s.id} className="p-3 bg-slate-700/30 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.changes.length} changes • {new Date(s.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-orange-400">{s.baseline.highRiskZones} → {s.proposed.highRiskZones} high-risk zones</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
