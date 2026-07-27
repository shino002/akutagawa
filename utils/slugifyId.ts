/**
 * 문자열을 URL/문서 ID용 슬러그로 바꿉니다.
 * 영문·숫자·한글·`_`·`-`만 남기고 나머지는 하이픈으로 치환합니다.
 */
export const slugifyId = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};
