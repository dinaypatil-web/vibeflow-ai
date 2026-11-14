import React, { useState } from 'react';
import { 
  Sliders, 
  RotateCcw, 
  Power, 
  Sparkles, 
  Volume2, 
  Compass, 
  Check, 
  Info,
  Waves
} from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { 
  EQ_FREQUENCIES, 
  EQ_LABELS, 
  EQ_BAND_DESCRIPTIONS, 
  EQ_PRESETS, 
  SPATIAL_OPTIONS, 
  PlayingModeId, 
  SpatialMode 
} from '../types';

export const EqualizerPanel: React.FC = () => {
  const {
    eqEnabled,
    eqPreset,
    eqBands,
    eqPreamp,
    spatialMode,
    setEqEnabled,
    setEqPreset,
    setEqBand,
    setEqPreamp,
    setSpatialMode,
    resetEq
  } = usePlayerStore();

  const [activeCategory, setActiveCategory] = useState<'presets' | 'spatial' | 'manual'>('presets');
  const [hoveredBand, setHoveredBand] = useState<number | null>(null);

  // Generate SVG curve points for frequency response curve
  const svgWidth = 800;
  const svgHeight = 160;
  const paddingX = 40;
  const usableWidth = svgWidth - paddingX * 2;
  const zeroY = svgHeight / 2; // 0 dB line
  const maxDb = 12;

  const points = eqBands.map((gain, i) => {
    const x = paddingX + (i / (eqBands.length - 1)) * usableWidth;
    // When disabled, curve is flat 0 dB
    const effectiveGain = eqEnabled ? gain : 0;
    const y = zeroY - (effectiveGain / maxDb) * (svgHeight / 2 - 20);
    return { x, y };
  });

  // Build smooth cubic bezier path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  const fillD = `${pathD} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`;

  const formatDb = (db: number) => {
    if (db === 0) return '0 dB';
    return `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`;
  };

  const currentPresetObj = EQ_PRESETS.find(p => p.id === eqPreset);
  const currentSpatialObj = SPATIAL_OPTIONS.find(s => s.id === spatialMode);

  return (
    <div className="w-full flex flex-col gap-6 p-2 md:p-4 text-slate-100">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-850/80 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEqEnabled(!eqEnabled)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all shadow-md ${
              eqEnabled
                ? 'bg-gradient-to-r from-brand-500 to-indigo-600 text-white shadow-brand-500/20'
                : 'bg-surface-750 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            <Power className={`w-3.5 h-3.5 ${eqEnabled ? 'animate-pulse text-white' : 'text-slate-500'}`} />
            <span>{eqEnabled ? 'Equalizer ON' : 'Equalizer BYPASS'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-surface-800 rounded-lg border border-white/5 text-xs">
            <span className="text-slate-400">Mode:</span>
            <span className="font-semibold text-brand-300">{currentPresetObj?.name || 'Custom'}</span>
          </div>

          {spatialMode !== 'off' && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-surface-800 rounded-lg border border-white/5 text-xs">
              <span className="text-slate-400">Space:</span>
              <span className="font-semibold text-accent-cyan">{currentSpatialObj?.name}</span>
            </div>
          )}
        </div>

        {/* Preamp & Reset */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-surface-800 rounded-xl border border-white/5 text-xs">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Preamp:</span>
            <span className={`font-mono font-medium ${eqPreamp > 0 ? 'text-amber-400' : eqPreamp < 0 ? 'text-brand-300' : 'text-slate-300'}`}>
              {formatDb(eqPreamp)}
            </span>
            <input
              type="range"
              min="-6"
              max="6"
              step="0.5"
              value={eqPreamp}
              onChange={(e) => setEqPreamp(parseFloat(e.target.value))}
              disabled={!eqEnabled}
              className="w-20 h-1.5 accent-brand-500 bg-surface-700 rounded-lg cursor-pointer disabled:opacity-40"
              title="Preamp Volume Trim (-6 dB to +6 dB)"
            />
          </div>

          <button
            onClick={resetEq}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-750 text-slate-400 hover:text-white transition-colors border border-white/5 text-xs font-medium"
            title="Reset to Studio Flat (0 dB)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Flat</span>
          </button>
        </div>
      </div>

      {/* 2. Real-Time Frequency Response Curve Visualizer */}
      <div className="relative w-full bg-surface-950/70 rounded-2xl border border-white/10 p-3 overflow-hidden shadow-inner">
        {/* Subtle background grid lines */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 opacity-20">
          <div className="w-full border-b border-white/30 flex justify-end text-[10px] text-slate-400 font-mono">+12 dB</div>
          <div className="w-full border-b border-white/20 flex justify-end text-[10px] text-slate-400 font-mono">+6 dB</div>
          <div className="w-full border-b border-white/40 flex justify-end text-[10px] text-brand-400 font-mono">0 dB</div>
          <div className="w-full border-b border-white/20 flex justify-end text-[10px] text-slate-400 font-mono">-6 dB</div>
          <div className="w-full border-b border-white/30 flex justify-end text-[10px] text-slate-400 font-mono">-12 dB</div>
        </div>

        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-28 md:h-36 overflow-visible relative z-10">
          <defs>
            <linearGradient id="eqFillGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="eqStrokeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={fillD} fill="url(#eqFillGradient)" />

          {/* Response line */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#eqStrokeGradient)"
            strokeWidth={eqEnabled ? 3 : 1.5}
            strokeDasharray={eqEnabled ? 'none' : '4 4'}
            className="transition-all duration-150"
          />

          {/* Node points */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredBand === idx ? 6 : 4}
                className={`transition-all ${
                  eqEnabled 
                    ? hoveredBand === idx 
                      ? 'fill-brand-300 stroke-white stroke-2 shadow-lg' 
                      : 'fill-white stroke-brand-500 stroke-2'
                    : 'fill-slate-600 stroke-slate-500'
                }`}
              />
            </g>
          ))}
        </svg>

        {/* Spectrum frequency markers below curve */}
        <div className="flex justify-between px-6 pt-1 text-[11px] font-mono text-slate-500">
          <span>32Hz</span>
          <span>125Hz</span>
          <span>500Hz</span>
          <span>2kHz</span>
          <span>8kHz</span>
          <span>16kHz</span>
        </div>
      </div>

      {/* 3. Section Navigation Tabs (Playing Modes / Spatial Immersion / Sliders Console) */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-xs font-medium">
        <button
          onClick={() => setActiveCategory('presets')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all ${
            activeCategory === 'presets'
              ? 'bg-brand-600 text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-white bg-surface-800/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Playing Modes ({EQ_PRESETS.length})</span>
        </button>

        <button
          onClick={() => setActiveCategory('spatial')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all ${
            activeCategory === 'spatial'
              ? 'bg-brand-600 text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-white bg-surface-800/60'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Spatial Immersion</span>
        </button>

        <button
          onClick={() => setActiveCategory('manual')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all ${
            activeCategory === 'manual'
              ? 'bg-brand-600 text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-white bg-surface-800/60'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>10-Band Precision Sliders</span>
        </button>
      </div>

      {/* 4. Tab 1: Playing Modes & Sound Presets */}
      {activeCategory === 'presets' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {EQ_PRESETS.map((preset) => {
            const isSelected = eqPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setEqPreset(preset.id)}
                className={`flex flex-col items-start text-left p-3.5 rounded-2xl border transition-all duration-200 group relative overflow-hidden ${
                  isSelected
                    ? 'bg-brand-950/40 border-brand-500/80 shadow-lg shadow-brand-500/10 ring-1 ring-brand-500/50'
                    : 'bg-surface-850/60 hover:bg-surface-800/80 border-white/5 hover:border-white/10'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center text-white">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
                <div className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">
                  {preset.icon}
                </div>
                <h4 className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                  {preset.name}
                </h4>
                <p className="text-[11px] text-brand-300 font-medium mb-1">
                  {preset.genreFocus}
                </p>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* 5. Tab 2: Spatial Immersion & Environment Simulation */}
      {activeCategory === 'spatial' && (
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-surface-850/50 rounded-xl border border-white/5 flex items-center gap-2 text-xs text-slate-300">
            <Waves className="w-4 h-4 text-accent-cyan shrink-0" />
            <span>
              Real-time Web Audio Convolution Reverb simulates authentic physical acoustic environments with acoustic diffusion and early reflections.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SPATIAL_OPTIONS.map((opt) => {
              const isSelected = spatialMode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSpatialMode(opt.id)}
                  className={`flex flex-col items-start text-left p-4 rounded-2xl border transition-all duration-200 group relative ${
                    isSelected
                      ? 'bg-accent-cyan/10 border-accent-cyan/60 shadow-lg shadow-accent-cyan/10 ring-1 ring-accent-cyan/40'
                      : 'bg-surface-850/60 hover:bg-surface-800/80 border-white/5 hover:border-white/10'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent-cyan text-black flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                  <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                    {opt.icon}
                  </span>
                  <h4 className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                    {opt.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {opt.description}
                  </p>
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5 text-[10px] text-slate-400 font-mono">
                    <span>Decay: {opt.reverbDecaySeconds > 0 ? `${opt.reverbDecaySeconds}s` : 'Direct'}</span>
                    <span>•</span>
                    <span>Wet: {Math.round(opt.wetMix * 100)}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Tab 3 or Always Visible: 10-Band Sliders Console */}
      <div className="flex flex-col gap-3 bg-surface-850/60 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-slate-300">
            10-Band Graphic Equalizer (-12 dB to +12 dB)
          </span>
          <span className="text-[11px] text-slate-500">
            Click band value to reset individual frequency
          </span>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3 pt-2">
          {EQ_FREQUENCIES.map((freq, idx) => {
            const gain = eqBands[idx] ?? 0;
            const label = EQ_LABELS[idx];
            const desc = EQ_BAND_DESCRIPTIONS[idx];

            return (
              <div
                key={freq}
                onMouseEnter={() => setHoveredBand(idx)}
                onMouseLeave={() => setHoveredBand(null)}
                className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${
                  hoveredBand === idx ? 'bg-surface-800' : 'bg-surface-900/40'
                }`}
                title={desc}
              >
                {/* dB badge (click to reset to 0) */}
                <button
                  onClick={() => setEqBand(idx, 0)}
                  disabled={!eqEnabled}
                  className={`text-[11px] font-mono font-medium px-1.5 py-0.5 rounded transition-all ${
                    gain > 0 
                      ? 'text-emerald-400 bg-emerald-500/10' 
                      : gain < 0 
                      ? 'text-amber-400 bg-amber-500/10' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Click to reset band to 0 dB"
                >
                  {formatDb(gain)}
                </button>

                {/* Vertical Slider Container */}
                <div className="relative h-32 md:h-40 flex items-center justify-center my-1">
                  {/* Zero DB reference indicator line */}
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/20 pointer-events-none" />

                  {/* Slider input */}
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={gain}
                    disabled={!eqEnabled}
                    onChange={(e) => setEqBand(idx, parseFloat(e.target.value))}
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                      width: '28px',
                      height: '100%'
                    }}
                    className="accent-brand-500 cursor-pointer disabled:opacity-40"
                  />
                </div>

                {/* Frequency Label */}
                <span className="text-xs font-semibold text-slate-200 font-mono">
                  {label}
                </span>

                {/* Sub-label */}
                <span className="text-[9px] text-slate-500 text-center truncate max-w-[60px]">
                  {idx === 0 ? 'Sub' : idx < 3 ? 'Bass' : idx < 6 ? 'Mids' : idx < 8 ? 'Pres' : 'Air'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
