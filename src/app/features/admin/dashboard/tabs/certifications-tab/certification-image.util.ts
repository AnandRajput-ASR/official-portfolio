export function removeImageBackgroundToPng(
  source: string,
  resolveSourceUrl: (source: string) => string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        ctx.drawImage(image, 0, 0);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = frame.data;
        const width = canvas.width;
        const height = canvas.height;

        const corners = [
          pixelAt(data, width, 0, 0),
          pixelAt(data, width, width - 1, 0),
          pixelAt(data, width, 0, height - 1),
          pixelAt(data, width, width - 1, height - 1),
        ];
        const bg = averagePixel(corners);

        const visited = new Uint8Array(width * height);
        const queue: [number, number][] = [];
        for (let x = 0; x < width; x++) {
          queue.push([x, 0], [x, height - 1]);
        }
        for (let y = 0; y < height; y++) {
          queue.push([0, y], [width - 1, y]);
        }

        const tolerance = 40;
        while (queue.length) {
          const [x, y] = queue.shift() as [number, number];
          const index = y * width + x;
          if (visited[index]) continue;
          visited[index] = 1;

          const rgba = pixelAt(data, width, x, y);
          const nearBackground =
            Math.abs(rgba[0] - bg[0]) <= tolerance &&
            Math.abs(rgba[1] - bg[1]) <= tolerance &&
            Math.abs(rgba[2] - bg[2]) <= tolerance &&
            rgba[3] > 0;

          if (!nearBackground) continue;

          const offset = (y * width + x) * 4;
          data[offset + 3] = 0;

          if (x > 0) queue.push([x - 1, y]);
          if (x < width - 1) queue.push([x + 1, y]);
          if (y > 0) queue.push([x, y - 1]);
          if (y < height - 1) queue.push([x, y + 1]);
        }

        ctx.putImageData(frame, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (processingError) {
        reject(processingError);
      }
    };

    image.onerror = () => reject(new Error('Image load failed'));
    image.src = resolveSourceUrl(source);
  });
}

function pixelAt(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

function averagePixel(
  samples: [number, number, number, number][],
): [number, number, number, number] {
  const sum = samples.reduce(
    (acc, s) => [acc[0] + s[0], acc[1] + s[1], acc[2] + s[2], acc[3] + s[3]],
    [0, 0, 0, 0],
  );
  const n = samples.length || 1;
  return [
    Math.round(sum[0] / n),
    Math.round(sum[1] / n),
    Math.round(sum[2] / n),
    Math.round(sum[3] / n),
  ];
}
