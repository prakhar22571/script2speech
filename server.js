const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');

try { process.loadEnvFile(path.join(__dirname, '.env')); } catch {}

const MODEL = 'fish-audio/s2.1-pro-free:free';
const MAX_BODY = 25e6;

// ponytail: limit undocumented for this model; raise/drop once real limit known
function chunk(text, max = 2000) {
  const out = [];
  let cur = '';
  for (const { segment } of new Intl.Segmenter(undefined, { granularity: 'sentence' }).segment(text)) {
    if (cur && cur.length + segment.length > max) { out.push(cur); cur = ''; }
    cur += segment;
  }
  if (cur) out.push(cur);
  return out;
}

async function speak(input, { voice, sample, transcript }) {
  const body = { model: MODEL, input, response_format: 'mp3' };
  if (sample) {
    body.input_references = [{ type: 'input_audio', input_audio: { data: sample } }];
    if (transcript) body.input_references.push({ type: 'text', text: transcript });
  } else if (voice) body.voice = voice;

  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if ((res.status === 429 || res.status === 502) && attempt < 3) { await sleep(2000 * 2 ** attempt); continue; }
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error?.message || res.statusText), { status: res.status });
  }
}

async function readBody(req) {
  const bufs = [];
  let size = 0;
  for await (const b of req) {
    if ((size += b.length) > MAX_BODY) throw Object.assign(new Error('Upload too large (max 25 MB)'), { status: 413 });
    bufs.push(b);
  }
  return Buffer.concat(bufs).toString();
}

const send = (res, status, error) =>
  res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error }));

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
  }
  if (req.method !== 'POST' || req.url !== '/api/speak') return send(res, 404, 'Not found');
  try {
    if (!process.env.OPENROUTER_API_KEY) return send(res, 500, 'Set OPENROUTER_API_KEY in .env and restart the server');
    const { text, voice, sample, transcript } = JSON.parse(await readBody(req));
    if (typeof text !== 'string' || !text.trim()) return send(res, 400, 'Script is empty');
    const parts = [];
    for (const c of chunk(text)) parts.push(await speak(c, { voice, sample, transcript }));
    // ponytail: naive MP3 frame concat; players handle it, duration metadata may be off
    res.writeHead(200, { 'Content-Type': 'audio/mpeg' }).end(Buffer.concat(parts));
  } catch (e) {
    send(res, e.status || 500, e.message);
  }
});

if (process.argv.includes('--selftest')) {
  const assert = require('node:assert');
  assert.deepStrictEqual(chunk('Hello there. Bye.'), ['Hello there. Bye.']);
  const long = 'This is a sentence of moderate length for testing. '.repeat(200) + '\nNew paragraph here.';
  const parts = chunk(long);
  assert(parts.length > 1 && parts.every(p => p.length <= 2000));
  assert.strictEqual(parts.join(''), long);
  console.log('selftest ok');
} else {
  server.listen(3000, '127.0.0.1', () => console.log('script2speech running at http://localhost:3000'));
}
