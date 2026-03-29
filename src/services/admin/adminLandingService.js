const { withTransaction } = require('../../db/pool');
const { ApiError } = require('../../utils/ApiError');
const landingRepository = require('../../repositories/landingRepository');
const adminRepository = require('../../repositories/adminRepository');

function buildDisplayStats(statsRow, actualMembers, actualReviews) {
  return {
    totalVisitors: Number(statsRow?.total_visitors_override ?? statsRow?.total_visitors ?? 0),
    totalReviews: Number(statsRow?.total_reviews_override ?? actualReviews ?? 0),
    totalMembers: Number(statsRow?.total_members_override ?? actualMembers ?? 0)
  };
}

function mapAggregate(settings, stats, featuredItems, contentBlocks, testimonials, countries, actualMembers, actualReviews) {
  return {
    settings: {
      heroBadge: settings?.hero_badge || '',
      heroHeadline: settings?.hero_headline || '',
      heroSubheadline: settings?.hero_subheadline || '',
      heroPrimaryCtaText: settings?.hero_primary_cta_text || '',
      heroSecondaryCtaText: settings?.hero_secondary_cta_text || '',
      heroImageUrl: settings?.hero_image_url || '',
      heroBackgroundNote: settings?.hero_background_note || '',
      featuredSectionTitle: settings?.featured_section_title || '',
      benefitsSectionTitle: settings?.benefits_section_title || '',
      detailsSectionTitle: settings?.details_section_title || '',
      testimonialsSectionTitle: settings?.testimonials_section_title || '',
      statsSectionTitle: settings?.stats_section_title || '',
      countriesSectionTitle: settings?.countries_section_title || '',
      footerSupportText: settings?.footer_support_text || '',
      footerContactEmail: settings?.footer_contact_email || '',
      sectionOrder: Array.isArray(settings?.section_order) ? settings.section_order : landingRepository.DEFAULT_SECTION_ORDER,
      sectionVisibility: settings?.section_visibility || landingRepository.DEFAULT_SECTION_VISIBILITY
    },
    stats: {
      totalVisitors: Number(stats?.total_visitors || 0),
      totalVisitorsOverride: stats?.total_visitors_override === null ? null : Number(stats?.total_visitors_override || 0),
      totalReviewsOverride: stats?.total_reviews_override === null ? null : Number(stats?.total_reviews_override || 0),
      totalMembersOverride: stats?.total_members_override === null ? null : Number(stats?.total_members_override || 0),
      actualReviews,
      actualMembers,
      display: buildDisplayStats(stats, actualMembers, actualReviews)
    },
    featuredItems,
    contentBlocks,
    testimonials,
    countries
  };
}

async function getLandingAdminState() {
  await landingRepository.ensureSingletonRows();
  const [settings, stats, featuredItems, contentBlocks, testimonials, countries, actualMembers, actualReviews] = await Promise.all([
    landingRepository.getSettings(),
    landingRepository.getStats(),
    landingRepository.listFeaturedItems(),
    landingRepository.listContentBlocks(),
    landingRepository.listTestimonials(),
    landingRepository.listCountries(),
    landingRepository.countRegisteredMembers(),
    landingRepository.countActiveTestimonials()
  ]);

  return mapAggregate(settings, stats, featuredItems, contentBlocks, testimonials, countries, actualMembers, actualReviews);
}

async function updateLandingSettings(adminUserId, payload) {
  return withTransaction(async (client) => {
    await landingRepository.ensureSingletonRows(client);
    const before = await landingRepository.getSettings(client);
    const merged = {
      heroBadge: payload.heroBadge ?? before.hero_badge,
      heroHeadline: payload.heroHeadline ?? before.hero_headline,
      heroSubheadline: payload.heroSubheadline ?? before.hero_subheadline,
      heroPrimaryCtaText: payload.heroPrimaryCtaText ?? before.hero_primary_cta_text,
      heroSecondaryCtaText: payload.heroSecondaryCtaText ?? before.hero_secondary_cta_text,
      heroImageUrl: payload.heroImageUrl ?? before.hero_image_url,
      heroBackgroundNote: payload.heroBackgroundNote ?? before.hero_background_note,
      featuredSectionTitle: payload.featuredSectionTitle ?? before.featured_section_title,
      benefitsSectionTitle: payload.benefitsSectionTitle ?? before.benefits_section_title,
      detailsSectionTitle: payload.detailsSectionTitle ?? before.details_section_title,
      testimonialsSectionTitle: payload.testimonialsSectionTitle ?? before.testimonials_section_title,
      statsSectionTitle: payload.statsSectionTitle ?? before.stats_section_title,
      countriesSectionTitle: payload.countriesSectionTitle ?? before.countries_section_title,
      footerSupportText: payload.footerSupportText ?? before.footer_support_text,
      footerContactEmail: payload.footerContactEmail ?? before.footer_contact_email,
      sectionOrder: payload.sectionOrder ?? before.section_order,
      sectionVisibility: payload.sectionVisibility ?? before.section_visibility
    };

    const updated = await landingRepository.updateSettings(client, merged);

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'landing.settings.update',
      targetEntity: 'landing_page_settings',
      targetId: 'landing-settings',
      beforeData: before,
      afterData: updated,
      metadata: { heroHeadline: updated?.hero_headline }
    });

    return updated;
  });
}

