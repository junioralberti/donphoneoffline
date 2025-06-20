
"use client";

import { useState, type FormEvent, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Pencil, Trash2, FileText, Printer, UserPlus, Search, MinusCircle, ShoppingCart, DollarSign, Loader2, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getEstablishmentSettings, type EstablishmentSettings } from "@/services/settingsService";
import { addServiceOrder, getServiceOrders, deleteServiceOrder, type ServiceOrder, type ServiceOrderInput, type SoldProductItemInput, updateServiceOrder } from "@/services/serviceOrderService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


type ServiceOrderStatus = "Aberta" | "Em andamento" | "Aguardando peça" | "Concluída" | "Entregue" | "Cancelada";
const serviceOrderStatuses: ServiceOrderStatus[] = ["Aberta", "Em andamento", "Aguardando peça", "Concluída", "Entregue", "Cancelada"];

type DeviceType = "Celular" | "Notebook" | "Tablet" | "Placa" | "Outro";
const deviceTypes: DeviceType[] = ["Celular", "Notebook", "Tablet", "Placa", "Outro"];

interface SoldProductItem extends SoldProductItemInput {
  tempId: string; 
}


export default function ServiceOrdersPage() {
  const [isNewServiceOrderDialogOpen, setIsNewServiceOrderDialogOpen] = useState(false);
  const [isEditServiceOrderDialogOpen, setIsEditServiceOrderDialogOpen] = useState(false);
  const [editingServiceOrder, setEditingServiceOrder] = useState<ServiceOrder | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [establishmentDataForPrint, setEstablishmentDataForPrint] = useState<EstablishmentSettings | null>(null);
  
  const [formOsNumber, setFormOsNumber] = useState("Automático");
  const [formOpeningDate, setFormOpeningDate] = useState(new Date().toLocaleString('pt-BR'));
  const [deliveryForecastDate, setDeliveryForecastDate] = useState("");
  const [status, setStatus] = useState<ServiceOrderStatus>("Aberta");
  const [responsibleTechnicianName, setResponsibleTechnicianName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientCpfCnpj, setClientCpfCnpj] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [deviceType, setDeviceType] = useState<DeviceType | undefined>(undefined);
  const [deviceBrandModel, setDeviceBrandModel] = useState("");
  const [deviceImeiSerial, setDeviceImeiSerial] = useState("");
  const [deviceColor, setDeviceColor] = useState("");
  const [deviceAccessories, setDeviceAccessories] = useState("");
  const [problemReportedByClient, setProblemReportedByClient] = useState("");
  const [technicalDiagnosis, setTechnicalDiagnosis] = useState("");
  const [internalObservations, setInternalObservations] = useState("");
  const [servicesPerformedDescription, setServicesPerformedDescription] = useState("");
  const [partsUsedDescription, setPartsUsedDescription] = useState("");
  const [serviceManualValueInput, setServiceManualValueInput] = useState("");
  const [soldProductsList, setSoldProductsList] = useState<SoldProductItem[]>([]);
  const [currentProductNameInput, setCurrentProductNameInput] = useState("");
  const [currentProductQtyInput, setCurrentProductQtyInput] = useState("1");
  const [currentProductPriceInput, setCurrentProductPriceInput] = useState("");
  const [grandTotalDisplay, setGrandTotalDisplay] = useState("0.00");

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

  const { data: serviceOrders, isLoading: isLoadingServiceOrders, error: serviceOrdersError, refetch: refetchServiceOrders } = useQuery<ServiceOrder[], Error>({
    queryKey: ["serviceOrders"],
    queryFn: getServiceOrders,
  });

  useEffect(() => {
    if (serviceOrdersError) {
      toast({
        title: "Erro ao Carregar Ordens de Serviço",
        description: serviceOrdersError.message || "Não foi possível buscar os dados das OS. Verifique sua conexão ou tente novamente.",
        variant: "destructive",
        duration: 10000,
      });
    }
  }, [serviceOrdersError, toast]);
  
  const populateFormForEdit = (order: ServiceOrder) => {
    setFormOsNumber(String(order.osNumber));
    setFormOpeningDate(order.openingDate instanceof Date ? order.openingDate.toLocaleString('pt-BR') : new Date(order.openingDate as any).toLocaleString('pt-BR'));
    setDeliveryForecastDate(order.deliveryForecastDate ? format(new Date(order.deliveryForecastDate), "yyyy-MM-dd") : "");
    setStatus(order.status);
    setResponsibleTechnicianName(order.responsibleTechnicianName || "");
    setClientName(order.clientName);
    setClientCpfCnpj(order.clientCpfCnpj || "");
    setClientPhone(order.clientPhone || "");
    setClientEmail(order.clientEmail || "");
    setDeviceType(order.deviceType || undefined);
    setDeviceBrandModel(order.deviceBrandModel);
    setDeviceImeiSerial(order.deviceImeiSerial || "");
    setDeviceColor(order.deviceColor || "");
    setDeviceAccessories(order.deviceAccessories || "");
    setProblemReportedByClient(order.problemReportedByClient);
    setTechnicalDiagnosis(order.technicalDiagnosis || "");
    setInternalObservations(order.internalObservations || "");
    setServicesPerformedDescription(order.servicesPerformedDescription || "");
    setPartsUsedDescription(order.partsUsedDescription || "");
    setServiceManualValueInput(order.serviceManualValue.toFixed(2).replace('.', ','));
    setSoldProductsList(order.additionalSoldProducts.map(p => ({ ...p, tempId: `prod-${Math.random().toString(36).substr(2, 9)}` })) || []);
    setGrandTotalDisplay(order.grandTotalValue.toFixed(2).replace('.', ','));
  };

  const handleOpenEditDialog = (order: ServiceOrder) => {
    setEditingServiceOrder(order);
    populateFormForEdit(order);
    setIsEditServiceOrderDialogOpen(true);
  };

  const resetFormFields = () => {
    setFormOsNumber("Automático");
    setFormOpeningDate(new Date().toLocaleString('pt-BR'));
    setDeliveryForecastDate("");
    setStatus("Aberta");
    setResponsibleTechnicianName("");
    setClientName("");
    setClientCpfCnpj("");
    setClientPhone("");
    setClientEmail("");
    setDeviceType(undefined);
    setDeviceBrandModel("");
    setDeviceImeiSerial("");
    setDeviceColor("");
    setDeviceAccessories("");
    setProblemReportedByClient("");
    setTechnicalDiagnosis("");
    setInternalObservations("");
    setServicesPerformedDescription("");
    setPartsUsedDescription("");
    setServiceManualValueInput("");
    setSoldProductsList([]);
    setCurrentProductNameInput("");
    setCurrentProductQtyInput("1");
    setCurrentProductPriceInput("");
    setEditingServiceOrder(null);
  };

  const addServiceOrderMutation = useMutation({
    mutationFn: addServiceOrder,
    onSuccess: (newOsNumber) => {
      queryClient.invalidateQueries({ queryKey: ["serviceOrders"] });
      toast({ title: "Nova O.S. Criada", description: `A Ordem de Serviço ${newOsNumber} foi registrada com sucesso.`});
      resetFormFields();
      setIsNewServiceOrderDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao Criar O.S.", description: error.message, variant: "destructive" });
    },
  });

  const updateServiceOrderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<Omit<ServiceOrder, 'id' | 'osNumber' | 'openingDate'>> }) => updateServiceOrder(id, data),
    onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["serviceOrders"] });
        toast({ title: "O.S. Atualizada", description: `A Ordem de Serviço foi atualizada com sucesso.` });
        resetFormFields();
        setIsEditServiceOrderDialogOpen(false);
    },
    onError: (error: Error) => {
        toast({ title: "Erro ao Atualizar O.S.", description: error.message, variant: "destructive" });
    },
  });


  const deleteServiceOrderMutation = useMutation({
    mutationFn: deleteServiceOrder,
    onSuccess: (deletedOsId) => {
      queryClient.invalidateQueries({ queryKey: ["serviceOrders"] });
      toast({ title: "O.S. Excluída", description: `A Ordem de Serviço ${deletedOsId} foi excluída.`, variant: "default"});
    },
    onError: (error: Error) => {
       toast({ title: "Erro ao Excluir O.S.", description: error.message, variant: "destructive" });
    }
  });


  const handleAddSoldProduct = () => {
    const name = currentProductNameInput.trim();
    const quantity = parseInt(currentProductQtyInput, 10);
    const unitPrice = parseFloat(currentProductPriceInput.replace(',', '.'));

    if (!name || isNaN(quantity) || quantity <= 0 || isNaN(unitPrice) || unitPrice <= 0) {
      toast({
        title: "Produto Inválido",
        description: "Por favor, preencha nome, quantidade válida e preço válido para o produto.",
        variant: "destructive",
      });
      return;
    }

    const newProduct: SoldProductItem = {
      tempId: `prod-${Date.now()}`,
      name,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
    };
    setSoldProductsList(prev => [...prev, newProduct]);
    setCurrentProductNameInput("");
    setCurrentProductQtyInput("1");
    setCurrentProductPriceInput("");
    toast({ title: "Produto Adicionado", description: `${name} adicionado à OS.`});
  };

  const handleRemoveSoldProduct = (tempId: string) => {
    setSoldProductsList(prev => prev.filter(p => p.tempId !== tempId));
     toast({ title: "Produto Removido", description: "Produto removido da OS.", variant: "destructive" });
  };

  useEffect(() => {
    const serviceValue = parseFloat(serviceManualValueInput.replace(',', '.')) || 0;
    const productsTotal = soldProductsList.reduce((sum, prod) => sum + prod.totalPrice, 0);
    const currentGrandTotal = serviceValue + productsTotal;
    setGrandTotalDisplay(currentGrandTotal.toFixed(2).replace('.', ','));
  }, [serviceManualValueInput, soldProductsList]);


  const handleSubmitServiceOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!clientName || !deviceBrandModel || !problemReportedByClient) {
       toast({
        title: "Campos Obrigatórios",
        description: "Cliente, Modelo do Aparelho e Defeito Informado são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const serviceValueNum = parseFloat(serviceManualValueInput.replace(',', '.')) || 0;
    const grandTotalNum = parseFloat(grandTotalDisplay.replace(',', '.')) || 0;

    const orderDataPayload: ServiceOrderInput = {
      deliveryForecastDate: deliveryForecastDate || null,
      status,
      responsibleTechnicianName: responsibleTechnicianName || null,
      clientName,
      clientCpfCnpj: clientCpfCnpj || null,
      clientPhone: clientPhone || null,
      clientEmail: clientEmail || null,
      deviceType: deviceType || null,
      deviceBrandModel,
      deviceImeiSerial: deviceImeiSerial || null,
      deviceColor: deviceColor || null,
      deviceAccessories: deviceAccessories || null,
      problemReportedByClient,
      technicalDiagnosis: technicalDiagnosis || null,
      internalObservations: internalObservations || null,
      servicesPerformedDescription: servicesPerformedDescription || null,
      partsUsedDescription: partsUsedDescription || null,
      serviceManualValue: serviceValueNum,
      additionalSoldProducts: soldProductsList.map(({ tempId, ...prod}) => prod),
      grandTotalValue: grandTotalNum,
    };
    
    if (editingServiceOrder && editingServiceOrder.id) {
        updateServiceOrderMutation.mutate({ id: editingServiceOrder.id, data: orderDataPayload });
    } else {
        addServiceOrderMutation.mutate(orderDataPayload);
    }
  };

  const handleDeleteServiceOrder = async (orderId: string) => {
    if (!orderId) {
      toast({ title: "Erro", description: "ID da OS inválido para exclusão.", variant: "destructive" });
      return;
    }
    deleteServiceOrderMutation.mutate(orderId);
  };


  const handlePrintOS = (order: Partial<ServiceOrder>) => {
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
      printWindow.document.write('<html><head><title>Ordem de Serviço</title>');
      printWindow.document.write('<style>');
      printWindow.document.write(`
        body { font-family: 'Arial', sans-serif; margin: 20px; font-size: 10pt; color: #333; font-weight: bold; }
        .print-container { width: 100%; max-width: 700px; margin: auto; }
        .establishment-header { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #ccc; }
        .logo-container { margin-bottom: 10px; flex-shrink: 0; }
        .logo-container img { max-height: 180px; max-width: 540px; object-fit: contain; display: block; margin: 0 auto; }
        .establishment-info { font-size: 9pt; line-height: 1.4; text-align: center; }
        .establishment-info strong { font-size: 12pt; display: block; margin-bottom: 4px; color: #000; }
        .section-title { font-size: 12pt; font-weight: bold; margin-top: 15px; margin-bottom: 6px; padding-bottom: 3px; border-bottom: 1px solid #eee; color: #000; }
        .details-grid { display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; margin-bottom: 10px; font-size: 9pt; }
        .details-grid div { padding: 1px 0; }
        .details-grid strong { color: #555; font-weight: bold; }
        .text-area-content { white-space: pre-wrap; padding: 5px; border: 1px solid #eee; background-color: #f9f9f9; border-radius: 3px; font-size: 9pt; margin-top: 3px; min-height: 40px; }
        .grand-total { text-align: right; font-size: 11pt; font-weight: bold; margin-top: 15px; padding-top:10px; border-top: 1px solid #ccc; }
        .signature-area { margin-top: 50px; padding-top: 20px; border-top: 1px dashed #aaa; text-align: center; font-size: 9pt; }
        .signature-line { display: inline-block; width: 280px; border-bottom: 1px solid #333; margin-top: 40px; }
        h1.os-title { text-align: center; font-size: 16pt; margin-bottom: 15px; color: #000;}
      `);
      printWindow.document.write('</style></head><body><div class="print-container">');

      printWindow.document.write('<div class="establishment-header">');
      printWindow.document.write(`<div class="logo-container"><img src="${fixedLogoUrl}" alt="Logo do Estabelecimento" data-ai-hint="company brand illustration" /></div>`);
      printWindow.document.write('<div class="establishment-info">');
      printWindow.document.write(`<strong>${establishmentDataToUse.businessName || "Nome da Empresa"}</strong><br/>`);
      printWindow.document.write(`${establishmentDataToUse.businessAddress || "Endereço da Empresa"}<br/>`);
      if(establishmentDataToUse.businessCnpj) printWindow.document.write(`CNPJ: ${establishmentDataToUse.businessCnpj}<br/>`);
      if(establishmentDataToUse.businessPhone || establishmentDataToUse.businessEmail) {
        printWindow.document.write(`Telefone: ${establishmentDataToUse.businessPhone || ""} ${establishmentDataToUse.businessPhone && establishmentDataToUse.businessEmail ? '|' : ''} E-mail: ${establishmentDataToUse.businessEmail || ""}`);
      }
      printWindow.document.write('</div></div>');

      printWindow.document.write(`<h1 class="os-title">ORDEM DE SERVIÇO Nº: ${order.osNumber || 'N/A'}</h1>`);
      
      const openingDateFormatted = order.openingDate instanceof Date 
        ? format(order.openingDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) 
        : (order.openingDate ? new Date(String(order.openingDate)).toLocaleString('pt-BR') : 'N/A');
      printWindow.document.write('<div class="details-grid" style="grid-template-columns: 1fr; margin-bottom: 10px;">');
      printWindow.document.write(`<div><strong>Data de Abertura:</strong> ${openingDateFormatted}</div>`);
      printWindow.document.write('</div>');
      
      printWindow.document.write('<div class="section-title">Cliente</div>');
      printWindow.document.write('<div class="details-grid" style="grid-template-columns: 1fr;">');
      printWindow.document.write(`<div><strong>Nome:</strong> ${order.clientName || 'N/A'}</div>`);
      printWindow.document.write('</div>');

      printWindow.document.write('<div class="section-title">Equipamento</div>');
      printWindow.document.write('<div class="details-grid" style="grid-template-columns: 1fr;">');
      printWindow.document.write(`<div><strong>Marca/Modelo:</strong> ${order.deviceBrandModel || 'N/A'}</div>`);
      printWindow.document.write('</div>');

      printWindow.document.write('<div class="section-title">Problema Relatado</div>');
      printWindow.document.write('<div class="text-area-content">');
      printWindow.document.write(order.problemReportedByClient || 'Nenhum problema relatado.');
      printWindow.document.write('</div>');
      
      printWindow.document.write(`<div class="grand-total">VALOR TOTAL DA OS: R$ ${order.grandTotalValue !== undefined ? Number(order.grandTotalValue).toFixed(2).replace('.', ',') : '0,00'}</div>`);

      printWindow.document.write('<div class="signature-area">');
      printWindow.document.write('<div class="signature-line"></div>');
      printWindow.document.write(`<div>Assinatura do Cliente (${order.clientName || ''})</div>`);
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
  
  const getStatusColor = (status: ServiceOrderStatus) => {
    switch (status) {
      case "Aberta": return "bg-primary/10 text-primary border-primary/30";
      case "Em andamento": return "bg-blue-500/10 text-blue-400 border-blue-500/30"; 
      case "Aguardando peça": return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "Concluída": return "bg-green-500/10 text-green-400 border-green-500/30";
      case "Entregue": return "bg-teal-500/10 text-teal-400 border-teal-500/30";
      case "Cancelada": return "bg-destructive/10 text-destructive border-destructive/30";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };
  
  const ServiceOrdersSkeleton = () => (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
         <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1.5 w-2/3">
            <Skeleton className="h-5 w-1/3 rounded bg-muted/50" />
            <Skeleton className="h-4 w-2/3 rounded bg-muted/50" />
             <Skeleton className="h-3 w-1/2 rounded bg-muted/50" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-9 rounded-md bg-muted/50" />
            <Skeleton className="h-9 w-9 rounded-md bg-muted/50" />
            <Skeleton className="h-9 w-9 rounded-md bg-muted/50" />
          </div>
        </div>
      ))}
    </div>
  );


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-semibold text-foreground">Ordens de Serviço</h1>
        <Dialog open={isNewServiceOrderDialogOpen} onOpenChange={(isOpen) => {
          setIsNewServiceOrderDialogOpen(isOpen);
          if (!isOpen) resetFormFields(); 
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetFormFields(); setIsNewServiceOrderDialogOpen(true); }} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <PlusCircle className="mr-2 h-4 w-4" /> Criar Nova Ordem de Serviço
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{editingServiceOrder ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}</DialogTitle>
              <DialogDescription>
                {editingServiceOrder ? "Atualize os dados da O.S." : "Preencha os dados para registrar uma nova O.S."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitServiceOrder}>
              <ScrollArea className="h-[75vh] p-1 pr-3">
                <div className="space-y-6 p-2">
                  <Card>
                    <CardHeader><CardTitle className="text-xl">Dados Gerais da OS</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="osNumberForm">Número da OS</Label>
                          <Input id="osNumberForm" value={formOsNumber} disabled className="bg-muted/50" />
                        </div>
                        <div>
                          <Label htmlFor="osOpeningDateForm">Data de Abertura</Label>
                          <Input id="osOpeningDateForm" value={formOpeningDate} disabled className="bg-muted/50" />
                        </div>
                        <div>
                          <Label htmlFor="osDeliveryForecast">Previsão de Entrega</Label>
                          <Input id="osDeliveryForecast" type="date" value={deliveryForecastDate} onChange={(e) => setDeliveryForecastDate(e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="osStatus">Status da OS</Label>
                          <Select value={status} onValueChange={(value: ServiceOrderStatus) => setStatus(value)}>
                            <SelectTrigger id="osStatus"><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                            <SelectContent>
                              {serviceOrderStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="osTechnician">Técnico Responsável</Label>
                           <Input 
                                id="osTechnician" 
                                value={responsibleTechnicianName}
                                onChange={(e) => setResponsibleTechnicianName(e.target.value)}
                                placeholder="Nome do técnico" 
                            />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-xl">Dados do Cliente</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                       <div className="space-y-1">
                        <Label htmlFor="osClientName">Cliente (Nome Completo)</Label>
                        <Input 
                            id="osClientName" 
                            value={clientName} 
                            onChange={(e) => setClientName(e.target.value)} 
                            placeholder="Digite o nome do cliente"
                            required 
                        />
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="osClientCpfCnpj">CPF/CNPJ (Opcional)</Label>
                            <Input id="osClientCpfCnpj" value={clientCpfCnpj} onChange={(e) => setClientCpfCnpj(e.target.value)} placeholder="000.000.000-00 ou 00.000.000/0001-00" />
                        </div>
                        <div>
                            <Label htmlFor="osClientPhone">Telefone/WhatsApp (Opcional)</Label>
                            <Input id="osClientPhone" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="(00) 00000-0000" />
                        </div>
                       </div>
                       <div>
                        <Label htmlFor="osClientEmail">E-mail (Opcional)</Label>
                        <Input id="osClientEmail" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="cliente@email.com" />
                       </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-xl">Informações do Aparelho</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="osDeviceType">Tipo de Aparelho</Label>
                          <Select value={deviceType} onValueChange={(value: DeviceType) => setDeviceType(value)}>
                            <SelectTrigger id="osDeviceType"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                            <SelectContent>
                              {deviceTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="osDeviceBrandModel">Marca/Modelo</Label>
                          <Input id="osDeviceBrandModel" value={deviceBrandModel} onChange={(e) => setDeviceBrandModel(e.target.value)} placeholder="Ex: Samsung A20, iPhone 11" required />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="osDeviceImeiSerial">IMEI / Número de Série (Opcional)</Label>
                          <Input id="osDeviceImeiSerial" value={deviceImeiSerial} onChange={(e) => setDeviceImeiSerial(e.target.value)} placeholder="IMEI ou N/S" />
                        </div>
                        <div>
                          <Label htmlFor="osDeviceColor">Cor (Opcional)</Label>
                          <Input id="osDeviceColor" value={deviceColor} onChange={(e) => setDeviceColor(e.target.value)} placeholder="Ex: Preto, Azul" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="osDeviceAccessories">Acessórios Recebidos (Opcional)</Label>
                        <Input id="osDeviceAccessories" value={deviceAccessories} onChange={(e) => setDeviceAccessories(e.target.value)} placeholder="Ex: Fonte, cabo, fone, capinha" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-xl">Problemas e Diagnóstico</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="osProblemReported">Defeito Informado pelo Cliente</Label>
                        <Textarea 
                          id="osProblemReported" 
                          value={problemReportedByClient} 
                          onChange={(e) => setProblemReportedByClient(e.target.value)} 
                          placeholder="Ex: Não liga, tela quebrada, bateria viciada..."
                          rows={3}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="osTechnicalDiagnosis">Diagnóstico Técnico (Opcional)</Label>
                        <Textarea id="osTechnicalDiagnosis" value={technicalDiagnosis} onChange={(e) => setTechnicalDiagnosis(e.target.value)} placeholder="Detalhes do diagnóstico técnico..." rows={3} />
                      </div>
                       <div>
                        <Label htmlFor="osInternalObservations">Observações Internas (Opcional)</Label>
                        <Textarea id="osInternalObservations" value={internalObservations} onChange={(e) => setInternalObservations(e.target.value)} placeholder="Notas internas, ex: aguardando aprovação do orçamento..." rows={2} />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader><CardTitle className="text-xl">Serviços e Peças (Descritivo)</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="osServicesPerformed">Serviços Executados (Descrição)</Label>
                            <Textarea id="osServicesPerformed" value={servicesPerformedDescription} onChange={(e) => setServicesPerformedDescription(e.target.value)} placeholder="Descreva os serviços realizados..." rows={3} />
                        </div>
                        <div>
                            <Label htmlFor="osPartsUsed">Produtos/Peças Utilizadas (Descrição)</Label>
                            <Textarea id="osPartsUsed" value={partsUsedDescription} onChange={(e) => setPartsUsedDescription(e.target.value)} placeholder="Liste as peças utilizadas..." rows={3} />
                        </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Valores e Produtos Adicionais</CardTitle>
                        <CardDescription>Insira o valor do serviço e adicione produtos vendidos à parte.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <Label htmlFor="osServiceManualValue">Valor do Serviço (R$)</Label>
                            <Input 
                                id="osServiceManualValue" 
                                type="text" 
                                value={serviceManualValueInput} 
                                onChange={(e) => setServiceManualValueInput(e.target.value.replace(/[^0-9,]/g, ''))} 
                                placeholder="Ex: 150,00" 
                            />
                        </div>
                        
                        <div className="space-y-4 rounded-md border p-4">
                            <h4 className="font-medium">Adicionar Produto à OS</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                                <div className="sm:col-span-5">
                                    <Label htmlFor="currentProductName">Nome do Produto</Label>
                                    <Input 
                                        id="currentProductName" 
                                        value={currentProductNameInput} 
                                        onChange={(e) => setCurrentProductNameInput(e.target.value)} 
                                        placeholder="Ex: Película de Vidro"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <Label htmlFor="currentProductQty">Qtd.</Label>
                                    <Input 
                                        id="currentProductQty" 
                                        type="number" 
                                        value={currentProductQtyInput} 
                                        onChange={(e) => setCurrentProductQtyInput(e.target.value)} 
                                        min="1"
                                    />
                                </div>
                                <div className="sm:col-span-3">
                                    <Label htmlFor="currentProductPrice">Preço Unit. (R$)</Label>
                                    <Input 
                                        id="currentProductPrice" 
                                        type="text" 
                                        value={currentProductPriceInput} 
                                        onChange={(e) => setCurrentProductPriceInput(e.target.value.replace(/[^0-9,]/g, ''))} 
                                        placeholder="Ex: 25,00"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <Button type="button" onClick={handleAddSoldProduct} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add
                                    </Button>
                                </div>
                            </div>

                            {soldProductsList.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    <h5 className="text-sm font-medium">Produtos Adicionados:</h5>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Produto</TableHead>
                                                    <TableHead className="text-center">Qtd</TableHead>
                                                    <TableHead className="text-right">Unit. (R$)</TableHead>
                                                    <TableHead className="text-right">Total (R$)</TableHead>
                                                    <TableHead className="w-[50px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {soldProductsList.map(prod => (
                                                    <TableRow key={prod.tempId}>
                                                        <TableCell>{prod.name}</TableCell>
                                                        <TableCell className="text-center">{prod.quantity}</TableCell>
                                                        <TableCell className="text-right">{Number(prod.unitPrice).toFixed(2).replace('.', ',')}</TableCell>
                                                        <TableCell className="text-right">{Number(prod.totalPrice).toFixed(2).replace('.', ',')}</TableCell>
                                                        <TableCell>
                                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemoveSoldProduct(prod.tempId)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-6 text-right">
                            <p className="text-lg font-semibold">
                                Valor Total da OS: <span className="text-accent">R$ {grandTotalDisplay}</span>
                            </p>
                        </div>
                    </CardContent>
                  </Card>

                </div>
              </ScrollArea>
              <DialogFooter className="border-t pt-6 mt-6 pr-4 flex flex-col sm:flex-row justify-between items-center w-full">
                <Button type="button" variant="outline" onClick={() => handlePrintOS({
                    osNumber: editingServiceOrder ? editingServiceOrder.osNumber : 0, 
                    openingDate: editingServiceOrder ? editingServiceOrder.openingDate : new Date(),
                    clientName, deviceBrandModel, problemReportedByClient, 
                    grandTotalValue: parseFloat(grandTotalDisplay.replace(',', '.')) || 0,
                })}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir OS (Via Cliente)
                </Button>
                <div className="flex gap-2 mt-4 sm:mt-0">
                    <DialogClose asChild>
                        <Button type="button" variant="ghost" onClick={() => { 
                            setIsNewServiceOrderDialogOpen(false); 
                            setIsEditServiceOrderDialogOpen(false); 
                            resetFormFields(); 
                        }}>
                            Cancelar
                        </Button>
                    </DialogClose>
                    <Button type="submit" disabled={addServiceOrderMutation.isPending || updateServiceOrderMutation.isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                      {(addServiceOrderMutation.isPending || updateServiceOrderMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingServiceOrder ? "Salvar Alterações" : "Criar O.S."}
                    </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditServiceOrderDialogOpen} onOpenChange={(isOpen) => {
          setIsEditServiceOrderDialogOpen(isOpen);
          if (!isOpen) resetFormFields(); 
        }}>
             <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Editar Ordem de Serviço</DialogTitle>
              <DialogDescription>
                Atualize os dados da O.S.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitServiceOrder}>
              <ScrollArea className="h-[75vh] p-1 pr-3">
                <div className="space-y-6 p-2">
                  <Card>
                    <CardHeader><CardTitle className="text-xl">Dados Gerais da OS</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="osNumberFormEdit">Número da OS</Label>
                          <Input id="osNumberFormEdit" value={formOsNumber} disabled className="bg-muted/50" />
                        </div>
                        <div>
                          <Label htmlFor="osOpeningDateFormEdit">Data de Abertura</Label>
                          <Input id="osOpeningDateFormEdit" value={formOpeningDate} disabled className="bg-muted/50" />
                        </div>
                        <div>
                          <Label htmlFor="osDeliveryForecastEdit">Previsão de Entrega</Label>
                          <Input id="osDeliveryForecastEdit" type="date" value={deliveryForecastDate} onChange={(e) => setDeliveryForecastDate(e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="osStatusEdit">Status da OS</Label>
                          <Select value={status} onValueChange={(value: ServiceOrderStatus) => setStatus(value)}>
                            <SelectTrigger id="osStatusEdit"><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                            <SelectContent>
                              {serviceOrderStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="osTechnicianEdit">Técnico Responsável</Label>
                           <Input 
                                id="osTechnicianEdit" 
                                value={responsibleTechnicianName}
                                onChange={(e) => setResponsibleTechnicianName(e.target.value)}
                                placeholder="Nome do técnico" 
                            />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-xl">Dados do Cliente</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                       <div className="space-y-1">
                        <Label htmlFor="osClientNameEdit">Cliente (Nome Completo)</Label>
                        <Input 
                            id="osClientNameEdit" 
                            value={clientName} 
                            onChange={(e) => setClientName(e.target.value)} 
                            placeholder="Digite o nome do cliente"
                            required 
                        />
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="osClientCpfCnpjEdit">CPF/CNPJ (Opcional)</Label>
                            <Input id="osClientCpfCnpjEdit" value={clientCpfCnpj} onChange={(e) => setClientCpfCnpj(e.target.value)} placeholder="000.000.000-00 ou 00.000.000/0001-00" />
                        </div>
                        <div>
                            <Label htmlFor="osClientPhoneEdit">Telefone/WhatsApp (Opcional)</Label>
                            <Input id="osClientPhoneEdit" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="(00) 00000-0000" />
                        </div>
                       </div>
                       <div>
                        <Label htmlFor="osClientEmailEdit">E-mail (Opcional)</Label>
                        <Input id="osClientEmailEdit" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="cliente@email.com" />
                       </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-xl">Informações do Aparelho</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="osDeviceTypeEdit">Tipo de Aparelho</Label>
                          <Select value={deviceType} onValueChange={(value: DeviceType) => setDeviceType(value)}>
                            <SelectTrigger id="osDeviceTypeEdit"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                            <SelectContent>
                              {deviceTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="osDeviceBrandModelEdit">Marca/Modelo</Label>
                          <Input id="osDeviceBrandModelEdit" value={deviceBrandModel} onChange={(e) => setDeviceBrandModel(e.target.value)} placeholder="Ex: Samsung A20, iPhone 11" required />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="osDeviceImeiSerialEdit">IMEI / Número de Série (Opcional)</Label>
                          <Input id="osDeviceImeiSerialEdit" value={deviceImeiSerial} onChange={(e) => setDeviceImeiSerial(e.target.value)} placeholder="IMEI ou N/S" />
                        </div>
                        <div>
                          <Label htmlFor="osDeviceColorEdit">Cor (Opcional)</Label>
                          <Input id="osDeviceColorEdit" value={deviceColor} onChange={(e) => setDeviceColor(e.target.value)} placeholder="Ex: Preto, Azul" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="osDeviceAccessoriesEdit">Acessórios Recebidos (Opcional)</Label>
                        <Input id="osDeviceAccessoriesEdit" value={deviceAccessories} onChange={(e) => setDeviceAccessories(e.target.value)} placeholder="Ex: Fonte, cabo, fone, capinha" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-xl">Problemas e Diagnóstico</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="osProblemReportedEdit">Defeito Informado pelo Cliente</Label>
                        <Textarea 
                          id="osProblemReportedEdit" 
                          value={problemReportedByClient} 
                          onChange={(e) => setProblemReportedByClient(e.target.value)} 
                          placeholder="Ex: Não liga, tela quebrada, bateria viciada..."
                          rows={3}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="osTechnicalDiagnosisEdit">Diagnóstico Técnico (Opcional)</Label>
                        <Textarea id="osTechnicalDiagnosisEdit" value={technicalDiagnosis} onChange={(e) => setTechnicalDiagnosis(e.target.value)} placeholder="Detalhes do diagnóstico técnico..." rows={3} />
                      </div>
                       <div>
                        <Label htmlFor="osInternalObservationsEdit">Observações Internas (Opcional)</Label>
                        <Textarea id="osInternalObservationsEdit" value={internalObservations} onChange={(e) => setInternalObservations(e.target.value)} placeholder="Notas internas, ex: aguardando aprovação do orçamento..." rows={2} />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader><CardTitle className="text-xl">Serviços e Peças (Descritivo)</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="osServicesPerformedEdit">Serviços Executados (Descrição)</Label>
                            <Textarea id="osServicesPerformedEdit" value={servicesPerformedDescription} onChange={(e) => setServicesPerformedDescription(e.target.value)} placeholder="Descreva os serviços realizados..." rows={3} />
                        </div>
                        <div>
                            <Label htmlFor="osPartsUsedEdit">Produtos/Peças Utilizadas (Descrição)</Label>
                            <Textarea id="osPartsUsedEdit" value={partsUsedDescription} onChange={(e) => setPartsUsedDescription(e.target.value)} placeholder="Liste as peças utilizadas..." rows={3} />
                        </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Valores e Produtos Adicionais</CardTitle>
                        <CardDescription>Insira o valor do serviço e adicione produtos vendidos à parte.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <Label htmlFor="osServiceManualValueEdit">Valor do Serviço (R$)</Label>
                            <Input 
                                id="osServiceManualValueEdit" 
                                type="text" 
                                value={serviceManualValueInput} 
                                onChange={(e) => setServiceManualValueInput(e.target.value.replace(/[^0-9,]/g, ''))} 
                                placeholder="Ex: 150,00" 
                            />
                        </div>
                        
                        <div className="space-y-4 rounded-md border p-4">
                            <h4 className="font-medium">Adicionar Produto à OS</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                                <div className="sm:col-span-5">
                                    <Label htmlFor="currentProductNameEdit">Nome do Produto</Label>
                                    <Input 
                                        id="currentProductNameEdit" 
                                        value={currentProductNameInput} 
                                        onChange={(e) => setCurrentProductNameInput(e.target.value)} 
                                        placeholder="Ex: Película de Vidro"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <Label htmlFor="currentProductQtyEdit">Qtd.</Label>
                                    <Input 
                                        id="currentProductQtyEdit" 
                                        type="number" 
                                        value={currentProductQtyInput} 
                                        onChange={(e) => setCurrentProductQtyInput(e.target.value)} 
                                        min="1"
                                    />
                                </div>
                                <div className="sm:col-span-3">
                                    <Label htmlFor="currentProductPriceEdit">Preço Unit. (R$)</Label>
                                    <Input 
                                        id="currentProductPriceEdit" 
                                        type="text" 
                                        value={currentProductPriceInput} 
                                        onChange={(e) => setCurrentProductPriceInput(e.target.value.replace(/[^0-9,]/g, ''))} 
                                        placeholder="Ex: 25,00"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                     <Button type="button" onClick={handleAddSoldProduct} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add
                                    </Button>
                                </div>
                            </div>

                            {soldProductsList.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    <h5 className="text-sm font-medium">Produtos Adicionados:</h5>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Produto</TableHead>
                                                    <TableHead className="text-center">Qtd</TableHead>
                                                    <TableHead className="text-right">Unit. (R$)</TableHead>
                                                    <TableHead className="text-right">Total (R$)</TableHead>
                                                    <TableHead className="w-[50px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {soldProductsList.map(prod => (
                                                    <TableRow key={prod.tempId}>
                                                        <TableCell>{prod.name}</TableCell>
                                                        <TableCell className="text-center">{prod.quantity}</TableCell>
                                                        <TableCell className="text-right">{Number(prod.unitPrice).toFixed(2).replace('.', ',')}</TableCell>
                                                        <TableCell className="text-right">{Number(prod.totalPrice).toFixed(2).replace('.', ',')}</TableCell>
                                                        <TableCell>
                                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemoveSoldProduct(prod.tempId)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-6 text-right">
                            <p className="text-lg font-semibold">
                                Valor Total da OS: <span className="text-accent">R$ {grandTotalDisplay}</span>
                            </p>
                        </div>
                    </CardContent>
                  </Card>

                </div>
              </ScrollArea>
              <DialogFooter className="border-t pt-6 mt-6 pr-4 flex flex-col sm:flex-row justify-between items-center w-full">
                <Button type="button" variant="outline" onClick={() => handlePrintOS({
                    osNumber: editingServiceOrder ? editingServiceOrder.osNumber : 0,
                    openingDate: editingServiceOrder ? editingServiceOrder.openingDate : new Date(),
                    clientName, deviceBrandModel, problemReportedByClient, 
                    grandTotalValue: parseFloat(grandTotalDisplay.replace(',', '.')) || 0,
                })}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir OS (Via Cliente)
                </Button>
                <div className="flex gap-2 mt-4 sm:mt-0">
                    <DialogClose asChild>
                        <Button type="button" variant="ghost" onClick={() => { 
                            setIsEditServiceOrderDialogOpen(false); 
                            resetFormFields(); 
                        }}>
                            Cancelar
                        </Button>
                    </DialogClose>
                    <Button type="submit" disabled={updateServiceOrderMutation.isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                      {updateServiceOrderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Alterações
                    </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Ordens de Serviço</CardTitle>
          <CardDescription>Rastreie e gerencie todos os reparos e serviços de dispositivos.</CardDescription>
        </CardHeader>
        <CardContent>
           {isLoadingServiceOrders ? (
            <ServiceOrdersSkeleton />
          ) : serviceOrdersError ? (
             <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-destructive">
              <AlertTriangle className="h-12 w-12" />
              <p className="text-lg font-medium">Erro ao carregar Ordens de Serviço</p>
              <p className="text-sm text-muted-foreground">{serviceOrdersError.message}</p>
              <Button onClick={() => refetchServiceOrders()} className="mt-3">
                <Loader2 className="mr-2 h-4 w-4 animate-spin data-[hide=true]:hidden" data-hide={!isLoadingServiceOrders} />
                Tentar Novamente
              </Button>
            </div>
          ) : serviceOrders && serviceOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <h3 className="text-xl font-semibold">Nenhuma ordem de serviço encontrada</h3>
              <p className="text-muted-foreground">Crie uma nova O.S. para começar.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº OS</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Aparelho</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Abertura</TableHead>
                    <TableHead className="hidden lg:table-cell">Previsão</TableHead>
                    <TableHead className="hidden xl:table-cell text-right">Total (R$)</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceOrders?.map((os) => (
                    <TableRow key={os.id}>
                      <TableCell className="font-medium">{os.osNumber}</TableCell>
                      <TableCell>{os.clientName}</TableCell>
                      <TableCell className="hidden md:table-cell">{os.deviceBrandModel}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(os.status)}`}>
                          {os.status}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {os.openingDate instanceof Date ? format(os.openingDate, "dd/MM/yy HH:mm", { locale: ptBR }) : (os.openingDate ? new Date(String(os.openingDate)).toLocaleDateString('pt-BR') : 'N/D')}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {os.deliveryForecastDate ? format(new Date(String(os.deliveryForecastDate) + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR }) : "N/D"}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-right">{os.grandTotalValue?.toFixed(2).replace('.', ',') || "0,00"}</TableCell>
                      <TableCell className="text-right space-x-1 sm:space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handlePrintOS(os)} aria-label="Imprimir ordem de serviço" disabled={!os.id}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleOpenEditDialog(os)} aria-label="Editar ordem de serviço" disabled={!os.id}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                         <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" disabled={deleteServiceOrderMutation.isPending && deleteServiceOrderMutation.variables === os.id || !os.id} aria-label="Excluir ordem de serviço">
                               {(deleteServiceOrderMutation.isPending && deleteServiceOrderMutation.variables === os.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a Ordem de Serviço "{os.osNumber}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={async () => os.id && await handleDeleteServiceOrder(os.id)}>
                                Excluir Permanentemente
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    

    

    


