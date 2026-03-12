import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import axios from "axios";
import NavBar from "./NavBar";
import ProfileSettings from "./ProfileSettings";
import {
  User,
  Trophy,
  Flame,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  FileCode,
  Trash2,
  Settings,
  Plus,
  Check,
  X,
} from "lucide-react";

export default function StudentDashboard({
  onNavigate,
}: {
  onNavigate: (page: "dashboard" | "editor" | "problems") => void;
}) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSolved: 0,
    currentStreak: 0,
    bestStreak: 0,
    avgScores: { correctness: 0, efficiency: 0, style: 0 },
  });
  const [calendarData, setCalendarData] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // --- Manual Skills State ---
  const [skills, setSkills] = useState(() => {
    const saved = localStorage.getItem("student_skills");
    return saved ? JSON.parse(saved) : [
      { name: "Problem Solver", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
      { name: "JS Enthusiast", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
      { name: "Consistency", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
      { name: "Pythonista", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
    ];
  });
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");

  const skillColorPalette = [
    "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "bg-pink-500/10 text-pink-400 border-pink-500/20",
    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    "bg-orange-500/10 text-orange-400 border-orange-500/20",
    "bg-rose-500/10 text-rose-400 border-rose-500/20",
    "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ];

  useEffect(() => {
    localStorage.setItem("student_skills", JSON.stringify(skills));
  }, [skills]);

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkillName.trim()) {
      const randomColor = skillColorPalette[Math.floor(Math.random() * skillColorPalette.length)];
      setSkills([...skills, { name: newSkillName.trim(), color: randomColor }]);
      setNewSkillName("");
      setShowAddSkill(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      setUser(session.user);

      // allSettled: a profile failure NEVER blocks submissions from loading
      const [profileResult, dashboardResult] = await Promise.allSettled([
        axios.get(`http://127.0.0.1:5000/api/profiles/${session.user.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        }),
        axios.get(`http://127.0.0.1:5000/api/dashboard/${session.user.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
      ]);

      // ── Profile (best-effort: failure is non-fatal) ──
      if (profileResult.status === "fulfilled" && profileResult.value.data.success) {
        const p = profileResult.value.data.profile;
        setProfile(p);
        const savedTheme = p.theme_preference || "dark";
        if (savedTheme === "dark") {
          document.documentElement.classList.add("dark");
          localStorage.setItem("theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          localStorage.setItem("theme", "light");
        }
      } else if (profileResult.status === "rejected") {
        console.warn("Profile fetch failed (non-fatal):", profileResult.reason?.message);
      }

      // ── Submissions (required) ──
      if (dashboardResult.status === "rejected") {
        throw new Error("Failed to fetch submissions: " + dashboardResult.reason?.message);
      }
      if (!dashboardResult.value.data.success) {
        throw new Error(dashboardResult.value.data.error || "Failed to fetch student dashboard data");
      }

      const safeSubs = dashboardResult.value.data.data || [];
      setSubmissions(safeSubs);
      calculateStats(safeSubs);
      processCalendarData(safeSubs);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
    }
  };


  // --- DATA TRANSFORMATION FOR HEATMAP ---
  const processCalendarData = (subs: any[]) => {
    const today = new Date();
    const dateMap = new Map<string, number>();

    subs.forEach((s) => {
      const date = new Date(s.submission_timestamp).toISOString().split("T")[0];
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });

    // Generate last 365 days
    const data = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = dateMap.get(dateStr) || 0;

      let level = 0;
      if (count >= 1) level = 1;
      if (count >= 3) level = 2;
      if (count >= 5) level = 3;
      if (count >= 8) level = 4;

      data.push({ date: dateStr, count, level });
    }
    setCalendarData(data);
  };

  const calculateStats = (subs: any[]) => {
    const currentStreak = calculateStreak(subs);

    // Best streak: compute all-time by scanning date sequence
    const bestStreak = (() => {
      if (subs.length === 0) return 0;
      const uniqueDates = Array.from(
        new Set(subs.map((s) => new Date(s.submission_timestamp).toISOString().split("T")[0]))
      ).sort();
      let best = 1, cur = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const a = new Date(uniqueDates[i - 1]), b = new Date(uniqueDates[i]);
        const diff = (b.getTime() - a.getTime()) / (1000 * 3600 * 24);
        cur = diff === 1 ? cur + 1 : 1;
        if (cur > best) best = cur;
      }
      return best;
    })();

    // Average scores across all evaluated submissions
    const evaluated = subs.filter(
      (s) => s.evaluations &&
        (Array.isArray(s.evaluations) ? s.evaluations[0]?.final_scores : s.evaluations?.final_scores)
    );
    const avgScores = { correctness: 0, efficiency: 0, style: 0 };
    if (evaluated.length > 0) {
      evaluated.forEach((s) => {
        const sc = Array.isArray(s.evaluations) ? s.evaluations[0]?.final_scores : s.evaluations?.final_scores;
        if (sc) {
          avgScores.correctness += sc.correctness || 0;
          avgScores.efficiency += sc.efficiency || 0;
          avgScores.style += sc.style || 0;
        }
      });
      avgScores.correctness = Math.round(avgScores.correctness / evaluated.length);
      avgScores.efficiency = Math.round(avgScores.efficiency / evaluated.length);
      avgScores.style = Math.round(avgScores.style / evaluated.length);
    }

    setStats({ totalSolved: subs.length, currentStreak, bestStreak, avgScores });
  };

  const calculateStreak = (subs: any[]) => {
    // Simple streak logic: Check consecutive days going back from today
    if (subs.length === 0) return 0;
    const uniqueDates = Array.from(
      new Set(
        subs.map((s) => new Date(s.submission_timestamp).toISOString().split("T")[0]),
      ),
    )
      .sort()
      .reverse();

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

    let streak = 1;
    let current = new Date(uniqueDates[0]);

    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i]);
      const diff = (current.getTime() - prev.getTime()) / (1000 * 3600 * 24);
      if (diff === 1) {
        streak++;
        current = prev;
      } else {
        break;
      }
    }
    return streak;
  };

  // Logout is now handled by NavBar

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!window.confirm("Are you sure you want to delete this submission? This cannot be undone.")) return;
    setDeletingId(submissionId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await axios.delete(
        `http://127.0.0.1:5000/api/submissions/${submissionId}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      if (response.data.success) {
        // Optimistically remove from local state
        const updated = submissions.filter((s) => s.submission_id !== submissionId);
        setSubmissions(updated);
        calculateStats(updated);
        processCalendarData(updated);
      } else {
        alert("Failed to delete submission: " + response.data.error);
      }
    } catch (error: any) {
      alert("Error deleting submission: " + (error.response?.data?.error || error.message));
    } finally {
      setDeletingId(null);
    }
  };

  // Helper for Heatmap Colors
  const getLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return "bg-emerald-900/60"; // Low
      case 2:
        return "bg-emerald-700/80"; // Medium
      case 3:
        return "bg-emerald-500"; // High
      case 4:
        return "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.6)]"; // Max
      default:
        return "bg-slate-800/50"; // Empty
    }
  };

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
    <>
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans overflow-hidden">
      {/* SHARED NAV BAR */}
      <NavBar role="student" active="dashboard" onNavigate={onNavigate} email={user?.email} />

      <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
        <div className="flex flex-col lg:flex-row gap-6 w-full min-h-full p-4 lg:p-6">
          {/* ================= LEFT PANEL (Profile - LeetCode Style) ================= */}
          <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-5">
            {/* Profile Card */}
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col shadow-lg relative overflow-hidden group">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-600/10 blur-[60px] rounded-full pointer-events-none transition-all group-hover:bg-cyan-500/20"></div>
              
              <div className="flex gap-4 items-center mb-6">
                <div className="h-24 w-24 rounded-[1.25rem] bg-gradient-to-br from-cyan-400 to-blue-600 p-[2px] shadow-[0_4px_20px_rgba(6,182,212,0.2)]">
                  <div className="h-full w-full rounded-[1.15rem] bg-slate-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                    <User size={48} className="text-cyan-400" />
                  </div>
                </div>
                <div className="flex flex-col z-10">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                    {profile?.display_name || user?.email?.split("@")[0] || "Student"}
                  </h2>
                  <p className="text-sm font-medium" style={{ color:
                    stats.totalSolved >= 20 ? '#a78bfa' : // purple — Expert
                    stats.totalSolved >= 10 ? '#60a5fa' : // blue — Intermediate
                    stats.totalSolved >= 5  ? '#34d399' : // green — Apprentice
                    '#22d3ee'                              // cyan — Novice
                  }}>
                    Rank: {stats.totalSolved >= 20 ? 'Expert' : stats.totalSolved >= 10 ? 'Intermediate' : stats.totalSolved >= 5 ? 'Apprentice' : 'Novice'}
                  </p>
                  {profile?.bio && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[150px] line-clamp-2">{profile.bio}</p>
                  )}
                </div>
              </div>
              
              <div className="w-full flex justify-center gap-3 mb-6 relative z-10">
                <button
                  id="edit-profile-btn"
                  onClick={() => setShowProfileSettings(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-black/10 dark:border-white/10 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Settings size={14} />
                  Edit Profile
                </button>
              </div>

              <div className="w-full border-t border-white/5 pt-5 relative z-10 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2"><Trophy size={16} className="text-slate-500 dark:text-slate-500"/> Total Solved</span>
                  <span className="text-slate-900 dark:text-white font-semibold text-base">{stats.totalSolved}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2"><Flame size={16} className="text-slate-500 dark:text-slate-500"/> Current Streak</span>
                  <span className="text-slate-900 dark:text-white font-semibold text-base">{stats.currentStreak}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2"><Calendar size={16} className="text-slate-500 dark:text-slate-500"/> Joined</span>
                  <span className="text-slate-900 dark:text-white font-semibold text-sm">
                    {profile?.joined_at
                      ? new Date(profile.joined_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Badges/Skills Card */}
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wide">Badges & Skills</h3>
                <button 
                  onClick={() => setShowAddSkill(!showAddSkill)}
                  className="p-1 rounded-full hover:bg-white/5 text-slate-500 hover:text-cyan-400 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2.5">
                {skills.map((skill: any, idx: number) => (
                  <span key={idx} className={`px-3 py-1 ${skill.color} text-xs font-medium rounded-full border shadow-sm`}>
                    {skill.name}
                  </span>
                ))}
                
                {showAddSkill && (
                  <form onSubmit={handleAddSkill} className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                    <input
                      autoFocus
                      type="text"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      placeholder="Add skill..."
                      className="bg-slate-900/50 border border-white/10 rounded-full px-3 py-0.5 text-xs text-white outline-none focus:border-cyan-500/50 w-24 sm:w-32 transition-all"
                    />
                    <button type="submit" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                      <Check size={14} />
                    </button>
                    <button type="button" onClick={() => { setShowAddSkill(false); setNewSkillName(""); }} className="text-rose-400 hover:text-rose-300 transition-colors">
                      <X size={14} />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* ================= RIGHT PANEL ================= */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Solved Problems / Progress */}
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-lg flex items-center gap-8 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-emerald-500/10 transition-colors"></div>
                
                {/* Solved Circle */}
                <div className="relative w-28 h-28 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-slate-800" strokeWidth="6" />
                    <circle 
                      cx="50" cy="50" r="45" fill="none" stroke="currentColor" 
                      className="text-emerald-500" 
                      strokeWidth="6" strokeLinecap="round" 
                      strokeDasharray="282.7" 
                      strokeDashoffset={282.7 - ((stats.totalSolved > 0 ? Math.min(stats.totalSolved * 10, 100) : 0) / 100 * 282.7)} 
                      style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.totalSolved}</span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-bold tracking-widest mt-0.5">Solved</span>
                  </div>
                </div>

                {/* Average Score Breakdown from real evaluations */}
                <div className="flex-1 space-y-4">
                  {[
                    { label: 'Correctness', value: stats.avgScores.correctness, color: 'bg-emerald-500' },
                    { label: 'Efficiency',  value: stats.avgScores.efficiency,  color: 'bg-yellow-500' },
                    { label: 'Code Style',  value: stats.avgScores.style,       color: 'bg-rose-500' },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div className="flex justify-between items-end mb-1.5">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {value}<span className="text-slate-500 dark:text-slate-500 font-normal">/10</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${color} rounded-full transition-all duration-700`}
                          style={{ width: `${value * 10}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {stats.avgScores.correctness === 0 && stats.avgScores.efficiency === 0 && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-500 italic">Scores will appear after your first evaluated submission.</p>
                  )}
                </div>
              </div>

              {/* Streak Meta-Card */}
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-lg flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-500/10 blur-[60px] rounded-full pointer-events-none transition-all group-hover:bg-orange-500/20"></div>
                <div className="flex justify-between items-center mb-6 z-10">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wide">Activity Streak</h3>
                  <Flame size={20} className="text-orange-500" />
                </div>
                <div className="flex items-baseline gap-2 z-10">
                  <span className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.currentStreak}</span>
                  <span className="text-slate-600 dark:text-slate-400 font-medium pb-1">days</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-3 font-medium z-10">
                  {stats.bestStreak > 0
                    ? `Your best streak is ${stats.bestStreak} day${stats.bestStreak !== 1 ? 's' : ''}.`
                    : "Submit today to start a streak!"}
                </p>
              </div>
            </div>

            {/* HEATMAP / CALENDAR */}
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-lg overflow-hidden flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                 <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                   <Calendar size={16} className="text-slate-600 dark:text-slate-400"/>
                   {calendarData.reduce((acc, curr) => acc + curr.count, 0)} submissions <span className="text-slate-500 dark:text-slate-500 font-normal hidden sm:inline">in the past year</span>
                 </h3>
                 <div className="flex items-center gap-2.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                   <span>Less</span>
                   <div className="w-3.5 h-3.5 rounded-[3px] bg-slate-800/50"></div>
                   <div className="w-3.5 h-3.5 rounded-[3px] bg-emerald-900/60"></div>
                   <div className="w-3.5 h-3.5 rounded-[3px] bg-emerald-700/80"></div>
                   <div className="w-3.5 h-3.5 rounded-[3px] bg-emerald-500"></div>
                   <div className="w-3.5 h-3.5 rounded-[3px] bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.6)]"></div>
                   <span>More</span>
                 </div>
              </div>
              <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                <div className="flex min-w-max">
                  <div className="grid grid-rows-7 grid-flow-col gap-[5px]">
                    {calendarData.map((day, idx) => (
                      <div
                        key={idx}
                        title={`${day.count} submissions on ${day.date}`}
                        className={`w-3.5 h-3.5 rounded-[3px] ${getLevelColor(day.level)} hover:ring-1 hover:ring-white/50 hover:scale-110 transition-all cursor-pointer`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* RECENT ACTIVITY TABLE */}
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-lg overflow-hidden flex flex-col flex-1 min-h-[400px]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <FileCode size={16} className="text-slate-600 dark:text-slate-400" /> Recent Activity
                </h3>
              </div>
              
              <div className="flex-1 overflow-x-auto scrollbar-hide">
                <table className="w-full text-left text-sm border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      <th className="px-4 py-2 w-1/4">Problem</th>
                      <th className="px-4 py-2 w-[120px]">Code Snippet</th>
                      <th className="px-4 py-2 w-1/4">Feedback</th>
                      <th className="px-4 py-2 w-[80px]">Score</th>
                      <th className="px-4 py-2 text-right w-[100px]">Status</th>
                      <th className="px-4 py-2 text-right w-[50px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => {
                      const evalObj = sub.evaluations ? (Array.isArray(sub.evaluations) ? sub.evaluations[0] : sub.evaluations) : null;
                      const isEvaluated = !!evalObj;
                      const hasScores = isEvaluated && evalObj.final_scores;

                      return (
                        <tr
                          key={sub.submission_id}
                          className="bg-white/[0.015] hover:bg-white/[0.04] transition-colors rounded-xl overflow-hidden shadow-sm"
                        >
                          <td className="px-4 py-4 rounded-l-xl">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-4">
                              {sub.problems?.problem_statement
                                ? sub.problems.problem_statement.slice(0, 45) + (sub.problems.problem_statement.length > 45 ? "..." : "")
                                : "Untitled Problem"}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-500 mt-1 font-medium">
                              {new Date(sub.submission_timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </td>
                          <td className="px-2 py-4">
                            <div className="font-mono text-[10px] text-slate-400/80 bg-slate-950/50 px-2 py-1.5 rounded-lg border border-white/5 truncate max-w-[120px]">
                              {sub.source_code ? sub.source_code.slice(0, 30) + "..." : "-"}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {isEvaluated && evalObj.teacher_feedback ? (
                              <div className="text-[11px] text-slate-700 dark:text-slate-300 italic truncate max-w-[150px] lg:max-w-[200px]" title={evalObj.teacher_feedback}>
                                {evalObj.teacher_feedback}
                              </div>
                            ) : (
                              <span className="text-slate-600 text-[11px] font-medium">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {hasScores ? (
                              <div className="flex items-center gap-1.5 font-mono text-xs">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {(evalObj.final_scores.correctness || 0) +
                                   (evalObj.final_scores.efficiency || 0) +
                                   (evalObj.final_scores.style || 0)}
                                </span>
                                <span className="text-slate-500 dark:text-slate-500">/30</span>
                              </div>
                            ) : (
                              <span className="text-slate-600 text-xs font-medium">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right rounded-r-xl">  
                            <StatusBadge status={sub.validation_status} />
                          </td>
                          <td className="px-2 py-4 text-right">
                            <button
                              id={`delete-submission-${sub.submission_id}`}
                              onClick={() => handleDeleteSubmission(sub.submission_id)}
                              disabled={deletingId === sub.submission_id}
                              title="Delete this submission"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {submissions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-500 font-medium bg-white/[0.01] rounded-xl">
                          No recent submissions. Start coding!
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

    {/* ── Profile Settings Modal ── */}
    {showProfileSettings && user && (
      <ProfileSettings
        userId={user.id}
        onClose={() => setShowProfileSettings(false)}
        onProfileUpdated={(updated) => {
          setProfile((prev: any) => ({ ...prev, ...updated }));
        }}
      />
    )}
    </>
  );
}

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "submitted":
    case "valid":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
          <CheckCircle2 size={12} /> Solved
        </span>
      );
    case "invalid":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20">
          <XCircle size={12} /> Failed
        </span>
      );
    case "draft":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
          <Clock size={12} /> Draft
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-bold border border-yellow-500/20">
          <Clock size={12} /> Pending
        </span>
      );
  }
};
