# 그누보드6 (G6) 설치 및 연동

LawGo는 **전문 게시판** 기능을 위해 그누보드6(G6)과 하이브리드 연동합니다.  
G6는 별도 프로세스로 실행되며, LawGo의 **중간 관리자(API 브릿지)** 를 통해 통신합니다.

## 1. G6 설치

### 요구사항
- Python 3.8+
- Git

### 설치 절차

```bash
cd g6
git clone https://github.com/gnuboard/g6.git . --depth 1

python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate

pip install -r requirements.txt
```

### 실행

```bash
# g6 폴더에서
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

기본 URL: `http://localhost:8000`

## 2. LawGo 연동

- LawGo 환경변수: `NEXT_PUBLIC_GNUBOARD_API_URL=http://localhost:8000/api`
- 전문 게시판 메뉴에서 G6 게시판 이용 가능.
