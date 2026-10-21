import React, { useState } from 'react';
import { useStore } from '../store';
import { calculateRiskScore } from '../engine';
import { AlertTriangle, TrendingUp, Info, BarChart3 } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function RiskEngine() {
  const { store } = useStore();
  const [selectedZone, setSelectedZone] = useState(store.zones[0]?.id || '');

  const zone = store.zones.find(z => z.id === selectedZone);
  const risk = zone ? calculateRiskScore(zone, store.observations, store.gates, store.roads, store.simulation.blockedRoads) : null;

  // All zone risks for comparison
  const allRisks = store.zones.map(z => ({
    zone: z,
    risk: calculateRiskScore(z, store.observations, store.gates, store.roads, store.simulation.blockedRoads)
  })).sort((a, b) => b.risk.score - a.risk.score);

  // Radar chart data
  const radarData = risk?.factors.map(f => ({
    factor: f.name,
    score: Math.round(f.contribution / f.weight),
    fullMark: 100
  })) || [];

  // Trend data
  const trendData = Array.from({ length: 10 }, (_, i) => {
    const obs = store.observations.filter(o => o.zoneId === selectedZone)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (i >= obs.length) return { time: '', score: 0 };
    const zoneObs = obs[i];
    const tempRisk = zone ? calculateRiskScore(zone, [zoneObs], store.gates, store.roads, store.simulation.blockedRoads) : null;
    return {
      time: new Date(zoneObs.timestamp).toLocaleTimeString([], { minute: '2-digit' }),
      score: tempRisk?.score || 0
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-cyan-400" />
          CrowdPulse Risk Engine
        </h1>
        <p className="text-xs text-slate-400">Explainable crowd risk scoring with short-term forecasting</p>
      </div>

      {/* Formula explanation */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" />
          Scoring Formula
        </h3>
        <p className="text-xs text-slate-400">
          Risk Score = Σ (Factor Value × Weight) for each factor. Factors: Crowd Density (30%), Growth Rate (25%), 
          Flow Imbalance (15%), Sustained High Density (10%), Blocked Access (12%), Data Reliability (8%).
          Score range: 0-100. Severity: Low (&lt;35), Moderate (35-59), High (60-79), Critical (≥80).
          This is a configurable decision-support score, not a certified safety prediction.
        </p>
      </div>

      {/* Zone selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-400">Zone:</label>
        <select
          value={selectedZone}
          onChange={e => setSelectedZone(e.target.value)}
          className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm"
        >
          {store.zones.map(z => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
      </div>

      {/* Risk overview */}
      {risk && zone && (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Score display */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="text-center">
              <div className={`inline-flex w-24 h-24 rounded-full items-center justify-center text-3xl font-bold border-4 ${
                risk.severity === 'critical' ? 'border-red-500 text-red-400 bg-red-500/10' :
                risk.severity === 'high' ? 'border-orange-500 text-orange-400 bg-orange-500/10' :
                risk.severity === 'moderate' ? 'border-amber-500 text-amber-400 bg-amber-500/10' :
                'border-green-500 text-green-400 bg-green-500/10'
              }`}>
                {risk.score}
              </div>
              <p className={`mt-2 text-sm font-medium capitalize ${
                risk.severity === 'critical' ? 'text-red-400' :
                risk.severity === 'high' ? 'text-orange-400' :
                risk.severity === 'moderate' ? 'text-amber-400' : 'text-green-400'
              }`}>{risk.severity} Risk</p>
              <p className="text-xs text-slate-400 mt-1">{zone.name}</p>
              
              <div className="mt-4 space-y-2 text-left">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Trend:</span>
                  <span className="capitalize">{risk.trend.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Confidence:</span>
                  <span>{(risk.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Data Freshness:</span>
                  <span>{risk.dataFreshness}</span>
                </div>
                {risk.projection && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">5-min Projection:</span>
                    <span>~{risk.projection} people</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Radar chart */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h3 className="text-sm font-semibold mb-2">Factor Breakdown</h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="factor" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <PolarRadiusAxis tick={{ fontSize: 8, fill: '#64748b' }} domain={[0, 100]} />
                <Radar name="Score" dataKey="score" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Trend chart */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h3 className="text-sm font-semibold mb-2">Risk Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Factor details */}
      {risk && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold mb-3">Detailed Factor Analysis</h3>
          <div className="space-y-3">
            {risk.factors.map((f, i) => (
              <div key={i} className="p-3 bg-slate-700/30 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{f.name}</span>
                  <span className="text-xs text-slate-400">Weight: {(f.weight * 100).toFixed(0)}% | Contribution: +{f.contribution.toFixed(1)}</span>
                </div>
                <p className="text-xs text-slate-400">{f.description}</p>
                <div className="w-full h-2 bg-slate-700 rounded mt-2">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded" style={{ width: `${Math.min(100, f.contribution / f.weight)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All zones comparison */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          All Zones Risk Comparison
        </h3>
        <div className="space-y-2">
          {allRisks.map(({ zone: z, risk: r }) => (
            <div key={z.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/30">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border ${
                r.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                r.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                r.severity === 'moderate' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                'bg-green-500/10 text-green-400 border-green-500/30'
              }`}>{r.score}</div>
              <div className="flex-1">
                <p className="text-sm">{z.name}</p>
                <p className="text-xs text-slate-400 capitalize">{r.severity} • {r.trend.replace('_', ' ')}</p>
              </div>
              <div className="w-32 h-2 bg-slate-700 rounded">
                <div className={`h-full rounded ${
                  r.severity === 'critical' ? 'bg-red-500' :
                  r.severity === 'high' ? 'bg-orange-500' :
                  r.severity === 'moderate' ? 'bg-amber-500' : 'bg-green-500'
                }`} style={{ width: `${r.score}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
