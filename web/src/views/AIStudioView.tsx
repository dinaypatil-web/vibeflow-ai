import React, { useState } from 'react';
import { 
  Sparkles, 
  BrainCircuit, 
  Sliders, 
  CheckCircle2, 
  RefreshCw, 
  Send, 
  ShieldCheck, 
  TrendingUp, 
  Cpu 
} from 'lucide-react';
import { AIClassificationResult, GenreCategory, MoodCategory } from '../types';
import { api } from '../services/api';

export const AIStudioView: React.FC = () => {
  // Classification test states
  const [testTitle, setTestTitle] = useState('Chaiyya Chaiyya Sufi Pulse');
  const [testArtist, setTestArtist] = useState('A.R. Rahman');
  const [testTags, setTestTags] = useState('energetic, dance, train, high bpm, sufi fusion');
  const [testDescription, setTestDescription] = useState('Classic 90s powerhouse dance rhythm with thumping dholaks and sufi poetry.');
  
  const [classification, setClassification] = useState<AIClassificationResult | null>(null);
  const [loadingClassify, setLoadingClassify] = useState(false);
  const [overrideGenre, setOverrideGenre] = useState<string>('');
  const [overrideMood, setOverrideMood] = useState<string>('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Preference sliders
  const [weights, setWeights] = useState({
    workout: 85,
    study: 90,
    romantic: 70,
    chill: 95,
    devotional: 60
  });

  const handleClassify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTitle.trim()) return;

    setLoadingClassify(true);
    setFeedbackSent(false);
    try {
      const tagsArray = testTags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await api.classify(testTitle, testArtist, tagsArray, testDescription);
      setClassification(res);
      setOverrideGenre(res.suggestedGenre);
      setOverrideMood(res.suggestedMood);
    } catch (err) {
      console.error('Classification error', err);
    } finally {
      setLoadingClassify(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!classification) return;
    try {
      await api.submitFeedback('demo-user-id', testTitle, 'override', {
        genre: overrideGenre,
        mood: overrideMood
      });
      setFeedbackSent(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-accent-cyan to-accent-pink flex items-center justify-center text-white shadow-lg shadow-brand-500/25">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">AI Taste Studio & Classification Lab</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect recommendation signals, test acoustic neural categorization, and fine-tune your personalized weights.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Interactive Classification Playground */}
        <section className="bg-surface-850 rounded-3xl p-6 border border-white/5 space-y-5 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Acoustic & Semantic Classifier</h3>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-mono">v2.4 Core</span>
          </div>

          <form onSubmit={handleClassify} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Track Title</label>
              <input
                type="text"
                required
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-800 border border-white/10 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Artist / Creator</label>
                <input
                  type="text"
                  value={testArtist}
                  onChange={(e) => setTestArtist(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-800 border border-white/10 text-xs text-slate-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={testTags}
                  onChange={(e) => setTestTags(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-800 border border-white/10 text-xs text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Context</label>
              <textarea
                rows={2}
                value={testDescription}
                onChange={(e) => setTestDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-800 border border-white/10 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loadingClassify}
              className="w-full py-2.5 bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loadingClassify ? 'Analyzing Semantics...' : 'Classify Track with VibeFlow AI'}</span>
            </button>
          </form>

          {/* Classification Results Card */}
          {classification && (
            <div className="p-4 rounded-2xl bg-surface-800 border border-brand-500/30 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">AI Classification Output:</span>
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  {Math.round(classification.confidenceScore * 100)}% Confidence
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1 rounded-xl bg-brand-500/20 border border-brand-500/40 text-brand-300 text-xs font-semibold">
                  Genre: {classification.suggestedGenre}
                </div>
                <div className="px-3 py-1 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-semibold">
                  Mood: {classification.suggestedMood}
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-surface-850 p-2.5 rounded-xl border border-white/5">
                {classification.reasoning}
              </p>

              {/* User Correction & Tuning */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Is this classification incorrect? Override to train:</span>
                  {feedbackSent && <span className="text-emerald-400 font-semibold">✓ Feedback saved</span>}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={overrideMood}
                    onChange={(e) => setOverrideMood(e.target.value)}
                    placeholder="Correct Mood"
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-850 border border-white/10 text-xs text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleFeedbackSubmit}
                    className="px-3 py-1.5 bg-surface-750 hover:bg-surface-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Submit Correction
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right: Recommendation Taste Weights & Transparency */}
        <section className="space-y-6">
          {/* Sliders */}
          <div className="bg-surface-850 rounded-3xl p-6 border border-white/5 space-y-5 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-accent-cyan" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Mood Affinity Weights</h3>
              </div>
              <span className="text-[11px] text-slate-400">Adjust personal bias</span>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Focus & Study (Lo-Fi & Ambient)', key: 'study' as const, val: weights.study },
                { label: 'Workout & High BPM Energy', key: 'workout' as const, val: weights.workout },
                { label: 'Lo-Fi Chill & Late Night Rain', key: 'chill' as const, val: weights.chill },
                { label: 'Romantic & Acoustic Ballads', key: 'romantic' as const, val: weights.romantic },
                { label: 'Spiritual, Vedic & Chants', key: 'devotional' as const, val: weights.devotional },
              ].map(item => (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{item.label}</span>
                    <span className="font-mono text-brand-300 font-bold">{item.val}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={item.val}
                    onChange={(e) => setWeights({ ...weights, [item.key]: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-surface-750 rounded-lg accent-brand-500 cursor-pointer"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => alert('Taste profile updated! VibeFlow AI will prioritize your adjusted mood affinities.')}
              className="w-full py-2 bg-surface-750 hover:bg-surface-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
            >
              Apply Weight Profile
            </button>
          </div>

          {/* Recommendation Signals Transparency */}
          <div className="bg-surface-850 rounded-3xl p-6 border border-white/5 space-y-3 shadow-md">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Recommendation Engine Transparency</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              VibeFlow AI generates recommendations strictly from your explicit musical likes, track completion metrics, repeating listening loops, and semantic tag correlations. We never infer sensitive personal characteristics or sell telemetry.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
