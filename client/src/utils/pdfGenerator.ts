import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface BudgetPDFData {
  budget: {
    id: string;
    budgetNumber: string;
    title: string;
    description?: string;
    clientId: string;
    vendorId: string;
    totalValue: string;
    validUntil: string;
    hasCustomization: boolean;
    customizationPercentage?: string;
    customizationDescription?: string;
    createdAt: string;
    photos?: string[];
  };
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    hasItemCustomization?: boolean;
    itemCustomizationPercentage?: string;
    itemCustomizationDescription?: string;
    itemCustomizationValue?: string;
    product: {
      name: string;
      description?: string;
      category: string;
      imageLink?: string;
    };
  }>;
  client: {
    name: string;
    email?: string;
    phone?: string;
  };
  vendor: {
    name: string;
    email?: string;
    phone?: string;
  };
}

export class PDFGenerator {
  private doc: jsPDF;
  private currentY: number = 20;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  private addNewPageIfNeeded(spaceNeeded: number): void {
    if (this.currentY + spaceNeeded > this.pageHeight - this.margin) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
  }

  private addHeader(data: BudgetPDFData): void {
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ORÇAMENTO', this.pageWidth / 2, this.currentY, { align: 'center' });

    this.currentY += 15;
    this.doc.setFontSize(12);
    this.doc.text(`Número: ${data.budget.budgetNumber}`, this.margin, this.currentY);
    this.doc.text(`Data: ${new Date(data.budget.createdAt).toLocaleDateString('pt-BR')}`, this.pageWidth - this.margin - 50, this.currentY);

    if (data.budget.validUntil) {
      this.currentY += 8;
      this.doc.text(`Válido até: ${new Date(data.budget.validUntil).toLocaleDateString('pt-BR')}`, this.margin, this.currentY);
    }

    this.currentY += 20;
  }

