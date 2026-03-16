import { useState, useEffect, useRef } from "react";
import {
  Code, Cpu, BarChart3, Users, MessageSquare, Zap,
  ChevronRight, ArrowRight, Terminal, Brain, Star,
  CheckCircle, Shield, Activity,
  BookOpen, GraduationCap, Layers,
} from "lucide-react";
import logo from "../assets/no-bg-white-logo.png";
import { apiUrl } from "../lib/apiConfig";

interface LandingPageProps {
  onGetStarted: (mode: "login" | "signup") => void;
}

// ─── Typewriter Hook ───────────────────────────────────────────────────────
function useTypewriter(texts: string[], speed = 60, pauseMs = 1800) {
  const [displayed, setDisplayed] = useState("");
  const [textIdx, setTextIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[textIdx];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && charIdx < current.length) {
      timeout = setTimeout(() => setCharIdx((c) => c + 1), speed);
    } else if (!deleting && charIdx === current.length) {
      timeout = setTimeout(() => setDeleting(true), pauseMs);
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(() => setCharIdx((c) => c - 1), speed / 2);
    } else {
      setDeleting(false);
      setTextIdx((i) => (i + 1) % texts.length);
    }
    setDisplayed(current.slice(0, charIdx));
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, textIdx, texts, speed, pauseMs]);

  return displayed;
}

// ─── Counter Hook ──────────────────────────────────────────────────────────
function useCounter(target: number, duration = 2000, started: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);
  return count;
}

