
"use client";

import type { ServiceOrder } from '@/services/serviceOrderService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, FileText, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ServiceOrdersTableProps {
  orders: ServiceOrder[];
  onEdit: (order: ServiceOrder) => void;
  onDelete: (orderId: string) => Promise<void>;
  isLoadingDeleteForId?: string | null;
}

export function ServiceOrdersTable({ orders, onEdit, onDelete, isLoadingDeleteForId }: ServiceOrdersTableProps) {

  const getStatusVariant = (status: ServiceOrder['status']) => {
    switch (status) {
      case 'Aberta': return 'secondary';
      case 'Em andamento': return 'default';
      case 'Aguardando peça': return 'outline';
      case 'Concluída': return 'default';
      case 'Entregue': return 'default';
      case 'Cancelada': return 'destructive';
      default: return 'secondary';
    }
  };
  
    const getStatusClass = (status: ServiceOrder['status']) => {
    switch (status) {
      case 'Concluída':
      case 'Entregue':
        return 'bg-green-100 text-green-800';
       case 'Em andamento':
        return 'bg-blue-100 text-blue-800';
      case 'Aguardando peça':
        return 'bg-yellow-100 text-yellow-800';
      case 'Cancelada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };


  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <h3 className="text-xl font-semibold">Nenhuma Ordem de Serviço encontrada</h3>
        <p className="text-muted-foreground">Crie uma nova O.S. para começar a gerenciar.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Nº OS</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="hidden md:table-cell">Equipamento</TableHead>
            <TableHead className="hidden lg:table-cell">Abertura</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-bold">#{order.osNumber}</TableCell>
              <TableCell className="font-medium">{order.clientName}</TableCell>
              <TableCell className="hidden md:table-cell">{order.deviceBrandModel}</TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                {format(new Date(order.openingDate as Date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={getStatusVariant(order.status)} className={`${getStatusClass(order.status)} hover:${getStatusClass(order.status)}`}>
                    {order.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-1 sm:space-x-2">
                <Button variant="outline" size="icon" onClick={() => onEdit(order)} aria-label="Editar O.S.">
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon" disabled={isLoadingDeleteForId === order.id} aria-label="Excluir O.S.">
                      {isLoadingDeleteForId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir a O.S. Nº {order.osNumber} para o cliente "{order.clientName}"? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(order.id)}>
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
  );
}

    