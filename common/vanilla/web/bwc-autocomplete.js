/*
Autocomplete component using input and datalist.
Only able to handle single selection due to nature of datalist not able to have click event

attributes:
- value (via v-model)
- required
- disabled
- listid (needed if using more than 2 components on the same page)
- input-class (style the input)

properties:
- items Array or String or Object

methods:
- setList(items) // should be private, called when items property changes

events emitted:
- @input (via v-model) - e.target.value
- @search - e.detail String
- @selected - e.detail String or Object or null

if selected data is null (no match found, else match found)

Usage with (VueJS):

<bwc-autocomplete required :items="ac.items" v-model="ac.value" @search="(e) => autoComplete(e)" @selected=></bwc-autocomplete>

const ac = reactive({
  value: 'a',
  items: ['aa9','aa5']
})

const autoComplete = (e) => {
  const list = ['aa1', 'aa15', 'aa16', 'aa17', 'aa18', 'aa19', 'aa20', 'aa21', 'aa22', 'aa23']
  const result = []
  for (let i = 0; i < list.length; i++) {
    if (list[i].includes(e.detail)) result.push(list[i])
  }
  ac.items = result
}

*/
const template = document.createElement('template');
template.innerHTML = /*html*/ `
<input type="text" list="json-datalist" placeholder="search..." autocomplete="off">
<datalist id="json-datalist"></datalist>
`;

/**
 * Single-value autocomplete input backed by a native `<datalist>`.
 *
 * @element bwc-autocomplete
 * @attr {string} value - current input value (v-model compatible)
 * @attr {boolean} required - marks the inner input as required
 * @attr {boolean} disabled - disables the inner input
 * @attr {string} listid - unique id for the datalist element (required when multiple instances coexist)
 * @attr {string} input-class - CSS class applied to the inner input
 * @prop {string[]|{ key: string, text: string }[]} items - suggestion list; set this property directly
 * @fires input - when the value changes (detail: string)
 * @fires search - when the user types a value not in the list (detail: string)
 * @fires selected - when the user selects or clears an item (detail: string|{key,text}|null)
 */
class AutoComplete extends HTMLElement {
  #items = [];
  selectedItem = null;

  constructor() {
    super();
    this.inputFn = this.inputFn.bind(this);
  }

  connectedCallback() {
    this.appendChild(template.content.cloneNode(true));

    this.querySelector('datalist').id = this.listid;
    this.querySelector('input').setAttribute('list', this.listid);

    const el = this.querySelector('input');
    el.addEventListener('input', this.inputFn);

    el.onblur = () => {
      const found = this.items.find(item =>
        typeof item === 'string' ? item === this.value : item.key === this.value || item.text === this.value,
      );
      if (found) {
        if (!this.selectedItem) {
          this.selectedItem = found;
          this.dispatchEvent(new CustomEvent('selected', { detail: this.selectedItem }));
        }
      } else if (this.selectedItem) {
        this.selectedItem = null;
        this.dispatchEvent(new CustomEvent('selected', { detail: this.selectedItem }));
      }
    };

    el.value = this.value;
    el.className = this.inputClass || 'input';

    if (this.required) el.setAttribute('required', '');
    else el.removeAttribute('required');
    if (this.disabled) el.setAttribute('disabled', '');
    else el.removeAttribute('disabled');

    this.setList(this.items);
  }

  disconnectedCallback() {
    this.querySelector('input').removeEventListener('input', this.inputFn);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    const el = this.querySelector('input');
    switch (name) {
      case 'value':
        if (el) el.value = newVal;
        this.dispatchEvent(new CustomEvent('input', { detail: newVal }));
        break;
      case 'required':
        el?.setAttribute('required', '');
        break;
      case 'disabled':
        el?.setAttribute('disabled', '');
        break;
      case 'input-class':
        if (el) el.className = newVal;
        break;
      default:
        break;
    }
  }

  static get observedAttributes() {
    return ['value', 'required', 'listid', 'disabled', 'input-class'];
  }

  get value() {
    return this.getAttribute('value');
  }
  set value(val) {
    this.setAttribute('value', val);
  }

  get required() {
    return this.hasAttribute('required');
  }
  set required(val) {
    this.toggleAttribute('required', val);
  }

  get listid() {
    return this.getAttribute('listid');
  }
  set listid(val) {
    this.setAttribute('listid', val);
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }
  set disabled(val) {
    this.toggleAttribute('disabled', val);
  }

  get inputClass() {
    return this.getAttribute('input-class');
  }
  set inputClass(val) {
    this.setAttribute('input-class', val);
  }

  get items() {
    return this.#items;
  }
  set items(val) {
    this.#items = val;
    this.setList(val);
  }

  inputFn() {
    const el = this.querySelector('input');
    const prevItem = this.selectedItem;
    this.value = el.value;

    const found = this.items.find(item =>
      typeof item === 'string' ? item === this.value : item.key === this.value || item.text === this.value,
    );
    if (found) {
      this.selectedItem = found;
    } else {
      this.selectedItem = null;
      this.dispatchEvent(new CustomEvent('search', { detail: this.value }));
    }
    if (prevItem !== this.selectedItem) {
      this.dispatchEvent(new CustomEvent('selected', { detail: this.selectedItem }));
    }
  }

  /**
   * Rebuild the datalist options from the given items array.
   * @param {string[]|{ key: string, text: string }[]} _items
   */
  setList(_items) {
    const dd = this.querySelector('datalist');
    if (!dd) return;
    while (dd.firstChild) dd.lastChild.remove();
    if (typeof _items !== 'object') return;

    _items.forEach(item => {
      const li = document.createElement('option');
      li.innerHTML = typeof item === 'string' ? item : item.key;
      li.value = typeof item === 'string' ? item : item.text;
      dd.appendChild(li);
    });
  }
}

customElements.define('bwc-autocomplete', AutoComplete);
