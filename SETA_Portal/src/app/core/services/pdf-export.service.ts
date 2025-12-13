import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StorageService } from './storage.service';

export interface PDFExportConfig {
  title: string;
  subtitle?: string;
  filename: string;
  columns: PDFColumn[];
  data: any[];
  summary?: PDFSummary[];
  orientation?: 'portrait' | 'landscape';
}

export interface PDFColumn {
  header: string;
  field: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
}

export interface PDFSummary {
  label: string;
  value: string | number;
  color?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {
  private readonly storage = inject(StorageService);

  // WRSETA Brand Colors
  private readonly primaryColor: [number, number, number] = [0, 51, 102]; // #003366
  private readonly secondaryColor: [number, number, number] = [0, 102, 51]; // #006633
  private readonly accentColor: [number, number, number] = [218, 165, 32]; // #DAA520

  exportToPDF(config: PDFExportConfig): void {
    const doc = new jsPDF({
      orientation: config.orientation || 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Get SETA info
    const seta = this.storage.getCurrentSeta<{ name: string; code: string }>();
    const setaName = seta?.name || 'Wholesale & Retail SETA';
    const setaCode = seta?.code || 'WRSETA';

    // Draw header background
    doc.setFillColor(...this.primaryColor);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Draw accent line
    doc.setFillColor(...this.accentColor);
    doc.rect(0, 40, pageWidth, 2, 'F');

    // Add SETA name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(setaName, margin, 18);

    // Add report title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(config.title, margin, 28);

    // Add subtitle if provided
    if (config.subtitle) {
      doc.setFontSize(10);
      doc.text(config.subtitle, margin, 35);
    }

    // Add report metadata (right side of header)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const timeStr = new Date().toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Generated: ${dateStr} at ${timeStr}`, pageWidth - margin, 18, { align: 'right' });
    doc.text(`SETA Code: ${setaCode}`, pageWidth - margin, 25, { align: 'right' });

    yPos = 52;

    // Add summary cards if provided
    if (config.summary && config.summary.length > 0) {
      yPos = this.drawSummaryCards(doc, config.summary, margin, yPos, pageWidth);
      yPos += 10;
    }

    // Prepare table data
    const headers = config.columns.map(col => col.header);
    const body = config.data.map(row => {
      return config.columns.map(col => {
        const value = row[col.field];
        return col.format ? col.format(value) : (value ?? '-');
      });
    });

    // Configure column widths
    const columnStyles: { [key: number]: { cellWidth?: number; halign?: 'left' | 'center' | 'right' } } = {};
    config.columns.forEach((col, index) => {
      if (col.width) {
        columnStyles[index] = { cellWidth: col.width };
      }
      if (col.align) {
        columnStyles[index] = { ...columnStyles[index], halign: col.align };
      }
    });

    // Draw table
    autoTable(doc, {
      head: [headers],
      body: body,
      startY: yPos,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: this.primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 5,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: columnStyles,
      didDrawPage: (data) => {
        // Add footer on each page
        this.drawFooter(doc, pageWidth, pageHeight, margin);
      },
    });

    // Save the PDF
    doc.save(`${config.filename}-${this.getDateStamp()}.pdf`);
  }

  private drawSummaryCards(
    doc: jsPDF,
    summary: PDFSummary[],
    margin: number,
    startY: number,
    pageWidth: number
  ): number {
    const cardWidth = (pageWidth - margin * 2 - (summary.length - 1) * 5) / summary.length;
    const cardHeight = 22;
    let xPos = margin;

    summary.forEach((item, index) => {
      // Card background
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(xPos, startY, cardWidth, cardHeight, 2, 2, 'FD');

      // Value
      doc.setTextColor(...this.primaryColor);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(String(item.value), xPos + cardWidth / 2, startY + 10, { align: 'center' });

      // Label
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, xPos + cardWidth / 2, startY + 17, { align: 'center' });

      xPos += cardWidth + 5;
    });

    return startY + cardHeight;
  }

  private drawFooter(doc: jsPDF, pageWidth: number, pageHeight: number, margin: number): void {
    const footerY = pageHeight - 10;

    // Footer line
    doc.setDrawColor(...this.primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    // Footer text
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    // Left side - confidentiality notice
    doc.text('CONFIDENTIAL - For authorized use only', margin, footerY);

    // Center - page number
    const pageCount = (doc as any).internal.getNumberOfPages();
    const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
    doc.text(`Page ${currentPage} of ${pageCount}`, pageWidth / 2, footerY, { align: 'center' });

    // Right side - system info
    doc.text('SETA ID Verification System', pageWidth - margin, footerY, { align: 'right' });
  }

  private getDateStamp(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Utility method to format status with color indicator
  formatStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'GREEN': '● GREEN - Verified',
      'AMBER': '● AMBER - Warning',
      'RED': '● RED - Blocked'
    };
    return statusMap[status] || status;
  }

  // Utility method to format date
  formatDate(date: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Utility method to format boolean
  formatBoolean(value: boolean): string {
    return value ? 'Yes' : 'No';
  }
}
