import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { supabase } from "../lib/supabaseClient";
import axios from "axios";
const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
import { handleApiError, showSuccess } from "../lib/errorHandler";
import { evaluateCode, checkOllamaConnection, getAvailableModels } from "../lib/aiService";
import {
  Code as CodeIcon,
  Brain,
  FileJson,
  Languages,
  Save,
  Check,
  // Activity,
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
} from "lucide-react";

import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import logo from "../assets/no-bg-white-logo.png";
import NavBar from "./NavBar";
import LoadingOverlay from "./LoadingOverlay";

// Resume draft shape — mirrors what GET /api/drafts/:userId returns
export interface DraftResume {
  submission_id: string;
  source_code: string;
  source_language: string;
  problems?: { problem_id: number; problem_statement: string };
}

// Define props interface
interface CodeEditorProps {
  onNavigate?: (page: "dashboard" | "editor" | "problems") => void;
  problem?: any;
  resumeDraft?: DraftResume | null; // pre-loaded draft handed down from App.tsx
}

export default function CodeEditor({ onNavigate, problem, resumeDraft }: CodeEditorProps) {
  // State Management — seed from resumeDraft prop if present, then from problem, then defaults
  const [code, setCode] = useState(
    resumeDraft?.source_code ||
    problem?.boilerplate_code ||
    "// Write your source code here...",
  );
  const [description, setDescription] = useState(
    resumeDraft?.problems?.problem_statement ||
    problem?.problem_statement ||
    "",
  );
  const [language, setLanguage] = useState(
    resumeDraft?.source_language || "javascript",
  );
  const [loading, setLoading] = useState(false);
  const [aiHints, setAiHints] = useState<string[]>(
    resumeDraft
      ? ["Resuming your draft — pick up where you left off!"]
      : [
        "Write a function to optimize the IR...",
        "Check for null pointers in your logic.",
      ],
  );
  const [irOutput, setIrOutput] = useState(
    "{\n  'block': 'entry',\n  'ops': []\n}",
  );
  const [translatedCode, setTranslatedCode] = useState(
    "// Translated code will appear here",
  );
  const [user, setUser] = useState<any>(null);
  const [validationStatus, setValidationStatus] = useState<
    "pending" | "valid" | "invalid"
  >("pending");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [copiedIr, setCopiedIr] = useState(false);
  const [engine] = useState(localStorage.getItem("aiEngine") || "ollama");
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const checkConnection = async () => {
      const isConnected = await checkOllamaConnection();
      setConnectionStatus(isConnected ? "success" : "error");
    };

    const fetchModels = async () => {
      const models = await getAvailableModels();
      setAvailableModels(models);
      if (models.length > 0) {
        // Auto-detection logic: prioritize qwen2.5-coder
        const bestModel = models.find(m => m.toLowerCase().includes("qwen2.5-coder")) ||
          models.find(m => m.toLowerCase().includes("coder")) ||
          models[0];
        setSelectedModel(bestModel);
      }
    };

    if (engine === "ollama") {
      checkConnection();
      fetchModels();
      interval = setInterval(checkConnection, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [engine]);

  const handleCopyIr = () => {
    if (validationStatus !== "valid") {
      handleApiError({ message: "Generate valid IR before copying." }, "Copy IR");
      return;
    }
    navigator.clipboard.writeText(irOutput);
    setCopiedIr(true);
    setTimeout(() => setCopiedIr(false), 2000);
  };



  // Fetch User on Mount, then if no draft was injected via props,
  // ask the backend for the user's latest draft (fixes state-loss-on-refresh).
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);

      // If a draft was already injected via the resumeDraft prop, skip the fetch.
      if (resumeDraft || !currentUser) return;

      try {
        const problemId = problem?.problem_id;
        const url = problemId
          ? `${baseUrl}/api/drafts/${currentUser.id}?problemId=${problemId}`
          : `${baseUrl}/api/drafts/${currentUser.id}`;

        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });

        const draft = res.data?.draft;
        if (draft) {
          // Existing draft found — seed editor state
          setCode(draft.source_code || code);
          setLanguage(draft.source_language || "javascript");
          if (draft.problems?.problem_statement && !problem) {
            setDescription(draft.problems.problem_statement);
          }
          setAiHints(["Existing draft restored — continue where you left off!"]);
        }
      } catch {
        // Non-fatal: if draft fetch fails, editor starts fresh
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Code Submission
  const handleSubmit = async () => {
    console.log("Submit pressed");
    if (!user) {
      handleApiError({ message: "Please login first." }, "Submit");
      return;
    }
    if (!description.trim()) {
      handleApiError({ message: "Please provide a problem description so we can track it." }, "Submit");
      return;
    }
    if (!code.trim() || code.includes("Write your source code here")) {
      handleApiError({ message: "Please enter some actionable source code." }, "Submit");
      return;
    }
    if (validationStatus !== "valid") {
      handleApiError({ message: "You must successfully validate your code and generate Pseudocode before saving." }, "Submit");
      return;
    }
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const payload = {
        userId: user.id,
        description, // ← was missing — backend requires this
        problemId: problem?.problem_id || null,
        code,
        language,
        irOutput,
        translatedCode,
        validationStatus,
      };

      const response = await axios.post(
        `${baseUrl}/api/submissions`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        },
      );

      if (response.data.success) {
        setSubmissionSuccess(true);
        showSuccess("Submission saved securely!");
        setAiHints((prev) => [
          ...prev,
          "Submission successful! Saved securely via backend.",
        ]);
      } else {
        throw new Error(response.data.error || "Unknown submission error.");
      }
    } catch (error: any) {
      handleApiError(error, "Submitting solution");
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (
      !description.trim() ||
      !code.trim() ||
      code.includes("Write your source code here")
    ) {
      handleApiError({ message: "Please provide both a valid problem description and code." }, "Validate");
      return;
    }

    setIsEvaluating(true);
    setAiHints(["Evaluating code correctness..."]);
    setIrOutput("Waiting for validation...");
    setTranslatedCode("Waiting for validation...");
    setValidationStatus("pending");
    setSubmissionSuccess(false);

    try {
      const engine = localStorage.getItem("aiEngine") || "ollama";
      const result = await evaluateCode(code, description, engine, selectedModel);

      const {
        success,
        status,
        feedback,
        irOutput: apiIrOutput,
        translatedCode: apiTranslatedCode,
        error,
      } = result;

      if (!success) {
        throw new Error(error || "Unknown validation error");
      }

      if (status === "valid" && feedback === "CORRECT") {
        setIrOutput(apiIrOutput);
        setTranslatedCode(apiTranslatedCode);
        setAiHints([
          "Validation complete. Code is correct. You can now save your submission.",
        ]);
        setValidationStatus("valid");
      } else {
        setIrOutput(
          "Validation failed. Please fix the code based on the feedback.",
        );
        setTranslatedCode(
          "Validation failed. Please fix the code based on the feedback.",
        );
        setAiHints([
          "Validation Failed",
          feedback,
          "Please fix your code and try validating again.",
        ]);
        setValidationStatus("invalid");
      }
    } catch (error: any) {
      console.error(error);
      setAiHints([
        "Error communicating with backend validation server.",
        error.message,
      ]);
      setIrOutput("Error connecting to backend API.");
      setTranslatedCode("Error connecting to backend API.");
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans overflow-hidden">
      {/* SHARED NAV BAR */}
      <NavBar
        role="student"
        active="editor"
        onNavigate={onNavigate!}
        email={user?.email}
      />

      <LoadingOverlay isVisible={isEvaluating} message="Evaluating Code..." />
      <LoadingOverlay isVisible={loading} message="Saving Submission..." />

      {/* ================= MAIN GRID LAYOUT (LeetCode Style with Draggable Resizer) ================= */}
      <div className="flex-1 p-4 overflow-hidden min-h-0 flex">
        <PanelGroup orientation="horizontal">
          {/* ================= LEFT COLUMN: PROBLEM & HINTS ================= */}
          <Panel
            defaultSize={40}
            minSize={20}
            className="flex flex-col h-full min-h-0"
          >
            <PanelGroup orientation="vertical">
              {/* Problem Statement Box */}
              <Panel
                defaultSize={60}
                minSize={20}
                className="flex flex-col pb-2"
              >
                <div className="h-full rounded-xl border border-sky-400/30 bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm flex flex-col shadow-[0_0_20px_rgba(56,189,248,0.1)]">
                  <div className="px-4 py-3 bg-sky-900/20 border-b border-sky-500/20 flex flex-col">
                    <span className="text-sm font-semibold text-sky-400">
                      Problem Description
                    </span>
                  </div>
                  <textarea
                    className="flex-1 bg-transparent p-5 resize-none focus:outline-none text-slate-700 dark:text-slate-300 placeholder-slate-600 text-[13px] font-mono border-none custom-scrollbar"
                    placeholder="Describe the problem you are solving, requirements, and constraints..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </Panel>

              {/* Horizontal Resize Handle for Left Column */}
              <PanelResizeHandle className="h-3 w-full flex items-center justify-center cursor-row-resize group">
                <div className="w-16 h-1 rounded-full bg-slate-300 dark:bg-slate-700/50 group-hover:bg-blue-500 transition-colors"></div>
              </PanelResizeHandle>

              {/* AI Hints Box */}
              <Panel
                defaultSize={40}
                minSize={20}
                className="flex flex-col pt-2"
              >
                <div className="h-full rounded-xl border border-pink-500/30 bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm overflow-hidden shadow-[0_0_20px_rgba(236,72,153,0.1)] flex flex-col">
                  <div className="px-4 py-2.5 bg-pink-900/20 border-b border-pink-500/20 flex items-center gap-2">
                    <Brain size={16} className="text-pink-400" />
                    <span className="text-sm font-semibold text-pink-300">
                      AI Suggestions & Hints
                    </span>
                  </div>
                  <div className="p-4 overflow-y-auto h-full space-y-3 custom-scrollbar">
                    {aiHints.map((hint, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-lg bg-pink-500/10 border border-pink-500/10"
                      >
                        <div className="min-w-[6px] h-6 rounded-full bg-pink-500 mt-0.5 shadow-[0_0_8px_rgba(236,72,153,0.6)]"></div>
                        <p className="text-[13px] text-pink-100/90 leading-relaxed font-medium">
                          {hint}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>

          {/* Main Vertical Resize Handle */}
          <PanelResizeHandle className="w-4 h-full flex items-center justify-center cursor-col-resize group">
            <div className="h-16 w-1 rounded-full bg-slate-300 dark:bg-slate-700/50 group-hover:bg-blue-500 transition-colors"></div>
          </PanelResizeHandle>

          {/* ================= RIGHT COLUMN: EDITOR & CONSOLE ================= */}
          <Panel
            defaultSize={60}
            minSize={30}
            className="flex flex-col h-full min-h-0 flex-1"
          >
            <PanelGroup orientation="vertical">
              {/* Editor Box */}
              <Panel
                defaultSize={65}
                minSize={20}
                className="flex flex-col pb-2 relative"
              >
                <div className="h-full relative flex flex-col rounded-xl border border-blue-500/30 bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                  <div className="flex justify-between items-center px-4 py-2.5 bg-blue-900/20 border-b border-blue-500/20">
                    <div className="flex items-center gap-3">
                      <CodeIcon size={16} className="text-blue-400" />
                      <span className="text-sm font-semibold text-blue-300">
                        Code
                      </span>
                      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                      <select
                        className="bg-slate-50 dark:bg-slate-950 text-xs text-blue-200 border border-blue-500/30 rounded px-3 py-1.5 outline-none hover:bg-slate-900 transition-colors cursor-pointer"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        title="Target Language"
                      >
                        <option value="cpp">C++</option>
                        <option value="java">Java</option>
                        <option value="python3">Python3</option>
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="typescript">TypeScript</option>
                        <option value="csharp">C#</option>
                        <option value="c">C</option>
                        <option value="go">Go</option>
                        <option value="kotlin">Kotlin</option>
                        <option value="swift">Swift</option>
                        <option value="rust">Rust</option>
                        <option value="ruby">Ruby</option>
                        <option value="php">PHP</option>
                        <option value="dart">Dart</option>
                        <option value="scala">Scala</option>
                        <option value="elixir">Elixir</option>
                        <option value="erlang">Erlang</option>
                        <option value="racket">Racket</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      {engine === "ollama" && (
                        <div className="flex items-center gap-2 group relative">
                          {availableModels.length > 0 && (
                            <select
                              className="bg-slate-50 dark:bg-slate-950 text-[10px] text-emerald-200 border border-emerald-500/30 rounded px-2 py-1 outline-none hover:bg-slate-900 transition-colors cursor-pointer"
                              value={selectedModel}
                              onChange={(e) => setSelectedModel(e.target.value)}
                              title="Ollama Model"
                            >
                              {availableModels.map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          )}
                          <div
                            className={`px-3 py-1.5 text-[10px] font-bold tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-1.5 border ${connectionStatus === "success"
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : connectionStatus === "error"
                                ? "bg-red-500/20 text-red-400 border-red-500/30"
                                : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                              }`}
                          >
                            {connectionStatus === "success" ? (
                              <CheckCircle2 size={12} />
                            ) : connectionStatus === "error" ? (
                              <AlertCircle size={12} />
                            ) : (
                              <img src={logo} alt="Loading" className="animate-float w-3 h-3 object-contain opacity-50" />
                            )}
                            {connectionStatus === "success" ? "OLLAMA OK" : connectionStatus === "error" ? "OLLAMA OFFLINE" : "CHECKING..."}
                          </div>

                          {/* CORS Helper Tooltip */}
                          {connectionStatus === "error" && (
                            <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-slate-900 border border-red-500/50 rounded-xl shadow-2xl z-50 invisible group-hover:visible animate-in fade-in slide-in-from-top-1">
                              <p className="text-[10px] text-red-200 leading-relaxed mb-2">
                                <span className="font-bold text-red-400">Connection Failed:</span> To use Ollama from this site, you must allow cross-origin requests on your laptop.
                              </p>
                              <div className="space-y-1.5">
                                <div className="text-[9px] bg-black/40 p-1.5 rounded font-mono text-slate-300 break-all">
                                  $env:OLLAMA_ORIGINS="*"; ollama serve
                                </div>
                                <a
                                  href="https://github.com/ollama/ollama/blob/main/docs/faq.md#how-can-i-allow-additional-origins-to-access-ollama"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                  View Setup Guide <ExternalLink size={10} />
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Run Validation Button */}
                      <button
                        id="run-validation-btn"
                        onClick={handleValidate}
                        disabled={isEvaluating}
                        className={`px-4 py-1.5 text-xs font-bold tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-2 focus:outline-none ${isEvaluating
                          ? "bg-slate-600 text-slate-700 dark:text-slate-300 cursor-not-allowed"
                          : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 hover:border-emerald-400"
                          }`}
                      >
                        {isEvaluating ? (
                          <img
                            src={logo}
                            alt="Loading"
                            className="animate-float w-4 h-4 object-contain"
                          />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        {isEvaluating ? "EVALUATING..." : "RUN VALIDATION"}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 pt-2">
                    <Editor
                      height="100%"
                      defaultLanguage="javascript"
                      language={
                        language === "python3" ? "python" :
                          language === "cpp" ? "cpp" :
                            language === "c" ? "cpp" :
                              language === "csharp" ? "csharp" :
                                language === "java" ? "java" :
                                  language === "go" ? "go" :
                                    language === "rust" ? "rust" :
                                      language === "typescript" ? "typescript" :
                                        language === "javascript" ? "javascript" :
                                          language // fallback
                      }
                      theme="vs-dark"
                      value={code}
                      onChange={(val) => setCode(val || "")}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16 },
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                        lineHeight: 24,
                      }}
                    />
                  </div>
                </div>
              </Panel>

              {/* Horizontal Resize Handle for Right Column */}
              <PanelResizeHandle className="h-3 w-full flex items-center justify-center cursor-row-resize group">
                <div className="w-16 h-1 rounded-full bg-slate-300 dark:bg-slate-700/50 group-hover:bg-blue-500 transition-colors"></div>
              </PanelResizeHandle>

              {/* Console / Outputs / Submission Box */}
              <Panel
                defaultSize={35}
                minSize={20}
                className="flex flex-col pt-2 min-h-[0px]"
              >
                <div className="h-full flex flex-col rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm overflow-hidden shadow-lg">
                  <div className="px-4 py-3 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-300 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      Testcases & Output Console
                    </span>
                    <div className="flex gap-3 items-center">
                      {/* Status indicator */}
                      {validationStatus === "valid" && (
                        <span className="text-xs text-emerald-400 font-bold tracking-widest px-2 bg-emerald-500/10 py-1 rounded border border-emerald-500/20 flex-shrink-0">
                          VALIDATED
                        </span>
                      )}
                      {validationStatus === "invalid" && (
                        <span className="text-xs text-rose-400 font-bold tracking-widest px-2 bg-rose-500/10 py-1 rounded border border-rose-500/20 flex-shrink-0">
                          FAILED
                        </span>
                      )}

                      <button
                        id="submit-solution-btn"
                        onClick={() => handleSubmit()}
                        disabled={
                          loading ||
                          validationStatus !== "valid" ||
                          submissionSuccess
                        }
                        className={`px-3 py-1 lg:px-5 lg:py-2 rounded-lg font-bold text-xs uppercase tracking-widest shadow flex items-center gap-2 transition-all whitespace-nowrap
                            ${loading ||
                            validationStatus !== "valid" ||
                            submissionSuccess
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700"
                            : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:-translate-y-0.5"
                          }
                          `}
                      >
                        {loading ? (
                          <img
                            src={logo}
                            alt="Loading"
                            className="animate-float w-4 h-4 object-contain"
                          />
                        ) : (
                          <Save size={14} />
                        )}
                        <span className="hidden sm:inline">
                          {submissionSuccess
                            ? "Saved Successfully"
                            : "Submit Solution"}
                        </span>
                        <span className="sm:hidden">
                          {submissionSuccess ? "Saved" : "Submit"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {submissionSuccess ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-900/40 to-[#1e1e1e] overflow-hidden p-4 text-center">
                      <CheckCircle2
                        size={48}
                        className="text-emerald-400 mb-3"
                      />
                      <h3 className="text-xl font-bold text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
                        Accepted
                      </h3>
                      <p className="text-sm text-emerald-200/80 mt-2 font-medium">
                        Your solution was validated and safely stored.
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 flex min-h-0 bg-[#1e1e1e]">
                      <PanelGroup orientation="horizontal">
                        {/* Left side of console: IR */}
                        <Panel
                          defaultSize={50}
                          minSize={20}
                          className="border-r border-slate-300 dark:border-slate-800 flex flex-col group relative"
                        >
                          <div className="px-4 py-2 bg-[#252526] border-b border-slate-300 dark:border-slate-800 flex justify-between items-center text-xs sticky top-0 z-10">
                            <span className="text-yellow-400/90 font-mono tracking-wider flex items-center gap-2 whitespace-nowrap">
                              <FileJson size={14} /> Struct IR
                            </span>
                            <button
                              onClick={handleCopyIr}
                              className="text-slate-500 dark:text-slate-500 hover:text-slate-300 transition-colors p-1 hover:bg-white/5 rounded"
                            >
                              {copiedIr ? (
                                <Check size={14} className="text-emerald-400" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          </div>
                          <pre className="flex-1 p-4 text-[12px] leading-relaxed text-yellow-100/70 font-mono overflow-auto custom-scrollbar bg-[#1e1e1e]">
                            {irOutput}
                          </pre>
                        </Panel>

                        {/* Inner Console Resize Handle */}
                        <PanelResizeHandle className="w-2 h-full flex items-center justify-center cursor-col-resize group z-10 bg-[#1e1e1e]">
                          <div className="h-8 w-1 rounded-full bg-slate-300 dark:bg-slate-700/50 group-hover:bg-blue-500 transition-colors"></div>
                        </PanelResizeHandle>

                        {/* Right side of console: Translated Target */}
                        <Panel
                          defaultSize={50}
                          minSize={20}
                          className="flex flex-col bg-[#1e1e1e]"
                        >
                          <div className="px-4 py-2 bg-[#252526] border-b border-slate-300 dark:border-slate-800 flex items-center text-xs sticky top-0 z-10">
                            <span className="text-purple-400/90 font-mono tracking-wider flex items-center gap-2 whitespace-nowrap">
                              <Languages size={14} /> Target Code
                            </span>
                          </div>
                          <pre className="flex-1 p-4 text-[12px] leading-relaxed text-purple-100/70 font-mono overflow-auto custom-scrollbar">
                            {translatedCode}
                          </pre>
                        </Panel>
                      </PanelGroup>
                    </div>
                  )}
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
