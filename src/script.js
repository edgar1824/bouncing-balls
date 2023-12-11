"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const messageModal = document.querySelector("#error");
const loadingModal = document.querySelector("#loading");
const reloadBtn = document.querySelector("#error button");
const jokeElem = document.querySelector(".joke");
const canvas = document.querySelector("canvas");
const ctx = canvas === null || canvas === void 0 ? void 0 : canvas.getContext("2d");
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
let balls = [];
let jokeArr = [];
let _jokeArr = [];
jokeElem.style.width = WIDTH + borderWidth + "px";
canvas.width = WIDTH;
canvas.height = HEIGHT;
// Objects
class Ball {
    constructor(x, y, dy, word, index) {
        this.radius = 0;
        this.isExpired = false;
        this.opacity = 0.75;
        this.x = x;
        this.y = y;
        this._y = y;
        this.dy = dy;
        this.word = word;
        this.colorValues = Array.from({ length: 3 }).map(() => Math.floor(Math.random() * 151));
        this.index = index;
    }
    update() {
        this._y = this.y;
        if (this.y + this.radius + this.dy + borderWidth > HEIGHT) {
            this.dy = -this.dy;
            this.dy = this.dy * friction;
        }
        else
            this.dy += gravity;
        this.y += this.dy;
        if (this.opacity <= 0) {
            this.build();
            this.isExpired = true;
        }
        if (this._y === this.y)
            this.opacity -= 0.2;
        console.log(this.dy);
        this.draw();
    }
    draw() {
        if (this.isExpired)
            return;
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
        if (!this.radius)
            this.radius = ctx.measureText(this.word).width / 2 + 20;
        if (this.x - this.radius < 0) {
            this.x = this.radius;
        }
        else if (this.x + this.radius > WIDTH) {
            this.x = WIDTH - this.radius;
        }
        else if (this.y - this.radius < 0) {
            this.y = this.radius;
        }
        else if (this.y + this.radius > HEIGHT) {
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
        const height = Math.max(...[...jokeElem.childNodes].map((el) => parseFloat(el.style.top))) +
            jokeWordHeight +
            padding.y; // the top of the last word + word height + padding
        if ((!parseFloat(jokeElem.style.height) && height > jokeMinHeight) ||
            height > parseFloat(jokeElem.style.height)) {
            jokeElem.style.height = height + "px";
        }
        completedBallsCount++;
    }
}
// Functions
function fetchJokeArr() {
    return __awaiter(this, void 0, void 0, function* () {
        // const categories = [Programming,Pun,Christmas];
        // nsfw,religious,political,racist,sexist,explicit
        setLoading();
        try {
            // const res = await fetch("https://icanhazdadjoke.com/slack");
            // const data: { attachments: [{ text: string }] } = await res.json();
            // const text = data.attachments[0].text;
            const res = yield fetch("https://v2.jokeapi.dev/joke/Programming,Pun,Christmas?blacklistFlags=nsfw,racist,sexist,explicit");
            const data = yield res.json();
            if (data.error)
                throw data;
            const text = data.joke ? data.joke : (data === null || data === void 0 ? void 0 : data.setup) + " " + (data === null || data === void 0 ? void 0 : data.delivery);
            jokeArr = text
                .split(/[\n\r\u2028\u2029\s]/g)
                .filter(Boolean)
                .map((word, index) => ({ word, index }));
            _jokeArr = [...jokeArr];
        }
        catch (err) {
            console.error(err);
            showRebootBtn();
            throw err;
        }
        finally {
            setLoading(false);
        }
    });
}
function showRebootBtn() {
    messageModal.style.display = "flex";
}
function setLoading(isLoading = true) {
    if (isLoading) {
        loadingModal.style.display = "flex";
    }
    else
        loadingModal.style.display = "none";
}
function hideToasts() {
    const toasts = document.querySelectorAll(".toast");
    toasts === null || toasts === void 0 ? void 0 : toasts.forEach((toast) => {
        if (toast) {
            toast.style.opacity = "0";
            setTimeout(() => {
                toast.style.cssText = `display: none`;
                toast.remove();
            }, parseFloat(getComputedStyle(toast).getPropertyValue("--dur")));
        }
    });
}
function showToast(text, state = "hint") {
    var _a;
    const toast = document.createElement("p");
    toast.className = "toast";
    toast.innerHTML = `<span>${text}<span> <b>&times;</b>`;
    (_a = toast.querySelector("b")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", hideToasts);
    let color = { err: "red", hint: "gray", scss: "green" }[state];
    toast.style.cssText = `display: flex; background: ${color};`;
    document.body.append(toast);
    setTimeout(() => (toast.style.opacity = "1"), 0);
    setTimeout(hideToasts, 3000);
}
function getWidth(text) {
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
canvas.addEventListener("click", (e) => __awaiter(void 0, void 0, void 0, function* () {
    if (!jokeArr.length && !animating) {
        try {
            yield fetchJokeArr();
        }
        catch (err) {
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
    if (!jokeArr.length && animating)
        return;
    const randomWordId = Math.floor(Math.random() * (jokeArr.length - 1));
    const b = new Ball(e.offsetX, e.offsetY, 5, jokeArr[randomWordId].word, jokeArr[randomWordId].index);
    balls.push(b);
    jokeArr = jokeArr.filter((_, i) => i !== randomWordId);
}));
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
