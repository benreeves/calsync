"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = exports.notConcurrent = void 0;
const notConcurrent = (proc) => {
    let inFlight = false;
    return () => {
        if (!inFlight) {
            inFlight = (async () => {
                try {
                    return await proc();
                }
                finally {
                    inFlight = false;
                }
            })();
        }
        return inFlight;
    };
};
exports.notConcurrent = notConcurrent;
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
exports.delay = delay;
//# sourceMappingURL=common.js.map