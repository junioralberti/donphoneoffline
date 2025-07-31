
"use client";

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ServiceOrderForm } from '@/components/service-orders/service-order-form'; 
import { ServiceOrdersTable } from '@/components/service-orders/service-orders-table';
import { addServiceOrder, getServiceOrders, updateServiceOrder, deleteServiceOrder, type ServiceOrder, type ServiceOrderInput } from '@/services/serviceOrderService';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { PlusCircle, Loader2, Printer, CheckCircle, Ban } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { getEstablishmentSettings } from '@/services/settingsService';

export default function ServiceOrdersPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderToPrint, setOrderToPrint] = useState<ServiceOrder | null>(null);
  const [isPrintInitialDialogOpen, setIsPrintInitialDialogOpen] = useState(false);
  const [isFinalReceiptDialogOpen, setIsFinalReceiptDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: serviceOrders, isLoading, error } = useQuery<ServiceOrder[], Error>({
    queryKey: ['serviceOrders'],
    queryFn: getServiceOrders,
  });

  const { data: establishmentSettings } = useQuery({
    queryKey: ['establishmentSettings'],
    queryFn: getEstablishmentSettings
  });

  const addOrderMutation = useMutation({
    mutationFn: (orderData: ServiceOrderInput) => addServiceOrder(orderData),
    onSuccess: async (newOsNumber) => {
      await queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      // Find the newly created order to print it
      const orders = queryClient.getQueryData<ServiceOrder[]>(['serviceOrders']);
      const newOrder = orders?.find(o => o.osNumber === newOsNumber);
      if (newOrder) {
        setOrderToPrint(newOrder);
        setIsPrintInitialDialogOpen(true);
      }
      toast({ title: `O.S. Nº ${newOsNumber} Criada`, description: "A nova Ordem de Serviço foi criada com sucesso." });
      setIsSheetOpen(false);
    },
    onError: (err) => {
      toast({ title: "Erro ao Criar O.S.", description: err.message, variant: "destructive" });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, orderData }: { id: string, orderData: Partial<ServiceOrder> }) => updateServiceOrder(id, orderData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      toast({ title: "O.S. Atualizada", description: "Os dados da Ordem de Serviço foram atualizados." });
      setIsSheetOpen(false);
      setSelectedOrder(null);

      // Check if status is Concluída or Entregue to prompt for final receipt
      if (variables.orderData.status === 'Concluída' || variables.orderData.status === 'Entregue') {
         const updatedOrder = { ...selectedOrder, ...variables.orderData } as ServiceOrder;
         setOrderToPrint(updatedOrder);
         setIsFinalReceiptDialogOpen(true);
      }
    },
    onError: (err) => {
      toast({ title: "Erro ao Atualizar", description: err.message, variant: "destructive" });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (id: string) => deleteServiceOrder(id),
    onSuccess: (deletedId) => {
      queryClient.setQueryData(['serviceOrders'], (oldData: ServiceOrder[] | undefined) => {
          return oldData ? oldData.filter(order => order.id !== deletedId) : [];
      });
      toast({ title: "O.S. Excluída", description: "A Ordem de Serviço foi removida permanentemente." });
    },
    onError: (err) => {
      toast({ title: "Erro ao Excluir", description: err.message, variant: "destructive" });
    },
  });

  const handleFormSubmit = async (data: ServiceOrderInput) => {
    if (selectedOrder && selectedOrder.id) {
      updateOrderMutation.mutate({ id: selectedOrder.id, orderData: data });
    } else {
      addOrderMutation.mutate(data);
    }
  };

  const handleEdit = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setIsSheetOpen(true);
  };
  
  const handlePrintOS = (type: 'entry' | 'exit') => {
    if (!orderToPrint) return;

    const printContent = `
      <style>
        @media print {
          @page { size: A4; margin: 1cm; }
          body { font-family: 'Arial', sans-serif; font-size: 11pt; }
          .receipt-container { width: 100%; }
          .header, .footer { text-align: center; }
          .header img { max-width: 200px; margin-bottom: 10px; }
          .header h2 { margin: 0; }
          .header p { margin: 2px 0; }
          .os-title { text-align: center; font-size: 1.5em; font-weight: bold; margin: 20px 0; }
          .section { border: 1px solid #ccc; margin-bottom: 15px; padding: 10px; border-radius: 5px; }
          .section h3 { font-size: 1.1em; border-bottom: 1px solid #999; padding-bottom: 5px; margin-top: 0; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .full-width { grid-column: 1 / -1; }
          .field { margin-bottom: 8px; }
          .field strong { display: block; font-size: 0.9em; color: #555; }
          .field span { font-size: 1em; }
          .signatures { margin-top: 50px; display: flex; justify-content: space-around; }
          .signature-line { border-top: 1px solid #000; width: 250px; text-align: center; padding-top: 5px; }
          .terms { font-size: 8pt; margin-top: 20px; text-align: justify; }
        }
      </style>
      <div class="receipt-container">
        <div class="header">
          ${establishmentSettings?.logoUrl ? `<img src="/logoimpressao.png" alt="Logo">` : ''}
          ${establishmentSettings?.businessName ? `<h2>${establishmentSettings.businessName}</h2>` : ''}
          ${establishmentSettings?.businessAddress ? `<p>${establishmentSettings.businessAddress}</p>` : ''}
          ${establishmentSettings?.businessPhone ? `<p>Telefone: ${establishmentSettings.businessPhone}</p>` : ''}
        </div>
        <div class="os-title">Ordem de Serviço Nº: ${orderToPrint.osNumber}</div>
        
        <div class="section">
          <h3>Dados do Cliente</h3>
          <div class="grid">
            <div class="field"><strong>Nome:</strong> <span>${orderToPrint.clientName}</span></div>
            <div class="field"><strong>CPF/CNPJ:</strong> <span>${orderToPrint.clientCpfCnpj || 'Não informado'}</span></div>
            <div class="field"><strong>Telefone:</strong> <span>${orderToPrint.clientPhone || 'Não informado'}</span></div>
            <div class="field"><strong>Email:</strong> <span>${orderToPrint.clientEmail || 'Não informado'}</span></div>
          </div>
        </div>

        <div class="section">
          <h3>Dados do Equipamento</h3>
          <div class="grid">
             <div class="field"><strong>Tipo:</strong> <span>${orderToPrint.deviceType || 'Não informado'}</span></div>
             <div class="field"><strong>Marca/Modelo:</strong> <span>${orderToPrint.deviceBrandModel}</span></div>
             <div class="field"><strong>IMEI/Nº Série:</strong> <span>${orderToPrint.deviceImeiSerial || 'Não informado'}</span></div>
             <div class="field"><strong>Cor:</strong> <span>${orderToPrint.deviceColor || 'Não informado'}</span></div>
             <div class="field full-width"><strong>Acessórios:</strong> <span>${orderToPrint.deviceAccessories || 'Nenhum'}</span></div>
          </div>
        </div>

        <div class="section">
           <h3>Relato do Cliente</h3>
           <p>${orderToPrint.problemReportedByClient}</p>
        </div>
        
        ${type === 'exit' ? `
        <div class="section">
          <h3>Diagnóstico e Serviços Realizados</h3>
          <div class="field"><strong>Diagnóstico Técnico:</strong> <p>${orderToPrint.technicalDiagnosis || 'Não informado'}</p></div>
          <div class="field"><strong>Serviços Executados:</strong> <p>${orderToPrint.servicesPerformedDescription || 'Não informado'}</p></div>
          <div class="field"><strong>Peças Utilizadas:</strong> <p>${orderToPrint.partsUsedDescription || 'Nenhuma'}</p></div>
        </div>
        
        <div class="section">
            <h3>Valores</h3>
            <div class="grid">
              <div class="field"><strong>Valor do Serviço:</strong> <span>${orderToPrint.serviceManualValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              <div class="field"><strong>Produtos Adicionais:</strong> <span>${orderToPrint.additionalSoldProducts.reduce((sum, item) => sum + item.totalPrice, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              <div class="field full-width"><strong>TOTAL GERAL:</strong> <span style="font-weight: bold; font-size: 1.2em;">${orderToPrint.grandTotalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
            </div>
        </div>
        ` : ''}

        <div class="terms">
          <p><strong>Termos de Serviço:</strong> Declaro estar ciente e de acordo que: 1) O equipamento será analisado por um técnico e o orçamento poderá sofrer alterações. 2) O prazo de entrega é uma previsão e pode variar. 3) A garantia do serviço é de 90 dias sobre o reparo executado. 4) Equipamentos não retirados em até 90 dias após a conclusão do serviço poderão ser descartados para cobrir custos operacionais.</p>
        </div>

        <div class="signatures">
            <div class="signature-line">Assinatura do Cliente</div>
            <div class="signature-line">${establishmentSettings?.businessName || 'Empresa'}</div>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }

    // Close the relevant dialog after printing
    if (type === 'entry') setIsPrintInitialDialogOpen(false);
    if (type === 'exit') setIsFinalReceiptDialogOpen(false);
    setOrderToPrint(null);
  };


  const handleDelete = async (id: string) => {
    deleteOrderMutation.mutate(id);
  };
  
  const filteredOrders = serviceOrders?.filter(order =>
    order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.osNumber.toString().includes(searchTerm) ||
    order.deviceBrandModel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-semibold text-accent">Ordens de Serviço</h1>
        <Sheet open={isSheetOpen} onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) setSelectedOrder(null);
        }}>
          <SheetTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Ordem de Serviço
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full max-w-3xl sm:max-w-3xl">
            <SheetHeader>
              <SheetTitle>{selectedOrder ? `Editar O.S. Nº ${selectedOrder.osNumber}` : "Nova Ordem de Serviço"}</SheetTitle>
              <SheetDescription>
                {selectedOrder ? "Altere os dados da O.S. abaixo." : "Preencha os dados para criar uma nova Ordem de Serviço."}
              </SheetDescription>
            </SheetHeader>
            <ServiceOrderForm
              onSubmit={handleFormSubmit}
              defaultValues={selectedOrder || undefined}
              isEditing={!!selectedOrder}
              isLoading={addOrderMutation.isPending || updateOrderMutation.isPending}
              onClose={() => setIsSheetOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

       <div className="mb-4">
        <Input
          placeholder="Buscar por Nº da OS, nome do cliente ou modelo do aparelho..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-lg"
        />
      </div>

      {isLoading && <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
      {error && <div className="text-destructive text-center py-12">Erro ao carregar Ordens de Serviço: {error.message}</div>}
      {!isLoading && !error && (
        <ServiceOrdersTable
          orders={filteredOrders || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoadingDeleteForId={deleteOrderMutation.isPending ? deleteOrderMutation.variables : null}
        />
      )}

      {/* Initial Print Dialog */}
      <Dialog open={isPrintInitialDialogOpen} onOpenChange={setIsPrintInitialDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><CheckCircle className="text-green-500"/>O.S. Nº {orderToPrint?.osNumber} Criada com Sucesso!</DialogTitle>
                <DialogDescription>Deseja imprimir o comprovante de entrada do equipamento?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsPrintInitialDialogOpen(false)}>Não, Fechar</Button>
                <Button onClick={() => handlePrintOS('entry')}><Printer className="mr-2 h-4 w-4"/>Sim, Imprimir</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
       {/* Final Receipt Dialog */}
      <Dialog open={isFinalReceiptDialogOpen} onOpenChange={setIsFinalReceiptDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Ban className="text-blue-500"/>O.S. Nº {orderToPrint?.osNumber} Finalizada</DialogTitle>
                <DialogDescription>Deseja imprimir o comprovante de saída do equipamento?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsFinalReceiptDialogOpen(false)}>Não, Fechar</Button>
                <Button onClick={() => handlePrintOS('exit')}><Printer className="mr-2 h-4 w-4"/>Sim, Imprimir</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
