// TODO
// inline edit?

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

// TODO change some properties to attributes? handle multiple UI frameworks

// EVENTS
// rowclick { detail: { row, col, data }
// triggered = sort / page / page-size / reload { detail: { name, sortKey, sortDir, page, pageSize, filters: [ { key, op, val, andOr } ] } }
// cmd = show/hide filter, reload, add, del, import, export, goback (if parentKey != null)
// checked = [indexes checked...]

// COLUMN PROPERTIES
// for hidden table columns, please remove before passing it to component
// label: 'ID',
// key: 'id',
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
  top: var(--bwc-table-sticky-header-top, 56px); /* nav height - TODO filter height*/
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
 * checkboxes, sticky header/column, and a command navbar.
 *
 * @element bwc-table
 * @attr {string} commands - comma-separated toolbar buttons to show (e.g. `'reload,filter,add,del,import,export'`)
 * @prop {boolean} pagination - enable pagination controls
 * @prop {boolean} sort - enable single-column sorting
 * @prop {number} page - current 1-based page number
 * @prop {number} pageSize - rows per page
 * @prop {number[]} pageSizeList - available page-size options
 * @prop {{ label: string, key: string, filter?: boolean, sort?: boolean, render?: Function }[]} columns - column definitions
 * @prop {Record<string, unknown>[]} items - current page rows
 * @prop {number} total - total row count (used for pagination)
 * @fires rowclick - when a cell is clicked (detail: `{ row, col, data }`)
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

  _setHeights() {
    // console.log(this.#navbarHeight, this.#filterHeight)
    const el = this.querySelector('#filters');
    if (!el) return;
    el.style.top = `${this.#navbarHeight}px`;
    const nodes = this.querySelectorAll('.sticky-header #table-wrapper th');
    for (const node of nodes) {
      node.style.top = `${this.#navbarHeight + this.#filterHeight}px`;
    }
  }

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
      // console.log('inc page', this.page, this.#pages)
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

    // console.log('connectedCallback 0')

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

    // console.log('connectedCallback 1')
  }

  disconnectedCallback() {
    // this.querySelector('input').removeEventListener('input', this.input)
  }

  // attributeChangedCallback(name, oldVal, newVal) {
  //   switch (name) {
  //     case 'page': { break }
  //   }
  // }
  // static get observedAttributes() {
  //   return ['page']
  // }

  get checkboxes() {
    return this.#checkboxes;
  }
  set checkboxes(val) {
    this.#checkboxes = val;
  }
  get pagination() {
    return this.#pagination;
  }
  set pagination(val) {
    this.#pagination = val;
  }
  get commands() {
    return this.#commands;
  }
  set commands(val) {
    this.#commands = val;
  }
  get sort() {
    return this.#sort;
  }
  set sort(val) {
    this.#sort = val;
  }

  get page() {
    return this.#page;
  }
  set page(val) {
    this.#page = val;
  } // DONE ELSEWHERE emit event

  get pageSize() {
    return this.#pageSize;
  }
  set pageSize(val) {
    this.#pageSize = val;
    this._renderPages();
  } // DONE ELSEWHERE emit event

  get pageSizeList() {
    return this.#pageSizeList;
  }
  set pageSizeList(val) {
    this.#pageSizeList = val;
  } // TODO emit event
  get items() {
    return this.#items;
  }
  set items(val) {
    // console.log('set items')
    this.#items = val;
    this._render();
    this._renderPageSelect();
    this._renderPageInput();
    this._renderPages();
  } // if columns do something

  get total() {
    return this.#total;
  }
  set total(val) {
    this.#total = val;
    this._renderPages();
  } // emit event ?

  get selectedItem() {
    return this.#selectedItem;
  }
  set selectedItem(val) {
    this.#selectedItem = val;
  }
  get columns() {
    return this.#columns;
  }
  set columns(val) {
    this.#columns = val;
    this._render();
  }

  _renderPages() {
    this.#pages = Math.ceil(this.total / this.pageSize);
    const el = this.querySelector('#pages-span');
    if (el) el.textContent = this.#pages;
  }

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

  _renderPageInput() {
    const el = this.querySelector('#page-input');
    if (!el) return;
    el.value = this.page;
  }

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

  _renderFilters() {
    const el = this.querySelector('#filters');
    el.textContent = '';
    if (this.#filters.length) {
      for (let i = 0; i < this.#filters.length; i++) {
        const filter = this.#filters[i];
        const div = document.createElement('div');
        div.classList.add('field', 'has-addons', 'm-0', 'p-1');

        div.appendChild(this._createSelect(this.#filterCols, filter, 'key')); // TODO set input type and pattern based on column UI change event
        div.appendChild(this._createSelect(this.#filterOps, filter, 'op'));

        const p = document.createElement('p');
        p.classList.add('control', 'm-0');
        const filterInput = document.createElement('input');
        filterInput.classList.add('input');
        filterInput.value = filter.val;
        filterInput.oninput = e => (filter.val = e.target.value); // so that we can keep the filter value
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
  _delFilter(index) {
    this.#filters.splice(index, 1); // console.log('remove filter', index)
    this._renderFilters();
  }
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

  #handleTheadClick(e) {
    const target = e.target;
    if (this.#checkboxes && !target.cellIndex) {
      // checkbox clicked — check/uncheck all
      this.#checkedRows = [];
      const tbody = this.querySelector('table tbody');
      if (tbody?.children) {
        for (const [i, tr] of [...tbody.children].entries()) {
          const checkbox = tr.firstChild?.firstChild;
          if (checkbox?.type === 'checkbox') {
            checkbox.checked = target.checked;
            if (target.checked) this.#checkedRows.push(i);
          }
        }
      }
      this.dispatchEvent(new CustomEvent('checked', { detail: this.#checkedRows }));
      return;
    }
    // sort
    if (!this.sort) return;
    const offset = this.#checkboxes ? 1 : 0;
    const col = target.cellIndex - offset;
    if (!this.#columns[col]?.sort) return;
    const key = this.#columns[col].key;
    if (key === this.#sortKey) {
      if (this.#sortDir === 'asc') {
        this.#sortDir = 'desc';
      } else if (this.#sortDir === 'desc') {
        this.#sortKey = '';
        this.#sortDir = '';
      }
    } else {
      this.#sortKey = key;
      this.#sortDir = 'asc';
    }
    this._trigger('sort');
  }

  #handleTbodyClick(e, tbody) {
    let target = e.target;
    if (this.#checkboxes && !target.cellIndex) {
      if (target.type !== 'checkbox') return;
      this.#checkedRows = [];
      for (const [i, tr] of [...tbody.children].entries()) {
        const checkbox = tr.firstChild?.firstChild;
        if (checkbox?.type === 'checkbox' && checkbox.checked) this.#checkedRows.push(i);
      }
      this.dispatchEvent(new CustomEvent('checked', { detail: this.#checkedRows }));
      return;
    }
    const offset = this.#checkboxes ? 1 : 0;
    const col = target.cellIndex - offset;
    while (target && target.nodeName !== 'TR') target = target.parentNode;
    const row = target.rowIndex - 1;
    let data = null;
    if (target) {
      // TODO - To handle multiple UI frameworks
      if (this.#selectedNode) this.#selectedNode.classList.remove('is-selected');
      if (this.#selectedIndex === row && this.#selectedIndex !== -1) {
        this.#selectedIndex = -1;
        this.selectedItem = null;
      } else {
        data = { ...this.#items[row] };
        this.#selectedNode = target;
        this.#selectedIndex = row;
        this.selectedItem = { row, col, data };
        target.classList.add('is-selected');
      }
    }
    this.dispatchEvent(new CustomEvent('rowclick', { detail: { row, col, data } }));
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
      th.style.width = '50px'; // TODO do not hardcode
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
      }
      tr.appendChild(td);
    }
  }

  /** Build the `<tbody>` with data rows and attach the row/checkbox click handler. */
  #buildTableBody(table) {
    if (!this.#items || typeof this.#items !== 'object' || !this.#items.length) return;
    const tbody = document.createElement('tbody');
    // TODO function to get checked rows...
    tbody.onclick = e => this.#handleTbodyClick(e, tbody);
    table.appendChild(tbody);
    for (const [idx, row] of this.#items.entries()) {
      this.#buildBodyRow(tbody, idx, row);
    }
  }

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
