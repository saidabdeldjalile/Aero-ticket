import api from "./api/axios";
import { AxiosResponse } from "axios";
import { useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill";
import { mutate } from "swr";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import useAuth from "./hooks/useAuth";
import { useTranslation } from "react-i18next";

interface User {
  email: string;
  firstName: string;
  lastName: string;
}

interface IssueType {
  project: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  label: string;
  issueType: string;
  reporter: string;
  assignee: string;
}

interface Project {
  id: number;
  name: string;
}

interface similarTicket {
  id: number;
  title: string;
}

interface ScreenshotPreview {
  file: File;
  preview: string;
}

export default function CreateTicketBody({ refreshKey }: { refreshKey: number }) {
  const { auth } = useAuth();
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [similarTickets, setSimilarTickets] = useState<similarTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedScreenshots, setSelectedScreenshots] = useState<ScreenshotPreview[]>([]);
  const [isUploadingScreenshots, setIsUploadingScreenshots] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftAppliedRef = useRef(false);

  const [newIssue, setNewIssue] = useState<IssueType>({
    project: "",
    title: "",
    description: "",
    status: "",
    priority: "",
    category: "",
    label: "",
    issueType: "",
    reporter: auth?.email || "",
    assignee: "",
  });

  useEffect(() => {
    api
      .get("/users")
      .then((res: AxiosResponse) => {
        const usersData = res.data?.content || res.data || [];
        setUsers(Array.isArray(usersData) ? usersData : []);
      });

    api
      .get("/projects")
      .then((res: AxiosResponse) => {
        const projectsData = res.data?.content || res.data || [];
        setProjects(Array.isArray(projectsData) ? projectsData : []);
      });
  }, [refreshKey]);

  useEffect(() => {
    if (draftAppliedRef.current || projects.length === 0) {
      return;
    }

    const draftRaw = localStorage.getItem("chatbotTicketDraft");
    draftAppliedRef.current = true;

    if (!draftRaw) {
      return;
    }

    try {
      const draft = JSON.parse(draftRaw);
      setNewIssue((prev) => ({
        ...prev,
        project: draft.projectId ? String(draft.projectId) : prev.project,
        title: draft.title || prev.title,
        description: draft.description || prev.description,
        priority: draft.priority || prev.priority,
        category: draft.category || prev.category,
        reporter: auth?.email || prev.reporter,
      }));
      toast.success(t('createTicket.success'));
    } catch (error) {
      console.error("Error reading chatbot draft:", error);
    } finally {
      localStorage.removeItem("chatbotTicketDraft");
    }
  }, [projects, auth?.email, t]);

  function clearCreate(e: any) {
    e.preventDefault();
    setNewIssue({
      project: "",
      title: "",
      description: "",
      status: "",
      priority: "",
      category: "",
      label: "",
      issueType: "",
      reporter: auth?.email || "",
      assignee: "",
    });
    setSimilarTickets([]);
  }

  function handleChange(e: any) {
    setNewIssue({ ...newIssue, [e.target.name]: e.target.value });
  }

  function handleDescriptionChange(e: string) {
    setNewIssue({ ...newIssue, description: e });
  }

  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) {
        toast.error(t('createTicket.imageError', { default: 'Only image files are accepted' }));
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(t('createTicket.fileTooLarge', { default: 'File is too large (max 10MB)' }));
        return;
      }

      const preview = URL.createObjectURL(file);
      setSelectedScreenshots(prev => [...prev, { file, preview }]);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeScreenshot = (index: number) => {
    setSelectedScreenshots(prev => {
      const newScreenshots = [...prev];
      URL.revokeObjectURL(newScreenshots[index].preview);
      newScreenshots.splice(index, 1);
      return newScreenshots;
    });
  };

  const uploadScreenshots = async (ticketId: number) => {
    if (selectedScreenshots.length === 0) return;

    setIsUploadingScreenshots(true);
    try {
      for (const screenshot of selectedScreenshots) {
        const formData = new FormData();
        formData.append("file", screenshot.file);

        await api.post(`/tickets/${ticketId}/screenshots`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      toast.success(t('createTicket.screenshotsAdded', { count: selectedScreenshots.length }));
      setSelectedScreenshots([]);
    } catch (error) {
      console.error("Error uploading screenshots:", error);
      toast.error(t('createTicket.screenshotError', { default: 'Error adding screenshots' }));
    } finally {
      setIsUploadingScreenshots(false);
    }
  };

  const handleSubmitWithScreenshots = async (e: any) => {
    e.preventDefault();

    if (!newIssue.project || !newIssue.title) {
      toast.error(t('createTicket.requiredFields', { default: 'Project and title are required' }));
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.post("/tickets", {
        project: Number(newIssue.project),
        title: newIssue.title,
        description: newIssue.description,
        status: newIssue.status,
        priority: newIssue.priority,
        category: newIssue.category,
        reporter: newIssue.reporter || auth?.email,
        assignee: newIssue.assignee || null,
      });

      const ticketId = res.data.id;

      if (res.data.similarTickets && res.data.similarTickets.length > 0) {
        setSimilarTickets(res.data.similarTickets);
        toast.warning(t('createTicket.similarTickets'));
      }

      mutate("ticket");
      toast.success(t('createTicket.created', { id: ticketId }));

      if (selectedScreenshots.length > 0) {
        await uploadScreenshots(ticketId);
      }

      clearCreate(e);
      (document.getElementById("my_modal_5") as HTMLDialogElement)?.close();

    } catch (err: any) {
      setIsLoading(false);
      console.error("Error creating ticket:", err);

      let errorMessage = t('createTicket.error');
      if (err.response?.status === 500) {
        errorMessage = t('createTicket.errors.server', { default: 'Server error occurred. Please try again later or contact support.' });
      } else if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || t('createTicket.errors.invalid', { default: 'Invalid ticket data. Please check your input.' });
      } else if (err.response?.status === 401) {
        errorMessage = t('createTicket.errors.auth', { default: 'Authentication required. Please log in again.' });
      } else if (err.response?.status === 403) {
        errorMessage = t('createTicket.errors.forbidden', { default: 'Access denied. You don\'t have permission to create tickets.' });
      } else if (err.response?.status === 404) {
        errorMessage = t('createTicket.errors.notFound', { default: 'Server not found. Please check if the backend is running.' });
      } else if (err.response?.status === 503) {
        errorMessage = t('createTicket.errors.unavailable', { default: 'Service temporarily unavailable. Please try again later.' });
      } else if (!err.response) {
        errorMessage = t('createTicket.errors.network', { default: 'Network error. Please check your internet connection.' });
      } else {
        errorMessage = err.response?.data?.message || err.message || errorMessage;
      }

      toast.error(errorMessage);
    }
  };


  return (
    <div>
      <label className="form-control w-full max-w-xs p-3">
        <div className="label">
          <span className="label-text">{t('createTicket.project')} *</span>
        </div>
        <select
          name="project"
          value={newIssue.project}
          onChange={(e) => handleChange(e)}
          className="select select-bordered"
        >
          <option value="" disabled>
            {t('createTicket.selectProject')}
          </option>
          {projects.map((project: Project) => (
            <option value={project.id} key={project.id}>{project.name}</option>
          ))}
        </select>
      </label>
      <label className="form-control w-full max-w-xs p-3">
        <div className="label">
          <span className="label-text">{t('createTicket.title')} *</span>
        </div>
        <input
          type="text"
          placeholder={t('createTicket.titlePlaceholder', { default: 'Type here' })}
          name="title"
          value={newIssue.title}
          onChange={(e) => handleChange(e)}
          className="input input-bordered w-full max-w-xs"
        />
      </label>

      <div className=" inline-flex">
        <label className="form-control w-full max-w-xs p-3">
          <div className="label">
            <span className="label-text">{t('createTicket.issueType', { default: 'Issue Type' })}</span>
          </div>
          <select
            name="issueType"
            value={newIssue.issueType}
            onChange={(e) => handleChange(e)}
            className="select select-bordered"
          >
            <option disabled value="">
              {t('createTicket.selectIssueType')}
            </option>
            <option value="Bug">{t('createTicket.types.bug', { default: 'Bug' })}</option>
            <option value="Feature">{t('createTicket.types.feature', { default: 'Feature' })}</option>
            <option value="Task">{t('createTicket.types.task', { default: 'Task' })}</option>
            <option value="Improvement">{t('createTicket.types.improvement', { default: 'Improvement' })}</option>
          </select>
        </label>

        <label className="form-control w-full max-w-xs p-3">
          <div className="label">
            <span className="label-text">{t('ticket.status')}</span>
          </div>
          <select
            name="status"
            value={newIssue.status}
            onChange={(e) => handleChange(e)}
            className="select select-bordered"
          >
            <option value="" disabled>
              {t('createTicket.selectStatus')}
            </option>
            <option value="Open">{t('status.open')}</option>
            <option value="ToDo">{t('status.pending')}</option>
            <option value="InProgress">{t('status.inProgress')}</option>
            <option value="WaitingForUserResponse">{t('status.pending')}</option>
            <option value="Done">{t('status.resolved')}</option>
            <option value="Closed">{t('status.closed')}</option>
          </select>
        </label>
        <label className="form-control w-full max-w-xs p-3">
          <div className="label">
            <span className="label-text">{t('ticket.priority')}</span>
          </div>
          <select
            name="priority"
            value={newIssue.priority}
            onChange={(e) => handleChange(e)}
            className="select select-bordered"
          >
            <option disabled value="">
              {t('createTicket.selectPriority')}
            </option>
            <option value="High">{t('priority.high')}</option>
            <option value="Medium">{t('priority.medium')}</option>
            <option value="Low">{t('priority.low')}</option>
            <option value="Critical">{t('priority.critical')}</option>
          </select>
        </label>
        <label className="form-control w-full max-w-xs p-3">
          <div className="label">
            <span className="label-text">{t('ticket.category')}</span>
          </div>
          <select
            name="category"
            value={newIssue.category}
            onChange={(e) => handleChange(e)}
            className="select select-bordered"
          >
            <option value="" disabled>
              {t('createTicket.selectCategory')}
            </option>
            <option value="informatique">{t('createTicket.categories.it', { default: 'Informatique' })}</option>
            <option value="materiel">{t('createTicket.categories.material', { default: 'Matériel' })}</option>
            <option value="administratif">{t('createTicket.categories.admin', { default: 'Administratif' })}</option>
            <option value="maintenance">{t('createTicket.categories.maintenance', { default: 'Maintenance' })}</option>
            <option value="achat">{t('createTicket.categories.purchase', { default: 'Achat' })}</option>
            <option value="formation">{t('createTicket.categories.formation', { default: 'Formation' })}</option>
            <option value="autres">{t('common.other', { default: 'Autres' })}</option>
          </select>
        </label>
      </div>
      <label className="form-control p-3 pr-5">
        <div className="label">
          <span className="label-text">{t('ticket.description')}</span>
        </div>
      </label>

      <ReactQuill
        value={newIssue.description}
        onChange={(e) => handleDescriptionChange(e)}
        modules={{
          toolbar: [
            [{ header: "1" }, { header: "2" }, { font: [] }],
            [{ size: [] }],
            ["bold", "italic", "underline", "strike", "blockquote"],
            [
              { list: "ordered" },
              { list: "bullet" },
              { indent: "-1" },
              { indent: "+1" },
            ],
            ["link"],
            ["clean"],
          ],
        }}
        theme="snow"
      />

      {/* Screenshot Upload Section */}
      <div className="mt-4">
        <div className="label">
          <span className="label-text">{t('ticket.screenshots')}</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleScreenshotSelect}
            accept="image/*"
            multiple
            className="hidden"
            disabled={isUploadingScreenshots}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingScreenshots}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {t('createTicket.addScreenshots', { default: 'Add Screenshots' })}
          </button>
          <span className="text-xs text-gray-400">
            {t('createTicket.formats', { default: 'Formats: JPG, PNG, GIF, WebP (max 10MB)' })}
          </span>
        </div>

        {/* Screenshot Previews */}
        {selectedScreenshots.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedScreenshots.map((screenshot, index) => (
              <div key={index} className="relative group">
                <img
                  src={screenshot.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeScreenshot(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="inline-flex">
        <label className="form-control w-full max-w-xs flex-shrink-0 p-3">
          <div className="label">
            <span className="label-text">{t('ticket.assignedTo')}</span>
          </div>
          <select
            value={newIssue.assignee}
            className="select select-bordered"
            name="assignee"
            onChange={(e) => handleChange(e)}
          >
            <option value="" disabled>
              {t('createTicket.selectAssignee')}
            </option>
            {users.map((user: User) => (
              <option value={user.email} key={user.email}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control w-full max-w-xs flex-shrink-0 p-3">
          <div className="label">
            <span className="label-text">{t('ticket.createdBy')}</span>
          </div>
          <select
            value={newIssue.reporter}
            name="reporter"
            className="select select-bordered"
            onChange={(e) => handleChange(e)}
          >
            <option value="" disabled>
              {t('createTicket.selectReporter')}
            </option>
            {users.map((user: User) => (
              <option value={user.email} key={user.email}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>
        </label>
      </div>
      {isLoading && (
        <div className="flex items-center justify-center">
          <div className="p-3">
            <span className="font-bold">{t('createTicket.lookingForDuplicates', { default: 'Looking for Duplicates' })}</span>
          </div>
          <div>
            <progress className="progress w-56"></progress>
          </div>
        </div>
      )}
      {similarTickets &&
        similarTickets.length > 0 &&
        (console.log(similarTickets),
          (
            <>
              <div className="p-3">
                <span className="font-bold">{t('createTicket.possibleDuplicates', { default: 'Possible Duplicates' })}</span>
              </div>

              <div className="mx-6">
                <div className="overflow-x-auto">
                  <table className="table">
                    {/* head */}
                    <thead>
                      <tr>
                        <th>{t('ticket.ticket')} ID</th>
                        <th>{t('ticket.title')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {similarTickets?.map((similarTicket) => (
                        <tr key={similarTicket.id} className="hover">
                          <th>
                            <Link
                              to={`/projects/${newIssue.priority}/tickets/${similarTicket.id}`}
                            >
                              <span className=" opacity-60">#</span>
                              {similarTicket.id}
                            </Link>
                          </th>
                          <td>
                            <Link
                              to={`/projects/${newIssue.priority}/tickets/${similarTicket.id}`}
                            >
                              {similarTicket.title}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ))}

      <div className="modal-action">
        <form method="dialog">
          <button
            className="btn btn-primary m-1"
            onClick={(e) => {
              handleSubmitWithScreenshots(e);
            }}
            disabled={isLoading || isUploadingScreenshots}
          >
            {isUploadingScreenshots ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                {t('createTicket.creatingAndUploading', { default: 'Creating & Uploading...' })}
              </>
            ) : (
              t('createTicket.submit')
            )}
          </button>
        </form>
        <form method="dialog">
          <button
            className="btn btn-error m-1"
            onClick={(e) => {
              (
                document.getElementById("my_modal_5") as HTMLDialogElement
              )?.close();
              clearCreate(e);
            }}
          >
            {t('common.close')}
          </button>
        </form>
      </div>
    </div>
  );
}
