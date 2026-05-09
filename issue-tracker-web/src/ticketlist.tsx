import { AxiosResponse } from "axios";
import { useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import api from "./api/axios";
import { Project, TicketResponse } from "./TicketResponse";
import useAuth from "./hooks/useAuth";
import useSWR, { mutate } from "swr";

interface TicketListProps {
  project: Project;
}

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

function formatDate(value?: string) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleDateString();
}

export default function TicketList({ project }: TicketListProps) {
  const { t } = useTranslation();
  const { id, name } = project;
  const url = `/projects/${id}/tickets`;
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const canDelete = auth?.role === "ADMIN";
  const key = `ticket-${id}-${page}-${searchTerm}`;

  const fetcher = (fetchUrl: string) => {
    return api
      .get<PaginatedTickets>(fetchUrl, {
        params: { page, size: pageSize, search: searchTerm || undefined },
      })
      .then((res: AxiosResponse<PaginatedTickets>) => res.data);
  };

  const {
    data: paginatedTickets,
    error,
    isLoading,
  } = useSWR<PaginatedTickets | null>(key, () => fetcher(url));

  const tickets = useMemo(() => paginatedTickets?.content || [], [paginatedTickets]);

  function handleDelete(ticketId: number) {
    if (window.confirm(t('ticketList.deleteConfirm', { default: "Are you sure you want to delete this ticket?" }))) {
      api
        .delete(`/tickets/${ticketId}`)
        .then(() => {
          toast.success("Ticket deleted successfully");
          mutate(key);
        })
        .catch((err) => {
          console.error("Error deleting ticket:", err);
          const errorMessage = err.response?.data?.message || err.message || "Failed to delete ticket";
          toast.error(errorMessage);
        });
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && (!paginatedTickets || newPage < paginatedTickets.totalPages)) {
      setPage(newPage);
    }
  };

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(0);
  };

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-xl dark:border-red-900/40 dark:bg-red-900/20">
          <div className="text-4xl">⚠️</div>
          <h2 className="mt-4 text-xl font-bold text-red-700 dark:text-red-200">{t('common.errors.generic')}</h2>
          <p className="mt-3 text-sm text-red-600/80 dark:text-red-200/80">
            {t('ticketList.loadError')}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="page-section overflow-hidden">
        <div className="border-b border-base-300/60 bg-gradient-to-r from-blue-600/10 via-violet-600/10 to-cyan-500/10 p-6 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-base-300/70 bg-base-100/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-base-content/60 shadow-sm">
                {t('ticketList.projectTickets')}
              </div>
              <div>
                <h1 className="section-heading">
                  <span className="opacity-60">#{id}</span> {name}
                </h1>
                <p className="mt-2.5 max-w-2xl text-sm leading-6 text-base-content/65">
                  {t('ticketList.description')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full border border-base-300/70 bg-base-100/80 px-4 py-2 text-sm shadow-sm">
                {paginatedTickets?.totalElements ?? tickets.length} ticket(s)
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
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
                placeholder={t('ticketList.searchPlaceholder')}
                value={searchTerm}
                onChange={handleSearch}
                className="input input-bordered w-full pl-12 focus:ring-2 ring-primary/20"
              />
            </div>

            <div className="flex items-center gap-3 text-sm text-base-content/60">
              <span className="rounded-full border border-base-300/70 bg-base-100/80 px-4 py-2 shadow-sm">
                {canDelete ? t('ticketList.adminAccess') : t('ticketList.readOnly')}
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-base-300/60 bg-base-100/80 shadow-xl">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('ticketList.columns.id')}</th>
                    <th>{t('ticketList.columns.title')}</th>
                    <th>{t('ticketList.columns.category')}</th>
                    <th>{t('ticketList.columns.status')}</th>
                    <th>{t('ticketList.columns.priority')}</th>
                    <th>{t('ticketList.columns.createdAt')}</th>
                    <th>{t('ticketList.columns.modifiedAt')}</th>
                    <th>{t('ticketList.columns.reportedBy')}</th>
                    <th>{t('ticketList.columns.assignedTo')}</th>
                    {canDelete && <th>{t('common.actions')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover">
                      <td>
                        <button
                          type="button"
                          className="font-semibold text-base-content hover:text-primary"
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                        >
                          <span className="opacity-60">#</span>
                          {ticket.id}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="font-semibold text-base-content hover:text-primary"
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                        >
                          {ticket.title}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="text-base-content/75 hover:text-primary"
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                        >
                          {ticket.category || "N/A"}
                        </button>
                      </td>
                      <td>
                        <span
                          className={`badge ${ticket.status === "OPEN"
                            ? "badge-info"
                            : ticket.status === "IN_PROGRESS"
                              ? "badge-warning"
                              : ticket.status === "RESOLVED"
                                ? "badge-success"
                                : "badge-ghost"
                            }`}
                        >
                          {ticket.status}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-outline">{ticket.priority}</span>
                      </td>
                      <td className="text-base-content/75">{formatDate(ticket?.createdAt)}</td>
                      <td className="text-base-content/75">{formatDate(ticket?.modifiedAt)}</td>
                      <td>{ticket.created.firstName}</td>
                      <td>{ticket.assigned ? ticket.assigned.firstName : t('ticketList.unassigned')}</td>
                      {canDelete && (
                        <td>
                          <button className="btn btn-sm btn-error" onClick={() => handleDelete(ticket.id)}>
                            {t('common.delete')}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {tickets.length === 0 && (
                <div className="flex min-h-[240px] items-center justify-center p-10 text-center text-base-content/60">
                  <div>
                    <div className="text-lg font-semibold text-base-content">{t('ticketList.noTickets')}</div>
                    <p className="mt-2 text-sm">
                      {t('ticketList.noTicketsDesc')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {paginatedTickets && paginatedTickets.totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-4 border-t border-base-300/60 bg-base-100/70 px-6 py-4 md:flex-row">
                <span className="text-sm text-base-content/60">
                  Page {paginatedTickets.number + 1} of {paginatedTickets.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button className="btn btn-sm" disabled={paginatedTickets.first} onClick={() => handlePageChange(page - 1)}>
                    {t('common.previous')}
                  </button>
                  <button className="btn btn-sm" disabled={paginatedTickets.last} onClick={() => handlePageChange(page + 1)}>
                    {t('common.next')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
