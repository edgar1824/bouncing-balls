interface IJoke {
  word: string;
  index: number;
}
interface IResponse {
  error: string;
  message: string;
  joke?: string;
  setup?: string;
  delivery?: string;
}

const messageModal = document.querySelector("#error") as HTMLDivElement;
const loadingModal = document.querySelector("#loading") as HTMLDivElement;
const reloadBtn = document.querySelector("#error button") as HTMLButtonElement;
const jokeElem = document.querySelector(".joke") as HTMLButtonElement;
const canvas = document.querySelector("canvas")!;
const ctx = canvas?.getContext("2d")!;
const jokeMinHeight = 80;
const jokeWordHeight = 29;
const padding = { x: 4, y: 8 };
const gapBetweenWords = { x: 1, y: 3 };
const WIDTH = document.body.clientWidth * 0.9;
const HEIGHT = document.body.clientHeight * 0.9 - jokeMinHeight;
const gravity = 0.98;
const friction = 0.5;
const borderWidth = 1;

let animating = false;
let animationFrameId = 0;
let completedBallsCount = 0;
let balls: Ball[] = [];
let jokeArr: IJoke[] = [];
let _jokeArr: IJoke[] = [];

jokeElem.style.width = WIDTH + borderWidth + "px";
canvas.width = WIDTH;
canvas.height = HEIGHT;

// Objects
class Ball {
  index;
  x;
  y;
  _y;
  dy;
  radius: number = 0;
  word;
  colorValues;
  isExpired: boolean = false;
  opacity: number = 0.75;

  constructor(x: number, y: number, dy: number, word: string, index: number) {
    this.x = x;
    this.y = y;
    this._y = y;
    this.dy = dy;
    this.word = word;
    this.colorValues = Array.from({ length: 3 }).map(() =>
      Math.floor(Math.random() * 151)
    );
    this.index = index;
  }

  update() {
    this._y = this.y;
    if (this.y + this.radius + this.dy + borderWidth > HEIGHT) {
      this.dy = -this.dy;
      this.dy = this.dy * friction;
    } else this.dy += gravity;
    this.y += this.dy;
    if (this.opacity <= 0) {
      this.build();
      this.isExpired = true;
    }
    if (this._y === this.y) this.opacity -= 0.2;
    console.log(this.dy);

    this.draw();
  }

  draw() {
    if (this.isExpired) return;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = `rgba(${this.colorValues.join(", ")}, ${this.opacity})`;
    ctx.fill();
    ctx.closePath();
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.fillText(this.word, this.x, this.y, WIDTH / 2);
    if (!this.radius) this.radius = ctx.measureText(this.word).width / 2 + 20;
    if (this.x - this.radius < 0) {
      this.x = this.radius;
    } else if (this.x + this.radius > WIDTH) {
      this.x = WIDTH - this.radius;
    } else if (this.y - this.radius < 0) {
      this.y = this.radius;
    } else if (this.y + this.radius > HEIGHT) {
      this.y = HEIGHT - this.radius;
    }
  }

  build() {
    let left = padding.x;
    let top = padding.y;

    const div = document.createElement("div");
    div.className = "joke-word";
    div.style.backgroundColor = `rgba(${this.colorValues.join(", ")}, 1)`;
    div.innerHTML = this.word;

    _jokeArr.forEach(({ word }, i) => {
      if (this.index > i) {
        left += getWidth(word) + gapBetweenWords.x;
        while (left + getWidth(_jokeArr[i + 1].word) > WIDTH - padding.x) {
          left = padding.x;
          top += jokeWordHeight + gapBetweenWords.y;
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
      padding.y; // the top of the last word + word height + padding
    if (
      (!parseFloat(jokeElem.style.height) && height > jokeMinHeight) ||
      height > parseFloat(jokeElem.style.height)
    ) {
      jokeElem.style.height = height + "px";
    }
    completedBallsCount++;
  }
}

// Functions
async function fetchJokeArr() {
  // const categories = [Programming,Pun,Christmas];
  // nsfw,religious,political,racist,sexist,explicit
  setLoading();
  try {
    // const res = await fetch("https://icanhazdadjoke.com/slack");
    // const data: { attachments: [{ text: string }] } = await res.json();
    // const text = data.attachments[0].text;
    const res = await fetch(
      "https://v2.jokeapi.dev/joke/Programming,Pun,Christmas?blacklistFlags=nsfw,racist,sexist,explicit"
    );
    const data: IResponse = await res.json();
    if (data.error) throw data;
    const text = data.joke ? data.joke : data?.setup + " " + data?.delivery;

    jokeArr = text
      .split(/[\n\r\u2028\u2029\s]/g)
      .filter(Boolean)
      .map((word, index) => ({ word, index }));
    _jokeArr = [...jokeArr];
  } catch (err) {
    console.error(err);
    showRebootBtn();
    throw err;
  } finally {
    setLoading(false);
  }
}
function showRebootBtn() {
  messageModal.style.display = "flex";
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
  toast.innerHTML = `<span>${text}<span> <b>&times;</b>`;
  toast.querySelector("b")?.addEventListener("click", hideToasts);
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
    try {
      await fetchJokeArr();
    } catch (err) {
      showToast("Sorry, something went wrong", "err");
      return;
    }
  }
  if (!animating) {
    jokeElem.style.removeProperty("height");
    jokeElem.innerHTML = "";
    animate();
    animating = true;
  }
  if (jokeArr.length === 0 && !document.querySelector(".toast")) {
    showToast("Wait...");
  }
  if (!jokeArr.length && animating) return;

  const randomWordId = Math.floor(Math.random() * (jokeArr.length - 1));

  const b = new Ball(
    e.offsetX,
    e.offsetY,
    5,
    jokeArr[randomWordId].word,
    jokeArr[randomWordId].index
  );
  balls.push(b);
  jokeArr = jokeArr.filter((_, i) => i !== randomWordId);
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
    showToast("you can start again.", "scss");
  }
}
