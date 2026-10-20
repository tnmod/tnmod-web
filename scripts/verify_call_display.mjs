import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(fs.readFileSync('src/animation/callDisplay.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
let clock = 0;
const rows = [];
const context = { imageSmoothingEnabled: true, drawImage: (...args) => {
  if (args[3] === 1024) rows.push(args[2] / 368);
}, fillRect: () => {} };
class Mesh { material = { map: null, emissiveMap: null, color: { setRGB() {} }, emissive: { setRGB() {} } }; }
const exports = {};
const sandbox = {
  exports, performance: { now: () => clock },
  document: { createElement: () => ({ getContext: () => context }) },
  require: (name) => {
    if (name === 'three') return { Mesh, ImageLoader: class { async loadAsync() { return {}; } }, CanvasTexture: class { dispose() {} } };
    if (name === './lcdFont.json') return JSON.parse(fs.readFileSync('src/animation/lcdFont.json', 'utf8'));
    if (name === './callMilestones.json') return JSON.parse(fs.readFileSync('src/animation/callMilestones.json', 'utf8'));
    if (name === './timeline') return { STORY: { rest: 374 / 24 } };
    throw new Error(name);
  },
};
vm.runInNewContext(source, sandbox);
const { CALL, callStateAt, callDurationAt, createCallDisplay } = exports;
assert.equal(callStateAt(CALL.answer - 0.001), 'ringing');
assert.equal(callStateAt(CALL.answer), 'connected');
assert.equal(callStateAt(CALL.end - 0.001), 'connected');
assert.equal(callStateAt(CALL.end), 'ended');
const display = await createCallDisplay({ getObjectByName: () => new Mesh() });
assert.equal(display.update(3, false), true);
assert.equal(rows.at(-1), 0);
clock = 700;
assert.equal(display.update(3, false), true);
assert.equal(rows.at(-1), 1); // Blink continues at a stationary scroll position.
display.update(3, true);
assert.equal(rows.at(-1), 0); // Reduced motion keeps the incoming label legible.
display.update(CALL.answer, false);
assert.equal(rows.at(-1), 2);
assert.equal(display.update(CALL.answer, false), false); // A paused story holds its milestone.
const milestones = JSON.parse(fs.readFileSync('src/animation/callMilestones.json', 'utf8'));
for (const { frame, seconds } of milestones) {
  assert.equal(callDurationAt((frame - 1) / 24), seconds);
}
assert.equal(callDurationAt(0), 0);
assert.equal(callDurationAt(150 / 24 - 0.001), 0);
assert.equal(callDurationAt(150 / 24), 48);
assert.equal(callDurationAt(170 / 24), 75);
assert.equal(callDurationAt(194 / 24), 155);
display.update(194 / 24, false);
assert.equal(display.update(170 / 24, false), true); // Reverse scrolling restores 01:15.
display.update(CALL.end, false);
assert.equal(rows.at(-1), 13);
assert.equal(callDurationAt(CALL.end), 342);
assert.equal(display.update(CALL.end + 1, false), false); // Ended duration stays frozen at 05:42.
display.update(0, false);
display.update(CALL.answer, false);
assert.equal(callDurationAt(CALL.answer), 0); // A new call starts at zero.
display.update(0, false);
assert.equal(display.update(CALL.end, false), true); // Direct contact navigation.
assert.equal(rows.at(-1), 13);
display.dispose();
console.log('Call display: blink, exact duration milestones, reverse scrolling, 05:42 hangup, replay and direct navigation passed.');
