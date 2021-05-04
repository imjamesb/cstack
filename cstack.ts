// Imports
import { DefaultTheme } from "https://deno.land/x/hue@0.0.0-alpha.0/themes/mod.ts";
import Typescript from "https://deno.land/x/hue@0.0.0-alpha.0/languages/typescript/typescript.ts";
import {
  bold,
  brightYellow,
  cyan,
  dim,
  italic,
  magenta,
  red,
  yellow,
} from "https://deno.land/std@0.92.0/fmt/colors.ts";

const anon = "<anonymous>";
const dp = dim("|");

const global = globalThis as unknown as Record<string, unknown>;
// This might be used later.
global.oError ??= global.Error;
const oError: ErrorConstructor = global.oError as ErrorConstructor;

export class Line {
  public readonly no: number;
  public readonly noLen: number;
  public readonly line: string;
  public constructor(no: number, line: string) {
    this.no = no;
    this.line = line;
    this.noLen = no.toString().length;
  }
}

export class Files {
  protected static files = new Map<string, Line[] | undefined>();
  protected static highlightedFiles = new Map<string, Line[] | undefined>();
  protected static get(
    file: string,
    y: number,
    lines = 3,
    highlighted = true,
  ): Line[] | null {
    Files.load(file);
    const c = highlighted
      ? Files.highlightedFiles.get(file) || Files.files.get(file) || null
      : Files.files.get(file) || null;
    if (!c || c.length < 1) return null;
    const index = c.findIndex((t) => t.no === y);
    if (index < 0) return null;
    if (c.length <= lines) return [...c];
    const H = lines / 2;
    let start = index - Math.floor(H);
    if (start < 0) {
      start = 0;
    }
    let end = start + lines;
    if (end > c.length) {
      start = c.length - lines;
      end = c.length;
    }
    if (start < 0) start = 0;
    const _lines: Line[] = [];
    for (let Y = start; Y < end; Y++) _lines.push(c[Y]);
    return _lines;
  }

  public static load(file: string): void {
    if (Files.files.has(file)) return;
    try {
      const _content = Deno.readTextFileSync(file);
      const ext = file.substring(file.length - 3, file.length);
      const ccontent = ext === ".ts" || ext === ".js"
        ? new Typescript(_content, DefaultTheme, {
          output: "console",
        }).highlight().split(/\r?\n/)
        : null;
      const content = _content.split(/\r?\n/);
      const _out: Line[] = [];
      const _cout: Line[] = [];
      for (let y = 0; y < content.length; y++) {
        const line = content[y];
        if (!line.trim()) continue;
        const _y = y + 1;
        _out.push(new Line(_y, line));
        if (ccontent) {
          const cline = ccontent[y];
          _cout.push(new Line(_y, cline));
        }
      }
      Files.files.set(file, _out);
      if (ccontent) Files.highlightedFiles.set(file, _cout);
      else Files.highlightedFiles.set(file, undefined);
    } catch {
      Files.files.set(file, undefined);
      Files.highlightedFiles.set(file, undefined);
    }
  }
  public static getCode(file: string, y: number, lines = 3): Line[] | null {
    return Files.get(file, y, lines, false);
  }

  public static getHighlightedCode(
    file: string,
    y: number,
    lines = 3,
  ): Line[] | null {
    return Files.get(file, y, lines, true);
  }
}

export class OptLocation {
  public y: number | null = null;
  public x: number | null = null;
  public constructor(y?: number | null, x?: number | null) {
    this.y = y || null;
    this.x = x || null;
  }
}

export class OptFile extends OptLocation {
  public static parseFileName(filename: string): OptFile {
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
          } else {
            y = _x;
            _filenameIndexEnd = _x_;
          }
        } else {
          y = _x;
          _filenameIndexEnd = _x_;
        }
      }
    }
    return new OptFile(filename.substring(0, _filenameIndexEnd), y, x);
  }
  public filename: string | null;
  public constructor(
    filename?: string | null,
    y?: number | null,
    x?: number | null,
  ) {
    super(y, x);
    this.filename = filename || null;
  }
}

export class Utils {
  public static buildLineNumberStringWithoutColors(
    y?: number | null,
    x?: number | null,
  ): string {
    return (y !== null ? ":" + y + (x !== null ? ":" + x : "") : "");
  }
  public static buildLineNumberStringWithColors(
    y?: number | null,
    x?: number | null,
  ): string {
    const c = ":";
    return (y !== null
      ? c + yellow(y + "") + (x !== null ? c + yellow(x + "") : "")
      : "");
  }
  public static isThrown(): boolean {
    try {
      throw new oError("");
    } catch (error) {
      return ((error.stack!.match(/ {4}at/g) || []).length < 3);
    }
  }
}

