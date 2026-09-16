/* ── Shared site animations ── */

(function() {

  /* 1. Navbar solidify on scroll */
  var navbar = document.querySelector(".navbar");
  if (navbar) {
    window.addEventListener("scroll", function() {
      if (window.scrollY > 40) {
        navbar.classList.add("scrolled");
      } else {
        navbar.classList.remove("scrolled");
      }
    }, { passive: true });
  }

  /* 2. Scroll-triggered card reveals (IntersectionObserver) */
  var cards = document.querySelectorAll(".card");
  if (cards.length > 0 && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry, i) {
        if (entry.isIntersecting) {
          // Stagger delay based on visible order
          var delay = Array.prototype.indexOf.call(cards, entry.target) * 150;
          setTimeout(function() {
            entry.target.classList.add("visible");
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    cards.forEach(function(card) {
      observer.observe(card);
    });
  } else {
    // Fallback: show all cards immediately
    cards.forEach(function(card) { card.classList.add("visible"); });
  }

  /* 3. Card tilt on hover (3D parallax) */
  cards.forEach(function(card) {
    card.addEventListener("mousemove", function(e) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var centerX = rect.width / 2;
      var centerY = rect.height / 2;

      var rotateX = ((y - centerY) / centerY) * -4;
      var rotateY = ((x - centerX) / centerX) * 4;

      card.style.transform = "perspective(800px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg) translateY(-6px)";
    });

    card.addEventListener("mouseleave", function() {
      card.style.transform = "";
    });
  });

  /* 4. Typewriter effect on hero h1 (index page only) */
  var heroHeader = document.querySelector(".page-header.hero h1");
  if (heroHeader) {
    var fullText = heroHeader.textContent.replace(".", "");
    var dotSpan = heroHeader.querySelector("span");

    // Hide the dot span during typing
    if (dotSpan) dotSpan.style.display = "none";

    // Clear original text and create a typing target
    heroHeader.childNodes.forEach(function(node) {
      if (node.nodeType === 3) node.textContent = "";
    });

    // Create cursor
    var cursor = document.createElement("span");
    cursor.className = "typewriter-cursor";
    cursor.innerHTML = "&nbsp;";
    heroHeader.appendChild(cursor);

    var charIndex = 0;
    var textNode = document.createTextNode("");
    heroHeader.insertBefore(textNode, cursor);

    function typeNext() {
      if (charIndex < fullText.length) {
        textNode.textContent += fullText[charIndex];
        charIndex++;
        setTimeout(typeNext, 60 + Math.random() * 40);
      } else {
        // Done typing, show the dot and remove cursor
        if (dotSpan) {
          dotSpan.style.display = "";
          heroHeader.insertBefore(dotSpan, cursor);
        }
        setTimeout(function() {
          cursor.remove();
        }, 1500);
      }
    }

    // Start after a short delay
    setTimeout(typeNext, 400);
  }

})();
