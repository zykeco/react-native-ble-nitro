# Contributing to react-native-ble-nitro

Thank you for your interest in contributing to react-native-ble-nitro! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Architecture Overview](#architecture-overview)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Standards](#code-standards)
- [Submitting Changes](#submitting-changes)
- [Nitro Development](#nitro-development)
- [Native Development](#native-development)

## 🤝 Code of Conduct

This project follows a code of conduct to ensure a welcoming environment for all contributors. Please be respectful, inclusive, and professional in all interactions.

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v22 or higher)
- **npm**
- **React Native development environment** (iOS/Android)
- **Xcode** (for iOS development)
- **Android Studio** (for Android development)
- **TypeScript** knowledge
- **Nitro Modules** familiarity (helpful)

### Repository Structure

```
react-native-ble-nitro/
├── src/                      # TypeScript source code
│   ├── specs/               # Nitro module specifications
│   ├── compatibility/       # react-native-ble-plx compatibility layer
│   ├── utils/              # Utility functions
│   └── __tests__/          # Unit tests
├── ios/                     # iOS native implementation (Swift)
├── android/                 # Android native implementation (Kotlin)
├── plugin/                  # Expo config plugin
├── nitrogen/generated/      # Generated Nitro code (do not edit)
├── docs/                    # Documentation
└── examples/               # Example applications
```

## 🛠️ Development Setup

### 1. Fork and Install

```bash
# Fork the repository on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/react-native-ble-nitro.git
cd react-native-ble-nitro
git remote add upstream https://github.com/zykeco/react-native-ble-nitro.git
npm install
```

### 2. Generate Nitro Code

```bash
npx nitro-codegen
```

This generates native bindings in `nitrogen/generated/` from the TypeScript specs.

### 3. Build TypeScript

```bash
npm run build
```

### 4. Run Tests

```bash
npm test
```

### 5. Start Development

```bash
npm run dev
```

## 🏗️ Architecture Overview

### Nitro Modules Foundation

This library is built on [Nitro Modules](https://nitro.margelo.com/), which provides:
- Direct JSI communication (no bridge)
- Type-safe native bindings
- High performance
- Automatic code generation

### Key Components

1. **Nitro Specs** (`src/specs/`): TypeScript interfaces that define the native API
2. **Compatibility Layer** (`src/compatibility/`): Maintains 100% API compatibility with react-native-ble-plx
3. **Native Implementation**: Platform-specific BLE implementations
4. **Generated Code** (`nitrogen/generated/`): Auto-generated native bindings

### Data Flow

```
JavaScript/TypeScript → Compatibility Layer → Nitro Specs → Generated Native Code → Platform BLE APIs
```

## 🔄 Development Workflow

### Making Changes

1. **Sync with upstream and create a feature branch**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** in the appropriate directories:
   - TypeScript changes: `src/`
   - iOS changes: `ios/`
   - Android changes: `android/`
   - Tests: `src/__tests__/`

3. **Regenerate Nitro code** if you modified specs:
   ```bash
   npx nitro-codegen
   ```

4. **Build and test**:
   ```bash
   npm run build
   npm test
   npm run lint
   ```

5. **Test with example app** (if available):
   ```bash
   cd example
   npm install
   npx expo run:ios  # or run:android
   ```

### Important Notes

- **Never edit `nitrogen/generated/`** - these files are auto-generated
- **Always run `nitro-codegen`** after modifying Nitro specs
- **Maintain API compatibility** with react-native-ble-plx
- **Add tests** for new functionality

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- BleManager.test.ts
```

### Test Categories

1. **Unit Tests** (`src/__tests__/`): Test individual components
2. **Integration Tests**: Test component interactions
3. **Compatibility Tests**: Ensure react-native-ble-plx compatibility
4. **Native Tests**: Test platform-specific functionality

### Writing Tests

- Use **Jest** and **@testing-library/react-native**
- Mock Nitro modules appropriately
- Test both success and error scenarios
- Maintain high code coverage
- Test compatibility layer thoroughly

### Test Example

```typescript
import { BleManager } from '../index';
import { State } from '../specs/types';

describe('BleManager', () => {
  let manager: BleManager;

  beforeEach(() => {
    manager = new BleManager();
  });

  afterEach(async () => {
    await manager.destroy();
  });

  it('should get Bluetooth state', async () => {
    const state = await manager.state();
    expect(typeof state).toBe('number');
    expect(Object.values(State)).toContain(state);
  });
});
```

## 📏 Code Standards

### TypeScript

- Use **strict mode** TypeScript
- Prefer **interfaces** over types when possible
- Use **explicit return types** for public methods
- Follow **naming conventions**:
  - `PascalCase` for classes, interfaces, enums
  - `camelCase` for variables, functions, methods
  - `UPPER_SNAKE_CASE` for constants

### Code Style

- Use **Prettier** for formatting
- Use **ESLint** for linting
- **2 spaces** indentation
- **Single quotes** for strings
- **Semicolons** required

### Documentation

- Use **JSDoc** for public APIs
- Include **@param** and **@returns** tags
- Add **@example** for complex functions
- Keep comments up-to-date

### Example

```typescript
/**
 * Connects to a BLE device
 * 
 * @param deviceId - The device identifier
 * @param options - Connection options
 * @returns Promise that resolves to the connected device
 * 
 * @example
 * ```typescript
 * const device = await manager.connectToDevice('device-id', {
 *   autoConnect: true,
 *   timeout: 5000
 * });
 * ```
 */
async connectToDevice(
  deviceId: string, 
  options?: ConnectionOptions
): Promise<Device> {
  // Implementation
}
```

## 📝 Submitting Changes

### Pull Request Process

1. **Fork the repository** and create your branch from `main` (see Development Setup above)
2. **Make your changes** following the guidelines above
3. **Add tests** for new functionality
4. **Update documentation** if needed
5. **Run the full test suite** and ensure it passes
6. **Run linting** and fix any issues
7. **Create a pull request** with a clear description

### Pull Request Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Tested on iOS
- [ ] Tested on Android

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Commit Message Format

Use conventional commits:

```
type(scope): description

feat(ios): add MTU negotiation support
fix(android): resolve scanning permission issue
docs(readme): update installation instructions
test(manager): add connection timeout tests
```

## ⚡ Nitro Development

### Understanding Nitro Specs

Nitro specs define the interface between JavaScript and native code:

```typescript
// src/specs/BleManager.nitro.ts
export interface BleManager extends HybridObject {
  state(): Promise<State>;
  startDeviceScan(
    uuids: string[] | null,
    options: ScanOptions | null,
    listener: (error: NativeBleError | null, device: NativeDevice | null) => void
  ): Promise<void>;
}
```

### Nitro Constraints

- **Numeric enums only** (no string enums)
- **No index signatures** (`{ [key: string]: value }`)
- **No inline union types**
- **Structured data** instead of flexible objects
- **Specific callback signatures**

### Regenerating Code

Always run after spec changes:

```bash
npx nitro-codegen
```

This updates:
- `nitrogen/generated/ios/` - Swift bindings
- `nitrogen/generated/android/` - Kotlin bindings  
- `nitrogen/generated/shared/` - C++ core

## 📱 Native Development

### iOS Development (Swift)

- Implement protocols in `ios/`
- Use **Core Bluetooth** framework
- Follow **Swift conventions**
- Handle **background modes**
- Manage **permissions** properly

### iOS Example

```swift
class BleNitroBleManager: HybridBleManagerSpec {
    private var centralManager: CBCentralManager!
    
    public override init() {
        super.init()
        self.centralManager = CBCentralManager(delegate: self, queue: nil)
    }
    
    public func state() throws -> Promise<State> {
        return Promise.resolve(mapCBManagerState(centralManager.state))
    }
}
```

### Android Development (Kotlin)

- Implement interfaces in `android/src/main/kotlin/`
- Use **Android BLE APIs**
- Handle **permissions** for all API levels
- Use **coroutines** for async operations
- Follow **Android best practices**

### Android Example

```kotlin
class BleNitroBleManager(private val context: ReactApplicationContext) : HybridBleManagerSpec {
    private val bluetoothAdapter: BluetoothAdapter? by lazy {
        (context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter
    }
    
    override fun state(): Promise<State> = Promise.resolve {
        when {
            bluetoothAdapter == null -> State.Unsupported
            !bluetoothAdapter.isEnabled -> State.PoweredOff
            else -> State.PoweredOn
        }
    }
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Nitro codegen fails**: Check TypeScript specs for Nitro constraints
2. **Tests fail**: Ensure mocks are properly configured
3. **Build errors**: Run `npm run clean` and rebuild
4. **Permission issues**: Check Android/iOS permission configurations

### Getting Help

- **GitHub Issues**: Report bugs or request features
- **GitHub Discussions**: Ask questions or discuss ideas
- **Nitro Documentation**: https://nitro.margelo.com/
- **React Native BLE**: Understanding the original API

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to react-native-ble-nitro! 🚀