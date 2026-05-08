// FRONTEND ONLY
const template = document.createElement('template');
template.innerHTML = `
<style>
body {
  background-color: #F0F0F0;
}
.container{
  position: relative;
  width: 320px;
  height: 240px;
}
.container>.button2 {
  background: url('http://cdn1.iconfinder.com/data/icons/iconslandplayer/PNG/64x64/CircleBlue/Play1Pressed.png') center center no-repeat;
  height: 64px;
  left: 50%;
  margin: -32px 0 0 -32px;
  position: absolute;
  top: 50%;
  width: 64px;
  z-index: 1; 
}

.container>slot>.button {
  top: 5%;
  right: 5%;
  position: absolute;
  z-index: 1; 
}

::slotted(button) {
  top: var(--vcxwc-web-cam-top, 25%);
  right: var(--vcxwc-web-cam-top, 25%);
  position: absolute;
  z-index: 1; 
}

#video {
  background-color: #000000;
}
#snap {
  display: block;
}
#unsnap {
  display: none;
}

</style>
<div class="container">
  <video id="video" width="320" height="240" autoplay></video>
  <slot name="button-snap">
    <button class="button" id="snap">Take Photo</button>
  </slot>
  <slot name="button-unsnap">
    <button class="button" id="unsnap">Start Camera</button>
  </slot>
</div>
`;

/**
 * Web-cam capture component. Streams the device camera into a `<video>` element
 * and lets the user take a photo. The captured image is emitted as a PNG data URL.
 *
 * @element vcxwc-web-cam
 * @attr {boolean} show - when present, the component is considered visible
 * @attr {number} width - video/canvas width in px (default 320)
 * @attr {number} height - video/canvas height in px (default 240)
 * @slot button-snap - button that triggers capture (default: "Take Photo")
 * @slot button-unsnap - button that restarts the camera after capture (default: "Start Camera")
 * @fires snap - when a photo is taken (detail: PNG data URL string)
 */
class WebCam extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(template.content.cloneNode(true));

    this.capture = this.capture.bind(this); // bind callback function
    // captures: []

    this.slotNode = {
      buttonSnap: this.shadowRoot.querySelector('#snap'),
      buttonUnsnap: this.shadowRoot.querySelector('#unsnap'),
    };

    // Map slot names to camelCase slotNode keys
    const slotKeyMap = { 'button-snap': 'buttonSnap', 'button-unsnap': 'buttonUnsnap' };
    const slots = this.shadowRoot.querySelectorAll('slot');
    slots.forEach(slot => {
      slot.addEventListener('slotchange', () => {
        const key = slotKeyMap[slot.name];
        if (!key || !this.slotNode[key]) return;
        const btnNode = slot.assignedNodes()[0];
        this.slotNode[key].removeEventListener('click', this.capture);
        this.slotNode[key] = btnNode;
        this.slotNode[key].style.display = slot.name === 'button-snap' ? 'block' : 'none';
        this.slotNode[key].addEventListener('click', this.capture);
      });
    });
  }

  static get observedAttributes() {
    return ['show'];
  }

  /** @returns {boolean} true when the component is marked visible */
  get visible() {
    return this.hasAttribute('show');
  }

  /** Mark the component as visible by adding the `show` attribute. */
  show() {
    this.setAttribute('show', '');
  }

  /** Mark the component as hidden by removing the `show` attribute. */
  hide() {
    this.removeAttribute('show');
  }

  // added to the DOM
  connectedCallback() {
    this.width = this.getAttribute('width') || 320;
    this.height = this.getAttribute('height') || 240;

    this.slotNode.buttonSnap.addEventListener('click', this.capture);
    this.slotNode.buttonUnsnap.addEventListener('click', this.capture);

    const containerEl = this.shadowRoot.querySelector('.container');
    containerEl.style.width = `${this.width}px`;
    containerEl.style.height = `${this.height}px`;

    const videoEl = this.shadowRoot.querySelector('#video');
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        if ('srcObject' in videoEl) {
          videoEl.srcObject = stream;
        } else {
          videoEl.src = globalThis.URL.createObjectURL(stream);
        }
        videoEl.play();
      });
    }
    videoEl.setAttribute('width', this.width);
    videoEl.setAttribute('height', this.height);

    this.captureMode = true;
  }

  // attributeChangedCallback(name, oldVal, newVal) {} // attribute changed
  // adoptedCallback() {} // moved into a new document

  // removed from the DOM
  disconnectedCallback() {
    this.slotNode.buttonSnap.removeEventListener('click', this.capture);
    this.slotNode.buttonUnsnap.removeEventListener('click', this.capture);
  }

  /**
   * Take a photo from the current video frame, or restart the camera after a capture.
   * When capturing: pauses video, dispatches `snap` with the PNG data URL.
   * When restarting: resumes video playback.
   */
  capture() {
    const videoEl = this.shadowRoot.querySelector('#video');
    if (this.captureMode) {
      const scale = 1;
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.clientWidth * scale;
      canvas.height = videoEl.clientHeight * scale;
      canvas.getContext('2d').drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      videoEl.pause();

      // console.log('videoEl', canvas.toDataURL('image/png'))
      this.slotNode.buttonSnap.style.display = 'none';
      this.slotNode.buttonUnsnap.style.display = 'block';

      const event = new CustomEvent('snap', {
        detail: canvas.toDataURL('image/png'),
      });
      this.dispatchEvent(event);

      this.captureMode = false;
    } else {
      videoEl.play();
      this.captureMode = true;
      this.slotNode.buttonSnap.style.display = 'block';
      this.slotNode.buttonUnsnap.style.display = 'none';
      // set image data back to empty
    }
  }
}

customElements.define('vcxwc-web-cam', WebCam);
