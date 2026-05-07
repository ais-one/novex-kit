// FEATURES
// handle columns and items
// row select
// pagination (optional)
// filters (optional)
// sorter single column (optional)
// checkbox (optional)
// sticky header (optional)
// sticky coloumn (optional - currently only for 1st column)
// checkbox & check all (optional)
// custom render columns
// inline-edit: double-click a data cell to edit in place (requires inlineEdit = true)
//   dispatches 'celledit' { key, idx, oldVal, newVal }

// STYLING...
// --bwc-table-width: 100%
// --bwc-table-overflow: auto
// --bwc-table-height: 100%
// --bwc-table-navbar-bgcolor: white
// --bwc-table-filter-bgcolor: white
// --bwc-table-filter-color: black
// --bwc-table-filter-top: 56px
// --bwc-table-th-bgcolor: white
// --bwc-table-th-color: black
// --bwc-table-td-bgcolor: transparent
// --bwc-table-td-color: black
// --bwc-table-td-select-bgcolor: black
// --bwc-table-td-select-color: black
// --bwc-table-sticky-header-top: 56px
// --bwc-table-checkbox-width: 50px

// PROPERTIES
// commands="reload,filter"
// :pagination="true"
// :sort="true"
// :page="page"
// :pageSize="pageSize"
// :pageSizeList="pageSizeList"
// :columns="columns"
// :items="table.items"
// :total="total"
// style="--bwc-table-height: calc(100vh - 360px);--bwc-table-width: 200%;"
// class="sticky-header sticky-column"

// Attributes: commands, pagination, sort, checkboxes (boolean presence-based)

// EVENTS
// rowclick { detail: { row, col, data }
// celledit { detail: { key, idx, oldVal, newVal } } — only when inlineEdit = true
// triggered = sort / page / page-size / reload { detail: { name, sortKey, sortDir, page, pageSize, filters: [ { key, op, val, andOr } ] } }
// cmd = show/hide filter, reload, add, del, import, export, goback (if parentKey != null)
// checked = [indexes checked...]

// COLUMN PROPERTIES
// for hidden table columns, please remove before passing it to component
// label: 'ID',
// key: 'id',
// type: 'text' | 'number' | 'date' | 'datetime',  — used for filter input type
// pattern: '',                                      — HTML input pattern for filter
// filter: false,
// sort: false,
// render: ({val, key, row, idx}) => `<a class='button' onclick='this.dispatchEvent(new CustomEvent("testevent", { detail: ${JSON.stringify({ val, key, row, idx })} }))'>${val}</a>`
//   cell value, column key, row data, row index (0-based)
//   try not to include row property in event detail... can be too much data

// NOT NEEDED
// loading state and loading spinner

// NOTES
// do not use document.querySelector, use this.querySelector

