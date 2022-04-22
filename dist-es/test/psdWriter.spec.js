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
import * as fs from 'fs';
import * as path from 'path';
import { expect } from 'chai';
import { loadCanvasFromFile, compareBuffers, createCanvas, compareCanvases } from './common';
import { writePsd, writeSignature, getWriterBuffer, createWriter } from '../psdWriter';
import { readPsd, createReader } from '../psdReader';
import { writePsdBuffer } from '../index';
var layerImagesPath = path.join(__dirname, '..', '..', 'test', 'layer-images');
var writeFilesPath = path.join(__dirname, '..', '..', 'test', 'write');
var resultsFilesPath = path.join(__dirname, '..', '..', 'results');
function writeAndRead(psd, writeOptions, readOptions) {
    if (writeOptions === void 0) { writeOptions = {}; }
    if (readOptions === void 0) { readOptions = {}; }
    var writer = createWriter();
    writePsd(writer, psd, writeOptions);
    var buffer = getWriterBuffer(writer);
    var reader = createReader(buffer);
    return readPsd(reader, __assign(__assign({}, readOptions), { throwForMissingFeatures: true, logMissingFeatures: true }));
}
function tryLoadCanvasFromFile(filePath) {
    try {
        return loadCanvasFromFile(filePath);
    }
    catch (_a) {
        return undefined;
    }
}
function loadPsdFromJSONAndPNGFiles(basePath) {
    var _a;
    var psd = JSON.parse(fs.readFileSync(path.join(basePath, 'data.json'), 'utf8'));
    psd.canvas = loadCanvasFromFile(path.join(basePath, 'canvas.png'));
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
        var writer = createWriter();
        var psd = {
            width: 300,
            height: 200
        };
        writePsd(writer, psd);
    });
    it('throws if passed invalid signature', function () {
        var writer = createWriter();
        var _loop_1 = function (s) {
            expect(function () { return writeSignature(writer, s); }, s).throw("Invalid signature: '" + s + "'");
        };
        for (var _i = 0, _a = ['a', 'ab', 'abcde']; _i < _a.length; _i++) {
            var s = _a[_i];
            _loop_1(s);
        }
    });
    it('throws exception if has layer with both children and canvas properties set', function () {
        var writer = createWriter();
        var psd = {
            width: 300,
            height: 200,
            children: [{ children: [], canvas: createCanvas(300, 300) }]
        };
        expect(function () { return writePsd(writer, psd); }).throw("Invalid layer, cannot have both 'canvas' and 'children' properties");
    });
    it('throws exception if has layer with both children and imageData properties set', function () {
        var writer = createWriter();
        var psd = {
            width: 300,
            height: 200,
            children: [{ children: [], imageData: {} }]
        };
        expect(function () { return writePsd(writer, psd); }).throw("Invalid layer, cannot have both 'imageData' and 'children' properties");
    });
    it('throws if psd has invalid width or height', function () {
        var writer = createWriter();
        var psd = {
            width: -5,
            height: 0,
        };
        expect(function () { return writePsd(writer, psd); }).throw("Invalid document size");
    });
    var fullImage = loadCanvasFromFile(path.join(layerImagesPath, 'full.png'));
    var transparentImage = loadCanvasFromFile(path.join(layerImagesPath, 'transparent.png'));
    var trimmedImage = loadCanvasFromFile(path.join(layerImagesPath, 'trimmed.png'));
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
            compareCanvases(fullImage, layer.canvas, 'full-layer-image.png');
            expect(layer.left).equal(0);
            expect(layer.top).equal(0);
            expect(layer.right).equal(300);
            expect(layer.bottom).equal(200);
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
            compareCanvases(fullImage, layer.canvas, 'oversized-layer-image.png');
            expect(layer.left).equal(0);
            expect(layer.top).equal(0);
            expect(layer.right).equal(300);
            expect(layer.bottom).equal(200);
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
            compareCanvases(trimmedImage, layer.canvas, 'smaller-layer-image.png');
            expect(layer.left).equal(0);
            expect(layer.top).equal(0);
            expect(layer.right).equal(192);
            expect(layer.bottom).equal(68);
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
            compareCanvases(transparentImage, layer.canvas, 'transparent-layer-image.png');
            expect(layer.left).equal(0);
            expect(layer.top).equal(0);
            expect(layer.right).equal(300);
            expect(layer.bottom).equal(200);
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
            compareCanvases(trimmedImage, layer.canvas, 'trimmed-layer-image.png');
            expect(layer.left).equal(51);
            expect(layer.top).equal(65);
            expect(layer.right).equal(243);
            expect(layer.bottom).equal(133);
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
            compareCanvases(fullImage, layer.canvas, 'left-top-layer-image.png');
            expect(layer.left).equal(50);
            expect(layer.top).equal(30);
            expect(layer.right).equal(350);
            expect(layer.bottom).equal(230);
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
            compareCanvases(fullImage, layer.canvas, 'cropped-layer-image.png');
            expect(layer.left).equal(0);
            expect(layer.top).equal(0);
            expect(layer.right).equal(300);
            expect(layer.bottom).equal(200);
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
            compareCanvases(fullImage, layer.canvas, 'padded-layer-image.png');
            expect(layer.left).equal(0);
            expect(layer.top).equal(0);
            expect(layer.right).equal(300);
            expect(layer.bottom).equal(200);
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
            compareCanvases(fullImage, layer.canvas, 'empty-layer-image.png');
            expect(layer.left).equal(50);
            expect(layer.top).equal(50);
            expect(layer.right).equal(350);
            expect(layer.bottom).equal(250);
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
            compareCanvases(fullImage, layer.canvas, 'empty-layer-image.png');
            expect(layer.left).equal(50);
            expect(layer.top).equal(50);
            expect(layer.right).equal(350);
            expect(layer.bottom).equal(250);
        });
    });
    // fs.readdirSync(writeFilesPath).filter(f => /smart-object/.test(f)).forEach(f => {
    fs.readdirSync(writeFilesPath).filter(function (f) { return !/pattern/.test(f); }).forEach(function (f) {
        it("writes PSD file (" + f + ")", function () {
            var basePath = path.join(writeFilesPath, f);
            var psd = loadPsdFromJSONAndPNGFiles(basePath);
            var before = JSON.stringify(psd, replacer);
            var buffer = writePsdBuffer(psd, { generateThumbnail: false, trimImageData: true, logMissingFeatures: true });
            var after = JSON.stringify(psd, replacer);
            expect(before).equal(after, 'psd object mutated');
            fs.mkdirSync(resultsFilesPath, { recursive: true });
            fs.writeFileSync(path.join(resultsFilesPath, f + ".psd"), buffer);
            // fs.writeFileSync(path.join(resultsFilesPath, `${f}.bin`), buffer); // TEMP
            var reader = createReader(buffer.buffer);
            var result = readPsd(reader, { skipLayerImageData: true, logMissingFeatures: true, throwForMissingFeatures: true });
            fs.writeFileSync(path.join(resultsFilesPath, f + "-composite.png"), result.canvas.toBuffer());
            //compareCanvases(psd.canvas, result.canvas, 'composite image');
            var expected = fs.readFileSync(path.join(basePath, 'expected.psd'));
            compareBuffers(buffer, expected, "ArrayBufferPsdWriter", 0);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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RSxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQ3RFLGNBQWMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLHNCQUFzQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILFNBQVMsUUFBUSxDQUFDLEdBQVcsRUFBRSxLQUFVO0lBQ3hDLElBQUksR0FBRyxLQUFLLFFBQVEsRUFBRTtRQUNyQixPQUFPLFVBQVUsQ0FBQztLQUNsQjtTQUFNO1FBQ04sT0FBTyxLQUFLLENBQUM7S0FDYjtBQUNGLENBQUMiLCJmaWxlIjoidGVzdC9wc2RXcml0ZXIuc3BlYy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBleHBlY3QgfSBmcm9tICdjaGFpJztcbmltcG9ydCB7IGxvYWRDYW52YXNGcm9tRmlsZSwgY29tcGFyZUJ1ZmZlcnMsIGNyZWF0ZUNhbnZhcywgY29tcGFyZUNhbnZhc2VzIH0gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IHsgUHNkLCBXcml0ZU9wdGlvbnMsIFJlYWRPcHRpb25zIH0gZnJvbSAnLi4vcHNkJztcbmltcG9ydCB7IHdyaXRlUHNkLCB3cml0ZVNpZ25hdHVyZSwgZ2V0V3JpdGVyQnVmZmVyLCBjcmVhdGVXcml0ZXIgfSBmcm9tICcuLi9wc2RXcml0ZXInO1xuaW1wb3J0IHsgcmVhZFBzZCwgY3JlYXRlUmVhZGVyIH0gZnJvbSAnLi4vcHNkUmVhZGVyJztcbmltcG9ydCB7IHdyaXRlUHNkQnVmZmVyIH0gZnJvbSAnLi4vaW5kZXgnO1xuXG5jb25zdCBsYXllckltYWdlc1BhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAndGVzdCcsICdsYXllci1pbWFnZXMnKTtcbmNvbnN0IHdyaXRlRmlsZXNQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ3Rlc3QnLCAnd3JpdGUnKTtcbmNvbnN0IHJlc3VsdHNGaWxlc1BhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAncmVzdWx0cycpO1xuXG5mdW5jdGlvbiB3cml0ZUFuZFJlYWQocHNkOiBQc2QsIHdyaXRlT3B0aW9uczogV3JpdGVPcHRpb25zID0ge30sIHJlYWRPcHRpb25zOiBSZWFkT3B0aW9ucyA9IHt9KSB7XG5cdGNvbnN0IHdyaXRlciA9IGNyZWF0ZVdyaXRlcigpO1xuXHR3cml0ZVBzZCh3cml0ZXIsIHBzZCwgd3JpdGVPcHRpb25zKTtcblx0Y29uc3QgYnVmZmVyID0gZ2V0V3JpdGVyQnVmZmVyKHdyaXRlcik7XG5cdGNvbnN0IHJlYWRlciA9IGNyZWF0ZVJlYWRlcihidWZmZXIpO1xuXHRyZXR1cm4gcmVhZFBzZChyZWFkZXIsIHsgLi4ucmVhZE9wdGlvbnMsIHRocm93Rm9yTWlzc2luZ0ZlYXR1cmVzOiB0cnVlLCBsb2dNaXNzaW5nRmVhdHVyZXM6IHRydWUgfSk7XG59XG5cbmZ1bmN0aW9uIHRyeUxvYWRDYW52YXNGcm9tRmlsZShmaWxlUGF0aDogc3RyaW5nKSB7XG5cdHRyeSB7XG5cdFx0cmV0dXJuIGxvYWRDYW52YXNGcm9tRmlsZShmaWxlUGF0aCk7XG5cdH0gY2F0Y2gge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cbn1cblxuZnVuY3Rpb24gbG9hZFBzZEZyb21KU09OQW5kUE5HRmlsZXMoYmFzZVBhdGg6IHN0cmluZykge1xuXHRjb25zdCBwc2Q6IFBzZCA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihiYXNlUGF0aCwgJ2RhdGEuanNvbicpLCAndXRmOCcpKTtcblx0cHNkLmNhbnZhcyA9IGxvYWRDYW52YXNGcm9tRmlsZShwYXRoLmpvaW4oYmFzZVBhdGgsICdjYW52YXMucG5nJykpO1xuXHRwc2QuY2hpbGRyZW4hLmZvckVhY2goKGwsIGkpID0+IHtcblx0XHRpZiAoIWwuY2hpbGRyZW4pIHtcblx0XHRcdGwuY2FudmFzID0gdHJ5TG9hZENhbnZhc0Zyb21GaWxlKHBhdGguam9pbihiYXNlUGF0aCwgYGxheWVyLSR7aX0ucG5nYCkpO1xuXG5cdFx0XHRpZiAobC5tYXNrKSB7XG5cdFx0XHRcdGwubWFzay5jYW52YXMgPSB0cnlMb2FkQ2FudmFzRnJvbUZpbGUocGF0aC5qb2luKGJhc2VQYXRoLCBgbGF5ZXItJHtpfS1tYXNrLnBuZ2ApKTtcblx0XHRcdH1cblx0XHR9XG5cdH0pO1xuXHRwc2QubGlua2VkRmlsZXM/LmZvckVhY2goZiA9PiB7XG5cdFx0dHJ5IHtcblx0XHRcdGYuZGF0YSA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4oYmFzZVBhdGgsIGYubmFtZSkpO1xuXHRcdH0gY2F0Y2ggKGUpIHsgfVxuXHR9KTtcblx0cmV0dXJuIHBzZDtcbn1cblxuZGVzY3JpYmUoJ1BzZFdyaXRlcicsICgpID0+IHtcblx0aXQoJ2RvZXMgbm90IHRocm93IGlmIHdyaXRpbmcgcHNkIHdpdGggZW1wdHkgY2FudmFzJywgKCkgPT4ge1xuXHRcdGNvbnN0IHdyaXRlciA9IGNyZWF0ZVdyaXRlcigpO1xuXHRcdGNvbnN0IHBzZDogUHNkID0ge1xuXHRcdFx0d2lkdGg6IDMwMCxcblx0XHRcdGhlaWdodDogMjAwXG5cdFx0fTtcblxuXHRcdHdyaXRlUHNkKHdyaXRlciwgcHNkKTtcblx0fSk7XG5cblx0aXQoJ3Rocm93cyBpZiBwYXNzZWQgaW52YWxpZCBzaWduYXR1cmUnLCAoKSA9PiB7XG5cdFx0Y29uc3Qgd3JpdGVyID0gY3JlYXRlV3JpdGVyKCk7XG5cblx0XHRmb3IgKGNvbnN0IHMgb2YgWydhJywgJ2FiJywgJ2FiY2RlJ10pIHtcblx0XHRcdGV4cGVjdCgoKSA9PiB3cml0ZVNpZ25hdHVyZSh3cml0ZXIsIHMpLCBzKS50aHJvdyhgSW52YWxpZCBzaWduYXR1cmU6ICcke3N9J2ApO1xuXHRcdH1cblx0fSk7XG5cblx0aXQoJ3Rocm93cyBleGNlcHRpb24gaWYgaGFzIGxheWVyIHdpdGggYm90aCBjaGlsZHJlbiBhbmQgY2FudmFzIHByb3BlcnRpZXMgc2V0JywgKCkgPT4ge1xuXHRcdGNvbnN0IHdyaXRlciA9IGNyZWF0ZVdyaXRlcigpO1xuXHRcdGNvbnN0IHBzZDogUHNkID0ge1xuXHRcdFx0d2lkdGg6IDMwMCxcblx0XHRcdGhlaWdodDogMjAwLFxuXHRcdFx0Y2hpbGRyZW46IFt7IGNoaWxkcmVuOiBbXSwgY2FudmFzOiBjcmVhdGVDYW52YXMoMzAwLCAzMDApIH1dXG5cdFx0fTtcblxuXHRcdGV4cGVjdCgoKSA9PiB3cml0ZVBzZCh3cml0ZXIsIHBzZCkpLnRocm93KGBJbnZhbGlkIGxheWVyLCBjYW5ub3QgaGF2ZSBib3RoICdjYW52YXMnIGFuZCAnY2hpbGRyZW4nIHByb3BlcnRpZXNgKTtcblx0fSk7XG5cblx0aXQoJ3Rocm93cyBleGNlcHRpb24gaWYgaGFzIGxheWVyIHdpdGggYm90aCBjaGlsZHJlbiBhbmQgaW1hZ2VEYXRhIHByb3BlcnRpZXMgc2V0JywgKCkgPT4ge1xuXHRcdGNvbnN0IHdyaXRlciA9IGNyZWF0ZVdyaXRlcigpO1xuXHRcdGNvbnN0IHBzZDogUHNkID0ge1xuXHRcdFx0d2lkdGg6IDMwMCxcblx0XHRcdGhlaWdodDogMjAwLFxuXHRcdFx0Y2hpbGRyZW46IFt7IGNoaWxkcmVuOiBbXSwgaW1hZ2VEYXRhOiB7fSBhcyBhbnkgfV1cblx0XHR9O1xuXG5cdFx0ZXhwZWN0KCgpID0+IHdyaXRlUHNkKHdyaXRlciwgcHNkKSkudGhyb3coYEludmFsaWQgbGF5ZXIsIGNhbm5vdCBoYXZlIGJvdGggJ2ltYWdlRGF0YScgYW5kICdjaGlsZHJlbicgcHJvcGVydGllc2ApO1xuXHR9KTtcblxuXHRpdCgndGhyb3dzIGlmIHBzZCBoYXMgaW52YWxpZCB3aWR0aCBvciBoZWlnaHQnLCAoKSA9PiB7XG5cdFx0Y29uc3Qgd3JpdGVyID0gY3JlYXRlV3JpdGVyKCk7XG5cdFx0Y29uc3QgcHNkOiBQc2QgPSB7XG5cdFx0XHR3aWR0aDogLTUsXG5cdFx0XHRoZWlnaHQ6IDAsXG5cdFx0fTtcblxuXHRcdGV4cGVjdCgoKSA9PiB3cml0ZVBzZCh3cml0ZXIsIHBzZCkpLnRocm93KGBJbnZhbGlkIGRvY3VtZW50IHNpemVgKTtcblx0fSk7XG5cblx0Y29uc3QgZnVsbEltYWdlID0gbG9hZENhbnZhc0Zyb21GaWxlKHBhdGguam9pbihsYXllckltYWdlc1BhdGgsICdmdWxsLnBuZycpKTtcblx0Y29uc3QgdHJhbnNwYXJlbnRJbWFnZSA9IGxvYWRDYW52YXNGcm9tRmlsZShwYXRoLmpvaW4obGF5ZXJJbWFnZXNQYXRoLCAndHJhbnNwYXJlbnQucG5nJykpO1xuXHRjb25zdCB0cmltbWVkSW1hZ2UgPSBsb2FkQ2FudmFzRnJvbUZpbGUocGF0aC5qb2luKGxheWVySW1hZ2VzUGF0aCwgJ3RyaW1tZWQucG5nJykpO1xuXHQvLyBjb25zdCBjcm9wcGVkSW1hZ2UgPSBsb2FkQ2FudmFzRnJvbUZpbGUocGF0aC5qb2luKGxheWVySW1hZ2VzUGF0aCwgJ2Nyb3BwZWQucG5nJykpO1xuXHQvLyBjb25zdCBwYWRkZWRJbWFnZSA9IGxvYWRDYW52YXNGcm9tRmlsZShwYXRoLmpvaW4obGF5ZXJJbWFnZXNQYXRoLCAncGFkZGVkLnBuZycpKTtcblxuXHRkZXNjcmliZSgnbGF5ZXIgbGVmdCwgdG9wLCByaWdodCwgYm90dG9tIGhhbmRsaW5nJywgKCkgPT4ge1xuXHRcdGl0KCdoYW5kbGVzIHVuZGVmaW5lZCBsZWZ0LCB0b3AsIHJpZ2h0LCBib3R0b20gd2l0aCBsYXllciBpbWFnZSB0aGUgc2FtZSBzaXplIGFzIGRvY3VtZW50JywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgcHNkOiBQc2QgPSB7XG5cdFx0XHRcdHdpZHRoOiAzMDAsXG5cdFx0XHRcdGhlaWdodDogMjAwLFxuXHRcdFx0XHRjaGlsZHJlbjogW1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICd0ZXN0Jyxcblx0XHRcdFx0XHRcdGNhbnZhczogZnVsbEltYWdlLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdF0sXG5cdFx0XHR9O1xuXG5cdFx0XHRjb25zdCByZXN1bHQgPSB3cml0ZUFuZFJlYWQocHNkKTtcblxuXHRcdFx0Y29uc3QgbGF5ZXIgPSByZXN1bHQuY2hpbGRyZW4hWzBdO1xuXHRcdFx0Y29tcGFyZUNhbnZhc2VzKGZ1bGxJbWFnZSwgbGF5ZXIuY2FudmFzLCAnZnVsbC1sYXllci1pbWFnZS5wbmcnKTtcblx0XHRcdGV4cGVjdChsYXllci5sZWZ0KS5lcXVhbCgwKTtcblx0XHRcdGV4cGVjdChsYXllci50b3ApLmVxdWFsKDApO1xuXHRcdFx0ZXhwZWN0KGxheWVyLnJpZ2h0KS5lcXVhbCgzMDApO1xuXHRcdFx0ZXhwZWN0KGxheWVyLmJvdHRvbSkuZXF1YWwoMjAwKTtcblx0XHR9KTtcblxuXHRcdGl0KCdoYW5kbGVzIGxheWVyIGltYWdlIGxhcmdlciB0aGFuIGRvY3VtZW50JywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgcHNkOiBQc2QgPSB7XG5cdFx0XHRcdHdpZHRoOiAxMDAsXG5cdFx0XHRcdGhlaWdodDogNTAsXG5cdFx0XHRcdGNoaWxkcmVuOiBbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3Rlc3QnLFxuXHRcdFx0XHRcdFx0Y2FudmFzOiBmdWxsSW1hZ2UsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XSxcblx0XHRcdH07XG5cblx0XHRcdGNvbnN0IHJlc3VsdCA9IHdyaXRlQW5kUmVhZChwc2QpO1xuXG5cdFx0XHRjb25zdCBsYXllciA9IHJlc3VsdC5jaGlsZHJlbiFbMF07XG5cdFx0XHRjb21wYXJlQ2FudmFzZXMoZnVsbEltYWdlLCBsYXllci5jYW52YXMsICdvdmVyc2l6ZWQtbGF5ZXItaW1hZ2UucG5nJyk7XG5cdFx0XHRleHBlY3QobGF5ZXIubGVmdCkuZXF1YWwoMCk7XG5cdFx0XHRleHBlY3QobGF5ZXIudG9wKS5lcXVhbCgwKTtcblx0XHRcdGV4cGVjdChsYXllci5yaWdodCkuZXF1YWwoMzAwKTtcblx0XHRcdGV4cGVjdChsYXllci5ib3R0b20pLmVxdWFsKDIwMCk7XG5cdFx0fSk7XG5cblx0XHRpdCgnYWxpZ25zIGxheWVyIGltYWdlIHRvIHRvcCBsZWZ0IGlmIGxheWVyIGltYWdlIGlzIHNtYWxsZXIgdGhhbiBkb2N1bWVudCcsICgpID0+IHtcblx0XHRcdGNvbnN0IHBzZDogUHNkID0ge1xuXHRcdFx0XHR3aWR0aDogMzAwLFxuXHRcdFx0XHRoZWlnaHQ6IDIwMCxcblx0XHRcdFx0Y2hpbGRyZW46IFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAndGVzdCcsXG5cdFx0XHRcdFx0XHRjYW52YXM6IHRyaW1tZWRJbWFnZSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRdLFxuXHRcdFx0fTtcblxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gd3JpdGVBbmRSZWFkKHBzZCk7XG5cblx0XHRcdGNvbnN0IGxheWVyID0gcmVzdWx0LmNoaWxkcmVuIVswXTtcblx0XHRcdGNvbXBhcmVDYW52YXNlcyh0cmltbWVkSW1hZ2UsIGxheWVyLmNhbnZhcywgJ3NtYWxsZXItbGF5ZXItaW1hZ2UucG5nJyk7XG5cdFx0XHRleHBlY3QobGF5ZXIubGVmdCkuZXF1YWwoMCk7XG5cdFx0XHRleHBlY3QobGF5ZXIudG9wKS5lcXVhbCgwKTtcblx0XHRcdGV4cGVjdChsYXllci5yaWdodCkuZXF1YWwoMTkyKTtcblx0XHRcdGV4cGVjdChsYXllci5ib3R0b20pLmVxdWFsKDY4KTtcblx0XHR9KTtcblxuXHRcdGl0KCdkb2VzIG5vdCB0cmltIHRyYW5zcGFyZW50IGxheWVyIGltYWdlIGlmIHRyaW0gb3B0aW9uIGlzIG5vdCBwYXNzZWQnLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBwc2Q6IFBzZCA9IHtcblx0XHRcdFx0d2lkdGg6IDMwMCxcblx0XHRcdFx0aGVpZ2h0OiAyMDAsXG5cdFx0XHRcdGNoaWxkcmVuOiBbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ3Rlc3QnLFxuXHRcdFx0XHRcdFx0Y2FudmFzOiB0cmFuc3BhcmVudEltYWdlLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdF0sXG5cdFx0XHR9O1xuXG5cdFx0XHRjb25zdCByZXN1bHQgPSB3cml0ZUFuZFJlYWQocHNkKTtcblxuXHRcdFx0Y29uc3QgbGF5ZXIgPSByZXN1bHQuY2hpbGRyZW4hWzBdO1xuXHRcdFx0Y29tcGFyZUNhbnZhc2VzKHRyYW5zcGFyZW50SW1hZ2UsIGxheWVyLmNhbnZhcywgJ3RyYW5zcGFyZW50LWxheWVyLWltYWdlLnBuZycpO1xuXHRcdFx0ZXhwZWN0KGxheWVyLmxlZnQpLmVxdWFsKDApO1xuXHRcdFx0ZXhwZWN0KGxheWVyLnRvcCkuZXF1YWwoMCk7XG5cdFx0XHRleHBlY3QobGF5ZXIucmlnaHQpLmVxdWFsKDMwMCk7XG5cdFx0XHRleHBlY3QobGF5ZXIuYm90dG9tKS5lcXVhbCgyMDApO1xuXHRcdH0pO1xuXG5cdFx0aXQoJ3RyaW1zIHRyYW5zcGFyZW50IGxheWVyIGltYWdlIGlmIHRyaW0gb3B0aW9uIGlzIHNldCcsICgpID0+IHtcblx0XHRcdGNvbnN0IHBzZDogUHNkID0ge1xuXHRcdFx0XHR3aWR0aDogMzAwLFxuXHRcdFx0XHRoZWlnaHQ6IDIwMCxcblx0XHRcdFx0Y2hpbGRyZW46IFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAndGVzdCcsXG5cdFx0XHRcdFx0XHRjYW52YXM6IHRyYW5zcGFyZW50SW1hZ2UsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XSxcblx0XHRcdH07XG5cblx0XHRcdGNvbnN0IHJlc3VsdCA9IHdyaXRlQW5kUmVhZChwc2QsIHsgdHJpbUltYWdlRGF0YTogdHJ1ZSB9KTtcblxuXHRcdFx0Y29uc3QgbGF5ZXIgPSByZXN1bHQuY2hpbGRyZW4hWzBdO1xuXHRcdFx0Y29tcGFyZUNhbnZhc2VzKHRyaW1tZWRJbWFnZSwgbGF5ZXIuY2FudmFzLCAndHJpbW1lZC1sYXllci1pbWFnZS5wbmcnKTtcblx0XHRcdGV4cGVjdChsYXllci5sZWZ0KS5lcXVhbCg1MSk7XG5cdFx0XHRleHBlY3QobGF5ZXIudG9wKS5lcXVhbCg2NSk7XG5cdFx0XHRleHBlY3QobGF5ZXIucmlnaHQpLmVxdWFsKDI0Myk7XG5cdFx0XHRleHBlY3QobGF5ZXIuYm90dG9tKS5lcXVhbCgxMzMpO1xuXHRcdH0pO1xuXG5cdFx0aXQoJ3Bvc2l0aW9ucyB0aGUgbGF5ZXIgYXQgZ2l2ZW4gbGVmdC90b3Agb2Zmc2V0cycsICgpID0+IHtcblx0XHRcdGNvbnN0IHBzZDogUHNkID0ge1xuXHRcdFx0XHR3aWR0aDogMzAwLFxuXHRcdFx0XHRoZWlnaHQ6IDIwMCxcblx0XHRcdFx0Y2hpbGRyZW46IFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAndGVzdCcsXG5cdFx0XHRcdFx0XHRsZWZ0OiA1MCxcblx0XHRcdFx0XHRcdHRvcDogMzAsXG5cdFx0XHRcdFx0XHRjYW52YXM6IGZ1bGxJbWFnZSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRdLFxuXHRcdFx0fTtcblxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gd3JpdGVBbmRSZWFkKHBzZCk7XG5cblx0XHRcdGNvbnN0IGxheWVyID0gcmVzdWx0LmNoaWxkcmVuIVswXTtcblx0XHRcdGNvbXBhcmVDYW52YXNlcyhmdWxsSW1hZ2UsIGxheWVyLmNhbnZhcywgJ2xlZnQtdG9wLWxheWVyLWltYWdlLnBuZycpO1xuXHRcdFx0ZXhwZWN0KGxheWVyLmxlZnQpLmVxdWFsKDUwKTtcblx0XHRcdGV4cGVjdChsYXllci50b3ApLmVxdWFsKDMwKTtcblx0XHRcdGV4cGVjdChsYXllci5yaWdodCkuZXF1YWwoMzUwKTtcblx0XHRcdGV4cGVjdChsYXllci5ib3R0b20pLmVxdWFsKDIzMCk7XG5cdFx0fSk7XG5cblx0XHRpdCgnaWdub3JlcyByaWdodC9ib3R0b20gdmFsdWVzJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgcHNkOiBQc2QgPSB7XG5cdFx0XHRcdHdpZHRoOiAzMDAsXG5cdFx0XHRcdGhlaWdodDogMjAwLFxuXHRcdFx0XHRjaGlsZHJlbjogW1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICd0ZXN0Jyxcblx0XHRcdFx0XHRcdHJpZ2h0OiAyMDAsXG5cdFx0XHRcdFx0XHRib3R0b206IDEwMCxcblx0XHRcdFx0XHRcdGNhbnZhczogZnVsbEltYWdlLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdF0sXG5cdFx0XHR9O1xuXG5cdFx0XHRjb25zdCByZXN1bHQgPSB3cml0ZUFuZFJlYWQocHNkKTtcblxuXHRcdFx0Y29uc3QgbGF5ZXIgPSByZXN1bHQuY2hpbGRyZW4hWzBdO1xuXHRcdFx0Y29tcGFyZUNhbnZhc2VzKGZ1bGxJbWFnZSwgbGF5ZXIuY2FudmFzLCAnY3JvcHBlZC1sYXllci1pbWFnZS5wbmcnKTtcblx0XHRcdGV4cGVjdChsYXllci5sZWZ0KS5lcXVhbCgwKTtcblx0XHRcdGV4cGVjdChsYXllci50b3ApLmVxdWFsKDApO1xuXHRcdFx0ZXhwZWN0KGxheWVyLnJpZ2h0KS5lcXVhbCgzMDApO1xuXHRcdFx0ZXhwZWN0KGxheWVyLmJvdHRvbSkuZXF1YWwoMjAwKTtcblx0XHR9KTtcblxuXHRcdGl0KCdpZ25vcmVzIGxhcmdlciByaWdodC9ib3R0b20gdmFsdWVzJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgcHNkOiBQc2QgPSB7XG5cdFx0XHRcdHdpZHRoOiAzMDAsXG5cdFx0XHRcdGhlaWdodDogMjAwLFxuXHRcdFx0XHRjaGlsZHJlbjogW1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICd0ZXN0Jyxcblx0XHRcdFx0XHRcdHJpZ2h0OiA0MDAsXG5cdFx0XHRcdFx0XHRib3R0b206IDI1MCxcblx0XHRcdFx0XHRcdGNhbnZhczogZnVsbEltYWdlLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdF0sXG5cdFx0XHR9O1xuXG5cdFx0XHRjb25zdCByZXN1bHQgPSB3cml0ZUFuZFJlYWQocHNkKTtcblxuXHRcdFx0Y29uc3QgbGF5ZXIgPSByZXN1bHQuY2hpbGRyZW4hWzBdO1xuXHRcdFx0Y29tcGFyZUNhbnZhc2VzKGZ1bGxJbWFnZSwgbGF5ZXIuY2FudmFzLCAncGFkZGVkLWxheWVyLWltYWdlLnBuZycpO1xuXHRcdFx0ZXhwZWN0KGxheWVyLmxlZnQpLmVxdWFsKDApO1xuXHRcdFx0ZXhwZWN0KGxheWVyLnRvcCkuZXF1YWwoMCk7XG5cdFx0XHRleHBlY3QobGF5ZXIucmlnaHQpLmVxdWFsKDMwMCk7XG5cdFx0XHRleHBlY3QobGF5ZXIuYm90dG9tKS5lcXVhbCgyMDApO1xuXHRcdH0pO1xuXG5cdFx0aXQoJ2lnbm9yZXMgcmlnaHQvYm90dG9tIHZhbHVlcyBpZiB0aGV5IGRvIG5vdCBtYXRjaCBjYW52YXMgc2l6ZScsICgpID0+IHtcblx0XHRcdGNvbnN0IHBzZDogUHNkID0ge1xuXHRcdFx0XHR3aWR0aDogMzAwLFxuXHRcdFx0XHRoZWlnaHQ6IDIwMCxcblx0XHRcdFx0Y2hpbGRyZW46IFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRuYW1lOiAndGVzdCcsXG5cdFx0XHRcdFx0XHRsZWZ0OiA1MCxcblx0XHRcdFx0XHRcdHRvcDogNTAsXG5cdFx0XHRcdFx0XHRyaWdodDogNTAsXG5cdFx0XHRcdFx0XHRib3R0b206IDUwLFxuXHRcdFx0XHRcdFx0Y2FudmFzOiBmdWxsSW1hZ2UsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XSxcblx0XHRcdH07XG5cblx0XHRcdGNvbnN0IHJlc3VsdCA9IHdyaXRlQW5kUmVhZChwc2QpO1xuXG5cdFx0XHRjb25zdCBsYXllciA9IHJlc3VsdC5jaGlsZHJlbiFbMF07XG5cdFx0XHRjb21wYXJlQ2FudmFzZXMoZnVsbEltYWdlLCBsYXllci5jYW52YXMsICdlbXB0eS1sYXllci1pbWFnZS5wbmcnKTtcblx0XHRcdGV4cGVjdChsYXllci5sZWZ0KS5lcXVhbCg1MCk7XG5cdFx0XHRleHBlY3QobGF5ZXIudG9wKS5lcXVhbCg1MCk7XG5cdFx0XHRleHBlY3QobGF5ZXIucmlnaHQpLmVxdWFsKDM1MCk7XG5cdFx0XHRleHBlY3QobGF5ZXIuYm90dG9tKS5lcXVhbCgyNTApO1xuXHRcdH0pO1xuXG5cdFx0aXQoJ2lnbm9yZXMgcmlnaHQvYm90dG9tIHZhbHVlcyBpZiB0aGV5IGFtb3VudCB0byBuZWdhdGl2ZSBzaXplJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgcHNkOiBQc2QgPSB7XG5cdFx0XHRcdHdpZHRoOiAzMDAsXG5cdFx0XHRcdGhlaWdodDogMjAwLFxuXHRcdFx0XHRjaGlsZHJlbjogW1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6ICd0ZXN0Jyxcblx0XHRcdFx0XHRcdGxlZnQ6IDUwLFxuXHRcdFx0XHRcdFx0dG9wOiA1MCxcblx0XHRcdFx0XHRcdHJpZ2h0OiAwLFxuXHRcdFx0XHRcdFx0Ym90dG9tOiAwLFxuXHRcdFx0XHRcdFx0Y2FudmFzOiBmdWxsSW1hZ2UsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XSxcblx0XHRcdH07XG5cblx0XHRcdGNvbnN0IHJlc3VsdCA9IHdyaXRlQW5kUmVhZChwc2QpO1xuXG5cdFx0XHRjb25zdCBsYXllciA9IHJlc3VsdC5jaGlsZHJlbiFbMF07XG5cdFx0XHRjb21wYXJlQ2FudmFzZXMoZnVsbEltYWdlLCBsYXllci5jYW52YXMsICdlbXB0eS1sYXllci1pbWFnZS5wbmcnKTtcblx0XHRcdGV4cGVjdChsYXllci5sZWZ0KS5lcXVhbCg1MCk7XG5cdFx0XHRleHBlY3QobGF5ZXIudG9wKS5lcXVhbCg1MCk7XG5cdFx0XHRleHBlY3QobGF5ZXIucmlnaHQpLmVxdWFsKDM1MCk7XG5cdFx0XHRleHBlY3QobGF5ZXIuYm90dG9tKS5lcXVhbCgyNTApO1xuXHRcdH0pO1xuXHR9KTtcblxuXHQvLyBmcy5yZWFkZGlyU3luYyh3cml0ZUZpbGVzUGF0aCkuZmlsdGVyKGYgPT4gL3NtYXJ0LW9iamVjdC8udGVzdChmKSkuZm9yRWFjaChmID0+IHtcblx0ZnMucmVhZGRpclN5bmMod3JpdGVGaWxlc1BhdGgpLmZpbHRlcihmID0+ICEvcGF0dGVybi8udGVzdChmKSkuZm9yRWFjaChmID0+IHtcblx0XHRpdChgd3JpdGVzIFBTRCBmaWxlICgke2Z9KWAsICgpID0+IHtcblx0XHRcdGNvbnN0IGJhc2VQYXRoID0gcGF0aC5qb2luKHdyaXRlRmlsZXNQYXRoLCBmKTtcblx0XHRcdGNvbnN0IHBzZCA9IGxvYWRQc2RGcm9tSlNPTkFuZFBOR0ZpbGVzKGJhc2VQYXRoKTtcblxuXHRcdFx0Y29uc3QgYmVmb3JlID0gSlNPTi5zdHJpbmdpZnkocHNkLCByZXBsYWNlcik7XG5cdFx0XHRjb25zdCBidWZmZXIgPSB3cml0ZVBzZEJ1ZmZlcihwc2QsIHsgZ2VuZXJhdGVUaHVtYm5haWw6IGZhbHNlLCB0cmltSW1hZ2VEYXRhOiB0cnVlLCBsb2dNaXNzaW5nRmVhdHVyZXM6IHRydWUgfSk7XG5cdFx0XHRjb25zdCBhZnRlciA9IEpTT04uc3RyaW5naWZ5KHBzZCwgcmVwbGFjZXIpO1xuXG5cdFx0XHRleHBlY3QoYmVmb3JlKS5lcXVhbChhZnRlciwgJ3BzZCBvYmplY3QgbXV0YXRlZCcpO1xuXG5cdFx0XHRmcy5ta2RpclN5bmMocmVzdWx0c0ZpbGVzUGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG5cdFx0XHRmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihyZXN1bHRzRmlsZXNQYXRoLCBgJHtmfS5wc2RgKSwgYnVmZmVyKTtcblx0XHRcdC8vIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKHJlc3VsdHNGaWxlc1BhdGgsIGAke2Z9LmJpbmApLCBidWZmZXIpOyAvLyBURU1QXG5cblx0XHRcdGNvbnN0IHJlYWRlciA9IGNyZWF0ZVJlYWRlcihidWZmZXIuYnVmZmVyKTtcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHJlYWRQc2QocmVhZGVyLCB7IHNraXBMYXllckltYWdlRGF0YTogdHJ1ZSwgbG9nTWlzc2luZ0ZlYXR1cmVzOiB0cnVlLCB0aHJvd0Zvck1pc3NpbmdGZWF0dXJlczogdHJ1ZSB9KTtcblx0XHRcdGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKHJlc3VsdHNGaWxlc1BhdGgsIGAke2Z9LWNvbXBvc2l0ZS5wbmdgKSwgcmVzdWx0LmNhbnZhcyEudG9CdWZmZXIoKSk7XG5cdFx0XHQvL2NvbXBhcmVDYW52YXNlcyhwc2QuY2FudmFzLCByZXN1bHQuY2FudmFzLCAnY29tcG9zaXRlIGltYWdlJyk7XG5cblx0XHRcdGNvbnN0IGV4cGVjdGVkID0gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihiYXNlUGF0aCwgJ2V4cGVjdGVkLnBzZCcpKTtcblx0XHRcdGNvbXBhcmVCdWZmZXJzKGJ1ZmZlciwgZXhwZWN0ZWQsIGBBcnJheUJ1ZmZlclBzZFdyaXRlcmAsIDApO1xuXHRcdH0pO1xuXHR9KTtcbn0pO1xuXG5mdW5jdGlvbiByZXBsYWNlcihrZXk6IHN0cmluZywgdmFsdWU6IGFueSkge1xuXHRpZiAoa2V5ID09PSAnY2FudmFzJykge1xuXHRcdHJldHVybiAnPGNhbnZhcz4nO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiB2YWx1ZTtcblx0fVxufVxuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvYnJhbmRvbmxpdS9EZXNrdG9wL3NreWxhYi9hZy1wc2Qvc3JjIn0=
