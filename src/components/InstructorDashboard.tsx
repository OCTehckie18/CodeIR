import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import axios from "axios";
import {
  User,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  FileText,
  ChevronRight,
} from "lucide-react";
import NavBar from "./NavBar";

interface InstructorDashboardProps {
  onNavigate: (view: "dashboard" | "evaluation" | "problems", submissionId?: string) => void;
}

export default function InstructorDashboard({
  onNavigate,
}: InstructorDashboardProps) {
  const [user, setUser] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, evaluated: 0, total: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      setUser(session.user);

      const response = await axios.get("http://127.0.0.1:5000/api/instructor/dashboard", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to fetch instructor dashboard data");
      }

      const safeData = response.data.data || [];
      setSubmissions(safeData);

      // Calculate Stats
      const total = safeData.length;
      const evaluated = safeData.filter(
        (s: any) => s.evaluations && (Array.isArray(s.evaluations) ? s.evaluations.length > 0 : Object.keys(s.evaluations).length > 0),
      ).length;
      const pending = total - evaluated;

      setStats({ total, evaluated, pending });
    } catch (error) {
      console.error("Error fetching instructor data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Logout now handled by NavBar

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
          <p className="text-emerald-400/80 tracking-widest text-sm font-bold uppercase">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans overflow-hidden">
      {/* SHARED NAV BAR */}
      <NavBar role="instructor" active="dashboard" onNavigate={onNavigate} email={user?.email} />

      <div className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto p-4 lg:p-6 custom-scrollbar">
        <div className="flex flex-col lg:flex-row gap-6 w-full min-h-full">
          {/* === LEFT PANEL: PROFILE === */}
          <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-5">
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col shadow-lg relative overflow-hidden group">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-600/10 blur-[60px] rounded-full pointer-events-none transition-all group-hover:bg-red-500/20"></div>
              
              <div className="flex gap-4 items-center mb-6">
                <div className="h-24 w-24 rounded-[1.25rem] bg-gradient-to-br from-red-500 to-rose-600 p-[2px] shadow-[0_4px_20px_rgba(225,29,72,0.2)]">
                  <div className="h-full w-full rounded-[1.15rem] bg-slate-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                    <User size={48} className="text-red-400" />
                  </div>
                </div>
                <div className="flex flex-col z-10 w-full overflow-hidden">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight truncate">
                    Prof. {user?.email?.split("@")[0] || "Instructor"}
                  </h2>
                  <p className="text-sm text-red-400 font-medium mt-0.5">Senior Evaluator</p>
                </div>
              </div>

              <div className="w-full border-t border-white/5 pt-5 z-10 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Department</span>
                  <span className="text-slate-800 dark:text-slate-200">CompSci</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Term</span>
                  <span className="text-slate-800 dark:text-slate-200">Fall 2026</span>
                </div>
              </div>
            </div>
            
             {/* Quick Actions Card */}
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-lg">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 tracking-wide">Quick Actions</h3>
              <div className="flex flex-col gap-3">
                 <button onClick={() => onNavigate("evaluation")} className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold border border-red-500/20 rounded-xl transition-colors text-left px-4 flex justify-between items-center">
                   Go to Sandbox
                   <ChevronRight size={16} />
                 </button>
              </div>
            </div>
          </div>

          {/* === RIGHT PANEL: STATS & TABLE === */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {/* --- TOP: ACTIVE SUMMARY CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Pending */}
              <div className="bg-white/[0.02] backdrop-blur-xl border border-orange-500/20 rounded-2xl p-6 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 blur-[30px] rounded-full pointer-events-none"></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20">
                    <Clock size={22} className="text-orange-400" />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-orange-200/80 mb-1">Pending Reviews</h3>
                <span className="text-4xl font-black text-slate-900 dark:text-white">{stats.pending}</span>
              </div>

              {/* Evaluated */}
              <div className="bg-white/[0.02] backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-[30px] rounded-full pointer-events-none"></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 size={22} className="text-emerald-400" />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-emerald-200/80 mb-1">Evaluated</h3>
                <span className="text-4xl font-black text-slate-900 dark:text-white">{stats.evaluated}</span>
              </div>

              {/* Total */}
              <div className="bg-white/[0.02] backdrop-blur-xl border border-blue-500/20 rounded-2xl p-6 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-[30px] rounded-full pointer-events-none"></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <FileText size={22} className="text-blue-400" />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-blue-200/80 mb-1">Total Submissions</h3>
                <span className="text-4xl font-black text-slate-900 dark:text-white">{stats.total}</span>
              </div>
            </div>

            {/* --- BOTTOM: STUDENT TABLE --- */}
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-lg overflow-hidden flex flex-col flex-1 min-h-[400px]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 tracking-wide">
                   Active Submissions
                </h3>
                <div className="flex gap-2">
                  <button className="p-2 bg-white/[0.04] rounded-lg hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 transition-colors border border-white/5">
                    <Search size={16} />
                  </button>
                  <button className="p-2 bg-white/[0.04] rounded-lg hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 transition-colors border border-white/5">
                    <Filter size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-[800px] text-left text-sm border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      <th className="px-4 py-3">Student ID</th>
                      <th className="px-4 py-3">Problem</th>
                      <th className="px-4 py-3">Code Preview</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => {
                      const evalObj = sub.evaluations ? (Array.isArray(sub.evaluations) ? sub.evaluations[0] : sub.evaluations) : null;
                      const isEvaluated = !!evalObj && !!evalObj.final_scores;
                      const score = isEvaluated
                        ? (evalObj.final_scores.correctness || 0) +
                        (evalObj.final_scores.efficiency || 0) +
                        (evalObj.final_scores.style || 0)
                        : null;

                      return (
                        <tr
                          key={sub.submission_id}
                          className="bg-white/[0.015] hover:bg-white/[0.04] transition-colors rounded-xl overflow-hidden shadow-sm group"
                        >
                          <td className="px-4 py-4 rounded-l-xl font-mono text-slate-600 dark:text-slate-400 text-xs">
                            {sub.user_id.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-4 text-slate-800 dark:text-slate-200 font-medium max-w-[200px] truncate">
                            {sub.problems?.problem_statement
                              ? sub.problems.problem_statement.slice(0, 35) + (sub.problems.problem_statement.length > 35 ? "..." : "")
                              : "Untitled Problem"}
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-mono text-[11px] text-slate-400/80 bg-slate-950/50 px-2 py-1 rounded inline-block border border-white/5 max-w-[120px] truncate">
                              {sub.source_code ? sub.source_code.slice(0, 20) + "..." : "-"}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-xs text-slate-700 dark:text-slate-300">
                              {new Date(sub.submission_timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">
                              {new Date(sub.submission_timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {isEvaluated ? (
                              <div className="flex flex-col items-start gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold tracking-wider border border-emerald-500/20">
                                  Evaluated
                                </span>
                                {score !== null && (
                                  <span className="text-xs font-mono font-medium text-emerald-300 mt-0.5">{score}/30 Pts</span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 text-[10px] uppercase font-bold tracking-wider border border-orange-500/20">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right rounded-r-xl">
                            <button
                              onClick={() => onNavigate("evaluation", sub.submission_id)}
                              className="px-3 py-1.5 text-xs font-bold bg-white/[0.05] hover:bg-red-500 text-slate-700 dark:text-slate-300 hover:text-white rounded border border-black/10 dark:border-white/10 hover:border-red-400 transition-all ml-auto inline-flex items-center gap-1.5"
                            >
                              {isEvaluated ? "View" : "Grade"}
                              <ChevronRight size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {submissions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-500 font-medium bg-white/[0.01] rounded-xl">
                          No submissions available. 
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
