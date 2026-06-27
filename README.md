# EduReach Website

A responsive one-page website for EduReach Inclusive Education Consultancy.

## Sections

- Hero section
- About section
- Services section
- WhatsApp call-to-action
- Contact form
- Responsive mobile navigation
- Foundational SEO metadata
- Local website images in `assets/images`
- Current EduReach logo crop at `assets/logo.png`
- Current EduReach logo mark at `assets/logo-mark.png`
- Services flyer at `assets/images/edureach-services-flyer.png`

## Before publishing

Open `site-config.js` and add:

- `whatsappNumber` in international format without spaces or `+`
- `contactEmail` for contact enquiries

Example:

```js
window.EDUREACH_CONFIG = {
  whatsappNumber: "27821234567",
  contactEmail: "hello@example.com"
};
```

## Run locally

Open `index.html` in a browser, or use the VS Code Live Server extension.

## Deploy on Vercel

Import the GitHub repository in Vercel. This is a static website, so no build command is required.
