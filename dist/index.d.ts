import webpan = require("webpan");
import type { ProcessorOutputRaw } from "webpan/dist/types/processorStates";
import { Processor } from 'unified';
interface UnifiedPluginData {
    pluginName: string;
    pluginOptions: any;
    custom: Record<string, any>;
    snapshot?: any;
}
export default class UnifiedProcessor extends webpan.Processor {
    private pluginResults;
    getResult(index: number): UnifiedPluginData | null;
    getStackHeight(): number | null;
    build(content: Buffer | "dir"): Promise<ProcessorOutputRaw>;
}
export type UntypedProcessor = Processor<any, any, any, any, any>;
export declare abstract class WUnifiedPlugin {
    result: Record<string, any>;
    constructor(resultPtr: Record<string, any>);
    abstract apply(processor: UntypedProcessor, options: Record<string, any>): UntypedProcessor;
}
export {};
//# sourceMappingURL=index.d.ts.map