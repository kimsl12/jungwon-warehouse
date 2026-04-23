/**
 * Company information used by the delivery PDF and any other place that
 * needs to identify the issuing company. Single source of truth.
 */
export const COMPANY = {
  name: "주식회사 정원전기",
  address: "서울특별시 강서구 개화동로5길 9-16, 1층",
  businessNumber: "319-88-00289",
  ceo: "김주원",
  phone: "02-2644-0420",
  fax: "02-2645-0421",
  /** 업태/종목 (발주서 양식 전용) */
  businessType: "건설업",
  businessItem: "전기공사업",
  /** 발주서 담당자 정보 */
  contactPerson: "김승열 차장",
  contactPhone: "010-3273-6943",
  contactEmail: "elwon9402@jungwonenc.co.kr",
  /** Public path to the logo (served by Next.js out of /public) */
  logoUrl: "/jungwon-logo.png",
  /** 발주서에 찍히는 법인 도장 이미지 */
  sealUrl: "/company-seal.png",
} as const;
