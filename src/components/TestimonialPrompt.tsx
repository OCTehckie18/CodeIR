import { useState, useEffect } from "react";
import { Star, X, Send, Heart } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import axios from "axios";

const API = `${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}/api`;

interface TestimonialPromptProps {
  userId: string;
}

export default function TestimonialPrompt({ userId }: TestimonialPromptProps) {
  const [visible, setVisible] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkEligibility();
  }, [userId]);

  async function checkEligibility() {
    // Check localStorage dismissal
    const dismissedAt = localStorage.getItem(`testimonial-dismissed-${userId}`);
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return; // Dismissed within 7 days
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await axios.get(`${API}/testimonials/eligibility`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (data.success && data.eligible && !data.alreadySubmitted) {
        // Delay showing the prompt for a smooth UX
        setTimeout(() => setVisible(true), 5000);
      }
    } catch {
      // Silently fail — not critical
    }
  }

  async function handleSubmit() {
    if (!text.trim() || rating === 0) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await axios.post(
        `${API}/testimonials`,
        { text: text.trim(), rating },
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      setShowThankYou(true);
      setTimeout(() => {
        setShowThankYou(false);
        setVisible(false);
      }, 3000);
    } catch {
      // Fail silently
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(`testimonial-dismissed-${userId}`, new Date().toISOString());
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up" style={{ animationDuration: "0.4s" }}>
      <div className="w-[360px] rounded-2xl border border-white/10 bg-[#0d1117]/95 backdrop-blur-2xl shadow-[0_0_60px_rgba(6,182,212,0.15)] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
            <Heart size={16} className="text-cyan-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">Enjoying CodeIR?</h3>
            <p className="text-[10px] text-slate-500">Share your experience with the community</p>
          </div>
          <button
            onClick={handleDismiss}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {showThankYou ? (
          /* Thank you state */
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center">
              <Heart size={28} className="text-emerald-400 fill-emerald-400" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Thank you!</h4>
            <p className="text-sm text-slate-400">Your testimonial helps others discover CodeIR.</p>
          </div>
        ) : (
          /* Form */
          <div className="p-5 space-y-4">
            {/* Star rating */}
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2 block">
                Your Rating
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => setRating(star)}
                    className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <Star
                      size={22}
                      className={`transition-colors ${
                        star <= (hoveredStar || rating)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-slate-700"
                      }`}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-xs text-slate-500 self-center font-medium">
                    {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
                  </span>
                )}
              </div>
            </div>

            {/* Text input */}
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2 block">
                Your Review
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 280))}
                placeholder="What do you love most about CodeIR?"
                rows={3}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
              <div className="flex justify-end mt-1">
                <span className={`text-[10px] ${text.length >= 260 ? "text-orange-400" : "text-slate-600"}`}>
                  {text.length}/280
                </span>
              </div>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || rating === 0 || loading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Submit Testimonial
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
