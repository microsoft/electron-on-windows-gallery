// Smoke test: verify the AbortSignal/cancel plumbing in the freshly
// generated bindings actually works end-to-end against real WinRT APIs.
//
// Run with:  node scripts/smoke-abort.mjs

import { StorageFile } from "../generated-js/StorageFile.js";
import { roInitialize } from "@microsoft/dynwinrt";

roInitialize();

let pass = 0;
let fail = 0;

function check(name, ok, detail) {
  if (ok) {
    console.log(`  PASS  ${name}`);
    pass++;
  } else {
    console.log(`  FAIL  ${name} — ${detail ?? ""}`);
    fail++;
  }
}

async function preAborted() {
  const ac = new AbortController();
  ac.abort(new Error("pre-aborted"));
  try {
    await StorageFile.getFileFromPathAsync("C:\\Windows\\System32\\notepad.exe", ac.signal);
    check("pre-aborted signal rejects synchronously", false, "resolved without throwing");
  } catch (e) {
    check("pre-aborted signal rejects with signal.reason", e?.message === "pre-aborted",
      `got ${e?.message ?? e}`);
  }
}

async function abortMidFlight() {
  const ac = new AbortController();
  // Schedule abort on next tick so the op actually starts.
  setImmediate(() => ac.abort(new Error("mid-flight cancel")));
  try {
    // A path on the network or non-existent slow path would be ideal, but
    // even a local file's IAsyncOperation transitions through Started, and
    // cancelling immediately should either:
    //   (a) succeed before completion → throws signal.reason
    //   (b) finish first → returns a StorageFile (cancel is a no-op)
    const result = await StorageFile.getFileFromPathAsync(
      "C:\\Windows\\System32\\notepad.exe", ac.signal);
    // Race won → that's fine, the op completed before cancel landed.
    check("mid-flight abort: completed-before-cancel race is benign",
      result != null, "got null result");
  } catch (e) {
    check("mid-flight abort: rejection carries signal.reason",
      e?.message === "mid-flight cancel", `got ${e?.message ?? e}`);
  }
}

async function noSignalStillWorks() {
  try {
    const f = await StorageFile.getFileFromPathAsync("C:\\Windows\\System32\\notepad.exe");
    check("calling without signal still works", f != null);
  } catch (e) {
    check("calling without signal still works", false, e?.message ?? String(e));
  }
}

(async () => {
  console.log("dynwinrt AbortSignal smoke test\n");
  await noSignalStillWorks();
  await preAborted();
  await abortMidFlight();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
