const bcrypt = require('bcryptjs');
const { withTransaction, pool } = require('../db/pool');
const userRepository = require('../repositories/userRepository');
const walletRepository = require('../repositories/walletRepository');

const ADMIN_USERNAME = 'admin';
const ADMIN_EMAIL = 'admin@hopeinternational.uk';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_PROFILE = {
  firstName: 'Admin',
  lastName: 'User',
  mobileNumber: '0000000000',
  countryCode: '+1'
};

async function bootstrapAdmin() {
  return withTransaction(async (client) => {
    const rank = await userRepository.getDefaultRank(client);
    if (!rank) {
      throw new Error('Default rank is not configured. Run migrations/seeding first.');
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const existingAdmin = await userRepository.findAdminUser(client);

    if (existingAdmin) {
      const admin = await userRepository.updateAdminCredentials(client, existingAdmin.id, {
        ...ADMIN_PROFILE,
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        passwordHash,
        rankId: rank.id
      });
      await walletRepository.createWallet(client, admin.id);
      return { action: 'updated', admin };
    }

    const admin = await userRepository.createUser(client, {
      ...ADMIN_PROFILE,
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
      sponsorId: null,
      parentId: null,
      placementSide: null,
      rankId: rank.id
    });

    await walletRepository.createWallet(client, admin.id);
    return { action: 'created', admin };
  });
}

module.exports = {
  bootstrapAdmin
};

if (require.main === module) {
  bootstrapAdmin()
    .then(({ action, admin }) => {
      console.log(`Admin ${action}: ${admin.username} <${admin.email}> (${admin.id})`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}
