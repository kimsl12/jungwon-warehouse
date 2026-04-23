/* eslint-disable jsx-a11y/alt-text */
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import path from "node:path";

import { COMPANY } from "@/lib/company";

/**
 * 발주서 PDF.
 *
 * 정원전기 → 외부 거래처로 보내는 발주 문서. 양식은 사용자가 제공한 기존
 * 발주서 레이아웃을 1:1 재현한다:
 *
 *  - 상단: 작성일 / 발주서 타이틀 / 일련번호
 *  - 수주처(거래처) / 발주처(정원전기) 박스 (도장 포함)
 *  - "아래와 같이 발주 요청합니다." 문구
 *  - 합계금액 (한글 대문자 원정 표기)
 *  - 품목 테이블: 품목 / 규격 / 단위 / 수량 / 단가 / 공급가액 / 세액 / 비고
 *  - 합계 행
 *  - 하단 박스: 비고 / 배송지 / 받는이 / 결제·인도·검수 조건 / 담당자
 *
 * Server-only — Node path로 폰트·도장 이미지 로드. Edge runtime 불가.
 */

Font.register({
  family: "NotoSansKR",
  fonts: [
    {
      src: path.join(process.cwd(), "src/fonts/NotoSansKR-Regular.ttf"),
      fontWeight: "normal",
    },
    {
      src: path.join(process.cwd(), "src/fonts/NotoSansKR-Bold.ttf"),
      fontWeight: "bold",
    },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

const BORDER = "#444";
const MUTED = "#666";

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansKR",
    fontSize: 9,
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 28,
    color: "#111",
  },

  /* 상단 타이틀 바 */
  topBar: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 10,
  },
  topCell: {
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "center",
  },
  topLabel: { fontSize: 8, color: MUTED },
  topValue: { fontSize: 9, fontWeight: "bold" },
  topTitle: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  topTitleText: {
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 8,
  },

  /* 수주처/발주처 박스 */
  partyRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  partyBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 6,
  },
  partyHeader: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 4,
  },
  partyRow2: {
    flexDirection: "row",
    marginBottom: 2,
    minHeight: 14,
  },
  partyLabel: {
    fontSize: 8,
    color: MUTED,
    width: 44,
  },
  partyValue: {
    fontSize: 9,
    flex: 1,
  },
  partyValueBold: {
    fontSize: 9,
    fontWeight: "bold",
    flex: 1,
  },
  sealBox: {
    position: "absolute",
    right: 10,
    top: 18,
    width: 56,
    height: 56,
    opacity: 0.85,
  },

  /* "아래와 같이 발주 요청합니다" */
  preamble: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 6,
  },

  /* 합계 금액 박스 */
  totalBox: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: BORDER,
    padding: 6,
    marginBottom: 6,
    alignItems: "center",
  },
  totalLabel: { fontSize: 9, fontWeight: "bold", marginRight: 8 },
  totalWord: { fontSize: 9, color: MUTED, marginRight: 8 },
  totalAmount: { fontSize: 11, fontWeight: "bold", flex: 1, textAlign: "right" },

  /* 품목 테이블 */
  table: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
  },
  th: {
    flexDirection: "row",
    backgroundColor: "#eee",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#aaa",
    minHeight: 18,
  },
  th_: {
    paddingVertical: 4,
    paddingHorizontal: 3,
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  td: {
    paddingVertical: 3,
    paddingHorizontal: 3,
    fontSize: 8,
    borderRightWidth: 1,
    borderRightColor: "#aaa",
  },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  /* 각 컬럼 폭 */
  colName: { flex: 3 },
  colSpec: { flex: 1.2 },
  colUnit: { flex: 0.6, textAlign: "center" },
  colQty: { flex: 0.8, textAlign: "right" },
  colPrice: { flex: 1, textAlign: "right" },
  colSupply: { flex: 1.2, textAlign: "right" },
  colTax: { flex: 1, textAlign: "right" },
  colNote: { flex: 1.2 },

  /* 하단 박스 */
  footBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderTopWidth: 0,
  },
  footRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    minHeight: 18,
  },
  footLabel: {
    width: 70,
    padding: 4,
    fontSize: 8,
    fontWeight: "bold",
    backgroundColor: "#f5f5f5",
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "center",
  },
  footValue: {
    flex: 1,
    padding: 4,
    fontSize: 9,
    justifyContent: "center",
  },
  footDouble: {
    flex: 1,
    flexDirection: "row",
  },
});

