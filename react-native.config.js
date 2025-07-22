module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import co.zyke.ble.BleNitroPackage;',
      },
      ios: {
        project: './ios/BleNitro.xcodeproj',
      },
    },
  },
};