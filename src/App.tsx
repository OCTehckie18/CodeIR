import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import AuthForm from "./components/AuthForm";
import CodeEditor from "./components/CodeEditor";
import InstructorEvaluation from "./components/InstructorEvaluation"; // Updated Import
import InstructorDashboard from "./components/InstructorDashboard"; // New Import
import StudentDashboard from "./components/StudentDashboard";
import { Loader2 } from "lucide-react";

function App() {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // VIEW STATES
  const [studentView, setStudentView] = useState<"editor" | "dashboard">(
    "dashboard",
  );

  // INSTRUCTOR STATES
  const [instructorView, setInstructorView] = useState<
    "dashboard" | "evaluation"
  >("dashboard");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    // ... (Your existing auth useEffect logic remains the same) ...
    // Just ensure fetching role works as before
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.user_metadata?.role) {
      setRole(user.user_metadata.role);
    }
    setLoading(false);
  };

  if (loading)
    return <Loader2 className="animate-spin h-10 w-10 text-cyan-500 m-auto" />;
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
    } else {
      return (
        <InstructorEvaluation
          submissionId={selectedSubmissionId}
          onBack={() => {
            setInstructorView("dashboard");
            setSelectedSubmissionId(undefined);
          }}
        />
      );
    }
  }

  // === STUDENT ROUTING ===
  return (
    <div>
      {studentView === "dashboard" ? (
        <StudentDashboard onNavigate={setStudentView} />
      ) : (
        <CodeEditor onNavigate={setStudentView} />
      )}
    </div>
  );
}

export default App;
