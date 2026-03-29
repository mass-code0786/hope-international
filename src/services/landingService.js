const crypto = require('crypto');
const { withTransaction } = require('../db/pool');
const landingRepository = require('../repositories/landingRepository');

function formatPriceLabel(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return `Starting at ${amount.toFixed(2)}`;
}

function mapFeaturedItem(item) {
  const resolvedTitle = item.title || item.product_name || 'Hope Marketplace Offer';
  const resolvedDescription = item.description || item.product_description || 'Discover a featured Hope International opportunity.';
  const resolvedImageUrl = item.image_url || item.product_image_url || '';
  const resolvedPriceLabel = item.price_label || formatPriceLabel(item.product_price) || item.promo_text || 'Featured access';

  return {
    id: item.id,
    productId: item.product_id || null,
    title: resolvedTitle,
    description: resolvedDescription,
    imageUrl: resolvedImageUrl,
    priceLabel: resolvedPriceLabel,
    promoText: item.promo_text || item.product_category || 'Featured',
    ctaText: item.cta_text || 'Explore',
    targetLink: item.target_link || '/register',
    sortOrder: item.sort_order || 0,
    isActive: Boolean(item.is_active)
  };
}

function mapContentBlock(block) {
  return {
    id: block.id,
    sectionKey: block.section_key,
    title: block.title,
    subtitle: block.subtitle || '',
    bodyText: block.body_text || '',
    imageUrl: block.image_url || '',
    iconName: block.icon_name || '',
    accentLabel: block.accent_label || '',
    ctaText: block.cta_text || '',
    targetLink: block.target_link || '',
    layoutStyle: block.layout_style || 'icon-card',
    sortOrder: block.sort_order || 0,
    isActive: Boolean(block.is_active)
  };
}

function mapTestimonial(item) {
  return {
    id: item.id,
    reviewerName: item.reviewer_name,
    reviewerRole: item.reviewer_role || '',
    reviewText: item.review_text,
    rating: Number(item.rating || 5),
    avatarUrl: item.avatar_url || '',
    sortOrder: item.sort_order || 0,
    isActive: Boolean(item.is_active)
  };
}

function mapCountry(item) {
  return {
    id: item.id,
    countryCode: item.country_code,
    countryName: item.country_name,
    flagEmoji: item.flag_emoji,
    sortOrder: item.sort_order || 0,
    isActive: Boolean(item.is_active)
  };
}

function buildDisplayStats(statsRow, actualMembers, actualReviews) {
  return {
    totalVisitors: Number(statsRow?.total_visitors_override ?? statsRow?.total_visitors ?? 0),
    totalReviews: Number(statsRow?.total_reviews_override ?? actualReviews ?? 0),
    totalMembers: Number(statsRow?.total_members_override ?? actualMembers ?? 0)
  };
}

async function getPublicLandingPage() {
  await landingRepository.ensureSingletonRows();

  const [settings, statsRow, featuredItems, contentBlocks, testimonials, countries, actualMembers, actualReviews] = await Promise.all([
    landingRepository.getSettings(),
    landingRepository.getStats(),
    landingRepository.listFeaturedItems(null, { onlyActive: true }),
    landingRepository.listContentBlocks(null, { onlyActive: true }),
    landingRepository.listTestimonials(null, { onlyActive: true }),
    landingRepository.listCountries(null, { onlyActive: true }),
    landingRepository.countRegisteredMembers(),
    landingRepository.countActiveTestimonials()
  ]);

  const visibility = settings?.section_visibility || landingRepository.DEFAULT_SECTION_VISIBILITY;
  const order = Array.isArray(settings?.section_order) ? settings.section_order : landingRepository.DEFAULT_SECTION_ORDER;

  return {
    settings: {
      heroBadge: settings?.hero_badge || 'Hope International',
      heroHeadline: settings?.hero_headline || 'Global commerce with rewards, trust, and premium access.',
      heroSubheadline: settings?.hero_subheadline || 'Discover featured products, business opportunity highlights, and a cleaner path into the Hope International ecosystem.',
      heroPrimaryCtaText: settings?.hero_primary_cta_text || 'Create account',
      heroSecondaryCtaText: settings?.hero_secondary_cta_text || 'Login',
      heroImageUrl: settings?.hero_image_url || '',
      heroBackgroundNote: settings?.hero_background_note || 'Trusted by members across growing markets',
      featuredSectionTitle: settings?.featured_section_title || 'Featured opportunities',
      benefitsSectionTitle: settings?.benefits_section_title || 'Why members choose Hope',
      detailsSectionTitle: settings?.details_section_title || 'Products and opportunity highlights',
      testimonialsSectionTitle: settings?.testimonials_section_title || 'Member voices',
      statsSectionTitle: settings?.stats_section_title || 'Momentum you can see',
      countriesSectionTitle: settings?.countries_section_title || 'Serving members globally',
      footerSupportText: settings?.footer_support_text || 'Need help getting started? Our support team is ready to guide you.',
      footerContactEmail: settings?.footer_contact_email || 'support@hopeinternational.local',
      sectionOrder: order,
      sectionVisibility: visibility
    },
    featuredItems: featuredItems.map(mapFeaturedItem),
    benefits: contentBlocks.filter((item) => item.section_key === 'benefits').map(mapContentBlock),
    details: contentBlocks.filter((item) => item.section_key === 'details').map(mapContentBlock),
    testimonials: testimonials.map(mapTestimonial),
    countries: countries.map(mapCountry),
    stats: buildDisplayStats(statsRow, actualMembers, actualReviews)
  };
}

async function trackLandingVisit(visitorToken) {
  const normalized = String(visitorToken || '').trim();
  if (!normalized || normalized.length < 12 || normalized.length > 200) {
    const statsRow = await landingRepository.getStats();
    const actualMembers = await landingRepository.countRegisteredMembers();
    const actualReviews = await landingRepository.countActiveTestimonials();
    return buildDisplayStats(statsRow, actualMembers, actualReviews);
  }

  const visitorTokenHash = crypto.createHash('sha256').update(normalized).digest('hex');

  return withTransaction(async (client) => {
    await landingRepository.ensureSingletonRows(client);
    const statsRow = await landingRepository.trackVisitor(client, visitorTokenHash);
    const actualMembers = await landingRepository.countRegisteredMembers(client);
    const actualReviews = await landingRepository.countActiveTestimonials(client);
    return buildDisplayStats(statsRow, actualMembers, actualReviews);
  });
}

module.exports = {
  getPublicLandingPage,
  trackLandingVisit
};
