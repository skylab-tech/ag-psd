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
exports.readPattern = exports.readColor = exports.readSection = exports.readDataRLE = exports.readPsd = exports.checkSignature = exports.skipBytes = exports.readAsciiString = exports.readUnicodeStringWithLength = exports.readUnicodeString = exports.readPascalString = exports.readSignature = exports.readBytes = exports.readFixedPointPath32 = exports.readFixedPoint32 = exports.readFloat64 = exports.readFloat32 = exports.readUint32 = exports.readInt32LE = exports.readInt32 = exports.readUint16 = exports.readInt16 = exports.peekUint8 = exports.readUint8 = exports.createReader = exports.supportedColorModes = void 0;
var helpers_1 = require("./helpers");
var additionalInfo_1 = require("./additionalInfo");
var imageResources_1 = require("./imageResources");
exports.supportedColorModes = [0 /* Bitmap */, 1 /* Grayscale */, 3 /* RGB */];
var colorModes = ['bitmap', 'grayscale', 'indexed', 'RGB', 'CMYK', 'multichannel', 'duotone', 'lab'];
function setupGrayscale(data) {
    var size = data.width * data.height * 4;
    for (var i = 0; i < size; i += 4) {
        data.data[i + 1] = data.data[i];
        data.data[i + 2] = data.data[i];
    }
}
function createReader(buffer, offset, length) {
    var view = new DataView(buffer, offset, length);
    return { view: view, offset: 0, strict: false };
}
exports.createReader = createReader;
function readUint8(reader) {
    reader.offset += 1;
    return reader.view.getUint8(reader.offset - 1);
}
exports.readUint8 = readUint8;
function peekUint8(reader) {
    return reader.view.getUint8(reader.offset);
}
exports.peekUint8 = peekUint8;
function readInt16(reader) {
    reader.offset += 2;
    return reader.view.getInt16(reader.offset - 2, false);
}
exports.readInt16 = readInt16;
function readUint16(reader) {
    reader.offset += 2;
    return reader.view.getUint16(reader.offset - 2, false);
}
exports.readUint16 = readUint16;
function readInt32(reader) {
    reader.offset += 4;
    return reader.view.getInt32(reader.offset - 4, false);
}
exports.readInt32 = readInt32;
function readInt32LE(reader) {
    reader.offset += 4;
    return reader.view.getInt32(reader.offset - 4, true);
}
exports.readInt32LE = readInt32LE;
function readUint32(reader) {
    reader.offset += 4;
    return reader.view.getUint32(reader.offset - 4, false);
}
exports.readUint32 = readUint32;
function readFloat32(reader) {
    reader.offset += 4;
    return reader.view.getFloat32(reader.offset - 4, false);
}
exports.readFloat32 = readFloat32;
function readFloat64(reader) {
    reader.offset += 8;
    return reader.view.getFloat64(reader.offset - 8, false);
}
exports.readFloat64 = readFloat64;
// 32-bit fixed-point number 16.16
function readFixedPoint32(reader) {
    return readInt32(reader) / (1 << 16);
}
exports.readFixedPoint32 = readFixedPoint32;
// 32-bit fixed-point number 8.24
function readFixedPointPath32(reader) {
    return readInt32(reader) / (1 << 24);
}
exports.readFixedPointPath32 = readFixedPointPath32;
function readBytes(reader, length) {
    reader.offset += length;
    return new Uint8Array(reader.view.buffer, reader.view.byteOffset + reader.offset - length, length);
}
exports.readBytes = readBytes;
function readSignature(reader) {
    return readShortString(reader, 4);
}
exports.readSignature = readSignature;
function readPascalString(reader, padTo) {
    var length = readUint8(reader);
    var text = length ? readShortString(reader, length) : '';
    while (++length % padTo) {
        reader.offset++;
    }
    return text;
}
exports.readPascalString = readPascalString;
function readUnicodeString(reader) {
    var length = readUint32(reader);
    return readUnicodeStringWithLength(reader, length);
}
exports.readUnicodeString = readUnicodeString;
function readUnicodeStringWithLength(reader, length) {
    var text = '';
    while (length--) {
        var value = readUint16(reader);
        if (value || length > 0) { // remove trailing \0
            text += String.fromCharCode(value);
        }
    }
    return text;
}
exports.readUnicodeStringWithLength = readUnicodeStringWithLength;
function readAsciiString(reader, length) {
    var text = '';
    while (length--) {
        text += String.fromCharCode(readUint8(reader));
    }
    return text;
}
exports.readAsciiString = readAsciiString;
function skipBytes(reader, count) {
    reader.offset += count;
}
exports.skipBytes = skipBytes;
function checkSignature(reader, a, b) {
    var offset = reader.offset;
    var signature = readSignature(reader);
    if (signature !== a && signature !== b) {
        throw new Error("Invalid signature: '" + signature + "' at 0x" + offset.toString(16));
    }
}
exports.checkSignature = checkSignature;
function readShortString(reader, length) {
    var buffer = readBytes(reader, length);
    var result = '';
    for (var i = 0; i < buffer.length; i++) {
        result += String.fromCharCode(buffer[i]);
    }
    return result;
}
function readPsd(reader, options) {
    var _a;
    if (options === void 0) { options = {}; }
    // header
    checkSignature(reader, '8BPS');
    var version = readUint16(reader);
    if (version !== 1 && version !== 2)
        throw new Error("Invalid PSD file version: " + version);
    skipBytes(reader, 6);
    var channels = readUint16(reader);
    var height = readUint32(reader);
    var width = readUint32(reader);
    var bitsPerChannel = readUint16(reader);
    var colorMode = readUint16(reader);
    if (exports.supportedColorModes.indexOf(colorMode) === -1)
        throw new Error("Color mode not supported: " + ((_a = colorModes[colorMode]) !== null && _a !== void 0 ? _a : colorMode));
    var psd = { width: width, height: height, channels: channels, bitsPerChannel: bitsPerChannel, colorMode: colorMode };
    var opt = __assign(__assign({}, options), { large: version === 2 });
    // color mode data
    readSection(reader, 1, function (left) {
        if (opt.throwForMissingFeatures)
            throw new Error('Color mode data not supported');
        skipBytes(reader, left());
    });
    // image resources
    readSection(reader, 1, function (left) {
        var _loop_1 = function () {
            var sig = readSignature(reader);
            if (sig !== '8BIM' && sig !== 'MeSa' && sig !== 'AgHg' && sig !== 'PHUT' && sig !== 'DCSR') {
                throw new Error("Invalid signature: '" + sig + "' at 0x" + (reader.offset - 4).toString(16));
            }
            var id = readUint16(reader);
            readPascalString(reader, 2); // name
            readSection(reader, 2, function (left) {
                var handler = imageResources_1.resourceHandlersMap[id];
                var skip = id === 1036 && !!opt.skipThumbnail;
                if (!psd.imageResources) {
                    psd.imageResources = {};
                }
                if (handler && !skip) {
                    try {
                        handler.read(reader, psd.imageResources, left, opt);
                    }
                    catch (e) {
                        if (opt.throwForMissingFeatures)
                            throw e;
                        skipBytes(reader, left());
                    }
                }
                else {
                    // options.logMissingFeatures && console.log(`Unhandled image resource: ${id}`);
                    skipBytes(reader, left());
                }
            });
        };
        while (left()) {
            _loop_1();
        }
    });
    // layer and mask info
    var globalAlpha = false;
    readSection(reader, 1, function (left) {
        globalAlpha = readLayerInfo(reader, psd, opt);
        // SAI does not include this section
        if (left() > 0) {
            var globalLayerMaskInfo = readGlobalLayerMaskInfo(reader);
            if (globalLayerMaskInfo)
                psd.globalLayerMaskInfo = globalLayerMaskInfo;
        }
        else {
            // revert back to end of section if exceeded section limits
            // opt.logMissingFeatures && console.log('reverting to end of section');
            skipBytes(reader, left());
        }
        while (left() > 0) {
            // sometimes there are empty bytes here
            while (left() && peekUint8(reader) === 0) {
                // opt.logMissingFeatures && console.log('skipping 0 byte');
                skipBytes(reader, 1);
            }
            if (left() >= 12) {
                readAdditionalLayerInfo(reader, psd, psd, opt);
            }
            else {
                // opt.logMissingFeatures && console.log('skipping leftover bytes', left());
                skipBytes(reader, left());
            }
        }
    }, undefined, opt.large);
    var hasChildren = psd.children && psd.children.length;
    var skipComposite = opt.skipCompositeImageData && (opt.skipLayerImageData || hasChildren);
    if (!skipComposite) {
        readImageData(reader, psd, globalAlpha, opt);
    }
    // TODO: show converted color mode instead of original PSD file color mode
    //       but add option to preserve file color mode (need to return image data instead of canvas in that case)
    // psd.colorMode = ColorMode.RGB; // we convert all color modes to RGB
    return psd;
}
exports.readPsd = readPsd;
function readLayerInfo(reader, psd, options) {
    var globalAlpha = false;
    readSection(reader, 2, function (left) {
        var layerCount = readInt16(reader);
        if (layerCount < 0) {
            globalAlpha = true;
            layerCount = -layerCount;
        }
        var layers = [];
        var layerChannels = [];
        for (var i = 0; i < layerCount; i++) {
            var _a = readLayerRecord(reader, psd, options), layer = _a.layer, channels = _a.channels;
            layers.push(layer);
            layerChannels.push(channels);
        }
        if (!options.skipLayerImageData) {
            for (var i = 0; i < layerCount; i++) {
                readLayerChannelImageData(reader, psd, layers[i], layerChannels[i], options);
            }
        }
        skipBytes(reader, left());
        if (!psd.children)
            psd.children = [];
        var stack = [psd];
        for (var i = layers.length - 1; i >= 0; i--) {
            var l = layers[i];
            var type = l.sectionDivider ? l.sectionDivider.type : 0 /* Other */;
            if (type === 1 /* OpenFolder */ || type === 2 /* ClosedFolder */) {
                l.opened = type === 1 /* OpenFolder */;
                l.children = [];
                stack[stack.length - 1].children.unshift(l);
                stack.push(l);
            }
            else if (type === 3 /* BoundingSectionDivider */) {
                stack.pop();
                // this was workaround because I didn't know what `lsdk` section was, now it's probably not needed anymore
                // } else if (l.name === '</Layer group>' && !l.sectionDivider && !l.top && !l.left && !l.bottom && !l.right) {
                // 	// sometimes layer group terminator doesn't have sectionDivider, so we just guess here (PS bug ?)
                // 	stack.pop();
            }
            else {
                stack[stack.length - 1].children.unshift(l);
            }
        }
    }, undefined, options.large);
    return globalAlpha;
}
function readLayerRecord(reader, psd, options) {
    var layer = {};
    layer.top = readInt32(reader);
    layer.left = readInt32(reader);
    layer.bottom = readInt32(reader);
    layer.right = readInt32(reader);
    var channelCount = readUint16(reader);
    var channels = [];
    for (var i = 0; i < channelCount; i++) {
        var channelID = readInt16(reader);
        var channelLength = readUint32(reader);
        if (options.large) {
            if (channelLength !== 0)
                throw new Error('Sizes larger than 4GB are not supported');
            channelLength = readUint32(reader);
        }
        channels.push({ id: channelID, length: channelLength });
    }
    checkSignature(reader, '8BIM');
    var blendMode = readSignature(reader);
    if (!helpers_1.toBlendMode[blendMode])
        throw new Error("Invalid blend mode: '" + blendMode + "'");
    layer.blendMode = helpers_1.toBlendMode[blendMode];
    layer.opacity = readUint8(reader) / 0xff;
    layer.clipping = readUint8(reader) === 1;
    var flags = readUint8(reader);
    layer.transparencyProtected = (flags & 0x01) !== 0;
    layer.hidden = (flags & 0x02) !== 0;
    // 0x04 - obsolete
    // 0x08 - 1 for Photoshop 5.0 and later, tells if bit 4 has useful information
    // 0x10 - pixel data irrelevant to appearance of document
    // 0x20 - ???
    // if (flags & 0x20) (layer as any)._2 = true; // TEMP !!!!
    skipBytes(reader, 1);
    readSection(reader, 1, function (left) {
        var mask = readLayerMaskData(reader, options);
        if (mask)
            layer.mask = mask;
        /*const blendingRanges =*/ readLayerBlendingRanges(reader);
        layer.name = readPascalString(reader, 4);
        while (left()) {
            readAdditionalLayerInfo(reader, layer, psd, options);
        }
    });
    return { layer: layer, channels: channels };
}
function readLayerMaskData(reader, options) {
    return readSection(reader, 1, function (left) {
        if (!left())
            return undefined;
        var mask = {};
        mask.top = readInt32(reader);
        mask.left = readInt32(reader);
        mask.bottom = readInt32(reader);
        mask.right = readInt32(reader);
        mask.defaultColor = readUint8(reader);
        var flags = readUint8(reader);
        mask.positionRelativeToLayer = (flags & 1 /* PositionRelativeToLayer */) !== 0;
        mask.disabled = (flags & 2 /* LayerMaskDisabled */) !== 0;
        mask.fromVectorData = (flags & 8 /* LayerMaskFromRenderingOtherData */) !== 0;
        if (flags & 16 /* MaskHasParametersAppliedToIt */) {
            var params = readUint8(reader);
            if (params & 1 /* UserMaskDensity */)
                mask.userMaskDensity = readUint8(reader) / 0xff;
            if (params & 2 /* UserMaskFeather */)
                mask.userMaskFeather = readFloat64(reader);
            if (params & 4 /* VectorMaskDensity */)
                mask.vectorMaskDensity = readUint8(reader) / 0xff;
            if (params & 8 /* VectorMaskFeather */)
                mask.vectorMaskFeather = readFloat64(reader);
        }
        if (left() > 2) {
            options.logMissingFeatures && console.log('Unhandled extra mask params');
            // TODO: handle these values
            /*const realFlags =*/ readUint8(reader);
            /*const realUserMaskBackground =*/ readUint8(reader);
            /*const top2 =*/ readInt32(reader);
            /*const left2 =*/ readInt32(reader);
            /*const bottom2 =*/ readInt32(reader);
            /*const right2 =*/ readInt32(reader);
        }
        skipBytes(reader, left());
        return mask;
    });
}
function readLayerBlendingRanges(reader) {
    return readSection(reader, 1, function (left) {
        var compositeGrayBlendSource = readUint32(reader);
        var compositeGraphBlendDestinationRange = readUint32(reader);
        var ranges = [];
        while (left()) {
            var sourceRange = readUint32(reader);
            var destRange = readUint32(reader);
            ranges.push({ sourceRange: sourceRange, destRange: destRange });
        }
        return { compositeGrayBlendSource: compositeGrayBlendSource, compositeGraphBlendDestinationRange: compositeGraphBlendDestinationRange, ranges: ranges };
    });
}
function readLayerChannelImageData(reader, psd, layer, channels, options) {
    var layerWidth = (layer.right || 0) - (layer.left || 0);
    var layerHeight = (layer.bottom || 0) - (layer.top || 0);
    var cmyk = psd.colorMode === 4 /* CMYK */;
    var imageData;
    if (layerWidth && layerHeight) {
        if (cmyk) {
            imageData = { width: layerWidth, height: layerHeight, data: new Uint8ClampedArray(layerWidth * layerHeight * 5) };
            for (var p = 4; p < imageData.data.byteLength; p += 5)
                imageData.data[p] = 255;
        }
        else {
            imageData = helpers_1.createImageData(layerWidth, layerHeight);
            helpers_1.resetImageData(imageData);
        }
    }
    if (helpers_1.RAW_IMAGE_DATA)
        layer.imageDataRaw = [];
    for (var _i = 0, channels_1 = channels; _i < channels_1.length; _i++) {
        var channel = channels_1[_i];
        var compression = readUint16(reader);
        if (channel.id === -2 /* UserMask */) {
            var mask = layer.mask;
            if (!mask)
                throw new Error("Missing layer mask data");
            var maskWidth = (mask.right || 0) - (mask.left || 0);
            var maskHeight = (mask.bottom || 0) - (mask.top || 0);
            if (maskWidth && maskHeight) {
                var maskData = helpers_1.createImageData(maskWidth, maskHeight);
                helpers_1.resetImageData(maskData);
                var start = reader.offset;
                readData(reader, maskData, compression, maskWidth, maskHeight, 0, options.large, 4);
                if (helpers_1.RAW_IMAGE_DATA) {
                    layer.maskDataRaw = new Uint8Array(reader.view.buffer, reader.view.byteOffset + start, reader.offset - start);
                }
                setupGrayscale(maskData);
                if (options.useImageData) {
                    mask.imageData = maskData;
                }
                else {
                    mask.canvas = helpers_1.createCanvas(maskWidth, maskHeight);
                    mask.canvas.getContext('2d').putImageData(maskData, 0, 0);
                }
            }
        }
        else {
            var offset = helpers_1.offsetForChannel(channel.id, cmyk);
            var targetData = imageData;
            if (offset < 0) {
                targetData = undefined;
                if (options.throwForMissingFeatures) {
                    throw new Error("Channel not supported: " + channel.id);
                }
            }
            var start = reader.offset;
            readData(reader, targetData, compression, layerWidth, layerHeight, offset, options.large, cmyk ? 5 : 4);
            if (helpers_1.RAW_IMAGE_DATA) {
                layer.imageDataRaw[channel.id] = new Uint8Array(reader.view.buffer, reader.view.byteOffset + start, reader.offset - start);
            }
            if (targetData && psd.colorMode === 1 /* Grayscale */) {
                setupGrayscale(targetData);
            }
        }
    }
    if (imageData) {
        if (cmyk) {
            var cmykData = imageData;
            imageData = helpers_1.createImageData(cmykData.width, cmykData.height);
            cmykToRgb(cmykData, imageData, false);
        }
        if (options.useImageData) {
            layer.imageData = imageData;
        }
        else {
            layer.canvas = helpers_1.createCanvas(layerWidth, layerHeight);
            layer.canvas.getContext('2d').putImageData(imageData, 0, 0);
        }
    }
}
function readData(reader, data, compression, width, height, offset, large, step) {
    if (compression === 0 /* RawData */) {
        readDataRaw(reader, data, offset, width, height, step);
    }
    else if (compression === 1 /* RleCompressed */) {
        readDataRLE(reader, data, width, height, step, [offset], large);
    }
    else {
        throw new Error("Compression type not supported: " + compression);
    }
}
function readGlobalLayerMaskInfo(reader) {
    return readSection(reader, 1, function (left) {
        if (!left())
            return undefined;
        var overlayColorSpace = readUint16(reader);
        var colorSpace1 = readUint16(reader);
        var colorSpace2 = readUint16(reader);
        var colorSpace3 = readUint16(reader);
        var colorSpace4 = readUint16(reader);
        var opacity = readUint16(reader) / 0xff;
        var kind = readUint8(reader);
        skipBytes(reader, left()); // 3 bytes of padding ?
        return { overlayColorSpace: overlayColorSpace, colorSpace1: colorSpace1, colorSpace2: colorSpace2, colorSpace3: colorSpace3, colorSpace4: colorSpace4, opacity: opacity, kind: kind };
    });
}
function readAdditionalLayerInfo(reader, target, psd, options) {
    var sig = readSignature(reader);
    if (sig !== '8BIM' && sig !== '8B64')
        throw new Error("Invalid signature: '" + sig + "' at 0x" + (reader.offset - 4).toString(16));
    var key = readSignature(reader);
    // `largeAdditionalInfoKeys` fallback, because some keys don't have 8B64 signature even when they are 64bit
    var u64 = sig === '8B64' || (options.large && helpers_1.largeAdditionalInfoKeys.indexOf(key) !== -1);
    readSection(reader, 2, function (left) {
        var handler = additionalInfo_1.infoHandlersMap[key];
        if (handler) {
            try {
                handler.read(reader, target, left, psd, options);
            }
            catch (e) {
                if (options.throwForMissingFeatures)
                    throw e;
            }
        }
        else {
            options.logMissingFeatures && console.log("Unhandled additional info: " + key);
            skipBytes(reader, left());
        }
        if (left()) {
            options.logMissingFeatures && console.log("Unread " + left() + " bytes left for additional info: " + key);
            skipBytes(reader, left());
        }
    }, false, u64);
}
function readImageData(reader, psd, globalAlpha, options) {
    var compression = readUint16(reader);
    if (exports.supportedColorModes.indexOf(psd.colorMode) === -1)
        throw new Error("Color mode not supported: " + psd.colorMode);
    if (compression !== 0 /* RawData */ && compression !== 1 /* RleCompressed */)
        throw new Error("Compression type not supported: " + compression);
    var imageData = helpers_1.createImageData(psd.width, psd.height);
    helpers_1.resetImageData(imageData);
    switch (psd.colorMode) {
        case 0 /* Bitmap */: {
            var bytes = void 0;
            if (compression === 0 /* RawData */) {
                bytes = readBytes(reader, Math.ceil(psd.width / 8) * psd.height);
            }
            else if (compression === 1 /* RleCompressed */) {
                bytes = new Uint8Array(psd.width * psd.height);
                readDataRLE(reader, { data: bytes, width: psd.width, height: psd.height }, psd.width, psd.height, 1, [0], options.large);
            }
            else {
                throw new Error("Bitmap compression not supported: " + compression);
            }
            helpers_1.decodeBitmap(bytes, imageData.data, psd.width, psd.height);
            break;
        }
        case 3 /* RGB */:
        case 1 /* Grayscale */: {
            var channels = psd.colorMode === 1 /* Grayscale */ ? [0] : [0, 1, 2];
            if (psd.channels && psd.channels > 3) {
                for (var i = 3; i < psd.channels; i++) {
                    // TODO: store these channels in additional image data
                    channels.push(i);
                }
            }
            else if (globalAlpha) {
                channels.push(3);
            }
            if (compression === 0 /* RawData */) {
                for (var i = 0; i < channels.length; i++) {
                    readDataRaw(reader, imageData, channels[i], psd.width, psd.height, 4);
                }
            }
            else if (compression === 1 /* RleCompressed */) {
                var start = reader.offset;
                readDataRLE(reader, imageData, psd.width, psd.height, 4, channels, options.large);
                if (helpers_1.RAW_IMAGE_DATA)
                    psd.imageDataRaw = new Uint8Array(reader.view.buffer, reader.view.byteOffset + start, reader.offset - start);
            }
            if (psd.colorMode === 1 /* Grayscale */) {
                setupGrayscale(imageData);
            }
            break;
        }
        case 4 /* CMYK */: {
            if (psd.channels !== 4)
                throw new Error("Invalid channel count");
            var channels = [0, 1, 2, 3];
            if (globalAlpha)
                channels.push(4);
            if (compression === 0 /* RawData */) {
                throw new Error("Not implemented");
                // TODO: ...
                // for (let i = 0; i < channels.length; i++) {
                // 	readDataRaw(reader, imageData, channels[i], psd.width, psd.height);
                // }
            }
            else if (compression === 1 /* RleCompressed */) {
                var cmykImageData = {
                    width: imageData.width,
                    height: imageData.height,
                    data: new Uint8Array(imageData.width * imageData.height * 5),
                };
                var start = reader.offset;
                readDataRLE(reader, cmykImageData, psd.width, psd.height, 5, channels, options.large);
                cmykToRgb(cmykImageData, imageData, true);
                if (helpers_1.RAW_IMAGE_DATA)
                    psd.imageDataRaw = new Uint8Array(reader.view.buffer, reader.view.byteOffset + start, reader.offset - start);
            }
            break;
        }
        default: throw new Error("Color mode not supported: " + psd.colorMode);
    }
    if (options.useImageData) {
        psd.imageData = imageData;
    }
    else {
        psd.canvas = helpers_1.createCanvas(psd.width, psd.height);
        psd.canvas.getContext('2d').putImageData(imageData, 0, 0);
    }
}
function cmykToRgb(cmyk, rgb, reverseAlpha) {
    var size = rgb.width * rgb.height * 4;
    var srcData = cmyk.data;
    var dstData = rgb.data;
    for (var src = 0, dst = 0; dst < size; src += 5, dst += 4) {
        var c = srcData[src];
        var m = srcData[src + 1];
        var y = srcData[src + 2];
        var k = srcData[src + 3];
        dstData[dst] = ((((c * k) | 0) / 255) | 0);
        dstData[dst + 1] = ((((m * k) | 0) / 255) | 0);
        dstData[dst + 2] = ((((y * k) | 0) / 255) | 0);
        dstData[dst + 3] = reverseAlpha ? 255 - srcData[src + 4] : srcData[src + 4];
    }
    // for (let src = 0, dst = 0; dst < size; src += 5, dst += 4) {
    // 	const c = 1 - (srcData[src + 0] / 255);
    // 	const m = 1 - (srcData[src + 1] / 255);
    // 	const y = 1 - (srcData[src + 2] / 255);
    // 	// const k = srcData[src + 3] / 255;
    // 	dstData[dst + 0] = ((1 - c * 0.8) * 255) | 0;
    // 	dstData[dst + 1] = ((1 - m * 0.8) * 255) | 0;
    // 	dstData[dst + 2] = ((1 - y * 0.8) * 255) | 0;
    // 	dstData[dst + 3] = reverseAlpha ? 255 - srcData[src + 4] : srcData[src + 4];
    // }
}
function readDataRaw(reader, pixelData, offset, width, height, step) {
    var size = width * height;
    var buffer = readBytes(reader, size);
    if (pixelData && offset < step) {
        var data = pixelData.data;
        for (var i = 0, p = offset | 0; i < size; i++, p = (p + step) | 0) {
            data[p] = buffer[i];
        }
    }
}
function readDataRLE(reader, pixelData, _width, height, step, offsets, large) {
    var data = pixelData && pixelData.data;
    var lengths;
    if (large) {
        lengths = new Uint32Array(offsets.length * height);
        for (var o = 0, li = 0; o < offsets.length; o++) {
            for (var y = 0; y < height; y++, li++) {
                lengths[li] = readUint32(reader);
            }
        }
    }
    else {
        lengths = new Uint16Array(offsets.length * height);
        for (var o = 0, li = 0; o < offsets.length; o++) {
            for (var y = 0; y < height; y++, li++) {
                lengths[li] = readUint16(reader);
            }
        }
    }
    var extraLimit = (step - 1) | 0; // 3 for rgb, 4 for cmyk
    for (var c = 0, li = 0; c < offsets.length; c++) {
        var offset = offsets[c] | 0;
        var extra = c > extraLimit || offset > extraLimit;
        if (!data || extra) {
            for (var y = 0; y < height; y++, li++) {
                skipBytes(reader, lengths[li]);
            }
        }
        else {
            for (var y = 0, p = offset | 0; y < height; y++, li++) {
                var length_1 = lengths[li];
                var buffer = readBytes(reader, length_1);
                for (var i = 0; i < length_1; i++) {
                    var header = buffer[i];
                    if (header > 128) {
                        var value = buffer[++i];
                        header = (256 - header) | 0;
                        for (var j = 0; j <= header; j = (j + 1) | 0) {
                            data[p] = value;
                            p = (p + step) | 0;
                        }
                    }
                    else if (header < 128) {
                        for (var j = 0; j <= header; j = (j + 1) | 0) {
                            data[p] = buffer[++i];
                            p = (p + step) | 0;
                        }
                    }
                    else {
                        // ignore 128
                    }
                    if (i >= length_1) {
                        throw new Error("Invalid RLE data: exceeded buffer size " + i + "/" + length_1);
                    }
                }
            }
        }
    }
}
exports.readDataRLE = readDataRLE;
function readSection(reader, round, func, skipEmpty, eightBytes) {
    if (skipEmpty === void 0) { skipEmpty = true; }
    if (eightBytes === void 0) { eightBytes = false; }
    var length = readUint32(reader);
    if (eightBytes) {
        if (length !== 0)
            throw new Error('Sizes larger than 4GB are not supported');
        length = readUint32(reader);
    }
    if (length <= 0 && skipEmpty)
        return undefined;
    var end = reader.offset + length;
    var result = func(function () { return end - reader.offset; });
    if (reader.offset > end) {
        throw new Error('Exceeded section limits');
    }
    if (reader.offset !== end && reader.strict) {
        // throw new Error(`Unread section data: ${end - reader.offset} bytes at 0x${reader.offset.toString(16)}`);
        console.warn('Unread section data');
    }
    while (end % round)
        end++;
    reader.offset = end;
    return result;
}
exports.readSection = readSection;
function readColor(reader) {
    var colorSpace = readUint16(reader);
    switch (colorSpace) {
        case 0 /* RGB */: {
            var r = readUint16(reader) / 257;
            var g = readUint16(reader) / 257;
            var b = readUint16(reader) / 257;
            skipBytes(reader, 2);
            return { r: r, g: g, b: b };
        }
        case 1 /* HSB */: {
            var h = readUint16(reader) / 0xffff;
            var s = readUint16(reader) / 0xffff;
            var b = readUint16(reader) / 0xffff;
            skipBytes(reader, 2);
            return { h: h, s: s, b: b };
        }
        case 2 /* CMYK */: {
            var c = readUint16(reader) / 257;
            var m = readUint16(reader) / 257;
            var y = readUint16(reader) / 257;
            var k = readUint16(reader) / 257;
            return { c: c, m: m, y: y, k: k };
        }
        case 7 /* Lab */: {
            var l = readInt16(reader) / 10000;
            var ta = readInt16(reader);
            var tb = readInt16(reader);
            var a = ta < 0 ? (ta / 12800) : (ta / 12700);
            var b = tb < 0 ? (tb / 12800) : (tb / 12700);
            skipBytes(reader, 2);
            return { l: l, a: a, b: b };
        }
        case 8 /* Grayscale */: {
            var k = readUint16(reader) * 255 / 10000;
            skipBytes(reader, 6);
            return { k: k };
        }
        default:
            throw new Error('Invalid color space');
    }
}
exports.readColor = readColor;
function readPattern(reader) {
    readUint32(reader); // length
    var version = readUint32(reader);
    if (version !== 1)
        throw new Error("Invalid pattern version: " + version);
    var colorMode = readUint32(reader);
    var x = readInt16(reader);
    var y = readInt16(reader);
    // we only support RGB and grayscale for now
    if (colorMode !== 3 /* RGB */ && colorMode !== 1 /* Grayscale */ && colorMode !== 2 /* Indexed */) {
        throw new Error("Unsupported pattern color mode: " + colorMode);
    }
    var name = readUnicodeString(reader);
    var id = readPascalString(reader, 1);
    var palette = [];
    if (colorMode === 2 /* Indexed */) {
        for (var i = 0; i < 256; i++) {
            palette.push({
                r: readUint8(reader),
                g: readUint8(reader),
                b: readUint8(reader),
            });
        }
        skipBytes(reader, 4); // no idea what this is
    }
    // virtual memory array list
    var version2 = readUint32(reader);
    if (version2 !== 3)
        throw new Error("Invalid pattern VMAL version: " + version2);
    readUint32(reader); // length
    var top = readUint32(reader);
    var left = readUint32(reader);
    var bottom = readUint32(reader);
    var right = readUint32(reader);
    var channelsCount = readUint32(reader);
    var width = right - left;
    var height = bottom - top;
    var data = new Uint8Array(width * height * 4);
    for (var i = 3; i < data.byteLength; i += 4) {
        data[i] = 255;
    }
    for (var i = 0, ch = 0; i < (channelsCount + 2); i++) {
        var has = readUint32(reader);
        if (!has)
            continue;
        var length_2 = readUint32(reader);
        var pixelDepth = readUint32(reader);
        var ctop = readUint32(reader);
        var cleft = readUint32(reader);
        var cbottom = readUint32(reader);
        var cright = readUint32(reader);
        var pixelDepth2 = readUint16(reader);
        var compressionMode = readUint8(reader); // 0 - raw, 1 - zip
        var dataLength = length_2 - (4 + 16 + 2 + 1);
        var cdata = readBytes(reader, dataLength);
        if (pixelDepth !== 8 || pixelDepth2 !== 8) {
            throw new Error('16bit pixel depth not supported for patterns');
        }
        var w = cright - cleft;
        var h = cbottom - ctop;
        var ox = cleft - left;
        var oy = ctop - top;
        if (compressionMode === 0) {
            if (colorMode === 3 /* RGB */ && ch < 3) {
                for (var y_1 = 0; y_1 < h; y_1++) {
                    for (var x_1 = 0; x_1 < w; x_1++) {
                        var src = x_1 + y_1 * w;
                        var dst = (ox + x_1 + (y_1 + oy) * width) * 4;
                        data[dst + ch] = cdata[src];
                    }
                }
            }
            if (colorMode === 1 /* Grayscale */ && ch < 1) {
                for (var y_2 = 0; y_2 < h; y_2++) {
                    for (var x_2 = 0; x_2 < w; x_2++) {
                        var src = x_2 + y_2 * w;
                        var dst = (ox + x_2 + (y_2 + oy) * width) * 4;
                        var value = cdata[src];
                        data[dst + 0] = value;
                        data[dst + 1] = value;
                        data[dst + 2] = value;
                    }
                }
            }
            if (colorMode === 2 /* Indexed */) {
                // TODO:
                throw new Error('Indexed pattern color mode not implemented');
            }
        }
        else if (compressionMode === 1) {
            // console.log({ colorMode });
            // require('fs').writeFileSync('zip.bin', Buffer.from(cdata));
            // const data = require('zlib').inflateRawSync(cdata);
            // const data = require('zlib').unzipSync(cdata);
            // console.log(data);
            // throw new Error('Zip compression not supported for pattern');
            // throw new Error('Unsupported pattern compression');
            console.error('Unsupported pattern compression');
            name += ' (failed to decode)';
        }
        else {
            throw new Error('Invalid pattern compression mode');
        }
        ch++;
    }
    // TODO: use canvas instead of data ?
    return { id: id, name: name, x: x, y: y, bounds: { x: left, y: top, w: width, h: height }, data: data };
}
exports.readPattern = readPattern;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QU0sR0FBRyxDQUFDLENBQUM7SUFDeEMsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztJQUMxQixJQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO0lBRXpCLEtBQUssSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUU7UUFDMUQsSUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLElBQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDM0IsSUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMzQixJQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMzQyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9DLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDL0MsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxH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Q0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLElBQUksTUFBQSxFQUFFLENBQUM7QUFDbkYsQ0FBQztBQXhIRCxrQ0F3SEMiLCJmaWxlIjoicHNkUmVhZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcblx0UHNkLCBMYXllciwgQ29sb3JNb2RlLCBTZWN0aW9uRGl2aWRlclR5cGUsIExheWVyQWRkaXRpb25hbEluZm8sIFJlYWRPcHRpb25zLCBMYXllck1hc2tEYXRhLCBDb2xvcixcblx0UGF0dGVybkluZm8sIEdsb2JhbExheWVyTWFza0luZm8sIFJHQlxufSBmcm9tICcuL3BzZCc7XG5pbXBvcnQge1xuXHRyZXNldEltYWdlRGF0YSwgb2Zmc2V0Rm9yQ2hhbm5lbCwgZGVjb2RlQml0bWFwLCBQaXhlbERhdGEsIGNyZWF0ZUNhbnZhcywgY3JlYXRlSW1hZ2VEYXRhLFxuXHR0b0JsZW5kTW9kZSwgQ2hhbm5lbElELCBDb21wcmVzc2lvbiwgTGF5ZXJNYXNrRmxhZ3MsIE1hc2tQYXJhbXMsIENvbG9yU3BhY2UsIFJBV19JTUFHRV9EQVRBLCBsYXJnZUFkZGl0aW9uYWxJbmZvS2V5c1xufSBmcm9tICcuL2hlbHBlcnMnO1xuaW1wb3J0IHsgaW5mb0hhbmRsZXJzTWFwIH0gZnJvbSAnLi9hZGRpdGlvbmFsSW5mbyc7XG5pbXBvcnQgeyByZXNvdXJjZUhhbmRsZXJzTWFwIH0gZnJvbSAnLi9pbWFnZVJlc291cmNlcyc7XG5cbmludGVyZmFjZSBDaGFubmVsSW5mbyB7XG5cdGlkOiBDaGFubmVsSUQ7XG5cdGxlbmd0aDogbnVtYmVyO1xufVxuXG5pbnRlcmZhY2UgUmVhZE9wdGlvbnNFeHQgZXh0ZW5kcyBSZWFkT3B0aW9ucyB7XG5cdGxhcmdlOiBib29sZWFuO1xufVxuXG5leHBvcnQgY29uc3Qgc3VwcG9ydGVkQ29sb3JNb2RlcyA9IFtDb2xvck1vZGUuQml0bWFwLCBDb2xvck1vZGUuR3JheXNjYWxlLCBDb2xvck1vZGUuUkdCXTtcbmNvbnN0IGNvbG9yTW9kZXMgPSBbJ2JpdG1hcCcsICdncmF5c2NhbGUnLCAnaW5kZXhlZCcsICdSR0InLCAnQ01ZSycsICdtdWx0aWNoYW5uZWwnLCAnZHVvdG9uZScsICdsYWInXTtcblxuZnVuY3Rpb24gc2V0dXBHcmF5c2NhbGUoZGF0YTogUGl4ZWxEYXRhKSB7XG5cdGNvbnN0IHNpemUgPSBkYXRhLndpZHRoICogZGF0YS5oZWlnaHQgKiA0O1xuXG5cdGZvciAobGV0IGkgPSAwOyBpIDwgc2l6ZTsgaSArPSA0KSB7XG5cdFx0ZGF0YS5kYXRhW2kgKyAxXSA9IGRhdGEuZGF0YVtpXTtcblx0XHRkYXRhLmRhdGFbaSArIDJdID0gZGF0YS5kYXRhW2ldO1xuXHR9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHNkUmVhZGVyIHtcblx0b2Zmc2V0OiBudW1iZXI7XG5cdHZpZXc6IERhdGFWaWV3O1xuXHRzdHJpY3Q6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZWFkZXIoYnVmZmVyOiBBcnJheUJ1ZmZlciwgb2Zmc2V0PzogbnVtYmVyLCBsZW5ndGg/OiBudW1iZXIpOiBQc2RSZWFkZXIge1xuXHRjb25zdCB2aWV3ID0gbmV3IERhdGFWaWV3KGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgpO1xuXHRyZXR1cm4geyB2aWV3LCBvZmZzZXQ6IDAsIHN0cmljdDogZmFsc2UgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRVaW50OChyZWFkZXI6IFBzZFJlYWRlcikge1xuXHRyZWFkZXIub2Zmc2V0ICs9IDE7XG5cdHJldHVybiByZWFkZXIudmlldy5nZXRVaW50OChyZWFkZXIub2Zmc2V0IC0gMSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwZWVrVWludDgocmVhZGVyOiBQc2RSZWFkZXIpIHtcblx0cmV0dXJuIHJlYWRlci52aWV3LmdldFVpbnQ4KHJlYWRlci5vZmZzZXQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZEludDE2KHJlYWRlcjogUHNkUmVhZGVyKSB7XG5cdHJlYWRlci5vZmZzZXQgKz0gMjtcblx0cmV0dXJuIHJlYWRlci52aWV3LmdldEludDE2KHJlYWRlci5vZmZzZXQgLSAyLCBmYWxzZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkVWludDE2KHJlYWRlcjogUHNkUmVhZGVyKSB7XG5cdHJlYWRlci5vZmZzZXQgKz0gMjtcblx0cmV0dXJuIHJlYWRlci52aWV3LmdldFVpbnQxNihyZWFkZXIub2Zmc2V0IC0gMiwgZmFsc2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZEludDMyKHJlYWRlcjogUHNkUmVhZGVyKSB7XG5cdHJlYWRlci5vZmZzZXQgKz0gNDtcblx0cmV0dXJuIHJlYWRlci52aWV3LmdldEludDMyKHJlYWRlci5vZmZzZXQgLSA0LCBmYWxzZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkSW50MzJMRShyZWFkZXI6IFBzZFJlYWRlcikge1xuXHRyZWFkZXIub2Zmc2V0ICs9IDQ7XG5cdHJldHVybiByZWFkZXIudmlldy5nZXRJbnQzMihyZWFkZXIub2Zmc2V0IC0gNCwgdHJ1ZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkVWludDMyKHJlYWRlcjogUHNkUmVhZGVyKSB7XG5cdHJlYWRlci5vZmZzZXQgKz0gNDtcblx0cmV0dXJuIHJlYWRlci52aWV3LmdldFVpbnQzMihyZWFkZXIub2Zmc2V0IC0gNCwgZmFsc2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZEZsb2F0MzIocmVhZGVyOiBQc2RSZWFkZXIpIHtcblx0cmVhZGVyLm9mZnNldCArPSA0O1xuXHRyZXR1cm4gcmVhZGVyLnZpZXcuZ2V0RmxvYXQzMihyZWFkZXIub2Zmc2V0IC0gNCwgZmFsc2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZEZsb2F0NjQocmVhZGVyOiBQc2RSZWFkZXIpIHtcblx0cmVhZGVyLm9mZnNldCArPSA4O1xuXHRyZXR1cm4gcmVhZGVyLnZpZXcuZ2V0RmxvYXQ2NChyZWFkZXIub2Zmc2V0IC0gOCwgZmFsc2UpO1xufVxuXG4vLyAzMi1iaXQgZml4ZWQtcG9pbnQgbnVtYmVyIDE2LjE2XG5leHBvcnQgZnVuY3Rpb24gcmVhZEZpeGVkUG9pbnQzMihyZWFkZXI6IFBzZFJlYWRlcik6IG51bWJlciB7XG5cdHJldHVybiByZWFkSW50MzIocmVhZGVyKSAvICgxIDw8IDE2KTtcbn1cblxuLy8gMzItYml0IGZpeGVkLXBvaW50IG51bWJlciA4LjI0XG5leHBvcnQgZnVuY3Rpb24gcmVhZEZpeGVkUG9pbnRQYXRoMzIocmVhZGVyOiBQc2RSZWFkZXIpOiBudW1iZXIge1xuXHRyZXR1cm4gcmVhZEludDMyKHJlYWRlcikgLyAoMSA8PCAyNCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkQnl0ZXMocmVhZGVyOiBQc2RSZWFkZXIsIGxlbmd0aDogbnVtYmVyKSB7XG5cdHJlYWRlci5vZmZzZXQgKz0gbGVuZ3RoO1xuXHRyZXR1cm4gbmV3IFVpbnQ4QXJyYXkocmVhZGVyLnZpZXcuYnVmZmVyLCByZWFkZXIudmlldy5ieXRlT2Zmc2V0ICsgcmVhZGVyLm9mZnNldCAtIGxlbmd0aCwgbGVuZ3RoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRTaWduYXR1cmUocmVhZGVyOiBQc2RSZWFkZXIpIHtcblx0cmV0dXJuIHJlYWRTaG9ydFN0cmluZyhyZWFkZXIsIDQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZFBhc2NhbFN0cmluZyhyZWFkZXI6IFBzZFJlYWRlciwgcGFkVG86IG51bWJlcikge1xuXHRsZXQgbGVuZ3RoID0gcmVhZFVpbnQ4KHJlYWRlcik7XG5cdGNvbnN0IHRleHQgPSBsZW5ndGggPyByZWFkU2hvcnRTdHJpbmcocmVhZGVyLCBsZW5ndGgpIDogJyc7XG5cblx0d2hpbGUgKCsrbGVuZ3RoICUgcGFkVG8pIHtcblx0XHRyZWFkZXIub2Zmc2V0Kys7XG5cdH1cblxuXHRyZXR1cm4gdGV4dDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRVbmljb2RlU3RyaW5nKHJlYWRlcjogUHNkUmVhZGVyKSB7XG5cdGNvbnN0IGxlbmd0aCA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0cmV0dXJuIHJlYWRVbmljb2RlU3RyaW5nV2l0aExlbmd0aChyZWFkZXIsIGxlbmd0aCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkVW5pY29kZVN0cmluZ1dpdGhMZW5ndGgocmVhZGVyOiBQc2RSZWFkZXIsIGxlbmd0aDogbnVtYmVyKSB7XG5cdGxldCB0ZXh0ID0gJyc7XG5cblx0d2hpbGUgKGxlbmd0aC0tKSB7XG5cdFx0Y29uc3QgdmFsdWUgPSByZWFkVWludDE2KHJlYWRlcik7XG5cblx0XHRpZiAodmFsdWUgfHwgbGVuZ3RoID4gMCkgeyAvLyByZW1vdmUgdHJhaWxpbmcgXFwwXG5cdFx0XHR0ZXh0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUodmFsdWUpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0ZXh0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFzY2lpU3RyaW5nKHJlYWRlcjogUHNkUmVhZGVyLCBsZW5ndGg6IG51bWJlcikge1xuXHRsZXQgdGV4dCA9ICcnO1xuXG5cdHdoaWxlIChsZW5ndGgtLSkge1xuXHRcdHRleHQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShyZWFkVWludDgocmVhZGVyKSk7XG5cdH1cblxuXHRyZXR1cm4gdGV4dDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNraXBCeXRlcyhyZWFkZXI6IFBzZFJlYWRlciwgY291bnQ6IG51bWJlcikge1xuXHRyZWFkZXIub2Zmc2V0ICs9IGNvdW50O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tTaWduYXR1cmUocmVhZGVyOiBQc2RSZWFkZXIsIGE6IHN0cmluZywgYj86IHN0cmluZykge1xuXHRjb25zdCBvZmZzZXQgPSByZWFkZXIub2Zmc2V0O1xuXHRjb25zdCBzaWduYXR1cmUgPSByZWFkU2lnbmF0dXJlKHJlYWRlcik7XG5cblx0aWYgKHNpZ25hdHVyZSAhPT0gYSAmJiBzaWduYXR1cmUgIT09IGIpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgc2lnbmF0dXJlOiAnJHtzaWduYXR1cmV9JyBhdCAweCR7b2Zmc2V0LnRvU3RyaW5nKDE2KX1gKTtcblx0fVxufVxuXG5mdW5jdGlvbiByZWFkU2hvcnRTdHJpbmcocmVhZGVyOiBQc2RSZWFkZXIsIGxlbmd0aDogbnVtYmVyKSB7XG5cdGNvbnN0IGJ1ZmZlciA9IHJlYWRCeXRlcyhyZWFkZXIsIGxlbmd0aCk7XG5cdGxldCByZXN1bHQgPSAnJztcblxuXHRmb3IgKGxldCBpID0gMDsgaSA8IGJ1ZmZlci5sZW5ndGg7IGkrKykge1xuXHRcdHJlc3VsdCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZmZlcltpXSk7XG5cdH1cblxuXHRyZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZFBzZChyZWFkZXI6IFBzZFJlYWRlciwgb3B0aW9uczogUmVhZE9wdGlvbnMgPSB7fSkge1xuXHQvLyBoZWFkZXJcblx0Y2hlY2tTaWduYXR1cmUocmVhZGVyLCAnOEJQUycpO1xuXHRjb25zdCB2ZXJzaW9uID0gcmVhZFVpbnQxNihyZWFkZXIpO1xuXHRpZiAodmVyc2lvbiAhPT0gMSAmJiB2ZXJzaW9uICE9PSAyKSB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgUFNEIGZpbGUgdmVyc2lvbjogJHt2ZXJzaW9ufWApO1xuXG5cdHNraXBCeXRlcyhyZWFkZXIsIDYpO1xuXHRjb25zdCBjaGFubmVscyA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0Y29uc3QgaGVpZ2h0ID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXHRjb25zdCB3aWR0aCA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0Y29uc3QgYml0c1BlckNoYW5uZWwgPSByZWFkVWludDE2KHJlYWRlcik7XG5cdGNvbnN0IGNvbG9yTW9kZSA9IHJlYWRVaW50MTYocmVhZGVyKTtcblxuXHRpZiAoc3VwcG9ydGVkQ29sb3JNb2Rlcy5pbmRleE9mKGNvbG9yTW9kZSkgPT09IC0xKVxuXHRcdHRocm93IG5ldyBFcnJvcihgQ29sb3IgbW9kZSBub3Qgc3VwcG9ydGVkOiAke2NvbG9yTW9kZXNbY29sb3JNb2RlXSA/PyBjb2xvck1vZGV9YCk7XG5cblx0Y29uc3QgcHNkOiBQc2QgPSB7IHdpZHRoLCBoZWlnaHQsIGNoYW5uZWxzLCBiaXRzUGVyQ2hhbm5lbCwgY29sb3JNb2RlIH07XG5cdGNvbnN0IG9wdDogUmVhZE9wdGlvbnNFeHQgPSB7IC4uLm9wdGlvbnMsIGxhcmdlOiB2ZXJzaW9uID09PSAyIH07XG5cblx0Ly8gY29sb3IgbW9kZSBkYXRhXG5cdHJlYWRTZWN0aW9uKHJlYWRlciwgMSwgbGVmdCA9PiB7XG5cdFx0aWYgKG9wdC50aHJvd0Zvck1pc3NpbmdGZWF0dXJlcykgdGhyb3cgbmV3IEVycm9yKCdDb2xvciBtb2RlIGRhdGEgbm90IHN1cHBvcnRlZCcpO1xuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0pO1xuXG5cdC8vIGltYWdlIHJlc291cmNlc1xuXHRyZWFkU2VjdGlvbihyZWFkZXIsIDEsIGxlZnQgPT4ge1xuXHRcdHdoaWxlIChsZWZ0KCkpIHtcblx0XHRcdGNvbnN0IHNpZyA9IHJlYWRTaWduYXR1cmUocmVhZGVyKTtcblxuXHRcdFx0aWYgKHNpZyAhPT0gJzhCSU0nICYmIHNpZyAhPT0gJ01lU2EnICYmIHNpZyAhPT0gJ0FnSGcnICYmIHNpZyAhPT0gJ1BIVVQnICYmIHNpZyAhPT0gJ0RDU1InKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBzaWduYXR1cmU6ICcke3NpZ30nIGF0IDB4JHsocmVhZGVyLm9mZnNldCAtIDQpLnRvU3RyaW5nKDE2KX1gKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgaWQgPSByZWFkVWludDE2KHJlYWRlcik7XG5cdFx0XHRyZWFkUGFzY2FsU3RyaW5nKHJlYWRlciwgMik7IC8vIG5hbWVcblxuXHRcdFx0cmVhZFNlY3Rpb24ocmVhZGVyLCAyLCBsZWZ0ID0+IHtcblx0XHRcdFx0Y29uc3QgaGFuZGxlciA9IHJlc291cmNlSGFuZGxlcnNNYXBbaWRdO1xuXHRcdFx0XHRjb25zdCBza2lwID0gaWQgPT09IDEwMzYgJiYgISFvcHQuc2tpcFRodW1ibmFpbDtcblxuXHRcdFx0XHRpZiAoIXBzZC5pbWFnZVJlc291cmNlcykge1xuXHRcdFx0XHRcdHBzZC5pbWFnZVJlc291cmNlcyA9IHt9O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGhhbmRsZXIgJiYgIXNraXApIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0aGFuZGxlci5yZWFkKHJlYWRlciwgcHNkLmltYWdlUmVzb3VyY2VzLCBsZWZ0LCBvcHQpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRcdGlmIChvcHQudGhyb3dGb3JNaXNzaW5nRmVhdHVyZXMpIHRocm93IGU7XG5cdFx0XHRcdFx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBvcHRpb25zLmxvZ01pc3NpbmdGZWF0dXJlcyAmJiBjb25zb2xlLmxvZyhgVW5oYW5kbGVkIGltYWdlIHJlc291cmNlOiAke2lkfWApO1xuXHRcdFx0XHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblx0fSk7XG5cblx0Ly8gbGF5ZXIgYW5kIG1hc2sgaW5mb1xuXHRsZXQgZ2xvYmFsQWxwaGEgPSBmYWxzZTtcblxuXHRyZWFkU2VjdGlvbihyZWFkZXIsIDEsIGxlZnQgPT4ge1xuXHRcdGdsb2JhbEFscGhhID0gcmVhZExheWVySW5mbyhyZWFkZXIsIHBzZCwgb3B0KTtcblxuXHRcdC8vIFNBSSBkb2VzIG5vdCBpbmNsdWRlIHRoaXMgc2VjdGlvblxuXHRcdGlmIChsZWZ0KCkgPiAwKSB7XG5cdFx0XHRjb25zdCBnbG9iYWxMYXllck1hc2tJbmZvID0gcmVhZEdsb2JhbExheWVyTWFza0luZm8ocmVhZGVyKTtcblx0XHRcdGlmIChnbG9iYWxMYXllck1hc2tJbmZvKSBwc2QuZ2xvYmFsTGF5ZXJNYXNrSW5mbyA9IGdsb2JhbExheWVyTWFza0luZm87XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIHJldmVydCBiYWNrIHRvIGVuZCBvZiBzZWN0aW9uIGlmIGV4Y2VlZGVkIHNlY3Rpb24gbGltaXRzXG5cdFx0XHQvLyBvcHQubG9nTWlzc2luZ0ZlYXR1cmVzICYmIGNvbnNvbGUubG9nKCdyZXZlcnRpbmcgdG8gZW5kIG9mIHNlY3Rpb24nKTtcblx0XHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdFx0fVxuXG5cdFx0d2hpbGUgKGxlZnQoKSA+IDApIHtcblx0XHRcdC8vIHNvbWV0aW1lcyB0aGVyZSBhcmUgZW1wdHkgYnl0ZXMgaGVyZVxuXHRcdFx0d2hpbGUgKGxlZnQoKSAmJiBwZWVrVWludDgocmVhZGVyKSA9PT0gMCkge1xuXHRcdFx0XHQvLyBvcHQubG9nTWlzc2luZ0ZlYXR1cmVzICYmIGNvbnNvbGUubG9nKCdza2lwcGluZyAwIGJ5dGUnKTtcblx0XHRcdFx0c2tpcEJ5dGVzKHJlYWRlciwgMSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChsZWZ0KCkgPj0gMTIpIHtcblx0XHRcdFx0cmVhZEFkZGl0aW9uYWxMYXllckluZm8ocmVhZGVyLCBwc2QsIHBzZCwgb3B0KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIG9wdC5sb2dNaXNzaW5nRmVhdHVyZXMgJiYgY29uc29sZS5sb2coJ3NraXBwaW5nIGxlZnRvdmVyIGJ5dGVzJywgbGVmdCgpKTtcblx0XHRcdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sIHVuZGVmaW5lZCwgb3B0LmxhcmdlKTtcblxuXHRjb25zdCBoYXNDaGlsZHJlbiA9IHBzZC5jaGlsZHJlbiAmJiBwc2QuY2hpbGRyZW4ubGVuZ3RoO1xuXHRjb25zdCBza2lwQ29tcG9zaXRlID0gb3B0LnNraXBDb21wb3NpdGVJbWFnZURhdGEgJiYgKG9wdC5za2lwTGF5ZXJJbWFnZURhdGEgfHwgaGFzQ2hpbGRyZW4pO1xuXG5cdGlmICghc2tpcENvbXBvc2l0ZSkge1xuXHRcdHJlYWRJbWFnZURhdGEocmVhZGVyLCBwc2QsIGdsb2JhbEFscGhhLCBvcHQpO1xuXHR9XG5cblx0Ly8gVE9ETzogc2hvdyBjb252ZXJ0ZWQgY29sb3IgbW9kZSBpbnN0ZWFkIG9mIG9yaWdpbmFsIFBTRCBmaWxlIGNvbG9yIG1vZGVcblx0Ly8gICAgICAgYnV0IGFkZCBvcHRpb24gdG8gcHJlc2VydmUgZmlsZSBjb2xvciBtb2RlIChuZWVkIHRvIHJldHVybiBpbWFnZSBkYXRhIGluc3RlYWQgb2YgY2FudmFzIGluIHRoYXQgY2FzZSlcblx0Ly8gcHNkLmNvbG9yTW9kZSA9IENvbG9yTW9kZS5SR0I7IC8vIHdlIGNvbnZlcnQgYWxsIGNvbG9yIG1vZGVzIHRvIFJHQlxuXG5cdHJldHVybiBwc2Q7XG59XG5cbmZ1bmN0aW9uIHJlYWRMYXllckluZm8ocmVhZGVyOiBQc2RSZWFkZXIsIHBzZDogUHNkLCBvcHRpb25zOiBSZWFkT3B0aW9uc0V4dCkge1xuXHRsZXQgZ2xvYmFsQWxwaGEgPSBmYWxzZTtcblxuXHRyZWFkU2VjdGlvbihyZWFkZXIsIDIsIGxlZnQgPT4ge1xuXHRcdGxldCBsYXllckNvdW50ID0gcmVhZEludDE2KHJlYWRlcik7XG5cblx0XHRpZiAobGF5ZXJDb3VudCA8IDApIHtcblx0XHRcdGdsb2JhbEFscGhhID0gdHJ1ZTtcblx0XHRcdGxheWVyQ291bnQgPSAtbGF5ZXJDb3VudDtcblx0XHR9XG5cblx0XHRjb25zdCBsYXllcnM6IExheWVyW10gPSBbXTtcblx0XHRjb25zdCBsYXllckNoYW5uZWxzOiBDaGFubmVsSW5mb1tdW10gPSBbXTtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgbGF5ZXJDb3VudDsgaSsrKSB7XG5cdFx0XHRjb25zdCB7IGxheWVyLCBjaGFubmVscyB9ID0gcmVhZExheWVyUmVjb3JkKHJlYWRlciwgcHNkLCBvcHRpb25zKTtcblx0XHRcdGxheWVycy5wdXNoKGxheWVyKTtcblx0XHRcdGxheWVyQ2hhbm5lbHMucHVzaChjaGFubmVscyk7XG5cdFx0fVxuXG5cdFx0aWYgKCFvcHRpb25zLnNraXBMYXllckltYWdlRGF0YSkge1xuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsYXllckNvdW50OyBpKyspIHtcblx0XHRcdFx0cmVhZExheWVyQ2hhbm5lbEltYWdlRGF0YShyZWFkZXIsIHBzZCwgbGF5ZXJzW2ldLCBsYXllckNoYW5uZWxzW2ldLCBvcHRpb25zKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXG5cdFx0aWYgKCFwc2QuY2hpbGRyZW4pIHBzZC5jaGlsZHJlbiA9IFtdO1xuXG5cdFx0Y29uc3Qgc3RhY2s6IChMYXllciB8IFBzZClbXSA9IFtwc2RdO1xuXG5cdFx0Zm9yIChsZXQgaSA9IGxheWVycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0Y29uc3QgbCA9IGxheWVyc1tpXTtcblx0XHRcdGNvbnN0IHR5cGUgPSBsLnNlY3Rpb25EaXZpZGVyID8gbC5zZWN0aW9uRGl2aWRlci50eXBlIDogU2VjdGlvbkRpdmlkZXJUeXBlLk90aGVyO1xuXG5cdFx0XHRpZiAodHlwZSA9PT0gU2VjdGlvbkRpdmlkZXJUeXBlLk9wZW5Gb2xkZXIgfHwgdHlwZSA9PT0gU2VjdGlvbkRpdmlkZXJUeXBlLkNsb3NlZEZvbGRlcikge1xuXHRcdFx0XHRsLm9wZW5lZCA9IHR5cGUgPT09IFNlY3Rpb25EaXZpZGVyVHlwZS5PcGVuRm9sZGVyO1xuXHRcdFx0XHRsLmNoaWxkcmVuID0gW107XG5cdFx0XHRcdHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdLmNoaWxkcmVuIS51bnNoaWZ0KGwpO1xuXHRcdFx0XHRzdGFjay5wdXNoKGwpO1xuXHRcdFx0fSBlbHNlIGlmICh0eXBlID09PSBTZWN0aW9uRGl2aWRlclR5cGUuQm91bmRpbmdTZWN0aW9uRGl2aWRlcikge1xuXHRcdFx0XHRzdGFjay5wb3AoKTtcblx0XHRcdFx0Ly8gdGhpcyB3YXMgd29ya2Fyb3VuZCBiZWNhdXNlIEkgZGlkbid0IGtub3cgd2hhdCBgbHNka2Agc2VjdGlvbiB3YXMsIG5vdyBpdCdzIHByb2JhYmx5IG5vdCBuZWVkZWQgYW55bW9yZVxuXHRcdFx0XHQvLyB9IGVsc2UgaWYgKGwubmFtZSA9PT0gJzwvTGF5ZXIgZ3JvdXA+JyAmJiAhbC5zZWN0aW9uRGl2aWRlciAmJiAhbC50b3AgJiYgIWwubGVmdCAmJiAhbC5ib3R0b20gJiYgIWwucmlnaHQpIHtcblx0XHRcdFx0Ly8gXHQvLyBzb21ldGltZXMgbGF5ZXIgZ3JvdXAgdGVybWluYXRvciBkb2Vzbid0IGhhdmUgc2VjdGlvbkRpdmlkZXIsIHNvIHdlIGp1c3QgZ3Vlc3MgaGVyZSAoUFMgYnVnID8pXG5cdFx0XHRcdC8vIFx0c3RhY2sucG9wKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzdGFja1tzdGFjay5sZW5ndGggLSAxXS5jaGlsZHJlbiEudW5zaGlmdChsKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sIHVuZGVmaW5lZCwgb3B0aW9ucy5sYXJnZSk7XG5cblx0cmV0dXJuIGdsb2JhbEFscGhhO1xufVxuXG5mdW5jdGlvbiByZWFkTGF5ZXJSZWNvcmQocmVhZGVyOiBQc2RSZWFkZXIsIHBzZDogUHNkLCBvcHRpb25zOiBSZWFkT3B0aW9uc0V4dCkge1xuXHRjb25zdCBsYXllcjogTGF5ZXIgPSB7fTtcblx0bGF5ZXIudG9wID0gcmVhZEludDMyKHJlYWRlcik7XG5cdGxheWVyLmxlZnQgPSByZWFkSW50MzIocmVhZGVyKTtcblx0bGF5ZXIuYm90dG9tID0gcmVhZEludDMyKHJlYWRlcik7XG5cdGxheWVyLnJpZ2h0ID0gcmVhZEludDMyKHJlYWRlcik7XG5cblx0Y29uc3QgY2hhbm5lbENvdW50ID0gcmVhZFVpbnQxNihyZWFkZXIpO1xuXHRjb25zdCBjaGFubmVsczogQ2hhbm5lbEluZm9bXSA9IFtdO1xuXG5cdGZvciAobGV0IGkgPSAwOyBpIDwgY2hhbm5lbENvdW50OyBpKyspIHtcblx0XHRsZXQgY2hhbm5lbElEID0gcmVhZEludDE2KHJlYWRlcikgYXMgQ2hhbm5lbElEO1xuXHRcdGxldCBjaGFubmVsTGVuZ3RoID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXG5cdFx0aWYgKG9wdGlvbnMubGFyZ2UpIHtcblx0XHRcdGlmIChjaGFubmVsTGVuZ3RoICE9PSAwKSB0aHJvdyBuZXcgRXJyb3IoJ1NpemVzIGxhcmdlciB0aGFuIDRHQiBhcmUgbm90IHN1cHBvcnRlZCcpO1xuXHRcdFx0Y2hhbm5lbExlbmd0aCA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHR9XG5cblx0XHRjaGFubmVscy5wdXNoKHsgaWQ6IGNoYW5uZWxJRCwgbGVuZ3RoOiBjaGFubmVsTGVuZ3RoIH0pO1xuXHR9XG5cblx0Y2hlY2tTaWduYXR1cmUocmVhZGVyLCAnOEJJTScpO1xuXHRjb25zdCBibGVuZE1vZGUgPSByZWFkU2lnbmF0dXJlKHJlYWRlcik7XG5cdGlmICghdG9CbGVuZE1vZGVbYmxlbmRNb2RlXSkgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGJsZW5kIG1vZGU6ICcke2JsZW5kTW9kZX0nYCk7XG5cdGxheWVyLmJsZW5kTW9kZSA9IHRvQmxlbmRNb2RlW2JsZW5kTW9kZV07XG5cblx0bGF5ZXIub3BhY2l0eSA9IHJlYWRVaW50OChyZWFkZXIpIC8gMHhmZjtcblx0bGF5ZXIuY2xpcHBpbmcgPSByZWFkVWludDgocmVhZGVyKSA9PT0gMTtcblxuXHRjb25zdCBmbGFncyA9IHJlYWRVaW50OChyZWFkZXIpO1xuXHRsYXllci50cmFuc3BhcmVuY3lQcm90ZWN0ZWQgPSAoZmxhZ3MgJiAweDAxKSAhPT0gMDtcblx0bGF5ZXIuaGlkZGVuID0gKGZsYWdzICYgMHgwMikgIT09IDA7XG5cdC8vIDB4MDQgLSBvYnNvbGV0ZVxuXHQvLyAweDA4IC0gMSBmb3IgUGhvdG9zaG9wIDUuMCBhbmQgbGF0ZXIsIHRlbGxzIGlmIGJpdCA0IGhhcyB1c2VmdWwgaW5mb3JtYXRpb25cblx0Ly8gMHgxMCAtIHBpeGVsIGRhdGEgaXJyZWxldmFudCB0byBhcHBlYXJhbmNlIG9mIGRvY3VtZW50XG5cdC8vIDB4MjAgLSA/Pz9cblx0Ly8gaWYgKGZsYWdzICYgMHgyMCkgKGxheWVyIGFzIGFueSkuXzIgPSB0cnVlOyAvLyBURU1QICEhISFcblxuXHRza2lwQnl0ZXMocmVhZGVyLCAxKTtcblxuXHRyZWFkU2VjdGlvbihyZWFkZXIsIDEsIGxlZnQgPT4ge1xuXHRcdGNvbnN0IG1hc2sgPSByZWFkTGF5ZXJNYXNrRGF0YShyZWFkZXIsIG9wdGlvbnMpO1xuXHRcdGlmIChtYXNrKSBsYXllci5tYXNrID0gbWFzaztcblxuXHRcdC8qY29uc3QgYmxlbmRpbmdSYW5nZXMgPSovIHJlYWRMYXllckJsZW5kaW5nUmFuZ2VzKHJlYWRlcik7XG5cdFx0bGF5ZXIubmFtZSA9IHJlYWRQYXNjYWxTdHJpbmcocmVhZGVyLCA0KTtcblxuXHRcdHdoaWxlIChsZWZ0KCkpIHtcblx0XHRcdHJlYWRBZGRpdGlvbmFsTGF5ZXJJbmZvKHJlYWRlciwgbGF5ZXIsIHBzZCwgb3B0aW9ucyk7XG5cdFx0fVxuXHR9KTtcblxuXHRyZXR1cm4geyBsYXllciwgY2hhbm5lbHMgfTtcbn1cblxuZnVuY3Rpb24gcmVhZExheWVyTWFza0RhdGEocmVhZGVyOiBQc2RSZWFkZXIsIG9wdGlvbnM6IFJlYWRPcHRpb25zKSB7XG5cdHJldHVybiByZWFkU2VjdGlvbjxMYXllck1hc2tEYXRhIHwgdW5kZWZpbmVkPihyZWFkZXIsIDEsIGxlZnQgPT4ge1xuXHRcdGlmICghbGVmdCgpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Y29uc3QgbWFzazogTGF5ZXJNYXNrRGF0YSA9IHt9O1xuXHRcdG1hc2sudG9wID0gcmVhZEludDMyKHJlYWRlcik7XG5cdFx0bWFzay5sZWZ0ID0gcmVhZEludDMyKHJlYWRlcik7XG5cdFx0bWFzay5ib3R0b20gPSByZWFkSW50MzIocmVhZGVyKTtcblx0XHRtYXNrLnJpZ2h0ID0gcmVhZEludDMyKHJlYWRlcik7XG5cdFx0bWFzay5kZWZhdWx0Q29sb3IgPSByZWFkVWludDgocmVhZGVyKTtcblxuXHRcdGNvbnN0IGZsYWdzID0gcmVhZFVpbnQ4KHJlYWRlcik7XG5cdFx0bWFzay5wb3NpdGlvblJlbGF0aXZlVG9MYXllciA9IChmbGFncyAmIExheWVyTWFza0ZsYWdzLlBvc2l0aW9uUmVsYXRpdmVUb0xheWVyKSAhPT0gMDtcblx0XHRtYXNrLmRpc2FibGVkID0gKGZsYWdzICYgTGF5ZXJNYXNrRmxhZ3MuTGF5ZXJNYXNrRGlzYWJsZWQpICE9PSAwO1xuXHRcdG1hc2suZnJvbVZlY3RvckRhdGEgPSAoZmxhZ3MgJiBMYXllck1hc2tGbGFncy5MYXllck1hc2tGcm9tUmVuZGVyaW5nT3RoZXJEYXRhKSAhPT0gMDtcblxuXHRcdGlmIChmbGFncyAmIExheWVyTWFza0ZsYWdzLk1hc2tIYXNQYXJhbWV0ZXJzQXBwbGllZFRvSXQpIHtcblx0XHRcdGNvbnN0IHBhcmFtcyA9IHJlYWRVaW50OChyZWFkZXIpO1xuXHRcdFx0aWYgKHBhcmFtcyAmIE1hc2tQYXJhbXMuVXNlck1hc2tEZW5zaXR5KSBtYXNrLnVzZXJNYXNrRGVuc2l0eSA9IHJlYWRVaW50OChyZWFkZXIpIC8gMHhmZjtcblx0XHRcdGlmIChwYXJhbXMgJiBNYXNrUGFyYW1zLlVzZXJNYXNrRmVhdGhlcikgbWFzay51c2VyTWFza0ZlYXRoZXIgPSByZWFkRmxvYXQ2NChyZWFkZXIpO1xuXHRcdFx0aWYgKHBhcmFtcyAmIE1hc2tQYXJhbXMuVmVjdG9yTWFza0RlbnNpdHkpIG1hc2sudmVjdG9yTWFza0RlbnNpdHkgPSByZWFkVWludDgocmVhZGVyKSAvIDB4ZmY7XG5cdFx0XHRpZiAocGFyYW1zICYgTWFza1BhcmFtcy5WZWN0b3JNYXNrRmVhdGhlcikgbWFzay52ZWN0b3JNYXNrRmVhdGhlciA9IHJlYWRGbG9hdDY0KHJlYWRlcik7XG5cdFx0fVxuXG5cdFx0aWYgKGxlZnQoKSA+IDIpIHtcblx0XHRcdG9wdGlvbnMubG9nTWlzc2luZ0ZlYXR1cmVzICYmIGNvbnNvbGUubG9nKCdVbmhhbmRsZWQgZXh0cmEgbWFzayBwYXJhbXMnKTtcblx0XHRcdC8vIFRPRE86IGhhbmRsZSB0aGVzZSB2YWx1ZXNcblx0XHRcdC8qY29uc3QgcmVhbEZsYWdzID0qLyByZWFkVWludDgocmVhZGVyKTtcblx0XHRcdC8qY29uc3QgcmVhbFVzZXJNYXNrQmFja2dyb3VuZCA9Ki8gcmVhZFVpbnQ4KHJlYWRlcik7XG5cdFx0XHQvKmNvbnN0IHRvcDIgPSovIHJlYWRJbnQzMihyZWFkZXIpO1xuXHRcdFx0Lypjb25zdCBsZWZ0MiA9Ki8gcmVhZEludDMyKHJlYWRlcik7XG5cdFx0XHQvKmNvbnN0IGJvdHRvbTIgPSovIHJlYWRJbnQzMihyZWFkZXIpO1xuXHRcdFx0Lypjb25zdCByaWdodDIgPSovIHJlYWRJbnQzMihyZWFkZXIpO1xuXHRcdH1cblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdFx0cmV0dXJuIG1hc2s7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiByZWFkTGF5ZXJCbGVuZGluZ1JhbmdlcyhyZWFkZXI6IFBzZFJlYWRlcikge1xuXHRyZXR1cm4gcmVhZFNlY3Rpb24ocmVhZGVyLCAxLCBsZWZ0ID0+IHtcblx0XHRjb25zdCBjb21wb3NpdGVHcmF5QmxlbmRTb3VyY2UgPSByZWFkVWludDMyKHJlYWRlcik7XG5cdFx0Y29uc3QgY29tcG9zaXRlR3JhcGhCbGVuZERlc3RpbmF0aW9uUmFuZ2UgPSByZWFkVWludDMyKHJlYWRlcik7XG5cdFx0Y29uc3QgcmFuZ2VzID0gW107XG5cblx0XHR3aGlsZSAobGVmdCgpKSB7XG5cdFx0XHRjb25zdCBzb3VyY2VSYW5nZSA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHRcdGNvbnN0IGRlc3RSYW5nZSA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHRcdHJhbmdlcy5wdXNoKHsgc291cmNlUmFuZ2UsIGRlc3RSYW5nZSB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4geyBjb21wb3NpdGVHcmF5QmxlbmRTb3VyY2UsIGNvbXBvc2l0ZUdyYXBoQmxlbmREZXN0aW5hdGlvblJhbmdlLCByYW5nZXMgfTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIHJlYWRMYXllckNoYW5uZWxJbWFnZURhdGEoXG5cdHJlYWRlcjogUHNkUmVhZGVyLCBwc2Q6IFBzZCwgbGF5ZXI6IExheWVyLCBjaGFubmVsczogQ2hhbm5lbEluZm9bXSwgb3B0aW9uczogUmVhZE9wdGlvbnNFeHRcbikge1xuXHRjb25zdCBsYXllcldpZHRoID0gKGxheWVyLnJpZ2h0IHx8IDApIC0gKGxheWVyLmxlZnQgfHwgMCk7XG5cdGNvbnN0IGxheWVySGVpZ2h0ID0gKGxheWVyLmJvdHRvbSB8fCAwKSAtIChsYXllci50b3AgfHwgMCk7XG5cdGNvbnN0IGNteWsgPSBwc2QuY29sb3JNb2RlID09PSBDb2xvck1vZGUuQ01ZSztcblxuXHRsZXQgaW1hZ2VEYXRhOiBJbWFnZURhdGEgfCB1bmRlZmluZWQ7XG5cblx0aWYgKGxheWVyV2lkdGggJiYgbGF5ZXJIZWlnaHQpIHtcblx0XHRpZiAoY215aykge1xuXHRcdFx0aW1hZ2VEYXRhID0geyB3aWR0aDogbGF5ZXJXaWR0aCwgaGVpZ2h0OiBsYXllckhlaWdodCwgZGF0YTogbmV3IFVpbnQ4Q2xhbXBlZEFycmF5KGxheWVyV2lkdGggKiBsYXllckhlaWdodCAqIDUpIH07XG5cdFx0XHRmb3IgKGxldCBwID0gNDsgcCA8IGltYWdlRGF0YS5kYXRhLmJ5dGVMZW5ndGg7IHAgKz0gNSkgaW1hZ2VEYXRhLmRhdGFbcF0gPSAyNTU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGltYWdlRGF0YSA9IGNyZWF0ZUltYWdlRGF0YShsYXllcldpZHRoLCBsYXllckhlaWdodCk7XG5cdFx0XHRyZXNldEltYWdlRGF0YShpbWFnZURhdGEpO1xuXHRcdH1cblx0fVxuXG5cdGlmIChSQVdfSU1BR0VfREFUQSkgKGxheWVyIGFzIGFueSkuaW1hZ2VEYXRhUmF3ID0gW107XG5cblx0Zm9yIChjb25zdCBjaGFubmVsIG9mIGNoYW5uZWxzKSB7XG5cdFx0Y29uc3QgY29tcHJlc3Npb24gPSByZWFkVWludDE2KHJlYWRlcikgYXMgQ29tcHJlc3Npb247XG5cblx0XHRpZiAoY2hhbm5lbC5pZCA9PT0gQ2hhbm5lbElELlVzZXJNYXNrKSB7XG5cdFx0XHRjb25zdCBtYXNrID0gbGF5ZXIubWFzaztcblxuXHRcdFx0aWYgKCFtYXNrKSB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgbGF5ZXIgbWFzayBkYXRhYCk7XG5cblx0XHRcdGNvbnN0IG1hc2tXaWR0aCA9IChtYXNrLnJpZ2h0IHx8IDApIC0gKG1hc2subGVmdCB8fCAwKTtcblx0XHRcdGNvbnN0IG1hc2tIZWlnaHQgPSAobWFzay5ib3R0b20gfHwgMCkgLSAobWFzay50b3AgfHwgMCk7XG5cblx0XHRcdGlmIChtYXNrV2lkdGggJiYgbWFza0hlaWdodCkge1xuXHRcdFx0XHRjb25zdCBtYXNrRGF0YSA9IGNyZWF0ZUltYWdlRGF0YShtYXNrV2lkdGgsIG1hc2tIZWlnaHQpO1xuXHRcdFx0XHRyZXNldEltYWdlRGF0YShtYXNrRGF0YSk7XG5cblx0XHRcdFx0Y29uc3Qgc3RhcnQgPSByZWFkZXIub2Zmc2V0O1xuXHRcdFx0XHRyZWFkRGF0YShyZWFkZXIsIG1hc2tEYXRhLCBjb21wcmVzc2lvbiwgbWFza1dpZHRoLCBtYXNrSGVpZ2h0LCAwLCBvcHRpb25zLmxhcmdlLCA0KTtcblxuXHRcdFx0XHRpZiAoUkFXX0lNQUdFX0RBVEEpIHtcblx0XHRcdFx0XHQobGF5ZXIgYXMgYW55KS5tYXNrRGF0YVJhdyA9IG5ldyBVaW50OEFycmF5KHJlYWRlci52aWV3LmJ1ZmZlciwgcmVhZGVyLnZpZXcuYnl0ZU9mZnNldCArIHN0YXJ0LCByZWFkZXIub2Zmc2V0IC0gc3RhcnQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0c2V0dXBHcmF5c2NhbGUobWFza0RhdGEpO1xuXG5cdFx0XHRcdGlmIChvcHRpb25zLnVzZUltYWdlRGF0YSkge1xuXHRcdFx0XHRcdG1hc2suaW1hZ2VEYXRhID0gbWFza0RhdGE7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0bWFzay5jYW52YXMgPSBjcmVhdGVDYW52YXMobWFza1dpZHRoLCBtYXNrSGVpZ2h0KTtcblx0XHRcdFx0XHRtYXNrLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpIS5wdXRJbWFnZURhdGEobWFza0RhdGEsIDAsIDApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnN0IG9mZnNldCA9IG9mZnNldEZvckNoYW5uZWwoY2hhbm5lbC5pZCwgY215ayk7XG5cdFx0XHRsZXQgdGFyZ2V0RGF0YSA9IGltYWdlRGF0YTtcblxuXHRcdFx0aWYgKG9mZnNldCA8IDApIHtcblx0XHRcdFx0dGFyZ2V0RGF0YSA9IHVuZGVmaW5lZDtcblxuXHRcdFx0XHRpZiAob3B0aW9ucy50aHJvd0Zvck1pc3NpbmdGZWF0dXJlcykge1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihgQ2hhbm5lbCBub3Qgc3VwcG9ydGVkOiAke2NoYW5uZWwuaWR9YCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Y29uc3Qgc3RhcnQgPSByZWFkZXIub2Zmc2V0O1xuXHRcdFx0cmVhZERhdGEocmVhZGVyLCB0YXJnZXREYXRhLCBjb21wcmVzc2lvbiwgbGF5ZXJXaWR0aCwgbGF5ZXJIZWlnaHQsIG9mZnNldCwgb3B0aW9ucy5sYXJnZSwgY215ayA/IDUgOiA0KTtcblxuXHRcdFx0aWYgKFJBV19JTUFHRV9EQVRBKSB7XG5cdFx0XHRcdChsYXllciBhcyBhbnkpLmltYWdlRGF0YVJhd1tjaGFubmVsLmlkXSA9IG5ldyBVaW50OEFycmF5KHJlYWRlci52aWV3LmJ1ZmZlciwgcmVhZGVyLnZpZXcuYnl0ZU9mZnNldCArIHN0YXJ0LCByZWFkZXIub2Zmc2V0IC0gc3RhcnQpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGFyZ2V0RGF0YSAmJiBwc2QuY29sb3JNb2RlID09PSBDb2xvck1vZGUuR3JheXNjYWxlKSB7XG5cdFx0XHRcdHNldHVwR3JheXNjYWxlKHRhcmdldERhdGEpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGlmIChpbWFnZURhdGEpIHtcblx0XHRpZiAoY215aykge1xuXHRcdFx0Y29uc3QgY215a0RhdGEgPSBpbWFnZURhdGE7XG5cdFx0XHRpbWFnZURhdGEgPSBjcmVhdGVJbWFnZURhdGEoY215a0RhdGEud2lkdGgsIGNteWtEYXRhLmhlaWdodCk7XG5cdFx0XHRjbXlrVG9SZ2IoY215a0RhdGEsIGltYWdlRGF0YSwgZmFsc2UpO1xuXHRcdH1cblxuXHRcdGlmIChvcHRpb25zLnVzZUltYWdlRGF0YSkge1xuXHRcdFx0bGF5ZXIuaW1hZ2VEYXRhID0gaW1hZ2VEYXRhO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsYXllci5jYW52YXMgPSBjcmVhdGVDYW52YXMobGF5ZXJXaWR0aCwgbGF5ZXJIZWlnaHQpO1xuXHRcdFx0bGF5ZXIuY2FudmFzLmdldENvbnRleHQoJzJkJykhLnB1dEltYWdlRGF0YShpbWFnZURhdGEsIDAsIDApO1xuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiByZWFkRGF0YShcblx0cmVhZGVyOiBQc2RSZWFkZXIsIGRhdGE6IEltYWdlRGF0YSB8IHVuZGVmaW5lZCwgY29tcHJlc3Npb246IENvbXByZXNzaW9uLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcixcblx0b2Zmc2V0OiBudW1iZXIsIGxhcmdlOiBib29sZWFuLCBzdGVwOiBudW1iZXJcbikge1xuXHRpZiAoY29tcHJlc3Npb24gPT09IENvbXByZXNzaW9uLlJhd0RhdGEpIHtcblx0XHRyZWFkRGF0YVJhdyhyZWFkZXIsIGRhdGEsIG9mZnNldCwgd2lkdGgsIGhlaWdodCwgc3RlcCk7XG5cdH0gZWxzZSBpZiAoY29tcHJlc3Npb24gPT09IENvbXByZXNzaW9uLlJsZUNvbXByZXNzZWQpIHtcblx0XHRyZWFkRGF0YVJMRShyZWFkZXIsIGRhdGEsIHdpZHRoLCBoZWlnaHQsIHN0ZXAsIFtvZmZzZXRdLCBsYXJnZSk7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBDb21wcmVzc2lvbiB0eXBlIG5vdCBzdXBwb3J0ZWQ6ICR7Y29tcHJlc3Npb259YCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gcmVhZEdsb2JhbExheWVyTWFza0luZm8ocmVhZGVyOiBQc2RSZWFkZXIpIHtcblx0cmV0dXJuIHJlYWRTZWN0aW9uPEdsb2JhbExheWVyTWFza0luZm8gfCB1bmRlZmluZWQ+KHJlYWRlciwgMSwgbGVmdCA9PiB7XG5cdFx0aWYgKCFsZWZ0KCkpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRjb25zdCBvdmVybGF5Q29sb3JTcGFjZSA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRjb25zdCBjb2xvclNwYWNlMSA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRjb25zdCBjb2xvclNwYWNlMiA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRjb25zdCBjb2xvclNwYWNlMyA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRjb25zdCBjb2xvclNwYWNlNCA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRjb25zdCBvcGFjaXR5ID0gcmVhZFVpbnQxNihyZWFkZXIpIC8gMHhmZjtcblx0XHRjb25zdCBraW5kID0gcmVhZFVpbnQ4KHJlYWRlcik7XG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTsgLy8gMyBieXRlcyBvZiBwYWRkaW5nID9cblx0XHRyZXR1cm4geyBvdmVybGF5Q29sb3JTcGFjZSwgY29sb3JTcGFjZTEsIGNvbG9yU3BhY2UyLCBjb2xvclNwYWNlMywgY29sb3JTcGFjZTQsIG9wYWNpdHksIGtpbmQgfTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIHJlYWRBZGRpdGlvbmFsTGF5ZXJJbmZvKHJlYWRlcjogUHNkUmVhZGVyLCB0YXJnZXQ6IExheWVyQWRkaXRpb25hbEluZm8sIHBzZDogUHNkLCBvcHRpb25zOiBSZWFkT3B0aW9uc0V4dCkge1xuXHRjb25zdCBzaWcgPSByZWFkU2lnbmF0dXJlKHJlYWRlcik7XG5cdGlmIChzaWcgIT09ICc4QklNJyAmJiBzaWcgIT09ICc4QjY0JykgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHNpZ25hdHVyZTogJyR7c2lnfScgYXQgMHgkeyhyZWFkZXIub2Zmc2V0IC0gNCkudG9TdHJpbmcoMTYpfWApO1xuXHRjb25zdCBrZXkgPSByZWFkU2lnbmF0dXJlKHJlYWRlcik7XG5cblx0Ly8gYGxhcmdlQWRkaXRpb25hbEluZm9LZXlzYCBmYWxsYmFjaywgYmVjYXVzZSBzb21lIGtleXMgZG9uJ3QgaGF2ZSA4QjY0IHNpZ25hdHVyZSBldmVuIHdoZW4gdGhleSBhcmUgNjRiaXRcblx0Y29uc3QgdTY0ID0gc2lnID09PSAnOEI2NCcgfHwgKG9wdGlvbnMubGFyZ2UgJiYgbGFyZ2VBZGRpdGlvbmFsSW5mb0tleXMuaW5kZXhPZihrZXkpICE9PSAtMSk7XG5cblx0cmVhZFNlY3Rpb24ocmVhZGVyLCAyLCBsZWZ0ID0+IHtcblx0XHRjb25zdCBoYW5kbGVyID0gaW5mb0hhbmRsZXJzTWFwW2tleV07XG5cblx0XHRpZiAoaGFuZGxlcikge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aGFuZGxlci5yZWFkKHJlYWRlciwgdGFyZ2V0LCBsZWZ0LCBwc2QsIG9wdGlvbnMpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRpZiAob3B0aW9ucy50aHJvd0Zvck1pc3NpbmdGZWF0dXJlcykgdGhyb3cgZTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0b3B0aW9ucy5sb2dNaXNzaW5nRmVhdHVyZXMgJiYgY29uc29sZS5sb2coYFVuaGFuZGxlZCBhZGRpdGlvbmFsIGluZm86ICR7a2V5fWApO1xuXHRcdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0XHR9XG5cblx0XHRpZiAobGVmdCgpKSB7XG5cdFx0XHRvcHRpb25zLmxvZ01pc3NpbmdGZWF0dXJlcyAmJiBjb25zb2xlLmxvZyhgVW5yZWFkICR7bGVmdCgpfSBieXRlcyBsZWZ0IGZvciBhZGRpdGlvbmFsIGluZm86ICR7a2V5fWApO1xuXHRcdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0XHR9XG5cdH0sIGZhbHNlLCB1NjQpO1xufVxuXG5mdW5jdGlvbiByZWFkSW1hZ2VEYXRhKHJlYWRlcjogUHNkUmVhZGVyLCBwc2Q6IFBzZCwgZ2xvYmFsQWxwaGE6IGJvb2xlYW4sIG9wdGlvbnM6IFJlYWRPcHRpb25zRXh0KSB7XG5cdGNvbnN0IGNvbXByZXNzaW9uID0gcmVhZFVpbnQxNihyZWFkZXIpIGFzIENvbXByZXNzaW9uO1xuXG5cdGlmIChzdXBwb3J0ZWRDb2xvck1vZGVzLmluZGV4T2YocHNkLmNvbG9yTW9kZSEpID09PSAtMSlcblx0XHR0aHJvdyBuZXcgRXJyb3IoYENvbG9yIG1vZGUgbm90IHN1cHBvcnRlZDogJHtwc2QuY29sb3JNb2RlfWApO1xuXG5cdGlmIChjb21wcmVzc2lvbiAhPT0gQ29tcHJlc3Npb24uUmF3RGF0YSAmJiBjb21wcmVzc2lvbiAhPT0gQ29tcHJlc3Npb24uUmxlQ29tcHJlc3NlZClcblx0XHR0aHJvdyBuZXcgRXJyb3IoYENvbXByZXNzaW9uIHR5cGUgbm90IHN1cHBvcnRlZDogJHtjb21wcmVzc2lvbn1gKTtcblxuXHRjb25zdCBpbWFnZURhdGEgPSBjcmVhdGVJbWFnZURhdGEocHNkLndpZHRoLCBwc2QuaGVpZ2h0KTtcblx0cmVzZXRJbWFnZURhdGEoaW1hZ2VEYXRhKTtcblxuXHRzd2l0Y2ggKHBzZC5jb2xvck1vZGUpIHtcblx0XHRjYXNlIENvbG9yTW9kZS5CaXRtYXA6IHtcblx0XHRcdGxldCBieXRlczogVWludDhBcnJheTtcblxuXHRcdFx0aWYgKGNvbXByZXNzaW9uID09PSBDb21wcmVzc2lvbi5SYXdEYXRhKSB7XG5cdFx0XHRcdGJ5dGVzID0gcmVhZEJ5dGVzKHJlYWRlciwgTWF0aC5jZWlsKHBzZC53aWR0aCAvIDgpICogcHNkLmhlaWdodCk7XG5cdFx0XHR9IGVsc2UgaWYgKGNvbXByZXNzaW9uID09PSBDb21wcmVzc2lvbi5SbGVDb21wcmVzc2VkKSB7XG5cdFx0XHRcdGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkocHNkLndpZHRoICogcHNkLmhlaWdodCk7XG5cdFx0XHRcdHJlYWREYXRhUkxFKHJlYWRlciwgeyBkYXRhOiBieXRlcywgd2lkdGg6IHBzZC53aWR0aCwgaGVpZ2h0OiBwc2QuaGVpZ2h0IH0sIHBzZC53aWR0aCwgcHNkLmhlaWdodCwgMSwgWzBdLCBvcHRpb25zLmxhcmdlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihgQml0bWFwIGNvbXByZXNzaW9uIG5vdCBzdXBwb3J0ZWQ6ICR7Y29tcHJlc3Npb259YCk7XG5cdFx0XHR9XG5cblx0XHRcdGRlY29kZUJpdG1hcChieXRlcywgaW1hZ2VEYXRhLmRhdGEsIHBzZC53aWR0aCwgcHNkLmhlaWdodCk7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cdFx0Y2FzZSBDb2xvck1vZGUuUkdCOlxuXHRcdGNhc2UgQ29sb3JNb2RlLkdyYXlzY2FsZToge1xuXHRcdFx0Y29uc3QgY2hhbm5lbHMgPSBwc2QuY29sb3JNb2RlID09PSBDb2xvck1vZGUuR3JheXNjYWxlID8gWzBdIDogWzAsIDEsIDJdO1xuXG5cdFx0XHRpZiAocHNkLmNoYW5uZWxzICYmIHBzZC5jaGFubmVscyA+IDMpIHtcblx0XHRcdFx0Zm9yIChsZXQgaSA9IDM7IGkgPCBwc2QuY2hhbm5lbHM7IGkrKykge1xuXHRcdFx0XHRcdC8vIFRPRE86IHN0b3JlIHRoZXNlIGNoYW5uZWxzIGluIGFkZGl0aW9uYWwgaW1hZ2UgZGF0YVxuXHRcdFx0XHRcdGNoYW5uZWxzLnB1c2goaSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAoZ2xvYmFsQWxwaGEpIHtcblx0XHRcdFx0Y2hhbm5lbHMucHVzaCgzKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGNvbXByZXNzaW9uID09PSBDb21wcmVzc2lvbi5SYXdEYXRhKSB7XG5cdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgY2hhbm5lbHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRyZWFkRGF0YVJhdyhyZWFkZXIsIGltYWdlRGF0YSwgY2hhbm5lbHNbaV0sIHBzZC53aWR0aCwgcHNkLmhlaWdodCwgNCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAoY29tcHJlc3Npb24gPT09IENvbXByZXNzaW9uLlJsZUNvbXByZXNzZWQpIHtcblx0XHRcdFx0Y29uc3Qgc3RhcnQgPSByZWFkZXIub2Zmc2V0O1xuXHRcdFx0XHRyZWFkRGF0YVJMRShyZWFkZXIsIGltYWdlRGF0YSwgcHNkLndpZHRoLCBwc2QuaGVpZ2h0LCA0LCBjaGFubmVscywgb3B0aW9ucy5sYXJnZSk7XG5cdFx0XHRcdGlmIChSQVdfSU1BR0VfREFUQSkgKHBzZCBhcyBhbnkpLmltYWdlRGF0YVJhdyA9IG5ldyBVaW50OEFycmF5KHJlYWRlci52aWV3LmJ1ZmZlciwgcmVhZGVyLnZpZXcuYnl0ZU9mZnNldCArIHN0YXJ0LCByZWFkZXIub2Zmc2V0IC0gc3RhcnQpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocHNkLmNvbG9yTW9kZSA9PT0gQ29sb3JNb2RlLkdyYXlzY2FsZSkge1xuXHRcdFx0XHRzZXR1cEdyYXlzY2FsZShpbWFnZURhdGEpO1xuXHRcdFx0fVxuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXHRcdGNhc2UgQ29sb3JNb2RlLkNNWUs6IHtcblx0XHRcdGlmIChwc2QuY2hhbm5lbHMgIT09IDQpIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjaGFubmVsIGNvdW50YCk7XG5cblx0XHRcdGNvbnN0IGNoYW5uZWxzID0gWzAsIDEsIDIsIDNdO1xuXHRcdFx0aWYgKGdsb2JhbEFscGhhKSBjaGFubmVscy5wdXNoKDQpO1xuXG5cdFx0XHRpZiAoY29tcHJlc3Npb24gPT09IENvbXByZXNzaW9uLlJhd0RhdGEpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBOb3QgaW1wbGVtZW50ZWRgKTtcblx0XHRcdFx0Ly8gVE9ETzogLi4uXG5cdFx0XHRcdC8vIGZvciAobGV0IGkgPSAwOyBpIDwgY2hhbm5lbHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0Ly8gXHRyZWFkRGF0YVJhdyhyZWFkZXIsIGltYWdlRGF0YSwgY2hhbm5lbHNbaV0sIHBzZC53aWR0aCwgcHNkLmhlaWdodCk7XG5cdFx0XHRcdC8vIH1cblx0XHRcdH0gZWxzZSBpZiAoY29tcHJlc3Npb24gPT09IENvbXByZXNzaW9uLlJsZUNvbXByZXNzZWQpIHtcblx0XHRcdFx0Y29uc3QgY215a0ltYWdlRGF0YTogUGl4ZWxEYXRhID0ge1xuXHRcdFx0XHRcdHdpZHRoOiBpbWFnZURhdGEud2lkdGgsXG5cdFx0XHRcdFx0aGVpZ2h0OiBpbWFnZURhdGEuaGVpZ2h0LFxuXHRcdFx0XHRcdGRhdGE6IG5ldyBVaW50OEFycmF5KGltYWdlRGF0YS53aWR0aCAqIGltYWdlRGF0YS5oZWlnaHQgKiA1KSxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRjb25zdCBzdGFydCA9IHJlYWRlci5vZmZzZXQ7XG5cdFx0XHRcdHJlYWREYXRhUkxFKHJlYWRlciwgY215a0ltYWdlRGF0YSwgcHNkLndpZHRoLCBwc2QuaGVpZ2h0LCA1LCBjaGFubmVscywgb3B0aW9ucy5sYXJnZSk7XG5cdFx0XHRcdGNteWtUb1JnYihjbXlrSW1hZ2VEYXRhLCBpbWFnZURhdGEsIHRydWUpO1xuXG5cdFx0XHRcdGlmIChSQVdfSU1BR0VfREFUQSkgKHBzZCBhcyBhbnkpLmltYWdlRGF0YVJhdyA9IG5ldyBVaW50OEFycmF5KHJlYWRlci52aWV3LmJ1ZmZlciwgcmVhZGVyLnZpZXcuYnl0ZU9mZnNldCArIHN0YXJ0LCByZWFkZXIub2Zmc2V0IC0gc3RhcnQpO1xuXHRcdFx0fVxuXG5cdFx0XHRicmVhaztcblx0XHR9XG5cdFx0ZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKGBDb2xvciBtb2RlIG5vdCBzdXBwb3J0ZWQ6ICR7cHNkLmNvbG9yTW9kZX1gKTtcblx0fVxuXG5cdGlmIChvcHRpb25zLnVzZUltYWdlRGF0YSkge1xuXHRcdHBzZC5pbWFnZURhdGEgPSBpbWFnZURhdGE7XG5cdH0gZWxzZSB7XG5cdFx0cHNkLmNhbnZhcyA9IGNyZWF0ZUNhbnZhcyhwc2Qud2lkdGgsIHBzZC5oZWlnaHQpO1xuXHRcdHBzZC5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKSEucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gY215a1RvUmdiKGNteWs6IFBpeGVsRGF0YSwgcmdiOiBQaXhlbERhdGEsIHJldmVyc2VBbHBoYTogYm9vbGVhbikge1xuXHRjb25zdCBzaXplID0gcmdiLndpZHRoICogcmdiLmhlaWdodCAqIDQ7XG5cdGNvbnN0IHNyY0RhdGEgPSBjbXlrLmRhdGE7XG5cdGNvbnN0IGRzdERhdGEgPSByZ2IuZGF0YTtcblxuXHRmb3IgKGxldCBzcmMgPSAwLCBkc3QgPSAwOyBkc3QgPCBzaXplOyBzcmMgKz0gNSwgZHN0ICs9IDQpIHtcblx0XHRjb25zdCBjID0gc3JjRGF0YVtzcmNdO1xuXHRcdGNvbnN0IG0gPSBzcmNEYXRhW3NyYyArIDFdO1xuXHRcdGNvbnN0IHkgPSBzcmNEYXRhW3NyYyArIDJdO1xuXHRcdGNvbnN0IGsgPSBzcmNEYXRhW3NyYyArIDNdO1xuXHRcdGRzdERhdGFbZHN0XSA9ICgoKChjICogaykgfCAwKSAvIDI1NSkgfCAwKTtcblx0XHRkc3REYXRhW2RzdCArIDFdID0gKCgoKG0gKiBrKSB8IDApIC8gMjU1KSB8IDApO1xuXHRcdGRzdERhdGFbZHN0ICsgMl0gPSAoKCgoeSAqIGspIHwgMCkgLyAyNTUpIHwgMCk7XG5cdFx0ZHN0RGF0YVtkc3QgKyAzXSA9IHJldmVyc2VBbHBoYSA/IDI1NSAtIHNyY0RhdGFbc3JjICsgNF0gOiBzcmNEYXRhW3NyYyArIDRdO1xuXHR9XG5cblx0Ly8gZm9yIChsZXQgc3JjID0gMCwgZHN0ID0gMDsgZHN0IDwgc2l6ZTsgc3JjICs9IDUsIGRzdCArPSA0KSB7XG5cdC8vIFx0Y29uc3QgYyA9IDEgLSAoc3JjRGF0YVtzcmMgKyAwXSAvIDI1NSk7XG5cdC8vIFx0Y29uc3QgbSA9IDEgLSAoc3JjRGF0YVtzcmMgKyAxXSAvIDI1NSk7XG5cdC8vIFx0Y29uc3QgeSA9IDEgLSAoc3JjRGF0YVtzcmMgKyAyXSAvIDI1NSk7XG5cdC8vIFx0Ly8gY29uc3QgayA9IHNyY0RhdGFbc3JjICsgM10gLyAyNTU7XG5cdC8vIFx0ZHN0RGF0YVtkc3QgKyAwXSA9ICgoMSAtIGMgKiAwLjgpICogMjU1KSB8IDA7XG5cdC8vIFx0ZHN0RGF0YVtkc3QgKyAxXSA9ICgoMSAtIG0gKiAwLjgpICogMjU1KSB8IDA7XG5cdC8vIFx0ZHN0RGF0YVtkc3QgKyAyXSA9ICgoMSAtIHkgKiAwLjgpICogMjU1KSB8IDA7XG5cdC8vIFx0ZHN0RGF0YVtkc3QgKyAzXSA9IHJldmVyc2VBbHBoYSA/IDI1NSAtIHNyY0RhdGFbc3JjICsgNF0gOiBzcmNEYXRhW3NyYyArIDRdO1xuXHQvLyB9XG59XG5cbmZ1bmN0aW9uIHJlYWREYXRhUmF3KHJlYWRlcjogUHNkUmVhZGVyLCBwaXhlbERhdGE6IFBpeGVsRGF0YSB8IHVuZGVmaW5lZCwgb2Zmc2V0OiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBzdGVwOiBudW1iZXIpIHtcblx0Y29uc3Qgc2l6ZSA9IHdpZHRoICogaGVpZ2h0O1xuXHRjb25zdCBidWZmZXIgPSByZWFkQnl0ZXMocmVhZGVyLCBzaXplKTtcblxuXHRpZiAocGl4ZWxEYXRhICYmIG9mZnNldCA8IHN0ZXApIHtcblx0XHRjb25zdCBkYXRhID0gcGl4ZWxEYXRhLmRhdGE7XG5cblx0XHRmb3IgKGxldCBpID0gMCwgcCA9IG9mZnNldCB8IDA7IGkgPCBzaXplOyBpKyssIHAgPSAocCArIHN0ZXApIHwgMCkge1xuXHRcdFx0ZGF0YVtwXSA9IGJ1ZmZlcltpXTtcblx0XHR9XG5cdH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWREYXRhUkxFKFxuXHRyZWFkZXI6IFBzZFJlYWRlciwgcGl4ZWxEYXRhOiBQaXhlbERhdGEgfCB1bmRlZmluZWQsIF93aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgc3RlcDogbnVtYmVyLCBvZmZzZXRzOiBudW1iZXJbXSxcblx0bGFyZ2U6IGJvb2xlYW5cbikge1xuXHRjb25zdCBkYXRhID0gcGl4ZWxEYXRhICYmIHBpeGVsRGF0YS5kYXRhO1xuXHRsZXQgbGVuZ3RoczogVWludDE2QXJyYXkgfCBVaW50MzJBcnJheTtcblxuXHRpZiAobGFyZ2UpIHtcblx0XHRsZW5ndGhzID0gbmV3IFVpbnQzMkFycmF5KG9mZnNldHMubGVuZ3RoICogaGVpZ2h0KTtcblxuXHRcdGZvciAobGV0IG8gPSAwLCBsaSA9IDA7IG8gPCBvZmZzZXRzLmxlbmd0aDsgbysrKSB7XG5cdFx0XHRmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgeSsrLCBsaSsrKSB7XG5cdFx0XHRcdGxlbmd0aHNbbGldID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRsZW5ndGhzID0gbmV3IFVpbnQxNkFycmF5KG9mZnNldHMubGVuZ3RoICogaGVpZ2h0KTtcblxuXHRcdGZvciAobGV0IG8gPSAwLCBsaSA9IDA7IG8gPCBvZmZzZXRzLmxlbmd0aDsgbysrKSB7XG5cdFx0XHRmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgeSsrLCBsaSsrKSB7XG5cdFx0XHRcdGxlbmd0aHNbbGldID0gcmVhZFVpbnQxNihyZWFkZXIpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGNvbnN0IGV4dHJhTGltaXQgPSAoc3RlcCAtIDEpIHwgMDsgLy8gMyBmb3IgcmdiLCA0IGZvciBjbXlrXG5cblx0Zm9yIChsZXQgYyA9IDAsIGxpID0gMDsgYyA8IG9mZnNldHMubGVuZ3RoOyBjKyspIHtcblx0XHRjb25zdCBvZmZzZXQgPSBvZmZzZXRzW2NdIHwgMDtcblx0XHRjb25zdCBleHRyYSA9IGMgPiBleHRyYUxpbWl0IHx8IG9mZnNldCA+IGV4dHJhTGltaXQ7XG5cblx0XHRpZiAoIWRhdGEgfHwgZXh0cmEpIHtcblx0XHRcdGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyB5KyssIGxpKyspIHtcblx0XHRcdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVuZ3Roc1tsaV0pO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRmb3IgKGxldCB5ID0gMCwgcCA9IG9mZnNldCB8IDA7IHkgPCBoZWlnaHQ7IHkrKywgbGkrKykge1xuXHRcdFx0XHRjb25zdCBsZW5ndGggPSBsZW5ndGhzW2xpXTtcblx0XHRcdFx0Y29uc3QgYnVmZmVyID0gcmVhZEJ5dGVzKHJlYWRlciwgbGVuZ3RoKTtcblxuXHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0bGV0IGhlYWRlciA9IGJ1ZmZlcltpXTtcblxuXHRcdFx0XHRcdGlmIChoZWFkZXIgPiAxMjgpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHZhbHVlID0gYnVmZmVyWysraV07XG5cdFx0XHRcdFx0XHRoZWFkZXIgPSAoMjU2IC0gaGVhZGVyKSB8IDA7XG5cblx0XHRcdFx0XHRcdGZvciAobGV0IGogPSAwOyBqIDw9IGhlYWRlcjsgaiA9IChqICsgMSkgfCAwKSB7XG5cdFx0XHRcdFx0XHRcdGRhdGFbcF0gPSB2YWx1ZTtcblx0XHRcdFx0XHRcdFx0cCA9IChwICsgc3RlcCkgfCAwO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoaGVhZGVyIDwgMTI4KSB7XG5cdFx0XHRcdFx0XHRmb3IgKGxldCBqID0gMDsgaiA8PSBoZWFkZXI7IGogPSAoaiArIDEpIHwgMCkge1xuXHRcdFx0XHRcdFx0XHRkYXRhW3BdID0gYnVmZmVyWysraV07XG5cdFx0XHRcdFx0XHRcdHAgPSAocCArIHN0ZXApIHwgMDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Ly8gaWdub3JlIDEyOFxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChpID49IGxlbmd0aCkge1xuXHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIFJMRSBkYXRhOiBleGNlZWRlZCBidWZmZXIgc2l6ZSAke2l9LyR7bGVuZ3RofWApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZFNlY3Rpb248VD4oXG5cdHJlYWRlcjogUHNkUmVhZGVyLCByb3VuZDogbnVtYmVyLCBmdW5jOiAobGVmdDogKCkgPT4gbnVtYmVyKSA9PiBULCBza2lwRW1wdHkgPSB0cnVlLCBlaWdodEJ5dGVzID0gZmFsc2Vcbik6IFQgfCB1bmRlZmluZWQge1xuXHRsZXQgbGVuZ3RoID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXG5cdGlmIChlaWdodEJ5dGVzKSB7XG5cdFx0aWYgKGxlbmd0aCAhPT0gMCkgdGhyb3cgbmV3IEVycm9yKCdTaXplcyBsYXJnZXIgdGhhbiA0R0IgYXJlIG5vdCBzdXBwb3J0ZWQnKTtcblx0XHRsZW5ndGggPSByZWFkVWludDMyKHJlYWRlcik7XG5cdH1cblxuXHRpZiAobGVuZ3RoIDw9IDAgJiYgc2tpcEVtcHR5KSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdGxldCBlbmQgPSByZWFkZXIub2Zmc2V0ICsgbGVuZ3RoO1xuXHRjb25zdCByZXN1bHQgPSBmdW5jKCgpID0+IGVuZCAtIHJlYWRlci5vZmZzZXQpO1xuXG5cdGlmIChyZWFkZXIub2Zmc2V0ID4gZW5kKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdFeGNlZWRlZCBzZWN0aW9uIGxpbWl0cycpO1xuXHR9XG5cblx0aWYgKHJlYWRlci5vZmZzZXQgIT09IGVuZCAmJiByZWFkZXIuc3RyaWN0KSB7XG5cdFx0Ly8gdGhyb3cgbmV3IEVycm9yKGBVbnJlYWQgc2VjdGlvbiBkYXRhOiAke2VuZCAtIHJlYWRlci5vZmZzZXR9IGJ5dGVzIGF0IDB4JHtyZWFkZXIub2Zmc2V0LnRvU3RyaW5nKDE2KX1gKTtcblx0XHRjb25zb2xlLndhcm4oJ1VucmVhZCBzZWN0aW9uIGRhdGEnKTtcblx0fVxuXG5cdHdoaWxlIChlbmQgJSByb3VuZCkgZW5kKys7XG5cblx0cmVhZGVyLm9mZnNldCA9IGVuZDtcblx0cmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRDb2xvcihyZWFkZXI6IFBzZFJlYWRlcik6IENvbG9yIHtcblx0Y29uc3QgY29sb3JTcGFjZSA9IHJlYWRVaW50MTYocmVhZGVyKSBhcyBDb2xvclNwYWNlO1xuXG5cdHN3aXRjaCAoY29sb3JTcGFjZSkge1xuXHRcdGNhc2UgQ29sb3JTcGFjZS5SR0I6IHtcblx0XHRcdGNvbnN0IHIgPSByZWFkVWludDE2KHJlYWRlcikgLyAyNTc7XG5cdFx0XHRjb25zdCBnID0gcmVhZFVpbnQxNihyZWFkZXIpIC8gMjU3O1xuXHRcdFx0Y29uc3QgYiA9IHJlYWRVaW50MTYocmVhZGVyKSAvIDI1Nztcblx0XHRcdHNraXBCeXRlcyhyZWFkZXIsIDIpO1xuXHRcdFx0cmV0dXJuIHsgciwgZywgYiB9O1xuXHRcdH1cblx0XHRjYXNlIENvbG9yU3BhY2UuSFNCOiB7XG5cdFx0XHRjb25zdCBoID0gcmVhZFVpbnQxNihyZWFkZXIpIC8gMHhmZmZmO1xuXHRcdFx0Y29uc3QgcyA9IHJlYWRVaW50MTYocmVhZGVyKSAvIDB4ZmZmZjtcblx0XHRcdGNvbnN0IGIgPSByZWFkVWludDE2KHJlYWRlcikgLyAweGZmZmY7XG5cdFx0XHRza2lwQnl0ZXMocmVhZGVyLCAyKTtcblx0XHRcdHJldHVybiB7IGgsIHMsIGIgfTtcblx0XHR9XG5cdFx0Y2FzZSBDb2xvclNwYWNlLkNNWUs6IHtcblx0XHRcdGNvbnN0IGMgPSByZWFkVWludDE2KHJlYWRlcikgLyAyNTc7XG5cdFx0XHRjb25zdCBtID0gcmVhZFVpbnQxNihyZWFkZXIpIC8gMjU3O1xuXHRcdFx0Y29uc3QgeSA9IHJlYWRVaW50MTYocmVhZGVyKSAvIDI1Nztcblx0XHRcdGNvbnN0IGsgPSByZWFkVWludDE2KHJlYWRlcikgLyAyNTc7XG5cdFx0XHRyZXR1cm4geyBjLCBtLCB5LCBrIH07XG5cdFx0fVxuXHRcdGNhc2UgQ29sb3JTcGFjZS5MYWI6IHtcblx0XHRcdGNvbnN0IGwgPSByZWFkSW50MTYocmVhZGVyKSAvIDEwMDAwO1xuXHRcdFx0Y29uc3QgdGEgPSByZWFkSW50MTYocmVhZGVyKTtcblx0XHRcdGNvbnN0IHRiID0gcmVhZEludDE2KHJlYWRlcik7XG5cdFx0XHRjb25zdCBhID0gdGEgPCAwID8gKHRhIC8gMTI4MDApIDogKHRhIC8gMTI3MDApO1xuXHRcdFx0Y29uc3QgYiA9IHRiIDwgMCA/ICh0YiAvIDEyODAwKSA6ICh0YiAvIDEyNzAwKTtcblx0XHRcdHNraXBCeXRlcyhyZWFkZXIsIDIpO1xuXHRcdFx0cmV0dXJuIHsgbCwgYSwgYiB9O1xuXHRcdH1cblx0XHRjYXNlIENvbG9yU3BhY2UuR3JheXNjYWxlOiB7XG5cdFx0XHRjb25zdCBrID0gcmVhZFVpbnQxNihyZWFkZXIpICogMjU1IC8gMTAwMDA7XG5cdFx0XHRza2lwQnl0ZXMocmVhZGVyLCA2KTtcblx0XHRcdHJldHVybiB7IGsgfTtcblx0XHR9XG5cdFx0ZGVmYXVsdDpcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2xvciBzcGFjZScpO1xuXHR9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkUGF0dGVybihyZWFkZXI6IFBzZFJlYWRlcik6IFBhdHRlcm5JbmZvIHtcblx0cmVhZFVpbnQzMihyZWFkZXIpOyAvLyBsZW5ndGhcblx0Y29uc3QgdmVyc2lvbiA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0aWYgKHZlcnNpb24gIT09IDEpIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBwYXR0ZXJuIHZlcnNpb246ICR7dmVyc2lvbn1gKTtcblxuXHRjb25zdCBjb2xvck1vZGUgPSByZWFkVWludDMyKHJlYWRlcikgYXMgQ29sb3JNb2RlO1xuXHRjb25zdCB4ID0gcmVhZEludDE2KHJlYWRlcik7XG5cdGNvbnN0IHkgPSByZWFkSW50MTYocmVhZGVyKTtcblxuXHQvLyB3ZSBvbmx5IHN1cHBvcnQgUkdCIGFuZCBncmF5c2NhbGUgZm9yIG5vd1xuXHRpZiAoY29sb3JNb2RlICE9PSBDb2xvck1vZGUuUkdCICYmIGNvbG9yTW9kZSAhPT0gQ29sb3JNb2RlLkdyYXlzY2FsZSAmJiBjb2xvck1vZGUgIT09IENvbG9yTW9kZS5JbmRleGVkKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBwYXR0ZXJuIGNvbG9yIG1vZGU6ICR7Y29sb3JNb2RlfWApO1xuXHR9XG5cblx0bGV0IG5hbWUgPSByZWFkVW5pY29kZVN0cmluZyhyZWFkZXIpO1xuXHRjb25zdCBpZCA9IHJlYWRQYXNjYWxTdHJpbmcocmVhZGVyLCAxKTtcblx0Y29uc3QgcGFsZXR0ZTogUkdCW10gPSBbXTtcblxuXHRpZiAoY29sb3JNb2RlID09PSBDb2xvck1vZGUuSW5kZXhlZCkge1xuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMjU2OyBpKyspIHtcblx0XHRcdHBhbGV0dGUucHVzaCh7XG5cdFx0XHRcdHI6IHJlYWRVaW50OChyZWFkZXIpLFxuXHRcdFx0XHRnOiByZWFkVWludDgocmVhZGVyKSxcblx0XHRcdFx0YjogcmVhZFVpbnQ4KHJlYWRlciksXG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIDQpOyAvLyBubyBpZGVhIHdoYXQgdGhpcyBpc1xuXHR9XG5cblx0Ly8gdmlydHVhbCBtZW1vcnkgYXJyYXkgbGlzdFxuXHRjb25zdCB2ZXJzaW9uMiA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0aWYgKHZlcnNpb24yICE9PSAzKSB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcGF0dGVybiBWTUFMIHZlcnNpb246ICR7dmVyc2lvbjJ9YCk7XG5cblx0cmVhZFVpbnQzMihyZWFkZXIpOyAvLyBsZW5ndGhcblx0Y29uc3QgdG9wID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXHRjb25zdCBsZWZ0ID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXHRjb25zdCBib3R0b20gPSByZWFkVWludDMyKHJlYWRlcik7XG5cdGNvbnN0IHJpZ2h0ID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXHRjb25zdCBjaGFubmVsc0NvdW50ID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXHRjb25zdCB3aWR0aCA9IHJpZ2h0IC0gbGVmdDtcblx0Y29uc3QgaGVpZ2h0ID0gYm90dG9tIC0gdG9wO1xuXHRjb25zdCBkYXRhID0gbmV3IFVpbnQ4QXJyYXkod2lkdGggKiBoZWlnaHQgKiA0KTtcblxuXHRmb3IgKGxldCBpID0gMzsgaSA8IGRhdGEuYnl0ZUxlbmd0aDsgaSArPSA0KSB7XG5cdFx0ZGF0YVtpXSA9IDI1NTtcblx0fVxuXG5cdGZvciAobGV0IGkgPSAwLCBjaCA9IDA7IGkgPCAoY2hhbm5lbHNDb3VudCArIDIpOyBpKyspIHtcblx0XHRjb25zdCBoYXMgPSByZWFkVWludDMyKHJlYWRlcik7XG5cdFx0aWYgKCFoYXMpIGNvbnRpbnVlO1xuXG5cdFx0Y29uc3QgbGVuZ3RoID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXHRcdGNvbnN0IHBpeGVsRGVwdGggPSByZWFkVWludDMyKHJlYWRlcik7XG5cdFx0Y29uc3QgY3RvcCA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHRjb25zdCBjbGVmdCA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHRjb25zdCBjYm90dG9tID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXHRcdGNvbnN0IGNyaWdodCA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHRjb25zdCBwaXhlbERlcHRoMiA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRjb25zdCBjb21wcmVzc2lvbk1vZGUgPSByZWFkVWludDgocmVhZGVyKTsgLy8gMCAtIHJhdywgMSAtIHppcFxuXHRcdGNvbnN0IGRhdGFMZW5ndGggPSBsZW5ndGggLSAoNCArIDE2ICsgMiArIDEpO1xuXHRcdGNvbnN0IGNkYXRhID0gcmVhZEJ5dGVzKHJlYWRlciwgZGF0YUxlbmd0aCk7XG5cblx0XHRpZiAocGl4ZWxEZXB0aCAhPT0gOCB8fCBwaXhlbERlcHRoMiAhPT0gOCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCcxNmJpdCBwaXhlbCBkZXB0aCBub3Qgc3VwcG9ydGVkIGZvciBwYXR0ZXJucycpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHcgPSBjcmlnaHQgLSBjbGVmdDtcblx0XHRjb25zdCBoID0gY2JvdHRvbSAtIGN0b3A7XG5cdFx0Y29uc3Qgb3ggPSBjbGVmdCAtIGxlZnQ7XG5cdFx0Y29uc3Qgb3kgPSBjdG9wIC0gdG9wO1xuXG5cdFx0aWYgKGNvbXByZXNzaW9uTW9kZSA9PT0gMCkge1xuXHRcdFx0aWYgKGNvbG9yTW9kZSA9PT0gQ29sb3JNb2RlLlJHQiAmJiBjaCA8IDMpIHtcblx0XHRcdFx0Zm9yIChsZXQgeSA9IDA7IHkgPCBoOyB5KyspIHtcblx0XHRcdFx0XHRmb3IgKGxldCB4ID0gMDsgeCA8IHc7IHgrKykge1xuXHRcdFx0XHRcdFx0Y29uc3Qgc3JjID0geCArIHkgKiB3O1xuXHRcdFx0XHRcdFx0Y29uc3QgZHN0ID0gKG94ICsgeCArICh5ICsgb3kpICogd2lkdGgpICogNDtcblx0XHRcdFx0XHRcdGRhdGFbZHN0ICsgY2hdID0gY2RhdGFbc3JjXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKGNvbG9yTW9kZSA9PT0gQ29sb3JNb2RlLkdyYXlzY2FsZSAmJiBjaCA8IDEpIHtcblx0XHRcdFx0Zm9yIChsZXQgeSA9IDA7IHkgPCBoOyB5KyspIHtcblx0XHRcdFx0XHRmb3IgKGxldCB4ID0gMDsgeCA8IHc7IHgrKykge1xuXHRcdFx0XHRcdFx0Y29uc3Qgc3JjID0geCArIHkgKiB3O1xuXHRcdFx0XHRcdFx0Y29uc3QgZHN0ID0gKG94ICsgeCArICh5ICsgb3kpICogd2lkdGgpICogNDtcblx0XHRcdFx0XHRcdGNvbnN0IHZhbHVlID0gY2RhdGFbc3JjXTtcblx0XHRcdFx0XHRcdGRhdGFbZHN0ICsgMF0gPSB2YWx1ZTtcblx0XHRcdFx0XHRcdGRhdGFbZHN0ICsgMV0gPSB2YWx1ZTtcblx0XHRcdFx0XHRcdGRhdGFbZHN0ICsgMl0gPSB2YWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKGNvbG9yTW9kZSA9PT0gQ29sb3JNb2RlLkluZGV4ZWQpIHtcblx0XHRcdFx0Ly8gVE9ETzpcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbmRleGVkIHBhdHRlcm4gY29sb3IgbW9kZSBub3QgaW1wbGVtZW50ZWQnKTtcblx0XHRcdH1cblx0XHR9IGVsc2UgaWYgKGNvbXByZXNzaW9uTW9kZSA9PT0gMSkge1xuXHRcdFx0Ly8gY29uc29sZS5sb2coeyBjb2xvck1vZGUgfSk7XG5cdFx0XHQvLyByZXF1aXJlKCdmcycpLndyaXRlRmlsZVN5bmMoJ3ppcC5iaW4nLCBCdWZmZXIuZnJvbShjZGF0YSkpO1xuXHRcdFx0Ly8gY29uc3QgZGF0YSA9IHJlcXVpcmUoJ3psaWInKS5pbmZsYXRlUmF3U3luYyhjZGF0YSk7XG5cdFx0XHQvLyBjb25zdCBkYXRhID0gcmVxdWlyZSgnemxpYicpLnVuemlwU3luYyhjZGF0YSk7XG5cdFx0XHQvLyBjb25zb2xlLmxvZyhkYXRhKTtcblx0XHRcdC8vIHRocm93IG5ldyBFcnJvcignWmlwIGNvbXByZXNzaW9uIG5vdCBzdXBwb3J0ZWQgZm9yIHBhdHRlcm4nKTtcblx0XHRcdC8vIHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgcGF0dGVybiBjb21wcmVzc2lvbicpO1xuXHRcdFx0Y29uc29sZS5lcnJvcignVW5zdXBwb3J0ZWQgcGF0dGVybiBjb21wcmVzc2lvbicpO1xuXHRcdFx0bmFtZSArPSAnIChmYWlsZWQgdG8gZGVjb2RlKSc7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBwYXR0ZXJuIGNvbXByZXNzaW9uIG1vZGUnKTtcblx0XHR9XG5cblx0XHRjaCsrO1xuXHR9XG5cblx0Ly8gVE9ETzogdXNlIGNhbnZhcyBpbnN0ZWFkIG9mIGRhdGEgP1xuXG5cdHJldHVybiB7IGlkLCBuYW1lLCB4LCB5LCBib3VuZHM6IHsgeDogbGVmdCwgeTogdG9wLCB3OiB3aWR0aCwgaDogaGVpZ2h0IH0sIGRhdGEgfTtcbn1cbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL2JyYW5kb25saXUvRGVza3RvcC9za3lsYWIvYWctcHNkL3NyYyJ9
