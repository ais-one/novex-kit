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
      // TODO change ['button-snap'] to 'button-snap'
      'button-snap': this.shadowRoot.querySelector('#snap'),
      'button-unsnap': this.shadowRoot.querySelector('#unsnap'),
    };

    const slots = this.shadowRoot.querySelectorAll('slot');
    const slotMap = {};
    slots.forEach(slot => {
      slotMap[slot.name] = slot;
      slot.addEventListener('slotchange', e => {
        if (this.slotNode[slot.name]) {
          const nodes = slot.assignedNodes();
          const btnNode = nodes[0];
          this.slotNode[slot.name].removeEventListener('click', this.capture);
          this.slotNode[slot.name] = btnNode;
          if (slot.name === 'button-snap') this.slotNode[slot.name].style.display = 'block';
          if (slot.name === 'button-unsnap') this.slotNode[slot.name].style.display = 'none';
          this.slotNode[slot.name].addEventListener('click', this.capture);
        }
      });
    });
  }

  static get observedAttributes() {
    return ['show'];
  }

  // getter and setter for property - show
  get show() {
    return this.hasAttribute('show');
  }

  set show(value) {
    value ? this.setAttribute('show', '') : this.removeAttribute('show');
  }

  // added to the DOM
  connectedCallback() {
    this.width = this.getAttribute('width') || 320;
    this.height = this.getAttribute('height') || 240;

    this.slotNode['button-snap'].addEventListener('click', this.capture);
    this.slotNode['button-unsnap'].addEventListener('click', this.capture);

    const containerEl = this.shadowRoot.querySelector('.container');
    containerEl.style.width = `${this.width}px`;
    containerEl.style.height = `${this.height}px`;

    const videoEl = this.shadowRoot.querySelector('#video');
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        try {
          videoEl.srcObject = stream;
        } catch (e) {
          videoEl.src = window.URL.createObjectURL(stream);
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
    this.slotNode['button-snap'].removeEventListener('click', this.capture);
    this.slotNode['button-unsnap'].removeEventListener('click', this.capture);
  }

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
      this.slotNode['button-snap'].style.display = 'none';
      this.slotNode['button-unsnap'].style.display = 'block';

      const event = new CustomEvent('snap', {
        detail: canvas.toDataURL('image/png'),
      });
      this.dispatchEvent(event);

      this.captureMode = false;
    } else {
      videoEl.play();
      this.captureMode = true;
      this.slotNode['button-snap'].style.display = 'block';
      this.slotNode['button-unsnap'].style.display = 'none';
      // set image data back to empty
    }
  }
}

customElements.define('vcxwc-web-cam', WebCam);
