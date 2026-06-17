/* ============================================================================
   THE DIRT DOG — shared helpers used by both the backend and the client viewer.
   ============================================================================ */
(function () {
  const DD = {};
  const CFG = window.DIRTDOG_CONFIG || {};

  /* ---- Branding: push config colors into CSS variables ----------------- */
  DD.applyBrand = function () {
    const b = (CFG.brand || {});
    const r = document.documentElement.style;
    if (b.primary) r.setProperty("--dd-primary", b.primary);
    if (b.accent)  r.setProperty("--dd-accent", b.accent);
    if (b.dark)    r.setProperty("--dd-dark", b.dark);
    if (b.light)   r.setProperty("--dd-light", b.light);
  };

  // Pages can set DD.base to resolve relative asset paths (e.g. admin sets "../").
  DD.base = "";
  DD.logoSrc = function () {
    const b = (CFG.brand || {});
    if (!b.logoUrl) return "";
    const isAbs = /^(https?:)?\/\//.test(b.logoUrl) || b.logoUrl.charAt(0) === "/";
    return isAbs ? b.logoUrl : (DD.base + b.logoUrl);
  };
  DD.logoHTML = function (extraClass) {
    const b = (CFG.brand || {});
    if (b.logoUrl) {
      return `<img src="${DD.esc(DD.logoSrc())}" alt="${DD.esc(b.company || "")}" class="${extraClass || ""}" style="max-height:44px;width:auto;display:block">`;
    }
    return `<span class="${extraClass || ""}" style="font-weight:800;letter-spacing:.5px">${DD.esc(b.company || "Eshenbaugh Land Company")}</span>`;
  };

  /* ---- HTML escaping --------------------------------------------------- */
  DD.esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };

  /* ---- Video URL parsing ---------------------------------------------- */
  // Returns {type:'youtube'|'vimeo'|'file'|'unknown', id, url}
  DD.parseVideo = function (url) {
    url = (url || "").trim();
    if (!url) return { type: "unknown", url };

    // YouTube
    let m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    if (m) return { type: "youtube", id: m[1], url };

    // Vimeo
    m = url.match(/vimeo\.com\/(?:video\/|channels\/[^\/]+\/|groups\/[^\/]+\/videos\/)?(\d+)/);
    if (m) return { type: "vimeo", id: m[1], url };
    m = url.match(/player\.vimeo\.com\/video\/(\d+)/);
    if (m) return { type: "vimeo", id: m[1], url };

    // Direct video file
    if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url)) return { type: "file", url };

    // Fallback: try to embed as iframe (covers Loom, Wistia share links, etc.)
    return { type: "iframe", url };
  };

  // Returns an HTML string that embeds the video.
  DD.videoEmbedHTML = function (url, opts) {
    opts = opts || {};
    const v = DD.parseVideo(url);
    const ap = opts.autoplay ? 1 : 0;

    if (v.type === "youtube") {
      const src = `https://www.youtube.com/embed/${v.id}?rel=0&modestbranding=1&autoplay=${ap}${ap ? "&mute=0" : ""}`;
      return iframe(src);
    }
    if (v.type === "vimeo") {
      const src = `https://player.vimeo.com/video/${v.id}?autoplay=${ap}&title=0&byline=0&portrait=0`;
      return iframe(src);
    }
    if (v.type === "file") {
      return `<video src="${DD.esc(v.url)}" controls ${opts.autoplay ? "autoplay" : ""} playsinline
                 style="width:100%;height:100%;object-fit:contain;background:#000"></video>`;
    }
    if (v.type === "iframe") {
      return iframe(DD.esc(url));
    }
    return `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888">
              No video set for this segment.</div>`;

    function iframe(src) {
      return `<iframe src="${src}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture"
                allowfullscreen style="width:100%;height:100%"></iframe>`;
    }
  };

  /* ---- Proposal encode/decode (URL-safe base64 of JSON) ---------------- */
  DD.encodeProposal = function (obj) {
    const json = JSON.stringify(obj);
    // UTF-8 safe base64
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  DD.decodeProposal = function (str) {
    try {
      let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const json = decodeURIComponent(escape(atob(b64)));
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  };

  /* ---- Lightweight password hashing (obfuscation, not crypto) ---------- */
  // Note: a static site cannot keep a password truly secret. This stops casual
  // snooping (the plain password is not stored in the link), which is the right
  // level of protection for a sales proposal gate.
  DD.hash = function (str) {
    let h = 5381;
    str = String(str);
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    // mix a second pass
    let h2 = 52711;
    for (let i = str.length - 1; i >= 0; i--) h2 = ((h2 << 5) + h2 + str.charCodeAt(i)) >>> 0;
    return (h.toString(36) + h2.toString(36));
  };

  window.DD = DD;
})();

