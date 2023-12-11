const messageModal = document.querySelector("#error") as HTMLDivElement;
const loadingModal = document.querySelector("#loading") as HTMLDivElement;
const reloadBtn = document.querySelector(".error button") as HTMLButtonElement;
const messageElem = document.querySelector(".message") as HTMLButtonElement;
const jokeElem = document.querySelector(".joke") as HTMLButtonElement;
const canvas = document.querySelector("canvas")!;
const ctx = canvas?.getContext("2d")!;
const WIDTH = document.body.clientWidth * 0.9;
const HEIGHT = document.body.clientHeight * 0.7;
// const jokeMinHeight = 80;
const jokeWordHeight = 29;
const padding = { x: 4, y: 8 };
const gapBetweenWords = 3;

jokeElem.style.maxWidth = WIDTH + "px";

const gravity = 0.2;
const friction = 0.7;
const borderWidth = 1;
const ballRadius = 75;

let animating = false;
let animationFrameId = 0;
let completedBallsCount = 0;
let balls: Ball[] = [];

let jokeArr: string[] = [];
let _jokeArr: string[] = [];

canvas.width = WIDTH;
canvas.height = HEIGHT;

// Objects
class Ball {
  index;
  x;
  y;
  _y;
  dx;
  dy;
  radius;
  word;
  colorValues;
  isExpired: boolean = false;
  opacity: number = 1;

  constructor(
    x: number,
    y: number,
    dx: number,
    dy: number,
    radius: number,
    word: string,
    index: number
  ) {
    this.x = x;
    this.y = y;
    this._y = y;
    this.dx = dx;
    this.dy = dy;
    this.radius = radius;
    this.colorValues = Array.from({ length: 3 }).map(() =>
      Math.floor(Math.random() * 255)
    );
    this.word = word;
    this.index = index;
  }

  update() {
    this._y = this.y;
    if (this.y + this.radius + this.dy + borderWidth > HEIGHT) {
      this.dy = -this.dy * friction;
    } else this.dy += gravity;
    this.y += this.dy;
    if (this.opacity <= 0) {
      this.build();
      this.isExpired = true;
    }
    if (this._y === this.y) this.opacity -= 0.075;
    this.draw();
  }

  draw() {
    if (this.isExpired) return;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = `rgba(0,0,0, ${this.opacity})`;
    ctx.fill();
    ctx.closePath();
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.fillText(this.word, this.x, this.y);
  }

  build() {
    let left = padding.x;
    let top = padding.y;

    const div = document.createElement("div");
    div.className = "joke-word";
    div.innerHTML = this.word;

    _jokeArr.forEach((word, i) => {
      if (this.index > i) {
        left += getWidth(word) + 1;
        while (left + getWidth(_jokeArr[i + 1]) > WIDTH - padding.x) {
          left = padding.y;
          top += jokeWordHeight + gapBetweenWords;
        }
      }
    });
    div.style.left = left + "px";
    div.style.top = top + "px";
    jokeElem.append(div);

    const height =
      Math.max(
        ...[...(jokeElem.childNodes as NodeListOf<HTMLDivElement>)].map((el) =>
          parseFloat(el.style.top)
        )
      ) +
      jokeWordHeight +
      5; // the top of the last word + word height + padding
    jokeElem.style.height = height + "px";
    completedBallsCount++;
  }
}

// Functions
async function fetchJokeArr() {
  setLoading();
  try {
    const res = await fetch("https://icanhazdadjoke.com/slack");
    const data: { attachments: [{ text: string }] } = await res.json();
    console.log(data.attachments[0].text);
    jokeArr = data.attachments[0].text.split(" ").filter(Boolean);
    _jokeArr = [...jokeArr];
  } catch (err) {
    console.error(err);
    showMessage("Something went wrong!");
  } finally {
    setLoading(false);
  }
}
function showMessage(message: string = "") {
  messageModal.style.display = "flex";
  messageElem.innerHTML = message;
}
function setLoading(isLoading: boolean = true) {
  if (isLoading) {
    loadingModal.style.display = "flex";
  } else loadingModal.style.display = "none";
}
function hideToasts() {
  const toasts = document.querySelectorAll(
    ".toast"
  ) as NodeListOf<HTMLParagraphElement>;
  toasts?.forEach((toast) => {
    if (toast) {
      toast.style.opacity = "0";
      setTimeout(() => {
        toast.style.cssText = `display: none`;
        toast.remove();
      }, parseFloat(getComputedStyle(toast).getPropertyValue("--dur")));
    }
  });
}
function showToast(text: string, state: "err" | "scss" | "hint" = "hint") {
  const toast = document.createElement("p") as HTMLParagraphElement;
  toast.className = "toast";
  toast.innerHTML = `<span>${text}<span> <bold>&times;</bold>`;
  toast.querySelector("bold")?.addEventListener("click", hideToasts);
  let color = { err: "red", hint: "gray", scss: "green" }[state];
  toast.style.cssText = `display: flex; background: ${color};`;
  document.body.append(toast);
  setTimeout(() => (toast.style.opacity = "1"), 0);
  setTimeout(hideToasts, 3000);
}

function getWidth(text: string) {
  const div = document.createElement("div");
  div.style.cssText = `
    font-size: 20px;
    color: white;
    padding: 3px 5px;`;

  div.innerHTML = text;
  document.body.append(div);
  let w = div.clientWidth;
  div.remove();
  return w;
}

// Handlers
canvas.addEventListener("click", async (e) => {
  if (!jokeArr.length && !animating) {
    await fetchJokeArr();
  }
  if (!animating) {
    jokeElem.style.removeProperty("height");
    jokeElem.innerHTML = "";
    animate();
    animating = true;
  }
  if (!jokeArr.length && animating) {
    return;
  }

  const b = new Ball(
    e.offsetX,
    e.offsetY,
    5,
    0,
    ballRadius,
    jokeArr[0],
    _jokeArr.length - jokeArr.length
  );
  balls.push(b);
  jokeArr.shift();

  if (jokeArr.length === 0) {
    showToast("Wait...");
  }
});
reloadBtn.addEventListener("click", () => {
  window.location.reload();
});

// Animation Loop
function animate() {
  animationFrameId = requestAnimationFrame(animate);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  balls = balls.filter((ball) => !ball.isExpired);
  balls.forEach((ball) => {
    ball.update();
  });

  if (completedBallsCount === _jokeArr.length) {
    console.log("finished");
    cancelAnimationFrame(animationFrameId);
    animating = false;
    animationFrameId = 0;
    completedBallsCount = 0;
  }
}
