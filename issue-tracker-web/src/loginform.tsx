import axios from "axios";
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "./hooks/useAuth.js";
import { toast } from "react-toastify";
import config from "./config";
import { useTranslation } from "react-i18next";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Shield,
  Zap,
  Users,
  ArrowRight
} from "lucide-react";

function Loginform() {
  const { setAuth } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/projects";

  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error(t('login.errors.validEmail'));
      setIsSubmitting(false);
      return;
    }

    if (password.length < 3) {
      toast.error(t('login.errors.passwordLength'));
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await axios.post(
        `${config.authUrl}/login`,
        { email, password, rememberMe },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        }
      );

      if (!res.data || !res.data.token) {
        throw new Error("Invalid response from server - missing token");
      }

      const token = res.data.token as string;
      const role = res.data.role ? String(res.data.role) : null;
      const departmentId = res.data.departmentId as number | null;
      const firstName = res.data.firstName as string | undefined;
      const lastName = res.data.lastName as string | undefined;

      localStorage.setItem("token", token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          email,
          role,
          departmentId,
          firstName,
          lastName,
        })
      );

      setAuth({ email, token, role, departmentId, firstName, lastName });

      setPassword("");
      setEmail("");
      setRememberMe(false);

      toast.success("Connexion réussie !");
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error("❌ Login error:", err);

      if (err.code === "ERR_NETWORK" || err.message.includes("Backend not reachable")) {
        toast.error(t('login.errors.serverError'));
      } else if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
        toast.error(t('login.errors.timeout'));
      } else if (err.response) {
        if (err.response.status === 401) {
          toast.error(t('login.errors.invalidCredentials'));
        } else if (err.response.status === 403) {
          toast.error(t('login.errors.forbidden'));
        } else if (err.response.status === 404) {
          toast.error(t('login.errors.notFound'));
        } else if (err.response.status >= 500) {
          toast.error(t('login.errors.serverError500'));
        } else {
          toast.error(`Login failed: ${err.response.data?.error || "Server error"}`);
        }
      } else if (err.request) {
        toast.error(t('login.errors.networkError'));
      } else {
        toast.error(t('login.errors.unexpected', { message: err.message }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-red-950 to-gray-900">
        <div className="absolute inset-0 bg-[url('/images/GFC-login-background.jpg')] bg-cover bg-center opacity-10"></div>

        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]"></div>

        {/* Floating Red Particles / Blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-red-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-red-900 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl animate-scaleUp">
          <div className="grid lg:grid-cols-2 gap-0 bg-white/5 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-white/20">

            {/* Left Side - Brand Section with Animation */}
            <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-red-600/20 via-red-800/10 to-gray-900/40 relative overflow-hidden">
              <div className="relative z-10 animate-slideInRight">
                {/* Logo */}
                <div className="mb-10">
                  <div className="bg-white rounded-2xl p-4 inline-block shadow-lg">
                    <img
                      src="/images/lg.png"
                      alt="Air Algeria Logo"
                      className="h-14 w-auto object-contain"
                    />
                  </div>
                </div>

                {/* Tagline */}
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-red-600/20 backdrop-blur-sm px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-red-100 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse"></span>
                    Air Algérie Issue Tracker
                  </div>
                </div>

                <h2 className="text-4xl font-black text-white mb-4 leading-tight">
                  Gérez vos incidents<br />
                  <span className="text-red-500">
                    en toute sécurité
                  </span>
                </h2>

                <p className="text-white/70 text-base leading-relaxed mb-8">
                  Une plateforme centralisée pour suivre, prioriser et résoudre
                  l'ensemble de vos tickets techniques et demandes avec Air Algérie.
                </p>

                {/* Stats Section */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">99.9%</div>
                    <div className="text-xs text-white/60">Disponibilité</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">24/7</div>
                    <div className="text-xs text-white/60">Support</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">500+</div>
                    <div className="text-xs text-white/60">Projets</div>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-3">
                  {[
                    { icon: Zap, text: "Résolution rapide des incidents", color: "text-red-400" },
                    { icon: Shield, text: "Sécurité et conformité assurées", color: "text-red-500" },
                    { icon: Users, text: "Collaboration en temps réel", color: "text-gray-400" }
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-white/80 text-sm">
                      <feature.icon className={`w-4 h-4 ${feature.color}`} />
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="relative z-10 mt-8 pt-8 border-t border-white/10">
                <p className="text-white/40 text-[10px] text-center uppercase tracking-widest">
                  © 2026 Air Algérie Issue Tracker
                </p>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-gradient-to-br from-red-500 to-red-800 rounded-full blur-3xl opacity-30"></div>
              <div className="absolute top-1/2 -left-20 w-48 h-48 bg-red-600 rounded-full blur-3xl opacity-20"></div>
            </div>

            {/* Right Side - Login Form */}
            <div className="p-8 lg:p-10 bg-white dark:bg-gray-900">
              <div className="mb-8 text-center lg:text-left">
                <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                  Connexion
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Accédez à votre espace de travail
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'email' || email ? 'text-red-600' : 'text-gray-400'}`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    placeholder="Adresse email"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition-all"
                    value={email}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Password Field */}
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'password' || password ? 'text-red-600' : 'text-gray-400'}`}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mot de passe"
                    className="w-full h-12 pl-11 pr-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition-all"
                    value={password}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-600"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Se souvenir de moi</span>
                  </label>
                  <a href="/forgot-password" className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors">
                    Mot de passe oublié ?
                  </a>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-[1.01] shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Connexion en cours...
                    </>
                  ) : (
                    <>
                      Se connecter
                      <LogIn className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white dark:bg-gray-900 text-gray-400">Nouveau utilisateur ?</span>
                  </div>
                </div>

                {/* Register Link */}
                <div className="text-center">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-700 font-semibold transition-colors group"
                  >
                    Créer un compte
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Demo Credentials */}
                <div className="mt-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-2">
                    🔐 Compte de démonstration
                  </p>
                  <div className="text-xs text-gray-400 dark:text-gray-500 text-center space-y-1">
                    <p>Email: admin@airalgerie.dz</p>
                    <p>Mot de passe: admin123</p>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Loginform;