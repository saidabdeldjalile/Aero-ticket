import { useEffect, useState, type FormEvent } from "react";
import axios from "./api/axios";
import useAuth from "./hooks/useAuth";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import {
  User,
  Mail,
  Save,
  Shield,
  Globe,
  Fingerprint,
  Key,
  UserCircle,
  CheckCircle,
  Lock,
  Settings as SettingsIcon
} from "lucide-react";

interface UserProfile {
  email: string;
  firstName: string;
  lastName: string;
}

const EMPTY_PROFILE: UserProfile = {
  email: "",
  firstName: "",
  lastName: "",
};

export default function Settings() {
  const { auth } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  useEffect(() => {
    const userStr = localStorage.getItem("user");

    if (userStr) {
      try {
        const user = JSON.parse(userStr) as Partial<UserProfile>;
        setProfile({
          email: user.email || "",
          firstName: user.firstName || "",
          lastName: user.lastName || "",
        });
      } catch (error) {
        console.error("Error parsing user:", error);
      }
    }

    setLoading(false);
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password && password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setSaving(true);

    try {
      await axios.put(
        "/users/profile",
        {
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          currentPassword: currentPassword || undefined,
          password: password || undefined,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth?.token}`,
          },
        }
      );

      localStorage.setItem(
        "user",
        JSON.stringify({
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          role: auth?.role,
        })
      );

      toast.success("Profil mis à jour avec succès");
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      if (error?.response?.status === 401) {
        toast.error("Mot de passe actuel incorrect");
      } else if (error?.response?.status === 400) {
        toast.error("Veuillez fournir votre mot de passe actuel");
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm font-medium animate-pulse text-gray-600 dark:text-gray-400">
          Chargement de vos paramètres...
        </p>
      </div>
    );
  }

  const userInitials = `${profile.firstName?.charAt(0) || ''}${profile.lastName?.charAt(0) || ''}`;

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 via-red-800 to-gray-800 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-sm mb-3">
                <SettingsIcon className="w-3 h-3" />
                {t('settings.profile')}
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                {t('settings.title')}
              </h1>
              <p className="text-white/80 mt-1">
                {t('settings.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2">
                <div className="text-xs text-white/70">Rôle</div>
                <div className="font-semibold text-white">
                  {auth?.role === "ADMIN" ? "Administrateur" : auth?.role === "SUPPORT" ? "Support" : "Utilisateur"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 text-center">
              <div className="relative inline-block">
                <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                  {userInitials || <UserCircle className="w-12 h-12" />}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-white dark:border-gray-900"></div>
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
                {profile.firstName} {profile.lastName}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
              <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold">
                <Shield className="w-3 h-3" />
                {auth?.role === "ADMIN" ? "Accès complet" : "Accès utilisateur"}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-2">
              <button
                onClick={() => setActiveTab("profile")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === "profile"
                  ? "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-gray-900/30 text-red-600 dark:text-red-400"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
              >
                <User className="w-4 h-4" />
                <span className="font-medium">Informations personnelles</span>
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === "security"
                  ? "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-gray-900/30 text-red-600 dark:text-red-400"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
              >
                <Lock className="w-4 h-4" />
                <span className="font-medium">Sécurité</span>
              </button>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-br from-red-50 via-red-100 to-gray-50 dark:from-red-950/20 dark:via-gray-900/20 dark:to-gray-950/20 rounded-2xl p-6 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">Sécurité renforcée</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Votre compte est protégé par chiffrement AES-256
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="lg:col-span-9">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 p-6 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {activeTab === "profile" ? "Informations personnelles" : "Sécurité du compte"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {activeTab === "profile"
                  ? "Modifiez vos informations personnelles"
                  : "Saisissez votre nouveau mot de passe"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {activeTab === "profile" ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={profile.firstName}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                        className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="Prénom"
                        required
                      />
                      <label className="absolute -top-2 left-3 px-1 text-xs bg-white dark:bg-gray-900 text-gray-500">
                        Prénom
                      </label>
                    </div>

                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={profile.lastName}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                        className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="Nom"
                        required
                      />
                      <label className="absolute -top-2 left-3 px-1 text-xs bg-white dark:bg-gray-900 text-gray-500">
                        Nom
                      </label>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={profile.email}
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      disabled
                    />
                    <label className="absolute -top-2 left-3 px-1 text-xs bg-white dark:bg-gray-900 text-gray-500">
                      Email
                    </label>
                    <p className="text-xs text-gray-400 mt-1 ml-3">
                      L'adresse email ne peut pas être modifiée
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="Mot de passe actuel"
                    />
                    <label className="absolute -top-2 left-3 px-1 text-xs bg-white dark:bg-gray-900 text-gray-500">
                      Mot de passe actuel
                    </label>
                  </div>

                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="Nouveau mot de passe"
                    />
                    <label className="absolute -top-2 left-3 px-1 text-xs bg-white dark:bg-gray-900 text-gray-500">
                      Nouveau mot de passe
                    </label>
                  </div>

                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="Confirmer le mot de passe"
                    />
                    <label className="absolute -top-2 left-3 px-1 text-xs bg-white dark:bg-gray-900 text-gray-500">
                      Confirmer le mot de passe
                    </label>
                  </div>

                  {password && confirmPassword && password !== confirmPassword && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                      Les mots de passe ne correspondent pas
                    </div>
                  )}

                  {password && (
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Conseil de sécurité :</strong> Utilisez un mot de passe d'au moins 8 caractères avec des lettres majuscules, minuscules, chiffres et caractères spéciaux.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPassword("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="px-6 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Enregistrer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Security Tips */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Connexion sécurisée</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">SSL/TLS Encryption</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <Fingerprint className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Authentification</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Double facteur disponible</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
              <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Accès global</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Synchronisé partout</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}