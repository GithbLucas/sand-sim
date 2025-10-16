"use strict";

function hueToRgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}

function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1/3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1/3);
  }

  return Math.round(r * 0xFF) * 0x010000 + Math.round(g * 0xFF) * 0x000100 + Math.round(b * 255);
}

/** @type {HTMLCanvasElement} */
let canvasElement = document.getElementById("canvas");
/** @type {CanvasRenderingContext2D} */
const ctx = canvasElement.getContext("2d")

canvasElement.height = Math.min(window.innerHeight, window.innerWidth);
canvasElement.width = canvasElement.height;

const resolution = 100;
const pixelLen = canvasElement.width/resolution;

let pixelGrid = {
    grid : [],
    setPixel: function (x, y, value) {
        try {
            this.grid[x][y] = value;
        } catch (e) {
            // console.error(`ERROR: value at ${x}, ${y} cannot be set.`)
        }
    },
    getPixel: function (x, y, value) {
        try {
            return this.grid[x][y];
        } catch (e) {
            // console.error(`ERROR: value at ${x}, ${y} does not exist or cannot be retrieved.`);
            return -1;
        }
    }
}

for (let i = 0; i<resolution; i++){
    let temp = []
    for (let j = 0; j<resolution; j++){
        temp.push(0);
    }
    pixelGrid.grid.push(temp)
}

let draining = false;
let paused = false;

function updateGrid() {
    //Loop indices are reversed

    for (let i = resolution-1; i>=0; i--){
        for (let j = resolution-1; j>=0; j--){
    
            if(pixelGrid.getPixel(i, j)) {
                if(pixelGrid.getPixel(i, j+1) === 0) {
                    pixelGrid.setPixel(i, j+1, pixelGrid.getPixel(i, j));
                    pixelGrid.setPixel(i, j, 0);
                } else if(pixelGrid.getPixel(i+1, j+1) === 0 || pixelGrid.getPixel(i-1, j+1) === 0) {
                    let leftChance = (pixelGrid.getPixel(i-1, j+1) === 0);
                    let rightChance = (pixelGrid.getPixel(i+1, j+1) === 0);
                    let totalChance = leftChance + rightChance;
                    let dice = Math.random()
                    if(dice <= (leftChance/totalChance) && pixelGrid.getPixel(i-1, j+1) != -1) {pixelGrid.setPixel(i-1, j+1, pixelGrid.getPixel(i,j))}
                    if(dice >= 1-(rightChance/totalChance) && pixelGrid.getPixel(i+1, j+1) != -1) {pixelGrid.setPixel(i+1, j+1, pixelGrid.getPixel(i,j))}
                    pixelGrid.setPixel(i, j, 0);
                }
            }

            if(draining && j == resolution - 1 && !((i + Math.round(Math.random()))%2)) {
                pixelGrid.setPixel(i, j, 0)
            }
        }
    }
}

function drawGrid() {
    for (let i = 0; i<resolution; i++){
        for (let j = 0; j<resolution; j++){
            
            ctx.fillStyle = "#" + pixelGrid.getPixel(i, j).toString(16).padStart(6, "0")
            ctx.fillRect(pixelLen*i, pixelLen*j, pixelLen, pixelLen)

        }
    }
}

let colorCounter = 0.1;
let brushSize = 10;
let rect = canvasElement.getBoundingClientRect();

function draw (e) {
    let clickX = Math.floor((e.clientX-rect.left)/pixelLen);
    let clickY = Math.floor((e.clientY-rect.top)/pixelLen);

    if (e.buttons == 1) {
        for (let i=-brushSize; i<=brushSize; i++){
            for (let j=-brushSize; j<=brushSize; j++){
                if (!pixelGrid.getPixel(clickX+i, clickY+j) && i**2 + j**2 <= brushSize**2) {
                pixelGrid.setPixel(clickX+i, clickY+j, hslToRgb(colorCounter, 1, .5) & 0xFFFFFF);
                colorCounter+=1/30000;
                colorCounter%=1;
                }
            }
        }
    } else if (e.buttons == 2) {
        for (let i=-brushSize; i<=brushSize; i++){
            for (let j=-brushSize; j<=brushSize; j++){
                pixelGrid.setPixel(clickX+i, clickY+j, 0);
        }}
    }
}

canvasElement.addEventListener("mousemove", (e)=>draw(e))

window.addEventListener("keydown",(e)=>{
    if (e.key == " ") {draining = true}
    if (e.key == "k") {paused = !paused}
})

window.addEventListener("keyup", (e)=>{
    if (e.key == " ") {draining = false}
})

function update () {
    if (!paused) {updateGrid();}
    drawGrid();
}

setInterval(update, 20)