export class EvalStackItem {
  public name: string | null = null;
  public y: number | null = null;
  public x: number | null = null;
  public constructor(
    name?: string | null,
    y?: number | null,
    x?: number | null,
  ) {
    if (typeof name !== "undefined") this.name = name;
    if (typeof y !== "undefined") this.y = y;
    if (typeof x !== "undefined") this.x = x;
  }
  public buildLineNumberStringWithoutColors(): string {
    return Utils.buildLineNumberStringWithoutColors(this.y, this.x);
  }

  public buildLineNumberStringWithColors(): string {
    return Utils.buildLineNumberStringWithColors(this.y, this.x);
  }
}

export class StackTraceItem {
  #codeUrl?: string;

  public readonly line: string;
  public readonly parsed: boolean = false;

  public isFunction: boolean | null = null;
  public isNew: boolean | null = null;
  public isAsync: boolean | null = null;
  public isAnonymous: boolean | null = null;
  public isUnknown: boolean | null = null;
  public isNative: boolean | null = null;
  public isEval: boolean | null = null;
  public isCodeLine = false;

  public typeName: string | null = null;
  public functionName: string | null = null;
  public methodName: string | null = null;
  public location: string | null = null;

  public filename: string | null = null;
  public x: number | null = null;
  public y: number | null = null;

  public eval: EvalStackItem[] | null = null;

  public name: string | null = null;

  public constructor(line: string) {
    this.line = line;
    this.isCodeLine = /^\s*\|/.test(this.line);

    if (line.substring(0, 7) !== "    at ") {
      return this;
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
      if (isNew && _typeEndIndex !== -1) return this;
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
        return this;
      }
      let _locationStart = _nameEndIndex + 2;
      if (_containsMethodName) {
        const _methodNameEndIndex = line.indexOf("] (", _nameEndIndex);
        methodName = line.substring(_nameEndIndex + 5, _methodNameEndIndex);
        _locationStart = _methodNameEndIndex + 3;
      }
      const _locationEnd = line.lastIndexOf(")");
      if (_locationEnd === -1) return this;
      location = line.substring(_locationStart, _locationEnd);
    }
    let _tmpLocation = location;
    while (_tmpLocation.substring(0, 8) === "eval at ") {
      evalStack ??= [];
      const _evalNameEnd = _tmpLocation.indexOf(" (");
      const _evalPositionEnd = _tmpLocation.lastIndexOf(")");
      if (_evalNameEnd === -1 || _evalPositionEnd === -1) return this;
      let __y: number | null = null;
      let __x: number | null = null;
      const _isAtEnd = _tmpLocation.indexOf(", ", _evalPositionEnd);
      if (_isAtEnd !== -1) {
        const ___ = OptFile.parseFileName(_tmpLocation.substring(
          _isAtEnd + 2,
          _tmpLocation.length,
        ));
        __y = ___.y;
        __x = ___.x;
      }
      let name: string | null = _tmpLocation.substring(8, _evalNameEnd);
      if (name === anon) name = null;
      evalStack.push([name, __y, __x]);
      _tmpLocation = _tmpLocation.substring(
        _evalNameEnd + 2,
        _evalPositionEnd,
      );
    }
    const ___ = OptFile.parseFileName(_tmpLocation);
    filename = ___.filename;
    y = ___.y;
    x = ___.x;

    if (filename!.substring(0, 7) === "file://" && y !== null) {
      this.#codeUrl = filename!.substring(7, filename!.length);
    }

