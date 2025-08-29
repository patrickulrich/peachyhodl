import { useSeoMeta } from '@unhead/react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'music.song' | 'music.album' | 'music.playlist';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'player';
}

const DEFAULT_SEO = {
  siteName: 'PeachyHODL',
  title: 'PeachyHODL - Bitcoin Music, Gaming & Nostr Community',
  description: 'Join Peachy for Bitcoin music on Wavlake, gaming streams, and decentralized social experiences on Nostr. Bitcoin is the future and it\'s just peachy! 🍑⚡',
  keywords: 'Bitcoin, BTC, Wavlake, Nostr, music streaming, gaming, cryptocurrency, lightning network, decentralized social media, Bitcoin music, hodl, peachy, sats, zaps',
  image: 'https://peachyhodl.com/og-image.jpg',
  url: 'https://peachyhodl.com',
  twitterHandle: '@peachyhodl',
};

/**
 * Comprehensive SEO component optimized for Bitcoin, music, and gaming content
 */
export function SEOHead({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  publishedTime: _publishedTime,
  modifiedTime: _modifiedTime,
  author: _author,
  twitterCard = 'summary_large_image',
}: SEOHeadProps) {
  const fullTitle = title 
    ? `${title} | ${DEFAULT_SEO.siteName}` 
    : DEFAULT_SEO.title;
  
  const fullDescription = description || DEFAULT_SEO.description;
  const _fullKeywords = keywords 
    ? `${DEFAULT_SEO.keywords}, ${keywords}` 
    : DEFAULT_SEO.keywords;
  const fullImage = image || DEFAULT_SEO.image;
  const fullUrl = url || DEFAULT_SEO.url;

  useSeoMeta({
    // Basic SEO
    title: fullTitle,
    description: fullDescription,
    
    // Open Graph (Facebook, Discord, etc.)
    ogType: type,
    ogTitle: fullTitle,
    ogDescription: fullDescription,
    ogImage: fullImage,
    ogUrl: fullUrl,
    ogSiteName: DEFAULT_SEO.siteName,
    
    // Twitter Cards
    twitterCard: twitterCard,
    twitterTitle: fullTitle,
    twitterDescription: fullDescription,
    twitterImage: fullImage,
    
    // Additional meta
    themeColor: '#f7931a', // Bitcoin orange
  });

  return null; // This component only handles meta tags
}

// Predefined SEO configurations for common page types
export const SEO_CONFIGS = {
  home: {
    title: 'PeachyHODL - Bitcoin Music, Gaming & Nostr Community',
    description: 'Join Peachy for Bitcoin music streaming on Wavlake, gaming content, and decentralized social experiences on Nostr. Stack sats, zap creators, and vibe with the community! 🍑⚡',
    keywords: 'Bitcoin, Wavlake, music streaming, gaming, Nostr, lightning network, sats, zaps, hodl',
  },
  
  blog: {
    title: 'Bitcoin Blog - Thoughts on Freedom Money',
    description: 'Peachy\'s thoughts on Bitcoin, Lightning Network, Nostr, and the future of money. Long-form content about cryptocurrency, decentralization, and financial sovereignty.',
    keywords: 'Bitcoin blog, cryptocurrency articles, lightning network, Nostr protocol, financial sovereignty',
    type: 'website' as const,
  },
  
  music: {
    title: 'Bitcoin Music on Wavlake - Stream & Support Artists',
    description: 'Discover and stream Bitcoin-native music on Wavlake. Support artists directly with Lightning Network payments and explore the future of music monetization.',
    keywords: 'Bitcoin music, Wavlake, music streaming, lightning payments, support artists, sats4music',
    type: 'website' as const,
  },
  
  gaming: {
    title: 'Bitcoin Gaming & Live Streams',
    description: 'Watch Peachy play games, discuss Bitcoin gaming innovations, and explore the intersection of cryptocurrency and gaming entertainment.',
    keywords: 'Bitcoin gaming, crypto gaming, live streams, gaming content, blockchain games',
  },
  
  photos: {
    title: 'Photo Gallery - Life in Bitcoin',
    description: 'Visual journey through Bitcoin conferences, meetups, and the crypto lifestyle. Photos from the Bitcoin community and beyond.',
    keywords: 'Bitcoin photos, crypto community, Bitcoin conferences, meetups, lifestyle',
  },
  
  about: {
    title: 'About Peachy - Bitcoin Content Creator',
    description: 'Meet Peachy, a Bitcoin content creator sharing music, gaming, and insights about cryptocurrency and the Nostr protocol. Building on Bitcoin for the future.',
    keywords: 'Peachy, Bitcoin creator, content creator, Nostr, cryptocurrency influencer',
    type: 'website' as const,
  },
} as const;