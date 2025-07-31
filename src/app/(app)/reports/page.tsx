
"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader2, Printer, Calendar as CalendarIcon, FileText, AlertCircle, ShoppingCart, Wrench, BarChart, DollarSign } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { getSalesByDateRange } from '@/services/salesService';
import type { Sale, PaymentMethod } from '@/services/salesService';
import { getServiceOrdersByDateRangeAndStatus } from '@/services/serviceOrderService';
import type { ServiceOrder, ServiceOrderStatus } from '@/services/serviceOrderService';
import { getExpensesByDateRange } from '@/services/expenseService';
import type { Expense } from '@/services/expenseService';
import { getProducts } from '@/services/productService';
import type { Product } from '@/services/productService';
import { getUsers } from '@/services/userService';
import type { User } from '@/services/userService';
import { getEstablishmentSettings } from '@/services/settingsService';

type ReportType = 'sales' | 'os' | 'financial' | 'inventory';

const reportTypes: { value: ReportType, label: string, icon: React.ElementType }[] = [
    { value: 'sales', label: 'Relatório de Vendas', icon: ShoppingCart },
    { value: 'os', label: 'Relatório de O.S.', icon: Wrench },
    { value: 'financial', label: 'Relatório Financeiro', icon: DollarSign },
    { value: 'inventory', label: 'Relatório de Estoque', icon: BarChart },
];

const osStatuses: (ServiceOrderStatus | "Todos")[] = ["Todos", "Aberta", "Em andamento", "Aguardando peça", "Concluída", "Entregue", "Cancelada"];

