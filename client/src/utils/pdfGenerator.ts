import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import letterheadUrl from '@assets/Folha_timbrada_Nexo2_(1).pdf_(2)_1765244657245.png';

export interface BudgetPDFData {
  budget: {
    id: string;
    budgetNumber: string;
    title: string;
    description?: string;
    clientId: string;
    vendorId: string;
    branchId?: string;
    totalValue: string;
    validUntil: string;
    hasCustomization: boolean;
    customizationPercentage?: string;
    customizationDescription?: string;
    hasDiscount?: boolean;
    discountType?: string;
    discountPercentage?: string;
    discountValue?: string;
    createdAt: string;
    photos?: string[];
    paymentMethodId?: string;
    shippingMethodId?: string;
    installments?: number;
    downPayment?: string;
    remainingAmount?: string;
    shippingCost?: string;
    deliveryDeadline?: string;
    interestRate?: string;
    interestValue?: string;
  };
  branch?: {
    id: string;
    name: string;
    city: string;
    cnpj?: string;
    address?: string;
    email?: string;
    phone?: string;
    isHeadquarters?: boolean;
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
    productWidth?: string;
    productHeight?: string;
    productDepth?: string;
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
  private currentY: number = 60;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;
  private topMargin: number = 80;
  private letterheadDataUrl: string | null = null;
  private imageCache: Map<string, string | null> = new Map();

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  private async loadLetterhead(): Promise<void> {
    try {
      const img = await this.loadImageWithFallback(letterheadUrl);
      
      if (img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          this.letterheadDataUrl = canvas.toDataURL('image/png');
        }
      }
    } catch (error) {
      console.warn('Failed to load letterhead background:', error);
    }
  }

  private applyLetterheadBackground(): void {
    if (this.letterheadDataUrl) {
      try {
        this.doc.addImage(
          this.letterheadDataUrl,
          'PNG',
          0,
          0,
          this.pageWidth,
          this.pageHeight
        );
      } catch (error) {
        console.warn('Failed to apply letterhead background:', error);
      }
    }
  }

  private addNewPageIfNeeded(spaceNeeded: number): void {
    if (this.currentY + spaceNeeded > this.pageHeight - this.margin) {
      this.doc.addPage();
      this.applyLetterheadBackground();
      this.currentY = this.topMargin;
    }
  }

