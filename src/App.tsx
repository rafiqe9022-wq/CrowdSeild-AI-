import React, { useState, useEffect, useCallback } from 'react';
import { StoreContext, loadStore, initializeStore, saveStore, AppStore } from './store';
import { simulateCrowdMovement, simulateTrafficFlow, generateAlerts } from './engine';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import CrowdMonitor from './pages/CrowdMonitor';
import TrafficFlow from './pages/TrafficFlow';
import RiskEngine from './pages/RiskEngine';
import RoutePlanner from './pages/RoutePlanner';
import EmergencyCorridor from './pages/EmergencyCorridor';
import ScenarioLab from './pages/ScenarioLab';
import Alerts from './pages/Alerts';
import GateManagement from './pages/GateManagement';
import SignalAdvisory from './pages/SignalAdvisory';
import { AuditLog, Reports, Help } from './pages/Utilities';

function App() {
  const [store, setStoreState] = useState<AppStore>(() => {
    const saved = loadStore();
    return saved || initializeStore();
  });
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Persist store changes
  useEffect(() => {
    saveStore(store);
  }, [store]);

  // Simulation loop
  useEffect(() => {
    if (!store.simulation.running) return;

    const interval = setInterval(() => {
      setStoreState(prev => {
        // Generate new observations
        const newObs = simulateCrowdMovement(
          prev.zones,
          prev.gates,
          prev.roads,
          prev.observations,
          prev.simulation.crowdMultiplier,
          prev.simulation.outflowReduction,
          prev.simulation.blockedRoads,
          prev.simulation.closedGates
        );

        // Update road congestion
        const trafficUpdate = simulateTrafficFlow(prev.roads, prev.simulation.blockedRoads, prev.simulation.crowdMultiplier);
        const updatedRoads = prev.roads.map(r => {
          const update = trafficUpdate.find(t => t.roadId === r.id);
          if (!update) return r;
          return {
            ...r,
            currentFlow: update.flow,
            congestionLevel: update.congestion,
            status: prev.simulation.blockedRoads.includes(r.id) ? 'blocked' as const : update.congestion > 70 ? 'congested' as const : 'open' as const
          };
        });

        // Generate new alerts
        const newAlerts = generateAlerts(prev.zones, [...prev.observations, ...newObs], updatedRoads, prev.gates, prev.event.thresholds);
        const alertObjects = newAlerts.slice(0, 2).map((a, i) => ({
          id: `alert-sim-${Date.now()}-${i}`,
          eventId: prev.event.id,
          zoneId: a.zoneId,
          roadId: a.roadId,
          category: a.category as any,
          severity: a.severity as any,
          timestamp: new Date().toISOString(),
          title: a.title,
          description: a.description,
          evidence: a.evidence,
          recommendation: a.recommendation,
          status: 'active' as const,
          dataSource: 'simulation' as const
        }));

        // Keep observations manageable (last 100)
        const allObs = [...prev.observations, ...newObs];
        const trimmedObs = allObs.length > 200 ? allObs.slice(-200) : allObs;

        return {
          ...prev,
          observations: trimmedObs,
          roads: updatedRoads,
          alerts: [...alertObjects, ...prev.alerts].slice(0, 50),
          simulation: {
            ...prev.simulation,
            currentTime: new Date().toISOString()
          }
        };
      });
    }, 3000 / store.simulation.speed);

    return () => clearInterval(interval);
  }, [store.simulation.running, store.simulation.speed]);

  const setStore = useCallback((updater: (prev: AppStore) => AppStore) => {
    setStoreState(prev => updater(prev));
  }, []);

  // Render page
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'map': return <MapPage />;
      case 'crowd': return <CrowdMonitor />;
      case 'traffic': return <TrafficFlow />;
      case 'risk': return <RiskEngine />;
      case 'routes': return <RoutePlanner />;
      case 'emergency': return <EmergencyCorridor />;
      case 'signals': return <SignalAdvisory />;
      case 'scenario': return <ScenarioLab />;
      case 'alerts': return <Alerts />;
      case 'gates': return <GateManagement />;
      case 'audit': return <AuditLog />;
      case 'reports': return <Reports />;
      case 'help': return <Help />;
      default: return <Dashboard />;
    }
  };

  return (
    <StoreContext.Provider value={{ store, setStore }}>
      {!store.currentUser ? (
        <Login />
      ) : (
        <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
          {renderPage()}
        </Layout>
      )}
    </StoreContext.Provider>
  );
}

export default App;
