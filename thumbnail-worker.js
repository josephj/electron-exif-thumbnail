const appendBuffer = (buffer1, buffer2) => {
  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp;
};

const fetchEXIFThumb = (url) =>
  fetch(url)
    .then((response) => {
      const reader = response.body.getReader();
      let start;
      let end;
      let buffer;
      return new ReadableStream({
        start(controller) {
          function pump() {
            return reader.read().then(({ done, value }) => {
              console.log(url, 'value', value.length);
              buffer = buffer
                ? appendBuffer(buffer, value)
                : new Uint8Array(value);
              for (let i = 2, j = buffer.length; i < j; i += 1) {
                if (buffer[i] !== 0xff) continue; // eslint-disable-line
                if (!start && buffer[i + 1] === 0xd8) {
                  start = i;
                  continue; // eslint-disable-line
                }
                if (start && buffer[i + 1] === 0xd9) end = i + 2;
              }

              if (start && end) {
                const stream = buffer.subarray(start, end);
                controller.enqueue(stream);
                controller.close();
                reader.cancel('success');
                return;
              }

              if (done) {
                controller.close();
                return;
              }

              // stop streaming
              if (buffer.length > 80000) {
                controller.close();
                reader.cancel('cannot find thumbail');
                return;
              }

              controller.enqueue(value);
              return pump(); // eslint-disable-line
            });
          }
          return pump();
        },
        cancel(reason) {
          throw reason;
        },
      });
    })
    .then((stream) => new Response(stream))
    .then((response) => response.blob());

onmessage = (e) => {
  const { path } = e.data;
  fetchEXIFThumb(path)
    .then(blob => {
      // console.log("path", path, "url", url);
      postMessage({ blob });
    })
    .catch((e) => {
      console.info('Error: ', e.message, path);
    });
};
