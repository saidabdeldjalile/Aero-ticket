import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import NotificationBell from "./NotificationBell";
import LanguageSelector from "./LanguageSelector";
import ChatBot from "./ChatBot";
import { useTranslation } from "react-i18next";
import {
  Briefcase,
  Ticket,
  BookOpen,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  Sun,
  Moon,
  UserCircle,
  MessageSquare,
  Building
} from "lucide-react";

export default function NavBar() {
  const { auth, setAuth } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isChatBotOpen, setIsChatBotOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isAuthenticated = Boolean(auth?.token);

  // Detect scroll for navbar background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const theme = html.getAttribute("data-theme") || "light";
    setIsDarkTheme(theme === "dark");
  }, []);

  const handleThemeToggle = () => {
    const html = document.documentElement;
    const newTheme = isDarkTheme ? "light" : "dark";
    html.setAttribute("data-theme", newTheme);
    setIsDarkTheme(!isDarkTheme);
  };

  const handleLogout = () => {
    setAuth({});
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsDropdownOpen(false);
    navigate("/login");
  };

  const navigationItems = useMemo(
    () => [
      { label: t('navbar.dashboard'), to: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN"] },
      { label: t('navbar.services'), to: "/departments", icon: Building, roles: ["ADMIN"] },
      { label: t('navbar.projects'), to: "/projects", icon: Briefcase, roles: ["ADMIN", "SUPPORT", "USER"] },
      { label: t('navbar.tickets'), to: "/my-tickets", icon: Ticket, roles: ["ADMIN", "SUPPORT", "USER"] },
      { label: t('navbar.knowledge'), to: "/knowledge", icon: BookOpen, roles: ["ADMIN", "SUPPORT"] },
      { label: t('navbar.users'), to: "/users", icon: Users, roles: ["ADMIN"] },
    ],
    [t]
  );

  const accessibleNavItems = navigationItems.filter(
    (item) => !item.roles || item.roles.includes(auth?.role || "")
  );

  const userInitials = `${auth?.firstName?.charAt(0) || ''}${auth?.lastName?.charAt(0) || ''}`;

  return (
    <>
      {/* Navbar */}
      <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-2' : 'py-3'}`}>
        <div className="max-w-[1600px] mx-auto px-4">
          <div className={`
            relative rounded-2xl transition-all duration-300
            ${scrolled
              ? 'bg-white/95 dark:bg-gray-900/95 shadow-xl border border-white/20 dark:border-gray-700/50'
              : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 shadow-lg'
            }
          `}>
            <div className="flex items-center justify-between px-4 py-2 lg:px-6">
              {/* Logo Section */}
              <div className="flex items-center gap-3">
                <Link to="/" className="group relative flex items-center gap-3">
                  {/* Animated red orb behind logo */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-red-700 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500"></div>

                  <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md border border-red-100">
                    <img src="/images/air-algerie.png" alt="Air Algérie" className="h-8 w-8 object-contain" />
                  </div>

                  <div className="hidden flex-col leading-tight sm:flex">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Air Algérie</span>
                    <span className="text-lg font-black tracking-tighter text-gray-900 dark:text-white">
                      ISSUE TRACKER
                    </span>
                  </div>
                </Link>

                {/* Desktop Navigation */}
                {isAuthenticated && (
                  <div className="hidden lg:flex items-center gap-1 ml-4">
                    {accessibleNavItems.map((item) => {
                      const isActive = location.pathname === item.to ||
                        (item.to === "/my-tickets" && location.pathname.startsWith("/tickets"));
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`
                            relative flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-300
                            ${isActive
                              ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10'
                              : 'text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
                            }
                          `}
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                          {isActive && (
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-red-600 rounded-full"></div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Section */}
              <div className="flex items-center gap-2">
                <LanguageSelector />

                {/* Theme Toggle */}
                <button
                  onClick={handleThemeToggle}
                  className="relative h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 flex items-center justify-center group"
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500 to-red-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                  {isDarkTheme ? (
                    <Sun className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  )}
                </button>

                {isAuthenticated ? (
                  <>
                    {/* Notification Bell */}
                    <div className="relative">
                      <NotificationBell />
                    </div>

                    {/* Chat Bot Button */}
                    <button
                      onClick={() => setIsChatBotOpen(true)}
                      className="relative h-10 w-10 rounded-xl bg-red-600 hover:bg-red-700 transition-all duration-300 flex items-center justify-center group shadow-md"
                    >
                      <MessageSquare className="w-5 h-5 text-white" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
                    </button>

                    {/* User Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 group"
                      >
                        <div className="relative">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-sm font-bold text-white shadow-md">
                            {userInitials || <UserCircle className="w-5 h-5" />}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                        </div>

                        <div className="hidden text-left lg:block">
                          <div className="text-sm font-bold text-red-600 dark:text-red-400">
                            {auth?.firstName} {auth?.lastName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {auth?.role === "ADMIN" ? t('user.admin') : auth?.role === "SUPPORT" ? t('user.support') : t('user.user')}
                          </div>
                        </div>

                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu */}
                      {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden animate-fadeIn">
                          {/* User Info Header */}
                          <div className="p-4 bg-red-50 dark:bg-red-500/5 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 text-lg font-bold text-white">
                                {userInitials}
                              </div>
                              <div>
                                <div className="font-bold text-red-600 dark:text-red-400">
                                  {auth?.firstName} {auth?.lastName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{auth?.email}</div>
                              </div>
                            </div>
                          </div>

                          {/* Menu Items */}
                          <div className="p-2">
                            <Link
                              to="/settings"
                              onClick={() => setIsDropdownOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500">
                                <Settings className="w-4 h-4" />
                              </div>
                              <span className="font-medium">{t('navbar.settings')}</span>
                            </Link>

                            <button
                              onClick={handleLogout}
                              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600">
                                <LogOut className="w-4 h-4" />
                              </div>
                              <span className="font-medium">{t('navbar.logout')}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                      className="lg:hidden relative h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 flex items-center justify-center"
                      onClick={() => setIsDrawerOpen(true)}
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-800 text-white font-semibold hover:from-red-700 hover:to-red-900 transition-all duration-300 shadow-md"
                  >
                    {t('auth.login')}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-[60] transition-all duration-300 ${isDrawerOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsDrawerOpen(false)}
        ></div>

        {/* Drawer Panel */}
        <div className={`absolute right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl transition-all duration-300 transform ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          {/* Drawer Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-red-100">
                  <img src="/images/Logo_Air_Algérie.png" alt="Air Algérie" className="h-7 w-7 object-contain" />
                </div>
                <span className="font-black text-lg text-gray-900 dark:text-white">
                  ISSUE TRACKER
                </span>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Info in Drawer */}
            {isAuthenticated && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 dark:bg-gray-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white font-bold">
                  {userInitials}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {auth?.firstName} {auth?.lastName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{auth?.email}</div>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Menu */}
          <div className="p-4">
            <div className="space-y-1">
              {accessibleNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsDrawerOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${location.pathname === item.to
                    ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              ))}

              <div className="h-px bg-gray-200 dark:bg-gray-700 my-3"></div>

              <Link
                to="/settings"
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
              >
                <Settings className="w-4 h-4" />
                <span>{t('navbar.settings')}</span>
              </Link>

              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('navbar.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Bot */}
      {isChatBotOpen && <ChatBot onClose={() => setIsChatBotOpen(false)} />}
    </>
  );
}