  private addHeader(data: BudgetPDFData): void {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ORÇAMENTO', this.pageWidth / 2, this.currentY, { align: 'center' });

    this.currentY += 15;
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    
    // Data em cima
    this.doc.text(`Data: ${new Date(data.budget.createdAt).toLocaleDateString('pt-BR')}`, this.margin, this.currentY);
    this.currentY += 8;
    
    // Número do orçamento embaixo da data
    this.doc.text(`Número: ${data.budget.budgetNumber}`, this.margin, this.currentY);
    
    if (data.budget.validUntil) {
      this.currentY += 8;
      this.doc.text(`Válido até: ${new Date(data.budget.validUntil).toLocaleDateString('pt-BR')}`, this.margin, this.currentY);
    }
    // Add delivery deadline if it exists
    if (data.budget.deliveryDeadline) {
      this.currentY += 8;
      this.doc.text(`Prazo de entrega: ${new Date(data.budget.deliveryDeadline).toLocaleDateString('pt-BR')}`, this.margin, this.currentY);
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
    // Adjust vendor starting Y based on client info height
    let vendorStartY = this.currentY - (data.client.email ? 14 : 8) - (data.client.phone ? 6 : 0);
    vendorStartY = Math.max(vendorStartY, this.currentY - 20); // Ensure it doesn't go above currentY

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

  private addBranchInfoTopRight(data: BudgetPDFData): void {
    if (data.branch && (data.branch.name || data.branch.cnpj || data.branch.address)) {
      const rightX = this.pageWidth - this.margin;
      let topY = 18;
      
      // Filial (nome) - com ícone de prédio
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(40, 40, 40);
      const branchName = data.branch.name || 'Filial';
      this.doc.text(branchName, rightX, topY, { align: 'right' });
      
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(80, 80, 80);
      
      // Telefone
      if (data.branch.phone) {
        topY += 5;
        this.doc.text(`Tel: ${data.branch.phone}`, rightX, topY, { align: 'right' });
      }
      
      // Email
      if (data.branch.email) {
        topY += 4;
        this.doc.text(data.branch.email, rightX, topY, { align: 'right' });
      }
      
      // Endereço
      if (data.branch.address) {
        topY += 4;
        const addressLines = this.doc.splitTextToSize(data.branch.address, 70);
        addressLines.forEach((line: string) => {
          this.doc.text(line, rightX, topY, { align: 'right' });
          topY += 4;
        });
      }
      
      // CNPJ
      if (data.branch.cnpj) {
        topY += 1;
        this.doc.text(`CNPJ: ${data.branch.cnpj}`, rightX, topY, { align: 'right' });
      }
      
      this.doc.setTextColor(0, 0, 0);
    }
  }

  private addBranchInfo(data: BudgetPDFData): void {
    if (data.branch && (data.branch.cnpj || data.branch.address)) {
      this.addNewPageIfNeeded(30);

      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('FILIAL EMISSORA:', this.margin, this.currentY);
      this.doc.setFont('helvetica', 'normal');

      let yOffset = 6;
      this.doc.text(data.branch.name, this.margin, this.currentY + yOffset);
      yOffset += 6;

      if (data.branch.cnpj) {
        this.doc.text(`CNPJ: ${data.branch.cnpj}`, this.margin, this.currentY + yOffset);
        yOffset += 6;
      }

      if (data.branch.address) {
        const addressLines = this.doc.splitTextToSize(data.branch.address, this.pageWidth - 2 * this.margin);
        for (const line of addressLines) {
          this.doc.text(line, this.margin, this.currentY + yOffset);
          yOffset += 5;
        }
      }

      this.currentY += yOffset + 10;
    }
  }

  private async loadAndCacheImage(imageLink: string): Promise<string | null> {
    if (this.imageCache.has(imageLink)) {
      return this.imageCache.get(imageLink) || null;
    }

    try {
      let imageUrl = imageLink;
      if (imageLink.startsWith('/uploads/')) {
        imageUrl = `${window.location.origin}${imageLink}`;
      }

      const img = await this.loadImageWithFallback(imageUrl);
      
      if (img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = canvas.toDataURL('image/jpeg', 0.4);
          this.imageCache.set(imageLink, imageData);
          return imageData;
        }
      }
    } catch (error) {
      console.warn('Failed to load product image:', imageLink, error);
    }
    
    this.imageCache.set(imageLink, null);
    return null;
  }

  private renderProductThumbnail(imageData: string | null, x: number, y: number, width: number, height: number): void {
    if (imageData) {
      this.doc.addImage(imageData, 'JPEG', x, y, width, height);
    } else {
      // Draw placeholder
      this.doc.setDrawColor(200);
      // Removing fill to avoid white background issues
      // this.doc.setFillColor(250, 250, 250);
      this.doc.rect(x, y, width, height, 'D'); // Changed 'FD' (Fill + Draw) to 'D' (Draw only)
    }
  }

  private async addItems(data: BudgetPDFData): Promise<void> {
    this.addNewPageIfNeeded(50);

    // Pre-load all product images
    const productImages: Map<number, string | null> = new Map();
    for (const item of data.items) {
      if (item.product.imageLink) {
        const imageData = await this.loadAndCacheImage(item.product.imageLink);
        productImages.set(item.id, imageData);
      }
    }

    // Title
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ITENS DO ORÇAMENTO', this.margin, this.currentY);
    this.currentY += 15;

    // Table headers (com imagem do produto)
    const imgColWidth = 22;
    const colWidths = [imgColWidth, 68, 20, 35, 40];
    const startX = this.margin;
    let currentX = startX;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');

    // Draw header background
    // Removing fill to avoid white background issues
    // this.doc.setFillColor(240, 240, 240);
    // this.doc.rect(startX, this.currentY - 5, colWidths.reduce((a, b) => a + b, 0), 10, 'F');

    this.doc.text('Img', currentX + 2, this.currentY);
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
      const hasCustomization = item.hasItemCustomization && item.itemCustomizationDescription;
      const baseRowHeight = 22;

      this.addNewPageIfNeeded(baseRowHeight + (hasCustomization ? 15 : 0) + 5);

      // Draw row background (alternating)
      // Removing fill to avoid white background issues
      // if (index % 2 === 1) {
      //   this.doc.setFillColor(250, 250, 250);
      //   this.doc.rect(startX, this.currentY - 5, colWidths.reduce((a, b) => a + b, 0), baseRowHeight, 'F');
      // }

      currentX = startX;

      // Product thumbnail image
      const productImageData = productImages.get(item.id);
      this.renderProductThumbnail(productImageData || null, currentX + 1, this.currentY - 3, 18, 18);
      currentX += colWidths[0];

      // Product name (with text wrapping if needed)
      const productName = item.product.name.length > 40 
        ? item.product.name.substring(0, 40) + '...' 
        : item.product.name;
      this.doc.text(productName, currentX + 2, this.currentY + 5);

      // Add product description if available
      if (item.product.description) {
        this.doc.setFontSize(8);
        this.doc.setTextColor(100, 100, 100);
        const description = item.product.description.length > 45 
          ? item.product.description.substring(0, 45) + '...' 
          : item.product.description;
        this.doc.text(description, currentX + 2, this.currentY + 10);
        this.doc.setFontSize(10);
        this.doc.setTextColor(0, 0, 0);
      }
      currentX += colWidths[1];

      // Quantity - ensure it's displayed as integer without thousands separator
      const qty = typeof item.quantity === 'string' ? parseInt(item.quantity) : Math.round(item.quantity);
      this.doc.text(qty.toString(), currentX + 2, this.currentY + 10);
      currentX += colWidths[2];

      // Unit price
      this.doc.text(`R$ ${parseFloat(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, currentX + 2, this.currentY + 10);
      currentX += colWidths[3];

      // Total price
      this.doc.text(`R$ ${parseFloat(item.totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, currentX + 2, this.currentY + 10);

      this.currentY += baseRowHeight;

      // Add product dimensions if exists
      if (item.productWidth || item.productHeight || item.productDepth) {
        this.doc.setFontSize(8);
        this.doc.setTextColor(100, 100, 100);

        let dimensionsText = '  Dimensões: ';
        const dimensions = [];
        if (item.productWidth) dimensions.push(`L: ${item.productWidth}cm`);
        if (item.productHeight) dimensions.push(`A: ${item.productHeight}cm`);
        if (item.productDepth) dimensions.push(`P: ${item.productDepth}cm`);
        dimensionsText += dimensions.join(' × ');

        this.doc.text(dimensionsText, startX + 2, this.currentY);
        this.currentY += 8;

        this.doc.setFontSize(10);
        this.doc.setTextColor(0, 0, 0);
      }

      // Add customization info if exists (without value - value should not appear in PDF)
      if (hasCustomization) {
        this.doc.setFontSize(8);
        this.doc.setTextColor(100, 100, 100);

        this.doc.text(`  + Personalização: ${item.itemCustomizationDescription}`, startX + 2, this.currentY);
        this.currentY += 5;

        this.doc.setFontSize(10);
        this.doc.setTextColor(0, 0, 0);
      }

      this.currentY += 5; // Extra spacing between items
    }

    this.currentY += 10;
  }

  private addTotal(data: BudgetPDFData): void {
    this.addNewPageIfNeeded(60);

    // Calculate subtotal
    const subtotal = data.items.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);

    // Draw total section
    const sectionHeight = data.budget.hasDiscount ? 40 : 20;
    // Removing fill to avoid white background issues
    // this.doc.setFillColor(240, 240, 240);
    // this.doc.rect(this.pageWidth - this.margin - 100, this.currentY - 5, 100, sectionHeight, 'F');

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');

    // Subtotal
    this.doc.text('Subtotal:', this.margin, this.currentY + 5);
    this.doc.text(`R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin, this.currentY + 10);

    // Discount if exists
    if (data.budget.hasDiscount) {
      this.doc.setTextColor(255, 100, 0); // Orange color for discount
      this.doc.text('Desconto:', this.margin, this.currentY + 15);

      let discountText = '';
      if (data.budget.discountType === 'percentage') {
        const discountAmount = (subtotal * parseFloat(data.budget.discountPercentage || '0')) / 100;
        discountText = `- R$ ${discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${data.budget.discountPercentage}%)`;
      } else {
        discountText = `- R$ ${parseFloat(data.budget.discountValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      }

      this.doc.text(discountText, this.margin, this.currentY + 20);
      this.doc.setTextColor(0, 0, 0); // Reset to black

      this.currentY += 10; // Extra space for discount
    }

    // Total
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('TOTAL GERAL:', this.margin, this.currentY + 15);
    this.doc.text(`R$ ${parseFloat(data.budget.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin, this.currentY + 25);

    this.currentY += 40;
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
          this.currentY += 8;
          this.doc.setFont('helvetica', 'normal');
          this.doc.text(paymentMethod.name, this.margin, this.currentY);
          this.currentY += 10;

          if (data.budget.installments && data.budget.installments > 1) {
            this.doc.setFont('helvetica', 'bold');
            this.doc.text('Parcelas:', this.margin, this.currentY);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(`${data.budget.installments}x`, this.margin + 20, this.currentY);
            this.currentY += 8;
          }

          if (data.budget.downPayment && parseFloat(data.budget.downPayment) > 0) {
            this.doc.setFont('helvetica', 'bold');
            this.doc.text('Entrada:', this.margin, this.currentY);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(`R$ ${parseFloat(data.budget.downPayment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin + 20, this.currentY);
            this.currentY += 8;

            this.doc.setFont('helvetica', 'bold');
            this.doc.text('Restante:', this.margin, this.currentY);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(`R$ ${parseFloat(data.remainingAmount || data.budget.remainingAmount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin + 20, this.currentY);
            this.currentY += 10;
          }
        }
      }

      // Shipping info
      if (data.budget.shippingMethodId) {
        const shippingMethod = data.shippingMethods?.find(sm => sm.id === data.budget.shippingMethodId);
        if (shippingMethod) {
          this.doc.setFont('helvetica', 'bold');
          this.doc.text('Método de Frete:', this.margin, this.currentY);
          this.currentY += 8;
          this.doc.setFont('helvetica', 'normal');
          this.doc.text(shippingMethod.name, this.margin, this.currentY);
          this.currentY += 10;

          if (data.budget.shippingCost) {
            this.doc.setFont('helvetica', 'bold');
            this.doc.text('Valor do Frete:', this.margin, this.currentY);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(`R$ ${parseFloat(data.budget.shippingCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, this.margin + 30, this.currentY);
            this.currentY += 8;
          }
        }
      }

      // Credit card interest
      if (data.budget.interestValue && parseFloat(data.budget.interestValue) > 0) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Juros do Cartão:', this.margin, this.currentY);
        this.doc.setFont('helvetica', 'normal');
        const interestRate = data.budget.interestRate ? `(${data.budget.interestRate}% x ${data.budget.installments || 1}x)` : '';
        this.doc.text(`R$ ${parseFloat(data.budget.interestValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${interestRate}`, this.margin, this.currentY);
        this.currentY += 8;
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

        // Load image with better error handling
        const img = await this.loadImageWithFallback(imageUrl);

        if (img) {
          this.addNewPageIfNeeded(120);

          // Product name
          this.doc.setFontSize(12);
          this.doc.setFont('helvetica', 'bold');
          this.doc.text(item.product?.name || 'Produto', this.margin, this.currentY);
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
          const maxWidth = 120;
          const maxHeight = 90;

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
            const imageData = canvas.toDataURL('image/jpeg', 0.9);

            this.doc.addImage(imageData, 'JPEG', imageX, this.currentY, width, height);
            this.currentY += height + 15;
          }
        } else {
          // Add placeholder text for failed images
          this.doc.setFontSize(10);
          this.doc.setTextColor(150, 150, 150);
          this.doc.text(`Imagem de personalização não disponível para ${item.product?.name || 'produto'}`, this.margin, this.currentY);
          this.currentY += 15;
          this.doc.setTextColor(0, 0, 0);
        }
      } catch (error) {
        console.error('Error adding product customization image to PDF:', error);
        // Add error placeholder
        this.doc.setFontSize(10);
        this.doc.setTextColor(150, 150, 150);
        this.doc.text(`Erro ao carregar imagem de ${item.product?.name || 'produto'}`, this.margin, this.currentY);
        this.currentY += 15;
        this.doc.setTextColor(0, 0, 0);
      }
    }

    this.currentY += 10;
  }

