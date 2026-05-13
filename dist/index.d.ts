import webpan = require("webpan");
import type { ProcessorOutputRaw } from "webpan/dist/types/processorStates";
import { Processor } from 'unified';
import { VFile } from "vfile";
interface UnifiedPluginResponse {
    pluginName: string;
    pluginOptions: any;
    result?: any;
    data?: any;
    snapshot?: any;
}
export default class UnifiedProcessor extends webpan.Processor {
    private pluginResponses;
    private snapshot;
    getResult(index: number): UnifiedPluginResponse | null;
    getStackHeight(): number | null;
    getSnapshot(): VFile | null;
    build(content: Buffer | "dir"): Promise<ProcessorOutputRaw>;
}
export type UntypedProcessor = Processor<any, any, any, any, any>;
export declare abstract class WUnifiedPlugin {
    private response;
    constructor(dataPtr: UnifiedPluginResponse);
    setData(data: any): void;
    setResult(data: any): void;
    abstract apply(processor: UntypedProcessor, options: Record<string, any> | undefined): void;
}
export {};
//# sourceMappingURL=index.d.ts.map