# Custom Stack

Create a fancy error with a custom stack.

```ts
// Imports
import { createError } from "https://deno.land/x/cstack@0.1.0/mod.ts";
```

You can create an error by either passing an error object or creating your own
custom stack.

```ts
throw createError(new Error("hello world!"));
```

or

```ts
throw createError({
  name: "Custom Error",
  message: "hello world",
  trace: [
    { at: "somewhere" },
    { at: "file://a/b/c.ts", async: true },
    { at: "file://a/b/c.ts", y: 123 },
    { at: "file://a/b/c.ts", y: 123, x: 456 },
    "    strings work too",
  ],
});
```

![preview](https://cdn.discordapp.com/attachments/712010403302866974/818489534098309151/unknown.png)
