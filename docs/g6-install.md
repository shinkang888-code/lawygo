# 그누보드6 (G6) 설치 및 연동

LawGo는 **전문 게시판** 기능을 위해 그누보드6(G6)과 하이브리드 연동합니다.  
G6는 별도 프로세스로 실행되며, LawGo의 **중간 관리자(API 브릿지)** 를 통해 통신합니다.

## 1. G6 설치

### 요구사항
- **Python 3.8 ~ 3.13** (3.14는 pydantic-core 미지원으로 권장하지 않음)
- Git

### 설치 절차

```bash
cd g6
git clone https://github.com/gnuboard/g6.git . --depth 1

# Python 3.8~3.13 사용 (3.14는 pydantic-core 미지원)
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate

pip install -r requirements.txt
```

**Python 3.14만 있는 경우:** pydantic-core에 3.14용 wheel이 없어 설치가 실패할 수 있습니다. [Python 3.12](https://www.python.org/downloads/) 설치 후 다음으로 가상환경을 만드세요.
```bash
# Windows (Python 3.12 설치 후)
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 실행

```bash
# g6 폴더에서
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

기본 URL: `http://localhost:8000`

## 2. LawGo 연동

### 환경 변수 설정

프로젝트 루트의 `.env.local`에 다음을 추가한 뒤 개발 서버를 재시작하세요.

```env
# 그누보드6 API (로컬 실행 시)
NEXT_PUBLIC_GNUBOARD_API_URL=http://localhost:8000/api

# G6에서 API 키를 사용하는 경우 (선택)
# NEXT_PUBLIC_GNUBOARD_API_KEY=your-api-key
```

- **로컬 G6**: `http://localhost:8000/api` (위와 동일)
- **다른 서버**: `https://your-g6-server.com/api` 형태로 입력

### 확인

1. G6가 `http://localhost:8000` 에서 실행 중인지 확인
2. LawGo 개발 서버 재시작 (`npm run dev`)
3. **전문 게시판** 메뉴에서 게시판 선택 → 게시글 목록이 보이면 연동 완료
