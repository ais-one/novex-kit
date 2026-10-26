## T4T Configuration Based Table Editor For Express

## TOIMPROVE

- import / export - replace all? append (ignore duplicates)? append (replace duplicates) - to improve error handling and response and scaling
- UI replace text with suitable icons+ popover

## TO NOTE (REFERENTIAL INTEGRITY)

- https://stackoverflow.com/a/53861921/2215486

## TODO

NEXT:
- [UI] better view of audit log changes... (1. open to see details..., 2. allow for download)
- [UI + BE] own self view / group view
- [BE] file upload, delete, list - oss / s3
- [UI+BE] AUTO COMPLETE /autocomplete/:table - single, dependent, multiple
- [UI+BE] tags
- [BE] - prevent deletion of dependent keys (done with FK constraints), or insertion with orphan keys...
- [UI+BE] handle multiple file images/pdf preview/text, display...
- fix... saving... always keys... displays always text
- [BE] file delete - folder
- [UI] i18n
- [BE] auto detect yaml / json
- [BE] handle xlsx upload (including sanitize) - satria



## Learning To Use

1. use t4t.http as API reference and testing
2. schema for describing tables is in the tables folder

## Schema

- student
- subject
- country (a field used by student)
- state (a field used by student and dependent on country)
- student_subject (formed by student and subject relation)
- audit_logs
- users

## Validation

### HTML input types

- unhandled: button, image, hidden, reset, submit
- undecided: month, week, search
# checkbox, color, file, radio, range, tel, url, time

- handled: date, datetime-local, email, number, password, text

### input attributs

- ignored
  - size: text, search, tel, url, email, and password
  - readonly
  - step: number, range, date, datetime-local, month, time and week.
- dynamic
  - disabled
  - required: text, search, url, tel, email, password, date pickers, number, checkbox, radio, and file
- in use
  - maxlength
  - min, max: number, range, date, datetime-local, month, time and week
  - multiple: email, file
  - pattern: text, date, search, url, tel, email, and password.
