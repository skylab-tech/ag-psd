"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SectionDividerType = exports.ColorMode = void 0;
var ColorMode;
(function (ColorMode) {
    ColorMode[ColorMode["Bitmap"] = 0] = "Bitmap";
    ColorMode[ColorMode["Grayscale"] = 1] = "Grayscale";
    ColorMode[ColorMode["Indexed"] = 2] = "Indexed";
    ColorMode[ColorMode["RGB"] = 3] = "RGB";
    ColorMode[ColorMode["CMYK"] = 4] = "CMYK";
    ColorMode[ColorMode["Multichannel"] = 7] = "Multichannel";
    ColorMode[ColorMode["Duotone"] = 8] = "Duotone";
    ColorMode[ColorMode["Lab"] = 9] = "Lab";
})(ColorMode = exports.ColorMode || (exports.ColorMode = {}));
var SectionDividerType;
(function (SectionDividerType) {
    SectionDividerType[SectionDividerType["Other"] = 0] = "Other";
    SectionDividerType[SectionDividerType["OpenFolder"] = 1] = "OpenFolder";
    SectionDividerType[SectionDividerType["ClosedFolder"] = 2] = "ClosedFolder";
    SectionDividerType[SectionDividerType["BoundingSectionDivider"] = 3] = "BoundingSectionDivider";
})(SectionDividerType = exports.SectionDividerType || (exports.SectionDividerType = {}));

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInBzZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFNQSxJQUFrQixTQVNqQjtBQVRELFdBQWtCLFNBQVM7SUFDMUIsNkNBQVUsQ0FBQTtJQUNWLG1EQUFhLENBQUE7SUFDYiwrQ0FBVyxDQUFBO0lBQ1gsdUNBQU8sQ0FBQTtJQUNQLHlDQUFRLENBQUE7SUFDUix5REFBZ0IsQ0FBQTtJQUNoQiwrQ0FBVyxDQUFBO0lBQ1gsdUNBQU8sQ0FBQTtBQUNSLENBQUMsRUFUaUIsU0FBUyxHQUFULGlCQUFTLEtBQVQsaUJBQVMsUUFTMUI7QUFFRCxJQUFrQixrQkFLakI7QUFMRCxXQUFrQixrQkFBa0I7SUFDbkMsNkRBQVMsQ0FBQTtJQUNULHVFQUFjLENBQUE7SUFDZCwyRUFBZ0IsQ0FBQTtJQUNoQiwrRkFBMEIsQ0FBQTtBQUMzQixDQUFDLEVBTGlCLGtCQUFrQixHQUFsQiwwQkFBa0IsS0FBbEIsMEJBQWtCLFFBS25DIiwiZmlsZSI6InBzZC5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCB0eXBlIEJsZW5kTW9kZSA9ICdwYXNzIHRocm91Z2gnIHwgJ25vcm1hbCcgfCAnZGlzc29sdmUnIHwgJ2RhcmtlbicgfCAnbXVsdGlwbHknIHxcblx0J2NvbG9yIGJ1cm4nIHwgJ2xpbmVhciBidXJuJyB8ICdkYXJrZXIgY29sb3InIHwgJ2xpZ2h0ZW4nIHwgJ3NjcmVlbicgfCAnY29sb3IgZG9kZ2UnIHxcblx0J2xpbmVhciBkb2RnZScgfCAnbGlnaHRlciBjb2xvcicgfCAnb3ZlcmxheScgfCAnc29mdCBsaWdodCcgfCAnaGFyZCBsaWdodCcgfFxuXHQndml2aWQgbGlnaHQnIHwgJ2xpbmVhciBsaWdodCcgfCAncGluIGxpZ2h0JyB8ICdoYXJkIG1peCcgfCAnZGlmZmVyZW5jZScgfCAnZXhjbHVzaW9uJyB8XG5cdCdzdWJ0cmFjdCcgfCAnZGl2aWRlJyB8ICdodWUnIHwgJ3NhdHVyYXRpb24nIHwgJ2NvbG9yJyB8ICdsdW1pbm9zaXR5JztcblxuZXhwb3J0IGNvbnN0IGVudW0gQ29sb3JNb2RlIHtcblx0Qml0bWFwID0gMCxcblx0R3JheXNjYWxlID0gMSxcblx0SW5kZXhlZCA9IDIsXG5cdFJHQiA9IDMsXG5cdENNWUsgPSA0LFxuXHRNdWx0aWNoYW5uZWwgPSA3LFxuXHREdW90b25lID0gOCxcblx0TGFiID0gOSxcbn1cblxuZXhwb3J0IGNvbnN0IGVudW0gU2VjdGlvbkRpdmlkZXJUeXBlIHtcblx0T3RoZXIgPSAwLFxuXHRPcGVuRm9sZGVyID0gMSxcblx0Q2xvc2VkRm9sZGVyID0gMixcblx0Qm91bmRpbmdTZWN0aW9uRGl2aWRlciA9IDMsXG59XG5cbmV4cG9ydCB0eXBlIFJHQkEgPSB7IHI6IG51bWJlcjsgZzogbnVtYmVyOyBiOiBudW1iZXI7IGE6IG51bWJlcjsgfTsgLy8gdmFsdWVzIGZyb20gMCB0byAyNTVcbmV4cG9ydCB0eXBlIFJHQiA9IHsgcjogbnVtYmVyOyBnOiBudW1iZXI7IGI6IG51bWJlcjsgfTsgLy8gdmFsdWVzIGZyb20gMCB0byAyNTVcbmV4cG9ydCB0eXBlIEhTQiA9IHsgaDogbnVtYmVyOyBzOiBudW1iZXI7IGI6IG51bWJlcjsgfTsgLy8gdmFsdWVzIGZyb20gMCB0byAxXG5leHBvcnQgdHlwZSBDTVlLID0geyBjOiBudW1iZXI7IG06IG51bWJlcjsgeTogbnVtYmVyOyBrOiBudW1iZXI7IH07IC8vIHZhbHVlcyBmcm9tIDAgdG8gMjU1XG5leHBvcnQgdHlwZSBMQUIgPSB7IGw6IG51bWJlcjsgYTogbnVtYmVyOyBiOiBudW1iZXI7IH07IC8vIHZhbHVlcyBgbGAgZnJvbSAwIHRvIDE7IGBhYCBhbmQgYGJgIGZyb20gLTEgdG8gMVxuZXhwb3J0IHR5cGUgR3JheXNjYWxlID0geyBrOiBudW1iZXIgfTsgLy8gdmFsdWVzIGZyb20gMCB0byAyNTVcbmV4cG9ydCB0eXBlIENvbG9yID0gUkdCQSB8IFJHQiB8IEhTQiB8IENNWUsgfCBMQUIgfCBHcmF5c2NhbGU7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRWZmZWN0Q29udG91ciB7XG5cdG5hbWU6IHN0cmluZztcblx0Y3VydmU6IHsgeDogbnVtYmVyOyB5OiBudW1iZXI7IH1bXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFZmZlY3RQYXR0ZXJuIHtcblx0bmFtZTogc3RyaW5nO1xuXHRpZDogc3RyaW5nO1xuXHQvLyBUT0RPOiBhZGQgZmllbGRzXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF5ZXJFZmZlY3RTaGFkb3cge1xuXHRwcmVzZW50PzogYm9vbGVhbjtcblx0c2hvd0luRGlhbG9nPzogYm9vbGVhbjtcblx0ZW5hYmxlZD86IGJvb2xlYW47XG5cdHNpemU/OiBVbml0c1ZhbHVlO1xuXHRhbmdsZT86IG51bWJlcjtcblx0ZGlzdGFuY2U/OiBVbml0c1ZhbHVlO1xuXHRjb2xvcj86IENvbG9yO1xuXHRibGVuZE1vZGU/OiBCbGVuZE1vZGU7XG5cdG9wYWNpdHk/OiBudW1iZXI7XG5cdHVzZUdsb2JhbExpZ2h0PzogYm9vbGVhbjtcblx0YW50aWFsaWFzZWQ/OiBib29sZWFuO1xuXHRjb250b3VyPzogRWZmZWN0Q29udG91cjtcblx0Y2hva2U/OiBVbml0c1ZhbHVlOyAvLyBzcHJlYWRcblx0bGF5ZXJDb25jZWFscz86IGJvb2xlYW47IC8vIG9ubHkgZHJvcCBzaGFkb3dcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMYXllckVmZmVjdHNPdXRlckdsb3cge1xuXHRwcmVzZW50PzogYm9vbGVhbjtcblx0c2hvd0luRGlhbG9nPzogYm9vbGVhbjtcblx0ZW5hYmxlZD86IGJvb2xlYW47XG5cdHNpemU/OiBVbml0c1ZhbHVlO1xuXHRjb2xvcj86IENvbG9yO1xuXHRibGVuZE1vZGU/OiBCbGVuZE1vZGU7XG5cdG9wYWNpdHk/OiBudW1iZXI7XG5cdHNvdXJjZT86IEdsb3dTb3VyY2U7XG5cdGFudGlhbGlhc2VkPzogYm9vbGVhbjtcblx0bm9pc2U/OiBudW1iZXI7XG5cdHJhbmdlPzogbnVtYmVyO1xuXHRjaG9rZT86IFVuaXRzVmFsdWU7XG5cdGppdHRlcj86IG51bWJlcjtcblx0Y29udG91cj86IEVmZmVjdENvbnRvdXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF5ZXJFZmZlY3RJbm5lckdsb3cge1xuXHRwcmVzZW50PzogYm9vbGVhbjtcblx0c2hvd0luRGlhbG9nPzogYm9vbGVhbjtcblx0ZW5hYmxlZD86IGJvb2xlYW47XG5cdHNpemU/OiBVbml0c1ZhbHVlO1xuXHRjb2xvcj86IENvbG9yO1xuXHRibGVuZE1vZGU/OiBCbGVuZE1vZGU7XG5cdG9wYWNpdHk/OiBudW1iZXI7XG5cdHNvdXJjZT86IEdsb3dTb3VyY2U7XG5cdHRlY2huaXF1ZT86IEdsb3dUZWNobmlxdWU7XG5cdGFudGlhbGlhc2VkPzogYm9vbGVhbjtcblx0bm9pc2U/OiBudW1iZXI7XG5cdHJhbmdlPzogbnVtYmVyO1xuXHRjaG9rZT86IFVuaXRzVmFsdWU7IC8vIHNwcmVhZFxuXHRqaXR0ZXI/OiBudW1iZXI7XG5cdGNvbnRvdXI/OiBFZmZlY3RDb250b3VyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIExheWVyRWZmZWN0QmV2ZWwge1xuXHRwcmVzZW50PzogYm9vbGVhbjtcblx0c2hvd0luRGlhbG9nPzogYm9vbGVhbjtcblx0ZW5hYmxlZD86IGJvb2xlYW47XG5cdHNpemU/OiBVbml0c1ZhbHVlO1xuXHRhbmdsZT86IG51bWJlcjtcblx0c3RyZW5ndGg/OiBudW1iZXI7IC8vIGRlcHRoXG5cdGhpZ2hsaWdodEJsZW5kTW9kZT86IEJsZW5kTW9kZTtcblx0c2hhZG93QmxlbmRNb2RlPzogQmxlbmRNb2RlO1xuXHRoaWdobGlnaHRDb2xvcj86IENvbG9yO1xuXHRzaGFkb3dDb2xvcj86IENvbG9yO1xuXHRzdHlsZT86IEJldmVsU3R5bGU7XG5cdGhpZ2hsaWdodE9wYWNpdHk/OiBudW1iZXI7XG5cdHNoYWRvd09wYWNpdHk/OiBudW1iZXI7XG5cdHNvZnRlbj86IFVuaXRzVmFsdWU7XG5cdHVzZUdsb2JhbExpZ2h0PzogYm9vbGVhbjtcblx0YWx0aXR1ZGU/OiBudW1iZXI7XG5cdHRlY2huaXF1ZT86IEJldmVsVGVjaG5pcXVlO1xuXHRkaXJlY3Rpb24/OiBCZXZlbERpcmVjdGlvbjtcblx0dXNlVGV4dHVyZT86IGJvb2xlYW47XG5cdHVzZVNoYXBlPzogYm9vbGVhbjtcblx0YW50aWFsaWFzR2xvc3M/OiBib29sZWFuO1xuXHRjb250b3VyPzogRWZmZWN0Q29udG91cjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMYXllckVmZmVjdFNvbGlkRmlsbCB7XG5cdHByZXNlbnQ/OiBib29sZWFuO1xuXHRzaG93SW5EaWFsb2c/OiBib29sZWFuO1xuXHRlbmFibGVkPzogYm9vbGVhbjtcblx0YmxlbmRNb2RlPzogQmxlbmRNb2RlO1xuXHRjb2xvcj86IENvbG9yO1xuXHRvcGFjaXR5PzogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIExheWVyRWZmZWN0U3Ryb2tlIHtcblx0cHJlc2VudD86IGJvb2xlYW47XG5cdHNob3dJbkRpYWxvZz86IGJvb2xlYW47XG5cdGVuYWJsZWQ/OiBib29sZWFuO1xuXHRvdmVycHJpbnQ/OiBib29sZWFuO1xuXHRzaXplPzogVW5pdHNWYWx1ZTtcblx0cG9zaXRpb24/OiAnaW5zaWRlJyB8ICdjZW50ZXInIHwgJ291dHNpZGUnO1xuXHRmaWxsVHlwZT86ICdjb2xvcicgfCAnZ3JhZGllbnQnIHwgJ3BhdHRlcm4nO1xuXHRibGVuZE1vZGU/OiBCbGVuZE1vZGU7XG5cdG9wYWNpdHk/OiBudW1iZXI7XG5cdGNvbG9yPzogQ29sb3I7XG5cdGdyYWRpZW50PzogKEVmZmVjdFNvbGlkR3JhZGllbnQgfCBFZmZlY3ROb2lzZUdyYWRpZW50KSAmIEV4dHJhR3JhZGllbnRJbmZvO1xuXHRwYXR0ZXJuPzogRWZmZWN0UGF0dGVybiAmIHt9OyAvLyBUT0RPOiBhZGRpdGlvbmFsIHBhdHRlcm4gaW5mb1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIExheWVyRWZmZWN0U2F0aW4ge1xuXHRwcmVzZW50PzogYm9vbGVhbjtcblx0c2hvd0luRGlhbG9nPzogYm9vbGVhbjtcblx0ZW5hYmxlZD86IGJvb2xlYW47XG5cdHNpemU/OiBVbml0c1ZhbHVlO1xuXHRibGVuZE1vZGU/OiBCbGVuZE1vZGU7XG5cdGNvbG9yPzogQ29sb3I7XG5cdGFudGlhbGlhc2VkPzogYm9vbGVhbjtcblx0b3BhY2l0eT86IG51bWJlcjtcblx0ZGlzdGFuY2U/OiBVbml0c1ZhbHVlO1xuXHRpbnZlcnQ/OiBib29sZWFuO1xuXHRhbmdsZT86IG51bWJlcjtcblx0Y29udG91cj86IEVmZmVjdENvbnRvdXI7XG59XG5cbi8vIG5vdCBzdXBwb3J0ZWQgeWV0IGJlY2F1c2Ugb2YgYFBhdHRgIHNlY3Rpb24gbm90IGltcGxlbWVudGVkXG5leHBvcnQgaW50ZXJmYWNlIExheWVyRWZmZWN0UGF0dGVybk92ZXJsYXkge1xuXHRwcmVzZW50PzogYm9vbGVhbjtcblx0c2hvd0luRGlhbG9nPzogYm9vbGVhbjtcblx0ZW5hYmxlZD86IGJvb2xlYW47XG5cdGJsZW5kTW9kZT86IEJsZW5kTW9kZTtcblx0b3BhY2l0eT86IG51bWJlcjtcblx0c2NhbGU/OiBudW1iZXI7XG5cdHBhdHRlcm4/OiBFZmZlY3RQYXR0ZXJuO1xuXHRwaGFzZT86IHsgeDogbnVtYmVyOyB5OiBudW1iZXI7IH07XG5cdGFsaWduPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFZmZlY3RTb2xpZEdyYWRpZW50IHtcblx0bmFtZTogc3RyaW5nO1xuXHR0eXBlOiAnc29saWQnO1xuXHRzbW9vdGhuZXNzPzogbnVtYmVyO1xuXHRjb2xvclN0b3BzOiBDb2xvclN0b3BbXTtcblx0b3BhY2l0eVN0b3BzOiBPcGFjaXR5U3RvcFtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEVmZmVjdE5vaXNlR3JhZGllbnQge1xuXHRuYW1lOiBzdHJpbmc7XG5cdHR5cGU6ICdub2lzZSc7XG5cdHJvdWdobmVzcz86IG51bWJlcjtcblx0Y29sb3JNb2RlbD86ICdyZ2InIHwgJ2hzYicgfCAnbGFiJztcblx0cmFuZG9tU2VlZD86IG51bWJlcjtcblx0cmVzdHJpY3RDb2xvcnM/OiBib29sZWFuO1xuXHRhZGRUcmFuc3BhcmVuY3k/OiBib29sZWFuO1xuXHRtaW46IG51bWJlcltdO1xuXHRtYXg6IG51bWJlcltdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIExheWVyRWZmZWN0R3JhZGllbnRPdmVybGF5IHtcblx0cHJlc2VudD86IGJvb2xlYW47XG5cdHNob3dJbkRpYWxvZz86IGJvb2xlYW47XG5cdGVuYWJsZWQ/OiBib29sZWFuO1xuXHRibGVuZE1vZGU/OiBzdHJpbmc7XG5cdG9wYWNpdHk/OiBudW1iZXI7XG5cdGFsaWduPzogYm9vbGVhbjtcblx0c2NhbGU/OiBudW1iZXI7XG5cdGRpdGhlcj86IGJvb2xlYW47XG5cdHJldmVyc2U/OiBib29sZWFuO1xuXHR0eXBlPzogR3JhZGllbnRTdHlsZTtcblx0b2Zmc2V0PzogeyB4OiBudW1iZXI7IHk6IG51bWJlcjsgfTtcblx0Z3JhZGllbnQ/OiBFZmZlY3RTb2xpZEdyYWRpZW50IHwgRWZmZWN0Tm9pc2VHcmFkaWVudDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMYXllckVmZmVjdHNJbmZvIHtcblx0ZGlzYWJsZWQ/OiBib29sZWFuO1xuXHRzY2FsZT86IG51bWJlcjtcblx0ZHJvcFNoYWRvdz86IExheWVyRWZmZWN0U2hhZG93W107XG5cdGlubmVyU2hhZG93PzogTGF5ZXJFZmZlY3RTaGFkb3dbXTtcblx0b3V0ZXJHbG93PzogTGF5ZXJFZmZlY3RzT3V0ZXJHbG93O1xuXHRpbm5lckdsb3c/OiBMYXllckVmZmVjdElubmVyR2xvdztcblx0YmV2ZWw/OiBMYXllckVmZmVjdEJldmVsO1xuXHRzb2xpZEZpbGw/OiBMYXllckVmZmVjdFNvbGlkRmlsbFtdO1xuXHRzYXRpbj86IExheWVyRWZmZWN0U2F0aW47XG5cdHN0cm9rZT86IExheWVyRWZmZWN0U3Ryb2tlW107XG5cdGdyYWRpZW50T3ZlcmxheT86IExheWVyRWZmZWN0R3JhZGllbnRPdmVybGF5W107XG5cdHBhdHRlcm5PdmVybGF5PzogTGF5ZXJFZmZlY3RQYXR0ZXJuT3ZlcmxheTsgLy8gbm90IHN1cHBvcnRlZCB5ZXQgYmVjYXVzZSBvZiBgUGF0dGAgc2VjdGlvbiBub3QgaW1wbGVtZW50ZWRcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMYXllck1hc2tEYXRhIHtcblx0dG9wPzogbnVtYmVyO1xuXHRsZWZ0PzogbnVtYmVyO1xuXHRib3R0b20/OiBudW1iZXI7XG5cdHJpZ2h0PzogbnVtYmVyO1xuXHRkZWZhdWx0Q29sb3I/OiBudW1iZXI7XG5cdGRpc2FibGVkPzogYm9vbGVhbjtcblx0cG9zaXRpb25SZWxhdGl2ZVRvTGF5ZXI/OiBib29sZWFuO1xuXHRmcm9tVmVjdG9yRGF0YT86IGJvb2xlYW47IC8vIHNldCB0byB0cnVlIGlmIHRoZSBtYXNrIGlzIGdlbmVyYXRlZCBmcm9tIHZlY3RvciBkYXRhLCBmYWxzZSBpZiBpdCdzIGEgYml0bWFwIHByb3ZpZGVkIGJ5IHVzZXJcblx0dXNlck1hc2tEZW5zaXR5PzogbnVtYmVyO1xuXHR1c2VyTWFza0ZlYXRoZXI/OiBudW1iZXI7IC8vIHB4XG5cdHZlY3Rvck1hc2tEZW5zaXR5PzogbnVtYmVyO1xuXHR2ZWN0b3JNYXNrRmVhdGhlcj86IG51bWJlcjtcblx0Y2FudmFzPzogSFRNTENhbnZhc0VsZW1lbnQ7XG5cdGltYWdlRGF0YT86IEltYWdlRGF0YTtcbn1cblxuZXhwb3J0IHR5cGUgVGV4dEdyaWRkaW5nID0gJ25vbmUnIHwgJ3JvdW5kJzsgLy8gVE9ETzogb3RoZXIgdmFsdWVzIChubyBpZGVhIHdoZXJlIHRvIHNldCBpdCB1cCBpbiBQaG90b3Nob3ApXG5leHBvcnQgdHlwZSBPcmllbnRhdGlvbiA9ICdob3Jpem9udGFsJyB8ICd2ZXJ0aWNhbCc7XG5leHBvcnQgdHlwZSBBbnRpQWxpYXMgPSAnbm9uZScgfCAnc2hhcnAnIHwgJ2NyaXNwJyB8ICdzdHJvbmcnIHwgJ3Ntb290aCcgfCAncGxhdGZvcm0nIHwgJ3BsYXRmb3JtTENEJztcbmV4cG9ydCB0eXBlIFdhcnBTdHlsZSA9XG5cdCdub25lJyB8ICdhcmMnIHwgJ2FyY0xvd2VyJyB8ICdhcmNVcHBlcicgfCAnYXJjaCcgfCAnYnVsZ2UnIHwgJ3NoZWxsTG93ZXInIHwgJ3NoZWxsVXBwZXInIHwgJ2ZsYWcnIHxcblx0J3dhdmUnIHwgJ2Zpc2gnIHwgJ3Jpc2UnIHwgJ2Zpc2hleWUnIHwgJ2luZmxhdGUnIHwgJ3NxdWVlemUnIHwgJ3R3aXN0JyB8ICdjdXN0b20nO1xuZXhwb3J0IHR5cGUgQmV2ZWxTdHlsZSA9ICdvdXRlciBiZXZlbCcgfCAnaW5uZXIgYmV2ZWwnIHwgJ2VtYm9zcycgfCAncGlsbG93IGVtYm9zcycgfCAnc3Ryb2tlIGVtYm9zcyc7XG5leHBvcnQgdHlwZSBCZXZlbFRlY2huaXF1ZSA9ICdzbW9vdGgnIHwgJ2NoaXNlbCBoYXJkJyB8ICdjaGlzZWwgc29mdCc7XG5leHBvcnQgdHlwZSBCZXZlbERpcmVjdGlvbiA9ICd1cCcgfCAnZG93bic7XG5leHBvcnQgdHlwZSBHbG93VGVjaG5pcXVlID0gJ3NvZnRlcicgfCAncHJlY2lzZSc7XG5leHBvcnQgdHlwZSBHbG93U291cmNlID0gJ2VkZ2UnIHwgJ2NlbnRlcic7XG5leHBvcnQgdHlwZSBHcmFkaWVudFN0eWxlID0gJ2xpbmVhcicgfCAncmFkaWFsJyB8ICdhbmdsZScgfCAncmVmbGVjdGVkJyB8ICdkaWFtb25kJztcbmV4cG9ydCB0eXBlIEp1c3RpZmljYXRpb24gPSAnbGVmdCcgfCAncmlnaHQnIHwgJ2NlbnRlcic7XG5leHBvcnQgdHlwZSBMaW5lQ2FwVHlwZSA9ICdidXR0JyB8ICdyb3VuZCcgfCAnc3F1YXJlJztcbmV4cG9ydCB0eXBlIExpbmVKb2luVHlwZSA9ICdtaXRlcicgfCAncm91bmQnIHwgJ2JldmVsJztcbmV4cG9ydCB0eXBlIExpbmVBbGlnbm1lbnQgPSAnaW5zaWRlJyB8ICdjZW50ZXInIHwgJ291dHNpZGUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFdhcnAge1xuXHRzdHlsZT86IFdhcnBTdHlsZTtcblx0dmFsdWU/OiBudW1iZXI7XG5cdHBlcnNwZWN0aXZlPzogbnVtYmVyO1xuXHRwZXJzcGVjdGl2ZU90aGVyPzogbnVtYmVyO1xuXHRyb3RhdGU/OiBPcmllbnRhdGlvbjtcblx0Ly8gZm9yIGN1c3RvbSB3YXJwc1xuXHRib3VuZHM/OiB7IHRvcDogVW5pdHNWYWx1ZTsgbGVmdDogVW5pdHNWYWx1ZTsgYm90dG9tOiBVbml0c1ZhbHVlOyByaWdodDogVW5pdHNWYWx1ZTsgfTtcblx0dU9yZGVyPzogbnVtYmVyO1xuXHR2T3JkZXI/OiBudW1iZXI7XG5cdGRlZm9ybU51bVJvd3M/OiBudW1iZXI7XG5cdGRlZm9ybU51bUNvbHM/OiBudW1iZXI7XG5cdGN1c3RvbUVudmVsb3BlV2FycD86IHtcblx0XHRxdWlsdFNsaWNlWD86IG51bWJlcltdO1xuXHRcdHF1aWx0U2xpY2VZPzogbnVtYmVyW107XG5cdFx0Ly8gMTYgcG9pbnRzIGZyb20gdG9wIGxlZnQgdG8gYm90dG9tIHJpZ2h0LCByb3dzIGZpcnN0LCBhbGwgcG9pbnRzIGFyZSByZWxhdGl2ZSB0byB0aGUgZmlyc3QgcG9pbnRcblx0XHRtZXNoUG9pbnRzOiB7IHg6IG51bWJlcjsgeTogbnVtYmVyOyB9W107XG5cdH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRm9udCB7XG5cdG5hbWU6IHN0cmluZztcblx0c2NyaXB0PzogbnVtYmVyO1xuXHR0eXBlPzogbnVtYmVyO1xuXHRzeW50aGV0aWM/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFyYWdyYXBoU3R5bGUge1xuXHRqdXN0aWZpY2F0aW9uPzogSnVzdGlmaWNhdGlvbjtcblx0Zmlyc3RMaW5lSW5kZW50PzogbnVtYmVyO1xuXHRzdGFydEluZGVudD86IG51bWJlcjtcblx0ZW5kSW5kZW50PzogbnVtYmVyO1xuXHRzcGFjZUJlZm9yZT86IG51bWJlcjtcblx0c3BhY2VBZnRlcj86IG51bWJlcjtcblx0YXV0b0h5cGhlbmF0ZT86IGJvb2xlYW47XG5cdGh5cGhlbmF0ZWRXb3JkU2l6ZT86IG51bWJlcjtcblx0cHJlSHlwaGVuPzogbnVtYmVyO1xuXHRwb3N0SHlwaGVuPzogbnVtYmVyO1xuXHRjb25zZWN1dGl2ZUh5cGhlbnM/OiBudW1iZXI7XG5cdHpvbmU/OiBudW1iZXI7XG5cdHdvcmRTcGFjaW5nPzogbnVtYmVyW107XG5cdGxldHRlclNwYWNpbmc/OiBudW1iZXJbXTtcblx0Z2x5cGhTcGFjaW5nPzogbnVtYmVyW107XG5cdGF1dG9MZWFkaW5nPzogbnVtYmVyO1xuXHRsZWFkaW5nVHlwZT86IG51bWJlcjtcblx0aGFuZ2luZz86IGJvb2xlYW47XG5cdGJ1cmFzYWdhcmk/OiBib29sZWFuO1xuXHRraW5zb2t1T3JkZXI/OiBudW1iZXI7XG5cdGV2ZXJ5TGluZUNvbXBvc2VyPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXJhZ3JhcGhTdHlsZVJ1biB7XG5cdGxlbmd0aDogbnVtYmVyO1xuXHRzdHlsZTogUGFyYWdyYXBoU3R5bGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGV4dFN0eWxlIHtcblx0Zm9udD86IEZvbnQ7XG5cdGZvbnRTaXplPzogbnVtYmVyO1xuXHRmYXV4Qm9sZD86IGJvb2xlYW47XG5cdGZhdXhJdGFsaWM/OiBib29sZWFuO1xuXHRhdXRvTGVhZGluZz86IGJvb2xlYW47XG5cdGxlYWRpbmc/OiBudW1iZXI7XG5cdGhvcml6b250YWxTY2FsZT86IG51bWJlcjtcblx0dmVydGljYWxTY2FsZT86IG51bWJlcjtcblx0dHJhY2tpbmc/OiBudW1iZXI7XG5cdGF1dG9LZXJuaW5nPzogYm9vbGVhbjtcblx0a2VybmluZz86IG51bWJlcjtcblx0YmFzZWxpbmVTaGlmdD86IG51bWJlcjtcblx0Zm9udENhcHM/OiBudW1iZXI7IC8vIDAgLSBub25lLCAxIC0gc21hbGwgY2FwcywgMiAtIGFsbCBjYXBzXG5cdGZvbnRCYXNlbGluZT86IG51bWJlcjsgLy8gMCAtIG5vcm1hbCwgMSAtIHN1cGVyc2NyaXB0LCAyIC0gc3Vic2NyaXB0XG5cdHVuZGVybGluZT86IGJvb2xlYW47XG5cdHN0cmlrZXRocm91Z2g/OiBib29sZWFuO1xuXHRsaWdhdHVyZXM/OiBib29sZWFuO1xuXHRkTGlnYXR1cmVzPzogYm9vbGVhbjtcblx0YmFzZWxpbmVEaXJlY3Rpb24/OiBudW1iZXI7XG5cdHRzdW1lPzogbnVtYmVyO1xuXHRzdHlsZVJ1bkFsaWdubWVudD86IG51bWJlcjtcblx0bGFuZ3VhZ2U/OiBudW1iZXI7XG5cdG5vQnJlYWs/OiBib29sZWFuO1xuXHRmaWxsQ29sb3I/OiBDb2xvcjtcblx0c3Ryb2tlQ29sb3I/OiBDb2xvcjtcblx0ZmlsbEZsYWc/OiBib29sZWFuO1xuXHRzdHJva2VGbGFnPzogYm9vbGVhbjtcblx0ZmlsbEZpcnN0PzogYm9vbGVhbjtcblx0eVVuZGVybGluZT86IG51bWJlcjtcblx0b3V0bGluZVdpZHRoPzogbnVtYmVyO1xuXHRjaGFyYWN0ZXJEaXJlY3Rpb24/OiBudW1iZXI7XG5cdGhpbmRpTnVtYmVycz86IGJvb2xlYW47XG5cdGthc2hpZGE/OiBudW1iZXI7XG5cdGRpYWNyaXRpY1Bvcz86IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUZXh0U3R5bGVSdW4ge1xuXHRsZW5ndGg6IG51bWJlcjtcblx0c3R5bGU6IFRleHRTdHlsZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUZXh0R3JpZEluZm8ge1xuXHRpc09uPzogYm9vbGVhbjtcblx0c2hvdz86IGJvb2xlYW47XG5cdHNpemU/OiBudW1iZXI7XG5cdGxlYWRpbmc/OiBudW1iZXI7XG5cdGNvbG9yPzogQ29sb3I7XG5cdGxlYWRpbmdGaWxsQ29sb3I/OiBDb2xvcjtcblx0YWxpZ25MaW5lSGVpZ2h0VG9HcmlkRmxhZ3M/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIExheWVyVGV4dERhdGEge1xuXHR0ZXh0OiBzdHJpbmc7XG5cdHRyYW5zZm9ybT86IG51bWJlcltdOyAvLyAyZCB0cmFuc2Zvcm0gbWF0cml4IFt4eCwgeHksIHl4LCB5eSwgdHgsIHR5XVxuXHRhbnRpQWxpYXM/OiBBbnRpQWxpYXM7XG5cdGdyaWRkaW5nPzogVGV4dEdyaWRkaW5nO1xuXHRvcmllbnRhdGlvbj86IE9yaWVudGF0aW9uO1xuXHRpbmRleD86IG51bWJlcjtcblx0d2FycD86IFdhcnA7XG5cdHRvcD86IG51bWJlcjtcblx0bGVmdD86IG51bWJlcjtcblx0Ym90dG9tPzogbnVtYmVyO1xuXHRyaWdodD86IG51bWJlcjtcblxuXHRncmlkSW5mbz86IFRleHRHcmlkSW5mbztcblx0dXNlRnJhY3Rpb25hbEdseXBoV2lkdGhzPzogYm9vbGVhbjtcblx0c3R5bGU/OiBUZXh0U3R5bGU7IC8vIGJhc2Ugc3R5bGVcblx0c3R5bGVSdW5zPzogVGV4dFN0eWxlUnVuW107IC8vIHNwYW5zIG9mIGRpZmZlcmVudCBzdHlsZVxuXHRwYXJhZ3JhcGhTdHlsZT86IFBhcmFncmFwaFN0eWxlOyAvLyBiYXNlIHBhcmFncmFwaCBzdHlsZVxuXHRwYXJhZ3JhcGhTdHlsZVJ1bnM/OiBQYXJhZ3JhcGhTdHlsZVJ1bltdOyAvLyBzdHlsZSBmb3IgZWFjaCBsaW5lXG5cblx0c3VwZXJzY3JpcHRTaXplPzogbnVtYmVyO1xuXHRzdXBlcnNjcmlwdFBvc2l0aW9uPzogbnVtYmVyO1xuXHRzdWJzY3JpcHRTaXplPzogbnVtYmVyO1xuXHRzdWJzY3JpcHRQb3NpdGlvbj86IG51bWJlcjtcblx0c21hbGxDYXBTaXplPzogbnVtYmVyO1xuXG5cdHNoYXBlVHlwZT86ICdwb2ludCcgfCAnYm94Jztcblx0cG9pbnRCYXNlPzogbnVtYmVyW107XG5cdGJveEJvdW5kcz86IG51bWJlcltdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhdHRlcm5JbmZvIHtcblx0bmFtZTogc3RyaW5nO1xuXHRpZDogc3RyaW5nO1xuXHR4OiBudW1iZXI7XG5cdHk6IG51bWJlcjtcblx0Ym91bmRzOiB7IHg6IG51bWJlcjsgeTogbnVtYmVyOyB3OiBudW1iZXIsIGg6IG51bWJlcjsgfTtcblx0ZGF0YTogVWludDhBcnJheTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCZXppZXJLbm90IHtcblx0bGlua2VkOiBib29sZWFuO1xuXHRwb2ludHM6IG51bWJlcltdOyAvLyB4MCwgeTAsIHgxLCB5MSwgeDIsIHkyXG59XG5cbmV4cG9ydCB0eXBlIEJvb2xlYW5PcGVyYXRpb24gPSAnZXhjbHVkZScgfCAnY29tYmluZScgfCAnc3VidHJhY3QnIHwgJ2ludGVyc2VjdCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQmV6aWVyUGF0aCB7XG5cdG9wZW46IGJvb2xlYW47XG5cdG9wZXJhdGlvbjogQm9vbGVhbk9wZXJhdGlvbjtcblx0a25vdHM6IEJlemllcktub3RbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFeHRyYUdyYWRpZW50SW5mbyB7XG5cdHN0eWxlPzogR3JhZGllbnRTdHlsZTtcblx0c2NhbGU/OiBudW1iZXI7XG5cdGFuZ2xlPzogbnVtYmVyO1xuXHRkaXRoZXI/OiBib29sZWFuO1xuXHRyZXZlcnNlPzogYm9vbGVhbjtcblx0YWxpZ24/OiBib29sZWFuO1xuXHRvZmZzZXQ/OiB7IHg6IG51bWJlcjsgeTogbnVtYmVyOyB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEV4dHJhUGF0dGVybkluZm8ge1xuXHRsaW5rZWQ/OiBib29sZWFuO1xuXHRwaGFzZT86IHsgeDogbnVtYmVyOyB5OiBudW1iZXI7IH07XG59XG5cbmV4cG9ydCB0eXBlIFZlY3RvckNvbnRlbnQgPSB7IHR5cGU6ICdjb2xvcic7IGNvbG9yOiBDb2xvcjsgfSB8XG5cdChFZmZlY3RTb2xpZEdyYWRpZW50ICYgRXh0cmFHcmFkaWVudEluZm8pIHxcblx0KEVmZmVjdE5vaXNlR3JhZGllbnQgJiBFeHRyYUdyYWRpZW50SW5mbykgfFxuXHQoRWZmZWN0UGF0dGVybiAmIHsgdHlwZTogJ3BhdHRlcm4nOyB9ICYgRXh0cmFQYXR0ZXJuSW5mbyk7XG5cbmV4cG9ydCB0eXBlIFJlbmRlcmluZ0ludGVudCA9ICdwZXJjZXB0dWFsJyB8ICdzYXR1cmF0aW9uJyB8ICdyZWxhdGl2ZSBjb2xvcmltZXRyaWMnIHwgJ2Fic29sdXRlIGNvbG9yaW1ldHJpYyc7XG5cbmV4cG9ydCB0eXBlIFVuaXRzID0gJ1BpeGVscycgfCAnUG9pbnRzJyB8ICdQaWNhcycgfCAnTWlsbGltZXRlcnMnIHwgJ0NlbnRpbWV0ZXJzJyB8ICdJbmNoZXMnIHwgJ05vbmUnIHwgJ0RlbnNpdHknO1xuXG5leHBvcnQgaW50ZXJmYWNlIFVuaXRzVmFsdWUge1xuXHR1bml0czogVW5pdHM7XG5cdHZhbHVlOiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnJpZ2h0bmVzc0FkanVzdG1lbnQge1xuXHR0eXBlOiAnYnJpZ2h0bmVzcy9jb250cmFzdCc7XG5cdGJyaWdodG5lc3M/OiBudW1iZXI7XG5cdGNvbnRyYXN0PzogbnVtYmVyO1xuXHRtZWFuVmFsdWU/OiBudW1iZXI7XG5cdHVzZUxlZ2FjeT86IGJvb2xlYW47XG5cdGxhYkNvbG9yT25seT86IGJvb2xlYW47XG5cdGF1dG8/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIExldmVsc0FkanVzdG1lbnRDaGFubmVsIHtcblx0c2hhZG93SW5wdXQ6IG51bWJlcjtcblx0aGlnaGxpZ2h0SW5wdXQ6IG51bWJlcjtcblx0c2hhZG93T3V0cHV0OiBudW1iZXI7XG5cdGhpZ2hsaWdodE91dHB1dDogbnVtYmVyO1xuXHRtaWR0b25lSW5wdXQ6IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQcmVzZXRJbmZvIHtcblx0cHJlc2V0S2luZD86IG51bWJlcjtcblx0cHJlc2V0RmlsZU5hbWU/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGV2ZWxzQWRqdXN0bWVudCBleHRlbmRzIFByZXNldEluZm8ge1xuXHR0eXBlOiAnbGV2ZWxzJztcblx0cmdiPzogTGV2ZWxzQWRqdXN0bWVudENoYW5uZWw7XG5cdHJlZD86IExldmVsc0FkanVzdG1lbnRDaGFubmVsO1xuXHRncmVlbj86IExldmVsc0FkanVzdG1lbnRDaGFubmVsO1xuXHRibHVlPzogTGV2ZWxzQWRqdXN0bWVudENoYW5uZWw7XG59XG5cbmV4cG9ydCB0eXBlIEN1cnZlc0FkanVzdG1lbnRDaGFubmVsID0geyBpbnB1dDogbnVtYmVyOyBvdXRwdXQ6IG51bWJlcjsgfVtdO1xuXG5leHBvcnQgaW50ZXJmYWNlIEN1cnZlc0FkanVzdG1lbnQgZXh0ZW5kcyBQcmVzZXRJbmZvIHtcblx0dHlwZTogJ2N1cnZlcyc7XG5cdHJnYj86IEN1cnZlc0FkanVzdG1lbnRDaGFubmVsO1xuXHRyZWQ/OiBDdXJ2ZXNBZGp1c3RtZW50Q2hhbm5lbDtcblx0Z3JlZW4/OiBDdXJ2ZXNBZGp1c3RtZW50Q2hhbm5lbDtcblx0Ymx1ZT86IEN1cnZlc0FkanVzdG1lbnRDaGFubmVsO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEV4cG9zdXJlQWRqdXN0bWVudCBleHRlbmRzIFByZXNldEluZm8ge1xuXHR0eXBlOiAnZXhwb3N1cmUnO1xuXHRleHBvc3VyZT86IG51bWJlcjtcblx0b2Zmc2V0PzogbnVtYmVyO1xuXHRnYW1tYT86IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBWaWJyYW5jZUFkanVzdG1lbnQge1xuXHR0eXBlOiAndmlicmFuY2UnO1xuXHR2aWJyYW5jZT86IG51bWJlcjtcblx0c2F0dXJhdGlvbj86IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBIdWVTYXR1cmF0aW9uQWRqdXN0bWVudENoYW5uZWwge1xuXHRhOiBudW1iZXI7XG5cdGI6IG51bWJlcjtcblx0YzogbnVtYmVyO1xuXHRkOiBudW1iZXI7XG5cdGh1ZTogbnVtYmVyO1xuXHRzYXR1cmF0aW9uOiBudW1iZXI7XG5cdGxpZ2h0bmVzczogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEh1ZVNhdHVyYXRpb25BZGp1c3RtZW50IGV4dGVuZHMgUHJlc2V0SW5mbyB7XG5cdHR5cGU6ICdodWUvc2F0dXJhdGlvbic7XG5cdG1hc3Rlcj86IEh1ZVNhdHVyYXRpb25BZGp1c3RtZW50Q2hhbm5lbDtcblx0cmVkcz86IEh1ZVNhdHVyYXRpb25BZGp1c3RtZW50Q2hhbm5lbDtcblx0eWVsbG93cz86IEh1ZVNhdHVyYXRpb25BZGp1c3RtZW50Q2hhbm5lbDtcblx0Z3JlZW5zPzogSHVlU2F0dXJhdGlvbkFkanVzdG1lbnRDaGFubmVsO1xuXHRjeWFucz86IEh1ZVNhdHVyYXRpb25BZGp1c3RtZW50Q2hhbm5lbDtcblx0Ymx1ZXM/OiBIdWVTYXR1cmF0aW9uQWRqdXN0bWVudENoYW5uZWw7XG5cdG1hZ2VudGFzPzogSHVlU2F0dXJhdGlvbkFkanVzdG1lbnRDaGFubmVsO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbG9yQmFsYW5jZVZhbHVlcyB7XG5cdGN5YW5SZWQ6IG51bWJlcjtcblx0bWFnZW50YUdyZWVuOiBudW1iZXI7XG5cdHllbGxvd0JsdWU6IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb2xvckJhbGFuY2VBZGp1c3RtZW50IHtcblx0dHlwZTogJ2NvbG9yIGJhbGFuY2UnO1xuXHRzaGFkb3dzPzogQ29sb3JCYWxhbmNlVmFsdWVzO1xuXHRtaWR0b25lcz86IENvbG9yQmFsYW5jZVZhbHVlcztcblx0aGlnaGxpZ2h0cz86IENvbG9yQmFsYW5jZVZhbHVlcztcblx0cHJlc2VydmVMdW1pbm9zaXR5PzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCbGFja0FuZFdoaXRlQWRqdXN0bWVudCBleHRlbmRzIFByZXNldEluZm8ge1xuXHR0eXBlOiAnYmxhY2sgJiB3aGl0ZSc7XG5cdHJlZHM/OiBudW1iZXI7XG5cdHllbGxvd3M/OiBudW1iZXI7XG5cdGdyZWVucz86IG51bWJlcjtcblx0Y3lhbnM/OiBudW1iZXI7XG5cdGJsdWVzPzogbnVtYmVyO1xuXHRtYWdlbnRhcz86IG51bWJlcjtcblx0dXNlVGludD86IGJvb2xlYW47XG5cdHRpbnRDb2xvcj86IENvbG9yO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBob3RvRmlsdGVyQWRqdXN0bWVudCB7XG5cdHR5cGU6ICdwaG90byBmaWx0ZXInO1xuXHRjb2xvcj86IENvbG9yO1xuXHRkZW5zaXR5PzogbnVtYmVyO1xuXHRwcmVzZXJ2ZUx1bWlub3NpdHk/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENoYW5uZWxNaXhlckNoYW5uZWwge1xuXHRyZWQ6IG51bWJlcjtcblx0Z3JlZW46IG51bWJlcjtcblx0Ymx1ZTogbnVtYmVyO1xuXHRjb25zdGFudDogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENoYW5uZWxNaXhlckFkanVzdG1lbnQgZXh0ZW5kcyBQcmVzZXRJbmZvIHtcblx0dHlwZTogJ2NoYW5uZWwgbWl4ZXInO1xuXHRtb25vY2hyb21lPzogYm9vbGVhbjtcblx0cmVkPzogQ2hhbm5lbE1peGVyQ2hhbm5lbDtcblx0Z3JlZW4/OiBDaGFubmVsTWl4ZXJDaGFubmVsO1xuXHRibHVlPzogQ2hhbm5lbE1peGVyQ2hhbm5lbDtcblx0Z3JheT86IENoYW5uZWxNaXhlckNoYW5uZWw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29sb3JMb29rdXBBZGp1c3RtZW50IHtcblx0dHlwZTogJ2NvbG9yIGxvb2t1cCc7XG5cdGxvb2t1cFR5cGU/OiAnM2RsdXQnIHwgJ2Fic3RyYWN0UHJvZmlsZScgfCAnZGV2aWNlTGlua1Byb2ZpbGUnO1xuXHRuYW1lPzogc3RyaW5nO1xuXHRkaXRoZXI/OiBib29sZWFuO1xuXHRwcm9maWxlPzogVWludDhBcnJheTtcblx0bHV0Rm9ybWF0PzogJ2xvb2snIHwgJ2N1YmUnIHwgJzNkbCc7XG5cdGRhdGFPcmRlcj86ICdyZ2InIHwgJ2Jncic7XG5cdHRhYmxlT3JkZXI/OiAncmdiJyB8ICdiZ3InO1xuXHRsdXQzREZpbGVEYXRhPzogVWludDhBcnJheTtcblx0bHV0M0RGaWxlTmFtZT86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbnZlcnRBZGp1c3RtZW50IHtcblx0dHlwZTogJ2ludmVydCc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUG9zdGVyaXplQWRqdXN0bWVudCB7XG5cdHR5cGU6ICdwb3N0ZXJpemUnO1xuXHRsZXZlbHM/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGhyZXNob2xkQWRqdXN0bWVudCB7XG5cdHR5cGU6ICd0aHJlc2hvbGQnO1xuXHRsZXZlbD86IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb2xvclN0b3Age1xuXHRjb2xvcjogQ29sb3I7XG5cdGxvY2F0aW9uOiBudW1iZXI7XG5cdG1pZHBvaW50OiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgT3BhY2l0eVN0b3Age1xuXHRvcGFjaXR5OiBudW1iZXI7XG5cdGxvY2F0aW9uOiBudW1iZXI7XG5cdG1pZHBvaW50OiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR3JhZGllbnRNYXBBZGp1c3RtZW50IHtcblx0dHlwZTogJ2dyYWRpZW50IG1hcCc7XG5cdG5hbWU/OiBzdHJpbmc7XG5cdGdyYWRpZW50VHlwZTogJ3NvbGlkJyB8ICdub2lzZSc7XG5cdGRpdGhlcj86IGJvb2xlYW47XG5cdHJldmVyc2U/OiBib29sZWFuO1xuXHQvLyBzb2xpZFxuXHRzbW9vdGhuZXNzPzogbnVtYmVyO1xuXHRjb2xvclN0b3BzPzogQ29sb3JTdG9wW107XG5cdG9wYWNpdHlTdG9wcz86IE9wYWNpdHlTdG9wW107XG5cdC8vIG5vaXNlXG5cdHJvdWdobmVzcz86IG51bWJlcjtcblx0Y29sb3JNb2RlbD86ICdyZ2InIHwgJ2hzYicgfCAnbGFiJztcblx0cmFuZG9tU2VlZD86IG51bWJlcjtcblx0cmVzdHJpY3RDb2xvcnM/OiBib29sZWFuO1xuXHRhZGRUcmFuc3BhcmVuY3k/OiBib29sZWFuO1xuXHRtaW4/OiBudW1iZXJbXTtcblx0bWF4PzogbnVtYmVyW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VsZWN0aXZlQ29sb3JBZGp1c3RtZW50IHtcblx0dHlwZTogJ3NlbGVjdGl2ZSBjb2xvcic7XG5cdG1vZGU/OiAncmVsYXRpdmUnIHwgJ2Fic29sdXRlJztcblx0cmVkcz86IENNWUs7XG5cdHllbGxvd3M/OiBDTVlLO1xuXHRncmVlbnM/OiBDTVlLO1xuXHRjeWFucz86IENNWUs7XG5cdGJsdWVzPzogQ01ZSztcblx0bWFnZW50YXM/OiBDTVlLO1xuXHR3aGl0ZXM/OiBDTVlLO1xuXHRuZXV0cmFscz86IENNWUs7XG5cdGJsYWNrcz86IENNWUs7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGlua2VkRmlsZSB7XG5cdGlkOiBzdHJpbmc7XG5cdG5hbWU6IHN0cmluZztcblx0dHlwZT86IHN0cmluZztcblx0Y3JlYXRvcj86IHN0cmluZztcblx0ZGF0YT86IFVpbnQ4QXJyYXk7XG5cdHRpbWU/OiBEYXRlOyAvLyBmb3IgZXh0ZXJuYWwgZmlsZXNcblx0ZGVzY3JpcHRvcj86IHtcblx0XHRjb21wSW5mbzogeyBjb21wSUQ6IG51bWJlcjsgb3JpZ2luYWxDb21wSUQ6IG51bWJlcjsgfTtcblx0fTtcblx0Y2hpbGREb2N1bWVudElEPzogc3RyaW5nO1xuXHRhc3NldE1vZFRpbWU/OiBudW1iZXI7XG5cdGFzc2V0TG9ja2VkU3RhdGU/OiBudW1iZXI7XG59XG5cbmV4cG9ydCB0eXBlIFBsYWNlZExheWVyVHlwZSA9ICd1bmtub3duJyB8ICd2ZWN0b3InIHwgJ3Jhc3RlcicgfCAnaW1hZ2Ugc3RhY2snO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBsYWNlZExheWVyIHtcblx0aWQ6IHN0cmluZzsgLy8gaWQgb2YgbGlua2VkIGltYWdlIGZpbGUgKHBzZC5saW5rZWRGaWxlcylcblx0cGxhY2VkPzogc3RyaW5nOyAvLyA/Pz9cblx0dHlwZTogUGxhY2VkTGF5ZXJUeXBlO1xuXHQvLyBwYWdlTnVtYmVyOiBudW1iZXI7IC8vID8/P1xuXHQvLyB0b3RhbFBhZ2VzOiBudW1iZXI7IC8vID8/P1xuXHQvLyBmcmFtZVN0ZXA/OiB7IG51bWVyYXRvcjogbnVtYmVyOyBkZW5vbWluYXRvcjogbnVtYmVyOyB9O1xuXHQvLyBkdXJhdGlvbj86IHsgbnVtZXJhdG9yOiBudW1iZXI7IGRlbm9taW5hdG9yOiBudW1iZXI7IH07XG5cdC8vIGZyYW1lQ291bnQ/OiBudW1iZXI7IC8vID8/P1xuXHR0cmFuc2Zvcm06IG51bWJlcltdOyAvLyB4LCB5IG9mIDQgY29ybmVycyBvZiB0aGUgdHJhbnNmb3JtXG5cdG5vbkFmZmluZVRyYW5zZm9ybT86IG51bWJlcltdOyAvLyB4LCB5IG9mIDQgY29ybmVycyBvZiB0aGUgdHJhbnNmb3JtXG5cdHdpZHRoPzogbnVtYmVyO1xuXHRoZWlnaHQ/OiBudW1iZXI7XG5cdHJlc29sdXRpb24/OiBVbml0c1ZhbHVlO1xuXHQvLyBhbnRpYWxpYXMgP1xuXHR3YXJwPzogV2FycDtcblx0Y3JvcD86IG51bWJlcjtcblx0Y29tcD86IG51bWJlcjtcblx0Y29tcEluZm8/OiB7IGNvbXBJRDogbnVtYmVyOyBvcmlnaW5hbENvbXBJRDogbnVtYmVyOyB9O1xufVxuXG5leHBvcnQgdHlwZSBBZGp1c3RtZW50TGF5ZXIgPSBCcmlnaHRuZXNzQWRqdXN0bWVudCB8IExldmVsc0FkanVzdG1lbnQgfCBDdXJ2ZXNBZGp1c3RtZW50IHxcblx0RXhwb3N1cmVBZGp1c3RtZW50IHwgVmlicmFuY2VBZGp1c3RtZW50IHwgSHVlU2F0dXJhdGlvbkFkanVzdG1lbnQgfCBDb2xvckJhbGFuY2VBZGp1c3RtZW50IHxcblx0QmxhY2tBbmRXaGl0ZUFkanVzdG1lbnQgfCBQaG90b0ZpbHRlckFkanVzdG1lbnQgfCBDaGFubmVsTWl4ZXJBZGp1c3RtZW50IHwgQ29sb3JMb29rdXBBZGp1c3RtZW50IHxcblx0SW52ZXJ0QWRqdXN0bWVudCB8IFBvc3Rlcml6ZUFkanVzdG1lbnQgfCBUaHJlc2hvbGRBZGp1c3RtZW50IHwgR3JhZGllbnRNYXBBZGp1c3RtZW50IHxcblx0U2VsZWN0aXZlQ29sb3JBZGp1c3RtZW50O1xuXG5leHBvcnQgdHlwZSBMYXllckNvbG9yID0gJ25vbmUnIHwgJ3JlZCcgfCAnb3JhbmdlJyB8ICd5ZWxsb3cnIHwgJ2dyZWVuJyB8ICdibHVlJyB8ICd2aW9sZXQnIHwgJ2dyYXknO1xuXG5leHBvcnQgaW50ZXJmYWNlIEtleURlc2NyaXB0b3JJdGVtIHtcblx0a2V5U2hhcGVJbnZhbGlkYXRlZD86IGJvb2xlYW47XG5cdGtleU9yaWdpblR5cGU/OiBudW1iZXI7XG5cdGtleU9yaWdpblJlc29sdXRpb24/OiBudW1iZXI7XG5cdGtleU9yaWdpblJSZWN0UmFkaWk/OiB7XG5cdFx0dG9wUmlnaHQ6IFVuaXRzVmFsdWU7XG5cdFx0dG9wTGVmdDogVW5pdHNWYWx1ZTtcblx0XHRib3R0b21MZWZ0OiBVbml0c1ZhbHVlO1xuXHRcdGJvdHRvbVJpZ2h0OiBVbml0c1ZhbHVlO1xuXHR9O1xuXHRrZXlPcmlnaW5TaGFwZUJvdW5kaW5nQm94Pzoge1xuXHRcdHRvcDogVW5pdHNWYWx1ZTtcblx0XHRsZWZ0OiBVbml0c1ZhbHVlO1xuXHRcdGJvdHRvbTogVW5pdHNWYWx1ZTtcblx0XHRyaWdodDogVW5pdHNWYWx1ZTtcblx0fTtcblx0a2V5T3JpZ2luQm94Q29ybmVycz86IHsgeDogbnVtYmVyOyB5OiBudW1iZXI7IH1bXTtcblx0dHJhbnNmb3JtPzogbnVtYmVyW107IC8vIDJkIHRyYW5zZm9ybSBtYXRyaXggW3h4LCB4eSwgeXgsIHl5LCB0eCwgdHldXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF5ZXJWZWN0b3JNYXNrIHtcblx0aW52ZXJ0PzogYm9vbGVhbjtcblx0bm90TGluaz86IGJvb2xlYW47XG5cdGRpc2FibGU/OiBib29sZWFuO1xuXHRmaWxsU3RhcnRzV2l0aEFsbFBpeGVscz86IGJvb2xlYW47XG5cdGNsaXBib2FyZD86IHtcblx0XHR0b3A6IG51bWJlcjtcblx0XHRsZWZ0OiBudW1iZXI7XG5cdFx0Ym90dG9tOiBudW1iZXI7XG5cdFx0cmlnaHQ6IG51bWJlcjtcblx0XHRyZXNvbHV0aW9uOiBudW1iZXI7XG5cdH07XG5cdHBhdGhzOiBCZXppZXJQYXRoW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF5ZXJBZGRpdGlvbmFsSW5mbyB7XG5cdG5hbWU/OiBzdHJpbmc7IC8vIGxheWVyIG5hbWVcblx0bmFtZVNvdXJjZT86IHN0cmluZzsgLy8gbGF5ZXIgbmFtZSBzb3VyY2Vcblx0aWQ/OiBudW1iZXI7IC8vIGxheWVyIGlkXG5cdHZlcnNpb24/OiBudW1iZXI7IC8vIGxheWVyIHZlcnNpb25cblx0bWFzaz86IExheWVyTWFza0RhdGE7XG5cdGJsZW5kQ2xpcHBlbmRFbGVtZW50cz86IGJvb2xlYW47XG5cdGJsZW5kSW50ZXJpb3JFbGVtZW50cz86IGJvb2xlYW47XG5cdGtub2Nrb3V0PzogYm9vbGVhbjtcblx0cHJvdGVjdGVkPzoge1xuXHRcdHRyYW5zcGFyZW5jeT86IGJvb2xlYW47XG5cdFx0Y29tcG9zaXRlPzogYm9vbGVhbjtcblx0XHRwb3NpdGlvbj86IGJvb2xlYW47XG5cdFx0YXJ0Ym9hcmRzPzogYm9vbGVhbjtcblx0fTtcblx0bGF5ZXJDb2xvcj86IExheWVyQ29sb3I7XG5cdHJlZmVyZW5jZVBvaW50Pzoge1xuXHRcdHg6IG51bWJlcjtcblx0XHR5OiBudW1iZXI7XG5cdH07XG5cdHNlY3Rpb25EaXZpZGVyPzoge1xuXHRcdHR5cGU6IFNlY3Rpb25EaXZpZGVyVHlwZTtcblx0XHRrZXk/OiBzdHJpbmc7XG5cdFx0c3ViVHlwZT86IG51bWJlcjtcblx0fTtcblx0ZmlsdGVyTWFzaz86IHtcblx0XHRjb2xvclNwYWNlOiBDb2xvcjtcblx0XHRvcGFjaXR5OiBudW1iZXI7XG5cdH07XG5cdGVmZmVjdHM/OiBMYXllckVmZmVjdHNJbmZvO1xuXHR0ZXh0PzogTGF5ZXJUZXh0RGF0YTtcblx0cGF0dGVybnM/OiBQYXR0ZXJuSW5mb1tdOyAvLyBub3Qgc3VwcG9ydGVkIHlldFxuXHR2ZWN0b3JGaWxsPzogVmVjdG9yQ29udGVudDtcblx0dmVjdG9yU3Ryb2tlPzoge1xuXHRcdHN0cm9rZUVuYWJsZWQ/OiBib29sZWFuO1xuXHRcdGZpbGxFbmFibGVkPzogYm9vbGVhbjtcblx0XHRsaW5lV2lkdGg/OiBVbml0c1ZhbHVlO1xuXHRcdGxpbmVEYXNoT2Zmc2V0PzogVW5pdHNWYWx1ZTtcblx0XHRtaXRlckxpbWl0PzogbnVtYmVyO1xuXHRcdGxpbmVDYXBUeXBlPzogTGluZUNhcFR5cGU7XG5cdFx0bGluZUpvaW5UeXBlPzogTGluZUpvaW5UeXBlO1xuXHRcdGxpbmVBbGlnbm1lbnQ/OiBMaW5lQWxpZ25tZW50O1xuXHRcdHNjYWxlTG9jaz86IGJvb2xlYW47XG5cdFx0c3Ryb2tlQWRqdXN0PzogYm9vbGVhbjtcblx0XHRsaW5lRGFzaFNldD86IFVuaXRzVmFsdWVbXTtcblx0XHRibGVuZE1vZGU/OiBCbGVuZE1vZGU7XG5cdFx0b3BhY2l0eT86IG51bWJlcjtcblx0XHRjb250ZW50PzogVmVjdG9yQ29udGVudDtcblx0XHRyZXNvbHV0aW9uPzogbnVtYmVyO1xuXHR9O1xuXHR2ZWN0b3JNYXNrPzogTGF5ZXJWZWN0b3JNYXNrO1xuXHR1c2luZ0FsaWduZWRSZW5kZXJpbmc/OiBib29sZWFuO1xuXHR0aW1lc3RhbXA/OiBudW1iZXI7IC8vIHNlY29uZHNcblx0cGF0aExpc3Q/OiB7XG5cdH1bXTtcblx0YWRqdXN0bWVudD86IEFkanVzdG1lbnRMYXllcjtcblx0cGxhY2VkTGF5ZXI/OiBQbGFjZWRMYXllcjtcblx0dmVjdG9yT3JpZ2luYXRpb24/OiB7XG5cdFx0a2V5RGVzY3JpcHRvckxpc3Q6IEtleURlc2NyaXB0b3JJdGVtW107XG5cdH07XG5cdGNvbXBvc2l0b3JVc2VkPzoge1xuXHRcdGRlc2NyaXB0aW9uOiBzdHJpbmc7XG5cdFx0cmVhc29uOiBzdHJpbmc7XG5cdFx0ZW5naW5lOiBzdHJpbmc7XG5cdFx0ZW5hYmxlQ29tcENvcmU6IHN0cmluZztcblx0XHRlbmFibGVDb21wQ29yZUdQVTogc3RyaW5nO1xuXHRcdGNvbXBDb3JlU3VwcG9ydDogc3RyaW5nO1xuXHRcdGNvbXBDb3JlR1BVU3VwcG9ydDogc3RyaW5nO1xuXHR9O1xuXHRhcnRib2FyZD86IHtcblx0XHRyZWN0OiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IGJvdHRvbTogbnVtYmVyOyByaWdodDogbnVtYmVyOyB9O1xuXHRcdGd1aWRlSW5kaWNlcz86IGFueVtdO1xuXHRcdHByZXNldE5hbWU/OiBzdHJpbmc7XG5cdFx0Y29sb3I/OiBDb2xvcjtcblx0XHRiYWNrZ3JvdW5kVHlwZT86IG51bWJlcjtcblx0fTtcblx0ZmlsbE9wYWNpdHk/OiBudW1iZXI7XG5cdHRyYW5zcGFyZW5jeVNoYXBlc0xheWVyPzogYm9vbGVhbjtcblxuXHQvLyBCYXNlNjQgZW5jb2RlZCByYXcgRW5naW5lRGF0YSwgY3VycmVudGx5IGp1c3Qga2VwdCBpbiBvcmlnaW5hbCBzdGF0ZSB0byBzdXBwb3J0XG5cdC8vIGxvYWRpbmcgYW5kIG1vZGlmeWluZyBQU0QgZmlsZSB3aXRob3V0IGJyZWFraW5nIHRleHQgbGF5ZXJzLlxuXHRlbmdpbmVEYXRhPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEltYWdlUmVzb3VyY2VzIHtcblx0bGF5ZXJTdGF0ZT86IG51bWJlcjtcblx0bGF5ZXJzR3JvdXA/OiBudW1iZXJbXTtcblx0bGF5ZXJTZWxlY3Rpb25JZHM/OiBudW1iZXJbXTtcblx0bGF5ZXJHcm91cHNFbmFibGVkSWQ/OiBudW1iZXJbXTtcblx0dmVyc2lvbkluZm8/OiB7XG5cdFx0aGFzUmVhbE1lcmdlZERhdGE6IGJvb2xlYW47XG5cdFx0d3JpdGVyTmFtZTogc3RyaW5nO1xuXHRcdHJlYWRlck5hbWU6IHN0cmluZztcblx0XHRmaWxlVmVyc2lvbjogbnVtYmVyO1xuXHR9O1xuXHRhbHBoYUlkZW50aWZpZXJzPzogbnVtYmVyW107XG5cdGFscGhhQ2hhbm5lbE5hbWVzPzogc3RyaW5nW107XG5cdGdsb2JhbEFuZ2xlPzogbnVtYmVyO1xuXHRnbG9iYWxBbHRpdHVkZT86IG51bWJlcjtcblx0cGl4ZWxBc3BlY3RSYXRpbz86IHtcblx0XHRhc3BlY3Q6IG51bWJlcjtcblx0fTtcblx0dXJsc0xpc3Q/OiBhbnlbXTtcblx0Z3JpZEFuZEd1aWRlc0luZm9ybWF0aW9uPzoge1xuXHRcdGdyaWQ/OiB7XG5cdFx0XHRob3Jpem9udGFsOiBudW1iZXI7XG5cdFx0XHR2ZXJ0aWNhbDogbnVtYmVyO1xuXHRcdH0sXG5cdFx0Z3VpZGVzPzoge1xuXHRcdFx0bG9jYXRpb246IG51bWJlcjtcblx0XHRcdGRpcmVjdGlvbjogJ2hvcml6b250YWwnIHwgJ3ZlcnRpY2FsJztcblx0XHR9W107XG5cdH07XG5cdHJlc29sdXRpb25JbmZvPzoge1xuXHRcdGhvcml6b250YWxSZXNvbHV0aW9uOiBudW1iZXI7XG5cdFx0aG9yaXpvbnRhbFJlc29sdXRpb25Vbml0OiAnUFBJJyB8ICdQUENNJztcblx0XHR3aWR0aFVuaXQ6ICdJbmNoZXMnIHwgJ0NlbnRpbWV0ZXJzJyB8ICdQb2ludHMnIHwgJ1BpY2FzJyB8ICdDb2x1bW5zJztcblx0XHR2ZXJ0aWNhbFJlc29sdXRpb246IG51bWJlcjtcblx0XHR2ZXJ0aWNhbFJlc29sdXRpb25Vbml0OiAnUFBJJyB8ICdQUENNJztcblx0XHRoZWlnaHRVbml0OiAnSW5jaGVzJyB8ICdDZW50aW1ldGVycycgfCAnUG9pbnRzJyB8ICdQaWNhcycgfCAnQ29sdW1ucyc7XG5cdH07XG5cdHRodW1ibmFpbD86IEhUTUxDYW52YXNFbGVtZW50O1xuXHR0aHVtYm5haWxSYXc/OiB7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyOyBkYXRhOiBVaW50OEFycmF5OyB9O1xuXHRjYXB0aW9uRGlnZXN0Pzogc3RyaW5nO1xuXHR4bXBNZXRhZGF0YT86IHN0cmluZztcblx0cHJpbnRTY2FsZT86IHtcblx0XHRzdHlsZT86ICdjZW50ZXJlZCcgfCAnc2l6ZSB0byBmaXQnIHwgJ3VzZXIgZGVmaW5lZCc7XG5cdFx0eD86IG51bWJlcjtcblx0XHR5PzogbnVtYmVyO1xuXHRcdHNjYWxlPzogbnVtYmVyO1xuXHR9O1xuXHRwcmludEluZm9ybWF0aW9uPzoge1xuXHRcdHByaW50ZXJNYW5hZ2VzQ29sb3JzPzogYm9vbGVhbjtcblx0XHRwcmludGVyTmFtZT86IHN0cmluZztcblx0XHRwcmludGVyUHJvZmlsZT86IHN0cmluZztcblx0XHRwcmludFNpeHRlZW5CaXQ/OiBib29sZWFuO1xuXHRcdHJlbmRlcmluZ0ludGVudD86IFJlbmRlcmluZ0ludGVudDtcblx0XHRoYXJkUHJvb2Y/OiBib29sZWFuO1xuXHRcdGJsYWNrUG9pbnRDb21wZW5zYXRpb24/OiBib29sZWFuO1xuXHRcdHByb29mU2V0dXA/OiB7XG5cdFx0XHRidWlsdGluOiBzdHJpbmc7XG5cdFx0fSB8IHtcblx0XHRcdHByb2ZpbGU6IHN0cmluZztcblx0XHRcdHJlbmRlcmluZ0ludGVudD86IFJlbmRlcmluZ0ludGVudDtcblx0XHRcdGJsYWNrUG9pbnRDb21wZW5zYXRpb24/OiBib29sZWFuO1xuXHRcdFx0cGFwZXJXaGl0ZT86IGJvb2xlYW47XG5cdFx0fTtcblx0fTtcblx0YmFja2dyb3VuZENvbG9yPzogQ29sb3I7XG5cdGlkc1NlZWROdW1iZXI/OiBudW1iZXI7XG5cdHByaW50RmxhZ3M/OiB7XG5cdFx0bGFiZWxzPzogYm9vbGVhbjtcblx0XHRjcm9wTWFya3M/OiBib29sZWFuO1xuXHRcdGNvbG9yQmFycz86IGJvb2xlYW47XG5cdFx0cmVnaXN0cmF0aW9uTWFya3M/OiBib29sZWFuO1xuXHRcdG5lZ2F0aXZlPzogYm9vbGVhbjtcblx0XHRmbGlwPzogYm9vbGVhbjtcblx0XHRpbnRlcnBvbGF0ZT86IGJvb2xlYW47XG5cdFx0Y2FwdGlvbj86IGJvb2xlYW47XG5cdFx0cHJpbnRGbGFncz86IGJvb2xlYW47XG5cdH07XG5cdGljY1VudGFnZ2VkUHJvZmlsZT86IGJvb2xlYW47XG5cdHBhdGhTZWxlY3Rpb25TdGF0ZT86IHN0cmluZ1tdO1xuXHRpbWFnZVJlYWR5VmFyaWFibGVzPzogc3RyaW5nO1xuXHRpbWFnZVJlYWR5RGF0YVNldHM/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR2xvYmFsTGF5ZXJNYXNrSW5mbyB7XG5cdG92ZXJsYXlDb2xvclNwYWNlOiBudW1iZXI7XG5cdGNvbG9yU3BhY2UxOiBudW1iZXI7XG5cdGNvbG9yU3BhY2UyOiBudW1iZXI7XG5cdGNvbG9yU3BhY2UzOiBudW1iZXI7XG5cdGNvbG9yU3BhY2U0OiBudW1iZXI7XG5cdG9wYWNpdHk6IG51bWJlcjtcblx0a2luZDogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFubm90YXRpb24ge1xuXHR0eXBlOiAndGV4dCcgfCAnc291bmQnO1xuXHRvcGVuOiBib29sZWFuO1xuXHRpY29uTG9jYXRpb246IHsgbGVmdDogbnVtYmVyOyB0b3A6IG51bWJlcjsgcmlnaHQ6IG51bWJlcjsgYm90dG9tOiBudW1iZXIgfTtcblx0cG9wdXBMb2NhdGlvbjogeyBsZWZ0OiBudW1iZXI7IHRvcDogbnVtYmVyOyByaWdodDogbnVtYmVyOyBib3R0b206IG51bWJlciB9O1xuXHRjb2xvcjogQ29sb3I7XG5cdGF1dGhvcjogc3RyaW5nO1xuXHRuYW1lOiBzdHJpbmc7XG5cdGRhdGU6IHN0cmluZztcblx0ZGF0YTogc3RyaW5nIHwgVWludDhBcnJheTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMYXllciBleHRlbmRzIExheWVyQWRkaXRpb25hbEluZm8ge1xuXHR0b3A/OiBudW1iZXI7XG5cdGxlZnQ/OiBudW1iZXI7XG5cdGJvdHRvbT86IG51bWJlcjtcblx0cmlnaHQ/OiBudW1iZXI7XG5cdGJsZW5kTW9kZT86IEJsZW5kTW9kZTtcblx0b3BhY2l0eT86IG51bWJlcjtcblx0dHJhbnNwYXJlbmN5UHJvdGVjdGVkPzogYm9vbGVhbjtcblx0aGlkZGVuPzogYm9vbGVhbjtcblx0Y2xpcHBpbmc/OiBib29sZWFuO1xuXHRjYW52YXM/OiBIVE1MQ2FudmFzRWxlbWVudDtcblx0aW1hZ2VEYXRhPzogSW1hZ2VEYXRhO1xuXHRjaGlsZHJlbj86IExheWVyW107XG5cdC8qKiBhcHBsaWVzIG9ubHkgZm9yIGxheWVyIGdyb3VwcyAqL1xuXHRvcGVuZWQ/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBzZCBleHRlbmRzIExheWVyQWRkaXRpb25hbEluZm8ge1xuXHR3aWR0aDogbnVtYmVyO1xuXHRoZWlnaHQ6IG51bWJlcjtcblx0Y2hhbm5lbHM/OiBudW1iZXI7XG5cdGJpdHNQZXJDaGFubmVsPzogbnVtYmVyO1xuXHRjb2xvck1vZGU/OiBDb2xvck1vZGU7XG5cdGNoaWxkcmVuPzogTGF5ZXJbXTtcblx0Y2FudmFzPzogSFRNTENhbnZhc0VsZW1lbnQ7XG5cdGltYWdlRGF0YT86IEltYWdlRGF0YTtcblx0aW1hZ2VSZXNvdXJjZXM/OiBJbWFnZVJlc291cmNlcztcblx0bGlua2VkRmlsZXM/OiBMaW5rZWRGaWxlW107IC8vIHVzZWQgaW4gc21hcnQgb2JqZWN0c1xuXHRhcnRib2FyZHM/OiB7XG5cdFx0Y291bnQ6IG51bWJlcjtcblx0XHRhdXRvRXhwYW5kT2Zmc2V0PzogeyBob3Jpem9udGFsOiBudW1iZXI7IHZlcnRpY2FsOiBudW1iZXI7IH07XG5cdFx0b3JpZ2luPzogeyBob3Jpem9udGFsOiBudW1iZXI7IHZlcnRpY2FsOiBudW1iZXI7IH07XG5cdFx0YXV0b0V4cGFuZEVuYWJsZWQ/OiBib29sZWFuO1xuXHRcdGF1dG9OZXN0RW5hYmxlZD86IGJvb2xlYW47XG5cdFx0YXV0b1Bvc2l0aW9uRW5hYmxlZD86IGJvb2xlYW47XG5cdFx0c2hyaW5rd3JhcE9uU2F2ZUVuYWJsZWQ/OiBib29sZWFuO1xuXHRcdGRvY0RlZmF1bHROZXdBcnRib2FyZEJhY2tncm91bmRDb2xvcj86IENvbG9yO1xuXHRcdGRvY0RlZmF1bHROZXdBcnRib2FyZEJhY2tncm91bmRUeXBlPzogbnVtYmVyO1xuXHR9O1xuXHRnbG9iYWxMYXllck1hc2tJbmZvPzogR2xvYmFsTGF5ZXJNYXNrSW5mbztcblx0YW5ub3RhdGlvbnM/OiBBbm5vdGF0aW9uW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVhZE9wdGlvbnMge1xuXHQvKiogRG9lcyBub3QgbG9hZCBsYXllciBpbWFnZSBkYXRhLiAqL1xuXHRza2lwTGF5ZXJJbWFnZURhdGE/OiBib29sZWFuO1xuXHQvKiogRG9lcyBub3QgbG9hZCBjb21wb3NpdGUgaW1hZ2UgZGF0YS4gKi9cblx0c2tpcENvbXBvc2l0ZUltYWdlRGF0YT86IGJvb2xlYW47XG5cdC8qKiBEb2VzIG5vdCBsb2FkIHRodW1ibmFpbC4gKi9cblx0c2tpcFRodW1ibmFpbD86IGJvb2xlYW47XG5cdC8qKiBEb2VzIG5vdCBsb2FkIGxpbmtlZCBmaWxlcyAodXNlZCBpbiBzbWFydC1vYmplY3RzKS4gKi9cblx0c2tpcExpbmtlZEZpbGVzRGF0YT86IGJvb2xlYW47XG5cdC8qKiBUaHJvd3MgZXhjZXB0aW9uIGlmIGZlYXR1cmVzIGFyZSBtaXNzaW5nLiAqL1xuXHR0aHJvd0Zvck1pc3NpbmdGZWF0dXJlcz86IGJvb2xlYW47XG5cdC8qKiBMb2dzIGlmIGZlYXR1cmVzIGFyZSBtaXNzaW5nLiAqL1xuXHRsb2dNaXNzaW5nRmVhdHVyZXM/OiBib29sZWFuO1xuXHQvKiogS2VlcCBpbWFnZSBkYXRhIGFzIGJ5dGUgYXJyYXkgaW5zdGVhZCBvZiBjYW52YXMuXG5cdCAqIChpbWFnZSBkYXRhIHdpbGwgYXBwZWFyIGluIGBpbWFnZURhdGFgIGZpZWxkcyBpbnN0ZWFkIG9mIGBjYW52YXNgIGZpZWxkcylcblx0ICogVGhpcyBhdm9pZHMgaXNzdWVzIHdpdGggY2FudmFzIHByZW11bHRpcGxpZWQgYWxwaGEgY29ycnVwdGluZyBpbWFnZSBkYXRhLiAqL1xuXHR1c2VJbWFnZURhdGE/OiBib29sZWFuO1xuXHQvKiogTG9hZHMgdGh1bWJuYWlsIHJhdyBkYXRhIGluc3RlYWQgb2YgZGVjb2RpbmcgaXQncyBjb250ZW50IGludG8gY2FudmFzLlxuXHQgKiBgdGh1bW5haWxSYXdgIGZpZWxkIGlzIHVzZWQgaW5zdGVhZC4gKi9cblx0dXNlUmF3VGh1bWJuYWlsPzogYm9vbGVhbjtcblx0LyoqIFVzZW5kIG9ubHkgZm9yIGRldmVsb3BtZW50ICovXG5cdGxvZ0RldkZlYXR1cmVzPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXcml0ZU9wdGlvbnMge1xuXHQvKiogQXV0b21hdGljYWxseSBnZW5lcmF0ZXMgdGh1bWJuYWlsIGZyb20gY29tcG9zaXRlIGltYWdlLiAqL1xuXHRnZW5lcmF0ZVRodW1ibmFpbD86IGJvb2xlYW47XG5cdC8qKiBUcmltcyB0cmFuc3BhcmVudCBwaXhlbHMgZnJvbSBsYXllciBpbWFnZSBkYXRhLiAqL1xuXHR0cmltSW1hZ2VEYXRhPzogYm9vbGVhbjtcblx0LyoqIEludmFsaWRhdGVzIHRleHQgbGF5ZXIgZGF0YSwgZm9yY2luZyBQaG90b3Nob3AgdG8gcmVkcmF3IHRoZW0gb24gbG9hZC5cblx0ICogIFVzZSB0aGlzIG9wdGlvbiBpZiB5b3UncmUgdXBkYXRpbmcgbG9hZGVkIHRleHQgbGF5ZXIgcHJvcGVydGllcy4gKi9cblx0aW52YWxpZGF0ZVRleHRMYXllcnM/OiBib29sZWFuO1xuXHQvKiogTG9ncyBpZiBmZWF0dXJlcyBhcmUgbWlzc2luZy4gKi9cblx0bG9nTWlzc2luZ0ZlYXR1cmVzPzogYm9vbGVhbjtcblx0LyoqIEZvcmNlcyBib3R0b20gbGF5ZXIgdG8gYmUgdHJlYXRlZCBhcyBsYXllciBhbmQgbm90IGJhY2tncm91bmQgZXZlbiB3aGVuIGl0J3MgbWlzc2luZyBhbnkgdHJhbnNwYXJlbmN5XG5cdCAqIFx0KGJ5IGRlZmF1bHQgUGhvdG9zaG9wIHRyZWF0cyBib3R0b20gbGF5ZXIgYXMgYmFja2dyb3VuZCBpdCBpdCBkb2Vzbid0IGhhdmUgYW55IHRyYW5zcGFyZW50IHBpeGVscykgKi9cblx0bm9CYWNrZ3JvdW5kPzogYm9vbGVhbjtcblx0LyoqIFNhdmVzIGRvY3VtZW50IGFzIFBTQiAoTGFyZ2UgRG9jdW1lbnQgRm9ybWF0KSBmaWxlICovXG5cdHBzYj86IGJvb2xlYW47XG59XG4iXSwic291cmNlUm9vdCI6Ii9Vc2Vycy9icmFuZG9ubGl1L0Rlc2t0b3Avc2t5bGFiL2FnLXBzZC9zcmMifQ==
