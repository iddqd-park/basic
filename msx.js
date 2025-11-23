class MSX {
    constructor() {
        this.screenElement = document.getElementById('screen');
        this.inputElement = document.getElementById('virtual-keyboard');
        this.buffer = []; // Screen buffer (lines of text)
        this.currentLine = ""; // Current input line
        this.cursorPos = 0;
        this.program = {}; // Store BASIC program lines: { 10: "PRINT 'HI'", 20: "GOTO 10" }
        this.vars = {}; // Variables A-Z

        this.cols = 40; // MSX Screen 0 default
        this.rows = 24;

        this.init();
    }

    init() {
        this.print("MSX BASIC version 1.0");
        this.print("Copyright (C) 2024 by Antigravity");
        this.print("");
        this.print("Ok");
        this.render();

        // Focus handling for mobile/desktop
        document.addEventListener('click', () => {
            this.inputElement.focus();
        });

        // Keyboard handling
        this.inputElement.addEventListener('keydown', (e) => this.handleKey(e));
        this.inputElement.addEventListener('input', (e) => this.handleInput(e));
    }

    print(text) {
        // Split text into lines that fit the screen width
        // Simple implementation for now
        this.buffer.push(text);
        if (this.buffer.length > this.rows) {
            this.buffer.shift(); // Scroll
        }
        this.render();
    }

    render() {
        // Combine buffer + current input line
        let display = this.buffer.join('\n');
        display += '\n' + this.currentLine + '<span class="cursor"> </span>';
        this.screenElement.innerHTML = display;
    }

    handleKey(e) {
        // Desktop keyboard handling
        if (e.key === 'Enter') {
            this.processLine();
            e.preventDefault();
        } else if (e.key === 'Backspace') {
            this.currentLine = this.currentLine.slice(0, -1);
            this.render();
            e.preventDefault();
        }
    }

    handleInput(e) {
        // Mobile/Virtual keyboard handling
        // e.inputType helps distinguish actions

        if (e.inputType === 'insertText' && e.data) {
            // Normal typing
            // Check for newline in data just in case
            if (e.data === '\n') {
                this.processLine();
            } else {
                this.currentLine += e.data.toUpperCase();
                this.render();
            }
        } else if (e.inputType === 'deleteContentBackward') {
            // Backspace on mobile
            this.currentLine = this.currentLine.slice(0, -1);
            this.render();
        }

        // Clear input to keep it clean and prevent scrolling/history issues
        // We use a timeout to ensure the event is fully processed
        setTimeout(() => {
            this.inputElement.value = '';
        }, 0);
    }

    processLine() {
        const line = this.currentLine.trim();
        this.print(this.currentLine); // Echo to screen
        this.currentLine = "";

        if (line) {
            this.execute(line);
        } else {
            this.render();
        }
    }

    execute(commandStr) {
        // Simple parser
        // Check if it starts with a number (Program line)
        const parts = commandStr.match(/^(\d+)\s*(.*)/);

        if (parts) {
            // Store program line
            const lineNumber = parseInt(parts[1]);
            const code = parts[2];
            if (code) {
                this.program[lineNumber] = code;
            } else {
                delete this.program[lineNumber]; // Delete line if empty
            }
        }
        this.render();
    }

    runCommand(cmdStr) {
        const parts = cmdStr.trim().split(/\s+/);
        const cmd = parts[0].toUpperCase();
        const args = parts.slice(1).join(' ');

        switch (cmd) {
            case 'PRINT':
            case '?':
                this.cmdPrint(args);
                break;
            case 'LIST':
                this.cmdList();
                break;
            case 'CLS':
                this.buffer = [];
                this.print("Ok");
                break;
            case 'RUN':
                this.runProgram();
                break;
            case 'GOTO':
                // Only valid in program mode usually, but can be used to jump to a line
                // In direct mode, GOTO usually starts execution at that line
                const target = parseInt(args);
                if (!isNaN(target)) {
                    this.runProgram(target);
                } else {
                    this.print("Type mismatch");
                    this.print("Ok");
                }
                break;
            default:
                if (cmd === "") break;
                this.print("Syntax error");
                this.print("Ok");
        }
    }

    cmdPrint(args) {
        // Handle variables in PRINT
        // PRINT "A=";A
        // Split by ; or ,
        // For now, simple single expression or string

        if (args.startsWith('"')) {
            let output = args;
            if (output.startsWith('"') && output.endsWith('"')) {
                output = output.slice(1, -1);
            }
            this.print(output);
        } else {
            this.print(this.evaluate(args));
        }
    }

    cmdList() {
        const lines = Object.keys(this.program).sort((a, b) => parseInt(a) - parseInt(b));
        for (const lineNum of lines) {
            this.print(`${lineNum} ${this.program[lineNum]}`);
        }
        this.print("Ok");
    }

    async runProgram(startLine = null) {
        const lines = Object.keys(this.program).sort((a, b) => parseInt(a) - parseInt(b)).map(Number);
        if (lines.length === 0) return;

        let pc = 0;
        if (startLine) {
            pc = lines.indexOf(startLine);
            if (pc === -1) {
                this.print("Undefined line number");
                this.print("Ok");
                return;
            }
        }

        this.running = true;

        while (this.running && pc < lines.length) {
            const lineNum = lines[pc];
            const code = this.program[lineNum];

            // Execute line
            const result = await this.executeLine(code);

            if (result && result.action === 'GOTO') {
                const target = result.target;
                const newPc = lines.indexOf(target);
                if (newPc !== -1) {
                    pc = newPc;
                    continue; // Jump immediately
                } else {
                    this.print(`Undefined line number in ${lineNum}`);
                    this.running = false;
                    break;
                }
            } else if (result && result.action === 'END') {
                this.running = false;
                break;
            }

            pc++;

            // Allow UI update
            if (pc % 10 === 0) await new Promise(r => setTimeout(r, 0));
        }

        if (!this.running) {
            // Stopped explicitly or error
        }
        this.print("Ok");
    }

    async executeLine(code) {
        const parts = code.trim().split(/\s+/);
        const cmd = parts[0].toUpperCase();
        let args = parts.slice(1).join(' ');

        // Handle implicit LET (e.g., A=10)
        if (cmd.match(/^[A-Z]$/) && parts[1] === '=') {
            this.cmdLet(code);
            return null;
        }

        switch (cmd) {
            case 'PRINT':
            case '?':
                this.cmdPrint(args);
                break;
            case 'GOTO':
                const target = parseInt(args);
                return { action: 'GOTO', target: target };
            case 'IF':
                return this.cmdIf(args);
            case 'LET':
                this.cmdLet(args);
                break;
            case 'END':
                return { action: 'END' };
            case 'REM':
                break;
            case 'INPUT':
                // Basic INPUT support
                // For now, just set a variable to a dummy value or handle async input later
                // This is tricky in a non-blocking environment without more complex state management
                break;
        }
        return null;
    }

    cmdLet(args) {
        // Format: VAR = VALUE or LET VAR = VALUE
        // If args came from implicit LET, it's "A = 10"
        // If args came from LET command, it's "A = 10" (args is rest of string)

        // Simple parser: assume A=10 or A = 10
        const match = args.match(/^([A-Z])\s*=\s*(.*)/);
        if (match) {
            const varName = match[1];
            const expr = match[2];
            const val = this.evaluate(expr);
            this.vars[varName] = val;
        } else {
            this.print("Syntax error");
        }
    }

    cmdIf(args) {
        // Format: IF condition THEN line
        // Example: IF A=10 THEN 100

        // Split by THEN
        const parts = args.split(/\s+THEN\s+/i);
        if (parts.length !== 2) {
            this.print("Syntax error");
            return null;
        }

        const condition = parts[0];
        const thenPart = parts[1];

        if (this.evaluateCondition(condition)) {
            // If it's a number, it's a GOTO
            const target = parseInt(thenPart);
            if (!isNaN(target)) {
                return { action: 'GOTO', target: target };
            } else {
                // It might be a statement? Standard BASIC usually implies GOTO or allows statements
                // MSX BASIC allows statements: IF A=1 THEN PRINT "HI"
                // For now, let's support GOTO only for simplicity or simple recursion
                return this.executeLine(thenPart);
            }
        }
        return null;
    }

    evaluateCondition(cond) {
        // Very basic parser: A=B, A>B, A<B
        // Support constants and variables

        const ops = ['=', '<>', '>', '<', '>=', '<='];
        let op = null;
        for (const o of ops) {
            if (cond.includes(o)) {
                op = o;
                break;
            }
        }

        if (!op) return false;

        const [lhsStr, rhsStr] = cond.split(op);
        const lhs = this.evaluate(lhsStr.trim());
        const rhs = this.evaluate(rhsStr.trim());

        switch (op) {
            case '=': return lhs == rhs;
            case '<>': return lhs != rhs;
            case '>': return lhs > rhs;
            case '<': return lhs < rhs;
            case '>=': return lhs >= rhs;
            case '<=': return lhs <= rhs;
        }
        return false;
    }

    evaluate(expr) {
        // Simple integer or variable
        expr = expr.trim();
        if (expr.match(/^-?\d+$/)) {
            return parseInt(expr);
        } else if (expr.match(/^[A-Z]$/)) {
            return this.vars[expr] || 0;
        } else if (expr.startsWith('"') && expr.endsWith('"')) {
            return expr.slice(1, -1);
        } else if (expr.includes('+')) {
            // Very basic addition
            const parts = expr.split('+');
            return this.evaluate(parts[0]) + this.evaluate(parts[1]);
        }
        return 0;
    }
}

window.onload = () => {
    const msx = new MSX();
};
