import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { supabase } from "../lib/supabaseClient";
import {
  Code as CodeIcon,
  Brain,
  FileJson,
  Languages,
  Play,
  Save,
  LayoutDashboard,
  LogOut, // <--- Ensure LogOut is imported here
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function CodeEditor() {
  // --- 1. INSERT THE LOGOUT FUNCTION HERE (Inside the component, before return) ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    // The App.tsx listener will automatically switch you back to AuthForm!
  };

  // State Management
  const [code, setCode] = useState("// Write your source code here...");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [loading, setLoading] = useState(false);
  const [aiHints, setAiHints] = useState<string[]>([
    "Write a function to optimize the IR...",
    "Check for null pointers in your logic.",
  ]);
  const [irOutput, setIrOutput] = useState(
    "{\n  'block': 'entry',\n  'ops': []\n}",
  );
  const [translatedCode, setTranslatedCode] = useState(
    "// Translated code will appear here",
  );
  const [user, setUser] = useState<any>(null);

  // Fetch User on Mount
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    getUser();
  }, []);

  // Handle Code Submission
  const handleSubmit = async () => {
    if (!user) return alert("Please login first");
    setLoading(true);

    try {
      const { error } = await supabase.from("submissions").insert({
        user_id: user.id,
        source_code: code,
        description: description,
        language: language,
        ir_output: irOutput,
        status: "submitted",
      });

      if (error) throw error;
      alert("Code submitted successfully!");
      setAiHints([...aiHints, "Great job! Consider reducing time complexity."]);
    } catch (error: any) {
      alert("Error submitting: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = () => {
    setIrOutput(
      "{\n  'status': 'valid',\n  'ir_version': '1.0',\n  'nodes': 15\n}",
    );
    setTranslatedCode(
      `// Converted to optimized ${language}\nfunction opt() { ... }`,
    );
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-white font-sans overflow-hidden">
      {/* ================= HEADER ================= */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-red-400 hover:text-red-300 cursor-pointer transition-colors">
            <LayoutDashboard size={20} />
            <span className="font-bold tracking-wide">DASHBOARD</span>
          </div>
          <div className="h-6 w-px bg-slate-700"></div>
          <div className="flex items-center gap-2 text-cyan-400 cursor-default">
            <CodeIcon size={20} />
            <span className="font-bold tracking-wide border-b-2 border-cyan-400 pb-0.5">
              EDITOR
            </span>
          </div>
        </div>

        {/* --- 2. REPLACE THE OLD USER PROFILE DIV WITH THIS NEW BLOCK --- */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400">Logged in as</p>
            <p className="text-sm font-medium text-blue-200">{user?.email}</p>
          </div>

          {/* Logout Trigger Button */}
          <button
            onClick={handleLogout}
            className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:scale-105 transition-transform flex items-center justify-center group"
            title="Sign Out"
          >
            {/* The Icon appears on hover due to opacity classes */}
            <LogOut
              size={16}
              className="text-white opacity-0 group-hover:opacity-100 transition-opacity absolute"
            />
          </button>
        </div>
        {/* ------------------------------------------------------------- */}
      </header>

      {/* ================= MAIN GRID LAYOUT ================= */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto lg:overflow-hidden">
        {/* Left Column */}
        <div className="lg:col-span-7 flex flex-col gap-4 h-full">
          <div className="flex-1 relative flex flex-col rounded-xl border border-blue-500/30 bg-slate-900/40 backdrop-blur-sm overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.1)]">
            <div className="flex justify-between items-center px-4 py-2 bg-blue-900/20 border-b border-blue-500/20">
              <span className="text-sm font-semibold text-blue-300 flex items-center gap-2">
                <CodeIcon size={16} /> Code Submission Area
              </span>
              <button
                onClick={handleValidate}
                className="px-3 py-1 text-xs font-bold bg-slate-200 text-slate-900 hover:bg-white rounded shadow-sm transition-all"
              >
                Validate
              </button>
            </div>
            <div className="flex-1 pt-2">
              <Editor
                height="100%"
                defaultLanguage="javascript"
                language={language}
                theme="vs-dark"
                value={code}
                onChange={(val) => setCode(val || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 10 },
                }}
              />
            </div>
          </div>

          <div className="h-48 rounded-xl border border-sky-400/30 bg-slate-900/40 backdrop-blur-sm flex flex-col shadow-[0_0_20px_rgba(56,189,248,0.1)]">
            <div className="px-4 py-2 bg-sky-900/20 border-b border-sky-500/20">
              <span className="text-sm font-semibold text-sky-300">
                Code Description / Problem Statement
              </span>
            </div>
            <textarea
              className="flex-1 bg-transparent p-4 resize-none focus:outline-none text-slate-300 placeholder-slate-600 text-sm font-mono"
              placeholder="Describe the logic of your code or the problem you are solving..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 flex flex-col gap-4 h-full">
          <div className="h-1/3 rounded-xl border border-pink-500/30 bg-slate-900/40 backdrop-blur-sm overflow-hidden shadow-[0_0_20px_rgba(236,72,153,0.1)]">
            <div className="px-4 py-2 bg-pink-900/20 border-b border-pink-500/20 flex items-center gap-2">
              <Brain size={16} className="text-pink-400" />
              <span className="text-sm font-semibold text-pink-300">
                AI Suggestions & Hints
              </span>
            </div>
            <div className="p-4 overflow-y-auto h-full space-y-3">
              {aiHints.map((hint, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-pink-500/10 border border-pink-500/10"
                >
                  <div className="min-w-[6px] h-6 rounded-full bg-pink-500 mt-0.5"></div>
                  <p className="text-xs text-pink-100/80 leading-relaxed">
                    {hint}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="h-1/3 flex gap-4">
            <div className="w-1/2 rounded-xl border border-yellow-500/30 bg-slate-900/40 backdrop-blur-sm overflow-hidden flex flex-col">
              <div className="px-3 py-2 bg-yellow-900/20 border-b border-yellow-500/20 flex items-center gap-2">
                <FileJson size={14} className="text-yellow-400" />
                <span className="text-xs font-bold text-yellow-300 uppercase tracking-wider">
                  Struct IR
                </span>
              </div>
              <pre className="flex-1 p-3 text-[10px] text-yellow-100/70 font-mono overflow-auto custom-scrollbar">
                {irOutput}
              </pre>
            </div>

            <div className="w-1/2 rounded-xl border border-purple-500/30 bg-slate-900/40 backdrop-blur-sm overflow-hidden flex flex-col">
              <div className="px-3 py-1.5 bg-purple-900/20 border-b border-purple-500/20 flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <Languages size={14} className="text-purple-400" />
                  <span className="text-xs font-bold text-purple-300 uppercase">
                    Target
                  </span>
                </div>
                <select
                  className="bg-slate-950 text-[10px] text-purple-200 border border-purple-500/30 rounded px-1 outline-none"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="javascript">JS</option>
                  <option value="python">Python</option>
                  <option value="cpp">C++</option>
                </select>
              </div>
              <pre className="flex-1 p-3 text-[10px] text-purple-100/70 font-mono overflow-auto custom-scrollbar">
                {translatedCode}
              </pre>
            </div>
          </div>

          <div className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-900/10 backdrop-blur-sm flex flex-col justify-between p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors"></div>

            <div>
              <h3 className="text-lg font-bold text-emerald-400 mb-2 flex items-center gap-2">
                <CheckCircle2 size={20} /> Ready to Submit?
              </h3>
              <p className="text-xs text-emerald-200/60">
                Ensure your description matches the logic provided. This will be
                recorded as Attempt #1.
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full py-4 mt-4 rounded-lg font-bold text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all transform hover:-translate-y-1
                ${
                  loading
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                }
              `}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {loading ? "Processing..." : "Submit / Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
