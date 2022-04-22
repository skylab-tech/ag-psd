"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var chai_1 = require("chai");
var common_1 = require("./common");
var psdWriter_1 = require("../psdWriter");
var psdReader_1 = require("../psdReader");
var index_1 = require("../index");
var layerImagesPath = path.join(__dirname, '..', '..', 'test', 'layer-images');
var writeFilesPath = path.join(__dirname, '..', '..', 'test', 'write');
var resultsFilesPath = path.join(__dirname, '..', '..', 'results');
function writeAndRead(psd, writeOptions, readOptions) {
    if (writeOptions === void 0) { writeOptions = {}; }
    if (readOptions === void 0) { readOptions = {}; }
    var writer = psdWriter_1.createWriter();
    psdWriter_1.writePsd(writer, psd, writeOptions);
    var buffer = psdWriter_1.getWriterBuffer(writer);
    var reader = psdReader_1.createReader(buffer);
    return psdReader_1.readPsd(reader, __assign(__assign({}, readOptions), { throwForMissingFeatures: true, logMissingFeatures: true }));
}
function tryLoadCanvasFromFile(filePath) {
    try {
        return common_1.loadCanvasFromFile(filePath);
    }
    catch (_a) {
        return undefined;
    }
}
function loadPsdFromJSONAndPNGFiles(basePath) {
    var _a;
    var psd = JSON.parse(fs.readFileSync(path.join(basePath, 'data.json'), 'utf8'));
    psd.canvas = common_1.loadCanvasFromFile(path.join(basePath, 'canvas.png'));
    psd.children.forEach(function (l, i) {
        if (!l.children) {
            l.canvas = tryLoadCanvasFromFile(path.join(basePath, "layer-" + i + ".png"));
            if (l.mask) {
                l.mask.canvas = tryLoadCanvasFromFile(path.join(basePath, "layer-" + i + "-mask.png"));
            }
        }
    });
    (_a = psd.linkedFiles) === null || _a === void 0 ? void 0 : _a.forEach(function (f) {
        try {
            f.data = fs.readFileSync(path.join(basePath, f.name));
        }
        catch (e) { }
    });
    return psd;
}
describe('PsdWriter', function () {
    it('does not throw if writing psd with empty canvas', function () {
        var writer = psdWriter_1.createWriter();
        var psd = {
            width: 300,
            height: 200
        };
        psdWriter_1.writePsd(writer, psd);
    });
    it('throws if passed invalid signature', function () {
        var writer = psdWriter_1.createWriter();
        var _loop_1 = function (s) {
            chai_1.expect(function () { return psdWriter_1.writeSignature(writer, s); }, s).throw("Invalid signature: '" + s + "'");
        };
        for (var _i = 0, _a = ['a', 'ab', 'abcde']; _i < _a.length; _i++) {
            var s = _a[_i];
            _loop_1(s);
        }
    });
    it('throws exception if has layer with both children and canvas properties set', function () {
        var writer = psdWriter_1.createWriter();
        var psd = {
            width: 300,
            height: 200,
            children: [{ children: [], canvas: common_1.createCanvas(300, 300) }]
        };
        chai_1.expect(function () { return psdWriter_1.writePsd(writer, psd); }).throw("Invalid layer, cannot have both 'canvas' and 'children' properties");
    });
    it('throws exception if has layer with both children and imageData properties set', function () {
        var writer = psdWriter_1.createWriter();
        var psd = {
            width: 300,
            height: 200,
            children: [{ children: [], imageData: {} }]
        };
        chai_1.expect(function () { return psdWriter_1.writePsd(writer, psd); }).throw("Invalid layer, cannot have both 'imageData' and 'children' properties");
    });
    it('throws if psd has invalid width or height', function () {
        var writer = psdWriter_1.createWriter();
        var psd = {
            width: -5,
            height: 0,
        };
        chai_1.expect(function () { return psdWriter_1.writePsd(writer, psd); }).throw("Invalid document size");
    });
    var fullImage = common_1.loadCanvasFromFile(path.join(layerImagesPath, 'full.png'));
    var transparentImage = common_1.loadCanvasFromFile(path.join(layerImagesPath, 'transparent.png'));
    var trimmedImage = common_1.loadCanvasFromFile(path.join(layerImagesPath, 'trimmed.png'));
    // const croppedImage = loadCanvasFromFile(path.join(layerImagesPath, 'cropped.png'));
    // const paddedImage = loadCanvasFromFile(path.join(layerImagesPath, 'padded.png'));
    describe('layer left, top, right, bottom handling', function () {
        it('handles undefined left, top, right, bottom with layer image the same size as document', function () {
            var psd = {
                width: 300,
                height: 200,
                children: [
                    {
                        name: 'test',
                        canvas: fullImage,
                    },
                ],
            };
            var result = writeAndRead(psd);
            var layer = result.children[0];
            common_1.compareCanvases(fullImage, layer.canvas, 'full-layer-image.png');
            chai_1.expect(layer.left).equal(0);
            chai_1.expect(layer.top).equal(0);
            chai_1.expect(layer.right).equal(300);
            chai_1.expect(layer.bottom).equal(200);
        });
        it('handles layer image larger than document', function () {
            var psd = {
                width: 100,
                height: 50,
                children: [
                    {
                        name: 'test',
                        canvas: fullImage,
                    },
                ],
            };
            var result = writeAndRead(psd);
            var layer = result.children[0];
            common_1.compareCanvases(fullImage, layer.canvas, 'oversized-layer-image.png');
            chai_1.expect(layer.left).equal(0);
            chai_1.expect(layer.top).equal(0);
            chai_1.expect(layer.right).equal(300);
            chai_1.expect(layer.bottom).equal(200);
        });
        it('aligns layer image to top left if layer image is smaller than document', function () {
            var psd = {
                width: 300,
                height: 200,
                children: [
                    {
                        name: 'test',
                        canvas: trimmedImage,
                    },
                ],
            };
            var result = writeAndRead(psd);
            var layer = result.children[0];
            common_1.compareCanvases(trimmedImage, layer.canvas, 'smaller-layer-image.png');
            chai_1.expect(layer.left).equal(0);
            chai_1.expect(layer.top).equal(0);
            chai_1.expect(layer.right).equal(192);
            chai_1.expect(layer.bottom).equal(68);
        });
        it('does not trim transparent layer image if trim option is not passed', function () {
            var psd = {
                width: 300,
                height: 200,
                children: [
                    {
                        name: 'test',
                        canvas: transparentImage,
                    },
                ],
            };
            var result = writeAndRead(psd);
            var layer = result.children[0];
            common_1.compareCanvases(transparentImage, layer.canvas, 'transparent-layer-image.png');
            chai_1.expect(layer.left).equal(0);
            chai_1.expect(layer.top).equal(0);
            chai_1.expect(layer.right).equal(300);
            chai_1.expect(layer.bottom).equal(200);
        });
        it('trims transparent layer image if trim option is set', function () {
            var psd = {
                width: 300,
                height: 200,
                children: [
                    {
                        name: 'test',
                        canvas: transparentImage,
                    },
                ],
            };
            var result = writeAndRead(psd, { trimImageData: true });
            var layer = result.children[0];
            common_1.compareCanvases(trimmedImage, layer.canvas, 'trimmed-layer-image.png');
            chai_1.expect(layer.left).equal(51);
            chai_1.expect(layer.top).equal(65);
            chai_1.expect(layer.right).equal(243);
            chai_1.expect(layer.bottom).equal(133);
        });
        it('positions the layer at given left/top offsets', function () {
            var psd = {
                width: 300,
                height: 200,
                children: [
                    {
                        name: 'test',
                        left: 50,
                        top: 30,
                        canvas: fullImage,
                    },
                ],
            };
            var result = writeAndRead(psd);
            var layer = result.children[0];
            common_1.compareCanvases(fullImage, layer.canvas, 'left-top-layer-image.png');
            chai_1.expect(layer.left).equal(50);
            chai_1.expect(layer.top).equal(30);
            chai_1.expect(layer.right).equal(350);
            chai_1.expect(layer.bottom).equal(230);
        });
        it('ignores right/bottom values', function () {
            var psd = {
                width: 300,
                height: 200,
                children: [
                    {
                        name: 'test',
                        right: 200,
                        bottom: 100,
                        canvas: fullImage,
                    },
                ],
            };
            var result = writeAndRead(psd);
            var layer = result.children[0];
            common_1.compareCanvases(fullImage, layer.canvas, 'cropped-layer-image.png');
            chai_1.expect(layer.left).equal(0);
            chai_1.expect(layer.top).equal(0);
            chai_1.expect(layer.right).equal(300);
            chai_1.expect(layer.bottom).equal(200);
        });
        it('ignores larger right/bottom values', function () {
            var psd = {
                width: 300,
                height: 200,
                children: [
                    {
                        name: 'test',
                        right: 400,
                        bottom: 250,
                        canvas: fullImage,
                    },
                ],
            };
            var result = writeAndRead(psd);
            var layer = result.children[0];
            common_1.compareCanvases(fullImage, layer.canvas, 'padded-layer-image.png');
            chai_1.expect(layer.left).equal(0);
            chai_1.expect(layer.top).equal(0);
            chai_1.expect(layer.right).equal(300);
            chai_1.expect(layer.bottom).equal(200);
        });
        it('ignores right/bottom values if they do not match canvas size', function () {
            var psd = {
                width: 300,
                height: 200,
                children: [
                    {
                        name: 'test',
                        left: 50,
                        top: 50,
                        right: 50,
                        bottom: 50,
                        canvas: fullImage,
                    },
                ],
            };
            var result = writeAndRead(psd);
            var layer = result.children[0];
            common_1.compareCanvases(fullImage, layer.canvas, 'empty-layer-image.png');
            chai_1.expect(layer.left).equal(50);
            chai_1.expect(layer.top).equal(50);
            chai_1.expect(layer.right).equal(350);
            chai_1.expect(layer.bottom).equal(250);
        });
        it('ignores right/bottom values if they amount to negative size', function () {
            var psd = {
                width: 300,
                height: 200,
                children: [
                    {
                        name: 'test',
                        left: 50,
                        top: 50,
                        right: 0,
                        bottom: 0,
                        canvas: fullImage,
                    },
                ],
            };
            var result = writeAndRead(psd);
            var layer = result.children[0];
            common_1.compareCanvases(fullImage, layer.canvas, 'empty-layer-image.png');
            chai_1.expect(layer.left).equal(50);
            chai_1.expect(layer.top).equal(50);
            chai_1.expect(layer.right).equal(350);
            chai_1.expect(layer.bottom).equal(250);
        });
    });
    // fs.readdirSync(writeFilesPath).filter(f => /smart-object/.test(f)).forEach(f => {
    fs.readdirSync(writeFilesPath).filter(function (f) { return !/pattern/.test(f); }).forEach(function (f) {
        it("writes PSD file (" + f + ")", function () {
            var basePath = path.join(writeFilesPath, f);
            var psd = loadPsdFromJSONAndPNGFiles(basePath);
            var before = JSON.stringify(psd, replacer);
            var buffer = index_1.writePsdBuffer(psd, { generateThumbnail: false, trimImageData: true, logMissingFeatures: true });
            var after = JSON.stringify(psd, replacer);
            chai_1.expect(before).equal(after, 'psd object mutated');
            fs.mkdirSync(resultsFilesPath, { recursive: true });
            fs.writeFileSync(path.join(resultsFilesPath, f + ".psd"), buffer);
            // fs.writeFileSync(path.join(resultsFilesPath, `${f}.bin`), buffer); // TEMP
            var reader = psdReader_1.createReader(buffer.buffer);
            var result = psdReader_1.readPsd(reader, { skipLayerImageData: true, logMissingFeatures: true, throwForMissingFeatures: true });
            fs.writeFileSync(path.join(resultsFilesPath, f + "-composite.png"), result.canvas.toBuffer());
            //compareCanvases(psd.canvas, result.canvas, 'composite image');
            var expected = fs.readFileSync(path.join(basePath, 'expected.psd'));
            common_1.compareBuffers(buffer, expected, "ArrayBufferPsdWriter", 0);
        });
    });
});
function replacer(key, value) {
    if (key === 'canvas') {
        return '<canvas>';
    }
    else {
        return value;
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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VSxDQUFDO0tBQ2xCO1NBQU07UUFDTixPQUFPLEtBQUssQ0FBQztLQUNiO0FBQ0YsQ0FBQyIsImZpbGUiOiJ0ZXN0L3BzZFdyaXRlci5zcGVjLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGV4cGVjdCB9IGZyb20gJ2NoYWknO1xuaW1wb3J0IHsgbG9hZENhbnZhc0Zyb21GaWxlLCBjb21wYXJlQnVmZmVycywgY3JlYXRlQ2FudmFzLCBjb21wYXJlQ2FudmFzZXMgfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQgeyBQc2QsIFdyaXRlT3B0aW9ucywgUmVhZE9wdGlvbnMgfSBmcm9tICcuLi9wc2QnO1xuaW1wb3J0IHsgd3JpdGVQc2QsIHdyaXRlU2lnbmF0dXJlLCBnZXRXcml0ZXJCdWZmZXIsIGNyZWF0ZVdyaXRlciB9IGZyb20gJy4uL3BzZFdyaXRlcic7XG5pbXBvcnQgeyByZWFkUHNkLCBjcmVhdGVSZWFkZXIgfSBmcm9tICcuLi9wc2RSZWFkZXInO1xuaW1wb3J0IHsgd3JpdGVQc2RCdWZmZXIgfSBmcm9tICcuLi9pbmRleCc7XG5cbmNvbnN0IGxheWVySW1hZ2VzUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICcuLicsICd0ZXN0JywgJ2xheWVyLWltYWdlcycpO1xuY29uc3Qgd3JpdGVGaWxlc1BhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAndGVzdCcsICd3cml0ZScpO1xuY29uc3QgcmVzdWx0c0ZpbGVzUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICcuLicsICdyZXN1bHRzJyk7XG5cbmZ1bmN0aW9uIHdyaXRlQW5kUmVhZChwc2Q6IFBzZCwgd3JpdGVPcHRpb25zOiBXcml0ZU9wdGlvbnMgPSB7fSwgcmVhZE9wdGlvbnM6IFJlYWRPcHRpb25zID0ge30pIHtcblx0Y29uc3Qgd3JpdGVyID0gY3JlYXRlV3JpdGVyKCk7XG5cdHdyaXRlUHNkKHdyaXRlciwgcHNkLCB3cml0ZU9wdGlvbnMpO1xuXHRjb25zdCBidWZmZXIgPSBnZXRXcml0ZXJCdWZmZXIod3JpdGVyKTtcblx0Y29uc3QgcmVhZGVyID0gY3JlYXRlUmVhZGVyKGJ1ZmZlcik7XG5cdHJldHVybiByZWFkUHNkKHJlYWRlciwgeyAuLi5yZWFkT3B0aW9ucywgdGhyb3dGb3JNaXNzaW5nRmVhdHVyZXM6IHRydWUsIGxvZ01pc3NpbmdGZWF0dXJlczogdHJ1ZSB9KTtcbn1cblxuZnVuY3Rpb24gdHJ5TG9hZENhbnZhc0Zyb21GaWxlKGZpbGVQYXRoOiBzdHJpbmcpIHtcblx0dHJ5IHtcblx0XHRyZXR1cm4gbG9hZENhbnZhc0Zyb21GaWxlKGZpbGVQYXRoKTtcblx0fSBjYXRjaCB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxufVxuXG5mdW5jdGlvbiBsb2FkUHNkRnJvbUpTT05BbmRQTkdGaWxlcyhiYXNlUGF0aDogc3RyaW5nKSB7XG5cdGNvbnN0IHBzZDogUHNkID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKGJhc2VQYXRoLCAnZGF0YS5qc29uJyksICd1dGY4JykpO1xuXHRwc2QuY2FudmFzID0gbG9hZENhbnZhc0Zyb21GaWxlKHBhdGguam9pbihiYXNlUGF0aCwgJ2NhbnZhcy5wbmcnKSk7XG5cdHBzZC5jaGlsZHJlbiEuZm9yRWFjaCgobCwgaSkgPT4ge1xuXHRcdGlmICghbC5jaGlsZHJlbikge1xuXHRcdFx0bC5jYW52YXMgPSB0cnlMb2FkQ2FudmFzRnJvbUZpbGUocGF0aC5qb2luKGJhc2VQYXRoLCBgbGF5ZXItJHtpfS5wbmdgKSk7XG5cblx0XHRcdGlmIChsLm1hc2spIHtcblx0XHRcdFx0bC5tYXNrLmNhbnZhcyA9IHRyeUxvYWRDYW52YXNGcm9tRmlsZShwYXRoLmpvaW4oYmFzZVBhdGgsIGBsYXllci0ke2l9LW1hc2sucG5nYCkpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cdHBzZC5saW5rZWRGaWxlcz8uZm9yRWFjaChmID0+IHtcblx0XHR0cnkge1xuXHRcdFx0Zi5kYXRhID0gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihiYXNlUGF0aCwgZi5uYW1lKSk7XG5cdFx0fSBjYXRjaCAoZSkgeyB9XG5cdH0pO1xuXHRyZXR1cm4gcHNkO1xufVxuXG5kZXNjcmliZSgnUHNkV3JpdGVyJywgKCkgPT4ge1xuXHRpdCgnZG9lcyBub3QgdGhyb3cgaWYgd3JpdGluZyBwc2Qgd2l0aCBlbXB0eSBjYW52YXMnLCAoKSA9PiB7XG5cdFx0Y29uc3Qgd3JpdGVyID0gY3JlYXRlV3JpdGVyKCk7XG5cdFx0Y29uc3QgcHNkOiBQc2QgPSB7XG5cdFx0XHR3aWR0aDogMzAwLFxuXHRcdFx0aGVpZ2h0OiAyMDBcblx0XHR9O1xuXG5cdFx0d3JpdGVQc2Qod3JpdGVyLCBwc2QpO1xuXHR9KTtcblxuXHRpdCgndGhyb3dzIGlmIHBhc3NlZCBpbnZhbGlkIHNpZ25hdHVyZScsICgpID0+IHtcblx0XHRjb25zdCB3cml0ZXIgPSBjcmVhdGVXcml0ZXIoKTtcblxuXHRcdGZvciAoY29uc3QgcyBvZiBbJ2EnLCAnYWInLCAnYWJjZGUnXSkge1xuXHRcdFx0ZXhwZWN0KCgpID0+IHdyaXRlU2lnbmF0dXJlKHdyaXRlciwgcyksIHMpLnRocm93KGBJbnZhbGlkIHNpZ25hdHVyZTogJyR7c30nYCk7XG5cdFx0fVxuXHR9KTtcblxuXHRpdCgndGhyb3dzIGV4Y2VwdGlvbiBpZiBoYXMgbGF5ZXIgd2l0aCBib3RoIGNoaWxkcmVuIGFuZCBjYW52YXMgcHJvcGVydGllcyBzZXQnLCAoKSA9PiB7XG5cdFx0Y29uc3Qgd3JpdGVyID0gY3JlYXRlV3JpdGVyKCk7XG5cdFx0Y29uc3QgcHNkOiBQc2QgPSB7XG5cdFx0XHR3aWR0aDogMzAwLFxuXHRcdFx0aGVpZ2h0OiAyMDAsXG5cdFx0XHRjaGlsZHJlbjogW3sgY2hpbGRyZW46IFtdLCBjYW52YXM6IGNyZWF0ZUNhbnZhcygzMDAsIDMwMCkgfV1cblx0XHR9O1xuXG5cdFx0ZXhwZWN0KCgpID0+IHdyaXRlUHNkKHdyaXRlciwgcHNkKSkudGhyb3coYEludmFsaWQgbGF5ZXIsIGNhbm5vdCBoYXZlIGJvdGggJ2NhbnZhcycgYW5kICdjaGlsZHJlbicgcHJvcGVydGllc2ApO1xuXHR9KTtcblxuXHRpdCgndGhyb3dzIGV4Y2VwdGlvbiBpZiBoYXMgbGF5ZXIgd2l0aCBib3RoIGNoaWxkcmVuIGFuZCBpbWFnZURhdGEgcHJvcGVydGllcyBzZXQnLCAoKSA9PiB7XG5cdFx0Y29uc3Qgd3JpdGVyID0gY3JlYXRlV3JpdGVyKCk7XG5cdFx0Y29uc3QgcHNkOiBQc2QgPSB7XG5cdFx0XHR3aWR0aDogMzAwLFxuXHRcdFx0aGVpZ2h0OiAyMDAsXG5cdFx0XHRjaGlsZHJlbjogW3sgY2hpbGRyZW46IFtdLCBpbWFnZURhdGE6IHt9IGFzIGFueSB9XVxuXHRcdH07XG5cblx0XHRleHBlY3QoKCkgPT4gd3JpdGVQc2Qod3JpdGVyLCBwc2QpKS50aHJvdyhgSW52YWxpZCBsYXllciwgY2Fubm90IGhhdmUgYm90aCAnaW1hZ2VEYXRhJyBhbmQgJ2NoaWxkcmVuJyBwcm9wZXJ0aWVzYCk7XG5cdH0pO1xuXG5cdGl0KCd0aHJvd3MgaWYgcHNkIGhhcyBpbnZhbGlkIHdpZHRoIG9yIGhlaWdodCcsICgpID0+IHtcblx0XHRjb25zdCB3cml0ZXIgPSBjcmVhdGVXcml0ZXIoKTtcblx0XHRjb25zdCBwc2Q6IFBzZCA9IHtcblx0XHRcdHdpZHRoOiAtNSxcblx0XHRcdGhlaWdodDogMCxcblx0XHR9O1xuXG5cdFx0ZXhwZWN0KCgpID0+IHdyaXRlUHNkKHdyaXRlciwgcHNkKSkudGhyb3coYEludmFsaWQgZG9jdW1lbnQgc2l6ZWApO1xuXHR9KTtcblxuXHRjb25zdCBmdWxsSW1hZ2UgPSBsb2FkQ2FudmFzRnJvbUZpbGUocGF0aC5qb2luKGxheWVySW1hZ2VzUGF0aCwgJ2Z1bGwucG5nJykpO1xuXHRjb25zdCB0cmFuc3BhcmVudEltYWdlID0gbG9hZENhbnZhc0Zyb21GaWxlKHBhdGguam9pbihsYXllckltYWdlc1BhdGgsICd0cmFuc3BhcmVudC5wbmcnKSk7XG5cdGNvbnN0IHRyaW1tZWRJbWFnZSA9IGxvYWRDYW52YXNGcm9tRmlsZShwYXRoLmpvaW4obGF5ZXJJbWFnZXNQYXRoLCAndHJpbW1lZC5wbmcnKSk7XG5cdC8vIGNvbnN0IGNyb3BwZWRJbWFnZSA9IGxvYWRDYW52YXNGcm9tRmlsZShwYXRoLmpvaW4obGF5ZXJJbWFnZXNQYXRoLCAnY3JvcHBlZC5wbmcnKSk7XG5cdC8vIGNvbnN0IHBhZGRlZEltYWdlID0gbG9hZENhbnZhc0Zyb21GaWxlKHBhdGguam9pbihsYXllckltYWdlc1BhdGgsICdwYWRkZWQucG5nJykpO1xuXG5cdGRlc2NyaWJlKCdsYXllciBsZWZ0LCB0b3AsIHJpZ2h0LCBib3R0b20gaGFuZGxpbmcnLCAoKSA9PiB7XG5cdFx0aXQoJ2hhbmRsZXMgdW5kZWZpbmVkIGxlZnQsIHRvcCwgcmlnaHQsIGJvdHRvbSB3aXRoIGxheWVyIGltYWdlIHRoZSBzYW1lIHNpemUgYXMgZG9jdW1lbnQnLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBwc2Q6IFBzZCA9IHtcblx0XHRcdFx0d2lkdGg6IDMwMCxcblx0XHRcdFx0aGVpZ2h0OiAyMDAsXG5cdFx0XHRcdGNoaWxkcmVuOiBbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3Rlc3QnLFxuXHRcdFx0XHRcdFx0Y2FudmFzOiBmdWxsSW1hZ2UsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XSxcblx0XHRcdH07XG5cblx0XHRcdGNvbnN0IHJlc3VsdCA9IHdyaXRlQW5kUmVhZChwc2QpO1xuXG5cdFx0XHRjb25zdCBsYXllciA9IHJlc3VsdC5jaGlsZHJlbiFbMF07XG5cdFx0XHRjb21wYXJlQ2FudmFzZXMoZnVsbEltYWdlLCBsYXllci5jYW52YXMsICdmdWxsLWxheWVyLWltYWdlLnBuZycpO1xuXHRcdFx0ZXhwZWN0KGxheWVyLmxlZnQpLmVxdWFsKDApO1xuXHRcdFx0ZXhwZWN0KGxheWVyLnRvcCkuZXF1YWwoMCk7XG5cdFx0XHRleHBlY3QobGF5ZXIucmlnaHQpLmVxdWFsKDMwMCk7XG5cdFx0XHRleHBlY3QobGF5ZXIuYm90dG9tKS5lcXVhbCgyMDApO1xuXHRcdH0pO1xuXG5cdFx0aXQoJ2hhbmRsZXMgbGF5ZXIgaW1hZ2UgbGFyZ2VyIHRoYW4gZG9jdW1lbnQnLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBwc2Q6IFBzZCA9IHtcblx0XHRcdFx0d2lkdGg6IDEwMCxcblx0XHRcdFx0aGVpZ2h0OiA1MCxcblx0XHRcdFx0Y2hpbGRyZW46IFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAndGVzdCcsXG5cdFx0XHRcdFx0XHRjYW52YXM6IGZ1bGxJbWFnZSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRdLFxuXHRcdFx0fTtcblxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gd3JpdGVBbmRSZWFkKHBzZCk7XG5cblx0XHRcdGNvbnN0IGxheWVyID0gcmVzdWx0LmNoaWxkcmVuIVswXTtcblx0XHRcdGNvbXBhcmVDYW52YXNlcyhmdWxsSW1hZ2UsIGxheWVyLmNhbnZhcywgJ292ZXJzaXplZC1sYXllci1pbWFnZS5wbmcnKTtcblx0XHRcdGV4cGVjdChsYXllci5sZWZ0KS5lcXVhbCgwKTtcblx0XHRcdGV4cGVjdChsYXllci50b3ApLmVxdWFsKDApO1xuXHRcdFx0ZXhwZWN0KGxheWVyLnJpZ2h0KS5lcXVhbCgzMDApO1xuXHRcdFx0ZXhwZWN0KGxheWVyLmJvdHRvbSkuZXF1YWwoMjAwKTtcblx0XHR9KTtcblxuXHRcdGl0KCdhbGlnbnMgbGF5ZXIgaW1hZ2UgdG8gdG9wIGxlZnQgaWYgbGF5ZXIgaW1hZ2UgaXMgc21hbGxlciB0aGFuIGRvY3VtZW50JywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgcHNkOiBQc2QgPSB7XG5cdFx0XHRcdHdpZHRoOiAzMDAsXG5cdFx0XHRcdGhlaWdodDogMjAwLFxuXHRcdFx0XHRjaGlsZHJlbjogW1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICd0ZXN0Jyxcblx0XHRcdFx0XHRcdGNhbnZhczogdHJpbW1lZEltYWdlLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdF0sXG5cdFx0XHR9O1xuXG5cdFx0XHRjb25zdCByZXN1bHQgPSB3cml0ZUFuZFJlYWQocHNkKTtcblxuXHRcdFx0Y29uc3QgbGF5ZXIgPSByZXN1bHQuY2hpbGRyZW4hWzBdO1xuXHRcdFx0Y29tcGFyZUNhbnZhc2VzKHRyaW1tZWRJbWFnZSwgbGF5ZXIuY2FudmFzLCAnc21hbGxlci1sYXllci1pbWFnZS5wbmcnKTtcblx0XHRcdGV4cGVjdChsYXllci5sZWZ0KS5lcXVhbCgwKTtcblx0XHRcdGV4cGVjdChsYXllci50b3ApLmVxdWFsKDApO1xuXHRcdFx0ZXhwZWN0KGxheWVyLnJpZ2h0KS5lcXVhbCgxOTIpO1xuXHRcdFx0ZXhwZWN0KGxheWVyLmJvdHRvbSkuZXF1YWwoNjgpO1xuXHRcdH0pO1xuXG5cdFx0aXQoJ2RvZXMgbm90IHRyaW0gdHJhbnNwYXJlbnQgbGF5ZXIgaW1hZ2UgaWYgdHJpbSBvcHRpb24gaXMgbm90IHBhc3NlZCcsICgpID0+IHtcblx0XHRcdGNvbnN0IHBzZDogUHNkID0ge1xuXHRcdFx0XHR3aWR0aDogMzAwLFxuXHRcdFx0XHRoZWlnaHQ6IDIwMCxcblx0XHRcdFx0Y2hpbGRyZW46IFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAndGVzdCcsXG5cdFx0XHRcdFx0XHRjYW52YXM6IHRyYW5zcGFyZW50SW1hZ2UsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XSxcblx0XHRcdH07XG5cblx0XHRcdGNvbnN0IHJlc3VsdCA9IHdyaXRlQW5kUmVhZChwc2QpO1xuXG5cdFx0XHRjb25zdCBsYXllciA9IHJlc3VsdC5jaGlsZHJlbiFbMF07XG5cdFx0XHRjb21wYXJlQ2FudmFzZXModHJhbnNwYXJlbnRJbWFnZSwgbGF5ZXIuY2FudmFzLCAndHJhbnNwYXJlbnQtbGF5ZXItaW1hZ2UucG5nJyk7XG5cdFx0XHRleHBlY3QobGF5ZXIubGVmdCkuZXF1YWwoMCk7XG5cdFx0XHRleHBlY3QobGF5ZXIudG9wKS5lcXVhbCgwKTtcblx0XHRcdGV4cGVjdChsYXllci5yaWdodCkuZXF1YWwoMzAwKTtcblx0XHRcdGV4cGVjdChsYXllci5ib3R0b20pLmVxdWFsKDIwMCk7XG5cdFx0fSk7XG5cblx0XHRpdCgndHJpbXMgdHJhbnNwYXJlbnQgbGF5ZXIgaW1hZ2UgaWYgdHJpbSBvcHRpb24gaXMgc2V0JywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgcHNkOiBQc2QgPSB7XG5cdFx0XHRcdHdpZHRoOiAzMDAsXG5cdFx0XHRcdGhlaWdodDogMjAwLFxuXHRcdFx0XHRjaGlsZHJlbjogW1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICd0ZXN0Jyxcblx0XHRcdFx0XHRcdGNhbnZhczogdHJhbnNwYXJlbnRJbWFnZSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRdLFxuXHRcdFx0fTtcblxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gd3JpdGVBbmRSZWFkKHBzZCwgeyB0cmltSW1hZ2VEYXRhOiB0cnVlIH0pO1xuXG5cdFx0XHRjb25zdCBsYXllciA9IHJlc3VsdC5jaGlsZHJlbiFbMF07XG5cdFx0XHRjb21wYXJlQ2FudmFzZXModHJpbW1lZEltYWdlLCBsYXllci5jYW52YXMsICd0cmltbWVkLWxheWVyLWltYWdlLnBuZycpO1xuXHRcdFx0ZXhwZWN0KGxheWVyLmxlZnQpLmVxdWFsKDUxKTtcblx0XHRcdGV4cGVjdChsYXllci50b3ApLmVxdWFsKDY1KTtcblx0XHRcdGV4cGVjdChsYXllci5yaWdodCkuZXF1YWwoMjQzKTtcblx0XHRcdGV4cGVjdChsYXllci5ib3R0b20pLmVxdWFsKDEzMyk7XG5cdFx0fSk7XG5cblx0XHRpdCgncG9zaXRpb25zIHRoZSBsYXllciBhdCBnaXZlbiBsZWZ0L3RvcCBvZmZzZXRzJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgcHNkOiBQc2QgPSB7XG5cdFx0XHRcdHdpZHRoOiAzMDAsXG5cdFx0XHRcdGhlaWdodDogMjAwLFxuXHRcdFx0XHRjaGlsZHJlbjogW1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICd0ZXN0Jyxcblx0XHRcdFx0XHRcdGxlZnQ6IDUwLFxuXHRcdFx0XHRcdFx0dG9wOiAzMCxcblx0XHRcdFx0XHRcdGNhbnZhczogZnVsbEltYWdlLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdF0sXG5cdFx0XHR9O1xuXG5cdFx0XHRjb25zdCByZXN1bHQgPSB3cml0ZUFuZFJlYWQocHNkKTtcblxuXHRcdFx0Y29uc3QgbGF5ZXIgPSByZXN1bHQuY2hpbGRyZW4hWzBdO1xuXHRcdFx0Y29tcGFyZUNhbnZhc2VzKGZ1bGxJbWFnZSwgbGF5ZXIuY2FudmFzLCAnbGVmdC10b3AtbGF5ZXItaW1hZ2UucG5nJyk7XG5cdFx0XHRleHBlY3QobGF5ZXIubGVmdCkuZXF1YWwoNTApO1xuXHRcdFx0ZXhwZWN0KGxheWVyLnRvcCkuZXF1YWwoMzApO1xuXHRcdFx0ZXhwZWN0KGxheWVyLnJpZ2h0KS5lcXVhbCgzNTApO1xuXHRcdFx0ZXhwZWN0KGxheWVyLmJvdHRvbSkuZXF1YWwoMjMwKTtcblx0XHR9KTtcblxuXHRcdGl0KCdpZ25vcmVzIHJpZ2h0L2JvdHRvbSB2YWx1ZXMnLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBwc2Q6IFBzZCA9IHtcblx0XHRcdFx0d2lkdGg6IDMwMCxcblx0XHRcdFx0aGVpZ2h0OiAyMDAsXG5cdFx0XHRcdGNoaWxkcmVuOiBbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3Rlc3QnLFxuXHRcdFx0XHRcdFx0cmlnaHQ6IDIwMCxcblx0XHRcdFx0XHRcdGJvdHRvbTogMTAwLFxuXHRcdFx0XHRcdFx0Y2FudmFzOiBmdWxsSW1hZ2UsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XSxcblx0XHRcdH07XG5cblx0XHRcdGNvbnN0IHJlc3VsdCA9IHdyaXRlQW5kUmVhZChwc2QpO1xuXG5cdFx0XHRjb25zdCBsYXllciA9IHJlc3VsdC5jaGlsZHJlbiFbMF07XG5cdFx0XHRjb21wYXJlQ2FudmFzZXMoZnVsbEltYWdlLCBsYXllci5jYW52YXMsICdjcm9wcGVkLWxheWVyLWltYWdlLnBuZycpO1xuXHRcdFx0ZXhwZWN0KGxheWVyLmxlZnQpLmVxdWFsKDApO1xuXHRcdFx0ZXhwZWN0KGxheWVyLnRvcCkuZXF1YWwoMCk7XG5cdFx0XHRleHBlY3QobGF5ZXIucmlnaHQpLmVxdWFsKDMwMCk7XG5cdFx0XHRleHBlY3QobGF5ZXIuYm90dG9tKS5lcXVhbCgyMDApO1xuXHRcdH0pO1xuXG5cdFx0aXQoJ2lnbm9yZXMgbGFyZ2VyIHJpZ2h0L2JvdHRvbSB2YWx1ZXMnLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBwc2Q6IFBzZCA9IHtcblx0XHRcdFx0d2lkdGg6IDMwMCxcblx0XHRcdFx0aGVpZ2h0OiAyMDAsXG5cdFx0XHRcdGNoaWxkcmVuOiBbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3Rlc3QnLFxuXHRcdFx0XHRcdFx0cmlnaHQ6IDQwMCxcblx0XHRcdFx0XHRcdGJvdHRvbTogMjUwLFxuXHRcdFx0XHRcdFx0Y2FudmFzOiBmdWxsSW1hZ2UsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XSxcblx0XHRcdH07XG5cblx0XHRcdGNvbnN0IHJlc3VsdCA9IHdyaXRlQW5kUmVhZChwc2QpO1xuXG5cdFx0XHRjb25zdCBsYXllciA9IHJlc3VsdC5jaGlsZHJlbiFbMF07XG5cdFx0XHRjb21wYXJlQ2FudmFzZXMoZnVsbEltYWdlLCBsYXllci5jYW52YXMsICdwYWRkZWQtbGF5ZXItaW1hZ2UucG5nJyk7XG5cdFx0XHRleHBlY3QobGF5ZXIubGVmdCkuZXF1YWwoMCk7XG5cdFx0XHRleHBlY3QobGF5ZXIudG9wKS5lcXVhbCgwKTtcblx0XHRcdGV4cGVjdChsYXllci5yaWdodCkuZXF1YWwoMzAwKTtcblx0XHRcdGV4cGVjdChsYXllci5ib3R0b20pLmVxdWFsKDIwMCk7XG5cdFx0fSk7XG5cblx0XHRpdCgnaWdub3JlcyByaWdodC9ib3R0b20gdmFsdWVzIGlmIHRoZXkgZG8gbm90IG1hdGNoIGNhbnZhcyBzaXplJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgcHNkOiBQc2QgPSB7XG5cdFx0XHRcdHdpZHRoOiAzMDAsXG5cdFx0XHRcdGhlaWdodDogMjAwLFxuXHRcdFx0XHRjaGlsZHJlbjogW1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICd0ZXN0Jyxcblx0XHRcdFx0XHRcdGxlZnQ6IDUwLFxuXHRcdFx0XHRcdFx0dG9wOiA1MCxcblx0XHRcdFx0XHRcdHJpZ2h0OiA1MCxcblx0XHRcdFx0XHRcdGJvdHRvbTogNTAsXG5cdFx0XHRcdFx0XHRjYW52YXM6IGZ1bGxJbWFnZSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRdLFxuXHRcdFx0fTtcblxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gd3JpdGVBbmRSZWFkKHBzZCk7XG5cblx0XHRcdGNvbnN0IGxheWVyID0gcmVzdWx0LmNoaWxkcmVuIVswXTtcblx0XHRcdGNvbXBhcmVDYW52YXNlcyhmdWxsSW1hZ2UsIGxheWVyLmNhbnZhcywgJ2VtcHR5LWxheWVyLWltYWdlLnBuZycpO1xuXHRcdFx0ZXhwZWN0KGxheWVyLmxlZnQpLmVxdWFsKDUwKTtcblx0XHRcdGV4cGVjdChsYXllci50b3ApLmVxdWFsKDUwKTtcblx0XHRcdGV4cGVjdChsYXllci5yaWdodCkuZXF1YWwoMzUwKTtcblx0XHRcdGV4cGVjdChsYXllci5ib3R0b20pLmVxdWFsKDI1MCk7XG5cdFx0fSk7XG5cblx0XHRpdCgnaWdub3JlcyByaWdodC9ib3R0b20gdmFsdWVzIGlmIHRoZXkgYW1vdW50IHRvIG5lZ2F0aXZlIHNpemUnLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBwc2Q6IFBzZCA9IHtcblx0XHRcdFx0d2lkdGg6IDMwMCxcblx0XHRcdFx0aGVpZ2h0OiAyMDAsXG5cdFx0XHRcdGNoaWxkcmVuOiBbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3Rlc3QnLFxuXHRcdFx0XHRcdFx0bGVmdDogNTAsXG5cdFx0XHRcdFx0XHR0b3A6IDUwLFxuXHRcdFx0XHRcdFx0cmlnaHQ6IDAsXG5cdFx0XHRcdFx0XHRib3R0b206IDAsXG5cdFx0XHRcdFx0XHRjYW52YXM6IGZ1bGxJbWFnZSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRdLFxuXHRcdFx0fTtcblxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gd3JpdGVBbmRSZWFkKHBzZCk7XG5cblx0XHRcdGNvbnN0IGxheWVyID0gcmVzdWx0LmNoaWxkcmVuIVswXTtcblx0XHRcdGNvbXBhcmVDYW52YXNlcyhmdWxsSW1hZ2UsIGxheWVyLmNhbnZhcywgJ2VtcHR5LWxheWVyLWltYWdlLnBuZycpO1xuXHRcdFx0ZXhwZWN0KGxheWVyLmxlZnQpLmVxdWFsKDUwKTtcblx0XHRcdGV4cGVjdChsYXllci50b3ApLmVxdWFsKDUwKTtcblx0XHRcdGV4cGVjdChsYXllci5yaWdodCkuZXF1YWwoMzUwKTtcblx0XHRcdGV4cGVjdChsYXllci5ib3R0b20pLmVxdWFsKDI1MCk7XG5cdFx0fSk7XG5cdH0pO1xuXG5cdC8vIGZzLnJlYWRkaXJTeW5jKHdyaXRlRmlsZXNQYXRoKS5maWx0ZXIoZiA9PiAvc21hcnQtb2JqZWN0Ly50ZXN0KGYpKS5mb3JFYWNoKGYgPT4ge1xuXHRmcy5yZWFkZGlyU3luYyh3cml0ZUZpbGVzUGF0aCkuZmlsdGVyKGYgPT4gIS9wYXR0ZXJuLy50ZXN0KGYpKS5mb3JFYWNoKGYgPT4ge1xuXHRcdGl0KGB3cml0ZXMgUFNEIGZpbGUgKCR7Zn0pYCwgKCkgPT4ge1xuXHRcdFx0Y29uc3QgYmFzZVBhdGggPSBwYXRoLmpvaW4od3JpdGVGaWxlc1BhdGgsIGYpO1xuXHRcdFx0Y29uc3QgcHNkID0gbG9hZFBzZEZyb21KU09OQW5kUE5HRmlsZXMoYmFzZVBhdGgpO1xuXG5cdFx0XHRjb25zdCBiZWZvcmUgPSBKU09OLnN0cmluZ2lmeShwc2QsIHJlcGxhY2VyKTtcblx0XHRcdGNvbnN0IGJ1ZmZlciA9IHdyaXRlUHNkQnVmZmVyKHBzZCwgeyBnZW5lcmF0ZVRodW1ibmFpbDogZmFsc2UsIHRyaW1JbWFnZURhdGE6IHRydWUsIGxvZ01pc3NpbmdGZWF0dXJlczogdHJ1ZSB9KTtcblx0XHRcdGNvbnN0IGFmdGVyID0gSlNPTi5zdHJpbmdpZnkocHNkLCByZXBsYWNlcik7XG5cblx0XHRcdGV4cGVjdChiZWZvcmUpLmVxdWFsKGFmdGVyLCAncHNkIG9iamVjdCBtdXRhdGVkJyk7XG5cblx0XHRcdGZzLm1rZGlyU3luYyhyZXN1bHRzRmlsZXNQYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblx0XHRcdGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKHJlc3VsdHNGaWxlc1BhdGgsIGAke2Z9LnBzZGApLCBidWZmZXIpO1xuXHRcdFx0Ly8gZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ocmVzdWx0c0ZpbGVzUGF0aCwgYCR7Zn0uYmluYCksIGJ1ZmZlcik7IC8vIFRFTVBcblxuXHRcdFx0Y29uc3QgcmVhZGVyID0gY3JlYXRlUmVhZGVyKGJ1ZmZlci5idWZmZXIpO1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gcmVhZFBzZChyZWFkZXIsIHsgc2tpcExheWVySW1hZ2VEYXRhOiB0cnVlLCBsb2dNaXNzaW5nRmVhdHVyZXM6IHRydWUsIHRocm93Rm9yTWlzc2luZ0ZlYXR1cmVzOiB0cnVlIH0pO1xuXHRcdFx0ZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ocmVzdWx0c0ZpbGVzUGF0aCwgYCR7Zn0tY29tcG9zaXRlLnBuZ2ApLCByZXN1bHQuY2FudmFzIS50b0J1ZmZlcigpKTtcblx0XHRcdC8vY29tcGFyZUNhbnZhc2VzKHBzZC5jYW52YXMsIHJlc3VsdC5jYW52YXMsICdjb21wb3NpdGUgaW1hZ2UnKTtcblxuXHRcdFx0Y29uc3QgZXhwZWN0ZWQgPSBmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKGJhc2VQYXRoLCAnZXhwZWN0ZWQucHNkJykpO1xuXHRcdFx0Y29tcGFyZUJ1ZmZlcnMoYnVmZmVyLCBleHBlY3RlZCwgYEFycmF5QnVmZmVyUHNkV3JpdGVyYCwgMCk7XG5cdFx0fSk7XG5cdH0pO1xufSk7XG5cbmZ1bmN0aW9uIHJlcGxhY2VyKGtleTogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG5cdGlmIChrZXkgPT09ICdjYW52YXMnKSB7XG5cdFx0cmV0dXJuICc8Y2FudmFzPic7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIHZhbHVlO1xuXHR9XG59XG4iXSwic291cmNlUm9vdCI6Ii9Vc2Vycy9icmFuZG9ubGl1L0Rlc2t0b3Avc2t5bGFiL2FnLXBzZC9zcmMifQ==
