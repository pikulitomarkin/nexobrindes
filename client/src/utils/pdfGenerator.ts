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
    paymentMethodId?: string;
    shippingMethodId?: string;
    installments?: number;
    downPayment?: string;
    remainingAmount?: string;
    shippingCost?: string;
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
    customizationPhoto?: string;
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
  paymentMethods?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  shippingMethods?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
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

    // Table headers without image column (cleaner layout)
    const colWidths = [90, 20, 30, 45];
    const startX = this.margin;
    let currentX = startX;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');

    // Draw header background
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(startX, this.currentY - 5, colWidths.reduce((a, b) => a + b, 0), 10, 'F');

    this.doc.text('Produto', currentX + 2, this.currentY);
    currentX += colWidths[0];
    this.doc.text('Qtd', currentX + 2, this.currentY);
    currentX += colWidths[1];
    this.doc.text('Preço Unit.', currentX + 2, this.currentY);
    currentX += colWidths[2];
    this.doc.text('Total', currentX + 2, this.currentY);

    this.currentY += 10;

    // Items
    this.doc.setFont('helvetica', 'normal');

    for (let index = 0; index < data.items.length; index++) {
      const item = data.items[index];
      const baseRowHeight = 15;
      const hasCustomization = item.hasItemCustomization && item.itemCustomizationDescription;

      this.addNewPageIfNeeded(baseRowHeight + (hasCustomization ? 15 : 0) + 5);

      // Draw row background (alternating)
      if (index % 2 === 1) {
        this.doc.setFillColor(250, 250, 250);
        this.doc.rect(startX, this.currentY - 5, colWidths.reduce((a, b) => a + b, 0), baseRowHeight, 'F');
      }

      currentX = startX;

      // Product name (with text wrapping if needed)
      const productName = item.product.name.length > 45 
        ? item.product.name.substring(0, 45) + '...' 
        : item.product.name;
      this.doc.text(productName, currentX + 2, this.currentY + 5);

      // Add product description if available
      if (item.product.description) {
        this.doc.setFontSize(8);
        this.doc.setTextColor(100, 100, 100);
        const description = item.product.description.length > 50 
          ? item.product.description.substring(0, 50) + '...' 
          : item.product.description;
        this.doc.text(description, currentX + 2, this.currentY + 10);
        this.doc.setFontSize(10);
        this.doc.setTextColor(0, 0, 0);
      }
      currentX += colWidths[0];

      // Quantity
      this.doc.text(item.quantity.toString(), currentX + 2, this.currentY + 5);
      currentX += colWidths[1];

      // Unit price
      this.doc.text(`R$ ${parseFloat(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, currentX + 2, this.currentY + 5);
      currentX += colWidths[2];

      // Total price
      this.doc.text(`R$ ${parseFloat(item.totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, currentX + 2, this.currentY + 5);

      this.currentY += baseRowHeight;

      // Add customization info if exists
      if (hasCustomization) {
        this.doc.setFontSize(8);
        this.doc.setTextColor(100, 100, 100);
        
        this.doc.text(`  + Personalização: ${item.itemCustomizationDescription}`, startX + 2, this.currentY);
        this.doc.text(`    Valor: R$ ${parseFloat(item.itemCustomizationValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, startX + 2, this.currentY + 5);
        this.currentY += 10;
        
        this.doc.setFontSize(10);
        this.doc.setTextColor(0, 0, 0);
      }

      this.currentY += 5; // Extra spacing between items
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
    this.doc.text(`R$ ${parseFloat(data.budget.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.pageWidth - this.margin - 95, this.currentY + 15);

    this.currentY += 30;
  }

  private addPaymentShippingInfo(data: BudgetPDFData): void {
    if (data.budget.paymentMethodId || data.budget.shippingMethodId) {
      this.addNewPageIfNeeded(60);

      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('INFORMAÇÕES DE PAGAMENTO E FRETE', this.margin, this.currentY);
      this.currentY += 15;

      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');

      // Payment info
      if (data.budget.paymentMethodId) {
        const paymentMethod = data.paymentMethods?.find(pm => pm.id === data.budget.paymentMethodId);
        if (paymentMethod) {
          this.doc.setFont('helvetica', 'bold');
          this.doc.text('Forma de Pagamento:', this.margin, this.currentY);
          this.doc.setFont('helvetica', 'normal');
          this.doc.text(paymentMethod.name, this.margin + 70, this.currentY);
          this.currentY += 8;

          if (data.budget.installments && data.budget.installments > 1) {
            this.doc.text(`Parcelas: ${data.budget.installments}x`, this.margin, this.currentY);
            this.currentY += 8;
          }

          if (data.budget.downPayment && parseFloat(data.budget.downPayment) > 0) {
            this.doc.text(`Entrada: R$ ${parseFloat(data.budget.downPayment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin, this.currentY);
            this.currentY += 8;
            this.doc.text(`Restante: R$ ${parseFloat(data.budget.remainingAmount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin, this.currentY);
            this.currentY += 8;
          }
        }
      }

      // Shipping info
      if (data.budget.shippingMethodId) {
        const shippingMethod = data.shippingMethods?.find(sm => sm.id === data.budget.shippingMethodId);
        if (shippingMethod) {
          this.doc.setFont('helvetica', 'bold');
          this.doc.text('Método de Frete:', this.margin, this.currentY);
          this.doc.setFont('helvetica', 'normal');
          this.doc.text(shippingMethod.name, this.margin + 60, this.currentY);
          this.currentY += 8;

          if (data.budget.shippingCost) {
            this.doc.text(`Valor do Frete: R$ ${parseFloat(data.budget.shippingCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin, this.currentY);
            this.currentY += 8;
          }
        }
      }

      this.currentY += 10;
    }
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

  private async addProductCustomizationImages(data: BudgetPDFData): Promise<void> {
    // Filter items that have customization photos
    const itemsWithPhotos = data.items.filter(item => item.customizationPhoto);
    
    if (itemsWithPhotos.length === 0) return;

    this.addNewPageIfNeeded(60);

    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('PERSONALIZAÇÕES DOS PRODUTOS', this.margin, this.currentY);
    this.currentY += 20;

    // Add images for each product
    for (let i = 0; i < itemsWithPhotos.length; i++) {
      const item = itemsWithPhotos[i];
      
      try {
        let imageUrl = item.customizationPhoto!;

        // Convert relative URLs to absolute URLs for PDF generation
        if (item.customizationPhoto!.startsWith('/uploads/')) {
          imageUrl = `${window.location.origin}${item.customizationPhoto}`;
        }

        // Load image
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => {
            console.warn(`Failed to load image: ${imageUrl}`);
            resolve(null); // Continue even if image fails to load
          };
          img.src = imageUrl;
        });

        if (img.complete && img.naturalWidth > 0) {
          this.addNewPageIfNeeded(120);

          // Product name
          this.doc.setFontSize(12);
          this.doc.setFont('helvetica', 'bold');
          this.doc.text(item.product.name, this.margin, this.currentY);
          this.currentY += 5;

          // Customization description if available
          if (item.itemCustomizationDescription) {
            this.doc.setFontSize(10);
            this.doc.setFont('helvetica', 'normal');
            this.doc.setTextColor(100, 100, 100);
            this.doc.text(`Personalização: ${item.itemCustomizationDescription}`, this.margin, this.currentY);
            this.currentY += 5;
            this.doc.setTextColor(0, 0, 0);
          }

          this.currentY += 5;

          // Calculate image dimensions (maintain aspect ratio and make it larger)
          const maxWidth = 120; // Increased from 80
          const maxHeight = 90;  // Increased from 60

          let width = maxWidth;
          let height = (img.naturalHeight / img.naturalWidth) * width;

          if (height > maxHeight) {
            height = maxHeight;
            width = (img.naturalWidth / img.naturalHeight) * height;
          }

          // Center the image horizontally
          const imageX = this.margin + (this.pageWidth - 2 * this.margin - width) / 2;

          // Add image to PDF
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg', 0.9); // Higher quality

            this.doc.addImage(imageData, 'JPEG', imageX, this.currentY, width, height);
            this.currentY += height + 15; // More spacing between images
          }
        }
      } catch (error) {
        console.error('Error adding product customization image to PDF:', error);
        // Continue with next image even if this one fails
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
      this.addPaymentShippingInfo(data);
      this.addDescription(data);
      await this.addProductCustomizationImages(data);

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