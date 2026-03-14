import { useState, useEffect } from "react";
import axios from "axios";
import { supabase } from "../lib/supabaseClient";
import NavBar from "./NavBar";
import PageLoader from "./PageLoader";
import { handleApiError } from "../lib/errorHandler";

import {
  Plus,
  Edit2,
  Trash2,
  Play,
  BookOpen,
  Filter,
  Search,
} from "lucide-react";

interface Problem {
  problem_id: number;
  title: string;
  problem_statement: string;
  boilerplate_code: string;
  difficulty_level: string;
  created_at: string;
}

interface ProblemListProps {
  role: "student" | "instructor";
  onNavigate: (view: any) => void;
  onSelectProblem?: (problem: Problem) => void;
}

export default function ProblemList({
  role,
  onNavigate,
  onSelectProblem,
}: ProblemListProps) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    problem_statement: "",
    boilerplate_code: "",
    difficulty_level: "Easy",
  });
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<
    "All" | "Easy" | "Medium" | "Hard"
  >("All");

  useEffect(() => {
    fetchProblems();
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });
  }, []);

  const filteredProblems = problems.filter((problem) => {
    const matchesSearch =
      problem.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      problem.problem_statement
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesDifficulty =
      filterDifficulty === "All" ||
      problem.difficulty_level === filterDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://127.0.0.1:5000/api/problems");
      if (response.data.success) {
        setProblems(response.data.data);
      }
    } catch (error: any) {
      handleApiError(error, "Fetching problems");
    } finally {
      setLoading(false);
    }
  };

  // Logout is now handled by NavBar

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProblem) {
        await axios.put(
          `http://127.0.0.1:5000/api/problems/${editingProblem.problem_id}`,
          formData,
        );
      } else {
        await axios.post("http://127.0.0.1:5000/api/problems", formData);
      }
      setShowForm(false);
      setEditingProblem(null);
      setFormData({
        title: "",
        problem_statement: "",
        boilerplate_code: "",
        difficulty_level: "Easy",
      });
      fetchProblems();
    } catch (error: any) {
      handleApiError(error, "Saving problem");
    }
  };

  const handleEdit = (problem: Problem) => {
    setEditingProblem(problem);
    setFormData({
      title: problem.title || "",
      problem_statement: problem.problem_statement || "",
      boilerplate_code: problem.boilerplate_code || "",
      difficulty_level: problem.difficulty_level || "Easy",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this problem?")) return;
    try {
      await axios.delete(`http://127.0.0.1:5000/api/problems/${id}`);
      fetchProblems();
    } catch (error: any) {
      handleApiError(error, "Deleting problem");
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "easy":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "medium":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      case "hard":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      default:
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    }
  };

  if (loading && !problems.length) {
    return <PageLoader message="Loading Problems..." />;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans overflow-hidden">
      {/* SHARED NAV BAR */}
      <NavBar
        role={role === "instructor" ? "instructor" : "student"}
        active="problems"
        onNavigate={onNavigate}
        email={user?.email}
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto w-full custom-scrollbar relative">
        <div className="p-4 lg:p-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                Problem Bank
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {role === "instructor"
                  ? "Manage coding problems for students."
                  : "Select a problem to start coding and testing."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Input */}
              <div className="flex items-center gap-2 bg-white/[0.04] border border-black/10 dark:border-white/5 rounded-xl px-3 py-1.5 transition-all focus-within:border-cyan-500/50">
                <Search size={16} className="text-slate-500" />
                <input
                  type="text"
                  placeholder="Search problems..."
                  className="bg-transparent border-none outline-none text-xs text-slate-800 dark:text-slate-200 w-32 md:w-48 placeholder:text-slate-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Difficulty Filter */}
              <div className="flex items-center gap-2 bg-white/[0.04] border border-black/10 dark:border-white/5 rounded-xl px-2.5 py-1.5 hover:bg-white/[0.08] transition-colors">
                <Filter size={14} className="text-slate-500" />
                <select
                  className="bg-transparent border-none outline-none text-xs text-slate-800 dark:text-slate-200 font-medium cursor-pointer appearance-none pr-4"
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value as any)}
                >
                  <option value="All" className="bg-slate-50 dark:bg-slate-900">
                    All Levels
                  </option>
                  <option
                    value="Easy"
                    className="bg-slate-50 dark:bg-slate-900 text-emerald-400"
                  >
                    Easy
                  </option>
                  <option
                    value="Medium"
                    className="bg-slate-50 dark:bg-slate-900 text-yellow-400"
                  >
                    Medium
                  </option>
                  <option
                    value="Hard"
                    className="bg-slate-50 dark:bg-slate-900 text-red-400"
                  >
                    Hard
                  </option>
                </select>
              </div>

              {role === "instructor" && (
                <button
                  onClick={() => {
                    setEditingProblem(null);
                    setFormData({
                      title: "",
                      problem_statement: "",
                      boilerplate_code: "",
                      difficulty_level: "Easy",
                    });
                    setShowForm(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-all shadow-lg hover:-translate-y-0.5 text-sm"
                >
                  <Plus size={16} /> Create
                </button>
              )}
            </div>
          </div>

          {/* PROBLEM LIST GRID */}
          {!showForm ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {filteredProblems.map((problem) => (
                <div
                  key={problem.problem_id}
                  className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-lg flex flex-col group hover:border-cyan-500/30 transition-all flex flex-col h-full relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-cyan-500/10 transition-colors"></div>

                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                      {problem.title || "Untitled Problem"}
                    </h3>
                    <span
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${getDifficultyColor(problem.difficulty_level)} ml-3 shrink-0`}
                    >
                      {problem.difficulty_level || "Easy"}
                    </span>
                  </div>

                  <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-6 flex-1 relative z-10 whitespace-pre-wrap">
                    {problem.problem_statement}
                  </div>

                  <div className="flex gap-2 relative z-10 pt-4 border-t border-black/5 dark:border-white/5">
                    {role === "instructor" ? (
                      <>
                        <button
                          onClick={() => handleEdit(problem)}
                          className="flex-1 flex justify-center items-center gap-2 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors border border-black/5 dark:border-white/5"
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(problem.problem_id)}
                          className="flex-1 flex justify-center items-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() =>
                          onSelectProblem && onSelectProblem(problem)
                        }
                        className="w-full flex justify-center items-center gap-2 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                      >
                        <Play size={16} /> SOLVE CHALLENGE
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {filteredProblems.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center bg-white/[0.01]">
                  <BookOpen
                    size={48}
                    className="mb-4 text-slate-300 dark:text-slate-700"
                  />
                  <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">
                    No Problems Found
                  </h3>
                  <p className="px-6 py-2 text-sm text-slate-500 dark:text-slate-500 max-w-md">
                    {searchQuery || filterDifficulty !== "All"
                      ? "We couldn't find any problems matching your search or filter criteria. Try adjusting your search or difficulty level."
                      : role === "instructor"
                        ? "You haven't created any problems yet. Click 'Create' to add your first challenge."
                        : "Your instructor hasn't added any problems yet."}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* PROBLEM CREATION / EDIT FORM */
            <div className="max-w-3xl mx-auto bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl relative">
              <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Edit2 size={20} className="text-cyan-400" />
                {editingProblem ? "Edit Problem" : "Create New Problem"}
              </h2>

              <form onSubmit={handleSubmitForm} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Title
                  </label>
                  <input
                    required
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                    placeholder="e.g. Reverse Linked List"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Difficulty
                    </label>
                    <select
                      name="difficulty_level"
                      value={formData.difficulty_level}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Problem Statement
                  </label>
                  <textarea
                    required
                    name="problem_statement"
                    value={formData.problem_statement}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all custom-scrollbar resize-y"
                    placeholder="Describe the problem, constraints, and requirements..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Boilerplate Code (Optional)
                  </label>
                  <textarea
                    name="boilerplate_code"
                    value={formData.boilerplate_code}
                    onChange={handleInputChange}
                    rows={6}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all custom-scrollbar font-mono text-sm resize-y"
                    placeholder="function solve() {\n  // Your code here\n}"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-5 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold transition-colors border border-black/5 dark:border-white/5 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:-translate-y-0.5"
                  >
                    {editingProblem ? "Save Changes" : "Create Problem"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