export type PurchaseOrderPdfItem = {
  no: number;
  name: string;
  variant: string | null;
  spec: string | null;
  unit: string | null;
  quantity: number;
  unit_price: number;
  note: string | null;
};

export type PurchaseOrderPdfProps = {
  poNumber: string;
  orderDate: string;       // YYYY-MM-DD
  dueDate: string | null;  // YYYY-MM-DD
  vendor: {
    name: string;
    address: string | null;
    contact_phone: string | null;
    fax: string | null;
  };
  items: PurchaseOrderPdfItem[];
  paymentTerms: string | null;
  deliveryTerms: string | null;
  inspectionTerms: string | null;
  shipTo: string | null;
  shipToContact: string | null;
  note: string | null;
};

const nf = new Intl.NumberFormat("ko-KR");

function fmtKoreanDate(ymd: string) {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

/** 숫자를 한글 금액("일금 XX원정") 앞에 쓸 아라비아 + "원정" 형식으로 */
function fmtAmountWord(n: number) {
  return `${nf.format(n)} 원정`;
}

export function PurchaseOrderPdf(props: PurchaseOrderPdfProps) {
  const supplyTotal = props.items.reduce(
    (s, it) => s + it.quantity * it.unit_price,
    0,
  );
  const taxTotal = Math.round(supplyTotal * 0.1);
  const grandTotal = supplyTotal + taxTotal;

  const logoPath = path.join(process.cwd(), "public", "jungwon-logo.png");
  const sealPath = path.join(process.cwd(), "public", "company-seal.png");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 상단 타이틀 바 */}
        <View style={styles.topBar}>
          <View style={[styles.topCell, { width: 110 }]}>
            <Text style={styles.topLabel}>작성일</Text>
            <Text style={styles.topValue}>{fmtKoreanDate(props.orderDate)}</Text>
          </View>
          <View style={[styles.topCell, styles.topTitle]}>
            <Text style={styles.topTitleText}>발 주 서</Text>
          </View>
          <View style={[styles.topCell, { width: 110, borderRightWidth: 0 }]}>
            <Text style={styles.topLabel}>일련번호</Text>
            <Text style={styles.topValue}>{props.poNumber}</Text>
          </View>
        </View>

        {/* 수주처 / 발주처 */}
        <View style={styles.partyRow}>
          {/* 수주처 (거래처) */}
          <View style={[styles.partyBox, { marginRight: 4 }]}>
            <Text style={styles.partyHeader}>[ 수주처 ]</Text>
            <View style={styles.partyRow2}>
              <Text style={styles.partyLabel}>상호</Text>
              <Text style={styles.partyValueBold}>{props.vendor.name}</Text>
              <Text style={{ fontSize: 9, fontWeight: "bold" }}>귀하</Text>
            </View>
            <View style={styles.partyRow2}>
              <Text style={styles.partyLabel}>주소</Text>
              <Text style={styles.partyValue}>{props.vendor.address ?? ""}</Text>
            </View>
            <View style={styles.partyRow2}>
              <Text style={styles.partyLabel}>TEL</Text>
              <Text style={styles.partyValue}>{props.vendor.contact_phone ?? ""}</Text>
              <Text style={styles.partyLabel}>FAX</Text>
              <Text style={styles.partyValue}>{props.vendor.fax ?? ""}</Text>
            </View>
            <View style={styles.partyRow2}>
              <Text style={styles.partyLabel}>납기일</Text>
              <Text style={styles.partyValue}>
                {props.dueDate ? fmtKoreanDate(props.dueDate) : ""}
              </Text>
            </View>
          </View>

          {/* 발주처 (정원전기 + 도장) */}
          <View style={[styles.partyBox, { marginLeft: 4 }]}>
            <Text style={styles.partyHeader}>[ 발주처 ]</Text>
            <View style={styles.partyRow2}>
              <Text style={styles.partyLabel}>상호</Text>
              <Text style={styles.partyValueBold}>{COMPANY.name}</Text>
            </View>
            <View style={styles.partyRow2}>
              <Text style={styles.partyLabel}>등록번호</Text>
              <Text style={styles.partyValueBold}>{COMPANY.businessNumber}</Text>
              <Text style={styles.partyLabel}>성명</Text>
              <Text style={styles.partyValueBold}>{COMPANY.ceo}</Text>
            </View>
            <View style={styles.partyRow2}>
              <Text style={styles.partyLabel}>주소</Text>
              <Text style={styles.partyValue}>{COMPANY.address}</Text>
            </View>
            <View style={styles.partyRow2}>
              <Text style={styles.partyLabel}>업태</Text>
              <Text style={styles.partyValue}>{COMPANY.businessType}</Text>
              <Text style={styles.partyLabel}>종목</Text>
              <Text style={styles.partyValue}>{COMPANY.businessItem}</Text>
            </View>
            <View style={styles.partyRow2}>
              <Text style={styles.partyLabel}>TEL</Text>
              <Text style={styles.partyValue}>{COMPANY.phone}</Text>
              <Text style={styles.partyLabel}>FAX</Text>
              <Text style={styles.partyValue}>{COMPANY.fax}</Text>
            </View>

            {/* 도장 */}
            <Image src={sealPath} style={styles.sealBox} />
          </View>
        </View>

        <Text style={styles.preamble}>아래와 같이 발주 요청합니다.</Text>

        {/* 합계 금액 */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>합계금액 (부가세포함)</Text>
          <Text style={styles.totalWord}>일금</Text>
          <Text style={styles.totalAmount}>{fmtAmountWord(grandTotal)}</Text>
        </View>

        {/* 품목 테이블 */}
        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={[styles.th_, styles.colName]}>품목</Text>
            <Text style={[styles.th_, styles.colSpec]}>규격</Text>
            <Text style={[styles.th_, styles.colUnit]}>단위</Text>
            <Text style={[styles.th_, styles.colQty]}>수량</Text>
            <Text style={[styles.th_, styles.colPrice]}>단가</Text>
            <Text style={[styles.th_, styles.colSupply]}>공급가액</Text>
            <Text style={[styles.th_, styles.colTax]}>세액</Text>
            <Text style={[styles.th_, styles.colNote, { borderRightWidth: 0 }]}>비고</Text>
          </View>

          {props.items.map((it) => {
            const supply = it.quantity * it.unit_price;
            const tax = Math.round(supply * 0.1);
            const displayName = it.variant ? `${it.name} · ${it.variant}` : it.name;
            return (
              <View key={it.no} style={styles.tr}>
                <Text style={[styles.td, styles.colName]}>{displayName}</Text>
                <Text style={[styles.td, styles.colSpec]}>{it.spec ?? ""}</Text>
                <Text style={[styles.td, styles.colUnit]}>{it.unit ?? ""}</Text>
                <Text style={[styles.td, styles.colQty]}>{nf.format(it.quantity)}</Text>
                <Text style={[styles.td, styles.colPrice]}>
                  {it.unit_price > 0 ? nf.format(it.unit_price) : ""}
                </Text>
                <Text style={[styles.td, styles.colSupply]}>
                  {supply > 0 ? nf.format(supply) : ""}
                </Text>
                <Text style={[styles.td, styles.colTax]}>
                  {tax > 0 ? nf.format(tax) : ""}
                </Text>
                <Text style={[styles.td, styles.colNote, { borderRightWidth: 0 }]}>
                  {it.note ?? ""}
                </Text>
              </View>
            );
          })}

          {/* 빈 행 채우기 (양식 느낌 유지) */}
          {Array.from({
            length: Math.max(0, 12 - props.items.length),
          }).map((_, i) => (
            <View key={`blank-${i}`} style={styles.tr}>
              <Text style={[styles.td, styles.colName]}> </Text>
              <Text style={[styles.td, styles.colSpec]}> </Text>
              <Text style={[styles.td, styles.colUnit]}> </Text>
              <Text style={[styles.td, styles.colQty]}> </Text>
              <Text style={[styles.td, styles.colPrice]}> </Text>
              <Text style={[styles.td, styles.colSupply]}> </Text>
              <Text style={[styles.td, styles.colTax]}> </Text>
              <Text style={[styles.td, styles.colNote, { borderRightWidth: 0 }]}> </Text>
            </View>
          ))}

          {/* 합계 행 */}
          <View style={styles.totalRow}>
            <Text style={[styles.td, styles.colName, { fontWeight: "bold", textAlign: "center" }]}>
              합계
            </Text>
            <Text style={[styles.td, styles.colSpec]}> </Text>
            <Text style={[styles.td, styles.colUnit]}> </Text>
            <Text style={[styles.td, styles.colQty, { fontWeight: "bold" }]}>
              {nf.format(props.items.reduce((s, it) => s + it.quantity, 0))}
            </Text>
            <Text style={[styles.td, styles.colPrice]}> </Text>
            <Text style={[styles.td, styles.colSupply, { fontWeight: "bold" }]}>
              {nf.format(supplyTotal)}
            </Text>
            <Text style={[styles.td, styles.colTax, { fontWeight: "bold" }]}>
              {nf.format(taxTotal)}
            </Text>
            <Text style={[styles.td, styles.colNote, { borderRightWidth: 0 }]}>-</Text>
          </View>
        </View>

        {/* 하단 박스 */}
        <View style={styles.footBox}>
          <View style={styles.footRow}>
            <Text style={styles.footLabel}>비고</Text>
            <Text style={styles.footValue}>{props.note ?? ""}</Text>
          </View>
          <View style={styles.footRow}>
            <Text style={styles.footLabel}>배송지</Text>
            <View style={styles.footDouble}>
              <Text style={[styles.footValue, { flex: 2 }]}>{props.shipTo ?? ""}</Text>
              <Text style={styles.footLabel}>받는이</Text>
              <Text style={styles.footValue}>{props.shipToContact ?? ""}</Text>
            </View>
          </View>
          <View style={styles.footRow}>
            <Text style={styles.footLabel}>결제조건</Text>
            <View style={styles.footDouble}>
              <Text style={styles.footValue}>{props.paymentTerms ?? ""}</Text>
              <Text style={styles.footLabel}>인도조건</Text>
              <Text style={styles.footValue}>{props.deliveryTerms ?? ""}</Text>
              <Text style={styles.footLabel}>검수조건</Text>
              <Text style={styles.footValue}>{props.inspectionTerms ?? ""}</Text>
            </View>
          </View>
          <View style={styles.footRow}>
            <Text style={styles.footLabel}>담당자</Text>
            <View style={styles.footDouble}>
              <Text style={[styles.footValue, { flex: 1 }]}>{COMPANY.contactPerson}</Text>
              <Text style={styles.footLabel}>연락처</Text>
              <Text style={styles.footValue}>{COMPANY.contactPhone}</Text>
              <Text style={styles.footLabel}>e-mail</Text>
              <Text style={[styles.footValue, { flex: 1.3 }]}>{COMPANY.contactEmail}</Text>
            </View>
          </View>
        </View>

        {/* 안 쓰는 로고 참조로 trace 방지 */}
        <Image src={logoPath} style={{ position: "absolute", width: 0, height: 0 }} />
      </Page>
    </Document>
  );
}
