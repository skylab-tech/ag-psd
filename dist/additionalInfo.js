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
exports.hasMultiEffects = exports.readVectorMask = exports.booleanOperations = exports.readBezierKnot = exports.infoHandlersMap = exports.infoHandlers = void 0;
var base64_js_1 = require("base64-js");
var effectsHelpers_1 = require("./effectsHelpers");
var helpers_1 = require("./helpers");
var psdReader_1 = require("./psdReader");
var psdWriter_1 = require("./psdWriter");
var descriptor_1 = require("./descriptor");
var engineData_1 = require("./engineData");
var text_1 = require("./text");
exports.infoHandlers = [];
exports.infoHandlersMap = {};
function addHandler(key, has, read, write) {
    var handler = { key: key, has: has, read: read, write: write };
    exports.infoHandlers.push(handler);
    exports.infoHandlersMap[handler.key] = handler;
}
function addHandlerAlias(key, target) {
    exports.infoHandlersMap[key] = exports.infoHandlersMap[target];
}
function hasKey(key) {
    return function (target) { return target[key] !== undefined; };
}
function readLength64(reader) {
    if (psdReader_1.readUint32(reader))
        throw new Error("Resource size above 4 GB limit at " + reader.offset.toString(16));
    return psdReader_1.readUint32(reader);
}
function writeLength64(writer, length) {
    psdWriter_1.writeUint32(writer, 0);
    psdWriter_1.writeUint32(writer, length);
}
addHandler('TySh', hasKey('text'), function (reader, target, leftBytes) {
    if (psdReader_1.readInt16(reader) !== 1)
        throw new Error("Invalid TySh version");
    var transform = [];
    for (var i = 0; i < 6; i++)
        transform.push(psdReader_1.readFloat64(reader));
    if (psdReader_1.readInt16(reader) !== 50)
        throw new Error("Invalid TySh text version");
    var text = descriptor_1.readVersionAndDescriptor(reader);
    if (psdReader_1.readInt16(reader) !== 1)
        throw new Error("Invalid TySh warp version");
    var warp = descriptor_1.readVersionAndDescriptor(reader);
    target.text = {
        transform: transform,
        left: psdReader_1.readFloat32(reader),
        top: psdReader_1.readFloat32(reader),
        right: psdReader_1.readFloat32(reader),
        bottom: psdReader_1.readFloat32(reader),
        text: text['Txt '].replace(/\r/g, '\n'),
        index: text.TextIndex || 0,
        gridding: descriptor_1.textGridding.decode(text.textGridding),
        antiAlias: descriptor_1.Annt.decode(text.AntA),
        orientation: descriptor_1.Ornt.decode(text.Ornt),
        warp: {
            style: descriptor_1.warpStyle.decode(warp.warpStyle),
            value: warp.warpValue || 0,
            perspective: warp.warpPerspective || 0,
            perspectiveOther: warp.warpPerspectiveOther || 0,
            rotate: descriptor_1.Ornt.decode(warp.warpRotate),
        },
    };
    if (text.EngineData) {
        var engineData = text_1.decodeEngineData(engineData_1.parseEngineData(text.EngineData));
        // const before = parseEngineData(text.EngineData);
        // const after = encodeEngineData(engineData);
        // require('fs').writeFileSync('before.txt', require('util').inspect(before, false, 99, false), 'utf8');
        // require('fs').writeFileSync('after.txt', require('util').inspect(after, false, 99, false), 'utf8');
        // console.log(require('util').inspect(parseEngineData(text.EngineData), false, 99, true));
        target.text = __assign(__assign({}, target.text), engineData);
        // console.log(require('util').inspect(target.text, false, 99, true));
    }
    psdReader_1.skipBytes(reader, leftBytes());
}, function (writer, target) {
    var text = target.text;
    var warp = text.warp || {};
    var transform = text.transform || [1, 0, 0, 1, 0, 0];
    var textDescriptor = {
        'Txt ': (text.text || '').replace(/\r?\n/g, '\r'),
        textGridding: descriptor_1.textGridding.encode(text.gridding),
        Ornt: descriptor_1.Ornt.encode(text.orientation),
        AntA: descriptor_1.Annt.encode(text.antiAlias),
        TextIndex: text.index || 0,
        EngineData: engineData_1.serializeEngineData(text_1.encodeEngineData(text)),
    };
    psdWriter_1.writeInt16(writer, 1); // version
    for (var i = 0; i < 6; i++) {
        psdWriter_1.writeFloat64(writer, transform[i]);
    }
    psdWriter_1.writeInt16(writer, 50); // text version
    descriptor_1.writeVersionAndDescriptor(writer, '', 'TxLr', textDescriptor);
    psdWriter_1.writeInt16(writer, 1); // warp version
    descriptor_1.writeVersionAndDescriptor(writer, '', 'warp', encodeWarp(warp));
    psdWriter_1.writeFloat32(writer, text.left);
    psdWriter_1.writeFloat32(writer, text.top);
    psdWriter_1.writeFloat32(writer, text.right);
    psdWriter_1.writeFloat32(writer, text.bottom);
    // writeZeros(writer, 2);
});
// vector fills
addHandler('SoCo', function (target) { return target.vectorFill !== undefined && target.vectorStroke === undefined &&
    target.vectorFill.type === 'color'; }, function (reader, target) {
    var descriptor = descriptor_1.readVersionAndDescriptor(reader);
    target.vectorFill = parseVectorContent(descriptor);
}, function (writer, target) {
    var descriptor = serializeVectorContent(target.vectorFill).descriptor;
    descriptor_1.writeVersionAndDescriptor(writer, '', 'null', descriptor);
});
addHandler('GdFl', function (target) { return target.vectorFill !== undefined && target.vectorStroke === undefined &&
    (target.vectorFill.type === 'solid' || target.vectorFill.type === 'noise'); }, function (reader, target, left) {
    var descriptor = descriptor_1.readVersionAndDescriptor(reader);
    target.vectorFill = parseVectorContent(descriptor);
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    var descriptor = serializeVectorContent(target.vectorFill).descriptor;
    descriptor_1.writeVersionAndDescriptor(writer, '', 'null', descriptor);
});
addHandler('PtFl', function (target) { return target.vectorFill !== undefined && target.vectorStroke === undefined &&
    target.vectorFill.type === 'pattern'; }, function (reader, target) {
    var descriptor = descriptor_1.readVersionAndDescriptor(reader);
    target.vectorFill = parseVectorContent(descriptor);
}, function (writer, target) {
    var descriptor = serializeVectorContent(target.vectorFill).descriptor;
    descriptor_1.writeVersionAndDescriptor(writer, '', 'null', descriptor);
});
addHandler('vscg', function (target) { return target.vectorFill !== undefined && target.vectorStroke !== undefined; }, function (reader, target, left) {
    psdReader_1.readSignature(reader); // key
    var desc = descriptor_1.readVersionAndDescriptor(reader);
    target.vectorFill = parseVectorContent(desc);
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    var _a = serializeVectorContent(target.vectorFill), descriptor = _a.descriptor, key = _a.key;
    psdWriter_1.writeSignature(writer, key);
    descriptor_1.writeVersionAndDescriptor(writer, '', 'null', descriptor);
});
function readBezierKnot(reader, width, height) {
    var y0 = psdReader_1.readFixedPointPath32(reader) * height;
    var x0 = psdReader_1.readFixedPointPath32(reader) * width;
    var y1 = psdReader_1.readFixedPointPath32(reader) * height;
    var x1 = psdReader_1.readFixedPointPath32(reader) * width;
    var y2 = psdReader_1.readFixedPointPath32(reader) * height;
    var x2 = psdReader_1.readFixedPointPath32(reader) * width;
    return [x0, y0, x1, y1, x2, y2];
}
exports.readBezierKnot = readBezierKnot;
function writeBezierKnot(writer, points, width, height) {
    psdWriter_1.writeFixedPointPath32(writer, points[1] / height); // y0
    psdWriter_1.writeFixedPointPath32(writer, points[0] / width); // x0
    psdWriter_1.writeFixedPointPath32(writer, points[3] / height); // y1
    psdWriter_1.writeFixedPointPath32(writer, points[2] / width); // x1
    psdWriter_1.writeFixedPointPath32(writer, points[5] / height); // y2
    psdWriter_1.writeFixedPointPath32(writer, points[4] / width); // x2
}
exports.booleanOperations = ['exclude', 'combine', 'subtract', 'intersect'];
function readVectorMask(reader, vectorMask, width, height, size) {
    var end = reader.offset + size;
    var paths = vectorMask.paths;
    var path = undefined;
    while ((end - reader.offset) >= 26) {
        var selector = psdReader_1.readUint16(reader);
        switch (selector) {
            case 0: // Closed subpath length record
            case 3: { // Open subpath length record
                psdReader_1.readUint16(reader); // count
                var boolOp = psdReader_1.readInt16(reader);
                psdReader_1.readUint16(reader); // always 1 ?
                psdReader_1.skipBytes(reader, 18);
                // TODO: 'combine' here might be wrong
                path = { open: selector === 3, operation: boolOp === -1 ? 'combine' : exports.booleanOperations[boolOp], knots: [] };
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
                psdReader_1.skipBytes(reader, 24);
                break;
            case 7: { // Clipboard record
                // TODO: check if these need to be multiplied by document size
                var top_1 = psdReader_1.readFixedPointPath32(reader);
                var left = psdReader_1.readFixedPointPath32(reader);
                var bottom = psdReader_1.readFixedPointPath32(reader);
                var right = psdReader_1.readFixedPointPath32(reader);
                var resolution = psdReader_1.readFixedPointPath32(reader);
                psdReader_1.skipBytes(reader, 4);
                vectorMask.clipboard = { top: top_1, left: left, bottom: bottom, right: right, resolution: resolution };
                break;
            }
            case 8: // Initial fill rule record
                vectorMask.fillStartsWithAllPixels = !!psdReader_1.readUint16(reader);
                psdReader_1.skipBytes(reader, 22);
                break;
            default: throw new Error('Invalid vmsk section');
        }
    }
    return paths;
}
exports.readVectorMask = readVectorMask;
addHandler('vmsk', hasKey('vectorMask'), function (reader, target, left, _a) {
    var width = _a.width, height = _a.height;
    if (psdReader_1.readUint32(reader) !== 3)
        throw new Error('Invalid vmsk version');
    target.vectorMask = { paths: [] };
    var vectorMask = target.vectorMask;
    var flags = psdReader_1.readUint32(reader);
    vectorMask.invert = (flags & 1) !== 0;
    vectorMask.notLink = (flags & 2) !== 0;
    vectorMask.disable = (flags & 4) !== 0;
    readVectorMask(reader, vectorMask, width, height, left());
    // drawBezierPaths(vectorMask.paths, width, height, 'out.png');
    psdReader_1.skipBytes(reader, left());
}, function (writer, target, _a) {
    var width = _a.width, height = _a.height;
    var vectorMask = target.vectorMask;
    var flags = (vectorMask.invert ? 1 : 0) |
        (vectorMask.notLink ? 2 : 0) |
        (vectorMask.disable ? 4 : 0);
    psdWriter_1.writeUint32(writer, 3); // version
    psdWriter_1.writeUint32(writer, flags);
    // initial entry
    psdWriter_1.writeUint16(writer, 6);
    psdWriter_1.writeZeros(writer, 24);
    var clipboard = vectorMask.clipboard;
    if (clipboard) {
        psdWriter_1.writeUint16(writer, 7);
        psdWriter_1.writeFixedPointPath32(writer, clipboard.top);
        psdWriter_1.writeFixedPointPath32(writer, clipboard.left);
        psdWriter_1.writeFixedPointPath32(writer, clipboard.bottom);
        psdWriter_1.writeFixedPointPath32(writer, clipboard.right);
        psdWriter_1.writeFixedPointPath32(writer, clipboard.resolution);
        psdWriter_1.writeZeros(writer, 4);
    }
    if (vectorMask.fillStartsWithAllPixels !== undefined) {
        psdWriter_1.writeUint16(writer, 8);
        psdWriter_1.writeUint16(writer, vectorMask.fillStartsWithAllPixels ? 1 : 0);
        psdWriter_1.writeZeros(writer, 22);
    }
    for (var _i = 0, _b = vectorMask.paths; _i < _b.length; _i++) {
        var path = _b[_i];
        psdWriter_1.writeUint16(writer, path.open ? 3 : 0);
        psdWriter_1.writeUint16(writer, path.knots.length);
        psdWriter_1.writeUint16(writer, Math.abs(exports.booleanOperations.indexOf(path.operation))); // default to 1 if not found
        psdWriter_1.writeUint16(writer, 1);
        psdWriter_1.writeZeros(writer, 18); // TODO: these are sometimes non-zero
        var linkedKnot = path.open ? 4 : 1;
        var unlinkedKnot = path.open ? 5 : 2;
        for (var _c = 0, _d = path.knots; _c < _d.length; _c++) {
            var _e = _d[_c], linked = _e.linked, points = _e.points;
            psdWriter_1.writeUint16(writer, linked ? linkedKnot : unlinkedKnot);
            writeBezierKnot(writer, points, width, height);
        }
    }
});
// TODO: need to write vmsk if has outline ?
addHandlerAlias('vsms', 'vmsk');
addHandler('vogk', hasKey('vectorOrigination'), function (reader, target, left) {
    if (psdReader_1.readInt32(reader) !== 1)
        throw new Error("Invalid vogk version");
    var desc = descriptor_1.readVersionAndDescriptor(reader);
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
                top: descriptor_1.parseUnits(i.keyOriginShapeBBox['Top ']),
                left: descriptor_1.parseUnits(i.keyOriginShapeBBox.Left),
                bottom: descriptor_1.parseUnits(i.keyOriginShapeBBox.Btom),
                right: descriptor_1.parseUnits(i.keyOriginShapeBBox.Rght),
            };
        }
        var rectRadii = i.keyOriginRRectRadii;
        if (rectRadii) {
            item.keyOriginRRectRadii = {
                topRight: descriptor_1.parseUnits(rectRadii.topRight),
                topLeft: descriptor_1.parseUnits(rectRadii.topLeft),
                bottomLeft: descriptor_1.parseUnits(rectRadii.bottomLeft),
                bottomRight: descriptor_1.parseUnits(rectRadii.bottomRight),
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
    psdReader_1.skipBytes(reader, left());
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
                    topRight: descriptor_1.unitsValue(radii.topRight, 'topRight'),
                    topLeft: descriptor_1.unitsValue(radii.topLeft, 'topLeft'),
                    bottomLeft: descriptor_1.unitsValue(radii.bottomLeft, 'bottomLeft'),
                    bottomRight: descriptor_1.unitsValue(radii.bottomRight, 'bottomRight'),
                };
            }
            var box = item.keyOriginShapeBoundingBox;
            if (box) {
                out.keyOriginShapeBBox = {
                    unitValueQuadVersion: 1,
                    'Top ': descriptor_1.unitsValue(box.top, 'top'),
                    Left: descriptor_1.unitsValue(box.left, 'left'),
                    Btom: descriptor_1.unitsValue(box.bottom, 'bottom'),
                    Rght: descriptor_1.unitsValue(box.right, 'right'),
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
    psdWriter_1.writeInt32(writer, 1); // version
    descriptor_1.writeVersionAndDescriptor(writer, '', 'null', desc);
});
addHandler('lmfx', function (target) { return target.effects !== undefined && hasMultiEffects(target.effects); }, function (reader, target, left, _, options) {
    var version = psdReader_1.readUint32(reader);
    if (version !== 0)
        throw new Error('Invalid lmfx version');
    var desc = descriptor_1.readVersionAndDescriptor(reader);
    // console.log(require('util').inspect(info, false, 99, true));
    // discard if read in 'lrFX' or 'lfx2' section
    target.effects = parseEffects(desc, !!options.logMissingFeatures);
    psdReader_1.skipBytes(reader, left());
}, function (writer, target, _, options) {
    var desc = serializeEffects(target.effects, !!options.logMissingFeatures, true);
    psdWriter_1.writeUint32(writer, 0); // version
    descriptor_1.writeVersionAndDescriptor(writer, '', 'null', desc);
});
addHandler('lrFX', hasKey('effects'), function (reader, target, left) {
    if (!target.effects)
        target.effects = effectsHelpers_1.readEffects(reader);
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    effectsHelpers_1.writeEffects(writer, target.effects);
});
addHandler('luni', hasKey('name'), function (reader, target, left) {
    target.name = psdReader_1.readUnicodeString(reader);
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    psdWriter_1.writeUnicodeString(writer, target.name);
    // writeUint16(writer, 0); // padding (but not extending string length)
});
addHandler('lnsr', hasKey('nameSource'), function (reader, target) { return target.nameSource = psdReader_1.readSignature(reader); }, function (writer, target) { return psdWriter_1.writeSignature(writer, target.nameSource); });
addHandler('lyid', hasKey('id'), function (reader, target) { return target.id = psdReader_1.readUint32(reader); }, function (writer, target, _psd, options) {
    var id = target.id;
    while (options.layerIds.indexOf(id) !== -1)
        id += 100; // make sure we don't have duplicate layer ids
    psdWriter_1.writeUint32(writer, id);
    options.layerIds.push(id);
});
addHandler('lsct', hasKey('sectionDivider'), function (reader, target, left) {
    target.sectionDivider = { type: psdReader_1.readUint32(reader) };
    if (left()) {
        psdReader_1.checkSignature(reader, '8BIM');
        target.sectionDivider.key = psdReader_1.readSignature(reader);
    }
    if (left()) {
        // 0 = normal
        // 1 = scene group, affects the animation timeline.
        target.sectionDivider.subType = psdReader_1.readUint32(reader);
    }
}, function (writer, target) {
    psdWriter_1.writeUint32(writer, target.sectionDivider.type);
    if (target.sectionDivider.key) {
        psdWriter_1.writeSignature(writer, '8BIM');
        psdWriter_1.writeSignature(writer, target.sectionDivider.key);
        if (target.sectionDivider.subType !== undefined) {
            psdWriter_1.writeUint32(writer, target.sectionDivider.subType);
        }
    }
});
// it seems lsdk is used when there's a layer is nested more than 6 levels, but I don't know why?
// maybe some limitation of old version of PS?
addHandlerAlias('lsdk', 'lsct');
addHandler('clbl', hasKey('blendClippendElements'), function (reader, target) {
    target.blendClippendElements = !!psdReader_1.readUint8(reader);
    psdReader_1.skipBytes(reader, 3);
}, function (writer, target) {
    psdWriter_1.writeUint8(writer, target.blendClippendElements ? 1 : 0);
    psdWriter_1.writeZeros(writer, 3);
});
addHandler('infx', hasKey('blendInteriorElements'), function (reader, target) {
    target.blendInteriorElements = !!psdReader_1.readUint8(reader);
    psdReader_1.skipBytes(reader, 3);
}, function (writer, target) {
    psdWriter_1.writeUint8(writer, target.blendInteriorElements ? 1 : 0);
    psdWriter_1.writeZeros(writer, 3);
});
addHandler('knko', hasKey('knockout'), function (reader, target) {
    target.knockout = !!psdReader_1.readUint8(reader);
    psdReader_1.skipBytes(reader, 3);
}, function (writer, target) {
    psdWriter_1.writeUint8(writer, target.knockout ? 1 : 0);
    psdWriter_1.writeZeros(writer, 3);
});
addHandler('lspf', hasKey('protected'), function (reader, target) {
    var flags = psdReader_1.readUint32(reader);
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
    psdWriter_1.writeUint32(writer, flags);
});
addHandler('lclr', hasKey('layerColor'), function (reader, target) {
    var color = psdReader_1.readUint16(reader);
    psdReader_1.skipBytes(reader, 6);
    target.layerColor = helpers_1.layerColors[color];
}, function (writer, target) {
    var index = helpers_1.layerColors.indexOf(target.layerColor);
    psdWriter_1.writeUint16(writer, index === -1 ? 0 : index);
    psdWriter_1.writeZeros(writer, 6);
});
addHandler('shmd', hasKey('timestamp'), function (reader, target, left, _, options) {
    var count = psdReader_1.readUint32(reader);
    var _loop_1 = function (i) {
        psdReader_1.checkSignature(reader, '8BIM');
        var key = psdReader_1.readSignature(reader);
        psdReader_1.readUint8(reader); // copy
        psdReader_1.skipBytes(reader, 3);
        psdReader_1.readSection(reader, 1, function (left) {
            if (key === 'cust') {
                var desc = descriptor_1.readVersionAndDescriptor(reader);
                if (desc.layerTime !== undefined)
                    target.timestamp = desc.layerTime;
            }
            else if (key === 'mlst') {
                var desc = descriptor_1.readVersionAndDescriptor(reader);
                options.logDevFeatures && console.log('mlst', desc);
                // options.logDevFeatures && console.log('mlst', require('util').inspect(desc, false, 99, true));
            }
            else if (key === 'mdyn') {
                // frame flags
                var unknown = psdReader_1.readUint16(reader);
                var propagate = psdReader_1.readUint8(reader);
                var flags = psdReader_1.readUint8(reader);
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
            psdReader_1.skipBytes(reader, left());
        });
    };
    for (var i = 0; i < count; i++) {
        _loop_1(i);
    }
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    var desc = {
        layerTime: target.timestamp,
    };
    psdWriter_1.writeUint32(writer, 1); // count
    psdWriter_1.writeSignature(writer, '8BIM');
    psdWriter_1.writeSignature(writer, 'cust');
    psdWriter_1.writeUint8(writer, 0); // copy (always false)
    psdWriter_1.writeZeros(writer, 3);
    psdWriter_1.writeSection(writer, 2, function () { return descriptor_1.writeVersionAndDescriptor(writer, '', 'metadata', desc); }, true);
});
addHandler('vstk', hasKey('vectorStroke'), function (reader, target, left) {
    var desc = descriptor_1.readVersionAndDescriptor(reader);
    // console.log(require('util').inspect(desc, false, 99, true));
    target.vectorStroke = {
        strokeEnabled: desc.strokeEnabled,
        fillEnabled: desc.fillEnabled,
        lineWidth: descriptor_1.parseUnits(desc.strokeStyleLineWidth),
        lineDashOffset: descriptor_1.parseUnits(desc.strokeStyleLineDashOffset),
        miterLimit: desc.strokeStyleMiterLimit,
        lineCapType: descriptor_1.strokeStyleLineCapType.decode(desc.strokeStyleLineCapType),
        lineJoinType: descriptor_1.strokeStyleLineJoinType.decode(desc.strokeStyleLineJoinType),
        lineAlignment: descriptor_1.strokeStyleLineAlignment.decode(desc.strokeStyleLineAlignment),
        scaleLock: desc.strokeStyleScaleLock,
        strokeAdjust: desc.strokeStyleStrokeAdjust,
        lineDashSet: desc.strokeStyleLineDashSet.map(descriptor_1.parseUnits),
        blendMode: descriptor_1.BlnM.decode(desc.strokeStyleBlendMode),
        opacity: descriptor_1.parsePercent(desc.strokeStyleOpacity),
        content: parseVectorContent(desc.strokeStyleContent),
        resolution: desc.strokeStyleResolution,
    };
    psdReader_1.skipBytes(reader, left());
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
        strokeStyleLineCapType: descriptor_1.strokeStyleLineCapType.encode(stroke.lineCapType),
        strokeStyleLineJoinType: descriptor_1.strokeStyleLineJoinType.encode(stroke.lineJoinType),
        strokeStyleLineAlignment: descriptor_1.strokeStyleLineAlignment.encode(stroke.lineAlignment),
        strokeStyleScaleLock: !!stroke.scaleLock,
        strokeStyleStrokeAdjust: !!stroke.strokeAdjust,
        strokeStyleLineDashSet: stroke.lineDashSet || [],
        strokeStyleBlendMode: descriptor_1.BlnM.encode(stroke.blendMode),
        strokeStyleOpacity: descriptor_1.unitsPercent((_b = stroke.opacity) !== null && _b !== void 0 ? _b : 1),
        strokeStyleContent: serializeVectorContent(stroke.content || { type: 'color', color: { r: 0, g: 0, b: 0 } }).descriptor,
        strokeStyleResolution: (_c = stroke.resolution) !== null && _c !== void 0 ? _c : 72,
    };
    descriptor_1.writeVersionAndDescriptor(writer, '', 'strokeStyle', descriptor);
});
addHandler('artb', // per-layer arboard info
hasKey('artboard'), function (reader, target, left) {
    var desc = descriptor_1.readVersionAndDescriptor(reader);
    var rect = desc.artboardRect;
    target.artboard = {
        rect: { top: rect['Top '], left: rect.Left, bottom: rect.Btom, right: rect.Rght },
        guideIndices: desc.guideIndeces,
        presetName: desc.artboardPresetName,
        color: parseColor(desc['Clr ']),
        backgroundType: desc.artboardBackgroundType,
    };
    psdReader_1.skipBytes(reader, left());
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
    descriptor_1.writeVersionAndDescriptor(writer, '', 'artboard', desc);
});
addHandler('sn2P', hasKey('usingAlignedRendering'), function (reader, target) { return target.usingAlignedRendering = !!psdReader_1.readUint32(reader); }, function (writer, target) { return psdWriter_1.writeUint32(writer, target.usingAlignedRendering ? 1 : 0); });
var placedLayerTypes = ['unknown', 'vector', 'raster', 'image stack'];
function parseWarp(warp) {
    var _a, _b, _c, _d, _e, _f;
    var result = {
        style: descriptor_1.warpStyle.decode(warp.warpStyle),
        value: warp.warpValue || 0,
        perspective: warp.warpPerspective || 0,
        perspectiveOther: warp.warpPerspectiveOther || 0,
        rotate: descriptor_1.Ornt.decode(warp.warpRotate),
        bounds: warp.bounds && {
            top: descriptor_1.parseUnitsOrNumber(warp.bounds['Top ']),
            left: descriptor_1.parseUnitsOrNumber(warp.bounds.Left),
            bottom: descriptor_1.parseUnitsOrNumber(warp.bounds.Btom),
            right: descriptor_1.parseUnitsOrNumber(warp.bounds.Rght),
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
        warpStyle: descriptor_1.warpStyle.encode(warp.style),
        warpValue: warp.value || 0,
        warpPerspective: warp.perspective || 0,
        warpPerspectiveOther: warp.perspectiveOther || 0,
        warpRotate: descriptor_1.Ornt.encode(warp.rotate),
        bounds: {
            'Top ': descriptor_1.unitsValue(bounds && bounds.top || { units: 'Pixels', value: 0 }, 'bounds.top'),
            Left: descriptor_1.unitsValue(bounds && bounds.left || { units: 'Pixels', value: 0 }, 'bounds.left'),
            Btom: descriptor_1.unitsValue(bounds && bounds.bottom || { units: 'Pixels', value: 0 }, 'bounds.bottom'),
            Rght: descriptor_1.unitsValue(bounds && bounds.right || { units: 'Pixels', value: 0 }, 'bounds.right'),
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
    if (psdReader_1.readSignature(reader) !== 'plcL')
        throw new Error("Invalid PlLd signature");
    if (psdReader_1.readInt32(reader) !== 3)
        throw new Error("Invalid PlLd version");
    var id = psdReader_1.readPascalString(reader, 1);
    psdReader_1.readInt32(reader); // pageNumber
    psdReader_1.readInt32(reader); // totalPages, TODO: check how this works ?
    psdReader_1.readInt32(reader); // anitAliasPolicy 16
    var placedLayerType = psdReader_1.readInt32(reader); // 0 = unknown, 1 = vector, 2 = raster, 3 = image stack
    if (!placedLayerTypes[placedLayerType])
        throw new Error('Invalid PlLd type');
    var transform = [];
    for (var i = 0; i < 8; i++)
        transform.push(psdReader_1.readFloat64(reader)); // x, y of 4 corners of the transform
    var warpVersion = psdReader_1.readInt32(reader);
    if (warpVersion !== 0)
        throw new Error("Invalid Warp version " + warpVersion);
    var warp = descriptor_1.readVersionAndDescriptor(reader);
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
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    var placed = target.placedLayer;
    psdWriter_1.writeSignature(writer, 'plcL');
    psdWriter_1.writeInt32(writer, 3); // version
    psdWriter_1.writePascalString(writer, placed.id, 1);
    psdWriter_1.writeInt32(writer, 1); // pageNumber
    psdWriter_1.writeInt32(writer, 1); // totalPages
    psdWriter_1.writeInt32(writer, 16); // anitAliasPolicy
    if (placedLayerTypes.indexOf(placed.type) === -1)
        throw new Error('Invalid placedLayer type');
    psdWriter_1.writeInt32(writer, placedLayerTypes.indexOf(placed.type));
    for (var i = 0; i < 8; i++)
        psdWriter_1.writeFloat64(writer, placed.transform[i]);
    psdWriter_1.writeInt32(writer, 0); // warp version
    var isQuilt = placed.warp && isQuiltWarp(placed.warp);
    var type = isQuilt ? 'quiltWarp' : 'warp';
    descriptor_1.writeVersionAndDescriptor(writer, '', type, encodeWarp(placed.warp || {}), type);
});
addHandler('SoLd', hasKey('placedLayer'), function (reader, target, left) {
    if (psdReader_1.readSignature(reader) !== 'soLD')
        throw new Error("Invalid SoLd type");
    if (psdReader_1.readInt32(reader) !== 4)
        throw new Error("Invalid SoLd version");
    var desc = descriptor_1.readVersionAndDescriptor(reader);
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
        resolution: descriptor_1.parseUnits(desc.Rslt),
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
    psdReader_1.skipBytes(reader, left()); // HACK
}, function (writer, target) {
    var _a, _b;
    psdWriter_1.writeSignature(writer, 'soLD');
    psdWriter_1.writeInt32(writer, 4); // version
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
        }, Rslt: placed.resolution ? descriptor_1.unitsValue(placed.resolution, 'resolution') : { units: 'Density', value: 72 } });
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
    descriptor_1.writeVersionAndDescriptor(writer, '', 'null', desc, desc.quiltWarp ? 'quiltWarp' : 'warp');
});
addHandler('fxrp', hasKey('referencePoint'), function (reader, target) {
    target.referencePoint = {
        x: psdReader_1.readFloat64(reader),
        y: psdReader_1.readFloat64(reader),
    };
}, function (writer, target) {
    psdWriter_1.writeFloat64(writer, target.referencePoint.x);
    psdWriter_1.writeFloat64(writer, target.referencePoint.y);
});
if (helpers_1.MOCK_HANDLERS) {
    addHandler('Patt', function (target) { return target._Patt !== undefined; }, function (reader, target, left) {
        // console.log('additional info: Patt');
        target._Patt = psdReader_1.readBytes(reader, left());
    }, function (writer, target) { return false && psdWriter_1.writeBytes(writer, target._Patt); });
}
else {
    addHandler('Patt', // TODO: handle also Pat2 & Pat3
    function (// TODO: handle also Pat2 & Pat3
    target) { return !target; }, function (reader, target, left) {
        if (!left())
            return;
        psdReader_1.skipBytes(reader, left());
        return; // not supported yet
        target;
        psdReader_1.readPattern;
        // if (!target.patterns) target.patterns = [];
        // target.patterns.push(readPattern(reader));
        // skipBytes(reader, left());
    }, function (_writer, _target) {
    });
}
function readRect(reader) {
    var top = psdReader_1.readInt32(reader);
    var left = psdReader_1.readInt32(reader);
    var bottom = psdReader_1.readInt32(reader);
    var right = psdReader_1.readInt32(reader);
    return { top: top, left: left, bottom: bottom, right: right };
}
function writeRect(writer, rect) {
    psdWriter_1.writeInt32(writer, rect.top);
    psdWriter_1.writeInt32(writer, rect.left);
    psdWriter_1.writeInt32(writer, rect.bottom);
    psdWriter_1.writeInt32(writer, rect.right);
}
addHandler('Anno', function (target) { return target.annotations !== undefined; }, function (reader, target, left) {
    var major = psdReader_1.readUint16(reader);
    var minor = psdReader_1.readUint16(reader);
    if (major !== 2 || minor !== 1)
        throw new Error('Invalid Anno version');
    var count = psdReader_1.readUint32(reader);
    var annotations = [];
    for (var i = 0; i < count; i++) {
        /*const length =*/ psdReader_1.readUint32(reader);
        var type = psdReader_1.readSignature(reader);
        var open_1 = !!psdReader_1.readUint8(reader);
        /*const flags =*/ psdReader_1.readUint8(reader); // always 28
        /*const optionalBlocks =*/ psdReader_1.readUint16(reader);
        var iconLocation = readRect(reader);
        var popupLocation = readRect(reader);
        var color = psdReader_1.readColor(reader);
        var author = psdReader_1.readPascalString(reader, 2);
        var name_1 = psdReader_1.readPascalString(reader, 2);
        var date = psdReader_1.readPascalString(reader, 2);
        /*const contentLength =*/ psdReader_1.readUint32(reader);
        /*const dataType =*/ psdReader_1.readSignature(reader);
        var dataLength = psdReader_1.readUint32(reader);
        var data = void 0;
        if (type === 'txtA') {
            if (dataLength >= 2 && psdReader_1.readUint16(reader) === 0xfeff) {
                data = psdReader_1.readUnicodeStringWithLength(reader, (dataLength - 2) / 2);
            }
            else {
                reader.offset -= 2;
                data = psdReader_1.readAsciiString(reader, dataLength);
            }
            data = data.replace(/\r/g, '\n');
        }
        else if (type === 'sndA') {
            data = psdReader_1.readBytes(reader, dataLength);
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
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    var annotations = target.annotations;
    psdWriter_1.writeUint16(writer, 2);
    psdWriter_1.writeUint16(writer, 1);
    psdWriter_1.writeUint32(writer, annotations.length);
    for (var _i = 0, annotations_1 = annotations; _i < annotations_1.length; _i++) {
        var annotation = annotations_1[_i];
        var sound = annotation.type === 'sound';
        if (sound && !(annotation.data instanceof Uint8Array))
            throw new Error('Sound annotation data should be Uint8Array');
        if (!sound && typeof annotation.data !== 'string')
            throw new Error('Text annotation data should be string');
        var lengthOffset = writer.offset;
        psdWriter_1.writeUint32(writer, 0); // length
        psdWriter_1.writeSignature(writer, sound ? 'sndA' : 'txtA');
        psdWriter_1.writeUint8(writer, annotation.open ? 1 : 0);
        psdWriter_1.writeUint8(writer, 28);
        psdWriter_1.writeUint16(writer, 1);
        writeRect(writer, annotation.iconLocation);
        writeRect(writer, annotation.popupLocation);
        psdWriter_1.writeColor(writer, annotation.color);
        psdWriter_1.writePascalString(writer, annotation.author || '', 2);
        psdWriter_1.writePascalString(writer, annotation.name || '', 2);
        psdWriter_1.writePascalString(writer, annotation.date || '', 2);
        var contentOffset = writer.offset;
        psdWriter_1.writeUint32(writer, 0); // content length
        psdWriter_1.writeSignature(writer, sound ? 'sndM' : 'txtC');
        psdWriter_1.writeUint32(writer, 0); // data length
        var dataOffset = writer.offset;
        if (sound) {
            psdWriter_1.writeBytes(writer, annotation.data);
        }
        else {
            psdWriter_1.writeUint16(writer, 0xfeff); // unicode string indicator
            var text = annotation.data.replace(/\n/g, '\r');
            for (var i = 0; i < text.length; i++)
                psdWriter_1.writeUint16(writer, text.charCodeAt(i));
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
        var type = psdReader_1.readSignature(reader);
        var version = psdReader_1.readInt32(reader);
        var id = psdReader_1.readPascalString(reader, 1);
        var name_2 = psdReader_1.readUnicodeString(reader);
        var fileType = psdReader_1.readSignature(reader).trim(); // '    ' if empty
        var fileCreator = psdReader_1.readSignature(reader).trim(); // '    ' or '\0\0\0\0' if empty
        var dataSize = readLength64(reader);
        var hasFileOpenDescriptor = psdReader_1.readUint8(reader);
        var fileOpenDescriptor = hasFileOpenDescriptor ? descriptor_1.readVersionAndDescriptor(reader) : undefined;
        var linkedFileDescriptor = type === 'liFE' ? descriptor_1.readVersionAndDescriptor(reader) : undefined;
        var file = { id: id, name: name_2, data: undefined };
        if (fileType)
            file.type = fileType;
        if (fileCreator)
            file.creator = fileCreator;
        if (fileOpenDescriptor)
            file.descriptor = fileOpenDescriptor;
        if (type === 'liFE' && version > 3) {
            var year = psdReader_1.readInt32(reader);
            var month = psdReader_1.readUint8(reader);
            var day = psdReader_1.readUint8(reader);
            var hour = psdReader_1.readUint8(reader);
            var minute = psdReader_1.readUint8(reader);
            var seconds = psdReader_1.readFloat64(reader);
            var wholeSeconds = Math.floor(seconds);
            var ms = (seconds - wholeSeconds) * 1000;
            file.time = new Date(year, month, day, hour, minute, wholeSeconds, ms);
        }
        var fileSize = type === 'liFE' ? readLength64(reader) : 0;
        if (type === 'liFA')
            psdReader_1.skipBytes(reader, 8);
        if (type === 'liFD')
            file.data = psdReader_1.readBytes(reader, dataSize);
        if (version >= 5)
            file.childDocumentID = psdReader_1.readUnicodeString(reader);
        if (version >= 6)
            file.assetModTime = psdReader_1.readFloat64(reader);
        if (version >= 7)
            file.assetLockedState = psdReader_1.readUint8(reader);
        if (type === 'liFE')
            file.data = psdReader_1.readBytes(reader, fileSize);
        if (options.skipLinkedFilesData)
            file.data = undefined;
        psd.linkedFiles.push(file);
        linkedFileDescriptor;
        while (size % 4)
            size++;
        reader.offset = startOffset + size;
    }
    psdReader_1.skipBytes(reader, left()); // ?
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
        psdWriter_1.writeUint32(writer, 0);
        psdWriter_1.writeUint32(writer, 0); // size
        var sizeOffset = writer.offset;
        psdWriter_1.writeSignature(writer, file.data ? 'liFD' : 'liFA');
        psdWriter_1.writeInt32(writer, version);
        psdWriter_1.writePascalString(writer, file.id || '', 1);
        psdWriter_1.writeUnicodeStringWithPadding(writer, file.name || '');
        psdWriter_1.writeSignature(writer, file.type ? (file.type + "    ").substring(0, 4) : '    ');
        psdWriter_1.writeSignature(writer, file.creator ? (file.creator + "    ").substring(0, 4) : '\0\0\0\0');
        writeLength64(writer, file.data ? file.data.byteLength : 0);
        if (file.descriptor && file.descriptor.compInfo) {
            var desc = {
                compInfo: file.descriptor.compInfo,
            };
            psdWriter_1.writeUint8(writer, 1);
            descriptor_1.writeVersionAndDescriptor(writer, '', 'null', desc);
        }
        else {
            psdWriter_1.writeUint8(writer, 0);
        }
        if (file.data)
            psdWriter_1.writeBytes(writer, file.data);
        else
            writeLength64(writer, 0);
        if (version >= 5)
            psdWriter_1.writeUnicodeStringWithPadding(writer, file.childDocumentID || '');
        if (version >= 6)
            psdWriter_1.writeFloat64(writer, file.assetModTime || 0);
        if (version >= 7)
            psdWriter_1.writeUint8(writer, file.assetLockedState || 0);
        var size = writer.offset - sizeOffset;
        writer.view.setUint32(sizeOffset - 4, size, false); // write size
        while (size % 4) {
            size++;
            psdWriter_1.writeUint8(writer, 0);
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
    if (helpers_1.MOCK_HANDLERS) {
        target._lnkE = psdReader_1.readBytes(reader, left());
    }
}, function (writer, target) { return helpers_1.MOCK_HANDLERS && psdWriter_1.writeBytes(writer, target._lnkE); });
addHandler('pths', hasKey('pathList'), function (reader, target) {
    var descriptor = descriptor_1.readVersionAndDescriptor(reader);
    target.pathList = []; // TODO: read paths (find example with non-empty list)
    descriptor;
    // console.log('pths', descriptor); // TODO: remove this
}, function (writer, _target) {
    var descriptor = {
        pathList: [], // TODO: write paths
    };
    descriptor_1.writeVersionAndDescriptor(writer, '', 'pathsDataClass', descriptor);
});
addHandler('lyvr', hasKey('version'), function (reader, target) { return target.version = psdReader_1.readUint32(reader); }, function (writer, target) { return psdWriter_1.writeUint32(writer, target.version); });
function adjustmentType(type) {
    return function (target) { return !!target.adjustment && target.adjustment.type === type; };
}
addHandler('brit', adjustmentType('brightness/contrast'), function (reader, target, left) {
    if (!target.adjustment) { // ignore if got one from CgEd block
        target.adjustment = {
            type: 'brightness/contrast',
            brightness: psdReader_1.readInt16(reader),
            contrast: psdReader_1.readInt16(reader),
            meanValue: psdReader_1.readInt16(reader),
            labColorOnly: !!psdReader_1.readUint8(reader),
            useLegacy: true,
        };
    }
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    var _a;
    var info = target.adjustment;
    psdWriter_1.writeInt16(writer, info.brightness || 0);
    psdWriter_1.writeInt16(writer, info.contrast || 0);
    psdWriter_1.writeInt16(writer, (_a = info.meanValue) !== null && _a !== void 0 ? _a : 127);
    psdWriter_1.writeUint8(writer, info.labColorOnly ? 1 : 0);
    psdWriter_1.writeZeros(writer, 1);
});
function readLevelsChannel(reader) {
    var shadowInput = psdReader_1.readInt16(reader);
    var highlightInput = psdReader_1.readInt16(reader);
    var shadowOutput = psdReader_1.readInt16(reader);
    var highlightOutput = psdReader_1.readInt16(reader);
    var midtoneInput = psdReader_1.readInt16(reader) / 100;
    return { shadowInput: shadowInput, highlightInput: highlightInput, shadowOutput: shadowOutput, highlightOutput: highlightOutput, midtoneInput: midtoneInput };
}
function writeLevelsChannel(writer, channel) {
    psdWriter_1.writeInt16(writer, channel.shadowInput);
    psdWriter_1.writeInt16(writer, channel.highlightInput);
    psdWriter_1.writeInt16(writer, channel.shadowOutput);
    psdWriter_1.writeInt16(writer, channel.highlightOutput);
    psdWriter_1.writeInt16(writer, Math.round(channel.midtoneInput * 100));
}
addHandler('levl', adjustmentType('levels'), function (reader, target, left) {
    if (psdReader_1.readUint16(reader) !== 2)
        throw new Error('Invalid levl version');
    target.adjustment = __assign(__assign({}, target.adjustment), { type: 'levels', rgb: readLevelsChannel(reader), red: readLevelsChannel(reader), green: readLevelsChannel(reader), blue: readLevelsChannel(reader) });
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    var info = target.adjustment;
    var defaultChannel = {
        shadowInput: 0,
        highlightInput: 255,
        shadowOutput: 0,
        highlightOutput: 255,
        midtoneInput: 1,
    };
    psdWriter_1.writeUint16(writer, 2); // version
    writeLevelsChannel(writer, info.rgb || defaultChannel);
    writeLevelsChannel(writer, info.red || defaultChannel);
    writeLevelsChannel(writer, info.blue || defaultChannel);
    writeLevelsChannel(writer, info.green || defaultChannel);
    for (var i = 0; i < 59; i++)
        writeLevelsChannel(writer, defaultChannel);
});
function readCurveChannel(reader) {
    var nodes = psdReader_1.readUint16(reader);
    var channel = [];
    for (var j = 0; j < nodes; j++) {
        var output = psdReader_1.readInt16(reader);
        var input = psdReader_1.readInt16(reader);
        channel.push({ input: input, output: output });
    }
    return channel;
}
function writeCurveChannel(writer, channel) {
    psdWriter_1.writeUint16(writer, channel.length);
    for (var _i = 0, channel_1 = channel; _i < channel_1.length; _i++) {
        var n = channel_1[_i];
        psdWriter_1.writeUint16(writer, n.output);
        psdWriter_1.writeUint16(writer, n.input);
    }
}
addHandler('curv', adjustmentType('curves'), function (reader, target, left) {
    psdReader_1.readUint8(reader);
    if (psdReader_1.readUint16(reader) !== 1)
        throw new Error('Invalid curv version');
    psdReader_1.readUint16(reader);
    var channels = psdReader_1.readUint16(reader);
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
    psdReader_1.skipBytes(reader, left());
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
    psdWriter_1.writeUint8(writer, 0);
    psdWriter_1.writeUint16(writer, 1); // version
    psdWriter_1.writeUint16(writer, 0);
    psdWriter_1.writeUint16(writer, channels);
    if (rgb && rgb.length)
        writeCurveChannel(writer, rgb);
    if (red && red.length)
        writeCurveChannel(writer, red);
    if (green && green.length)
        writeCurveChannel(writer, green);
    if (blue && blue.length)
        writeCurveChannel(writer, blue);
    psdWriter_1.writeSignature(writer, 'Crv ');
    psdWriter_1.writeUint16(writer, 4); // version
    psdWriter_1.writeUint16(writer, 0);
    psdWriter_1.writeUint16(writer, channelCount);
    if (rgb && rgb.length) {
        psdWriter_1.writeUint16(writer, 0);
        writeCurveChannel(writer, rgb);
    }
    if (red && red.length) {
        psdWriter_1.writeUint16(writer, 1);
        writeCurveChannel(writer, red);
    }
    if (green && green.length) {
        psdWriter_1.writeUint16(writer, 2);
        writeCurveChannel(writer, green);
    }
    if (blue && blue.length) {
        psdWriter_1.writeUint16(writer, 3);
        writeCurveChannel(writer, blue);
    }
    psdWriter_1.writeZeros(writer, 2);
});
addHandler('expA', adjustmentType('exposure'), function (reader, target, left) {
    if (psdReader_1.readUint16(reader) !== 1)
        throw new Error('Invalid expA version');
    target.adjustment = __assign(__assign({}, target.adjustment), { type: 'exposure', exposure: psdReader_1.readFloat32(reader), offset: psdReader_1.readFloat32(reader), gamma: psdReader_1.readFloat32(reader) });
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    var info = target.adjustment;
    psdWriter_1.writeUint16(writer, 1); // version
    psdWriter_1.writeFloat32(writer, info.exposure);
    psdWriter_1.writeFloat32(writer, info.offset);
    psdWriter_1.writeFloat32(writer, info.gamma);
    psdWriter_1.writeZeros(writer, 2);
});
addHandler('vibA', adjustmentType('vibrance'), function (reader, target, left) {
    var desc = descriptor_1.readVersionAndDescriptor(reader);
    target.adjustment = { type: 'vibrance' };
    if (desc.vibrance !== undefined)
        target.adjustment.vibrance = desc.vibrance;
    if (desc.Strt !== undefined)
        target.adjustment.saturation = desc.Strt;
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    var info = target.adjustment;
    var desc = {};
    if (info.vibrance !== undefined)
        desc.vibrance = info.vibrance;
    if (info.saturation !== undefined)
        desc.Strt = info.saturation;
    descriptor_1.writeVersionAndDescriptor(writer, '', 'null', desc);
});
function readHueChannel(reader) {
    return {
        a: psdReader_1.readInt16(reader),
        b: psdReader_1.readInt16(reader),
        c: psdReader_1.readInt16(reader),
        d: psdReader_1.readInt16(reader),
        hue: psdReader_1.readInt16(reader),
        saturation: psdReader_1.readInt16(reader),
        lightness: psdReader_1.readInt16(reader),
    };
}
function writeHueChannel(writer, channel) {
    var c = channel || {};
    psdWriter_1.writeInt16(writer, c.a || 0);
    psdWriter_1.writeInt16(writer, c.b || 0);
    psdWriter_1.writeInt16(writer, c.c || 0);
    psdWriter_1.writeInt16(writer, c.d || 0);
    psdWriter_1.writeInt16(writer, c.hue || 0);
    psdWriter_1.writeInt16(writer, c.saturation || 0);
    psdWriter_1.writeInt16(writer, c.lightness || 0);
}
addHandler('hue2', adjustmentType('hue/saturation'), function (reader, target, left) {
    if (psdReader_1.readUint16(reader) !== 2)
        throw new Error('Invalid hue2 version');
    target.adjustment = __assign(__assign({}, target.adjustment), { type: 'hue/saturation', master: readHueChannel(reader), reds: readHueChannel(reader), yellows: readHueChannel(reader), greens: readHueChannel(reader), cyans: readHueChannel(reader), blues: readHueChannel(reader), magentas: readHueChannel(reader) });
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    var info = target.adjustment;
    psdWriter_1.writeUint16(writer, 2); // version
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
        cyanRed: psdReader_1.readInt16(reader),
        magentaGreen: psdReader_1.readInt16(reader),
        yellowBlue: psdReader_1.readInt16(reader),
    };
}
function writeColorBalance(writer, value) {
    psdWriter_1.writeInt16(writer, value.cyanRed || 0);
    psdWriter_1.writeInt16(writer, value.magentaGreen || 0);
    psdWriter_1.writeInt16(writer, value.yellowBlue || 0);
}
addHandler('blnc', adjustmentType('color balance'), function (reader, target, left) {
    target.adjustment = {
        type: 'color balance',
        shadows: readColorBalance(reader),
        midtones: readColorBalance(reader),
        highlights: readColorBalance(reader),
        preserveLuminosity: !!psdReader_1.readUint8(reader),
    };
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    var info = target.adjustment;
    writeColorBalance(writer, info.shadows || {});
    writeColorBalance(writer, info.midtones || {});
    writeColorBalance(writer, info.highlights || {});
    psdWriter_1.writeUint8(writer, info.preserveLuminosity ? 1 : 0);
    psdWriter_1.writeZeros(writer, 1);
});
addHandler('blwh', adjustmentType('black & white'), function (reader, target, left) {
    var desc = descriptor_1.readVersionAndDescriptor(reader);
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
    psdReader_1.skipBytes(reader, left());
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
    descriptor_1.writeVersionAndDescriptor(writer, '', 'null', desc);
});
addHandler('phfl', adjustmentType('photo filter'), function (reader, target, left) {
    var version = psdReader_1.readUint16(reader);
    if (version !== 2 && version !== 3)
        throw new Error('Invalid phfl version');
    var color;
    if (version === 2) {
        color = psdReader_1.readColor(reader);
    }
    else { // version 3
        // TODO: test this, this is probably wrong
        color = {
            l: psdReader_1.readInt32(reader) / 100,
            a: psdReader_1.readInt32(reader) / 100,
            b: psdReader_1.readInt32(reader) / 100,
        };
    }
    target.adjustment = {
        type: 'photo filter',
        color: color,
        density: psdReader_1.readUint32(reader) / 100,
        preserveLuminosity: !!psdReader_1.readUint8(reader),
    };
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    var info = target.adjustment;
    psdWriter_1.writeUint16(writer, 2); // version
    psdWriter_1.writeColor(writer, info.color || { l: 0, a: 0, b: 0 });
    psdWriter_1.writeUint32(writer, (info.density || 0) * 100);
    psdWriter_1.writeUint8(writer, info.preserveLuminosity ? 1 : 0);
    psdWriter_1.writeZeros(writer, 3);
});
function readMixrChannel(reader) {
    var red = psdReader_1.readInt16(reader);
    var green = psdReader_1.readInt16(reader);
    var blue = psdReader_1.readInt16(reader);
    psdReader_1.skipBytes(reader, 2);
    var constant = psdReader_1.readInt16(reader);
    return { red: red, green: green, blue: blue, constant: constant };
}
function writeMixrChannel(writer, channel) {
    var c = channel || {};
    psdWriter_1.writeInt16(writer, c.red);
    psdWriter_1.writeInt16(writer, c.green);
    psdWriter_1.writeInt16(writer, c.blue);
    psdWriter_1.writeZeros(writer, 2);
    psdWriter_1.writeInt16(writer, c.constant);
}
addHandler('mixr', adjustmentType('channel mixer'), function (reader, target, left) {
    if (psdReader_1.readUint16(reader) !== 1)
        throw new Error('Invalid mixr version');
    var adjustment = target.adjustment = __assign(__assign({}, target.adjustment), { type: 'channel mixer', monochrome: !!psdReader_1.readUint16(reader) });
    if (!adjustment.monochrome) {
        adjustment.red = readMixrChannel(reader);
        adjustment.green = readMixrChannel(reader);
        adjustment.blue = readMixrChannel(reader);
    }
    adjustment.gray = readMixrChannel(reader);
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    var info = target.adjustment;
    psdWriter_1.writeUint16(writer, 1); // version
    psdWriter_1.writeUint16(writer, info.monochrome ? 1 : 0);
    if (info.monochrome) {
        writeMixrChannel(writer, info.gray);
        psdWriter_1.writeZeros(writer, 3 * 5 * 2);
    }
    else {
        writeMixrChannel(writer, info.red);
        writeMixrChannel(writer, info.green);
        writeMixrChannel(writer, info.blue);
        writeMixrChannel(writer, info.gray);
    }
});
var colorLookupType = helpers_1.createEnum('colorLookupType', '3DLUT', {
    '3dlut': '3DLUT',
    abstractProfile: 'abstractProfile',
    deviceLinkProfile: 'deviceLinkProfile',
});
var LUTFormatType = helpers_1.createEnum('LUTFormatType', 'look', {
    look: 'LUTFormatLOOK',
    cube: 'LUTFormatCUBE',
    '3dl': 'LUTFormat3DL',
});
var colorLookupOrder = helpers_1.createEnum('colorLookupOrder', 'rgb', {
    rgb: 'rgbOrder',
    bgr: 'bgrOrder',
});
addHandler('clrL', adjustmentType('color lookup'), function (reader, target, left) {
    if (psdReader_1.readUint16(reader) !== 1)
        throw new Error('Invalid clrL version');
    var desc = descriptor_1.readVersionAndDescriptor(reader);
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
    psdReader_1.skipBytes(reader, left());
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
    psdWriter_1.writeUint16(writer, 1); // version
    descriptor_1.writeVersionAndDescriptor(writer, '', 'null', desc);
});
addHandler('nvrt', adjustmentType('invert'), function (reader, target, left) {
    target.adjustment = { type: 'invert' };
    psdReader_1.skipBytes(reader, left());
}, function () {
    // nothing to write here
});
addHandler('post', adjustmentType('posterize'), function (reader, target, left) {
    target.adjustment = {
        type: 'posterize',
        levels: psdReader_1.readUint16(reader),
    };
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    var _a;
    var info = target.adjustment;
    psdWriter_1.writeUint16(writer, (_a = info.levels) !== null && _a !== void 0 ? _a : 4);
    psdWriter_1.writeZeros(writer, 2);
});
addHandler('thrs', adjustmentType('threshold'), function (reader, target, left) {
    target.adjustment = {
        type: 'threshold',
        level: psdReader_1.readUint16(reader),
    };
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    var _a;
    var info = target.adjustment;
    psdWriter_1.writeUint16(writer, (_a = info.level) !== null && _a !== void 0 ? _a : 128);
    psdWriter_1.writeZeros(writer, 2);
});
var grdmColorModels = ['', '', '', 'rgb', 'hsb', '', 'lab'];
addHandler('grdm', adjustmentType('gradient map'), function (reader, target, left) {
    if (psdReader_1.readUint16(reader) !== 1)
        throw new Error('Invalid grdm version');
    var info = {
        type: 'gradient map',
        gradientType: 'solid',
    };
    info.reverse = !!psdReader_1.readUint8(reader);
    info.dither = !!psdReader_1.readUint8(reader);
    info.name = psdReader_1.readUnicodeString(reader);
    info.colorStops = [];
    info.opacityStops = [];
    var stopsCount = psdReader_1.readUint16(reader);
    for (var i = 0; i < stopsCount; i++) {
        info.colorStops.push({
            location: psdReader_1.readUint32(reader),
            midpoint: psdReader_1.readUint32(reader) / 100,
            color: psdReader_1.readColor(reader),
        });
        psdReader_1.skipBytes(reader, 2);
    }
    var opacityStopsCount = psdReader_1.readUint16(reader);
    for (var i = 0; i < opacityStopsCount; i++) {
        info.opacityStops.push({
            location: psdReader_1.readUint32(reader),
            midpoint: psdReader_1.readUint32(reader) / 100,
            opacity: psdReader_1.readUint16(reader) / 0xff,
        });
    }
    var expansionCount = psdReader_1.readUint16(reader);
    if (expansionCount !== 2)
        throw new Error('Invalid grdm expansion count');
    var interpolation = psdReader_1.readUint16(reader);
    info.smoothness = interpolation / 4096;
    var length = psdReader_1.readUint16(reader);
    if (length !== 32)
        throw new Error('Invalid grdm length');
    info.gradientType = psdReader_1.readUint16(reader) ? 'noise' : 'solid';
    info.randomSeed = psdReader_1.readUint32(reader);
    info.addTransparency = !!psdReader_1.readUint16(reader);
    info.restrictColors = !!psdReader_1.readUint16(reader);
    info.roughness = psdReader_1.readUint32(reader) / 4096;
    info.colorModel = (grdmColorModels[psdReader_1.readUint16(reader)] || 'rgb');
    info.min = [
        psdReader_1.readUint16(reader) / 0x8000,
        psdReader_1.readUint16(reader) / 0x8000,
        psdReader_1.readUint16(reader) / 0x8000,
        psdReader_1.readUint16(reader) / 0x8000,
    ];
    info.max = [
        psdReader_1.readUint16(reader) / 0x8000,
        psdReader_1.readUint16(reader) / 0x8000,
        psdReader_1.readUint16(reader) / 0x8000,
        psdReader_1.readUint16(reader) / 0x8000,
    ];
    psdReader_1.skipBytes(reader, left());
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
    psdWriter_1.writeUint16(writer, 1); // version
    psdWriter_1.writeUint8(writer, info.reverse ? 1 : 0);
    psdWriter_1.writeUint8(writer, info.dither ? 1 : 0);
    psdWriter_1.writeUnicodeStringWithPadding(writer, info.name || '');
    psdWriter_1.writeUint16(writer, info.colorStops && info.colorStops.length || 0);
    var interpolation = Math.round(((_a = info.smoothness) !== null && _a !== void 0 ? _a : 1) * 4096);
    for (var _i = 0, _d = info.colorStops || []; _i < _d.length; _i++) {
        var s = _d[_i];
        psdWriter_1.writeUint32(writer, Math.round(s.location * interpolation));
        psdWriter_1.writeUint32(writer, Math.round(s.midpoint * 100));
        psdWriter_1.writeColor(writer, s.color);
        psdWriter_1.writeZeros(writer, 2);
    }
    psdWriter_1.writeUint16(writer, info.opacityStops && info.opacityStops.length || 0);
    for (var _e = 0, _f = info.opacityStops || []; _e < _f.length; _e++) {
        var s = _f[_e];
        psdWriter_1.writeUint32(writer, Math.round(s.location * interpolation));
        psdWriter_1.writeUint32(writer, Math.round(s.midpoint * 100));
        psdWriter_1.writeUint16(writer, Math.round(s.opacity * 0xff));
    }
    psdWriter_1.writeUint16(writer, 2); // expansion count
    psdWriter_1.writeUint16(writer, interpolation);
    psdWriter_1.writeUint16(writer, 32); // length
    psdWriter_1.writeUint16(writer, info.gradientType === 'noise' ? 1 : 0);
    psdWriter_1.writeUint32(writer, info.randomSeed || 0);
    psdWriter_1.writeUint16(writer, info.addTransparency ? 1 : 0);
    psdWriter_1.writeUint16(writer, info.restrictColors ? 1 : 0);
    psdWriter_1.writeUint32(writer, Math.round(((_b = info.roughness) !== null && _b !== void 0 ? _b : 1) * 4096));
    var colorModel = grdmColorModels.indexOf((_c = info.colorModel) !== null && _c !== void 0 ? _c : 'rgb');
    psdWriter_1.writeUint16(writer, colorModel === -1 ? 3 : colorModel);
    for (var i = 0; i < 4; i++)
        psdWriter_1.writeUint16(writer, Math.round((info.min && info.min[i] || 0) * 0x8000));
    for (var i = 0; i < 4; i++)
        psdWriter_1.writeUint16(writer, Math.round((info.max && info.max[i] || 0) * 0x8000));
    psdWriter_1.writeZeros(writer, 4);
});
function readSelectiveColors(reader) {
    return {
        c: psdReader_1.readInt16(reader),
        m: psdReader_1.readInt16(reader),
        y: psdReader_1.readInt16(reader),
        k: psdReader_1.readInt16(reader),
    };
}
function writeSelectiveColors(writer, cmyk) {
    var c = cmyk || {};
    psdWriter_1.writeInt16(writer, c.c);
    psdWriter_1.writeInt16(writer, c.m);
    psdWriter_1.writeInt16(writer, c.y);
    psdWriter_1.writeInt16(writer, c.k);
}
addHandler('selc', adjustmentType('selective color'), function (reader, target) {
    if (psdReader_1.readUint16(reader) !== 1)
        throw new Error('Invalid selc version');
    var mode = psdReader_1.readUint16(reader) ? 'absolute' : 'relative';
    psdReader_1.skipBytes(reader, 8);
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
    psdWriter_1.writeUint16(writer, 1); // version
    psdWriter_1.writeUint16(writer, info.mode === 'absolute' ? 1 : 0);
    psdWriter_1.writeZeros(writer, 8);
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
    var desc = descriptor_1.readVersionAndDescriptor(reader);
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
    psdReader_1.skipBytes(reader, left());
}, function (writer, target) {
    var _a, _b, _c, _d;
    var info = target.adjustment;
    if (info.type === 'levels' || info.type === 'exposure' || info.type === 'hue/saturation') {
        var desc = {
            Vrsn: 1,
            presetKind: (_a = info.presetKind) !== null && _a !== void 0 ? _a : 1,
            presetFileName: info.presetFileName || '',
        };
        descriptor_1.writeVersionAndDescriptor(writer, '', 'null', desc);
    }
    else if (info.type === 'curves') {
        var desc = {
            Vrsn: 1,
            curvesPresetKind: (_b = info.presetKind) !== null && _b !== void 0 ? _b : 1,
            curvesPresetFileName: info.presetFileName || '',
        };
        descriptor_1.writeVersionAndDescriptor(writer, '', 'null', desc);
    }
    else if (info.type === 'channel mixer') {
        var desc = {
            Vrsn: 1,
            mixerPresetKind: (_c = info.presetKind) !== null && _c !== void 0 ? _c : 1,
            mixerPresetFileName: info.presetFileName || '',
        };
        descriptor_1.writeVersionAndDescriptor(writer, '', 'null', desc);
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
        descriptor_1.writeVersionAndDescriptor(writer, '', 'null', desc);
    }
    else {
        throw new Error('Unhandled CgEd case');
    }
});
addHandler('Txt2', hasKey('engineData'), function (reader, target, left) {
    var data = psdReader_1.readBytes(reader, left());
    target.engineData = base64_js_1.fromByteArray(data);
    // const engineData = parseEngineData(data);
    // console.log(require('util').inspect(engineData, false, 99, true));
    // require('fs').writeFileSync('resources/engineData2Simple.txt', require('util').inspect(engineData, false, 99, false), 'utf8');
    // require('fs').writeFileSync('test_data.json', JSON.stringify(ed, null, 2), 'utf8');
}, function (writer, target) {
    var buffer = base64_js_1.toByteArray(target.engineData);
    psdWriter_1.writeBytes(writer, buffer);
});
addHandler('FMsk', hasKey('filterMask'), function (reader, target) {
    target.filterMask = {
        colorSpace: psdReader_1.readColor(reader),
        opacity: psdReader_1.readUint16(reader) / 0xff,
    };
}, function (writer, target) {
    var _a;
    psdWriter_1.writeColor(writer, target.filterMask.colorSpace);
    psdWriter_1.writeUint16(writer, helpers_1.clamp((_a = target.filterMask.opacity) !== null && _a !== void 0 ? _a : 1, 0, 1) * 0xff);
});
addHandler('artd', // document-wide artboard info
function (// document-wide artboard info
target) { return target.artboards !== undefined; }, function (reader, target, left) {
    var desc = descriptor_1.readVersionAndDescriptor(reader);
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
    psdReader_1.skipBytes(reader, left());
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
    descriptor_1.writeVersionAndDescriptor(writer, '', 'null', desc, 'artd');
});
function parseFxObject(fx) {
    var stroke = {
        enabled: !!fx.enab,
        position: descriptor_1.FStl.decode(fx.Styl),
        fillType: descriptor_1.FrFl.decode(fx.PntT),
        blendMode: descriptor_1.BlnM.decode(fx['Md  ']),
        opacity: descriptor_1.parsePercent(fx.Opct),
        size: descriptor_1.parseUnits(fx['Sz  ']),
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
    FrFX.Styl = descriptor_1.FStl.encode(stroke.position);
    FrFX.PntT = descriptor_1.FrFl.encode(stroke.fillType);
    FrFX['Md  '] = descriptor_1.BlnM.encode(stroke.blendMode);
    FrFX.Opct = descriptor_1.unitsPercent(stroke.opacity);
    FrFX['Sz  '] = descriptor_1.unitsValue(stroke.size, 'size');
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
        effects.scale = descriptor_1.parsePercent(info['Scl ']);
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
        'Scl ': descriptor_1.unitsPercent((_a = e.scale) !== null && _a !== void 0 ? _a : 1),
        masterFXSwitch: !e.disabled,
    } : {
        masterFXSwitch: !e.disabled,
        'Scl ': descriptor_1.unitsPercent((_b = e.scale) !== null && _b !== void 0 ? _b : 1),
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
function hasMultiEffects(effects) {
    return Object.keys(effects).map(function (key) { return effects[key]; }).some(function (v) { return Array.isArray(v) && v.length > 1; });
}
exports.hasMultiEffects = hasMultiEffects;
addHandler('lfx2', function (target) { return target.effects !== undefined && !hasMultiEffects(target.effects); }, function (reader, target, left, _, options) {
    var version = psdReader_1.readUint32(reader);
    if (version !== 0)
        throw new Error("Invalid lfx2 version");
    var desc = descriptor_1.readVersionAndDescriptor(reader);
    // console.log(require('util').inspect(desc, false, 99, true));
    // TODO: don't discard if we got it from lmfx
    // discard if read in 'lrFX' section
    target.effects = parseEffects(desc, !!options.logMissingFeatures);
    psdReader_1.skipBytes(reader, left());
}, function (writer, target, _, options) {
    var desc = serializeEffects(target.effects, !!options.logMissingFeatures, false);
    // console.log(require('util').inspect(desc, false, 99, true));
    psdWriter_1.writeUint32(writer, 0); // version
    descriptor_1.writeVersionAndDescriptor(writer, '', 'null', desc);
});
addHandler('cinf', hasKey('compositorUsed'), function (reader, target, left) {
    var desc = descriptor_1.readVersionAndDescriptor(reader);
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
    psdReader_1.skipBytes(reader, left());
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
    descriptor_1.writeVersionAndDescriptor(writer, '', 'null', desc);
});
// extension settings ?, ignore it
addHandler('extn', function (target) { return target._extn !== undefined; }, function (reader, target) {
    var desc = descriptor_1.readVersionAndDescriptor(reader);
    // console.log(require('util').inspect(desc, false, 99, true));
    if (helpers_1.MOCK_HANDLERS)
        target._extn = desc;
}, function (writer, target) {
    // TODO: need to add correct types for desc fields (resources/src.psd)
    if (helpers_1.MOCK_HANDLERS)
        descriptor_1.writeVersionAndDescriptor(writer, '', 'null', target._extn);
});
addHandler('iOpa', hasKey('fillOpacity'), function (reader, target) {
    target.fillOpacity = psdReader_1.readUint8(reader) / 0xff;
    psdReader_1.skipBytes(reader, 3);
}, function (writer, target) {
    psdWriter_1.writeUint8(writer, target.fillOpacity * 0xff);
    psdWriter_1.writeZeros(writer, 3);
});
addHandler('tsly', hasKey('transparencyShapesLayer'), function (reader, target) {
    target.transparencyShapesLayer = !!psdReader_1.readUint8(reader);
    psdReader_1.skipBytes(reader, 3);
}, function (writer, target) {
    psdWriter_1.writeUint8(writer, target.transparencyShapesLayer ? 1 : 0);
    psdWriter_1.writeZeros(writer, 3);
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
                opacity: descriptor_1.parsePercent(s.Opct),
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
            colorModel: descriptor_1.ClrS.decode(grad.ClrS),
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
                    Opct: descriptor_1.unitsPercent(s.opacity),
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
            ClrS: descriptor_1.ClrS.encode(grad.colorModel),
            RndS: grad.randomSeed || 0,
            Smth: Math.round(((_b = grad.roughness) !== null && _b !== void 0 ? _b : 1) * 4096),
            'Mnm ': (grad.min || [0, 0, 0, 0]).map(function (x) { return x * 100; }),
            'Mxm ': (grad.max || [1, 1, 1, 1]).map(function (x) { return x * 100; }),
        };
    }
}
function parseGradientContent(descriptor) {
    var result = parseGradient(descriptor.Grad);
    result.style = descriptor_1.GrdT.decode(descriptor.Type);
    if (descriptor.Dthr !== undefined)
        result.dither = descriptor.Dthr;
    if (descriptor.Rvrs !== undefined)
        result.reverse = descriptor.Rvrs;
    if (descriptor.Angl !== undefined)
        result.angle = descriptor_1.parseAngle(descriptor.Angl);
    if (descriptor['Scl '] !== undefined)
        result.scale = descriptor_1.parsePercent(descriptor['Scl ']);
    if (descriptor.Algn !== undefined)
        result.align = descriptor.Algn;
    if (descriptor.Ofst !== undefined) {
        result.offset = {
            x: descriptor_1.parsePercent(descriptor.Ofst.Hrzn),
            y: descriptor_1.parsePercent(descriptor.Ofst.Vrtc)
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
        result.Angl = descriptor_1.unitsAngle(content.angle);
    result.Type = descriptor_1.GrdT.encode(content.style);
    if (content.align !== undefined)
        result.Algn = content.align;
    if (content.scale !== undefined)
        result['Scl '] = descriptor_1.unitsPercent(content.scale);
    if (content.offset) {
        result.Ofst = {
            Hrzn: descriptor_1.unitsPercent(content.offset.x),
            Vrtc: descriptor_1.unitsPercent(content.offset.y),
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
        return { h: descriptor_1.parsePercentOrAngle(color['H   ']), s: color.Strt, b: color.Brgh };
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
        return { 'H   ': descriptor_1.unitsAngle(color.h * 360), Strt: color.s || 0, Brgh: color.b || 0 };
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
                result.position = descriptor_1.FStl.decode(val);
                break;
            case 'Md  ':
                result.blendMode = descriptor_1.BlnM.decode(val);
                break;
            case 'hglM':
                result.highlightBlendMode = descriptor_1.BlnM.decode(val);
                break;
            case 'sdwM':
                result.shadowBlendMode = descriptor_1.BlnM.decode(val);
                break;
            case 'bvlS':
                result.style = descriptor_1.BESl.decode(val);
                break;
            case 'bvlD':
                result.direction = descriptor_1.BESs.decode(val);
                break;
            case 'bvlT':
                result.technique = descriptor_1.bvlT.decode(val);
                break;
            case 'GlwT':
                result.technique = descriptor_1.BETE.decode(val);
                break;
            case 'glwS':
                result.source = descriptor_1.IGSr.decode(val);
                break;
            case 'Type':
                result.type = descriptor_1.GrdT.decode(val);
                break;
            case 'Opct':
                result.opacity = descriptor_1.parsePercent(val);
                break;
            case 'hglO':
                result.highlightOpacity = descriptor_1.parsePercent(val);
                break;
            case 'sdwO':
                result.shadowOpacity = descriptor_1.parsePercent(val);
                break;
            case 'lagl':
                result.angle = descriptor_1.parseAngle(val);
                break;
            case 'Angl':
                result.angle = descriptor_1.parseAngle(val);
                break;
            case 'Lald':
                result.altitude = descriptor_1.parseAngle(val);
                break;
            case 'Sftn':
                result.soften = descriptor_1.parseUnits(val);
                break;
            case 'srgR':
                result.strength = descriptor_1.parsePercent(val);
                break;
            case 'blur':
                result.size = descriptor_1.parseUnits(val);
                break;
            case 'Nose':
                result.noise = descriptor_1.parsePercent(val);
                break;
            case 'Inpr':
                result.range = descriptor_1.parsePercent(val);
                break;
            case 'Ckmt':
                result.choke = descriptor_1.parseUnits(val);
                break;
            case 'ShdN':
                result.jitter = descriptor_1.parsePercent(val);
                break;
            case 'Dstn':
                result.distance = descriptor_1.parseUnits(val);
                break;
            case 'Scl ':
                result.scale = descriptor_1.parsePercent(val);
                break;
            case 'Ptrn':
                result.pattern = { name: val['Nm  '], id: val.Idnt };
                break;
            case 'phase':
                result.phase = { x: val.Hrzn, y: val.Vrtc };
                break;
            case 'Ofst':
                result.offset = { x: descriptor_1.parsePercent(val.Hrzn), y: descriptor_1.parsePercent(val.Vrtc) };
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
                result.Styl = descriptor_1.FStl.encode(val);
                break;
            case 'blendMode':
                result['Md  '] = descriptor_1.BlnM.encode(val);
                break;
            case 'highlightBlendMode':
                result.hglM = descriptor_1.BlnM.encode(val);
                break;
            case 'shadowBlendMode':
                result.sdwM = descriptor_1.BlnM.encode(val);
                break;
            case 'style':
                result.bvlS = descriptor_1.BESl.encode(val);
                break;
            case 'direction':
                result.bvlD = descriptor_1.BESs.encode(val);
                break;
            case 'technique':
                if (objName === 'bevel') {
                    result.bvlT = descriptor_1.bvlT.encode(val);
                }
                else {
                    result.GlwT = descriptor_1.BETE.encode(val);
                }
                break;
            case 'source':
                result.glwS = descriptor_1.IGSr.encode(val);
                break;
            case 'type':
                result.Type = descriptor_1.GrdT.encode(val);
                break;
            case 'opacity':
                result.Opct = descriptor_1.unitsPercent(val);
                break;
            case 'highlightOpacity':
                result.hglO = descriptor_1.unitsPercent(val);
                break;
            case 'shadowOpacity':
                result.sdwO = descriptor_1.unitsPercent(val);
                break;
            case 'angle':
                if (objName === 'gradientOverlay') {
                    result.Angl = descriptor_1.unitsAngle(val);
                }
                else {
                    result.lagl = descriptor_1.unitsAngle(val);
                }
                break;
            case 'altitude':
                result.Lald = descriptor_1.unitsAngle(val);
                break;
            case 'soften':
                result.Sftn = descriptor_1.unitsValue(val, key);
                break;
            case 'strength':
                result.srgR = descriptor_1.unitsPercent(val);
                break;
            case 'size':
                result.blur = descriptor_1.unitsValue(val, key);
                break;
            case 'noise':
                result.Nose = descriptor_1.unitsPercent(val);
                break;
            case 'range':
                result.Inpr = descriptor_1.unitsPercent(val);
                break;
            case 'choke':
                result.Ckmt = descriptor_1.unitsValue(val, key);
                break;
            case 'jitter':
                result.ShdN = descriptor_1.unitsPercent(val);
                break;
            case 'distance':
                result.Dstn = descriptor_1.unitsValue(val, key);
                break;
            case 'scale':
                result['Scl '] = descriptor_1.unitsPercent(val);
                break;
            case 'pattern':
                result.Ptrn = { 'Nm  ': val.name, Idnt: val.id };
                break;
            case 'phase':
                result.phase = { Hrzn: val.x, Vrtc: val.y };
                break;
            case 'offset':
                result.Ofst = { Hrzn: descriptor_1.unitsPercent(val.x), Vrtc: descriptor_1.unitsPercent(val.y) };
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUMsQ0FBQztBQUMzQixDQUFDLEVBQ0QsVUFBQyxNQUFNLEVBQUUsTUFBTTtJQUNkLElBQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxVQUFtQyxDQUFDO0lBQ3hELElBQU0sSUFBSSxHQUEwQixFQUFFLENBQUM7SUFFdkMsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLFNBQVM7UUFBRSxJQUFJLENBQUMsVUFBVSxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzdGLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxTQUFTO1FBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDdEQsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLFNBQVM7UUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDdkQsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLFNBQVM7UUFBRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDNUQsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLFNBQVM7UUFBRSxJQUFJLENBQUMsU0FBUyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3hGLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxTQUFTO1FBQUUsSUFBSSxDQUFDLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzNGLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxTQUFTO1FBQUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzlGLElBQUksSUFBSSxDQUFDLGFBQWEsS0FBSyxTQUFTO1FBQUUsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzlFLElBQUksSUFBSSxDQUFDLGFBQWEs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QUFVLEdBQUcsYUFBYSxHQUFHLElBQUksQ0FBQztJQUV2QyxJQUFNLE1BQU0sR0FBRyxzQkFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2xDLElBQUksTUFBTSxLQUFLLEVBQUU7UUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFFMUQsSUFBSSxDQUFDLFlBQVksR0FBRyxzQkFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUMzRCxJQUFJLENBQUMsVUFBVSxHQUFHLHNCQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDckMsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsc0JBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM1QyxJQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxzQkFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzNDLElBQUksQ0FBQyxTQUFTLEdBQUcsc0JBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDM0MsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLGVBQWUsQ0FBQyxzQkFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksS0FBSyxDQUEwQixDQUFDO0lBRTFGLElBQUksQ0FBQyxHQUFHLEdBQUc7UUFDVixzQkFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLE1BQU07UUFDM0Isc0JBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxNQUFNO1FBQzNCLHNCQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsTUFBTTtRQUMzQixzQkFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLE1BQU07S0FDM0IsQ0FBQztJQUVGLElBQUksQ0FBQyxHQUFHLEdBQUc7UUFDVixzQkFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLE1BQU07UUFDM0Isc0JBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxNQUFNO1FBQzNCLHNCQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsTUFBTTtRQUMzQixzQkFBVSxDQUFDLE1B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QUUsaUJBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNsQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDO1lBQzFCLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBQSxJQUFJLENBQUMsU0FBUyxtQ0FBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDOUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxHQUFHLEdBQUcsRUFBUCxDQUFPLENBQUM7WUFDcEQsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxHQUFHLEdBQUcsRUFBUCxDQUFPLENBQUM7U0FDcEQsQ0FBQztLQUNGO0FBQ0YsQ0FBQztBQUVELFNBQVMsb0JBQW9CLENBQUMsVUFBcUM7SUFDbEUsSUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQW9FLENBQUM7SUFDakgsTUFBTSxDQUFDLEtBQUssR0FBRyxpQkFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUMsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLFNBQVM7UUFBRSxNQUFNLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUM7SUFDbkUsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLFNBQVM7UUFBRSxNQUFNLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUM7SUFDcEUsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLFNBQVM7UUFBRSxNQUFNLENBQUMsS0FBSyxHQUFHLHVCQUFV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TUFBTTtnQkFBRSxNQUFNLENBQUMsTUFBTSxHQUFHLHVCQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQUMsTUFBTTtZQUNwRCxLQUFLLE1BQU07Z0JBQUUsTUFBTSxDQUFDLFFBQVEsR0FBRyx5QkFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUFDLE1BQU07WUFDeEQsS0FBSyxNQUFNO2dCQUFFLE1BQU0sQ0FBQyxJQUFJLEdBQUcsdUJBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ2xELEtBQUssTUFBTTtnQkFBRSxNQUFNLENBQUMsS0FBSyxHQUFHLHlCQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQUMsTUFBTTtZQUNyRCxLQUFLLE1BQU07Z0JBQUUsTUFBTSxDQUFDLEtBQUssR0FBRyx5QkFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUFDLE1BQU07WUFDckQsS0FBSyxNQUFNO2dCQUFFLE1BQU0sQ0FBQyxLQUFLLEdBQUcsdUJBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ25ELEtBQUssTUFBTTtnQkFBRSxNQUFNLENBQUMsTUFBTSxHQUFHLHlCQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQUMsTUFBTTtZQUN0RCxLQUFLLE1BQU07Z0JBQUUsTUFBTSxDQUFDLFFBQVEsR0FBRyx1QkFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUFDLE1BQU07WUFDdEQsS0FBSyxNQUFNO2dCQUFFLE1BQU0sQ0FBQyxLQUFLLEdBQUcseUJBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBQyxNQUFNO1lBQ3JELEtBQUssTUFBTTtnQkFBRSxNQUFNLENBQUMsT0FBTyxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUFDLE1BQU07WUFDekUsS0FBSyxPQUFPO2dCQUFFLE1BQU0sQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUks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LENBQUMsQ0FBQztnQkFDZixNQUFNLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRztvQkFDL0MsTUFBTSxFQUFHLEdBQXFCLENBQUMsSUFBSTtvQkFDbkMsTUFBTSxFQUFHLEdBQXFCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQTFCLENBQTBCLENBQUM7aUJBQ3pFLENBQUM7Z0JBQ0YsTUFBTTthQUNOO1lBQ0QsS0FBSyxVQUFVO2dCQUFFLE1BQU0sQ0FBQyxJQUFJLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQUMsTUFBTTtZQUM3RCxLQUFLLFlBQVksQ0FBQztZQUNsQixLQUFLLFVBQVUsQ0FBQztZQUNoQixLQUFLLGVBQWUsQ0FBQztZQUNyQixLQUFLLFNBQVMsQ0FBQztZQUNmLEtBQUssY0FBYyxDQUFDO1lBQ3BCLEtBQUssZ0JBQWdCO2dCQUNwQixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO2dCQUNsQixNQUFNO1lBQ1A7Z0JBQ0MsWUFBWSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQXdCLEdBQUcsYUFBVSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ3pFO0tBQ0Q7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMiLCJmaWxlIjoiYWRkaXRpb25hbEluZm8uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBmcm9tQnl0ZUFycmF5LCB0b0J5dGVBcnJheSB9IGZyb20gJ2Jhc2U2NC1qcyc7XG5pbXBvcnQgeyByZWFkRWZmZWN0cywgd3JpdGVFZmZlY3RzIH0gZnJvbSAnLi9lZmZlY3RzSGVscGVycyc7XG5pbXBvcnQgeyBjbGFtcCwgY3JlYXRlRW51bSwgbGF5ZXJDb2xvcnMsIE1PQ0tfSEFORExFUlMgfSBmcm9tICcuL2hlbHBlcnMnO1xuaW1wb3J0IHtcblx0TGF5ZXJBZGRpdGlvbmFsSW5mbywgTGF5ZXJFZmZlY3RTaGFkb3csIExheWVyRWZmZWN0c091dGVyR2xvdywgTGF5ZXJFZmZlY3RJbm5lckdsb3csIExheWVyRWZmZWN0QmV2ZWwsXG5cdExheWVyRWZmZWN0U29saWRGaWxsLCBMYXllckVmZmVjdFBhdHRlcm5PdmVybGF5LCBMYXllckVmZmVjdEdyYWRpZW50T3ZlcmxheSwgTGF5ZXJFZmZlY3RTYXRpbiwgRWZmZWN0Q29udG91cixcblx0RWZmZWN0Tm9pc2VHcmFkaWVudCwgQmV6aWVyUGF0aCwgUHNkLCBWZWN0b3JDb250ZW50LCBMYXllckVmZmVjdFN0cm9rZSwgRXh0cmFHcmFkaWVudEluZm8sIEVmZmVjdFBhdHRlcm4sXG5cdEV4dHJhUGF0dGVybkluZm8sIFJlYWRPcHRpb25zLCBCcmlnaHRuZXNzQWRqdXN0bWVudCwgRXhwb3N1cmVBZGp1c3RtZW50LCBWaWJyYW5jZUFkanVzdG1lbnQsXG5cdENvbG9yQmFsYW5jZUFkanVzdG1lbnQsIEJsYWNrQW5kV2hpdGVBZGp1c3RtZW50LCBQaG90b0ZpbHRlckFkanVzdG1lbnQsIENoYW5uZWxNaXhlckNoYW5uZWwsXG5cdENoYW5uZWxNaXhlckFkanVzdG1lbnQsIFBvc3Rlcml6ZUFkanVzdG1lbnQsIFRocmVzaG9sZEFkanVzdG1lbnQsIEdyYWRpZW50TWFwQWRqdXN0bWVudCwgQ01ZSyxcblx0U2VsZWN0aXZlQ29sb3JBZGp1c3RtZW50LCBDb2xvckxvb2t1cEFkanVzdG1lbnQsIExldmVsc0FkanVzdG1lbnRDaGFubmVsLCBMZXZlbHNBZGp1c3RtZW50LFxuXHRDdXJ2ZXNBZGp1c3RtZW50LCBDdXJ2ZXNBZGp1c3RtZW50Q2hhbm5lbCwgSHVlU2F0dXJhdGlvbkFkanVzdG1lbnQsIEh1ZVNhdHVyYXRpb25BZGp1c3RtZW50Q2hhbm5lbCxcblx0UHJlc2V0SW5mbywgQ29sb3IsIENvbG9yQmFsYW5jZVZhbHVlcywgV3JpdGVPcHRpb25zLCBMaW5rZWRGaWxlLCBQbGFjZWRMYXllclR5cGUsIFdhcnAsIEVmZmVjdFNvbGlkR3JhZGllbnQsXG5cdEtleURlc2NyaXB0b3JJdGVtLCBCb29sZWFuT3BlcmF0aW9uLCBMYXllckVmZmVjdHNJbmZvLCBBbm5vdGF0aW9uLCBMYXllclZlY3Rvck1hc2ssXG59IGZyb20gJy4vcHNkJztcbmltcG9ydCB7XG5cdFBzZFJlYWRlciwgcmVhZFNpZ25hdHVyZSwgcmVhZFVuaWNvZGVTdHJpbmcsIHNraXBCeXRlcywgcmVhZFVpbnQzMiwgcmVhZFVpbnQ4LCByZWFkRmxvYXQ2NCwgcmVhZFVpbnQxNixcblx0cmVhZEJ5dGVzLCByZWFkSW50MTYsIGNoZWNrU2lnbmF0dXJlLCByZWFkRmxvYXQzMiwgcmVhZEZpeGVkUG9pbnRQYXRoMzIsIHJlYWRTZWN0aW9uLCByZWFkQ29sb3IsIHJlYWRJbnQzMixcblx0cmVhZFBhc2NhbFN0cmluZywgcmVhZFVuaWNvZGVTdHJpbmdXaXRoTGVuZ3RoLCByZWFkQXNjaWlTdHJpbmcsIHJlYWRQYXR0ZXJuLFxufSBmcm9tICcuL3BzZFJlYWRlcic7XG5pbXBvcnQge1xuXHRQc2RXcml0ZXIsIHdyaXRlWmVyb3MsIHdyaXRlU2lnbmF0dXJlLCB3cml0ZUJ5dGVzLCB3cml0ZVVpbnQzMiwgd3JpdGVVaW50MTYsIHdyaXRlRmxvYXQ2NCwgd3JpdGVVaW50OCxcblx0d3JpdGVJbnQxNiwgd3JpdGVGbG9hdDMyLCB3cml0ZUZpeGVkUG9pbnRQYXRoMzIsIHdyaXRlVW5pY29kZVN0cmluZywgd3JpdGVTZWN0aW9uLCB3cml0ZVVuaWNvZGVTdHJpbmdXaXRoUGFkZGluZyxcblx0d3JpdGVDb2xvciwgd3JpdGVQYXNjYWxTdHJpbmcsIHdyaXRlSW50MzIsXG59IGZyb20gJy4vcHNkV3JpdGVyJztcbmltcG9ydCB7XG5cdEFubnQsIEJFU2wsIEJFU3MsIEJFVEUsIEJsbk0sIGJ2bFQsIENsclMsIERlc2NpcHRvckdyYWRpZW50LCBEZXNjcmlwdG9yQ29sb3IsIERlc2NyaXB0b3JHcmFkaWVudENvbnRlbnQsXG5cdERlc2NyaXB0b3JQYXR0ZXJuQ29udGVudCwgRGVzY3JpcHRvclVuaXRzVmFsdWUsIERlc2NyaXB0b3JWZWN0b3JDb250ZW50LCBGckZsLCBGU3RsLCBHcmRULCBJR1NyLCBPcm50LFxuXHRwYXJzZUFuZ2xlLCBwYXJzZVBlcmNlbnQsIHBhcnNlUGVyY2VudE9yQW5nbGUsIHBhcnNlVW5pdHMsIHBhcnNlVW5pdHNPck51bWJlciwgUXVpbHRXYXJwRGVzY3JpcHRvciwgcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yLCBTdHJva2VEZXNjcmlwdG9yLFxuXHRzdHJva2VTdHlsZUxpbmVBbGlnbm1lbnQsIHN0cm9rZVN0eWxlTGluZUNhcFR5cGUsIHN0cm9rZVN0eWxlTGluZUpvaW5UeXBlLCBUZXh0RGVzY3JpcHRvciwgdGV4dEdyaWRkaW5nLFxuXHR1bml0c0FuZ2xlLCB1bml0c1BlcmNlbnQsIHVuaXRzVmFsdWUsIFdhcnBEZXNjcmlwdG9yLCB3YXJwU3R5bGUsIHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Jcbn0gZnJvbSAnLi9kZXNjcmlwdG9yJztcbmltcG9ydCB7IHNlcmlhbGl6ZUVuZ2luZURhdGEsIHBhcnNlRW5naW5lRGF0YSB9IGZyb20gJy4vZW5naW5lRGF0YSc7XG5pbXBvcnQgeyBlbmNvZGVFbmdpbmVEYXRhLCBkZWNvZGVFbmdpbmVEYXRhIH0gZnJvbSAnLi90ZXh0JztcblxuZXhwb3J0IGludGVyZmFjZSBFeHRlbmRlZFdyaXRlT3B0aW9ucyBleHRlbmRzIFdyaXRlT3B0aW9ucyB7XG5cdGxheWVySWRzOiBudW1iZXJbXTtcbn1cblxudHlwZSBIYXNNZXRob2QgPSAodGFyZ2V0OiBMYXllckFkZGl0aW9uYWxJbmZvKSA9PiBib29sZWFuO1xudHlwZSBSZWFkTWV0aG9kID0gKHJlYWRlcjogUHNkUmVhZGVyLCB0YXJnZXQ6IExheWVyQWRkaXRpb25hbEluZm8sIGxlZnQ6ICgpID0+IG51bWJlciwgcHNkOiBQc2QsIG9wdGlvbnM6IFJlYWRPcHRpb25zKSA9PiB2b2lkO1xudHlwZSBXcml0ZU1ldGhvZCA9ICh3cml0ZXI6IFBzZFdyaXRlciwgdGFyZ2V0OiBMYXllckFkZGl0aW9uYWxJbmZvLCBwc2Q6IFBzZCwgb3B0aW9uczogRXh0ZW5kZWRXcml0ZU9wdGlvbnMpID0+IHZvaWQ7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5mb0hhbmRsZXIge1xuXHRrZXk6IHN0cmluZztcblx0aGFzOiBIYXNNZXRob2Q7XG5cdHJlYWQ6IFJlYWRNZXRob2Q7XG5cdHdyaXRlOiBXcml0ZU1ldGhvZDtcbn1cblxuZXhwb3J0IGNvbnN0IGluZm9IYW5kbGVyczogSW5mb0hhbmRsZXJbXSA9IFtdO1xuZXhwb3J0IGNvbnN0IGluZm9IYW5kbGVyc01hcDogeyBba2V5OiBzdHJpbmddOiBJbmZvSGFuZGxlciB9ID0ge307XG5cbmZ1bmN0aW9uIGFkZEhhbmRsZXIoa2V5OiBzdHJpbmcsIGhhczogSGFzTWV0aG9kLCByZWFkOiBSZWFkTWV0aG9kLCB3cml0ZTogV3JpdGVNZXRob2QpIHtcblx0Y29uc3QgaGFuZGxlcjogSW5mb0hhbmRsZXIgPSB7IGtleSwgaGFzLCByZWFkLCB3cml0ZSB9O1xuXHRpbmZvSGFuZGxlcnMucHVzaChoYW5kbGVyKTtcblx0aW5mb0hhbmRsZXJzTWFwW2hhbmRsZXIua2V5XSA9IGhhbmRsZXI7XG59XG5cbmZ1bmN0aW9uIGFkZEhhbmRsZXJBbGlhcyhrZXk6IHN0cmluZywgdGFyZ2V0OiBzdHJpbmcpIHtcblx0aW5mb0hhbmRsZXJzTWFwW2tleV0gPSBpbmZvSGFuZGxlcnNNYXBbdGFyZ2V0XTtcbn1cblxuZnVuY3Rpb24gaGFzS2V5KGtleToga2V5b2YgTGF5ZXJBZGRpdGlvbmFsSW5mbykge1xuXHRyZXR1cm4gKHRhcmdldDogTGF5ZXJBZGRpdGlvbmFsSW5mbykgPT4gdGFyZ2V0W2tleV0gIT09IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gcmVhZExlbmd0aDY0KHJlYWRlcjogUHNkUmVhZGVyKSB7XG5cdGlmIChyZWFkVWludDMyKHJlYWRlcikpIHRocm93IG5ldyBFcnJvcihgUmVzb3VyY2Ugc2l6ZSBhYm92ZSA0IEdCIGxpbWl0IGF0ICR7cmVhZGVyLm9mZnNldC50b1N0cmluZygxNil9YCk7XG5cdHJldHVybiByZWFkVWludDMyKHJlYWRlcik7XG59XG5cbmZ1bmN0aW9uIHdyaXRlTGVuZ3RoNjQod3JpdGVyOiBQc2RXcml0ZXIsIGxlbmd0aDogbnVtYmVyKSB7XG5cdHdyaXRlVWludDMyKHdyaXRlciwgMCk7XG5cdHdyaXRlVWludDMyKHdyaXRlciwgbGVuZ3RoKTtcbn1cblxuYWRkSGFuZGxlcihcblx0J1R5U2gnLFxuXHRoYXNLZXkoJ3RleHQnKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0Qnl0ZXMpID0+IHtcblx0XHRpZiAocmVhZEludDE2KHJlYWRlcikgIT09IDEpIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBUeVNoIHZlcnNpb25gKTtcblxuXHRcdGNvbnN0IHRyYW5zZm9ybTogbnVtYmVyW10gPSBbXTtcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IDY7IGkrKykgdHJhbnNmb3JtLnB1c2gocmVhZEZsb2F0NjQocmVhZGVyKSk7XG5cblx0XHRpZiAocmVhZEludDE2KHJlYWRlcikgIT09IDUwKSB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgVHlTaCB0ZXh0IHZlcnNpb25gKTtcblx0XHRjb25zdCB0ZXh0OiBUZXh0RGVzY3JpcHRvciA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpO1xuXG5cdFx0aWYgKHJlYWRJbnQxNihyZWFkZXIpICE9PSAxKSB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgVHlTaCB3YXJwIHZlcnNpb25gKTtcblx0XHRjb25zdCB3YXJwOiBXYXJwRGVzY3JpcHRvciA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpO1xuXG5cdFx0dGFyZ2V0LnRleHQgPSB7XG5cdFx0XHR0cmFuc2Zvcm0sXG5cdFx0XHRsZWZ0OiByZWFkRmxvYXQzMihyZWFkZXIpLFxuXHRcdFx0dG9wOiByZWFkRmxvYXQzMihyZWFkZXIpLFxuXHRcdFx0cmlnaHQ6IHJlYWRGbG9hdDMyKHJlYWRlciksXG5cdFx0XHRib3R0b206IHJlYWRGbG9hdDMyKHJlYWRlciksXG5cdFx0XHR0ZXh0OiB0ZXh0WydUeHQgJ10ucmVwbGFjZSgvXFxyL2csICdcXG4nKSxcblx0XHRcdGluZGV4OiB0ZXh0LlRleHRJbmRleCB8fCAwLFxuXHRcdFx0Z3JpZGRpbmc6IHRleHRHcmlkZGluZy5kZWNvZGUodGV4dC50ZXh0R3JpZGRpbmcpLFxuXHRcdFx0YW50aUFsaWFzOiBBbm50LmRlY29kZSh0ZXh0LkFudEEpLFxuXHRcdFx0b3JpZW50YXRpb246IE9ybnQuZGVjb2RlKHRleHQuT3JudCksXG5cdFx0XHR3YXJwOiB7XG5cdFx0XHRcdHN0eWxlOiB3YXJwU3R5bGUuZGVjb2RlKHdhcnAud2FycFN0eWxlKSxcblx0XHRcdFx0dmFsdWU6IHdhcnAud2FycFZhbHVlIHx8IDAsXG5cdFx0XHRcdHBlcnNwZWN0aXZlOiB3YXJwLndhcnBQZXJzcGVjdGl2ZSB8fCAwLFxuXHRcdFx0XHRwZXJzcGVjdGl2ZU90aGVyOiB3YXJwLndhcnBQZXJzcGVjdGl2ZU90aGVyIHx8IDAsXG5cdFx0XHRcdHJvdGF0ZTogT3JudC5kZWNvZGUod2FycC53YXJwUm90YXRlKSxcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdGlmICh0ZXh0LkVuZ2luZURhdGEpIHtcblx0XHRcdGNvbnN0IGVuZ2luZURhdGEgPSBkZWNvZGVFbmdpbmVEYXRhKHBhcnNlRW5naW5lRGF0YSh0ZXh0LkVuZ2luZURhdGEpKTtcblxuXHRcdFx0Ly8gY29uc3QgYmVmb3JlID0gcGFyc2VFbmdpbmVEYXRhKHRleHQuRW5naW5lRGF0YSk7XG5cdFx0XHQvLyBjb25zdCBhZnRlciA9IGVuY29kZUVuZ2luZURhdGEoZW5naW5lRGF0YSk7XG5cdFx0XHQvLyByZXF1aXJlKCdmcycpLndyaXRlRmlsZVN5bmMoJ2JlZm9yZS50eHQnLCByZXF1aXJlKCd1dGlsJykuaW5zcGVjdChiZWZvcmUsIGZhbHNlLCA5OSwgZmFsc2UpLCAndXRmOCcpO1xuXHRcdFx0Ly8gcmVxdWlyZSgnZnMnKS53cml0ZUZpbGVTeW5jKCdhZnRlci50eHQnLCByZXF1aXJlKCd1dGlsJykuaW5zcGVjdChhZnRlciwgZmFsc2UsIDk5LCBmYWxzZSksICd1dGY4Jyk7XG5cblx0XHRcdC8vIGNvbnNvbGUubG9nKHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KHBhcnNlRW5naW5lRGF0YSh0ZXh0LkVuZ2luZURhdGEpLCBmYWxzZSwgOTksIHRydWUpKTtcblx0XHRcdHRhcmdldC50ZXh0ID0geyAuLi50YXJnZXQudGV4dCwgLi4uZW5naW5lRGF0YSB9O1xuXHRcdFx0Ly8gY29uc29sZS5sb2cocmVxdWlyZSgndXRpbCcpLmluc3BlY3QodGFyZ2V0LnRleHQsIGZhbHNlLCA5OSwgdHJ1ZSkpO1xuXHRcdH1cblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnRCeXRlcygpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgdGV4dCA9IHRhcmdldC50ZXh0ITtcblx0XHRjb25zdCB3YXJwID0gdGV4dC53YXJwIHx8IHt9O1xuXHRcdGNvbnN0IHRyYW5zZm9ybSA9IHRleHQudHJhbnNmb3JtIHx8IFsxLCAwLCAwLCAxLCAwLCAwXTtcblxuXHRcdGNvbnN0IHRleHREZXNjcmlwdG9yOiBUZXh0RGVzY3JpcHRvciA9IHtcblx0XHRcdCdUeHQgJzogKHRleHQudGV4dCB8fCAnJykucmVwbGFjZSgvXFxyP1xcbi9nLCAnXFxyJyksXG5cdFx0XHR0ZXh0R3JpZGRpbmc6IHRleHRHcmlkZGluZy5lbmNvZGUodGV4dC5ncmlkZGluZyksXG5cdFx0XHRPcm50OiBPcm50LmVuY29kZSh0ZXh0Lm9yaWVudGF0aW9uKSxcblx0XHRcdEFudEE6IEFubnQuZW5jb2RlKHRleHQuYW50aUFsaWFzKSxcblx0XHRcdFRleHRJbmRleDogdGV4dC5pbmRleCB8fCAwLFxuXHRcdFx0RW5naW5lRGF0YTogc2VyaWFsaXplRW5naW5lRGF0YShlbmNvZGVFbmdpbmVEYXRhKHRleHQpKSxcblx0XHR9O1xuXG5cdFx0d3JpdGVJbnQxNih3cml0ZXIsIDEpOyAvLyB2ZXJzaW9uXG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IDY7IGkrKykge1xuXHRcdFx0d3JpdGVGbG9hdDY0KHdyaXRlciwgdHJhbnNmb3JtW2ldKTtcblx0XHR9XG5cblx0XHR3cml0ZUludDE2KHdyaXRlciwgNTApOyAvLyB0ZXh0IHZlcnNpb25cblx0XHR3cml0ZVZlcnNpb25BbmREZXNjcmlwdG9yKHdyaXRlciwgJycsICdUeExyJywgdGV4dERlc2NyaXB0b3IpO1xuXG5cdFx0d3JpdGVJbnQxNih3cml0ZXIsIDEpOyAvLyB3YXJwIHZlcnNpb25cblx0XHR3cml0ZVZlcnNpb25BbmREZXNjcmlwdG9yKHdyaXRlciwgJycsICd3YXJwJywgZW5jb2RlV2FycCh3YXJwKSk7XG5cblx0XHR3cml0ZUZsb2F0MzIod3JpdGVyLCB0ZXh0LmxlZnQhKTtcblx0XHR3cml0ZUZsb2F0MzIod3JpdGVyLCB0ZXh0LnRvcCEpO1xuXHRcdHdyaXRlRmxvYXQzMih3cml0ZXIsIHRleHQucmlnaHQhKTtcblx0XHR3cml0ZUZsb2F0MzIod3JpdGVyLCB0ZXh0LmJvdHRvbSEpO1xuXG5cdFx0Ly8gd3JpdGVaZXJvcyh3cml0ZXIsIDIpO1xuXHR9LFxuKTtcblxuLy8gdmVjdG9yIGZpbGxzXG5cbmFkZEhhbmRsZXIoXG5cdCdTb0NvJyxcblx0dGFyZ2V0ID0+IHRhcmdldC52ZWN0b3JGaWxsICE9PSB1bmRlZmluZWQgJiYgdGFyZ2V0LnZlY3RvclN0cm9rZSA9PT0gdW5kZWZpbmVkICYmXG5cdFx0dGFyZ2V0LnZlY3RvckZpbGwudHlwZSA9PT0gJ2NvbG9yJyxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgZGVzY3JpcHRvciA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpO1xuXHRcdHRhcmdldC52ZWN0b3JGaWxsID0gcGFyc2VWZWN0b3JDb250ZW50KGRlc2NyaXB0b3IpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCB7IGRlc2NyaXB0b3IgfSA9IHNlcmlhbGl6ZVZlY3RvckNvbnRlbnQodGFyZ2V0LnZlY3RvckZpbGwhKTtcblx0XHR3cml0ZVZlcnNpb25BbmREZXNjcmlwdG9yKHdyaXRlciwgJycsICdudWxsJywgZGVzY3JpcHRvcik7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQnR2RGbCcsXG5cdHRhcmdldCA9PiB0YXJnZXQudmVjdG9yRmlsbCAhPT0gdW5kZWZpbmVkICYmIHRhcmdldC52ZWN0b3JTdHJva2UgPT09IHVuZGVmaW5lZCAmJlxuXHRcdCh0YXJnZXQudmVjdG9yRmlsbC50eXBlID09PSAnc29saWQnIHx8IHRhcmdldC52ZWN0b3JGaWxsLnR5cGUgPT09ICdub2lzZScpLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRjb25zdCBkZXNjcmlwdG9yID0gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcik7XG5cdFx0dGFyZ2V0LnZlY3RvckZpbGwgPSBwYXJzZVZlY3RvckNvbnRlbnQoZGVzY3JpcHRvcik7XG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgeyBkZXNjcmlwdG9yIH0gPSBzZXJpYWxpemVWZWN0b3JDb250ZW50KHRhcmdldC52ZWN0b3JGaWxsISk7XG5cdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnbnVsbCcsIGRlc2NyaXB0b3IpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J1B0RmwnLFxuXHR0YXJnZXQgPT4gdGFyZ2V0LnZlY3RvckZpbGwgIT09IHVuZGVmaW5lZCAmJiB0YXJnZXQudmVjdG9yU3Ryb2tlID09PSB1bmRlZmluZWQgJiZcblx0XHR0YXJnZXQudmVjdG9yRmlsbC50eXBlID09PSAncGF0dGVybicsXG5cdChyZWFkZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGRlc2NyaXB0b3IgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKTtcblx0XHR0YXJnZXQudmVjdG9yRmlsbCA9IHBhcnNlVmVjdG9yQ29udGVudChkZXNjcmlwdG9yKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgeyBkZXNjcmlwdG9yIH0gPSBzZXJpYWxpemVWZWN0b3JDb250ZW50KHRhcmdldC52ZWN0b3JGaWxsISk7XG5cdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnbnVsbCcsIGRlc2NyaXB0b3IpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J3ZzY2cnLFxuXHR0YXJnZXQgPT4gdGFyZ2V0LnZlY3RvckZpbGwgIT09IHVuZGVmaW5lZCAmJiB0YXJnZXQudmVjdG9yU3Ryb2tlICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdHJlYWRTaWduYXR1cmUocmVhZGVyKTsgLy8ga2V5XG5cdFx0Y29uc3QgZGVzYyA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpO1xuXHRcdHRhcmdldC52ZWN0b3JGaWxsID0gcGFyc2VWZWN0b3JDb250ZW50KGRlc2MpO1xuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IHsgZGVzY3JpcHRvciwga2V5IH0gPSBzZXJpYWxpemVWZWN0b3JDb250ZW50KHRhcmdldC52ZWN0b3JGaWxsISk7XG5cdFx0d3JpdGVTaWduYXR1cmUod3JpdGVyLCBrZXkpO1xuXHRcdHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgJ251bGwnLCBkZXNjcmlwdG9yKTtcblx0fSxcbik7XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkQmV6aWVyS25vdChyZWFkZXI6IFBzZFJlYWRlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpIHtcblx0Y29uc3QgeTAgPSByZWFkRml4ZWRQb2ludFBhdGgzMihyZWFkZXIpICogaGVpZ2h0O1xuXHRjb25zdCB4MCA9IHJlYWRGaXhlZFBvaW50UGF0aDMyKHJlYWRlcikgKiB3aWR0aDtcblx0Y29uc3QgeTEgPSByZWFkRml4ZWRQb2ludFBhdGgzMihyZWFkZXIpICogaGVpZ2h0O1xuXHRjb25zdCB4MSA9IHJlYWRGaXhlZFBvaW50UGF0aDMyKHJlYWRlcikgKiB3aWR0aDtcblx0Y29uc3QgeTIgPSByZWFkRml4ZWRQb2ludFBhdGgzMihyZWFkZXIpICogaGVpZ2h0O1xuXHRjb25zdCB4MiA9IHJlYWRGaXhlZFBvaW50UGF0aDMyKHJlYWRlcikgKiB3aWR0aDtcblx0cmV0dXJuIFt4MCwgeTAsIHgxLCB5MSwgeDIsIHkyXTtcbn1cblxuZnVuY3Rpb24gd3JpdGVCZXppZXJLbm90KHdyaXRlcjogUHNkV3JpdGVyLCBwb2ludHM6IG51bWJlcltdLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcikge1xuXHR3cml0ZUZpeGVkUG9pbnRQYXRoMzIod3JpdGVyLCBwb2ludHNbMV0gLyBoZWlnaHQpOyAvLyB5MFxuXHR3cml0ZUZpeGVkUG9pbnRQYXRoMzIod3JpdGVyLCBwb2ludHNbMF0gLyB3aWR0aCk7IC8vIHgwXG5cdHdyaXRlRml4ZWRQb2ludFBhdGgzMih3cml0ZXIsIHBvaW50c1szXSAvIGhlaWdodCk7IC8vIHkxXG5cdHdyaXRlRml4ZWRQb2ludFBhdGgzMih3cml0ZXIsIHBvaW50c1syXSAvIHdpZHRoKTsgLy8geDFcblx0d3JpdGVGaXhlZFBvaW50UGF0aDMyKHdyaXRlciwgcG9pbnRzWzVdIC8gaGVpZ2h0KTsgLy8geTJcblx0d3JpdGVGaXhlZFBvaW50UGF0aDMyKHdyaXRlciwgcG9pbnRzWzRdIC8gd2lkdGgpOyAvLyB4MlxufVxuXG5leHBvcnQgY29uc3QgYm9vbGVhbk9wZXJhdGlvbnM6IEJvb2xlYW5PcGVyYXRpb25bXSA9IFsnZXhjbHVkZScsICdjb21iaW5lJywgJ3N1YnRyYWN0JywgJ2ludGVyc2VjdCddO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVhZFZlY3Rvck1hc2socmVhZGVyOiBQc2RSZWFkZXIsIHZlY3Rvck1hc2s6IExheWVyVmVjdG9yTWFzaywgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHNpemU6IG51bWJlcikge1xuXHRjb25zdCBlbmQgPSByZWFkZXIub2Zmc2V0ICsgc2l6ZTtcblx0Y29uc3QgcGF0aHMgPSB2ZWN0b3JNYXNrLnBhdGhzO1xuXHRsZXQgcGF0aDogQmV6aWVyUGF0aCB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuXHR3aGlsZSAoKGVuZCAtIHJlYWRlci5vZmZzZXQpID49IDI2KSB7XG5cdFx0Y29uc3Qgc2VsZWN0b3IgPSByZWFkVWludDE2KHJlYWRlcik7XG5cblx0XHRzd2l0Y2ggKHNlbGVjdG9yKSB7XG5cdFx0XHRjYXNlIDA6IC8vIENsb3NlZCBzdWJwYXRoIGxlbmd0aCByZWNvcmRcblx0XHRcdGNhc2UgMzogeyAvLyBPcGVuIHN1YnBhdGggbGVuZ3RoIHJlY29yZFxuXHRcdFx0XHRyZWFkVWludDE2KHJlYWRlcik7IC8vIGNvdW50XG5cdFx0XHRcdGNvbnN0IGJvb2xPcCA9IHJlYWRJbnQxNihyZWFkZXIpO1xuXHRcdFx0XHRyZWFkVWludDE2KHJlYWRlcik7IC8vIGFsd2F5cyAxID9cblx0XHRcdFx0c2tpcEJ5dGVzKHJlYWRlciwgMTgpO1xuXHRcdFx0XHQvLyBUT0RPOiAnY29tYmluZScgaGVyZSBtaWdodCBiZSB3cm9uZ1xuXHRcdFx0XHRwYXRoID0geyBvcGVuOiBzZWxlY3RvciA9PT0gMywgb3BlcmF0aW9uOiBib29sT3AgPT09IC0xID8gJ2NvbWJpbmUnIDogYm9vbGVhbk9wZXJhdGlvbnNbYm9vbE9wXSwga25vdHM6IFtdIH07XG5cdFx0XHRcdHBhdGhzLnB1c2gocGF0aCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0Y2FzZSAxOiAvLyBDbG9zZWQgc3VicGF0aCBCZXppZXIga25vdCwgbGlua2VkXG5cdFx0XHRjYXNlIDI6IC8vIENsb3NlZCBzdWJwYXRoIEJlemllciBrbm90LCB1bmxpbmtlZFxuXHRcdFx0Y2FzZSA0OiAvLyBPcGVuIHN1YnBhdGggQmV6aWVyIGtub3QsIGxpbmtlZFxuXHRcdFx0Y2FzZSA1OiAvLyBPcGVuIHN1YnBhdGggQmV6aWVyIGtub3QsIHVubGlua2VkXG5cdFx0XHRcdHBhdGghLmtub3RzLnB1c2goeyBsaW5rZWQ6IChzZWxlY3RvciA9PT0gMSB8fCBzZWxlY3RvciA9PT0gNCksIHBvaW50czogcmVhZEJlemllcktub3QocmVhZGVyLCB3aWR0aCwgaGVpZ2h0KSB9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDY6IC8vIFBhdGggZmlsbCBydWxlIHJlY29yZFxuXHRcdFx0XHRza2lwQnl0ZXMocmVhZGVyLCAyNCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSA3OiB7IC8vIENsaXBib2FyZCByZWNvcmRcblx0XHRcdFx0Ly8gVE9ETzogY2hlY2sgaWYgdGhlc2UgbmVlZCB0byBiZSBtdWx0aXBsaWVkIGJ5IGRvY3VtZW50IHNpemVcblx0XHRcdFx0Y29uc3QgdG9wID0gcmVhZEZpeGVkUG9pbnRQYXRoMzIocmVhZGVyKTtcblx0XHRcdFx0Y29uc3QgbGVmdCA9IHJlYWRGaXhlZFBvaW50UGF0aDMyKHJlYWRlcik7XG5cdFx0XHRcdGNvbnN0IGJvdHRvbSA9IHJlYWRGaXhlZFBvaW50UGF0aDMyKHJlYWRlcik7XG5cdFx0XHRcdGNvbnN0IHJpZ2h0ID0gcmVhZEZpeGVkUG9pbnRQYXRoMzIocmVhZGVyKTtcblx0XHRcdFx0Y29uc3QgcmVzb2x1dGlvbiA9IHJlYWRGaXhlZFBvaW50UGF0aDMyKHJlYWRlcik7XG5cdFx0XHRcdHNraXBCeXRlcyhyZWFkZXIsIDQpO1xuXHRcdFx0XHR2ZWN0b3JNYXNrLmNsaXBib2FyZCA9IHsgdG9wLCBsZWZ0LCBib3R0b20sIHJpZ2h0LCByZXNvbHV0aW9uIH07XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0Y2FzZSA4OiAvLyBJbml0aWFsIGZpbGwgcnVsZSByZWNvcmRcblx0XHRcdFx0dmVjdG9yTWFzay5maWxsU3RhcnRzV2l0aEFsbFBpeGVscyA9ICEhcmVhZFVpbnQxNihyZWFkZXIpO1xuXHRcdFx0XHRza2lwQnl0ZXMocmVhZGVyLCAyMik7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHZtc2sgc2VjdGlvbicpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBwYXRocztcbn1cblxuYWRkSGFuZGxlcihcblx0J3Ztc2snLFxuXHRoYXNLZXkoJ3ZlY3Rvck1hc2snKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0LCB7IHdpZHRoLCBoZWlnaHQgfSkgPT4ge1xuXHRcdGlmIChyZWFkVWludDMyKHJlYWRlcikgIT09IDMpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB2bXNrIHZlcnNpb24nKTtcblxuXHRcdHRhcmdldC52ZWN0b3JNYXNrID0geyBwYXRoczogW10gfTtcblx0XHRjb25zdCB2ZWN0b3JNYXNrID0gdGFyZ2V0LnZlY3Rvck1hc2s7XG5cblx0XHRjb25zdCBmbGFncyA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHR2ZWN0b3JNYXNrLmludmVydCA9IChmbGFncyAmIDEpICE9PSAwO1xuXHRcdHZlY3Rvck1hc2subm90TGluayA9IChmbGFncyAmIDIpICE9PSAwO1xuXHRcdHZlY3Rvck1hc2suZGlzYWJsZSA9IChmbGFncyAmIDQpICE9PSAwO1xuXG5cdFx0cmVhZFZlY3Rvck1hc2socmVhZGVyLCB2ZWN0b3JNYXNrLCB3aWR0aCwgaGVpZ2h0LCBsZWZ0KCkpO1xuXG5cdFx0Ly8gZHJhd0JlemllclBhdGhzKHZlY3Rvck1hc2sucGF0aHMsIHdpZHRoLCBoZWlnaHQsICdvdXQucG5nJyk7XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQsIHsgd2lkdGgsIGhlaWdodCB9KSA9PiB7XG5cdFx0Y29uc3QgdmVjdG9yTWFzayA9IHRhcmdldC52ZWN0b3JNYXNrITtcblx0XHRjb25zdCBmbGFncyA9XG5cdFx0XHQodmVjdG9yTWFzay5pbnZlcnQgPyAxIDogMCkgfFxuXHRcdFx0KHZlY3Rvck1hc2subm90TGluayA/IDIgOiAwKSB8XG5cdFx0XHQodmVjdG9yTWFzay5kaXNhYmxlID8gNCA6IDApO1xuXG5cdFx0d3JpdGVVaW50MzIod3JpdGVyLCAzKTsgLy8gdmVyc2lvblxuXHRcdHdyaXRlVWludDMyKHdyaXRlciwgZmxhZ3MpO1xuXG5cdFx0Ly8gaW5pdGlhbCBlbnRyeVxuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgNik7XG5cdFx0d3JpdGVaZXJvcyh3cml0ZXIsIDI0KTtcblxuXHRcdGNvbnN0IGNsaXBib2FyZCA9IHZlY3Rvck1hc2suY2xpcGJvYXJkO1xuXHRcdGlmIChjbGlwYm9hcmQpIHtcblx0XHRcdHdyaXRlVWludDE2KHdyaXRlciwgNyk7XG5cdFx0XHR3cml0ZUZpeGVkUG9pbnRQYXRoMzIod3JpdGVyLCBjbGlwYm9hcmQudG9wKTtcblx0XHRcdHdyaXRlRml4ZWRQb2ludFBhdGgzMih3cml0ZXIsIGNsaXBib2FyZC5sZWZ0KTtcblx0XHRcdHdyaXRlRml4ZWRQb2ludFBhdGgzMih3cml0ZXIsIGNsaXBib2FyZC5ib3R0b20pO1xuXHRcdFx0d3JpdGVGaXhlZFBvaW50UGF0aDMyKHdyaXRlciwgY2xpcGJvYXJkLnJpZ2h0KTtcblx0XHRcdHdyaXRlRml4ZWRQb2ludFBhdGgzMih3cml0ZXIsIGNsaXBib2FyZC5yZXNvbHV0aW9uKTtcblx0XHRcdHdyaXRlWmVyb3Mod3JpdGVyLCA0KTtcblx0XHR9XG5cblx0XHRpZiAodmVjdG9yTWFzay5maWxsU3RhcnRzV2l0aEFsbFBpeGVscyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIDgpO1xuXHRcdFx0d3JpdGVVaW50MTYod3JpdGVyLCB2ZWN0b3JNYXNrLmZpbGxTdGFydHNXaXRoQWxsUGl4ZWxzID8gMSA6IDApO1xuXHRcdFx0d3JpdGVaZXJvcyh3cml0ZXIsIDIyKTtcblx0XHR9XG5cblx0XHRmb3IgKGNvbnN0IHBhdGggb2YgdmVjdG9yTWFzay5wYXRocykge1xuXHRcdFx0d3JpdGVVaW50MTYod3JpdGVyLCBwYXRoLm9wZW4gPyAzIDogMCk7XG5cdFx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIHBhdGgua25vdHMubGVuZ3RoKTtcblx0XHRcdHdyaXRlVWludDE2KHdyaXRlciwgTWF0aC5hYnMoYm9vbGVhbk9wZXJhdGlvbnMuaW5kZXhPZihwYXRoLm9wZXJhdGlvbikpKTsgLy8gZGVmYXVsdCB0byAxIGlmIG5vdCBmb3VuZFxuXHRcdFx0d3JpdGVVaW50MTYod3JpdGVyLCAxKTtcblx0XHRcdHdyaXRlWmVyb3Mod3JpdGVyLCAxOCk7IC8vIFRPRE86IHRoZXNlIGFyZSBzb21ldGltZXMgbm9uLXplcm9cblxuXHRcdFx0Y29uc3QgbGlua2VkS25vdCA9IHBhdGgub3BlbiA/IDQgOiAxO1xuXHRcdFx0Y29uc3QgdW5saW5rZWRLbm90ID0gcGF0aC5vcGVuID8gNSA6IDI7XG5cblx0XHRcdGZvciAoY29uc3QgeyBsaW5rZWQsIHBvaW50cyB9IG9mIHBhdGgua25vdHMpIHtcblx0XHRcdFx0d3JpdGVVaW50MTYod3JpdGVyLCBsaW5rZWQgPyBsaW5rZWRLbm90IDogdW5saW5rZWRLbm90KTtcblx0XHRcdFx0d3JpdGVCZXppZXJLbm90KHdyaXRlciwgcG9pbnRzLCB3aWR0aCwgaGVpZ2h0KTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG4pO1xuXG4vLyBUT0RPOiBuZWVkIHRvIHdyaXRlIHZtc2sgaWYgaGFzIG91dGxpbmUgP1xuYWRkSGFuZGxlckFsaWFzKCd2c21zJywgJ3Ztc2snKTtcbi8vIGFkZEhhbmRsZXJBbGlhcygndm1zaycsICd2c21zJyk7XG5cbmludGVyZmFjZSBWb2drRGVzY3JpcHRvciB7XG5cdGtleURlc2NyaXB0b3JMaXN0OiB7XG5cdFx0a2V5U2hhcGVJbnZhbGlkYXRlZD86IGJvb2xlYW47XG5cdFx0a2V5T3JpZ2luVHlwZT86IG51bWJlcjtcblx0XHRrZXlPcmlnaW5SZXNvbHV0aW9uPzogbnVtYmVyO1xuXHRcdGtleU9yaWdpblJSZWN0UmFkaWk/OiB7XG5cdFx0XHR1bml0VmFsdWVRdWFkVmVyc2lvbjogbnVtYmVyO1xuXHRcdFx0dG9wUmlnaHQ6IERlc2NyaXB0b3JVbml0c1ZhbHVlO1xuXHRcdFx0dG9wTGVmdDogRGVzY3JpcHRvclVuaXRzVmFsdWU7XG5cdFx0XHRib3R0b21MZWZ0OiBEZXNjcmlwdG9yVW5pdHNWYWx1ZTtcblx0XHRcdGJvdHRvbVJpZ2h0OiBEZXNjcmlwdG9yVW5pdHNWYWx1ZTtcblx0XHR9O1xuXHRcdGtleU9yaWdpblNoYXBlQkJveD86IHtcblx0XHRcdHVuaXRWYWx1ZVF1YWRWZXJzaW9uOiBudW1iZXI7XG5cdFx0XHQnVG9wICc6IERlc2NyaXB0b3JVbml0c1ZhbHVlO1xuXHRcdFx0TGVmdDogRGVzY3JpcHRvclVuaXRzVmFsdWU7XG5cdFx0XHRCdG9tOiBEZXNjcmlwdG9yVW5pdHNWYWx1ZTtcblx0XHRcdFJnaHQ6IERlc2NyaXB0b3JVbml0c1ZhbHVlO1xuXHRcdH07XG5cdFx0a2V5T3JpZ2luQm94Q29ybmVycz86IHtcblx0XHRcdHJlY3RhbmdsZUNvcm5lckE6IHsgSHJ6bjogbnVtYmVyOyBWcnRjOiBudW1iZXI7IH07XG5cdFx0XHRyZWN0YW5nbGVDb3JuZXJCOiB7IEhyem46IG51bWJlcjsgVnJ0YzogbnVtYmVyOyB9O1xuXHRcdFx0cmVjdGFuZ2xlQ29ybmVyQzogeyBIcnpuOiBudW1iZXI7IFZydGM6IG51bWJlcjsgfTtcblx0XHRcdHJlY3RhbmdsZUNvcm5lckQ6IHsgSHJ6bjogbnVtYmVyOyBWcnRjOiBudW1iZXI7IH07XG5cdFx0fTtcblx0XHRUcm5mPzogeyB4eDogbnVtYmVyOyB4eTogbnVtYmVyOyB5eDogbnVtYmVyOyB5eTogbnVtYmVyOyB0eDogbnVtYmVyOyB0eTogbnVtYmVyOyB9LFxuXHRcdGtleU9yaWdpbkluZGV4OiBudW1iZXI7XG5cdH1bXTtcbn1cblxuYWRkSGFuZGxlcihcblx0J3ZvZ2snLFxuXHRoYXNLZXkoJ3ZlY3Rvck9yaWdpbmF0aW9uJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdGlmIChyZWFkSW50MzIocmVhZGVyKSAhPT0gMSkgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHZvZ2sgdmVyc2lvbmApO1xuXHRcdGNvbnN0IGRlc2MgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKSBhcyBWb2drRGVzY3JpcHRvcjtcblx0XHQvLyBjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChkZXNjLCBmYWxzZSwgOTksIHRydWUpKTtcblxuXHRcdHRhcmdldC52ZWN0b3JPcmlnaW5hdGlvbiA9IHsga2V5RGVzY3JpcHRvckxpc3Q6IFtdIH07XG5cblx0XHRmb3IgKGNvbnN0IGkgb2YgZGVzYy5rZXlEZXNjcmlwdG9yTGlzdCkge1xuXHRcdFx0Y29uc3QgaXRlbTogS2V5RGVzY3JpcHRvckl0ZW0gPSB7fTtcblxuXHRcdFx0aWYgKGkua2V5U2hhcGVJbnZhbGlkYXRlZCAhPSBudWxsKSBpdGVtLmtleVNoYXBlSW52YWxpZGF0ZWQgPSBpLmtleVNoYXBlSW52YWxpZGF0ZWQ7XG5cdFx0XHRpZiAoaS5rZXlPcmlnaW5UeXBlICE9IG51bGwpIGl0ZW0ua2V5T3JpZ2luVHlwZSA9IGkua2V5T3JpZ2luVHlwZTtcblx0XHRcdGlmIChpLmtleU9yaWdpblJlc29sdXRpb24gIT0gbnVsbCkgaXRlbS5rZXlPcmlnaW5SZXNvbHV0aW9uID0gaS5rZXlPcmlnaW5SZXNvbHV0aW9uO1xuXHRcdFx0aWYgKGkua2V5T3JpZ2luU2hhcGVCQm94KSB7XG5cdFx0XHRcdGl0ZW0ua2V5T3JpZ2luU2hhcGVCb3VuZGluZ0JveCA9IHtcblx0XHRcdFx0XHR0b3A6IHBhcnNlVW5pdHMoaS5rZXlPcmlnaW5TaGFwZUJCb3hbJ1RvcCAnXSksXG5cdFx0XHRcdFx0bGVmdDogcGFyc2VVbml0cyhpLmtleU9yaWdpblNoYXBlQkJveC5MZWZ0KSxcblx0XHRcdFx0XHRib3R0b206IHBhcnNlVW5pdHMoaS5rZXlPcmlnaW5TaGFwZUJCb3guQnRvbSksXG5cdFx0XHRcdFx0cmlnaHQ6IHBhcnNlVW5pdHMoaS5rZXlPcmlnaW5TaGFwZUJCb3guUmdodCksXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0XHRjb25zdCByZWN0UmFkaWkgPSBpLmtleU9yaWdpblJSZWN0UmFkaWk7XG5cdFx0XHRpZiAocmVjdFJhZGlpKSB7XG5cdFx0XHRcdGl0ZW0ua2V5T3JpZ2luUlJlY3RSYWRpaSA9IHtcblx0XHRcdFx0XHR0b3BSaWdodDogcGFyc2VVbml0cyhyZWN0UmFkaWkudG9wUmlnaHQpLFxuXHRcdFx0XHRcdHRvcExlZnQ6IHBhcnNlVW5pdHMocmVjdFJhZGlpLnRvcExlZnQpLFxuXHRcdFx0XHRcdGJvdHRvbUxlZnQ6IHBhcnNlVW5pdHMocmVjdFJhZGlpLmJvdHRvbUxlZnQpLFxuXHRcdFx0XHRcdGJvdHRvbVJpZ2h0OiBwYXJzZVVuaXRzKHJlY3RSYWRpaS5ib3R0b21SaWdodCksXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBjb3JuZXJzID0gaS5rZXlPcmlnaW5Cb3hDb3JuZXJzO1xuXHRcdFx0aWYgKGNvcm5lcnMpIHtcblx0XHRcdFx0aXRlbS5rZXlPcmlnaW5Cb3hDb3JuZXJzID0gW1xuXHRcdFx0XHRcdHsgeDogY29ybmVycy5yZWN0YW5nbGVDb3JuZXJBLkhyem4sIHk6IGNvcm5lcnMucmVjdGFuZ2xlQ29ybmVyQS5WcnRjIH0sXG5cdFx0XHRcdFx0eyB4OiBjb3JuZXJzLnJlY3RhbmdsZUNvcm5lckIuSHJ6biwgeTogY29ybmVycy5yZWN0YW5nbGVDb3JuZXJCLlZydGMgfSxcblx0XHRcdFx0XHR7IHg6IGNvcm5lcnMucmVjdGFuZ2xlQ29ybmVyQy5IcnpuLCB5OiBjb3JuZXJzLnJlY3RhbmdsZUNvcm5lckMuVnJ0YyB9LFxuXHRcdFx0XHRcdHsgeDogY29ybmVycy5yZWN0YW5nbGVDb3JuZXJELkhyem4sIHk6IGNvcm5lcnMucmVjdGFuZ2xlQ29ybmVyRC5WcnRjIH0sXG5cdFx0XHRcdF07XG5cdFx0XHR9XG5cdFx0XHRjb25zdCB0cm5mID0gaS5Ucm5mO1xuXHRcdFx0aWYgKHRybmYpIHtcblx0XHRcdFx0aXRlbS50cmFuc2Zvcm0gPSBbdHJuZi54eCwgdHJuZi54eSwgdHJuZi54eSwgdHJuZi55eSwgdHJuZi50eCwgdHJuZi50eV07XG5cdFx0XHR9XG5cblx0XHRcdHRhcmdldC52ZWN0b3JPcmlnaW5hdGlvbi5rZXlEZXNjcmlwdG9yTGlzdC5wdXNoKGl0ZW0pO1xuXHRcdH1cblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHRhcmdldDtcblx0XHRjb25zdCBvcmlnID0gdGFyZ2V0LnZlY3Rvck9yaWdpbmF0aW9uITtcblx0XHRjb25zdCBkZXNjOiBWb2drRGVzY3JpcHRvciA9IHsga2V5RGVzY3JpcHRvckxpc3Q6IFtdIH07XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IG9yaWcua2V5RGVzY3JpcHRvckxpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdGNvbnN0IGl0ZW0gPSBvcmlnLmtleURlc2NyaXB0b3JMaXN0W2ldO1xuXG5cdFx0XHRpZiAoaXRlbS5rZXlTaGFwZUludmFsaWRhdGVkKSB7XG5cdFx0XHRcdGRlc2Mua2V5RGVzY3JpcHRvckxpc3QucHVzaCh7IGtleVNoYXBlSW52YWxpZGF0ZWQ6IHRydWUsIGtleU9yaWdpbkluZGV4OiBpIH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZGVzYy5rZXlEZXNjcmlwdG9yTGlzdC5wdXNoKHt9IGFzIGFueSk7IC8vIHdlJ3JlIGFkZGluZyBrZXlPcmlnaW5JbmRleCBhdCB0aGUgZW5kXG5cblx0XHRcdFx0Y29uc3Qgb3V0ID0gZGVzYy5rZXlEZXNjcmlwdG9yTGlzdFtkZXNjLmtleURlc2NyaXB0b3JMaXN0Lmxlbmd0aCAtIDFdO1xuXG5cdFx0XHRcdGlmIChpdGVtLmtleU9yaWdpblR5cGUgIT0gbnVsbCkgb3V0LmtleU9yaWdpblR5cGUgPSBpdGVtLmtleU9yaWdpblR5cGU7XG5cdFx0XHRcdGlmIChpdGVtLmtleU9yaWdpblJlc29sdXRpb24gIT0gbnVsbCkgb3V0LmtleU9yaWdpblJlc29sdXRpb24gPSBpdGVtLmtleU9yaWdpblJlc29sdXRpb247XG5cblx0XHRcdFx0Y29uc3QgcmFkaWkgPSBpdGVtLmtleU9yaWdpblJSZWN0UmFkaWk7XG5cdFx0XHRcdGlmIChyYWRpaSkge1xuXHRcdFx0XHRcdG91dC5rZXlPcmlnaW5SUmVjdFJhZGlpID0ge1xuXHRcdFx0XHRcdFx0dW5pdFZhbHVlUXVhZFZlcnNpb246IDEsXG5cdFx0XHRcdFx0XHR0b3BSaWdodDogdW5pdHNWYWx1ZShyYWRpaS50b3BSaWdodCwgJ3RvcFJpZ2h0JyksXG5cdFx0XHRcdFx0XHR0b3BMZWZ0OiB1bml0c1ZhbHVlKHJhZGlpLnRvcExlZnQsICd0b3BMZWZ0JyksXG5cdFx0XHRcdFx0XHRib3R0b21MZWZ0OiB1bml0c1ZhbHVlKHJhZGlpLmJvdHRvbUxlZnQsICdib3R0b21MZWZ0JyksXG5cdFx0XHRcdFx0XHRib3R0b21SaWdodDogdW5pdHNWYWx1ZShyYWRpaS5ib3R0b21SaWdodCwgJ2JvdHRvbVJpZ2h0JyksXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IGJveCA9IGl0ZW0ua2V5T3JpZ2luU2hhcGVCb3VuZGluZ0JveDtcblx0XHRcdFx0aWYgKGJveCkge1xuXHRcdFx0XHRcdG91dC5rZXlPcmlnaW5TaGFwZUJCb3ggPSB7XG5cdFx0XHRcdFx0XHR1bml0VmFsdWVRdWFkVmVyc2lvbjogMSxcblx0XHRcdFx0XHRcdCdUb3AgJzogdW5pdHNWYWx1ZShib3gudG9wLCAndG9wJyksXG5cdFx0XHRcdFx0XHRMZWZ0OiB1bml0c1ZhbHVlKGJveC5sZWZ0LCAnbGVmdCcpLFxuXHRcdFx0XHRcdFx0QnRvbTogdW5pdHNWYWx1ZShib3guYm90dG9tLCAnYm90dG9tJyksXG5cdFx0XHRcdFx0XHRSZ2h0OiB1bml0c1ZhbHVlKGJveC5yaWdodCwgJ3JpZ2h0JyksXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IGNvcm5lcnMgPSBpdGVtLmtleU9yaWdpbkJveENvcm5lcnM7XG5cdFx0XHRcdGlmIChjb3JuZXJzICYmIGNvcm5lcnMubGVuZ3RoID09PSA0KSB7XG5cdFx0XHRcdFx0b3V0LmtleU9yaWdpbkJveENvcm5lcnMgPSB7XG5cdFx0XHRcdFx0XHRyZWN0YW5nbGVDb3JuZXJBOiB7IEhyem46IGNvcm5lcnNbMF0ueCwgVnJ0YzogY29ybmVyc1swXS55IH0sXG5cdFx0XHRcdFx0XHRyZWN0YW5nbGVDb3JuZXJCOiB7IEhyem46IGNvcm5lcnNbMV0ueCwgVnJ0YzogY29ybmVyc1sxXS55IH0sXG5cdFx0XHRcdFx0XHRyZWN0YW5nbGVDb3JuZXJDOiB7IEhyem46IGNvcm5lcnNbMl0ueCwgVnJ0YzogY29ybmVyc1syXS55IH0sXG5cdFx0XHRcdFx0XHRyZWN0YW5nbGVDb3JuZXJEOiB7IEhyem46IGNvcm5lcnNbM10ueCwgVnJ0YzogY29ybmVyc1szXS55IH0sXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IHRyYW5zZm9ybSA9IGl0ZW0udHJhbnNmb3JtO1xuXHRcdFx0XHRpZiAodHJhbnNmb3JtICYmIHRyYW5zZm9ybS5sZW5ndGggPT09IDYpIHtcblx0XHRcdFx0XHRvdXQuVHJuZiA9IHtcblx0XHRcdFx0XHRcdHh4OiB0cmFuc2Zvcm1bMF0sXG5cdFx0XHRcdFx0XHR4eTogdHJhbnNmb3JtWzFdLFxuXHRcdFx0XHRcdFx0eXg6IHRyYW5zZm9ybVsyXSxcblx0XHRcdFx0XHRcdHl5OiB0cmFuc2Zvcm1bM10sXG5cdFx0XHRcdFx0XHR0eDogdHJhbnNmb3JtWzRdLFxuXHRcdFx0XHRcdFx0dHk6IHRyYW5zZm9ybVs1XSxcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0b3V0LmtleU9yaWdpbkluZGV4ID0gaTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR3cml0ZUludDMyKHdyaXRlciwgMSk7IC8vIHZlcnNpb25cblx0XHR3cml0ZVZlcnNpb25BbmREZXNjcmlwdG9yKHdyaXRlciwgJycsICdudWxsJywgZGVzYyk7XG5cdH1cbik7XG5cbmFkZEhhbmRsZXIoXG5cdCdsbWZ4Jyxcblx0dGFyZ2V0ID0+IHRhcmdldC5lZmZlY3RzICE9PSB1bmRlZmluZWQgJiYgaGFzTXVsdGlFZmZlY3RzKHRhcmdldC5lZmZlY3RzKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0LCBfLCBvcHRpb25zKSA9PiB7XG5cdFx0Y29uc3QgdmVyc2lvbiA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHRpZiAodmVyc2lvbiAhPT0gMCkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGxtZnggdmVyc2lvbicpO1xuXG5cdFx0Y29uc3QgZGVzYzogTG1meERlc2NyaXB0b3IgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKTtcblx0XHQvLyBjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChpbmZvLCBmYWxzZSwgOTksIHRydWUpKTtcblxuXHRcdC8vIGRpc2NhcmQgaWYgcmVhZCBpbiAnbHJGWCcgb3IgJ2xmeDInIHNlY3Rpb25cblx0XHR0YXJnZXQuZWZmZWN0cyA9IHBhcnNlRWZmZWN0cyhkZXNjLCAhIW9wdGlvbnMubG9nTWlzc2luZ0ZlYXR1cmVzKTtcblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCwgXywgb3B0aW9ucykgPT4ge1xuXHRcdGNvbnN0IGRlc2MgPSBzZXJpYWxpemVFZmZlY3RzKHRhcmdldC5lZmZlY3RzISwgISFvcHRpb25zLmxvZ01pc3NpbmdGZWF0dXJlcywgdHJ1ZSk7XG5cblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIDApOyAvLyB2ZXJzaW9uXG5cdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnbnVsbCcsIGRlc2MpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J2xyRlgnLFxuXHRoYXNLZXkoJ2VmZmVjdHMnKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0aWYgKCF0YXJnZXQuZWZmZWN0cykgdGFyZ2V0LmVmZmVjdHMgPSByZWFkRWZmZWN0cyhyZWFkZXIpO1xuXG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVFZmZlY3RzKHdyaXRlciwgdGFyZ2V0LmVmZmVjdHMhKTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdCdsdW5pJyxcblx0aGFzS2V5KCduYW1lJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdHRhcmdldC5uYW1lID0gcmVhZFVuaWNvZGVTdHJpbmcocmVhZGVyKTtcblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHR3cml0ZVVuaWNvZGVTdHJpbmcod3JpdGVyLCB0YXJnZXQubmFtZSEpO1xuXHRcdC8vIHdyaXRlVWludDE2KHdyaXRlciwgMCk7IC8vIHBhZGRpbmcgKGJ1dCBub3QgZXh0ZW5kaW5nIHN0cmluZyBsZW5ndGgpXG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQnbG5zcicsXG5cdGhhc0tleSgnbmFtZVNvdXJjZScpLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHRhcmdldC5uYW1lU291cmNlID0gcmVhZFNpZ25hdHVyZShyZWFkZXIpLFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHdyaXRlU2lnbmF0dXJlKHdyaXRlciwgdGFyZ2V0Lm5hbWVTb3VyY2UhKSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdCdseWlkJyxcblx0aGFzS2V5KCdpZCcpLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHRhcmdldC5pZCA9IHJlYWRVaW50MzIocmVhZGVyKSxcblx0KHdyaXRlciwgdGFyZ2V0LCBfcHNkLCBvcHRpb25zKSA9PiB7XG5cdFx0bGV0IGlkID0gdGFyZ2V0LmlkITtcblx0XHR3aGlsZSAob3B0aW9ucy5sYXllcklkcy5pbmRleE9mKGlkKSAhPT0gLTEpIGlkICs9IDEwMDsgLy8gbWFrZSBzdXJlIHdlIGRvbid0IGhhdmUgZHVwbGljYXRlIGxheWVyIGlkc1xuXHRcdHdyaXRlVWludDMyKHdyaXRlciwgaWQpO1xuXHRcdG9wdGlvbnMubGF5ZXJJZHMucHVzaChpZCk7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQnbHNjdCcsXG5cdGhhc0tleSgnc2VjdGlvbkRpdmlkZXInKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0dGFyZ2V0LnNlY3Rpb25EaXZpZGVyID0geyB0eXBlOiByZWFkVWludDMyKHJlYWRlcikgfTtcblxuXHRcdGlmIChsZWZ0KCkpIHtcblx0XHRcdGNoZWNrU2lnbmF0dXJlKHJlYWRlciwgJzhCSU0nKTtcblx0XHRcdHRhcmdldC5zZWN0aW9uRGl2aWRlci5rZXkgPSByZWFkU2lnbmF0dXJlKHJlYWRlcik7XG5cdFx0fVxuXG5cdFx0aWYgKGxlZnQoKSkge1xuXHRcdFx0Ly8gMCA9IG5vcm1hbFxuXHRcdFx0Ly8gMSA9IHNjZW5lIGdyb3VwLCBhZmZlY3RzIHRoZSBhbmltYXRpb24gdGltZWxpbmUuXG5cdFx0XHR0YXJnZXQuc2VjdGlvbkRpdmlkZXIuc3ViVHlwZSA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHR9XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlVWludDMyKHdyaXRlciwgdGFyZ2V0LnNlY3Rpb25EaXZpZGVyIS50eXBlKTtcblxuXHRcdGlmICh0YXJnZXQuc2VjdGlvbkRpdmlkZXIhLmtleSkge1xuXHRcdFx0d3JpdGVTaWduYXR1cmUod3JpdGVyLCAnOEJJTScpO1xuXHRcdFx0d3JpdGVTaWduYXR1cmUod3JpdGVyLCB0YXJnZXQuc2VjdGlvbkRpdmlkZXIhLmtleSk7XG5cblx0XHRcdGlmICh0YXJnZXQuc2VjdGlvbkRpdmlkZXIhLnN1YlR5cGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIHRhcmdldC5zZWN0aW9uRGl2aWRlciEuc3ViVHlwZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuKTtcblxuLy8gaXQgc2VlbXMgbHNkayBpcyB1c2VkIHdoZW4gdGhlcmUncyBhIGxheWVyIGlzIG5lc3RlZCBtb3JlIHRoYW4gNiBsZXZlbHMsIGJ1dCBJIGRvbid0IGtub3cgd2h5P1xuLy8gbWF5YmUgc29tZSBsaW1pdGF0aW9uIG9mIG9sZCB2ZXJzaW9uIG9mIFBTP1xuYWRkSGFuZGxlckFsaWFzKCdsc2RrJywgJ2xzY3QnKTtcblxuYWRkSGFuZGxlcihcblx0J2NsYmwnLFxuXHRoYXNLZXkoJ2JsZW5kQ2xpcHBlbmRFbGVtZW50cycpLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHtcblx0XHR0YXJnZXQuYmxlbmRDbGlwcGVuZEVsZW1lbnRzID0gISFyZWFkVWludDgocmVhZGVyKTtcblx0XHRza2lwQnl0ZXMocmVhZGVyLCAzKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVVaW50OCh3cml0ZXIsIHRhcmdldC5ibGVuZENsaXBwZW5kRWxlbWVudHMgPyAxIDogMCk7XG5cdFx0d3JpdGVaZXJvcyh3cml0ZXIsIDMpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J2luZngnLFxuXHRoYXNLZXkoJ2JsZW5kSW50ZXJpb3JFbGVtZW50cycpLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHtcblx0XHR0YXJnZXQuYmxlbmRJbnRlcmlvckVsZW1lbnRzID0gISFyZWFkVWludDgocmVhZGVyKTtcblx0XHRza2lwQnl0ZXMocmVhZGVyLCAzKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVVaW50OCh3cml0ZXIsIHRhcmdldC5ibGVuZEludGVyaW9yRWxlbWVudHMgPyAxIDogMCk7XG5cdFx0d3JpdGVaZXJvcyh3cml0ZXIsIDMpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J2tua28nLFxuXHRoYXNLZXkoJ2tub2Nrb3V0JyksXG5cdChyZWFkZXIsIHRhcmdldCkgPT4ge1xuXHRcdHRhcmdldC5rbm9ja291dCA9ICEhcmVhZFVpbnQ4KHJlYWRlcik7XG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgMyk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlVWludDgod3JpdGVyLCB0YXJnZXQua25vY2tvdXQgPyAxIDogMCk7XG5cdFx0d3JpdGVaZXJvcyh3cml0ZXIsIDMpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J2xzcGYnLFxuXHRoYXNLZXkoJ3Byb3RlY3RlZCcpLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBmbGFncyA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHR0YXJnZXQucHJvdGVjdGVkID0ge1xuXHRcdFx0dHJhbnNwYXJlbmN5OiAoZmxhZ3MgJiAweDAxKSAhPT0gMCxcblx0XHRcdGNvbXBvc2l0ZTogKGZsYWdzICYgMHgwMikgIT09IDAsXG5cdFx0XHRwb3NpdGlvbjogKGZsYWdzICYgMHgwNCkgIT09IDAsXG5cdFx0fTtcblxuXHRcdGlmIChmbGFncyAmIDB4MDgpIHRhcmdldC5wcm90ZWN0ZWQuYXJ0Ym9hcmRzID0gdHJ1ZTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgZmxhZ3MgPVxuXHRcdFx0KHRhcmdldC5wcm90ZWN0ZWQhLnRyYW5zcGFyZW5jeSA/IDB4MDEgOiAwKSB8XG5cdFx0XHQodGFyZ2V0LnByb3RlY3RlZCEuY29tcG9zaXRlID8gMHgwMiA6IDApIHxcblx0XHRcdCh0YXJnZXQucHJvdGVjdGVkIS5wb3NpdGlvbiA/IDB4MDQgOiAwKSB8XG5cdFx0XHQodGFyZ2V0LnByb3RlY3RlZCEuYXJ0Ym9hcmRzID8gMHgwOCA6IDApO1xuXG5cdFx0d3JpdGVVaW50MzIod3JpdGVyLCBmbGFncyk7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQnbGNscicsXG5cdGhhc0tleSgnbGF5ZXJDb2xvcicpLFxuXHQocmVhZGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBjb2xvciA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRza2lwQnl0ZXMocmVhZGVyLCA2KTtcblx0XHR0YXJnZXQubGF5ZXJDb2xvciA9IGxheWVyQ29sb3JzW2NvbG9yXTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgaW5kZXggPSBsYXllckNvbG9ycy5pbmRleE9mKHRhcmdldC5sYXllckNvbG9yISk7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBpbmRleCA9PT0gLTEgPyAwIDogaW5kZXgpO1xuXHRcdHdyaXRlWmVyb3Mod3JpdGVyLCA2KTtcblx0fSxcbik7XG5cbmludGVyZmFjZSBDdXN0b21EZXNjcmlwdG9yIHtcblx0bGF5ZXJUaW1lPzogbnVtYmVyO1xufVxuXG5pbnRlcmZhY2UgRnJhbWVMaXN0RGVzY3JpcHRvciB7XG5cdExhSUQ6IG51bWJlcjtcblx0TGFTdDoge1xuXHRcdGVuYWI/OiBib29sZWFuO1xuXHRcdElNc2s/OiB7IE9mc3Q6IHsgSHJ6bjogbnVtYmVyOyBWcnRjOiBudW1iZXI7IH0gfTtcblx0XHRWTXNrPzogeyBPZnN0OiB7IEhyem46IG51bWJlcjsgVnJ0YzogbnVtYmVyOyB9IH07XG5cdFx0RlhSZj86IHsgSHJ6bjogbnVtYmVyOyBWcnRjOiBudW1iZXI7IH07XG5cdFx0RnJMczogbnVtYmVyW107XG5cdH1bXTtcbn1cblxuYWRkSGFuZGxlcihcblx0J3NobWQnLFxuXHRoYXNLZXkoJ3RpbWVzdGFtcCcpLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQsIF8sIG9wdGlvbnMpID0+IHtcblx0XHRjb25zdCBjb3VudCA9IHJlYWRVaW50MzIocmVhZGVyKTtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuXHRcdFx0Y2hlY2tTaWduYXR1cmUocmVhZGVyLCAnOEJJTScpO1xuXHRcdFx0Y29uc3Qga2V5ID0gcmVhZFNpZ25hdHVyZShyZWFkZXIpO1xuXHRcdFx0cmVhZFVpbnQ4KHJlYWRlcik7IC8vIGNvcHlcblx0XHRcdHNraXBCeXRlcyhyZWFkZXIsIDMpO1xuXG5cdFx0XHRyZWFkU2VjdGlvbihyZWFkZXIsIDEsIGxlZnQgPT4ge1xuXHRcdFx0XHRpZiAoa2V5ID09PSAnY3VzdCcpIHtcblx0XHRcdFx0XHRjb25zdCBkZXNjID0gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcikgYXMgQ3VzdG9tRGVzY3JpcHRvcjtcblx0XHRcdFx0XHRpZiAoZGVzYy5sYXllclRpbWUgIT09IHVuZGVmaW5lZCkgdGFyZ2V0LnRpbWVzdGFtcCA9IGRlc2MubGF5ZXJUaW1lO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGtleSA9PT0gJ21sc3QnKSB7XG5cdFx0XHRcdFx0Y29uc3QgZGVzYyA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpIGFzIEZyYW1lTGlzdERlc2NyaXB0b3I7XG5cdFx0XHRcdFx0b3B0aW9ucy5sb2dEZXZGZWF0dXJlcyAmJiBjb25zb2xlLmxvZygnbWxzdCcsIGRlc2MpO1xuXHRcdFx0XHRcdC8vIG9wdGlvbnMubG9nRGV2RmVhdHVyZXMgJiYgY29uc29sZS5sb2coJ21sc3QnLCByZXF1aXJlKCd1dGlsJykuaW5zcGVjdChkZXNjLCBmYWxzZSwgOTksIHRydWUpKTtcblx0XHRcdFx0fSBlbHNlIGlmIChrZXkgPT09ICdtZHluJykge1xuXHRcdFx0XHRcdC8vIGZyYW1lIGZsYWdzXG5cdFx0XHRcdFx0Y29uc3QgdW5rbm93biA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRcdFx0XHRjb25zdCBwcm9wYWdhdGUgPSByZWFkVWludDgocmVhZGVyKTtcblx0XHRcdFx0XHRjb25zdCBmbGFncyA9IHJlYWRVaW50OChyZWFkZXIpO1xuXHRcdFx0XHRcdGNvbnN0IHVuaWZ5TGF5ZXJQb3NpdGlvbiA9IChmbGFncyAmIDEpICE9PSAwO1xuXHRcdFx0XHRcdGNvbnN0IHVuaWZ5TGF5ZXJTdHlsZSA9IChmbGFncyAmIDIpICE9PSAwO1xuXHRcdFx0XHRcdGNvbnN0IHVuaWZ5TGF5ZXJWaXNpYmlsaXR5ID0gKGZsYWdzICYgNCkgIT09IDA7XG5cdFx0XHRcdFx0b3B0aW9ucy5sb2dEZXZGZWF0dXJlcyAmJiBjb25zb2xlLmxvZyhcblx0XHRcdFx0XHRcdCdtZHluJywgJ3Vua25vd246JywgdW5rbm93biwgJ3Byb3BhZ2F0ZTonLCBwcm9wYWdhdGUsXG5cdFx0XHRcdFx0XHQnZmxhZ3M6JywgZmxhZ3MsIHsgdW5pZnlMYXllclBvc2l0aW9uLCB1bmlmeUxheWVyU3R5bGUsIHVuaWZ5TGF5ZXJWaXNpYmlsaXR5IH0pO1xuXG5cdFx0XHRcdFx0Ly8gY29uc3QgZGVzYyA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpIGFzIEZyYW1lTGlzdERlc2NyaXB0b3I7XG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coJ21keW4nLCByZXF1aXJlKCd1dGlsJykuaW5zcGVjdChkZXNjLCBmYWxzZSwgOTksIHRydWUpKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRvcHRpb25zLmxvZ0RldkZlYXR1cmVzICYmIGNvbnNvbGUubG9nKCdVbmhhbmRsZWQgbWV0YWRhdGEnLCBrZXkpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGRlc2M6IEN1c3RvbURlc2NyaXB0b3IgPSB7XG5cdFx0XHRsYXllclRpbWU6IHRhcmdldC50aW1lc3RhbXAhLFxuXHRcdH07XG5cblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIDEpOyAvLyBjb3VudFxuXG5cdFx0d3JpdGVTaWduYXR1cmUod3JpdGVyLCAnOEJJTScpO1xuXHRcdHdyaXRlU2lnbmF0dXJlKHdyaXRlciwgJ2N1c3QnKTtcblx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgMCk7IC8vIGNvcHkgKGFsd2F5cyBmYWxzZSlcblx0XHR3cml0ZVplcm9zKHdyaXRlciwgMyk7XG5cdFx0d3JpdGVTZWN0aW9uKHdyaXRlciwgMiwgKCkgPT4gd3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnbWV0YWRhdGEnLCBkZXNjKSwgdHJ1ZSk7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQndnN0aycsXG5cdGhhc0tleSgndmVjdG9yU3Ryb2tlJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdGNvbnN0IGRlc2MgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKSBhcyBTdHJva2VEZXNjcmlwdG9yO1xuXHRcdC8vIGNvbnNvbGUubG9nKHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KGRlc2MsIGZhbHNlLCA5OSwgdHJ1ZSkpO1xuXG5cdFx0dGFyZ2V0LnZlY3RvclN0cm9rZSA9IHtcblx0XHRcdHN0cm9rZUVuYWJsZWQ6IGRlc2Muc3Ryb2tlRW5hYmxlZCxcblx0XHRcdGZpbGxFbmFibGVkOiBkZXNjLmZpbGxFbmFibGVkLFxuXHRcdFx0bGluZVdpZHRoOiBwYXJzZVVuaXRzKGRlc2Muc3Ryb2tlU3R5bGVMaW5lV2lkdGgpLFxuXHRcdFx0bGluZURhc2hPZmZzZXQ6IHBhcnNlVW5pdHMoZGVzYy5zdHJva2VTdHlsZUxpbmVEYXNoT2Zmc2V0KSxcblx0XHRcdG1pdGVyTGltaXQ6IGRlc2Muc3Ryb2tlU3R5bGVNaXRlckxpbWl0LFxuXHRcdFx0bGluZUNhcFR5cGU6IHN0cm9rZVN0eWxlTGluZUNhcFR5cGUuZGVjb2RlKGRlc2Muc3Ryb2tlU3R5bGVMaW5lQ2FwVHlwZSksXG5cdFx0XHRsaW5lSm9pblR5cGU6IHN0cm9rZVN0eWxlTGluZUpvaW5UeXBlLmRlY29kZShkZXNjLnN0cm9rZVN0eWxlTGluZUpvaW5UeXBlKSxcblx0XHRcdGxpbmVBbGlnbm1lbnQ6IHN0cm9rZVN0eWxlTGluZUFsaWdubWVudC5kZWNvZGUoZGVzYy5zdHJva2VTdHlsZUxpbmVBbGlnbm1lbnQpLFxuXHRcdFx0c2NhbGVMb2NrOiBkZXNjLnN0cm9rZVN0eWxlU2NhbGVMb2NrLFxuXHRcdFx0c3Ryb2tlQWRqdXN0OiBkZXNjLnN0cm9rZVN0eWxlU3Ryb2tlQWRqdXN0LFxuXHRcdFx0bGluZURhc2hTZXQ6IGRlc2Muc3Ryb2tlU3R5bGVMaW5lRGFzaFNldC5tYXAocGFyc2VVbml0cyksXG5cdFx0XHRibGVuZE1vZGU6IEJsbk0uZGVjb2RlKGRlc2Muc3Ryb2tlU3R5bGVCbGVuZE1vZGUpLFxuXHRcdFx0b3BhY2l0eTogcGFyc2VQZXJjZW50KGRlc2Muc3Ryb2tlU3R5bGVPcGFjaXR5KSxcblx0XHRcdGNvbnRlbnQ6IHBhcnNlVmVjdG9yQ29udGVudChkZXNjLnN0cm9rZVN0eWxlQ29udGVudCksXG5cdFx0XHRyZXNvbHV0aW9uOiBkZXNjLnN0cm9rZVN0eWxlUmVzb2x1dGlvbixcblx0XHR9O1xuXG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3Qgc3Ryb2tlID0gdGFyZ2V0LnZlY3RvclN0cm9rZSE7XG5cdFx0Y29uc3QgZGVzY3JpcHRvcjogU3Ryb2tlRGVzY3JpcHRvciA9IHtcblx0XHRcdHN0cm9rZVN0eWxlVmVyc2lvbjogMixcblx0XHRcdHN0cm9rZUVuYWJsZWQ6ICEhc3Ryb2tlLnN0cm9rZUVuYWJsZWQsXG5cdFx0XHRmaWxsRW5hYmxlZDogISFzdHJva2UuZmlsbEVuYWJsZWQsXG5cdFx0XHRzdHJva2VTdHlsZUxpbmVXaWR0aDogc3Ryb2tlLmxpbmVXaWR0aCB8fCB7IHZhbHVlOiAzLCB1bml0czogJ1BvaW50cycgfSxcblx0XHRcdHN0cm9rZVN0eWxlTGluZURhc2hPZmZzZXQ6IHN0cm9rZS5saW5lRGFzaE9mZnNldCB8fCB7IHZhbHVlOiAwLCB1bml0czogJ1BvaW50cycgfSxcblx0XHRcdHN0cm9rZVN0eWxlTWl0ZXJMaW1pdDogc3Ryb2tlLm1pdGVyTGltaXQgPz8gMTAwLFxuXHRcdFx0c3Ryb2tlU3R5bGVMaW5lQ2FwVHlwZTogc3Ryb2tlU3R5bGVMaW5lQ2FwVHlwZS5lbmNvZGUoc3Ryb2tlLmxpbmVDYXBUeXBlKSxcblx0XHRcdHN0cm9rZVN0eWxlTGluZUpvaW5UeXBlOiBzdHJva2VTdHlsZUxpbmVKb2luVHlwZS5lbmNvZGUoc3Ryb2tlLmxpbmVKb2luVHlwZSksXG5cdFx0XHRzdHJva2VTdHlsZUxpbmVBbGlnbm1lbnQ6IHN0cm9rZVN0eWxlTGluZUFsaWdubWVudC5lbmNvZGUoc3Ryb2tlLmxpbmVBbGlnbm1lbnQpLFxuXHRcdFx0c3Ryb2tlU3R5bGVTY2FsZUxvY2s6ICEhc3Ryb2tlLnNjYWxlTG9jayxcblx0XHRcdHN0cm9rZVN0eWxlU3Ryb2tlQWRqdXN0OiAhIXN0cm9rZS5zdHJva2VBZGp1c3QsXG5cdFx0XHRzdHJva2VTdHlsZUxpbmVEYXNoU2V0OiBzdHJva2UubGluZURhc2hTZXQgfHwgW10sXG5cdFx0XHRzdHJva2VTdHlsZUJsZW5kTW9kZTogQmxuTS5lbmNvZGUoc3Ryb2tlLmJsZW5kTW9kZSksXG5cdFx0XHRzdHJva2VTdHlsZU9wYWNpdHk6IHVuaXRzUGVyY2VudChzdHJva2Uub3BhY2l0eSA/PyAxKSxcblx0XHRcdHN0cm9rZVN0eWxlQ29udGVudDogc2VyaWFsaXplVmVjdG9yQ29udGVudChcblx0XHRcdFx0c3Ryb2tlLmNvbnRlbnQgfHwgeyB0eXBlOiAnY29sb3InLCBjb2xvcjogeyByOiAwLCBnOiAwLCBiOiAwIH0gfSkuZGVzY3JpcHRvcixcblx0XHRcdHN0cm9rZVN0eWxlUmVzb2x1dGlvbjogc3Ryb2tlLnJlc29sdXRpb24gPz8gNzIsXG5cdFx0fTtcblxuXHRcdHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgJ3N0cm9rZVN0eWxlJywgZGVzY3JpcHRvcik7XG5cdH0sXG4pO1xuXG5pbnRlcmZhY2UgQXJ0YkRlc2NyaXB0b3Ige1xuXHRhcnRib2FyZFJlY3Q6IHsgJ1RvcCAnOiBudW1iZXI7IExlZnQ6IG51bWJlcjsgQnRvbTogbnVtYmVyOyBSZ2h0OiBudW1iZXI7IH07XG5cdGd1aWRlSW5kZWNlczogYW55W107XG5cdGFydGJvYXJkUHJlc2V0TmFtZTogc3RyaW5nO1xuXHQnQ2xyICc6IERlc2NyaXB0b3JDb2xvcjtcblx0YXJ0Ym9hcmRCYWNrZ3JvdW5kVHlwZTogbnVtYmVyO1xufVxuXG5hZGRIYW5kbGVyKFxuXHQnYXJ0YicsIC8vIHBlci1sYXllciBhcmJvYXJkIGluZm9cblx0aGFzS2V5KCdhcnRib2FyZCcpLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRjb25zdCBkZXNjID0gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcikgYXMgQXJ0YkRlc2NyaXB0b3I7XG5cdFx0Y29uc3QgcmVjdCA9IGRlc2MuYXJ0Ym9hcmRSZWN0O1xuXHRcdHRhcmdldC5hcnRib2FyZCA9IHtcblx0XHRcdHJlY3Q6IHsgdG9wOiByZWN0WydUb3AgJ10sIGxlZnQ6IHJlY3QuTGVmdCwgYm90dG9tOiByZWN0LkJ0b20sIHJpZ2h0OiByZWN0LlJnaHQgfSxcblx0XHRcdGd1aWRlSW5kaWNlczogZGVzYy5ndWlkZUluZGVjZXMsXG5cdFx0XHRwcmVzZXROYW1lOiBkZXNjLmFydGJvYXJkUHJlc2V0TmFtZSxcblx0XHRcdGNvbG9yOiBwYXJzZUNvbG9yKGRlc2NbJ0NsciAnXSksXG5cdFx0XHRiYWNrZ3JvdW5kVHlwZTogZGVzYy5hcnRib2FyZEJhY2tncm91bmRUeXBlLFxuXHRcdH07XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBhcnRib2FyZCA9IHRhcmdldC5hcnRib2FyZCE7XG5cdFx0Y29uc3QgcmVjdCA9IGFydGJvYXJkLnJlY3Q7XG5cdFx0Y29uc3QgZGVzYzogQXJ0YkRlc2NyaXB0b3IgPSB7XG5cdFx0XHRhcnRib2FyZFJlY3Q6IHsgJ1RvcCAnOiByZWN0LnRvcCwgTGVmdDogcmVjdC5sZWZ0LCBCdG9tOiByZWN0LmJvdHRvbSwgUmdodDogcmVjdC5yaWdodCB9LFxuXHRcdFx0Z3VpZGVJbmRlY2VzOiBhcnRib2FyZC5ndWlkZUluZGljZXMgfHwgW10sXG5cdFx0XHRhcnRib2FyZFByZXNldE5hbWU6IGFydGJvYXJkLnByZXNldE5hbWUgfHwgJycsXG5cdFx0XHQnQ2xyICc6IHNlcmlhbGl6ZUNvbG9yKGFydGJvYXJkLmNvbG9yKSxcblx0XHRcdGFydGJvYXJkQmFja2dyb3VuZFR5cGU6IGFydGJvYXJkLmJhY2tncm91bmRUeXBlID8/IDEsXG5cdFx0fTtcblxuXHRcdHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgJ2FydGJvYXJkJywgZGVzYyk7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQnc24yUCcsXG5cdGhhc0tleSgndXNpbmdBbGlnbmVkUmVuZGVyaW5nJyksXG5cdChyZWFkZXIsIHRhcmdldCkgPT4gdGFyZ2V0LnVzaW5nQWxpZ25lZFJlbmRlcmluZyA9ICEhcmVhZFVpbnQzMihyZWFkZXIpLFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHdyaXRlVWludDMyKHdyaXRlciwgdGFyZ2V0LnVzaW5nQWxpZ25lZFJlbmRlcmluZyA/IDEgOiAwKSxcbik7XG5cbmNvbnN0IHBsYWNlZExheWVyVHlwZXM6IFBsYWNlZExheWVyVHlwZVtdID0gWyd1bmtub3duJywgJ3ZlY3RvcicsICdyYXN0ZXInLCAnaW1hZ2Ugc3RhY2snXTtcblxuZnVuY3Rpb24gcGFyc2VXYXJwKHdhcnA6IFdhcnBEZXNjcmlwdG9yICYgUXVpbHRXYXJwRGVzY3JpcHRvcik6IFdhcnAge1xuXHRjb25zdCByZXN1bHQ6IFdhcnAgPSB7XG5cdFx0c3R5bGU6IHdhcnBTdHlsZS5kZWNvZGUod2FycC53YXJwU3R5bGUpLFxuXHRcdHZhbHVlOiB3YXJwLndhcnBWYWx1ZSB8fCAwLFxuXHRcdHBlcnNwZWN0aXZlOiB3YXJwLndhcnBQZXJzcGVjdGl2ZSB8fCAwLFxuXHRcdHBlcnNwZWN0aXZlT3RoZXI6IHdhcnAud2FycFBlcnNwZWN0aXZlT3RoZXIgfHwgMCxcblx0XHRyb3RhdGU6IE9ybnQuZGVjb2RlKHdhcnAud2FycFJvdGF0ZSksXG5cdFx0Ym91bmRzOiB3YXJwLmJvdW5kcyAmJiB7XG5cdFx0XHR0b3A6IHBhcnNlVW5pdHNPck51bWJlcih3YXJwLmJvdW5kc1snVG9wICddKSxcblx0XHRcdGxlZnQ6IHBhcnNlVW5pdHNPck51bWJlcih3YXJwLmJvdW5kcy5MZWZ0KSxcblx0XHRcdGJvdHRvbTogcGFyc2VVbml0c09yTnVtYmVyKHdhcnAuYm91bmRzLkJ0b20pLFxuXHRcdFx0cmlnaHQ6IHBhcnNlVW5pdHNPck51bWJlcih3YXJwLmJvdW5kcy5SZ2h0KSxcblx0XHR9LFxuXHRcdHVPcmRlcjogd2FycC51T3JkZXIsXG5cdFx0dk9yZGVyOiB3YXJwLnZPcmRlcixcblx0fTtcblxuXHRpZiAod2FycC5kZWZvcm1OdW1Sb3dzICE9IG51bGwgfHwgd2FycC5kZWZvcm1OdW1Db2xzICE9IG51bGwpIHtcblx0XHRyZXN1bHQuZGVmb3JtTnVtUm93cyA9IHdhcnAuZGVmb3JtTnVtUm93cztcblx0XHRyZXN1bHQuZGVmb3JtTnVtQ29scyA9IHdhcnAuZGVmb3JtTnVtQ29scztcblx0fVxuXG5cdGNvbnN0IGVudmVsb3BlV2FycCA9IHdhcnAuY3VzdG9tRW52ZWxvcGVXYXJwO1xuXHRpZiAoZW52ZWxvcGVXYXJwKSB7XG5cdFx0cmVzdWx0LmN1c3RvbUVudmVsb3BlV2FycCA9IHtcblx0XHRcdG1lc2hQb2ludHM6IFtdLFxuXHRcdH07XG5cblx0XHRjb25zdCB4cyA9IGVudmVsb3BlV2FycC5tZXNoUG9pbnRzLmZpbmQoaSA9PiBpLnR5cGUgPT09ICdIcnpuJyk/LnZhbHVlcyB8fCBbXTtcblx0XHRjb25zdCB5cyA9IGVudmVsb3BlV2FycC5tZXNoUG9pbnRzLmZpbmQoaSA9PiBpLnR5cGUgPT09ICdWcnRjJyk/LnZhbHVlcyB8fCBbXTtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHJlc3VsdC5jdXN0b21FbnZlbG9wZVdhcnAhLm1lc2hQb2ludHMucHVzaCh7IHg6IHhzW2ldLCB5OiB5c1tpXSB9KTtcblx0XHR9XG5cblx0XHRpZiAoZW52ZWxvcGVXYXJwLnF1aWx0U2xpY2VYIHx8IGVudmVsb3BlV2FycC5xdWlsdFNsaWNlWSkge1xuXHRcdFx0cmVzdWx0LmN1c3RvbUVudmVsb3BlV2FycC5xdWlsdFNsaWNlWCA9IGVudmVsb3BlV2FycC5xdWlsdFNsaWNlWD8uWzBdPy52YWx1ZXMgfHwgW107XG5cdFx0XHRyZXN1bHQuY3VzdG9tRW52ZWxvcGVXYXJwLnF1aWx0U2xpY2VZID0gZW52ZWxvcGVXYXJwLnF1aWx0U2xpY2VZPy5bMF0/LnZhbHVlcyB8fCBbXTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBpc1F1aWx0V2FycCh3YXJwOiBXYXJwKSB7XG5cdHJldHVybiB3YXJwLmRlZm9ybU51bUNvbHMgIT0gbnVsbCB8fCB3YXJwLmRlZm9ybU51bVJvd3MgIT0gbnVsbCB8fFxuXHRcdHdhcnAuY3VzdG9tRW52ZWxvcGVXYXJwPy5xdWlsdFNsaWNlWCB8fCB3YXJwLmN1c3RvbUVudmVsb3BlV2FycD8ucXVpbHRTbGljZVk7XG59XG5cbmZ1bmN0aW9uIGVuY29kZVdhcnAod2FycDogV2FycCk6IFdhcnBEZXNjcmlwdG9yIHtcblx0Y29uc3QgYm91bmRzID0gd2FycC5ib3VuZHM7XG5cdGNvbnN0IGRlc2M6IFdhcnBEZXNjcmlwdG9yID0ge1xuXHRcdHdhcnBTdHlsZTogd2FycFN0eWxlLmVuY29kZSh3YXJwLnN0eWxlKSxcblx0XHR3YXJwVmFsdWU6IHdhcnAudmFsdWUgfHwgMCxcblx0XHR3YXJwUGVyc3BlY3RpdmU6IHdhcnAucGVyc3BlY3RpdmUgfHwgMCxcblx0XHR3YXJwUGVyc3BlY3RpdmVPdGhlcjogd2FycC5wZXJzcGVjdGl2ZU90aGVyIHx8IDAsXG5cdFx0d2FycFJvdGF0ZTogT3JudC5lbmNvZGUod2FycC5yb3RhdGUpLFxuXHRcdGJvdW5kczoge1xuXHRcdFx0J1RvcCAnOiB1bml0c1ZhbHVlKGJvdW5kcyAmJiBib3VuZHMudG9wIHx8IHsgdW5pdHM6ICdQaXhlbHMnLCB2YWx1ZTogMCB9LCAnYm91bmRzLnRvcCcpLFxuXHRcdFx0TGVmdDogdW5pdHNWYWx1ZShib3VuZHMgJiYgYm91bmRzLmxlZnQgfHwgeyB1bml0czogJ1BpeGVscycsIHZhbHVlOiAwIH0sICdib3VuZHMubGVmdCcpLFxuXHRcdFx0QnRvbTogdW5pdHNWYWx1ZShib3VuZHMgJiYgYm91bmRzLmJvdHRvbSB8fCB7IHVuaXRzOiAnUGl4ZWxzJywgdmFsdWU6IDAgfSwgJ2JvdW5kcy5ib3R0b20nKSxcblx0XHRcdFJnaHQ6IHVuaXRzVmFsdWUoYm91bmRzICYmIGJvdW5kcy5yaWdodCB8fCB7IHVuaXRzOiAnUGl4ZWxzJywgdmFsdWU6IDAgfSwgJ2JvdW5kcy5yaWdodCcpLFxuXHRcdH0sXG5cdFx0dU9yZGVyOiB3YXJwLnVPcmRlciB8fCAwLFxuXHRcdHZPcmRlcjogd2FycC52T3JkZXIgfHwgMCxcblx0fTtcblxuXHRjb25zdCBpc1F1aWx0ID0gaXNRdWlsdFdhcnAod2FycCk7XG5cblx0aWYgKGlzUXVpbHQpIHtcblx0XHRjb25zdCBkZXNjMiA9IGRlc2MgYXMgUXVpbHRXYXJwRGVzY3JpcHRvcjtcblx0XHRkZXNjMi5kZWZvcm1OdW1Sb3dzID0gd2FycC5kZWZvcm1OdW1Sb3dzIHx8IDA7XG5cdFx0ZGVzYzIuZGVmb3JtTnVtQ29scyA9IHdhcnAuZGVmb3JtTnVtQ29scyB8fCAwO1xuXHR9XG5cblx0Y29uc3QgY3VzdG9tRW52ZWxvcGVXYXJwID0gd2FycC5jdXN0b21FbnZlbG9wZVdhcnA7XG5cdGlmIChjdXN0b21FbnZlbG9wZVdhcnApIHtcblx0XHRjb25zdCBtZXNoUG9pbnRzID0gY3VzdG9tRW52ZWxvcGVXYXJwLm1lc2hQb2ludHMgfHwgW107XG5cblx0XHRpZiAoaXNRdWlsdCkge1xuXHRcdFx0Y29uc3QgZGVzYzIgPSBkZXNjIGFzIFF1aWx0V2FycERlc2NyaXB0b3I7XG5cdFx0XHRkZXNjMi5jdXN0b21FbnZlbG9wZVdhcnAgPSB7XG5cdFx0XHRcdHF1aWx0U2xpY2VYOiBbe1xuXHRcdFx0XHRcdHR5cGU6ICdxdWlsdFNsaWNlWCcsXG5cdFx0XHRcdFx0dmFsdWVzOiBjdXN0b21FbnZlbG9wZVdhcnAucXVpbHRTbGljZVggfHwgW10sXG5cdFx0XHRcdH1dLFxuXHRcdFx0XHRxdWlsdFNsaWNlWTogW3tcblx0XHRcdFx0XHR0eXBlOiAncXVpbHRTbGljZVknLFxuXHRcdFx0XHRcdHZhbHVlczogY3VzdG9tRW52ZWxvcGVXYXJwLnF1aWx0U2xpY2VZIHx8IFtdLFxuXHRcdFx0XHR9XSxcblx0XHRcdFx0bWVzaFBvaW50czogW1xuXHRcdFx0XHRcdHsgdHlwZTogJ0hyem4nLCB2YWx1ZXM6IG1lc2hQb2ludHMubWFwKHAgPT4gcC54KSB9LFxuXHRcdFx0XHRcdHsgdHlwZTogJ1ZydGMnLCB2YWx1ZXM6IG1lc2hQb2ludHMubWFwKHAgPT4gcC55KSB9LFxuXHRcdFx0XHRdLFxuXHRcdFx0fTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZGVzYy5jdXN0b21FbnZlbG9wZVdhcnAgPSB7XG5cdFx0XHRcdG1lc2hQb2ludHM6IFtcblx0XHRcdFx0XHR7IHR5cGU6ICdIcnpuJywgdmFsdWVzOiBtZXNoUG9pbnRzLm1hcChwID0+IHAueCkgfSxcblx0XHRcdFx0XHR7IHR5cGU6ICdWcnRjJywgdmFsdWVzOiBtZXNoUG9pbnRzLm1hcChwID0+IHAueSkgfSxcblx0XHRcdFx0XSxcblx0XHRcdH07XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGRlc2M7XG59XG5cbmFkZEhhbmRsZXIoXG5cdCdQbExkJyxcblx0aGFzS2V5KCdwbGFjZWRMYXllcicpLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRpZiAocmVhZFNpZ25hdHVyZShyZWFkZXIpICE9PSAncGxjTCcpIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBQbExkIHNpZ25hdHVyZWApO1xuXHRcdGlmIChyZWFkSW50MzIocmVhZGVyKSAhPT0gMykgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIFBsTGQgdmVyc2lvbmApO1xuXHRcdGNvbnN0IGlkID0gcmVhZFBhc2NhbFN0cmluZyhyZWFkZXIsIDEpO1xuXHRcdHJlYWRJbnQzMihyZWFkZXIpOyAvLyBwYWdlTnVtYmVyXG5cdFx0cmVhZEludDMyKHJlYWRlcik7IC8vIHRvdGFsUGFnZXMsIFRPRE86IGNoZWNrIGhvdyB0aGlzIHdvcmtzID9cblx0XHRyZWFkSW50MzIocmVhZGVyKTsgLy8gYW5pdEFsaWFzUG9saWN5IDE2XG5cdFx0Y29uc3QgcGxhY2VkTGF5ZXJUeXBlID0gcmVhZEludDMyKHJlYWRlcik7IC8vIDAgPSB1bmtub3duLCAxID0gdmVjdG9yLCAyID0gcmFzdGVyLCAzID0gaW1hZ2Ugc3RhY2tcblx0XHRpZiAoIXBsYWNlZExheWVyVHlwZXNbcGxhY2VkTGF5ZXJUeXBlXSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFBsTGQgdHlwZScpO1xuXHRcdGNvbnN0IHRyYW5zZm9ybTogbnVtYmVyW10gPSBbXTtcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IDg7IGkrKykgdHJhbnNmb3JtLnB1c2gocmVhZEZsb2F0NjQocmVhZGVyKSk7IC8vIHgsIHkgb2YgNCBjb3JuZXJzIG9mIHRoZSB0cmFuc2Zvcm1cblx0XHRjb25zdCB3YXJwVmVyc2lvbiA9IHJlYWRJbnQzMihyZWFkZXIpO1xuXHRcdGlmICh3YXJwVmVyc2lvbiAhPT0gMCkgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIFdhcnAgdmVyc2lvbiAke3dhcnBWZXJzaW9ufWApO1xuXHRcdGNvbnN0IHdhcnA6IFdhcnBEZXNjcmlwdG9yICYgUXVpbHRXYXJwRGVzY3JpcHRvciA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpO1xuXG5cdFx0dGFyZ2V0LnBsYWNlZExheWVyID0gdGFyZ2V0LnBsYWNlZExheWVyIHx8IHsgLy8gc2tpcCBpZiBTb0xkIGFscmVhZHkgc2V0IGl0XG5cdFx0XHRpZCxcblx0XHRcdHR5cGU6IHBsYWNlZExheWVyVHlwZXNbcGxhY2VkTGF5ZXJUeXBlXSxcblx0XHRcdC8vIHBhZ2VOdW1iZXIsXG5cdFx0XHQvLyB0b3RhbFBhZ2VzLFxuXHRcdFx0dHJhbnNmb3JtLFxuXHRcdFx0d2FycDogcGFyc2VXYXJwKHdhcnApLFxuXHRcdH07XG5cblx0XHQvLyBjb25zb2xlLmxvZygnUGxMZCB3YXJwJywgcmVxdWlyZSgndXRpbCcpLmluc3BlY3Qod2FycCwgZmFsc2UsIDk5LCB0cnVlKSk7XG5cdFx0Ly8gY29uc29sZS5sb2coJ1BsTGQnLCByZXF1aXJlKCd1dGlsJykuaW5zcGVjdCh0YXJnZXQucGxhY2VkTGF5ZXIsIGZhbHNlLCA5OSwgdHJ1ZSkpO1xuXG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgcGxhY2VkID0gdGFyZ2V0LnBsYWNlZExheWVyITtcblx0XHR3cml0ZVNpZ25hdHVyZSh3cml0ZXIsICdwbGNMJyk7XG5cdFx0d3JpdGVJbnQzMih3cml0ZXIsIDMpOyAvLyB2ZXJzaW9uXG5cdFx0d3JpdGVQYXNjYWxTdHJpbmcod3JpdGVyLCBwbGFjZWQuaWQsIDEpO1xuXHRcdHdyaXRlSW50MzIod3JpdGVyLCAxKTsgLy8gcGFnZU51bWJlclxuXHRcdHdyaXRlSW50MzIod3JpdGVyLCAxKTsgLy8gdG90YWxQYWdlc1xuXHRcdHdyaXRlSW50MzIod3JpdGVyLCAxNik7IC8vIGFuaXRBbGlhc1BvbGljeVxuXHRcdGlmIChwbGFjZWRMYXllclR5cGVzLmluZGV4T2YocGxhY2VkLnR5cGUpID09PSAtMSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHBsYWNlZExheWVyIHR5cGUnKTtcblx0XHR3cml0ZUludDMyKHdyaXRlciwgcGxhY2VkTGF5ZXJUeXBlcy5pbmRleE9mKHBsYWNlZC50eXBlKSk7XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCA4OyBpKyspIHdyaXRlRmxvYXQ2NCh3cml0ZXIsIHBsYWNlZC50cmFuc2Zvcm1baV0pO1xuXHRcdHdyaXRlSW50MzIod3JpdGVyLCAwKTsgLy8gd2FycCB2ZXJzaW9uXG5cdFx0Y29uc3QgaXNRdWlsdCA9IHBsYWNlZC53YXJwICYmIGlzUXVpbHRXYXJwKHBsYWNlZC53YXJwKTtcblx0XHRjb25zdCB0eXBlID0gaXNRdWlsdCA/ICdxdWlsdFdhcnAnIDogJ3dhcnAnO1xuXHRcdHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgdHlwZSwgZW5jb2RlV2FycChwbGFjZWQud2FycCB8fCB7fSksIHR5cGUpO1xuXHR9LFxuKTtcblxuaW50ZXJmYWNlIFNvTGREZXNjcmlwdG9yIHtcblx0SWRudDogc3RyaW5nO1xuXHRwbGFjZWQ6IHN0cmluZztcblx0UGdObTogbnVtYmVyO1xuXHR0b3RhbFBhZ2VzOiBudW1iZXI7XG5cdENyb3A/OiBudW1iZXI7XG5cdGZyYW1lU3RlcDogeyBudW1lcmF0b3I6IG51bWJlcjsgZGVub21pbmF0b3I6IG51bWJlcjsgfTtcblx0ZHVyYXRpb246IHsgbnVtZXJhdG9yOiBudW1iZXI7IGRlbm9taW5hdG9yOiBudW1iZXI7IH07XG5cdGZyYW1lQ291bnQ6IG51bWJlcjtcblx0QW5udDogbnVtYmVyO1xuXHRUeXBlOiBudW1iZXI7XG5cdFRybmY6IG51bWJlcltdO1xuXHRub25BZmZpbmVUcmFuc2Zvcm06IG51bWJlcltdO1xuXHRxdWlsdFdhcnA/OiBRdWlsdFdhcnBEZXNjcmlwdG9yO1xuXHR3YXJwOiBXYXJwRGVzY3JpcHRvcjtcblx0J1N6ICAnOiB7IFdkdGg6IG51bWJlcjsgSGdodDogbnVtYmVyOyB9O1xuXHRSc2x0OiBEZXNjcmlwdG9yVW5pdHNWYWx1ZTtcblx0Y29tcD86IG51bWJlcjtcblx0Y29tcEluZm8/OiB7IGNvbXBJRDogbnVtYmVyOyBvcmlnaW5hbENvbXBJRDogbnVtYmVyOyB9O1xufVxuXG5hZGRIYW5kbGVyKFxuXHQnU29MZCcsXG5cdGhhc0tleSgncGxhY2VkTGF5ZXInKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0aWYgKHJlYWRTaWduYXR1cmUocmVhZGVyKSAhPT0gJ3NvTEQnKSB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgU29MZCB0eXBlYCk7XG5cdFx0aWYgKHJlYWRJbnQzMihyZWFkZXIpICE9PSA0KSB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgU29MZCB2ZXJzaW9uYCk7XG5cdFx0Y29uc3QgZGVzYzogU29MZERlc2NyaXB0b3IgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKTtcblx0XHQvLyBjb25zb2xlLmxvZygnU29MZCcsIHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KGRlc2MsIGZhbHNlLCA5OSwgdHJ1ZSkpO1xuXHRcdC8vIGNvbnNvbGUubG9nKCdTb0xkLndhcnAnLCByZXF1aXJlKCd1dGlsJykuaW5zcGVjdChkZXNjLndhcnAsIGZhbHNlLCA5OSwgdHJ1ZSkpO1xuXHRcdC8vIGNvbnNvbGUubG9nKCdTb0xkLnF1aWx0V2FycCcsIHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KGRlc2MucXVpbHRXYXJwLCBmYWxzZSwgOTksIHRydWUpKTtcblxuXHRcdHRhcmdldC5wbGFjZWRMYXllciA9IHtcblx0XHRcdGlkOiBkZXNjLklkbnQsXG5cdFx0XHRwbGFjZWQ6IGRlc2MucGxhY2VkLFxuXHRcdFx0dHlwZTogcGxhY2VkTGF5ZXJUeXBlc1tkZXNjLlR5cGVdLFxuXHRcdFx0Ly8gcGFnZU51bWJlcjogaW5mby5QZ05tLFxuXHRcdFx0Ly8gdG90YWxQYWdlczogaW5mby50b3RhbFBhZ2VzLFxuXHRcdFx0Ly8gZnJhbWVTdGVwOiBpbmZvLmZyYW1lU3RlcCxcblx0XHRcdC8vIGR1cmF0aW9uOiBpbmZvLmR1cmF0aW9uLFxuXHRcdFx0Ly8gZnJhbWVDb3VudDogaW5mby5mcmFtZUNvdW50LFxuXHRcdFx0dHJhbnNmb3JtOiBkZXNjLlRybmYsXG5cdFx0XHR3aWR0aDogZGVzY1snU3ogICddLldkdGgsXG5cdFx0XHRoZWlnaHQ6IGRlc2NbJ1N6ICAnXS5IZ2h0LFxuXHRcdFx0cmVzb2x1dGlvbjogcGFyc2VVbml0cyhkZXNjLlJzbHQpLFxuXHRcdFx0d2FycDogcGFyc2VXYXJwKChkZXNjLnF1aWx0V2FycCB8fCBkZXNjLndhcnApIGFzIGFueSksXG5cdFx0fTtcblxuXHRcdGlmIChkZXNjLm5vbkFmZmluZVRyYW5zZm9ybSAmJiBkZXNjLm5vbkFmZmluZVRyYW5zZm9ybS5zb21lKCh4LCBpKSA9PiB4ICE9PSBkZXNjLlRybmZbaV0pKSB7XG5cdFx0XHR0YXJnZXQucGxhY2VkTGF5ZXIubm9uQWZmaW5lVHJhbnNmb3JtID0gZGVzYy5ub25BZmZpbmVUcmFuc2Zvcm07XG5cdFx0fVxuXG5cdFx0aWYgKGRlc2MuQ3JvcCkgdGFyZ2V0LnBsYWNlZExheWVyLmNyb3AgPSBkZXNjLkNyb3A7XG5cdFx0aWYgKGRlc2MuY29tcCkgdGFyZ2V0LnBsYWNlZExheWVyLmNvbXAgPSBkZXNjLmNvbXA7XG5cdFx0aWYgKGRlc2MuY29tcEluZm8pIHRhcmdldC5wbGFjZWRMYXllci5jb21wSW5mbyA9IGRlc2MuY29tcEluZm87XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpOyAvLyBIQUNLXG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlU2lnbmF0dXJlKHdyaXRlciwgJ3NvTEQnKTtcblx0XHR3cml0ZUludDMyKHdyaXRlciwgNCk7IC8vIHZlcnNpb25cblxuXHRcdGNvbnN0IHBsYWNlZCA9IHRhcmdldC5wbGFjZWRMYXllciE7XG5cdFx0Y29uc3QgZGVzYzogU29MZERlc2NyaXB0b3IgPSB7XG5cdFx0XHRJZG50OiBwbGFjZWQuaWQsXG5cdFx0XHRwbGFjZWQ6IHBsYWNlZC5wbGFjZWQgPz8gcGxhY2VkLmlkLCAvLyA/Pz9cblx0XHRcdFBnTm06IDEsXG5cdFx0XHR0b3RhbFBhZ2VzOiAxLFxuXHRcdFx0Li4uKHBsYWNlZC5jcm9wID8geyBDcm9wOiBwbGFjZWQuY3JvcCB9IDoge30pLFxuXHRcdFx0ZnJhbWVTdGVwOiB7XG5cdFx0XHRcdG51bWVyYXRvcjogMCxcblx0XHRcdFx0ZGVub21pbmF0b3I6IDYwMFxuXHRcdFx0fSxcblx0XHRcdGR1cmF0aW9uOiB7XG5cdFx0XHRcdG51bWVyYXRvcjogMCxcblx0XHRcdFx0ZGVub21pbmF0b3I6IDYwMFxuXHRcdFx0fSxcblx0XHRcdGZyYW1lQ291bnQ6IDEsXG5cdFx0XHRBbm50OiAxNixcblx0XHRcdFR5cGU6IHBsYWNlZExheWVyVHlwZXMuaW5kZXhPZihwbGFjZWQudHlwZSksXG5cdFx0XHRUcm5mOiBwbGFjZWQudHJhbnNmb3JtLFxuXHRcdFx0bm9uQWZmaW5lVHJhbnNmb3JtOiBwbGFjZWQubm9uQWZmaW5lVHJhbnNmb3JtID8/IHBsYWNlZC50cmFuc2Zvcm0sXG5cdFx0XHRxdWlsdFdhcnA6IHt9IGFzIGFueSxcblx0XHRcdHdhcnA6IGVuY29kZVdhcnAocGxhY2VkLndhcnAgfHwge30pLFxuXHRcdFx0J1N6ICAnOiB7XG5cdFx0XHRcdFdkdGg6IHBsYWNlZC53aWR0aCB8fCAwLCAvLyBUT0RPOiBmaW5kIHNpemUgP1xuXHRcdFx0XHRIZ2h0OiBwbGFjZWQuaGVpZ2h0IHx8IDAsIC8vIFRPRE86IGZpbmQgc2l6ZSA/XG5cdFx0XHR9LFxuXHRcdFx0UnNsdDogcGxhY2VkLnJlc29sdXRpb24gPyB1bml0c1ZhbHVlKHBsYWNlZC5yZXNvbHV0aW9uLCAncmVzb2x1dGlvbicpIDogeyB1bml0czogJ0RlbnNpdHknLCB2YWx1ZTogNzIgfSxcblx0XHR9O1xuXG5cdFx0aWYgKHBsYWNlZC53YXJwICYmIGlzUXVpbHRXYXJwKHBsYWNlZC53YXJwKSkge1xuXHRcdFx0Y29uc3QgcXVpbHRXYXJwID0gZW5jb2RlV2FycChwbGFjZWQud2FycCkgYXMgUXVpbHRXYXJwRGVzY3JpcHRvcjtcblx0XHRcdGRlc2MucXVpbHRXYXJwID0gcXVpbHRXYXJwO1xuXHRcdFx0ZGVzYy53YXJwID0ge1xuXHRcdFx0XHR3YXJwU3R5bGU6ICd3YXJwU3R5bGUud2FycE5vbmUnLFxuXHRcdFx0XHR3YXJwVmFsdWU6IHF1aWx0V2FycC53YXJwVmFsdWUsXG5cdFx0XHRcdHdhcnBQZXJzcGVjdGl2ZTogcXVpbHRXYXJwLndhcnBQZXJzcGVjdGl2ZSxcblx0XHRcdFx0d2FycFBlcnNwZWN0aXZlT3RoZXI6IHF1aWx0V2FycC53YXJwUGVyc3BlY3RpdmVPdGhlcixcblx0XHRcdFx0d2FycFJvdGF0ZTogcXVpbHRXYXJwLndhcnBSb3RhdGUsXG5cdFx0XHRcdGJvdW5kczogcXVpbHRXYXJwLmJvdW5kcyxcblx0XHRcdFx0dU9yZGVyOiBxdWlsdFdhcnAudU9yZGVyLFxuXHRcdFx0XHR2T3JkZXI6IHF1aWx0V2FycC52T3JkZXIsXG5cdFx0XHR9O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRkZWxldGUgZGVzYy5xdWlsdFdhcnA7XG5cdFx0fVxuXG5cdFx0aWYgKHBsYWNlZC5jb21wKSBkZXNjLmNvbXAgPSBwbGFjZWQuY29tcDtcblx0XHRpZiAocGxhY2VkLmNvbXBJbmZvKSBkZXNjLmNvbXBJbmZvID0gcGxhY2VkLmNvbXBJbmZvO1xuXG5cdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnbnVsbCcsIGRlc2MsIGRlc2MucXVpbHRXYXJwID8gJ3F1aWx0V2FycCcgOiAnd2FycCcpO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J2Z4cnAnLFxuXHRoYXNLZXkoJ3JlZmVyZW5jZVBvaW50JyksXG5cdChyZWFkZXIsIHRhcmdldCkgPT4ge1xuXHRcdHRhcmdldC5yZWZlcmVuY2VQb2ludCA9IHtcblx0XHRcdHg6IHJlYWRGbG9hdDY0KHJlYWRlciksXG5cdFx0XHR5OiByZWFkRmxvYXQ2NChyZWFkZXIpLFxuXHRcdH07XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlRmxvYXQ2NCh3cml0ZXIsIHRhcmdldC5yZWZlcmVuY2VQb2ludCEueCk7XG5cdFx0d3JpdGVGbG9hdDY0KHdyaXRlciwgdGFyZ2V0LnJlZmVyZW5jZVBvaW50IS55KTtcblx0fSxcbik7XG5cbmlmIChNT0NLX0hBTkRMRVJTKSB7XG5cdGFkZEhhbmRsZXIoXG5cdFx0J1BhdHQnLFxuXHRcdHRhcmdldCA9PiAodGFyZ2V0IGFzIGFueSkuX1BhdHQgIT09IHVuZGVmaW5lZCxcblx0XHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRcdC8vIGNvbnNvbGUubG9nKCdhZGRpdGlvbmFsIGluZm86IFBhdHQnKTtcblx0XHRcdCh0YXJnZXQgYXMgYW55KS5fUGF0dCA9IHJlYWRCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdFx0fSxcblx0XHQod3JpdGVyLCB0YXJnZXQpID0+IGZhbHNlICYmIHdyaXRlQnl0ZXMod3JpdGVyLCAodGFyZ2V0IGFzIGFueSkuX1BhdHQpLFxuXHQpO1xufSBlbHNlIHtcblx0YWRkSGFuZGxlcihcblx0XHQnUGF0dCcsIC8vIFRPRE86IGhhbmRsZSBhbHNvIFBhdDIgJiBQYXQzXG5cdFx0dGFyZ2V0ID0+ICF0YXJnZXQsXG5cdFx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0XHRpZiAoIWxlZnQoKSkgcmV0dXJuO1xuXG5cdFx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpOyByZXR1cm47IC8vIG5vdCBzdXBwb3J0ZWQgeWV0XG5cdFx0XHR0YXJnZXQ7IHJlYWRQYXR0ZXJuO1xuXG5cdFx0XHQvLyBpZiAoIXRhcmdldC5wYXR0ZXJucykgdGFyZ2V0LnBhdHRlcm5zID0gW107XG5cdFx0XHQvLyB0YXJnZXQucGF0dGVybnMucHVzaChyZWFkUGF0dGVybihyZWFkZXIpKTtcblx0XHRcdC8vIHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdFx0fSxcblx0XHQoX3dyaXRlciwgX3RhcmdldCkgPT4ge1xuXHRcdH0sXG5cdCk7XG59XG5cbmZ1bmN0aW9uIHJlYWRSZWN0KHJlYWRlcjogUHNkUmVhZGVyKSB7XG5cdGNvbnN0IHRvcCA9IHJlYWRJbnQzMihyZWFkZXIpO1xuXHRjb25zdCBsZWZ0ID0gcmVhZEludDMyKHJlYWRlcik7XG5cdGNvbnN0IGJvdHRvbSA9IHJlYWRJbnQzMihyZWFkZXIpO1xuXHRjb25zdCByaWdodCA9IHJlYWRJbnQzMihyZWFkZXIpO1xuXHRyZXR1cm4geyB0b3AsIGxlZnQsIGJvdHRvbSwgcmlnaHQgfTtcbn1cblxuZnVuY3Rpb24gd3JpdGVSZWN0KHdyaXRlcjogUHNkV3JpdGVyLCByZWN0OiB7IGxlZnQ6IG51bWJlcjsgdG9wOiBudW1iZXI7IHJpZ2h0OiBudW1iZXI7IGJvdHRvbTogbnVtYmVyIH0pIHtcblx0d3JpdGVJbnQzMih3cml0ZXIsIHJlY3QudG9wKTtcblx0d3JpdGVJbnQzMih3cml0ZXIsIHJlY3QubGVmdCk7XG5cdHdyaXRlSW50MzIod3JpdGVyLCByZWN0LmJvdHRvbSk7XG5cdHdyaXRlSW50MzIod3JpdGVyLCByZWN0LnJpZ2h0KTtcbn1cblxuYWRkSGFuZGxlcihcblx0J0Fubm8nLFxuXHR0YXJnZXQgPT4gKHRhcmdldCBhcyBQc2QpLmFubm90YXRpb25zICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdGNvbnN0IG1ham9yID0gcmVhZFVpbnQxNihyZWFkZXIpO1xuXHRcdGNvbnN0IG1pbm9yID0gcmVhZFVpbnQxNihyZWFkZXIpO1xuXHRcdGlmIChtYWpvciAhPT0gMiB8fCBtaW5vciAhPT0gMSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIEFubm8gdmVyc2lvbicpO1xuXHRcdGNvbnN0IGNvdW50ID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXHRcdGNvbnN0IGFubm90YXRpb25zOiBBbm5vdGF0aW9uW10gPSBbXTtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuXHRcdFx0Lypjb25zdCBsZW5ndGggPSovIHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHRcdGNvbnN0IHR5cGUgPSByZWFkU2lnbmF0dXJlKHJlYWRlcik7XG5cdFx0XHRjb25zdCBvcGVuID0gISFyZWFkVWludDgocmVhZGVyKTtcblx0XHRcdC8qY29uc3QgZmxhZ3MgPSovIHJlYWRVaW50OChyZWFkZXIpOyAvLyBhbHdheXMgMjhcblx0XHRcdC8qY29uc3Qgb3B0aW9uYWxCbG9ja3MgPSovIHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRcdGNvbnN0IGljb25Mb2NhdGlvbiA9IHJlYWRSZWN0KHJlYWRlcik7XG5cdFx0XHRjb25zdCBwb3B1cExvY2F0aW9uID0gcmVhZFJlY3QocmVhZGVyKTtcblx0XHRcdGNvbnN0IGNvbG9yID0gcmVhZENvbG9yKHJlYWRlcik7XG5cdFx0XHRjb25zdCBhdXRob3IgPSByZWFkUGFzY2FsU3RyaW5nKHJlYWRlciwgMik7XG5cdFx0XHRjb25zdCBuYW1lID0gcmVhZFBhc2NhbFN0cmluZyhyZWFkZXIsIDIpO1xuXHRcdFx0Y29uc3QgZGF0ZSA9IHJlYWRQYXNjYWxTdHJpbmcocmVhZGVyLCAyKTtcblx0XHRcdC8qY29uc3QgY29udGVudExlbmd0aCA9Ki8gcmVhZFVpbnQzMihyZWFkZXIpO1xuXHRcdFx0Lypjb25zdCBkYXRhVHlwZSA9Ki8gcmVhZFNpZ25hdHVyZShyZWFkZXIpO1xuXHRcdFx0Y29uc3QgZGF0YUxlbmd0aCA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHRcdGxldCBkYXRhOiBzdHJpbmcgfCBVaW50OEFycmF5O1xuXG5cdFx0XHRpZiAodHlwZSA9PT0gJ3R4dEEnKSB7XG5cdFx0XHRcdGlmIChkYXRhTGVuZ3RoID49IDIgJiYgcmVhZFVpbnQxNihyZWFkZXIpID09PSAweGZlZmYpIHtcblx0XHRcdFx0XHRkYXRhID0gcmVhZFVuaWNvZGVTdHJpbmdXaXRoTGVuZ3RoKHJlYWRlciwgKGRhdGFMZW5ndGggLSAyKSAvIDIpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJlYWRlci5vZmZzZXQgLT0gMjtcblx0XHRcdFx0XHRkYXRhID0gcmVhZEFzY2lpU3RyaW5nKHJlYWRlciwgZGF0YUxlbmd0aCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRkYXRhID0gZGF0YS5yZXBsYWNlKC9cXHIvZywgJ1xcbicpO1xuXHRcdFx0fSBlbHNlIGlmICh0eXBlID09PSAnc25kQScpIHtcblx0XHRcdFx0ZGF0YSA9IHJlYWRCeXRlcyhyZWFkZXIsIGRhdGFMZW5ndGgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGFubm90YXRpb24gdHlwZScpO1xuXHRcdFx0fVxuXG5cdFx0XHRhbm5vdGF0aW9ucy5wdXNoKHtcblx0XHRcdFx0dHlwZTogdHlwZSA9PT0gJ3R4dEEnID8gJ3RleHQnIDogJ3NvdW5kJywgb3BlbiwgaWNvbkxvY2F0aW9uLCBwb3B1cExvY2F0aW9uLCBjb2xvciwgYXV0aG9yLCBuYW1lLCBkYXRlLCBkYXRhLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0KHRhcmdldCBhcyBQc2QpLmFubm90YXRpb25zID0gYW5ub3RhdGlvbnM7XG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgYW5ub3RhdGlvbnMgPSAodGFyZ2V0IGFzIFBzZCkuYW5ub3RhdGlvbnMhO1xuXG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCAyKTtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIDEpO1xuXHRcdHdyaXRlVWludDMyKHdyaXRlciwgYW5ub3RhdGlvbnMubGVuZ3RoKTtcblxuXHRcdGZvciAoY29uc3QgYW5ub3RhdGlvbiBvZiBhbm5vdGF0aW9ucykge1xuXHRcdFx0Y29uc3Qgc291bmQgPSBhbm5vdGF0aW9uLnR5cGUgPT09ICdzb3VuZCc7XG5cblx0XHRcdGlmIChzb3VuZCAmJiAhKGFubm90YXRpb24uZGF0YSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpKSB0aHJvdyBuZXcgRXJyb3IoJ1NvdW5kIGFubm90YXRpb24gZGF0YSBzaG91bGQgYmUgVWludDhBcnJheScpO1xuXHRcdFx0aWYgKCFzb3VuZCAmJiB0eXBlb2YgYW5ub3RhdGlvbi5kYXRhICE9PSAnc3RyaW5nJykgdGhyb3cgbmV3IEVycm9yKCdUZXh0IGFubm90YXRpb24gZGF0YSBzaG91bGQgYmUgc3RyaW5nJyk7XG5cblx0XHRcdGNvbnN0IGxlbmd0aE9mZnNldCA9IHdyaXRlci5vZmZzZXQ7XG5cdFx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIDApOyAvLyBsZW5ndGhcblx0XHRcdHdyaXRlU2lnbmF0dXJlKHdyaXRlciwgc291bmQgPyAnc25kQScgOiAndHh0QScpO1xuXHRcdFx0d3JpdGVVaW50OCh3cml0ZXIsIGFubm90YXRpb24ub3BlbiA/IDEgOiAwKTtcblx0XHRcdHdyaXRlVWludDgod3JpdGVyLCAyOCk7XG5cdFx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIDEpO1xuXHRcdFx0d3JpdGVSZWN0KHdyaXRlciwgYW5ub3RhdGlvbi5pY29uTG9jYXRpb24pO1xuXHRcdFx0d3JpdGVSZWN0KHdyaXRlciwgYW5ub3RhdGlvbi5wb3B1cExvY2F0aW9uKTtcblx0XHRcdHdyaXRlQ29sb3Iod3JpdGVyLCBhbm5vdGF0aW9uLmNvbG9yKTtcblx0XHRcdHdyaXRlUGFzY2FsU3RyaW5nKHdyaXRlciwgYW5ub3RhdGlvbi5hdXRob3IgfHwgJycsIDIpO1xuXHRcdFx0d3JpdGVQYXNjYWxTdHJpbmcod3JpdGVyLCBhbm5vdGF0aW9uLm5hbWUgfHwgJycsIDIpO1xuXHRcdFx0d3JpdGVQYXNjYWxTdHJpbmcod3JpdGVyLCBhbm5vdGF0aW9uLmRhdGUgfHwgJycsIDIpO1xuXHRcdFx0Y29uc3QgY29udGVudE9mZnNldCA9IHdyaXRlci5vZmZzZXQ7XG5cdFx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIDApOyAvLyBjb250ZW50IGxlbmd0aFxuXHRcdFx0d3JpdGVTaWduYXR1cmUod3JpdGVyLCBzb3VuZCA/ICdzbmRNJyA6ICd0eHRDJyk7XG5cdFx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIDApOyAvLyBkYXRhIGxlbmd0aFxuXHRcdFx0Y29uc3QgZGF0YU9mZnNldCA9IHdyaXRlci5vZmZzZXQ7XG5cblx0XHRcdGlmIChzb3VuZCkge1xuXHRcdFx0XHR3cml0ZUJ5dGVzKHdyaXRlciwgYW5ub3RhdGlvbi5kYXRhIGFzIFVpbnQ4QXJyYXkpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0d3JpdGVVaW50MTYod3JpdGVyLCAweGZlZmYpOyAvLyB1bmljb2RlIHN0cmluZyBpbmRpY2F0b3Jcblx0XHRcdFx0Y29uc3QgdGV4dCA9IChhbm5vdGF0aW9uLmRhdGEgYXMgc3RyaW5nKS5yZXBsYWNlKC9cXG4vZywgJ1xccicpO1xuXHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRleHQubGVuZ3RoOyBpKyspIHdyaXRlVWludDE2KHdyaXRlciwgdGV4dC5jaGFyQ29kZUF0KGkpKTtcblx0XHRcdH1cblxuXHRcdFx0d3JpdGVyLnZpZXcuc2V0VWludDMyKGxlbmd0aE9mZnNldCwgd3JpdGVyLm9mZnNldCAtIGxlbmd0aE9mZnNldCwgZmFsc2UpO1xuXHRcdFx0d3JpdGVyLnZpZXcuc2V0VWludDMyKGNvbnRlbnRPZmZzZXQsIHdyaXRlci5vZmZzZXQgLSBjb250ZW50T2Zmc2V0LCBmYWxzZSk7XG5cdFx0XHR3cml0ZXIudmlldy5zZXRVaW50MzIoZGF0YU9mZnNldCAtIDQsIHdyaXRlci5vZmZzZXQgLSBkYXRhT2Zmc2V0LCBmYWxzZSk7XG5cdFx0fVxuXHR9XG4pO1xuXG5pbnRlcmZhY2UgRmlsZU9wZW5EZXNjcmlwdG9yIHtcblx0Y29tcEluZm86IHsgY29tcElEOiBudW1iZXI7IG9yaWdpbmFsQ29tcElEOiBudW1iZXI7IH07XG59XG5cbmFkZEhhbmRsZXIoXG5cdCdsbmsyJyxcblx0KHRhcmdldDogYW55KSA9PiAhISh0YXJnZXQgYXMgUHNkKS5saW5rZWRGaWxlcyAmJiAodGFyZ2V0IGFzIFBzZCkubGlua2VkRmlsZXMhLmxlbmd0aCA+IDAsXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCwgXywgb3B0aW9ucykgPT4ge1xuXHRcdGNvbnN0IHBzZCA9IHRhcmdldCBhcyBQc2Q7XG5cdFx0cHNkLmxpbmtlZEZpbGVzID0gW107XG5cblx0XHR3aGlsZSAobGVmdCgpID4gOCkge1xuXHRcdFx0bGV0IHNpemUgPSByZWFkTGVuZ3RoNjQocmVhZGVyKTsgLy8gc2l6ZVxuXHRcdFx0Y29uc3Qgc3RhcnRPZmZzZXQgPSByZWFkZXIub2Zmc2V0O1xuXHRcdFx0Y29uc3QgdHlwZSA9IHJlYWRTaWduYXR1cmUocmVhZGVyKSBhcyAnbGlGRCcgfCAnbGlGRScgfCAnbGlGQSc7XG5cdFx0XHRjb25zdCB2ZXJzaW9uID0gcmVhZEludDMyKHJlYWRlcik7XG5cdFx0XHRjb25zdCBpZCA9IHJlYWRQYXNjYWxTdHJpbmcocmVhZGVyLCAxKTtcblx0XHRcdGNvbnN0IG5hbWUgPSByZWFkVW5pY29kZVN0cmluZyhyZWFkZXIpO1xuXHRcdFx0Y29uc3QgZmlsZVR5cGUgPSByZWFkU2lnbmF0dXJlKHJlYWRlcikudHJpbSgpOyAvLyAnICAgICcgaWYgZW1wdHlcblx0XHRcdGNvbnN0IGZpbGVDcmVhdG9yID0gcmVhZFNpZ25hdHVyZShyZWFkZXIpLnRyaW0oKTsgLy8gJyAgICAnIG9yICdcXDBcXDBcXDBcXDAnIGlmIGVtcHR5XG5cdFx0XHRjb25zdCBkYXRhU2l6ZSA9IHJlYWRMZW5ndGg2NChyZWFkZXIpO1xuXHRcdFx0Y29uc3QgaGFzRmlsZU9wZW5EZXNjcmlwdG9yID0gcmVhZFVpbnQ4KHJlYWRlcik7XG5cdFx0XHRjb25zdCBmaWxlT3BlbkRlc2NyaXB0b3IgPSBoYXNGaWxlT3BlbkRlc2NyaXB0b3IgPyByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKSBhcyBGaWxlT3BlbkRlc2NyaXB0b3IgOiB1bmRlZmluZWQ7XG5cdFx0XHRjb25zdCBsaW5rZWRGaWxlRGVzY3JpcHRvciA9IHR5cGUgPT09ICdsaUZFJyA/IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpIDogdW5kZWZpbmVkO1xuXHRcdFx0Y29uc3QgZmlsZTogTGlua2VkRmlsZSA9IHsgaWQsIG5hbWUsIGRhdGE6IHVuZGVmaW5lZCB9O1xuXG5cdFx0XHRpZiAoZmlsZVR5cGUpIGZpbGUudHlwZSA9IGZpbGVUeXBlO1xuXHRcdFx0aWYgKGZpbGVDcmVhdG9yKSBmaWxlLmNyZWF0b3IgPSBmaWxlQ3JlYXRvcjtcblx0XHRcdGlmIChmaWxlT3BlbkRlc2NyaXB0b3IpIGZpbGUuZGVzY3JpcHRvciA9IGZpbGVPcGVuRGVzY3JpcHRvcjtcblxuXHRcdFx0aWYgKHR5cGUgPT09ICdsaUZFJyAmJiB2ZXJzaW9uID4gMykge1xuXHRcdFx0XHRjb25zdCB5ZWFyID0gcmVhZEludDMyKHJlYWRlcik7XG5cdFx0XHRcdGNvbnN0IG1vbnRoID0gcmVhZFVpbnQ4KHJlYWRlcik7XG5cdFx0XHRcdGNvbnN0IGRheSA9IHJlYWRVaW50OChyZWFkZXIpO1xuXHRcdFx0XHRjb25zdCBob3VyID0gcmVhZFVpbnQ4KHJlYWRlcik7XG5cdFx0XHRcdGNvbnN0IG1pbnV0ZSA9IHJlYWRVaW50OChyZWFkZXIpO1xuXHRcdFx0XHRjb25zdCBzZWNvbmRzID0gcmVhZEZsb2F0NjQocmVhZGVyKTtcblx0XHRcdFx0Y29uc3Qgd2hvbGVTZWNvbmRzID0gTWF0aC5mbG9vcihzZWNvbmRzKTtcblx0XHRcdFx0Y29uc3QgbXMgPSAoc2Vjb25kcyAtIHdob2xlU2Vjb25kcykgKiAxMDAwO1xuXHRcdFx0XHRmaWxlLnRpbWUgPSBuZXcgRGF0ZSh5ZWFyLCBtb250aCwgZGF5LCBob3VyLCBtaW51dGUsIHdob2xlU2Vjb25kcywgbXMpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBmaWxlU2l6ZSA9IHR5cGUgPT09ICdsaUZFJyA/IHJlYWRMZW5ndGg2NChyZWFkZXIpIDogMDtcblx0XHRcdGlmICh0eXBlID09PSAnbGlGQScpIHNraXBCeXRlcyhyZWFkZXIsIDgpO1xuXHRcdFx0aWYgKHR5cGUgPT09ICdsaUZEJykgZmlsZS5kYXRhID0gcmVhZEJ5dGVzKHJlYWRlciwgZGF0YVNpemUpO1xuXHRcdFx0aWYgKHZlcnNpb24gPj0gNSkgZmlsZS5jaGlsZERvY3VtZW50SUQgPSByZWFkVW5pY29kZVN0cmluZyhyZWFkZXIpO1xuXHRcdFx0aWYgKHZlcnNpb24gPj0gNikgZmlsZS5hc3NldE1vZFRpbWUgPSByZWFkRmxvYXQ2NChyZWFkZXIpO1xuXHRcdFx0aWYgKHZlcnNpb24gPj0gNykgZmlsZS5hc3NldExvY2tlZFN0YXRlID0gcmVhZFVpbnQ4KHJlYWRlcik7XG5cdFx0XHRpZiAodHlwZSA9PT0gJ2xpRkUnKSBmaWxlLmRhdGEgPSByZWFkQnl0ZXMocmVhZGVyLCBmaWxlU2l6ZSk7XG5cblx0XHRcdGlmIChvcHRpb25zLnNraXBMaW5rZWRGaWxlc0RhdGEpIGZpbGUuZGF0YSA9IHVuZGVmaW5lZDtcblxuXHRcdFx0cHNkLmxpbmtlZEZpbGVzLnB1c2goZmlsZSk7XG5cdFx0XHRsaW5rZWRGaWxlRGVzY3JpcHRvcjtcblxuXHRcdFx0d2hpbGUgKHNpemUgJSA0KSBzaXplKys7XG5cdFx0XHRyZWFkZXIub2Zmc2V0ID0gc3RhcnRPZmZzZXQgKyBzaXplO1xuXHRcdH1cblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7IC8vID9cblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgcHNkID0gdGFyZ2V0IGFzIFBzZDtcblxuXHRcdGZvciAoY29uc3QgZmlsZSBvZiBwc2QubGlua2VkRmlsZXMhKSB7XG5cdFx0XHRsZXQgdmVyc2lvbiA9IDI7XG5cblx0XHRcdGlmIChmaWxlLmFzc2V0TG9ja2VkU3RhdGUgIT0gbnVsbCkgdmVyc2lvbiA9IDc7XG5cdFx0XHRlbHNlIGlmIChmaWxlLmFzc2V0TW9kVGltZSAhPSBudWxsKSB2ZXJzaW9uID0gNjtcblx0XHRcdGVsc2UgaWYgKGZpbGUuY2hpbGREb2N1bWVudElEICE9IG51bGwpIHZlcnNpb24gPSA1O1xuXHRcdFx0Ly8gVE9ETzogZWxzZSBpZiAoZmlsZS50aW1lICE9IG51bGwpIHZlcnNpb24gPSAzOyAob25seSBmb3IgbGlGRSlcblxuXHRcdFx0d3JpdGVVaW50MzIod3JpdGVyLCAwKTtcblx0XHRcdHdyaXRlVWludDMyKHdyaXRlciwgMCk7IC8vIHNpemVcblx0XHRcdGNvbnN0IHNpemVPZmZzZXQgPSB3cml0ZXIub2Zmc2V0O1xuXHRcdFx0d3JpdGVTaWduYXR1cmUod3JpdGVyLCBmaWxlLmRhdGEgPyAnbGlGRCcgOiAnbGlGQScpO1xuXHRcdFx0d3JpdGVJbnQzMih3cml0ZXIsIHZlcnNpb24pO1xuXHRcdFx0d3JpdGVQYXNjYWxTdHJpbmcod3JpdGVyLCBmaWxlLmlkIHx8ICcnLCAxKTtcblx0XHRcdHdyaXRlVW5pY29kZVN0cmluZ1dpdGhQYWRkaW5nKHdyaXRlciwgZmlsZS5uYW1lIHx8ICcnKTtcblx0XHRcdHdyaXRlU2lnbmF0dXJlKHdyaXRlciwgZmlsZS50eXBlID8gYCR7ZmlsZS50eXBlfSAgICBgLnN1YnN0cmluZygwLCA0KSA6ICcgICAgJyk7XG5cdFx0XHR3cml0ZVNpZ25hdHVyZSh3cml0ZXIsIGZpbGUuY3JlYXRvciA/IGAke2ZpbGUuY3JlYXRvcn0gICAgYC5zdWJzdHJpbmcoMCwgNCkgOiAnXFwwXFwwXFwwXFwwJyk7XG5cdFx0XHR3cml0ZUxlbmd0aDY0KHdyaXRlciwgZmlsZS5kYXRhID8gZmlsZS5kYXRhLmJ5dGVMZW5ndGggOiAwKTtcblxuXHRcdFx0aWYgKGZpbGUuZGVzY3JpcHRvciAmJiBmaWxlLmRlc2NyaXB0b3IuY29tcEluZm8pIHtcblx0XHRcdFx0Y29uc3QgZGVzYzogRmlsZU9wZW5EZXNjcmlwdG9yID0ge1xuXHRcdFx0XHRcdGNvbXBJbmZvOiBmaWxlLmRlc2NyaXB0b3IuY29tcEluZm8sXG5cdFx0XHRcdH07XG5cblx0XHRcdFx0d3JpdGVVaW50OCh3cml0ZXIsIDEpO1xuXHRcdFx0XHR3cml0ZVZlcnNpb25BbmREZXNjcmlwdG9yKHdyaXRlciwgJycsICdudWxsJywgZGVzYyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgMCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChmaWxlLmRhdGEpIHdyaXRlQnl0ZXMod3JpdGVyLCBmaWxlLmRhdGEpO1xuXHRcdFx0ZWxzZSB3cml0ZUxlbmd0aDY0KHdyaXRlciwgMCk7XG5cdFx0XHRpZiAodmVyc2lvbiA+PSA1KSB3cml0ZVVuaWNvZGVTdHJpbmdXaXRoUGFkZGluZyh3cml0ZXIsIGZpbGUuY2hpbGREb2N1bWVudElEIHx8ICcnKTtcblx0XHRcdGlmICh2ZXJzaW9uID49IDYpIHdyaXRlRmxvYXQ2NCh3cml0ZXIsIGZpbGUuYXNzZXRNb2RUaW1lIHx8IDApO1xuXHRcdFx0aWYgKHZlcnNpb24gPj0gNykgd3JpdGVVaW50OCh3cml0ZXIsIGZpbGUuYXNzZXRMb2NrZWRTdGF0ZSB8fCAwKTtcblxuXHRcdFx0bGV0IHNpemUgPSB3cml0ZXIub2Zmc2V0IC0gc2l6ZU9mZnNldDtcblx0XHRcdHdyaXRlci52aWV3LnNldFVpbnQzMihzaXplT2Zmc2V0IC0gNCwgc2l6ZSwgZmFsc2UpOyAvLyB3cml0ZSBzaXplXG5cblx0XHRcdHdoaWxlIChzaXplICUgNCkge1xuXHRcdFx0XHRzaXplKys7XG5cdFx0XHRcdHdyaXRlVWludDgod3JpdGVyLCAwKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG4pO1xuYWRkSGFuZGxlckFsaWFzKCdsbmtEJywgJ2xuazInKTtcbmFkZEhhbmRsZXJBbGlhcygnbG5rMycsICdsbmsyJyk7XG5cbi8vIHRoaXMgc2VlbXMgdG8ganVzdCBiZSB6ZXJvIHNpemUgYmxvY2ssIGlnbm9yZSBpdFxuYWRkSGFuZGxlcihcblx0J2xua0UnLFxuXHR0YXJnZXQgPT4gKHRhcmdldCBhcyBhbnkpLl9sbmtFICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCwgX3BzZHMsIG9wdGlvbnMpID0+IHtcblx0XHRpZiAob3B0aW9ucy5sb2dNaXNzaW5nRmVhdHVyZXMgJiYgbGVmdCgpKSB7XG5cdFx0XHRjb25zb2xlLmxvZyhgTm9uLWVtcHR5IGxua0UgbGF5ZXIgaW5mbyAoJHtsZWZ0KCl9IGJ5dGVzKWApO1xuXHRcdH1cblxuXHRcdGlmIChNT0NLX0hBTkRMRVJTKSB7XG5cdFx0XHQodGFyZ2V0IGFzIGFueSkuX2xua0UgPSByZWFkQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHRcdH1cblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiBNT0NLX0hBTkRMRVJTICYmIHdyaXRlQnl0ZXMod3JpdGVyLCAodGFyZ2V0IGFzIGFueSkuX2xua0UpLFxuKTtcblxuaW50ZXJmYWNlIEV4dGVuc2lvbkRlc2Mge1xuXHRnZW5lcmF0b3JTZXR0aW5nczoge1xuXHRcdGdlbmVyYXRvcl80NV9hc3NldHM6IHsganNvbjogc3RyaW5nOyB9O1xuXHRcdGxheWVyVGltZTogbnVtYmVyO1xuXHR9O1xufVxuXG5hZGRIYW5kbGVyKFxuXHQncHRocycsXG5cdGhhc0tleSgncGF0aExpc3QnKSxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgZGVzY3JpcHRvciA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpO1xuXG5cdFx0dGFyZ2V0LnBhdGhMaXN0ID0gW107IC8vIFRPRE86IHJlYWQgcGF0aHMgKGZpbmQgZXhhbXBsZSB3aXRoIG5vbi1lbXB0eSBsaXN0KVxuXG5cdFx0ZGVzY3JpcHRvcjtcblx0XHQvLyBjb25zb2xlLmxvZygncHRocycsIGRlc2NyaXB0b3IpOyAvLyBUT0RPOiByZW1vdmUgdGhpc1xuXHR9LFxuXHQod3JpdGVyLCBfdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgZGVzY3JpcHRvciA9IHtcblx0XHRcdHBhdGhMaXN0OiBbXSwgLy8gVE9ETzogd3JpdGUgcGF0aHNcblx0XHR9O1xuXG5cdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAncGF0aHNEYXRhQ2xhc3MnLCBkZXNjcmlwdG9yKTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdCdseXZyJyxcblx0aGFzS2V5KCd2ZXJzaW9uJyksXG5cdChyZWFkZXIsIHRhcmdldCkgPT4gdGFyZ2V0LnZlcnNpb24gPSByZWFkVWludDMyKHJlYWRlciksXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4gd3JpdGVVaW50MzIod3JpdGVyLCB0YXJnZXQudmVyc2lvbiEpLFxuKTtcblxuZnVuY3Rpb24gYWRqdXN0bWVudFR5cGUodHlwZTogc3RyaW5nKSB7XG5cdHJldHVybiAodGFyZ2V0OiBMYXllckFkZGl0aW9uYWxJbmZvKSA9PiAhIXRhcmdldC5hZGp1c3RtZW50ICYmIHRhcmdldC5hZGp1c3RtZW50LnR5cGUgPT09IHR5cGU7XG59XG5cbmFkZEhhbmRsZXIoXG5cdCdicml0Jyxcblx0YWRqdXN0bWVudFR5cGUoJ2JyaWdodG5lc3MvY29udHJhc3QnKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0aWYgKCF0YXJnZXQuYWRqdXN0bWVudCkgeyAvLyBpZ25vcmUgaWYgZ290IG9uZSBmcm9tIENnRWQgYmxvY2tcblx0XHRcdHRhcmdldC5hZGp1c3RtZW50ID0ge1xuXHRcdFx0XHR0eXBlOiAnYnJpZ2h0bmVzcy9jb250cmFzdCcsXG5cdFx0XHRcdGJyaWdodG5lc3M6IHJlYWRJbnQxNihyZWFkZXIpLFxuXHRcdFx0XHRjb250cmFzdDogcmVhZEludDE2KHJlYWRlciksXG5cdFx0XHRcdG1lYW5WYWx1ZTogcmVhZEludDE2KHJlYWRlciksXG5cdFx0XHRcdGxhYkNvbG9yT25seTogISFyZWFkVWludDgocmVhZGVyKSxcblx0XHRcdFx0dXNlTGVnYWN5OiB0cnVlLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBpbmZvID0gdGFyZ2V0LmFkanVzdG1lbnQgYXMgQnJpZ2h0bmVzc0FkanVzdG1lbnQ7XG5cdFx0d3JpdGVJbnQxNih3cml0ZXIsIGluZm8uYnJpZ2h0bmVzcyB8fCAwKTtcblx0XHR3cml0ZUludDE2KHdyaXRlciwgaW5mby5jb250cmFzdCB8fCAwKTtcblx0XHR3cml0ZUludDE2KHdyaXRlciwgaW5mby5tZWFuVmFsdWUgPz8gMTI3KTtcblx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgaW5mby5sYWJDb2xvck9ubHkgPyAxIDogMCk7XG5cdFx0d3JpdGVaZXJvcyh3cml0ZXIsIDEpO1xuXHR9LFxuKTtcblxuZnVuY3Rpb24gcmVhZExldmVsc0NoYW5uZWwocmVhZGVyOiBQc2RSZWFkZXIpOiBMZXZlbHNBZGp1c3RtZW50Q2hhbm5lbCB7XG5cdGNvbnN0IHNoYWRvd0lucHV0ID0gcmVhZEludDE2KHJlYWRlcik7XG5cdGNvbnN0IGhpZ2hsaWdodElucHV0ID0gcmVhZEludDE2KHJlYWRlcik7XG5cdGNvbnN0IHNoYWRvd091dHB1dCA9IHJlYWRJbnQxNihyZWFkZXIpO1xuXHRjb25zdCBoaWdobGlnaHRPdXRwdXQgPSByZWFkSW50MTYocmVhZGVyKTtcblx0Y29uc3QgbWlkdG9uZUlucHV0ID0gcmVhZEludDE2KHJlYWRlcikgLyAxMDA7XG5cdHJldHVybiB7IHNoYWRvd0lucHV0LCBoaWdobGlnaHRJbnB1dCwgc2hhZG93T3V0cHV0LCBoaWdobGlnaHRPdXRwdXQsIG1pZHRvbmVJbnB1dCB9O1xufVxuXG5mdW5jdGlvbiB3cml0ZUxldmVsc0NoYW5uZWwod3JpdGVyOiBQc2RXcml0ZXIsIGNoYW5uZWw6IExldmVsc0FkanVzdG1lbnRDaGFubmVsKSB7XG5cdHdyaXRlSW50MTYod3JpdGVyLCBjaGFubmVsLnNoYWRvd0lucHV0KTtcblx0d3JpdGVJbnQxNih3cml0ZXIsIGNoYW5uZWwuaGlnaGxpZ2h0SW5wdXQpO1xuXHR3cml0ZUludDE2KHdyaXRlciwgY2hhbm5lbC5zaGFkb3dPdXRwdXQpO1xuXHR3cml0ZUludDE2KHdyaXRlciwgY2hhbm5lbC5oaWdobGlnaHRPdXRwdXQpO1xuXHR3cml0ZUludDE2KHdyaXRlciwgTWF0aC5yb3VuZChjaGFubmVsLm1pZHRvbmVJbnB1dCAqIDEwMCkpO1xufVxuXG5hZGRIYW5kbGVyKFxuXHQnbGV2bCcsXG5cdGFkanVzdG1lbnRUeXBlKCdsZXZlbHMnKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0aWYgKHJlYWRVaW50MTYocmVhZGVyKSAhPT0gMikgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGxldmwgdmVyc2lvbicpO1xuXG5cdFx0dGFyZ2V0LmFkanVzdG1lbnQgPSB7XG5cdFx0XHQuLi50YXJnZXQuYWRqdXN0bWVudCBhcyBQcmVzZXRJbmZvLFxuXHRcdFx0dHlwZTogJ2xldmVscycsXG5cdFx0XHRyZ2I6IHJlYWRMZXZlbHNDaGFubmVsKHJlYWRlciksXG5cdFx0XHRyZWQ6IHJlYWRMZXZlbHNDaGFubmVsKHJlYWRlciksXG5cdFx0XHRncmVlbjogcmVhZExldmVsc0NoYW5uZWwocmVhZGVyKSxcblx0XHRcdGJsdWU6IHJlYWRMZXZlbHNDaGFubmVsKHJlYWRlciksXG5cdFx0fTtcblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGluZm8gPSB0YXJnZXQuYWRqdXN0bWVudCBhcyBMZXZlbHNBZGp1c3RtZW50O1xuXHRcdGNvbnN0IGRlZmF1bHRDaGFubmVsID0ge1xuXHRcdFx0c2hhZG93SW5wdXQ6IDAsXG5cdFx0XHRoaWdobGlnaHRJbnB1dDogMjU1LFxuXHRcdFx0c2hhZG93T3V0cHV0OiAwLFxuXHRcdFx0aGlnaGxpZ2h0T3V0cHV0OiAyNTUsXG5cdFx0XHRtaWR0b25lSW5wdXQ6IDEsXG5cdFx0fTtcblxuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgMik7IC8vIHZlcnNpb25cblx0XHR3cml0ZUxldmVsc0NoYW5uZWwod3JpdGVyLCBpbmZvLnJnYiB8fCBkZWZhdWx0Q2hhbm5lbCk7XG5cdFx0d3JpdGVMZXZlbHNDaGFubmVsKHdyaXRlciwgaW5mby5yZWQgfHwgZGVmYXVsdENoYW5uZWwpO1xuXHRcdHdyaXRlTGV2ZWxzQ2hhbm5lbCh3cml0ZXIsIGluZm8uYmx1ZSB8fCBkZWZhdWx0Q2hhbm5lbCk7XG5cdFx0d3JpdGVMZXZlbHNDaGFubmVsKHdyaXRlciwgaW5mby5ncmVlbiB8fCBkZWZhdWx0Q2hhbm5lbCk7XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCA1OTsgaSsrKSB3cml0ZUxldmVsc0NoYW5uZWwod3JpdGVyLCBkZWZhdWx0Q2hhbm5lbCk7XG5cdH0sXG4pO1xuXG5mdW5jdGlvbiByZWFkQ3VydmVDaGFubmVsKHJlYWRlcjogUHNkUmVhZGVyKSB7XG5cdGNvbnN0IG5vZGVzID0gcmVhZFVpbnQxNihyZWFkZXIpO1xuXHRjb25zdCBjaGFubmVsOiBDdXJ2ZXNBZGp1c3RtZW50Q2hhbm5lbCA9IFtdO1xuXG5cdGZvciAobGV0IGogPSAwOyBqIDwgbm9kZXM7IGorKykge1xuXHRcdGNvbnN0IG91dHB1dCA9IHJlYWRJbnQxNihyZWFkZXIpO1xuXHRcdGNvbnN0IGlucHV0ID0gcmVhZEludDE2KHJlYWRlcik7XG5cdFx0Y2hhbm5lbC5wdXNoKHsgaW5wdXQsIG91dHB1dCB9KTtcblx0fVxuXG5cdHJldHVybiBjaGFubmVsO1xufVxuXG5mdW5jdGlvbiB3cml0ZUN1cnZlQ2hhbm5lbCh3cml0ZXI6IFBzZFdyaXRlciwgY2hhbm5lbDogQ3VydmVzQWRqdXN0bWVudENoYW5uZWwpIHtcblx0d3JpdGVVaW50MTYod3JpdGVyLCBjaGFubmVsLmxlbmd0aCk7XG5cblx0Zm9yIChjb25zdCBuIG9mIGNoYW5uZWwpIHtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIG4ub3V0cHV0KTtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIG4uaW5wdXQpO1xuXHR9XG59XG5cbmFkZEhhbmRsZXIoXG5cdCdjdXJ2Jyxcblx0YWRqdXN0bWVudFR5cGUoJ2N1cnZlcycpLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRyZWFkVWludDgocmVhZGVyKTtcblx0XHRpZiAocmVhZFVpbnQxNihyZWFkZXIpICE9PSAxKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY3VydiB2ZXJzaW9uJyk7XG5cdFx0cmVhZFVpbnQxNihyZWFkZXIpO1xuXHRcdGNvbnN0IGNoYW5uZWxzID0gcmVhZFVpbnQxNihyZWFkZXIpO1xuXHRcdGNvbnN0IGluZm86IEN1cnZlc0FkanVzdG1lbnQgPSB7IHR5cGU6ICdjdXJ2ZXMnIH07XG5cblx0XHRpZiAoY2hhbm5lbHMgJiAxKSBpbmZvLnJnYiA9IHJlYWRDdXJ2ZUNoYW5uZWwocmVhZGVyKTtcblx0XHRpZiAoY2hhbm5lbHMgJiAyKSBpbmZvLnJlZCA9IHJlYWRDdXJ2ZUNoYW5uZWwocmVhZGVyKTtcblx0XHRpZiAoY2hhbm5lbHMgJiA0KSBpbmZvLmdyZWVuID0gcmVhZEN1cnZlQ2hhbm5lbChyZWFkZXIpO1xuXHRcdGlmIChjaGFubmVscyAmIDgpIGluZm8uYmx1ZSA9IHJlYWRDdXJ2ZUNoYW5uZWwocmVhZGVyKTtcblxuXHRcdHRhcmdldC5hZGp1c3RtZW50ID0ge1xuXHRcdFx0Li4udGFyZ2V0LmFkanVzdG1lbnQgYXMgUHJlc2V0SW5mbyxcblx0XHRcdC4uLmluZm8sXG5cdFx0fTtcblxuXHRcdC8vIGlnbm9yaW5nLCBkdXBsaWNhdGUgaW5mb3JtYXRpb25cblx0XHQvLyBjaGVja1NpZ25hdHVyZShyZWFkZXIsICdDcnYgJyk7XG5cblx0XHQvLyBjb25zdCBjVmVyc2lvbiA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHQvLyByZWFkVWludDE2KHJlYWRlcik7XG5cdFx0Ly8gY29uc3QgY2hhbm5lbENvdW50ID0gcmVhZFVpbnQxNihyZWFkZXIpO1xuXG5cdFx0Ly8gZm9yIChsZXQgaSA9IDA7IGkgPCBjaGFubmVsQ291bnQ7IGkrKykge1xuXHRcdC8vIFx0Y29uc3QgaW5kZXggPSByZWFkVWludDE2KHJlYWRlcik7XG5cdFx0Ly8gXHRjb25zdCBub2RlcyA9IHJlYWRVaW50MTYocmVhZGVyKTtcblxuXHRcdC8vIFx0Zm9yIChsZXQgaiA9IDA7IGogPCBub2RlczsgaisrKSB7XG5cdFx0Ly8gXHRcdGNvbnN0IG91dHB1dCA9IHJlYWRJbnQxNihyZWFkZXIpO1xuXHRcdC8vIFx0XHRjb25zdCBpbnB1dCA9IHJlYWRJbnQxNihyZWFkZXIpO1xuXHRcdC8vIFx0fVxuXHRcdC8vIH1cblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGluZm8gPSB0YXJnZXQuYWRqdXN0bWVudCBhcyBDdXJ2ZXNBZGp1c3RtZW50O1xuXHRcdGNvbnN0IHsgcmdiLCByZWQsIGdyZWVuLCBibHVlIH0gPSBpbmZvO1xuXHRcdGxldCBjaGFubmVscyA9IDA7XG5cdFx0bGV0IGNoYW5uZWxDb3VudCA9IDA7XG5cblx0XHRpZiAocmdiICYmIHJnYi5sZW5ndGgpIHsgY2hhbm5lbHMgfD0gMTsgY2hhbm5lbENvdW50Kys7IH1cblx0XHRpZiAocmVkICYmIHJlZC5sZW5ndGgpIHsgY2hhbm5lbHMgfD0gMjsgY2hhbm5lbENvdW50Kys7IH1cblx0XHRpZiAoZ3JlZW4gJiYgZ3JlZW4ubGVuZ3RoKSB7IGNoYW5uZWxzIHw9IDQ7IGNoYW5uZWxDb3VudCsrOyB9XG5cdFx0aWYgKGJsdWUgJiYgYmx1ZS5sZW5ndGgpIHsgY2hhbm5lbHMgfD0gODsgY2hhbm5lbENvdW50Kys7IH1cblxuXHRcdHdyaXRlVWludDgod3JpdGVyLCAwKTtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIDEpOyAvLyB2ZXJzaW9uXG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCAwKTtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIGNoYW5uZWxzKTtcblxuXHRcdGlmIChyZ2IgJiYgcmdiLmxlbmd0aCkgd3JpdGVDdXJ2ZUNoYW5uZWwod3JpdGVyLCByZ2IpO1xuXHRcdGlmIChyZWQgJiYgcmVkLmxlbmd0aCkgd3JpdGVDdXJ2ZUNoYW5uZWwod3JpdGVyLCByZWQpO1xuXHRcdGlmIChncmVlbiAmJiBncmVlbi5sZW5ndGgpIHdyaXRlQ3VydmVDaGFubmVsKHdyaXRlciwgZ3JlZW4pO1xuXHRcdGlmIChibHVlICYmIGJsdWUubGVuZ3RoKSB3cml0ZUN1cnZlQ2hhbm5lbCh3cml0ZXIsIGJsdWUpO1xuXG5cdFx0d3JpdGVTaWduYXR1cmUod3JpdGVyLCAnQ3J2ICcpO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgNCk7IC8vIHZlcnNpb25cblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIDApO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgY2hhbm5lbENvdW50KTtcblxuXHRcdGlmIChyZ2IgJiYgcmdiLmxlbmd0aCkgeyB3cml0ZVVpbnQxNih3cml0ZXIsIDApOyB3cml0ZUN1cnZlQ2hhbm5lbCh3cml0ZXIsIHJnYik7IH1cblx0XHRpZiAocmVkICYmIHJlZC5sZW5ndGgpIHsgd3JpdGVVaW50MTYod3JpdGVyLCAxKTsgd3JpdGVDdXJ2ZUNoYW5uZWwod3JpdGVyLCByZWQpOyB9XG5cdFx0aWYgKGdyZWVuICYmIGdyZWVuLmxlbmd0aCkgeyB3cml0ZVVpbnQxNih3cml0ZXIsIDIpOyB3cml0ZUN1cnZlQ2hhbm5lbCh3cml0ZXIsIGdyZWVuKTsgfVxuXHRcdGlmIChibHVlICYmIGJsdWUubGVuZ3RoKSB7IHdyaXRlVWludDE2KHdyaXRlciwgMyk7IHdyaXRlQ3VydmVDaGFubmVsKHdyaXRlciwgYmx1ZSk7IH1cblxuXHRcdHdyaXRlWmVyb3Mod3JpdGVyLCAyKTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdCdleHBBJyxcblx0YWRqdXN0bWVudFR5cGUoJ2V4cG9zdXJlJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdGlmIChyZWFkVWludDE2KHJlYWRlcikgIT09IDEpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBleHBBIHZlcnNpb24nKTtcblxuXHRcdHRhcmdldC5hZGp1c3RtZW50ID0ge1xuXHRcdFx0Li4udGFyZ2V0LmFkanVzdG1lbnQgYXMgUHJlc2V0SW5mbyxcblx0XHRcdHR5cGU6ICdleHBvc3VyZScsXG5cdFx0XHRleHBvc3VyZTogcmVhZEZsb2F0MzIocmVhZGVyKSxcblx0XHRcdG9mZnNldDogcmVhZEZsb2F0MzIocmVhZGVyKSxcblx0XHRcdGdhbW1hOiByZWFkRmxvYXQzMihyZWFkZXIpLFxuXHRcdH07XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBpbmZvID0gdGFyZ2V0LmFkanVzdG1lbnQgYXMgRXhwb3N1cmVBZGp1c3RtZW50O1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgMSk7IC8vIHZlcnNpb25cblx0XHR3cml0ZUZsb2F0MzIod3JpdGVyLCBpbmZvLmV4cG9zdXJlISk7XG5cdFx0d3JpdGVGbG9hdDMyKHdyaXRlciwgaW5mby5vZmZzZXQhKTtcblx0XHR3cml0ZUZsb2F0MzIod3JpdGVyLCBpbmZvLmdhbW1hISk7XG5cdFx0d3JpdGVaZXJvcyh3cml0ZXIsIDIpO1xuXHR9LFxuKTtcblxuaW50ZXJmYWNlIFZpYnJhbmNlRGVzY3JpcHRvciB7XG5cdHZpYnJhbmNlPzogbnVtYmVyO1xuXHRTdHJ0PzogbnVtYmVyO1xufVxuXG5hZGRIYW5kbGVyKFxuXHQndmliQScsXG5cdGFkanVzdG1lbnRUeXBlKCd2aWJyYW5jZScpLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRjb25zdCBkZXNjOiBWaWJyYW5jZURlc2NyaXB0b3IgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKTtcblx0XHR0YXJnZXQuYWRqdXN0bWVudCA9IHsgdHlwZTogJ3ZpYnJhbmNlJyB9O1xuXHRcdGlmIChkZXNjLnZpYnJhbmNlICE9PSB1bmRlZmluZWQpIHRhcmdldC5hZGp1c3RtZW50LnZpYnJhbmNlID0gZGVzYy52aWJyYW5jZTtcblx0XHRpZiAoZGVzYy5TdHJ0ICE9PSB1bmRlZmluZWQpIHRhcmdldC5hZGp1c3RtZW50LnNhdHVyYXRpb24gPSBkZXNjLlN0cnQ7XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBpbmZvID0gdGFyZ2V0LmFkanVzdG1lbnQgYXMgVmlicmFuY2VBZGp1c3RtZW50O1xuXHRcdGNvbnN0IGRlc2M6IFZpYnJhbmNlRGVzY3JpcHRvciA9IHt9O1xuXHRcdGlmIChpbmZvLnZpYnJhbmNlICE9PSB1bmRlZmluZWQpIGRlc2MudmlicmFuY2UgPSBpbmZvLnZpYnJhbmNlO1xuXHRcdGlmIChpbmZvLnNhdHVyYXRpb24gIT09IHVuZGVmaW5lZCkgZGVzYy5TdHJ0ID0gaW5mby5zYXR1cmF0aW9uO1xuXG5cdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnbnVsbCcsIGRlc2MpO1xuXHR9LFxuKTtcblxuZnVuY3Rpb24gcmVhZEh1ZUNoYW5uZWwocmVhZGVyOiBQc2RSZWFkZXIpOiBIdWVTYXR1cmF0aW9uQWRqdXN0bWVudENoYW5uZWwge1xuXHRyZXR1cm4ge1xuXHRcdGE6IHJlYWRJbnQxNihyZWFkZXIpLFxuXHRcdGI6IHJlYWRJbnQxNihyZWFkZXIpLFxuXHRcdGM6IHJlYWRJbnQxNihyZWFkZXIpLFxuXHRcdGQ6IHJlYWRJbnQxNihyZWFkZXIpLFxuXHRcdGh1ZTogcmVhZEludDE2KHJlYWRlciksXG5cdFx0c2F0dXJhdGlvbjogcmVhZEludDE2KHJlYWRlciksXG5cdFx0bGlnaHRuZXNzOiByZWFkSW50MTYocmVhZGVyKSxcblx0fTtcbn1cblxuZnVuY3Rpb24gd3JpdGVIdWVDaGFubmVsKHdyaXRlcjogUHNkV3JpdGVyLCBjaGFubmVsOiBIdWVTYXR1cmF0aW9uQWRqdXN0bWVudENoYW5uZWwgfCB1bmRlZmluZWQpIHtcblx0Y29uc3QgYyA9IGNoYW5uZWwgfHwge30gYXMgUGFydGlhbDxIdWVTYXR1cmF0aW9uQWRqdXN0bWVudENoYW5uZWw+O1xuXHR3cml0ZUludDE2KHdyaXRlciwgYy5hIHx8IDApO1xuXHR3cml0ZUludDE2KHdyaXRlciwgYy5iIHx8IDApO1xuXHR3cml0ZUludDE2KHdyaXRlciwgYy5jIHx8IDApO1xuXHR3cml0ZUludDE2KHdyaXRlciwgYy5kIHx8IDApO1xuXHR3cml0ZUludDE2KHdyaXRlciwgYy5odWUgfHwgMCk7XG5cdHdyaXRlSW50MTYod3JpdGVyLCBjLnNhdHVyYXRpb24gfHwgMCk7XG5cdHdyaXRlSW50MTYod3JpdGVyLCBjLmxpZ2h0bmVzcyB8fCAwKTtcbn1cblxuYWRkSGFuZGxlcihcblx0J2h1ZTInLFxuXHRhZGp1c3RtZW50VHlwZSgnaHVlL3NhdHVyYXRpb24nKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0aWYgKHJlYWRVaW50MTYocmVhZGVyKSAhPT0gMikgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGh1ZTIgdmVyc2lvbicpO1xuXG5cdFx0dGFyZ2V0LmFkanVzdG1lbnQgPSB7XG5cdFx0XHQuLi50YXJnZXQuYWRqdXN0bWVudCBhcyBQcmVzZXRJbmZvLFxuXHRcdFx0dHlwZTogJ2h1ZS9zYXR1cmF0aW9uJyxcblx0XHRcdG1hc3RlcjogcmVhZEh1ZUNoYW5uZWwocmVhZGVyKSxcblx0XHRcdHJlZHM6IHJlYWRIdWVDaGFubmVsKHJlYWRlciksXG5cdFx0XHR5ZWxsb3dzOiByZWFkSHVlQ2hhbm5lbChyZWFkZXIpLFxuXHRcdFx0Z3JlZW5zOiByZWFkSHVlQ2hhbm5lbChyZWFkZXIpLFxuXHRcdFx0Y3lhbnM6IHJlYWRIdWVDaGFubmVsKHJlYWRlciksXG5cdFx0XHRibHVlczogcmVhZEh1ZUNoYW5uZWwocmVhZGVyKSxcblx0XHRcdG1hZ2VudGFzOiByZWFkSHVlQ2hhbm5lbChyZWFkZXIpLFxuXHRcdH07XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBpbmZvID0gdGFyZ2V0LmFkanVzdG1lbnQgYXMgSHVlU2F0dXJhdGlvbkFkanVzdG1lbnQ7XG5cblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIDIpOyAvLyB2ZXJzaW9uXG5cdFx0d3JpdGVIdWVDaGFubmVsKHdyaXRlciwgaW5mby5tYXN0ZXIpO1xuXHRcdHdyaXRlSHVlQ2hhbm5lbCh3cml0ZXIsIGluZm8ucmVkcyk7XG5cdFx0d3JpdGVIdWVDaGFubmVsKHdyaXRlciwgaW5mby55ZWxsb3dzKTtcblx0XHR3cml0ZUh1ZUNoYW5uZWwod3JpdGVyLCBpbmZvLmdyZWVucyk7XG5cdFx0d3JpdGVIdWVDaGFubmVsKHdyaXRlciwgaW5mby5jeWFucyk7XG5cdFx0d3JpdGVIdWVDaGFubmVsKHdyaXRlciwgaW5mby5ibHVlcyk7XG5cdFx0d3JpdGVIdWVDaGFubmVsKHdyaXRlciwgaW5mby5tYWdlbnRhcyk7XG5cdH0sXG4pO1xuXG5mdW5jdGlvbiByZWFkQ29sb3JCYWxhbmNlKHJlYWRlcjogUHNkUmVhZGVyKTogQ29sb3JCYWxhbmNlVmFsdWVzIHtcblx0cmV0dXJuIHtcblx0XHRjeWFuUmVkOiByZWFkSW50MTYocmVhZGVyKSxcblx0XHRtYWdlbnRhR3JlZW46IHJlYWRJbnQxNihyZWFkZXIpLFxuXHRcdHllbGxvd0JsdWU6IHJlYWRJbnQxNihyZWFkZXIpLFxuXHR9O1xufVxuXG5mdW5jdGlvbiB3cml0ZUNvbG9yQmFsYW5jZSh3cml0ZXI6IFBzZFdyaXRlciwgdmFsdWU6IFBhcnRpYWw8Q29sb3JCYWxhbmNlVmFsdWVzPikge1xuXHR3cml0ZUludDE2KHdyaXRlciwgdmFsdWUuY3lhblJlZCB8fCAwKTtcblx0d3JpdGVJbnQxNih3cml0ZXIsIHZhbHVlLm1hZ2VudGFHcmVlbiB8fCAwKTtcblx0d3JpdGVJbnQxNih3cml0ZXIsIHZhbHVlLnllbGxvd0JsdWUgfHwgMCk7XG59XG5cbmFkZEhhbmRsZXIoXG5cdCdibG5jJyxcblx0YWRqdXN0bWVudFR5cGUoJ2NvbG9yIGJhbGFuY2UnKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0dGFyZ2V0LmFkanVzdG1lbnQgPSB7XG5cdFx0XHR0eXBlOiAnY29sb3IgYmFsYW5jZScsXG5cdFx0XHRzaGFkb3dzOiByZWFkQ29sb3JCYWxhbmNlKHJlYWRlciksXG5cdFx0XHRtaWR0b25lczogcmVhZENvbG9yQmFsYW5jZShyZWFkZXIpLFxuXHRcdFx0aGlnaGxpZ2h0czogcmVhZENvbG9yQmFsYW5jZShyZWFkZXIpLFxuXHRcdFx0cHJlc2VydmVMdW1pbm9zaXR5OiAhIXJlYWRVaW50OChyZWFkZXIpLFxuXHRcdH07XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBpbmZvID0gdGFyZ2V0LmFkanVzdG1lbnQgYXMgQ29sb3JCYWxhbmNlQWRqdXN0bWVudDtcblx0XHR3cml0ZUNvbG9yQmFsYW5jZSh3cml0ZXIsIGluZm8uc2hhZG93cyB8fCB7fSk7XG5cdFx0d3JpdGVDb2xvckJhbGFuY2Uod3JpdGVyLCBpbmZvLm1pZHRvbmVzIHx8IHt9KTtcblx0XHR3cml0ZUNvbG9yQmFsYW5jZSh3cml0ZXIsIGluZm8uaGlnaGxpZ2h0cyB8fCB7fSk7XG5cdFx0d3JpdGVVaW50OCh3cml0ZXIsIGluZm8ucHJlc2VydmVMdW1pbm9zaXR5ID8gMSA6IDApO1xuXHRcdHdyaXRlWmVyb3Mod3JpdGVyLCAxKTtcblx0fSxcbik7XG5cbmludGVyZmFjZSBCbGFja0FuZFdoaXRlRGVzY3JpcHRvciB7XG5cdCdSZCAgJzogbnVtYmVyO1xuXHRZbGx3OiBudW1iZXI7XG5cdCdHcm4gJzogbnVtYmVyO1xuXHQnQ3luICc6IG51bWJlcjtcblx0J0JsICAnOiBudW1iZXI7XG5cdE1nbnQ6IG51bWJlcjtcblx0dXNlVGludDogYm9vbGVhbjtcblx0dGludENvbG9yPzogRGVzY3JpcHRvckNvbG9yO1xuXHRid1ByZXNldEtpbmQ6IG51bWJlcjtcblx0YmxhY2tBbmRXaGl0ZVByZXNldEZpbGVOYW1lOiBzdHJpbmc7XG59XG5cbmFkZEhhbmRsZXIoXG5cdCdibHdoJyxcblx0YWRqdXN0bWVudFR5cGUoJ2JsYWNrICYgd2hpdGUnKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0Y29uc3QgZGVzYzogQmxhY2tBbmRXaGl0ZURlc2NyaXB0b3IgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKTtcblx0XHR0YXJnZXQuYWRqdXN0bWVudCA9IHtcblx0XHRcdHR5cGU6ICdibGFjayAmIHdoaXRlJyxcblx0XHRcdHJlZHM6IGRlc2NbJ1JkICAnXSxcblx0XHRcdHllbGxvd3M6IGRlc2MuWWxsdyxcblx0XHRcdGdyZWVuczogZGVzY1snR3JuICddLFxuXHRcdFx0Y3lhbnM6IGRlc2NbJ0N5biAnXSxcblx0XHRcdGJsdWVzOiBkZXNjWydCbCAgJ10sXG5cdFx0XHRtYWdlbnRhczogZGVzYy5NZ250LFxuXHRcdFx0dXNlVGludDogISFkZXNjLnVzZVRpbnQsXG5cdFx0XHRwcmVzZXRLaW5kOiBkZXNjLmJ3UHJlc2V0S2luZCxcblx0XHRcdHByZXNldEZpbGVOYW1lOiBkZXNjLmJsYWNrQW5kV2hpdGVQcmVzZXRGaWxlTmFtZSxcblx0XHR9O1xuXG5cdFx0aWYgKGRlc2MudGludENvbG9yICE9PSB1bmRlZmluZWQpIHRhcmdldC5hZGp1c3RtZW50LnRpbnRDb2xvciA9IHBhcnNlQ29sb3IoZGVzYy50aW50Q29sb3IpO1xuXG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgaW5mbyA9IHRhcmdldC5hZGp1c3RtZW50IGFzIEJsYWNrQW5kV2hpdGVBZGp1c3RtZW50O1xuXHRcdGNvbnN0IGRlc2M6IEJsYWNrQW5kV2hpdGVEZXNjcmlwdG9yID0ge1xuXHRcdFx0J1JkICAnOiBpbmZvLnJlZHMgfHwgMCxcblx0XHRcdFlsbHc6IGluZm8ueWVsbG93cyB8fCAwLFxuXHRcdFx0J0dybiAnOiBpbmZvLmdyZWVucyB8fCAwLFxuXHRcdFx0J0N5biAnOiBpbmZvLmN5YW5zIHx8IDAsXG5cdFx0XHQnQmwgICc6IGluZm8uYmx1ZXMgfHwgMCxcblx0XHRcdE1nbnQ6IGluZm8ubWFnZW50YXMgfHwgMCxcblx0XHRcdHVzZVRpbnQ6ICEhaW5mby51c2VUaW50LFxuXHRcdFx0dGludENvbG9yOiBzZXJpYWxpemVDb2xvcihpbmZvLnRpbnRDb2xvciksXG5cdFx0XHRid1ByZXNldEtpbmQ6IGluZm8ucHJlc2V0S2luZCB8fCAwLFxuXHRcdFx0YmxhY2tBbmRXaGl0ZVByZXNldEZpbGVOYW1lOiBpbmZvLnByZXNldEZpbGVOYW1lIHx8ICcnLFxuXHRcdH07XG5cblx0XHR3cml0ZVZlcnNpb25BbmREZXNjcmlwdG9yKHdyaXRlciwgJycsICdudWxsJywgZGVzYyk7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQncGhmbCcsXG5cdGFkanVzdG1lbnRUeXBlKCdwaG90byBmaWx0ZXInKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0Y29uc3QgdmVyc2lvbiA9IHJlYWRVaW50MTYocmVhZGVyKTtcblx0XHRpZiAodmVyc2lvbiAhPT0gMiAmJiB2ZXJzaW9uICE9PSAzKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcGhmbCB2ZXJzaW9uJyk7XG5cblx0XHRsZXQgY29sb3I6IENvbG9yO1xuXG5cdFx0aWYgKHZlcnNpb24gPT09IDIpIHtcblx0XHRcdGNvbG9yID0gcmVhZENvbG9yKHJlYWRlcik7XG5cdFx0fSBlbHNlIHsgLy8gdmVyc2lvbiAzXG5cdFx0XHQvLyBUT0RPOiB0ZXN0IHRoaXMsIHRoaXMgaXMgcHJvYmFibHkgd3Jvbmdcblx0XHRcdGNvbG9yID0ge1xuXHRcdFx0XHRsOiByZWFkSW50MzIocmVhZGVyKSAvIDEwMCxcblx0XHRcdFx0YTogcmVhZEludDMyKHJlYWRlcikgLyAxMDAsXG5cdFx0XHRcdGI6IHJlYWRJbnQzMihyZWFkZXIpIC8gMTAwLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHR0YXJnZXQuYWRqdXN0bWVudCA9IHtcblx0XHRcdHR5cGU6ICdwaG90byBmaWx0ZXInLFxuXHRcdFx0Y29sb3IsXG5cdFx0XHRkZW5zaXR5OiByZWFkVWludDMyKHJlYWRlcikgLyAxMDAsXG5cdFx0XHRwcmVzZXJ2ZUx1bWlub3NpdHk6ICEhcmVhZFVpbnQ4KHJlYWRlciksXG5cdFx0fTtcblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGluZm8gPSB0YXJnZXQuYWRqdXN0bWVudCBhcyBQaG90b0ZpbHRlckFkanVzdG1lbnQ7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCAyKTsgLy8gdmVyc2lvblxuXHRcdHdyaXRlQ29sb3Iod3JpdGVyLCBpbmZvLmNvbG9yIHx8IHsgbDogMCwgYTogMCwgYjogMCB9KTtcblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIChpbmZvLmRlbnNpdHkgfHwgMCkgKiAxMDApO1xuXHRcdHdyaXRlVWludDgod3JpdGVyLCBpbmZvLnByZXNlcnZlTHVtaW5vc2l0eSA/IDEgOiAwKTtcblx0XHR3cml0ZVplcm9zKHdyaXRlciwgMyk7XG5cdH0sXG4pO1xuXG5mdW5jdGlvbiByZWFkTWl4ckNoYW5uZWwocmVhZGVyOiBQc2RSZWFkZXIpOiBDaGFubmVsTWl4ZXJDaGFubmVsIHtcblx0Y29uc3QgcmVkID0gcmVhZEludDE2KHJlYWRlcik7XG5cdGNvbnN0IGdyZWVuID0gcmVhZEludDE2KHJlYWRlcik7XG5cdGNvbnN0IGJsdWUgPSByZWFkSW50MTYocmVhZGVyKTtcblx0c2tpcEJ5dGVzKHJlYWRlciwgMik7XG5cdGNvbnN0IGNvbnN0YW50ID0gcmVhZEludDE2KHJlYWRlcik7XG5cdHJldHVybiB7IHJlZCwgZ3JlZW4sIGJsdWUsIGNvbnN0YW50IH07XG59XG5cbmZ1bmN0aW9uIHdyaXRlTWl4ckNoYW5uZWwod3JpdGVyOiBQc2RXcml0ZXIsIGNoYW5uZWw6IENoYW5uZWxNaXhlckNoYW5uZWwgfCB1bmRlZmluZWQpIHtcblx0Y29uc3QgYyA9IGNoYW5uZWwgfHwge30gYXMgUGFydGlhbDxDaGFubmVsTWl4ZXJDaGFubmVsPjtcblx0d3JpdGVJbnQxNih3cml0ZXIsIGMucmVkISk7XG5cdHdyaXRlSW50MTYod3JpdGVyLCBjLmdyZWVuISk7XG5cdHdyaXRlSW50MTYod3JpdGVyLCBjLmJsdWUhKTtcblx0d3JpdGVaZXJvcyh3cml0ZXIsIDIpO1xuXHR3cml0ZUludDE2KHdyaXRlciwgYy5jb25zdGFudCEpO1xufVxuXG5hZGRIYW5kbGVyKFxuXHQnbWl4cicsXG5cdGFkanVzdG1lbnRUeXBlKCdjaGFubmVsIG1peGVyJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdGlmIChyZWFkVWludDE2KHJlYWRlcikgIT09IDEpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBtaXhyIHZlcnNpb24nKTtcblxuXHRcdGNvbnN0IGFkanVzdG1lbnQ6IENoYW5uZWxNaXhlckFkanVzdG1lbnQgPSB0YXJnZXQuYWRqdXN0bWVudCA9IHtcblx0XHRcdC4uLnRhcmdldC5hZGp1c3RtZW50IGFzIFByZXNldEluZm8sXG5cdFx0XHR0eXBlOiAnY2hhbm5lbCBtaXhlcicsXG5cdFx0XHRtb25vY2hyb21lOiAhIXJlYWRVaW50MTYocmVhZGVyKSxcblx0XHR9O1xuXG5cdFx0aWYgKCFhZGp1c3RtZW50Lm1vbm9jaHJvbWUpIHtcblx0XHRcdGFkanVzdG1lbnQucmVkID0gcmVhZE1peHJDaGFubmVsKHJlYWRlcik7XG5cdFx0XHRhZGp1c3RtZW50LmdyZWVuID0gcmVhZE1peHJDaGFubmVsKHJlYWRlcik7XG5cdFx0XHRhZGp1c3RtZW50LmJsdWUgPSByZWFkTWl4ckNoYW5uZWwocmVhZGVyKTtcblx0XHR9XG5cblx0XHRhZGp1c3RtZW50LmdyYXkgPSByZWFkTWl4ckNoYW5uZWwocmVhZGVyKTtcblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGluZm8gPSB0YXJnZXQuYWRqdXN0bWVudCBhcyBDaGFubmVsTWl4ZXJBZGp1c3RtZW50O1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgMSk7IC8vIHZlcnNpb25cblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIGluZm8ubW9ub2Nocm9tZSA/IDEgOiAwKTtcblxuXHRcdGlmIChpbmZvLm1vbm9jaHJvbWUpIHtcblx0XHRcdHdyaXRlTWl4ckNoYW5uZWwod3JpdGVyLCBpbmZvLmdyYXkpO1xuXHRcdFx0d3JpdGVaZXJvcyh3cml0ZXIsIDMgKiA1ICogMik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHdyaXRlTWl4ckNoYW5uZWwod3JpdGVyLCBpbmZvLnJlZCk7XG5cdFx0XHR3cml0ZU1peHJDaGFubmVsKHdyaXRlciwgaW5mby5ncmVlbik7XG5cdFx0XHR3cml0ZU1peHJDaGFubmVsKHdyaXRlciwgaW5mby5ibHVlKTtcblx0XHRcdHdyaXRlTWl4ckNoYW5uZWwod3JpdGVyLCBpbmZvLmdyYXkpO1xuXHRcdH1cblx0fSxcbik7XG5cbmNvbnN0IGNvbG9yTG9va3VwVHlwZSA9IGNyZWF0ZUVudW08JzNkbHV0JyB8ICdhYnN0cmFjdFByb2ZpbGUnIHwgJ2RldmljZUxpbmtQcm9maWxlJz4oJ2NvbG9yTG9va3VwVHlwZScsICczRExVVCcsIHtcblx0JzNkbHV0JzogJzNETFVUJyxcblx0YWJzdHJhY3RQcm9maWxlOiAnYWJzdHJhY3RQcm9maWxlJyxcblx0ZGV2aWNlTGlua1Byb2ZpbGU6ICdkZXZpY2VMaW5rUHJvZmlsZScsXG59KTtcblxuY29uc3QgTFVURm9ybWF0VHlwZSA9IGNyZWF0ZUVudW08J2xvb2snIHwgJ2N1YmUnIHwgJzNkbCc+KCdMVVRGb3JtYXRUeXBlJywgJ2xvb2snLCB7XG5cdGxvb2s6ICdMVVRGb3JtYXRMT09LJyxcblx0Y3ViZTogJ0xVVEZvcm1hdENVQkUnLFxuXHQnM2RsJzogJ0xVVEZvcm1hdDNETCcsXG59KTtcblxuY29uc3QgY29sb3JMb29rdXBPcmRlciA9IGNyZWF0ZUVudW08J3JnYicgfCAnYmdyJz4oJ2NvbG9yTG9va3VwT3JkZXInLCAncmdiJywge1xuXHRyZ2I6ICdyZ2JPcmRlcicsXG5cdGJncjogJ2Jnck9yZGVyJyxcbn0pO1xuXG5pbnRlcmZhY2UgQ29sb3JMb29rdXBEZXNjcmlwdG9yIHtcblx0bG9va3VwVHlwZT86IHN0cmluZztcblx0J05tICAnPzogc3RyaW5nO1xuXHREdGhyPzogYm9vbGVhbjtcblx0cHJvZmlsZT86IFVpbnQ4QXJyYXk7XG5cdExVVEZvcm1hdD86IHN0cmluZztcblx0ZGF0YU9yZGVyPzogc3RyaW5nO1xuXHR0YWJsZU9yZGVyPzogc3RyaW5nO1xuXHRMVVQzREZpbGVEYXRhPzogVWludDhBcnJheTtcblx0TFVUM0RGaWxlTmFtZT86IHN0cmluZztcbn1cblxuYWRkSGFuZGxlcihcblx0J2NsckwnLFxuXHRhZGp1c3RtZW50VHlwZSgnY29sb3IgbG9va3VwJyksXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdGlmIChyZWFkVWludDE2KHJlYWRlcikgIT09IDEpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjbHJMIHZlcnNpb24nKTtcblxuXHRcdGNvbnN0IGRlc2M6IENvbG9yTG9va3VwRGVzY3JpcHRvciA9IHJlYWRWZXJzaW9uQW5kRGVzY3JpcHRvcihyZWFkZXIpO1xuXHRcdHRhcmdldC5hZGp1c3RtZW50ID0geyB0eXBlOiAnY29sb3IgbG9va3VwJyB9O1xuXHRcdGNvbnN0IGluZm8gPSB0YXJnZXQuYWRqdXN0bWVudDtcblxuXHRcdGlmIChkZXNjLmxvb2t1cFR5cGUgIT09IHVuZGVmaW5lZCkgaW5mby5sb29rdXBUeXBlID0gY29sb3JMb29rdXBUeXBlLmRlY29kZShkZXNjLmxvb2t1cFR5cGUpO1xuXHRcdGlmIChkZXNjWydObSAgJ10gIT09IHVuZGVmaW5lZCkgaW5mby5uYW1lID0gZGVzY1snTm0gICddO1xuXHRcdGlmIChkZXNjLkR0aHIgIT09IHVuZGVmaW5lZCkgaW5mby5kaXRoZXIgPSBkZXNjLkR0aHI7XG5cdFx0aWYgKGRlc2MucHJvZmlsZSAhPT0gdW5kZWZpbmVkKSBpbmZvLnByb2ZpbGUgPSBkZXNjLnByb2ZpbGU7XG5cdFx0aWYgKGRlc2MuTFVURm9ybWF0ICE9PSB1bmRlZmluZWQpIGluZm8ubHV0Rm9ybWF0ID0gTFVURm9ybWF0VHlwZS5kZWNvZGUoZGVzYy5MVVRGb3JtYXQpO1xuXHRcdGlmIChkZXNjLmRhdGFPcmRlciAhPT0gdW5kZWZpbmVkKSBpbmZvLmRhdGFPcmRlciA9IGNvbG9yTG9va3VwT3JkZXIuZGVjb2RlKGRlc2MuZGF0YU9yZGVyKTtcblx0XHRpZiAoZGVzYy50YWJsZU9yZGVyICE9PSB1bmRlZmluZWQpIGluZm8udGFibGVPcmRlciA9IGNvbG9yTG9va3VwT3JkZXIuZGVjb2RlKGRlc2MudGFibGVPcmRlcik7XG5cdFx0aWYgKGRlc2MuTFVUM0RGaWxlRGF0YSAhPT0gdW5kZWZpbmVkKSBpbmZvLmx1dDNERmlsZURhdGEgPSBkZXNjLkxVVDNERmlsZURhdGE7XG5cdFx0aWYgKGRlc2MuTFVUM0RGaWxlTmFtZSAhPT0gdW5kZWZpbmVkKSBpbmZvLmx1dDNERmlsZU5hbWUgPSBkZXNjLkxVVDNERmlsZU5hbWU7XG5cblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBpbmZvID0gdGFyZ2V0LmFkanVzdG1lbnQgYXMgQ29sb3JMb29rdXBBZGp1c3RtZW50O1xuXHRcdGNvbnN0IGRlc2M6IENvbG9yTG9va3VwRGVzY3JpcHRvciA9IHt9O1xuXG5cdFx0aWYgKGluZm8ubG9va3VwVHlwZSAhPT0gdW5kZWZpbmVkKSBkZXNjLmxvb2t1cFR5cGUgPSBjb2xvckxvb2t1cFR5cGUuZW5jb2RlKGluZm8ubG9va3VwVHlwZSk7XG5cdFx0aWYgKGluZm8ubmFtZSAhPT0gdW5kZWZpbmVkKSBkZXNjWydObSAgJ10gPSBpbmZvLm5hbWU7XG5cdFx0aWYgKGluZm8uZGl0aGVyICE9PSB1bmRlZmluZWQpIGRlc2MuRHRociA9IGluZm8uZGl0aGVyO1xuXHRcdGlmIChpbmZvLnByb2ZpbGUgIT09IHVuZGVmaW5lZCkgZGVzYy5wcm9maWxlID0gaW5mby5wcm9maWxlO1xuXHRcdGlmIChpbmZvLmx1dEZvcm1hdCAhPT0gdW5kZWZpbmVkKSBkZXNjLkxVVEZvcm1hdCA9IExVVEZvcm1hdFR5cGUuZW5jb2RlKGluZm8ubHV0Rm9ybWF0KTtcblx0XHRpZiAoaW5mby5kYXRhT3JkZXIgIT09IHVuZGVmaW5lZCkgZGVzYy5kYXRhT3JkZXIgPSBjb2xvckxvb2t1cE9yZGVyLmVuY29kZShpbmZvLmRhdGFPcmRlcik7XG5cdFx0aWYgKGluZm8udGFibGVPcmRlciAhPT0gdW5kZWZpbmVkKSBkZXNjLnRhYmxlT3JkZXIgPSBjb2xvckxvb2t1cE9yZGVyLmVuY29kZShpbmZvLnRhYmxlT3JkZXIpO1xuXHRcdGlmIChpbmZvLmx1dDNERmlsZURhdGEgIT09IHVuZGVmaW5lZCkgZGVzYy5MVVQzREZpbGVEYXRhID0gaW5mby5sdXQzREZpbGVEYXRhO1xuXHRcdGlmIChpbmZvLmx1dDNERmlsZU5hbWUgIT09IHVuZGVmaW5lZCkgZGVzYy5MVVQzREZpbGVOYW1lID0gaW5mby5sdXQzREZpbGVOYW1lO1xuXG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCAxKTsgLy8gdmVyc2lvblxuXHRcdHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgJ251bGwnLCBkZXNjKTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdCdudnJ0Jyxcblx0YWRqdXN0bWVudFR5cGUoJ2ludmVydCcpLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHR0YXJnZXQuYWRqdXN0bWVudCA9IHsgdHlwZTogJ2ludmVydCcgfTtcblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQoKSA9PiB7XG5cdFx0Ly8gbm90aGluZyB0byB3cml0ZSBoZXJlXG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQncG9zdCcsXG5cdGFkanVzdG1lbnRUeXBlKCdwb3N0ZXJpemUnKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0dGFyZ2V0LmFkanVzdG1lbnQgPSB7XG5cdFx0XHR0eXBlOiAncG9zdGVyaXplJyxcblx0XHRcdGxldmVsczogcmVhZFVpbnQxNihyZWFkZXIpLFxuXHRcdH07XG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgaW5mbyA9IHRhcmdldC5hZGp1c3RtZW50IGFzIFBvc3Rlcml6ZUFkanVzdG1lbnQ7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBpbmZvLmxldmVscyA/PyA0KTtcblx0XHR3cml0ZVplcm9zKHdyaXRlciwgMik7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQndGhycycsXG5cdGFkanVzdG1lbnRUeXBlKCd0aHJlc2hvbGQnKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0dGFyZ2V0LmFkanVzdG1lbnQgPSB7XG5cdFx0XHR0eXBlOiAndGhyZXNob2xkJyxcblx0XHRcdGxldmVsOiByZWFkVWludDE2KHJlYWRlciksXG5cdFx0fTtcblx0XHRza2lwQnl0ZXMocmVhZGVyLCBsZWZ0KCkpO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBpbmZvID0gdGFyZ2V0LmFkanVzdG1lbnQgYXMgVGhyZXNob2xkQWRqdXN0bWVudDtcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIGluZm8ubGV2ZWwgPz8gMTI4KTtcblx0XHR3cml0ZVplcm9zKHdyaXRlciwgMik7XG5cdH0sXG4pO1xuXG5jb25zdCBncmRtQ29sb3JNb2RlbHMgPSBbJycsICcnLCAnJywgJ3JnYicsICdoc2InLCAnJywgJ2xhYiddO1xuXG5hZGRIYW5kbGVyKFxuXHQnZ3JkbScsXG5cdGFkanVzdG1lbnRUeXBlKCdncmFkaWVudCBtYXAnKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0aWYgKHJlYWRVaW50MTYocmVhZGVyKSAhPT0gMSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGdyZG0gdmVyc2lvbicpO1xuXG5cdFx0Y29uc3QgaW5mbzogR3JhZGllbnRNYXBBZGp1c3RtZW50ID0ge1xuXHRcdFx0dHlwZTogJ2dyYWRpZW50IG1hcCcsXG5cdFx0XHRncmFkaWVudFR5cGU6ICdzb2xpZCcsXG5cdFx0fTtcblxuXHRcdGluZm8ucmV2ZXJzZSA9ICEhcmVhZFVpbnQ4KHJlYWRlcik7XG5cdFx0aW5mby5kaXRoZXIgPSAhIXJlYWRVaW50OChyZWFkZXIpO1xuXHRcdGluZm8ubmFtZSA9IHJlYWRVbmljb2RlU3RyaW5nKHJlYWRlcik7XG5cdFx0aW5mby5jb2xvclN0b3BzID0gW107XG5cdFx0aW5mby5vcGFjaXR5U3RvcHMgPSBbXTtcblxuXHRcdGNvbnN0IHN0b3BzQ291bnQgPSByZWFkVWludDE2KHJlYWRlcik7XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHN0b3BzQ291bnQ7IGkrKykge1xuXHRcdFx0aW5mby5jb2xvclN0b3BzLnB1c2goe1xuXHRcdFx0XHRsb2NhdGlvbjogcmVhZFVpbnQzMihyZWFkZXIpLFxuXHRcdFx0XHRtaWRwb2ludDogcmVhZFVpbnQzMihyZWFkZXIpIC8gMTAwLFxuXHRcdFx0XHRjb2xvcjogcmVhZENvbG9yKHJlYWRlciksXG5cdFx0XHR9KTtcblx0XHRcdHNraXBCeXRlcyhyZWFkZXIsIDIpO1xuXHRcdH1cblxuXHRcdGNvbnN0IG9wYWNpdHlTdG9wc0NvdW50ID0gcmVhZFVpbnQxNihyZWFkZXIpO1xuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBvcGFjaXR5U3RvcHNDb3VudDsgaSsrKSB7XG5cdFx0XHRpbmZvLm9wYWNpdHlTdG9wcy5wdXNoKHtcblx0XHRcdFx0bG9jYXRpb246IHJlYWRVaW50MzIocmVhZGVyKSxcblx0XHRcdFx0bWlkcG9pbnQ6IHJlYWRVaW50MzIocmVhZGVyKSAvIDEwMCxcblx0XHRcdFx0b3BhY2l0eTogcmVhZFVpbnQxNihyZWFkZXIpIC8gMHhmZixcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IGV4cGFuc2lvbkNvdW50ID0gcmVhZFVpbnQxNihyZWFkZXIpO1xuXHRcdGlmIChleHBhbnNpb25Db3VudCAhPT0gMikgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGdyZG0gZXhwYW5zaW9uIGNvdW50Jyk7XG5cblx0XHRjb25zdCBpbnRlcnBvbGF0aW9uID0gcmVhZFVpbnQxNihyZWFkZXIpO1xuXHRcdGluZm8uc21vb3RobmVzcyA9IGludGVycG9sYXRpb24gLyA0MDk2O1xuXG5cdFx0Y29uc3QgbGVuZ3RoID0gcmVhZFVpbnQxNihyZWFkZXIpO1xuXHRcdGlmIChsZW5ndGggIT09IDMyKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZ3JkbSBsZW5ndGgnKTtcblxuXHRcdGluZm8uZ3JhZGllbnRUeXBlID0gcmVhZFVpbnQxNihyZWFkZXIpID8gJ25vaXNlJyA6ICdzb2xpZCc7XG5cdFx0aW5mby5yYW5kb21TZWVkID0gcmVhZFVpbnQzMihyZWFkZXIpO1xuXHRcdGluZm8uYWRkVHJhbnNwYXJlbmN5ID0gISFyZWFkVWludDE2KHJlYWRlcik7XG5cdFx0aW5mby5yZXN0cmljdENvbG9ycyA9ICEhcmVhZFVpbnQxNihyZWFkZXIpO1xuXHRcdGluZm8ucm91Z2huZXNzID0gcmVhZFVpbnQzMihyZWFkZXIpIC8gNDA5Njtcblx0XHRpbmZvLmNvbG9yTW9kZWwgPSAoZ3JkbUNvbG9yTW9kZWxzW3JlYWRVaW50MTYocmVhZGVyKV0gfHwgJ3JnYicpIGFzICdyZ2InIHwgJ2hzYicgfCAnbGFiJztcblxuXHRcdGluZm8ubWluID0gW1xuXHRcdFx0cmVhZFVpbnQxNihyZWFkZXIpIC8gMHg4MDAwLFxuXHRcdFx0cmVhZFVpbnQxNihyZWFkZXIpIC8gMHg4MDAwLFxuXHRcdFx0cmVhZFVpbnQxNihyZWFkZXIpIC8gMHg4MDAwLFxuXHRcdFx0cmVhZFVpbnQxNihyZWFkZXIpIC8gMHg4MDAwLFxuXHRcdF07XG5cblx0XHRpbmZvLm1heCA9IFtcblx0XHRcdHJlYWRVaW50MTYocmVhZGVyKSAvIDB4ODAwMCxcblx0XHRcdHJlYWRVaW50MTYocmVhZGVyKSAvIDB4ODAwMCxcblx0XHRcdHJlYWRVaW50MTYocmVhZGVyKSAvIDB4ODAwMCxcblx0XHRcdHJlYWRVaW50MTYocmVhZGVyKSAvIDB4ODAwMCxcblx0XHRdO1xuXG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblxuXHRcdGZvciAoY29uc3QgcyBvZiBpbmZvLmNvbG9yU3RvcHMpIHMubG9jYXRpb24gLz0gaW50ZXJwb2xhdGlvbjtcblx0XHRmb3IgKGNvbnN0IHMgb2YgaW5mby5vcGFjaXR5U3RvcHMpIHMubG9jYXRpb24gLz0gaW50ZXJwb2xhdGlvbjtcblxuXHRcdHRhcmdldC5hZGp1c3RtZW50ID0gaW5mbztcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgaW5mbyA9IHRhcmdldC5hZGp1c3RtZW50IGFzIEdyYWRpZW50TWFwQWRqdXN0bWVudDtcblxuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgMSk7IC8vIHZlcnNpb25cblx0XHR3cml0ZVVpbnQ4KHdyaXRlciwgaW5mby5yZXZlcnNlID8gMSA6IDApO1xuXHRcdHdyaXRlVWludDgod3JpdGVyLCBpbmZvLmRpdGhlciA/IDEgOiAwKTtcblx0XHR3cml0ZVVuaWNvZGVTdHJpbmdXaXRoUGFkZGluZyh3cml0ZXIsIGluZm8ubmFtZSB8fCAnJyk7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBpbmZvLmNvbG9yU3RvcHMgJiYgaW5mby5jb2xvclN0b3BzLmxlbmd0aCB8fCAwKTtcblxuXHRcdGNvbnN0IGludGVycG9sYXRpb24gPSBNYXRoLnJvdW5kKChpbmZvLnNtb290aG5lc3MgPz8gMSkgKiA0MDk2KTtcblxuXHRcdGZvciAoY29uc3QgcyBvZiBpbmZvLmNvbG9yU3RvcHMgfHwgW10pIHtcblx0XHRcdHdyaXRlVWludDMyKHdyaXRlciwgTWF0aC5yb3VuZChzLmxvY2F0aW9uICogaW50ZXJwb2xhdGlvbikpO1xuXHRcdFx0d3JpdGVVaW50MzIod3JpdGVyLCBNYXRoLnJvdW5kKHMubWlkcG9pbnQgKiAxMDApKTtcblx0XHRcdHdyaXRlQ29sb3Iod3JpdGVyLCBzLmNvbG9yKTtcblx0XHRcdHdyaXRlWmVyb3Mod3JpdGVyLCAyKTtcblx0XHR9XG5cblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIGluZm8ub3BhY2l0eVN0b3BzICYmIGluZm8ub3BhY2l0eVN0b3BzLmxlbmd0aCB8fCAwKTtcblxuXHRcdGZvciAoY29uc3QgcyBvZiBpbmZvLm9wYWNpdHlTdG9wcyB8fCBbXSkge1xuXHRcdFx0d3JpdGVVaW50MzIod3JpdGVyLCBNYXRoLnJvdW5kKHMubG9jYXRpb24gKiBpbnRlcnBvbGF0aW9uKSk7XG5cdFx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIE1hdGgucm91bmQocy5taWRwb2ludCAqIDEwMCkpO1xuXHRcdFx0d3JpdGVVaW50MTYod3JpdGVyLCBNYXRoLnJvdW5kKHMub3BhY2l0eSAqIDB4ZmYpKTtcblx0XHR9XG5cblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIDIpOyAvLyBleHBhbnNpb24gY291bnRcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIGludGVycG9sYXRpb24pO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgMzIpOyAvLyBsZW5ndGhcblx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIGluZm8uZ3JhZGllbnRUeXBlID09PSAnbm9pc2UnID8gMSA6IDApO1xuXHRcdHdyaXRlVWludDMyKHdyaXRlciwgaW5mby5yYW5kb21TZWVkIHx8IDApO1xuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgaW5mby5hZGRUcmFuc3BhcmVuY3kgPyAxIDogMCk7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBpbmZvLnJlc3RyaWN0Q29sb3JzID8gMSA6IDApO1xuXHRcdHdyaXRlVWludDMyKHdyaXRlciwgTWF0aC5yb3VuZCgoaW5mby5yb3VnaG5lc3MgPz8gMSkgKiA0MDk2KSk7XG5cdFx0Y29uc3QgY29sb3JNb2RlbCA9IGdyZG1Db2xvck1vZGVscy5pbmRleE9mKGluZm8uY29sb3JNb2RlbCA/PyAncmdiJyk7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBjb2xvck1vZGVsID09PSAtMSA/IDMgOiBjb2xvck1vZGVsKTtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgNDsgaSsrKVxuXHRcdFx0d3JpdGVVaW50MTYod3JpdGVyLCBNYXRoLnJvdW5kKChpbmZvLm1pbiAmJiBpbmZvLm1pbltpXSB8fCAwKSAqIDB4ODAwMCkpO1xuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCA0OyBpKyspXG5cdFx0XHR3cml0ZVVpbnQxNih3cml0ZXIsIE1hdGgucm91bmQoKGluZm8ubWF4ICYmIGluZm8ubWF4W2ldIHx8IDApICogMHg4MDAwKSk7XG5cblx0XHR3cml0ZVplcm9zKHdyaXRlciwgNCk7XG5cdH0sXG4pO1xuXG5mdW5jdGlvbiByZWFkU2VsZWN0aXZlQ29sb3JzKHJlYWRlcjogUHNkUmVhZGVyKTogQ01ZSyB7XG5cdHJldHVybiB7XG5cdFx0YzogcmVhZEludDE2KHJlYWRlciksXG5cdFx0bTogcmVhZEludDE2KHJlYWRlciksXG5cdFx0eTogcmVhZEludDE2KHJlYWRlciksXG5cdFx0azogcmVhZEludDE2KHJlYWRlciksXG5cdH07XG59XG5cbmZ1bmN0aW9uIHdyaXRlU2VsZWN0aXZlQ29sb3JzKHdyaXRlcjogUHNkV3JpdGVyLCBjbXlrOiBDTVlLIHwgdW5kZWZpbmVkKSB7XG5cdGNvbnN0IGMgPSBjbXlrIHx8IHt9IGFzIFBhcnRpYWw8Q01ZSz47XG5cdHdyaXRlSW50MTYod3JpdGVyLCBjLmMhKTtcblx0d3JpdGVJbnQxNih3cml0ZXIsIGMubSEpO1xuXHR3cml0ZUludDE2KHdyaXRlciwgYy55ISk7XG5cdHdyaXRlSW50MTYod3JpdGVyLCBjLmshKTtcbn1cblxuYWRkSGFuZGxlcihcblx0J3NlbGMnLFxuXHRhZGp1c3RtZW50VHlwZSgnc2VsZWN0aXZlIGNvbG9yJyksXG5cdChyZWFkZXIsIHRhcmdldCkgPT4ge1xuXHRcdGlmIChyZWFkVWludDE2KHJlYWRlcikgIT09IDEpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzZWxjIHZlcnNpb24nKTtcblxuXHRcdGNvbnN0IG1vZGUgPSByZWFkVWludDE2KHJlYWRlcikgPyAnYWJzb2x1dGUnIDogJ3JlbGF0aXZlJztcblx0XHRza2lwQnl0ZXMocmVhZGVyLCA4KTtcblxuXHRcdHRhcmdldC5hZGp1c3RtZW50ID0ge1xuXHRcdFx0dHlwZTogJ3NlbGVjdGl2ZSBjb2xvcicsXG5cdFx0XHRtb2RlLFxuXHRcdFx0cmVkczogcmVhZFNlbGVjdGl2ZUNvbG9ycyhyZWFkZXIpLFxuXHRcdFx0eWVsbG93czogcmVhZFNlbGVjdGl2ZUNvbG9ycyhyZWFkZXIpLFxuXHRcdFx0Z3JlZW5zOiByZWFkU2VsZWN0aXZlQ29sb3JzKHJlYWRlciksXG5cdFx0XHRjeWFuczogcmVhZFNlbGVjdGl2ZUNvbG9ycyhyZWFkZXIpLFxuXHRcdFx0Ymx1ZXM6IHJlYWRTZWxlY3RpdmVDb2xvcnMocmVhZGVyKSxcblx0XHRcdG1hZ2VudGFzOiByZWFkU2VsZWN0aXZlQ29sb3JzKHJlYWRlciksXG5cdFx0XHR3aGl0ZXM6IHJlYWRTZWxlY3RpdmVDb2xvcnMocmVhZGVyKSxcblx0XHRcdG5ldXRyYWxzOiByZWFkU2VsZWN0aXZlQ29sb3JzKHJlYWRlciksXG5cdFx0XHRibGFja3M6IHJlYWRTZWxlY3RpdmVDb2xvcnMocmVhZGVyKSxcblx0XHR9O1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHRjb25zdCBpbmZvID0gdGFyZ2V0LmFkanVzdG1lbnQgYXMgU2VsZWN0aXZlQ29sb3JBZGp1c3RtZW50O1xuXG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCAxKTsgLy8gdmVyc2lvblxuXHRcdHdyaXRlVWludDE2KHdyaXRlciwgaW5mby5tb2RlID09PSAnYWJzb2x1dGUnID8gMSA6IDApO1xuXHRcdHdyaXRlWmVyb3Mod3JpdGVyLCA4KTtcblx0XHR3cml0ZVNlbGVjdGl2ZUNvbG9ycyh3cml0ZXIsIGluZm8ucmVkcyk7XG5cdFx0d3JpdGVTZWxlY3RpdmVDb2xvcnMod3JpdGVyLCBpbmZvLnllbGxvd3MpO1xuXHRcdHdyaXRlU2VsZWN0aXZlQ29sb3JzKHdyaXRlciwgaW5mby5ncmVlbnMpO1xuXHRcdHdyaXRlU2VsZWN0aXZlQ29sb3JzKHdyaXRlciwgaW5mby5jeWFucyk7XG5cdFx0d3JpdGVTZWxlY3RpdmVDb2xvcnMod3JpdGVyLCBpbmZvLmJsdWVzKTtcblx0XHR3cml0ZVNlbGVjdGl2ZUNvbG9ycyh3cml0ZXIsIGluZm8ubWFnZW50YXMpO1xuXHRcdHdyaXRlU2VsZWN0aXZlQ29sb3JzKHdyaXRlciwgaW5mby53aGl0ZXMpO1xuXHRcdHdyaXRlU2VsZWN0aXZlQ29sb3JzKHdyaXRlciwgaW5mby5uZXV0cmFscyk7XG5cdFx0d3JpdGVTZWxlY3RpdmVDb2xvcnMod3JpdGVyLCBpbmZvLmJsYWNrcyk7XG5cdH0sXG4pO1xuXG5pbnRlcmZhY2UgQnJpZ2h0bmVzc0NvbnRyYXN0RGVzY3JpcHRvciB7XG5cdFZyc246IG51bWJlcjtcblx0QnJnaDogbnVtYmVyO1xuXHRDbnRyOiBudW1iZXI7XG5cdG1lYW5zOiBudW1iZXI7XG5cdCdMYWIgJzogYm9vbGVhbjtcblx0dXNlTGVnYWN5OiBib29sZWFuO1xuXHRBdXRvOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgUHJlc2V0RGVzY3JpcHRvciB7XG5cdFZyc246IG51bWJlcjtcblx0cHJlc2V0S2luZDogbnVtYmVyO1xuXHRwcmVzZXRGaWxlTmFtZTogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgQ3VydmVzUHJlc2V0RGVzY3JpcHRvciB7XG5cdFZyc246IG51bWJlcjtcblx0Y3VydmVzUHJlc2V0S2luZDogbnVtYmVyO1xuXHRjdXJ2ZXNQcmVzZXRGaWxlTmFtZTogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgTWl4ZXJQcmVzZXREZXNjcmlwdG9yIHtcblx0VnJzbjogbnVtYmVyO1xuXHRtaXhlclByZXNldEtpbmQ6IG51bWJlcjtcblx0bWl4ZXJQcmVzZXRGaWxlTmFtZTogc3RyaW5nO1xufVxuXG5hZGRIYW5kbGVyKFxuXHQnQ2dFZCcsXG5cdHRhcmdldCA9PiB7XG5cdFx0Y29uc3QgYSA9IHRhcmdldC5hZGp1c3RtZW50O1xuXG5cdFx0aWYgKCFhKSByZXR1cm4gZmFsc2U7XG5cblx0XHRyZXR1cm4gKGEudHlwZSA9PT0gJ2JyaWdodG5lc3MvY29udHJhc3QnICYmICFhLnVzZUxlZ2FjeSkgfHxcblx0XHRcdCgoYS50eXBlID09PSAnbGV2ZWxzJyB8fCBhLnR5cGUgPT09ICdjdXJ2ZXMnIHx8IGEudHlwZSA9PT0gJ2V4cG9zdXJlJyB8fCBhLnR5cGUgPT09ICdjaGFubmVsIG1peGVyJyB8fFxuXHRcdFx0XHRhLnR5cGUgPT09ICdodWUvc2F0dXJhdGlvbicpICYmIGEucHJlc2V0RmlsZU5hbWUgIT09IHVuZGVmaW5lZCk7XG5cdH0sXG5cdChyZWFkZXIsIHRhcmdldCwgbGVmdCkgPT4ge1xuXHRcdGNvbnN0IGRlc2MgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKSBhc1xuXHRcdFx0QnJpZ2h0bmVzc0NvbnRyYXN0RGVzY3JpcHRvciB8IFByZXNldERlc2NyaXB0b3IgfCBDdXJ2ZXNQcmVzZXREZXNjcmlwdG9yIHwgTWl4ZXJQcmVzZXREZXNjcmlwdG9yO1xuXHRcdGlmIChkZXNjLlZyc24gIT09IDEpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBDZ0VkIHZlcnNpb24nKTtcblxuXHRcdC8vIHRoaXMgc2VjdGlvbiBjYW4gc3BlY2lmeSBwcmVzZXQgZmlsZSBuYW1lIGZvciBvdGhlciBhZGp1c3RtZW50IHR5cGVzXG5cdFx0aWYgKCdwcmVzZXRGaWxlTmFtZScgaW4gZGVzYykge1xuXHRcdFx0dGFyZ2V0LmFkanVzdG1lbnQgPSB7XG5cdFx0XHRcdC4uLnRhcmdldC5hZGp1c3RtZW50IGFzIExldmVsc0FkanVzdG1lbnQgfCBFeHBvc3VyZUFkanVzdG1lbnQgfCBIdWVTYXR1cmF0aW9uQWRqdXN0bWVudCxcblx0XHRcdFx0cHJlc2V0S2luZDogZGVzYy5wcmVzZXRLaW5kLFxuXHRcdFx0XHRwcmVzZXRGaWxlTmFtZTogZGVzYy5wcmVzZXRGaWxlTmFtZSxcblx0XHRcdH07XG5cdFx0fSBlbHNlIGlmICgnY3VydmVzUHJlc2V0RmlsZU5hbWUnIGluIGRlc2MpIHtcblx0XHRcdHRhcmdldC5hZGp1c3RtZW50ID0ge1xuXHRcdFx0XHQuLi50YXJnZXQuYWRqdXN0bWVudCBhcyBDdXJ2ZXNBZGp1c3RtZW50LFxuXHRcdFx0XHRwcmVzZXRLaW5kOiBkZXNjLmN1cnZlc1ByZXNldEtpbmQsXG5cdFx0XHRcdHByZXNldEZpbGVOYW1lOiBkZXNjLmN1cnZlc1ByZXNldEZpbGVOYW1lLFxuXHRcdFx0fTtcblx0XHR9IGVsc2UgaWYgKCdtaXhlclByZXNldEZpbGVOYW1lJyBpbiBkZXNjKSB7XG5cdFx0XHR0YXJnZXQuYWRqdXN0bWVudCA9IHtcblx0XHRcdFx0Li4udGFyZ2V0LmFkanVzdG1lbnQgYXMgQ3VydmVzQWRqdXN0bWVudCxcblx0XHRcdFx0cHJlc2V0S2luZDogZGVzYy5taXhlclByZXNldEtpbmQsXG5cdFx0XHRcdHByZXNldEZpbGVOYW1lOiBkZXNjLm1peGVyUHJlc2V0RmlsZU5hbWUsXG5cdFx0XHR9O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0YXJnZXQuYWRqdXN0bWVudCA9IHtcblx0XHRcdFx0dHlwZTogJ2JyaWdodG5lc3MvY29udHJhc3QnLFxuXHRcdFx0XHRicmlnaHRuZXNzOiBkZXNjLkJyZ2gsXG5cdFx0XHRcdGNvbnRyYXN0OiBkZXNjLkNudHIsXG5cdFx0XHRcdG1lYW5WYWx1ZTogZGVzYy5tZWFucyxcblx0XHRcdFx0dXNlTGVnYWN5OiAhIWRlc2MudXNlTGVnYWN5LFxuXHRcdFx0XHRsYWJDb2xvck9ubHk6ICEhZGVzY1snTGFiICddLFxuXHRcdFx0XHRhdXRvOiAhIWRlc2MuQXV0byxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgaW5mbyA9IHRhcmdldC5hZGp1c3RtZW50ITtcblxuXHRcdGlmIChpbmZvLnR5cGUgPT09ICdsZXZlbHMnIHx8IGluZm8udHlwZSA9PT0gJ2V4cG9zdXJlJyB8fCBpbmZvLnR5cGUgPT09ICdodWUvc2F0dXJhdGlvbicpIHtcblx0XHRcdGNvbnN0IGRlc2M6IFByZXNldERlc2NyaXB0b3IgPSB7XG5cdFx0XHRcdFZyc246IDEsXG5cdFx0XHRcdHByZXNldEtpbmQ6IGluZm8ucHJlc2V0S2luZCA/PyAxLFxuXHRcdFx0XHRwcmVzZXRGaWxlTmFtZTogaW5mby5wcmVzZXRGaWxlTmFtZSB8fCAnJyxcblx0XHRcdH07XG5cdFx0XHR3cml0ZVZlcnNpb25BbmREZXNjcmlwdG9yKHdyaXRlciwgJycsICdudWxsJywgZGVzYyk7XG5cdFx0fSBlbHNlIGlmIChpbmZvLnR5cGUgPT09ICdjdXJ2ZXMnKSB7XG5cdFx0XHRjb25zdCBkZXNjOiBDdXJ2ZXNQcmVzZXREZXNjcmlwdG9yID0ge1xuXHRcdFx0XHRWcnNuOiAxLFxuXHRcdFx0XHRjdXJ2ZXNQcmVzZXRLaW5kOiBpbmZvLnByZXNldEtpbmQgPz8gMSxcblx0XHRcdFx0Y3VydmVzUHJlc2V0RmlsZU5hbWU6IGluZm8ucHJlc2V0RmlsZU5hbWUgfHwgJycsXG5cdFx0XHR9O1xuXHRcdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnbnVsbCcsIGRlc2MpO1xuXHRcdH0gZWxzZSBpZiAoaW5mby50eXBlID09PSAnY2hhbm5lbCBtaXhlcicpIHtcblx0XHRcdGNvbnN0IGRlc2M6IE1peGVyUHJlc2V0RGVzY3JpcHRvciA9IHtcblx0XHRcdFx0VnJzbjogMSxcblx0XHRcdFx0bWl4ZXJQcmVzZXRLaW5kOiBpbmZvLnByZXNldEtpbmQgPz8gMSxcblx0XHRcdFx0bWl4ZXJQcmVzZXRGaWxlTmFtZTogaW5mby5wcmVzZXRGaWxlTmFtZSB8fCAnJyxcblx0XHRcdH07XG5cdFx0XHR3cml0ZVZlcnNpb25BbmREZXNjcmlwdG9yKHdyaXRlciwgJycsICdudWxsJywgZGVzYyk7XG5cdFx0fSBlbHNlIGlmIChpbmZvLnR5cGUgPT09ICdicmlnaHRuZXNzL2NvbnRyYXN0Jykge1xuXHRcdFx0Y29uc3QgZGVzYzogQnJpZ2h0bmVzc0NvbnRyYXN0RGVzY3JpcHRvciA9IHtcblx0XHRcdFx0VnJzbjogMSxcblx0XHRcdFx0QnJnaDogaW5mby5icmlnaHRuZXNzIHx8IDAsXG5cdFx0XHRcdENudHI6IGluZm8uY29udHJhc3QgfHwgMCxcblx0XHRcdFx0bWVhbnM6IGluZm8ubWVhblZhbHVlID8/IDEyNyxcblx0XHRcdFx0J0xhYiAnOiAhIWluZm8ubGFiQ29sb3JPbmx5LFxuXHRcdFx0XHR1c2VMZWdhY3k6ICEhaW5mby51c2VMZWdhY3ksXG5cdFx0XHRcdEF1dG86ICEhaW5mby5hdXRvLFxuXHRcdFx0fTtcblx0XHRcdHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgJ251bGwnLCBkZXNjKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdVbmhhbmRsZWQgQ2dFZCBjYXNlJyk7XG5cdFx0fVxuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J1R4dDInLFxuXHRoYXNLZXkoJ2VuZ2luZURhdGEnKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0KSA9PiB7XG5cdFx0Y29uc3QgZGF0YSA9IHJlYWRCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdFx0dGFyZ2V0LmVuZ2luZURhdGEgPSBmcm9tQnl0ZUFycmF5KGRhdGEpO1xuXHRcdC8vIGNvbnN0IGVuZ2luZURhdGEgPSBwYXJzZUVuZ2luZURhdGEoZGF0YSk7XG5cdFx0Ly8gY29uc29sZS5sb2cocmVxdWlyZSgndXRpbCcpLmluc3BlY3QoZW5naW5lRGF0YSwgZmFsc2UsIDk5LCB0cnVlKSk7XG5cdFx0Ly8gcmVxdWlyZSgnZnMnKS53cml0ZUZpbGVTeW5jKCdyZXNvdXJjZXMvZW5naW5lRGF0YTJTaW1wbGUudHh0JywgcmVxdWlyZSgndXRpbCcpLmluc3BlY3QoZW5naW5lRGF0YSwgZmFsc2UsIDk5LCBmYWxzZSksICd1dGY4Jyk7XG5cdFx0Ly8gcmVxdWlyZSgnZnMnKS53cml0ZUZpbGVTeW5jKCd0ZXN0X2RhdGEuanNvbicsIEpTT04uc3RyaW5naWZ5KGVkLCBudWxsLCAyKSwgJ3V0ZjgnKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0Y29uc3QgYnVmZmVyID0gdG9CeXRlQXJyYXkodGFyZ2V0LmVuZ2luZURhdGEhKTtcblx0XHR3cml0ZUJ5dGVzKHdyaXRlciwgYnVmZmVyKTtcblx0fSxcbik7XG5cbmFkZEhhbmRsZXIoXG5cdCdGTXNrJyxcblx0aGFzS2V5KCdmaWx0ZXJNYXNrJyksXG5cdChyZWFkZXIsIHRhcmdldCkgPT4ge1xuXHRcdHRhcmdldC5maWx0ZXJNYXNrID0ge1xuXHRcdFx0Y29sb3JTcGFjZTogcmVhZENvbG9yKHJlYWRlciksXG5cdFx0XHRvcGFjaXR5OiByZWFkVWludDE2KHJlYWRlcikgLyAweGZmLFxuXHRcdH07XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdHdyaXRlQ29sb3Iod3JpdGVyLCB0YXJnZXQuZmlsdGVyTWFzayEuY29sb3JTcGFjZSk7XG5cdFx0d3JpdGVVaW50MTYod3JpdGVyLCBjbGFtcCh0YXJnZXQuZmlsdGVyTWFzayEub3BhY2l0eSA/PyAxLCAwLCAxKSAqIDB4ZmYpO1xuXHR9LFxuKTtcblxuaW50ZXJmYWNlIEFydGREZXNjcmlwdG9yIHtcblx0J0NudCAnOiBudW1iZXI7XG5cdGF1dG9FeHBhbmRPZmZzZXQ6IHsgSHJ6bjogbnVtYmVyOyBWcnRjOiBudW1iZXI7IH07XG5cdG9yaWdpbjogeyBIcnpuOiBudW1iZXI7IFZydGM6IG51bWJlcjsgfTtcblx0YXV0b0V4cGFuZEVuYWJsZWQ6IGJvb2xlYW47XG5cdGF1dG9OZXN0RW5hYmxlZDogYm9vbGVhbjtcblx0YXV0b1Bvc2l0aW9uRW5hYmxlZDogYm9vbGVhbjtcblx0c2hyaW5rd3JhcE9uU2F2ZUVuYWJsZWQ6IGJvb2xlYW47XG5cdGRvY0RlZmF1bHROZXdBcnRib2FyZEJhY2tncm91bmRDb2xvcjogRGVzY3JpcHRvckNvbG9yO1xuXHRkb2NEZWZhdWx0TmV3QXJ0Ym9hcmRCYWNrZ3JvdW5kVHlwZTogbnVtYmVyO1xufVxuXG5hZGRIYW5kbGVyKFxuXHQnYXJ0ZCcsIC8vIGRvY3VtZW50LXdpZGUgYXJ0Ym9hcmQgaW5mb1xuXHR0YXJnZXQgPT4gKHRhcmdldCBhcyBQc2QpLmFydGJvYXJkcyAhPT0gdW5kZWZpbmVkLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRjb25zdCBkZXNjID0gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcikgYXMgQXJ0ZERlc2NyaXB0b3I7XG5cdFx0KHRhcmdldCBhcyBQc2QpLmFydGJvYXJkcyA9IHtcblx0XHRcdGNvdW50OiBkZXNjWydDbnQgJ10sXG5cdFx0XHRhdXRvRXhwYW5kT2Zmc2V0OiB7IGhvcml6b250YWw6IGRlc2MuYXV0b0V4cGFuZE9mZnNldC5IcnpuLCB2ZXJ0aWNhbDogZGVzYy5hdXRvRXhwYW5kT2Zmc2V0LlZydGMgfSxcblx0XHRcdG9yaWdpbjogeyBob3Jpem9udGFsOiBkZXNjLm9yaWdpbi5IcnpuLCB2ZXJ0aWNhbDogZGVzYy5vcmlnaW4uVnJ0YyB9LFxuXHRcdFx0YXV0b0V4cGFuZEVuYWJsZWQ6IGRlc2MuYXV0b0V4cGFuZEVuYWJsZWQsXG5cdFx0XHRhdXRvTmVzdEVuYWJsZWQ6IGRlc2MuYXV0b05lc3RFbmFibGVkLFxuXHRcdFx0YXV0b1Bvc2l0aW9uRW5hYmxlZDogZGVzYy5hdXRvUG9zaXRpb25FbmFibGVkLFxuXHRcdFx0c2hyaW5rd3JhcE9uU2F2ZUVuYWJsZWQ6IGRlc2Muc2hyaW5rd3JhcE9uU2F2ZUVuYWJsZWQsXG5cdFx0XHRkb2NEZWZhdWx0TmV3QXJ0Ym9hcmRCYWNrZ3JvdW5kQ29sb3I6IHBhcnNlQ29sb3IoZGVzYy5kb2NEZWZhdWx0TmV3QXJ0Ym9hcmRCYWNrZ3JvdW5kQ29sb3IpLFxuXHRcdFx0ZG9jRGVmYXVsdE5ld0FydGJvYXJkQmFja2dyb3VuZFR5cGU6IGRlc2MuZG9jRGVmYXVsdE5ld0FydGJvYXJkQmFja2dyb3VuZFR5cGUsXG5cdFx0fTtcblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGFydGIgPSAodGFyZ2V0IGFzIFBzZCkuYXJ0Ym9hcmRzITtcblx0XHRjb25zdCBkZXNjOiBBcnRkRGVzY3JpcHRvciA9IHtcblx0XHRcdCdDbnQgJzogYXJ0Yi5jb3VudCxcblx0XHRcdGF1dG9FeHBhbmRPZmZzZXQ6IGFydGIuYXV0b0V4cGFuZE9mZnNldCA/IHsgSHJ6bjogYXJ0Yi5hdXRvRXhwYW5kT2Zmc2V0Lmhvcml6b250YWwsIFZydGM6IGFydGIuYXV0b0V4cGFuZE9mZnNldC52ZXJ0aWNhbCB9IDogeyBIcnpuOiAwLCBWcnRjOiAwIH0sXG5cdFx0XHRvcmlnaW46IGFydGIub3JpZ2luID8geyBIcnpuOiBhcnRiLm9yaWdpbi5ob3Jpem9udGFsLCBWcnRjOiBhcnRiLm9yaWdpbi52ZXJ0aWNhbCB9IDogeyBIcnpuOiAwLCBWcnRjOiAwIH0sXG5cdFx0XHRhdXRvRXhwYW5kRW5hYmxlZDogYXJ0Yi5hdXRvRXhwYW5kRW5hYmxlZCA/PyB0cnVlLFxuXHRcdFx0YXV0b05lc3RFbmFibGVkOiBhcnRiLmF1dG9OZXN0RW5hYmxlZCA/PyB0cnVlLFxuXHRcdFx0YXV0b1Bvc2l0aW9uRW5hYmxlZDogYXJ0Yi5hdXRvUG9zaXRpb25FbmFibGVkID8/IHRydWUsXG5cdFx0XHRzaHJpbmt3cmFwT25TYXZlRW5hYmxlZDogYXJ0Yi5zaHJpbmt3cmFwT25TYXZlRW5hYmxlZCA/PyB0cnVlLFxuXHRcdFx0ZG9jRGVmYXVsdE5ld0FydGJvYXJkQmFja2dyb3VuZENvbG9yOiBzZXJpYWxpemVDb2xvcihhcnRiLmRvY0RlZmF1bHROZXdBcnRib2FyZEJhY2tncm91bmRDb2xvciksXG5cdFx0XHRkb2NEZWZhdWx0TmV3QXJ0Ym9hcmRCYWNrZ3JvdW5kVHlwZTogYXJ0Yi5kb2NEZWZhdWx0TmV3QXJ0Ym9hcmRCYWNrZ3JvdW5kVHlwZSA/PyAxLFxuXHRcdH07XG5cdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnbnVsbCcsIGRlc2MsICdhcnRkJyk7XG5cdH0sXG4pO1xuXG5pbnRlcmZhY2UgRWZmZWN0RGVzY3JpcHRvciBleHRlbmRzIFBhcnRpYWw8RGVzY3JpcHRvckdyYWRpZW50Q29udGVudD4sIFBhcnRpYWw8RGVzY3JpcHRvclBhdHRlcm5Db250ZW50PiB7XG5cdGVuYWI/OiBib29sZWFuO1xuXHRTdHlsOiBzdHJpbmc7XG5cdFBudFQ/OiBzdHJpbmc7XG5cdCdNZCAgJz86IHN0cmluZztcblx0T3BjdD86IERlc2NyaXB0b3JVbml0c1ZhbHVlO1xuXHQnU3ogICc/OiBEZXNjcmlwdG9yVW5pdHNWYWx1ZTtcblx0J0NsciAnPzogRGVzY3JpcHRvckNvbG9yO1xuXHRwcmVzZW50PzogYm9vbGVhbjtcblx0c2hvd0luRGlhbG9nPzogYm9vbGVhbjtcblx0b3ZlcnByaW50PzogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIExmeDJEZXNjcmlwdG9yIHtcblx0J1NjbCAnPzogRGVzY3JpcHRvclVuaXRzVmFsdWU7XG5cdG1hc3RlckZYU3dpdGNoPzogYm9vbGVhbjtcblx0RHJTaD86IEVmZmVjdERlc2NyaXB0b3I7XG5cdElyU2g/OiBFZmZlY3REZXNjcmlwdG9yO1xuXHRPckdsPzogRWZmZWN0RGVzY3JpcHRvcjtcblx0SXJHbD86IEVmZmVjdERlc2NyaXB0b3I7XG5cdGViYmw/OiBFZmZlY3REZXNjcmlwdG9yO1xuXHRTb0ZpPzogRWZmZWN0RGVzY3JpcHRvcjtcblx0cGF0dGVybkZpbGw/OiBFZmZlY3REZXNjcmlwdG9yO1xuXHRHckZsPzogRWZmZWN0RGVzY3JpcHRvcjtcblx0Q2hGWD86IEVmZmVjdERlc2NyaXB0b3I7XG5cdEZyRlg/OiBFZmZlY3REZXNjcmlwdG9yO1xufVxuXG5pbnRlcmZhY2UgTG1meERlc2NyaXB0b3Ige1xuXHQnU2NsICc/OiBEZXNjcmlwdG9yVW5pdHNWYWx1ZTtcblx0bWFzdGVyRlhTd2l0Y2g/OiBib29sZWFuO1xuXHRudW1Nb2RpZnlpbmdGWD86IG51bWJlcjtcblx0T3JHbD86IEVmZmVjdERlc2NyaXB0b3I7XG5cdElyR2w/OiBFZmZlY3REZXNjcmlwdG9yO1xuXHRlYmJsPzogRWZmZWN0RGVzY3JpcHRvcjtcblx0Q2hGWD86IEVmZmVjdERlc2NyaXB0b3I7XG5cdGRyb3BTaGFkb3dNdWx0aT86IEVmZmVjdERlc2NyaXB0b3JbXTtcblx0aW5uZXJTaGFkb3dNdWx0aT86IEVmZmVjdERlc2NyaXB0b3JbXTtcblx0c29saWRGaWxsTXVsdGk/OiBFZmZlY3REZXNjcmlwdG9yW107XG5cdGdyYWRpZW50RmlsbE11bHRpPzogRWZmZWN0RGVzY3JpcHRvcltdO1xuXHRmcmFtZUZYTXVsdGk/OiBFZmZlY3REZXNjcmlwdG9yW107XG5cdHBhdHRlcm5GaWxsPzogRWZmZWN0RGVzY3JpcHRvcjsgLy8gPz8/XG59XG5cbmZ1bmN0aW9uIHBhcnNlRnhPYmplY3QoZng6IEVmZmVjdERlc2NyaXB0b3IpIHtcblx0Y29uc3Qgc3Ryb2tlOiBMYXllckVmZmVjdFN0cm9rZSA9IHtcblx0XHRlbmFibGVkOiAhIWZ4LmVuYWIsXG5cdFx0cG9zaXRpb246IEZTdGwuZGVjb2RlKGZ4LlN0eWwpLFxuXHRcdGZpbGxUeXBlOiBGckZsLmRlY29kZShmeC5QbnRUISksXG5cdFx0YmxlbmRNb2RlOiBCbG5NLmRlY29kZShmeFsnTWQgICddISksXG5cdFx0b3BhY2l0eTogcGFyc2VQZXJjZW50KGZ4Lk9wY3QpLFxuXHRcdHNpemU6IHBhcnNlVW5pdHMoZnhbJ1N6ICAnXSEpLFxuXHR9O1xuXG5cdGlmIChmeC5wcmVzZW50ICE9PSB1bmRlZmluZWQpIHN0cm9rZS5wcmVzZW50ID0gZngucHJlc2VudDtcblx0aWYgKGZ4LnNob3dJbkRpYWxvZyAhPT0gdW5kZWZpbmVkKSBzdHJva2Uuc2hvd0luRGlhbG9nID0gZnguc2hvd0luRGlhbG9nO1xuXHRpZiAoZngub3ZlcnByaW50ICE9PSB1bmRlZmluZWQpIHN0cm9rZS5vdmVycHJpbnQgPSBmeC5vdmVycHJpbnQ7XG5cdGlmIChmeFsnQ2xyICddKSBzdHJva2UuY29sb3IgPSBwYXJzZUNvbG9yKGZ4WydDbHIgJ10pO1xuXHRpZiAoZnguR3JhZCkgc3Ryb2tlLmdyYWRpZW50ID0gcGFyc2VHcmFkaWVudENvbnRlbnQoZnggYXMgYW55KTtcblx0aWYgKGZ4LlB0cm4pIHN0cm9rZS5wYXR0ZXJuID0gcGFyc2VQYXR0ZXJuQ29udGVudChmeCBhcyBhbnkpO1xuXG5cdHJldHVybiBzdHJva2U7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZUZ4T2JqZWN0KHN0cm9rZTogTGF5ZXJFZmZlY3RTdHJva2UpIHtcblx0bGV0IEZyRlg6IEVmZmVjdERlc2NyaXB0b3IgPSB7fSBhcyBhbnk7XG5cdEZyRlguZW5hYiA9ICEhc3Ryb2tlLmVuYWJsZWQ7XG5cdGlmIChzdHJva2UucHJlc2VudCAhPT0gdW5kZWZpbmVkKSBGckZYLnByZXNlbnQgPSAhIXN0cm9rZS5wcmVzZW50O1xuXHRpZiAoc3Ryb2tlLnNob3dJbkRpYWxvZyAhPT0gdW5kZWZpbmVkKSBGckZYLnNob3dJbkRpYWxvZyA9ICEhc3Ryb2tlLnNob3dJbkRpYWxvZztcblx0RnJGWC5TdHlsID0gRlN0bC5lbmNvZGUoc3Ryb2tlLnBvc2l0aW9uKTtcblx0RnJGWC5QbnRUID0gRnJGbC5lbmNvZGUoc3Ryb2tlLmZpbGxUeXBlKTtcblx0RnJGWFsnTWQgICddID0gQmxuTS5lbmNvZGUoc3Ryb2tlLmJsZW5kTW9kZSk7XG5cdEZyRlguT3BjdCA9IHVuaXRzUGVyY2VudChzdHJva2Uub3BhY2l0eSk7XG5cdEZyRlhbJ1N6ICAnXSA9IHVuaXRzVmFsdWUoc3Ryb2tlLnNpemUsICdzaXplJyk7XG5cdGlmIChzdHJva2UuY29sb3IpIEZyRlhbJ0NsciAnXSA9IHNlcmlhbGl6ZUNvbG9yKHN0cm9rZS5jb2xvcik7XG5cdGlmIChzdHJva2UuZ3JhZGllbnQpIEZyRlggPSB7IC4uLkZyRlgsIC4uLnNlcmlhbGl6ZUdyYWRpZW50Q29udGVudChzdHJva2UuZ3JhZGllbnQpIH07XG5cdGlmIChzdHJva2UucGF0dGVybikgRnJGWCA9IHsgLi4uRnJGWCwgLi4uc2VyaWFsaXplUGF0dGVybkNvbnRlbnQoc3Ryb2tlLnBhdHRlcm4pIH07XG5cdGlmIChzdHJva2Uub3ZlcnByaW50ICE9PSB1bmRlZmluZWQpIEZyRlgub3ZlcnByaW50ID0gISFzdHJva2Uub3ZlcnByaW50O1xuXHRyZXR1cm4gRnJGWDtcbn1cblxuZnVuY3Rpb24gcGFyc2VFZmZlY3RzKGluZm86IExmeDJEZXNjcmlwdG9yICYgTG1meERlc2NyaXB0b3IsIGxvZzogYm9vbGVhbikge1xuXHRjb25zdCBlZmZlY3RzOiBMYXllckVmZmVjdHNJbmZvID0ge307XG5cdGlmICghaW5mby5tYXN0ZXJGWFN3aXRjaCkgZWZmZWN0cy5kaXNhYmxlZCA9IHRydWU7XG5cdGlmIChpbmZvWydTY2wgJ10pIGVmZmVjdHMuc2NhbGUgPSBwYXJzZVBlcmNlbnQoaW5mb1snU2NsICddKTtcblx0aWYgKGluZm8uRHJTaCkgZWZmZWN0cy5kcm9wU2hhZG93ID0gW3BhcnNlRWZmZWN0T2JqZWN0KGluZm8uRHJTaCwgbG9nKV07XG5cdGlmIChpbmZvLmRyb3BTaGFkb3dNdWx0aSkgZWZmZWN0cy5kcm9wU2hhZG93ID0gaW5mby5kcm9wU2hhZG93TXVsdGkubWFwKGkgPT4gcGFyc2VFZmZlY3RPYmplY3QoaSwgbG9nKSk7XG5cdGlmIChpbmZvLklyU2gpIGVmZmVjdHMuaW5uZXJTaGFkb3cgPSBbcGFyc2VFZmZlY3RPYmplY3QoaW5mby5JclNoLCBsb2cpXTtcblx0aWYgKGluZm8uaW5uZXJTaGFkb3dNdWx0aSkgZWZmZWN0cy5pbm5lclNoYWRvdyA9IGluZm8uaW5uZXJTaGFkb3dNdWx0aS5tYXAoaSA9PiBwYXJzZUVmZmVjdE9iamVjdChpLCBsb2cpKTtcblx0aWYgKGluZm8uT3JHbCkgZWZmZWN0cy5vdXRlckdsb3cgPSBwYXJzZUVmZmVjdE9iamVjdChpbmZvLk9yR2wsIGxvZyk7XG5cdGlmIChpbmZvLklyR2wpIGVmZmVjdHMuaW5uZXJHbG93ID0gcGFyc2VFZmZlY3RPYmplY3QoaW5mby5JckdsLCBsb2cpO1xuXHRpZiAoaW5mby5lYmJsKSBlZmZlY3RzLmJldmVsID0gcGFyc2VFZmZlY3RPYmplY3QoaW5mby5lYmJsLCBsb2cpO1xuXHRpZiAoaW5mby5Tb0ZpKSBlZmZlY3RzLnNvbGlkRmlsbCA9IFtwYXJzZUVmZmVjdE9iamVjdChpbmZvLlNvRmksIGxvZyldO1xuXHRpZiAoaW5mby5zb2xpZEZpbGxNdWx0aSkgZWZmZWN0cy5zb2xpZEZpbGwgPSBpbmZvLnNvbGlkRmlsbE11bHRpLm1hcChpID0+IHBhcnNlRWZmZWN0T2JqZWN0KGksIGxvZykpO1xuXHRpZiAoaW5mby5wYXR0ZXJuRmlsbCkgZWZmZWN0cy5wYXR0ZXJuT3ZlcmxheSA9IHBhcnNlRWZmZWN0T2JqZWN0KGluZm8ucGF0dGVybkZpbGwsIGxvZyk7XG5cdGlmIChpbmZvLkdyRmwpIGVmZmVjdHMuZ3JhZGllbnRPdmVybGF5ID0gW3BhcnNlRWZmZWN0T2JqZWN0KGluZm8uR3JGbCwgbG9nKV07XG5cdGlmIChpbmZvLmdyYWRpZW50RmlsbE11bHRpKSBlZmZlY3RzLmdyYWRpZW50T3ZlcmxheSA9IGluZm8uZ3JhZGllbnRGaWxsTXVsdGkubWFwKGkgPT4gcGFyc2VFZmZlY3RPYmplY3QoaSwgbG9nKSk7XG5cdGlmIChpbmZvLkNoRlgpIGVmZmVjdHMuc2F0aW4gPSBwYXJzZUVmZmVjdE9iamVjdChpbmZvLkNoRlgsIGxvZyk7XG5cdGlmIChpbmZvLkZyRlgpIGVmZmVjdHMuc3Ryb2tlID0gW3BhcnNlRnhPYmplY3QoaW5mby5GckZYKV07XG5cdGlmIChpbmZvLmZyYW1lRlhNdWx0aSkgZWZmZWN0cy5zdHJva2UgPSBpbmZvLmZyYW1lRlhNdWx0aS5tYXAoaSA9PiBwYXJzZUZ4T2JqZWN0KGkpKTtcblx0cmV0dXJuIGVmZmVjdHM7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZUVmZmVjdHMoZTogTGF5ZXJFZmZlY3RzSW5mbywgbG9nOiBib29sZWFuLCBtdWx0aTogYm9vbGVhbikge1xuXHRjb25zdCBpbmZvOiBMZngyRGVzY3JpcHRvciAmIExtZnhEZXNjcmlwdG9yID0gbXVsdGkgPyB7XG5cdFx0J1NjbCAnOiB1bml0c1BlcmNlbnQoZS5zY2FsZSA/PyAxKSxcblx0XHRtYXN0ZXJGWFN3aXRjaDogIWUuZGlzYWJsZWQsXG5cdH0gOiB7XG5cdFx0bWFzdGVyRlhTd2l0Y2g6ICFlLmRpc2FibGVkLFxuXHRcdCdTY2wgJzogdW5pdHNQZXJjZW50KGUuc2NhbGUgPz8gMSksXG5cdH07XG5cblx0Y29uc3QgYXJyYXlLZXlzOiAoa2V5b2YgTGF5ZXJFZmZlY3RzSW5mbylbXSA9IFsnZHJvcFNoYWRvdycsICdpbm5lclNoYWRvdycsICdzb2xpZEZpbGwnLCAnZ3JhZGllbnRPdmVybGF5JywgJ3N0cm9rZSddO1xuXHRmb3IgKGNvbnN0IGtleSBvZiBhcnJheUtleXMpIHtcblx0XHRpZiAoZVtrZXldICYmICFBcnJheS5pc0FycmF5KGVba2V5XSkpIHRocm93IG5ldyBFcnJvcihgJHtrZXl9IHNob3VsZCBiZSBhbiBhcnJheWApO1xuXHR9XG5cblx0aWYgKGUuZHJvcFNoYWRvdz8uWzBdICYmICFtdWx0aSkgaW5mby5EclNoID0gc2VyaWFsaXplRWZmZWN0T2JqZWN0KGUuZHJvcFNoYWRvd1swXSwgJ2Ryb3BTaGFkb3cnLCBsb2cpO1xuXHRpZiAoZS5kcm9wU2hhZG93Py5bMF0gJiYgbXVsdGkpIGluZm8uZHJvcFNoYWRvd011bHRpID0gZS5kcm9wU2hhZG93Lm1hcChpID0+IHNlcmlhbGl6ZUVmZmVjdE9iamVjdChpLCAnZHJvcFNoYWRvdycsIGxvZykpO1xuXHRpZiAoZS5pbm5lclNoYWRvdz8uWzBdICYmICFtdWx0aSkgaW5mby5JclNoID0gc2VyaWFsaXplRWZmZWN0T2JqZWN0KGUuaW5uZXJTaGFkb3dbMF0sICdpbm5lclNoYWRvdycsIGxvZyk7XG5cdGlmIChlLmlubmVyU2hhZG93Py5bMF0gJiYgbXVsdGkpIGluZm8uaW5uZXJTaGFkb3dNdWx0aSA9IGUuaW5uZXJTaGFkb3cubWFwKGkgPT4gc2VyaWFsaXplRWZmZWN0T2JqZWN0KGksICdpbm5lclNoYWRvdycsIGxvZykpO1xuXHRpZiAoZS5vdXRlckdsb3cpIGluZm8uT3JHbCA9IHNlcmlhbGl6ZUVmZmVjdE9iamVjdChlLm91dGVyR2xvdywgJ291dGVyR2xvdycsIGxvZyk7XG5cdGlmIChlLnNvbGlkRmlsbD8uWzBdICYmIG11bHRpKSBpbmZvLnNvbGlkRmlsbE11bHRpID0gZS5zb2xpZEZpbGwubWFwKGkgPT4gc2VyaWFsaXplRWZmZWN0T2JqZWN0KGksICdzb2xpZEZpbGwnLCBsb2cpKTtcblx0aWYgKGUuZ3JhZGllbnRPdmVybGF5Py5bMF0gJiYgbXVsdGkpIGluZm8uZ3JhZGllbnRGaWxsTXVsdGkgPSBlLmdyYWRpZW50T3ZlcmxheS5tYXAoaSA9PiBzZXJpYWxpemVFZmZlY3RPYmplY3QoaSwgJ2dyYWRpZW50T3ZlcmxheScsIGxvZykpO1xuXHRpZiAoZS5zdHJva2U/LlswXSAmJiBtdWx0aSkgaW5mby5mcmFtZUZYTXVsdGkgPSBlLnN0cm9rZS5tYXAoaSA9PiBzZXJpYWxpemVGeE9iamVjdChpKSk7XG5cdGlmIChlLmlubmVyR2xvdykgaW5mby5JckdsID0gc2VyaWFsaXplRWZmZWN0T2JqZWN0KGUuaW5uZXJHbG93LCAnaW5uZXJHbG93JywgbG9nKTtcblx0aWYgKGUuYmV2ZWwpIGluZm8uZWJibCA9IHNlcmlhbGl6ZUVmZmVjdE9iamVjdChlLmJldmVsLCAnYmV2ZWwnLCBsb2cpO1xuXHRpZiAoZS5zb2xpZEZpbGw/LlswXSAmJiAhbXVsdGkpIGluZm8uU29GaSA9IHNlcmlhbGl6ZUVmZmVjdE9iamVjdChlLnNvbGlkRmlsbFswXSwgJ3NvbGlkRmlsbCcsIGxvZyk7XG5cdGlmIChlLnBhdHRlcm5PdmVybGF5KSBpbmZvLnBhdHRlcm5GaWxsID0gc2VyaWFsaXplRWZmZWN0T2JqZWN0KGUucGF0dGVybk92ZXJsYXksICdwYXR0ZXJuT3ZlcmxheScsIGxvZyk7XG5cdGlmIChlLmdyYWRpZW50T3ZlcmxheT8uWzBdICYmICFtdWx0aSkgaW5mby5HckZsID0gc2VyaWFsaXplRWZmZWN0T2JqZWN0KGUuZ3JhZGllbnRPdmVybGF5WzBdLCAnZ3JhZGllbnRPdmVybGF5JywgbG9nKTtcblx0aWYgKGUuc2F0aW4pIGluZm8uQ2hGWCA9IHNlcmlhbGl6ZUVmZmVjdE9iamVjdChlLnNhdGluLCAnc2F0aW4nLCBsb2cpO1xuXHRpZiAoZS5zdHJva2U/LlswXSAmJiAhbXVsdGkpIGluZm8uRnJGWCA9IHNlcmlhbGl6ZUZ4T2JqZWN0KGUuc3Ryb2tlPy5bMF0pO1xuXG5cdGlmIChtdWx0aSkge1xuXHRcdGluZm8ubnVtTW9kaWZ5aW5nRlggPSAwO1xuXG5cdFx0Zm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoZSkpIHtcblx0XHRcdGNvbnN0IHZhbHVlID0gKGUgYXMgYW55KVtrZXldO1xuXHRcdFx0aWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG5cdFx0XHRcdGZvciAoY29uc3QgZWZmZWN0IG9mIHZhbHVlKSB7XG5cdFx0XHRcdFx0aWYgKGVmZmVjdC5lbmFibGVkKSBpbmZvLm51bU1vZGlmeWluZ0ZYKys7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gaW5mbztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc011bHRpRWZmZWN0cyhlZmZlY3RzOiBMYXllckVmZmVjdHNJbmZvKSB7XG5cdHJldHVybiBPYmplY3Qua2V5cyhlZmZlY3RzKS5tYXAoa2V5ID0+IChlZmZlY3RzIGFzIGFueSlba2V5XSkuc29tZSh2ID0+IEFycmF5LmlzQXJyYXkodikgJiYgdi5sZW5ndGggPiAxKTtcbn1cblxuYWRkSGFuZGxlcihcblx0J2xmeDInLFxuXHR0YXJnZXQgPT4gdGFyZ2V0LmVmZmVjdHMgIT09IHVuZGVmaW5lZCAmJiAhaGFzTXVsdGlFZmZlY3RzKHRhcmdldC5lZmZlY3RzKSxcblx0KHJlYWRlciwgdGFyZ2V0LCBsZWZ0LCBfLCBvcHRpb25zKSA9PiB7XG5cdFx0Y29uc3QgdmVyc2lvbiA9IHJlYWRVaW50MzIocmVhZGVyKTtcblx0XHRpZiAodmVyc2lvbiAhPT0gMCkgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGxmeDIgdmVyc2lvbmApO1xuXG5cdFx0Y29uc3QgZGVzYzogTGZ4MkRlc2NyaXB0b3IgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKTtcblx0XHQvLyBjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChkZXNjLCBmYWxzZSwgOTksIHRydWUpKTtcblxuXHRcdC8vIFRPRE86IGRvbid0IGRpc2NhcmQgaWYgd2UgZ290IGl0IGZyb20gbG1meFxuXHRcdC8vIGRpc2NhcmQgaWYgcmVhZCBpbiAnbHJGWCcgc2VjdGlvblxuXHRcdHRhcmdldC5lZmZlY3RzID0gcGFyc2VFZmZlY3RzKGRlc2MsICEhb3B0aW9ucy5sb2dNaXNzaW5nRmVhdHVyZXMpO1xuXG5cdFx0c2tpcEJ5dGVzKHJlYWRlciwgbGVmdCgpKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0LCBfLCBvcHRpb25zKSA9PiB7XG5cdFx0Y29uc3QgZGVzYyA9IHNlcmlhbGl6ZUVmZmVjdHModGFyZ2V0LmVmZmVjdHMhLCAhIW9wdGlvbnMubG9nTWlzc2luZ0ZlYXR1cmVzLCBmYWxzZSk7XG5cdFx0Ly8gY29uc29sZS5sb2cocmVxdWlyZSgndXRpbCcpLmluc3BlY3QoZGVzYywgZmFsc2UsIDk5LCB0cnVlKSk7XG5cblx0XHR3cml0ZVVpbnQzMih3cml0ZXIsIDApOyAvLyB2ZXJzaW9uXG5cdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnbnVsbCcsIGRlc2MpO1xuXHR9LFxuKTtcblxuaW50ZXJmYWNlIENpbmZEZXNjcmlwdG9yIHtcblx0VnJzbjogeyBtYWpvcjogbnVtYmVyOyBtaW5vcjogbnVtYmVyOyBmaXg6IG51bWJlcjsgfTtcblx0cHNWZXJzaW9uPzogeyBtYWpvcjogbnVtYmVyOyBtaW5vcjogbnVtYmVyOyBmaXg6IG51bWJlcjsgfTtcblx0ZGVzY3JpcHRpb246IHN0cmluZztcblx0cmVhc29uOiBzdHJpbmc7XG5cdEVuZ246IHN0cmluZzsgLy8gJ0VuZ24uY29tcENvcmUnO1xuXHRlbmFibGVDb21wQ29yZTogc3RyaW5nOyAvLyAnZW5hYmxlLmZlYXR1cmUnO1xuXHRlbmFibGVDb21wQ29yZUdQVTogc3RyaW5nOyAvLyAnZW5hYmxlLmZlYXR1cmUnO1xuXHRlbmFibGVDb21wQ29yZVRocmVhZHM/OiBzdHJpbmc7IC8vICdlbmFibGUuZmVhdHVyZSc7XG5cdGNvbXBDb3JlU3VwcG9ydDogc3RyaW5nOyAvLyAncmVhc29uLnN1cHBvcnRlZCc7XG5cdGNvbXBDb3JlR1BVU3VwcG9ydDogc3RyaW5nOyAvLyAncmVhc29uLmZlYXR1cmVEaXNhYmxlZCc7XG59XG5cbmFkZEhhbmRsZXIoXG5cdCdjaW5mJyxcblx0aGFzS2V5KCdjb21wb3NpdG9yVXNlZCcpLFxuXHQocmVhZGVyLCB0YXJnZXQsIGxlZnQpID0+IHtcblx0XHRjb25zdCBkZXNjID0gcmVhZFZlcnNpb25BbmREZXNjcmlwdG9yKHJlYWRlcikgYXMgQ2luZkRlc2NyaXB0b3I7XG5cdFx0Ly8gY29uc29sZS5sb2cocmVxdWlyZSgndXRpbCcpLmluc3BlY3QoZGVzYywgZmFsc2UsIDk5LCB0cnVlKSk7XG5cblx0XHR0YXJnZXQuY29tcG9zaXRvclVzZWQgPSB7XG5cdFx0XHRkZXNjcmlwdGlvbjogZGVzYy5kZXNjcmlwdGlvbixcblx0XHRcdHJlYXNvbjogZGVzYy5yZWFzb24sXG5cdFx0XHRlbmdpbmU6IGRlc2MuRW5nbi5zcGxpdCgnLicpWzFdLFxuXHRcdFx0ZW5hYmxlQ29tcENvcmU6IGRlc2MuZW5hYmxlQ29tcENvcmUuc3BsaXQoJy4nKVsxXSxcblx0XHRcdGVuYWJsZUNvbXBDb3JlR1BVOiBkZXNjLmVuYWJsZUNvbXBDb3JlR1BVLnNwbGl0KCcuJylbMV0sXG5cdFx0XHRjb21wQ29yZVN1cHBvcnQ6IGRlc2MuY29tcENvcmVTdXBwb3J0LnNwbGl0KCcuJylbMV0sXG5cdFx0XHRjb21wQ29yZUdQVVN1cHBvcnQ6IGRlc2MuY29tcENvcmVHUFVTdXBwb3J0LnNwbGl0KCcuJylbMV0sXG5cdFx0fTtcblxuXHRcdHNraXBCeXRlcyhyZWFkZXIsIGxlZnQoKSk7XG5cdH0sXG5cdCh3cml0ZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGNpbmYgPSB0YXJnZXQuY29tcG9zaXRvclVzZWQhO1xuXHRcdGNvbnN0IGRlc2M6IENpbmZEZXNjcmlwdG9yID0ge1xuXHRcdFx0VnJzbjogeyBtYWpvcjogMSwgbWlub3I6IDAsIGZpeDogMCB9LCAvLyBURU1QXG5cdFx0XHQvLyBwc1ZlcnNpb246IHsgbWFqb3I6IDIyLCBtaW5vcjogMywgZml4OiAxIH0sIC8vIFRFU1RJTkdcblx0XHRcdGRlc2NyaXB0aW9uOiBjaW5mLmRlc2NyaXB0aW9uLFxuXHRcdFx0cmVhc29uOiBjaW5mLnJlYXNvbixcblx0XHRcdEVuZ246IGBFbmduLiR7Y2luZi5lbmdpbmV9YCxcblx0XHRcdGVuYWJsZUNvbXBDb3JlOiBgZW5hYmxlLiR7Y2luZi5lbmFibGVDb21wQ29yZX1gLFxuXHRcdFx0ZW5hYmxlQ29tcENvcmVHUFU6IGBlbmFibGUuJHtjaW5mLmVuYWJsZUNvbXBDb3JlR1BVfWAsXG5cdFx0XHQvLyBlbmFibGVDb21wQ29yZVRocmVhZHM6IGBlbmFibGUuZmVhdHVyZWAsIC8vIFRFU1RJTkdcblx0XHRcdGNvbXBDb3JlU3VwcG9ydDogYHJlYXNvbi4ke2NpbmYuY29tcENvcmVTdXBwb3J0fWAsXG5cdFx0XHRjb21wQ29yZUdQVVN1cHBvcnQ6IGByZWFzb24uJHtjaW5mLmNvbXBDb3JlR1BVU3VwcG9ydH1gLFxuXHRcdH07XG5cdFx0d3JpdGVWZXJzaW9uQW5kRGVzY3JpcHRvcih3cml0ZXIsICcnLCAnbnVsbCcsIGRlc2MpO1xuXHR9LFxuKTtcblxuLy8gZXh0ZW5zaW9uIHNldHRpbmdzID8sIGlnbm9yZSBpdFxuYWRkSGFuZGxlcihcblx0J2V4dG4nLFxuXHR0YXJnZXQgPT4gKHRhcmdldCBhcyBhbnkpLl9leHRuICE9PSB1bmRlZmluZWQsXG5cdChyZWFkZXIsIHRhcmdldCkgPT4ge1xuXHRcdGNvbnN0IGRlc2M6IEV4dGVuc2lvbkRlc2MgPSByZWFkVmVyc2lvbkFuZERlc2NyaXB0b3IocmVhZGVyKTtcblx0XHQvLyBjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChkZXNjLCBmYWxzZSwgOTksIHRydWUpKTtcblxuXHRcdGlmIChNT0NLX0hBTkRMRVJTKSAodGFyZ2V0IGFzIGFueSkuX2V4dG4gPSBkZXNjO1xuXHR9LFxuXHQod3JpdGVyLCB0YXJnZXQpID0+IHtcblx0XHQvLyBUT0RPOiBuZWVkIHRvIGFkZCBjb3JyZWN0IHR5cGVzIGZvciBkZXNjIGZpZWxkcyAocmVzb3VyY2VzL3NyYy5wc2QpXG5cdFx0aWYgKE1PQ0tfSEFORExFUlMpIHdyaXRlVmVyc2lvbkFuZERlc2NyaXB0b3Iod3JpdGVyLCAnJywgJ251bGwnLCAodGFyZ2V0IGFzIGFueSkuX2V4dG4pO1xuXHR9LFxuKTtcblxuYWRkSGFuZGxlcihcblx0J2lPcGEnLFxuXHRoYXNLZXkoJ2ZpbGxPcGFjaXR5JyksXG5cdChyZWFkZXIsIHRhcmdldCkgPT4ge1xuXHRcdHRhcmdldC5maWxsT3BhY2l0eSA9IHJlYWRVaW50OChyZWFkZXIpIC8gMHhmZjtcblx0XHRza2lwQnl0ZXMocmVhZGVyLCAzKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVVaW50OCh3cml0ZXIsIHRhcmdldC5maWxsT3BhY2l0eSEgKiAweGZmKTtcblx0XHR3cml0ZVplcm9zKHdyaXRlciwgMyk7XG5cdH0sXG4pO1xuXG5hZGRIYW5kbGVyKFxuXHQndHNseScsXG5cdGhhc0tleSgndHJhbnNwYXJlbmN5U2hhcGVzTGF5ZXInKSxcblx0KHJlYWRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0dGFyZ2V0LnRyYW5zcGFyZW5jeVNoYXBlc0xheWVyID0gISFyZWFkVWludDgocmVhZGVyKTtcblx0XHRza2lwQnl0ZXMocmVhZGVyLCAzKTtcblx0fSxcblx0KHdyaXRlciwgdGFyZ2V0KSA9PiB7XG5cdFx0d3JpdGVVaW50OCh3cml0ZXIsIHRhcmdldC50cmFuc3BhcmVuY3lTaGFwZXNMYXllciA/IDEgOiAwKTtcblx0XHR3cml0ZVplcm9zKHdyaXRlciwgMyk7XG5cdH0sXG4pO1xuXG4vLyBkZXNjcmlwdG9yIGhlbHBlcnNcblxuZnVuY3Rpb24gcGFyc2VHcmFkaWVudChncmFkOiBEZXNjaXB0b3JHcmFkaWVudCk6IEVmZmVjdFNvbGlkR3JhZGllbnQgfCBFZmZlY3ROb2lzZUdyYWRpZW50IHtcblx0aWYgKGdyYWQuR3JkRiA9PT0gJ0dyZEYuQ3N0UycpIHtcblx0XHRjb25zdCBzYW1wbGVzOiBudW1iZXIgPSBncmFkLkludHIgfHwgNDA5NjtcblxuXHRcdHJldHVybiB7XG5cdFx0XHR0eXBlOiAnc29saWQnLFxuXHRcdFx0bmFtZTogZ3JhZFsnTm0gICddLFxuXHRcdFx0c21vb3RobmVzczogZ3JhZC5JbnRyIC8gNDA5Nixcblx0XHRcdGNvbG9yU3RvcHM6IGdyYWQuQ2xycy5tYXAocyA9PiAoe1xuXHRcdFx0XHRjb2xvcjogcGFyc2VDb2xvcihzWydDbHIgJ10pLFxuXHRcdFx0XHRsb2NhdGlvbjogcy5MY3RuIC8gc2FtcGxlcyxcblx0XHRcdFx0bWlkcG9pbnQ6IHMuTWRwbiAvIDEwMCxcblx0XHRcdH0pKSxcblx0XHRcdG9wYWNpdHlTdG9wczogZ3JhZC5Ucm5zLm1hcChzID0+ICh7XG5cdFx0XHRcdG9wYWNpdHk6IHBhcnNlUGVyY2VudChzLk9wY3QpLFxuXHRcdFx0XHRsb2NhdGlvbjogcy5MY3RuIC8gc2FtcGxlcyxcblx0XHRcdFx0bWlkcG9pbnQ6IHMuTWRwbiAvIDEwMCxcblx0XHRcdH0pKSxcblx0XHR9O1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0eXBlOiAnbm9pc2UnLFxuXHRcdFx0bmFtZTogZ3JhZFsnTm0gICddLFxuXHRcdFx0cm91Z2huZXNzOiBncmFkLlNtdGggLyA0MDk2LFxuXHRcdFx0Y29sb3JNb2RlbDogQ2xyUy5kZWNvZGUoZ3JhZC5DbHJTKSxcblx0XHRcdHJhbmRvbVNlZWQ6IGdyYWQuUm5kUyxcblx0XHRcdHJlc3RyaWN0Q29sb3JzOiAhIWdyYWQuVmN0Qyxcblx0XHRcdGFkZFRyYW5zcGFyZW5jeTogISFncmFkLlNoVHIsXG5cdFx0XHRtaW46IGdyYWRbJ01ubSAnXS5tYXAoeCA9PiB4IC8gMTAwKSxcblx0XHRcdG1heDogZ3JhZFsnTXhtICddLm1hcCh4ID0+IHggLyAxMDApLFxuXHRcdH07XG5cdH1cbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplR3JhZGllbnQoZ3JhZDogRWZmZWN0U29saWRHcmFkaWVudCB8IEVmZmVjdE5vaXNlR3JhZGllbnQpOiBEZXNjaXB0b3JHcmFkaWVudCB7XG5cdGlmIChncmFkLnR5cGUgPT09ICdzb2xpZCcpIHtcblx0XHRjb25zdCBzYW1wbGVzID0gTWF0aC5yb3VuZCgoZ3JhZC5zbW9vdGhuZXNzID8/IDEpICogNDA5Nik7XG5cdFx0cmV0dXJuIHtcblx0XHRcdCdObSAgJzogZ3JhZC5uYW1lIHx8ICcnLFxuXHRcdFx0R3JkRjogJ0dyZEYuQ3N0UycsXG5cdFx0XHRJbnRyOiBzYW1wbGVzLFxuXHRcdFx0Q2xyczogZ3JhZC5jb2xvclN0b3BzLm1hcChzID0+ICh7XG5cdFx0XHRcdCdDbHIgJzogc2VyaWFsaXplQ29sb3Iocy5jb2xvciksXG5cdFx0XHRcdFR5cGU6ICdDbHJ5LlVzclMnLFxuXHRcdFx0XHRMY3RuOiBNYXRoLnJvdW5kKHMubG9jYXRpb24gKiBzYW1wbGVzKSxcblx0XHRcdFx0TWRwbjogTWF0aC5yb3VuZCgocy5taWRwb2ludCA/PyAwLjUpICogMTAwKSxcblx0XHRcdH0pKSxcblx0XHRcdFRybnM6IGdyYWQub3BhY2l0eVN0b3BzLm1hcChzID0+ICh7XG5cdFx0XHRcdE9wY3Q6IHVuaXRzUGVyY2VudChzLm9wYWNpdHkpLFxuXHRcdFx0XHRMY3RuOiBNYXRoLnJvdW5kKHMubG9jYXRpb24gKiBzYW1wbGVzKSxcblx0XHRcdFx0TWRwbjogTWF0aC5yb3VuZCgocy5taWRwb2ludCA/PyAwLjUpICogMTAwKSxcblx0XHRcdH0pKSxcblx0XHR9O1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiB7XG5cdFx0XHRHcmRGOiAnR3JkRi5DbE5zJyxcblx0XHRcdCdObSAgJzogZ3JhZC5uYW1lIHx8ICcnLFxuXHRcdFx0U2hUcjogISFncmFkLmFkZFRyYW5zcGFyZW5jeSxcblx0XHRcdFZjdEM6ICEhZ3JhZC5yZXN0cmljdENvbG9ycyxcblx0XHRcdENsclM6IENsclMuZW5jb2RlKGdyYWQuY29sb3JNb2RlbCksXG5cdFx0XHRSbmRTOiBncmFkLnJhbmRvbVNlZWQgfHwgMCxcblx0XHRcdFNtdGg6IE1hdGgucm91bmQoKGdyYWQucm91Z2huZXNzID8/IDEpICogNDA5NiksXG5cdFx0XHQnTW5tICc6IChncmFkLm1pbiB8fCBbMCwgMCwgMCwgMF0pLm1hcCh4ID0+IHggKiAxMDApLFxuXHRcdFx0J014bSAnOiAoZ3JhZC5tYXggfHwgWzEsIDEsIDEsIDFdKS5tYXAoeCA9PiB4ICogMTAwKSxcblx0XHR9O1xuXHR9XG59XG5cbmZ1bmN0aW9uIHBhcnNlR3JhZGllbnRDb250ZW50KGRlc2NyaXB0b3I6IERlc2NyaXB0b3JHcmFkaWVudENvbnRlbnQpIHtcblx0Y29uc3QgcmVzdWx0ID0gcGFyc2VHcmFkaWVudChkZXNjcmlwdG9yLkdyYWQpIGFzIChFZmZlY3RTb2xpZEdyYWRpZW50IHwgRWZmZWN0Tm9pc2VHcmFkaWVudCkgJiBFeHRyYUdyYWRpZW50SW5mbztcblx0cmVzdWx0LnN0eWxlID0gR3JkVC5kZWNvZGUoZGVzY3JpcHRvci5UeXBlKTtcblx0aWYgKGRlc2NyaXB0b3IuRHRociAhPT0gdW5kZWZpbmVkKSByZXN1bHQuZGl0aGVyID0gZGVzY3JpcHRvci5EdGhyO1xuXHRpZiAoZGVzY3JpcHRvci5SdnJzICE9PSB1bmRlZmluZWQpIHJlc3VsdC5yZXZlcnNlID0gZGVzY3JpcHRvci5SdnJzO1xuXHRpZiAoZGVzY3JpcHRvci5BbmdsICE9PSB1bmRlZmluZWQpIHJlc3VsdC5hbmdsZSA9IHBhcnNlQW5nbGUoZGVzY3JpcHRvci5BbmdsKTtcblx0aWYgKGRlc2NyaXB0b3JbJ1NjbCAnXSAhPT0gdW5kZWZpbmVkKSByZXN1bHQuc2NhbGUgPSBwYXJzZVBlcmNlbnQoZGVzY3JpcHRvclsnU2NsICddKTtcblx0aWYgKGRlc2NyaXB0b3IuQWxnbiAhPT0gdW5kZWZpbmVkKSByZXN1bHQuYWxpZ24gPSBkZXNjcmlwdG9yLkFsZ247XG5cdGlmIChkZXNjcmlwdG9yLk9mc3QgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJlc3VsdC5vZmZzZXQgPSB7XG5cdFx0XHR4OiBwYXJzZVBlcmNlbnQoZGVzY3JpcHRvci5PZnN0Lkhyem4pLFxuXHRcdFx0eTogcGFyc2VQZXJjZW50KGRlc2NyaXB0b3IuT2ZzdC5WcnRjKVxuXHRcdH07XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gcGFyc2VQYXR0ZXJuQ29udGVudChkZXNjcmlwdG9yOiBEZXNjcmlwdG9yUGF0dGVybkNvbnRlbnQpIHtcblx0Y29uc3QgcmVzdWx0OiBFZmZlY3RQYXR0ZXJuICYgRXh0cmFQYXR0ZXJuSW5mbyA9IHtcblx0XHRuYW1lOiBkZXNjcmlwdG9yLlB0cm5bJ05tICAnXSxcblx0XHRpZDogZGVzY3JpcHRvci5QdHJuLklkbnQsXG5cdH07XG5cdGlmIChkZXNjcmlwdG9yLkxua2QgIT09IHVuZGVmaW5lZCkgcmVzdWx0LmxpbmtlZCA9IGRlc2NyaXB0b3IuTG5rZDtcblx0aWYgKGRlc2NyaXB0b3IucGhhc2UgIT09IHVuZGVmaW5lZCkgcmVzdWx0LnBoYXNlID0geyB4OiBkZXNjcmlwdG9yLnBoYXNlLkhyem4sIHk6IGRlc2NyaXB0b3IucGhhc2UuVnJ0YyB9O1xuXHRyZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBwYXJzZVZlY3RvckNvbnRlbnQoZGVzY3JpcHRvcjogRGVzY3JpcHRvclZlY3RvckNvbnRlbnQpOiBWZWN0b3JDb250ZW50IHtcblx0aWYgKCdHcmFkJyBpbiBkZXNjcmlwdG9yKSB7XG5cdFx0cmV0dXJuIHBhcnNlR3JhZGllbnRDb250ZW50KGRlc2NyaXB0b3IpO1xuXHR9IGVsc2UgaWYgKCdQdHJuJyBpbiBkZXNjcmlwdG9yKSB7XG5cdFx0cmV0dXJuIHsgdHlwZTogJ3BhdHRlcm4nLCAuLi5wYXJzZVBhdHRlcm5Db250ZW50KGRlc2NyaXB0b3IpIH07XG5cdH0gZWxzZSBpZiAoJ0NsciAnIGluIGRlc2NyaXB0b3IpIHtcblx0XHRyZXR1cm4geyB0eXBlOiAnY29sb3InLCBjb2xvcjogcGFyc2VDb2xvcihkZXNjcmlwdG9yWydDbHIgJ10pIH07XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHZlY3RvciBjb250ZW50Jyk7XG5cdH1cbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplR3JhZGllbnRDb250ZW50KGNvbnRlbnQ6IChFZmZlY3RTb2xpZEdyYWRpZW50IHwgRWZmZWN0Tm9pc2VHcmFkaWVudCkgJiBFeHRyYUdyYWRpZW50SW5mbykge1xuXHRjb25zdCByZXN1bHQ6IERlc2NyaXB0b3JHcmFkaWVudENvbnRlbnQgPSB7fSBhcyBhbnk7XG5cdGlmIChjb250ZW50LmRpdGhlciAhPT0gdW5kZWZpbmVkKSByZXN1bHQuRHRociA9IGNvbnRlbnQuZGl0aGVyO1xuXHRpZiAoY29udGVudC5yZXZlcnNlICE9PSB1bmRlZmluZWQpIHJlc3VsdC5SdnJzID0gY29udGVudC5yZXZlcnNlO1xuXHRpZiAoY29udGVudC5hbmdsZSAhPT0gdW5kZWZpbmVkKSByZXN1bHQuQW5nbCA9IHVuaXRzQW5nbGUoY29udGVudC5hbmdsZSk7XG5cdHJlc3VsdC5UeXBlID0gR3JkVC5lbmNvZGUoY29udGVudC5zdHlsZSk7XG5cdGlmIChjb250ZW50LmFsaWduICE9PSB1bmRlZmluZWQpIHJlc3VsdC5BbGduID0gY29udGVudC5hbGlnbjtcblx0aWYgKGNvbnRlbnQuc2NhbGUgIT09IHVuZGVmaW5lZCkgcmVzdWx0WydTY2wgJ10gPSB1bml0c1BlcmNlbnQoY29udGVudC5zY2FsZSk7XG5cdGlmIChjb250ZW50Lm9mZnNldCkge1xuXHRcdHJlc3VsdC5PZnN0ID0ge1xuXHRcdFx0SHJ6bjogdW5pdHNQZXJjZW50KGNvbnRlbnQub2Zmc2V0LngpLFxuXHRcdFx0VnJ0YzogdW5pdHNQZXJjZW50KGNvbnRlbnQub2Zmc2V0LnkpLFxuXHRcdH07XG5cdH1cblx0cmVzdWx0LkdyYWQgPSBzZXJpYWxpemVHcmFkaWVudChjb250ZW50KTtcblx0cmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplUGF0dGVybkNvbnRlbnQoY29udGVudDogRWZmZWN0UGF0dGVybiAmIEV4dHJhUGF0dGVybkluZm8pIHtcblx0Y29uc3QgcmVzdWx0OiBEZXNjcmlwdG9yUGF0dGVybkNvbnRlbnQgPSB7XG5cdFx0UHRybjoge1xuXHRcdFx0J05tICAnOiBjb250ZW50Lm5hbWUgfHwgJycsXG5cdFx0XHRJZG50OiBjb250ZW50LmlkIHx8ICcnLFxuXHRcdH1cblx0fTtcblx0aWYgKGNvbnRlbnQubGlua2VkICE9PSB1bmRlZmluZWQpIHJlc3VsdC5MbmtkID0gISFjb250ZW50LmxpbmtlZDtcblx0aWYgKGNvbnRlbnQucGhhc2UgIT09IHVuZGVmaW5lZCkgcmVzdWx0LnBoYXNlID0geyBIcnpuOiBjb250ZW50LnBoYXNlLngsIFZydGM6IGNvbnRlbnQucGhhc2UueSB9O1xuXHRyZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVWZWN0b3JDb250ZW50KGNvbnRlbnQ6IFZlY3RvckNvbnRlbnQpOiB7IGRlc2NyaXB0b3I6IERlc2NyaXB0b3JWZWN0b3JDb250ZW50OyBrZXk6IHN0cmluZzsgfSB7XG5cdGlmIChjb250ZW50LnR5cGUgPT09ICdjb2xvcicpIHtcblx0XHRyZXR1cm4geyBrZXk6ICdTb0NvJywgZGVzY3JpcHRvcjogeyAnQ2xyICc6IHNlcmlhbGl6ZUNvbG9yKGNvbnRlbnQuY29sb3IpIH0gfTtcblx0fSBlbHNlIGlmIChjb250ZW50LnR5cGUgPT09ICdwYXR0ZXJuJykge1xuXHRcdHJldHVybiB7IGtleTogJ1B0RmwnLCBkZXNjcmlwdG9yOiBzZXJpYWxpemVQYXR0ZXJuQ29udGVudChjb250ZW50KSB9O1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiB7IGtleTogJ0dkRmwnLCBkZXNjcmlwdG9yOiBzZXJpYWxpemVHcmFkaWVudENvbnRlbnQoY29udGVudCkgfTtcblx0fVxufVxuXG5mdW5jdGlvbiBwYXJzZUNvbG9yKGNvbG9yOiBEZXNjcmlwdG9yQ29sb3IpOiBDb2xvciB7XG5cdGlmICgnSCAgICcgaW4gY29sb3IpIHtcblx0XHRyZXR1cm4geyBoOiBwYXJzZVBlcmNlbnRPckFuZ2xlKGNvbG9yWydIICAgJ10pLCBzOiBjb2xvci5TdHJ0LCBiOiBjb2xvci5CcmdoIH07XG5cdH0gZWxzZSBpZiAoJ1JkICAnIGluIGNvbG9yKSB7XG5cdFx0cmV0dXJuIHsgcjogY29sb3JbJ1JkICAnXSwgZzogY29sb3JbJ0dybiAnXSwgYjogY29sb3JbJ0JsICAnXSB9O1xuXHR9IGVsc2UgaWYgKCdDeW4gJyBpbiBjb2xvcikge1xuXHRcdHJldHVybiB7IGM6IGNvbG9yWydDeW4gJ10sIG06IGNvbG9yLk1nbnQsIHk6IGNvbG9yWydZbHcgJ10sIGs6IGNvbG9yLkJsY2sgfTtcblx0fSBlbHNlIGlmICgnR3J5ICcgaW4gY29sb3IpIHtcblx0XHRyZXR1cm4geyBrOiBjb2xvclsnR3J5ICddIH07XG5cdH0gZWxzZSBpZiAoJ0xtbmMnIGluIGNvbG9yKSB7XG5cdFx0cmV0dXJuIHsgbDogY29sb3IuTG1uYywgYTogY29sb3JbJ0EgICAnXSwgYjogY29sb3JbJ0IgICAnXSB9O1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgY29sb3IgZGVzY3JpcHRvcicpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZUNvbG9yKGNvbG9yOiBDb2xvciB8IHVuZGVmaW5lZCk6IERlc2NyaXB0b3JDb2xvciB7XG5cdGlmICghY29sb3IpIHtcblx0XHRyZXR1cm4geyAnUmQgICc6IDAsICdHcm4gJzogMCwgJ0JsICAnOiAwIH07XG5cdH0gZWxzZSBpZiAoJ3InIGluIGNvbG9yKSB7XG5cdFx0cmV0dXJuIHsgJ1JkICAnOiBjb2xvci5yIHx8IDAsICdHcm4gJzogY29sb3IuZyB8fCAwLCAnQmwgICc6IGNvbG9yLmIgfHwgMCB9O1xuXHR9IGVsc2UgaWYgKCdoJyBpbiBjb2xvcikge1xuXHRcdHJldHVybiB7ICdIICAgJzogdW5pdHNBbmdsZShjb2xvci5oICogMzYwKSwgU3RydDogY29sb3IucyB8fCAwLCBCcmdoOiBjb2xvci5iIHx8IDAgfTtcblx0fSBlbHNlIGlmICgnYycgaW4gY29sb3IpIHtcblx0XHRyZXR1cm4geyAnQ3luICc6IGNvbG9yLmMgfHwgMCwgTWdudDogY29sb3IubSB8fCAwLCAnWWx3ICc6IGNvbG9yLnkgfHwgMCwgQmxjazogY29sb3IuayB8fCAwIH07XG5cdH0gZWxzZSBpZiAoJ2wnIGluIGNvbG9yKSB7XG5cdFx0cmV0dXJuIHsgTG1uYzogY29sb3IubCB8fCAwLCAnQSAgICc6IGNvbG9yLmEgfHwgMCwgJ0IgICAnOiBjb2xvci5iIHx8IDAgfTtcblx0fSBlbHNlIGlmICgnaycgaW4gY29sb3IpIHtcblx0XHRyZXR1cm4geyAnR3J5ICc6IGNvbG9yLmsgfTtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29sb3IgdmFsdWUnKTtcblx0fVxufVxuXG50eXBlIEFsbEVmZmVjdHMgPSBMYXllckVmZmVjdFNoYWRvdyAmIExheWVyRWZmZWN0c091dGVyR2xvdyAmIExheWVyRWZmZWN0U3Ryb2tlICZcblx0TGF5ZXJFZmZlY3RJbm5lckdsb3cgJiBMYXllckVmZmVjdEJldmVsICYgTGF5ZXJFZmZlY3RTb2xpZEZpbGwgJlxuXHRMYXllckVmZmVjdFBhdHRlcm5PdmVybGF5ICYgTGF5ZXJFZmZlY3RTYXRpbiAmIExheWVyRWZmZWN0R3JhZGllbnRPdmVybGF5O1xuXG5mdW5jdGlvbiBwYXJzZUVmZmVjdE9iamVjdChvYmo6IGFueSwgcmVwb3J0RXJyb3JzOiBib29sZWFuKSB7XG5cdGNvbnN0IHJlc3VsdDogQWxsRWZmZWN0cyA9IHt9IGFzIGFueTtcblxuXHRmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhvYmopKSB7XG5cdFx0Y29uc3QgdmFsID0gb2JqW2tleV07XG5cblx0XHRzd2l0Y2ggKGtleSkge1xuXHRcdFx0Y2FzZSAnZW5hYic6IHJlc3VsdC5lbmFibGVkID0gISF2YWw7IGJyZWFrO1xuXHRcdFx0Y2FzZSAndWdsZyc6IHJlc3VsdC51c2VHbG9iYWxMaWdodCA9ICEhdmFsOyBicmVhaztcblx0XHRcdGNhc2UgJ0FudEEnOiByZXN1bHQuYW50aWFsaWFzZWQgPSAhIXZhbDsgYnJlYWs7XG5cdFx0XHRjYXNlICdBbGduJzogcmVzdWx0LmFsaWduID0gISF2YWw7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnRHRocic6IHJlc3VsdC5kaXRoZXIgPSAhIXZhbDsgYnJlYWs7XG5cdFx0XHRjYXNlICdJbnZyJzogcmVzdWx0LmludmVydCA9ICEhdmFsOyBicmVhaztcblx0XHRcdGNhc2UgJ1J2cnMnOiByZXN1bHQucmV2ZXJzZSA9ICEhdmFsOyBicmVhaztcblx0XHRcdGNhc2UgJ0NsciAnOiByZXN1bHQuY29sb3IgPSBwYXJzZUNvbG9yKHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnaGdsQyc6IHJlc3VsdC5oaWdobGlnaHRDb2xvciA9IHBhcnNlQ29sb3IodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdzZHdDJzogcmVzdWx0LnNoYWRvd0NvbG9yID0gcGFyc2VDb2xvcih2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ1N0eWwnOiByZXN1bHQucG9zaXRpb24gPSBGU3RsLmRlY29kZSh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ01kICAnOiByZXN1bHQuYmxlbmRNb2RlID0gQmxuTS5kZWNvZGUodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdoZ2xNJzogcmVzdWx0LmhpZ2hsaWdodEJsZW5kTW9kZSA9IEJsbk0uZGVjb2RlKHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnc2R3TSc6IHJlc3VsdC5zaGFkb3dCbGVuZE1vZGUgPSBCbG5NLmRlY29kZSh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ2J2bFMnOiByZXN1bHQuc3R5bGUgPSBCRVNsLmRlY29kZSh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ2J2bEQnOiByZXN1bHQuZGlyZWN0aW9uID0gQkVTcy5kZWNvZGUodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdidmxUJzogcmVzdWx0LnRlY2huaXF1ZSA9IGJ2bFQuZGVjb2RlKHZhbCkgYXMgYW55OyBicmVhaztcblx0XHRcdGNhc2UgJ0dsd1QnOiByZXN1bHQudGVjaG5pcXVlID0gQkVURS5kZWNvZGUodmFsKSBhcyBhbnk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnZ2x3Uyc6IHJlc3VsdC5zb3VyY2UgPSBJR1NyLmRlY29kZSh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ1R5cGUnOiByZXN1bHQudHlwZSA9IEdyZFQuZGVjb2RlKHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnT3BjdCc6IHJlc3VsdC5vcGFjaXR5ID0gcGFyc2VQZXJjZW50KHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnaGdsTyc6IHJlc3VsdC5oaWdobGlnaHRPcGFjaXR5ID0gcGFyc2VQZXJjZW50KHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnc2R3Tyc6IHJlc3VsdC5zaGFkb3dPcGFjaXR5ID0gcGFyc2VQZXJjZW50KHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnbGFnbCc6IHJlc3VsdC5hbmdsZSA9IHBhcnNlQW5nbGUodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdBbmdsJzogcmVzdWx0LmFuZ2xlID0gcGFyc2VBbmdsZSh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ0xhbGQnOiByZXN1bHQuYWx0aXR1ZGUgPSBwYXJzZUFuZ2xlKHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnU2Z0bic6IHJlc3VsdC5zb2Z0ZW4gPSBwYXJzZVVuaXRzKHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnc3JnUic6IHJlc3VsdC5zdHJlbmd0aCA9IHBhcnNlUGVyY2VudCh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ2JsdXInOiByZXN1bHQuc2l6ZSA9IHBhcnNlVW5pdHModmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdOb3NlJzogcmVzdWx0Lm5vaXNlID0gcGFyc2VQZXJjZW50KHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnSW5wcic6IHJlc3VsdC5yYW5nZSA9IHBhcnNlUGVyY2VudCh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ0NrbXQnOiByZXN1bHQuY2hva2UgPSBwYXJzZVVuaXRzKHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnU2hkTic6IHJlc3VsdC5qaXR0ZXIgPSBwYXJzZVBlcmNlbnQodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdEc3RuJzogcmVzdWx0LmRpc3RhbmNlID0gcGFyc2VVbml0cyh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ1NjbCAnOiByZXN1bHQuc2NhbGUgPSBwYXJzZVBlcmNlbnQodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdQdHJuJzogcmVzdWx0LnBhdHRlcm4gPSB7IG5hbWU6IHZhbFsnTm0gICddLCBpZDogdmFsLklkbnQgfTsgYnJlYWs7XG5cdFx0XHRjYXNlICdwaGFzZSc6IHJlc3VsdC5waGFzZSA9IHsgeDogdmFsLkhyem4sIHk6IHZhbC5WcnRjIH07IGJyZWFrO1xuXHRcdFx0Y2FzZSAnT2ZzdCc6IHJlc3VsdC5vZmZzZXQgPSB7IHg6IHBhcnNlUGVyY2VudCh2YWwuSHJ6biksIHk6IHBhcnNlUGVyY2VudCh2YWwuVnJ0YykgfTsgYnJlYWs7XG5cdFx0XHRjYXNlICdNcGdTJzpcblx0XHRcdGNhc2UgJ1RyblMnOlxuXHRcdFx0XHRyZXN1bHQuY29udG91ciA9IHtcblx0XHRcdFx0XHRuYW1lOiB2YWxbJ05tICAnXSxcblx0XHRcdFx0XHRjdXJ2ZTogKHZhbFsnQ3J2ICddIGFzIGFueVtdKS5tYXAocCA9PiAoeyB4OiBwLkhyem4sIHk6IHAuVnJ0YyB9KSksXG5cdFx0XHRcdH07XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnR3JhZCc6IHJlc3VsdC5ncmFkaWVudCA9IHBhcnNlR3JhZGllbnQodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICd1c2VUZXh0dXJlJzpcblx0XHRcdGNhc2UgJ3VzZVNoYXBlJzpcblx0XHRcdGNhc2UgJ2xheWVyQ29uY2VhbHMnOlxuXHRcdFx0Y2FzZSAncHJlc2VudCc6XG5cdFx0XHRjYXNlICdzaG93SW5EaWFsb2cnOlxuXHRcdFx0Y2FzZSAnYW50aWFsaWFzR2xvc3MnOiByZXN1bHRba2V5XSA9IHZhbDsgYnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXBvcnRFcnJvcnMgJiYgY29uc29sZS5sb2coYEludmFsaWQgZWZmZWN0IGtleTogJyR7a2V5fSc6YCwgdmFsKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVFZmZlY3RPYmplY3Qob2JqOiBhbnksIG9iak5hbWU6IHN0cmluZywgcmVwb3J0RXJyb3JzOiBib29sZWFuKSB7XG5cdGNvbnN0IHJlc3VsdDogYW55ID0ge307XG5cblx0Zm9yIChjb25zdCBvYmpLZXkgb2YgT2JqZWN0LmtleXMob2JqKSkge1xuXHRcdGNvbnN0IGtleToga2V5b2YgQWxsRWZmZWN0cyA9IG9iaktleSBhcyBhbnk7XG5cdFx0Y29uc3QgdmFsID0gb2JqW2tleV07XG5cblx0XHRzd2l0Y2ggKGtleSkge1xuXHRcdFx0Y2FzZSAnZW5hYmxlZCc6IHJlc3VsdC5lbmFiID0gISF2YWw7IGJyZWFrO1xuXHRcdFx0Y2FzZSAndXNlR2xvYmFsTGlnaHQnOiByZXN1bHQudWdsZyA9ICEhdmFsOyBicmVhaztcblx0XHRcdGNhc2UgJ2FudGlhbGlhc2VkJzogcmVzdWx0LkFudEEgPSAhIXZhbDsgYnJlYWs7XG5cdFx0XHRjYXNlICdhbGlnbic6IHJlc3VsdC5BbGduID0gISF2YWw7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnZGl0aGVyJzogcmVzdWx0LkR0aHIgPSAhIXZhbDsgYnJlYWs7XG5cdFx0XHRjYXNlICdpbnZlcnQnOiByZXN1bHQuSW52ciA9ICEhdmFsOyBicmVhaztcblx0XHRcdGNhc2UgJ3JldmVyc2UnOiByZXN1bHQuUnZycyA9ICEhdmFsOyBicmVhaztcblx0XHRcdGNhc2UgJ2NvbG9yJzogcmVzdWx0WydDbHIgJ10gPSBzZXJpYWxpemVDb2xvcih2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ2hpZ2hsaWdodENvbG9yJzogcmVzdWx0LmhnbEMgPSBzZXJpYWxpemVDb2xvcih2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ3NoYWRvd0NvbG9yJzogcmVzdWx0LnNkd0MgPSBzZXJpYWxpemVDb2xvcih2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ3Bvc2l0aW9uJzogcmVzdWx0LlN0eWwgPSBGU3RsLmVuY29kZSh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ2JsZW5kTW9kZSc6IHJlc3VsdFsnTWQgICddID0gQmxuTS5lbmNvZGUodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdoaWdobGlnaHRCbGVuZE1vZGUnOiByZXN1bHQuaGdsTSA9IEJsbk0uZW5jb2RlKHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAnc2hhZG93QmxlbmRNb2RlJzogcmVzdWx0LnNkd00gPSBCbG5NLmVuY29kZSh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ3N0eWxlJzogcmVzdWx0LmJ2bFMgPSBCRVNsLmVuY29kZSh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ2RpcmVjdGlvbic6IHJlc3VsdC5idmxEID0gQkVTcy5lbmNvZGUodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICd0ZWNobmlxdWUnOlxuXHRcdFx0XHRpZiAob2JqTmFtZSA9PT0gJ2JldmVsJykge1xuXHRcdFx0XHRcdHJlc3VsdC5idmxUID0gYnZsVC5lbmNvZGUodmFsKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXN1bHQuR2x3VCA9IEJFVEUuZW5jb2RlKHZhbCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdzb3VyY2UnOiByZXN1bHQuZ2x3UyA9IElHU3IuZW5jb2RlKHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAndHlwZSc6IHJlc3VsdC5UeXBlID0gR3JkVC5lbmNvZGUodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdvcGFjaXR5JzogcmVzdWx0Lk9wY3QgPSB1bml0c1BlcmNlbnQodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdoaWdobGlnaHRPcGFjaXR5JzogcmVzdWx0LmhnbE8gPSB1bml0c1BlcmNlbnQodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdzaGFkb3dPcGFjaXR5JzogcmVzdWx0LnNkd08gPSB1bml0c1BlcmNlbnQodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdhbmdsZSc6XG5cdFx0XHRcdGlmIChvYmpOYW1lID09PSAnZ3JhZGllbnRPdmVybGF5Jykge1xuXHRcdFx0XHRcdHJlc3VsdC5BbmdsID0gdW5pdHNBbmdsZSh2YWwpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJlc3VsdC5sYWdsID0gdW5pdHNBbmdsZSh2YWwpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnYWx0aXR1ZGUnOiByZXN1bHQuTGFsZCA9IHVuaXRzQW5nbGUodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdzb2Z0ZW4nOiByZXN1bHQuU2Z0biA9IHVuaXRzVmFsdWUodmFsLCBrZXkpOyBicmVhaztcblx0XHRcdGNhc2UgJ3N0cmVuZ3RoJzogcmVzdWx0LnNyZ1IgPSB1bml0c1BlcmNlbnQodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICdzaXplJzogcmVzdWx0LmJsdXIgPSB1bml0c1ZhbHVlKHZhbCwga2V5KTsgYnJlYWs7XG5cdFx0XHRjYXNlICdub2lzZSc6IHJlc3VsdC5Ob3NlID0gdW5pdHNQZXJjZW50KHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAncmFuZ2UnOiByZXN1bHQuSW5wciA9IHVuaXRzUGVyY2VudCh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ2Nob2tlJzogcmVzdWx0LkNrbXQgPSB1bml0c1ZhbHVlKHZhbCwga2V5KTsgYnJlYWs7XG5cdFx0XHRjYXNlICdqaXR0ZXInOiByZXN1bHQuU2hkTiA9IHVuaXRzUGVyY2VudCh2YWwpOyBicmVhaztcblx0XHRcdGNhc2UgJ2Rpc3RhbmNlJzogcmVzdWx0LkRzdG4gPSB1bml0c1ZhbHVlKHZhbCwga2V5KTsgYnJlYWs7XG5cdFx0XHRjYXNlICdzY2FsZSc6IHJlc3VsdFsnU2NsICddID0gdW5pdHNQZXJjZW50KHZhbCk7IGJyZWFrO1xuXHRcdFx0Y2FzZSAncGF0dGVybic6IHJlc3VsdC5QdHJuID0geyAnTm0gICc6IHZhbC5uYW1lLCBJZG50OiB2YWwuaWQgfTsgYnJlYWs7XG5cdFx0XHRjYXNlICdwaGFzZSc6IHJlc3VsdC5waGFzZSA9IHsgSHJ6bjogdmFsLngsIFZydGM6IHZhbC55IH07IGJyZWFrO1xuXHRcdFx0Y2FzZSAnb2Zmc2V0JzogcmVzdWx0Lk9mc3QgPSB7IEhyem46IHVuaXRzUGVyY2VudCh2YWwueCksIFZydGM6IHVuaXRzUGVyY2VudCh2YWwueSkgfTsgYnJlYWs7XG5cdFx0XHRjYXNlICdjb250b3VyJzoge1xuXHRcdFx0XHRyZXN1bHRbb2JqTmFtZSA9PT0gJ3NhdGluJyA/ICdNcGdTJyA6ICdUcm5TJ10gPSB7XG5cdFx0XHRcdFx0J05tICAnOiAodmFsIGFzIEVmZmVjdENvbnRvdXIpLm5hbWUsXG5cdFx0XHRcdFx0J0NydiAnOiAodmFsIGFzIEVmZmVjdENvbnRvdXIpLmN1cnZlLm1hcChwID0+ICh7IEhyem46IHAueCwgVnJ0YzogcC55IH0pKSxcblx0XHRcdFx0fTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRjYXNlICdncmFkaWVudCc6IHJlc3VsdC5HcmFkID0gc2VyaWFsaXplR3JhZGllbnQodmFsKTsgYnJlYWs7XG5cdFx0XHRjYXNlICd1c2VUZXh0dXJlJzpcblx0XHRcdGNhc2UgJ3VzZVNoYXBlJzpcblx0XHRcdGNhc2UgJ2xheWVyQ29uY2VhbHMnOlxuXHRcdFx0Y2FzZSAncHJlc2VudCc6XG5cdFx0XHRjYXNlICdzaG93SW5EaWFsb2cnOlxuXHRcdFx0Y2FzZSAnYW50aWFsaWFzR2xvc3MnOlxuXHRcdFx0XHRyZXN1bHRba2V5XSA9IHZhbDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXBvcnRFcnJvcnMgJiYgY29uc29sZS5sb2coYEludmFsaWQgZWZmZWN0IGtleTogJyR7a2V5fScgdmFsdWU6YCwgdmFsKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gcmVzdWx0O1xufVxuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvYnJhbmRvbmxpdS9EZXNrdG9wL3NreWxhYi9hZy1wc2Qvc3JjIn0=
