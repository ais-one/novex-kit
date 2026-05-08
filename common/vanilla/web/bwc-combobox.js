// Combobox with autocomplete component using input, custom dropdown (ul/li) and tags

/*
attributes:
- value (via v-model), at the text input
- required
- disabled
- listid (needed if using more than 2 components on the same page)
- input-class (style the input)
- multiple (v2)
- repeat (v2) for multiple selects allow same item to be selected many times
- allow-custom-tag (v2) - allow user defined tags
- object-key
- object-text
- tag-limit - maximum allowed tags

properties:
- items [string] or [{ key, text }]
- tags [string] or [{ key, text }]

methods:
- _setList(items) // should be private, called when items property changes
- _setTags(tags) // should be private, called with tags property changes

events emitted:
- @input (via v-model) - e.target.value
- @search - e.detail String
- @select - e.detail String or Object or null

if selected data is null (no match found, else match found)

Usage with (VueJS):

<bwc-combobox required :items="ac.items" v-model="ac.value" @search="(e) => autoComplete(e)" @select="(e) => selectItem"></bwc-combobox>

// string version
const ac = reactive({ value: 'a', items: ['aa9','aa5'] })

const autoComplete = (e) => {
  const list = ['aa1', 'aa15', 'aa16', 'aa17', 'aa18', 'aa19', 'aa20', 'aa21', 'aa22', 'aa23']
  const result = []
  for (let i = 0; i < list.length; i++) {
    if (list[i].includes(e.detail)) result.push(list[i])
  }
  ac.items = result
}

// object version
[
  { key: 'unique', text: 'longer description' }
]
*/

const template = document.createElement('template');
template.innerHTML = /*html*/ `
<input type="text" placeholder="search..." autocomplete="off">
<span class="icon is-small is-left clear-btn" style="pointer-events:all;cursor:pointer;">
  <i class="fas fa-times"></i>
</span>
<ul class="combobox-dropdown" hidden style="position:absolute;z-index:1000;background:#fff;border:1px solid #ccc;list-style:none;margin:0;padding:0;min-width:100%;max-height:200px;overflow-y:auto;box-shadow:0 2px 6px rgba(0,0,0,.15);"></ul>
`;

/**
 * Combobox with optional multi-select tags, backed by a custom `<ul>` dropdown.
 *
 * @element bwc-combobox
 * @attr {string} value - current input value (v-model compatible)
 * @attr {boolean} required - marks the inner input as required
 * @attr {boolean} disabled - disables the inner input
 * @attr {string} listid - kept for backwards compat, no longer required
 * @attr {string} input-class - CSS class applied to the inner input
 * @attr {boolean} multiple - enable multi-select tag mode
 * @attr {boolean} repeat - allow the same item to be tagged more than once
 * @attr {boolean} allow-custom-tag - allow user-defined tags not in the suggestion list
 * @attr {string} object-key - property name used as the key when items are objects
 * @attr {string} object-text - property name used as the display text when items are objects
 * @attr {number} tag-limit - maximum number of tags (0 = unlimited)
 * @prop {string[]|{ [key]: string, [text]: string }[]} items - suggestion list
 * @prop {string[]|{ [key]: string, [text]: string }[]} tags - current selected tags (multi-select)
 * @fires load - after connectedCallback finishes setup
 * @fires input - when the input value changes (detail: string)
 * @fires search - when the user types a value not in the list (detail: string)
 * @fires select - when a selection changes (detail: item|item[]|null)
 */
class BwcCombobox extends HTMLElement {
  #items = [];
  #tags = [];
  #selected = null;
  #key = '';
  #text = '';

  #elTags = null;
  #elInput = null;
  #elList = null;
  #elClearBtn = null;

  #multiple = false;
  #repeat = false;
  #allowCustomTag = false;
  #tagLimit = 0;
  #tagClass = 'tag is-black';
  #tagsClass = 'tags';
  #highlighted = -1;

  constructor() {
    super();
    this._onInput = this._onInput.bind(this);
  }

