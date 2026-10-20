import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(fs.readFileSync('src/animation/anchorNavigation.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
const handlers = new Map();
let config;
let killed = 0;
const gsap = {
  registerPlugin() {}, parseEase: () => (value) => value,
  to(target, options) { config = options; return { kill: () => { killed++; }, isActive: () => true }; },
};
vm.runInNewContext(code, {
  exports,
  require: (name) => name === 'gsap' ? { __esModule: true, default: gsap } : { ScrollToPlugin: {} },
  window: { innerHeight: 800, addEventListener: (key, handler) => handlers.set(key, handler), removeEventListener: (key) => handlers.delete(key) },
});
const { navigationRoute, createAnchorNavigation } = exports;
const zones = [{ start: 400, end: 600, rate: 0.1 }];
for (const [from, to] of [[0, 1000], [1000, 0]]) {
  const route = navigationRoute(from, to, zones);
  assert.equal(route(0), from);
  assert.equal(route(1), to);
  let previous = from;
  for (let i = 1; i <= 100; i++) {
    const position = route(i / 100);
    assert.ok(to > from ? position >= previous : position <= previous);
    assert.ok(position >= 0 && position <= 1000);
    previous = position;
  }
}
const route = navigationRoute(0, 1000, zones);
assert.ok(route(0.25) < 400); // Early normal travel.
assert.ok(route(0.5) >= 400 && route(0.5) <= 600); // Extra journey time inside the reveal.
assert.equal(navigationRoute(100, 100, [])(0.5), 100);
const root = { getBoundingClientRect: () => ({ height: 8000 }) };
const navigation = createAnchorNavigation(root, { scrollTop: () => 0 }, () => zones);
navigation.to({ getBoundingClientRect: () => ({ top: 2200 }), querySelector: () => ({ getBoundingClientRect: () => ({ top: 2400 }) }) });
assert.equal(config.scrollTo.y, 4480); // Landing includes the heading reveal gate and native speed conversion.
assert.ok(config.duration > 3 && config.duration <= 7);
assert.equal(config.scrollTo.autoKill, true);
assert.equal(config.ease(0), 0);
assert.equal(config.ease(1), 1);
assert.equal(navigation.active, true);
handlers.get('wheel')({ deltaY: 50 });
assert.equal(killed, 1);
assert.equal(navigation.active, false);
navigation.to({ getBoundingClientRect: () => ({ top: 9000 }), querySelector: () => null });
assert.equal(config.scrollTo.y, 14400); // Never overshoot the bottom.
navigation.dispose();
assert.equal(handlers.size, 0);
console.log('Anchor navigation: weighted routes, forward/reverse continuity, reveal landing, duration, interruption, clamping and cleanup passed.');
