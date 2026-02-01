import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient"; // Adjust path if needed
import AuthForm from "./components/AuthForm"; // Adjust path if needed
import CodeEditor from "./components/CodeEditor"; // Adjust path if needed
import { Loader2 } from "lucide-react";

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check active session immediately when app loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Set up a listener for changes (login, logout, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => subscription.unsubscribe();
  }, []);

  // Show a loading spinner while checking auth status
  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-cyan-500">
        <Loader2 className="animate-spin h-10 w-10" />
      </div>
    );
  }

  // THE DECISION LOGIC:
  return (
    <div>
      {session ? (
        // If logged in, show the Editor
        <CodeEditor />
      ) : (
        // If NOT logged in, show the Auth Form
        <AuthForm />
      )}
    </div>
  );
}

export default App;
