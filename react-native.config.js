module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        // No packageImportPath needed - autolinking handles registration
      },
      ios: {
        project: './ios/BleNitro.xcodeproj',
      },
    },
  },
};