async function updateLandingStats(adminUserId, payload) {
  return withTransaction(async (client) => {
    await landingRepository.ensureSingletonRows(client);
    const before = await landingRepository.getStats(client);
    const merged = {
      totalVisitors: payload.totalVisitors ?? before.total_visitors,
      totalVisitorsOverride: Object.prototype.hasOwnProperty.call(payload, 'totalVisitorsOverride') ? payload.totalVisitorsOverride : before.total_visitors_override,
      totalReviewsOverride: Object.prototype.hasOwnProperty.call(payload, 'totalReviewsOverride') ? payload.totalReviewsOverride : before.total_reviews_override,
      totalMembersOverride: Object.prototype.hasOwnProperty.call(payload, 'totalMembersOverride') ? payload.totalMembersOverride : before.total_members_override
    };

    const updated = await landingRepository.updateStats(client, merged);

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'landing.stats.update',
      targetEntity: 'landing_page_stats',
      targetId: 'landing-stats',
      beforeData: before,
      afterData: updated,
      metadata: { totalVisitors: updated?.total_visitors }
    });

    return updated;
  });
}

async function createLandingEntity(adminUserId, entity, payload) {
  return withTransaction(async (client) => {
    let created;

    if (entity === 'featured-item') created = await landingRepository.createFeaturedItem(client, payload);
    if (entity === 'content-block') created = await landingRepository.createContentBlock(client, payload);
    if (entity === 'testimonial') created = await landingRepository.createTestimonial(client, payload);
    if (entity === 'country') created = await landingRepository.createCountry(client, payload);

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: `landing.${entity}.create`,
      targetEntity: `landing_${entity}`,
      targetId: created?.id,
      beforeData: null,
      afterData: created,
      metadata: { entity }
    });

    return created;
  });
}

