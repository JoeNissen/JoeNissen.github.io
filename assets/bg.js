const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');

let width, height;
function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- Particles ---
const particles = [];
const numParticles = 50; // subtle, low density

for (let i = 0; i < numParticles; i++) {
  particles.push({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.2, // slow drift
    vy: (Math.random() - 0.5) * 0.2,
    r: Math.random() * 1.5 + 0.5
  });
}

// --- Gradient drift ---
let gradientOffset = 0;

// --- Animation loop ---
function animate() {
  ctx.clearRect(0, 0, width, height);

  // Gradient background
  gradientOffset += 0.0005; // very slow drift
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, `hsla(${gradientOffset * 360}, 30%, 10%, 1)`);
  grad.addColorStop(1, `hsla(${(gradientOffset + 0.1) * 360}, 30%, 15%, 1)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Draw particles
  for (let i = 0; i < numParticles; i++) {
    const p = particles[i];

    // Move
    p.x += p.vx;
    p.y += p.vy;

    // Wrap edges
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;

    // Draw particle
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
  }

  // Draw subtle connections
  for (let i = 0; i < numParticles; i++) {
    for (let j = i + 1; j < numParticles; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) { // subtle distance
        ctx.strokeStyle = `rgba(255,255,255,${0.04 * (1 - dist / 120)})`;
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
