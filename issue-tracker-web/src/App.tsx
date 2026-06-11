import { Route, Routes } from "react-router-dom";

import Layout from "./layout";

import Loginform from "./loginform";
import ForgotPassword from "./forgotpassword";
import ResetPassword from "./resetpassword";
import ProjectList from "./projectlist";
import DepartmentList from "./departmentlist";
import Registrationform from "./registrationform";
import Testing from "./test";
import { Ticket } from "./ticket";
import RequireAuth from "./requireauth";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Themes from "./components/themes";
import Home from "./Home";
import AllTickets from "./alltickets";
import Settings from "./settings";
import UserList from "./userlist";
import NotificationsPage from "./notifications";
import Dashboard from "./components/dashboard/Dashboard";
import KnowledgeCenter from "./knowledgecenter";
import SlaPage from "./sla";
import CategoryList from "./categorylist";

// Helper function to get current theme
const getToastTheme = () => {
  const html = document.documentElement;
  const theme = html.getAttribute('data-theme') || 'light';
  return theme === 'dark' ? 'dark' : 'light';
};

export default function App() {
  // const navigate = useNavigate();

  // useEffect(() => {
  //   navigate("/projects");
  // }, []);
  return (
    <>
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={getToastTheme()}

      // transition: Bounce,
      />
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* <Route index element={<Navigate to="/projects" replace />} /> */}
          <Route index element={<Home />} />
          <Route path="/register" element={<Registrationform />} />
          <Route path="/login" element={<Loginform />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<RequireAuth />}>
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/:pid/tickets" element={<Testing />} />
            <Route path="/projects/:pid/tickets/:id" element={<Ticket />} />
            <Route path="/tickets" element={<Testing />} />
            <Route path="/my-tickets" element={<AllTickets />} />
            <Route path="/tickets/:id" element={<Ticket />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/users" element={<UserList />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/knowledge" element={<KnowledgeCenter />} />
            <Route path="/departments" element={<DepartmentList />} />
            <Route path="/sla" element={<SlaPage />} />
            <Route path="/categories" element={<CategoryList />} />
            {/* <Route path="/create" element={<CreateTicketBody />} /> */}
          </Route>
          <Route path="/themes" element={<Themes />} />
          <Route path="*" element={<h1>Not Found</h1>} />
        </Route>
      </Routes>
    </>
  );
}
