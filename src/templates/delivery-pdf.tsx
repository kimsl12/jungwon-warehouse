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
 * 출고장 PDF.
 *
 * Renders 1+ outgoing transactions as a single delivery slip with company
 * header, recipient/note line, and an itemized table.
 *
 * Server-only — uses node:path to load the bundled Korean fonts. Must be
 * imported from a route handler with `runtime = 'nodejs'`.
 */

// Register Korean fonts. @react-pdf/renderer accepts absolute file paths
// in node runtime — process.cwd() is the project root.
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

// Disable hyphenation — bad for Korean
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
  companyBlock: {
    flex: 1,
  },
  companyName: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 2,
  },
  companyLine: {
    fontSize: 9,
    color: "#444",
    marginBottom: 1,
  },
  metaBlock: {
    fontSize: 9,
    color: "#444",
    textAlign: "right",
    minWidth: 140,
  },
  metaRow: {
    marginBottom: 2,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    marginBottom: 12,
  },
  recipientBox: {
    borderWidth: 1,
    borderColor: "#888",
    padding: 8,
    marginBottom: 16,
  },
  recipientLabel: {
    fontSize: 9,
    color: "#666",
    marginBottom: 2,
  },
  recipientText: {
    fontSize: 11,
    fontWeight: "bold",
  },
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
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#888",
    paddingVertical: 5,
    minHeight: 22,
  },
  cellNo: { width: 24, paddingHorizontal: 3, textAlign: "center" },
  cellDate: { flex: 1.2, paddingHorizontal: 3 },
  cellName: { flex: 2.4, paddingHorizontal: 3 },
  cellSite: { flex: 1.5, paddingHorizontal: 3 },
  cellQty: { flex: 0.8, paddingHorizontal: 3, textAlign: "right" },
  cellUnit: { flex: 0.6, paddingHorizontal: 3, textAlign: "center" },
  cellUser: { flex: 1, paddingHorizontal: 3 },
  cellNote: { flex: 1.5, paddingHorizontal: 3 },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    paddingVertical: 6,
    fontWeight: "bold",
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

export type DeliveryItem = {
  no: number;
  name: string;
  category: string | null;
  unit: string | null;
  quantity: number;
  note: string | null;
  /** 현장명 (출고 시 필수) */
  siteName?: string | null;
  /** 담당자명 */
  userName?: string | null;
  /** 출고 날짜 (YYYY-MM-DD) */
  date?: string | null;
};

export type DeliveryPdfProps = {
  /** Auto-generated slip number, e.g. 20260409-001 */
  slipNumber: string;
  /** Date string already formatted (e.g. "2026-04-09") */
  issueDate: string;
  /** Optional recipient (수신처). If null, leaves the field blank. */
  recipient: string | null;
  /** Optional company-wide note. If null, leaves the field blank. */
  note: string | null;
  items: DeliveryItem[];
  /** Absolute file path to the company logo PNG */
  logoPath: string;
};

export function DeliveryPdf({
  slipNumber,
  issueDate,
  recipient,
  note,
  items,
  logoPath,
}: DeliveryPdfProps) {
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>출 고 장</Text>

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
            <Text style={styles.metaRow}>출고장 번호: {slipNumber}</Text>
            <Text style={styles.metaRow}>발행일: {issueDate}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.recipientBox}>
          <Text style={styles.recipientLabel}>수신처</Text>
          <Text style={styles.recipientText}>{recipient ?? " "}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cellNo}>No</Text>
            <Text style={styles.cellDate}>날짜</Text>
            <Text style={styles.cellName}>제품명</Text>
            <Text style={styles.cellSite}>현장</Text>
            <Text style={styles.cellQty}>수량</Text>
            <Text style={styles.cellUnit}>단위</Text>
            <Text style={styles.cellUser}>담당</Text>
            <Text style={styles.cellNote}>비고</Text>
          </View>

          {items.map((item) => (
            <View key={item.no} style={styles.tableRow}>
              <Text style={styles.cellNo}>{item.no}</Text>
              <Text style={styles.cellDate}>{item.date ?? ""}</Text>
              <Text style={styles.cellName}>{item.name}</Text>
              <Text style={styles.cellSite}>{item.siteName ?? "—"}</Text>
              <Text style={styles.cellQty}>{item.quantity.toLocaleString("ko-KR")}</Text>
              <Text style={styles.cellUnit}>{item.unit ?? ""}</Text>
              <Text style={styles.cellUser}>{item.userName ?? ""}</Text>
              <Text style={styles.cellNote}>{item.note ?? ""}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.cellNo}> </Text>
            <Text style={styles.cellDate}> </Text>
            <Text style={styles.cellName}>합계</Text>
            <Text style={styles.cellSite}> </Text>
            <Text style={styles.cellQty}>{totalQty.toLocaleString("ko-KR")}</Text>
            <Text style={styles.cellUnit}> </Text>
            <Text style={styles.cellUser}> </Text>
            <Text style={styles.cellNote}>{items.length}개 품목</Text>
          </View>
        </View>

        {note && (
          <View style={{ marginTop: 12, padding: 8, backgroundColor: "#f5f5f5" }}>
            <Text style={{ fontSize: 9, color: "#666", marginBottom: 2 }}>비고</Text>
            <Text style={{ fontSize: 10 }}>{note}</Text>
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
          본 출고장은 {COMPANY.name}이 발행한 정식 문서입니다.
        </Text>
      </Page>
    </Document>
  );
}
