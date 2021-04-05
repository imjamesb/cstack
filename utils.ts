// Imports
import { DefaultTheme } from "https://deno.land/x/hue@0.0.0-alpha.0/themes/mod.ts";
import Typescript from "https://deno.land/x/hue@0.0.0-alpha.0/languages/typescript/typescript.ts";
import {
  black,
  bold,
  brightYellow,
  cyan,
  dim,
  italic,
  magenta,
  red,
  yellow,
} from "https://deno.land/std@0.92.0/fmt/colors.ts";

export const fileCache = new Map<string, [number, string][]>();
export const fileColoredCache = new Map<string, [number, string][]>();

function loadFile(file: string) {
  if (fileCache.has(file)) return;
  try {
    const _content = Deno.readTextFileSync(file);
    const ccontent = new Typescript(_content, DefaultTheme, {
      output: "console",
    }).highlight().split(/\r?\n/);
    const content = _content.split(/\r?\n/);
    const _out: [number, string][] = [];
    const _cout: [number, string][] = [];
    for (let y = 0; y < content.length; y++) {
      const line = content[y];
      if (!line.trim()) continue;
      const cline = ccontent[y];
      const _y = y + 1;
      _out.push([_y, line]);
      _cout.push([_y, cline]);
    }
    fileCache.set(file, _out);
    fileColoredCache.set(file, _cout);
  } catch (error) {
    // Ignore this.
    console.log(error, file);
  }
}

export function getFileContents(
  file: string,
  y: number,
  cache = fileCache,
): [number, string][] | null {
  loadFile(file);
  const c = cache.get(file);
  if (!c) return null;
  if (c.length < 1) return null;
  const index = c.findIndex((t) => t[0] === y);
  if (index === -1) return null;
  if (c.length === 1) {
    if (index === 0) {
      return [c[0]];
    }
    return null;
  } else if (c.length === 2) {
    if (index === 0 || index === 1) {
      return [c[0], c[1]];
    }
    return null;
  } else if (c.length === 3) {
    if (index > -1 && index < 4) {
      return [c[0], c[1], c[2]];
    }
    return null;
  } else {
    if (index === 0) {
      return [c[0], c[1]];
    } else if (index === c.length - 1) {
      return [c[c.length - 2], c[c.length - 1]];
    }
    return [c[index - 1], c[index], c[index + 1]];
  }
}

const global = globalThis as unknown as Record<string, unknown>;
global.oError ??= Error;
const oError: ErrorConstructor = global.oError as ErrorConstructor;

const anon = "<anonymous>";

export type PossiblyHave<X extends Error> = X & { ____modifiedStack?: string };
export type DefinitelyHave<X extends Error> = X & { ____modifiedStack: string };
export type ErrorTraceObject = {
  isFunction: boolean;
  isNew: boolean;
  isAsync: boolean;
  isAnonymous: boolean;
  isUnknown: boolean;
  isNative: boolean;
  isEval: boolean;

  typeName: string | null;
  functionName: string | null;
  methodName: string | null;
  location: string | null;

  filename: string | null;
  y: number | null;
  x: number | null;

  evalStack: [name: string | null, y: number | null, x: number | null][] | null;
  code?: [number, string][] | null;
  coloredCode?: [number, string][] | null;
};
export type ErrorTrace = string | ErrorTraceObject;
export type ErrorStack = {
  name: string;
  message?: string;
  trace: ErrorTrace[];
};

function parseFileName(
  filename: string,
): [filename: string, y: number | null, x: number | null] {
  let y: number | null = null;
  let x: number | null = null;
  const _x_ = filename.lastIndexOf(":");
  let _filenameIndexEnd = filename.length;
  if (_x_ !== -1) {
    const _x = Number(filename.substring(_x_ + 1, filename.length));
    if (Number.isSafeInteger(_x) && _x > -1) {
      const _y_ = filename.lastIndexOf(":", _x_ - 1);
      if (_y_ !== -1) {
        const _y = Number(filename.substring(_y_ + 1, _x_));
        if (Number.isSafeInteger(_y) && _y > -1) {
          y = _y;
          x = _x;
          _filenameIndexEnd = _y_;
        }
      } else {
        y = _x;
        _filenameIndexEnd = _x_;
      }
    }
  }
  return [filename.substring(0, _filenameIndexEnd), y, x];
}

