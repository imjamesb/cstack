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

Cstack produces clean error objects, yet beautiful errors when thrown.

```ts
try {
  throw error;
} catch (error) {
  console.log("Name:", error.name);
  console.log("Message:", error.message);
  console.log("Stack:", error.stack);
}

throw error;
```

![preview](https://cdn.discordapp.com/attachments/488504688245997578/818773081878167592/unknown.png)

The magic behind this is a *secret* property in the object called `__modifiedStack` which contains styled version of the `stack` property. The `magicError` function do some magic things to make sure that the `stack` property is the `__modifiedStack` property only when the error is thrown, that way we can show custom messages when throwing errors and have a normal error object otherwise.

```ts
let error = new Error() as Error & { __modifiedStack: string };
error.name = "Custom Error";
error.message = "Hello";
error.stack = error.__modifiedStack = "Hello World, this is a modified stack";
error.__modifiedStack += "\n    This will only show when the error is thrown!";
error = magicError(error);

try {
  throw error;
} catch (error) {
  console.log("Name:", error.name);
  console.log("Message:", error.message);
  console.log("Stack:", error.stack);
}

throw error;
```

![preview](https://cdn.discordapp.com/attachments/488504688245997578/818775293782654976/unknown.png)
