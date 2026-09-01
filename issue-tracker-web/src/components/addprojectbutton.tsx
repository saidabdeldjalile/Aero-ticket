import api from "../api/axios";
import { useState, useEffect } from "react";
import { mutate } from "swr";
import { toast } from "react-toastify";
import useAuth from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Department } from "../TicketResponse";

// interface MutateProps {
//   mutate: (key: string, data?: any, shouldRevalidate?: boolean) => Promise<any>;
//   swrKey: string;
// }

export default function AddProjectButton() {
  const { t } = useTranslation();
  const [projectName, setProjectName] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const { auth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch departments when component mounts
    api.get("/departments")
      .then((res) => {
        // Handle paginated responses - extract content array from Page object
        const deptsData = res.data?.content || res.data || [];
        setDepartments(Array.isArray(deptsData) ? deptsData : []);
      })
      .catch((err) => {
        console.error("Error fetching departments:", err);
        setDepartments([]);
      });
  }, []);

  function handleSubmit(e: any) {
    e.preventDefault();
    api
      .post("/projects", {
        name: projectName,
        departmentId: departmentId || null,
      })
      .then((_res) => {
        mutate("project");
        toast.success(t('project.createSuccess') || "Project added successfully");
      })
      .catch((err) => {
        console.error("Error adding project:", err);
        const status = err?.response?.status;
        if (status === 409 || status === 400) {
          toast.error(t('errors.duplicateProject'));
        } else {
          toast.error(t('errors.saveFailed'));
        }
      });
    setProjectName("");
    setDepartmentId("");
  }

  return (
    <>
      {/* Open the modal using document.getElementById('ID').showModal() method */}
      <button
        className="btn btn-primary tooltip tooltip-right"
        data-tip="Only Managers can add projects"
        onClick={() => {
          console.log(auth);
          if (!auth || !auth.email) {
            navigate("/login", { replace: true });
          } else if (auth.role === "ADMIN") {
            (
              document.getElementById("my_modal_6") as HTMLDialogElement
            )?.showModal();
          }
        }}
        // disabled={auth.role !== "ADMIN"}
      >
        Add Project
      </button>

      <dialog id="my_modal_6" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Project</h3>
          <p className="py-4">
            <input
              type="text"
              placeholder="Project Name"
              onChange={(e) => setProjectName(e.target.value)}
              className="input input-bordered w-full max-w-md mb-3"
            />
            <select
              className="select select-bordered w-full max-w-md"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </p>
          <span>
            <div className="modal-action">
              <form method="dialog">
                {/* if there is a button in form, it will close the modal */}
                <button
                  className="btn btn-success mx-2"
                  onClick={(e) => {
                    handleSubmit(e);
                    (
                      document.getElementById("my_modal_6") as HTMLDialogElement
                    )?.close();
                  }}
                >
                  Add
                </button>
                <button className=" btn ml-2 mr-2">Close</button>
              </form>
            </div>
          </span>
        </div>
      </dialog>
    </>
  );
}
