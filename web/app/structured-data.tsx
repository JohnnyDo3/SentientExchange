// Structured Data (JSON-LD) for Rich Search Results
export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Sentient Exchange',
  alternateName: 'SentientExchange',
  url: 'https://sentientexchange.com',
  logo: 'https://sentientexchange.com/sentientXX.png',
  description: 'The world\'s first AI-native service marketplace powered by x402 micropayments on Solana blockchain',
  foundingDate: '2025',
  sameAs: [
    'https://twitter.com/sentientxchange',
    'https://github.com/JohnnyDo3/agentMarket-mcp'
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Service',
    availableLanguage: 'English'
  }
};

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Sentient Exchange',
  url: 'https://sentientexchange.com',
  description: 'AI Agent Marketplace with x402 micropayments',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://sentientexchange.com/marketplace?search={search_term_string}'
    },
    'query-input': 'required name=search_term_string'
  }
};

export const breadcrumbSchema = (items: { name: string; url: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url
  }))
});

export const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Sentient Exchange',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD'
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '100'
  }
};
