// FRONTEND ONLY
const template = document.createElement('template');
template.innerHTML = `
<style>
  #overlay {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100vh;
    background: rgba(0,0,0,0.75);
    z-index: 10;
    opacity: 1;
    pointer-events: all;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .loader {
    border: 16px solid #888;
    border-top: 16px solid #fff;
    border-radius: 50%;
    width: 64px;
    height: 64px;
    animation: spin 1.5s linear infinite;
  }
  @-webkit-keyframes spin {
    0% { -webkit-transform: rotate(0deg); }
    100% { -webkit-transform: rotate(360deg); }
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }    
</style>
<div id="overlay"><div class="loader"></div></div>
`;
/**
 * Full-screen semi-transparent loading overlay with a spinning indicator.
 * Toggle visibility via the `show` attribute or property.
 *
 * @element bwc-loading-overlay
 * @attr {boolean} show - when present, the overlay is visible
 */
class LoadingOverlay extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(template.content.cloneNode(true));
  }

  static get observedAttributes() {
    return ['show'];
  }
  get show() {
    return this.hasAttribute('show');
  }
  set show(value) {
    value ? this.setAttribute('show', '') : this.removeAttribute('show');
  }
}

customElements.define('bwc-loading-overlay', LoadingOverlay);
