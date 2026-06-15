export const ADMIN_LOGIN_ID = "0zsogi";
export const ADMIN_AUTH_EMAIL = "0zsogi@oc-home.local";
export const AUTH_ID_EMAIL_DOMAIN = "oc-home.local";

export function resolveLoginEmail(loginId: string) {
  const trimmedLoginId = loginId.trim();
  const normalizedLoginId = trimmedLoginId.toLowerCase();

  if (normalizedLoginId === ADMIN_LOGIN_ID) {
    return ADMIN_AUTH_EMAIL;
  }

  const safeLoginId = normalizedLoginId.replace(/[^a-z0-9._-]/g, "");
  return `${safeLoginId}@${AUTH_ID_EMAIL_DOMAIN}`;
}

export function displayLoginId(email?: string | null) {
  if (!email) return "";
  return email.endsWith(`@${AUTH_ID_EMAIL_DOMAIN}`) ? email.split("@")[0] : email;
}

export function validateLoginId(loginId: string) {
  const trimmedLoginId = loginId.trim();

  if (!trimmedLoginId) {
    return "아이디를 입력해주세요.";
  }

  if (trimmedLoginId.includes("@")) {
    return "이메일 형식은 사용할 수 없어요. @ 없이 아이디만 입력해주세요.";
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(trimmedLoginId)) {
    return "아이디는 영어, 숫자, 점(.), 밑줄(_), 하이픈(-)만 사용할 수 있어요.";
  }

  return "";
}

export function friendlyAuthError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";

  if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password")) {
    return "아이디 또는 비밀번호가 맞지 않아요. 다시 확인해주세요.";
  }

  if (code.includes("auth/user-not-found")) {
    return "등록된 계정을 찾지 못했어요.";
  }

  if (code.includes("auth/email-already-in-use")) {
    return "이미 가입된 계정이에요. 로그인으로 들어와주세요.";
  }

  if (code.includes("auth/weak-password")) {
    return "비밀번호는 6자 이상으로 입력해주세요.";
  }

  if (code.includes("auth/too-many-requests")) {
    return "로그인 시도가 너무 많아요. 잠시 뒤에 다시 시도해주세요.";
  }

  if (code.includes("auth/network-request-failed")) {
    return "네트워크 연결을 확인한 뒤 다시 시도해주세요.";
  }

  return "로그인 처리 중 문제가 생겼어요. 입력값을 확인하고 다시 시도해주세요.";
}
