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
import { hasAlpha, createCanvas, writeDataRLE, offsetForChannel, createImageData, fromBlendMode, clamp, largeAdditionalInfoKeys, RAW_IMAGE_DATA } from './helpers';
import { hasMultiEffects, infoHandlers } from './additionalInfo';
import { resourceHandlers } from './imageResources';
export function createWriter(size) {
    if (size === void 0) { size = 4096; }
    var buffer = new ArrayBuffer(size);
    var view = new DataView(buffer);
    var offset = 0;
    return { buffer: buffer, view: view, offset: offset };
}
export function getWriterBuffer(writer) {
    return writer.buffer.slice(0, writer.offset);
}
export function getWriterBufferNoCopy(writer) {
    return new Uint8Array(writer.buffer, 0, writer.offset);
}
export function writeUint8(writer, value) {
    var offset = addSize(writer, 1);
    writer.view.setUint8(offset, value);
}
export function writeInt16(writer, value) {
    var offset = addSize(writer, 2);
    writer.view.setInt16(offset, value, false);
}
export function writeUint16(writer, value) {
    var offset = addSize(writer, 2);
    writer.view.setUint16(offset, value, false);
}
export function writeInt32(writer, value) {
    var offset = addSize(writer, 4);
    writer.view.setInt32(offset, value, false);
}
export function writeUint32(writer, value) {
    var offset = addSize(writer, 4);
    writer.view.setUint32(offset, value, false);
}
export function writeFloat32(writer, value) {
    var offset = addSize(writer, 4);
    writer.view.setFloat32(offset, value, false);
}
export function writeFloat64(writer, value) {
    var offset = addSize(writer, 8);
    writer.view.setFloat64(offset, value, false);
}
// 32-bit fixed-point number 16.16
export function writeFixedPoint32(writer, value) {
    writeInt32(writer, value * (1 << 16));
}
// 32-bit fixed-point number 8.24
export function writeFixedPointPath32(writer, value) {
    writeInt32(writer, value * (1 << 24));
}
export function writeBytes(writer, buffer) {
    if (buffer) {
        ensureSize(writer, writer.offset + buffer.length);
        var bytes = new Uint8Array(writer.buffer);
        bytes.set(buffer, writer.offset);
        writer.offset += buffer.length;
    }
}
export function writeZeros(writer, count) {
    for (var i = 0; i < count; i++) {
        writeUint8(writer, 0);
    }
}
export function writeSignature(writer, signature) {
    if (signature.length !== 4)
        throw new Error("Invalid signature: '" + signature + "'");
    for (var i = 0; i < 4; i++) {
        writeUint8(writer, signature.charCodeAt(i));
    }
}
export function writePascalString(writer, text, padTo) {
    var length = text.length;
    writeUint8(writer, length);
    for (var i = 0; i < length; i++) {
        var code = text.charCodeAt(i);
        writeUint8(writer, code < 128 ? code : '?'.charCodeAt(0));
    }
    while (++length % padTo) {
        writeUint8(writer, 0);
    }
}
export function writeUnicodeString(writer, text) {
    writeUint32(writer, text.length);
    for (var i = 0; i < text.length; i++) {
        writeUint16(writer, text.charCodeAt(i));
    }
}
export function writeUnicodeStringWithPadding(writer, text) {
    writeUint32(writer, text.length + 1);
    for (var i = 0; i < text.length; i++) {
        writeUint16(writer, text.charCodeAt(i));
    }
    writeUint16(writer, 0);
}
function getLargestLayerSize(layers) {
    if (layers === void 0) { layers = []; }
    var max = 0;
    for (var _i = 0, layers_1 = layers; _i < layers_1.length; _i++) {
        var layer = layers_1[_i];
        if (layer.canvas || layer.imageData) {
            var _a = getLayerDimentions(layer), width = _a.width, height = _a.height;
            max = Math.max(max, 2 * height + 2 * width * height);
        }
        if (layer.children) {
            max = Math.max(max, getLargestLayerSize(layer.children));
        }
    }
    return max;
}
export function writeSection(writer, round, func, writeTotalLength, large) {
    if (writeTotalLength === void 0) { writeTotalLength = false; }
    if (large === void 0) { large = false; }
    if (large)
        writeUint32(writer, 0);
    var offset = writer.offset;
    writeUint32(writer, 0);
    func();
    var length = writer.offset - offset - 4;
    var len = length;
    while ((len % round) !== 0) {
        writeUint8(writer, 0);
        len++;
    }
    if (writeTotalLength) {
        length = len;
    }
    writer.view.setUint32(offset, length, false);
}
export function writePsd(writer, psd, options) {
    if (options === void 0) { options = {}; }
    if (!(+psd.width > 0 && +psd.height > 0))
        throw new Error('Invalid document size');
    if ((psd.width > 30000 || psd.height > 30000) && !options.psb)
        throw new Error('Document size is too large (max is 30000x30000, use PSB format instead)');
    var imageResources = psd.imageResources || {};
    var opt = __assign(__assign({}, options), { layerIds: [] });
    if (opt.generateThumbnail) {
        imageResources = __assign(__assign({}, imageResources), { thumbnail: createThumbnail(psd) });
    }
    var imageData = psd.imageData;
    if (!imageData && psd.canvas) {
        imageData = psd.canvas.getContext('2d').getImageData(0, 0, psd.canvas.width, psd.canvas.height);
    }
    if (imageData && (psd.width !== imageData.width || psd.height !== imageData.height))
        throw new Error('Document canvas must have the same size as document');
    var globalAlpha = !!imageData && hasAlpha(imageData);
    var maxBufferSize = Math.max(getLargestLayerSize(psd.children), 4 * 2 * psd.width * psd.height + 2 * psd.height);
    var tempBuffer = new Uint8Array(maxBufferSize);
    // header
    writeSignature(writer, '8BPS');
    writeUint16(writer, options.psb ? 2 : 1); // version
    writeZeros(writer, 6);
    writeUint16(writer, globalAlpha ? 4 : 3); // channels
    writeUint32(writer, psd.height);
    writeUint32(writer, psd.width);
    writeUint16(writer, 8); // bits per channel
    writeUint16(writer, 3 /* RGB */); // we only support saving RGB right now
    // color mode data
    writeSection(writer, 1, function () {
        // TODO: implement
    });
    // image resources
    writeSection(writer, 1, function () {
        var _loop_1 = function (handler) {
            if (handler.has(imageResources)) {
                writeSignature(writer, '8BIM');
                writeUint16(writer, handler.key);
                writePascalString(writer, '', 2);
                writeSection(writer, 2, function () { return handler.write(writer, imageResources); });
            }
        };
        for (var _i = 0, resourceHandlers_1 = resourceHandlers; _i < resourceHandlers_1.length; _i++) {
            var handler = resourceHandlers_1[_i];
            _loop_1(handler);
        }
    });
    // layer and mask info
    writeSection(writer, 2, function () {
        writeLayerInfo(tempBuffer, writer, psd, globalAlpha, opt);
        writeGlobalLayerMaskInfo(writer, psd.globalLayerMaskInfo);
        writeAdditionalLayerInfo(writer, psd, psd, opt);
    }, undefined, !!opt.psb);
    // image data
    var channels = globalAlpha ? [0, 1, 2, 3] : [0, 1, 2];
    var data = imageData || {
        data: new Uint8Array(4 * psd.width * psd.height),
        width: psd.width,
        height: psd.height,
    };
    writeUint16(writer, 1 /* RleCompressed */);
    if (RAW_IMAGE_DATA && psd.imageDataRaw) {
        console.log('writing raw image data');
        writeBytes(writer, psd.imageDataRaw);
    }
    else {
        writeBytes(writer, writeDataRLE(tempBuffer, data, psd.width, psd.height, channels, !!options.psb));
    }
}
function writeLayerInfo(tempBuffer, writer, psd, globalAlpha, options) {
    writeSection(writer, 4, function () {
        var _a;
        var layers = [];
        addChildren(layers, psd.children);
        if (!layers.length)
            layers.push({});
        writeInt16(writer, globalAlpha ? -layers.length : layers.length);
        var layersData = layers.map(function (l, i) { return getChannels(tempBuffer, l, i === 0, options); });
        var _loop_2 = function (layerData) {
            var layer = layerData.layer, top_1 = layerData.top, left = layerData.left, bottom = layerData.bottom, right = layerData.right, channels = layerData.channels;
            writeInt32(writer, top_1);
            writeInt32(writer, left);
            writeInt32(writer, bottom);
            writeInt32(writer, right);
            writeUint16(writer, channels.length);
            for (var _e = 0, channels_1 = channels; _e < channels_1.length; _e++) {
                var c = channels_1[_e];
                writeInt16(writer, c.channelId);
                if (options.psb)
                    writeUint32(writer, 0);
                writeUint32(writer, c.length);
            }
            writeSignature(writer, '8BIM');
            writeSignature(writer, fromBlendMode[layer.blendMode] || 'norm');
            writeUint8(writer, Math.round(clamp((_a = layer.opacity) !== null && _a !== void 0 ? _a : 1, 0, 1) * 255));
            writeUint8(writer, layer.clipping ? 1 : 0);
            var flags = 0x08; // 1 for Photoshop 5.0 and later, tells if bit 4 has useful information
            if (layer.transparencyProtected)
                flags |= 0x01;
            if (layer.hidden)
                flags |= 0x02;
            if (layer.vectorMask || (layer.sectionDivider && layer.sectionDivider.type !== 0 /* Other */)) {
                flags |= 0x10; // pixel data irrelevant to appearance of document
            }
            if (layer.effects && hasMultiEffects(layer.effects)) { // TODO: this is not correct
                flags |= 0x20; // just guessing this one, might be completely incorrect
            }
            // if ('_2' in layer) flags |= 0x20; // TEMP!!!
            writeUint8(writer, flags);
            writeUint8(writer, 0); // filler
            writeSection(writer, 1, function () {
                writeLayerMaskData(writer, layer, layerData);
                writeLayerBlendingRanges(writer, psd);
                writePascalString(writer, layer.name || '', 4);
                writeAdditionalLayerInfo(writer, layer, psd, options);
            });
        };
        // layer records
        for (var _i = 0, layersData_1 = layersData; _i < layersData_1.length; _i++) {
            var layerData = layersData_1[_i];
            _loop_2(layerData);
        }
        // layer channel image data
        for (var _b = 0, layersData_2 = layersData; _b < layersData_2.length; _b++) {
            var layerData = layersData_2[_b];
            for (var _c = 0, _d = layerData.channels; _c < _d.length; _c++) {
                var channel = _d[_c];
                writeUint16(writer, channel.compression);
                if (channel.buffer) {
                    writeBytes(writer, channel.buffer);
                }
            }
        }
    }, true, options.psb);
}
function writeLayerMaskData(writer, _a, layerData) {
    var mask = _a.mask;
    writeSection(writer, 1, function () {
        if (!mask)
            return;
        var m = layerData.mask || {};
        writeInt32(writer, m.top);
        writeInt32(writer, m.left);
        writeInt32(writer, m.bottom);
        writeInt32(writer, m.right);
        writeUint8(writer, mask.defaultColor);
        var params = 0;
        if (mask.userMaskDensity !== undefined)
            params |= 1 /* UserMaskDensity */;
        if (mask.userMaskFeather !== undefined)
            params |= 2 /* UserMaskFeather */;
        if (mask.vectorMaskDensity !== undefined)
            params |= 4 /* VectorMaskDensity */;
        if (mask.vectorMaskFeather !== undefined)
            params |= 8 /* VectorMaskFeather */;
        var flags = 0;
        if (mask.disabled)
            flags |= 2 /* LayerMaskDisabled */;
        if (mask.positionRelativeToLayer)
            flags |= 1 /* PositionRelativeToLayer */;
        if (mask.fromVectorData)
            flags |= 8 /* LayerMaskFromRenderingOtherData */;
        if (params)
            flags |= 16 /* MaskHasParametersAppliedToIt */;
        writeUint8(writer, flags);
        if (params) {
            writeUint8(writer, params);
            if (mask.userMaskDensity !== undefined)
                writeUint8(writer, Math.round(mask.userMaskDensity * 0xff));
            if (mask.userMaskFeather !== undefined)
                writeFloat64(writer, mask.userMaskFeather);
            if (mask.vectorMaskDensity !== undefined)
                writeUint8(writer, Math.round(mask.vectorMaskDensity * 0xff));
            if (mask.vectorMaskFeather !== undefined)
                writeFloat64(writer, mask.vectorMaskFeather);
        }
        // TODO: handle rest of the fields
        writeZeros(writer, 2);
    });
}
function writeLayerBlendingRanges(writer, psd) {
    writeSection(writer, 1, function () {
        writeUint32(writer, 65535);
        writeUint32(writer, 65535);
        var channels = psd.channels || 0; // TODO: use always 4 instead ?
        // channels = 4; // TESTING
        for (var i = 0; i < channels; i++) {
            writeUint32(writer, 65535);
            writeUint32(writer, 65535);
        }
    });
}
function writeGlobalLayerMaskInfo(writer, info) {
    writeSection(writer, 1, function () {
        if (info) {
            writeUint16(writer, info.overlayColorSpace);
            writeUint16(writer, info.colorSpace1);
            writeUint16(writer, info.colorSpace2);
            writeUint16(writer, info.colorSpace3);
            writeUint16(writer, info.colorSpace4);
            writeUint16(writer, info.opacity * 0xff);
            writeUint8(writer, info.kind);
            writeZeros(writer, 3);
        }
    });
}
function writeAdditionalLayerInfo(writer, target, psd, options) {
    var _loop_3 = function (handler) {
        var key = handler.key;
        if (key === 'Txt2' && options.invalidateTextLayers)
            return "continue";
        if (key === 'vmsk' && options.psb)
            key = 'vsms';
        if (handler.has(target)) {
            var large = options.psb && largeAdditionalInfoKeys.indexOf(key) !== -1;
            writeSignature(writer, large ? '8B64' : '8BIM');
            writeSignature(writer, key);
            var fourBytes = key === 'Txt2' || key === 'luni' || key === 'vmsk' || key === 'artb' || key === 'artd' ||
                key === 'vogk' || key === 'SoLd' || key === 'lnk2' || key === 'vscg' || key === 'vsms' || key === 'GdFl' ||
                key === 'lmfx' || key === 'lrFX' || key === 'cinf' || key === 'PlLd' || key === 'Anno';
            writeSection(writer, fourBytes ? 4 : 2, function () {
                handler.write(writer, target, psd, options);
            }, key !== 'Txt2' && key !== 'cinf' && key !== 'extn', large);
        }
    };
    for (var _i = 0, infoHandlers_1 = infoHandlers; _i < infoHandlers_1.length; _i++) {
        var handler = infoHandlers_1[_i];
        _loop_3(handler);
    }
}
function addChildren(layers, children) {
    if (!children)
        return;
    for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
        var c = children_1[_i];
        if (c.children && c.canvas)
            throw new Error("Invalid layer, cannot have both 'canvas' and 'children' properties");
        if (c.children && c.imageData)
            throw new Error("Invalid layer, cannot have both 'imageData' and 'children' properties");
        if (c.children) {
            layers.push({
                name: '</Layer group>',
                sectionDivider: {
                    type: 3 /* BoundingSectionDivider */,
                },
                // TESTING
                // nameSource: 'lset',
                // id: [4, 0, 0, 8, 11, 0, 0, 0, 0, 14][layers.length] || 0,
                // layerColor: 'none',
                // timestamp: [1611346817.349021, 0, 0, 1611346817.349175, 1611346817.3491833, 0, 0, 0, 0, 1611346817.349832][layers.length] || 0,
                // protected: {},
                // referencePoint: { x: 0, y: 0 },
            });
            addChildren(layers, c.children);
            layers.push(__assign({ sectionDivider: {
                    type: c.opened === false ? 2 /* ClosedFolder */ : 1 /* OpenFolder */,
                    key: fromBlendMode[c.blendMode] || 'pass',
                    subType: 0,
                } }, c));
        }
        else {
            layers.push(__assign({}, c));
        }
    }
}
function resizeBuffer(writer, size) {
    var newLength = writer.buffer.byteLength;
    do {
        newLength *= 2;
    } while (size > newLength);
    var newBuffer = new ArrayBuffer(newLength);
    var newBytes = new Uint8Array(newBuffer);
    var oldBytes = new Uint8Array(writer.buffer);
    newBytes.set(oldBytes);
    writer.buffer = newBuffer;
    writer.view = new DataView(writer.buffer);
}
function ensureSize(writer, size) {
    if (size > writer.buffer.byteLength) {
        resizeBuffer(writer, size);
    }
}
function addSize(writer, size) {
    var offset = writer.offset;
    ensureSize(writer, writer.offset += size);
    return offset;
}
function createThumbnail(psd) {
    var canvas = createCanvas(10, 10);
    var scale = 1;
    if (psd.width > psd.height) {
        canvas.width = 160;
        canvas.height = Math.floor(psd.height * (canvas.width / psd.width));
        scale = canvas.width / psd.width;
    }
    else {
        canvas.height = 160;
        canvas.width = Math.floor(psd.width * (canvas.height / psd.height));
        scale = canvas.height / psd.height;
    }
    var context = canvas.getContext('2d');
    context.scale(scale, scale);
    if (psd.imageData) {
        var temp = createCanvas(psd.imageData.width, psd.imageData.height);
        temp.getContext('2d').putImageData(psd.imageData, 0, 0);
        context.drawImage(temp, 0, 0);
    }
    else if (psd.canvas) {
        context.drawImage(psd.canvas, 0, 0);
    }
    return canvas;
}
function getChannels(tempBuffer, layer, background, options) {
    var layerData = getLayerChannels(tempBuffer, layer, background, options);
    var mask = layer.mask;
    if (mask) {
        var _a = mask.top, top_2 = _a === void 0 ? 0 : _a, _b = mask.left, left = _b === void 0 ? 0 : _b, _c = mask.right, right = _c === void 0 ? 0 : _c, _d = mask.bottom, bottom = _d === void 0 ? 0 : _d;
        var _e = getLayerDimentions(mask), width = _e.width, height = _e.height;
        var imageData = mask.imageData;
        if (!imageData && mask.canvas && width && height) {
            imageData = mask.canvas.getContext('2d').getImageData(0, 0, width, height);
        }
        if (width && height && imageData) {
            right = left + width;
            bottom = top_2 + height;
            var buffer = writeDataRLE(tempBuffer, imageData, width, height, [0], !!options.psb);
            if (RAW_IMAGE_DATA && layer.maskDataRaw) {
                // console.log('written raw layer image data');
                buffer = layer.maskDataRaw;
            }
            layerData.mask = { top: top_2, left: left, right: right, bottom: bottom };
            layerData.channels.push({
                channelId: -2 /* UserMask */,
                compression: 1 /* RleCompressed */,
                buffer: buffer,
                length: 2 + buffer.length,
            });
        }
        else {
            layerData.mask = { top: 0, left: 0, right: 0, bottom: 0 };
            layerData.channels.push({
                channelId: -2 /* UserMask */,
                compression: 0 /* RawData */,
                buffer: new Uint8Array(0),
                length: 0,
            });
        }
    }
    return layerData;
}
function getLayerDimentions(_a) {
    var canvas = _a.canvas, imageData = _a.imageData;
    return imageData || canvas || { width: 0, height: 0 };
}
function cropImageData(data, left, top, width, height) {
    var croppedData = createImageData(width, height);
    var srcData = data.data;
    var dstData = croppedData.data;
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var src = ((x + left) + (y + top) * width) * 4;
            var dst = (x + y * width) * 4;
            dstData[dst] = srcData[src];
            dstData[dst + 1] = srcData[src + 1];
            dstData[dst + 2] = srcData[src + 2];
            dstData[dst + 3] = srcData[src + 3];
        }
    }
    return croppedData;
}
function getLayerChannels(tempBuffer, layer, background, options) {
    var _a;
    var _b = layer.top, top = _b === void 0 ? 0 : _b, _c = layer.left, left = _c === void 0 ? 0 : _c, _d = layer.right, right = _d === void 0 ? 0 : _d, _e = layer.bottom, bottom = _e === void 0 ? 0 : _e;
    var channels = [
        { channelId: -1 /* Transparency */, compression: 0 /* RawData */, buffer: undefined, length: 2 },
        { channelId: 0 /* Color0 */, compression: 0 /* RawData */, buffer: undefined, length: 2 },
        { channelId: 1 /* Color1 */, compression: 0 /* RawData */, buffer: undefined, length: 2 },
        { channelId: 2 /* Color2 */, compression: 0 /* RawData */, buffer: undefined, length: 2 },
    ];
    var _f = getLayerDimentions(layer), width = _f.width, height = _f.height;
    if (!(layer.canvas || layer.imageData) || !width || !height) {
        right = left;
        bottom = top;
        return { layer: layer, top: top, left: left, right: right, bottom: bottom, channels: channels };
    }
    right = left + width;
    bottom = top + height;
    var data = layer.imageData || layer.canvas.getContext('2d').getImageData(0, 0, width, height);
    if (options.trimImageData) {
        var trimmed = trimData(data);
        if (trimmed.left !== 0 || trimmed.top !== 0 || trimmed.right !== data.width || trimmed.bottom !== data.height) {
            left += trimmed.left;
            top += trimmed.top;
            right -= (data.width - trimmed.right);
            bottom -= (data.height - trimmed.bottom);
            width = right - left;
            height = bottom - top;
            if (!width || !height) {
                return { layer: layer, top: top, left: left, right: right, bottom: bottom, channels: channels };
            }
            if (layer.imageData) {
                data = cropImageData(data, trimmed.left, trimmed.top, width, height);
            }
            else {
                data = layer.canvas.getContext('2d').getImageData(trimmed.left, trimmed.top, width, height);
            }
        }
    }
    var channelIds = [
        0 /* Color0 */,
        1 /* Color1 */,
        2 /* Color2 */,
    ];
    if (!background || options.noBackground || layer.mask || hasAlpha(data) || (RAW_IMAGE_DATA && ((_a = layer.imageDataRaw) === null || _a === void 0 ? void 0 : _a['-1']))) {
        channelIds.unshift(-1 /* Transparency */);
    }
    channels = channelIds.map(function (channel) {
        var offset = offsetForChannel(channel, false); // TODO: psd.colorMode === ColorMode.CMYK);
        var buffer = writeDataRLE(tempBuffer, data, width, height, [offset], !!options.psb);
        if (RAW_IMAGE_DATA && layer.imageDataRaw) {
            // console.log('written raw layer image data');
            buffer = layer.imageDataRaw[channel];
        }
        return {
            channelId: channel,
            compression: 1 /* RleCompressed */,
            buffer: buffer,
            length: 2 + buffer.length,
        };
    });
    return { layer: layer, top: top, left: left, right: right, bottom: bottom, channels: channels };
}
function isRowEmpty(_a, y, left, right) {
    var data = _a.data, width = _a.width;
    var start = ((y * width + left) * 4 + 3) | 0;
    var end = (start + (right - left) * 4) | 0;
    for (var i = start; i < end; i = (i + 4) | 0) {
        if (data[i] !== 0) {
            return false;
        }
    }
    return true;
}
function isColEmpty(_a, x, top, bottom) {
    var data = _a.data, width = _a.width;
    var stride = (width * 4) | 0;
    var start = (top * stride + x * 4 + 3) | 0;
    for (var y = top, i = start; y < bottom; y++, i = (i + stride) | 0) {
        if (data[i] !== 0) {
            return false;
        }
    }
    return true;
}
function trimData(data) {
    var top = 0;
    var left = 0;
    var right = data.width;
    var bottom = data.height;
    while (top < bottom && isRowEmpty(data, top, left, right))
        top++;
    while (bottom > top && isRowEmpty(data, bottom - 1, left, right))
        bottom--;
    while (left < right && isColEmpty(data, left, top, bottom))
        left++;
    while (right > left && isColEmpty(data, right - 1, top, bottom))
        right--;
    return { top: top, left: left, right: right, bottom: bottom };
}
export function writeColor(writer, color) {
    if (!color) {
        writeUint16(writer, 0 /* RGB */);
        writeZeros(writer, 8);
    }
    else if ('r' in color) {
        writeUint16(writer, 0 /* RGB */);
        writeUint16(writer, Math.round(color.r * 257));
        writeUint16(writer, Math.round(color.g * 257));
        writeUint16(writer, Math.round(color.b * 257));
        writeUint16(writer, 0);
    }
    else if ('l' in color) {
        writeUint16(writer, 7 /* Lab */);
        writeInt16(writer, Math.round(color.l * 10000));
        writeInt16(writer, Math.round(color.a < 0 ? (color.a * 12800) : (color.a * 12700)));
        writeInt16(writer, Math.round(color.b < 0 ? (color.b * 12800) : (color.b * 12700)));
        writeUint16(writer, 0);
    }
    else if ('h' in color) {
        writeUint16(writer, 1 /* HSB */);
        writeUint16(writer, Math.round(color.h * 0xffff));
        writeUint16(writer, Math.round(color.s * 0xffff));
        writeUint16(writer, Math.round(color.b * 0xffff));
        writeUint16(writer, 0);
    }
    else if ('c' in color) {
        writeUint16(writer, 2 /* CMYK */);
        writeUint16(writer, Math.round(color.c * 257));
        writeUint16(writer, Math.round(color.m * 257));
        writeUint16(writer, Math.round(color.y * 257));
        writeUint16(writer, Math.round(color.k * 257));
    }
    else {
        writeUint16(writer, 8 /* Grayscale */);
        writeUint16(writer, Math.round(color.k * 10000 / 255));
        writeZeros(writer, 6);
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInBzZFdyaXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUNBLE9BQU8sRUFDTixRQUFRLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFDcEMsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBMEIsS0FBSyxFQUMvQix1QkFBdUIsRUFBRSxjQUFjLEVBQ3ZGLE1BQU0sV0FBVyxDQUFDO0FBQ25CLE9BQU8sRUFBd0IsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBUXBELE1BQU0sVUFBVSxZQUFZLENBQUMsSUFBVztJQUFYLHFCQUFBLEVBQUEsV0FBVztJQUN2QyxJQUFNLE1BQU0sR0FBRyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyQyxJQUFNLElBQUksR0FBRyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNsQyxJQUFNLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDakIsT0FBTyxFQUFFLE1BQU0sUUFBQSxFQUFFLElBQUksTUFBQSxFQUFFLE1BQU0sUUFBQSxFQUFFLENBQUM7QUFDakMsQ0FBQztBQUVELE1BQU0sVUFBVSxlQUFlLENBQUMsTUFBaUI7SUFDaEQsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFFRCxNQUFNLFVBQVUscUJBQXFCLENBQUMsTUFBaUI7SUFDdEQsT0FBTyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDeEQsQ0FBQztBQUVELE1BQU0sVUFBVSxVQUFVLENBQUMsTUFBaUIsRUFBRSxLQUFhO0lBQzFELElBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbEMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3JDLENBQUM7QUFFRCxNQUFNLFVBQVUsVUFBVSxDQUFDLE1BQWlCLEVBQUUsS0FBYTtJQUMxRCxJQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDNUMsQ0FBQztBQUVELE1BQU0sVUFBVSxXQUFXLENBQUMsTUFBaUIsRUFBRSxLQUFhO0lBQzNELElBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbEMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztBQUM3QyxDQUFDO0FBRUQsTUFBTSxVQUFVLFVBQVUsQ0FBQyxNQUFpQixFQUFFLEtBQWE7SUFDMUQsSUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzVDLENBQUM7QUFFRCxNQUFNLFVBQVUsV0FBVyxDQUFDLE1BQWlCLEVBQUUsS0FBYTtJQUMzRCxJQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDN0MsQ0FBQztBQUVELE1BQU0sVUFBVSxZQUFZLENBQUMsTUFBaUIsRUFBRSxLQUFhO0lBQzVELElBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbEMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztBQUM5QyxDQUFDO0FBRUQsTUFBTSxVQUFVLFlBQVksQ0FBQyxNQUFpQixFQUFFLEtBQWE7SUFDNUQsSUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFFRCxrQ0FBa0M7QUFDbEMsTUFBTSxVQUFVLGlCQUFpQixDQUFDLE1BQWlCLEVBQUUsS0FBYTtJQUNqRSxVQUFVLENBQUMsTUFBTSxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLENBQUM7QUFFRCxpQ0FBaUM7QUFDakMsTUFBTSxVQUFVLHFCQUFxQixDQUFDLE1BQWlCLEVBQUUsS0FBYTtJQUNyRSxVQUFVLENBQUMsTUFBTSxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLENBQUM7QUFFRCxNQUFNLFVBQVUsVUFBVSxDQUFDLE1BQWlCLEVBQUUsTUFBOEI7SUFDM0UsSUFBSSxNQUFNLEVBQUU7UUFDWCxVQUFVLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xELElBQU0sS0FBSyxHQUFHLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1QyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDO0tBQy9CO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxVQUFVLENBQUMsTUFBaUIsRUFBRSxLQUFhO0lBQzFELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDL0IsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztLQUN0QjtBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsY0FBYyxDQUFDLE1BQWlCLEVBQUUsU0FBaUI7SUFDbEUsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUM7UUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF1QixTQUFTLE1BQUcsQ0FBQyxDQUFDO0lBRWpGLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDM0IsVUFBVSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDNUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLGlCQUFpQixDQUFDLE1BQWlCLEVBQUUsSUFBWSxFQUFFLEtBQWE7SUFDL0UsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUN6QixVQUFVLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBRTNCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDaEMsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoQyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzFEO0lBRUQsT0FBTyxFQUFFLE1BQU0sR0FBRyxLQUFLLEVBQUU7UUFDeEIsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztLQUN0QjtBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsTUFBaUIsRUFBRSxJQUFZO0lBQ2pFLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRWpDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ3JDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3hDO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSw2QkFBNkIsQ0FBQyxNQUFpQixFQUFFLElBQVk7SUFDNUUsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBRXJDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ3JDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3hDO0lBRUQsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN4QixDQUFDO0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxNQUFvQjtJQUFwQix1QkFBQSxFQUFBLFdBQW9CO0lBQ2hELElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztJQUVaLEtBQW9CLFVBQU0sRUFBTixpQkFBTSxFQUFOLG9CQUFNLEVBQU4sSUFBTSxFQUFFO1FBQXZCLElBQU0sS0FBSyxlQUFBO1FBQ2YsSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxTQUFTLEVBQUU7WUFDOUIsSUFBQSxLQUFvQixrQkFBa0IsQ0FBQyxLQUFLLENBQUMsRUFBM0MsS0FBSyxXQUFBLEVBQUUsTUFBTSxZQUE4QixDQUFDO1lBQ3BELEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsR0FBRyxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUM7U0FDckQ7UUFFRCxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUU7WUFDbkIsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1NBQ3pEO0tBQ0Q7SUFFRCxPQUFPLEdBQUcsQ0FBQztBQUNaLENBQUM7QUFFRCxNQUFNLFVBQVUsWUFBWSxDQUFDLE1BQWlCLEVBQUUsS0FBYSxFQUFFLElBQWdCLEVBQUUsZ0JBQXdCLEVBQUUsS0FBYTtJQUF2QyxpQ0FBQSxFQUFBLHdCQUF3QjtJQUFFLHNCQUFBLEVBQUEsYUFBYTtJQUN2SCxJQUFJLEtBQUs7UUFBRSxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRWxDLElBQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDN0IsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUV2QixJQUFJLEVBQUUsQ0FBQztJQUVQLElBQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUN4QyxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUM7SUFFakIsT0FBTyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDM0IsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0QixHQUFHLEVBQUUsQ0FBQztLQUNOO0lBRUQsSUFBSSxnQkFBZ0IsRUFBRTtRQUNyQixNQUFNLEdBQUcsR0FBRyxDQUFDO0tBQ2I7SUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFFRCxNQUFNLFVBQVUsUUFBUSxDQUFDLE1BQWlCLEVBQUUsR0FBUSxFQUFFLE9BQTBCO0lBQTFCLHdCQUFBLEVBQUEsWUFBMEI7SUFDL0UsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQUUxQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxLQUFLLElBQUksR0FBRyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHO1FBQzVELE1BQU0sSUFBSSxLQUFLLENBQUMseUVBQXlFLENBQUMsQ0FBQztJQUU1RixJQUFJLGNBQWMsR0FBRyxHQUFHLENBQUMsY0FBYyxJQUFJLEVBQUUsQ0FBQztJQUU5QyxJQUFNLEdBQUcseUJBQThCLE9BQU8sS0FBRSxRQUFRLEVBQUUsRUFBRSxHQUFFLENBQUM7SUFFL0QsSUFBSSxHQUFHLENBQUMsaUJBQWlCLEVBQUU7UUFDMUIsY0FBYyx5QkFBUSxjQUFjLEtBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxHQUFHLENBQUMsR0FBRSxDQUFDO0tBQ3hFO0lBRUQsSUFBSSxTQUFTLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQztJQUU5QixJQUFJLENBQUMsU0FBUyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUU7UUFDN0IsU0FBUyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDakc7SUFFRCxJQUFJLFNBQVMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLFNBQVMsQ0FBQyxNQUFNLENBQUM7UUFDbEYsTUFBTSxJQUFJLEtBQUssQ0FBQyxxREFBcUQsQ0FBQyxDQUFDO0lBRXhFLElBQU0sV0FBVyxHQUFHLENBQUMsQ0FBQyxTQUFTLElBQUksUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3ZELElBQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbkgsSUFBTSxVQUFVLEdBQUcsSUFBSSxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7SUFFakQsU0FBUztJQUNULGNBQWMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDL0IsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVTtJQUNwRCxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFdBQVcsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVztJQUNyRCxXQUFXLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNoQyxXQUFXLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMvQixXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CO0lBQzNDLFdBQVcsQ0FBQyxNQUFNLGNBQWdCLENBQUMsQ0FBQyx1Q0FBdUM7SUFFM0Usa0JBQWtCO0lBQ2xCLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFO1FBQ3ZCLGtCQUFrQjtJQUNuQixDQUFDLENBQUMsQ0FBQztJQUVILGtCQUFrQjtJQUNsQixZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRTtnQ0FDWixPQUFPO1lBQ2pCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRTtnQkFDaEMsY0FBYyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDL0IsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2pDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLGNBQU0sT0FBQSxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsRUFBckMsQ0FBcUMsQ0FBQyxDQUFDO2FBQ3JFOztRQU5GLEtBQXNCLFVBQWdCLEVBQWhCLHFDQUFnQixFQUFoQiw4QkFBZ0IsRUFBaEIsSUFBZ0I7WUFBakMsSUFBTSxPQUFPLHlCQUFBO29CQUFQLE9BQU87U0FPakI7SUFDRixDQUFDLENBQUMsQ0FBQztJQUVILHNCQUFzQjtJQUN0QixZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUN2QixjQUFjLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzFELHdCQUF3QixDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUMxRCx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqRCxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFekIsYUFBYTtJQUNiLElBQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3hELElBQU0sSUFBSSxHQUFjLFNBQVMsSUFBSTtRQUNwQyxJQUFJLEVBQUUsSUFBSSxVQUFVLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUNoRCxLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUs7UUFDaEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNO0tBQ2xCLENBQUM7SUFFRixXQUFXLENBQUMsTUFBTSx3QkFBNEIsQ0FBQztJQUUvQyxJQUFJLGNBQWMsSUFBSyxHQUFXLENBQUMsWUFBWSxFQUFFO1FBQ2hELE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUN0QyxVQUFVLENBQUMsTUFBTSxFQUFHLEdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztLQUM5QztTQUFNO1FBQ04sVUFBVSxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztLQUNuRztBQUNGLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxVQUFzQixFQUFFLE1BQWlCLEVBQUUsR0FBUSxFQUFFLFdBQW9CLEVBQUUsT0FBNkI7SUFDL0gsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUU7O1FBQ3ZCLElBQU0sTUFBTSxHQUFZLEVBQUUsQ0FBQztRQUUzQixXQUFXLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVsQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU07WUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXBDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVqRSxJQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSyxPQUFBLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsT0FBTyxDQUFDLEVBQTVDLENBQTRDLENBQUMsQ0FBQztnQ0FHM0UsU0FBUztZQUNYLElBQUEsS0FBSyxHQUF5QyxTQUFTLE1BQWxELEVBQUUsS0FBRyxHQUFvQyxTQUFTLElBQTdDLEVBQUUsSUFBSSxHQUE4QixTQUFTLEtBQXZDLEVBQUUsTUFBTSxHQUFzQixTQUFTLE9BQS9CLEVBQUUsS0FBSyxHQUFlLFNBQVMsTUFBeEIsRUFBRSxRQUFRLEdBQUssU0FBUyxTQUFkLENBQWU7WUFFaEUsVUFBVSxDQUFDLE1BQU0sRUFBRSxLQUFHLENBQUMsQ0FBQztZQUN4QixVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3pCLFVBQVUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDM0IsVUFBVSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMxQixXQUFXLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUVyQyxLQUFnQixVQUFRLEVBQVIscUJBQVEsRUFBUixzQkFBUSxFQUFSLElBQVEsRUFBRTtnQkFBckIsSUFBTSxDQUFDLGlCQUFBO2dCQUNYLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNoQyxJQUFJLE9BQU8sQ0FBQyxHQUFHO29CQUFFLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQzlCO1lBRUQsY0FBYyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMvQixjQUFjLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUMsU0FBVSxDQUFDLElBQUksTUFBTSxDQUFDLENBQUM7WUFDbEUsVUFBVSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFBLEtBQUssQ0FBQyxPQUFPLG1DQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN0RSxVQUFVLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFM0MsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsdUVBQXVFO1lBQ3pGLElBQUksS0FBSyxDQUFDLHFCQUFxQjtnQkFBRSxLQUFLLElBQUksSUFBSSxDQUFDO1lBQy9DLElBQUksS0FBSyxDQUFDLE1BQU07Z0JBQUUsS0FBSyxJQUFJLElBQUksQ0FBQztZQUNoQyxJQUFJLEtBQUssQ0FBQyxVQUFVLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxrQkFBNkIsQ0FBQyxFQUFFO2dCQUN6RyxLQUFLLElBQUksSUFBSSxDQUFDLENBQUMsa0RBQWtEO2FBQ2pFO1lBQ0QsSUFBSSxLQUFLLENBQUMsT0FBTyxJQUFJLGVBQWUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSw0QkFBNEI7Z0JBQ2xGLEtBQUssSUFBSSxJQUFJLENBQUMsQ0FBQyx3REFBd0Q7YUFDdkU7WUFDRCwrQ0FBK0M7WUFFL0MsVUFBVSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMxQixVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztZQUNoQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRTtnQkFDdkIsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDN0Msd0JBQXdCLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUN0QyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLElBQUksSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLHdCQUF3QixDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3ZELENBQUMsQ0FBQyxDQUFDOztRQXZDSixnQkFBZ0I7UUFDaEIsS0FBd0IsVUFBVSxFQUFWLHlCQUFVLEVBQVYsd0JBQVUsRUFBVixJQUFVO1lBQTdCLElBQU0sU0FBUyxtQkFBQTtvQkFBVCxTQUFTO1NBdUNuQjtRQUVELDJCQUEyQjtRQUMzQixLQUF3QixVQUFVLEVBQVYseUJBQVUsRUFBVix3QkFBVSxFQUFWLElBQVUsRUFBRTtZQUEvQixJQUFNLFNBQVMsbUJBQUE7WUFDbkIsS0FBc0IsVUFBa0IsRUFBbEIsS0FBQSxTQUFTLENBQUMsUUFBUSxFQUFsQixjQUFrQixFQUFsQixJQUFrQixFQUFFO2dCQUFyQyxJQUFNLE9BQU8sU0FBQTtnQkFDakIsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBRXpDLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtvQkFDbkIsVUFBVSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7aUJBQ25DO2FBQ0Q7U0FDRDtJQUNGLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZCLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLE1BQWlCLEVBQUUsRUFBZSxFQUFFLFNBQTJCO1FBQTFDLElBQUksVUFBQTtJQUNwRCxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUN2QixJQUFJLENBQUMsSUFBSTtZQUFFLE9BQU87UUFFbEIsSUFBTSxDQUFDLEdBQUcsU0FBUyxDQUFDLElBQUksSUFBSSxFQUFxQixDQUFDO1FBQ2xELFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEdBQUksQ0FBQyxDQUFDO1FBQzNCLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUssQ0FBQyxDQUFDO1FBQzVCLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU8sQ0FBQyxDQUFDO1FBQzlCLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEtBQU0sQ0FBQyxDQUFDO1FBQzdCLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFlBQWEsQ0FBQyxDQUFDO1FBRXZDLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNmLElBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxTQUFTO1lBQUUsTUFBTSwyQkFBOEIsQ0FBQztRQUM3RSxJQUFJLElBQUksQ0FBQyxlQUFlLEtBQUssU0FBUztZQUFFLE1BQU0sMkJBQThCLENBQUM7UUFDN0UsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssU0FBUztZQUFFLE1BQU0sNkJBQWdDLENBQUM7UUFDakYsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssU0FBUztZQUFFLE1BQU0sNkJBQWdDLENBQUM7UUFFakYsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsSUFBSSxJQUFJLENBQUMsUUFBUTtZQUFFLEtBQUssNkJBQW9DLENBQUM7UUFDN0QsSUFBSSxJQUFJLENBQUMsdUJBQXVCO1lBQUUsS0FBSyxtQ0FBMEMsQ0FBQztRQUNsRixJQUFJLElBQUksQ0FBQyxjQUFjO1lBQUUsS0FBSywyQ0FBa0QsQ0FBQztRQUNqRixJQUFJLE1BQU07WUFBRSxLQUFLLHlDQUErQyxDQUFDO1FBRWpFLFVBQVUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFMUIsSUFBSSxNQUFNLEVBQUU7WUFDWCxVQUFVLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRTNCLElBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxTQUFTO2dCQUFFLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDcEcsSUFBSSxJQUFJLENBQUMsZUFBZSxLQUFLLFNBQVM7Z0JBQUUsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDbkYsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssU0FBUztnQkFBRSxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDeEcsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssU0FBUztnQkFBRSxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1NBQ3ZGO1FBRUQsa0NBQWtDO1FBRWxDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdkIsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyx3QkFBd0IsQ0FBQyxNQUFpQixFQUFFLEdBQVE7SUFDNUQsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDdkIsV0FBVyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMzQixXQUFXLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTNCLElBQUksUUFBUSxHQUFHLEdBQUcsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsK0JBQStCO1FBQ2pFLDJCQUEyQjtRQUUzQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2xDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDM0IsV0FBVyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztTQUMzQjtJQUNGLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsd0JBQXdCLENBQUMsTUFBaUIsRUFBRSxJQUFxQztJQUN6RixZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUN2QixJQUFJLElBQUksRUFBRTtZQUNULFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDNUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdEMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdEMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdEMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdEMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ3pDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlCLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDdEI7SUFDRixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUFDLE1BQWlCLEVBQUUsTUFBMkIsRUFBRSxHQUFRLEVBQUUsT0FBNkI7NEJBQzdHLE9BQU87UUFDakIsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUV0QixJQUFJLEdBQUcsS0FBSyxNQUFNLElBQUksT0FBTyxDQUFDLG9CQUFvQjs4QkFBVztRQUM3RCxJQUFJLEdBQUcsS0FBSyxNQUFNLElBQUksT0FBTyxDQUFDLEdBQUc7WUFBRSxHQUFHLEdBQUcsTUFBTSxDQUFDO1FBRWhELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUN4QixJQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxJQUFJLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUV6RSxjQUFjLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNoRCxjQUFjLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBRTVCLElBQU0sU0FBUyxHQUFHLEdBQUcsS0FBSyxNQUFNLElBQUksR0FBRyxLQUFLLE1BQU0sSUFBSSxHQUFHLEtBQUssTUFBTSxJQUFJLEdBQUcsS0FBSyxNQUFNLElBQUksR0FBRyxLQUFLLE1BQU07Z0JBQ3ZHLEdBQUcsS0FBSyxNQUFNLElBQUksR0FBRyxLQUFLLE1BQU0sSUFBSSxHQUFHLEtBQUssTUFBTSxJQUFJLEdBQUcsS0FBSyxNQUFNLElBQUksR0FBRyxLQUFLLE1BQU0sSUFBSSxHQUFHLEtBQUssTUFBTTtnQkFDeEcsR0FBRyxLQUFLLE1BQU0sSUFBSSxHQUFHLEtBQUssTUFBTSxJQUFJLEdBQUcsS0FBSyxNQUFNLElBQUksR0FBRyxLQUFLLE1BQU0sSUFBSSxHQUFHLEtBQUssTUFBTSxDQUFDO1lBRXhGLFlBQVksQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDdkMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUM3QyxDQUFDLEVBQUUsR0FBRyxLQUFLLE1BQU0sSUFBSSxHQUFHLEtBQUssTUFBTSxJQUFJLEdBQUcsS0FBSyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDOUQ7O0lBbkJGLEtBQXNCLFVBQVksRUFBWiw2QkFBWSxFQUFaLDBCQUFZLEVBQVosSUFBWTtRQUE3QixJQUFNLE9BQU8scUJBQUE7Z0JBQVAsT0FBTztLQW9CakI7QUFDRixDQUFDO0FBRUQsU0FBUyxXQUFXLENBQUMsTUFBZSxFQUFFLFFBQTZCO0lBQ2xFLElBQUksQ0FBQyxRQUFRO1FBQUUsT0FBTztJQUV0QixLQUFnQixVQUFRLEVBQVIscUJBQVEsRUFBUixzQkFBUSxFQUFSLElBQVEsRUFBRTtRQUFyQixJQUFNLENBQUMsaUJBQUE7UUFDWCxJQUFJLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLE1BQU07WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLG9FQUFvRSxDQUFDLENBQUM7UUFDbEgsSUFBSSxDQUFDLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxTQUFTO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyx1RUFBdUUsQ0FBQyxDQUFDO1FBRXhILElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRTtZQUNmLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQ1gsSUFBSSxFQUFFLGdCQUFnQjtnQkFDdEIsY0FBYyxFQUFFO29CQUNmLElBQUksZ0NBQTJDO2lCQUMvQztnQkFDRCxVQUFVO2dCQUNWLHNCQUFzQjtnQkFDdEIsNERBQTREO2dCQUM1RCxzQkFBc0I7Z0JBQ3RCLGtJQUFrSTtnQkFDbEksaUJBQWlCO2dCQUNqQixrQ0FBa0M7YUFDbEMsQ0FBQyxDQUFDO1lBQ0gsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDaEMsTUFBTSxDQUFDLElBQUksWUFDVixjQUFjLEVBQUU7b0JBQ2YsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLENBQUMsc0JBQWlDLENBQUMsbUJBQThCO29CQUMxRixHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQyxTQUFVLENBQUMsSUFBSSxNQUFNO29CQUMxQyxPQUFPLEVBQUUsQ0FBQztpQkFDVixJQUNFLENBQUMsRUFDSCxDQUFDO1NBQ0g7YUFBTTtZQUNOLE1BQU0sQ0FBQyxJQUFJLGNBQU0sQ0FBQyxFQUFHLENBQUM7U0FDdEI7S0FDRDtBQUNGLENBQUM7QUFFRCxTQUFTLFlBQVksQ0FBQyxNQUFpQixFQUFFLElBQVk7SUFDcEQsSUFBSSxTQUFTLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7SUFFekMsR0FBRztRQUNGLFNBQVMsSUFBSSxDQUFDLENBQUM7S0FDZixRQUFRLElBQUksR0FBRyxTQUFTLEVBQUU7SUFFM0IsSUFBTSxTQUFTLEdBQUcsSUFBSSxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDN0MsSUFBTSxRQUFRLEdBQUcsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDM0MsSUFBTSxRQUFRLEdBQUcsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQy9DLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdkIsTUFBTSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUM7SUFDMUIsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDM0MsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLE1BQWlCLEVBQUUsSUFBWTtJQUNsRCxJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRTtRQUNwQyxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQzNCO0FBQ0YsQ0FBQztBQUVELFNBQVMsT0FBTyxDQUFDLE1BQWlCLEVBQUUsSUFBWTtJQUMvQyxJQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQzdCLFVBQVUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsQ0FBQztJQUMxQyxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxHQUFRO0lBQ2hDLElBQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDcEMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO0lBRWQsSUFBSSxHQUFHLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUU7UUFDM0IsTUFBTSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUM7UUFDbkIsTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7S0FDakM7U0FBTTtRQUNOLE1BQU0sQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNwRSxLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO0tBQ25DO0lBRUQsSUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUUsQ0FBQztJQUN6QyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUU1QixJQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUU7UUFDbEIsSUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDckUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekQsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQzlCO1NBQU0sSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFO1FBQ3RCLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDcEM7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FDbkIsVUFBc0IsRUFBRSxLQUFZLEVBQUUsVUFBbUIsRUFBRSxPQUFxQjtJQUVoRixJQUFNLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMzRSxJQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO0lBRXhCLElBQUksSUFBSSxFQUFFO1FBQ0gsSUFBQSxLQUE2QyxJQUFJLElBQTFDLEVBQVAsS0FBRyxtQkFBRyxDQUFDLEtBQUEsRUFBRSxLQUFvQyxJQUFJLEtBQWhDLEVBQVIsSUFBSSxtQkFBRyxDQUFDLEtBQUEsRUFBRSxLQUEwQixJQUFJLE1BQXJCLEVBQVQsS0FBSyxtQkFBRyxDQUFDLEtBQUEsRUFBRSxLQUFlLElBQUksT0FBVCxFQUFWLE1BQU0sbUJBQUcsQ0FBQyxLQUFBLENBQVU7UUFDcEQsSUFBQSxLQUFvQixrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBMUMsS0FBSyxXQUFBLEVBQUUsTUFBTSxZQUE2QixDQUFDO1FBQ2pELElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7UUFFL0IsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLEtBQUssSUFBSSxNQUFNLEVBQUU7WUFDakQsU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztTQUM1RTtRQUVELElBQUksS0FBSyxJQUFJLE1BQU0sSUFBSSxTQUFTLEVBQUU7WUFDakMsS0FBSyxHQUFHLElBQUksR0FBRyxLQUFLLENBQUM7WUFDckIsTUFBTSxHQUFHLEtBQUcsR0FBRyxNQUFNLENBQUM7WUFFdEIsSUFBSSxNQUFNLEdBQUcsWUFBWSxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFFLENBQUM7WUFFckYsSUFBSSxjQUFjLElBQUssS0FBYSxDQUFDLFdBQVcsRUFBRTtnQkFDakQsK0NBQStDO2dCQUMvQyxNQUFNLEdBQUksS0FBYSxDQUFDLFdBQVcsQ0FBQzthQUNwQztZQUVELFNBQVMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxHQUFHLE9BQUEsRUFBRSxJQUFJLE1BQUEsRUFBRSxLQUFLLE9BQUEsRUFBRSxNQUFNLFFBQUEsRUFBRSxDQUFDO1lBQzlDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO2dCQUN2QixTQUFTLG1CQUFvQjtnQkFDN0IsV0FBVyx1QkFBMkI7Z0JBQ3RDLE1BQU0sRUFBRSxNQUFNO2dCQUNkLE1BQU0sRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU07YUFDekIsQ0FBQyxDQUFDO1NBQ0g7YUFBTTtZQUNOLFNBQVMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDMUQsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0JBQ3ZCLFNBQVMsbUJBQW9CO2dCQUM3QixXQUFXLGlCQUFxQjtnQkFDaEMsTUFBTSxFQUFFLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDekIsTUFBTSxFQUFFLENBQUM7YUFDVCxDQUFDLENBQUM7U0FDSDtLQUNEO0lBRUQsT0FBTyxTQUFTLENBQUM7QUFDbEIsQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUMsRUFBNEI7UUFBMUIsTUFBTSxZQUFBLEVBQUUsU0FBUyxlQUFBO0lBQzlDLE9BQU8sU0FBUyxJQUFJLE1BQU0sSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ3ZELENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFlLEVBQUUsSUFBWSxFQUFFLEdBQVcsRUFBRSxLQUFhLEVBQUUsTUFBYztJQUMvRixJQUFNLFdBQVcsR0FBRyxlQUFlLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ25ELElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDMUIsSUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQztJQUVqQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ2hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDL0IsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDL0MsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzVCLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNwQyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDcEMsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ3BDO0tBQ0Q7SUFFRCxPQUFPLFdBQVcsQ0FBQztBQUNwQixDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FDeEIsVUFBc0IsRUFBRSxLQUFZLEVBQUUsVUFBbUIsRUFBRSxPQUFxQjs7SUFFMUUsSUFBQSxLQUE2QyxLQUFLLElBQTNDLEVBQVAsR0FBRyxtQkFBRyxDQUFDLEtBQUEsRUFBRSxLQUFvQyxLQUFLLEtBQWpDLEVBQVIsSUFBSSxtQkFBRyxDQUFDLEtBQUEsRUFBRSxLQUEwQixLQUFLLE1BQXRCLEVBQVQsS0FBSyxtQkFBRyxDQUFDLEtBQUEsRUFBRSxLQUFlLEtBQUssT0FBVixFQUFWLE1BQU0sbUJBQUcsQ0FBQyxLQUFBLENBQVc7SUFDekQsSUFBSSxRQUFRLEdBQWtCO1FBQzdCLEVBQUUsU0FBUyx1QkFBd0IsRUFBRSxXQUFXLGlCQUFxQixFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUNyRyxFQUFFLFNBQVMsZ0JBQWtCLEVBQUUsV0FBVyxpQkFBcUIsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFDL0YsRUFBRSxTQUFTLGdCQUFrQixFQUFFLFdBQVcsaUJBQXFCLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO1FBQy9GLEVBQUUsU0FBUyxnQkFBa0IsRUFBRSxXQUFXLGlCQUFxQixFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtLQUMvRixDQUFDO0lBRUUsSUFBQSxLQUFvQixrQkFBa0IsQ0FBQyxLQUFLLENBQUMsRUFBM0MsS0FBSyxXQUFBLEVBQUUsTUFBTSxZQUE4QixDQUFDO0lBRWxELElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQzVELEtBQUssR0FBRyxJQUFJLENBQUM7UUFDYixNQUFNLEdBQUcsR0FBRyxDQUFDO1FBQ2IsT0FBTyxFQUFFLEtBQUssT0FBQSxFQUFFLEdBQUcsS0FBQSxFQUFFLElBQUksTUFBQSxFQUFFLEtBQUssT0FBQSxFQUFFLE1BQU0sUUFBQSxFQUFFLFFBQVEsVUFBQSxFQUFFLENBQUM7S0FDckQ7SUFFRCxLQUFLLEdBQUcsSUFBSSxHQUFHLEtBQUssQ0FBQztJQUNyQixNQUFNLEdBQUcsR0FBRyxHQUFHLE1BQU0sQ0FBQztJQUV0QixJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsU0FBUyxJQUFJLEtBQUssQ0FBQyxNQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztJQUVoRyxJQUFJLE9BQU8sQ0FBQyxhQUFhLEVBQUU7UUFDMUIsSUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRS9CLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksT0FBTyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsS0FBSyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUM5RyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQztZQUNyQixHQUFHLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNuQixLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN0QyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6QyxLQUFLLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQztZQUNyQixNQUFNLEdBQUcsTUFBTSxHQUFHLEdBQUcsQ0FBQztZQUV0QixJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUN0QixPQUFPLEVBQUUsS0FBSyxPQUFBLEVBQUUsR0FBRyxLQUFBLEVBQUUsSUFBSSxNQUFBLEVBQUUsS0FBSyxPQUFBLEVBQUUsTUFBTSxRQUFBLEVBQUUsUUFBUSxVQUFBLEVBQUUsQ0FBQzthQUNyRDtZQUVELElBQUksS0FBSyxDQUFDLFNBQVMsRUFBRTtnQkFDcEIsSUFBSSxHQUFHLGFBQWEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQzthQUNyRTtpQkFBTTtnQkFDTixJQUFJLEdBQUcsS0FBSyxDQUFDLE1BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7YUFDOUY7U0FDRDtLQUNEO0lBRUQsSUFBTSxVQUFVLEdBQUc7Ozs7S0FJbEIsQ0FBQztJQUVGLElBQUksQ0FBQyxVQUFVLElBQUksT0FBTyxDQUFDLFlBQVksSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsS0FBSSxNQUFDLEtBQWEsQ0FBQyxZQUFZLDBDQUFHLElBQUksQ0FBQyxDQUFBLENBQUMsRUFBRTtRQUNuSSxVQUFVLENBQUMsT0FBTyx1QkFBd0IsQ0FBQztLQUMzQztJQUVELFFBQVEsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQUEsT0FBTztRQUNoQyxJQUFNLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQywyQ0FBMkM7UUFDNUYsSUFBSSxNQUFNLEdBQUcsWUFBWSxDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFFLENBQUM7UUFFckYsSUFBSSxjQUFjLElBQUssS0FBYSxDQUFDLFlBQVksRUFBRTtZQUNsRCwrQ0FBK0M7WUFDL0MsTUFBTSxHQUFJLEtBQWEsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDOUM7UUFFRCxPQUFPO1lBQ04sU0FBUyxFQUFFLE9BQU87WUFDbEIsV0FBVyx1QkFBMkI7WUFDdEMsTUFBTSxFQUFFLE1BQU07WUFDZCxNQUFNLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNO1NBQ3pCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILE9BQU8sRUFBRSxLQUFLLE9BQUEsRUFBRSxHQUFHLEtBQUEsRUFBRSxJQUFJLE1BQUEsRUFBRSxLQUFLLE9BQUEsRUFBRSxNQUFNLFFBQUEsRUFBRSxRQUFRLFVBQUEsRUFBRSxDQUFDO0FBQ3RELENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxFQUEwQixFQUFFLENBQVMsRUFBRSxJQUFZLEVBQUUsS0FBYTtRQUFoRSxJQUFJLFVBQUEsRUFBRSxLQUFLLFdBQUE7SUFDaEMsSUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMvQyxJQUFNLEdBQUcsR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFN0MsS0FBSyxJQUFJLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQzdDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNsQixPQUFPLEtBQUssQ0FBQztTQUNiO0tBQ0Q7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxFQUEwQixFQUFFLENBQVMsRUFBRSxHQUFXLEVBQUUsTUFBYztRQUFoRSxJQUFJLFVBQUEsRUFBRSxLQUFLLFdBQUE7SUFDaEMsSUFBTSxNQUFNLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQy9CLElBQU0sS0FBSyxHQUFHLENBQUMsR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUU3QyxLQUFLLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNuRSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDbEIsT0FBTyxLQUFLLENBQUM7U0FDYjtLQUNEO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDO0FBRUQsU0FBUyxRQUFRLENBQUMsSUFBZTtJQUNoQyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDWixJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7SUFDYixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ3ZCLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFFekIsT0FBTyxHQUFHLEdBQUcsTUFBTSxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUM7UUFDeEQsR0FBRyxFQUFFLENBQUM7SUFDUCxPQUFPLE1BQU0sR0FBRyxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxNQUFNLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUM7UUFDL0QsTUFBTSxFQUFFLENBQUM7SUFDVixPQUFPLElBQUksR0FBRyxLQUFLLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQztRQUN6RCxJQUFJLEVBQUUsQ0FBQztJQUNSLE9BQU8sS0FBSyxHQUFHLElBQUksSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFLEtBQUssR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQztRQUM5RCxLQUFLLEVBQUUsQ0FBQztJQUVULE9BQU8sRUFBRSxHQUFHLEtBQUEsRUFBRSxJQUFJLE1BQUEsRUFBRSxLQUFLLE9BQUEsRUFBRSxNQUFNLFFBQUEsRUFBRSxDQUFDO0FBQ3JDLENBQUM7QUFFRCxNQUFNLFVBQVUsVUFBVSxDQUFDLE1BQWlCLEVBQUUsS0FBd0I7SUFDckUsSUFBSSxDQUFDLEtBQUssRUFBRTtRQUNYLFdBQVcsQ0FBQyxNQUFNLGNBQWlCLENBQUM7UUFDcEMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztLQUN0QjtTQUFNLElBQUksR0FBRyxJQUFJLEtBQUssRUFBRTtRQUN4QixXQUFXLENBQUMsTUFBTSxjQUFpQixDQUFDO1FBQ3BDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDL0MsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMvQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9DLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDdkI7U0FBTSxJQUFJLEdBQUcsSUFBSSxLQUFLLEVBQUU7UUFDeEIsV0FBVyxDQUFDLE1BQU0sY0FBaUIsQ0FBQztRQUNwQyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDdkI7U0FBTSxJQUFJLEdBQUcsSUFBSSxLQUFLLEVBQUU7UUFDeEIsV0FBVyxDQUFDLE1BQU0sY0FBaUIsQ0FBQztRQUNwQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2xELFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDbEQsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNsRCxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCO1NBQU0sSUFBSSxHQUFHLElBQUksS0FBSyxFQUFFO1FBQ3hCLFdBQVcsQ0FBQyxNQUFNLGVBQWtCLENBQUM7UUFDckMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMvQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9DLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDL0MsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztLQUMvQztTQUFNO1FBQ04sV0FBVyxDQUFDLE1BQU0sb0JBQXVCLENBQUM7UUFDMUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDdkQsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztLQUN0QjtBQUNGLENBQUMiLCJmaWxlIjoicHNkV3JpdGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUHNkLCBMYXllciwgTGF5ZXJBZGRpdGlvbmFsSW5mbywgQ29sb3JNb2RlLCBTZWN0aW9uRGl2aWRlclR5cGUsIFdyaXRlT3B0aW9ucywgQ29sb3IsIEdsb2JhbExheWVyTWFza0luZm8gfSBmcm9tICcuL3BzZCc7XG5pbXBvcnQge1xuXHRoYXNBbHBoYSwgY3JlYXRlQ2FudmFzLCB3cml0ZURhdGFSTEUsIFBpeGVsRGF0YSwgTGF5ZXJDaGFubmVsRGF0YSwgQ2hhbm5lbERhdGEsXG5cdG9mZnNldEZvckNoYW5uZWwsIGNyZWF0ZUltYWdlRGF0YSwgZnJvbUJsZW5kTW9kZSwgQ2hhbm5lbElELCBDb21wcmVzc2lvbiwgY2xhbXAsXG5cdExheWVyTWFza0ZsYWdzLCBNYXNrUGFyYW1zLCBDb2xvclNwYWNlLCBCb3VuZHMsIGxhcmdlQWRkaXRpb25hbEluZm9LZXlzLCBSQVdfSU1BR0VfREFUQVxufSBmcm9tICcuL2hlbHBlcnMnO1xuaW1wb3J0IHsgRXh0ZW5kZWRXcml0ZU9wdGlvbnMsIGhhc011bHRpRWZmZWN0cywgaW5mb0hhbmRsZXJzIH0gZnJvbSAnLi9hZGRpdGlvbmFsSW5mbyc7XG5pbXBvcnQgeyByZXNvdXJjZUhhbmRsZXJzIH0gZnJvbSAnLi9pbWFnZVJlc291cmNlcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHNkV3JpdGVyIHtcblx0b2Zmc2V0OiBudW1iZXI7XG5cdGJ1ZmZlcjogQXJyYXlCdWZmZXI7XG5cdHZpZXc6IERhdGFWaWV3O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlV3JpdGVyKHNpemUgPSA0MDk2KTogUHNkV3JpdGVyIHtcblx0Y29uc3QgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKHNpemUpO1xuXHRjb25zdCB2aWV3ID0gbmV3IERhdGFWaWV3KGJ1ZmZlcik7XG5cdGNvbnN0IG9mZnNldCA9IDA7XG5cdHJldHVybiB7IGJ1ZmZlciwgdmlldywgb2Zmc2V0IH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRXcml0ZXJCdWZmZXIod3JpdGVyOiBQc2RXcml0ZXIpIHtcblx0cmV0dXJuIHdyaXRlci5idWZmZXIuc2xpY2UoMCwgd3JpdGVyLm9mZnNldCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRXcml0ZXJCdWZmZXJOb0NvcHkod3JpdGVyOiBQc2RXcml0ZXIpIHtcblx0cmV0dXJuIG5ldyBVaW50OEFycmF5KHdyaXRlci5idWZmZXIsIDAsIHdyaXRlci5vZmZzZXQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVVaW50OCh3cml0ZXI6IFBzZFdyaXRlciwgdmFsdWU6IG51bWJlcikge1xuXHRjb25zdCBvZmZzZXQgPSBhZGRTaXplKHdyaXRlciwgMSk7XG5cdHdyaXRlci52aWV3LnNldFVpbnQ4KG9mZnNldCwgdmFsdWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVJbnQxNih3cml0ZXI6IFBzZFdyaXRlciwgdmFsdWU6IG51bWJlcikge1xuXHRjb25zdCBvZmZzZXQgPSBhZGRTaXplKHdyaXRlciwgMik7XG5cdHdyaXRlci52aWV3LnNldEludDE2KG9mZnNldCwgdmFsdWUsIGZhbHNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlVWludDE2KHdyaXRlcjogUHNkV3JpdGVyLCB2YWx1ZTogbnVtYmVyKSB7XG5cdGNvbnN0IG9mZnNldCA9IGFkZFNpemUod3JpdGVyLCAyKTtcblx0d3JpdGVyLnZpZXcuc2V0VWludDE2KG9mZnNldCwgdmFsdWUsIGZhbHNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlSW50MzIod3JpdGVyOiBQc2RXcml0ZXIsIHZhbHVlOiBudW1iZXIpIHtcblx0Y29uc3Qgb2Zmc2V0ID0gYWRkU2l6ZSh3cml0ZXIsIDQpO1xuXHR3cml0ZXIudmlldy5zZXRJbnQzMihvZmZzZXQsIHZhbHVlLCBmYWxzZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVVpbnQzMih3cml0ZXI6IFBzZFdyaXRlciwgdmFsdWU6IG51bWJlcikge1xuXHRjb25zdCBvZmZzZXQgPSBhZGRTaXplKHdyaXRlciwgNCk7XG5cdHdyaXRlci52aWV3LnNldFVpbnQzMihvZmZzZXQsIHZhbHVlLCBmYWxzZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUZsb2F0MzIod3JpdGVyOiBQc2RXcml0ZXIsIHZhbHVlOiBudW1iZXIpIHtcblx0Y29uc3Qgb2Zmc2V0ID0gYWRkU2l6ZSh3cml0ZXIsIDQpO1xuXHR3cml0ZXIudmlldy5zZXRGbG9hdDMyKG9mZnNldCwgdmFsdWUsIGZhbHNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlRmxvYXQ2NCh3cml0ZXI6IFBzZFdyaXRlciwgdmFsdWU6IG51bWJlcikge1xuXHRjb25zdCBvZmZzZXQgPSBhZGRTaXplKHdyaXRlciwgOCk7XG5cdHdyaXRlci52aWV3LnNldEZsb2F0NjQob2Zmc2V0LCB2YWx1ZSwgZmFsc2UpO1xufVxuXG4vLyAzMi1iaXQgZml4ZWQtcG9pbnQgbnVtYmVyIDE2LjE2XG5leHBvcnQgZnVuY3Rpb24gd3JpdGVGaXhlZFBvaW50MzIod3JpdGVyOiBQc2RXcml0ZXIsIHZhbHVlOiBudW1iZXIpIHtcblx0d3JpdGVJbnQzMih3cml0ZXIsIHZhbHVlICogKDEgPDwgMTYpKTtcbn1cblxuLy8gMzItYml0IGZpeGVkLXBvaW50IG51bWJlciA4LjI0XG5leHBvcnQgZnVuY3Rpb24gd3JpdGVGaXhlZFBvaW50UGF0aDMyKHdyaXRlcjogUHNkV3JpdGVyLCB2YWx1ZTogbnVtYmVyKSB7XG5cdHdyaXRlSW50MzIod3JpdGVyLCB2YWx1ZSAqICgxIDw8IDI0KSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUJ5dGVzKHdyaXRlcjogUHNkV3JpdGVyLCBidWZmZXI6IFVpbnQ4QXJyYXkgfCB1bmRlZmluZWQpIHtcblx0aWYgKGJ1ZmZlcikge1xuXHRcdGVuc3VyZVNpemUod3JpdGVyLCB3cml0ZXIub2Zmc2V0ICsgYnVmZmVyLmxlbmd0aCk7XG5cdFx0Y29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheSh3cml0ZXIuYnVmZmVyKTtcblx0XHRieXRlcy5zZXQoYnVmZmVyLCB3cml0ZXIub2Zmc2V0KTtcblx0XHR3cml0ZXIub2Zmc2V0ICs9IGJ1ZmZlci5sZW5ndGg7XG5cdH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlWmVyb3Mod3JpdGVyOiBQc2RXcml0ZXIsIGNvdW50OiBudW1iZXIpIHtcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG5cdFx0d3JpdGVVaW50OCh3cml0ZXIsIDApO1xuXHR9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVNpZ25hdHVyZSh3cml0ZXI6IFBzZFdyaXRlciwgc2lnbmF0dXJlOiBzdHJpbmcpIHtcblx0aWYgKHNpZ25hdHVyZS5sZW5ndGggIT09IDQpIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBzaWduYXR1cmU6ICcke3NpZ25hdHVyZX0nYCk7XG5cblx0Zm9yIChsZXQgaSA9IDA7IGkgPCA0OyBpKyspIHtcblx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgc2lnbmF0dXJlLmNoYXJDb2RlQXQoaSkpO1xuXHR9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVBhc2NhbFN0cmluZyh3cml0ZXI6IFBzZFdyaXRlciwgdGV4dDogc3RyaW5nLCBwYWRUbzogbnVtYmVyKSB7XG5cdGxldCBsZW5ndGggPSB0ZXh0Lmxlbmd0aDtcblx0d3JpdGVVaW50OCh3cml0ZXIsIGxlbmd0aCk7XG5cblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHRcdGNvbnN0IGNvZGUgPSB0ZXh0LmNoYXJDb2RlQXQoaSk7XG5cdFx0d3JpdGVVaW50OCh3cml0ZXIsIGNvZGUgPCAxMjggPyBjb2RlIDogJz8nLmNoYXJDb2RlQXQoMCkpO1xuXHR9XG5cblx0d2hpbGUgKCsrbGVuZ3RoICUgcGFkVG8pIHtcblx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgMCk7XG5cdH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlVW5pY29kZVN0cmluZyh3cml0ZXI6IFBzZFdyaXRlciwgdGV4dDogc3RyaW5nKSB7XG5cdHdyaXRlVWludDMyKHdyaXRlciwgdGV4dC5sZW5ndGgpO1xuXG5cdGZvciAobGV0IGkgPSAwOyBpIDwgdGV4dC5sZW5ndGg7IGkrKykge1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgdGV4dC5jaGFyQ29kZUF0KGkpKTtcblx0fVxufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVVbmljb2RlU3RyaW5nV2l0aFBhZGRpbmcod3JpdGVyOiBQc2RXcml0ZXIsIHRleHQ6IHN0cmluZykge1xuXHR3cml0ZVVpbnQzMih3cml0ZXIsIHRleHQubGVuZ3RoICsgMSk7XG5cblx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0ZXh0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCB0ZXh0LmNoYXJDb2RlQXQoaSkpO1xuXHR9XG5cblx0d3JpdGVVaW50MTYod3JpdGVyLCAwKTtcbn1cblxuZnVuY3Rpb24gZ2V0TGFyZ2VzdExheWVyU2l6ZShsYXllcnM6IExheWVyW10gPSBbXSk6IG51bWJlciB7XG5cdGxldCBtYXggPSAwO1xuXG5cdGZvciAoY29uc3QgbGF5ZXIgb2YgbGF5ZXJzKSB7XG5cdFx0aWYgKGxheWVyLmNhbnZhcyB8fCBsYXllci5pbWFnZURhdGEpIHtcblx0XHRcdGNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gZ2V0TGF5ZXJEaW1lbnRpb25zKGxheWVyKTtcblx0XHRcdG1heCA9IE1hdGgubWF4KG1heCwgMiAqIGhlaWdodCArIDIgKiB3aWR0aCAqIGhlaWdodCk7XG5cdFx0fVxuXG5cdFx0aWYgKGxheWVyLmNoaWxkcmVuKSB7XG5cdFx0XHRtYXggPSBNYXRoLm1heChtYXgsIGdldExhcmdlc3RMYXllclNpemUobGF5ZXIuY2hpbGRyZW4pKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gbWF4O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVTZWN0aW9uKHdyaXRlcjogUHNkV3JpdGVyLCByb3VuZDogbnVtYmVyLCBmdW5jOiAoKSA9PiB2b2lkLCB3cml0ZVRvdGFsTGVuZ3RoID0gZmFsc2UsIGxhcmdlID0gZmFsc2UpIHtcblx0aWYgKGxhcmdlKSB3cml0ZVVpbnQzMih3cml0ZXIsIDApO1xuXG5cdGNvbnN0IG9mZnNldCA9IHdyaXRlci5vZmZzZXQ7XG5cdHdyaXRlVWludDMyKHdyaXRlciwgMCk7XG5cblx0ZnVuYygpO1xuXG5cdGxldCBsZW5ndGggPSB3cml0ZXIub2Zmc2V0IC0gb2Zmc2V0IC0gNDtcblx0bGV0IGxlbiA9IGxlbmd0aDtcblxuXHR3aGlsZSAoKGxlbiAlIHJvdW5kKSAhPT0gMCkge1xuXHRcdHdyaXRlVWludDgod3JpdGVyLCAwKTtcblx0XHRsZW4rKztcblx0fVxuXG5cdGlmICh3cml0ZVRvdGFsTGVuZ3RoKSB7XG5cdFx0bGVuZ3RoID0gbGVuO1xuXHR9XG5cblx0d3JpdGVyLnZpZXcuc2V0VWludDMyKG9mZnNldCwgbGVuZ3RoLCBmYWxzZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVBzZCh3cml0ZXI6IFBzZFdyaXRlciwgcHNkOiBQc2QsIG9wdGlvbnM6IFdyaXRlT3B0aW9ucyA9IHt9KSB7XG5cdGlmICghKCtwc2Qud2lkdGggPiAwICYmICtwc2QuaGVpZ2h0ID4gMCkpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGRvY3VtZW50IHNpemUnKTtcblxuXHRpZiAoKHBzZC53aWR0aCA+IDMwMDAwIHx8IHBzZC5oZWlnaHQgPiAzMDAwMCkgJiYgIW9wdGlvbnMucHNiKVxuXHRcdHRocm93IG5ldyBFcnJvcignRG9jdW1lbnQgc2l6ZSBpcyB0b28gbGFyZ2UgKG1heCBpcyAzMDAwMHgzMDAwMCwgdXNlIFBTQiBmb3JtYXQgaW5zdGVhZCknKTtcblxuXHRsZXQgaW1hZ2VSZXNvdXJjZXMgPSBwc2QuaW1hZ2VSZXNvdXJjZXMgfHwge307XG5cblx0Y29uc3Qgb3B0OiBFeHRlbmRlZFdyaXRlT3B0aW9ucyA9IHsgLi4ub3B0aW9ucywgbGF5ZXJJZHM6IFtdIH07XG5cblx0aWYgKG9wdC5nZW5lcmF0ZVRodW1ibmFpbCkge1xuXHRcdGltYWdlUmVzb3VyY2VzID0geyAuLi5pbWFnZVJlc291cmNlcywgdGh1bWJuYWlsOiBjcmVhdGVUaHVtYm5haWwocHNkKSB9O1xuXHR9XG5cblx0bGV0IGltYWdlRGF0YSA9IHBzZC5pbWFnZURhdGE7XG5cblx0aWYgKCFpbWFnZURhdGEgJiYgcHNkLmNhbnZhcykge1xuXHRcdGltYWdlRGF0YSA9IHBzZC5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKSEuZ2V0SW1hZ2VEYXRhKDAsIDAsIHBzZC5jYW52YXMud2lkdGgsIHBzZC5jYW52YXMuaGVpZ2h0KTtcblx0fVxuXG5cdGlmIChpbWFnZURhdGEgJiYgKHBzZC53aWR0aCAhPT0gaW1hZ2VEYXRhLndpZHRoIHx8IHBzZC5oZWlnaHQgIT09IGltYWdlRGF0YS5oZWlnaHQpKVxuXHRcdHRocm93IG5ldyBFcnJvcignRG9jdW1lbnQgY2FudmFzIG11c3QgaGF2ZSB0aGUgc2FtZSBzaXplIGFzIGRvY3VtZW50Jyk7XG5cblx0Y29uc3QgZ2xvYmFsQWxwaGEgPSAhIWltYWdlRGF0YSAmJiBoYXNBbHBoYShpbWFnZURhdGEpO1xuXHRjb25zdCBtYXhCdWZmZXJTaXplID0gTWF0aC5tYXgoZ2V0TGFyZ2VzdExheWVyU2l6ZShwc2QuY2hpbGRyZW4pLCA0ICogMiAqIHBzZC53aWR0aCAqIHBzZC5oZWlnaHQgKyAyICogcHNkLmhlaWdodCk7XG5cdGNvbnN0IHRlbXBCdWZmZXIgPSBuZXcgVWludDhBcnJheShtYXhCdWZmZXJTaXplKTtcblxuXHQvLyBoZWFkZXJcblx0d3JpdGVTaWduYXR1cmUod3JpdGVyLCAnOEJQUycpO1xuXHR3cml0ZVVpbnQxNih3cml0ZXIsIG9wdGlvbnMucHNiID8gMiA6IDEpOyAvLyB2ZXJzaW9uXG5cdHdyaXRlWmVyb3Mod3JpdGVyLCA2KTtcblx0d3JpdGVVaW50MTYod3JpdGVyLCBnbG9iYWxBbHBoYSA/IDQgOiAzKTsgLy8gY2hhbm5lbHNcblx0d3JpdGVVaW50MzIod3JpdGVyLCBwc2QuaGVpZ2h0KTtcblx0d3JpdGVVaW50MzIod3JpdGVyLCBwc2Qud2lkdGgpO1xuXHR3cml0ZVVpbnQxNih3cml0ZXIsIDgpOyAvLyBiaXRzIHBlciBjaGFubmVsXG5cdHdyaXRlVWludDE2KHdyaXRlciwgQ29sb3JNb2RlLlJHQik7IC8vIHdlIG9ubHkgc3VwcG9ydCBzYXZpbmcgUkdCIHJpZ2h0IG5vd1xuXG5cdC8vIGNvbG9yIG1vZGUgZGF0YVxuXHR3cml0ZVNlY3Rpb24od3JpdGVyLCAxLCAoKSA9PiB7XG5cdFx0Ly8gVE9ETzogaW1wbGVtZW50XG5cdH0pO1xuXG5cdC8vIGltYWdlIHJlc291cmNlc1xuXHR3cml0ZVNlY3Rpb24od3JpdGVyLCAxLCAoKSA9PiB7XG5cdFx0Zm9yIChjb25zdCBoYW5kbGVyIG9mIHJlc291cmNlSGFuZGxlcnMpIHtcblx0XHRcdGlmIChoYW5kbGVyLmhhcyhpbWFnZVJlc291cmNlcykpIHtcblx0XHRcdFx0d3JpdGVTaWduYXR1cmUod3JpdGVyLCAnOEJJTScpO1xuXHRcdFx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIGhhbmRsZXIua2V5KTtcblx0XHRcdFx0d3JpdGVQYXNjYWxTdHJpbmcod3JpdGVyLCAnJywgMik7XG5cdFx0XHRcdHdyaXRlU2VjdGlvbih3cml0ZXIsIDIsICgpID0+IGhhbmRsZXIud3JpdGUod3JpdGVyLCBpbWFnZVJlc291cmNlcykpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cblx0Ly8gbGF5ZXIgYW5kIG1hc2sgaW5mb1xuXHR3cml0ZVNlY3Rpb24od3JpdGVyLCAyLCAoKSA9PiB7XG5cdFx0d3JpdGVMYXllckluZm8odGVtcEJ1ZmZlciwgd3JpdGVyLCBwc2QsIGdsb2JhbEFscGhhLCBvcHQpO1xuXHRcdHdyaXRlR2xvYmFsTGF5ZXJNYXNrSW5mbyh3cml0ZXIsIHBzZC5nbG9iYWxMYXllck1hc2tJbmZvKTtcblx0XHR3cml0ZUFkZGl0aW9uYWxMYXllckluZm8od3JpdGVyLCBwc2QsIHBzZCwgb3B0KTtcblx0fSwgdW5kZWZpbmVkLCAhIW9wdC5wc2IpO1xuXG5cdC8vIGltYWdlIGRhdGFcblx0Y29uc3QgY2hhbm5lbHMgPSBnbG9iYWxBbHBoYSA/IFswLCAxLCAyLCAzXSA6IFswLCAxLCAyXTtcblx0Y29uc3QgZGF0YTogUGl4ZWxEYXRhID0gaW1hZ2VEYXRhIHx8IHtcblx0XHRkYXRhOiBuZXcgVWludDhBcnJheSg0ICogcHNkLndpZHRoICogcHNkLmhlaWdodCksXG5cdFx0d2lkdGg6IHBzZC53aWR0aCxcblx0XHRoZWlnaHQ6IHBzZC5oZWlnaHQsXG5cdH07XG5cblx0d3JpdGVVaW50MTYod3JpdGVyLCBDb21wcmVzc2lvbi5SbGVDb21wcmVzc2VkKTtcblxuXHRpZiAoUkFXX0lNQUdFX0RBVEEgJiYgKHBzZCBhcyBhbnkpLmltYWdlRGF0YVJhdykge1xuXHRcdGNvbnNvbGUubG9nKCd3cml0aW5nIHJhdyBpbWFnZSBkYXRhJyk7XG5cdFx0d3JpdGVCeXRlcyh3cml0ZXIsIChwc2QgYXMgYW55KS5pbWFnZURhdGFSYXcpO1xuXHR9IGVsc2Uge1xuXHRcdHdyaXRlQnl0ZXMod3JpdGVyLCB3cml0ZURhdGFSTEUodGVtcEJ1ZmZlciwgZGF0YSwgcHNkLndpZHRoLCBwc2QuaGVpZ2h0LCBjaGFubmVscywgISFvcHRpb25zLnBzYikpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHdyaXRlTGF5ZXJJbmZvKHRlbXBCdWZmZXI6IFVpbnQ4QXJyYXksIHdyaXRlcjogUHNkV3JpdGVyLCBwc2Q6IFBzZCwgZ2xvYmFsQWxwaGE6IGJvb2xlYW4sIG9wdGlvbnM6IEV4dGVuZGVkV3JpdGVPcHRpb25zKSB7XG5cdHdyaXRlU2VjdGlvbih3cml0ZXIsIDQsICgpID0+IHtcblx0XHRjb25zdCBsYXllcnM6IExheWVyW10gPSBbXTtcblxuXHRcdGFkZENoaWxkcmVuKGxheWVycywgcHNkLmNoaWxkcmVuKTtcblxuXHRcdGlmICghbGF5ZXJzLmxlbmd0aCkgbGF5ZXJzLnB1c2goe30pO1xuXG5cdFx0d3JpdGVJbnQxNih3cml0ZXIsIGdsb2JhbEFscGhhID8gLWxheWVycy5sZW5ndGggOiBsYXllcnMubGVuZ3RoKTtcblxuXHRcdGNvbnN0IGxheWVyc0RhdGEgPSBsYXllcnMubWFwKChsLCBpKSA9PiBnZXRDaGFubmVscyh0ZW1wQnVmZmVyLCBsLCBpID09PSAwLCBvcHRpb25zKSk7XG5cblx0XHQvLyBsYXllciByZWNvcmRzXG5cdFx0Zm9yIChjb25zdCBsYXllckRhdGEgb2YgbGF5ZXJzRGF0YSkge1xuXHRcdFx0Y29uc3QgeyBsYXllciwgdG9wLCBsZWZ0LCBib3R0b20sIHJpZ2h0LCBjaGFubmVscyB9ID0gbGF5ZXJEYXRhO1xuXG5cdFx0XHR3cml0ZUludDMyKHdyaXRlciwgdG9wKTtcblx0XHRcdHdyaXRlSW50MzIod3JpdGVyLCBsZWZ0KTtcblx0XHRcdHdyaXRlSW50MzIod3JpdGVyLCBib3R0b20pO1xuXHRcdFx0d3JpdGVJbnQzMih3cml0ZXIsIHJpZ2h0KTtcblx0XHRcdHdyaXRlVWludDE2KHdyaXRlciwgY2hhbm5lbHMubGVuZ3RoKTtcblxuXHRcdFx0Zm9yIChjb25zdCBjIG9mIGNoYW5uZWxzKSB7XG5cdFx0XHRcdHdyaXRlSW50MTYod3JpdGVyLCBjLmNoYW5uZWxJZCk7XG5cdFx0XHRcdGlmIChvcHRpb25zLnBzYikgd3JpdGVVaW50MzIod3JpdGVyLCAwKTtcblx0XHRcdFx0d3JpdGVVaW50MzIod3JpdGVyLCBjLmxlbmd0aCk7XG5cdFx0XHR9XG5cblx0XHRcdHdyaXRlU2lnbmF0dXJlKHdyaXRlciwgJzhCSU0nKTtcblx0XHRcdHdyaXRlU2lnbmF0dXJlKHdyaXRlciwgZnJvbUJsZW5kTW9kZVtsYXllci5ibGVuZE1vZGUhXSB8fCAnbm9ybScpO1xuXHRcdFx0d3JpdGVVaW50OCh3cml0ZXIsIE1hdGgucm91bmQoY2xhbXAobGF5ZXIub3BhY2l0eSA/PyAxLCAwLCAxKSAqIDI1NSkpO1xuXHRcdFx0d3JpdGVVaW50OCh3cml0ZXIsIGxheWVyLmNsaXBwaW5nID8gMSA6IDApO1xuXG5cdFx0XHRsZXQgZmxhZ3MgPSAweDA4OyAvLyAxIGZvciBQaG90b3Nob3AgNS4wIGFuZCBsYXRlciwgdGVsbHMgaWYgYml0IDQgaGFzIHVzZWZ1bCBpbmZvcm1hdGlvblxuXHRcdFx0aWYgKGxheWVyLnRyYW5zcGFyZW5jeVByb3RlY3RlZCkgZmxhZ3MgfD0gMHgwMTtcblx0XHRcdGlmIChsYXllci5oaWRkZW4pIGZsYWdzIHw9IDB4MDI7XG5cdFx0XHRpZiAobGF5ZXIudmVjdG9yTWFzayB8fCAobGF5ZXIuc2VjdGlvbkRpdmlkZXIgJiYgbGF5ZXIuc2VjdGlvbkRpdmlkZXIudHlwZSAhPT0gU2VjdGlvbkRpdmlkZXJUeXBlLk90aGVyKSkge1xuXHRcdFx0XHRmbGFncyB8PSAweDEwOyAvLyBwaXhlbCBkYXRhIGlycmVsZXZhbnQgdG8gYXBwZWFyYW5jZSBvZiBkb2N1bWVudFxuXHRcdFx0fVxuXHRcdFx0aWYgKGxheWVyLmVmZmVjdHMgJiYgaGFzTXVsdGlFZmZlY3RzKGxheWVyLmVmZmVjdHMpKSB7IC8vIFRPRE86IHRoaXMgaXMgbm90IGNvcnJlY3Rcblx0XHRcdFx0ZmxhZ3MgfD0gMHgyMDsgLy8ganVzdCBndWVzc2luZyB0aGlzIG9uZSwgbWlnaHQgYmUgY29tcGxldGVseSBpbmNvcnJlY3Rcblx0XHRcdH1cblx0XHRcdC8vIGlmICgnXzInIGluIGxheWVyKSBmbGFncyB8PSAweDIwOyAvLyBURU1QISEhXG5cblx0XHRcdHdyaXRlVWludDgod3JpdGVyLCBmbGFncyk7XG5cdFx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgMCk7IC8vIGZpbGxlclxuXHRcdFx0d3JpdGVTZWN0aW9uKHdyaXRlciwgMSwgKCkgPT4ge1xuXHRcdFx0XHR3cml0ZUxheWVyTWFza0RhdGEod3JpdGVyLCBsYXllciwgbGF5ZXJEYXRhKTtcblx0XHRcdFx0d3JpdGVMYXllckJsZW5kaW5nUmFuZ2VzKHdyaXRlciwgcHNkKTtcblx0XHRcdFx0d3JpdGVQYXNjYWxTdHJpbmcod3JpdGVyLCBsYXllci5uYW1lIHx8ICcnLCA0KTtcblx0XHRcdFx0d3JpdGVBZGRpdGlvbmFsTGF5ZXJJbmZvKHdyaXRlciwgbGF5ZXIsIHBzZCwgb3B0aW9ucyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvLyBsYXllciBjaGFubmVsIGltYWdlIGRhdGFcblx0XHRmb3IgKGNvbnN0IGxheWVyRGF0YSBvZiBsYXllcnNEYXRhKSB7XG5cdFx0XHRmb3IgKGNvbnN0IGNoYW5uZWwgb2YgbGF5ZXJEYXRhLmNoYW5uZWxzKSB7XG5cdFx0XHRcdHdyaXRlVWludDE2KHdyaXRlciwgY2hhbm5lbC5jb21wcmVzc2lvbik7XG5cblx0XHRcdFx0aWYgKGNoYW5uZWwuYnVmZmVyKSB7XG5cdFx0XHRcdFx0d3JpdGVCeXRlcyh3cml0ZXIsIGNoYW5uZWwuYnVmZmVyKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSwgdHJ1ZSwgb3B0aW9ucy5wc2IpO1xufVxuXG5mdW5jdGlvbiB3cml0ZUxheWVyTWFza0RhdGEod3JpdGVyOiBQc2RXcml0ZXIsIHsgbWFzayB9OiBMYXllciwgbGF5ZXJEYXRhOiBMYXllckNoYW5uZWxEYXRhKSB7XG5cdHdyaXRlU2VjdGlvbih3cml0ZXIsIDEsICgpID0+IHtcblx0XHRpZiAoIW1hc2spIHJldHVybjtcblxuXHRcdGNvbnN0IG0gPSBsYXllckRhdGEubWFzayB8fCB7fSBhcyBQYXJ0aWFsPEJvdW5kcz47XG5cdFx0d3JpdGVJbnQzMih3cml0ZXIsIG0udG9wISk7XG5cdFx0d3JpdGVJbnQzMih3cml0ZXIsIG0ubGVmdCEpO1xuXHRcdHdyaXRlSW50MzIod3JpdGVyLCBtLmJvdHRvbSEpO1xuXHRcdHdyaXRlSW50MzIod3JpdGVyLCBtLnJpZ2h0ISk7XG5cdFx0d3JpdGVVaW50OCh3cml0ZXIsIG1hc2suZGVmYXVsdENvbG9yISk7XG5cblx0XHRsZXQgcGFyYW1zID0gMDtcblx0XHRpZiAobWFzay51c2VyTWFza0RlbnNpdHkgIT09IHVuZGVmaW5lZCkgcGFyYW1zIHw9IE1hc2tQYXJhbXMuVXNlck1hc2tEZW5zaXR5O1xuXHRcdGlmIChtYXNrLnVzZXJNYXNrRmVhdGhlciAhPT0gdW5kZWZpbmVkKSBwYXJhbXMgfD0gTWFza1BhcmFtcy5Vc2VyTWFza0ZlYXRoZXI7XG5cdFx0aWYgKG1hc2sudmVjdG9yTWFza0RlbnNpdHkgIT09IHVuZGVmaW5lZCkgcGFyYW1zIHw9IE1hc2tQYXJhbXMuVmVjdG9yTWFza0RlbnNpdHk7XG5cdFx0aWYgKG1hc2sudmVjdG9yTWFza0ZlYXRoZXIgIT09IHVuZGVmaW5lZCkgcGFyYW1zIHw9IE1hc2tQYXJhbXMuVmVjdG9yTWFza0ZlYXRoZXI7XG5cblx0XHRsZXQgZmxhZ3MgPSAwO1xuXHRcdGlmIChtYXNrLmRpc2FibGVkKSBmbGFncyB8PSBMYXllck1hc2tGbGFncy5MYXllck1hc2tEaXNhYmxlZDtcblx0XHRpZiAobWFzay5wb3NpdGlvblJlbGF0aXZlVG9MYXllcikgZmxhZ3MgfD0gTGF5ZXJNYXNrRmxhZ3MuUG9zaXRpb25SZWxhdGl2ZVRvTGF5ZXI7XG5cdFx0aWYgKG1hc2suZnJvbVZlY3RvckRhdGEpIGZsYWdzIHw9IExheWVyTWFza0ZsYWdzLkxheWVyTWFza0Zyb21SZW5kZXJpbmdPdGhlckRhdGE7XG5cdFx0aWYgKHBhcmFtcykgZmxhZ3MgfD0gTGF5ZXJNYXNrRmxhZ3MuTWFza0hhc1BhcmFtZXRlcnNBcHBsaWVkVG9JdDtcblxuXHRcdHdyaXRlVWludDgod3JpdGVyLCBmbGFncyk7XG5cblx0XHRpZiAocGFyYW1zKSB7XG5cdFx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgcGFyYW1zKTtcblxuXHRcdFx0aWYgKG1hc2sudXNlck1hc2tEZW5zaXR5ICE9PSB1bmRlZmluZWQpIHdyaXRlVWludDgod3JpdGVyLCBNYXRoLnJvdW5kKG1hc2sudXNlck1hc2tEZW5zaXR5ICogMHhmZikpO1xuXHRcdFx0aWYgKG1hc2sudXNlck1hc2tGZWF0aGVyICE9PSB1bmRlZmluZWQpIHdyaXRlRmxvYXQ2NCh3cml0ZXIsIG1hc2sudXNlck1hc2tGZWF0aGVyKTtcblx0XHRcdGlmIChtYXNrLnZlY3Rvck1hc2tEZW5zaXR5ICE9PSB1bmRlZmluZWQpIHdyaXRlVWludDgod3JpdGVyLCBNYXRoLnJvdW5kKG1hc2sudmVjdG9yTWFza0RlbnNpdHkgKiAweGZmKSk7XG5cdFx0XHRpZiAobWFzay52ZWN0b3JNYXNrRmVhdGhlciAhPT0gdW5kZWZpbmVkKSB3cml0ZUZsb2F0NjQod3JpdGVyLCBtYXNrLnZlY3Rvck1hc2tGZWF0aGVyKTtcblx0XHR9XG5cblx0XHQvLyBUT0RPOiBoYW5kbGUgcmVzdCBvZiB0aGUgZmllbGRzXG5cblx0XHR3cml0ZVplcm9zKHdyaXRlciwgMik7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiB3cml0ZUxheWVyQmxlbmRpbmdSYW5nZXMod3JpdGVyOiBQc2RXcml0ZXIsIHBzZDogUHNkKSB7XG5cdHdyaXRlU2VjdGlvbih3cml0ZXIsIDEsICgpID0+IHtcblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIDY1NTM1KTtcblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIDY1NTM1KTtcblxuXHRcdGxldCBjaGFubmVscyA9IHBzZC5jaGFubmVscyB8fCAwOyAvLyBUT0RPOiB1c2UgYWx3YXlzIDQgaW5zdGVhZCA/XG5cdFx0Ly8gY2hhbm5lbHMgPSA0OyAvLyBURVNUSU5HXG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGNoYW5uZWxzOyBpKyspIHtcblx0XHRcdHdyaXRlVWludDMyKHdyaXRlciwgNjU1MzUpO1xuXHRcdFx0d3JpdGVVaW50MzIod3JpdGVyLCA2NTUzNSk7XG5cdFx0fVxuXHR9KTtcbn1cblxuZnVuY3Rpb24gd3JpdGVHbG9iYWxMYXllck1hc2tJbmZvKHdyaXRlcjogUHNkV3JpdGVyLCBpbmZvOiBHbG9iYWxMYXllck1hc2tJbmZvIHwgdW5kZWZpbmVkKSB7XG5cdHdyaXRlU2VjdGlvbih3cml0ZXIsIDEsICgpID0+IHtcblx0XHRpZiAoaW5mbykge1xuXHRcdFx0d3JpdGVVaW50MTYod3JpdGVyLCBpbmZvLm92ZXJsYXlDb2xvclNwYWNlKTtcblx0XHRcdHdyaXRlVWludDE2KHdyaXRlciwgaW5mby5jb2xvclNwYWNlMSk7XG5cdFx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIGluZm8uY29sb3JTcGFjZTIpO1xuXHRcdFx0d3JpdGVVaW50MTYod3JpdGVyLCBpbmZvLmNvbG9yU3BhY2UzKTtcblx0XHRcdHdyaXRlVWludDE2KHdyaXRlciwgaW5mby5jb2xvclNwYWNlNCk7XG5cdFx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIGluZm8ub3BhY2l0eSAqIDB4ZmYpO1xuXHRcdFx0d3JpdGVVaW50OCh3cml0ZXIsIGluZm8ua2luZCk7XG5cdFx0XHR3cml0ZVplcm9zKHdyaXRlciwgMyk7XG5cdFx0fVxuXHR9KTtcbn1cblxuZnVuY3Rpb24gd3JpdGVBZGRpdGlvbmFsTGF5ZXJJbmZvKHdyaXRlcjogUHNkV3JpdGVyLCB0YXJnZXQ6IExheWVyQWRkaXRpb25hbEluZm8sIHBzZDogUHNkLCBvcHRpb25zOiBFeHRlbmRlZFdyaXRlT3B0aW9ucykge1xuXHRmb3IgKGNvbnN0IGhhbmRsZXIgb2YgaW5mb0hhbmRsZXJzKSB7XG5cdFx0bGV0IGtleSA9IGhhbmRsZXIua2V5O1xuXG5cdFx0aWYgKGtleSA9PT0gJ1R4dDInICYmIG9wdGlvbnMuaW52YWxpZGF0ZVRleHRMYXllcnMpIGNvbnRpbnVlO1xuXHRcdGlmIChrZXkgPT09ICd2bXNrJyAmJiBvcHRpb25zLnBzYikga2V5ID0gJ3ZzbXMnO1xuXG5cdFx0aWYgKGhhbmRsZXIuaGFzKHRhcmdldCkpIHtcblx0XHRcdGNvbnN0IGxhcmdlID0gb3B0aW9ucy5wc2IgJiYgbGFyZ2VBZGRpdGlvbmFsSW5mb0tleXMuaW5kZXhPZihrZXkpICE9PSAtMTtcblxuXHRcdFx0d3JpdGVTaWduYXR1cmUod3JpdGVyLCBsYXJnZSA/ICc4QjY0JyA6ICc4QklNJyk7XG5cdFx0XHR3cml0ZVNpZ25hdHVyZSh3cml0ZXIsIGtleSk7XG5cblx0XHRcdGNvbnN0IGZvdXJCeXRlcyA9IGtleSA9PT0gJ1R4dDInIHx8IGtleSA9PT0gJ2x1bmknIHx8IGtleSA9PT0gJ3Ztc2snIHx8IGtleSA9PT0gJ2FydGInIHx8IGtleSA9PT0gJ2FydGQnIHx8XG5cdFx0XHRcdGtleSA9PT0gJ3ZvZ2snIHx8IGtleSA9PT0gJ1NvTGQnIHx8IGtleSA9PT0gJ2xuazInIHx8IGtleSA9PT0gJ3ZzY2cnIHx8IGtleSA9PT0gJ3ZzbXMnIHx8IGtleSA9PT0gJ0dkRmwnIHx8XG5cdFx0XHRcdGtleSA9PT0gJ2xtZngnIHx8IGtleSA9PT0gJ2xyRlgnIHx8IGtleSA9PT0gJ2NpbmYnIHx8IGtleSA9PT0gJ1BsTGQnIHx8IGtleSA9PT0gJ0Fubm8nO1xuXG5cdFx0XHR3cml0ZVNlY3Rpb24od3JpdGVyLCBmb3VyQnl0ZXMgPyA0IDogMiwgKCkgPT4ge1xuXHRcdFx0XHRoYW5kbGVyLndyaXRlKHdyaXRlciwgdGFyZ2V0LCBwc2QsIG9wdGlvbnMpO1xuXHRcdFx0fSwga2V5ICE9PSAnVHh0MicgJiYga2V5ICE9PSAnY2luZicgJiYga2V5ICE9PSAnZXh0bicsIGxhcmdlKTtcblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gYWRkQ2hpbGRyZW4obGF5ZXJzOiBMYXllcltdLCBjaGlsZHJlbjogTGF5ZXJbXSB8IHVuZGVmaW5lZCkge1xuXHRpZiAoIWNoaWxkcmVuKSByZXR1cm47XG5cblx0Zm9yIChjb25zdCBjIG9mIGNoaWxkcmVuKSB7XG5cdFx0aWYgKGMuY2hpbGRyZW4gJiYgYy5jYW52YXMpIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBsYXllciwgY2Fubm90IGhhdmUgYm90aCAnY2FudmFzJyBhbmQgJ2NoaWxkcmVuJyBwcm9wZXJ0aWVzYCk7XG5cdFx0aWYgKGMuY2hpbGRyZW4gJiYgYy5pbWFnZURhdGEpIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBsYXllciwgY2Fubm90IGhhdmUgYm90aCAnaW1hZ2VEYXRhJyBhbmQgJ2NoaWxkcmVuJyBwcm9wZXJ0aWVzYCk7XG5cblx0XHRpZiAoYy5jaGlsZHJlbikge1xuXHRcdFx0bGF5ZXJzLnB1c2goe1xuXHRcdFx0XHRuYW1lOiAnPC9MYXllciBncm91cD4nLFxuXHRcdFx0XHRzZWN0aW9uRGl2aWRlcjoge1xuXHRcdFx0XHRcdHR5cGU6IFNlY3Rpb25EaXZpZGVyVHlwZS5Cb3VuZGluZ1NlY3Rpb25EaXZpZGVyLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHQvLyBURVNUSU5HXG5cdFx0XHRcdC8vIG5hbWVTb3VyY2U6ICdsc2V0Jyxcblx0XHRcdFx0Ly8gaWQ6IFs0LCAwLCAwLCA4LCAxMSwgMCwgMCwgMCwgMCwgMTRdW2xheWVycy5sZW5ndGhdIHx8IDAsXG5cdFx0XHRcdC8vIGxheWVyQ29sb3I6ICdub25lJyxcblx0XHRcdFx0Ly8gdGltZXN0YW1wOiBbMTYxMTM0NjgxNy4zNDkwMjEsIDAsIDAsIDE2MTEzNDY4MTcuMzQ5MTc1LCAxNjExMzQ2ODE3LjM0OTE4MzMsIDAsIDAsIDAsIDAsIDE2MTEzNDY4MTcuMzQ5ODMyXVtsYXllcnMubGVuZ3RoXSB8fCAwLFxuXHRcdFx0XHQvLyBwcm90ZWN0ZWQ6IHt9LFxuXHRcdFx0XHQvLyByZWZlcmVuY2VQb2ludDogeyB4OiAwLCB5OiAwIH0sXG5cdFx0XHR9KTtcblx0XHRcdGFkZENoaWxkcmVuKGxheWVycywgYy5jaGlsZHJlbik7XG5cdFx0XHRsYXllcnMucHVzaCh7XG5cdFx0XHRcdHNlY3Rpb25EaXZpZGVyOiB7XG5cdFx0XHRcdFx0dHlwZTogYy5vcGVuZWQgPT09IGZhbHNlID8gU2VjdGlvbkRpdmlkZXJUeXBlLkNsb3NlZEZvbGRlciA6IFNlY3Rpb25EaXZpZGVyVHlwZS5PcGVuRm9sZGVyLFxuXHRcdFx0XHRcdGtleTogZnJvbUJsZW5kTW9kZVtjLmJsZW5kTW9kZSFdIHx8ICdwYXNzJyxcblx0XHRcdFx0XHRzdWJUeXBlOiAwLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHQuLi5jLFxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxheWVycy5wdXNoKHsgLi4uYyB9KTtcblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gcmVzaXplQnVmZmVyKHdyaXRlcjogUHNkV3JpdGVyLCBzaXplOiBudW1iZXIpIHtcblx0bGV0IG5ld0xlbmd0aCA9IHdyaXRlci5idWZmZXIuYnl0ZUxlbmd0aDtcblxuXHRkbyB7XG5cdFx0bmV3TGVuZ3RoICo9IDI7XG5cdH0gd2hpbGUgKHNpemUgPiBuZXdMZW5ndGgpO1xuXG5cdGNvbnN0IG5ld0J1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihuZXdMZW5ndGgpO1xuXHRjb25zdCBuZXdCeXRlcyA9IG5ldyBVaW50OEFycmF5KG5ld0J1ZmZlcik7XG5cdGNvbnN0IG9sZEJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkod3JpdGVyLmJ1ZmZlcik7XG5cdG5ld0J5dGVzLnNldChvbGRCeXRlcyk7XG5cdHdyaXRlci5idWZmZXIgPSBuZXdCdWZmZXI7XG5cdHdyaXRlci52aWV3ID0gbmV3IERhdGFWaWV3KHdyaXRlci5idWZmZXIpO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVTaXplKHdyaXRlcjogUHNkV3JpdGVyLCBzaXplOiBudW1iZXIpIHtcblx0aWYgKHNpemUgPiB3cml0ZXIuYnVmZmVyLmJ5dGVMZW5ndGgpIHtcblx0XHRyZXNpemVCdWZmZXIod3JpdGVyLCBzaXplKTtcblx0fVxufVxuXG5mdW5jdGlvbiBhZGRTaXplKHdyaXRlcjogUHNkV3JpdGVyLCBzaXplOiBudW1iZXIpIHtcblx0Y29uc3Qgb2Zmc2V0ID0gd3JpdGVyLm9mZnNldDtcblx0ZW5zdXJlU2l6ZSh3cml0ZXIsIHdyaXRlci5vZmZzZXQgKz0gc2l6ZSk7XG5cdHJldHVybiBvZmZzZXQ7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRodW1ibmFpbChwc2Q6IFBzZCkge1xuXHRjb25zdCBjYW52YXMgPSBjcmVhdGVDYW52YXMoMTAsIDEwKTtcblx0bGV0IHNjYWxlID0gMTtcblxuXHRpZiAocHNkLndpZHRoID4gcHNkLmhlaWdodCkge1xuXHRcdGNhbnZhcy53aWR0aCA9IDE2MDtcblx0XHRjYW52YXMuaGVpZ2h0ID0gTWF0aC5mbG9vcihwc2QuaGVpZ2h0ICogKGNhbnZhcy53aWR0aCAvIHBzZC53aWR0aCkpO1xuXHRcdHNjYWxlID0gY2FudmFzLndpZHRoIC8gcHNkLndpZHRoO1xuXHR9IGVsc2Uge1xuXHRcdGNhbnZhcy5oZWlnaHQgPSAxNjA7XG5cdFx0Y2FudmFzLndpZHRoID0gTWF0aC5mbG9vcihwc2Qud2lkdGggKiAoY2FudmFzLmhlaWdodCAvIHBzZC5oZWlnaHQpKTtcblx0XHRzY2FsZSA9IGNhbnZhcy5oZWlnaHQgLyBwc2QuaGVpZ2h0O1xuXHR9XG5cblx0Y29uc3QgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpITtcblx0Y29udGV4dC5zY2FsZShzY2FsZSwgc2NhbGUpO1xuXG5cdGlmIChwc2QuaW1hZ2VEYXRhKSB7XG5cdFx0Y29uc3QgdGVtcCA9IGNyZWF0ZUNhbnZhcyhwc2QuaW1hZ2VEYXRhLndpZHRoLCBwc2QuaW1hZ2VEYXRhLmhlaWdodCk7XG5cdFx0dGVtcC5nZXRDb250ZXh0KCcyZCcpIS5wdXRJbWFnZURhdGEocHNkLmltYWdlRGF0YSwgMCwgMCk7XG5cdFx0Y29udGV4dC5kcmF3SW1hZ2UodGVtcCwgMCwgMCk7XG5cdH0gZWxzZSBpZiAocHNkLmNhbnZhcykge1xuXHRcdGNvbnRleHQuZHJhd0ltYWdlKHBzZC5jYW52YXMsIDAsIDApO1xuXHR9XG5cblx0cmV0dXJuIGNhbnZhcztcbn1cblxuZnVuY3Rpb24gZ2V0Q2hhbm5lbHMoXG5cdHRlbXBCdWZmZXI6IFVpbnQ4QXJyYXksIGxheWVyOiBMYXllciwgYmFja2dyb3VuZDogYm9vbGVhbiwgb3B0aW9uczogV3JpdGVPcHRpb25zXG4pOiBMYXllckNoYW5uZWxEYXRhIHtcblx0Y29uc3QgbGF5ZXJEYXRhID0gZ2V0TGF5ZXJDaGFubmVscyh0ZW1wQnVmZmVyLCBsYXllciwgYmFja2dyb3VuZCwgb3B0aW9ucyk7XG5cdGNvbnN0IG1hc2sgPSBsYXllci5tYXNrO1xuXG5cdGlmIChtYXNrKSB7XG5cdFx0bGV0IHsgdG9wID0gMCwgbGVmdCA9IDAsIHJpZ2h0ID0gMCwgYm90dG9tID0gMCB9ID0gbWFzaztcblx0XHRsZXQgeyB3aWR0aCwgaGVpZ2h0IH0gPSBnZXRMYXllckRpbWVudGlvbnMobWFzayk7XG5cdFx0bGV0IGltYWdlRGF0YSA9IG1hc2suaW1hZ2VEYXRhO1xuXG5cdFx0aWYgKCFpbWFnZURhdGEgJiYgbWFzay5jYW52YXMgJiYgd2lkdGggJiYgaGVpZ2h0KSB7XG5cdFx0XHRpbWFnZURhdGEgPSBtYXNrLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpIS5nZXRJbWFnZURhdGEoMCwgMCwgd2lkdGgsIGhlaWdodCk7XG5cdFx0fVxuXG5cdFx0aWYgKHdpZHRoICYmIGhlaWdodCAmJiBpbWFnZURhdGEpIHtcblx0XHRcdHJpZ2h0ID0gbGVmdCArIHdpZHRoO1xuXHRcdFx0Ym90dG9tID0gdG9wICsgaGVpZ2h0O1xuXG5cdFx0XHRsZXQgYnVmZmVyID0gd3JpdGVEYXRhUkxFKHRlbXBCdWZmZXIsIGltYWdlRGF0YSwgd2lkdGgsIGhlaWdodCwgWzBdLCAhIW9wdGlvbnMucHNiKSE7XG5cblx0XHRcdGlmIChSQVdfSU1BR0VfREFUQSAmJiAobGF5ZXIgYXMgYW55KS5tYXNrRGF0YVJhdykge1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZygnd3JpdHRlbiByYXcgbGF5ZXIgaW1hZ2UgZGF0YScpO1xuXHRcdFx0XHRidWZmZXIgPSAobGF5ZXIgYXMgYW55KS5tYXNrRGF0YVJhdztcblx0XHRcdH1cblxuXHRcdFx0bGF5ZXJEYXRhLm1hc2sgPSB7IHRvcCwgbGVmdCwgcmlnaHQsIGJvdHRvbSB9O1xuXHRcdFx0bGF5ZXJEYXRhLmNoYW5uZWxzLnB1c2goe1xuXHRcdFx0XHRjaGFubmVsSWQ6IENoYW5uZWxJRC5Vc2VyTWFzayxcblx0XHRcdFx0Y29tcHJlc3Npb246IENvbXByZXNzaW9uLlJsZUNvbXByZXNzZWQsXG5cdFx0XHRcdGJ1ZmZlcjogYnVmZmVyLFxuXHRcdFx0XHRsZW5ndGg6IDIgKyBidWZmZXIubGVuZ3RoLFxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxheWVyRGF0YS5tYXNrID0geyB0b3A6IDAsIGxlZnQ6IDAsIHJpZ2h0OiAwLCBib3R0b206IDAgfTtcblx0XHRcdGxheWVyRGF0YS5jaGFubmVscy5wdXNoKHtcblx0XHRcdFx0Y2hhbm5lbElkOiBDaGFubmVsSUQuVXNlck1hc2ssXG5cdFx0XHRcdGNvbXByZXNzaW9uOiBDb21wcmVzc2lvbi5SYXdEYXRhLFxuXHRcdFx0XHRidWZmZXI6IG5ldyBVaW50OEFycmF5KDApLFxuXHRcdFx0XHRsZW5ndGg6IDAsXG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gbGF5ZXJEYXRhO1xufVxuXG5mdW5jdGlvbiBnZXRMYXllckRpbWVudGlvbnMoeyBjYW52YXMsIGltYWdlRGF0YSB9OiBMYXllcik6IHsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXI7IH0ge1xuXHRyZXR1cm4gaW1hZ2VEYXRhIHx8IGNhbnZhcyB8fCB7IHdpZHRoOiAwLCBoZWlnaHQ6IDAgfTtcbn1cblxuZnVuY3Rpb24gY3JvcEltYWdlRGF0YShkYXRhOiBJbWFnZURhdGEsIGxlZnQ6IG51bWJlciwgdG9wOiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKSB7XG5cdGNvbnN0IGNyb3BwZWREYXRhID0gY3JlYXRlSW1hZ2VEYXRhKHdpZHRoLCBoZWlnaHQpO1xuXHRjb25zdCBzcmNEYXRhID0gZGF0YS5kYXRhO1xuXHRjb25zdCBkc3REYXRhID0gY3JvcHBlZERhdGEuZGF0YTtcblxuXHRmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgeSsrKSB7XG5cdFx0Zm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgeCsrKSB7XG5cdFx0XHRsZXQgc3JjID0gKCh4ICsgbGVmdCkgKyAoeSArIHRvcCkgKiB3aWR0aCkgKiA0O1xuXHRcdFx0bGV0IGRzdCA9ICh4ICsgeSAqIHdpZHRoKSAqIDQ7XG5cdFx0XHRkc3REYXRhW2RzdF0gPSBzcmNEYXRhW3NyY107XG5cdFx0XHRkc3REYXRhW2RzdCArIDFdID0gc3JjRGF0YVtzcmMgKyAxXTtcblx0XHRcdGRzdERhdGFbZHN0ICsgMl0gPSBzcmNEYXRhW3NyYyArIDJdO1xuXHRcdFx0ZHN0RGF0YVtkc3QgKyAzXSA9IHNyY0RhdGFbc3JjICsgM107XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGNyb3BwZWREYXRhO1xufVxuXG5mdW5jdGlvbiBnZXRMYXllckNoYW5uZWxzKFxuXHR0ZW1wQnVmZmVyOiBVaW50OEFycmF5LCBsYXllcjogTGF5ZXIsIGJhY2tncm91bmQ6IGJvb2xlYW4sIG9wdGlvbnM6IFdyaXRlT3B0aW9uc1xuKTogTGF5ZXJDaGFubmVsRGF0YSB7XG5cdGxldCB7IHRvcCA9IDAsIGxlZnQgPSAwLCByaWdodCA9IDAsIGJvdHRvbSA9IDAgfSA9IGxheWVyO1xuXHRsZXQgY2hhbm5lbHM6IENoYW5uZWxEYXRhW10gPSBbXG5cdFx0eyBjaGFubmVsSWQ6IENoYW5uZWxJRC5UcmFuc3BhcmVuY3ksIGNvbXByZXNzaW9uOiBDb21wcmVzc2lvbi5SYXdEYXRhLCBidWZmZXI6IHVuZGVmaW5lZCwgbGVuZ3RoOiAyIH0sXG5cdFx0eyBjaGFubmVsSWQ6IENoYW5uZWxJRC5Db2xvcjAsIGNvbXByZXNzaW9uOiBDb21wcmVzc2lvbi5SYXdEYXRhLCBidWZmZXI6IHVuZGVmaW5lZCwgbGVuZ3RoOiAyIH0sXG5cdFx0eyBjaGFubmVsSWQ6IENoYW5uZWxJRC5Db2xvcjEsIGNvbXByZXNzaW9uOiBDb21wcmVzc2lvbi5SYXdEYXRhLCBidWZmZXI6IHVuZGVmaW5lZCwgbGVuZ3RoOiAyIH0sXG5cdFx0eyBjaGFubmVsSWQ6IENoYW5uZWxJRC5Db2xvcjIsIGNvbXByZXNzaW9uOiBDb21wcmVzc2lvbi5SYXdEYXRhLCBidWZmZXI6IHVuZGVmaW5lZCwgbGVuZ3RoOiAyIH0sXG5cdF07XG5cblx0bGV0IHsgd2lkdGgsIGhlaWdodCB9ID0gZ2V0TGF5ZXJEaW1lbnRpb25zKGxheWVyKTtcblxuXHRpZiAoIShsYXllci5jYW52YXMgfHwgbGF5ZXIuaW1hZ2VEYXRhKSB8fCAhd2lkdGggfHwgIWhlaWdodCkge1xuXHRcdHJpZ2h0ID0gbGVmdDtcblx0XHRib3R0b20gPSB0b3A7XG5cdFx0cmV0dXJuIHsgbGF5ZXIsIHRvcCwgbGVmdCwgcmlnaHQsIGJvdHRvbSwgY2hhbm5lbHMgfTtcblx0fVxuXG5cdHJpZ2h0ID0gbGVmdCArIHdpZHRoO1xuXHRib3R0b20gPSB0b3AgKyBoZWlnaHQ7XG5cblx0bGV0IGRhdGEgPSBsYXllci5pbWFnZURhdGEgfHwgbGF5ZXIuY2FudmFzIS5nZXRDb250ZXh0KCcyZCcpIS5nZXRJbWFnZURhdGEoMCwgMCwgd2lkdGgsIGhlaWdodCk7XG5cblx0aWYgKG9wdGlvbnMudHJpbUltYWdlRGF0YSkge1xuXHRcdGNvbnN0IHRyaW1tZWQgPSB0cmltRGF0YShkYXRhKTtcblxuXHRcdGlmICh0cmltbWVkLmxlZnQgIT09IDAgfHwgdHJpbW1lZC50b3AgIT09IDAgfHwgdHJpbW1lZC5yaWdodCAhPT0gZGF0YS53aWR0aCB8fCB0cmltbWVkLmJvdHRvbSAhPT0gZGF0YS5oZWlnaHQpIHtcblx0XHRcdGxlZnQgKz0gdHJpbW1lZC5sZWZ0O1xuXHRcdFx0dG9wICs9IHRyaW1tZWQudG9wO1xuXHRcdFx0cmlnaHQgLT0gKGRhdGEud2lkdGggLSB0cmltbWVkLnJpZ2h0KTtcblx0XHRcdGJvdHRvbSAtPSAoZGF0YS5oZWlnaHQgLSB0cmltbWVkLmJvdHRvbSk7XG5cdFx0XHR3aWR0aCA9IHJpZ2h0IC0gbGVmdDtcblx0XHRcdGhlaWdodCA9IGJvdHRvbSAtIHRvcDtcblxuXHRcdFx0aWYgKCF3aWR0aCB8fCAhaGVpZ2h0KSB7XG5cdFx0XHRcdHJldHVybiB7IGxheWVyLCB0b3AsIGxlZnQsIHJpZ2h0LCBib3R0b20sIGNoYW5uZWxzIH07XG5cdFx0XHR9XG5cblx0XHRcdGlmIChsYXllci5pbWFnZURhdGEpIHtcblx0XHRcdFx0ZGF0YSA9IGNyb3BJbWFnZURhdGEoZGF0YSwgdHJpbW1lZC5sZWZ0LCB0cmltbWVkLnRvcCwgd2lkdGgsIGhlaWdodCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRkYXRhID0gbGF5ZXIuY2FudmFzIS5nZXRDb250ZXh0KCcyZCcpIS5nZXRJbWFnZURhdGEodHJpbW1lZC5sZWZ0LCB0cmltbWVkLnRvcCwgd2lkdGgsIGhlaWdodCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Y29uc3QgY2hhbm5lbElkcyA9IFtcblx0XHRDaGFubmVsSUQuQ29sb3IwLFxuXHRcdENoYW5uZWxJRC5Db2xvcjEsXG5cdFx0Q2hhbm5lbElELkNvbG9yMixcblx0XTtcblxuXHRpZiAoIWJhY2tncm91bmQgfHwgb3B0aW9ucy5ub0JhY2tncm91bmQgfHwgbGF5ZXIubWFzayB8fCBoYXNBbHBoYShkYXRhKSB8fCAoUkFXX0lNQUdFX0RBVEEgJiYgKGxheWVyIGFzIGFueSkuaW1hZ2VEYXRhUmF3Py5bJy0xJ10pKSB7XG5cdFx0Y2hhbm5lbElkcy51bnNoaWZ0KENoYW5uZWxJRC5UcmFuc3BhcmVuY3kpO1xuXHR9XG5cblx0Y2hhbm5lbHMgPSBjaGFubmVsSWRzLm1hcChjaGFubmVsID0+IHtcblx0XHRjb25zdCBvZmZzZXQgPSBvZmZzZXRGb3JDaGFubmVsKGNoYW5uZWwsIGZhbHNlKTsgLy8gVE9ETzogcHNkLmNvbG9yTW9kZSA9PT0gQ29sb3JNb2RlLkNNWUspO1xuXHRcdGxldCBidWZmZXIgPSB3cml0ZURhdGFSTEUodGVtcEJ1ZmZlciwgZGF0YSwgd2lkdGgsIGhlaWdodCwgW29mZnNldF0sICEhb3B0aW9ucy5wc2IpITtcblxuXHRcdGlmIChSQVdfSU1BR0VfREFUQSAmJiAobGF5ZXIgYXMgYW55KS5pbWFnZURhdGFSYXcpIHtcblx0XHRcdC8vIGNvbnNvbGUubG9nKCd3cml0dGVuIHJhdyBsYXllciBpbWFnZSBkYXRhJyk7XG5cdFx0XHRidWZmZXIgPSAobGF5ZXIgYXMgYW55KS5pbWFnZURhdGFSYXdbY2hhbm5lbF07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGNoYW5uZWxJZDogY2hhbm5lbCxcblx0XHRcdGNvbXByZXNzaW9uOiBDb21wcmVzc2lvbi5SbGVDb21wcmVzc2VkLFxuXHRcdFx0YnVmZmVyOiBidWZmZXIsXG5cdFx0XHRsZW5ndGg6IDIgKyBidWZmZXIubGVuZ3RoLFxuXHRcdH07XG5cdH0pO1xuXG5cdHJldHVybiB7IGxheWVyLCB0b3AsIGxlZnQsIHJpZ2h0LCBib3R0b20sIGNoYW5uZWxzIH07XG59XG5cbmZ1bmN0aW9uIGlzUm93RW1wdHkoeyBkYXRhLCB3aWR0aCB9OiBQaXhlbERhdGEsIHk6IG51bWJlciwgbGVmdDogbnVtYmVyLCByaWdodDogbnVtYmVyKSB7XG5cdGNvbnN0IHN0YXJ0ID0gKCh5ICogd2lkdGggKyBsZWZ0KSAqIDQgKyAzKSB8IDA7XG5cdGNvbnN0IGVuZCA9IChzdGFydCArIChyaWdodCAtIGxlZnQpICogNCkgfCAwO1xuXG5cdGZvciAobGV0IGkgPSBzdGFydDsgaSA8IGVuZDsgaSA9IChpICsgNCkgfCAwKSB7XG5cdFx0aWYgKGRhdGFbaV0gIT09IDApIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gaXNDb2xFbXB0eSh7IGRhdGEsIHdpZHRoIH06IFBpeGVsRGF0YSwgeDogbnVtYmVyLCB0b3A6IG51bWJlciwgYm90dG9tOiBudW1iZXIpIHtcblx0Y29uc3Qgc3RyaWRlID0gKHdpZHRoICogNCkgfCAwO1xuXHRjb25zdCBzdGFydCA9ICh0b3AgKiBzdHJpZGUgKyB4ICogNCArIDMpIHwgMDtcblxuXHRmb3IgKGxldCB5ID0gdG9wLCBpID0gc3RhcnQ7IHkgPCBib3R0b207IHkrKywgaSA9IChpICsgc3RyaWRlKSB8IDApIHtcblx0XHRpZiAoZGF0YVtpXSAhPT0gMCkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiB0cmltRGF0YShkYXRhOiBQaXhlbERhdGEpIHtcblx0bGV0IHRvcCA9IDA7XG5cdGxldCBsZWZ0ID0gMDtcblx0bGV0IHJpZ2h0ID0gZGF0YS53aWR0aDtcblx0bGV0IGJvdHRvbSA9IGRhdGEuaGVpZ2h0O1xuXG5cdHdoaWxlICh0b3AgPCBib3R0b20gJiYgaXNSb3dFbXB0eShkYXRhLCB0b3AsIGxlZnQsIHJpZ2h0KSlcblx0XHR0b3ArKztcblx0d2hpbGUgKGJvdHRvbSA+IHRvcCAmJiBpc1Jvd0VtcHR5KGRhdGEsIGJvdHRvbSAtIDEsIGxlZnQsIHJpZ2h0KSlcblx0XHRib3R0b20tLTtcblx0d2hpbGUgKGxlZnQgPCByaWdodCAmJiBpc0NvbEVtcHR5KGRhdGEsIGxlZnQsIHRvcCwgYm90dG9tKSlcblx0XHRsZWZ0Kys7XG5cdHdoaWxlIChyaWdodCA+IGxlZnQgJiYgaXNDb2xFbXB0eShkYXRhLCByaWdodCAtIDEsIHRvcCwgYm90dG9tKSlcblx0XHRyaWdodC0tO1xuXG5cdHJldHVybiB7IHRvcCwgbGVmdCwgcmlnaHQsIGJvdHRvbSB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVDb2xvcih3cml0ZXI6IFBzZFdyaXRlciwgY29sb3I6IENvbG9yIHwgdW5kZWZpbmVkKSB7XG5cdGlmICghY29sb3IpIHtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIENvbG9yU3BhY2UuUkdCKTtcblx0XHR3cml0ZVplcm9zKHdyaXRlciwgOCk7XG5cdH0gZWxzZSBpZiAoJ3InIGluIGNvbG9yKSB7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBDb2xvclNwYWNlLlJHQik7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBNYXRoLnJvdW5kKGNvbG9yLnIgKiAyNTcpKTtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIE1hdGgucm91bmQoY29sb3IuZyAqIDI1NykpO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgTWF0aC5yb3VuZChjb2xvci5iICogMjU3KSk7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCAwKTtcblx0fSBlbHNlIGlmICgnbCcgaW4gY29sb3IpIHtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIENvbG9yU3BhY2UuTGFiKTtcblx0XHR3cml0ZUludDE2KHdyaXRlciwgTWF0aC5yb3VuZChjb2xvci5sICogMTAwMDApKTtcblx0XHR3cml0ZUludDE2KHdyaXRlciwgTWF0aC5yb3VuZChjb2xvci5hIDwgMCA/IChjb2xvci5hICogMTI4MDApIDogKGNvbG9yLmEgKiAxMjcwMCkpKTtcblx0XHR3cml0ZUludDE2KHdyaXRlciwgTWF0aC5yb3VuZChjb2xvci5iIDwgMCA/IChjb2xvci5iICogMTI4MDApIDogKGNvbG9yLmIgKiAxMjcwMCkpKTtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIDApO1xuXHR9IGVsc2UgaWYgKCdoJyBpbiBjb2xvcikge1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgQ29sb3JTcGFjZS5IU0IpO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgTWF0aC5yb3VuZChjb2xvci5oICogMHhmZmZmKSk7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBNYXRoLnJvdW5kKGNvbG9yLnMgKiAweGZmZmYpKTtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIE1hdGgucm91bmQoY29sb3IuYiAqIDB4ZmZmZikpO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgMCk7XG5cdH0gZWxzZSBpZiAoJ2MnIGluIGNvbG9yKSB7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBDb2xvclNwYWNlLkNNWUspO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgTWF0aC5yb3VuZChjb2xvci5jICogMjU3KSk7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBNYXRoLnJvdW5kKGNvbG9yLm0gKiAyNTcpKTtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIE1hdGgucm91bmQoY29sb3IueSAqIDI1NykpO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgTWF0aC5yb3VuZChjb2xvci5rICogMjU3KSk7XG5cdH0gZWxzZSB7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBDb2xvclNwYWNlLkdyYXlzY2FsZSk7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBNYXRoLnJvdW5kKGNvbG9yLmsgKiAxMDAwMCAvIDI1NSkpO1xuXHRcdHdyaXRlWmVyb3Mod3JpdGVyLCA2KTtcblx0fVxufVxuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvYnJhbmRvbmxpdS9EZXNrdG9wL3NreWxhYi9hZy1wc2Qvc3JjIn0=
