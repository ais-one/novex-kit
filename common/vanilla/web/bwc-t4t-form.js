// attributes
// - mode: add, edit
//
// properties
// - record
// - config (t4t config)
//
// methods
//
// events

//
// requires bwc-combobox, debounce, autocomplete
import './bwc-combobox.js';
import { autocomplete } from './t4t-fe.js';
import { debounce } from './util.js';

const bulma = {
  // the keys are from t4t cols.<col>.ui.tag
  input: {
    tag: 'div',
    className: 'field',
    children: [
      { tag: 'label', className: 'label' },
      { tag: 'div', className: 'control', children: [{ tag: 'input-placeholder', className: 'input' }] },
      { tag: 'p', className: 'help is-danger', errorLabel: true },
    ],
  }, // end input
  textarea: {
    tag: 'div',
    className: 'field',
    children: [
      { tag: 'label', className: 'label' },
      { tag: 'div', className: 'control', children: [{ tag: 'input-placeholder', className: 'textarea' }] },
      { tag: 'p', className: 'help is-danger', errorLabel: true },
    ],
  },
  select: {
    // ugly multiple
    tag: 'div',
    className: 'field',
    children: [
      {
        tag: 'div',
        className: 'control',
        children: [
          { tag: 'label', className: 'label' },
          {
            tag: 'div',
            className: 'select is-fullwidth',
            multipleClass: 'is-multiple', // appended when field has multiple attribute
            children: [{ tag: 'input-placeholder' }],
          },
        ],
      },
    ],
  }, // end select
  'bwc-combobox': {
    tag: 'div',
    className: 'field',
    children: [
      { tag: 'label', className: 'label' },
      {
        tag: 'div',
        className: 'control has-icons-left',
        children: [{ tag: 'input-placeholder', className: 'input' }],
      },
      { tag: 'p', className: 'help is-danger', errorLabel: true },
    ],
  },
}; // end bulma

// Bootstrap (unverified)
const bootstrap = {
  input: {
    tag: 'div',
    children: [
      { tag: 'label', className: 'form-label' },
      { tag: 'input-placeholder', className: 'form-control' },
      { tag: 'div', className: 'form-text', errorLabel: true },
    ],
  },
  textarea: {
    tag: 'div',
    children: [
      { tag: 'label', className: 'form-label' },
      { tag: 'input-placeholder', className: 'form-control' },
      { tag: 'div', className: 'form-text', errorLabel: true },
    ],
  },
  select: {
    tag: 'div',
    children: [
      { tag: 'label', className: 'form-label' },
      { tag: 'input-placeholder', className: 'form-select' },
    ],
  },
  'bwc-combobox': {},
};

// Mui CSS (unverified)
const muicss = {
  input: {
    tag: 'div',
    className: 'mui-textfield',
    children: [
      { tag: 'label', children: [{ tag: 'span', className: 'mui--text-danger', errorLabel: true }] },
      { tag: 'input-placeholder' },
    ],
  },
  textarea: {
    tag: 'div',
    className: 'mui-textfield',
    children: [
      { tag: 'label', children: [{ tag: 'span', className: 'mui--text-danger', errorLabel: true }] },
      { tag: 'input-placeholder' },
    ],
  },
  select: {
    tag: 'div',
    className: 'mui-select',
    children: [{ tag: 'label' }, { tag: 'input-placeholder' }],
  },
  'bwc-combobox': {},
};

const framework = bulma; // set as bulma first

const template = document.createElement('template');

template.innerHTML = /*html*/ `
<style>
.input-widget {
  /* background-color: red; */
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  height: var(--bwc-t4t-form-height, calc(100vh - 100px));
}
.form-area {
  align-self: center;
  /* background-color: lightgray; */
  overflow: auto;
  height: 96%;
  width: 80%;
}
.top-area {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;

  padding: 8px;
  position: sticky;
  top: 0px;
  background-color: lightgray;
  z-index: 1;
}
.bottom-area {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;

  padding: 8px;
  position: sticky;
  bottom: 0px;
  background-color: lightgray;
  z-index: 1;
}
</style>
<div class="input-widget">
  <form class="form-area" onsubmit="return false;">
    <div class="top-area"><h1>Hello</h1></div>
    <div class="content-area">
    </div>
    <div class="bottom-area">
      <div class="button-group">
        <!-- create buttons here -->
        <button type="submit" class="btn-submit button is-link">Submit</button>
        <button type="button" class="btn-cancel button is-link is-light">Cancel</button>
      </div>
    </div>
  <form>
</div>
`;

