// Imports
import { build, magic } from "./utils.ts";

const global = globalThis as unknown as Record<string, unknown>;
// This might be used later.
global.oError ??= global.Error;

const oError: ErrorConstructor = global.oError as ErrorConstructor;

function createError(
  errorName: string,
  obj: unknown = global,
): ErrorConstructor {
  const o = obj as Record<string, unknown>;
  o[errorName] = class _ extends oError {
    name = errorName;
    constructor(message?: string) {
      super(message);
      magic(build(this, true));
      let name = this.name;
      Object.defineProperty(this, "name", {
        configurable: true,
        enumerable: true,
        get() {
          return name;
        },
        set: (value) => {
          name = value;
          build(this, true);
        },
      });
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
