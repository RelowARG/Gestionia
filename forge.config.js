const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');

module.exports = {
  packagerConfig: {
    asar: true,
    // 🔥 EL ESCUDO PROTECTOR: Ignoramos el backend, la IA y cachés gigantes
    ignore: [
      /\/software-gestion-backend/,
      /\/\.wwebjs_auth/,
      /\/\.wwebjs_cache/,
      /\/yuki-studio/,
      /\/out/,
      /\/make/
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  // Configuración del renderer con Webpack
  renderer: {
    config: './webpack.config.js',
    entryPoints: [
      {
        name: 'main_window',
        html: path.join(__dirname, 'public', 'index.html'),
        js: path.join(__dirname, 'src', 'index.js'),
      },
    ],
  },
};