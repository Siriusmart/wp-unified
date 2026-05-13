"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WUnifiedPlugin = void 0;
const path = require("path");
const webpan = require("webpan");
const unified_1 = require("unified");
const vfile_1 = require("vfile");
function runRename(expr, pathToProccess) {
    function ext(newExt) {
        return (pathAny) => {
            let parsed = path.parse(pathAny);
            return path.format({
                ext: newExt,
                name: parsed.name,
                dir: parsed.dir
            });
        };
    }
    if (/^[a-z0-9]+$/i.test(expr))
        expr = `ext("${expr}")`;
    let f = eval(expr);
    if (typeof f === "function")
        return `${f(pathToProccess)}`;
    else {
        console.warn(`"${expr}" cannot be used as a rename function`);
        return pathToProccess;
    }
}
class UnifiedProcessor extends webpan.Processor {
    pluginResults = null;
    snapshot = null;
    getResult(index) {
        if (this.pluginResults === null)
            return null;
        else
            return this.pluginResults[index] ?? null;
    }
    getStackHeight() {
        if (this.pluginResults === null)
            return null;
        else
            return this.pluginResults.length;
    }
    getSnapshot() {
        return this.snapshot;
    }
    async build(content) {
        if (content === "dir")
            return {};
        let processor = (0, unified_1.unified)();
        this.pluginResults = null;
        this.snapshot = null;
        let wipPluginResults = [];
        for (const plugin of this.settings().stack ?? []) {
            let options;
            let packageIdent;
            let snapshot;
            switch (typeof plugin) {
                case "string":
                    packageIdent = plugin;
                    options = undefined;
                    snapshot = false;
                    break;
                case "object":
                    if ("name" in plugin) {
                        packageIdent = `${plugin.name}`;
                        options = plugin.options;
                        snapshot = plugin.snapshot ?? false;
                    }
                    else
                        throw new Error(`Cannot tell which webpan+unified processor does "${JSON.stringify(plugin)}" refers to`);
                    break;
                default:
                    throw new Error(`Cannot tell which webpan+unified processor does "${JSON.stringify(plugin)}" refers to`);
            }
            let currentPluginResult = {
                pluginName: packageIdent,
                pluginOptions: options,
                custom: {}
            };
            wipPluginResults.push(currentPluginResult);
            if (packageIdent.startsWith("raw:")) {
                let rawClass = require(packageIdent.slice(4)).default;
                if (typeof rawClass !== "function")
                    throw new Error(`Package ${packageIdent} doesn't seem to be a webpan+unified processor`);
                processor.use(rawClass, options);
            }
            else {
                let foundClass = require(`wunified-${packageIdent}`).default;
                if (typeof foundClass !== "function")
                    throw new Error(`Package ${packageIdent} doesn't seem to be a webpan+unified processor`);
                let pluginObj = new foundClass(currentPluginResult);
                pluginObj.apply(processor, options);
            }
            if (snapshot)
                processor.use(() => (content) => {
                    currentPluginResult.snapshot = structuredClone(content);
                });
        }
        let hasCompiler = !!processor.freeze().compiler;
        let vfile = null;
        if (hasCompiler)
            vfile = await processor.process(content);
        else {
            const file = new vfile_1.VFile({ value: content });
            const tree = await processor.run(processor.parse(file), file);
            file.result = tree;
        }
        if (this.settings().output === undefined)
            return {};
        this.pluginResults = wipPluginResults;
        let outPath = runRename(`${this.settings().output}`, this.filePath());
        if (vfile === null)
            throw new Error(`outputs to ${outPath} but stack does not end in a string`);
        if (this.settings().snapshot === true)
            this.snapshot = vfile;
        return {
            relative: new Map([[outPath, { buffer: vfile.value, priority: this.settings().priority ?? 0 }]]),
        };
    }
}
exports.default = UnifiedProcessor;
class WUnifiedPlugin {
    data;
    constructor(dataPtr) {
        this.data = dataPtr;
    }
}
exports.WUnifiedPlugin = WUnifiedPlugin;
//# sourceMappingURL=index.js.map