/**
 * Dynamic form renderer driven by a T4T table config.
 * Generates form fields (input, textarea, select, combobox, file upload) from
 * the column definitions returned by `getConfig()`, and emits submit/cancel events.
 *
 * @element bwc-t4t-form
 * @attr {string} mode - `'add'` or `'edit'`
 * @prop {Record<string, unknown>} record - current form data (keyed by column name)
 * @prop {Record<string, unknown>} config - T4T config object as returned by the `/t4t/config/:table` endpoint
 * @fires submit - when the form is submitted (detail: `{ data }` on success, `{ error }` on validation failure)
 * @fires cancel - when the cancel button is clicked
 * @fires render-error - when an unexpected error occurs during rendering (detail: Error)
 */
class BwcT4tForm extends HTMLElement {
  #config = [];
  #record = {};
  #xcols = {};

  /** @returns {object} T4T column/permission config as returned by the server */
  get config() {
    return this.#config;
  }
  /** @param {object} val - setting config triggers a re-render when record is also set */
  set config(val) {
    this.#config = val;
  }

  /** @returns {Record<string, unknown>} the current form record */
  get record() {
    return this.#record;
  }
  /** @param {Record<string, unknown>} val - setting record triggers a re-render when config is also set */
  set record(val) {
    this.#record = val;
    if (this.#config && this.#record) this._render();
  }

  /** Mount the template and trigger an initial render if both config and record are ready. */
  connectedCallback() {
    this.appendChild(template.content.cloneNode(true));
    if (this.#config && this.#record) this._render();
  }

  static get observedAttributes() {
    return ['mode'];
  }

  // attributeChangedCallback(name, oldVal, newVal) {
  //   switch (name) {
  //     case 'mode': break
  //     default: break
  //   }
  // }

  /** @returns {'add'|'edit'} current form mode */
  get mode() {
    return this.getAttribute('mode');
  }
  /** @param {'add'|'edit'} val */
  set mode(val) {
    this.setAttribute('mode', val);
  }

  // ── Private helpers: formEl ───────────────────────────────────────────────

  /** Set all key-value pairs in `attrs` as HTML attributes on `el`. No-op if attrs is falsy. */
  #setAttributes(el, attrs) {
    if (!attrs) return;
    for (const key in attrs) el.setAttribute(key, attrs[key]);
  }

  /** Wire up a validated input/select/combobox element and register it in #xcols. */
  #setupInputElement(el, c, k, elementTag) {
    if (!this.#xcols[k]) this.#xcols[k] = {};
    if (c.mode === 'readonly') el.setAttribute('disabled', true);
    if (c.required) el.setAttribute('required', true);

    if (elementTag === 'select') {
      this.#setupSelectElement(el, c, k);
    } else if (elementTag === 'bwc-combobox') {
      this.#setupComboboxElement(el, c, k);
    } else if (this.mode === 'add') {
      el.value = c.default || '';
    } else if (this.mode === 'edit') {
      el.value = el.type === 'file' ? '' : this.#record[k] || '';
    }
    this.#xcols[k].el = el;
  }

  /** Recursively build and append child form elements. */
  #appendChildren(el, children, k, c) {
    children.forEach(child => {
      const childEl = this.formEl(child, k, c);
      if (childEl) el.appendChild(childEl);
    });
  }

