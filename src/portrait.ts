import { clampValue, getPortraitFrame, PORTRAIT_FRAMES } from './state';

const SIZE = 512;
const ORIGINAL_SMILE = PORTRAIT_FRAMES.findIndex((frame) => frame.file === 'tibo-reset.jpg');
const ORIGINAL_SERIOUS = PORTRAIT_FRAMES.findIndex((frame) => frame.file === 'tibo-ban.jpg');
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

  constructor(
    private canvas: HTMLCanvasElement,
    private images: HTMLImageElement[],
  ) {
    if (images.length !== PORTRAIT_FRAMES.length || images.some((image) => !image?.naturalWidth)) {
      throw new Error(`All ${PORTRAIT_FRAMES.length} loaded portrait images are required`);
    }
    canvas.width = canvas.height = SIZE;
    this.context = contextFor(canvas);
  }

  render(value: number, compare = false) {
    const t = clampValue(value) / 100;
    const ctx = this.context;
    ctx.clearRect(0, 0, SIZE, SIZE);
    if (compare) {
      ctx.drawImage(this.images[ORIGINAL_SERIOUS], 0, 0, SIZE, SIZE);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, SIZE * (1 - t), SIZE);
      ctx.clip();
      ctx.drawImage(this.images[ORIGINAL_SMILE], 0, 0, SIZE, SIZE);
      ctx.restore();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(SIZE * (1 - t) - 1, 0, 2, SIZE);
      return;
    }
    // Each position shows one complete photograph; no crossfade or face warping.
    const frame = getPortraitFrame(value);
    ctx.drawImage(this.images[PORTRAIT_FRAMES.indexOf(frame)], 0, 0, SIZE, SIZE);
  }
}
