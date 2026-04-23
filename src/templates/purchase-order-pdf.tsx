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
 * 발주서 PDF — 첨부 양식 1:1 재현.
 *
 * 컬럼 폭은 고정(width: pt) 으로 지정해 헤더·데이터·합계 세로선이 엄격히
 * 일치하도록 한다. 하단 박스는 12-칼럼 그리드로 구성해 행마다 칸 수가
 * 달라도 세로선이 맞도록 했다.
 */

Font.register({
  family: "NotoSansKR",
  fonts: [
    { src: path.join(process.cwd(), "src/fonts/NotoSansKR-Regular.ttf"), fontWeight: "normal" },
    { src: path.join(process.cwd(), "src/fonts/NotoSansKR-Bold.ttf"),    fontWeight: "bold"   },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

const BORDER = "#444";
const MUTED  = "#666";

// -----------------------------------------------------------------------------
// 품목 테이블 컬럼 폭 (합계 = 540pt, A4 세로 페이지 여백 28 제외한 inner width)
// -----------------------------------------------------------------------------
const COL_NAME   = 180;
const COL_SPEC   = 75;
const COL_UNIT   = 35;
const COL_QTY    = 45;
const COL_PRICE  = 60;
const COL_SUPPLY = 70;
const COL_TAX    = 50;
const COL_NOTE   = 75; // sum = 590 — A4 inner 가로(539) 보다 살짝 넘어 값들 잘 안 맞을 수 있음
// → A4 가로 595pt, 좌우 여백 28*2 = 56 → inner 539. 합을 539에 맞춤:
// 180+70+35+45+58+70+45+36 = 539
const W = {
  name:   175,
  spec:   70,
  unit:   30,
  qty:    42,
  price:  60,
  supply: 70,
  tax:    50,
  note:   42,
};
// 총 539

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansKR",
    fontSize: 9,
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 28,
    color: "#111",
  },

  // 상단 타이틀 바
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
  handwriteBox: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#888",
    minHeight: 12,
    marginTop: 2,
  },

  // 수주처/발주처 박스
  partyRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  partyBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 6,
    position: "relative",
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

  preamble: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 6,
  },

  totalBox: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: BORDER,
    padding: 6,
    marginBottom: 6,
    alignItems: "center",
  },
  totalLabel:  { fontSize: 9,  fontWeight: "bold", marginRight: 8 },
  totalWord:   { fontSize: 9,  color: MUTED, marginRight: 8 },
  totalAmount: { fontSize: 11, fontWeight: "bold", flex: 1, textAlign: "right" },

  // 품목 테이블
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
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  thCell: {
    paddingVertical: 4,
    paddingHorizontal: 3,
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  tdCell: {
    paddingVertical: 3,
    paddingHorizontal: 3,
    fontSize: 8,
    borderRightWidth: 1,
    borderRightColor: "#aaa",
  },
  tdLast: { borderRightWidth: 0 },
  right:  { textAlign: "right" },
  center: { textAlign: "center" },

  // 하단 박스 — 12-column grid로 수직선 정렬
  footBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderTopWidth: 0,
  },
  footRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    minHeight: 20,
  },
  footLabel: {
    padding: 4,
    fontSize: 8,
    fontWeight: "bold",
    backgroundColor: "#f5f5f5",
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "center",
  },
  footValue: {
    padding: 4,
    fontSize: 9,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "center",
  },
  footLast:  { borderRightWidth: 0 },
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

export type PurchaseOrderPdfContactPerson = {
  name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
};

export type PurchaseOrderPdfProps = {
  poNumber: string;  // 내부 관리용. PDF 일련번호 셀은 수기박스로 공란.
  orderDate: string;
  dueDate: string | null;
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
  contactPerson: PurchaseOrderPdfContactPerson;
};

const nf = new Intl.NumberFormat("ko-KR");

