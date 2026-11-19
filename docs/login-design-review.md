# Login design review — 19 November 2026

Source: https://github.com/LemonFace0309/charles-skills
Reviewed commit: baf4272436fb65bc83e01e15b7d95755488d92ee
Reference: skills/design/charles-unslop/SKILL.md, references/signs.md and references/tokens.md.
The source was cloned as a reference on the laptop. No upstream CLI, install hook, runtime script or auto-update was used.

Credit: Charles Liu's charles-unslop, adapted from unslop by Damir Sokolovsky (@heydamir), CC BY 4.0, merged with Emil Kowalski's unslop-design. The principles were applied to this site's existing identity; no upstream runtime code was copied.

Scope: presentation of the existing login screen, responsive controls, keyboard focus and password visibility. API routes, credentials, allowlists, cookie settings, rates and authorization were preserved.

Verification: real pages at 1440×900, 1366×768, 390×844 and 320×740, with overflow, visible assets and input text size checks. Form feedback and the handoff to the existing dashboard were exercised with browser-only test responses. These tests do not establish successful production-account authentication. No real credentials or learner/customer data were used.

Direction: a publishing doorway within EduReach's existing classroom scene. Keep the official mark, teal action and readable white form; the mobile composition brings the classroom above the form.
Audit: generic greeting; repeated security labels; ER tile duplicating the logo; split blue marketing panel; three workflow cards distracting from login.
Changes: the authenticator disclosure and existing password requirements remain available. The classroom image was converted from the existing 1,700,268-byte PNG to an 89,184-byte WebP. No new people or claims were generated.
Base: origin/main (4839e7c).
Checks: JavaScript build validation (41 files); 12 admin auth/API/release tests.
Local review: http://127.0.0.1:4312/admin/
