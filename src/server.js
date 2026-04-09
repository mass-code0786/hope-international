const app = require('./app');
const env = require('./config/env');
const landingMediaStorageService = require('./services/landingMediaStorageService');

async function startServer() {
  try {
    const mediaStorage = await landingMediaStorageService.ensureMediaStorageReady();
    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
      console.log('[startup.media-storage]', {
        root: mediaStorage.root,
        publicPrefix: mediaStorage.publicPrefix,
        publicBaseUrl: mediaStorage.publicBaseUrl || null,
        directories: mediaStorage.directories
      });
    });
  } catch (error) {
    console.error('[startup.media-storage]', {
      nodeEnv: env.nodeEnv,
      mediaStorageRoot: env.mediaStorageRoot || null,
      railwayVolumeMountPath: env.railwayVolumeMountPath || null,
      message: error.message
    });
    process.exit(1);
  }
}

startServer();
