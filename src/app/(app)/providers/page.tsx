
"use client";

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ProviderForm } from '@/components/providers/provider-form';
import { ProvidersTable } from '@/components/providers/providers-table';
import { addProvider, getProviders, updateProvider, deleteProvider } from '@/services/providerService';
import type { Provider } from '@/lib/schemas/provider';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function ProvidersPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: providers, isLoading, error } = useQuery<Provider[], Error>({
    queryKey: ['providers'],
    queryFn: getProviders,
  });

  const { mutate: addProviderMutation, isPending: isAdding } = useMutation({
    mutationFn: (providerData: Provider) => addProvider(providerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      toast({ title: "Fornecedor Adicionado", description: "O novo fornecedor foi adicionado com sucesso." });
      setIsSheetOpen(false);
      setSelectedProvider(null);
    },
    onError: (err) => {
      toast({ title: "Erro ao Adicionar", description: err.message, variant: "destructive" });
    },
  });

  const { mutate: updateProviderMutation, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, providerData }: { id: string, providerData: Provider }) => updateProvider(id, providerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      toast({ title: "Fornecedor Atualizado", description: "Os dados do fornecedor foram atualizados." });
      setIsSheetOpen(false);
      setSelectedProvider(null);
    },
    onError: (err) => {
      toast({ title: "Erro ao Atualizar", description: err.message, variant: "destructive" });
    },
  });

  const { mutate: deleteProviderMutation, isPending: isDeleting, variables: deletingId } = useMutation({
    mutationFn: (id: string) => deleteProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      toast({ title: "Fornecedor Excluído", description: "O fornecedor foi removido permanentemente." });
    },
    onError: (err) => {
      toast({ title: "Erro ao Excluir", description: err.message, variant: "destructive" });
    },
  });

  const handleFormSubmit = async (data: Provider) => {
    if (selectedProvider && selectedProvider.id) {
      updateProviderMutation({ id: selectedProvider.id, providerData: data });
    } else {
      addProviderMutation(data);
    }
  };

  const handleEdit = (provider: Provider) => {
    setSelectedProvider(provider);
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: string) => {
    deleteProviderMutation(id);
  };

  const filteredProviders = providers?.filter(provider =>
    provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.cnpj?.includes(searchTerm)
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-semibold text-accent">Gerenciar Fornecedores</h1>
        <Sheet open={isSheetOpen} onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) setSelectedProvider(null);
        }}>
          <SheetTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Fornecedor
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{selectedProvider ? "Editar Fornecedor" : "Adicionar Novo Fornecedor"}</SheetTitle>
              <SheetDescription>
                {selectedProvider ? "Altere os dados do fornecedor abaixo." : "Preencha os dados do novo fornecedor."}
              </SheetDescription>
            </SheetHeader>
            <ProviderForm
              onSubmit={handleFormSubmit}
              defaultValues={selectedProvider || undefined}
              isEditing={!!selectedProvider}
              isLoading={isAdding || isUpdating}
            />
          </SheetContent>
        </Sheet>
      </div>

       <div className="mb-4">
        <Input
          placeholder="Buscar por nome, contato ou CNPJ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading && <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
      {error && <div className="text-destructive text-center py-12">Erro ao carregar fornecedores: {error.message}</div>}
      {!isLoading && !error && (
        <ProvidersTable
          providers={filteredProviders || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoadingDeleteForId={isDeleting ? deletingId : null}
        />
      )}
    </div>
  );
}
