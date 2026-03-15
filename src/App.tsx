import { useState, useEffect } from "react";
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
  // Landing page gate — show landing for unauthenticated visitors
  const [showLanding, setShowLanding] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup" | "update_password">("login");
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // VIEW STATES
  const [studentView, setStudentView] = useState<
    "editor" | "dashboard" | "problems"
  >("dashboard");
  const [selectedProblem, setSelectedProblem] = useState<any>(null);
  const [resumeDraft, setResumeDraft] = useState<DraftResume | null>(null);

  // INSTRUCTOR STATES
  const [instructorView, setInstructorView] = useState<
    "dashboard" | "evaluation" | "problems"
  >("dashboard");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    // Check for auth errors in URL (e.g. from GitHub/Google redirects)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    
    const error = hashParams.get("error_description") || searchParams.get("error_description");
    const errorType = hashParams.get("error") || searchParams.get("error");

    if (error) {
      const decodedError = decodeURIComponent(error).replace(/\+/g, " ");
      toast.error(decodedError, { duration: 5000 });
      
      // Clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // If it's a "User already registered" error, we should probably stay on the Login page
      if (errorType === "access_denied" || error.includes("already registered")) {
        setShowLanding(false);
        setAuthMode("login");
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole();
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("update_password");
        setIsPasswordRecovery(true);
        setShowLanding(false); // Make sure they see the auth form
      }

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
    
    if (user) {
      const existingRole = user.user_metadata?.role;
      
      if (existingRole) {
        setRole(existingRole);
      } else {
        // Social Login user with no role assigned yet
        console.log("New Social User detected, assigning default: student");
        
        // 1. Set local state so they can see the dashboard immediately
        setRole("student");
        
        // 2. Persist this role to Supabase metadata for future logins
        await supabase.auth.updateUser({
          data: { role: "student" }
        });
      }
    }
    setLoading(false);
  };

  if (loading) return <PageLoader message="Authenticating..." />;

  if (!session || isPasswordRecovery) {
    if (showLanding && !isPasswordRecovery) {
      return (
        <LandingPage
          onGetStarted={(mode) => {
            setAuthMode(mode);
            setShowLanding(false);
          }}
        />
      );
    }
    return <AuthForm initialMode={authMode} />;
  }

  const renderAppContent = () => {
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
            onNavigate={(view) => {
              setInstructorView(view);
              if (view !== "evaluation") setSelectedSubmissionId(undefined);
            }}
          />
        );
      } else if (instructorView === "problems") {
        return <ProblemList role="instructor" onNavigate={setInstructorView} />;
      }
    }

    // === STUDENT ROUTING ===
    return (
      <div>
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
        {studentView === "dashboard" ? (
          <StudentDashboard
            onNavigate={(view, draft?: DraftResume | null) => {
              setResumeDraft(draft ?? null);
              setSelectedProblem(null);
              setStudentView(view);
            }}
          />
        ) : studentView === "problems" ? (
          <ProblemList
            role="student"
            onNavigate={(view) => {
              setResumeDraft(null);
              setStudentView(view);
            }}
            onSelectProblem={(problem) => {
              setSelectedProblem(problem);
              setResumeDraft(null);
              setStudentView("editor");
            }}
          />
        ) : (
          <CodeEditor
            onNavigate={(view) => {
              setResumeDraft(null);
              setStudentView(view);
            }}
            problem={selectedProblem}
            resumeDraft={resumeDraft}
          />
        )}
      </div>
    );
  };

  return (
    <>
      {renderAppContent()}
      <FloatingChat />
      <TestimonialPrompt userId={session.user.id} />
    </>
  );
}

export default App;
