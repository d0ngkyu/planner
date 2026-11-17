// Web stays build-free; the Android bootstrap supplies native implementations.
export const native = globalThis.plannerNative || null;