function fmtKoreanDate(ymd: string) {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

function fmtAmountWord(n: number) {
  return `${nf.format(n)} 원정`;
}

export function PurchaseOrderPdf(props: PurchaseOrderPdfProps) {
  const supplyTotal = props.items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const taxTotal    = Math.round(supplyTotal * 0.1);
  const grandTotal  = supplyTotal + taxTotal;

  const logoPath = path.join(process.cwd(), "public", "jungwon-logo.png");
  const sealPath = path.join(process.cwd(), "public", "company-seal.png");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 상단 타이틀 바 */}
        <View style={styles.topBar}>
          <View style={[styles.topCell, { width: 120 }]}>
            <Text style={styles.topLabel}>작성일</Text>
            <Text style={styles.topValue}>{fmtKoreanDate(props.orderDate)}</Text>
          </View>
          <View style={[styles.topCell, styles.topTitle]}>
            <Text style={styles.topTitleText}>발 주 서</Text>
          </View>
          <View style={[styles.topCell, { width: 120, borderRightWidth: 0 }]}>
            <Text style={styles.topLabel}>일련번호</Text>
            <View style={styles.handwriteBox} />
          </View>
        </View>

        {/* 수주처 / 발주처 */}
        <View style={styles.partyRow}>
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
            <Text style={[styles.thCell, { width: W.name }]}>품목</Text>
            <Text style={[styles.thCell, { width: W.spec }]}>규격</Text>
            <Text style={[styles.thCell, { width: W.unit }]}>단위</Text>
            <Text style={[styles.thCell, { width: W.qty }]}>수량</Text>
            <Text style={[styles.thCell, { width: W.price }]}>단가</Text>
            <Text style={[styles.thCell, { width: W.supply }]}>공급가액</Text>
            <Text style={[styles.thCell, { width: W.tax }]}>세액</Text>
            <Text style={[styles.thCell, styles.tdLast, { width: W.note }]}>비고</Text>
          </View>

          {props.items.map((it) => {
            const supply = it.quantity * it.unit_price;
            const tax = Math.round(supply * 0.1);
            const displayName = it.variant ? `${it.name} · ${it.variant}` : it.name;
            return (
              <View key={it.no} style={styles.tr}>
                <Text style={[styles.tdCell, { width: W.name }]}>{displayName}</Text>
                <Text style={[styles.tdCell, { width: W.spec }]}>{it.spec ?? ""}</Text>
                <Text style={[styles.tdCell, styles.center, { width: W.unit }]}>
                  {it.unit ?? ""}
                </Text>
                <Text style={[styles.tdCell, styles.right, { width: W.qty }]}>
                  {nf.format(it.quantity)}
                </Text>
                <Text style={[styles.tdCell, styles.right, { width: W.price }]}>
                  {it.unit_price > 0 ? nf.format(it.unit_price) : ""}
                </Text>
                <Text style={[styles.tdCell, styles.right, { width: W.supply }]}>
                  {supply > 0 ? nf.format(supply) : ""}
                </Text>
                <Text style={[styles.tdCell, styles.right, { width: W.tax }]}>
                  {tax > 0 ? nf.format(tax) : ""}
                </Text>
                <Text style={[styles.tdCell, styles.tdLast, { width: W.note }]}>
                  {it.note ?? ""}
                </Text>
              </View>
            );
          })}

          {/* 빈 행 채우기 (양식 느낌) */}
          {Array.from({ length: Math.max(0, 12 - props.items.length) }).map((_, i) => (
            <View key={`blank-${i}`} style={styles.tr}>
              <Text style={[styles.tdCell, { width: W.name }]}> </Text>
              <Text style={[styles.tdCell, { width: W.spec }]}> </Text>
              <Text style={[styles.tdCell, { width: W.unit }]}> </Text>
              <Text style={[styles.tdCell, { width: W.qty }]}> </Text>
              <Text style={[styles.tdCell, { width: W.price }]}> </Text>
              <Text style={[styles.tdCell, { width: W.supply }]}> </Text>
              <Text style={[styles.tdCell, { width: W.tax }]}> </Text>
              <Text style={[styles.tdCell, styles.tdLast, { width: W.note }]}> </Text>
            </View>
          ))}

          {/* 합계 행 */}
          <View style={styles.totalRow}>
            <Text style={[styles.tdCell, styles.center, { width: W.name, fontWeight: "bold" }]}>
              합계
            </Text>
            <Text style={[styles.tdCell, { width: W.spec }]}> </Text>
            <Text style={[styles.tdCell, { width: W.unit }]}> </Text>
            <Text style={[styles.tdCell, styles.right, { width: W.qty, fontWeight: "bold" }]}>
              {nf.format(props.items.reduce((s, it) => s + it.quantity, 0))}
            </Text>
            <Text style={[styles.tdCell, { width: W.price }]}> </Text>
            <Text style={[styles.tdCell, styles.right, { width: W.supply, fontWeight: "bold" }]}>
              {nf.format(supplyTotal)}
            </Text>
            <Text style={[styles.tdCell, styles.right, { width: W.tax, fontWeight: "bold" }]}>
              {nf.format(taxTotal)}
            </Text>
            <Text style={[styles.tdCell, styles.tdLast, { width: W.note }]}>-</Text>
          </View>
        </View>

        {/* 하단 박스 — 12-column grid */}
        <FooterBox
          note={props.note}
          shipTo={props.shipTo}
          shipToContact={props.shipToContact}
          paymentTerms={props.paymentTerms}
          deliveryTerms={props.deliveryTerms}
          inspectionTerms={props.inspectionTerms}
          contact={props.contactPerson}
        />

        <Image src={logoPath} style={{ position: "absolute", width: 0, height: 0 }} />
      </Page>
    </Document>
  );
}

