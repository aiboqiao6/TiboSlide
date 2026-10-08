import { expect, test } from '@playwright/test';

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
  await page.getByRole('radio', { name: '封号', exact: true }).click();
  await expect(slider).toHaveValue('100');
  await expect(page.locator('#percentage')).toHaveText('100');
  await page.getByRole('radio', { name: '重置卡', exact: true }).click();
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
  await expect(page.locator('#stage-name')).toHaveText('降智');
});

test('plays, pauses and cancels playback on manual input', async ({ page }) => {
  await page.getByRole('button', { name: '自动变祖' }).click();
  await expect.poll(async () => Number(await page.getByRole('slider').inputValue())).toBeGreaterThan(5);
  await page.getByRole('button', { name: '暂停变祖' }).click();
  const value = await page.getByRole('slider').inputValue();
  await expect(page.getByRole('button', { name: '自动变祖' })).toBeVisible();
  await expect(page.getByRole('slider')).toHaveValue(value);
  await page.getByRole('button', { name: '自动变祖' }).click();
  await page.getByRole('radio', { name: '重置', exact: true }).click();
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
