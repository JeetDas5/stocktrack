# NexBrix — Design System & Agent Instructions

> Use this file as the single source of truth when building, redesigning, or creating any page in this project. Every new screen MUST follow the patterns documented here so the experience stays cohesive.

The aesthetic target is: **"If Apple launched a Business Operating System for small businesses."**

---

## 1. Tech Stack (do not change)

| Layer      | Choice                                                                                              |
| ---------- | --------------------------------------------------------------------------------------------------- |
| Framework  | Next.js 16 — App Router                                                                             |
| Language   | TypeScript (avoid using `any` unless extreme necessary)                                                     |
| Styling    | Tailwind CSS (semantic neutrals, no custom hex outside this guide)                                  |
| Components | Custom design ,(similar to shadcn) (in `@/components/ui/*`) or build new components with similar ui |
| Icons      | `lucide-react` only                                                                                 |
| Motion     | `framer-motion` only                                                                                |
| Fonts      | `Inter` via `next/font/google`, weights 300–900                                                     |
| DB         | MongoDB database via `DATABASE_URL` env                                                                      |

Do **not** introduce Material UI, Chakra, daisyUI, custom CSS-in-JS libraries, or icon libraries beyond `lucide-react`.

---

## 2. Brand Personality

Premium · Established · Trustworthy · Visionary · Modern · Confident.

The site must feel like a high-end product launch page, not a generic SaaS template.

**Avoid:** dashboard screenshots everywhere, startup clichés, aggressive sales copy, heavy gradients, stock-photo collages, neon colors, fake testimonial walls.

---

## 3. Color System

Strictly neutral-driven. The whole project is built on Tailwind's `neutral-*` scale plus a few accent semantics.

### 3.1 Primary palette (use these almost everywhere)

| Token                   | Tailwind class                                   | Use                                           |
| ----------------------- | ------------------------------------------------ | --------------------------------------------- |
| Page background (light) | `bg-white`                                       | Default body                                  |
| Soft surface            | `bg-neutral-50`                                  | Section alternation, subtle panels            |
| Premium dark surface    | `bg-neutral-950`                                 | Hero CTAs, contrast sections, footers of CTAs |
| Primary text            | `text-neutral-900`                               | Headings, body main                           |
| Secondary text          | `text-neutral-600`                               | Body copy, descriptions                       |
| Tertiary text           | `text-neutral-500`                               | Eyebrows, small meta                          |
| Muted text              | `text-neutral-400`                               | Faded portion of heading, disabled icons      |
| Borders                 | `border-neutral-200`                             | Default border                                |
| Soft border             | `border-neutral-200/70`                          | Footer / dividers                             |
| Dashed border           | `border-dashed border-neutral-300`               | "Coming Soon" cards                           |
| Focus ring              | `ring-neutral-900/5` (4px)                       | Inputs                                        |
| On-dark text            | `text-white` / `text-white/70` / `text-white/40` | Dark sections                                 |
| On-dark border          | `border-white/10` / `border-white/20`            | Dark sections                                 |

### 3.2 Accent semantics (use **sparingly** — only for status)

| Meaning                          | Classes                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Live / Success / Available Today | `bg-emerald-50 border-emerald-100 text-emerald-700` and `bg-emerald-500` dot, icons `text-emerald-600` |
| Coming Soon / In design          | `bg-amber-50 border-amber-100 text-amber-700` and `bg-amber-500` dot                                   |
| Error                            | `text-red-600`                                                                                         |

> Never use raw blue/purple/pink for decoration. Brand is grayscale + emerald + amber.

### 3.3 Forbidden

- Gradients other than: subtle `bg-gradient-to-b from-neutral-50 via-white to-white`, `from-white/40 via-transparent to-transparent`, and dark `from-neutral-950 via-neutral-950/80 to-neutral-950`.
- Shadow tokens beyond `shadow-[0_30px_80px_-20px_rgba(0,0,0,0.15)]` (hero card) and `shadow-[0_20px_60px_-30px_rgba(0,0,0,0.15)]` (login card / forms).

---

## 4. Typography

The font family is **Inter**, loaded in `app/layout.js`. Body uses `font-sans` + `antialiased` + `tracking-tightest` is reserved for display.

