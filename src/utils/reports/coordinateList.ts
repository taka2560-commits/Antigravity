import { createPDF, autoTable, type jsPDFWithAutoTable } from "./common"
import type { Point } from "@/db"

export async function generateCoordinateListPDF(points: Point[]) {
    const doc = await createPDF() as jsPDFWithAutoTable

    // Title
    doc.setFontSize(16)
    doc.text("座標一覧表", 105, 15, { align: "center" })

    // Date
    doc.setFontSize(10)
    const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
    doc.text(`作成日: ${today}`, 195, 15, { align: "right" })

    // Table Data
    const tableData = points.map(p => [
        p.name,
        p.x.toFixed(3),
        p.y.toFixed(3),
        p.z?.toFixed(3) || "0.000",
        p.note || ""
    ])

    // Generate Table
    autoTable(doc, {
        head: [["点名", "X座標", "Y座標", "Z座標", "備考"]],
        body: tableData,
        startY: 25,
        styles: { font: "ZenKakuGothicNew-Regular", fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [66, 66, 66], textColor: 255, halign: 'center' },
        columnStyles: {
            0: { cellWidth: 30 }, // Name
            1: { cellWidth: 35, halign: 'right' }, // X
            2: { cellWidth: 35, halign: 'right' }, // Y
            3: { cellWidth: 30, halign: 'right' }, // Z
            4: { cellWidth: 'auto' } // Note
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 25 }
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
    doc.setProperties({
        title: "座標一覧表",
        creator: "Survey Coordinate Manager",
        author: "Techno Line"
    })

    // Save
    doc.save("座標一覧表.pdf")
}
