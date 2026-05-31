import React from "react";
import { DashboardStats } from "../../types/dashboard";

interface StatsCardsProps {
  stats: DashboardStats;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const statCards = [
    {
      title: "Total Tickets",
      value: stats.totalTickets,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
      ),
      color: "from-blue-500 to-cyan-400",
      change: "+12.5%"
    },
    {
      title: "Open Tickets",
      value: stats.openTickets,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      ),
      color: "from-amber-400 to-orange-500",
      change: "+2.3%"
    },
    {
      title: "Résolus",
      value: stats.closedTickets,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      ),
      color: "from-emerald-400 to-green-500",
      change: "+8.7%"
    },
    {
      title: "In Progress",
      value: stats.inProgressTickets,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
      ),
      color: "from-indigo-500 to-purple-500",
      change: "-1.2%"
    },
    {
      title: "Total Projects",
      value: stats.totalProjects,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
      ),
      color: "from-pink-500 to-rose-500",
      change: "+5.1%"
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
      ),
      color: "from-violet-500 to-fuchsia-500",
      change: "+3.4%"
    },
    {
      title: "Departments",
      value: stats.totalDepartments,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
      ),
      color: "from-teal-400 to-emerald-500",
      change: "0%"
    },
    {
      title: "Avg Resolution Time",
      value: `${stats.averageResolutionTime}d`,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      ),
      color: "from-cyan-500 to-blue-500",
      change: "-0.5d"
    }
  ];

   return (
     <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
       {statCards.map((card, index) => (
         <div 
           key={index} 
           className="relative overflow-hidden rounded-2xl border border-base-300/60 bg-base-100/80 p-6 shadow-sm backdrop-blur-xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
         >
           <div className={`absolute top-0 right-0 h-32 w-32 -mr-8 -mt-8 rounded-full bg-gradient-to-br ${card.color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-300`}></div>
           <div className="flex items-center justify-between relative z-10">
             <div className="flex flex-col gap-4">
               <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${card.color} text-white shadow-lg shadow-${card.color.split('-')[1]}-500/30 transform group-hover:scale-110 transition-transform duration-300`}>
                 {card.icon}
               </div>
               <div>
                 <h3 className="text-sm font-semibold text-base-content/60 tracking-wider uppercase">{card.title}</h3>
                 <div className="flex items-baseline gap-2 mt-1">
                   <p className="text-3xl font-black text-base-content tracking-tight">{card.value}</p>
                 </div>
               </div>
             </div>
             <div className="flex flex-col items-end h-full justify-start self-start">
               <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${card.change.startsWith('+') ? 'bg-success/10 text-success' : card.change.startsWith('-') ? 'bg-error/10 text-error' : 'bg-base-300/50 text-base-content/60'}`}>
                 {card.change}
               </div>
             </div>
           </div>
         </div>
       ))}
     </div>
   );
 };

export default StatsCards;