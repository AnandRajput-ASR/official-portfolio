# Official Portfolio — Frontend

A modern, production-ready **Angular 20** single-page application that serves as a personal portfolio, blog, and admin dashboard. Built with standalone components, lazy-loaded routes, signals, and strict TypeScript.

---

## Changelog

### v1.1.14 (2026-06-30)

| Feature | Details |
| ------- | ------- |
| Markdown code rendering clarity fix | Fixed admin live preview styling so inline code and fenced code blocks are visually distinct even for HTML rendered via `[innerHTML]`. |
| Clipboard screenshot compatibility hardening | Improved image paste handling to detect screenshots from both `clipboardData.items` and `clipboardData.files` sources. |

### v1.1.13 (2026-06-30)

| Feature | Details |
| ------- | ------- |
| Screenshot paste support in markdown editor | Admin Blog markdown editors now support direct clipboard image paste (`Ctrl+V`) and auto-embed pasted screenshots as markdown images. |
| Code preview clarity improvements | Live markdown preview now uses stronger visual distinction between inline code and fenced code blocks for easier authoring validation. |
| Authoring guidance in editor | Added contextual tip text to remind admins they can paste screenshots directly into article content. |

### v1.1.12 (2026-06-30)

| Feature | Details |
| ------- | ------- |
| Multi-featured posts support | `/blog` now supports multiple featured posts at once; all posts tagged `featured` render in the top featured section. |
| Featured fallback behavior retained | If no post is marked featured, the first sorted/filtered post is still shown as the fallback featured story. |
| Featured section UX update | Featured stories now render as a stacked featured list before normal post cards. |

### v1.1.11 (2026-06-30)

| Feature | Details |
| ------- | ------- |
| Manual featured-post control in Admin Blog tab | Added explicit `Featured on Blog page (hero card)` toggle for existing and new posts in `/admin/dashboard` Blog editor. |
| Deterministic featured-card selection | `/blog` now prioritizes posts tagged as `featured`; if none are marked, it falls back to the first post by active sort/filter result. |
| Cleaner public tag display | Internal `featured` control tag is hidden from public blog card tag chips to avoid exposing editorial metadata. |

### v1.1.10 (2026-06-30)

| Feature | Details |
| ------- | ------- |
| Live markdown authoring in Admin Blog editor | Blog content editors now render side-by-side live markdown preview while writing (existing and new posts). |
| Markdown productivity toolbar | Added quick actions for `Code Block`, `Inline Code`, `Image URL`, and `Upload Screenshot` to reduce manual markdown typing. |
| Screenshot embedding support | Local image uploads now insert markdown image tags using embedded data URLs, and markdown sanitization allows safe `data:image/*` rendering for previews/articles. |

### v1.1.9 (2026-06-30)

| Feature | Details |
| ------- | ------- |
| Blog deep-link load reliability | Fixed direct article URL boot path so `/blog/:slug` renders immediately even when opened directly in a fresh tab. |
| Article render stabilization | Added explicit post-load render flush in article view to prevent rare stuck skeleton states during initial hydration. |

### v1.1.8 (2026-06-30)

| Feature | Details |
| ------- | ------- |
| Hide vs Delete moderation model | Admin Blog tab now supports status-based comment moderation (`visible`, `hidden`, `deleted`) instead of permanent removal-only handling. |
| Status-aware moderation actions | Added explicit `Hide`, `Unhide`, `Soft Delete`, and `Restore` actions mapped to backend moderation transitions. |
| Filtered moderation queue | Added per-post moderation filters (`All`, `Visible`, `Hidden`, `Deleted`) with live count badges to speed up admin review workflows. |

### v1.1.7 (2026-06-30)

| Feature | Details |
| ------- | ------- |
| Admin blog comments moderation | Added per-post comments management inside Admin Dashboard Blog tab with comment loading and delete actions. |
| Backend delete contract integration | Admin frontend now calls a dedicated delete-comment endpoint by `slug` + `commentId` to remove specific comments safely. |
| Moderator UX polish | Added loading, empty-state, and delete-progress UI states for comments moderation workflows. |

### v1.1.6 (2026-06-30)

