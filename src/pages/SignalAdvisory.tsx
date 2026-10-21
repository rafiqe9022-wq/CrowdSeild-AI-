import React, { useState } from 'react';
import { useStore } from '../store';
import { calculateSignalRecommendation } from '../engine';
import { Settings, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function SignalAdvisory() {
  const { store, setStore } = useStore();

  const recommendations = store.intersections.map(intersection => 
    calculateSignalRecommendation(intersection, store.roads)
  );

  const acceptRecommendation = (recId: string) => {
    setStore(prev => ({
      ...prev,
      signalRecommendations: [...prev.signalRecommendations, {
        ...recommendations.find(r => r.id === recId)!,
        status: 'accepted' as const
      }],
      auditLog: [...prev.auditLog, {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: prev.currentUser?.id || 'system',
        action: 'signal_recommendation_accepted',
        entityType: 'signal_recommendation',
        entityId: recId,
        details: 'Signal timing recommendation accepted (decision-support only, no real signal control)'
      }]
    }));
  };

  const rejectRecommendation = (recId: string) => {
    setStore(prev => ({
      ...prev,
      signalRecommendations: [...prev.signalRecommendations, {
        ...recommendations.find(r => r.id === recId)!,
        status: 'rejected' as const
      }],
      auditLog: [...prev.auditLog, {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: prev.currentUser?.id || 'system',
        action: 'signal_recommendation_rejected',
        entityType: 'signal_recommendation',
        entityId: recId,
        details: 'Signal timing recommendation rejected by operator'
      }]
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-cyan-400" />
          Intersection Signal Advisory
        </h1>
        <p className="text-xs text-slate-400">Decision-support recommendations for simulated signal timing adjustments</p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
        <p className="text-xs text-amber-400">
          ⚠️ This is a decision-support prototype only. No real traffic signals are controlled by this system.
          Recommendations are based on simulated queue estimates and configurable rules.
        </p>
      </div>

      <div className="space-y-4">
        {store.intersections.map((intersection, i) => {
          const rec = recommendations[i];
          const connectedRoads = store.roads.filter(r => intersection.connectedRoads.includes(r.id));
          
          return (
            <div key={intersection.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold">{intersection.name}</h3>
                  <p className="text-xs text-slate-400">Cycle: {intersection.cycleTime}s | Current Green: {intersection.greenTime}s</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  intersection.congestionLevel > 70 ? 'bg-red-500/20 text-red-400' :
                  intersection.congestionLevel > 40 ? 'bg-amber-500/20 text-amber-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {intersection.congestionLevel}% congestion
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {connectedRoads.map(road => (
                  <div key={road.id} className="p-2 bg-slate-700/50 rounded text-center">
                    <p className="text-xs text-slate-400 truncate">{road.name}</p>
                    <p className="text-sm font-bold">{road.congestionLevel}%</p>
                    <p className="text-[10px] text-slate-500">{road.currentFlow} vehicles</p>
                  </div>
                ))}
              </div>

              {/* Recommendation */}
              <div className={`p-3 rounded-lg border ${
                rec.recommendedGreenTime > rec.currentGreenTime ? 'bg-orange-500/10 border-orange-500/30' :
                rec.recommendedGreenTime < rec.currentGreenTime ? 'bg-blue-500/10 border-blue-500/30' :
                'bg-green-500/10 border-green-500/30'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium">
                    {rec.recommendedGreenTime > rec.currentGreenTime ? '↑ Increase' : rec.recommendedGreenTime < rec.currentGreenTime ? '↓ Decrease' : '→ Maintain'} Green Time
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{rec.currentGreenTime}s</span>
                    <span className="text-xs">→</span>
                    <span className="text-sm font-bold">{rec.recommendedGreenTime}s</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-1">{rec.reason}</p>
                <p className="text-xs text-slate-500">Impact: {rec.queueImpact}</p>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => acceptRecommendation(rec.id)}
                    className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" /> Accept
                  </button>
                  <button
                    onClick={() => rejectRecommendation(rec.id)}
                    className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 flex items-center gap-1"
                  >
                    <XCircle className="w-3 h-3" /> Reject
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
