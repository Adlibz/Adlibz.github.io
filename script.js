let current = 1;

// 🎵 music control (autoplay-safe: start on first user click)
let musicStarted = false;
function startMusic() {
  if (musicStarted) return;

  const audio = document.getElementById("bgMusic");
  if (!audio) return;

  audio.volume = 0.18; // quiet
  audio.play().then(() => {
    musicStarted = true;
  }).catch(() => {
    // If browser blocks it, it will still work after another click.
  });
}

function showScreen(n) {
  document.getElementById(`screen${current}`).classList.add("hidden");
  current = n;
  document.getElementById(`screen${current}`).classList.remove("hidden");

  // Start typing when final screen is shown
  if (current === 4) {
    startTyping();
  }
}

function nextScreen() {
  startMusic();
  showScreen(current + 1);
}

function sayYes() {
  startMusic();
  showScreen(4);
}

// No button runs away 😄
const noBtn = document.getElementById("noBtn");
if (noBtn) {
  noBtn.addEventListener("mouseover", () => {
    const x = Math.random() * 200 - 100;
    const y = Math.random() * 200 - 100;
    noBtn.style.transform = `translate(${x}px, ${y}px)`;
  });
}

// 💌 typing effect
let typedOnce = false;
function startTyping() {
  if (typedOnce) return;
  typedOnce = true;

  const el = document.getElementById("typedMessage");
  if (!el) return;

  const text = "I don’t need a Valentine… I just need you. 🧡";
  let i = 0;

  const tick = () => {
    el.textContent = text.slice(0, i);
    i++;
    if (i <= text.length) setTimeout(tick, 45);
  };

  tick();
}
