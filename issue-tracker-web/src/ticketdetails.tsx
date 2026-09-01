import { useEffect, useMemo, useState } from "react";
import { TicketResponse, User, Project } from "./TicketResponse";
import api from "./api/axios";
import { AxiosResponse } from "axios";
import { toast } from "react-toastify";
import useAuth from "./hooks/useAuth";
import { TicketActions } from "./components/ticket/TicketActions";
import {
  Building2,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  Flag,
  FolderTree,
  GitBranch,
  Layers,
  Mail,
  Shield,
  User as UserIcon,
  UserCheck,
} from "lucide-react";

type TicketBodyProps = {
  ticket: TicketResponse | null | undefined;
};

const STATUS_MAP: Record<string, { label: string; accent: string; dot: string }> = {
  Nouveau: { label: "Nouveau", accent: "#D2122E", dot: "bg-red-600" },
  EnCours: { label: "En cours", accent: "#F97316", dot: "bg-orange-400" },
  EnAttente: { label: "En attente", accent: "#EAB308", dot: "bg-yellow-400" },
  Terminé: { label: "Terminé", accent: "#22C55E", dot: "bg-green-400" },
};

const PRIORITY_MAP: Record<string, { label: string; emoji: string; bar: string }> = {
  Critical: { label: "Critique", emoji: "🔴", bar: "bg-red-500" },
  High: { label: "Haute", emoji: "🟠", bar: "bg-orange-400" },
  Medium: { label: "Moyenne", emoji: "🟡", bar: "bg-yellow-400" },
  Low: { label: "Basse", emoji: "🟢", bar: "bg-green-500" },
};

const PRIORITY_ORDER = ["Critical", "High", "Medium", "Low"];

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 w-24 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{value}</span>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  accentColor,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm h-full flex flex-col">
      <div className="h-0.5 w-full flex-shrink-0" style={{ background: accentColor }} />
      <div className="px-4 py-3 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: accentColor }}>{icon}</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            {title}
          </h3>
        </div>
        {children}
      </div>
    </div>
  );
}

