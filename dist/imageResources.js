"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceHandlersMap = exports.resourceHandlers = void 0;
var base64_js_1 = require("base64-js");
var psdReader_1 = require("./psdReader");
var psdWriter_1 = require("./psdWriter");
var helpers_1 = require("./helpers");
var utf8_1 = require("./utf8");
var descriptor_1 = require("./descriptor");
exports.resourceHandlers = [];
exports.resourceHandlersMap = {};
function addHandler(key, has, read, write) {
    var handler = { key: key, has: has, read: read, write: write };
    exports.resourceHandlers.push(handler);
    exports.resourceHandlersMap[handler.key] = handler;
}
var LOG_MOCK_HANDLERS = false;
var RESOLUTION_UNITS = [undefined, 'PPI', 'PPCM'];
var MEASUREMENT_UNITS = [undefined, 'Inches', 'Centimeters', 'Points', 'Picas', 'Columns'];
var hex = '0123456789abcdef';
function charToNibble(code) {
    return code <= 57 ? code - 48 : code - 87;
}
function byteAt(value, index) {
    return (charToNibble(value.charCodeAt(index)) << 4) | charToNibble(value.charCodeAt(index + 1));
}
function readUtf8String(reader, length) {
    var buffer = psdReader_1.readBytes(reader, length);
    return utf8_1.decodeString(buffer);
}
function writeUtf8String(writer, value) {
    var buffer = utf8_1.encodeString(value);
    psdWriter_1.writeBytes(writer, buffer);
}
helpers_1.MOCK_HANDLERS && addHandler(1028, // IPTC-NAA record
function (// IPTC-NAA record
target) { return target._ir1028 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1028', left());
    target._ir1028 = psdReader_1.readBytes(reader, left());
}, function (writer, target) {
    psdWriter_1.writeBytes(writer, target._ir1028);
});
addHandler(1061, function (target) { return target.captionDigest !== undefined; }, function (reader, target) {
    var captionDigest = '';
    for (var i = 0; i < 16; i++) {
        var byte = psdReader_1.readUint8(reader);
        captionDigest += hex[byte >> 4];
        captionDigest += hex[byte & 0xf];
    }
    target.captionDigest = captionDigest;
}, function (writer, target) {
    for (var i = 0; i < 16; i++) {
        psdWriter_1.writeUint8(writer, byteAt(target.captionDigest, i * 2));
    }
});
addHandler(1060, function (target) { return target.xmpMetadata !== undefined; }, function (reader, target, left) { return target.xmpMetadata = readUtf8String(reader, left()); }, function (writer, target) { return writeUtf8String(writer, target.xmpMetadata); });
var Inte = helpers_1.createEnum('Inte', 'perceptual', {
    'perceptual': 'Img ',
    'saturation': 'Grp ',
    'relative colorimetric': 'Clrm',
    'absolute colorimetric': 'AClr',
});
addHandler(1082, function (target) { return target.printInformation !== undefined; }, function (reader, target) {
    var _a, _b;
    var desc = descriptor_1.readVersionAndDescriptor(reader);
    target.printInformation = {
        printerName: desc.printerName || '',
        renderingIntent: Inte.decode((_a = desc.Inte) !== null && _a !== void 0 ? _a : 'Inte.Img '),
    };
    var info = target.printInformation;
    if (desc.PstS !== undefined)
        info.printerManagesColors = desc.PstS;
    if (desc['Nm  '] !== undefined)
        info.printerProfile = desc['Nm  '];
    if (desc.MpBl !== undefined)
        info.blackPointCompensation = desc.MpBl;
    if (desc.printSixteenBit !== undefined)
        info.printSixteenBit = desc.printSixteenBit;
    if (desc.hardProof !== undefined)
        info.hardProof = desc.hardProof;
    if (desc.printProofSetup) {
        if ('Bltn' in desc.printProofSetup) {
            info.proofSetup = { builtin: desc.printProofSetup.Bltn.split('.')[1] };
        }
        else {
            info.proofSetup = {
                profile: desc.printProofSetup.profile,
                renderingIntent: Inte.decode((_b = desc.printProofSetup.Inte) !== null && _b !== void 0 ? _b : 'Inte.Img '),
                blackPointCompensation: !!desc.printProofSetup.MpBl,
                paperWhite: !!desc.printProofSetup.paperWhite,
            };
        }
    }
}, function (writer, target) {
    var _a, _b;
    var info = target.printInformation;
    var desc = {};
    if (info.printerManagesColors) {
        desc.PstS = true;
    }
    else {
        if (info.hardProof !== undefined)
            desc.hardProof = !!info.hardProof;
        desc.ClrS = 'ClrS.RGBC'; // TODO: ???
        desc['Nm  '] = (_a = info.printerProfile) !== null && _a !== void 0 ? _a : 'CIE RGB';
    }
    desc.Inte = Inte.encode(info.renderingIntent);
    if (!info.printerManagesColors)
        desc.MpBl = !!info.blackPointCompensation;
    desc.printSixteenBit = !!info.printSixteenBit;
    desc.printerName = info.printerName || '';
    if (info.proofSetup && 'profile' in info.proofSetup) {
        desc.printProofSetup = {
            profile: info.proofSetup.profile || '',
            Inte: Inte.encode(info.proofSetup.renderingIntent),
            MpBl: !!info.proofSetup.blackPointCompensation,
            paperWhite: !!info.proofSetup.paperWhite,
        };
    }
    else {
        desc.printProofSetup = {
            Bltn: ((_b = info.proofSetup) === null || _b === void 0 ? void 0 : _b.builtin) ? "builtinProof." + info.proofSetup.builtin : 'builtinProof.proofCMYK',
        };
    }
    descriptor_1.writeVersionAndDescriptor(writer, '', 'printOutput', desc);
});
helpers_1.MOCK_HANDLERS && addHandler(1083, // Print style
function (// Print style
target) { return target._ir1083 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1083', left());
    target._ir1083 = psdReader_1.readBytes(reader, left());
    // TODO:
    // const desc = readVersionAndDescriptor(reader);
    // console.log('1083', require('util').inspect(desc, false, 99, true));
}, function (writer, target) {
    psdWriter_1.writeBytes(writer, target._ir1083);
});
addHandler(1005, function (target) { return target.resolutionInfo !== undefined; }, function (reader, target) {
    var horizontalResolution = psdReader_1.readFixedPoint32(reader);
    var horizontalResolutionUnit = psdReader_1.readUint16(reader);
    var widthUnit = psdReader_1.readUint16(reader);
    var verticalResolution = psdReader_1.readFixedPoint32(reader);
    var verticalResolutionUnit = psdReader_1.readUint16(reader);
    var heightUnit = psdReader_1.readUint16(reader);
    target.resolutionInfo = {
        horizontalResolution: horizontalResolution,
        horizontalResolutionUnit: RESOLUTION_UNITS[horizontalResolutionUnit] || 'PPI',
        widthUnit: MEASUREMENT_UNITS[widthUnit] || 'Inches',
        verticalResolution: verticalResolution,
        verticalResolutionUnit: RESOLUTION_UNITS[verticalResolutionUnit] || 'PPI',
        heightUnit: MEASUREMENT_UNITS[heightUnit] || 'Inches',
    };
}, function (writer, target) {
    var info = target.resolutionInfo;
    psdWriter_1.writeFixedPoint32(writer, info.horizontalResolution || 0);
    psdWriter_1.writeUint16(writer, Math.max(1, RESOLUTION_UNITS.indexOf(info.horizontalResolutionUnit)));
    psdWriter_1.writeUint16(writer, Math.max(1, MEASUREMENT_UNITS.indexOf(info.widthUnit)));
    psdWriter_1.writeFixedPoint32(writer, info.verticalResolution || 0);
    psdWriter_1.writeUint16(writer, Math.max(1, RESOLUTION_UNITS.indexOf(info.verticalResolutionUnit)));
    psdWriter_1.writeUint16(writer, Math.max(1, MEASUREMENT_UNITS.indexOf(info.heightUnit)));
});
var printScaleStyles = ['centered', 'size to fit', 'user defined'];
addHandler(1062, function (target) { return target.printScale !== undefined; }, function (reader, target) {
    target.printScale = {
        style: printScaleStyles[psdReader_1.readInt16(reader)],
        x: psdReader_1.readFloat32(reader),
        y: psdReader_1.readFloat32(reader),
        scale: psdReader_1.readFloat32(reader),
    };
}, function (writer, target) {
    var _a = target.printScale, style = _a.style, x = _a.x, y = _a.y, scale = _a.scale;
    psdWriter_1.writeInt16(writer, Math.max(0, printScaleStyles.indexOf(style)));
    psdWriter_1.writeFloat32(writer, x || 0);
    psdWriter_1.writeFloat32(writer, y || 0);
    psdWriter_1.writeFloat32(writer, scale || 0);
});
addHandler(1006, function (target) { return target.alphaChannelNames !== undefined; }, function (reader, target, left) {
    target.alphaChannelNames = [];
    while (left()) {
        var value = psdReader_1.readPascalString(reader, 1);
        target.alphaChannelNames.push(value);
    }
}, function (writer, target) {
    for (var _i = 0, _a = target.alphaChannelNames; _i < _a.length; _i++) {
        var name_1 = _a[_i];
        psdWriter_1.writePascalString(writer, name_1, 1);
    }
});
addHandler(1045, function (target) { return target.alphaChannelNames !== undefined; }, function (reader, target, left) {
    target.alphaChannelNames = [];
    while (left()) {
        target.alphaChannelNames.push(psdReader_1.readUnicodeString(reader));
    }
}, function (writer, target) {
    for (var _i = 0, _a = target.alphaChannelNames; _i < _a.length; _i++) {
        var name_2 = _a[_i];
        psdWriter_1.writeUnicodeStringWithPadding(writer, name_2);
    }
});
helpers_1.MOCK_HANDLERS && addHandler(1077, function (target) { return target._ir1077 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1077', left());
    target._ir1077 = psdReader_1.readBytes(reader, left());
}, function (writer, target) {
    psdWriter_1.writeBytes(writer, target._ir1077);
});
addHandler(1053, function (target) { return target.alphaIdentifiers !== undefined; }, function (reader, target, left) {
    target.alphaIdentifiers = [];
    while (left() >= 4) {
        target.alphaIdentifiers.push(psdReader_1.readUint32(reader));
    }
}, function (writer, target) {
    for (var _i = 0, _a = target.alphaIdentifiers; _i < _a.length; _i++) {
        var id = _a[_i];
        psdWriter_1.writeUint32(writer, id);
    }
});
addHandler(1010, function (target) { return target.backgroundColor !== undefined; }, function (reader, target) { return target.backgroundColor = psdReader_1.readColor(reader); }, function (writer, target) { return psdWriter_1.writeColor(writer, target.backgroundColor); });
addHandler(1037, function (target) { return target.globalAngle !== undefined; }, function (reader, target) { return target.globalAngle = psdReader_1.readUint32(reader); }, function (writer, target) { return psdWriter_1.writeUint32(writer, target.globalAngle); });
addHandler(1049, function (target) { return target.globalAltitude !== undefined; }, function (reader, target) { return target.globalAltitude = psdReader_1.readUint32(reader); }, function (writer, target) { return psdWriter_1.writeUint32(writer, target.globalAltitude); });
addHandler(1011, function (target) { return target.printFlags !== undefined; }, function (reader, target) {
    target.printFlags = {
        labels: !!psdReader_1.readUint8(reader),
        cropMarks: !!psdReader_1.readUint8(reader),
        colorBars: !!psdReader_1.readUint8(reader),
        registrationMarks: !!psdReader_1.readUint8(reader),
        negative: !!psdReader_1.readUint8(reader),
        flip: !!psdReader_1.readUint8(reader),
        interpolate: !!psdReader_1.readUint8(reader),
        caption: !!psdReader_1.readUint8(reader),
        printFlags: !!psdReader_1.readUint8(reader),
    };
}, function (writer, target) {
    var flags = target.printFlags;
    psdWriter_1.writeUint8(writer, flags.labels ? 1 : 0);
    psdWriter_1.writeUint8(writer, flags.cropMarks ? 1 : 0);
    psdWriter_1.writeUint8(writer, flags.colorBars ? 1 : 0);
    psdWriter_1.writeUint8(writer, flags.registrationMarks ? 1 : 0);
    psdWriter_1.writeUint8(writer, flags.negative ? 1 : 0);
    psdWriter_1.writeUint8(writer, flags.flip ? 1 : 0);
    psdWriter_1.writeUint8(writer, flags.interpolate ? 1 : 0);
    psdWriter_1.writeUint8(writer, flags.caption ? 1 : 0);
    psdWriter_1.writeUint8(writer, flags.printFlags ? 1 : 0);
});
helpers_1.MOCK_HANDLERS && addHandler(10000, // Print flags
function (// Print flags
target) { return target._ir10000 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 10000', left());
    target._ir10000 = psdReader_1.readBytes(reader, left());
}, function (writer, target) {
    psdWriter_1.writeBytes(writer, target._ir10000);
});
helpers_1.MOCK_HANDLERS && addHandler(1013, // Color halftoning
function (// Color halftoning
target) { return target._ir1013 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1013', left());
    target._ir1013 = psdReader_1.readBytes(reader, left());
}, function (writer, target) {
    psdWriter_1.writeBytes(writer, target._ir1013);
});
helpers_1.MOCK_HANDLERS && addHandler(1016, // Color transfer functions
function (// Color transfer functions
target) { return target._ir1016 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1016', left());
    target._ir1016 = psdReader_1.readBytes(reader, left());
}, function (writer, target) {
    psdWriter_1.writeBytes(writer, target._ir1016);
});
addHandler(1024, function (target) { return target.layerState !== undefined; }, function (reader, target) { return target.layerState = psdReader_1.readUint16(reader); }, function (writer, target) { return psdWriter_1.writeUint16(writer, target.layerState); });
addHandler(1026, function (target) { return target.layersGroup !== undefined; }, function (reader, target, left) {
    target.layersGroup = [];
    while (left()) {
        target.layersGroup.push(psdReader_1.readUint16(reader));
    }
}, function (writer, target) {
    for (var _i = 0, _a = target.layersGroup; _i < _a.length; _i++) {
        var g = _a[_i];
        psdWriter_1.writeUint16(writer, g);
    }
});
addHandler(1072, function (target) { return target.layerGroupsEnabledId !== undefined; }, function (reader, target, left) {
    target.layerGroupsEnabledId = [];
    while (left()) {
        target.layerGroupsEnabledId.push(psdReader_1.readUint8(reader));
    }
}, function (writer, target) {
    for (var _i = 0, _a = target.layerGroupsEnabledId; _i < _a.length; _i++) {
        var id = _a[_i];
        psdWriter_1.writeUint8(writer, id);
    }
});
addHandler(1069, function (target) { return target.layerSelectionIds !== undefined; }, function (reader, target) {
    var count = psdReader_1.readUint16(reader);
    target.layerSelectionIds = [];
    while (count--) {
        target.layerSelectionIds.push(psdReader_1.readUint32(reader));
    }
}, function (writer, target) {
    psdWriter_1.writeUint16(writer, target.layerSelectionIds.length);
    for (var _i = 0, _a = target.layerSelectionIds; _i < _a.length; _i++) {
        var id = _a[_i];
        psdWriter_1.writeUint32(writer, id);
    }
});
addHandler(1032, function (target) { return target.gridAndGuidesInformation !== undefined; }, function (reader, target) {
    var version = psdReader_1.readUint32(reader);
    var horizontal = psdReader_1.readUint32(reader);
    var vertical = psdReader_1.readUint32(reader);
    var count = psdReader_1.readUint32(reader);
    if (version !== 1)
        throw new Error("Invalid 1032 resource version: " + version);
    target.gridAndGuidesInformation = {
        grid: { horizontal: horizontal, vertical: vertical },
        guides: [],
    };
    for (var i = 0; i < count; i++) {
        target.gridAndGuidesInformation.guides.push({
            location: psdReader_1.readUint32(reader) / 32,
            direction: psdReader_1.readUint8(reader) ? 'horizontal' : 'vertical'
        });
    }
}, function (writer, target) {
    var info = target.gridAndGuidesInformation;
    var grid = info.grid || { horizontal: 18 * 32, vertical: 18 * 32 };
    var guides = info.guides || [];
    psdWriter_1.writeUint32(writer, 1);
    psdWriter_1.writeUint32(writer, grid.horizontal);
    psdWriter_1.writeUint32(writer, grid.vertical);
    psdWriter_1.writeUint32(writer, guides.length);
    for (var _i = 0, guides_1 = guides; _i < guides_1.length; _i++) {
        var g = guides_1[_i];
        psdWriter_1.writeUint32(writer, g.location * 32);
        psdWriter_1.writeUint8(writer, g.direction === 'horizontal' ? 1 : 0);
    }
});
addHandler(1054, function (target) { return target.urlsList !== undefined; }, function (reader, target, _, options) {
    var count = psdReader_1.readUint32(reader);
    if (count) {
        if (!options.throwForMissingFeatures)
            return;
        throw new Error('Not implemented: URL List');
    }
    // TODO: read actual URL list
    target.urlsList = [];
}, function (writer, target) {
    psdWriter_1.writeUint32(writer, target.urlsList.length);
    // TODO: write actual URL list
    if (target.urlsList.length) {
        throw new Error('Not implemented: URL List');
    }
});
helpers_1.MOCK_HANDLERS && addHandler(1050, // Slices
function (// Slices
target) { return target._ir1050 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1050', left());
    target._ir1050 = psdReader_1.readBytes(reader, left());
}, function (writer, target) {
    psdWriter_1.writeBytes(writer, target._ir1050);
});
addHandler(1064, function (target) { return target.pixelAspectRatio !== undefined; }, function (reader, target) {
    if (psdReader_1.readUint32(reader) > 2)
        throw new Error('Invalid pixelAspectRatio version');
    target.pixelAspectRatio = { aspect: psdReader_1.readFloat64(reader) };
}, function (writer, target) {
    psdWriter_1.writeUint32(writer, 2); // version
    psdWriter_1.writeFloat64(writer, target.pixelAspectRatio.aspect);
});
addHandler(1041, function (target) { return target.iccUntaggedProfile !== undefined; }, function (reader, target) {
    target.iccUntaggedProfile = !!psdReader_1.readUint8(reader);
}, function (writer, target) {
    psdWriter_1.writeUint8(writer, target.iccUntaggedProfile ? 1 : 0);
});
addHandler(1039, // ICC Profile
function (// ICC Profile
target) { return target._ir1039 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1039', left());
    target._ir1039 = psdReader_1.readBytes(reader, left());
}, function (writer, target) {
    psdWriter_1.writeBytes(writer, target._ir1039);
});
addHandler(1044, function (target) { return target.idsSeedNumber !== undefined; }, function (reader, target) { return target.idsSeedNumber = psdReader_1.readUint32(reader); }, function (writer, target) { return psdWriter_1.writeUint32(writer, target.idsSeedNumber); });
addHandler(1036, function (target) { return target.thumbnail !== undefined || target.thumbnailRaw !== undefined; }, function (reader, target, left, options) {
    var format = psdReader_1.readUint32(reader); // 1 = kJpegRGB, 0 = kRawRGB
    var width = psdReader_1.readUint32(reader);
    var height = psdReader_1.readUint32(reader);
    psdReader_1.readUint32(reader); // widthBytes = (width * bits_per_pixel + 31) / 32 * 4.
    psdReader_1.readUint32(reader); // totalSize = widthBytes * height * planes
    psdReader_1.readUint32(reader); // sizeAfterCompression
    var bitsPerPixel = psdReader_1.readUint16(reader); // 24
    var planes = psdReader_1.readUint16(reader); // 1
    if (format !== 1 || bitsPerPixel !== 24 || planes !== 1) {
        options.logMissingFeatures && console.log("Invalid thumbnail data (format: " + format + ", bitsPerPixel: " + bitsPerPixel + ", planes: " + planes + ")");
        psdReader_1.skipBytes(reader, left());
        return;
    }
    var size = left();
    var data = psdReader_1.readBytes(reader, size);
    if (options.useRawThumbnail) {
        target.thumbnailRaw = { width: width, height: height, data: data };
    }
    else {
        target.thumbnail = helpers_1.createCanvasFromData(data);
    }
}, function (writer, target) {
    var width = 0;
    var height = 0;
    var data;
    if (target.thumbnailRaw) {
        width = target.thumbnailRaw.width;
        height = target.thumbnailRaw.height;
        data = target.thumbnailRaw.data;
    }
    else {
        if (!target.thumbnail)
            throw new Error('Missing thumbnail');
        width = target.thumbnail.width;
        height = target.thumbnail.height;
        data = base64_js_1.toByteArray(target.thumbnail.toDataURL('image/jpeg', 1).substr('data:image/jpeg;base64,'.length));
    }
    var bitsPerPixel = 24;
    var widthBytes = Math.floor((width * bitsPerPixel + 31) / 32) * 4;
    var planes = 1;
    var totalSize = widthBytes * height * planes;
    var sizeAfterCompression = data.length;
    psdWriter_1.writeUint32(writer, 1); // 1 = kJpegRGB
    psdWriter_1.writeUint32(writer, width);
    psdWriter_1.writeUint32(writer, height);
    psdWriter_1.writeUint32(writer, widthBytes);
    psdWriter_1.writeUint32(writer, totalSize);
    psdWriter_1.writeUint32(writer, sizeAfterCompression);
    psdWriter_1.writeUint16(writer, bitsPerPixel);
    psdWriter_1.writeUint16(writer, planes);
    psdWriter_1.writeBytes(writer, data);
});
addHandler(1057, function (target) { return target.versionInfo !== undefined; }, function (reader, target, left) {
    var version = psdReader_1.readUint32(reader);
    if (version !== 1)
        throw new Error('Invalid versionInfo version');
    target.versionInfo = {
        hasRealMergedData: !!psdReader_1.readUint8(reader),
        writerName: psdReader_1.readUnicodeString(reader),
        readerName: psdReader_1.readUnicodeString(reader),
        fileVersion: psdReader_1.readUint32(reader),
    };
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    var versionInfo = target.versionInfo;
    psdWriter_1.writeUint32(writer, 1); // version
    psdWriter_1.writeUint8(writer, versionInfo.hasRealMergedData ? 1 : 0);
    psdWriter_1.writeUnicodeString(writer, versionInfo.writerName);
    psdWriter_1.writeUnicodeString(writer, versionInfo.readerName);
    psdWriter_1.writeUint32(writer, versionInfo.fileVersion);
});
helpers_1.MOCK_HANDLERS && addHandler(1058, // EXIF data 1.
function (// EXIF data 1.
target) { return target._ir1058 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1058', left());
    target._ir1058 = psdReader_1.readBytes(reader, left());
}, function (writer, target) {
    psdWriter_1.writeBytes(writer, target._ir1058);
});
addHandler(7000, function (target) { return target.imageReadyVariables !== undefined; }, function (reader, target, left) {
    target.imageReadyVariables = readUtf8String(reader, left());
}, function (writer, target) {
    writeUtf8String(writer, target.imageReadyVariables);
});
addHandler(7001, function (target) { return target.imageReadyDataSets !== undefined; }, function (reader, target, left) {
    target.imageReadyDataSets = readUtf8String(reader, left());
}, function (writer, target) {
    writeUtf8String(writer, target.imageReadyDataSets);
});
addHandler(1088, function (target) { return target.pathSelectionState !== undefined; }, function (reader, target, _left) {
    var desc = descriptor_1.readVersionAndDescriptor(reader);
    // console.log(require('util').inspect(desc, false, 99, true));
    target.pathSelectionState = desc['null'];
}, function (writer, target) {
    var desc = { 'null': target.pathSelectionState };
    descriptor_1.writeVersionAndDescriptor(writer, '', 'null', desc);
});
helpers_1.MOCK_HANDLERS && addHandler(1025, function (target) { return target._ir1025 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1025', left());
    target._ir1025 = psdReader_1.readBytes(reader, left());
}, function (writer, target) {
    psdWriter_1.writeBytes(writer, target._ir1025);
});
var FrmD = helpers_1.createEnum('FrmD', '', {
    auto: 'Auto',
    none: 'None',
    dispose: 'Disp',
});
// TODO: Unfinished
helpers_1.MOCK_HANDLERS && addHandler(4000, // Plug-In resource(s)
function (// Plug-In resource(s)
target) { return target._ir4000 !== undefined; }, function (reader, target, left, _a) {
    var logMissingFeatures = _a.logMissingFeatures, logDevFeatures = _a.logDevFeatures;
    if (helpers_1.MOCK_HANDLERS) {
        LOG_MOCK_HANDLERS && console.log('image resource 4000', left());
        target._ir4000 = psdReader_1.readBytes(reader, left());
        return;
    }
    var key = psdReader_1.readSignature(reader);
    if (key === 'mani') {
        psdReader_1.checkSignature(reader, 'IRFR');
        psdReader_1.readSection(reader, 1, function (left) {
            var _loop_1 = function () {
                psdReader_1.checkSignature(reader, '8BIM');
                var key_1 = psdReader_1.readSignature(reader);
                psdReader_1.readSection(reader, 1, function (left) {
                    if (key_1 === 'AnDs') {
                        var desc = descriptor_1.readVersionAndDescriptor(reader);
                        // console.log('AnDs', desc);
                        logDevFeatures && console.log('#4000 AnDs', desc);
                        // logDevFeatures && console.log('#4000 AnDs', require('util').inspect(desc, false, 99, true));
                        var result = {
                            // desc.AFSt ???
                            frames: desc.FrIn.map(function (x) { return ({
                                id: x.FrID,
                                delay: x.FrDl / 100,
                                dispose: x.FrDs ? FrmD.decode(x.FrDs) : 'auto', // missing == auto
                                // x.FrGA ???
                            }); }),
                            animations: desc.FSts.map(function (x) { return ({
                                id: x.FsID,
                                frames: x.FsFr,
                                repeats: x.LCnt,
                                // x.AFrm ???
                            }); }),
                        };
                        logDevFeatures && console.log('#4000 AnDs:result', result);
                        // logDevFeatures && console.log('#4000 AnDs:result', require('util').inspect(result, false, 99, true));
                    }
                    else if (key_1 === 'Roll') {
                        var bytes = psdReader_1.readBytes(reader, left());
                        logDevFeatures && console.log('#4000 Roll', bytes);
                    }
                    else {
                        logMissingFeatures && console.log('Unhandled subsection in #4000', key_1);
                    }
                });
            };
            while (left()) {
                _loop_1();
            }
        });
    }
    else if (key === 'mopt') {
        var bytes = psdReader_1.readBytes(reader, left());
        logDevFeatures && console.log('#4000 mopt', bytes);
    }
    else {
        logMissingFeatures && console.log('Unhandled key in #4000:', key);
        return;
    }
}, function (writer, target) {
    psdWriter_1.writeBytes(writer, target._ir4000);
});
// TODO: Unfinished
helpers_1.MOCK_HANDLERS && addHandler(4001, // Plug-In resource(s)
function (// Plug-In resource(s)
target) { return target._ir4001 !== undefined; }, function (reader, target, left, _a) {
    var logMissingFeatures = _a.logMissingFeatures, logDevFeatures = _a.logDevFeatures;
    if (helpers_1.MOCK_HANDLERS) {
        LOG_MOCK_HANDLERS && console.log('image resource 4001', left());
        target._ir4001 = psdReader_1.readBytes(reader, left());
        return;
    }
    var key = psdReader_1.readSignature(reader);
    if (key === 'mfri') {
        var version = psdReader_1.readUint32(reader);
        if (version !== 2)
            throw new Error('Invalid mfri version');
        var length_1 = psdReader_1.readUint32(reader);
        var bytes = psdReader_1.readBytes(reader, length_1);
        logDevFeatures && console.log('mfri', bytes);
    }
    else if (key === 'mset') {
        var desc = descriptor_1.readVersionAndDescriptor(reader);
        logDevFeatures && console.log('mset', desc);
    }
    else {
        logMissingFeatures && console.log('Unhandled key in #4001', key);
    }
}, function (writer, target) {
    psdWriter_1.writeBytes(writer, target._ir4001);
});
// TODO: Unfinished
helpers_1.MOCK_HANDLERS && addHandler(4002, // Plug-In resource(s)
function (// Plug-In resource(s)
target) { return target._ir4002 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 4002', left());
    target._ir4002 = psdReader_1.readBytes(reader, left());
}, function (writer, target) {
    psdWriter_1.writeBytes(writer, target._ir4002);
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LHNCQUFVLENBQUMsTUFBTSxFQUFHLE1BQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQ0QsQ0FBQztBQUVGLG1CQUFtQjtBQUNuQix1QkFBYSxJQUFJLFVBQVUsQ0FDMUIsSUFBSSxFQUFFLHNCQUFzQjtBQUM1QixVQURNLHNCQUFzQjtBQUM1QixNQUFNLElBQUksT0FBQyxNQUFjLENBQUMsT0FBTyxLQUFLLFNBQVMsRUFBckMsQ0FBcUMsRUFDL0MsVUFBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUk7SUFDcEIsaUJBQWlCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQy9ELE1BQWMsQ0FBQyxPQUFPLEdBQUcscUJBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUNyRCxDQUFDLEVBQ0QsVUFBQyxNQUFNLEVBQUUsTUFBTTtJQUNkLHNCQUFVLENBQUMsTUFBTSxFQUFHLE1BQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQ0QsQ0FBQyIsImZpbGUiOiJpbWFnZVJlc291cmNlcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHRvQnl0ZUFycmF5IH0gZnJvbSAnYmFzZTY0LWpzJztcbmltcG9ydCB7IEltYWdlUmVzb3VyY2VzLCBSZWFkT3B0aW9ucywgUmVuZGVyaW5nSW50ZW50IH0gZnJvbSAnLi9wc2QnO1xuaW1wb3J0IHtcblx0UHNkUmVhZGVyLCByZWFkUGFzY2FsU3RyaW5nLCByZWFkVW5pY29kZVN0cmluZywgcmVhZFVpbnQzMiwgcmVhZFVpbnQxNiwgcmVhZFVpbnQ4LCByZWFkRmxvYXQ2NCxcblx0cmVhZEJ5dGVzLCBza2lwQnl0ZXMsIHJlYWRGbG9hdDMyLCByZWFkSW50MTYsIHJlYWRGaXhlZFBvaW50MzIsIHJlYWRTaWduYXR1cmUsIGNoZWNrU2lnbmF0dXJlLFxuXHRyZWFkU2VjdGlvbiwgcmVhZENvbG9yXG59IGZyb20gJy4vcHNkUmVhZGVyJztcbmltcG9ydCB7XG5cdFBzZFdyaXRlciwgd3JpdGVQYXNjYWxTdHJpbmcsIHdyaXRlVW5pY29kZVN0cmluZywgd3JpdGVVaW50MzIsIHdyaXRlVWludDgsIHdyaXRlRmxvYXQ2NCwgd3JpdGVVaW50MTYsXG5cdHdyaXRlQnl0ZXMsIHdyaXRlSW50MTYsIHdyaXRlRmxvYXQzMiwgd3JpdGVGaXhlZFBvaW50MzIsIHdyaXRlVW5pY29kZVN0cmluZ1dpdGhQYWRkaW5nLCB3cml0ZUNvbG9yLFxufSBmcm9tICcuL3BzZFdyaXRlcic7XG5pbXBvcnQgeyBjcmVhdGVDYW52YXNGcm9tRGF0YSwgY3JlYXRlRW51bSwgTU9DS19IQU5ETEVSUyB9IGZyb20gJy4vaGVscGVycyc7XG5pbXBvcnQgeyBkZWNvZGVTdHJpbmcsIGVuY29kZVN0cmluZyB9IGZyb20gJy4vdXRmOCc7XG5pbXBvcnQgeyByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IsIHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3IgfSBmcm9tICcuL2Rlc2NyaXB0b3InO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJlc291cmNlSGFuZGxlciB7XG5cdGtleTogbnVtYmVyO1xuXHRoYXM6ICh0YXJnZXQ6IEltYWdlUmVzb3VyY2VzKSA9PiBib29sZWFuO1xuXHRyZWFkOiAocmVhZGVyOiBQc2RSZWFkZXIsIHRhcmdldDogSW1hZ2VSZXNvdXJjZXMsIGxlZnQ6ICgpID0+IG51bWJlciwgb3B0aW9uczogUmVhZE9wdGlvbnMpID0+IHZvaWQ7XG5cdHdyaXRlOiAod3JpdGVyOiBQc2RXcml0ZXIsIHRhcmdldDogSW1hZ2VSZXNvdXJjZXMpID0+IHZvaWQ7XG59XG5cbmV4cG9ydCBjb25zdCByZXNvdXJjZUhhbmRsZXJzOiBSZXNvdXJjZUhhbmRsZXJbXSA9IFtdO1xuZXhwb3J0IGNvbnN0IHJlc291cmNlSGFuZGxlcnNNYXA6IHsgW2tleTogbnVtYmVyXTogUmVzb3VyY2VIYW5kbGVyIH0gPSB7fTtcblxuZnVuY3Rpb24gYWRkSGFuZGxlcihcblx0a2V5OiBudW1iZXIsXG5cdGhhczogKHRhcmdldDogSW1hZ2VSZXNvdXJjZXMpID0+IGJvb2xlYW4sXG5cdHJlYWQ6IChyZWFkZXI6IFBzZFJlYWRlciwgdGFyZ2V0OiBJbWFnZVJlc291cmNlcywgbGVmdDogKCkgPT4gbnVtYmVyLCBvcHRpb25zOiBSZWFkT3B0aW9ucykgPT4gdm9pZCxcblx0d3JpdGU6ICh3cml0ZXI6IFBzZFdyaXRlciwgdGFyZ2V0OiBJbWFnZVJlc291cmNlcykgPT4gdm9pZCxcbikge1xuXHRjb25zdCBoYW5kbGVyOiBSZXNvdXJjZUhhbmRsZXIgPSB7IGtleSwgaGFzLCByZWFkLCB3cml0ZSB9O1xuXHRyZXNvdXJjZUhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG5cdHJlc291cmNlSGFuZGxlcnNNYXBbaGFuZGxlci5rZXldID0gaGFuZGxlcjtcbn1cblxuY29uc3QgTE9HX01PQ0tfSEFORExFUlMgPSBmYWxzZTtcbmNvbnN0IFJFU09MVVRJT05fVU5JVFMgPSBbdW5kZWZpbmVkLCAnUFBJJywgJ1BQQ00nXTtcbmNvbnN0IE1FQVNVUkVNRU5UX1VOSVRTID0gW3VuZGVmaW5lZCwgJ0luY2hlcycsICdDZW50aW1ldGVycycsICdQb2ludHMnLCAnUGljYXMnLCAnQ29sdW1ucyddO1xuY29uc3QgaGV4ID0gJzAxMjM0NTY3ODlhYmNkZWYnO1xuXG5mdW5jdGlvbiBjaGFyVG9OaWJibGUoY29kZTogbnVtYmVyKSB7XG5cdHJldHVybiBjb2RlIDw9IDU3ID8gY29kZSAtIDQ4IDogY29kZSAtIDg3O1xufVxuXG5mdW5jdGlvbiBieXRlQXQodmFsdWU6IHN0cmluZywgaW5kZXg6IG51bWJlcikge1xuXHRyZXR1cm4gKGNoYXJUb05pYmJsZSh2YWx1ZS5jaGFyQ29kZUF0KGluZGV4KSkgPDwgNCkgfCBjaGFyVG9OaWJibGUodmFsdWUuY2hhckNvZGVBdChpbmRleCArIDEpKTtcbn1cblxuZnVuY3Rpb24gcmVhZFV0ZjhTdHJpbmcocmVhZGVyOiBQc2RSZWFkZXIsIGxlbmd0aDogbnVtYmVyKSB7XG5cdGNvbnN0IGJ1ZmZlciA9IHJlYWRCeXRlcyhyZWFkZXIsIGxlbmd0aCk7XG5cdHJldHVybiBkZWNvZGVTdHJpbmcoYnVmZmVyKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVVdGY4U3RyaW5nKHdyaXRlcjogUHNkV3JpdGVyLCB2YWx1ZTogc3RyaW5nKSB7XG5cdGNvbnN0IGJ1ZmZlciA9IGVuY29kZVN0cmluZyh2YWx1ZSk7XG5cdHdyaXRlQnl0ZXMod3JpdGVyLCBidWZmZXIpO1xufVxuXG5NT0NLX0hBTkRMRVJTICYmIGFkZEhhbmRsZXIoXG5cdDEwMjgsIC8vIElQVEMtTkFBIHJlY29yZFxuXHR0YXJnZXQgPT4gKHRhcmdldCBhcyBhbnkpLl9pcjEwMjggIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0TE9HX01PQ0tfSEFORExFUlMgJiYgY29uc29sZS5sb2coJ2ltYWdlIHJlc291cmNlIDEwMjgnLCBsZWZ0KCkpO1xuXHRcdCh0YXJnZXQgYXMgYW55KS5faXIxMDI4ID0gcmVhZEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVCeXRlcyh3cml0ZXIsICh0YXJnZXQgYXMgYW55KS5faXIxMDI4KTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDEwNjEsXG5cdHRhcmdldCA9PiB0YXJnZXQuY2FwdGlvbkRpZ2VzdCAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHtcblx0XHRsZXQgY2FwdGlvbkRpZ2VzdCA9ICcnO1xuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCAxNjsgaSsrKSB7XG5cdFx0XHRjb25zdCBieXRlID0gcmVhZFVpbnQ4KHJlYWRlcik7XG5cdFx0XHRjYXB0aW9uRGlnZXN0ICs9IGhleFtieXRlID4+IDRdO1xuXHRcdFx0Y2FwdGlvbkRpZ2VzdCArPSBoZXhbYnl0ZSAmIDB4Zl07XG5cdFx0fVxuXG5cdFx0dGFyZ2V0LmNhcHRpb25EaWdlc3QgPSBjYXB0aW9uRGlnZXN0O1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IDE2OyBpKyspIHtcblx0XHRcdHdyaXRlVWludDgod3JpdGVyLCBieXRlQXQodGFyZ2V0LmNhcHRpb25EaWdlc3QhLCBpICogMikpO1xuXHRcdH1cblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDEwNjAsXG5cdHRhcmdldCA9PiB0YXJnZXQueG1wTWV0YWRhdGEgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB0YXJnZXQueG1wTWV0YWRhdGEgPSByZWFkVXRmOFN0cmluZyhyZWFkZXIsIGxlZnQoKSksXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4gd3JpdGVVdGY4U3RyaW5nKHdyaXRlciwgdGFyZ2V0LnhtcE1ldGFkYXRhISksXG4pO1xuXG5jb25zdCBJbnRlID0gY3JlYXRlRW51bTxSZW5kZXJpbmdJbnRlbnQ+KCdJbnRlJywgJ3BlcmNlcHR1YWwnLCB7XG5cdCdwZXJjZXB0dWFsJzogJ0ltZyAnLFxuXHQnc2F0dXJhdGlvbic6ICdHcnAgJyxcblx0J3JlbGF0aXZlIGNvbG9yaW1ldHJpYyc6ICdDbHJtJyxcblx0J2Fic29sdXRlIGNvbG9yaW1ldHJpYyc6ICdBQ2xyJyxcbn0pO1xuXG5pbnRlcmZhY2UgUHJpbnRJbmZvcm1hdGlvbkRlc2NyaXB0b3Ige1xuXHQnTm0gICc/OiBzdHJpbmc7XG5cdENsclM/OiBzdHJpbmc7XG5cdFBzdFM/OiBib29sZWFuO1xuXHRNcEJsPzogYm9vbGVhbjtcblx0SW50ZT86IHN0cmluZztcblx0aGFyZFByb29mPzogYm9vbGVhbjtcblx0cHJpbnRTaXh0ZWVuQml0PzogYm9vbGVhbjtcblx0cHJpbnRlck5hbWU/OiBzdHJpbmc7XG5cdHByaW50UHJvb2ZTZXR1cD86IHtcblx0XHRCbHRuOiBzdHJpbmc7XG5cdH0gfCB7XG5cdFx0cHJvZmlsZTogc3RyaW5nO1xuXHRcdEludGU6IHN0cmluZztcblx0XHRNcEJsOiBib29sZWFuO1xuXHRcdHBhcGVyV2hpdGU6IGJvb2xlYW47XG5cdH07XG59XG5cbmFkZEhhbmRsZXIoXG5cdDEwODIsXG5cdHRhcmdldCA9PiB0YXJnZXQucHJpbnRJbmZvcm1hdGlvbiAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBkZXNjOiBQcmludEluZm9ybWF0aW9uRGVzY3JpcHRvciA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpO1xuXG5cdFx0dGFyZ2V0LnByaW50SW5mb3JtYXRpb24gPSB7XG5cdFx0XHRwcmludGVyTmFtZTogZGVzYy5wcmludGVyTmFtZSB8fCAnJyxcblx0XHRcdHJlbmRlcmluZ0ludGVudDogSW50ZS5kZWNvZGUoZGVzYy5JbnRlID8/ICdJbnRlLkltZyAnKSxcblx0XHR9O1xuXG5cdFx0Y29uc3QgaW5mbyA9IHRhcmdldC5wcmludEluZm9ybWF0aW9uO1xuXG5cdFx0aWYgKGRlc2MuUHN0UyAhPT0gdW5kZWZpbmVkKSBpbmZvLnByaW50ZXJNYW5hZ2VzQ29sb3JzID0gZGVzYy5Qc3RTO1xuXHRcdGlmIChkZXNjWydObSAgJ10gIT09IHVuZGVmaW5lZCkgaW5mby5wcmludGVyUHJvZmlsZSA9IGRlc2NbJ05tICAnXTtcblx0XHRpZiAoZGVzYy5NcEJsICE9PSB1bmRlZmluZWQpIGluZm8uYmxhY2tQb2ludENvbXBlbnNhdGlvbiA9IGRlc2MuTXBCbDtcblx0XHRpZiAoZGVzYy5wcmludFNpeHRlZW5CaXQgIT09IHVuZGVmaW5lZCkgaW5mby5wcmludFNpeHRlZW5CaXQgPSBkZXNjLnByaW50U2l4dGVlbkJpdDtcblx0XHRpZiAoZGVzYy5oYXJkUHJvb2YgIT09IHVuZGVmaW5lZCkgaW5mby5oYXJkUHJvb2YgPSBkZXNjLmhhcmRQcm9vZjtcblx0XHRpZiAoZGVzYy5wcmludFByb29mU2V0dXApIHtcblx0XHRcdGlmICgnQmx0bicgaW4gZGVzYy5wcmludFByb29mU2V0dXApIHtcblx0XHRcdFx0aW5mby5wcm9vZlNldHVwID0geyBidWlsdGluOiBkZXNjLnByaW50UHJvb2ZTZXR1cC5CbHRuLnNwbGl0KCcuJylbMV0gfTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGluZm8ucHJvb2ZTZXR1cCA9IHtcblx0XHRcdFx0XHRwcm9maWxlOiBkZXNjLnByaW50UHJvb2ZTZXR1cC5wcm9maWxlLFxuXHRcdFx0XHRcdHJlbmRlcmluZ0ludGVudDogSW50ZS5kZWNvZGUoZGVzYy5wcmludFByb29mU2V0dXAuSW50ZSA/PyAnSW50ZS5JbWcgJyksXG5cdFx0XHRcdFx0YmxhY2tQb2ludENvbXBlbnNhdGlvbjogISFkZXNjLnByaW50UHJvb2ZTZXR1cC5NcEJsLFxuXHRcdFx0XHRcdHBhcGVyV2hpdGU6ICEhZGVzYy5wcmludFByb29mU2V0dXAucGFwZXJXaGl0ZSxcblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGluZm8gPSB0YXJnZXQucHJpbnRJbmZvcm1hdGlvbiE7XG5cdFx0Y29uc3QgZGVzYzogUHJpbnRJbmZvcm1hdGlvbkRlc2NyaXB0b3IgPSB7fTtcblxuXHRcdGlmIChpbmZvLnByaW50ZXJNYW5hZ2VzQ29sb3JzKSB7XG5cdFx0XHRkZXNjLlBzdFMgPSB0cnVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoaW5mby5oYXJkUHJvb2YgIT09IHVuZGVmaW5lZCkgZGVzYy5oYXJkUHJvb2YgPSAhIWluZm8uaGFyZFByb29mO1xuXHRcdFx0ZGVzYy5DbHJTID0gJ0NsclMuUkdCQyc7IC8vIFRPRE86ID8/P1xuXHRcdFx0ZGVzY1snTm0gICddID0gaW5mby5wcmludGVyUHJvZmlsZSA/PyAnQ0lFIFJHQic7XG5cdFx0fVxuXG5cdFx0ZGVzYy5JbnRlID0gSW50ZS5lbmNvZGUoaW5mby5yZW5kZXJpbmdJbnRlbnQpO1xuXG5cdFx0aWYgKCFpbmZvLnByaW50ZXJNYW5hZ2VzQ29sb3JzKSBkZXNjLk1wQmwgPSAhIWluZm8uYmxhY2tQb2ludENvbXBlbnNhdGlvbjtcblxuXHRcdGRlc2MucHJpbnRTaXh0ZWVuQml0ID0gISFpbmZvLnByaW50U2l4dGVlbkJpdDtcblx0XHRkZXNjLnByaW50ZXJOYW1lID0gaW5mby5wcmludGVyTmFtZSB8fCAnJztcblxuXHRcdGlmIChpbmZvLnByb29mU2V0dXAgJiYgJ3Byb2ZpbGUnIGluIGluZm8ucHJvb2ZTZXR1cCkge1xuXHRcdFx0ZGVzYy5wcmludFByb29mU2V0dXAgPSB7XG5cdFx0XHRcdHByb2ZpbGU6IGluZm8ucHJvb2ZTZXR1cC5wcm9maWxlIHx8ICcnLFxuXHRcdFx0XHRJbnRlOiBJbnRlLmVuY29kZShpbmZvLnByb29mU2V0dXAucmVuZGVyaW5nSW50ZW50KSxcblx0XHRcdFx0TXBCbDogISFpbmZvLnByb29mU2V0dXAuYmxhY2tQb2ludENvbXBlbnNhdGlvbixcblx0XHRcdFx0cGFwZXJXaGl0ZTogISFpbmZvLnByb29mU2V0dXAucGFwZXJXaGl0ZSxcblx0XHRcdH07XG5cdFx0fSBlbHNlIHtcblx0XHRcdGRlc2MucHJpbnRQcm9vZlNldHVwID0ge1xuXHRcdFx0XHRCbHRuOiBpbmZvLnByb29mU2V0dXA/LmJ1aWx0aW4gPyBgYnVpbHRpblByb29mLiR7aW5mby5wcm9vZlNldHVwLmJ1aWx0aW59YCA6ICdidWlsdGluUHJvb2YucHJvb2ZDTVlLJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAncHJpbnRPdXRwdXQnLCBkZXNjKTtcblx0fSxcbik7XG5cbk1PQ0tfSEFORExFUlMgJiYgYWRkSGFuZGxlcihcblx0MTA4MywgLy8gUHJpbnQgc3R5bGVcblx0dGFyZ2V0ID0+ICh0YXJnZXQgYXMgYW55KS5faXIxMDgzICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdExPR19NT0NLX0hBTkRMRVJTICYmIGNvbnNvbGUubG9nKCdpbWFnZSByZXNvdXJjZSAxMDgzJywgbGVmdCgpKTtcblx0XHQodGFyZ2V0IGFzIGFueSkuX2lyMTA4MyA9IHJlYWRCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cblx0XHQvLyBUT0RPOlxuXHRcdC8vIGNvbnN0IGRlc2MgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKTtcblx0XHQvLyBjb25zb2xlLmxvZygnMTA4MycsIHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KGRlc2MsIGZhbHNlLCA5OSwgdHJ1ZSkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHR3cml0ZUJ5dGVzKHdyaXRlciwgKHRhcmdldCBhcyBhbnkpLl9pcjEwODMpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0MTAwNSxcblx0dGFyZ2V0ID0+IHRhcmdldC5yZXNvbHV0aW9uSW5mbyAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBob3Jpem9udGFsUmVzb2x1dGlvbiA9IHJlYWRGaXhlZFBvaW50MzIocmVhZGVyKTtcblx0XHRjb25zdCBob3Jpem9udGFsUmVzb2x1dGlvblVuaXQgPSByZWFkVWludDE2KHJlYWRlcik7XG5cdFx0Y29uc3Qgd2lkdGhVbml0ID0gcmVhZFVpbnQxNihyZWFkZXIpO1xuXHRcdGNvbnN0IHZlcnRpY2FsUmVzb2x1dGlvbiA9IHJlYWRGaXhlZFBvaW50MzIocmVhZGVyKTtcblx0XHRjb25zdCB2ZXJ0aWNhbFJlc29sdXRpb25Vbml0ID0gcmVhZFVpbnQxNihyZWFkZXIpO1xuXHRcdGNvbnN0IGhlaWdodFVuaXQgPSByZWFkVWludDE2KHJlYWRlcik7XG5cblx0XHR0YXJnZXQucmVzb2x1dGlvbkluZm8gPSB7XG5cdFx0XHRob3Jpem9udGFsUmVzb2x1dGlvbixcblx0XHRcdGhvcml6b250YWxSZXNvbHV0aW9uVW5pdDogUkVTT0xVVElPTl9VTklUU1tob3Jpem9udGFsUmVzb2x1dGlvblVuaXRdIHx8ICdQUEknIGFzIGFueSxcblx0XHRcdHdpZHRoVW5pdDogTUVBU1VSRU1FTlRfVU5JVFNbd2lkdGhVbml0XSB8fCAnSW5jaGVzJyBhcyBhbnksXG5cdFx0XHR2ZXJ0aWNhbFJlc29sdXRpb24sXG5cdFx0XHR2ZXJ0aWNhbFJlc29sdXRpb25Vbml0OiBSRVNPTFVUSU9OX1VOSVRTW3ZlcnRpY2FsUmVzb2x1dGlvblVuaXRdIHx8ICdQUEknIGFzIGFueSxcblx0XHRcdGhlaWdodFVuaXQ6IE1FQVNVUkVNRU5UX1VOSVRTW2hlaWdodFVuaXRdIHx8ICdJbmNoZXMnIGFzIGFueSxcblx0XHR9O1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBpbmZvID0gdGFyZ2V0LnJlc29sdXRpb25JbmZvITtcblxuXHRcdHdyaXRlRml4ZWRQb2ludDMyKHdyaXRlciwgaW5mby5ob3Jpem9udGFsUmVzb2x1dGlvbiB8fCAwKTtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIE1hdGgubWF4KDEsIFJFU09MVVRJT05fVU5JVFMuaW5kZXhPZihpbmZvLmhvcml6b250YWxSZXNvbHV0aW9uVW5pdCkpKTtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIE1hdGgubWF4KDEsIE1FQVNVUkVNRU5UX1VOSVRTLmluZGV4T2YoaW5mby53aWR0aFVuaXQpKSk7XG5cdFx0d3JpdGVGaXhlZFBvaW50MzIod3JpdGVyLCBpbmZvLnZlcnRpY2FsUmVzb2x1dGlvbiB8fCAwKTtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIE1hdGgubWF4KDEsIFJFU09MVVRJT05fVU5JVFMuaW5kZXhPZihpbmZvLnZlcnRpY2FsUmVzb2x1dGlvblVuaXQpKSk7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBNYXRoLm1heCgxLCBNRUFTVVJFTUVOVF9VTklUUy5pbmRleE9mKGluZm8uaGVpZ2h0VW5pdCkpKTtcblx0fSxcbik7XG5cbmNvbnN0IHByaW50U2NhbGVTdHlsZXMgPSBbJ2NlbnRlcmVkJywgJ3NpemUgdG8gZml0JywgJ3VzZXIgZGVmaW5lZCddO1xuXG5hZGRIYW5kbGVyKFxuXHQxMDYyLFxuXHR0YXJnZXQgPT4gdGFyZ2V0LnByaW50U2NhbGUgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0dGFyZ2V0LnByaW50U2NhbGUgPSB7XG5cdFx0XHRzdHlsZTogcHJpbnRTY2FsZVN0eWxlc1tyZWFkSW50MTYocmVhZGVyKV0gYXMgYW55LFxuXHRcdFx0eDogcmVhZEZsb2F0MzIocmVhZGVyKSxcblx0XHRcdHk6IHJlYWRGbG9hdDMyKHJlYWRlciksXG5cdFx0XHRzY2FsZTogcmVhZEZsb2F0MzIocmVhZGVyKSxcblx0XHR9O1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCB7IHN0eWxlLCB4LCB5LCBzY2FsZSB9ID0gdGFyZ2V0LnByaW50U2NhbGUhO1xuXHRcdHdyaXRlSW50MTYod3JpdGVyLCBNYXRoLm1heCgwLCBwcmludFNjYWxlU3R5bGVzLmluZGV4T2Yoc3R5bGUhKSkpO1xuXHRcdHdyaXRlRmxvYXQzMih3cml0ZXIsIHggfHwgMCk7XG5cdFx0d3JpdGVGbG9hdDMyKHdyaXRlciwgeSB8fCAwKTtcblx0XHR3cml0ZUZsb2F0MzIod3JpdGVyLCBzY2FsZSB8fCAwKTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDEwMDYsXG5cdHRhcmdldCA9PiB0YXJnZXQuYWxwaGFDaGFubmVsTmFtZXMgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0dGFyZ2V0LmFscGhhQ2hhbm5lbE5hbWVzID0gW107XG5cblx0XHR3aGlsZSAobGVmdCgpKSB7XG5cdFx0XHRjb25zdCB2YWx1ZSA9IHJlYWRQYXNjYWxTdHJpbmcocmVhZGVyLCAxKTtcblx0XHRcdHRhcmdldC5hbHBoYUNoYW5uZWxOYW1lcy5wdXNoKHZhbHVlKTtcblx0XHR9XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGZvciAoY29uc3QgbmFtZSBvZiB0YXJnZXQuYWxwaGFDaGFubmVsTmFtZXMhKSB7XG5cdFx0XHR3cml0ZVBhc2NhbFN0cmluZyh3cml0ZXIsIG5hbWUsIDEpO1xuXHRcdH1cblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDEwNDUsXG5cdHRhcmdldCA9PiB0YXJnZXQuYWxwaGFDaGFubmVsTmFtZXMgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0dGFyZ2V0LmFscGhhQ2hhbm5lbE5hbWVzID0gW107XG5cblx0XHR3aGlsZSAobGVmdCgpKSB7XG5cdFx0XHR0YXJnZXQuYWxwaGFDaGFubmVsTmFtZXMucHVzaChyZWFkVW5pY29kZVN0cmluZyhyZWFkZXIpKTtcblx0XHR9XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGZvciAoY29uc3QgbmFtZSBvZiB0YXJnZXQuYWxwaGFDaGFubmVsTmFtZXMhKSB7XG5cdFx0XHR3cml0ZVVuaWNvZGVTdHJpbmdXaXRoUGFkZGluZyh3cml0ZXIsIG5hbWUpO1xuXHRcdH1cblx0fSxcbik7XG5cbk1PQ0tfSEFORExFUlMgJiYgYWRkSGFuZGxlcihcblx0MTA3Nyxcblx0dGFyZ2V0ID0+ICh0YXJnZXQgYXMgYW55KS5faXIxMDc3ICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdExPR19NT0NLX0hBTkRMRVJTICYmIGNvbnNvbGUubG9nKCdpbWFnZSByZXNvdXJjZSAxMDc3JywgbGVmdCgpKTtcblx0XHQodGFyZ2V0IGFzIGFueSkuX2lyMTA3NyA9IHJlYWRCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlQnl0ZXMod3JpdGVyLCAodGFyZ2V0IGFzIGFueSkuX2lyMTA3Nyk7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQxMDUzLFxuXHR0YXJnZXQgPT4gdGFyZ2V0LmFscGhhSWRlbnRpZmllcnMgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0dGFyZ2V0LmFscGhhSWRlbnRpZmllcnMgPSBbXTtcblxuXHRcdHdoaWxlIChsZWZ0KCkgPj0gNCkge1xuXHRcdFx0dGFyZ2V0LmFscGhhSWRlbnRpZmllcnMucHVzaChyZWFkVWludDMyKHJlYWRlcikpO1xuXHRcdH1cblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Zm9yIChjb25zdCBpZCBvZiB0YXJnZXQuYWxwaGFJZGVudGlmaWVycyEpIHtcblx0XHRcdHdyaXRlVWludDMyKHdyaXRlciwgaWQpO1xuXHRcdH1cblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDEwMTAsXG5cdHRhcmdldCA9PiB0YXJnZXQuYmFja2dyb3VuZENvbG9yICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCkgPT4gdGFyZ2V0LmJhY2tncm91bmRDb2xvciA9IHJlYWRDb2xvcihyZWFkZXIpLFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHdyaXRlQ29sb3Iod3JpdGVyLCB0YXJnZXQuYmFja2dyb3VuZENvbG9yISksXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQxMDM3LFxuXHR0YXJnZXQgPT4gdGFyZ2V0Lmdsb2JhbEFuZ2xlICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCkgPT4gdGFyZ2V0Lmdsb2JhbEFuZ2xlID0gcmVhZFVpbnQzMihyZWFkZXIpLFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHdyaXRlVWludDMyKHdyaXRlciwgdGFyZ2V0Lmdsb2JhbEFuZ2xlISksXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQxMDQ5LFxuXHR0YXJnZXQgPT4gdGFyZ2V0Lmdsb2JhbEFsdGl0dWRlICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCkgPT4gdGFyZ2V0Lmdsb2JhbEFsdGl0dWRlID0gcmVhZFVpbnQzMihyZWFkZXIpLFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHdyaXRlVWludDMyKHdyaXRlciwgdGFyZ2V0Lmdsb2JhbEFsdGl0dWRlISksXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQxMDExLFxuXHR0YXJnZXQgPT4gdGFyZ2V0LnByaW50RmxhZ3MgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0dGFyZ2V0LnByaW50RmxhZ3MgPSB7XG5cdFx0XHRsYWJlbHM6ICEhcmVhZFVpbnQ4KHJlYWRlciksXG5cdFx0XHRjcm9wTWFya3M6ICEhcmVhZFVpbnQ4KHJlYWRlciksXG5cdFx0XHRjb2xvckJhcnM6ICEhcmVhZFVpbnQ4KHJlYWRlciksXG5cdFx0XHRyZWdpc3RyYXRpb25NYXJrczogISFyZWFkVWludDgocmVhZGVyKSxcblx0XHRcdG5lZ2F0aXZlOiAhIXJlYWRVaW50OChyZWFkZXIpLFxuXHRcdFx0ZmxpcDogISFyZWFkVWludDgocmVhZGVyKSxcblx0XHRcdGludGVycG9sYXRlOiAhIXJlYWRVaW50OChyZWFkZXIpLFxuXHRcdFx0Y2FwdGlvbjogISFyZWFkVWludDgocmVhZGVyKSxcblx0XHRcdHByaW50RmxhZ3M6ICEhcmVhZFVpbnQ4KHJlYWRlciksXG5cdFx0fTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgZmxhZ3MgPSB0YXJnZXQucHJpbnRGbGFncyE7XG5cdFx0d3JpdGVVaW50OCh3cml0ZXIsIGZsYWdzLmxhYmVscyA/IDEgOiAwKTtcblx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgZmxhZ3MuY3JvcE1hcmtzID8gMSA6IDApO1xuXHRcdHdyaXRlVWludDgod3JpdGVyLCBmbGFncy5jb2xvckJhcnMgPyAxIDogMCk7XG5cdFx0d3JpdGVVaW50OCh3cml0ZXIsIGZsYWdzLnJlZ2lzdHJhdGlvbk1hcmtzID8gMSA6IDApO1xuXHRcdHdyaXRlVWludDgod3JpdGVyLCBmbGFncy5uZWdhdGl2ZSA/IDEgOiAwKTtcblx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgZmxhZ3MuZmxpcCA/IDEgOiAwKTtcblx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgZmxhZ3MuaW50ZXJwb2xhdGUgPyAxIDogMCk7XG5cdFx0d3JpdGVVaW50OCh3cml0ZXIsIGZsYWdzLmNhcHRpb24gPyAxIDogMCk7XG5cdFx0d3JpdGVVaW50OCh3cml0ZXIsIGZsYWdzLnByaW50RmxhZ3MgPyAxIDogMCk7XG5cdH0sXG4pO1xuXG5NT0NLX0hBTkRMRVJTICYmIGFkZEhhbmRsZXIoXG5cdDEwMDAwLCAvLyBQcmludCBmbGFnc1xuXHR0YXJnZXQgPT4gKHRhcmdldCBhcyBhbnkpLl9pcjEwMDAwICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdExPR19NT0NLX0hBTkRMRVJTICYmIGNvbnNvbGUubG9nKCdpbWFnZSByZXNvdXJjZSAxMDAwMCcsIGxlZnQoKSk7XG5cdFx0KHRhcmdldCBhcyBhbnkpLl9pcjEwMDAwID0gcmVhZEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVCeXRlcyh3cml0ZXIsICh0YXJnZXQgYXMgYW55KS5faXIxMDAwMCk7XG5cdH0sXG4pO1xuXG5NT0NLX0hBTkRMRVJTICYmIGFkZEhhbmRsZXIoXG5cdDEwMTMsIC8vIENvbG9yIGhhbGZ0b25pbmdcblx0dGFyZ2V0ID0+ICh0YXJnZXQgYXMgYW55KS5faXIxMDEzICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdExPR19NT0NLX0hBTkRMRVJTICYmIGNvbnNvbGUubG9nKCdpbWFnZSByZXNvdXJjZSAxMDEzJywgbGVmdCgpKTtcblx0XHQodGFyZ2V0IGFzIGFueSkuX2lyMTAxMyA9IHJlYWRCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlQnl0ZXMod3JpdGVyLCAodGFyZ2V0IGFzIGFueSkuX2lyMTAxMyk7XG5cdH0sXG4pO1xuXG5NT0NLX0hBTkRMRVJTICYmIGFkZEhhbmRsZXIoXG5cdDEwMTYsIC8vIENvbG9yIHRyYW5zZmVyIGZ1bmN0aW9uc1xuXHR0YXJnZXQgPT4gKHRhcmdldCBhcyBhbnkpLl9pcjEwMTYgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0TE9HX01PQ0tfSEFORExFUlMgJiYgY29uc29sZS5sb2coJ2ltYWdlIHJlc291cmNlIDEwMTYnLCBsZWZ0KCkpO1xuXHRcdCh0YXJnZXQgYXMgYW55KS5faXIxMDE2ID0gcmVhZEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVCeXRlcyh3cml0ZXIsICh0YXJnZXQgYXMgYW55KS5faXIxMDE2KTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDEwMjQsXG5cdHRhcmdldCA9PiB0YXJnZXQubGF5ZXJTdGF0ZSAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHRhcmdldC5sYXllclN0YXRlID0gcmVhZFVpbnQxNihyZWFkZXIpLFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHdyaXRlVWludDE2KHdyaXRlciwgdGFyZ2V0LmxheWVyU3RhdGUhKSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDEwMjYsXG5cdHRhcmdldCA9PiB0YXJnZXQubGF5ZXJzR3JvdXAgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0dGFyZ2V0LmxheWVyc0dyb3VwID0gW107XG5cblx0XHR3aGlsZSAobGVmdCgpKSB7XG5cdFx0XHR0YXJnZXQubGF5ZXJzR3JvdXAucHVzaChyZWFkVWludDE2KHJlYWRlcikpO1xuXHRcdH1cblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Zm9yIChjb25zdCBnIG9mIHRhcmdldC5sYXllcnNHcm91cCEpIHtcblx0XHRcdHdyaXRlVWludDE2KHdyaXRlciwgZyk7XG5cdFx0fVxuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0MTA3Mixcblx0dGFyZ2V0ID0+IHRhcmdldC5sYXllckdyb3Vwc0VuYWJsZWRJZCAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHR0YXJnZXQubGF5ZXJHcm91cHNFbmFibGVkSWQgPSBbXTtcblxuXHRcdHdoaWxlIChsZWZ0KCkpIHtcblx0XHRcdHRhcmdldC5sYXllckdyb3Vwc0VuYWJsZWRJZC5wdXNoKHJlYWRVaW50OChyZWFkZXIpKTtcblx0XHR9XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGZvciAoY29uc3QgaWQgb2YgdGFyZ2V0LmxheWVyR3JvdXBzRW5hYmxlZElkISkge1xuXHRcdFx0d3JpdGVVaW50OCh3cml0ZXIsIGlkKTtcblx0XHR9XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQxMDY5LFxuXHR0YXJnZXQgPT4gdGFyZ2V0LmxheWVyU2VsZWN0aW9uSWRzICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCkgPT4ge1xuXHRcdGxldCBjb3VudCA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHR0YXJnZXQubGF5ZXJTZWxlY3Rpb25JZHMgPSBbXTtcblxuXHRcdHdoaWxlIChjb3VudC0tKSB7XG5cdFx0XHR0YXJnZXQubGF5ZXJTZWxlY3Rpb25JZHMucHVzaChyZWFkVWludDMyKHJlYWRlcikpO1xuXHRcdH1cblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCB0YXJnZXQubGF5ZXJTZWxlY3Rpb25JZHMhLmxlbmd0aCk7XG5cblx0XHRmb3IgKGNvbnN0IGlkIG9mIHRhcmdldC5sYXllclNlbGVjdGlvbklkcyEpIHtcblx0XHRcdHdyaXRlVWludDMyKHdyaXRlciwgaWQpO1xuXHRcdH1cblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDEwMzIsXG5cdHRhcmdldCA9PiB0YXJnZXQuZ3JpZEFuZEd1aWRlc0luZm9ybWF0aW9uICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IHZlcnNpb24gPSByZWFkVWludDMyKHJlYWRlcik7XG5cdFx0Y29uc3QgaG9yaXpvbnRhbCA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHRjb25zdCB2ZXJ0aWNhbCA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHRjb25zdCBjb3VudCA9IHJlYWRVaW50MzIocmVhZGVyKTtcblxuXHRcdGlmICh2ZXJzaW9uICE9PSAxKSB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgMTAzMiByZXNvdXJjZSB2ZXJzaW9uOiAke3ZlcnNpb259YCk7XG5cblx0XHR0YXJnZXQuZ3JpZEFuZEd1aWRlc0luZm9ybWF0aW9uID0ge1xuXHRcdFx0Z3JpZDogeyBob3Jpem9udGFsLCB2ZXJ0aWNhbCB9LFxuXHRcdFx0Z3VpZGVzOiBbXSxcblx0XHR9O1xuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG5cdFx0XHR0YXJnZXQuZ3JpZEFuZEd1aWRlc0luZm9ybWF0aW9uLmd1aWRlcyEucHVzaCh7XG5cdFx0XHRcdGxvY2F0aW9uOiByZWFkVWludDMyKHJlYWRlcikgLyAzMixcblx0XHRcdFx0ZGlyZWN0aW9uOiByZWFkVWludDgocmVhZGVyKSA/ICdob3Jpem9udGFsJyA6ICd2ZXJ0aWNhbCdcblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgaW5mbyA9IHRhcmdldC5ncmlkQW5kR3VpZGVzSW5mb3JtYXRpb24hO1xuXHRcdGNvbnN0IGdyaWQgPSBpbmZvLmdyaWQgfHwgeyBob3Jpem9udGFsOiAxOCAqIDMyLCB2ZXJ0aWNhbDogMTggKiAzMiB9O1xuXHRcdGNvbnN0IGd1aWRlcyA9IGluZm8uZ3VpZGVzIHx8IFtdO1xuXG5cdFx0d3JpdGVVaW50MzIod3JpdGVyLCAxKTtcblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIGdyaWQuaG9yaXpvbnRhbCk7XG5cdFx0d3JpdGVVaW50MzIod3JpdGVyLCBncmlkLnZlcnRpY2FsKTtcblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIGd1aWRlcy5sZW5ndGgpO1xuXG5cdFx0Zm9yIChjb25zdCBnIG9mIGd1aWRlcykge1xuXHRcdFx0d3JpdGVVaW50MzIod3JpdGVyLCBnLmxvY2F0aW9uICogMzIpO1xuXHRcdFx0d3JpdGVVaW50OCh3cml0ZXIsIGcuZGlyZWN0aW9uID09PSAnaG9yaXpvbnRhbCcgPyAxIDogMCk7XG5cdFx0fVxuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0MTA1NCxcblx0dGFyZ2V0ID0+IHRhcmdldC51cmxzTGlzdCAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIF8sIG9wdGlvbnMpID0+IHtcblx0XHRjb25zdCBjb3VudCA9IHJlYWRVaW50MzIocmVhZGVyKTtcblxuXHRcdGlmIChjb3VudCkge1xuXHRcdFx0aWYgKCFvcHRpb25zLnRocm93Rm9yTWlzc2luZ0ZlYXR1cmVzKSByZXR1cm47XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZDogVVJMIExpc3QnKTtcblx0XHR9XG5cblx0XHQvLyBUT0RPOiByZWFkIGFjdHVhbCBVUkwgbGlzdFxuXHRcdHRhcmdldC51cmxzTGlzdCA9IFtdO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIHRhcmdldC51cmxzTGlzdCEubGVuZ3RoKTtcblxuXHRcdC8vIFRPRE86IHdyaXRlIGFjdHVhbCBVUkwgbGlzdFxuXHRcdGlmICh0YXJnZXQudXJsc0xpc3QhLmxlbmd0aCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQ6IFVSTCBMaXN0Jyk7XG5cdFx0fVxuXHR9LFxuKTtcblxuTU9DS19IQU5ETEVSUyAmJiBhZGRIYW5kbGVyKFxuXHQxMDUwLCAvLyBTbGljZXNcblx0dGFyZ2V0ID0+ICh0YXJnZXQgYXMgYW55KS5faXIxMDUwICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdExPR19NT0NLX0hBTkRMRVJTICYmIGNvbnNvbGUubG9nKCdpbWFnZSByZXNvdXJjZSAxMDUwJywgbGVmdCgpKTtcblx0XHQodGFyZ2V0IGFzIGFueSkuX2lyMTA1MCA9IHJlYWRCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlQnl0ZXMod3JpdGVyLCAodGFyZ2V0IGFzIGFueSkuX2lyMTA1MCk7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQxMDY0LFxuXHR0YXJnZXQgPT4gdGFyZ2V0LnBpeGVsQXNwZWN0UmF0aW8gIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0aWYgKHJlYWRVaW50MzIocmVhZGVyKSA+IDIpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBwaXhlbEFzcGVjdFJhdGlvIHZlcnNpb24nKTtcblx0XHR0YXJnZXQucGl4ZWxBc3BlY3RSYXRpbyA9IHsgYXNwZWN0OiByZWFkRmxvYXQ2NChyZWFkZXIpIH07XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlVWludDMyKHdyaXRlciwgMik7IC8vIHZlcnNpb25cblx0XHR3cml0ZUZsb2F0NjQod3JpdGVyLCB0YXJnZXQucGl4ZWxBc3BlY3RSYXRpbyEuYXNwZWN0KTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDEwNDEsXG5cdHRhcmdldCA9PiB0YXJnZXQuaWNjVW50YWdnZWRQcm9maWxlICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCkgPT4ge1xuXHRcdHRhcmdldC5pY2NVbnRhZ2dlZFByb2ZpbGUgPSAhIXJlYWRVaW50OChyZWFkZXIpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgdGFyZ2V0LmljY1VudGFnZ2VkUHJvZmlsZSA/IDEgOiAwKTtcblx0fSxcbik7XG5cbk1PQ0tfSEFORExFUlMgJiYgYWRkSGFuZGxlcihcblx0MTAzOSwgLy8gSUNDIFByb2ZpbGVcblx0dGFyZ2V0ID0+ICh0YXJnZXQgYXMgYW55KS5faXIxMDM5ICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdExPR19NT0NLX0hBTkRMRVJTICYmIGNvbnNvbGUubG9nKCdpbWFnZSByZXNvdXJjZSAxMDM5JywgbGVmdCgpKTtcblx0XHQodGFyZ2V0IGFzIGFueSkuX2lyMTAzOSA9IHJlYWRCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlQnl0ZXMod3JpdGVyLCAodGFyZ2V0IGFzIGFueSkuX2lyMTAzOSk7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQxMDQ0LFxuXHR0YXJnZXQgPT4gdGFyZ2V0Lmlkc1NlZWROdW1iZXIgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB0YXJnZXQuaWRzU2VlZE51bWJlciA9IHJlYWRVaW50MzIocmVhZGVyKSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB3cml0ZVVpbnQzMih3cml0ZXIsIHRhcmdldC5pZHNTZWVkTnVtYmVyISksXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQxMDM2LFxuXHR0YXJnZXQgPT4gdGFyZ2V0LnRodW1ibmFpbCAhPT0gdW5kZWZpbmVkIHx8IHRhcmdldC50aHVtYm5haWxSYXcgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0LCBvcHRpb25zKSA9PiB7XG5cdFx0Y29uc3QgZm9ybWF0ID0gcmVhZFVpbnQzMihyZWFkZXIpOyAvLyAxID0ga0pwZWdSR0IsIDAgPSBrUmF3UkdCXG5cdFx0Y29uc3Qgd2lkdGggPSByZWFkVWludDMyKHJlYWRlcik7XG5cdFx0Y29uc3QgaGVpZ2h0ID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXHRcdHJlYWRVaW50MzIocmVhZGVyKTsgLy8gd2lkdGhCeXRlcyA9ICh3aWR0aCAqIGJpdHNfcGVyX3BpeGVsICsgMzEpIC8gMzIgKiA0LlxuXHRcdHJlYWRVaW50MzIocmVhZGVyKTsgLy8gdG90YWxTaXplID0gd2lkdGhCeXRlcyAqIGhlaWdodCAqIHBsYW5lc1xuXHRcdHJlYWRVaW50MzIocmVhZGVyKTsgLy8gc2l6ZUFmdGVyQ29tcHJlc3Npb25cblx0XHRjb25zdCBiaXRzUGVyUGl4ZWwgPSByZWFkVWludDE2KHJlYWRlcik7IC8vIDI0XG5cdFx0Y29uc3QgcGxhbmVzID0gcmVhZFVpbnQxNihyZWFkZXIpOyAvLyAxXG5cblx0XHRpZiAoZm9ybWF0ICE9PSAxIHx8IGJpdHNQZXJQaXhlbCAhPT0gMjQgfHwgcGxhbmVzICE9PSAxKSB7XG5cdFx0XHRvcHRpb25zLmxvZ01pc3NpbmdGZWF0dXJlcyAmJiBjb25zb2xlLmxvZyhgSW52YWxpZCB0aHVtYm5haWwgZGF0YSAoZm9ybWF0OiAke2Zvcm1hdH0sIGJpdHNQZXJQaXhlbDogJHtiaXRzUGVyUGl4ZWx9LCBwbGFuZXM6ICR7cGxhbmVzfSlgKTtcblx0XHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc2l6ZSA9IGxlZnQoKTtcblx0XHRjb25zdCBkYXRhID0gcmVhZEJ5dGVzKHJlYWRlciwgc2l6ZSk7XG5cblx0XHRpZiAob3B0aW9ucy51c2VSYXdUaHVtYm5haWwpIHtcblx0XHRcdHRhcmdldC50aHVtYm5haWxSYXcgPSB7IHdpZHRoLCBoZWlnaHQsIGRhdGEgfTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGFyZ2V0LnRodW1ibmFpbCA9IGNyZWF0ZUNhbnZhc0Zyb21EYXRhKGRhdGEpO1xuXHRcdH1cblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0bGV0IHdpZHRoID0gMDtcblx0XHRsZXQgaGVpZ2h0ID0gMDtcblx0XHRsZXQgZGF0YTogVWludDhBcnJheTtcblxuXHRcdGlmICh0YXJnZXQudGh1bWJuYWlsUmF3KSB7XG5cdFx0XHR3aWR0aCA9IHRhcmdldC50aHVtYm5haWxSYXcud2lkdGg7XG5cdFx0XHRoZWlnaHQgPSB0YXJnZXQudGh1bWJuYWlsUmF3LmhlaWdodDtcblx0XHRcdGRhdGEgPSB0YXJnZXQudGh1bWJuYWlsUmF3LmRhdGE7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmICghdGFyZ2V0LnRodW1ibmFpbCkgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHRodW1ibmFpbCcpO1xuXHRcdFx0d2lkdGggPSB0YXJnZXQudGh1bWJuYWlsLndpZHRoO1xuXHRcdFx0aGVpZ2h0ID0gdGFyZ2V0LnRodW1ibmFpbC5oZWlnaHQ7XG5cdFx0XHRkYXRhID0gdG9CeXRlQXJyYXkodGFyZ2V0LnRodW1ibmFpbC50b0RhdGFVUkwoJ2ltYWdlL2pwZWcnLCAxKS5zdWJzdHIoJ2RhdGE6aW1hZ2UvanBlZztiYXNlNjQsJy5sZW5ndGgpKTtcblx0XHR9XG5cblx0XHRjb25zdCBiaXRzUGVyUGl4ZWwgPSAyNDtcblx0XHRjb25zdCB3aWR0aEJ5dGVzID0gTWF0aC5mbG9vcigod2lkdGggKiBiaXRzUGVyUGl4ZWwgKyAzMSkgLyAzMikgKiA0O1xuXHRcdGNvbnN0IHBsYW5lcyA9IDE7XG5cdFx0Y29uc3QgdG90YWxTaXplID0gd2lkdGhCeXRlcyAqIGhlaWdodCAqIHBsYW5lcztcblx0XHRjb25zdCBzaXplQWZ0ZXJDb21wcmVzc2lvbiA9IGRhdGEubGVuZ3RoO1xuXG5cdFx0d3JpdGVVaW50MzIod3JpdGVyLCAxKTsgLy8gMSA9IGtKcGVnUkdCXG5cdFx0d3JpdGVVaW50MzIod3JpdGVyLCB3aWR0aCk7XG5cdFx0d3JpdGVVaW50MzIod3JpdGVyLCBoZWlnaHQpO1xuXHRcdHdyaXRlVWludDMyKHdyaXRlciwgd2lkdGhCeXRlcyk7XG5cdFx0d3JpdGVVaW50MzIod3JpdGVyLCB0b3RhbFNpemUpO1xuXHRcdHdyaXRlVWludDMyKHdyaXRlciwgc2l6ZUFmdGVyQ29tcHJlc3Npb24pO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgYml0c1BlclBpeGVsKTtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIHBsYW5lcyk7XG5cdFx0d3JpdGVCeXRlcyh3cml0ZXIsIGRhdGEpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0MTA1Nyxcblx0dGFyZ2V0ID0+IHRhcmdldC52ZXJzaW9uSW5mbyAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRjb25zdCB2ZXJzaW9uID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXHRcdGlmICh2ZXJzaW9uICE9PSAxKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgdmVyc2lvbkluZm8gdmVyc2lvbicpO1xuXG5cdFx0dGFyZ2V0LnZlcnNpb25JbmZvID0ge1xuXHRcdFx0aGFzUmVhbE1lcmdlZERhdGE6ICEhcmVhZFVpbnQ4KHJlYWRlciksXG5cdFx0XHR3cml0ZXJOYW1lOiByZWFkVW5pY29kZVN0cmluZyhyZWFkZXIpLFxuXHRcdFx0cmVhZGVyTmFtZTogcmVhZFVuaWNvZGVTdHJpbmcocmVhZGVyKSxcblx0XHRcdGZpbGVWZXJzaW9uOiByZWFkVWludDMyKHJlYWRlciksXG5cdFx0fTtcblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IHZlcnNpb25JbmZvID0gdGFyZ2V0LnZlcnNpb25JbmZvITtcblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIDEpOyAvLyB2ZXJzaW9uXG5cdFx0d3JpdGVVaW50OCh3cml0ZXIsIHZlcnNpb25JbmZvLmhhc1JlYWxNZXJnZWREYXRhID8gMSA6IDApO1xuXHRcdHdyaXRlVW5pY29kZVN0cmluZyh3cml0ZXIsIHZlcnNpb25JbmZvLndyaXRlck5hbWUpO1xuXHRcdHdyaXRlVW5pY29kZVN0cmluZyh3cml0ZXIsIHZlcnNpb25JbmZvLnJlYWRlck5hbWUpO1xuXHRcdHdyaXRlVWludDMyKHdyaXRlciwgdmVyc2lvbkluZm8uZmlsZVZlcnNpb24pO1xuXHR9LFxuKTtcblxuTU9DS19IQU5ETEVSUyAmJiBhZGRIYW5kbGVyKFxuXHQxMDU4LCAvLyBFWElGIGRhdGEgMS5cblx0dGFyZ2V0ID0+ICh0YXJnZXQgYXMgYW55KS5faXIxMDU4ICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdExPR19NT0NLX0hBTkRMRVJTICYmIGNvbnNvbGUubG9nKCdpbWFnZSByZXNvdXJjZSAxMDU4JywgbGVmdCgpKTtcblx0XHQodGFyZ2V0IGFzIGFueSkuX2lyMTA1OCA9IHJlYWRCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlQnl0ZXMod3JpdGVyLCAodGFyZ2V0IGFzIGFueSkuX2lyMTA1OCk7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQ3MDAwLFxuXHR0YXJnZXQgPT4gdGFyZ2V0LmltYWdlUmVhZHlWYXJpYWJsZXMgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0dGFyZ2V0LmltYWdlUmVhZHlWYXJpYWJsZXMgPSByZWFkVXRmOFN0cmluZyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlVXRmOFN0cmluZyh3cml0ZXIsIHRhcmdldC5pbWFnZVJlYWR5VmFyaWFibGVzISk7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQ3MDAxLFxuXHR0YXJnZXQgPT4gdGFyZ2V0LmltYWdlUmVhZHlEYXRhU2V0cyAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHR0YXJnZXQuaW1hZ2VSZWFkeURhdGFTZXRzID0gcmVhZFV0ZjhTdHJpbmcocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHR3cml0ZVV0ZjhTdHJpbmcod3JpdGVyLCB0YXJnZXQuaW1hZ2VSZWFkeURhdGFTZXRzISk7XG5cdH0sXG4pO1xuXG5pbnRlcmZhY2UgRGVzY3JpcHRvcjEwODgge1xuXHQnbnVsbCc6IHN0cmluZ1tdO1xufVxuXG5hZGRIYW5kbGVyKFxuXHQxMDg4LFxuXHR0YXJnZXQgPT4gdGFyZ2V0LnBhdGhTZWxlY3Rpb25TdGF0ZSAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIF9sZWZ0KSA9PiB7XG5cdFx0Y29uc3QgZGVzYzogRGVzY3JpcHRvcjEwODggPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKTtcblx0XHQvLyBjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChkZXNjLCBmYWxzZSwgOTksIHRydWUpKTtcblx0XHR0YXJnZXQucGF0aFNlbGVjdGlvblN0YXRlID0gZGVzY1snbnVsbCddO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBkZXNjOiBEZXNjcmlwdG9yMTA4OCA9IHsgJ251bGwnOiB0YXJnZXQucGF0aFNlbGVjdGlvblN0YXRlISB9O1xuXHRcdHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgJ251bGwnLCBkZXNjKTtcblx0fSxcbik7XG5cbk1PQ0tfSEFORExFUlMgJiYgYWRkSGFuZGxlcihcblx0MTAyNSxcblx0dGFyZ2V0ID0+ICh0YXJnZXQgYXMgYW55KS5faXIxMDI1ICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdExPR19NT0NLX0hBTkRMRVJTICYmIGNvbnNvbGUubG9nKCdpbWFnZSByZXNvdXJjZSAxMDI1JywgbGVmdCgpKTtcblx0XHQodGFyZ2V0IGFzIGFueSkuX2lyMTAyNSA9IHJlYWRCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlQnl0ZXMod3JpdGVyLCAodGFyZ2V0IGFzIGFueSkuX2lyMTAyNSk7XG5cdH0sXG4pO1xuXG5jb25zdCBGcm1EID0gY3JlYXRlRW51bTwnYXV0bycgfCAnbm9uZScgfCAnZGlzcG9zZSc+KCdGcm1EJywgJycsIHtcblx0YXV0bzogJ0F1dG8nLFxuXHRub25lOiAnTm9uZScsXG5cdGRpc3Bvc2U6ICdEaXNwJyxcbn0pO1xuXG5pbnRlcmZhY2UgQW5pbWF0aW9uRGVzY3JpcHRvciB7XG5cdEFGU3Q6IG51bWJlcjtcblx0RnJJbjoge1xuXHRcdEZySUQ6IG51bWJlcjtcblx0XHRGckRsOiBudW1iZXI7XG5cdFx0RnJEczogc3RyaW5nO1xuXHRcdEZyR0E/OiBudW1iZXI7XG5cdH1bXTtcblx0RlN0czoge1xuXHRcdEZzSUQ6IG51bWJlcjtcblx0XHRBRnJtOiBudW1iZXI7XG5cdFx0RnNGcjogbnVtYmVyW107XG5cdFx0TENudDogbnVtYmVyO1xuXHR9W107XG59XG5cbmludGVyZmFjZSBBbmltYXRpb25zIHtcblx0ZnJhbWVzOiB7XG5cdFx0aWQ6IG51bWJlcjtcblx0XHRkZWxheTogbnVtYmVyO1xuXHRcdGRpc3Bvc2U/OiAnYXV0bycgfCAnbm9uZScgfCAnZGlzcG9zZSc7XG5cdH1bXTtcblx0YW5pbWF0aW9uczoge1xuXHRcdGlkOiBudW1iZXI7XG5cdFx0ZnJhbWVzOiBudW1iZXJbXTtcblx0XHRyZXBlYXRzPzogbnVtYmVyO1xuXHR9W107XG59XG5cbi8vIFRPRE86IFVuZmluaXNoZWRcbk1PQ0tfSEFORExFUlMgJiYgYWRkSGFuZGxlcihcblx0NDAwMCwgLy8gUGx1Zy1JbiByZXNvdXJjZShzKVxuXHR0YXJnZXQgPT4gKHRhcmdldCBhcyBhbnkpLl9pcjQwMDAgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0LCB7IGxvZ01pc3NpbmdGZWF0dXJlcywgbG9nRGV2RmVhdHVyZXMgfSkgPT4ge1xuXHRcdGlmIChNT0NLX0hBTkRMRVJTKSB7XG5cdFx0XHRMT0dfTU9DS19IQU5ETEVSUyAmJiBjb25zb2xlLmxvZygnaW1hZ2UgcmVzb3VyY2UgNDAwMCcsIGxlZnQoKSk7XG5cdFx0XHQodGFyZ2V0IGFzIGFueSkuX2lyNDAwMCA9IHJlYWRCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3Qga2V5ID0gcmVhZFNpZ25hdHVyZShyZWFkZXIpO1xuXG5cdFx0aWYgKGtleSA9PT0gJ21hbmknKSB7XG5cdFx0XHRjaGVja1NpZ25hdHVyZShyZWFkZXIsICdJUkZSJyk7XG5cdFx0XHRyZWFkU2VjdGlvbihyZWFkZXIsIDEsIGxlZnQgPT4ge1xuXHRcdFx0XHR3aGlsZSAobGVmdCgpKSB7XG5cdFx0XHRcdFx0Y2hlY2tTaWduYXR1cmUocmVhZGVyLCAnOEJJTScpO1xuXHRcdFx0XHRcdGNvbnN0IGtleSA9IHJlYWRTaWduYXR1cmUocmVhZGVyKTtcblxuXHRcdFx0XHRcdHJlYWRTZWN0aW9uKHJlYWRlciwgMSwgbGVmdCA9PiB7XG5cdFx0XHRcdFx0XHRpZiAoa2V5ID09PSAnQW5EcycpIHtcblx0XHRcdFx0XHRcdFx0Y29uc3QgZGVzYyA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpIGFzIEFuaW1hdGlvbkRlc2NyaXB0b3I7XG5cdFx0XHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKCdBbkRzJywgZGVzYyk7XG5cdFx0XHRcdFx0XHRcdGxvZ0RldkZlYXR1cmVzICYmIGNvbnNvbGUubG9nKCcjNDAwMCBBbkRzJywgZGVzYyk7XG5cdFx0XHRcdFx0XHRcdC8vIGxvZ0RldkZlYXR1cmVzICYmIGNvbnNvbGUubG9nKCcjNDAwMCBBbkRzJywgcmVxdWlyZSgndXRpbCcpLmluc3BlY3QoZGVzYywgZmFsc2UsIDk5LCB0cnVlKSk7XG5cblx0XHRcdFx0XHRcdFx0Y29uc3QgcmVzdWx0OiBBbmltYXRpb25zID0ge1xuXHRcdFx0XHRcdFx0XHRcdC8vIGRlc2MuQUZTdCA/Pz9cblx0XHRcdFx0XHRcdFx0XHRmcmFtZXM6IGRlc2MuRnJJbi5tYXAoeCA9PiAoe1xuXHRcdFx0XHRcdFx0XHRcdFx0aWQ6IHguRnJJRCxcblx0XHRcdFx0XHRcdFx0XHRcdGRlbGF5OiB4LkZyRGwgLyAxMDAsXG5cdFx0XHRcdFx0XHRcdFx0XHRkaXNwb3NlOiB4LkZyRHMgPyBGcm1ELmRlY29kZSh4LkZyRHMpIDogJ2F1dG8nLCAvLyBtaXNzaW5nID09IGF1dG9cblx0XHRcdFx0XHRcdFx0XHRcdC8vIHguRnJHQSA/Pz9cblx0XHRcdFx0XHRcdFx0XHR9KSksXG5cdFx0XHRcdFx0XHRcdFx0YW5pbWF0aW9uczogZGVzYy5GU3RzLm1hcCh4ID0+ICh7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZDogeC5Gc0lELFxuXHRcdFx0XHRcdFx0XHRcdFx0ZnJhbWVzOiB4LkZzRnIsXG5cdFx0XHRcdFx0XHRcdFx0XHRyZXBlYXRzOiB4LkxDbnQsXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyB4LkFGcm0gPz8/XG5cdFx0XHRcdFx0XHRcdFx0fSkpLFxuXHRcdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHRcdGxvZ0RldkZlYXR1cmVzICYmIGNvbnNvbGUubG9nKCcjNDAwMCBBbkRzOnJlc3VsdCcsIHJlc3VsdCk7XG5cdFx0XHRcdFx0XHRcdC8vIGxvZ0RldkZlYXR1cmVzICYmIGNvbnNvbGUubG9nKCcjNDAwMCBBbkRzOnJlc3VsdCcsIHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KHJlc3VsdCwgZmFsc2UsIDk5LCB0cnVlKSk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGtleSA9PT0gJ1JvbGwnKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IGJ5dGVzID0gcmVhZEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0XHRcdFx0XHRcdFx0bG9nRGV2RmVhdHVyZXMgJiYgY29uc29sZS5sb2coJyM0MDAwIFJvbGwnLCBieXRlcyk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRsb2dNaXNzaW5nRmVhdHVyZXMgJiYgY29uc29sZS5sb2coJ1VuaGFuZGxlZCBzdWJzZWN0aW9uIGluICM0MDAwJywga2V5KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIGlmIChrZXkgPT09ICdtb3B0Jykge1xuXHRcdFx0Y29uc3QgYnl0ZXMgPSByZWFkQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHRcdFx0bG9nRGV2RmVhdHVyZXMgJiYgY29uc29sZS5sb2coJyM0MDAwIG1vcHQnLCBieXRlcyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxvZ01pc3NpbmdGZWF0dXJlcyAmJiBjb25zb2xlLmxvZygnVW5oYW5kbGVkIGtleSBpbiAjNDAwMDonLCBrZXkpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVCeXRlcyh3cml0ZXIsICh0YXJnZXQgYXMgYW55KS5faXI0MDAwKTtcblx0fSxcbik7XG5cbi8vIFRPRE86IFVuZmluaXNoZWRcbk1PQ0tfSEFORExFUlMgJiYgYWRkSGFuZGxlcihcblx0NDAwMSwgLy8gUGx1Zy1JbiByZXNvdXJjZShzKVxuXHR0YXJnZXQgPT4gKHRhcmdldCBhcyBhbnkpLl9pcjQwMDEgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0LCB7IGxvZ01pc3NpbmdGZWF0dXJlcywgbG9nRGV2RmVhdHVyZXMgfSkgPT4ge1xuXHRcdGlmIChNT0NLX0hBTkRMRVJTKSB7XG5cdFx0XHRMT0dfTU9DS19IQU5ETEVSUyAmJiBjb25zb2xlLmxvZygnaW1hZ2UgcmVzb3VyY2UgNDAwMScsIGxlZnQoKSk7XG5cdFx0XHQodGFyZ2V0IGFzIGFueSkuX2lyNDAwMSA9IHJlYWRCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3Qga2V5ID0gcmVhZFNpZ25hdHVyZShyZWFkZXIpO1xuXG5cdFx0aWYgKGtleSA9PT0gJ21mcmknKSB7XG5cdFx0XHRjb25zdCB2ZXJzaW9uID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXHRcdFx0aWYgKHZlcnNpb24gIT09IDIpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBtZnJpIHZlcnNpb24nKTtcblxuXHRcdFx0Y29uc3QgbGVuZ3RoID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXHRcdFx0Y29uc3QgYnl0ZXMgPSByZWFkQnl0ZXMocmVhZGVyLCBsZW5ndGgpO1xuXHRcdFx0bG9nRGV2RmVhdHVyZXMgJiYgY29uc29sZS5sb2coJ21mcmknLCBieXRlcyk7XG5cdFx0fSBlbHNlIGlmIChrZXkgPT09ICdtc2V0Jykge1xuXHRcdFx0Y29uc3QgZGVzYyA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpO1xuXHRcdFx0bG9nRGV2RmVhdHVyZXMgJiYgY29uc29sZS5sb2coJ21zZXQnLCBkZXNjKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bG9nTWlzc2luZ0ZlYXR1cmVzICYmIGNvbnNvbGUubG9nKCdVbmhhbmRsZWQga2V5IGluICM0MDAxJywga2V5KTtcblx0XHR9XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlQnl0ZXMod3JpdGVyLCAodGFyZ2V0IGFzIGFueSkuX2lyNDAwMSk7XG5cdH0sXG4pO1xuXG4vLyBUT0RPOiBVbmZpbmlzaGVkXG5NT0NLX0hBTkRMRVJTICYmIGFkZEhhbmRsZXIoXG5cdDQwMDIsIC8vIFBsdWctSW4gcmVzb3VyY2Uocylcblx0dGFyZ2V0ID0+ICh0YXJnZXQgYXMgYW55KS5faXI0MDAyICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdExPR19NT0NLX0hBTkRMRVJTICYmIGNvbnNvbGUubG9nKCdpbWFnZSByZXNvdXJjZSA0MDAyJywgbGVmdCgpKTtcblx0XHQodGFyZ2V0IGFzIGFueSkuX2lyNDAwMiA9IHJlYWRCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlQnl0ZXMod3JpdGVyLCAodGFyZ2V0IGFzIGFueSkuX2lyNDAwMik7XG5cdH0sXG4pO1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvYnJhbmRvbmxpdS9EZXNrdG9wL3NreWxhYi9hZy1wc2Qvc3JjIn0=
