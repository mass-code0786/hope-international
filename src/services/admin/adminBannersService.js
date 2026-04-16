const { withTransaction } = require('../../db/pool');
const { ApiError } = require('../../utils/ApiError');
const { normalizePagination, buildPagination } = require('../../utils/pagination');
const bannerRepository = require('../../repositories/bannerRepository');
const adminRepository = require('../../repositories/adminRepository');
const bannerService = require('../bannerService');

async function listBanners(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await bannerRepository.listAdminBanners(null, filters, pagination);

  return {
    data: result.items,
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total })
  };
}

async function createBanner(adminUserId, payload) {
  return withTransaction(async (client) => {
    const created = await bannerRepository.createBanner(client, payload);

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'banner.create',
      targetEntity: 'homepage_banner',
      targetId: created.id,
      beforeData: null,
      afterData: created,
      metadata: { title: created.title }
    });

    bannerService.clearBannerListCache();
    return created;
  });
}

async function updateBanner(adminUserId, bannerId, payload) {
  return withTransaction(async (client) => {
    const before = await bannerRepository.getBannerById(client, bannerId);
    if (!before) {
      throw new ApiError(404, 'Banner not found');
    }

    const merged = {
      imageUrl: payload.imageUrl ?? before.image_url,
      title: payload.title ?? before.title,
      subtitle: payload.subtitle ?? before.subtitle,
      ctaText: payload.ctaText ?? before.cta_text,
      targetLink: payload.targetLink ?? before.target_link,
      sortOrder: payload.sortOrder ?? before.sort_order,
      isActive: payload.isActive ?? before.is_active,
      startAt: payload.startAt ?? before.start_at,
      endAt: payload.endAt ?? before.end_at
    };

    const updated = await bannerRepository.updateBanner(client, bannerId, merged);

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'banner.update',
      targetEntity: 'homepage_banner',
      targetId: bannerId,
      beforeData: before,
      afterData: updated,
      metadata: { title: updated?.title }
    });

    bannerService.clearBannerListCache();
    return updated;
  });
}

async function deleteBanner(adminUserId, bannerId) {
  return withTransaction(async (client) => {
    const before = await bannerRepository.getBannerById(client, bannerId);
    if (!before) {
      throw new ApiError(404, 'Banner not found');
    }

    const deleted = await bannerRepository.deleteBanner(client, bannerId);

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'banner.delete',
      targetEntity: 'homepage_banner',
      targetId: bannerId,
      beforeData: before,
      afterData: null,
      metadata: { title: before.title }
    });

    bannerService.clearBannerListCache();
    return deleted;
  });
}

module.exports = {
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner
};
