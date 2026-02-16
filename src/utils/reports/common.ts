import jsPDF from "jspdf"
import autoTable, { type UserOptions } from "jspdf-autotable"

// Extending jsPDF type to include autoTable
interface jsPDFWithAutoTable extends jsPDF {
    lastAutoTable: { finalY: number }
}

export async function createPDF(): Promise<jsPDFWithAutoTable> {
    const doc = new jsPDF() as jsPDFWithAutoTable

    try {
        // Load Zen Kaku Gothic New (Regular) from local public folder
        // This file is downloaded to public/fonts/ZenKakuGothicNew-Regular.ttf
        const fontUrl = "/fonts/ZenKakuGothicNew-Regular.ttf"
        const fontName = "ZenKakuGothicNew-Regular"

        const response = await fetch(fontUrl)
        if (!response.ok) {
            throw new Error(`Failed to fetch font: ${response.statusText}`)
        }
        const fontBuffer = await response.arrayBuffer()

        // Convert ArrayBuffer to Base64 (Browser compatible)
        let binary = ""
        const bytes = new Uint8Array(fontBuffer)
        const len = bytes.byteLength
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i])
        }
        const base64String = window.btoa(binary)

        const filename = "ZenKakuGothicNew-Regular.ttf"
        doc.addFileToVFS(filename, base64String)
        doc.addFont(filename, fontName, "normal")
        doc.addFont(filename, fontName, "bold") // Register as bold too to prevent fallback
        doc.setFont(fontName)

        console.log("Japanese font loaded successfully")
    } catch (error) {
        console.error("Failed to load Japanese font:", error)
        alert("日本語フォント(ZenKakuGothicNew)の読み込みに失敗しました。\nPDFが正しく表示されない可能性があります。")
    }

    return doc
}

export { autoTable }
export type { UserOptions, jsPDFWithAutoTable }
