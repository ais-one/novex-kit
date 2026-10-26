# Fetch API Notes

## Progress Indicators

https://stackoverflow.com/questions/35711724/upload-progress-indicators-for-fetch

```js
const response = await fetch(url);
const total = Number(response.headers.get('content-length'));
const reader = response.body.getReader();
let bytesReceived = 0;
while (true) {
  const result = await reader.read();
  if (result.done) {
    console.log('Fetch complete');
    break;
  }
  bytesReceived += result.value.length;
  console.log('Received', bytesReceived, 'bytes of data so far');
}
```

## Credentials

1. ES6 fetch()

```
credentials: 'include'
```

3. axios / XMLHttpRequest

```
withCredentials: true
```

3. jQuery 1.5.1

```
xhrFields: { withCredentials: true }
```

## Streams

https://jakearchibald.com/2016/streams-ftw/

```js
// fetch() returns a promise that
// resolves once headers have been received
fetch(url).then(response => {
  // response.body is a readable stream.
  // Calling getReader() gives us exclusive access to
  // the stream's content
  var reader = response.body.getReader();
  var bytesReceived = 0;
  // read() returns a promise that resolves
  // when a value has been received
  return reader.read().then(function processResult(result) {
    // Result objects contain two properties:
    // done  - true if the stream has already given
    //         you all its data.
    // value - some data. Always undefined when
    //         done is true.
    if (result.done) {
      console.log('Fetch complete');
      return;
    }
    // result.value for fetch streams is a Uint8Array
    bytesReceived += result.value.length;
    console.log('Received', bytesReceived, 'bytes of data so far');
    // Read some more, and call this function again
    return reader.read().then(processResult);
  });
});
```

result.value is whatever the creator of the stream provides, which can be anything: a string, number, date, ImageData, DOM element… but in the case of a fetch stream it's always a Uint8Array of binary data. The whole response is each Uint8Array joined together. If you want the response as text, you can use TextDecoder:

```js
var decoder = new TextDecoder();
var reader = response.body.getReader();
// read() returns a promise that resolves
// when a value has been received
reader.read().then(function processResult(result) {
  if (result.done) return;
  console.log(decoder.decode(result.value, { stream: true }));
  // Read some more, and recall this function
  return reader.read().then(processResult);
});
```

## Streams

https://github.com/AnthumChris/fetch-progress-indicators

https://fetch-progress.anthum.com/fetch-enhanced/

## Graphql

Avoid Like The Plugue
https://github.com/benawad/node-graphql-benchmarks


# Web Performance

1. use HTTP2

- enabled on server level

2. 3rd Party Requests

- risks of 3rd party static assets
  - security
  - downtime
  - network negotiation
  - loss or priority ?
- convert 3rd party to 1st party (serve assets locally)
- self-hosted forms also...

3. image resizing

- png to jpg (or a better format)
- one size of desktop, one size for mobile
- ...srcset
  - resolution switching
    <img srcset="elva-fairy-480w.jpg 480w,
               elva-fairy-800w.jpg 800w"
       sizes="(max-width: 600px) 480px,
              800px"
       src="elva-fairy-800w.jpg"
       alt="Elva dressed as a fairy">
  - art direction
    <picture>
    <source media="(max-width: 799px)" srcset="elva-480w-close-portrait.jpg">
    <source media="(min-width: 800px)" srcset="elva-800w.jpg">
    <img src="elva-800w.jpg" alt="Chris standing up holding his daughter Elva">
    </picture>

4. image optimization

- reduce quality
- progressive jpg
- better formats e.g. webp
- gif to mp4 / webm
  <video controls width="250">
  <source src="/media/cc0-videos/flower.webm" type="video/webm">
  <source src="/media/cc0-videos/flower.mp4" type="video/mp4">
  Sorry, your browser doesn't support embedded videos.
  </video>

5. resource hints

- head -> <link rel="dns-prefetch" href="https://some.3pl-or-Cdn.com">
- head -> <link rel="preconnect" href="https://some.3pl-or-Cdn.com">
- head -> <link rel="prefetch" href="https://some.3pl-or-Cdn.com"> // not on safari
- head -> <link rel="preload" href="https://some.3pl-or-Cdn.com/somefile.js" as="script"> // not on safari
- head -> <link rel="prerender" href="https://example.com/another-page"> // not good support

6. async/ defer

- defer: JS exec until HTML fully parsed (script is no longer render blocking)
- async: JS exec as soon as possible, parallel to HTML parsing (JS does not require complete DOM, or dependency on other script being loaded)

7. text compression - works better on larger files

- gzip / brotli (faster but less compression)
- supported by server

8. text asset optimization

- bundling of html/js/css

9. critical CSS

- extract critical css
- cover for desktop and mobile

10. Above the fold

- preload resources above the fold
  - e.g. images above the fold

11. google fonts optimization

- preconnect to fonts.gstatic.com domain, add crossorigin attribute

12. self host fonts & tree shake icons

- @font-face { font-display: swap
- preload of fonts (because self hosted) still makes performance worse, so dont preload fonts
- use system fonts instead of self hosted fonts

13. lazy loading

- intersection observer
- loading="lazy" // check browser support
  - images
  - iframe
- set width & height attributes of images

14. remove unused css / js

15. caching strategies (server side caching)

## Support

The following are supported

- access_token and refresh_token handling by self-made auth server
  - password login + OTP
  - SAML2
  - OAuth2
- access_token and refresh_token handling by certified auth servers (using keycloak in our case)
  - OpenID Connect (OIDC)
    - grant types are
      - authorization_code
      - refresh_token

- https://auth0.com/docs/flows/call-your-api-using-the-authorization-code-flow
- https://stackoverflow.com/questions/11068892/oauth-2-0-authorization-header
- https://datatracker.ietf.org/doc/html/rfc6750#section-2.1

## SRI & Cross Origin

- https://github.com/bigskysoftware/htmx/issues/261#issuecomment-753850081
- https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity
- https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/crossorigin
- crossorigin="anonymous" will not send credentials

To find SRI for unpkg, `https://unpkg.com/htmx.org@1.0.2`, use `https://unpkg.com/htmx.org@1.0.2?meta`

```html
<script
  src="https://unpkg.com/htmx.org@1.0.2"
  integrity="sha384-uG2fggOnt72f9yU5g6r04wPKVnlrpuTRachw1fB6euaHlWgObEcF9zSrDBuBMZ9H"
  crossorigin="anonymous"
></script>
```

---

To Check below...

- https://developers.google.com/learn/pathways/web-identity-forms?hl=en
- https://web.dev/vitals

```css
input[type="email"]:invalid {
  color: red;
}

input[type="email"]:not(:placeholder-shown):invalid {
  color: red;
}
```
