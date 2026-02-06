<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Joe Nissen | Computer Science</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0e14;
      --fg: #e6e6eb;
      --muted: #9aa0b4;
      --accent: #7aa2f7;
      --card: #121826;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: Inter, system-ui, sans-serif;
      background: radial-gradient(1200px 600px at 20% -10%, #1a2040, transparent), var(--bg);
      color: var(--fg);
      line-height: 1.6;
    }

    header {
      padding: 6rem 1.5rem 4rem;
      max-width: 1100px;
      margin: auto;
    }

    h1 {
      font-size: clamp(2.5rem, 6vw, 4rem);
      font-weight: 800;
      letter-spacing: -0.04em;
      margin: 0 0 1rem;
    }

    h1 span { color: var(--accent); }

    p.lead {
      font-size: 1.25rem;
      color: var(--muted);
      max-width: 700px;
    }

    .actions {
      margin-top: 2rem;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.75rem 1.25rem;
      border-radius: 10px;
      font-weight: 600;
      border: 1px solid transparent;
      cursor: pointer;
      text-decoration: none;
    }

    .btn.primary {
      background: linear-gradient(135deg, #7aa2f7, #9d7af7);
      color: #05060a;
    }

    .btn.secondary {
      border-color: #2a2f45;
      color: var(--fg);
      background: #0f1424;
    }

    section {
      max-width: 1100px;
      margin: auto;
      padding: 3rem 1.5rem;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.5rem;
    }

    .card {
      background: linear-gradient(180deg, #121826, #0e1320);
      border: 1px solid #1f2540;
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 20px 40px rgba(0,0,0,0.35);
    }

    .card h3 { margin-top: 0; }

    footer {
      text-align: center;
      padding: 3rem 1.5rem 4rem;
      color: var(--muted);
      font-size: 0.9rem;
    }

    footer a { color: var(--accent); text-decoration: none; }
  </style>
</head>
<body>
  <header>
    <h1>Joe Nissen<span>.</span></h1>
    <p class="lead">
      Computer Science master’s student focused on systems, AI, and software engineering.
      I build things that are fast, correct, and actually ship.
    </p>
    <div class="actions">
      <a class="btn primary" href="#projects">Projects</a>
      <a class="btn secondary" href="#contact">Contact</a>
      <a class="btn secondary" href="https://github.com/joenissen">GitHub</a>
    </div>
  </header>

  <section id="projects">
    <h2>Selected Work</h2>
    <div class="grid">
      <div class="card">
        <h3>AI / ML Projects</h3>
        <p>Reinforcement learning, heuristic search, model evaluation, and practical ML tooling.</p>
      </div>
      <div class="card">
        <h3>Systems & Backend</h3>
        <p>Linux, low-level programming, networking, databases, and scalable backend services.</p>
      </div>
      <div class="card">
        <h3>Developer Tools</h3>
        <p>Shell scripting, automation, and productivity tooling for real workflows.</p>
      </div>
    </div>
  </section>

  <section id="contact">
    <h2>Get in Touch</h2>
    <div class="card">
      <p>
        📧 <strong>Email:</strong> jnissen@binghamton.edu<br />
        💻 <strong>GitHub:</strong> <a href="https://github.com/joenissen">github.com/joenissen</a>
      </p>
    </div>
  </section>

  <footer>
    © <script>document.write(new Date().getFullYear())</script> Joe Nissen · Built with GitHub Pages
  </footer>
</body>
</html>
