import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeImageResponse } from '../scripts/imagegen-compat.mjs';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');

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

for (const payload of [null, {}, { data: [] }, { data: [null] }, { data: [{}] }, { data: [{ b64_json: 'not base64!' }] }]) {
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
