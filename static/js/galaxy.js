// static/js/galaxy.js - random sidebar animation: galaxy, solar system, or signal, switching every 5s
window.addEventListener('DOMContentLoaded', function() {
  const canvas = document.getElementById('galaxy-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;

  // --- Animation 1: Starfield Galaxy ---
  function drawGalaxy(cancelToken) {
    const starCount = Math.max(10, Math.min(24, Math.floor((w * h) / 100)));
    const stars = Array.from({length: starCount}, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      z: Math.random() * w,
      o: 0.5 + Math.random() * 0.5
    }));
    function draw() {
      if (cancelToken.cancelled) return;
      ctx.clearRect(0, 0, w, h);
      for (let s of stars) {
        let k = 128.0 / s.z;
        let px = (s.x - w/2) * k + w/2;
        let py = (s.y - h/2) * k + h/2;
        let size = Math.max(0.7, (1.5 - s.z / w) * (w / 60));
        ctx.beginPath();
        ctx.arc(px, py, size, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(255,255,255,${s.o})`;
        ctx.fill();
        s.z -= Math.max(0.7, w / 60);
        if (s.z < 1) {
          s.x = Math.random() * w;
          s.y = Math.random() * h;
          s.z = w;
          s.o = 0.5 + Math.random() * 0.5;
        }
      }
      cancelToken.frame = requestAnimationFrame(draw);
    }
    draw();
  }

  // --- Animation 2: Solar System Spiral ---
  function drawSolarSystem(cancelToken) {
    const planets = [
      {r: w*0.18, speed: 0.03, size: 3, color: '#ffecb3'},
      {r: w*0.28, speed: 0.02, size: 2, color: '#b3e5fc'},
      {r: w*0.38, speed: 0.012, size: 2.5, color: '#c8e6c9'}
    ];
    let t = 0;
    function draw() {
      if (cancelToken.cancelled) return;
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      ctx.arc(w/2, h/2, 6, 0, 2*Math.PI);
      ctx.fillStyle = '#fff176';
      ctx.shadowColor = '#fffde7';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      planets.forEach((p, i) => {
        let angle = t * p.speed + i;
        let px = w/2 + Math.cos(angle) * p.r;
        let py = h/2 + Math.sin(angle) * p.r;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, 2*Math.PI);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      t += 1;
      cancelToken.frame = requestAnimationFrame(draw);
    }
    draw();
  }

  // --- Animation 3: Animated Sine Wave ---
  function drawSignal(cancelToken) {
    let phase = 0;
    function draw() {
      if (cancelToken.cancelled) return;
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        let y = h/2 + Math.sin((x/w)*4*Math.PI + phase) * h/3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#90caf9';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
      phase += 0.08;
      cancelToken.frame = requestAnimationFrame(draw);
    }
    draw();
  }

  // --- Animation 4: Animated Square Wave ---
  function drawSquareWave(cancelToken) {
    let phase = 0;
    function draw() {
      if (cancelToken.cancelled) return;
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        // 2 periods across the width
        let t = (x / w) * 2 * Math.PI + phase;
        let y = h/2 + (Math.sign(Math.sin(t)) * h/3);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ffb300';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
      phase += 0.08;
      cancelToken.frame = requestAnimationFrame(draw);
    }
    draw();
  }

  // --- Animation switching logic ---
  const animations = [drawGalaxy, drawSolarSystem, drawSignal, drawSquareWave];
  let cancelToken = {cancelled: false, frame: null};
  let animationInterval;
  
  function pickAndRun() {
    // Cancel previous animation
    cancelToken.cancelled = true;
    if (cancelToken.frame) cancelAnimationFrame(cancelToken.frame);
    // New token for new animation
    cancelToken = {cancelled: false, frame: null};
    // Pick and run
    const pick = Math.floor(Math.random() * animations.length);
    animations[pick](cancelToken);
  }
  
  // Cleanup function for when page is unloaded
  function cleanup() {
    cancelToken.cancelled = true;
    if (cancelToken.frame) cancelAnimationFrame(cancelToken.frame);
    if (animationInterval) clearInterval(animationInterval);
  }
  
  pickAndRun();
  animationInterval = setInterval(pickAndRun, 5000); // Switch every 5 seconds
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('pagehide', cleanup);
});
