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
    { id: "seller",  label: "Seller / Listing",      default: true },
    { id: "buyer",   label: "Buyer" },
    { id: "land",    label: "Land / Development" },
    { id: "general", label: "General" }
  ],

  /* ---- Shared preset video library (legacy / fallback) ----------------- */
  // The live library now lives in the `videoLibrary` Firestore collection and
  // is managed inside the dashboard (🎬 Video Proposals → 📚 Video Library):
  // any member can add/upload, edit titles, and tag videos by proposal type;
  // admins can delete. These config presets remain as a built-in fallback that
  // every advisor sees even before the Firestore library is populated. They're
  // tagged as Seller suggestions but NOT auto-included (the URLs below are
  // placeholders — replace them, or add the real videos in the library and
  // check "auto-include for Seller" to make them pull in automatically).
  // id must be unique. Supports YouTube, Vimeo, or direct .mp4 links.
  presets: [
    {
      id: "marketing-plan",
      title: "Our Marketing Plan",
      description: "How we put your property in front of the right buyers.",
      url: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
      types: ["seller"], autoTypes: []
    },
    {
      id: "pricing-strategy",
      title: "Pricing Strategy",
      description: "How we price to sell for the most, in the least time.",
      url: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
      types: ["seller"], autoTypes: []
    },
    {
      id: "track-record",
      title: "Our Track Record",
      description: "Recent sales and happy clients in your area.",
      url: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
      types: ["seller", "buyer"], autoTypes: []
    },
    {
      id: "photography",
      title: "Professional Photography & Video",
      description: "The production quality that makes listings stand out.",
      url: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
      types: ["seller"], autoTypes: []
    },
    {
      id: "next-steps",
      title: "Next Steps",
      description: "What happens after you choose to work with us.",
      url: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
      types: ["seller", "buyer", "land", "general"], autoTypes: []
    }
  ]
};

