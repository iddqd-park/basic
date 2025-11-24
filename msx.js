class MSX {
    constructor() {
        this.screenElement = document.getElementById("screen");
        this.inputElement = document.getElementById("virtual-keyboard");

        this.rows = 24;
        this.cols = 40;

        this.buffer = [];              // 화면에 보이는 줄들
        this.currentLine = "";         // 현재 입력 줄
        this.program = {};             // { 10: "PRINT \"HI\"" , 20: "GOTO 10" }
        this.vars = {};                // 변수 테이블 (대문자 이름)
        this.forStack = [];            // FOR ... NEXT 스택
        this.gosubStack = [];          // GOSUB ... RETURN 스택

        this.running = false;
        this.programOrder = [];
        this.programIndexMap = {};
        this.currentProgramIndex = null;
        this.currentExecutingLine = null;

        this.storagePrefix = "MSXWEB_PROGRAM_";

        this.init();
    }

    /* ---------------- 초기화 / 화면 ---------------- */

    init() {
        this.applyConfig();

        this.print("MSX BASIC Simulator version  1.0");
        this.print("Copyright 2025 by IDDQD Internet");
        this.print("66618 Bytes free");
        this.print("Disk BASIC version 1.0");
        this.print("Ok");

        this.render();

        // 어디를 클릭해도 입력창에 포커스
        document.addEventListener("click", () => {
            this.inputElement.focus();
        });

        // 키보드 이벤트 (Enter, Backspace)
        this.inputElement.addEventListener("keydown", (e) => this.handleKey(e));

        // 모바일용 input 이벤트 (글자 입력, 삭제)
        this.inputElement.addEventListener("input", (e) => this.handleInput(e));

        this.inputElement.focus();

        // 리사이즈 이벤트 처리 (폰트 크기 조절 등)
        window.addEventListener('resize', () => this.adjustLayout());
        this.adjustLayout();

        // 펑션키 이벤트 처리
        const fKeys = document.querySelectorAll('#function-keys button');
        fKeys.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // 입력창 포커스 뺏기 방지 (필요시)
                const cmd = btn.getAttribute('data-cmd');
                this.handleFunctionKey(cmd);
                this.inputElement.focus();
            });
        });
    }

    handleFunctionKey(cmd) {
        // MSX 스타일: 펑션키 누르면 해당 명령어가 입력됨
        // RUN 같은 경우 바로 실행되기도 함 (보통 \r 포함)

        let text = "";
        let autoEnter = false;

        switch (cmd) {
            case 'color': text = "COLOR "; break;
            case 'auto': text = "AUTO "; break;
            case 'goto': text = "GOTO "; break;
            case 'list': text = "LIST "; autoEnter = true; break; // 편의상 바로 실행
            case 'run': text = "RUN"; autoEnter = true; break;
        }

        if (text) {
            this.currentLine = text;
            this.render();
            if (autoEnter) {
                this.processLine();
            }
        }
    }

    applyConfig() {
        if (typeof MSX_CONFIG !== 'undefined' && MSX_CONFIG.screen) {
            const container = document.getElementById('msx-container');
            const cfg = MSX_CONFIG.screen;

            container.style.top = cfg.top + '%';
            container.style.left = cfg.left + '%';
            container.style.width = cfg.width + '%';
            container.style.height = cfg.height + '%';
        }
    }

    adjustLayout() {
        // 화면 크기에 맞춰 폰트 사이즈 동적 조절 (대략적으로)
        const container = document.getElementById('msx-container');
        if (container) {
            const h = container.clientHeight;
            // 24줄 기준, 약간의 여유
            const fontSize = Math.floor(h / 26);
            this.screenElement.style.fontSize = fontSize + 'px';
        }

        // PC 모드일 때 매뉴얼 높이를 모니터 이미지 높이와 맞춤
        const manual = document.getElementById('manual-wrapper');
        const monitorImg = document.getElementById('monitor-image');

        if (manual && monitorImg) {
            if (window.innerWidth > 1000) {
                // PC: 모니터 높이에 맞춤
                const imgHeight = monitorImg.clientHeight;
                if (imgHeight > 0) {
                    manual.style.height = imgHeight + 'px';
                }
            } else {
                // Mobile: 높이 자동 (페이지 스크롤)
                manual.style.height = 'auto';
            }
        }
    }

    escapeText(text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/ /g, "&nbsp;");
    }

    print(text = "") {
        const str = (text === undefined || text === null) ? "" : String(text);
        const lines = str.split(/\r?\n/);

        for (const line of lines) {
            this.buffer.push(line);
            if (this.buffer.length > this.rows) {
                this.buffer.shift(); // 스크롤
            }
        }

        this.render();
    }

    render() {
        const linesHtml = this.buffer.map((line) => this.escapeText(line));
        const currentHtml = this.escapeText(this.currentLine);

        let html = linesHtml.join("<br>");
        if (html.length > 0) {
            html += "<br>";
        }
        html += currentHtml + '<span class="cursor">&nbsp;</span>';

        this.screenElement.innerHTML = html;
        this.screenElement.scrollTop = this.screenElement.scrollHeight;
    }

    /* ---------------- 입력 처리 ---------------- */

    handleKey(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            this.processLine();
        } else if (e.key === "Backspace") {
            e.preventDefault();
            if (this.currentLine.length > 0) {
                this.currentLine = this.currentLine.slice(0, -1);
                this.render();
            }
        }
        // 문자 입력은 모바일/데스크톱 모두 handleInput에서 처리
    }

    handleInput(e) {
        // insertText / deleteContentBackward 등으로 들어옴
        if (e.inputType === "insertText" && e.data) {
            if (e.data === "\n") {
                this.inputElement.value = "";
                this.processLine();
            } else {
                this.currentLine += e.data.toUpperCase();
                this.render();
            }
        } else if (e.inputType === "deleteContentBackward") {
            if (this.currentLine.length > 0) {
                this.currentLine = this.currentLine.slice(0, -1);
                this.render();
            }
        }

        // 실제 값은 currentLine에만 유지
        this.inputElement.value = "";
    }

    processLine() {
        const line = this.currentLine.trim();

        if (line.length === 0) {
            this.print("");
            this.currentLine = "";
            this.render();
            return;
        }

        // 화면에 에코
        this.print(line);
        this.currentLine = "";
        this.render();

        this.execute(line);
    }

    /* ---------------- 직접 모드 / 프로그램 모드 판별 ---------------- */

    execute(line) {
        const m = line.match(/^(\d+)\s*(.*)$/);
        if (m) {
            // 프로그램 라인
            const lineNumber = parseInt(m[1], 10);
            const code = m[2];

            if (code) {
                this.program[lineNumber] = code;
            } else {
                delete this.program[lineNumber];
            }
            return;
        }

        // 직접 모드 명령
        this.runCommand(line);
    }

    /* ---------------- 직접 모드 명령 ---------------- */

    runCommand(line) {
        const trimmed = line.trim();
        if (!trimmed) return;

        const upper = trimmed.toUpperCase();
        const parts = upper.split(/\s+/);
        const cmd = parts[0];
        const argsStr = trimmed.slice(cmd.length).trim();

        switch (cmd) {
            case "PRINT":
            case "?":
                this.cmdPrint(argsStr);
                break;
            case "LIST":
                this.cmdList(argsStr);
                break;
            case "RUN":
                this.cmdRun(argsStr);
                break;
            case "NEW":
                this.cmdNew();
                break;
            case "CLS":
                this.cmdCls();
                break;
            case "SAVE":
                this.cmdSave(argsStr);
                break;
            case "LOAD":
                this.cmdLoad(argsStr);
                break;
            case "FILES":
                this.cmdFiles();
                break;
            case "HELP":
                this.cmdHelp();
                break;
            default:
                // 직접 모드에서도 한 줄짜리 BASIC 구문(IF, FOR 등)을 실행할 수 있게 함
                this.executeLine(trimmed, true);
                break;
        }

        this.render();
    }

    /* ---------------- 프로그램 실행 루프 ---------------- */

    async cmdRun(argsStr) {
        let startLine = null;
        const t = argsStr.trim();
        if (t) {
            const n = parseInt(t, 10);
            if (!Number.isNaN(n)) {
                startLine = n;
            } else {
                this.print("Syntax error");
                return;
            }
        }

        await this.runProgram(startLine);
    }

    async runProgram(startLine = null) {
        if (this.running) {
            this.print("Already running");
            return;
        }

        const lineNumbers = Object.keys(this.program)
            .map((n) => parseInt(n, 10))
            .sort((a, b) => a - b);

        if (lineNumbers.length === 0) {
            this.print("No program");
            return;
        }

        this.running = true;
        this.forStack = [];
        this.gosubStack = [];
        this.programOrder = lineNumbers;
        this.programIndexMap = {};
        for (let i = 0; i < lineNumbers.length; i++) {
            this.programIndexMap[lineNumbers[i]] = i;
        }

        let idx = 0;
        if (startLine !== null) {
            if (this.programIndexMap[startLine] === undefined) {
                this.print("Undefined line number");
                this.running = false;
                return;
            }
            idx = this.programIndexMap[startLine];
        }

        while (idx < lineNumbers.length && this.running) {
            this.currentProgramIndex = idx;
            const lineNumber = lineNumbers[idx];
            this.currentExecutingLine = lineNumber;

            const code = this.program[lineNumber];
            const res = this.executeLine(code, false);

            if (res === "END") {
                break;
            }

            if (res === "ERROR") {
                break;
            }

            if (typeof res === "number") {
                const j = this.programIndexMap[res];
                if (j === undefined) {
                    this.print("Undefined line " + res);
                    break;
                } else {
                    idx = j;
                    continue;
                }
            }

            // null 이면 다음 라인으로
            idx++;

            // 너무 오래 돌지 않게 잠깐 Yield
            if (idx % 20 === 0) {
                // eslint-disable-next-line no-await-in-loop
                await new Promise((resolve) => setTimeout(resolve, 0));
            }
        }

        this.running = false;
        this.currentExecutingLine = null;
        this.currentProgramIndex = null;
        this.render();
    }

    /* ---------------- 한 줄 BASIC 구문 실행 (프로그램/직접 공용) ---------------- */

    executeLine(code, directMode = false) {
        let line = code.trim();
        if (!line) return null;

        // 암시적 LET (예: A=10, X$="HI")
        const upper = line.toUpperCase();
        if (/^[A-Z][A-Z0-9\$]*\s*=/.test(upper)) {
            return this.cmdLet(line);
        }

        const parts = line.split(/\s+/);
        const cmd = parts[0].toUpperCase();
        const args = line.slice(parts[0].length).trim();

        switch (cmd) {
            case "LET":
                return this.cmdLet(args);
            case "PRINT":
            case "?":
                this.cmdPrint(args);
                return null;
            case "IF":
                return this.cmdIf(args, directMode);
            case "GOTO":
                return this.cmdGoto(args);
            case "GOSUB":
                if (directMode) {
                    this.print("Illegal direct");
                    return "ERROR";
                }
                return this.cmdGosub(args);
            case "RETURN":
                if (directMode) {
                    this.print("Illegal direct");
                    return "ERROR";
                }
                return this.cmdReturn();
            case "FOR":
                if (directMode) {
                    this.print("Illegal direct");
                    return "ERROR";
                }
                return this.cmdFor(args);
            case "NEXT":
                if (directMode) {
                    this.print("Illegal direct");
                    return "ERROR";
                }
                return this.cmdNext(args);
            case "INPUT":
                return this.cmdInput(args);
            case "END":
            case "STOP":
                return "END";
            case "REM":
                return null;
            case "CLS":
                this.cmdCls();
                return null;
            default:
                this.print("Syntax error");
                return "ERROR";
        }
    }

    /* ---------------- 개별 명령 구현 ---------------- */

    /* LET / 암시적 대입 */
    cmdLet(text) {
        const src = text.trim();
        const m = src.match(/^([A-Z][A-Z0-9\$]*)\s*=\s*(.+)$/i);
        if (!m) {
            this.print("Syntax error");
            return "ERROR";
        }

        const name = m[1].toUpperCase();
        const expr = m[2];
        const val = this.evaluate(expr);

        if (name.endsWith("$")) {
            // 문자열 변수
            this.vars[name] = String(val);
        } else {
            // 숫자 변수
            if (typeof val === "string") {
                const num = parseFloat(val);
                if (Number.isNaN(num)) {
                    this.print("Type mismatch");
                    return "ERROR";
                }
                this.vars[name] = num;
            } else {
                this.vars[name] = Number(val) || 0;
            }
        }
        return null;
    }

    /* PRINT / ? */
    cmdPrint(argsText) {
        const text = argsText.trim();
        if (!text) {
            this.print("");
            return;
        }

        const pieces = [];
        let current = "";
        let inString = false;

        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (ch === '"') {
                current += ch;
                inString = !inString;
            } else if (!inString && (ch === ";" || ch === ",")) {
                if (current.trim().length > 0) {
                    pieces.push(current.trim());
                }
                pieces.push(ch); // 구분자 자체를 저장
                current = "";
            } else {
                current += ch;
            }
        }
        if (current.trim().length > 0) {
            pieces.push(current.trim());
        }

        let out = "";
        for (const part of pieces) {
            if (part === ";" || part === ",") {
                out += " ";
            } else {
                const val = this.evaluate(part);
                out += String(val);
            }
        }
        this.print(out);
    }

    /* LIST */
    cmdList(argsText) {
        let start = null;
        let end = null;
        const s = argsText.trim();

        if (s) {
            const rangeMatch = s.match(/^(\d+)?\s*-\s*(\d+)?$/);
            if (rangeMatch) {
                if (rangeMatch[1]) start = parseInt(rangeMatch[1], 10);
                if (rangeMatch[2]) end = parseInt(rangeMatch[2], 10);
            } else if (/^\d+$/.test(s)) {
                start = parseInt(s, 10);
                end = start;
            } else {
                this.print("Syntax error");
                return;
            }
        }

        const lines = Object.keys(this.program)
            .map((n) => parseInt(n, 10))
            .sort((a, b) => a - b);

        for (const n of lines) {
            if (start !== null && n < start) continue;
            if (end !== null && n > end) continue;
            this.print(n + " " + this.program[n]);
        }
    }

    /* NEW */
    cmdNew() {
        this.program = {};
        this.vars = {};
        this.forStack = [];
        this.gosubStack = [];
        this.print("New program");
    }

    /* CLS */
    cmdCls() {
        this.buffer = [];
        this.render();
    }

    /* IF ... THEN ... */
    cmdIf(args, directMode) {
        const original = args;
        const upper = original.toUpperCase();

        let thenIndex = -1;
        let inString = false;

        for (let i = 0; i < original.length; i++) {
            const ch = original[i];
            if (ch === '"') {
                inString = !inString;
            }
            if (!inString && upper.startsWith("THEN", i)) {
                thenIndex = i;
                break;
            }
        }

        if (thenIndex < 0) {
            this.print("Syntax error");
            return "ERROR";
        }

        const condText = original.slice(0, thenIndex).trim();
        const thenText = original.slice(thenIndex + 4).trim();

        const condVal = this.evaluate(condText);
        const truth = (typeof condVal === "number")
            ? (condVal !== 0)
            : !!condVal;

        if (!truth) {
            return null; // 조건이 거짓이면 그냥 다음 줄
        }

        // THEN 뒤가 숫자만 있으면 GOTO
        if (/^\d+$/.test(thenText)) {
            return parseInt(thenText, 10);
        }

        // 그 외에는 한 줄 명령 실행
        const res = this.executeLine(thenText, directMode);
        if (typeof res === "number" || res === "END" || res === "ERROR") {
            return res;
        }
        return null;
    }

    /* GOTO */
    cmdGoto(args) {
        const t = args.trim();
        const n = parseInt(t, 10);
        if (Number.isNaN(n)) {
            this.print("Syntax error");
            return "ERROR";
        }
        return n;
    }

    /* GOSUB / RETURN */
    cmdGosub(args) {
        const t = args.trim();
        const target = parseInt(t, 10);
        if (Number.isNaN(target)) {
            this.print("Syntax error");
            return "ERROR";
        }

        const currentLine = this.currentExecutingLine;
        const currentIdx = this.programIndexMap[currentLine];
        const order = this.programOrder;
        const nextIdx = currentIdx + 1;
        let returnLine = null;

        if (nextIdx < order.length) {
            returnLine = order[nextIdx];
        } else {
            returnLine = null;
        }

        this.gosubStack.push({ returnLine });
        return target;
    }

    cmdReturn() {
        if (!this.gosubStack.length) {
            this.print("Return without gosub");
            return "ERROR";
        }
        const frame = this.gosubStack.pop();
        if (frame.returnLine === null) {
            return "END";
        }
        return frame.returnLine;
    }

    /* FOR / NEXT */
    cmdFor(args) {
        const src = args.trim();
        const m = src.match(/^([A-Z][A-Z0-9]*)\s*=\s*(.+)$/i);
        if (!m) {
            this.print("Syntax error");
            return "ERROR";
        }

        const varName = m[1].toUpperCase();
        let rest = m[2];
        const upperRest = rest.toUpperCase();
        const toIndex = upperRest.indexOf(" TO ");

        if (toIndex < 0) {
            this.print("Syntax error");
            return "ERROR";
        }

        const startExpr = rest.slice(0, toIndex);
        rest = rest.slice(toIndex + 4);

        let stepExpr = "1";
        const upperRest2 = rest.toUpperCase();
        const stepIndex = upperRest2.indexOf(" STEP ");

        if (stepIndex >= 0) {
            stepExpr = rest.slice(stepIndex + 6);
            rest = rest.slice(0, stepIndex);
        }

        const startVal = this.evaluate(startExpr);
        const endVal = this.evaluate(rest);
        const stepVal = this.evaluate(stepExpr);

        if (typeof startVal !== "number" ||
            typeof endVal !== "number" ||
            typeof stepVal !== "number") {
            this.print("Type mismatch");
            return "ERROR";
        }

        this.vars[varName] = startVal;

        const currentLine = this.currentExecutingLine;
        this.forStack.push({
            varName,
            end: endVal,
            step: stepVal,
            forLine: currentLine
        });

        return null;
    }

    cmdNext(args) {
        const name = args.trim().toUpperCase() || null;

        if (!this.forStack.length) {
            this.print("Next without for");
            return "ERROR";
        }

        let frame = this.forStack[this.forStack.length - 1];

        if (name && frame.varName !== name) {
            // 간단하게, 일단 맨 위 FOR만 처리 (중첩 FOR에서 이름 안 맞으면 오류로)
            this.print("Next without for");
            return "ERROR";
        }

        let current = this.vars[frame.varName];
        if (typeof current !== "number") current = 0;

        current += frame.step;
        this.vars[frame.varName] = current;

        if ((frame.step >= 0 && current <= frame.end) ||
            (frame.step < 0 && current >= frame.end)) {
            // FOR 라인으로 점프
            return frame.forLine;
        }

        // 루프 종료
        this.forStack.pop();
        return null;
    }

    /* INPUT (window.prompt 활용) */
    cmdInput(args) {
        let text = args.trim();
        if (!text) {
            this.print("Syntax error");
            return "ERROR";
        }

        let promptText = "?";
        let varPart = text;

        // "메시지";A 형태 처리
        const msgMatch = text.match(/^(\".*\")\s*;(.*)$/i);
        if (msgMatch) {
            promptText = String(this.evaluate(msgMatch[1]));
            varPart = msgMatch[2].trim();
        }

        const varMatch = varPart.match(/^([A-Z][A-Z0-9\$]*)$/i);
        if (!varMatch) {
            this.print("Syntax error");
            return "ERROR";
        }

        const varName = varMatch[1].toUpperCase();
        let input = window.prompt(promptText, "");
        if (input === null) {
            input = "";
        }

        if (varName.endsWith("$")) {
            this.vars[varName] = input;
        } else {
            const num = parseFloat(input);
            if (Number.isNaN(num)) {
                this.print("Type mismatch");
                return "ERROR";
            }
            this.vars[varName] = num;
        }

        return null;
    }

    /* SAVE / LOAD / FILES (localStorage) */

    getStorageKey(name) {
        return this.storagePrefix + name.toUpperCase();
    }

    cmdSave(args) {
        const nameVal = this.evaluate(args);
        const name = String(nameVal).trim();
        if (!name) {
            this.print("Syntax error");
            return;
        }

        if (!window.localStorage) {
            this.print("No storage");
            return;
        }

        try {
            const data = JSON.stringify(this.program);
            localStorage.setItem(this.getStorageKey(name), data);
            this.print("Saved " + name);
        } catch (e) {
            this.print("Save error");
        }
    }

    cmdLoad(args) {
        const nameVal = this.evaluate(args);
        const name = String(nameVal).trim();
        if (!name) {
            this.print("Syntax error");
            return;
        }

        if (!window.localStorage) {
            this.print("No storage");
            return;
        }

        const key = this.getStorageKey(name);
        const data = localStorage.getItem(key);
        if (!data) {
            this.print("File not found");
            return;
        }

        try {
            const obj = JSON.parse(data);
            this.program = {};
            for (const k in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, k)) {
                    this.program[k] = obj[k];
                }
            }
            this.print("Loaded " + name);
        } catch (e) {
            this.print("Load error");
        }
    }

    cmdFiles() {
        if (!window.localStorage) {
            this.print("No storage");
            return;
        }

        this.print("Files:");
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.storagePrefix)) {
                const name = key.slice(this.storagePrefix.length);
                this.print(" " + name);
            }
        }
    }

    /* HELP */
    cmdHelp() {
        this.print("MSX BASIC WEB COMMANDS");
        this.print(" LIST [start]-[end]");
        this.print(" RUN [line]");
        this.print(" NEW, CLS");
        this.print(" SAVE \"NAME\", LOAD \"NAME\", FILES");
        this.print(" GOTO, IF..THEN, FOR..NEXT, GOSUB..RETURN");
        this.print(" INPUT, PRINT, ? ");
    }

    /* ---------------- 수식 파서/평가 ---------------- */

    evaluate(expr) {
        const s = expr.trim();
        if (!s) return 0;

        try {
            const tokens = this.tokenize(s);
            if (!tokens.length) return 0;
            const rpn = this.toRPN(tokens);
            return this.evalRPN(rpn);
        } catch (e) {
            this.print("Syntax error");
            return 0;
        }
    }

    tokenize(expr) {
        const tokens = [];
        let i = 0;

        while (i < expr.length) {
            const ch = expr[i];

            if (ch === " " || ch === "\t") {
                i++;
                continue;
            }

            // 문자열 리터럴
            if (ch === '"') {
                let j = i + 1;
                let s = "";
                while (j < expr.length && expr[j] !== '"') {
                    s += expr[j];
                    j++;
                }
                if (j >= expr.length) {
                    throw new Error("Unterminated string");
                }
                tokens.push({ type: "string", value: s });
                i = j + 1;
                continue;
            }

            // 숫자
            if (/[0-9]/.test(ch)) {
                let j = i;
                while (j < expr.length && /[0-9.]/.test(expr[j])) {
                    j++;
                }
                const numStr = expr.slice(i, j);
                tokens.push({ type: "number", value: parseFloat(numStr) });
                i = j;
                continue;
            }

            // 식별자 (변수)
            if (/[A-Z]/i.test(ch)) {
                let j = i;
                while (j < expr.length && /[A-Z0-9\$]/i.test(expr[j])) {
                    j++;
                }
                const name = expr.slice(i, j).toUpperCase();
                tokens.push({ type: "ident", value: name });
                i = j;
                continue;
            }

            // 비교 연산자 <= >= <>
            const two = expr.substr(i, 2);
            if (two === "<=" || two === ">=" || two === "<>") {
                tokens.push({ type: "op", value: two });
                i += 2;
                continue;
            }

            // 단일 문자 연산자 / 괄호
            if ("+-*/()=<>".includes(ch)) {
                if (ch === "(" || ch === ")") {
                    tokens.push({ type: "paren", value: ch });
                } else {
                    tokens.push({ type: "op", value: ch });
                }
                i++;
                continue;
            }

            // 모르는 문자는 그냥 스킵
            i++;
        }

        return tokens;
    }

    getPrecedence(op) {
        switch (op) {
            case "UMINUS":
                return 4;
            case "*":
            case "/":
                return 3;
            case "+":
            case "-":
                return 2;
            case "=":
            case "<>":
            case "<":
            case ">":
            case "<=":
            case ">=":
                return 1;
            default:
                return 0;
        }
    }

    toRPN(tokens) {
        const output = [];
        const stack = [];
        let prevToken = null;

        for (const t of tokens) {
            if (t.type === "number" || t.type === "string" || t.type === "ident") {
                output.push(t);
                prevToken = t;
                continue;
            }

            if (t.type === "paren" && t.value === "(") {
                stack.push(t);
                prevToken = t;
                continue;
            }

            if (t.type === "paren" && t.value === ")") {
                while (
                    stack.length &&
                    !(stack[stack.length - 1].type === "paren" &&
                        stack[stack.length - 1].value === "(")
                ) {
                    output.push(stack.pop());
                }
                if (!stack.length) {
                    throw new Error("Mismatched parentheses");
                }
                stack.pop(); // "(" 제거
                prevToken = t;
                continue;
            }

            if (t.type === "op") {
                let op = t.value;

                // 단항 마이너스 판별
                if (
                    op === "-" &&
                    (!prevToken ||
                        prevToken.type === "op" ||
                        (prevToken.type === "paren" && prevToken.value === "("))
                ) {
                    op = "UMINUS";
                }

                const prec = this.getPrecedence(op);
                const assoc = "left";

                while (stack.length) {
                    const top = stack[stack.length - 1];
                    if (top.type !== "op") break;

                    const topOp = top.value;
                    const topPrec = this.getPrecedence(topOp);

                    if (
                        (assoc === "left" && prec <= topPrec) ||
                        (assoc === "right" && prec < topPrec)
                    ) {
                        output.push(stack.pop());
                    } else {
                        break;
                    }
                }

                stack.push({ type: "op", value: op });
                prevToken = t;
            }
        }

        while (stack.length) {
            const top = stack.pop();
            if (top.type === "paren") {
                throw new Error("Mismatched parentheses");
            }
            output.push(top);
        }

        return output;
    }

    evalRPN(rpn) {
        const stack = [];

        for (const t of rpn) {
            if (t.type === "number" || t.type === "string") {
                stack.push(t.value);
            } else if (t.type === "ident") {
                const name = t.value;
                let v = this.vars.hasOwnProperty(name) ? this.vars[name] : 0;
                stack.push(v);
            } else if (t.type === "op") {
                const op = t.value;

                if (op === "UMINUS") {
                    if (stack.length < 1) throw new Error("Syntax error");
                    let v = stack.pop();
                    if (typeof v === "string") {
                        const num = parseFloat(v);
                        v = Number.isNaN(num) ? 0 : num;
                    }
                    stack.push(-v);
                    continue;
                }

                if (stack.length < 2) {
                    throw new Error("Syntax error");
                }

                let b = stack.pop();
                let a = stack.pop();

                // 문자열 덧셈 (연결)
                if (op === "+" && (typeof a === "string" || typeof b === "string")) {
                    stack.push(String(a) + String(b));
                    continue;
                }

                // 비교 연산자
                if (["=", "<>", "<", ">", "<=", ">="].includes(op)) {
                    let result;

                    if (typeof a === "string" || typeof b === "string") {
                        const sa = String(a);
                        const sb = String(b);
                        switch (op) {
                            case "=": result = (sa === sb); break;
                            case "<>": result = (sa !== sb); break;
                            case "<": result = (sa < sb); break;
                            case ">": result = (sa > sb); break;
                            case "<=": result = (sa <= sb); break;
                            case ">=": result = (sa >= sb); break;
                        }
                    } else {
                        const na = Number(a) || 0;
                        const nb = Number(b) || 0;
                        switch (op) {
                            case "=": result = (na === nb); break;
                            case "<>": result = (na !== nb); break;
                            case "<": result = (na < nb); break;
                            case ">": result = (na > nb); break;
                            case "<=": result = (na <= nb); break;
                            case ">=": result = (na >= nb); break;
                        }
                    }

                    // BASIC에서는 True = -1, False = 0 으로 많이 표현
                    stack.push(result ? -1 : 0);
                    continue;
                }

                // 나머지 산술 연산
                const na = Number(a) || 0;
                const nb = Number(b) || 0;
                let r = 0;
                switch (op) {
                    case "+":
                        r = na + nb;
                        break;
                    case "-":
                        r = na - nb;
                        break;
                    case "*":
                        r = na * nb;
                        break;
                    case "/":
                        if (nb === 0) {
                            throw new Error("Division by zero");
                        }
                        r = na / nb;
                        break;
                    default:
                        throw new Error("Unknown operator");
                }
                stack.push(r);
            }
        }

        if (!stack.length) return 0;
        return stack[stack.length - 1];
    }
}

/* ---------------- 부트스트랩 ---------------- */

window.onload = () => {
    // eslint-disable-next-line no-new
    new MSX();
};