### 4.1 Scale

| Role               | Classes                                                                                                                 | Notes                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Hero (page H1)     | `text-[44px] sm:text-[64px] md:text-[88px] lg:text-[110px] font-semibold tracking-tightest leading-[1.02] text-balance` | Two-line, second line in `text-neutral-400`                             |
| Section H2         | `text-[40px] sm:text-[56px] md:text-[72px] font-semibold tracking-tightest leading-[1.05] text-balance`                 | Mute the second half: `<span className="text-neutral-400">word.</span>` |
| Large H2 (special) | `text-[44px] sm:text-[64px] md:text-[88px] font-semibold tracking-tightest leading-[1]`                                 | Mission / Final CTA                                                     |
| H3 (card title)    | `text-[20px]–[28px] font-semibold tracking-tight`                                                                       |                                                                         |
| Body large         | `text-[19px] leading-relaxed text-neutral-600`                                                                          | Section intro paragraphs                                                |
| Body               | `text-[17px]–[18px] leading-relaxed text-neutral-700`                                                                   | Editorial body                                                          |
| Small body         | `text-[15px] leading-relaxed text-neutral-600`                                                                          | Card descriptions                                                       |
| Eyebrow            | `text-[12px] tracking-[0.2em] uppercase text-neutral-500`                                                               | Above every section heading                                             |
| Caption / meta     | `text-[12px] text-neutral-500`                                                                                          | Footer, "we respond within 1 business day"                              |
| Button label       | `text-[14px]–[15px] font-medium`                                                                                        |                                                                         |

### 4.2 Rules

- Every section starts with an **eyebrow** then the **H2**. No exceptions.
- Headings should always use `tracking-tightest` (`letter-spacing: -0.04em`) defined in `globals.css`.
- Use `text-balance` on every heading and `text-pretty` on long paragraphs.
- Two-tone heading trick: emphasize the first half in `text-neutral-900` and mute the second half in `text-neutral-400`.

```jsx
<h2 className="text-[40px] sm:text-[56px] md:text-[72px] font-semibold tracking-tightest leading-[1.05] text-neutral-900 text-balance">
  Most businesses are <span className="text-neutral-400">flying blind.</span>
</h2>
```

---

## 5. Layout & Spacing

| Concern                                        | Standard                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Outer container                                | `max-w-7xl mx-auto px-2 lg:px-10`                                                                            |
| Narrow container (legal, forms)                | `max-w-5xl` or `max-w-3xl`                                                                                   |
| Section vertical padding                       | `py-24 lg:py-32` (default) — `py-28 lg:py-40` (heavier) — `py-32 lg:py-48` (mission/hero accents)            |
| Top padding on first content section of a page | `pt-36 lg:pt-44` or `pt-36 lg:pt-48` (clear the fixed navbar)                                                |
| Grid gutter                                    | `gap-4` for card grids, `gap-12` for two-column editorial                                                    |
| Radius                                         | `rounded-2xl` cards, `rounded-3xl` large panels/hero, `rounded-xl` form fields, `rounded-full` pills/buttons |

Alternate section backgrounds for rhythm: `bg-white` → `bg-neutral-50` → `bg-white` → `bg-neutral-950` (dark accent) → `bg-white`.

---

## 6. Core Components

All global components live in `/app/components/site/` and page specific components live in `/app/components/home/*`. Reuse these, do not re-implement.

| Component     | Path                            | Purpose                                                             |
| ------------- | ------------------------------- | ------------------------------------------------------------------- |
| `Navbar`      | `@/components/site/Navbar`      | Sticky transparent → blurred on scroll, with Login + Request a Demo |
| `Footer`      | `@/components/site/Footer`      | Logo, links, legal, CTA                                             |
| `Reveal`      | `@/components/site/Reveal`      | Scroll-triggered fade/translate                                     |
| `RevealText`  | `@/components/site/Reveal`      | Word-by-word staggered text reveal                                  |
| `LegalLayout` | `@/components/site/LegalLayout` | Wrapper for /terms, /privacy-policy                                 |

### 6.1 Every new page must wrap with

```jsx
"use client"; // only if the page uses state or motion
import { Reveal, RevealText } from "@/components/site/Reveal";

export default function MyPage() {
  return <main className="min-h-screen bg-white">{/* sections here */}</main>;
}
```

