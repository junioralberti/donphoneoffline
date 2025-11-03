
"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ServiceOrderInputSchema, type ServiceOrderInput, type ServiceOrderStatus, type DeviceType } from "@/services/serviceOrderService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getClients } from "@/services/clientService";
import { getUsers } from "@/services/userService";
import { getProducts } from "@/services/productService";
import type { Client } from "@/lib/schemas/client";
import type { User } from "@/lib/schemas/user";
import type { Product } from "@/lib/schemas/product";

const statuses: ServiceOrderStatus[] = ["Aberta", "Em andamento", "Aguardando peça", "Concluída", "Entregue", "Cancelada"];
const deviceTypes: DeviceType[] = ["Celular", "Notebook", "Tablet", "Placa", "Outro"];

interface ServiceOrderFormProps {
  onSubmit: (data: ServiceOrderInput) => Promise<void>;
  defaultValues?: Partial<ServiceOrderInput>;
  isEditing?: boolean;
  isLoading?: boolean;
  onClose?: () => void;
}

export function ServiceOrderForm({ onSubmit, defaultValues, isEditing = false, isLoading = false, onClose }: ServiceOrderFormProps) {
  
  const form = useForm<ServiceOrderInput>({
    resolver: zodResolver(ServiceOrderInputSchema),
    defaultValues: defaultValues || {
      status: "Aberta",
      clientName: "",
      responsibleTechnicianName: null,
      deliveryForecastDate: null,
      clientCpfCnpj: null,
      clientPhone: null,
      clientEmail: null,
      deviceType: null,
      deviceBrandModel: "",
      deviceImeiSerial: null,
      deviceColor: null,
      deviceAccessories: null,
      problemReportedByClient: "",
      technicalDiagnosis: null,
      internalObservations: null,
      servicesPerformedDescription: null,
      partsUsedDescription: null,
      serviceManualValue: 0,
      additionalSoldProducts: [],
      grandTotalValue: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "additionalSoldProducts",
  });

  const { data: clients } = useQuery<Client[], Error>({ queryKey: ['clients'], queryFn: getClients });
  const { data: users } = useQuery<User[], Error>({ queryKey: ['users'], queryFn: getUsers });
  const { data: products } = useQuery<Product[], Error>({ queryKey: ['products'], queryFn: getProducts });

  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>("");

  const serviceValue = form.watch("serviceManualValue");
  const soldProducts = form.watch("additionalSoldProducts");

  useEffect(() => {
    const productsTotal = soldProducts?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0;
    const serviceTotal = serviceValue || 0;
    const grandTotal = productsTotal + serviceTotal;
    form.setValue("grandTotalValue", grandTotal);
  }, [serviceValue, soldProducts, form]);

  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form]);

  const handleAddProduct = () => {
    if (!selectedProductToAdd) return;
    const product = products?.find(p => p.name === selectedProductToAdd);
    if (product) {
      append({
        name: product.name,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price,
      });
      setSelectedProductToAdd("");
    }
  };
  
  const handleClientSelect = (clientId: string) => {
    const client = clients?.find(c => c.id === clientId);
    if(client) {
      form.setValue('clientName', client.name);
      form.setValue('clientPhone', client.phone || '');
      form.setValue('clientEmail', client.email || '');
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 h-[calc(100vh-150px)] overflow-y-auto pr-4">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Status da OS</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="responsibleTechnicianName"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Técnico Responsável</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione um técnico"/></SelectTrigger></FormControl>
                    <SelectContent>{users?.map(u => <SelectItem key={u.id!} value={u.name}>{u.name}</SelectItem>)}</SelectContent>
                    </Select>
                </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="deliveryForecastDate"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Previsão de Entrega</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} value={field.value || ''} />
                        </FormControl>
                    </FormItem>
                )}
            />
        </div>
        
        <Card>
            <CardHeader><CardTitle>Dados do Cliente</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                 <FormItem>
                    <FormLabel>Buscar Cliente Cadastrado</FormLabel>
                    <Select onValueChange={handleClientSelect}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Selecione um cliente para preencher os campos"/></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {clients?.map(c => <SelectItem key={c.id!} value={c.id!}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </FormItem>
                <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome do Cliente</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <FormField control={form.control} name="clientCpfCnpj" render={({ field }) => (<FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                     <FormField control={form.control} name="clientPhone" render={({ field }) => (<FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                     <FormField control={form.control} name="clientEmail" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle>Dados do Equipamento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="deviceType"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Equipamento</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo"/></SelectTrigger></FormControl>
                                <SelectContent>{deviceTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                        </FormItem>
                        )}
                    />
                    <FormField control={form.control} name="deviceBrandModel" render={({ field }) => (<FormItem><FormLabel>Marca/Modelo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="deviceImeiSerial" render={({ field }) => (<FormItem><FormLabel>IMEI/Nº Série</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="deviceColor" render={({ field }) => (<FormItem><FormLabel>Cor</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                </div>
                <FormField control={form.control} name="deviceAccessories" render={({ field }) => (<FormItem><FormLabel>Acessórios Deixados</FormLabel><FormControl><Input placeholder="Ex: Carregador, capa" {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                 <FormField
                    control={form.control}
                    name="problemReportedByClient"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Problema Relatado pelo Cliente</FormLabel>
                            <FormControl><Textarea {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>

         <Card>
            <CardHeader><CardTitle>Diagnóstico e Serviço</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                 <FormField control={form.control} name="technicalDiagnosis" render={({ field }) => (<FormItem><FormLabel>Diagnóstico Técnico</FormLabel><FormControl><Textarea {...field} value={field.value || ''} /></FormControl></FormItem>)}/>
                 <FormField control={form.control} name="servicesPerformedDescription" render={({ field }) => (<FormItem><FormLabel>Serviços Executados</FormLabel><FormControl><Textarea {...field} value={field.value || ''} /></FormControl></FormItem>)}/>
                 <FormField control={form.control} name="partsUsedDescription" render={({ field }) => (<FormItem><FormLabel>Peças Utilizadas</FormLabel><FormControl><Textarea {...field} value={field.value || ''} /></FormControl></FormItem>)}/>
                 <FormField control={form.control} name="internalObservations" render={({ field }) => (<FormItem><FormLabel>Observações Internas</FormLabel><FormControl><Textarea {...field} value={field.value || ''} /></FormControl></FormItem>)}/>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader><CardTitle>Valores</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                 <FormField
                    control={form.control}
                    name="serviceManualValue"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Valor do Serviço (Mão de Obra)</FormLabel>
                            <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                        </FormItem>
                    )}
                />
                <Separator/>
                <h3 className="text-sm font-medium">Produtos/Peças Vendidos Adicionalmente</h3>
                {fields.map((field, index) => (
                   <div key={field.id} className="flex items-end gap-2">
                     <Input value={field.name} disabled className="flex-1"/>
                     <Controller
                        control={form.control}
                        name={`additionalSoldProducts.${index}.quantity`}
                        render={({ field: qtyField }) => (
                           <Input type="number" {...qtyField} className="w-20" onChange={e => {
                                const qty = parseInt(e.target.value) || 0;
                                qtyField.onChange(qty);
                                form.setValue(`additionalSoldProducts.${index}.totalPrice`, qty * field.unitPrice);
                           }}/>
                        )}
                     />
                      <Input value={`R$ ${(field.unitPrice * field.quantity).toFixed(2)}`} disabled className="w-28"/>
                     <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                   </div>
                ))}
                <div className="flex items-end gap-2">
                     <Select onValueChange={setSelectedProductToAdd} value={selectedProductToAdd}>
                        <SelectTrigger><SelectValue placeholder="Adicionar produto..."/></SelectTrigger>
                        <SelectContent>
                            {products?.map(p => <SelectItem key={p.id} value={p.name}>{p.name} (R$ {p.price})</SelectItem>)}
                        </SelectContent>
                     </Select>
                     <Button type="button" onClick={handleAddProduct}><PlusCircle className="mr-2 h-4 w-4"/> Adicionar</Button>
                </div>
                 <Separator/>
                 <div className="flex justify-end items-center gap-4 pt-2">
                    <span className="text-lg font-semibold">Total Geral:</span>
                    <span className="text-2xl font-bold text-primary">R$ {form.getValues("grandTotalValue").toFixed(2)}</span>
                 </div>
            </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-4">
          {onClose && <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar Alterações" : "Criar Ordem de Serviço"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

    