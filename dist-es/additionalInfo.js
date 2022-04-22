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
import { fromByteArray, toByteArray } from 'base64-js';
import { readEffects, writeEffects } from './effectsHelpers';
import { clamp, createEnum, layerColors, MOCK_HANDLERS } from './helpers';
import { readSignature, readUnicodeString, skipBytes, readUint32, readUint8, readFloat64, readUint16, readBytes, readInt16, checkSignature, readFloat32, readFixedPointPath32, readSection, readColor, readInt32, readPascalString, readUnicodeStringWithLength, readAsciiString, readPattern, } from './psdReader';
import { writeZeros, writeSignature, writeBytes, writeUint32, writeUint16, writeFloat64, writeUint8, writeInt16, writeFloat32, writeFixedPointPath32, writeUnicodeString, writeSection, writeUnicodeStringWithPadding, writeColor, writePascalString, writeInt32, } from './psdWriter';
import { Annt, BESl, BESs, BETE, BlnM, bvlT, ClrS, FrFl, FStl, GrdT, IGSr, Ornt, parseAngle, parsePercent, parsePercentOrAngle, parseUnits, parseUnitsOrNumber, readVersionAndDescriptor, strokeStyleLineAlignment, strokeStyleLineCapType, strokeStyleLineJoinType, textGridding, unitsAngle, unitsPercent, unitsValue, warpStyle, writeVersionAndDescriptor } from './descriptor';
import { serializeEngineData, parseEngineData } from './engineData';
import { encodeEngineData, decodeEngineData } from './text';
export var infoHandlers = [];
export var infoHandlersMap = {};
function addHandler(key, has, read, write) {
    var handler = { key: key, has: has, read: read, write: write };
    infoHandlers.push(handler);
    infoHandlersMap[handler.key] = handler;
}
function addHandlerAlias(key, target) {
    infoHandlersMap[key] = infoHandlersMap[target];
}
function hasKey(key) {
    return function (target) { return target[key] !== undefined; };
}
function readLength64(reader) {
    if (readUint32(reader))
        throw new Error("Resource size above 4 GB limit at " + reader.offset.toString(16));
    return readUint32(reader);
}
function writeLength64(writer, length) {
    writeUint32(writer, 0);
    writeUint32(writer, length);
}
addHandler('TySh', hasKey('text'), function (reader, target, leftBytes) {
    if (readInt16(reader) !== 1)
        throw new Error("Invalid TySh version");
    var transform = [];
    for (var i = 0; i < 6; i++)
        transform.push(readFloat64(reader));
    if (readInt16(reader) !== 50)
        throw new Error("Invalid TySh text version");
    var text = readVersionAndDescriptor(reader);
    if (readInt16(reader) !== 1)
        throw new Error("Invalid TySh warp version");
    var warp = readVersionAndDescriptor(reader);
    target.text = {
        transform: transform,
        left: readFloat32(reader),
        top: readFloat32(reader),
        right: readFloat32(reader),
        bottom: readFloat32(reader),
        text: text['Txt '].replace(/\r/g, '\n'),
        index: text.TextIndex || 0,
        gridding: textGridding.decode(text.textGridding),
        antiAlias: Annt.decode(text.AntA),
        orientation: Ornt.decode(text.Ornt),
        warp: {
            style: warpStyle.decode(warp.warpStyle),
            value: warp.warpValue || 0,
            perspective: warp.warpPerspective || 0,
            perspectiveOther: warp.warpPerspectiveOther || 0,
            rotate: Ornt.decode(warp.warpRotate),
        },
    };
    if (text.EngineData) {
        var engineData = decodeEngineData(parseEngineData(text.EngineData));
        // const before = parseEngineData(text.EngineData);
        // const after = encodeEngineData(engineData);
        // require('fs').writeFileSync('before.txt', require('util').inspect(before, false, 99, false), 'utf8');
        // require('fs').writeFileSync('after.txt', require('util').inspect(after, false, 99, false), 'utf8');
        // console.log(require('util').inspect(parseEngineData(text.EngineData), false, 99, true));
        target.text = __assign(__assign({}, target.text), engineData);
        // console.log(require('util').inspect(target.text, false, 99, true));
    }
    skipBytes(reader, leftBytes());
}, function (writer, target) {
    var text = target.text;
    var warp = text.warp || {};
    var transform = text.transform || [1, 0, 0, 1, 0, 0];
    var textDescriptor = {
        'Txt ': (text.text || '').replace(/\r?\n/g, '\r'),
        textGridding: textGridding.encode(text.gridding),
        Ornt: Ornt.encode(text.orientation),
        AntA: Annt.encode(text.antiAlias),
        TextIndex: text.index || 0,
        EngineData: serializeEngineData(encodeEngineData(text)),
    };
    writeInt16(writer, 1); // version
    for (var i = 0; i < 6; i++) {
        writeFloat64(writer, transform[i]);
    }
    writeInt16(writer, 50); // text version
    writeVersionAndDescriptor(writer, '', 'TxLr', textDescriptor);
    writeInt16(writer, 1); // warp version
    writeVersionAndDescriptor(writer, '', 'warp', encodeWarp(warp));
    writeFloat32(writer, text.left);
    writeFloat32(writer, text.top);
    writeFloat32(writer, text.right);
    writeFloat32(writer, text.bottom);
    // writeZeros(writer, 2);
});
// vector fills
addHandler('SoCo', function (target) { return target.vectorFill !== undefined && target.vectorStroke === undefined &&
    target.vectorFill.type === 'color'; }, function (reader, target) {
    var descriptor = readVersionAndDescriptor(reader);
    target.vectorFill = parseVectorContent(descriptor);
}, function (writer, target) {
    var descriptor = serializeVectorContent(target.vectorFill).descriptor;
    writeVersionAndDescriptor(writer, '', 'null', descriptor);
});
addHandler('GdFl', function (target) { return target.vectorFill !== undefined && target.vectorStroke === undefined &&
    (target.vectorFill.type === 'solid' || target.vectorFill.type === 'noise'); }, function (reader, target, left) {
    var descriptor = readVersionAndDescriptor(reader);
    target.vectorFill = parseVectorContent(descriptor);
    skipBytes(reader, left());
}, function (writer, target) {
    var descriptor = serializeVectorContent(target.vectorFill).descriptor;
    writeVersionAndDescriptor(writer, '', 'null', descriptor);
});
addHandler('PtFl', function (target) { return target.vectorFill !== undefined && target.vectorStroke === undefined &&
    target.vectorFill.type === 'pattern'; }, function (reader, target) {
    var descriptor = readVersionAndDescriptor(reader);
    target.vectorFill = parseVectorContent(descriptor);
}, function (writer, target) {
    var descriptor = serializeVectorContent(target.vectorFill).descriptor;
    writeVersionAndDescriptor(writer, '', 'null', descriptor);
});
addHandler('vscg', function (target) { return target.vectorFill !== undefined && target.vectorStroke !== undefined; }, function (reader, target, left) {
    readSignature(reader); // key
    var desc = readVersionAndDescriptor(reader);
    target.vectorFill = parseVectorContent(desc);
    skipBytes(reader, left());
}, function (writer, target) {
    var _a = serializeVectorContent(target.vectorFill), descriptor = _a.descriptor, key = _a.key;
    writeSignature(writer, key);
    writeVersionAndDescriptor(writer, '', 'null', descriptor);
});
export function readBezierKnot(reader, width, height) {
    var y0 = readFixedPointPath32(reader) * height;
    var x0 = readFixedPointPath32(reader) * width;
    var y1 = readFixedPointPath32(reader) * height;
    var x1 = readFixedPointPath32(reader) * width;
    var y2 = readFixedPointPath32(reader) * height;
    var x2 = readFixedPointPath32(reader) * width;
    return [x0, y0, x1, y1, x2, y2];
}
function writeBezierKnot(writer, points, width, height) {
    writeFixedPointPath32(writer, points[1] / height); // y0
    writeFixedPointPath32(writer, points[0] / width); // x0
    writeFixedPointPath32(writer, points[3] / height); // y1
    writeFixedPointPath32(writer, points[2] / width); // x1
    writeFixedPointPath32(writer, points[5] / height); // y2
    writeFixedPointPath32(writer, points[4] / width); // x2
}
export var booleanOperations = ['exclude', 'combine', 'subtract', 'intersect'];
export function readVectorMask(reader, vectorMask, width, height, size) {
    var end = reader.offset + size;
    var paths = vectorMask.paths;
    var path = undefined;
    while ((end - reader.offset) >= 26) {
        var selector = readUint16(reader);
        switch (selector) {
            case 0: // Closed subpath length record
            case 3: { // Open subpath length record
                readUint16(reader); // count
                var boolOp = readInt16(reader);
                readUint16(reader); // always 1 ?
                skipBytes(reader, 18);
                // TODO: 'combine' here might be wrong
                path = { open: selector === 3, operation: boolOp === -1 ? 'combine' : booleanOperations[boolOp], knots: [] };
                paths.push(path);
                break;
            }
            case 1: // Closed subpath Bezier knot, linked
            case 2: // Closed subpath Bezier knot, unlinked
            case 4: // Open subpath Bezier knot, linked
            case 5: // Open subpath Bezier knot, unlinked
                path.knots.push({ linked: (selector === 1 || selector === 4), points: readBezierKnot(reader, width, height) });
                break;
            case 6: // Path fill rule record
                skipBytes(reader, 24);
                break;
            case 7: { // Clipboard record
                // TODO: check if these need to be multiplied by document size
                var top_1 = readFixedPointPath32(reader);
                var left = readFixedPointPath32(reader);
                var bottom = readFixedPointPath32(reader);
                var right = readFixedPointPath32(reader);
                var resolution = readFixedPointPath32(reader);
                skipBytes(reader, 4);
                vectorMask.clipboard = { top: top_1, left: left, bottom: bottom, right: right, resolution: resolution };
                break;
            }
            case 8: // Initial fill rule record
                vectorMask.fillStartsWithAllPixels = !!readUint16(reader);
                skipBytes(reader, 22);
                break;
            default: throw new Error('Invalid vmsk section');
        }
    }
    return paths;
}
addHandler('vmsk', hasKey('vectorMask'), function (reader, target, left, _a) {
    var width = _a.width, height = _a.height;
    if (readUint32(reader) !== 3)
        throw new Error('Invalid vmsk version');
    target.vectorMask = { paths: [] };
    var vectorMask = target.vectorMask;
    var flags = readUint32(reader);
    vectorMask.invert = (flags & 1) !== 0;
    vectorMask.notLink = (flags & 2) !== 0;
    vectorMask.disable = (flags & 4) !== 0;
    readVectorMask(reader, vectorMask, width, height, left());
    // drawBezierPaths(vectorMask.paths, width, height, 'out.png');
    skipBytes(reader, left());
}, function (writer, target, _a) {
    var width = _a.width, height = _a.height;
    var vectorMask = target.vectorMask;
    var flags = (vectorMask.invert ? 1 : 0) |
        (vectorMask.notLink ? 2 : 0) |
        (vectorMask.disable ? 4 : 0);
    writeUint32(writer, 3); // version
    writeUint32(writer, flags);
    // initial entry
    writeUint16(writer, 6);
    writeZeros(writer, 24);
    var clipboard = vectorMask.clipboard;
    if (clipboard) {
        writeUint16(writer, 7);
        writeFixedPointPath32(writer, clipboard.top);
        writeFixedPointPath32(writer, clipboard.left);
        writeFixedPointPath32(writer, clipboard.bottom);
        writeFixedPointPath32(writer, clipboard.right);
        writeFixedPointPath32(writer, clipboard.resolution);
        writeZeros(writer, 4);
    }
    if (vectorMask.fillStartsWithAllPixels !== undefined) {
        writeUint16(writer, 8);
        writeUint16(writer, vectorMask.fillStartsWithAllPixels ? 1 : 0);
        writeZeros(writer, 22);
    }
    for (var _i = 0, _b = vectorMask.paths; _i < _b.length; _i++) {
        var path = _b[_i];
        writeUint16(writer, path.open ? 3 : 0);
        writeUint16(writer, path.knots.length);
        writeUint16(writer, Math.abs(booleanOperations.indexOf(path.operation))); // default to 1 if not found
        writeUint16(writer, 1);
        writeZeros(writer, 18); // TODO: these are sometimes non-zero
        var linkedKnot = path.open ? 4 : 1;
        var unlinkedKnot = path.open ? 5 : 2;
        for (var _c = 0, _d = path.knots; _c < _d.length; _c++) {
            var _e = _d[_c], linked = _e.linked, points = _e.points;
            writeUint16(writer, linked ? linkedKnot : unlinkedKnot);
            writeBezierKnot(writer, points, width, height);
        }
    }
});
// TODO: need to write vmsk if has outline ?
addHandlerAlias('vsms', 'vmsk');
addHandler('vogk', hasKey('vectorOrigination'), function (reader, target, left) {
    if (readInt32(reader) !== 1)
        throw new Error("Invalid vogk version");
    var desc = readVersionAndDescriptor(reader);
    // console.log(require('util').inspect(desc, false, 99, true));
    target.vectorOrigination = { keyDescriptorList: [] };
    for (var _i = 0, _a = desc.keyDescriptorList; _i < _a.length; _i++) {
        var i = _a[_i];
        var item = {};
        if (i.keyShapeInvalidated != null)
            item.keyShapeInvalidated = i.keyShapeInvalidated;
        if (i.keyOriginType != null)
            item.keyOriginType = i.keyOriginType;
        if (i.keyOriginResolution != null)
            item.keyOriginResolution = i.keyOriginResolution;
        if (i.keyOriginShapeBBox) {
            item.keyOriginShapeBoundingBox = {
                top: parseUnits(i.keyOriginShapeBBox['Top ']),
                left: parseUnits(i.keyOriginShapeBBox.Left),
                bottom: parseUnits(i.keyOriginShapeBBox.Btom),
                right: parseUnits(i.keyOriginShapeBBox.Rght),
            };
        }
        var rectRadii = i.keyOriginRRectRadii;
        if (rectRadii) {
            item.keyOriginRRectRadii = {
                topRight: parseUnits(rectRadii.topRight),
                topLeft: parseUnits(rectRadii.topLeft),
                bottomLeft: parseUnits(rectRadii.bottomLeft),
                bottomRight: parseUnits(rectRadii.bottomRight),
            };
        }
        var corners = i.keyOriginBoxCorners;
        if (corners) {
            item.keyOriginBoxCorners = [
                { x: corners.rectangleCornerA.Hrzn, y: corners.rectangleCornerA.Vrtc },
                { x: corners.rectangleCornerB.Hrzn, y: corners.rectangleCornerB.Vrtc },
                { x: corners.rectangleCornerC.Hrzn, y: corners.rectangleCornerC.Vrtc },
                { x: corners.rectangleCornerD.Hrzn, y: corners.rectangleCornerD.Vrtc },
            ];
        }
        var trnf = i.Trnf;
        if (trnf) {
            item.transform = [trnf.xx, trnf.xy, trnf.xy, trnf.yy, trnf.tx, trnf.ty];
        }
        target.vectorOrigination.keyDescriptorList.push(item);
    }
    skipBytes(reader, left());
}, function (writer, target) {
    target;
    var orig = target.vectorOrigination;
    var desc = { keyDescriptorList: [] };
    for (var i = 0; i < orig.keyDescriptorList.length; i++) {
        var item = orig.keyDescriptorList[i];
        if (item.keyShapeInvalidated) {
            desc.keyDescriptorList.push({ keyShapeInvalidated: true, keyOriginIndex: i });
        }
        else {
            desc.keyDescriptorList.push({}); // we're adding keyOriginIndex at the end
            var out = desc.keyDescriptorList[desc.keyDescriptorList.length - 1];
            if (item.keyOriginType != null)
                out.keyOriginType = item.keyOriginType;
            if (item.keyOriginResolution != null)
                out.keyOriginResolution = item.keyOriginResolution;
            var radii = item.keyOriginRRectRadii;
            if (radii) {
                out.keyOriginRRectRadii = {
                    unitValueQuadVersion: 1,
                    topRight: unitsValue(radii.topRight, 'topRight'),
                    topLeft: unitsValue(radii.topLeft, 'topLeft'),
                    bottomLeft: unitsValue(radii.bottomLeft, 'bottomLeft'),
                    bottomRight: unitsValue(radii.bottomRight, 'bottomRight'),
                };
            }
            var box = item.keyOriginShapeBoundingBox;
            if (box) {
                out.keyOriginShapeBBox = {
                    unitValueQuadVersion: 1,
                    'Top ': unitsValue(box.top, 'top'),
                    Left: unitsValue(box.left, 'left'),
                    Btom: unitsValue(box.bottom, 'bottom'),
                    Rght: unitsValue(box.right, 'right'),
                };
            }
            var corners = item.keyOriginBoxCorners;
            if (corners && corners.length === 4) {
                out.keyOriginBoxCorners = {
                    rectangleCornerA: { Hrzn: corners[0].x, Vrtc: corners[0].y },
                    rectangleCornerB: { Hrzn: corners[1].x, Vrtc: corners[1].y },
                    rectangleCornerC: { Hrzn: corners[2].x, Vrtc: corners[2].y },
                    rectangleCornerD: { Hrzn: corners[3].x, Vrtc: corners[3].y },
                };
            }
            var transform = item.transform;
            if (transform && transform.length === 6) {
                out.Trnf = {
                    xx: transform[0],
                    xy: transform[1],
                    yx: transform[2],
                    yy: transform[3],
                    tx: transform[4],
                    ty: transform[5],
                };
            }
            out.keyOriginIndex = i;
        }
    }
    writeInt32(writer, 1); // version
    writeVersionAndDescriptor(writer, '', 'null', desc);
});
addHandler('lmfx', function (target) { return target.effects !== undefined && hasMultiEffects(target.effects); }, function (reader, target, left, _, options) {
    var version = readUint32(reader);
    if (version !== 0)
        throw new Error('Invalid lmfx version');
    var desc = readVersionAndDescriptor(reader);
    // console.log(require('util').inspect(info, false, 99, true));
    // discard if read in 'lrFX' or 'lfx2' section
    target.effects = parseEffects(desc, !!options.logMissingFeatures);
    skipBytes(reader, left());
}, function (writer, target, _, options) {
    var desc = serializeEffects(target.effects, !!options.logMissingFeatures, true);
    writeUint32(writer, 0); // version
    writeVersionAndDescriptor(writer, '', 'null', desc);
});
addHandler('lrFX', hasKey('effects'), function (reader, target, left) {
    if (!target.effects)
        target.effects = readEffects(reader);
    skipBytes(reader, left());
}, function (writer, target) {
    writeEffects(writer, target.effects);
});
addHandler('luni', hasKey('name'), function (reader, target, left) {
    target.name = readUnicodeString(reader);
    skipBytes(reader, left());
}, function (writer, target) {
    writeUnicodeString(writer, target.name);
    // writeUint16(writer, 0); // padding (but not extending string length)
});
addHandler('lnsr', hasKey('nameSource'), function (reader, target) { return target.nameSource = readSignature(reader); }, function (writer, target) { return writeSignature(writer, target.nameSource); });
addHandler('lyid', hasKey('id'), function (reader, target) { return target.id = readUint32(reader); }, function (writer, target, _psd, options) {
    var id = target.id;
    while (options.layerIds.indexOf(id) !== -1)
        id += 100; // make sure we don't have duplicate layer ids
    writeUint32(writer, id);
    options.layerIds.push(id);
});
addHandler('lsct', hasKey('sectionDivider'), function (reader, target, left) {
    target.sectionDivider = { type: readUint32(reader) };
    if (left()) {
        checkSignature(reader, '8BIM');
        target.sectionDivider.key = readSignature(reader);
    }
    if (left()) {
        // 0 = normal
        // 1 = scene group, affects the animation timeline.
        target.sectionDivider.subType = readUint32(reader);
    }
}, function (writer, target) {
    writeUint32(writer, target.sectionDivider.type);
    if (target.sectionDivider.key) {
        writeSignature(writer, '8BIM');
        writeSignature(writer, target.sectionDivider.key);
        if (target.sectionDivider.subType !== undefined) {
            writeUint32(writer, target.sectionDivider.subType);
        }
    }
});
// it seems lsdk is used when there's a layer is nested more than 6 levels, but I don't know why?
// maybe some limitation of old version of PS?
addHandlerAlias('lsdk', 'lsct');
addHandler('clbl', hasKey('blendClippendElements'), function (reader, target) {
    target.blendClippendElements = !!readUint8(reader);
    skipBytes(reader, 3);
}, function (writer, target) {
    writeUint8(writer, target.blendClippendElements ? 1 : 0);
    writeZeros(writer, 3);
});
addHandler('infx', hasKey('blendInteriorElements'), function (reader, target) {
    target.blendInteriorElements = !!readUint8(reader);
    skipBytes(reader, 3);
}, function (writer, target) {
    writeUint8(writer, target.blendInteriorElements ? 1 : 0);
    writeZeros(writer, 3);
});
addHandler('knko', hasKey('knockout'), function (reader, target) {
    target.knockout = !!readUint8(reader);
    skipBytes(reader, 3);
}, function (writer, target) {
    writeUint8(writer, target.knockout ? 1 : 0);
    writeZeros(writer, 3);
});
addHandler('lspf', hasKey('protected'), function (reader, target) {
    var flags = readUint32(reader);
    target.protected = {
        transparency: (flags & 0x01) !== 0,
        composite: (flags & 0x02) !== 0,
        position: (flags & 0x04) !== 0,
    };
    if (flags & 0x08)
        target.protected.artboards = true;
}, function (writer, target) {
    var flags = (target.protected.transparency ? 0x01 : 0) |
        (target.protected.composite ? 0x02 : 0) |
        (target.protected.position ? 0x04 : 0) |
        (target.protected.artboards ? 0x08 : 0);
    writeUint32(writer, flags);
});
addHandler('lclr', hasKey('layerColor'), function (reader, target) {
    var color = readUint16(reader);
    skipBytes(reader, 6);
    target.layerColor = layerColors[color];
}, function (writer, target) {
    var index = layerColors.indexOf(target.layerColor);
    writeUint16(writer, index === -1 ? 0 : index);
    writeZeros(writer, 6);
});
addHandler('shmd', hasKey('timestamp'), function (reader, target, left, _, options) {
    var count = readUint32(reader);
    var _loop_1 = function (i) {
        checkSignature(reader, '8BIM');
        var key = readSignature(reader);
        readUint8(reader); // copy
        skipBytes(reader, 3);
        readSection(reader, 1, function (left) {
            if (key === 'cust') {
                var desc = readVersionAndDescriptor(reader);
                if (desc.layerTime !== undefined)
                    target.timestamp = desc.layerTime;
            }
            else if (key === 'mlst') {
                var desc = readVersionAndDescriptor(reader);
                options.logDevFeatures && console.log('mlst', desc);
                // options.logDevFeatures && console.log('mlst', require('util').inspect(desc, false, 99, true));
            }
            else if (key === 'mdyn') {
                // frame flags
                var unknown = readUint16(reader);
                var propagate = readUint8(reader);
                var flags = readUint8(reader);
                var unifyLayerPosition = (flags & 1) !== 0;
                var unifyLayerStyle = (flags & 2) !== 0;
                var unifyLayerVisibility = (flags & 4) !== 0;
                options.logDevFeatures && console.log('mdyn', 'unknown:', unknown, 'propagate:', propagate, 'flags:', flags, { unifyLayerPosition: unifyLayerPosition, unifyLayerStyle: unifyLayerStyle, unifyLayerVisibility: unifyLayerVisibility });
                // const desc = readVersionAndDescriptor(reader) as FrameListDescriptor;
                // console.log('mdyn', require('util').inspect(desc, false, 99, true));
            }
            else {
                options.logDevFeatures && console.log('Unhandled metadata', key);
            }
            skipBytes(reader, left());
        });
    };
    for (var i = 0; i < count; i++) {
        _loop_1(i);
    }
    skipBytes(reader, left());
}, function (writer, target) {
    var desc = {
        layerTime: target.timestamp,
    };
    writeUint32(writer, 1); // count
    writeSignature(writer, '8BIM');
    writeSignature(writer, 'cust');
    writeUint8(writer, 0); // copy (always false)
    writeZeros(writer, 3);
    writeSection(writer, 2, function () { return writeVersionAndDescriptor(writer, '', 'metadata', desc); }, true);
});
addHandler('vstk', hasKey('vectorStroke'), function (reader, target, left) {
    var desc = readVersionAndDescriptor(reader);
    // console.log(require('util').inspect(desc, false, 99, true));
    target.vectorStroke = {
        strokeEnabled: desc.strokeEnabled,
        fillEnabled: desc.fillEnabled,
        lineWidth: parseUnits(desc.strokeStyleLineWidth),
        lineDashOffset: parseUnits(desc.strokeStyleLineDashOffset),
        miterLimit: desc.strokeStyleMiterLimit,
        lineCapType: strokeStyleLineCapType.decode(desc.strokeStyleLineCapType),
        lineJoinType: strokeStyleLineJoinType.decode(desc.strokeStyleLineJoinType),
        lineAlignment: strokeStyleLineAlignment.decode(desc.strokeStyleLineAlignment),
        scaleLock: desc.strokeStyleScaleLock,
        strokeAdjust: desc.strokeStyleStrokeAdjust,
        lineDashSet: desc.strokeStyleLineDashSet.map(parseUnits),
        blendMode: BlnM.decode(desc.strokeStyleBlendMode),
        opacity: parsePercent(desc.strokeStyleOpacity),
        content: parseVectorContent(desc.strokeStyleContent),
        resolution: desc.strokeStyleResolution,
    };
    skipBytes(reader, left());
}, function (writer, target) {
    var _a, _b, _c;
    var stroke = target.vectorStroke;
    var descriptor = {
        strokeStyleVersion: 2,
        strokeEnabled: !!stroke.strokeEnabled,
        fillEnabled: !!stroke.fillEnabled,
        strokeStyleLineWidth: stroke.lineWidth || { value: 3, units: 'Points' },
        strokeStyleLineDashOffset: stroke.lineDashOffset || { value: 0, units: 'Points' },
        strokeStyleMiterLimit: (_a = stroke.miterLimit) !== null && _a !== void 0 ? _a : 100,
        strokeStyleLineCapType: strokeStyleLineCapType.encode(stroke.lineCapType),
        strokeStyleLineJoinType: strokeStyleLineJoinType.encode(stroke.lineJoinType),
        strokeStyleLineAlignment: strokeStyleLineAlignment.encode(stroke.lineAlignment),
        strokeStyleScaleLock: !!stroke.scaleLock,
        strokeStyleStrokeAdjust: !!stroke.strokeAdjust,
        strokeStyleLineDashSet: stroke.lineDashSet || [],
        strokeStyleBlendMode: BlnM.encode(stroke.blendMode),
        strokeStyleOpacity: unitsPercent((_b = stroke.opacity) !== null && _b !== void 0 ? _b : 1),
        strokeStyleContent: serializeVectorContent(stroke.content || { type: 'color', color: { r: 0, g: 0, b: 0 } }).descriptor,
        strokeStyleResolution: (_c = stroke.resolution) !== null && _c !== void 0 ? _c : 72,
    };
    writeVersionAndDescriptor(writer, '', 'strokeStyle', descriptor);
});
addHandler('artb', // per-layer arboard info
hasKey('artboard'), function (reader, target, left) {
    var desc = readVersionAndDescriptor(reader);
    var rect = desc.artboardRect;
    target.artboard = {
        rect: { top: rect['Top '], left: rect.Left, bottom: rect.Btom, right: rect.Rght },
        guideIndices: desc.guideIndeces,
        presetName: desc.artboardPresetName,
        color: parseColor(desc['Clr ']),
        backgroundType: desc.artboardBackgroundType,
    };
    skipBytes(reader, left());
}, function (writer, target) {
    var _a;
    var artboard = target.artboard;
    var rect = artboard.rect;
    var desc = {
        artboardRect: { 'Top ': rect.top, Left: rect.left, Btom: rect.bottom, Rght: rect.right },
        guideIndeces: artboard.guideIndices || [],
        artboardPresetName: artboard.presetName || '',
        'Clr ': serializeColor(artboard.color),
        artboardBackgroundType: (_a = artboard.backgroundType) !== null && _a !== void 0 ? _a : 1,
    };
    writeVersionAndDescriptor(writer, '', 'artboard', desc);
});
addHandler('sn2P', hasKey('usingAlignedRendering'), function (reader, target) { return target.usingAlignedRendering = !!readUint32(reader); }, function (writer, target) { return writeUint32(writer, target.usingAlignedRendering ? 1 : 0); });
var placedLayerTypes = ['unknown', 'vector', 'raster', 'image stack'];
function parseWarp(warp) {
    var _a, _b, _c, _d, _e, _f;
    var result = {
        style: warpStyle.decode(warp.warpStyle),
        value: warp.warpValue || 0,
        perspective: warp.warpPerspective || 0,
        perspectiveOther: warp.warpPerspectiveOther || 0,
        rotate: Ornt.decode(warp.warpRotate),
        bounds: warp.bounds && {
            top: parseUnitsOrNumber(warp.bounds['Top ']),
            left: parseUnitsOrNumber(warp.bounds.Left),
            bottom: parseUnitsOrNumber(warp.bounds.Btom),
            right: parseUnitsOrNumber(warp.bounds.Rght),
        },
        uOrder: warp.uOrder,
        vOrder: warp.vOrder,
    };
    if (warp.deformNumRows != null || warp.deformNumCols != null) {
        result.deformNumRows = warp.deformNumRows;
        result.deformNumCols = warp.deformNumCols;
    }
    var envelopeWarp = warp.customEnvelopeWarp;
    if (envelopeWarp) {
        result.customEnvelopeWarp = {
            meshPoints: [],
        };
        var xs = ((_a = envelopeWarp.meshPoints.find(function (i) { return i.type === 'Hrzn'; })) === null || _a === void 0 ? void 0 : _a.values) || [];
        var ys = ((_b = envelopeWarp.meshPoints.find(function (i) { return i.type === 'Vrtc'; })) === null || _b === void 0 ? void 0 : _b.values) || [];
        for (var i = 0; i < xs.length; i++) {
            result.customEnvelopeWarp.meshPoints.push({ x: xs[i], y: ys[i] });
        }
        if (envelopeWarp.quiltSliceX || envelopeWarp.quiltSliceY) {
            result.customEnvelopeWarp.quiltSliceX = ((_d = (_c = envelopeWarp.quiltSliceX) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.values) || [];
            result.customEnvelopeWarp.quiltSliceY = ((_f = (_e = envelopeWarp.quiltSliceY) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.values) || [];
        }
    }
    return result;
}
function isQuiltWarp(warp) {
    var _a, _b;
    return warp.deformNumCols != null || warp.deformNumRows != null ||
        ((_a = warp.customEnvelopeWarp) === null || _a === void 0 ? void 0 : _a.quiltSliceX) || ((_b = warp.customEnvelopeWarp) === null || _b === void 0 ? void 0 : _b.quiltSliceY);
}
function encodeWarp(warp) {
    var bounds = warp.bounds;
    var desc = {
        warpStyle: warpStyle.encode(warp.style),
        warpValue: warp.value || 0,
        warpPerspective: warp.perspective || 0,
        warpPerspectiveOther: warp.perspectiveOther || 0,
        warpRotate: Ornt.encode(warp.rotate),
        bounds: {
            'Top ': unitsValue(bounds && bounds.top || { units: 'Pixels', value: 0 }, 'bounds.top'),
            Left: unitsValue(bounds && bounds.left || { units: 'Pixels', value: 0 }, 'bounds.left'),
            Btom: unitsValue(bounds && bounds.bottom || { units: 'Pixels', value: 0 }, 'bounds.bottom'),
            Rght: unitsValue(bounds && bounds.right || { units: 'Pixels', value: 0 }, 'bounds.right'),
        },
        uOrder: warp.uOrder || 0,
        vOrder: warp.vOrder || 0,
    };
    var isQuilt = isQuiltWarp(warp);
    if (isQuilt) {
        var desc2 = desc;
        desc2.deformNumRows = warp.deformNumRows || 0;
        desc2.deformNumCols = warp.deformNumCols || 0;
    }
    var customEnvelopeWarp = warp.customEnvelopeWarp;
    if (customEnvelopeWarp) {
        var meshPoints = customEnvelopeWarp.meshPoints || [];
        if (isQuilt) {
            var desc2 = desc;
            desc2.customEnvelopeWarp = {
                quiltSliceX: [{
                        type: 'quiltSliceX',
                        values: customEnvelopeWarp.quiltSliceX || [],
                    }],
                quiltSliceY: [{
                        type: 'quiltSliceY',
                        values: customEnvelopeWarp.quiltSliceY || [],
                    }],
                meshPoints: [
                    { type: 'Hrzn', values: meshPoints.map(function (p) { return p.x; }) },
                    { type: 'Vrtc', values: meshPoints.map(function (p) { return p.y; }) },
                ],
            };
        }
        else {
            desc.customEnvelopeWarp = {
                meshPoints: [
                    { type: 'Hrzn', values: meshPoints.map(function (p) { return p.x; }) },
                    { type: 'Vrtc', values: meshPoints.map(function (p) { return p.y; }) },
                ],
            };
        }
    }
    return desc;
}
addHandler('PlLd', hasKey('placedLayer'), function (reader, target, left) {
    if (readSignature(reader) !== 'plcL')
        throw new Error("Invalid PlLd signature");
    if (readInt32(reader) !== 3)
        throw new Error("Invalid PlLd version");
    var id = readPascalString(reader, 1);
    readInt32(reader); // pageNumber
    readInt32(reader); // totalPages, TODO: check how this works ?
    readInt32(reader); // anitAliasPolicy 16
    var placedLayerType = readInt32(reader); // 0 = unknown, 1 = vector, 2 = raster, 3 = image stack
    if (!placedLayerTypes[placedLayerType])
        throw new Error('Invalid PlLd type');
    var transform = [];
    for (var i = 0; i < 8; i++)
        transform.push(readFloat64(reader)); // x, y of 4 corners of the transform
    var warpVersion = readInt32(reader);
    if (warpVersion !== 0)
        throw new Error("Invalid Warp version " + warpVersion);
    var warp = readVersionAndDescriptor(reader);
    target.placedLayer = target.placedLayer || {
        id: id,
        type: placedLayerTypes[placedLayerType],
        // pageNumber,
        // totalPages,
        transform: transform,
        warp: parseWarp(warp),
    };
    // console.log('PlLd warp', require('util').inspect(warp, false, 99, true));
    // console.log('PlLd', require('util').inspect(target.placedLayer, false, 99, true));
    skipBytes(reader, left());
}, function (writer, target) {
    var placed = target.placedLayer;
    writeSignature(writer, 'plcL');
    writeInt32(writer, 3); // version
    writePascalString(writer, placed.id, 1);
    writeInt32(writer, 1); // pageNumber
    writeInt32(writer, 1); // totalPages
    writeInt32(writer, 16); // anitAliasPolicy
    if (placedLayerTypes.indexOf(placed.type) === -1)
        throw new Error('Invalid placedLayer type');
    writeInt32(writer, placedLayerTypes.indexOf(placed.type));
    for (var i = 0; i < 8; i++)
        writeFloat64(writer, placed.transform[i]);
    writeInt32(writer, 0); // warp version
    var isQuilt = placed.warp && isQuiltWarp(placed.warp);
    var type = isQuilt ? 'quiltWarp' : 'warp';
    writeVersionAndDescriptor(writer, '', type, encodeWarp(placed.warp || {}), type);
});
addHandler('SoLd', hasKey('placedLayer'), function (reader, target, left) {
    if (readSignature(reader) !== 'soLD')
        throw new Error("Invalid SoLd type");
    if (readInt32(reader) !== 4)
        throw new Error("Invalid SoLd version");
    var desc = readVersionAndDescriptor(reader);
    // console.log('SoLd', require('util').inspect(desc, false, 99, true));
    // console.log('SoLd.warp', require('util').inspect(desc.warp, false, 99, true));
    // console.log('SoLd.quiltWarp', require('util').inspect(desc.quiltWarp, false, 99, true));
    target.placedLayer = {
        id: desc.Idnt,
        placed: desc.placed,
        type: placedLayerTypes[desc.Type],
        // pageNumber: info.PgNm,
        // totalPages: info.totalPages,
        // frameStep: info.frameStep,
        // duration: info.duration,
        // frameCount: info.frameCount,
        transform: desc.Trnf,
        width: desc['Sz  '].Wdth,
        height: desc['Sz  '].Hght,
        resolution: parseUnits(desc.Rslt),
        warp: parseWarp((desc.quiltWarp || desc.warp)),
    };
    if (desc.nonAffineTransform && desc.nonAffineTransform.some(function (x, i) { return x !== desc.Trnf[i]; })) {
        target.placedLayer.nonAffineTransform = desc.nonAffineTransform;
    }
    if (desc.Crop)
        target.placedLayer.crop = desc.Crop;
    if (desc.comp)
        target.placedLayer.comp = desc.comp;
    if (desc.compInfo)
        target.placedLayer.compInfo = desc.compInfo;
    skipBytes(reader, left()); // HACK
}, function (writer, target) {
    var _a, _b;
    writeSignature(writer, 'soLD');
    writeInt32(writer, 4); // version
    var placed = target.placedLayer;
    var desc = __assign(__assign({ Idnt: placed.id, placed: (_a = placed.placed) !== null && _a !== void 0 ? _a : placed.id, PgNm: 1, totalPages: 1 }, (placed.crop ? { Crop: placed.crop } : {})), { frameStep: {
            numerator: 0,
            denominator: 600
        }, duration: {
            numerator: 0,
            denominator: 600
        }, frameCount: 1, Annt: 16, Type: placedLayerTypes.indexOf(placed.type), Trnf: placed.transform, nonAffineTransform: (_b = placed.nonAffineTransform) !== null && _b !== void 0 ? _b : placed.transform, quiltWarp: {}, warp: encodeWarp(placed.warp || {}), 'Sz  ': {
            Wdth: placed.width || 0,
            Hght: placed.height || 0, // TODO: find size ?
        }, Rslt: placed.resolution ? unitsValue(placed.resolution, 'resolution') : { units: 'Density', value: 72 } });
    if (placed.warp && isQuiltWarp(placed.warp)) {
        var quiltWarp = encodeWarp(placed.warp);
        desc.quiltWarp = quiltWarp;
        desc.warp = {
            warpStyle: 'warpStyle.warpNone',
            warpValue: quiltWarp.warpValue,
            warpPerspective: quiltWarp.warpPerspective,
            warpPerspectiveOther: quiltWarp.warpPerspectiveOther,
            warpRotate: quiltWarp.warpRotate,
            bounds: quiltWarp.bounds,
            uOrder: quiltWarp.uOrder,
            vOrder: quiltWarp.vOrder,
        };
    }
    else {
        delete desc.quiltWarp;
    }
    if (placed.comp)
        desc.comp = placed.comp;
    if (placed.compInfo)
        desc.compInfo = placed.compInfo;
    writeVersionAndDescriptor(writer, '', 'null', desc, desc.quiltWarp ? 'quiltWarp' : 'warp');
});
addHandler('fxrp', hasKey('referencePoint'), function (reader, target) {
    target.referencePoint = {
        x: readFloat64(reader),
        y: readFloat64(reader),
    };
}, function (writer, target) {
    writeFloat64(writer, target.referencePoint.x);
    writeFloat64(writer, target.referencePoint.y);
});
if (MOCK_HANDLERS) {
    addHandler('Patt', function (target) { return target._Patt !== undefined; }, function (reader, target, left) {
        // console.log('additional info: Patt');
        target._Patt = readBytes(reader, left());
    }, function (writer, target) { return false && writeBytes(writer, target._Patt); });
}
else {
    addHandler('Patt', // TODO: handle also Pat2 & Pat3
    function (// TODO: handle also Pat2 & Pat3
    target) { return !target; }, function (reader, target, left) {
        if (!left())
            return;
        skipBytes(reader, left());
        return; // not supported yet
        target;
        readPattern;
        // if (!target.patterns) target.patterns = [];
        // target.patterns.push(readPattern(reader));
        // skipBytes(reader, left());
    }, function (_writer, _target) {
    });
}
function readRect(reader) {
    var top = readInt32(reader);
    var left = readInt32(reader);
    var bottom = readInt32(reader);
    var right = readInt32(reader);
    return { top: top, left: left, bottom: bottom, right: right };
}
function writeRect(writer, rect) {
    writeInt32(writer, rect.top);
    writeInt32(writer, rect.left);
    writeInt32(writer, rect.bottom);
    writeInt32(writer, rect.right);
}
addHandler('Anno', function (target) { return target.annotations !== undefined; }, function (reader, target, left) {
    var major = readUint16(reader);
    var minor = readUint16(reader);
    if (major !== 2 || minor !== 1)
        throw new Error('Invalid Anno version');
    var count = readUint32(reader);
    var annotations = [];
    for (var i = 0; i < count; i++) {
        /*const length =*/ readUint32(reader);
        var type = readSignature(reader);
        var open_1 = !!readUint8(reader);
        /*const flags =*/ readUint8(reader); // always 28
        /*const optionalBlocks =*/ readUint16(reader);
        var iconLocation = readRect(reader);
        var popupLocation = readRect(reader);
        var color = readColor(reader);
        var author = readPascalString(reader, 2);
        var name_1 = readPascalString(reader, 2);
        var date = readPascalString(reader, 2);
        /*const contentLength =*/ readUint32(reader);
        /*const dataType =*/ readSignature(reader);
        var dataLength = readUint32(reader);
        var data = void 0;
        if (type === 'txtA') {
            if (dataLength >= 2 && readUint16(reader) === 0xfeff) {
                data = readUnicodeStringWithLength(reader, (dataLength - 2) / 2);
            }
            else {
                reader.offset -= 2;
                data = readAsciiString(reader, dataLength);
            }
            data = data.replace(/\r/g, '\n');
        }
        else if (type === 'sndA') {
            data = readBytes(reader, dataLength);
        }
        else {
            throw new Error('Unknown annotation type');
        }
        annotations.push({
            type: type === 'txtA' ? 'text' : 'sound',
            open: open_1, iconLocation: iconLocation, popupLocation: popupLocation, color: color, author: author, name: name_1, date: date, data: data,
        });
    }
    target.annotations = annotations;
    skipBytes(reader, left());
}, function (writer, target) {
    var annotations = target.annotations;
    writeUint16(writer, 2);
    writeUint16(writer, 1);
    writeUint32(writer, annotations.length);
    for (var _i = 0, annotations_1 = annotations; _i < annotations_1.length; _i++) {
        var annotation = annotations_1[_i];
        var sound = annotation.type === 'sound';
        if (sound && !(annotation.data instanceof Uint8Array))
            throw new Error('Sound annotation data should be Uint8Array');
        if (!sound && typeof annotation.data !== 'string')
            throw new Error('Text annotation data should be string');
        var lengthOffset = writer.offset;
        writeUint32(writer, 0); // length
        writeSignature(writer, sound ? 'sndA' : 'txtA');
        writeUint8(writer, annotation.open ? 1 : 0);
        writeUint8(writer, 28);
        writeUint16(writer, 1);
        writeRect(writer, annotation.iconLocation);
        writeRect(writer, annotation.popupLocation);
        writeColor(writer, annotation.color);
        writePascalString(writer, annotation.author || '', 2);
        writePascalString(writer, annotation.name || '', 2);
        writePascalString(writer, annotation.date || '', 2);
        var contentOffset = writer.offset;
        writeUint32(writer, 0); // content length
        writeSignature(writer, sound ? 'sndM' : 'txtC');
        writeUint32(writer, 0); // data length
        var dataOffset = writer.offset;
        if (sound) {
            writeBytes(writer, annotation.data);
        }
        else {
            writeUint16(writer, 0xfeff); // unicode string indicator
            var text = annotation.data.replace(/\n/g, '\r');
            for (var i = 0; i < text.length; i++)
                writeUint16(writer, text.charCodeAt(i));
        }
        writer.view.setUint32(lengthOffset, writer.offset - lengthOffset, false);
        writer.view.setUint32(contentOffset, writer.offset - contentOffset, false);
        writer.view.setUint32(dataOffset - 4, writer.offset - dataOffset, false);
    }
});
addHandler('lnk2', function (target) { return !!target.linkedFiles && target.linkedFiles.length > 0; }, function (reader, target, left, _, options) {
    var psd = target;
    psd.linkedFiles = [];
    while (left() > 8) {
        var size = readLength64(reader); // size
        var startOffset = reader.offset;
        var type = readSignature(reader);
        var version = readInt32(reader);
        var id = readPascalString(reader, 1);
        var name_2 = readUnicodeString(reader);
        var fileType = readSignature(reader).trim(); // '    ' if empty
        var fileCreator = readSignature(reader).trim(); // '    ' or '\0\0\0\0' if empty
        var dataSize = readLength64(reader);
        var hasFileOpenDescriptor = readUint8(reader);
        var fileOpenDescriptor = hasFileOpenDescriptor ? readVersionAndDescriptor(reader) : undefined;
        var linkedFileDescriptor = type === 'liFE' ? readVersionAndDescriptor(reader) : undefined;
        var file = { id: id, name: name_2, data: undefined };
        if (fileType)
            file.type = fileType;
        if (fileCreator)
            file.creator = fileCreator;
        if (fileOpenDescriptor)
            file.descriptor = fileOpenDescriptor;
        if (type === 'liFE' && version > 3) {
            var year = readInt32(reader);
            var month = readUint8(reader);
            var day = readUint8(reader);
            var hour = readUint8(reader);
            var minute = readUint8(reader);
            var seconds = readFloat64(reader);
            var wholeSeconds = Math.floor(seconds);
            var ms = (seconds - wholeSeconds) * 1000;
            file.time = new Date(year, month, day, hour, minute, wholeSeconds, ms);
        }
        var fileSize = type === 'liFE' ? readLength64(reader) : 0;
        if (type === 'liFA')
            skipBytes(reader, 8);
        if (type === 'liFD')
            file.data = readBytes(reader, dataSize);
        if (version >= 5)
            file.childDocumentID = readUnicodeString(reader);
        if (version >= 6)
            file.assetModTime = readFloat64(reader);
        if (version >= 7)
            file.assetLockedState = readUint8(reader);
        if (type === 'liFE')
            file.data = readBytes(reader, fileSize);
        if (options.skipLinkedFilesData)
            file.data = undefined;
        psd.linkedFiles.push(file);
        linkedFileDescriptor;
        while (size % 4)
            size++;
        reader.offset = startOffset + size;
    }
    skipBytes(reader, left()); // ?
}, function (writer, target) {
    var psd = target;
    for (var _i = 0, _a = psd.linkedFiles; _i < _a.length; _i++) {
        var file = _a[_i];
        var version = 2;
        if (file.assetLockedState != null)
            version = 7;
        else if (file.assetModTime != null)
            version = 6;
        else if (file.childDocumentID != null)
            version = 5;
        // TODO: else if (file.time != null) version = 3; (only for liFE)
        writeUint32(writer, 0);
        writeUint32(writer, 0); // size
        var sizeOffset = writer.offset;
        writeSignature(writer, file.data ? 'liFD' : 'liFA');
        writeInt32(writer, version);
        writePascalString(writer, file.id || '', 1);
        writeUnicodeStringWithPadding(writer, file.name || '');
        writeSignature(writer, file.type ? (file.type + "    ").substring(0, 4) : '    ');
        writeSignature(writer, file.creator ? (file.creator + "    ").substring(0, 4) : '\0\0\0\0');
        writeLength64(writer, file.data ? file.data.byteLength : 0);
        if (file.descriptor && file.descriptor.compInfo) {
            var desc = {
                compInfo: file.descriptor.compInfo,
            };
            writeUint8(writer, 1);
            writeVersionAndDescriptor(writer, '', 'null', desc);
        }
        else {
            writeUint8(writer, 0);
        }
        if (file.data)
            writeBytes(writer, file.data);
        else
            writeLength64(writer, 0);
        if (version >= 5)
            writeUnicodeStringWithPadding(writer, file.childDocumentID || '');
        if (version >= 6)
            writeFloat64(writer, file.assetModTime || 0);
        if (version >= 7)
            writeUint8(writer, file.assetLockedState || 0);
        var size = writer.offset - sizeOffset;
        writer.view.setUint32(sizeOffset - 4, size, false); // write size
        while (size % 4) {
            size++;
            writeUint8(writer, 0);
        }
    }
});
addHandlerAlias('lnkD', 'lnk2');
addHandlerAlias('lnk3', 'lnk2');
// this seems to just be zero size block, ignore it
addHandler('lnkE', function (target) { return target._lnkE !== undefined; }, function (reader, target, left, _psds, options) {
    if (options.logMissingFeatures && left()) {
        console.log("Non-empty lnkE layer info (" + left() + " bytes)");
    }
    if (MOCK_HANDLERS) {
        target._lnkE = readBytes(reader, left());
    }
}, function (writer, target) { return MOCK_HANDLERS && writeBytes(writer, target._lnkE); });
addHandler('pths', hasKey('pathList'), function (reader, target) {
    var descriptor = readVersionAndDescriptor(reader);
    target.pathList = []; // TODO: read paths (find example with non-empty list)
    descriptor;
    // console.log('pths', descriptor); // TODO: remove this
}, function (writer, _target) {
    var descriptor = {
        pathList: [], // TODO: write paths
    };
    writeVersionAndDescriptor(writer, '', 'pathsDataClass', descriptor);
});
addHandler('lyvr', hasKey('version'), function (reader, target) { return target.version = readUint32(reader); }, function (writer, target) { return writeUint32(writer, target.version); });
function adjustmentType(type) {
    return function (target) { return !!target.adjustment && target.adjustment.type === type; };
}
addHandler('brit', adjustmentType('brightness/contrast'), function (reader, target, left) {
    if (!target.adjustment) { // ignore if got one from CgEd block
        target.adjustment = {
            type: 'brightness/contrast',
            brightness: readInt16(reader),
            contrast: readInt16(reader),
            meanValue: readInt16(reader),
            labColorOnly: !!readUint8(reader),
            useLegacy: true,
        };
    }
    skipBytes(reader, left());
}, function (writer, target) {
    var _a;
    var info = target.adjustment;
    writeInt16(writer, info.brightness || 0);
    writeInt16(writer, info.contrast || 0);
    writeInt16(writer, (_a = info.meanValue) !== null && _a !== void 0 ? _a : 127);
    writeUint8(writer, info.labColorOnly ? 1 : 0);
    writeZeros(writer, 1);
});
function readLevelsChannel(reader) {
    var shadowInput = readInt16(reader);
    var highlightInput = readInt16(reader);
    var shadowOutput = readInt16(reader);
    var highlightOutput = readInt16(reader);
    var midtoneInput = readInt16(reader) / 100;
    return { shadowInput: shadowInput, highlightInput: highlightInput, shadowOutput: shadowOutput, highlightOutput: highlightOutput, midtoneInput: midtoneInput };
}
function writeLevelsChannel(writer, channel) {
    writeInt16(writer, channel.shadowInput);
    writeInt16(writer, channel.highlightInput);
    writeInt16(writer, channel.shadowOutput);
    writeInt16(writer, channel.highlightOutput);
    writeInt16(writer, Math.round(channel.midtoneInput * 100));
}
addHandler('levl', adjustmentType('levels'), function (reader, target, left) {
    if (readUint16(reader) !== 2)
        throw new Error('Invalid levl version');
    target.adjustment = __assign(__assign({}, target.adjustment), { type: 'levels', rgb: readLevelsChannel(reader), red: readLevelsChannel(reader), green: readLevelsChannel(reader), blue: readLevelsChannel(reader) });
    skipBytes(reader, left());
}, function (writer, target) {
    var info = target.adjustment;
    var defaultChannel = {
        shadowInput: 0,
        highlightInput: 255,
        shadowOutput: 0,
        highlightOutput: 255,
        midtoneInput: 1,
    };
    writeUint16(writer, 2); // version
    writeLevelsChannel(writer, info.rgb || defaultChannel);
    writeLevelsChannel(writer, info.red || defaultChannel);
    writeLevelsChannel(writer, info.blue || defaultChannel);
    writeLevelsChannel(writer, info.green || defaultChannel);
    for (var i = 0; i < 59; i++)
        writeLevelsChannel(writer, defaultChannel);
});
function readCurveChannel(reader) {
    var nodes = readUint16(reader);
    var channel = [];
    for (var j = 0; j < nodes; j++) {
        var output = readInt16(reader);
        var input = readInt16(reader);
        channel.push({ input: input, output: output });
    }
    return channel;
}
function writeCurveChannel(writer, channel) {
    writeUint16(writer, channel.length);
    for (var _i = 0, channel_1 = channel; _i < channel_1.length; _i++) {
        var n = channel_1[_i];
        writeUint16(writer, n.output);
        writeUint16(writer, n.input);
    }
}
addHandler('curv', adjustmentType('curves'), function (reader, target, left) {
    readUint8(reader);
    if (readUint16(reader) !== 1)
        throw new Error('Invalid curv version');
    readUint16(reader);
    var channels = readUint16(reader);
    var info = { type: 'curves' };
    if (channels & 1)
        info.rgb = readCurveChannel(reader);
    if (channels & 2)
        info.red = readCurveChannel(reader);
    if (channels & 4)
        info.green = readCurveChannel(reader);
    if (channels & 8)
        info.blue = readCurveChannel(reader);
    target.adjustment = __assign(__assign({}, target.adjustment), info);
    // ignoring, duplicate information
    // checkSignature(reader, 'Crv ');
    // const cVersion = readUint16(reader);
    // readUint16(reader);
    // const channelCount = readUint16(reader);
    // for (let i = 0; i < channelCount; i++) {
    // 	const index = readUint16(reader);
    // 	const nodes = readUint16(reader);
    // 	for (let j = 0; j < nodes; j++) {
    // 		const output = readInt16(reader);
    // 		const input = readInt16(reader);
    // 	}
    // }
    skipBytes(reader, left());
}, function (writer, target) {
    var info = target.adjustment;
    var rgb = info.rgb, red = info.red, green = info.green, blue = info.blue;
    var channels = 0;
    var channelCount = 0;
    if (rgb && rgb.length) {
        channels |= 1;
        channelCount++;
    }
    if (red && red.length) {
        channels |= 2;
        channelCount++;
    }
    if (green && green.length) {
        channels |= 4;
        channelCount++;
    }
    if (blue && blue.length) {
        channels |= 8;
        channelCount++;
    }
    writeUint8(writer, 0);
    writeUint16(writer, 1); // version
    writeUint16(writer, 0);
    writeUint16(writer, channels);
    if (rgb && rgb.length)
        writeCurveChannel(writer, rgb);
    if (red && red.length)
        writeCurveChannel(writer, red);
    if (green && green.length)
        writeCurveChannel(writer, green);
    if (blue && blue.length)
        writeCurveChannel(writer, blue);
    writeSignature(writer, 'Crv ');
    writeUint16(writer, 4); // version
    writeUint16(writer, 0);
    writeUint16(writer, channelCount);
    if (rgb && rgb.length) {
        writeUint16(writer, 0);
        writeCurveChannel(writer, rgb);
    }
    if (red && red.length) {
        writeUint16(writer, 1);
        writeCurveChannel(writer, red);
    }
    if (green && green.length) {
        writeUint16(writer, 2);
        writeCurveChannel(writer, green);
    }
    if (blue && blue.length) {
        writeUint16(writer, 3);
        writeCurveChannel(writer, blue);
    }
    writeZeros(writer, 2);
});
addHandler('expA', adjustmentType('exposure'), function (reader, target, left) {
    if (readUint16(reader) !== 1)
        throw new Error('Invalid expA version');
    target.adjustment = __assign(__assign({}, target.adjustment), { type: 'exposure', exposure: readFloat32(reader), offset: readFloat32(reader), gamma: readFloat32(reader) });
    skipBytes(reader, left());
}, function (writer, target) {
    var info = target.adjustment;
    writeUint16(writer, 1); // version
    writeFloat32(writer, info.exposure);
    writeFloat32(writer, info.offset);
    writeFloat32(writer, info.gamma);
    writeZeros(writer, 2);
});
addHandler('vibA', adjustmentType('vibrance'), function (reader, target, left) {
    var desc = readVersionAndDescriptor(reader);
    target.adjustment = { type: 'vibrance' };
    if (desc.vibrance !== undefined)
        target.adjustment.vibrance = desc.vibrance;
    if (desc.Strt !== undefined)
        target.adjustment.saturation = desc.Strt;
    skipBytes(reader, left());
}, function (writer, target) {
    var info = target.adjustment;
    var desc = {};
    if (info.vibrance !== undefined)
        desc.vibrance = info.vibrance;
    if (info.saturation !== undefined)
        desc.Strt = info.saturation;
    writeVersionAndDescriptor(writer, '', 'null', desc);
});
function readHueChannel(reader) {
    return {
        a: readInt16(reader),
        b: readInt16(reader),
        c: readInt16(reader),
        d: readInt16(reader),
        hue: readInt16(reader),
        saturation: readInt16(reader),
        lightness: readInt16(reader),
    };
}
function writeHueChannel(writer, channel) {
    var c = channel || {};
    writeInt16(writer, c.a || 0);
    writeInt16(writer, c.b || 0);
    writeInt16(writer, c.c || 0);
    writeInt16(writer, c.d || 0);
    writeInt16(writer, c.hue || 0);
    writeInt16(writer, c.saturation || 0);
    writeInt16(writer, c.lightness || 0);
}
addHandler('hue2', adjustmentType('hue/saturation'), function (reader, target, left) {
    if (readUint16(reader) !== 2)
        throw new Error('Invalid hue2 version');
    target.adjustment = __assign(__assign({}, target.adjustment), { type: 'hue/saturation', master: readHueChannel(reader), reds: readHueChannel(reader), yellows: readHueChannel(reader), greens: readHueChannel(reader), cyans: readHueChannel(reader), blues: readHueChannel(reader), magentas: readHueChannel(reader) });
    skipBytes(reader, left());
}, function (writer, target) {
    var info = target.adjustment;
    writeUint16(writer, 2); // version
    writeHueChannel(writer, info.master);
    writeHueChannel(writer, info.reds);
    writeHueChannel(writer, info.yellows);
    writeHueChannel(writer, info.greens);
    writeHueChannel(writer, info.cyans);
    writeHueChannel(writer, info.blues);
    writeHueChannel(writer, info.magentas);
});
function readColorBalance(reader) {
    return {
        cyanRed: readInt16(reader),
        magentaGreen: readInt16(reader),
        yellowBlue: readInt16(reader),
    };
}
function writeColorBalance(writer, value) {
    writeInt16(writer, value.cyanRed || 0);
    writeInt16(writer, value.magentaGreen || 0);
    writeInt16(writer, value.yellowBlue || 0);
}
addHandler('blnc', adjustmentType('color balance'), function (reader, target, left) {
    target.adjustment = {
        type: 'color balance',
        shadows: readColorBalance(reader),
        midtones: readColorBalance(reader),
        highlights: readColorBalance(reader),
        preserveLuminosity: !!readUint8(reader),
    };
    skipBytes(reader, left());
}, function (writer, target) {
    var info = target.adjustment;
    writeColorBalance(writer, info.shadows || {});
    writeColorBalance(writer, info.midtones || {});
    writeColorBalance(writer, info.highlights || {});
    writeUint8(writer, info.preserveLuminosity ? 1 : 0);
    writeZeros(writer, 1);
});
addHandler('blwh', adjustmentType('black & white'), function (reader, target, left) {
    var desc = readVersionAndDescriptor(reader);
    target.adjustment = {
        type: 'black & white',
        reds: desc['Rd  '],
        yellows: desc.Yllw,
        greens: desc['Grn '],
        cyans: desc['Cyn '],
        blues: desc['Bl  '],
        magentas: desc.Mgnt,
        useTint: !!desc.useTint,
        presetKind: desc.bwPresetKind,
        presetFileName: desc.blackAndWhitePresetFileName,
    };
    if (desc.tintColor !== undefined)
        target.adjustment.tintColor = parseColor(desc.tintColor);
    skipBytes(reader, left());
}, function (writer, target) {
    var info = target.adjustment;
    var desc = {
        'Rd  ': info.reds || 0,
        Yllw: info.yellows || 0,
        'Grn ': info.greens || 0,
        'Cyn ': info.cyans || 0,
        'Bl  ': info.blues || 0,
        Mgnt: info.magentas || 0,
        useTint: !!info.useTint,
        tintColor: serializeColor(info.tintColor),
        bwPresetKind: info.presetKind || 0,
        blackAndWhitePresetFileName: info.presetFileName || '',
    };
    writeVersionAndDescriptor(writer, '', 'null', desc);
});
addHandler('phfl', adjustmentType('photo filter'), function (reader, target, left) {
    var version = readUint16(reader);
    if (version !== 2 && version !== 3)
        throw new Error('Invalid phfl version');
    var color;
    if (version === 2) {
        color = readColor(reader);
    }
    else { // version 3
        // TODO: test this, this is probably wrong
        color = {
            l: readInt32(reader) / 100,
            a: readInt32(reader) / 100,
            b: readInt32(reader) / 100,
        };
    }
    target.adjustment = {
        type: 'photo filter',
        color: color,
        density: readUint32(reader) / 100,
        preserveLuminosity: !!readUint8(reader),
    };
    skipBytes(reader, left());
}, function (writer, target) {
    var info = target.adjustment;
    writeUint16(writer, 2); // version
    writeColor(writer, info.color || { l: 0, a: 0, b: 0 });
    writeUint32(writer, (info.density || 0) * 100);
    writeUint8(writer, info.preserveLuminosity ? 1 : 0);
    writeZeros(writer, 3);
});
function readMixrChannel(reader) {
    var red = readInt16(reader);
    var green = readInt16(reader);
    var blue = readInt16(reader);
    skipBytes(reader, 2);
    var constant = readInt16(reader);
    return { red: red, green: green, blue: blue, constant: constant };
}
function writeMixrChannel(writer, channel) {
    var c = channel || {};
    writeInt16(writer, c.red);
    writeInt16(writer, c.green);
    writeInt16(writer, c.blue);
    writeZeros(writer, 2);
    writeInt16(writer, c.constant);
}
addHandler('mixr', adjustmentType('channel mixer'), function (reader, target, left) {
    if (readUint16(reader) !== 1)
        throw new Error('Invalid mixr version');
    var adjustment = target.adjustment = __assign(__assign({}, target.adjustment), { type: 'channel mixer', monochrome: !!readUint16(reader) });
    if (!adjustment.monochrome) {
        adjustment.red = readMixrChannel(reader);
        adjustment.green = readMixrChannel(reader);
        adjustment.blue = readMixrChannel(reader);
    }
    adjustment.gray = readMixrChannel(reader);
    skipBytes(reader, left());
}, function (writer, target) {
    var info = target.adjustment;
    writeUint16(writer, 1); // version
    writeUint16(writer, info.monochrome ? 1 : 0);
    if (info.monochrome) {
        writeMixrChannel(writer, info.gray);
        writeZeros(writer, 3 * 5 * 2);
    }
    else {
        writeMixrChannel(writer, info.red);
        writeMixrChannel(writer, info.green);
        writeMixrChannel(writer, info.blue);
        writeMixrChannel(writer, info.gray);
    }
});
var colorLookupType = createEnum('colorLookupType', '3DLUT', {
    '3dlut': '3DLUT',
    abstractProfile: 'abstractProfile',
    deviceLinkProfile: 'deviceLinkProfile',
});
var LUTFormatType = createEnum('LUTFormatType', 'look', {
    look: 'LUTFormatLOOK',
    cube: 'LUTFormatCUBE',
    '3dl': 'LUTFormat3DL',
});
var colorLookupOrder = createEnum('colorLookupOrder', 'rgb', {
    rgb: 'rgbOrder',
    bgr: 'bgrOrder',
});
addHandler('clrL', adjustmentType('color lookup'), function (reader, target, left) {
    if (readUint16(reader) !== 1)
        throw new Error('Invalid clrL version');
    var desc = readVersionAndDescriptor(reader);
    target.adjustment = { type: 'color lookup' };
    var info = target.adjustment;
    if (desc.lookupType !== undefined)
        info.lookupType = colorLookupType.decode(desc.lookupType);
    if (desc['Nm  '] !== undefined)
        info.name = desc['Nm  '];
    if (desc.Dthr !== undefined)
        info.dither = desc.Dthr;
    if (desc.profile !== undefined)
        info.profile = desc.profile;
    if (desc.LUTFormat !== undefined)
        info.lutFormat = LUTFormatType.decode(desc.LUTFormat);
    if (desc.dataOrder !== undefined)
        info.dataOrder = colorLookupOrder.decode(desc.dataOrder);
    if (desc.tableOrder !== undefined)
        info.tableOrder = colorLookupOrder.decode(desc.tableOrder);
    if (desc.LUT3DFileData !== undefined)
        info.lut3DFileData = desc.LUT3DFileData;
    if (desc.LUT3DFileName !== undefined)
        info.lut3DFileName = desc.LUT3DFileName;
    skipBytes(reader, left());
}, function (writer, target) {
    var info = target.adjustment;
    var desc = {};
    if (info.lookupType !== undefined)
        desc.lookupType = colorLookupType.encode(info.lookupType);
    if (info.name !== undefined)
        desc['Nm  '] = info.name;
    if (info.dither !== undefined)
        desc.Dthr = info.dither;
    if (info.profile !== undefined)
        desc.profile = info.profile;
    if (info.lutFormat !== undefined)
        desc.LUTFormat = LUTFormatType.encode(info.lutFormat);
    if (info.dataOrder !== undefined)
        desc.dataOrder = colorLookupOrder.encode(info.dataOrder);
    if (info.tableOrder !== undefined)
        desc.tableOrder = colorLookupOrder.encode(info.tableOrder);
    if (info.lut3DFileData !== undefined)
        desc.LUT3DFileData = info.lut3DFileData;
    if (info.lut3DFileName !== undefined)
        desc.LUT3DFileName = info.lut3DFileName;
    writeUint16(writer, 1); // version
    writeVersionAndDescriptor(writer, '', 'null', desc);
});
addHandler('nvrt', adjustmentType('invert'), function (reader, target, left) {
    target.adjustment = { type: 'invert' };
    skipBytes(reader, left());
}, function () {
    // nothing to write here
});
addHandler('post', adjustmentType('posterize'), function (reader, target, left) {
    target.adjustment = {
        type: 'posterize',
        levels: readUint16(reader),
    };
    skipBytes(reader, left());
}, function (writer, target) {
    var _a;
    var info = target.adjustment;
    writeUint16(writer, (_a = info.levels) !== null && _a !== void 0 ? _a : 4);
    writeZeros(writer, 2);
});
addHandler('thrs', adjustmentType('threshold'), function (reader, target, left) {
    target.adjustment = {
        type: 'threshold',
        level: readUint16(reader),
    };
    skipBytes(reader, left());
}, function (writer, target) {
    var _a;
    var info = target.adjustment;
    writeUint16(writer, (_a = info.level) !== null && _a !== void 0 ? _a : 128);
    writeZeros(writer, 2);
});
var grdmColorModels = ['', '', '', 'rgb', 'hsb', '', 'lab'];
addHandler('grdm', adjustmentType('gradient map'), function (reader, target, left) {
    if (readUint16(reader) !== 1)
        throw new Error('Invalid grdm version');
    var info = {
        type: 'gradient map',
        gradientType: 'solid',
    };
    info.reverse = !!readUint8(reader);
    info.dither = !!readUint8(reader);
    info.name = readUnicodeString(reader);
    info.colorStops = [];
    info.opacityStops = [];
    var stopsCount = readUint16(reader);
    for (var i = 0; i < stopsCount; i++) {
        info.colorStops.push({
            location: readUint32(reader),
            midpoint: readUint32(reader) / 100,
            color: readColor(reader),
        });
        skipBytes(reader, 2);
    }
    var opacityStopsCount = readUint16(reader);
    for (var i = 0; i < opacityStopsCount; i++) {
        info.opacityStops.push({
            location: readUint32(reader),
            midpoint: readUint32(reader) / 100,
            opacity: readUint16(reader) / 0xff,
        });
    }
    var expansionCount = readUint16(reader);
    if (expansionCount !== 2)
        throw new Error('Invalid grdm expansion count');
    var interpolation = readUint16(reader);
    info.smoothness = interpolation / 4096;
    var length = readUint16(reader);
    if (length !== 32)
        throw new Error('Invalid grdm length');
    info.gradientType = readUint16(reader) ? 'noise' : 'solid';
    info.randomSeed = readUint32(reader);
    info.addTransparency = !!readUint16(reader);
    info.restrictColors = !!readUint16(reader);
    info.roughness = readUint32(reader) / 4096;
    info.colorModel = (grdmColorModels[readUint16(reader)] || 'rgb');
    info.min = [
        readUint16(reader) / 0x8000,
        readUint16(reader) / 0x8000,
        readUint16(reader) / 0x8000,
        readUint16(reader) / 0x8000,
    ];
    info.max = [
        readUint16(reader) / 0x8000,
        readUint16(reader) / 0x8000,
        readUint16(reader) / 0x8000,
        readUint16(reader) / 0x8000,
    ];
    skipBytes(reader, left());
    for (var _i = 0, _a = info.colorStops; _i < _a.length; _i++) {
        var s = _a[_i];
        s.location /= interpolation;
    }
    for (var _b = 0, _c = info.opacityStops; _b < _c.length; _b++) {
        var s = _c[_b];
        s.location /= interpolation;
    }
    target.adjustment = info;
}, function (writer, target) {
    var _a, _b, _c;
    var info = target.adjustment;
    writeUint16(writer, 1); // version
    writeUint8(writer, info.reverse ? 1 : 0);
    writeUint8(writer, info.dither ? 1 : 0);
    writeUnicodeStringWithPadding(writer, info.name || '');
    writeUint16(writer, info.colorStops && info.colorStops.length || 0);
    var interpolation = Math.round(((_a = info.smoothness) !== null && _a !== void 0 ? _a : 1) * 4096);
    for (var _i = 0, _d = info.colorStops || []; _i < _d.length; _i++) {
        var s = _d[_i];
        writeUint32(writer, Math.round(s.location * interpolation));
        writeUint32(writer, Math.round(s.midpoint * 100));
        writeColor(writer, s.color);
        writeZeros(writer, 2);
    }
    writeUint16(writer, info.opacityStops && info.opacityStops.length || 0);
    for (var _e = 0, _f = info.opacityStops || []; _e < _f.length; _e++) {
        var s = _f[_e];
        writeUint32(writer, Math.round(s.location * interpolation));
        writeUint32(writer, Math.round(s.midpoint * 100));
        writeUint16(writer, Math.round(s.opacity * 0xff));
    }
    writeUint16(writer, 2); // expansion count
    writeUint16(writer, interpolation);
    writeUint16(writer, 32); // length
    writeUint16(writer, info.gradientType === 'noise' ? 1 : 0);
    writeUint32(writer, info.randomSeed || 0);
    writeUint16(writer, info.addTransparency ? 1 : 0);
    writeUint16(writer, info.restrictColors ? 1 : 0);
    writeUint32(writer, Math.round(((_b = info.roughness) !== null && _b !== void 0 ? _b : 1) * 4096));
    var colorModel = grdmColorModels.indexOf((_c = info.colorModel) !== null && _c !== void 0 ? _c : 'rgb');
    writeUint16(writer, colorModel === -1 ? 3 : colorModel);
    for (var i = 0; i < 4; i++)
        writeUint16(writer, Math.round((info.min && info.min[i] || 0) * 0x8000));
    for (var i = 0; i < 4; i++)
        writeUint16(writer, Math.round((info.max && info.max[i] || 0) * 0x8000));
    writeZeros(writer, 4);
});
function readSelectiveColors(reader) {
    return {
        c: readInt16(reader),
        m: readInt16(reader),
        y: readInt16(reader),
        k: readInt16(reader),
    };
}
function writeSelectiveColors(writer, cmyk) {
    var c = cmyk || {};
    writeInt16(writer, c.c);
    writeInt16(writer, c.m);
    writeInt16(writer, c.y);
    writeInt16(writer, c.k);
}
addHandler('selc', adjustmentType('selective color'), function (reader, target) {
    if (readUint16(reader) !== 1)
        throw new Error('Invalid selc version');
    var mode = readUint16(reader) ? 'absolute' : 'relative';
    skipBytes(reader, 8);
    target.adjustment = {
        type: 'selective color',
        mode: mode,
        reds: readSelectiveColors(reader),
        yellows: readSelectiveColors(reader),
        greens: readSelectiveColors(reader),
        cyans: readSelectiveColors(reader),
        blues: readSelectiveColors(reader),
        magentas: readSelectiveColors(reader),
        whites: readSelectiveColors(reader),
        neutrals: readSelectiveColors(reader),
        blacks: readSelectiveColors(reader),
    };
}, function (writer, target) {
    var info = target.adjustment;
    writeUint16(writer, 1); // version
    writeUint16(writer, info.mode === 'absolute' ? 1 : 0);
    writeZeros(writer, 8);
    writeSelectiveColors(writer, info.reds);
    writeSelectiveColors(writer, info.yellows);
    writeSelectiveColors(writer, info.greens);
    writeSelectiveColors(writer, info.cyans);
    writeSelectiveColors(writer, info.blues);
    writeSelectiveColors(writer, info.magentas);
    writeSelectiveColors(writer, info.whites);
    writeSelectiveColors(writer, info.neutrals);
    writeSelectiveColors(writer, info.blacks);
});
addHandler('CgEd', function (target) {
    var a = target.adjustment;
    if (!a)
        return false;
    return (a.type === 'brightness/contrast' && !a.useLegacy) ||
        ((a.type === 'levels' || a.type === 'curves' || a.type === 'exposure' || a.type === 'channel mixer' ||
            a.type === 'hue/saturation') && a.presetFileName !== undefined);
}, function (reader, target, left) {
    var desc = readVersionAndDescriptor(reader);
    if (desc.Vrsn !== 1)
        throw new Error('Invalid CgEd version');
    // this section can specify preset file name for other adjustment types
    if ('presetFileName' in desc) {
        target.adjustment = __assign(__assign({}, target.adjustment), { presetKind: desc.presetKind, presetFileName: desc.presetFileName });
    }
    else if ('curvesPresetFileName' in desc) {
        target.adjustment = __assign(__assign({}, target.adjustment), { presetKind: desc.curvesPresetKind, presetFileName: desc.curvesPresetFileName });
    }
    else if ('mixerPresetFileName' in desc) {
        target.adjustment = __assign(__assign({}, target.adjustment), { presetKind: desc.mixerPresetKind, presetFileName: desc.mixerPresetFileName });
    }
    else {
        target.adjustment = {
            type: 'brightness/contrast',
            brightness: desc.Brgh,
            contrast: desc.Cntr,
            meanValue: desc.means,
            useLegacy: !!desc.useLegacy,
            labColorOnly: !!desc['Lab '],
            auto: !!desc.Auto,
        };
    }
    skipBytes(reader, left());
}, function (writer, target) {
    var _a, _b, _c, _d;
    var info = target.adjustment;
    if (info.type === 'levels' || info.type === 'exposure' || info.type === 'hue/saturation') {
        var desc = {
            Vrsn: 1,
            presetKind: (_a = info.presetKind) !== null && _a !== void 0 ? _a : 1,
            presetFileName: info.presetFileName || '',
        };
        writeVersionAndDescriptor(writer, '', 'null', desc);
    }
    else if (info.type === 'curves') {
        var desc = {
            Vrsn: 1,
            curvesPresetKind: (_b = info.presetKind) !== null && _b !== void 0 ? _b : 1,
            curvesPresetFileName: info.presetFileName || '',
        };
        writeVersionAndDescriptor(writer, '', 'null', desc);
    }
    else if (info.type === 'channel mixer') {
        var desc = {
            Vrsn: 1,
            mixerPresetKind: (_c = info.presetKind) !== null && _c !== void 0 ? _c : 1,
            mixerPresetFileName: info.presetFileName || '',
        };
        writeVersionAndDescriptor(writer, '', 'null', desc);
    }
    else if (info.type === 'brightness/contrast') {
        var desc = {
            Vrsn: 1,
            Brgh: info.brightness || 0,
            Cntr: info.contrast || 0,
            means: (_d = info.meanValue) !== null && _d !== void 0 ? _d : 127,
            'Lab ': !!info.labColorOnly,
            useLegacy: !!info.useLegacy,
            Auto: !!info.auto,
        };
        writeVersionAndDescriptor(writer, '', 'null', desc);
    }
    else {
        throw new Error('Unhandled CgEd case');
    }
});
addHandler('Txt2', hasKey('engineData'), function (reader, target, left) {
    var data = readBytes(reader, left());
    target.engineData = fromByteArray(data);
    // const engineData = parseEngineData(data);
    // console.log(require('util').inspect(engineData, false, 99, true));
    // require('fs').writeFileSync('resources/engineData2Simple.txt', require('util').inspect(engineData, false, 99, false), 'utf8');
    // require('fs').writeFileSync('test_data.json', JSON.stringify(ed, null, 2), 'utf8');
}, function (writer, target) {
    var buffer = toByteArray(target.engineData);
    writeBytes(writer, buffer);
});
addHandler('FMsk', hasKey('filterMask'), function (reader, target) {
    target.filterMask = {
        colorSpace: readColor(reader),
        opacity: readUint16(reader) / 0xff,
    };
}, function (writer, target) {
    var _a;
    writeColor(writer, target.filterMask.colorSpace);
    writeUint16(writer, clamp((_a = target.filterMask.opacity) !== null && _a !== void 0 ? _a : 1, 0, 1) * 0xff);
});
addHandler('artd', // document-wide artboard info
function (// document-wide artboard info
target) { return target.artboards !== undefined; }, function (reader, target, left) {
    var desc = readVersionAndDescriptor(reader);
    target.artboards = {
        count: desc['Cnt '],
        autoExpandOffset: { horizontal: desc.autoExpandOffset.Hrzn, vertical: desc.autoExpandOffset.Vrtc },
        origin: { horizontal: desc.origin.Hrzn, vertical: desc.origin.Vrtc },
        autoExpandEnabled: desc.autoExpandEnabled,
        autoNestEnabled: desc.autoNestEnabled,
        autoPositionEnabled: desc.autoPositionEnabled,
        shrinkwrapOnSaveEnabled: desc.shrinkwrapOnSaveEnabled,
        docDefaultNewArtboardBackgroundColor: parseColor(desc.docDefaultNewArtboardBackgroundColor),
        docDefaultNewArtboardBackgroundType: desc.docDefaultNewArtboardBackgroundType,
    };
    skipBytes(reader, left());
}, function (writer, target) {
    var _a, _b, _c, _d, _e;
    var artb = target.artboards;
    var desc = {
        'Cnt ': artb.count,
        autoExpandOffset: artb.autoExpandOffset ? { Hrzn: artb.autoExpandOffset.horizontal, Vrtc: artb.autoExpandOffset.vertical } : { Hrzn: 0, Vrtc: 0 },
        origin: artb.origin ? { Hrzn: artb.origin.horizontal, Vrtc: artb.origin.vertical } : { Hrzn: 0, Vrtc: 0 },
        autoExpandEnabled: (_a = artb.autoExpandEnabled) !== null && _a !== void 0 ? _a : true,
        autoNestEnabled: (_b = artb.autoNestEnabled) !== null && _b !== void 0 ? _b : true,
        autoPositionEnabled: (_c = artb.autoPositionEnabled) !== null && _c !== void 0 ? _c : true,
        shrinkwrapOnSaveEnabled: (_d = artb.shrinkwrapOnSaveEnabled) !== null && _d !== void 0 ? _d : true,
        docDefaultNewArtboardBackgroundColor: serializeColor(artb.docDefaultNewArtboardBackgroundColor),
        docDefaultNewArtboardBackgroundType: (_e = artb.docDefaultNewArtboardBackgroundType) !== null && _e !== void 0 ? _e : 1,
    };
    writeVersionAndDescriptor(writer, '', 'null', desc, 'artd');
});
function parseFxObject(fx) {
    var stroke = {
        enabled: !!fx.enab,
        position: FStl.decode(fx.Styl),
        fillType: FrFl.decode(fx.PntT),
        blendMode: BlnM.decode(fx['Md  ']),
        opacity: parsePercent(fx.Opct),
        size: parseUnits(fx['Sz  ']),
    };
    if (fx.present !== undefined)
        stroke.present = fx.present;
    if (fx.showInDialog !== undefined)
        stroke.showInDialog = fx.showInDialog;
    if (fx.overprint !== undefined)
        stroke.overprint = fx.overprint;
    if (fx['Clr '])
        stroke.color = parseColor(fx['Clr ']);
    if (fx.Grad)
        stroke.gradient = parseGradientContent(fx);
    if (fx.Ptrn)
        stroke.pattern = parsePatternContent(fx);
    return stroke;
}
function serializeFxObject(stroke) {
    var FrFX = {};
    FrFX.enab = !!stroke.enabled;
    if (stroke.present !== undefined)
        FrFX.present = !!stroke.present;
    if (stroke.showInDialog !== undefined)
        FrFX.showInDialog = !!stroke.showInDialog;
    FrFX.Styl = FStl.encode(stroke.position);
    FrFX.PntT = FrFl.encode(stroke.fillType);
    FrFX['Md  '] = BlnM.encode(stroke.blendMode);
    FrFX.Opct = unitsPercent(stroke.opacity);
    FrFX['Sz  '] = unitsValue(stroke.size, 'size');
    if (stroke.color)
        FrFX['Clr '] = serializeColor(stroke.color);
    if (stroke.gradient)
        FrFX = __assign(__assign({}, FrFX), serializeGradientContent(stroke.gradient));
    if (stroke.pattern)
        FrFX = __assign(__assign({}, FrFX), serializePatternContent(stroke.pattern));
    if (stroke.overprint !== undefined)
        FrFX.overprint = !!stroke.overprint;
    return FrFX;
}
function parseEffects(info, log) {
    var effects = {};
    if (!info.masterFXSwitch)
        effects.disabled = true;
    if (info['Scl '])
        effects.scale = parsePercent(info['Scl ']);
    if (info.DrSh)
        effects.dropShadow = [parseEffectObject(info.DrSh, log)];
    if (info.dropShadowMulti)
        effects.dropShadow = info.dropShadowMulti.map(function (i) { return parseEffectObject(i, log); });
    if (info.IrSh)
        effects.innerShadow = [parseEffectObject(info.IrSh, log)];
    if (info.innerShadowMulti)
        effects.innerShadow = info.innerShadowMulti.map(function (i) { return parseEffectObject(i, log); });
    if (info.OrGl)
        effects.outerGlow = parseEffectObject(info.OrGl, log);
    if (info.IrGl)
        effects.innerGlow = parseEffectObject(info.IrGl, log);
    if (info.ebbl)
        effects.bevel = parseEffectObject(info.ebbl, log);
    if (info.SoFi)
        effects.solidFill = [parseEffectObject(info.SoFi, log)];
    if (info.solidFillMulti)
        effects.solidFill = info.solidFillMulti.map(function (i) { return parseEffectObject(i, log); });
    if (info.patternFill)
        effects.patternOverlay = parseEffectObject(info.patternFill, log);
    if (info.GrFl)
        effects.gradientOverlay = [parseEffectObject(info.GrFl, log)];
    if (info.gradientFillMulti)
        effects.gradientOverlay = info.gradientFillMulti.map(function (i) { return parseEffectObject(i, log); });
    if (info.ChFX)
        effects.satin = parseEffectObject(info.ChFX, log);
    if (info.FrFX)
        effects.stroke = [parseFxObject(info.FrFX)];
    if (info.frameFXMulti)
        effects.stroke = info.frameFXMulti.map(function (i) { return parseFxObject(i); });
    return effects;
}
function serializeEffects(e, log, multi) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    var info = multi ? {
        'Scl ': unitsPercent((_a = e.scale) !== null && _a !== void 0 ? _a : 1),
        masterFXSwitch: !e.disabled,
    } : {
        masterFXSwitch: !e.disabled,
        'Scl ': unitsPercent((_b = e.scale) !== null && _b !== void 0 ? _b : 1),
    };
    var arrayKeys = ['dropShadow', 'innerShadow', 'solidFill', 'gradientOverlay', 'stroke'];
    for (var _i = 0, arrayKeys_1 = arrayKeys; _i < arrayKeys_1.length; _i++) {
        var key = arrayKeys_1[_i];
        if (e[key] && !Array.isArray(e[key]))
            throw new Error(key + " should be an array");
    }
    if (((_c = e.dropShadow) === null || _c === void 0 ? void 0 : _c[0]) && !multi)
        info.DrSh = serializeEffectObject(e.dropShadow[0], 'dropShadow', log);
    if (((_d = e.dropShadow) === null || _d === void 0 ? void 0 : _d[0]) && multi)
        info.dropShadowMulti = e.dropShadow.map(function (i) { return serializeEffectObject(i, 'dropShadow', log); });
    if (((_e = e.innerShadow) === null || _e === void 0 ? void 0 : _e[0]) && !multi)
        info.IrSh = serializeEffectObject(e.innerShadow[0], 'innerShadow', log);
    if (((_f = e.innerShadow) === null || _f === void 0 ? void 0 : _f[0]) && multi)
        info.innerShadowMulti = e.innerShadow.map(function (i) { return serializeEffectObject(i, 'innerShadow', log); });
    if (e.outerGlow)
        info.OrGl = serializeEffectObject(e.outerGlow, 'outerGlow', log);
    if (((_g = e.solidFill) === null || _g === void 0 ? void 0 : _g[0]) && multi)
        info.solidFillMulti = e.solidFill.map(function (i) { return serializeEffectObject(i, 'solidFill', log); });
    if (((_h = e.gradientOverlay) === null || _h === void 0 ? void 0 : _h[0]) && multi)
        info.gradientFillMulti = e.gradientOverlay.map(function (i) { return serializeEffectObject(i, 'gradientOverlay', log); });
    if (((_j = e.stroke) === null || _j === void 0 ? void 0 : _j[0]) && multi)
        info.frameFXMulti = e.stroke.map(function (i) { return serializeFxObject(i); });
    if (e.innerGlow)
        info.IrGl = serializeEffectObject(e.innerGlow, 'innerGlow', log);
    if (e.bevel)
        info.ebbl = serializeEffectObject(e.bevel, 'bevel', log);
    if (((_k = e.solidFill) === null || _k === void 0 ? void 0 : _k[0]) && !multi)
        info.SoFi = serializeEffectObject(e.solidFill[0], 'solidFill', log);
    if (e.patternOverlay)
        info.patternFill = serializeEffectObject(e.patternOverlay, 'patternOverlay', log);
    if (((_l = e.gradientOverlay) === null || _l === void 0 ? void 0 : _l[0]) && !multi)
        info.GrFl = serializeEffectObject(e.gradientOverlay[0], 'gradientOverlay', log);
    if (e.satin)
        info.ChFX = serializeEffectObject(e.satin, 'satin', log);
    if (((_m = e.stroke) === null || _m === void 0 ? void 0 : _m[0]) && !multi)
        info.FrFX = serializeFxObject((_o = e.stroke) === null || _o === void 0 ? void 0 : _o[0]);
    if (multi) {
        info.numModifyingFX = 0;
        for (var _p = 0, _q = Object.keys(e); _p < _q.length; _p++) {
            var key = _q[_p];
            var value = e[key];
            if (Array.isArray(value)) {
                for (var _r = 0, value_1 = value; _r < value_1.length; _r++) {
                    var effect = value_1[_r];
                    if (effect.enabled)
                        info.numModifyingFX++;
                }
            }
        }
    }
    return info;
}
export function hasMultiEffects(effects) {
    return Object.keys(effects).map(function (key) { return effects[key]; }).some(function (v) { return Array.isArray(v) && v.length > 1; });
}
addHandler('lfx2', function (target) { return target.effects !== undefined && !hasMultiEffects(target.effects); }, function (reader, target, left, _, options) {
    var version = readUint32(reader);
    if (version !== 0)
        throw new Error("Invalid lfx2 version");
    var desc = readVersionAndDescriptor(reader);
    // console.log(require('util').inspect(desc, false, 99, true));
    // TODO: don't discard if we got it from lmfx
    // discard if read in 'lrFX' section
    target.effects = parseEffects(desc, !!options.logMissingFeatures);
    skipBytes(reader, left());
}, function (writer, target, _, options) {
    var desc = serializeEffects(target.effects, !!options.logMissingFeatures, false);
    // console.log(require('util').inspect(desc, false, 99, true));
    writeUint32(writer, 0); // version
    writeVersionAndDescriptor(writer, '', 'null', desc);
});
addHandler('cinf', hasKey('compositorUsed'), function (reader, target, left) {
    var desc = readVersionAndDescriptor(reader);
    // console.log(require('util').inspect(desc, false, 99, true));
    target.compositorUsed = {
        description: desc.description,
        reason: desc.reason,
        engine: desc.Engn.split('.')[1],
        enableCompCore: desc.enableCompCore.split('.')[1],
        enableCompCoreGPU: desc.enableCompCoreGPU.split('.')[1],
        compCoreSupport: desc.compCoreSupport.split('.')[1],
        compCoreGPUSupport: desc.compCoreGPUSupport.split('.')[1],
    };
    skipBytes(reader, left());
}, function (writer, target) {
    var cinf = target.compositorUsed;
    var desc = {
        Vrsn: { major: 1, minor: 0, fix: 0 },
        // psVersion: { major: 22, minor: 3, fix: 1 }, // TESTING
        description: cinf.description,
        reason: cinf.reason,
        Engn: "Engn." + cinf.engine,
        enableCompCore: "enable." + cinf.enableCompCore,
        enableCompCoreGPU: "enable." + cinf.enableCompCoreGPU,
        // enableCompCoreThreads: `enable.feature`, // TESTING
        compCoreSupport: "reason." + cinf.compCoreSupport,
        compCoreGPUSupport: "reason." + cinf.compCoreGPUSupport,
    };
    writeVersionAndDescriptor(writer, '', 'null', desc);
});
// extension settings ?, ignore it
addHandler('extn', function (target) { return target._extn !== undefined; }, function (reader, target) {
    var desc = readVersionAndDescriptor(reader);
    // console.log(require('util').inspect(desc, false, 99, true));
    if (MOCK_HANDLERS)
        target._extn = desc;
}, function (writer, target) {
    // TODO: need to add correct types for desc fields (resources/src.psd)
    if (MOCK_HANDLERS)
        writeVersionAndDescriptor(writer, '', 'null', target._extn);
});
addHandler('iOpa', hasKey('fillOpacity'), function (reader, target) {
    target.fillOpacity = readUint8(reader) / 0xff;
    skipBytes(reader, 3);
}, function (writer, target) {
    writeUint8(writer, target.fillOpacity * 0xff);
    writeZeros(writer, 3);
});
addHandler('tsly', hasKey('transparencyShapesLayer'), function (reader, target) {
    target.transparencyShapesLayer = !!readUint8(reader);
    skipBytes(reader, 3);
}, function (writer, target) {
    writeUint8(writer, target.transparencyShapesLayer ? 1 : 0);
    writeZeros(writer, 3);
});
// descriptor helpers
function parseGradient(grad) {
    if (grad.GrdF === 'GrdF.CstS') {
        var samples_1 = grad.Intr || 4096;
        return {
            type: 'solid',
            name: grad['Nm  '],
            smoothness: grad.Intr / 4096,
            colorStops: grad.Clrs.map(function (s) { return ({
                color: parseColor(s['Clr ']),
                location: s.Lctn / samples_1,
                midpoint: s.Mdpn / 100,
            }); }),
            opacityStops: grad.Trns.map(function (s) { return ({
                opacity: parsePercent(s.Opct),
                location: s.Lctn / samples_1,
                midpoint: s.Mdpn / 100,
            }); }),
        };
    }
    else {
        return {
            type: 'noise',
            name: grad['Nm  '],
            roughness: grad.Smth / 4096,
            colorModel: ClrS.decode(grad.ClrS),
            randomSeed: grad.RndS,
            restrictColors: !!grad.VctC,
            addTransparency: !!grad.ShTr,
            min: grad['Mnm '].map(function (x) { return x / 100; }),
            max: grad['Mxm '].map(function (x) { return x / 100; }),
        };
    }
}
function serializeGradient(grad) {
    var _a, _b;
    if (grad.type === 'solid') {
        var samples_2 = Math.round(((_a = grad.smoothness) !== null && _a !== void 0 ? _a : 1) * 4096);
        return {
            'Nm  ': grad.name || '',
            GrdF: 'GrdF.CstS',
            Intr: samples_2,
            Clrs: grad.colorStops.map(function (s) {
                var _a;
                return ({
                    'Clr ': serializeColor(s.color),
                    Type: 'Clry.UsrS',
                    Lctn: Math.round(s.location * samples_2),
                    Mdpn: Math.round(((_a = s.midpoint) !== null && _a !== void 0 ? _a : 0.5) * 100),
                });
            }),
            Trns: grad.opacityStops.map(function (s) {
                var _a;
                return ({
                    Opct: unitsPercent(s.opacity),
                    Lctn: Math.round(s.location * samples_2),
                    Mdpn: Math.round(((_a = s.midpoint) !== null && _a !== void 0 ? _a : 0.5) * 100),
                });
            }),
        };
    }
    else {
        return {
            GrdF: 'GrdF.ClNs',
            'Nm  ': grad.name || '',
            ShTr: !!grad.addTransparency,
            VctC: !!grad.restrictColors,
            ClrS: ClrS.encode(grad.colorModel),
            RndS: grad.randomSeed || 0,
            Smth: Math.round(((_b = grad.roughness) !== null && _b !== void 0 ? _b : 1) * 4096),
            'Mnm ': (grad.min || [0, 0, 0, 0]).map(function (x) { return x * 100; }),
            'Mxm ': (grad.max || [1, 1, 1, 1]).map(function (x) { return x * 100; }),
        };
    }
}
function parseGradientContent(descriptor) {
    var result = parseGradient(descriptor.Grad);
    result.style = GrdT.decode(descriptor.Type);
    if (descriptor.Dthr !== undefined)
        result.dither = descriptor.Dthr;
    if (descriptor.Rvrs !== undefined)
        result.reverse = descriptor.Rvrs;
    if (descriptor.Angl !== undefined)
        result.angle = parseAngle(descriptor.Angl);
    if (descriptor['Scl '] !== undefined)
        result.scale = parsePercent(descriptor['Scl ']);
    if (descriptor.Algn !== undefined)
        result.align = descriptor.Algn;
    if (descriptor.Ofst !== undefined) {
        result.offset = {
            x: parsePercent(descriptor.Ofst.Hrzn),
            y: parsePercent(descriptor.Ofst.Vrtc)
        };
    }
    return result;
}
function parsePatternContent(descriptor) {
    var result = {
        name: descriptor.Ptrn['Nm  '],
        id: descriptor.Ptrn.Idnt,
    };
    if (descriptor.Lnkd !== undefined)
        result.linked = descriptor.Lnkd;
    if (descriptor.phase !== undefined)
        result.phase = { x: descriptor.phase.Hrzn, y: descriptor.phase.Vrtc };
    return result;
}
function parseVectorContent(descriptor) {
    if ('Grad' in descriptor) {
        return parseGradientContent(descriptor);
    }
    else if ('Ptrn' in descriptor) {
        return __assign({ type: 'pattern' }, parsePatternContent(descriptor));
    }
    else if ('Clr ' in descriptor) {
        return { type: 'color', color: parseColor(descriptor['Clr ']) };
    }
    else {
        throw new Error('Invalid vector content');
    }
}
function serializeGradientContent(content) {
    var result = {};
    if (content.dither !== undefined)
        result.Dthr = content.dither;
    if (content.reverse !== undefined)
        result.Rvrs = content.reverse;
    if (content.angle !== undefined)
        result.Angl = unitsAngle(content.angle);
    result.Type = GrdT.encode(content.style);
    if (content.align !== undefined)
        result.Algn = content.align;
    if (content.scale !== undefined)
        result['Scl '] = unitsPercent(content.scale);
    if (content.offset) {
        result.Ofst = {
            Hrzn: unitsPercent(content.offset.x),
            Vrtc: unitsPercent(content.offset.y),
        };
    }
    result.Grad = serializeGradient(content);
    return result;
}
function serializePatternContent(content) {
    var result = {
        Ptrn: {
            'Nm  ': content.name || '',
            Idnt: content.id || '',
        }
    };
    if (content.linked !== undefined)
        result.Lnkd = !!content.linked;
    if (content.phase !== undefined)
        result.phase = { Hrzn: content.phase.x, Vrtc: content.phase.y };
    return result;
}
function serializeVectorContent(content) {
    if (content.type === 'color') {
        return { key: 'SoCo', descriptor: { 'Clr ': serializeColor(content.color) } };
    }
    else if (content.type === 'pattern') {
        return { key: 'PtFl', descriptor: serializePatternContent(content) };
    }
    else {
        return { key: 'GdFl', descriptor: serializeGradientContent(content) };
    }
}
function parseColor(color) {
    if ('H   ' in color) {
        return { h: parsePercentOrAngle(color['H   ']), s: color.Strt, b: color.Brgh };
    }
    else if ('Rd  ' in color) {
        return { r: color['Rd  '], g: color['Grn '], b: color['Bl  '] };
    }
    else if ('Cyn ' in color) {
        return { c: color['Cyn '], m: color.Mgnt, y: color['Ylw '], k: color.Blck };
    }
    else if ('Gry ' in color) {
        return { k: color['Gry '] };
    }
    else if ('Lmnc' in color) {
        return { l: color.Lmnc, a: color['A   '], b: color['B   '] };
    }
    else {
        throw new Error('Unsupported color descriptor');
    }
}
function serializeColor(color) {
    if (!color) {
        return { 'Rd  ': 0, 'Grn ': 0, 'Bl  ': 0 };
    }
    else if ('r' in color) {
        return { 'Rd  ': color.r || 0, 'Grn ': color.g || 0, 'Bl  ': color.b || 0 };
    }
    else if ('h' in color) {
        return { 'H   ': unitsAngle(color.h * 360), Strt: color.s || 0, Brgh: color.b || 0 };
    }
    else if ('c' in color) {
        return { 'Cyn ': color.c || 0, Mgnt: color.m || 0, 'Ylw ': color.y || 0, Blck: color.k || 0 };
    }
    else if ('l' in color) {
        return { Lmnc: color.l || 0, 'A   ': color.a || 0, 'B   ': color.b || 0 };
    }
    else if ('k' in color) {
        return { 'Gry ': color.k };
    }
    else {
        throw new Error('Invalid color value');
    }
}
function parseEffectObject(obj, reportErrors) {
    var result = {};
    for (var _i = 0, _a = Object.keys(obj); _i < _a.length; _i++) {
        var key = _a[_i];
        var val = obj[key];
        switch (key) {
            case 'enab':
                result.enabled = !!val;
                break;
            case 'uglg':
                result.useGlobalLight = !!val;
                break;
            case 'AntA':
                result.antialiased = !!val;
                break;
            case 'Algn':
                result.align = !!val;
                break;
            case 'Dthr':
                result.dither = !!val;
                break;
            case 'Invr':
                result.invert = !!val;
                break;
            case 'Rvrs':
                result.reverse = !!val;
                break;
            case 'Clr ':
                result.color = parseColor(val);
                break;
            case 'hglC':
                result.highlightColor = parseColor(val);
                break;
            case 'sdwC':
                result.shadowColor = parseColor(val);
                break;
            case 'Styl':
                result.position = FStl.decode(val);
                break;
            case 'Md  ':
                result.blendMode = BlnM.decode(val);
                break;
            case 'hglM':
                result.highlightBlendMode = BlnM.decode(val);
                break;
            case 'sdwM':
                result.shadowBlendMode = BlnM.decode(val);
                break;
            case 'bvlS':
                result.style = BESl.decode(val);
                break;
            case 'bvlD':
                result.direction = BESs.decode(val);
                break;
            case 'bvlT':
                result.technique = bvlT.decode(val);
                break;
            case 'GlwT':
                result.technique = BETE.decode(val);
                break;
            case 'glwS':
                result.source = IGSr.decode(val);
                break;
            case 'Type':
                result.type = GrdT.decode(val);
                break;
            case 'Opct':
                result.opacity = parsePercent(val);
                break;
            case 'hglO':
                result.highlightOpacity = parsePercent(val);
                break;
            case 'sdwO':
                result.shadowOpacity = parsePercent(val);
                break;
            case 'lagl':
                result.angle = parseAngle(val);
                break;
            case 'Angl':
                result.angle = parseAngle(val);
                break;
            case 'Lald':
                result.altitude = parseAngle(val);
                break;
            case 'Sftn':
                result.soften = parseUnits(val);
                break;
            case 'srgR':
                result.strength = parsePercent(val);
                break;
            case 'blur':
                result.size = parseUnits(val);
                break;
            case 'Nose':
                result.noise = parsePercent(val);
                break;
            case 'Inpr':
                result.range = parsePercent(val);
                break;
            case 'Ckmt':
                result.choke = parseUnits(val);
                break;
            case 'ShdN':
                result.jitter = parsePercent(val);
                break;
            case 'Dstn':
                result.distance = parseUnits(val);
                break;
            case 'Scl ':
                result.scale = parsePercent(val);
                break;
            case 'Ptrn':
                result.pattern = { name: val['Nm  '], id: val.Idnt };
                break;
            case 'phase':
                result.phase = { x: val.Hrzn, y: val.Vrtc };
                break;
            case 'Ofst':
                result.offset = { x: parsePercent(val.Hrzn), y: parsePercent(val.Vrtc) };
                break;
            case 'MpgS':
            case 'TrnS':
                result.contour = {
                    name: val['Nm  '],
                    curve: val['Crv '].map(function (p) { return ({ x: p.Hrzn, y: p.Vrtc }); }),
                };
                break;
            case 'Grad':
                result.gradient = parseGradient(val);
                break;
            case 'useTexture':
            case 'useShape':
            case 'layerConceals':
            case 'present':
            case 'showInDialog':
            case 'antialiasGloss':
                result[key] = val;
                break;
            default:
                reportErrors && console.log("Invalid effect key: '" + key + "':", val);
        }
    }
    return result;
}
function serializeEffectObject(obj, objName, reportErrors) {
    var result = {};
    for (var _i = 0, _a = Object.keys(obj); _i < _a.length; _i++) {
        var objKey = _a[_i];
        var key = objKey;
        var val = obj[key];
        switch (key) {
            case 'enabled':
                result.enab = !!val;
                break;
            case 'useGlobalLight':
                result.uglg = !!val;
                break;
            case 'antialiased':
                result.AntA = !!val;
                break;
            case 'align':
                result.Algn = !!val;
                break;
            case 'dither':
                result.Dthr = !!val;
                break;
            case 'invert':
                result.Invr = !!val;
                break;
            case 'reverse':
                result.Rvrs = !!val;
                break;
            case 'color':
                result['Clr '] = serializeColor(val);
                break;
            case 'highlightColor':
                result.hglC = serializeColor(val);
                break;
            case 'shadowColor':
                result.sdwC = serializeColor(val);
                break;
            case 'position':
                result.Styl = FStl.encode(val);
                break;
            case 'blendMode':
                result['Md  '] = BlnM.encode(val);
                break;
            case 'highlightBlendMode':
                result.hglM = BlnM.encode(val);
                break;
            case 'shadowBlendMode':
                result.sdwM = BlnM.encode(val);
                break;
            case 'style':
                result.bvlS = BESl.encode(val);
                break;
            case 'direction':
                result.bvlD = BESs.encode(val);
                break;
            case 'technique':
                if (objName === 'bevel') {
                    result.bvlT = bvlT.encode(val);
                }
                else {
                    result.GlwT = BETE.encode(val);
                }
                break;
            case 'source':
                result.glwS = IGSr.encode(val);
                break;
            case 'type':
                result.Type = GrdT.encode(val);
                break;
            case 'opacity':
                result.Opct = unitsPercent(val);
                break;
            case 'highlightOpacity':
                result.hglO = unitsPercent(val);
                break;
            case 'shadowOpacity':
                result.sdwO = unitsPercent(val);
                break;
            case 'angle':
                if (objName === 'gradientOverlay') {
                    result.Angl = unitsAngle(val);
                }
                else {
                    result.lagl = unitsAngle(val);
                }
                break;
            case 'altitude':
                result.Lald = unitsAngle(val);
                break;
            case 'soften':
                result.Sftn = unitsValue(val, key);
                break;
            case 'strength':
                result.srgR = unitsPercent(val);
                break;
            case 'size':
                result.blur = unitsValue(val, key);
                break;
            case 'noise':
                result.Nose = unitsPercent(val);
                break;
            case 'range':
                result.Inpr = unitsPercent(val);
                break;
            case 'choke':
                result.Ckmt = unitsValue(val, key);
                break;
            case 'jitter':
                result.ShdN = unitsPercent(val);
                break;
            case 'distance':
                result.Dstn = unitsValue(val, key);
                break;
            case 'scale':
                result['Scl '] = unitsPercent(val);
                break;
            case 'pattern':
                result.Ptrn = { 'Nm  ': val.name, Idnt: val.id };
                break;
            case 'phase':
                result.phase = { Hrzn: val.x, Vrtc: val.y };
                break;
            case 'offset':
                result.Ofst = { Hrzn: unitsPercent(val.x), Vrtc: unitsPercent(val.y) };
                break;
            case 'contour': {
                result[objName === 'satin' ? 'MpgS' : 'TrnS'] = {
                    'Nm  ': val.name,
                    'Crv ': val.curve.map(function (p) { return ({ Hrzn: p.x, Vrtc: p.y }); }),
                };
                break;
            }
            case 'gradient':
                result.Grad = serializeGradient(val);
                break;
            case 'useTexture':
            case 'useShape':
            case 'layerConceals':
            case 'present':
            case 'showInDialog':
            case 'antialiasGloss':
                result[key] = val;
                break;
            default:
                reportErrors && console.log("Invalid effect key: '" + key + "' value:", val);
        }
    }
    return result;
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Q0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pELFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUNELENBQUM7QUFFRixVQUFVLENBQ1QsTUFBTSxFQUNOLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxFQUMvQixVQUFDLE1BQU0sRUFBRSxNQUFNO0lBQ2QsTUFBTSxDQUFDLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbkQsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN0QixDQUFDLEVBQ0QsVUFBQyxNQUFNLEVBQUUsTUFBTTtJQUNkLFVBQVUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pELFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUNELENBQUM7QUFFRixVQUFVLENBQ1QsTUFBTSxFQUNOLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFDbEIsVUFBQyxNQUFNLEVBQUUsTUFBTTtJQUNkLE1BQU0sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0QyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3RCLENBQUMsRUFDRCxVQUFDLE1BQU0sRUFBRSxNQUFNO0lBQ2QsVUFBVSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUNELENBQUM7QUFFRixVQUFVLENBQ1QsTUFBTSxFQUNOLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFDbkIsVUFBQyxNQUFNLEVBQUUsTUFBTTtJ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QUUsVUFBVSxFQUFFLENBQUM7SUFDekMsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLFNBQVM7UUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQzVFLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxTQUFTO1FBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztJQUV0RSxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7QUFDM0IsQ0FBQyxFQUNELFVBQUMsTUFBTSxFQUFFLE1BQU07SUFDZCxJQUFNLElBQUksR0FBRyxNQUFNLENBQUMsVUFBZ0MsQ0FBQztJQUNyRCxJQUFNLElBQUksR0FBdUIsRUFBRSxDQUFDO0lBQ3BDLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxTQUFTO1FBQUUsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQy9ELElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxTQUFTO1FBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBRS9ELHlCQUF5QixDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3JELENBQUMsQ0FDRCxDQUFDO0FBRUYsU0FBUyxjQUFjLENBQUMsTUFBaUI7SUFDeEMsT0FBTztRQUNOLENBQUMsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDO1FBQ3BCLENBQUMsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDO1FBQ3BCLENBQUMsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDO1FBQ3BCLENBQUMsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDO1FBQ3BCLEdBQUcsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDO1FBQ3RCLFVBQVUsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDO1FBQzdCLFNBQVMsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDO0tBQzVCLENBQUM7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QUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDNUQsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLFNBQVM7UUFBRSxJQUFJLENBQUMsU0FBUyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3hGLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxTQUFTO1FBQUUsSUFBSSxDQUFDLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzNGLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxTQUFTO1FBQUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzlGLElBQUksSUFBSSxDQUFDLGFBQWEsS0FBSyxTQUFTO1FBQUUsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzlFLElBQUksSUFBSSxDQUFDLGFBQWEsS0FBSyxTQUFTO1FBQUUsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBRTlFLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUMzQixDQUFDLEVBQ0QsVUFBQyxNQUFNLEVBQUUsTUFBTTtJQUNkLElBQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxVQUFtQyxDQUFDO0lBQ3hELElBQU0sSUFBSSxHQUEwQixFQUFFLENBQUM7SUFFdkMsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLFNBQVM7UUFBRSxJQUFJLENBQUMsVUFBVSxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzdGLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxTQUFTO1FBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDdEQsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFL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TUFBTTtZQUN2RCxLQUFLLE1BQU07Z0JBQUUsTUFBTSxDQUFDLGdCQUFnQixHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ2hFLEtBQUssTUFBTTtnQkFBRSxNQUFNLENBQUMsYUFBYSxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQzdELEtBQUssTUFBTTtnQkFBRSxNQUFNLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ25ELEtBQUssTUFBTTtnQkFBRSxNQUFNLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ25ELEtBQUssTUFBTTtnQkFBRSxNQUFNLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ3RELEtBQUssTUFBTTtnQkFBRSxNQUFNLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ3BELEtBQUssTUFBTTtnQkFBRSxNQUFNLENBQUMsUUFBUSxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ3hELEtBQUssTUFBTTtnQkFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ2xELEtBQUssTUFBTTtnQkFBRSxNQUFNLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ3JELEtBQUssTUFBTTtnQkFBRSxNQUFNLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ3JELEtBQUssTUFBTTtnQkFBRSxNQUFNLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ25ELEtBQUssTUFBTTtnQkFBRSxNQUFNLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ3RELEtBQUssTUFBTTtnQkFBRSxNQUFNLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ3RELEtBQUssTUFBTTtnQkFBRSxNQUFNLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ3JELEtBQUssTUFBTTtnQkFBRSxNQUFNLENBQUMsT0FBTyxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUFDLE1BQU07WUFDekUsS0FBSyxPQUFPO2dCQUFFLE1BQU0sQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUFDLE1BQU07WUFDakUsS0FBSyxNQUFNO2dCQUFFLE1BQU0sQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLEVBQUUsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUFDLE1BQU07WUFDN0YsS0FBSyxNQUFNLENBQUM7WUFDWixLQUFLLE1BQU07Z0JBQ1YsTUFBTSxDQUFDLE9BQU8sR0FBRztvQkFDaEIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUM7b0JBQ2pCLEtBQUssRUFBRyxHQUFHLENBQUMsTUFBTSxDQUFXLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBMUIsQ0FBMEIsQ0FBQztpQkFDbEUsQ0FBQztnQkFDRixNQUFNO1lBQ1AsS0FBSyxNQUFNO2dCQUFFLE1BQU0sQ0FBQyxRQUFRLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUFDLE1BQU07WUFDekQsS0FBSyxZQUFZLENBQUM7WUFDbEIsS0FBSyxVQUFVLENBQUM7WUFDaEIsS0FBSyxlQUFlLENBQUM7WUFDckIsS0FBSyxTQUFTLENBQUM7WUFDZixLQUFLLGNBQWMsQ0FBQztZQUNwQixLQUFLLGdCQUFnQjtnQkFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO2dCQUFDLE1BQU07WUFDaEQ7Z0JBQ0MsWUFBWSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQXdCLEdBQUcsT0FBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ25FO0tBQ0Q7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRCxTQUFTLHFCQUFxQixDQUFDLEdBQVEsRUFBRSxPQUFlLEVBQUUsWUFBcUI7SUFDOUUsSUFBTSxNQUFNLEdBQVEsRUFBRSxDQUFDO0lBRXZCLEtBQXFCLFVBQWdCLEVBQWhCLEtBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBaEIsY0FBZ0IsRUFBaEIsSUFBZ0IsRUFBRTtRQUFsQyxJQUFNLE1BQU0sU0FBQTtRQUNoQixJQUFNLEdBQUcsR0FBcUIsTUFBYSxDQUFDO1FBQzVDLElBQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVyQixRQUFRLEdBQUcsRUFBRTtZQUNaLEtBQUssU0FBUztnQkFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7Z0JBQUMsTUFBTTtZQUMzQyxLQUFLLGdCQUFnQjtnQkFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7Z0JBQUMsTUFBTTtZQUNsRCxLQUFLLGFBQWE7Z0JBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO2dCQUFDLE1BQU07WUFDL0MsS0FBSyxPQUFPO2dCQUFFLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztnQkFBQyxNQUFNO1lBQ3pDLEtBQUssUUFBUTtnQkFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7Z0JBQUMsTUFBTTtZQUMxQyxLQUFLLFFBQVE7Z0JBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO2dCQUFDLE1BQU07WUFDMUMsS0FBSyxTQUFTO2dCQUFFLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztnQkFBQyxNQUFNO1lBQzNDLEtBQUssT0FBTztnQkFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUFDLE1BQU07WUFDMUQsS0FBSyxnQkFBZ0I7Z0JBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQUMsTUFBTTtZQUNoRSxLQUFLLGFBQWE7Z0JBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQUMsTUFBTTtZQUM3RCxLQUFLLFVBQVU7Z0JBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUFDLE1BQU07WUFDdkQsS0FBSyxXQUFXO2dCQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUFDLE1BQU07WUFDM0QsS0FBSyxvQkFBb0I7Z0JBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUFDLE1BQU07WUFDakUsS0FBSyxpQkFBaUI7Z0JBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUFDLE1BQU07WUFDOUQsS0FBSyxPQUFPO2dCQUFFLE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ3BELEtBQUssV0FBVztnQkFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQUMsTUFBTTtZQUN4RCxLQUFLLFdBQVc7Z0JBQ2YsSUFBSSxPQUFPLEtBQUssT0FBTyxFQUFFO29CQUN4QixNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQy9CO3FCQUFNO29CQUNOLE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDL0I7Z0JBQ0QsTUFBTTtZQUNQLEtBQUssUUFBUTtnQkFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQUMsTUFBTTtZQUNyRCxLQUFLLE1BQU07Z0JBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUFDLE1BQU07WUFDbkQsS0FBSyxTQUFTO2dCQUFFLE1BQU0sQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUFDLE1BQU07WUFDdkQsS0FBSyxrQkFBa0I7Z0JBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQUMsTUFBTTtZQUNoRSxLQUFLLGVBQWU7Z0JBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQUMsTUFBTTtZQUM3RCxLQUFLLE9BQU87Z0JBQ1gsSUFBSSxPQUFPLEtBQUssaUJBQWlCLEVBQUU7b0JBQ2xDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUM5QjtxQkFBTTtvQkFDTixNQUFNLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDOUI7Z0JBQ0QsTUFBTTtZQUNQLEtBQUssVUFBVTtnQkFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ3RELEtBQUssUUFBUTtnQkFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQUMsTUFBTTtZQUN6RCxLQUFLLFVBQVU7Z0JBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQUMsTUFBTTtZQUN4RCxLQUFLLE1BQU07Z0JBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUFDLE1BQU07WUFDdkQsS0FBSyxPQUFPO2dCQUFFLE1BQU0sQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUFDLE1BQU07WUFDckQsS0FBSyxPQUFPO2dCQUFFLE1BQU0sQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUFDLE1BQU07WUFDckQsS0FBSyxPQUFPO2dCQUFFLE1BQU0sQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ3hELEtBQUssUUFBUTtnQkFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ3RELEtBQUssVUFBVTtnQkFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQUMsTUFBTTtZQUMzRCxLQUFLLE9BQU87Z0JBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ3hELEtBQUssU0FBUztnQkFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFBQyxNQUFNO1lBQ3hFLEtBQUssT0FBTztnQkFBRSxNQUFNLENBQUMsS0FBSyxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFBQyxNQUFNO1lBQ2pFLEtBQUssUUFBUTtnQkFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLEVBQUUsSUFBSSxFQUFFLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFBQyxNQUFNO1lBQzdGLEtBQUssU0FBUyxDQUFDLENBQUM7Z0JBQ2YsTUFBTSxDQUFDLE9BQU8sS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUc7b0JBQy9DLE1BQU0sRUFBRyxHQUFxQixDQUFDLElBQUk7b0JBQ25DLE1BQU0sRUFBRyxHQUFxQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUExQixDQUEwQixDQUFDO2lCQUN6RSxDQUFDO2dCQUNGLE1BQU07YUFDTjtZQUNELEtBQUssVUFBVTtnQkFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUFDLE1BQU07WUFDN0QsS0FBSyxZQUFZLENBQUM7WUFDbEIsS0FBSyxVQUFVLENBQUM7WUFDaEIsS0FBSyxlQUFlLENBQUM7WUFDckIsS0FBSyxTQUFTLENBQUM7WUFDZixLQUFLLGNBQWMsQ0FBQztZQUNwQixLQUFLLGdCQUFnQjtnQkFDcEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztnQkFDbEIsTUFBTTtZQUNQO2dCQUNDLFlBQVksSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUF3QixHQUFHLGFBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUN6RTtLQUNEO0lBRUQsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDIiwiZmlsZSI6ImFkZGl0aW9uYWxJbmZvLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZnJvbUJ5dGVBcnJheSwgdG9CeXRlQXJyYXkgfSBmcm9tICdiYXNlNjQtanMnO1xuaW1wb3J0IHsgcmVhZEVmZmVjdHMsIHdyaXRlRWZmZWN0cyB9IGZyb20gJy4vZWZmZWN0c0hlbHBlcnMnO1xuaW1wb3J0IHsgY2xhbXAsIGNyZWF0ZUVudW0sIGxheWVyQ29sb3JzLCBNT0NLX0hBTkRMRVJTIH0gZnJvbSAnLi9oZWxwZXJzJztcbmltcG9ydCB7XG5cdExheWVyQWRkaXRpb25hbEluZm8sIExheWVyRWZmZWN0U2hhZG93LCBMYXllckVmZmVjdHNPdXRlckdsb3csIExheWVyRWZmZWN0SW5uZXJHbG93LCBMYXllckVmZmVjdEJldmVsLFxuXHRMYXllckVmZmVjdFNvbGlkRmlsbCwgTGF5ZXJFZmZlY3RQYXR0ZXJuT3ZlcmxheSwgTGF5ZXJFZmZlY3RHcmFkaWVudE92ZXJsYXksIExheWVyRWZmZWN0U2F0aW4sIEVmZmVjdENvbnRvdXIsXG5cdEVmZmVjdE5vaXNlR3JhZGllbnQsIEJlemllclBhdGgsIFBzZCwgVmVjdG9yQ29udGVudCwgTGF5ZXJFZmZlY3RTdHJva2UsIEV4dHJhR3JhZGllbnRJbmZvLCBFZmZlY3RQYXR0ZXJuLFxuXHRFeHRyYVBhdHRlcm5JbmZvLCBSZWFkT3B0aW9ucywgQnJpZ2h0bmVzc0FkanVzdG1lbnQsIEV4cG9zdXJlQWRqdXN0bWVudCwgVmlicmFuY2VBZGp1c3RtZW50LFxuXHRDb2xvckJhbGFuY2VBZGp1c3RtZW50LCBCbGFja0FuZFdoaXRlQWRqdXN0bWVudCwgUGhvdG9GaWx0ZXJBZGp1c3RtZW50LCBDaGFubmVsTWl4ZXJDaGFubmVsLFxuXHRDaGFubmVsTWl4ZXJBZGp1c3RtZW50LCBQb3N0ZXJpemVBZGp1c3RtZW50LCBUaHJlc2hvbGRBZGp1c3RtZW50LCBHcmFkaWVudE1hcEFkanVzdG1lbnQsIENNWUssXG5cdFNlbGVjdGl2ZUNvbG9yQWRqdXN0bWVudCwgQ29sb3JMb29rdXBBZGp1c3RtZW50LCBMZXZlbHNBZGp1c3RtZW50Q2hhbm5lbCwgTGV2ZWxzQWRqdXN0bWVudCxcblx0Q3VydmVzQWRqdXN0bWVudCwgQ3VydmVzQWRqdXN0bWVudENoYW5uZWwsIEh1ZVNhdHVyYXRpb25BZGp1c3RtZW50LCBIdWVTYXR1cmF0aW9uQWRqdXN0bWVudENoYW5uZWwsXG5cdFByZXNldEluZm8sIENvbG9yLCBDb2xvckJhbGFuY2VWYWx1ZXMsIFdyaXRlT3B0aW9ucywgTGlua2VkRmlsZSwgUGxhY2VkTGF5ZXJUeXBlLCBXYXJwLCBFZmZlY3RTb2xpZEdyYWRpZW50LFxuXHRLZXlEZXNjcmlwdG9ySXRlbSwgQm9vbGVhbk9wZXJhdGlvbiwgTGF5ZXJFZmZlY3RzSW5mbywgQW5ub3RhdGlvbiwgTGF5ZXJWZWN0b3JNYXNrLFxufSBmcm9tICcuL3BzZCc7XG5pbXBvcnQge1xuXHRQc2RSZWFkZXIsIHJlYWRTaWduYXR1cmUsIHJlYWRVbmljb2RlU3RyaW5nLCBza2lwQnl0ZXMsIHJlYWRVaW50MzIsIHJlYWRVaW50OCwgcmVhZEZsb2F0NjQsIHJlYWRVaW50MTYsXG5cdHJlYWRCeXRlcywgcmVhZEludDE2LCBjaGVja1NpZ25hdHVyZSwgcmVhZEZsb2F0MzIsIHJlYWRGaXhlZFBvaW50UGF0aDMyLCByZWFkU2VjdGlvbiwgcmVhZENvbG9yLCByZWFkSW50MzIsXG5cdHJlYWRQYXNjYWxTdHJpbmcsIHJlYWRVbmljb2RlU3RyaW5nV2l0aExlbmd0aCwgcmVhZEFzY2lpU3RyaW5nLCByZWFkUGF0dGVybixcbn0gZnJvbSAnLi9wc2RSZWFkZXInO1xuaW1wb3J0IHtcblx0UHNkV3JpdGVyLCB3cml0ZVplcm9zLCB3cml0ZVNpZ25hdHVyZSwgd3JpdGVCeXRlcywgd3JpdGVVaW50MzIsIHdyaXRlVWludDE2LCB3cml0ZUZsb2F0NjQsIHdyaXRlVWludDgsXG5cdHdyaXRlSW50MTYsIHdyaXRlRmxvYXQzMiwgd3JpdGVGaXhlZFBvaW50UGF0aDMyLCB3cml0ZVVuaWNvZGVTdHJpbmcsIHdyaXRlU2VjdGlvbiwgd3JpdGVVbmljb2RlU3RyaW5nV2l0aFBhZGRpbmcsXG5cdHdyaXRlQ29sb3IsIHdyaXRlUGFzY2FsU3RyaW5nLCB3cml0ZUludDMyLFxufSBmcm9tICcuL3BzZFdyaXRlcic7XG5pbXBvcnQge1xuXHRBbm50LCBCRVNsLCBCRVNzLCBCRVRFLCBCbG5NLCBidmxULCBDbHJTLCBEZXNjaXB0b3JHcmFkaWVudCwgRGVzY3JpcHRvckNvbG9yLCBEZXNjcmlwdG9yR3JhZGllbnRDb250ZW50LFxuXHREZXNjcmlwdG9yUGF0dGVybkNvbnRlbnQsIERlc2NyaXB0b3JVbml0c1ZhbHVlLCBEZXNjcmlwdG9yVmVjdG9yQ29udGVudCwgRnJGbCwgRlN0bCwgR3JkVCwgSUdTciwgT3JudCxcblx0cGFyc2VBbmdsZSwgcGFyc2VQZXJjZW50LCBwYXJzZVBlcmNlbnRPckFuZ2xlLCBwYXJzZVVuaXRzLCBwYXJzZVVuaXRzT3JOdW1iZXIsIFF1aWx0V2FycERlc2NyaXB0b3IsIHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvciwgU3Ryb2tlRGVzY3JpcHRvcixcblx0c3Ryb2tlU3R5bGVMaW5lQWxpZ25tZW50LCBzdHJva2VTdHlsZUxpbmVDYXBUeXBlLCBzdHJva2VTdHlsZUxpbmVKb2luVHlwZSwgVGV4dERlc2NyaXB0b3IsIHRleHRHcmlkZGluZyxcblx0dW5pdHNBbmdsZSwgdW5pdHNQZXJjZW50LCB1bml0c1ZhbHVlLCBXYXJwRGVzY3JpcHRvciwgd2FycFN0eWxlLCB3cml0ZVZlcnNpb25BbmREZXNjcmlwdG9yXG59IGZyb20gJy4vZGVzY3JpcHRvcic7XG5pbXBvcnQgeyBzZXJpYWxpemVFbmdpbmVEYXRhLCBwYXJzZUVuZ2luZURhdGEgfSBmcm9tICcuL2VuZ2luZURhdGEnO1xuaW1wb3J0IHsgZW5jb2RlRW5naW5lRGF0YSwgZGVjb2RlRW5naW5lRGF0YSB9IGZyb20gJy4vdGV4dCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXh0ZW5kZWRXcml0ZU9wdGlvbnMgZXh0ZW5kcyBXcml0ZU9wdGlvbnMge1xuXHRsYXllcklkczogbnVtYmVyW107XG59XG5cbnR5cGUgSGFzTWV0aG9kID0gKHRhcmdldDogTGF5ZXJBZGRpdGlvbmFsSW5mbykgPT4gYm9vbGVhbjtcbnR5cGUgUmVhZE1ldGhvZCA9IChyZWFkZXI6IFBzZFJlYWRlciwgdGFyZ2V0OiBMYXllckFkZGl0aW9uYWxJbmZvLCBsZWZ0OiAoKSA9PiBudW1iZXIsIHBzZDogUHNkLCBvcHRpb25zOiBSZWFkT3B0aW9ucykgPT4gdm9pZDtcbnR5cGUgV3JpdGVNZXRob2QgPSAod3JpdGVyOiBQc2RXcml0ZXIsIHRhcmdldDogTGF5ZXJBZGRpdGlvbmFsSW5mbywgcHNkOiBQc2QsIG9wdGlvbnM6IEV4dGVuZGVkV3JpdGVPcHRpb25zKSA9PiB2b2lkO1xuXG5leHBvcnQgaW50ZXJmYWNlIEluZm9IYW5kbGVyIHtcblx0a2V5OiBzdHJpbmc7XG5cdGhhczogSGFzTWV0aG9kO1xuXHRyZWFkOiBSZWFkTWV0aG9kO1xuXHR3cml0ZTogV3JpdGVNZXRob2Q7XG59XG5cbmV4cG9ydCBjb25zdCBpbmZvSGFuZGxlcnM6IEluZm9IYW5kbGVyW10gPSBbXTtcbmV4cG9ydCBjb25zdCBpbmZvSGFuZGxlcnNNYXA6IHsgW2tleTogc3RyaW5nXTogSW5mb0hhbmRsZXIgfSA9IHt9O1xuXG5mdW5jdGlvbiBhZGRIYW5kbGVyKGtleTogc3RyaW5nLCBoYXM6IEhhc01ldGhvZCwgcmVhZDogUmVhZE1ldGhvZCwgd3JpdGU6IFdyaXRlTWV0aG9kKSB7XG5cdGNvbnN0IGhhbmRsZXI6IEluZm9IYW5kbGVyID0geyBrZXksIGhhcywgcmVhZCwgd3JpdGUgfTtcblx0aW5mb0hhbmRsZXJzLnB1c2goaGFuZGxlcik7XG5cdGluZm9IYW5kbGVyc01hcFtoYW5kbGVyLmtleV0gPSBoYW5kbGVyO1xufVxuXG5mdW5jdGlvbiBhZGRIYW5kbGVyQWxpYXMoa2V5OiBzdHJpbmcsIHRhcmdldDogc3RyaW5nKSB7XG5cdGluZm9IYW5kbGVyc01hcFtrZXldID0gaW5mb0hhbmRsZXJzTWFwW3RhcmdldF07XG59XG5cbmZ1bmN0aW9uIGhhc0tleShrZXk6IGtleW9mIExheWVyQWRkaXRpb25hbEluZm8pIHtcblx0cmV0dXJuICh0YXJnZXQ6IExheWVyQWRkaXRpb25hbEluZm8pID0+IHRhcmdldFtrZXldICE9PSB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIHJlYWRMZW5ndGg2NChyZWFkZXI6IFBzZFJlYWRlcikge1xuXHRpZiAocmVhZFVpbnQzMihyZWFkZXIpKSB0aHJvdyBuZXcgRXJyb3IoYFJlc291cmNlIHNpemUgYWJvdmUgNCBHQiBsaW1pdCBhdCAke3JlYWRlci5vZmZzZXQudG9TdHJpbmcoMTYpfWApO1xuXHRyZXR1cm4gcmVhZFVpbnQzMihyZWFkZXIpO1xufVxuXG5mdW5jdGlvbiB3cml0ZUxlbmd0aDY0KHdyaXRlcjogUHNkV3JpdGVyLCBsZW5ndGg6IG51bWJlcikge1xuXHR3cml0ZVVpbnQzMih3cml0ZXIsIDApO1xuXHR3cml0ZVVpbnQzMih3cml0ZXIsIGxlbmd0aCk7XG59XG5cbmFkZEhhbmRsZXIoXG5cdCdUeVNoJyxcblx0aGFzS2V5KCd0ZXh0JyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdEJ5dGVzKSA9PiB7XG5cdFx0aWYgKHJlYWRJbnQxNihyZWFkZXIpICE9PSAxKSB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgVHlTaCB2ZXJzaW9uYCk7XG5cblx0XHRjb25zdCB0cmFuc2Zvcm06IG51bWJlcltdID0gW107XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCA2OyBpKyspIHRyYW5zZm9ybS5wdXNoKHJlYWRGbG9hdDY0KHJlYWRlcikpO1xuXG5cdFx0aWYgKHJlYWRJbnQxNihyZWFkZXIpICE9PSA1MCkgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIFR5U2ggdGV4dCB2ZXJzaW9uYCk7XG5cdFx0Y29uc3QgdGV4dDogVGV4dERlc2NyaXB0b3IgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKTtcblxuXHRcdGlmIChyZWFkSW50MTYocmVhZGVyKSAhPT0gMSkgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIFR5U2ggd2FycCB2ZXJzaW9uYCk7XG5cdFx0Y29uc3Qgd2FycDogV2FycERlc2NyaXB0b3IgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKTtcblxuXHRcdHRhcmdldC50ZXh0ID0ge1xuXHRcdFx0dHJhbnNmb3JtLFxuXHRcdFx0bGVmdDogcmVhZEZsb2F0MzIocmVhZGVyKSxcblx0XHRcdHRvcDogcmVhZEZsb2F0MzIocmVhZGVyKSxcblx0XHRcdHJpZ2h0OiByZWFkRmxvYXQzMihyZWFkZXIpLFxuXHRcdFx0Ym90dG9tOiByZWFkRmxvYXQzMihyZWFkZXIpLFxuXHRcdFx0dGV4dDogdGV4dFsnVHh0ICddLnJlcGxhY2UoL1xcci9nLCAnXFxuJyksXG5cdFx0XHRpbmRleDogdGV4dC5UZXh0SW5kZXggfHwgMCxcblx0XHRcdGdyaWRkaW5nOiB0ZXh0R3JpZGRpbmcuZGVjb2RlKHRleHQudGV4dEdyaWRkaW5nKSxcblx0XHRcdGFudGlBbGlhczogQW5udC5kZWNvZGUodGV4dC5BbnRBKSxcblx0XHRcdG9yaWVudGF0aW9uOiBPcm50LmRlY29kZSh0ZXh0Lk9ybnQpLFxuXHRcdFx0d2FycDoge1xuXHRcdFx0XHRzdHlsZTogd2FycFN0eWxlLmRlY29kZSh3YXJwLndhcnBTdHlsZSksXG5cdFx0XHRcdHZhbHVlOiB3YXJwLndhcnBWYWx1ZSB8fCAwLFxuXHRcdFx0XHRwZXJzcGVjdGl2ZTogd2FycC53YXJwUGVyc3BlY3RpdmUgfHwgMCxcblx0XHRcdFx0cGVyc3BlY3RpdmVPdGhlcjogd2FycC53YXJwUGVyc3BlY3RpdmVPdGhlciB8fCAwLFxuXHRcdFx0XHRyb3RhdGU6IE9ybnQuZGVjb2RlKHdhcnAud2FycFJvdGF0ZSksXG5cdFx0XHR9LFxuXHRcdH07XG5cblx0XHRpZiAodGV4dC5FbmdpbmVEYXRhKSB7XG5cdFx0XHRjb25zdCBlbmdpbmVEYXRhID0gZGVjb2RlRW5naW5lRGF0YShwYXJzZUVuZ2luZURhdGEodGV4dC5FbmdpbmVEYXRhKSk7XG5cblx0XHRcdC8vIGNvbnN0IGJlZm9yZSA9IHBhcnNlRW5naW5lRGF0YSh0ZXh0LkVuZ2luZURhdGEpO1xuXHRcdFx0Ly8gY29uc3QgYWZ0ZXIgPSBlbmNvZGVFbmdpbmVEYXRhKGVuZ2luZURhdGEpO1xuXHRcdFx0Ly8gcmVxdWlyZSgnZnMnKS53cml0ZUZpbGVTeW5jKCdiZWZvcmUudHh0JywgcmVxdWlyZSgndXRpbCcpLmluc3BlY3QoYmVmb3JlLCBmYWxzZSwgOTksIGZhbHNlKSwgJ3V0ZjgnKTtcblx0XHRcdC8vIHJlcXVpcmUoJ2ZzJykud3JpdGVGaWxlU3luYygnYWZ0ZXIudHh0JywgcmVxdWlyZSgndXRpbCcpLmluc3BlY3QoYWZ0ZXIsIGZhbHNlLCA5OSwgZmFsc2UpLCAndXRmOCcpO1xuXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChwYXJzZUVuZ2luZURhdGEodGV4dC5FbmdpbmVEYXRhKSwgZmFsc2UsIDk5LCB0cnVlKSk7XG5cdFx0XHR0YXJnZXQudGV4dCA9IHsgLi4udGFyZ2V0LnRleHQsIC4uLmVuZ2luZURhdGEgfTtcblx0XHRcdC8vIGNvbnNvbGUubG9nKHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KHRhcmdldC50ZXh0LCBmYWxzZSwgOTksIHRydWUpKTtcblx0XHR9XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0Qnl0ZXMoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IHRleHQgPSB0YXJnZXQudGV4dCE7XG5cdFx0Y29uc3Qgd2FycCA9IHRleHQud2FycCB8fCB7fTtcblx0XHRjb25zdCB0cmFuc2Zvcm0gPSB0ZXh0LnRyYW5zZm9ybSB8fCBbMSwgMCwgMCwgMSwgMCwgMF07XG5cblx0XHRjb25zdCB0ZXh0RGVzY3JpcHRvcjogVGV4dERlc2NyaXB0b3IgPSB7XG5cdFx0XHQnVHh0ICc6ICh0ZXh0LnRleHQgfHwgJycpLnJlcGxhY2UoL1xccj9cXG4vZywgJ1xccicpLFxuXHRcdFx0dGV4dEdyaWRkaW5nOiB0ZXh0R3JpZGRpbmcuZW5jb2RlKHRleHQuZ3JpZGRpbmcpLFxuXHRcdFx0T3JudDogT3JudC5lbmNvZGUodGV4dC5vcmllbnRhdGlvbiksXG5cdFx0XHRBbnRBOiBBbm50LmVuY29kZSh0ZXh0LmFudGlBbGlhcyksXG5cdFx0XHRUZXh0SW5kZXg6IHRleHQuaW5kZXggfHwgMCxcblx0XHRcdEVuZ2luZURhdGE6IHNlcmlhbGl6ZUVuZ2luZURhdGEoZW5jb2RlRW5naW5lRGF0YSh0ZXh0KSksXG5cdFx0fTtcblxuXHRcdHdyaXRlSW50MTYod3JpdGVyLCAxKTsgLy8gdmVyc2lvblxuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCA2OyBpKyspIHtcblx0XHRcdHdyaXRlRmxvYXQ2NCh3cml0ZXIsIHRyYW5zZm9ybVtpXSk7XG5cdFx0fVxuXG5cdFx0d3JpdGVJbnQxNih3cml0ZXIsIDUwKTsgLy8gdGV4dCB2ZXJzaW9uXG5cdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnVHhMcicsIHRleHREZXNjcmlwdG9yKTtcblxuXHRcdHdyaXRlSW50MTYod3JpdGVyLCAxKTsgLy8gd2FycCB2ZXJzaW9uXG5cdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnd2FycCcsIGVuY29kZVdhcnAod2FycCkpO1xuXG5cdFx0d3JpdGVGbG9hdDMyKHdyaXRlciwgdGV4dC5sZWZ0ISk7XG5cdFx0d3JpdGVGbG9hdDMyKHdyaXRlciwgdGV4dC50b3AhKTtcblx0XHR3cml0ZUZsb2F0MzIod3JpdGVyLCB0ZXh0LnJpZ2h0ISk7XG5cdFx0d3JpdGVGbG9hdDMyKHdyaXRlciwgdGV4dC5ib3R0b20hKTtcblxuXHRcdC8vIHdyaXRlWmVyb3Mod3JpdGVyLCAyKTtcblx0fSxcbik7XG5cbi8vIHZlY3RvciBmaWxsc1xuXG5hZGRIYW5kbGVyKFxuXHQnU29DbycsXG5cdHRhcmdldCA9PiB0YXJnZXQudmVjdG9yRmlsbCAhPT0gdW5kZWZpbmVkICYmIHRhcmdldC52ZWN0b3JTdHJva2UgPT09IHVuZGVmaW5lZCAmJlxuXHRcdHRhcmdldC52ZWN0b3JGaWxsLnR5cGUgPT09ICdjb2xvcicsXG5cdChyZWFkZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGRlc2NyaXB0b3IgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKTtcblx0XHR0YXJnZXQudmVjdG9yRmlsbCA9IHBhcnNlVmVjdG9yQ29udGVudChkZXNjcmlwdG9yKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgeyBkZXNjcmlwdG9yIH0gPSBzZXJpYWxpemVWZWN0b3JDb250ZW50KHRhcmdldC52ZWN0b3JGaWxsISk7XG5cdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnbnVsbCcsIGRlc2NyaXB0b3IpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J0dkRmwnLFxuXHR0YXJnZXQgPT4gdGFyZ2V0LnZlY3RvckZpbGwgIT09IHVuZGVmaW5lZCAmJiB0YXJnZXQudmVjdG9yU3Ryb2tlID09PSB1bmRlZmluZWQgJiZcblx0XHQodGFyZ2V0LnZlY3RvckZpbGwudHlwZSA9PT0gJ3NvbGlkJyB8fCB0YXJnZXQudmVjdG9yRmlsbC50eXBlID09PSAnbm9pc2UnKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0Y29uc3QgZGVzY3JpcHRvciA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpO1xuXHRcdHRhcmdldC52ZWN0b3JGaWxsID0gcGFyc2VWZWN0b3JDb250ZW50KGRlc2NyaXB0b3IpO1xuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IHsgZGVzY3JpcHRvciB9ID0gc2VyaWFsaXplVmVjdG9yQ29udGVudCh0YXJnZXQudmVjdG9yRmlsbCEpO1xuXHRcdHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgJ251bGwnLCBkZXNjcmlwdG9yKTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdCdQdEZsJyxcblx0dGFyZ2V0ID0+IHRhcmdldC52ZWN0b3JGaWxsICE9PSB1bmRlZmluZWQgJiYgdGFyZ2V0LnZlY3RvclN0cm9rZSA9PT0gdW5kZWZpbmVkICYmXG5cdFx0dGFyZ2V0LnZlY3RvckZpbGwudHlwZSA9PT0gJ3BhdHRlcm4nLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBkZXNjcmlwdG9yID0gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcik7XG5cdFx0dGFyZ2V0LnZlY3RvckZpbGwgPSBwYXJzZVZlY3RvckNvbnRlbnQoZGVzY3JpcHRvcik7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IHsgZGVzY3JpcHRvciB9ID0gc2VyaWFsaXplVmVjdG9yQ29udGVudCh0YXJnZXQudmVjdG9yRmlsbCEpO1xuXHRcdHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgJ251bGwnLCBkZXNjcmlwdG9yKTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdCd2c2NnJyxcblx0dGFyZ2V0ID0+IHRhcmdldC52ZWN0b3JGaWxsICE9PSB1bmRlZmluZWQgJiYgdGFyZ2V0LnZlY3RvclN0cm9rZSAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRyZWFkU2lnbmF0dXJlKHJlYWRlcik7IC8vIGtleVxuXHRcdGNvbnN0IGRlc2MgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKTtcblx0XHR0YXJnZXQudmVjdG9yRmlsbCA9IHBhcnNlVmVjdG9yQ29udGVudChkZXNjKTtcblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCB7IGRlc2NyaXB0b3IsIGtleSB9ID0gc2VyaWFsaXplVmVjdG9yQ29udGVudCh0YXJnZXQudmVjdG9yRmlsbCEpO1xuXHRcdHdyaXRlU2lnbmF0dXJlKHdyaXRlciwga2V5KTtcblx0XHR3cml0ZVZlcnNpb25BbmREZXNjcmlwdG9yKHdyaXRlciwgJycsICdudWxsJywgZGVzY3JpcHRvcik7XG5cdH0sXG4pO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVhZEJlemllcktub3QocmVhZGVyOiBQc2RSZWFkZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKSB7XG5cdGNvbnN0IHkwID0gcmVhZEZpeGVkUG9pbnRQYXRoMzIocmVhZGVyKSAqIGhlaWdodDtcblx0Y29uc3QgeDAgPSByZWFkRml4ZWRQb2ludFBhdGgzMihyZWFkZXIpICogd2lkdGg7XG5cdGNvbnN0IHkxID0gcmVhZEZpeGVkUG9pbnRQYXRoMzIocmVhZGVyKSAqIGhlaWdodDtcblx0Y29uc3QgeDEgPSByZWFkRml4ZWRQb2ludFBhdGgzMihyZWFkZXIpICogd2lkdGg7XG5cdGNvbnN0IHkyID0gcmVhZEZpeGVkUG9pbnRQYXRoMzIocmVhZGVyKSAqIGhlaWdodDtcblx0Y29uc3QgeDIgPSByZWFkRml4ZWRQb2ludFBhdGgzMihyZWFkZXIpICogd2lkdGg7XG5cdHJldHVybiBbeDAsIHkwLCB4MSwgeTEsIHgyLCB5Ml07XG59XG5cbmZ1bmN0aW9uIHdyaXRlQmV6aWVyS25vdCh3cml0ZXI6IFBzZFdyaXRlciwgcG9pbnRzOiBudW1iZXJbXSwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpIHtcblx0d3JpdGVGaXhlZFBvaW50UGF0aDMyKHdyaXRlciwgcG9pbnRzWzFdIC8gaGVpZ2h0KTsgLy8geTBcblx0d3JpdGVGaXhlZFBvaW50UGF0aDMyKHdyaXRlciwgcG9pbnRzWzBdIC8gd2lkdGgpOyAvLyB4MFxuXHR3cml0ZUZpeGVkUG9pbnRQYXRoMzIod3JpdGVyLCBwb2ludHNbM10gLyBoZWlnaHQpOyAvLyB5MVxuXHR3cml0ZUZpeGVkUG9pbnRQYXRoMzIod3JpdGVyLCBwb2ludHNbMl0gLyB3aWR0aCk7IC8vIHgxXG5cdHdyaXRlRml4ZWRQb2ludFBhdGgzMih3cml0ZXIsIHBvaW50c1s1XSAvIGhlaWdodCk7IC8vIHkyXG5cdHdyaXRlRml4ZWRQb2ludFBhdGgzMih3cml0ZXIsIHBvaW50c1s0XSAvIHdpZHRoKTsgLy8geDJcbn1cblxuZXhwb3J0IGNvbnN0IGJvb2xlYW5PcGVyYXRpb25zOiBCb29sZWFuT3BlcmF0aW9uW10gPSBbJ2V4Y2x1ZGUnLCAnY29tYmluZScsICdzdWJ0cmFjdCcsICdpbnRlcnNlY3QnXTtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRWZWN0b3JNYXNrKHJlYWRlcjogUHNkUmVhZGVyLCB2ZWN0b3JNYXNrOiBMYXllclZlY3Rvck1hc2ssIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBzaXplOiBudW1iZXIpIHtcblx0Y29uc3QgZW5kID0gcmVhZGVyLm9mZnNldCArIHNpemU7XG5cdGNvbnN0IHBhdGhzID0gdmVjdG9yTWFzay5wYXRocztcblx0bGV0IHBhdGg6IEJlemllclBhdGggfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cblx0d2hpbGUgKChlbmQgLSByZWFkZXIub2Zmc2V0KSA+PSAyNikge1xuXHRcdGNvbnN0IHNlbGVjdG9yID0gcmVhZFVpbnQxNihyZWFkZXIpO1xuXG5cdFx0c3dpdGNoIChzZWxlY3Rvcikge1xuXHRcdFx0Y2FzZSAwOiAvLyBDbG9zZWQgc3VicGF0aCBsZW5ndGggcmVjb3JkXG5cdFx0XHRjYXNlIDM6IHsgLy8gT3BlbiBzdWJwYXRoIGxlbmd0aCByZWNvcmRcblx0XHRcdFx0cmVhZFVpbnQxNihyZWFkZXIpOyAvLyBjb3VudFxuXHRcdFx0XHRjb25zdCBib29sT3AgPSByZWFkSW50MTYocmVhZGVyKTtcblx0XHRcdFx0cmVhZFVpbnQxNihyZWFkZXIpOyAvLyBhbHdheXMgMSA/XG5cdFx0XHRcdHNraXBCeXRlcyhyZWFkZXIsIDE4KTtcblx0XHRcdFx0Ly8gVE9ETzogJ2NvbWJpbmUnIGhlcmUgbWlnaHQgYmUgd3Jvbmdcblx0XHRcdFx0cGF0aCA9IHsgb3Blbjogc2VsZWN0b3IgPT09IDMsIG9wZXJhdGlvbjogYm9vbE9wID09PSAtMSA/ICdjb21iaW5lJyA6IGJvb2xlYW5PcGVyYXRpb25zW2Jvb2xPcF0sIGtub3RzOiBbXSB9O1xuXHRcdFx0XHRwYXRocy5wdXNoKHBhdGgpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdGNhc2UgMTogLy8gQ2xvc2VkIHN1YnBhdGggQmV6aWVyIGtub3QsIGxpbmtlZFxuXHRcdFx0Y2FzZSAyOiAvLyBDbG9zZWQgc3VicGF0aCBCZXppZXIga25vdCwgdW5saW5rZWRcblx0XHRcdGNhc2UgNDogLy8gT3BlbiBzdWJwYXRoIEJlemllciBrbm90LCBsaW5rZWRcblx0XHRcdGNhc2UgNTogLy8gT3BlbiBzdWJwYXRoIEJlemllciBrbm90LCB1bmxpbmtlZFxuXHRcdFx0XHRwYXRoIS5rbm90cy5wdXNoKHsgbGlua2VkOiAoc2VsZWN0b3IgPT09IDEgfHwgc2VsZWN0b3IgPT09IDQpLCBwb2ludHM6IHJlYWRCZXppZXJLbm90KHJlYWRlciwgd2lkdGgsIGhlaWdodCkgfSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSA2OiAvLyBQYXRoIGZpbGwgcnVsZSByZWNvcmRcblx0XHRcdFx0c2tpcEJ5dGVzKHJlYWRlciwgMjQpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgNzogeyAvLyBDbGlwYm9hcmQgcmVjb3JkXG5cdFx0XHRcdC8vIFRPRE86IGNoZWNrIGlmIHRoZXNlIG5lZWQgdG8gYmUgbXVsdGlwbGllZCBieSBkb2N1bWVudCBzaXplXG5cdFx0XHRcdGNvbnN0IHRvcCA9IHJlYWRGaXhlZFBvaW50UGF0aDMyKHJlYWRlcik7XG5cdFx0XHRcdGNvbnN0IGxlZnQgPSByZWFkRml4ZWRQb2ludFBhdGgzMihyZWFkZXIpO1xuXHRcdFx0XHRjb25zdCBib3R0b20gPSByZWFkRml4ZWRQb2ludFBhdGgzMihyZWFkZXIpO1xuXHRcdFx0XHRjb25zdCByaWdodCA9IHJlYWRGaXhlZFBvaW50UGF0aDMyKHJlYWRlcik7XG5cdFx0XHRcdGNvbnN0IHJlc29sdXRpb24gPSByZWFkRml4ZWRQb2ludFBhdGgzMihyZWFkZXIpO1xuXHRcdFx0XHRza2lwQnl0ZXMocmVhZGVyLCA0KTtcblx0XHRcdFx0dmVjdG9yTWFzay5jbGlwYm9hcmQgPSB7IHRvcCwgbGVmdCwgYm90dG9tLCByaWdodCwgcmVzb2x1dGlvbiB9O1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdGNhc2UgODogLy8gSW5pdGlhbCBmaWxsIHJ1bGUgcmVjb3JkXG5cdFx0XHRcdHZlY3Rvck1hc2suZmlsbFN0YXJ0c1dpdGhBbGxQaXhlbHMgPSAhIXJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRcdFx0c2tpcEJ5dGVzKHJlYWRlciwgMjIpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcignSW52YWxpZCB2bXNrIHNlY3Rpb24nKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gcGF0aHM7XG59XG5cbmFkZEhhbmRsZXIoXG5cdCd2bXNrJyxcblx0aGFzS2V5KCd2ZWN0b3JNYXNrJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCwgeyB3aWR0aCwgaGVpZ2h0IH0pID0+IHtcblx0XHRpZiAocmVhZFVpbnQzMihyZWFkZXIpICE9PSAzKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgdm1zayB2ZXJzaW9uJyk7XG5cblx0XHR0YXJnZXQudmVjdG9yTWFzayA9IHsgcGF0aHM6IFtdIH07XG5cdFx0Y29uc3QgdmVjdG9yTWFzayA9IHRhcmdldC52ZWN0b3JNYXNrO1xuXG5cdFx0Y29uc3QgZmxhZ3MgPSByZWFkVWludDMyKHJlYWRlcik7XG5cdFx0dmVjdG9yTWFzay5pbnZlcnQgPSAoZmxhZ3MgJiAxKSAhPT0gMDtcblx0XHR2ZWN0b3JNYXNrLm5vdExpbmsgPSAoZmxhZ3MgJiAyKSAhPT0gMDtcblx0XHR2ZWN0b3JNYXNrLmRpc2FibGUgPSAoZmxhZ3MgJiA0KSAhPT0gMDtcblxuXHRcdHJlYWRWZWN0b3JNYXNrKHJlYWRlciwgdmVjdG9yTWFzaywgd2lkdGgsIGhlaWdodCwgbGVmdCgpKTtcblxuXHRcdC8vIGRyYXdCZXppZXJQYXRocyh2ZWN0b3JNYXNrLnBhdGhzLCB3aWR0aCwgaGVpZ2h0LCAnb3V0LnBuZycpO1xuXG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0LCB7IHdpZHRoLCBoZWlnaHQgfSkgPT4ge1xuXHRcdGNvbnN0IHZlY3Rvck1hc2sgPSB0YXJnZXQudmVjdG9yTWFzayE7XG5cdFx0Y29uc3QgZmxhZ3MgPVxuXHRcdFx0KHZlY3Rvck1hc2suaW52ZXJ0ID8gMSA6IDApIHxcblx0XHRcdCh2ZWN0b3JNYXNrLm5vdExpbmsgPyAyIDogMCkgfFxuXHRcdFx0KHZlY3Rvck1hc2suZGlzYWJsZSA/IDQgOiAwKTtcblxuXHRcdHdyaXRlVWludDMyKHdyaXRlciwgMyk7IC8vIHZlcnNpb25cblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIGZsYWdzKTtcblxuXHRcdC8vIGluaXRpYWwgZW50cnlcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIDYpO1xuXHRcdHdyaXRlWmVyb3Mod3JpdGVyLCAyNCk7XG5cblx0XHRjb25zdCBjbGlwYm9hcmQgPSB2ZWN0b3JNYXNrLmNsaXBib2FyZDtcblx0XHRpZiAoY2xpcGJvYXJkKSB7XG5cdFx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIDcpO1xuXHRcdFx0d3JpdGVGaXhlZFBvaW50UGF0aDMyKHdyaXRlciwgY2xpcGJvYXJkLnRvcCk7XG5cdFx0XHR3cml0ZUZpeGVkUG9pbnRQYXRoMzIod3JpdGVyLCBjbGlwYm9hcmQubGVmdCk7XG5cdFx0XHR3cml0ZUZpeGVkUG9pbnRQYXRoMzIod3JpdGVyLCBjbGlwYm9hcmQuYm90dG9tKTtcblx0XHRcdHdyaXRlRml4ZWRQb2ludFBhdGgzMih3cml0ZXIsIGNsaXBib2FyZC5yaWdodCk7XG5cdFx0XHR3cml0ZUZpeGVkUG9pbnRQYXRoMzIod3JpdGVyLCBjbGlwYm9hcmQucmVzb2x1dGlvbik7XG5cdFx0XHR3cml0ZVplcm9zKHdyaXRlciwgNCk7XG5cdFx0fVxuXG5cdFx0aWYgKHZlY3Rvck1hc2suZmlsbFN0YXJ0c1dpdGhBbGxQaXhlbHMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0d3JpdGVVaW50MTYod3JpdGVyLCA4KTtcblx0XHRcdHdyaXRlVWludDE2KHdyaXRlciwgdmVjdG9yTWFzay5maWxsU3RhcnRzV2l0aEFsbFBpeGVscyA/IDEgOiAwKTtcblx0XHRcdHdyaXRlWmVyb3Mod3JpdGVyLCAyMik7XG5cdFx0fVxuXG5cdFx0Zm9yIChjb25zdCBwYXRoIG9mIHZlY3Rvck1hc2sucGF0aHMpIHtcblx0XHRcdHdyaXRlVWludDE2KHdyaXRlciwgcGF0aC5vcGVuID8gMyA6IDApO1xuXHRcdFx0d3JpdGVVaW50MTYod3JpdGVyLCBwYXRoLmtub3RzLmxlbmd0aCk7XG5cdFx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIE1hdGguYWJzKGJvb2xlYW5PcGVyYXRpb25zLmluZGV4T2YocGF0aC5vcGVyYXRpb24pKSk7IC8vIGRlZmF1bHQgdG8gMSBpZiBub3QgZm91bmRcblx0XHRcdHdyaXRlVWludDE2KHdyaXRlciwgMSk7XG5cdFx0XHR3cml0ZVplcm9zKHdyaXRlciwgMTgpOyAvLyBUT0RPOiB0aGVzZSBhcmUgc29tZXRpbWVzIG5vbi16ZXJvXG5cblx0XHRcdGNvbnN0IGxpbmtlZEtub3QgPSBwYXRoLm9wZW4gPyA0IDogMTtcblx0XHRcdGNvbnN0IHVubGlua2VkS25vdCA9IHBhdGgub3BlbiA/IDUgOiAyO1xuXG5cdFx0XHRmb3IgKGNvbnN0IHsgbGlua2VkLCBwb2ludHMgfSBvZiBwYXRoLmtub3RzKSB7XG5cdFx0XHRcdHdyaXRlVWludDE2KHdyaXRlciwgbGlua2VkID8gbGlua2VkS25vdCA6IHVubGlua2VkS25vdCk7XG5cdFx0XHRcdHdyaXRlQmV6aWVyS25vdCh3cml0ZXIsIHBvaW50cywgd2lkdGgsIGhlaWdodCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuKTtcblxuLy8gVE9ETzogbmVlZCB0byB3cml0ZSB2bXNrIGlmIGhhcyBvdXRsaW5lID9cbmFkZEhhbmRsZXJBbGlhcygndnNtcycsICd2bXNrJyk7XG4vLyBhZGRIYW5kbGVyQWxpYXMoJ3Ztc2snLCAndnNtcycpO1xuXG5pbnRlcmZhY2UgVm9na0Rlc2NyaXB0b3Ige1xuXHRrZXlEZXNjcmlwdG9yTGlzdDoge1xuXHRcdGtleVNoYXBlSW52YWxpZGF0ZWQ/OiBib29sZWFuO1xuXHRcdGtleU9yaWdpblR5cGU/OiBudW1iZXI7XG5cdFx0a2V5T3JpZ2luUmVzb2x1dGlvbj86IG51bWJlcjtcblx0XHRrZXlPcmlnaW5SUmVjdFJhZGlpPzoge1xuXHRcdFx0dW5pdFZhbHVlUXVhZFZlcnNpb246IG51bWJlcjtcblx0XHRcdHRvcFJpZ2h0OiBEZXNjcmlwdG9yVW5pdHNWYWx1ZTtcblx0XHRcdHRvcExlZnQ6IERlc2NyaXB0b3JVbml0c1ZhbHVlO1xuXHRcdFx0Ym90dG9tTGVmdDogRGVzY3JpcHRvclVuaXRzVmFsdWU7XG5cdFx0XHRib3R0b21SaWdodDogRGVzY3JpcHRvclVuaXRzVmFsdWU7XG5cdFx0fTtcblx0XHRrZXlPcmlnaW5TaGFwZUJCb3g/OiB7XG5cdFx0XHR1bml0VmFsdWVRdWFkVmVyc2lvbjogbnVtYmVyO1xuXHRcdFx0J1RvcCAnOiBEZXNjcmlwdG9yVW5pdHNWYWx1ZTtcblx0XHRcdExlZnQ6IERlc2NyaXB0b3JVbml0c1ZhbHVlO1xuXHRcdFx0QnRvbTogRGVzY3JpcHRvclVuaXRzVmFsdWU7XG5cdFx0XHRSZ2h0OiBEZXNjcmlwdG9yVW5pdHNWYWx1ZTtcblx0XHR9O1xuXHRcdGtleU9yaWdpbkJveENvcm5lcnM/OiB7XG5cdFx0XHRyZWN0YW5nbGVDb3JuZXJBOiB7IEhyem46IG51bWJlcjsgVnJ0YzogbnVtYmVyOyB9O1xuXHRcdFx0cmVjdGFuZ2xlQ29ybmVyQjogeyBIcnpuOiBudW1iZXI7IFZydGM6IG51bWJlcjsgfTtcblx0XHRcdHJlY3RhbmdsZUNvcm5lckM6IHsgSHJ6bjogbnVtYmVyOyBWcnRjOiBudW1iZXI7IH07XG5cdFx0XHRyZWN0YW5nbGVDb3JuZXJEOiB7IEhyem46IG51bWJlcjsgVnJ0YzogbnVtYmVyOyB9O1xuXHRcdH07XG5cdFx0VHJuZj86IHsgeHg6IG51bWJlcjsgeHk6IG51bWJlcjsgeXg6IG51bWJlcjsgeXk6IG51bWJlcjsgdHg6IG51bWJlcjsgdHk6IG51bWJlcjsgfSxcblx0XHRrZXlPcmlnaW5JbmRleDogbnVtYmVyO1xuXHR9W107XG59XG5cbmFkZEhhbmRsZXIoXG5cdCd2b2drJyxcblx0aGFzS2V5KCd2ZWN0b3JPcmlnaW5hdGlvbicpLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRpZiAocmVhZEludDMyKHJlYWRlcikgIT09IDEpIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCB2b2drIHZlcnNpb25gKTtcblx0XHRjb25zdCBkZXNjID0gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcikgYXMgVm9na0Rlc2NyaXB0b3I7XG5cdFx0Ly8gY29uc29sZS5sb2cocmVxdWlyZSgndXRpbCcpLmluc3BlY3QoZGVzYywgZmFsc2UsIDk5LCB0cnVlKSk7XG5cblx0XHR0YXJnZXQudmVjdG9yT3JpZ2luYXRpb24gPSB7IGtleURlc2NyaXB0b3JMaXN0OiBbXSB9O1xuXG5cdFx0Zm9yIChjb25zdCBpIG9mIGRlc2Mua2V5RGVzY3JpcHRvckxpc3QpIHtcblx0XHRcdGNvbnN0IGl0ZW06IEtleURlc2NyaXB0b3JJdGVtID0ge307XG5cblx0XHRcdGlmIChpLmtleVNoYXBlSW52YWxpZGF0ZWQgIT0gbnVsbCkgaXRlbS5rZXlTaGFwZUludmFsaWRhdGVkID0gaS5rZXlTaGFwZUludmFsaWRhdGVkO1xuXHRcdFx0aWYgKGkua2V5T3JpZ2luVHlwZSAhPSBudWxsKSBpdGVtLmtleU9yaWdpblR5cGUgPSBpLmtleU9yaWdpblR5cGU7XG5cdFx0XHRpZiAoaS5rZXlPcmlnaW5SZXNvbHV0aW9uICE9IG51bGwpIGl0ZW0ua2V5T3JpZ2luUmVzb2x1dGlvbiA9IGkua2V5T3JpZ2luUmVzb2x1dGlvbjtcblx0XHRcdGlmIChpLmtleU9yaWdpblNoYXBlQkJveCkge1xuXHRcdFx0XHRpdGVtLmtleU9yaWdpblNoYXBlQm91bmRpbmdCb3ggPSB7XG5cdFx0XHRcdFx0dG9wOiBwYXJzZVVuaXRzKGkua2V5T3JpZ2luU2hhcGVCQm94WydUb3AgJ10pLFxuXHRcdFx0XHRcdGxlZnQ6IHBhcnNlVW5pdHMoaS5rZXlPcmlnaW5TaGFwZUJCb3guTGVmdCksXG5cdFx0XHRcdFx0Ym90dG9tOiBwYXJzZVVuaXRzKGkua2V5T3JpZ2luU2hhcGVCQm94LkJ0b20pLFxuXHRcdFx0XHRcdHJpZ2h0OiBwYXJzZVVuaXRzKGkua2V5T3JpZ2luU2hhcGVCQm94LlJnaHQpLFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgcmVjdFJhZGlpID0gaS5rZXlPcmlnaW5SUmVjdFJhZGlpO1xuXHRcdFx0aWYgKHJlY3RSYWRpaSkge1xuXHRcdFx0XHRpdGVtLmtleU9yaWdpblJSZWN0UmFkaWkgPSB7XG5cdFx0XHRcdFx0dG9wUmlnaHQ6IHBhcnNlVW5pdHMocmVjdFJhZGlpLnRvcFJpZ2h0KSxcblx0XHRcdFx0XHR0b3BMZWZ0OiBwYXJzZVVuaXRzKHJlY3RSYWRpaS50b3BMZWZ0KSxcblx0XHRcdFx0XHRib3R0b21MZWZ0OiBwYXJzZVVuaXRzKHJlY3RSYWRpaS5ib3R0b21MZWZ0KSxcblx0XHRcdFx0XHRib3R0b21SaWdodDogcGFyc2VVbml0cyhyZWN0UmFkaWkuYm90dG9tUmlnaHQpLFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgY29ybmVycyA9IGkua2V5T3JpZ2luQm94Q29ybmVycztcblx0XHRcdGlmIChjb3JuZXJzKSB7XG5cdFx0XHRcdGl0ZW0ua2V5T3JpZ2luQm94Q29ybmVycyA9IFtcblx0XHRcdFx0XHR7IHg6IGNvcm5lcnMucmVjdGFuZ2xlQ29ybmVyQS5IcnpuLCB5OiBjb3JuZXJzLnJlY3RhbmdsZUNvcm5lckEuVnJ0YyB9LFxuXHRcdFx0XHRcdHsgeDogY29ybmVycy5yZWN0YW5nbGVDb3JuZXJCLkhyem4sIHk6IGNvcm5lcnMucmVjdGFuZ2xlQ29ybmVyQi5WcnRjIH0sXG5cdFx0XHRcdFx0eyB4OiBjb3JuZXJzLnJlY3RhbmdsZUNvcm5lckMuSHJ6biwgeTogY29ybmVycy5yZWN0YW5nbGVDb3JuZXJDLlZydGMgfSxcblx0XHRcdFx0XHR7IHg6IGNvcm5lcnMucmVjdGFuZ2xlQ29ybmVyRC5IcnpuLCB5OiBjb3JuZXJzLnJlY3RhbmdsZUNvcm5lckQuVnJ0YyB9LFxuXHRcdFx0XHRdO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgdHJuZiA9IGkuVHJuZjtcblx0XHRcdGlmICh0cm5mKSB7XG5cdFx0XHRcdGl0ZW0udHJhbnNmb3JtID0gW3RybmYueHgsIHRybmYueHksIHRybmYueHksIHRybmYueXksIHRybmYudHgsIHRybmYudHldO1xuXHRcdFx0fVxuXG5cdFx0XHR0YXJnZXQudmVjdG9yT3JpZ2luYXRpb24ua2V5RGVzY3JpcHRvckxpc3QucHVzaChpdGVtKTtcblx0XHR9XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHR0YXJnZXQ7XG5cdFx0Y29uc3Qgb3JpZyA9IHRhcmdldC52ZWN0b3JPcmlnaW5hdGlvbiE7XG5cdFx0Y29uc3QgZGVzYzogVm9na0Rlc2NyaXB0b3IgPSB7IGtleURlc2NyaXB0b3JMaXN0OiBbXSB9O1xuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBvcmlnLmtleURlc2NyaXB0b3JMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRjb25zdCBpdGVtID0gb3JpZy5rZXlEZXNjcmlwdG9yTGlzdFtpXTtcblxuXHRcdFx0aWYgKGl0ZW0ua2V5U2hhcGVJbnZhbGlkYXRlZCkge1xuXHRcdFx0XHRkZXNjLmtleURlc2NyaXB0b3JMaXN0LnB1c2goeyBrZXlTaGFwZUludmFsaWRhdGVkOiB0cnVlLCBrZXlPcmlnaW5JbmRleDogaSB9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGRlc2Mua2V5RGVzY3JpcHRvckxpc3QucHVzaCh7fSBhcyBhbnkpOyAvLyB3ZSdyZSBhZGRpbmcga2V5T3JpZ2luSW5kZXggYXQgdGhlIGVuZFxuXG5cdFx0XHRcdGNvbnN0IG91dCA9IGRlc2Mua2V5RGVzY3JpcHRvckxpc3RbZGVzYy5rZXlEZXNjcmlwdG9yTGlzdC5sZW5ndGggLSAxXTtcblxuXHRcdFx0XHRpZiAoaXRlbS5rZXlPcmlnaW5UeXBlICE9IG51bGwpIG91dC5rZXlPcmlnaW5UeXBlID0gaXRlbS5rZXlPcmlnaW5UeXBlO1xuXHRcdFx0XHRpZiAoaXRlbS5rZXlPcmlnaW5SZXNvbHV0aW9uICE9IG51bGwpIG91dC5rZXlPcmlnaW5SZXNvbHV0aW9uID0gaXRlbS5rZXlPcmlnaW5SZXNvbHV0aW9uO1xuXG5cdFx0XHRcdGNvbnN0IHJhZGlpID0gaXRlbS5rZXlPcmlnaW5SUmVjdFJhZGlpO1xuXHRcdFx0XHRpZiAocmFkaWkpIHtcblx0XHRcdFx0XHRvdXQua2V5T3JpZ2luUlJlY3RSYWRpaSA9IHtcblx0XHRcdFx0XHRcdHVuaXRWYWx1ZVF1YWRWZXJzaW9uOiAxLFxuXHRcdFx0XHRcdFx0dG9wUmlnaHQ6IHVuaXRzVmFsdWUocmFkaWkudG9wUmlnaHQsICd0b3BSaWdodCcpLFxuXHRcdFx0XHRcdFx0dG9wTGVmdDogdW5pdHNWYWx1ZShyYWRpaS50b3BMZWZ0LCAndG9wTGVmdCcpLFxuXHRcdFx0XHRcdFx0Ym90dG9tTGVmdDogdW5pdHNWYWx1ZShyYWRpaS5ib3R0b21MZWZ0LCAnYm90dG9tTGVmdCcpLFxuXHRcdFx0XHRcdFx0Ym90dG9tUmlnaHQ6IHVuaXRzVmFsdWUocmFkaWkuYm90dG9tUmlnaHQsICdib3R0b21SaWdodCcpLFxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBib3ggPSBpdGVtLmtleU9yaWdpblNoYXBlQm91bmRpbmdCb3g7XG5cdFx0XHRcdGlmIChib3gpIHtcblx0XHRcdFx0XHRvdXQua2V5T3JpZ2luU2hhcGVCQm94ID0ge1xuXHRcdFx0XHRcdFx0dW5pdFZhbHVlUXVhZFZlcnNpb246IDEsXG5cdFx0XHRcdFx0XHQnVG9wICc6IHVuaXRzVmFsdWUoYm94LnRvcCwgJ3RvcCcpLFxuXHRcdFx0XHRcdFx0TGVmdDogdW5pdHNWYWx1ZShib3gubGVmdCwgJ2xlZnQnKSxcblx0XHRcdFx0XHRcdEJ0b206IHVuaXRzVmFsdWUoYm94LmJvdHRvbSwgJ2JvdHRvbScpLFxuXHRcdFx0XHRcdFx0UmdodDogdW5pdHNWYWx1ZShib3gucmlnaHQsICdyaWdodCcpLFxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBjb3JuZXJzID0gaXRlbS5rZXlPcmlnaW5Cb3hDb3JuZXJzO1xuXHRcdFx0XHRpZiAoY29ybmVycyAmJiBjb3JuZXJzLmxlbmd0aCA9PT0gNCkge1xuXHRcdFx0XHRcdG91dC5rZXlPcmlnaW5Cb3hDb3JuZXJzID0ge1xuXHRcdFx0XHRcdFx0cmVjdGFuZ2xlQ29ybmVyQTogeyBIcnpuOiBjb3JuZXJzWzBdLngsIFZydGM6IGNvcm5lcnNbMF0ueSB9LFxuXHRcdFx0XHRcdFx0cmVjdGFuZ2xlQ29ybmVyQjogeyBIcnpuOiBjb3JuZXJzWzFdLngsIFZydGM6IGNvcm5lcnNbMV0ueSB9LFxuXHRcdFx0XHRcdFx0cmVjdGFuZ2xlQ29ybmVyQzogeyBIcnpuOiBjb3JuZXJzWzJdLngsIFZydGM6IGNvcm5lcnNbMl0ueSB9LFxuXHRcdFx0XHRcdFx0cmVjdGFuZ2xlQ29ybmVyRDogeyBIcnpuOiBjb3JuZXJzWzNdLngsIFZydGM6IGNvcm5lcnNbM10ueSB9LFxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCB0cmFuc2Zvcm0gPSBpdGVtLnRyYW5zZm9ybTtcblx0XHRcdFx0aWYgKHRyYW5zZm9ybSAmJiB0cmFuc2Zvcm0ubGVuZ3RoID09PSA2KSB7XG5cdFx0XHRcdFx0b3V0LlRybmYgPSB7XG5cdFx0XHRcdFx0XHR4eDogdHJhbnNmb3JtWzBdLFxuXHRcdFx0XHRcdFx0eHk6IHRyYW5zZm9ybVsxXSxcblx0XHRcdFx0XHRcdHl4OiB0cmFuc2Zvcm1bMl0sXG5cdFx0XHRcdFx0XHR5eTogdHJhbnNmb3JtWzNdLFxuXHRcdFx0XHRcdFx0dHg6IHRyYW5zZm9ybVs0XSxcblx0XHRcdFx0XHRcdHR5OiB0cmFuc2Zvcm1bNV0sXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdG91dC5rZXlPcmlnaW5JbmRleCA9IGk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0d3JpdGVJbnQzMih3cml0ZXIsIDEpOyAvLyB2ZXJzaW9uXG5cdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnbnVsbCcsIGRlc2MpO1xuXHR9XG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQnbG1meCcsXG5cdHRhcmdldCA9PiB0YXJnZXQuZWZmZWN0cyAhPT0gdW5kZWZpbmVkICYmIGhhc011bHRpRWZmZWN0cyh0YXJnZXQuZWZmZWN0cyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCwgXywgb3B0aW9ucykgPT4ge1xuXHRcdGNvbnN0IHZlcnNpb24gPSByZWFkVWludDMyKHJlYWRlcik7XG5cdFx0aWYgKHZlcnNpb24gIT09IDApIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBsbWZ4IHZlcnNpb24nKTtcblxuXHRcdGNvbnN0IGRlc2M6IExtZnhEZXNjcmlwdG9yID0gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcik7XG5cdFx0Ly8gY29uc29sZS5sb2cocmVxdWlyZSgndXRpbCcpLmluc3BlY3QoaW5mbywgZmFsc2UsIDk5LCB0cnVlKSk7XG5cblx0XHQvLyBkaXNjYXJkIGlmIHJlYWQgaW4gJ2xyRlgnIG9yICdsZngyJyBzZWN0aW9uXG5cdFx0dGFyZ2V0LmVmZmVjdHMgPSBwYXJzZUVmZmVjdHMoZGVzYywgISFvcHRpb25zLmxvZ01pc3NpbmdGZWF0dXJlcyk7XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQsIF8sIG9wdGlvbnMpID0+IHtcblx0XHRjb25zdCBkZXNjID0gc2VyaWFsaXplRWZmZWN0cyh0YXJnZXQuZWZmZWN0cyEsICEhb3B0aW9ucy5sb2dNaXNzaW5nRmVhdHVyZXMsIHRydWUpO1xuXG5cdFx0d3JpdGVVaW50MzIod3JpdGVyLCAwKTsgLy8gdmVyc2lvblxuXHRcdHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgJ251bGwnLCBkZXNjKTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdCdsckZYJyxcblx0aGFzS2V5KCdlZmZlY3RzJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdGlmICghdGFyZ2V0LmVmZmVjdHMpIHRhcmdldC5lZmZlY3RzID0gcmVhZEVmZmVjdHMocmVhZGVyKTtcblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlRWZmZWN0cyh3cml0ZXIsIHRhcmdldC5lZmZlY3RzISk7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQnbHVuaScsXG5cdGhhc0tleSgnbmFtZScpLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHR0YXJnZXQubmFtZSA9IHJlYWRVbmljb2RlU3RyaW5nKHJlYWRlcik7XG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVVbmljb2RlU3RyaW5nKHdyaXRlciwgdGFyZ2V0Lm5hbWUhKTtcblx0XHQvLyB3cml0ZVVpbnQxNih3cml0ZXIsIDApOyAvLyBwYWRkaW5nIChidXQgbm90IGV4dGVuZGluZyBzdHJpbmcgbGVuZ3RoKVxuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J2xuc3InLFxuXHRoYXNLZXkoJ25hbWVTb3VyY2UnKSxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB0YXJnZXQubmFtZVNvdXJjZSA9IHJlYWRTaWduYXR1cmUocmVhZGVyKSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB3cml0ZVNpZ25hdHVyZSh3cml0ZXIsIHRhcmdldC5uYW1lU291cmNlISksXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQnbHlpZCcsXG5cdGhhc0tleSgnaWQnKSxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB0YXJnZXQuaWQgPSByZWFkVWludDMyKHJlYWRlciksXG5cdCh3cml0ZXIsIHRhcmdldCwgX3BzZCwgb3B0aW9ucykgPT4ge1xuXHRcdGxldCBpZCA9IHRhcmdldC5pZCE7XG5cdFx0d2hpbGUgKG9wdGlvbnMubGF5ZXJJZHMuaW5kZXhPZihpZCkgIT09IC0xKSBpZCArPSAxMDA7IC8vIG1ha2Ugc3VyZSB3ZSBkb24ndCBoYXZlIGR1cGxpY2F0ZSBsYXllciBpZHNcblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIGlkKTtcblx0XHRvcHRpb25zLmxheWVySWRzLnB1c2goaWQpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J2xzY3QnLFxuXHRoYXNLZXkoJ3NlY3Rpb25EaXZpZGVyJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdHRhcmdldC5zZWN0aW9uRGl2aWRlciA9IHsgdHlwZTogcmVhZFVpbnQzMihyZWFkZXIpIH07XG5cblx0XHRpZiAobGVmdCgpKSB7XG5cdFx0XHRjaGVja1NpZ25hdHVyZShyZWFkZXIsICc4QklNJyk7XG5cdFx0XHR0YXJnZXQuc2VjdGlvbkRpdmlkZXIua2V5ID0gcmVhZFNpZ25hdHVyZShyZWFkZXIpO1xuXHRcdH1cblxuXHRcdGlmIChsZWZ0KCkpIHtcblx0XHRcdC8vIDAgPSBub3JtYWxcblx0XHRcdC8vIDEgPSBzY2VuZSBncm91cCwgYWZmZWN0cyB0aGUgYW5pbWF0aW9uIHRpbWVsaW5lLlxuXHRcdFx0dGFyZ2V0LnNlY3Rpb25EaXZpZGVyLnN1YlR5cGUgPSByZWFkVWludDMyKHJlYWRlcik7XG5cdFx0fVxuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIHRhcmdldC5zZWN0aW9uRGl2aWRlciEudHlwZSk7XG5cblx0XHRpZiAodGFyZ2V0LnNlY3Rpb25EaXZpZGVyIS5rZXkpIHtcblx0XHRcdHdyaXRlU2lnbmF0dXJlKHdyaXRlciwgJzhCSU0nKTtcblx0XHRcdHdyaXRlU2lnbmF0dXJlKHdyaXRlciwgdGFyZ2V0LnNlY3Rpb25EaXZpZGVyIS5rZXkpO1xuXG5cdFx0XHRpZiAodGFyZ2V0LnNlY3Rpb25EaXZpZGVyIS5zdWJUeXBlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0d3JpdGVVaW50MzIod3JpdGVyLCB0YXJnZXQuc2VjdGlvbkRpdmlkZXIhLnN1YlR5cGUpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcbik7XG5cbi8vIGl0IHNlZW1zIGxzZGsgaXMgdXNlZCB3aGVuIHRoZXJlJ3MgYSBsYXllciBpcyBuZXN0ZWQgbW9yZSB0aGFuIDYgbGV2ZWxzLCBidXQgSSBkb24ndCBrbm93IHdoeT9cbi8vIG1heWJlIHNvbWUgbGltaXRhdGlvbiBvZiBvbGQgdmVyc2lvbiBvZiBQUz9cbmFkZEhhbmRsZXJBbGlhcygnbHNkaycsICdsc2N0Jyk7XG5cbmFkZEhhbmRsZXIoXG5cdCdjbGJsJyxcblx0aGFzS2V5KCdibGVuZENsaXBwZW5kRWxlbWVudHMnKSxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0dGFyZ2V0LmJsZW5kQ2xpcHBlbmRFbGVtZW50cyA9ICEhcmVhZFVpbnQ4KHJlYWRlcik7XG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgMyk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlVWludDgod3JpdGVyLCB0YXJnZXQuYmxlbmRDbGlwcGVuZEVsZW1lbnRzID8gMSA6IDApO1xuXHRcdHdyaXRlWmVyb3Mod3JpdGVyLCAzKTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdCdpbmZ4Jyxcblx0aGFzS2V5KCdibGVuZEludGVyaW9yRWxlbWVudHMnKSxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0dGFyZ2V0LmJsZW5kSW50ZXJpb3JFbGVtZW50cyA9ICEhcmVhZFVpbnQ4KHJlYWRlcik7XG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgMyk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlVWludDgod3JpdGVyLCB0YXJnZXQuYmxlbmRJbnRlcmlvckVsZW1lbnRzID8gMSA6IDApO1xuXHRcdHdyaXRlWmVyb3Mod3JpdGVyLCAzKTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdCdrbmtvJyxcblx0aGFzS2V5KCdrbm9ja291dCcpLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHtcblx0XHR0YXJnZXQua25vY2tvdXQgPSAhIXJlYWRVaW50OChyZWFkZXIpO1xuXHRcdHNraXBCeXRlcyhyZWFkZXIsIDMpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgdGFyZ2V0Lmtub2Nrb3V0ID8gMSA6IDApO1xuXHRcdHdyaXRlWmVyb3Mod3JpdGVyLCAzKTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdCdsc3BmJyxcblx0aGFzS2V5KCdwcm90ZWN0ZWQnKSxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgZmxhZ3MgPSByZWFkVWludDMyKHJlYWRlcik7XG5cdFx0dGFyZ2V0LnByb3RlY3RlZCA9IHtcblx0XHRcdHRyYW5zcGFyZW5jeTogKGZsYWdzICYgMHgwMSkgIT09IDAsXG5cdFx0XHRjb21wb3NpdGU6IChmbGFncyAmIDB4MDIpICE9PSAwLFxuXHRcdFx0cG9zaXRpb246IChmbGFncyAmIDB4MDQpICE9PSAwLFxuXHRcdH07XG5cblx0XHRpZiAoZmxhZ3MgJiAweDA4KSB0YXJnZXQucHJvdGVjdGVkLmFydGJvYXJkcyA9IHRydWU7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGZsYWdzID1cblx0XHRcdCh0YXJnZXQucHJvdGVjdGVkIS50cmFuc3BhcmVuY3kgPyAweDAxIDogMCkgfFxuXHRcdFx0KHRhcmdldC5wcm90ZWN0ZWQhLmNvbXBvc2l0ZSA/IDB4MDIgOiAwKSB8XG5cdFx0XHQodGFyZ2V0LnByb3RlY3RlZCEucG9zaXRpb24gPyAweDA0IDogMCkgfFxuXHRcdFx0KHRhcmdldC5wcm90ZWN0ZWQhLmFydGJvYXJkcyA/IDB4MDggOiAwKTtcblxuXHRcdHdyaXRlVWludDMyKHdyaXRlciwgZmxhZ3MpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J2xjbHInLFxuXHRoYXNLZXkoJ2xheWVyQ29sb3InKSxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgY29sb3IgPSByZWFkVWludDE2KHJlYWRlcik7XG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgNik7XG5cdFx0dGFyZ2V0LmxheWVyQ29sb3IgPSBsYXllckNvbG9yc1tjb2xvcl07XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGluZGV4ID0gbGF5ZXJDb2xvcnMuaW5kZXhPZih0YXJnZXQubGF5ZXJDb2xvciEpO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgaW5kZXggPT09IC0xID8gMCA6IGluZGV4KTtcblx0XHR3cml0ZVplcm9zKHdyaXRlciwgNik7XG5cdH0sXG4pO1xuXG5pbnRlcmZhY2UgQ3VzdG9tRGVzY3JpcHRvciB7XG5cdGxheWVyVGltZT86IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIEZyYW1lTGlzdERlc2NyaXB0b3Ige1xuXHRMYUlEOiBudW1iZXI7XG5cdExhU3Q6IHtcblx0XHRlbmFiPzogYm9vbGVhbjtcblx0XHRJTXNrPzogeyBPZnN0OiB7IEhyem46IG51bWJlcjsgVnJ0YzogbnVtYmVyOyB9IH07XG5cdFx0Vk1zaz86IHsgT2ZzdDogeyBIcnpuOiBudW1iZXI7IFZydGM6IG51bWJlcjsgfSB9O1xuXHRcdEZYUmY/OiB7IEhyem46IG51bWJlcjsgVnJ0YzogbnVtYmVyOyB9O1xuXHRcdEZyTHM6IG51bWJlcltdO1xuXHR9W107XG59XG5cbmFkZEhhbmRsZXIoXG5cdCdzaG1kJyxcblx0aGFzS2V5KCd0aW1lc3RhbXAnKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0LCBfLCBvcHRpb25zKSA9PiB7XG5cdFx0Y29uc3QgY291bnQgPSByZWFkVWludDMyKHJlYWRlcik7XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcblx0XHRcdGNoZWNrU2lnbmF0dXJlKHJlYWRlciwgJzhCSU0nKTtcblx0XHRcdGNvbnN0IGtleSA9IHJlYWRTaWduYXR1cmUocmVhZGVyKTtcblx0XHRcdHJlYWRVaW50OChyZWFkZXIpOyAvLyBjb3B5XG5cdFx0XHRza2lwQnl0ZXMocmVhZGVyLCAzKTtcblxuXHRcdFx0cmVhZFNlY3Rpb24ocmVhZGVyLCAxLCBsZWZ0ID0+IHtcblx0XHRcdFx0aWYgKGtleSA9PT0gJ2N1c3QnKSB7XG5cdFx0XHRcdFx0Y29uc3QgZGVzYyA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpIGFzIEN1c3RvbURlc2NyaXB0b3I7XG5cdFx0XHRcdFx0aWYgKGRlc2MubGF5ZXJUaW1lICE9PSB1bmRlZmluZWQpIHRhcmdldC50aW1lc3RhbXAgPSBkZXNjLmxheWVyVGltZTtcblx0XHRcdFx0fSBlbHNlIGlmIChrZXkgPT09ICdtbHN0Jykge1xuXHRcdFx0XHRcdGNvbnN0IGRlc2MgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKSBhcyBGcmFtZUxpc3REZXNjcmlwdG9yO1xuXHRcdFx0XHRcdG9wdGlvbnMubG9nRGV2RmVhdHVyZXMgJiYgY29uc29sZS5sb2coJ21sc3QnLCBkZXNjKTtcblx0XHRcdFx0XHQvLyBvcHRpb25zLmxvZ0RldkZlYXR1cmVzICYmIGNvbnNvbGUubG9nKCdtbHN0JywgcmVxdWlyZSgndXRpbCcpLmluc3BlY3QoZGVzYywgZmFsc2UsIDk5LCB0cnVlKSk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoa2V5ID09PSAnbWR5bicpIHtcblx0XHRcdFx0XHQvLyBmcmFtZSBmbGFnc1xuXHRcdFx0XHRcdGNvbnN0IHVua25vd24gPSByZWFkVWludDE2KHJlYWRlcik7XG5cdFx0XHRcdFx0Y29uc3QgcHJvcGFnYXRlID0gcmVhZFVpbnQ4KHJlYWRlcik7XG5cdFx0XHRcdFx0Y29uc3QgZmxhZ3MgPSByZWFkVWludDgocmVhZGVyKTtcblx0XHRcdFx0XHRjb25zdCB1bmlmeUxheWVyUG9zaXRpb24gPSAoZmxhZ3MgJiAxKSAhPT0gMDtcblx0XHRcdFx0XHRjb25zdCB1bmlmeUxheWVyU3R5bGUgPSAoZmxhZ3MgJiAyKSAhPT0gMDtcblx0XHRcdFx0XHRjb25zdCB1bmlmeUxheWVyVmlzaWJpbGl0eSA9IChmbGFncyAmIDQpICE9PSAwO1xuXHRcdFx0XHRcdG9wdGlvbnMubG9nRGV2RmVhdHVyZXMgJiYgY29uc29sZS5sb2coXG5cdFx0XHRcdFx0XHQnbWR5bicsICd1bmtub3duOicsIHVua25vd24sICdwcm9wYWdhdGU6JywgcHJvcGFnYXRlLFxuXHRcdFx0XHRcdFx0J2ZsYWdzOicsIGZsYWdzLCB7IHVuaWZ5TGF5ZXJQb3NpdGlvbiwgdW5pZnlMYXllclN0eWxlLCB1bmlmeUxheWVyVmlzaWJpbGl0eSB9KTtcblxuXHRcdFx0XHRcdC8vIGNvbnN0IGRlc2MgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKSBhcyBGcmFtZUxpc3REZXNjcmlwdG9yO1xuXHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKCdtZHluJywgcmVxdWlyZSgndXRpbCcpLmluc3BlY3QoZGVzYywgZmFsc2UsIDk5LCB0cnVlKSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0b3B0aW9ucy5sb2dEZXZGZWF0dXJlcyAmJiBjb25zb2xlLmxvZygnVW5oYW5kbGVkIG1ldGFkYXRhJywga2V5KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBkZXNjOiBDdXN0b21EZXNjcmlwdG9yID0ge1xuXHRcdFx0bGF5ZXJUaW1lOiB0YXJnZXQudGltZXN0YW1wISxcblx0XHR9O1xuXG5cdFx0d3JpdGVVaW50MzIod3JpdGVyLCAxKTsgLy8gY291bnRcblxuXHRcdHdyaXRlU2lnbmF0dXJlKHdyaXRlciwgJzhCSU0nKTtcblx0XHR3cml0ZVNpZ25hdHVyZSh3cml0ZXIsICdjdXN0Jyk7XG5cdFx0d3JpdGVVaW50OCh3cml0ZXIsIDApOyAvLyBjb3B5IChhbHdheXMgZmFsc2UpXG5cdFx0d3JpdGVaZXJvcyh3cml0ZXIsIDMpO1xuXHRcdHdyaXRlU2VjdGlvbih3cml0ZXIsIDIsICgpID0+IHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgJ21ldGFkYXRhJywgZGVzYyksIHRydWUpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J3ZzdGsnLFxuXHRoYXNLZXkoJ3ZlY3RvclN0cm9rZScpLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRjb25zdCBkZXNjID0gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcikgYXMgU3Ryb2tlRGVzY3JpcHRvcjtcblx0XHQvLyBjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChkZXNjLCBmYWxzZSwgOTksIHRydWUpKTtcblxuXHRcdHRhcmdldC52ZWN0b3JTdHJva2UgPSB7XG5cdFx0XHRzdHJva2VFbmFibGVkOiBkZXNjLnN0cm9rZUVuYWJsZWQsXG5cdFx0XHRmaWxsRW5hYmxlZDogZGVzYy5maWxsRW5hYmxlZCxcblx0XHRcdGxpbmVXaWR0aDogcGFyc2VVbml0cyhkZXNjLnN0cm9rZVN0eWxlTGluZVdpZHRoKSxcblx0XHRcdGxpbmVEYXNoT2Zmc2V0OiBwYXJzZVVuaXRzKGRlc2Muc3Ryb2tlU3R5bGVMaW5lRGFzaE9mZnNldCksXG5cdFx0XHRtaXRlckxpbWl0OiBkZXNjLnN0cm9rZVN0eWxlTWl0ZXJMaW1pdCxcblx0XHRcdGxpbmVDYXBUeXBlOiBzdHJva2VTdHlsZUxpbmVDYXBUeXBlLmRlY29kZShkZXNjLnN0cm9rZVN0eWxlTGluZUNhcFR5cGUpLFxuXHRcdFx0bGluZUpvaW5UeXBlOiBzdHJva2VTdHlsZUxpbmVKb2luVHlwZS5kZWNvZGUoZGVzYy5zdHJva2VTdHlsZUxpbmVKb2luVHlwZSksXG5cdFx0XHRsaW5lQWxpZ25tZW50OiBzdHJva2VTdHlsZUxpbmVBbGlnbm1lbnQuZGVjb2RlKGRlc2Muc3Ryb2tlU3R5bGVMaW5lQWxpZ25tZW50KSxcblx0XHRcdHNjYWxlTG9jazogZGVzYy5zdHJva2VTdHlsZVNjYWxlTG9jayxcblx0XHRcdHN0cm9rZUFkanVzdDogZGVzYy5zdHJva2VTdHlsZVN0cm9rZUFkanVzdCxcblx0XHRcdGxpbmVEYXNoU2V0OiBkZXNjLnN0cm9rZVN0eWxlTGluZURhc2hTZXQubWFwKHBhcnNlVW5pdHMpLFxuXHRcdFx0YmxlbmRNb2RlOiBCbG5NLmRlY29kZShkZXNjLnN0cm9rZVN0eWxlQmxlbmRNb2RlKSxcblx0XHRcdG9wYWNpdHk6IHBhcnNlUGVyY2VudChkZXNjLnN0cm9rZVN0eWxlT3BhY2l0eSksXG5cdFx0XHRjb250ZW50OiBwYXJzZVZlY3RvckNvbnRlbnQoZGVzYy5zdHJva2VTdHlsZUNvbnRlbnQpLFxuXHRcdFx0cmVzb2x1dGlvbjogZGVzYy5zdHJva2VTdHlsZVJlc29sdXRpb24sXG5cdFx0fTtcblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IHN0cm9rZSA9IHRhcmdldC52ZWN0b3JTdHJva2UhO1xuXHRcdGNvbnN0IGRlc2NyaXB0b3I6IFN0cm9rZURlc2NyaXB0b3IgPSB7XG5cdFx0XHRzdHJva2VTdHlsZVZlcnNpb246IDIsXG5cdFx0XHRzdHJva2VFbmFibGVkOiAhIXN0cm9rZS5zdHJva2VFbmFibGVkLFxuXHRcdFx0ZmlsbEVuYWJsZWQ6ICEhc3Ryb2tlLmZpbGxFbmFibGVkLFxuXHRcdFx0c3Ryb2tlU3R5bGVMaW5lV2lkdGg6IHN0cm9rZS5saW5lV2lkdGggfHwgeyB2YWx1ZTogMywgdW5pdHM6ICdQb2ludHMnIH0sXG5cdFx0XHRzdHJva2VTdHlsZUxpbmVEYXNoT2Zmc2V0OiBzdHJva2UubGluZURhc2hPZmZzZXQgfHwgeyB2YWx1ZTogMCwgdW5pdHM6ICdQb2ludHMnIH0sXG5cdFx0XHRzdHJva2VTdHlsZU1pdGVyTGltaXQ6IHN0cm9rZS5taXRlckxpbWl0ID8/IDEwMCxcblx0XHRcdHN0cm9rZVN0eWxlTGluZUNhcFR5cGU6IHN0cm9rZVN0eWxlTGluZUNhcFR5cGUuZW5jb2RlKHN0cm9rZS5saW5lQ2FwVHlwZSksXG5cdFx0XHRzdHJva2VTdHlsZUxpbmVKb2luVHlwZTogc3Ryb2tlU3R5bGVMaW5lSm9pblR5cGUuZW5jb2RlKHN0cm9rZS5saW5lSm9pblR5cGUpLFxuXHRcdFx0c3Ryb2tlU3R5bGVMaW5lQWxpZ25tZW50OiBzdHJva2VTdHlsZUxpbmVBbGlnbm1lbnQuZW5jb2RlKHN0cm9rZS5saW5lQWxpZ25tZW50KSxcblx0XHRcdHN0cm9rZVN0eWxlU2NhbGVMb2NrOiAhIXN0cm9rZS5zY2FsZUxvY2ssXG5cdFx0XHRzdHJva2VTdHlsZVN0cm9rZUFkanVzdDogISFzdHJva2Uuc3Ryb2tlQWRqdXN0LFxuXHRcdFx0c3Ryb2tlU3R5bGVMaW5lRGFzaFNldDogc3Ryb2tlLmxpbmVEYXNoU2V0IHx8IFtdLFxuXHRcdFx0c3Ryb2tlU3R5bGVCbGVuZE1vZGU6IEJsbk0uZW5jb2RlKHN0cm9rZS5ibGVuZE1vZGUpLFxuXHRcdFx0c3Ryb2tlU3R5bGVPcGFjaXR5OiB1bml0c1BlcmNlbnQoc3Ryb2tlLm9wYWNpdHkgPz8gMSksXG5cdFx0XHRzdHJva2VTdHlsZUNvbnRlbnQ6IHNlcmlhbGl6ZVZlY3RvckNvbnRlbnQoXG5cdFx0XHRcdHN0cm9rZS5jb250ZW50IHx8IHsgdHlwZTogJ2NvbG9yJywgY29sb3I6IHsgcjogMCwgZzogMCwgYjogMCB9IH0pLmRlc2NyaXB0b3IsXG5cdFx0XHRzdHJva2VTdHlsZVJlc29sdXRpb246IHN0cm9rZS5yZXNvbHV0aW9uID8/IDcyLFxuXHRcdH07XG5cblx0XHR3cml0ZVZlcnNpb25BbmREZXNjcmlwdG9yKHdyaXRlciwgJycsICdzdHJva2VTdHlsZScsIGRlc2NyaXB0b3IpO1xuXHR9LFxuKTtcblxuaW50ZXJmYWNlIEFydGJEZXNjcmlwdG9yIHtcblx0YXJ0Ym9hcmRSZWN0OiB7ICdUb3AgJzogbnVtYmVyOyBMZWZ0OiBudW1iZXI7IEJ0b206IG51bWJlcjsgUmdodDogbnVtYmVyOyB9O1xuXHRndWlkZUluZGVjZXM6IGFueVtdO1xuXHRhcnRib2FyZFByZXNldE5hbWU6IHN0cmluZztcblx0J0NsciAnOiBEZXNjcmlwdG9yQ29sb3I7XG5cdGFydGJvYXJkQmFja2dyb3VuZFR5cGU6IG51bWJlcjtcbn1cblxuYWRkSGFuZGxlcihcblx0J2FydGInLCAvLyBwZXItbGF5ZXIgYXJib2FyZCBpbmZvXG5cdGhhc0tleSgnYXJ0Ym9hcmQnKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0Y29uc3QgZGVzYyA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpIGFzIEFydGJEZXNjcmlwdG9yO1xuXHRcdGNvbnN0IHJlY3QgPSBkZXNjLmFydGJvYXJkUmVjdDtcblx0XHR0YXJnZXQuYXJ0Ym9hcmQgPSB7XG5cdFx0XHRyZWN0OiB7IHRvcDogcmVjdFsnVG9wICddLCBsZWZ0OiByZWN0LkxlZnQsIGJvdHRvbTogcmVjdC5CdG9tLCByaWdodDogcmVjdC5SZ2h0IH0sXG5cdFx0XHRndWlkZUluZGljZXM6IGRlc2MuZ3VpZGVJbmRlY2VzLFxuXHRcdFx0cHJlc2V0TmFtZTogZGVzYy5hcnRib2FyZFByZXNldE5hbWUsXG5cdFx0XHRjb2xvcjogcGFyc2VDb2xvcihkZXNjWydDbHIgJ10pLFxuXHRcdFx0YmFja2dyb3VuZFR5cGU6IGRlc2MuYXJ0Ym9hcmRCYWNrZ3JvdW5kVHlwZSxcblx0XHR9O1xuXG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgYXJ0Ym9hcmQgPSB0YXJnZXQuYXJ0Ym9hcmQhO1xuXHRcdGNvbnN0IHJlY3QgPSBhcnRib2FyZC5yZWN0O1xuXHRcdGNvbnN0IGRlc2M6IEFydGJEZXNjcmlwdG9yID0ge1xuXHRcdFx0YXJ0Ym9hcmRSZWN0OiB7ICdUb3AgJzogcmVjdC50b3AsIExlZnQ6IHJlY3QubGVmdCwgQnRvbTogcmVjdC5ib3R0b20sIFJnaHQ6IHJlY3QucmlnaHQgfSxcblx0XHRcdGd1aWRlSW5kZWNlczogYXJ0Ym9hcmQuZ3VpZGVJbmRpY2VzIHx8IFtdLFxuXHRcdFx0YXJ0Ym9hcmRQcmVzZXROYW1lOiBhcnRib2FyZC5wcmVzZXROYW1lIHx8ICcnLFxuXHRcdFx0J0NsciAnOiBzZXJpYWxpemVDb2xvcihhcnRib2FyZC5jb2xvciksXG5cdFx0XHRhcnRib2FyZEJhY2tncm91bmRUeXBlOiBhcnRib2FyZC5iYWNrZ3JvdW5kVHlwZSA/PyAxLFxuXHRcdH07XG5cblx0XHR3cml0ZVZlcnNpb25BbmREZXNjcmlwdG9yKHdyaXRlciwgJycsICdhcnRib2FyZCcsIGRlc2MpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J3NuMlAnLFxuXHRoYXNLZXkoJ3VzaW5nQWxpZ25lZFJlbmRlcmluZycpLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHRhcmdldC51c2luZ0FsaWduZWRSZW5kZXJpbmcgPSAhIXJlYWRVaW50MzIocmVhZGVyKSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB3cml0ZVVpbnQzMih3cml0ZXIsIHRhcmdldC51c2luZ0FsaWduZWRSZW5kZXJpbmcgPyAxIDogMCksXG4pO1xuXG5jb25zdCBwbGFjZWRMYXllclR5cGVzOiBQbGFjZWRMYXllclR5cGVbXSA9IFsndW5rbm93bicsICd2ZWN0b3InLCAncmFzdGVyJywgJ2ltYWdlIHN0YWNrJ107XG5cbmZ1bmN0aW9uIHBhcnNlV2FycCh3YXJwOiBXYXJwRGVzY3JpcHRvciAmIFF1aWx0V2FycERlc2NyaXB0b3IpOiBXYXJwIHtcblx0Y29uc3QgcmVzdWx0OiBXYXJwID0ge1xuXHRcdHN0eWxlOiB3YXJwU3R5bGUuZGVjb2RlKHdhcnAud2FycFN0eWxlKSxcblx0XHR2YWx1ZTogd2FycC53YXJwVmFsdWUgfHwgMCxcblx0XHRwZXJzcGVjdGl2ZTogd2FycC53YXJwUGVyc3BlY3RpdmUgfHwgMCxcblx0XHRwZXJzcGVjdGl2ZU90aGVyOiB3YXJwLndhcnBQZXJzcGVjdGl2ZU90aGVyIHx8IDAsXG5cdFx0cm90YXRlOiBPcm50LmRlY29kZSh3YXJwLndhcnBSb3RhdGUpLFxuXHRcdGJvdW5kczogd2FycC5ib3VuZHMgJiYge1xuXHRcdFx0dG9wOiBwYXJzZVVuaXRzT3JOdW1iZXIod2FycC5ib3VuZHNbJ1RvcCAnXSksXG5cdFx0XHRsZWZ0OiBwYXJzZVVuaXRzT3JOdW1iZXIod2FycC5ib3VuZHMuTGVmdCksXG5cdFx0XHRib3R0b206IHBhcnNlVW5pdHNPck51bWJlcih3YXJwLmJvdW5kcy5CdG9tKSxcblx0XHRcdHJpZ2h0OiBwYXJzZVVuaXRzT3JOdW1iZXIod2FycC5ib3VuZHMuUmdodCksXG5cdFx0fSxcblx0XHR1T3JkZXI6IHdhcnAudU9yZGVyLFxuXHRcdHZPcmRlcjogd2FycC52T3JkZXIsXG5cdH07XG5cblx0aWYgKHdhcnAuZGVmb3JtTnVtUm93cyAhPSBudWxsIHx8IHdhcnAuZGVmb3JtTnVtQ29scyAhPSBudWxsKSB7XG5cdFx0cmVzdWx0LmRlZm9ybU51bVJvd3MgPSB3YXJwLmRlZm9ybU51bVJvd3M7XG5cdFx0cmVzdWx0LmRlZm9ybU51bUNvbHMgPSB3YXJwLmRlZm9ybU51bUNvbHM7XG5cdH1cblxuXHRjb25zdCBlbnZlbG9wZVdhcnAgPSB3YXJwLmN1c3RvbUVudmVsb3BlV2FycDtcblx0aWYgKGVudmVsb3BlV2FycCkge1xuXHRcdHJlc3VsdC5jdXN0b21FbnZlbG9wZVdhcnAgPSB7XG5cdFx0XHRtZXNoUG9pbnRzOiBbXSxcblx0XHR9O1xuXG5cdFx0Y29uc3QgeHMgPSBlbnZlbG9wZVdhcnAubWVzaFBvaW50cy5maW5kKGkgPT4gaS50eXBlID09PSAnSHJ6bicpPy52YWx1ZXMgfHwgW107XG5cdFx0Y29uc3QgeXMgPSBlbnZlbG9wZVdhcnAubWVzaFBvaW50cy5maW5kKGkgPT4gaS50eXBlID09PSAnVnJ0YycpPy52YWx1ZXMgfHwgW107XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRyZXN1bHQuY3VzdG9tRW52ZWxvcGVXYXJwIS5tZXNoUG9pbnRzLnB1c2goeyB4OiB4c1tpXSwgeTogeXNbaV0gfSk7XG5cdFx0fVxuXG5cdFx0aWYgKGVudmVsb3BlV2FycC5xdWlsdFNsaWNlWCB8fCBlbnZlbG9wZVdhcnAucXVpbHRTbGljZVkpIHtcblx0XHRcdHJlc3VsdC5jdXN0b21FbnZlbG9wZVdhcnAucXVpbHRTbGljZVggPSBlbnZlbG9wZVdhcnAucXVpbHRTbGljZVg/LlswXT8udmFsdWVzIHx8IFtdO1xuXHRcdFx0cmVzdWx0LmN1c3RvbUVudmVsb3BlV2FycC5xdWlsdFNsaWNlWSA9IGVudmVsb3BlV2FycC5xdWlsdFNsaWNlWT8uWzBdPy52YWx1ZXMgfHwgW107XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaXNRdWlsdFdhcnAod2FycDogV2FycCkge1xuXHRyZXR1cm4gd2FycC5kZWZvcm1OdW1Db2xzICE9IG51bGwgfHwgd2FycC5kZWZvcm1OdW1Sb3dzICE9IG51bGwgfHxcblx0XHR3YXJwLmN1c3RvbUVudmVsb3BlV2FycD8ucXVpbHRTbGljZVggfHwgd2FycC5jdXN0b21FbnZlbG9wZVdhcnA/LnF1aWx0U2xpY2VZO1xufVxuXG5mdW5jdGlvbiBlbmNvZGVXYXJwKHdhcnA6IFdhcnApOiBXYXJwRGVzY3JpcHRvciB7XG5cdGNvbnN0IGJvdW5kcyA9IHdhcnAuYm91bmRzO1xuXHRjb25zdCBkZXNjOiBXYXJwRGVzY3JpcHRvciA9IHtcblx0XHR3YXJwU3R5bGU6IHdhcnBTdHlsZS5lbmNvZGUod2FycC5zdHlsZSksXG5cdFx0d2FycFZhbHVlOiB3YXJwLnZhbHVlIHx8IDAsXG5cdFx0d2FycFBlcnNwZWN0aXZlOiB3YXJwLnBlcnNwZWN0aXZlIHx8IDAsXG5cdFx0d2FycFBlcnNwZWN0aXZlT3RoZXI6IHdhcnAucGVyc3BlY3RpdmVPdGhlciB8fCAwLFxuXHRcdHdhcnBSb3RhdGU6IE9ybnQuZW5jb2RlKHdhcnAucm90YXRlKSxcblx0XHRib3VuZHM6IHtcblx0XHRcdCdUb3AgJzogdW5pdHNWYWx1ZShib3VuZHMgJiYgYm91bmRzLnRvcCB8fCB7IHVuaXRzOiAnUGl4ZWxzJywgdmFsdWU6IDAgfSwgJ2JvdW5kcy50b3AnKSxcblx0XHRcdExlZnQ6IHVuaXRzVmFsdWUoYm91bmRzICYmIGJvdW5kcy5sZWZ0IHx8IHsgdW5pdHM6ICdQaXhlbHMnLCB2YWx1ZTogMCB9LCAnYm91bmRzLmxlZnQnKSxcblx0XHRcdEJ0b206IHVuaXRzVmFsdWUoYm91bmRzICYmIGJvdW5kcy5ib3R0b20gfHwgeyB1bml0czogJ1BpeGVscycsIHZhbHVlOiAwIH0sICdib3VuZHMuYm90dG9tJyksXG5cdFx0XHRSZ2h0OiB1bml0c1ZhbHVlKGJvdW5kcyAmJiBib3VuZHMucmlnaHQgfHwgeyB1bml0czogJ1BpeGVscycsIHZhbHVlOiAwIH0sICdib3VuZHMucmlnaHQnKSxcblx0XHR9LFxuXHRcdHVPcmRlcjogd2FycC51T3JkZXIgfHwgMCxcblx0XHR2T3JkZXI6IHdhcnAudk9yZGVyIHx8IDAsXG5cdH07XG5cblx0Y29uc3QgaXNRdWlsdCA9IGlzUXVpbHRXYXJwKHdhcnApO1xuXG5cdGlmIChpc1F1aWx0KSB7XG5cdFx0Y29uc3QgZGVzYzIgPSBkZXNjIGFzIFF1aWx0V2FycERlc2NyaXB0b3I7XG5cdFx0ZGVzYzIuZGVmb3JtTnVtUm93cyA9IHdhcnAuZGVmb3JtTnVtUm93cyB8fCAwO1xuXHRcdGRlc2MyLmRlZm9ybU51bUNvbHMgPSB3YXJwLmRlZm9ybU51bUNvbHMgfHwgMDtcblx0fVxuXG5cdGNvbnN0IGN1c3RvbUVudmVsb3BlV2FycCA9IHdhcnAuY3VzdG9tRW52ZWxvcGVXYXJwO1xuXHRpZiAoY3VzdG9tRW52ZWxvcGVXYXJwKSB7XG5cdFx0Y29uc3QgbWVzaFBvaW50cyA9IGN1c3RvbUVudmVsb3BlV2FycC5tZXNoUG9pbnRzIHx8IFtdO1xuXG5cdFx0aWYgKGlzUXVpbHQpIHtcblx0XHRcdGNvbnN0IGRlc2MyID0gZGVzYyBhcyBRdWlsdFdhcnBEZXNjcmlwdG9yO1xuXHRcdFx0ZGVzYzIuY3VzdG9tRW52ZWxvcGVXYXJwID0ge1xuXHRcdFx0XHRxdWlsdFNsaWNlWDogW3tcblx0XHRcdFx0XHR0eXBlOiAncXVpbHRTbGljZVgnLFxuXHRcdFx0XHRcdHZhbHVlczogY3VzdG9tRW52ZWxvcGVXYXJwLnF1aWx0U2xpY2VYIHx8IFtdLFxuXHRcdFx0XHR9XSxcblx0XHRcdFx0cXVpbHRTbGljZVk6IFt7XG5cdFx0XHRcdFx0dHlwZTogJ3F1aWx0U2xpY2VZJyxcblx0XHRcdFx0XHR2YWx1ZXM6IGN1c3RvbUVudmVsb3BlV2FycC5xdWlsdFNsaWNlWSB8fCBbXSxcblx0XHRcdFx0fV0sXG5cdFx0XHRcdG1lc2hQb2ludHM6IFtcblx0XHRcdFx0XHR7IHR5cGU6ICdIcnpuJywgdmFsdWVzOiBtZXNoUG9pbnRzLm1hcChwID0+IHAueCkgfSxcblx0XHRcdFx0XHR7IHR5cGU6ICdWcnRjJywgdmFsdWVzOiBtZXNoUG9pbnRzLm1hcChwID0+IHAueSkgfSxcblx0XHRcdFx0XSxcblx0XHRcdH07XG5cdFx0fSBlbHNlIHtcblx0XHRcdGRlc2MuY3VzdG9tRW52ZWxvcGVXYXJwID0ge1xuXHRcdFx0XHRtZXNoUG9pbnRzOiBbXG5cdFx0XHRcdFx0eyB0eXBlOiAnSHJ6bicsIHZhbHVlczogbWVzaFBvaW50cy5tYXAocCA9PiBwLngpIH0sXG5cdFx0XHRcdFx0eyB0eXBlOiAnVnJ0YycsIHZhbHVlczogbWVzaFBvaW50cy5tYXAocCA9PiBwLnkpIH0sXG5cdFx0XHRcdF0sXG5cdFx0XHR9O1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBkZXNjO1xufVxuXG5hZGRIYW5kbGVyKFxuXHQnUGxMZCcsXG5cdGhhc0tleSgncGxhY2VkTGF5ZXInKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0aWYgKHJlYWRTaWduYXR1cmUocmVhZGVyKSAhPT0gJ3BsY0wnKSB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgUGxMZCBzaWduYXR1cmVgKTtcblx0XHRpZiAocmVhZEludDMyKHJlYWRlcikgIT09IDMpIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBQbExkIHZlcnNpb25gKTtcblx0XHRjb25zdCBpZCA9IHJlYWRQYXNjYWxTdHJpbmcocmVhZGVyLCAxKTtcblx0XHRyZWFkSW50MzIocmVhZGVyKTsgLy8gcGFnZU51bWJlclxuXHRcdHJlYWRJbnQzMihyZWFkZXIpOyAvLyB0b3RhbFBhZ2VzLCBUT0RPOiBjaGVjayBob3cgdGhpcyB3b3JrcyA/XG5cdFx0cmVhZEludDMyKHJlYWRlcik7IC8vIGFuaXRBbGlhc1BvbGljeSAxNlxuXHRcdGNvbnN0IHBsYWNlZExheWVyVHlwZSA9IHJlYWRJbnQzMihyZWFkZXIpOyAvLyAwID0gdW5rbm93biwgMSA9IHZlY3RvciwgMiA9IHJhc3RlciwgMyA9IGltYWdlIHN0YWNrXG5cdFx0aWYgKCFwbGFjZWRMYXllclR5cGVzW3BsYWNlZExheWVyVHlwZV0pIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBQbExkIHR5cGUnKTtcblx0XHRjb25zdCB0cmFuc2Zvcm06IG51bWJlcltdID0gW107XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCA4OyBpKyspIHRyYW5zZm9ybS5wdXNoKHJlYWRGbG9hdDY0KHJlYWRlcikpOyAvLyB4LCB5IG9mIDQgY29ybmVycyBvZiB0aGUgdHJhbnNmb3JtXG5cdFx0Y29uc3Qgd2FycFZlcnNpb24gPSByZWFkSW50MzIocmVhZGVyKTtcblx0XHRpZiAod2FycFZlcnNpb24gIT09IDApIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBXYXJwIHZlcnNpb24gJHt3YXJwVmVyc2lvbn1gKTtcblx0XHRjb25zdCB3YXJwOiBXYXJwRGVzY3JpcHRvciAmIFF1aWx0V2FycERlc2NyaXB0b3IgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKTtcblxuXHRcdHRhcmdldC5wbGFjZWRMYXllciA9IHRhcmdldC5wbGFjZWRMYXllciB8fCB7IC8vIHNraXAgaWYgU29MZCBhbHJlYWR5IHNldCBpdFxuXHRcdFx0aWQsXG5cdFx0XHR0eXBlOiBwbGFjZWRMYXllclR5cGVzW3BsYWNlZExheWVyVHlwZV0sXG5cdFx0XHQvLyBwYWdlTnVtYmVyLFxuXHRcdFx0Ly8gdG90YWxQYWdlcyxcblx0XHRcdHRyYW5zZm9ybSxcblx0XHRcdHdhcnA6IHBhcnNlV2FycCh3YXJwKSxcblx0XHR9O1xuXG5cdFx0Ly8gY29uc29sZS5sb2coJ1BsTGQgd2FycCcsIHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KHdhcnAsIGZhbHNlLCA5OSwgdHJ1ZSkpO1xuXHRcdC8vIGNvbnNvbGUubG9nKCdQbExkJywgcmVxdWlyZSgndXRpbCcpLmluc3BlY3QodGFyZ2V0LnBsYWNlZExheWVyLCBmYWxzZSwgOTksIHRydWUpKTtcblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IHBsYWNlZCA9IHRhcmdldC5wbGFjZWRMYXllciE7XG5cdFx0d3JpdGVTaWduYXR1cmUod3JpdGVyLCAncGxjTCcpO1xuXHRcdHdyaXRlSW50MzIod3JpdGVyLCAzKTsgLy8gdmVyc2lvblxuXHRcdHdyaXRlUGFzY2FsU3RyaW5nKHdyaXRlciwgcGxhY2VkLmlkLCAxKTtcblx0XHR3cml0ZUludDMyKHdyaXRlciwgMSk7IC8vIHBhZ2VOdW1iZXJcblx0XHR3cml0ZUludDMyKHdyaXRlciwgMSk7IC8vIHRvdGFsUGFnZXNcblx0XHR3cml0ZUludDMyKHdyaXRlciwgMTYpOyAvLyBhbml0QWxpYXNQb2xpY3lcblx0XHRpZiAocGxhY2VkTGF5ZXJUeXBlcy5pbmRleE9mKHBsYWNlZC50eXBlKSA9PT0gLTEpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBwbGFjZWRMYXllciB0eXBlJyk7XG5cdFx0d3JpdGVJbnQzMih3cml0ZXIsIHBsYWNlZExheWVyVHlwZXMuaW5kZXhPZihwbGFjZWQudHlwZSkpO1xuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgODsgaSsrKSB3cml0ZUZsb2F0NjQod3JpdGVyLCBwbGFjZWQudHJhbnNmb3JtW2ldKTtcblx0XHR3cml0ZUludDMyKHdyaXRlciwgMCk7IC8vIHdhcnAgdmVyc2lvblxuXHRcdGNvbnN0IGlzUXVpbHQgPSBwbGFjZWQud2FycCAmJiBpc1F1aWx0V2FycChwbGFjZWQud2FycCk7XG5cdFx0Y29uc3QgdHlwZSA9IGlzUXVpbHQgPyAncXVpbHRXYXJwJyA6ICd3YXJwJztcblx0XHR3cml0ZVZlcnNpb25BbmREZXNjcmlwdG9yKHdyaXRlciwgJycsIHR5cGUsIGVuY29kZVdhcnAocGxhY2VkLndhcnAgfHwge30pLCB0eXBlKTtcblx0fSxcbik7XG5cbmludGVyZmFjZSBTb0xkRGVzY3JpcHRvciB7XG5cdElkbnQ6IHN0cmluZztcblx0cGxhY2VkOiBzdHJpbmc7XG5cdFBnTm06IG51bWJlcjtcblx0dG90YWxQYWdlczogbnVtYmVyO1xuXHRDcm9wPzogbnVtYmVyO1xuXHRmcmFtZVN0ZXA6IHsgbnVtZXJhdG9yOiBudW1iZXI7IGRlbm9taW5hdG9yOiBudW1iZXI7IH07XG5cdGR1cmF0aW9uOiB7IG51bWVyYXRvcjogbnVtYmVyOyBkZW5vbWluYXRvcjogbnVtYmVyOyB9O1xuXHRmcmFtZUNvdW50OiBudW1iZXI7XG5cdEFubnQ6IG51bWJlcjtcblx0VHlwZTogbnVtYmVyO1xuXHRUcm5mOiBudW1iZXJbXTtcblx0bm9uQWZmaW5lVHJhbnNmb3JtOiBudW1iZXJbXTtcblx0cXVpbHRXYXJwPzogUXVpbHRXYXJwRGVzY3JpcHRvcjtcblx0d2FycDogV2FycERlc2NyaXB0b3I7XG5cdCdTeiAgJzogeyBXZHRoOiBudW1iZXI7IEhnaHQ6IG51bWJlcjsgfTtcblx0UnNsdDogRGVzY3JpcHRvclVuaXRzVmFsdWU7XG5cdGNvbXA/OiBudW1iZXI7XG5cdGNvbXBJbmZvPzogeyBjb21wSUQ6IG51bWJlcjsgb3JpZ2luYWxDb21wSUQ6IG51bWJlcjsgfTtcbn1cblxuYWRkSGFuZGxlcihcblx0J1NvTGQnLFxuXHRoYXNLZXkoJ3BsYWNlZExheWVyJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdGlmIChyZWFkU2lnbmF0dXJlKHJlYWRlcikgIT09ICdzb0xEJykgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIFNvTGQgdHlwZWApO1xuXHRcdGlmIChyZWFkSW50MzIocmVhZGVyKSAhPT0gNCkgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIFNvTGQgdmVyc2lvbmApO1xuXHRcdGNvbnN0IGRlc2M6IFNvTGREZXNjcmlwdG9yID0gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcik7XG5cdFx0Ly8gY29uc29sZS5sb2coJ1NvTGQnLCByZXF1aXJlKCd1dGlsJykuaW5zcGVjdChkZXNjLCBmYWxzZSwgOTksIHRydWUpKTtcblx0XHQvLyBjb25zb2xlLmxvZygnU29MZC53YXJwJywgcmVxdWlyZSgndXRpbCcpLmluc3BlY3QoZGVzYy53YXJwLCBmYWxzZSwgOTksIHRydWUpKTtcblx0XHQvLyBjb25zb2xlLmxvZygnU29MZC5xdWlsdFdhcnAnLCByZXF1aXJlKCd1dGlsJykuaW5zcGVjdChkZXNjLnF1aWx0V2FycCwgZmFsc2UsIDk5LCB0cnVlKSk7XG5cblx0XHR0YXJnZXQucGxhY2VkTGF5ZXIgPSB7XG5cdFx0XHRpZDogZGVzYy5JZG50LFxuXHRcdFx0cGxhY2VkOiBkZXNjLnBsYWNlZCxcblx0XHRcdHR5cGU6IHBsYWNlZExheWVyVHlwZXNbZGVzYy5UeXBlXSxcblx0XHRcdC8vIHBhZ2VOdW1iZXI6IGluZm8uUGdObSxcblx0XHRcdC8vIHRvdGFsUGFnZXM6IGluZm8udG90YWxQYWdlcyxcblx0XHRcdC8vIGZyYW1lU3RlcDogaW5mby5mcmFtZVN0ZXAsXG5cdFx0XHQvLyBkdXJhdGlvbjogaW5mby5kdXJhdGlvbixcblx0XHRcdC8vIGZyYW1lQ291bnQ6IGluZm8uZnJhbWVDb3VudCxcblx0XHRcdHRyYW5zZm9ybTogZGVzYy5Ucm5mLFxuXHRcdFx0d2lkdGg6IGRlc2NbJ1N6ICAnXS5XZHRoLFxuXHRcdFx0aGVpZ2h0OiBkZXNjWydTeiAgJ10uSGdodCxcblx0XHRcdHJlc29sdXRpb246IHBhcnNlVW5pdHMoZGVzYy5Sc2x0KSxcblx0XHRcdHdhcnA6IHBhcnNlV2FycCgoZGVzYy5xdWlsdFdhcnAgfHwgZGVzYy53YXJwKSBhcyBhbnkpLFxuXHRcdH07XG5cblx0XHRpZiAoZGVzYy5ub25BZmZpbmVUcmFuc2Zvcm0gJiYgZGVzYy5ub25BZmZpbmVUcmFuc2Zvcm0uc29tZSgoeCwgaSkgPT4geCAhPT0gZGVzYy5Ucm5mW2ldKSkge1xuXHRcdFx0dGFyZ2V0LnBsYWNlZExheWVyLm5vbkFmZmluZVRyYW5zZm9ybSA9IGRlc2Mubm9uQWZmaW5lVHJhbnNmb3JtO1xuXHRcdH1cblxuXHRcdGlmIChkZXNjLkNyb3ApIHRhcmdldC5wbGFjZWRMYXllci5jcm9wID0gZGVzYy5Dcm9wO1xuXHRcdGlmIChkZXNjLmNvbXApIHRhcmdldC5wbGFjZWRMYXllci5jb21wID0gZGVzYy5jb21wO1xuXHRcdGlmIChkZXNjLmNvbXBJbmZvKSB0YXJnZXQucGxhY2VkTGF5ZXIuY29tcEluZm8gPSBkZXNjLmNvbXBJbmZvO1xuXG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTsgLy8gSEFDS1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHR3cml0ZVNpZ25hdHVyZSh3cml0ZXIsICdzb0xEJyk7XG5cdFx0d3JpdGVJbnQzMih3cml0ZXIsIDQpOyAvLyB2ZXJzaW9uXG5cblx0XHRjb25zdCBwbGFjZWQgPSB0YXJnZXQucGxhY2VkTGF5ZXIhO1xuXHRcdGNvbnN0IGRlc2M6IFNvTGREZXNjcmlwdG9yID0ge1xuXHRcdFx0SWRudDogcGxhY2VkLmlkLFxuXHRcdFx0cGxhY2VkOiBwbGFjZWQucGxhY2VkID8/IHBsYWNlZC5pZCwgLy8gPz8/XG5cdFx0XHRQZ05tOiAxLFxuXHRcdFx0dG90YWxQYWdlczogMSxcblx0XHRcdC4uLihwbGFjZWQuY3JvcCA/IHsgQ3JvcDogcGxhY2VkLmNyb3AgfSA6IHt9KSxcblx0XHRcdGZyYW1lU3RlcDoge1xuXHRcdFx0XHRudW1lcmF0b3I6IDAsXG5cdFx0XHRcdGRlbm9taW5hdG9yOiA2MDBcblx0XHRcdH0sXG5cdFx0XHRkdXJhdGlvbjoge1xuXHRcdFx0XHRudW1lcmF0b3I6IDAsXG5cdFx0XHRcdGRlbm9taW5hdG9yOiA2MDBcblx0XHRcdH0sXG5cdFx0XHRmcmFtZUNvdW50OiAxLFxuXHRcdFx0QW5udDogMTYsXG5cdFx0XHRUeXBlOiBwbGFjZWRMYXllclR5cGVzLmluZGV4T2YocGxhY2VkLnR5cGUpLFxuXHRcdFx0VHJuZjogcGxhY2VkLnRyYW5zZm9ybSxcblx0XHRcdG5vbkFmZmluZVRyYW5zZm9ybTogcGxhY2VkLm5vbkFmZmluZVRyYW5zZm9ybSA/PyBwbGFjZWQudHJhbnNmb3JtLFxuXHRcdFx0cXVpbHRXYXJwOiB7fSBhcyBhbnksXG5cdFx0XHR3YXJwOiBlbmNvZGVXYXJwKHBsYWNlZC53YXJwIHx8IHt9KSxcblx0XHRcdCdTeiAgJzoge1xuXHRcdFx0XHRXZHRoOiBwbGFjZWQud2lkdGggfHwgMCwgLy8gVE9ETzogZmluZCBzaXplID9cblx0XHRcdFx0SGdodDogcGxhY2VkLmhlaWdodCB8fCAwLCAvLyBUT0RPOiBmaW5kIHNpemUgP1xuXHRcdFx0fSxcblx0XHRcdFJzbHQ6IHBsYWNlZC5yZXNvbHV0aW9uID8gdW5pdHNWYWx1ZShwbGFjZWQucmVzb2x1dGlvbiwgJ3Jlc29sdXRpb24nKSA6IHsgdW5pdHM6ICdEZW5zaXR5JywgdmFsdWU6IDcyIH0sXG5cdFx0fTtcblxuXHRcdGlmIChwbGFjZWQud2FycCAmJiBpc1F1aWx0V2FycChwbGFjZWQud2FycCkpIHtcblx0XHRcdGNvbnN0IHF1aWx0V2FycCA9IGVuY29kZVdhcnAocGxhY2VkLndhcnApIGFzIFF1aWx0V2FycERlc2NyaXB0b3I7XG5cdFx0XHRkZXNjLnF1aWx0V2FycCA9IHF1aWx0V2FycDtcblx0XHRcdGRlc2Mud2FycCA9IHtcblx0XHRcdFx0d2FycFN0eWxlOiAnd2FycFN0eWxlLndhcnBOb25lJyxcblx0XHRcdFx0d2FycFZhbHVlOiBxdWlsdFdhcnAud2FycFZhbHVlLFxuXHRcdFx0XHR3YXJwUGVyc3BlY3RpdmU6IHF1aWx0V2FycC53YXJwUGVyc3BlY3RpdmUsXG5cdFx0XHRcdHdhcnBQZXJzcGVjdGl2ZU90aGVyOiBxdWlsdFdhcnAud2FycFBlcnNwZWN0aXZlT3RoZXIsXG5cdFx0XHRcdHdhcnBSb3RhdGU6IHF1aWx0V2FycC53YXJwUm90YXRlLFxuXHRcdFx0XHRib3VuZHM6IHF1aWx0V2FycC5ib3VuZHMsXG5cdFx0XHRcdHVPcmRlcjogcXVpbHRXYXJwLnVPcmRlcixcblx0XHRcdFx0dk9yZGVyOiBxdWlsdFdhcnAudk9yZGVyLFxuXHRcdFx0fTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZGVsZXRlIGRlc2MucXVpbHRXYXJwO1xuXHRcdH1cblxuXHRcdGlmIChwbGFjZWQuY29tcCkgZGVzYy5jb21wID0gcGxhY2VkLmNvbXA7XG5cdFx0aWYgKHBsYWNlZC5jb21wSW5mbykgZGVzYy5jb21wSW5mbyA9IHBsYWNlZC5jb21wSW5mbztcblxuXHRcdHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgJ251bGwnLCBkZXNjLCBkZXNjLnF1aWx0V2FycCA/ICdxdWlsdFdhcnAnIDogJ3dhcnAnKTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdCdmeHJwJyxcblx0aGFzS2V5KCdyZWZlcmVuY2VQb2ludCcpLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHtcblx0XHR0YXJnZXQucmVmZXJlbmNlUG9pbnQgPSB7XG5cdFx0XHR4OiByZWFkRmxvYXQ2NChyZWFkZXIpLFxuXHRcdFx0eTogcmVhZEZsb2F0NjQocmVhZGVyKSxcblx0XHR9O1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHR3cml0ZUZsb2F0NjQod3JpdGVyLCB0YXJnZXQucmVmZXJlbmNlUG9pbnQhLngpO1xuXHRcdHdyaXRlRmxvYXQ2NCh3cml0ZXIsIHRhcmdldC5yZWZlcmVuY2VQb2ludCEueSk7XG5cdH0sXG4pO1xuXG5pZiAoTU9DS19IQU5ETEVSUykge1xuXHRhZGRIYW5kbGVyKFxuXHRcdCdQYXR0Jyxcblx0XHR0YXJnZXQgPT4gKHRhcmdldCBhcyBhbnkpLl9QYXR0ICE9PSB1bmRlZmluZWQsXG5cdFx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0XHQvLyBjb25zb2xlLmxvZygnYWRkaXRpb25hbCBpbmZvOiBQYXR0Jyk7XG5cdFx0XHQodGFyZ2V0IGFzIGFueSkuX1BhdHQgPSByZWFkQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHRcdH0sXG5cdFx0KHdyaXRlciwgdGFyZ2V0KSA9PiBmYWxzZSAmJiB3cml0ZUJ5dGVzKHdyaXRlciwgKHRhcmdldCBhcyBhbnkpLl9QYXR0KSxcblx0KTtcbn0gZWxzZSB7XG5cdGFkZEhhbmRsZXIoXG5cdFx0J1BhdHQnLCAvLyBUT0RPOiBoYW5kbGUgYWxzbyBQYXQyICYgUGF0M1xuXHRcdHRhcmdldCA9PiAhdGFyZ2V0LFxuXHRcdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdFx0aWYgKCFsZWZ0KCkpIHJldHVybjtcblxuXHRcdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTsgcmV0dXJuOyAvLyBub3Qgc3VwcG9ydGVkIHlldFxuXHRcdFx0dGFyZ2V0OyByZWFkUGF0dGVybjtcblxuXHRcdFx0Ly8gaWYgKCF0YXJnZXQucGF0dGVybnMpIHRhcmdldC5wYXR0ZXJucyA9IFtdO1xuXHRcdFx0Ly8gdGFyZ2V0LnBhdHRlcm5zLnB1c2gocmVhZFBhdHRlcm4ocmVhZGVyKSk7XG5cdFx0XHQvLyBza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHRcdH0sXG5cdFx0KF93cml0ZXIsIF90YXJnZXQpID0+IHtcblx0XHR9LFxuXHQpO1xufVxuXG5mdW5jdGlvbiByZWFkUmVjdChyZWFkZXI6IFBzZFJlYWRlcikge1xuXHRjb25zdCB0b3AgPSByZWFkSW50MzIocmVhZGVyKTtcblx0Y29uc3QgbGVmdCA9IHJlYWRJbnQzMihyZWFkZXIpO1xuXHRjb25zdCBib3R0b20gPSByZWFkSW50MzIocmVhZGVyKTtcblx0Y29uc3QgcmlnaHQgPSByZWFkSW50MzIocmVhZGVyKTtcblx0cmV0dXJuIHsgdG9wLCBsZWZ0LCBib3R0b20sIHJpZ2h0IH07XG59XG5cbmZ1bmN0aW9uIHdyaXRlUmVjdCh3cml0ZXI6IFBzZFdyaXRlciwgcmVjdDogeyBsZWZ0OiBudW1iZXI7IHRvcDogbnVtYmVyOyByaWdodDogbnVtYmVyOyBib3R0b206IG51bWJlciB9KSB7XG5cdHdyaXRlSW50MzIod3JpdGVyLCByZWN0LnRvcCk7XG5cdHdyaXRlSW50MzIod3JpdGVyLCByZWN0LmxlZnQpO1xuXHR3cml0ZUludDMyKHdyaXRlciwgcmVjdC5ib3R0b20pO1xuXHR3cml0ZUludDMyKHdyaXRlciwgcmVjdC5yaWdodCk7XG59XG5cbmFkZEhhbmRsZXIoXG5cdCdBbm5vJyxcblx0dGFyZ2V0ID0+ICh0YXJnZXQgYXMgUHNkKS5hbm5vdGF0aW9ucyAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRjb25zdCBtYWpvciA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRjb25zdCBtaW5vciA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRpZiAobWFqb3IgIT09IDIgfHwgbWlub3IgIT09IDEpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBBbm5vIHZlcnNpb24nKTtcblx0XHRjb25zdCBjb3VudCA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHRjb25zdCBhbm5vdGF0aW9uczogQW5ub3RhdGlvbltdID0gW107XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcblx0XHRcdC8qY29uc3QgbGVuZ3RoID0qLyByZWFkVWludDMyKHJlYWRlcik7XG5cdFx0XHRjb25zdCB0eXBlID0gcmVhZFNpZ25hdHVyZShyZWFkZXIpO1xuXHRcdFx0Y29uc3Qgb3BlbiA9ICEhcmVhZFVpbnQ4KHJlYWRlcik7XG5cdFx0XHQvKmNvbnN0IGZsYWdzID0qLyByZWFkVWludDgocmVhZGVyKTsgLy8gYWx3YXlzIDI4XG5cdFx0XHQvKmNvbnN0IG9wdGlvbmFsQmxvY2tzID0qLyByZWFkVWludDE2KHJlYWRlcik7XG5cdFx0XHRjb25zdCBpY29uTG9jYXRpb24gPSByZWFkUmVjdChyZWFkZXIpO1xuXHRcdFx0Y29uc3QgcG9wdXBMb2NhdGlvbiA9IHJlYWRSZWN0KHJlYWRlcik7XG5cdFx0XHRjb25zdCBjb2xvciA9IHJlYWRDb2xvcihyZWFkZXIpO1xuXHRcdFx0Y29uc3QgYXV0aG9yID0gcmVhZFBhc2NhbFN0cmluZyhyZWFkZXIsIDIpO1xuXHRcdFx0Y29uc3QgbmFtZSA9IHJlYWRQYXNjYWxTdHJpbmcocmVhZGVyLCAyKTtcblx0XHRcdGNvbnN0IGRhdGUgPSByZWFkUGFzY2FsU3RyaW5nKHJlYWRlciwgMik7XG5cdFx0XHQvKmNvbnN0IGNvbnRlbnRMZW5ndGggPSovIHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHRcdC8qY29uc3QgZGF0YVR5cGUgPSovIHJlYWRTaWduYXR1cmUocmVhZGVyKTtcblx0XHRcdGNvbnN0IGRhdGFMZW5ndGggPSByZWFkVWludDMyKHJlYWRlcik7XG5cdFx0XHRsZXQgZGF0YTogc3RyaW5nIHwgVWludDhBcnJheTtcblxuXHRcdFx0aWYgKHR5cGUgPT09ICd0eHRBJykge1xuXHRcdFx0XHRpZiAoZGF0YUxlbmd0aCA+PSAyICYmIHJlYWRVaW50MTYocmVhZGVyKSA9PT0gMHhmZWZmKSB7XG5cdFx0XHRcdFx0ZGF0YSA9IHJlYWRVbmljb2RlU3RyaW5nV2l0aExlbmd0aChyZWFkZXIsIChkYXRhTGVuZ3RoIC0gMikgLyAyKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZWFkZXIub2Zmc2V0IC09IDI7XG5cdFx0XHRcdFx0ZGF0YSA9IHJlYWRBc2NpaVN0cmluZyhyZWFkZXIsIGRhdGFMZW5ndGgpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZGF0YSA9IGRhdGEucmVwbGFjZSgvXFxyL2csICdcXG4nKTtcblx0XHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gJ3NuZEEnKSB7XG5cdFx0XHRcdGRhdGEgPSByZWFkQnl0ZXMocmVhZGVyLCBkYXRhTGVuZ3RoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcignVW5rbm93biBhbm5vdGF0aW9uIHR5cGUnKTtcblx0XHRcdH1cblxuXHRcdFx0YW5ub3RhdGlvbnMucHVzaCh7XG5cdFx0XHRcdHR5cGU6IHR5cGUgPT09ICd0eHRBJyA/ICd0ZXh0JyA6ICdzb3VuZCcsIG9wZW4sIGljb25Mb2NhdGlvbiwgcG9wdXBMb2NhdGlvbiwgY29sb3IsIGF1dGhvciwgbmFtZSwgZGF0ZSwgZGF0YSxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdCh0YXJnZXQgYXMgUHNkKS5hbm5vdGF0aW9ucyA9IGFubm90YXRpb25zO1xuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGFubm90YXRpb25zID0gKHRhcmdldCBhcyBQc2QpLmFubm90YXRpb25zITtcblxuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgMik7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCAxKTtcblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIGFubm90YXRpb25zLmxlbmd0aCk7XG5cblx0XHRmb3IgKGNvbnN0IGFubm90YXRpb24gb2YgYW5ub3RhdGlvbnMpIHtcblx0XHRcdGNvbnN0IHNvdW5kID0gYW5ub3RhdGlvbi50eXBlID09PSAnc291bmQnO1xuXG5cdFx0XHRpZiAoc291bmQgJiYgIShhbm5vdGF0aW9uLmRhdGEgaW5zdGFuY2VvZiBVaW50OEFycmF5KSkgdGhyb3cgbmV3IEVycm9yKCdTb3VuZCBhbm5vdGF0aW9uIGRhdGEgc2hvdWxkIGJlIFVpbnQ4QXJyYXknKTtcblx0XHRcdGlmICghc291bmQgJiYgdHlwZW9mIGFubm90YXRpb24uZGF0YSAhPT0gJ3N0cmluZycpIHRocm93IG5ldyBFcnJvcignVGV4dCBhbm5vdGF0aW9uIGRhdGEgc2hvdWxkIGJlIHN0cmluZycpO1xuXG5cdFx0XHRjb25zdCBsZW5ndGhPZmZzZXQgPSB3cml0ZXIub2Zmc2V0O1xuXHRcdFx0d3JpdGVVaW50MzIod3JpdGVyLCAwKTsgLy8gbGVuZ3RoXG5cdFx0XHR3cml0ZVNpZ25hdHVyZSh3cml0ZXIsIHNvdW5kID8gJ3NuZEEnIDogJ3R4dEEnKTtcblx0XHRcdHdyaXRlVWludDgod3JpdGVyLCBhbm5vdGF0aW9uLm9wZW4gPyAxIDogMCk7XG5cdFx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgMjgpO1xuXHRcdFx0d3JpdGVVaW50MTYod3JpdGVyLCAxKTtcblx0XHRcdHdyaXRlUmVjdCh3cml0ZXIsIGFubm90YXRpb24uaWNvbkxvY2F0aW9uKTtcblx0XHRcdHdyaXRlUmVjdCh3cml0ZXIsIGFubm90YXRpb24ucG9wdXBMb2NhdGlvbik7XG5cdFx0XHR3cml0ZUNvbG9yKHdyaXRlciwgYW5ub3RhdGlvbi5jb2xvcik7XG5cdFx0XHR3cml0ZVBhc2NhbFN0cmluZyh3cml0ZXIsIGFubm90YXRpb24uYXV0aG9yIHx8ICcnLCAyKTtcblx0XHRcdHdyaXRlUGFzY2FsU3RyaW5nKHdyaXRlciwgYW5ub3RhdGlvbi5uYW1lIHx8ICcnLCAyKTtcblx0XHRcdHdyaXRlUGFzY2FsU3RyaW5nKHdyaXRlciwgYW5ub3RhdGlvbi5kYXRlIHx8ICcnLCAyKTtcblx0XHRcdGNvbnN0IGNvbnRlbnRPZmZzZXQgPSB3cml0ZXIub2Zmc2V0O1xuXHRcdFx0d3JpdGVVaW50MzIod3JpdGVyLCAwKTsgLy8gY29udGVudCBsZW5ndGhcblx0XHRcdHdyaXRlU2lnbmF0dXJlKHdyaXRlciwgc291bmQgPyAnc25kTScgOiAndHh0QycpO1xuXHRcdFx0d3JpdGVVaW50MzIod3JpdGVyLCAwKTsgLy8gZGF0YSBsZW5ndGhcblx0XHRcdGNvbnN0IGRhdGFPZmZzZXQgPSB3cml0ZXIub2Zmc2V0O1xuXG5cdFx0XHRpZiAoc291bmQpIHtcblx0XHRcdFx0d3JpdGVCeXRlcyh3cml0ZXIsIGFubm90YXRpb24uZGF0YSBhcyBVaW50OEFycmF5KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHdyaXRlVWludDE2KHdyaXRlciwgMHhmZWZmKTsgLy8gdW5pY29kZSBzdHJpbmcgaW5kaWNhdG9yXG5cdFx0XHRcdGNvbnN0IHRleHQgPSAoYW5ub3RhdGlvbi5kYXRhIGFzIHN0cmluZykucmVwbGFjZSgvXFxuL2csICdcXHInKTtcblx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0ZXh0Lmxlbmd0aDsgaSsrKSB3cml0ZVVpbnQxNih3cml0ZXIsIHRleHQuY2hhckNvZGVBdChpKSk7XG5cdFx0XHR9XG5cblx0XHRcdHdyaXRlci52aWV3LnNldFVpbnQzMihsZW5ndGhPZmZzZXQsIHdyaXRlci5vZmZzZXQgLSBsZW5ndGhPZmZzZXQsIGZhbHNlKTtcblx0XHRcdHdyaXRlci52aWV3LnNldFVpbnQzMihjb250ZW50T2Zmc2V0LCB3cml0ZXIub2Zmc2V0IC0gY29udGVudE9mZnNldCwgZmFsc2UpO1xuXHRcdFx0d3JpdGVyLnZpZXcuc2V0VWludDMyKGRhdGFPZmZzZXQgLSA0LCB3cml0ZXIub2Zmc2V0IC0gZGF0YU9mZnNldCwgZmFsc2UpO1xuXHRcdH1cblx0fVxuKTtcblxuaW50ZXJmYWNlIEZpbGVPcGVuRGVzY3JpcHRvciB7XG5cdGNvbXBJbmZvOiB7IGNvbXBJRDogbnVtYmVyOyBvcmlnaW5hbENvbXBJRDogbnVtYmVyOyB9O1xufVxuXG5hZGRIYW5kbGVyKFxuXHQnbG5rMicsXG5cdCh0YXJnZXQ6IGFueSkgPT4gISEodGFyZ2V0IGFzIFBzZCkubGlua2VkRmlsZXMgJiYgKHRhcmdldCBhcyBQc2QpLmxpbmtlZEZpbGVzIS5sZW5ndGggPiAwLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQsIF8sIG9wdGlvbnMpID0+IHtcblx0XHRjb25zdCBwc2QgPSB0YXJnZXQgYXMgUHNkO1xuXHRcdHBzZC5saW5rZWRGaWxlcyA9IFtdO1xuXG5cdFx0d2hpbGUgKGxlZnQoKSA+IDgpIHtcblx0XHRcdGxldCBzaXplID0gcmVhZExlbmd0aDY0KHJlYWRlcik7IC8vIHNpemVcblx0XHRcdGNvbnN0IHN0YXJ0T2Zmc2V0ID0gcmVhZGVyLm9mZnNldDtcblx0XHRcdGNvbnN0IHR5cGUgPSByZWFkU2lnbmF0dXJlKHJlYWRlcikgYXMgJ2xpRkQnIHwgJ2xpRkUnIHwgJ2xpRkEnO1xuXHRcdFx0Y29uc3QgdmVyc2lvbiA9IHJlYWRJbnQzMihyZWFkZXIpO1xuXHRcdFx0Y29uc3QgaWQgPSByZWFkUGFzY2FsU3RyaW5nKHJlYWRlciwgMSk7XG5cdFx0XHRjb25zdCBuYW1lID0gcmVhZFVuaWNvZGVTdHJpbmcocmVhZGVyKTtcblx0XHRcdGNvbnN0IGZpbGVUeXBlID0gcmVhZFNpZ25hdHVyZShyZWFkZXIpLnRyaW0oKTsgLy8gJyAgICAnIGlmIGVtcHR5XG5cdFx0XHRjb25zdCBmaWxlQ3JlYXRvciA9IHJlYWRTaWduYXR1cmUocmVhZGVyKS50cmltKCk7IC8vICcgICAgJyBvciAnXFwwXFwwXFwwXFwwJyBpZiBlbXB0eVxuXHRcdFx0Y29uc3QgZGF0YVNpemUgPSByZWFkTGVuZ3RoNjQocmVhZGVyKTtcblx0XHRcdGNvbnN0IGhhc0ZpbGVPcGVuRGVzY3JpcHRvciA9IHJlYWRVaW50OChyZWFkZXIpO1xuXHRcdFx0Y29uc3QgZmlsZU9wZW5EZXNjcmlwdG9yID0gaGFzRmlsZU9wZW5EZXNjcmlwdG9yID8gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcikgYXMgRmlsZU9wZW5EZXNjcmlwdG9yIDogdW5kZWZpbmVkO1xuXHRcdFx0Y29uc3QgbGlua2VkRmlsZURlc2NyaXB0b3IgPSB0eXBlID09PSAnbGlGRScgPyByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKSA6IHVuZGVmaW5lZDtcblx0XHRcdGNvbnN0IGZpbGU6IExpbmtlZEZpbGUgPSB7IGlkLCBuYW1lLCBkYXRhOiB1bmRlZmluZWQgfTtcblxuXHRcdFx0aWYgKGZpbGVUeXBlKSBmaWxlLnR5cGUgPSBmaWxlVHlwZTtcblx0XHRcdGlmIChmaWxlQ3JlYXRvcikgZmlsZS5jcmVhdG9yID0gZmlsZUNyZWF0b3I7XG5cdFx0XHRpZiAoZmlsZU9wZW5EZXNjcmlwdG9yKSBmaWxlLmRlc2NyaXB0b3IgPSBmaWxlT3BlbkRlc2NyaXB0b3I7XG5cblx0XHRcdGlmICh0eXBlID09PSAnbGlGRScgJiYgdmVyc2lvbiA+IDMpIHtcblx0XHRcdFx0Y29uc3QgeWVhciA9IHJlYWRJbnQzMihyZWFkZXIpO1xuXHRcdFx0XHRjb25zdCBtb250aCA9IHJlYWRVaW50OChyZWFkZXIpO1xuXHRcdFx0XHRjb25zdCBkYXkgPSByZWFkVWludDgocmVhZGVyKTtcblx0XHRcdFx0Y29uc3QgaG91ciA9IHJlYWRVaW50OChyZWFkZXIpO1xuXHRcdFx0XHRjb25zdCBtaW51dGUgPSByZWFkVWludDgocmVhZGVyKTtcblx0XHRcdFx0Y29uc3Qgc2Vjb25kcyA9IHJlYWRGbG9hdDY0KHJlYWRlcik7XG5cdFx0XHRcdGNvbnN0IHdob2xlU2Vjb25kcyA9IE1hdGguZmxvb3Ioc2Vjb25kcyk7XG5cdFx0XHRcdGNvbnN0IG1zID0gKHNlY29uZHMgLSB3aG9sZVNlY29uZHMpICogMTAwMDtcblx0XHRcdFx0ZmlsZS50aW1lID0gbmV3IERhdGUoeWVhciwgbW9udGgsIGRheSwgaG91ciwgbWludXRlLCB3aG9sZVNlY29uZHMsIG1zKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgZmlsZVNpemUgPSB0eXBlID09PSAnbGlGRScgPyByZWFkTGVuZ3RoNjQocmVhZGVyKSA6IDA7XG5cdFx0XHRpZiAodHlwZSA9PT0gJ2xpRkEnKSBza2lwQnl0ZXMocmVhZGVyLCA4KTtcblx0XHRcdGlmICh0eXBlID09PSAnbGlGRCcpIGZpbGUuZGF0YSA9IHJlYWRCeXRlcyhyZWFkZXIsIGRhdGFTaXplKTtcblx0XHRcdGlmICh2ZXJzaW9uID49IDUpIGZpbGUuY2hpbGREb2N1bWVudElEID0gcmVhZFVuaWNvZGVTdHJpbmcocmVhZGVyKTtcblx0XHRcdGlmICh2ZXJzaW9uID49IDYpIGZpbGUuYXNzZXRNb2RUaW1lID0gcmVhZEZsb2F0NjQocmVhZGVyKTtcblx0XHRcdGlmICh2ZXJzaW9uID49IDcpIGZpbGUuYXNzZXRMb2NrZWRTdGF0ZSA9IHJlYWRVaW50OChyZWFkZXIpO1xuXHRcdFx0aWYgKHR5cGUgPT09ICdsaUZFJykgZmlsZS5kYXRhID0gcmVhZEJ5dGVzKHJlYWRlciwgZmlsZVNpemUpO1xuXG5cdFx0XHRpZiAob3B0aW9ucy5za2lwTGlua2VkRmlsZXNEYXRhKSBmaWxlLmRhdGEgPSB1bmRlZmluZWQ7XG5cblx0XHRcdHBzZC5saW5rZWRGaWxlcy5wdXNoKGZpbGUpO1xuXHRcdFx0bGlua2VkRmlsZURlc2NyaXB0b3I7XG5cblx0XHRcdHdoaWxlIChzaXplICUgNCkgc2l6ZSsrO1xuXHRcdFx0cmVhZGVyLm9mZnNldCA9IHN0YXJ0T2Zmc2V0ICsgc2l6ZTtcblx0XHR9XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpOyAvLyA/XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IHBzZCA9IHRhcmdldCBhcyBQc2Q7XG5cblx0XHRmb3IgKGNvbnN0IGZpbGUgb2YgcHNkLmxpbmtlZEZpbGVzISkge1xuXHRcdFx0bGV0IHZlcnNpb24gPSAyO1xuXG5cdFx0XHRpZiAoZmlsZS5hc3NldExvY2tlZFN0YXRlICE9IG51bGwpIHZlcnNpb24gPSA3O1xuXHRcdFx0ZWxzZSBpZiAoZmlsZS5hc3NldE1vZFRpbWUgIT0gbnVsbCkgdmVyc2lvbiA9IDY7XG5cdFx0XHRlbHNlIGlmIChmaWxlLmNoaWxkRG9jdW1lbnRJRCAhPSBudWxsKSB2ZXJzaW9uID0gNTtcblx0XHRcdC8vIFRPRE86IGVsc2UgaWYgKGZpbGUudGltZSAhPSBudWxsKSB2ZXJzaW9uID0gMzsgKG9ubHkgZm9yIGxpRkUpXG5cblx0XHRcdHdyaXRlVWludDMyKHdyaXRlciwgMCk7XG5cdFx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIDApOyAvLyBzaXplXG5cdFx0XHRjb25zdCBzaXplT2Zmc2V0ID0gd3JpdGVyLm9mZnNldDtcblx0XHRcdHdyaXRlU2lnbmF0dXJlKHdyaXRlciwgZmlsZS5kYXRhID8gJ2xpRkQnIDogJ2xpRkEnKTtcblx0XHRcdHdyaXRlSW50MzIod3JpdGVyLCB2ZXJzaW9uKTtcblx0XHRcdHdyaXRlUGFzY2FsU3RyaW5nKHdyaXRlciwgZmlsZS5pZCB8fCAnJywgMSk7XG5cdFx0XHR3cml0ZVVuaWNvZGVTdHJpbmdXaXRoUGFkZGluZyh3cml0ZXIsIGZpbGUubmFtZSB8fCAnJyk7XG5cdFx0XHR3cml0ZVNpZ25hdHVyZSh3cml0ZXIsIGZpbGUudHlwZSA/IGAke2ZpbGUudHlwZX0gICAgYC5zdWJzdHJpbmcoMCwgNCkgOiAnICAgICcpO1xuXHRcdFx0d3JpdGVTaWduYXR1cmUod3JpdGVyLCBmaWxlLmNyZWF0b3IgPyBgJHtmaWxlLmNyZWF0b3J9ICAgIGAuc3Vic3RyaW5nKDAsIDQpIDogJ1xcMFxcMFxcMFxcMCcpO1xuXHRcdFx0d3JpdGVMZW5ndGg2NCh3cml0ZXIsIGZpbGUuZGF0YSA/IGZpbGUuZGF0YS5ieXRlTGVuZ3RoIDogMCk7XG5cblx0XHRcdGlmIChmaWxlLmRlc2NyaXB0b3IgJiYgZmlsZS5kZXNjcmlwdG9yLmNvbXBJbmZvKSB7XG5cdFx0XHRcdGNvbnN0IGRlc2M6IEZpbGVPcGVuRGVzY3JpcHRvciA9IHtcblx0XHRcdFx0XHRjb21wSW5mbzogZmlsZS5kZXNjcmlwdG9yLmNvbXBJbmZvLFxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHdyaXRlVWludDgod3JpdGVyLCAxKTtcblx0XHRcdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnbnVsbCcsIGRlc2MpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0d3JpdGVVaW50OCh3cml0ZXIsIDApO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoZmlsZS5kYXRhKSB3cml0ZUJ5dGVzKHdyaXRlciwgZmlsZS5kYXRhKTtcblx0XHRcdGVsc2Ugd3JpdGVMZW5ndGg2NCh3cml0ZXIsIDApO1xuXHRcdFx0aWYgKHZlcnNpb24gPj0gNSkgd3JpdGVVbmljb2RlU3RyaW5nV2l0aFBhZGRpbmcod3JpdGVyLCBmaWxlLmNoaWxkRG9jdW1lbnRJRCB8fCAnJyk7XG5cdFx0XHRpZiAodmVyc2lvbiA+PSA2KSB3cml0ZUZsb2F0NjQod3JpdGVyLCBmaWxlLmFzc2V0TW9kVGltZSB8fCAwKTtcblx0XHRcdGlmICh2ZXJzaW9uID49IDcpIHdyaXRlVWludDgod3JpdGVyLCBmaWxlLmFzc2V0TG9ja2VkU3RhdGUgfHwgMCk7XG5cblx0XHRcdGxldCBzaXplID0gd3JpdGVyLm9mZnNldCAtIHNpemVPZmZzZXQ7XG5cdFx0XHR3cml0ZXIudmlldy5zZXRVaW50MzIoc2l6ZU9mZnNldCAtIDQsIHNpemUsIGZhbHNlKTsgLy8gd3JpdGUgc2l6ZVxuXG5cdFx0XHR3aGlsZSAoc2l6ZSAlIDQpIHtcblx0XHRcdFx0c2l6ZSsrO1xuXHRcdFx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgMCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuKTtcbmFkZEhhbmRsZXJBbGlhcygnbG5rRCcsICdsbmsyJyk7XG5hZGRIYW5kbGVyQWxpYXMoJ2xuazMnLCAnbG5rMicpO1xuXG4vLyB0aGlzIHNlZW1zIHRvIGp1c3QgYmUgemVybyBzaXplIGJsb2NrLCBpZ25vcmUgaXRcbmFkZEhhbmRsZXIoXG5cdCdsbmtFJyxcblx0dGFyZ2V0ID0+ICh0YXJnZXQgYXMgYW55KS5fbG5rRSAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQsIF9wc2RzLCBvcHRpb25zKSA9PiB7XG5cdFx0aWYgKG9wdGlvbnMubG9nTWlzc2luZ0ZlYXR1cmVzICYmIGxlZnQoKSkge1xuXHRcdFx0Y29uc29sZS5sb2coYE5vbi1lbXB0eSBsbmtFIGxheWVyIGluZm8gKCR7bGVmdCgpfSBieXRlcylgKTtcblx0XHR9XG5cblx0XHRpZiAoTU9DS19IQU5ETEVSUykge1xuXHRcdFx0KHRhcmdldCBhcyBhbnkpLl9sbmtFID0gcmVhZEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0XHR9XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4gTU9DS19IQU5ETEVSUyAmJiB3cml0ZUJ5dGVzKHdyaXRlciwgKHRhcmdldCBhcyBhbnkpLl9sbmtFKSxcbik7XG5cbmludGVyZmFjZSBFeHRlbnNpb25EZXNjIHtcblx0Z2VuZXJhdG9yU2V0dGluZ3M6IHtcblx0XHRnZW5lcmF0b3JfNDVfYXNzZXRzOiB7IGpzb246IHN0cmluZzsgfTtcblx0XHRsYXllclRpbWU6IG51bWJlcjtcblx0fTtcbn1cblxuYWRkSGFuZGxlcihcblx0J3B0aHMnLFxuXHRoYXNLZXkoJ3BhdGhMaXN0JyksXG5cdChyZWFkZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGRlc2NyaXB0b3IgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKTtcblxuXHRcdHRhcmdldC5wYXRoTGlzdCA9IFtdOyAvLyBUT0RPOiByZWFkIHBhdGhzIChmaW5kIGV4YW1wbGUgd2l0aCBub24tZW1wdHkgbGlzdClcblxuXHRcdGRlc2NyaXB0b3I7XG5cdFx0Ly8gY29uc29sZS5sb2coJ3B0aHMnLCBkZXNjcmlwdG9yKTsgLy8gVE9ETzogcmVtb3ZlIHRoaXNcblx0fSxcblx0KHdyaXRlciwgX3RhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGRlc2NyaXB0b3IgPSB7XG5cdFx0XHRwYXRoTGlzdDogW10sIC8vIFRPRE86IHdyaXRlIHBhdGhzXG5cdFx0fTtcblxuXHRcdHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgJ3BhdGhzRGF0YUNsYXNzJywgZGVzY3JpcHRvcik7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQnbHl2cicsXG5cdGhhc0tleSgndmVyc2lvbicpLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHRhcmdldC52ZXJzaW9uID0gcmVhZFVpbnQzMihyZWFkZXIpLFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHdyaXRlVWludDMyKHdyaXRlciwgdGFyZ2V0LnZlcnNpb24hKSxcbik7XG5cbmZ1bmN0aW9uIGFkanVzdG1lbnRUeXBlKHR5cGU6IHN0cmluZykge1xuXHRyZXR1cm4gKHRhcmdldDogTGF5ZXJBZGRpdGlvbmFsSW5mbykgPT4gISF0YXJnZXQuYWRqdXN0bWVudCAmJiB0YXJnZXQuYWRqdXN0bWVudC50eXBlID09PSB0eXBlO1xufVxuXG5hZGRIYW5kbGVyKFxuXHQnYnJpdCcsXG5cdGFkanVzdG1lbnRUeXBlKCdicmlnaHRuZXNzL2NvbnRyYXN0JyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdGlmICghdGFyZ2V0LmFkanVzdG1lbnQpIHsgLy8gaWdub3JlIGlmIGdvdCBvbmUgZnJvbSBDZ0VkIGJsb2NrXG5cdFx0XHR0YXJnZXQuYWRqdXN0bWVudCA9IHtcblx0XHRcdFx0dHlwZTogJ2JyaWdodG5lc3MvY29udHJhc3QnLFxuXHRcdFx0XHRicmlnaHRuZXNzOiByZWFkSW50MTYocmVhZGVyKSxcblx0XHRcdFx0Y29udHJhc3Q6IHJlYWRJbnQxNihyZWFkZXIpLFxuXHRcdFx0XHRtZWFuVmFsdWU6IHJlYWRJbnQxNihyZWFkZXIpLFxuXHRcdFx0XHRsYWJDb2xvck9ubHk6ICEhcmVhZFVpbnQ4KHJlYWRlciksXG5cdFx0XHRcdHVzZUxlZ2FjeTogdHJ1ZSxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgaW5mbyA9IHRhcmdldC5hZGp1c3RtZW50IGFzIEJyaWdodG5lc3NBZGp1c3RtZW50O1xuXHRcdHdyaXRlSW50MTYod3JpdGVyLCBpbmZvLmJyaWdodG5lc3MgfHwgMCk7XG5cdFx0d3JpdGVJbnQxNih3cml0ZXIsIGluZm8uY29udHJhc3QgfHwgMCk7XG5cdFx0d3JpdGVJbnQxNih3cml0ZXIsIGluZm8ubWVhblZhbHVlID8/IDEyNyk7XG5cdFx0d3JpdGVVaW50OCh3cml0ZXIsIGluZm8ubGFiQ29sb3JPbmx5ID8gMSA6IDApO1xuXHRcdHdyaXRlWmVyb3Mod3JpdGVyLCAxKTtcblx0fSxcbik7XG5cbmZ1bmN0aW9uIHJlYWRMZXZlbHNDaGFubmVsKHJlYWRlcjogUHNkUmVhZGVyKTogTGV2ZWxzQWRqdXN0bWVudENoYW5uZWwge1xuXHRjb25zdCBzaGFkb3dJbnB1dCA9IHJlYWRJbnQxNihyZWFkZXIpO1xuXHRjb25zdCBoaWdobGlnaHRJbnB1dCA9IHJlYWRJbnQxNihyZWFkZXIpO1xuXHRjb25zdCBzaGFkb3dPdXRwdXQgPSByZWFkSW50MTYocmVhZGVyKTtcblx0Y29uc3QgaGlnaGxpZ2h0T3V0cHV0ID0gcmVhZEludDE2KHJlYWRlcik7XG5cdGNvbnN0IG1pZHRvbmVJbnB1dCA9IHJlYWRJbnQxNihyZWFkZXIpIC8gMTAwO1xuXHRyZXR1cm4geyBzaGFkb3dJbnB1dCwgaGlnaGxpZ2h0SW5wdXQsIHNoYWRvd091dHB1dCwgaGlnaGxpZ2h0T3V0cHV0LCBtaWR0b25lSW5wdXQgfTtcbn1cblxuZnVuY3Rpb24gd3JpdGVMZXZlbHNDaGFubmVsKHdyaXRlcjogUHNkV3JpdGVyLCBjaGFubmVsOiBMZXZlbHNBZGp1c3RtZW50Q2hhbm5lbCkge1xuXHR3cml0ZUludDE2KHdyaXRlciwgY2hhbm5lbC5zaGFkb3dJbnB1dCk7XG5cdHdyaXRlSW50MTYod3JpdGVyLCBjaGFubmVsLmhpZ2hsaWdodElucHV0KTtcblx0d3JpdGVJbnQxNih3cml0ZXIsIGNoYW5uZWwuc2hhZG93T3V0cHV0KTtcblx0d3JpdGVJbnQxNih3cml0ZXIsIGNoYW5uZWwuaGlnaGxpZ2h0T3V0cHV0KTtcblx0d3JpdGVJbnQxNih3cml0ZXIsIE1hdGgucm91bmQoY2hhbm5lbC5taWR0b25lSW5wdXQgKiAxMDApKTtcbn1cblxuYWRkSGFuZGxlcihcblx0J2xldmwnLFxuXHRhZGp1c3RtZW50VHlwZSgnbGV2ZWxzJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdGlmIChyZWFkVWludDE2KHJlYWRlcikgIT09IDIpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBsZXZsIHZlcnNpb24nKTtcblxuXHRcdHRhcmdldC5hZGp1c3RtZW50ID0ge1xuXHRcdFx0Li4udGFyZ2V0LmFkanVzdG1lbnQgYXMgUHJlc2V0SW5mbyxcblx0XHRcdHR5cGU6ICdsZXZlbHMnLFxuXHRcdFx0cmdiOiByZWFkTGV2ZWxzQ2hhbm5lbChyZWFkZXIpLFxuXHRcdFx0cmVkOiByZWFkTGV2ZWxzQ2hhbm5lbChyZWFkZXIpLFxuXHRcdFx0Z3JlZW46IHJlYWRMZXZlbHNDaGFubmVsKHJlYWRlciksXG5cdFx0XHRibHVlOiByZWFkTGV2ZWxzQ2hhbm5lbChyZWFkZXIpLFxuXHRcdH07XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBpbmZvID0gdGFyZ2V0LmFkanVzdG1lbnQgYXMgTGV2ZWxzQWRqdXN0bWVudDtcblx0XHRjb25zdCBkZWZhdWx0Q2hhbm5lbCA9IHtcblx0XHRcdHNoYWRvd0lucHV0OiAwLFxuXHRcdFx0aGlnaGxpZ2h0SW5wdXQ6IDI1NSxcblx0XHRcdHNoYWRvd091dHB1dDogMCxcblx0XHRcdGhpZ2hsaWdodE91dHB1dDogMjU1LFxuXHRcdFx0bWlkdG9uZUlucHV0OiAxLFxuXHRcdH07XG5cblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIDIpOyAvLyB2ZXJzaW9uXG5cdFx0d3JpdGVMZXZlbHNDaGFubmVsKHdyaXRlciwgaW5mby5yZ2IgfHwgZGVmYXVsdENoYW5uZWwpO1xuXHRcdHdyaXRlTGV2ZWxzQ2hhbm5lbCh3cml0ZXIsIGluZm8ucmVkIHx8IGRlZmF1bHRDaGFubmVsKTtcblx0XHR3cml0ZUxldmVsc0NoYW5uZWwod3JpdGVyLCBpbmZvLmJsdWUgfHwgZGVmYXVsdENoYW5uZWwpO1xuXHRcdHdyaXRlTGV2ZWxzQ2hhbm5lbCh3cml0ZXIsIGluZm8uZ3JlZW4gfHwgZGVmYXVsdENoYW5uZWwpO1xuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgNTk7IGkrKykgd3JpdGVMZXZlbHNDaGFubmVsKHdyaXRlciwgZGVmYXVsdENoYW5uZWwpO1xuXHR9LFxuKTtcblxuZnVuY3Rpb24gcmVhZEN1cnZlQ2hhbm5lbChyZWFkZXI6IFBzZFJlYWRlcikge1xuXHRjb25zdCBub2RlcyA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0Y29uc3QgY2hhbm5lbDogQ3VydmVzQWRqdXN0bWVudENoYW5uZWwgPSBbXTtcblxuXHRmb3IgKGxldCBqID0gMDsgaiA8IG5vZGVzOyBqKyspIHtcblx0XHRjb25zdCBvdXRwdXQgPSByZWFkSW50MTYocmVhZGVyKTtcblx0XHRjb25zdCBpbnB1dCA9IHJlYWRJbnQxNihyZWFkZXIpO1xuXHRcdGNoYW5uZWwucHVzaCh7IGlucHV0LCBvdXRwdXQgfSk7XG5cdH1cblxuXHRyZXR1cm4gY2hhbm5lbDtcbn1cblxuZnVuY3Rpb24gd3JpdGVDdXJ2ZUNoYW5uZWwod3JpdGVyOiBQc2RXcml0ZXIsIGNoYW5uZWw6IEN1cnZlc0FkanVzdG1lbnRDaGFubmVsKSB7XG5cdHdyaXRlVWludDE2KHdyaXRlciwgY2hhbm5lbC5sZW5ndGgpO1xuXG5cdGZvciAoY29uc3QgbiBvZiBjaGFubmVsKSB7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBuLm91dHB1dCk7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBuLmlucHV0KTtcblx0fVxufVxuXG5hZGRIYW5kbGVyKFxuXHQnY3VydicsXG5cdGFkanVzdG1lbnRUeXBlKCdjdXJ2ZXMnKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0cmVhZFVpbnQ4KHJlYWRlcik7XG5cdFx0aWYgKHJlYWRVaW50MTYocmVhZGVyKSAhPT0gMSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGN1cnYgdmVyc2lvbicpO1xuXHRcdHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRjb25zdCBjaGFubmVscyA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRjb25zdCBpbmZvOiBDdXJ2ZXNBZGp1c3RtZW50ID0geyB0eXBlOiAnY3VydmVzJyB9O1xuXG5cdFx0aWYgKGNoYW5uZWxzICYgMSkgaW5mby5yZ2IgPSByZWFkQ3VydmVDaGFubmVsKHJlYWRlcik7XG5cdFx0aWYgKGNoYW5uZWxzICYgMikgaW5mby5yZWQgPSByZWFkQ3VydmVDaGFubmVsKHJlYWRlcik7XG5cdFx0aWYgKGNoYW5uZWxzICYgNCkgaW5mby5ncmVlbiA9IHJlYWRDdXJ2ZUNoYW5uZWwocmVhZGVyKTtcblx0XHRpZiAoY2hhbm5lbHMgJiA4KSBpbmZvLmJsdWUgPSByZWFkQ3VydmVDaGFubmVsKHJlYWRlcik7XG5cblx0XHR0YXJnZXQuYWRqdXN0bWVudCA9IHtcblx0XHRcdC4uLnRhcmdldC5hZGp1c3RtZW50IGFzIFByZXNldEluZm8sXG5cdFx0XHQuLi5pbmZvLFxuXHRcdH07XG5cblx0XHQvLyBpZ25vcmluZywgZHVwbGljYXRlIGluZm9ybWF0aW9uXG5cdFx0Ly8gY2hlY2tTaWduYXR1cmUocmVhZGVyLCAnQ3J2ICcpO1xuXG5cdFx0Ly8gY29uc3QgY1ZlcnNpb24gPSByZWFkVWludDE2KHJlYWRlcik7XG5cdFx0Ly8gcmVhZFVpbnQxNihyZWFkZXIpO1xuXHRcdC8vIGNvbnN0IGNoYW5uZWxDb3VudCA9IHJlYWRVaW50MTYocmVhZGVyKTtcblxuXHRcdC8vIGZvciAobGV0IGkgPSAwOyBpIDwgY2hhbm5lbENvdW50OyBpKyspIHtcblx0XHQvLyBcdGNvbnN0IGluZGV4ID0gcmVhZFVpbnQxNihyZWFkZXIpO1xuXHRcdC8vIFx0Y29uc3Qgbm9kZXMgPSByZWFkVWludDE2KHJlYWRlcik7XG5cblx0XHQvLyBcdGZvciAobGV0IGogPSAwOyBqIDwgbm9kZXM7IGorKykge1xuXHRcdC8vIFx0XHRjb25zdCBvdXRwdXQgPSByZWFkSW50MTYocmVhZGVyKTtcblx0XHQvLyBcdFx0Y29uc3QgaW5wdXQgPSByZWFkSW50MTYocmVhZGVyKTtcblx0XHQvLyBcdH1cblx0XHQvLyB9XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBpbmZvID0gdGFyZ2V0LmFkanVzdG1lbnQgYXMgQ3VydmVzQWRqdXN0bWVudDtcblx0XHRjb25zdCB7IHJnYiwgcmVkLCBncmVlbiwgYmx1ZSB9ID0gaW5mbztcblx0XHRsZXQgY2hhbm5lbHMgPSAwO1xuXHRcdGxldCBjaGFubmVsQ291bnQgPSAwO1xuXG5cdFx0aWYgKHJnYiAmJiByZ2IubGVuZ3RoKSB7IGNoYW5uZWxzIHw9IDE7IGNoYW5uZWxDb3VudCsrOyB9XG5cdFx0aWYgKHJlZCAmJiByZWQubGVuZ3RoKSB7IGNoYW5uZWxzIHw9IDI7IGNoYW5uZWxDb3VudCsrOyB9XG5cdFx0aWYgKGdyZWVuICYmIGdyZWVuLmxlbmd0aCkgeyBjaGFubmVscyB8PSA0OyBjaGFubmVsQ291bnQrKzsgfVxuXHRcdGlmIChibHVlICYmIGJsdWUubGVuZ3RoKSB7IGNoYW5uZWxzIHw9IDg7IGNoYW5uZWxDb3VudCsrOyB9XG5cblx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgMCk7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCAxKTsgLy8gdmVyc2lvblxuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgMCk7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBjaGFubmVscyk7XG5cblx0XHRpZiAocmdiICYmIHJnYi5sZW5ndGgpIHdyaXRlQ3VydmVDaGFubmVsKHdyaXRlciwgcmdiKTtcblx0XHRpZiAocmVkICYmIHJlZC5sZW5ndGgpIHdyaXRlQ3VydmVDaGFubmVsKHdyaXRlciwgcmVkKTtcblx0XHRpZiAoZ3JlZW4gJiYgZ3JlZW4ubGVuZ3RoKSB3cml0ZUN1cnZlQ2hhbm5lbCh3cml0ZXIsIGdyZWVuKTtcblx0XHRpZiAoYmx1ZSAmJiBibHVlLmxlbmd0aCkgd3JpdGVDdXJ2ZUNoYW5uZWwod3JpdGVyLCBibHVlKTtcblxuXHRcdHdyaXRlU2lnbmF0dXJlKHdyaXRlciwgJ0NydiAnKTtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIDQpOyAvLyB2ZXJzaW9uXG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCAwKTtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIGNoYW5uZWxDb3VudCk7XG5cblx0XHRpZiAocmdiICYmIHJnYi5sZW5ndGgpIHsgd3JpdGVVaW50MTYod3JpdGVyLCAwKTsgd3JpdGVDdXJ2ZUNoYW5uZWwod3JpdGVyLCByZ2IpOyB9XG5cdFx0aWYgKHJlZCAmJiByZWQubGVuZ3RoKSB7IHdyaXRlVWludDE2KHdyaXRlciwgMSk7IHdyaXRlQ3VydmVDaGFubmVsKHdyaXRlciwgcmVkKTsgfVxuXHRcdGlmIChncmVlbiAmJiBncmVlbi5sZW5ndGgpIHsgd3JpdGVVaW50MTYod3JpdGVyLCAyKTsgd3JpdGVDdXJ2ZUNoYW5uZWwod3JpdGVyLCBncmVlbik7IH1cblx0XHRpZiAoYmx1ZSAmJiBibHVlLmxlbmd0aCkgeyB3cml0ZVVpbnQxNih3cml0ZXIsIDMpOyB3cml0ZUN1cnZlQ2hhbm5lbCh3cml0ZXIsIGJsdWUpOyB9XG5cblx0XHR3cml0ZVplcm9zKHdyaXRlciwgMik7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQnZXhwQScsXG5cdGFkanVzdG1lbnRUeXBlKCdleHBvc3VyZScpLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRpZiAocmVhZFVpbnQxNihyZWFkZXIpICE9PSAxKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZXhwQSB2ZXJzaW9uJyk7XG5cblx0XHR0YXJnZXQuYWRqdXN0bWVudCA9IHtcblx0XHRcdC4uLnRhcmdldC5hZGp1c3RtZW50IGFzIFByZXNldEluZm8sXG5cdFx0XHR0eXBlOiAnZXhwb3N1cmUnLFxuXHRcdFx0ZXhwb3N1cmU6IHJlYWRGbG9hdDMyKHJlYWRlciksXG5cdFx0XHRvZmZzZXQ6IHJlYWRGbG9hdDMyKHJlYWRlciksXG5cdFx0XHRnYW1tYTogcmVhZEZsb2F0MzIocmVhZGVyKSxcblx0XHR9O1xuXG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgaW5mbyA9IHRhcmdldC5hZGp1c3RtZW50IGFzIEV4cG9zdXJlQWRqdXN0bWVudDtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIDEpOyAvLyB2ZXJzaW9uXG5cdFx0d3JpdGVGbG9hdDMyKHdyaXRlciwgaW5mby5leHBvc3VyZSEpO1xuXHRcdHdyaXRlRmxvYXQzMih3cml0ZXIsIGluZm8ub2Zmc2V0ISk7XG5cdFx0d3JpdGVGbG9hdDMyKHdyaXRlciwgaW5mby5nYW1tYSEpO1xuXHRcdHdyaXRlWmVyb3Mod3JpdGVyLCAyKTtcblx0fSxcbik7XG5cbmludGVyZmFjZSBWaWJyYW5jZURlc2NyaXB0b3Ige1xuXHR2aWJyYW5jZT86IG51bWJlcjtcblx0U3RydD86IG51bWJlcjtcbn1cblxuYWRkSGFuZGxlcihcblx0J3ZpYkEnLFxuXHRhZGp1c3RtZW50VHlwZSgndmlicmFuY2UnKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0Y29uc3QgZGVzYzogVmlicmFuY2VEZXNjcmlwdG9yID0gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcik7XG5cdFx0dGFyZ2V0LmFkanVzdG1lbnQgPSB7IHR5cGU6ICd2aWJyYW5jZScgfTtcblx0XHRpZiAoZGVzYy52aWJyYW5jZSAhPT0gdW5kZWZpbmVkKSB0YXJnZXQuYWRqdXN0bWVudC52aWJyYW5jZSA9IGRlc2MudmlicmFuY2U7XG5cdFx0aWYgKGRlc2MuU3RydCAhPT0gdW5kZWZpbmVkKSB0YXJnZXQuYWRqdXN0bWVudC5zYXR1cmF0aW9uID0gZGVzYy5TdHJ0O1xuXG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgaW5mbyA9IHRhcmdldC5hZGp1c3RtZW50IGFzIFZpYnJhbmNlQWRqdXN0bWVudDtcblx0XHRjb25zdCBkZXNjOiBWaWJyYW5jZURlc2NyaXB0b3IgPSB7fTtcblx0XHRpZiAoaW5mby52aWJyYW5jZSAhPT0gdW5kZWZpbmVkKSBkZXNjLnZpYnJhbmNlID0gaW5mby52aWJyYW5jZTtcblx0XHRpZiAoaW5mby5zYXR1cmF0aW9uICE9PSB1bmRlZmluZWQpIGRlc2MuU3RydCA9IGluZm8uc2F0dXJhdGlvbjtcblxuXHRcdHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgJ251bGwnLCBkZXNjKTtcblx0fSxcbik7XG5cbmZ1bmN0aW9uIHJlYWRIdWVDaGFubmVsKHJlYWRlcjogUHNkUmVhZGVyKTogSHVlU2F0dXJhdGlvbkFkanVzdG1lbnRDaGFubmVsIHtcblx0cmV0dXJuIHtcblx0XHRhOiByZWFkSW50MTYocmVhZGVyKSxcblx0XHRiOiByZWFkSW50MTYocmVhZGVyKSxcblx0XHRjOiByZWFkSW50MTYocmVhZGVyKSxcblx0XHRkOiByZWFkSW50MTYocmVhZGVyKSxcblx0XHRodWU6IHJlYWRJbnQxNihyZWFkZXIpLFxuXHRcdHNhdHVyYXRpb246IHJlYWRJbnQxNihyZWFkZXIpLFxuXHRcdGxpZ2h0bmVzczogcmVhZEludDE2KHJlYWRlciksXG5cdH07XG59XG5cbmZ1bmN0aW9uIHdyaXRlSHVlQ2hhbm5lbCh3cml0ZXI6IFBzZFdyaXRlciwgY2hhbm5lbDogSHVlU2F0dXJhdGlvbkFkanVzdG1lbnRDaGFubmVsIHwgdW5kZWZpbmVkKSB7XG5cdGNvbnN0IGMgPSBjaGFubmVsIHx8IHt9IGFzIFBhcnRpYWw8SHVlU2F0dXJhdGlvbkFkanVzdG1lbnRDaGFubmVsPjtcblx0d3JpdGVJbnQxNih3cml0ZXIsIGMuYSB8fCAwKTtcblx0d3JpdGVJbnQxNih3cml0ZXIsIGMuYiB8fCAwKTtcblx0d3JpdGVJbnQxNih3cml0ZXIsIGMuYyB8fCAwKTtcblx0d3JpdGVJbnQxNih3cml0ZXIsIGMuZCB8fCAwKTtcblx0d3JpdGVJbnQxNih3cml0ZXIsIGMuaHVlIHx8IDApO1xuXHR3cml0ZUludDE2KHdyaXRlciwgYy5zYXR1cmF0aW9uIHx8IDApO1xuXHR3cml0ZUludDE2KHdyaXRlciwgYy5saWdodG5lc3MgfHwgMCk7XG59XG5cbmFkZEhhbmRsZXIoXG5cdCdodWUyJyxcblx0YWRqdXN0bWVudFR5cGUoJ2h1ZS9zYXR1cmF0aW9uJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdGlmIChyZWFkVWludDE2KHJlYWRlcikgIT09IDIpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBodWUyIHZlcnNpb24nKTtcblxuXHRcdHRhcmdldC5hZGp1c3RtZW50ID0ge1xuXHRcdFx0Li4udGFyZ2V0LmFkanVzdG1lbnQgYXMgUHJlc2V0SW5mbyxcblx0XHRcdHR5cGU6ICdodWUvc2F0dXJhdGlvbicsXG5cdFx0XHRtYXN0ZXI6IHJlYWRIdWVDaGFubmVsKHJlYWRlciksXG5cdFx0XHRyZWRzOiByZWFkSHVlQ2hhbm5lbChyZWFkZXIpLFxuXHRcdFx0eWVsbG93czogcmVhZEh1ZUNoYW5uZWwocmVhZGVyKSxcblx0XHRcdGdyZWVuczogcmVhZEh1ZUNoYW5uZWwocmVhZGVyKSxcblx0XHRcdGN5YW5zOiByZWFkSHVlQ2hhbm5lbChyZWFkZXIpLFxuXHRcdFx0Ymx1ZXM6IHJlYWRIdWVDaGFubmVsKHJlYWRlciksXG5cdFx0XHRtYWdlbnRhczogcmVhZEh1ZUNoYW5uZWwocmVhZGVyKSxcblx0XHR9O1xuXG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgaW5mbyA9IHRhcmdldC5hZGp1c3RtZW50IGFzIEh1ZVNhdHVyYXRpb25BZGp1c3RtZW50O1xuXG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCAyKTsgLy8gdmVyc2lvblxuXHRcdHdyaXRlSHVlQ2hhbm5lbCh3cml0ZXIsIGluZm8ubWFzdGVyKTtcblx0XHR3cml0ZUh1ZUNoYW5uZWwod3JpdGVyLCBpbmZvLnJlZHMpO1xuXHRcdHdyaXRlSHVlQ2hhbm5lbCh3cml0ZXIsIGluZm8ueWVsbG93cyk7XG5cdFx0d3JpdGVIdWVDaGFubmVsKHdyaXRlciwgaW5mby5ncmVlbnMpO1xuXHRcdHdyaXRlSHVlQ2hhbm5lbCh3cml0ZXIsIGluZm8uY3lhbnMpO1xuXHRcdHdyaXRlSHVlQ2hhbm5lbCh3cml0ZXIsIGluZm8uYmx1ZXMpO1xuXHRcdHdyaXRlSHVlQ2hhbm5lbCh3cml0ZXIsIGluZm8ubWFnZW50YXMpO1xuXHR9LFxuKTtcblxuZnVuY3Rpb24gcmVhZENvbG9yQmFsYW5jZShyZWFkZXI6IFBzZFJlYWRlcik6IENvbG9yQmFsYW5jZVZhbHVlcyB7XG5cdHJldHVybiB7XG5cdFx0Y3lhblJlZDogcmVhZEludDE2KHJlYWRlciksXG5cdFx0bWFnZW50YUdyZWVuOiByZWFkSW50MTYocmVhZGVyKSxcblx0XHR5ZWxsb3dCbHVlOiByZWFkSW50MTYocmVhZGVyKSxcblx0fTtcbn1cblxuZnVuY3Rpb24gd3JpdGVDb2xvckJhbGFuY2Uod3JpdGVyOiBQc2RXcml0ZXIsIHZhbHVlOiBQYXJ0aWFsPENvbG9yQmFsYW5jZVZhbHVlcz4pIHtcblx0d3JpdGVJbnQxNih3cml0ZXIsIHZhbHVlLmN5YW5SZWQgfHwgMCk7XG5cdHdyaXRlSW50MTYod3JpdGVyLCB2YWx1ZS5tYWdlbnRhR3JlZW4gfHwgMCk7XG5cdHdyaXRlSW50MTYod3JpdGVyLCB2YWx1ZS55ZWxsb3dCbHVlIHx8IDApO1xufVxuXG5hZGRIYW5kbGVyKFxuXHQnYmxuYycsXG5cdGFkanVzdG1lbnRUeXBlKCdjb2xvciBiYWxhbmNlJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdHRhcmdldC5hZGp1c3RtZW50ID0ge1xuXHRcdFx0dHlwZTogJ2NvbG9yIGJhbGFuY2UnLFxuXHRcdFx0c2hhZG93czogcmVhZENvbG9yQmFsYW5jZShyZWFkZXIpLFxuXHRcdFx0bWlkdG9uZXM6IHJlYWRDb2xvckJhbGFuY2UocmVhZGVyKSxcblx0XHRcdGhpZ2hsaWdodHM6IHJlYWRDb2xvckJhbGFuY2UocmVhZGVyKSxcblx0XHRcdHByZXNlcnZlTHVtaW5vc2l0eTogISFyZWFkVWludDgocmVhZGVyKSxcblx0XHR9O1xuXG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgaW5mbyA9IHRhcmdldC5hZGp1c3RtZW50IGFzIENvbG9yQmFsYW5jZUFkanVzdG1lbnQ7XG5cdFx0d3JpdGVDb2xvckJhbGFuY2Uod3JpdGVyLCBpbmZvLnNoYWRvd3MgfHwge30pO1xuXHRcdHdyaXRlQ29sb3JCYWxhbmNlKHdyaXRlciwgaW5mby5taWR0b25lcyB8fCB7fSk7XG5cdFx0d3JpdGVDb2xvckJhbGFuY2Uod3JpdGVyLCBpbmZvLmhpZ2hsaWdodHMgfHwge30pO1xuXHRcdHdyaXRlVWludDgod3JpdGVyLCBpbmZvLnByZXNlcnZlTHVtaW5vc2l0eSA/IDEgOiAwKTtcblx0XHR3cml0ZVplcm9zKHdyaXRlciwgMSk7XG5cdH0sXG4pO1xuXG5pbnRlcmZhY2UgQmxhY2tBbmRXaGl0ZURlc2NyaXB0b3Ige1xuXHQnUmQgICc6IG51bWJlcjtcblx0WWxsdzogbnVtYmVyO1xuXHQnR3JuICc6IG51bWJlcjtcblx0J0N5biAnOiBudW1iZXI7XG5cdCdCbCAgJzogbnVtYmVyO1xuXHRNZ250OiBudW1iZXI7XG5cdHVzZVRpbnQ6IGJvb2xlYW47XG5cdHRpbnRDb2xvcj86IERlc2NyaXB0b3JDb2xvcjtcblx0YndQcmVzZXRLaW5kOiBudW1iZXI7XG5cdGJsYWNrQW5kV2hpdGVQcmVzZXRGaWxlTmFtZTogc3RyaW5nO1xufVxuXG5hZGRIYW5kbGVyKFxuXHQnYmx3aCcsXG5cdGFkanVzdG1lbnRUeXBlKCdibGFjayAmIHdoaXRlJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdGNvbnN0IGRlc2M6IEJsYWNrQW5kV2hpdGVEZXNjcmlwdG9yID0gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcik7XG5cdFx0dGFyZ2V0LmFkanVzdG1lbnQgPSB7XG5cdFx0XHR0eXBlOiAnYmxhY2sgJiB3aGl0ZScsXG5cdFx0XHRyZWRzOiBkZXNjWydSZCAgJ10sXG5cdFx0XHR5ZWxsb3dzOiBkZXNjLllsbHcsXG5cdFx0XHRncmVlbnM6IGRlc2NbJ0dybiAnXSxcblx0XHRcdGN5YW5zOiBkZXNjWydDeW4gJ10sXG5cdFx0XHRibHVlczogZGVzY1snQmwgICddLFxuXHRcdFx0bWFnZW50YXM6IGRlc2MuTWdudCxcblx0XHRcdHVzZVRpbnQ6ICEhZGVzYy51c2VUaW50LFxuXHRcdFx0cHJlc2V0S2luZDogZGVzYy5id1ByZXNldEtpbmQsXG5cdFx0XHRwcmVzZXRGaWxlTmFtZTogZGVzYy5ibGFja0FuZFdoaXRlUHJlc2V0RmlsZU5hbWUsXG5cdFx0fTtcblxuXHRcdGlmIChkZXNjLnRpbnRDb2xvciAhPT0gdW5kZWZpbmVkKSB0YXJnZXQuYWRqdXN0bWVudC50aW50Q29sb3IgPSBwYXJzZUNvbG9yKGRlc2MudGludENvbG9yKTtcblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGluZm8gPSB0YXJnZXQuYWRqdXN0bWVudCBhcyBCbGFja0FuZFdoaXRlQWRqdXN0bWVudDtcblx0XHRjb25zdCBkZXNjOiBCbGFja0FuZFdoaXRlRGVzY3JpcHRvciA9IHtcblx0XHRcdCdSZCAgJzogaW5mby5yZWRzIHx8IDAsXG5cdFx0XHRZbGx3OiBpbmZvLnllbGxvd3MgfHwgMCxcblx0XHRcdCdHcm4gJzogaW5mby5ncmVlbnMgfHwgMCxcblx0XHRcdCdDeW4gJzogaW5mby5jeWFucyB8fCAwLFxuXHRcdFx0J0JsICAnOiBpbmZvLmJsdWVzIHx8IDAsXG5cdFx0XHRNZ250OiBpbmZvLm1hZ2VudGFzIHx8IDAsXG5cdFx0XHR1c2VUaW50OiAhIWluZm8udXNlVGludCxcblx0XHRcdHRpbnRDb2xvcjogc2VyaWFsaXplQ29sb3IoaW5mby50aW50Q29sb3IpLFxuXHRcdFx0YndQcmVzZXRLaW5kOiBpbmZvLnByZXNldEtpbmQgfHwgMCxcblx0XHRcdGJsYWNrQW5kV2hpdGVQcmVzZXRGaWxlTmFtZTogaW5mby5wcmVzZXRGaWxlTmFtZSB8fCAnJyxcblx0XHR9O1xuXG5cdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnbnVsbCcsIGRlc2MpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J3BoZmwnLFxuXHRhZGp1c3RtZW50VHlwZSgncGhvdG8gZmlsdGVyJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdGNvbnN0IHZlcnNpb24gPSByZWFkVWludDE2KHJlYWRlcik7XG5cdFx0aWYgKHZlcnNpb24gIT09IDIgJiYgdmVyc2lvbiAhPT0gMykgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHBoZmwgdmVyc2lvbicpO1xuXG5cdFx0bGV0IGNvbG9yOiBDb2xvcjtcblxuXHRcdGlmICh2ZXJzaW9uID09PSAyKSB7XG5cdFx0XHRjb2xvciA9IHJlYWRDb2xvcihyZWFkZXIpO1xuXHRcdH0gZWxzZSB7IC8vIHZlcnNpb24gM1xuXHRcdFx0Ly8gVE9ETzogdGVzdCB0aGlzLCB0aGlzIGlzIHByb2JhYmx5IHdyb25nXG5cdFx0XHRjb2xvciA9IHtcblx0XHRcdFx0bDogcmVhZEludDMyKHJlYWRlcikgLyAxMDAsXG5cdFx0XHRcdGE6IHJlYWRJbnQzMihyZWFkZXIpIC8gMTAwLFxuXHRcdFx0XHRiOiByZWFkSW50MzIocmVhZGVyKSAvIDEwMCxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0dGFyZ2V0LmFkanVzdG1lbnQgPSB7XG5cdFx0XHR0eXBlOiAncGhvdG8gZmlsdGVyJyxcblx0XHRcdGNvbG9yLFxuXHRcdFx0ZGVuc2l0eTogcmVhZFVpbnQzMihyZWFkZXIpIC8gMTAwLFxuXHRcdFx0cHJlc2VydmVMdW1pbm9zaXR5OiAhIXJlYWRVaW50OChyZWFkZXIpLFxuXHRcdH07XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBpbmZvID0gdGFyZ2V0LmFkanVzdG1lbnQgYXMgUGhvdG9GaWx0ZXJBZGp1c3RtZW50O1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgMik7IC8vIHZlcnNpb25cblx0XHR3cml0ZUNvbG9yKHdyaXRlciwgaW5mby5jb2xvciB8fCB7IGw6IDAsIGE6IDAsIGI6IDAgfSk7XG5cdFx0d3JpdGVVaW50MzIod3JpdGVyLCAoaW5mby5kZW5zaXR5IHx8IDApICogMTAwKTtcblx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgaW5mby5wcmVzZXJ2ZUx1bWlub3NpdHkgPyAxIDogMCk7XG5cdFx0d3JpdGVaZXJvcyh3cml0ZXIsIDMpO1xuXHR9LFxuKTtcblxuZnVuY3Rpb24gcmVhZE1peHJDaGFubmVsKHJlYWRlcjogUHNkUmVhZGVyKTogQ2hhbm5lbE1peGVyQ2hhbm5lbCB7XG5cdGNvbnN0IHJlZCA9IHJlYWRJbnQxNihyZWFkZXIpO1xuXHRjb25zdCBncmVlbiA9IHJlYWRJbnQxNihyZWFkZXIpO1xuXHRjb25zdCBibHVlID0gcmVhZEludDE2KHJlYWRlcik7XG5cdHNraXBCeXRlcyhyZWFkZXIsIDIpO1xuXHRjb25zdCBjb25zdGFudCA9IHJlYWRJbnQxNihyZWFkZXIpO1xuXHRyZXR1cm4geyByZWQsIGdyZWVuLCBibHVlLCBjb25zdGFudCB9O1xufVxuXG5mdW5jdGlvbiB3cml0ZU1peHJDaGFubmVsKHdyaXRlcjogUHNkV3JpdGVyLCBjaGFubmVsOiBDaGFubmVsTWl4ZXJDaGFubmVsIHwgdW5kZWZpbmVkKSB7XG5cdGNvbnN0IGMgPSBjaGFubmVsIHx8IHt9IGFzIFBhcnRpYWw8Q2hhbm5lbE1peGVyQ2hhbm5lbD47XG5cdHdyaXRlSW50MTYod3JpdGVyLCBjLnJlZCEpO1xuXHR3cml0ZUludDE2KHdyaXRlciwgYy5ncmVlbiEpO1xuXHR3cml0ZUludDE2KHdyaXRlciwgYy5ibHVlISk7XG5cdHdyaXRlWmVyb3Mod3JpdGVyLCAyKTtcblx0d3JpdGVJbnQxNih3cml0ZXIsIGMuY29uc3RhbnQhKTtcbn1cblxuYWRkSGFuZGxlcihcblx0J21peHInLFxuXHRhZGp1c3RtZW50VHlwZSgnY2hhbm5lbCBtaXhlcicpLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRpZiAocmVhZFVpbnQxNihyZWFkZXIpICE9PSAxKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgbWl4ciB2ZXJzaW9uJyk7XG5cblx0XHRjb25zdCBhZGp1c3RtZW50OiBDaGFubmVsTWl4ZXJBZGp1c3RtZW50ID0gdGFyZ2V0LmFkanVzdG1lbnQgPSB7XG5cdFx0XHQuLi50YXJnZXQuYWRqdXN0bWVudCBhcyBQcmVzZXRJbmZvLFxuXHRcdFx0dHlwZTogJ2NoYW5uZWwgbWl4ZXInLFxuXHRcdFx0bW9ub2Nocm9tZTogISFyZWFkVWludDE2KHJlYWRlciksXG5cdFx0fTtcblxuXHRcdGlmICghYWRqdXN0bWVudC5tb25vY2hyb21lKSB7XG5cdFx0XHRhZGp1c3RtZW50LnJlZCA9IHJlYWRNaXhyQ2hhbm5lbChyZWFkZXIpO1xuXHRcdFx0YWRqdXN0bWVudC5ncmVlbiA9IHJlYWRNaXhyQ2hhbm5lbChyZWFkZXIpO1xuXHRcdFx0YWRqdXN0bWVudC5ibHVlID0gcmVhZE1peHJDaGFubmVsKHJlYWRlcik7XG5cdFx0fVxuXG5cdFx0YWRqdXN0bWVudC5ncmF5ID0gcmVhZE1peHJDaGFubmVsKHJlYWRlcik7XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBpbmZvID0gdGFyZ2V0LmFkanVzdG1lbnQgYXMgQ2hhbm5lbE1peGVyQWRqdXN0bWVudDtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIDEpOyAvLyB2ZXJzaW9uXG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBpbmZvLm1vbm9jaHJvbWUgPyAxIDogMCk7XG5cblx0XHRpZiAoaW5mby5tb25vY2hyb21lKSB7XG5cdFx0XHR3cml0ZU1peHJDaGFubmVsKHdyaXRlciwgaW5mby5ncmF5KTtcblx0XHRcdHdyaXRlWmVyb3Mod3JpdGVyLCAzICogNSAqIDIpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR3cml0ZU1peHJDaGFubmVsKHdyaXRlciwgaW5mby5yZWQpO1xuXHRcdFx0d3JpdGVNaXhyQ2hhbm5lbCh3cml0ZXIsIGluZm8uZ3JlZW4pO1xuXHRcdFx0d3JpdGVNaXhyQ2hhbm5lbCh3cml0ZXIsIGluZm8uYmx1ZSk7XG5cdFx0XHR3cml0ZU1peHJDaGFubmVsKHdyaXRlciwgaW5mby5ncmF5KTtcblx0XHR9XG5cdH0sXG4pO1xuXG5jb25zdCBjb2xvckxvb2t1cFR5cGUgPSBjcmVhdGVFbnVtPCczZGx1dCcgfCAnYWJzdHJhY3RQcm9maWxlJyB8ICdkZXZpY2VMaW5rUHJvZmlsZSc+KCdjb2xvckxvb2t1cFR5cGUnLCAnM0RMVVQnLCB7XG5cdCczZGx1dCc6ICczRExVVCcsXG5cdGFic3RyYWN0UHJvZmlsZTogJ2Fic3RyYWN0UHJvZmlsZScsXG5cdGRldmljZUxpbmtQcm9maWxlOiAnZGV2aWNlTGlua1Byb2ZpbGUnLFxufSk7XG5cbmNvbnN0IExVVEZvcm1hdFR5cGUgPSBjcmVhdGVFbnVtPCdsb29rJyB8ICdjdWJlJyB8ICczZGwnPignTFVURm9ybWF0VHlwZScsICdsb29rJywge1xuXHRsb29rOiAnTFVURm9ybWF0TE9PSycsXG5cdGN1YmU6ICdMVVRGb3JtYXRDVUJFJyxcblx0JzNkbCc6ICdMVVRGb3JtYXQzREwnLFxufSk7XG5cbmNvbnN0IGNvbG9yTG9va3VwT3JkZXIgPSBjcmVhdGVFbnVtPCdyZ2InIHwgJ2Jncic+KCdjb2xvckxvb2t1cE9yZGVyJywgJ3JnYicsIHtcblx0cmdiOiAncmdiT3JkZXInLFxuXHRiZ3I6ICdiZ3JPcmRlcicsXG59KTtcblxuaW50ZXJmYWNlIENvbG9yTG9va3VwRGVzY3JpcHRvciB7XG5cdGxvb2t1cFR5cGU/OiBzdHJpbmc7XG5cdCdObSAgJz86IHN0cmluZztcblx0RHRocj86IGJvb2xlYW47XG5cdHByb2ZpbGU/OiBVaW50OEFycmF5O1xuXHRMVVRGb3JtYXQ/OiBzdHJpbmc7XG5cdGRhdGFPcmRlcj86IHN0cmluZztcblx0dGFibGVPcmRlcj86IHN0cmluZztcblx0TFVUM0RGaWxlRGF0YT86IFVpbnQ4QXJyYXk7XG5cdExVVDNERmlsZU5hbWU/OiBzdHJpbmc7XG59XG5cbmFkZEhhbmRsZXIoXG5cdCdjbHJMJyxcblx0YWRqdXN0bWVudFR5cGUoJ2NvbG9yIGxvb2t1cCcpLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRpZiAocmVhZFVpbnQxNihyZWFkZXIpICE9PSAxKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY2xyTCB2ZXJzaW9uJyk7XG5cblx0XHRjb25zdCBkZXNjOiBDb2xvckxvb2t1cERlc2NyaXB0b3IgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKTtcblx0XHR0YXJnZXQuYWRqdXN0bWVudCA9IHsgdHlwZTogJ2NvbG9yIGxvb2t1cCcgfTtcblx0XHRjb25zdCBpbmZvID0gdGFyZ2V0LmFkanVzdG1lbnQ7XG5cblx0XHRpZiAoZGVzYy5sb29rdXBUeXBlICE9PSB1bmRlZmluZWQpIGluZm8ubG9va3VwVHlwZSA9IGNvbG9yTG9va3VwVHlwZS5kZWNvZGUoZGVzYy5sb29rdXBUeXBlKTtcblx0XHRpZiAoZGVzY1snTm0gICddICE9PSB1bmRlZmluZWQpIGluZm8ubmFtZSA9IGRlc2NbJ05tICAnXTtcblx0XHRpZiAoZGVzYy5EdGhyICE9PSB1bmRlZmluZWQpIGluZm8uZGl0aGVyID0gZGVzYy5EdGhyO1xuXHRcdGlmIChkZXNjLnByb2ZpbGUgIT09IHVuZGVmaW5lZCkgaW5mby5wcm9maWxlID0gZGVzYy5wcm9maWxlO1xuXHRcdGlmIChkZXNjLkxVVEZvcm1hdCAhPT0gdW5kZWZpbmVkKSBpbmZvLmx1dEZvcm1hdCA9IExVVEZvcm1hdFR5cGUuZGVjb2RlKGRlc2MuTFVURm9ybWF0KTtcblx0XHRpZiAoZGVzYy5kYXRhT3JkZXIgIT09IHVuZGVmaW5lZCkgaW5mby5kYXRhT3JkZXIgPSBjb2xvckxvb2t1cE9yZGVyLmRlY29kZShkZXNjLmRhdGFPcmRlcik7XG5cdFx0aWYgKGRlc2MudGFibGVPcmRlciAhPT0gdW5kZWZpbmVkKSBpbmZvLnRhYmxlT3JkZXIgPSBjb2xvckxvb2t1cE9yZGVyLmRlY29kZShkZXNjLnRhYmxlT3JkZXIpO1xuXHRcdGlmIChkZXNjLkxVVDNERmlsZURhdGEgIT09IHVuZGVmaW5lZCkgaW5mby5sdXQzREZpbGVEYXRhID0gZGVzYy5MVVQzREZpbGVEYXRhO1xuXHRcdGlmIChkZXNjLkxVVDNERmlsZU5hbWUgIT09IHVuZGVmaW5lZCkgaW5mby5sdXQzREZpbGVOYW1lID0gZGVzYy5MVVQzREZpbGVOYW1lO1xuXG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgaW5mbyA9IHRhcmdldC5hZGp1c3RtZW50IGFzIENvbG9yTG9va3VwQWRqdXN0bWVudDtcblx0XHRjb25zdCBkZXNjOiBDb2xvckxvb2t1cERlc2NyaXB0b3IgPSB7fTtcblxuXHRcdGlmIChpbmZvLmxvb2t1cFR5cGUgIT09IHVuZGVmaW5lZCkgZGVzYy5sb29rdXBUeXBlID0gY29sb3JMb29rdXBUeXBlLmVuY29kZShpbmZvLmxvb2t1cFR5cGUpO1xuXHRcdGlmIChpbmZvLm5hbWUgIT09IHVuZGVmaW5lZCkgZGVzY1snTm0gICddID0gaW5mby5uYW1lO1xuXHRcdGlmIChpbmZvLmRpdGhlciAhPT0gdW5kZWZpbmVkKSBkZXNjLkR0aHIgPSBpbmZvLmRpdGhlcjtcblx0XHRpZiAoaW5mby5wcm9maWxlICE9PSB1bmRlZmluZWQpIGRlc2MucHJvZmlsZSA9IGluZm8ucHJvZmlsZTtcblx0XHRpZiAoaW5mby5sdXRGb3JtYXQgIT09IHVuZGVmaW5lZCkgZGVzYy5MVVRGb3JtYXQgPSBMVVRGb3JtYXRUeXBlLmVuY29kZShpbmZvLmx1dEZvcm1hdCk7XG5cdFx0aWYgKGluZm8uZGF0YU9yZGVyICE9PSB1bmRlZmluZWQpIGRlc2MuZGF0YU9yZGVyID0gY29sb3JMb29rdXBPcmRlci5lbmNvZGUoaW5mby5kYXRhT3JkZXIpO1xuXHRcdGlmIChpbmZvLnRhYmxlT3JkZXIgIT09IHVuZGVmaW5lZCkgZGVzYy50YWJsZU9yZGVyID0gY29sb3JMb29rdXBPcmRlci5lbmNvZGUoaW5mby50YWJsZU9yZGVyKTtcblx0XHRpZiAoaW5mby5sdXQzREZpbGVEYXRhICE9PSB1bmRlZmluZWQpIGRlc2MuTFVUM0RGaWxlRGF0YSA9IGluZm8ubHV0M0RGaWxlRGF0YTtcblx0XHRpZiAoaW5mby5sdXQzREZpbGVOYW1lICE9PSB1bmRlZmluZWQpIGRlc2MuTFVUM0RGaWxlTmFtZSA9IGluZm8ubHV0M0RGaWxlTmFtZTtcblxuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgMSk7IC8vIHZlcnNpb25cblx0XHR3cml0ZVZlcnNpb25BbmREZXNjcmlwdG9yKHdyaXRlciwgJycsICdudWxsJywgZGVzYyk7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQnbnZydCcsXG5cdGFkanVzdG1lbnRUeXBlKCdpbnZlcnQnKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0dGFyZ2V0LmFkanVzdG1lbnQgPSB7IHR5cGU6ICdpbnZlcnQnIH07XG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KCkgPT4ge1xuXHRcdC8vIG5vdGhpbmcgdG8gd3JpdGUgaGVyZVxuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J3Bvc3QnLFxuXHRhZGp1c3RtZW50VHlwZSgncG9zdGVyaXplJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdHRhcmdldC5hZGp1c3RtZW50ID0ge1xuXHRcdFx0dHlwZTogJ3Bvc3Rlcml6ZScsXG5cdFx0XHRsZXZlbHM6IHJlYWRVaW50MTYocmVhZGVyKSxcblx0XHR9O1xuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGluZm8gPSB0YXJnZXQuYWRqdXN0bWVudCBhcyBQb3N0ZXJpemVBZGp1c3RtZW50O1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgaW5mby5sZXZlbHMgPz8gNCk7XG5cdFx0d3JpdGVaZXJvcyh3cml0ZXIsIDIpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J3RocnMnLFxuXHRhZGp1c3RtZW50VHlwZSgndGhyZXNob2xkJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdHRhcmdldC5hZGp1c3RtZW50ID0ge1xuXHRcdFx0dHlwZTogJ3RocmVzaG9sZCcsXG5cdFx0XHRsZXZlbDogcmVhZFVpbnQxNihyZWFkZXIpLFxuXHRcdH07XG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgaW5mbyA9IHRhcmdldC5hZGp1c3RtZW50IGFzIFRocmVzaG9sZEFkanVzdG1lbnQ7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBpbmZvLmxldmVsID8/IDEyOCk7XG5cdFx0d3JpdGVaZXJvcyh3cml0ZXIsIDIpO1xuXHR9LFxuKTtcblxuY29uc3QgZ3JkbUNvbG9yTW9kZWxzID0gWycnLCAnJywgJycsICdyZ2InLCAnaHNiJywgJycsICdsYWInXTtcblxuYWRkSGFuZGxlcihcblx0J2dyZG0nLFxuXHRhZGp1c3RtZW50VHlwZSgnZ3JhZGllbnQgbWFwJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdGlmIChyZWFkVWludDE2KHJlYWRlcikgIT09IDEpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBncmRtIHZlcnNpb24nKTtcblxuXHRcdGNvbnN0IGluZm86IEdyYWRpZW50TWFwQWRqdXN0bWVudCA9IHtcblx0XHRcdHR5cGU6ICdncmFkaWVudCBtYXAnLFxuXHRcdFx0Z3JhZGllbnRUeXBlOiAnc29saWQnLFxuXHRcdH07XG5cblx0XHRpbmZvLnJldmVyc2UgPSAhIXJlYWRVaW50OChyZWFkZXIpO1xuXHRcdGluZm8uZGl0aGVyID0gISFyZWFkVWludDgocmVhZGVyKTtcblx0XHRpbmZvLm5hbWUgPSByZWFkVW5pY29kZVN0cmluZyhyZWFkZXIpO1xuXHRcdGluZm8uY29sb3JTdG9wcyA9IFtdO1xuXHRcdGluZm8ub3BhY2l0eVN0b3BzID0gW107XG5cblx0XHRjb25zdCBzdG9wc0NvdW50ID0gcmVhZFVpbnQxNihyZWFkZXIpO1xuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBzdG9wc0NvdW50OyBpKyspIHtcblx0XHRcdGluZm8uY29sb3JTdG9wcy5wdXNoKHtcblx0XHRcdFx0bG9jYXRpb246IHJlYWRVaW50MzIocmVhZGVyKSxcblx0XHRcdFx0bWlkcG9pbnQ6IHJlYWRVaW50MzIocmVhZGVyKSAvIDEwMCxcblx0XHRcdFx0Y29sb3I6IHJlYWRDb2xvcihyZWFkZXIpLFxuXHRcdFx0fSk7XG5cdFx0XHRza2lwQnl0ZXMocmVhZGVyLCAyKTtcblx0XHR9XG5cblx0XHRjb25zdCBvcGFjaXR5U3RvcHNDb3VudCA9IHJlYWRVaW50MTYocmVhZGVyKTtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgb3BhY2l0eVN0b3BzQ291bnQ7IGkrKykge1xuXHRcdFx0aW5mby5vcGFjaXR5U3RvcHMucHVzaCh7XG5cdFx0XHRcdGxvY2F0aW9uOiByZWFkVWludDMyKHJlYWRlciksXG5cdFx0XHRcdG1pZHBvaW50OiByZWFkVWludDMyKHJlYWRlcikgLyAxMDAsXG5cdFx0XHRcdG9wYWNpdHk6IHJlYWRVaW50MTYocmVhZGVyKSAvIDB4ZmYsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRjb25zdCBleHBhbnNpb25Db3VudCA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRpZiAoZXhwYW5zaW9uQ291bnQgIT09IDIpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBncmRtIGV4cGFuc2lvbiBjb3VudCcpO1xuXG5cdFx0Y29uc3QgaW50ZXJwb2xhdGlvbiA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRpbmZvLnNtb290aG5lc3MgPSBpbnRlcnBvbGF0aW9uIC8gNDA5NjtcblxuXHRcdGNvbnN0IGxlbmd0aCA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRpZiAobGVuZ3RoICE9PSAzMikgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGdyZG0gbGVuZ3RoJyk7XG5cblx0XHRpbmZvLmdyYWRpZW50VHlwZSA9IHJlYWRVaW50MTYocmVhZGVyKSA/ICdub2lzZScgOiAnc29saWQnO1xuXHRcdGluZm8ucmFuZG9tU2VlZCA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHRpbmZvLmFkZFRyYW5zcGFyZW5jeSA9ICEhcmVhZFVpbnQxNihyZWFkZXIpO1xuXHRcdGluZm8ucmVzdHJpY3RDb2xvcnMgPSAhIXJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRpbmZvLnJvdWdobmVzcyA9IHJlYWRVaW50MzIocmVhZGVyKSAvIDQwOTY7XG5cdFx0aW5mby5jb2xvck1vZGVsID0gKGdyZG1Db2xvck1vZGVsc1tyZWFkVWludDE2KHJlYWRlcildIHx8ICdyZ2InKSBhcyAncmdiJyB8ICdoc2InIHwgJ2xhYic7XG5cblx0XHRpbmZvLm1pbiA9IFtcblx0XHRcdHJlYWRVaW50MTYocmVhZGVyKSAvIDB4ODAwMCxcblx0XHRcdHJlYWRVaW50MTYocmVhZGVyKSAvIDB4ODAwMCxcblx0XHRcdHJlYWRVaW50MTYocmVhZGVyKSAvIDB4ODAwMCxcblx0XHRcdHJlYWRVaW50MTYocmVhZGVyKSAvIDB4ODAwMCxcblx0XHRdO1xuXG5cdFx0aW5mby5tYXggPSBbXG5cdFx0XHRyZWFkVWludDE2KHJlYWRlcikgLyAweDgwMDAsXG5cdFx0XHRyZWFkVWludDE2KHJlYWRlcikgLyAweDgwMDAsXG5cdFx0XHRyZWFkVWludDE2KHJlYWRlcikgLyAweDgwMDAsXG5cdFx0XHRyZWFkVWludDE2KHJlYWRlcikgLyAweDgwMDAsXG5cdFx0XTtcblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cblx0XHRmb3IgKGNvbnN0IHMgb2YgaW5mby5jb2xvclN0b3BzKSBzLmxvY2F0aW9uIC89IGludGVycG9sYXRpb247XG5cdFx0Zm9yIChjb25zdCBzIG9mIGluZm8ub3BhY2l0eVN0b3BzKSBzLmxvY2F0aW9uIC89IGludGVycG9sYXRpb247XG5cblx0XHR0YXJnZXQuYWRqdXN0bWVudCA9IGluZm87XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGluZm8gPSB0YXJnZXQuYWRqdXN0bWVudCBhcyBHcmFkaWVudE1hcEFkanVzdG1lbnQ7XG5cblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIDEpOyAvLyB2ZXJzaW9uXG5cdFx0d3JpdGVVaW50OCh3cml0ZXIsIGluZm8ucmV2ZXJzZSA/IDEgOiAwKTtcblx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgaW5mby5kaXRoZXIgPyAxIDogMCk7XG5cdFx0d3JpdGVVbmljb2RlU3RyaW5nV2l0aFBhZGRpbmcod3JpdGVyLCBpbmZvLm5hbWUgfHwgJycpO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgaW5mby5jb2xvclN0b3BzICYmIGluZm8uY29sb3JTdG9wcy5sZW5ndGggfHwgMCk7XG5cblx0XHRjb25zdCBpbnRlcnBvbGF0aW9uID0gTWF0aC5yb3VuZCgoaW5mby5zbW9vdGhuZXNzID8/IDEpICogNDA5Nik7XG5cblx0XHRmb3IgKGNvbnN0IHMgb2YgaW5mby5jb2xvclN0b3BzIHx8IFtdKSB7XG5cdFx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIE1hdGgucm91bmQocy5sb2NhdGlvbiAqIGludGVycG9sYXRpb24pKTtcblx0XHRcdHdyaXRlVWludDMyKHdyaXRlciwgTWF0aC5yb3VuZChzLm1pZHBvaW50ICogMTAwKSk7XG5cdFx0XHR3cml0ZUNvbG9yKHdyaXRlciwgcy5jb2xvcik7XG5cdFx0XHR3cml0ZVplcm9zKHdyaXRlciwgMik7XG5cdFx0fVxuXG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBpbmZvLm9wYWNpdHlTdG9wcyAmJiBpbmZvLm9wYWNpdHlTdG9wcy5sZW5ndGggfHwgMCk7XG5cblx0XHRmb3IgKGNvbnN0IHMgb2YgaW5mby5vcGFjaXR5U3RvcHMgfHwgW10pIHtcblx0XHRcdHdyaXRlVWludDMyKHdyaXRlciwgTWF0aC5yb3VuZChzLmxvY2F0aW9uICogaW50ZXJwb2xhdGlvbikpO1xuXHRcdFx0d3JpdGVVaW50MzIod3JpdGVyLCBNYXRoLnJvdW5kKHMubWlkcG9pbnQgKiAxMDApKTtcblx0XHRcdHdyaXRlVWludDE2KHdyaXRlciwgTWF0aC5yb3VuZChzLm9wYWNpdHkgKiAweGZmKSk7XG5cdFx0fVxuXG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCAyKTsgLy8gZXhwYW5zaW9uIGNvdW50XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBpbnRlcnBvbGF0aW9uKTtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIDMyKTsgLy8gbGVuZ3RoXG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBpbmZvLmdyYWRpZW50VHlwZSA9PT0gJ25vaXNlJyA/IDEgOiAwKTtcblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIGluZm8ucmFuZG9tU2VlZCB8fCAwKTtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIGluZm8uYWRkVHJhbnNwYXJlbmN5ID8gMSA6IDApO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgaW5mby5yZXN0cmljdENvbG9ycyA/IDEgOiAwKTtcblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIE1hdGgucm91bmQoKGluZm8ucm91Z2huZXNzID8/IDEpICogNDA5NikpO1xuXHRcdGNvbnN0IGNvbG9yTW9kZWwgPSBncmRtQ29sb3JNb2RlbHMuaW5kZXhPZihpbmZvLmNvbG9yTW9kZWwgPz8gJ3JnYicpO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgY29sb3JNb2RlbCA9PT0gLTEgPyAzIDogY29sb3JNb2RlbCk7XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IDQ7IGkrKylcblx0XHRcdHdyaXRlVWludDE2KHdyaXRlciwgTWF0aC5yb3VuZCgoaW5mby5taW4gJiYgaW5mby5taW5baV0gfHwgMCkgKiAweDgwMDApKTtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgNDsgaSsrKVxuXHRcdFx0d3JpdGVVaW50MTYod3JpdGVyLCBNYXRoLnJvdW5kKChpbmZvLm1heCAmJiBpbmZvLm1heFtpXSB8fCAwKSAqIDB4ODAwMCkpO1xuXG5cdFx0d3JpdGVaZXJvcyh3cml0ZXIsIDQpO1xuXHR9LFxuKTtcblxuZnVuY3Rpb24gcmVhZFNlbGVjdGl2ZUNvbG9ycyhyZWFkZXI6IFBzZFJlYWRlcik6IENNWUsge1xuXHRyZXR1cm4ge1xuXHRcdGM6IHJlYWRJbnQxNihyZWFkZXIpLFxuXHRcdG06IHJlYWRJbnQxNihyZWFkZXIpLFxuXHRcdHk6IHJlYWRJbnQxNihyZWFkZXIpLFxuXHRcdGs6IHJlYWRJbnQxNihyZWFkZXIpLFxuXHR9O1xufVxuXG5mdW5jdGlvbiB3cml0ZVNlbGVjdGl2ZUNvbG9ycyh3cml0ZXI6IFBzZFdyaXRlciwgY215azogQ01ZSyB8IHVuZGVmaW5lZCkge1xuXHRjb25zdCBjID0gY215ayB8fCB7fSBhcyBQYXJ0aWFsPENNWUs+O1xuXHR3cml0ZUludDE2KHdyaXRlciwgYy5jISk7XG5cdHdyaXRlSW50MTYod3JpdGVyLCBjLm0hKTtcblx0d3JpdGVJbnQxNih3cml0ZXIsIGMueSEpO1xuXHR3cml0ZUludDE2KHdyaXRlciwgYy5rISk7XG59XG5cbmFkZEhhbmRsZXIoXG5cdCdzZWxjJyxcblx0YWRqdXN0bWVudFR5cGUoJ3NlbGVjdGl2ZSBjb2xvcicpLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHtcblx0XHRpZiAocmVhZFVpbnQxNihyZWFkZXIpICE9PSAxKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc2VsYyB2ZXJzaW9uJyk7XG5cblx0XHRjb25zdCBtb2RlID0gcmVhZFVpbnQxNihyZWFkZXIpID8gJ2Fic29sdXRlJyA6ICdyZWxhdGl2ZSc7XG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgOCk7XG5cblx0XHR0YXJnZXQuYWRqdXN0bWVudCA9IHtcblx0XHRcdHR5cGU6ICdzZWxlY3RpdmUgY29sb3InLFxuXHRcdFx0bW9kZSxcblx0XHRcdHJlZHM6IHJlYWRTZWxlY3RpdmVDb2xvcnMocmVhZGVyKSxcblx0XHRcdHllbGxvd3M6IHJlYWRTZWxlY3RpdmVDb2xvcnMocmVhZGVyKSxcblx0XHRcdGdyZWVuczogcmVhZFNlbGVjdGl2ZUNvbG9ycyhyZWFkZXIpLFxuXHRcdFx0Y3lhbnM6IHJlYWRTZWxlY3RpdmVDb2xvcnMocmVhZGVyKSxcblx0XHRcdGJsdWVzOiByZWFkU2VsZWN0aXZlQ29sb3JzKHJlYWRlciksXG5cdFx0XHRtYWdlbnRhczogcmVhZFNlbGVjdGl2ZUNvbG9ycyhyZWFkZXIpLFxuXHRcdFx0d2hpdGVzOiByZWFkU2VsZWN0aXZlQ29sb3JzKHJlYWRlciksXG5cdFx0XHRuZXV0cmFsczogcmVhZFNlbGVjdGl2ZUNvbG9ycyhyZWFkZXIpLFxuXHRcdFx0YmxhY2tzOiByZWFkU2VsZWN0aXZlQ29sb3JzKHJlYWRlciksXG5cdFx0fTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgaW5mbyA9IHRhcmdldC5hZGp1c3RtZW50IGFzIFNlbGVjdGl2ZUNvbG9yQWRqdXN0bWVudDtcblxuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgMSk7IC8vIHZlcnNpb25cblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIGluZm8ubW9kZSA9PT0gJ2Fic29sdXRlJyA/IDEgOiAwKTtcblx0XHR3cml0ZVplcm9zKHdyaXRlciwgOCk7XG5cdFx0d3JpdGVTZWxlY3RpdmVDb2xvcnMod3JpdGVyLCBpbmZvLnJlZHMpO1xuXHRcdHdyaXRlU2VsZWN0aXZlQ29sb3JzKHdyaXRlciwgaW5mby55ZWxsb3dzKTtcblx0XHR3cml0ZVNlbGVjdGl2ZUNvbG9ycyh3cml0ZXIsIGluZm8uZ3JlZW5zKTtcblx0XHR3cml0ZVNlbGVjdGl2ZUNvbG9ycyh3cml0ZXIsIGluZm8uY3lhbnMpO1xuXHRcdHdyaXRlU2VsZWN0aXZlQ29sb3JzKHdyaXRlciwgaW5mby5ibHVlcyk7XG5cdFx0d3JpdGVTZWxlY3RpdmVDb2xvcnMod3JpdGVyLCBpbmZvLm1hZ2VudGFzKTtcblx0XHR3cml0ZVNlbGVjdGl2ZUNvbG9ycyh3cml0ZXIsIGluZm8ud2hpdGVzKTtcblx0XHR3cml0ZVNlbGVjdGl2ZUNvbG9ycyh3cml0ZXIsIGluZm8ubmV1dHJhbHMpO1xuXHRcdHdyaXRlU2VsZWN0aXZlQ29sb3JzKHdyaXRlciwgaW5mby5ibGFja3MpO1xuXHR9LFxuKTtcblxuaW50ZXJmYWNlIEJyaWdodG5lc3NDb250cmFzdERlc2NyaXB0b3Ige1xuXHRWcnNuOiBudW1iZXI7XG5cdEJyZ2g6IG51bWJlcjtcblx0Q250cjogbnVtYmVyO1xuXHRtZWFuczogbnVtYmVyO1xuXHQnTGFiICc6IGJvb2xlYW47XG5cdHVzZUxlZ2FjeTogYm9vbGVhbjtcblx0QXV0bzogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIFByZXNldERlc2NyaXB0b3Ige1xuXHRWcnNuOiBudW1iZXI7XG5cdHByZXNldEtpbmQ6IG51bWJlcjtcblx0cHJlc2V0RmlsZU5hbWU6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIEN1cnZlc1ByZXNldERlc2NyaXB0b3Ige1xuXHRWcnNuOiBudW1iZXI7XG5cdGN1cnZlc1ByZXNldEtpbmQ6IG51bWJlcjtcblx0Y3VydmVzUHJlc2V0RmlsZU5hbWU6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIE1peGVyUHJlc2V0RGVzY3JpcHRvciB7XG5cdFZyc246IG51bWJlcjtcblx0bWl4ZXJQcmVzZXRLaW5kOiBudW1iZXI7XG5cdG1peGVyUHJlc2V0RmlsZU5hbWU6IHN0cmluZztcbn1cblxuYWRkSGFuZGxlcihcblx0J0NnRWQnLFxuXHR0YXJnZXQgPT4ge1xuXHRcdGNvbnN0IGEgPSB0YXJnZXQuYWRqdXN0bWVudDtcblxuXHRcdGlmICghYSkgcmV0dXJuIGZhbHNlO1xuXG5cdFx0cmV0dXJuIChhLnR5cGUgPT09ICdicmlnaHRuZXNzL2NvbnRyYXN0JyAmJiAhYS51c2VMZWdhY3kpIHx8XG5cdFx0XHQoKGEudHlwZSA9PT0gJ2xldmVscycgfHwgYS50eXBlID09PSAnY3VydmVzJyB8fCBhLnR5cGUgPT09ICdleHBvc3VyZScgfHwgYS50eXBlID09PSAnY2hhbm5lbCBtaXhlcicgfHxcblx0XHRcdFx0YS50eXBlID09PSAnaHVlL3NhdHVyYXRpb24nKSAmJiBhLnByZXNldEZpbGVOYW1lICE9PSB1bmRlZmluZWQpO1xuXHR9LFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRjb25zdCBkZXNjID0gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcikgYXNcblx0XHRcdEJyaWdodG5lc3NDb250cmFzdERlc2NyaXB0b3IgfCBQcmVzZXREZXNjcmlwdG9yIHwgQ3VydmVzUHJlc2V0RGVzY3JpcHRvciB8IE1peGVyUHJlc2V0RGVzY3JpcHRvcjtcblx0XHRpZiAoZGVzYy5WcnNuICE9PSAxKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgQ2dFZCB2ZXJzaW9uJyk7XG5cblx0XHQvLyB0aGlzIHNlY3Rpb24gY2FuIHNwZWNpZnkgcHJlc2V0IGZpbGUgbmFtZSBmb3Igb3RoZXIgYWRqdXN0bWVudCB0eXBlc1xuXHRcdGlmICgncHJlc2V0RmlsZU5hbWUnIGluIGRlc2MpIHtcblx0XHRcdHRhcmdldC5hZGp1c3RtZW50ID0ge1xuXHRcdFx0XHQuLi50YXJnZXQuYWRqdXN0bWVudCBhcyBMZXZlbHNBZGp1c3RtZW50IHwgRXhwb3N1cmVBZGp1c3RtZW50IHwgSHVlU2F0dXJhdGlvbkFkanVzdG1lbnQsXG5cdFx0XHRcdHByZXNldEtpbmQ6IGRlc2MucHJlc2V0S2luZCxcblx0XHRcdFx0cHJlc2V0RmlsZU5hbWU6IGRlc2MucHJlc2V0RmlsZU5hbWUsXG5cdFx0XHR9O1xuXHRcdH0gZWxzZSBpZiAoJ2N1cnZlc1ByZXNldEZpbGVOYW1lJyBpbiBkZXNjKSB7XG5cdFx0XHR0YXJnZXQuYWRqdXN0bWVudCA9IHtcblx0XHRcdFx0Li4udGFyZ2V0LmFkanVzdG1lbnQgYXMgQ3VydmVzQWRqdXN0bWVudCxcblx0XHRcdFx0cHJlc2V0S2luZDogZGVzYy5jdXJ2ZXNQcmVzZXRLaW5kLFxuXHRcdFx0XHRwcmVzZXRGaWxlTmFtZTogZGVzYy5jdXJ2ZXNQcmVzZXRGaWxlTmFtZSxcblx0XHRcdH07XG5cdFx0fSBlbHNlIGlmICgnbWl4ZXJQcmVzZXRGaWxlTmFtZScgaW4gZGVzYykge1xuXHRcdFx0dGFyZ2V0LmFkanVzdG1lbnQgPSB7XG5cdFx0XHRcdC4uLnRhcmdldC5hZGp1c3RtZW50IGFzIEN1cnZlc0FkanVzdG1lbnQsXG5cdFx0XHRcdHByZXNldEtpbmQ6IGRlc2MubWl4ZXJQcmVzZXRLaW5kLFxuXHRcdFx0XHRwcmVzZXRGaWxlTmFtZTogZGVzYy5taXhlclByZXNldEZpbGVOYW1lLFxuXHRcdFx0fTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGFyZ2V0LmFkanVzdG1lbnQgPSB7XG5cdFx0XHRcdHR5cGU6ICdicmlnaHRuZXNzL2NvbnRyYXN0Jyxcblx0XHRcdFx0YnJpZ2h0bmVzczogZGVzYy5CcmdoLFxuXHRcdFx0XHRjb250cmFzdDogZGVzYy5DbnRyLFxuXHRcdFx0XHRtZWFuVmFsdWU6IGRlc2MubWVhbnMsXG5cdFx0XHRcdHVzZUxlZ2FjeTogISFkZXNjLnVzZUxlZ2FjeSxcblx0XHRcdFx0bGFiQ29sb3JPbmx5OiAhIWRlc2NbJ0xhYiAnXSxcblx0XHRcdFx0YXV0bzogISFkZXNjLkF1dG8sXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGluZm8gPSB0YXJnZXQuYWRqdXN0bWVudCE7XG5cblx0XHRpZiAoaW5mby50eXBlID09PSAnbGV2ZWxzJyB8fCBpbmZvLnR5cGUgPT09ICdleHBvc3VyZScgfHwgaW5mby50eXBlID09PSAnaHVlL3NhdHVyYXRpb24nKSB7XG5cdFx0XHRjb25zdCBkZXNjOiBQcmVzZXREZXNjcmlwdG9yID0ge1xuXHRcdFx0XHRWcnNuOiAxLFxuXHRcdFx0XHRwcmVzZXRLaW5kOiBpbmZvLnByZXNldEtpbmQgPz8gMSxcblx0XHRcdFx0cHJlc2V0RmlsZU5hbWU6IGluZm8ucHJlc2V0RmlsZU5hbWUgfHwgJycsXG5cdFx0XHR9O1xuXHRcdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnbnVsbCcsIGRlc2MpO1xuXHRcdH0gZWxzZSBpZiAoaW5mby50eXBlID09PSAnY3VydmVzJykge1xuXHRcdFx0Y29uc3QgZGVzYzogQ3VydmVzUHJlc2V0RGVzY3JpcHRvciA9IHtcblx0XHRcdFx0VnJzbjogMSxcblx0XHRcdFx0Y3VydmVzUHJlc2V0S2luZDogaW5mby5wcmVzZXRLaW5kID8/IDEsXG5cdFx0XHRcdGN1cnZlc1ByZXNldEZpbGVOYW1lOiBpbmZvLnByZXNldEZpbGVOYW1lIHx8ICcnLFxuXHRcdFx0fTtcblx0XHRcdHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgJ251bGwnLCBkZXNjKTtcblx0XHR9IGVsc2UgaWYgKGluZm8udHlwZSA9PT0gJ2NoYW5uZWwgbWl4ZXInKSB7XG5cdFx0XHRjb25zdCBkZXNjOiBNaXhlclByZXNldERlc2NyaXB0b3IgPSB7XG5cdFx0XHRcdFZyc246IDEsXG5cdFx0XHRcdG1peGVyUHJlc2V0S2luZDogaW5mby5wcmVzZXRLaW5kID8/IDEsXG5cdFx0XHRcdG1peGVyUHJlc2V0RmlsZU5hbWU6IGluZm8ucHJlc2V0RmlsZU5hbWUgfHwgJycsXG5cdFx0XHR9O1xuXHRcdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnbnVsbCcsIGRlc2MpO1xuXHRcdH0gZWxzZSBpZiAoaW5mby50eXBlID09PSAnYnJpZ2h0bmVzcy9jb250cmFzdCcpIHtcblx0XHRcdGNvbnN0IGRlc2M6IEJyaWdodG5lc3NDb250cmFzdERlc2NyaXB0b3IgPSB7XG5cdFx0XHRcdFZyc246IDEsXG5cdFx0XHRcdEJyZ2g6IGluZm8uYnJpZ2h0bmVzcyB8fCAwLFxuXHRcdFx0XHRDbnRyOiBpbmZvLmNvbnRyYXN0IHx8IDAsXG5cdFx0XHRcdG1lYW5zOiBpbmZvLm1lYW5WYWx1ZSA/PyAxMjcsXG5cdFx0XHRcdCdMYWIgJzogISFpbmZvLmxhYkNvbG9yT25seSxcblx0XHRcdFx0dXNlTGVnYWN5OiAhIWluZm8udXNlTGVnYWN5LFxuXHRcdFx0XHRBdXRvOiAhIWluZm8uYXV0byxcblx0XHRcdH07XG5cdFx0XHR3cml0ZVZlcnNpb25BbmREZXNjcmlwdG9yKHdyaXRlciwgJycsICdudWxsJywgZGVzYyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignVW5oYW5kbGVkIENnRWQgY2FzZScpO1xuXHRcdH1cblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdCdUeHQyJyxcblx0aGFzS2V5KCdlbmdpbmVEYXRhJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdGNvbnN0IGRhdGEgPSByZWFkQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHRcdHRhcmdldC5lbmdpbmVEYXRhID0gZnJvbUJ5dGVBcnJheShkYXRhKTtcblx0XHQvLyBjb25zdCBlbmdpbmVEYXRhID0gcGFyc2VFbmdpbmVEYXRhKGRhdGEpO1xuXHRcdC8vIGNvbnNvbGUubG9nKHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KGVuZ2luZURhdGEsIGZhbHNlLCA5OSwgdHJ1ZSkpO1xuXHRcdC8vIHJlcXVpcmUoJ2ZzJykud3JpdGVGaWxlU3luYygncmVzb3VyY2VzL2VuZ2luZURhdGEyU2ltcGxlLnR4dCcsIHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KGVuZ2luZURhdGEsIGZhbHNlLCA5OSwgZmFsc2UpLCAndXRmOCcpO1xuXHRcdC8vIHJlcXVpcmUoJ2ZzJykud3JpdGVGaWxlU3luYygndGVzdF9kYXRhLmpzb24nLCBKU09OLnN0cmluZ2lmeShlZCwgbnVsbCwgMiksICd1dGY4Jyk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGJ1ZmZlciA9IHRvQnl0ZUFycmF5KHRhcmdldC5lbmdpbmVEYXRhISk7XG5cdFx0d3JpdGVCeXRlcyh3cml0ZXIsIGJ1ZmZlcik7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQnRk1zaycsXG5cdGhhc0tleSgnZmlsdGVyTWFzaycpLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHtcblx0XHR0YXJnZXQuZmlsdGVyTWFzayA9IHtcblx0XHRcdGNvbG9yU3BhY2U6IHJlYWRDb2xvcihyZWFkZXIpLFxuXHRcdFx0b3BhY2l0eTogcmVhZFVpbnQxNihyZWFkZXIpIC8gMHhmZixcblx0XHR9O1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHR3cml0ZUNvbG9yKHdyaXRlciwgdGFyZ2V0LmZpbHRlck1hc2shLmNvbG9yU3BhY2UpO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgY2xhbXAodGFyZ2V0LmZpbHRlck1hc2shLm9wYWNpdHkgPz8gMSwgMCwgMSkgKiAweGZmKTtcblx0fSxcbik7XG5cbmludGVyZmFjZSBBcnRkRGVzY3JpcHRvciB7XG5cdCdDbnQgJzogbnVtYmVyO1xuXHRhdXRvRXhwYW5kT2Zmc2V0OiB7IEhyem46IG51bWJlcjsgVnJ0YzogbnVtYmVyOyB9O1xuXHRvcmlnaW46IHsgSHJ6bjogbnVtYmVyOyBWcnRjOiBudW1iZXI7IH07XG5cdGF1dG9FeHBhbmRFbmFibGVkOiBib29sZWFuO1xuXHRhdXRvTmVzdEVuYWJsZWQ6IGJvb2xlYW47XG5cdGF1dG9Qb3NpdGlvbkVuYWJsZWQ6IGJvb2xlYW47XG5cdHNocmlua3dyYXBPblNhdmVFbmFibGVkOiBib29sZWFuO1xuXHRkb2NEZWZhdWx0TmV3QXJ0Ym9hcmRCYWNrZ3JvdW5kQ29sb3I6IERlc2NyaXB0b3JDb2xvcjtcblx0ZG9jRGVmYXVsdE5ld0FydGJvYXJkQmFja2dyb3VuZFR5cGU6IG51bWJlcjtcbn1cblxuYWRkSGFuZGxlcihcblx0J2FydGQnLCAvLyBkb2N1bWVudC13aWRlIGFydGJvYXJkIGluZm9cblx0dGFyZ2V0ID0+ICh0YXJnZXQgYXMgUHNkKS5hcnRib2FyZHMgIT09IHVuZGVmaW5lZCxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0Y29uc3QgZGVzYyA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpIGFzIEFydGREZXNjcmlwdG9yO1xuXHRcdCh0YXJnZXQgYXMgUHNkKS5hcnRib2FyZHMgPSB7XG5cdFx0XHRjb3VudDogZGVzY1snQ250ICddLFxuXHRcdFx0YXV0b0V4cGFuZE9mZnNldDogeyBob3Jpem9udGFsOiBkZXNjLmF1dG9FeHBhbmRPZmZzZXQuSHJ6biwgdmVydGljYWw6IGRlc2MuYXV0b0V4cGFuZE9mZnNldC5WcnRjIH0sXG5cdFx0XHRvcmlnaW46IHsgaG9yaXpvbnRhbDogZGVzYy5vcmlnaW4uSHJ6biwgdmVydGljYWw6IGRlc2Mub3JpZ2luLlZydGMgfSxcblx0XHRcdGF1dG9FeHBhbmRFbmFibGVkOiBkZXNjLmF1dG9FeHBhbmRFbmFibGVkLFxuXHRcdFx0YXV0b05lc3RFbmFibGVkOiBkZXNjLmF1dG9OZXN0RW5hYmxlZCxcblx0XHRcdGF1dG9Qb3NpdGlvbkVuYWJsZWQ6IGRlc2MuYXV0b1Bvc2l0aW9uRW5hYmxlZCxcblx0XHRcdHNocmlua3dyYXBPblNhdmVFbmFibGVkOiBkZXNjLnNocmlua3dyYXBPblNhdmVFbmFibGVkLFxuXHRcdFx0ZG9jRGVmYXVsdE5ld0FydGJvYXJkQmFja2dyb3VuZENvbG9yOiBwYXJzZUNvbG9yKGRlc2MuZG9jRGVmYXVsdE5ld0FydGJvYXJkQmFja2dyb3VuZENvbG9yKSxcblx0XHRcdGRvY0RlZmF1bHROZXdBcnRib2FyZEJhY2tncm91bmRUeXBlOiBkZXNjLmRvY0RlZmF1bHROZXdBcnRib2FyZEJhY2tncm91bmRUeXBlLFxuXHRcdH07XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBhcnRiID0gKHRhcmdldCBhcyBQc2QpLmFydGJvYXJkcyE7XG5cdFx0Y29uc3QgZGVzYzogQXJ0ZERlc2NyaXB0b3IgPSB7XG5cdFx0XHQnQ250ICc6IGFydGIuY291bnQsXG5cdFx0XHRhdXRvRXhwYW5kT2Zmc2V0OiBhcnRiLmF1dG9FeHBhbmRPZmZzZXQgPyB7IEhyem46IGFydGIuYXV0b0V4cGFuZE9mZnNldC5ob3Jpem9udGFsLCBWcnRjOiBhcnRiLmF1dG9FeHBhbmRPZmZzZXQudmVydGljYWwgfSA6IHsgSHJ6bjogMCwgVnJ0YzogMCB9LFxuXHRcdFx0b3JpZ2luOiBhcnRiLm9yaWdpbiA/IHsgSHJ6bjogYXJ0Yi5vcmlnaW4uaG9yaXpvbnRhbCwgVnJ0YzogYXJ0Yi5vcmlnaW4udmVydGljYWwgfSA6IHsgSHJ6bjogMCwgVnJ0YzogMCB9LFxuXHRcdFx0YXV0b0V4cGFuZEVuYWJsZWQ6IGFydGIuYXV0b0V4cGFuZEVuYWJsZWQgPz8gdHJ1ZSxcblx0XHRcdGF1dG9OZXN0RW5hYmxlZDogYXJ0Yi5hdXRvTmVzdEVuYWJsZWQgPz8gdHJ1ZSxcblx0XHRcdGF1dG9Qb3NpdGlvbkVuYWJsZWQ6IGFydGIuYXV0b1Bvc2l0aW9uRW5hYmxlZCA/PyB0cnVlLFxuXHRcdFx0c2hyaW5rd3JhcE9uU2F2ZUVuYWJsZWQ6IGFydGIuc2hyaW5rd3JhcE9uU2F2ZUVuYWJsZWQgPz8gdHJ1ZSxcblx0XHRcdGRvY0RlZmF1bHROZXdBcnRib2FyZEJhY2tncm91bmRDb2xvcjogc2VyaWFsaXplQ29sb3IoYXJ0Yi5kb2NEZWZhdWx0TmV3QXJ0Ym9hcmRCYWNrZ3JvdW5kQ29sb3IpLFxuXHRcdFx0ZG9jRGVmYXVsdE5ld0FydGJvYXJkQmFja2dyb3VuZFR5cGU6IGFydGIuZG9jRGVmYXVsdE5ld0FydGJvYXJkQmFja2dyb3VuZFR5cGUgPz8gMSxcblx0XHR9O1xuXHRcdHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgJ251bGwnLCBkZXNjLCAnYXJ0ZCcpO1xuXHR9LFxuKTtcblxuaW50ZXJmYWNlIEVmZmVjdERlc2NyaXB0b3IgZXh0ZW5kcyBQYXJ0aWFsPERlc2NyaXB0b3JHcmFkaWVudENvbnRlbnQ+LCBQYXJ0aWFsPERlc2NyaXB0b3JQYXR0ZXJuQ29udGVudD4ge1xuXHRlbmFiPzogYm9vbGVhbjtcblx0U3R5bDogc3RyaW5nO1xuXHRQbnRUPzogc3RyaW5nO1xuXHQnTWQgICc/OiBzdHJpbmc7XG5cdE9wY3Q/OiBEZXNjcmlwdG9yVW5pdHNWYWx1ZTtcblx0J1N6ICAnPzogRGVzY3JpcHRvclVuaXRzVmFsdWU7XG5cdCdDbHIgJz86IERlc2NyaXB0b3JDb2xvcjtcblx0cHJlc2VudD86IGJvb2xlYW47XG5cdHNob3dJbkRpYWxvZz86IGJvb2xlYW47XG5cdG92ZXJwcmludD86IGJvb2xlYW47XG59XG5cbmludGVyZmFjZSBMZngyRGVzY3JpcHRvciB7XG5cdCdTY2wgJz86IERlc2NyaXB0b3JVbml0c1ZhbHVlO1xuXHRtYXN0ZXJGWFN3aXRjaD86IGJvb2xlYW47XG5cdERyU2g/OiBFZmZlY3REZXNjcmlwdG9yO1xuXHRJclNoPzogRWZmZWN0RGVzY3JpcHRvcjtcblx0T3JHbD86IEVmZmVjdERlc2NyaXB0b3I7XG5cdElyR2w/OiBFZmZlY3REZXNjcmlwdG9yO1xuXHRlYmJsPzogRWZmZWN0RGVzY3JpcHRvcjtcblx0U29GaT86IEVmZmVjdERlc2NyaXB0b3I7XG5cdHBhdHRlcm5GaWxsPzogRWZmZWN0RGVzY3JpcHRvcjtcblx0R3JGbD86IEVmZmVjdERlc2NyaXB0b3I7XG5cdENoRlg/OiBFZmZlY3REZXNjcmlwdG9yO1xuXHRGckZYPzogRWZmZWN0RGVzY3JpcHRvcjtcbn1cblxuaW50ZXJmYWNlIExtZnhEZXNjcmlwdG9yIHtcblx0J1NjbCAnPzogRGVzY3JpcHRvclVuaXRzVmFsdWU7XG5cdG1hc3RlckZYU3dpdGNoPzogYm9vbGVhbjtcblx0bnVtTW9kaWZ5aW5nRlg/OiBudW1iZXI7XG5cdE9yR2w/OiBFZmZlY3REZXNjcmlwdG9yO1xuXHRJckdsPzogRWZmZWN0RGVzY3JpcHRvcjtcblx0ZWJibD86IEVmZmVjdERlc2NyaXB0b3I7XG5cdENoRlg/OiBFZmZlY3REZXNjcmlwdG9yO1xuXHRkcm9wU2hhZG93TXVsdGk/OiBFZmZlY3REZXNjcmlwdG9yW107XG5cdGlubmVyU2hhZG93TXVsdGk/OiBFZmZlY3REZXNjcmlwdG9yW107XG5cdHNvbGlkRmlsbE11bHRpPzogRWZmZWN0RGVzY3JpcHRvcltdO1xuXHRncmFkaWVudEZpbGxNdWx0aT86IEVmZmVjdERlc2NyaXB0b3JbXTtcblx0ZnJhbWVGWE11bHRpPzogRWZmZWN0RGVzY3JpcHRvcltdO1xuXHRwYXR0ZXJuRmlsbD86IEVmZmVjdERlc2NyaXB0b3I7IC8vID8/P1xufVxuXG5mdW5jdGlvbiBwYXJzZUZ4T2JqZWN0KGZ4OiBFZmZlY3REZXNjcmlwdG9yKSB7XG5cdGNvbnN0IHN0cm9rZTogTGF5ZXJFZmZlY3RTdHJva2UgPSB7XG5cdFx0ZW5hYmxlZDogISFmeC5lbmFiLFxuXHRcdHBvc2l0aW9uOiBGU3RsLmRlY29kZShmeC5TdHlsKSxcblx0XHRmaWxsVHlwZTogRnJGbC5kZWNvZGUoZnguUG50VCEpLFxuXHRcdGJsZW5kTW9kZTogQmxuTS5kZWNvZGUoZnhbJ01kICAnXSEpLFxuXHRcdG9wYWNpdHk6IHBhcnNlUGVyY2VudChmeC5PcGN0KSxcblx0XHRzaXplOiBwYXJzZVVuaXRzKGZ4WydTeiAgJ10hKSxcblx0fTtcblxuXHRpZiAoZngucHJlc2VudCAhPT0gdW5kZWZpbmVkKSBzdHJva2UucHJlc2VudCA9IGZ4LnByZXNlbnQ7XG5cdGlmIChmeC5zaG93SW5EaWFsb2cgIT09IHVuZGVmaW5lZCkgc3Ryb2tlLnNob3dJbkRpYWxvZyA9IGZ4LnNob3dJbkRpYWxvZztcblx0aWYgKGZ4Lm92ZXJwcmludCAhPT0gdW5kZWZpbmVkKSBzdHJva2Uub3ZlcnByaW50ID0gZngub3ZlcnByaW50O1xuXHRpZiAoZnhbJ0NsciAnXSkgc3Ryb2tlLmNvbG9yID0gcGFyc2VDb2xvcihmeFsnQ2xyICddKTtcblx0aWYgKGZ4LkdyYWQpIHN0cm9rZS5ncmFkaWVudCA9IHBhcnNlR3JhZGllbnRDb250ZW50KGZ4IGFzIGFueSk7XG5cdGlmIChmeC5QdHJuKSBzdHJva2UucGF0dGVybiA9IHBhcnNlUGF0dGVybkNvbnRlbnQoZnggYXMgYW55KTtcblxuXHRyZXR1cm4gc3Ryb2tlO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVGeE9iamVjdChzdHJva2U6IExheWVyRWZmZWN0U3Ryb2tlKSB7XG5cdGxldCBGckZYOiBFZmZlY3REZXNjcmlwdG9yID0ge30gYXMgYW55O1xuXHRGckZYLmVuYWIgPSAhIXN0cm9rZS5lbmFibGVkO1xuXHRpZiAoc3Ryb2tlLnByZXNlbnQgIT09IHVuZGVmaW5lZCkgRnJGWC5wcmVzZW50ID0gISFzdHJva2UucHJlc2VudDtcblx0aWYgKHN0cm9rZS5zaG93SW5EaWFsb2cgIT09IHVuZGVmaW5lZCkgRnJGWC5zaG93SW5EaWFsb2cgPSAhIXN0cm9rZS5zaG93SW5EaWFsb2c7XG5cdEZyRlguU3R5bCA9IEZTdGwuZW5jb2RlKHN0cm9rZS5wb3NpdGlvbik7XG5cdEZyRlguUG50VCA9IEZyRmwuZW5jb2RlKHN0cm9rZS5maWxsVHlwZSk7XG5cdEZyRlhbJ01kICAnXSA9IEJsbk0uZW5jb2RlKHN0cm9rZS5ibGVuZE1vZGUpO1xuXHRGckZYLk9wY3QgPSB1bml0c1BlcmNlbnQoc3Ryb2tlLm9wYWNpdHkpO1xuXHRGckZYWydTeiAgJ10gPSB1bml0c1ZhbHVlKHN0cm9rZS5zaXplLCAnc2l6ZScpO1xuXHRpZiAoc3Ryb2tlLmNvbG9yKSBGckZYWydDbHIgJ10gPSBzZXJpYWxpemVDb2xvcihzdHJva2UuY29sb3IpO1xuXHRpZiAoc3Ryb2tlLmdyYWRpZW50KSBGckZYID0geyAuLi5GckZYLCAuLi5zZXJpYWxpemVHcmFkaWVudENvbnRlbnQoc3Ryb2tlLmdyYWRpZW50KSB9O1xuXHRpZiAoc3Ryb2tlLnBhdHRlcm4pIEZyRlggPSB7IC4uLkZyRlgsIC4uLnNlcmlhbGl6ZVBhdHRlcm5Db250ZW50KHN0cm9rZS5wYXR0ZXJuKSB9O1xuXHRpZiAoc3Ryb2tlLm92ZXJwcmludCAhPT0gdW5kZWZpbmVkKSBGckZYLm92ZXJwcmludCA9ICEhc3Ryb2tlLm92ZXJwcmludDtcblx0cmV0dXJuIEZyRlg7XG59XG5cbmZ1bmN0aW9uIHBhcnNlRWZmZWN0cyhpbmZvOiBMZngyRGVzY3JpcHRvciAmIExtZnhEZXNjcmlwdG9yLCBsb2c6IGJvb2xlYW4pIHtcblx0Y29uc3QgZWZmZWN0czogTGF5ZXJFZmZlY3RzSW5mbyA9IHt9O1xuXHRpZiAoIWluZm8ubWFzdGVyRlhTd2l0Y2gpIGVmZmVjdHMuZGlzYWJsZWQgPSB0cnVlO1xuXHRpZiAoaW5mb1snU2NsICddKSBlZmZlY3RzLnNjYWxlID0gcGFyc2VQZXJjZW50KGluZm9bJ1NjbCAnXSk7XG5cdGlmIChpbmZvLkRyU2gpIGVmZmVjdHMuZHJvcFNoYWRvdyA9IFtwYXJzZUVmZmVjdE9iamVjdChpbmZvLkRyU2gsIGxvZyldO1xuXHRpZiAoaW5mby5kcm9wU2hhZG93TXVsdGkpIGVmZmVjdHMuZHJvcFNoYWRvdyA9IGluZm8uZHJvcFNoYWRvd011bHRpLm1hcChpID0+IHBhcnNlRWZmZWN0T2JqZWN0KGksIGxvZykpO1xuXHRpZiAoaW5mby5JclNoKSBlZmZlY3RzLmlubmVyU2hhZG93ID0gW3BhcnNlRWZmZWN0T2JqZWN0KGluZm8uSXJTaCwgbG9nKV07XG5cdGlmIChpbmZvLmlubmVyU2hhZG93TXVsdGkpIGVmZmVjdHMuaW5uZXJTaGFkb3cgPSBpbmZvLmlubmVyU2hhZG93TXVsdGkubWFwKGkgPT4gcGFyc2VFZmZlY3RPYmplY3QoaSwgbG9nKSk7XG5cdGlmIChpbmZvLk9yR2wpIGVmZmVjdHMub3V0ZXJHbG93ID0gcGFyc2VFZmZlY3RPYmplY3QoaW5mby5PckdsLCBsb2cpO1xuXHRpZiAoaW5mby5JckdsKSBlZmZlY3RzLmlubmVyR2xvdyA9IHBhcnNlRWZmZWN0T2JqZWN0KGluZm8uSXJHbCwgbG9nKTtcblx0aWYgKGluZm8uZWJibCkgZWZmZWN0cy5iZXZlbCA9IHBhcnNlRWZmZWN0T2JqZWN0KGluZm8uZWJibCwgbG9nKTtcblx0aWYgKGluZm8uU29GaSkgZWZmZWN0cy5zb2xpZEZpbGwgPSBbcGFyc2VFZmZlY3RPYmplY3QoaW5mby5Tb0ZpLCBsb2cpXTtcblx0aWYgKGluZm8uc29saWRGaWxsTXVsdGkpIGVmZmVjdHMuc29saWRGaWxsID0gaW5mby5zb2xpZEZpbGxNdWx0aS5tYXAoaSA9PiBwYXJzZUVmZmVjdE9iamVjdChpLCBsb2cpKTtcblx0aWYgKGluZm8ucGF0dGVybkZpbGwpIGVmZmVjdHMucGF0dGVybk92ZXJsYXkgPSBwYXJzZUVmZmVjdE9iamVjdChpbmZvLnBhdHRlcm5GaWxsLCBsb2cpO1xuXHRpZiAoaW5mby5HckZsKSBlZmZlY3RzLmdyYWRpZW50T3ZlcmxheSA9IFtwYXJzZUVmZmVjdE9iamVjdChpbmZvLkdyRmwsIGxvZyldO1xuXHRpZiAoaW5mby5ncmFkaWVudEZpbGxNdWx0aSkgZWZmZWN0cy5ncmFkaWVudE92ZXJsYXkgPSBpbmZvLmdyYWRpZW50RmlsbE11bHRpLm1hcChpID0+IHBhcnNlRWZmZWN0T2JqZWN0KGksIGxvZykpO1xuXHRpZiAoaW5mby5DaEZYKSBlZmZlY3RzLnNhdGluID0gcGFyc2VFZmZlY3RPYmplY3QoaW5mby5DaEZYLCBsb2cpO1xuXHRpZiAoaW5mby5GckZYKSBlZmZlY3RzLnN0cm9rZSA9IFtwYXJzZUZ4T2JqZWN0KGluZm8uRnJGWCldO1xuXHRpZiAoaW5mby5mcmFtZUZYTXVsdGkpIGVmZmVjdHMuc3Ryb2tlID0gaW5mby5mcmFtZUZYTXVsdGkubWFwKGkgPT4gcGFyc2VGeE9iamVjdChpKSk7XG5cdHJldHVybiBlZmZlY3RzO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVFZmZlY3RzKGU6IExheWVyRWZmZWN0c0luZm8sIGxvZzogYm9vbGVhbiwgbXVsdGk6IGJvb2xlYW4pIHtcblx0Y29uc3QgaW5mbzogTGZ4MkRlc2NyaXB0b3IgJiBMbWZ4RGVzY3JpcHRvciA9IG11bHRpID8ge1xuXHRcdCdTY2wgJzogdW5pdHNQZXJjZW50KGUuc2NhbGUgPz8gMSksXG5cdFx0bWFzdGVyRlhTd2l0Y2g6ICFlLmRpc2FibGVkLFxuXHR9IDoge1xuXHRcdG1hc3RlckZYU3dpdGNoOiAhZS5kaXNhYmxlZCxcblx0XHQnU2NsICc6IHVuaXRzUGVyY2VudChlLnNjYWxlID8/IDEpLFxuXHR9O1xuXG5cdGNvbnN0IGFycmF5S2V5czogKGtleW9mIExheWVyRWZmZWN0c0luZm8pW10gPSBbJ2Ryb3BTaGFkb3cnLCAnaW5uZXJTaGFkb3cnLCAnc29saWRGaWxsJywgJ2dyYWRpZW50T3ZlcmxheScsICdzdHJva2UnXTtcblx0Zm9yIChjb25zdCBrZXkgb2YgYXJyYXlLZXlzKSB7XG5cdFx0aWYgKGVba2V5XSAmJiAhQXJyYXkuaXNBcnJheShlW2tleV0pKSB0aHJvdyBuZXcgRXJyb3IoYCR7a2V5fSBzaG91bGQgYmUgYW4gYXJyYXlgKTtcblx0fVxuXG5cdGlmIChlLmRyb3BTaGFkb3c/LlswXSAmJiAhbXVsdGkpIGluZm8uRHJTaCA9IHNlcmlhbGl6ZUVmZmVjdE9iamVjdChlLmRyb3BTaGFkb3dbMF0sICdkcm9wU2hhZG93JywgbG9nKTtcblx0aWYgKGUuZHJvcFNoYWRvdz8uWzBdICYmIG11bHRpKSBpbmZvLmRyb3BTaGFkb3dNdWx0aSA9IGUuZHJvcFNoYWRvdy5tYXAoaSA9PiBzZXJpYWxpemVFZmZlY3RPYmplY3QoaSwgJ2Ryb3BTaGFkb3cnLCBsb2cpKTtcblx0aWYgKGUuaW5uZXJTaGFkb3c/LlswXSAmJiAhbXVsdGkpIGluZm8uSXJTaCA9IHNlcmlhbGl6ZUVmZmVjdE9iamVjdChlLmlubmVyU2hhZG93WzBdLCAnaW5uZXJTaGFkb3cnLCBsb2cpO1xuXHRpZiAoZS5pbm5lclNoYWRvdz8uWzBdICYmIG11bHRpKSBpbmZvLmlubmVyU2hhZG93TXVsdGkgPSBlLmlubmVyU2hhZG93Lm1hcChpID0+IHNlcmlhbGl6ZUVmZmVjdE9iamVjdChpLCAnaW5uZXJTaGFkb3cnLCBsb2cpKTtcblx0aWYgKGUub3V0ZXJHbG93KSBpbmZvLk9yR2wgPSBzZXJpYWxpemVFZmZlY3RPYmplY3QoZS5vdXRlckdsb3csICdvdXRlckdsb3cnLCBsb2cpO1xuXHRpZiAoZS5zb2xpZEZpbGw/LlswXSAmJiBtdWx0aSkgaW5mby5zb2xpZEZpbGxNdWx0aSA9IGUuc29saWRGaWxsLm1hcChpID0+IHNlcmlhbGl6ZUVmZmVjdE9iamVjdChpLCAnc29saWRGaWxsJywgbG9nKSk7XG5cdGlmIChlLmdyYWRpZW50T3ZlcmxheT8uWzBdICYmIG11bHRpKSBpbmZvLmdyYWRpZW50RmlsbE11bHRpID0gZS5ncmFkaWVudE92ZXJsYXkubWFwKGkgPT4gc2VyaWFsaXplRWZmZWN0T2JqZWN0KGksICdncmFkaWVudE92ZXJsYXknLCBsb2cpKTtcblx0aWYgKGUuc3Ryb2tlPy5bMF0gJiYgbXVsdGkpIGluZm8uZnJhbWVGWE11bHRpID0gZS5zdHJva2UubWFwKGkgPT4gc2VyaWFsaXplRnhPYmplY3QoaSkpO1xuXHRpZiAoZS5pbm5lckdsb3cpIGluZm8uSXJHbCA9IHNlcmlhbGl6ZUVmZmVjdE9iamVjdChlLmlubmVyR2xvdywgJ2lubmVyR2xvdycsIGxvZyk7XG5cdGlmIChlLmJldmVsKSBpbmZvLmViYmwgPSBzZXJpYWxpemVFZmZlY3RPYmplY3QoZS5iZXZlbCwgJ2JldmVsJywgbG9nKTtcblx0aWYgKGUuc29saWRGaWxsPy5bMF0gJiYgIW11bHRpKSBpbmZvLlNvRmkgPSBzZXJpYWxpemVFZmZlY3RPYmplY3QoZS5zb2xpZEZpbGxbMF0sICdzb2xpZEZpbGwnLCBsb2cpO1xuXHRpZiAoZS5wYXR0ZXJuT3ZlcmxheSkgaW5mby5wYXR0ZXJuRmlsbCA9IHNlcmlhbGl6ZUVmZmVjdE9iamVjdChlLnBhdHRlcm5PdmVybGF5LCAncGF0dGVybk92ZXJsYXknLCBsb2cpO1xuXHRpZiAoZS5ncmFkaWVudE92ZXJsYXk/LlswXSAmJiAhbXVsdGkpIGluZm8uR3JGbCA9IHNlcmlhbGl6ZUVmZmVjdE9iamVjdChlLmdyYWRpZW50T3ZlcmxheVswXSwgJ2dyYWRpZW50T3ZlcmxheScsIGxvZyk7XG5cdGlmIChlLnNhdGluKSBpbmZvLkNoRlggPSBzZXJpYWxpemVFZmZlY3RPYmplY3QoZS5zYXRpbiwgJ3NhdGluJywgbG9nKTtcblx0aWYgKGUuc3Ryb2tlPy5bMF0gJiYgIW11bHRpKSBpbmZvLkZyRlggPSBzZXJpYWxpemVGeE9iamVjdChlLnN0cm9rZT8uWzBdKTtcblxuXHRpZiAobXVsdGkpIHtcblx0XHRpbmZvLm51bU1vZGlmeWluZ0ZYID0gMDtcblxuXHRcdGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGUpKSB7XG5cdFx0XHRjb25zdCB2YWx1ZSA9IChlIGFzIGFueSlba2V5XTtcblx0XHRcdGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuXHRcdFx0XHRmb3IgKGNvbnN0IGVmZmVjdCBvZiB2YWx1ZSkge1xuXHRcdFx0XHRcdGlmIChlZmZlY3QuZW5hYmxlZCkgaW5mby5udW1Nb2RpZnlpbmdGWCsrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGluZm87XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNNdWx0aUVmZmVjdHMoZWZmZWN0czogTGF5ZXJFZmZlY3RzSW5mbykge1xuXHRyZXR1cm4gT2JqZWN0LmtleXMoZWZmZWN0cykubWFwKGtleSA9PiAoZWZmZWN0cyBhcyBhbnkpW2tleV0pLnNvbWUodiA9PiBBcnJheS5pc0FycmF5KHYpICYmIHYubGVuZ3RoID4gMSk7XG59XG5cbmFkZEhhbmRsZXIoXG5cdCdsZngyJyxcblx0dGFyZ2V0ID0+IHRhcmdldC5lZmZlY3RzICE9PSB1bmRlZmluZWQgJiYgIWhhc011bHRpRWZmZWN0cyh0YXJnZXQuZWZmZWN0cyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCwgXywgb3B0aW9ucykgPT4ge1xuXHRcdGNvbnN0IHZlcnNpb24gPSByZWFkVWludDMyKHJlYWRlcik7XG5cdFx0aWYgKHZlcnNpb24gIT09IDApIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBsZngyIHZlcnNpb25gKTtcblxuXHRcdGNvbnN0IGRlc2M6IExmeDJEZXNjcmlwdG9yID0gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcik7XG5cdFx0Ly8gY29uc29sZS5sb2cocmVxdWlyZSgndXRpbCcpLmluc3BlY3QoZGVzYywgZmFsc2UsIDk5LCB0cnVlKSk7XG5cblx0XHQvLyBUT0RPOiBkb24ndCBkaXNjYXJkIGlmIHdlIGdvdCBpdCBmcm9tIGxtZnhcblx0XHQvLyBkaXNjYXJkIGlmIHJlYWQgaW4gJ2xyRlgnIHNlY3Rpb25cblx0XHR0YXJnZXQuZWZmZWN0cyA9IHBhcnNlRWZmZWN0cyhkZXNjLCAhIW9wdGlvbnMubG9nTWlzc2luZ0ZlYXR1cmVzKTtcblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCwgXywgb3B0aW9ucykgPT4ge1xuXHRcdGNvbnN0IGRlc2MgPSBzZXJpYWxpemVFZmZlY3RzKHRhcmdldC5lZmZlY3RzISwgISFvcHRpb25zLmxvZ01pc3NpbmdGZWF0dXJlcywgZmFsc2UpO1xuXHRcdC8vIGNvbnNvbGUubG9nKHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KGRlc2MsIGZhbHNlLCA5OSwgdHJ1ZSkpO1xuXG5cdFx0d3JpdGVVaW50MzIod3JpdGVyLCAwKTsgLy8gdmVyc2lvblxuXHRcdHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgJ251bGwnLCBkZXNjKTtcblx0fSxcbik7XG5cbmludGVyZmFjZSBDaW5mRGVzY3JpcHRvciB7XG5cdFZyc246IHsgbWFqb3I6IG51bWJlcjsgbWlub3I6IG51bWJlcjsgZml4OiBudW1iZXI7IH07XG5cdHBzVmVyc2lvbj86IHsgbWFqb3I6IG51bWJlcjsgbWlub3I6IG51bWJlcjsgZml4OiBudW1iZXI7IH07XG5cdGRlc2NyaXB0aW9uOiBzdHJpbmc7XG5cdHJlYXNvbjogc3RyaW5nO1xuXHRFbmduOiBzdHJpbmc7IC8vICdFbmduLmNvbXBDb3JlJztcblx0ZW5hYmxlQ29tcENvcmU6IHN0cmluZzsgLy8gJ2VuYWJsZS5mZWF0dXJlJztcblx0ZW5hYmxlQ29tcENvcmVHUFU6IHN0cmluZzsgLy8gJ2VuYWJsZS5mZWF0dXJlJztcblx0ZW5hYmxlQ29tcENvcmVUaHJlYWRzPzogc3RyaW5nOyAvLyAnZW5hYmxlLmZlYXR1cmUnO1xuXHRjb21wQ29yZVN1cHBvcnQ6IHN0cmluZzsgLy8gJ3JlYXNvbi5zdXBwb3J0ZWQnO1xuXHRjb21wQ29yZUdQVVN1cHBvcnQ6IHN0cmluZzsgLy8gJ3JlYXNvbi5mZWF0dXJlRGlzYWJsZWQnO1xufVxuXG5hZGRIYW5kbGVyKFxuXHQnY2luZicsXG5cdGhhc0tleSgnY29tcG9zaXRvclVzZWQnKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0Y29uc3QgZGVzYyA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpIGFzIENpbmZEZXNjcmlwdG9yO1xuXHRcdC8vIGNvbnNvbGUubG9nKHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KGRlc2MsIGZhbHNlLCA5OSwgdHJ1ZSkpO1xuXG5cdFx0dGFyZ2V0LmNvbXBvc2l0b3JVc2VkID0ge1xuXHRcdFx0ZGVzY3JpcHRpb246IGRlc2MuZGVzY3JpcHRpb24sXG5cdFx0XHRyZWFzb246IGRlc2MucmVhc29uLFxuXHRcdFx0ZW5naW5lOiBkZXNjLkVuZ24uc3BsaXQoJy4nKVsxXSxcblx0XHRcdGVuYWJsZUNvbXBDb3JlOiBkZXNjLmVuYWJsZUNvbXBDb3JlLnNwbGl0KCcuJylbMV0sXG5cdFx0XHRlbmFibGVDb21wQ29yZUdQVTogZGVzYy5lbmFibGVDb21wQ29yZUdQVS5zcGxpdCgnLicpWzFdLFxuXHRcdFx0Y29tcENvcmVTdXBwb3J0OiBkZXNjLmNvbXBDb3JlU3VwcG9ydC5zcGxpdCgnLicpWzFdLFxuXHRcdFx0Y29tcENvcmVHUFVTdXBwb3J0OiBkZXNjLmNvbXBDb3JlR1BVU3VwcG9ydC5zcGxpdCgnLicpWzFdLFxuXHRcdH07XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBjaW5mID0gdGFyZ2V0LmNvbXBvc2l0b3JVc2VkITtcblx0XHRjb25zdCBkZXNjOiBDaW5mRGVzY3JpcHRvciA9IHtcblx0XHRcdFZyc246IHsgbWFqb3I6IDEsIG1pbm9yOiAwLCBmaXg6IDAgfSwgLy8gVEVNUFxuXHRcdFx0Ly8gcHNWZXJzaW9uOiB7IG1ham9yOiAyMiwgbWlub3I6IDMsIGZpeDogMSB9LCAvLyBURVNUSU5HXG5cdFx0XHRkZXNjcmlwdGlvbjogY2luZi5kZXNjcmlwdGlvbixcblx0XHRcdHJlYXNvbjogY2luZi5yZWFzb24sXG5cdFx0XHRFbmduOiBgRW5nbi4ke2NpbmYuZW5naW5lfWAsXG5cdFx0XHRlbmFibGVDb21wQ29yZTogYGVuYWJsZS4ke2NpbmYuZW5hYmxlQ29tcENvcmV9YCxcblx0XHRcdGVuYWJsZUNvbXBDb3JlR1BVOiBgZW5hYmxlLiR7Y2luZi5lbmFibGVDb21wQ29yZUdQVX1gLFxuXHRcdFx0Ly8gZW5hYmxlQ29tcENvcmVUaHJlYWRzOiBgZW5hYmxlLmZlYXR1cmVgLCAvLyBURVNUSU5HXG5cdFx0XHRjb21wQ29yZVN1cHBvcnQ6IGByZWFzb24uJHtjaW5mLmNvbXBDb3JlU3VwcG9ydH1gLFxuXHRcdFx0Y29tcENvcmVHUFVTdXBwb3J0OiBgcmVhc29uLiR7Y2luZi5jb21wQ29yZUdQVVN1cHBvcnR9YCxcblx0XHR9O1xuXHRcdHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgJ251bGwnLCBkZXNjKTtcblx0fSxcbik7XG5cbi8vIGV4dGVuc2lvbiBzZXR0aW5ncyA/LCBpZ25vcmUgaXRcbmFkZEhhbmRsZXIoXG5cdCdleHRuJyxcblx0dGFyZ2V0ID0+ICh0YXJnZXQgYXMgYW55KS5fZXh0biAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBkZXNjOiBFeHRlbnNpb25EZXNjID0gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcik7XG5cdFx0Ly8gY29uc29sZS5sb2cocmVxdWlyZSgndXRpbCcpLmluc3BlY3QoZGVzYywgZmFsc2UsIDk5LCB0cnVlKSk7XG5cblx0XHRpZiAoTU9DS19IQU5ETEVSUykgKHRhcmdldCBhcyBhbnkpLl9leHRuID0gZGVzYztcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Ly8gVE9ETzogbmVlZCB0byBhZGQgY29ycmVjdCB0eXBlcyBmb3IgZGVzYyBmaWVsZHMgKHJlc291cmNlcy9zcmMucHNkKVxuXHRcdGlmIChNT0NLX0hBTkRMRVJTKSB3cml0ZVZlcnNpb25BbmREZXNjcmlwdG9yKHdyaXRlciwgJycsICdudWxsJywgKHRhcmdldCBhcyBhbnkpLl9leHRuKTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdCdpT3BhJyxcblx0aGFzS2V5KCdmaWxsT3BhY2l0eScpLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHtcblx0XHR0YXJnZXQuZmlsbE9wYWNpdHkgPSByZWFkVWludDgocmVhZGVyKSAvIDB4ZmY7XG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgMyk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlVWludDgod3JpdGVyLCB0YXJnZXQuZmlsbE9wYWNpdHkhICogMHhmZik7XG5cdFx0d3JpdGVaZXJvcyh3cml0ZXIsIDMpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J3RzbHknLFxuXHRoYXNLZXkoJ3RyYW5zcGFyZW5jeVNoYXBlc0xheWVyJyksXG5cdChyZWFkZXIsIHRhcmdldCkgPT4ge1xuXHRcdHRhcmdldC50cmFuc3BhcmVuY3lTaGFwZXNMYXllciA9ICEhcmVhZFVpbnQ4KHJlYWRlcik7XG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgMyk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlVWludDgod3JpdGVyLCB0YXJnZXQudHJhbnNwYXJlbmN5U2hhcGVzTGF5ZXIgPyAxIDogMCk7XG5cdFx0d3JpdGVaZXJvcyh3cml0ZXIsIDMpO1xuXHR9LFxuKTtcblxuLy8gZGVzY3JpcHRvciBoZWxwZXJzXG5cbmZ1bmN0aW9uIHBhcnNlR3JhZGllbnQoZ3JhZDogRGVzY2lwdG9yR3JhZGllbnQpOiBFZmZlY3RTb2xpZEdyYWRpZW50IHwgRWZmZWN0Tm9pc2VHcmFkaWVudCB7XG5cdGlmIChncmFkLkdyZEYgPT09ICdHcmRGLkNzdFMnKSB7XG5cdFx0Y29uc3Qgc2FtcGxlczogbnVtYmVyID0gZ3JhZC5JbnRyIHx8IDQwOTY7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0dHlwZTogJ3NvbGlkJyxcblx0XHRcdG5hbWU6IGdyYWRbJ05tICAnXSxcblx0XHRcdHNtb290aG5lc3M6IGdyYWQuSW50ciAvIDQwOTYsXG5cdFx0XHRjb2xvclN0b3BzOiBncmFkLkNscnMubWFwKHMgPT4gKHtcblx0XHRcdFx0Y29sb3I6IHBhcnNlQ29sb3Ioc1snQ2xyICddKSxcblx0XHRcdFx0bG9jYXRpb246IHMuTGN0biAvIHNhbXBsZXMsXG5cdFx0XHRcdG1pZHBvaW50OiBzLk1kcG4gLyAxMDAsXG5cdFx0XHR9KSksXG5cdFx0XHRvcGFjaXR5U3RvcHM6IGdyYWQuVHJucy5tYXAocyA9PiAoe1xuXHRcdFx0XHRvcGFjaXR5OiBwYXJzZVBlcmNlbnQocy5PcGN0KSxcblx0XHRcdFx0bG9jYXRpb246IHMuTGN0biAvIHNhbXBsZXMsXG5cdFx0XHRcdG1pZHBvaW50OiBzLk1kcG4gLyAxMDAsXG5cdFx0XHR9KSksXG5cdFx0fTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dHlwZTogJ25vaXNlJyxcblx0XHRcdG5hbWU6IGdyYWRbJ05tICAnXSxcblx0XHRcdHJvdWdobmVzczogZ3JhZC5TbXRoIC8gNDA5Nixcblx0XHRcdGNvbG9yTW9kZWw6IENsclMuZGVjb2RlKGdyYWQuQ2xyUyksXG5cdFx0XHRyYW5kb21TZWVkOiBncmFkLlJuZFMsXG5cdFx0XHRyZXN0cmljdENvbG9yczogISFncmFkLlZjdEMsXG5cdFx0XHRhZGRUcmFuc3BhcmVuY3k6ICEhZ3JhZC5TaFRyLFxuXHRcdFx0bWluOiBncmFkWydNbm0gJ10ubWFwKHggPT4geCAvIDEwMCksXG5cdFx0XHRtYXg6IGdyYWRbJ014bSAnXS5tYXAoeCA9PiB4IC8gMTAwKSxcblx0XHR9O1xuXHR9XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZUdyYWRpZW50KGdyYWQ6IEVmZmVjdFNvbGlkR3JhZGllbnQgfCBFZmZlY3ROb2lzZUdyYWRpZW50KTogRGVzY2lwdG9yR3JhZGllbnQge1xuXHRpZiAoZ3JhZC50eXBlID09PSAnc29saWQnKSB7XG5cdFx0Y29uc3Qgc2FtcGxlcyA9IE1hdGgucm91bmQoKGdyYWQuc21vb3RobmVzcyA/PyAxKSAqIDQwOTYpO1xuXHRcdHJldHVybiB7XG5cdFx0XHQnTm0gICc6IGdyYWQubmFtZSB8fCAnJyxcblx0XHRcdEdyZEY6ICdHcmRGLkNzdFMnLFxuXHRcdFx0SW50cjogc2FtcGxlcyxcblx0XHRcdENscnM6IGdyYWQuY29sb3JTdG9wcy5tYXAocyA9PiAoe1xuXHRcdFx0XHQnQ2xyICc6IHNlcmlhbGl6ZUNvbG9yKHMuY29sb3IpLFxuXHRcdFx0XHRUeXBlOiAnQ2xyeS5Vc3JTJyxcblx0XHRcdFx0TGN0bjogTWF0aC5yb3VuZChzLmxvY2F0aW9uICogc2FtcGxlcyksXG5cdFx0XHRcdE1kcG46IE1hdGgucm91bmQoKHMubWlkcG9pbnQgPz8gMC41KSAqIDEwMCksXG5cdFx0XHR9KSksXG5cdFx0XHRUcm5zOiBncmFkLm9wYWNpdHlTdG9wcy5tYXAocyA9PiAoe1xuXHRcdFx0XHRPcGN0OiB1bml0c1BlcmNlbnQocy5vcGFjaXR5KSxcblx0XHRcdFx0TGN0bjogTWF0aC5yb3VuZChzLmxvY2F0aW9uICogc2FtcGxlcyksXG5cdFx0XHRcdE1kcG46IE1hdGgucm91bmQoKHMubWlkcG9pbnQgPz8gMC41KSAqIDEwMCksXG5cdFx0XHR9KSksXG5cdFx0fTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0R3JkRjogJ0dyZEYuQ2xOcycsXG5cdFx0XHQnTm0gICc6IGdyYWQubmFtZSB8fCAnJyxcblx0XHRcdFNoVHI6ICEhZ3JhZC5hZGRUcmFuc3BhcmVuY3ksXG5cdFx0XHRWY3RDOiAhIWdyYWQucmVzdHJpY3RDb2xvcnMsXG5cdFx0XHRDbHJTOiBDbHJTLmVuY29kZShncmFkLmNvbG9yTW9kZWwpLFxuXHRcdFx0Um5kUzogZ3JhZC5yYW5kb21TZWVkIHx8IDAsXG5cdFx0XHRTbXRoOiBNYXRoLnJvdW5kKChncmFkLnJvdWdobmVzcyA/PyAxKSAqIDQwOTYpLFxuXHRcdFx0J01ubSAnOiAoZ3JhZC5taW4gfHwgWzAsIDAsIDAsIDBdKS5tYXAoeCA9PiB4ICogMTAwKSxcblx0XHRcdCdNeG0gJzogKGdyYWQubWF4IHx8IFsxLCAxLCAxLCAxXSkubWFwKHggPT4geCAqIDEwMCksXG5cdFx0fTtcblx0fVxufVxuXG5mdW5jdGlvbiBwYXJzZUdyYWRpZW50Q29udGVudChkZXNjcmlwdG9yOiBEZXNjcmlwdG9yR3JhZGllbnRDb250ZW50KSB7XG5cdGNvbnN0IHJlc3VsdCA9IHBhcnNlR3JhZGllbnQoZGVzY3JpcHRvci5HcmFkKSBhcyAoRWZmZWN0U29saWRHcmFkaWVudCB8IEVmZmVjdE5vaXNlR3JhZGllbnQpICYgRXh0cmFHcmFkaWVudEluZm87XG5cdHJlc3VsdC5zdHlsZSA9IEdyZFQuZGVjb2RlKGRlc2NyaXB0b3IuVHlwZSk7XG5cdGlmIChkZXNjcmlwdG9yLkR0aHIgIT09IHVuZGVmaW5lZCkgcmVzdWx0LmRpdGhlciA9IGRlc2NyaXB0b3IuRHRocjtcblx0aWYgKGRlc2NyaXB0b3IuUnZycyAhPT0gdW5kZWZpbmVkKSByZXN1bHQucmV2ZXJzZSA9IGRlc2NyaXB0b3IuUnZycztcblx0aWYgKGRlc2NyaXB0b3IuQW5nbCAhPT0gdW5kZWZpbmVkKSByZXN1bHQuYW5nbGUgPSBwYXJzZUFuZ2xlKGRlc2NyaXB0b3IuQW5nbCk7XG5cdGlmIChkZXNjcmlwdG9yWydTY2wgJ10gIT09IHVuZGVmaW5lZCkgcmVzdWx0LnNjYWxlID0gcGFyc2VQZXJjZW50KGRlc2NyaXB0b3JbJ1NjbCAnXSk7XG5cdGlmIChkZXNjcmlwdG9yLkFsZ24gIT09IHVuZGVmaW5lZCkgcmVzdWx0LmFsaWduID0gZGVzY3JpcHRvci5BbGduO1xuXHRpZiAoZGVzY3JpcHRvci5PZnN0ICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXN1bHQub2Zmc2V0ID0ge1xuXHRcdFx0eDogcGFyc2VQZXJjZW50KGRlc2NyaXB0b3IuT2ZzdC5IcnpuKSxcblx0XHRcdHk6IHBhcnNlUGVyY2VudChkZXNjcmlwdG9yLk9mc3QuVnJ0Yylcblx0XHR9O1xuXHR9XG5cdHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHBhcnNlUGF0dGVybkNvbnRlbnQoZGVzY3JpcHRvcjogRGVzY3JpcHRvclBhdHRlcm5Db250ZW50KSB7XG5cdGNvbnN0IHJlc3VsdDogRWZmZWN0UGF0dGVybiAmIEV4dHJhUGF0dGVybkluZm8gPSB7XG5cdFx0bmFtZTogZGVzY3JpcHRvci5QdHJuWydObSAgJ10sXG5cdFx0aWQ6IGRlc2NyaXB0b3IuUHRybi5JZG50LFxuXHR9O1xuXHRpZiAoZGVzY3JpcHRvci5MbmtkICE9PSB1bmRlZmluZWQpIHJlc3VsdC5saW5rZWQgPSBkZXNjcmlwdG9yLkxua2Q7XG5cdGlmIChkZXNjcmlwdG9yLnBoYXNlICE9PSB1bmRlZmluZWQpIHJlc3VsdC5waGFzZSA9IHsgeDogZGVzY3JpcHRvci5waGFzZS5IcnpuLCB5OiBkZXNjcmlwdG9yLnBoYXNlLlZydGMgfTtcblx0cmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gcGFyc2VWZWN0b3JDb250ZW50KGRlc2NyaXB0b3I6IERlc2NyaXB0b3JWZWN0b3JDb250ZW50KTogVmVjdG9yQ29udGVudCB7XG5cdGlmICgnR3JhZCcgaW4gZGVzY3JpcHRvcikge1xuXHRcdHJldHVybiBwYXJzZUdyYWRpZW50Q29udGVudChkZXNjcmlwdG9yKTtcblx0fSBlbHNlIGlmICgnUHRybicgaW4gZGVzY3JpcHRvcikge1xuXHRcdHJldHVybiB7IHR5cGU6ICdwYXR0ZXJuJywgLi4ucGFyc2VQYXR0ZXJuQ29udGVudChkZXNjcmlwdG9yKSB9O1xuXHR9IGVsc2UgaWYgKCdDbHIgJyBpbiBkZXNjcmlwdG9yKSB7XG5cdFx0cmV0dXJuIHsgdHlwZTogJ2NvbG9yJywgY29sb3I6IHBhcnNlQ29sb3IoZGVzY3JpcHRvclsnQ2xyICddKSB9O1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCB2ZWN0b3IgY29udGVudCcpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZUdyYWRpZW50Q29udGVudChjb250ZW50OiAoRWZmZWN0U29saWRHcmFkaWVudCB8IEVmZmVjdE5vaXNlR3JhZGllbnQpICYgRXh0cmFHcmFkaWVudEluZm8pIHtcblx0Y29uc3QgcmVzdWx0OiBEZXNjcmlwdG9yR3JhZGllbnRDb250ZW50ID0ge30gYXMgYW55O1xuXHRpZiAoY29udGVudC5kaXRoZXIgIT09IHVuZGVmaW5lZCkgcmVzdWx0LkR0aHIgPSBjb250ZW50LmRpdGhlcjtcblx0aWYgKGNvbnRlbnQucmV2ZXJzZSAhPT0gdW5kZWZpbmVkKSByZXN1bHQuUnZycyA9IGNvbnRlbnQucmV2ZXJzZTtcblx0aWYgKGNvbnRlbnQuYW5nbGUgIT09IHVuZGVmaW5lZCkgcmVzdWx0LkFuZ2wgPSB1bml0c0FuZ2xlKGNvbnRlbnQuYW5nbGUpO1xuXHRyZXN1bHQuVHlwZSA9IEdyZFQuZW5jb2RlKGNvbnRlbnQuc3R5bGUpO1xuXHRpZiAoY29udGVudC5hbGlnbiAhPT0gdW5kZWZpbmVkKSByZXN1bHQuQWxnbiA9IGNvbnRlbnQuYWxpZ247XG5cdGlmIChjb250ZW50LnNjYWxlICE9PSB1bmRlZmluZWQpIHJlc3VsdFsnU2NsICddID0gdW5pdHNQZXJjZW50KGNvbnRlbnQuc2NhbGUpO1xuXHRpZiAoY29udGVudC5vZmZzZXQpIHtcblx0XHRyZXN1bHQuT2ZzdCA9IHtcblx0XHRcdEhyem46IHVuaXRzUGVyY2VudChjb250ZW50Lm9mZnNldC54KSxcblx0XHRcdFZydGM6IHVuaXRzUGVyY2VudChjb250ZW50Lm9mZnNldC55KSxcblx0XHR9O1xuXHR9XG5cdHJlc3VsdC5HcmFkID0gc2VyaWFsaXplR3JhZGllbnQoY29udGVudCk7XG5cdHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZVBhdHRlcm5Db250ZW50KGNvbnRlbnQ6IEVmZmVjdFBhdHRlcm4gJiBFeHRyYVBhdHRlcm5JbmZvKSB7XG5cdGNvbnN0IHJlc3VsdDogRGVzY3JpcHRvclBhdHRlcm5Db250ZW50ID0ge1xuXHRcdFB0cm46IHtcblx0XHRcdCdObSAgJzogY29udGVudC5uYW1lIHx8ICcnLFxuXHRcdFx0SWRudDogY29udGVudC5pZCB8fCAnJyxcblx0XHR9XG5cdH07XG5cdGlmIChjb250ZW50LmxpbmtlZCAhPT0gdW5kZWZpbmVkKSByZXN1bHQuTG5rZCA9ICEhY29udGVudC5saW5rZWQ7XG5cdGlmIChjb250ZW50LnBoYXNlICE9PSB1bmRlZmluZWQpIHJlc3VsdC5waGFzZSA9IHsgSHJ6bjogY29udGVudC5waGFzZS54LCBWcnRjOiBjb250ZW50LnBoYXNlLnkgfTtcblx0cmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplVmVjdG9yQ29udGVudChjb250ZW50OiBWZWN0b3JDb250ZW50KTogeyBkZXNjcmlwdG9yOiBEZXNjcmlwdG9yVmVjdG9yQ29udGVudDsga2V5OiBzdHJpbmc7IH0ge1xuXHRpZiAoY29udGVudC50eXBlID09PSAnY29sb3InKSB7XG5cdFx0cmV0dXJuIHsga2V5OiAnU29DbycsIGRlc2NyaXB0b3I6IHsgJ0NsciAnOiBzZXJpYWxpemVDb2xvcihjb250ZW50LmNvbG9yKSB9IH07XG5cdH0gZWxzZSBpZiAoY29udGVudC50eXBlID09PSAncGF0dGVybicpIHtcblx0XHRyZXR1cm4geyBrZXk6ICdQdEZsJywgZGVzY3JpcHRvcjogc2VyaWFsaXplUGF0dGVybkNvbnRlbnQoY29udGVudCkgfTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4geyBrZXk6ICdHZEZsJywgZGVzY3JpcHRvcjogc2VyaWFsaXplR3JhZGllbnRDb250ZW50KGNvbnRlbnQpIH07XG5cdH1cbn1cblxuZnVuY3Rpb24gcGFyc2VDb2xvcihjb2xvcjogRGVzY3JpcHRvckNvbG9yKTogQ29sb3Ige1xuXHRpZiAoJ0ggICAnIGluIGNvbG9yKSB7XG5cdFx0cmV0dXJuIHsgaDogcGFyc2VQZXJjZW50T3JBbmdsZShjb2xvclsnSCAgICddKSwgczogY29sb3IuU3RydCwgYjogY29sb3IuQnJnaCB9O1xuXHR9IGVsc2UgaWYgKCdSZCAgJyBpbiBjb2xvcikge1xuXHRcdHJldHVybiB7IHI6IGNvbG9yWydSZCAgJ10sIGc6IGNvbG9yWydHcm4gJ10sIGI6IGNvbG9yWydCbCAgJ10gfTtcblx0fSBlbHNlIGlmICgnQ3luICcgaW4gY29sb3IpIHtcblx0XHRyZXR1cm4geyBjOiBjb2xvclsnQ3luICddLCBtOiBjb2xvci5NZ250LCB5OiBjb2xvclsnWWx3ICddLCBrOiBjb2xvci5CbGNrIH07XG5cdH0gZWxzZSBpZiAoJ0dyeSAnIGluIGNvbG9yKSB7XG5cdFx0cmV0dXJuIHsgazogY29sb3JbJ0dyeSAnXSB9O1xuXHR9IGVsc2UgaWYgKCdMbW5jJyBpbiBjb2xvcikge1xuXHRcdHJldHVybiB7IGw6IGNvbG9yLkxtbmMsIGE6IGNvbG9yWydBICAgJ10sIGI6IGNvbG9yWydCICAgJ10gfTtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ1Vuc3VwcG9ydGVkIGNvbG9yIGRlc2NyaXB0b3InKTtcblx0fVxufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVDb2xvcihjb2xvcjogQ29sb3IgfCB1bmRlZmluZWQpOiBEZXNjcmlwdG9yQ29sb3Ige1xuXHRpZiAoIWNvbG9yKSB7XG5cdFx0cmV0dXJuIHsgJ1JkICAnOiAwLCAnR3JuICc6IDAsICdCbCAgJzogMCB9O1xuXHR9IGVsc2UgaWYgKCdyJyBpbiBjb2xvcikge1xuXHRcdHJldHVybiB7ICdSZCAgJzogY29sb3IuciB8fCAwLCAnR3JuICc6IGNvbG9yLmcgfHwgMCwgJ0JsICAnOiBjb2xvci5iIHx8IDAgfTtcblx0fSBlbHNlIGlmICgnaCcgaW4gY29sb3IpIHtcblx0XHRyZXR1cm4geyAnSCAgICc6IHVuaXRzQW5nbGUoY29sb3IuaCAqIDM2MCksIFN0cnQ6IGNvbG9yLnMgfHwgMCwgQnJnaDogY29sb3IuYiB8fCAwIH07XG5cdH0gZWxzZSBpZiAoJ2MnIGluIGNvbG9yKSB7XG5cdFx0cmV0dXJuIHsgJ0N5biAnOiBjb2xvci5jIHx8IDAsIE1nbnQ6IGNvbG9yLm0gfHwgMCwgJ1lsdyAnOiBjb2xvci55IHx8IDAsIEJsY2s6IGNvbG9yLmsgfHwgMCB9O1xuXHR9IGVsc2UgaWYgKCdsJyBpbiBjb2xvcikge1xuXHRcdHJldHVybiB7IExtbmM6IGNvbG9yLmwgfHwgMCwgJ0EgICAnOiBjb2xvci5hIHx8IDAsICdCICAgJzogY29sb3IuYiB8fCAwIH07XG5cdH0gZWxzZSBpZiAoJ2snIGluIGNvbG9yKSB7XG5cdFx0cmV0dXJuIHsgJ0dyeSAnOiBjb2xvci5rIH07XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvbG9yIHZhbHVlJyk7XG5cdH1cbn1cblxudHlwZSBBbGxFZmZlY3RzID0gTGF5ZXJFZmZlY3RTaGFkb3cgJiBMYXllckVmZmVjdHNPdXRlckdsb3cgJiBMYXllckVmZmVjdFN0cm9rZSAmXG5cdExheWVyRWZmZWN0SW5uZXJHbG93ICYgTGF5ZXJFZmZlY3RCZXZlbCAmIExheWVyRWZmZWN0U29saWRGaWxsICZcblx0TGF5ZXJFZmZlY3RQYXR0ZXJuT3ZlcmxheSAmIExheWVyRWZmZWN0U2F0aW4gJiBMYXllckVmZmVjdEdyYWRpZW50T3ZlcmxheTtcblxuZnVuY3Rpb24gcGFyc2VFZmZlY3RPYmplY3Qob2JqOiBhbnksIHJlcG9ydEVycm9yczogYm9vbGVhbikge1xuXHRjb25zdCByZXN1bHQ6IEFsbEVmZmVjdHMgPSB7fSBhcyBhbnk7XG5cblx0Zm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMob2JqKSkge1xuXHRcdGNvbnN0IHZhbCA9IG9ialtrZXldO1xuXG5cdFx0c3dpdGNoIChrZXkpIHtcblx0XHRcdGNhc2UgJ2VuYWInOiByZXN1bHQuZW5hYmxlZCA9ICEhdmFsOyBicmVhaztcblx0XHRcdGNhc2UgJ3VnbGcnOiByZXN1bHQudXNlR2xvYmFsTGlnaHQgPSAhIXZhbDsgYnJlYWs7XG5cdFx0XHRjYXNlICdBbnRBJzogcmVzdWx0LmFudGlhbGlhc2VkID0gISF2YWw7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnQWxnbic6IHJlc3VsdC5hbGlnbiA9ICEhdmFsOyBicmVhaztcblx0XHRcdGNhc2UgJ0R0aHInOiByZXN1bHQuZGl0aGVyID0gISF2YWw7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnSW52cic6IHJlc3VsdC5pbnZlcnQgPSAhIXZhbDsgYnJlYWs7XG5cdFx0XHRjYXNlICdSdnJzJzogcmVzdWx0LnJldmVyc2UgPSAhIXZhbDsgYnJlYWs7XG5cdFx0XHRjYXNlICdDbHIgJzogcmVzdWx0LmNvbG9yID0gcGFyc2VDb2xvcih2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ2hnbEMnOiByZXN1bHQuaGlnaGxpZ2h0Q29sb3IgPSBwYXJzZUNvbG9yKHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnc2R3Qyc6IHJlc3VsdC5zaGFkb3dDb2xvciA9IHBhcnNlQ29sb3IodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdTdHlsJzogcmVzdWx0LnBvc2l0aW9uID0gRlN0bC5kZWNvZGUodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdNZCAgJzogcmVzdWx0LmJsZW5kTW9kZSA9IEJsbk0uZGVjb2RlKHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnaGdsTSc6IHJlc3VsdC5oaWdobGlnaHRCbGVuZE1vZGUgPSBCbG5NLmRlY29kZSh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ3Nkd00nOiByZXN1bHQuc2hhZG93QmxlbmRNb2RlID0gQmxuTS5kZWNvZGUodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdidmxTJzogcmVzdWx0LnN0eWxlID0gQkVTbC5kZWNvZGUodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdidmxEJzogcmVzdWx0LmRpcmVjdGlvbiA9IEJFU3MuZGVjb2RlKHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnYnZsVCc6IHJlc3VsdC50ZWNobmlxdWUgPSBidmxULmRlY29kZSh2YWwpIGFzIGFueTsgYnJlYWs7XG5cdFx0XHRjYXNlICdHbHdUJzogcmVzdWx0LnRlY2huaXF1ZSA9IEJFVEUuZGVjb2RlKHZhbCkgYXMgYW55OyBicmVhaztcblx0XHRcdGNhc2UgJ2dsd1MnOiByZXN1bHQuc291cmNlID0gSUdTci5kZWNvZGUodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdUeXBlJzogcmVzdWx0LnR5cGUgPSBHcmRULmRlY29kZSh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ09wY3QnOiByZXN1bHQub3BhY2l0eSA9IHBhcnNlUGVyY2VudCh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ2hnbE8nOiByZXN1bHQuaGlnaGxpZ2h0T3BhY2l0eSA9IHBhcnNlUGVyY2VudCh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ3Nkd08nOiByZXN1bHQuc2hhZG93T3BhY2l0eSA9IHBhcnNlUGVyY2VudCh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ2xhZ2wnOiByZXN1bHQuYW5nbGUgPSBwYXJzZUFuZ2xlKHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnQW5nbCc6IHJlc3VsdC5hbmdsZSA9IHBhcnNlQW5nbGUodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdMYWxkJzogcmVzdWx0LmFsdGl0dWRlID0gcGFyc2VBbmdsZSh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ1NmdG4nOiByZXN1bHQuc29mdGVuID0gcGFyc2VVbml0cyh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ3NyZ1InOiByZXN1bHQuc3RyZW5ndGggPSBwYXJzZVBlcmNlbnQodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdibHVyJzogcmVzdWx0LnNpemUgPSBwYXJzZVVuaXRzKHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnTm9zZSc6IHJlc3VsdC5ub2lzZSA9IHBhcnNlUGVyY2VudCh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ0lucHInOiByZXN1bHQucmFuZ2UgPSBwYXJzZVBlcmNlbnQodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdDa210JzogcmVzdWx0LmNob2tlID0gcGFyc2VVbml0cyh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ1NoZE4nOiByZXN1bHQuaml0dGVyID0gcGFyc2VQZXJjZW50KHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnRHN0bic6IHJlc3VsdC5kaXN0YW5jZSA9IHBhcnNlVW5pdHModmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdTY2wgJzogcmVzdWx0LnNjYWxlID0gcGFyc2VQZXJjZW50KHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnUHRybic6IHJlc3VsdC5wYXR0ZXJuID0geyBuYW1lOiB2YWxbJ05tICAnXSwgaWQ6IHZhbC5JZG50IH07IGJyZWFrO1xuXHRcdFx0Y2FzZSAncGhhc2UnOiByZXN1bHQucGhhc2UgPSB7IHg6IHZhbC5IcnpuLCB5OiB2YWwuVnJ0YyB9OyBicmVhaztcblx0XHRcdGNhc2UgJ09mc3QnOiByZXN1bHQub2Zmc2V0ID0geyB4OiBwYXJzZVBlcmNlbnQodmFsLkhyem4pLCB5OiBwYXJzZVBlcmNlbnQodmFsLlZydGMpIH07IGJyZWFrO1xuXHRcdFx0Y2FzZSAnTXBnUyc6XG5cdFx0XHRjYXNlICdUcm5TJzpcblx0XHRcdFx0cmVzdWx0LmNvbnRvdXIgPSB7XG5cdFx0XHRcdFx0bmFtZTogdmFsWydObSAgJ10sXG5cdFx0XHRcdFx0Y3VydmU6ICh2YWxbJ0NydiAnXSBhcyBhbnlbXSkubWFwKHAgPT4gKHsgeDogcC5IcnpuLCB5OiBwLlZydGMgfSkpLFxuXHRcdFx0XHR9O1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ0dyYWQnOiByZXN1bHQuZ3JhZGllbnQgPSBwYXJzZUdyYWRpZW50KHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAndXNlVGV4dHVyZSc6XG5cdFx0XHRjYXNlICd1c2VTaGFwZSc6XG5cdFx0XHRjYXNlICdsYXllckNvbmNlYWxzJzpcblx0XHRcdGNhc2UgJ3ByZXNlbnQnOlxuXHRcdFx0Y2FzZSAnc2hvd0luRGlhbG9nJzpcblx0XHRcdGNhc2UgJ2FudGlhbGlhc0dsb3NzJzogcmVzdWx0W2tleV0gPSB2YWw7IGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmVwb3J0RXJyb3JzICYmIGNvbnNvbGUubG9nKGBJbnZhbGlkIGVmZmVjdCBrZXk6ICcke2tleX0nOmAsIHZhbCk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplRWZmZWN0T2JqZWN0KG9iajogYW55LCBvYmpOYW1lOiBzdHJpbmcsIHJlcG9ydEVycm9yczogYm9vbGVhbikge1xuXHRjb25zdCByZXN1bHQ6IGFueSA9IHt9O1xuXG5cdGZvciAoY29uc3Qgb2JqS2V5IG9mIE9iamVjdC5rZXlzKG9iaikpIHtcblx0XHRjb25zdCBrZXk6IGtleW9mIEFsbEVmZmVjdHMgPSBvYmpLZXkgYXMgYW55O1xuXHRcdGNvbnN0IHZhbCA9IG9ialtrZXldO1xuXG5cdFx0c3dpdGNoIChrZXkpIHtcblx0XHRcdGNhc2UgJ2VuYWJsZWQnOiByZXN1bHQuZW5hYiA9ICEhdmFsOyBicmVhaztcblx0XHRcdGNhc2UgJ3VzZUdsb2JhbExpZ2h0JzogcmVzdWx0LnVnbGcgPSAhIXZhbDsgYnJlYWs7XG5cdFx0XHRjYXNlICdhbnRpYWxpYXNlZCc6IHJlc3VsdC5BbnRBID0gISF2YWw7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnYWxpZ24nOiByZXN1bHQuQWxnbiA9ICEhdmFsOyBicmVhaztcblx0XHRcdGNhc2UgJ2RpdGhlcic6IHJlc3VsdC5EdGhyID0gISF2YWw7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnaW52ZXJ0JzogcmVzdWx0LkludnIgPSAhIXZhbDsgYnJlYWs7XG5cdFx0XHRjYXNlICdyZXZlcnNlJzogcmVzdWx0LlJ2cnMgPSAhIXZhbDsgYnJlYWs7XG5cdFx0XHRjYXNlICdjb2xvcic6IHJlc3VsdFsnQ2xyICddID0gc2VyaWFsaXplQ29sb3IodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdoaWdobGlnaHRDb2xvcic6IHJlc3VsdC5oZ2xDID0gc2VyaWFsaXplQ29sb3IodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdzaGFkb3dDb2xvcic6IHJlc3VsdC5zZHdDID0gc2VyaWFsaXplQ29sb3IodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdwb3NpdGlvbic6IHJlc3VsdC5TdHlsID0gRlN0bC5lbmNvZGUodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdibGVuZE1vZGUnOiByZXN1bHRbJ01kICAnXSA9IEJsbk0uZW5jb2RlKHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnaGlnaGxpZ2h0QmxlbmRNb2RlJzogcmVzdWx0LmhnbE0gPSBCbG5NLmVuY29kZSh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ3NoYWRvd0JsZW5kTW9kZSc6IHJlc3VsdC5zZHdNID0gQmxuTS5lbmNvZGUodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdzdHlsZSc6IHJlc3VsdC5idmxTID0gQkVTbC5lbmNvZGUodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdkaXJlY3Rpb24nOiByZXN1bHQuYnZsRCA9IEJFU3MuZW5jb2RlKHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAndGVjaG5pcXVlJzpcblx0XHRcdFx0aWYgKG9iak5hbWUgPT09ICdiZXZlbCcpIHtcblx0XHRcdFx0XHRyZXN1bHQuYnZsVCA9IGJ2bFQuZW5jb2RlKHZhbCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmVzdWx0Lkdsd1QgPSBCRVRFLmVuY29kZSh2YWwpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnc291cmNlJzogcmVzdWx0Lmdsd1MgPSBJR1NyLmVuY29kZSh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ3R5cGUnOiByZXN1bHQuVHlwZSA9IEdyZFQuZW5jb2RlKHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnb3BhY2l0eSc6IHJlc3VsdC5PcGN0ID0gdW5pdHNQZXJjZW50KHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnaGlnaGxpZ2h0T3BhY2l0eSc6IHJlc3VsdC5oZ2xPID0gdW5pdHNQZXJjZW50KHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnc2hhZG93T3BhY2l0eSc6IHJlc3VsdC5zZHdPID0gdW5pdHNQZXJjZW50KHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnYW5nbGUnOlxuXHRcdFx0XHRpZiAob2JqTmFtZSA9PT0gJ2dyYWRpZW50T3ZlcmxheScpIHtcblx0XHRcdFx0XHRyZXN1bHQuQW5nbCA9IHVuaXRzQW5nbGUodmFsKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXN1bHQubGFnbCA9IHVuaXRzQW5nbGUodmFsKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2FsdGl0dWRlJzogcmVzdWx0LkxhbGQgPSB1bml0c0FuZ2xlKHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnc29mdGVuJzogcmVzdWx0LlNmdG4gPSB1bml0c1ZhbHVlKHZhbCwga2V5KTsgYnJlYWs7XG5cdFx0XHRjYXNlICdzdHJlbmd0aCc6IHJlc3VsdC5zcmdSID0gdW5pdHNQZXJjZW50KHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnc2l6ZSc6IHJlc3VsdC5ibHVyID0gdW5pdHNWYWx1ZSh2YWwsIGtleSk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnbm9pc2UnOiByZXN1bHQuTm9zZSA9IHVuaXRzUGVyY2VudCh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ3JhbmdlJzogcmVzdWx0LklucHIgPSB1bml0c1BlcmNlbnQodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdjaG9rZSc6IHJlc3VsdC5Da210ID0gdW5pdHNWYWx1ZSh2YWwsIGtleSk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnaml0dGVyJzogcmVzdWx0LlNoZE4gPSB1bml0c1BlcmNlbnQodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdkaXN0YW5jZSc6IHJlc3VsdC5Ec3RuID0gdW5pdHNWYWx1ZSh2YWwsIGtleSk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnc2NhbGUnOiByZXN1bHRbJ1NjbCAnXSA9IHVuaXRzUGVyY2VudCh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ3BhdHRlcm4nOiByZXN1bHQuUHRybiA9IHsgJ05tICAnOiB2YWwubmFtZSwgSWRudDogdmFsLmlkIH07IGJyZWFrO1xuXHRcdFx0Y2FzZSAncGhhc2UnOiByZXN1bHQucGhhc2UgPSB7IEhyem46IHZhbC54LCBWcnRjOiB2YWwueSB9OyBicmVhaztcblx0XHRcdGNhc2UgJ29mZnNldCc6IHJlc3VsdC5PZnN0ID0geyBIcnpuOiB1bml0c1BlcmNlbnQodmFsLngpLCBWcnRjOiB1bml0c1BlcmNlbnQodmFsLnkpIH07IGJyZWFrO1xuXHRcdFx0Y2FzZSAnY29udG91cic6IHtcblx0XHRcdFx0cmVzdWx0W29iak5hbWUgPT09ICdzYXRpbicgPyAnTXBnUycgOiAnVHJuUyddID0ge1xuXHRcdFx0XHRcdCdObSAgJzogKHZhbCBhcyBFZmZlY3RDb250b3VyKS5uYW1lLFxuXHRcdFx0XHRcdCdDcnYgJzogKHZhbCBhcyBFZmZlY3RDb250b3VyKS5jdXJ2ZS5tYXAocCA9PiAoeyBIcnpuOiBwLngsIFZydGM6IHAueSB9KSksXG5cdFx0XHRcdH07XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0Y2FzZSAnZ3JhZGllbnQnOiByZXN1bHQuR3JhZCA9IHNlcmlhbGl6ZUdyYWRpZW50KHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAndXNlVGV4dHVyZSc6XG5cdFx0XHRjYXNlICd1c2VTaGFwZSc6XG5cdFx0XHRjYXNlICdsYXllckNvbmNlYWxzJzpcblx0XHRcdGNhc2UgJ3ByZXNlbnQnOlxuXHRcdFx0Y2FzZSAnc2hvd0luRGlhbG9nJzpcblx0XHRcdGNhc2UgJ2FudGlhbGlhc0dsb3NzJzpcblx0XHRcdFx0cmVzdWx0W2tleV0gPSB2YWw7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmVwb3J0RXJyb3JzICYmIGNvbnNvbGUubG9nKGBJbnZhbGlkIGVmZmVjdCBrZXk6ICcke2tleX0nIHZhbHVlOmAsIHZhbCk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHJlc3VsdDtcbn1cbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL2JyYW5kb25saXUvRGVza3RvcC9za3lsYWIvYWctcHNkL3NyYyJ9
