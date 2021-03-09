// Imports
import {
  bold,
  cyan,
  dim,
  italic,
  red,
  yellow,
} from "https://deno.land/std@0.89.0/fmt/colors.ts";

type XS<X extends Error> = X & { __modifiedStack: string };
type XM<X extends Error> = X & { __modifiedStack?: string };

export type ErrorTrace = string | {
  at: string;
  name?: string;
  async?: boolean;
  y?: number;
  x?: number;
};

export type ErrorStack = {
  name: string;
  message?: string;
  trace: ErrorTrace[];
};

export function parseTraceItem(line: string): string | ErrorTrace {
  const result = line.match(
    /^ {4}at (async )?([^ ]* )?\(?([^:]*?:?[^:]*):?(\d+)?:?(\d+)?\)?$/,
  );
  if (result === null) return line;
  const [, _async, _name, at, _y, _x] = result;
  return {
    at,
    async: _async !== undefined,
    name: _name ? _name.trim() : undefined,
    y: _y ? Number(_y) : undefined,
    x: _x ? Number(_x) : undefined,
  };
}

export function parseErrorLine(
  line: string,
): [name: string, message: undefined | string] {
  const [_, name, message] = line.match(/^([^:]*):? ?(.*)?/)!;
  return [name, message];
}

export function parseStack(stack: string): ErrorStack {
  const [line, ...lines] = stack.split("\n");
  const [name, message] = parseErrorLine(line);
  return {
    name,
    message,
    trace: lines.map(parseTraceItem),
  };
}

export function coolifyError<X extends Error>(error: XM<X>): XS<X> {
  if (error.__modifiedStack !== undefined) return error as XS<X>;
  console.log(error.stack);
  const stack = parseStack(error.stack || `${error.name}: ${error.message}`);
  const err = _createError(stack);
  error.stack = err.stack;
  error.__modifiedStack = err.stack;
  return error as XS<X>;
}

function _<X>(caught: X, thrown: X): {
  configurable: true;
  enumerable: true;
  get(): X;
} {
  return {
    configurable: true,
    enumerable: true,
    get() {
      let wasCaught!: boolean;
      try {
        throw new Error("");
      } catch (error) {
        wasCaught = (error.stack!.match(/ {4}at/g) || []).length > 1;
        // console.log(
        //   "Error was %s and %s was returned",
        //   wasCaught ? "caught" : "thrown",
        //   JSON.stringify(wasCaught ? caught : thrown),
        // );
      }
      return wasCaught ? caught : thrown;
    },
  };
}

export function _createError(stack: ErrorStack): XS<Error> {
  const err = new Error() as XS<Error>;
  err.name = stack.name;
  err.message = stack.message || "";
  err.stack = `${stack.name}: ${stack.message}`;
  err.__modifiedStack = `${bold(red(stack.name))}: ${stack.message}`;
  for (const item of stack.trace) {
    if (typeof item === "string") {
      err.stack += "\n" + item;
      err.__modifiedStack += "\n" + item;
      continue;
    }
    err.stack += "\n    at ";
    err.__modifiedStack += "\n    at ";
    if (item.async) {
      err.stack += "async ";
      err.__modifiedStack += dim(italic("async "));
    }
    if (item.name) {
      err.stack += item.name + " (";
      err.__modifiedStack += bold(italic(item.name)) + " (";
    }
    err.stack += item.at;
    err.__modifiedStack += italic(cyan(item.at));
    if (item.y) {
      err.stack += `:${item.y}`;
      err.__modifiedStack += `:${yellow(item.y.toString())}`;
      if (item.x) {
        err.stack += `:${item.x}`;
        err.__modifiedStack += `:${yellow(item.x.toString())}`;
      }
    }
    if (item.name) {
      err.stack += ")";
      err.__modifiedStack += ")";
    }
  }
  return err;
}

export function magicError<X extends Error>(
  error: X,
): Error {
  // Message that will be returned if the error was caught.
  const oMessage = error.message;

  // Stack that will be returned if the error was caught.
  const oStack = error.stack || `${error.name}: ${oMessage}`;

  // Message that will be returned if the error wasn't caught.
  const tMessage = "\r\u001b[K" + ((error as XM<X>).__modifiedStack ||
    coolifyError(error).__modifiedStack);

  // Stack that will be returned if the error wasn't caught.
  const tStack = error.stack = "";

  // The magical part.
  Object.defineProperties(error, {
    message: _(oMessage, tMessage),
    stack: _(oStack, tStack),
  });

  // Return the error.
  return error;
}

export function createError(stack: ErrorStack | Error): Error {
  return magicError(
    _createError(stack instanceof Error ? parseStack(stack.stack!) : stack),
  );
}
