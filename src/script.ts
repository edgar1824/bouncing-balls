// ### Interfaces ###
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

// ### Variables ###
// Elements
const ruler = document.querySelector(".ruler") as HTMLDivElement;
const messageModal = document.querySelector("#error") as HTMLDivElement;
const loadingModal = document.querySelector("#loading") as HTMLDivElement;
const reloadBtn = document.querySelector("#error button") as HTMLButtonElement;
const jokeElem = document.querySelector(".joke") as HTMLDivElement;
const canvas = document.querySelector("canvas")!;
const ctx = canvas?.getContext("2d")!;
// For styling
const canvasFontSize = style("--canvas-font-size");
const jokeWordHeight = style("--joke-word-height");
const jokeWordDur = style("--joke-word-dur");
const jokePadding = { x: style("--joke-px"), y: style("--joke-py") };
const jokeMinHeight = jokeWordHeight + jokePadding.y * 2;
const gapBetweenWords = { x: style("--joke-gap-x"), y: style("--joke-gap-y") };
const borderWidth = style("--canvas-border-width");
const toastDur = style("--toast-dur");
const toastColors = { err: "red", wrng: "#6c757d", scss: "green" };

// For animation
const gravity = 0.8;
const friction = 0.5;
let WIDTH = window.innerWidth * 0.9;
let HEIGHT = window.innerHeight * 0.9;
let animating = false;
let animationFrameId = 0;
let timeout: NodeJS.Timeout;
let interval: NodeJS.Timer;
let balls: Ball[] = [];
let jokeArr: IJoke[] = [];
let _jokeArr: IJoke[] = [];

jokeElem.style.width = WIDTH + borderWidth + "px";
canvas.width = WIDTH;
canvas.height = HEIGHT;

// ### Objects ###
class Ball {
  index;
  x;
  y;
  _y;
  dy;
  word;
  colorValues;
  isExpired: boolean = false;
  opacity: number = 0.75;
  _opacity: number = 0.75;
  radius: number = 0;
  padding = 20;

  constructor(x: number, y: number, dy: number, word: string, index: number) {
    this.x = x;
    this.y = y;
    this._y = y;
    this.dy = dy;
    this.word = word;
    this.colorValues = Array.from({ length: 3 }).map(
      () => Math.floor(Math.random() * 151) // picking random dark color
    );
    this.index = index;
  }

  // Updating state of ball
  update() {
    this._y = this.y;
    if (this.y + this.radius + this.dy + borderWidth > HEIGHT) {
      this.dy = -this.dy;
      this.dy = this.dy * friction;
    } else this.dy += gravity;
    this.y += this.dy;
    if (this.opacity <= 0) {
      this.isExpired = true;
      this.build();
    }
    if (this._y === this.y) this.opacity -= 0.2;
    this.draw();
  }

