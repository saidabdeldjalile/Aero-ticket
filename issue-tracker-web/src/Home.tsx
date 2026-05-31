import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import api from "./api/axios";
import useAuth from "./hooks/useAuth";
import { TicketResponse } from "./TicketResponse";

interface HomeStats {
  totalTickets: number;
  totalProjects: number;
  openTickets: number;
  resolvedTickets: number;
  recentTickets: TicketResponse[];
}

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth?.token) {
      navigate("/login", { replace: true });
      return;
    }

    const fetchStats = async () => {
      try {
        const email = auth?.email;
        const role = auth?.role;
        const departmentId = auth?.departmentId;

        let ticketsPromise;

        if (role === "ADMIN") {
          // Admin: get all tickets
          ticketsPromise = api.get("/tickets", { params: { page: 0, size: 1000 } });
        } else if (role === "SUPPORT" && departmentId) {
          // Support: get tickets assigned to them + department tickets
          ticketsPromise = api.get("/tickets/tickets-for-user", {
            params: { email, role, departmentId, page: 0, size: 1000 },
          });
        } else {
          // Regular user (USER): get their own tickets only
          ticketsPromise = api.get("/tickets/my-tickets", {
            params: { email, page: 0, size: 1000 },
          });
        }

        const [ticketsRes, projectsRes] = await Promise.all([
          ticketsPromise,
          api.get("/projects", { params: { page: 0, size: 6 } }),
        ]);

        const allTickets = ticketsRes.data?.content || [];
  const openTickets = allTickets.filter((t: TicketResponse) =>
    t.status === "Nouveau" || t.status === "EnCours" || t.status === "EnAttente"
  );
  const resolvedTickets = allTickets.filter((t: TicketResponse) =>
    t.status === "Terminé"
  );

        setStats({
          totalTickets: ticketsRes.data?.totalElements || allTickets.length,
          totalProjects: projectsRes.data?.totalElements || projectsRes.data?.length || 0,
          openTickets: openTickets.length,
          resolvedTickets: resolvedTickets.length,
          recentTickets: allTickets.slice(0, 5),
        });
      } catch (err) {
        console.error("Error fetching home stats:", err);
        toast.error(t("common.errors.generic") as string);
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
  }, [auth?.token, auth?.email, auth?.role, auth?.departmentId, navigate, t]);

  if (!auth?.token) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        <p className="text-sm font-medium animate-pulse text-gray-600 dark:text-gray-400">{t('home.loadingHome')}</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Nouveau":
        return { color: "badge-info", label: t('status.open'), icon: "🟢" };
      case "EnCours":
      case "IN_PROGRESS":
        return { color: "badge-warning", label: t('status.inProgress'), icon: "🟡" };
      case "Terminé":
      case "CLOSED":
        return { color: "badge-success", label: t('status.resolved'), icon: "✅" };
      case "EnAttente":
      case "WAITING_FOR_USER":
        return { color: "badge-info", label: "En attente", icon: "⏸️" };
      default:
        return { color: "badge-ghost", label: status, icon: "📋" };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "Critical":
        return { color: "badge-error", label: t('priority.critical'), icon: "🔴" };
      case "High":
        return { color: "badge-error", label: t('priority.high'), icon: "🟠" };
      case "Medium":
        return { color: "badge-warning", label: t('priority.medium'), icon: "🟡" };
      case "Low":
        return { color: "badge-success", label: t('priority.low'), icon: "🟢" };
      default:
        return { color: "badge-ghost", label: priority, icon: "📋" };
    }
  };

  const statCards = [
    {
      key: "totalTickets",
      value: stats?.totalTickets ?? 0,
      icon: "🎫",
      label: t('home.totalTickets'),
      gradient: "from-red-500 to-red-600",
      bgGradient: "from-red-500/10 to-red-600/5",
      delay: "animation-delay-0",
      textColor: "text-gray-900 dark:text-white",
      valueColor: "text-gray-900 dark:text-white"
    },
    {
      key: "openTickets",
      value: stats?.openTickets ?? 0,
      icon: "🔄",
      label: t('home.openTickets'),
      gradient: "from-red-600 to-red-700",
      bgGradient: "from-red-600/10 to-red-700/5",
      delay: "animation-delay-2000",
      textColor: "text-gray-900 dark:text-white",
      valueColor: "text-gray-900 dark:text-white"
    },
    {
      key: "projects",
      value: stats?.totalProjects ?? 0,
      icon: "📁",
      label: t('home.projects'),
      gradient: "from-red-700 to-red-800",
      bgGradient: "from-red-700/10 to-red-800/5",
      delay: "animation-delay-0",
      textColor: "text-gray-900 dark:text-white",
      valueColor: "text-gray-900 dark:text-white"
    },
    {
      key: "resolved",
      value: stats?.resolvedTickets ?? 0,
      icon: "✅",
      label: t('home.resolved'),
      gradient: "from-gray-700 to-gray-800",
      bgGradient: "from-gray-700/10 to-gray-800/5",
      delay: "animation-delay-2000",
      textColor: "text-gray-900 dark:text-white",
      valueColor: "text-gray-900 dark:text-white"
    },
  ];

  const quickActions = [
    {
      to: "/projects",
      icon: "🚀",
      label: t('navbar.projects'),
      desc: t('home.viewProjects'),
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-500/10"
    },
    {
      to: "/my-tickets",
      icon: "🎫",
      label: t('navbar.tickets'),
      desc: t('home.viewTickets'),
      color: "from-red-600 to-red-700",
      bgColor: "bg-red-600/10"
    },
    {
      to: "/notifications",
      icon: "🔔",
      label: t('notifications.title'),
      desc: t('home.viewNotifications'),
      color: "from-red-700 to-red-800",
      bgColor: "bg-red-700/10"
    },
    ...(auth?.role === "ADMIN" ? [{
      to: "/dashboard",
      icon: "📊",
      label: t('navbar.dashboard'),
      desc: t('home.viewDashboard'),
      color: "from-gray-700 to-gray-800",
      bgColor: "bg-gray-500/10"
    }] : []),
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20">
      {/* Hero Section - Modern Red Gradient Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-red-800 shadow-2xl animate-scaleUp">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-red-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-red-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gray-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative p-8 md:p-12">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-sm mb-4 animate-fadeIn">
              ✨ Air Algérie Issue Tracker
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight animate-slideInLeft">
              <span className="block text-white/90 text-lg md:text-xl mb-2">
                {t('home.heroWelcome')}
              </span>
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                {auth?.firstName || auth?.email?.split("@")[0] || t('user.user')} 👋
              </span>
            </h1>
            <p className="mt-4 text-lg text-white/90 max-w-2xl animate-slideInLeft animation-delay-2000">
              {t('home.description')}
            </p>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 animate-fadeIn animation-delay-4000">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/25 hover:bg-white/25 transition-all duration-300">
                <div className="text-2xl mb-1">📊</div>
                <div className="text-2xl font-bold text-white">{stats?.totalTickets ?? 0}</div>
                <div className="text-xs text-white/80">{t('home.totalTickets')}</div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/25 hover:bg-white/25 transition-all duration-300">
                <div className="text-2xl mb-1">🔄</div>
                <div className="text-2xl font-bold text-white">{stats?.openTickets ?? 0}</div>
                <div className="text-xs text-white/80">{t('home.openTickets')}</div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/25 hover:bg-white/25 transition-all duration-300">
                <div className="text-2xl mb-1">✅</div>
                <div className="text-2xl font-bold text-white">{stats?.resolvedTickets ?? 0}</div>
                <div className="text-xs text-white/80">{t('home.resolved')}</div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/25 hover:bg-white/25 transition-all duration-300">
                <div className="text-2xl mb-1">📁</div>
                <div className="text-2xl font-bold text-white">{stats?.totalProjects ?? 0}</div>
                <div className="text-xs text-white/80">{t('home.projects')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer animate-fadeIn ${stat.delay}`}
            style={{ backgroundImage: `linear-gradient(135deg, ${stat.bgGradient})` }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"
              style={{ backgroundImage: `linear-gradient(135deg, ${stat.gradient})` }}></div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-2xl backdrop-blur-sm`}>
                  {stat.icon}
                </div>
                <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded-full">
                  +{Math.floor(Math.random() * 20) + 5}% ↑
                </span>
              </div>
              <div className={`text-3xl font-black ${stat.valueColor}`}>{stat.value}</div>
              <div className={`text-sm mt-1 ${stat.textColor} opacity-70`}>{stat.label}</div>
            </div>
            <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${stat.gradient} w-0 group-hover:w-full transition-all duration-300`}></div>
          </div>
        ))}
      </div>

      {/* Quick Actions Section */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-slideInRight">
        <div className="bg-red-50 dark:bg-red-950/20 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center text-xl">
              ⚡
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('home.quickActions')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('home.welcomeDesc')}</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, idx) => (
              <Link
                key={idx}
                to={action.to}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br p-[1px] transition-all duration-300 hover:scale-105"
                style={{ backgroundImage: `linear-gradient(135deg, ${action.color})` }}
              >
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 h-full transition-all duration-300 group-hover:bg-opacity-90">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${action.bgColor} flex items-center justify-center text-xl transition-transform group-hover:scale-110`}>
                      {action.icon}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">{action.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{action.desc}</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Tickets Section */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-slideInLeft">
        <div className="bg-red-50 dark:bg-red-950/20 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center text-xl">
                🎫
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('home.recentTickets')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('home.recentTicketsDesc')}</p>
              </div>
            </div>
            <Link to="/my-tickets" className="btn btn-primary btn-sm gap-2">
              {t('home.viewAll')}
              <span>→</span>
            </Link>
          </div>
        </div>
        <div className="p-6">
          {stats?.recentTickets && stats.recentTickets.length > 0 ? (
            <div className="space-y-3">
              {stats.recentTickets.map((ticket, idx) => {
                const status = getStatusBadge(ticket.status);
                const priority = getPriorityBadge(ticket.priority);
                return (
                  <Link
                    key={ticket.id}
                    to={`/tickets/${ticket.id}`}
                    className="group block transition-all duration-300 hover:translate-x-1 animate-fadeIn"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="bg-gray-50 dark:bg-gray-800/50 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700 transition-all">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center text-lg font-bold text-red-600 dark:text-red-400">
                            #{ticket.id}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white">{ticket.title}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {ticket.project?.name || t('home.noProject')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className={`badge ${status.color} gap-1`}>
                              <span>{status.icon}</span> {status.label}
                            </span>
                            <span className={`badge ${priority.color} gap-1`}>
                              <span>{priority.icon}</span> {priority.label}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-5xl mb-4 animate-pulse">
                📭
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{t('home.noTickets')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {t('home.noTicketsDesc')}
              </p>
              <Link to="/projects" className="btn btn-primary mt-6">
                {t('home.viewProjects')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Tips & Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tips Section */}
        <div className="bg-red-50 dark:bg-red-950/20 rounded-3xl p-6 border border-red-200 dark:border-red-900 animate-slideInLeft">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-2xl animate-bounce">
              💡
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">{t('home.tipOfDay')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {t('home.tipDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Activity Insights */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 animate-slideInRight">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-500/20 flex items-center justify-center text-2xl">
              📈
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">{t('home.yourActivity')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1" dangerouslySetInnerHTML={{
                __html: t('home.activityDesc', { open: stats?.openTickets ?? 0, resolved: stats?.resolvedTickets ?? 0 })
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}