// ─── Reveal Hook ──────────────────────────────────────────────────────────
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── Particles Background ─────────────────────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 8,
    duration: Math.random() * 6 + 6,
    color: ["#22d3ee", "#3b82f6", "#818cf8", "#34d399", "#f87171", "#a78bfa"][Math.floor(Math.random() * 6)],
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full opacity-40"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animation: `particle-float ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── MatrixRain ───────────────────────────────────────────────────────────
function MatrixRain() {
  const cols = Array.from({ length: 18 }, (_, i) => i);
  const chars = "01アイウエオカキクケコ∑∂∇λ{}[]<>≠≡";
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.06]">
      {cols.map((col) => (
        <div
          key={col}
          className="absolute top-0 font-mono text-xs text-cyan-400 whitespace-nowrap animate-matrix"
          style={{
            left: `${(col / 18) * 100}%`,
            animationDelay: `${col * 0.4}s`,
            animationDuration: `${5 + col * 0.3}s`,
          }}
        >
          {Array.from({ length: 24 }, (_, j) => (
            <div key={j}>{chars[Math.floor(Math.random() * chars.length)]}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Mock Code Editor ─────────────────────────────────────────────────────
function MockEditor() {
  const lines = [
    { tokens: [{ t: "def ", c: "#818cf8" }, { t: "evaluate_code", c: "#22d3ee" }, { t: "(solution, testcases):", c: "#e2e8f0" }] },
    { tokens: [{ t: "    results = ", c: "#e2e8f0" }, { t: "[]", c: "#f59e0b" }] },
    { tokens: [{ t: "    ", c: "#e2e8f0" }, { t: "for ", c: "#818cf8" }, { t: "tc ", c: "#e2e8f0" }, { t: "in ", c: "#818cf8" }, { t: "testcases:", c: "#e2e8f0" }] },
    { tokens: [{ t: "        output = ", c: "#e2e8f0" }, { t: "run", c: "#22d3ee" }, { t: "(solution, tc)", c: "#e2e8f0" }] },
    { tokens: [{ t: "        score = ai_engine", c: "#e2e8f0" }, { t: ".score(output)", c: "#22d3ee" }] },
    { tokens: [{ t: "        results", c: "#e2e8f0" }, { t: ".append(score)", c: "#34d399" }] },
    { tokens: [{ t: "    ", c: "#e2e8f0" }, { t: "return ", c: "#818cf8" }, { t: "aggregate", c: "#22d3ee" }, { t: "(results)", c: "#e2e8f0" }] },
    { tokens: [{ t: "", c: "" }] },
    { tokens: [{ t: "# ✓ Correctness: ", c: "#94a3b8" }, { t: "9.2/10", c: "#34d399" }] },
    { tokens: [{ t: "# ⚡ Efficiency:  ", c: "#94a3b8" }, { t: "8.7/10", c: "#f59e0b" }] },
    { tokens: [{ t: "# ✦ Style:        ", c: "#94a3b8" }, { t: "9.5/10", c: "#22d3ee" }] },
  ];
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-[#0d1117] shadow-[0_0_80px_rgba(6,182,212,0.15)]">
      {/* Titlebar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border-b border-white/5">
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
        <span className="ml-3 text-xs text-slate-500 font-mono">solution.py — CodeIR Workspace</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded">● Live</span>
        </div>
      </div>
      {/* Scan line */}
      <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent animate-scan-line z-10 pointer-events-none" />
      {/* Code lines */}
      <div className="p-4 font-mono text-sm space-y-1.5 overflow-hidden">
        {lines.map((line, li) => (
          <div key={li} className="flex gap-4">
            <span className="text-slate-700 text-xs w-4 shrink-0 select-none">{li + 1}</span>
            <div>
              {line.tokens.map((tok, ti) => (
                <span key={ti} style={{ color: tok.c }}>{tok.t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* AI panel at bottom */}
      <div className="m-3 mt-0 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
        <div className="flex items-center gap-2 mb-1.5">
          <Brain size={12} className="text-cyan-400" />
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">AI Insight</span>
          <div className="ml-auto flex gap-1">
            {[0, 1, 2].map((d) => (
              <div key={d} className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
            ))}
          </div>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Efficient O(n) solution detected. Consider using a generator for memory optimization. Edge case for empty input handled correctly.
        </p>
      </div>
    </div>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────
interface PlatformStats {
  totalSubmissions: number;
  totalEvaluations: number;
  totalProblems: number;
  totalUsers: number;
  totalStudents: number;
  totalInstructors: number;
  avgScore: number;
  avgCorrectness: number;
  avgEfficiency: number;
  avgStyle: number;
  aiEngines: number;
  evaluationMetrics: number;
}

interface Testimonial {
  id: string;
  display_name: string;
  role: string;
  rating: number;
  text: string;
  created_at: string;
}

// ─── MAIN LANDING PAGE ────────────────────────────────────────────────────
export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const typewritten = useTypewriter([
    "AI-Powered Code Evaluation",
    "Real-time Instructor Feedback",
    "Ollama, Gemini & Groq Integration",
    "Student Progress Tracking",
    "Intelligent Code Analysis",
  ]);

  const [scrolled, setScrolled] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  // ── Live data from backend ──
  const [liveStats, setLiveStats] = useState<PlatformStats | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    fetch(`${apiUrl}/public/stats`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setLiveStats(d.stats); })
      .catch(() => { });
    fetch(`${apiUrl}/public/testimonials`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setTestimonials(d.testimonials || []); })
      .catch(() => { });
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  const s = liveStats;
  const c1 = useCounter(s?.totalSubmissions ?? 0, 2000, statsVisible);
  const c2 = useCounter(s?.aiEngines ?? 3, 800, statsVisible);
  const c3 = useCounter(s?.evaluationMetrics ?? 3, 900, statsVisible);
  const c4 = useCounter(s?.totalEvaluations ?? 0, 1800, statsVisible);

  const features = [
    {
      icon: Code, title: "Intelligent Code Editor",
      desc: "Monaco-powered editor with syntax highlighting, auto-complete, and multi-language support. Code like a pro, right in your browser.",
      color: "cyan", gradient: "from-cyan-500/20 to-blue-500/10", border: "border-cyan-500/20",
      glow: "rgba(6,182,212,0.15)", accent: "text-cyan-400", bg: "bg-cyan-500/10",
    },
    {
      icon: Brain, title: "AI-Powered Evaluation",
      desc: "Triple AI engine (Ollama local, Gemini cloud, & Groq ultra-fast) analyzes correctness, efficiency, and code style — giving nuanced, human-grade feedback.",
      color: "blue", gradient: "from-blue-500/20 to-indigo-500/10", border: "border-blue-500/20",
      glow: "rgba(59,130,246,0.15)", accent: "text-blue-400", bg: "bg-blue-500/10",
    },
    {
      icon: GraduationCap, title: "Instructor Dashboard",
      desc: "A faculty-grade control center with live submission feeds, evaluation queue, search, filter, and one-click grading — all in one place.",
      color: "red", gradient: "from-red-500/20 to-rose-500/10", border: "border-red-500/20",
      glow: "rgba(239,68,68,0.15)", accent: "text-red-400", bg: "bg-red-500/10",
    },
    {
      icon: BarChart3, title: "Student Progress Tracking",
      desc: "GitHub-style heatmap, streak counters, performance analytics, and personalized ranking to keep students engaged and motivated.",
      color: "emerald", gradient: "from-emerald-500/20 to-teal-500/10", border: "border-emerald-500/20",
      glow: "rgba(16,185,129,0.15)", accent: "text-emerald-400", bg: "bg-emerald-500/10",
    },
    {
      icon: MessageSquare, title: "Real-time Chat",
      desc: "Built-in instructor-student messaging with floating panel, conversation history, and role-based DMs for doubt clarification.",
      color: "purple", gradient: "from-purple-500/20 to-violet-500/10", border: "border-purple-500/20",
      glow: "rgba(139,92,246,0.15)", accent: "text-purple-400", bg: "bg-purple-500/10",
    },
    {
      icon: Layers, title: "Problem Bank",
      desc: "Instructor-curated problem sets with difficulty ratings, language filters, and instant assignment to students via the editor.",
      color: "orange", gradient: "from-orange-500/20 to-amber-500/10", border: "border-orange-500/20",
      glow: "rgba(249,115,22,0.15)", accent: "text-orange-400", bg: "bg-orange-500/10",
    },
  ];

  const feat1 = useReveal();
  const feat2 = useReveal();
  const aiSection = useReveal();
  const dashSection = useReveal();
  const ctaSection = useReveal();

  return (
    <div className="min-h-screen bg-[#050510] text-white font-sans overflow-x-hidden">

      {/* ═══════ FIXED NAVBAR ═══════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#050510]/90 backdrop-blur-xl border-b border-white/5 shadow-[0_1px_30px_rgba(0,0,0,0.5)]" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="CodeIR" className="h-8 w-auto drop-shadow-[0_0_10px_rgba(6,182,212,0.7)]" />
            <span className="text-xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">CodeIR</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            {["Features", "AI Models", "Dashboards"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(" ", "-")}`}
                className="hover:text-cyan-400 transition-colors relative group">
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-cyan-400 transition-all group-hover:w-full" />
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => onGetStarted("login")} className="hidden md:block text-sm text-slate-400 hover:text-white transition-colors font-medium px-4 py-2">
              Sign In
            </button>
            <button
              onClick={() => onGetStarted("signup")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 hover:-translate-y-0.5"
            >
              Get Started <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════ HERO SECTION ═══════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background glows */}
        <div className="absolute top-[-15%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-cyan-600/8 blur-[180px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-800/8 blur-[150px] pointer-events-none" />
        <div className="absolute top-[30%] right-[20%] w-[30vw] h-[30vw] rounded-full bg-indigo-600/8 blur-[120px] pointer-events-none" />
        <Particles />
        <MatrixRain />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center w-full">

          {/* Left: Text */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-8 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Powered by Ollama, Gemini & Groq AI
            </div>

            <h1 className="text-5xl xl:text-7xl font-black tracking-tight leading-[1.05] mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              Next-Gen
              <br />
              <span className="gradient-text-cyan-blue">Code Evaluation</span>
              <br />
              <span className="text-white">Engine</span>
            </h1>

            {/* Typewriter */}
            <div className="flex items-center gap-3 mb-8 h-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <Zap size={16} className="text-cyan-400 shrink-0" />
              <p className="text-lg text-slate-400 font-medium">
                {typewritten}
                <span className="inline-block w-px h-5 bg-cyan-400 ml-0.5 align-middle animate-blink-caret" />
              </p>
            </div>

            <p className="text-slate-500 text-lg leading-relaxed mb-10 max-w-xl animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              A unified platform where students write, submit, and receive AI-grade feedback on their code — and instructors evaluate, track, and engage in real time.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
              <button
                onClick={() => onGetStarted("signup")}
                className="group flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_40px_rgba(6,182,212,0.3)] hover:shadow-[0_0_60px_rgba(6,182,212,0.5)] transition-all duration-300 hover:-translate-y-1 animate-glow-pulse"
              >
                Start Evaluating Code
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => onGetStarted("login")}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-base border border-white/10 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all duration-300"
              >
                <Terminal size={18} /> View Demo
              </button>
            </div>

            {/* Trust line */}
            <div className="flex items-center gap-4 mt-10 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
              <div className="flex -space-x-1.5">
                {["#22d3ee", "#3b82f6", "#818cf8", "#34d399", "#f87171"].map((c, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border border-[#050510] flex items-center justify-center text-xs font-bold" style={{ background: c + "33", color: c, borderColor: "#050510" }}>
                    {["S", "T", "A", "R", "K"][i]}
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500"><span className="text-white font-semibold">{s?.totalUsers ?? 0}</span> users on the platform</p>
            </div>
          </div>

          {/* Right: Mock Editor */}
          <div className="hidden lg:block animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-indigo-500/10 blur-xl" />
              <MockEditor />
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-3 py-2 backdrop-blur-xl animate-float">
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={12} className="text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">Evaluated</span>
                </div>
                <p className="text-lg font-black text-white">27.4<span className="text-xs text-slate-400 font-normal">/30</span></p>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-blue-500/20 border border-blue-500/30 rounded-xl px-3 py-2 backdrop-blur-xl animate-float-slow">
                <div className="flex items-center gap-1.5">
                  <Activity size={12} className="text-blue-400" />
                  <span className="text-xs font-bold text-blue-400">Real-time</span>
                </div>
                <p className="text-xs text-slate-400">AI analysis in progress...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce-subtle">
          <span className="text-xs text-slate-600 uppercase tracking-widest">Scroll to explore</span>
          <div className="w-px h-8 bg-gradient-to-b from-slate-600 to-transparent" />
        </div>
      </section>

      {/* ═══════ STATS BAR ═══════ */}
      <section ref={statsRef} className="relative py-12 border-y border-white/5 bg-white/[0.01] backdrop-blur-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/3 via-blue-500/3 to-indigo-500/3" />
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: c1, suffix: "+", label: "Submissions Made", icon: CheckCircle, color: "text-cyan-400" },
              { value: c2, suffix: "", label: "AI Engines Integrated", icon: Brain, color: "text-blue-400" },
              { value: c3, suffix: " Metrics", label: "Per Evaluation", icon: BarChart3, color: "text-indigo-400" },
              { value: c4, suffix: "+", label: "Evaluations Completed", icon: Star, color: "text-emerald-400" },
            ].map(({ value, suffix, label, icon: Icon, color }, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <Icon size={20} className={`${color} mb-2 opacity-70`} />
                <div className={`text-4xl font-black ${color} tabular-nums`}>{value}{suffix}</div>
                <div className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FEATURES SECTION ═══════ */}
      <section id="features" className="py-28 max-w-7xl mx-auto px-6">
        <div ref={feat1.ref} className={`text-center mb-20 transition-all duration-700 ${feat1.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.02] text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
            <Zap size={12} className="text-cyan-400" /> Platform Features
          </div>
          <h2 className="text-4xl xl:text-5xl font-black tracking-tight mb-5">
            Everything you need to evaluate,
            <br />
            <span className="gradient-text-cyan-blue">teach, and learn code</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
            From the student's first keystroke to the instructor's final grade — CodeIR handles the entire evaluation lifecycle with AI precision.
          </p>
        </div>

        <div ref={feat2.ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc, gradient, border, glow, accent, bg }, i) => (
            <div
              key={i}
              className={`group relative rounded-2xl p-6 border ${border} bg-gradient-to-br ${gradient} backdrop-blur-xl hover:-translate-y-2 transition-all duration-400 cursor-default overflow-hidden shimmer-border`}
              style={{
                transitionDelay: feat2.visible ? `${i * 80}ms` : "0ms",
                opacity: feat2.visible ? 1 : 0,
                transform: feat2.visible ? "translateY(0)" : "translateY(30px)",
                transition: `opacity 0.6s ease ${i * 80}ms, transform 0.6s ease ${i * 80}ms, box-shadow 0.3s ease`,
                boxShadow: `0 0 0 0 ${glow}`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 0 40px 0 ${glow}`)}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = `0 0 0 0 ${glow}`)}
            >
              <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: glow }} />
              <div className={`w-12 h-12 ${bg} border ${border} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={22} className={accent} />
              </div>
              <h3 className={`text-lg font-bold text-white mb-2 group-hover:${accent} transition-colors`}>{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ AI MODELS SECTION ═══════ */}
      <section id="ai-models" className="py-28 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div ref={aiSection.ref} className={`text-center mb-20 transition-all duration-700 ${aiSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.02] text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
              <Cpu size={12} className="text-blue-400" /> Triple AI Architecture
            </div>
            <h2 className="text-4xl xl:text-5xl font-black tracking-tight mb-5">
              Three AI engines.
              <br />
              <span className="gradient-text-cyan-blue">One powerful platform.</span>
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Choose between edge-local privacy with Ollama, cloud-scale power with Gemini, or ultra-fast open-source models via Groq — switch with a single click.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Ollama Card */}
            <div className={`relative rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 p-8 overflow-hidden transition-all duration-700 ${aiSection.visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"}`}>
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-indigo-500/10 blur-[80px]" />
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center">
                    <Cpu size={28} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">Ollama</h3>
                    <p className="text-indigo-400 text-sm font-semibold">Local Edge AI · Privacy First</p>
                  </div>
                  <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">CPU/Local</span>
                </div>
                <div className="space-y-3 mb-6">
                  {["Zero data leaves your machine", "No API key required", "Works fully offline", "Low latency on local hardware", "Supports llama3, codellama models"].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-slate-400">
                      <CheckCircle size={14} className="text-indigo-400 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                {/* Mock "thinking" */}
                <div className="bg-[#0d1117] rounded-xl p-4 border border-white/5 font-mono text-xs">
                  <div className="text-indigo-400 mb-2">{">"} Analyzing submission...</div>
                  <div className="text-slate-500 space-y-1">
                    <div>→ Loading model: <span className="text-indigo-300">codellama:13b</span></div>
                    <div>→ Running evaluation pipeline...</div>
                    <div className="text-emerald-400">✓ Evaluation complete in 1.8s</div>
                  </div>
                  <div className="flex gap-1 mt-3">
                    {[0, 1, 2].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${d * 0.2}s` }} />)}
                  </div>
                </div>
              </div>
            </div>

            {/* Gemini Card */}
            <div className={`relative rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 p-8 overflow-hidden transition-all duration-700 ${aiSection.visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"}`} style={{ transitionDelay: "150ms" }}>
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-blue-500/10 blur-[80px]" />
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-blue-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center">
                    <Star size={28} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">Gemini</h3>
                    <p className="text-blue-400 text-sm font-semibold">Cloud AI · Maximum Power</p>
                  </div>
                  <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold border border-blue-500/30 bg-blue-500/10 text-blue-400">Cloud</span>
                </div>
                <div className="space-y-3 mb-6">
                  {["Gemini 2.0 Flash / Pro models", "Highly detailed feedback", "Scales to any class size", "Rich natural language reports", "Industry-grade code analysis"].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-slate-400">
                      <CheckCircle size={14} className="text-blue-400 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <div className="bg-[#0d1117] rounded-xl p-4 border border-white/5 font-mono text-xs">
                  <div className="text-blue-400 mb-2">{">"} Requesting Gemini evaluation...</div>
                  <div className="text-slate-500 space-y-1">
                    <div>→ Model: <span className="text-blue-300">gemini-2.0-flash</span></div>
                    <div>→ Analyzing 47 lines of Python...</div>
                    <div className="text-emerald-400">✓ Done. Score: 27.4/30</div>
                  </div>
                  <div className="flex gap-1 mt-3">
                    {[0, 1, 2].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${d * 0.2}s` }} />)}
                  </div>
                </div>
              </div>
            </div>

            {/* Groq Card */}
            <div className={`relative rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-8 overflow-hidden transition-all duration-700 ${aiSection.visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"}`} style={{ transitionDelay: "300ms" }}>
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-amber-500/10 blur-[80px]" />
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center">
                    <Zap size={28} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">Groq</h3>
                    <p className="text-amber-400 text-sm font-semibold">Cloud AI · Lightning Fast LPU</p>
                  </div>
                  <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-400">Cloud</span>
                </div>
                <div className="space-y-3 mb-6">
                  {["Llama 3.3 70B Versatile model", "Free-tier ultra-fast LPU inference", "Instantaneous response times", "Open source Llama 3 models", "Specialized code generation"].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-slate-400">
                      <CheckCircle size={14} className="text-amber-400 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <div className="bg-[#0d1117] rounded-xl p-4 border border-white/5 font-mono text-xs">
                  <div className="text-amber-400 mb-2">{">"}  Requesting Groq inference...</div>
                  <div className="text-slate-500 space-y-1">
                    <div>→ Model: <span className="text-amber-300">llama-3.3-70b-versatile</span></div>
                    <div>→ Analyzing student submission...</div>
                    <div className="text-emerald-400">✓ Done in 0.12s. Feedback generated.</div>
                  </div>
                  <div className="flex gap-1 mt-3">
                    {[0, 1, 2].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: `${d * 0.2}s` }} />)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ DASHBOARDS SECTION ═══════ */}
      <section id="dashboards" className="py-28 max-w-7xl mx-auto px-6">
        <div ref={dashSection.ref} className={`text-center mb-20 transition-all duration-700 ${dashSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.02] text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
            <Users size={12} className="text-emerald-400" /> Role-Based Dashboards
          </div>
          <h2 className="text-4xl xl:text-5xl font-black tracking-tight mb-5">
            Built for every role.
            <br />
            <span className="gradient-text-cyan-blue">Perfected for every workflow.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Student Dashboard Mock */}
          <div className={`transition-all duration-700 ${dashSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="relative rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-blue-500/3 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                <div className="flex gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500/60" /><span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" /><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" /></div>
                <span className="text-xs text-slate-500 font-mono">Student Dashboard</span>
                <span className="ml-auto text-[10px] border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 font-bold">STUDENT</span>
              </div>
              <div className="p-6 space-y-4">
                {/* Profile row */}
                <div className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-lg">S</div>
                  <div>
                    <div className="font-bold text-sm text-white">student@codeir.edu</div>
                    <div className="text-xs text-cyan-400 font-semibold">Rank: Intermediate</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-2xl font-black text-white">12</div>
                    <div className="text-[10px] text-slate-500 uppercase">Problems Solved</div>
                  </div>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[["🔥 Streak", "7 days", "orange"], ["🏆 Best", "15 days", "yellow"], ["⚡ Avg Score", s ? `${s.avgScore}/30` : "—/30", "cyan"]].map(([label, val, c], i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                      <div className="text-[10px] text-slate-500 mb-1">{label}</div>
                      <div className={`text-sm font-black text-${c}-400`}>{val}</div>
                    </div>
                  ))}
                </div>
                {/* Heatmap mock */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-3 font-semibold">Activity Heatmap</div>
                  <div className="flex gap-1 flex-wrap">
                    {Array.from({ length: 52 }, (_, w) => (
                      <div key={w} className="flex flex-col gap-1">
                        {Array.from({ length: 7 }, (_, d) => {
                          const level = Math.floor(Math.random() * 5);
                          const colors = ["bg-slate-800/50", "bg-emerald-900/60", "bg-emerald-700/80", "bg-emerald-500", "bg-emerald-300"];
                          return <div key={d} className={`w-2 h-2 rounded-[2px] ${colors[level]}`} />;
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Score bars */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                  {[["Correctness", "emerald", s ? Math.round(s.avgCorrectness * 10) : 80], ["Efficiency", "yellow", s ? Math.round(s.avgEfficiency * 10) : 70], ["Code Style", "rose", s ? Math.round(s.avgStyle * 10) : 85]].map(([lbl, c, v]) => (
                    <div key={lbl as string}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">{lbl}</span><span className="text-white font-bold">{v}%</span></div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full bg-${c}-500 rounded-full`} style={{ width: `${v}%`, transition: "width 1s ease" }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-slate-500 text-sm">LeetCode-style student profile with AI-driven performance insights</p>
            </div>
          </div>

          {/* Instructor Dashboard Mock */}
          <div className={`transition-all duration-700 ${dashSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`} style={{ transitionDelay: "150ms" }}>
            <div className="relative rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-rose-500/3 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                <div className="flex gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500/60" /><span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" /><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" /></div>
                <span className="text-xs text-slate-500 font-mono">Instructor Dashboard</span>
                <span className="ml-auto text-[10px] border border-red-500/30 text-red-400 px-2 py-0.5 rounded bg-red-500/10 font-bold">INSTRUCTOR</span>
              </div>
              <div className="p-6 space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[["Pending", s ? String(s.totalSubmissions - s.totalEvaluations) : "—", "orange"], ["Evaluated", s ? String(s.totalEvaluations) : "—", "emerald"], ["Total", s ? String(s.totalSubmissions) : "—", "blue"]].map(([lbl, val, c]) => (
                    <div key={lbl as string} className={`bg-white/[0.02] border border-${c}-500/20 rounded-xl p-4`}>
                      <div className={`text-3xl font-black text-${c}-400 tabular-nums`}>{val}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{lbl}</div>
                    </div>
                  ))}
                </div>
                {/* Submission table mock */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex gap-4">
                    <span className="flex-1">Student</span><span className="flex-1 hidden sm:block">Problem</span><span>Status</span><span className="ml-auto">Action</span>
                  </div>
                  {[
                    ["Alex K.", "Binary Search", "evaluated", "View"],
                    ["Sara M.", "Merge Sort", "pending", "Grade"],
                    ["Tom R.", "Fibonacci", "evaluated", "View"],
                    ["Lisa C.", "Graph DFS", "pending", "Grade"],
                  ].map(([name, prob, status, action], i) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-4 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <div className="flex-1 text-xs font-semibold text-slate-300">{name}</div>
                      <div className="flex-1 text-xs text-slate-500 hidden sm:block">{prob}</div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${status === "evaluated" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-orange-500/10 text-orange-400 border border-orange-500/20"}`}>{status}</span>
                      <button className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ml-auto ${action === "Grade" ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-white/10 text-slate-400 hover:bg-white/5"}`}>{action} →</button>
                    </div>
                  ))}
                </div>
                {/* Search bar mock */}
                <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
                  <Shield size={14} className="text-slate-500" />
                  <span className="text-xs text-slate-600 flex-1">Search student, email, or problem...</span>
                  <div className="flex gap-1.5">
                    <span className="text-[10px] border border-white/10 rounded px-2 py-0.5 text-slate-500">All</span>
                    <span className="text-[10px] border border-orange-500/30 rounded px-2 py-0.5 text-orange-400">Pending</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-slate-500 text-sm">Real-time submission tracker with search, filter, and one-click evaluation</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIALS SECTION ═══════ */}
      {testimonials.length > 0 && (
        <section className="py-28 bg-white/[0.01] border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.02] text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
                <Star size={12} className="text-yellow-400" /> What Our Users Say
              </div>
              <h2 className="text-4xl xl:text-5xl font-black tracking-tight mb-5">
                Trusted by students<br />
                <span className="gradient-text-cyan-blue">and instructors alike.</span>
              </h2>
            </div>
            <div className="relative flex overflow-hidden py-4">
              {/* Fade gradients */}
              <div className="absolute top-0 left-0 w-24 md:w-48 h-full bg-gradient-to-r from-[#050510] to-transparent z-10 pointer-events-none" />
              <div className="absolute top-0 right-0 w-24 md:w-48 h-full bg-gradient-to-l from-[#050510] to-transparent z-10 pointer-events-none" />

              {/* Scrolling Track */}
              <div
                className="flex gap-6 w-max pl-6"
                style={{ animation: "marquee 40s linear infinite" }}
                onMouseEnter={(e) => e.currentTarget.style.animationPlayState = 'paused'}
                onMouseLeave={(e) => e.currentTarget.style.animationPlayState = 'running'}
              >
                {/* 
                  Double the items to create a seamless infinite loop. 
                  marquee translates -50%, so exactly one set width is scrolled.
                */}
                {[...testimonials.slice(0, 6), ...testimonials.slice(0, 6), ...testimonials.slice(0, 6), ...testimonials.slice(0, 6)].map((t, idx) => (
                  <div
                    key={`${t.id}-${idx}`}
                    className="w-[350px] md:w-[400px] shrink-0 group relative rounded-2xl p-6 border border-white/5 bg-white/[0.02] backdrop-blur-xl transition-all duration-300 shimmer-border hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${t.role === "instructor" ? "bg-gradient-to-br from-red-500/30 to-rose-500/20 text-red-400" : "bg-gradient-to-br from-cyan-500/30 to-blue-500/20 text-cyan-400"}`}>
                        {t.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{t.display_name}</div>
                        <div className={`text-[10px] font-bold uppercase tracking-widest ${t.role === "instructor" ? "text-red-400" : "text-cyan-400"}`}>{t.role}</div>
                      </div>
                      <div className="ml-auto flex gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} size={12} className={i < t.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-700"} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed italic">"{t.text}"</p>
                    <div className="mt-4 text-[10px] text-slate-600">
                      {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════ MARQUEE TECH STRIP ═══════ */}
      <div className="py-10 border-y border-white/5 overflow-hidden bg-white/[0.01]">
        <div className="flex gap-12 animate-[slide-in-right_0s] whitespace-nowrap" style={{ animation: "none" }}>
          <div className="flex gap-12 items-center" style={{ animation: "marquee 20s linear infinite" }}>
            {["Python", "JavaScript", "TypeScript", "Java", "C++", "Go", "Rust", "Ruby", "Supabase", "React", "Ollama", "Gemini API", "Groq API", "Monaco Editor", "Qwen2.5-Coder"].map((tech) => (
              <span key={tech} className="text-slate-600 text-sm font-semibold uppercase tracking-widest hover:text-slate-400 transition-colors shrink-0">{tech}</span>
            ))}
          </div>
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </div>

      {/* ═══════ DEVELOPERS SECTION ═══════ */}
      <section id="team" className="py-28 max-w-7xl mx-auto px-6">
        <div className="text-center mb-20 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.02] text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
            <Users size={12} className="text-purple-400" /> Meet The Team
          </div>
          <h2 className="text-4xl xl:text-5xl font-black tracking-tight mb-5">
            The minds behind
            <br />
            <span className="gradient-text-cyan-blue">CodeIR Platform.</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Built by a passionate team of developers dedicated to transforming computer science education through AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              name: "Emima J",
              role: "UI/UX Developer",
              color: "purple",
              points: [
                "Crafted the glassmorphism design system",
                "Designed the seamless dual-dashboard experience",
                "Implemented advanced CSS keyframe animations"
              ],
              github: "https://github.com/Emima04",
              linkedin: "https://www.linkedin.com/in/emima-j-965754378",
              image: "https://media.licdn.com/dms/image/v2/D4D03AQHHhjbio3xamQ/profile-displayphoto-crop_800_800/B4DZmGf9onJAAM-/0/1758898152241?e=1775088000&v=beta&t=av1SSzXqw_zrsKKL-6dlCgoHHr8j7aRtiYsL4GIKIdQ", // Placeholder
            },
            {
              name: "Omkaar Chakraborty",
              role: "Lead Developer",
              color: "cyan",
              points: [
                "Engineered the core evaluation pipeline",
                "Integrated triple Ollama, Gemini & Groq AI",
                "Built the Monaco-powered intelligent code editor"
              ],
              github: "https://github.com/OCTehckie18",
              linkedin: "https://www.linkedin.com/in/omkaar-chakraborty/",
              image: "https://media.licdn.com/dms/image/v2/D5603AQHMjG5J7IMAAQ/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1678172625861?e=1775088000&v=beta&t=8z4lH2q-lcrJymnoNULx3rHjJKFAeEk2N66jy5qb0ZU", // Placeholder
            },
            {
              name: "Anushka Singh",
              role: "Database Developer",
              color: "emerald",
              points: [
                "Designed the resilient Supabase schemas",
                "Optimized complex real-time queries for dashboards",
                "Implemented strict Row Level Security (RLS) policies"
              ],
              github: "https://github.com/an2sh4a",
              linkedin: "https://www.linkedin.com/in/anushka-singh-308195292/",
              image: "https://media.licdn.com/dms/image/v2/D5603AQGSuBIDD3qmzg/profile-displayphoto-crop_800_800/B56ZzPia_rIoAI-/0/1773008435723?e=1775088000&v=beta&t=PAaH1WQhGK0mUZRSSTeRQ9MacauDMtDZMwDy1lrxT8s", // Placeholder
            }
          ].map((dev, i) => (
            <div
              key={dev.name}
              className={`group relative rounded-3xl border border-${dev.color}-500/20 bg-gradient-to-br from-${dev.color}-500/10 to-${dev.color}-500/5 p-8 transition-all duration-500 hover:-translate-y-2 overflow-hidden shimmer-border`}
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div className={`absolute -top-20 -right-20 w-48 h-48 rounded-full bg-${dev.color}-500/10 blur-[60px] group-hover:bg-${dev.color}-500/20 transition-colors duration-500`} />

              <div className="relative z-10 flex flex-col items-center text-center">
                {/* Profile Image PlaceHolder */}
                <div className="w-24 h-24 rounded-full p-1 mb-5 bg-gradient-to-tr from-cyan-500 to-blue-500 relative">
                  <div className="w-full h-full rounded-full overflow-hidden bg-[#050510]">
                    <img src={dev.image} alt={dev.name} className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                  </div>
                </div>

                <h3 className="text-xl font-black text-white mb-1">{dev.name}</h3>
                <div className={`text-xs font-bold uppercase tracking-widest text-${dev.color}-400 mb-6 bg-${dev.color}-500/10 px-3 py-1 rounded-full border border-${dev.color}-500/20`}>
                  {dev.role}
                </div>

                <div className="w-full space-y-3 mb-8 text-left">
                  {dev.points.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                      <CheckCircle size={14} className={`text-${dev.color}-400 shrink-0 mt-0.5`} />
                      <span className="leading-tight">{point}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4 mt-auto">
                  <a href={dev.github} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all hover:scale-110">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                  </a>
                  <a href={dev.linkedin} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all hover:scale-110">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ CTA SECTION ═══════ */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/8 via-blue-600/8 to-indigo-600/8" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
        <div ref={ctaSection.ref} className={`relative z-10 max-w-4xl mx-auto px-6 text-center transition-all duration-700 ${ctaSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> Ready to Transform Your Classroom?
          </div>
          <h2 className="text-5xl xl:text-6xl font-black tracking-tight mb-6 leading-tight">
            The future of code
            <br />
            <span className="gradient-text-cyan-blue">evaluation starts here.</span>
          </h2>
          <p className="text-slate-500 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
            Join CodeIR today and experience AI-powered evaluation that adapts to your curriculum, respects your privacy, and scales with your class.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onGetStarted("signup")}
              className="group flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-black text-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_60px_rgba(6,182,212,0.4)] hover:shadow-[0_0_80px_rgba(6,182,212,0.6)] transition-all duration-300 hover:-translate-y-1"
            >
              Get Started Free
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => onGetStarted("login")}
              className="flex items-center justify-center gap-2 px-10 py-5 rounded-2xl font-bold text-lg border border-white/10 text-slate-300 hover:border-white/20 hover:text-white transition-all duration-300"
            >
              <BookOpen size={20} /> Sign In
            </button>
          </div>
          {/* Feature checks below CTA */}
          <div className="flex flex-wrap justify-center gap-6 mt-12 text-sm text-slate-500">
            {["No credit card required", "Works offline with Ollama", "Cloud AI via Gemini & Groq", "Student & Instructor roles", "Real-time AI feedback"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-400" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="CodeIR" className="h-7 w-auto opacity-60" />
            <span className="text-slate-500 font-semibold text-sm">CodeIR</span>
            <span className="text-emerald-500 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Instance
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-600">
            {["Features", "AI Models", "Dashboards"].map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`} className="hover:text-slate-400 transition-colors">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            Built with React · Supabase · Ollama · Gemini · Groq
          </div>
        </div>
      </footer>
    </div>
  );
}
