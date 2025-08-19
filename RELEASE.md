# Release Documentation - react-native-ble-nitro

## 🚀 Release Process

This document outlines the complete release process for publishing `react-native-ble-nitro` to npm.

## 📋 Pre-Release Checklist

### 1. Code Quality & Testing
- [ ] All tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] TypeScript compilation successful: `npm run typecheck`
- [ ] Nitro code generation works: `npx nitro-codegen`
- [ ] Plugin builds successfully: `npm run build:plugin`

### 2. Documentation Review
- [ ] README.md is up-to-date with latest features
- [ ] API_DIFFERENCES.md reflects current implementation
- [ ] CONTRIBUTING.md has correct setup instructions
- [ ] All code examples in docs are tested and working

### 3. Version Management
- [ ] Update version in `package.json`
- [ ] Update version in iOS podspec if needed
- [ ] Create changelog entry (see [Changelog Format](#changelog-format))
- [ ] Tag release appropriately

### 4. Package Configuration
- [ ] Verify `package.json` files array includes all necessary files
- [ ] Check `.npmignore` excludes development files
- [ ] Ensure peer dependencies are correct
- [ ] Validate keywords and metadata

## 🏗️ Building for Release

### 1. Clean Build
```bash
npm run clean
```

### 2. Generate Nitro Code
```bash
npx nitro-codegen
```

### 3. Build Package
```bash
npm run build
```
This will:
- Clean previous builds
- Build the Expo plugin (`plugin/build/`)
- Compile TypeScript (`lib/`)

### 4. Verify Build Output
Check that these directories exist and contain expected files:
- `lib/` - Compiled TypeScript
- `plugin/build/` - Compiled Expo plugin
- Native code should be included as source

## 📦 Package Contents

The npm package will include:

### **Source Files**
- `src/` - TypeScript source code
- `ios/` - iOS native implementation (Swift)
- `android/` - Android native implementation (Kotlin)

### **Built Files**  
- `lib/` - Compiled JavaScript/TypeScript definitions
- `plugin/build/` - Compiled Expo plugin

### **Configuration**
- `nitro.json` - Nitro module configuration
- `react-native.config.js` - React Native configuration
- `package.json` - Package metadata
- `README.md` - Documentation
- `LICENSE` - MIT license

### **Excluded from Package**
- `nitrogen/generated/` - Generated code (users will regenerate)
- `src/__tests__/` - Test files
- `node_modules/` - Dependencies
- Development configuration files

## 🔄 Release Workflow

### Option 1: Manual Release
```bash
# 1. Ensure clean working directory
git status

# 2. Run full build and tests
npm run prepublishOnly

# 3. Update version (patch/minor/major)
npm version patch  # or minor/major

# 4. Publish to npm
npm publish

# 5. Push tags to GitHub
git push && git push --tags
```

### Option 2: Automated Release Scripts
The package includes automated scripts:

```bash
# Version bump automatically builds and pushes tags
npm version patch
npm publish
```

## 📝 Changelog Format

Create entries in this format for each release:

```markdown
## [1.0.0] - 2025-01-XX

### Added
- Nitro Modules integration for high performance
- iOS Swift and Android Kotlin native implementations
- Expo config plugin with platform-specific functions
- Comprehensive test suite

### Technical Details
- Built on Nitro Modules 0.26.4
- Supports React Native 0.76.0+
- Compatible with Expo SDK 52+
- Full TypeScript definitions
```

## 🧪 Pre-Release Testing

### 1. Test in Example Project
```bash
# Create test project
npx create-expo-app --template blank-typescript TestBleNitro
cd TestBleNitro

# Install local package
npm install ../react-native-ble-nitro

# Add plugin to app.json
{
  "expo": {
    "plugins": ["react-native-ble-nitro"]
  }
}

# Test basic functionality
# Add BLE usage code to App.tsx
```

### 2. Platform Testing
- [ ] Test on iOS simulator
- [ ] Test on iOS physical device
- [ ] Test on Android emulator  
- [ ] Test on Android physical device

### 3. Integration Testing
- [ ] Fresh React Native CLI project
- [ ] Fresh Expo managed project
- [ ] Expo bare workflow project

## 🔒 Security Considerations

### Before Release
- [ ] No API keys or secrets in source code
- [ ] No internal URLs or development endpoints
- [ ] All dependencies are from trusted sources
- [ ] License headers are correct

### Publishing
- [ ] Use npm two-factor authentication
- [ ] Publish from trusted environment
- [ ] Verify package contents after publishing

## 🚦 Post-Release Steps

### 1. Verify Publication
```bash
# Check package on npm
npm view react-native-ble-nitro

# Test installation
npm install react-native-ble-nitro
```

### 2. Update Documentation
- [ ] Update GitHub release notes
- [ ] Update any external documentation
- [ ] Announce release in relevant communities

### 3. Monitor Release
- [ ] Watch for immediate issues
- [ ] Monitor GitHub issues
- [ ] Check npm download stats

## 🐛 Hotfix Process

For critical bug fixes:

1. **Create hotfix branch** from main/master
2. **Make minimal fix** - only fix the critical issue
3. **Test thoroughly** - ensure fix doesn't break anything
4. **Patch version bump** - increment patch version
5. **Fast-track release** - skip some non-critical checks if needed
6. **Immediate publish** - get fix to users quickly

```bash
git checkout -b hotfix/critical-fix-v1.0.1
# Make fix
npm version patch
npm publish
git push && git push --tags
```

## 📊 Release Metrics

Track these metrics for each release:
- **Download counts** - npm download statistics
- **GitHub stats** - stars, forks, issues
- **Community feedback** - reviews, discussions
- **Performance impact** - compared to previous versions

## 🤝 Release Team

### Roles & Responsibilities
- **Maintainer**: Final approval and npm publish
- **QA Lead**: Testing and quality assurance  
- **Documentation**: README and docs updates
- **Community**: Communication and support

## 📞 Support After Release

### Common Post-Release Tasks
- Monitor GitHub issues for bug reports
- Answer questions in discussions
- Collect feedback for next release

### Emergency Procedures
If a critical issue is found after release:
1. **Assess severity** - breaking changes vs. minor issues
2. **Quick fix** - implement minimal viable fix
3. **Hotfix release** - follow hotfix process above
4. **Communication** - notify users of issue and fix

## 📈 Future Release Planning

### Version Strategy
- **Patch (1.0.x)**: Bug fixes, security updates
- **Minor (1.x.0)**: New features, non-breaking changes  
- **Major (x.0.0)**: Breaking changes, major rewrites

### Release Cadence
- **Regular releases**: Monthly minor releases
- **Hotfixes**: As needed for critical issues
- **Major releases**: Quarterly or as needed

---

## 🔗 Useful Commands

```bash
# Full release preparation
npm run prepublishOnly

# Check what will be published
npm pack --dry-run

# Publish with tag
npm publish --tag beta

# Check package info
npm info react-native-ble-nitro

# View published files
npm view react-native-ble-nitro files
```

---

**Ready to release? Follow the checklist above and make React Native BLE development faster for everyone! 🚀**