/**
 * Parse a trace item line.
 *
 * @param line The trace item to parse.
 *
 * @returns
 * If the line couldn't be parsed a string will be returned, but if the line
 * was parsable an error trace object will be returned.
 *
 * @note
 * This function follows the V8 official stack trace format.
 * https://v8.dev/docs/stack-trace-api#appendix%3A-stack-trace-format
 *
 * @example
 * 
 *     parseTraceItem("    at file");
 *     parseTraceItem("    at file:1");
 *     parseTraceItem("    at file:1:1");
 *     parseTraceItem("    at async file:1:1");
 *     parseTraceItem("    at name (file:1:1)");
 *     parseTraceItem("    at async name (file:1:1)");
 */
export function parseTraceItem(line: string): ErrorTrace {
  if (line.substring(0, 7) !== "    at ") {
    return line;
  }

  let isAsync = false;
  let isNew = false;
  let typeName: string | null = null;
  let functionName: string | null = null;
  let methodName: string | null = null;
  let location: string | null = null;
  let evalStack:
    | [name: string | null, y: number | null, x: number | null][]
    | null = null;
  let filename: string | null = null;

  let y: number | null = null;
  let x: number | null = null;

  let _nameStartIndex = 7;

  if (line.substring(7, 13) === "async ") {
    isAsync = true;
    if (line.substring(13, 17) === "new ") {
      isNew = true;
      _nameStartIndex = 17;
    } else {
      _nameStartIndex = 13;
    }
  } else if (line.substring(7, 11) === "new ") {
    isNew = true;
    _nameStartIndex = 11;
  }

  const _nameEndIndex1 = line.indexOf(" (", _nameStartIndex);
  const _nameEndIndex2 = line.indexOf(" [as ", _nameStartIndex);
  const _containsMethodName = _nameEndIndex2 !== -1;

  let _nameEndIndex = -1;
  if (_nameEndIndex2 > 0) _nameEndIndex = _nameEndIndex2;
  else if (_nameEndIndex1 > 0) _nameEndIndex = _nameEndIndex1;
  if (_nameEndIndex === -1) {
    let _locationEnd = line.lastIndexOf(":", _nameStartIndex);
    if (_locationEnd === -1) _locationEnd = line.length;
    location = line.substring(_nameStartIndex, _locationEnd);
  } else {
    const _nameTmp = line.substring(_nameStartIndex, _nameEndIndex);
    const _typeEndIndex = _nameTmp.indexOf(".");
    if (isNew && _typeEndIndex !== -1) return line;
    if (_typeEndIndex !== -1) {
      typeName = _nameTmp.substring(0, _typeEndIndex);
      functionName = _nameTmp.substring(_typeEndIndex + 1, _nameTmp.length);
    } else {
      functionName = _nameTmp;
    }
    if (
      _containsMethodName && _typeEndIndex !== -1 ||
      _containsMethodName && isNew
    ) {
      return line;
    }
    let _locationStart = _nameEndIndex + 2;
    if (_containsMethodName) {
      const _methodNameEndIndex = line.indexOf("] (", _nameEndIndex);
      methodName = line.substring(_nameEndIndex + 5, _methodNameEndIndex);
      _locationStart = _methodNameEndIndex + 3;
    }
    const _locationEnd = line.lastIndexOf(")");
    if (_locationEnd === -1) return line;
    location = line.substring(_locationStart, _locationEnd);
  }
  let _tmpLocation = location;
  while (_tmpLocation.substring(0, 8) === "eval at ") {
    evalStack ??= [];
    const _evalNameEnd = _tmpLocation.indexOf(" (");
    const _evalPositionEnd = _tmpLocation.lastIndexOf(")");
    if (_evalNameEnd === -1 || _evalPositionEnd === -1) return line;
    let __y: number | null = null;
    let __x: number | null = null;
    const _isAtEnd = _tmpLocation.indexOf(", ", _evalPositionEnd);
    if (_isAtEnd !== -1) {
      [, __y, __x] = parseFileName(_tmpLocation.substring(
        _isAtEnd + 2,
        _tmpLocation.length,
      ));
      // if (__y) __y++;
    }
    let name: string | null = _tmpLocation.substring(8, _evalNameEnd);
    if (name === anon) name = null;
    evalStack.push([name, __y, __x]);
    _tmpLocation = _tmpLocation.substring(
      _evalNameEnd + 2,
      _evalPositionEnd,
    );
  }
  [filename, y, x] = parseFileName(_tmpLocation);

  let code: [number, string][] | null = null;
  let coloredCode: [number, string][] | null = null;

  if (filename.substring(0, 7) === "file://" && y !== null) {
    const f = filename.substring(7, filename.length);
    code = getFileContents(f, y);
    coloredCode = getFileContents(f, y, fileColoredCache);
  }

  return {
    isAsync,
    isEval: evalStack !== null,
    isNew,
    isFunction: functionName !== null,
    isNative: filename === "native",
    isUnknown: filename === "unknown location",
    isAnonymous: filename === anon,

    typeName,
    functionName,
    methodName,
    location,

    evalStack,
    filename,
    y,
    x,

    code,
    coloredCode,
  };
}

