import { useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import api from "./api/axios";
import type { Project } from "./TicketResponse";
import type { PaginatedTickets } from "./TicketResponse";
import useAuth from "./hooks/useAuth";
import useSWR, { mutate } from "swr";
import TicketRow from "./components/ticket/TicketRow";
import Pagination from "./components/ticket/Pagination";

const PAGE_SIZE = 10;

interface TicketListProps {
  project: Project;
}

export default function TicketList({ project }: TicketListProps) {
  const { t } = useTranslation();
  const { auth } = useAuth();

  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const projectId = project.id;
  const projectName = project.name;
  const canDelete = auth?.role === "ADMIN" || auth?.role === "SUPPORT";

  const swrKey = `ticket-project-${projectId}-${page}-${searchTerm}`;

  const { data: paginated, error, isLoading } = useSWR<PaginatedTickets | null>(
    swrKey,
    () =>
      api
        .get<PaginatedTickets>(`/projects/${projectId}/tickets`, {
          params: { page, size: PAGE_SIZE, search: searchTerm || undefined },
        })
        .then((res) => res.data),
  );

  const tickets = paginated?.content ?? [];

  function handleDelete(ticketId: number) {
    if (!window.confirm(t("ticketList.deleteConfirm", { defaultValue: "Are you sure you want to delete this ticket?" }))) {
      return;
    }

    api.delete(`/tickets/${ticketId}`)
      .then(() => {
        toast.success(t("message.ticketDeleted"));
        mutate(swrKey);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || err.message || "Failed to delete ticket";
        toast.error(msg);
      });
  }

  function handlePageChange(newPage: number) {
    if (newPage >= 0 && (!paginated || newPage < paginated.totalPages)) {
      setPage(newPage);
    }
  }

  function handleSearch(e: ChangeEvent<HTMLInputElement>) {
    setSearchTerm(e.target.value);
    setPage(0);
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-xl dark:border-red-900/40 dark:bg-red-900/20">
          <div className="text-4xl">⚠️</div>
          <h2 className="mt-4 text-xl font-bold text-red-700 dark:text-red-200">
            {t("common.errors.generic")}
          </h2>
          <p className="mt-3 text-sm text-red-600/80 dark:text-red-200/80">
            {t("ticketList.loadError")}
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
                Tickets du projet
              </div>
              <div>
                <h1 className="section-heading">
                  <span className="opacity-60">#{projectId}</span> {projectName}
                </h1>
                <p className="mt-2.5 max-w-2xl text-sm leading-6 text-base-content/65">
                  Liste des tickets associés à ce projet
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full border border-base-300/70 bg-base-100/80 px-4 py-2 text-sm shadow-sm">
                {paginated?.totalElements ?? tickets.length} ticket(s)
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
                placeholder={t("ticketList.searchPlaceholder")}
                value={searchTerm}
                onChange={handleSearch}
                className="input input-bordered w-full pl-12 focus:ring-2 ring-primary/20"
              />
            </div>

            <div className="flex items-center gap-3 text-sm text-base-content/60">
              <span className="rounded-full border border-base-300/70 bg-base-100/80 px-4 py-2 shadow-sm">
                {canDelete ? "Accès administrateur" : "Lecture seule"}
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-base-300/60 bg-base-100/80 shadow-xl">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Titre</th>
                    <th>Type</th>
                    <th>Catégorie</th>
                    <th>Statut</th>
                    <th>Priorité</th>
                    <th>Créé le</th>
                    <th>Modifié le</th>
                    <th>Signalé par</th>
                    <th>Assigné à</th>
                    {canDelete && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <TicketRow
                      key={ticket.id}
                      ticket={ticket}
                      canDelete={canDelete}
                      onDelete={handleDelete}
                    />
                  ))}
                </tbody>
              </table>

              {tickets.length === 0 && (
                <div className="flex min-h-[240px] items-center justify-center p-10 text-center text-base-content/60">
                  <div>
                    <div className="text-lg font-semibold text-base-content">
                      {t("ticketList.noTickets")}
                    </div>
                    <p className="mt-2 text-sm">{t("ticketList.noTicketsDesc")}</p>
                  </div>
                </div>
              )}
            </div>

            {paginated && (
              <Pagination
                paginated={paginated}
                currentPage={page}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}