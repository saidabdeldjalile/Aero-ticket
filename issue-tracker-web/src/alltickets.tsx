import api from "./api/axios";
import useSWR, { mutate } from "swr";
import { TicketResponse } from "./TicketResponse";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import useAuth from "./hooks/useAuth";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

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

type ViewMode = "table" | "kanban" | "gantt";
type TicketStatus = "Nouveau" | "EnCours" | "EnAttente" | "Terminé";
type TicketPriority = "High" | "Medium" | "Low" | "Critical";

interface AdvancedFilters {
  statuses: TicketStatus[];
  priorities: TicketPriority[];
  startDate: string;
  endDate: string;
}

export default function AllTickets() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const email = auth?.email;
  const role = auth?.role;
  const departmentId = auth?.departmentId;
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode] = useState<ViewMode>("table");
  const [selectedTickets, setSelectedTickets] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>({
    statuses: [],
    priorities: [],
    startDate: "",
    endDate: "",
  });
  const [tempFilters, setTempFilters] = useState<AdvancedFilters>({
    statuses: [],
    priorities: [],
    startDate: "",
    endDate: "",
  });

  const hasActiveFilters = filters.statuses.length > 0 ||
    filters.priorities.length > 0 ||
    filters.startDate ||
    filters.endDate;

  const key = `all-tickets-${email}-${role}-${departmentId}-${page}-${searchTerm}-${viewMode}-${filters.statuses.join(',')}-${filters.priorities.join(',')}-${filters.startDate}-${filters.endDate}`;

  const fetcher = async () => {
    if (hasActiveFilters) {
      const params: Record<string, string | number | string[]> = {};
      params.page = page;
      params.size = pageSize;

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (filters.statuses.length > 0) {
        params.status = filters.statuses.join(',');
      }

      if (filters.priorities.length > 0) {
        params.priority = filters.priorities.join(',');
      }

      if (filters.startDate) {
        const date = new Date(filters.startDate);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        params.startDate = `${year}-${month}-${day} 00:00:00`;
      }

      if (filters.endDate) {
        const date = new Date(filters.endDate);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        params.endDate = `${year}-${month}-${day} 23:59:59`;
      }

      const response = await api.get("/tickets/search", { params });
      return response.data as PaginatedTickets;
    }

    // Use role-based endpoint to filter tickets appropriately
    if (role === "ADMIN") {
      // Admin sees all tickets
      const response = await api.get("/tickets", {
        params: { page, size: pageSize, search: searchTerm || undefined },
      });
      return response.data as PaginatedTickets;
    } else {
      // SUPPORT sees department tickets, USER sees only their own tickets
      const response = await api.get("/tickets/tickets-for-user", {
        params: {
          page,
          size: pageSize,
          search: searchTerm || undefined,
          email,
          role,
          departmentId: departmentId || undefined
        },
      });
      return response.data as PaginatedTickets;
    }
  };

  const {
    data: paginatedTickets,
    error,
    isLoading,
  } = useSWR<PaginatedTickets>(key, fetcher);

  const tickets = useMemo(() => paginatedTickets?.content || [], [paginatedTickets]);
  const totalTickets = paginatedTickets?.totalElements || tickets.length;

  const canDelete = role === "ADMIN" || role === "SUPPORT";

  const getPageTitle = () => t("alltickets.title");
  const getPageDescription = () => {
    if (role === "ADMIN") return t("alltickets.adminDesc");
    if (role === "SUPPORT") return t("alltickets.supportDesc");
    return t("alltickets.userDesc");
  };

  const toggleTicketSelection = (ticketId: number) => {
    const newSelected = new Set(selectedTickets);
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId);
    } else {
      newSelected.add(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  const toggleAllTickets = () => {
    if (selectedTickets.size === tickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(tickets.map(t => t.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTickets.size === 0) return;

    if (!window.confirm(t("alltickets.bulkDeleteConfirm", { count: selectedTickets.size }))) {
      return;
    }

    try {
      await api.post("/tickets/bulk/delete", {
        ticketIds: Array.from(selectedTickets)
      });
      toast.success(t("message.bulkDeleteSuccess", { count: selectedTickets.size }));
      setSelectedTickets(new Set());
      mutate(key);
    } catch (err: any) {
      console.error("Error bulk deleting tickets:", err);
      toast.error(err.response?.data?.message || "Une erreur est survenue");
    }
  };

  const handleBulkAssign = async () => {
    if (selectedTickets.size === 0) return;

    const assigneeEmail = prompt(t("alltickets.assignPrompt"));
    if (!assigneeEmail) return;

    try {
      await api.post("/tickets/bulk/assign", {
        ticketIds: Array.from(selectedTickets),
        assigneeEmail,
      });
      toast.success(t("message.bulkAssignSuccess", { count: selectedTickets.size }));
      setSelectedTickets(new Set());
      mutate(key);
    } catch (err: any) {
      console.error("Error bulk assigning tickets:", err);
      toast.error(err.response?.data?.message || "Une erreur est survenue");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t("ticket.deleteConfirm"))) {
      return;
    }

    try {
      await api.delete(`/tickets/${id}`);
      toast.success(t("message.ticketDeleted"));
      mutate(key);
    } catch (err: any) {
      console.error("Error deleting ticket:", err);
      const errorMessage = err.response?.data?.message || err.message || "Une erreur est survenue";
      toast.error(errorMessage);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && (!paginatedTickets || newPage < paginatedTickets.totalPages)) {
      setPage(newPage);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(0);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        <p className="text-sm font-medium animate-pulse">{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto text-error mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-error text-lg mb-4">{t('alltickets.loadingError')}</p>
          <button className="btn btn-primary" onClick={() => mutate(key)}>
            {t('alltickets.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="card bg-base-100 shadow-xl border border-base-200 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600/10 via-red-800/5 to-gray-500/5 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-base-300/70 bg-base-100/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-base-content/60 shadow-sm mb-3">
                {t('navbar.tickets')}
              </div>
              <h1 className="text-3xl font-black tracking-tight">{getPageTitle()}</h1>
              <p className="text-base-content/60 mt-1">{getPageDescription()}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {selectedTickets.size > 0 && (
                <>
                  <span className="badge badge-primary badge-lg">
                    {t('common.selected', { count: selectedTickets.size })}
                  </span>
                  <button className="btn btn-error btn-sm" onClick={handleBulkDelete}>
                    {t('common.delete')}
                  </button>
                  <button className="btn btn-warning btn-sm" onClick={handleBulkAssign}>
                    {t('alltickets.bulkAssign')}
                  </button>
                </>
              )}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? t('alltickets.hideFilters') : t('alltickets.advancedFilters')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative w-full lg:w-96">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-base-content/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder={t('alltickets.searchPlaceholder')}
              value={searchTerm}
              onChange={handleSearch}
              className="input input-bordered w-full pl-12 focus:ring-2 ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-base-300/70 bg-base-100/80 px-4 py-2 text-sm shadow-sm">
              {t('alltickets.totalCount', { count: totalTickets })}
            </span>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="form-control">
              <label className="label-text font-bold mb-2">{t('filters.status')}</label>
              <select
                className="select select-bordered"
                value={tempFilters.statuses.length === 1 ? tempFilters.statuses[0] : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setTempFilters(prev => ({
                    ...prev,
                    statuses: value ? [value as TicketStatus] : []
                  }));
                }}
              >
                <option value="">{t('common.all')}</option>
                <option value="Nouveau">{t('status.nouveau')}</option>
                <option value="EnCours">{t('status.inProgress')}</option>
                <option value="Terminé">{t('status.resolved')}</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label-text font-bold mb-2">{t('filters.priority')}</label>
              <select
                className="select select-bordered"
                value={tempFilters.priorities.length === 1 ? tempFilters.priorities[0] : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setTempFilters(prev => ({
                    ...prev,
                    priorities: value ? [value as TicketPriority] : []
                  }));
                }}
              >
                <option value="">{t('common.all')}</option>
                <option value="Critical">{t('priority.critical')}</option>
                <option value="High">{t('priority.high')}</option>
                <option value="Medium">{t('priority.medium')}</option>
                <option value="Low">{t('priority.low')}</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label-text font-bold mb-2">{t('filters.startDate')}</label>
              <input
                type="date"
                className="input input-bordered"
                value={tempFilters.startDate}
                onChange={(e) => setTempFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="form-control">
              <label className="label-text font-bold mb-2">{t('filters.endDate')}</label>
              <input
                type="date"
                className="input input-bordered"
                value={tempFilters.endDate}
                onChange={(e) => setTempFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setTempFilters({
                  statuses: [],
                  priorities: [],
                  startDate: '',
                  endDate: '',
                });
                setFilters({
                  statuses: [],
                  priorities: [],
                  startDate: '',
                  endDate: '',
                });
                setPage(0);
              }}
            >
              {t('common.reset')}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (tempFilters.startDate && tempFilters.endDate && new Date(tempFilters.startDate) > new Date(tempFilters.endDate)) {
                  toast.error(t('errors.dateFilterOrder'));
                  return;
                }
                setFilters(tempFilters);
                setPage(0);
              }}
            >
              {t('common.apply')}
            </button>
          </div>
        </div>
      )}

      {/* Tickets Table */}
      <div className="bg-base-100 rounded-3xl shadow-sm border border-base-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead className="bg-base-200/50">
              <tr>
                {canDelete && (
                  <th className="w-12">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={selectedTickets.size === tickets.length && tickets.length > 0}
                      onChange={toggleAllTickets}
                    />
                  </th>
                )}
                <th>{t('ticket.title')}</th>
                <th>{t('ticket.issueType')}</th>
                <th>{t('ticket.project')}</th>
                <th>{t('ticket.status')}</th>
                <th>{t('ticket.priority')}</th>
                <th>{t('ticket.createdAt')}</th>
                <th>{t('ticket.modifiedAt')}</th>
                <th>{t('ticket.createdBy')}</th>
                <th>{t('ticket.assignedTo')}</th>
                {canDelete && <th className="text-center">{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-primary/5 transition-colors">
                  {canDelete && (
                    <td>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selectedTickets.has(ticket.id)}
                        onChange={() => toggleTicketSelection(ticket.id)}
                      />
                    </td>
                  )}
                  <td className="font-semibold">
                    <Link to={`/tickets/${ticket.id}`} className="hover:text-primary transition-colors">
                      {ticket.title}
                    </Link>
                  </td>
                  <td>
                    <span className="text-sm">{ticket.issueType || "-"}</span>
                  </td>
                  <td>
                    {ticket.project ? (
                      <Link to={`/projects/${ticket.project.id}/tickets`} className="hover:text-primary transition-colors">
                        {ticket.project.name}
                      </Link>
                    ) : (
                      <span className="text-base-content/40">{t('alltickets.noProject')}</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-sm ${ticket.status === "Nouveau" ? "badge-info" :
                      ticket.status === "EnCours" ? "badge-warning" :
                        ticket.status === "Terminé" ? "badge-success" :
                          ticket.status === "EnAttente" ? "badge-neutral" : "badge-ghost"
                      }`}>
                      {ticket.status === "Nouveau" ? t('status.nouveau') :
                        ticket.status === "EnCours" ? t('status.inProgress') :
                          ticket.status === "Terminé" ? t('status.done') :
                            ticket.status === "EnAttente" ? "En attente" : ticket.status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-sm ${ticket.priority === "High" ? "badge-error" :
                      ticket.priority === "Medium" ? "badge-warning" :
                        ticket.priority === "Critical" ? "badge-error" : "badge-success"
                      }`}>
                      {ticket.priority === "Critical" ? t('priority.critical') :
                        ticket.priority === "High" ? t('priority.high') :
                          ticket.priority === "Medium" ? t('priority.medium') :
                            ticket.priority === "Low" ? t('priority.low') : ticket.priority}
                    </span>
                  </td>
                  <td className="text-sm">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                  <td className="text-sm">{new Date(ticket.modifiedAt).toLocaleDateString()}</td>
                  <td className="text-sm">{ticket.created?.firstName || ticket.created?.email || "-"}</td>
                  <td className="text-sm">
                    {ticket.assigned ? (
                      <span className="badge badge-ghost badge-sm">
                        {ticket.assigned.firstName} {ticket.assigned.lastname}
                      </span>
                    ) : (
                      <span className="text-base-content/40">{t('alltickets.unassigned')}</span>
                    )}
                  </td>
                  {canDelete && (
                    <td className="text-center">
                      <button
                        className="btn btn-error btn-sm"
                        onClick={() => handleDelete(ticket.id)}
                      >
                        {t('common.delete')}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {tickets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-base-content/40">
              <svg
                className="w-24 h-24 mb-4 stroke-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-xl font-medium">{t('ticket.noTickets')}</p>
              <p className="text-sm mt-2">
                {searchTerm ? t('alltickets.noTicketsDesc') : t('alltickets.noTicketsEmpty')}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {paginatedTickets && paginatedTickets.totalPages > 1 && (
          <div className="p-4 border-t border-base-200 flex items-center justify-between bg-base-50">
            <span className="text-sm opacity-60">
              {t('alltickets.page')} {paginatedTickets.number + 1} / {paginatedTickets.totalPages}
            </span>
            <div className="join shadow-sm">
              <button
                className="join-item btn btn-sm"
                disabled={paginatedTickets.first}
                onClick={() => handlePageChange(page - 1)}
              >
                ← {t('alltickets.previous')}
              </button>
              <button
                className="join-item btn btn-sm"
                disabled={paginatedTickets.last}
                onClick={() => handlePageChange(page + 1)}
              >
                {t('alltickets.next')} →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}