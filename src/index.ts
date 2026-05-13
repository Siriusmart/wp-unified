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

interface UnifiedPluginResponse {
    pluginName: string;
    pluginOptions: any;
    // result will be saved to meta, must only contains json objects
    result?: any;
    // data will not be saved to meta
    data?: any;
    snapshot?: any,
}

interface UnifiedPluginResult {
    result?: any;
    snapshot?: any,
}

export default class UnifiedProcessor extends webpan.Processor {
    private pluginResponses: UnifiedPluginResponse[] | null = null;
    private snapshot: VFile | null = null;

    getResult(index: number): UnifiedPluginResponse | null {
        if (this.pluginResponses === null)
            return null
        else
            return this.pluginResponses[index] ?? null
    }

    getStackHeight(): number | null {
        if (this.pluginResponses === null)
            return null
        else
            return this.pluginResponses.length
    }

    getSnapshot(): VFile | null {
        return this.snapshot;
    }

    async build(content: Buffer | "dir"): Promise<ProcessorOutputRaw> {
        if (content === "dir") return {}

        let processor = unified();

        this.pluginResponses = null;
        this.snapshot = null;

        let wipPluginResponses: UnifiedPluginResponse[] = []
        let wipPluginResults: UnifiedPluginResult[] = []

        for (const plugin of this.settings().stack ?? []) {
            let options: Record<string, any> | undefined;
            let packageIdent: string;
            let snapshot: boolean;
            let saveSnapshot: boolean;

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
                        snapshot = plugin.snapshot === true || plugin.snapshot === "save";
                        if (plugin.snapshot === "save")
                            saveSnapshot = true;
                    } else
                        throw new Error(`Cannot tell which webpan+unified processor does "${JSON.stringify(plugin)}" refers to`)

                    break;
                default:
                    throw new Error(`Cannot tell which webpan+unified processor does "${JSON.stringify(plugin)}" refers to`)
            }

            let currentPluginResponse: UnifiedPluginResponse = {
                pluginName: packageIdent,
                pluginOptions: options,
            };

            let currentPluginResults: UnifiedPluginResult = {};

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

                let pluginObj: WUnifiedPlugin = new foundClass(currentPluginResponse);
                pluginObj.apply(processor, options)
            }

            wipPluginResponses.push(currentPluginResponse);
            wipPluginResults.push(currentPluginResults);

            if (snapshot)
                processor.use(() => (content: any) => {
                    currentPluginResponse.snapshot = structuredClone(content)
                    if (saveSnapshot)
                        currentPluginResults.snapshot = currentPluginResponse
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

        this.pluginResponses = wipPluginResponses;

        let outPath = runRename(`${this.settings().output}`, this.filePath());

        if (vfile === null)
            throw new Error(`outputs to ${outPath} but stack does not end in a string`)

        if (this.settings().snapshot === true || this.settings().snapshot === "save")
            this.snapshot = vfile;

        let out: ProcessorOutputRaw = {
            relative: new Map([[outPath, { buffer: vfile.value, priority: this.settings().priority ?? 0 }]]),
            result: {
                pluginResults: wipPluginResults.map((res, index) => {
                    return {
                        snapshot: res.snapshot,
                        result: wipPluginResponses[index]?.result
                    }
                })
            }
        }


        if (this.settings().snapshot === "save")
            out.result.snapshot = vfile.value;

        return out;
    }
}

export type UntypedProcessor = Processor<any, any, any, any, any>

export abstract class WUnifiedPlugin {
    private response: UnifiedPluginResponse;

    constructor(dataPtr: UnifiedPluginResponse) {
        this.response = dataPtr
    }

    setData(data: any) {
        this.response.data = data;
    }

    setResult(data: any) {
        this.response.result = data;
    }

    abstract apply(processor: UntypedProcessor, options: Record<string, any> | undefined): void;
}
