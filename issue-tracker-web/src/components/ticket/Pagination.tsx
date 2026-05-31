import { PaginatedTickets } from "../../TicketResponse";

interface PaginationProps {
  paginated: PaginatedTickets;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ paginated, onPageChange }: PaginationProps) {
  const { totalPages, number: page } = paginated;

  if (totalPages <= 1) return null;

  const pages = getVisiblePages(page, totalPages);

  return (
    <div className="flex items-center justify-between border-t border-base-300/60 bg-base-100/60 px-6 py-4">
      <div className="text-sm text-base-content/60">
        Page {page + 1} sur {totalPages}
      </div>
      <div className="join gap-1">
        <button
          className="join-item btn btn-sm"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          «
        </button>
        {pages.map((p, i) =>
          p === -1 ? (
            <span key={`ellipsis-${i}`} className="join-item btn btn-sm btn-disabled">
              …
            </span>
          ) : (
            <button
              key={p}
              className={`join-item btn btn-sm ${p === page ? "btn-primary" : ""}`}
              onClick={() => onPageChange(p)}
            >
              {p + 1}
            </button>
          )
        )}
        <button
          className="join-item btn btn-sm"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          »
        </button>
      </div>
    </div>
  );
}

function getVisiblePages(current: number, total: number): (number | -1)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);

  const pages: (number | -1)[] = [];

  if (current < 4) {
    for (let i = 0; i < 5; i++) pages.push(i);
    pages.push(-1);
    pages.push(total - 1);
  } else if (current > total - 5) {
    pages.push(0);
    pages.push(-1);
    for (let i = total - 5; i < total; i++) pages.push(i);
  } else {
    pages.push(0);
    pages.push(-1);
    for (let i = current - 1; i <= current + 1; i++) pages.push(i);
    pages.push(-1);
    pages.push(total - 1);
  }

  return pages;
}
