# ADR-004: Bundle Deno as yt-dlp's JavaScript Runtime

**Date**: 2026-10-03  
**Status**: Accepted  
**Author**: Antonio Torres  
**Deciders**: Antonio Torres

---

## Context

YouTube now requires solving JavaScript challenges to get the full list of formats. yt-dlp delegates this to an external JavaScript runtime plus its EJS solver scripts. Without a runtime, yt-dlp warns on every request:

> YouTube extraction without a JS runtime has been deprecated, and some formats may be missing.

Today extraction still returns formats up to 2160p, but this path is deprecated and will stop working. Celeste must keep working on a clean machine with nothing preinstalled (portable ZIP, see `ARCHITECTURE.md` §1 and `FEATURES_SPECIFICATION.md` → Portabilidad).

Facts checked against yt-dlp `2026.8.19`:
- Supported runtimes: deno, node, bun (`yt_dlp/extractor/youtube/jsc/_builtin/`). **Only deno is enabled by default**; others must be enabled explicitly with `js_runtimes`.
- The solver scripts come from the `yt-dlp-ejs` Python package when installed, or from scripts vendored inside yt-dlp.

---

## Decision

**Ship a pinned Deno binary inside the portable package and let yt-dlp use it as its default runtime.**

- The packaged app places `deno` (`deno.exe` on Windows) next to the backend and points yt-dlp to it explicitly, so a different deno on the user's `PATH` is never used.
- Pin the deno version together with yt-dlp; bump them together.
- Install `yt-dlp-ejs` (pinned) with the backend if the vendored scripts turn out to be insufficient during packaging validation.
- In development, contributors install deno themselves (documented in README).

---

## Rationale

1. **Default path in yt-dlp**: deno works with no extra configuration; it is the best-tested path upstream.
2. **Sandboxed by default**: deno runs code without file/network access unless granted, which fits running challenge code fetched from YouTube.
3. **Single self-contained binary**: easy to bundle; no `node_modules`.
4. **Transparency**: the runtime is an explicit, versioned dependency of the package, not something hidden or downloaded at runtime.

---

## Consequences

### Positive
✅ YouTube keeps working when the no-runtime fallback is removed  
✅ Works on clean machines; no user setup  
✅ Behavior doesn't depend on whatever runtime the user has installed

### Negative
❌ Package grows by roughly the size of the deno binary (tens of MB)  
❌ One more binary to keep updated (and to include in license notices)  
❌ Per-platform binaries for Windows and Linux builds

---

## Alternatives Considered

### Alternative 1: Use Node.js bundled with Electron
- **Pros**: Electron already ships a JS engine; no extra binary.
- **Cons**: Not enabled by default in yt-dlp; requires running Electron as a Node runtime (`ELECTRON_RUN_AS_NODE`) and explicit `js_runtimes` configuration; less tested upstream; no sandbox by default.
- **Decision**: Rejected for MVP. Revisit if package size becomes a problem.

### Alternative 2: Rely on a runtime installed by the user
- **Pros**: Zero package size increase.
- **Cons**: Breaks "works on a clean machine"; confusing failures for non-technical users.
- **Decision**: Rejected.

### Alternative 3: Do nothing (no runtime)
- **Pros**: No work now.
- **Cons**: Deprecated path; formats will go missing and downloads will break.
- **Decision**: Rejected.

---

## Follow-up Tasks

- [ ] Packaging: download/pin deno per platform and place it next to the backend.
- [ ] Backend: pass the bundled deno path to yt-dlp explicitly.
- [ ] Validate on a clean Windows machine that the runtime warning disappears and all formats are listed.
- [ ] README: document installing deno for development.

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-10-03 | Antonio Torres | Initial acceptance |
