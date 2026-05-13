import path = require("path")
import webpan = require("webpan")
import type { ProcessorOutputRaw } from "webpan/dist/types/processorStates";
import { unified, Processor } from 'unified'
import { VFile } from "vfile";

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

    if (/^[a-z0-9]+$/i.test(expr))
        expr = `ext("${expr}")`

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
    private snapshot: VFile | null = null;

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

    getSnapshot(): VFile | null {
        return this.snapshot;
    }

    async build(content: Buffer | "dir"): Promise<ProcessorOutputRaw> {
        if (content === "dir") return {}

        let processor = unified();

        this.pluginResults = null;
        this.snapshot = null;

        let wipPluginResults: UnifiedPluginData[] = []

        for (const plugin of this.settings().stack ?? []) {
            let options: Record<string, any> | undefined;
            let packageIdent: string;
            let snapshot: boolean;

            switch (typeof plugin) {
                case "string":
                    packageIdent = plugin;
                    options = undefined;
                    snapshot = false;
                    break;
                case "object":
                    if ("name" in plugin) {
                        packageIdent = `${plugin.name}`
                        options = plugin.options
                        snapshot = plugin.snapshot ?? false;
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

                processor.use(rawClass, options)
            } else {
                let foundClass = require(`wunified-${packageIdent}`).default;

                if (typeof foundClass !== "function")
                    throw new Error(
                        `Package ${packageIdent} doesn't seem to be a webpan+unified processor`
                    );

                let pluginObj: WUnifiedPlugin = new foundClass(currentPluginResult);
                pluginObj.apply(processor, options)
            }

            if (snapshot)
                processor.use(() => (content: any) => {
                    currentPluginResult.snapshot = structuredClone(content)
                })

        }

        let hasCompiler = !!processor.freeze().compiler;

        let vfile: VFile | null = null;
        if (hasCompiler)
            vfile = await processor.process(content)
        else {
            const file = new VFile({ value: content })
            const tree = await processor.run(processor.parse(file), file)
            file.result = tree
        }

        if (this.settings().output === undefined)
            return {}

        this.pluginResults = wipPluginResults;

        let outPath = runRename(`${this.settings().output}`, this.filePath());

        if (vfile === null)
            throw new Error(`outputs to ${outPath} but stack does not end in a string`)

        if (this.settings().snapshot === true)
            this.snapshot = vfile;

        return {
            relative: new Map([[outPath, { buffer: vfile.value, priority: this.settings().priority ?? 0 }]]),
        }
    }
}

export type UntypedProcessor = Processor<any, any, any, any, any>

export abstract class WUnifiedPlugin {
    public data: Record<string, any>;

    constructor(dataPtr: Record<string, any>) {
        this.data = dataPtr
    }

    abstract apply(processor: UntypedProcessor, options: Record<string, any> | undefined): void;
}
