import { toast } from 'sonner';
import { CLOUDINARY_CONFIG } from './models/plots.validations';
import { prisma } from './db.server';
import type { jsPDF } from 'jspdf';
import { getValidatedId } from './models/core.validations';
import { useUser } from './utils';
import { EventAction, EventDomain } from './models/events';

interface sendReportProps {
  PlotId: string;
  PlotNumber: string;
  valuerCompany: string;
  headerTitle: string;
  footerNote: string;
}

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  [key: string]: any;
}


export default async function printToCloudinary(props: sendReportProps) {
  const { PlotId, PlotNumber, valuerCompany, headerTitle, footerNote } = props;

  // try {
  const content = document.getElementById('printSection');
  if (!content) {
    toast.error('Report content not found');
    return;
  }
  const toastId = toast.loading('1. Generating PDF for Plot ' + PlotNumber);

  // 1. Generate PDF with improved settings
  const { jsPDF } = await import('jspdf');
  const html2canvas = (await import('html2canvas')).default;

  // Ensure all fonts are loaded
  await document.fonts.ready;

  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    hotfixes: ["px_scaling"]
  });

  const options = {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    scrollY: 0,
    backgroundColor: '#FFFFFF',
    ignoreElements: (element: Element) => element.classList.contains('no-print'),
    onclone: (clonedDoc: Document) => {
      const head = clonedDoc.head;
      Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .forEach(style => head.appendChild(style.cloneNode(true)));
      clonedDoc.querySelectorAll('[style*="display:none"], [style*="display: none"]')
        .forEach(el => el.setAttribute('style', 'display: block !important'));
    }
  };

  const canvas = await html2canvas(content, options);
  const imgWidth = pdf.internal.pageSize.getWidth() - 20; // Add margins
  const pageHeight = pdf.internal.pageSize.getHeight() - 30; // Account for header/footer
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Split the canvas into sections for each page
  let remainingHeight = canvas.height;
  let position = 0;

  while (remainingHeight > 0) {
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = Math.min(remainingHeight, pageHeight * (canvas.width / imgWidth));

    const pageContext = pageCanvas.getContext('2d');
    if (pageContext) {
      pageContext.drawImage(
        canvas,
        0,
        position,
        canvas.width,
        pageCanvas.height,
        0,
        0,
        canvas.width,
        pageCanvas.height
      );

      const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.7);
      if (position === 0) {
        // Add the first page
        pdf.addImage(pageImgData, 'JPEG', 10, 10, imgWidth, (pageCanvas.height * imgWidth) / canvas.width, undefined, 'FAST');
      } else {
        // Add subsequent pages
        pdf.addPage();
        pdf.addImage(pageImgData, 'JPEG', 10, 10, imgWidth, (pageCanvas.height * imgWidth) / canvas.width, undefined, 'FAST');
      }
    }

    position += pageCanvas.height;
    remainingHeight -= pageCanvas.height;
  }

  // Add headers/footers to all pages except the first
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addHeaderFooter(pdf, i);
  }

  function addHeaderFooter(pdf: jsPDF, pageNumber: number) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Add header
    pdf.setFontSize(10);
    pdf.text(headerTitle, pageWidth / 2, 10, { align: 'center' });

    // Add footer
    pdf.setFontSize(8);
    pdf.text(footerNote + ` Page ${pageNumber} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  toast.dismiss(toastId);
  const toastId2 = toast.loading("2. Uploading report for Plot (" + PlotNumber + ")...");

  // 2. Upload to Cloudinary as raw asset
  const pdfBlob = pdf.output('blob');
  const formData = new FormData();
  formData.append('file', pdfBlob, `Valuation_Report_${PlotNumber}.pdf`);
  formData.append('upload_preset', CLOUDINARY_CONFIG.UPLOAD_PRESET);
  formData.append('cloud_name', CLOUDINARY_CONFIG.CLOUD_NAME);
  formData.append('resource_type', 'raw'); // Save as raw asset type

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.CLOUD_NAME}/upload`,
    { method: 'POST', body: formData }
  );

  console.log("Upload response:", uploadResponse);

  if (!uploadResponse.ok) throw new Error('Failed to upload PDF');

  const uploadResult = await uploadResponse.json() as CloudinaryUploadResponse;
  const fileUrl = uploadResult.secure_url;
  const assetId = uploadResult.public_id;
  toast.dismiss(toastId2);
  const toastId3 = toast.loading("3. Saving report to database...");

  // 3. Update the top record in valuationsHistory
  const validatedPlotId = getValidatedId(PlotId);
  const topRecord = await prisma.valuationsHistory.findFirst({
    where: { plotId: validatedPlotId },
    orderBy: { createdAt: 'desc' },
  });

  if (!topRecord) {
    toast.error(`No records found for Plot (${PlotNumber})`);
    console.error(`No record found in valuationsHistory for plotId: ${PlotId}`);
    return;
  }

  try {
    const user = useUser();
    await prisma.valuationsHistory.update({
      where: { id: topRecord.id },
      data: { reportFile: assetId },
    });
    await prisma.event.create({
      data: {
        userId: user.id,
        domain: EventDomain.ValuationsHistory,
        action: EventAction.Update,
        recordId: topRecord.id,
        recordData: JSON.stringify(uploadResponse),
      },
    });
    toast.success(`Valuation report generated successfully for Plot (${PlotNumber})!`);
  } catch (error) {
    console.error("Error updating valuationsHistory:", error);
    return;
  } finally {
    toast.dismiss(toastId3);
  }
}