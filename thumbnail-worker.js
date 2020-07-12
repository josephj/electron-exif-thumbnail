const appendBuffer = (buffer1, buffer2) => {
  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp;
};

const fetchEXIFThumb = async (url) => {
  const response = await fetch(url);
  const reader = response.body.getReader();
  let result = await reader.read();
  let start;
  let end;
  let buffer;
  let stream;
  let total = 0;
  while (!result.done) {
    const { value } = result;
    total += 1;
    buffer = buffer ? appendBuffer(buffer, value) : new Uint8Array(value);
    for (let i = start ? start + 1 : 2, j = buffer.length; i < j; i += 1) {
      if (buffer[i] !== 0xff) continue; // eslint-disable-line
      if (!start && buffer[i + 1] === 0xd8) {
        start = i;
        continue; // eslint-disable-line
      }
      if (start && buffer[i + 1] === 0xd9) end = i + 2;
    }

    if (start && end) {
      stream = buffer.subarray(start, end);
      console.log('start', start, 'end', end);
      reader.cancel('success');
      break;
    }

    // stop streaming
    if (buffer.length > 80000) {
      reader.cancel('cannot find thumbail');
      break;
    }

    result = await reader.read(); // eslint-disable-line
  }
  return new Response(stream)?.blob();
};
onmessage = (e) => {
  const { path } = e.data;
  fetchEXIFThumb(path)
    .then((blob) => {
      // console.log("path", path, "url", url);
      postMessage({ blob });
    })
    .catch((e) => {
      console.info('Error: ', e.message, path);
    });
};