  connectedCallback() {
    this.appendChild(template.content.cloneNode(true));

    this.style.position = 'relative';
    this.style.display = 'inline-block';

    this.#elInput = this.querySelector('input');
    this.#elList = this.querySelector('ul');
    this.#elClearBtn = this.querySelector('.clear-btn');

    this._onFocus = () => this.#showDropdown();
    this._onKeydown = e => this.#onKeydown(e);
    this.#elInput.addEventListener('input', this._onInput);
    this.#elInput.addEventListener('focus', this._onFocus);
    this.#elInput.addEventListener('keydown', this._onKeydown);

    this.#allowCustomTag = this.hasAttribute('allow-custom-tag');
    this.#multiple = this.hasAttribute('multiple');
    this.#repeat = this.hasAttribute('repeat');

    if (this.hasAttribute('tag-limit')) this.#tagLimit = Number(this.getAttribute('tag-limit'));
    if (this.hasAttribute('object-key')) this.#key = this.getAttribute('object-key');
    if (this.hasAttribute('object-text')) this.#text = this.getAttribute('object-text');
    if (this.hasAttribute('tag-class')) this.#tagClass = this.getAttribute('tag-class');
    if (this.hasAttribute('tags-class')) this.#tagsClass = this.getAttribute('tags-class');

    if (this.#multiple) {
      this.#elTags = document.createElement('div');
      this.#elTags.className = this.#tagsClass;
      this.append(this.#elTags);
    }

    this.#elClearBtn.onclick = () => {
      this.#elInput.value = '';
      if (!this.#multiple) {
        this.#selected = null;
        this.dispatchEvent(new CustomEvent('select', { detail: this.#selected }));
      }
    };
    this.#elInput.onblur = () => this.#onBlur();

    this.#elInput.value = this.value;
    this.#elInput.className = this.inputClass || 'input';
    this.required ? this.#elInput.setAttribute('required', '') : this.#elInput.removeAttribute('required');
    this.disabled ? this.#elInput.setAttribute('disabled', '') : this.#elInput.removeAttribute('disabled');
    this._setList(this.items);

    this.dispatchEvent(new CustomEvent('load'));
    if (!this.#items.length) this.dispatchEvent(new CustomEvent('search', { detail: '' }));
  }

  disconnectedCallback() {
    this.#elInput.removeEventListener('input', this._onInput);
    this.#elInput.removeEventListener('focus', this._onFocus);
    this.#elInput.removeEventListener('keydown', this._onKeydown);
  }

  attributeChangedCallback(name, _oldVal, newVal) {
    const el = this.#elInput;
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
      case 'tag-class':
        this.#tagClass = newVal;
        break;
      case 'tags-class':
        this.#tagsClass = newVal;
        if (this.#elTags) this.#elTags.className = newVal;
        break;
      default:
        break;
    }
  }

  static get observedAttributes() {
    return ['value', 'required', 'listid', 'disabled', 'input-class', 'tag-class', 'tags-class'];
  }

  /** @returns {string} current input value */
  get value() {
    return this.getAttribute('value');
  }
  /** @param {string} val */
  set value(val) {
    this.setAttribute('value', val);
  }

  /** @returns {boolean} */
  get required() {
    return this.hasAttribute('required');
  }
  /** @param {boolean} val */
  set required(val) {
    this.toggleAttribute('required', val);
  }

  /** @returns {string} */
  get listid() {
    return this.getAttribute('listid');
  }
  /** @param {string} val */
  set listid(val) {
    this.setAttribute('listid', val);
  }

  /** @returns {boolean} */
  get disabled() {
    return this.hasAttribute('disabled');
  }
  /** @param {boolean} val */
  set disabled(val) {
    this.toggleAttribute('disabled', val);
  }

  /** @returns {string} CSS class applied to the inner `<input>` */
  get inputClass() {
    return this.getAttribute('input-class');
  }
  /** @param {string} val */
  set inputClass(val) {
    this.setAttribute('input-class', val);
  }

  /** @returns {string} CSS class applied to each tag `<span>` */
  get tagClass() {
    return this.getAttribute('tag-class');
  }
  /** @param {string} val */
  set tagClass(val) {
    this.setAttribute('tag-class', val);
  }

  /** @returns {string} CSS class applied to the tags container `<div>` */
  get tagsClass() {
    return this.getAttribute('tags-class');
  }
  /** @param {string} val */
  set tagsClass(val) {
    this.setAttribute('tags-class', val);
  }

  /** @returns {string[]|object[]} current suggestion list */
  get items() {
    return this.#items;
  }
  /** @param {string[]|object[]} val - replaces the suggestion list and re-renders the dropdown */
  set items(val) {
    this.#items = val;
    this._setList(val);
  }

  /** @returns {string[]|object[]} current selected tags (multi-select mode) */
  get tags() {
    return this.#tags;
  }
  /** @param {string[]|object[]} val - replaces all tags */
  set tags(val) {
    this._setTags(val);
  }

  /** @returns {string|object|null} currently selected item (single-select mode) */
  get selected() {
    return this.#selected;
  }
  /** @param {string|object|null} val - sets the selected item and syncs the input display */
  set selected(val) {
    this.#selected = val;
    if (!this.#elInput) return;
    if (val == null) {
      this.#elInput.value = '';
    } else if (this._isStringType()) {
      this.#elInput.value = val;
    } else {
      this.#elInput.value = val[this.#text] ?? val[this.#key] ?? '';
    }
  }

  #showDropdown() {
    if (this.#elList.children.length > 0) this.#elList.removeAttribute('hidden');
  }

  #hideDropdown() {
    this.#elList.setAttribute('hidden', '');
    for (const li of this.#elList.children) li.style.background = '';
    this.#highlighted = -1;
  }

  #highlightItem(idx) {
    const lis = [...this.#elList.children];
    for (const [i, li] of lis.entries()) li.style.background = i === idx ? '#eee' : '';
    this.#highlighted = idx;
    lis[idx]?.scrollIntoView({ block: 'nearest' });
  }

  #selectItem(item) {
    if (this.#multiple) {
      if (item != null) {
        this._addTag(item);
        this.dispatchEvent(new CustomEvent('select', { detail: this.#tags }));
      }
      this.value = '';
      this.#elInput.value = '';
    } else {
      this.#elInput.value = this._isStringType() ? item : item[this.#text];
      this.value = this._isStringType() ? item : item[this.#key];
      this.#selected = item;
      this.dispatchEvent(new CustomEvent('select', { detail: this.#selected }));
    }
    this.#hideDropdown();
  }

  #onKeydown(e) {
    if (this.#elList.hasAttribute('hidden')) return;
    const lis = [...this.#elList.children];
    if (!lis.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.#highlightItem(Math.min(this.#highlighted + 1, lis.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.#highlightItem(Math.max(this.#highlighted - 1, 0));
    } else if (e.key === 'Enter' && this.#highlighted >= 0) {
      e.preventDefault();
      this.#selectItem(this.#items[this.#highlighted]);
    } else if (e.key === 'Escape') {
      this.#hideDropdown();
    }
  }

  #onBlur() {
    this.#hideDropdown();
    const found = this.items.find(item => this._itemMatchInput(item));
    if (this.#multiple) {
      if (found) {
        // if repeatable? set tags list if not there already
        this._addTag(found);
        this.dispatchEvent(new CustomEvent('select', { detail: this.#tags }));
      } else if (this.#allowCustomTag) {
        const newItem = this._makeItemFromValue();
        if (newItem != null) {
          this._addTag(newItem);
          this.dispatchEvent(new CustomEvent('select', { detail: this.#tags }));
        }
      }
      this.value = '';
    } else if (found) {
      // single - found but not yet selected
      if (!this.#selected) {
        this.#selected = found;
        this.dispatchEvent(new CustomEvent('select', { detail: this.#selected }));
      }
    } else {
      // single - not found: clear selection and input when custom tags not allowed
      if (this.#selected) {
        this.#selected = null;
        this.dispatchEvent(new CustomEvent('select', { detail: this.#selected }));
      }
      if (!this.#allowCustomTag) this.value = '';
    }
  }

  /** @returns {boolean} true when items are plain strings (no object-key/object-text configured) */
  _isStringType() {
    return !(this.#key && this.#text);
  }

  /** @returns {boolean} true when `item` matches the current input value */
  _itemMatchInput(item) {
    return this._isStringType()
      ? item === this.value
      : item[this.#key] === this.value || item[this.#text] === this.value;
  }

  /** @returns {boolean} true when two items refer to the same value */
  _matchItems(item1, item2) {
    if (item1 === null && item2 === null) return true;
    else if (item1 === null) return false;
    else if (item2 === null) return false;
    return this._isStringType()
      ? item1 === item2
      : item1[this.#key] === item2[this.#key] || item1[this.#text] === item2[this.#text];
  }

  /** Build an item from the current input value (used for custom tags). @returns {string|object|null} */
  _makeItemFromValue() {
    const trimmed = this.value?.trim();
    if (!trimmed) return null;
    return this._isStringType() ? trimmed : { [this.#key]: trimmed, [this.#text]: trimmed };
  }

  /** @returns {boolean} true when `tag-limit` is set and the limit has been reached */
  _tagLimitReached() {
    return this.#tagLimit && this.#elTags.children.length >= this.#tagLimit;
  }

  /** Append a tag span for `item` to the tags container (no-op if limit reached or duplicate). */
  _addTag(item) {
    if (this._tagLimitReached()) return;
    const itemExists = this.#tags.find(tag =>
      this._isStringType() ? tag === item : tag[this.#key] === item[this.#key] && tag[this.#text] === item[this.#text],
    );
    if (!this.#repeat && itemExists) return; // duplicates not allowed
    const span = document.createElement('span');
    span.className = this.#tagClass;
    span.innerText = this._isStringType() ? item : item[this.#text];
    span.value = this._isStringType() ? item : item[this.#key];
    span.onclick = () => {
      this._removeTag(span);
      this.dispatchEvent(new CustomEvent('select', { detail: this.#tags }));
    };
    this.#elTags.appendChild(span);
    this._updateTags();
    if (this._tagLimitReached()) this.#elInput.setAttribute('disabled', '');
  }

  /** Sync `#tags` from the current DOM tag spans. */
  _updateTags() {
    const tags = [...this.#elTags.children];
    this.#tags = tags.map(tag =>
      this._isStringType() ? tag.innerText : { [this.#key]: tag.value, [this.#text]: tag.innerText },
    );
  }

  /** Remove a tag span from the DOM and re-enable the input if below the limit. */
  _removeTag(span) {
    span.remove();
    this._updateTags();
    if (!this._tagLimitReached() && !this.disabled) this.#elInput.removeAttribute('disabled');
  }

  /** Handle native `input` events: sync `value`, dispatch `search`/`select` as needed. */
  _onInput() {
    const prevItem = this.#selected;
    this.value = this.#elInput.value;

    const found = this.items.find(item => this._itemMatchInput(item));
    if (found) {
      this.#selected = found;
    } else {
      this.#selected = null;
      this.dispatchEvent(new CustomEvent('search', { detail: this.value }));
    }
    if (!this._matchItems(prevItem, this.#selected) && !this.#multiple) {
      if (!this.#selected && this.allowCustomTag) {
        this.#selected = this._makeItemFromValue();
      }
      this.dispatchEvent(new CustomEvent('select', { detail: this.#selected }));
    }
    this.#showDropdown();
  }

  /** Replace all tags with `_tags` and dispatch `select`. @param {string[]|object[]} _tags */
  _setTags(_tags) {
    if (!this.#elTags) return;
    this.#elTags.innerHTML = '';
    this.#tags = [];
    _tags.forEach(tag => {
      this._addTag(tag);
    });
    this.dispatchEvent(new CustomEvent('select', { detail: this.#tags }));
  }

  /** Rebuild the `<ul>` dropdown from `_items` and show it if the input is focused. @param {string[]|object[]} _items */
  _setList(_items) {
    const ul = this.#elList;
    if (!ul) return;
    ul.innerHTML = '';
    this.#highlighted = -1;
    if (typeof _items !== 'object') return;
    _items.forEach((item, idx) => {
      const li = document.createElement('li');
      li.textContent = typeof item === 'string' ? item : item[this.#text];
      li.style.cssText = 'padding:6px 10px;cursor:pointer;';
      li.addEventListener('mouseover', () => this.#highlightItem(idx));
      li.addEventListener('mousedown', e => {
        e.preventDefault(); // prevent input blur so #onBlur doesn't fire
        this.#selectItem(item);
      });
      ul.appendChild(li);
    });
    if (document.activeElement === this.#elInput) this.#showDropdown();
  }
}

customElements.define('bwc-combobox', BwcCombobox);
