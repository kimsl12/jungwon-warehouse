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
 * 자재 신청 승인서 PDF.
 *
 * 관리자가 현장 담당자의 자재 신청을 승인한 시점에 발급.
 * 공장 담당자는 이 문서를 바탕으로 실제 출고 처리를 준비.
 *
 * Server-only — 한글 폰트를 node:path로 로드하므로 route handler에서
 * runtime='nodejs' 하에 임포트되어야 함.
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

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansKR",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 40,
    color: "#111",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  logo: {
    width: 100,
    height: 20,
    marginRight: 12,
  },
  companyBlock: { flex: 1 },
  companyName: { fontSize: 12, fontWeight: "bold", marginBottom: 2 },
  companyLine: { fontSize: 9, color: "#444", marginBottom: 1 },
  metaBlock: {
    fontSize: 9,
    color: "#444",
    textAlign: "right",
    minWidth: 140,
  },
  metaRow: { marginBottom: 2 },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#888",
    padding: 8,
  },
  infoLabel: { fontSize: 9, color: "#666", marginBottom: 2 },
  infoText: { fontSize: 11, fontWeight: "bold" },
  infoSub: { fontSize: 9, color: "#444", marginTop: 2 },
  table: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#444",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#eee",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    paddingVertical: 6,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#888",
    paddingVertical: 5,
    minHeight: 22,
  },
  cellNo: { width: 28, paddingHorizontal: 3, textAlign: "center" },
  cellName: { flex: 3.4, paddingHorizontal: 3 },
  cellUnit: { flex: 0.8, paddingHorizontal: 3, textAlign: "center" },
  cellReq: { flex: 1, paddingHorizontal: 3, textAlign: "right" },
  cellFul: { flex: 1, paddingHorizontal: 3, textAlign: "right" },
  cellNote: { flex: 2.2, paddingHorizontal: 3 },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    paddingVertical: 6,
    fontWeight: "bold",
  },
  noteBlock: {
    marginTop: 12,
    padding: 8,
    backgroundColor: "#f5f5f5",
  },
  signature: {
    marginTop: 32,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sigBox: {
    width: 160,
    borderTopWidth: 1,
    borderTopColor: "#222",
    paddingTop: 6,
    fontSize: 9,
    color: "#444",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#888",
  },
});

export type MaterialRequestPdfItem = {
  no: number;
  name: string;
  variant: string | null;
  unit: string | null;
  requestedQuantity: number;
  fulfilledQuantity: number;
  note: string | null;
};

export type MaterialRequestPdfProps = {
  slipNumber: string;
  issueDate: string;
  approvedDate: string | null;
  siteName: string | null;
  siteAddress: string | null;
  requesterName: string | null;
  requesterTitle: string | null;
  requesterPhone: string | null;
  requestNote: string | null;
  items: MaterialRequestPdfItem[];
  logoPath: string;
};

export function MaterialRequestPdf({
  slipNumber,
  issueDate,
  approvedDate,
  siteName,
  siteAddress,
  requesterName,
  requesterTitle,
  requesterPhone,
  requestNote,
  items,
  logoPath,
}: MaterialRequestPdfProps) {
  const totalRequested = items.reduce((s, it) => s + it.requestedQuantity, 0);
  const totalFulfilled = items.reduce((s, it) => s + it.fulfilledQuantity, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>자재 출고장</Text>

        <View style={styles.headerRow}>
          <Image src={logoPath} style={styles.logo} />
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>{COMPANY.name}</Text>
            <Text style={styles.companyLine}>대표자: {COMPANY.ceo}</Text>
            <Text style={styles.companyLine}>{COMPANY.address}</Text>
            <Text style={styles.companyLine}>
              사업자등록번호: {COMPANY.businessNumber} · TEL {COMPANY.phone}
            </Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaRow}>문서번호: {slipNumber}</Text>
            <Text style={styles.metaRow}>발행일: {issueDate}</Text>
            {approvedDate && <Text style={styles.metaRow}>승인일: {approvedDate}</Text>}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>수신 현장</Text>
            <Text style={styles.infoText}>{siteName ?? "—"}</Text>
            {siteAddress && <Text style={styles.infoSub}>{siteAddress}</Text>}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>신청자</Text>
            <Text style={styles.infoText}>
              {requesterName ?? "—"}
              {requesterTitle ? ` ${requesterTitle}` : ""}
            </Text>
            {requesterPhone && <Text style={styles.infoSub}>TEL {requesterPhone}</Text>}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cellNo}>No</Text>
            <Text style={styles.cellName}>자재명</Text>
            <Text style={styles.cellUnit}>단위</Text>
            <Text style={styles.cellReq}>요청수량</Text>
            <Text style={styles.cellFul}>출고수량</Text>
            <Text style={styles.cellNote}>비고</Text>
          </View>

          {items.map((item) => (
            <View key={item.no} style={styles.tableRow}>
              <Text style={styles.cellNo}>{item.no}</Text>
              <Text style={styles.cellName}>
                {item.name}
                {item.variant ? ` · ${item.variant}` : ""}
              </Text>
              <Text style={styles.cellUnit}>{item.unit ?? "—"}</Text>
              <Text style={styles.cellReq}>
                {item.requestedQuantity.toLocaleString("ko-KR")}
              </Text>
              <Text style={styles.cellFul}>
                {item.fulfilledQuantity.toLocaleString("ko-KR")}
              </Text>
              <Text style={styles.cellNote}>{item.note ?? ""}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.cellNo}> </Text>
            <Text style={styles.cellName}>합계</Text>
            <Text style={styles.cellUnit}> </Text>
            <Text style={styles.cellReq}>{totalRequested.toLocaleString("ko-KR")}</Text>
            <Text style={styles.cellFul}>{totalFulfilled.toLocaleString("ko-KR")}</Text>
            <Text style={styles.cellNote}>{items.length}개 품목</Text>
          </View>
        </View>

        {requestNote && (
          <View style={styles.noteBlock}>
            <Text style={{ fontSize: 9, color: "#666", marginBottom: 2 }}>신청 비고</Text>
            <Text style={{ fontSize: 10 }}>{requestNote}</Text>
          </View>
        )}

        <View style={styles.signature}>
          <View style={styles.sigBox}>
            <Text>인수자 (서명)</Text>
          </View>
          <View style={styles.sigBox}>
            <Text>발행자 (서명)</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          본 문서는 {COMPANY.name}이 발행한 정식 출고 문서입니다.
        </Text>
      </Page>
    </Document>
  );
}
