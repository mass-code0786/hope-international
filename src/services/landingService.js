const crypto = require('crypto');
const { withTransaction } = require('../db/pool');
const landingRepository = require('../repositories/landingRepository');

function mapMediaSlot(slot, definition) {
  return {
    slotKey: definition.slotKey,
    title: definition.title,
    sectionKey: definition.sectionKey,
    description: definition.description,
    imageUrl: slot?.image_url || '',
    altText: slot?.alt_text || ''
  };
}

function formatPriceLabel(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return `Starting at ${amount.toFixed(2)}`;
}

function mapFeaturedItem(item) {
  const resolvedTitle = item.title || item.product_name || 'Hope product';
  const resolvedDescription = item.description || item.product_description || 'See what is available on Hope International.';
  const resolvedImageUrl = item.image_url || item.product_image_url || '';
  const resolvedPriceLabel = item.price_label || formatPriceLabel(item.product_price) || item.promo_text || 'Featured';

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

  const [settings, statsRow, featuredItems, contentBlocks, testimonials, countries, actualMembers, actualReviews, mediaSlots] = await Promise.all([
    landingRepository.getSettings(),
    landingRepository.getStats(),
    landingRepository.listFeaturedItems(null, { onlyActive: true }),
    landingRepository.listContentBlocks(null, { onlyActive: true }),
    landingRepository.listTestimonials(null, { onlyActive: true }),
    landingRepository.listCountries(null, { onlyActive: true }),
    landingRepository.countRegisteredMembers(),
    landingRepository.countActiveTestimonials(),
    landingRepository.listMediaSlots()
  ]);

  const visibility = settings?.section_visibility || landingRepository.DEFAULT_SECTION_VISIBILITY;
  const order = Array.isArray(settings?.section_order) ? settings.section_order : landingRepository.DEFAULT_SECTION_ORDER;
  const mediaSlotMap = new Map(mediaSlots.map((slot) => [slot.slot_key, slot]));
  const media = landingRepository.LANDING_MEDIA_SLOT_DEFINITIONS.reduce((accumulator, definition) => {
    accumulator[definition.slotKey] = mapMediaSlot(mediaSlotMap.get(definition.slotKey), definition);
    return accumulator;
  }, {});

  return {
    settings: {
      heroBadge: settings?.hero_badge || 'Hope International',
      heroHeadline: settings?.hero_headline || 'Products, offers, and updates in one place.',
      heroSubheadline: settings?.hero_subheadline || 'Browse featured products, see what Hope International offers, and create an account when you are ready.',
      heroPrimaryCtaText: settings?.hero_primary_cta_text || 'Create account',
      heroSecondaryCtaText: settings?.hero_secondary_cta_text || 'Login',
      heroImageUrl: settings?.hero_image_url || '',
      heroBackgroundNote: settings?.hero_background_note || 'Available across multiple countries',
      featuredSectionTitle: settings?.featured_section_title || 'Featured products',
      benefitsSectionTitle: settings?.benefits_section_title || 'Why choose Hope',
      detailsSectionTitle: settings?.details_section_title || 'More to explore',
      testimonialsSectionTitle: settings?.testimonials_section_title || 'What members say',
      statsSectionTitle: settings?.stats_section_title || 'At a glance',
      countriesSectionTitle: settings?.countries_section_title || 'Serving members globally',
      footerSupportText: settings?.footer_support_text || 'Need help getting started? Contact the Hope International support team.',
      footerContactEmail: settings?.footer_contact_email || 'support@hopeinternational.local',
      sectionOrder: order,
      sectionVisibility: visibility
    },
    featuredItems: featuredItems.map(mapFeaturedItem),
    benefits: contentBlocks.filter((item) => item.section_key === 'benefits').map(mapContentBlock),
    details: contentBlocks.filter((item) => item.section_key === 'details').map(mapContentBlock),
    testimonials: testimonials.map(mapTestimonial),
    countries: countries.map(mapCountry),
    stats: buildDisplayStats(statsRow, actualMembers, actualReviews),
    media
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
