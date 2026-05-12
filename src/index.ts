import path = require("path")
import webpan = require("webpan")
import type { ProcessorOutputRaw } from "webpan/dist/types/processorStates";
import { unified, Processor } from 'unified'

function runRename(expr: string, pathToProccess: string) {
    function ext(newExt: string) {
        return (pathAny: string) => {
            let parsed = path.parse(pathAny)
            return path.format({
                ext: newExt,
                name: parsed.name,
                dir: parsed.dir
            })
        }
    }

    let html = ext('html')

    let f = eval(expr);

    if (typeof f === "function")
        return `${f(pathToProccess)}`
    else {
        console.warn(`"${expr}" cannot be used as a rename function`);
        return pathToProccess
    }
}

interface UnifiedPluginData {
    pluginName: string;
    pluginOptions: any;
    custom: Record<string, any>;
    snapshot?: any,
}

export default class UnifiedProcessor extends webpan.Processor {
    private pluginResults: UnifiedPluginData[] | null = null;

    getResult(index: number): UnifiedPluginData | null {
        if (this.pluginResults === null)
            return null
        else
            return this.pluginResults[index] ?? null
    }

    getStackHeight(): number | null {
        if (this.pluginResults === null)
            return null
        else
            return this.pluginResults.length
    }

    async build(content: Buffer | "dir"): Promise<ProcessorOutputRaw> {
        if (content === "dir") return {}

        let processor = unified();

        this.pluginResults = null;
        let wipPluginResults: UnifiedPluginData[] = []

        for (const plugin of this.settings().stack ?? []) {
            let options: Record<string, any>;
            let packageIdent: string;

            switch (typeof plugin) {
                case "string":
                    packageIdent = plugin;
                    options = {};
                    break;
                case "object":
                    if ("name" in plugin) {
                        packageIdent = `${plugin.name}`
                        options = plugin
                    } else
                        throw new Error(`Cannot tell which webpan+unified processor does "${JSON.stringify(plugin)}" refers to`)

                    break;
                default:
                    throw new Error(`Cannot tell which webpan+unified processor does "${JSON.stringify(plugin)}" refers to`)
            }

            let currentPluginResult: UnifiedPluginData = {
                pluginName: packageIdent,
                pluginOptions: options,
                custom: {}
            };

            wipPluginResults.push(currentPluginResult);

            if (packageIdent.startsWith("raw:")) {
                let rawClass = require(packageIdent.slice(4)).default;

                if (typeof rawClass !== "function")
                    throw new Error(
                        `Package ${packageIdent} doesn't seem to be a webpan+unified processor`
                    );

                processor = processor.use(rawClass, options)
            } else {
                let foundClass = require(`wunified-${packageIdent}`).default;

                if (typeof foundClass !== "function")
                    throw new Error(
                        `Package ${packageIdent} doesn't seem to be a webpan+unified processor`
                    );

                let pluginObj: WUnifiedPlugin = new foundClass(currentPluginResult);
                processor = pluginObj.apply(processor, options)
            }

            if (options.snapshot === true) {
                processor = processor.apply(() => (content: any) => {
                    currentPluginResult.snapshot = structuredClone(content)
                })
            }
        }

        let vfile = await processor.process(content);

        if (this.settings().output === undefined)
            return {}

        this.pluginResults = wipPluginResults;

        let outPath = runRename(`${this.settings().target}`, this.filePath());

        return {
            relative: new Map([[outPath, { buffer: vfile.value, priority: this.settings().priority ?? 0 }]]),
        }
    }
}

export type UntypedProcessor = Processor<any, any, any, any, any>

export abstract class WUnifiedPlugin {
    public result: Record<string, any>;

    constructor(resultPtr: Record<string, any>) {
        this.result = resultPtr
    }

    abstract apply(processor: UntypedProcessor, options: Record<string, any>): UntypedProcessor
}
