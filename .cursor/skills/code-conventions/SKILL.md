---
name: code-conventions
description: Defines code style conventions for this project, especially function definition style (components vs non-components). Use when writing or refactoring TypeScript/React code, defining functions, or reviewing code style.
---

# 코드 컨벤션

이 프로젝트는 표준 TypeScript/React 컨벤션을 따르며, **반드시 지켜야 할 단 하나의 규칙**이 있다. 그 외 항목은 ESLint + Prettier가 강제하는 커뮤니티 기본값을 따른다.

## 1. 함수 정의 스타일 (필수)

**컴포넌트는 함수 선언문(`function`), 그 외는 화살표 함수를 사용한다.**

이 규칙은 ESLint(`react/function-component-definition`)로 강제되어 위반 시 lint가 실패한다.

### 컴포넌트 → `function` 선언

```tsx
export default function HomePage() {
  return <main>...</main>;
}

export function WorkCard({ work }: Props) {
  return <article>...</article>;
}
```

### 그 외 모든 함수 → 화살표 함수

훅, 유틸, 이벤트 핸들러, 콜백, API 헬퍼 등 — 전부 `const`에 할당하는 화살표 함수로 작성한다.

```ts
export const useWorks = () => {
  const [works, setWorks] = useState<Work[]>([]);
  return { works };
};

export const formatDate = (iso: string): string => {
  return dayjs(iso).format("YYYY-MM-DD");
};

const handleClick = () => {
  console.log("clicked");
};
```

### 컴포넌트 판별 기준

컴포넌트는 **JSX를 반환**하고 **PascalCase 이름**을 가진 함수다. 두 조건 모두 만족하면 `function` 선언, 아니면 화살표 함수.

| 함수 | JSX 반환? | 네이밍 | 형태 |
|------|-----------|--------|------|
| `HomePage` | 예 | PascalCase | `function` 선언 |
| `WorkCard` | 예 | PascalCase | `function` 선언 |
| `useWorks` | 아니오 (데이터 반환) | camelCase, `use*` | 화살표 |
| `formatDate` | 아니오 | camelCase | 화살표 |
| `renderItem` (JSX 반환하지만 camelCase) | 예 | camelCase | 화살표 |

## 2. Export 스타일 (필수)

**가능한 한 named export를 사용한다. `export default`는 Next.js가 요구하는 라우트 파일에서만 허용한다.**

### Named export 사용 (기본)

훅, 유틸, 타입, 컴포넌트, 상수 등 거의 모든 모듈은 named export로 작성한다.

```ts
export const useWorks = () => { ... };

export const formatDate = (iso: string) => { ... };

export type Work = { id: string; title: string };

export function WorkCard({ work }: Props) {
  return <article>...</article>;
}
```

### `export default` 허용 예외

Next.js가 default export를 요구하는 파일에서만 사용한다:

- `app/**/page.tsx`
- `app/**/layout.tsx`
- `app/**/loading.tsx`, `error.tsx`, `not-found.tsx`, `template.tsx`
- `next.config.ts`, `middleware.ts` 같은 Next.js 설정 파일

```tsx
export default function HomePage() {
  return <main>...</main>;
}
```

### 이유

- **자동 완성 / 리팩토링**: named export는 IDE가 정확한 이름으로 import를 제안하고, 이름 변경 시 일괄 리팩토링이 안전하다.
- **오타 방지**: default export는 import 측에서 임의 이름을 붙일 수 있어 `import Foo from ...`과 `import Bar from ...`이 같은 모듈을 가리키는 혼란이 생긴다.
- **tree-shaking**: 번들러가 named export를 더 잘 추적한다.

## 3. 컴포넌트 Props 타입 정의 (필수)

**컴포넌트의 props 타입은 해당 컴포넌트 바로 위에 `interface`로 정의한다.**

- 위치: 컴포넌트 선언 **바로 위**. 파일 상단이나 별도 파일로 분리하지 않는다.
- 형태: `type` alias가 아닌 `interface` 사용.
- 네이밍: `<ComponentName>Props`.

### 올바른 예시

```tsx
interface WorkCardProps {
  work: Work;
  onClick?: (id: string) => void;
}

export function WorkCard({ work, onClick }: WorkCardProps) {
  return <article>...</article>;
}
```

### 잘못된 예시

```tsx
// 1. type alias 사용 — interface 사용할 것
type WorkCardProps = { work: Work };

// 2. 컴포넌트와 떨어진 위치(파일 상단)에 정의 — 컴포넌트 바로 위로 이동할 것
interface WorkCardProps { work: Work }
// ... 다른 코드 50줄 ...
export function WorkCard({ work }: WorkCardProps) { ... }

// 3. 인라인 정의 — interface로 분리할 것
export function WorkCard({ work }: { work: Work }) { ... }
```

### 예외

- props가 여러 컴포넌트에서 공유되는 경우에만 `types/`로 분리한다.
- 한 파일에 여러 컴포넌트가 있으면 각 컴포넌트 바로 위에 각자의 `*Props` interface를 둔다.

## 4. 일반 컨벤션 (표준)

프로젝트 고유 규칙이 아닌 커뮤니티 기본값을 따른다. 대부분 ESLint와 Prettier가 자동으로 처리한다.

- **기본은 `const`**, 재할당이 필요할 때만 `let`, `var`는 절대 사용 금지.
- **명시적 반환 타입** — export되는 함수에서 반환 타입 추론이 명확하지 않을 때만 명시. 자명한 경우(`(x: number) => x + 1`)는 생략.
- **`.then()` 체인 대신 `async/await`** 사용.
- **엄격 비교**(`===`, `!==`) — ESLint로 강제됨.
- **`any` 금지** — `unknown`으로 받고 narrowing하거나 타입을 정의할 것. `@typescript-eslint/no-explicit-any`로 강제됨.
- **import 순서**: 외부 패키지 → `@/` 별칭 → 상대 경로. Prettier/ESLint가 설정되어 있으면 자동 정렬.

## 5. ESLint 강제

함수 스타일 규칙은 `eslint.config.mjs`에 다음과 같이 설정되어 있다:

```js
"react/function-component-definition": ["error", {
  namedComponents: "function-declaration",
  unnamedComponents: "arrow-function",
}]
```

컴포넌트를 화살표 함수로 작성하거나, 비컴포넌트를 `function` 선언으로 작성하면 `pnpm lint`가 실패한다.
