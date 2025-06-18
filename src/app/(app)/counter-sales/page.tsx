
"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableSummaryFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PlusCircle, ShoppingCart, Trash2, MinusCircle, DollarSign, Printer, User, Loader2, PackagePlus, PackageSearch, History, AlertTriangle, Ban, Edit } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getEstablishmentSettings, type EstablishmentSettings } from "@/services/settingsService";
import { addSale, getSales, cancelSale, type Sale, type SaleInput, type CartItemInput, type PaymentMethod, type SaleStatus } from "@/services/salesService"; 
import { getProducts, addProduct } from "@/services/productService"; 
import type { Product } from "@/lib/schemas/product";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ProductForm } from "@/components/products/product-form";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";


interface CartItem extends CartItemInput {
  id: string; 
  sku: string; 
}

const paymentMethods: PaymentMethod[] = ["Dinheiro", "Cartão de Crédito", "Cartão de Débito", "PIX"];

export default function CounterSalesPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [clientNameForSale, setClientNameForSale] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>(undefined);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [establishmentDataForPrint, setEstablishmentDataForPrint] = useState<EstablishmentSettings | null>(null);
  const [isProcessingCartAction, setIsProcessingCartAction] = useState(false); 
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [selectedProductSkuForCart, setSelectedProductSkuForCart] = useState<string>("");

  // State for cancellation dialog
  const [isCancelSaleDialogOpen, setIsCancelSaleDialogOpen] = useState(false);
  const [saleToCancelId, setSaleToCancelId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");


  const { data: products, isLoading: isLoadingProducts, error: productsError } = useQuery<Product[], Error>({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const { data: salesHistory, isLoading: isLoadingSalesHistory, error: salesHistoryError, refetch: refetchSalesHistory } = useQuery<Sale[], Error>({
    queryKey: ["sales"],
    queryFn: getSales,
  });

  useEffect(() => {
    const fetchSettings = async () => {
        try {
            const settings = await getEstablishmentSettings();
            setEstablishmentDataForPrint(settings);
        } catch (error) {
            console.error("Failed to fetch establishment settings for print:", error);
        }
    };
    fetchSettings();
  }, []);

  const addSaleMutation = useMutation({
    mutationFn: addSale,
    onSuccess: (saleId) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] }); 
      toast({ 
        title: "Venda Concluída!", 
        description: `Venda registrada com sucesso. Cliente: ${clientNameForSale || "Não informado"}. Pagamento: ${paymentMethod}. Total: R$ ${calculateTotal().toFixed(2)}`
      });
      
      const saleDataForPrint: SaleInput & { saleId: string; date: string; status: SaleStatus } = {
        saleId, 
        date: new Date().toLocaleString('pt-BR'),
        clientName: clientNameForSale || null,
        items: cartItems.map(({id, sku, ...item}) => item), 
        paymentMethod: paymentMethod || null,
        totalAmount: calculateTotal(),
        status: "Concluída",
      };
      handlePrintSaleReceipt(saleDataForPrint);
      resetSaleForm();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao Salvar Venda", description: error.message, variant: "destructive" });
    },
  });

  const addProductMutationFromDialog = useMutation({
    mutationFn: (newProductData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => addProduct(newProductData),
    onSuccess: (newProductId, submittedProductData) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Produto Adicionado",
        description: `${submittedProductData.name} (SKU: ${submittedProductData.sku}) cadastrado com sucesso.`,
      });
      setIsAddProductDialogOpen(false);
      setSelectedProductSkuForCart(submittedProductData.sku); 
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao Adicionar Produto", description: error.message, variant: "destructive" });
    },
  });

  const cancelSaleMutation = useMutation({
    mutationFn: ({ saleId, reason }: { saleId: string; reason: string }) => cancelSale(saleId, reason),
    onSuccess: (_, { saleId }) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast({ title: "Venda Cancelada", description: `A venda foi cancelada com sucesso.` });
      setIsCancelSaleDialogOpen(false);
      setSaleToCancelId(null);
      setCancellationReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao Cancelar Venda", description: error.message, variant: "destructive" });
    },
  });


  const handleAddItem = async () => {
    if (!selectedProductSkuForCart) {
      toast({ title: "Nenhum Produto Selecionado", description: "Por favor, selecione um produto da lista.", variant: "destructive" });
      return;
    }
    setIsProcessingCartAction(true);
    
    const product = products?.find(p => p.sku === selectedProductSkuForCart);

    if (!product) {
      toast({ title: "Produto Não Encontrado", description: "O produto selecionado não foi encontrado. Tente atualizar a lista de produtos.", variant: "destructive" });
      setIsProcessingCartAction(false);
      return;
    }

    try {
      if (product && product.id) {
        const existingItemIndex = cartItems.findIndex(item => item.sku === product.sku);

        if (existingItemIndex > -1) {
          const updatedCartItems = [...cartItems];
          updatedCartItems[existingItemIndex].quantity += 1;
          setCartItems(updatedCartItems);
        } else {
          setCartItems([...cartItems, { 
            id: product.id + `-${Date.now()}`, 
            sku: product.sku,
            name: product.name, 
            price: product.price, 
            quantity: 1 
          }]);
        }
        setSelectedProductSkuForCart(""); 
        toast({ title: "Item Adicionado", description: `${product.name} adicionado ao carrinho.` });
      } else {
        toast({ title: "Erro ao Adicionar Produto", description: "Não foi possível adicionar o produto selecionado.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error adding item to cart:", error);
      toast({ title: "Erro ao Adicionar Item", description: "Ocorreu um erro ao adicionar o item ao carrinho.", variant: "destructive" });
    } finally {
      setIsProcessingCartAction(false);
    }
  };

  const handleUpdateQuantity = (itemId: string, change: number) => {
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId ? { ...item, quantity: Math.max(1, item.quantity + change) } : item
      ).filter(item => item.quantity > 0) 
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
    toast({ title: "Item Removido", description: "Item removido do carrinho.", variant: "destructive" });
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const resetSaleForm = () => {
    setCartItems([]);
    setSelectedProductSkuForCart("");
    setClientNameForSale("");
    setPaymentMethod(undefined);
  };

  const handlePrintSaleReceipt = (saleData: {
    saleId: string;
    date: string;
    clientName?: string | null;
    items: CartItemInput[]; 
    paymentMethod?: PaymentMethod | null;
    totalAmount: number;
    status: SaleStatus; 
    cancellationReason?: string | null; 
  }) => {
    const establishmentDataToUse = establishmentDataForPrint || {
      businessName: "Nome da Empresa Aqui",
      businessAddress: "Endereço da Empresa Aqui",
      businessCnpj: "Seu CNPJ",
      businessPhone: "Seu Telefone",
      businessEmail: "Seu Email",
    };
    const fixedLogoUrl = "/logoimpressao.png"; 

    const printWindow = window.open('', '_blank', 'height=700,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Comprovante de Venda</title>');
      printWindow.document.write('<style>');
      printWindow.document.write(`
        body { font-family: 'Arial', sans-serif; margin: 20px; font-size: 10pt; color: #333; font-weight: bold; }
        .print-container { width: 100%; max-width: 700px; margin: auto; }
        .establishment-header { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #ccc; }
        .logo-container { margin-bottom: 10px; flex-shrink: 0; }
        .logo-container img { max-height: 180px; max-width: 540px; object-fit: contain; display: block; margin: 0 auto; }
        .establishment-info { font-size: 9pt; line-height: 1.4; text-align: center; }
        .establishment-info strong { font-size: 12pt; display: block; margin-bottom: 4px; color: #000; }
        .section-title { font-size: 12pt; font-weight: bold; margin-top: 20px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #eee; color: #000; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; margin-bottom: 15px; font-size: 9pt; }
        .details-grid-full { display: grid; grid-template-columns: 1fr; gap: 4px; margin-bottom: 15px; font-size: 9pt;}
        .details-grid strong, .details-grid-full strong { color: #555; }
        .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9pt; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 6px; text-align: left; }
        .items-table th { background-color: #f2f2f2; font-weight: bold; }
        .items-table .text-right { text-align: right; }
        .items-table .text-center { text-align: center; }
        .summary-section { margin-top: 15px; padding-top:10px; border-top: 1px solid #ccc; font-size: 10pt; }
        .summary-section div { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .summary-section .grand-total { font-size: 11pt; font-weight: bold; }
        h1.receipt-title { text-align: center; font-size: 16pt; margin-bottom: 5px; color: #000;}
        .status-cancelled { text-align: center; font-size: 14pt; color: red; font-weight: bold; margin-bottom: 10px; border: 2px dashed red; padding: 5px;}
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


      printWindow.document.write(`<h1 class="receipt-title">COMPROVANTE DE VENDA</h1>`);
      if (saleData.status === "Cancelada") {
        printWindow.document.write(`<div class="status-cancelled">VENDA CANCELADA</div>`);
        if(saleData.cancellationReason) {
             printWindow.document.write(`<div style="text-align:center; font-size: 9pt; margin-bottom:10px;"><strong>Motivo:</strong> ${saleData.cancellationReason}</div>`);
        }
      }
      printWindow.document.write('<div class="details-grid">');
      printWindow.document.write(`<div><strong>Nº Venda:</strong> ${saleData.saleId}</div>`);
      printWindow.document.write(`<div><strong>Data:</strong> ${saleData.date}</div>`);
      if (saleData.clientName) {
        printWindow.document.write(`<div><strong>Cliente:</strong> ${saleData.clientName}</div>`);
      }
      printWindow.document.write('</div>');

      printWindow.document.write('<div class="section-title">Itens</div>');
      printWindow.document.write('<table class="items-table"><thead><tr><th>Produto</th><th class="text-center">Qtd</th><th class="text-right">Preço Unit.</th><th class="text-right">Subtotal</th></tr></thead><tbody>');
      saleData.items.forEach(item => {
        printWindow.document.write(`<tr>
          <td>${item.name}</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">R$ ${Number(item.price).toFixed(2).replace('.', ',')}</td>
          <td class="text-right">R$ ${(Number(item.price) * item.quantity).toFixed(2).replace('.', ',')}</td>
        </tr>`);
      });
      printWindow.document.write('</tbody></table>');
      
      printWindow.document.write('<div class="summary-section">');
      if (saleData.paymentMethod) {
         printWindow.document.write(`<div><span>Tipo de Pagamento:</span> <span>${saleData.paymentMethod}</span></div>`);
      }
      printWindow.document.write(`<div class="grand-total"><span>VALOR TOTAL:</span> <span>R$ ${saleData.totalAmount.toFixed(2).replace('.', ',')}</span></div>`);
      printWindow.document.write('</div>');

      printWindow.document.write('</div></body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      toast({ title: "Impressão Bloqueada", description: "Por favor, desabilite o bloqueador de pop-ups.", variant: "destructive"});
    }
  };


  const handleCompleteSale = () => {
    if (cartItems.length === 0) {
      toast({ title: "Carrinho Vazio", description: "Adicione itens ao carrinho antes de concluir a venda.", variant: "destructive" });
      return;
    }
    if (!paymentMethod) {
      toast({ title: "Pagamento Necessário", description: "Por favor, selecione um tipo de pagamento.", variant: "destructive" });
      return;
    }

    const saleToSave: SaleInput = {
      clientName: clientNameForSale || null,
      items: cartItems.map(({ id, sku, ...item }) => item), 
      paymentMethod: paymentMethod || null,
      totalAmount: calculateTotal(),
      status: "Concluída", 
    };
    
    addSaleMutation.mutate(saleToSave);
  };

  const handleAddProductFromDialog = async (data: Product) => {
    const { id, createdAt, updatedAt, ...productData } = data;
    await addProductMutationFromDialog.mutateAsync(productData);
  };

  const handleOpenCancelDialog = (saleId: string) => {
    setSaleToCancelId(saleId);
    setCancellationReason("");
    setIsCancelSaleDialogOpen(true);
  };

  const handleConfirmCancellation = () => {
    if (!saleToCancelId) return;
    if (!cancellationReason.trim()) {
      toast({ title: "Motivo Obrigatório", description: "Por favor, informe o motivo do cancelamento.", variant: "destructive" });
      return;
    }
    cancelSaleMutation.mutate({ saleId: saleToCancelId, reason: cancellationReason });
  };


  const SalesHistorySkeleton = () => (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1.5 w-2/3">
            <Skeleton className="h-5 w-1/2 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
          </div>
          <Skeleton className="h-5 w-1/4 rounded" />
        </div>
      ))}
    </div>
  );


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-semibold">Vendas no Balcão</h1>
         <Button variant="outline" onClick={() => {
            if (cartItems.length === 0) {
                 toast({ title: "Carrinho Vazio", description: "Adicione itens ao carrinho para visualizar." });
            } else {
                 toast({ title: "Visualizar Carrinho", description: `Itens: ${cartItems.reduce((acc, item) => acc + item.quantity, 0)}, Total: R$ ${calculateTotal().toFixed(2)}` });
            }
         }}>
          <ShoppingCart className="mr-2 h-4 w-4" /> Ver Carrinho ({cartItems.reduce((acc, item) => acc + item.quantity, 0)})
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Nova Venda</CardTitle>
          <CardDescription>Registre vendas de produtos e acessórios no balcão.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientNameForSale">Nome do Cliente (Opcional)</Label>
              <Input 
                id="clientNameForSale"
                value={clientNameForSale}
                onChange={(e) => setClientNameForSale(e.target.value)}
                placeholder="Digite o nome do cliente"
                className="text-base"
              />
            </div>
            <div>
              <Label htmlFor="paymentMethod">Tipo de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                <SelectTrigger id="paymentMethod" className="text-base">
                  <SelectValue placeholder="Selecione o tipo de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(method => (
                    <SelectItem key={method} value={method} className="text-base">{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-grow min-w-[250px] sm:min-w-[300px]">
              <Label htmlFor="productSelect">Produto</Label>
              {isLoadingProducts ? (
                 <Button variant="outline" className="w-full justify-start text-muted-foreground" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando produtos...
                 </Button>
              ) : productsError ? (
                <Button variant="outline" className="w-full justify-start text-destructive" disabled>
                    Erro ao carregar produtos
                </Button>
              ) : (
                <Select 
                    value={selectedProductSkuForCart} 
                    onValueChange={(value) => setSelectedProductSkuForCart(value)}
                    disabled={isProcessingCartAction || addSaleMutation.isPending || addProductMutationFromDialog.isPending}
                >
                    <SelectTrigger id="productSelect" className="text-base">
                    <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-72">
                    {products && products.length > 0 ? (
                        products.map(product => (
                        <SelectItem key={product.sku} value={product.sku} className="text-sm">
                            <div>
                                <span className="font-medium">{product.name}</span> (SKU: {product.sku})
                                <span className="block text-xs text-muted-foreground">
                                    Preço: R$ {product.price.toFixed(2)} | Estoque: {product.stock}
                                </span>
                            </div>
                        </SelectItem>
                        ))
                    ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Nenhum produto cadastrado.
                        </div>
                    )}
                    </SelectContent>
                </Select>
              )}
            </div>
            <Button onClick={handleAddItem} className="h-10" disabled={isProcessingCartAction || !selectedProductSkuForCart || addSaleMutation.isPending || addProductMutationFromDialog.isPending}>
              {isProcessingCartAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} 
              Adicionar Item
            </Button>
            <Button variant="secondary" onClick={() => setIsAddProductDialogOpen(true)} className="h-10" disabled={isProcessingCartAction || addSaleMutation.isPending || addProductMutationFromDialog.isPending}>
              {addProductMutationFromDialog.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}
              Cadastrar Produto
            </Button>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <ShoppingCart className="mx-auto h-12 w-12 mb-2" />
              <p>Nenhum item no carrinho.</p>
              <p className="text-sm">Selecione um produto e clique em "Adicionar Item".</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-[150px] text-center">Quantidade</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Preço Unit. (R$)</TableHead>
                    <TableHead className="text-right">Subtotal (R$)</TableHead>
                    <TableHead className="w-[50px] text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cartItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleUpdateQuantity(item.id, -1)}>
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleUpdateQuantity(item.id, 1)}>
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-sm">{item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm">{(item.price * item.quantity).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7" onClick={() => handleRemoveItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                 <TableSummaryFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="hidden sm:table-cell"></TableCell>
                    <TableCell className="sm:hidden text-right font-semibold">Total:</TableCell>
                    <TableCell className="hidden sm:table-cell text-right font-semibold">Total:</TableCell>
                    <TableCell className="text-right font-bold text-lg">R$ {calculateTotal().toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableSummaryFooter>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <Button variant="outline" onClick={() => handlePrintSaleReceipt({
                saleId: `PREVIEW-${Date.now().toString().slice(-6)}`,
                date: new Date().toLocaleString('pt-BR'),
                clientName: clientNameForSale,
                items: cartItems.map(({id, sku, ...item}) => item),
                paymentMethod,
                totalAmount: calculateTotal(),
                status: "Concluída", 
            })} 
            disabled={cartItems.length === 0}
            className="w-full sm:w-auto"
            >
              <Printer className="mr-2 h-4 w-4" /> Imprimir Comprovante (Prévia)
            </Button>
            <Button 
              size="lg" 
              onClick={handleCompleteSale} 
              disabled={cartItems.length === 0 || !paymentMethod || addSaleMutation.isPending}
              className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {addSaleMutation.isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <DollarSign className="mr-2 h-5 w-5" />
              )}
              Concluir Venda
            </Button>
        </CardFooter>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Vendas Recentes
          </CardTitle>
          <CardDescription>Lista das últimas vendas realizadas no balcão.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSalesHistory ? (
            <SalesHistorySkeleton />
          ) : salesHistoryError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-6 text-center text-destructive">
              <AlertTriangle className="h-10 w-10" />
              <p className="text-md font-medium">Erro ao carregar histórico de vendas</p>
              <p className="text-sm text-muted-foreground">{salesHistoryError.message}</p>
              <Button onClick={() => refetchSalesHistory()} variant="outline" size="sm" className="mt-2">
                Tentar Novamente
              </Button>
            </div>
          ) : salesHistory && salesHistory.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesHistory.map((sale) => (
                    <TableRow key={sale.id} className={sale.status === "Cancelada" ? "opacity-60" : ""}>
                      <TableCell className="text-sm">
                        {sale.createdAt instanceof Date 
                          ? format(sale.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR }) 
                          : (sale.createdAt ? new Date((sale.createdAt as any).seconds * 1000).toLocaleDateString('pt-BR') : 'N/D')}
                      </TableCell>
                      <TableCell className="text-sm">{sale.clientName || "Não informado"}</TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {sale.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <Badge variant={sale.status === "Cancelada" ? "destructive" : "secondary"}>
                          {sale.status}
                        </Badge>
                        {sale.status === "Cancelada" && sale.cancellationReason && (
                            <p className="text-xs text-muted-foreground mt-1 truncate" title={sale.cancellationReason}>
                                Motivo: {sale.cancellationReason}
                            </p>
                        )}
                      </TableCell>
                       <TableCell className="text-center space-x-1">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handlePrintSaleReceipt({
                                saleId: sale.id,
                                date: sale.createdAt instanceof Date ? format(sale.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR }) : new Date((sale.createdAt as any).seconds * 1000).toLocaleString('pt-BR'),
                                clientName: sale.clientName,
                                items: sale.items,
                                paymentMethod: sale.paymentMethod,
                                totalAmount: sale.totalAmount,
                                status: sale.status,
                                cancellationReason: sale.cancellationReason,
                            })}
                            title="Imprimir Comprovante"
                        >
                            <Printer className="h-4 w-4" />
                        </Button>
                        {sale.status !== "Cancelada" && (
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleOpenCancelDialog(sale.id)}
                            disabled={cancelSaleMutation.isPending && cancelSaleMutation.variables?.saleId === sale.id}
                            title="Cancelar Venda"
                          >
                            {cancelSaleMutation.isPending && cancelSaleMutation.variables?.saleId === sale.id 
                                ? <Loader2 className="h-4 w-4 animate-spin"/> 
                                : <Ban className="h-4 w-4" />}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <ShoppingCart className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p>Nenhuma venda registrada ainda.</p>
            </div>
          )}
        </CardContent>
      </Card>


      <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Produto</DialogTitle>
            <DialogDescription>
              Preencha os detalhes do novo produto para adicioná-lo ao sistema.
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            onSubmit={handleAddProductFromDialog}
            isLoading={addProductMutationFromDialog.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isCancelSaleDialogOpen} onOpenChange={setIsCancelSaleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Venda</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta venda? Esta ação não pode ser desfeita.
              Por favor, informe o motivo do cancelamento abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="cancellationReason" className="mb-1 block">Motivo do Cancelamento (Obrigatório)</Label>
            <Textarea
              id="cancellationReason"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Ex: Cliente se arrependeu, problema no pagamento, etc."
              rows={3}
            />
            {!cancellationReason.trim() && <p className="text-xs text-destructive mt-1">O motivo é obrigatório.</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSaleToCancelId(null)}>Não, manter venda</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCancellation} 
              disabled={!cancellationReason.trim() || cancelSaleMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {cancelSaleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sim, Cancelar Venda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
    

    

    

    
