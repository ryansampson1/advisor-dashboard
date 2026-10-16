/* ============================================================================
   THE DIRT DOG — VIDEO PROPOSAL DASHBOARD
   Shared configuration. Edit this file to control company-wide defaults.
   Both the broker backend (/admin) and the client viewer (index.html) read it.
   ============================================================================ */

window.DIRTDOG_CONFIG = {

  /* ---- Branding -------------------------------------------------------- */
  brand: {
    company: "Eshenbaugh Land Company",
    tagline: "The Dirt Dog · Florida Land Brokers",
    // White logo (looks great on the dark proposal screens). Path is relative to
    // the site root; each page resolves it automatically.
    logoUrl: "assets/logo-light.png",
    // Official brand colors (from the ELC brand guide). Hex values.
    primary: "#00b2a9",   // PANTONE 326 C — teal (secondary accent)
    accent:  "#da291c",   // PANTONE 485 C — brand red (primary CTA/highlights)
    dark:    "#121417",   // near-black charcoal background
    light:   "#f4f6f8"    // cool off-white
  },

  /* ---- Company contact (shown in the client cover footer) ------------- */
  contact: {
    phone:      "(813) 287.8787",
    address:    "304 S. Willow Avenue, Tampa, Florida 33606",
    website:    "www.DirtDog.com",
    websiteUrl: "https://www.thedirtdog.com"
  },

  /* ---- EmailJS (OTP delivery for the client-facing proposal gate) ------- */
  // Used to send the 6-digit verification code to the viewer's email address.
  // 1. Go to https://www.emailjs.com → Account → API Keys → copy your Public Key
  // 2. Create an Email Service and paste its Service ID
  // 3. Create a template with variables: {{to_email}}, {{otp}}, {{proposal_name}}, {{advisor_name}}
  //    Set "To Email" field to {{to_email}} in the template's Recipients section.
  //    Copy the Template ID here as otpTemplateId.
  emailjs: {
    publicKey:     "YOUR_EMAILJS_PUBLIC_KEY",
    serviceId:     "YOUR_EMAILJS_SERVICE_ID",
    otpTemplateId: "YOUR_OTP_TEMPLATE_ID"
  },

  /* ---- Broker backend login ------------------------------------------- */
  // No separate broker password: the builder runs inside the terra dashboard,
  // which already requires sign-in. The only password is the per-proposal one
  // the broker sets for the client (configured per property in the builder).

  /* ---- Company intro video -------------------------------------------- */
  // Plays first on EVERY client proposal. Same for everyone.
  // Supports YouTube, Vimeo, or a direct .mp4 link.
  introVideo: {
    title: "Welcome to The Dirt Dog",
    // Replace with your real intro video URL:
    url: "https://www.youtube.com/watch?v=ScMzIvxBSi4"
  },

  /* ---- Proposal types -------------------------------------------------- */
  // Drive the auto-pull / suggested-video logic in the builder. Each library
  // video can be tagged with the types it applies to (a "suggestion" for that
  // type) and, optionally, the types it should be AUTO-included on. When an
  // advisor picks a type while building a proposal, every video marked
  // auto-include for that type is pulled in automatically; the rest tagged for
  // that type are offered as one-click suggestions. `id` must be unique;
  // `default` marks the type pre-selected on a new proposal.
  proposalTypes: [
    { id: "seller",  label: "Traditional Marketing",  default: true },
    { id: "buyer",   label: "Call for Offers" },
    { id: "land",    label: "About ELC General" },
    { id: "general", label: "Buyer Representation" }
  ],

  /* ---- Starter sets (ordered "Load starter set" templates) ------------- */
  // When an advisor picks a proposal type (or clicks "↻ Load starter set"),
  // the builder fills the video list with these titles IN THIS ORDER. Each
  // title is matched (case-insensitive) against the Video Library; if a video
  // with that title exists, its link is used. Two special tokens resolve to the
  // selected advisors' bio videos:
  //   "@advisorBio"   → the proposal owner's bio video (e.g. "Bio Sampson")
  //   "@coAdvisorBio" → one bio video per co-advisor on the deal (none if no co-advisors)
  // The company Intro Video always plays first automatically, so it's NOT listed
  // here. Advisors can still reorder, add, or remove anything afterward.
  // Only the first two types have starter sets for now; add "land"/"general" later.
  starterSets: {
    seller: [
      "@advisorBio", "@coAdvisorBio",
      "Why Land is Different", "Whats My Land Worth", "Whos the buyer",
      "Our marketing machine", "AI Edge", "Down to Earth", "The Roadmap",
      "Success Stories", "Monthly Report", "Success Fee 6%",
      "Getting to closing", "What other owners say", "We are ready"
    ],
    buyer: [
      "@advisorBio", "@coAdvisorBio",
      "Why Land is Different- 5 Es", "Whats My Land Worth", "Whos the buyer",
      "Our marketing machine", "AI Edge", "Down to Earth", "Call for Offers",
      "Success Stories", "Monthly Report", "Success Fee 3%",
      "Getting to closing", "What other owners say", "We are ready"
    ]
  },

  /* ---- Shared preset video library (title catalog) --------------------- */
  // These are the real video TITLES used by the starter sets above. Each shows
  // up in the Video Library immediately (so the catalog is complete before any
  // files are uploaded) and is matched by title when a starter set loads. The
  // urls are intentionally blank: in the dashboard's 📚 Video Library, an admin
  // clicks "Set up starter library" once to copy these into the editable
  // library, then uploads the actual video file to each one. `types` controls
  // which proposal types list a video under "Suggested for this type"; ordering
  // is handled by `starterSets`, so autoTypes stays empty here.
  // The live, editable copies live in the `videoLibrary` Firestore collection.
  presets: [
    /* — Traditional Marketing + Call for Offers segment videos — */
    { id: "why-land-different",     title: "Why Land is Different",       url: "", types: ["seller"],          autoTypes: [] },
    { id: "why-land-different-5es", title: "Why Land is Different- 5 Es", url: "", types: ["buyer"],           autoTypes: [] },
    { id: "whats-my-land-worth",    title: "Whats My Land Worth",         url: "", types: ["seller","buyer"], autoTypes: [] },
    { id: "whos-the-buyer",         title: "Whos the buyer",              url: "", types: ["seller","buyer"], autoTypes: [] },
    { id: "our-marketing-machine",  title: "Our marketing machine",       url: "", types: ["seller","buyer"], autoTypes: [] },
    { id: "ai-edge",                title: "AI Edge",                     url: "", types: ["seller","buyer"], autoTypes: [] },
    { id: "down-to-earth",          title: "Down to Earth",               url: "", types: ["seller","buyer"], autoTypes: [] },
    { id: "the-roadmap",            title: "The Roadmap",                 url: "", types: ["seller"],          autoTypes: [] },
    { id: "call-for-offers",        title: "Call for Offers",             url: "", types: ["buyer"],           autoTypes: [] },
    { id: "success-stories",        title: "Success Stories",             url: "", types: ["seller","buyer"], autoTypes: [] },
    { id: "monthly-report",         title: "Monthly Report",              url: "", types: ["seller","buyer"], autoTypes: [] },
    { id: "success-fee-6",          title: "Success Fee 6%",              url: "", types: ["seller"],          autoTypes: [] },
    { id: "success-fee-3",          title: "Success Fee 3%",              url: "", types: ["buyer"],           autoTypes: [] },
    { id: "getting-to-closing",     title: "Getting to closing",          url: "", types: ["seller","buyer"], autoTypes: [] },
    { id: "what-other-owners-say",  title: "What other owners say",       url: "", types: ["seller","buyer"], autoTypes: [] },
    { id: "we-are-ready",           title: "We are ready",                url: "", types: ["seller","buyer"], autoTypes: [] },

    /* — Other library videos (available, not tied to a proposal type) — */
    { id: "success-fee-4-6",  title: "Success Fee 4%/6%",      url: "", types: [], autoTypes: [] },
    { id: "tougher-than-dirt", title: "Tougher Than Dirt",     url: "", types: [], autoTypes: [] },
    { id: "behind-the-name",  title: "Behind the Name",        url: "", types: [], autoTypes: [] },
    { id: "30th-anniversary", title: "30th Anniversary Video", url: "", types: [], autoTypes: [] },

    /* — Advisor bio videos (auto-pulled into the Advisor/Co-advisor Bio slots) — */
    { id: "bio-sampson",     title: "Bio Sampson",     url: "", types: [], autoTypes: [] },
    { id: "bio-matt",        title: "Bio Matt",        url: "", types: [], autoTypes: [] },
    { id: "bio-eshenbaugh",  title: "Bio Eshenbaugh",  url: "", types: [], autoTypes: [] },
    { id: "bio-colliers",    title: "Bio Colliers",    url: "", types: [], autoTypes: [] },
    { id: "bio-bowers",      title: "Bio Bowers",      url: "", types: [], autoTypes: [] },
    { id: "bio-ward",        title: "Bio Ward",        url: "", types: [], autoTypes: [] },
    { id: "bio-streitmatter", title: "Bio Streitmatter", url: "", types: [], autoTypes: [] },
    { id: "bio-tyler",       title: "Bio Tyler",       url: "", types: [], autoTypes: [] },
    { id: "bio-strahan",     title: "Bio Strahan",     url: "", types: [], autoTypes: [] },
    { id: "bio-jack",        title: "Bio Jack",        url: "", types: [], autoTypes: [] },
    { id: "bio-richie",      title: "Bio Richie",      url: "", types: [], autoTypes: [] },
    { id: "bio-austin",      title: "Bio Austin",      url: "", types: [], autoTypes: [] },
    { id: "bio-baxter",      title: "Bio Baxter",      url: "", types: [], autoTypes: [] },
    { id: "bio-andrew",      title: "Bio Andrew",      url: "", types: [], autoTypes: [] }
  ],

  /* ---- Property Valuation video (flyover + AI voiceover) --------------- */
  // Powers the "Property Valuation" card in the proposal builder. The advisor
  // types a short valuation narration and clicks a spot on the map; the builder
  // renders a cinematic flyover of that location, speaks the narration with a
  // deep "cowboy" voice, records it to an iPhone-friendly H.264 MP4, uploads it
  // to Firebase Storage and attaches it to the proposal as the Property
  // Valuation video.
  valuation: {
    // Google Maps API key (a normal browser key, referrer-restricted to
    // terra.dirtdog.com). Enable "Maps Static API" on the same Cloud project.
    // Used to fetch the high-res satellite imagery the flyover is built from.
    // Leave blank until you've created the key — the card explains what to add.
    mapsApiKey: "",

    // Text-to-Speech proxy. Deploy /tts-proxy as a Cloudflare Worker (see
    // tts-proxy/README) and paste its URL here. The worker keeps the Google
    // Cloud Text-to-Speech key server-side (the org policy forbids referrer
    // restrictions on those keys, so it can't live in the page).
    ttsProxyUrl: "https://elc-tts-proxy.dirtdog.workers.dev",

    // Voice tuning — defaults chosen for a deep, rugged "cowboy narrator" feel.
    // voice    : any Google Cloud TTS voice name. Deep male picks:
    //            en-US-Polyglot-1 (deep), en-US-Neural2-D, en-US-Standard-D/J.
    // pitch    : semitones, -20..20 (lower = deeper). rate: 0.25..2 (slower = drawl).
    voice: "en-US-Polyglot-1",
    pitch: -4.0,
    rate: 0.88,

    // Flyover render defaults.
    defaultStyle: "satellite",   // "satellite" (flat pan/zoom) or "3d" (tilted aerial orbit)
    minSeconds: 45,              // target valuation length window shown in the UI
    maxSeconds: 90,
    fps: 30,
    width: 1280,
    height: 720
  }
};

