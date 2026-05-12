"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WUnifiedPlugin = void 0;
const path = require("path");
const webpan = require("webpan");
const unified_1 = require("unified");
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
    let html = ext('html');
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
    async build(content) {
        if (content === "dir")
            return {};
        let processor = (0, unified_1.unified)();
        this.pluginResults = null;
        let wipPluginResults = [];
        for (const plugin of this.settings().stack ?? []) {
            let options;
            let packageIdent;
            switch (typeof plugin) {
                case "string":
                    packageIdent = plugin;
                    options = {};
                    break;
                case "object":
                    if ("name" in plugin) {
                        packageIdent = `${plugin.name}`;
                        options = plugin;
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
                processor = processor.use(rawClass, options);
            }
            else {
                let foundClass = require(`wunified-${packageIdent}`).default;
                if (typeof foundClass !== "function")
                    throw new Error(`Package ${packageIdent} doesn't seem to be a webpan+unified processor`);
                let pluginObj = new foundClass(currentPluginResult);
                processor = pluginObj.apply(processor, options);
            }
            if (options.snapshot === true) {
                processor = processor.apply(() => (content) => {
                    currentPluginResult.snapshot = structuredClone(content);
                });
            }
        }
        let vfile = await processor.process(content);
        let outPath = this.filePath();
        if (this.settings().rename !== undefined)
            outPath = runRename(`${this.settings().rename}`, outPath);
        this.pluginResults = wipPluginResults;
        if (this.settings().nooutput === true)
            return {};
        return {
            relative: new Map([[outPath, { buffer: vfile.value, priority: this.settings().priority ?? 0 }]]),
        };
    }
}
exports.default = UnifiedProcessor;
class WUnifiedPlugin {
    result;
    constructor(resultPtr) {
        this.result = resultPtr;
    }
}
exports.WUnifiedPlugin = WUnifiedPlugin;
//# sourceMappingURL=index.js.map