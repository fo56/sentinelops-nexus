import React from 'react';

/**
 * GridBackground Component
 * Provides tactical grid background with scanning line and corner accents
 */
export default function GridBackground() {
  return (
    <div className="grid-bg-container">
      {/* Grid pattern */}
      <div className="grid-bg-pattern" />

      {/* Scanning line effect */}
      <div className="grid-scan-line" />

      {/* Top-left corner accent */}
      <div className="grid-corner grid-corner-tl" />

      {/* Top-right corner accent */}
      <div className="grid-corner grid-corner-tr" />

      {/* Bottom-left corner accent */}
      <div className="grid-corner grid-corner-bl" />

      {/* Bottom-right corner accent */}
      <div className="grid-corner grid-corner-br" />

      {/* Glow effects */}
      <div className="grid-glow-1" />
      <div className="grid-glow-2" />
    </div>
  );
}