async function updateLandingEntity(adminUserId, entity, entityId, payload) {
  return withTransaction(async (client) => {
    let before;
    let merged;
    let updated;

    if (entity === 'featured-item') {
      before = await landingRepository.getFeaturedItemById(client, entityId);
      if (!before) throw new ApiError(404, 'Featured item not found');
      merged = {
        productId: Object.prototype.hasOwnProperty.call(payload, 'productId') ? payload.productId : before.product_id,
        title: Object.prototype.hasOwnProperty.call(payload, 'title') ? payload.title : before.title,
        description: Object.prototype.hasOwnProperty.call(payload, 'description') ? payload.description : before.description,
        imageUrl: Object.prototype.hasOwnProperty.call(payload, 'imageUrl') ? payload.imageUrl : before.image_url,
        priceLabel: Object.prototype.hasOwnProperty.call(payload, 'priceLabel') ? payload.priceLabel : before.price_label,
        promoText: Object.prototype.hasOwnProperty.call(payload, 'promoText') ? payload.promoText : before.promo_text,
        ctaText: Object.prototype.hasOwnProperty.call(payload, 'ctaText') ? payload.ctaText : before.cta_text,
        targetLink: Object.prototype.hasOwnProperty.call(payload, 'targetLink') ? payload.targetLink : before.target_link,
        sortOrder: Object.prototype.hasOwnProperty.call(payload, 'sortOrder') ? payload.sortOrder : before.sort_order,
        isActive: Object.prototype.hasOwnProperty.call(payload, 'isActive') ? payload.isActive : before.is_active
      };
      updated = await landingRepository.updateFeaturedItem(client, entityId, merged);
    }

    if (entity === 'content-block') {
      before = await landingRepository.getContentBlockById(client, entityId);
      if (!before) throw new ApiError(404, 'Content block not found');
      merged = {
        sectionKey: payload.sectionKey ?? before.section_key,
        title: payload.title ?? before.title,
        subtitle: Object.prototype.hasOwnProperty.call(payload, 'subtitle') ? payload.subtitle : before.subtitle,
        bodyText: Object.prototype.hasOwnProperty.call(payload, 'bodyText') ? payload.bodyText : before.body_text,
        imageUrl: Object.prototype.hasOwnProperty.call(payload, 'imageUrl') ? payload.imageUrl : before.image_url,
        iconName: Object.prototype.hasOwnProperty.call(payload, 'iconName') ? payload.iconName : before.icon_name,
        accentLabel: Object.prototype.hasOwnProperty.call(payload, 'accentLabel') ? payload.accentLabel : before.accent_label,
        ctaText: Object.prototype.hasOwnProperty.call(payload, 'ctaText') ? payload.ctaText : before.cta_text,
        targetLink: Object.prototype.hasOwnProperty.call(payload, 'targetLink') ? payload.targetLink : before.target_link,
        layoutStyle: payload.layoutStyle ?? before.layout_style,
        sortOrder: Object.prototype.hasOwnProperty.call(payload, 'sortOrder') ? payload.sortOrder : before.sort_order,
        isActive: Object.prototype.hasOwnProperty.call(payload, 'isActive') ? payload.isActive : before.is_active
      };
      updated = await landingRepository.updateContentBlock(client, entityId, merged);
    }

    if (entity === 'testimonial') {
      before = await landingRepository.getTestimonialById(client, entityId);
      if (!before) throw new ApiError(404, 'Testimonial not found');
      merged = {
        reviewerName: payload.reviewerName ?? before.reviewer_name,
        reviewerRole: Object.prototype.hasOwnProperty.call(payload, 'reviewerRole') ? payload.reviewerRole : before.reviewer_role,
        reviewText: payload.reviewText ?? before.review_text,
        rating: Object.prototype.hasOwnProperty.call(payload, 'rating') ? payload.rating : before.rating,
        avatarUrl: Object.prototype.hasOwnProperty.call(payload, 'avatarUrl') ? payload.avatarUrl : before.avatar_url,
        sortOrder: Object.prototype.hasOwnProperty.call(payload, 'sortOrder') ? payload.sortOrder : before.sort_order,
        isActive: Object.prototype.hasOwnProperty.call(payload, 'isActive') ? payload.isActive : before.is_active
      };
      updated = await landingRepository.updateTestimonial(client, entityId, merged);
    }

    if (entity === 'country') {
      before = await landingRepository.getCountryById(client, entityId);
      if (!before) throw new ApiError(404, 'Country entry not found');
      merged = {
        countryCode: payload.countryCode ?? before.country_code,
        countryName: payload.countryName ?? before.country_name,
        flagEmoji: payload.flagEmoji ?? before.flag_emoji,
        sortOrder: Object.prototype.hasOwnProperty.call(payload, 'sortOrder') ? payload.sortOrder : before.sort_order,
        isActive: Object.prototype.hasOwnProperty.call(payload, 'isActive') ? payload.isActive : before.is_active
      };
      updated = await landingRepository.updateCountry(client, entityId, merged);
    }

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: `landing.${entity}.update`,
      targetEntity: `landing_${entity}`,
      targetId: entityId,
      beforeData: before,
      afterData: updated,
      metadata: { entity }
    });

    return updated;
  });
}

async function deleteLandingEntity(adminUserId, entity, entityId) {
  return withTransaction(async (client) => {
    let before;
    let deleted;

    if (entity === 'featured-item') {
      before = await landingRepository.getFeaturedItemById(client, entityId);
      if (!before) throw new ApiError(404, 'Featured item not found');
      deleted = await landingRepository.deleteFeaturedItem(client, entityId);
    }

    if (entity === 'content-block') {
      before = await landingRepository.getContentBlockById(client, entityId);
      if (!before) throw new ApiError(404, 'Content block not found');
      deleted = await landingRepository.deleteContentBlock(client, entityId);
    }

    if (entity === 'testimonial') {
      before = await landingRepository.getTestimonialById(client, entityId);
      if (!before) throw new ApiError(404, 'Testimonial not found');
      deleted = await landingRepository.deleteTestimonial(client, entityId);
    }

    if (entity === 'country') {
      before = await landingRepository.getCountryById(client, entityId);
      if (!before) throw new ApiError(404, 'Country entry not found');
      deleted = await landingRepository.deleteCountry(client, entityId);
    }

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: `landing.${entity}.delete`,
      targetEntity: `landing_${entity}`,
      targetId: entityId,
      beforeData: before,
      afterData: null,
      metadata: { entity }
    });

    return deleted;
  });
}

module.exports = {
  getLandingAdminState,
  updateLandingSettings,
  updateLandingStats,
  createLandingEntity,
  updateLandingEntity,
  deleteLandingEntity
};