export default function ReportsPage() {
    const [reportType, setReportType] = useState<ReportType>('sales');
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'Todos'>('Todos');
    const [osStatus, setOsStatus] = useState<ServiceOrderStatus | 'Todos'>('Todos');
    const [osTechnician, setOsTechnician] = useState<string | 'Todos'>('Todos');
    const [inventoryStatus, setInventoryStatus] = useState<'all' | 'low' | 'zero'>('all');
    
    const [reportData, setReportData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: products } = useQuery({ queryKey: ['products'], queryFn: getProducts });
    const { data: users } = useQuery({ queryKey: ['users'], queryFn: getUsers });
    const { data: establishmentSettings } = useQuery({ queryKey: ['establishmentSettings'], queryFn: getEstablishmentSettings });

    const handleGenerateReport = async () => {
        setIsLoading(true);
        setError(null);
        setReportData(null);
        
        if (!dateRange?.from || !dateRange?.to) {
            setError("Por favor, selecione um período de datas.");
            setIsLoading(false);
            return;
        }

        try {
            let data;
            if (reportType === 'sales') {
                const sales = await getSalesByDateRange(dateRange.from, dateRange.to);
                data = paymentMethod === 'Todos' ? sales : sales.filter(s => s.paymentMethod === paymentMethod);
            } else if (reportType === 'os') {
                let orders = await getServiceOrdersByDateRangeAndStatus(dateRange.from, dateRange.to, osStatus);
                if (osTechnician !== 'Todos') {
                    orders = orders.filter(o => o.responsibleTechnicianName === osTechnician);
                }
                data = orders;
            } else if (reportType === 'financial') {
                const sales = await getSalesByDateRange(dateRange.from, dateRange.to);
                const expenses = await getExpensesByDateRange(dateRange.from, dateRange.to);
                data = { sales: sales.filter(s => s.status === 'Concluída'), expenses: expenses.filter(e => e.status === 'Pago') };
            } else if (reportType === 'inventory') {
                let filteredProducts = products || [];
                if (inventoryStatus === 'low') {
                    filteredProducts = filteredProducts.filter(p => p.stock > 0 && p.stock <= 5); // Define low stock as <= 5
                } else if (inventoryStatus === 'zero') {
                    filteredProducts = filteredProducts.filter(p => p.stock === 0);
                }
                data = filteredProducts;
            }
            setReportData(data);
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro ao gerar o relatório.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const printReport = () => {
        if (!reportData) return;

        const dateFrom = dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : 'N/A';
        const dateTo = dateRange?.to ? format(dateRange.to, 'dd/MM/yyyy') : 'N/A';
        const reportTitle = reportTypes.find(rt => rt.value === reportType)?.label || "Relatório";
        
        const printContent = `
            <html>
                <head>
                    <title>${reportTitle}</title>
                    <style>
                        body { font-family: Arial, sans-serif; font-size: 10pt; }
                        .print-container { width: 95%; margin: 0 auto; }
                        .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                        .header img { max-width: 150px; margin-bottom: 5px; }
                        h1, h2, h3 { margin: 5px 0; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        tfoot td { font-weight: bold; }
                        .no-print { display: none; }
                        .summary { margin-top: 20px; padding: 10px; border-top: 2px solid #333; }
                        .summary p { margin: 5px 0; }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        <div class="header">
                          ${establishmentSettings?.logoUrl ? `<img src="/logoimpressao.png" alt="Logo">` : ''}
                          ${establishmentSettings?.businessName ? `<h2>${establishmentSettings.businessName}</h2>` : ''}
                          <p>${reportTitle}</p>
                          <p>Período: ${dateFrom} a ${dateTo}</p>
                        </div>
                        <div id="report-content-to-print"></div>
                         <div class="footer" style="text-align: center; margin-top: 20px; font-size: 9pt;">
                            <p>Relatório gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
                        </div>
                    </div>
                </body>
            </html>
        `;

        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write(printContent);
            
            const contentElement = document.getElementById('report-content-area');
            if(contentElement){
                printWindow.document.getElementById('report-content-to-print')!.innerHTML = contentElement.innerHTML;
            }

            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };
    
    const renderFilters = () => {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <div>
                    <label className="text-sm font-medium">Tipo de Relatório</label>
                    <Select onValueChange={(v: ReportType) => setReportType(v)} defaultValue={reportType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {reportTypes.map(rt => <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div>
                 <div>
                    <label className="text-sm font-medium">Período</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Escolha um período</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={ptBR}/>
                        </PopoverContent>
                    </Popover>
                 </div>

                {reportType === 'sales' && (
                    <div>
                        <label className="text-sm font-medium">Forma de Pagamento</label>
                        <Select onValueChange={(v: PaymentMethod | 'Todos') => setPaymentMethod(v)} defaultValue={paymentMethod}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Todos">Todos</SelectItem>
                                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                                <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                                <SelectItem value="PIX">PIX</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
                 {reportType === 'os' && (
                    <>
                    <div>
                        <label className="text-sm font-medium">Status da O.S.</label>
                        <Select onValueChange={(v: ServiceOrderStatus | 'Todos') => setOsStatus(v)} defaultValue={osStatus}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {osStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div>
                        <label className="text-sm font-medium">Técnico Responsável</label>
                        <Select onValueChange={(v: string | 'Todos') => setOsTechnician(v)} defaultValue={osTechnician}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Todos">Todos</SelectItem>
                                {users?.map(u => <SelectItem key={u.id!} value={u.name}>{u.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    </>
                )}
                 {reportType === 'inventory' && (
                    <div>
                        <label className="text-sm font-medium">Status do Estoque</label>
                        <Select onValueChange={(v: 'all' | 'low' | 'zero') => setInventoryStatus(v)} defaultValue={inventoryStatus}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os produtos</SelectItem>
                                <SelectItem value="low">Estoque baixo (<= 5)</SelectItem>
                                <SelectItem value="zero">Estoque zerado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                 )}
            </div>
        )
    };
    
    const renderReportContent = () => {
        if (isLoading) return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
        if (error) return <div className="text-destructive text-center py-10"><AlertCircle className="mx-auto h-8 w-8 mb-2"/>{error}</div>;
        if (!reportData) return <div className="text-center text-muted-foreground py-10"><FileText className="mx-auto h-8 w-8 mb-2"/>Nenhum relatório gerado. Selecione os filtros e clique em "Gerar Relatório".</div>;
        
        let totalSales = 0;
        let totalExpenses = 0;

        switch(reportType) {
            case 'sales':
                if (!reportData.length) return <p className="text-center py-4">Nenhuma venda encontrada para o período e filtros selecionados.</p>;
                totalSales = reportData.reduce((sum: number, sale: Sale) => sum + sale.totalAmount, 0);
                return (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nº Venda</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Pagamento</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.map((sale: Sale) => (
                                <TableRow key={sale.id}>
                                    <TableCell>#{sale.saleNumber}</TableCell>
                                    <TableCell>{format(new Date(sale.createdAt), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{sale.clientName || 'N/A'}</TableCell>
                                    <TableCell>{sale.paymentMethod}</TableCell>
                                    <TableCell className="text-right">{sale.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={4}>Total de Vendas</TableCell>
                                <TableCell className="text-right">{totalSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                );
            
            case 'os':
                if (!reportData.length) return <p className="text-center py-4">Nenhuma Ordem de Serviço encontrada para os filtros selecionados.</p>;
                const totalOsValue = reportData.reduce((sum: number, os: ServiceOrder) => sum + os.grandTotalValue, 0);
                 return (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nº O.S.</TableHead>
                                <TableHead>Abertura</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Técnico</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Valor Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.map((os: ServiceOrder) => (
                                <TableRow key={os.id}>
                                    <TableCell>#{os.osNumber}</TableCell>
                                    <TableCell>{format(new Date(os.openingDate as Date), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{os.clientName}</TableCell>
                                    <TableCell>{os.responsibleTechnicianName || 'N/A'}</TableCell>
                                    <TableCell>{os.status}</TableCell>
                                    <TableCell className="text-right">{os.grandTotalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                         <TableFooter>
                            <TableRow>
                                <TableCell colSpan={5}>Valor Total das O.S.</TableCell>
                                <TableCell className="text-right">{totalOsValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                );
            
            case 'financial':
                totalSales = reportData.sales.reduce((sum: number, sale: Sale) => sum + sale.totalAmount, 0);
                totalExpenses = reportData.expenses.reduce((sum: number, expense: Expense) => sum + expense.amount, 0);
                const grossProfit = totalSales - totalExpenses;
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Resumo Financeiro</h3>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total de Entradas (Vendas)</CardTitle></CardHeader>
                                    <CardContent><p className="text-2xl font-bold text-green-600">{totalSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total de Saídas (Despesas)</CardTitle></CardHeader>
                                    <CardContent><p className="text-2xl font-bold text-red-600">{totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Lucro Bruto</CardTitle></CardHeader>
                                    <CardContent><p className={`text-2xl font-bold ${grossProfit >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>{grossProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></CardContent>
                                </Card>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Detalhes das Vendas</h3>
                            {reportData.sales.length > 0 ? <Table>{/* Sales Table */}</Table> : <p>Nenhuma venda concluída no período.</p>}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Detalhes das Despesas</h3>
                             {reportData.expenses.length > 0 ? <Table>{/* Expenses Table */}</Table> : <p>Nenhuma despesa paga no período.</p>}
                        </div>
                    </div>
                );

             case 'inventory':
                 if (!reportData.length) return <p className="text-center py-4">Nenhum produto encontrado para o status de estoque selecionado.</p>;
                 return (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produto</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead className="text-center">Estoque Atual</TableHead>
                                <TableHead className="text-right">Preço de Venda</TableHead>
                                <TableHead className="text-right">Valor Total em Estoque</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.map((p: Product) => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.name}</TableCell>
                                    <TableCell>{p.sku}</TableCell>
                                    <TableCell className="text-center">{p.stock}</TableCell>
                                    <TableCell className="text-right">{p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    <TableCell className="text-right">{(p.stock * p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                );

            default:
                return null;
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="font-headline text-3xl font-semibold text-accent">Relatórios</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Filtros do Relatório</CardTitle>
                    <CardDescription>Selecione os parâmetros para gerar seu relatório personalizado.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {renderFilters()}
                    <Button onClick={handleGenerateReport} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Gerar Relatório
                    </Button>
                </CardContent>
            </Card>

            {reportData && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                       <div>
                         <CardTitle>{reportTypes.find(rt => rt.value === reportType)?.label}</CardTitle>
                         <CardDescription>
                            Período: {dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : 'N/A'} a {dateRange?.to ? format(dateRange.to, 'dd/MM/yyyy') : 'N/A'}
                         </CardDescription>
                       </div>
                       <Button variant="outline" onClick={printReport}>
                           <Printer className="mr-2 h-4 w-4" />
                           Imprimir
                       </Button>
                    </CardHeader>
                    <CardContent id="report-content-area">
                        {renderReportContent()}
                    </CardContent>
                </Card>
            )}

            {(!reportData && !isLoading && !error) && (
                 <Card className="flex flex-col items-center justify-center py-10">
                    <CardContent className="text-center text-muted-foreground">
                        <FileText className="mx-auto h-12 w-12 mb-4"/>
                        <p className="font-semibold">Nenhum relatório gerado</p>
                        <p className="text-sm">Selecione os filtros acima e clique em "Gerar Relatório" para visualizar os dados.</p>
                    </CardContent>
                 </Card>
            )}
             {error && (
                 <Card className="flex flex-col items-center justify-center py-10 bg-destructive/10 border-destructive">
                    <CardContent className="text-center text-destructive">
                        <AlertCircle className="mx-auto h-12 w-12 mb-4"/>
                        <p className="font-semibold">Ocorreu um Erro</p>
                        <p className="text-sm">{error}</p>
                    </CardContent>
                 </Card>
            )}
        </div>
    );
}
