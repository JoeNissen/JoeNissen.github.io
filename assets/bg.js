const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- Particles ---
const particles = [];
const numParticles = 60; // slightly denser, still subtle

for (let i = 0; i < numParticles; i++) {
  particles.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    r: Math.random() * 1.8 + 0.7
  });
}

// --- Gradient drift ---
let gradientOffset = 0;

// --- Animation loop ---
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Gradient background
  gradientOffset += 0.0005; // very slow
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, `hsla(${gradientOffset * 360}, 40%, 20%, 1)`);  // lighter than before
  grad.addColorStop(1, `hsla(${(gradientOffset + 0.1) * 360}, 35%, 25%, 1)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw particles
  for (let i = 0; i < numParticles; i++) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;

    // wrap
    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; // slightly brighter
    ctx.fill();
  }

  // Draw subtle connections
  for (let i = 0; i < numParticles; i++) {
    for (let j = i + 1; j < numParticles; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 130) {
        ctx.strokeStyle = `rgba(255,255,255,${0.05 * (1 - dist / 130)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(animate);
}

animate();
