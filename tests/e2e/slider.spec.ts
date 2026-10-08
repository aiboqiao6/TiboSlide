import { expect, test } from '@playwright/test';
import { PORTRAIT_FRAMES } from '../../src/state';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#portrait')).toHaveAttribute('data-ready', 'true');
});

test('loads a nonblank portrait without errors or overflow', async ({ page }, testInfo) => {
  await expect(page.getByRole('heading', { name: 'Tibo 滑动变祖器' })).toBeVisible();
  const pixels = await page.locator('#portrait').evaluate((node) => {
    const canvas = node as HTMLCanvasElement;
    const context = canvas.getContext('2d')!;
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let opaque = 0;
    const colors = new Set();
    for (let i = 0; i < data.length; i += 400) {
      if (data[i + 3] > 0) opaque++;
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    }
    return { opaque, colors: colors.size };
  });
  expect(pixels.opaque).toBeGreaterThan(100);
  expect(pixels.colors).toBeGreaterThan(50);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const presets = await page.locator('#presets').boundingBox();
  expect(presets).not.toBeNull();
  expect(presets!.y + presets!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.screenshot({ path: `test-results/${testInfo.project.name}-initial.png`, fullPage: true });
});

test('supports four presets, exact endpoints and reset', async ({ page }) => {
  const slider = page.getByRole('slider', { name: '变祖进度' });
  await page.getByRole('radio', { name: '牢提', exact: true }).click();
  await expect(slider).toHaveValue('100');
  await expect(page.locator('#percentage')).toHaveText('100');
  await page.getByRole('radio', { name: '提祖', exact: true }).click();
  await expect(slider).toHaveValue('0');
  await page.getByRole('button', { name: '复位' }).click();
  await expect(slider).toHaveValue('0');
});

test('supports keyboard, dragging and a shared URL', async ({ page }, testInfo) => {
  const slider = page.getByRole('slider', { name: '变祖进度' });
  await slider.focus();
  await slider.press('ArrowRight');
  await expect(slider).toHaveValue('1');
  await slider.press('End');
  await expect(slider).toHaveValue('100');
  await slider.press('Home');
  await expect(slider).toHaveValue('0');
  const box = await slider.boundingBox();
  if (!box) throw new Error('Slider has no layout box');
  if (testInfo.project.name === 'mobile') {
    await slider.tap({ position: { x: box.width * 0.7, y: box.height / 2 } });
  } else {
    await page.mouse.move(box.x + 14, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
  }
  expect(Number(await slider.inputValue())).toBeGreaterThan(50);
  await page.goto('/?z=80');
  await expect(slider).toHaveValue('80');
  await expect(page.locator('#stage-name')).toHaveText('提波');
});

test('plays, pauses and cancels playback on manual input', async ({ page }) => {
  await page.getByRole('button', { name: '自动变祖' }).click();
  await expect.poll(async () => Number(await page.getByRole('slider').inputValue())).toBeGreaterThan(5);
  await page.getByRole('button', { name: '暂停变祖' }).click();
  const value = await page.getByRole('slider').inputValue();
  await expect(page.getByRole('button', { name: '自动变祖' })).toBeVisible();
  await expect(page.getByRole('slider')).toHaveValue(value);
  await page.getByRole('button', { name: '自动变祖' }).click();
  await page.getByRole('radio', { name: '提圣', exact: true }).click();
  await expect(page.getByRole('slider')).toHaveValue('33');
  await expect(page.getByRole('button', { name: '自动变祖' })).toBeVisible();
});

test('compares originals and exports an actual PNG', async ({ page }) => {
  await page.goto('/?z=50');
  await expect(page.locator('#portrait')).toHaveAttribute('data-ready', 'true');
  const before = await page.locator('#portrait').evaluate((node) => (node as HTMLCanvasElement).toDataURL());
  await page.getByRole('button', { name: '对比原图' }).click();
  await expect(page.getByRole('button', { name: '返回变祖' })).toHaveAttribute('aria-pressed', 'true');
  const after = await page.locator('#portrait').evaluate((node) => (node as HTMLCanvasElement).toDataURL());
  expect(after).not.toBe(before);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: '保存图片' }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toMatch(/^tibo-\d+\.png$/);
  expect(await file.failure()).toBeNull();
});

test('shows a recoverable image-loading error', async ({ page }) => {
  await page.route('**/assets/*.jpg', (route) => route.abort());
  await page.reload();
  await expect(page.getByRole('button', { name: '重新加载' })).toBeVisible();
  await expect(page.getByRole('slider')).toBeDisabled();
  await page.unroute('**/assets/*.jpg');
  await page.getByRole('button', { name: '重新加载' }).click();
  await expect(page.locator('#portrait')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('slider')).toBeEnabled();
});

test('uses the four new titles without the old thumbnail cards', async ({ page }) => {
  await expect(page.getByRole('radio')).toHaveCount(4);
  for (const title of ['提祖', '提圣', '提波', '牢提']) {
    await expect(page.getByRole('radio', { name: title, exact: true })).toBeEnabled();
  }
  await expect(page.locator('.preset-image')).toHaveCount(0);
  await expect(page.locator('#presets')).not.toContainText(/重置卡|降智|封号/);
});

test('renders a single source photo pixel-for-pixel at every slider position', async ({ page }) => {
  const result = await page.evaluate(async (frames) => {
    const source = document.createElement('canvas');
    source.width = source.height = 512;
    const sourceContext = source.getContext('2d')!;
    const referencePixels = await Promise.all(frames.map(async (frame) => {
      const image = new Image();
      image.src = new URL(`./assets/${frame.file}`, location.href).href;
      await image.decode();
      sourceContext.clearRect(0, 0, 512, 512);
      sourceContext.drawImage(image, 0, 0, 512, 512);
      return sourceContext.getImageData(0, 0, 512, 512).data;
    }));
    const canvas = document.getElementById('portrait') as HTMLCanvasElement;
    const context = canvas.getContext('2d')!;
    const slider = document.getElementById('intensity') as HTMLInputElement;
    const mismatches: number[] = [];
    const visited = new Set<number>();
    for (const value of [...Array.from({ length: 101 }, (_, index) => index),
      ...Array.from({ length: 101 }, (_, index) => 100 - index)]) {
      slider.value = String(value);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      const nearest = frames.reduce((best, frame, index) =>
        Math.abs(frame.value - value) <= Math.abs(frames[best].value - value) ? index : best, 0);
      visited.add(nearest);
      const actual = context.getImageData(0, 0, 512, 512).data;
      const expected = referencePixels[nearest];
      if (actual.some((byte, index) => byte !== expected[index])) mismatches.push(value);
    }
    return { mismatches, visited: visited.size };
  }, PORTRAIT_FRAMES);
  expect(result.mismatches).toEqual([]);
  expect(result.visited).toBeGreaterThanOrEqual(46);
});

test('keeps comparison linked to the original photos after expanding the sequence', async ({ page }) => {
  await page.goto('/?z=0');
  await expect(page.locator('#portrait')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: '对比原图' }).click();
  const result = await page.evaluate(async () => {
    const canvas = document.getElementById('portrait') as HTMLCanvasElement;
    const slider = document.getElementById('intensity') as HTMLInputElement;
    const reference = document.createElement('canvas');
    reference.width = reference.height = 512;
    const context = reference.getContext('2d')!;
    const mismatches: string[] = [];
    for (const [value, file] of [[0, 'tibo-reset.jpg'], [100, 'tibo-ban.jpg']] as const) {
      const image = new Image();
      image.src = new URL(`./assets/${file}`, location.href).href;
      await image.decode();
      context.drawImage(image, 0, 0, 512, 512);
      slider.value = String(value);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      // Exclude the deliberately drawn split divider at the canvas edge.
      const actual = canvas.getContext('2d')!.getImageData(2, 0, 508, 512).data;
      const expected = context.getImageData(2, 0, 508, 512).data;
      if (actual.some((byte, index) => byte !== expected[index])) mismatches.push(file);
    }
    return mismatches;
  });
  expect(result).toEqual([]);
});