### 6.2 If adding to nav

Update both `LINKS` in `/app/components/site/Navbar.js` and the Company list in `/app/components/site/Footer.js`.

---

## 7. Motion Patterns

We use **only** these three motion primitives. Anything else risks looking flashy.

### 7.1 `Reveal` — fade + translate on scroll

```jsx
<Reveal delay={0.05} className="lg:col-span-7">
  <h2>...</h2>
</Reveal>
```

- `delay`: stagger neighbouring items by `i * 0.04` to `i * 0.08`.
- IMPORTANT: when wrapping an item that itself sits in a CSS grid, put grid utilities (`lg:col-span-*`) on `<Reveal>`, **not** on the child — `Reveal` renders the outer `motion.div`.

### 7.2 `RevealText` — word-by-word reveal (hero / page titles only)

```jsx
<h1>
  <RevealText text="Business Operating System" />
  <br />
  <RevealText
    text="for Small Businesses."
    delay={0.2}
    className="text-neutral-400"
  />
</h1>
```

### 7.3 Parallax hero image

```jsx
const ref = useRef(null);
const { scrollYProgress } = useScroll({
  target: ref,
  offset: ["start start", "end start"],
});
const y = useTransform(scrollYProgress, [0, 1], [0, 160]);
const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
```

### Rules

- Easing: always `[0.22, 1, 0.36, 1]` (already baked into `Reveal`).
- Duration: 0.7–0.8s for content reveals.
- Hover: subtle only — `hover:-translate-y-0.5`, `hover:gap-3`, `hover:bg-neutral-800`, `transition-colors` / `transition-all`.
- **Never** use bouncing springs, infinite spins, or full-page transitions.

---

## 8. UI Pattern Library

Copy these blocks verbatim when building new sections — they keep the language identical.

### 8.1 Eyebrow + Heading

```jsx
<Reveal>
  <div className="text-[12px] tracking-[0.2em] uppercase text-neutral-500">The problem</div>
</Reveal>
<Reveal delay={0.05}>
  <h2 className="mt-5 text-[40px] sm:text-[56px] md:text-[72px] font-semibold tracking-tightest leading-[1.05] text-neutral-900 max-w-4xl text-balance">
    Most businesses are <span className="text-neutral-400">flying blind.</span>
  </h2>
</Reveal>
```

### 8.2 Status badge (pill)

```jsx
{
  /* Available Today */
}
<span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[12px] tracking-wide text-emerald-700 font-medium">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Available Today
</span>;

{
  /* Coming Soon */
}
<span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-neutral-200 text-[12px] tracking-wide text-neutral-700 font-medium">
  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Coming Soon
</span>;

{
  /* Early Access */
}
<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200 bg-white/60 backdrop-blur text-[12px] tracking-wide text-neutral-600">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Early Access
</div>;
```

### 8.3 Buttons

```jsx
{
  /* Primary (default, on light) */
}
<Link
  href="/contact?demo=1"
  className="inline-flex items-center gap-2 bg-neutral-900 text-white px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-neutral-800 transition-all hover:gap-3"
>
  Request a Demo <ArrowRight className="w-4 h-4" />
</Link>;

{
  /* Secondary (on light) */
}
<Link
  href="/contact"
  className="inline-flex items-center gap-2 bg-white text-neutral-900 px-6 py-3.5 rounded-full text-[15px] font-medium border border-neutral-200 hover:border-neutral-300 transition-colors"
>
  Contact Us
</Link>;

{
  /* Primary (on dark sections) */
}
<Link
  href="/contact?demo=1"
  className="inline-flex items-center gap-2 bg-white text-neutral-900 px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-neutral-100 transition-all hover:gap-3"
>
  Request a Demo <ArrowRight className="w-4 h-4" />
</Link>;

{
  /* Secondary (on dark) */
}
<Link
  href="/contact"
  className="inline-flex items-center gap-2 bg-transparent text-white px-6 py-3.5 rounded-full text-[15px] font-medium border border-white/20 hover:border-white/40 transition-colors"
>
  Contact Us
</Link>;

{
  /* Small (nav, login) */
}
<Link className="inline-flex items-center gap-1.5 text-[14px] text-neutral-700 hover:text-neutral-900 px-4 py-2 rounded-full border border-neutral-200 bg-white/60 backdrop-blur hover:border-neutral-300 transition-colors">
  Login
</Link>;
```

