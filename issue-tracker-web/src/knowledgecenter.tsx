import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "./api/axios";
import { useTranslation } from "react-i18next";

// --- Types & Interfaces ---
type TabKey = "faq" | "pending";

interface Department {
  id: number;
  name: string;
}

interface FaqItem {
  id?: number;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  departmentId?: number | null;
  departmentName?: string | null;
  active: boolean;
  viewCount?: number;
}

interface UnansweredQuestion {
  id: number;
  question: string;
  context: string;
  userEmail: string;
  suggestedCategory: string;
  suggestedDepartment: string;
  relatedTicketId: number;
  status: string;
  createdAt: string;
}

const emptyFaq: FaqItem = {
  question: "",
  answer: "",
  category: "autres",
  keywords: [],
  active: true,
};

const ITEMS_PER_PAGE = 6;

export default function KnowledgeCenter() {
  const { t } = useTranslation();

  // --- États ---
  const [activeTab, setActiveTab] = useState<TabKey>("faq");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [unansweredQuestions, setUnansweredQuestions] = useState<UnansweredQuestion[]>([]);
  const [faqForm, setFaqForm] = useState<FaqItem>(emptyFaq);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [faqPage, setFaqPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);

  const [selectedPending, setSelectedPending] = useState<UnansweredQuestion | null>(null);
  const [pendingAnswer, setPendingAnswer] = useState("");
  const [pendingCategory, setPendingCategory] = useState("");

  const categories = useMemo(() => [
    { key: "informatique", label: t('knowledgeCenter.categories.informatique') },
    { key: "materiel", label: t('knowledgeCenter.categories.materiel') },
    { key: "administratif", label: t('knowledgeCenter.categories.administratif') },
    { key: "maintenance", label: t('knowledgeCenter.categories.maintenance') },
    { key: "achat", label: t('knowledgeCenter.categories.achat') },
    { key: "formation", label: t('knowledgeCenter.categories.formation') },
    { key: "autres", label: t('knowledgeCenter.categories.autres') },
  ], [t]);

  // --- Chargement des données ---
  const loadData = async () => {
    setLoading(true);
    try {
      const [deptRes, faqRes, pendingRes] = await Promise.allSettled([
        api.get("/departments", { params: { page: 0, size: 100 } }),
        api.get("/faqs"),
        api.get("/unanswered-questions/pending")
      ]);

      if (deptRes.status === 'fulfilled') setDepartments(deptRes.value.data?.content || []);
      if (faqRes.status === 'fulfilled') setFaqs(faqRes.value.data || []);
      if (pendingRes.status === 'fulfilled') setUnansweredQuestions(pendingRes.value.data || []);

    } catch (error) {
      toast.error(t('knowledgeCenter.common.noData'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Logique métier ---
  const saveFaq = async () => {
    setSaving(true);
    try {
      const payload = { ...faqForm, keywords: faqForm.keywords.filter(Boolean) };
      if (faqForm.id) {
        await api.put(`/faqs/${faqForm.id}`, payload);
        toast.success(t('knowledgeCenter.faq.updateSuccess'));
      } else {
        await api.post("/faqs", payload);
        toast.success(t('knowledgeCenter.faq.createSuccess'));
      }
      setFaqForm(emptyFaq);
      loadData();
    } catch (error) {
      toast.error(t('common.errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  const deleteFaq = async (id?: number) => {
    if (!id || !window.confirm(t('knowledgeCenter.faq.deleteConfirm'))) return;
    try {
      await api.delete(`/faqs/${id}`);
      toast.success(t('knowledgeCenter.faq.deleteSuccess'));
      loadData();
    } catch (error) {
      toast.error(t('common.errors.generic'));
    }
  };

  const addToFaq = async (id: number) => {
    if (!pendingAnswer.trim()) {
      toast.error(t('knowledgeCenter.pending.answerRequired'));
      return;
    }
    try {
      await api.post(`/unanswered-questions/${id}/add-to-faq`, {
        answer: pendingAnswer,
        category: pendingCategory || "autres",
        keywords: "",
      });
      toast.success(t('knowledgeCenter.pending.addSuccess'));
      loadData();
      setSelectedPending(null);
      setPendingAnswer("");
    } catch (error) {
      toast.error(t('knowledgeCenter.pending.error'));
    }
  };

  const deletePendingQuestion = async (id: number) => {
    if (!window.confirm(t('knowledgeCenter.pending.deleteConfirm'))) return;
    try {
      await api.delete(`/unanswered-questions/${id}`);
      toast.success(t('knowledgeCenter.pending.deleteSuccess'));
      loadData();
    } catch (error) {
      toast.error(t('common.errors.generic'));
    }
  };

   // --- Filtrage & Pagination ---
   const filteredFaqs = useMemo(() => {
     const query = search.toLowerCase();
     return faqs.filter((item) =>
       [item.question, item.answer, item.category, item.departmentName].some((v) =>
         (v || "").toLowerCase().includes(query)
       ) || 
       item.keywords.some(keyword => 
         keyword.toLowerCase().includes(query)
       )
     );
   }, [faqs, search]);

  const paginatedFaqs = useMemo(() => {
    const start = (faqPage - 1) * ITEMS_PER_PAGE;
    return filteredFaqs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredFaqs, faqPage]);

  const paginatedPending = useMemo(() => {
    const start = (pendingPage - 1) * ITEMS_PER_PAGE;
    return unansweredQuestions.slice(start, start + ITEMS_PER_PAGE);
  }, [unansweredQuestions, pendingPage]);

  const totalFaqPages = Math.ceil(filteredFaqs.length / ITEMS_PER_PAGE);
  const totalPendingPages = Math.ceil(unansweredQuestions.length / ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm font-medium animate-pulse">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      {/* Header & Search */}
      <div className="card bg-base-100 shadow-xl border border-base-200 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600/10 via-red-800/5 to-gray-500/5 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight">{t('knowledgeCenter.title')}</h1>
              <p className="text-base-content/60 mt-1">Base de connaissances et questions fréquentes</p>
            </div>
            <div className="relative w-full md:w-96">
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
                placeholder={t('knowledgeCenter.searchPlaceholder')}
                className="input input-bordered w-full pl-12 bg-base-100 focus:ring-2 ring-primary/20"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setFaqPage(1); }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-200 p-1 w-fit mx-auto">
        <button
          className={`tab tab-lg px-8 transition-all ${activeTab === "faq" ? "tab-active !bg-base-100 shadow-sm" : ""}`}
          onClick={() => setActiveTab("faq")}
        >
          {t('knowledgeCenter.tabs.faq', { count: faqs.length })}
        </button>
        <button
          className={`tab tab-lg px-8 transition-all ${activeTab === "pending" ? "tab-active !bg-base-100 shadow-sm" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          {t('knowledgeCenter.tabs.pending', { count: unansweredQuestions.length })}
        </button>
      </div>

      {activeTab === "faq" ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Liste FAQ */}
          <div className="xl:col-span-8 space-y-4">
            <div className="bg-base-100 rounded-3xl shadow-sm border border-base-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead className="bg-base-200/50">
                    <tr>
                      <th className="py-4">{t('knowledgeCenter.faq.question')}</th>
                      <th>{t('knowledgeCenter.faq.category')}</th>
                      <th className="text-center">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFaqs.map((item) => (
                      <tr key={item.id} className="hover:bg-primary/5 transition-colors group">
                        <td className="py-4">
                          <div className="font-bold text-base">{item.question}</div>
                          <div className="text-xs opacity-50 line-clamp-1 mt-1">{item.answer}</div>
                        </td>
                        <td className="py-4">
                          <span className="badge badge-ghost font-medium">{item.category}</span>
                        </td>
                        <td className="py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => setFaqForm(item)}
                              title={t('common.edit')}
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              className="btn btn-error btn-sm"
                              onClick={() => deleteFaq(item.id)}
                              title={t('common.delete')}
                            >
                              {t('common.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination FAQ */}
              <div className="p-4 border-t border-base-200 flex items-center justify-between bg-base-50">
                <span className="text-sm opacity-60">
                  Page {faqPage} / {totalFaqPages || 1}
                </span>
                <div className="join shadow-sm">
                  <button
                    className="join-item btn btn-sm"
                    disabled={faqPage === 1}
                    onClick={() => setFaqPage(p => p - 1)}
                  >
                    ← Précédent
                  </button>
                  <button
                    className="join-item btn btn-sm"
                    disabled={faqPage >= totalFaqPages}
                    onClick={() => setFaqPage(p => p + 1)}
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Formulaire FAQ */}
          <div className="xl:col-span-4 sticky top-6">
            <div className="card bg-base-100 shadow-xl border border-red-600/20">
              <div className="card-body gap-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {faqForm.id ? t('knowledgeCenter.faq.edit') : t('knowledgeCenter.faq.addNew')}
                </h2>
                <div className="form-control">
                  <label className="label-text font-bold mb-1">{t('knowledgeCenter.faq.question')}</label>
                  <input
                    type="text"
                    className="input input-bordered focus:input-primary"
                    value={faqForm.question}
                    onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                  />
                </div>
                <div className="form-control">
                  <label className="label-text font-bold mb-1">Réponse</label>
                  <textarea
                    className="textarea textarea-bordered focus:textarea-primary h-32"
                    value={faqForm.answer}
                    onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label-text font-bold mb-1">{t('knowledgeCenter.faq.category')}</label>
                    <select
                      className="select select-bordered select-sm"
                      value={faqForm.category}
                      onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                    >
                      {categories.map(c => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label-text font-bold mb-1">{t('knowledgeCenter.faq.department')}</label>
                    <select
                      className="select select-bordered select-sm"
                      value={faqForm.departmentId || ""}
                      onChange={(e) => setFaqForm({ ...faqForm, departmentId: Number(e.target.value) || null })}
                    >
                      <option value="">{t('common.none')}</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="card-actions justify-end mt-4">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setFaqForm(emptyFaq)}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    className={`btn btn-primary btn-sm ${saving ? 'loading' : ''}`}
                    onClick={saveFaq}
                    disabled={!faqForm.question || !faqForm.answer}
                  >
                    {faqForm.id ? t('common.update') : t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Section Pending Questions */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedPending.map((q) => (
              <div key={q.id} className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow border-t-4 border-red-600">
                <div className="card-body">
                  <div className="flex justify-between items-start mb-2">
                    <span className="badge badge-warning badge-sm font-bold">
                      {q.suggestedCategory}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold line-clamp-2 min-h-[3.5rem]">{q.question}</h3>
                  <p className="text-sm text-base-content/70 line-clamp-2 mt-1">
                    {q.context}
                  </p>
                  <div className="card-actions justify-end mt-4 gap-2">
                    <button
                      className="btn btn-primary btn-sm rounded-lg gap-1.5 shadow-sm hover:shadow-md transition-all"
                      onClick={() => {
                        setSelectedPending(q);
                        setPendingCategory(q.suggestedCategory);
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {t('knowledgeCenter.pending.answer')}
                    </button>
                    <button
                      className="btn btn-outline btn-error btn-sm rounded-lg gap-1.5 hover:shadow-md transition-all"
                      onClick={() => deletePendingQuestion(q.id)}
                      title={t('common.delete')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Pending */}
          {totalPendingPages > 1 && (
            <div className="flex justify-center mt-10">
              <div className="join shadow-md rounded-xl overflow-hidden">
                <button
                  className="join-item btn btn-sm bg-base-100 hover:bg-base-200 border-base-300 px-4 gap-1"
                  disabled={pendingPage === 1}
                  onClick={() => setPendingPage(p => p - 1)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t('common.previous')}
                </button>
                {[...Array(totalPendingPages)].map((_, i) => (
                  <button
                    key={i}
                    className={`join-item btn btn-sm min-w-[2.5rem] border-base-300 ${pendingPage === i + 1
                        ? 'btn-primary text-white shadow-inner'
                        : 'bg-base-100 hover:bg-base-200'
                      }`}
                    onClick={() => setPendingPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="join-item btn btn-sm bg-base-100 hover:bg-base-200 border-base-300 px-4 gap-1"
                  disabled={pendingPage === totalPendingPages}
                  onClick={() => setPendingPage(p => p + 1)}
                >
                  {t('common.next')}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {unansweredQuestions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-base-content/40">
              <p className="text-xl font-medium">{t('knowledgeCenter.pending.emptyTitle')}</p>
              <p className="text-sm mt-2">{t('knowledgeCenter.pending.emptyDescription')}</p>
            </div>
          )}
        </div>
      )}

      {/* Modal pour répondre */}
      {selectedPending && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="text-2xl font-black mb-4">{t('knowledgeCenter.pending.addToFaq')}</h3>
            <div className="bg-base-200 p-4 rounded-lg mb-4">
              <p className="font-semibold text-sm opacity-70 mb-2">{t('knowledgeCenter.pending.question')}</p>
              <p className="font-bold italic">"{selectedPending.question}"</p>
            </div>
            <div className="form-control gap-4">
              <div>
                <label className="label-text font-bold mb-2 block">
                  {t('knowledgeCenter.faq.answer')} <span className="text-error">*</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full h-40"
                  value={pendingAnswer}
                  onChange={(e) => setPendingAnswer(e.target.value)}
                  placeholder={t('knowledgeCenter.pending.answerPlaceholder')}
                  autoFocus
                />
              </div>
              <div className="modal-action gap-2">
                <button
                  className="btn btn-ghost gap-1.5"
                  onClick={() => {
                    setSelectedPending(null);
                    setPendingAnswer("");
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {t('common.cancel')}
                </button>
                <button
                  className="btn btn-primary gap-1.5 shadow-md hover:shadow-lg transition-all"
                  onClick={() => addToFaq(selectedPending.id)}
                  disabled={!pendingAnswer.trim()}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('knowledgeCenter.pending.addToFaq')}
                </button>
              </div>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => {
              setSelectedPending(null);
              setPendingAnswer("");
            }}>{t('common.close')}</button>
          </form>
        </dialog>
      )}
    </div>
  );
}