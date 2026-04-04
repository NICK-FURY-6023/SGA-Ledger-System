'use client';

import { useState } from 'react';
import { transactionAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ExportPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchTransactions = async () => {
    const params: Record<string, string> = { limit: '10000' };
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    const data = await transactionAPI.getAll(params);
    return data.transactions || [];
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const transactions = await fetchTransactions();
      const headers = ['Date', 'Bill/Challan No', 'Folio', 'Debit', 'Credit', 'SR', 'Type', 'Balance'];
      const rows = transactions.map((t: any) => [
        formatDate(t.date),
        t.billNo,
        t.folio || '',
        t.debit || '',
        t.credit || '',
        t.sr || '',
        t.type,
        t.balance,
      ]);

      const csv = [headers, ...rows].map((r: any[]) => r.join(',')).join('\n');
      downloadFile(csv, 'SGA_Ledger.csv', 'text/csv');
    } catch (err) {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const transactions = await fetchTransactions();

      const wsData = [
        ['Date', 'Bill/Challan No', 'Folio', 'Debit', 'Credit', 'SR', 'Type', 'Balance'],
        ...transactions.map((t: any) => [
          formatDate(t.date), t.billNo, t.folio || '', t.debit, t.credit, t.sr, t.type, t.balance,
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
      XLSX.writeFile(wb, 'SGA_Ledger.xlsx');
    } catch (err) {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const transactions = await fetchTransactions();

      const doc = new jsPDF('landscape');
      doc.setFontSize(18);
      doc.text('SGA Ledger System', 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 28);
      if (dateFrom || dateTo) {
        doc.text(`Period: ${dateFrom || 'Start'} to ${dateTo || 'Present'}`, 14, 34);
      }

      autoTable(doc, {
        startY: dateFrom || dateTo ? 40 : 34,
        head: [['Date', 'Bill No', 'Folio', 'Debit', 'Credit', 'SR', 'Type', 'Balance']],
        body: transactions.map((t: any) => [
          formatDate(t.date),
          t.billNo,
          t.folio || '—',
          t.debit > 0 ? formatCurrency(t.debit) : '',
          t.credit > 0 ? formatCurrency(t.credit) : '',
          t.sr > 0 ? formatCurrency(t.sr) : '',
          t.type,
          formatCurrency(t.balance),
        ]),
        headStyles: {
          fillColor: [44, 36, 22],
          textColor: [212, 200, 154],
          fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [251, 248, 238] },
        styles: { fontSize: 9, cellPadding: 3 },
      });

      doc.save('SGA_Ledger.pdf');
    } catch (err) {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const printLedger = async () => {
    const transactions = await fetchTransactions();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = transactions.map((t: any) => `
      <tr>
        <td>${formatDate(t.date)}</td>
        <td style="font-weight:600">${t.billNo}</td>
        <td>${t.folio || '—'}</td>
        <td style="text-align:right;color:#C62828">${t.debit > 0 ? formatCurrency(t.debit) : ''}</td>
        <td style="text-align:right;color:#2E7D32">${t.credit > 0 ? formatCurrency(t.credit) : ''}</td>
        <td style="text-align:right;color:#1565C0">${t.sr > 0 ? formatCurrency(t.sr) : ''}</td>
        <td>${t.type}</td>
        <td style="text-align:right;font-weight:700">${formatCurrency(t.balance)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>SGA Ledger</title>
      <style>
        body { font-family: Georgia, serif; margin: 2rem; }
        h1 { text-align: center; margin-bottom: 0.5rem; }
        p { text-align: center; color: #666; margin-bottom: 1.5rem; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #2C2416; color: #D4C89A; padding: 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
        td { padding: 8px 10px; border-bottom: 1px solid #E8DFC8; font-size: 13px; }
        tr:nth-child(even) { background: #FBF8EE; }
      </style></head><body>
      <h1>SGA Ledger System</h1>
      <p>Generated: ${new Date().toLocaleString('en-IN')}</p>
      <table><thead><tr><th>Date</th><th>Bill No</th><th>Folio</th><th>Debit</th><th>Credit</th><th>SR</th><th>Type</th><th>Balance</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.print();window.close();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="export">
      <div className="main__header">
        <div>
          <h1 className="main__title">📤 Export</h1>
          <p className="main__subtitle">Download or print your ledger data</p>
        </div>
      </div>

      <div className="export__range">
        <div className="audit__filter-group">
          <label className="audit__filter-label">Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="audit__filter-group">
          <label className="audit__filter-label">Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      <div className="export__options">
        <div className="export__card" onClick={exportPDF}>
          <div className="export__card-icon">📕</div>
          <div className="export__card-title">Export PDF</div>
          <div className="export__card-desc">Print-ready ledger document</div>
        </div>
        <div className="export__card" onClick={exportExcel}>
          <div className="export__card-icon">📗</div>
          <div className="export__card-title">Export Excel</div>
          <div className="export__card-desc">Spreadsheet with all columns</div>
        </div>
        <div className="export__card" onClick={exportCSV}>
          <div className="export__card-icon">📄</div>
          <div className="export__card-title">Export CSV</div>
          <div className="export__card-desc">Simple comma-separated file</div>
        </div>
        <div className="export__card" onClick={printLedger}>
          <div className="export__card-icon">🖨️</div>
          <div className="export__card-title">Print</div>
          <div className="export__card-desc">Open print-friendly view</div>
        </div>
      </div>

      {exporting && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '1rem' }}>
          Preparing export...
        </p>
      )}
    </div>
  );
}
