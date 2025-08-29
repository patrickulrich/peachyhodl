import { useHead } from '@unhead/react';

interface PersonStructuredDataProps {
  name: string;
  alternateName?: string;
  description?: string;
  url?: string;
  image?: string;
  sameAs?: string[];
  jobTitle?: string;
  worksFor?: string;
}

interface MusicStructuredDataProps {
  name: string;
  artist: string;
  album?: string;
  duration?: string;
  genre?: string;
  url?: string;
  image?: string;
  description?: string;
}

interface ArticleStructuredDataProps {
  headline: string;
  description: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  url?: string;
  keywords?: string[];
}

interface WebSiteStructuredDataProps {
  name: string;
  url: string;
  description?: string;
  potentialAction?: {
    target: string;
    queryInput: string;
  };
}

/**
 * Person structured data for Peachy's profile
 */
export function PersonStructuredData({
  name,
  alternateName,
  description,
  url,
  image,
  sameAs,
  jobTitle,
  worksFor,
}: PersonStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    alternateName,
    description,
    url,
    image,
    sameAs,
    jobTitle,
    worksFor,
    knowsAbout: [
      "Bitcoin",
      "Cryptocurrency", 
      "Lightning Network",
      "Nostr Protocol",
      "Music Streaming",
      "Gaming",
      "Content Creation"
    ],
    subjectOf: {
      "@type": "WebSite",
      name: "PeachyHODL",
      url: "https://peachyhodl.com",
      description: "Bitcoin music, gaming, and Nostr community content"
    }
  };

  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(structuredData),
      },
    ],
  });

  return null;
}

/**
 * Music track structured data for Wavlake content
 */
export function MusicStructuredData({
  name,
  artist,
  album,
  duration,
  genre,
  url,
  image,
  description,
}: MusicStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name,
    byArtist: {
      "@type": "Person",
      name: artist,
    },
    inAlbum: album ? {
      "@type": "MusicAlbum", 
      name: album,
    } : undefined,
    duration,
    genre: genre || "Bitcoin Music",
    url,
    image,
    description,
    publisher: {
      "@type": "Organization",
      name: "Wavlake",
      url: "https://wavlake.com",
      description: "Bitcoin-native music streaming platform"
    },
    payment: {
      "@type": "PaymentMethod",
      name: "Lightning Network",
      description: "Support artists with Bitcoin Lightning payments"
    }
  };

  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(structuredData),
      },
    ],
  });

  return null;
}

/**
 * Blog article structured data
 */
export function ArticleStructuredData({
  headline,
  description,
  author,
  datePublished,
  dateModified,
  image,
  url,
  keywords,
}: ArticleStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline,
    description,
    author: {
      "@type": "Person",
      name: author,
      url: "https://peachyhodl.com/about"
    },
    datePublished,
    dateModified: dateModified || datePublished,
    image,
    url,
    keywords,
    publisher: {
      "@type": "Organization",
      name: "PeachyHODL",
      url: "https://peachyhodl.com",
      logo: {
        "@type": "ImageObject",
        url: "https://peachyhodl.com/logo.png",
        width: 512,
        height: 512
      }
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url
    },
    about: [
      {
        "@type": "Thing",
        name: "Bitcoin",
        description: "Decentralized digital currency"
      },
      {
        "@type": "Thing", 
        name: "Cryptocurrency",
        description: "Digital or virtual currency secured by cryptography"
      }
    ]
  };

  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(structuredData),
      },
    ],
  });

  return null;
}

/**
 * Website structured data with search functionality
 */
export function WebSiteStructuredData({
  name,
  url,
  description,
  potentialAction,
}: WebSiteStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    description,
    potentialAction: potentialAction ? {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: potentialAction.target
      },
      "query-input": potentialAction.queryInput
    } : undefined,
    about: [
      {
        "@type": "Thing",
        name: "Bitcoin",
        alternateName: "BTC"
      },
      {
        "@type": "Thing",
        name: "Music Streaming"
      },
      {
        "@type": "Thing", 
        name: "Gaming"
      },
      {
        "@type": "Thing",
        name: "Nostr Protocol"
      }
    ],
    audience: {
      "@type": "Audience",
      audienceType: "Bitcoin enthusiasts, music lovers, gamers"
    }
  };

  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(structuredData),
      },
    ],
  });

  return null;
}

/**
 * Organization structured data for PeachyHODL
 */
export function OrganizationStructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PeachyHODL",
    alternateName: "Peachy",
    url: "https://peachyhodl.com",
    description: "Bitcoin content creation focusing on music, gaming, and Nostr protocol adoption",
    foundingDate: "2023",
    founder: {
      "@type": "Person",
      name: "Peachy"
    },
    knowsAbout: [
      "Bitcoin",
      "Lightning Network", 
      "Nostr Protocol",
      "Wavlake Music Platform",
      "Cryptocurrency Gaming",
      "Decentralized Social Media"
    ],
    sameAs: [
      "https://x.com/peachyhodl",
      "https://www.tiktok.com/@peachyhodl",
      "https://peachyhodl.com"
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Social Media",
      availableLanguage: "English"
    }
  };

  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(structuredData),
      },
    ],
  });

  return null;
}