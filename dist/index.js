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
    pluginResponses = null;
    snapshot = null;
    getResult(index) {
        if (this.pluginResponses === null)
            return null;
        else
            return this.pluginResponses[index] ?? null;
    }
    getStackHeight() {
        if (this.pluginResponses === null)
            return null;
        else
            return this.pluginResponses.length;
    }
    getSnapshot() {
        return this.snapshot;
    }
    async build(content) {
        if (content === "dir")
            return {};
        let processor = (0, unified_1.unified)();
        this.pluginResponses = null;
        this.snapshot = null;
        let wipPluginResponses = [];
        let wipPluginResults = [];
        for (const plugin of this.settings().stack ?? []) {
            let options;
            let packageIdent;
            let snapshot;
            let saveSnapshot;
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
                        snapshot = plugin.snapshot === true || plugin.snapshot === "save";
                        if (plugin.snapshot === "save")
                            saveSnapshot = true;
                    }
                    else
                        throw new Error(`Cannot tell which webpan+unified processor does "${JSON.stringify(plugin)}" refers to`);
                    break;
                default:
                    throw new Error(`Cannot tell which webpan+unified processor does "${JSON.stringify(plugin)}" refers to`);
            }
            let currentPluginResponse = {
                pluginName: packageIdent,
                pluginOptions: options,
            };
            let currentPluginResults = {};
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
                let pluginObj = new foundClass(currentPluginResponse);
                pluginObj.apply(processor, options);
            }
            wipPluginResponses.push(currentPluginResponse);
            wipPluginResults.push(currentPluginResults);
            if (snapshot)
                processor.use(() => (content) => {
                    currentPluginResponse.snapshot = structuredClone(content);
                    if (saveSnapshot)
                        currentPluginResults.snapshot = currentPluginResponse;
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
        this.pluginResponses = wipPluginResponses;
        let outPath = runRename(`${this.settings().output}`, this.filePath());
        if (vfile === null)
            throw new Error(`outputs to ${outPath} but stack does not end in a string`);
        if (this.settings().snapshot === true || this.settings().snapshot === "save")
            this.snapshot = vfile;
        let out = {
            relative: new Map([[outPath, { buffer: vfile.value, priority: this.settings().priority ?? 0 }]]),
            result: {
                pluginResults: wipPluginResults.map((res, index) => {
                    return {
                        snapshot: res.snapshot,
                        result: wipPluginResponses[index]?.result
                    };
                })
            }
        };
        if (this.settings().snapshot === "save")
            out.result.snapshot = vfile.value;
        return out;
    }
}
exports.default = UnifiedProcessor;
class WUnifiedPlugin {
    response;
    constructor(dataPtr) {
        this.response = dataPtr;
    }
    setData(data) {
        this.response.data = data;
    }
    setResult(data) {
        this.response.result = data;
    }
}
exports.WUnifiedPlugin = WUnifiedPlugin;
//# sourceMappingURL=index.js.map