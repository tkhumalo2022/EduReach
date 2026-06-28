# EduReach Website

A modern, responsive one-page website for EduReach, an Inclusive Education Consultancy based in South Africa.

## What is included

- Sticky navigation with smooth scrolling
- Full-screen storytelling hero with local education imagery
- Our Story section focused on learners, schools, barriers, hope and inclusion
- Editable founder information section
- Philosophy, services and trust-building cards without fake statistics
- Five-School Learner Support Pilot presented as Our Vision
- Resources section with coming-soon cards and future gallery placeholders
- Large consultation call-to-action with background imagery
- Contact form with mailto or endpoint support
- WhatsApp buttons configured through `site-config.js`
- Google Maps placeholder
- SEO metadata and accessible semantic HTML

## Before publishing

Open `site-config.js` and update:

- `whatsappNumber` in international format without spaces or `+`
- `contactEmail` for form enquiries
- `formEndpoint` only if using a form service or custom API

Example:

```js
window.EDUREACH_CONFIG = {
  whatsappNumber: "27821234567",
  contactEmail: "hello@example.com",
  formEndpoint: ""
};
```

## Customise content

Search for `TODO:` comments in `index.html`, `site-config.js` and `styles.css`. They mark the places a beginner developer can safely update founder details, verified qualifications, research interests, approved imagery, resources, social links and contact settings.

Do not add fake statistics, fake testimonials, fake partner logos, fake awards or claims that make EduReach appear older than it is. Build trust through verified founder expertise, mission clarity, practical services and authentic storytelling.

## Images

Current images are placeholder assets in `assets/images`. Replace them with final approved images when ready. Do not add personal founder images until the founder has approved the final file.

Suggested final names:

- `assets/images/hero.jpg`
- `assets/images/founder.jpg`
- `assets/images/classroom.jpg`

## Run locally

Open `index.html` in a browser, or use the VS Code Live Server extension. No build step is required.
