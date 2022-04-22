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
var index_1 = require("../index");
var psdReader_1 = require("../psdReader");
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
        var psd = common_1.readPsdFromFile(path.join(readFilesPath, 'blend-mode', 'src.psd'), __assign({}, opts));
        chai_1.expect(psd.width).equal(300);
        chai_1.expect(psd.height).equal(200);
    });
    it('skips composite image data', function () {
        var psd = common_1.readPsdFromFile(path.join(readFilesPath, 'layers', 'src.psd'), __assign(__assign({}, opts), { skipCompositeImageData: true }));
        chai_1.expect(psd.canvas).not.ok;
    });
    it('skips layer image data', function () {
        var psd = common_1.readPsdFromFile(path.join(readFilesPath, 'layers', 'src.psd'), __assign(__assign({}, opts), { skipLayerImageData: true }));
        chai_1.expect(psd.children[0].canvas).not.ok;
    });
    it('reads PSD from Buffer with offset', function () {
        var file = fs.readFileSync(path.join(readFilesPath, 'layers', 'src.psd'));
        var outer = Buffer.alloc(file.byteLength + 100);
        file.copy(outer, 100);
        var inner = Buffer.from(outer.buffer, 100, file.byteLength);
        var psd = index_1.readPsd(inner, opts);
        chai_1.expect(psd.width).equal(300);
    });
    it.skip('duplicate smart', function () {
        var psd = common_1.readPsdFromFile(path.join('resources', 'src.psd'), __assign({}, opts));
        var child = psd.children[1].children[0];
        psd.children[1].children.push(child);
        // const child = psd.children![0];
        // delete child.id;
        // psd.children!.push(child);
        fs.writeFileSync('output.psd', index_1.writePsdBuffer(psd, {
            trimImageData: false,
            generateThumbnail: true,
            noBackground: true
        }));
        var psd2 = common_1.readPsdFromFile(path.join('output.psd'), __assign({}, opts));
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
            var psd = common_1.readPsdFromFile(path.join(basePath, fileName), __assign({}, opts));
            var expected = common_1.importPSD(basePath);
            var images = common_1.loadImagesFromDirectory(basePath);
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
            compare.forEach(function (i) { return common_1.saveCanvas(path.join(resultsFilesPath, f, i.name), i.canvas); });
            compareFiles.forEach(function (i) { return fs.writeFileSync(path.join(resultsFilesPath, f, i.name), i.data); });
            fs.writeFileSync(path.join(resultsFilesPath, f, 'data.json'), JSON.stringify(psd, null, 2), 'utf8');
            clearEmptyCanvasFields(psd);
            clearEmptyCanvasFields(expected);
            chai_1.expect(psd).eql(expected, f);
            compare.forEach(function (i) { return i.skip || common_1.compareCanvases(images[i.name], i.canvas, f + "/" + i.name); });
            compareFiles.forEach(function (i) { return common_1.compareTwoFiles(path.join(basePath, i.name), i.data, f + "/" + i.name); });
        });
    });
    fs.readdirSync(readWriteFilesPath).forEach(function (f) {
        // fs.readdirSync(readWriteFilesPath).filter(f => /^test$/.test(f)).forEach(f => {
        it("reads-writes PSD file (" + f + ")", function () {
            var ext = fs.existsSync(path.join(readWriteFilesPath, f, 'src.psb')) ? 'psb' : 'psd';
            var psd = common_1.readPsdFromFile(path.join(readWriteFilesPath, f, "src." + ext), __assign(__assign({}, opts), { useImageData: true, useRawThumbnail: true, throwForMissingFeatures: true }));
            var actual = index_1.writePsdBuffer(psd, { logMissingFeatures: true, psb: ext === 'psb' });
            var expected = fs.readFileSync(path.join(readWriteFilesPath, f, "expected." + ext));
            fs.writeFileSync(path.join(resultsFilesPath, "read-write-" + f + "." + ext), actual);
            fs.writeFileSync(path.join(resultsFilesPath, "read-write-" + f + ".bin"), actual);
            // console.log(require('util').inspect(psd, false, 99, true));
            // const psd2 = readPsdFromFile(path.join(resultsFilesPath, `read-write-${f}.psd`), { ...opts, useImageData: true, useRawThumbnail: true });
            // fs.writeFileSync('temp.txt', require('util').inspect(psd, false, 99, false), 'utf8');
            // fs.writeFileSync('temp2.txt', require('util').inspect(psd2, false, 99, false), 'utf8');
            common_1.compareBuffers(actual, expected, "read-write-" + f, 0x0);
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
        fs.writeFileSync(path.join(resultsFilesPath, '_TEXT2.psd'), index_1.writePsdBuffer(psd, { logMissingFeatures: true }));
    });
    it.skip('read text layer test', function () {
        var psd = common_1.readPsdFromFile(path.join(testFilesPath, 'text-test.psd'), opts);
        // const layer = psd.children![1];
        // layer.text!.text = 'Foo bar';
        var buffer = index_1.writePsdBuffer(psd, { logMissingFeatures: true });
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
        var originalPsd = psdReader_1.readPsd(common_1.createReaderFromBuffer(originalBuffer), opts);
        console.log('WRITING');
        var buffer = index_1.writePsdBuffer(originalPsd, { logMissingFeatures: true });
        fs.writeFileSync('temp.psd', buffer);
        // fs.writeFileSync('temp.bin', buffer);
        // fs.writeFileSync('temp.json', JSON.stringify(originalPsd, null, 2), 'utf8');
        // fs.writeFileSync('temp.xml', originalPsd.imageResources?.xmpMetadata, 'utf8');
        console.log('READING WRITTEN');
        var psd = psdReader_1.readPsd(common_1.createReaderFromBuffer(buffer), { logMissingFeatures: true, throwForMissingFeatures: true });
        clearCanvasFields(originalPsd);
        clearCanvasFields(psd);
        delete originalPsd.imageResources.thumbnail;
        delete psd.imageResources.thumbnail;
        delete originalPsd.imageResources.thumbnailRaw;
        delete psd.imageResources.thumbnailRaw;
        // console.log(require('util').inspect(originalPsd, false, 99, true));
        // fs.writeFileSync('original.json', JSON.stringify(originalPsd, null, 2));
        // fs.writeFileSync('after.json', JSON.stringify(psd, null, 2));
        common_1.compareBuffers(buffer, originalBuffer, 'test');
        chai_1.expect(psd).eql(originalPsd);
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
        var psd = psdReader_1.readPsd(common_1.createReaderFromBuffer(buffer), {
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
        var psd = psdReader_1.readPsd(common_1.createReaderFromBuffer(fs.readFileSync("test/read-write/text-box/src.psd")), {
            // skipCompositeImageData: true,
            // skipLayerImageData: true,
            // skipThumbnail: true,
            throwForMissingFeatures: true,
            logDevFeatures: true,
            useRawThumbnail: true,
        });
        fs.writeFileSync('text_rect_out.psd', index_1.writePsdBuffer(psd, { logMissingFeatures: true }));
        fs.writeFileSync('text_rect_out.bin', index_1.writePsdBuffer(psd, { logMissingFeatures: true }));
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
        common_1.compareBuffers(output, original, '-', 0x65d8); // , 0x8ce8, 0x8fca - 0x8ce8);
    });
    it.skip('compare test', function () {
        for (var _i = 0, _a = ['text_point', 'text_rect']; _i < _a.length; _i++) {
            var name_1 = _a[_i];
            var psd = psdReader_1.readPsd(common_1.createReaderFromBuffer(fs.readFileSync(name_1 + ".psd")), {
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
            var psd = psdReader_1.readPsd(common_1.createReaderFromBuffer(buffer), {});
            psd.children[1].text.text = 'Foo bar';
            var output = index_1.writePsdBuffer(psd, { invalidateTextLayers: true, logMissingFeatures: true });
            fs.writeFileSync('out.psd', output);
        }
        {
            var buffer = fs.readFileSync('text-replace.psd');
            var psd = psdReader_1.readPsd(common_1.createReaderFromBuffer(buffer), {
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
            var psd = psdReader_1.readPsd(common_1.createReaderFromBuffer(buffer), {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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U0FBUyxpQkFBaUIsQ0FBQyxJQUFTO0lBQ25DLE9BQU8sU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM5QixDQUFDIiwiZmlsZSI6InRlc3QvcHNkUmVhZGVyLnNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZXhwZWN0IH0gZnJvbSAnY2hhaSc7XG5pbXBvcnQge1xuXHRyZWFkUHNkRnJvbUZpbGUsIGltcG9ydFBTRCwgbG9hZEltYWdlc0Zyb21EaXJlY3RvcnksIGNvbXBhcmVDYW52YXNlcywgc2F2ZUNhbnZhcyxcblx0Y3JlYXRlUmVhZGVyRnJvbUJ1ZmZlciwgY29tcGFyZUJ1ZmZlcnMsIGNvbXBhcmVUd29GaWxlc1xufSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQgeyBMYXllciwgUmVhZE9wdGlvbnMsIFBzZCB9IGZyb20gJy4uL3BzZCc7XG5pbXBvcnQgeyByZWFkUHNkLCB3cml0ZVBzZEJ1ZmZlciB9IGZyb20gJy4uL2luZGV4JztcbmltcG9ydCB7IHJlYWRQc2QgYXMgcmVhZFBzZEludGVybmFsIH0gZnJvbSAnLi4vcHNkUmVhZGVyJztcblxuY29uc3QgdGVzdEZpbGVzUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICcuLicsICd0ZXN0Jyk7XG5jb25zdCByZWFkRmlsZXNQYXRoID0gcGF0aC5qb2luKHRlc3RGaWxlc1BhdGgsICdyZWFkJyk7XG5jb25zdCByZWFkV3JpdGVGaWxlc1BhdGggPSBwYXRoLmpvaW4odGVzdEZpbGVzUGF0aCwgJ3JlYWQtd3JpdGUnKTtcbmNvbnN0IHJlc3VsdHNGaWxlc1BhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAncmVzdWx0cycpO1xuY29uc3Qgb3B0czogUmVhZE9wdGlvbnMgPSB7XG5cdHRocm93Rm9yTWlzc2luZ0ZlYXR1cmVzOiB0cnVlLFxuXHRsb2dNaXNzaW5nRmVhdHVyZXM6IHRydWUsXG59O1xuXG5kZXNjcmliZSgnUHNkUmVhZGVyJywgKCkgPT4ge1xuXHRpdCgncmVhZHMgd2lkdGggYW5kIGhlaWdodCBwcm9wZXJseScsICgpID0+IHtcblx0XHRjb25zdCBwc2QgPSByZWFkUHNkRnJvbUZpbGUocGF0aC5qb2luKHJlYWRGaWxlc1BhdGgsICdibGVuZC1tb2RlJywgJ3NyYy5wc2QnKSwgeyAuLi5vcHRzIH0pO1xuXHRcdGV4cGVjdChwc2Qud2lkdGgpLmVxdWFsKDMwMCk7XG5cdFx0ZXhwZWN0KHBzZC5oZWlnaHQpLmVxdWFsKDIwMCk7XG5cdH0pO1xuXG5cdGl0KCdza2lwcyBjb21wb3NpdGUgaW1hZ2UgZGF0YScsICgpID0+IHtcblx0XHRjb25zdCBwc2QgPSByZWFkUHNkRnJvbUZpbGUocGF0aC5qb2luKHJlYWRGaWxlc1BhdGgsICdsYXllcnMnLCAnc3JjLnBzZCcpLCB7IC4uLm9wdHMsIHNraXBDb21wb3NpdGVJbWFnZURhdGE6IHRydWUgfSk7XG5cdFx0ZXhwZWN0KHBzZC5jYW52YXMpLm5vdC5vaztcblx0fSk7XG5cblx0aXQoJ3NraXBzIGxheWVyIGltYWdlIGRhdGEnLCAoKSA9PiB7XG5cdFx0Y29uc3QgcHNkID0gcmVhZFBzZEZyb21GaWxlKHBhdGguam9pbihyZWFkRmlsZXNQYXRoLCAnbGF5ZXJzJywgJ3NyYy5wc2QnKSwgeyAuLi5vcHRzLCBza2lwTGF5ZXJJbWFnZURhdGE6IHRydWUgfSk7XG5cdFx0ZXhwZWN0KHBzZC5jaGlsZHJlbiFbMF0uY2FudmFzKS5ub3Qub2s7XG5cdH0pO1xuXG5cdGl0KCdyZWFkcyBQU0QgZnJvbSBCdWZmZXIgd2l0aCBvZmZzZXQnLCAoKSA9PiB7XG5cdFx0Y29uc3QgZmlsZSA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4ocmVhZEZpbGVzUGF0aCwgJ2xheWVycycsICdzcmMucHNkJykpO1xuXHRcdGNvbnN0IG91dGVyID0gQnVmZmVyLmFsbG9jKGZpbGUuYnl0ZUxlbmd0aCArIDEwMCk7XG5cdFx0ZmlsZS5jb3B5KG91dGVyLCAxMDApO1xuXHRcdGNvbnN0IGlubmVyID0gQnVmZmVyLmZyb20ob3V0ZXIuYnVmZmVyLCAxMDAsIGZpbGUuYnl0ZUxlbmd0aCk7XG5cblx0XHRjb25zdCBwc2QgPSByZWFkUHNkKGlubmVyLCBvcHRzKTtcblxuXHRcdGV4cGVjdChwc2Qud2lkdGgpLmVxdWFsKDMwMCk7XG5cdH0pO1xuXG5cdGl0LnNraXAoJ2R1cGxpY2F0ZSBzbWFydCcsICgpID0+IHtcblx0XHRjb25zdCBwc2QgPSByZWFkUHNkRnJvbUZpbGUocGF0aC5qb2luKCdyZXNvdXJjZXMnLCAnc3JjLnBzZCcpLCB7IC4uLm9wdHMgfSk7XG5cblx0XHRjb25zdCBjaGlsZCA9IHBzZC5jaGlsZHJlbiFbMV0uY2hpbGRyZW4hWzBdO1xuXHRcdHBzZC5jaGlsZHJlbiFbMV0uY2hpbGRyZW4hLnB1c2goY2hpbGQpO1xuXG5cdFx0Ly8gY29uc3QgY2hpbGQgPSBwc2QuY2hpbGRyZW4hWzBdO1xuXHRcdC8vIGRlbGV0ZSBjaGlsZC5pZDtcblx0XHQvLyBwc2QuY2hpbGRyZW4hLnB1c2goY2hpbGQpO1xuXG5cdFx0ZnMud3JpdGVGaWxlU3luYygnb3V0cHV0LnBzZCcsIHdyaXRlUHNkQnVmZmVyKHBzZCwge1xuXHRcdFx0dHJpbUltYWdlRGF0YTogZmFsc2UsXG5cdFx0XHRnZW5lcmF0ZVRodW1ibmFpbDogdHJ1ZSxcblx0XHRcdG5vQmFja2dyb3VuZDogdHJ1ZVxuXHRcdH0pKTtcblxuXHRcdGNvbnN0IHBzZDIgPSByZWFkUHNkRnJvbUZpbGUocGF0aC5qb2luKCdvdXRwdXQucHNkJyksIHsgLi4ub3B0cyB9KTtcblxuXHRcdGNvbnNvbGUubG9nKHBzZDIud2lkdGgpO1xuXHR9KTtcblxuXHQvLyBza2lwcGluZyBcInBhdHRlcm5cIiB0ZXN0IGJlY2F1c2UgaXQgcmVxdWlyZXMgemlwIGNpbXByZXNzaW9uIG9mIHBhdHRlcm5zXG5cdC8vIHNraXBwaW5nIFwiY215a1wiIHRlc3QgYmVjYXVzZSB3ZSBjYW4ndCBjb252ZXJ0IENNWUsgdG8gUkdCXG5cdGZzLnJlYWRkaXJTeW5jKHJlYWRGaWxlc1BhdGgpLmZpbHRlcihmID0+ICEvcGF0dGVybnxjbXlrLy50ZXN0KGYpKS5mb3JFYWNoKGYgPT4ge1xuXHRcdC8vIGZzLnJlYWRkaXJTeW5jKHJlYWRGaWxlc1BhdGgpLmZpbHRlcihmID0+IC9rcml0YS8udGVzdChmKSkuZm9yRWFjaChmID0+IHtcblx0XHRpdChgcmVhZHMgUFNEIGZpbGUgKCR7Zn0pYCwgKCkgPT4ge1xuXHRcdFx0Y29uc3QgYmFzZVBhdGggPSBwYXRoLmpvaW4ocmVhZEZpbGVzUGF0aCwgZik7XG5cdFx0XHRjb25zdCBmaWxlTmFtZSA9IGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKGJhc2VQYXRoLCAnc3JjLnBzYicpKSA/ICdzcmMucHNiJyA6ICdzcmMucHNkJztcblx0XHRcdGNvbnN0IHBzZCA9IHJlYWRQc2RGcm9tRmlsZShwYXRoLmpvaW4oYmFzZVBhdGgsIGZpbGVOYW1lKSwgeyAuLi5vcHRzIH0pO1xuXHRcdFx0Y29uc3QgZXhwZWN0ZWQgPSBpbXBvcnRQU0QoYmFzZVBhdGgpO1xuXHRcdFx0Y29uc3QgaW1hZ2VzID0gbG9hZEltYWdlc0Zyb21EaXJlY3RvcnkoYmFzZVBhdGgpO1xuXHRcdFx0Y29uc3QgY29tcGFyZTogeyBuYW1lOiBzdHJpbmc7IGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQgfCB1bmRlZmluZWQ7IHNraXA/OiBib29sZWFuOyB9W10gPSBbXTtcblx0XHRcdGNvbnN0IGNvbXBhcmVGaWxlczogeyBuYW1lOiBzdHJpbmc7IGRhdGE6IFVpbnQ4QXJyYXk7IH1bXSA9IFtdO1xuXG5cdFx0XHRjb21wYXJlLnB1c2goeyBuYW1lOiBgY2FudmFzLnBuZ2AsIGNhbnZhczogcHNkLmNhbnZhcyB9KTtcblx0XHRcdHBzZC5jYW52YXMgPSB1bmRlZmluZWQ7XG5cdFx0XHRkZWxldGUgcHNkLmltYWdlRGF0YTtcblx0XHRcdGRlbGV0ZSBwc2QuaW1hZ2VSZXNvdXJjZXMhLnhtcE1ldGFkYXRhO1xuXG5cdFx0XHRsZXQgaSA9IDA7XG5cblx0XHRcdGZ1bmN0aW9uIHB1c2hMYXllckNhbnZhc2VzKGxheWVyczogTGF5ZXJbXSkge1xuXHRcdFx0XHRmb3IgKGNvbnN0IGwgb2YgbGF5ZXJzKSB7XG5cdFx0XHRcdFx0Y29uc3QgbGF5ZXJJZCA9IGk7XG5cblx0XHRcdFx0XHRpZiAoIWwuY2hpbGRyZW4gfHwgbC5tYXNrKSBpKys7XG5cblx0XHRcdFx0XHRpZiAobC5jaGlsZHJlbikge1xuXHRcdFx0XHRcdFx0cHVzaExheWVyQ2FudmFzZXMobC5jaGlsZHJlbik7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNvbXBhcmUucHVzaCh7IG5hbWU6IGBsYXllci0ke2xheWVySWR9LnBuZ2AsIGNhbnZhczogbC5jYW52YXMgfSk7XG5cdFx0XHRcdFx0XHRsLmNhbnZhcyA9IHVuZGVmaW5lZDtcblx0XHRcdFx0XHRcdGRlbGV0ZSBsLmltYWdlRGF0YTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAobC5tYXNrKSB7XG5cdFx0XHRcdFx0XHRjb21wYXJlLnB1c2goeyBuYW1lOiBgbGF5ZXItJHtsYXllcklkfS1tYXNrLnBuZ2AsIGNhbnZhczogbC5tYXNrLmNhbnZhcyB9KTtcblx0XHRcdFx0XHRcdGRlbGV0ZSBsLm1hc2suY2FudmFzO1xuXHRcdFx0XHRcdFx0ZGVsZXRlIGwubWFzay5pbWFnZURhdGE7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmIChwc2QubGlua2VkRmlsZXMpIHtcblx0XHRcdFx0Zm9yIChjb25zdCBmaWxlIG9mIHBzZC5saW5rZWRGaWxlcykge1xuXHRcdFx0XHRcdGlmIChmaWxlLmRhdGEpIHtcblx0XHRcdFx0XHRcdGNvbXBhcmVGaWxlcy5wdXNoKHsgbmFtZTogZmlsZS5uYW1lLCBkYXRhOiBmaWxlLmRhdGEgfSk7XG5cdFx0XHRcdFx0XHRkZWxldGUgZmlsZS5kYXRhO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRwdXNoTGF5ZXJDYW52YXNlcyhwc2QuY2hpbGRyZW4gfHwgW10pO1xuXHRcdFx0ZnMubWtkaXJTeW5jKHBhdGguam9pbihyZXN1bHRzRmlsZXNQYXRoLCBmKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG5cblx0XHRcdGlmIChwc2QuaW1hZ2VSZXNvdXJjZXM/LnRodW1ibmFpbCkge1xuXHRcdFx0XHRjb21wYXJlLnB1c2goeyBuYW1lOiAndGh1bWIucG5nJywgY2FudmFzOiBwc2QuaW1hZ2VSZXNvdXJjZXMudGh1bWJuYWlsLCBza2lwOiB0cnVlIH0pO1xuXHRcdFx0XHRkZWxldGUgcHNkLmltYWdlUmVzb3VyY2VzLnRodW1ibmFpbDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHBzZC5pbWFnZVJlc291cmNlcykgZGVsZXRlIHBzZC5pbWFnZVJlc291cmNlcy50aHVtYm5haWxSYXc7XG5cblx0XHRcdGNvbXBhcmUuZm9yRWFjaChpID0+IHNhdmVDYW52YXMocGF0aC5qb2luKHJlc3VsdHNGaWxlc1BhdGgsIGYsIGkubmFtZSksIGkuY2FudmFzKSk7XG5cdFx0XHRjb21wYXJlRmlsZXMuZm9yRWFjaChpID0+IGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKHJlc3VsdHNGaWxlc1BhdGgsIGYsIGkubmFtZSksIGkuZGF0YSkpO1xuXG5cdFx0XHRmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihyZXN1bHRzRmlsZXNQYXRoLCBmLCAnZGF0YS5qc29uJyksIEpTT04uc3RyaW5naWZ5KHBzZCwgbnVsbCwgMiksICd1dGY4Jyk7XG5cblx0XHRcdGNsZWFyRW1wdHlDYW52YXNGaWVsZHMocHNkKTtcblx0XHRcdGNsZWFyRW1wdHlDYW52YXNGaWVsZHMoZXhwZWN0ZWQpO1xuXG5cdFx0XHRleHBlY3QocHNkKS5lcWwoZXhwZWN0ZWQsIGYpO1xuXHRcdFx0Y29tcGFyZS5mb3JFYWNoKGkgPT4gaS5za2lwIHx8IGNvbXBhcmVDYW52YXNlcyhpbWFnZXNbaS5uYW1lXSwgaS5jYW52YXMsIGAke2Z9LyR7aS5uYW1lfWApKTtcblx0XHRcdGNvbXBhcmVGaWxlcy5mb3JFYWNoKGkgPT4gY29tcGFyZVR3b0ZpbGVzKHBhdGguam9pbihiYXNlUGF0aCwgaS5uYW1lKSwgaS5kYXRhLCBgJHtmfS8ke2kubmFtZX1gKSk7XG5cdFx0fSk7XG5cdH0pO1xuXG5cdGZzLnJlYWRkaXJTeW5jKHJlYWRXcml0ZUZpbGVzUGF0aCkuZm9yRWFjaChmID0+IHtcblx0XHQvLyBmcy5yZWFkZGlyU3luYyhyZWFkV3JpdGVGaWxlc1BhdGgpLmZpbHRlcihmID0+IC9edGVzdCQvLnRlc3QoZikpLmZvckVhY2goZiA9PiB7XG5cdFx0aXQoYHJlYWRzLXdyaXRlcyBQU0QgZmlsZSAoJHtmfSlgLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBleHQgPSBmcy5leGlzdHNTeW5jKHBhdGguam9pbihyZWFkV3JpdGVGaWxlc1BhdGgsIGYsICdzcmMucHNiJykpID8gJ3BzYicgOiAncHNkJztcblx0XHRcdGNvbnN0IHBzZCA9IHJlYWRQc2RGcm9tRmlsZShwYXRoLmpvaW4ocmVhZFdyaXRlRmlsZXNQYXRoLCBmLCBgc3JjLiR7ZXh0fWApLCB7XG5cdFx0XHRcdC4uLm9wdHMsIHVzZUltYWdlRGF0YTogdHJ1ZSwgdXNlUmF3VGh1bWJuYWlsOiB0cnVlLCB0aHJvd0Zvck1pc3NpbmdGZWF0dXJlczogdHJ1ZVxuXHRcdFx0fSk7XG5cdFx0XHRjb25zdCBhY3R1YWwgPSB3cml0ZVBzZEJ1ZmZlcihwc2QsIHsgbG9nTWlzc2luZ0ZlYXR1cmVzOiB0cnVlLCBwc2I6IGV4dCA9PT0gJ3BzYicgfSk7XG5cdFx0XHRjb25zdCBleHBlY3RlZCA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4ocmVhZFdyaXRlRmlsZXNQYXRoLCBmLCBgZXhwZWN0ZWQuJHtleHR9YCkpO1xuXHRcdFx0ZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ocmVzdWx0c0ZpbGVzUGF0aCwgYHJlYWQtd3JpdGUtJHtmfS4ke2V4dH1gKSwgYWN0dWFsKTtcblx0XHRcdGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKHJlc3VsdHNGaWxlc1BhdGgsIGByZWFkLXdyaXRlLSR7Zn0uYmluYCksIGFjdHVhbCk7XG5cdFx0XHQvLyBjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChwc2QsIGZhbHNlLCA5OSwgdHJ1ZSkpO1xuXG5cdFx0XHQvLyBjb25zdCBwc2QyID0gcmVhZFBzZEZyb21GaWxlKHBhdGguam9pbihyZXN1bHRzRmlsZXNQYXRoLCBgcmVhZC13cml0ZS0ke2Z9LnBzZGApLCB7IC4uLm9wdHMsIHVzZUltYWdlRGF0YTogdHJ1ZSwgdXNlUmF3VGh1bWJuYWlsOiB0cnVlIH0pO1xuXHRcdFx0Ly8gZnMud3JpdGVGaWxlU3luYygndGVtcC50eHQnLCByZXF1aXJlKCd1dGlsJykuaW5zcGVjdChwc2QsIGZhbHNlLCA5OSwgZmFsc2UpLCAndXRmOCcpO1xuXHRcdFx0Ly8gZnMud3JpdGVGaWxlU3luYygndGVtcDIudHh0JywgcmVxdWlyZSgndXRpbCcpLmluc3BlY3QocHNkMiwgZmFsc2UsIDk5LCBmYWxzZSksICd1dGY4Jyk7XG5cblx0XHRcdGNvbXBhcmVCdWZmZXJzKGFjdHVhbCwgZXhwZWN0ZWQsIGByZWFkLXdyaXRlLSR7Zn1gLCAweDApO1xuXHRcdH0pO1xuXHR9KTtcblxuXHRpdC5za2lwKCd3cml0ZSB0ZXh0IGxheWVyIHRlc3QnLCAoKSA9PiB7XG5cdFx0Y29uc3QgcHNkOiBQc2QgPSB7XG5cdFx0XHR3aWR0aDogMjAwLFxuXHRcdFx0aGVpZ2h0OiAyMDAsXG5cdFx0XHRjaGlsZHJlbjogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0bmFtZTogJ3RleHQgbGF5ZXInLFxuXHRcdFx0XHRcdHRleHQ6IHtcblx0XHRcdFx0XHRcdHRleHQ6ICdIZWxsbyBXb3JsZFxcbuKAoiBjIOKAoiB0aW55IVxcclxcbnRlc3QnLFxuXHRcdFx0XHRcdFx0Ly8gb3JpZW50YXRpb246ICd2ZXJ0aWNhbCcsXG5cdFx0XHRcdFx0XHR0cmFuc2Zvcm06IFsxLCAwLCAwLCAxLCA3MCwgNzBdLFxuXHRcdFx0XHRcdFx0c3R5bGU6IHtcblx0XHRcdFx0XHRcdFx0Zm9udDogeyBuYW1lOiAnQXJpYWxNVCcgfSxcblx0XHRcdFx0XHRcdFx0Zm9udFNpemU6IDMwLFxuXHRcdFx0XHRcdFx0XHRmaWxsQ29sb3I6IHsgcjogMCwgZzogMTI4LCBiOiAwIH0sXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0c3R5bGVSdW5zOiBbXG5cdFx0XHRcdFx0XHRcdHsgbGVuZ3RoOiAxMiwgc3R5bGU6IHsgZmlsbENvbG9yOiB7IHI6IDI1NSwgZzogMCwgYjogMCB9IH0gfSxcblx0XHRcdFx0XHRcdFx0eyBsZW5ndGg6IDEyLCBzdHlsZTogeyBmaWxsQ29sb3I6IHsgcjogMCwgZzogMCwgYjogMjU1IH0gfSB9LFxuXHRcdFx0XHRcdFx0XHR7IGxlbmd0aDogNCwgc3R5bGU6IHsgdW5kZXJsaW5lOiB0cnVlIH0gfSxcblx0XHRcdFx0XHRcdF0sXG5cdFx0XHRcdFx0XHRwYXJhZ3JhcGhTdHlsZToge1xuXHRcdFx0XHRcdFx0XHRqdXN0aWZpY2F0aW9uOiAnY2VudGVyJyxcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHR3YXJwOiB7XG5cdFx0XHRcdFx0XHRcdHN0eWxlOiAnYXJjJyxcblx0XHRcdFx0XHRcdFx0dmFsdWU6IDUwLFxuXHRcdFx0XHRcdFx0XHRwZXJzcGVjdGl2ZTogMCxcblx0XHRcdFx0XHRcdFx0cGVyc3BlY3RpdmVPdGhlcjogMCxcblx0XHRcdFx0XHRcdFx0cm90YXRlOiAnaG9yaXpvbnRhbCcsXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRuYW1lOiAnMm5kIGxheWVyJyxcblx0XHRcdFx0XHR0ZXh0OiB7XG5cdFx0XHRcdFx0XHR0ZXh0OiAnQWFhYWEnLFxuXHRcdFx0XHRcdFx0dHJhbnNmb3JtOiBbMSwgMCwgMCwgMSwgNzAsIDcwXSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9O1xuXG5cdFx0ZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ocmVzdWx0c0ZpbGVzUGF0aCwgJ19URVhUMi5wc2QnKSwgd3JpdGVQc2RCdWZmZXIocHNkLCB7IGxvZ01pc3NpbmdGZWF0dXJlczogdHJ1ZSB9KSk7XG5cdH0pO1xuXG5cdGl0LnNraXAoJ3JlYWQgdGV4dCBsYXllciB0ZXN0JywgKCkgPT4ge1xuXHRcdGNvbnN0IHBzZCA9IHJlYWRQc2RGcm9tRmlsZShwYXRoLmpvaW4odGVzdEZpbGVzUGF0aCwgJ3RleHQtdGVzdC5wc2QnKSwgb3B0cyk7XG5cdFx0Ly8gY29uc3QgbGF5ZXIgPSBwc2QuY2hpbGRyZW4hWzFdO1xuXG5cdFx0Ly8gbGF5ZXIudGV4dCEudGV4dCA9ICdGb28gYmFyJztcblx0XHRjb25zdCBidWZmZXIgPSB3cml0ZVBzZEJ1ZmZlcihwc2QsIHsgbG9nTWlzc2luZ0ZlYXR1cmVzOiB0cnVlIH0pO1xuXHRcdGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKHJlc3VsdHNGaWxlc1BhdGgsICdfVEVYVC5wc2QnKSwgYnVmZmVyKTtcblxuXHRcdC8vIGNvbnNvbGUubG9nKHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KHBzZC5jaGlsZHJlbiFbMF0udGV4dCwgZmFsc2UsIDk5LCB0cnVlKSk7XG5cdFx0Ly8gY29uc29sZS5sb2cocmVxdWlyZSgndXRpbCcpLmluc3BlY3QocHNkLmNoaWxkcmVuIVsxXS50ZXh0LCBmYWxzZSwgOTksIHRydWUpKTtcblx0XHQvLyBjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChwc2QuZW5naW5lRGF0YSwgZmFsc2UsIDk5LCB0cnVlKSk7XG5cdH0pO1xuXG5cdGl0LnNraXAoJ1JFQUQgVEVTVCcsICgpID0+IHtcblx0XHRjb25zdCBvcmlnaW5hbEJ1ZmZlciA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4odGVzdEZpbGVzUGF0aCwgJ3Rlc3QucHNkJykpO1xuXG5cdFx0Y29uc29sZS5sb2coJ1JFQURJTkcgT1JJR0lOQUwnKTtcblx0XHRjb25zdCBvcHRzID0ge1xuXHRcdFx0bG9nTWlzc2luZ0ZlYXR1cmVzOiB0cnVlLFxuXHRcdFx0dGhyb3dGb3JNaXNzaW5nRmVhdHVyZXM6IHRydWUsXG5cdFx0XHR1c2VJbWFnZURhdGE6IHRydWUsXG5cdFx0XHR1c2VSYXdUaHVtYm5haWw6IHRydWUsXG5cdFx0XHRsb2dEZXZGZWF0dXJlczogdHJ1ZSxcblx0XHR9O1xuXHRcdGNvbnN0IG9yaWdpbmFsUHNkID0gcmVhZFBzZEludGVybmFsKGNyZWF0ZVJlYWRlckZyb21CdWZmZXIob3JpZ2luYWxCdWZmZXIpLCBvcHRzKTtcblxuXHRcdGNvbnNvbGUubG9nKCdXUklUSU5HJyk7XG5cdFx0Y29uc3QgYnVmZmVyID0gd3JpdGVQc2RCdWZmZXIob3JpZ2luYWxQc2QsIHsgbG9nTWlzc2luZ0ZlYXR1cmVzOiB0cnVlIH0pO1xuXHRcdGZzLndyaXRlRmlsZVN5bmMoJ3RlbXAucHNkJywgYnVmZmVyKTtcblx0XHQvLyBmcy53cml0ZUZpbGVTeW5jKCd0ZW1wLmJpbicsIGJ1ZmZlcik7XG5cdFx0Ly8gZnMud3JpdGVGaWxlU3luYygndGVtcC5qc29uJywgSlNPTi5zdHJpbmdpZnkob3JpZ2luYWxQc2QsIG51bGwsIDIpLCAndXRmOCcpO1xuXHRcdC8vIGZzLndyaXRlRmlsZVN5bmMoJ3RlbXAueG1sJywgb3JpZ2luYWxQc2QuaW1hZ2VSZXNvdXJjZXM/LnhtcE1ldGFkYXRhLCAndXRmOCcpO1xuXG5cdFx0Y29uc29sZS5sb2coJ1JFQURJTkcgV1JJVFRFTicpO1xuXHRcdGNvbnN0IHBzZCA9IHJlYWRQc2RJbnRlcm5hbChcblx0XHRcdGNyZWF0ZVJlYWRlckZyb21CdWZmZXIoYnVmZmVyKSwgeyBsb2dNaXNzaW5nRmVhdHVyZXM6IHRydWUsIHRocm93Rm9yTWlzc2luZ0ZlYXR1cmVzOiB0cnVlIH0pO1xuXG5cdFx0Y2xlYXJDYW52YXNGaWVsZHMob3JpZ2luYWxQc2QpO1xuXHRcdGNsZWFyQ2FudmFzRmllbGRzKHBzZCk7XG5cdFx0ZGVsZXRlIG9yaWdpbmFsUHNkLmltYWdlUmVzb3VyY2VzIS50aHVtYm5haWw7XG5cdFx0ZGVsZXRlIHBzZC5pbWFnZVJlc291cmNlcyEudGh1bWJuYWlsO1xuXHRcdGRlbGV0ZSBvcmlnaW5hbFBzZC5pbWFnZVJlc291cmNlcyEudGh1bWJuYWlsUmF3O1xuXHRcdGRlbGV0ZSBwc2QuaW1hZ2VSZXNvdXJjZXMhLnRodW1ibmFpbFJhdztcblx0XHQvLyBjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChvcmlnaW5hbFBzZCwgZmFsc2UsIDk5LCB0cnVlKSk7XG5cblx0XHQvLyBmcy53cml0ZUZpbGVTeW5jKCdvcmlnaW5hbC5qc29uJywgSlNPTi5zdHJpbmdpZnkob3JpZ2luYWxQc2QsIG51bGwsIDIpKTtcblx0XHQvLyBmcy53cml0ZUZpbGVTeW5jKCdhZnRlci5qc29uJywgSlNPTi5zdHJpbmdpZnkocHNkLCBudWxsLCAyKSk7XG5cblx0XHRjb21wYXJlQnVmZmVycyhidWZmZXIsIG9yaWdpbmFsQnVmZmVyLCAndGVzdCcpO1xuXG5cdFx0ZXhwZWN0KHBzZCkuZXFsKG9yaWdpbmFsUHNkKTtcblx0fSk7XG5cblx0aXQuc2tpcCgnZGVjb2RlIGVuZ2luZSBkYXRhIDInLCAoKSA9PiB7XG5cdFx0Ly8gY29uc3QgZmlsZURhdGEgPSBmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ3Jlc291cmNlcycsICdlbmdpbmVEYXRhMlZlcnRpY2FsLnR4dCcpKTtcblx0XHRjb25zdCBmaWxlRGF0YSA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAncmVzb3VyY2VzJywgJ2VuZ2luZURhdGEyU2ltcGxlLnR4dCcpKTtcblx0XHRjb25zdCBmdW5jID0gbmV3IEZ1bmN0aW9uKGByZXR1cm4gJHtmaWxlRGF0YX07YCk7XG5cdFx0Y29uc3QgZGF0YSA9IGZ1bmMoKTtcblx0XHRjb25zdCByZXN1bHQgPSBkZWNvZGVFbmdpbmVEYXRhMihkYXRhKTtcblx0XHRmcy53cml0ZUZpbGVTeW5jKFxuXHRcdFx0cGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ3Jlc291cmNlcycsICd0ZW1wLmpzJyksXG5cdFx0XHQndmFyIHggPSAnICsgcmVxdWlyZSgndXRpbCcpLmluc3BlY3QocmVzdWx0LCBmYWxzZSwgOTksIGZhbHNlKSwgJ3V0ZjgnKTtcblx0fSk7XG5cblx0aXQuc2tpcCgndGVzdC5wc2QnLCAoKSA9PiB7XG5cdFx0Y29uc3QgYnVmZmVyID0gZnMucmVhZEZpbGVTeW5jKCd0ZXN0LnBzZCcpO1xuXHRcdGNvbnN0IHBzZCA9IHJlYWRQc2RJbnRlcm5hbChjcmVhdGVSZWFkZXJGcm9tQnVmZmVyKGJ1ZmZlciksIHtcblx0XHRcdHNraXBDb21wb3NpdGVJbWFnZURhdGE6IHRydWUsXG5cdFx0XHRza2lwTGF5ZXJJbWFnZURhdGE6IHRydWUsXG5cdFx0XHRza2lwVGh1bWJuYWlsOiB0cnVlLFxuXHRcdFx0dGhyb3dGb3JNaXNzaW5nRmVhdHVyZXM6IHRydWUsXG5cdFx0XHRsb2dEZXZGZWF0dXJlczogdHJ1ZSxcblx0XHR9KTtcblx0XHRkZWxldGUgcHNkLmVuZ2luZURhdGE7XG5cdFx0cHNkLmltYWdlUmVzb3VyY2VzID0ge307XG5cdFx0Y29uc29sZS5sb2cocmVxdWlyZSgndXRpbCcpLmluc3BlY3QocHNkLCBmYWxzZSwgOTksIHRydWUpKTtcblx0fSk7XG5cblx0aXQuc2tpcCgndGVzdCcsICgpID0+IHtcblx0XHRjb25zdCBwc2QgPSByZWFkUHNkSW50ZXJuYWwoY3JlYXRlUmVhZGVyRnJvbUJ1ZmZlcihmcy5yZWFkRmlsZVN5bmMoYHRlc3QvcmVhZC13cml0ZS90ZXh0LWJveC9zcmMucHNkYCkpLCB7XG5cdFx0XHQvLyBza2lwQ29tcG9zaXRlSW1hZ2VEYXRhOiB0cnVlLFxuXHRcdFx0Ly8gc2tpcExheWVySW1hZ2VEYXRhOiB0cnVlLFxuXHRcdFx0Ly8gc2tpcFRodW1ibmFpbDogdHJ1ZSxcblx0XHRcdHRocm93Rm9yTWlzc2luZ0ZlYXR1cmVzOiB0cnVlLFxuXHRcdFx0bG9nRGV2RmVhdHVyZXM6IHRydWUsXG5cdFx0XHR1c2VSYXdUaHVtYm5haWw6IHRydWUsXG5cdFx0fSk7XG5cdFx0ZnMud3JpdGVGaWxlU3luYygndGV4dF9yZWN0X291dC5wc2QnLCB3cml0ZVBzZEJ1ZmZlcihwc2QsIHsgbG9nTWlzc2luZ0ZlYXR1cmVzOiB0cnVlIH0pKTtcblx0XHRmcy53cml0ZUZpbGVTeW5jKCd0ZXh0X3JlY3Rfb3V0LmJpbicsIHdyaXRlUHNkQnVmZmVyKHBzZCwgeyBsb2dNaXNzaW5nRmVhdHVyZXM6IHRydWUgfSkpO1xuXHRcdC8vIGNvbnN0IHBzZDIgPSByZWFkUHNkSW50ZXJuYWwoY3JlYXRlUmVhZGVyRnJvbUJ1ZmZlcihmcy5yZWFkRmlsZVN5bmMoYHRleHRfcmVjdF9vdXQucHNkYCkpLCB7XG5cdFx0Ly8gXHQvLyBza2lwQ29tcG9zaXRlSW1hZ2VEYXRhOiB0cnVlLFxuXHRcdC8vIFx0Ly8gc2tpcExheWVySW1hZ2VEYXRhOiB0cnVlLFxuXHRcdC8vIFx0Ly8gc2tpcFRodW1ibmFpbDogdHJ1ZSxcblx0XHQvLyBcdHRocm93Rm9yTWlzc2luZ0ZlYXR1cmVzOiB0cnVlLFxuXHRcdC8vIFx0bG9nRGV2RmVhdHVyZXM6IHRydWUsXG5cdFx0Ly8gfSk7XG5cdFx0Ly8gcHNkMjtcblx0XHRjb25zdCBvcmlnaW5hbCA9IGZzLnJlYWRGaWxlU3luYyhgdGVzdC9yZWFkLXdyaXRlL3RleHQtYm94L3NyYy5wc2RgKTtcblx0XHRjb25zdCBvdXRwdXQgPSBmcy5yZWFkRmlsZVN5bmMoYHRleHRfcmVjdF9vdXQucHNkYCk7XG5cdFx0Y29tcGFyZUJ1ZmZlcnMob3V0cHV0LCBvcmlnaW5hbCwgJy0nLCAweDY1ZDgpOyAvLyAsIDB4OGNlOCwgMHg4ZmNhIC0gMHg4Y2U4KTtcblx0fSk7XG5cblx0aXQuc2tpcCgnY29tcGFyZSB0ZXN0JywgKCkgPT4ge1xuXHRcdGZvciAoY29uc3QgbmFtZSBvZiBbJ3RleHRfcG9pbnQnLCAndGV4dF9yZWN0J10pIHtcblx0XHRcdGNvbnN0IHBzZCA9IHJlYWRQc2RJbnRlcm5hbChjcmVhdGVSZWFkZXJGcm9tQnVmZmVyKGZzLnJlYWRGaWxlU3luYyhgJHtuYW1lfS5wc2RgKSksIHtcblx0XHRcdFx0c2tpcENvbXBvc2l0ZUltYWdlRGF0YTogdHJ1ZSxcblx0XHRcdFx0c2tpcExheWVySW1hZ2VEYXRhOiB0cnVlLFxuXHRcdFx0XHRza2lwVGh1bWJuYWlsOiB0cnVlLFxuXHRcdFx0XHR0aHJvd0Zvck1pc3NpbmdGZWF0dXJlczogdHJ1ZSxcblx0XHRcdFx0bG9nRGV2RmVhdHVyZXM6IHRydWUsXG5cdFx0XHR9KTtcblx0XHRcdC8vIHBzZC5pbWFnZVJlc291cmNlcyA9IHt9O1xuXHRcdFx0ZnMud3JpdGVGaWxlU3luYyhgJHtuYW1lfS50eHRgLCByZXF1aXJlKCd1dGlsJykuaW5zcGVjdChwc2QsIGZhbHNlLCA5OSwgZmFsc2UpLCAndXRmOCcpO1xuXG5cdFx0XHQvLyBjb25zdCBlbmdpbmVEYXRhID0gcGFyc2VFbmdpbmVEYXRhKHRvQnl0ZUFycmF5KHBzZC5lbmdpbmVEYXRhISkpO1xuXHRcdFx0Ly8gZnMud3JpdGVGaWxlU3luYyhgJHtuYW1lfV9lbmdpbmVkYXRhLnR4dGAsIHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KGVuZ2luZURhdGEsIGZhbHNlLCA5OSwgZmFsc2UpLCAndXRmOCcpO1xuXHRcdH1cblx0fSk7XG5cblx0aXQuc2tpcCgndGV4dC1yZXBsYWNlLnBzZCcsICgpID0+IHtcblx0XHR7XG5cdFx0XHRjb25zdCBidWZmZXIgPSBmcy5yZWFkRmlsZVN5bmMoJ3RleHQtcmVwbGFjZTIucHNkJyk7XG5cdFx0XHRjb25zdCBwc2QgPSByZWFkUHNkSW50ZXJuYWwoY3JlYXRlUmVhZGVyRnJvbUJ1ZmZlcihidWZmZXIpLCB7fSk7XG5cdFx0XHRwc2QuY2hpbGRyZW4hWzFdIS50ZXh0IS50ZXh0ID0gJ0ZvbyBiYXInO1xuXHRcdFx0Y29uc3Qgb3V0cHV0ID0gd3JpdGVQc2RCdWZmZXIocHNkLCB7IGludmFsaWRhdGVUZXh0TGF5ZXJzOiB0cnVlLCBsb2dNaXNzaW5nRmVhdHVyZXM6IHRydWUgfSk7XG5cdFx0XHRmcy53cml0ZUZpbGVTeW5jKCdvdXQucHNkJywgb3V0cHV0KTtcblx0XHR9XG5cblx0XHR7XG5cdFx0XHRjb25zdCBidWZmZXIgPSBmcy5yZWFkRmlsZVN5bmMoJ3RleHQtcmVwbGFjZS5wc2QnKTtcblx0XHRcdGNvbnN0IHBzZCA9IHJlYWRQc2RJbnRlcm5hbChjcmVhdGVSZWFkZXJGcm9tQnVmZmVyKGJ1ZmZlciksIHtcblx0XHRcdFx0c2tpcENvbXBvc2l0ZUltYWdlRGF0YTogdHJ1ZSxcblx0XHRcdFx0c2tpcExheWVySW1hZ2VEYXRhOiB0cnVlLFxuXHRcdFx0XHRza2lwVGh1bWJuYWlsOiB0cnVlLFxuXHRcdFx0XHR0aHJvd0Zvck1pc3NpbmdGZWF0dXJlczogdHJ1ZSxcblx0XHRcdFx0bG9nRGV2RmVhdHVyZXM6IHRydWUsXG5cdFx0XHR9KTtcblx0XHRcdGRlbGV0ZSBwc2QuZW5naW5lRGF0YTtcblx0XHRcdHBzZC5pbWFnZVJlc291cmNlcyA9IHt9O1xuXHRcdFx0cHNkLmNoaWxkcmVuPy5zcGxpY2UoMCwgMSk7XG5cdFx0XHRmcy53cml0ZUZpbGVTeW5jKCdpbnB1dC50eHQnLCByZXF1aXJlKCd1dGlsJykuaW5zcGVjdChwc2QsIGZhbHNlLCA5OSwgZmFsc2UpLCAndXRmOCcpO1xuXHRcdH1cblxuXHRcdHtcblx0XHRcdGNvbnN0IGJ1ZmZlciA9IGZzLnJlYWRGaWxlU3luYygnb3V0LnBzZCcpO1xuXHRcdFx0Y29uc3QgcHNkID0gcmVhZFBzZEludGVybmFsKGNyZWF0ZVJlYWRlckZyb21CdWZmZXIoYnVmZmVyKSwge1xuXHRcdFx0XHRza2lwQ29tcG9zaXRlSW1hZ2VEYXRhOiB0cnVlLFxuXHRcdFx0XHRza2lwTGF5ZXJJbWFnZURhdGE6IHRydWUsXG5cdFx0XHRcdHNraXBUaHVtYm5haWw6IHRydWUsXG5cdFx0XHRcdHRocm93Rm9yTWlzc2luZ0ZlYXR1cmVzOiB0cnVlLFxuXHRcdFx0XHRsb2dEZXZGZWF0dXJlczogdHJ1ZSxcblx0XHRcdH0pO1xuXHRcdFx0ZGVsZXRlIHBzZC5lbmdpbmVEYXRhO1xuXHRcdFx0cHNkLmltYWdlUmVzb3VyY2VzID0ge307XG5cdFx0XHRwc2QuY2hpbGRyZW4/LnNwbGljZSgwLCAxKTtcblx0XHRcdGZzLndyaXRlRmlsZVN5bmMoJ291dHB1dC50eHQnLCByZXF1aXJlKCd1dGlsJykuaW5zcGVjdChwc2QsIGZhbHNlLCA5OSwgZmFsc2UpLCAndXRmOCcpO1xuXHRcdH1cblx0fSk7XG59KTtcblxuZnVuY3Rpb24gY2xlYXJFbXB0eUNhbnZhc0ZpZWxkcyhsYXllcjogTGF5ZXIgfCB1bmRlZmluZWQpIHtcblx0aWYgKGxheWVyKSB7XG5cdFx0aWYgKCdjYW52YXMnIGluIGxheWVyICYmICFsYXllci5jYW52YXMpIGRlbGV0ZSBsYXllci5jYW52YXM7XG5cdFx0aWYgKCdpbWFnZURhdGEnIGluIGxheWVyICYmICFsYXllci5pbWFnZURhdGEpIGRlbGV0ZSBsYXllci5pbWFnZURhdGE7XG5cdFx0bGF5ZXIuY2hpbGRyZW4/LmZvckVhY2goY2xlYXJFbXB0eUNhbnZhc0ZpZWxkcyk7XG5cdH1cbn1cblxuZnVuY3Rpb24gY2xlYXJDYW52YXNGaWVsZHMobGF5ZXI6IExheWVyIHwgdW5kZWZpbmVkKSB7XG5cdGlmIChsYXllcikge1xuXHRcdGRlbGV0ZSBsYXllci5jYW52YXM7XG5cdFx0ZGVsZXRlIGxheWVyLmltYWdlRGF0YTtcblx0XHRpZiAobGF5ZXIubWFzaykgZGVsZXRlIGxheWVyLm1hc2suY2FudmFzO1xuXHRcdGlmIChsYXllci5tYXNrKSBkZWxldGUgbGF5ZXIubWFzay5pbWFnZURhdGE7XG5cdFx0bGF5ZXIuY2hpbGRyZW4/LmZvckVhY2goY2xlYXJDYW52YXNGaWVsZHMpO1xuXHR9XG59XG5cbi8vLyBFbmdpbmUgZGF0YSAyIGV4cGVyaW1lbnRzXG4vLyAvdGVzdC9lbmdpbmVEYXRhMi5qc29uOjExMDkgaXMgY2hhcmFjdGVyIGNvZGVzXG5cbmNvbnN0IGtleXNDb2xvciA9IHtcblx0JzAnOiB7XG5cdFx0dXByb290OiB0cnVlLFxuXHRcdGNoaWxkcmVuOiB7XG5cdFx0XHQnMCc6IHsgbmFtZTogJ1R5cGUnIH0sXG5cdFx0XHQnMSc6IHsgbmFtZTogJ1ZhbHVlcycgfSxcblx0XHR9LFxuXHR9LFxufTtcblxuY29uc3Qga2V5c1N0eWxlU2hlZXQgPSB7XG5cdCcwJzogeyBuYW1lOiAnRm9udCcgfSxcblx0JzEnOiB7IG5hbWU6ICdGb250U2l6ZScgfSxcblx0JzInOiB7IG5hbWU6ICdGYXV4Qm9sZCcgfSxcblx0JzMnOiB7IG5hbWU6ICdGYXV4SXRhbGljJyB9LFxuXHQnNCc6IHsgbmFtZTogJ0F1dG9MZWFkaW5nJyB9LFxuXHQnNSc6IHsgbmFtZTogJ0xlYWRpbmcnIH0sXG5cdCc2JzogeyBuYW1lOiAnSG9yaXpvbnRhbFNjYWxlJyB9LFxuXHQnNyc6IHsgbmFtZTogJ1ZlcnRpY2FsU2NhbGUnIH0sXG5cdCc4JzogeyBuYW1lOiAnVHJhY2tpbmcnIH0sXG5cdCc5JzogeyBuYW1lOiAnQmFzZWxpbmVTaGlmdCcgfSxcblxuXHQnMTEnOiB7IG5hbWU6ICdLZXJuaW5nPycgfSwgLy8gZGlmZmVyZW50IHZhbHVlIHRoYW4gRW5naW5lRGF0YVxuXHQnMTInOiB7IG5hbWU6ICdGb250Q2FwcycgfSxcblx0JzEzJzogeyBuYW1lOiAnRm9udEJhc2VsaW5lJyB9LFxuXG5cdCcxNSc6IHsgbmFtZTogJ1N0cmlrZXRocm91Z2g/JyB9LCAvLyBudW1iZXIgaW5zdGVhZCBvZiBib29sXG5cdCcxNic6IHsgbmFtZTogJ1VuZGVybGluZT8nIH0sIC8vIG51bWJlciBpbnN0ZWFkIG9mIGJvb2xcblxuXHQnMTgnOiB7IG5hbWU6ICdMaWdhdHVyZXMnIH0sXG5cdCcxOSc6IHsgbmFtZTogJ0RMaWdhdHVyZXMnIH0sXG5cblx0JzIzJzogeyBuYW1lOiAnRnJhY3Rpb25zJyB9LCAvLyBub3QgcHJlc2VudCBpbiBFbmdpbmVEYXRhXG5cdCcyNCc6IHsgbmFtZTogJ09yZGluYWxzJyB9LCAvLyBub3QgcHJlc2VudCBpbiBFbmdpbmVEYXRhXG5cblx0JzI4JzogeyBuYW1lOiAnU3R5bGlzdGljQWx0ZXJuYXRlcycgfSwgLy8gbm90IHByZXNlbnQgaW4gRW5naW5lRGF0YVxuXG5cdCczMCc6IHsgbmFtZTogJ09sZFN0eWxlPycgfSwgLy8gT3BlblR5cGUgPiBPbGRTdHlsZSwgbnVtYmVyIGluc3RlYWQgb2YgYm9vbCwgbm90IHByZXNlbnQgaW4gRW5naW5lRGF0YVxuXG5cdCczNSc6IHsgbmFtZTogJ0Jhc2VsaW5lRGlyZWN0aW9uJyB9LFxuXG5cdCczOCc6IHsgbmFtZTogJ0xhbmd1YWdlJyB9LFxuXG5cdCc1Mic6IHsgbmFtZTogJ05vQnJlYWsnIH0sXG5cdCc1Myc6IHsgbmFtZTogJ0ZpbGxDb2xvcicsIGNoaWxkcmVuOiBrZXlzQ29sb3IgfSxcbn07XG5cbmNvbnN0IGtleXNQYXJhZ3JhcGggPSB7XG5cdCcwJzogeyBuYW1lOiAnSnVzdGlmaWNhdGlvbicgfSxcblx0JzEnOiB7IG5hbWU6ICdGaXJzdExpbmVJbmRlbnQnIH0sXG5cdCcyJzogeyBuYW1lOiAnU3RhcnRJbmRlbnQnIH0sXG5cdCczJzogeyBuYW1lOiAnRW5kSW5kZW50JyB9LFxuXHQnNCc6IHsgbmFtZTogJ1NwYWNlQmVmb3JlJyB9LFxuXHQnNSc6IHsgbmFtZTogJ1NwYWNlQWZ0ZXInIH0sXG5cblx0JzcnOiB7IG5hbWU6ICdBdXRvTGVhZGluZycgfSxcblxuXHQnOSc6IHsgbmFtZTogJ0F1dG9IeXBoZW5hdGUnIH0sXG5cdCcxMCc6IHsgbmFtZTogJ0h5cGhlbmF0ZWRXb3JkU2l6ZScgfSxcblx0JzExJzogeyBuYW1lOiAnUHJlSHlwaGVuJyB9LFxuXHQnMTInOiB7IG5hbWU6ICdQb3N0SHlwaGVuJyB9LFxuXHQnMTMnOiB7IG5hbWU6ICdDb25zZWN1dGl2ZUh5cGhlbnM/JyB9LCAvLyBkaWZmZXJlbnQgdmFsdWUgdGhhbiBFbmdpbmVEYXRhXG5cdCcxNCc6IHsgbmFtZTogJ1pvbmUnIH0sXG5cdCcxNSc6IHsgbmFtZTogJ0h5cGVuYXRlQ2FwaXRhbGl6ZWRXb3JkcycgfSwgLy8gbm90IHByZXNlbnQgaW4gRW5naW5lRGF0YVxuXG5cdCcxNyc6IHsgbmFtZTogJ1dvcmRTcGFjaW5nJyB9LFxuXHQnMTgnOiB7IG5hbWU6ICdMZXR0ZXJTcGFjaW5nJyB9LFxuXHQnMTknOiB7IG5hbWU6ICdHbHlwaFNwYWNpbmcnIH0sXG5cblx0JzMyJzogeyBuYW1lOiAnU3R5bGVTaGVldCcsIGNoaWxkcmVuOiBrZXlzU3R5bGVTaGVldCB9LFxufTtcblxuY29uc3Qga2V5c1N0eWxlU2hlZXREYXRhID0ge1xuXHRuYW1lOiAnU3R5bGVTaGVldERhdGEnLFxuXHRjaGlsZHJlbjoga2V5c1N0eWxlU2hlZXQsXG59O1xuXG5jb25zdCBrZXlzID0ge1xuXHQnMCc6IHtcblx0XHRuYW1lOiAnUmVzb3VyY2VEaWN0Jyxcblx0XHRjaGlsZHJlbjoge1xuXHRcdFx0JzEnOiB7XG5cdFx0XHRcdG5hbWU6ICdGb250U2V0Jyxcblx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHQnMCc6IHtcblx0XHRcdFx0XHRcdHVwcm9vdDogdHJ1ZSxcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiB7XG5cdFx0XHRcdFx0XHRcdCcwJzoge1xuXHRcdFx0XHRcdFx0XHRcdHVwcm9vdDogdHJ1ZSxcblx0XHRcdFx0XHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdFx0XHRcdFx0JzAnOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHVwcm9vdDogdHJ1ZSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnMCc6IHsgbmFtZTogJ05hbWUnIH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0JzInOiB7IG5hbWU6ICdGb250VHlwZScgfSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdCcyJzoge1xuXHRcdFx0XHRuYW1lOiAnMicsXG5cdFx0XHRcdGNoaWxkcmVuOiB7fSxcblx0XHRcdH0sXG5cdFx0XHQnMyc6IHtcblx0XHRcdFx0bmFtZTogJ01vamlLdW1pU2V0Jyxcblx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHQnMCc6IHtcblx0XHRcdFx0XHRcdHVwcm9vdDogdHJ1ZSxcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiB7XG5cdFx0XHRcdFx0XHRcdCcwJzoge1xuXHRcdFx0XHRcdFx0XHRcdHVwcm9vdDogdHJ1ZSxcblx0XHRcdFx0XHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdFx0XHRcdFx0JzAnOiB7IG5hbWU6ICdJbnRlcm5hbE5hbWUnIH0sXG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHQnNCc6IHtcblx0XHRcdFx0bmFtZTogJ0tpbnNva3VTZXQnLFxuXHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdCcwJzoge1xuXHRcdFx0XHRcdFx0dXByb290OiB0cnVlLFxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHRcdFx0JzAnOiB7XG5cdFx0XHRcdFx0XHRcdFx0dXByb290OiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHQnMCc6IHsgbmFtZTogJ05hbWUnIH0sXG5cdFx0XHRcdFx0XHRcdFx0XHQnNSc6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0dXByb290OiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCcwJzogeyBuYW1lOiAnTm9TdGFydCcgfSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnMSc6IHsgbmFtZTogJ05vRW5kJyB9LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCcyJzogeyBuYW1lOiAnS2VlcCcgfSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnMyc6IHsgbmFtZTogJ0hhbmdpbmcnIH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0JzUnOiB7XG5cdFx0XHRcdG5hbWU6ICdTdHlsZVNoZWV0U2V0Jyxcblx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHQnMCc6IHtcblx0XHRcdFx0XHRcdHVwcm9vdDogdHJ1ZSxcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiB7XG5cdFx0XHRcdFx0XHRcdCcwJzoge1xuXHRcdFx0XHRcdFx0XHRcdHVwcm9vdDogdHJ1ZSxcblx0XHRcdFx0XHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdFx0XHRcdFx0JzAnOiB7IG5hbWU6ICdOYW1lJyB9LFxuXHRcdFx0XHRcdFx0XHRcdFx0JzYnOiBrZXlzU3R5bGVTaGVldERhdGEsXG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHQnNic6IHtcblx0XHRcdFx0bmFtZTogJ1BhcmFncmFwaFNoZWV0U2V0Jyxcblx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHQnMCc6IHtcblx0XHRcdFx0XHRcdHVwcm9vdDogdHJ1ZSxcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiB7XG5cdFx0XHRcdFx0XHRcdCcwJzoge1xuXHRcdFx0XHRcdFx0XHRcdHVwcm9vdDogdHJ1ZSxcblx0XHRcdFx0XHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdFx0XHRcdFx0JzAnOiB7IG5hbWU6ICdOYW1lJyB9LFxuXHRcdFx0XHRcdFx0XHRcdFx0JzUnOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG5hbWU6ICdQcm9wZXJ0aWVzJyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y2hpbGRyZW46IGtleXNQYXJhZ3JhcGgsXG5cdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdFx0JzYnOiB7IG5hbWU6ICdEZWZhdWx0U3R5bGVTaGVldCcgfSxcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdCc4Jzoge1xuXHRcdFx0XHRuYW1lOiAnOCcsXG5cdFx0XHRcdGNoaWxkcmVuOiB7fSxcblx0XHRcdH0sXG5cdFx0XHQnOSc6IHtcblx0XHRcdFx0bmFtZTogJ1ByZWRlZmluZWQnLFxuXHRcdFx0XHRjaGlsZHJlbjoge30sXG5cdFx0XHR9LFxuXHRcdH0sXG5cdH0sXG5cdCcxJzoge1xuXHRcdG5hbWU6ICdFbmdpbmVEaWN0Jyxcblx0XHRjaGlsZHJlbjoge1xuXHRcdFx0JzAnOiB7XG5cdFx0XHRcdG5hbWU6ICcwJyxcblx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHQnMCc6IHtcblx0XHRcdFx0XHRcdG5hbWU6ICcwJyxcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiB7XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0JzMnOiB7IG5hbWU6ICdTdXBlcnNjcmlwdFNpemUnIH0sXG5cdFx0XHRcdFx0JzQnOiB7IG5hbWU6ICdTdXBlcnNjcmlwdFBvc2l0aW9uJyB9LFxuXHRcdFx0XHRcdCc1JzogeyBuYW1lOiAnU3Vic2NyaXB0U2l6ZScgfSxcblx0XHRcdFx0XHQnNic6IHsgbmFtZTogJ1N1YnNjcmlwdFBvc2l0aW9uJyB9LFxuXHRcdFx0XHRcdCc3JzogeyBuYW1lOiAnU21hbGxDYXBTaXplJyB9LFxuXHRcdFx0XHRcdCc4JzogeyBuYW1lOiAnVXNlRnJhY3Rpb25hbEdseXBoV2lkdGhzJyB9LCAvLyA/Pz9cblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHQnMSc6IHtcblx0XHRcdFx0bmFtZTogJ0VkaXRvcnM/Jyxcblx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHQnMCc6IHtcblx0XHRcdFx0XHRcdG5hbWU6ICdFZGl0b3InLFxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHRcdFx0JzAnOiB7IG5hbWU6ICdUZXh0JyB9LFxuXHRcdFx0XHRcdFx0XHQnNSc6IHtcblx0XHRcdFx0XHRcdFx0XHRuYW1lOiAnUGFyYWdyYXBoUnVuJyxcblx0XHRcdFx0XHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdFx0XHRcdFx0JzAnOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG5hbWU6ICdSdW5BcnJheScsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0JzAnOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRuYW1lOiAnUGFyYWdyYXBoU2hlZXQnLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0JzAnOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dXByb290OiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnMCc6IHsgbmFtZTogJzAnIH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnNSc6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0bmFtZTogJzUnLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjaGlsZHJlbjoga2V5c1BhcmFncmFwaCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnNic6IHsgbmFtZTogJzYnIH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnMSc6IHsgbmFtZTogJ1J1bkxlbmd0aCcgfSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0JzYnOiB7XG5cdFx0XHRcdFx0XHRcdFx0bmFtZTogJ1N0eWxlUnVuJyxcblx0XHRcdFx0XHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdFx0XHRcdFx0JzAnOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG5hbWU6ICdSdW5BcnJheScsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0JzAnOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRuYW1lOiAnU3R5bGVTaGVldCcsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjaGlsZHJlbjoge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnMCc6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR1cHJvb3Q6IHRydWUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y2hpbGRyZW46IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCc2Jzoga2V5c1N0eWxlU2hlZXREYXRhLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0JzEnOiB7IG5hbWU6ICdSdW5MZW5ndGgnIH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0JzEnOiB7XG5cdFx0XHRcdFx0XHRuYW1lOiAnRm9udFZlY3RvckRhdGEgPz8/Jyxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdCcyJzoge1xuXHRcdFx0XHRuYW1lOiAnU3R5bGVTaGVldCcsXG5cdFx0XHRcdGNoaWxkcmVuOiBrZXlzU3R5bGVTaGVldCxcblx0XHRcdH0sXG5cdFx0XHQnMyc6IHtcblx0XHRcdFx0bmFtZTogJ1BhcmFncmFwaFNoZWV0Jyxcblx0XHRcdFx0Y2hpbGRyZW46IGtleXNQYXJhZ3JhcGgsXG5cdFx0XHR9LFxuXHRcdH0sXG5cdH0sXG59O1xuXG5mdW5jdGlvbiBkZWNvZGVPYmoob2JqOiBhbnksIGtleXM6IGFueSk6IGFueSB7XG5cdGlmIChvYmogPT09IG51bGwgfHwgIWtleXMpIHJldHVybiBvYmo7XG5cblx0aWYgKEFycmF5LmlzQXJyYXkob2JqKSkge1xuXHRcdHJldHVybiBvYmoubWFwKHggPT4gZGVjb2RlT2JqKHgsIGtleXMpKTtcblx0fVxuXG5cdGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0JykgcmV0dXJuIG9iajtcblxuXHRjb25zdCByZXN1bHQ6IGFueSA9IHt9O1xuXG5cdGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG9iaikpIHtcblx0XHRpZiAoa2V5c1trZXldKSB7XG5cdFx0XHRpZiAoa2V5c1trZXldLnVwcm9vdCkge1xuXHRcdFx0XHRyZXR1cm4gZGVjb2RlT2JqKG9ialtrZXldLCBrZXlzW2tleV0uY2hpbGRyZW4pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmVzdWx0W2tleXNba2V5XS5uYW1lXSA9IGRlY29kZU9iaihvYmpba2V5XSwga2V5c1trZXldLmNoaWxkcmVuKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzdWx0W2tleV0gPSBvYmpba2V5XTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBkZWNvZGVFbmdpbmVEYXRhMihkYXRhOiBhbnkpIHtcblx0cmV0dXJuIGRlY29kZU9iaihkYXRhLCBrZXlzKTtcbn1cbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL2JyYW5kb25saXUvRGVza3RvcC9za3lsYWIvYWctcHNkL3NyYyJ9
