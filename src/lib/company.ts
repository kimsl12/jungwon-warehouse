/**
 * Company information used by the delivery PDF and any other place that
 * needs to identify the issuing company. Single source of truth.
 */
export const COMPANY = {
  name: "주식회사 정원전기",
  address: "서울시 강서구 개화동로 5길 9-16",
  businessNumber: "319-88-00289",
  ceo: "김주원",
  phone: "02-2644-0420",
  /** Public path to the logo (served by Next.js out of /public) */
  logoUrl: "/jungwon-logo.png",
} as const;
