import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import AuthForm from "./components/AuthForm";
import CodeEditor from "./components/CodeEditor";
import InstructorEvaluation from "./components/InstructorEvaluation"; // Updated Import
import InstructorDashboard from "./components/InstructorDashboard"; // New Import
import StudentDashboard from "./components/StudentDashboard";
import ProblemList from "./components/ProblemList"; // New Import
import logo from "./assets/no-bg-white-logo.png";

function App() {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // VIEW STATES
  const [studentView, setStudentView] = useState<"editor" | "dashboard" | "problems">(
    "dashboard",
  );
  const [selectedProblem, setSelectedProblem] = useState<any>(null); // To pass problem to editor

  // INSTRUCTOR STATES
  const [instructorView, setInstructorView] = useState<
    "dashboard" | "evaluation" | "problems"
  >("dashboard");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    // ... (Your existing auth useEffect logic remains the same) ...
    // Just ensure fetching role works as before
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole();
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchRole();
      else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.user_metadata?.role) {
      setRole(user.user_metadata.role);
    }
    setLoading(false);
  };

  if (loading)
    return <img src={logo} alt="Loading..." className="animate-float h-16 w-16 opacity-80 m-auto" />;
  if (!session) return <AuthForm />;

  // === INSTRUCTOR ROUTING ===
  if (role === "instructor") {
    if (instructorView === "dashboard") {
      return (
        <InstructorDashboard
          onNavigate={(view, subId) => {
            setInstructorView(view);
            setSelectedSubmissionId(subId);
          }}
        />
      );
    } else if (instructorView === "evaluation") {
      return (
        <InstructorEvaluation
          submissionId={selectedSubmissionId}
          onBack={() => {
            setInstructorView("dashboard");
            setSelectedSubmissionId(undefined);
          }}
        />
      );
    } else if (instructorView === "problems") {
      return (
        <ProblemList role="instructor" onNavigate={setInstructorView} />
      );
    }
  }

  // === STUDENT ROUTING ===
  return (
    <div>
      {studentView === "dashboard" ? (
        <StudentDashboard onNavigate={setStudentView} />
      ) : studentView === "problems" ? (
        <ProblemList
          role="student"
          onNavigate={setStudentView}
          onSelectProblem={(problem) => {
            setSelectedProblem(problem);
            setStudentView("editor");
          }}
        />
      ) : (
        <CodeEditor onNavigate={setStudentView} problem={selectedProblem} />
      )}
    </div>
  );
}

export default App;
