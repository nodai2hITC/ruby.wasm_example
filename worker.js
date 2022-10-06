"use strict";

importScripts("https://cdn.jsdelivr.net/npm/ruby-head-wasm-wasi@0.3.0-2022-09-29-a/dist/browser.umd.js");

let RubyModule;

const { DefaultRubyVM } = this["ruby-wasm-wasi"];
const main = async () => {
  const response = await fetch(
    "https://cdn.jsdelivr.net/npm/ruby-head-wasm-wasi@0.3.0-2022-09-29-a/dist/ruby+stdlib.wasm"
    );
  const buffer = await response.arrayBuffer();
  const module = await WebAssembly.compile(buffer);
  RubyModule = module;
  self.postMessage(["init"]);
};
main();

self.addEventListener("message", async function(e) {
  if (e.data[0] == "run") {
    const script = e.data[1];
    const input  = e.data[2];
    const { vm } = await DefaultRubyVM(RubyModule);
    vm.eval(`
require "stringio"
$stdout = $stderr = StringIO.new(+"", "w")
$stdin = StringIO.new('${input.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}')
require "js"
def $stdout.write(str)
  JS::eval("postMessage(['output', \`#{str.gsub('\\\\', '\\\\\\\\').gsub('\\'', '\\\\\\'')}\`])")
end
    `)
    let output = "";
    try{
      vm.eval(script);
      output = vm.eval(`$stdout.string`).toString();
    } catch(err) {
      output = err.toString();
    }
    self.postMessage(["output", output]);
    self.postMessage(["end"]);
  }
}, false);