Rules:

- All CTAs are **pills** (`rounded-full`). Never sharp-cornered buttons.
- All right-pointing CTAs include `ArrowRight` from lucide and animate `hover:gap-3`.
- Disabled state: `disabled:opacity-60`.

### 8.4 Feature cards (grid)

Two flavours: solid (live) and dashed (coming soon).

```jsx
{
  /* Live card */
}
<div className="group rounded-2xl border border-neutral-200 bg-white p-6 hover:border-neutral-300 hover:-translate-y-0.5 transition-all">
  <Icon
    className="w-5 h-5 text-neutral-500 group-hover:text-neutral-900 transition-colors"
    strokeWidth={1.6}
  />
  <div className="mt-5 text-[17px] font-medium tracking-tight text-neutral-900">
    Feature title
  </div>
  <div className="mt-1 flex items-center gap-1 text-[12px] text-emerald-700">
    <CheckCircle2 className="w-3.5 h-3.5" /> Live
  </div>
</div>;

{
  /* Coming Soon card */
}
<div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-6 backdrop-blur">
  <Icon className="w-5 h-5 text-neutral-400" strokeWidth={1.6} />
  <div className="mt-5 text-[17px] font-medium tracking-tight text-neutral-900">
    Feature title
  </div>
  <div className="mt-1 text-[12px] text-amber-700">In design</div>
</div>;
```

Grid container:

```jsx
<div className="grid grid-cols-2 md:grid-cols-3 gap-4">{/* cards */}</div>
```

### 8.5 "Bordered tile grid" (Apple-style hairline cards)

For a grid that looks like one block divided by hairlines (used in the Problem section and Solution dark section):

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-neutral-200 border border-neutral-200 rounded-3xl overflow-hidden">
  <div className="bg-white p-8 lg:p-10 h-full hover:bg-neutral-50/60 transition-colors">
    …
  </div>
  …
</div>
```

Dark variant:

```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/10 rounded-3xl overflow-hidden">
  <div className="bg-neutral-950 p-10 h-full">…</div>
</div>
```

### 8.6 Industry / hover-invert card

```jsx
<div className="group rounded-2xl border border-neutral-200 bg-white p-8 hover:bg-neutral-900 hover:text-white transition-all duration-300">
  <Icon
    className="w-7 h-7 text-neutral-400 group-hover:text-white transition-colors"
    strokeWidth={1.4}
  />
  <div className="mt-6 text-[22px] font-semibold tracking-tight">
    Restaurants
  </div>
  <div className="mt-2 inline-flex items-center gap-1 text-[13px] text-neutral-500 group-hover:text-white/70">
    Learn more <ArrowUpRight className="w-3.5 h-3.5" />
  </div>
</div>
```

### 8.7 Form inputs

```jsx
{
  /* Standard input */
}
<input className="w-full px-4 py-3.5 rounded-xl border border-neutral-200 bg-white text-[15px] focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition" />;

{
  /* Icon-prefixed input */
}
<div className="relative">
  <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
  <input
    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-neutral-200 bg-white text-[15px] focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition"
    placeholder="you@business.com"
  />
</div>;
```

**Dropdowns:** always use shadcn `Select` from `@/components/ui/select`. Never native `<select>`. The trigger should be styled to match input height:

```jsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="w-full px-4 py-3.5 h-auto rounded-xl border border-neutral-200 bg-white text-[15px] data-placeholder:text-neutral-400">
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent className="rounded-xl border-neutral-200">
    <SelectItem value="a" className="text-[14px]">
      A
    </SelectItem>
  </SelectContent>
</Select>;
```

Field label wrapper:

```jsx
<label className="block">
  <span className="text-[12px] font-medium tracking-wide text-neutral-700">
    Field name <span className="text-neutral-400">*</span>
  </span>
  <div className="mt-2">{/* input */}</div>
