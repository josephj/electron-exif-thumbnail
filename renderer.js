const fs = require('fs');
const path = require('path');
const { remote } = require('electron');
const dialog = remote.dialog;
const win = remote.getCurrentWindow();

const listEl = document.getElementById('photo-list');
document.getElementById('load-photos').addEventListener('click', async () => {
  listEl.innerHTML = '';
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
  });
  const folderPath = result.filePaths[0];
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.log('Unable to scan directory: ' + err);
      return;
    }

    files.forEach((file, id) => {
      const worker = new Worker('thumbnail-worker.js');

      const itemEl = document.createElement('div');
      itemEl.id = `item-${id}`;
      itemEl.style.display = 'inline-block';
      itemEl.style.position = 'relative';
      itemEl.style.height = '220px';
      itemEl.style.background = '#efefef';
      itemEl.style.margin = '0 5px 5px 0';
      itemEl.style.width = '220px';
      listEl.appendChild(itemEl);

      const lableEl = document.createElement('div');
      lableEl.style.position = 'absolute';
      lableEl.style.textShadow = '0 1px 5px rgba(255, 255, 255, 0.3)';
      lableEl.style.bottom = '5px';
      lableEl.style.right = '5px';
      lableEl.style.fontFamily = 'Arial';
      lableEl.style.fontSize = '11px;';
      lableEl.innerHTML = file;
      itemEl.appendChild(lableEl);

      worker.onmessage = function (e) {
        const { blob } = e.data;
        const itemEl = document.querySelector(`#item-${id}`);
        if (itemEl) {
          const image = new Image();
          const url = URL.createObjectURL(blob);
          image.onload = () => {
            const imgEl = document.createElement('img');
            imgEl.src = url;
            imgEl.width = 220;
            imgEl.height = 220;
            imgEl.style.display = 'block';
            imgEl.style.objectFit = 'contain';
            itemEl.appendChild(imgEl);
          };
          image.src = url;
          worker.terminate();
        }
      };
      worker.postMessage({ path: path.join(folderPath, file) });
    });
  });
});
