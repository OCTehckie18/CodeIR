import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import AuthForm from "./components/AuthForm";
import CodeEditor from "./components/CodeEditor";
import InstructorEvaluation from "./components/InstructorEvaluation";
import StudentDashboard from "./components/StudentDashboard";
import { Loader2 } from "lucide-react";

function App() {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // View state: 'dashboard' or 'editor'
  const [currentView, setCurrentView] = useState<"editor" | "dashboard">(
    "dashboard",
  );

  useEffect(() => {
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

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-cyan-500">
        <Loader2 className="animate-spin h-10 w-10" />
      </div>
    );
  }

  if (!session) return <AuthForm />;

  if (role === "instructor") {
    return <InstructorEvaluation />;
  }

  // === STUDENT ROUTING ===
  const handleNavigate = (page: string) => {
    setCurrentView(page as "editor" | "dashboard");
  };

  return (
    <div>
      {currentView === "dashboard" ? (
        <StudentDashboard onNavigate={handleNavigate} />
      ) : (
        // FIX: Pass the navigation function here too!
        <CodeEditor onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default App;
