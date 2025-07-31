
"use client";

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ClientForm } from '@/components/clients/client-form';
import { ClientsTable } from '@/components/clients/clients-table';
import { addClient, getClients, updateClient, deleteClient } from '@/services/clientService';
import type { Client } from '@/lib/schemas/client';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function ClientsPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: clients, isLoading, error } = useQuery<Client[], Error>({
    queryKey: ['clients'],
    queryFn: getClients,
  });

  const { mutate: addClientMutation, isPending: isAdding } = useMutation({
    mutationFn: (clientData: Client) => addClient(clientData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: "Cliente Adicionado", description: "O novo cliente foi adicionado com sucesso." });
      setIsSheetOpen(false);
      setSelectedClient(null);
    },
    onError: (err) => {
      toast({ title: "Erro ao Adicionar", description: err.message, variant: "destructive" });
    },
  });

  const { mutate: updateClientMutation, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, clientData }: { id: string, clientData: Client }) => updateClient(id, clientData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: "Cliente Atualizado", description: "Os dados do cliente foram atualizados." });
      setIsSheetOpen(false);
      setSelectedClient(null);
    },
    onError: (err) => {
      toast({ title: "Erro ao Atualizar", description: err.message, variant: "destructive" });
    },
  });

  const { mutate: deleteClientMutation, isPending: isDeleting, variables: deletingId } = useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: "Cliente Excluído", description: "O cliente foi removido permanentemente." });
    },
    onError: (err) => {
      toast({ title: "Erro ao Excluir", description: err.message, variant: "destructive" });
    },
  });

  const handleFormSubmit = async (data: Client) => {
    if (selectedClient && selectedClient.id) {
      updateClientMutation({ id: selectedClient.id, clientData: data });
    } else {
      addClientMutation(data);
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: string) => {
    deleteClientMutation(id);
  };

  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-semibold text-accent">Gerenciar Clientes</h1>
        <Sheet open={isSheetOpen} onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) setSelectedClient(null);
        }}>
          <SheetTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Cliente
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{selectedClient ? "Editar Cliente" : "Adicionar Novo Cliente"}</SheetTitle>
              <SheetDescription>
                {selectedClient ? "Altere os dados do cliente abaixo." : "Preencha os dados do novo cliente para adicioná-lo ao sistema."}
              </SheetDescription>
            </SheetHeader>
            <ClientForm
              onSubmit={handleFormSubmit}
              defaultValues={selectedClient || undefined}
              isEditing={!!selectedClient}
              isLoading={isAdding || isUpdating}
            />
          </SheetContent>
        </Sheet>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Buscar por nome, e-mail ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading && <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
      {error && <div className="text-destructive text-center py-12">Erro ao carregar clientes: {error.message}</div>}
      {!isLoading && !error && (
        <ClientsTable
          clients={filteredClients || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoadingDeleteForId={isDeleting ? deletingId : null}
        />
      )}
    </div>
  );
}