    this.isAsync = isAsync;
    this.isEval = evalStack !== null;
    this.isNew = isNew;
    this.isFunction = functionName != null;
    this.isNative = filename === "native";
    this.isUnknown = filename === "unknown location";
    this.isAnonymous = filename === anon;
    this.typeName = typeName;
    this.functionName = functionName;
    this.methodName = methodName;
    this.location = location;
    if (evalStack !== null) {
      this.eval = evalStack.map((_) => new EvalStackItem(_[0], _[1], _[2]));
    }
    this.filename = filename;
    this.y = y;
    this.x = x;
    this.parsed = true;
  }

  public getCode(lines = 3): Line[] | null {
    if (
      typeof this.filename !== "string" || typeof this.y !== "number" ||
      typeof this.#codeUrl !== "string"
    ) {
      return null;
    }
    return Files.getCode(this.#codeUrl, this.y, lines);
  }

  public getHighlightedCode(lines = 3): Line[] | null {
    if (
      typeof this.filename !== "string" || typeof this.y !== "number" ||
      typeof this.#codeUrl !== "string"
    ) {
      return null;
    }
    return Files.getHighlightedCode(this.#codeUrl, this.y, lines);
  }

  public buildLineNumberStringWithoutColors(): string {
    return Utils.buildLineNumberStringWithoutColors(this.y, this.x);
  }

  public buildLineNumberStringWithColors(): string {
    return Utils.buildLineNumberStringWithColors(this.y, this.x);
  }
}

export class ErrorTrace {
  public static parse(error: Error | string): ErrorTrace {
    return typeof error === "string"
      ? ErrorTrace.parseStack(error)
      : new ErrorTrace(error);
  }
  public static parseStack(stack: string): ErrorTrace {
    const [firstLine, ...traceLines] = stack.split(/\r?\n/);
    const [name, ...msgParts] = firstLine.split(": ");
    if (msgParts.length < 1 && !traceLines[0]) traceLines.shift();
    const message = msgParts.join(": ");
    return new ErrorTrace({
      name,
      message,
      stack: name + (message ? ": " + message : "") +
        (traceLines.length > 0 ? "\n" + traceLines.join("\n") : ""),
    });
  }
  public readonly name: string;
  public readonly message?: string;
  public readonly trace: StackTraceItem[];
  public constructor(error: Error) {
    this.name = error.name;
    this.message = error.message;
    this.trace = (error.stack
      ? error.stack.substring(
        error.name.length +
          ((error.message || "").length > 0 ? error.message.length + 3 : 0),
      )
      : "").split(/\r?\n/g).map((line) => new StackTraceItem(line)).filter(
        (i) => !i.isCodeLine,
      );
  }
}

export class CustomStack extends oError {
  #message?: string;
  #stack: StackTraceItem[];

  public constructor(message?: string | Error) {
    let err: Error | null = null;
    if (message instanceof Error) {
      err = message;
      message = "";
    }
    super(message);
    const parsed = ErrorTrace.parse(err || this);
    this.name = parsed.name;
    this.#message = (parsed.message || "").trim() ? parsed.message : undefined;
    this.#stack = parsed.trace;
    Object.defineProperties(this, {
      message: {
        enumerable: true,
        configurable: false,
        get: () => {
          if (Utils.isThrown()) {
            // @ts-ignore Because it exists.
            Error.prepareStackTrace(this, []);
            return "\r\u001b[2K" + this.buildStyledStacktrace();
          } else {
            return this.#message;
          }
        },
        set: (value) =>
          value === undefined ? this.unsetMessage() : this.setMessage(value),
      },
      stack: {
        enumerable: false,
        configurable: false,
        get: () => {
          return this.buildStacktrace();
        },
        set: (value) => {
          const parsed = ErrorTrace.parse(value);
          this.name = parsed.name;
          this.#message = (parsed.message || "").trim()
            ? parsed.message
            : undefined;
          this.#stack = parsed.trace;
        },
      },
    });
  }

  protected setMessage(value: string): this {
    if (
      this.#message === undefined && this.#stack[0] &&
      !this.#stack[0].line.trim()
    ) {
      this.removeTraceItem(0);
    }
    this.#message = value;
    return this;
  }

  protected getMessage(): string | undefined {
    return this.#message;
  }

  protected unsetMessage(): this {
    this.#message = undefined;
    this.injectTraceItem(new StackTraceItem(""), 0);
    return this;
  }

  protected forEachTraceItem(
    callback: (item: StackTraceItem, index: number) => unknown,
  ): this {
    this.#stack.forEach(callback);
    return this;
  }

  protected filterTraceItems(
    callback: (item: StackTraceItem, index: number) => unknown,
  ): this {
    this.#stack = this.#stack.filter(callback);
    return this;
  }

  protected removeTraceItem(index: number): this {
    this.#stack.splice(index, 1);
    return this;
  }

  protected injectTraceItem(traceItem: StackTraceItem, after = -1): this {
    if (after < 0) {
      this.#stack.unshift(traceItem);
    } else if (after > this.#stack.length - 1) {
      this.#stack.push(traceItem);
    } else {
      this.#stack = [
        ...this.#stack.slice(0, after),
        traceItem,
        ...this.#stack.slice(after, this.#stack.length),
      ];
    }
    return this;
  }

  protected buildStyledStacktrace(): string {
    let str = bold(red(this.name));
    if ((this.#message || "").trim()) {
      str += ": " + italic((this.#message || "").trim());
    }
    let maxNoLen = 0;
    for (const item of this.#stack) {
      for (const line of item.getCode() || []) {
        maxNoLen = Math.max(line.noLen);
      }
    }
    for (const item of this.#stack) {
      str += "\n";
      if (!item.parsed) {
        str += item.line;
        continue;
      }
      str += "    at ";
      if (item.isFunction) {
        if (item.isAsync) str += italic(magenta("async "));
        if (item.isNew) str += italic(magenta("new "));
        if (item.isAnonymous) str += italic(dim(anon)) + " ";
        else {
          if (item.typeName) {
            str += italic(bold(brightYellow(item.typeName))) + ".";
          }
          str += italic(brightYellow(item.functionName!)) + " ";
        }
        if (item.methodName) {
          str += `[as ${italic(brightYellow(item.methodName))}] `;
        }
      }
      if (item.isEval) {
        const evalItem1 = item.eval![0];
        str += `${red("eval")} at ${
          evalItem1.name ? italic(cyan(evalItem1.name)) : italic(dim(anon))
        } (`;
        const len = item.eval!.length;
        for (let i = 1; i < len; i++) {
          if (i === len) {
            if (item.filename) {
              str += `${
                italic(cyan(item.name! || item.filename!))
              }${item.buildLineNumberStringWithColors()}`;
            }
            break;
          }
          const evalItem = item.eval![i];
          str += `${red("eval")} at ${
            evalItem.name ? italic(cyan(evalItem.name)) : italic(dim(anon))
          } (`;
        }
        str += ")".repeat(len) + ", " + italic(dim(anon)) +
          evalItem1.buildLineNumberStringWithColors();
      } else {
        if (item.isFunction) str += "(";
        if (item.isUnknown) str += italic(cyan("unknown location"));
        else if (item.isNative) str += italic(red("native"));
        else str += italic(cyan(item.name! || item.filename!));
        str += item.buildLineNumberStringWithColors();
      }
      if (item.isFunction) str += ")";
      for (const { line, no } of item.getHighlightedCode() || []) {
        str += `\n     ${dp} ` + (no === item.y
          ? (str: string) => red(bold(str))
          : dim)(no.toString().padStart(maxNoLen)) +
          ` ${dp} ` +
          line;
        if (no === item.y && item.x !== null) {
          str += `\n     ${dp} ` + bold(red("~".repeat(maxNoLen))) + ` ${dp} ` +
            bold(red("~".repeat(item.x - 1) + "^"));
        }
      }
    }
    return str;
  }

  protected buildStacktrace(): string {
    let str = this.name;
    if (this.#message) {
      str += ": " + this.#message;
    }
    let maxNoLen = 0;
    for (const item of this.#stack) {
      for (const line of item.getCode() || []) {
        maxNoLen = Math.max(line.noLen);
      }
    }
    for (const item of this.#stack) {
      str += "\n";
      if (!item.parsed) {
        str += item.line;
        continue;
      }
      str += "    at ";
      if (item.isFunction) {
        if (item.isAsync) str += "async ";
        if (item.isNew) str += "new ";
        if (item.isAnonymous) str += anon + " ";
        else {
          if (item.typeName) str += item.typeName + ".";
          str += item.functionName + " ";
        }
        if (item.methodName) str += `[as ${item.methodName}] `;
      }
      if (item.isEval) {
        const evalItem1 = item.eval![0];
        str += `eval at ${evalItem1.name || anon} (`;
        const len = item.eval!.length;
        for (let i = 1; i < len; i++) {
          if (i === len) {
            if (item.filename) {
              str +=
                `${item.filename}${item.buildLineNumberStringWithoutColors()}`;
            }
            break;
          }
          const evalItem = item.eval![i];
          str += `eval at ${evalItem.name || anon} (`;
        }
        str += ")".repeat(len) + ", " + anon +
          evalItem1.buildLineNumberStringWithoutColors();
      } else {
        if (item.isFunction) str += "(";
        if (item.isUnknown) str += "unknown location";
        else if (item.isNative) str += "native";
        else str += item.filename;
        str += item.buildLineNumberStringWithoutColors();
      }
      if (item.isFunction) str += ")";
      for (const { line, no } of item.getCode() || []) {
        str += "\n     | " + no.toString().padStart(maxNoLen) + " | " + line;
        if (no === item.y && item.x !== null) {
          str += "\n     | " + "~".repeat(maxNoLen) + " | " +
            "~".repeat(item.x - 1) + "^";
        }
      }
    }
    return str;
  }

  protected getStack(): StackTraceItem[] {
    return this.#stack;
  }
}
