"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WUnifiedPlugin = void 0;
const webpan = require("webpan");
const unified_1 = require("unified");
class CopyProcessor extends webpan.Processor {
    async build(content) {
        if (content === "dir")
            return {};
        let processor = (0, unified_1.unified)();
        for (const plugin of this.settings().stack ?? []) {
            let options;
            let packageIdent;
            switch (typeof plugin) {
                case "string":
                    packageIdent = plugin;
                    options = undefined;
                    break;
                case "object":
                    if (Array.isArray(plugin) && plugin.length >= 1) {
                        packageIdent = plugin[0];
                        options = plugin.slice(1);
                    }
                    else if ("name" in plugin) {
                        packageIdent = plugin.name;
                        options = plugin;
                    }
                    else
                        throw new Error(`Cannot tell which webpan+unified processor does "${JSON.stringify(plugin)}" refers to`);
                    break;
                default:
                    throw new Error(`Cannot tell which webpan+unified processor does "${JSON.stringify(plugin)}" refers to`);
            }
            let foundClass = require(`wunified-${packageIdent}`).default;
            if (typeof foundClass !== "function")
                throw new Error(`Package ${packageIdent} doesn't seem to be a webpan+unified processor`);
            let pluginObj = new foundClass();
            processor = pluginObj.apply(processor, options);
        }
        let vfile = await processor.process(content);
        return {
            relative: new Map([[this.filePath(), { buffer: vfile.value, priority: this.settings().priority ?? 0 }]]),
        };
    }
}
exports.default = CopyProcessor;
class WUnifiedPlugin {
}
exports.WUnifiedPlugin = WUnifiedPlugin;
//# sourceMappingURL=index.js.map