| Feature | Details |
| ------- | ------- |
| Backend-first blog social actions | Blog likes, comments, shares, and per-post viewer state now use backend APIs instead of local browser storage. |
| API contract alignment | Frontend now expects social state, like toggles, comment creation, and share tracking endpoints for each blog slug. |
| UI interaction state | Social controls now load from server state and show loading/error feedback instead of silently falling back to local data. |

### v1.1.5 (2026-06-30)

| Feature | Details |
| ------- | ------- |
| Article reading UX upgrade | Blog article pages now include sticky reading-progress indicator, in-page mini TOC for long content, cover-image hero, and skeleton loading states. |
| Post discovery continuity | Added related-post recommendations by shared tags and optional series-aware previous/next navigation when posts include `series:*` and `part:*` tagging. |
| Engagement and trust signals | Added lightweight `Helpful`, `Insightful`, and `Save for later` actions (local persistence), tech-stack trust badges, and referenced-link surfacing from markdown sources. |
| SEO depth pass | Added canonical URL handling, richer Open Graph/Twitter tags (`og:url`, `twitter:image`, etc.), and per-article JSON-LD `BlogPosting` schema output. |
| Performance polish | Featured/blog hero images now use higher-priority loading hints while non-critical card media remains lazy-loaded with async decoding. |

### v1.1.4 (2026-06-30)

| Feature | Details |
| ------- | ------- |
| Blog listing UX redesign | `/blog` now includes an editorial hero, live content stats, featured-story spotlight, image-forward post cards, and improved visual hierarchy for faster scanning. |
| Discovery and filtering improvements | Added explicit result-state messaging, one-click filter reset, clearer tag chips, and better empty states to reduce dead ends when searching or filtering posts. |
| Responsive polish for blog browsing | Desktop and mobile layouts now preserve readable spacing, content hierarchy, and touch-friendly controls across hero, toolbar, featured, and grid sections. |

### v1.1.3 (2026-06-30)

| Feature | Details |
| ------- | ------- |
| Context-aware article back navigation | Blog article back actions now return to Home when opened from Home writing section, and return to the blog listing route when opened from `/blog` or `/blog/tag/:tag`. |

### v1.1.2 (2026-06-30)

| Feature | Details |
| ------- | ------- |
| Production auth probe fix | Set production `cookieAuth` to `false` so app startup no longer probes `/api/auth/me` on every page load when backend session endpoint is unavailable. |
| Meta CSP warning cleanup | Removed `frame-ancestors` from meta CSP (it is enforced via response header, not meta). |

### v1.1.1 (2026-06-30)

| Feature | Details |
| ------- | ------- |
| Production API via Vercel proxy | Switched production API base URL back to `/api` so browser calls stay same-origin and Vercel rewrites forward requests to Render. |
| CSP tightened for proxy mode | Vercel header CSP `connect-src` now uses `'self'` in production instead of allowing direct backend host calls. |

### v1.1.0 (2026-06-30)

| Feature | Details |
| ------- | ------- |
| Environment-based API URL centralization | Development and production API targets are managed via Angular environment files, with production now using same-origin `/api` proxy routing. |
| Hardcoded API endpoint cleanup | Removed hardcoded `/api` fallback checks from runtime interceptor logic and aligned tests with environment-based URL resolution. |
| Deployment compatibility update | CSP `connect-src` now explicitly allows the Render backend host used in production API calls. |

---

## Tech Stack

| Layer     | Technology                             |
| --------- | -------------------------------------- |
| Framework | Angular 20.3                           |
| Language  | TypeScript 5.9 (strict mode)           |
| Styling   | SCSS (component-scoped)                |
| Reactive  | RxJS 7.8 + Angular Signals             |
| Linting   | ESLint 9 + angular-eslint + Prettier 3 |
| Git Hooks | Husky + lint-staged                    |

---

## Features

