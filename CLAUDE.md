# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React Native BLE Nitro is a high-performance Bluetooth Low Energy library built on Nitro Modules for React Native. It provides zero-overhead native communication through JSI, with full TypeScript support and cross-platform implementations for iOS (Swift) and Android (Kotlin).

## Essential Development Commands

### Core Development Workflow
```bash
# Install dependencies
npm install

# Generate native Nitro code from TypeScript specs (REQUIRED after any spec changes)
npx nitro-codegen

# Build TypeScript (ESM and CommonJS)
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run typecheck

# Clean build artifacts
npm run clean
```

### Nitro-Specific Commands
```bash
# Generate native bindings from specs/ (run after editing any .nitro.ts files)
npx nitro-codegen src

# Clean all generated code
npm run clean  # removes lib/, plugin/build/, nitrogen/generated/
```

## Architecture Overview

### Nitro Modules Foundation
The library is built on Nitro Modules, requiring understanding of:
- **Nitro Specs**: TypeScript interfaces in `src/specs/` that define native APIs
- **Code Generation**: `npx nitro-codegen` generates native bindings in `nitrogen/generated/`
- **JSI Communication**: Direct communication bypassing React Native bridge

### Key Components
- **BleNitro Class**: Main singleton API in `src/index.ts` wrapping native calls
- **Native Implementations**: Platform-specific code (Note: native files were recently deleted)
- **Expo Plugin**: Configuration plugin in `plugin/src/` for permissions and background modes

### Current Package API
The main package API is implemented in `src/index.ts` with a complete BleNitro singleton class that provides:
- Device scanning with filtering
- Connection management with state tracking
- Service and characteristic discovery
- Read/write/notify operations on characteristics
- Bluetooth state monitoring and management

The API wraps native calls from `./specs/NativeBleNitro` and provides Promise-based methods with internal state management for scanning and connected devices.

### Data Flow
```
TypeScript API → Nitro Specs → Generated Native Code → Platform BLE APIs
```

## Critical Development Constraints

### Nitro Module Limitations
When editing specs in `src/specs/`:
- **Only numeric enums** (no string enums)
- **No index signatures** like `{ [key: string]: any }`
- **No inline union types**
- **Structured data objects** instead of flexible maps
- **Always run `npx nitro-codegen`** after spec changes

### File Structure Rules
- **Never edit `nitrogen/generated/`** - auto-generated files
- **Specs define the contract** - changes here require native implementation updates
- **Native files deleted** - this appears to be a major refactor in progress

## Testing Strategy

### Test Files Location
- Unit tests: `src/__tests__/`
- Mock Nitro modules appropriately in tests
- Test both success and error scenarios

### Test Commands
```bash
# Run all tests
npm test

# Run specific test
npm test -- BleManager.test.ts
```

## Build System

### TypeScript Compilation
- **ESM build**: `npm run build:esm` → `lib/`
- **CommonJS build**: `npm run build:commonjs` → `lib/commonjs/`
- **Plugin build**: `npm run build:plugin` → `plugin/build/`

### Export Strategy
Multiple export paths in package.json:
- Main library: `src/index.ts` (source) → `lib/index.js` (built)
- Expo plugin: `plugin/src/` → `plugin/build/`

## Current State Analysis

Based on git status, major cleanup/refactor in progress:
- Native iOS/Android implementations deleted
- Original API compatibility layer removed
- Core BLE specs and utilities removed
- Focusing on minimal viable implementation

This suggests the codebase is being restructured to a simpler architecture. When working on this project, expect that native implementations need to be rebuilt from the current TypeScript API definition.