import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
// import ThemeToggle from "./ThemeToggle";
import {
  LayoutDashboard,
  BookOpen,
  Code as CodeIcon,
  LogOut,
  ClipboardCheck,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// NavBar — shared top navigation bar used across every page.
//
// For STUDENTS:  Dashboard | Problem Bank | Editor
// For INSTRUCTORS: Dashboard | Problem Bank | Evaluation
//
// Props:
//   role      — "student" | "instructor"
//   active    — which tab is currently active (highlighted)
//   onNavigate — callback to switch views in App.tsx
//   email     — email of the logged-in user (shown in top right)
// ─────────────────────────────────────────────────────────────

type StudentView = "dashboard" | "problems" | "editor";
type InstructorView = "dashboard" | "problems" | "evaluation";

interface NavBarProps {
  role: "student" | "instructor" | "teacher";
  active: StudentView | InstructorView;
  onNavigate: (view: any) => void;
  email?: string;
}

export default function NavBar({
  role,
  active,
  onNavigate,
  email,
}: NavBarProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleNav = (view: string) => {
    if (view === "dashboard") navigate("/dashboard");
    else if (view === "problems") navigate("/problems");
    else if (view === "editor") navigate("/editor");
    else if (view === "evaluation") navigate("/evaluation");
    else if (onNavigate) onNavigate(view);
  };

  // Shared tab base class
  const tabBase =
    "flex items-center gap-2 font-bold tracking-wide transition-colors cursor-pointer select-none";
  const tabInactive =
    "text-slate-600 dark:text-slate-400 hover:text-cyan-400 pb-0.5";

  const sep = <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />;

  // ── Student Nav ──
  if (role === "student") {
    return (
      <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-slate-300 dark:border-slate-800 bg-white/90 dark:bg-slate-900/50 backdrop-blur-md z-50 flex-shrink-0">
        <nav className="flex items-center gap-5">
          {/* Dashboard */}
          <div
            id="nav-dashboard"
            className={`${tabBase} ${active === "dashboard" ? `text-red-400 border-b-2 border-red-400 pb-0.5` : tabInactive}`}
            onClick={() => handleNav("dashboard")}
          >
            <LayoutDashboard size={20} />
            <span>DASHBOARD</span>
          </div>

          {sep}

          {/* Problem Bank */}
          <div
            id="nav-problems"
            className={`${tabBase} ${active === "problems" ? `text-cyan-400 border-b-2 border-cyan-400 pb-0.5` : tabInactive}`}
            onClick={() => handleNav("problems")}
          >
            <BookOpen size={20} />
            <span>PROBLEM BANK</span>
          </div>

          {sep}

          {/* Sandbox / Editor */}
          <div
            id="nav-editor"
            className={`${tabBase} ${active === "editor" ? `text-cyan-400 border-b-2 border-cyan-400 pb-0.5` : tabInactive}`}
            onClick={() => handleNav("editor")}
          >
            <CodeIcon size={20} />
            <span>EDITOR</span>
          </div>
        </nav>

        <div className="flex items-center gap-4">
          {/* <ThemeToggle /> */}
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Student Account
            </p>
            <p className="text-sm font-medium text-blue-300 truncate max-w-[160px]">
              {email}
            </p>
          </div>
          <button
            id="nav-logout"
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-full hover:bg-red-500/10 transition-colors group"
          >
            <LogOut
              size={18}
              className="text-slate-500 dark:text-slate-400 group-hover:text-red-400 transition-colors"
            />
          </button>
        </div>
      </header>
    );
  }

  // ── Instructor Nav ──
  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-slate-300 dark:border-slate-800 bg-white/90 dark:bg-slate-900/50 backdrop-blur-md z-50 flex-shrink-0">
      <nav className="flex items-center gap-5">
        {/* Dashboard */}
        <div
          id="nav-dashboard"
          className={`${tabBase} ${active === "dashboard" ? `text-red-400 border-b-2 border-red-400 pb-0.5` : tabInactive}`}
          onClick={() => handleNav("dashboard")}
        >
          <LayoutDashboard size={20} />
          <span>DASHBOARD</span>
        </div>

        {sep}

        {/* Problem Bank */}
        <div
          id="nav-problems"
          className={`${tabBase} ${active === "problems" ? `text-cyan-400 border-b-2 border-cyan-400 pb-0.5` : tabInactive}`}
          onClick={() => handleNav("problems")}
        >
          <BookOpen size={20} />
          <span>PROBLEM BANK</span>
        </div>

        {sep}

        {/* Evaluation */}
        <div
          id="nav-evaluation"
          className={`${tabBase} ${active === "evaluation" ? `text-emerald-400 border-b-2 border-emerald-400 pb-0.5` : tabInactive}`}
          onClick={() => handleNav("evaluation")}
        >
          <ClipboardCheck size={20} />
          <span>EVALUATION</span>
        </div>
      </nav>

      <div className="flex items-center gap-4">
        {/* <ThemeToggle /> */}
        <div className="text-right hidden sm:block">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Instructor Account
          </p>
          <p className="text-sm font-medium text-red-300 truncate max-w-[160px]">
            {email}
          </p>
        </div>
        <button
          id="nav-logout"
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 rounded-full hover:bg-red-500/10 transition-colors group"
        >
          <LogOut
            size={18}
            className="text-slate-500 dark:text-slate-400 group-hover:text-red-400 transition-colors"
          />
        </button>
      </div>
    </header>
  );
}
