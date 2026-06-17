# Eshenbaugh Land Company — Video Proposal Dashboard

A two-part system for delivering custom video proposals to potential listing clients.

- **Backend (brokers):** `/admin` — build proposals, pick or upload videos, set a password, generate a private invite link.
- **Frontend (clients):** the proposal viewer — a client opens their link, enters the password, and watches a custom dashboard. They **never** see the backend.

Everything is static (plain HTML/JS), so it drops straight into your existing **terra.dirtdog.com** site and hosts free on GitHub Pages. No server or database required.

---

## How it works

Each proposal is encoded **inside the link itself** (after the `#`). When a broker clicks *Generate Client Link*, the client's name, property, welcome message, chosen videos, and password are packed into the URL. The client viewer reads that data, shows the password gate, then renders their dashboard. Because the data rides in the link, it works on any device with no client login to your backend.

The company **intro video plays first on every proposal** (set once in `config.js` or the Video Library tab). After the intro, the client sees an interactive list of segments on the left and can watch in any order and skip around.

---

## Files

| File | What it is |
|------|------------|
| `index.html` | Client-facing proposal cover + viewer |
| `admin/index.html` | Broker backend (Properties dashboard + proposal builder) |
| `config.js` | Company-wide settings: branding/colors, backend password, intro video, shared video library |
| `shared.js` | Shared helper code (don't edit) |
| `assets/logo-light.png` | White "reverse" logo for the dark cover/screens |
| `assets/logo-dark.png` | Original logo for light backgrounds |

---

## Adding it to terra.dirtdog.com

Put these files in a subfolder of your existing site repo, e.g. `proposals/`:

```
terra.dirtdog.com repo
└─ proposals/
   ├─ index.html       → client viewer  (terra.dirtdog.com/proposals/)
   ├─ admin/index.html → backend        (terra.dirtdog.com/proposals/admin/)
   ├─ config.js
   └─ shared.js
```

Commit and push. That's it — the backend lives at **terra.dirtdog.com/proposals/admin/** and client links look like **terra.dirtdog.com/proposals/#p=...**

The viewer URL is detected automatically. If your links ever point to the wrong place, set the correct base under **Settings → Client Viewer URL** in the backend.

> If you're standing up a brand-new GitHub Pages repo instead: enable Pages under *Settings → Pages*, set your custom domain to `terra.dirtdog.com`, and add the matching DNS record with your domain provider.

---

## First-time setup (do this before going live)

Open `config.js` and change:

1. **`adminPassword`** — the password your brokers use to open the backend. **Change it from the default.**
2. **`introVideo.url`** — your real company intro video (YouTube, Vimeo, or a direct `.mp4` link).
3. **`presets`** — the starter video library. Replace the placeholder URLs with your real marketing/pricing/track-record videos, or manage them later in the **Video Library** tab.
4. **`brand`** — company name, colors, and an optional `logoUrl`.

---

## Daily use (advisors)

1. Go to **terra.dirtdog.com/proposals/admin/** and sign in.
2. On the **Properties** dashboard you'll see all active proposals. Click **+ Add Property** (or **Edit** on an existing one).
3. **Cover page:** enter the **Project name**, **Acreage**, an optional **Cover description**, who it's **Prepared for**, and paste a **Property cover photo** image URL (you'll see a live preview). Set a client password (or click *Suggest password*).
4. **Videos & order:** click preset chips from your library or paste a new video URL, then use the **▲▼ arrows** to set the order clients watch. The company intro always plays first automatically.
5. Click **Generate Client Link** (this also saves the property), then **Copy**, **Email invite**, or **Text invite**. The password to give the client is shown right there.
6. Back on the dashboard, each property has **Get link**, **Edit**, and **Archive**. Toggle **Show archived** to restore or permanently delete old ones.

### The client's first impression
When a client opens their link they see a full-screen cover: the property photo as the background, the **project name** and **acreage** over it, your cover description, a warm note of appreciation, and a password box — all in Eshenbaugh brand colors with the logo. After entering the password, the intro video plays and an interactive list lets them watch every segment in any order.

### Property cover photo
The cover photo is referenced by **image URL** (e.g. a listing photo already hosted online), which keeps the invite link lightweight. Paste any public image link; the builder shows a live preview before you generate.

### Supported video sources
YouTube, Vimeo (including unlisted/private-with-link), and direct `.mp4`/`.webm`/`.mov` links. For best streaming and no size limits, host videos on Vimeo or YouTube and paste the link.

---

## Managing the shared video library

The **Video Library** tab lets brokers add preset videos and change the intro on their own device.

To make videos available to **every broker** company-wide, add them to the `presets` array in `config.js` and commit the file. (Use **Settings → Export library** to download your additions as JSON to paste in.) Videos marked `SHARED` come from `config.js`; videos a broker adds locally live only in that broker's browser.

---

## A note on the password

This is a **static site**, so the password protects against casual access — it gates the proposal and is not stored in plain text in the link, which is the right level of protection for a sales proposal. It is not bank-grade security. Don't put anything truly confidential in a proposal, and use a different password per client (the *Suggest password* button makes this easy).

---

## Customizing further

- **Colors/logo:** `config.js → brand`.
- **Intro for everyone:** `config.js → introVideo`.
- **Wording on the client page:** edit the text in `index.html`.

Questions about the build are documented inline in each file's comments.

