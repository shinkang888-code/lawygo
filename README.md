# LawGo - 법무 관리 시스템

법무법인을 위한 스마트 사건 관리 플랫폼입니다.

## 🚀 빠른 시작

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
# → http://localhost:3000

# 프로덕션 빌드
npm run build
npm start
```

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              # SCR-01: 대시보드
│   ├── cases/
│   │   ├── page.tsx          # SCR-02: 사건 그리드
│   │   ├── [id]/page.tsx     # SCR-03: 사건 상세 (타임라인)
│   │   └── new/page.tsx      # 사건 등록 폼
│   ├── board/
│   │   ├── page.tsx          # 전문 게시판 목록 (G6 연동)
│   │   └── [boardId]/        # 게시판별 글 목록·글 상세
│   ├── api/board/            # 게시판 중간 관리자 API (브릿지)
│   ├── approval/page.tsx     # SCR-04: 전자결재
│   ├── finance/page.tsx      # SCR-04: 회계/수납 매칭
│   ├── calendar/page.tsx     # 기일 달력
│   ├── stats/page.tsx        # 통계/분석
│   ├── staff/page.tsx        # 직원 관리
│   └── settings/page.tsx     # 시스템 설정
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx       # LNB 사이드바 (접힘/펼침)
│   │   └── Header.tsx        # GNB (Omnibar + 알림)
│   ├── dashboard/
│   │   ├── PriorityCard.tsx  # 긴급 기일 카드 (Red Glow)
│   │   └── StatCard.tsx      # 통계 카드
│   ├── cases/
│   │   ├── StaffChips.tsx    # 담당자 Chip UI
│   │   ├── FilterTray.tsx    # 멀티 필터 트레이
│   │   └── CaseDrawer.tsx    # 사건 사이드 드로어
│   └── ui/
│       ├── badge.tsx         # Badge, StatusBadge, DDayBadge
│       ├── button.tsx        # Button (다양한 variant)
│       ├── skeleton.tsx      # Skeleton Shimmer 로딩
│       ├── avatar.tsx        # Avatar + AvatarGroup
│       └── toast.tsx         # Toast 알림 (sonner)
└── lib/
    ├── types.ts              # TypeScript 타입 정의
    ├── utils.ts              # 유틸리티 함수
    ├── gnuboard.ts           # 그누보드 6 API 클라이언트
    ├── boardBridge.ts        # 게시판 중간 관리자 (에러·폴백)
    ├── boardConfig.ts        # 게시판 ID/이름 설정
    └── mockData.ts           # 목 데이터 (개발용)
```

## 🎨 디자인 시스템

- **Font**: Pretendard (tabular-nums 지원)
- **Colors**: Navy Primary + Red Danger + Semantic 컬러
- **Animation**: Framer Motion (fade-up, slide-in, pulse-glow)
- **Icons**: Lucide React
- **Styling**: Tailwind CSS (4pt grid system)

## 📂 LawTop GL 구버전 참고 및 DB 스키마

- **분석 문서**: [docs/LAWTOP_GL_ANALYSIS.md](docs/LAWTOP_GL_ANALYSIS.md)  
  - 설치 경로 구조, 서브 프로그램(수납/결재/리포트/알림 등), 설정 파일, 메뉴 매핑
- **DB 스키마**: `supabase/migrations/20260306000000_lawgo_schema.sql`  
  - 테이블: `cases`, `deadlines`, `staff`, `clients`, `approvals`, `approval_steps`, `finance_entries`, `bank_transactions`, `timeline`, `notifications`, `consultations`
- **메뉴 설정**: `src/lib/menuConfig.ts` (LNB / 모바일 메뉴, LawTop 모듈 대응)
- **Supabase 사용 시**: `npm install @supabase/supabase-js` 후 `.env.local`에 URL/Key 설정, `getSupabase()` 사용

## 🔧 프론트엔드 관리자

- **진입**: 시스템 설정 → **프론트엔드 관리자** 또는 `/admin`
- **기능**
  - **메뉴 관리** (`/admin/menus`): 이용자 화면(LNB·모바일 하단·더보기) 메뉴 등록·편집·삭제·순서 변경
  - **관리 대시보드** (`/admin`): 메뉴 관리·시스템 설정 바로가기
- **저장**: Supabase 테이블 `site_menus` 사용. 미연동 시 기본 메뉴 표시 후, "기본 메뉴를 DB에 저장"으로 한 번 저장하면 편집 가능.
- **반영**: 사이드바·모바일 네비는 `/api/menus` 응답을 사용하며, DB에 값이 있으면 DB 기준, 없으면 `menuConfig` 기본값 사용.

## 📋 전문 게시판 (G6 하이브리드)

- **메뉴**: 사이드바/모바일에서 **전문 게시판** → 게시판 목록 → 게시판별 글 목록·글 상세
- **G6 설치**: `g6/` 폴더에 그누보드6 소스를 clone 후 실행. 자세한 절차는 [g6/README.md](g6/README.md) 참고
- **중간 관리자**: LawGo는 G6를 직접 호출하지 않고 **API 브릿지**(`/api/board/*`)를 통해 통신합니다.
  - `src/lib/boardBridge.ts`: G6 호출 래핑, 에러 시 폴백·정규화
  - `src/app/api/board/`: Next.js API 라우트 (게시판 목록, 글 목록/단건, 댓글)
- G6가 꺼져 있어도 게시판 목록은 표시되며, 글 목록은 G6 연동 후 이용 가능합니다.

## 🔗 그누보드 6 연동 설정

1. `.env.local.example`을 `.env.local`로 복사
2. 그누보드 6 API URL과 키를 설정
3. `src/lib/gnuboard.ts`에서 API 함수 사용

```typescript
import { getCaseMemos, createPost } from "@/lib/gnuboard";

// 사건 메모 조회 (wr_1 = case_id 필터)
const memos = await getCaseMemos("c001");

// 메모 작성
await createPost("case_memo", {
  wr_subject: "상담 메모",
  wr_content: "내용...",
  wr_1: "c001", // case_id
});
```

## 🌐 Vercel 배포

```bash
npx vercel --prod
```

Vercel 대시보드에서 환경 변수 설정:
- `NEXT_PUBLIC_GNUBOARD_API_URL`
- `NEXT_PUBLIC_GNUBOARD_API_KEY`
