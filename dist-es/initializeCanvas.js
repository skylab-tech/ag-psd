import { createCanvas, Image } from 'canvas';
import { initializeCanvas } from './index';
function createCanvasFromData(data) {
    var image = new Image();
    image.src = Buffer.from(data);
    var canvas = createCanvas(image.width, image.height);
    canvas.getContext('2d').drawImage(image, 0, 0);
    return canvas;
}
initializeCanvas(createCanvas, createCanvasFromData);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluaXRpYWxpemVDYW52YXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDN0MsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sU0FBUyxDQUFDO0FBRTNDLFNBQVMsb0JBQW9CLENBQUMsSUFBZ0I7SUFDN0MsSUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQztJQUMxQixLQUFLLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUIsSUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3ZELE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDaEQsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FBRUQsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLG9CQUFvQixDQUFDLENBQUMiLCJmaWxlIjoiaW5pdGlhbGl6ZUNhbnZhcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZUNhbnZhcywgSW1hZ2UgfSBmcm9tICdjYW52YXMnO1xyXG5pbXBvcnQgeyBpbml0aWFsaXplQ2FudmFzIH0gZnJvbSAnLi9pbmRleCc7XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVDYW52YXNGcm9tRGF0YShkYXRhOiBVaW50OEFycmF5KSB7XHJcblx0Y29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuXHRpbWFnZS5zcmMgPSBCdWZmZXIuZnJvbShkYXRhKTtcclxuXHRjb25zdCBjYW52YXMgPSBjcmVhdGVDYW52YXMoaW1hZ2Uud2lkdGgsIGltYWdlLmhlaWdodCk7XHJcblx0Y2FudmFzLmdldENvbnRleHQoJzJkJykhLmRyYXdJbWFnZShpbWFnZSwgMCwgMCk7XHJcblx0cmV0dXJuIGNhbnZhcztcclxufVxyXG5cclxuaW5pdGlhbGl6ZUNhbnZhcyhjcmVhdGVDYW52YXMsIGNyZWF0ZUNhbnZhc0Zyb21EYXRhKTtcclxuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvYnJhbmRvbmxpdS9EZXNrdG9wL3NreWxhYi9hZy1wc2Qvc3JjIn0=