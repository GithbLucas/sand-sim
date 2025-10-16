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

const resolution = 80;
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

const brush = {
    size: 4,
    override: (x, y) => !pixelGrid.getPixel(x, y),
    shape: (x, y) => x**2 + y**2 <= brush.size**2,
    shapes: {
        star: (x, y) => {
            let starPoints = 5;
            let r = Math.sqrt(x**2+y**2)
            let th = Math.atan(y/x)
            return r <= brush.size * ((Math.sin(starPoints*(th + 10*brush.iter))+starPoints)/starPoints)
        }
    },
    iter : 0
}

brush.shape = brush.shapes.star;

let relMouseCoord = {x: 0, y: 0}

function draw (e) {
    if (!isMouseDown) return;

    let clickX = Math.floor(relMouseCoord.x/pixelLen);
    let clickY = Math.floor(relMouseCoord.y/pixelLen);


    for (let i=-Math.floor(brush.size); i<=Math.floor(brush.size); i++){
        for (let j=-Math.floor(brush.size); j<=Math.floor(brush.size); j++){

            if (/*brush.override(clickX+i,clickY+j) &&*/ brush.shape(i,j) && e.buttons == 1) {
                
                pixelGrid.setPixel(clickX+i, clickY+j, hslToRgb(brush.iter, 1, .5) & 0xFFFFFF);
                brush.iter+=1/30000;
                brush.iter%=1;

            } else if (brush.shape(i,j) && e.buttons == 2) {
                pixelGrid.setPixel(clickX+i, clickY+j, 0);
            }
        }
    }
    
    requestAnimationFrame(()=>draw(e));
}


canvasElement.addEventListener("mousemove", (e)=>{
    relMouseCoord.x = e.offsetX;
    relMouseCoord.y = e.offsetY;
})

let isMouseDown = false;
canvasElement.addEventListener("mousedown", (e) => {e.preventDefault(); isMouseDown = true; draw(e)});
canvasElement.addEventListener("mouseup", () => {isMouseDown = false});

canvasElement.addEventListener("wheel", (e)=>{
    if (brush.size >= 1 || e.deltaY > 0 ) {
        console.log(e.deltaY)
        brush.size += e.deltaY/333
    }
})

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