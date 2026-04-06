const galleryRepository = require('../repositories/galleryRepository');

function mapGalleryItem(item) {
  return {
    id: item.id,
    title: item.title || '',
    caption: item.caption || '',
    imageUrl: item.image_url,
    isVisible: Boolean(item.is_visible),
    sortOrder: Number(item.sort_order || 0),
    createdAt: item.created_at,
    updatedAt: item.updated_at
  };
}

async function listVisibleGalleryItems() {
  const items = await galleryRepository.listGalleryItems(null, { onlyVisible: true });
  return items.map(mapGalleryItem);
}

module.exports = {
  listVisibleGalleryItems,
  mapGalleryItem
};
