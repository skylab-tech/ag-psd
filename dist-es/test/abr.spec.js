import { createCanvas } from 'canvas';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { readAbr } from '../abr';
import { compareCanvases, loadImagesFromDirectory } from './common';
var testFilesPath = path.join(__dirname, '..', '..', 'test');
var readFilesPath = path.join(testFilesPath, 'abr-read');
var resultsFilesPath = path.join(__dirname, '..', '..', 'results');
describe('ABR', function () {
    fs.readdirSync(readFilesPath).forEach(function (f) {
        // fs.readdirSync(readFilesPath).filter(f => /s/.test(f)).forEach(f => {
        it("reads ABR file (" + f + ")", function () {
            var basePath = path.join(readFilesPath, f);
            var fileName = path.join(basePath, 'src.abr');
            var abr = readAbr(fs.readFileSync(fileName), { logMissingFeatures: true });
            var resultsPath = path.join(resultsFilesPath, 'abr', f);
            fs.mkdirSync(resultsPath, { recursive: true });
            var images = loadImagesFromDirectory(basePath);
            var compare = [];
            for (var _i = 0, _a = abr.samples; _i < _a.length; _i++) {
                var sample = _a[_i];
                var canvas = alphaToCanvas(sample.alpha, sample.bounds.w, sample.bounds.h);
                delete sample.alpha;
                var name_1 = "sample-" + sample.id + ".png";
                fs.writeFileSync(path.join(resultsPath, name_1), canvas.toBuffer());
                compare.push({ name: name_1, canvas: canvas });
            }
            for (var _b = 0, _c = abr.patterns; _b < _c.length; _b++) {
                var pattern = _c[_b];
                var canvas = rgbToCanvas(pattern.data, pattern.bounds.w, pattern.bounds.h);
                delete pattern.data;
                var name_2 = "pattern-" + pattern.id + ".png";
                fs.writeFileSync(path.join(resultsPath, name_2), canvas.toBuffer());
                compare.push({ name: name_2, canvas: canvas });
            }
            // console.log(require('util').inspect(abr, false, 99, true));
            fs.writeFileSync(path.join(resultsPath, 'data.json'), JSON.stringify(abr, null, 2), 'utf8');
            var expected = JSON.parse(fs.readFileSync(path.join(basePath, 'data.json'), 'utf8'));
            expect(abr).eql(expected, f);
            compare.forEach(function (i) { return compareCanvases(images[i.name], i.canvas, f + "/" + i.name); });
        });
    });
    it.skip('test', function () {
        var fileName = "E:\\Downloads\\Fire_Brushes_-_Pixivu.abr";
        var abr = readAbr(fs.readFileSync(fileName), { logMissingFeatures: true });
        console.log(require('util').inspect(abr, false, 99, true));
    });
    it.skip('test', function () {
        this.timeout(60 * 1000);
        var basePath = "E:\\Downloads\\Brushes-20211231T151021Z-001\\Brushes";
        var outputPath = "E:\\Downloads\\output";
        for (var _i = 0, _a = fs.readdirSync(basePath); _i < _a.length; _i++) {
            var dir = _a[_i];
            var dirPath = path.join(basePath, dir);
            for (var _b = 0, _c = fs.readdirSync(dirPath); _b < _c.length; _b++) {
                var file = _c[_b];
                if (!/\.abr$/.test(file))
                    continue;
                var filePath = path.join(basePath, dir, file);
                console.log(filePath);
                var abr = readAbr(fs.readFileSync(filePath));
                console.log(require('util').inspect(abr, false, 99, true));
                if (0) {
                    fs.rmSync(path.join(outputPath, file), { recursive: true, force: true });
                    fs.mkdirSync(path.join(outputPath, file));
                    for (var _d = 0, _e = abr.samples; _d < _e.length; _d++) {
                        var sample = _e[_d];
                        var canvas = alphaToCanvas(sample.alpha, sample.bounds.w, sample.bounds.h);
                        fs.writeFileSync(path.join(outputPath, file, 'sample-' + sample.id + '.png'), canvas.toBuffer());
                        delete sample.alpha;
                    }
                    for (var _f = 0, _g = abr.patterns; _f < _g.length; _f++) {
                        var pattern = _g[_f];
                        var canvas = rgbToCanvas(pattern.data, pattern.bounds.w, pattern.bounds.h);
                        fs.writeFileSync(path.join(outputPath, file, 'pattern-' + pattern.id + '.png'), canvas.toBuffer());
                        delete pattern.data;
                    }
                    fs.writeFileSync(path.join(outputPath, file, 'info.json'), JSON.stringify(abr, null, 2), 'utf8');
                }
            }
        }
    });
});
function alphaToCanvas(alpha, width, height) {
    var canvas = createCanvas(width, height);
    var context = canvas.getContext('2d');
    var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    for (var src = 0, dst = 0; src < alpha.length; src++, dst += 4) {
        imageData.data[dst + 0] = 255;
        imageData.data[dst + 1] = 255;
        imageData.data[dst + 2] = 255;
        imageData.data[dst + 3] = alpha[src];
    }
    context.putImageData(imageData, 0, 0);
    return canvas;
}
function rgbToCanvas(rgb, width, height) {
    var canvas = createCanvas(width, height);
    var context = canvas.getContext('2d');
    var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    imageData.data.set(rgb);
    context.putImageData(imageData, 0, 0);
    return canvas;
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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U0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBQzlCLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUM5QixTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDckM7SUFFRCxPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdEMsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FBRUQsU0FBUyxXQUFXLENBQUMsR0FBZSxFQUFFLEtBQWEsRUFBRSxNQUFjO0lBQ2xFLElBQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDM0MsSUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUUsQ0FBQztJQUN6QyxJQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDMUUsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDeEIsT0FBTyxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3RDLE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQyIsImZpbGUiOiJ0ZXN0L2Fici5zcGVjLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlQ2FudmFzIH0gZnJvbSAnY2FudmFzJztcclxuaW1wb3J0IHsgZXhwZWN0IH0gZnJvbSAnY2hhaSc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgcmVhZEFiciB9IGZyb20gJy4uL2Ficic7XHJcbmltcG9ydCB7IGNvbXBhcmVDYW52YXNlcywgbG9hZEltYWdlc0Zyb21EaXJlY3RvcnkgfSBmcm9tICcuL2NvbW1vbic7XHJcblxyXG5jb25zdCB0ZXN0RmlsZXNQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ3Rlc3QnKTtcclxuY29uc3QgcmVhZEZpbGVzUGF0aCA9IHBhdGguam9pbih0ZXN0RmlsZXNQYXRoLCAnYWJyLXJlYWQnKTtcclxuY29uc3QgcmVzdWx0c0ZpbGVzUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICcuLicsICdyZXN1bHRzJyk7XHJcblxyXG5kZXNjcmliZSgnQUJSJywgKCkgPT4ge1xyXG5cdGZzLnJlYWRkaXJTeW5jKHJlYWRGaWxlc1BhdGgpLmZvckVhY2goZiA9PiB7XHJcblx0XHQvLyBmcy5yZWFkZGlyU3luYyhyZWFkRmlsZXNQYXRoKS5maWx0ZXIoZiA9PiAvcy8udGVzdChmKSkuZm9yRWFjaChmID0+IHtcclxuXHRcdGl0KGByZWFkcyBBQlIgZmlsZSAoJHtmfSlgLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGJhc2VQYXRoID0gcGF0aC5qb2luKHJlYWRGaWxlc1BhdGgsIGYpO1xyXG5cdFx0XHRjb25zdCBmaWxlTmFtZSA9IHBhdGguam9pbihiYXNlUGF0aCwgJ3NyYy5hYnInKTtcclxuXHRcdFx0Y29uc3QgYWJyID0gcmVhZEFicihmcy5yZWFkRmlsZVN5bmMoZmlsZU5hbWUpLCB7IGxvZ01pc3NpbmdGZWF0dXJlczogdHJ1ZSB9KTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdHNQYXRoID0gcGF0aC5qb2luKHJlc3VsdHNGaWxlc1BhdGgsICdhYnInLCBmKTtcclxuXHRcdFx0ZnMubWtkaXJTeW5jKHJlc3VsdHNQYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcclxuXHJcblx0XHRcdGNvbnN0IGltYWdlcyA9IGxvYWRJbWFnZXNGcm9tRGlyZWN0b3J5KGJhc2VQYXRoKTtcclxuXHRcdFx0Y29uc3QgY29tcGFyZTogeyBuYW1lOiBzdHJpbmc7IGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQgfCB1bmRlZmluZWQ7IH1bXSA9IFtdO1xyXG5cclxuXHRcdFx0Zm9yIChjb25zdCBzYW1wbGUgb2YgYWJyLnNhbXBsZXMpIHtcclxuXHRcdFx0XHRjb25zdCBjYW52YXMgPSBhbHBoYVRvQ2FudmFzKHNhbXBsZS5hbHBoYSwgc2FtcGxlLmJvdW5kcy53LCBzYW1wbGUuYm91bmRzLmgpO1xyXG5cdFx0XHRcdGRlbGV0ZSAoc2FtcGxlIGFzIGFueSkuYWxwaGE7XHJcblx0XHRcdFx0Y29uc3QgbmFtZSA9IGBzYW1wbGUtJHtzYW1wbGUuaWR9LnBuZ2A7XHJcblx0XHRcdFx0ZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ocmVzdWx0c1BhdGgsIG5hbWUpLCBjYW52YXMudG9CdWZmZXIoKSk7XHJcblx0XHRcdFx0Y29tcGFyZS5wdXNoKHsgbmFtZSwgY2FudmFzIH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRmb3IgKGNvbnN0IHBhdHRlcm4gb2YgYWJyLnBhdHRlcm5zKSB7XHJcblx0XHRcdFx0Y29uc3QgY2FudmFzID0gcmdiVG9DYW52YXMocGF0dGVybi5kYXRhLCBwYXR0ZXJuLmJvdW5kcy53LCBwYXR0ZXJuLmJvdW5kcy5oKTtcclxuXHRcdFx0XHRkZWxldGUgKHBhdHRlcm4gYXMgYW55KS5kYXRhO1xyXG5cdFx0XHRcdGNvbnN0IG5hbWUgPSBgcGF0dGVybi0ke3BhdHRlcm4uaWR9LnBuZ2A7XHJcblx0XHRcdFx0ZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ocmVzdWx0c1BhdGgsIG5hbWUpLCBjYW52YXMudG9CdWZmZXIoKSk7XHJcblx0XHRcdFx0Y29tcGFyZS5wdXNoKHsgbmFtZSwgY2FudmFzIH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChhYnIsIGZhbHNlLCA5OSwgdHJ1ZSkpO1xyXG5cclxuXHRcdFx0ZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ocmVzdWx0c1BhdGgsICdkYXRhLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkoYWJyLCBudWxsLCAyKSwgJ3V0ZjgnKTtcclxuXHRcdFx0Y29uc3QgZXhwZWN0ZWQgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4oYmFzZVBhdGgsICdkYXRhLmpzb24nKSwgJ3V0ZjgnKSk7XHJcblxyXG5cdFx0XHRleHBlY3QoYWJyKS5lcWwoZXhwZWN0ZWQsIGYpO1xyXG5cdFx0XHRjb21wYXJlLmZvckVhY2goaSA9PiBjb21wYXJlQ2FudmFzZXMoaW1hZ2VzW2kubmFtZV0sIGkuY2FudmFzLCBgJHtmfS8ke2kubmFtZX1gKSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0aXQuc2tpcCgndGVzdCcsICgpID0+IHtcclxuXHRcdGNvbnN0IGZpbGVOYW1lID0gYEU6XFxcXERvd25sb2Fkc1xcXFxGaXJlX0JydXNoZXNfLV9QaXhpdnUuYWJyYDtcclxuXHRcdGNvbnN0IGFiciA9IHJlYWRBYnIoZnMucmVhZEZpbGVTeW5jKGZpbGVOYW1lKSwgeyBsb2dNaXNzaW5nRmVhdHVyZXM6IHRydWUgfSk7XHJcblx0XHRjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChhYnIsIGZhbHNlLCA5OSwgdHJ1ZSkpO1xyXG5cdH0pO1xyXG5cclxuXHRpdC5za2lwKCd0ZXN0JywgZnVuY3Rpb24gKCkge1xyXG5cdFx0dGhpcy50aW1lb3V0KDYwICogMTAwMCk7XHJcblxyXG5cdFx0Y29uc3QgYmFzZVBhdGggPSBgRTpcXFxcRG93bmxvYWRzXFxcXEJydXNoZXMtMjAyMTEyMzFUMTUxMDIxWi0wMDFcXFxcQnJ1c2hlc2A7XHJcblx0XHRjb25zdCBvdXRwdXRQYXRoID0gYEU6XFxcXERvd25sb2Fkc1xcXFxvdXRwdXRgO1xyXG5cclxuXHRcdGZvciAoY29uc3QgZGlyIG9mIGZzLnJlYWRkaXJTeW5jKGJhc2VQYXRoKSkge1xyXG5cdFx0XHRjb25zdCBkaXJQYXRoID0gcGF0aC5qb2luKGJhc2VQYXRoLCBkaXIpO1xyXG5cclxuXHRcdFx0Zm9yIChjb25zdCBmaWxlIG9mIGZzLnJlYWRkaXJTeW5jKGRpclBhdGgpKSB7XHJcblx0XHRcdFx0aWYgKCEvXFwuYWJyJC8udGVzdChmaWxlKSkgY29udGludWU7XHJcblxyXG5cdFx0XHRcdGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKGJhc2VQYXRoLCBkaXIsIGZpbGUpO1xyXG5cclxuXHRcdFx0XHRjb25zb2xlLmxvZyhmaWxlUGF0aCk7XHJcblx0XHRcdFx0Y29uc3QgYWJyID0gcmVhZEFicihmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgpKTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChhYnIsIGZhbHNlLCA5OSwgdHJ1ZSkpO1xyXG5cclxuXHRcdFx0XHRpZiAoMCkge1xyXG5cdFx0XHRcdFx0ZnMucm1TeW5jKHBhdGguam9pbihvdXRwdXRQYXRoLCBmaWxlKSwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xyXG5cdFx0XHRcdFx0ZnMubWtkaXJTeW5jKHBhdGguam9pbihvdXRwdXRQYXRoLCBmaWxlKSk7XHJcblxyXG5cdFx0XHRcdFx0Zm9yIChjb25zdCBzYW1wbGUgb2YgYWJyLnNhbXBsZXMpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgY2FudmFzID0gYWxwaGFUb0NhbnZhcyhzYW1wbGUuYWxwaGEsIHNhbXBsZS5ib3VuZHMudywgc2FtcGxlLmJvdW5kcy5oKTtcclxuXHRcdFx0XHRcdFx0ZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ob3V0cHV0UGF0aCwgZmlsZSwgJ3NhbXBsZS0nICsgc2FtcGxlLmlkICsgJy5wbmcnKSwgY2FudmFzLnRvQnVmZmVyKCkpO1xyXG5cdFx0XHRcdFx0XHRkZWxldGUgKHNhbXBsZSBhcyBhbnkpLmFscGhhO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGZvciAoY29uc3QgcGF0dGVybiBvZiBhYnIucGF0dGVybnMpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgY2FudmFzID0gcmdiVG9DYW52YXMocGF0dGVybi5kYXRhLCBwYXR0ZXJuLmJvdW5kcy53LCBwYXR0ZXJuLmJvdW5kcy5oKTtcclxuXHRcdFx0XHRcdFx0ZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ob3V0cHV0UGF0aCwgZmlsZSwgJ3BhdHRlcm4tJyArIHBhdHRlcm4uaWQgKyAnLnBuZycpLCBjYW52YXMudG9CdWZmZXIoKSk7XHJcblx0XHRcdFx0XHRcdGRlbGV0ZSAocGF0dGVybiBhcyBhbnkpLmRhdGE7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0ZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ob3V0cHV0UGF0aCwgZmlsZSwgJ2luZm8uanNvbicpLCBKU09OLnN0cmluZ2lmeShhYnIsIG51bGwsIDIpLCAndXRmOCcpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0pXHJcbn0pO1xyXG5cclxuZnVuY3Rpb24gYWxwaGFUb0NhbnZhcyhhbHBoYTogVWludDhBcnJheSwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpIHtcclxuXHRjb25zdCBjYW52YXMgPSBjcmVhdGVDYW52YXMod2lkdGgsIGhlaWdodCk7XHJcblx0Y29uc3QgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpITtcclxuXHRjb25zdCBpbWFnZURhdGEgPSBjb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG5cclxuXHRmb3IgKGxldCBzcmMgPSAwLCBkc3QgPSAwOyBzcmMgPCBhbHBoYS5sZW5ndGg7IHNyYysrLCBkc3QgKz0gNCkge1xyXG5cdFx0aW1hZ2VEYXRhLmRhdGFbZHN0ICsgMF0gPSAyNTU7XHJcblx0XHRpbWFnZURhdGEuZGF0YVtkc3QgKyAxXSA9IDI1NTtcclxuXHRcdGltYWdlRGF0YS5kYXRhW2RzdCArIDJdID0gMjU1O1xyXG5cdFx0aW1hZ2VEYXRhLmRhdGFbZHN0ICsgM10gPSBhbHBoYVtzcmNdO1xyXG5cdH1cclxuXHJcblx0Y29udGV4dC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCAwLCAwKTtcclxuXHRyZXR1cm4gY2FudmFzO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZ2JUb0NhbnZhcyhyZ2I6IFVpbnQ4QXJyYXksIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKSB7XHJcblx0Y29uc3QgY2FudmFzID0gY3JlYXRlQ2FudmFzKHdpZHRoLCBoZWlnaHQpO1xyXG5cdGNvbnN0IGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKSE7XHJcblx0Y29uc3QgaW1hZ2VEYXRhID0gY29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcclxuXHRpbWFnZURhdGEuZGF0YS5zZXQocmdiKTtcclxuXHRjb250ZXh0LnB1dEltYWdlRGF0YShpbWFnZURhdGEsIDAsIDApO1xyXG5cdHJldHVybiBjYW52YXM7XHJcbn1cclxuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvYnJhbmRvbmxpdS9EZXNrdG9wL3NreWxhYi9hZy1wc2Qvc3JjIn0=