</label>
```

### 8.8 Pillar / chip row

```jsx
<div className="flex flex-wrap gap-3 justify-center">
  {items.map((p) => (
    <div className="px-5 py-2.5 rounded-full border border-neutral-200 bg-white text-[14px] text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors">
      {p}
    </div>
  ))}
</div>
```

### 8.9 Hero image card (cinematic)

```jsx
<div className="relative aspect-video rounded-3xl overflow-hidden border border-neutral-200/80 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.15)]">
  <Image
    src={SRC}
    alt=""
    fill
    priority
    className="object-cover"
    sizes="100vw"
  />
  <div className="absolute inset-0 bg-linear-to-t from-white/40 via-transparent to-transparent" />
</div>
```

### 8.10 Dark accent section template

```jsx
<section className="relative py-28 lg:py-40 bg-neutral-950 text-white overflow-hidden">
  <div className="absolute inset-0 z-0">
    <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-white/4 blur-3xl" />
    <div className="absolute inset-0 grain-bg opacity-[0.06]" />
  </div>
  <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
    {/* content */}
  </div>
</section>
```

### 8.11 Form success state

```jsx
<motion.div
  initial={{ opacity: 0, scale: 0.98 }}
  animate={{ opacity: 1, scale: 1 }}
  className="rounded-3xl border border-neutral-200 p-10 lg:p-14 bg-white"
>
  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-600">
    <CheckCircle2 className="w-7 h-7" />
  </div>
  <h3 className="mt-6 text-[36px] sm:text-[44px] font-semibold tracking-tight text-neutral-900">
    Thank you.
  </h3>
  <p className="mt-4 text-[17px] leading-relaxed text-neutral-600 max-w-xl">
    Your request has been received…
  </p>
