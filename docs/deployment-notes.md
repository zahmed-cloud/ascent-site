# Ascent — Launch Playbook

Everything you need to get getascent.co live. Follow in order. Total time end-to-end: about 45 minutes.

---

## Before you start, you need

- The `ascent-site` folder (the one you downloaded)
- An Anthropic API key — get one at https://console.anthropic.com/ → API Keys → Create
- A free Cloudflare account — https://dash.cloudflare.com/sign-up
- Your domain `getascent.co` (you already have this)

---

## STAGE 1 — Test it locally first (10 mins)

Before deploying anywhere, confirm it works on your own machine.

### 1.1 — Open the site locally
1. Move the whole `ascent-site` folder to your Desktop
2. Open `ascent-site/index.html` in Chrome
3. Click around — every link should work, the Fit Check should run, the nav should feel right
4. Note anything broken before you deploy

### 1.2 — Test Ascent Lab with your API key (local only, never deploy this)
1. Open `tools.html` in a text editor (VS Code, Sublime, TextEdit — anything)
2. Find the line around ~line 690: `const ANTHROPIC_API_KEY = 'REPLACE_WITH_YOUR_KEY';`
3. Paste your Anthropic key between the quotes
4. Save
5. Open `tools.html` in Chrome
6. Try a teardown with a real cold email — should return results in ~15 seconds
7. **Change the key back to `'REPLACE_WITH_YOUR_KEY'` before Stage 2.** You do not want your key in the deployed file.

---

## STAGE 2 — Set up the Cloudflare Worker (10 mins)

The Worker is a tiny piece of code that holds your API key server-side. Browser → Worker → Anthropic. Your key never appears in browser source. This is the standard way to do this.

### 2.1 — Create the Worker
1. Log into https://dash.cloudflare.com/
2. Left sidebar → **Workers & Pages**
3. Click **Create** → **Create Worker**
4. Name it: `ascent-lab-proxy`
5. Click **Deploy** (it creates a hello-world worker)
6. Click **Edit code**
7. Delete everything in the editor
8. Paste this entire block:

```javascript
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const allowed = [
      'https://getascent.co',
      'https://www.getascent.co',
    ];

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    if (!allowed.includes(origin)) {
      return new Response('Unauthorized origin', { status: 403 });
    }

    try {
      const body = await request.json();
      if (JSON.stringify(body).length > 10000) {
        return new Response('Request too large', { status: 413 });
      }
      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });
      const data = await claudeResponse.text();
      return new Response(data, {
        status: claudeResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
        }
      });
    }
  }
};
```

9. Click **Save and deploy** (top right)
10. Click **← Back to overview** (top left)
11. **Copy your Worker URL.** It looks like `https://ascent-lab-proxy.YOUR-SUBDOMAIN.workers.dev`
12. Save that URL somewhere — you need it in Stage 3

### 2.2 — Add your API key as a secret
1. Still in the `ascent-lab-proxy` Worker
2. Click the **Settings** tab
3. Click **Variables and Secrets**
4. Click **Add variable** → Type: **Secret**
5. Variable name: `ANTHROPIC_API_KEY` (exact spelling, case-sensitive)
6. Value: paste your Anthropic API key
7. Click **Deploy**

That's Stage 2 done.

---

## STAGE 3 — Wire tools.html to use the Worker (5 mins)

1. Open `tools.html` in your text editor
2. Find around line 690, this block:

```javascript
const ANTHROPIC_API_KEY = 'REPLACE_WITH_YOUR_KEY';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude({ model, system, userPrompt, maxTokens = 1200 }) {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
```

3. Replace it with this (paste your real Worker URL from Stage 2.1 step 11):

```javascript
const API_PROXY_URL = 'https://ascent-lab-proxy.YOUR-SUBDOMAIN.workers.dev';

async function callClaude({ model, system, userPrompt, maxTokens = 1200 }) {
  const res = await fetch(API_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
```

4. Save.

---

## STAGE 4 — Deploy the site (10 mins)

Use **Cloudflare Pages** — everything stays in one dashboard with the Worker.

