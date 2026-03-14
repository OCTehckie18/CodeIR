import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { supabase } from "../lib/supabaseClient";
import axios from "axios";
import { handleApiError, showSuccess } from "../lib/errorHandler";
import {
  Code as CodeIcon,
  FileJson,
  ClipboardCheck,
  MessageSquare,
  Save,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  Zap,
  Palette,
} from "lucide-react";

import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import logo from "../assets/no-bg-white-logo.png";
import NavBar from "./NavBar";
import ReviewComments from "./ReviewComments";
import LoadingOverlay from "./LoadingOverlay";

// 1. Define the Props Interface
interface InstructorEvaluationProps {
  submissionId?: string;
  onNavigate: (view: any) => void;
}

export default function InstructorEvaluation({
  submissionId,
  onNavigate,
}: InstructorEvaluationProps) {
  const [loading, setLoading] = useState(false);
  const [isAutoGrading, setIsAutoGrading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [submission, setSubmission] = useState<any>(null);

  const [code, setCode] = useState(
    "// Waiting for submission or paste code here...",
  );
  const [language, setLanguage] = useState("python");
  const [irView, setIrView] = useState(
    "{\n  'status': 'No IR generated yet'\n}",
  );

  const [feedback, setFeedback] = useState("");
  const [scores, setScores] = useState({
    correctness: 0,
    efficiency: 0,
    style: 0,
  });
  const [user, setUser] = useState<any>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<
    "feedback" | "comments"
  >("feedback");
  const [currentEngine, setCurrentEngine] = useState<string>(localStorage.getItem("aiEngine") || "ollama");
  const [copiedIr, setCopiedIr] = useState(false);

  // --- Fetch User & Specific Submission ---
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);

      if (submissionId) {
        // FETCH SPECIFIC SUBMISSION BASED ON ID
        try {
          const response = await axios.get(
            `http://127.0.0.1:5000/api/submissions/${submissionId}`,
            {
              headers: { Authorization: `Bearer ${session?.access_token}` },
            },
          );

          if (!response.data.success) {
            throw new Error(
              response.data.error || "Failed to fetch submission details",
            );
          }

          const data = response.data.data;
          setSubmission(data);
          setCode(data.source_code || "");
          if (data.language) setLanguage(data.language);
          if (data.pseudocodes) {
            setIrView(
              typeof data.pseudocodes.structured_blocks === "string"
                ? data.pseudocodes.structured_blocks
                : JSON.stringify(data.pseudocodes.structured_blocks, null, 2),
            );
          }
          if (data.evaluations && data.evaluations.length > 0) {
            const ev = data.evaluations[0];
            if (ev.final_scores) {
              setScores(ev.final_scores);
            }
            if (ev.teacher_feedback) {
              setFeedback(ev.teacher_feedback);
            }
          }
        } catch (error) {
          console.error("Error fetching submission:", error);
        }
      } else {
        // Manual Mode (No ID passed)
        setSubmission(null);
        setCode(
          "// Manual Evaluation Mode.\n// Paste student code here and click Validate to generate IR.",
        );
      }
    };
    init();
  }, [submissionId]);

  // Logout now handled by NavBar

  const handleAISuggestion = async () => {
    setIsAutoGrading(true);
    try {
      const description =
        submission?.problems?.problem_statement ||
        "Instructor evaluating manual code via dashboard.";
      const engine = localStorage.getItem("aiEngine") || "ollama";
      setCurrentEngine(engine);
      const payload = { code, description, engine };
      const response = await axios.post(
        "http://127.0.0.1:5000/api/auto-grade",
        payload,
      );

      if (response.data.success && response.data.data) {
        setScores({
          correctness: response.data.data.correctness || 0,
          efficiency: response.data.data.efficiency || 0,
          style: response.data.data.style || 0,
        });
        setFeedback(
          response.data.data.feedback ||
            "Code evaluated successfully by Gemini.",
        );
      } else {
        handleApiError({ message: response.data.error }, "Auto-grading");
      }
    } catch (error: any) {
      handleApiError(error, "Auto-grading");
    } finally {
      setIsAutoGrading(false);
    }
  };

  const handleValidateCode = async () => {
    setIsValidating(true);
    setIrView("{\n  'status': 'Generating IR... Please wait...'\n}");
    try {
      const description =
        submission?.problems?.problem_statement || "Evaluate this code.";
      const engine = localStorage.getItem("aiEngine") || "ollama";
      setCurrentEngine(engine);
      const payload = { code, description, engine };
      const response = await axios.post(
        "http://127.0.0.1:5000/api/evaluate-code",
        payload,
      );

      if (response.data.success) {
        if (response.data.status === "valid") {
          setIrView(response.data.irOutput);
        } else {
          setIrView(
            "{\n  'status': 'Validation Failed',\n  'feedback': " +
              JSON.stringify(response.data.feedback) +
              "\n}",
          );
        }
      } else {
        setIrView(
          "{\n  'status': 'Validation Error',\n  'error': " +
            JSON.stringify(response.data.error) +
            "\n}",
        );
      }
    } catch (error: any) {
      setIrView(
        "{\n  'status': 'Connection Error',\n  'error': " +
          JSON.stringify(error.message) +
          "\n}",
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleCopyIr = () => {
    navigator.clipboard.writeText(irView);
    setCopiedIr(true);
    setTimeout(() => setCopiedIr(false), 2000);
  };

  const handleSubmitEvaluation = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      let targetSubmissionId = submission?.submission_id;

      // Make manual mode fully functional by creating a submission base dynamically
      if (!targetSubmissionId) {
        const subPayload = {
          userId: user.id,
          description: "Instructor Manual Offline Evaluation",
          code: code,
          language: language,
          irOutput: irView,
          translatedCode: "// Offline manually graded code",
          validationStatus: "valid",
        };
        const subRes = await axios.post(
          "http://127.0.0.1:5000/api/submissions",
          subPayload,
          {
            headers: { Authorization: `Bearer ${session?.access_token}` },
          },
        );

        if (!subRes.data.success) {
          throw new Error(
            subRes.data.error ||
              "Failed to establish offline student profile submission",
          );
        }
        targetSubmissionId = subRes.data.submissionId;
      }

      const payload = {
        submissionId: targetSubmissionId,
        instructorId: user.id,
        scores,
        feedback,
      };

      const response = await axios.post(
        "http://127.0.0.1:5000/api/evaluations",
        payload,
        {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        },
      );

      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to save evaluation");
      }

      showSuccess(
        submission
          ? "Evaluation saved successfully!"
          : "Offline Evaluation & Submission securely saved to database!",
      );
      onNavigate("dashboard");
    } catch (error: any) {
      handleApiError(error, "Saving evaluation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans overflow-hidden">
      {/* SHARED NAV BAR */}
      <NavBar
        role="instructor"
        active="evaluation"
        onNavigate={onNavigate}
        email={user?.email}
      />

      <LoadingOverlay isVisible={isValidating} message="Validating Student Code..." />
      <LoadingOverlay isVisible={isAutoGrading} message="AI Auto-Grading..." />
      <LoadingOverlay isVisible={loading} message="Submitting Evaluation..." />
      {/* Manual Mode indicator shown below navbar when no submission ID */}
      {!submission && (
        <div className="flex items-center gap-2 px-6 py-1.5 bg-blue-500/10 border-b border-blue-500/20">
          <CodeIcon size={12} className="text-blue-400" />
          <span className="text-xs text-blue-300 font-semibold tracking-wide">
            MANUAL EVALUATION MODE — No submission linked
          </span>
        </div>
      )}

      {/* ================= MAIN CONTENT (Draggable Panels) ================= */}
      <div className="flex-1 p-4 overflow-hidden min-h-0 flex">
        <PanelGroup orientation="horizontal">
          {/* COLUMN 1: CODE EDITOR */}
          <Panel
            defaultSize={35}
            minSize={20}
            className="flex flex-col h-full rounded-xl border border-blue-500/30 bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.1)] relative"
          >
            <div className="px-4 py-3 bg-blue-900/20 border-b border-blue-500/20 flex justify-between items-center">
              <span className="text-sm font-semibold text-blue-300 flex items-center gap-2">
                <CodeIcon size={16} /> Student Source Code
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleValidateCode}
                  disabled={isValidating}
                  className="flex items-center gap-1 text-[10px] bg-blue-500 hover:bg-blue-400 text-slate-900 dark:text-white px-2 py-1 rounded transition-colors shadow-lg shadow-blue-500/20 disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {isValidating ? (
                    <img
                      src={logo}
                      alt="Loading"
                      className="animate-float w-3 h-3 object-contain"
                    />
                  ) : (
                    <Sparkles size={10} />
                  )}
                  {isValidating ? "Validating..." : "Validate Code"}
                </button>
                <select
                  className="bg-slate-50 dark:bg-slate-950 text-xs text-blue-200 border border-blue-500/30 rounded px-3 py-1 outline-none hover:bg-slate-900 transition-colors cursor-pointer"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  title="Target Language"
                  disabled={!!submission}
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
            </div>
            <div className="flex-1 pt-2">
              <Editor
                height="100%"
                defaultLanguage="python"
                language={language}
                theme="vs-dark"
                value={code}
                onChange={(val) => setCode(val || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                }}
              />
            </div>
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-4 h-full flex items-center justify-center cursor-col-resize group z-10">
            <div className="h-16 w-1 rounded-full bg-slate-300 dark:bg-slate-700/50 group-hover:bg-blue-500 transition-colors"></div>
          </PanelResizeHandle>

          {/* COLUMN 2: IR VIEW */}
          <Panel
            defaultSize={35}
            minSize={20}
            className="flex flex-col h-full rounded-xl border border-yellow-500/30 bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm overflow-hidden shadow-[0_0_20px_rgba(234,179,8,0.1)] relative"
          >
            <div className="px-4 py-3 bg-yellow-900/20 border-b border-yellow-500/20 flex justify-between items-center">
              <span className="text-sm font-semibold text-yellow-300 flex items-center gap-2">
                <FileJson size={16} /> Structured IR Viewer
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyIr}
                  className="p-1.5 rounded-lg text-yellow-500/50 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all"
                  title="Copy IR"
                >
                  {copiedIr ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <div className="h-4 w-px bg-yellow-500/20 mx-1"></div>
                <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${currentEngine === 'ollama' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'}`}>
                  {currentEngine}
                </div>
              </div>
            </div>
            <div className="flex-1 pt-2">
              <Editor
                height="100%"
                defaultLanguage="json"
                theme="vs-dark"
                value={irView}
                onChange={(val) => setIrView(val || "")}
                options={{
                  readOnly: false,
                  minimap: { enabled: false },
                  fontSize: 12,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  lineNumbers: "on",
                  glyphMargin: false,
                  folding: true,
                  lineDecorationsWidth: 0,
                  lineNumbersMinChars: 3,
                }}
              />
            </div>
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-4 h-full flex items-center justify-center cursor-col-resize group z-10">
            <div className="h-16 w-1 rounded-full bg-slate-300 dark:bg-slate-700/50 group-hover:bg-blue-500 transition-colors"></div>
          </PanelResizeHandle>

          {/* COLUMN 3: RUBRIC AND FEEDBACK */}
          <Panel
            defaultSize={30}
            minSize={25}
            className="flex flex-col h-full min-h-0"
          >
            <PanelGroup orientation="vertical">
              {/* RUBRIC BOX */}
              <Panel
                defaultSize={60}
                minSize={30}
                className="flex flex-col pb-2 relative"
              >
                <div className="h-full flex flex-col rounded-xl border border-pink-500/30 bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm overflow-hidden shadow-[0_0_20px_rgba(236,72,153,0.1)]">
                  <div className="px-4 py-3 bg-pink-900/20 border-b border-pink-500/20 flex justify-between items-center">
                    <span className="text-sm font-semibold text-pink-300 flex items-center gap-2">
                      <ClipboardCheck size={16} /> Evaluation Rubric
                    </span>
                    <button
                      onClick={handleAISuggestion}
                      disabled={isAutoGrading}
                      className="flex items-center gap-1 text-[10px] bg-pink-500 hover:bg-pink-400 text-slate-900 dark:text-white px-2 py-1 rounded transition-colors shadow-lg shadow-pink-500/20 disabled:bg-slate-700 disabled:text-slate-400"
                    >
                      {isAutoGrading ? (
                        <img
                          src={logo}
                          alt="Loading"
                          className="animate-float w-3 h-3 object-contain"
                        />
                      ) : (
                        <Sparkles size={10} />
                      )}
                      {isAutoGrading ? "Grading..." : "Auto-Grade"}
                    </button>
                  </div>

                  <div className="p-5 flex-1 space-y-8 overflow-y-auto custom-scrollbar">
                    {/* Correctness */}
                    <div className="space-y-3 p-4 rounded-xl bg-pink-500/5 border border-pink-500/10 hover:border-pink-500/30 transition-all group/rubric">
                      <div className="flex justify-between items-center text-xs text-pink-100">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-pink-400" />
                          <span className="font-semibold tracking-wide">Correctness</span>
                        </div>
                        <span className="font-black text-lg text-pink-400">
                          {scores.correctness}<span className="text-[10px] text-pink-500/50">/10</span>
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={scores.correctness}
                        onChange={(e) =>
                          setScores({
                            ...scores,
                            correctness: parseInt(e.target.value),
                          })
                        }
                        className="premium-slider"
                        style={{
                           accentColor: scores.correctness > 7 ? '#10b981' : scores.correctness > 4 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>

                    {/* IR Efficiency */}
                    <div className="space-y-3 p-4 rounded-xl bg-pink-500/5 border border-pink-500/10 hover:border-pink-500/30 transition-all group/rubric">
                      <div className="flex justify-between items-center text-xs text-pink-100">
                        <div className="flex items-center gap-2">
                          <Zap size={16} className="text-pink-400" />
                          <span className="font-semibold tracking-wide">IR Efficiency</span>
                        </div>
                        <span className="font-black text-lg text-pink-400">
                          {scores.efficiency}<span className="text-[10px] text-pink-500/50">/10</span>
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={scores.efficiency}
                        onChange={(e) =>
                          setScores({
                            ...scores,
                            efficiency: parseInt(e.target.value),
                          })
                        }
                        className="premium-slider"
                      />
                    </div>

                    {/* Code Style */}
                    <div className="space-y-3 p-4 rounded-xl bg-pink-500/5 border border-pink-500/10 hover:border-pink-500/30 transition-all group/rubric">
                      <div className="flex justify-between items-center text-xs text-pink-100">
                        <div className="flex items-center gap-2">
                          <Palette size={16} className="text-pink-400" />
                          <span className="font-semibold tracking-wide">Code Style</span>
                        </div>
                        <span className="font-black text-lg text-pink-400">
                          {scores.style}<span className="text-[10px] text-pink-500/50">/10</span>
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={scores.style}
                        onChange={(e) =>
                          setScores({
                            ...scores,
                            style: parseInt(e.target.value),
                          })
                        }
                        className="premium-slider"
                      />
                    </div>
                  </div>

                  <div className="px-5 pb-6 pt-4 border-t border-pink-500/10 bg-pink-500/5">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                          Composite Score
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Weighted average</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-400 to-rose-600">
                          {scores.correctness + scores.efficiency + scores.style}
                        </span>
                        <span className="text-sm font-bold text-slate-500">/30</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>

              {/* Horizontal Resize Handle */}
              <PanelResizeHandle className="h-3 w-full flex items-center justify-center cursor-row-resize group z-10">
                <div className="w-16 h-1 rounded-full bg-slate-300 dark:bg-slate-700/50 group-hover:bg-blue-500 transition-colors"></div>
              </PanelResizeHandle>

              {/* FEEDBACK + COMMENTS TABS */}
              <Panel
                defaultSize={40}
                minSize={20}
                className="flex flex-col pt-2 relative"
              >
                <div className="h-full flex flex-col rounded-xl border border-emerald-500/30 bg-emerald-900/5 backdrop-blur-sm overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                  {/* Tab bar */}
                  <div className="flex border-b border-emerald-500/20 bg-emerald-900/20 flex-shrink-0">
                    <button
                      id="tab-feedback"
                      onClick={() => setActiveBottomTab("feedback")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold transition-colors ${
                        activeBottomTab === "feedback"
                          ? "text-emerald-300 border-b-2 border-emerald-400"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <Save size={11} /> Feedback
                    </button>
                    <button
                      id="tab-comments"
                      onClick={() => setActiveBottomTab("comments")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold transition-colors ${
                        activeBottomTab === "comments"
                          ? "text-emerald-300 border-b-2 border-emerald-400"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <MessageSquare size={11} /> Line Comments
                    </button>
                  </div>

                  {/* Feedback tab */}
                  {activeBottomTab === "feedback" && (
                    <>
                      <div className="flex-1 min-h-[0px] flex">
                        <textarea
                          className="w-full h-full bg-transparent p-4 resize-none focus:outline-none text-emerald-100 placeholder-emerald-500/50 text-sm custom-scrollbar"
                          placeholder="Enter overall feedback for the student here..."
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                        />
                      </div>
                      <div className="p-4 bg-emerald-900/20 border-t border-emerald-500/20 flex-shrink-0">
                        <button
                          onClick={handleSubmitEvaluation}
                          disabled={loading}
                          className={`w-full py-2.5 font-bold rounded-lg shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all bg-emerald-500 hover:bg-emerald-400 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {loading ? (
                            <img
                              src={logo}
                              alt="Loading"
                              className="animate-float h-5 w-5 object-contain"
                            />
                          ) : (
                            <Save size={16} />
                          )}
                          {loading
                            ? "Saving..."
                            : submission
                              ? "Submit Evaluation"
                              : "Save Manual Evaluation"}
                        </button>
                      </div>
                    </>
                  )}

                  {/* Line Comments tab */}
                  {activeBottomTab === "comments" && (
                    <ReviewComments
                      submissionId={submissionId}
                      instructorId={user?.id}
                      code={code}
                    />
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
