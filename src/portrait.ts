import Delaunator from 'delaunator';
import { affineTransform, interpolatePoints, trianglePath, type Point, type Triangle } from './geometry';
import { clampValue } from './state';

const SIZE = 512;
const boundary: Point[] = [
  [0, 0], [256, 0], [512, 0], [512, 256], [512, 512],
  [256, 512], [0, 512], [0, 256],
];

// Corresponding landmarks measured on the two supplied crops, in source pixels.
const resetPoints: Point[] = [...boundary,
  [338, 65], [244, 126], [431, 134], [329, 117],
  [224, 221], [418, 220], [247, 193], [300, 190], [351, 209], [395, 225],
  [247, 208], [270, 210], [296, 216], [342, 225], [364, 229], [387, 236],
  [325, 230], [305, 273], [282, 269], [330, 280],
  [265, 295], [331, 309], [304, 303], [297, 328],
  [216, 300], [241, 350], [286, 385], [352, 358], [383, 287],
  [218, 266], [400, 261], [210, 397], [349, 404],
];
const banPoints: Point[] = [...boundary,
  [270, 4], [128, 56], [391, 45], [237, 73],
  [111, 181], [359, 180], [115, 186], [173, 175], [190, 178], [242, 190],
  [106, 203], [125, 203], [145, 206], [177, 204], [207, 200], [231, 198],
  [174, 209], [123, 270], [106, 270], [165, 274],
  [125, 304], [208, 307], [163, 301], [169, 324],
  [119, 316], [150, 362], [225, 378], [317, 357], [357, 283],
  [105, 241], [381, 238], [232, 417], [369, 393],
];
const triangles = Delaunator.from(interpolatePoints(resetPoints, banPoints, 0.5)).triangles;

function contextFor(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable');
  return context;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      if (error) reject(error);
      else resolve(image);
    };
    const timeout = window.setTimeout(() => finish(new Error('Image loading timed out')), 15000);
    image.onload = () => finish();
    image.onerror = () => finish(new Error(`Image could not load: ${url}`));
    image.src = url;
  });
}

export class Portrait {
  private context: CanvasRenderingContext2D;
  private layers = [document.createElement('canvas'), document.createElement('canvas')];
  private layerContexts: CanvasRenderingContext2D[];

  constructor(
    private canvas: HTMLCanvasElement,
    private resetImage: HTMLImageElement,
    private banImage: HTMLImageElement,
  ) {
    canvas.width = canvas.height = SIZE;
    this.context = contextFor(canvas);
    this.layerContexts = this.layers.map((layer) => {
      layer.width = layer.height = SIZE;
      return contextFor(layer);
    });
  }

  render(value: number, compare = false) {
    const t = clampValue(value) / 100;
    const ctx = this.context;
    ctx.clearRect(0, 0, SIZE, SIZE);
    if (compare) {
      ctx.drawImage(this.banImage, 0, 0, SIZE, SIZE);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, SIZE * (1 - t), SIZE);
      ctx.clip();
      ctx.drawImage(this.resetImage, 0, 0, SIZE, SIZE);
      ctx.restore();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(SIZE * (1 - t) - 1, 0, 2, SIZE);
      return;
    }
    if (t === 0 || t === 1) {
      ctx.drawImage(t === 0 ? this.resetImage : this.banImage, 0, 0, SIZE, SIZE);
      return;
    }
    const destination = interpolatePoints(resetPoints, banPoints, t);
    this.warp(0, this.resetImage, resetPoints, destination);
    this.warp(1, this.banImage, banPoints, destination);
    ctx.save();
    // Add the weighted layers so intermediate portraits stay opaque, not washed out.
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - t;
    ctx.drawImage(this.layers[0], 0, 0);
    ctx.globalAlpha = t;
    ctx.drawImage(this.layers[1], 0, 0);
    ctx.restore();
  }

  private warp(index: number, image: HTMLImageElement, source: Point[], destination: Point[]) {
    const ctx = this.layerContexts[index];
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(image, 0, 0, SIZE, SIZE);
    for (let i = 0; i < triangles.length; i += 3) {
      const indices = [triangles[i], triangles[i + 1], triangles[i + 2]];
      const from = indices.map((n) => source[n]) as unknown as Triangle;
      const to = indices.map((n) => destination[n]) as unknown as Triangle;
      const transform = affineTransform(from, to);
      if (!transform) continue;
      const expanded = trianglePath(to, 0.5);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(...expanded[0]);
      ctx.lineTo(...expanded[1]);
      ctx.lineTo(...expanded[2]);
      ctx.closePath();
      ctx.clip();
      ctx.setTransform(...transform);
      ctx.drawImage(image, 0, 0, SIZE, SIZE);
      ctx.restore();
    }
  }
}