const template = document.createElement('template');
template.innerHTML = /*html*/ `
<style>
#table-wrapper {
  overflow: var(--bwc-table-overflow, auto);
  height: var(--bwc-table-height, 100%);
}
#table-wrapper table {
  table-layout: initial;
  width: var(--bwc-table-width, 100%);
}
#table-wrapper > nav {
  position: -webkit-sticky;
  position: sticky;
  top: 0px;
  left: 0px;
  z-index: 2;
  background-color: var(--bwc-table-navbar-bgcolor, lightslategray) !important;
}
#table-wrapper #filters {
  position: -webkit-sticky;
  position: sticky;
  top: var(--bwc-table-filter-top, 56px);
  left: 0px;
  z-index: 2;
  background-color: var(--bwc-table-filter-bgcolor, white);
  color: var(--bwc-table-filter-color, black);
}
#table-wrapper th {
  background-color:  var(--bwc-table-th-bgcolor, white);
  color: var(--bwc-table-th-color, black);
}
#table-wrapper tr td {
  background-color:  var(--bwc-table-td-bgcolor, transparent);
  color: var(--bwc-table-td-color, black);
}
#table-wrapper tr.is-selected td {
  background-color:  var(--bwc-table-td-select-bgcolor, lightgrey);
  color: var(--bwc-table-td-select-color, black);
}
.sticky-header #table-wrapper th {
  position: -webkit-sticky;
  position: sticky;
  top: var(--bwc-table-sticky-header-top, 56px); /* nav height */
  z-index: 2;
}
.sticky-column #table-wrapper th[scope=row] {
  position: -webkit-sticky;
  position: sticky;
  left: 0;
  z-index: 3;
}
.sticky-column #table-wrapper th:not([scope=row]) {
}
.sticky-column #table-wrapper td[scope=row] {
  position: -webkit-sticky;
  position: sticky;
  left: 0;
  z-index: 1;
}
input::-webkit-outer-spin-button, /* to remove up and down arrows */
input::-webkit-inner-spin-button {
   -webkit-appearance: none;
   margin: 0;
}
input[type="number"] {
   -moz-appearance: textfield;
}
</style>
<div id="table-wrapper">
  <nav id="table-navbar" class="navbar" role="navigation" aria-label="main navigation">
    <div class="navbar-brand">
      <a id="table-navbar-burger" role="button" class="navbar-burger burger" aria-label="menu" aria-expanded="false" data-target="table-navbar-menu">
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
      </a>
    </div>
    <div id="table-navbar-menu" class="navbar-menu">
      <div class="navbar-start">
        <div id="commands" class="navbar-item">
          <a id="cmd-goback" class="button">↶</a>
          <a id="cmd-filter" class="button">o</a><!-- need to make this configurable -->
          <a id="cmd-reload" class="button">↻</a>
          <a id="cmd-add" class="button">+</a>
          <a id="cmd-del" class="button">-</a>
          <a id="cmd-import" class="button">↑</a>
          <a id="cmd-export" class="button">↓</a>
        </div>
      </div>

      <div class="navbar-end pagination">
        <div class="navbar-item">
          <a id="page-dec" class="button">&lt;</a>
          <a><input id="page-input" class="input" type="number" min="1" style="width: auto;"/></a>
          <a class="button is-static">&nbsp;/&nbsp;<span id="pages-span"></span></a>
          <a id="page-inc" class="button">&gt;</a>
        </div>
        <div class="navbar-item">
          <a>
            <span class="select">
              <select id="page-select">
              </select>
            </span>
          </a>
          <a class="button is-static">Rows/Page</a>
        </div>
      </div>
    </div>
  </nav>
  <div id="filters"></div>
</div>
`;

/**
 * Feature-rich data table with pagination, filtering, sorting, row selection,
 * checkboxes, sticky header/column, inline editing, and a command navbar.
 *
 * @element bwc-table
 * @attr {string} commands - comma-separated toolbar buttons to show (e.g. `'reload,filter,add,del,import,export'`)
 * @attr {boolean} pagination - enable pagination controls
 * @attr {boolean} sort - enable single-column sorting
 * @attr {boolean} checkboxes - enable row checkboxes
 * @prop {number} page - current 1-based page number
 * @prop {number} pageSize - rows per page
 * @prop {number[]} pageSizeList - available page-size options
 * @prop {{ label: string, key: string, type?: string, pattern?: string, filter?: boolean, sort?: boolean, render?: Function }[]} columns - column definitions
 * @prop {Record<string, unknown>[]} items - current page rows
 * @prop {number} total - total row count (used for pagination)
 * @prop {boolean} inlineEdit - enable double-click inline cell editing
 * @prop {string} selectedClass - CSS class applied to the selected row (default `'is-selected'`)
 * @prop {number[]} checkedRows - read-only list of currently checked row indexes
 * @fires rowclick - when a cell is clicked (detail: `{ row, col, data }`)
 * @fires celledit - when an inline edit is committed (detail: `{ key, idx, oldVal, newVal }`)
 * @fires triggered - on sort, page change, reload, or filter (detail: `{ name, sortKey, sortDir, page, pageSize, filters }`)
 * @fires cmd - on toolbar button click (detail: command name)
 * @fires checked - when checkbox selection changes (detail: number[] of checked row indexes)
 */
