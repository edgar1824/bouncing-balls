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

const ruler = document.querySelector(".ruler") as HTMLDivElement;
const messageModal = document.querySelector("#error") as HTMLDivElement;
const loadingModal = document.querySelector("#loading") as HTMLDivElement;
const reloadBtn = document.querySelector("#error button") as HTMLButtonElement;
const jokeElem = document.querySelector(".joke") as HTMLDivElement;
const canvas = document.querySelector("canvas")!;
const ctx = canvas?.getContext("2d")!;
const canvasFontSize = style("--canvas-font-size");
const jokeWordHeight = style("--joke-word-height");
const jokePadding = { x: style("--joke-px"), y: style("--joke-py") };
const jokeMinHeight = jokeWordHeight + jokePadding.y * 2;
const gapBetweenWords = { x: style("--joke-gap-x"), y: style("--joke-gap-y") };
const borderWidth = style("--canvas-border-width");
const toastColors = { err: "red", hint: "#6c757d", scss: "green" };
const gravity = 0.8;
const friction = 0.5;

let WIDTH = window.innerWidth * 0.9;
let HEIGHT = window.innerHeight * 0.9;
let animating = false;
let animationFrameId = 0;
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
  word;
  colorValues;
  isExpired: boolean = false;
  opacity: number = 0.75;
  _opacity: number = 0.75;
  radius: number = 0;

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
    this.draw();
  }

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
        ...[...(jokeElem.childNodes as NodeListOf<HTMLDivElement>)].map((el) =>
          parseFloat(el.style.top)
        )
      ) +
      jokeWordHeight +
      jokePadding.y; // the top of the last word + word height + jokePadding

    if (height !== parseFloat(jokeElem.style.height)) {
      jokeElem.style.height = height + "px";
    }
  }
}

// Functions
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
    showToast("Sorry, something went wrong", "err");
    showRebootBtn();
  } finally {
    setLoading(false);
  }
}
function style(t: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(t);
  return parseFloat(v);
}
function showRebootBtn() {
  messageModal.style.display = "flex";
}
function setLoading(isLoading: boolean = true) {
  if (isLoading) {
    loadingModal.style.display = "flex";
  } else loadingModal.style.display = "none";
}
function hideToasts(toast: HTMLParagraphElement | "every") {
  if (toast === "every") {
    (
      document.querySelectorAll(".toast") as NodeListOf<HTMLParagraphElement>
    )?.forEach((toast) => {
      if (toast) {
        toast.style.opacity = "0";
        setTimeout(() => {
          toast.style.cssText = `display: none`;
          toast.remove();
        }, parseFloat(getComputedStyle(toast).getPropertyValue("--dur")));
      }
    });
  } else {
    toast.style.opacity = "0";
    setTimeout(() => {
      toast.style.cssText = `display: none`;
      toast.remove();
    }, parseFloat(getComputedStyle(toast).getPropertyValue("--dur")));
  }
}
function showToast(text: string, state: "err" | "scss" | "hint" = "hint") {
  const toast = document.createElement("p") as HTMLParagraphElement;
  const color = toastColors[state];
  toast.className = "toast";
  toast.innerHTML = `<span>${text}</span> <b>&times;</b>`;
  toast.querySelector("b")?.addEventListener("click", () => hideToasts(toast));
  toast.style.cssText = `display: flex; background: ${color};`;
  document.body.append(toast);
  setTimeout(() => (toast.style.opacity = "1"), 0);
  setTimeout(() => hideToasts(toast), 3000);
}
function getWidth(text: string) {
  ruler.innerHTML = text;
  return ruler.clientWidth;
}

// Handlers
canvas.addEventListener("click", async (e) => {
  if (!jokeArr.length && !animating) {
    await fetchJokeArr();
    balls = [];
    jokeElem.style.removeProperty("height");
    jokeElem.innerHTML = "";
    animate();
    animating = true;
  }

  if (!jokeArr.length && !document.querySelector(".toast")) {
    showToast("Wait...");
  }

  if (!jokeArr.length && animating) return;
  if (e.offsetY < jokeElem.offsetHeight) {
    if (!document.querySelector(".toast")) showToast("click lowwer");
    return;
  }

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
});

reloadBtn.addEventListener("click", () => {
  window.location.reload();
});
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
  // balls = balls.filter((ball) => !ball.isExpired);
  balls
    .filter((ball) => !ball.isExpired)
    .forEach((ball) => {
      ball.update();
    });

  if (_jokeArr.length === jokeElem.children.length) {
    console.log("finished");
    cancelAnimationFrame(animationFrameId);
    animating = false;
    animationFrameId = 0;
    showToast("you can start again.", "scss");
  }
}
