# Script to Speech

Upload or paste a script, pick a voice, and get an MP3. Uses the free [Fish Audio S2.1 Pro](https://openrouter.ai/fish-audio/s2.1-pro-free:free) text-to-speech model through OpenRouter.

## Run

Needs Node.js 22 or newer. Nothing to install.

1. Copy `.env.example` to `.env` and set `OPENROUTER_API_KEY` to a key from [openrouter.ai/keys](https://openrouter.ai/keys).
2. Run `node server.js`.
3. Open http://localhost:3000.

## Use

- Upload a `.txt` or `.md` script, or paste text. Inline tags like `[whispering]` or `[excited]` change the delivery.
- Pick the model default or one of 11 preset voices. To clone a voice, open "Or clone a voice from your own sample" and upload a 10–30 s clip. A transcript of the clip is optional and improves accuracy.
- Play the result in the page or download it as an MP3.

## OpenRouter conditions

- You need an OpenRouter account and API key. This model is free, so requests cost no credits.
- Use is subject to OpenRouter's [Terms of Service](https://openrouter.ai/terms) and [Privacy Policy](https://openrouter.ai/privacy), and to the model provider Fish Audio's [Terms](https://fish.audio/terms) and [Privacy Policy](https://fish.audio/privacy).
- Free (`:free`) models allow 20 requests per minute and 50 requests per day, or 1,000 per day once you have bought at least 10 credits. Each click on Generate is one request.
- A negative credit balance can cause 402 errors, even on free models.
- The free variant has no latency or availability guarantee, so long scripts can be slow.
- Your script and any voice sample are sent to OpenRouter and Fish Audio. Only clone voices you have permission to use.

The server only listens on your own computer (127.0.0.1), because every request uses your API key.
