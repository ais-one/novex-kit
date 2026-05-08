// // First get a public key from our Express server
// We use this function to subscribe to our push notifications
// As soon as you run this code once, it shouldn't run again if the initial subscription went well
// Except if you clear your storage
/**
 * Subscribe the current browser to Web Push using the given VAPID public key.
 * Returns a serialised `PushSubscription` JSON string ready to send to the server.
 * @param {string} publicKey - VAPID public key (base64url encoded)
 * @returns {Promise<string>} - JSON-serialised PushSubscription
 */
export const webpushSubscribe = async publicKey => {
  const registration = await navigator.serviceWorker.ready;
  // NOSONAR
  // alternate = navigator.serviceWorker.getRegistration()
  // let subscription = await registration.pushManager.getSubscription()
  // if (subscription) return subscription

  // this is an annoying part of the process we have to turn our public key into a Uint8Array
  const Uint8ArrayPublicKey = urlBase64ToUint8Array(publicKey);

  // registering a new subscription to our service worker's Push manager
  let subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true, // chrome only supports user visible for now
    applicationServerKey: Uint8ArrayPublicKey,
  });
  subscription = JSON.stringify(subscription);

  // console.log('subscription', subscription)
  return subscription;
};

// Let's create an unsubscribe function as well
/**
 * Unsubscribe the current browser from Web Push.
 * @returns {Promise<void>}
 */
export const webpushUnsubscribe = async () => {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) await subscription.unsubscribe(); // This tells our browser that we want to unsubscribe
};
// This tells our Express server that we want to unsubscribe
// await fetch(VITE_API_URL + '/api/webpush/unsub?subId=test', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify(subscription.toJSON())
// })

// I have found this code (or variations of) from; multiple sources
// but I could not find the original author
// here's one such source:
// https://stackoverflow.com/questions/42362235/web-pushnotification-unauthorizedregistration-or-gone-or-unauthorized-sub
/**
 * Convert a base64url-encoded VAPID public key to a Uint8Array suitable for `applicationServerKey`.
 * @param {string} base64String - base64url string
 * @returns {Uint8Array}
 */
const urlBase64ToUint8Array = base64String => {
  // const padding = '='.repeat((4 - base64String.length % 4) % 4)
  // const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  // https://stackoverflow.com/questions/52379865/eslint-replace-cant-read-method
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replaceAll('-', '+').replaceAll('_', '/');

  const rawData = globalThis.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.codePointAt(i);
  }
  return outputArray;
};

/**
 * Default service-worker message handler (no-op).
 * Override by passing a custom handler to `addSwMessageEvent`.
 * @param {MessageEvent} e
 */
const handleSwMessage = async e => {
  // console.log('handleSwMessage', e)
  //NOSONAR if (e && e.data && e.data.msg === 'pushsubscriptionchange') { }
};

/**
 * Register a service-worker message listener.
 * @param {Function} [handler] - defaults to the built-in no-op handler
 */
export const addSwMessageEvent = (handler = handleSwMessage) => {
  navigator.serviceWorker.addEventListener('message', handler);
};

/**
 * Remove a previously registered service-worker message listener.
 * @param {Function} [handler] - must be the same reference passed to `addSwMessageEvent`
 */
export const removeSwMessageEvent = (handler = handleSwMessage) => {
  navigator.serviceWorker.removeEventListener('message', handler);
};

// https://felixgerschau.com/how-to-communicate-with-service-workers/
// app to sw
// // app.js - Somewhere in your web app
// navigator.serviceWorker.controller.postMessage({
//   type: 'MESSAGE_IDENTIFIER',
// })
// service-worker.js
// On the Service Worker side we have to listen to the message event
// self.addEventListener('message', (e) => {
//   if (e.data && e.data.type === 'MESSAGE_IDENTIFIER') {
//     // do something
//   }
// })