export function TicketDetails({ ticket }: TicketBodyProps) {
  const { auth } = useAuth();
  const [priority, setPriority] = useState(ticket?.priority ?? "Medium");
  const [assigned, setAssigned] = useState(ticket?.assigned?.email ?? "");
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(ticket?.project?.id ?? null);

  useEffect(() => {
    api.get("/users").then((res: AxiosResponse) => {
      const data = res.data?.content || res.data || [];
      setUsers(Array.isArray(data) ? data : []);
    });
    api.get("/projects").then((res: AxiosResponse) => {
      const data = res.data?.content || res.data || [];
      setProjects(Array.isArray(data) ? data : []);
    });
  }, []);

  useEffect(() => {
    setSelectedProjectId(ticket?.project?.id ?? null);
  }, [ticket?.project?.id]);

  useEffect(() => {
    setPriority(ticket?.priority ?? "Medium");
    setAssigned(ticket?.assigned?.email ?? "");
  }, [ticket?.priority, ticket?.assigned?.email]);

  const status = useMemo(() => {
    const s = ticket?.status || "Nouveau";
    return STATUS_MAP[s] || STATUS_MAP.Nouveau;
  }, [ticket?.status]);

  const prio = useMemo(() => {
    const p = priority || ticket?.priority || "Medium";
    return PRIORITY_MAP[p] || PRIORITY_MAP.Medium;
  }, [priority, ticket?.priority]);

  const canEditAssignee = auth?.role === "ADMIN" || auth?.role === "SUPPORT";
  const canEditPriority = auth?.role === "ADMIN" || auth?.role === "SUPPORT" || auth?.email === assigned;

  const assignee = useMemo(() => users.find((u) => u.email === assigned) || ticket?.assigned, [users, assigned, ticket?.assigned]);

  const formattedDate = (date: string | undefined) =>
    date
      ? new Date(date).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      : "—";

  function updateAssigned(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setAssigned(next);
    api
      .post(`/tickets/${ticket?.id}/assign`, { email: next })
      .then(() => toast.success(`Ticket #${ticket?.id} assigné avec succès`))
      .catch((err) => {
        const errorMessage = err.response?.data?.message || err.message || "Erreur lors de l'assignation";
        toast.error(errorMessage);
      });
  }

  function persistPriority(newPriority: string) {
    setPriority(newPriority);
    api
      .patch(`/tickets/${ticket?.id}`, {
        priority: newPriority,
        modifierEmail: auth?.email,
        modifierRole: auth?.role,
      })
      .then(() => toast.success(`Priorité du ticket #${ticket?.id} mise à jour`))
      .catch((err) => {
        const errorMessage = err.response?.data?.message || err.message || "Erreur lors de la mise à jour";
        toast.error(errorMessage);
      });
  }

   function persistProjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
     const newProjectId = e.target.value ? Number(e.target.value) : null;
     setSelectedProjectId(newProjectId);
     api
       .patch(`/tickets/${ticket?.id}`, {
         projectId: newProjectId,
         modifierEmail: auth?.email,
         modifierRole: auth?.role,
       })
       .then(() => toast.success(`Projet du ticket #${ticket?.id} mis à jour`))
       .catch((err) => {
         const errorMessage = err.response?.data?.message || err.message || "Erreur lors du changement de projet";
         toast.error(errorMessage);
         setSelectedProjectId(ticket?.project?.id ?? null); // revert on error
       });
   }

  return (
    <div className="h-full w-full overflow-hidden">
      <div className="h-full grid grid-rows-[auto_1fr] gap-4">
        {/* Header */}
        <div className="flex-shrink-0">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
            <div className="h-1 w-full" style={{ background: status.accent }} />
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-gray-400 dark:text-gray-500">
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md text-gray-600 dark:text-gray-300 select-all">
                  #{ticket?.id}
                </span>
                <span>/</span>
                <span className="flex items-center gap-1">
                  <FolderTree className="w-3 h-3" />
                  {ticket?.category ?? "Non catégorisé"}
                </span>
                <span>/</span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {ticket?.project?.name ?? "N/A"}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-white leading-snug break-words">
                  {ticket?.title ?? "Sans titre"}
                </h1>

                <div className="flex flex-wrap gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
                    style={{
                      color: status.accent,
                      borderColor: status.accent + "44",
                      background: status.accent + "12",
                    }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${status.dot}`} />
                    {status.label}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                    {prio.emoji} {prio.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main + Sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4 min-h-0">
          {/* Main cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 min-h-0">
            <SectionCard title="Assignation" icon={<UserCheck className="w-4 h-4" />} accentColor="#D2122E">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {ticket?.created?.firstName?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest">Reporté par</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {ticket?.created?.firstName} {ticket?.created?.lastname}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{ticket?.created?.email}</p>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Assigné à</p>
                {canEditAssignee ? (
                  <div className="relative">
                    <select
                      value={assigned}
                      onChange={updateAssigned}
                      className="w-full appearance-none px-3 py-2 pr-8 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">— Non assigné —</option>
                      {users.map((u) => (
                        <option key={u.email} value={u.email}>
                          {u.firstName} {u.lastname} ({u.email})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs">
                      {assignee?.firstName?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {assignee ? `${assignee.firstName} ${assignee.lastname}` : "Non assigné"}
                      </p>
                      {assignee?.email && <p className="text-xs text-gray-400">{assignee.email}</p>}
                    </div>
                  </div>
                )}
                {!canEditAssignee && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Réservé à l'administrateur / support
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Priorité" icon={<Flag className="w-4 h-4" />} accentColor="#EF4444">
              {canEditPriority ? (
                <div className="space-y-1.5">
                  {PRIORITY_ORDER.map((p) => {
                    const cfg = PRIORITY_MAP[p];
                    const active = priority === p;
                    return (
                      <button
                        key={p}
                        onClick={() => persistPriority(p)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${active
                          ? "border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                          : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          }`}
                      >
                        <span className={`w-2 h-5 rounded-full flex-shrink-0 ${cfg.bar} ${active ? "opacity-100" : "opacity-30"}`} />
                        <span>{cfg.emoji}</span>
                        <span>{cfg.label}</span>
                        {active && <span className="ml-auto text-xs font-semibold text-gray-400">Actuel</span>}
                      </button>
                    );
                  })}
                  <p className="pt-1 text-xs text-gray-400 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-blue-500" /> Accessible si admin, support ou assigné
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-3 gap-2">
                  <span className="text-3xl">{prio.emoji}</span>
                  <span className="text-base font-extrabold text-gray-800 dark:text-gray-200">{prio.label}</span>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${prio.bar}`}
                      style={{ width: `${((4 - PRIORITY_ORDER.indexOf(priority)) / 4) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Admin, support ou assigné uniquement
                  </p>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Informations" icon={<Layers className="w-4 h-4" />} accentColor="#DC2626">
              <MetaRow icon={<Calendar className="w-4 h-4" />} label="Créé le" value={formattedDate(ticket?.createdAt)} />
              <MetaRow icon={<Clock className="w-4 h-4" />} label="Modifié" value={formattedDate(ticket?.modifiedAt)} />
              <MetaRow icon={<Building2 className="w-4 h-4" />} label="Dépt." value={ticket?.project?.departmentName ?? "—"} />
              <MetaRow icon={<GitBranch className="w-4 h-4" />} label="Projet" value={
                canEditAssignee ? (
                  <select
                    value={selectedProjectId ?? ""}
                    onChange={persistProjectChange}
                    className="w-full appearance-none px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value="">— Sans projet —</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  ticket?.project?.name ?? "—"
                )
              } />
              <MetaRow icon={<FolderTree className="w-4 h-4" />} label="Catégorie" value={ticket?.category ?? "—"} />
              <MetaRow icon={<GitBranch className="w-4 h-4" />} label="Type" value={ticket?.issueType ?? "—"} />
            </SectionCard>
          </div>

          {/* Sidebar: actions + permissions + guide */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
              <div className="h-0.5 w-full" style={{ background: status.accent }} />
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4" style={{ color: status.accent }} />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    Actions
                  </h3>
                </div>
                <TicketActions ticket={ticket} onUpdate={() => { }} />
              </div>
            </div>

            <SectionCard title="Vos permissions" icon={<Shield className="w-4 h-4" />} accentColor="#0EA5E9">
              <MetaRow icon={<UserIcon className="w-4 h-4" />} label="Rôle" value={auth?.role ?? "—"} />
              <MetaRow icon={<Mail className="w-4 h-4" />} label="Email" value={auth?.email ?? "—"} />
              <MetaRow icon={<UserCheck className="w-4 h-4" />} label="Assign." value={canEditAssignee ? "Oui" : "Non"} />
              <MetaRow icon={<Flag className="w-4 h-4" />} label="Priorité" value={canEditPriority ? "Oui" : "Non"} />
            </SectionCard>

            <SectionCard title="Guide de transition" icon={<GitBranch className="w-4 h-4" />} accentColor="#10B981">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <span className="font-semibold">Nouveau</span> → validation (
                    <span className="font-semibold">EnCours</span>) — Admin / Support
                  </li>
                  <li>
                    <span className="font-semibold">Nouveau</span> → supprimer — Reporter
                  </li>
                  <li>
                    <span className="font-semibold">EnCours</span> → attente user / terminé
                  </li>
                  <li>
                    <span className="font-semibold">EnAttente</span> → retour (
                    <span className="font-semibold">EnCours</span>)
                  </li>
                  <li>
                    <span className="font-semibold">Terminé</span> → terminé
                  </li>
                </ul>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}