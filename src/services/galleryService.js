const landingMediaStorageService = require('./landingMediaStorageService');
const galleryRepository = require('../repositories/galleryRepository');

async function mapGalleryItem(item) {
  const imageUrl = await landingMediaStorageService.resolveRenderableMediaUrl(item.image_url || '');
  return {
    id: item.id,
    title: item.title || '',
    caption: item.caption || '',
    imageUrl,
    isVisible: Boolean(item.is_visible),
    sortOrder: Number(item.sort_order || 0),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    imageMissing: Boolean((item.image_url || '') && !imageUrl)
  };
}

async function listVisibleGalleryItems() {
  const items = await galleryRepository.listGalleryItems(null, { onlyVisible: true });
  return Promise.all(items.map(mapGalleryItem));
}

module.exports = {
  listVisibleGalleryItems,
  mapGalleryItem
};
