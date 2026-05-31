import { Link } from "react-router-dom";
import { TicketResponse } from "./TicketResponse";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "react-quill/dist/quill.bubble.css";
import { useState } from "react";
import api from "./api/axios";
import { toast } from "react-toastify";
import Comments from "./components/comment";
import useAuth from "./hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Edit2, Save, X, MessageCircle, ArrowLeft, Calendar, User } from "lucide-react";

type TicketBodyProps = {
  ticket: TicketResponse | null | undefined;
};

export function TicketBody({ ticket }: TicketBodyProps) {
  const { t } = useTranslation();
  const [editorValue, setEditorValue] = useState(ticket?.description);
  const [isEditing, setIsEditing] = useState(false);
  const [finalDescription, setFinalDescription] = useState(ticket?.description);
  const { auth } = useAuth();
  const [comments, setComments] = useState(ticket?.comments);

  async function addComment(commentText: string): Promise<number> {
    try {
      const res = await api.post(`/tickets/${ticket?.id}/comments`, {
        comment: commentText,
        email: auth?.email,
        role: auth?.role,
      });
      const newCommentId = res.data.id;

      const commentsRes = await api.get(`/tickets/${ticket?.id}/comments`);
      setComments(commentsRes.data);

      return newCommentId;
    } catch (err: any) {
      console.error("Error adding comment:", err);
      const errorMessage = err.response?.data?.message || err.message || t('common.errors.generic');
      toast.error(errorMessage);
      throw err;
    }
  }

  async function deleteComment(commentId: number): Promise<void> {
    try {
      await api.delete(`/tickets/${ticket?.id}/comments/${commentId}`);

      const commentsRes = await api.get(`/tickets/${ticket?.id}/comments`);
      setComments(commentsRes.data);

      toast.success(t('ticket.commentDeleted', { default: 'Commentaire supprimé avec succès' }));
    } catch (err: any) {
      console.error("Error deleting comment:", err);
      const errorMessage = err.response?.data?.message || err.message || t('common.errors.generic');
      toast.error(errorMessage);
      throw err;
    }
  }

  function handleSubmit() {
    api
      .patch(`/tickets/${ticket?.id}`, {
        description: editorValue,
        modifierEmail: auth?.email,
        modifierRole: auth?.role,
      })
      .then(() => {
        setFinalDescription(editorValue);
        setIsEditing(false);
        toast.success(t('ticket.descriptionUpdated', { default: 'Description mise à jour avec succès' }));
      })
      .catch((err) => {
        console.error("Error updating ticket:", err);
        const errorMessage = err.response?.data?.message || err.message || t('common.errors.generic');
        toast.error(errorMessage);
      });
  }

  function handleCancel() {
    setEditorValue(finalDescription);
    setIsEditing(false);
  }

  const canEdit = auth?.role === "ADMIN" || auth?.role === "SUPPORT";

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                to={`/projects/${ticket?.project.id}/tickets`}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </Link>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Link to="/projects" className="hover:text-red-600 transition-colors">
                    Projets
                  </Link>
                  <span>/</span>
                  <Link
                    to={`/projects/${ticket?.project.id}/tickets`}
                    className="hover:text-red-600 transition-colors"
                  >
                    {ticket?.project.name}
                  </Link>
                  <span>/</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    Ticket #{ticket?.id}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2 flex items-center gap-2">
                  <span className="text-gray-400 text-xl">#{ticket?.id}</span>
                  {ticket?.title}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(ticket?.createdAt || Date.now()).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {ticket?.created?.firstName} {ticket?.created?.lastname}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Meta Information */}
        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 bg-gray-50 dark:bg-gray-800/30">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Statut</div>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${ticket?.status === "Nouveau" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
              ticket?.status === "EnCours" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                ticket?.status === "Terminé" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                  ticket?.status === "EnAttente" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
              }`}>
              {ticket?.status}
            </span>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Priorité</div>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${ticket?.priority === "Critical" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
              ticket?.priority === "High" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                ticket?.priority === "Medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              }`}>
              {ticket?.priority}
            </span>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Type</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">{ticket?.issueType || "Non défini"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Catégorie</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">{ticket?.category || "Non définie"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Assigné à</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {ticket?.assigned?.firstName || "Non assigné"}
            </div>
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
              <Edit2 className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Description</h3>
          </div>
          {canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Modifier
            </button>
          )}
        </div>
        <div className="p-6">
          {isEditing ? (
            <div className="space-y-4">
              <ReactQuill
                value={editorValue}
                onChange={(value) => setEditorValue(value)}
                modules={{
                  toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ["bold", "italic", "underline", "strike"],
                    [{ list: "ordered" }, { list: "bullet" }],
                    ["link", "clean"],
                  ],
                }}
                theme="snow"
                className="h-64 mb-4"
                placeholder="Décrivez le problème..."
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white transition-all flex items-center gap-2 shadow-md"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer
                </button>
              </div>
            </div>
          ) : (
            <div
              className="prose prose-sm max-w-none dark:prose-invert cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-4 rounded-xl transition-colors"
              onDoubleClick={() => canEdit && setIsEditing(true)}
            >
              <ReactQuill
                value={finalDescription}
                readOnly
                theme="bubble"
                className="text-gray-700 dark:text-gray-300"
              />
              {!finalDescription && (
                <p className="text-gray-400 italic text-center py-8">
                  Aucune description fournie
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
              <MessageCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Discussion ({comments?.length || 0})
            </h3>
          </div>
        </div>
        <div className="p-6">
          <Comments
            addComment={addComment}
            deleteComment={deleteComment}
            comments={comments}
            ticketId={ticket?.id}
          />
        </div>
      </div>
    </div>
  );
}