import React from 'react';

/**
 * Pure CSS and textual icon components.
 * SUBJECT 01 enforces a strict ZERO-SVG policy across the entire application runtime.
 * These components render clean HTML spans with Unicode glyphs and Tailwind styling,
 * without creating any <svg> or <path> DOM nodes.
 */

interface IconProps {
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  title?: string;
}

const baseStyle = 'inline-flex items-center justify-center font-mono select-none leading-none shrink-0';

export const ShieldCheck: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    🛡✓
  </span>
);

export const Shield: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    🛡
  </span>
);

export const ShieldAlert: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    🛡!
  </span>
);

export const Sparkles: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ✦
  </span>
);

export const Layers: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ☷
  </span>
);

export const Sliders: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ⚲
  </span>
);

export const SlidersHorizontal: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ⚲
  </span>
);

export const Eye: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ◉
  </span>
);

export const EyeOff: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ⊘
  </span>
);

export const AlertTriangle: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ⚠
  </span>
);

export const AlertCircle: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ⚠
  </span>
);

export const AlertOctagon: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ⛔
  </span>
);

export const CheckCircle: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ✓
  </span>
);

export const CheckCircle2: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ✓
  </span>
);

export const XCircle: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ✕
  </span>
);

export const Check: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ✓
  </span>
);

export const X: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ✕
  </span>
);

export const Download: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ↓
  </span>
);

export const Upload: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ⇪
  </span>
);

export const Copy: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ❐
  </span>
);

export const RotateCcw: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ↺
  </span>
);

export const Maximize2: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ⛶
  </span>
);

export const ChevronDown: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} text-[10px] ${className || ''}`} aria-hidden="true" title={title}>
    ▼
  </span>
);

export const ChevronUp: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} text-[10px] ${className || ''}`} aria-hidden="true" title={title}>
    ▲
  </span>
);

export const Lock: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    🔒
  </span>
);

export const Camera: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    📷
  </span>
);

export const Image: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    🖼
  </span>
);

export const ImageIcon = Image;

export const HelpCircle: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ?
  </span>
);

export const FileText: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    📄
  </span>
);

export const FileCode: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} text-[11px] font-bold ${className || ''}`} aria-hidden="true" title={title}>
    ‹/›
  </span>
);

export const Shirt: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    👔
  </span>
);

export const Scissors: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ✂
  </span>
);

export const UserCheck: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    👤✓
  </span>
);

export const Info: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} ${className || ''}`} aria-hidden="true" title={title}>
    ℹ
  </span>
);

export const Play: React.FC<IconProps> = ({ className, title }) => (
  <span className={`${baseStyle} text-[10px] ${className || ''}`} aria-hidden="true" title={title}>
    ▶
  </span>
);
