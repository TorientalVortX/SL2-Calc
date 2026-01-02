import { useEffect, useRef } from 'react';

type Star = {
  x: number;
  y: number;
  r: number; // radius
  baseAlpha: number;
  twinkleAmp: number;
  twinkleFreq: number;
  twinklePhase: number;
  driftX: number; // pixels/sec
  layer: number; // 0=far,1=mid,2=near
  color: string; // rgba color
};

type Meteor = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // seconds remaining
  maxLife: number;
};

export default function SparkleBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>([]);
  const meteorRef = useRef<Meteor | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Re-seed stars to cover new bounds while preserving density
      seedStars(w, h);
    };

    const starPalette = [
      // cool whites and blues for retro space
      (a: number) => `rgba(234, 242, 255, ${a})`,
      (a: number) => `rgba(156, 201, 255, ${a})`,
      (a: number) => `rgba(199, 184, 255, ${a})`,
      (a: number) => `rgba(255, 194, 142, ${a})`, // occasional warm giant
    ];

    const seedStars = (w: number, h: number) => {
      const area = w * h;
      // Density tuned for performance and vibe
      const farCount = Math.floor(area / 14000); // many tiny
      const midCount = Math.floor(area / 30000);
      const nearCount = Math.floor(area / 80000);
      const list: Star[] = [];

      const pushStars = (count: number, layer: number) => {
        for (let i = 0; i < count; i++) {
          const x = Math.random() * w;
          const y = Math.random() * h;
          const rBase = layer === 2 ? 1.6 : layer === 1 ? 1.2 : 0.8;
          const r = rBase + Math.random() * (layer === 2 ? 1.1 : 0.8);
          const baseAlpha = 0.4 + Math.random() * 0.35;
          const twinkleAmp = 0.25 + Math.random() * 0.35;
          const twinkleFreq = 0.5 + Math.random() * 1.1; // cycles/sec
          const twinklePhase = Math.random() * Math.PI * 2;
          const driftX = (layer === 2 ? 6 : layer === 1 ? 3 : 1) * (Math.random() * 0.6 + 0.4); // px/sec
          const colorFn = starPalette[Math.floor(Math.random() * starPalette.length)];
          const color = colorFn(baseAlpha);
          list.push({ x, y, r, baseAlpha, twinkleAmp, twinkleFreq, twinklePhase, driftX, layer, color });
        }
      };

      pushStars(farCount, 0);
      pushStars(midCount, 1);
      pushStars(nearCount, 2);
      starsRef.current = list;
    };

    const spawnMeteor = (w: number, h: number) => {
      if (meteorRef.current) return; // one at a time
      const startX = Math.random() * w * 0.7 + w * 0.15; // avoid edges
      const startY = Math.random() * h * 0.4 + h * 0.1;
      const speed = 500 + Math.random() * 300; // px/sec
      const angle = (-35 - Math.random() * 20) * (Math.PI / 180); // down-left
      meteorRef.current = {
        x: startX,
        y: startY,
        vx: Math.cos(angle) * -speed,
        vy: Math.sin(angle) * -speed,
        life: 1.0,
        maxLife: 1.0,
      };
    };

    const drawNebula = (w: number, h: number) => {
      // subtle retro glow patches (dimmer for darker sky)
      const grad1 = ctx.createRadialGradient(w * 0.2, h * 0.5, 0, w * 0.2, h * 0.5, Math.min(w, h) * 0.35);
      grad1.addColorStop(0, 'rgba(88, 148, 255, 0.025)');
      grad1.addColorStop(1, 'rgba(88, 148, 255, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, w, h);

      const grad2 = ctx.createRadialGradient(w * 0.8, h * 0.8, 0, w * 0.8, h * 0.8, Math.min(w, h) * 0.4);
      grad2.addColorStop(0, 'rgba(167, 139, 250, 0.02)');
      grad2.addColorStop(1, 'rgba(167, 139, 250, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, w, h);
    };

    const step = (ts: number) => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      if (lastTimeRef.current == null) lastTimeRef.current = ts;
      const dt = (ts - lastTimeRef.current) / 1000; // seconds
      lastTimeRef.current = ts;

      ctx.clearRect(0, 0, w, h);

      // nebula soft glow layer
      drawNebula(w, h);

      // draw stars by layer for parallax ordering
      const stars = starsRef.current;
      ctx.save();
      for (let layer = 0; layer <= 2; layer++) {
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          if (s.layer !== layer) continue;
          // update drift
          s.x += s.driftX * dt;
          if (s.x > w + 10) s.x = -10; // wrap

          // twinkle alpha
          const twinkle = Math.sin(s.twinklePhase + ts / 1000 * (Math.PI * 2) * s.twinkleFreq) * s.twinkleAmp;
          const a = Math.max(0, Math.min(1, s.baseAlpha + twinkle));

          // draw glow
          ctx.shadowColor = s.color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^\)]+\)/, `rgba($1,$2,$3,${Math.min(1, a)})`);
          ctx.shadowBlur = 8 + s.r * 3;
          ctx.fillStyle = s.color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^\)]+\)/, `rgba($1,$2,$3,${Math.min(1, a)})`);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // meteor
      if (meteorRef.current) {
        const m = meteorRef.current;
        m.life -= dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const t = Math.max(0, m.life / m.maxLife);
        // trail
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const trailLen = 120;
        const grad = ctx.createLinearGradient(m.x, m.y, m.x + m.vx * (trailLen / (Math.hypot(m.vx, m.vy))), m.y + m.vy * (trailLen / (Math.hypot(m.vx, m.vy))));
        grad.addColorStop(0, `rgba(200,220,255,${0.6 * t})`);
        grad.addColorStop(1, 'rgba(200,220,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x + m.vx * 0.08, m.y + m.vy * 0.08);
        ctx.stroke();
        ctx.restore();
        if (m.life <= 0 || m.x < -50 || m.y > h + 50) {
          meteorRef.current = null;
        }
      }

      // chance to spawn meteor occasionally
      if (!meteorRef.current && Math.random() < dt * 0.02) {
        spawnMeteor(w, h);
      }

      rafRef.current = requestAnimationFrame(step);
    };

    resize();
    window.addEventListener('resize', resize);
    rafRef.current = requestAnimationFrame(step);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="sparkle-container" style={{ zIndex: 1 }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}
