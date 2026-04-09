const { withTransaction } = require('../../db/pool');
const { ApiError } = require('../../utils/ApiError');
const adminRepository = require('../../repositories/adminRepository');
const galleryRepository = require('../../repositories/galleryRepository');
const galleryService = require('../galleryService');
const landingMediaStorageService = require('../landingMediaStorageService');

async function listAdminGalleryItems() {
  const items = await galleryRepository.listGalleryItems();
  return Promise.all(items.map(galleryService.mapGalleryItem));
}

async function createGalleryItem(adminUserId, payload) {
  return withTransaction(async (client) => {
    const imageUrl = await landingMediaStorageService.saveGalleryImage('gallery-item', payload.imageDataUrl);
    const created = await galleryRepository.createGalleryItem(client, {
      title: payload.title,
      caption: payload.caption,
      imageUrl,
      isVisible: payload.isVisible ?? true,
      sortOrder: payload.sortOrder ?? 0,
      createdBy: adminUserId,
      updatedBy: adminUserId
    });

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'gallery.item.create',
      targetEntity: 'gallery_items',
      targetId: created.id,
      beforeData: null,
      afterData: created,
      metadata: { isVisible: created.is_visible }
    });

    return galleryService.mapGalleryItem(created);
  });
}

async function updateGalleryItem(adminUserId, itemId, payload) {
  return withTransaction(async (client) => {
    const before = await galleryRepository.getGalleryItemById(client, itemId);
    if (!before) throw new ApiError(404, 'Gallery item not found');

    let imageUrl = before.image_url;
    if (payload.imageDataUrl) {
      imageUrl = await landingMediaStorageService.saveGalleryImage(itemId, payload.imageDataUrl);
      await landingMediaStorageService.removeManagedMedia(before.image_url);
    }

    const updated = await galleryRepository.updateGalleryItem(client, itemId, {
      title: Object.prototype.hasOwnProperty.call(payload, 'title') ? String(payload.title || '').trim() || null : before.title,
      caption: Object.prototype.hasOwnProperty.call(payload, 'caption') ? String(payload.caption || '').trim() || null : before.caption,
      imageUrl,
      isVisible: Object.prototype.hasOwnProperty.call(payload, 'isVisible') ? payload.isVisible : before.is_visible,
      sortOrder: Object.prototype.hasOwnProperty.call(payload, 'sortOrder') ? payload.sortOrder : before.sort_order,
      updatedBy: adminUserId
    });

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'gallery.item.update',
      targetEntity: 'gallery_items',
      targetId: itemId,
      beforeData: before,
      afterData: updated,
      metadata: { replacedImage: Boolean(payload.imageDataUrl) }
    });

    return galleryService.mapGalleryItem(updated);
  });
}

async function deleteGalleryItem(adminUserId, itemId) {
  return withTransaction(async (client) => {
    const before = await galleryRepository.getGalleryItemById(client, itemId);
    if (!before) throw new ApiError(404, 'Gallery item not found');

    const deleted = await galleryRepository.deleteGalleryItem(client, itemId);
    await landingMediaStorageService.removeManagedMedia(before.image_url);

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'gallery.item.delete',
      targetEntity: 'gallery_items',
      targetId: itemId,
      beforeData: before,
      afterData: null,
      metadata: { imageRemoved: true }
    });

    return galleryService.mapGalleryItem(deleted);
  });
}

module.exports = {
  listAdminGalleryItems,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem
};
