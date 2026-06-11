import React from 'react';
import { TicketResponse } from '../../TicketResponse';
import useAuth from '../../hooks/useAuth';
import { toast } from 'react-toastify';
import api from '../../api/axios';

interface TicketActionsProps {
  ticket: TicketResponse | null | undefined;
  onUpdate?: () => void;
}

/* ── Transition row ── */
function TransRow({
  from,
  to,
  icon,
  permission,
  highlight,
}: {
  from: string;
  to: string;
  icon: string;
  permission: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] transition-colors ${
        highlight ? 'border border-red-100 bg-red-50 dark:border-red-900 dark:bg-red-950/20' : 'bg-gray-50 dark:bg-gray-800/60'
      }`}
    >
      <span className="whitespace-nowrap rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
        {from}
      </span>
      <span className="flex-shrink-0 text-gray-400">{icon}</span>
      <span className="whitespace-nowrap rounded bg-green-100 px-1.5 py-0.5 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
        {to}
      </span>
      <span className="ml-auto flex-shrink-0 whitespace-nowrap text-gray-400 dark:text-gray-500">
        {permission}
      </span>
    </div>
  );
}

export const TicketActions: React.FC<TicketActionsProps> = ({ ticket, onUpdate }) => {
  const { auth } = useAuth();

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.patch(`/tickets/${ticket?.id}`, {
        status: newStatus,
        modifierEmail: auth?.email,
        modifierRole: auth?.role,
      });
      toast.success(`Statut mis à jour : ${newStatus}`);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Erreur de mise à jour');
    }
  };

  const handleDeleteTicket = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce ticket ?')) return;
    try {
      await api.delete(`/tickets/${ticket?.id}`);
      toast.success('Ticket supprimé avec succès');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Erreur de suppression');
    }
  };

  const isReporter = ticket?.created?.email === auth?.email;
  const isAssigned = ticket?.assigned?.email === auth?.email;
  const isAdmin = auth?.role === 'ADMIN';
  const isSupport = auth?.role === 'SUPPORT';

  /* ── Action button ── */
  const Btn = ({
    onClick,
    color,
    children,
  }: {
    onClick: () => void;
    color: string;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={`w-full rounded-xl px-3 py-2 text-xs font-semibold text-white transition-all active:scale-95 bg-${color}-600 hover:bg-${color}-700 dark:bg-${color}-500 dark:hover:bg-${color}-600`}
    >
      {children}
    </button>
  );

  /* ── Danger button (for delete/cancel) ── */
  const DangerBtn = ({
    onClick,
    children,
  }: {
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className="w-full rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-all active:scale-95 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
    >
      {children}
    </button>
  );

  /* ── Info chip (no permission) ── */
  const Info = ({ color, children }: { color: string; children: React.ReactNode }) => (
    <div className={`rounded-xl px-3 py-2 text-center text-xs font-medium bg-${color}-50 text-${color}-600 dark:bg-${color}-900/20 dark:text-${color}-300`}>
      {children}
    </div>
  );

  const renderActions = () => {
    switch (ticket?.status) {
      case 'Nouveau':
        return (
          <div className="flex flex-col gap-1.5">
            {(isAdmin || isSupport || isAssigned) ? (
              <Btn onClick={() => handleStatusChange('EnCours')} color="red">
                🚀 Démarrer le ticket
              </Btn>
            ) : (
              <Info color="amber">⏳ En attente de prise en charge</Info>
            )}
            {isReporter && <DangerBtn onClick={handleDeleteTicket}>🗑️ Supprimer le ticket</DangerBtn>}
          </div>
        );

      case 'EnCours':
        return isAssigned || isSupport || isAdmin ? (
          <div className="flex flex-col gap-1.5">
            <Btn onClick={() => handleStatusChange('EnAttente')} color="yellow">
              ⏸️ Mettre en attente
            </Btn>
            <Btn onClick={() => handleStatusChange('Terminé')} color="green">
              ✅ Terminer
            </Btn>
          </div>
        ) : (
          <Info color="red">🔄 En cours de traitement</Info>
        );

      case 'EnAttente':
        return isAssigned || isSupport || isAdmin ? (
          <Btn onClick={() => handleStatusChange('EnCours')} color="red">
            ▶️ Reprendre le ticket
          </Btn>
        ) : (
          <Info color="yellow">⏳ En attente</Info>
        );

      case 'Terminé':
        return <Info color="green">✅ Ticket terminé — aucune action</Info>;

      case 'Deleted':
        return <Info color="gray">🗑️ Ticket supprimé</Info>;

      default:
        return <Info color="gray">Statut inconnu</Info>;
    }
  };

  const transitions = [
    { from: 'Nouveau', to: 'En cours', permission: 'Admin/Support/Assigné', icon: '→', match: ticket?.status === 'Nouveau' },
    { from: 'En cours', to: 'En attente', permission: 'Admin/Support/Assigné', icon: '→', match: ticket?.status === 'EnCours' },
    { from: 'En attente', to: 'En cours', permission: 'Admin/Support/Assigné', icon: '←', match: ticket?.status === 'EnAttente' },
    { from: 'En cours', to: 'Terminé', permission: 'Admin/Support/Assigné', icon: '→', match: ticket?.status === 'EnCours' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/50">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">🎯 Actions</span>
          <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{ticket?.status}</span>
        </div>
        <div className="p-3">{renderActions()}</div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/50">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">📋 Guide des Transitions</span>
        </div>
        <div className="flex flex-col gap-1 p-3">
          {transitions.map((t, i) => (
            <TransRow
              key={i}
              from={t.from}
              to={t.to}
              icon={t.icon}
              permission={t.permission}
              highlight={t.match}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
