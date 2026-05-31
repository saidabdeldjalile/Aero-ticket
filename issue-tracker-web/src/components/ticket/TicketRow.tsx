import { TicketResponse } from "../../TicketResponse";

interface TicketRowProps {
  ticket: TicketResponse;
  canDelete: boolean;
  onDelete: (ticketId: number) => void;
}

export default function TicketRow({ ticket, canDelete, onDelete }: TicketRowProps) {
  return (
    <tr className="hover:bg-base-200/50 transition-colors">
      <td className="font-mono text-sm">{ticket.id}</td>
      <td className="font-medium">{ticket.title}</td>
      <td>{ticket.issueType || "N/A"}</td>
      <td>{ticket.category || "N/A"}</td>
      <td>
        <span className={`badge badge-sm ${getStatusBadge(ticket.status)}`}>
          {ticket.status}
        </span>
      </td>
      <td>
        <span className={`badge badge-sm ${getPriorityBadge(ticket.priority)}`}>
          {ticket.priority}
        </span>
      </td>
      <td className="text-sm text-base-content/70">{formatDate(ticket.createdAt)}</td>
      <td className="text-sm text-base-content/70">{formatDate(ticket.modifiedAt)}</td>
      <td className="text-sm">{ticket.created?.email || "N/A"}</td>
      <td className="text-sm">{ticket.assigned?.email || "Non assigné"}</td>
      {canDelete && (
        <td>
          <button
            onClick={() => onDelete(ticket.id)}
            className="btn btn-ghost btn-xs text-error hover:bg-error/10"
          >
            Supprimer
          </button>
        </td>
      )}
    </tr>
  );
}

function getStatusBadge(status: string): string {
  switch (status) {
    case "Nouveau":
      return "badge-info";
    case "EnCours":
      return "badge-warning";
    case "EnAttente":
      return "badge-ghost";
    case "Terminé":
      return "badge-success";
    case "Deleted":
      return "badge-error";
    default:
      return "badge-ghost";
  }
}

function getPriorityBadge(priority: string): string {
  switch (priority.toLowerCase()) {
    case "high":
    case "haute":
      return "badge-error";
    case "medium":
    case "moyenne":
      return "badge-warning";
    case "low":
    case "basse":
      return "badge-success";
    default:
      return "badge-ghost";
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
