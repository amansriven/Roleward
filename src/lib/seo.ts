import type { Metadata } from "next";

export const SITE_NAME = "Roleward";
export const SITE_URL = "https://roleward.org";
export const DEFAULT_TITLE = "Roleward | AI Job Search & Interview Preparation";
export const DEFAULT_DESCRIPTION =
  "Roleward is an AI job search assistant for internship and job applications, resume tailoring, coding practice, and mock interview preparation.";

const socialImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Roleward — one contextualized AI workspace for your entire job search",
};

export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: `/${string}` | "/";
}): Metadata {
  const shareTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: SITE_NAME,
      title: shareTitle,
      description,
      url: path,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
      images: [socialImage.url],
    },
  };
}

export const noIndexMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    noimageindex: true,
    nosnippet: true,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
      noimageindex: true,
      nosnippet: true,
    },
  },
};

export const homeStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/roleward-logo.png`,
        contentUrl: `${SITE_URL}/roleward-logo.png`,
        width: 512,
        height: 512,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: "Roleward AI",
      description: DEFAULT_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#application`,
      name: SITE_NAME,
      url: SITE_URL,
      description: DEFAULT_DESCRIPTION,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript and a modern web browser.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        category: "free",
        url: `${SITE_URL}/pricing`,
      },
      featureList: [
        "Internship and job application tracking",
        "AI resume review and evidence-backed tailoring",
        "Role-aware coding interview practice",
        "Behavioral mock interviews and interview preparation",
        "Unified career preparation plan",
      ],
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};
