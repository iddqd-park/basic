# MSX BASIC Web

[English](README.md) | [한국어](README.ko.md)

순수 HTML/JS로 구현된 경량 MSX BASIC 인터프리터입니다. 별도의 설치 없이 브라우저에서 레트로 컴퓨팅의 향수와 본질적인 코딩 경험을 즐겨보세요.

## Our Philosophy
IDDQD Internet은 별도의 DB나 회원가입 없이, 순수 HTML/JS만으로 브라우저에서 즉시 실행되는 도구를 개발합니다. AI 기능을 제공할 때도 데이터 상태를 유지하지 않으며(stateless), 어떠한 기록도 남기지 않는 원칙을 고수합니다.

### 브라우저에서 바로 실행
**[https://app.iddqd.kr/basic/](https://app.iddqd.kr/basic/)**
*(설치 없음, 로그인 없음, 즉시 실행)*

![Splash](splash.jpg)

## 주요 기능

- **설치 불필요**: 브라우저만 있으면 PC와 모바일 어디서나 실행 가능합니다.
- **완벽한 레트로 감성**: MSX 특유의 파란 배경 화면과 픽셀 폰트를 충실히 재현했습니다.
- **표준 명령어 지원**: `PRINT`, `GOTO`, `LIST`, `RUN`, `INPUT`, `CLS`, `NEW` 등 기본 BASIC 명령어를 지원합니다.
- **가상 기능 키**: 화면 하단의 `run`, `list`, `goto` 등의 버튼으로 빠른 명령 입력이 가능합니다.
- **가볍고 빠름**: 무겁고 복잡한 프레임워크 없이, 순수 자바스크립트 엔진으로 최적화되었습니다.

## 사용 방법

1. **코드 입력**: 가상 모니터 프롬프트에 BASIC 명령어를 입력합니다.
2. **실행**: `RUN`을 입력하여 작성한 프로그램을 실행합니다.
3. **관리**: `LIST` 명령어로 현재 코드를 확인하고, `NEW`로 메모리를 초기화할 수 있습니다.

### 예제 코드
```basic
10 PRINT "안녕 MSX"
20 GOTO 10
RUN
```

## 기술 스택

- **Core**: HTML5, Vanilla JavaScript (자체제작 MSX 엔진)
- **Styling**: Vanilla CSS3 (레트로 모니터 스타일링)
- **Environment**: Client-side Browser Engine

---

## Contact & Author
- IDDQD 인터넷 e-솔루션 및 e-게임 사업부 개발실장
- 기습코딩꾼 & 최상무의 모사꾼
- 홈페이지: https://iddqd.kr/
- 깃허브: https://github.com/iddqd-park
