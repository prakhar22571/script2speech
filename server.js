const http = require('node:http');
const fs = require('node:fs');
const { json } = require('node:stream/consumers');

try { process.loadEnvFile(__dirname + '/.env'); } catch {}

async function speak({ text, voice, sample, transcript }) {
  const body = { model: 'fish-audio/s2.1-pro-free:free', input: text, response_format: 'mp3' };
  if (sample) {
    body.input_references = [{ type: 'input_audio', input_audio: { data: sample } }];
    if (transcript) body.input_references.push({ type: 'text', text: transcript });
  } else if (voice) body.voice = voice;

  const res = await fetch('https://openrouter.ai/api/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.ok) return Buffer.from(await res.arrayBuffer());
  const err = await res.json().catch(() => ({}));
  throw Object.assign(new Error(err.error?.message || res.statusText), { status: res.status });
}

const send = (res, status, error) => res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error }));

http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/')
    return res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(fs.readFileSync(__dirname + '/index.html'));
  if (req.method !== 'POST' || req.url !== '/api/speak') return send(res, 404, 'Not found');
  try {
    if (!process.env.OPENROUTER_API_KEY) return send(res, 500, 'Set OPENROUTER_API_KEY in .env and restart the server');
    // ponytail: trusts Content-Length, so a chunked upload skips the cap; fine for a localhost-only server
    if (req.headers['content-length'] > 25e6) return send(res, 413, 'Upload too large (max 25 MB)');
    const job = await json(req);
    if (typeof job.text !== 'string' || !job.text.trim()) return send(res, 400, 'Script is empty');
    const audio = await speak(job);
    res.writeHead(200, { 'Content-Type': 'audio/mpeg' }).end(audio);
  } catch (e) {
    send(res, e.status || 500, e.message);
  }
}).listen(3000, '127.0.0.1', () => console.log('script2speech running at http://localhost:3000'));
