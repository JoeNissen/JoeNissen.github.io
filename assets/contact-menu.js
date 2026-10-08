const toggle = document.getElementById("contactToggle");
const menu = document.getElementById("contactMenu");

toggle.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = menu.classList.toggle("active");
  toggle.setAttribute("aria-expanded", isOpen);
});

document.addEventListener("click", (e) => {
  if (!menu.contains(e.target) && e.target !== toggle) {
    menu.classList.remove("active");
    toggle.setAttribute("aria-expanded", "false");
  }
});

// Email obfuscation
(function() {
  var u = "jnissen", d = "binghamton.edu";
  var el = document.getElementById("emailLink");
  el.href = "mailto:" + u + "@" + d;
  el.textContent = u + "@" + d;
})();
