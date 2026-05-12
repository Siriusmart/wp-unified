import webpan = require("webpan");
import type { ProcessorOutputRaw } from "webpan/dist/types/processorStates";
import { Processor } from 'unified';
interface UnifiedProcessorData {
    pluginName: string;
    pluginOption: any;
    custom: Record<string, any>;
}
export default class UnifiedProcessor extends webpan.Processor {
    pluginResults: UnifiedProcessorData[] | null;
    build(content: Buffer | "dir"): Promise<ProcessorOutputRaw>;
}
export type UntypedProcessor = Processor<any, any, any, any, any>;
export declare abstract class WUnifiedPlugin {
    result: Record<string, any>;
    constructor(resultPtr: Record<string, any>);
    abstract apply(processor: UntypedProcessor, options: any): UntypedProcessor;
}
export {};
//# sourceMappingURL=index.d.ts.map