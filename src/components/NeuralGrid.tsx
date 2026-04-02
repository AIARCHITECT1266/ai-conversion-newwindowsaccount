"use client";

/*
  Neural Data Pulse — tiny glowing dots travel along the existing grid lines.
  Pure CSS animations for max performance. No JS animation loop.
  Extremely subtle: 10-12% opacity, 4px dots, slow movement.
*/

const GRID_SIZE = 100; // must match the grid-pattern backgroundSize in page.tsx

// Horizontal pulses: fixed Y positions on grid lines, travel left→right
const hPulses = [
  { top: GRID_SIZE * 1, color: "#a78bfa", dur: 18, delay: 0 },
  { top: GRID_SIZE * 3, color: "#25d366", dur: 22, delay: 4 },
  { top: GRID_SIZE * 5, color: "#a78bfa", dur: 20, delay: 8 },
  { top: GRID_SIZE * 7, color: "#25d366", dur: 24, delay: 2 },
  { top: GRID_SIZE * 9, color: "#a78bfa", dur: 19, delay: 12 },
];

// Vertical pulses: fixed X positions on grid lines, travel top→bottom
const vPulses = [
  { left: GRID_SIZE * 2, color: "#25d366", dur: 20, delay: 1 },
  { left: GRID_SIZE * 4, color: "#a78bfa", dur: 24, delay: 6 },
  { left: GRID_SIZE * 6, color: "#25d366", dur: 18, delay: 10 },
  { left: GRID_SIZE * 8, color: "#a78bfa", dur: 22, delay: 3 },
  { left: GRID_SIZE * 10, color: "#25d366", dur: 21, delay: 14 },
];

export default function NeuralGrid() {
  return (
    <div className="neural-grid" aria-hidden="true">
      {hPulses.map((p, i) => (
        <span
          key={`h-${i}`}
          className="pulse-h"
          style={{
            top: `${p.top}px`,
            backgroundColor: p.color,
            boxShadow: `0 0 6px ${p.color}`,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      {vPulses.map((p, i) => (
        <span
          key={`v-${i}`}
          className="pulse-v"
          style={{
            left: `${p.left}px`,
            backgroundColor: p.color,
            boxShadow: `0 0 6px ${p.color}`,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