  private async loadImageWithFallback(src: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        if (img.complete && img.naturalWidth > 0) {
          resolve(img);
        } else {
          resolve(null);
        }
      };
      
      img.onerror = () => {
        console.warn(`Failed to load image: ${src}`);
        resolve(null);
      };
      
      // Set timeout to avoid hanging
      setTimeout(() => {
        resolve(null);
      }, 5000);
      
      img.src = src;
    });
  }

  public async generateBudgetPDF(data: BudgetPDFData): Promise<Blob> {
    try {
      console.log('Starting PDF generation for budget:', data.budget?.budgetNumber);
      console.log('PDF data received:', {
        hasBudget: !!data.budget,
        hasClient: !!data.client,
        hasVendor: !!data.vendor,
        hasItems: !!data.items && data.items.length > 0,
        itemCount: data.items?.length || 0
      });
      
      // Validate required data with better error messages
      if (!data || typeof data !== 'object') {
        throw new Error('Dados do PDF não foram fornecidos');
      }
      
      if (!data.budget) {
        throw new Error('Dados do orçamento não encontrados na resposta da API');
      }
      
      if (!data.client) {
        console.warn('Client data missing, using default values');
        data.client = { name: 'Cliente não informado', email: '', phone: '' };
      }
      
      if (!data.vendor) {
        console.warn('Vendor data missing, using default values');
        data.vendor = { name: 'Vendedor não informado', email: '', phone: '' };
      }

      if (!data.items || data.items.length === 0) {
        console.warn('No items found, creating empty items array');
        data.items = [];
      }

      // Load letterhead background
      console.log('Loading letterhead background...');
      await this.loadLetterhead();
      
      // Apply letterhead to first page
      this.applyLetterheadBackground();

      // Add branch info in top right corner (before other content)
      console.log('Adding branch info in top right...');
      this.addBranchInfoTopRight(data);

      this.currentY = this.topMargin;

      console.log('Adding header...');
      this.addHeader(data);
      
      console.log('Adding client and vendor info...');
      this.addClientVendorInfo(data);
      
      console.log('Adding items...');
      await this.addItems(data);
      
      console.log('Adding total...');
      this.addTotal(data);
      
      console.log('Adding payment and shipping info...');
      this.addPaymentShippingInfo(data);
      
      console.log('Adding description...');
      this.addDescription(data);

      console.log('Generating PDF blob...');
      return new Promise((resolve) => {
        const pdfBlob = this.doc.output('blob');
        console.log('PDF generated successfully, size:', pdfBlob.size, 'bytes');
        resolve(pdfBlob);
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error(`Falha ao gerar PDF: ${error.message}`);
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