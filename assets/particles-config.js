particlesJS("particles-js", {
  particles: {
    number: { value: 90, density: { enable: true, value_area: 900 } },
    color: { value: "#7aa2f7" },
    shape: { type: "circle" },
    opacity: {
      value: 0.5,
      random: true,
      anim: { enable: true, speed: 0.5, opacity_min: 0.2, sync: false }
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
      speed: 0.8,
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
      onhover: { enable: true, mode: "bubble" },
      onclick: { enable: true, mode: "repulse" },
      resize: true
    },
    modes: {
      bubble: { distance: 150, size: 5, duration: 2, opacity: 0.4 },
      repulse: { distance: 200, duration: 0.6 }
    }
  },
  retina_detect: true
});
