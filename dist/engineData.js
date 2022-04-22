"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeEngineData = exports.parseEngineData = void 0;
function isWhitespace(char) {
    // ' ', '\n', '\r', '\t'
    return char === 32 || char === 10 || char === 13 || char === 9;
}
function isNumber(char) {
    // 0123456789.-
    return (char >= 48 && char <= 57) || char === 46 || char === 45;
}
function parseEngineData(data) {
    var index = 0;
    function skipWhitespace() {
        while (index < data.length && isWhitespace(data[index])) {
            index++;
        }
    }
    function getTextByte() {
        var byte = data[index];
        index++;
        if (byte === 92) { // \
            byte = data[index];
            index++;
        }
        return byte;
    }
    function getText() {
        var result = '';
        if (data[index] === 41) { // )
            index++;
            return result;
        }
        // Strings start with utf-16 BOM
        if (data[index] !== 0xFE || data[index + 1] !== 0xFF) {
            throw new Error('Invalid utf-16 BOM');
        }
        index += 2;
        // ), ( and \ characters are escaped in ascii manner, remove the escapes before interpreting
        // the bytes as utf-16
        while (index < data.length && data[index] !== 41) { // )
            var high = getTextByte();
            var low = getTextByte();
            var char = (high << 8) | low;
            result += String.fromCharCode(char);
        }
        index++;
        return result;
    }
    var root = null;
    var stack = [];
    function pushContainer(value) {
        if (!stack.length) {
            stack.push(value);
            root = value;
        }
        else {
            pushValue(value);
            stack.push(value);
        }
    }
    function pushValue(value) {
        if (!stack.length)
            throw new Error('Invalid data');
        var top = stack[stack.length - 1];
        if (typeof top === 'string') {
            stack[stack.length - 2][top] = value;
            pop();
        }
        else if (Array.isArray(top)) {
            top.push(value);
        }
        else {
            throw new Error('Invalid data');
        }
    }
    function pushProperty(name) {
        if (!stack.length)
            pushContainer({});
        var top = stack[stack.length - 1];
        if (top && typeof top === 'string') {
            if (name === 'nil') {
                pushValue(null);
            }
            else {
                pushValue("/" + name);
            }
        }
        else if (top && typeof top === 'object') {
            stack.push(name);
        }
        else {
            throw new Error('Invalid data');
        }
    }
    function pop() {
        if (!stack.length)
            throw new Error('Invalid data');
        stack.pop();
    }
    skipWhitespace();
    while (index < data.length) {
        var i = index;
        var char = data[i];
        if (char === 60 && data[i + 1] === 60) { // <<
            index += 2;
            pushContainer({});
        }
        else if (char === 62 && data[i + 1] === 62) { // >>
            index += 2;
            pop();
        }
        else if (char === 47) { // /
            index += 1;
            var start = index;
            while (index < data.length && !isWhitespace(data[index])) {
                index++;
            }
            var name_1 = '';
            for (var i_1 = start; i_1 < index; i_1++) {
                name_1 += String.fromCharCode(data[i_1]);
            }
            pushProperty(name_1);
        }
        else if (char === 40) { // (
            index += 1;
            pushValue(getText());
        }
        else if (char === 91) { // [
            index += 1;
            pushContainer([]);
        }
        else if (char === 93) { // ]
            index += 1;
            pop();
        }
        else if (char === 110 && data[i + 1] === 117 && data[i + 2] === 108 && data[i + 3] === 108) { // null
            index += 4;
            pushValue(null);
        }
        else if (char === 116 && data[i + 1] === 114 && data[i + 2] === 117 && data[i + 3] === 101) { // true
            index += 4;
            pushValue(true);
        }
        else if (char === 102 && data[i + 1] === 97 && data[i + 2] === 108 && data[i + 3] === 115 && data[i + 4] === 101) { // false
            index += 5;
            pushValue(false);
        }
        else if (isNumber(char)) {
            var value = '';
            while (index < data.length && isNumber(data[index])) {
                value += String.fromCharCode(data[index]);
                index++;
            }
            pushValue(parseFloat(value));
        }
        else {
            index += 1;
            console.log("Invalid token " + String.fromCharCode(char) + " at " + index);
            // ` near ${String.fromCharCode.apply(null, data.slice(index - 10, index + 20) as any)}` +
            // `data [${Array.from(data.slice(index - 10, index + 20)).join(', ')}]`
        }
        skipWhitespace();
    }
    return root;
}
exports.parseEngineData = parseEngineData;
var floatKeys = [
    'Axis', 'XY', 'Zone', 'WordSpacing', 'FirstLineIndent', 'GlyphSpacing', 'StartIndent', 'EndIndent', 'SpaceBefore',
    'SpaceAfter', 'LetterSpacing', 'Values', 'GridSize', 'GridLeading', 'PointBase', 'BoxBounds', 'TransformPoint0', 'TransformPoint1',
    'TransformPoint2', 'FontSize', 'Leading', 'HorizontalScale', 'VerticalScale', 'BaselineShift', 'Tsume',
    'OutlineWidth', 'AutoLeading',
];
var intArrays = ['RunLengthArray'];
// TODO: handle /nil
function serializeEngineData(data, condensed) {
    if (condensed === void 0) { condensed = false; }
    var buffer = new Uint8Array(1024);
    var offset = 0;
    var indent = 0;
    function write(value) {
        if (offset >= buffer.length) {
            var newBuffer = new Uint8Array(buffer.length * 2);
            newBuffer.set(buffer);
            buffer = newBuffer;
        }
        buffer[offset] = value;
        offset++;
    }
    function writeString(value) {
        for (var i = 0; i < value.length; i++) {
            write(value.charCodeAt(i));
        }
    }
    function writeIndent() {
        if (condensed) {
            writeString(' ');
        }
        else {
            for (var i = 0; i < indent; i++) {
                writeString('\t');
            }
        }
    }
    function writeProperty(key, value) {
        writeIndent();
        writeString("/" + key);
        writeValue(value, key, true);
        if (!condensed)
            writeString('\n');
    }
    function serializeInt(value) {
        return value.toString();
    }
    function serializeFloat(value) {
        return value.toFixed(5)
            .replace(/(\d)0+$/g, '$1')
            .replace(/^0+\.([1-9])/g, '.$1')
            .replace(/^-0+\.0(\d)/g, '-.0$1');
    }
    function serializeNumber(value, key) {
        var isFloat = (key && floatKeys.indexOf(key) !== -1) || (value | 0) !== value;
        return isFloat ? serializeFloat(value) : serializeInt(value);
    }
    function getKeys(value) {
        var keys = Object.keys(value);
        if (keys.indexOf('98') !== -1)
            keys.unshift.apply(keys, keys.splice(keys.indexOf('99'), 1));
        if (keys.indexOf('99') !== -1)
            keys.unshift.apply(keys, keys.splice(keys.indexOf('99'), 1));
        return keys;
    }
    function writeStringByte(value) {
        if (value === 40 || value === 41 || value === 92) { // ( ) \
            write(92); // \
        }
        write(value);
    }
    function writeValue(value, key, inProperty) {
        if (inProperty === void 0) { inProperty = false; }
        function writePrefix() {
            if (inProperty) {
                writeString(' ');
            }
            else {
                writeIndent();
            }
        }
        if (value === null) {
            writePrefix();
            writeString(condensed ? '/nil' : 'null');
        }
        else if (typeof value === 'number') {
            writePrefix();
            writeString(serializeNumber(value, key));
        }
        else if (typeof value === 'boolean') {
            writePrefix();
            writeString(value ? 'true' : 'false');
        }
        else if (typeof value === 'string') {
            writePrefix();
            if ((key === '99' || key === '98') && value.charAt(0) === '/') {
                writeString(value);
            }
            else {
                writeString('(');
                write(0xfe);
                write(0xff);
                for (var i = 0; i < value.length; i++) {
                    var code = value.charCodeAt(i);
                    writeStringByte((code >> 8) & 0xff);
                    writeStringByte(code & 0xff);
                }
                writeString(')');
            }
        }
        else if (Array.isArray(value)) {
            writePrefix();
            if (value.every(function (x) { return typeof x === 'number'; })) {
                writeString('[');
                var intArray = intArrays.indexOf(key) !== -1;
                for (var _i = 0, value_1 = value; _i < value_1.length; _i++) {
                    var x = value_1[_i];
                    writeString(' ');
                    writeString(intArray ? serializeNumber(x) : serializeFloat(x));
                }
                writeString(' ]');
            }
            else {
                writeString('[');
                if (!condensed)
                    writeString('\n');
                for (var _a = 0, value_2 = value; _a < value_2.length; _a++) {
                    var x = value_2[_a];
                    writeValue(x, key);
                    if (!condensed)
                        writeString('\n');
                }
                writeIndent();
                writeString(']');
            }
        }
        else if (typeof value === 'object') {
            if (inProperty && !condensed)
                writeString('\n');
            writeIndent();
            writeString('<<');
            if (!condensed)
                writeString('\n');
            indent++;
            for (var _b = 0, _c = getKeys(value); _b < _c.length; _b++) {
                var key_1 = _c[_b];
                writeProperty(key_1, value[key_1]);
            }
            indent--;
            writeIndent();
            writeString('>>');
        }
        return undefined;
    }
    if (condensed) {
        if (typeof data === 'object') {
            for (var _i = 0, _a = getKeys(data); _i < _a.length; _i++) {
                var key = _a[_i];
                writeProperty(key, data[key]);
            }
        }
    }
    else {
        writeString('\n\n');
        writeValue(data);
    }
    return buffer.slice(0, offset);
}
exports.serializeEngineData = serializeEngineData;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Q0FBQyxTQUFTO2dCQUFFLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVsQyxNQUFNLEVBQUUsQ0FBQztZQUVULEtBQWtCLFVBQWMsRUFBZCxLQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBZCxjQUFjLEVBQWQsSUFBYyxFQUFFO2dCQUE3QixJQUFNLEtBQUcsU0FBQTtnQkFDYixhQUFhLENBQUMsS0FBRyxFQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDO2FBQy9CO1lBRUQsTUFBTSxFQUFFLENBQUM7WUFDVCxXQUFXLEVBQUUsQ0FBQztZQUNkLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNsQjtRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxJQUFJLFNBQVMsRUFBRTtRQUNkLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFO1lBQzdCLEtBQWtCLFVBQWEsRUFBYixLQUFBLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBYixjQUFhLEVBQWIsSUFBYSxFQUFFO2dCQUE1QixJQUFNLEdBQUcsU0FBQTtnQkFDYixhQUFhLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2FBQzlCO1NBQ0Q7S0FDRDtTQUFNO1FBQ04sV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BCLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNqQjtJQUVELE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDaEMsQ0FBQztBQTNLRCxrREEyS0MiLCJmaWxlIjoiZW5naW5lRGF0YS5qcyIsInNvdXJjZXNDb250ZW50IjpbImZ1bmN0aW9uIGlzV2hpdGVzcGFjZShjaGFyOiBudW1iZXIpIHtcclxuXHQvLyAnICcsICdcXG4nLCAnXFxyJywgJ1xcdCdcclxuXHRyZXR1cm4gY2hhciA9PT0gMzIgfHwgY2hhciA9PT0gMTAgfHwgY2hhciA9PT0gMTMgfHwgY2hhciA9PT0gOTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNOdW1iZXIoY2hhcjogbnVtYmVyKSB7XHJcblx0Ly8gMDEyMzQ1Njc4OS4tXHJcblx0cmV0dXJuIChjaGFyID49IDQ4ICYmIGNoYXIgPD0gNTcpIHx8IGNoYXIgPT09IDQ2IHx8IGNoYXIgPT09IDQ1O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VFbmdpbmVEYXRhKGRhdGE6IG51bWJlcltdIHwgVWludDhBcnJheSkge1xyXG5cdGxldCBpbmRleCA9IDA7XHJcblxyXG5cdGZ1bmN0aW9uIHNraXBXaGl0ZXNwYWNlKCkge1xyXG5cdFx0d2hpbGUgKGluZGV4IDwgZGF0YS5sZW5ndGggJiYgaXNXaGl0ZXNwYWNlKGRhdGFbaW5kZXhdKSkge1xyXG5cdFx0XHRpbmRleCsrO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZ2V0VGV4dEJ5dGUoKSB7XHJcblx0XHRsZXQgYnl0ZSA9IGRhdGFbaW5kZXhdO1xyXG5cdFx0aW5kZXgrKztcclxuXHJcblx0XHRpZiAoYnl0ZSA9PT0gOTIpIHsgLy8gXFxcclxuXHRcdFx0Ynl0ZSA9IGRhdGFbaW5kZXhdO1xyXG5cdFx0XHRpbmRleCsrO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBieXRlO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZ2V0VGV4dCgpIHtcclxuXHRcdGxldCByZXN1bHQgPSAnJztcclxuXHJcblx0XHRpZiAoZGF0YVtpbmRleF0gPT09IDQxKSB7IC8vIClcclxuXHRcdFx0aW5kZXgrKztcclxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTdHJpbmdzIHN0YXJ0IHdpdGggdXRmLTE2IEJPTVxyXG5cdFx0aWYgKGRhdGFbaW5kZXhdICE9PSAweEZFIHx8IGRhdGFbaW5kZXggKyAxXSAhPT0gMHhGRikge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgdXRmLTE2IEJPTScpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGluZGV4ICs9IDI7XHJcblxyXG5cdFx0Ly8gKSwgKCBhbmQgXFwgY2hhcmFjdGVycyBhcmUgZXNjYXBlZCBpbiBhc2NpaSBtYW5uZXIsIHJlbW92ZSB0aGUgZXNjYXBlcyBiZWZvcmUgaW50ZXJwcmV0aW5nXHJcblx0XHQvLyB0aGUgYnl0ZXMgYXMgdXRmLTE2XHJcblx0XHR3aGlsZSAoaW5kZXggPCBkYXRhLmxlbmd0aCAmJiBkYXRhW2luZGV4XSAhPT0gNDEpIHsgLy8gKVxyXG5cdFx0XHRjb25zdCBoaWdoID0gZ2V0VGV4dEJ5dGUoKTtcclxuXHRcdFx0Y29uc3QgbG93ID0gZ2V0VGV4dEJ5dGUoKTtcclxuXHRcdFx0Y29uc3QgY2hhciA9IChoaWdoIDw8IDgpIHwgbG93O1xyXG5cdFx0XHRyZXN1bHQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjaGFyKTtcclxuXHRcdH1cclxuXHJcblx0XHRpbmRleCsrO1xyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHR9XHJcblxyXG5cdGxldCByb290OiBhbnkgPSBudWxsO1xyXG5cdGNvbnN0IHN0YWNrOiBhbnlbXSA9IFtdO1xyXG5cclxuXHRmdW5jdGlvbiBwdXNoQ29udGFpbmVyKHZhbHVlOiBhbnkpIHtcclxuXHRcdGlmICghc3RhY2subGVuZ3RoKSB7XHJcblx0XHRcdHN0YWNrLnB1c2godmFsdWUpO1xyXG5cdFx0XHRyb290ID0gdmFsdWU7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRwdXNoVmFsdWUodmFsdWUpO1xyXG5cdFx0XHRzdGFjay5wdXNoKHZhbHVlKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHB1c2hWYWx1ZSh2YWx1ZTogYW55KSB7XHJcblx0XHRpZiAoIXN0YWNrLmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGRhdGEnKTtcclxuXHJcblx0XHRjb25zdCB0b3AgPSBzdGFja1tzdGFjay5sZW5ndGggLSAxXTtcclxuXHJcblx0XHRpZiAodHlwZW9mIHRvcCA9PT0gJ3N0cmluZycpIHtcclxuXHRcdFx0c3RhY2tbc3RhY2subGVuZ3RoIC0gMl1bdG9wXSA9IHZhbHVlO1xyXG5cdFx0XHRwb3AoKTtcclxuXHRcdH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh0b3ApKSB7XHJcblx0XHRcdHRvcC5wdXNoKHZhbHVlKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBkYXRhJyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBwdXNoUHJvcGVydHkobmFtZTogc3RyaW5nKSB7XHJcblx0XHRpZiAoIXN0YWNrLmxlbmd0aCkgcHVzaENvbnRhaW5lcih7fSk7XHJcblxyXG5cdFx0Y29uc3QgdG9wID0gc3RhY2tbc3RhY2subGVuZ3RoIC0gMV07XHJcblxyXG5cdFx0aWYgKHRvcCAmJiB0eXBlb2YgdG9wID09PSAnc3RyaW5nJykge1xyXG5cdFx0XHRpZiAobmFtZSA9PT0gJ25pbCcpIHtcclxuXHRcdFx0XHRwdXNoVmFsdWUobnVsbCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cHVzaFZhbHVlKGAvJHtuYW1lfWApO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2UgaWYgKHRvcCAmJiB0eXBlb2YgdG9wID09PSAnb2JqZWN0Jykge1xyXG5cdFx0XHRzdGFjay5wdXNoKG5hbWUpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGRhdGEnKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHBvcCgpIHtcclxuXHRcdGlmICghc3RhY2subGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZGF0YScpO1xyXG5cdFx0c3RhY2sucG9wKCk7XHJcblx0fVxyXG5cclxuXHRza2lwV2hpdGVzcGFjZSgpO1xyXG5cclxuXHR3aGlsZSAoaW5kZXggPCBkYXRhLmxlbmd0aCkge1xyXG5cdFx0Y29uc3QgaSA9IGluZGV4O1xyXG5cdFx0Y29uc3QgY2hhciA9IGRhdGFbaV07XHJcblxyXG5cdFx0aWYgKGNoYXIgPT09IDYwICYmIGRhdGFbaSArIDFdID09PSA2MCkgeyAvLyA8PFxyXG5cdFx0XHRpbmRleCArPSAyO1xyXG5cdFx0XHRwdXNoQ29udGFpbmVyKHt9KTtcclxuXHRcdH0gZWxzZSBpZiAoY2hhciA9PT0gNjIgJiYgZGF0YVtpICsgMV0gPT09IDYyKSB7IC8vID4+XHJcblx0XHRcdGluZGV4ICs9IDI7XHJcblx0XHRcdHBvcCgpO1xyXG5cdFx0fSBlbHNlIGlmIChjaGFyID09PSA0NykgeyAvLyAvXHJcblx0XHRcdGluZGV4ICs9IDE7XHJcblx0XHRcdGNvbnN0IHN0YXJ0ID0gaW5kZXg7XHJcblxyXG5cdFx0XHR3aGlsZSAoaW5kZXggPCBkYXRhLmxlbmd0aCAmJiAhaXNXaGl0ZXNwYWNlKGRhdGFbaW5kZXhdKSkge1xyXG5cdFx0XHRcdGluZGV4Kys7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGxldCBuYW1lID0gJyc7XHJcblxyXG5cdFx0XHRmb3IgKGxldCBpID0gc3RhcnQ7IGkgPCBpbmRleDsgaSsrKSB7XHJcblx0XHRcdFx0bmFtZSArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGRhdGFbaV0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRwdXNoUHJvcGVydHkobmFtZSk7XHJcblx0XHR9IGVsc2UgaWYgKGNoYXIgPT09IDQwKSB7IC8vIChcclxuXHRcdFx0aW5kZXggKz0gMTtcclxuXHRcdFx0cHVzaFZhbHVlKGdldFRleHQoKSk7XHJcblx0XHR9IGVsc2UgaWYgKGNoYXIgPT09IDkxKSB7IC8vIFtcclxuXHRcdFx0aW5kZXggKz0gMTtcclxuXHRcdFx0cHVzaENvbnRhaW5lcihbXSk7XHJcblx0XHR9IGVsc2UgaWYgKGNoYXIgPT09IDkzKSB7IC8vIF1cclxuXHRcdFx0aW5kZXggKz0gMTtcclxuXHRcdFx0cG9wKCk7XHJcblx0XHR9IGVsc2UgaWYgKGNoYXIgPT09IDExMCAmJiBkYXRhW2kgKyAxXSA9PT0gMTE3ICYmIGRhdGFbaSArIDJdID09PSAxMDggJiYgZGF0YVtpICsgM10gPT09IDEwOCkgeyAvLyBudWxsXHJcblx0XHRcdGluZGV4ICs9IDQ7XHJcblx0XHRcdHB1c2hWYWx1ZShudWxsKTtcclxuXHRcdH0gZWxzZSBpZiAoY2hhciA9PT0gMTE2ICYmIGRhdGFbaSArIDFdID09PSAxMTQgJiYgZGF0YVtpICsgMl0gPT09IDExNyAmJiBkYXRhW2kgKyAzXSA9PT0gMTAxKSB7IC8vIHRydWVcclxuXHRcdFx0aW5kZXggKz0gNDtcclxuXHRcdFx0cHVzaFZhbHVlKHRydWUpO1xyXG5cdFx0fSBlbHNlIGlmIChjaGFyID09PSAxMDIgJiYgZGF0YVtpICsgMV0gPT09IDk3ICYmIGRhdGFbaSArIDJdID09PSAxMDggJiYgZGF0YVtpICsgM10gPT09IDExNSAmJiBkYXRhW2kgKyA0XSA9PT0gMTAxKSB7IC8vIGZhbHNlXHJcblx0XHRcdGluZGV4ICs9IDU7XHJcblx0XHRcdHB1c2hWYWx1ZShmYWxzZSk7XHJcblx0XHR9IGVsc2UgaWYgKGlzTnVtYmVyKGNoYXIpKSB7XHJcblx0XHRcdGxldCB2YWx1ZSA9ICcnO1xyXG5cclxuXHRcdFx0d2hpbGUgKGluZGV4IDwgZGF0YS5sZW5ndGggJiYgaXNOdW1iZXIoZGF0YVtpbmRleF0pKSB7XHJcblx0XHRcdFx0dmFsdWUgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShkYXRhW2luZGV4XSk7XHJcblx0XHRcdFx0aW5kZXgrKztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cHVzaFZhbHVlKHBhcnNlRmxvYXQodmFsdWUpKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGluZGV4ICs9IDE7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBJbnZhbGlkIHRva2VuICR7U3RyaW5nLmZyb21DaGFyQ29kZShjaGFyKX0gYXQgJHtpbmRleH1gKTtcclxuXHRcdFx0Ly8gYCBuZWFyICR7U3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLCBkYXRhLnNsaWNlKGluZGV4IC0gMTAsIGluZGV4ICsgMjApIGFzIGFueSl9YCArXHJcblx0XHRcdC8vIGBkYXRhIFske0FycmF5LmZyb20oZGF0YS5zbGljZShpbmRleCAtIDEwLCBpbmRleCArIDIwKSkuam9pbignLCAnKX1dYFxyXG5cdFx0fVxyXG5cclxuXHRcdHNraXBXaGl0ZXNwYWNlKCk7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gcm9vdDtcclxufVxyXG5cclxuY29uc3QgZmxvYXRLZXlzID0gW1xyXG5cdCdBeGlzJywgJ1hZJywgJ1pvbmUnLCAnV29yZFNwYWNpbmcnLCAnRmlyc3RMaW5lSW5kZW50JywgJ0dseXBoU3BhY2luZycsICdTdGFydEluZGVudCcsICdFbmRJbmRlbnQnLCAnU3BhY2VCZWZvcmUnLFxyXG5cdCdTcGFjZUFmdGVyJywgJ0xldHRlclNwYWNpbmcnLCAnVmFsdWVzJywgJ0dyaWRTaXplJywgJ0dyaWRMZWFkaW5nJywgJ1BvaW50QmFzZScsICdCb3hCb3VuZHMnLCAnVHJhbnNmb3JtUG9pbnQwJywgJ1RyYW5zZm9ybVBvaW50MScsXHJcblx0J1RyYW5zZm9ybVBvaW50MicsICdGb250U2l6ZScsICdMZWFkaW5nJywgJ0hvcml6b250YWxTY2FsZScsICdWZXJ0aWNhbFNjYWxlJywgJ0Jhc2VsaW5lU2hpZnQnLCAnVHN1bWUnLFxyXG5cdCdPdXRsaW5lV2lkdGgnLCAnQXV0b0xlYWRpbmcnLFxyXG5dO1xyXG5cclxuY29uc3QgaW50QXJyYXlzID0gWydSdW5MZW5ndGhBcnJheSddO1xyXG5cclxuLy8gVE9ETzogaGFuZGxlIC9uaWxcclxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUVuZ2luZURhdGEoZGF0YTogYW55LCBjb25kZW5zZWQgPSBmYWxzZSkge1xyXG5cdGxldCBidWZmZXIgPSBuZXcgVWludDhBcnJheSgxMDI0KTtcclxuXHRsZXQgb2Zmc2V0ID0gMDtcclxuXHRsZXQgaW5kZW50ID0gMDtcclxuXHJcblx0ZnVuY3Rpb24gd3JpdGUodmFsdWU6IG51bWJlcikge1xyXG5cdFx0aWYgKG9mZnNldCA+PSBidWZmZXIubGVuZ3RoKSB7XHJcblx0XHRcdGNvbnN0IG5ld0J1ZmZlciA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlci5sZW5ndGggKiAyKTtcclxuXHRcdFx0bmV3QnVmZmVyLnNldChidWZmZXIpO1xyXG5cdFx0XHRidWZmZXIgPSBuZXdCdWZmZXI7XHJcblx0XHR9XHJcblxyXG5cdFx0YnVmZmVyW29mZnNldF0gPSB2YWx1ZTtcclxuXHRcdG9mZnNldCsrO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gd3JpdGVTdHJpbmcodmFsdWU6IHN0cmluZykge1xyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHR3cml0ZSh2YWx1ZS5jaGFyQ29kZUF0KGkpKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHdyaXRlSW5kZW50KCkge1xyXG5cdFx0aWYgKGNvbmRlbnNlZCkge1xyXG5cdFx0XHR3cml0ZVN0cmluZygnICcpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBpbmRlbnQ7IGkrKykge1xyXG5cdFx0XHRcdHdyaXRlU3RyaW5nKCdcXHQnKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gd3JpdGVQcm9wZXJ0eShrZXk6IHN0cmluZywgdmFsdWU6IGFueSkge1xyXG5cdFx0d3JpdGVJbmRlbnQoKTtcclxuXHRcdHdyaXRlU3RyaW5nKGAvJHtrZXl9YCk7XHJcblx0XHR3cml0ZVZhbHVlKHZhbHVlLCBrZXksIHRydWUpO1xyXG5cdFx0aWYgKCFjb25kZW5zZWQpIHdyaXRlU3RyaW5nKCdcXG4nKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNlcmlhbGl6ZUludCh2YWx1ZTogbnVtYmVyKSB7XHJcblx0XHRyZXR1cm4gdmFsdWUudG9TdHJpbmcoKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNlcmlhbGl6ZUZsb2F0KHZhbHVlOiBudW1iZXIpIHtcclxuXHRcdHJldHVybiB2YWx1ZS50b0ZpeGVkKDUpXHJcblx0XHRcdC5yZXBsYWNlKC8oXFxkKTArJC9nLCAnJDEnKVxyXG5cdFx0XHQucmVwbGFjZSgvXjArXFwuKFsxLTldKS9nLCAnLiQxJylcclxuXHRcdFx0LnJlcGxhY2UoL14tMCtcXC4wKFxcZCkvZywgJy0uMCQxJyk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzZXJpYWxpemVOdW1iZXIodmFsdWU6IG51bWJlciwga2V5Pzogc3RyaW5nKSB7XHJcblx0XHRjb25zdCBpc0Zsb2F0ID0gKGtleSAmJiBmbG9hdEtleXMuaW5kZXhPZihrZXkpICE9PSAtMSkgfHwgKHZhbHVlIHwgMCkgIT09IHZhbHVlO1xyXG5cdFx0cmV0dXJuIGlzRmxvYXQgPyBzZXJpYWxpemVGbG9hdCh2YWx1ZSkgOiBzZXJpYWxpemVJbnQodmFsdWUpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZ2V0S2V5cyh2YWx1ZTogYW55KSB7XHJcblx0XHRjb25zdCBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xyXG5cclxuXHRcdGlmIChrZXlzLmluZGV4T2YoJzk4JykgIT09IC0xKVxyXG5cdFx0XHRrZXlzLnVuc2hpZnQoLi4ua2V5cy5zcGxpY2Uoa2V5cy5pbmRleE9mKCc5OScpLCAxKSk7XHJcblxyXG5cdFx0aWYgKGtleXMuaW5kZXhPZignOTknKSAhPT0gLTEpXHJcblx0XHRcdGtleXMudW5zaGlmdCguLi5rZXlzLnNwbGljZShrZXlzLmluZGV4T2YoJzk5JyksIDEpKTtcclxuXHJcblx0XHRyZXR1cm4ga2V5cztcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHdyaXRlU3RyaW5nQnl0ZSh2YWx1ZTogbnVtYmVyKSB7XHJcblx0XHRpZiAodmFsdWUgPT09IDQwIHx8IHZhbHVlID09PSA0MSB8fCB2YWx1ZSA9PT0gOTIpIHsgLy8gKCApIFxcXHJcblx0XHRcdHdyaXRlKDkyKTsgLy8gXFxcclxuXHRcdH1cclxuXHJcblx0XHR3cml0ZSh2YWx1ZSk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB3cml0ZVZhbHVlKHZhbHVlOiBhbnksIGtleT86IHN0cmluZywgaW5Qcm9wZXJ0eSA9IGZhbHNlKSB7XHJcblx0XHRmdW5jdGlvbiB3cml0ZVByZWZpeCgpIHtcclxuXHRcdFx0aWYgKGluUHJvcGVydHkpIHtcclxuXHRcdFx0XHR3cml0ZVN0cmluZygnICcpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHdyaXRlSW5kZW50KCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRpZiAodmFsdWUgPT09IG51bGwpIHtcclxuXHRcdFx0d3JpdGVQcmVmaXgoKTtcclxuXHRcdFx0d3JpdGVTdHJpbmcoY29uZGVuc2VkID8gJy9uaWwnIDogJ251bGwnKTtcclxuXHRcdH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xyXG5cdFx0XHR3cml0ZVByZWZpeCgpO1xyXG5cdFx0XHR3cml0ZVN0cmluZyhzZXJpYWxpemVOdW1iZXIodmFsdWUsIGtleSkpO1xyXG5cdFx0fSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJykge1xyXG5cdFx0XHR3cml0ZVByZWZpeCgpO1xyXG5cdFx0XHR3cml0ZVN0cmluZyh2YWx1ZSA/ICd0cnVlJyA6ICdmYWxzZScpO1xyXG5cdFx0fSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XHJcblx0XHRcdHdyaXRlUHJlZml4KCk7XHJcblxyXG5cdFx0XHRpZiAoKGtleSA9PT0gJzk5JyB8fCBrZXkgPT09ICc5OCcpICYmIHZhbHVlLmNoYXJBdCgwKSA9PT0gJy8nKSB7XHJcblx0XHRcdFx0d3JpdGVTdHJpbmcodmFsdWUpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHdyaXRlU3RyaW5nKCcoJyk7XHJcblx0XHRcdFx0d3JpdGUoMHhmZSk7XHJcblx0XHRcdFx0d3JpdGUoMHhmZik7XHJcblxyXG5cdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGNvbnN0IGNvZGUgPSB2YWx1ZS5jaGFyQ29kZUF0KGkpO1xyXG5cdFx0XHRcdFx0d3JpdGVTdHJpbmdCeXRlKChjb2RlID4+IDgpICYgMHhmZik7XHJcblx0XHRcdFx0XHR3cml0ZVN0cmluZ0J5dGUoY29kZSAmIDB4ZmYpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0d3JpdGVTdHJpbmcoJyknKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xyXG5cdFx0XHR3cml0ZVByZWZpeCgpO1xyXG5cclxuXHRcdFx0aWYgKHZhbHVlLmV2ZXJ5KHggPT4gdHlwZW9mIHggPT09ICdudW1iZXInKSkge1xyXG5cdFx0XHRcdHdyaXRlU3RyaW5nKCdbJyk7XHJcblxyXG5cdFx0XHRcdGNvbnN0IGludEFycmF5ID0gaW50QXJyYXlzLmluZGV4T2Yoa2V5ISkgIT09IC0xO1xyXG5cclxuXHRcdFx0XHRmb3IgKGNvbnN0IHggb2YgdmFsdWUpIHtcclxuXHRcdFx0XHRcdHdyaXRlU3RyaW5nKCcgJyk7XHJcblx0XHRcdFx0XHR3cml0ZVN0cmluZyhpbnRBcnJheSA/IHNlcmlhbGl6ZU51bWJlcih4KSA6IHNlcmlhbGl6ZUZsb2F0KHgpKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHdyaXRlU3RyaW5nKCcgXScpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHdyaXRlU3RyaW5nKCdbJyk7XHJcblx0XHRcdFx0aWYgKCFjb25kZW5zZWQpIHdyaXRlU3RyaW5nKCdcXG4nKTtcclxuXHJcblx0XHRcdFx0Zm9yIChjb25zdCB4IG9mIHZhbHVlKSB7XHJcblx0XHRcdFx0XHR3cml0ZVZhbHVlKHgsIGtleSk7XHJcblx0XHRcdFx0XHRpZiAoIWNvbmRlbnNlZCkgd3JpdGVTdHJpbmcoJ1xcbicpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0d3JpdGVJbmRlbnQoKTtcclxuXHRcdFx0XHR3cml0ZVN0cmluZygnXScpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcclxuXHRcdFx0aWYgKGluUHJvcGVydHkgJiYgIWNvbmRlbnNlZCkgd3JpdGVTdHJpbmcoJ1xcbicpO1xyXG5cclxuXHRcdFx0d3JpdGVJbmRlbnQoKTtcclxuXHRcdFx0d3JpdGVTdHJpbmcoJzw8Jyk7XHJcblxyXG5cdFx0XHRpZiAoIWNvbmRlbnNlZCkgd3JpdGVTdHJpbmcoJ1xcbicpO1xyXG5cclxuXHRcdFx0aW5kZW50Kys7XHJcblxyXG5cdFx0XHRmb3IgKGNvbnN0IGtleSBvZiBnZXRLZXlzKHZhbHVlKSkge1xyXG5cdFx0XHRcdHdyaXRlUHJvcGVydHkoa2V5LCB2YWx1ZVtrZXldKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aW5kZW50LS07XHJcblx0XHRcdHdyaXRlSW5kZW50KCk7XHJcblx0XHRcdHdyaXRlU3RyaW5nKCc+PicpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0fVxyXG5cclxuXHRpZiAoY29uZGVuc2VkKSB7XHJcblx0XHRpZiAodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnKSB7XHJcblx0XHRcdGZvciAoY29uc3Qga2V5IG9mIGdldEtleXMoZGF0YSkpIHtcclxuXHRcdFx0XHR3cml0ZVByb3BlcnR5KGtleSwgZGF0YVtrZXldKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0gZWxzZSB7XHJcblx0XHR3cml0ZVN0cmluZygnXFxuXFxuJyk7XHJcblx0XHR3cml0ZVZhbHVlKGRhdGEpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIGJ1ZmZlci5zbGljZSgwLCBvZmZzZXQpO1xyXG59XHJcbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL2JyYW5kb25saXUvRGVza3RvcC9za3lsYWIvYWctcHNkL3NyYyJ9
