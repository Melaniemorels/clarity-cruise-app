import { useEffect } from "react";

const APP_ORIGIN = "https://vyvapp.com";
const DEFAULT_IMAGE = `${APP_ORIGIN}/opengraph.jpg`;
const DEFAULT_TITLE = "VYV - Visualize Your Vibe";
const DEFAULT_DESCRIPTION =
  "A wellbeing planner that gives time back. Plan your perfect day, discover great content, and connect with friends.";

export interface PageMetaOptions {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogType?: string;
  ogImage?: string;
  jsonLd?: object | null;
}

function setMeta(selector: string, attr: string, value: string) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    const [attrName, attrValue] = selector
      .replace(/\[|\]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .join("=")
      .split("=") as [string, string];
    el.setAttribute(attrName, attrValue.replace(/"/g, ""));
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(data: object | null) {
  const existing = document.head.querySelector('script[data-vyv-jsonld]');
  if (existing) {
    existing.remove();
  }
  if (!data) return;
  const script = document.createElement("script");
  script.setAttribute("type", "application/ld+json");
  script.setAttribute("data-vyv-jsonld", "1");
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

export function usePageMeta({
  title,
  description,
  canonicalPath,
  ogType = "website",
  ogImage,
  jsonLd = null,
}: PageMetaOptions) {
  useEffect(() => {
    const resolvedTitle = title ? `${title} | VYV` : DEFAULT_TITLE;
    const resolvedDescription = description ?? DEFAULT_DESCRIPTION;
    const resolvedImage = ogImage ?? DEFAULT_IMAGE;
    const resolvedUrl = canonicalPath
      ? `${APP_ORIGIN}${canonicalPath}`
      : APP_ORIGIN;

    document.title = resolvedTitle;

    setMeta('meta[name="description"]', "content", resolvedDescription);

    setMeta('meta[property="og:title"]', "content", resolvedTitle);
    setMeta('meta[property="og:description"]', "content", resolvedDescription);
    setMeta('meta[property="og:type"]', "content", ogType);
    setMeta('meta[property="og:url"]', "content", resolvedUrl);
    setMeta('meta[property="og:image"]', "content", resolvedImage);

    setMeta('meta[name="twitter:title"]', "content", resolvedTitle);
    setMeta('meta[name="twitter:description"]', "content", resolvedDescription);
    setMeta('meta[name="twitter:image"]', "content", resolvedImage);

    setCanonical(resolvedUrl);
    setJsonLd(jsonLd);

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('meta[name="description"]', "content", DEFAULT_DESCRIPTION);
      setMeta('meta[property="og:title"]', "content", DEFAULT_TITLE);
      setMeta('meta[property="og:description"]', "content", DEFAULT_DESCRIPTION);
      setMeta('meta[property="og:type"]', "content", "website");
      setMeta('meta[property="og:url"]', "content", APP_ORIGIN);
      setMeta('meta[property="og:image"]', "content", DEFAULT_IMAGE);
      setMeta('meta[name="twitter:title"]', "content", DEFAULT_TITLE);
      setMeta('meta[name="twitter:description"]', "content", DEFAULT_DESCRIPTION);
      setMeta('meta[name="twitter:image"]', "content", DEFAULT_IMAGE);
      setCanonical(APP_ORIGIN);
      setJsonLd(null);
    };
  }, [title, description, canonicalPath, ogType, ogImage, jsonLd]);
}
