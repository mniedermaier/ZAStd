import { useEffect, useRef } from 'react';

const NEON_COLORS = ['#44bbff', '#44ff88', '#ff4466', '#aa44ff', '#ffdd44', '#ff8844'];

// Particle network config
const PARTICLE_COUNT = 80;
const LINE_THRESHOLD = 180;
const LINE_OPACITY = 0.12;
const NEBULA_COUNT = 4;
const STAR_COUNT = 60;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  phase: number;
  pulseSpeed: number;
}

interface Nebula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  phase: number;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  phase: number;
  twinkleSpeed: number;
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    // Generate particles
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const speed = 0.15 + Math.random() * 0.5;
      const angle = Math.random() * Math.PI * 2;
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1 + Math.random() * 2.5,
        color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.01 + Math.random() * 0.02,
      });
    }

    // Generate nebula blobs
    const nebulae: Nebula[] = [];
    for (let i = 0; i < NEBULA_COUNT; i++) {
      nebulae.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.15,
        radius: 150 + Math.random() * 120,
        color: NEON_COLORS[i % NEON_COLORS.length],
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Generate stars
    const stars: Star[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: 0.4 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.005 + Math.random() * 0.015,
      });
    }

    let animId = 0;
    let lastTime = 0;

    const draw = (timestamp: number) => {
      if (document.hidden) {
        animId = requestAnimationFrame(draw);
        return;
      }

      const dt = lastTime ? (timestamp - lastTime) / 16 : 1;
      lastTime = timestamp;

      ctx.clearRect(0, 0, w, h);

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#060614');
      bgGrad.addColorStop(0.5, '#0a0a1e');
      bgGrad.addColorStop(1, '#080820');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Nebula blobs (drawn first, behind everything)
      for (const neb of nebulae) {
        neb.x += neb.vx * dt;
        neb.y += neb.vy * dt;
        neb.phase += 0.003 * dt;

        // Bounce off edges gently
        if (neb.x < -neb.radius) neb.x = w + neb.radius;
        if (neb.x > w + neb.radius) neb.x = -neb.radius;
        if (neb.y < -neb.radius) neb.y = h + neb.radius;
        if (neb.y > h + neb.radius) neb.y = -neb.radius;

        const alpha = 0.03 + 0.015 * Math.sin(neb.phase);
        const grad = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.radius);
        grad.addColorStop(0, neb.color + Math.round(alpha * 255).toString(16).padStart(2, '0'));
        grad.addColorStop(1, neb.color + '00');
        ctx.fillStyle = grad;
        ctx.fillRect(neb.x - neb.radius, neb.y - neb.radius, neb.radius * 2, neb.radius * 2);
      }

      // Stars (tiny twinkling dots)
      for (const star of stars) {
        star.phase += star.twinkleSpeed * dt;
        const baseAlpha = 0.15 + 0.2 * Math.sin(star.phase);
        const twinkle = Math.sin(star.phase * 3.7) > 0.95 ? 0.5 : 0;
        const alpha = Math.max(0, baseAlpha + twinkle);
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${alpha})`;
        ctx.fill();
      }

      // Update particles
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.phase += p.pulseSpeed * dt;

        // Wrap around edges
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      }

      // Draw connecting lines between nearby particles
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINE_THRESHOLD) {
            const alpha = LINE_OPACITY * (1 - dist / LINE_THRESHOLD);
            ctx.strokeStyle = `rgba(68, 187, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        const alpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(p.phase));
        // Glow
        const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
        glowGrad.addColorStop(0, p.color + Math.round(alpha * 0.3 * 255).toString(16).padStart(2, '0'));
        glowGrad.addColorStop(1, p.color + '00');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(p.x - p.radius * 4, p.y - p.radius * 4, p.radius * 8, p.radius * 8);

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }

      // Vignette overlay
      const vigGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.7);
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, w, h);

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      // Redistribute stars
      for (const star of stars) {
        star.x = Math.random() * w;
        star.y = Math.random() * h;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
