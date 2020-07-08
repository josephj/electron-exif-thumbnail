const appendBuffer = (buffer1, buffer2) => {
  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp;
};

const fetchEXIFThumb = (url) => {
  return fetch(url)
    .then((response) => {
      const reader = response.body.getReader();
      let start, end, buffer;
      return new ReadableStream({
        start(controller) {
          return pump();
          function pump() {
            return reader.read().then(({ done, value }) => {
              buffer = buffer
                ? appendBuffer(buffer, value)
                : new Uint8Array(value);
              for (var i = 2; i < buffer.length; i++) {
                if (buffer[i] != 0xff) continue;
                if (!start && buffer[i + 1] == 0xd8) {
                  start = i;
                  continue;
                }
                if (start && buffer[i + 1] == 0xd9) end = i + 2;
              }

              if (start && end) {
                const stream = buffer.subarray(start, end);
                controller.enqueue(stream);
                controller.close();
                reader.cancel();
                return;
              }

              if (done) {
                controller.close();
                return;
              }

              controller.enqueue(value);
              return pump();
            });
          }
        },
      });
    })
    .then((stream) => new Response(stream))
    .then((response) => response.blob())
    .then((blob) => URL.createObjectURL(blob));
};

onmessage = (e) => {
  const { path } = e.data;
  fetchEXIFThumb(path)
    .then((url) => {
      // console.log("path", path, "url", url);
      postMessage({ url });
    })
    .catch((e) => {
      console.info("Error: ", e.message, path);
    });
};