</motion.div>
```

---

## 9. Page Skeleton (default storytelling rhythm)

When in doubt, structure new pages like the home page:

1. **Hero** (light, parallax image, big heading two-tone)
2. **Problem** (light, hairline-tile grid of pain points with icons)
3. **Solution** (dark, large heading + 3 principle tiles)
4. **Available Today** (light, badge + grid)
5. **Coming Soon** (`bg-neutral-50`, dashed grid)
6. **Vision / Bigger Picture** (light, image + chip row)
7. **Industries / Use cases** (`bg-neutral-50`, hover-invert cards)
8. **Mission** (light, centered editorial paragraph)
9. **Final CTA** (dark, image w/ heavy gradient, centered)

Subordinate pages (About / Pricing / Contact / Login) follow:

- Eyebrow + Hero (oversized two-line heading)
- 3–5 body sections alternating `bg-white` / `bg-neutral-50`
- Final CTA dark section
- Footer

---

## 10. API & Backend Conventions

- Most of routes are imported from `/backend` using FastApi. Some routes live in `/app/app/api/[[...path]]/route.js` — a single catch-all that branches on `path`.
- Always return `NextResponse.json(...)`.
- Use `uuid` (`uuidv4`) for IDs — **never** Mongo `_id`.
- MongoDB connection is cached via a module-level `cachedClient`. Re-use `getDb()`.
- Database name: `process.env.DATABASE_URL`.
- Collections used so far: `contact_requests`, `notify_subscribers`. Reuse the pattern:

```js
if (path === "/your-endpoint") {
  const db = await getDb();
  const col = db.collection("your_collection");
  if (method === "POST") {
    const body = await request.json().catch(() => ({}));
    if (!body.email) return json({ error: "Email is required." }, 400);
    const doc = { id: uuidv4(), ...body, createdAt: new Date().toISOString() };
    await col.insertOne(doc);
    return json({ ok: true, id: doc.id });
  }
}
```

- Frontend always calls `/api/...` (relative) — never the absolute URL.

---

## 11. Images

- Use `next/image` with `fill` + an explicit `sizes` attribute.
- Hero/section images wrapped in `aspect-[16/9] rounded-3xl overflow-hidden border border-neutral-200`.
- Always overlay a soft gradient if there's text on top:
  `bg-gradient-to-t from-white/40 via-transparent to-transparent` (light) or
  `bg-gradient-to-b from-neutral-950 via-neutral-950/80 to-neutral-950` (dark hero).
- For new images, **request via `vision_expert_agent` only** — never hardcode random Unsplash URLs.
- Allowed remote hosts are configured in `next.config.js` (`images.unsplash.com`). If you add a new host, update `remotePatterns`.

---

## 12. Icons

- Only `lucide-react`. Default `strokeWidth={1.5}` or `1.6` for premium look.
- Standard size: `w-5 h-5` (inline / cards), `w-4 h-4` (button suffix), `w-7 h-7` (industry cards), `w-3.5 h-3.5` (badges).
- Inside cards: muted by default (`text-neutral-400` / `text-neutral-500`), and `group-hover:text-neutral-900` on the parent card.

---

## 13. Accessibility & Performance

- Semantic HTML: `<main>`, `<section>`, `<nav>`, `<footer>`, `<h1>`–`<h3>` in correct order, one `<h1>` per page.
- All interactive elements keyboard reachable; do not remove `focus:` rings — restyle them with `focus:ring-4 focus:ring-neutral-900/5`.
- Every `Image` MUST have an `alt`.
- Don't block the main thread — keep page components lean. Only mark a page `'use client'` if it actually needs state, refs, or motion hooks.
- Maintain Lighthouse ≥95: prefer `font-sans` (Inter is preloaded), avoid heavy SVG backgrounds.

---

## 14. Routing & Files

| Route             | File                              |
| ----------------- | --------------------------------- |
| `/`               | `app/page.js`                     |
| `/about`          | `app/about/page.js`               |
| `/pricing`        | `app/pricing/page.js`             |
| `/contact`        | `app/contact/page.js`             |
| `/login`          | `app/login/page.js`               |
| `/privacy-policy` | `app/privacy-policy/page.js`      |
| `/terms`          | `app/terms/page.js`               |
| `/dashboard/*`    | `app/dashboard/[...path]/page.js` |

Add new routes only as `app/<slug>/page.js` and remember to:

- Add page `metadata` export for SEO (title + description).

---

## 15. Tone of Voice

- Headlines: short, declarative, slightly poetic. Two-tone mute on the second clause.
  - ✓ "Most businesses are _flying blind_."
  - ✗ "Run your business 10x better with our AI-powered SaaS."
- Body: calm, confident, plain English. No exclamation marks. No emoji.
- Status language: `Available Today`, `Coming Soon`, `In design`, `Planned`, `Early Access`.
- Always say **NexBrix** (capital N, capital B). Never "nexbrix", "Nexbrix" or "NEXBRIX".

---

## 16. Checklist for Every New / Redesigned Page

Before considering a page done, confirm:

- [ ] Uses `Navbar` + `Footer` from `@/components/site/*`.
- [ ] First section has `pt-36 lg:pt-44` (or larger) to clear navbar.
- [ ] Container is `max-w-7xl mx-auto px-2 lg:px-10` (or narrower for editorial pages).
- [ ] Eyebrow + H2 pattern used at the top of every section.
- [ ] Headings use `tracking-tightest`, `leading-[1.05]`, `text-balance`, two-tone color.
- [ ] CTAs are pills (`rounded-full`) with `ArrowRight` icon and `hover:gap-3`.
- [ ] Sections alternate between `bg-white` and `bg-neutral-50`, with at most one `bg-neutral-950` accent.
- [ ] Cards use `rounded-2xl border border-neutral-200`; "coming soon" cards use dashed borders.
- [ ] Scroll reveals via `<Reveal>` with staggered `delay`.
- [ ] No native `<select>` — use shadcn `Select`.
- [ ] No raw Unsplash URLs added without `vision_expert_agent`.
- [ ] All icons from `lucide-react` only.
- [ ] No new colors outside neutral + emerald + amber.
- [ ] `<Image>` has `alt`, `sizes`, and is wrapped in `aspect-[16/9] rounded-3xl overflow-hidden border`.
- [ ] No console errors, all routes return 200.
- [ ] Page has `export const metadata = { title, description }`.

---

## 17. Quick Reference: import header for a typical page

```jsx
"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 /* + others */ } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Reveal, RevealText } from "@/components/site/Reveal";
```

---

**Golden rule:** When unsure, look at `/app/app/page.js` (home) and `/app/app/pricing/page.js` — they are the canonical references for every pattern in this document.