- **Portfolio homepage** — hero section, skills grid, work experience (by company), side projects, certifications, testimonials, blog posts, about stats, contact form, resume download
- **Dark / light theme** — toggled via `ThemeService`, persisted in localStorage
- **Blog** — editorial-style listing experience (`/blog`, `/blog/tag/:tag`) with search, sort, tag filters, featured story spotlight, and markdown-rendered article pages (`/blog/:slug`)
- **Admin dashboard** — full CRUD for all portfolio sections, analytics, messages inbox, resume upload, site settings
- **Secret admin login** — admin page is hidden behind a configurable secret URL slug
- **Scroll reveal animations** — `IntersectionObserver`-powered entry animations
- **Fully responsive** — mobile-first, hamburger menu, adaptive layouts
- **SEO optimised** — Open Graph, Twitter Card, structured data, semantic HTML

---

## Project Structure

```
official-portfolio-frontend/
├── src/
│   ├── app/
│   │   ├── app.component.ts       # Root component
│   │   ├── app.config.ts          # Application config (providers, interceptors)
│   │   ├── app.routes.ts          # Lazy-loaded route definitions
│   │   │
│   │   ├── core/                  # Singleton services, models, guards, interceptors
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts          # Protects /admin/dashboard
│   │   │   │   └── secret-slug.guard.ts   # Validates secret admin URL
│   │   │   ├── interceptors/
│   │   │   │   └── auth.interceptor.ts    # Attaches JWT Bearer token
│   │   │   ├── models/                    # Per-domain TypeScript interfaces
│   │   │   │   ├── analytics.model.ts
│   │   │   │   ├── auth.model.ts
│   │   │   │   ├── blog.model.ts
│   │   │   │   ├── certification.model.ts
│   │   │   │   ├── company.model.ts
│   │   │   │   ├── content.model.ts
│   │   │   │   ├── experience.model.ts
│   │   │   │   ├── hero.model.ts
│   │   │   │   ├── message.model.ts
│   │   │   │   ├── project.model.ts
│   │   │   │   ├── settings.model.ts
│   │   │   │   ├── skill.model.ts
│   │   │   │   ├── stat.model.ts
│   │   │   │   ├── testimonial.model.ts
│   │   │   │   └── index.ts              # Barrel re-export
│   │   │   └── services/
│   │   │       ├── admin.service.ts       # Admin CRUD API calls
│   │   │       ├── auth.service.ts        # Login, logout, token management
│   │   │       ├── cert-badge.service.ts  # Certification badge resolver
│   │   │       ├── content.service.ts     # Public content + analytics tracking
│   │   │       ├── loading.service.ts     # Global loading state
│   │   │       ├── messages.service.ts    # Contact form + admin inbox
│   │   │       ├── resume.service.ts      # Resume info/upload/download
│   │   │       └── theme.service.ts       # Dark/light theme toggle
│   │   │
│   │   ├── features/              # Lazy-loaded feature modules
│   │   │   ├── admin/
│   │   │   │   ├── dashboard/             # Full admin dashboard (CRUD all sections)
│   │   │   │   └── login/                 # Admin login page
│   │   │   ├── blog/
│   │   │   │   └── blog-view.component.ts # Individual blog post page
│   │   │   └── home/
│   │   │       ├── home.component.ts      # Main portfolio page
│   │   │       ├── home.component.html    # Template (~1000 lines)
│   │   │       └── home.component.scss    # Styles
│   │   │
│   │   └── shared/                # Reusable components (if any)
│   │       └── components/
│   │
│   ├── environments/
│   │   ├── environment.ts         # Development config (localhost:3000)
│   │   └── environment.prod.ts    # Production config (same-origin /api via Vercel rewrite)
│   │
│   ├── index.html                 # HTML shell (SEO meta, Open Graph, JSON-LD)
│   ├── main.ts                    # Bootstrap
│   └── styles.scss                # Global styles
│
├── tsconfig.json                  # TypeScript config with path aliases
├── angular.json                   # Angular CLI config
├── eslint.config.js
├── .prettierrc (in package.json)
└── package.json
```

---

## Path Aliases

Configured in `tsconfig.json` for clean imports:

