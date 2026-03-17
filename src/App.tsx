import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { supabase } from "./lib/supabaseClient";
import LandingPage from "./components/LandingPage";
import AuthForm from "./components/AuthForm";
import CodeEditor, { type DraftResume } from "./components/CodeEditor";
import InstructorEvaluation from "./components/InstructorEvaluation";
import InstructorDashboard from "./components/InstructorDashboard";
import StudentDashboard from "./components/StudentDashboard";
import ProblemList from "./components/ProblemList";
import PageLoader from "./components/PageLoader";
import FloatingChat from "./components/FloatingChat";
import TestimonialPrompt from "./components/TestimonialPrompt";

function App() {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // VIEW STATES (Maintained for internal component transitions)
  const [selectedProblem, setSelectedProblem] = useState<any>(null);
  const [resumeDraft, setResumeDraft] = useState<DraftResume | null>(null);

  useEffect(() => {
    // Check for auth errors in URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    
    const error = hashParams.get("error_description") || searchParams.get("error_description");
    const errorType = hashParams.get("error") || searchParams.get("error");

    if (error) {
      const decodedError = decodeURIComponent(error).replace(/\+/g, " ");
      toast.error(decodedError, { duration: 5000 });
      
      // Clean up the URL
      navigate(window.location.pathname, { replace: true });
      
      if (errorType === "access_denied" || error.includes("already registered")) {
        navigate("/auth?mode=login");
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole();
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
        navigate("/auth?mode=update_password");
      }

      setSession(session);
      if (session) fetchRole();
      else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const existingRole = user.user_metadata?.role;
      if (existingRole) {
        setRole(existingRole);
      } else {
        console.log("New Social User detected, assigning default: student");
        setRole("student");
        await supabase.auth.updateUser({ data: { role: "student" } });
      }
    }
    setLoading(false);
  };

  if (loading) return <PageLoader message="Authenticating..." />;

  // Protected Routes Wrapper
  const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole?: string }) => {
    if (!session) return <Navigate to="/" replace />;
    if (allowedRole && role !== allowedRole) return <Navigate to="/dashboard" replace />;
    return children;
  };

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#f1f5f9",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            fontSize: "13px",
          },
          success: { iconTheme: { primary: "#34d399", secondary: "#1e293b" } },
          error: { iconTheme: { primary: "#f87171", secondary: "#1e293b" } },
        }}
      />
      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={!session ? <LandingPage onGetStarted={(mode) => navigate(`/auth?mode=${mode}`)} /> : <Navigate to="/dashboard" replace />} />
        <Route path="/auth" element={!session || isPasswordRecovery ? <AuthForm initialMode={(new URLSearchParams(location.search).get("mode") as any) || "login"} /> : <Navigate to="/dashboard" replace />} />

        {/* Unified Dashboard Route */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            {role === "instructor" ? (
              <InstructorDashboard onNavigate={(view, subId) => {
                if (view === "evaluation" && subId) navigate(`/evaluation/${subId}`);
                else if (view === "problems") navigate("/problems");
                else navigate("/dashboard");
              }} />
            ) : (
              <StudentDashboard onNavigate={(view, draft) => {
                if (view === "problems") navigate("/problems");
                else if (view === "editor") {
                  if (draft) setResumeDraft(draft);
                  navigate("/editor");
                } else navigate("/dashboard");
              }} />
            )}
          </ProtectedRoute>
        } />

        <Route path="/problems" element={
          <ProtectedRoute>
            <ProblemList 
              role={role as any} 
              onNavigate={(view) => navigate(view === "dashboard" ? "/dashboard" : `/${view}`)} 
              onSelectProblem={(p) => {
                setSelectedProblem(p);
                navigate("/editor");
              }}
            />
          </ProtectedRoute>
        } />

        <Route path="/editor" element={
          <ProtectedRoute allowedRole="student">
            <CodeEditor 
              onNavigate={(view) => navigate(view === "dashboard" ? "/dashboard" : `/${view}`)} 
              problem={selectedProblem} 
              resumeDraft={resumeDraft} 
            />
          </ProtectedRoute>
        } />

        <Route path="/evaluation/:submissionId" element={
          <ProtectedRoute allowedRole="instructor">
            <InstructorEvaluation 
              onNavigate={(view) => navigate(view === "dashboard" ? "/dashboard" : `/${view}`)} 
            />
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {session && (
        <>
          <FloatingChat />
          <TestimonialPrompt userId={session.user.id} />
        </>
      )}
    </>
  );
}

export default App;

