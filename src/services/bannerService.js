const bannerRepository = require('../repositories/bannerRepository');

async function listActiveBanners(client = null) {
  return bannerRepository.listActiveBanners(client);
}

module.exports = {
  listActiveBanners
};
