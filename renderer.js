const fs = require("fs");
const path = require("path");
const { remote } = require("electron");
const dialog = remote.dialog;
const win = remote.getCurrentWindow();

const listEl = document.getElementById("photo-list");
document.getElementById("load-photos").addEventListener("click", async () => {
  listEl.innerHTML = "";
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"],
  });
  const folderPath = result.filePaths[0];
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.log("Unable to scan directory: " + err);
      return;
    }

    files.forEach((file) => {
      const worker = new Worker("thumbnail-worker.js");
      worker.onmessage = function (e) {
        const { url } = e.data;
        const imageEl = document.createElement("img");
        imageEl.src = url;
        imageEl.width = 300;
        listEl.appendChild(imageEl);
      };
      worker.postMessage({ path: path.join(folderPath, file) });
    });
  });
});
