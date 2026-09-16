particlesJS("particles-js", {
  particles: {
    number: { value: 70, density: { enable: true, value_area: 900 } },
    color: { value: "#7aa2f7" },
    shape: { type: "circle" },
    opacity: {
      value: 0.18,
      random: true,
      anim: { enable: true, speed: 0.5, opacity_min: 0.05, sync: false }
    },
    size: {
      value: 3,
      random: true,
      anim: { enable: true, speed: 2, size_min: 0.5, sync: false }
    },
    line_linked: {
      enable: true,
      distance: 140,
      color: "#7aa2f7",
      opacity: 0.15,
      width: 1
    },
    move: {
      enable: true,
      speed: 0.5,
      direction: "none",
      random: true,
      straight: false,
      out_mode: "out",
      bounce: false
    }
  },
  interactivity: {
    detect_on: "window",
    events: {
      onhover: { enable: true, mode: "repulse" },
      onclick: { enable: true, mode: "push" },
      resize: true
    },
    modes: {
      push: { particles_nb: 4 },
      repulse: { distance: 100, duration: 0.4 }
    }
  },
  retina_detect: true
});
