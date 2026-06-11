import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardApi } from "../../api/dashboard";
import { DashboardData, TimeRangeFilter, SlaStats } from "../../types/dashboard";
import FilterPanel from "./FilterPanel";
import StatsCards from "./StatsCards";
import Charts from "./Charts";
import KanbanBoard from "../KanbanBoard";
import GanttChart from "../GanttChart";
import useAuth from "../../hooks/useAuth";

type ViewMode = "stats" | "charts" | "kanban" | "gantt";

const Dashboard: React.FC = () => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [slaStats, setSlaStats] = useState<SlaStats | null>(null);
  const [filters, setFilters] = useState<TimeRangeFilter>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0], // today
  });
  const [viewMode, setViewMode] = useState<ViewMode>("stats");

  // Check if user is admin
  useEffect(() => {
    const token = auth?.token || localStorage.getItem("token");
    if (!token) {
      // If no token, redirect to login
      navigate("/login");
      return;
    }

    if (auth?.role !== "ADMIN") {
      navigate("/projects");
    }
  }, [auth, navigate]);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardResult, slaResult] = await Promise.all([
        dashboardApi.getDashboardData(filters),
        dashboardApi.getSlaMetrics(),
      ]);
      setData(dashboardResult);
      setSlaStats(slaResult);
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filters]);

  const handleFilterChange = (newFilters: TimeRangeFilter) => {
    setFilters(newFilters);
  };

  const handleReset = () => {
    setFilters({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error shadow-lg">
        <div>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="alert alert-warning shadow-lg">
        <div>
          <span>No dashboard data available</span>
        </div>
      </div>
    );
  }

  if (!slaStats) {
    return (
      <div className="alert alert-warning shadow-lg">
        <div>
          <span>Loading SLA data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <section className="page-section overflow-hidden rounded-3xl border border-base-300/60 shadow-lg">
        <div className="relative bg-gradient-to-r from-blue-600/10 via-violet-600/10 to-cyan-500/10 p-6 md:p-10 overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-primary/10 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-secondary/10 blur-3xl"></div>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-base-300/70 bg-base-100/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-base-content/60 shadow-sm mb-4">
                Overview
              </div>
              <h1 className="text-4xl font-black tracking-tight text-base-content">Dashboard d'Analyse</h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-base-content/70">
                Vue d'ensemble des métriques, analyses et visualisations des tickets et projets.
              </p>
            </div>

            {/* View Mode Tabs */}
            <div className="bg-base-100/60 backdrop-blur-md p-1.5 rounded-2xl border border-base-300/50 flex gap-1 shadow-sm">
              <button
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${viewMode === "stats" ? "bg-base-100 shadow-md text-primary" : "text-base-content/60 hover:bg-base-200/50 hover:text-base-content"}`}
                onClick={() => setViewMode("stats")}
              >
                Stats & Charts
              </button>
              <button
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${viewMode === "kanban" ? "bg-base-100 shadow-md text-primary" : "text-base-content/60 hover:bg-base-200/50 hover:text-base-content"}`}
                onClick={() => setViewMode("kanban")}
              >
                Kanban
              </button>
              <button
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${viewMode === "gantt" ? "bg-base-100 shadow-md text-primary" : "text-base-content/60 hover:bg-base-200/50 hover:text-base-content"}`}
                onClick={() => setViewMode("gantt")}
              >
                Gantt
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 bg-base-100/40">
          <FilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />

          <div className="space-y-8">
            {viewMode === "stats" && (
              <>
                <StatsCards stats={data.stats} />

                {slaStats && (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-8 mb-8">
                    <div className="relative overflow-hidden rounded-2xl border border-base-300/60 bg-base-100/80 p-6 shadow-sm backdrop-blur-xl group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-success/10 rounded-full blur-xl -mr-10 -mt-10 group-hover:bg-success/20 transition-colors"></div>
                      <h3 className="text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-2">Taux de Conformité SLA</h3>
                      <div className="flex items-end gap-3">
                        <p className={`text-4xl font-black tracking-tight ${slaStats.complianceRate >= 90 ? "text-success" : slaStats.complianceRate >= 70 ? "text-warning" : "text-error"}`}>
                          {slaStats.complianceRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-base-300/60 bg-base-100/80 p-6 shadow-sm backdrop-blur-xl group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-error/10 rounded-full blur-xl -mr-10 -mt-10 group-hover:bg-error/20 transition-colors"></div>
                      <h3 className="text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-2">Tickets SLA Dépassé</h3>
                      <div className="flex items-end gap-3">
                        <p className="text-4xl font-black tracking-tight text-error">{slaStats.breachedTickets}</p>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-base-300/60 bg-base-100/80 p-6 shadow-sm backdrop-blur-xl group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-warning/10 rounded-full blur-xl -mr-10 -mt-10 group-hover:bg-warning/20 transition-colors"></div>
                      <h3 className="text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-2">Tickets à Risque</h3>
                      <div className="flex items-end gap-3">
                        <p className="text-4xl font-black tracking-tight text-warning">{slaStats.atRiskTickets}</p>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-base-300/60 bg-base-100/80 p-6 shadow-sm backdrop-blur-xl group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-success/10 rounded-full blur-xl -mr-10 -mt-10 group-hover:bg-success/20 transition-colors"></div>
                      <h3 className="text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-2">Résolus dans les Temps</h3>
                      <div className="flex items-end gap-3">
                        <p className="text-4xl font-black tracking-tight text-success">{slaStats.resolvedOnTime}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Charts
                  statusDistribution={data.statusDistribution}
                  departmentStats={data.departmentStats}
                  userStats={data.userStats}
                />
              </>
            )}
            {viewMode === "kanban" && <KanbanBoard projectId={filters.projectId} departmentId={filters.departmentId} />}
            {viewMode === "gantt" && <GanttChart projectId={filters.projectId} departmentId={filters.departmentId} />}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
