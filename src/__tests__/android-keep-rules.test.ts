import { readFileSync } from 'fs';
import { join } from 'path';

// Nitro instantiates the autolinked Kotlin HybridObjects by JNI class name, so
// R8 strips them unless android/consumer-rules.pro keeps them (issue #36).
// This guards against renaming a class without updating the keep rules.
describe('Android consumer keep rules', () => {
  const root = join(__dirname, '..', '..');
  const nitro = JSON.parse(readFileSync(join(root, 'nitro.json'), 'utf8'));
  const rules = readFileSync(join(root, 'android', 'consumer-rules.pro'), 'utf8');
  const gradle = readFileSync(join(root, 'android', 'build.gradle'), 'utf8');
  const pkg = ['com', 'margelo', 'nitro', ...nitro.android.androidNamespace].join('.');

  const autolinking: Record<string, { kotlin?: string }> = nitro.autolinking;
  const kotlinClasses: string[] = Object.values(autolinking)
    .map((entry) => entry.kotlin)
    .filter(Boolean);

  it('registers the rules file with the library', () => {
    expect(gradle).toMatch(/consumerProguardFiles\s+["']consumer-rules\.pro["']/);
  });

  it.each(kotlinClasses)('keeps %s and its no-arg constructor', (cls) => {
    const escaped = `${pkg}.${cls}`.replace(/\./g, '\\.');
    expect(rules).toMatch(
      new RegExp(`-keep class ${escaped}\\s*\\{[^}]*public <init>\\(\\);[^}]*\\}`)
    );
  });
});
