let current = 1;

function nextScreen() {
  document.getElementById(`screen${current}`).classList.add("hidden");
  current++;
  document.getElementById(`screen${current}`).classList.remove("hidden");
}

function sayYes() {
  document.getElementById("screen3").classList.add("hidden");
  document.getElementById("screen4").classList.remove("hidden");
}

const noBtn = document.getElementById("noBtn");

noBtn.addEventListener("mouseover", () => {
  const x = Math.random() * 200 - 100;
  const y = Math.random() * 200 - 100;
  noBtn.style.transform = `translate(${x}px, ${y}px)`;
});
