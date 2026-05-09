import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import axios from "./api/axios";
import useAuth from "./hooks/useAuth";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  departmentId?: number;
  departmentName?: string;
  registrationNumber?: string;
}

interface Department {
  id: number;
  name: string;
}

interface UserFormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  departmentId: string;
  registrationNumber: string;
}

const EMPTY_FORM: UserFormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "USER",
  departmentId: "",
  registrationNumber: "",
};

export default function UserList() {
  const { auth } = useAuth();
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<UserFormState>(EMPTY_FORM);

  useEffect(() => {
    void fetchUsers();
    void fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get("/users", {
        headers: {
          Authorization: `Bearer ${auth?.token}`,
        },
      });
      setUsers(response.data);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error(t('user.noUsers'));
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get("/departments", {
        headers: {
          Authorization: `Bearer ${auth?.token}`,
        },
      });

      const deptsData = response.data?.content || response.data || [];
      setDepartments(Array.isArray(deptsData) ? deptsData : []);
    } catch (err) {
      console.error("Error fetching departments:", err);
      setDepartments([]);
    }
  };

  const filteredUsers = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return users.filter((user) => {
      return (
        user.firstName.toLowerCase().includes(search) ||
        user.lastName.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        (user.registrationNumber && user.registrationNumber.toLowerCase().includes(search)) ||
        (user.departmentName && user.departmentName.toLowerCase().includes(search))
      );
    });
  }, [searchTerm, users]);

  const openModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: "",
        role: user.role,
        departmentId: user.departmentId?.toString() || "",
        registrationNumber: user.registrationNumber || "",
      });
    } else {
      setEditingUser(null);
      setFormData(EMPTY_FORM);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    try {
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password || undefined,
        role: formData.role,
        departmentId: formData.departmentId ? Number.parseInt(formData.departmentId, 10) : null,
        registrationNumber: formData.registrationNumber || null,
      };

      if (editingUser) {
        await axios.put(`/users/${editingUser.id}`, userData, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth?.token}`,
          },
        });
        toast.success(t('user.updateSuccess'));
      } else {
        await axios.post("/users", userData, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth?.token}`,
          },
        });
        toast.success(t('user.createSuccess'));
      }

      await fetchUsers();
      closeModal();
    } catch (err: unknown) {
      console.error("Error saving user:", err);
      toast.error(t('common.errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('user.confirmDelete'))) {
      return;
    }

    try {
      await axios.delete(`/users/${id}`, {
        headers: {
          Authorization: `Bearer ${auth?.token}`,
        },
      });
      toast.success(t('user.deleteSuccess'));
      await fetchUsers();
    } catch (err) {
      console.error("Error deleting user:", err);
      toast.error(t('common.errors.generic'));
    }
  };

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      {/* Header & Search */}
      <div className="card bg-base-100 shadow-xl border border-base-200 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600/10 via-red-800/5 to-gray-500/5 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-base-300/70 bg-base-100/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-base-content/60 shadow-sm mb-3">
                Administration
              </div>
              <h1 className="text-3xl font-black tracking-tight">{t('user.title')}</h1>
              <p className="text-base-content/60 mt-1">Gestion des utilisateurs et des accès</p>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-primary" onClick={() => openModal()}>
                {t('user.addUser')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative w-full lg:w-96">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-base-content/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Rechercher par nom, email, matricule ou département..."
              value={searchTerm}
              onChange={handleSearch}
              className="input input-bordered w-full pl-12 focus:ring-2 ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-base-300/70 bg-base-100/80 px-4 py-2 text-sm shadow-sm">
              {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-base-100 rounded-3xl shadow-sm border border-base-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead className="bg-base-200/50">
              <tr>
                <th className="py-4">ID</th>
                <th>Matricule</th>
                <th>Prénom</th>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Département</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-primary/5 transition-colors">
                  <td className="font-semibold">#{user.id}</td>
                  <td>
                    <span className="font-mono text-sm">{user.registrationNumber || "-"}</span>
                  </td>
                  <td className="font-medium">{user.firstName}</td>
                  <td className="font-medium">{user.lastName}</td>
                  <td className="text-base-content/75">{user.email}</td>
                  <td>
                    <span className={`badge ${user.role === "ADMIN" ? "badge-error" : user.role === "SUPPORT" ? "badge-warning" : "badge-info"} badge-sm font-medium`}>
                      {user.role === "ADMIN" ? "Administrateur" : user.role === "SUPPORT" ? "Support" : "Utilisateur"}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-ghost font-medium">
                      {user.departmentName || "-"}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex justify-center gap-2">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => openModal(user)}
                      >
                        Modifier
                      </button>
                      <button
                        className="btn btn-error btn-sm"
                        onClick={() => handleDelete(user.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-base-content/40">
              <svg
                className="w-24 h-24 mb-4 stroke-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <p className="text-xl font-medium">Aucun utilisateur trouvé</p>
              <p className="text-sm mt-2">
                {searchTerm ? "Aucun résultat ne correspond à votre recherche" : "Cliquez sur 'Ajouter un utilisateur' pour commencer"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Add/Edit User */}
      <dialog className={`modal ${showModal ? "modal-open" : ""}`}>
        <div className="modal-box max-w-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-red-600/10 via-red-800/5 to-gray-500/5 p-6 border-b border-base-200">
            <h3 className="text-2xl font-black tracking-tight">
              {editingUser ? "Modifier l'utilisateur" : "Ajouter un utilisateur"}
            </h3>
            <p className="mt-1 text-sm text-base-content/60">
              {editingUser ? "Modifiez les informations de l'utilisateur" : "Créez un nouveau compte utilisateur"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="form-control">
                <label className="label-text font-bold mb-1">Matricule</label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  className="input input-bordered w-full"
                  placeholder="Ex: EMP-001"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label-text font-bold mb-1">Rôle</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="select select-bordered w-full"
                >
                  <option value="USER">Utilisateur</option>
                  <option value="ADMIN">Administrateur</option>
                  <option value="SUPPORT">Support</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label-text font-bold mb-1">Prénom</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="input input-bordered w-full"
                  required
                  placeholder="Jean"
                />
              </div>

              <div className="form-control">
                <label className="label-text font-bold mb-1">Nom</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="input input-bordered w-full"
                  required
                  placeholder="Dupont"
                />
              </div>

              <div className="form-control md:col-span-2">
                <label className="label-text font-bold mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input input-bordered w-full"
                  required
                  placeholder="jean.dupont@exemple.com"
                />
              </div>

              <div className="form-control md:col-span-2">
                <label className="label-text font-bold mb-1">
                  Mot de passe
                  {editingUser && <span className="text-sm font-normal text-base-content/60 ml-2">(laisser vide pour conserver l'actuel)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input input-bordered w-full"
                  required={!editingUser}
                  placeholder={!editingUser ? "Entrez un mot de passe sécurisé" : ""}
                />
              </div>

              <div className="form-control md:col-span-2">
                <label className="label-text font-bold mb-1">Département</label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="select select-bordered w-full"
                >
                  <option value="">Aucun</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-action mt-6">
              <button type="button" className="btn btn-ghost" onClick={closeModal}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Enregistrement...
                  </>
                ) : editingUser ? (
                  "Mettre à jour"
                ) : (
                  "Créer"
                )}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={closeModal}>close</button>
        </form>
      </dialog>
    </div>
  );
}