import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Loader2, Code, Settings, Atom, ChevronDown } from "lucide-react";
import logo from "../assets/no-bg-white-logo.png";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "instructor">("student");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setMsg(null);
  }, [mode]);

  const handleAuthAction = async (
    action: "login" | "signup",
    e?: React.FormEvent,
  ) => {
    if (e) e.preventDefault();
    setMode(action);

    if (!email || !password) {
      setMsg({ type: "error", text: "Please fill in all fields." });
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      if (action === "signup") {
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
            text: "Signup initiated. Check email for confirmation.",
          });
          setLoading(false); // Stop loading so user can see the message
        } else {
          // If session exists immediately (auto-confirm), App.tsx will handle the switch
          setMsg({ type: "success", text: "Account created! Redirecting..." });
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
    <div className="flex w-full min-h-dvh lg:h-screen bg-slate-950 text-white overflow-hidden font-sans">
      {/* ================= LEFT PANEL (Visuals) ================= */}
      <div className="hidden lg:flex w-1/2 h-full relative flex-col justify-center items-center bg-gradient-to-br from-blue-900 via-slate-900 to-black p-12 overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute top-[-20%] left-[-20%] w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-12 w-full max-w-lg">
          {/* Logo Placeholder */}
          <div className="flex items-center gap-3 group cursor-default h-full w-full">
            <img
              src={logo}
              alt="CodeIR Logo"
              className="h-full w-full object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Graphic Cards */}
          <div className="w-full space-y-5">
            {[
              { Icon: Code, glow: "top", name: "Describe" },
              { Icon: Settings, glow: "middle", name: "Re-invent" },
              { Icon: Atom, glow: "bottom", name: "Evaluate" },
            ].map((Item, idx) => (
              <div
                key={idx}
                className="group relative flex items-center justify-between p-5 xl:p-6 rounded-2xl border border-cyan-500/30 bg-slate-900/40 backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.1)] transition-all duration-300 hover:shadow-[0_0_50px_rgba(6,182,212,0.25)] hover:border-cyan-400/60 hover:-translate-y-1"
              >
                <span className="text-xl xl:text-2xl font-semibold text-white tracking-wide">
                  {Item.name}
                </span>
                <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                  <Item.Icon className="w-6 h-6 xl:w-8 xl:h-8 text-cyan-400" />
                </div>
                <div
                  className={`absolute top-[-1px] left-1/2 -translate-x-1/2 w-1/3 h-[2px] bg-cyan-400 rounded-full blur-[2px] shadow-[0_0_10px_cyan] opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= RIGHT PANEL (Form) ================= */}
      <div className="flex w-full lg:w-1/2 h-full items-center justify-center p-6 sm:p-12 relative overflow-y-auto bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 lg:hidden pointer-events-none" />

        <div className="relative z-10 w-full max-w-[380px] space-y-8">
          <div className="flex flex-col items-center justify-center mb-8 sm:mb-12">
            {/* RESPONSIVE LOGO: Shows only on mobile/tablet (hidden on lg+) */}
            <img
              src={logo}
              alt="CodeIR Logo"
              className="lg:hidden h-full w-full object-contain mb-6 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] animate-fade-in"
            />

            <div className="animate-fade-in-up text-center">
              <p className="text-lg xl:text-xl tracking-[0.2em] text-slate-300 font-light uppercase">
                {mode === "login" ? "Welcome Back" : "Create Account"}
              </p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-slate-500 ml-1 font-semibold">
                Email
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:bg-slate-900/80 transition-all shadow-inner"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-slate-500 ml-1 font-semibold">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:bg-slate-900/80 transition-all shadow-inner"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Role is only useful during Signup */}
            {mode === "signup" && (
              <div className="space-y-1 animate-fade-in">
                <label className="text-xs uppercase tracking-wider text-slate-500 ml-1 font-semibold">
                  Role
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3.5 text-slate-200 focus:outline-none focus:border-cyan-500 focus:bg-slate-900/80 transition-all cursor-pointer shadow-inner"
                    value={role}
                    onChange={(e) =>
                      setRole(e.target.value as "student" | "instructor")
                    }
                    disabled={loading}
                  >
                    <option value="student" className="bg-slate-900">
                      Student
                    </option>
                    <option value="instructor" className="bg-slate-900">
                      Instructor
                    </option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={(e) => handleAuthAction("login", e)}
                disabled={loading}
                className={`flex-1 py-3.5 rounded-lg font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center
                  ${
                    loading && mode === "login"
                      ? "bg-cyan-700 cursor-not-allowed"
                      : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transform hover:-translate-y-0.5"
                  }
                `}
              >
                {loading && mode === "login" ? (
                  <Loader2 className="animate-spin w-5 h-5 text-white" />
                ) : (
                  "Login"
                )}
              </button>

              <button
                type="button"
                onClick={(e) => handleAuthAction("signup", e)}
                disabled={loading}
                className={`flex-1 py-3.5 rounded-lg font-bold text-sm tracking-wide border transition-all duration-200 flex items-center justify-center
                   border-slate-600 text-slate-400 hover:text-white hover:bg-white/5 hover:border-slate-400
                   ${loading && mode === "signup" ? "opacity-70 cursor-not-allowed" : ""}
                `}
              >
                {loading && mode === "signup" ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  "Create Account"
                )}
              </button>
            </div>

            {msg && (
              <div
                className={`mt-4 text-center text-sm p-3 rounded-lg border backdrop-blur-sm animate-fade-in ${msg.type === "success" ? "text-green-300 border-green-800 bg-green-900/30" : "text-red-300 border-red-800 bg-red-900/30"}`}
              >
                {msg.text}
              </div>
            )}
          </form>

          <div className="pt-6 text-center">
            <p className="text-slate-600 text-xs font-medium uppercase tracking-widest">
              *Academic use only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