/**
 * Parse an error object to get a valid stack trace object.
 *
 * @param error The error to parse.
 * @returns The parsed stack trace object.
 *
 * @note
 * This fixes a bug where new lines aren't part of the error message in v0.1.6.
 */
export function parseError(error: Error): ErrorStack {
  return {
    name: error.name,
    message: error.message,
    trace: (error.stack
      ? error.stack.substring(
        error.name.length +
          ((error.message || "").length > 0 ? error.message.length + 3 : 0),
      )
      : "").split(/\r?\n/g).map(parseTraceItem),
  };
}

function buildLineNumbers(y: number | null, x: number | null): string {
  return (y !== null ? ":" + y + (x !== null ? ":" + x : "") : "");
}

function buildLineNumbersColors(y: number | null, x: number | null): string {
  const c = ":";
  return (y !== null
    ? c + yellow(y + "") + (x !== null ? c + yellow(x + "") : "")
    : "");
}

function buildOne(stack: ErrorStack): string {
  let trace = `${stack.name}${stack.message ? ": " : ""}${stack.message || ""}`;
  let largestCodeNo = 12345;
  for (let i = 0; i < stack.trace.length; i++) {
    const l = stack.trace[i];
    if (typeof l === "object" && l !== null) {
      if (l.code) {
        for (const [lineNo] of l.code) {
          largestCodeNo = Math.max(lineNo, largestCodeNo);
        }
      }
      if (l.coloredCode) {
        for (const [lineNo] of l.coloredCode) {
          largestCodeNo = Math.max(lineNo, largestCodeNo);
        }
      }
    }
  }
  largestCodeNo = largestCodeNo.toString().length;
  for (let i = 0; i < stack.trace.length; i++) {
    const line = stack.trace[i];
    trace += "\n";
    if (typeof line === "string") {
      trace += line;
      continue;
    }
    trace += "    at ";
    if (line.isFunction) {
      if (line.isAsync) {
        trace += "async ";
      }
      if (line.isNew) {
        trace += "new ";
      }
      if (line.isAnonymous) {
        trace += anon + " ";
      } else {
        if (line.typeName !== null) {
          trace += line.typeName + ".";
        }
        trace += line.functionName + " ";
      }
      if (line.methodName !== null) {
        trace += `[as ${line.methodName}] `;
      }
      trace += "(";
    }
    if (line.isUnknown) {
      trace += "unknown location" + buildLineNumbers(line.y, line.x);
    } else if (line.isNative) {
      trace += "native" + buildLineNumbers(line.y, line.x);
    } else if (!line.isEval) {
      trace += line.filename + buildLineNumbers(line.y, line.x);
    } else if (line.isEval && line.evalStack && line.evalStack.length > 0) {
      const [_en, _y, _x] = line.evalStack[0];
      trace += `eval at ${_en || anon} (`;
      const len = line.evalStack.length + 1;
      for (let i = 1; i < len; i++) {
        if (i === line.evalStack.length) {
          if (line.filename) {
            trace += line.filename + buildLineNumbers(line.y, line.x);
          }
          break;
        }
        trace += `eval at ${line.evalStack[i][0] ?? anon} (`;
      }
      trace += ")".repeat(line.evalStack.length) + ", " + anon +
        buildLineNumbers(_y, _x);
    }

    if (line.isFunction) trace += ")";
    if (line.code) {
      for (const [lineNo, code] of line.code) {
        const lineNoLen = lineNo.toString().length;
        trace += "\n" + " ".repeat(largestCodeNo - lineNoLen) + lineNo +
          dim("|") + " " + code;
      }
    }
  }
  return trace;
}

