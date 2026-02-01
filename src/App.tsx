import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import AuthForm from "./components/AuthForm";
import CodeEditor from "./components/CodeEditor";
import InstructorEvaluation from "./components/InstructorEvaluation"; // Import the new component
import { Loader2 } from "lucide-react";

function App() {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null); // New state for role
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
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

  // Helper to get role from user_metadata (which you set during signup)
  const fetchRole = async (userId: string) => {
    // 1. Try fetching from metadata first (fastest)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.user_metadata?.role) {
      setRole(user.user_metadata.role);
    }
    // 2. Fallback: If you store role in a 'profiles' table, fetch it here
    // const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
    // if (data) setRole(data.role);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-cyan-500">
        <Loader2 className="animate-spin h-10 w-10" />
      </div>
    );
  }

  // === ROUTING LOGIC ===
  if (!session) return <AuthForm />;

  // Route based on Role
  if (role === "instructor") {
    return <InstructorEvaluation />;
  }

  return <CodeEditor />;
}

export default App;
