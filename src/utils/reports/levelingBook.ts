import { createPDF, autoTable, type jsPDFWithAutoTable } from "./common"
import type { LevelingSession, LevelingRow } from "../../db"

// Interface for calculated row data needed for report
export interface LevelingRowWithCalc extends LevelingRow {
    calcIH?: number;
}

export async function generateLevelingBookPDF(session: LevelingSession, rows: LevelingRowWithCalc[]) {
    const doc = await createPDF() as jsPDFWithAutoTable

    // Title
    doc.setFontSize(16)
    doc.text("水準測量野帳 (Level Book)", 105, 15, { align: "center" })

    // Date and Info
    doc.setFontSize(10)
    const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
    doc.text(`作成日: ${today}`, 195, 15, { align: "right" })

    doc.setFontSize(11)
    doc.text(`観測名: ${session.name || "未入力"}`, 14, 22)
    doc.text(`備考: ${session.note || ""}`, 14, 27)

    // Table Data
    const tableData = rows.map(row => [
        row.no,
        row.bs !== undefined ? row.bs.toFixed(4) : "",
        row.calcIH !== undefined ? row.calcIH.toFixed(4) : (row.ih !== undefined ? row.ih.toFixed(4) : ""),
        row.fs !== undefined ? row.fs.toFixed(4) : "",
        row.gh !== undefined ? row.gh.toFixed(4) : "",
        row.note || ""
    ])

    // Generate Table
    autoTable(doc, {
        head: [["測点 (No.)", "後視 (BS)", "器高 (IH)", "前視 (FS)", "地盤高 (GH)", "備考 (Note)"]],
        body: tableData,
        startY: 32,
        styles: { font: "ZenKakuGothicNew-Regular", fontSize: 10, cellPadding: 3, valign: 'middle' },
        headStyles: {
            fillColor: [240, 240, 240],
            textColor: 20,
            lineColor: [150, 150, 150],
            lineWidth: 0.1,
            halign: 'center'
        },
        bodyStyles: {
            lineColor: [200, 200, 200],
            lineWidth: 0.1
        },
        columnStyles: {
            0: { cellWidth: 35, fontStyle: 'bold' }, // Point Name
            1: { cellWidth: 25, halign: 'right' }, // BS
            2: { cellWidth: 25, halign: 'right' }, // IH
            3: { cellWidth: 25, halign: 'right' }, // FS
            4: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }, // GH
            5: { cellWidth: 'auto' } // Note
        },
        // Custom styling for standard field book look (horizontal lines mostly)
        theme: 'grid',
        margin: { top: 32 }
    })

    // Footer
    const pageCount = (doc.internal as any).getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" })
        doc.text("Survey Coordinate Manager", 195, 290, { align: "right" })
    }

    // Set properties
    const title = `水準野帳_${session.name || "名称未設定"}`
    doc.setProperties({
        title: title,
        creator: "Survey Coordinate Manager",
        author: "Techno Line"
    })

    // Save
    doc.save(`${title}.pdf`)
}
