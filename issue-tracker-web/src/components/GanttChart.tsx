import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api/axios";
import { TicketResponse } from "../TicketResponse";
// @ts-ignore - frappe-gantt doesn't have TypeScript types
import Gantt from "frappe-gantt";
import "../lib/frappe-gantt.css";

interface PaginatedTickets {
  content: TicketResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

interface GanttTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies?: string;
  custom_class?: string;
}

interface GanttChartProps {
  projectId?: number;
  departmentId?: number;
}

export default function GanttChart({ projectId, departmentId }: GanttChartProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  // @ts-ignore - Gantt type is not properly defined
  const [ganttInstance, setGanttInstance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"Day" | "Week" | "Month">("Day");

  useEffect(() => {
    fetchTickets();
  }, [projectId, departmentId, viewMode]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (projectId) params.projectId = projectId;
      if (departmentId) params.departmentId = departmentId;

      // Request a large page size to get all tickets for the Gantt chart
      const response = await api.get<PaginatedTickets>("/tickets/search", {
        params: { ...params, size: 1000 }
      });

      if (containerRef.current) {
        // Clear previous Gantt
        containerRef.current.innerHTML = '';

        // Access the content array from the paginated response
        const tickets = response.data.content || [];
        const tasks: GanttTask[] = tickets

          .map((ticket, index) => {
            const startDate = new Date(ticket.createdAt);
            const endDate = ticket.modifiedAt ? new Date(ticket.modifiedAt) : new Date();

            // Calculate progress based on status
            let progress = 0;
            switch (ticket.status) {
              case "Nouveau": progress = 0; break;
              case "EnCours": progress = 50; break;
              case "Terminé": progress = 90; break;
              default: progress = 25;
            }

            return {
              id: `task-${ticket.id}`,
              name: `#${ticket.id} - ${ticket.title}`,
              start: startDate.toISOString().split('T')[0],
              end: endDate.toISOString().split('T')[0],
              progress: progress,
              dependencies: index > 0 ? `task-${tickets[index - 1].id}` : undefined,
              custom_class: getStatusColor(ticket.status),
            };
          });

        if (tasks.length > 0 && containerRef.current) {
          const gantt = new Gantt(containerRef.current, tasks, {
            header_height: 50,
            column_width: 30,
            step: 24,
            view_modes: ["Quarter Day", "Half Day", "Day", "Week", "Month"],
            bar_height: 30,
            bar_corner_radius: 3,
            arrow_curve: 5,
            padding: 18,
            view_mode: viewMode as any,
            date_format: "YYYY-MM-DD",
            language: "fr",
            custom_popup_html: function (task: any) {
              return `
                <div class="card bg-base-100 p-2" style="min-width: 200px;">
                  <h5 class="font-bold">${task.name}</h5>
                  <p class="text-sm">Progress: ${task.progress}%</p>
                  <p class="text-xs text-gray-500">${task.start} → ${task.end}</p>
                </div>
              `;
            },
          });

          setGanttInstance(gantt);
        }
      }
    } catch (error) {
      console.error("Error fetching tickets for Gantt:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "Nouveau": return "bar-blue";
      case "EnCours": return "bar-yellow";
      case "Terminé": return "bar-green";
      default: return "bar-orange";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-bold text-base-content flex items-center gap-3">
          <svg className="w-6 h-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          {t("gantt.title")}
        </h2>
        <div className="bg-base-100/60 backdrop-blur-md p-1.5 rounded-2xl border border-base-300/50 flex gap-1 shadow-sm w-max">
          {(["Day", "Week", "Month"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${viewMode === mode ? "bg-base-100 shadow-md text-secondary" : "text-base-content/60 hover:bg-base-200/50 hover:text-base-content"}`}
              onClick={() => setViewMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-base-300/60 bg-base-100/40 backdrop-blur-xl shadow-sm relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="overflow-x-auto p-4 z-10 relative">
          <div ref={containerRef} className="gantt-container min-h-[400px]"></div>
        </div>
      </div>

      <style>{`
        .gantt-container {
          min-height: 400px;
          overflow-x: auto;
        }
        .gantt .grid-header { fill: transparent !important; stroke: var(--fallback-bc,oklch(var(--bc)/0.1)) !important; }
        .gantt .grid-row { fill: transparent !important; stroke: var(--fallback-bc,oklch(var(--bc)/0.05)) !important; }
        .gantt .tick { stroke: var(--fallback-bc,oklch(var(--bc)/0.1)) !important; }
        .gantt .lower-text, .gantt .upper-text { fill: var(--fallback-bc,oklch(var(--bc)/0.7)) !important; font-size: 11px !important; font-weight: 600; }
        .bar-blue { fill: #3b82f6; stroke: #2563eb; stroke-width: 1px; }
        .bar-yellow { fill: #eab308; stroke: #ca8a04; stroke-width: 1px; }
        .bar-green { fill: #22c55e; stroke: #16a34a; stroke-width: 1px; }
        .bar-gray { fill: #6b7280; stroke: #4b5563; stroke-width: 1px; }
        .bar-orange { fill: #f97316; stroke: #ea580c; stroke-width: 1px; }
        .gantt .bar-wrapper:hover .bar { fill-opacity: 0.8; }
        .gantt .bar-progress { fill: rgba(255,255,255,0.3) !important; }
      `}</style>
    </div>
  );
}