| Alias         | Maps To              | Example                                                         |
| ------------- | -------------------- | --------------------------------------------------------------- |
| `@core/*`     | `src/app/core/*`     | `import { AuthService } from '@core/services/auth.service'`     |
| `@shared/*`   | `src/app/shared/*`   | `import { ... } from '@shared/components/...'`                  |
| `@features/*` | `src/app/features/*` | `import { HomeComponent } from '@features/home/home.component'` |
| `@env/*`      | `src/environments/*` | `import { environment } from '@env/environment'`                |

---

## Routes

| Path               | Component            | Guard             | Description                |
| ------------------ | -------------------- | ----------------- | -------------------------- |
| `/`                | `HomeComponent`      | —                 | Main portfolio page        |
| `/blog`            | `BlogListComponent`  | —                 | Blog discovery page        |
| `/blog/tag/:tag`   | `BlogListComponent`  | —                 | Blog listing filtered by tag |
| `/blog/:slug`      | `BlogViewComponent`  | —                 | Individual blog post       |
| `/admin/dashboard` | `DashboardComponent` | `authGuard`       | Admin panel (JWT required) |
| `/:slug`           | `LoginComponent`     | `secretSlugGuard` | Secret admin login URL     |
| `**`               | —                    | —                 | Redirects to `/`           |

All feature components are **lazy-loaded** via dynamic `import()`.

### Blog Navigation Behavior

1. Opening an article from Home writing section stores Home as the source.
2. Opening an article from Blog list/tag pages stores the current blog listing URL as the source.
3. On article page, Back button returns to the stored source route.
4. If no source route is available (direct deep-link), Back defaults to `/blog`.

### Blog Article Experience (`/blog/:slug`)

| Section | Behavior |
| ------- | -------- |
| Sticky top bar + progress rail | Shows reading-time context and continuously updates article read-progress percentage while scrolling. |
| Mini TOC (`h2`/`h3`) | Renders a sticky in-page navigation panel for long posts and highlights the active section as users scroll. |
| Trust panel | Displays author metadata and tag-derived tech badges to reinforce topic credibility. |
| Reactions and save action | Readers can mark posts as `Helpful`/`Insightful` and bookmark posts locally for later review. |
| Related posts | Suggests up to 3 contextually similar posts based on shared tag overlap. |
| Referenced links | Extracts and surfaces external markdown links as a quick source list near article end. |

### Reader Interaction Model

The blog article actions are now expected to be stored in the backend and loaded per post.

| Action | Storage | Scope | Notes |
| ------ | ------- | ----- | ----- |
| Like | Backend | Per post | The backend should persist viewer state and like counts for each slug. |
| Comment | Backend | Per post | Comments should be stored per slug and returned in display order. |
| Share | Backend | Per post | Share actions should increment per-post counts. |
| Save for later | Backend | Per post | If kept, this should be a server-backed bookmark list, not browser-only state. |

#### Important Constraint

These interactions should now be synced to the backend and shared across devices for the same post. That means:

1. A visitor should see the same counts and comments when they return, on any device.
2. Other visitors should see the same public counts and published comments.
3. Analytics tracking remains separate from the social API and can continue for reporting.

#### Backend API Contract

The frontend expects these endpoints under `/api/content/blogs/:slug`:

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET` | `/social` | Return the current social state for a post. |
| `POST` | `/like` | Toggle the current visitor's like state and return updated counts/state. |
| `POST` | `/comments` | Create a new comment and return updated state. |
| `POST` | `/share` | Increment share count and return updated state. |

The backend should use a stable visitor identifier mechanism for likes, such as a signed anonymous cookie, so the `viewerLiked` state can be restored without local browser storage.

### Admin Blog Comment Moderation

Admins can now moderate blog comments directly from `/admin/dashboard` under the Blog tab.

#### Workflow

1. Open an existing post in Blog tab and click `Manage Comments`.
2. The panel loads comments for that post from admin moderation API.
3. Review comment author, timestamp, and message content.
4. Use status filters (`All`, `Visible`, `Hidden`, `Deleted`) to focus the moderation queue.
5. Apply action per comment:
   - `Hide` (visible -> hidden)
   - `Unhide` (hidden -> visible)
   - `Soft Delete` (visible/hidden -> deleted)
   - `Restore` (deleted -> visible)
6. UI refreshes list and counts after each successful moderation action.

#### Required Admin Endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET` | `/api/admin/blog/:slug/comments?status=all|visible|hidden|deleted` | List comments for moderation with status counts. |
| `PATCH` | `/api/admin/blog/:slug/comments/:commentId/moderation` | Apply moderation action (`hide`, `unhide`, `delete`, `restore`). |
| `DELETE` | `/api/admin/blog/:slug/comments/:commentId` | Backward-compatible soft delete route (maps to moderation delete). |

