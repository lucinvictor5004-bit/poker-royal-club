/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
}

interface AtmosphereCanvasProps {
  isVictory?: boolean;
}

export const AtmosphereCanvas: React.FC<AtmosphereCanvasProps> = ({ isVictory = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const isVictoryRef = useRef(isVictory);
  isVictoryRef.current = isVictory;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Initial ambient dust motes
    const particles: Particle[] = [];
    const colors = ['#f59e0b', '#fbbf24', '#d97706', '#fef08a'];

    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.2 - Math.random() * 0.3,
        size: 1 + Math.random() * 2,
        alpha: 0.15 + Math.random() * 0.35,
        decay: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    particlesRef.current = particles;

    let prevVictory = false;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Check if victory triggered newly
      if (isVictoryRef.current && !prevVictory) {
        // Spawn burst of celebratory gold and jewel confetti
        const burstColors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#fbbf24', '#ffffff'];
        for (let i = 0; i < 120; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 3 + Math.random() * 7;
          particles.push({
            x: width / 2 + (Math.random() - 0.5) * 100,
            y: height / 2 + (Math.random() - 0.5) * 50,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            size: 2.5 + Math.random() * 3.5,
            alpha: 1,
            decay: 0.008 + Math.random() * 0.012,
            color: burstColors[Math.floor(Math.random() * burstColors.length)],
          });
        }
      }
      prevVictory = isVictoryRef.current;

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.decay > 0) {
          p.alpha -= p.decay;
          p.vy += 0.08; // gravity for confetti
          if (p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
          }
        } else {
          // Ambient wrapping
          if (p.y < 0) p.y = height;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      aria-hidden="true"
    />
  );
};