/**
 * 하단 정보 박스. 4개 행을 동일한 12-column 그리드로 구성해
 * 세로 구분선이 모두 일치하도록 한다.
 */
function FooterBox({
  note, shipTo, shipToContact,
  paymentTerms, deliveryTerms, inspectionTerms,
  contact,
}: {
  note: string | null;
  shipTo: string | null;
  shipToContact: string | null;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  inspectionTerms: string | null;
  contact: PurchaseOrderPdfContactPerson;
}) {
  const contactName = contact.title
    ? `${contact.name} ${contact.title}`
    : contact.name;

  return (
    <View style={styles.footBox}>
      {/* 비고: [라벨 flex1][값 flex11] */}
      <View style={styles.footRow}>
        <View style={[styles.footLabel, { flex: 1 }]}><Text>비고</Text></View>
        <View style={[styles.footValue, styles.footLast, { flex: 11 }]}>
          <Text>{note ?? ""}</Text>
        </View>
      </View>

      {/* 배송지: [라벨1][값7][라벨1][값3] */}
      <View style={styles.footRow}>
        <View style={[styles.footLabel, { flex: 1 }]}><Text>배송지</Text></View>
        <View style={[styles.footValue, { flex: 7 }]}><Text>{shipTo ?? ""}</Text></View>
        <View style={[styles.footLabel, { flex: 1 }]}><Text>받는이</Text></View>
        <View style={[styles.footValue, styles.footLast, { flex: 3 }]}>
          <Text>{shipToContact ?? ""}</Text>
        </View>
      </View>

      {/* 결제/인도/검수: [라벨1][값3][라벨1][값3][라벨1][값3] */}
      <View style={styles.footRow}>
        <View style={[styles.footLabel, { flex: 1 }]}><Text>결제조건</Text></View>
        <View style={[styles.footValue, { flex: 3 }]}><Text>{paymentTerms ?? ""}</Text></View>
        <View style={[styles.footLabel, { flex: 1 }]}><Text>인도조건</Text></View>
        <View style={[styles.footValue, { flex: 3 }]}><Text>{deliveryTerms ?? ""}</Text></View>
        <View style={[styles.footLabel, { flex: 1 }]}><Text>검수조건</Text></View>
        <View style={[styles.footValue, styles.footLast, { flex: 3 }]}>
          <Text>{inspectionTerms ?? ""}</Text>
        </View>
      </View>

      {/* 담당자: [라벨1][값3][라벨1][값3][라벨1][값3]
          값 셀: 이름(+직급) / 연락처 / 세금계산서 e-mail
          e-mail 라벨이 길어서 flex:1이 좁을 수 있으나 6개 라벨 합산을 유지 */}
      <View style={styles.footRow}>
        <View style={[styles.footLabel, { flex: 1 }]}><Text>담당자</Text></View>
        <View style={[styles.footValue, { flex: 3 }]}><Text>{contactName}</Text></View>
        <View style={[styles.footLabel, { flex: 1 }]}><Text>연락처</Text></View>
        <View style={[styles.footValue, { flex: 3 }]}><Text>{contact.phone ?? ""}</Text></View>
        <View style={[styles.footLabel, { flex: 1.3 }]}>
          <Text style={{ fontSize: 7 }}>세금계산서 e-mail</Text>
        </View>
        <View style={[styles.footValue, styles.footLast, { flex: 2.7, paddingHorizontal: 3 }]}>
          <Text style={{ fontSize: 8 }}>{contact.email ?? ""}</Text>
        </View>
      </View>
    </View>
  );
}
