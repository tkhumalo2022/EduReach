import assert from "node:assert/strict";
import test from "node:test";

import { readWixConfig } from "../src/lib/wixClient.js";

const FINAL_COLLECTION_IDS = {
  articles: "articles",
  blogs: "blogPosts",
  ebooks: "Import5",
  downloads: "downloadableResources",
  workshops: "workshopAlbums",
  gallery: "galleryAlbums",
  team: "teamMembers",
  partners: "partnersSponsors",
  testimonials: "testimonials"
};

test("uses the final Wix CMS collection IDs by default", () => {
  const config = readWixConfig({});

  assert.deepEqual(config.collections, FINAL_COLLECTION_IDS);
});

test("normalizes Wix collection display names to final collection IDs", () => {
  const config = readWixConfig({
    WIX_ARTICLES_COLLECTION_ID: "Articles",
    WIX_BLOGS_COLLECTION_ID: "Blog Posts",
    WIX_EBOOKS_COLLECTION_ID: "Ebooks",
    WIX_DOWNLOADS_COLLECTION_ID: "Downloadable Resources",
    WIX_WORKSHOP_ALBUMS_COLLECTION_ID: "Workshop Albums",
    WIX_GALLERY_ALBUMS_COLLECTION_ID: "Gallery Albums",
    WIX_TEAM_MEMBERS_COLLECTION_ID: "Team Members",
    WIX_PARTNERS_SPONSORS_COLLECTION_ID: "Partners / Sponsors",
    WIX_TESTIMONIALS_COLLECTION_ID: "Testimonials"
  });

  assert.deepEqual(config.collections, FINAL_COLLECTION_IDS);
});

test("keeps final collection IDs authoritative over unexpected env values", () => {
  const config = readWixConfig({
    WIX_ARTICLES_COLLECTION_ID: "removedArticles",
    WIX_BLOGS_COLLECTION_ID: "removedBlogPosts",
    WIX_EBOOKS_COLLECTION_ID: "removedEbooks",
    WIX_DOWNLOADS_COLLECTION_ID: "removedDownloads",
    WIX_WORKSHOP_ALBUMS_COLLECTION_ID: "removedWorkshopAlbums",
    WIX_GALLERY_ALBUMS_COLLECTION_ID: "removedGalleryAlbums",
    WIX_TEAM_MEMBERS_COLLECTION_ID: "removedTeamMembers",
    WIX_PARTNERS_SPONSORS_COLLECTION_ID: "removedPartnersSponsors",
    WIX_TESTIMONIALS_COLLECTION_ID: "removedTestimonials"
  });

  assert.deepEqual(config.collections, FINAL_COLLECTION_IDS);
});