function buildBoth(stack: ErrorStack): [string, string] {
  let trace = `${stack.name}${stack.message ? ": " : ""}${stack.message || ""}`;
  let ctrace = `${bold(red(stack.name))}${stack.message ? ": " : ""}${
    italic(stack.message || "")
  }`;
  let largestCodeNo = 12345;
  for (let i = 0; i < stack.trace.length; i++) {
    const l = stack.trace[i];
    if (typeof l === "object" && l !== null) {
      if (l.code) {
        for (const [lineNo] of l.code) {
          largestCodeNo = Math.max(lineNo, largestCodeNo);
        }
      }
      if (l.coloredCode) {
        for (const [lineNo] of l.coloredCode) {
          largestCodeNo = Math.max(lineNo, largestCodeNo);
        }
      }
    }
  }
  largestCodeNo = largestCodeNo.toString().length;
  for (let i = 0; i < stack.trace.length; i++) {
    const line = stack.trace[i];
    trace += "\n";
    ctrace += "\n";
    if (typeof line === "string") {
      trace += line;
      ctrace += line;
      continue;
    }
    trace += "    at ";
    ctrace += "    at ";
    if (line.isFunction) {
      if (line.isAsync) {
        trace += "async ";
        ctrace += italic(magenta("async "));
      }
      if (line.isNew) {
        ctrace += italic(magenta("new "));
      }
      if (line.isAnonymous) {
        trace += anon + " ";
        ctrace += italic(dim(black(anon))) + " ";
      } else {
        if (line.typeName !== null) {
          trace += line.typeName + ".";
          ctrace += italic(bold(brightYellow(line.typeName))) + dim(".");
        }
        trace += line.functionName + " ";
        ctrace += italic(brightYellow(line.functionName!)) + " ";
      }
      if (line.methodName !== null) {
        trace += `[as ${line.methodName}] `;
        ctrace += `[as ${italic(brightYellow(line.methodName))}] `;
      }
      trace += "(";
      ctrace += "(";
    }
    if (line.isUnknown) {
      trace += "unknown location" +
        buildLineNumbers(line.y, line.x);
      ctrace += italic(cyan("unknown location")) +
        buildLineNumbersColors(line.y, line.x);
    } else if (line.isNative) {
      trace += "native" + buildLineNumbers(line.y, line.x);
      ctrace += italic(red("native")) + buildLineNumbersColors(line.y, line.x);
    } else if (!line.isEval && line.filename) {
      trace += line.filename + buildLineNumbers(line.y, line.x);
      ctrace += italic(cyan(line.filename!)) +
        buildLineNumbersColors(line.y, line.x);
    } else if (line.isEval && line.evalStack && line.evalStack.length > 0) {
      const [_en, _y, _x] = line.evalStack[0];
      trace += `eval at ${_en || anon} (`;
      ctrace += `${red("eval")} at ${
        _en ? italic(brightYellow(_en)) : italic(dim(anon))
      } (`;
      const len = line.evalStack.length + 1;
      for (let i = 1; i < len; i++) {
        if (i === line.evalStack.length) {
          if (line.filename) {
            trace += line.filename + buildLineNumbers(line.y, line.x);
            ctrace += italic(cyan(line.filename)) +
              buildLineNumbersColors(line.y, line.x);
          }
          break;
        }
        const n = line.evalStack[i][0];
        trace += `eval at ${n ?? anon} (`;
        ctrace += `${red("eval")} at ${
          italic(n ? brightYellow(n) : dim(anon))
        } (`;
      }
      trace += ")".repeat(line.evalStack.length) + ", " + anon +
        buildLineNumbers(_y, _x);
      ctrace += ")".repeat(line.evalStack.length) + ", " + italic(dim(anon)) +
        buildLineNumbersColors(_y, _x);
    }

    if (line.isFunction) {
      trace += ")";
      ctrace += ")";
    }

    const nl = stack.trace[i + 1];
    if (
      !nl || typeof nl === "string" || nl.filename !== line.filename ||
      nl.y !== line.y || nl.x !== line.x ||
      nl.functionName !== line.functionName || nl.typeName !== line.typeName ||
      nl.methodName !== line.methodName
    ) {
      // if (line.code) {
      //   for (const [lineNo, code] of line.code) {
      //     const y = lineNo.toString();
      //     trace += `\n ${y.padStart(largestCodeNo)} | ${code}`;
      //   }
      // }
      if (line.coloredCode) {
        for (const [lineNo, code] of line.coloredCode) {
          const y = lineNo.toString();
          ctrace += `\n ${yellow(y.padStart(largestCodeNo))} ${
            dim("|")
          } ${code}`;
          if (lineNo === line.y && line.x) {
            ctrace += `\n ${"".padStart(largestCodeNo)} ${dim("|")} ${
              red("~".repeat(line.x - 1 || 0) + "^")
            }`;
          }
        }
      }
    }
  }
  return [trace, ctrace];
}