  private addClientVendorInfo(data: BudgetPDFData): void {
    this.addNewPageIfNeeded(40);

    // Client info
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('CLIENTE:', this.margin, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    this.currentY += 8;
    this.doc.text(data.client.name, this.margin, this.currentY);

    if (data.client.email) {
      this.currentY += 6;
      this.doc.text(`Email: ${data.client.email}`, this.margin, this.currentY);
    }

    if (data.client.phone) {
      this.currentY += 6;
      this.doc.text(`Telefone: ${data.client.phone}`, this.margin, this.currentY);
    }

    // Vendor info
    const rightColumn = this.pageWidth / 2 + 10;
    const vendorStartY = this.currentY - (data.client.email ? 14 : 8) - (data.client.phone ? 6 : 0);

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('VENDEDOR:', rightColumn, vendorStartY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.vendor.name, rightColumn, vendorStartY + 8);

    if (data.vendor.email) {
      this.doc.text(`Email: ${data.vendor.email}`, rightColumn, vendorStartY + 14);
    }

    if (data.vendor.phone) {
      this.doc.text(`Telefone: ${data.vendor.phone}`, rightColumn, vendorStartY + (data.vendor.email ? 20 : 14));
    }

    this.currentY += 20;
  }

  private async addItems(data: BudgetPDFData): Promise<void> {
    this.addNewPageIfNeeded(50);

    // Title
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ITENS DO ORÇAMENTO', this.margin, this.currentY);
    this.currentY += 15;

    // Table headers with image column
    const colWidths = [25, 65, 20, 30, 45];
    const startX = this.margin;
    let currentX = startX;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');

    // Draw header background
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(startX, this.currentY - 5, colWidths.reduce((a, b) => a + b, 0), 10, 'F');

    this.doc.text('Foto', currentX + 2, this.currentY);
    currentX += colWidths[0];
    this.doc.text('Produto', currentX + 2, this.currentY);
    currentX += colWidths[1];
    this.doc.text('Qtd', currentX + 2, this.currentY);
    currentX += colWidths[2];
    this.doc.text('Preço Unit.', currentX + 2, this.currentY);
    currentX += colWidths[3];
    this.doc.text('Total', currentX + 2, this.currentY);

    this.currentY += 10;

    // Items
    this.doc.setFont('helvetica', 'normal');
    
    for (let index = 0; index < data.items.length; index++) {
      const item = data.items[index];
      const rowHeight = 20; // Increased height to accommodate image
      
      this.addNewPageIfNeeded(rowHeight + 10);

      // Draw row background (alternating)
      if (index % 2 === 1) {
        this.doc.setFillColor(250, 250, 250);
        this.doc.rect(startX, this.currentY - 5, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
      }

      currentX = startX;

      // Product image
      if (item.product.imageLink) {
        try {
          await this.addImage(item.product.imageLink, currentX + 2, this.currentY - 3, 20, 15);
        } catch (error) {
          // Draw placeholder if image fails to load
          this.doc.setDrawColor(200);
          this.doc.rect(currentX + 2, this.currentY - 3, 20, 15);
          this.doc.setFontSize(6);
          this.doc.text('Sem', currentX + 8, this.currentY + 2);
          this.doc.text('imagem', currentX + 5, this.currentY + 8);
          this.doc.setFontSize(10);
        }
      } else {
        // Draw placeholder rectangle
        this.doc.setDrawColor(200);
        this.doc.rect(currentX + 2, this.currentY - 3, 20, 15);
        this.doc.setFontSize(6);
        this.doc.text('Sem', currentX + 8, this.currentY + 2);
        this.doc.text('imagem', currentX + 5, this.currentY + 8);
        this.doc.setFontSize(10);
      }
      currentX += colWidths[0];

      // Product name (with text wrapping if needed)
      const productName = item.product.name.length > 35 
        ? item.product.name.substring(0, 35) + '...' 
        : item.product.name;
      this.doc.text(productName, currentX + 2, this.currentY + 5);
      
      // Add product description if available
      if (item.product.description) {
        this.doc.setFontSize(8);
        this.doc.setTextColor(100, 100, 100);
        const description = item.product.description.length > 40 
          ? item.product.description.substring(0, 40) + '...' 
          : item.product.description;
        this.doc.text(description, currentX + 2, this.currentY + 12);
        this.doc.setFontSize(10);
        this.doc.setTextColor(0, 0, 0);
      }
      currentX += colWidths[1];

      // Quantity
      this.doc.text(item.quantity.toString(), currentX + 2, this.currentY + 5);
      currentX += colWidths[2];

      // Unit price
      this.doc.text(`R$ ${parseFloat(item.unitPrice).toFixed(2)}`, currentX + 2, this.currentY + 5);
      currentX += colWidths[3];

      // Total price
      this.doc.text(`R$ ${parseFloat(item.totalPrice).toFixed(2)}`, currentX + 2, this.currentY + 5);

      this.currentY += rowHeight;

      // Add customization info if exists
      if (item.hasItemCustomization && item.itemCustomizationDescription) {
        this.doc.setFontSize(8);
        this.doc.setTextColor(100, 100, 100);
        this.doc.text(`  + ${item.itemCustomizationDescription}: R$ ${parseFloat(item.itemCustomizationValue || '0').toFixed(2)}`, startX + 2, this.currentY);
        this.currentY += 6; 
        this.doc.setFontSize(10);
        this.doc.setTextColor(0, 0, 0);
      }
    }

    this.currentY += 10;
  }

  private addTotal(data: BudgetPDFData): void {
    this.addNewPageIfNeeded(30);

    // Draw total section
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(this.pageWidth - this.margin - 100, this.currentY - 5, 100, 20, 'F');

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('TOTAL GERAL:', this.pageWidth - this.margin - 95, this.currentY + 5);
    this.doc.text(`R$ ${parseFloat(data.budget.totalValue).toFixed(2)}`, this.pageWidth - this.margin - 95, this.currentY + 15);

    this.currentY += 30;
  }

  private addDescription(data: BudgetPDFData): void {
    if (data.budget.description) {
      this.addNewPageIfNeeded(30);

      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('OBSERVAÇÕES:', this.margin, this.currentY);
      this.currentY += 10;

      this.doc.setFont('helvetica', 'normal');
      const lines = this.doc.splitTextToSize(data.budget.description, this.pageWidth - 2 * this.margin);
      this.doc.text(lines, this.margin, this.currentY);
      this.currentY += lines.length * 6;
    }
  }

  private async addCustomizationImages(photos: string[]): Promise<void> {
    if (!photos || photos.length === 0) return;

    this.addNewPageIfNeeded(40);
    
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('PERSONALIZAÇÃO:', this.margin, this.currentY);
    this.currentY += 15;

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      
      try {
        // For data URLs, we can add them directly to the PDF
        if (photo.startsWith('data:image/')) {
          // Load image to get natural dimensions
          const img = await this.loadImage(photo);
          
          // Calculate maximum dimensions
          const maxWidth = this.pageWidth - 2 * this.margin;
          const maxHeight = 160; // Max height for images
          
          // Calculate scaling to preserve aspect ratio
          const scale = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
          const imgWidth = img.naturalWidth * scale;
          const imgHeight = img.naturalHeight * scale;
          
          // Check if we need a new page for the image with correct height
          const captionSpace = 25;
          this.addNewPageIfNeeded(imgHeight + captionSpace);
          
          // Center the image
          const imgX = (this.pageWidth - imgWidth) / 2;
          
          // Detect image format from data URL
          const mimeMatch = photo.match(/data:image\/([^;]+)/);
          const format = mimeMatch ? mimeMatch[1].toUpperCase() : 'JPEG';
          const pdfFormat = format === 'JPG' ? 'JPEG' : format;
          
          this.doc.addImage(photo, pdfFormat, imgX, this.currentY, imgWidth, imgHeight);
          this.currentY += imgHeight + 15;
          
          // Add caption
          this.doc.setFontSize(10);
          this.doc.setFont('helvetica', 'normal');
          this.doc.text(`Imagem de Personalização ${i + 1}`, imgX, this.currentY);
          this.currentY += 10;
        }
      } catch (error) {
        console.warn('Erro ao adicionar imagem ao PDF:', error);
        // Add placeholder text if image fails
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'italic');
        this.doc.text('Imagem não disponível', this.margin, this.currentY);
        this.currentY += 15;
      }
    }
    
    this.currentY += 10;
  }

