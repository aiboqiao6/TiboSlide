import { createIcons, SlidersHorizontal, Code2, Share2, Columns2, Play, Pause, RotateCcw, RotateCw, Download, X, Copy } from 'lucide';
import { advancePlayback, clampValue, getStage, initialValue, PORTRAIT_FRAMES, STAGES, type Direction } from './state';
import { loadImage, Portrait } from './portrait';
import '@fontsource-variable/manrope';
import '@fontsource/dm-mono/latin-400.css';
import '@fontsource/dm-mono/latin-500.css';
import './style.css';

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Required element missing: ${id}`);
  return node as T;
}

const canvas = element<HTMLCanvasElement>('portrait');
const slider = element<HTMLInputElement>('intensity');
const playButton = element<HTMLButtonElement>('play');
const compareButton = element<HTMLButtonElement>('compare');
const downloadButton = element<HTMLButtonElement>('download');
const resetButton = element<HTMLButtonElement>('reset');
const presets = element<HTMLFieldSetElement>('presets');
const loading = element('loading');
const retryButton = element<HTMLButtonElement>('retry');
const shareDialog = element<HTMLDialogElement>('share-dialog');
const shareInput = element<HTMLInputElement>('share-url');
let value = initialValue(location.search);
let portrait: Portrait | null = null;
let compare = false;
let playing = false;
let frame = 0;
let previousTime = 0;
let direction: Direction = 1;
let noticeTimeout = 0;

function icons() {
  createIcons({ icons: { SlidersHorizontal, Code2, Share2, Columns2, Play, Pause, RotateCcw, RotateCw, Download, X, Copy } });
}

STAGES.forEach((stage, index) => {
  const label = document.createElement('label');
  label.className = 'preset';
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'stage';
  input.value = String(stage.value);
  input.setAttribute('aria-label', stage.name);
  input.disabled = true;
  const text = document.createElement('span');
  text.className = 'preset-text';
  const name = document.createElement('span');
  name.className = 'preset-name';
  name.textContent = stage.name;
  const number = document.createElement('span');
  number.className = 'preset-number';
  number.textContent = `0${index + 1}`;
  text.append(number, name);
  label.append(input, text);
  presets.append(label);
  input.addEventListener('change', () => {
    stopPlayback();
    render(stage.value);
  });
});
for (let i = 0; i < 20; i++) element('level-bars').append(document.createElement('span'));
icons();

function render(nextValue = value) {
  value = clampValue(nextValue);
  const rounded = Math.round(value);
  const stage = getStage(value);
  const index = STAGES.indexOf(stage);
  document.documentElement.style.setProperty('--accent', stage.color);
  slider.value = String(rounded);
  slider.setAttribute('aria-valuetext', `${stage.name}，${rounded}%`);
  element('percentage').textContent = String(rounded);
  element('stage-name').textContent = stage.name;
  element('stage-code').textContent = stage.code;
  element('stage-index').innerHTML = `0${index + 1}<span>/ 04</span>`;
  element('track-fill').style.width = `${value}%`;
  element('portrait-mode').textContent = compare ? 'ORIGINAL / SPLIT' : 'PORTRAIT / LIVE';
  canvas.setAttribute('aria-label', `Tibo：${stage.name}，变祖进度 ${rounded}%`);
  document.querySelectorAll('.stage-indicators span').forEach((node, i) => node.classList.toggle('active', i === index));
  document.querySelectorAll('#level-bars span').forEach((node, i) => node.classList.toggle('active', i < Math.ceil(value / 5)));
  presets.querySelectorAll('input').forEach((input, i) => { input.checked = i === index; });
  portrait?.render(value, compare);
}

function stopPlayback() {
  playing = false;
  cancelAnimationFrame(frame);
  playButton.setAttribute('aria-label', '自动变祖');
  playButton.setAttribute('data-tooltip', '自动变祖');
  playButton.setAttribute('aria-pressed', 'false');
  playButton.innerHTML = '<i data-lucide="play"></i>';
  icons();
}

function animate(now: number) {
  if (!playing) return;
  const next = advancePlayback(value, direction, Math.min(100, now - previousTime));
  previousTime = now;
  direction = next.direction;
  render(next.value);
  frame = requestAnimationFrame(animate);
}

slider.addEventListener('input', () => {
  stopPlayback();
  render(Number(slider.value));
});
playButton.addEventListener('click', () => {
  if (playing) return stopPlayback();
  playing = true;
  direction = value >= 100 ? -1 : 1;
  previousTime = performance.now();
  playButton.setAttribute('aria-label', '暂停变祖');
  playButton.setAttribute('data-tooltip', '暂停变祖');
  playButton.setAttribute('aria-pressed', 'true');
  playButton.innerHTML = '<i data-lucide="pause"></i>';
  icons();
  frame = requestAnimationFrame(animate);
});
resetButton.addEventListener('click', () => {
  stopPlayback();
  render(0);
});
compareButton.addEventListener('click', () => {
  compare = !compare;
  compareButton.setAttribute('aria-pressed', String(compare));
  compareButton.setAttribute('aria-label', compare ? '返回变祖' : '对比原图');
  compareButton.setAttribute('data-tooltip', compare ? '返回变祖' : '对比原图');
  render();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stopPlayback(); });
window.addEventListener('popstate', () => { stopPlayback(); render(initialValue(location.search)); });

function notify(message: string) {
  const notice = element('notice');
  clearTimeout(noticeTimeout);
  notice.textContent = message;
  notice.hidden = false;
  noticeTimeout = window.setTimeout(() => { notice.hidden = true; }, 2800);
}

element('share').addEventListener('click', async () => {
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('z', String(Math.round(value)));
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Tibo 滑动变祖器', text: `当前档位：${getStage(value).name}`, url: url.href });
    } else {
      await navigator.clipboard.writeText(url.href);
      notify('当前档位链接已复制');
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    shareInput.value = url.href;
    shareDialog.showModal();
    shareInput.select();
  }
});
element('close-share').addEventListener('click', () => shareDialog.close());
element('copy-link').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(shareInput.value);
    shareDialog.close();
    notify('链接已复制');
  } catch {
    shareInput.focus();
    shareInput.select();
    notify('无法访问剪贴板，请从输入框复制链接');
  }
});

downloadButton.addEventListener('click', async () => {
  if (!portrait) return;
  stopPlayback();
  downloadButton.disabled = true;
  try {
    const output = document.createElement('canvas');
    output.width = 960;
    output.height = 1180;
    const ctx = output.getContext('2d');
    if (!ctx) throw new Error('Export canvas is unavailable');
    const stage = getStage(value);
    ctx.fillStyle = '#f5f7f6';
    ctx.fillRect(0, 0, 960, 1180);
    ctx.fillStyle = '#252d2a';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('Tibo 滑动变祖器', 80, 96);
    ctx.font = '18px monospace';
    ctx.fillStyle = '#717c76';
    ctx.fillText('THE TIBO EXPERIMENT / NO. 001', 80, 138);
    ctx.drawImage(canvas, 80, 188, 800, 800);
    ctx.fillStyle = stage.color;
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText(stage.name, 80, 1062);
    ctx.textAlign = 'right';
    ctx.font = '42px monospace';
    ctx.fillText(`${Math.round(value)}%`, 880, 1062);
    ctx.textAlign = 'left';
    ctx.font = '17px sans-serif';
    ctx.fillStyle = '#717c76';
    ctx.fillText('纯属娱乐，不代表本人或任何机构观点。', 80, 1124);
    const blob = await new Promise<Blob>((resolve, reject) => {
      output.toBlob((result) => result ? resolve(result) : reject(new Error('PNG encoding failed')), 'image/png');
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tibo-${Math.round(value)}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('图片已生成');
  } catch (error) {
    console.error('[TiboSlide] export_failed', { error });
    notify('图片保存失败，请重试');
  } finally {
    downloadButton.disabled = false;
  }
});

async function boot() {
  portrait = null;
  canvas.removeAttribute('data-ready');
  loading.hidden = false;
  retryButton.hidden = true;
  element('load-message').textContent = '正在加载人像…';
  const controls = [slider, playButton, compareButton, resetButton, downloadButton, ...presets.querySelectorAll('input')];
  controls.forEach((control) => { control.disabled = true; });
  try {
    const images = await Promise.all(PORTRAIT_FRAMES.map((frame) =>
      loadImage(`${import.meta.env.BASE_URL}assets/${frame.file}`)));
    portrait = new Portrait(canvas, images);
    render();
    canvas.setAttribute('data-ready', 'true');
    loading.hidden = true;
    controls.forEach((control) => { control.disabled = false; });
  } catch (error) {
    console.error('[TiboSlide] image_load_failed', { error });
    element('load-message').textContent = '人像加载失败';
    retryButton.hidden = false;
  }
}
retryButton.addEventListener('click', () => { void boot(); });
render();
void boot();
