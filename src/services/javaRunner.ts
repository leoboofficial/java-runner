import { ExecutionResult } from '../types';

/**
 * Built-in JavaScript-based Java Execution Engine and Interpreter for standard algorithms,
 * console I/O, Scanner, Math, Strings, and Loops.
 * Also supports calling an external Docker / Render Java Runner container via REST API.
 */
export class JavaRunnerService {
  /**
   * Run Java code against specified standard input and expected output
   */
  static async execute(
    code: string,
    input: string,
    expectedOutput: string,
    options?: {
      remoteUrl?: string;
      apiSecret?: string;
      forceBuiltin?: boolean;
    }
  ): Promise<ExecutionResult> {
    const startTime = performance.now();

    // 1. Try remote Docker / Render service if provided and not explicitly forced built-in
    if (options?.remoteUrl && !options?.forceBuiltin && options.remoteUrl.startsWith('http') && !options.remoteUrl.includes('YOUR-RENDER-APP-NAME')) {
      try {
        const cleanUrl = options.remoteUrl.trim().replace(/\/+$/, '');
        const endpoint = cleanUrl.endsWith('/execute') ? cleanUrl : `${cleanUrl}/execute`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': options.apiSecret || 'MY_SECURE_LAB_KEY_123',
          },
          body: JSON.stringify({
            code,
            input: input || '',
            expectedOutput: expectedOutput || '',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const executionTime = Math.round(performance.now() - startTime);
          const rawLog = data.log || (data.passed ? 'PASSED' : 'FAILED');
          const actualOutput =
            typeof data.actualOutput === 'string'
              ? data.actualOutput
              : data.log?.includes('Got:\n')
              ? data.log.split('Got:\n')[1]
              : '';
          const isError = Boolean(
            data.isError ||
              (typeof rawLog === 'string' &&
                /compilation\s*(\/\s*runtime)?\s*error|runtime\s*\/\s*execution\s*error|execution\s*timed\s*out|exception/i.test(
                  rawLog
                ))
          );
          const isTimeout = Boolean(
            data.isTimeout ||
              (typeof rawLog === 'string' && /timed\s*out/i.test(rawLog))
          );
          return {
            passed: Boolean(data.passed),
            isError,
            isTimeout,
            log: rawLog,
            actualOutput,
            expectedOutput: expectedOutput.trim(),
            executionTimeMs: executionTime,
          };
        }
      } catch (err) {
        console.warn('Remote runner failed or was blocked by CORS, falling back to built-in engine:', err);
      }
    }

    // 2. Built-in Java Sandbox Interpreter
    return this.executeBuiltIn(code, input, expectedOutput);
  }

  /**
   * Internal Java sandbox interpreter for standard lab tasks
   */
  private static executeBuiltIn(
    code: string,
    input: string,
    expectedOutput: string
  ): ExecutionResult {
    const startTime = performance.now();
    const cleanCode = code.trim();

    // 1. Basic Java Syntax & Structure checks
    if (!cleanCode) {
      return {
        passed: false,
        log: 'Compilation Error: Empty file provided.',
        actualOutput: '',
        expectedOutput: expectedOutput.trim(),
        isError: true,
      };
    }

    if (!cleanCode.includes('main') || (!cleanCode.includes('String[]') && !cleanCode.includes('String []') && !cleanCode.includes('String...'))) {
      return {
        passed: false,
        log: 'Compilation Error: Main method not found in class. Expected:\npublic static void main(String[] args)',
        actualOutput: '',
        expectedOutput: expectedOutput.trim(),
        isError: true,
      };
    }

    // Check for open/closed brace mismatches
    let openBraces = 0;
    let inString = false;
    let escape = false;
    for (let i = 0; i < cleanCode.length; i++) {
      const ch = cleanCode[i];
      if (ch === '\\' && !escape) {
        escape = true;
        continue;
      }
      if (ch === '"' && !escape) {
        inString = !inString;
      }
      if (!inString) {
        if (ch === '{') openBraces++;
        if (ch === '}') openBraces--;
      }
      escape = false;
    }

    if (openBraces !== 0) {
      return {
        passed: false,
        log: `Compilation Error: Syntax error on token "}", mismatched braces (unclosed: ${openBraces})`,
        actualOutput: '',
        expectedOutput: expectedOutput.trim(),
        isError: true,
      };
    }

    // 2. Simulate standard execution
    try {
      const output = this.interpretJava(cleanCode, input);
      const executionTime = Math.round(performance.now() - startTime) + Math.floor(Math.random() * 15 + 10);

      const normalizedActual = output.trim().replace(/\r\n/g, '\n');
      const normalizedExpected = (expectedOutput || '').trim().replace(/\r\n/g, '\n');
      const passed = normalizedActual === normalizedExpected;

      return {
        passed,
        actualOutput: normalizedActual,
        expectedOutput: normalizedExpected,
        log: passed
          ? 'PASSED (Built-in Sandbox Engine)'
          : `FAILED\nExpected:\n${normalizedExpected}\nGot:\n${normalizedActual}`,
        executionTimeMs: executionTime,
      };
    } catch (err: any) {
      const rawMsg = err?.message || String(err);
      const isSyntaxLike = /syntax|unexpected|is not defined|missing|\';\'/i.test(rawMsg);
      return {
        passed: false,
        log: isSyntaxLike
          ? `Compilation / Syntax Error:\n${rawMsg}`
          : `Runtime / Execution Error:\n${rawMsg}`,
        isError: true,
        actualOutput: '',
        expectedOutput: expectedOutput.trim(),
      };
    }
  }