#### Moderation API Request

`PATCH /api/admin/blog/:slug/comments/:commentId/moderation`

```json
{
  "action": "hide|unhide|delete|restore",
  "reason": "optional moderation note"
}
```

#### Moderation API Response Shape

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "c_123",
        "slug": "my-post",
        "authorName": "Visitor",
        "content": "Great article",
        "createdAt": "2026-06-30T11:05:00.000Z",
        "moderationStatus": "visible",
        "moderationReason": null,
        "moderatedBy": null,
        "moderatedAt": null,
        "hiddenAt": null,
        "deletedAt": null
      }
    ],
    "counts": {
      "all": 1,
      "visible": 1,
      "hidden": 0,
      "deleted": 0
    }
  }
}
```

#### Moderation States

| State | Behavior |
| ----- | -------- |
| Loading comments | Shows `Loading comments...` while fetching moderation list. |
| Empty filtered result | Shows `No comments found for this filter.` when selected moderation bucket is empty. |
| Updating moderation action | Disables action controls and shows `Updating...` while a moderation transition is running. |
| Visible comment | Offers `Hide` and `Soft Delete` actions. |
| Hidden comment | Offers `Unhide` and `Soft Delete` actions. |
| Deleted comment | Offers `Restore` action. |

### Admin Blog Markdown Live Preview

Admins can now write markdown with a live split editor in `/admin/dashboard` under the Blog tab.

#### Workflow

1. Open any existing post in edit mode, or click `+ New Post`.
2. Use the left panel editor to write markdown content.
3. See rendered output instantly in the right preview panel.
4. Use toolbar actions to insert rich markdown quickly:
  - `+ Code Block`
  - `+ Inline Code`
  - `+ Image URL`
  - `+ Upload Screenshot`
5. Save the post as usual.

#### Toolbar Actions

| Action | What it inserts |
| ------ | --------------- |
| `+ Code Block` | Fenced markdown block with selected language (for example, `ts`, `bash`, `sql`). |
| `+ Inline Code` | Inline markdown token around current cursor context. |
| `+ Image URL` | Markdown image syntax using a pasted URL. |
| `+ Upload Screenshot` | Markdown image syntax using a local uploaded image encoded as safe `data:image/*` URL. |

#### Clipboard Screenshot Paste

You can now paste screenshots directly into the markdown editor without using the upload picker.

1. Copy an image/screenshot to clipboard.
2. Focus the blog content editor.
3. Press `Ctrl+V`.
4. The editor inserts markdown image syntax with embedded image data and updates preview instantly.

#### Authoring Notes

| Topic | Behavior |
| ----- | -------- |
| Existing posts | Live preview updates while editing post content. |
| New posts | Live preview works before first save for draft creation flow. |
| Code snippets | Render in markdown `<pre><code>` blocks with existing article styles. |
| Images/screenshots | Render directly in preview and article view using markdown image syntax. |
| Pasted screenshots | Clipboard image paste (`Ctrl+V`) is supported in both existing-post and new-post markdown editors. |
| Mobile UX | Live editor stacks vertically (editor above preview) on small screens. |

### Series Support Rules

Series navigation is automatically enabled when both of these are present in post tags:

1. `series:<series-name>` (or `series-<series-name>`)
2. `part:<number>` (or `episode:<number>`, `ep:<number>`)

When matched, the article page shows previous/next links within that series.

### SEO and Metadata Behavior

| Area | Enhancement |
| ---- | ----------- |
| Canonical URL | Article route now updates/creates `link[rel="canonical"]` dynamically. |
| Open Graph | Adds `og:url`, strengthened `og:image` handling, and article metadata alignment with route URL. |
| Twitter card | Includes title/description/image consistency via `twitter:title`, `twitter:description`, `twitter:image`. |
| Structured data | Injects `application/ld+json` `BlogPosting` schema with headline, author, publish date, keywords, and word-count. |

### Blog Performance Notes

| Surface | Optimization |
| ------- | ------------ |
| Featured blog card image | Uses eager loading with high fetch priority for above-the-fold content. |
| Standard blog card images | Uses lazy loading + async decoding to defer non-critical media. |
| Article loading | Uses skeleton placeholder blocks for perceived speed and layout stability during content fetch. |

### Blog Discovery UX

The `/blog` page is designed for quick content scanning before deep reading.

#### What Visitors See

| Section | Purpose |
| ------- | ------- |
| Hero panel | Introduces writing focus and provides quick stats like total posts, topics, read-time sum, and tracked reads. |
| Search + sort toolbar | Supports intent-based discovery by keyword (`title`, `excerpt`, `tags`, content preview) and sorting by newest/popular. |
| Tag chips | Lets users narrow by topic while preserving URL-based navigation (`/blog/tag/:tag`). |
| Featured story card | Highlights the top result from the current filter/sort context to create a stronger first-click candidate. |
| Post grid | Displays remaining posts in compact, image-forward cards with metadata for rapid comparison. |

#### Featured vs Normal Post (Admin-Controlled)

You can now explicitly control which post appears in the blog hero featured card.

1. Open `/admin/dashboard` and go to Blog / Writing.
2. Open a post (or create a new one).
3. Toggle `Featured on Blog page (hero card)`.
4. Save the post.

Behavior rules:

| Case | Result on `/blog` |
| ---- | ----------------- |
| One or more posts marked featured | All featured posts in current sorted/filtered results are rendered in the top Featured section. |
| No post marked featured | The first post from current sorted/filtered results is used as fallback featured story. |
| Other posts | All posts not rendered in Featured section appear in the normal post grid below. |

Note: The internal `featured` marker is used only for editorial control and is not shown as a public tag chip.

#### Blog Browsing Workflow

1. Open `/blog` to view all published posts.
2. Type keywords in search to narrow results instantly.
3. Click a tag chip or open `/blog/tag/:tag` directly for topic-focused browsing.
4. Switch sort between `Newest` and `Popular` to change ranking.
5. Use `Clear filters` or `Reset filters` to return to the default listing state.
6. Open any card to navigate to `/blog/:slug`.

#### Filter and State Behavior

| Condition | Page Behavior |
| --------- | ------------- |
| Active search/tag/sort | Toolbar displays current result count and active criteria context. |
| No matching posts | Empty state appears with a reset action to recover quickly. |
| No backend response | Error state appears with a retry prompt message. |
| Popularity data unavailable | View-count badges are omitted while the rest of metadata remains visible. |

#### Troubleshooting

| Issue | Check |
| ----- | ----- |
| Blog list looks empty unexpectedly | Verify published posts exist in content API and clear active filters/tags from toolbar. |
| Featured card not visible | Ensure at least one post matches current filter/search combination. |
| Post images missing | Confirm `coverImage` URLs are valid and reachable from browser network context. |

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **Angular CLI** 20+ (`npm install -g @angular/cli`)
- **Backend API** running (see [official-portfolio-backend](https://github.com/AnandRajput-ASR/official-portfolio-backend))

### 1. Clone & Install

```bash
git clone https://github.com/AnandRajput-ASR/official-portfolio-frontend.git
cd official-portfolio-frontend
npm install
```

### 2. Environment Configuration

Edit the API base URL in the environment files:

**Development** (`src/environments/environment.ts`):

```typescript
export const environment = {
  production: false,
  api: { baseUrl: 'http://localhost:3000/api' },
  assets: { baseUrl: 'http://localhost:3000/assets' },
};
```

**Production** (`src/environments/environment.prod.ts`):

```typescript
export const environment = {
  production: true,
  api: { baseUrl: '/api' },
  assets: { baseUrl: '/assets' },
  cookieAuth: false,
};
```

### Authentication Mode by Environment

| Runtime | Auth mode | `cookieAuth` |
| ------- | --------- | ------------ |
| Development (`ng serve`) | Cookie/session-capable backend integration | `true` or `false` per local backend support |
| Production (Vercel) | Legacy token mode (no startup `/auth/me` probe) | `false` |

### API Base URL Resolution

| Runtime | API base URL | Source of truth |
| ------- | ------------ | --------------- |
| Development (`ng serve`) | `http://localhost:3000/api` | `src/environments/environment.ts` |
| Production build (`ng build --configuration production`) | `/api` | `src/environments/environment.prod.ts` via Angular file replacement |

### Verification Workflow

1. Run `npm start` and open browser devtools Network tab.
2. Trigger data-loading pages (home/admin login/dashboard).
3. Confirm API requests go to `http://localhost:3000/api/*`.
4. Run `npm run build` (production build).
5. Deploy the generated build to Vercel.
6. Open deployed app and verify API requests go to `/api/*` (same-origin), with Vercel rewriting to Render backend.

### 3. Start Development Server

```bash
npm run dev
```

Opens `http://localhost:4200` in your browser. Hot-reloads on file changes.

### 4. Build for Production

```bash
npm run build
```

Output: `dist/official-portfolio-frontend/` — deploy to any static hosting.

---

## Available Scripts

| Command            | Description                               |
| ------------------ | ----------------------------------------- |
| `npm run dev`      | Start dev server with auto-open           |
| `npm start`        | Start dev server                          |
| `npm run build`    | Production build                          |
| `npm run watch`    | Build in watch mode                       |
| `npm run lint`     | Run ESLint on all `.ts` and `.html` files |
| `npm run lint:fix` | Auto-fix lint errors                      |
| `npm run format`   | Format all files with Prettier            |
| `npm test`         | Run unit tests (Karma + Jasmine)          |

---

## Admin Access

The admin panel is protected by two layers:

1. **Secret URL slug** — The login page is only accessible at `/{ADMIN_SECRET_SLUG}` (configured in the backend `.env`). Navigating to any other slug redirects to home.

2. **JWT authentication** — After entering the correct slug, the admin must log in with username + password. A JWT token is stored in `localStorage` and attached to all subsequent admin API calls via the `authInterceptor`.

---

## Architecture Decisions

| Decision                   | Rationale                                                                  |
| -------------------------- | -------------------------------------------------------------------------- |
| **Standalone components**  | No NgModules — simpler, tree-shakeable, Angular 20 default                 |
| **Lazy-loaded routes**     | Dashboard (~220 KB) and home (~120 KB) load on demand                      |
| **Functional interceptor** | `HttpInterceptorFn` — modern pattern, no class boilerplate                 |
| **Per-domain model files** | 14 focused files vs one monolithic model — easier to navigate and maintain |
| **Path aliases**           | `@core/`, `@shared/`, `@features/`, `@env/` — no `../../../` imports       |
| **Strict TypeScript**      | `strict: true` + `strictTemplates` — catches bugs at compile time          |
| **Component-scoped SCSS**  | Styles are encapsulated per component, no global CSS conflicts             |
| **Signals for theme**      | `ThemeService` uses Angular Signals for reactive theme state               |

---

## Connecting Frontend and Backend

Both repos are designed to work together:

```
┌─────────────────────┐         ┌─────────────────────────┐
│   Angular Frontend   │  HTTP   │   Express Backend API    │
│   localhost:4200     │ ──────> │   localhost:3000          │
│                      │         │                          │
│  ContentService      │  GET    │  /api/content/*          │
│  AdminService        │  CRUD   │  /api/admin/*            │
│  AuthService         │  POST   │  /api/auth/*             │
│  MessagesService     │  CRUD   │  /api/messages/*         │
│  ResumeService       │  CRUD   │  /api/resume/*           │
└─────────────────────┘         └─────────────────────────┘
                                         │
                                    Supabase
                                   PostgreSQL
```

For production, this frontend calls same-origin `/api` and relies on Vercel rewrites to forward traffic to the deployed Render backend.

---

## License

MIT — see [LICENSE](LICENSE).
