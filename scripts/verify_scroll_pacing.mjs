import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const compiled = ts.transpileModule(fs.readFileSync('src/animation/scrollPacing.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const STORY = { liftStart: 5, liftEnd: 170 / 24, crossStart: 242 / 24, crossEnd: 290 / 24, hangupStart: 314 / 24 };
function fixture() {
  const exports = {}, handlers = new Map();
  let rendered = 0;
  const browser = { innerHeight: 1000, scrollY: 0,
    addEventListener: (name, handler) => handlers.set(name, handler),
    removeEventListener: name => handlers.delete(name),
    scrollTo({ top }) { this.scrollY = top; } };
  vm.runInNewContext(compiled, { exports, window: browser, Element: class {},
    document: { documentElement: { classList: { contains: () => false } } },
    require: name => name === './timeline' ? { STORY } : JSON.parse(fs.readFileSync('src/animation/callMilestones.json', 'utf8')) });
  const ready = { opening: false, hello: false, aboutTitle: false, about: false, workTitle: false, work: false };
  const tops = { '.pickup-message p': 2500, '#about-title': 4000, '#work-title': 7000, '.projects': 7600 };
  const root = { querySelector: selector => ({ getBoundingClientRect: () => ({ top: tops[selector] - rendered }) }) };
  const controller = exports.createScrollPacing(root, { scrollTop: () => rendered }, () => ready,
    () => [0, 600, 1200, 3000, 5500, 6000, 8000]);
  return { exports, ready, controller, browser, handlers,
    position(target, visible = target) { browser.scrollY = target * 2; rendered = visible; },
    wheel(pixels, extra = {}) {
      let prevented = false;
      handlers.get('wheel')({ deltaY: pixels, deltaX: 0, deltaMode: 0, cancelable: true,
        preventDefault: () => { prevented = true; }, ...extra });
      if (!prevented) browser.scrollY += pixels; // Simulate actual browser default.
      return prevented;
    },
    get target() { return browser.scrollY * 0.5; },
  };
}
const f = fixture();
const { paceScroll, guardScroll } = f.exports;
assert.equal(paceScroll(100, 400, [{ start: 200, end: 400, rate: 0.1 }]), 230);
assert.equal(paceScroll(250, -100, []), 150);
const gates = [{ start: 200, end: 500, pending: true }];
assert.equal(guardScroll(0, 100000, 0, gates, 120), 200);
assert.equal(guardScroll(320, 100000, 200, gates, 120), 320);
assert.equal(guardScroll(200, 100000, 200, [{ ...gates[0], lead: 30 }], 120), 230);
// Native target already passed the endpoint, while visible animation is pending.
assert.equal(guardScroll(600, 1000, 450, gates, 120), 600);
assert.equal(guardScroll(600, 1000, 450, [{ ...gates[0], pending: false }], 120), 1000);
assert.equal(f.wheel(2000), true); // Gesture is owned, but Incoming keeps baseline speed.
assert.equal(f.target, 1000);
f.position(1200);
assert.equal(f.wheel(100), true); // PICK UP itself keeps baseline speed.
assert.equal(f.target, 1250);
f.position(1150);
f.wheel(100000);
assert.equal(f.target, 1418); // Frame 127 plus boundary clearance.
f.position(1420, 1418);
f.wheel(100);
assert.equal(f.target, 1452.5); // CONNECTED: light 35% reduction.
f.position(1600, 1450);
f.wheel(10000);
assert.equal(f.target, 1600); // Cannot add more queued movement past pending gate.
f.position(2100);
f.wheel(100);
assert.equal(f.target, 2112.5); // Hello: 75% reduction.
f.ready.hello = true;
f.wheel(100);
assert.equal(f.target, 2162.5); // Label complete releases immediately.
f.controller.dispose();
assert.equal(f.handlers.size, 0);
// First event starts outside every slow zone. Cancelling it keeps the same
// gesture cancelable when subsequent fast momentum reaches a reveal gate.
const gesture = fixture();
gesture.position(0);
let cancelableGesture = gesture.wheel(800);
assert.equal(cancelableGesture, true);
assert.equal(gesture.target, 400); // No Incoming slowdown.
for (let i = 0; i < 12; i++) {
  cancelableGesture = gesture.wheel(10000, { cancelable: cancelableGesture });
  assert.equal(cancelableGesture, true);
  assert.ok(gesture.target <= 1418); // No rendered frame/readiness update yet.
}
gesture.position(3500);
gesture.ready.hello = true;
for (let i = 0; i < 5; i++) {
  gesture.wheel(10000);
  gesture.position(gesture.target); // Visible scene catches up; title not ready yet.
}
assert.ok(gesture.target <= 3852); // Cannot skip Interfaces before its trigger.
gesture.ready.aboutTitle = true;
const beforeSlow = gesture.target;
gesture.wheel(100);
assert.ok(gesture.target - beforeSlow <= 5);
gesture.controller.dispose();
for (const [name, start, baseEnd, tail] of [['about', 3750, 3800, 108.33333333333334], ['work', 6750, 6750, 50.4]]) {
  const t = fixture();
  t.ready.hello = true;
  if (name === 'work') { t.ready.aboutTitle = true; t.ready.about = true; t.position(3800); t.controller.update(); }
  t.position(start - 100);
  t.wheel(40);
  assert.equal(t.target, start - 80); // Normal speed during heading reveal.
  if (name === 'work') {
    t.position(start - 100);
    t.wheel(1000);
    assert.equal(t.target, start + 400); // No early 30px cap before title readiness.
  }
  t.position(baseEnd);
  t.ready[`${name}Title`] = true;
  t.controller.update();
  t.wheel(100);
  assert.ok(t.target >= baseEnd && t.target <= baseEnd + 5); // Slow or hold while support reveals.
  // Wait for support without changing the rendered position.
  t.ready[name] = true;
  t.controller.update();
  const zone = t.controller.getZones().find(zone => zone.start === start);
  assert.ok(Math.abs(zone.end - baseEnd - tail) < 0.001);
  t.position(baseEnd + 10);
  t.wheel(100);
  assert.equal(t.target, baseEnd + 15); // Tail remains even after stationary wait.
  // Native target leads the visible scene beyond the tail endpoint.
  t.position(zone.end + 100, baseEnd + 10);
  t.wheel(100);
  assert.ok(Math.abs(t.target - (zone.end + 105)) < 0.001); // Visible slow still applies.
  t.position(zone.end + 10);
  t.controller.update();
  t.wheel(100);
  assert.ok(Math.abs(t.target - (zone.end + 60)) < 0.001); // Restore baseline.
  t.position(start - 50);
  t.ready[`${name}Title`] = false;
  t.ready[name] = false;
  t.controller.update();
  t.position(baseEnd);
  t.ready[`${name}Title`] = true;
  t.wheel(100);
  assert.ok(t.target >= baseEnd && t.target <= baseEnd + 5); // Re-entering resets the beat.
  const beforeReverse = t.target;
  t.wheel(-100);
  assert.equal(t.target, beforeReverse - 50); // Reverse stays free.
  t.controller.dispose();
}
console.log('Scroll pacing passed: incoming free, frame 127 + 100px, pending gates with native/render lag, heading activation, stable 20% tails, release, reverse and re-entry.');
