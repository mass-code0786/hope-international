const crypto = require('crypto');
const { withTransaction } = require('../db/pool');
const landingRepository = require('../repositories/landingRepository');
const landingMediaStorageService = require('./landingMediaStorageService');
const { getCacheEntry, setCacheEntry } = require('../utils/runtimeCache');
const { withPerfSpan } = require('../utils/perf');

const PUBLIC_LANDING_CACHE_KEY = 'landing:public-page';
const PUBLIC_LANDING_CACHE_TTL_MS = 30 * 1000;
const LANDING_STATS_CACHE_TTL_MS = 30 * 1000;

async function mapMediaSlot(slot, definition) {
  const imageUrl = await landingMediaStorageService.resolveRenderableMediaUrl(slot?.image_url || '');
  return {
    slotKey: definition.slotKey,
    title: definition.title,
    sectionKey: definition.sectionKey,
    description: definition.description,
    imageUrl,
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
    targetLink: item.target_link || '/login',
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
  const cached = getCacheEntry(PUBLIC_LANDING_CACHE_KEY);
  if (cached) return cached;

  return withPerfSpan('landing.public-page', async () => {
    await landingRepository.ensureSingletonRows();

    const [settings, statsRow, featuredItems, contentBlocks, testimonials, countries, actualMembers, mediaSlots] = await Promise.all([
      landingRepository.getSettings(),
      landingRepository.getStats(),
      landingRepository.listFeaturedItems(null, { onlyActive: true }),
      landingRepository.listContentBlocks(null, { onlyActive: true }),
      landingRepository.listTestimonials(null, { onlyActive: true }),
      landingRepository.listCountries(null, { onlyActive: true }),
      landingRepository.countRegisteredMembers(),
      landingRepository.listMediaSlots()
    ]);

    const visibility = settings?.section_visibility || landingRepository.DEFAULT_SECTION_VISIBILITY;
    const order = Array.isArray(settings?.section_order) ? settings.section_order : landingRepository.DEFAULT_SECTION_ORDER;
    const mediaSlotMap = new Map(mediaSlots.map((slot) => [slot.slot_key, slot]));
    const mediaEntries = await Promise.all(
      landingRepository.LANDING_MEDIA_SLOT_DEFINITIONS.map(async (definition) => ([
        definition.slotKey,
        await mapMediaSlot(mediaSlotMap.get(definition.slotKey), definition)
      ]))
    );
    const media = Object.fromEntries(mediaEntries);

    return setCacheEntry(PUBLIC_LANDING_CACHE_KEY, {
      settings: {
        heroBadge: settings?.hero_badge || 'Hope International',
        heroHeadline: settings?.hero_headline || 'Products, offers, and updates in one place.',
        heroSubheadline: settings?.hero_subheadline || 'Browse featured products, see what Hope International offers, and connect with a sponsor when you are ready to join.',
        heroPrimaryCtaText: settings?.hero_primary_cta_text || 'Member login',
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
      stats: buildDisplayStats(statsRow, actualMembers, testimonials.length),
      media
    }, PUBLIC_LANDING_CACHE_TTL_MS);
  }, { thresholdMs: 120 });
}

async function trackLandingVisit(visitorToken) {
  const normalized = String(visitorToken || '').trim();
  if (!normalized || normalized.length < 12 || normalized.length > 200) {
    const statsCacheKey = 'landing:stats-only';
    const cachedStats = getCacheEntry(statsCacheKey);
    if (cachedStats) return cachedStats;
    const stats = await withPerfSpan('landing.stats-only', async () => {
      const [statsRow, actualMembers, actualReviews] = await Promise.all([
        landingRepository.getStats(),
        landingRepository.countRegisteredMembers(),
        landingRepository.countActiveTestimonials()
      ]);
      return buildDisplayStats(statsRow, actualMembers, actualReviews);
    }, { thresholdMs: 120 });
    return setCacheEntry(statsCacheKey, stats, LANDING_STATS_CACHE_TTL_MS);
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
