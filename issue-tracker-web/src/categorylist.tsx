import { useEffect, useState, type FormEvent } from "react";
import api from "./api/axios";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import {
    Plus,
    Pencil,
    Trash2,
    X,
    Save,
    Layers,
    Tag,
    CheckCircle,
    XCircle,
    RefreshCw,
    Tags
} from "lucide-react";

// ==================== CATEGORY INTERFACES ====================
interface CategoryDTO {
    id: number;
    name: string;
    description?: string;
    active: boolean;
    allowedIssueTypes: string[];
}

interface CategoryForm {
    name: string;
    description: string;
    active: boolean;
    allowedIssueTypes: string[];
}

const EMPTY_CATEGORY_FORM: CategoryForm = {
    name: "",
    description: "",
    active: true,
    allowedIssueTypes: [],
};

// ==================== ISSUE TYPE INTERFACES ====================
interface IssueTypeDTO {
    id: number;
    name: string;
    active: boolean;
}

interface IssueTypeForm {
    name: string;
    active: boolean;
}

const EMPTY_ISSUE_TYPE_FORM: IssueTypeForm = {
    name: "",
    active: true,
};

type Tab = "categories" | "issue-types";

export default function CategoryList() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<Tab>("categories");

    // === Categories state ===
    const [categories, setCategories] = useState<CategoryDTO[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryDTO | null>(null);
    const [savingCategory, setSavingCategory] = useState(false);
    const [catForm, setCatForm] = useState<CategoryForm>(EMPTY_CATEGORY_FORM);

    // === Issue Types state ===
    const [issueTypes, setIssueTypes] = useState<IssueTypeDTO[]>([]);
    const [loadingTypes, setLoadingTypes] = useState(true);
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [editingType, setEditingType] = useState<IssueTypeDTO | null>(null);
    const [savingType, setSavingType] = useState(false);
    const [typeForm, setTypeForm] = useState<IssueTypeForm>(EMPTY_ISSUE_TYPE_FORM);
    const [typeSearchTerm, setTypeSearchTerm] = useState("");
    const [newQuickTypeName, setNewQuickTypeName] = useState("");
    const [isCreatingQuickType, setIsCreatingQuickType] = useState(false);

    // ==================== CATEGORIES CRUD ====================
    const fetchCategories = () => {
        setLoadingCategories(true);
        api.get("/categories")
            .then((res) => {
                const data = res.data?.content || res.data || [];
                setCategories(Array.isArray(data) ? data : []);
            })
            .catch(() => toast.error("Erreur lors du chargement des catégories"))
            .finally(() => setLoadingCategories(false));
    };

    useEffect(() => {
        fetchCategories();
        fetchIssueTypes();
    }, []);

    const openCreateCategory = () => {
        setEditingCategory(null);
        setCatForm(EMPTY_CATEGORY_FORM);
        setShowCategoryModal(true);
    };

    const openEditCategory = (cat: CategoryDTO) => {
        setEditingCategory(cat);
        setCatForm({
            name: cat.name,
            description: cat.description || "",
            active: cat.active,
            allowedIssueTypes: [...cat.allowedIssueTypes],
        });
        setShowCategoryModal(true);
    };

    const closeCategoryModal = () => {
        setShowCategoryModal(false);
        setEditingCategory(null);
        setCatForm(EMPTY_CATEGORY_FORM);
    };

    const toggleIssueType = (type: string) => {
        setCatForm((prev) => {
            const exists = prev.allowedIssueTypes.includes(type);
            return {
                ...prev,
                allowedIssueTypes: exists
                    ? prev.allowedIssueTypes.filter((t) => t !== type)
                    : [...prev.allowedIssueTypes, type],
            };
        });
    };

    const handleCategorySubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!catForm.name.trim()) {
            toast.error(t('common.errors.required') || "Le nom de la catégorie est requis");
            return;
        }
        setSavingCategory(true);
        try {
            const payload = { ...catForm, name: catForm.name.trim() };
            if (editingCategory) {
                await api.put(`/categories/${editingCategory.id}`, payload);
                toast.success(t('common.updateSuccess') || "Catégorie mise à jour");
            } else {
                await api.post("/categories", payload);
                toast.success(t('common.createSuccess') || "Catégorie créée");
            }
            closeCategoryModal();
            fetchCategories();
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 409 || status === 400) {
                toast.error(t('errors.duplicateCategory'));
            } else {
                toast.error(t('errors.saveFailed'));
            }
        } finally {
            setSavingCategory(false);
        }
    };

    const handleDeleteCategory = async (cat: CategoryDTO) => {
        if (!window.confirm(`Supprimer la catégorie "${cat.name}" ?`)) return;
        try {
            await api.delete(`/categories/${cat.id}`);
            toast.success("Catégorie supprimée");
            fetchCategories();
        } catch { toast.error("Erreur lors de la suppression"); }
    };

    const handleToggleCategoryActive = async (cat: CategoryDTO) => {
        try {
            await api.put(`/categories/${cat.id}`, {
                name: cat.name, description: cat.description,
                active: !cat.active, allowedIssueTypes: cat.allowedIssueTypes,
            });
            toast.success(cat.active ? "Catégorie désactivée" : "Catégorie activée");
            fetchCategories();
        } catch { toast.error("Erreur"); }
    };

    // ==================== ISSUE TYPES CRUD ====================
    const fetchIssueTypes = () => {
        setLoadingTypes(true);
        api.get("/issue-types")
            .then((res) => {
                const data = res.data?.content || res.data || [];
                setIssueTypes(Array.isArray(data) ? data : []);
            })
            .catch(() => toast.error("Erreur lors du chargement des types"))
            .finally(() => setLoadingTypes(false));
    };

    const openCreateType = () => {
        setEditingType(null);
        setTypeForm(EMPTY_ISSUE_TYPE_FORM);
        setShowTypeModal(true);
    };

    const openEditType = (type: IssueTypeDTO) => {
        setEditingType(type);
        setTypeForm({
            name: type.name,
            active: type.active,
        });
        setShowTypeModal(true);
    };

    const closeTypeModal = () => {
        setShowTypeModal(false);
        setEditingType(null);
        setTypeForm(EMPTY_ISSUE_TYPE_FORM);
    };

    const handleQuickAddType = async () => {
        if (!newQuickTypeName.trim()) return;
        setIsCreatingQuickType(true);
        try {
            const payload = { name: newQuickTypeName.trim(), active: true };
            const res = await api.post("/issue-types", payload);
            const createdType = res.data;

            // Refresh list
            await fetchIssueTypes();

            // Auto select it in catForm
            setCatForm(prev => ({
                ...prev,
                allowedIssueTypes: [...prev.allowedIssueTypes, createdType.name]
            }));

            setNewQuickTypeName("");
            toast.success(`Type "${createdType.name}" ajouté`);
        } catch (err) {
            toast.error("Erreur lors de la création du type");
        } finally {
            setIsCreatingQuickType(false);
        }
    };

    const handleTypeSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!typeForm.name.trim()) {
            toast.error(t('common.errors.required') || "Le nom est requis");
            return;
        }
        setSavingType(true);
        try {
            const payload = { ...typeForm, name: typeForm.name.trim() };
            if (editingType) {
                await api.put(`/issue-types/${editingType.id}`, payload);
                toast.success(t('common.updateSuccess') || "Type de demande mis à jour");
            } else {
                await api.post("/issue-types", payload);
                toast.success(t('common.createSuccess') || "Type de demande créé");
            }
            closeTypeModal();
            fetchIssueTypes();
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 409 || status === 400) {
                toast.error(t('errors.duplicateIssueType'));
            } else {
                toast.error(t('errors.saveFailed'));
            }
        } finally { setSavingType(false); }
    };

    const handleDeleteType = async (type: IssueTypeDTO) => {
        if (!window.confirm(`Supprimer le type "${type.name}" ?`)) return;
        try {
            await api.delete(`/issue-types/${type.id}`);
            toast.success("Type supprimé");
            fetchIssueTypes();
        } catch { toast.error("Erreur lors de la suppression"); }
    };

    const handleToggleTypeActive = async (type: IssueTypeDTO) => {
        try {
            await api.put(`/issue-types/${type.id}`, {
                name: type.name, active: !type.active,
            });
            toast.success(type.active ? "Type désactivé" : "Type activé");
            fetchIssueTypes();
        } catch { toast.error("Erreur"); }
    };

    // ==================== RENDER ====================
    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-20 px-4">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 via-red-800 to-gray-800 p-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-sm mb-3">
                                <Layers className="w-3 h-3" />
                                Administration
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-white">
                                Gestion des Catégories & Types
                            </h1>
                            <p className="text-white/80 mt-1">
                                Gérez les catégories et leurs types de demandes
                            </p>
                        </div>
                        <button
                            onClick={activeTab === "categories" ? openCreateCategory : openCreateType}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-red-700 font-bold hover:bg-red-50 transition-all shadow-lg"
                        >
                            <Plus className="w-5 h-5" />
                            {activeTab === "categories" ? "Nouvelle catégorie" : "Nouveau type"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1.5">
                <button
                    onClick={() => setActiveTab("categories")}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === "categories"
                        ? "bg-white dark:bg-gray-900 text-red-600 shadow-lg"
                        : "text-gray-600 dark:text-gray-400 hover:text-red-600"
                        }`}
                >
                    <Layers className="w-4 h-4" />
                    Catégories
                </button>
                <button
                    onClick={() => setActiveTab("issue-types")}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === "issue-types"
                        ? "bg-white dark:bg-gray-900 text-red-600 shadow-lg"
                        : "text-gray-600 dark:text-gray-400 hover:text-red-600"
                        }`}
                >
                    <Tags className="w-4 h-4" />
                    Types de demandes
                </button>
            </div>

            {/* Refresh */}
            <div className="flex justify-end">
                <button
                    onClick={activeTab === "categories" ? fetchCategories : fetchIssueTypes}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                    <RefreshCw className={`w-4 h-4 ${activeTab === "categories" ? loadingCategories : loadingTypes ? "animate-spin" : ""}`} />
                    Actualiser
                </button>
            </div>

            {/* ==================== CATEGORIES TAB ==================== */}
            {activeTab === "categories" && (
                <>
                    {loadingCategories ? (
                        <div className="flex h-64 items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700">
                            <Layers className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                            <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400">Aucune catégorie trouvée</h3>
                            <p className="text-gray-400 dark:text-gray-500 mt-2">Cliquez sur "Nouvelle catégorie" pour créer la première</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {categories.map((cat) => (
                                <div key={cat.id} className={`bg-white dark:bg-gray-900 rounded-2xl shadow-lg border transition-all hover:shadow-xl ${cat.active ? "border-gray-200 dark:border-gray-700" : "border-gray-200 dark:border-gray-700 opacity-60"}`}>
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Tag className="w-4 h-4 text-red-500" />
                                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{cat.name}</h3>
                                                </div>
                                            </div>
                                            <button onClick={() => handleToggleCategoryActive(cat)} className={`p-1.5 rounded-lg transition-colors ${cat.active ? "text-green-500 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`} title={cat.active ? "Désactiver" : "Activer"}>
                                                {cat.active ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        {cat.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{cat.description}</p>}
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Types ({cat.allowedIssueTypes.length})</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {cat.allowedIssueTypes.length > 0 ? cat.allowedIssueTypes.map((type) => (
                                                    <span key={type} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-medium">{type}</span>
                                                )) : <span className="text-xs text-gray-400 italic">Aucun type associé</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex border-t border-gray-100 dark:border-gray-800">
                                        <button onClick={() => openEditCategory(cat)} className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors rounded-bl-2xl"><Pencil className="w-4 h-4" /> Modifier</button>
                                        <button onClick={() => handleDeleteCategory(cat)} className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors rounded-br-2xl border-l border-gray-100"><Trash2 className="w-4 h-4" /> Supprimer</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Category Modal */}
                    {showCategoryModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeCategoryModal}></div>
                            <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-3xl z-10">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingCategory ? "Modifier la catégorie" : "Nouvelle catégorie"}</h2>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{editingCategory ? "Modifiez les informations" : "Créez une nouvelle catégorie"}</p>
                                        </div>
                                        <button onClick={closeCategoryModal} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5" /></button>
                                    </div>
                                </div>
                                <form onSubmit={handleCategorySubmit} className="p-6 space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nom de la catégorie *</label>
                                        <input type="text" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="ex: Informatique, Ressources Humaines" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                                        <textarea value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none" placeholder="Description" />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Types de demandes associés</label>
                                                <p className="text-xs text-gray-400">Sélectionnez les types autorisés pour cette catégorie</p>
                                            </div>
                                        </div>
                                        {/* Quick Add Type UI */}
                                        <div className="flex gap-2 mb-3">
                                            <input
                                                type="text"
                                                value={newQuickTypeName}
                                                onChange={(e) => setNewQuickTypeName(e.target.value)}
                                                placeholder="Nouveau type..."
                                                className="flex-1 h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white"
                                            />
                                            <button type="button" onClick={handleQuickAddType} disabled={isCreatingQuickType || !newQuickTypeName.trim()} className="px-3 h-9 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50">
                                                {isCreatingQuickType ? "..." : "Ajouter"}
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={typeSearchTerm}
                                                onChange={(e) => setTypeSearchTerm(e.target.value)}
                                                placeholder="Rechercher un type de demande..."
                                                className="w-full h-11 px-4 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all mb-2"
                                            />
                                            {typeSearchTerm && (
                                                <button
                                                    type="button"
                                                    onClick={() => setTypeSearchTerm("")}
                                                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                                            {issueTypes.filter(t => t.name.toLowerCase().includes(typeSearchTerm.toLowerCase())).length === 0 ? (
                                                <div className="px-4 py-3 text-sm text-gray-400 italic">Aucun type trouvé</div>
                                            ) : (
                                                issueTypes.filter(t => t.name.toLowerCase().includes(typeSearchTerm.toLowerCase())).map((type) => {
                                                    const isSelected = catForm.allowedIssueTypes.includes(type.name);
                                                    return (
                                                        <label
                                                            key={type.id}
                                                            onClick={() => toggleIssueType(type.name)}
                                                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all text-sm ${isSelected ? "bg-blue-50 dark:bg-blue-500/5 text-blue-700 dark:text-blue-400 font-medium" : "text-gray-700 dark:text-gray-300"
                                                                }`}
                                                        >
                                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600"}`}>
                                                                {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                            </div>
                                                            {type.name}
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                        <button type="button" onClick={closeCategoryModal} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all font-medium">Annuler</button>
                                        <button type="submit" disabled={savingCategory || !catForm.name.trim()} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white font-semibold flex items-center gap-2 transition-all disabled:opacity-50">
                                            {savingCategory ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Enregistrement...</> : <><Save className="w-4 h-4" />{editingCategory ? "Mettre à jour" : "Créer"}</>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ==================== ISSUE TYPES TAB ==================== */}
            {activeTab === "issue-types" && (
                <>
                    {loadingTypes ? (
                        <div className="flex h-64 items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                        </div>
                    ) : issueTypes.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700">
                            <Tags className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                            <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400">Aucun type de demande trouvé</h3>
                            <p className="text-gray-400 dark:text-gray-500 mt-2">Cliquez sur "Nouveau type" pour créer le premier</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {issueTypes.map((type) => (
                                <div key={type.id} className={`bg-white dark:bg-gray-900 rounded-2xl shadow-lg border transition-all hover:shadow-xl ${type.active ? "border-gray-200 dark:border-gray-700" : "border-gray-200 dark:border-gray-700 opacity-55"}`}>
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                                                        <Tags className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 dark:text-white">{type.name}</h3>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleToggleTypeActive(type)} className={`p-1.5 rounded-lg transition-colors ${type.active ? "text-green-500 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`} title={type.active ? "Désactiver" : "Activer"}>
                                                {type.active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex border-t border-gray-100 dark:border-gray-800">
                                        <button onClick={() => openEditType(type)} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors rounded-bl-2xl"><Pencil className="w-3.5 h-3.5" /> Modifier</button>
                                        <button onClick={() => handleDeleteType(type)} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors rounded-br-2xl border-l border-gray-100"><Trash2 className="w-3.5 h-3.5" /> Supprimer</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Issue Type Modal */}
                    {showTypeModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeTypeModal}></div>
                            <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-3xl z-10">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingType ? "Modifier le type" : "Nouveau type de demande"}</h2>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{editingType ? "Modifiez les informations" : "Créez un nouveau type"}</p>
                                        </div>
                                        <button onClick={closeTypeModal} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5" /></button>
                                    </div>
                                </div>
                                <form onSubmit={handleTypeSubmit} className="p-6 space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nom du type *</label>
                                        <input type="text" value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="ex: Bug, Incident, Question" required disabled={!!editingType} />
                                        {editingType && <p className="text-xs text-gray-400 mt-1">Le nom ne peut pas être modifié</p>}
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                        <button type="button" onClick={closeTypeModal} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all font-medium">Annuler</button>
                                        <button type="submit" disabled={savingType || !typeForm.name.trim()} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white font-semibold flex items-center gap-2 transition-all disabled:opacity-50">
                                            {savingType ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Enregistrement...</> : <><Save className="w-4 h-4" />{editingType ? "Mettre à jour" : "Créer"}</>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}