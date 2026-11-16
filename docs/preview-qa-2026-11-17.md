# EduReach — Preview verification plan for Tuesday, 17 November 2026

**Environment:** Vercel Preview for Git branch `feature/owner-dashboard-direct-uploads`
**Production:** https://edureach.network — do not promote or merge during this test.
**Objective:** Preserve the current EduReach website while checking the lightweight hero redesign and authenticated admin-to-public-site content map.

## Scope of tonight's review build
- Kept existing homepage structure, blue/gold identity, official site logo, real hero photo, founder, services, mission, resources, enquiry and checkout routes.
- Applied `assets/css/hero-refresh.css` to homepage only; desktop: quiet editorial text/photo split; mobile: readable copy followed by photo.
- Preserved existing book, article, gallery and public content APIs and Vercel function routes.
- Added `/admin` owner sign-in in homepage footer (existing protected login).
- Added authenticated `Website sections` panel listing all nine Wix-backed content types, actual public links and correct editor route: drafts for books/free resources/articles (pending Wix draft setup), Wix management for other types.
- Expanded content snapshot to nine collections and made one unavailable collection nonfatal to the other status cards.
- No secrets, payment settings or Wix production records changed.

## Public site: screen / accessibility checks
- [ ] Desktop 1440px and 1024px: split hero fits without cropping faces or covering headline.
- [ ] Mobile 390px and 360px: headline/CTAs have no horizontal overflow; hero image appears after copy; image still has meaningful alt text.
- [ ] 768px tablet: navigation, hero transition and CTA behavior are consistent.
- [ ] Keyboard: skip link, menu, CTA and contact form have visible focus and correct tab order.
- [ ] Reduced-motion preference: animations are not essential to navigation.
- [ ] Check contrast of hero text against cream background, and labels against button fills.
- [ ] Verify logo, founder photo and ebook covers are the genuine site assets, with image-use consent.
- [ ] Test `Book Consultation` -> `/#consultation`; `Explore Services` -> `/#services`.
- [ ] Check contact form validation and real submission confirmation in approved non-production test, without logging private enquiry details.
- [ ] Check Lighthouse mobile LCP / CLS; confirm the hero image preload and CSS do not introduce layout shift.

## Owner admin integration (signed-in preview only)
- [ ] /admin redirects unauthenticated access to login view; invalid sessions cannot view dashboard details.
- [ ] Valid Preview admin login displays dashboard and handles logout/expiry.
- [ ] Owner sign-in link from public homepage footer opens /admin and does not expose admin credentials.
- [ ] Website sections map lists Articles, Blog posts, Free resources, Ebooks, Workshop albums, Gallery albums, Team members, Partners/sponsors and Testimonials.
- [ ] Each public link opens the corresponding existing resource page or community section.
- [ ] When a Wix collection is missing, map displays setup-needed rather than falsely reporting connected.
- [ ] When one Wix endpoint errors, remaining collection statuses render.
- [ ] Verify Wix CMS changes to **published** test content actually appear on the public preview and detail routes after cache expiry.
- [ ] `#publisher` links open direct draft editor for Books, Free resources and Articles; Wix-only categories open Wix management.
- [ ] Wix Ebooks draft collection `Import5__drafts` currently returned 404 because draft plugin was disabled in prior audit. Do not turn drafts on without backing up 3 published R75 ebooks and obtaining owner approval.
- [ ] Validate uploads only in authorized preview, with approved non-sensitive cover and free PDF; verify size, type, CSRF, HTTPS upload origin, and no auto-publish.
- [ ] Confirm paid PDFs remain disallowed from public upload; never place paid files in a public Wix media URL.

## Operations / release blockers
- [ ] Review and fix unprotected `api/send-test-purchase-email.js` from main (PR #71) before production promotion.
- [ ] Review rate-limit identity / forwarded IP trust configuration (PR #62), test behind real Vercel proxy.
- [ ] Verify PayFast ITN idempotency, sandbox callbacks, failed/pending/paid orders without charging live cards.
- [ ] Verify signed paid download behavior and private storage plan; known risk: redirecting to a public Wix media URL exposes a reusable final URL.
- [ ] Check enquiry backend response/error handling, email delivery and no PII in logs.
- [ ] Verify GA4 *actual* connected read-only analytics, else display "not connected" and no invented figures.
- [ ] Run source checks: `npm run lint && npm run typecheck && npm test && npm run build`.
- [ ] Check Vercel preview deployment READY, inspect browser console/network for JS errors, and confirm existing bookstore/cart/checkout routes untouched.
- [ ] Obtain explicit owner release approval only after documented outcomes, security blockers addressed and backup/rollback path confirmed.

## Result recording
Record each item as PASS / FAIL / BLOCKED / NOT RUN, include screenshot/browser/date and reproducible steps. Keep secret values and personal customer data out of evidence.

**Rollback:** Preview-only changes can be reverted on `feature/owner-dashboard-direct-uploads` if regression is found. Do not promote an untested preview to production.
