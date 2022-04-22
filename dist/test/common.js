"use strict";
/// <reference types="mocha" />
/// <reference path="../../typings/chai.d.ts" />
/// <reference path="../../typings/canvas.d.ts" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.expectBuffersEqual = exports.compareBuffers = exports.compareCanvases = exports.compareTwoFiles = exports.loadCanvasFromFile = exports.saveCanvas = exports.extractPSD = exports.readPsdFromFile = exports.createReaderFromBuffer = exports.loadImagesFromDirectory = exports.importPSD = exports.range = exports.repeat = exports.toArrayBuffer = exports.createCanvas = void 0;
require('source-map-support').install();
var fs = require("fs");
var path = require("path");
var canvas_1 = require("canvas");
Object.defineProperty(exports, "createCanvas", { enumerable: true, get: function () { return canvas_1.createCanvas; } });
require("../initializeCanvas");
var psdReader_1 = require("../psdReader");
var descriptor_1 = require("../descriptor");
descriptor_1.setLogErrors(true);
var resultsPath = path.join(__dirname, '..', '..', 'results');
function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}
exports.toArrayBuffer = toArrayBuffer;
function repeat(times) {
    var values = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        values[_i - 1] = arguments[_i];
    }
    if (!values.length) {
        throw new Error('missing values');
    }
    var array = [];
    for (var i = 0; i < times; i++) {
        array.push.apply(array, values);
    }
    return array;
}
exports.repeat = repeat;
function range(start, length) {
    var array = [];
    for (var i = 0; i < length; i++) {
        array.push(start + i);
    }
    return array;
}
exports.range = range;
function importPSD(dirName) {
    var dataPath = path.join(dirName, 'data.json');
    if (!fs.existsSync(dataPath))
        return undefined;
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}
exports.importPSD = importPSD;
function loadImagesFromDirectory(dirName) {
    var images = {};
    fs.readdirSync(dirName)
        .filter(function (f) { return /\.png$/.test(f); })
        .forEach(function (f) { return images[f] = loadCanvasFromFile(path.join(dirName, f)); });
    return images;
}
exports.loadImagesFromDirectory = loadImagesFromDirectory;
function createReaderFromBuffer(buffer) {
    var reader = psdReader_1.createReader(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    reader.strict = true; // for testing
    return reader;
}
exports.createReaderFromBuffer = createReaderFromBuffer;
function readPsdFromFile(fileName, options) {
    var buffer = fs.readFileSync(fileName);
    var reader = createReaderFromBuffer(buffer);
    return psdReader_1.readPsd(reader, options);
}
exports.readPsdFromFile = readPsdFromFile;
function extractPSD(filePath, psd) {
    var basePath = path.join(resultsPath, filePath);
    if (!fs.existsSync(basePath))
        fs.mkdirSync(basePath);
    if (psd.canvas) {
        fs.writeFileSync(path.join(basePath, 'canvas.png'), psd.canvas.toBuffer());
        psd.canvas = undefined;
    }
    psd.children.forEach(function (l, i) {
        if (l.canvas) {
            fs.writeFileSync(path.join(basePath, "layer-" + i + ".png"), l.canvas.toBuffer());
            l.canvas = undefined;
        }
    });
    fs.writeFileSync(path.join(basePath, 'data.json'), JSON.stringify(psd, null, 2));
}
exports.extractPSD = extractPSD;
function saveCanvas(fileName, canvas) {
    if (canvas) {
        fs.writeFileSync(fileName, canvas.toBuffer());
    }
}
exports.saveCanvas = saveCanvas;
function loadCanvasFromFile(filePath) {
    var img = new canvas_1.Image();
    img.src = fs.readFileSync(filePath);
    var canvas = canvas_1.createCanvas(img.width, img.height);
    canvas.getContext('2d').drawImage(img, 0, 0);
    return canvas;
}
exports.loadCanvasFromFile = loadCanvasFromFile;
function compareTwoFiles(expectedPath, actual, name) {
    var expectedBuffer = fs.readFileSync(expectedPath);
    var expected = new Uint8Array(expectedBuffer.buffer, expectedBuffer.byteOffset, expectedBuffer.byteLength);
    if (expected.byteLength !== actual.byteLength) {
        throw new Error("File size is different than expected (" + name + ")");
    }
    for (var i = 0; i < expected.byteLength; i++) {
        if (expected[i] !== actual[i]) {
            throw new Error("Actual file different than expected at index " + i + ": actual " + actual[i] + ", expected " + expected[i]);
        }
    }
}
exports.compareTwoFiles = compareTwoFiles;
function compareCanvases(expected, actual, name) {
    var saveFailure = function () {
        var failuresDir = path.join(resultsPath, 'failures');
        if (!fs.existsSync(failuresDir)) {
            fs.mkdirSync(failuresDir);
        }
        fs.writeFileSync(path.join(failuresDir, "" + name.replace(/[\\/]/, '-')), actual.toBuffer());
    };
    if (expected === actual)
        return;
    if (!expected)
        throw new Error("Expected canvas is null (" + name + ")");
    if (!actual)
        throw new Error("Actual canvas is null (" + name + ")");
    if (expected.width !== actual.width || expected.height !== actual.height) {
        saveFailure();
        throw new Error("Canvas size is different than expected (" + name + ")");
    }
    var expectedData = expected.getContext('2d').getImageData(0, 0, expected.width, expected.height);
    var actualData = actual.getContext('2d').getImageData(0, 0, actual.width, actual.height);
    var length = expectedData.width * expectedData.height * 4;
    for (var i = 0; i < length; i++) {
        if (expectedData.data[i] !== actualData.data[i]) {
            saveFailure();
            var expectedNumBytes = expectedData.data.length;
            var actualNumBytes = actualData.data.length;
            throw new Error("Actual canvas (" + actualNumBytes + " bytes) different " +
                ("than expected (" + name + ": " + expectedNumBytes + " bytes) ") +
                ("at index " + i + ": actual " + actualData.data[i] + " vs. expected " + expectedData.data[i]));
        }
    }
}
exports.compareCanvases = compareCanvases;
function compareBuffers(actual, expected, test, start, offset) {
    if (start === void 0) { start = 0; }
    if (offset === void 0) { offset = 0; }
    if (!actual)
        throw new Error("Actual buffer is null or undefined (" + test + ")");
    if (!expected)
        throw new Error("Expected buffer is null or undefined (" + test + ")");
    for (var i = start; i < expected.length; i++) {
        if (expected[i] !== actual[i + offset]) {
            throw new Error("Buffers differ " +
                ("expected: 0x" + expected[i].toString(16) + " at [0x" + i.toString(16) + "] ") +
                ("actual: 0x" + actual[i + offset].toString(16) + " at [0x" + (i + offset).toString(16) + "] (" + test + ")"));
        }
    }
    if (actual.length !== expected.length)
        throw new Error("Buffers differ in size actual: " + actual.length + " expected: " + expected.length + " (" + test + ")");
}
exports.compareBuffers = compareBuffers;
function expectBuffersEqual(actual, expected, name) {
    var length = Math.max(actual.length, expected.length);
    for (var i = 0; i < length; i++) {
        if (actual[i] !== expected[i]) {
            fs.writeFileSync(path.join(__dirname, '..', '..', 'results', name), Buffer.from(actual));
            throw new Error("Different byte at 0x" + i.toString(16) + " in (" + name + ")");
        }
    }
}
exports.expectBuffersEqual = expectBuffersEqual;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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anMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSB0eXBlcz1cIm1vY2hhXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi90eXBpbmdzL2NoYWkuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vdHlwaW5ncy9jYW52YXMuZC50c1wiIC8+XG5cbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydCcpLmluc3RhbGwoKTtcblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGNyZWF0ZUNhbnZhcywgSW1hZ2UgfSBmcm9tICdjYW52YXMnO1xuaW1wb3J0ICcuLi9pbml0aWFsaXplQ2FudmFzJztcbmltcG9ydCB7IFBzZCwgUmVhZE9wdGlvbnMgfSBmcm9tICcuLi9pbmRleCc7XG5pbXBvcnQgeyByZWFkUHNkLCBjcmVhdGVSZWFkZXIgfSBmcm9tICcuLi9wc2RSZWFkZXInO1xuaW1wb3J0IHsgc2V0TG9nRXJyb3JzIH0gZnJvbSAnLi4vZGVzY3JpcHRvcic7XG5leHBvcnQgeyBjcmVhdGVDYW52YXMgfTtcblxuc2V0TG9nRXJyb3JzKHRydWUpO1xuXG5jb25zdCByZXN1bHRzUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICcuLicsICdyZXN1bHRzJyk7XG5cbmV4cG9ydCB0eXBlIEltYWdlTWFwID0geyBba2V5OiBzdHJpbmddOiBIVE1MQ2FudmFzRWxlbWVudCB9O1xuXG5leHBvcnQgZnVuY3Rpb24gdG9BcnJheUJ1ZmZlcihidWZmZXI6IEJ1ZmZlcikge1xuXHRjb25zdCBhYiA9IG5ldyBBcnJheUJ1ZmZlcihidWZmZXIubGVuZ3RoKTtcblx0Y29uc3QgdmlldyA9IG5ldyBVaW50OEFycmF5KGFiKTtcblxuXHRmb3IgKGxldCBpID0gMDsgaSA8IGJ1ZmZlci5sZW5ndGg7ICsraSkge1xuXHRcdHZpZXdbaV0gPSBidWZmZXJbaV07XG5cdH1cblxuXHRyZXR1cm4gYWI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXBlYXQ8VD4odGltZXM6IG51bWJlciwgLi4udmFsdWVzOiBUW10pOiBUW10ge1xuXHRpZiAoIXZhbHVlcy5sZW5ndGgpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ21pc3NpbmcgdmFsdWVzJyk7XG5cdH1cblxuXHRjb25zdCBhcnJheTogVFtdID0gW107XG5cblx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0aW1lczsgaSsrKSB7XG5cdFx0YXJyYXkucHVzaCguLi52YWx1ZXMpO1xuXHR9XG5cblx0cmV0dXJuIGFycmF5O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZ2Uoc3RhcnQ6IG51bWJlciwgbGVuZ3RoOiBudW1iZXIpOiBudW1iZXJbXSB7XG5cdGNvbnN0IGFycmF5OiBudW1iZXJbXSA9IFtdO1xuXG5cdGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0XHRhcnJheS5wdXNoKHN0YXJ0ICsgaSk7XG5cdH1cblxuXHRyZXR1cm4gYXJyYXk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbXBvcnRQU0QoZGlyTmFtZTogc3RyaW5nKTogUHNkIHwgdW5kZWZpbmVkIHtcblx0Y29uc3QgZGF0YVBhdGggPSBwYXRoLmpvaW4oZGlyTmFtZSwgJ2RhdGEuanNvbicpO1xuXG5cdGlmICghZnMuZXhpc3RzU3luYyhkYXRhUGF0aCkpXG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblxuXHRyZXR1cm4gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoZGF0YVBhdGgsICd1dGY4JykpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbG9hZEltYWdlc0Zyb21EaXJlY3RvcnkoZGlyTmFtZTogc3RyaW5nKSB7XG5cdGNvbnN0IGltYWdlczogSW1hZ2VNYXAgPSB7fTtcblxuXHRmcy5yZWFkZGlyU3luYyhkaXJOYW1lKVxuXHRcdC5maWx0ZXIoZiA9PiAvXFwucG5nJC8udGVzdChmKSlcblx0XHQuZm9yRWFjaChmID0+IGltYWdlc1tmXSA9IGxvYWRDYW52YXNGcm9tRmlsZShwYXRoLmpvaW4oZGlyTmFtZSwgZikpKTtcblxuXHRyZXR1cm4gaW1hZ2VzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVhZGVyRnJvbUJ1ZmZlcihidWZmZXI6IEJ1ZmZlcikge1xuXHRjb25zdCByZWFkZXIgPSBjcmVhdGVSZWFkZXIoYnVmZmVyLmJ1ZmZlciwgYnVmZmVyLmJ5dGVPZmZzZXQsIGJ1ZmZlci5ieXRlTGVuZ3RoKTtcblx0cmVhZGVyLnN0cmljdCA9IHRydWU7IC8vIGZvciB0ZXN0aW5nXG5cdHJldHVybiByZWFkZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkUHNkRnJvbUZpbGUoZmlsZU5hbWU6IHN0cmluZywgb3B0aW9ucz86IFJlYWRPcHRpb25zKTogUHNkIHtcblx0Y29uc3QgYnVmZmVyID0gZnMucmVhZEZpbGVTeW5jKGZpbGVOYW1lKTtcblx0Y29uc3QgcmVhZGVyID0gY3JlYXRlUmVhZGVyRnJvbUJ1ZmZlcihidWZmZXIpO1xuXHRyZXR1cm4gcmVhZFBzZChyZWFkZXIsIG9wdGlvbnMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFBTRChmaWxlUGF0aDogc3RyaW5nLCBwc2Q6IFBzZCkge1xuXHRjb25zdCBiYXNlUGF0aCA9IHBhdGguam9pbihyZXN1bHRzUGF0aCwgZmlsZVBhdGgpO1xuXG5cdGlmICghZnMuZXhpc3RzU3luYyhiYXNlUGF0aCkpXG5cdFx0ZnMubWtkaXJTeW5jKGJhc2VQYXRoKTtcblxuXHRpZiAocHNkLmNhbnZhcykge1xuXHRcdGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKGJhc2VQYXRoLCAnY2FudmFzLnBuZycpLCBwc2QuY2FudmFzLnRvQnVmZmVyKCkpO1xuXHRcdHBzZC5jYW52YXMgPSB1bmRlZmluZWQ7XG5cdH1cblxuXHRwc2QuY2hpbGRyZW4hLmZvckVhY2goKGwsIGkpID0+IHtcblx0XHRpZiAobC5jYW52YXMpIHtcblx0XHRcdGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKGJhc2VQYXRoLCBgbGF5ZXItJHtpfS5wbmdgKSwgbC5jYW52YXMudG9CdWZmZXIoKSk7XG5cdFx0XHRsLmNhbnZhcyA9IHVuZGVmaW5lZDtcblx0XHR9XG5cdH0pO1xuXG5cdGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKGJhc2VQYXRoLCAnZGF0YS5qc29uJyksIEpTT04uc3RyaW5naWZ5KHBzZCwgbnVsbCwgMikpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZUNhbnZhcyhmaWxlTmFtZTogc3RyaW5nLCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50IHwgdW5kZWZpbmVkKSB7XG5cdGlmIChjYW52YXMpIHtcblx0XHRmcy53cml0ZUZpbGVTeW5jKGZpbGVOYW1lLCBjYW52YXMudG9CdWZmZXIoKSk7XG5cdH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxvYWRDYW52YXNGcm9tRmlsZShmaWxlUGF0aDogc3RyaW5nKSB7XG5cdGNvbnN0IGltZyA9IG5ldyBJbWFnZSgpO1xuXHRpbWcuc3JjID0gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoKTtcblx0Y29uc3QgY2FudmFzID0gY3JlYXRlQ2FudmFzKGltZy53aWR0aCwgaW1nLmhlaWdodCk7XG5cdGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpIS5kcmF3SW1hZ2UoaW1nLCAwLCAwKTtcblx0cmV0dXJuIGNhbnZhcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVUd29GaWxlcyhleHBlY3RlZFBhdGg6IHN0cmluZywgYWN0dWFsOiBVaW50OEFycmF5LCBuYW1lOiBzdHJpbmcpIHtcblx0Y29uc3QgZXhwZWN0ZWRCdWZmZXIgPSBmcy5yZWFkRmlsZVN5bmMoZXhwZWN0ZWRQYXRoKTtcblx0Y29uc3QgZXhwZWN0ZWQgPSBuZXcgVWludDhBcnJheShleHBlY3RlZEJ1ZmZlci5idWZmZXIsIGV4cGVjdGVkQnVmZmVyLmJ5dGVPZmZzZXQsIGV4cGVjdGVkQnVmZmVyLmJ5dGVMZW5ndGgpO1xuXG5cdGlmIChleHBlY3RlZC5ieXRlTGVuZ3RoICE9PSBhY3R1YWwuYnl0ZUxlbmd0aCkge1xuXHRcdHRocm93IG5ldyBFcnJvcihgRmlsZSBzaXplIGlzIGRpZmZlcmVudCB0aGFuIGV4cGVjdGVkICgke25hbWV9KWApO1xuXHR9XG5cblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBleHBlY3RlZC5ieXRlTGVuZ3RoOyBpKyspIHtcblx0XHRpZiAoZXhwZWN0ZWRbaV0gIT09IGFjdHVhbFtpXSkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBBY3R1YWwgZmlsZSBkaWZmZXJlbnQgdGhhbiBleHBlY3RlZCBhdCBpbmRleCAke2l9OiBhY3R1YWwgJHthY3R1YWxbaV19LCBleHBlY3RlZCAke2V4cGVjdGVkW2ldfWApO1xuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZUNhbnZhc2VzKGV4cGVjdGVkOiBIVE1MQ2FudmFzRWxlbWVudCB8IHVuZGVmaW5lZCwgYWN0dWFsOiBIVE1MQ2FudmFzRWxlbWVudCB8IHVuZGVmaW5lZCwgbmFtZTogc3RyaW5nKSB7XG5cdGNvbnN0IHNhdmVGYWlsdXJlID0gKCkgPT4ge1xuXHRcdGNvbnN0IGZhaWx1cmVzRGlyID0gcGF0aC5qb2luKHJlc3VsdHNQYXRoLCAnZmFpbHVyZXMnKTtcblx0XHRpZiAoIWZzLmV4aXN0c1N5bmMoZmFpbHVyZXNEaXIpKSB7XG5cdFx0XHRmcy5ta2RpclN5bmMoZmFpbHVyZXNEaXIpO1xuXHRcdH1cblx0XHRmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihmYWlsdXJlc0RpciwgYCR7bmFtZS5yZXBsYWNlKC9bXFxcXC9dLywgJy0nKX1gKSwgYWN0dWFsIS50b0J1ZmZlcigpKTtcblx0fTtcblxuXHRpZiAoZXhwZWN0ZWQgPT09IGFjdHVhbClcblx0XHRyZXR1cm47XG5cdGlmICghZXhwZWN0ZWQpXG5cdFx0dGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBjYW52YXMgaXMgbnVsbCAoJHtuYW1lfSlgKTtcblx0aWYgKCFhY3R1YWwpXG5cdFx0dGhyb3cgbmV3IEVycm9yKGBBY3R1YWwgY2FudmFzIGlzIG51bGwgKCR7bmFtZX0pYCk7XG5cblx0aWYgKGV4cGVjdGVkLndpZHRoICE9PSBhY3R1YWwud2lkdGggfHwgZXhwZWN0ZWQuaGVpZ2h0ICE9PSBhY3R1YWwuaGVpZ2h0KSB7XG5cdFx0c2F2ZUZhaWx1cmUoKTtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYENhbnZhcyBzaXplIGlzIGRpZmZlcmVudCB0aGFuIGV4cGVjdGVkICgke25hbWV9KWApO1xuXHR9XG5cblx0Y29uc3QgZXhwZWN0ZWREYXRhID0gZXhwZWN0ZWQuZ2V0Q29udGV4dCgnMmQnKSEuZ2V0SW1hZ2VEYXRhKDAsIDAsIGV4cGVjdGVkLndpZHRoLCBleHBlY3RlZC5oZWlnaHQpO1xuXHRjb25zdCBhY3R1YWxEYXRhID0gYWN0dWFsLmdldENvbnRleHQoJzJkJykhLmdldEltYWdlRGF0YSgwLCAwLCBhY3R1YWwud2lkdGgsIGFjdHVhbC5oZWlnaHQpO1xuXHRjb25zdCBsZW5ndGggPSBleHBlY3RlZERhdGEud2lkdGggKiBleHBlY3RlZERhdGEuaGVpZ2h0ICogNDtcblxuXHRmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdFx0aWYgKGV4cGVjdGVkRGF0YS5kYXRhW2ldICE9PSBhY3R1YWxEYXRhLmRhdGFbaV0pIHtcblx0XHRcdHNhdmVGYWlsdXJlKCk7XG5cdFx0XHRjb25zdCBleHBlY3RlZE51bUJ5dGVzID0gZXhwZWN0ZWREYXRhLmRhdGEubGVuZ3RoO1xuXHRcdFx0Y29uc3QgYWN0dWFsTnVtQnl0ZXMgPSBhY3R1YWxEYXRhLmRhdGEubGVuZ3RoO1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFxuXHRcdFx0XHRgQWN0dWFsIGNhbnZhcyAoJHthY3R1YWxOdW1CeXRlc30gYnl0ZXMpIGRpZmZlcmVudCBgICtcblx0XHRcdFx0YHRoYW4gZXhwZWN0ZWQgKCR7bmFtZX06ICR7ZXhwZWN0ZWROdW1CeXRlc30gYnl0ZXMpIGAgK1xuXHRcdFx0XHRgYXQgaW5kZXggJHtpfTogYWN0dWFsICR7YWN0dWFsRGF0YS5kYXRhW2ldfSB2cy4gZXhwZWN0ZWQgJHtleHBlY3RlZERhdGEuZGF0YVtpXX1gXG5cdFx0XHQpO1xuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZUJ1ZmZlcnMoYWN0dWFsOiBCdWZmZXIsIGV4cGVjdGVkOiBCdWZmZXIsIHRlc3Q6IHN0cmluZywgc3RhcnQgPSAwLCBvZmZzZXQgPSAwKSB7XG5cdGlmICghYWN0dWFsKVxuXHRcdHRocm93IG5ldyBFcnJvcihgQWN0dWFsIGJ1ZmZlciBpcyBudWxsIG9yIHVuZGVmaW5lZCAoJHt0ZXN0fSlgKTtcblx0aWYgKCFleHBlY3RlZClcblx0XHR0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGJ1ZmZlciBpcyBudWxsIG9yIHVuZGVmaW5lZCAoJHt0ZXN0fSlgKTtcblxuXHRmb3IgKGxldCBpID0gc3RhcnQ7IGkgPCBleHBlY3RlZC5sZW5ndGg7IGkrKykge1xuXHRcdGlmIChleHBlY3RlZFtpXSAhPT0gYWN0dWFsW2kgKyBvZmZzZXRdKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYEJ1ZmZlcnMgZGlmZmVyIGAgK1xuXHRcdFx0XHRgZXhwZWN0ZWQ6IDB4JHtleHBlY3RlZFtpXS50b1N0cmluZygxNil9IGF0IFsweCR7aS50b1N0cmluZygxNil9XSBgICtcblx0XHRcdFx0YGFjdHVhbDogMHgke2FjdHVhbFtpICsgb2Zmc2V0XS50b1N0cmluZygxNil9IGF0IFsweCR7KGkgKyBvZmZzZXQpLnRvU3RyaW5nKDE2KX1dICgke3Rlc3R9KWApO1xuXHRcdH1cblx0fVxuXG5cdGlmIChhY3R1YWwubGVuZ3RoICE9PSBleHBlY3RlZC5sZW5ndGgpXG5cdFx0dGhyb3cgbmV3IEVycm9yKGBCdWZmZXJzIGRpZmZlciBpbiBzaXplIGFjdHVhbDogJHthY3R1YWwubGVuZ3RofSBleHBlY3RlZDogJHtleHBlY3RlZC5sZW5ndGh9ICgke3Rlc3R9KWApO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBleHBlY3RCdWZmZXJzRXF1YWwoYWN0dWFsOiBVaW50OEFycmF5LCBleHBlY3RlZDogVWludDhBcnJheSwgbmFtZTogc3RyaW5nKSB7XG5cdGNvbnN0IGxlbmd0aCA9IE1hdGgubWF4KGFjdHVhbC5sZW5ndGgsIGV4cGVjdGVkLmxlbmd0aCk7XG5cblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHRcdGlmIChhY3R1YWxbaV0gIT09IGV4cGVjdGVkW2ldKSB7XG5cdFx0XHRmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICcuLicsICdyZXN1bHRzJywgbmFtZSksIEJ1ZmZlci5mcm9tKGFjdHVhbCkpO1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBEaWZmZXJlbnQgYnl0ZSBhdCAweCR7aS50b1N0cmluZygxNil9IGluICgke25hbWV9KWApO1xuXHRcdH1cblx0fVxufVxuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvYnJhbmRvbmxpdS9EZXNrdG9wL3NreWxhYi9hZy1wc2Qvc3JjIn0=