### 4.1 — Create the Pages project
1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** tab
2. Click **Upload assets**
3. Project name: `ascent-site`
4. Drag the entire `ascent-site` folder onto the upload area
5. Click **Deploy site**
6. Wait ~30 seconds
7. Cloudflare gives you a URL: `ascent-site.pages.dev`
8. Click it, test every page — if it looks right, move on

### 4.2 — Point getascent.co at the deployment
1. In the Pages project → **Custom domains** tab
2. Click **Set up a custom domain**
3. Enter: `getascent.co`
4. Follow the DNS instructions Cloudflare gives you
5. If your domain is already on Cloudflare: auto-configured in 2 minutes
6. If it's on a different registrar: add the CNAME record they show you in your registrar's DNS panel. Propagation: 10 mins to a few hours.
7. Repeat for `www.getascent.co`

---

## STAGE 5 — Final checks before you share the URL (5 mins)

Open https://getascent.co in Chrome **Incognito mode** (important — bypasses any local cache).

Check these, in order:
- [ ] Homepage loads. Hero is framed cleanly (status bars top + bottom). Headline reads "Outbound, owned." with the comma and period in accent coral.
- [ ] Nav links all work: Check fit, Ascent Lab, Thinking, Work, Book a call
- [ ] Essay pages load fully styled: click `/thinking/structural-misalignment.html`
- [ ] Work case pages load fully styled: click `/work/salescoachpro.html`
- [ ] Fit check: take it end-to-end, see a result with scores
- [ ] Ascent Lab — run ONE teardown with a real cold email. Results should appear in ~15 seconds.
- [ ] Run a SECOND teardown → email gate modal should appear
- [ ] Enter an email in the modal → modal closes, second teardown runs
- [ ] Check `jamil@getascent.co` — should have the email notification already
- [ ] Pull it up on your phone. Mobile everything should look clean.

If all checks pass — **you're live.** Close laptop, make tea, wait for the first sign-up.

---

## AFTER LAUNCH — what to do first

**Day 1:**
- Post one LinkedIn update. Your voice, short. Link to the site.
- DM the 6 clients from your proof strip — let them know the site's up, ask if they'd be OK being mentioned

**Week 1:**
- Submit `sitemap.xml` to Google Search Console (create a sitemap, or just submit `/robots.txt` for now)
- Add privacy-friendly analytics: Plausible ($9/mo) or Fathom ($14/mo). Don't use GA4 — it'll erode the premium feel for the kind of buyer you want
- Reply personally to every tool email capture. One sentence back. That's your best-fit lead filter.

**Week 2-4:**
- Watch what people paste into the Lab. That's free market research on what outbound problems look like in the wild.
- Iterate copy based on what you learn. Small changes to the hero sub-headline can move conversion 20%+

---

## MONEY — what this actually costs

| Line item | Monthly cost |
|---|---|
| Cloudflare Pages (hosting) | $0 |
| Cloudflare Workers | $0 (free tier: 100k requests/day) |
| Anthropic API (realistic usage: 50-200 teardowns + 100-500 grades) | $3-$15 |
| Domain (you already pay this) | ~$1 |
| **Total realistic monthly** | **Under $20** |

At 500+ tool runs/day, you'd be looking at ~$60-80/mo — still cheap. If it gets that popular, you're winning.

---

## IF SOMETHING BREAKS

**Tools return "Unauthorized origin":**
- Your domain isn't in the Worker's `allowed` array. Edit the Worker script, add your domain (exactly as in the browser URL), redeploy.

**Tools return 500 errors:**
- API key secret isn't set. Worker → Settings → Variables and Secrets → check `ANTHROPIC_API_KEY` exists.

**Homepage hero looks broken in Chrome but fine in Safari:**
- Chrome cached old CSS. Cmd+Shift+R to hard refresh. Or test in Incognito.

**Contact form doesn't send anything:**
- Uses `mailto:` which needs a default mail client. Most users have one. If you need 100% reliability, swap the form action for a Formspree endpoint — free for first 50 submissions/month.

**Ascent Lab shows "Daily limit reached" and you haven't run anything:**
- LocalStorage has usage from testing. Open DevTools → Application → Local Storage → clear the `ascent_tool_*` keys.

---

Ship it. Reply to every email. The site does 80% of the work — you do the last 20% that matters.
