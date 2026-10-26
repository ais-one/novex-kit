### References

https://github.com/vercel/pkg
https://medium.com/jspoint/how-to-create-an-executable-exe-file-from-javascript-code-using-node-js-45154ba4de20



```js
require('dotenv').config();
```

Your require files which have variables…

const path = require('path')

```js
// Change FROM
let aaa = require(`./xxx/yyy.json`);

// Change TO
const loc = path.join(process.cwd(), `/config/xxx/yyy.json`);
let aaa = require(loc);
```

```bash
npx pkg --targets win ./bin/www
npx pkg --targets linux ./bin/www
npx pkg index.js --targets node14-win-x64 --output rs232.exe
```

### if in package.json

```json
  "bin": "index.js",
  "pkg": {
    "assets": [ "node_modules/**/*", "**/*" ],
    "targets": [ "node14-win-x64" ]
  }
```

```bash
npx pkg .
```
