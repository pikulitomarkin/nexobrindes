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

  async generateBudgetPDF(data: BudgetPDFData): Promise<Blob> {
    // Header
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ORÇAMENTO', this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 15;

    // Budget info
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Número: ${data.budget.budgetNumber}`, this.margin, this.currentY);
    this.currentY += 8;
    this.doc.text(`Data: ${this.formatDate(data.budget.createdAt)}`, this.margin, this.currentY);
    this.currentY += 8;
    if (data.budget.validUntil) {
      this.doc.text(`Válido até: ${this.formatDate(data.budget.validUntil)}`, this.margin, this.currentY);
      this.currentY += 8;
    }
    this.currentY += 5;

    // Title
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(data.budget.title, this.margin, this.currentY);
    this.currentY += 10;

    if (data.budget.description) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      const splitDescription = this.doc.splitTextToSize(data.budget.description, this.pageWidth - 2 * this.margin);
      this.doc.text(splitDescription, this.margin, this.currentY);
      this.currentY += splitDescription.length * 5 + 5;
    }

    // Client and Vendor info
    this.addNewPageIfNeeded(30);
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    
    // Client info (left column)
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

    // Vendor info (right column)
    const rightColumn = this.pageWidth / 2 + 10;
    const vendorY = this.currentY - (data.client.email ? 14 : 8) - (data.client.phone ? 6 : 0);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('VENDEDOR:', rightColumn, vendorY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.vendor.name, rightColumn, vendorY + 8);
    if (data.vendor.email) {
      this.doc.text(`Email: ${data.vendor.email}`, rightColumn, vendorY + 14);
    }
    if (data.vendor.phone) {
      this.doc.text(`Telefone: ${data.vendor.phone}`, rightColumn, vendorY + (data.vendor.email ? 20 : 14));
    }

    this.currentY += 15;

    // Items header
    this.addNewPageIfNeeded(40);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.text('ITENS DO ORÇAMENTO', this.margin, this.currentY);
    this.currentY += 10;

    // Table header
    const tableStartY = this.currentY;
    const imgWidth = 25;
    const colWidths = [imgWidth, 60, 25, 30, 30]; // Image, Product, Qty, Unit Price, Total
    let currentX = this.margin;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    
    // Draw table header background
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(this.margin, this.currentY - 5, this.pageWidth - 2 * this.margin, 12, 'F');
    
    this.doc.text('Imagem', currentX + colWidths[0]/2, this.currentY + 3, { align: 'center' });
    currentX += colWidths[0];
    this.doc.text('Produto', currentX + colWidths[1]/2, this.currentY + 3, { align: 'center' });
    currentX += colWidths[1];
    this.doc.text('Qtd', currentX + colWidths[2]/2, this.currentY + 3, { align: 'center' });
    currentX += colWidths[2];
    this.doc.text('Preço Unit.', currentX + colWidths[3]/2, this.currentY + 3, { align: 'center' });
    currentX += colWidths[3];
    this.doc.text('Total', currentX + colWidths[4]/2, this.currentY + 3, { align: 'center' });

    this.currentY += 12;

    // Items
    let subtotal = 0;
    for (const item of data.items) {
      this.addNewPageIfNeeded(35);
      
      const itemStartY = this.currentY;
      currentX = this.margin;

      // Product image
      if (item.product.imageLink) {
        await this.addImage(item.product.imageLink, currentX + 2, this.currentY, imgWidth - 4, 20);
      } else {
        this.doc.setDrawColor(200);
        this.doc.rect(currentX + 2, this.currentY, imgWidth - 4, 20);
        this.doc.setFontSize(6);
        this.doc.text('Sem imagem', currentX + imgWidth/2, this.currentY + 12, { align: 'center' });
      }
      currentX += colWidths[0];

      // Product info
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(9);
      const productName = this.doc.splitTextToSize(item.product.name, colWidths[1] - 4);
      this.doc.text(productName, currentX + 2, this.currentY + 5);
      
      if (item.product.description) {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(7);
        const description = this.doc.splitTextToSize(item.product.description, colWidths[1] - 4);
        this.doc.text(description, currentX + 2, this.currentY + 12);
      }

      if (item.hasItemCustomization && item.itemCustomizationDescription) {
        this.doc.setFont('helvetica', 'italic');
        this.doc.setFontSize(7);
        this.doc.setTextColor(100, 100, 100);
        const customization = this.doc.splitTextToSize(`Personalização (${item.itemCustomizationPercentage}%): ${item.itemCustomizationDescription}`, colWidths[1] - 4);
        this.doc.text(customization, currentX + 2, this.currentY + 18);
        this.doc.setTextColor(0, 0, 0);
      }
      currentX += colWidths[1];

      // Quantity
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(10);
      this.doc.text(item.quantity.toString(), currentX + colWidths[2]/2, this.currentY + 12, { align: 'center' });
      currentX += colWidths[2];

      // Unit price
      this.doc.text(this.formatCurrency(item.unitPrice), currentX + colWidths[3]/2, this.currentY + 12, { align: 'center' });
      currentX += colWidths[3];

      // Calculate item total including customization
      const baseItemTotal = parseFloat(item.unitPrice) * item.quantity;
      let itemTotal = baseItemTotal;
      
      if (item.hasItemCustomization && item.itemCustomizationPercentage) {
        const customizationAmount = baseItemTotal * (parseFloat(item.itemCustomizationPercentage) / 100);
        itemTotal = baseItemTotal + customizationAmount;
      }
      
      subtotal += itemTotal;
      this.doc.text(this.formatCurrency(itemTotal), currentX + colWidths[4]/2, this.currentY + 12, { align: 'center' });

      this.currentY += 25;

      // Draw row separator
      this.doc.setDrawColor(220);
      this.doc.line(this.margin, this.currentY - 2, this.pageWidth - this.margin, this.currentY - 2);
    }

    // Totals
    this.addNewPageIfNeeded(50);
    this.currentY += 10;
    
    const totalsX = this.pageWidth - 80;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(11);
    this.doc.text('Subtotal:', totalsX, this.currentY);
    this.doc.text(this.formatCurrency(subtotal), totalsX + 40, this.currentY, { align: 'right' });
    this.currentY += 8;

    if (data.budget.hasCustomization && data.budget.customizationPercentage) {
      const customizationRate = parseFloat(data.budget.customizationPercentage);
      const customizationAmount = subtotal * (customizationRate / 100);
      
      this.doc.text(`Personalização (${customizationRate}%):`, totalsX, this.currentY);
      this.doc.text(this.formatCurrency(customizationAmount), totalsX + 40, this.currentY, { align: 'right' });
      this.currentY += 8;

      if (data.budget.customizationDescription) {
        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'italic');
        const customDesc = this.doc.splitTextToSize(data.budget.customizationDescription, 100);
        this.doc.text(customDesc, totalsX, this.currentY);
        this.currentY += customDesc.length * 5 + 5;
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(11);
      }
    }

    // Total
    this.doc.line(totalsX, this.currentY, totalsX + 40, this.currentY);
    this.currentY += 5;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text('TOTAL:', totalsX, this.currentY);
    this.doc.text(this.formatCurrency(data.budget.totalValue), totalsX + 40, this.currentY, { align: 'right' });

    // Footer
    this.addNewPageIfNeeded(20);
    this.currentY += 20;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('Este orçamento é válido por 30 dias a partir da data de emissão.', this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 5;
    this.doc.text('Para dúvidas ou esclarecimentos, entre em contato conosco.', this.pageWidth / 2, this.currentY, { align: 'center' });

    return this.doc.output('blob');
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