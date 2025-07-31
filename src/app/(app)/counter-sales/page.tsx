
"use client";

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, getProductBySku } from '@/services/productService';
import { getClients } from '@/services/clientService';
import { addSale, getSales, cancelSale, type Sale, type CartItemInput, type PaymentMethod, type SaleStatus } from '@/services/salesService';
import type { Product } from '@/lib/schemas/product';
import type { Client } from '@/lib/schemas/client';
import { useToast } from '@/hooks/use-toast';
import { getEstablishmentSettings } from '@/services/settingsService';

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, PlusCircle, Trash2, Search, X, Printer, ShoppingCart, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CounterSalesPage() {
  const [cart, setCart] = useState<CartItemInput[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isConfirmingSale, setIsConfirmingSale] = useState(false);
  const [isSaleCompleted, setIsSaleCompleted] = useState(false);
  const [completedSaleDetails, setCompletedSaleDetails] = useState<{saleId: string, saleNumber: number} | null>(null);

  const [skuSearch, setSkuSearch] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  
  const [isCancellationDialogOpen, setIsCancellationDialogOpen] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");


  const queryClient = useQueryClient();
  const { toast } = useToast();
  const skuInputRef = useRef<HTMLInputElement>(null);

  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[], Error>({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const { data: clients } = useQuery<Client[], Error>({
    queryKey: ['clients'],
    queryFn: getClients,
  });
  
  const { data: salesHistory, isLoading: isLoadingSalesHistory } = useQuery<Sale[], Error>({
    queryKey: ['salesHistory'],
    queryFn: getSales,
  });

  const { data: establishmentSettings } = useQuery({
    queryKey: ['establishmentSettings'],
    queryFn: getEstablishmentSettings
  });

  const addSaleMutation = useMutation({
    mutationFn: addSale,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salesHistory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // To update stock
      toast({ title: `Venda Nº ${data.saleNumber} Concluída!`, description: "A venda foi registrada com sucesso." });
      setIsConfirmingSale(false);
      setIsSaleCompleted(true);
      setCompletedSaleDetails(data);
    },
    onError: (err) => {
      toast({ title: "Erro ao Concluir Venda", description: err.message, variant: "destructive" });
      setIsConfirmingSale(false);
    },
  });

  const cancelSaleMutation = useMutation({
    mutationFn: ({ saleId, reason }: { saleId: string; reason: string }) => cancelSale(saleId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesHistory'] });
      toast({ title: "Venda Cancelada", description: "A venda foi cancelada com sucesso." });
      setIsCancellationDialogOpen(false);
      setSaleToCancel(null);
      setCancellationReason("");
    },
    onError: (err) => {
      toast({ title: "Erro ao Cancelar", description: err.message, variant: "destructive" });
    },
  });

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    const existingItem = cart.find(item => item.name === product.name);
    if (existingItem) {
      setCart(cart.map(item =>
        item.name === product.name
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setCart([...cart, { name: product.name, quantity, price: product.price }]);
    }
  };

  const handleRemoveFromCart = (productName: string) => {
    setCart(cart.filter(item => item.name !== productName));
  };

  const handleUpdateQuantity = (productName: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productName);
    } else {
      setCart(cart.map(item =>
        item.name === productName ? { ...item, quantity } : item
      ));
    }
  };

  const handleSkuSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuSearch.trim()) return;
    try {
      const product = await getProductBySku(skuSearch.trim());
      if (product) {
        handleAddToCart(product);
        setSkuSearch('');
      } else {
        toast({ title: "Produto não encontrado", description: `Nenhum produto com o SKU "${skuSearch}" foi encontrado.`, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Erro na Busca", description: error.message, variant: "destructive" });
    }
  };
  
  const filteredProducts = products?.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()));
  const totalAmount = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleConfirmSale = () => {
    if (cart.length === 0) {
      toast({ title: "Carrinho Vazio", description: "Adicione produtos ao carrinho para continuar.", variant: "destructive" });
      return;
    }
    if (!paymentMethod) {
      toast({ title: "Forma de Pagamento", description: "Selecione uma forma de pagamento.", variant: "destructive" });
      return;
    }
    const clientName = selectedClient ? clients?.find(c => c.id === selectedClient)?.name ?? null : null;
    
    addSaleMutation.mutate({
      clientName,
      items: cart,
      totalAmount,
      paymentMethod,
    });
  };

  const handleNewSale = () => {
    setCart([]);
    setSelectedClient(null);
    setPaymentMethod(null);
    setIsSaleCompleted(false);
    setCompletedSaleDetails(null);
    skuInputRef.current?.focus();
  };
  
  const handlePrintSaleReceipt = (sale: Sale | null) => {
    if (!sale) return;

    const printContent = `
      <style>
        @media print {
          @page { margin: 0.5cm; }
          body { font-family: 'Arial', sans-serif; font-size: 10pt; }
          .receipt-container { width: 100%; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #ccc; padding-bottom: 10px;}
          .header img { max-width: 150px; margin-bottom: 5px; }
          .header h2 { margin: 0; font-size: 1.2em; }
          .header p { margin: 2px 0; }
          h3 { font-size: 1.1em; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { text-align: left; padding: 6px; }
          .item-col { width: 50%; }
          .qty-col, .price-col, .total-col { width: 15%; text-align: right; }
          th { border-bottom: 1px solid #000; }
          .totals-table { width: 50%; margin-left: auto; margin-top: 15px; }
          .totals-table td { text-align: right; }
          .footer { text-align: center; margin-top: 20px; font-size: 9pt; }
        }
      </style>
      <div class="receipt-container">
        <div class="header">
          ${establishmentSettings?.logoUrl ? `<img src="/logoimpressao.png" alt="Logo">` : ''}
          ${establishmentSettings?.businessName ? `<h2>${establishmentSettings.businessName}</h2>` : ''}
          ${establishmentSettings?.businessAddress ? `<p>${establishmentSettings.businessAddress}</p>` : ''}
          ${establishmentSettings?.businessCnpj ? `<p>CNPJ: ${establishmentSettings.businessCnpj}</p>` : ''}
          ${establishmentSettings?.businessPhone ? `<p>Telefone: ${establishmentSettings.businessPhone}</p>` : ''}
        </div>
        <h3>Comprovante de Venda - Nº ${sale.saleNumber}</h3>
        <p><strong>Data:</strong> ${format(new Date(sale.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        ${sale.clientName ? `<p><strong>Cliente:</strong> ${sale.clientName}</p>` : ''}
        
        <h3>Itens</h3>
        <table>
          <thead>
            <tr>
              <th class="item-col">Produto</th>
              <th class="qty-col">Qtd.</th>
              <th class="price-col">Preço Un.</th>
              <th class="total-col">Total</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td style="text-align: right;">${item.quantity}</td>
                <td style="text-align: right;">${item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td style="text-align: right;">${(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td><strong>Total dos Itens:</strong></td>
            <td>${sale.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
          </tr>
          <tr>
            <td><strong>Forma de Pagamento:</strong></td>
            <td>${sale.paymentMethod}</td>
          </tr>
          <tr>
            <td><strong>Total Pago:</strong></td>
            <td><strong>${sale.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></td>
          </tr>
        </table>
        
        <div class="footer">
          <p>Obrigado pela sua preferência!</p>
          <p>Sistema DonPhone</p>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      // Delay print command to ensure content is loaded
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const getBadgeVariant = (status: SaleStatus) => {
    switch (status) {
      case 'Concluída': return 'default';
      case 'Cancelada': return 'destructive';
      default: return 'secondary';
    }
  };

  useEffect(() => {
    skuInputRef.current?.focus();
  }, []);

  if (isSaleCompleted) {
    const sale = salesHistory?.find(s => s.id === completedSaleDetails?.saleId);
    return (
      <div className="flex justify-center items-center h-full">
        <Card className="w-full max-w-lg text-center animate-in fade-in-50">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Venda Nº {completedSaleDetails?.saleNumber} Realizada com Sucesso!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">O que você gostaria de fazer agora?</p>
            <div className="flex justify-center gap-4">
              <Button onClick={() => sale && handlePrintSaleReceipt(sale)}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Comprovante
              </Button>
              <Button variant="secondary" onClick={handleNewSale}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Iniciar Nova Venda
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
       <h1 className="font-headline text-3xl font-semibold text-accent">Vendas no Balcão</h1>
       <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
            <Tabs defaultValue="products">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="products">Lista de Produtos</TabsTrigger>
                    <TabsTrigger value="history">Histórico de Vendas</TabsTrigger>
                </TabsList>
                <TabsContent value="products">
                    <Card>
                        <CardHeader>
                        <CardTitle>Catálogo de Produtos</CardTitle>
                        <div className="flex gap-2 pt-2">
                            <form onSubmit={handleSkuSearch} className="flex-1 flex gap-2">
                                <Input ref={skuInputRef} value={skuSearch} onChange={(e) => setSkuSearch(e.target.value)} placeholder="Digitar SKU do produto..." />
                                <Button type="submit" size="icon" aria-label="Buscar SKU"><Search /></Button>
                            </form>
                             <Input 
                                value={productSearchTerm} 
                                onChange={(e) => setProductSearchTerm(e.target.value)} 
                                placeholder="Buscar produto por nome..."
                                className="w-1/2"
                             />
                        </div>
                        </CardHeader>
                        <CardContent>
                        <ScrollArea className="h-[450px]">
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>Produto</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead className="text-right">Preço</TableHead>
                                    <TableHead className="text-right">Ação</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {isLoadingProducts ? (
                                    <TableRow><TableCell colSpan={4} className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : (
                                    filteredProducts?.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>{p.sku}</TableCell>
                                        <TableCell className="text-right">{p.price.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</TableCell>
                                        <TableCell className="text-right">
                                        <Button size="sm" onClick={() => handleAddToCart(p)}>Adicionar</Button>
                                        </TableCell>
                                    </TableRow>
                                    ))
                                )}
                                </TableBody>
                            </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="history">
                     <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Vendas Recentes</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <ScrollArea className="h-[520px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nº</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                     {isLoadingSalesHistory ? (
                                        <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                    ) : (
                                        salesHistory?.map(sale => (
                                            <TableRow key={sale.id}>
                                                <TableCell className="font-bold">#{sale.saleNumber}</TableCell>
                                                <TableCell>{format(new Date(sale.createdAt), "dd/MM/yy HH:mm")}</TableCell>
                                                <TableCell>{sale.clientName || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <Badge variant={getBadgeVariant(sale.status)}>{sale.status}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">{sale.totalAmount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button variant="outline" size="icon" onClick={() => handlePrintSaleReceipt(sale)} className="h-8 w-8"><Printer className="h-4 w-4"/></Button>
                                                    {sale.status === 'Concluída' && (
                                                        <Button variant="destructive" size="icon" onClick={() => { setSaleToCancel(sale); setIsCancellationDialogOpen(true); }} className="h-8 w-8"><Ban className="h-4 w-4"/></Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                           </ScrollArea>
                        </CardContent>
                     </Card>
                </TabsContent>
            </Tabs>
        </div>
        <div className="lg:col-span-1">
            <Card className="sticky top-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShoppingCart /> Carrinho de Compras</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[250px] pr-4">
                {cart.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                    <p>O carrinho está vazio.</p>
                    <p className="text-sm">Adicione produtos para começar a venda.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                    {cart.map(item => (
                        <div key={item.name} className="flex items-center gap-2">
                            <div className="flex-1">
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-muted-foreground">{item.price.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                            </div>
                            <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleUpdateQuantity(item.name, parseInt(e.target.value))}
                                className="w-16 h-8 text-center"
                                min="0"
                            />
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveFromCart(item.name)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    ))}
                    </div>
                )}
                </ScrollArea>
                <div className="mt-4 space-y-4">
                    <Select onValueChange={(value) => setSelectedClient(value)} value={selectedClient || ""}>
                        <SelectTrigger><SelectValue placeholder="Selecionar Cliente (Opcional)" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Nenhum / Consumidor Final</SelectItem>
                            {clients?.map(c => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select onValueChange={(value: PaymentMethod) => setPaymentMethod(value)} value={paymentMethod || ""}>
                        <SelectTrigger><SelectValue placeholder="Forma de Pagamento" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                            <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                            <SelectItem value="PIX">PIX</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                 <div className="flex justify-between w-full text-lg font-bold">
                    <span>Total:</span>
                    <span>{totalAmount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                 </div>
                 <Button className="w-full" size="lg" onClick={handleConfirmSale} disabled={addSaleMutation.isPending}>
                    {addSaleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Concluir Venda
                 </Button>
            </CardFooter>
            </Card>
        </div>
       </div>
        <Dialog open={isCancellationDialogOpen} onOpenChange={setIsCancellationDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Cancelar Venda Nº {saleToCancel?.saleNumber}</DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja cancelar esta venda? Esta ação não pode ser revertida. Por favor, informe o motivo do cancelamento.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea 
                        placeholder="Ex: Cliente desistiu da compra."
                        value={cancellationReason}
                        onChange={(e) => setCancellationReason(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Voltar</Button>
                    </DialogClose>
                    <Button 
                        variant="destructive" 
                        onClick={() => saleToCancel && cancelSaleMutation.mutate({ saleId: saleToCancel.id, reason: cancellationReason })}
                        disabled={cancelSaleMutation.isPending || !cancellationReason.trim()}
                    >
                        {cancelSaleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Cancelamento
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
  )
}
