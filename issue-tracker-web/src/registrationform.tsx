import axios from "axios";
import config from "./config";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, User, Mail, Lock, Briefcase, ArrowRight, CheckCircle } from "lucide-react";

function Registrationform() {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${config.authUrl}/register`, {
        firstName: firstName,
        lastName: lastName,
        password: password,
        email: email,
        role: "USER",
        registrationNumber: registrationNumber,
      });
      toast.success(t('common.message.success'));
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (error) {
      toast.error(t('common.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 25;
    if (password.length < 8) return 50;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return 75;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) return 100;
    return 50;
  };

  const strengthColor = () => {
    const strength = passwordStrength();
    if (strength <= 25) return "bg-red-500";
    if (strength <= 50) return "bg-orange-500";
    if (strength <= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-red-950 to-gray-900">
        <div className="absolute inset-0 bg-[url('/images/GFC-login-background.jpg')] bg-cover bg-center opacity-10"></div>

        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]"></div>

        {/* Floating Red Particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-900 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl animate-scaleUp">
          <div className="grid lg:grid-cols-2 gap-0 bg-white/5 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-white/10">

            {/* Left Side - Brand Section */}
            <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-red-600/20 via-red-800/10 to-gray-900/40 relative overflow-hidden">
              <div className="relative z-10">
                <div className="mb-12">
                  <div className="bg-white rounded-2xl p-4 inline-block shadow-lg">
                    <img
                      src="/images/air-algerie-logo.png"
                      alt="Air Algeria Logo"
                      className="h-14 w-auto object-contain"
                    />
                  </div>
                </div>

                <h2 className="text-4xl font-black text-white mb-4">
                  Bienvenue sur<br />
                  <span className="text-red-500">
                    Issue Tracker
                  </span>
                </h2>

                <p className="text-white/70 text-lg mb-8 leading-relaxed">
                  La plateforme moderne de gestion d'incidents et de suivi de projets pour Air Algérie.
                </p>

                <div className="space-y-4">
                  {[
                    "Suivi en temps réel des tickets",
                    "Gestion collaborative des projets",
                    "Tableaux de bord personnalisés",
                    "Notifications intelligentes"
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-white/80">
                      <CheckCircle className="w-5 h-5 text-red-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 mt-12">
                <p className="text-white/40 text-[10px] uppercase tracking-widest">
                  © 2024 Air Algérie Issue Tracker
                </p>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-red-600 rounded-full blur-3xl opacity-20"></div>
            </div>

            {/* Right Side - Registration Form */}
            <div className="p-8 lg:p-12 bg-white dark:bg-gray-900">
              <div className="mb-8 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full bg-red-600/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-red-600 dark:text-red-400 mb-4">
                  ✨ Créer un compte
                </div>
                <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                  Inscription
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Remplissez le formulaire ci-dessous pour créer votre compte Air Algérie
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name Fields Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'firstName' || firstName ? 'text-red-600' : 'text-gray-400'}`}>
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Prénom"
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition-all"
                      value={firstName}
                      onFocus={() => setFocusedField('firstName')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="relative">
                    <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'lastName' || lastName ? 'text-red-600' : 'text-gray-400'}`}>
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Nom"
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition-all"
                      value={lastName}
                      onFocus={() => setFocusedField('lastName')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Matricule Field */}
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'matricule' || registrationNumber ? 'text-red-600' : 'text-gray-400'}`}>
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Matricule"
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition-all"
                    value={registrationNumber}
                    onFocus={() => setFocusedField('matricule')}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    required
                  />
                </div>

                {/* Email Field */}
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'email' || email ? 'text-red-600' : 'text-gray-400'}`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    placeholder="Email professionnel"
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition-all"
                    value={email}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Password Field with Strength Meter */}
                <div className="space-y-2">
                  <div className="relative">
                    <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'password' || password ? 'text-red-600' : 'text-gray-400'}`}>
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Mot de passe"
                      className="w-full h-12 pl-10 pr-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition-all"
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
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {password.length > 0 && (
                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${strengthColor()} transition-all duration-300 rounded-full`}
                          style={{ width: `${passwordStrength()}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {passwordStrength() <= 25 && "Mot de passe faible"}
                        {passwordStrength() > 25 && passwordStrength() <= 50 && "Mot de passe moyen"}
                        {passwordStrength() > 50 && passwordStrength() <= 75 && "Mot de passe fort"}
                        {passwordStrength() > 75 && "Mot de passe très fort"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-[1.01] shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Création en cours...
                    </>
                  ) : (
                    <>
                      Créer mon compte
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white dark:bg-gray-900 text-gray-400">Déjà inscrit ?</span>
                  </div>
                </div>

                {/* Login Link */}
                <div className="text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-700 font-semibold transition-colors"
                  >
                    Se connecter
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
}

export default Registrationform;