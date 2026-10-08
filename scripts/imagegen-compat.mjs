import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, basename, resolve } from 'node:path';
import { isIP } from 'node:net';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const MAX_BYTES = 50 * 1024 * 1024;

export function validateSize(input = '1024x1024') {
  const match = /^(\d+)x(\d+)$/.exec(input);
  if (!match) throw new Error('Invalid image size');
  const [width, height] = match.slice(1).map(Number);
  if (width % 16 || height % 16 || Math.max(width, height) > 3840
    || Math.min(width, height) <= 0 || Math.max(width, height) / Math.min(width, height) > 3
    || width * height < 655360 || width * height > 8294400) {
    throw new Error('Unsupported image size');
  }
  return input;
}

function verifyImage(bytes) {
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!png && !jpeg && !webp) throw new Error('Response does not contain a supported image');
  if (bytes.length > MAX_BYTES) throw new Error('Image exceeds the size limit');
  return bytes;
}

function downloadUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Invalid image download URL');
  }
  if (url.protocol !== 'https:' || url.username || url.password || isIP(url.hostname)
    || /(^|\.)localhost$|\.(local|internal)$/.test(url.hostname)) {
    throw new Error('Unsafe image download URL');
  }
  return url.href;
}

/** Accept standard base64 output or a provider's signed HTTPS image link. */
export async function decodeImageResponse(payload, fetchImage = fetch) {
  if (!Array.isArray(payload?.data)) throw new Error('Image response data must be an array');
  const image = payload?.data?.[0];
  if (!image || typeof image !== 'object') throw new Error('Image response is missing data');
  if (typeof image.b64_json === 'string' && image.b64_json.length > 0) {
    if (image.b64_json.length > MAX_BYTES * 4 / 3 + 4) throw new Error('Image exceeds the size limit');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(image.b64_json) || image.b64_json.length % 4 !== 0) {
      throw new Error('Invalid base64 image response');
    }
    return verifyImage(Buffer.from(image.b64_json, 'base64'));
  }
  if (typeof image.url !== 'string') throw new Error('Image response has neither base64 data nor an image URL');
  // Signed URLs carry their own authorization; never forward the API key.
  const response = await fetchImage(downloadUrl(image.url), {
    redirect: 'error',
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Image download HTTP ${response.status}`);
  if (Number(response.headers.get('Content-Length')) > MAX_BYTES) {
    await response.body?.cancel();
    throw new Error('Image download exceeds the size limit');
  }
  const mime = response.headers.get('Content-Type')?.split(';')[0];
  if (mime && !mime.startsWith('image/') && mime !== 'application/octet-stream') {
    await response.body?.cancel();
    throw new Error('Download response is not an image');
  }
  if (!response.body) throw new Error('Empty image download response');
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > MAX_BYTES) throw new Error('Image download exceeds the size limit');
    chunks.push(chunk);
  }
  return verifyImage(Buffer.concat(chunks));
}

async function generate(values) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error('OPENAI_API_KEY is required');
  const endpoint = new URL(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1');
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) {
    throw new Error('OPENAI_BASE_URL must use HTTPS without embedded credentials');
  }
  if (!values.image?.length || !values['prompt-file']) throw new Error('--image and --prompt-file are required');
  const prompt = (await readFile(values['prompt-file'], 'utf8')).trim();
  if (!prompt) throw new Error('Image prompt must not be empty');
  const size = validateSize(values.size);
  const form = new FormData();
  for (const [name, value] of Object.entries({
    model: 'gpt-image-2', prompt, n: '1', size, quality: 'high', output_format: 'png',
  })) form.append(name, value);
  for (const path of values.image) {
    const bytes = verifyImage(await readFile(path));
    const type = bytes[0] === 137 ? 'image/png' : bytes[0] === 255 ? 'image/jpeg' : 'image/webp';
    form.append(values.image.length === 1 ? 'image' : 'image[]', new Blob([bytes], { type }), basename(path));
  }
  endpoint.pathname = `${endpoint.pathname.replace(/\/$/, '')}/images/edits`;
  console.log(JSON.stringify({ event: 'generation_started', model: 'gpt-image-2', size, images: values.image.length }));
  // No automatic generation retries: a lost response could already be billable.
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(300000),
  });
  if (!response.ok) throw new Error(`Image API HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const { values } = parseArgs({
    options: {
      image: { type: 'string', multiple: true },
      'prompt-file': { type: 'string' },
      out: { type: 'string' },
      size: { type: 'string' },
      'resume-response': { type: 'string' },
    },
  });
  if (!values.out) throw new Error('--out is required');
  try {
    await access(values.out);
    throw new Error('Output already exists; choose a new filename');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (!values['resume-response']) {
    try {
      await access(`${values.out}.response.local`);
      throw new Error('Cached response exists; use --resume-response instead of regenerating');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  await mkdir(dirname(values.out), { recursive: true });
  const payload = values['resume-response']
    ? JSON.parse(await readFile(values['resume-response'], 'utf8'))
    : await generate(values);
  if (!values['resume-response']) {
    // Preserve the response locally so download retries do not regenerate images.
    await writeFile(`${values.out}.response.local`, JSON.stringify(payload), { mode: 0o600, flag: 'wx' });
  }
  const bytes = await decodeImageResponse(payload);
  await writeFile(values.out, bytes, { flag: 'wx' });
  console.log(JSON.stringify({ event: 'image_saved', path: values.out, bytes: bytes.length }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(JSON.stringify({ event: 'image_generation_failed', error: error.message }));
    process.exitCode = 1;
  });
}
