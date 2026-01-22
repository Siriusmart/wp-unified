import webpan = require("webpan");
import type { ProcessorOutputRaw } from "webpan/dist/types/processorStates";
import { Processor } from 'unified';
export default class CopyProcessor extends webpan.Processor {
    build(content: Buffer | "dir"): Promise<ProcessorOutputRaw>;
}
export declare abstract class WUnifiedPlugin {
    abstract apply(processor: Processor, options: any): Processor;
}
//# sourceMappingURL=index.d.ts.map