export function buildError(
  stack: ErrorStack,
  withColor: true,
): [noColor: string, colored: string];
export function buildError(stack: ErrorStack, withColor: false): string;
export function buildError(
  stack: ErrorStack,
  withColor: boolean,
): string | [noColor: string, colored: string];
export function buildError(
  stack: ErrorStack,
  withColor = false,
): string | [noColor: string, colored: string] {
  if (withColor) return buildBoth(stack);
  return buildOne(stack);
}

export function setCustomStack<X extends Error>(
  error: X,
  customStack?: string,
): X {
  (error as unknown as PossiblyHave<typeof error>).____modifiedStack =
    customStack;
  return error;
}

export function isThrown(): boolean {
  try {
    throw new oError("");
  } catch (error) {
    return ((error.stack!.match(/ {4}at/g) || []).length < 3);
  }
}

export function build<X extends Error>(error: X, stylize = false): X {
  (error as unknown as { ____trace: ErrorTrace[] }).____trace ??=
    parseError(error).trace;
  if (stylize) {
    const [n, c] = buildError({
      name: error.name,
      message: error.message,
      trace: (error as unknown as { ____trace: ErrorTrace[] }).____trace,
    }, true);
    error.stack = n;
    setCustomStack(error, c);
  }
  return error;
}

export function magic<X extends Error>(
  error: X,
): X {
  if ((error as Record<string, unknown>).__isMagic) return error;
  let _message: unknown = error.message;
  Object.defineProperties(error, {
    __isMagic: { value: true },
    message: {
      configurable: true,
      enumerable: true,
      get() {
        if (isThrown()) {
          console.error(
            (error as unknown as PossiblyHave<typeof error>)
              .____modifiedStack ||
              error.stack,
          );
          Deno.exit(1); // Nasty af, but it's gonna throw anyway.
        }
        return _message;
      },
      set(value: unknown) {
        _message = value;
      },
    },
  });
  return error;
}

export function fix(error: Error) {
  return magic(build(error, true));
}
