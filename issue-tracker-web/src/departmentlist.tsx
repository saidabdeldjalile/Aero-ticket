import { AxiosResponse } from "axios";
import api from "./api/axios";
import useSWR, { mutate } from "swr";
import { Department } from "./TicketResponse";
import { toast } from "react-toastify";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

interface PaginatedDepartments {
  content: Department[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export default function DepartmentList() {
  const { t } = useTranslation();
  const url = `/departments`;
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

  const key = `department-${page}-${searchTerm}`;

  const fetcher = (url: string) => {
    return api.get<PaginatedDepartments>(url, { params: { page, size: pageSize, search: searchTerm || undefined } }).then((res: AxiosResponse<PaginatedDepartments>) => {
      return res.data;
    });
  };

  const {
    data: paginatedDepartments,
    error,
    isLoading,
  } = useSWR<PaginatedDepartments | null>(key, () => fetcher(url));

  const departments = useMemo(() => paginatedDepartments?.content || [], [paginatedDepartments]);

  const [departmentName, setDepartmentName] = useState("");
  const [description, setDescription] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const openModal = (department?: Department) => {
    if (department) {
      setEditingDepartment(department);
      setDepartmentName(department.name);
      setDescription(department.description || "");
    } else {
      setEditingDepartment(null);
      setDepartmentName("");
      setDescription("");
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDepartment(null);
    setDepartmentName("");
    setDescription("");
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && (!paginatedDepartments || newPage < paginatedDepartments.totalPages)) {
      setPage(newPage);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const request = editingDepartment
      ? api.put(`/departments/${editingDepartment.id}`, {
        name: departmentName,
        description: description,
      })
      : api.post("/departments", {
        name: departmentName,
        description: description,
      });

    request
      .then(() => {
        mutate(key);
        toast.success(editingDepartment ? t('department.updateSuccess') : t('department.createSuccess'));
        closeModal();
      })
      .catch((err) => {
        console.error("Error saving department:", err);
        toast.error(t('common.errors.generic'));
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Supprimer le département "${name}" ?`)) {
      return;
    }

    try {
      await api.delete(`/departments/${id}`);
      toast.success(t('department.deleteSuccess'));
      mutate(key);
    } catch (err) {
      console.error("Error deleting department:", err);
      toast.error(t('common.errors.generic'));
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto text-error mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-error text-lg mb-4">{t('common.errors.generic')}</p>
          <button className="btn btn-primary" onClick={() => mutate(key)}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm font-medium animate-pulse">Chargement des départements...</p>
      </div>
    );
  }

  const totalDepartments = paginatedDepartments?.totalElements ?? departments.length;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="card bg-base-100 shadow-xl border border-base-200 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600/10 via-red-800/5 to-gray-500/5 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-base-300/70 bg-base-100/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-base-content/60 shadow-sm mb-3">
                Départements
              </div>
              <h1 className="text-3xl font-black tracking-tight">{t('department.title')}</h1>
              <p className="text-base-content/60 mt-1">Gestion des départements de l'organisation</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="btn btn-primary" onClick={() => openModal()}>
                {t('department.create')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
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
              placeholder="Rechercher un département par nom..."
              value={searchTerm}
              onChange={handleSearch}
              className="input input-bordered w-full pl-12 focus:ring-2 ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-base-300/70 bg-base-100/80 px-4 py-2 text-sm shadow-sm">
              Total: {totalDepartments} département(s)
            </span>
          </div>
        </div>
      </div>

      {/* Departments Table */}
      <div className="bg-base-100 rounded-3xl shadow-sm border border-base-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead className="bg-base-200/50">
              <tr>
                <th>ID</th>
                <th>{t('department.name')}</th>
                <th>{t('department.description')}</th>
                <th className="text-center">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-primary/5 transition-colors">
                  <td className="font-semibold">
                    <span className="opacity-60">#</span>{dept.id}
                  </td>
                  <td className="font-medium">{dept.name}</td>
                  <td className="text-base-content/75">
                    {dept.description || <span className="italic opacity-50">Aucune description</span>}
                  </td>
                  <td className="text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => openModal(dept)}
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        className="btn btn-error btn-sm"
                        onClick={() => handleDelete(dept.id, dept.name)}
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {departments.length === 0 && (
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <p className="text-xl font-medium">Aucun département trouvé</p>
              <p className="text-sm mt-2">
                {searchTerm ? "Aucun résultat ne correspond à votre recherche" : "Cliquez sur 'Créer un département' pour commencer"}
              </p>
              {!searchTerm && (
                <button
                  className="btn btn-primary btn-sm mt-6"
                  onClick={() => openModal()}
                >
                  Créer un département
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {paginatedDepartments && paginatedDepartments.totalPages > 1 && (
          <div className="p-4 border-t border-base-200 flex items-center justify-between bg-base-50">
            <span className="text-sm opacity-60">
              Page {paginatedDepartments.number + 1} / {paginatedDepartments.totalPages}
            </span>
            <div className="join shadow-sm">
              <button
                className="join-item btn btn-sm"
                disabled={paginatedDepartments.first}
                onClick={() => handlePageChange(page - 1)}
              >
                ← Précédent
              </button>
              <button
                className="join-item btn btn-sm"
                disabled={paginatedDepartments.last}
                onClick={() => handlePageChange(page + 1)}
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Department Modal */}
      {showModal && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-red-600/10 via-red-800/5 to-gray-500/5 p-6 border-b border-base-200">
              <h3 className="text-2xl font-black tracking-tight">
                {editingDepartment ? "Modifier le département" : "Créer un département"}
              </h3>
              <p className="mt-1 text-sm text-base-content/60">
                {editingDepartment ? "Modifiez les informations du département" : "Ajoutez un nouveau département à l'organisation"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label-text font-bold mb-1">
                    {t('department.name')} <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    className="input input-bordered w-full focus:ring-2 ring-primary/20"
                    placeholder="Ex: Informatique, RH, Marketing..."
                    required
                    autoFocus
                  />
                </div>

                <div className="form-control">
                  <label className="label-text font-bold mb-1">
                    {t('department.description')}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="textarea textarea-bordered w-full h-28 focus:ring-2 ring-primary/20"
                    placeholder="Description du département..."
                  />
                </div>
              </div>

              <div className="modal-action mt-6">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving || !departmentName.trim()}>
                  {saving ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      {t('common.saving')}
                    </>
                  ) : editingDepartment ? (
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
      )}
    </div>
  );
}