class Table extends HTMLElement {
  // basic
  #columns = [];
  #items = [];

  // enable pagination
  #pagination = true;
  #page = 1; // one based index
  #pageSize = 10;
  #pageSizeList = [5, 10, 15];
  #pages = 0; // computed Math.ceil(total / pageSize)
  #total = 0;

  // enable sorting
  #sort = true;
  #sortKey = '';
  #sortDir = ''; // blank, asc, desc

  // checkbox
  #checkboxes = true;
  #checkedRows = [];

  // selected
  #selectedIndex = -1;
  #selectedNode = null;
  #selectedItem = null;
  #selectedClass = 'is-selected';

  // inline edit
  #inlineEdit = false;

  // enable commands menu
  #commands = '';

  // filters
  #filters = [];
  #filterCols = [];
  #filterOps = ['=', 'like', '!=', '>=', '>', '<=', '<'];
  #filterShow = false;

  // heights
  #navbarHeight = 56; // #table-navbar
  #filterHeight = 0; // #filters

  static get observedAttributes() {
    return ['commands', 'pagination', 'sort', 'checkboxes'];
  }

  attributeChangedCallback(name, _oldVal, newVal) {
    switch (name) {
      case 'commands':
        this.#commands = newVal ?? '';
        if (this.isConnected) this.#setupCommandsVisibility();
        break;
      case 'pagination':
        this.#pagination = this.hasAttribute('pagination');
        if (this.isConnected) this.querySelector('.pagination').style.display = this.#pagination ? '' : 'none';
        break;
      case 'sort':
        this.#sort = this.hasAttribute('sort');
        break;
      case 'checkboxes':
        this.#checkboxes = this.hasAttribute('checkboxes');
        if (this.isConnected) this._render();
        break;
      default:
        break;
    }
  }

  /** Recalculate and apply sticky `top` positions for the filter bar and header cells. */
  _setHeights() {
    const el = this.querySelector('#filters');
    if (!el) return;
    el.style.top = `${this.#navbarHeight}px`;
    const nodes = this.querySelectorAll('.sticky-header #table-wrapper th');
    for (const node of nodes) {
      node.style.top = `${this.#navbarHeight + this.#filterHeight}px`;
    }
  }

  /** Handle page-number input change: navigate to the new page or restore the current value. @param {Event} e */
  _eventPageInputEL(e) {
    const page = Number(e.target.value);
    if (page >= 1 && page <= this.#pages && Number(page) !== Number(this.page)) {
      this.page = page;
      this._trigger('page');
    } else {
      this._renderPageInput();
    }
  }

