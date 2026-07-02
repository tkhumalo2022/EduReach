export interface WixBaseContent {
  id: string;
  type: "articles" | "ebooks" | "downloads" | "workshops" | "gallery" | "blogs" | "team" | "partners" | "testimonials";
  label: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: WixImage | null;
  author: string;
  category: string;
  tags: string[];
  date: string;
  featured: boolean;
  isFree: boolean;
  accessType: "free" | "paid";
  seoTitle: string;
  seoDescription: string;
  detailUrl: string;
  ctaLabel: string;
  contentBlocks: WixContentBlock[];
  price: number | string;
  currency: string;
  storeProductId: string;
  fileUrl: string;
  previewUrl: string;
  mediaGallery: WixImage[];
  role: string;
  organization: string;
  qualifications: string;
  specialties: string[];
  email: string;
  phone: string;
  linkedinUrl: string;
  websiteUrl: string;
  partnerType: string;
  sponsorTier: string;
  contribution: string;
  quote: string;
  rating: number | string;
  sortOrder: number | string;
}

export interface WixImage {
  url: string;
  alt: string;
  caption?: string;
}

export type WixContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; items: string[] }
  | { type: "image"; url: string; alt: string };

export interface WixArticle extends WixBaseContent {
  type: "articles";
  references: string;
}

export interface WixEbook extends WixBaseContent {
  type: "ebooks";
  fileType: "PDF" | string;
}

export interface WixDownload extends WixBaseContent {
  type: "downloads";
  fileType: string;
}

export interface WixWorkshopAlbum extends WixBaseContent {
  type: "workshops";
  location: string;
  relatedProgramme: string;
  photographerCredit: string;
}

export interface WixGalleryAlbum extends WixBaseContent {
  type: "gallery";
  location: string;
  photographerCredit: string;
}

export interface WixBlogPost extends WixBaseContent {
  type: "blogs";
}

export interface WixTeamMember extends WixBaseContent {
  type: "team";
}

export interface WixPartner extends WixBaseContent {
  type: "partners";
}

export interface WixTestimonial extends WixBaseContent {
  type: "testimonials";
}

export interface WixCategory {
  name: string;
  slug: string;
  description: string;
  resourceType: string;
  active: boolean;
}

export type WixEduReachContent =
  | WixArticle
  | WixEbook
  | WixDownload
  | WixWorkshopAlbum
  | WixGalleryAlbum
  | WixBlogPost
  | WixTeamMember
  | WixPartner
  | WixTestimonial;
