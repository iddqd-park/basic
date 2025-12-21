# MSX BASIC Web Simulator

![MSX BASIC Splash](./splash.jpg)

[한국어 문서](./README.ko.md)

**MSX BASIC Web** is a web-based simulator that recreates the classic MSX BASIC experience right in your browser. It allows you to write, run, and learn BASIC programming with a retro monitor interface.

## ✨ Key Features

- **100% Client-Side**: Runs entirely in the browser with Vanilla JavaScript.
- **No Server Storage**: Your code is stored only in your browser's local storage (`localStorage`). No data is sent to any server.
- **No Installation & No Login**: Just visit the URL and start coding immediately.
- **Retro Experience**: Features a CRT monitor overlay and classic blue screen aesthetics.
- **Mobile Support**: Includes a virtual keyboard helper for coding on mobile devices.

## 🕹️ Supported Commands

This simulator supports a subset of MSX BASIC commands:

- **System**: `RUN`, `LIST`, `NEW`, `CLS`, `SAVE`, `LOAD`, `FILES`
- **Output**: `PRINT` (or `?`)
- **Flow Control**: `GOTO`, `GOSUB` ... `RETURN`, `IF` ... `THEN`, `FOR` ... `NEXT`, `END`
- **Input**: `INPUT`
- **Variables**: Numeric and String (e.g., `A$`) variables supported.

## 🚀 How to Use

1. **Type Code**: Enter BASIC commands in the input field.
2. **Run**: Type `RUN` to execute your program.
3. **Save/Load**: Use `SAVE "TITLE"` and `LOAD "TITLE"` to manage your programs locally.
4. **Function Keys**: Click the on-screen buttons to quickly type common commands (`COLOR`, `AUTO`, `GOTO`, `LIST`, `RUN`).

## 📝 Example Code

**Multiplication Table**
```basic
10 INPUT "DAN: "; D
20 FOR I = 1 TO 9
30 PRINT D; " * "; I; " = "; D*I
40 NEXT I
RUN
```

**Guess the Number**
```basic
10 N = 7
20 INPUT "GUESS(1-10): "; G
30 IF G = N THEN GOTO 60
40 IF G < N THEN PRINT "BIGGER"
50 IF G > N THEN PRINT "SMALLER"
55 GOTO 20
60 PRINT "CORRECT!"
```

## 🛠️ Technology Stack

- **HTML5 & CSS3**: For layout and retro styling.
- **Vanilla JavaScript**: Core interpreter and logic implementation.

## 📄 License

This project is free to use.