  public async generateBudgetPDF(data: BudgetPDFData): Promise<Blob> {
    try {
      this.currentY = 20;

      this.addHeader(data);
      this.addClientVendorInfo(data);
      await this.addItems(data);
      this.addTotal(data);
      this.addDescription(data);
      
      // Add customization images if they exist
      if (data.budget.photos && data.budget.photos.length > 0) {
        await this.addCustomizationImages(data.budget.photos);
      }

      return new Promise((resolve) => {
        const pdfBlob = this.doc.output('blob');
        resolve(pdfBlob);
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Falha ao gerar PDF');
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  private async addImage(src: string, x: number, y: number, width: number, height: number): Promise<void> {
    try {
      const img = await this.loadImage(src);
      const canvas = document.createElement('canvas');
      canvas.width = width * 4; // Higher resolution
      canvas.height = height * 4;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        this.doc.addImage(imageData, 'JPEG', x, y, width, height);
      }
    } catch (error) {
      console.warn('Failed to load product image:', error);
      // Draw placeholder rectangle
      this.doc.setDrawColor(200);
      this.doc.rect(x, y, width, height);
      this.doc.setFontSize(8);
      this.doc.text('Imagem não disponível', x + width/2, y + height/2, { align: 'center' });
    }
  }

  private formatCurrency(value: string | number): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  }

  private formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  }

  async generateBudgetPDFFromElement(element: HTMLElement, filename: string = 'orcamento.pdf'): Promise<void> {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF();
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  }
}