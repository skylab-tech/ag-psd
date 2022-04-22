import { toByteArray } from 'base64-js';
import { readPascalString, readUnicodeString, readUint32, readUint16, readUint8, readFloat64, readBytes, skipBytes, readFloat32, readInt16, readFixedPoint32, readSignature, checkSignature, readSection, readColor } from './psdReader';
import { writePascalString, writeUnicodeString, writeUint32, writeUint8, writeFloat64, writeUint16, writeBytes, writeInt16, writeFloat32, writeFixedPoint32, writeUnicodeStringWithPadding, writeColor, } from './psdWriter';
import { createCanvasFromData, createEnum, MOCK_HANDLERS } from './helpers';
import { decodeString, encodeString } from './utf8';
import { readVersionAndDescriptor, writeVersionAndDescriptor } from './descriptor';
export var resourceHandlers = [];
export var resourceHandlersMap = {};
function addHandler(key, has, read, write) {
    var handler = { key: key, has: has, read: read, write: write };
    resourceHandlers.push(handler);
    resourceHandlersMap[handler.key] = handler;
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
    var buffer = readBytes(reader, length);
    return decodeString(buffer);
}
function writeUtf8String(writer, value) {
    var buffer = encodeString(value);
    writeBytes(writer, buffer);
}
MOCK_HANDLERS && addHandler(1028, // IPTC-NAA record
function (// IPTC-NAA record
target) { return target._ir1028 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1028', left());
    target._ir1028 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir1028);
});
addHandler(1061, function (target) { return target.captionDigest !== undefined; }, function (reader, target) {
    var captionDigest = '';
    for (var i = 0; i < 16; i++) {
        var byte = readUint8(reader);
        captionDigest += hex[byte >> 4];
        captionDigest += hex[byte & 0xf];
    }
    target.captionDigest = captionDigest;
}, function (writer, target) {
    for (var i = 0; i < 16; i++) {
        writeUint8(writer, byteAt(target.captionDigest, i * 2));
    }
});
addHandler(1060, function (target) { return target.xmpMetadata !== undefined; }, function (reader, target, left) { return target.xmpMetadata = readUtf8String(reader, left()); }, function (writer, target) { return writeUtf8String(writer, target.xmpMetadata); });
var Inte = createEnum('Inte', 'perceptual', {
    'perceptual': 'Img ',
    'saturation': 'Grp ',
    'relative colorimetric': 'Clrm',
    'absolute colorimetric': 'AClr',
});
addHandler(1082, function (target) { return target.printInformation !== undefined; }, function (reader, target) {
    var _a, _b;
    var desc = readVersionAndDescriptor(reader);
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
    writeVersionAndDescriptor(writer, '', 'printOutput', desc);
});
MOCK_HANDLERS && addHandler(1083, // Print style
function (// Print style
target) { return target._ir1083 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1083', left());
    target._ir1083 = readBytes(reader, left());
    // TODO:
    // const desc = readVersionAndDescriptor(reader);
    // console.log('1083', require('util').inspect(desc, false, 99, true));
}, function (writer, target) {
    writeBytes(writer, target._ir1083);
});
addHandler(1005, function (target) { return target.resolutionInfo !== undefined; }, function (reader, target) {
    var horizontalResolution = readFixedPoint32(reader);
    var horizontalResolutionUnit = readUint16(reader);
    var widthUnit = readUint16(reader);
    var verticalResolution = readFixedPoint32(reader);
    var verticalResolutionUnit = readUint16(reader);
    var heightUnit = readUint16(reader);
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
    writeFixedPoint32(writer, info.horizontalResolution || 0);
    writeUint16(writer, Math.max(1, RESOLUTION_UNITS.indexOf(info.horizontalResolutionUnit)));
    writeUint16(writer, Math.max(1, MEASUREMENT_UNITS.indexOf(info.widthUnit)));
    writeFixedPoint32(writer, info.verticalResolution || 0);
    writeUint16(writer, Math.max(1, RESOLUTION_UNITS.indexOf(info.verticalResolutionUnit)));
    writeUint16(writer, Math.max(1, MEASUREMENT_UNITS.indexOf(info.heightUnit)));
});
var printScaleStyles = ['centered', 'size to fit', 'user defined'];
addHandler(1062, function (target) { return target.printScale !== undefined; }, function (reader, target) {
    target.printScale = {
        style: printScaleStyles[readInt16(reader)],
        x: readFloat32(reader),
        y: readFloat32(reader),
        scale: readFloat32(reader),
    };
}, function (writer, target) {
    var _a = target.printScale, style = _a.style, x = _a.x, y = _a.y, scale = _a.scale;
    writeInt16(writer, Math.max(0, printScaleStyles.indexOf(style)));
    writeFloat32(writer, x || 0);
    writeFloat32(writer, y || 0);
    writeFloat32(writer, scale || 0);
});
addHandler(1006, function (target) { return target.alphaChannelNames !== undefined; }, function (reader, target, left) {
    target.alphaChannelNames = [];
    while (left()) {
        var value = readPascalString(reader, 1);
        target.alphaChannelNames.push(value);
    }
}, function (writer, target) {
    for (var _i = 0, _a = target.alphaChannelNames; _i < _a.length; _i++) {
        var name_1 = _a[_i];
        writePascalString(writer, name_1, 1);
    }
});
addHandler(1045, function (target) { return target.alphaChannelNames !== undefined; }, function (reader, target, left) {
    target.alphaChannelNames = [];
    while (left()) {
        target.alphaChannelNames.push(readUnicodeString(reader));
    }
}, function (writer, target) {
    for (var _i = 0, _a = target.alphaChannelNames; _i < _a.length; _i++) {
        var name_2 = _a[_i];
        writeUnicodeStringWithPadding(writer, name_2);
    }
});
MOCK_HANDLERS && addHandler(1077, function (target) { return target._ir1077 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1077', left());
    target._ir1077 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir1077);
});
addHandler(1053, function (target) { return target.alphaIdentifiers !== undefined; }, function (reader, target, left) {
    target.alphaIdentifiers = [];
    while (left() >= 4) {
        target.alphaIdentifiers.push(readUint32(reader));
    }
}, function (writer, target) {
    for (var _i = 0, _a = target.alphaIdentifiers; _i < _a.length; _i++) {
        var id = _a[_i];
        writeUint32(writer, id);
    }
});
addHandler(1010, function (target) { return target.backgroundColor !== undefined; }, function (reader, target) { return target.backgroundColor = readColor(reader); }, function (writer, target) { return writeColor(writer, target.backgroundColor); });
addHandler(1037, function (target) { return target.globalAngle !== undefined; }, function (reader, target) { return target.globalAngle = readUint32(reader); }, function (writer, target) { return writeUint32(writer, target.globalAngle); });
addHandler(1049, function (target) { return target.globalAltitude !== undefined; }, function (reader, target) { return target.globalAltitude = readUint32(reader); }, function (writer, target) { return writeUint32(writer, target.globalAltitude); });
addHandler(1011, function (target) { return target.printFlags !== undefined; }, function (reader, target) {
    target.printFlags = {
        labels: !!readUint8(reader),
        cropMarks: !!readUint8(reader),
        colorBars: !!readUint8(reader),
        registrationMarks: !!readUint8(reader),
        negative: !!readUint8(reader),
        flip: !!readUint8(reader),
        interpolate: !!readUint8(reader),
        caption: !!readUint8(reader),
        printFlags: !!readUint8(reader),
    };
}, function (writer, target) {
    var flags = target.printFlags;
    writeUint8(writer, flags.labels ? 1 : 0);
    writeUint8(writer, flags.cropMarks ? 1 : 0);
    writeUint8(writer, flags.colorBars ? 1 : 0);
    writeUint8(writer, flags.registrationMarks ? 1 : 0);
    writeUint8(writer, flags.negative ? 1 : 0);
    writeUint8(writer, flags.flip ? 1 : 0);
    writeUint8(writer, flags.interpolate ? 1 : 0);
    writeUint8(writer, flags.caption ? 1 : 0);
    writeUint8(writer, flags.printFlags ? 1 : 0);
});
MOCK_HANDLERS && addHandler(10000, // Print flags
function (// Print flags
target) { return target._ir10000 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 10000', left());
    target._ir10000 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir10000);
});
MOCK_HANDLERS && addHandler(1013, // Color halftoning
function (// Color halftoning
target) { return target._ir1013 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1013', left());
    target._ir1013 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir1013);
});
MOCK_HANDLERS && addHandler(1016, // Color transfer functions
function (// Color transfer functions
target) { return target._ir1016 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1016', left());
    target._ir1016 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir1016);
});
addHandler(1024, function (target) { return target.layerState !== undefined; }, function (reader, target) { return target.layerState = readUint16(reader); }, function (writer, target) { return writeUint16(writer, target.layerState); });
addHandler(1026, function (target) { return target.layersGroup !== undefined; }, function (reader, target, left) {
    target.layersGroup = [];
    while (left()) {
        target.layersGroup.push(readUint16(reader));
    }
}, function (writer, target) {
    for (var _i = 0, _a = target.layersGroup; _i < _a.length; _i++) {
        var g = _a[_i];
        writeUint16(writer, g);
    }
});
addHandler(1072, function (target) { return target.layerGroupsEnabledId !== undefined; }, function (reader, target, left) {
    target.layerGroupsEnabledId = [];
    while (left()) {
        target.layerGroupsEnabledId.push(readUint8(reader));
    }
}, function (writer, target) {
    for (var _i = 0, _a = target.layerGroupsEnabledId; _i < _a.length; _i++) {
        var id = _a[_i];
        writeUint8(writer, id);
    }
});
addHandler(1069, function (target) { return target.layerSelectionIds !== undefined; }, function (reader, target) {
    var count = readUint16(reader);
    target.layerSelectionIds = [];
    while (count--) {
        target.layerSelectionIds.push(readUint32(reader));
    }
}, function (writer, target) {
    writeUint16(writer, target.layerSelectionIds.length);
    for (var _i = 0, _a = target.layerSelectionIds; _i < _a.length; _i++) {
        var id = _a[_i];
        writeUint32(writer, id);
    }
});
addHandler(1032, function (target) { return target.gridAndGuidesInformation !== undefined; }, function (reader, target) {
    var version = readUint32(reader);
    var horizontal = readUint32(reader);
    var vertical = readUint32(reader);
    var count = readUint32(reader);
    if (version !== 1)
        throw new Error("Invalid 1032 resource version: " + version);
    target.gridAndGuidesInformation = {
        grid: { horizontal: horizontal, vertical: vertical },
        guides: [],
    };
    for (var i = 0; i < count; i++) {
        target.gridAndGuidesInformation.guides.push({
            location: readUint32(reader) / 32,
            direction: readUint8(reader) ? 'horizontal' : 'vertical'
        });
    }
}, function (writer, target) {
    var info = target.gridAndGuidesInformation;
    var grid = info.grid || { horizontal: 18 * 32, vertical: 18 * 32 };
    var guides = info.guides || [];
    writeUint32(writer, 1);
    writeUint32(writer, grid.horizontal);
    writeUint32(writer, grid.vertical);
    writeUint32(writer, guides.length);
    for (var _i = 0, guides_1 = guides; _i < guides_1.length; _i++) {
        var g = guides_1[_i];
        writeUint32(writer, g.location * 32);
        writeUint8(writer, g.direction === 'horizontal' ? 1 : 0);
    }
});
addHandler(1054, function (target) { return target.urlsList !== undefined; }, function (reader, target, _, options) {
    var count = readUint32(reader);
    if (count) {
        if (!options.throwForMissingFeatures)
            return;
        throw new Error('Not implemented: URL List');
    }
    // TODO: read actual URL list
    target.urlsList = [];
}, function (writer, target) {
    writeUint32(writer, target.urlsList.length);
    // TODO: write actual URL list
    if (target.urlsList.length) {
        throw new Error('Not implemented: URL List');
    }
});
MOCK_HANDLERS && addHandler(1050, // Slices
function (// Slices
target) { return target._ir1050 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1050', left());
    target._ir1050 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir1050);
});
addHandler(1064, function (target) { return target.pixelAspectRatio !== undefined; }, function (reader, target) {
    if (readUint32(reader) > 2)
        throw new Error('Invalid pixelAspectRatio version');
    target.pixelAspectRatio = { aspect: readFloat64(reader) };
}, function (writer, target) {
    writeUint32(writer, 2); // version
    writeFloat64(writer, target.pixelAspectRatio.aspect);
});
addHandler(1041, function (target) { return target.iccUntaggedProfile !== undefined; }, function (reader, target) {
    target.iccUntaggedProfile = !!readUint8(reader);
}, function (writer, target) {
    writeUint8(writer, target.iccUntaggedProfile ? 1 : 0);
});
addHandler(1039, // ICC Profile
function (// ICC Profile
target) { return target._ir1039 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1039', left());
    target._ir1039 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir1039);
});
addHandler(1044, function (target) { return target.idsSeedNumber !== undefined; }, function (reader, target) { return target.idsSeedNumber = readUint32(reader); }, function (writer, target) { return writeUint32(writer, target.idsSeedNumber); });
addHandler(1036, function (target) { return target.thumbnail !== undefined || target.thumbnailRaw !== undefined; }, function (reader, target, left, options) {
    var format = readUint32(reader); // 1 = kJpegRGB, 0 = kRawRGB
    var width = readUint32(reader);
    var height = readUint32(reader);
    readUint32(reader); // widthBytes = (width * bits_per_pixel + 31) / 32 * 4.
    readUint32(reader); // totalSize = widthBytes * height * planes
    readUint32(reader); // sizeAfterCompression
    var bitsPerPixel = readUint16(reader); // 24
    var planes = readUint16(reader); // 1
    if (format !== 1 || bitsPerPixel !== 24 || planes !== 1) {
        options.logMissingFeatures && console.log("Invalid thumbnail data (format: " + format + ", bitsPerPixel: " + bitsPerPixel + ", planes: " + planes + ")");
        skipBytes(reader, left());
        return;
    }
    var size = left();
    var data = readBytes(reader, size);
    if (options.useRawThumbnail) {
        target.thumbnailRaw = { width: width, height: height, data: data };
    }
    else {
        target.thumbnail = createCanvasFromData(data);
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
        data = toByteArray(target.thumbnail.toDataURL('image/jpeg', 1).substr('data:image/jpeg;base64,'.length));
    }
    var bitsPerPixel = 24;
    var widthBytes = Math.floor((width * bitsPerPixel + 31) / 32) * 4;
    var planes = 1;
    var totalSize = widthBytes * height * planes;
    var sizeAfterCompression = data.length;
    writeUint32(writer, 1); // 1 = kJpegRGB
    writeUint32(writer, width);
    writeUint32(writer, height);
    writeUint32(writer, widthBytes);
    writeUint32(writer, totalSize);
    writeUint32(writer, sizeAfterCompression);
    writeUint16(writer, bitsPerPixel);
    writeUint16(writer, planes);
    writeBytes(writer, data);
});
addHandler(1057, function (target) { return target.versionInfo !== undefined; }, function (reader, target, left) {
    var version = readUint32(reader);
    if (version !== 1)
        throw new Error('Invalid versionInfo version');
    target.versionInfo = {
        hasRealMergedData: !!readUint8(reader),
        writerName: readUnicodeString(reader),
        readerName: readUnicodeString(reader),
        fileVersion: readUint32(reader),
    };
    skipBytes(reader, left());
}, function (writer, target) {
    var versionInfo = target.versionInfo;
    writeUint32(writer, 1); // version
    writeUint8(writer, versionInfo.hasRealMergedData ? 1 : 0);
    writeUnicodeString(writer, versionInfo.writerName);
    writeUnicodeString(writer, versionInfo.readerName);
    writeUint32(writer, versionInfo.fileVersion);
});
MOCK_HANDLERS && addHandler(1058, // EXIF data 1.
function (// EXIF data 1.
target) { return target._ir1058 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1058', left());
    target._ir1058 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir1058);
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
    var desc = readVersionAndDescriptor(reader);
    // console.log(require('util').inspect(desc, false, 99, true));
    target.pathSelectionState = desc['null'];
}, function (writer, target) {
    var desc = { 'null': target.pathSelectionState };
    writeVersionAndDescriptor(writer, '', 'null', desc);
});
MOCK_HANDLERS && addHandler(1025, function (target) { return target._ir1025 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1025', left());
    target._ir1025 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir1025);
});
var FrmD = createEnum('FrmD', '', {
    auto: 'Auto',
    none: 'None',
    dispose: 'Disp',
});
// TODO: Unfinished
MOCK_HANDLERS && addHandler(4000, // Plug-In resource(s)
function (// Plug-In resource(s)
target) { return target._ir4000 !== undefined; }, function (reader, target, left, _a) {
    var logMissingFeatures = _a.logMissingFeatures, logDevFeatures = _a.logDevFeatures;
    if (MOCK_HANDLERS) {
        LOG_MOCK_HANDLERS && console.log('image resource 4000', left());
        target._ir4000 = readBytes(reader, left());
        return;
    }
    var key = readSignature(reader);
    if (key === 'mani') {
        checkSignature(reader, 'IRFR');
        readSection(reader, 1, function (left) {
            var _loop_1 = function () {
                checkSignature(reader, '8BIM');
                var key_1 = readSignature(reader);
                readSection(reader, 1, function (left) {
                    if (key_1 === 'AnDs') {
                        var desc = readVersionAndDescriptor(reader);
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
                        var bytes = readBytes(reader, left());
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
        var bytes = readBytes(reader, left());
        logDevFeatures && console.log('#4000 mopt', bytes);
    }
    else {
        logMissingFeatures && console.log('Unhandled key in #4000:', key);
        return;
    }
}, function (writer, target) {
    writeBytes(writer, target._ir4000);
});
// TODO: Unfinished
MOCK_HANDLERS && addHandler(4001, // Plug-In resource(s)
function (// Plug-In resource(s)
target) { return target._ir4001 !== undefined; }, function (reader, target, left, _a) {
    var logMissingFeatures = _a.logMissingFeatures, logDevFeatures = _a.logDevFeatures;
    if (MOCK_HANDLERS) {
        LOG_MOCK_HANDLERS && console.log('image resource 4001', left());
        target._ir4001 = readBytes(reader, left());
        return;
    }
    var key = readSignature(reader);
    if (key === 'mfri') {
        var version = readUint32(reader);
        if (version !== 2)
            throw new Error('Invalid mfri version');
        var length_1 = readUint32(reader);
        var bytes = readBytes(reader, length_1);
        logDevFeatures && console.log('mfri', bytes);
    }
    else if (key === 'mset') {
        var desc = readVersionAndDescriptor(reader);
        logDevFeatures && console.log('mset', desc);
    }
    else {
        logMissingFeatures && console.log('Unhandled key in #4001', key);
    }
}, function (writer, target) {
    writeBytes(writer, target._ir4001);
});
// TODO: Unfinished
MOCK_HANDLERS && addHandler(4002, // Plug-In resource(s)
function (// Plug-In resource(s)
target) { return target._ir4002 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 4002', left());
    target._ir4002 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir4002);
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LFFBQU0sQ0FBQyxDQUFDO1FBQ3hDLGNBQWMsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztLQUM3QztTQUFNLElBQUksR0FBRyxLQUFLLE1BQU0sRUFBRTtRQUMxQixJQUFNLElBQUksR0FBRyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5QyxjQUFjLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDNUM7U0FBTTtRQUNOLGtCQUFrQixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxDQUFDLENBQUM7S0FDakU7QUFDRixDQUFDLEVBQ0QsVUFBQyxNQUFNLEVBQUUsTUFBTTtJQUNkLFVBQVUsQ0FBQyxNQUFNLEVBQUcsTUFBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FDRCxDQUFDO0FBRUYsbUJBQW1CO0FBQ25CLGFBQWEsSUFBSSxVQUFVLENBQzFCLElBQUksRUFBRSxzQkFBc0I7QUFDNUIsVUFETSxzQkFBc0I7QUFDNUIsTUFBTSxJQUFJLE9BQUMsTUFBYyxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQXJDLENBQXFDLEVBQy9DLFVBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJO0lBQ3BCLGlCQUFpQixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUMvRCxNQUFjLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUNyRCxDQUFDLEVBQ0QsVUFBQyxNQUFNLEVBQUUsTUFBTTtJQUNkLFVBQVUsQ0FBQyxNQUFNLEVBQUcsTUFBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FDRCxDQUFDIiwiZmlsZSI6ImltYWdlUmVzb3VyY2VzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdG9CeXRlQXJyYXkgfSBmcm9tICdiYXNlNjQtanMnO1xuaW1wb3J0IHsgSW1hZ2VSZXNvdXJjZXMsIFJlYWRPcHRpb25zLCBSZW5kZXJpbmdJbnRlbnQgfSBmcm9tICcuL3BzZCc7XG5pbXBvcnQge1xuXHRQc2RSZWFkZXIsIHJlYWRQYXNjYWxTdHJpbmcsIHJlYWRVbmljb2RlU3RyaW5nLCByZWFkVWludDMyLCByZWFkVWludDE2LCByZWFkVWludDgsIHJlYWRGbG9hdDY0LFxuXHRyZWFkQnl0ZXMsIHNraXBCeXRlcywgcmVhZEZsb2F0MzIsIHJlYWRJbnQxNiwgcmVhZEZpeGVkUG9pbnQzMiwgcmVhZFNpZ25hdHVyZSwgY2hlY2tTaWduYXR1cmUsXG5cdHJlYWRTZWN0aW9uLCByZWFkQ29sb3Jcbn0gZnJvbSAnLi9wc2RSZWFkZXInO1xuaW1wb3J0IHtcblx0UHNkV3JpdGVyLCB3cml0ZVBhc2NhbFN0cmluZywgd3JpdGVVbmljb2RlU3RyaW5nLCB3cml0ZVVpbnQzMiwgd3JpdGVVaW50OCwgd3JpdGVGbG9hdDY0LCB3cml0ZVVpbnQxNixcblx0d3JpdGVCeXRlcywgd3JpdGVJbnQxNiwgd3JpdGVGbG9hdDMyLCB3cml0ZUZpeGVkUG9pbnQzMiwgd3JpdGVVbmljb2RlU3RyaW5nV2l0aFBhZGRpbmcsIHdyaXRlQ29sb3IsXG59IGZyb20gJy4vcHNkV3JpdGVyJztcbmltcG9ydCB7IGNyZWF0ZUNhbnZhc0Zyb21EYXRhLCBjcmVhdGVFbnVtLCBNT0NLX0hBTkRMRVJTIH0gZnJvbSAnLi9oZWxwZXJzJztcbmltcG9ydCB7IGRlY29kZVN0cmluZywgZW5jb2RlU3RyaW5nIH0gZnJvbSAnLi91dGY4JztcbmltcG9ydCB7IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvciwgd3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvciB9IGZyb20gJy4vZGVzY3JpcHRvcic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVzb3VyY2VIYW5kbGVyIHtcblx0a2V5OiBudW1iZXI7XG5cdGhhczogKHRhcmdldDogSW1hZ2VSZXNvdXJjZXMpID0+IGJvb2xlYW47XG5cdHJlYWQ6IChyZWFkZXI6IFBzZFJlYWRlciwgdGFyZ2V0OiBJbWFnZVJlc291cmNlcywgbGVmdDogKCkgPT4gbnVtYmVyLCBvcHRpb25zOiBSZWFkT3B0aW9ucykgPT4gdm9pZDtcblx0d3JpdGU6ICh3cml0ZXI6IFBzZFdyaXRlciwgdGFyZ2V0OiBJbWFnZVJlc291cmNlcykgPT4gdm9pZDtcbn1cblxuZXhwb3J0IGNvbnN0IHJlc291cmNlSGFuZGxlcnM6IFJlc291cmNlSGFuZGxlcltdID0gW107XG5leHBvcnQgY29uc3QgcmVzb3VyY2VIYW5kbGVyc01hcDogeyBba2V5OiBudW1iZXJdOiBSZXNvdXJjZUhhbmRsZXIgfSA9IHt9O1xuXG5mdW5jdGlvbiBhZGRIYW5kbGVyKFxuXHRrZXk6IG51bWJlcixcblx0aGFzOiAodGFyZ2V0OiBJbWFnZVJlc291cmNlcykgPT4gYm9vbGVhbixcblx0cmVhZDogKHJlYWRlcjogUHNkUmVhZGVyLCB0YXJnZXQ6IEltYWdlUmVzb3VyY2VzLCBsZWZ0OiAoKSA9PiBudW1iZXIsIG9wdGlvbnM6IFJlYWRPcHRpb25zKSA9PiB2b2lkLFxuXHR3cml0ZTogKHdyaXRlcjogUHNkV3JpdGVyLCB0YXJnZXQ6IEltYWdlUmVzb3VyY2VzKSA9PiB2b2lkLFxuKSB7XG5cdGNvbnN0IGhhbmRsZXI6IFJlc291cmNlSGFuZGxlciA9IHsga2V5LCBoYXMsIHJlYWQsIHdyaXRlIH07XG5cdHJlc291cmNlSGFuZGxlcnMucHVzaChoYW5kbGVyKTtcblx0cmVzb3VyY2VIYW5kbGVyc01hcFtoYW5kbGVyLmtleV0gPSBoYW5kbGVyO1xufVxuXG5jb25zdCBMT0dfTU9DS19IQU5ETEVSUyA9IGZhbHNlO1xuY29uc3QgUkVTT0xVVElPTl9VTklUUyA9IFt1bmRlZmluZWQsICdQUEknLCAnUFBDTSddO1xuY29uc3QgTUVBU1VSRU1FTlRfVU5JVFMgPSBbdW5kZWZpbmVkLCAnSW5jaGVzJywgJ0NlbnRpbWV0ZXJzJywgJ1BvaW50cycsICdQaWNhcycsICdDb2x1bW5zJ107XG5jb25zdCBoZXggPSAnMDEyMzQ1Njc4OWFiY2RlZic7XG5cbmZ1bmN0aW9uIGNoYXJUb05pYmJsZShjb2RlOiBudW1iZXIpIHtcblx0cmV0dXJuIGNvZGUgPD0gNTcgPyBjb2RlIC0gNDggOiBjb2RlIC0gODc7XG59XG5cbmZ1bmN0aW9uIGJ5dGVBdCh2YWx1ZTogc3RyaW5nLCBpbmRleDogbnVtYmVyKSB7XG5cdHJldHVybiAoY2hhclRvTmliYmxlKHZhbHVlLmNoYXJDb2RlQXQoaW5kZXgpKSA8PCA0KSB8IGNoYXJUb05pYmJsZSh2YWx1ZS5jaGFyQ29kZUF0KGluZGV4ICsgMSkpO1xufVxuXG5mdW5jdGlvbiByZWFkVXRmOFN0cmluZyhyZWFkZXI6IFBzZFJlYWRlciwgbGVuZ3RoOiBudW1iZXIpIHtcblx0Y29uc3QgYnVmZmVyID0gcmVhZEJ5dGVzKHJlYWRlciwgbGVuZ3RoKTtcblx0cmV0dXJuIGRlY29kZVN0cmluZyhidWZmZXIpO1xufVxuXG5mdW5jdGlvbiB3cml0ZVV0ZjhTdHJpbmcod3JpdGVyOiBQc2RXcml0ZXIsIHZhbHVlOiBzdHJpbmcpIHtcblx0Y29uc3QgYnVmZmVyID0gZW5jb2RlU3RyaW5nKHZhbHVlKTtcblx0d3JpdGVCeXRlcyh3cml0ZXIsIGJ1ZmZlcik7XG59XG5cbk1PQ0tfSEFORExFUlMgJiYgYWRkSGFuZGxlcihcblx0MTAyOCwgLy8gSVBUQy1OQUEgcmVjb3JkXG5cdHRhcmdldCA9PiAodGFyZ2V0IGFzIGFueSkuX2lyMTAyOCAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRMT0dfTU9DS19IQU5ETEVSUyAmJiBjb25zb2xlLmxvZygnaW1hZ2UgcmVzb3VyY2UgMTAyOCcsIGxlZnQoKSk7XG5cdFx0KHRhcmdldCBhcyBhbnkpLl9pcjEwMjggPSByZWFkQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHR3cml0ZUJ5dGVzKHdyaXRlciwgKHRhcmdldCBhcyBhbnkpLl9pcjEwMjgpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0MTA2MSxcblx0dGFyZ2V0ID0+IHRhcmdldC5jYXB0aW9uRGlnZXN0ICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCkgPT4ge1xuXHRcdGxldCBjYXB0aW9uRGlnZXN0ID0gJyc7XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IDE2OyBpKyspIHtcblx0XHRcdGNvbnN0IGJ5dGUgPSByZWFkVWludDgocmVhZGVyKTtcblx0XHRcdGNhcHRpb25EaWdlc3QgKz0gaGV4W2J5dGUgPj4gNF07XG5cdFx0XHRjYXB0aW9uRGlnZXN0ICs9IGhleFtieXRlICYgMHhmXTtcblx0XHR9XG5cblx0XHR0YXJnZXQuY2FwdGlvbkRpZ2VzdCA9IGNhcHRpb25EaWdlc3Q7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMTY7IGkrKykge1xuXHRcdFx0d3JpdGVVaW50OCh3cml0ZXIsIGJ5dGVBdCh0YXJnZXQuY2FwdGlvbkRpZ2VzdCEsIGkgKiAyKSk7XG5cdFx0fVxuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0MTA2MCxcblx0dGFyZ2V0ID0+IHRhcmdldC54bXBNZXRhZGF0YSAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHRhcmdldC54bXBNZXRhZGF0YSA9IHJlYWRVdGY4U3RyaW5nKHJlYWRlciwgbGVmdCgpKSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB3cml0ZVV0ZjhTdHJpbmcod3JpdGVyLCB0YXJnZXQueG1wTWV0YWRhdGEhKSxcbik7XG5cbmNvbnN0IEludGUgPSBjcmVhdGVFbnVtPFJlbmRlcmluZ0ludGVudD4oJ0ludGUnLCAncGVyY2VwdHVhbCcsIHtcblx0J3BlcmNlcHR1YWwnOiAnSW1nICcsXG5cdCdzYXR1cmF0aW9uJzogJ0dycCAnLFxuXHQncmVsYXRpdmUgY29sb3JpbWV0cmljJzogJ0Nscm0nLFxuXHQnYWJzb2x1dGUgY29sb3JpbWV0cmljJzogJ0FDbHInLFxufSk7XG5cbmludGVyZmFjZSBQcmludEluZm9ybWF0aW9uRGVzY3JpcHRvciB7XG5cdCdObSAgJz86IHN0cmluZztcblx0Q2xyUz86IHN0cmluZztcblx0UHN0Uz86IGJvb2xlYW47XG5cdE1wQmw/OiBib29sZWFuO1xuXHRJbnRlPzogc3RyaW5nO1xuXHRoYXJkUHJvb2Y/OiBib29sZWFuO1xuXHRwcmludFNpeHRlZW5CaXQ/OiBib29sZWFuO1xuXHRwcmludGVyTmFtZT86IHN0cmluZztcblx0cHJpbnRQcm9vZlNldHVwPzoge1xuXHRcdEJsdG46IHN0cmluZztcblx0fSB8IHtcblx0XHRwcm9maWxlOiBzdHJpbmc7XG5cdFx0SW50ZTogc3RyaW5nO1xuXHRcdE1wQmw6IGJvb2xlYW47XG5cdFx0cGFwZXJXaGl0ZTogYm9vbGVhbjtcblx0fTtcbn1cblxuYWRkSGFuZGxlcihcblx0MTA4Mixcblx0dGFyZ2V0ID0+IHRhcmdldC5wcmludEluZm9ybWF0aW9uICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGRlc2M6IFByaW50SW5mb3JtYXRpb25EZXNjcmlwdG9yID0gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcik7XG5cblx0XHR0YXJnZXQucHJpbnRJbmZvcm1hdGlvbiA9IHtcblx0XHRcdHByaW50ZXJOYW1lOiBkZXNjLnByaW50ZXJOYW1lIHx8ICcnLFxuXHRcdFx0cmVuZGVyaW5nSW50ZW50OiBJbnRlLmRlY29kZShkZXNjLkludGUgPz8gJ0ludGUuSW1nICcpLFxuXHRcdH07XG5cblx0XHRjb25zdCBpbmZvID0gdGFyZ2V0LnByaW50SW5mb3JtYXRpb247XG5cblx0XHRpZiAoZGVzYy5Qc3RTICE9PSB1bmRlZmluZWQpIGluZm8ucHJpbnRlck1hbmFnZXNDb2xvcnMgPSBkZXNjLlBzdFM7XG5cdFx0aWYgKGRlc2NbJ05tICAnXSAhPT0gdW5kZWZpbmVkKSBpbmZvLnByaW50ZXJQcm9maWxlID0gZGVzY1snTm0gICddO1xuXHRcdGlmIChkZXNjLk1wQmwgIT09IHVuZGVmaW5lZCkgaW5mby5ibGFja1BvaW50Q29tcGVuc2F0aW9uID0gZGVzYy5NcEJsO1xuXHRcdGlmIChkZXNjLnByaW50U2l4dGVlbkJpdCAhPT0gdW5kZWZpbmVkKSBpbmZvLnByaW50U2l4dGVlbkJpdCA9IGRlc2MucHJpbnRTaXh0ZWVuQml0O1xuXHRcdGlmIChkZXNjLmhhcmRQcm9vZiAhPT0gdW5kZWZpbmVkKSBpbmZvLmhhcmRQcm9vZiA9IGRlc2MuaGFyZFByb29mO1xuXHRcdGlmIChkZXNjLnByaW50UHJvb2ZTZXR1cCkge1xuXHRcdFx0aWYgKCdCbHRuJyBpbiBkZXNjLnByaW50UHJvb2ZTZXR1cCkge1xuXHRcdFx0XHRpbmZvLnByb29mU2V0dXAgPSB7IGJ1aWx0aW46IGRlc2MucHJpbnRQcm9vZlNldHVwLkJsdG4uc3BsaXQoJy4nKVsxXSB9O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aW5mby5wcm9vZlNldHVwID0ge1xuXHRcdFx0XHRcdHByb2ZpbGU6IGRlc2MucHJpbnRQcm9vZlNldHVwLnByb2ZpbGUsXG5cdFx0XHRcdFx0cmVuZGVyaW5nSW50ZW50OiBJbnRlLmRlY29kZShkZXNjLnByaW50UHJvb2ZTZXR1cC5JbnRlID8/ICdJbnRlLkltZyAnKSxcblx0XHRcdFx0XHRibGFja1BvaW50Q29tcGVuc2F0aW9uOiAhIWRlc2MucHJpbnRQcm9vZlNldHVwLk1wQmwsXG5cdFx0XHRcdFx0cGFwZXJXaGl0ZTogISFkZXNjLnByaW50UHJvb2ZTZXR1cC5wYXBlcldoaXRlLFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgaW5mbyA9IHRhcmdldC5wcmludEluZm9ybWF0aW9uITtcblx0XHRjb25zdCBkZXNjOiBQcmludEluZm9ybWF0aW9uRGVzY3JpcHRvciA9IHt9O1xuXG5cdFx0aWYgKGluZm8ucHJpbnRlck1hbmFnZXNDb2xvcnMpIHtcblx0XHRcdGRlc2MuUHN0UyA9IHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChpbmZvLmhhcmRQcm9vZiAhPT0gdW5kZWZpbmVkKSBkZXNjLmhhcmRQcm9vZiA9ICEhaW5mby5oYXJkUHJvb2Y7XG5cdFx0XHRkZXNjLkNsclMgPSAnQ2xyUy5SR0JDJzsgLy8gVE9ETzogPz8/XG5cdFx0XHRkZXNjWydObSAgJ10gPSBpbmZvLnByaW50ZXJQcm9maWxlID8/ICdDSUUgUkdCJztcblx0XHR9XG5cblx0XHRkZXNjLkludGUgPSBJbnRlLmVuY29kZShpbmZvLnJlbmRlcmluZ0ludGVudCk7XG5cblx0XHRpZiAoIWluZm8ucHJpbnRlck1hbmFnZXNDb2xvcnMpIGRlc2MuTXBCbCA9ICEhaW5mby5ibGFja1BvaW50Q29tcGVuc2F0aW9uO1xuXG5cdFx0ZGVzYy5wcmludFNpeHRlZW5CaXQgPSAhIWluZm8ucHJpbnRTaXh0ZWVuQml0O1xuXHRcdGRlc2MucHJpbnRlck5hbWUgPSBpbmZvLnByaW50ZXJOYW1lIHx8ICcnO1xuXG5cdFx0aWYgKGluZm8ucHJvb2ZTZXR1cCAmJiAncHJvZmlsZScgaW4gaW5mby5wcm9vZlNldHVwKSB7XG5cdFx0XHRkZXNjLnByaW50UHJvb2ZTZXR1cCA9IHtcblx0XHRcdFx0cHJvZmlsZTogaW5mby5wcm9vZlNldHVwLnByb2ZpbGUgfHwgJycsXG5cdFx0XHRcdEludGU6IEludGUuZW5jb2RlKGluZm8ucHJvb2ZTZXR1cC5yZW5kZXJpbmdJbnRlbnQpLFxuXHRcdFx0XHRNcEJsOiAhIWluZm8ucHJvb2ZTZXR1cC5ibGFja1BvaW50Q29tcGVuc2F0aW9uLFxuXHRcdFx0XHRwYXBlcldoaXRlOiAhIWluZm8ucHJvb2ZTZXR1cC5wYXBlcldoaXRlLFxuXHRcdFx0fTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZGVzYy5wcmludFByb29mU2V0dXAgPSB7XG5cdFx0XHRcdEJsdG46IGluZm8ucHJvb2ZTZXR1cD8uYnVpbHRpbiA/IGBidWlsdGluUHJvb2YuJHtpbmZvLnByb29mU2V0dXAuYnVpbHRpbn1gIDogJ2J1aWx0aW5Qcm9vZi5wcm9vZkNNWUsnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHR3cml0ZVZlcnNpb25BbmREZXNjcmlwdG9yKHdyaXRlciwgJycsICdwcmludE91dHB1dCcsIGRlc2MpO1xuXHR9LFxuKTtcblxuTU9DS19IQU5ETEVSUyAmJiBhZGRIYW5kbGVyKFxuXHQxMDgzLCAvLyBQcmludCBzdHlsZVxuXHR0YXJnZXQgPT4gKHRhcmdldCBhcyBhbnkpLl9pcjEwODMgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0TE9HX01PQ0tfSEFORExFUlMgJiYgY29uc29sZS5sb2coJ2ltYWdlIHJlc291cmNlIDEwODMnLCBsZWZ0KCkpO1xuXHRcdCh0YXJnZXQgYXMgYW55KS5faXIxMDgzID0gcmVhZEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblxuXHRcdC8vIFRPRE86XG5cdFx0Ly8gY29uc3QgZGVzYyA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpO1xuXHRcdC8vIGNvbnNvbGUubG9nKCcxMDgzJywgcmVxdWlyZSgndXRpbCcpLmluc3BlY3QoZGVzYywgZmFsc2UsIDk5LCB0cnVlKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlQnl0ZXMod3JpdGVyLCAodGFyZ2V0IGFzIGFueSkuX2lyMTA4Myk7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQxMDA1LFxuXHR0YXJnZXQgPT4gdGFyZ2V0LnJlc29sdXRpb25JbmZvICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGhvcml6b250YWxSZXNvbHV0aW9uID0gcmVhZEZpeGVkUG9pbnQzMihyZWFkZXIpO1xuXHRcdGNvbnN0IGhvcml6b250YWxSZXNvbHV0aW9uVW5pdCA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRjb25zdCB3aWR0aFVuaXQgPSByZWFkVWludDE2KHJlYWRlcik7XG5cdFx0Y29uc3QgdmVydGljYWxSZXNvbHV0aW9uID0gcmVhZEZpeGVkUG9pbnQzMihyZWFkZXIpO1xuXHRcdGNvbnN0IHZlcnRpY2FsUmVzb2x1dGlvblVuaXQgPSByZWFkVWludDE2KHJlYWRlcik7XG5cdFx0Y29uc3QgaGVpZ2h0VW5pdCA9IHJlYWRVaW50MTYocmVhZGVyKTtcblxuXHRcdHRhcmdldC5yZXNvbHV0aW9uSW5mbyA9IHtcblx0XHRcdGhvcml6b250YWxSZXNvbHV0aW9uLFxuXHRcdFx0aG9yaXpvbnRhbFJlc29sdXRpb25Vbml0OiBSRVNPTFVUSU9OX1VOSVRTW2hvcml6b250YWxSZXNvbHV0aW9uVW5pdF0gfHwgJ1BQSScgYXMgYW55LFxuXHRcdFx0d2lkdGhVbml0OiBNRUFTVVJFTUVOVF9VTklUU1t3aWR0aFVuaXRdIHx8ICdJbmNoZXMnIGFzIGFueSxcblx0XHRcdHZlcnRpY2FsUmVzb2x1dGlvbixcblx0XHRcdHZlcnRpY2FsUmVzb2x1dGlvblVuaXQ6IFJFU09MVVRJT05fVU5JVFNbdmVydGljYWxSZXNvbHV0aW9uVW5pdF0gfHwgJ1BQSScgYXMgYW55LFxuXHRcdFx0aGVpZ2h0VW5pdDogTUVBU1VSRU1FTlRfVU5JVFNbaGVpZ2h0VW5pdF0gfHwgJ0luY2hlcycgYXMgYW55LFxuXHRcdH07XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGluZm8gPSB0YXJnZXQucmVzb2x1dGlvbkluZm8hO1xuXG5cdFx0d3JpdGVGaXhlZFBvaW50MzIod3JpdGVyLCBpbmZvLmhvcml6b250YWxSZXNvbHV0aW9uIHx8IDApO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgTWF0aC5tYXgoMSwgUkVTT0xVVElPTl9VTklUUy5pbmRleE9mKGluZm8uaG9yaXpvbnRhbFJlc29sdXRpb25Vbml0KSkpO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgTWF0aC5tYXgoMSwgTUVBU1VSRU1FTlRfVU5JVFMuaW5kZXhPZihpbmZvLndpZHRoVW5pdCkpKTtcblx0XHR3cml0ZUZpeGVkUG9pbnQzMih3cml0ZXIsIGluZm8udmVydGljYWxSZXNvbHV0aW9uIHx8IDApO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgTWF0aC5tYXgoMSwgUkVTT0xVVElPTl9VTklUUy5pbmRleE9mKGluZm8udmVydGljYWxSZXNvbHV0aW9uVW5pdCkpKTtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIE1hdGgubWF4KDEsIE1FQVNVUkVNRU5UX1VOSVRTLmluZGV4T2YoaW5mby5oZWlnaHRVbml0KSkpO1xuXHR9LFxuKTtcblxuY29uc3QgcHJpbnRTY2FsZVN0eWxlcyA9IFsnY2VudGVyZWQnLCAnc2l6ZSB0byBmaXQnLCAndXNlciBkZWZpbmVkJ107XG5cbmFkZEhhbmRsZXIoXG5cdDEwNjIsXG5cdHRhcmdldCA9PiB0YXJnZXQucHJpbnRTY2FsZSAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHtcblx0XHR0YXJnZXQucHJpbnRTY2FsZSA9IHtcblx0XHRcdHN0eWxlOiBwcmludFNjYWxlU3R5bGVzW3JlYWRJbnQxNihyZWFkZXIpXSBhcyBhbnksXG5cdFx0XHR4OiByZWFkRmxvYXQzMihyZWFkZXIpLFxuXHRcdFx0eTogcmVhZEZsb2F0MzIocmVhZGVyKSxcblx0XHRcdHNjYWxlOiByZWFkRmxvYXQzMihyZWFkZXIpLFxuXHRcdH07XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IHsgc3R5bGUsIHgsIHksIHNjYWxlIH0gPSB0YXJnZXQucHJpbnRTY2FsZSE7XG5cdFx0d3JpdGVJbnQxNih3cml0ZXIsIE1hdGgubWF4KDAsIHByaW50U2NhbGVTdHlsZXMuaW5kZXhPZihzdHlsZSEpKSk7XG5cdFx0d3JpdGVGbG9hdDMyKHdyaXRlciwgeCB8fCAwKTtcblx0XHR3cml0ZUZsb2F0MzIod3JpdGVyLCB5IHx8IDApO1xuXHRcdHdyaXRlRmxvYXQzMih3cml0ZXIsIHNjYWxlIHx8IDApO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0MTAwNixcblx0dGFyZ2V0ID0+IHRhcmdldC5hbHBoYUNoYW5uZWxOYW1lcyAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHR0YXJnZXQuYWxwaGFDaGFubmVsTmFtZXMgPSBbXTtcblxuXHRcdHdoaWxlIChsZWZ0KCkpIHtcblx0XHRcdGNvbnN0IHZhbHVlID0gcmVhZFBhc2NhbFN0cmluZyhyZWFkZXIsIDEpO1xuXHRcdFx0dGFyZ2V0LmFscGhhQ2hhbm5lbE5hbWVzLnB1c2godmFsdWUpO1xuXHRcdH1cblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Zm9yIChjb25zdCBuYW1lIG9mIHRhcmdldC5hbHBoYUNoYW5uZWxOYW1lcyEpIHtcblx0XHRcdHdyaXRlUGFzY2FsU3RyaW5nKHdyaXRlciwgbmFtZSwgMSk7XG5cdFx0fVxuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0MTA0NSxcblx0dGFyZ2V0ID0+IHRhcmdldC5hbHBoYUNoYW5uZWxOYW1lcyAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHR0YXJnZXQuYWxwaGFDaGFubmVsTmFtZXMgPSBbXTtcblxuXHRcdHdoaWxlIChsZWZ0KCkpIHtcblx0XHRcdHRhcmdldC5hbHBoYUNoYW5uZWxOYW1lcy5wdXNoKHJlYWRVbmljb2RlU3RyaW5nKHJlYWRlcikpO1xuXHRcdH1cblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Zm9yIChjb25zdCBuYW1lIG9mIHRhcmdldC5hbHBoYUNoYW5uZWxOYW1lcyEpIHtcblx0XHRcdHdyaXRlVW5pY29kZVN0cmluZ1dpdGhQYWRkaW5nKHdyaXRlciwgbmFtZSk7XG5cdFx0fVxuXHR9LFxuKTtcblxuTU9DS19IQU5ETEVSUyAmJiBhZGRIYW5kbGVyKFxuXHQxMDc3LFxuXHR0YXJnZXQgPT4gKHRhcmdldCBhcyBhbnkpLl9pcjEwNzcgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0TE9HX01PQ0tfSEFORExFUlMgJiYgY29uc29sZS5sb2coJ2ltYWdlIHJlc291cmNlIDEwNzcnLCBsZWZ0KCkpO1xuXHRcdCh0YXJnZXQgYXMgYW55KS5faXIxMDc3ID0gcmVhZEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVCeXRlcyh3cml0ZXIsICh0YXJnZXQgYXMgYW55KS5faXIxMDc3KTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDEwNTMsXG5cdHRhcmdldCA9PiB0YXJnZXQuYWxwaGFJZGVudGlmaWVycyAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHR0YXJnZXQuYWxwaGFJZGVudGlmaWVycyA9IFtdO1xuXG5cdFx0d2hpbGUgKGxlZnQoKSA+PSA0KSB7XG5cdFx0XHR0YXJnZXQuYWxwaGFJZGVudGlmaWVycy5wdXNoKHJlYWRVaW50MzIocmVhZGVyKSk7XG5cdFx0fVxuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRmb3IgKGNvbnN0IGlkIG9mIHRhcmdldC5hbHBoYUlkZW50aWZpZXJzISkge1xuXHRcdFx0d3JpdGVVaW50MzIod3JpdGVyLCBpZCk7XG5cdFx0fVxuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0MTAxMCxcblx0dGFyZ2V0ID0+IHRhcmdldC5iYWNrZ3JvdW5kQ29sb3IgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB0YXJnZXQuYmFja2dyb3VuZENvbG9yID0gcmVhZENvbG9yKHJlYWRlciksXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4gd3JpdGVDb2xvcih3cml0ZXIsIHRhcmdldC5iYWNrZ3JvdW5kQ29sb3IhKSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDEwMzcsXG5cdHRhcmdldCA9PiB0YXJnZXQuZ2xvYmFsQW5nbGUgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB0YXJnZXQuZ2xvYmFsQW5nbGUgPSByZWFkVWludDMyKHJlYWRlciksXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4gd3JpdGVVaW50MzIod3JpdGVyLCB0YXJnZXQuZ2xvYmFsQW5nbGUhKSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDEwNDksXG5cdHRhcmdldCA9PiB0YXJnZXQuZ2xvYmFsQWx0aXR1ZGUgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB0YXJnZXQuZ2xvYmFsQWx0aXR1ZGUgPSByZWFkVWludDMyKHJlYWRlciksXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4gd3JpdGVVaW50MzIod3JpdGVyLCB0YXJnZXQuZ2xvYmFsQWx0aXR1ZGUhKSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDEwMTEsXG5cdHRhcmdldCA9PiB0YXJnZXQucHJpbnRGbGFncyAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHtcblx0XHR0YXJnZXQucHJpbnRGbGFncyA9IHtcblx0XHRcdGxhYmVsczogISFyZWFkVWludDgocmVhZGVyKSxcblx0XHRcdGNyb3BNYXJrczogISFyZWFkVWludDgocmVhZGVyKSxcblx0XHRcdGNvbG9yQmFyczogISFyZWFkVWludDgocmVhZGVyKSxcblx0XHRcdHJlZ2lzdHJhdGlvbk1hcmtzOiAhIXJlYWRVaW50OChyZWFkZXIpLFxuXHRcdFx0bmVnYXRpdmU6ICEhcmVhZFVpbnQ4KHJlYWRlciksXG5cdFx0XHRmbGlwOiAhIXJlYWRVaW50OChyZWFkZXIpLFxuXHRcdFx0aW50ZXJwb2xhdGU6ICEhcmVhZFVpbnQ4KHJlYWRlciksXG5cdFx0XHRjYXB0aW9uOiAhIXJlYWRVaW50OChyZWFkZXIpLFxuXHRcdFx0cHJpbnRGbGFnczogISFyZWFkVWludDgocmVhZGVyKSxcblx0XHR9O1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBmbGFncyA9IHRhcmdldC5wcmludEZsYWdzITtcblx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgZmxhZ3MubGFiZWxzID8gMSA6IDApO1xuXHRcdHdyaXRlVWludDgod3JpdGVyLCBmbGFncy5jcm9wTWFya3MgPyAxIDogMCk7XG5cdFx0d3JpdGVVaW50OCh3cml0ZXIsIGZsYWdzLmNvbG9yQmFycyA/IDEgOiAwKTtcblx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgZmxhZ3MucmVnaXN0cmF0aW9uTWFya3MgPyAxIDogMCk7XG5cdFx0d3JpdGVVaW50OCh3cml0ZXIsIGZsYWdzLm5lZ2F0aXZlID8gMSA6IDApO1xuXHRcdHdyaXRlVWludDgod3JpdGVyLCBmbGFncy5mbGlwID8gMSA6IDApO1xuXHRcdHdyaXRlVWludDgod3JpdGVyLCBmbGFncy5pbnRlcnBvbGF0ZSA/IDEgOiAwKTtcblx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgZmxhZ3MuY2FwdGlvbiA/IDEgOiAwKTtcblx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgZmxhZ3MucHJpbnRGbGFncyA/IDEgOiAwKTtcblx0fSxcbik7XG5cbk1PQ0tfSEFORExFUlMgJiYgYWRkSGFuZGxlcihcblx0MTAwMDAsIC8vIFByaW50IGZsYWdzXG5cdHRhcmdldCA9PiAodGFyZ2V0IGFzIGFueSkuX2lyMTAwMDAgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0TE9HX01PQ0tfSEFORExFUlMgJiYgY29uc29sZS5sb2coJ2ltYWdlIHJlc291cmNlIDEwMDAwJywgbGVmdCgpKTtcblx0XHQodGFyZ2V0IGFzIGFueSkuX2lyMTAwMDAgPSByZWFkQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHR3cml0ZUJ5dGVzKHdyaXRlciwgKHRhcmdldCBhcyBhbnkpLl9pcjEwMDAwKTtcblx0fSxcbik7XG5cbk1PQ0tfSEFORExFUlMgJiYgYWRkSGFuZGxlcihcblx0MTAxMywgLy8gQ29sb3IgaGFsZnRvbmluZ1xuXHR0YXJnZXQgPT4gKHRhcmdldCBhcyBhbnkpLl9pcjEwMTMgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0TE9HX01PQ0tfSEFORExFUlMgJiYgY29uc29sZS5sb2coJ2ltYWdlIHJlc291cmNlIDEwMTMnLCBsZWZ0KCkpO1xuXHRcdCh0YXJnZXQgYXMgYW55KS5faXIxMDEzID0gcmVhZEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVCeXRlcyh3cml0ZXIsICh0YXJnZXQgYXMgYW55KS5faXIxMDEzKTtcblx0fSxcbik7XG5cbk1PQ0tfSEFORExFUlMgJiYgYWRkSGFuZGxlcihcblx0MTAxNiwgLy8gQ29sb3IgdHJhbnNmZXIgZnVuY3Rpb25zXG5cdHRhcmdldCA9PiAodGFyZ2V0IGFzIGFueSkuX2lyMTAxNiAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRMT0dfTU9DS19IQU5ETEVSUyAmJiBjb25zb2xlLmxvZygnaW1hZ2UgcmVzb3VyY2UgMTAxNicsIGxlZnQoKSk7XG5cdFx0KHRhcmdldCBhcyBhbnkpLl9pcjEwMTYgPSByZWFkQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHR3cml0ZUJ5dGVzKHdyaXRlciwgKHRhcmdldCBhcyBhbnkpLl9pcjEwMTYpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0MTAyNCxcblx0dGFyZ2V0ID0+IHRhcmdldC5sYXllclN0YXRlICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCkgPT4gdGFyZ2V0LmxheWVyU3RhdGUgPSByZWFkVWludDE2KHJlYWRlciksXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4gd3JpdGVVaW50MTYod3JpdGVyLCB0YXJnZXQubGF5ZXJTdGF0ZSEpLFxuKTtcblxuYWRkSGFuZGxlcihcblx0MTAyNixcblx0dGFyZ2V0ID0+IHRhcmdldC5sYXllcnNHcm91cCAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHR0YXJnZXQubGF5ZXJzR3JvdXAgPSBbXTtcblxuXHRcdHdoaWxlIChsZWZ0KCkpIHtcblx0XHRcdHRhcmdldC5sYXllcnNHcm91cC5wdXNoKHJlYWRVaW50MTYocmVhZGVyKSk7XG5cdFx0fVxuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRmb3IgKGNvbnN0IGcgb2YgdGFyZ2V0LmxheWVyc0dyb3VwISkge1xuXHRcdFx0d3JpdGVVaW50MTYod3JpdGVyLCBnKTtcblx0XHR9XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQxMDcyLFxuXHR0YXJnZXQgPT4gdGFyZ2V0LmxheWVyR3JvdXBzRW5hYmxlZElkICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdHRhcmdldC5sYXllckdyb3Vwc0VuYWJsZWRJZCA9IFtdO1xuXG5cdFx0d2hpbGUgKGxlZnQoKSkge1xuXHRcdFx0dGFyZ2V0LmxheWVyR3JvdXBzRW5hYmxlZElkLnB1c2gocmVhZFVpbnQ4KHJlYWRlcikpO1xuXHRcdH1cblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Zm9yIChjb25zdCBpZCBvZiB0YXJnZXQubGF5ZXJHcm91cHNFbmFibGVkSWQhKSB7XG5cdFx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgaWQpO1xuXHRcdH1cblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDEwNjksXG5cdHRhcmdldCA9PiB0YXJnZXQubGF5ZXJTZWxlY3Rpb25JZHMgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0bGV0IGNvdW50ID0gcmVhZFVpbnQxNihyZWFkZXIpO1xuXHRcdHRhcmdldC5sYXllclNlbGVjdGlvbklkcyA9IFtdO1xuXG5cdFx0d2hpbGUgKGNvdW50LS0pIHtcblx0XHRcdHRhcmdldC5sYXllclNlbGVjdGlvbklkcy5wdXNoKHJlYWRVaW50MzIocmVhZGVyKSk7XG5cdFx0fVxuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIHRhcmdldC5sYXllclNlbGVjdGlvbklkcyEubGVuZ3RoKTtcblxuXHRcdGZvciAoY29uc3QgaWQgb2YgdGFyZ2V0LmxheWVyU2VsZWN0aW9uSWRzISkge1xuXHRcdFx0d3JpdGVVaW50MzIod3JpdGVyLCBpZCk7XG5cdFx0fVxuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0MTAzMixcblx0dGFyZ2V0ID0+IHRhcmdldC5ncmlkQW5kR3VpZGVzSW5mb3JtYXRpb24gIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgdmVyc2lvbiA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHRjb25zdCBob3Jpem9udGFsID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXHRcdGNvbnN0IHZlcnRpY2FsID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXHRcdGNvbnN0IGNvdW50ID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXG5cdFx0aWYgKHZlcnNpb24gIT09IDEpIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAxMDMyIHJlc291cmNlIHZlcnNpb246ICR7dmVyc2lvbn1gKTtcblxuXHRcdHRhcmdldC5ncmlkQW5kR3VpZGVzSW5mb3JtYXRpb24gPSB7XG5cdFx0XHRncmlkOiB7IGhvcml6b250YWwsIHZlcnRpY2FsIH0sXG5cdFx0XHRndWlkZXM6IFtdLFxuXHRcdH07XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcblx0XHRcdHRhcmdldC5ncmlkQW5kR3VpZGVzSW5mb3JtYXRpb24uZ3VpZGVzIS5wdXNoKHtcblx0XHRcdFx0bG9jYXRpb246IHJlYWRVaW50MzIocmVhZGVyKSAvIDMyLFxuXHRcdFx0XHRkaXJlY3Rpb246IHJlYWRVaW50OChyZWFkZXIpID8gJ2hvcml6b250YWwnIDogJ3ZlcnRpY2FsJ1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBpbmZvID0gdGFyZ2V0LmdyaWRBbmRHdWlkZXNJbmZvcm1hdGlvbiE7XG5cdFx0Y29uc3QgZ3JpZCA9IGluZm8uZ3JpZCB8fCB7IGhvcml6b250YWw6IDE4ICogMzIsIHZlcnRpY2FsOiAxOCAqIDMyIH07XG5cdFx0Y29uc3QgZ3VpZGVzID0gaW5mby5ndWlkZXMgfHwgW107XG5cblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIDEpO1xuXHRcdHdyaXRlVWludDMyKHdyaXRlciwgZ3JpZC5ob3Jpem9udGFsKTtcblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIGdyaWQudmVydGljYWwpO1xuXHRcdHdyaXRlVWludDMyKHdyaXRlciwgZ3VpZGVzLmxlbmd0aCk7XG5cblx0XHRmb3IgKGNvbnN0IGcgb2YgZ3VpZGVzKSB7XG5cdFx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIGcubG9jYXRpb24gKiAzMik7XG5cdFx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgZy5kaXJlY3Rpb24gPT09ICdob3Jpem9udGFsJyA/IDEgOiAwKTtcblx0XHR9XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQxMDU0LFxuXHR0YXJnZXQgPT4gdGFyZ2V0LnVybHNMaXN0ICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCwgXywgb3B0aW9ucykgPT4ge1xuXHRcdGNvbnN0IGNvdW50ID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXG5cdFx0aWYgKGNvdW50KSB7XG5cdFx0XHRpZiAoIW9wdGlvbnMudGhyb3dGb3JNaXNzaW5nRmVhdHVyZXMpIHJldHVybjtcblx0XHRcdHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkOiBVUkwgTGlzdCcpO1xuXHRcdH1cblxuXHRcdC8vIFRPRE86IHJlYWQgYWN0dWFsIFVSTCBsaXN0XG5cdFx0dGFyZ2V0LnVybHNMaXN0ID0gW107XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlVWludDMyKHdyaXRlciwgdGFyZ2V0LnVybHNMaXN0IS5sZW5ndGgpO1xuXG5cdFx0Ly8gVE9ETzogd3JpdGUgYWN0dWFsIFVSTCBsaXN0XG5cdFx0aWYgKHRhcmdldC51cmxzTGlzdCEubGVuZ3RoKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZDogVVJMIExpc3QnKTtcblx0XHR9XG5cdH0sXG4pO1xuXG5NT0NLX0hBTkRMRVJTICYmIGFkZEhhbmRsZXIoXG5cdDEwNTAsIC8vIFNsaWNlc1xuXHR0YXJnZXQgPT4gKHRhcmdldCBhcyBhbnkpLl9pcjEwNTAgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0TE9HX01PQ0tfSEFORExFUlMgJiYgY29uc29sZS5sb2coJ2ltYWdlIHJlc291cmNlIDEwNTAnLCBsZWZ0KCkpO1xuXHRcdCh0YXJnZXQgYXMgYW55KS5faXIxMDUwID0gcmVhZEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVCeXRlcyh3cml0ZXIsICh0YXJnZXQgYXMgYW55KS5faXIxMDUwKTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDEwNjQsXG5cdHRhcmdldCA9PiB0YXJnZXQucGl4ZWxBc3BlY3RSYXRpbyAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHtcblx0XHRpZiAocmVhZFVpbnQzMihyZWFkZXIpID4gMikgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHBpeGVsQXNwZWN0UmF0aW8gdmVyc2lvbicpO1xuXHRcdHRhcmdldC5waXhlbEFzcGVjdFJhdGlvID0geyBhc3BlY3Q6IHJlYWRGbG9hdDY0KHJlYWRlcikgfTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVVaW50MzIod3JpdGVyLCAyKTsgLy8gdmVyc2lvblxuXHRcdHdyaXRlRmxvYXQ2NCh3cml0ZXIsIHRhcmdldC5waXhlbEFzcGVjdFJhdGlvIS5hc3BlY3QpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0MTA0MSxcblx0dGFyZ2V0ID0+IHRhcmdldC5pY2NVbnRhZ2dlZFByb2ZpbGUgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0dGFyZ2V0LmljY1VudGFnZ2VkUHJvZmlsZSA9ICEhcmVhZFVpbnQ4KHJlYWRlcik7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlVWludDgod3JpdGVyLCB0YXJnZXQuaWNjVW50YWdnZWRQcm9maWxlID8gMSA6IDApO1xuXHR9LFxuKTtcblxuTU9DS19IQU5ETEVSUyAmJiBhZGRIYW5kbGVyKFxuXHQxMDM5LCAvLyBJQ0MgUHJvZmlsZVxuXHR0YXJnZXQgPT4gKHRhcmdldCBhcyBhbnkpLl9pcjEwMzkgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0TE9HX01PQ0tfSEFORExFUlMgJiYgY29uc29sZS5sb2coJ2ltYWdlIHJlc291cmNlIDEwMzknLCBsZWZ0KCkpO1xuXHRcdCh0YXJnZXQgYXMgYW55KS5faXIxMDM5ID0gcmVhZEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVCeXRlcyh3cml0ZXIsICh0YXJnZXQgYXMgYW55KS5faXIxMDM5KTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDEwNDQsXG5cdHRhcmdldCA9PiB0YXJnZXQuaWRzU2VlZE51bWJlciAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHRhcmdldC5pZHNTZWVkTnVtYmVyID0gcmVhZFVpbnQzMihyZWFkZXIpLFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHdyaXRlVWludDMyKHdyaXRlciwgdGFyZ2V0Lmlkc1NlZWROdW1iZXIhKSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDEwMzYsXG5cdHRhcmdldCA9PiB0YXJnZXQudGh1bWJuYWlsICE9PSB1bmRlZmluZWQgfHwgdGFyZ2V0LnRodW1ibmFpbFJhdyAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQsIG9wdGlvbnMpID0+IHtcblx0XHRjb25zdCBmb3JtYXQgPSByZWFkVWludDMyKHJlYWRlcik7IC8vIDEgPSBrSnBlZ1JHQiwgMCA9IGtSYXdSR0Jcblx0XHRjb25zdCB3aWR0aCA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHRjb25zdCBoZWlnaHQgPSByZWFkVWludDMyKHJlYWRlcik7XG5cdFx0cmVhZFVpbnQzMihyZWFkZXIpOyAvLyB3aWR0aEJ5dGVzID0gKHdpZHRoICogYml0c19wZXJfcGl4ZWwgKyAzMSkgLyAzMiAqIDQuXG5cdFx0cmVhZFVpbnQzMihyZWFkZXIpOyAvLyB0b3RhbFNpemUgPSB3aWR0aEJ5dGVzICogaGVpZ2h0ICogcGxhbmVzXG5cdFx0cmVhZFVpbnQzMihyZWFkZXIpOyAvLyBzaXplQWZ0ZXJDb21wcmVzc2lvblxuXHRcdGNvbnN0IGJpdHNQZXJQaXhlbCA9IHJlYWRVaW50MTYocmVhZGVyKTsgLy8gMjRcblx0XHRjb25zdCBwbGFuZXMgPSByZWFkVWludDE2KHJlYWRlcik7IC8vIDFcblxuXHRcdGlmIChmb3JtYXQgIT09IDEgfHwgYml0c1BlclBpeGVsICE9PSAyNCB8fCBwbGFuZXMgIT09IDEpIHtcblx0XHRcdG9wdGlvbnMubG9nTWlzc2luZ0ZlYXR1cmVzICYmIGNvbnNvbGUubG9nKGBJbnZhbGlkIHRodW1ibmFpbCBkYXRhIChmb3JtYXQ6ICR7Zm9ybWF0fSwgYml0c1BlclBpeGVsOiAke2JpdHNQZXJQaXhlbH0sIHBsYW5lczogJHtwbGFuZXN9KWApO1xuXHRcdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBzaXplID0gbGVmdCgpO1xuXHRcdGNvbnN0IGRhdGEgPSByZWFkQnl0ZXMocmVhZGVyLCBzaXplKTtcblxuXHRcdGlmIChvcHRpb25zLnVzZVJhd1RodW1ibmFpbCkge1xuXHRcdFx0dGFyZ2V0LnRodW1ibmFpbFJhdyA9IHsgd2lkdGgsIGhlaWdodCwgZGF0YSB9O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0YXJnZXQudGh1bWJuYWlsID0gY3JlYXRlQ2FudmFzRnJvbURhdGEoZGF0YSk7XG5cdFx0fVxuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRsZXQgd2lkdGggPSAwO1xuXHRcdGxldCBoZWlnaHQgPSAwO1xuXHRcdGxldCBkYXRhOiBVaW50OEFycmF5O1xuXG5cdFx0aWYgKHRhcmdldC50aHVtYm5haWxSYXcpIHtcblx0XHRcdHdpZHRoID0gdGFyZ2V0LnRodW1ibmFpbFJhdy53aWR0aDtcblx0XHRcdGhlaWdodCA9IHRhcmdldC50aHVtYm5haWxSYXcuaGVpZ2h0O1xuXHRcdFx0ZGF0YSA9IHRhcmdldC50aHVtYm5haWxSYXcuZGF0YTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKCF0YXJnZXQudGh1bWJuYWlsKSB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgdGh1bWJuYWlsJyk7XG5cdFx0XHR3aWR0aCA9IHRhcmdldC50aHVtYm5haWwud2lkdGg7XG5cdFx0XHRoZWlnaHQgPSB0YXJnZXQudGh1bWJuYWlsLmhlaWdodDtcblx0XHRcdGRhdGEgPSB0b0J5dGVBcnJheSh0YXJnZXQudGh1bWJuYWlsLnRvRGF0YVVSTCgnaW1hZ2UvanBlZycsIDEpLnN1YnN0cignZGF0YTppbWFnZS9qcGVnO2Jhc2U2NCwnLmxlbmd0aCkpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGJpdHNQZXJQaXhlbCA9IDI0O1xuXHRcdGNvbnN0IHdpZHRoQnl0ZXMgPSBNYXRoLmZsb29yKCh3aWR0aCAqIGJpdHNQZXJQaXhlbCArIDMxKSAvIDMyKSAqIDQ7XG5cdFx0Y29uc3QgcGxhbmVzID0gMTtcblx0XHRjb25zdCB0b3RhbFNpemUgPSB3aWR0aEJ5dGVzICogaGVpZ2h0ICogcGxhbmVzO1xuXHRcdGNvbnN0IHNpemVBZnRlckNvbXByZXNzaW9uID0gZGF0YS5sZW5ndGg7XG5cblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIDEpOyAvLyAxID0ga0pwZWdSR0Jcblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIHdpZHRoKTtcblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIGhlaWdodCk7XG5cdFx0d3JpdGVVaW50MzIod3JpdGVyLCB3aWR0aEJ5dGVzKTtcblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIHRvdGFsU2l6ZSk7XG5cdFx0d3JpdGVVaW50MzIod3JpdGVyLCBzaXplQWZ0ZXJDb21wcmVzc2lvbik7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBiaXRzUGVyUGl4ZWwpO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgcGxhbmVzKTtcblx0XHR3cml0ZUJ5dGVzKHdyaXRlciwgZGF0YSk7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQxMDU3LFxuXHR0YXJnZXQgPT4gdGFyZ2V0LnZlcnNpb25JbmZvICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdGNvbnN0IHZlcnNpb24gPSByZWFkVWludDMyKHJlYWRlcik7XG5cdFx0aWYgKHZlcnNpb24gIT09IDEpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB2ZXJzaW9uSW5mbyB2ZXJzaW9uJyk7XG5cblx0XHR0YXJnZXQudmVyc2lvbkluZm8gPSB7XG5cdFx0XHRoYXNSZWFsTWVyZ2VkRGF0YTogISFyZWFkVWludDgocmVhZGVyKSxcblx0XHRcdHdyaXRlck5hbWU6IHJlYWRVbmljb2RlU3RyaW5nKHJlYWRlciksXG5cdFx0XHRyZWFkZXJOYW1lOiByZWFkVW5pY29kZVN0cmluZyhyZWFkZXIpLFxuXHRcdFx0ZmlsZVZlcnNpb246IHJlYWRVaW50MzIocmVhZGVyKSxcblx0XHR9O1xuXG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgdmVyc2lvbkluZm8gPSB0YXJnZXQudmVyc2lvbkluZm8hO1xuXHRcdHdyaXRlVWludDMyKHdyaXRlciwgMSk7IC8vIHZlcnNpb25cblx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgdmVyc2lvbkluZm8uaGFzUmVhbE1lcmdlZERhdGEgPyAxIDogMCk7XG5cdFx0d3JpdGVVbmljb2RlU3RyaW5nKHdyaXRlciwgdmVyc2lvbkluZm8ud3JpdGVyTmFtZSk7XG5cdFx0d3JpdGVVbmljb2RlU3RyaW5nKHdyaXRlciwgdmVyc2lvbkluZm8ucmVhZGVyTmFtZSk7XG5cdFx0d3JpdGVVaW50MzIod3JpdGVyLCB2ZXJzaW9uSW5mby5maWxlVmVyc2lvbik7XG5cdH0sXG4pO1xuXG5NT0NLX0hBTkRMRVJTICYmIGFkZEhhbmRsZXIoXG5cdDEwNTgsIC8vIEVYSUYgZGF0YSAxLlxuXHR0YXJnZXQgPT4gKHRhcmdldCBhcyBhbnkpLl9pcjEwNTggIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0TE9HX01PQ0tfSEFORExFUlMgJiYgY29uc29sZS5sb2coJ2ltYWdlIHJlc291cmNlIDEwNTgnLCBsZWZ0KCkpO1xuXHRcdCh0YXJnZXQgYXMgYW55KS5faXIxMDU4ID0gcmVhZEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVCeXRlcyh3cml0ZXIsICh0YXJnZXQgYXMgYW55KS5faXIxMDU4KTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDcwMDAsXG5cdHRhcmdldCA9PiB0YXJnZXQuaW1hZ2VSZWFkeVZhcmlhYmxlcyAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHR0YXJnZXQuaW1hZ2VSZWFkeVZhcmlhYmxlcyA9IHJlYWRVdGY4U3RyaW5nKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVVdGY4U3RyaW5nKHdyaXRlciwgdGFyZ2V0LmltYWdlUmVhZHlWYXJpYWJsZXMhKTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdDcwMDEsXG5cdHRhcmdldCA9PiB0YXJnZXQuaW1hZ2VSZWFkeURhdGFTZXRzICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdHRhcmdldC5pbWFnZVJlYWR5RGF0YVNldHMgPSByZWFkVXRmOFN0cmluZyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlVXRmOFN0cmluZyh3cml0ZXIsIHRhcmdldC5pbWFnZVJlYWR5RGF0YVNldHMhKTtcblx0fSxcbik7XG5cbmludGVyZmFjZSBEZXNjcmlwdG9yMTA4OCB7XG5cdCdudWxsJzogc3RyaW5nW107XG59XG5cbmFkZEhhbmRsZXIoXG5cdDEwODgsXG5cdHRhcmdldCA9PiB0YXJnZXQucGF0aFNlbGVjdGlvblN0YXRlICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCwgX2xlZnQpID0+IHtcblx0XHRjb25zdCBkZXNjOiBEZXNjcmlwdG9yMTA4OCA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpO1xuXHRcdC8vIGNvbnNvbGUubG9nKHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KGRlc2MsIGZhbHNlLCA5OSwgdHJ1ZSkpO1xuXHRcdHRhcmdldC5wYXRoU2VsZWN0aW9uU3RhdGUgPSBkZXNjWydudWxsJ107XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGRlc2M6IERlc2NyaXB0b3IxMDg4ID0geyAnbnVsbCc6IHRhcmdldC5wYXRoU2VsZWN0aW9uU3RhdGUhIH07XG5cdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnbnVsbCcsIGRlc2MpO1xuXHR9LFxuKTtcblxuTU9DS19IQU5ETEVSUyAmJiBhZGRIYW5kbGVyKFxuXHQxMDI1LFxuXHR0YXJnZXQgPT4gKHRhcmdldCBhcyBhbnkpLl9pcjEwMjUgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0TE9HX01PQ0tfSEFORExFUlMgJiYgY29uc29sZS5sb2coJ2ltYWdlIHJlc291cmNlIDEwMjUnLCBsZWZ0KCkpO1xuXHRcdCh0YXJnZXQgYXMgYW55KS5faXIxMDI1ID0gcmVhZEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVCeXRlcyh3cml0ZXIsICh0YXJnZXQgYXMgYW55KS5faXIxMDI1KTtcblx0fSxcbik7XG5cbmNvbnN0IEZybUQgPSBjcmVhdGVFbnVtPCdhdXRvJyB8ICdub25lJyB8ICdkaXNwb3NlJz4oJ0ZybUQnLCAnJywge1xuXHRhdXRvOiAnQXV0bycsXG5cdG5vbmU6ICdOb25lJyxcblx0ZGlzcG9zZTogJ0Rpc3AnLFxufSk7XG5cbmludGVyZmFjZSBBbmltYXRpb25EZXNjcmlwdG9yIHtcblx0QUZTdDogbnVtYmVyO1xuXHRGckluOiB7XG5cdFx0RnJJRDogbnVtYmVyO1xuXHRcdEZyRGw6IG51bWJlcjtcblx0XHRGckRzOiBzdHJpbmc7XG5cdFx0RnJHQT86IG51bWJlcjtcblx0fVtdO1xuXHRGU3RzOiB7XG5cdFx0RnNJRDogbnVtYmVyO1xuXHRcdEFGcm06IG51bWJlcjtcblx0XHRGc0ZyOiBudW1iZXJbXTtcblx0XHRMQ250OiBudW1iZXI7XG5cdH1bXTtcbn1cblxuaW50ZXJmYWNlIEFuaW1hdGlvbnMge1xuXHRmcmFtZXM6IHtcblx0XHRpZDogbnVtYmVyO1xuXHRcdGRlbGF5OiBudW1iZXI7XG5cdFx0ZGlzcG9zZT86ICdhdXRvJyB8ICdub25lJyB8ICdkaXNwb3NlJztcblx0fVtdO1xuXHRhbmltYXRpb25zOiB7XG5cdFx0aWQ6IG51bWJlcjtcblx0XHRmcmFtZXM6IG51bWJlcltdO1xuXHRcdHJlcGVhdHM/OiBudW1iZXI7XG5cdH1bXTtcbn1cblxuLy8gVE9ETzogVW5maW5pc2hlZFxuTU9DS19IQU5ETEVSUyAmJiBhZGRIYW5kbGVyKFxuXHQ0MDAwLCAvLyBQbHVnLUluIHJlc291cmNlKHMpXG5cdHRhcmdldCA9PiAodGFyZ2V0IGFzIGFueSkuX2lyNDAwMCAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQsIHsgbG9nTWlzc2luZ0ZlYXR1cmVzLCBsb2dEZXZGZWF0dXJlcyB9KSA9PiB7XG5cdFx0aWYgKE1PQ0tfSEFORExFUlMpIHtcblx0XHRcdExPR19NT0NLX0hBTkRMRVJTICYmIGNvbnNvbGUubG9nKCdpbWFnZSByZXNvdXJjZSA0MDAwJywgbGVmdCgpKTtcblx0XHRcdCh0YXJnZXQgYXMgYW55KS5faXI0MDAwID0gcmVhZEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBrZXkgPSByZWFkU2lnbmF0dXJlKHJlYWRlcik7XG5cblx0XHRpZiAoa2V5ID09PSAnbWFuaScpIHtcblx0XHRcdGNoZWNrU2lnbmF0dXJlKHJlYWRlciwgJ0lSRlInKTtcblx0XHRcdHJlYWRTZWN0aW9uKHJlYWRlciwgMSwgbGVmdCA9PiB7XG5cdFx0XHRcdHdoaWxlIChsZWZ0KCkpIHtcblx0XHRcdFx0XHRjaGVja1NpZ25hdHVyZShyZWFkZXIsICc4QklNJyk7XG5cdFx0XHRcdFx0Y29uc3Qga2V5ID0gcmVhZFNpZ25hdHVyZShyZWFkZXIpO1xuXG5cdFx0XHRcdFx0cmVhZFNlY3Rpb24ocmVhZGVyLCAxLCBsZWZ0ID0+IHtcblx0XHRcdFx0XHRcdGlmIChrZXkgPT09ICdBbkRzJykge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBkZXNjID0gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcikgYXMgQW5pbWF0aW9uRGVzY3JpcHRvcjtcblx0XHRcdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coJ0FuRHMnLCBkZXNjKTtcblx0XHRcdFx0XHRcdFx0bG9nRGV2RmVhdHVyZXMgJiYgY29uc29sZS5sb2coJyM0MDAwIEFuRHMnLCBkZXNjKTtcblx0XHRcdFx0XHRcdFx0Ly8gbG9nRGV2RmVhdHVyZXMgJiYgY29uc29sZS5sb2coJyM0MDAwIEFuRHMnLCByZXF1aXJlKCd1dGlsJykuaW5zcGVjdChkZXNjLCBmYWxzZSwgOTksIHRydWUpKTtcblxuXHRcdFx0XHRcdFx0XHRjb25zdCByZXN1bHQ6IEFuaW1hdGlvbnMgPSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gZGVzYy5BRlN0ID8/P1xuXHRcdFx0XHRcdFx0XHRcdGZyYW1lczogZGVzYy5GckluLm1hcCh4ID0+ICh7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZDogeC5GcklELFxuXHRcdFx0XHRcdFx0XHRcdFx0ZGVsYXk6IHguRnJEbCAvIDEwMCxcblx0XHRcdFx0XHRcdFx0XHRcdGRpc3Bvc2U6IHguRnJEcyA/IEZybUQuZGVjb2RlKHguRnJEcykgOiAnYXV0bycsIC8vIG1pc3NpbmcgPT0gYXV0b1xuXHRcdFx0XHRcdFx0XHRcdFx0Ly8geC5GckdBID8/P1xuXHRcdFx0XHRcdFx0XHRcdH0pKSxcblx0XHRcdFx0XHRcdFx0XHRhbmltYXRpb25zOiBkZXNjLkZTdHMubWFwKHggPT4gKHtcblx0XHRcdFx0XHRcdFx0XHRcdGlkOiB4LkZzSUQsXG5cdFx0XHRcdFx0XHRcdFx0XHRmcmFtZXM6IHguRnNGcixcblx0XHRcdFx0XHRcdFx0XHRcdHJlcGVhdHM6IHguTENudCxcblx0XHRcdFx0XHRcdFx0XHRcdC8vIHguQUZybSA/Pz9cblx0XHRcdFx0XHRcdFx0XHR9KSksXG5cdFx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdFx0bG9nRGV2RmVhdHVyZXMgJiYgY29uc29sZS5sb2coJyM0MDAwIEFuRHM6cmVzdWx0JywgcmVzdWx0KTtcblx0XHRcdFx0XHRcdFx0Ly8gbG9nRGV2RmVhdHVyZXMgJiYgY29uc29sZS5sb2coJyM0MDAwIEFuRHM6cmVzdWx0JywgcmVxdWlyZSgndXRpbCcpLmluc3BlY3QocmVzdWx0LCBmYWxzZSwgOTksIHRydWUpKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoa2V5ID09PSAnUm9sbCcpIHtcblx0XHRcdFx0XHRcdFx0Y29uc3QgYnl0ZXMgPSByZWFkQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHRcdFx0XHRcdFx0XHRsb2dEZXZGZWF0dXJlcyAmJiBjb25zb2xlLmxvZygnIzQwMDAgUm9sbCcsIGJ5dGVzKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGxvZ01pc3NpbmdGZWF0dXJlcyAmJiBjb25zb2xlLmxvZygnVW5oYW5kbGVkIHN1YnNlY3Rpb24gaW4gIzQwMDAnLCBrZXkpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9IGVsc2UgaWYgKGtleSA9PT0gJ21vcHQnKSB7XG5cdFx0XHRjb25zdCBieXRlcyA9IHJlYWRCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdFx0XHRsb2dEZXZGZWF0dXJlcyAmJiBjb25zb2xlLmxvZygnIzQwMDAgbW9wdCcsIGJ5dGVzKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bG9nTWlzc2luZ0ZlYXR1cmVzICYmIGNvbnNvbGUubG9nKCdVbmhhbmRsZWQga2V5IGluICM0MDAwOicsIGtleSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHR3cml0ZUJ5dGVzKHdyaXRlciwgKHRhcmdldCBhcyBhbnkpLl9pcjQwMDApO1xuXHR9LFxuKTtcblxuLy8gVE9ETzogVW5maW5pc2hlZFxuTU9DS19IQU5ETEVSUyAmJiBhZGRIYW5kbGVyKFxuXHQ0MDAxLCAvLyBQbHVnLUluIHJlc291cmNlKHMpXG5cdHRhcmdldCA9PiAodGFyZ2V0IGFzIGFueSkuX2lyNDAwMSAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQsIHsgbG9nTWlzc2luZ0ZlYXR1cmVzLCBsb2dEZXZGZWF0dXJlcyB9KSA9PiB7XG5cdFx0aWYgKE1PQ0tfSEFORExFUlMpIHtcblx0XHRcdExPR19NT0NLX0hBTkRMRVJTICYmIGNvbnNvbGUubG9nKCdpbWFnZSByZXNvdXJjZSA0MDAxJywgbGVmdCgpKTtcblx0XHRcdCh0YXJnZXQgYXMgYW55KS5faXI0MDAxID0gcmVhZEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBrZXkgPSByZWFkU2lnbmF0dXJlKHJlYWRlcik7XG5cblx0XHRpZiAoa2V5ID09PSAnbWZyaScpIHtcblx0XHRcdGNvbnN0IHZlcnNpb24gPSByZWFkVWludDMyKHJlYWRlcik7XG5cdFx0XHRpZiAodmVyc2lvbiAhPT0gMikgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIG1mcmkgdmVyc2lvbicpO1xuXG5cdFx0XHRjb25zdCBsZW5ndGggPSByZWFkVWludDMyKHJlYWRlcik7XG5cdFx0XHRjb25zdCBieXRlcyA9IHJlYWRCeXRlcyhyZWFkZXIsIGxlbmd0aCk7XG5cdFx0XHRsb2dEZXZGZWF0dXJlcyAmJiBjb25zb2xlLmxvZygnbWZyaScsIGJ5dGVzKTtcblx0XHR9IGVsc2UgaWYgKGtleSA9PT0gJ21zZXQnKSB7XG5cdFx0XHRjb25zdCBkZXNjID0gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcik7XG5cdFx0XHRsb2dEZXZGZWF0dXJlcyAmJiBjb25zb2xlLmxvZygnbXNldCcsIGRlc2MpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsb2dNaXNzaW5nRmVhdHVyZXMgJiYgY29uc29sZS5sb2coJ1VuaGFuZGxlZCBrZXkgaW4gIzQwMDEnLCBrZXkpO1xuXHRcdH1cblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVCeXRlcyh3cml0ZXIsICh0YXJnZXQgYXMgYW55KS5faXI0MDAxKTtcblx0fSxcbik7XG5cbi8vIFRPRE86IFVuZmluaXNoZWRcbk1PQ0tfSEFORExFUlMgJiYgYWRkSGFuZGxlcihcblx0NDAwMiwgLy8gUGx1Zy1JbiByZXNvdXJjZShzKVxuXHR0YXJnZXQgPT4gKHRhcmdldCBhcyBhbnkpLl9pcjQwMDIgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0TE9HX01PQ0tfSEFORExFUlMgJiYgY29uc29sZS5sb2coJ2ltYWdlIHJlc291cmNlIDQwMDInLCBsZWZ0KCkpO1xuXHRcdCh0YXJnZXQgYXMgYW55KS5faXI0MDAyID0gcmVhZEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVCeXRlcyh3cml0ZXIsICh0YXJnZXQgYXMgYW55KS5faXI0MDAyKTtcblx0fSxcbik7XG4iXSwic291cmNlUm9vdCI6Ii9Vc2Vycy9icmFuZG9ubGl1L0Rlc2t0b3Avc2t5bGFiL2FnLXBzZC9zcmMifQ==