  connectedCallback() {
    this.appendChild(template.content.cloneNode(true));

    // Check for click events on the navbar burger icon
    this.querySelector('.navbar-burger').onclick = () => {
      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      this.querySelector('#table-navbar-burger').classList.toggle('is-active'); // navbar-burger
      this.querySelector('#table-navbar-menu').classList.toggle('is-active'); // navbar-menu
    };
    this.querySelector('#page-input').onkeypress = e => {
      e.code === 'Enter' && this._eventPageInputEL(e);
    };
    this.querySelector('#page-input').onblur = e => {
      this._eventPageInputEL(e);
    };

    this.querySelector('#cmd-filter').onclick = () => {
      this.#filterShow = !this.#filterShow;
      this.querySelector('#filters').style.display = this.#filterShow ? 'block' : 'none';
    };

    new ResizeObserver(entries => {
      this.#navbarHeight = entries[0].target.clientHeight;
      this._setHeights();
    }).observe(this.querySelector('#table-navbar'));

    new ResizeObserver(entries => {
      this.#filterHeight = entries[0].target.clientHeight;
      this._setHeights();
    }).observe(this.querySelector('#filters')); // start observing a DOM node

    this.querySelector('#cmd-reload').onclick = () => this._trigger('reload');
    this.querySelector('#cmd-goback').onclick = () =>
      this.dispatchEvent(new CustomEvent('cmd', { detail: { cmd: 'goback' } }));
    this.querySelector('#cmd-add').onclick = () =>
      this.dispatchEvent(new CustomEvent('cmd', { detail: { cmd: 'add' } }));
    this.querySelector('#cmd-del').onclick = () =>
      this.dispatchEvent(new CustomEvent('cmd', { detail: { cmd: 'del', checkedRows: this.#checkedRows } }));
    this.querySelector('#cmd-import').onclick = () =>
      this.dispatchEvent(new CustomEvent('cmd', { detail: { cmd: 'import' } }));
    this.querySelector('#cmd-export').onclick = () =>
      this.dispatchEvent(new CustomEvent('cmd', { detail: { cmd: 'export', checkedRows: this.#checkedRows } }));
    this.querySelector('#page-dec').onclick = e => {
      let numPage = Number(this.page);
      if (numPage > 1 && numPage <= this.#pages) {
        numPage -= 1;
        this.page = numPage;
        this._trigger('page');
      }
    };
    this.querySelector('#page-inc').onclick = e => {
      let numPage = Number(this.page);
      if (numPage < this.#pages) {
        numPage += 1;
        this.page = numPage;
        this._trigger('page');
      }
    };
    this.querySelector('#page-select').onchange = e => {
      this.pageSize = e.target.value;
      this._trigger('page-size');
      if (this.page > this.#pages) {
        this.page = this.#pages;
        this._trigger('page-size');
      }
    };

    // initialize non-required properties that are undefined
    if (!this.#sortKey) this.#sortKey = '';
    if (!this.#sortDir) this.#sortDir = '';

    this.querySelector('#filters').style.display = this.#filterShow ? 'block' : 'none';
    if (!this.#pagination) this.querySelector('.pagination').style.display = 'none';
    this.#setupCommandsVisibility();

    this._render();
    this._renderPageSelect();
    this._renderPageInput();
    this._renderPages();
    this._renderFilters();
  }

  disconnectedCallback() {
    // this.querySelector('input').removeEventListener('input', this.input)
  }

  /** @returns {boolean} */
  get checkboxes() {
    return this.#checkboxes;
  }
  /** @param {boolean} val */
  set checkboxes(val) {
    this.#checkboxes = val;
  }
  /** @returns {boolean} */
  get pagination() {
    return this.#pagination;
  }
  /** @param {boolean} val */
  set pagination(val) {
    this.#pagination = val;
  }
  /** @returns {string} comma-separated list of visible toolbar commands */
  get commands() {
    return this.#commands;
  }
  /** @param {string} val */
  set commands(val) {
    this.#commands = val;
  }
  /** @returns {boolean} */
  get sort() {
    return this.#sort;
  }
  /** @param {boolean} val */
  set sort(val) {
    this.#sort = val;
  }

  /** @returns {number} current 1-based page number */
  get page() {
    return this.#page;
  }
  /** @param {number} val */
  set page(val) {
    this.#page = val;
  }

  /** @returns {number} rows per page */
  get pageSize() {
    return this.#pageSize;
  }
  /** @param {number} val */
  set pageSize(val) {
    this.#pageSize = val;
    this._renderPages();
  }

  /** @returns {number[]} available page-size options */
  get pageSizeList() {
    return this.#pageSizeList;
  }
  /** @param {number[]} val - replaces options and re-renders the page-size select */
  set pageSizeList(val) {
    this.#pageSizeList = val;
    this._renderPageSelect();
  }

  /** @returns {Record<string, unknown>[]} current page rows */
  get items() {
    return this.#items;
  }
  /** @param {Record<string, unknown>[]} val - replaces rows and re-renders the table */
  set items(val) {
    this.#items = val;
    this._render();
    this._renderPageSelect();
    this._renderPageInput();
    this._renderPages();
  }

  /** @returns {number} total row count across all pages */
  get total() {
    return this.#total;
  }
  /** @param {number} val */
  set total(val) {
    this.#total = val;
    this._renderPages();
  }

  /** @returns {{ row: number, col: number, data: object }|null} last clicked row info */
  get selectedItem() {
    return this.#selectedItem;
  }
  /** @param {{ row: number, col: number, data: object }|null} val */
  set selectedItem(val) {
    this.#selectedItem = val;
  }

  /** @returns {object[]} column definitions */
  get columns() {
    return this.#columns;
  }
  /** @param {object[]} val - replaces column definitions and re-renders */
  set columns(val) {
    this.#columns = val;
    this._render();
  }

  /** @returns {boolean} true when double-click inline editing is enabled */
  get inlineEdit() {
    return this.#inlineEdit;
  }
  /** @param {boolean} val */
  set inlineEdit(val) {
    this.#inlineEdit = val;
  }

  /** @returns {string} CSS class applied to the selected row */
  get selectedClass() {
    return this.#selectedClass;
  }
  /** @param {string} val */
  set selectedClass(val) {
    this.#selectedClass = val;
  }

  /** Read-only list of currently checked row indexes. */
  get checkedRows() {
    return [...this.#checkedRows];
  }

  /** Recompute total page count and update the pages label. */
  _renderPages() {
    this.#pages = Math.ceil(this.total / this.pageSize);
    const el = this.querySelector('#pages-span');
    if (el) el.textContent = this.#pages;
  }

  /** Rebuild the page-size `<select>` options from `pageSizeList`. */
  _renderPageSelect() {
    const el = this.querySelector('#page-select');
    if (!el) return;
    el.textContent = ''; // remove all children
    this.pageSizeList.forEach(item => {
      const option = document.createElement('option');
      option.value = item;
      option.textContent = item;
      if (Number(item) === Number(this.pageSize)) option.selected = true;
      el.appendChild(option);
    });
  }

  /** Sync the page number `<input>` to the current `page` value. */
  _renderPageInput() {
    const el = this.querySelector('#page-input');
    if (!el) return;
    el.value = this.page;
  }

  /**
   * Build a Bulma-styled `<select>` wrapped in `<p class="control">`.
   * @param {string[]|{ key: string, label: string }[]} items
   * @param {object} filter - filter object whose `prop` key is kept in sync
   * @param {string} prop - property name on `filter` to bind
   * @returns {HTMLParagraphElement}
   */
  _createSelect(items, filter, prop) {
    const p = document.createElement('p');
    p.classList.add('control', 'm-0');
    const span = document.createElement('span');
    span.classList.add('select');
    const select = document.createElement('select');
    items.forEach(item => {
      const option = document.createElement('option');
      if (item.key) {
        option.textContent = item.label;
        option.value = item.key;
      } else {
        option.textContent = item;
        option.value = item;
      }
      select.appendChild(option);
    });
    select.value = filter[prop];
    select.onchange = e => (filter[prop] = e.target.value);
    span.appendChild(select);
    p.appendChild(span);
    return p;
  }

  /** Update a filter input's type and pattern to match the column definition. */
  _updateFilterInput(input, columnKey) {
    const col = this.#columns.find(c => c.key === columnKey);
    const typeMap = { number: 'number', date: 'date', datetime: 'datetime-local' };
    input.type = typeMap[col?.type] || 'text';
    input.pattern = col?.pattern || '';
  }

  /** Rebuild the filter bar from the current `#filters` array. */
  _renderFilters() {
    const el = this.querySelector('#filters');
    el.textContent = '';
    if (this.#filters.length) {
      for (let i = 0; i < this.#filters.length; i++) {
        const filter = this.#filters[i];
        const div = document.createElement('div');
        div.classList.add('field', 'has-addons', 'm-0', 'p-1');

        const keyP = this._createSelect(this.#filterCols, filter, 'key');
        div.appendChild(keyP);
        div.appendChild(this._createSelect(this.#filterOps, filter, 'op'));

        const p = document.createElement('p');
        p.classList.add('control', 'm-0');
        const filterInput = document.createElement('input');
        filterInput.classList.add('input');
        filterInput.value = filter.val;
        filterInput.oninput = e => (filter.val = e.target.value);
        this._updateFilterInput(filterInput, filter.key); // set initial type from column definition
        // when the key column changes, update the input type/pattern accordingly
        keyP
          .querySelector('select')
          .addEventListener('change', e => this._updateFilterInput(filterInput, e.target.value));
        p.appendChild(filterInput);
        div.appendChild(p);

        const pf = document.createElement('p');
        pf.classList.add('control', 'm-0');
        pf.innerHTML = `<span class="select">
        <select id="filter-and-or">
          <option value="and">And</option>
          <option value="or">Or</option>
        </select>
        </span>`;
        pf.querySelector('#filter-and-or').value = filter.andOr;
        pf.querySelector('#filter-and-or').onchange = e => (filter.andOr = e.target.value);
        div.appendChild(pf);

        const p1 = document.createElement('p');
        p1.classList.add('control', 'm-0');
        const delBtn = document.createElement('button');
        delBtn.classList.add('button');
        delBtn.textContent = '-';
        delBtn.onclick = () => this._delFilter(i);
        p1.appendChild(delBtn);
        div.appendChild(p1);

        const p2 = document.createElement('p');
        p2.classList.add('control', 'm-0');
        const addBtn = document.createElement('button');
        addBtn.classList.add('button');
        addBtn.textContent = '+';
        addBtn.onclick = () => this._addFilter(i + 1);
        p2.appendChild(addBtn);
        div.appendChild(p2);

        el.appendChild(div);
      }
    } else {
      const div = document.createElement('div');
      div.classList.add('field', 'p-1');
      const p = document.createElement('p');
      p.classList.add('control');
      const btn = document.createElement('button');
      btn.classList.add('button');
      btn.textContent = '+';
      btn.onclick = () => this._addFilter(0);
      p.appendChild(btn);
      div.appendChild(p);
      el.appendChild(div);
    }
  }

  /**
   * Read active filter values from the DOM and dispatch a `triggered` event.
   * @param {'page'|'page-size'|'sort'|'reload'} name - event sub-type
   */
  _trigger(name) {
    const filters = [];
    const el = this.querySelector('#filters');
    for (const div of el.children) {
      if (div.children.length >= 4) {
        filters.push({
          key: div.children[0].querySelector('select').value,
          op: div.children[1].querySelector('select').value,
          val: div.children[2].querySelector('input').value,
          andOr: div.children[3].querySelector('select').value,
        });
      }
    }
    this.dispatchEvent(
      new CustomEvent('triggered', {
        // get filter information
        detail: {
          name, // page, sort
          sortKey: this.#sortKey,
          sortDir: this.#sortDir,
          page: this.page || 0,
          pageSize: this.pageSize || 0,
          filters,
        },
      }),
    );
  }

  // filters
  /** Remove the filter at `index` and re-render the filter bar. @param {number} index */
  _delFilter(index) {
    this.#filters.splice(index, 1); // console.log('remove filter', index)
    this._renderFilters();
  }
  /** Insert a new empty filter at `index` and re-render the filter bar. @param {number} index */
  _addFilter(index) {
    this.#filters.splice(index, 0, {
      key: this.#filterCols[0].key,
      label: this.#filterCols[0].label,
      op: this.#filterOps[0],
      val: '',
      andOr: 'and',
    });
    this._renderFilters();
  }

  #setupCommandsVisibility() {
    if (!this.#commands || typeof this.#commands !== 'string') {
      this.querySelector('#commands').style.display = 'none';
      return;
    }
    this.querySelector('#cmd-reload').style.display = this.#commands.includes('reload') ? 'block' : 'none';
    this.querySelector('#cmd-filter').style.display = this.#commands.includes('filter') ? 'block' : 'none';
    this.querySelector('#cmd-add').style.display = this.#commands.includes('add') ? 'block' : 'none';
    this.querySelector('#cmd-del').style.display = this.#commands.includes('del') ? 'block' : 'none';
    this.querySelector('#cmd-import').style.display = this.#commands.includes('import') ? 'block' : 'none';
    this.querySelector('#cmd-export').style.display = this.#commands.includes('export') ? 'block' : 'none';
    this.querySelector('#cmd-goback').style.display = this.#commands.includes('goback') ? 'block' : 'none';
  }

  /** Collect the indexes of all currently checked rows in tbody. */
  #collectCheckedRows(tbody) {
    const rows = [];
    for (const [i, tr] of [...tbody.children].entries()) {
      const checkbox = tr.firstChild?.firstChild;
      if (checkbox?.type === 'checkbox' && checkbox.checked) rows.push(i);
    }
    return rows;
  }

  /** Check or uncheck all row checkboxes and emit 'checked'. */
  #handleCheckAll(target) {
    this.#checkedRows = [];
    const tbody = this.querySelector('table tbody');
    if (!tbody?.children) return;
    for (const [i, tr] of [...tbody.children].entries()) {
      const checkbox = tr.firstChild?.firstChild;
      if (checkbox?.type === 'checkbox') {
        checkbox.checked = target.checked;
        if (target.checked) this.#checkedRows.push(i);
      }
    }
    this.dispatchEvent(new CustomEvent('checked', { detail: this.#checkedRows }));
  }

  /** Recalculate checked rows after a single checkbox changes and emit 'checked'. */
  #handleCheckRow(tbody) {
    this.#checkedRows = this.#collectCheckedRows(tbody);
    this.dispatchEvent(new CustomEvent('checked', { detail: this.#checkedRows }));
  }

  /** Advance the sort direction cycle for a column key: none → asc → desc → none. */
  #cycleSortDir(key) {
    if (key !== this.#sortKey) {
      this.#sortKey = key;
      this.#sortDir = 'asc';
      return;
    }
    if (this.#sortDir === 'asc') {
      this.#sortDir = 'desc';
    } else if (this.#sortDir === 'desc') {
      this.#sortKey = '';
      this.#sortDir = '';
    }
  }

  /** Update row highlight and selectedItem state; returns the row data or null when deselected. */
  #updateRowSelection(target, row, col) {
    if (this.#selectedNode) this.#selectedNode.classList.remove(this.#selectedClass);
    if (this.#selectedIndex === row && this.#selectedIndex !== -1) {
      this.#selectedIndex = -1;
      this.selectedItem = null;
      return null;
    }
    const data = { ...this.#items[row] };
    this.#selectedNode = target;
    this.#selectedIndex = row;
    this.selectedItem = { row, col, data };
    target.classList.add(this.#selectedClass);
    return data;
  }

  #handleTheadClick(e) {
    const target = e.target;
    if (this.#checkboxes && !target.cellIndex) {
      this.#handleCheckAll(target);
      return;
    }
    if (!this.sort) return;
    const offset = this.#checkboxes ? 1 : 0;
    const col = target.cellIndex - offset;
    if (!this.#columns[col]?.sort) return;
    this.#cycleSortDir(this.#columns[col].key);
    this._trigger('sort');
  }

  #handleTbodyClick(e, tbody) {
    let target = e.target;
    if (this.#checkboxes && !target.cellIndex) {
      if (target.type !== 'checkbox') return;
      this.#handleCheckRow(tbody);
      return;
    }
    const offset = this.#checkboxes ? 1 : 0;
    const col = target.cellIndex - offset;
    while (target && target.nodeName !== 'TR') target = target.parentNode;
    if (!target) return;
    const row = target.rowIndex - 1;
    const data = this.#updateRowSelection(target, row, col);
    this.dispatchEvent(new CustomEvent('rowclick', { detail: { row, col, data } }));
  }

  /** Replace a cell's content with an inline input for editing. */
  #startInlineEdit(td, key, idx) {
    const original = td.textContent;
    td.textContent = '';
    const input = document.createElement('input');
    input.className = 'input';
    input.value = original;
    const finish = () => {
      const newVal = input.value;
      td.textContent = newVal;
      if (newVal !== original) {
        this.dispatchEvent(new CustomEvent('celledit', { detail: { key, idx, oldVal: original, newVal } }));
      }
    };
    input.onblur = finish;
    input.onkeydown = e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      }
      if (e.key === 'Escape') {
        input.value = original;
        input.blur();
      }
    };
    td.appendChild(input);
    input.focus();
    input.select();
  }

  /** Return the column header label with a sort direction indicator appended if applicable. */
  #getSortLabel(col) {
    if (!col.sort) return col.label;
    if (this.#sortKey === col.key && this.#sortDir === 'asc') return `${col.label}↑`;
    if (this.#sortKey === col.key && this.#sortDir === 'desc') return `${col.label}↓`;
    return `${col.label}↕`;
  }

  /** Build the `<thead>` with header cells and attach the sort/checkbox click handler. */
  #buildTableHead(table) {
    const thead = document.createElement('thead');
    thead.onclick = e => this.#handleTheadClick(e);
    table.appendChild(thead);
    const tr = document.createElement('tr');
    thead.appendChild(tr);
    if (this.#checkboxes) {
      // check-all checkbox
      const th = document.createElement('th');
      th.style.width = 'var(--bwc-table-checkbox-width, 50px)';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      th.setAttribute('scope', 'row');
      th.appendChild(checkbox);
      tr.appendChild(th);
    }
    this.#filterCols = [];
    for (const col of this.#columns) {
      const th = document.createElement('th');
      if (col.sort) th.style.cursor = 'pointer';
      if (col.width) th.style.width = `${col.width}px`;
      if (col.sticky) th.setAttribute('scope', 'row');
      th.appendChild(document.createTextNode(this.#getSortLabel(col)));
      tr.appendChild(th);
      if (col.filter) this.#filterCols.push({ key: col.key, label: col.label });
    }
  }

  /** Build a single data row `<tr>` with cells for each column. */
  #buildBodyRow(tbody, idx, row) {
    const tr = document.createElement('tr');
    tbody.appendChild(tr);
    if (this.#checkboxes) {
      // add checkbox cell
      const td = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      td.setAttribute('scope', 'row');
      td.appendChild(checkbox);
      tr.appendChild(td);
    }
    for (const { key, width, render } of this.#columns) {
      const td = document.createElement('td');
      if (width) td.style.width = `${width}px`;
      if (render) {
        td.innerHTML = render({ val: row[key], key, row, idx });
      } else {
        td.appendChild(document.createTextNode(row[key]));
        if (this.#inlineEdit) td.ondblclick = () => this.#startInlineEdit(td, key, idx);
      }
      tr.appendChild(td);
    }
  }

  /** Build the `<tbody>` with data rows and attach the row/checkbox click handler. */
  #buildTableBody(table) {
    if (!this.#items || typeof this.#items !== 'object' || !this.#items.length) return;
    const tbody = document.createElement('tbody');
    tbody.onclick = e => this.#handleTbodyClick(e, tbody);
    table.appendChild(tbody);
    for (const [idx, row] of this.#items.entries()) {
      this.#buildBodyRow(tbody, idx, row);
    }
  }

  /** Rebuild the entire `<table>` element from the current columns and items. */
  _render() {
    const el = this.querySelector('#table-wrapper');
    if (!el) return;

    const existing = el.querySelector('table');
    if (existing) {
      while (existing.firstChild) existing.firstChild.remove();
      existing.remove();
    }

    if (this.#columns && typeof this.#columns === 'object') {
      const table = document.createElement('table');
      table.setAttribute('id', 'table');
      table.classList.add('table');
      el.appendChild(table);
      this.#buildTableHead(table);
      this.#buildTableBody(table);
    }
  }
}

customElements.define('bwc-table', Table);
