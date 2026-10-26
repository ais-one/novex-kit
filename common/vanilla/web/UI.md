bulma
bootstrap
material UI - muicss

DO NOT USE
- material-components-web, semantic ui

input
- text (with regex)
- number
- date
- time
- datetime (local)
- file
- textarea
  - replace <input> with <textarea>

---

Extended input

- autocomplete / select (can use for selects also..., if multiple..., show tags list, delete from tags list?)
  - single
  - multiple
  - allow new (always false if select)
    bwc-autocomplete (if multiple, use tags? remove tags when not needed) - tag
    bs-autocomplete - badge
    mui-autocomplete - chips

---

- link
  - a[href]
  - button


## Input

label: <label> innerText, additional classes
input: <input> attrs: type, pattern, placeholder, additional classes
helper: <p>


{
tag:
attrs: []
// event:
children: []
}

function formEl (node) {
const { tag, className, attrs, children } = node
const el = document.createElement(tag)
if (className) {
el.className = className
}
if (attrs) {
for (let key in attrs) {
el.setAttirbutes(key, attrs[key])
}
}
if (children) {
children.forEach(child => {
childEl = formEl(child)
el.appendChild(childEl)
})
}
return el
}
