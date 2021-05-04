// Imports
import { CustomStack } from "./cstack.ts";

function createError(
  errorName: string,
  obj: unknown = window,
): ErrorConstructor {
  const o = obj as Record<string, unknown>;
  o[errorName] = class _ extends CustomStack {
    public constructor(message?: string) {
      super(message);
      this.name = errorName;
    }
  };
  Object.defineProperty(o[errorName], "name", { value: errorName });
  return o[errorName] as ErrorConstructor;
}

for (const key in Deno.errors) {
  createError(key, Deno.errors);
}

createError("Error");
createError("EvalError");
createError("InternalError");
createError("RangeError");
createError("ReferenceError");
createError("SyntaxError");
createError("TypeError");
createError("URIError");
