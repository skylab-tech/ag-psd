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
import { readPsdFromFile, importPSD, loadImagesFromDirectory, compareCanvases, saveCanvas, createReaderFromBuffer, compareBuffers, compareTwoFiles } from './common';
import { readPsd, writePsdBuffer } from '../index';
import { readPsd as readPsdInternal } from '../psdReader';
var testFilesPath = path.join(__dirname, '..', '..', 'test');
var readFilesPath = path.join(testFilesPath, 'read');
var readWriteFilesPath = path.join(testFilesPath, 'read-write');
var resultsFilesPath = path.join(__dirname, '..', '..', 'results');
var opts = {
    throwForMissingFeatures: true,
    logMissingFeatures: true,
};
describe('PsdReader', function () {
    it('reads width and height properly', function () {
        var psd = readPsdFromFile(path.join(readFilesPath, 'blend-mode', 'src.psd'), __assign({}, opts));
        expect(psd.width).equal(300);
        expect(psd.height).equal(200);
    });
    it('skips composite image data', function () {
        var psd = readPsdFromFile(path.join(readFilesPath, 'layers', 'src.psd'), __assign(__assign({}, opts), { skipCompositeImageData: true }));
        expect(psd.canvas).not.ok;
    });
    it('skips layer image data', function () {
        var psd = readPsdFromFile(path.join(readFilesPath, 'layers', 'src.psd'), __assign(__assign({}, opts), { skipLayerImageData: true }));
        expect(psd.children[0].canvas).not.ok;
    });
    it('reads PSD from Buffer with offset', function () {
        var file = fs.readFileSync(path.join(readFilesPath, 'layers', 'src.psd'));
        var outer = Buffer.alloc(file.byteLength + 100);
        file.copy(outer, 100);
        var inner = Buffer.from(outer.buffer, 100, file.byteLength);
        var psd = readPsd(inner, opts);
        expect(psd.width).equal(300);
    });
    it.skip('duplicate smart', function () {
        var psd = readPsdFromFile(path.join('resources', 'src.psd'), __assign({}, opts));
        var child = psd.children[1].children[0];
        psd.children[1].children.push(child);
        // const child = psd.children![0];
        // delete child.id;
        // psd.children!.push(child);
        fs.writeFileSync('output.psd', writePsdBuffer(psd, {
            trimImageData: false,
            generateThumbnail: true,
            noBackground: true
        }));
        var psd2 = readPsdFromFile(path.join('output.psd'), __assign({}, opts));
        console.log(psd2.width);
    });
    // skipping "pattern" test because it requires zip cimpression of patterns
    // skipping "cmyk" test because we can't convert CMYK to RGB
    fs.readdirSync(readFilesPath).filter(function (f) { return !/pattern|cmyk/.test(f); }).forEach(function (f) {
        // fs.readdirSync(readFilesPath).filter(f => /krita/.test(f)).forEach(f => {
        it("reads PSD file (" + f + ")", function () {
            var _a;
            var basePath = path.join(readFilesPath, f);
            var fileName = fs.existsSync(path.join(basePath, 'src.psb')) ? 'src.psb' : 'src.psd';
            var psd = readPsdFromFile(path.join(basePath, fileName), __assign({}, opts));
            var expected = importPSD(basePath);
            var images = loadImagesFromDirectory(basePath);
            var compare = [];
            var compareFiles = [];
            compare.push({ name: "canvas.png", canvas: psd.canvas });
            psd.canvas = undefined;
            delete psd.imageData;
            delete psd.imageResources.xmpMetadata;
            var i = 0;
            function pushLayerCanvases(layers) {
                for (var _i = 0, layers_1 = layers; _i < layers_1.length; _i++) {
                    var l = layers_1[_i];
                    var layerId = i;
                    if (!l.children || l.mask)
                        i++;
                    if (l.children) {
                        pushLayerCanvases(l.children);
                    }
                    else {
                        compare.push({ name: "layer-" + layerId + ".png", canvas: l.canvas });
                        l.canvas = undefined;
                        delete l.imageData;
                    }
                    if (l.mask) {
                        compare.push({ name: "layer-" + layerId + "-mask.png", canvas: l.mask.canvas });
                        delete l.mask.canvas;
                        delete l.mask.imageData;
                    }
                }
            }
            if (psd.linkedFiles) {
                for (var _i = 0, _b = psd.linkedFiles; _i < _b.length; _i++) {
                    var file = _b[_i];
                    if (file.data) {
                        compareFiles.push({ name: file.name, data: file.data });
                        delete file.data;
                    }
                }
            }
            pushLayerCanvases(psd.children || []);
            fs.mkdirSync(path.join(resultsFilesPath, f), { recursive: true });
            if ((_a = psd.imageResources) === null || _a === void 0 ? void 0 : _a.thumbnail) {
                compare.push({ name: 'thumb.png', canvas: psd.imageResources.thumbnail, skip: true });
                delete psd.imageResources.thumbnail;
            }
            if (psd.imageResources)
                delete psd.imageResources.thumbnailRaw;
            compare.forEach(function (i) { return saveCanvas(path.join(resultsFilesPath, f, i.name), i.canvas); });
            compareFiles.forEach(function (i) { return fs.writeFileSync(path.join(resultsFilesPath, f, i.name), i.data); });
            fs.writeFileSync(path.join(resultsFilesPath, f, 'data.json'), JSON.stringify(psd, null, 2), 'utf8');
            clearEmptyCanvasFields(psd);
            clearEmptyCanvasFields(expected);
            expect(psd).eql(expected, f);
            compare.forEach(function (i) { return i.skip || compareCanvases(images[i.name], i.canvas, f + "/" + i.name); });
            compareFiles.forEach(function (i) { return compareTwoFiles(path.join(basePath, i.name), i.data, f + "/" + i.name); });
        });
    });
    fs.readdirSync(readWriteFilesPath).forEach(function (f) {
        // fs.readdirSync(readWriteFilesPath).filter(f => /^test$/.test(f)).forEach(f => {
        it("reads-writes PSD file (" + f + ")", function () {
            var ext = fs.existsSync(path.join(readWriteFilesPath, f, 'src.psb')) ? 'psb' : 'psd';
            var psd = readPsdFromFile(path.join(readWriteFilesPath, f, "src." + ext), __assign(__assign({}, opts), { useImageData: true, useRawThumbnail: true, throwForMissingFeatures: true }));
            var actual = writePsdBuffer(psd, { logMissingFeatures: true, psb: ext === 'psb' });
            var expected = fs.readFileSync(path.join(readWriteFilesPath, f, "expected." + ext));
            fs.writeFileSync(path.join(resultsFilesPath, "read-write-" + f + "." + ext), actual);
            fs.writeFileSync(path.join(resultsFilesPath, "read-write-" + f + ".bin"), actual);
            // console.log(require('util').inspect(psd, false, 99, true));
            // const psd2 = readPsdFromFile(path.join(resultsFilesPath, `read-write-${f}.psd`), { ...opts, useImageData: true, useRawThumbnail: true });
            // fs.writeFileSync('temp.txt', require('util').inspect(psd, false, 99, false), 'utf8');
            // fs.writeFileSync('temp2.txt', require('util').inspect(psd2, false, 99, false), 'utf8');
            compareBuffers(actual, expected, "read-write-" + f, 0x0);
        });
    });
    it.skip('write text layer test', function () {
        var psd = {
            width: 200,
            height: 200,
            children: [
                {
                    name: 'text layer',
                    text: {
                        text: 'Hello World\n• c • tiny!\r\ntest',
                        // orientation: 'vertical',
                        transform: [1, 0, 0, 1, 70, 70],
                        style: {
                            font: { name: 'ArialMT' },
                            fontSize: 30,
                            fillColor: { r: 0, g: 128, b: 0 },
                        },
                        styleRuns: [
                            { length: 12, style: { fillColor: { r: 255, g: 0, b: 0 } } },
                            { length: 12, style: { fillColor: { r: 0, g: 0, b: 255 } } },
                            { length: 4, style: { underline: true } },
                        ],
                        paragraphStyle: {
                            justification: 'center',
                        },
                        warp: {
                            style: 'arc',
                            value: 50,
                            perspective: 0,
                            perspectiveOther: 0,
                            rotate: 'horizontal',
                        },
                    },
                },
                {
                    name: '2nd layer',
                    text: {
                        text: 'Aaaaa',
                        transform: [1, 0, 0, 1, 70, 70],
                    },
                },
            ],
        };
        fs.writeFileSync(path.join(resultsFilesPath, '_TEXT2.psd'), writePsdBuffer(psd, { logMissingFeatures: true }));
    });
    it.skip('read text layer test', function () {
        var psd = readPsdFromFile(path.join(testFilesPath, 'text-test.psd'), opts);
        // const layer = psd.children![1];
        // layer.text!.text = 'Foo bar';
        var buffer = writePsdBuffer(psd, { logMissingFeatures: true });
        fs.writeFileSync(path.join(resultsFilesPath, '_TEXT.psd'), buffer);
        // console.log(require('util').inspect(psd.children![0].text, false, 99, true));
        // console.log(require('util').inspect(psd.children![1].text, false, 99, true));
        // console.log(require('util').inspect(psd.engineData, false, 99, true));
    });
    it.skip('READ TEST', function () {
        var originalBuffer = fs.readFileSync(path.join(testFilesPath, 'test.psd'));
        console.log('READING ORIGINAL');
        var opts = {
            logMissingFeatures: true,
            throwForMissingFeatures: true,
            useImageData: true,
            useRawThumbnail: true,
            logDevFeatures: true,
        };
        var originalPsd = readPsdInternal(createReaderFromBuffer(originalBuffer), opts);
        console.log('WRITING');
        var buffer = writePsdBuffer(originalPsd, { logMissingFeatures: true });
        fs.writeFileSync('temp.psd', buffer);
        // fs.writeFileSync('temp.bin', buffer);
        // fs.writeFileSync('temp.json', JSON.stringify(originalPsd, null, 2), 'utf8');
        // fs.writeFileSync('temp.xml', originalPsd.imageResources?.xmpMetadata, 'utf8');
        console.log('READING WRITTEN');
        var psd = readPsdInternal(createReaderFromBuffer(buffer), { logMissingFeatures: true, throwForMissingFeatures: true });
        clearCanvasFields(originalPsd);
        clearCanvasFields(psd);
        delete originalPsd.imageResources.thumbnail;
        delete psd.imageResources.thumbnail;
        delete originalPsd.imageResources.thumbnailRaw;
        delete psd.imageResources.thumbnailRaw;
        // console.log(require('util').inspect(originalPsd, false, 99, true));
        // fs.writeFileSync('original.json', JSON.stringify(originalPsd, null, 2));
        // fs.writeFileSync('after.json', JSON.stringify(psd, null, 2));
        compareBuffers(buffer, originalBuffer, 'test');
        expect(psd).eql(originalPsd);
    });
    it.skip('decode engine data 2', function () {
        // const fileData = fs.readFileSync(path.join(__dirname, '..', '..', 'resources', 'engineData2Vertical.txt'));
        var fileData = fs.readFileSync(path.join(__dirname, '..', '..', 'resources', 'engineData2Simple.txt'));
        var func = new Function("return " + fileData + ";");
        var data = func();
        var result = decodeEngineData2(data);
        fs.writeFileSync(path.join(__dirname, '..', '..', 'resources', 'temp.js'), 'var x = ' + require('util').inspect(result, false, 99, false), 'utf8');
    });
    it.skip('test.psd', function () {
        var buffer = fs.readFileSync('test.psd');
        var psd = readPsdInternal(createReaderFromBuffer(buffer), {
            skipCompositeImageData: true,
            skipLayerImageData: true,
            skipThumbnail: true,
            throwForMissingFeatures: true,
            logDevFeatures: true,
        });
        delete psd.engineData;
        psd.imageResources = {};
        console.log(require('util').inspect(psd, false, 99, true));
    });
    it.skip('test', function () {
        var psd = readPsdInternal(createReaderFromBuffer(fs.readFileSync("test/read-write/text-box/src.psd")), {
            // skipCompositeImageData: true,
            // skipLayerImageData: true,
            // skipThumbnail: true,
            throwForMissingFeatures: true,
            logDevFeatures: true,
            useRawThumbnail: true,
        });
        fs.writeFileSync('text_rect_out.psd', writePsdBuffer(psd, { logMissingFeatures: true }));
        fs.writeFileSync('text_rect_out.bin', writePsdBuffer(psd, { logMissingFeatures: true }));
        // const psd2 = readPsdInternal(createReaderFromBuffer(fs.readFileSync(`text_rect_out.psd`)), {
        // 	// skipCompositeImageData: true,
        // 	// skipLayerImageData: true,
        // 	// skipThumbnail: true,
        // 	throwForMissingFeatures: true,
        // 	logDevFeatures: true,
        // });
        // psd2;
        var original = fs.readFileSync("test/read-write/text-box/src.psd");
        var output = fs.readFileSync("text_rect_out.psd");
        compareBuffers(output, original, '-', 0x65d8); // , 0x8ce8, 0x8fca - 0x8ce8);
    });
    it.skip('compare test', function () {
        for (var _i = 0, _a = ['text_point', 'text_rect']; _i < _a.length; _i++) {
            var name_1 = _a[_i];
            var psd = readPsdInternal(createReaderFromBuffer(fs.readFileSync(name_1 + ".psd")), {
                skipCompositeImageData: true,
                skipLayerImageData: true,
                skipThumbnail: true,
                throwForMissingFeatures: true,
                logDevFeatures: true,
            });
            // psd.imageResources = {};
            fs.writeFileSync(name_1 + ".txt", require('util').inspect(psd, false, 99, false), 'utf8');
            // const engineData = parseEngineData(toByteArray(psd.engineData!));
            // fs.writeFileSync(`${name}_enginedata.txt`, require('util').inspect(engineData, false, 99, false), 'utf8');
        }
    });
    it.skip('text-replace.psd', function () {
        var _a, _b;
        {
            var buffer = fs.readFileSync('text-replace2.psd');
            var psd = readPsdInternal(createReaderFromBuffer(buffer), {});
            psd.children[1].text.text = 'Foo bar';
            var output = writePsdBuffer(psd, { invalidateTextLayers: true, logMissingFeatures: true });
            fs.writeFileSync('out.psd', output);
        }
        {
            var buffer = fs.readFileSync('text-replace.psd');
            var psd = readPsdInternal(createReaderFromBuffer(buffer), {
                skipCompositeImageData: true,
                skipLayerImageData: true,
                skipThumbnail: true,
                throwForMissingFeatures: true,
                logDevFeatures: true,
            });
            delete psd.engineData;
            psd.imageResources = {};
            (_a = psd.children) === null || _a === void 0 ? void 0 : _a.splice(0, 1);
            fs.writeFileSync('input.txt', require('util').inspect(psd, false, 99, false), 'utf8');
        }
        {
            var buffer = fs.readFileSync('out.psd');
            var psd = readPsdInternal(createReaderFromBuffer(buffer), {
                skipCompositeImageData: true,
                skipLayerImageData: true,
                skipThumbnail: true,
                throwForMissingFeatures: true,
                logDevFeatures: true,
            });
            delete psd.engineData;
            psd.imageResources = {};
            (_b = psd.children) === null || _b === void 0 ? void 0 : _b.splice(0, 1);
            fs.writeFileSync('output.txt', require('util').inspect(psd, false, 99, false), 'utf8');
        }
    });
});
function clearEmptyCanvasFields(layer) {
    var _a;
    if (layer) {
        if ('canvas' in layer && !layer.canvas)
            delete layer.canvas;
        if ('imageData' in layer && !layer.imageData)
            delete layer.imageData;
        (_a = layer.children) === null || _a === void 0 ? void 0 : _a.forEach(clearEmptyCanvasFields);
    }
}
function clearCanvasFields(layer) {
    var _a;
    if (layer) {
        delete layer.canvas;
        delete layer.imageData;
        if (layer.mask)
            delete layer.mask.canvas;
        if (layer.mask)
            delete layer.mask.imageData;
        (_a = layer.children) === null || _a === void 0 ? void 0 : _a.forEach(clearCanvasFields);
    }
}
/// Engine data 2 experiments
// /test/engineData2.json:1109 is character codes
var keysColor = {
    '0': {
        uproot: true,
        children: {
            '0': { name: 'Type' },
            '1': { name: 'Values' },
        },
    },
};
var keysStyleSheet = {
    '0': { name: 'Font' },
    '1': { name: 'FontSize' },
    '2': { name: 'FauxBold' },
    '3': { name: 'FauxItalic' },
    '4': { name: 'AutoLeading' },
    '5': { name: 'Leading' },
    '6': { name: 'HorizontalScale' },
    '7': { name: 'VerticalScale' },
    '8': { name: 'Tracking' },
    '9': { name: 'BaselineShift' },
    '11': { name: 'Kerning?' },
    '12': { name: 'FontCaps' },
    '13': { name: 'FontBaseline' },
    '15': { name: 'Strikethrough?' },
    '16': { name: 'Underline?' },
    '18': { name: 'Ligatures' },
    '19': { name: 'DLigatures' },
    '23': { name: 'Fractions' },
    '24': { name: 'Ordinals' },
    '28': { name: 'StylisticAlternates' },
    '30': { name: 'OldStyle?' },
    '35': { name: 'BaselineDirection' },
    '38': { name: 'Language' },
    '52': { name: 'NoBreak' },
    '53': { name: 'FillColor', children: keysColor },
};
var keysParagraph = {
    '0': { name: 'Justification' },
    '1': { name: 'FirstLineIndent' },
    '2': { name: 'StartIndent' },
    '3': { name: 'EndIndent' },
    '4': { name: 'SpaceBefore' },
    '5': { name: 'SpaceAfter' },
    '7': { name: 'AutoLeading' },
    '9': { name: 'AutoHyphenate' },
    '10': { name: 'HyphenatedWordSize' },
    '11': { name: 'PreHyphen' },
    '12': { name: 'PostHyphen' },
    '13': { name: 'ConsecutiveHyphens?' },
    '14': { name: 'Zone' },
    '15': { name: 'HypenateCapitalizedWords' },
    '17': { name: 'WordSpacing' },
    '18': { name: 'LetterSpacing' },
    '19': { name: 'GlyphSpacing' },
    '32': { name: 'StyleSheet', children: keysStyleSheet },
};
var keysStyleSheetData = {
    name: 'StyleSheetData',
    children: keysStyleSheet,
};
var keys = {
    '0': {
        name: 'ResourceDict',
        children: {
            '1': {
                name: 'FontSet',
                children: {
                    '0': {
                        uproot: true,
                        children: {
                            '0': {
                                uproot: true,
                                children: {
                                    '0': {
                                        uproot: true,
                                        children: {
                                            '0': { name: 'Name' },
                                            '2': { name: 'FontType' },
                                        },
                                    },
                                },
                            }
                        },
                    },
                },
            },
            '2': {
                name: '2',
                children: {},
            },
            '3': {
                name: 'MojiKumiSet',
                children: {
                    '0': {
                        uproot: true,
                        children: {
                            '0': {
                                uproot: true,
                                children: {
                                    '0': { name: 'InternalName' },
                                },
                            },
                        },
                    },
                },
            },
            '4': {
                name: 'KinsokuSet',
                children: {
                    '0': {
                        uproot: true,
                        children: {
                            '0': {
                                uproot: true,
                                children: {
                                    '0': { name: 'Name' },
                                    '5': {
                                        uproot: true,
                                        children: {
                                            '0': { name: 'NoStart' },
                                            '1': { name: 'NoEnd' },
                                            '2': { name: 'Keep' },
                                            '3': { name: 'Hanging' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '5': {
                name: 'StyleSheetSet',
                children: {
                    '0': {
                        uproot: true,
                        children: {
                            '0': {
                                uproot: true,
                                children: {
                                    '0': { name: 'Name' },
                                    '6': keysStyleSheetData,
                                },
                            },
                        },
                    },
                },
            },
            '6': {
                name: 'ParagraphSheetSet',
                children: {
                    '0': {
                        uproot: true,
                        children: {
                            '0': {
                                uproot: true,
                                children: {
                                    '0': { name: 'Name' },
                                    '5': {
                                        name: 'Properties',
                                        children: keysParagraph,
                                    },
                                    '6': { name: 'DefaultStyleSheet' },
                                },
                            },
                        },
                    },
                },
            },
            '8': {
                name: '8',
                children: {},
            },
            '9': {
                name: 'Predefined',
                children: {},
            },
        },
    },
    '1': {
        name: 'EngineDict',
        children: {
            '0': {
                name: '0',
                children: {
                    '0': {
                        name: '0',
                        children: {},
                    },
                    '3': { name: 'SuperscriptSize' },
                    '4': { name: 'SuperscriptPosition' },
                    '5': { name: 'SubscriptSize' },
                    '6': { name: 'SubscriptPosition' },
                    '7': { name: 'SmallCapSize' },
                    '8': { name: 'UseFractionalGlyphWidths' }, // ???
                },
            },
            '1': {
                name: 'Editors?',
                children: {
                    '0': {
                        name: 'Editor',
                        children: {
                            '0': { name: 'Text' },
                            '5': {
                                name: 'ParagraphRun',
                                children: {
                                    '0': {
                                        name: 'RunArray',
                                        children: {
                                            '0': {
                                                name: 'ParagraphSheet',
                                                children: {
                                                    '0': {
                                                        uproot: true,
                                                        children: {
                                                            '0': { name: '0' },
                                                            '5': {
                                                                name: '5',
                                                                children: keysParagraph,
                                                            },
                                                            '6': { name: '6' },
                                                        },
                                                    },
                                                },
                                            },
                                            '1': { name: 'RunLength' },
                                        },
                                    },
                                },
                            },
                            '6': {
                                name: 'StyleRun',
                                children: {
                                    '0': {
                                        name: 'RunArray',
                                        children: {
                                            '0': {
                                                name: 'StyleSheet',
                                                children: {
                                                    '0': {
                                                        uproot: true,
                                                        children: {
                                                            '6': keysStyleSheetData,
                                                        },
                                                    },
                                                },
                                            },
                                            '1': { name: 'RunLength' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '1': {
                        name: 'FontVectorData ???',
                    },
                },
            },
            '2': {
                name: 'StyleSheet',
                children: keysStyleSheet,
            },
            '3': {
                name: 'ParagraphSheet',
                children: keysParagraph,
            },
        },
    },
};
function decodeObj(obj, keys) {
    if (obj === null || !keys)
        return obj;
    if (Array.isArray(obj)) {
        return obj.map(function (x) { return decodeObj(x, keys); });
    }
    if (typeof obj !== 'object')
        return obj;
    var result = {};
    for (var _i = 0, _a = Object.keys(obj); _i < _a.length; _i++) {
        var key = _a[_i];
        if (keys[key]) {
            if (keys[key].uproot) {
                return decodeObj(obj[key], keys[key].children);
            }
            else {
                result[keys[key].name] = decodeObj(obj[key], keys[key].children);
            }
        }
        else {
            result[key] = obj[key];
        }
    }
    return result;
}
function decodeEngineData2(data) {
    return decodeObj(data, keys);
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUNqRTtTQUNEO2FBQU07WUFDTixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3ZCO0tBQ0Q7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLElBQVM7SUFDbkMsT0FBTyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzlCLENBQUMiLCJmaWxlIjoidGVzdC9wc2RSZWFkZXIuc3BlYy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBleHBlY3QgfSBmcm9tICdjaGFpJztcbmltcG9ydCB7XG5cdHJlYWRQc2RGcm9tRmlsZSwgaW1wb3J0UFNELCBsb2FkSW1hZ2VzRnJvbURpcmVjdG9yeSwgY29tcGFyZUNhbnZhc2VzLCBzYXZlQ2FudmFzLFxuXHRjcmVhdGVSZWFkZXJGcm9tQnVmZmVyLCBjb21wYXJlQnVmZmVycywgY29tcGFyZVR3b0ZpbGVzXG59IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7IExheWVyLCBSZWFkT3B0aW9ucywgUHNkIH0gZnJvbSAnLi4vcHNkJztcbmltcG9ydCB7IHJlYWRQc2QsIHdyaXRlUHNkQnVmZmVyIH0gZnJvbSAnLi4vaW5kZXgnO1xuaW1wb3J0IHsgcmVhZFBzZCBhcyByZWFkUHNkSW50ZXJuYWwgfSBmcm9tICcuLi9wc2RSZWFkZXInO1xuXG5jb25zdCB0ZXN0RmlsZXNQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ3Rlc3QnKTtcbmNvbnN0IHJlYWRGaWxlc1BhdGggPSBwYXRoLmpvaW4odGVzdEZpbGVzUGF0aCwgJ3JlYWQnKTtcbmNvbnN0IHJlYWRXcml0ZUZpbGVzUGF0aCA9IHBhdGguam9pbih0ZXN0RmlsZXNQYXRoLCAncmVhZC13cml0ZScpO1xuY29uc3QgcmVzdWx0c0ZpbGVzUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICcuLicsICdyZXN1bHRzJyk7XG5jb25zdCBvcHRzOiBSZWFkT3B0aW9ucyA9IHtcblx0dGhyb3dGb3JNaXNzaW5nRmVhdHVyZXM6IHRydWUsXG5cdGxvZ01pc3NpbmdGZWF0dXJlczogdHJ1ZSxcbn07XG5cbmRlc2NyaWJlKCdQc2RSZWFkZXInLCAoKSA9PiB7XG5cdGl0KCdyZWFkcyB3aWR0aCBhbmQgaGVpZ2h0IHByb3Blcmx5JywgKCkgPT4ge1xuXHRcdGNvbnN0IHBzZCA9IHJlYWRQc2RGcm9tRmlsZShwYXRoLmpvaW4ocmVhZEZpbGVzUGF0aCwgJ2JsZW5kLW1vZGUnLCAnc3JjLnBzZCcpLCB7IC4uLm9wdHMgfSk7XG5cdFx0ZXhwZWN0KHBzZC53aWR0aCkuZXF1YWwoMzAwKTtcblx0XHRleHBlY3QocHNkLmhlaWdodCkuZXF1YWwoMjAwKTtcblx0fSk7XG5cblx0aXQoJ3NraXBzIGNvbXBvc2l0ZSBpbWFnZSBkYXRhJywgKCkgPT4ge1xuXHRcdGNvbnN0IHBzZCA9IHJlYWRQc2RGcm9tRmlsZShwYXRoLmpvaW4ocmVhZEZpbGVzUGF0aCwgJ2xheWVycycsICdzcmMucHNkJyksIHsgLi4ub3B0cywgc2tpcENvbXBvc2l0ZUltYWdlRGF0YTogdHJ1ZSB9KTtcblx0XHRleHBlY3QocHNkLmNhbnZhcykubm90Lm9rO1xuXHR9KTtcblxuXHRpdCgnc2tpcHMgbGF5ZXIgaW1hZ2UgZGF0YScsICgpID0+IHtcblx0XHRjb25zdCBwc2QgPSByZWFkUHNkRnJvbUZpbGUocGF0aC5qb2luKHJlYWRGaWxlc1BhdGgsICdsYXllcnMnLCAnc3JjLnBzZCcpLCB7IC4uLm9wdHMsIHNraXBMYXllckltYWdlRGF0YTogdHJ1ZSB9KTtcblx0XHRleHBlY3QocHNkLmNoaWxkcmVuIVswXS5jYW52YXMpLm5vdC5vaztcblx0fSk7XG5cblx0aXQoJ3JlYWRzIFBTRCBmcm9tIEJ1ZmZlciB3aXRoIG9mZnNldCcsICgpID0+IHtcblx0XHRjb25zdCBmaWxlID0gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihyZWFkRmlsZXNQYXRoLCAnbGF5ZXJzJywgJ3NyYy5wc2QnKSk7XG5cdFx0Y29uc3Qgb3V0ZXIgPSBCdWZmZXIuYWxsb2MoZmlsZS5ieXRlTGVuZ3RoICsgMTAwKTtcblx0XHRmaWxlLmNvcHkob3V0ZXIsIDEwMCk7XG5cdFx0Y29uc3QgaW5uZXIgPSBCdWZmZXIuZnJvbShvdXRlci5idWZmZXIsIDEwMCwgZmlsZS5ieXRlTGVuZ3RoKTtcblxuXHRcdGNvbnN0IHBzZCA9IHJlYWRQc2QoaW5uZXIsIG9wdHMpO1xuXG5cdFx0ZXhwZWN0KHBzZC53aWR0aCkuZXF1YWwoMzAwKTtcblx0fSk7XG5cblx0aXQuc2tpcCgnZHVwbGljYXRlIHNtYXJ0JywgKCkgPT4ge1xuXHRcdGNvbnN0IHBzZCA9IHJlYWRQc2RGcm9tRmlsZShwYXRoLmpvaW4oJ3Jlc291cmNlcycsICdzcmMucHNkJyksIHsgLi4ub3B0cyB9KTtcblxuXHRcdGNvbnN0IGNoaWxkID0gcHNkLmNoaWxkcmVuIVsxXS5jaGlsZHJlbiFbMF07XG5cdFx0cHNkLmNoaWxkcmVuIVsxXS5jaGlsZHJlbiEucHVzaChjaGlsZCk7XG5cblx0XHQvLyBjb25zdCBjaGlsZCA9IHBzZC5jaGlsZHJlbiFbMF07XG5cdFx0Ly8gZGVsZXRlIGNoaWxkLmlkO1xuXHRcdC8vIHBzZC5jaGlsZHJlbiEucHVzaChjaGlsZCk7XG5cblx0XHRmcy53cml0ZUZpbGVTeW5jKCdvdXRwdXQucHNkJywgd3JpdGVQc2RCdWZmZXIocHNkLCB7XG5cdFx0XHR0cmltSW1hZ2VEYXRhOiBmYWxzZSxcblx0XHRcdGdlbmVyYXRlVGh1bWJuYWlsOiB0cnVlLFxuXHRcdFx0bm9CYWNrZ3JvdW5kOiB0cnVlXG5cdFx0fSkpO1xuXG5cdFx0Y29uc3QgcHNkMiA9IHJlYWRQc2RGcm9tRmlsZShwYXRoLmpvaW4oJ291dHB1dC5wc2QnKSwgeyAuLi5vcHRzIH0pO1xuXG5cdFx0Y29uc29sZS5sb2cocHNkMi53aWR0aCk7XG5cdH0pO1xuXG5cdC8vIHNraXBwaW5nIFwicGF0dGVyblwiIHRlc3QgYmVjYXVzZSBpdCByZXF1aXJlcyB6aXAgY2ltcHJlc3Npb24gb2YgcGF0dGVybnNcblx0Ly8gc2tpcHBpbmcgXCJjbXlrXCIgdGVzdCBiZWNhdXNlIHdlIGNhbid0IGNvbnZlcnQgQ01ZSyB0byBSR0Jcblx0ZnMucmVhZGRpclN5bmMocmVhZEZpbGVzUGF0aCkuZmlsdGVyKGYgPT4gIS9wYXR0ZXJufGNteWsvLnRlc3QoZikpLmZvckVhY2goZiA9PiB7XG5cdFx0Ly8gZnMucmVhZGRpclN5bmMocmVhZEZpbGVzUGF0aCkuZmlsdGVyKGYgPT4gL2tyaXRhLy50ZXN0KGYpKS5mb3JFYWNoKGYgPT4ge1xuXHRcdGl0KGByZWFkcyBQU0QgZmlsZSAoJHtmfSlgLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBiYXNlUGF0aCA9IHBhdGguam9pbihyZWFkRmlsZXNQYXRoLCBmKTtcblx0XHRcdGNvbnN0IGZpbGVOYW1lID0gZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oYmFzZVBhdGgsICdzcmMucHNiJykpID8gJ3NyYy5wc2InIDogJ3NyYy5wc2QnO1xuXHRcdFx0Y29uc3QgcHNkID0gcmVhZFBzZEZyb21GaWxlKHBhdGguam9pbihiYXNlUGF0aCwgZmlsZU5hbWUpLCB7IC4uLm9wdHMgfSk7XG5cdFx0XHRjb25zdCBleHBlY3RlZCA9IGltcG9ydFBTRChiYXNlUGF0aCk7XG5cdFx0XHRjb25zdCBpbWFnZXMgPSBsb2FkSW1hZ2VzRnJvbURpcmVjdG9yeShiYXNlUGF0aCk7XG5cdFx0XHRjb25zdCBjb21wYXJlOiB7IG5hbWU6IHN0cmluZzsgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCB8IHVuZGVmaW5lZDsgc2tpcD86IGJvb2xlYW47IH1bXSA9IFtdO1xuXHRcdFx0Y29uc3QgY29tcGFyZUZpbGVzOiB7IG5hbWU6IHN0cmluZzsgZGF0YTogVWludDhBcnJheTsgfVtdID0gW107XG5cblx0XHRcdGNvbXBhcmUucHVzaCh7IG5hbWU6IGBjYW52YXMucG5nYCwgY2FudmFzOiBwc2QuY2FudmFzIH0pO1xuXHRcdFx0cHNkLmNhbnZhcyA9IHVuZGVmaW5lZDtcblx0XHRcdGRlbGV0ZSBwc2QuaW1hZ2VEYXRhO1xuXHRcdFx0ZGVsZXRlIHBzZC5pbWFnZVJlc291cmNlcyEueG1wTWV0YWRhdGE7XG5cblx0XHRcdGxldCBpID0gMDtcblxuXHRcdFx0ZnVuY3Rpb24gcHVzaExheWVyQ2FudmFzZXMobGF5ZXJzOiBMYXllcltdKSB7XG5cdFx0XHRcdGZvciAoY29uc3QgbCBvZiBsYXllcnMpIHtcblx0XHRcdFx0XHRjb25zdCBsYXllcklkID0gaTtcblxuXHRcdFx0XHRcdGlmICghbC5jaGlsZHJlbiB8fCBsLm1hc2spIGkrKztcblxuXHRcdFx0XHRcdGlmIChsLmNoaWxkcmVuKSB7XG5cdFx0XHRcdFx0XHRwdXNoTGF5ZXJDYW52YXNlcyhsLmNoaWxkcmVuKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y29tcGFyZS5wdXNoKHsgbmFtZTogYGxheWVyLSR7bGF5ZXJJZH0ucG5nYCwgY2FudmFzOiBsLmNhbnZhcyB9KTtcblx0XHRcdFx0XHRcdGwuY2FudmFzID0gdW5kZWZpbmVkO1xuXHRcdFx0XHRcdFx0ZGVsZXRlIGwuaW1hZ2VEYXRhO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChsLm1hc2spIHtcblx0XHRcdFx0XHRcdGNvbXBhcmUucHVzaCh7IG5hbWU6IGBsYXllci0ke2xheWVySWR9LW1hc2sucG5nYCwgY2FudmFzOiBsLm1hc2suY2FudmFzIH0pO1xuXHRcdFx0XHRcdFx0ZGVsZXRlIGwubWFzay5jYW52YXM7XG5cdFx0XHRcdFx0XHRkZWxldGUgbC5tYXNrLmltYWdlRGF0YTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKHBzZC5saW5rZWRGaWxlcykge1xuXHRcdFx0XHRmb3IgKGNvbnN0IGZpbGUgb2YgcHNkLmxpbmtlZEZpbGVzKSB7XG5cdFx0XHRcdFx0aWYgKGZpbGUuZGF0YSkge1xuXHRcdFx0XHRcdFx0Y29tcGFyZUZpbGVzLnB1c2goeyBuYW1lOiBmaWxlLm5hbWUsIGRhdGE6IGZpbGUuZGF0YSB9KTtcblx0XHRcdFx0XHRcdGRlbGV0ZSBmaWxlLmRhdGE7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHB1c2hMYXllckNhbnZhc2VzKHBzZC5jaGlsZHJlbiB8fCBbXSk7XG5cdFx0XHRmcy5ta2RpclN5bmMocGF0aC5qb2luKHJlc3VsdHNGaWxlc1BhdGgsIGYpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuXHRcdFx0aWYgKHBzZC5pbWFnZVJlc291cmNlcz8udGh1bWJuYWlsKSB7XG5cdFx0XHRcdGNvbXBhcmUucHVzaCh7IG5hbWU6ICd0aHVtYi5wbmcnLCBjYW52YXM6IHBzZC5pbWFnZVJlc291cmNlcy50aHVtYm5haWwsIHNraXA6IHRydWUgfSk7XG5cdFx0XHRcdGRlbGV0ZSBwc2QuaW1hZ2VSZXNvdXJjZXMudGh1bWJuYWlsO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocHNkLmltYWdlUmVzb3VyY2VzKSBkZWxldGUgcHNkLmltYWdlUmVzb3VyY2VzLnRodW1ibmFpbFJhdztcblxuXHRcdFx0Y29tcGFyZS5mb3JFYWNoKGkgPT4gc2F2ZUNhbnZhcyhwYXRoLmpvaW4ocmVzdWx0c0ZpbGVzUGF0aCwgZiwgaS5uYW1lKSwgaS5jYW52YXMpKTtcblx0XHRcdGNvbXBhcmVGaWxlcy5mb3JFYWNoKGkgPT4gZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ocmVzdWx0c0ZpbGVzUGF0aCwgZiwgaS5uYW1lKSwgaS5kYXRhKSk7XG5cblx0XHRcdGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKHJlc3VsdHNGaWxlc1BhdGgsIGYsICdkYXRhLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkocHNkLCBudWxsLCAyKSwgJ3V0ZjgnKTtcblxuXHRcdFx0Y2xlYXJFbXB0eUNhbnZhc0ZpZWxkcyhwc2QpO1xuXHRcdFx0Y2xlYXJFbXB0eUNhbnZhc0ZpZWxkcyhleHBlY3RlZCk7XG5cblx0XHRcdGV4cGVjdChwc2QpLmVxbChleHBlY3RlZCwgZik7XG5cdFx0XHRjb21wYXJlLmZvckVhY2goaSA9PiBpLnNraXAgfHwgY29tcGFyZUNhbnZhc2VzKGltYWdlc1tpLm5hbWVdLCBpLmNhbnZhcywgYCR7Zn0vJHtpLm5hbWV9YCkpO1xuXHRcdFx0Y29tcGFyZUZpbGVzLmZvckVhY2goaSA9PiBjb21wYXJlVHdvRmlsZXMocGF0aC5qb2luKGJhc2VQYXRoLCBpLm5hbWUpLCBpLmRhdGEsIGAke2Z9LyR7aS5uYW1lfWApKTtcblx0XHR9KTtcblx0fSk7XG5cblx0ZnMucmVhZGRpclN5bmMocmVhZFdyaXRlRmlsZXNQYXRoKS5mb3JFYWNoKGYgPT4ge1xuXHRcdC8vIGZzLnJlYWRkaXJTeW5jKHJlYWRXcml0ZUZpbGVzUGF0aCkuZmlsdGVyKGYgPT4gL150ZXN0JC8udGVzdChmKSkuZm9yRWFjaChmID0+IHtcblx0XHRpdChgcmVhZHMtd3JpdGVzIFBTRCBmaWxlICgke2Z9KWAsICgpID0+IHtcblx0XHRcdGNvbnN0IGV4dCA9IGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKHJlYWRXcml0ZUZpbGVzUGF0aCwgZiwgJ3NyYy5wc2InKSkgPyAncHNiJyA6ICdwc2QnO1xuXHRcdFx0Y29uc3QgcHNkID0gcmVhZFBzZEZyb21GaWxlKHBhdGguam9pbihyZWFkV3JpdGVGaWxlc1BhdGgsIGYsIGBzcmMuJHtleHR9YCksIHtcblx0XHRcdFx0Li4ub3B0cywgdXNlSW1hZ2VEYXRhOiB0cnVlLCB1c2VSYXdUaHVtYm5haWw6IHRydWUsIHRocm93Rm9yTWlzc2luZ0ZlYXR1cmVzOiB0cnVlXG5cdFx0XHR9KTtcblx0XHRcdGNvbnN0IGFjdHVhbCA9IHdyaXRlUHNkQnVmZmVyKHBzZCwgeyBsb2dNaXNzaW5nRmVhdHVyZXM6IHRydWUsIHBzYjogZXh0ID09PSAncHNiJyB9KTtcblx0XHRcdGNvbnN0IGV4cGVjdGVkID0gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihyZWFkV3JpdGVGaWxlc1BhdGgsIGYsIGBleHBlY3RlZC4ke2V4dH1gKSk7XG5cdFx0XHRmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihyZXN1bHRzRmlsZXNQYXRoLCBgcmVhZC13cml0ZS0ke2Z9LiR7ZXh0fWApLCBhY3R1YWwpO1xuXHRcdFx0ZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ocmVzdWx0c0ZpbGVzUGF0aCwgYHJlYWQtd3JpdGUtJHtmfS5iaW5gKSwgYWN0dWFsKTtcblx0XHRcdC8vIGNvbnNvbGUubG9nKHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KHBzZCwgZmFsc2UsIDk5LCB0cnVlKSk7XG5cblx0XHRcdC8vIGNvbnN0IHBzZDIgPSByZWFkUHNkRnJvbUZpbGUocGF0aC5qb2luKHJlc3VsdHNGaWxlc1BhdGgsIGByZWFkLXdyaXRlLSR7Zn0ucHNkYCksIHsgLi4ub3B0cywgdXNlSW1hZ2VEYXRhOiB0cnVlLCB1c2VSYXdUaHVtYm5haWw6IHRydWUgfSk7XG5cdFx0XHQvLyBmcy53cml0ZUZpbGVTeW5jKCd0ZW1wLnR4dCcsIHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KHBzZCwgZmFsc2UsIDk5LCBmYWxzZSksICd1dGY4Jyk7XG5cdFx0XHQvLyBmcy53cml0ZUZpbGVTeW5jKCd0ZW1wMi50eHQnLCByZXF1aXJlKCd1dGlsJykuaW5zcGVjdChwc2QyLCBmYWxzZSwgOTksIGZhbHNlKSwgJ3V0ZjgnKTtcblxuXHRcdFx0Y29tcGFyZUJ1ZmZlcnMoYWN0dWFsLCBleHBlY3RlZCwgYHJlYWQtd3JpdGUtJHtmfWAsIDB4MCk7XG5cdFx0fSk7XG5cdH0pO1xuXG5cdGl0LnNraXAoJ3dyaXRlIHRleHQgbGF5ZXIgdGVzdCcsICgpID0+IHtcblx0XHRjb25zdCBwc2Q6IFBzZCA9IHtcblx0XHRcdHdpZHRoOiAyMDAsXG5cdFx0XHRoZWlnaHQ6IDIwMCxcblx0XHRcdGNoaWxkcmVuOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRuYW1lOiAndGV4dCBsYXllcicsXG5cdFx0XHRcdFx0dGV4dDoge1xuXHRcdFx0XHRcdFx0dGV4dDogJ0hlbGxvIFdvcmxkXFxu4oCiIGMg4oCiIHRpbnkhXFxyXFxudGVzdCcsXG5cdFx0XHRcdFx0XHQvLyBvcmllbnRhdGlvbjogJ3ZlcnRpY2FsJyxcblx0XHRcdFx0XHRcdHRyYW5zZm9ybTogWzEsIDAsIDAsIDEsIDcwLCA3MF0sXG5cdFx0XHRcdFx0XHRzdHlsZToge1xuXHRcdFx0XHRcdFx0XHRmb250OiB7IG5hbWU6ICdBcmlhbE1UJyB9LFxuXHRcdFx0XHRcdFx0XHRmb250U2l6ZTogMzAsXG5cdFx0XHRcdFx0XHRcdGZpbGxDb2xvcjogeyByOiAwLCBnOiAxMjgsIGI6IDAgfSxcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRzdHlsZVJ1bnM6IFtcblx0XHRcdFx0XHRcdFx0eyBsZW5ndGg6IDEyLCBzdHlsZTogeyBmaWxsQ29sb3I6IHsgcjogMjU1LCBnOiAwLCBiOiAwIH0gfSB9LFxuXHRcdFx0XHRcdFx0XHR7IGxlbmd0aDogMTIsIHN0eWxlOiB7IGZpbGxDb2xvcjogeyByOiAwLCBnOiAwLCBiOiAyNTUgfSB9IH0sXG5cdFx0XHRcdFx0XHRcdHsgbGVuZ3RoOiA0LCBzdHlsZTogeyB1bmRlcmxpbmU6IHRydWUgfSB9LFxuXHRcdFx0XHRcdFx0XSxcblx0XHRcdFx0XHRcdHBhcmFncmFwaFN0eWxlOiB7XG5cdFx0XHRcdFx0XHRcdGp1c3RpZmljYXRpb246ICdjZW50ZXInLFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdHdhcnA6IHtcblx0XHRcdFx0XHRcdFx0c3R5bGU6ICdhcmMnLFxuXHRcdFx0XHRcdFx0XHR2YWx1ZTogNTAsXG5cdFx0XHRcdFx0XHRcdHBlcnNwZWN0aXZlOiAwLFxuXHRcdFx0XHRcdFx0XHRwZXJzcGVjdGl2ZU90aGVyOiAwLFxuXHRcdFx0XHRcdFx0XHRyb3RhdGU6ICdob3Jpem9udGFsJyxcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdG5hbWU6ICcybmQgbGF5ZXInLFxuXHRcdFx0XHRcdHRleHQ6IHtcblx0XHRcdFx0XHRcdHRleHQ6ICdBYWFhYScsXG5cdFx0XHRcdFx0XHR0cmFuc2Zvcm06IFsxLCAwLCAwLCAxLCA3MCwgNzBdLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH07XG5cblx0XHRmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihyZXN1bHRzRmlsZXNQYXRoLCAnX1RFWFQyLnBzZCcpLCB3cml0ZVBzZEJ1ZmZlcihwc2QsIHsgbG9nTWlzc2luZ0ZlYXR1cmVzOiB0cnVlIH0pKTtcblx0fSk7XG5cblx0aXQuc2tpcCgncmVhZCB0ZXh0IGxheWVyIHRlc3QnLCAoKSA9PiB7XG5cdFx0Y29uc3QgcHNkID0gcmVhZFBzZEZyb21GaWxlKHBhdGguam9pbih0ZXN0RmlsZXNQYXRoLCAndGV4dC10ZXN0LnBzZCcpLCBvcHRzKTtcblx0XHQvLyBjb25zdCBsYXllciA9IHBzZC5jaGlsZHJlbiFbMV07XG5cblx0XHQvLyBsYXllci50ZXh0IS50ZXh0ID0gJ0ZvbyBiYXInO1xuXHRcdGNvbnN0IGJ1ZmZlciA9IHdyaXRlUHNkQnVmZmVyKHBzZCwgeyBsb2dNaXNzaW5nRmVhdHVyZXM6IHRydWUgfSk7XG5cdFx0ZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ocmVzdWx0c0ZpbGVzUGF0aCwgJ19URVhULnBzZCcpLCBidWZmZXIpO1xuXG5cdFx0Ly8gY29uc29sZS5sb2cocmVxdWlyZSgndXRpbCcpLmluc3BlY3QocHNkLmNoaWxkcmVuIVswXS50ZXh0LCBmYWxzZSwgOTksIHRydWUpKTtcblx0XHQvLyBjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChwc2QuY2hpbGRyZW4hWzFdLnRleHQsIGZhbHNlLCA5OSwgdHJ1ZSkpO1xuXHRcdC8vIGNvbnNvbGUubG9nKHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KHBzZC5lbmdpbmVEYXRhLCBmYWxzZSwgOTksIHRydWUpKTtcblx0fSk7XG5cblx0aXQuc2tpcCgnUkVBRCBURVNUJywgKCkgPT4ge1xuXHRcdGNvbnN0IG9yaWdpbmFsQnVmZmVyID0gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbih0ZXN0RmlsZXNQYXRoLCAndGVzdC5wc2QnKSk7XG5cblx0XHRjb25zb2xlLmxvZygnUkVBRElORyBPUklHSU5BTCcpO1xuXHRcdGNvbnN0IG9wdHMgPSB7XG5cdFx0XHRsb2dNaXNzaW5nRmVhdHVyZXM6IHRydWUsXG5cdFx0XHR0aHJvd0Zvck1pc3NpbmdGZWF0dXJlczogdHJ1ZSxcblx0XHRcdHVzZUltYWdlRGF0YTogdHJ1ZSxcblx0XHRcdHVzZVJhd1RodW1ibmFpbDogdHJ1ZSxcblx0XHRcdGxvZ0RldkZlYXR1cmVzOiB0cnVlLFxuXHRcdH07XG5cdFx0Y29uc3Qgb3JpZ2luYWxQc2QgPSByZWFkUHNkSW50ZXJuYWwoY3JlYXRlUmVhZGVyRnJvbUJ1ZmZlcihvcmlnaW5hbEJ1ZmZlciksIG9wdHMpO1xuXG5cdFx0Y29uc29sZS5sb2coJ1dSSVRJTkcnKTtcblx0XHRjb25zdCBidWZmZXIgPSB3cml0ZVBzZEJ1ZmZlcihvcmlnaW5hbFBzZCwgeyBsb2dNaXNzaW5nRmVhdHVyZXM6IHRydWUgfSk7XG5cdFx0ZnMud3JpdGVGaWxlU3luYygndGVtcC5wc2QnLCBidWZmZXIpO1xuXHRcdC8vIGZzLndyaXRlRmlsZVN5bmMoJ3RlbXAuYmluJywgYnVmZmVyKTtcblx0XHQvLyBmcy53cml0ZUZpbGVTeW5jKCd0ZW1wLmpzb24nLCBKU09OLnN0cmluZ2lmeShvcmlnaW5hbFBzZCwgbnVsbCwgMiksICd1dGY4Jyk7XG5cdFx0Ly8gZnMud3JpdGVGaWxlU3luYygndGVtcC54bWwnLCBvcmlnaW5hbFBzZC5pbWFnZVJlc291cmNlcz8ueG1wTWV0YWRhdGEsICd1dGY4Jyk7XG5cblx0XHRjb25zb2xlLmxvZygnUkVBRElORyBXUklUVEVOJyk7XG5cdFx0Y29uc3QgcHNkID0gcmVhZFBzZEludGVybmFsKFxuXHRcdFx0Y3JlYXRlUmVhZGVyRnJvbUJ1ZmZlcihidWZmZXIpLCB7IGxvZ01pc3NpbmdGZWF0dXJlczogdHJ1ZSwgdGhyb3dGb3JNaXNzaW5nRmVhdHVyZXM6IHRydWUgfSk7XG5cblx0XHRjbGVhckNhbnZhc0ZpZWxkcyhvcmlnaW5hbFBzZCk7XG5cdFx0Y2xlYXJDYW52YXNGaWVsZHMocHNkKTtcblx0XHRkZWxldGUgb3JpZ2luYWxQc2QuaW1hZ2VSZXNvdXJjZXMhLnRodW1ibmFpbDtcblx0XHRkZWxldGUgcHNkLmltYWdlUmVzb3VyY2VzIS50aHVtYm5haWw7XG5cdFx0ZGVsZXRlIG9yaWdpbmFsUHNkLmltYWdlUmVzb3VyY2VzIS50aHVtYm5haWxSYXc7XG5cdFx0ZGVsZXRlIHBzZC5pbWFnZVJlc291cmNlcyEudGh1bWJuYWlsUmF3O1xuXHRcdC8vIGNvbnNvbGUubG9nKHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KG9yaWdpbmFsUHNkLCBmYWxzZSwgOTksIHRydWUpKTtcblxuXHRcdC8vIGZzLndyaXRlRmlsZVN5bmMoJ29yaWdpbmFsLmpzb24nLCBKU09OLnN0cmluZ2lmeShvcmlnaW5hbFBzZCwgbnVsbCwgMikpO1xuXHRcdC8vIGZzLndyaXRlRmlsZVN5bmMoJ2FmdGVyLmpzb24nLCBKU09OLnN0cmluZ2lmeShwc2QsIG51bGwsIDIpKTtcblxuXHRcdGNvbXBhcmVCdWZmZXJzKGJ1ZmZlciwgb3JpZ2luYWxCdWZmZXIsICd0ZXN0Jyk7XG5cblx0XHRleHBlY3QocHNkKS5lcWwob3JpZ2luYWxQc2QpO1xuXHR9KTtcblxuXHRpdC5za2lwKCdkZWNvZGUgZW5naW5lIGRhdGEgMicsICgpID0+IHtcblx0XHQvLyBjb25zdCBmaWxlRGF0YSA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAncmVzb3VyY2VzJywgJ2VuZ2luZURhdGEyVmVydGljYWwudHh0JykpO1xuXHRcdGNvbnN0IGZpbGVEYXRhID0gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICcuLicsICdyZXNvdXJjZXMnLCAnZW5naW5lRGF0YTJTaW1wbGUudHh0JykpO1xuXHRcdGNvbnN0IGZ1bmMgPSBuZXcgRnVuY3Rpb24oYHJldHVybiAke2ZpbGVEYXRhfTtgKTtcblx0XHRjb25zdCBkYXRhID0gZnVuYygpO1xuXHRcdGNvbnN0IHJlc3VsdCA9IGRlY29kZUVuZ2luZURhdGEyKGRhdGEpO1xuXHRcdGZzLndyaXRlRmlsZVN5bmMoXG5cdFx0XHRwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAncmVzb3VyY2VzJywgJ3RlbXAuanMnKSxcblx0XHRcdCd2YXIgeCA9ICcgKyByZXF1aXJlKCd1dGlsJykuaW5zcGVjdChyZXN1bHQsIGZhbHNlLCA5OSwgZmFsc2UpLCAndXRmOCcpO1xuXHR9KTtcblxuXHRpdC5za2lwKCd0ZXN0LnBzZCcsICgpID0+IHtcblx0XHRjb25zdCBidWZmZXIgPSBmcy5yZWFkRmlsZVN5bmMoJ3Rlc3QucHNkJyk7XG5cdFx0Y29uc3QgcHNkID0gcmVhZFBzZEludGVybmFsKGNyZWF0ZVJlYWRlckZyb21CdWZmZXIoYnVmZmVyKSwge1xuXHRcdFx0c2tpcENvbXBvc2l0ZUltYWdlRGF0YTogdHJ1ZSxcblx0XHRcdHNraXBMYXllckltYWdlRGF0YTogdHJ1ZSxcblx0XHRcdHNraXBUaHVtYm5haWw6IHRydWUsXG5cdFx0XHR0aHJvd0Zvck1pc3NpbmdGZWF0dXJlczogdHJ1ZSxcblx0XHRcdGxvZ0RldkZlYXR1cmVzOiB0cnVlLFxuXHRcdH0pO1xuXHRcdGRlbGV0ZSBwc2QuZW5naW5lRGF0YTtcblx0XHRwc2QuaW1hZ2VSZXNvdXJjZXMgPSB7fTtcblx0XHRjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChwc2QsIGZhbHNlLCA5OSwgdHJ1ZSkpO1xuXHR9KTtcblxuXHRpdC5za2lwKCd0ZXN0JywgKCkgPT4ge1xuXHRcdGNvbnN0IHBzZCA9IHJlYWRQc2RJbnRlcm5hbChjcmVhdGVSZWFkZXJGcm9tQnVmZmVyKGZzLnJlYWRGaWxlU3luYyhgdGVzdC9yZWFkLXdyaXRlL3RleHQtYm94L3NyYy5wc2RgKSksIHtcblx0XHRcdC8vIHNraXBDb21wb3NpdGVJbWFnZURhdGE6IHRydWUsXG5cdFx0XHQvLyBza2lwTGF5ZXJJbWFnZURhdGE6IHRydWUsXG5cdFx0XHQvLyBza2lwVGh1bWJuYWlsOiB0cnVlLFxuXHRcdFx0dGhyb3dGb3JNaXNzaW5nRmVhdHVyZXM6IHRydWUsXG5cdFx0XHRsb2dEZXZGZWF0dXJlczogdHJ1ZSxcblx0XHRcdHVzZVJhd1RodW1ibmFpbDogdHJ1ZSxcblx0XHR9KTtcblx0XHRmcy53cml0ZUZpbGVTeW5jKCd0ZXh0X3JlY3Rfb3V0LnBzZCcsIHdyaXRlUHNkQnVmZmVyKHBzZCwgeyBsb2dNaXNzaW5nRmVhdHVyZXM6IHRydWUgfSkpO1xuXHRcdGZzLndyaXRlRmlsZVN5bmMoJ3RleHRfcmVjdF9vdXQuYmluJywgd3JpdGVQc2RCdWZmZXIocHNkLCB7IGxvZ01pc3NpbmdGZWF0dXJlczogdHJ1ZSB9KSk7XG5cdFx0Ly8gY29uc3QgcHNkMiA9IHJlYWRQc2RJbnRlcm5hbChjcmVhdGVSZWFkZXJGcm9tQnVmZmVyKGZzLnJlYWRGaWxlU3luYyhgdGV4dF9yZWN0X291dC5wc2RgKSksIHtcblx0XHQvLyBcdC8vIHNraXBDb21wb3NpdGVJbWFnZURhdGE6IHRydWUsXG5cdFx0Ly8gXHQvLyBza2lwTGF5ZXJJbWFnZURhdGE6IHRydWUsXG5cdFx0Ly8gXHQvLyBza2lwVGh1bWJuYWlsOiB0cnVlLFxuXHRcdC8vIFx0dGhyb3dGb3JNaXNzaW5nRmVhdHVyZXM6IHRydWUsXG5cdFx0Ly8gXHRsb2dEZXZGZWF0dXJlczogdHJ1ZSxcblx0XHQvLyB9KTtcblx0XHQvLyBwc2QyO1xuXHRcdGNvbnN0IG9yaWdpbmFsID0gZnMucmVhZEZpbGVTeW5jKGB0ZXN0L3JlYWQtd3JpdGUvdGV4dC1ib3gvc3JjLnBzZGApO1xuXHRcdGNvbnN0IG91dHB1dCA9IGZzLnJlYWRGaWxlU3luYyhgdGV4dF9yZWN0X291dC5wc2RgKTtcblx0XHRjb21wYXJlQnVmZmVycyhvdXRwdXQsIG9yaWdpbmFsLCAnLScsIDB4NjVkOCk7IC8vICwgMHg4Y2U4LCAweDhmY2EgLSAweDhjZTgpO1xuXHR9KTtcblxuXHRpdC5za2lwKCdjb21wYXJlIHRlc3QnLCAoKSA9PiB7XG5cdFx0Zm9yIChjb25zdCBuYW1lIG9mIFsndGV4dF9wb2ludCcsICd0ZXh0X3JlY3QnXSkge1xuXHRcdFx0Y29uc3QgcHNkID0gcmVhZFBzZEludGVybmFsKGNyZWF0ZVJlYWRlckZyb21CdWZmZXIoZnMucmVhZEZpbGVTeW5jKGAke25hbWV9LnBzZGApKSwge1xuXHRcdFx0XHRza2lwQ29tcG9zaXRlSW1hZ2VEYXRhOiB0cnVlLFxuXHRcdFx0XHRza2lwTGF5ZXJJbWFnZURhdGE6IHRydWUsXG5cdFx0XHRcdHNraXBUaHVtYm5haWw6IHRydWUsXG5cdFx0XHRcdHRocm93Rm9yTWlzc2luZ0ZlYXR1cmVzOiB0cnVlLFxuXHRcdFx0XHRsb2dEZXZGZWF0dXJlczogdHJ1ZSxcblx0XHRcdH0pO1xuXHRcdFx0Ly8gcHNkLmltYWdlUmVzb3VyY2VzID0ge307XG5cdFx0XHRmcy53cml0ZUZpbGVTeW5jKGAke25hbWV9LnR4dGAsIHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KHBzZCwgZmFsc2UsIDk5LCBmYWxzZSksICd1dGY4Jyk7XG5cblx0XHRcdC8vIGNvbnN0IGVuZ2luZURhdGEgPSBwYXJzZUVuZ2luZURhdGEodG9CeXRlQXJyYXkocHNkLmVuZ2luZURhdGEhKSk7XG5cdFx0XHQvLyBmcy53cml0ZUZpbGVTeW5jKGAke25hbWV9X2VuZ2luZWRhdGEudHh0YCwgcmVxdWlyZSgndXRpbCcpLmluc3BlY3QoZW5naW5lRGF0YSwgZmFsc2UsIDk5LCBmYWxzZSksICd1dGY4Jyk7XG5cdFx0fVxuXHR9KTtcblxuXHRpdC5za2lwKCd0ZXh0LXJlcGxhY2UucHNkJywgKCkgPT4ge1xuXHRcdHtcblx0XHRcdGNvbnN0IGJ1ZmZlciA9IGZzLnJlYWRGaWxlU3luYygndGV4dC1yZXBsYWNlMi5wc2QnKTtcblx0XHRcdGNvbnN0IHBzZCA9IHJlYWRQc2RJbnRlcm5hbChjcmVhdGVSZWFkZXJGcm9tQnVmZmVyKGJ1ZmZlciksIHt9KTtcblx0XHRcdHBzZC5jaGlsZHJlbiFbMV0hLnRleHQhLnRleHQgPSAnRm9vIGJhcic7XG5cdFx0XHRjb25zdCBvdXRwdXQgPSB3cml0ZVBzZEJ1ZmZlcihwc2QsIHsgaW52YWxpZGF0ZVRleHRMYXllcnM6IHRydWUsIGxvZ01pc3NpbmdGZWF0dXJlczogdHJ1ZSB9KTtcblx0XHRcdGZzLndyaXRlRmlsZVN5bmMoJ291dC5wc2QnLCBvdXRwdXQpO1xuXHRcdH1cblxuXHRcdHtcblx0XHRcdGNvbnN0IGJ1ZmZlciA9IGZzLnJlYWRGaWxlU3luYygndGV4dC1yZXBsYWNlLnBzZCcpO1xuXHRcdFx0Y29uc3QgcHNkID0gcmVhZFBzZEludGVybmFsKGNyZWF0ZVJlYWRlckZyb21CdWZmZXIoYnVmZmVyKSwge1xuXHRcdFx0XHRza2lwQ29tcG9zaXRlSW1hZ2VEYXRhOiB0cnVlLFxuXHRcdFx0XHRza2lwTGF5ZXJJbWFnZURhdGE6IHRydWUsXG5cdFx0XHRcdHNraXBUaHVtYm5haWw6IHRydWUsXG5cdFx0XHRcdHRocm93Rm9yTWlzc2luZ0ZlYXR1cmVzOiB0cnVlLFxuXHRcdFx0XHRsb2dEZXZGZWF0dXJlczogdHJ1ZSxcblx0XHRcdH0pO1xuXHRcdFx0ZGVsZXRlIHBzZC5lbmdpbmVEYXRhO1xuXHRcdFx0cHNkLmltYWdlUmVzb3VyY2VzID0ge307XG5cdFx0XHRwc2QuY2hpbGRyZW4/LnNwbGljZSgwLCAxKTtcblx0XHRcdGZzLndyaXRlRmlsZVN5bmMoJ2lucHV0LnR4dCcsIHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KHBzZCwgZmFsc2UsIDk5LCBmYWxzZSksICd1dGY4Jyk7XG5cdFx0fVxuXG5cdFx0e1xuXHRcdFx0Y29uc3QgYnVmZmVyID0gZnMucmVhZEZpbGVTeW5jKCdvdXQucHNkJyk7XG5cdFx0XHRjb25zdCBwc2QgPSByZWFkUHNkSW50ZXJuYWwoY3JlYXRlUmVhZGVyRnJvbUJ1ZmZlcihidWZmZXIpLCB7XG5cdFx0XHRcdHNraXBDb21wb3NpdGVJbWFnZURhdGE6IHRydWUsXG5cdFx0XHRcdHNraXBMYXllckltYWdlRGF0YTogdHJ1ZSxcblx0XHRcdFx0c2tpcFRodW1ibmFpbDogdHJ1ZSxcblx0XHRcdFx0dGhyb3dGb3JNaXNzaW5nRmVhdHVyZXM6IHRydWUsXG5cdFx0XHRcdGxvZ0RldkZlYXR1cmVzOiB0cnVlLFxuXHRcdFx0fSk7XG5cdFx0XHRkZWxldGUgcHNkLmVuZ2luZURhdGE7XG5cdFx0XHRwc2QuaW1hZ2VSZXNvdXJjZXMgPSB7fTtcblx0XHRcdHBzZC5jaGlsZHJlbj8uc3BsaWNlKDAsIDEpO1xuXHRcdFx0ZnMud3JpdGVGaWxlU3luYygnb3V0cHV0LnR4dCcsIHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KHBzZCwgZmFsc2UsIDk5LCBmYWxzZSksICd1dGY4Jyk7XG5cdFx0fVxuXHR9KTtcbn0pO1xuXG5mdW5jdGlvbiBjbGVhckVtcHR5Q2FudmFzRmllbGRzKGxheWVyOiBMYXllciB8IHVuZGVmaW5lZCkge1xuXHRpZiAobGF5ZXIpIHtcblx0XHRpZiAoJ2NhbnZhcycgaW4gbGF5ZXIgJiYgIWxheWVyLmNhbnZhcykgZGVsZXRlIGxheWVyLmNhbnZhcztcblx0XHRpZiAoJ2ltYWdlRGF0YScgaW4gbGF5ZXIgJiYgIWxheWVyLmltYWdlRGF0YSkgZGVsZXRlIGxheWVyLmltYWdlRGF0YTtcblx0XHRsYXllci5jaGlsZHJlbj8uZm9yRWFjaChjbGVhckVtcHR5Q2FudmFzRmllbGRzKTtcblx0fVxufVxuXG5mdW5jdGlvbiBjbGVhckNhbnZhc0ZpZWxkcyhsYXllcjogTGF5ZXIgfCB1bmRlZmluZWQpIHtcblx0aWYgKGxheWVyKSB7XG5cdFx0ZGVsZXRlIGxheWVyLmNhbnZhcztcblx0XHRkZWxldGUgbGF5ZXIuaW1hZ2VEYXRhO1xuXHRcdGlmIChsYXllci5tYXNrKSBkZWxldGUgbGF5ZXIubWFzay5jYW52YXM7XG5cdFx0aWYgKGxheWVyLm1hc2spIGRlbGV0ZSBsYXllci5tYXNrLmltYWdlRGF0YTtcblx0XHRsYXllci5jaGlsZHJlbj8uZm9yRWFjaChjbGVhckNhbnZhc0ZpZWxkcyk7XG5cdH1cbn1cblxuLy8vIEVuZ2luZSBkYXRhIDIgZXhwZXJpbWVudHNcbi8vIC90ZXN0L2VuZ2luZURhdGEyLmpzb246MTEwOSBpcyBjaGFyYWN0ZXIgY29kZXNcblxuY29uc3Qga2V5c0NvbG9yID0ge1xuXHQnMCc6IHtcblx0XHR1cHJvb3Q6IHRydWUsXG5cdFx0Y2hpbGRyZW46IHtcblx0XHRcdCcwJzogeyBuYW1lOiAnVHlwZScgfSxcblx0XHRcdCcxJzogeyBuYW1lOiAnVmFsdWVzJyB9LFxuXHRcdH0sXG5cdH0sXG59O1xuXG5jb25zdCBrZXlzU3R5bGVTaGVldCA9IHtcblx0JzAnOiB7IG5hbWU6ICdGb250JyB9LFxuXHQnMSc6IHsgbmFtZTogJ0ZvbnRTaXplJyB9LFxuXHQnMic6IHsgbmFtZTogJ0ZhdXhCb2xkJyB9LFxuXHQnMyc6IHsgbmFtZTogJ0ZhdXhJdGFsaWMnIH0sXG5cdCc0JzogeyBuYW1lOiAnQXV0b0xlYWRpbmcnIH0sXG5cdCc1JzogeyBuYW1lOiAnTGVhZGluZycgfSxcblx0JzYnOiB7IG5hbWU6ICdIb3Jpem9udGFsU2NhbGUnIH0sXG5cdCc3JzogeyBuYW1lOiAnVmVydGljYWxTY2FsZScgfSxcblx0JzgnOiB7IG5hbWU6ICdUcmFja2luZycgfSxcblx0JzknOiB7IG5hbWU6ICdCYXNlbGluZVNoaWZ0JyB9LFxuXG5cdCcxMSc6IHsgbmFtZTogJ0tlcm5pbmc/JyB9LCAvLyBkaWZmZXJlbnQgdmFsdWUgdGhhbiBFbmdpbmVEYXRhXG5cdCcxMic6IHsgbmFtZTogJ0ZvbnRDYXBzJyB9LFxuXHQnMTMnOiB7IG5hbWU6ICdGb250QmFzZWxpbmUnIH0sXG5cblx0JzE1JzogeyBuYW1lOiAnU3RyaWtldGhyb3VnaD8nIH0sIC8vIG51bWJlciBpbnN0ZWFkIG9mIGJvb2xcblx0JzE2JzogeyBuYW1lOiAnVW5kZXJsaW5lPycgfSwgLy8gbnVtYmVyIGluc3RlYWQgb2YgYm9vbFxuXG5cdCcxOCc6IHsgbmFtZTogJ0xpZ2F0dXJlcycgfSxcblx0JzE5JzogeyBuYW1lOiAnRExpZ2F0dXJlcycgfSxcblxuXHQnMjMnOiB7IG5hbWU6ICdGcmFjdGlvbnMnIH0sIC8vIG5vdCBwcmVzZW50IGluIEVuZ2luZURhdGFcblx0JzI0JzogeyBuYW1lOiAnT3JkaW5hbHMnIH0sIC8vIG5vdCBwcmVzZW50IGluIEVuZ2luZURhdGFcblxuXHQnMjgnOiB7IG5hbWU6ICdTdHlsaXN0aWNBbHRlcm5hdGVzJyB9LCAvLyBub3QgcHJlc2VudCBpbiBFbmdpbmVEYXRhXG5cblx0JzMwJzogeyBuYW1lOiAnT2xkU3R5bGU/JyB9LCAvLyBPcGVuVHlwZSA+IE9sZFN0eWxlLCBudW1iZXIgaW5zdGVhZCBvZiBib29sLCBub3QgcHJlc2VudCBpbiBFbmdpbmVEYXRhXG5cblx0JzM1JzogeyBuYW1lOiAnQmFzZWxpbmVEaXJlY3Rpb24nIH0sXG5cblx0JzM4JzogeyBuYW1lOiAnTGFuZ3VhZ2UnIH0sXG5cblx0JzUyJzogeyBuYW1lOiAnTm9CcmVhaycgfSxcblx0JzUzJzogeyBuYW1lOiAnRmlsbENvbG9yJywgY2hpbGRyZW46IGtleXNDb2xvciB9LFxufTtcblxuY29uc3Qga2V5c1BhcmFncmFwaCA9IHtcblx0JzAnOiB7IG5hbWU6ICdKdXN0aWZpY2F0aW9uJyB9LFxuXHQnMSc6IHsgbmFtZTogJ0ZpcnN0TGluZUluZGVudCcgfSxcblx0JzInOiB7IG5hbWU6ICdTdGFydEluZGVudCcgfSxcblx0JzMnOiB7IG5hbWU6ICdFbmRJbmRlbnQnIH0sXG5cdCc0JzogeyBuYW1lOiAnU3BhY2VCZWZvcmUnIH0sXG5cdCc1JzogeyBuYW1lOiAnU3BhY2VBZnRlcicgfSxcblxuXHQnNyc6IHsgbmFtZTogJ0F1dG9MZWFkaW5nJyB9LFxuXG5cdCc5JzogeyBuYW1lOiAnQXV0b0h5cGhlbmF0ZScgfSxcblx0JzEwJzogeyBuYW1lOiAnSHlwaGVuYXRlZFdvcmRTaXplJyB9LFxuXHQnMTEnOiB7IG5hbWU6ICdQcmVIeXBoZW4nIH0sXG5cdCcxMic6IHsgbmFtZTogJ1Bvc3RIeXBoZW4nIH0sXG5cdCcxMyc6IHsgbmFtZTogJ0NvbnNlY3V0aXZlSHlwaGVucz8nIH0sIC8vIGRpZmZlcmVudCB2YWx1ZSB0aGFuIEVuZ2luZURhdGFcblx0JzE0JzogeyBuYW1lOiAnWm9uZScgfSxcblx0JzE1JzogeyBuYW1lOiAnSHlwZW5hdGVDYXBpdGFsaXplZFdvcmRzJyB9LCAvLyBub3QgcHJlc2VudCBpbiBFbmdpbmVEYXRhXG5cblx0JzE3JzogeyBuYW1lOiAnV29yZFNwYWNpbmcnIH0sXG5cdCcxOCc6IHsgbmFtZTogJ0xldHRlclNwYWNpbmcnIH0sXG5cdCcxOSc6IHsgbmFtZTogJ0dseXBoU3BhY2luZycgfSxcblxuXHQnMzInOiB7IG5hbWU6ICdTdHlsZVNoZWV0JywgY2hpbGRyZW46IGtleXNTdHlsZVNoZWV0IH0sXG59O1xuXG5jb25zdCBrZXlzU3R5bGVTaGVldERhdGEgPSB7XG5cdG5hbWU6ICdTdHlsZVNoZWV0RGF0YScsXG5cdGNoaWxkcmVuOiBrZXlzU3R5bGVTaGVldCxcbn07XG5cbmNvbnN0IGtleXMgPSB7XG5cdCcwJzoge1xuXHRcdG5hbWU6ICdSZXNvdXJjZURpY3QnLFxuXHRcdGNoaWxkcmVuOiB7XG5cdFx0XHQnMSc6IHtcblx0XHRcdFx0bmFtZTogJ0ZvbnRTZXQnLFxuXHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdCcwJzoge1xuXHRcdFx0XHRcdFx0dXByb290OiB0cnVlLFxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHRcdFx0JzAnOiB7XG5cdFx0XHRcdFx0XHRcdFx0dXByb290OiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHQnMCc6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0dXByb290OiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCcwJzogeyBuYW1lOiAnTmFtZScgfSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnMic6IHsgbmFtZTogJ0ZvbnRUeXBlJyB9LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0JzInOiB7XG5cdFx0XHRcdG5hbWU6ICcyJyxcblx0XHRcdFx0Y2hpbGRyZW46IHt9LFxuXHRcdFx0fSxcblx0XHRcdCczJzoge1xuXHRcdFx0XHRuYW1lOiAnTW9qaUt1bWlTZXQnLFxuXHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdCcwJzoge1xuXHRcdFx0XHRcdFx0dXByb290OiB0cnVlLFxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHRcdFx0JzAnOiB7XG5cdFx0XHRcdFx0XHRcdFx0dXByb290OiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHQnMCc6IHsgbmFtZTogJ0ludGVybmFsTmFtZScgfSxcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdCc0Jzoge1xuXHRcdFx0XHRuYW1lOiAnS2luc29rdVNldCcsXG5cdFx0XHRcdGNoaWxkcmVuOiB7XG5cdFx0XHRcdFx0JzAnOiB7XG5cdFx0XHRcdFx0XHR1cHJvb3Q6IHRydWUsXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdFx0XHQnMCc6IHtcblx0XHRcdFx0XHRcdFx0XHR1cHJvb3Q6IHRydWUsXG5cdFx0XHRcdFx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHRcdFx0XHRcdCcwJzogeyBuYW1lOiAnTmFtZScgfSxcblx0XHRcdFx0XHRcdFx0XHRcdCc1Jzoge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR1cHJvb3Q6IHRydWUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0JzAnOiB7IG5hbWU6ICdOb1N0YXJ0JyB9LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCcxJzogeyBuYW1lOiAnTm9FbmQnIH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0JzInOiB7IG5hbWU6ICdLZWVwJyB9LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCczJzogeyBuYW1lOiAnSGFuZ2luZycgfSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHQnNSc6IHtcblx0XHRcdFx0bmFtZTogJ1N0eWxlU2hlZXRTZXQnLFxuXHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdCcwJzoge1xuXHRcdFx0XHRcdFx0dXByb290OiB0cnVlLFxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHRcdFx0JzAnOiB7XG5cdFx0XHRcdFx0XHRcdFx0dXByb290OiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHQnMCc6IHsgbmFtZTogJ05hbWUnIH0sXG5cdFx0XHRcdFx0XHRcdFx0XHQnNic6IGtleXNTdHlsZVNoZWV0RGF0YSxcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdCc2Jzoge1xuXHRcdFx0XHRuYW1lOiAnUGFyYWdyYXBoU2hlZXRTZXQnLFxuXHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdCcwJzoge1xuXHRcdFx0XHRcdFx0dXByb290OiB0cnVlLFxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHRcdFx0JzAnOiB7XG5cdFx0XHRcdFx0XHRcdFx0dXByb290OiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHQnMCc6IHsgbmFtZTogJ05hbWUnIH0sXG5cdFx0XHRcdFx0XHRcdFx0XHQnNSc6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0bmFtZTogJ1Byb3BlcnRpZXMnLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjaGlsZHJlbjoga2V5c1BhcmFncmFwaCxcblx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0XHQnNic6IHsgbmFtZTogJ0RlZmF1bHRTdHlsZVNoZWV0JyB9LFxuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0JzgnOiB7XG5cdFx0XHRcdG5hbWU6ICc4Jyxcblx0XHRcdFx0Y2hpbGRyZW46IHt9LFxuXHRcdFx0fSxcblx0XHRcdCc5Jzoge1xuXHRcdFx0XHRuYW1lOiAnUHJlZGVmaW5lZCcsXG5cdFx0XHRcdGNoaWxkcmVuOiB7fSxcblx0XHRcdH0sXG5cdFx0fSxcblx0fSxcblx0JzEnOiB7XG5cdFx0bmFtZTogJ0VuZ2luZURpY3QnLFxuXHRcdGNoaWxkcmVuOiB7XG5cdFx0XHQnMCc6IHtcblx0XHRcdFx0bmFtZTogJzAnLFxuXHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdCcwJzoge1xuXHRcdFx0XHRcdFx0bmFtZTogJzAnLFxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHQnMyc6IHsgbmFtZTogJ1N1cGVyc2NyaXB0U2l6ZScgfSxcblx0XHRcdFx0XHQnNCc6IHsgbmFtZTogJ1N1cGVyc2NyaXB0UG9zaXRpb24nIH0sXG5cdFx0XHRcdFx0JzUnOiB7IG5hbWU6ICdTdWJzY3JpcHRTaXplJyB9LFxuXHRcdFx0XHRcdCc2JzogeyBuYW1lOiAnU3Vic2NyaXB0UG9zaXRpb24nIH0sXG5cdFx0XHRcdFx0JzcnOiB7IG5hbWU6ICdTbWFsbENhcFNpemUnIH0sXG5cdFx0XHRcdFx0JzgnOiB7IG5hbWU6ICdVc2VGcmFjdGlvbmFsR2x5cGhXaWR0aHMnIH0sIC8vID8/P1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdCcxJzoge1xuXHRcdFx0XHRuYW1lOiAnRWRpdG9ycz8nLFxuXHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdCcwJzoge1xuXHRcdFx0XHRcdFx0bmFtZTogJ0VkaXRvcicsXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdFx0XHQnMCc6IHsgbmFtZTogJ1RleHQnIH0sXG5cdFx0XHRcdFx0XHRcdCc1Jzoge1xuXHRcdFx0XHRcdFx0XHRcdG5hbWU6ICdQYXJhZ3JhcGhSdW4nLFxuXHRcdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHQnMCc6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0bmFtZTogJ1J1bkFycmF5Jyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnMCc6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdG5hbWU6ICdQYXJhZ3JhcGhTaGVldCcsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnMCc6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR1cHJvb3Q6IHRydWUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCcwJzogeyBuYW1lOiAnMCcgfSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCc1Jzoge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRuYW1lOiAnNScsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiBrZXlzUGFyYWdyYXBoLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCc2JzogeyBuYW1lOiAnNicgfSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCcxJzogeyBuYW1lOiAnUnVuTGVuZ3RoJyB9LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHQnNic6IHtcblx0XHRcdFx0XHRcdFx0XHRuYW1lOiAnU3R5bGVSdW4nLFxuXHRcdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHQnMCc6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0bmFtZTogJ1J1bkFycmF5Jyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnMCc6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdG5hbWU6ICdTdHlsZVNoZWV0Jyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCcwJzoge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHVwcm9vdDogdHJ1ZSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0JzYnOiBrZXlzU3R5bGVTaGVldERhdGEsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnMSc6IHsgbmFtZTogJ1J1bkxlbmd0aCcgfSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHQnMSc6IHtcblx0XHRcdFx0XHRcdG5hbWU6ICdGb250VmVjdG9yRGF0YSA/Pz8nLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0JzInOiB7XG5cdFx0XHRcdG5hbWU6ICdTdHlsZVNoZWV0Jyxcblx0XHRcdFx0Y2hpbGRyZW46IGtleXNTdHlsZVNoZWV0LFxuXHRcdFx0fSxcblx0XHRcdCczJzoge1xuXHRcdFx0XHRuYW1lOiAnUGFyYWdyYXBoU2hlZXQnLFxuXHRcdFx0XHRjaGlsZHJlbjoga2V5c1BhcmFncmFwaCxcblx0XHRcdH0sXG5cdFx0fSxcblx0fSxcbn07XG5cbmZ1bmN0aW9uIGRlY29kZU9iaihvYmo6IGFueSwga2V5czogYW55KTogYW55IHtcblx0aWYgKG9iaiA9PT0gbnVsbCB8fCAha2V5cykgcmV0dXJuIG9iajtcblxuXHRpZiAoQXJyYXkuaXNBcnJheShvYmopKSB7XG5cdFx0cmV0dXJuIG9iai5tYXAoeCA9PiBkZWNvZGVPYmooeCwga2V5cykpO1xuXHR9XG5cblx0aWYgKHR5cGVvZiBvYmogIT09ICdvYmplY3QnKSByZXR1cm4gb2JqO1xuXG5cdGNvbnN0IHJlc3VsdDogYW55ID0ge307XG5cblx0Zm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMob2JqKSkge1xuXHRcdGlmIChrZXlzW2tleV0pIHtcblx0XHRcdGlmIChrZXlzW2tleV0udXByb290KSB7XG5cdFx0XHRcdHJldHVybiBkZWNvZGVPYmoob2JqW2tleV0sIGtleXNba2V5XS5jaGlsZHJlbik7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXN1bHRba2V5c1trZXldLm5hbWVdID0gZGVjb2RlT2JqKG9ialtrZXldLCBrZXlzW2tleV0uY2hpbGRyZW4pO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHRba2V5XSA9IG9ialtrZXldO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGRlY29kZUVuZ2luZURhdGEyKGRhdGE6IGFueSkge1xuXHRyZXR1cm4gZGVjb2RlT2JqKGRhdGEsIGtleXMpO1xufVxuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvYnJhbmRvbmxpdS9EZXNrdG9wL3NreWxhYi9hZy1wc2Qvc3JjIn0=
