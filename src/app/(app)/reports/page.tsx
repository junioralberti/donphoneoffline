
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BarChartHorizontalBig, PieChart, History, Info, Loader2, CalendarIcon, Download, Printer, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableSummaryFooter } from "@/components/ui/table";
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import { getSalesByDateRange, type Sale } from "@/services/salesService";
import { getServiceOrdersByDateRangeAndStatus, type ServiceOrder, type ServiceOrderStatus } from "@/services/serviceOrderService";
import { getProducts, type Product } from "@/services/productService";
import { getEstablishmentSettings, type EstablishmentSettings } from "@/services/settingsService";

const serviceOrderStatusesForFilter: (ServiceOrderStatus | "Todos")[] = ["Todos", "Aberta", "Em andamento", "Aguardando peça", "Concluída", "Entregue", "Cancelada"];


export default function ReportsPage() {
  const { toast } = useToast();
  const [establishmentDataForPrint, setEstablishmentDataForPrint] = useState<EstablishmentSettings | null>(null);

  // Sales Report State
  const [salesStartDate, setSalesStartDate] = useState<Date | undefined>(subDays(new Date(), 7));
  const [salesEndDate, setSalesEndDate] = useState<Date | undefined>(new Date());
  const [salesReportData, setSalesReportData] = useState<Sale[] | null>(null);
  const [isGeneratingSalesReport, setIsGeneratingSalesReport] = useState(false);
  const [salesReportError, setSalesReportError] = useState<string | null>(null);

  // Service Orders Report State
  const [osStartDate, setOsStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [osEndDate, setOsEndDate] = useState<Date | undefined>(new Date());
  const [osStatusFilter, setOsStatusFilter] = useState<ServiceOrderStatus | "Todos">("Todos");
  const [osReportData, setOsReportData] = useState<ServiceOrder[] | null>(null);
  const [isGeneratingOsReport, setIsGeneratingOsReport] = useState(false);
  const [osReportError, setOsReportError] = useState<string | null>(null);

  // Inventory Report State
  const [inventoryReportData, setInventoryReportData] = useState<Product[] | null>(null);
  const [isGeneratingInventoryReport, setIsGeneratingInventoryReport] = useState(false);
  const [inventoryReportError, setInventoryReportError] = useState<string | null>(null);

  // Financial Report State
  const [financeStartDate, setFinanceStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [financeEndDate, setFinanceEndDate] = useState<Date | undefined>(new Date());
  const [financialReportData, setFinancialReportData] = useState<{ salesTotal: number; osTotal: number; grandTotal: number } | null>(null);
  const [isGeneratingFinancialReport, setIsGeneratingFinancialReport] = useState(false);
  const [financialReportError, setFinancialReportError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
        try {
            const settings = await getEstablishmentSettings();
            setEstablishmentDataForPrint(settings);
        } catch (error) {
            console.error("Failed to fetch establishment settings for print:", error);
            toast({
                title: "Erro ao buscar dados do estabelecimento",
                description: "Não foi possível carregar os dados da empresa para impressão.",
                variant: "destructive",
            });
        }
    };
    fetchSettings();
  }, [toast]);

  const handleGenerateSalesReport = async () => {
    if (!salesStartDate || !salesEndDate) {
      setSalesReportError("Por favor, selecione as datas de início e fim.");
      return;
    }
    setIsGeneratingSalesReport(true);
    setSalesReportError(null);
    setSalesReportData(null);
    try {
      const data = await getSalesByDateRange(salesStartDate, salesEndDate);
      setSalesReportData(data);
    } catch (error) {
      console.error("Error generating sales report:", error);
      setSalesReportError(error instanceof Error ? error.message : "Erro desconhecido ao gerar relatório de vendas.");
    } finally {
      setIsGeneratingSalesReport(false);
    }
  };
  
  const handleGenerateOsReport = async () => {
    setIsGeneratingOsReport(true);
    setOsReportError(null);
    setOsReportData(null);
    try {
      const data = await getServiceOrdersByDateRangeAndStatus(osStartDate, osEndDate, osStatusFilter);
      setOsReportData(data);
    } catch (error) {
      console.error("Error generating OS report:", error);
      setOsReportError(error instanceof Error ? error.message : "Erro desconhecido ao gerar relatório de OS.");
    } finally {
      setIsGeneratingOsReport(false);
    }
  };

  const handleGenerateInventoryReport = async () => {
    setIsGeneratingInventoryReport(true);
    setInventoryReportError(null);
    setInventoryReportData(null);
    try {
      const data = await getProducts(); 
      setInventoryReportData(data);
    } catch (error) {
      console.error("Error generating inventory report:", error);
      setInventoryReportError(error instanceof Error ? error.message : "Erro desconhecido ao gerar relatório de inventário.");
    } finally {
      setIsGeneratingInventoryReport(false);
    }
  };
  
  const handleGenerateFinancialReport = async () => {
    if (!financeStartDate || !financeEndDate) {
        setFinancialReportError("Por favor, selecione as datas de início e fim para o relatório financeiro.");
        return;
    }
    setIsGeneratingFinancialReport(true);
    setFinancialReportError(null);
    setFinancialReportData(null);
    try {
        const salesData = await getSalesByDateRange(financeStartDate, financeEndDate);
        const salesTotal = salesData.reduce((sum, sale) => sum + sale.totalAmount, 0);

        const completedOsData = await getServiceOrdersByDateRangeAndStatus(financeStartDate, financeEndDate, "Concluída");
        const deliveredOsData = await getServiceOrdersByDateRangeAndStatus(financeStartDate, financeEndDate, "Entregue");
        const osTotal = [...completedOsData, ...deliveredOsData].reduce((sum, os) => sum + os.grandTotalValue, 0);
        
        setFinancialReportData({
            salesTotal,
            osTotal,
            grandTotal: salesTotal + osTotal,
        });

    } catch (error) {
        console.error("Error generating financial report:", error);
        setFinancialReportError(error instanceof Error ? error.message : "Erro desconhecido ao gerar relatório financeiro.");
    } finally {
        setIsGeneratingFinancialReport(false);
    }
  };

  const printReport = (title: string, period: string, contentHtml: string) => {
    const establishmentDataToUse = establishmentDataForPrint || {
        businessName: "Nome da Empresa Aqui",
        businessAddress: "Endereço da Empresa Aqui",
        businessCnpj: "Seu CNPJ",
        businessPhone: "Seu Telefone",
        businessEmail: "Seu Email",
    };
    const fixedLogoUrl = "/logoprincipal.png";

    const printWindow = window.open('', '_blank', 'height=700,width=800');
    if (printWindow) {
        printWindow.document.write('<html><head><title>' + title + '</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
            body { font-family: 'Arial', sans-serif; margin: 20px; font-size: 10pt; color: #333; font-weight: bold; }
            .print-container { width: 100%; max-width: 900px; margin: auto; }
            .establishment-header { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #ccc; }
            .logo-container { margin-bottom: 10px; flex-shrink: 0; }
            .logo-container img { max-height: 180px; max-width: 540px; object-fit: contain; display: block; margin: 0 auto; }
            .establishment-info { font-size: 9pt; line-height: 1.4; text-align: center; }
            .establishment-info strong { font-size: 12pt; display: block; margin-bottom: 4px; color: #000; }
            .report-title { font-size: 16pt; font-weight: bold; text-align: center; margin-top: 20px; margin-bottom: 5px; color: #000; }
            .report-period { font-size: 10pt; text-align: center; margin-bottom: 15px; color: #555; }
            .report-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9pt; }
            .report-table th, .report-table td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            .report-table th { background-color: #f2f2f2; font-weight: bold; }
            .report-table .text-right { text-align: right; }
            .report-table .text-center { text-align: center; }
            .summary-section { margin-top: 15px; padding-top:10px; border-top: 1px solid #ccc; font-size: 10pt; }
            .summary-section div { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .summary-section .grand-total { font-size: 11pt; font-weight: bold; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        `);
        printWindow.document.write('</style></head><body><div class="print-container">');
        
        printWindow.document.write('<div class="establishment-header">');
        printWindow.document.write(`<div class="logo-container"><img src="${fixedLogoUrl}" alt="Logo" data-ai-hint="company brand illustration" /></div>`);
        printWindow.document.write('<div class="establishment-info">');
        printWindow.document.write(`<strong>${establishmentDataToUse.businessName || "Nome da Empresa"}</strong><br/>`);
        printWindow.document.write(`${establishmentDataToUse.businessAddress || "Endereço da Empresa"}<br/>`);
        if(establishmentDataToUse.businessCnpj) printWindow.document.write(`CNPJ: ${establishmentDataToUse.businessCnpj}<br/>`);
        if(establishmentDataToUse.businessPhone || establishmentDataToUse.businessEmail) {
            printWindow.document.write(`Telefone: ${establishmentDataToUse.businessPhone || ""} ${establishmentDataToUse.businessPhone && establishmentDataToUse.businessEmail ? '|' : ''} E-mail: ${establishmentDataToUse.businessEmail || ""}`);
        }
        printWindow.document.write('</div></div>');

        printWindow.document.write('<h1 class="report-title">' + title + '</h1>');
        if (period) printWindow.document.write('<p class="report-period">' + period + '</p>');
        
        printWindow.document.write(contentHtml);

        printWindow.document.write('</div></body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);
    } else {
        toast({ title: "Impressão Bloqueada", description: "Por favor, desabilite o bloqueador de pop-ups.", variant: "destructive"});
    }
  };

  const handlePrintSalesReport = () => {
    if (!salesReportData) return;
    const period = `Período: ${salesStartDate ? format(salesStartDate, "dd/MM/yyyy", { locale: ptBR }) : 'N/A'} - ${salesEndDate ? format(salesEndDate, "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}`;
    let tableHtml = '<table class="report-table"><thead><tr><th>Data</th><th>Cliente</th><th>Itens</th><th>Pagamento</th><th class="text-right">Valor Total (R$)</th></tr></thead><tbody>';
    salesReportData.forEach(sale => {
        tableHtml += `<tr>
            <td>${format(new Date(sale.createdAt as Date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</td>
            <td>${sale.clientName || "Não informado"}</td>
            <td class="text-center">${sale.items.reduce((acc, item) => acc + item.quantity, 0)}</td>
            <td>${sale.paymentMethod || "N/D"}</td>
            <td class="text-right">${sale.totalAmount.toFixed(2).replace('.', ',')}</td>
        </tr>`;
    });
    tableHtml += '</tbody><tfoot>';
    tableHtml += `<tr><td colspan="3"></td><td class="text-right"><strong>Total de Vendas:</strong></td><td class="text-right"><strong>${salesReportData.length}</strong></td></tr>`;
    tableHtml += `<tr><td colspan="3"></td><td class="text-right"><strong>Valor Total Vendido:</strong></td><td class="text-right"><strong>R$ ${salesReportData.reduce((sum, sale) => sum + sale.totalAmount, 0).toFixed(2).replace('.', ',')}</strong></td></tr>`;
    tableHtml += '</tfoot></table>';
    printReport("Relatório de Vendas", period, tableHtml);
  };

  const handlePrintOsReport = () => {
    if (!osReportData) return;
    const period = `Período: ${osStartDate ? format(osStartDate, "dd/MM/yyyy", { locale: ptBR }) : 'N/A'} - ${osEndDate ? format(osEndDate, "dd/MM/yyyy", { locale: ptBR }) : 'N/A'} | Status: ${osStatusFilter}`;
    let tableHtml = '<table class="report-table"><thead><tr><th>Nº OS</th><th>Cliente</th><th>Aparelho</th><th>Status</th><th>Abertura</th><th class="text-right">Valor (R$)</th></tr></thead><tbody>';
    osReportData.forEach(os => {
        tableHtml += `<tr>
            <td>${os.osNumber}</td>
            <td>${os.clientName}</td>
            <td>${os.deviceBrandModel}</td>
            <td>${os.status}</td>
            <td>${format(new Date(os.openingDate as Date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</td>
            <td class="text-right">${os.grandTotalValue.toFixed(2).replace('.', ',')}</td>
        </tr>`;
    });
    tableHtml += '</tbody><tfoot>';
    tableHtml += `<tr><td colspan="4"></td><td class="text-right"><strong>Total de OS:</strong></td><td class="text-right"><strong>${osReportData.length}</strong></td></tr>`;
    tableHtml += `<tr><td colspan="4"></td><td class="text-right"><strong>Valor Total OS:</strong></td><td class="text-right"><strong>R$ ${osReportData.reduce((sum, os) => sum + os.grandTotalValue, 0).toFixed(2).replace('.', ',')}</strong></td></tr>`;
    tableHtml += '</tfoot></table>';
    printReport("Relatório de Ordens de Serviço", period, tableHtml);
  };

  const handlePrintFinancialReport = () => {
    if (!financialReportData) return;
    const period = `Período: ${financeStartDate ? format(financeStartDate, "dd/MM/yyyy", { locale: ptBR }) : 'N/A'} - ${financeEndDate ? format(financeEndDate, "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}`;
    let contentHtml = '<div class="summary-section" style="font-size: 11pt;">';
    contentHtml += `<div><span>Total Receita de Vendas:</span> <span style="font-weight:bold;">R$ ${financialReportData.salesTotal.toFixed(2).replace('.', ',')}</span></div>`;
    contentHtml += `<div><span>Total Receita de OS (Concluídas/Entregues):</span> <span style="font-weight:bold;">R$ ${financialReportData.osTotal.toFixed(2).replace('.', ',')}</span></div>`;
    contentHtml += '<hr style="margin: 10px 0; border-color: #ccc;"/>';
    contentHtml += `<div class="grand-total" style="font-size: 13pt;"><strong>Receita Bruta Total no Período:</strong> <strong style="color: hsl(var(--primary));">R$ ${financialReportData.grandTotal.toFixed(2).replace('.', ',')}</strong></div>`;
    contentHtml += '</div>';
    printReport("Relatório Financeiro (Simplificado)", period, contentHtml);
  };
  
  const handlePrintInventoryReport = () => {
    if (!inventoryReportData) return;
    let tableHtml = '<table class="report-table"><thead><tr><th>Produto</th><th>SKU</th><th class="text-right">Preço (R$)</th><th class="text-center">Estoque</th></tr></thead><tbody>';
    inventoryReportData.forEach(product => {
        tableHtml += `<tr>
            <td>${product.name}</td>
            <td>${product.sku}</td>
            <td class="text-right">${product.price.toFixed(2).replace('.', ',')}</td>
            <td class="text-center ${product.stock === 0 ? 'text-destructive' : (product.stock < 5 ? 'text-orange-600' : '')}">
                ${product.stock}
                ${product.stock === 0 ? ' (Zerado)' : (product.stock < 5 ? ' (Baixo)' : '')}
            </td>
        </tr>`;
    });
    tableHtml += '</tbody></table>';
    printReport("Relatório de Inventário", "Lista de todos os produtos", tableHtml);
  };


  const renderDateRangePicker = (
    startDate: Date | undefined, 
    setStartDate: (date: Date | undefined) => void, 
    endDate: Date | undefined, 
    setEndDate: (date: Date | undefined) => void,
    prefix: string
  ) => (
    <div className="flex flex-col sm:flex-row gap-2 items-center">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={`${prefix}-start-date`}
            variant={"outline"}
            className={cn(
              "w-full sm:w-[200px] justify-start text-left font-normal",
              !startDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR}) : <span>Data Início</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={setStartDate}
            initialFocus
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
      <span className="hidden sm:inline">-</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={`${prefix}-end-date`}
            variant={"outline"}
            className={cn(
              "w-full sm:w-[200px] justify-start text-left font-normal",
              !endDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR}) : <span>Data Fim</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={setEndDate}
            initialFocus
            locale={ptBR}
            disabled={(date) => startDate ? date < startDate : false}
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-headline text-3xl font-semibold">Relatórios</h1>
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Relatórios Gerenciais</AlertTitle>
        <AlertDescription>
          Utilize os filtros abaixo para gerar relatórios detalhados sobre suas operações.
        </AlertDescription>
      </Alert>

      {/* Sales Report Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-grow">
                <BarChartHorizontalBig className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                <CardTitle className="text-lg">Relatório de Vendas</CardTitle>
                <CardDescription className="text-xs">Analise suas vendas por período.</CardDescription>
                </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Button onClick={handleGenerateSalesReport} disabled={isGeneratingSalesReport || !salesStartDate || !salesEndDate} className="flex-1 sm:flex-initial">
                    {isGeneratingSalesReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Gerar
                </Button>
                <Button onClick={handlePrintSalesReport} disabled={!salesReportData || salesReportData.length === 0} variant="outline" className="flex-1 sm:flex-initial">
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                </Button>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderDateRangePicker(salesStartDate, setSalesStartDate, salesEndDate, setSalesEndDate, "sales")}
          {salesReportError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /> <AlertTitle>Erro</AlertTitle><AlertDescription>{salesReportError}</AlertDescription></Alert>}
          {isGeneratingSalesReport && <div className="flex justify-center items-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2">Gerando relatório de vendas...</p></div>}
          {salesReportData && (
            <div className="mt-4">
              {salesReportData.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhuma venda encontrada para o período selecionado.</p>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="hidden sm:table-cell text-center">Itens</TableHead>
                          <TableHead className="hidden md:table-cell">Pagamento</TableHead>
                          <TableHead className="text-right">Valor Total (R$)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesReportData.map(sale => (
                          <TableRow key={sale.id}>
                            <TableCell>{format(new Date(sale.createdAt as Date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                            <TableCell>{sale.clientName || "Não informado"}</TableCell>
                            <TableCell className="hidden sm:table-cell text-center">{sale.items.reduce((acc, item) => acc + item.quantity, 0)}</TableCell>
                            <TableCell className="hidden md:table-cell">{sale.paymentMethod || "N/D"}</TableCell>
                            <TableCell className="text-right">{sale.totalAmount.toFixed(2).replace('.', ',')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableSummaryFooter>
                        <TableRow>
                            <TableCell colSpan={3} className="hidden md:table-cell"></TableCell>
                            <TableCell colSpan={2} className="md:hidden text-right font-semibold">Resumo:</TableCell>
                            <TableCell className="hidden md:table-cell text-right font-semibold">Total de Vendas:</TableCell>
                            <TableCell className="text-right font-bold">{salesReportData.length}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={3} className="hidden md:table-cell"></TableCell>
                            <TableCell colSpan={2} className="md:hidden text-right font-semibold">Valor Total:</TableCell>
                            <TableCell className="hidden md:table-cell text-right font-semibold">Valor Total Vendido:</TableCell>
                            <TableCell className="text-right font-bold">R$ {salesReportData.reduce((sum, sale) => sum + sale.totalAmount, 0).toFixed(2).replace('.', ',')}</TableCell>
                        </TableRow>
                      </TableSummaryFooter>
                    </Table>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Orders Report Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-grow">
                <History className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                <CardTitle className="text-lg">Relatório de Ordens de Serviço</CardTitle>
                <CardDescription className="text-xs">Filtre OS por período e status.</CardDescription>
                </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Button onClick={handleGenerateOsReport} disabled={isGeneratingOsReport} className="flex-1 sm:flex-initial">
                    {isGeneratingOsReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Gerar
                </Button>
                <Button onClick={handlePrintOsReport} disabled={!osReportData || osReportData.length === 0} variant="outline" className="flex-1 sm:flex-initial">
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                </Button>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            {renderDateRangePicker(osStartDate, setOsStartDate, osEndDate, setOsEndDate, "os")}
            <Select value={osStatusFilter} onValueChange={(value: ServiceOrderStatus | "Todos") => setOsStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Status da OS" />
                </SelectTrigger>
                <SelectContent>
                    {serviceOrderStatusesForFilter.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          {osReportError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /> <AlertTitle>Erro</AlertTitle><AlertDescription>{osReportError}</AlertDescription></Alert>}
          {isGeneratingOsReport && <div className="flex justify-center items-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2">Gerando relatório de OS...</p></div>}
          {osReportData && (
             <div className="mt-4">
              {osReportData.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhuma Ordem de Serviço encontrada para os filtros selecionados.</p>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nº OS</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="hidden md:table-cell">Aparelho</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden sm:table-cell">Abertura</TableHead>
                          <TableHead className="text-right">Valor (R$)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {osReportData.map(os => (
                          <TableRow key={os.id}>
                            <TableCell>{os.osNumber}</TableCell>
                            <TableCell>{os.clientName}</TableCell>
                            <TableCell className="hidden md:table-cell">{os.deviceBrandModel}</TableCell>
                            <TableCell>{os.status}</TableCell>
                            <TableCell className="hidden sm:table-cell">{format(new Date(os.openingDate as Date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                            <TableCell className="text-right">{os.grandTotalValue.toFixed(2).replace('.', ',')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableSummaryFooter>
                        <TableRow>
                            <TableCell colSpan={4} className="hidden sm:table-cell"></TableCell>
                            <TableCell colSpan={1} className="sm:hidden text-right font-semibold">Total OS:</TableCell>
                            <TableCell className="hidden sm:table-cell text-right font-semibold">Total de OS:</TableCell>
                            <TableCell className="text-right font-bold">{osReportData.length}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={4} className="hidden sm:table-cell"></TableCell>
                            <TableCell colSpan={1} className="sm:hidden text-right font-semibold">Valor Total:</TableCell>
                            <TableCell className="hidden sm:table-cell text-right font-semibold">Valor Total OS:</TableCell>
                            <TableCell className="text-right font-bold">R$ {osReportData.reduce((sum, os) => sum + os.grandTotalValue, 0).toFixed(2).replace('.', ',')}</TableCell>
                        </TableRow>
                      </TableSummaryFooter>
                    </Table>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Financial Report Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-grow">
                <PieChart className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                <CardTitle className="text-lg">Relatório Financeiro (Simplificado)</CardTitle>
                <CardDescription className="text-xs">Receita bruta de vendas e OS concluídas/entregues.</CardDescription>
                </div>
            </div>
             <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Button onClick={handleGenerateFinancialReport} disabled={isGeneratingFinancialReport || !financeStartDate || !financeEndDate} className="flex-1 sm:flex-initial">
                    {isGeneratingFinancialReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Gerar
                </Button>
                <Button onClick={handlePrintFinancialReport} disabled={!financialReportData} variant="outline" className="flex-1 sm:flex-initial">
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                </Button>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderDateRangePicker(financeStartDate, setFinanceStartDate, financeEndDate, setFinanceEndDate, "finance")}
          {financialReportError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /> <AlertTitle>Erro</AlertTitle><AlertDescription>{financialReportError}</AlertDescription></Alert>}
          {isGeneratingFinancialReport && <div className="flex justify-center items-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2">Gerando relatório financeiro...</p></div>}
          {financialReportData && (
            <div className="mt-4 space-y-3 p-4 border rounded-md">
                <div className="flex justify-between"><span>Total Receita de Vendas:</span> <span className="font-medium">R$ {financialReportData.salesTotal.toFixed(2).replace('.', ',')}</span></div>
                <div className="flex justify-between"><span>Total Receita de OS (Concluídas/Entregues):</span> <span className="font-medium">R$ {financialReportData.osTotal.toFixed(2).replace('.', ',')}</span></div>
                <hr className="my-2"/>
                <div className="flex justify-between text-lg"><strong>Receita Bruta Total no Período:</strong> <strong className="text-primary">R$ {financialReportData.grandTotal.toFixed(2).replace('.', ',')}</strong></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory Report Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-grow">
                <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                <CardTitle className="text-lg">Relatório de Inventário</CardTitle>
                <CardDescription className="text-xs">Lista de produtos e seus estoques.</CardDescription>
                </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Button onClick={handleGenerateInventoryReport} disabled={isGeneratingInventoryReport} className="flex-1 sm:flex-initial">
                    {isGeneratingInventoryReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Gerar
                </Button>
                <Button onClick={handlePrintInventoryReport} disabled={!inventoryReportData || inventoryReportData.length === 0} variant="outline" className="flex-1 sm:flex-initial">
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                </Button>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {inventoryReportError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /> <AlertTitle>Erro</AlertTitle><AlertDescription>{inventoryReportError}</AlertDescription></Alert>}
          {isGeneratingInventoryReport && <div className="flex justify-center items-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2">Gerando relatório de inventário...</p></div>}
          {inventoryReportData && (
             <div className="mt-4">
              {inventoryReportData.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhum produto encontrado.</p>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">Preço (R$)</TableHead>
                          <TableHead className="text-center">Estoque</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryReportData.map(product => (
                          <TableRow key={product.id}>
                            <TableCell>{product.name}</TableCell>
                            <TableCell>{product.sku}</TableCell>
                            <TableCell className="text-right hidden sm:table-cell">{product.price.toFixed(2).replace('.', ',')}</TableCell>
                            <TableCell className={`text-center ${product.stock === 0 ? 'text-destructive font-semibold' : (product.stock < 5 ? 'text-orange-600 font-medium' : '')}`}>
                                {product.stock}
                                {product.stock === 0 && <span className="text-xs ml-1">(Zerado)</span>}
                                {product.stock > 0 && product.stock < 5 && <span className="text-xs ml-1">(Baixo)</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
    

    