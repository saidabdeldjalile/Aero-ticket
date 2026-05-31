import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../api/axios";
import { TicketResponse } from "../TicketResponse";
import { toast } from "react-toastify";

interface KanbanColumn {
  status: string;
  tickets: TicketResponse[];
}

interface KanbanData {
  [key: string]: TicketResponse[];
}

interface KanbanBoardProps {
  projectId?: number;
  departmentId?: number;
}

const STATUS_CONFIG = [
  { key: "Nouveau", label: "New", labelFr: "Nouveau", color: "bg-blue-500" },
  { key: "EnCours", label: "In Progress", labelFr: "En cours", color: "bg-yellow-500" },
  { key: "EnAttente", label: "Waiting", labelFr: "En attente", color: "bg-purple-500" },
  { key: "Terminé", label: "Done", labelFr: "Terminé", color: "bg-green-500" },
];

export default function KanbanBoard({ projectId, departmentId }: KanbanBoardProps) {
  const { t, i18n } = useTranslation();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKanbanData = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (projectId) params.projectId = projectId;
      if (departmentId) params.departmentId = departmentId;

      const response = await api.get<KanbanData>("/tickets/kanban", { params });

      const kanbanColumns = STATUS_CONFIG.map((config) => ({
        status: config.key,
        tickets: response.data[config.key] || [],
      }));

      setColumns(kanbanColumns);
    } catch (error) {
      console.error("Error fetching kanban data:", error);
      toast.error(t("message.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKanbanData();
  }, [projectId, departmentId]);

  const getLabel = (config: typeof STATUS_CONFIG[0]) => {
    return i18n.language === 'fr' ? config.labelFr : config.label;
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-base-content flex items-center gap-3">
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
          {t("kanban.title")}
        </h2>
      </div>

      <div className="flex overflow-x-auto gap-5 pb-6 snap-x">
        {columns.map((column) => {
          const config = STATUS_CONFIG.find(c => c.key === column.status);
          const colorClass = config?.color || "bg-gray-500";
          const colorName = colorClass.replace('bg-', '').split('-')[0];

          return (
            <div
              key={column.status}
              className="flex-shrink-0 w-80 snap-center flex flex-col max-h-[800px] rounded-2xl border border-base-300/60 bg-base-100/40 backdrop-blur-xl shadow-sm"
            >
              <div className="p-4 border-b border-base-300/50 bg-base-100/50 rounded-t-2xl">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${colorClass} shadow-sm shadow-${colorName}-500/50`}></div>
                    <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/80">
                      {config ? getLabel(config) : column.status}
                    </h3>
                  </div>
                  <span className="bg-base-200 text-base-content/70 text-xs font-bold px-2 py-0.5 rounded-full">
                    {column.tickets.length}
                  </span>
                </div>
                <div className={`h-1 w-full rounded-full mt-3 bg-${colorName}-500/20 overflow-hidden`}>
                  <div className={`h-full w-full ${colorClass}`}></div>
                </div>
              </div>

              <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {column.tickets.map((ticket) => (
                  <div
                    key={ticket.id.toString()}
                    className="group bg-base-100 border border-base-300/50 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
                  >
                    <div className={`absolute top-0 left-0 w-1 h-full ${colorClass} opacity-70 group-hover:opacity-100 transition-opacity`}></div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-base-content/40 uppercase tracking-wider">#{ticket.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${ticket.priority === "High" || ticket.priority === "Critical" || ticket.priority === "Urgent"
                        ? "bg-error/10 text-error border border-error/20"
                        : ticket.priority === "Medium"
                          ? "bg-warning/10 text-warning border border-warning/20"
                          : "bg-info/10 text-info border border-info/20"
                        }`}>
                        {ticket.priority}
                      </span>
                    </div>

                    <h4 className="font-semibold text-sm text-base-content mb-3 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {ticket.title}
                    </h4>

                    {ticket.issueType && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/50 mb-2 block">
                        {ticket.issueType}
                      </span>
                    )}

                    {ticket.assigned && (
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-base-200/50">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                            {ticket.assigned.firstName?.charAt(0) || '?'}
                          </div>
                          <span className="text-xs font-medium text-base-content/70 truncate max-w-[120px]">
                            {ticket.assigned.firstName}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {column.tickets.length === 0 && (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-base-300/60 rounded-xl bg-base-100/30">
                    <span className="text-xs font-medium text-base-content/40">Aucun ticket</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}