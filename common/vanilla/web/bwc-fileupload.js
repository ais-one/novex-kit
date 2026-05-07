// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file
// attributes: {
//   accept: { type: String, default: '*/*' },
//   value: { type: Object, required: true }
// },

// attributes
// accept: One or more unique file type specifiers describing file types to allow
// capture:	What source to use for capturing image or video data
// files:	A FileList listing the chosen files
// multiple: A Boolean which, if present, indicates that the user may choose more than one file
// required
// value

// Events	change and input
const html = /*html*/ `
  <input type="text" readonly />
  <input type="file" style="display: none" accept="text/csv" onclick="event.stopPropagation()" />
`;

/**
 * File-picker input that shows the selected filename(s) in a readonly text field.
 * Clicking the text field opens the native file picker.
 *
 * @element bwc-fileupload
 * @attr {string} value - comma-separated filename(s) of the current selection
 * @attr {string} accept - file type filter passed to the hidden `<input type="file">`
 * @attr {string} capture - capture source (`'user'` | `'environment'`)
 * @attr {boolean} multiple - allow selecting more than one file
 * @attr {boolean} required - marks the hidden file input as required
 * @attr {string} input-class - CSS class applied to the visible text input
 * @fires input - when files are selected (detail: FileList)
 * @fires change - when files are selected (detail: FileList)
 */
class BwcFileupload extends HTMLElement {
  files = null;

  constructor() {
    super();
    this.click = this.click.bind(this);
    this.change = this.change.bind(this);
  }

  connectedCallback() {
    // this.appendChild(template.content.cloneNode(true))
    this.innerHTML = html;
    this.files = null;

    if (!this.hasAttribute('value')) this.setAttribute('value', '');

    if (this.hasAttribute('input-class'))
      this.querySelector('input[type=text]').setAttribute('class', this.getAttribute('input-class'));

    if (this.hasAttribute('accept'))
      this.querySelector('input[type=file]').setAttribute('accept', this.getAttribute('accept'));
    if (this.hasAttribute('capture'))
      this.querySelector('input[type=file]').setAttribute('capture', this.getAttribute('capture'));
    if (this.hasAttribute('multiple')) this.querySelector('input[type=file]').setAttribute('multiple', '');
    if (this.hasAttribute('required')) this.querySelector('input[type=file]').setAttribute('required', '');

    this.querySelector('input[type=text]').addEventListener('click', this.click);
    this.querySelector('input[type=file]').addEventListener('change', this.change);
  }

  disconnectedCallback() {
    this.querySelector('input[type=text]').removeEventListener('click', this.click);
    this.querySelector('input[type=file]').removeEventListener('change', this.change);
  }

  attributeChangedCallback(name, _oldVal, newVal) {
    if (name === 'value') {
      const el = this.querySelector('input[type=text]');
      if (el) el.value = newVal;
    }
  }

  static get observedAttributes() {
    return ['value', 'class'];
  }
  get value() {
    return this.getAttribute('value');
  }
  set value(val) {
    this.setAttribute('value', val);
  }

  click(e) {
    this.querySelector('input[type=file]').click();
  }

  change(e) {
    this.files = e.target.files;
    this.value = this.files?.length
      ? Array.from(this.files)
          .map(f => f.name)
          .join(',')
      : '';
    this.dispatchEvent(new CustomEvent('input', { detail: this.files }));
    this.dispatchEvent(new CustomEvent('change', { detail: this.files }));
  }
}

customElements.define('bwc-fileupload', BwcFileupload);
