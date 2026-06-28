# EduReach Website

A modern, responsive one-page website for EduReach, an Inclusive Education Consultancy based in South Africa.

## What is included

- Sticky navigation with smooth scrolling
- Full-bleed hero section with placeholder imagery
- Impact statistics placeholders
- Editable founder information section
- Why Choose EduReach feature cards
- Featured services and all-services grid
- Five-School Learner Support Pilot process timeline
- Five-step How We Work timeline
- Placeholder testimonials and resources
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

Search for `TODO:` comments in `index.html`, `site-config.js` and `styles.css`. They mark the places a beginner developer can safely update copy, statistics, founder details, testimonials, resources, social links and contact settings.

## Images

Current images are placeholder assets in `assets/images`. Replace them with final approved images when ready. Do not add personal founder images until the founder has approved the final file.

Suggested final names:

- `assets/images/hero.jpg`
- `assets/images/founder.jpg`
- `assets/images/classroom.jpg`

## Run locally

Open `index.html` in a browser, or use the VS Code Live Server extension. No build step is required.
