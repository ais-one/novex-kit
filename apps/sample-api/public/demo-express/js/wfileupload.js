import * as mod from '/esm/upload-fe-testing.js';

var files = [];
var p = true;

// function upload(blobOrFile) {
//   var xhr = new XMLHttpRequest()
//   xhr.open('POST', '/server', false)
//   xhr.onload = function (e) { }
//   xhr.send(blobOrFile)
// }

async function process() {
  p = false;
  const result = await mod.uploadFiles(files);
  console.log(result);
  if (result.ok) {
    self.postMessage('Files Uploaded Succesfully');
  } else {
    const msg = result.message.includes('MulterError:') ? result.message.split('\n', 1) : 'Unknown'; // TODO move text transform to backend API instead?
    self.postMessage(msg);
  }
  p = true;
  // for (var j = 0; j < files.length; j++) {
  //   var blob = files[j]
  //   const BYTES_PER_CHUNK = 1024 * 1024

  //   // 1MB chunk sizes.
  //   const SIZE = blob.size
  //   var start = 0
  //   var end = BYTES_PER_CHUNK
  //   while (start < SIZE) {
  //     if ('mozSlice' in blob) {
  //       var chunk = blob.mozSlice(start, end)
  //     } else {
  //       var chunk = blob.webkitSlice(start, end)
  //     }
  //     upload(chunk)
  //     start = end;
  //     end = start + BYTES_PER_CHUNK;
  //   }
  //   p = (j = files.length - 1) ? true : false;
  //   self.postMessage(blob.name + " Uploaded Succesfully")
  // }
}

self.onmessage = e => {
  // self.postMessage('Data Len: ' + e.data.files.length)
  for (let j = 0; j < e.data.files.length; j++) {
    files.push(e.data.files[j]);
  }
  if (p) {
    process();
  }
};
