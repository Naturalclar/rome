# `harness.test.ts`

**DO NOT MODIFY**. This file has been autogenerated. Run `rome test internal/compiler/lint/rules/harness.test.ts --update-snapshots` to update.

## `html/useHtmlLang`

### `0`

```

 lint/html/useHtmlLang/reject/1/file.html:1 lint/html/useHtmlLang ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide a lang attribute when using the html element.

    <html></html>
    ^^^^^^^^^^^^

  ℹ Setting a lang attribute on HTML elements configures the language used by screen readers when
    no user default is specified.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `0: formatted`

```html
<html>
</html>

```

### `1`

```

 lint/html/useHtmlLang/reject/2/file.html:1 lint/html/useHtmlLang ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide a lang attribute when using the html element.

  > 1 │ <html lang="
      │ ^^^^^^^^^^^^
  > 2 │ "></html>
      │ ^^^^^^^^

  ℹ Setting a lang attribute on HTML elements configures the language used by screen readers when
    no user default is specified.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `1: formatted`

```html
<html lang="">
</html>

```

### `2`

```
✔ No known problems!

```

### `2: formatted`

```html
<html lang="42">
</html>

```

### `3`

```
✔ No known problems!

```

### `3: formatted`

```html
<html lang="en">
</html>

```
