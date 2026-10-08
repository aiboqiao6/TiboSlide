import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { decodeImageResponse, validateSize } from '../scripts/imagegen-compat.mjs';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');

test('accepts supported square sizes for portrait sequences', () => {
  assert.equal(validateSize(undefined), '1024x1024');
  assert.equal(validateSize('2048x2048'), '2048x2048');
  assert.equal(validateSize('1024x1024'), '1024x1024');
});

for (const size of ['0x0', '2049x2048', '4096x4096', '256x256', '512x2048', 'auto', 'oops']) {
  test(`rejects unsupported size ${size}`, () => {
    assert.throws(() => validateSize(size), /size/i);
  });
}

test('accepts base64 image responses without fetching', async () => {
  const result = await decodeImageResponse({ data: [{ b64_json: png.toString('base64') }] }, () => {
    throw new Error('Unexpected network request');
  });
  assert.deepEqual(result, png);
});

test('downloads URL responses without forwarding API credentials', async () => {
  const result = await decodeImageResponse({ data: [{ b64_json: null, url: 'https://cdn.example.com/image.png' }] },
    async (url, options) => {
      assert.equal(url, 'https://cdn.example.com/image.png');
      assert.equal(options.headers, undefined);
      assert.equal(options.redirect, 'error');
      return new Response(png, { headers: { 'Content-Type': 'image/png' } });
    });
  assert.deepEqual(result, png);
});

for (const payload of [null, {}, { data: [] }, { data: [null] }, { data: [{}] },
  { data: { 0: { b64_json: png.toString('base64') } } }, { data: [{ b64_json: 'not base64!' }] }]) {
  test(`rejects malformed payload ${JSON.stringify(payload)}`, async () => {
    await assert.rejects(() => decodeImageResponse(payload), /image|response|base64/i);
  });
}

for (const url of ['http://cdn.example.com/image.png', 'file:///etc/passwd', 'https://user:password@cdn.example.com/image.png', 'https://127.0.0.1/image.png', 'https://localhost/image.png']) {
  test(`rejects unsafe download URL ${url}`, async () => {
    await assert.rejects(() => decodeImageResponse({ data: [{ url }] }), /URL/i);
  });
}

test('rejects download failures with the HTTP status', async () => {
  await assert.rejects(() => decodeImageResponse({ data: [{ url: 'https://cdn.example.com/image.png' }] },
    async () => new Response('Not found', { status: 404 })), /404/);
});

test('rejects HTML returned in place of an image', async () => {
  await assert.rejects(() => decodeImageResponse({ data: [{ url: 'https://cdn.example.com/image.png' }] },
    async () => new Response('<html>error</html>', { headers: { 'Content-Type': 'text/html' } })), /image/i);
});

test('rejects downloads exceeding the size limit before reading them', async () => {
  await assert.rejects(() => decodeImageResponse({ data: [{ url: 'https://cdn.example.com/image.png' }] },
    async () => new Response(png, { headers: { 'Content-Length': '60000000' } })), /size/i);
});

test('rejects non-image base64 data', async () => {
  await assert.rejects(() => decodeImageResponse({ data: [{ b64_json: Buffer.from('not an image').toString('base64') }] }), /image/i);
});

test('refuses to regenerate when a response was already cached', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tibo-image-test-'));
  try {
    const out = join(directory, 'portrait.png');
    await writeFile(`${out}.response.local`, '{}');
    const result = spawnSync(process.execPath, ['scripts/imagegen-compat.mjs', '--out', out], {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, OPENAI_API_KEY: '' },
      encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /cached response|response cache/i);
    assert.match(result.stderr, /--resume-response/);
  } finally {
    await rm(directory, { recursive: true });
  }
});