  // Drawing ball in the canvas
  draw() {
    if (this.isExpired) return;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = `rgba(${this.colorValues.join(", ")}, ${this.opacity})`;
    ctx.fill();
    ctx.closePath();
    ctx.font = `${canvasFontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.fillText(this.word, this.x, this.y, WIDTH / 2);
    if (!this.radius)
      this.radius = ctx.measureText(this.word).width / 2 + this.padding;
    if (this.x - this.radius < 0) {
      this.x = this.radius;
    } else if (this.x + this.radius > WIDTH) {
      this.x = WIDTH - this.radius;
    }
    if (this.y - this.radius - jokeElem.clientHeight < 0) {
      this.y = this.radius + jokeElem.clientHeight;
    } else if (this.y + this.radius > HEIGHT) {
      this.y = HEIGHT - this.radius;
    }
  }

  // Putting word from ball in the joke element
  build() {
    let left = jokePadding.x;
    let top = jokePadding.y;

    _jokeArr.forEach(({ word }, i) => {
      if (this.index > i) {
        left += getWidth(word) + gapBetweenWords.x;
        while (left + getWidth(_jokeArr[i + 1].word) > WIDTH - jokePadding.x) {
          left = jokePadding.x;
          top += jokeWordHeight + gapBetweenWords.y;
        }
      }
    });

    const div = document.createElement("div");
    div.className = "joke-word";
    div.style.backgroundColor = `rgba(${this.colorValues.join(", ")}, ${
      this._opacity
    })`;
    div.innerHTML = this.word;
    div.style.width = getWidth(this.word) + "px";

    div.style.left = left + "px";
    div.style.top = top + "px";
    jokeElem.append(div);

    const height =
      Math.max(
        ...[...(jokeElem.childNodes as unknown as HTMLDivElement[])].map((el) =>
          parseFloat(el.style.top)
        )
      ) +
      jokeWordHeight +
      jokePadding.y; // the top of the last word + word height + jokePadding

    if (height !== parseFloat(jokeElem.style.height)) {
      jokeElem.style.height = height + "px";
    }

    if (!balls.filter((ball) => !ball.isExpired).length) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        resetAnimationValues();
        if (_jokeArr.length === jokeElem.children.length) {
          clearInterval(interval);
          hideToast("all");
          showToast("you can start again.", "scss");
          // Finished
        }
      }, jokeWordDur);
    }
  }
}

// ### Functions ###
// Fetching joke from API
async function fetchJokeArr() {
  setLoading();
  try {
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
    showToast("Sorry, something went wrong", "err", false);
    showRebootBtn();
    return "err";
  } finally {
    setLoading(false);
  }
}
// Getting global styles from css
function style(t: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(t);
  return parseFloat(v);
}
// Displaying reload btn
function showRebootBtn() {
  messageModal.style.display = "flex";
}
// Displaying loading
function setLoading(isLoading: boolean = true) {
  if (isLoading) {
    loadingModal.style.display = "flex";
  } else loadingModal.style.display = "none";
}
// Hiding toast / toasts
function hideToast(arg: "all" | HTMLParagraphElement) {
  if (arg === "all") {
    if (!!document.querySelector(".toast")) {
      (
        document.querySelectorAll(".toast") as NodeListOf<HTMLParagraphElement>
      )?.forEach((toast) => hideToast(toast));
    }
  } else {
    arg.style.opacity = "0";
    setTimeout(() => {
      arg.style.cssText = `display: none`;
      arg.remove();
    }, toastDur);
  }
}
// Showing toast
function showToast(
  text: string,
  state: "err" | "scss" | "wrng" = "wrng",
  removeOnEnd: boolean = true
) {
  const toast = document.createElement("p") as HTMLParagraphElement;
  const color = toastColors[state];
  toast.className = "toast";
  toast.innerHTML = `<span>${text}</span> <b>&times;</b>`;
  toast.querySelector("b")?.addEventListener("click", () => hideToast(toast));
  toast.style.cssText = `display: flex; background: ${color};`;
  document.body.append(toast);
  setTimeout(() => (toast.style.opacity = "1"), 10);
  if (removeOnEnd) setTimeout(() => hideToast(toast), 3000);
}
// Getting width of joke word element (to calculate positions for word)
function getWidth(text: string) {
  ruler.innerHTML = text;
  return ruler.clientWidth;
}
function resetAnimationValues() {
  cancelAnimationFrame(animationFrameId);
  animating = false;
  animationFrameId = 0;
}

// ### Handlers ###
// Canvas click
canvas.addEventListener("click", async (e) => {
  if (!jokeArr.length && !animating) {
    if ((await fetchJokeArr()) === "err") return;
    clearTimeout(timeout);
    clearInterval(interval);
    hideToast("all");
    balls = [];
    jokeElem.style.removeProperty("height");
    jokeElem.innerHTML = "";
    animate();
    animating = true;
  }
  if (!jokeArr.length && !document.querySelector(".toast")) {
    showToast("Wait...");
    return;
  }

  if (!jokeArr.length && animating) return;
  if (e.offsetY < jokeElem.offsetHeight) {
    if (!document.querySelector(".toast")) showToast("click lowwer");
    return;
  }
  if (!animating) {
    animate();
    animating = true;
  }
  clearTimeout(timeout);
  clearInterval(interval);
  hideToast("all");

  const randomWordId = Math.floor(Math.random() * (jokeArr.length - 1));

  const b = new Ball(
    e.offsetX,
    e.offsetY,
    10,
    jokeArr[randomWordId].word,
    jokeArr[randomWordId].index
  );
  balls.push(b);
  jokeArr = jokeArr.filter((_, i) => i !== randomWordId);

  interval = setInterval(() => {
    if (!document.querySelector(".toast")) showToast("click to box");
  }, 7000);
});
// Reload btn click
reloadBtn.addEventListener("click", () => {
  window.location.reload();
});
// Reconstructing elements on window resize
window.addEventListener("resize", () => {
  WIDTH = window.innerWidth * 0.9;
  HEIGHT = window.innerHeight * 0.9;

  jokeElem.style.width = WIDTH + borderWidth + "px";
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  jokeElem.innerHTML = "";
  balls.forEach((ball) => {
    ball.build();
  });
});

// Animation Loop
function animate() {
  animationFrameId = requestAnimationFrame(animate);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  balls
    .filter((ball) => !ball.isExpired)
    .forEach((ball) => {
      ball.update();
    });
}