  #setupSelectElement(el, c, k) {
    const selectString = this.mode === 'add' ? c.default || '' : this.#record[k] || '';
    let selected;
    if (selectString) {
      selected = c?.ui?.attrs?.multiple ? selectString.split(',') : [selectString];
    } else {
      selected = [];
    }
    for (const option of c?.ui?.options ?? []) {
      const optEl = document.createElement('option');
      optEl.value = option.key;
      optEl.innerText = option.text;
      if (selected.includes(option.key)) optEl.selected = true;
      el.appendChild(optEl);
    }
  }

  #setupComboboxElement(el, c, k) {
    el.setAttribute('listid', `list-${k}`);
    el.setAttribute('object-key', 'key');
    el.setAttribute('object-text', 'text');
    if (c?.ui?.attrs?.multiple) el.setAttribute('multiple', '');
    if (c?.ui?.attrs?.repeat) el.setAttribute('repeat', '');
    if (c?.ui?.attrs?.allowCustomTag) el.setAttribute('allow-custom-tag', '');
    if (c?.ui?.attrs?.tagLimit) el.setAttribute('tag-limit', c.ui.attrs.tagLimit);
    // disabled and required already set
    if (c?.ui?.attrs?.inputClass) el.setAttribute('input-class', c.ui.attrs.inputClass);

    el.onload = () => {
      const valueType = c?.ui?.valueType;
      const val = this.mode === 'add' ? c.default : this.#record[k];
      if (c?.ui?.attrs?.multiple) {
        if (valueType === '') {
          el.tags = val ? val.split(',').map(item => ({ key: item, text: item })) : [];
        } else {
          el.tags = val ?? [];
        }
      } else if (valueType === '') {
        el.value = val || '';
        el.selected = val ? { key: val, text: val } : null;
      } else {
        const item = this.#normaliseItem(val);
        el.value = item?.text || item?.key || '';
        el.selected = item;
      }
    };

    el.onsearch = debounce(async e => {
      let parentVal = null;
      if (c?.options?.parentCol) {
        const col = this.#xcols[c?.options?.parentCol];
        if (col?.el) parentVal = col.el.value;
      }
      const res = await autocomplete(e.target.value, k, this.#record, parentVal);
      el.items = res;
    }, 500);

    el.onselect = () => {
      const childColName = c?.options?.childCol;
      if (childColName) this.#resetCol(childColName);
    };
  }

  /** Normalise a raw stored value to `{ key, text }` for object-type comboboxes. */
  #normaliseItem(val) {
    if (val == null) return null;
    if (typeof val === 'object') return val;
    return { key: val, text: val };
  }

  /** Recursively clear a column's value and cascade to its child column. */
  #resetCol(colName) {
    const col = this.#xcols[colName];
    const colObj = this.#config.cols?.[colName];
    if (!col?.el) return;
    if (colObj?.ui?.attrs?.multiple) {
      col.el.tags = [];
    } else {
      col.el.value = '';
      col.el.selected = null;
    }
    const childColName = colObj?.options?.childCol;
    if (childColName) this.#resetCol(childColName);
  }

  // ── Private helpers: _render ───────────────────────────────────────────────

  #validateForm() {
    let error = false;
    for (const col in this.#xcols) {
      const { el, errorEl } = this.#xcols[col];
      if (el?.checkValidity) {
        const valid = el.checkValidity();
        if (!valid) error = true;
        if (errorEl) errorEl.innerText = valid ? '' : el.validationMessage;
      }
    }
    return error;
  }

  #collectColData(inputEl, col) {
    const tag = inputEl.tagName.toLowerCase();
    if (tag === 'select') {
      const selected = [];
      for (const opt of inputEl.selectedOptions) selected.push(opt.value);
      return selected.join(',');
    }
    if (tag === 'bwc-combobox') {
      const c = this.#config.cols[col];
      const val = c?.ui?.attrs?.multiple ? inputEl.tags : inputEl.selected;
      const valueType = c?.ui?.valueType;
      if (c?.ui?.attrs?.multiple) {
        return valueType === '' ? (val ?? []).map(item => item.text).join(',') : (val ?? []);
      }
      return valueType === '' ? (val?.text ?? '') : val;
    }
    // input, textarea
    return inputEl.files ? inputEl.files : inputEl.value;
  }

  #collectFormData() {
    for (const col in this.#xcols) {
      const inputEl = this.#xcols[col].el;
      if (inputEl) this.#record[col] = this.#collectColData(inputEl, col);
    }
  }

  /** Render a single column into the content area if the mode/visibility rules allow it. */
  #renderCol(contentEl, col, c) {
    const visible = (this.mode === 'add' && c.add !== 'hide') || (this.mode === 'edit' && c.edit !== 'hide');
    if (!visible) return;
    const tagKey = c?.ui?.tag;
    if (!tagKey) return;
    const fieldEl = this.formEl(framework[tagKey], col, c);
    if (c?.ui?.attrs?.type === 'file' && this.mode === 'edit') {
      this.#xcols[col].errorEl.innerText = this.#record[col] || 'No Files Found';
    }
    contentEl.appendChild(fieldEl);
  }

  // ── Core ───────────────────────────────────────────────────────────────────

  /**
   * Recursively build a single form element from a UI tree node.
   * @param {{ tag: string, className?: string, attrs?: object, children?: object[], errorLabel?: boolean, multipleClass?: string }} node - UI tree node
   * @param {string} k - column key
   * @param {object} c - column config object
   * @returns {HTMLElement|null} the constructed element, or null when the column is hidden in this mode
   */
  formEl(node, k, c) {
    const mode = this.mode;
    if (c[mode] === 'hide') return null;

    const { tag, className, attrs, children, errorLabel } = node;
    const elementTag = tag === 'input-placeholder' ? c.ui.tag : tag;
    const el = document.createElement(elementTag);

    if (tag === 'label') el.innerText = c.label;
    this.#setAttributes(el, c?.ui?.attrs);

    // DONE: input - text, integer, decimal, date, time, datetime, file(upload)
    // DONE: select (single and multiple, limited options)
    // DONE: textarea
    // DONE: bwc-combobox (multiple with tags)
    if (['input', 'textarea', 'select', 'bwc-combobox'].includes(elementTag)) {
      this.#setupInputElement(el, c, k, elementTag);
    }

    if (errorLabel) {
      if (!this.#xcols[k]) this.#xcols[k] = {};
      this.#xcols[k].errorEl = el;
    }
    if (className) el.className = className;

    if (node?.multipleClass && c?.ui?.attrs?.multiple) {
      el.classList.add(node.multipleClass);
    }

    this.#setAttributes(el, attrs);
    if (children) this.#appendChildren(el, children, k, c);
    return el;
  }

  /** Rebuild all form fields from the current config and record. Dispatches `render-error` on failure. */
  _render() {
    try {
      const el = this.querySelector('.content-area');
      if (!el) return;
      el.innerHTML = '';
      const { cols, auto } = this.#config;
      for (const col in cols) {
        if (auto.includes(col)) continue;
        this.#renderCol(el, col, cols[col]);
      }

      const btnSubmit = this.querySelector('.btn-submit');
      btnSubmit.onclick = e => {
        e.preventDefault();
        const error = this.#validateForm();
        if (error) {
          this.dispatchEvent(new CustomEvent('submit', { detail: { error } }));
          return;
        }
        this.#collectFormData();
        this.dispatchEvent(new CustomEvent('submit', { detail: { data: this.#record } }));
      };

      const btnCancel = this.querySelector('.btn-cancel');
      btnCancel.onclick = e => {
        e.preventDefault();
        this.dispatchEvent(new CustomEvent('cancel'));
      };
    } catch (e) {
      this.dispatchEvent(new CustomEvent('render-error', { detail: e }));
    }
  }
}

customElements.define('bwc-t4t-form', BwcT4tForm); // or bwc-form-t4t

/*
<template v-if="tableCfg.cols[col].input === 'link'">
  <mwc-textfield
    @click="router.push('/' + tableCfg.cols[col].options.to + '?keyval=' + recordObj[showForm].key + '&keycol=' + tableCfg.cols[col].options.relatedCol)"
    disabled
    class="field-item"
    :key="col + index"
    :label="tableCfg.cols[col].label"
    outlined
    type="text"
    v-model="recordObj[showForm][col]"
  ></mwc-textfield>
</template>
*/