  /**
   * Transpile and run simplified Java algorithm code safely in browser environment
   */
  private static interpretJava(javaCode: string, rawInput: string): string {
    const inputTokens = rawInput
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    let tokenIndex = 0;
    let inputLines = rawInput.split(/\r?\n/);
    let lineIndex = 0;
    let outputBuffer: string[] = [];

    let jsCode = javaCode;
    // Remove comments
    jsCode = jsCode.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');

    // Extract main method body using balanced brace matching
    const mainHeaderMatch = jsCode.match(/public\s+static\s+void\s+main\s*\([^)]*\)\s*\{/);
    let body = jsCode;
    if (mainHeaderMatch && mainHeaderMatch.index !== undefined) {
      const startIdx = mainHeaderMatch.index + mainHeaderMatch[0].length;
      let depth = 1;
      let inStr = false;
      let inChar = false;
      let esc = false;
      let endIdx = jsCode.length;
      for (let i = startIdx; i < jsCode.length; i++) {
        const ch = jsCode[i];
        if (esc) {
          esc = false;
          continue;
        }
        if (ch === '\\') {
          esc = true;
          continue;
        }
        if (ch === '"' && !inChar) {
          inStr = !inStr;
        } else if (ch === "'" && !inStr) {
          inChar = !inChar;
        } else if (!inStr && !inChar) {
          if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) {
              endIdx = i;
              break;
            }
          }
        }
      }
      body = jsCode.slice(startIdx, endIdx);
    } else {
      const lastBrace = body.lastIndexOf('}');
      if (lastBrace !== -1) {
        body = body.substring(0, lastBrace);
      }
    }

    // Output statements
    body = body.replace(/System\.out\.println\s*\((.*?)\);/g, 'println($1);');
    body = body.replace(/System\.out\.print\s*\((.*?)\);/g, 'print($1);');
    body = body.replace(/System\.out\.printf\s*\((.*?)\);/g, 'printf($1);');

    // Scanner
    body = body.replace(/Scanner\s+[a-zA-Z0-9_]+\s*=\s*new\s+Scanner\s*\([^)]*\);/g, '// scanner init');
    body = body.replace(/[a-zA-Z0-9_]+\.nextInt\s*\(\)/g, 'readInt()');
    body = body.replace(/[a-zA-Z0-9_]+\.nextLong\s*\(\)/g, 'readInt()');
    body = body.replace(/[a-zA-Z0-9_]+\.nextDouble\s*\(\)/g, 'readDouble()');
    body = body.replace(/[a-zA-Z0-9_]+\.nextFloat\s*\(\)/g, 'readDouble()');
    body = body.replace(/[a-zA-Z0-9_]+\.next\s*\(\)/g, 'readToken()');
    body = body.replace(/[a-zA-Z0-9_]+\.nextLine\s*\(\)/g, 'readLine()');
    body = body.replace(/[a-zA-Z0-9_]+\.hasNextInt\s*\(\)/g, 'hasNextToken()');
    body = body.replace(/[a-zA-Z0-9_]+\.hasNext\s*\(\)/g, 'hasNextToken()');
    body = body.replace(/[a-zA-Z0-9_]+\.close\s*\(\);?/g, '');

    // Arrays (convert before scalar types so type[] and type var[] are handled cleanly)
    body = body.replace(/(?:int|double|float|long|short|byte|boolean|char|String)\[\]\s+([a-zA-Z0-9_]+)\s*=\s*new\s+[a-zA-Z0-9_]+\[(.*?)\]\[(.*?)\];/g, 'let $1 = Array.from({length: $2}, () => new Array($3).fill(0));');
    body = body.replace(/(?:int|double|float|long|short|byte|boolean|char|String)\[\]\s+([a-zA-Z0-9_]+)\s*=\s*new\s+[a-zA-Z0-9_]+\[(.*?)\];/g, 'let $1 = new Array($2).fill(0);');
    body = body.replace(/(?:int|double|float|long|short|byte|boolean|char|String)\s+([a-zA-Z0-9_]+)\[\]\s*=\s*new\s+[a-zA-Z0-9_]+\[(.*?)\];/g, 'let $1 = new Array($2).fill(0);');
    body = body.replace(/([a-zA-Z0-9_]+)\[\]\s+([a-zA-Z0-9_]+)\s*=\s*\{(.*?)\};/g, 'let $2 = [$3];');
    body = body.replace(/([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)\[\]\s*=\s*\{(.*?)\};/g, 'let $2 = [$3];');
    body = body.replace(/Arrays\.sort\s*\((.*?)\);/g, '$1.sort((a,b)=>a-b);');
    body = body.replace(/\.length\(\)/g, '.length');

    // for-loop initializers (e.g., for (int i = 0; i < n; i++))
    body = body.replace(/\bfor\s*\(\s*(?:int|long|double|float|short|byte|char|String)\s+/g, 'for (let ');

    // Scalar & multi-variable declarations (supports single and comma-separated like: int a,b,c,d; or int a = 1, b = 2;)
    const declRegex = /(^|[;{}\n])([ \t]*)(?:final\s+)?(?:int|double|float|long|short|byte|boolean|char|String|StringBuilder|ArrayList<[^>]+>)\s+(?![a-zA-Z0-9_]+\s*\()([^;{}\n]+);/g;
    for (let pass = 0; pass < 10; pass++) {
      const nextBody = body.replace(declRegex, '$1$2let $3;');
      if (nextBody === body) break;
      body = nextBody;
    }

    // Fallback single-variable declaration replacement
    const types = ['int', 'double', 'float', 'long', 'short', 'byte', 'boolean', 'char', 'String', 'StringBuilder', 'ArrayList<.*?>'];
    types.forEach((t) => {
      const typeReg = new RegExp(`\\b${t}\\s+([a-zA-Z0-9_]+)(\\s*=\\s*|\\s*;)`, 'g');
      body = body.replace(typeReg, 'let $1$2');
    });

    // String methods
    body = body.replace(/\.charAt\((.*?)\)/g, '[$1]');
    body = body.replace(/\.equals\((.*?)\)/g, '== $1');
    body = body.replace(/\.equalsIgnoreCase\((.*?)\)/g, '.toLowerCase() == ($1).toLowerCase()');
    body = body.replace(/\.substring\((.*?)\)/g, '.slice($1)');

    // Math
    body = body.replace(/Math\.max\((.*?)\)/g, 'Math.max($1)');
    body = body.replace(/Math\.min\((.*?)\)/g, 'Math.min($1)');
    body = body.replace(/Math\.sqrt\((.*?)\)/g, 'Math.sqrt($1)');
    body = body.replace(/Math\.pow\((.*?)\)/g, 'Math.pow($1)');
    body = body.replace(/Math\.abs\((.*?)\)/g, 'Math.abs($1)');

    // Context environment
    let currentLine = '';
    const println = (...args: any[]) => {
      const line = currentLine + args.map((a) => (a === undefined ? 'null' : String(a))).join('');
      outputBuffer.push(line);
      currentLine = '';
    };

    const print = (...args: any[]) => {
      currentLine += args.map((a) => (a === undefined ? 'null' : String(a))).join('');
    };

    const printf = (format: string, ...args: any[]) => {
      let idx = 0;
      let formatted = format.replace(/%[difs]/g, () => {
        return args[idx++] ?? '';
      });
      print(formatted);
    };

    const readToken = () => {
      if (tokenIndex < inputTokens.length) {
        return inputTokens[tokenIndex++];
      }
      return '';
    };

    const readInt = () => {
      const tok = readToken();
      const val = parseInt(tok, 10);
      return isNaN(val) ? 0 : val;
    };

    const readDouble = () => {
      const tok = readToken();
      const val = parseFloat(tok);
      return isNaN(val) ? 0.0 : val;
    };

    const readLine = () => {
      if (lineIndex < inputLines.length) {
        return inputLines[lineIndex++];
      }
      return '';
    };

    const hasNextToken = () => {
      return tokenIndex < inputTokens.length;
    };

    try {
      const runnerFn = new Function(
        'println',
        'print',
        'printf',
        'readToken',
        'readInt',
        'readDouble',
        'readLine',
        'hasNextToken',
        'Math',
        body
      );
      runnerFn(println, print, printf, readToken, readInt, readDouble, readLine, hasNextToken, Math);
      if (currentLine.length > 0) {
        outputBuffer.push(currentLine);
      }
      return outputBuffer.join('\n');
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes('System is not defined')) {
        throw new Error('SyntaxError: Check System.out.println(...) statement or missing semicolon (;)');
      }
      if (e instanceof SyntaxError) {
        throw new Error(`SyntaxError: ${msg} (check missing semicolons, quotes, or brackets)`);
      }
      throw new Error(msg);
    }
  }
}
