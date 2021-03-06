"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writePsdBuffer = exports.writePsdUint8Array = exports.writePsd = exports.readPsd = exports.byteArrayToBase64 = exports.initializeCanvas = void 0;
var psdWriter_1 = require("./psdWriter");
var psdReader_1 = require("./psdReader");
__exportStar(require("./abr"), exports);
__exportStar(require("./csh"), exports);
var helpers_1 = require("./helpers");
Object.defineProperty(exports, "initializeCanvas", { enumerable: true, get: function () { return helpers_1.initializeCanvas; } });
__exportStar(require("./psd"), exports);
var base64_js_1 = require("base64-js");
exports.byteArrayToBase64 = base64_js_1.fromByteArray;
function readPsd(buffer, options) {
    var reader = 'buffer' in buffer ?
        psdReader_1.createReader(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
        psdReader_1.createReader(buffer);
    return psdReader_1.readPsd(reader, options);
}
exports.readPsd = readPsd;
function writePsd(psd, options) {
    var writer = psdWriter_1.createWriter();
    psdWriter_1.writePsd(writer, psd, options);
    return psdWriter_1.getWriterBuffer(writer);
}
exports.writePsd = writePsd;
function writePsdUint8Array(psd, options) {
    var writer = psdWriter_1.createWriter();
    psdWriter_1.writePsd(writer, psd, options);
    return psdWriter_1.getWriterBufferNoCopy(writer);
}
exports.writePsdUint8Array = writePsdUint8Array;
function writePsdBuffer(psd, options) {
    if (typeof Buffer === 'undefined') {
        throw new Error('Buffer not supported on this platform');
    }
    return Buffer.from(writePsdUint8Array(psd, options));
}
exports.writePsdBuffer = writePsdBuffer;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFDQSx5Q0FBNEg7QUFDNUgseUNBQWtGO0FBQ2xGLHdDQUFzQjtBQUN0Qix3Q0FBc0I7QUFDdEIscUNBQTZDO0FBQXBDLDJHQUFBLGdCQUFnQixPQUFBO0FBQ3pCLHdDQUFzQjtBQUN0Qix1Q0FBMEM7QUFTN0IsUUFBQSxpQkFBaUIsR0FBRyx5QkFBYSxDQUFDO0FBRS9DLFNBQWdCLE9BQU8sQ0FBQyxNQUFnQyxFQUFFLE9BQXFCO0lBQzlFLElBQU0sTUFBTSxHQUFHLFFBQVEsSUFBSSxNQUFNLENBQUMsQ0FBQztRQUNsQyx3QkFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUNuRSx3QkFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RCLE9BQU8sbUJBQWUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDekMsQ0FBQztBQUxELDBCQUtDO0FBRUQsU0FBZ0IsUUFBUSxDQUFDLEdBQVEsRUFBRSxPQUFzQjtJQUN4RCxJQUFNLE1BQU0sR0FBRyx3QkFBWSxFQUFFLENBQUM7SUFDOUIsb0JBQWdCLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN2QyxPQUFPLDJCQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDaEMsQ0FBQztBQUpELDRCQUlDO0FBRUQsU0FBZ0Isa0JBQWtCLENBQUMsR0FBUSxFQUFFLE9BQXNCO0lBQ2xFLElBQU0sTUFBTSxHQUFHLHdCQUFZLEVBQUUsQ0FBQztJQUM5QixvQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZDLE9BQU8saUNBQXFCLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdEMsQ0FBQztBQUpELGdEQUlDO0FBRUQsU0FBZ0IsY0FBYyxDQUFDLEdBQVEsRUFBRSxPQUFzQjtJQUM5RCxJQUFJLE9BQU8sTUFBTSxLQUFLLFdBQVcsRUFBRTtRQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7S0FDekQ7SUFFRCxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDdEQsQ0FBQztBQU5ELHdDQU1DIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUHNkLCBSZWFkT3B0aW9ucywgV3JpdGVPcHRpb25zIH0gZnJvbSAnLi9wc2QnO1xuaW1wb3J0IHsgUHNkV3JpdGVyLCB3cml0ZVBzZCBhcyB3cml0ZVBzZEludGVybmFsLCBnZXRXcml0ZXJCdWZmZXIsIGNyZWF0ZVdyaXRlciwgZ2V0V3JpdGVyQnVmZmVyTm9Db3B5IH0gZnJvbSAnLi9wc2RXcml0ZXInO1xuaW1wb3J0IHsgUHNkUmVhZGVyLCByZWFkUHNkIGFzIHJlYWRQc2RJbnRlcm5hbCwgY3JlYXRlUmVhZGVyIH0gZnJvbSAnLi9wc2RSZWFkZXInO1xuZXhwb3J0ICogZnJvbSAnLi9hYnInO1xuZXhwb3J0ICogZnJvbSAnLi9jc2gnO1xuZXhwb3J0IHsgaW5pdGlhbGl6ZUNhbnZhcyB9IGZyb20gJy4vaGVscGVycyc7XG5leHBvcnQgKiBmcm9tICcuL3BzZCc7XG5pbXBvcnQgeyBmcm9tQnl0ZUFycmF5IH0gZnJvbSAnYmFzZTY0LWpzJztcbmV4cG9ydCB7IFBzZFJlYWRlciwgUHNkV3JpdGVyIH07XG5cbmludGVyZmFjZSBCdWZmZXJMaWtlIHtcblx0YnVmZmVyOiBBcnJheUJ1ZmZlcjtcblx0Ynl0ZU9mZnNldDogbnVtYmVyO1xuXHRieXRlTGVuZ3RoOiBudW1iZXI7XG59XG5cbmV4cG9ydCBjb25zdCBieXRlQXJyYXlUb0Jhc2U2NCA9IGZyb21CeXRlQXJyYXk7XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkUHNkKGJ1ZmZlcjogQXJyYXlCdWZmZXIgfCBCdWZmZXJMaWtlLCBvcHRpb25zPzogUmVhZE9wdGlvbnMpOiBQc2Qge1xuXHRjb25zdCByZWFkZXIgPSAnYnVmZmVyJyBpbiBidWZmZXIgP1xuXHRcdGNyZWF0ZVJlYWRlcihidWZmZXIuYnVmZmVyLCBidWZmZXIuYnl0ZU9mZnNldCwgYnVmZmVyLmJ5dGVMZW5ndGgpIDpcblx0XHRjcmVhdGVSZWFkZXIoYnVmZmVyKTtcblx0cmV0dXJuIHJlYWRQc2RJbnRlcm5hbChyZWFkZXIsIG9wdGlvbnMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVQc2QocHNkOiBQc2QsIG9wdGlvbnM/OiBXcml0ZU9wdGlvbnMpOiBBcnJheUJ1ZmZlciB7XG5cdGNvbnN0IHdyaXRlciA9IGNyZWF0ZVdyaXRlcigpO1xuXHR3cml0ZVBzZEludGVybmFsKHdyaXRlciwgcHNkLCBvcHRpb25zKTtcblx0cmV0dXJuIGdldFdyaXRlckJ1ZmZlcih3cml0ZXIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVQc2RVaW50OEFycmF5KHBzZDogUHNkLCBvcHRpb25zPzogV3JpdGVPcHRpb25zKTogVWludDhBcnJheSB7XG5cdGNvbnN0IHdyaXRlciA9IGNyZWF0ZVdyaXRlcigpO1xuXHR3cml0ZVBzZEludGVybmFsKHdyaXRlciwgcHNkLCBvcHRpb25zKTtcblx0cmV0dXJuIGdldFdyaXRlckJ1ZmZlck5vQ29weSh3cml0ZXIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVQc2RCdWZmZXIocHNkOiBQc2QsIG9wdGlvbnM/OiBXcml0ZU9wdGlvbnMpOiBCdWZmZXIge1xuXHRpZiAodHlwZW9mIEJ1ZmZlciA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0J1ZmZlciBub3Qgc3VwcG9ydGVkIG9uIHRoaXMgcGxhdGZvcm0nKTtcblx0fVxuXG5cdHJldHVybiBCdWZmZXIuZnJvbSh3cml0ZVBzZFVpbnQ4QXJyYXkocHNkLCBvcHRpb25zKSk7XG59XG4iXSwic291cmNlUm9vdCI6Ii9Vc2Vycy9icmFuZG9ubGl1L0Rlc2t0b3Avc2t5bGFiL2FnLXBzZC9zcmMifQ==
