import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Code, Settings, Atom, ChevronDown } from "lucide-react";
import logo from "../assets/no-bg-white-logo.png";

export default function AuthForm({ initialMode = "login" }: { initialMode?: "login" | "signup" | "update_password" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "instructor">("student");
  const [mode, setMode] = useState<"login" | "signup" | "forgot_password" | "update_password">(initialMode);
  const [aiEngine, setAiEngine] = useState<"ollama" | "gemini">(
    (localStorage.getItem("aiEngine") as "ollama" | "gemini") || "ollama",
  );
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setMsg(null);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("aiEngine", aiEngine);
  }, [aiEngine]);

  const toggleMode = () => {
    setMode((prev) => (prev === "login" ? "signup" : "login"));
    setEmail("");
    setPassword("");
    setMsg(null);
  };

  const switchToForgotPassword = () => {
    setMode("forgot_password");
    setMsg(null);
  };

  const switchToLogin = () => {
    setMode("login");
    setMsg(null);
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "forgot_password" && !email) {
      setMsg({ type: "error", text: "Please enter your email." });
      return;
    }
    if (mode === "update_password" && !password) {
      setMsg({ type: "error", text: "Please enter your new password." });
      return;
    }
    if ((mode === "login" || mode === "signup") && (!email || !password)) {
      setMsg({ type: "error", text: "Please fill in all fields." });
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      if (mode === "forgot_password") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin, // You may need to specify /reset or handle via onAuthStateChange
        });
        if (error) throw error;
        setMsg({
          type: "success",
          text: "Recovery email sent. Please check your inbox.",
        });
        setLoading(false);
        return; // Wait for user to check email
      } else if (mode === "update_password") {
        const { error } = await supabase.auth.updateUser({
          password: password,
        });
        if (error) throw error;
        setMsg({
          type: "success",
          text: "Password updated successfully! Redirecting...",
        });
        setLoading(false);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      } else if (mode === "signup") {
        // --- SIGNUP LOGIC ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          // We save the role in metadata so we don't need a separate 'profiles' table write right now
          options: {
            data: { role: role },
          },
        });

        if (error) throw error;

        if (data.user && !data.session) {
          setMsg({
            type: "success",
            text: "Signup initiated. Check email for confirmation. Refreshing...",
          });
          setLoading(false); // Stop loading so user can see the message
          setTimeout(() => window.location.reload(), 2500);
        } else {
          // If session exists immediately (auto-confirm), App.tsx will handle the switch
          setMsg({ type: "success", text: "Account created! Redirecting..." });
          setTimeout(() => window.location.reload(), 2000);
        }
      } else {
        // --- LOGIN LOGIC ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // No need to manually navigate or setMsg here.
        // Supabase fires 'onAuthStateChange' automatically.
        // App.tsx catches it -> Unmounts this form -> Mounts CodeEditor.
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Authentication failed" });
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-dvh lg:h-screen bg-[#050510] relative text-slate-900 dark:text-white overflow-hidden font-sans">
      {/* Dynamic Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-cyan-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-800/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[30%] w-[30vw] h-[30vw] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      {/* Grid Pattern overlay for tech feel */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6bTIwIDIwaDIwdjIwSDIweiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIwLjAyIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] opacity-20 pointer-events-none mix-blend-overlay"></div>

      {/* Decorative large logo in background */}
      <img
        src={logo}
        alt=""
        onClick={() => window.location.assign("/")}
        className="absolute -left-32 top-1/2 -translate-y-1/2 w-[800px] opacity-[0.03] rotate-[-15deg] cursor-pointer"
      />

      {/* ================= LEFT PANEL (Hero / Features) ================= */}
      <div className="hidden lg:flex w-1/2 h-full relative flex-col justify-center items-start p-16 xl:p-24 overflow-hidden z-10">
        <div className="mb-10 w-full max-w-xl">
          <div className="flex items-center gap-4 mb-8 cursor-pointer" onClick={() => window.location.assign("/")}>
            <img
              src={logo}
              alt="CodeIR Logo"
              className="h-12 w-auto drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]"
            />
            <span className="text-3xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              | CodeIR
            </span>
          </div>

          <h1 className="text-5xl xl:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Next-Gen Code <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Evaluation Engine
            </span>
          </h1>
          <p className="text-lg xl:text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed font-light">
            An intelligent platform offering real-time code evaluation,
            AI-driven insights with multiple models, and seamless collaboration
            between students and instructors.
          </p>
        </div>

        {/* Feature Cards in Glassmorphism */}
        <div className="grid grid-cols-1 gap-4 w-full max-w-xl">
          {[
            {
              Icon: Code,
              title: "Intelligent Coding",
              desc: "Write, test, and instantly evaluate code within an interactive environment.",
            },
            {
              Icon: Settings,
              title: "Multi-Model AI",
              desc: "Powered by edge-local Ollama and scalable cloud Gemini API.",
            },
            {
              Icon: Atom,
              title: "Real-time Metrics",
              desc: "Get comprehensive evaluation reports and instructor feedback.",
            },
          ].map((Item, idx) => (
            <div
              key={idx}
              className="group relative flex items-center gap-5 p-5 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300 hover:bg-white/[0.04] hover:border-cyan-500/30 hover:-translate-y-1"
            >
              <div className="p-3 bg-cyan-500/10 rounded-xl group-hover:bg-cyan-500/20 transition-colors shadow-[inset_0_0_10px_rgba(6,182,212,0.1)]">
                <Item.Icon className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-wide mb-1">
                  {Item.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {Item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= RIGHT PANEL (Form) ================= */}
      <div className="flex w-full lg:w-1/2 h-full items-center justify-center p-6 sm:p-12 relative z-10 overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent lg:hidden pointer-events-none" />

        {/* Glassmorphism Form Container */}
        <div className="w-full max-w-[420px] p-8 sm:p-10 rounded-[2rem] border border-black/10 dark:border-white/10 bg-white/[0.03] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative">
          {/* Subtle inner highlight */}
          <div className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none mix-blend-overlay"></div>

          <div className="flex flex-col items-center justify-center mb-8 relative z-10">
            {/* RESPONSIVE LOGO: Shows only on mobile */}
            <img
              src={logo}
              alt="CodeIR Logo"
              onClick={() => window.location.assign("/")}
              className="lg:hidden h-16 w-auto object-contain mb-6 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] animate-fade-in cursor-pointer"
            />

            <div className="animate-fade-in-up text-center w-full">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
                {mode === "login" ? "Welcome Back" : 
                 mode === "signup" ? "Create Account" : 
                 mode === "forgot_password" ? "Reset Password" : "Update Password"}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {mode === "login"
                  ? "Enter your credentials to access your workspace."
                  : mode === "signup"
                  ? "Sign up to start evaluating your code intelligently."
                  : mode === "forgot_password"
                  ? "Enter your email to receive a password reset link."
                  : "Enter your new password below."}
              </p>
            </div>
          </div>

          <form className="space-y-5 relative z-10" onSubmit={handleAuthAction}>
            {mode !== "update_password" && (
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 ml-1 font-semibold">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="w-full bg-black/20 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3.5 text-slate-800 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 focus:bg-black/40 transition-all shadow-inner"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            {mode !== "forgot_password" && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 ml-1 font-semibold">
                    {mode === "update_password" ? "New Password" : "Password"}
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={switchToForgotPassword}
                      className="text-xs text-cyan-500 hover:text-cyan-400 transition-colors mr-1"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-black/20 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3.5 text-slate-800 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 focus:bg-black/40 transition-all shadow-inner"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            {/* Role is only useful during Signup */}
            {mode === "signup" && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 ml-1 font-semibold">
                  Role
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-black/20 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:bg-black/40 transition-all cursor-pointer shadow-inner"
                    value={role}
                    onChange={(e) =>
                      setRole(e.target.value as "student" | "instructor")
                    }
                    disabled={loading}
                  >
                    <option value="student" className="bg-[#0f172a]">
                      Student
                    </option>
                    <option value="instructor" className="bg-[#0f172a]">
                      Instructor
                    </option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 dark:text-slate-400">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all duration-300 flex items-center justify-center
                  ${
                    loading
                      ? "bg-cyan-700/50 text-slate-900 dark:text-white cursor-not-allowed"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-900 dark:text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transform hover:-translate-y-0.5"
                  }
                `}
              >
                {loading ? (
                  <img
                    src={logo}
                    alt="Loading"
                    className="animate-float w-6 h-6 object-contain"
                  />
                ) : mode === "login" ? (
                  "Login"
                ) : mode === "signup" ? (
                  "Create Account"
                ) : mode === "forgot_password" ? (
                  "Send Reset Link"
                ) : (
                  "Update Password"
                )}
              </button>

              {mode === "forgot_password" ? (
                <button
                  type="button"
                  onClick={switchToLogin}
                  disabled={loading}
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-cyan-400 transition-colors text-center w-full font-medium"
                >
                  Back to login
                </button>
              ) : mode !== "update_password" ? (
                <button
                  type="button"
                  onClick={toggleMode}
                  disabled={loading}
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-cyan-400 transition-colors text-center w-full font-medium"
                >
                  {mode === "login"
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Log in"}
                </button>
              ) : null}
            </div>

            <div className="pt-6 animate-fade-in space-y-2 border-t border-black/10 dark:border-white/10 mt-6 relative z-10">
              <label className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 ml-1 font-semibold flex items-center gap-2">
                <Atom size={14} className="text-cyan-400" /> AI Evaluation
                Engine
              </label>
              <div className="relative">
                <select
                  className="w-full appearance-none bg-black/20 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500/50 focus:bg-black/40 transition-all cursor-pointer shadow-inner"
                  value={aiEngine}
                  onChange={(e) =>
                    setAiEngine(e.target.value as "ollama" | "gemini")
                  }
                >
                  <option value="ollama" className="bg-[#0f172a]">
                    Ollama (Local / CPU)
                  </option>
                  <option value="gemini" className="bg-[#0f172a]">
                    Gemini (Cloud API)
                  </option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-500">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            {msg && (
              <div
                className={`mt-4 text-center text-sm p-3 rounded-xl border backdrop-blur-md animate-fade-in ${msg.type === "success" ? "text-green-300 border-green-500/30 bg-green-500/10" : "text-red-300 border-red-500/30 bg-red-500/10"}`}
              >
                {msg.text}
              </div>
            )}
          </form>

          <div className="pt-6 text-center relative z-10">
            <p className="text-slate-500 dark:text-slate-500 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
              In Development Phase
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
