"use client";

import { useState } from "react";
import { Star, Loader2, Check } from "lucide-react";
import { guestAuthHeaders } from "@/lib/clientGuestAuth";

interface Props {
  bookingId: string;
  hotelId?: string;
  onSuccess?: () => void;
}

export function ReviewPanel({ bookingId, hotelId, onSuccess }: Props) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: guestAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          bookingId,
          hotelId,
          rating,
          title: title.trim() || undefined,
          comment: comment.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review");
      }

      setSuccess(true);
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-4 border border-emerald-500/20 bg-emerald-500/[0.04] rounded-xl text-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
          <Check className="h-4 w-4" />
        </div>
        <p className="text-xs font-bold text-emerald-400">Thank you for your review!</p>
        <p className="text-[10px] text-neutral-400 mt-0.5">Your feedback helps us improve our service.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 border border-white/5 bg-white/[0.01] rounded-xl space-y-2.5 text-left">
      <div className="space-y-1">
        <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
          Rate your stay
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5 focus:outline-none transition-colors duration-150"
            >
              <Star
                className={`h-4.5 w-4.5 ${
                  star <= (hoverRating || rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-neutral-600 hover:text-neutral-500"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
          Review Title (Optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Excellent stay, friendly staff..."
          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/10 bg-black/20 text-neutral-200 placeholder-neutral-500 focus:border-amber-500/50 focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
          Comments
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us about your experience..."
          rows={2}
          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/10 bg-black/20 text-neutral-200 placeholder-neutral-500 focus:border-amber-500/50 focus:outline-none resize-none"
        />
      </div>

      {error && <p className="text-[10px] text-red-400/90 font-medium">{error}</p>}

      <button
        type="submit"
        disabled={loading || rating === 0}
        className="w-full text-xs font-bold py-1.5 rounded-lg bg-neutral-200 text-black hover:bg-neutral-100 disabled:bg-neutral-800 disabled:text-neutral-500 flex items-center justify-center gap-1.5 transition-all"
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
        Submit Review
      </button>
    </form>
  );
}
