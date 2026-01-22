import webpan = require("webpan");
import type { ProcessorOutputRaw } from "webpan/dist/types/processorStates";
import { Processor } from 'unified';
export default class CopyProcessor extends webpan.Processor {
    build(content: Buffer | "dir"): Promise<ProcessorOutputRaw>;
}
export type UntypedProcessor = Processor<any, any, any, any, any>;
export declare abstract class WUnifiedPlugin {
    abstract apply(processor: UntypedProcessor, options: any): UntypedProcessor;
}
//# sourceMappingURL=index.d.ts.map