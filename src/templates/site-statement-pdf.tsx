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
    marginBottom: 4,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 11,
    textAlign: "center",
    color: "#555",
    marginBottom: 16,
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  logo: { width: 100, height: 20, marginRight: 12 },
  companyBlock: { flex: 1 },
  companyName: { fontSize: 12, fontWeight: "bold", marginBottom: 2 },
  companyLine: { fontSize: 9, color: "#444", marginBottom: 1 },
  metaBlock: { fontSize: 9, color: "#444", textAlign: "right", minWidth: 140 },
  metaRow: { marginBottom: 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#222", marginBottom: 12 },
  infoBox: {
    borderWidth: 1,
    borderColor: "#888",
    padding: 8,
    marginBottom: 16,
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
  cellDate: { width: 70, paddingHorizontal: 3 },
  cellName: { flex: 2.6, paddingHorizontal: 3 },
  cellUnit: { width: 46, paddingHorizontal: 3, textAlign: "center" },
  cellQty: { width: 56, paddingHorizontal: 3, textAlign: "right" },
  cellPrice: { width: 70, paddingHorizontal: 3, textAlign: "right" },
  cellSupply: { width: 86, paddingHorizontal: 3, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    paddingVertical: 6,
    fontWeight: "bold",
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
});

export type SiteStatementItem = {
  no: number;
  date: string;      // YYYY-MM-DD
  name: string;
  variant: string | null;
  unit: string | null;
  quantity: number;
  unitPrice: number;   // 0 if unknown
  supply: number;      // quantity * unitPrice
};

export type SiteStatementPdfProps = {
  statementNumber: string;
  issueDate: string;
  statementType: "monthly" | "completion";
  siteName: string;
  siteAddress: string | null;
  dateFrom: string;
  dateTo: string;
  items: SiteStatementItem[];
  logoPath: string;
};

export function SiteStatementPdf({
  statementNumber,
  issueDate,
  statementType,
  siteName,
  siteAddress,
  dateFrom,
  dateTo,
  items,
  logoPath,
}: SiteStatementPdfProps) {
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const totalSupply = items.reduce((s, i) => s + i.supply, 0);
  const totalTax = Math.round(totalSupply * 0.1);
  const totalWithTax = totalSupply + totalTax;
  const nf = new Intl.NumberFormat("ko-KR");
  const title = statementType === "monthly" ? "월말 정산서" : "준공 정산서";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {dateFrom} ~ {dateTo}
        </Text>

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
            <Text style={styles.metaRow}>문서번호: {statementNumber}</Text>
            <Text style={styles.metaRow}>발행일: {issueDate}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>수신 현장</Text>
          <Text style={styles.infoText}>{siteName}</Text>
          {siteAddress && <Text style={styles.infoSub}>{siteAddress}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cellNo}>No</Text>
            <Text style={styles.cellDate}>출고일</Text>
            <Text style={styles.cellName}>자재명</Text>
            <Text style={styles.cellUnit}>단위</Text>
            <Text style={styles.cellQty}>수량</Text>
            <Text style={styles.cellPrice}>단가</Text>
            <Text style={styles.cellSupply}>공급가액</Text>
          </View>

          {items.length === 0 ? (
            <View style={styles.tableRow}>
              <Text
                style={{
                  flex: 1,
                  paddingHorizontal: 8,
                  textAlign: "center",
                  color: "#888",
                }}
              >
                해당 기간 출고 내역이 없습니다.
              </Text>
            </View>
          ) : (
            items.map((it) => (
              <View key={it.no} style={styles.tableRow}>
                <Text style={styles.cellNo}>{it.no}</Text>
                <Text style={styles.cellDate}>{it.date}</Text>
                <Text style={styles.cellName}>
                  {it.name}
                  {it.variant ? ` · ${it.variant}` : ""}
                </Text>
                <Text style={styles.cellUnit}>{it.unit ?? "—"}</Text>
                <Text style={styles.cellQty}>{nf.format(it.quantity)}</Text>
                <Text style={styles.cellPrice}>
                  {it.unitPrice > 0 ? nf.format(it.unitPrice) : "—"}
                </Text>
                <Text style={styles.cellSupply}>
                  {it.supply > 0 ? nf.format(it.supply) : "—"}
                </Text>
              </View>
            ))
          )}

          <View style={styles.totalRow}>
            <Text style={styles.cellNo}> </Text>
            <Text style={styles.cellDate}> </Text>
            <Text style={styles.cellName}>합계</Text>
            <Text style={styles.cellUnit}> </Text>
            <Text style={styles.cellQty}>{nf.format(totalQty)}</Text>
            <Text style={styles.cellPrice}> </Text>
            <Text style={styles.cellSupply}>{nf.format(totalSupply)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.cellNo}> </Text>
            <Text style={styles.cellDate}> </Text>
            <Text style={styles.cellName}>부가세 (10%)</Text>
            <Text style={styles.cellUnit}> </Text>
            <Text style={styles.cellQty}> </Text>
            <Text style={styles.cellPrice}> </Text>
            <Text style={styles.cellSupply}>{nf.format(totalTax)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.cellNo}> </Text>
            <Text style={styles.cellDate}> </Text>
            <Text style={[styles.cellName, { fontWeight: "bold" }]}>총액</Text>
            <Text style={styles.cellUnit}> </Text>
            <Text style={styles.cellQty}> </Text>
            <Text style={styles.cellPrice}> </Text>
            <Text style={[styles.cellSupply, { fontWeight: "bold" }]}>
              {nf.format(totalWithTax)}
            </Text>
          </View>
        </View>

        <View style={styles.signature}>
          <View style={styles.sigBox}>
            <Text>인수자 (서명)</Text>
          </View>
          <View style={styles.sigBox}>
            <Text>발행자 (서명)</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          단가 정보는 거래처 등록 단가를 기준으로 하며, 실제 거래 단가와 차이가 있을 수
          있습니다.
        </Text>
      </Page>
    </Document>
  );
}
